import { createClient } from "@/lib/supabase/server";
import { ProductoForm } from "./ProductoForm";

export default async function NuevoProductoPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: units }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("measurement_units")
      .select("id, name, abbreviation, category")
      .eq("is_active", true)
      .order("category")
      .order("name"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-primary">Nuevo Producto</h1>
        <p className="text-sm text-gray-mid mt-1">Completa la información del producto y sus presentaciones.</p>
      </div>
      <ProductoForm categories={categories ?? []} units={units ?? []} />
    </div>
  );
}
