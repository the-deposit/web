import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductoDetalle } from "./ProductoDetalle";

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProduct } = await (supabase as any)
    .from("products")
    .select(`
      id, name, slug, description, brand, images, is_featured, tags,
      categories(name),
      product_presentations(
        id, name, barcode, quantity_value, quantity_unit_id,
        sale_price, stock, min_stock, units_per_presentation,
        expiration_date, is_active,
        measurement_units:quantity_unit_id(abbreviation)
      )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  if (!rawProduct) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = rawProduct as any;

  const categoryName = Array.isArray(p.categories)
    ? p.categories[0]?.name as string | undefined
    : (p.categories as { name: string } | null)?.name;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const presentations = ((p.product_presentations ?? []) as any[]).map((pr: any) => ({
    id: pr.id as string,
    name: pr.name as string,
    barcode: pr.barcode as string | null,
    quantity_value: pr.quantity_value as number | null,
    quantity_unit_id: pr.quantity_unit_id as string | null,
    sale_price: pr.sale_price as number,
    stock: pr.stock as number,
    min_stock: pr.min_stock as number,
    units_per_presentation: pr.units_per_presentation as number,
    expiration_date: pr.expiration_date as string | null,
    is_active: pr.is_active as boolean,
    measurement_units: Array.isArray(pr.measurement_units)
      ? (pr.measurement_units[0] as { abbreviation: string } | null) ?? null
      : (pr.measurement_units as { abbreviation: string } | null),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-1.5 text-xs font-body text-gray-mid mb-6">
        <Link href="/tienda" className="hover:text-primary transition-colors">
          Tienda
        </Link>
        {categoryName && (
          <>
            <ChevronRight className="w-3 h-3" />
            <span>{categoryName}</span>
          </>
        )}
        <ChevronRight className="w-3 h-3" />
        <span className="text-primary">{p.name}</span>
      </nav>

      <ProductoDetalle
        product={{
          id: p.id as string,
          name: p.name as string,
          description: p.description as string | null,
          brand: p.brand as string | null,
          images: p.images as string[],
          is_featured: p.is_featured as boolean,
          tags: p.tags as string[],
        }}
        presentations={presentations}
      />
    </div>
  );
}
