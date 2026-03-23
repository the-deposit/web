"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ChevronDown, ChevronUp, ReceiptText, Package, Building2 } from "lucide-react";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Purchase = any;

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta_credito: "Tarjeta",
  transferencia: "Transferencia",
  consignacion: "Consignación",
};

interface ComprasListProps {
  purchases: Purchase[];
}

export function ComprasList({ purchases }: ComprasListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (purchases.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-primary uppercase">Compras</h1>
          <Link href="/admin/compras/nueva">
            <Button size="sm">+ Nueva compra</Button>
          </Link>
        </div>
        <EmptyState
          icon={ReceiptText}
          title="Sin compras registradas"
          description="Registra la primera compra para ver el historial aquí."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary uppercase">Compras</h1>
        <Link href="/admin/compras/nueva">
          <Button size="sm">+ Nueva compra</Button>
        </Link>
      </div>

      <p className="text-xs text-gray-mid font-body">{purchases.length} compra{purchases.length !== 1 ? "s" : ""}</p>

      <div className="space-y-2">
        {purchases.map((p: Purchase) => (
          <div key={p.id} className="bg-secondary border border-border rounded overflow-hidden">
            <button
              className="w-full flex items-start md:items-center justify-between p-4 hover:bg-gray-light transition-colors text-left gap-3"
              onClick={() => setExpanded((prev) => prev === p.id ? null : p.id)}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-body text-gray-mid">#{p.id.slice(-8).toUpperCase()}</span>
                  <Badge variant="outline" className="text-[10px]">{PAYMENT_LABELS[p.payment_method] ?? p.payment_method}</Badge>
                  {p.credit_card && (
                    <span className="text-xs font-body text-gray-mid">****{p.credit_card.last_four_digits}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-mid font-body">
                  {p.supplier && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {p.supplier.name}
                    </span>
                  )}
                  <span>{formatDate(p.purchase_date)}</span>
                  {p.invoice_number && <span>Factura: {p.invoice_number}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-body font-semibold text-primary text-sm">{formatCurrency(p.total_amount)}</span>
                {expanded === p.id ? <ChevronUp className="w-4 h-4 text-gray-mid" /> : <ChevronDown className="w-4 h-4 text-gray-mid" />}
              </div>
            </button>

            {expanded === p.id && (
              <div className="border-t border-border p-4 space-y-3">
                {/* Items */}
                <div className="space-y-2">
                  <p className="text-xs font-body font-semibold text-gray-mid uppercase tracking-wide flex items-center gap-1">
                    <Package className="w-3 h-3" /> Productos
                  </p>
                  {p.purchase_items?.map((item: Purchase) => {
                    const pres = item.product_presentations;
                    return (
                      <div key={item.id} className="flex items-center justify-between text-xs font-body gap-2">
                        <span className="text-primary truncate">
                          {pres?.products?.name} — {pres?.name}
                        </span>
                        <span className="text-gray-mid shrink-0">
                          {item.quantity} × {formatCurrency(item.unit_cost)} = {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="flex justify-between text-sm font-body font-semibold text-primary border-t border-border pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(p.total_amount)}</span>
                </div>

                {p.notes && (
                  <p className="text-xs font-body text-gray-mid bg-gray-light rounded p-2">{p.notes}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
