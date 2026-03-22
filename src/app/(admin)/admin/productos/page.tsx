import { createClient } from "@/lib/supabase/server";
import { ProductosList } from "./ProductosList";

export default async function ProductosPage() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProducts } = await (supabase as any)
    .from("products")
    .select(`
      id,
      name,
      slug,
      brand,
      images,
      is_active,
      is_featured,
      category_id,
      categories(name),
      product_presentations(sale_price, is_active)
    `)
    .is("deleted_at", null)
    .order("name");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = ((rawProducts as any[]) ?? []).map((p: any) => {
    const activePresentations = (p.product_presentations ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pr: any) => pr.is_active
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prices = activePresentations.map((pr: any) => pr.sale_price as number);
    const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
    return {
      id: p.id as string,
      name: p.name as string,
      slug: p.slug as string,
      brand: p.brand as string | null,
      images: p.images as string[],
      is_active: p.is_active as boolean,
      is_featured: p.is_featured as boolean,
      category_id: p.category_id as string | null,
      categories: cat as { name: string } | null,
      presentations_count: (p.product_presentations ?? []).length as number,
      min_price: prices.length > 0 ? Math.min(...prices) : null,
    };
  });

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return <ProductosList products={products} categories={(categories as { id: string; name: string }[]) ?? []} />;
}
