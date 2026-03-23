import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NuevaConsignacionClient } from "./NuevaConsignacionClient";

export default async function NuevaConsignacionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: presentations } = await supabase
    .from("product_presentations")
    .select("id, name, sale_price, products(id, name)")
    .eq("is_active", true)
    .order("name");

  return <NuevaConsignacionClient presentations={presentations ?? []} />;
}
