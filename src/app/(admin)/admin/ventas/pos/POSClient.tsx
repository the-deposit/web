"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatMeasure } from "@/lib/utils";
import { searchPresentationByBarcode, searchPresentationsByName, createPOSSale } from "./actions";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { Scan, Search, Trash2, Plus, Minus, ShoppingCart, CheckCircle, Printer } from "lucide-react";
import { generateInvoicePDF } from "@/lib/pdf";

type Presentation = {
  id: string;
  name: string;
  sale_price: number;
  stock: number;
  barcode: string | null;
  quantity_value: number | null;
  is_active: boolean;
  products: { id: string; name: string; images: string[] } | null;
  measurement_units: { abbreviation: string } | null;
};

type CartItem = {
  presentationId: string;
  productName: string;
  presentationName: string;
  imageUrl: string | null;
  salePrice: number;
  quantity: number;
  maxStock: number;
  measure: string;
};

type SaleMode = "form" | "success";

export function POSClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Presentation[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerNit, setCustomerNit] = useState("CF");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta_credito" | "transferencia">("efectivo");
  const [paymentStatus, setPaymentStatus] = useState<"pagado" | "parcial" | "pendiente">("pagado");
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [saleMode, setSaleMode] = useState<SaleMode>("form");
  const [lastSale, setLastSale] = useState<{ saleId: string; invoiceNumber: string | null } | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToCart = useCallback((pres: Presentation) => {
    if (!pres.products) return;
    const existing = items.find((i) => i.presentationId === pres.id);
    if (existing) {
      if (existing.quantity >= existing.maxStock) return;
      setItems((prev) =>
        prev.map((i) =>
          i.presentationId === pres.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          presentationId: pres.id,
          productName: pres.products!.name,
          presentationName: pres.name,
          imageUrl: pres.products!.images[0] ?? null,
          salePrice: pres.sale_price,
          quantity: 1,
          maxStock: pres.stock,
          measure: pres.quantity_value && pres.measurement_units
            ? formatMeasure(pres.quantity_value, pres.measurement_units.abbreviation)
            : "",
        },
      ]);
    }
    setSearchQuery("");
    setSearchResults([]);
    setScanError(null);
  }, [items]);

  const handleBarcodeScan = async (barcode: string) => {
    setScanMode(false);
    setScanError(null);
    const res = await searchPresentationByBarcode(barcode);
    if (res.data) {
      addToCart(res.data as Presentation);
    } else {
      setScanError(res.error ?? "No encontrado");
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchPresentationsByName(query);
      setSearchResults(res.data as Presentation[]);
      setSearching(false);
    }, 300);
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.presentationId !== id));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.presentationId === id
            ? { ...i, quantity: Math.min(qty, i.maxStock) }
            : i
        )
      );
    }
  };

  const subtotal = items.reduce((acc, i) => acc + i.salePrice * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const handleCompleteSale = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setSaleError(null);

    const res = await createPOSSale({
      customer_name: customerName || null,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      discount,
      notes: notes || null,
      customer_nit: customerNit || "CF",
      generate_invoice: true,
      items: items.map((i) => ({
        presentation_id: i.presentationId,
        quantity: i.quantity,
        unit_price: i.salePrice,
      })),
    });

    setLoading(false);

    if (res.success) {
      setLastSale({ saleId: res.saleId!, invoiceNumber: res.invoiceNumber ?? null });
      setSaleMode("success");
    } else {
      setSaleError(res.error ?? "Error al procesar la venta");
    }
  };

  const handlePrintInvoice = () => {
    if (!lastSale?.invoiceNumber) return;
    generateInvoicePDF({
      invoiceNumber: lastSale.invoiceNumber,
      customerName: customerName || "Consumidor Final",
      customerNit: customerNit || "CF",
      items,
      subtotal,
      discount,
      total,
      date: new Date(),
    });
  };

  const handleNewSale = () => {
    setItems([]);
    setCustomerName("");
    setCustomerNit("CF");
    setPaymentMethod("efectivo");
    setPaymentStatus("pagado");
    setDiscount(0);
    setNotes("");
    setSaleMode("form");
    setLastSale(null);
    setSaleError(null);
  };

  // SUCCESS STATE
  if (saleMode === "success") {
    return (
      <div className="max-w-sm mx-auto py-12 text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-success mx-auto" />
        <h2 className="font-display text-2xl text-primary uppercase">¡Venta completada!</h2>
        {lastSale?.invoiceNumber && (
          <p className="text-sm font-body text-gray-mid">Factura: {lastSale.invoiceNumber}</p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          {lastSale?.invoiceNumber && (
            <Button variant="secondary" onClick={handlePrintInvoice}>
              <Printer className="w-4 h-4" />
              Imprimir factura
            </Button>
          )}
          <Button onClick={handleNewSale}>
            Nueva venta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full min-h-[calc(100vh-12rem)]">
      {/* LEFT: Product search/scan */}
      <div className="md:flex-1 space-y-3">
        <h1 className="font-display text-xl text-primary uppercase tracking-wide">
          Punto de Venta
        </h1>

        {/* Scanner toggle */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={scanMode ? "primary" : "secondary"}
            onClick={() => {
              setScanMode(!scanMode);
              setScanError(null);
            }}
          >
            <Scan className="w-4 h-4" />
            {scanMode ? "Cerrar escáner" : "Escanear código"}
          </Button>
        </div>

        {/* Scanner — renders as full-screen modal overlay */}
        {scanMode && (
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setScanMode(false)}
          />
        )}

        {scanError && (
          <p className="p-2 text-sm text-error font-body bg-error/5 rounded border border-error/20">
            {scanError}
          </p>
        )}

        {/* Manual search */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-mid" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar producto por nombre..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded font-body focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Search results dropdown */}
          {(searchResults.length > 0 || searching) && (
            <div className="absolute z-20 w-full bg-secondary border border-border rounded mt-1 shadow-lg max-h-64 overflow-y-auto">
              {searching && (
                <p className="p-3 text-sm text-gray-mid font-body text-center">Buscando...</p>
              )}
              {searchResults.map((pres) => (
                <button
                  key={pres.id}
                  onClick={() => addToCart(pres)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-light transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded bg-gray-light border border-border overflow-hidden shrink-0">
                    {pres.products?.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pres.products.images[0].replace("/upload/", "/upload/w_60,h_60,c_fill/")}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-border text-xs font-display">TD</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-medium text-primary truncate">
                      {pres.products?.name}
                    </p>
                    <p className="text-xs text-gray-mid font-body">{pres.name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-body font-semibold text-primary">
                      {formatCurrency(pres.sale_price)}
                    </p>
                    <p className="text-xs text-gray-mid font-body">{pres.stock} en stock</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart items list (mobile shows here, desktop shows in right panel) */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center md:hidden">
            <ShoppingCart className="w-10 h-10 text-border mb-2" />
            <p className="text-sm text-gray-mid font-body">El ticket está vacío</p>
          </div>
        ) : (
          <div className="md:hidden space-y-2">
            {items.map((item) => (
              <POSCartItem key={item.presentationId} item={item} onUpdateQty={updateQty} />
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Ticket + sale form */}
      <div className="md:w-80 lg:w-96 flex flex-col gap-3">
        {/* Items desktop */}
        <div className="hidden md:block flex-1 bg-secondary border border-border rounded overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="font-display text-sm text-primary uppercase tracking-wide flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Ticket ({items.length} productos)
            </h2>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-gray-mid font-body text-center">Vacío</p>
            ) : (
              items.map((item) => (
                <POSCartItem key={item.presentationId} item={item} onUpdateQty={updateQty} />
              ))
            )}
          </div>
        </div>

        {/* Customer & payment */}
        <div className="bg-secondary border border-border rounded p-3 space-y-3">
          <Input
            label="Cliente (opcional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nombre del cliente"
          />
          <Input
            label="NIT"
            value={customerNit}
            onChange={(e) => setCustomerNit(e.target.value)}
            placeholder="CF"
          />

          <div>
            <label className="block text-xs text-gray-mid font-body mb-1">Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "efectivo" | "tarjeta_credito" | "transferencia")}
              className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta_credito">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-mid font-body mb-1">Estado del pago</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as "pagado" | "parcial" | "pendiente")}
              className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
            >
              <option value="pagado">Pagado</option>
              <option value="parcial">Pago parcial</option>
              <option value="pendiente">Fiado</option>
            </select>
          </div>

          <Input
            label="Descuento (Q)"
            type="number"
            min={0}
            value={discount === 0 ? "" : String(discount)}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>

        {/* Totals */}
        <div className="bg-secondary border border-border rounded p-3 space-y-2 text-sm font-body">
          <div className="flex justify-between text-gray-mid">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Descuento</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-primary text-base border-t border-border pt-2">
            <span>TOTAL</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {saleError && (
          <p className="text-sm text-error font-body">{saleError}</p>
        )}

        <Button
          size="lg"
          className="w-full"
          loading={loading}
          disabled={items.length === 0 || loading}
          onClick={handleCompleteSale}
        >
          Completar venta
        </Button>
      </div>
    </div>
  );
}

function POSCartItem({
  item,
  onUpdateQty,
}: {
  item: CartItem;
  onUpdateQty: (id: string, qty: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 p-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-body font-medium text-primary truncate">{item.productName}</p>
        <p className="text-xs text-gray-mid font-body">{item.presentationName}</p>
        <p className="text-xs font-body text-primary">{formatCurrency(item.salePrice)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onUpdateQty(item.presentationId, item.quantity - 1)}
          className="w-6 h-6 flex items-center justify-center rounded border border-border hover:bg-gray-light transition-colors text-primary"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 text-center text-xs font-body font-semibold text-primary">
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdateQty(item.presentationId, item.quantity + 1)}
          disabled={item.quantity >= item.maxStock}
          className="w-6 h-6 flex items-center justify-center rounded border border-border hover:bg-gray-light transition-colors text-primary disabled:opacity-40"
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          onClick={() => onUpdateQty(item.presentationId, 0)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-error/10 transition-colors text-gray-mid hover:text-error ml-1"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <p className="text-xs font-body font-semibold text-primary w-16 text-right shrink-0">
        {formatCurrency(item.salePrice * item.quantity)}
      </p>
    </div>
  );
}
