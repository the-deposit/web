import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NuevaCompraClient } from "./NuevaCompraClient";

export default async function NuevaCompraPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: suppliers }, { data: creditCards }] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("credit_cards").select("id, card_name, last_four_digits, current_balance, credit_limit").order("card_name"),
  ]);

  return (
    <NuevaCompraClient
      suppliers={suppliers ?? []}
      creditCards={creditCards ?? []}
    />
  );
}
