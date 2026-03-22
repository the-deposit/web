"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils";
import { CategorySchema } from "@/lib/validations";

async function checkAdminRole(supabase: SupabaseClient) {
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

export async function createCategory(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const parsed = CategorySchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const slug = slugify(data.name);

  const { error } = await supabase.from("categories").insert({
    name: data.name,
    slug,
    description: data.description ?? null,
    image_url: data.image_url ?? null,
    parent_id: data.parent_id ?? null,
    sort_order: data.sort_order,
    is_active: data.is_active,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/categorias");
  return { success: true };
}

export async function updateCategory(id: string, formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const parsed = CategorySchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const slug = slugify(data.name);

  const { error } = await supabase
    .from("categories")
    .update({
      name: data.name,
      slug,
      description: data.description ?? null,
      image_url: data.image_url ?? null,
      parent_id: data.parent_id ?? null,
      sort_order: data.sort_order,
      is_active: data.is_active,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/categorias");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    const { error } = await supabase
      .from("categories")
      .update({ is_active: false })
      .eq("id", id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/admin/categorias");
  return { success: true };
}
