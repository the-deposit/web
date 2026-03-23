import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckoutClient } from "./CheckoutClient";

export default async function CheckoutPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/tienda/checkout");
  }

  const userId = user!.id;

  const [{ data: addresses }, { data: profile }] = await Promise.all([
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", userId)
      .single(),
  ]);

  return <CheckoutClient addresses={addresses ?? []} userPhone={(profile as { phone: string | null } | null)?.phone ?? null} />;
}
