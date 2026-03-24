import { createClient } from "@/lib/supabase/server";
import { InventarioClient } from "./InventarioClient";
import { getInventario } from "./actions";

export default async function InventarioPage() {
  const supabase = await createClient();

  const [{ items }, categoriesResult] = await Promise.all([
    getInventario(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  const categories: { id: string; name: string }[] =
    categoriesResult.data ?? [];

  return <InventarioClient items={items} categories={categories} />;
}
