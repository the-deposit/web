"use client";

import { useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileText, Printer, ChevronDown, ChevronUp, Search } from "lucide-react";
import { generateInvoicePDF } from "@/lib/pdf";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Factura = any;

interface FacturasListProps {
  facturas: Factura[];
}

export function FacturasList({ facturas }: FacturasListProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = facturas.filter((f: Factura) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.invoice_number?.toLowerCase().includes(q) ||
      f.customer_name?.toLowerCase().includes(q) ||
      f.customer_nit?.toLowerCase().includes(q)
    );
  });

  const handlePrint = (factura: Factura) => {
    const sale = factura.sales;
    const items = sale?.sale_items?.map((si: Factura) => ({
      productName: si.product_presentations?.products?.name ?? "Producto",
      presentationName: si.product_presentations?.name ?? "",
      quantity: si.quantity,
      salePrice: si.unit_price,
      measure: si.product_presentations?.quantity_value && si.product_presentations?.measurement_units
        ? `${si.product_presentations.quantity_value} ${si.product_presentations.measurement_units.abbreviation}`
        : "",
    })) ?? [];

    generateInvoicePDF({
      invoiceNumber: factura.invoice_number,
      customerName: factura.customer_name,
      customerNit: factura.customer_nit,
      items,
      subtotal: factura.subtotal,
      total: factura.total,
      date: new Date(factura.issued_at),
    });
  };

  if (facturas.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No hay facturas"
        description="Las facturas generadas aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-mid" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número, cliente o NIT..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded font-body focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <p className="text-sm text-gray-mid font-body">{filtered.length} factura{filtered.length !== 1 ? "s" : ""}</p>

      {/* Table - desktop */}
      <div className="hidden md:block bg-secondary border border-border rounded overflow-hidden">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="bg-gray-light border-b border-border">
              <th className="text-left p-3 font-semibold text-primary">Número</th>
              <th className="text-left p-3 font-semibold text-primary">Cliente</th>
              <th className="text-left p-3 font-semibold text-primary">NIT</th>
              <th className="text-left p-3 font-semibold text-primary">Fecha</th>
              <th className="text-right p-3 font-semibold text-primary">Total</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((f: Factura) => (
              <tr key={f.id} className="hover:bg-gray-light/50 transition-colors">
                <td className="p-3 font-medium text-primary">{f.invoice_number}</td>
                <td className="p-3 text-gray-mid">{f.customer_name}</td>
                <td className="p-3 text-gray-mid">{f.customer_nit}</td>
                <td className="p-3 text-gray-mid">{formatDateTime(f.issued_at)}</td>
                <td className="p-3 text-right font-semibold text-primary">{formatCurrency(f.total)}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => handlePrint(f)}>
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards - mobile */}
      <div className="md:hidden space-y-2">
        {filtered.map((f: Factura) => (
          <div key={f.id} className="bg-secondary border border-border rounded overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-gray-light transition-colors text-left"
              onClick={() => setExpanded((prev) => (prev === f.id ? null : f.id))}
            >
              <div>
                <p className="font-body font-semibold text-primary text-sm">{f.invoice_number}</p>
                <p className="text-xs text-gray-mid font-body">{f.customer_name}</p>
                <p className="text-xs text-gray-mid font-body">{formatDateTime(f.issued_at)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-body font-semibold text-primary text-sm">
                  {formatCurrency(f.total)}
                </span>
                {expanded === f.id ? (
                  <ChevronUp className="w-4 h-4 text-gray-mid" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-mid" />
                )}
              </div>
            </button>
            {expanded === f.id && (
              <div className="border-t border-border p-3 space-y-2">
                <p className="text-xs font-body text-gray-mid">NIT: {f.customer_nit}</p>
                <Button size="sm" variant="secondary" className="w-full" onClick={() => handlePrint(f)}>
                  <Printer className="w-4 h-4" />
                  Imprimir / Descargar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
