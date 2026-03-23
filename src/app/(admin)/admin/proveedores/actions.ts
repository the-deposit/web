"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { SupplierSchema } from "@/lib/validations";

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

export async function createSupplier(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const parsed = SupplierSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  const { error } = await supabase.from("suppliers").insert({
    name: data.name,
    nit: data.nit ?? null,
    contact_info: data.contact_info ?? null,
    address: data.address ?? null,
    notes: data.notes ?? null,
    is_active: data.is_active,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/proveedores");
  return { success: true };
}

export async function updateSupplier(id: string, formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const parsed = SupplierSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  const { error } = await supabase
    .from("suppliers")
    .update({
      name: data.name,
      nit: data.nit ?? null,
      contact_info: data.contact_info ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      is_active: data.is_active,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/proveedores");
  return { success: true };
}

export async function deleteSupplier(id: string) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/proveedores");
  return { success: true };
}
