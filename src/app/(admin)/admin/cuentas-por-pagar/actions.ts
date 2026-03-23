"use server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function checkAdminRole(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "vendedor"].includes(profile.role)) throw new Error("Sin permisos");
  return user;
}

export async function getCxP(filters?: { status?: string }) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("accounts_payable")
    .select("id, source_type, source_id, creditor_name, total_amount, amount_paid, balance, due_date, status, notes, created_at")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.limit(200);
  if (error) return { accounts: [], error: error.message };
  return { accounts: data ?? [], error: null };
}

const RegisterPaymentSchema = z.object({
  account_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(["efectivo", "tarjeta_credito", "transferencia", "consignacion"]),
  notes: z.string().optional().nullable(),
});

export async function registerCxPPayment(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const user = await checkAdminRole(supabase);

  const parsed = RegisterPaymentSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { account_id, amount, payment_method, notes } = parsed.data;

  const { data: account } = await supabase
    .from("accounts_payable")
    .select("id, total_amount, amount_paid, status")
    .eq("id", account_id)
    .single();

  if (!account) return { success: false, error: "Cuenta no encontrada." };
  if (account.status === "pagada") return { success: false, error: "Esta cuenta ya está pagada." };

  const newAmountPaid = Math.min(account.amount_paid + amount, account.total_amount);
  const newStatus = newAmountPaid >= account.total_amount ? "pagada" : "parcial";

  const { error: payError } = await supabase.from("payable_payments").insert({
    account_payable_id: account_id,
    amount,
    payment_method,
    registered_by: user.id,
    notes: notes ?? null,
  });

  if (payError) return { success: false, error: payError.message };

  await supabase
    .from("accounts_payable")
    .update({ amount_paid: newAmountPaid, status: newStatus })
    .eq("id", account_id);

  revalidatePath("/admin/cuentas-por-pagar");
  return { success: true };
}

const CreateManualCxPSchema = z.object({
  creditor_name: z.string().min(1),
  total_amount: z.number().positive(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createManualCxP(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkAdminRole(supabase);

  const parsed = CreateManualCxPSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { creditor_name, total_amount, due_date, notes } = parsed.data;

  const { error } = await supabase.from("accounts_payable").insert({
    creditor_name,
    total_amount,
    amount_paid: 0,
    due_date: due_date ?? null,
    status: "pendiente",
    notes: notes ?? null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/cuentas-por-pagar");
  return { success: true };
}
