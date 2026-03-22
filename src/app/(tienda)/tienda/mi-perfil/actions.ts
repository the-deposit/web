"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProfileSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone: z.string().max(20).optional().nullable(),
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

export async function updateProfile(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = ProfileSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone ?? null,
    })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/tienda/mi-perfil");
  return { success: true };
}

export async function createProfileAddress(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = AddressSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const data = parsed.data;

  if (data.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase.from("addresses").insert({
    user_id: user.id,
    label: data.label,
    full_address: data.full_address,
    department: data.department ?? null,
    municipality: data.municipality ?? null,
    zone: data.zone ?? null,
    reference: data.reference ?? null,
    is_default: data.is_default ?? false,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/tienda/mi-perfil");
  return { success: true };
}

export async function updateProfileAddress(id: string, formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = AddressSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  // Verify ownership
  const { data: addr } = await supabase
    .from("addresses")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!addr || addr.user_id !== user.id) return { success: false, error: "Sin permisos" };

  const data = parsed.data;

  if (data.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("addresses")
    .update({
      label: data.label,
      full_address: data.full_address,
      department: data.department ?? null,
      municipality: data.municipality ?? null,
      zone: data.zone ?? null,
      reference: data.reference ?? null,
      is_default: data.is_default ?? false,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/tienda/mi-perfil");
  return { success: true };
}

export async function deleteProfileAddress(id: string) {
  const supabase: SupabaseClient = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: addr } = await supabase
    .from("addresses")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!addr || addr.user_id !== user.id) return { success: false, error: "Sin permisos" };

  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/tienda/mi-perfil");
  return { success: true };
}
