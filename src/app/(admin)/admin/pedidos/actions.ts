"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { autoCreateCxC } from "@/app/(admin)/admin/cuentas-por-cobrar/actions";
import { sendOrderStatusUpdate } from "@/lib/email";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

async function checkSellerRole(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "vendedor"].includes(profile.role)) {
    throw new Error("Sin permisos");
  }

  return user;
}

const UpdateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["revisado", "confirmado", "en_preparacion", "enviado", "entregado", "cancelado", "listo_para_recoger", "recogido"]),
  notes_internal: z.string().optional().nullable(),
  estimated_delivery: z.string().optional().nullable(),
  // Payment info when closing sale (entregado / recogido)
  payment_method: z.enum(["efectivo", "tarjeta_credito", "transferencia", "consignacion"]).optional(),
  payment_status: z.enum(["pendiente", "parcial", "pagado"]).optional(),
  amount_paid: z.number().min(0).optional(),
});

export async function updateOrderStatus(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const user = await checkSellerRole(supabase);

  const parsed = UpdateStatusSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { orderId, status, notes_internal, estimated_delivery, payment_method, payment_status, amount_paid } = parsed.data;

  const updateData: Record<string, unknown> = { status };
  if (notes_internal !== undefined) updateData.notes_internal = notes_internal;
  if (estimated_delivery !== undefined) updateData.estimated_delivery = estimated_delivery;

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };

  // If delivered or picked up, convert to sale with payment info
  if (status === "entregado" || status === "recogido") {
    await convertOrderToSale(supabase, orderId, user.id, {
      payment_method: payment_method ?? "transferencia",
      payment_status: payment_status ?? "pendiente",
      amount_paid: amount_paid ?? 0,
    });
  }

  // Send email notification for notable status changes
  try {
    const { data: order } = await supabase
      .from("orders")
      .select("id, customer:profiles(full_name, email)")
      .eq("id", orderId)
      .single();

    if (order?.customer?.email) {
      await sendOrderStatusUpdate({
        customerName: order.customer.full_name ?? "Cliente",
        customerEmail: order.customer.email,
        orderId,
        status,
      });
    }
  } catch (err) {
    console.error("Error sending status email:", err);
  }

  revalidatePath("/admin/pedidos");
  return { success: true };
}

