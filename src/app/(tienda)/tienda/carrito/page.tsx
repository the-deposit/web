"use client";

import { useCartStore } from "@/stores/cart-store";
import { formatCurrency } from "@/lib/utils";
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CarritoPage() {
  const { items, removeItem, updateQuantity, totalAmount } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <EmptyState
          icon={ShoppingBag}
          title="Tu carrito está vacío"
          description="Explora nuestra tienda y agrega productos a tu carrito."
          action={
            <Link
              href="/tienda"
              className="inline-flex items-center justify-center gap-2 rounded font-body font-medium transition-all duration-200 active:scale-95 bg-primary text-secondary hover:bg-accent px-4 py-2 text-sm"
            >
              Ver productos
            </Link>
          }
        />
      </div>
    );
  }

  const subtotal = totalAmount();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl md:text-3xl text-primary mb-6 uppercase tracking-wide">
        Carrito de compras
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const imgUrl = item.imageUrl
              ? item.imageUrl.replace("/upload/", "/upload/w_100,h_100,c_fill,f_auto,q_auto/")
              : null;

            return (
              <div
                key={item.presentationId}
                className="flex gap-3 p-3 bg-secondary rounded border border-border"
              >
                {/* Image */}
                <div className="w-16 h-16 shrink-0 rounded overflow-hidden bg-gray-light border border-border">
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-display text-lg text-border">TD</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-primary text-sm leading-tight truncate">
                    {item.productName}
                  </p>
                  <p className="text-xs text-gray-mid font-body mt-0.5">
                    {item.presentationName}
                  </p>
                  <p className="font-body font-semibold text-primary text-sm mt-1">
                    {formatCurrency(item.salePrice)}
                  </p>
                </div>

                {/* Quantity + Remove */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => removeItem(item.presentationId)}
                    className="text-gray-mid hover:text-error transition-colors"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center border border-border rounded overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.presentationId, item.quantity - 1)}
                      className="px-2 py-1 text-primary hover:bg-gray-light transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 py-1 text-sm font-body text-primary border-x border-border min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.presentationId,
                          Math.min(item.maxStock, item.quantity + 1)
                        )
                      }
                      className="px-2 py-1 text-primary hover:bg-gray-light transition-colors"
                      disabled={item.quantity >= item.maxStock}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-mid font-body">
                    {formatCurrency(item.salePrice * item.quantity)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-secondary border border-border rounded p-4 sticky top-4 space-y-4">
            <h2 className="font-display text-lg text-primary uppercase">Resumen</h2>
            <div className="space-y-2 text-sm font-body">
              <div className="flex justify-between text-gray-mid">
                <span>
                  Subtotal ({items.reduce((a, i) => a + i.quantity, 0)} productos)
                </span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-mid">
                <span>Envío</span>
                <span>Se calcula al confirmar</span>
              </div>
            </div>
            <div className="border-t border-border pt-3 flex justify-between font-body font-semibold text-primary">
              <span>Total estimado</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <Link
              href="/tienda/checkout"
              className="inline-flex items-center justify-center gap-2 w-full rounded font-body font-medium transition-all duration-200 active:scale-95 bg-primary text-secondary hover:bg-accent px-6 py-3 text-base"
            >
              Continuar con el pedido
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tienda"
              className="block text-center text-sm text-gray-mid hover:text-primary transition-colors font-body"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
