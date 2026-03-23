import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

type ProductCardProps = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  is_featured: boolean;
  minPrice: number | null;
  maxPrice?: number | null;
  brand?: string | null;
};

export function ProductCard({
  name,
  slug,
  images,
  is_featured,
  minPrice,
  maxPrice,
  brand,
}: ProductCardProps) {
  const imageUrl = images[0]
    ? images[0].replace("/upload/", "/upload/w_400,h_400,c_fill,f_auto,q_auto/")
    : null;

  return (
    <Link
      href={`/tienda/${slug}`}
      className="group block bg-secondary border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-light">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-display text-4xl text-border">TD</span>
          </div>
        )}
        {is_featured && (
          <div className="absolute top-2 left-2">
            <Badge variant="default" className="text-[10px] tracking-widest uppercase">
              Destacado
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {brand && (
          <p className="text-[11px] font-body text-gray-mid uppercase tracking-wider mb-0.5">
            {brand}
          </p>
        )}
        <h3 className="font-body font-medium text-primary text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {name}
        </h3>
        {minPrice != null ? (
          <p className="mt-2 font-display text-base text-primary">
            {maxPrice != null && maxPrice > minPrice
              ? `${formatCurrency(minPrice)} — ${formatCurrency(maxPrice)}`
              : formatCurrency(minPrice)}
          </p>
        ) : (
          <p className="mt-2 text-xs text-gray-mid italic">Consultar precio</p>
        )}
        <span className="inline-block mt-2 text-xs font-body text-gray-mid group-hover:text-primary transition-colors underline-offset-2 group-hover:underline">
          Ver más →
        </span>
      </div>
    </Link>
  );
}
