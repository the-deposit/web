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

export async function getCxC(filters?: { status?: string }) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("accounts_receivable")
    .select(`
      id, customer_name, total_amount, amount_paid, balance, due_date, status, notes, created_at,
      customer:profiles(id, full_name, email, phone),
      sale:sales(id, sale_type, created_at)
    `)
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

export async function registerCxCPayment(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  const user = await checkSellerRole(supabase);

  const parsed = RegisterPaymentSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { account_id, amount, payment_method, notes } = parsed.data;

  // Get current account
  const { data: account } = await supabase
    .from("accounts_receivable")
    .select("id, total_amount, amount_paid, status")
    .eq("id", account_id)
    .single();

  if (!account) return { success: false, error: "Cuenta no encontrada." };
  if (account.status === "pagada") return { success: false, error: "Esta cuenta ya está pagada." };

  const newAmountPaid = Math.min(account.amount_paid + amount, account.total_amount);
  const newStatus = newAmountPaid >= account.total_amount ? "pagada" : "parcial";

  // Insert payment
  const { error: payError } = await supabase.from("receivable_payments").insert({
    account_receivable_id: account_id,
    amount,
    payment_method,
    registered_by: user.id,
    notes: notes ?? null,
  });

  if (payError) return { success: false, error: payError.message };

  // Update account
  await supabase
    .from("accounts_receivable")
    .update({ amount_paid: newAmountPaid, status: newStatus })
    .eq("id", account_id);

  revalidatePath("/admin/cuentas-por-cobrar");
  return { success: true };
}

const CreateManualCxCSchema = z.object({
  customer_name: z.string().min(1),
  total_amount: z.number().positive(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createManualCxC(formData: unknown) {
  const supabase: SupabaseClient = await createClient();
  await checkSellerRole(supabase);

  const parsed = CreateManualCxCSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { customer_name, total_amount, due_date, notes } = parsed.data;

  const { error } = await supabase.from("accounts_receivable").insert({
    customer_name,
    total_amount,
    amount_paid: 0,
    due_date: due_date ?? null,
    status: "pendiente",
    notes: notes ?? null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/cuentas-por-cobrar");
  return { success: true };
}

// Called from POS/orders when payment is partial or pending
export async function autoCreateCxC(supabase: SupabaseClient, data: {
  sale_id: string;
  customer_id: string | null;
  customer_name: string;
  total_amount: number;
  amount_paid: number;
}) {
  const status = data.amount_paid > 0 ? "parcial" : "pendiente";
  await supabase.from("accounts_receivable").insert({
    sale_id: data.sale_id,
    customer_id: data.customer_id ?? null,
    customer_name: data.customer_name,
    total_amount: data.total_amount,
    amount_paid: data.amount_paid,
    status,
  });
}
