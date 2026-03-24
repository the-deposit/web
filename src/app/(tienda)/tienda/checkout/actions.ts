"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendOrderConfirmation } from "@/lib/email";

const CheckoutSchema = z.object({
  delivery_method: z.enum(["envio", "recoger_en_tienda"]),
  address_id: z.string().uuid().optional().nullable(),
  notes_customer: z.string().max(500).optional().nullable(),
  customer_nit: z.string().max(20).default("CF"),
  phone: z.string().max(20).optional().nullable(),
  items: z.array(
    z.object({
      presentation_id: z.string().uuid(),
      quantity: z.number().int().positive(),
      unit_price: z.number().positive(),
    })
  ).min(1),
});

const AddressSchema = z.object({
  label: z.string().min(1).max(50),
  full_address: z.string().min(5),
  department: z.string().optional().nullable(),
  municipality: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  is_default: z.boolean().optional(),
});

export async function createOrder(formData: unknown) {
  const supabase: SupabaseClient = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Debes iniciar sesión para continuar." };

  // Require phone number before first order
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", user.id)
    .single();

  const parsed = CheckoutSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { delivery_method, address_id, notes_customer, customer_nit, phone, items } = parsed.data;

  // Save phone if profile doesn't have one yet
  const effectivePhone = profile?.phone || phone?.trim() || null;
  if (!effectivePhone) {
    return { success: false, error: "Ingresa tu número de WhatsApp para continuar." };
  }
  if (!profile?.phone && phone?.trim()) {
    await supabase.from("profiles").update({ phone: phone.trim() }).eq("id", user.id);
  }

  // Validate address is required for shipping
  if (delivery_method === "envio" && !address_id) {
    return { success: false, error: "Debes seleccionar una dirección de envío." };
  }

  // Verify all presentations exist and have enough stock
  const presentationIds = items.map((i) => i.presentation_id);
  const { data: presentations, error: presError } = await supabase
    .from("product_presentations")
    .select("id, sale_price, stock, is_active")
    .in("id", presentationIds);

  if (presError || !presentations) {
    return { success: false, error: "Error al verificar el inventario." };
  }

  for (const item of items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pres = presentations.find((p: any) => p.id === item.presentation_id);
    if (!pres || !pres.is_active) {
      return { success: false, error: "Uno o más productos no están disponibles." };
    }
    if (pres.stock < item.quantity) {
      return { success: false, error: `Stock insuficiente para uno de los productos.` };
    }
  }

  // Calculate totals
  const subtotal = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const total = subtotal; // shipping cost TBD

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: user.id,
      status: "pendiente",
      delivery_method,
      address_id: address_id ?? null,
      notes_customer: notes_customer ?? null,
      customer_nit: customer_nit ?? "CF",
      subtotal,
      shipping_cost: 0,
      total,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { success: false, error: "Error al crear el pedido." };
  }

  // Create order items
  const orderItems = items.map((i) => ({
    order_id: order.id,
    product_presentation_id: i.presentation_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: i.unit_price * i.quantity,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    // Rollback: delete the order
    await supabase.from("orders").delete().eq("id", order.id);
    return { success: false, error: "Error al registrar los productos del pedido." };
  }

  revalidatePath("/tienda/mis-pedidos");

  // Send confirmation email (fire and forget)
  const { data: presentationsForEmail } = await supabase
    .from("product_presentations")
    .select("id, name, products(name)")
    .in("id", items.map((i) => i.presentation_id));

  sendOrderConfirmation({
    customerName: profile.full_name ?? profile.email ?? "Cliente",
    customerEmail: profile.email ?? user.email ?? "",
    orderId: order.id,
    deliveryMethod: delivery_method,
    items: items.map((i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pres = (presentationsForEmail ?? []).find((p: any) => p.id === i.presentation_id);
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        productName: (pres as any)?.products?.name ?? "Producto",
        presentationName: pres?.name ?? "",
        quantity: i.quantity,
        unitPrice: i.unit_price,
        subtotal: i.unit_price * i.quantity,
      };
    }),
    total,
  });

  return { success: true, orderId: order.id };
}

export async function getUserAddresses() {
  const supabase: SupabaseClient = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { addresses: [] };

  const { data } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  return { addresses: data ?? [] };
}

export async function createAddress(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = AddressSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const data = parsed.data;

  // If setting as default, unset others
  if (data.is_default) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const { data: address, error } = await supabase
    .from("addresses")
    .insert({
      user_id: user.id,
      label: data.label,
      full_address: data.full_address,
      department: data.department ?? null,
      municipality: data.municipality ?? null,
      zone: data.zone ?? null,
      reference: data.reference ?? null,
      is_default: data.is_default ?? false,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, addressId: address.id };
}

const UpdateOrderSchema = z.object({
  orderId: z.string().uuid(),
  delivery_method: z.enum(["envio", "recoger_en_tienda"]).optional(),
  address_id: z.string().uuid().optional().nullable(),
  notes_customer: z.string().max(500).optional().nullable(),
  customer_nit: z.string().max(20).optional(),
  items: z.array(
    z.object({
      presentation_id: z.string().uuid(),
      quantity: z.number().int().positive(),
      unit_price: z.number().positive(),
    })
  ).min(1).optional(),
});

export async function updateOrderDetails(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = UpdateOrderSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { orderId, delivery_method, address_id, notes_customer, customer_nit, items } = parsed.data;

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, customer_id")
    .eq("id", orderId)
    .single();

  if (!order || order.customer_id !== user.id) return { success: false, error: "Pedido no encontrado." };
  if (order.status !== "pendiente") return { success: false, error: "Solo puedes modificar pedidos pendientes." };

  if (delivery_method === "envio" && address_id === null) {
    return { success: false, error: "Debes seleccionar una dirección de envío." };
  }

  const updateData: Record<string, unknown> = {};
  if (delivery_method !== undefined) updateData.delivery_method = delivery_method;
  if (address_id !== undefined) updateData.address_id = address_id;
  if (notes_customer !== undefined) updateData.notes_customer = notes_customer;
  if (customer_nit !== undefined) updateData.customer_nit = customer_nit;

  if (items) {
    const subtotal = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
    updateData.subtotal = subtotal;
    updateData.total = subtotal;

    const { error: delError } = await supabase.from("order_items").delete().eq("order_id", orderId);
    if (delError) return { success: false, error: "Error al actualizar los productos." };

    const orderItems = items.map((i) => ({
      order_id: orderId,
      product_presentation_id: i.presentation_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.unit_price * i.quantity,
    }));
    const { error: insError } = await supabase.from("order_items").insert(orderItems);
    if (insError) return { success: false, error: "Error al guardar los productos." };
  }

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/tienda/mis-pedidos");
  return { success: true };
}

export async function cancelOrder(orderId: string) {
  const supabase: SupabaseClient = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, customer_id")
    .eq("id", orderId)
    .single();

  if (!order || order.customer_id !== user.id) {
    return { success: false, error: "Pedido no encontrado." };
  }

  if (order.status !== "pendiente") {
    return { success: false, error: "Solo puedes cancelar pedidos en estado pendiente." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelado" })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/tienda/mis-pedidos");
  return { success: true };
}
