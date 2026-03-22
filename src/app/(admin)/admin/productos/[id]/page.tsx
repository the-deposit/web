import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProductoForm } from "../nuevo/ProductoForm";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    productResult,
    categoriesResult,
    unitsResult,
    presentationsResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, description, category_id, brand, tags, images, is_active, is_featured")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
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
    supabase
      .from("product_presentations")
      .select("*")
      .eq("product_id", id)
      .order("created_at"),
  ]);

  const product = productResult.data;
  if (!product) notFound();

  const p = product as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category_id: string | null;
    brand: string | null;
    tags: string[];
    images: string[];
    is_active: boolean;
    is_featured: boolean;
  };

  const categories = (categoriesResult.data ?? []) as { id: string; name: string }[];
  const units = (unitsResult.data ?? []) as { id: string; name: string; abbreviation: string; category: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const presentations = (presentationsResult.data ?? []) as any[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-primary">Editar Producto</h1>
        <p className="text-sm text-gray-mid mt-1">{p.name}</p>
      </div>
      <ProductoForm
        categories={categories}
        units={units}
        initialProduct={p}
        initialPresentations={presentations}
      />
    </div>
  );
}
