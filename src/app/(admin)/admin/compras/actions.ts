"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

const PurchaseItemSchema = z.object({
  presentation_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_cost: z.number().min(0),
});

const NewCardSchema = z.object({
  card_name: z.string().min(1),
  last_four_digits: z.string().length(4),
  credit_limit: z.number().min(0).optional().nullable(),
  cut_off_day: z.number().int().min(1).max(31).optional().nullable(),
  payment_due_day: z.number().int().min(1).max(31).optional().nullable(),
});

const CreatePurchaseSchema = z.object({
  supplier_id: z.string().uuid().optional().nullable(),
  purchase_date: z.string(),
  payment_method: z.enum(["efectivo", "tarjeta_credito", "transferencia", "consignacion"]),
  credit_card_id: z.string().uuid().optional().nullable(),
  new_card: NewCardSchema.optional().nullable(),
  invoice_number: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(PurchaseItemSchema).min(1),
});

export async function createCompra(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const user = await checkSellerRole(supabase);

  const parsed = CreatePurchaseSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supplier_id, purchase_date, payment_method, credit_card_id, new_card, invoice_number, notes, items } = parsed.data;

  // If tarjeta_credito and new card, create the card first
  let cardId = credit_card_id ?? null;
  if (payment_method === "tarjeta_credito" && new_card && !cardId) {
    const { data: card, error: cardError } = await supabase
      .from("credit_cards")
      .insert({
        card_name: new_card.card_name,
        last_four_digits: new_card.last_four_digits,
        credit_limit: new_card.credit_limit ?? null,
        cut_off_day: new_card.cut_off_day ?? null,
        payment_due_day: new_card.payment_due_day ?? null,
      })
      .select("id")
      .single();
    if (cardError || !card) return { success: false, error: "Error al crear la tarjeta." };
    cardId = card.id;
  }

  const total_amount = items.reduce((acc, i) => acc + i.unit_cost * i.quantity, 0);

  // Create purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      supplier_id: supplier_id ?? null,
      purchase_date,
      payment_method,
      total_amount,
      credit_card_id: payment_method === "tarjeta_credito" ? cardId : null,
      invoice_number: invoice_number ?? null,
      notes: notes ?? null,
      registered_by: user.id,
    })
    .select("id")
    .single();

  if (purchaseError || !purchase) {
    return { success: false, error: "Error al registrar la compra." };
  }

  // Create items + increment stock
  for (const item of items) {
    await supabase.from("purchase_items").insert({
      purchase_id: purchase.id,
      product_presentation_id: item.presentation_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      subtotal: item.unit_cost * item.quantity,
    });

    const { data: pres } = await supabase
      .from("product_presentations")
      .select("stock, cost_price")
      .eq("id", item.presentation_id)
      .single();

    if (pres) {
      await supabase
        .from("product_presentations")
        .update({ stock: pres.stock + item.quantity, cost_price: item.unit_cost })
        .eq("id", item.presentation_id);
    }
  }

  // If tarjeta_credito: create accounts_payable
  if (payment_method === "tarjeta_credito" && cardId) {
    const { data: card } = await supabase
      .from("credit_cards")
      .select("card_name, current_balance, payment_due_day")
      .eq("id", cardId)
      .single();

    if (card) {
      // Calculate due_date based on card's payment_due_day next month
      let dueDate: string | null = null;
      if (card.payment_due_day) {
        const now = new Date();
        const due = new Date(now.getFullYear(), now.getMonth() + 1, card.payment_due_day);
        dueDate = due.toISOString().split("T")[0];
      }

      await supabase.from("accounts_payable").insert({
        source_type: "compra_tarjeta",
        source_id: purchase.id,
        creditor_name: card.card_name,
        total_amount,
        due_date: dueDate,
        status: "pendiente",
      });

      // Update card balance
      await supabase
        .from("credit_cards")
        .update({ current_balance: (card.current_balance ?? 0) + total_amount })
        .eq("id", cardId);
    }
  }

  revalidatePath("/admin/compras");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/cuentas-por-pagar");
  return { success: true, purchaseId: purchase.id };
}

export async function getCompras(filters?: { supplier_id?: string }) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("purchases")
    .select(`
      id, purchase_date, payment_method, total_amount, invoice_number, notes, created_at,
      supplier:suppliers(id, name),
      credit_card:credit_cards(id, card_name, last_four_digits),
      registered_by_profile:profiles!registered_by(full_name),
      purchase_items(
        id, quantity, unit_cost, subtotal,
        product_presentations(
          id, name, quantity_value,
          products(name),
          measurement_units(abbreviation)
        )
      )
    `)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.supplier_id) {
    query = query.eq("supplier_id", filters.supplier_id);
  }

  const { data, error } = await query.limit(100);
  if (error) return { purchases: [], error: error.message };
  return { purchases: data ?? [], error: null };
}

export async function getSuppliersList() {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);
  const { data } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getCreditCardsList() {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);
  const { data } = await supabase
    .from("credit_cards")
    .select("id, card_name, last_four_digits, current_balance, credit_limit")
    .order("card_name");
  return data ?? [];
}

export async function searchPresentationsForPurchase(query: string) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  if (!query.trim() || query.length < 2) return { data: [], error: null };

  const { data: byPresName } = await supabase
    .from("product_presentations")
    .select(`
      id, name, cost_price, stock, barcode, quantity_value, is_active,
      products(id, name),
      measurement_units(abbreviation)
    `)
    .eq("is_active", true)
    .ilike("name", `%${query}%`)
    .limit(10);

  const { data: products } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true)
    .ilike("name", `%${query}%`)
    .limit(10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let byProductName: any[] = [];
  if (products && products.length > 0) {
    const productIds = products.map((p: { id: string }) => p.id);
    const { data } = await supabase
      .from("product_presentations")
      .select(`
        id, name, cost_price, stock, barcode, quantity_value, is_active,
        products(id, name),
        measurement_units(abbreviation)
      `)
      .eq("is_active", true)
      .in("product_id", productIds)
      .limit(10);
    byProductName = data ?? [];
  }

  const all = [...(byPresName ?? []), ...byProductName];
  const seen = new Set<string>();
  const unique = all.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return { data: unique.slice(0, 10), error: null };
}
