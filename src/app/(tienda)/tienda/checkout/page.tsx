import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckoutClient } from "./CheckoutClient";

export default async function CheckoutPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?next=/tienda/checkout");
  }

  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  return <CheckoutClient addresses={addresses ?? []} />;
}
