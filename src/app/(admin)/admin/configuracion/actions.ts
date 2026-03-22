"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { MeasurementUnitSchema } from "@/lib/validations";

async function checkAdminRole(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Solo administradores");
  }

  return user;
}

export async function createMeasurementUnit(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const parsed = MeasurementUnitSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("measurement_units").insert(parsed.data);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function updateMeasurementUnit(id: string, formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const parsed = MeasurementUnitSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("measurement_units")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion");
  return { success: true };
}

export async function toggleMeasurementUnit(id: string, is_active: boolean) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const { error } = await supabase
    .from("measurement_units")
    .update({ is_active })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/configuracion");
  return { success: true };
}
