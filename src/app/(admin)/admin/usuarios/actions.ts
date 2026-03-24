"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function checkAdminRole(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") {
    throw new Error("Solo administradores pueden gestionar usuarios");
  }
  return user;
}

const UpdateRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "vendedor", "cliente"]),
});

const ToggleActiveSchema = z.object({
  user_id: z.string().uuid(),
  is_active: z.boolean(),
});

export async function getUsuarios() {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, avatar_url, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) return { users: [], error: error.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = ((data as any[]) ?? []).map((row: any) => ({
    id: row.id as string,
    full_name: row.full_name as string | null,
    email: row.email as string | null,
    phone: row.phone as string | null,
    role: row.role as "admin" | "vendedor" | "cliente",
    avatar_url: row.avatar_url as string | null,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
  }));

  return { users, error: null };
}

export async function updateUserRole(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const currentUser = await checkAdminRole(supabase);

  const parsed = UpdateRoleSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { user_id, role } = parsed.data;

  if (user_id === currentUser.id) {
    return { success: false, error: "No puedes cambiar tu propio rol" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/usuarios");
  return { success: true };
}

export async function toggleUserActive(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const currentUser = await checkAdminRole(supabase);

  const parsed = ToggleActiveSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { user_id, is_active } = parsed.data;

  if (user_id === currentUser.id) {
    return { success: false, error: "No puedes desactivar tu propia cuenta" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active })
    .eq("id", user_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/usuarios");
  return { success: true };
}
