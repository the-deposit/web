"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ProductSchema } from "@/lib/validations";

async function checkRole(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "vendedor")) {
    throw new Error("Sin permisos");
  }

  return user;
}

export type ProductFormData = {
  name: string;
  slug: string;
  description?: string | null;
  category_id: string;
  brand?: string | null;
  tags: string[];
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  presentations: Array<{
    id?: string;
    name: string;
    barcode?: string | null;
    quantity_value?: number | null;
    quantity_unit_id?: string | null;
    sale_price: number;
    cost_price: number;
    competitor_price?: number | null;
    stock: number;
    min_stock: number;
    units_per_presentation: number;
    expiration_date?: string | null;
    is_active: boolean;
  }>;
};

export async function createProduct(data: ProductFormData): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase: SupabaseClient = await createClient();
  await checkRole(supabase);

  const productParsed = ProductSchema.safeParse(data);
  if (!productParsed.success) {
    return { success: false, error: productParsed.error.issues[0].message };
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      category_id: data.category_id,
      brand: data.brand ?? null,
      tags: data.tags,
      images: data.images,
      is_active: data.is_active,
      is_featured: data.is_featured,
    })
    .select("id")
    .single();

  if (productError) return { success: false, error: productError.message };

  if (data.presentations.length > 0) {
    const presentationsToInsert = data.presentations.map((p) => ({
      product_id: product.id,
      name: p.name,
      barcode: p.barcode ?? null,
      quantity_value: p.quantity_value ?? null,
      quantity_unit_id: p.quantity_unit_id ?? null,
      sale_price: p.sale_price,
      cost_price: p.cost_price,
      competitor_price: p.competitor_price ?? null,
      stock: p.stock,
      min_stock: p.min_stock,
      units_per_presentation: p.units_per_presentation,
      expiration_date: p.expiration_date ?? null,
      is_active: p.is_active,
    }));

    const { error: presError } = await supabase
      .from("product_presentations")
      .insert(presentationsToInsert);

    if (presError) return { success: false, error: presError.message };
  }

  revalidatePath("/admin/productos");
  return { success: true, id: product.id };
}

export async function updateProduct(id: string, data: ProductFormData): Promise<{ success: boolean; error?: string }> {
  const supabase: SupabaseClient = await createClient();
  await checkRole(supabase);

  const productParsed = ProductSchema.safeParse(data);
  if (!productParsed.success) {
    return { success: false, error: productParsed.error.issues[0].message };
  }

  const { error: productError } = await supabase
    .from("products")
    .update({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      category_id: data.category_id,
      brand: data.brand ?? null,
      tags: data.tags,
      images: data.images,
      is_active: data.is_active,
      is_featured: data.is_featured,
    })
    .eq("id", id);

  if (productError) return { success: false, error: productError.message };

  for (const p of data.presentations) {
    if (p.id) {
      const { error } = await supabase
        .from("product_presentations")
        .update({
          name: p.name,
          barcode: p.barcode ?? null,
          quantity_value: p.quantity_value ?? null,
          quantity_unit_id: p.quantity_unit_id ?? null,
          sale_price: p.sale_price,
          cost_price: p.cost_price,
          competitor_price: p.competitor_price ?? null,
          stock: p.stock,
          min_stock: p.min_stock,
          units_per_presentation: p.units_per_presentation,
          expiration_date: p.expiration_date ?? null,
          is_active: p.is_active,
        })
        .eq("id", p.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("product_presentations").insert({
        product_id: id,
        name: p.name,
        barcode: p.barcode ?? null,
        quantity_value: p.quantity_value ?? null,
        quantity_unit_id: p.quantity_unit_id ?? null,
        sale_price: p.sale_price,
        cost_price: p.cost_price,
        competitor_price: p.competitor_price ?? null,
        stock: p.stock,
        min_stock: p.min_stock,
        units_per_presentation: p.units_per_presentation,
        expiration_date: p.expiration_date ?? null,
        is_active: p.is_active,
      });
      if (error) return { success: false, error: error.message };
    }
  }

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${id}`);
  return { success: true };
}

export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase: SupabaseClient = await createClient();
  await checkRole(supabase);

  const { error } = await supabase
    .from("products")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/productos");
  return { success: true };
}

export async function deletePresentation(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase: SupabaseClient = await createClient();
  await checkRole(supabase);

  const { error } = await supabase
    .from("product_presentations")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/productos");
  return { success: true };
}