async function convertOrderToSale(
  supabase: SupabaseClient,
  orderId: string,
  sellerId: string,
  payment: { payment_method: string; payment_status: string; amount_paid: number }
) {
  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, customer_id, subtotal, shipping_cost, total, address_id, customer_nit,
      order_items(product_presentation_id, quantity, unit_price, subtotal)
    `)
    .eq("id", orderId)
    .single();

  if (!order) return;

  // Create sale
  const effectiveAmountPaid =
    payment.payment_status === "pagado" ? order.total :
    payment.payment_status === "pendiente" ? 0 :
    payment.amount_paid;

  const { data: sale } = await supabase
    .from("sales")
    .insert({
      sale_type: "online",
      customer_id: order.customer_id,
      seller_id: sellerId,
      status: "entregada",
      subtotal: order.subtotal,
      discount: 0,
      shipping_cost: order.shipping_cost,
      total: order.total,
      payment_method: payment.payment_method,
      payment_status: payment.payment_status,
      amount_paid: effectiveAmountPaid,
      address_id: order.address_id,
    })
    .select("id")
    .single();

  if (!sale) return;

  // Create sale items and decrement stock
  for (const item of order.order_items) {
    await supabase.from("sale_items").insert({
      sale_id: sale.id,
      product_presentation_id: item.product_presentation_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    });

    // Decrement stock
    const { data: pres } = await supabase
      .from("product_presentations")
      .select("stock")
      .eq("id", item.product_presentation_id)
      .single();

    if (pres) {
      await supabase
        .from("product_presentations")
        .update({ stock: Math.max(0, pres.stock - item.quantity) })
        .eq("id", item.product_presentation_id);
    }
  }

  // Generate invoice
  const { data: invoiceNumber } = await supabase.rpc("next_invoice_number");

  // Get customer name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", order.customer_id)
    .single();

  await supabase.from("invoices").insert({
    sale_id: sale.id,
    invoice_number: invoiceNumber ?? `TD-${Date.now()}`,
    customer_name: profile?.full_name ?? "Consumidor Final",
    customer_nit: order.customer_nit ?? "CF",
    subtotal: order.subtotal,
    total: order.total,
    issued_by: sellerId,
  });

  // Auto-create accounts receivable for partial/pending payment
  if (payment.payment_status === "pendiente" || payment.payment_status === "parcial") {
    await autoCreateCxC(supabase, {
      sale_id: sale.id,
      customer_id: order.customer_id ?? null,
      customer_name: profile?.full_name ?? "Cliente",
      total_amount: order.total,
      amount_paid: effectiveAmountPaid,
    });
  }

  // Link converted sale to order
  await supabase
    .from("orders")
    .update({ converted_sale_id: sale.id })
    .eq("id", orderId);
}

const UpdateOrderAdminSchema = z.object({
  orderId: z.string().uuid(),
  notes_customer: z.string().max(500).optional().nullable(),
  notes_internal: z.string().max(500).optional().nullable(),
  customer_nit: z.string().max(20).optional(),
  items: z.array(
    z.object({
      presentation_id: z.string().uuid(),
      quantity: z.number().int().positive(),
      unit_price: z.number().positive(),
    })
  ).min(1).optional(),
});

export async function updateOrderAdmin(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  const parsed = UpdateOrderAdminSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { orderId, notes_customer, notes_internal, customer_nit, items } = parsed.data;

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Pedido no encontrado." };
  if (!["pendiente", "revisado"].includes(order.status)) {
    return { success: false, error: "Solo puedes modificar pedidos pendientes o revisados." };
  }

  const updateData: Record<string, unknown> = {};
  if (notes_customer !== undefined) updateData.notes_customer = notes_customer;
  if (notes_internal !== undefined) updateData.notes_internal = notes_internal;
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

  revalidatePath("/admin/pedidos");
  return { success: true };
}

export async function searchPresentationsForOrder(query: string) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  if (!query || query.trim().length < 2) return { results: [] };

  const { data } = await supabase
    .from("product_presentations")
    .select(`
      id, name, sale_price, stock,
      products(name, images)
    `)
    .eq("is_active", true)
    .ilike("products.name", `%${query}%`)
    .gt("stock", 0)
    .limit(10);

  // Also search by presentation name
  const { data: byPres } = await supabase
    .from("product_presentations")
    .select(`
      id, name, sale_price, stock,
      products(name, images)
    `)
    .eq("is_active", true)
    .ilike("name", `%${query}%`)
    .gt("stock", 0)
    .limit(10);

  // Merge and deduplicate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [...(data ?? []), ...(byPres ?? [])];
  const seen = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = all.filter((r: any) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return r.products != null;
  });

  return { results };
}

export async function getOrders(filters?: {
  status?: string;
  delivery_method?: string;
  search?: string;
}) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("orders")
    .select(`
      id, status, delivery_method, subtotal, shipping_cost, total,
      notes_customer, notes_internal, estimated_delivery, converted_sale_id,
      created_at, updated_at,
      customer:profiles(id, full_name, email, phone),
      address:addresses(label, full_address, department, municipality, reference),
      order_items(
        id, quantity, unit_price, subtotal,
        product_presentations(
          id, name, quantity_value,
          products(name, images),
          measurement_units(abbreviation)
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.delivery_method && filters.delivery_method !== "all") {
    query = query.eq("delivery_method", filters.delivery_method);
  }

  const { data, error } = await query.limit(100);

  if (error) return { orders: [], error: error.message };
  return { orders: data ?? [], error: null };
}
