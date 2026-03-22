import { createClient } from "@/lib/supabase/server";
import { ProveedoresList } from "./ProveedoresList";

export default async function ProveedoresPage() {
  const supabase = await createClient();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });

  return <ProveedoresList suppliers={suppliers ?? []} />;
}
