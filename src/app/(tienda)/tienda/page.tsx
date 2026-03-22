import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/tienda/ProductCard";
import { CatalogoFilters } from "@/components/tienda/CatalogoFilters";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { Package } from "lucide-react";

const PAGE_SIZE = 20;

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoria?: string;
    busqueda?: string;
    orden?: string;
    page?: string;
  }>;
}) {
  const { categoria, busqueda, orden, page } = await searchParams;
  const currentPage = parseInt(page ?? "1", 10) || 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("products")
    .select(
      `id, name, slug, brand, images, is_featured, category_id, product_presentations(sale_price, is_active)`,
      { count: "exact" }
    )
    .eq("is_active", true)
    .is("deleted_at", null);

  if (categoria) {
    query = query.eq("category_id", categoria);
  }

  if (busqueda) {
    query = query.or(`name.ilike.%${busqueda}%,brand.ilike.%${busqueda}%`);
  }

  if (orden === "nombre") {
    query = query.order("name", { ascending: true });
  } else if (!orden) {
    query = query.order("is_featured", { ascending: false }).order("name");
  } else {
    query = query.order("name");
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: rawProducts, count } = await query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = ((rawProducts as any[]) ?? []).map((p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activePresentations = (p.product_presentations ?? []).filter((pr: any) => pr.is_active);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prices = activePresentations.map((pr: any) => pr.sale_price as number);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    return {
      id: p.id as string,
      name: p.name as string,
      slug: p.slug as string,
      brand: p.brand as string | null,
      images: p.images as string[],
      is_featured: p.is_featured as boolean,
      minPrice,
    };
  });

  const sorted =
    orden === "precio_asc"
      ? [...products].sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity))
      : orden === "precio_desc"
      ? [...products].sort((a, b) => (b.minPrice ?? -Infinity) - (a.minPrice ?? -Infinity))
      : products;

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (busqueda) params.set("busqueda", busqueda);
    if (categoria) params.set("categoria", categoria);
    if (orden) params.set("orden", orden);
    params.set("page", String(p));
    return `/tienda?${params.toString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl text-primary mb-6">Catálogo</h1>

      <div className="mb-8">
        <CatalogoFilters
          categories={(categories as { id: string; name: string }[]) ?? []}
          currentSearch={busqueda ?? ""}
          currentCategory={categoria ?? ""}
          currentSort={orden ?? ""}
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay productos"
          description={
            busqueda || categoria
              ? "No encontramos productos con esos filtros. Intenta otra búsqueda."
              : "Aún no hay productos disponibles."
          }
        />
      ) : (
        <>
          <p className="text-xs text-gray-mid mb-4">
            {count ?? 0} producto{(count ?? 0) !== 1 ? "s" : ""}
            {busqueda ? ` para "${busqueda}"` : ""}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {sorted.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                slug={p.slug}
                images={p.images}
                is_featured={p.is_featured}
                minPrice={p.minPrice}
                brand={p.brand}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {currentPage > 1 && (
                <Link
                  href={buildPageUrl(currentPage - 1)}
                  className="px-4 py-2 border border-border rounded text-sm font-body text-primary hover:bg-gray-light transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              <span className="text-sm font-body text-gray-mid px-2">
                Página {currentPage} de {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={buildPageUrl(currentPage + 1)}
                  className="px-4 py-2 border border-border rounded text-sm font-body text-primary hover:bg-gray-light transition-colors"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
