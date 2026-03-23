"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function checkSellerRole(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "vendedor"].includes(profile.role)) throw new Error("Sin permisos");
  return user;
}

export async function getConsignaciones(filters?: { status?: string; type?: string }) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("consignments")
    .select(`
      id, type, consignee_name, consignee_contact, consigner_name, consigner_contact,
      status, date_given, date_due, notes, created_at,
      consignment_items(
        id, quantity_given, quantity_sold, quantity_returned, unit_price,
        product_presentation:product_presentations(
          id, name,
          products(id, name)
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  const { data, error } = await query.limit(200);
  if (error) return { consignaciones: [], error: error.message };
  return { consignaciones: data ?? [], error: null };
}

const ConsignacionItemSchema = z.object({
  product_presentation_id: z.string().uuid(),
  quantity_given: z.number().int().positive(),
  unit_price: z.number().positive(),
});

const CreateConsignacionSchema = z.object({
  type: z.enum(["dada", "recibida"]),
  consignee_name: z.string().optional().nullable(),
  consignee_contact: z.string().optional().nullable(),
  consigner_name: z.string().optional().nullable(),
  consigner_contact: z.string().optional().nullable(),
  date_given: z.string(),
  date_due: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(ConsignacionItemSchema).min(1, "Agrega al menos un producto"),
});

export async function createConsignacion(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const user = await checkSellerRole(supabase);

  const parsed = CreateConsignacionSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { type, consignee_name, consignee_contact, consigner_name, consigner_contact, date_given, date_due, notes, items } = parsed.data;

  const { data: consignment, error } = await supabase.from("consignments").insert({
    type,
    consignee_name: consignee_name ?? null,
    consignee_contact: consignee_contact ?? null,
    consigner_name: consigner_name ?? null,
    consigner_contact: consigner_contact ?? null,
    date_given,
    date_due: date_due ?? null,
    notes: notes ?? null,
    registered_by: user.id,
  }).select("id").single();

  if (error || !consignment) return { success: false, error: error?.message ?? "Error al crear." };

  const itemRows = items.map((item) => ({
    consignment_id: consignment.id,
    product_presentation_id: item.product_presentation_id,
    quantity_given: item.quantity_given,
    unit_price: item.unit_price,
  }));

  const { error: itemsError } = await supabase.from("consignment_items").insert(itemRows);
  if (itemsError) return { success: false, error: itemsError.message };

  revalidatePath("/admin/consignaciones");
  return { success: true };
}

const UpdateStatusSchema = z.object({
  consignment_id: z.string().uuid(),
  status: z.enum(["activa", "liquidada", "cancelada"]),
});

export async function updateConsignacionStatus(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  const parsed = UpdateStatusSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { consignment_id, status } = parsed.data;

  const { error } = await supabase
    .from("consignments")
    .update({ status })
    .eq("id", consignment_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/consignaciones");
  return { success: true };
}

const UpdateItemSoldSchema = z.object({
  item_id: z.string().uuid(),
  quantity_sold: z.number().int().min(0),
  quantity_returned: z.number().int().min(0),
});

export async function updateConsignacionItem(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  const parsed = UpdateItemSoldSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { item_id, quantity_sold, quantity_returned } = parsed.data;

  const { data: item } = await supabase
    .from("consignment_items")
    .select("quantity_given")
    .eq("id", item_id)
    .single();

  if (!item) return { success: false, error: "Item no encontrado." };
  if (quantity_sold + quantity_returned > item.quantity_given) {
    return { success: false, error: "Vendido + devuelto no puede superar el total dado." };
  }

  const { error } = await supabase
    .from("consignment_items")
    .update({ quantity_sold, quantity_returned })
    .eq("id", item_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/consignaciones");
  return { success: true };
}
