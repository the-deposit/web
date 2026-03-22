"use client";

import { useState } from "react";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useCartStore } from "@/stores/cart-store";
import { formatCurrency, formatMeasure } from "@/lib/utils";

type Presentation = {
  id: string;
  name: string;
  sale_price: number;
  stock: number;
  quantity_value: number | null;
  quantity_unit_id: string | null;
  units_per_presentation: number;
  is_active: boolean;
  measurement_units: { abbreviation: string } | null;
};

type ProductoDetalleProps = {
  product: {
    id: string;
    name: string;
    description: string | null;
    brand: string | null;
    images: string[];
    is_featured: boolean;
    tags: string[];
  };
  presentations: Presentation[];
};

export function ProductoDetalle({ product, presentations }: ProductoDetalleProps) {
  const [imageIdx, setImageIdx] = useState(0);
  const [selectedPresIdx, setSelectedPresIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const activePresentations = presentations.filter((p) => p.is_active);
  const selectedPres = activePresentations[selectedPresIdx] ?? activePresentations[0];

  const images = product.images.length > 0 ? product.images : [];
  const displayImage = images[imageIdx]
    ? images[imageIdx].replace("/upload/", "/upload/w_800,h_800,c_fill,f_auto,q_auto/")
    : null;

  const handleAddToCart = () => {
    if (!selectedPres || selectedPres.stock === 0) return;
    addItem({
      presentationId: selectedPres.id,
      productId: product.id,
      productName: product.name,
      presentationName: selectedPres.name,
      imageUrl: product.images[0] ?? null,
      salePrice: selectedPres.sale_price,
      quantity: qty,
      maxStock: selectedPres.stock,
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const prevImage = () => setImageIdx((i) => (i - 1 + images.length) % images.length);
  const nextImage = () => setImageIdx((i) => (i + 1) % images.length);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
      {/* Gallery */}
      <div className="space-y-3">
        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-light border border-border">
          {displayImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-display text-6xl text-border">TD</span>
            </div>
          )}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-secondary/80 rounded-full p-1.5 hover:bg-secondary transition-colors shadow"
              >
                <ChevronLeft className="w-4 h-4 text-primary" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary/80 rounded-full p-1.5 hover:bg-secondary transition-colors shadow"
              >
                <ChevronRight className="w-4 h-4 text-primary" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setImageIdx(i)}
                className={`shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                  i === imageIdx ? "border-primary" : "border-border hover:border-gray-mid"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.replace("/upload/", "/upload/w_120,h_120,c_fill/")}
                  alt={`Vista ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-5">
        {/* Brand + name */}
        <div>
          {product.brand && (
            <p className="text-xs font-body text-gray-mid uppercase tracking-wider mb-1">
              {product.brand}
            </p>
          )}
          <h1 className="font-display text-2xl md:text-3xl text-primary">{product.name}</h1>
          {product.is_featured && (
            <Badge className="mt-2">Destacado</Badge>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm font-body text-gray-mid leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-light border border-border rounded text-xs font-body text-gray-mid"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Presentation selector */}
        {activePresentations.length > 0 && (
          <div>
            <p className="text-sm font-medium text-primary font-body mb-2">Presentación</p>
            <div className="flex flex-wrap gap-2">
              {activePresentations.map((pres, i) => (
                <button
                  key={pres.id}
                  onClick={() => {
                    setSelectedPresIdx(i);
                    setQty(1);
                  }}
                  className={`px-3 py-1.5 rounded border text-sm font-body transition-all ${
                    selectedPresIdx === i
                      ? "bg-primary text-secondary border-primary"
                      : "bg-secondary text-primary border-border hover:border-primary"
                  }`}
                >
                  {pres.name}
                  {pres.quantity_value && pres.measurement_units && (
                    <span className="ml-1 opacity-70">
                      {formatMeasure(pres.quantity_value, pres.measurement_units.abbreviation)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected presentation details */}
        {selectedPres && (
          <div className="bg-gray-light rounded-lg p-4 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl text-primary">
                {formatCurrency(selectedPres.sale_price)}
              </span>
              {selectedPres.units_per_presentation > 1 && (
                <span className="text-xs text-gray-mid font-body">
                  ({selectedPres.units_per_presentation} unidades)
                </span>
              )}
            </div>
            <p className={`text-sm font-body ${selectedPres.stock > 0 ? "text-success" : "text-error"}`}>
              {selectedPres.stock > 0
                ? `${selectedPres.stock} en stock`
                : "Sin stock disponible"}
            </p>
          </div>
        )}

        {/* Quantity + Add to cart */}
        {selectedPres && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-primary font-body">Cantidad</p>
              <div className="flex items-center border border-border rounded overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-primary hover:bg-gray-light transition-colors font-body"
                  disabled={qty <= 1}
                >
                  −
                </button>
                <span className="px-4 py-2 text-sm font-body text-primary border-x border-border min-w-[3rem] text-center">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(selectedPres.stock, q + 1))}
                  className="px-3 py-2 text-primary hover:bg-gray-light transition-colors font-body"
                  disabled={qty >= selectedPres.stock}
                >
                  +
                </button>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={selectedPres.stock === 0}
            >
              {addedFeedback ? (
                "¡Agregado al carrito!"
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  {selectedPres.stock === 0 ? "Sin stock" : "Agregar al carrito"}
                </>
              )}
            </Button>
          </div>
        )}

        {activePresentations.length === 0 && (
          <p className="text-sm text-gray-mid italic">
            No hay presentaciones disponibles en este momento.
          </p>
        )}
      </div>
    </div>
  );
}
