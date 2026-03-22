"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

const SaleItemSchema = z.object({
  presentation_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
});

const CreateSaleSchema = z.object({
  customer_name: z.string().max(100).optional().nullable(),
  payment_method: z.enum(["efectivo", "tarjeta_credito", "transferencia", "consignacion"]),
  payment_status: z.enum(["pendiente", "parcial", "pagado"]),
  discount: z.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(SaleItemSchema).min(1),
  customer_nit: z.string().max(20).default("CF"),
  generate_invoice: z.boolean().default(true),
});

export async function searchPresentationByBarcode(barcode: string) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  if (!barcode.trim()) return { data: null, error: "Código vacío" };

  const { data, error } = await supabase
    .from("product_presentations")
    .select(`
      id, name, sale_price, stock, barcode, quantity_value, is_active,
      products(id, name, images),
      measurement_units(abbreviation)
    `)
    .eq("barcode", barcode.trim())
    .eq("is_active", true)
    .single();

  if (error || !data) return { data: null, error: "Producto no encontrado" };
  if (data.stock === 0) return { data: null, error: "Sin stock disponible" };

  return { data, error: null };
}

export async function searchPresentationsByName(query: string) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  if (!query.trim() || query.length < 2) return { data: [], error: null };

  // Search by presentation name
  const { data: byPresName } = await supabase
    .from("product_presentations")
    .select(`
      id, name, sale_price, stock, barcode, quantity_value, is_active,
      products(id, name, images),
      measurement_units(abbreviation)
    `)
    .eq("is_active", true)
    .gt("stock", 0)
    .ilike("name", `%${query}%`)
    .limit(10);

  // Also search products by name to get their presentations
  const { data: products } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true)
    .ilike("name", `%${query}%`)
    .limit(10);

  let byProductName: typeof byPresName = [];
  if (products && products.length > 0) {
    const productIds = products.map((p: { id: string }) => p.id);
    const { data } = await supabase
      .from("product_presentations")
      .select(`
        id, name, sale_price, stock, barcode, quantity_value, is_active,
        products(id, name, images),
        measurement_units(abbreviation)
      `)
      .eq("is_active", true)
      .gt("stock", 0)
      .in("product_id", productIds)
      .limit(10);
    byProductName = data ?? [];
  }

  // Merge, deduplicate
  const all = [...(byPresName ?? []), ...byProductName];
  const seen = new Set<string>();
  const unique = all.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return { data: unique.slice(0, 10), error: null };
}

export async function createPOSSale(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const user = await checkSellerRole(supabase);

  const parsed = CreateSaleSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { customer_name, payment_method, payment_status, discount, notes, items, customer_nit, generate_invoice } = parsed.data;

  // Verify stock for all items
  const presentationIds = items.map((i) => i.presentation_id);
  const { data: presentations } = await supabase
    .from("product_presentations")
    .select("id, stock, sale_price, name")
    .in("id", presentationIds);

  if (!presentations) return { success: false, error: "Error al verificar inventario" };

  for (const item of items) {
    const pres = presentations.find((p: { id: string }) => p.id === item.presentation_id);
    if (!pres) return { success: false, error: "Presentación no encontrada" };
    if (pres.stock < item.quantity) {
      return { success: false, error: `Stock insuficiente para: ${pres.name}` };
    }
  }

  const subtotal = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const total = Math.max(0, subtotal - (discount ?? 0));

  // Create sale
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      sale_type: "pos",
      customer_name: customer_name ?? null,
      seller_id: user.id,
      status: "confirmada",
      subtotal,
      discount: discount ?? 0,
      shipping_cost: 0,
      total,
      payment_method,
      payment_status,
      notes: notes ?? null,
    })
    .select("id")
    .single();

  if (saleError || !sale) return { success: false, error: "Error al crear la venta" };

  // Create sale items and decrement stock
  for (const item of items) {
    await supabase.from("sale_items").insert({
      sale_id: sale.id,
      product_presentation_id: item.presentation_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.unit_price * item.quantity,
    });

    // Decrement stock
    const pres = presentations.find((p: { id: string }) => p.id === item.presentation_id);
    if (pres) {
      await supabase
        .from("product_presentations")
        .update({ stock: pres.stock - item.quantity })
        .eq("id", item.presentation_id);
    }
  }

  // Generate invoice number
  let invoiceId: string | null = null;
  let invoiceNumber: string | null = null;

  if (generate_invoice) {
    const { data: numData } = await supabase.rpc("next_invoice_number");
    invoiceNumber = numData as string;

    const { data: invoice } = await supabase
      .from("invoices")
      .insert({
        sale_id: sale.id,
        invoice_number: invoiceNumber ?? `TD-${Date.now()}`,
        customer_name: customer_name ?? "Consumidor Final",
        customer_nit: customer_nit ?? "CF",
        subtotal,
        total,
        issued_by: user.id,
      })
      .select("id")
      .single();

    invoiceId = invoice?.id ?? null;
  }

  revalidatePath("/admin/ventas/historial");
  revalidatePath("/admin/inventario");

  return { success: true, saleId: sale.id, invoiceId, invoiceNumber };
}
