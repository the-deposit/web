import { createClient } from "@/lib/supabase/server";
import { CategoriasList } from "./CategoriasList";

export default async function CategoriasPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*, parent:parent_id(name)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return <CategoriasList categories={categories ?? []} />;
}
