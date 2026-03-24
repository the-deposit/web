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

const AdjustStockSchema = z.object({
  presentation_id: z.string().uuid(),
  quantity_change: z.number().int().refine((n) => n !== 0, "La cantidad no puede ser cero"),
  reason: z.string().min(1, "Selecciona un motivo"),
  notes: z.string().max(300).optional().nullable(),
});

export async function getInventario() {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  const { data, error } = await supabase
    .from("product_presentations")
    .select(`
      id,
      name,
      barcode,
      stock,
      min_stock,
      cost_price,
      sale_price,
      is_active,
      quantity_value,
      product:products(
        id,
        name,
        brand,
        is_active,
        deleted_at,
        category:categories(name)
      ),
      unit:measurement_units(abbreviation)
    `)
    .order("stock", { ascending: true });

  if (error) return { items: [], error: error.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = ((data as any[]) ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((row: any) => !row.product?.deleted_at)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      const unit = Array.isArray(row.unit) ? row.unit[0] : row.unit;
      const category = Array.isArray(product?.category)
        ? product.category[0]
        : product?.category;
      return {
        id: row.id as string,
        name: row.name as string,
        barcode: row.barcode as string | null,
        stock: row.stock as number,
        min_stock: row.min_stock as number,
        cost_price: row.cost_price as number,
        sale_price: row.sale_price as number,
        is_active: row.is_active as boolean,
        quantity_value: row.quantity_value as number | null,
        product_name: product?.name as string,
        product_brand: product?.brand as string | null,
        product_active: product?.is_active as boolean,
        category_name: category?.name as string | null,
        unit_abbreviation: unit?.abbreviation as string | null,
      };
    });

  return { items, error: null };
}

export async function adjustStock(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const user = await checkSellerRole(supabase);

  const parsed = AdjustStockSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { presentation_id, quantity_change, reason, notes } = parsed.data;

  // Leer stock actual para validar que no quede negativo
  const { data: current, error: fetchError } = await supabase
    .from("product_presentations")
    .select("stock")
    .eq("id", presentation_id)
    .single();

  if (fetchError || !current) {
    return { success: false, error: "Presentación no encontrada" };
  }

  const newStock = (current.stock as number) + quantity_change;
  if (newStock < 0) {
    return { success: false, error: `Stock insuficiente. Stock actual: ${current.stock}` };
  }

  // Registrar ajuste
  const { error: adjError } = await supabase
    .from("inventory_adjustments")
    .insert({
      presentation_id,
      adjusted_by: user.id,
      quantity_change,
      reason,
      notes: notes ?? null,
    });

  if (adjError) {
    return { success: false, error: adjError.message };
  }

  // Actualizar stock en la presentación
  const { error: updateError } = await supabase
    .from("product_presentations")
    .update({ stock: newStock })
    .eq("id", presentation_id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/admin/inventario");
  revalidatePath("/admin");
  return { success: true, newStock };
}

export async function getAdjustmentHistory(presentationId: string) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  const { data, error } = await supabase
    .from("inventory_adjustments")
    .select(`
      id,
      quantity_change,
      reason,
      notes,
      created_at,
      adjusted_by_profile:profiles!adjusted_by(full_name)
    `)
    .eq("presentation_id", presentationId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { history: [], error: error.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = ((data as any[]) ?? []).map((row: any) => {
    const profile = Array.isArray(row.adjusted_by_profile)
      ? row.adjusted_by_profile[0]
      : row.adjusted_by_profile;
    return {
      id: row.id as string,
      quantity_change: row.quantity_change as number,
      reason: row.reason as string,
      notes: row.notes as string | null,
      created_at: row.created_at as string,
      adjusted_by_name: profile?.full_name as string | null,
    };
  });

  return { history, error: null };
}
