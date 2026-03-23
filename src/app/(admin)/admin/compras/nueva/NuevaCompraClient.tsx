"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { createCompra, searchPresentationsForPurchase } from "../actions";
import { Search, Trash2, Plus } from "lucide-react";

type Supplier = { id: string; name: string };
type CreditCard = { id: string; card_name: string; last_four_digits: string; current_balance: number; credit_limit: number | null };

type PresentationResult = {
  id: string;
  name: string;
  cost_price: number;
  stock: number;
  products: { name: string } | null;
  measurement_units: { abbreviation: string } | null;
};

type CartItem = {
  presentationId: string;
  productName: string;
  presentationName: string;
  quantity: number;
  unitCost: number;
};

interface NuevaCompraClientProps {
  suppliers: Supplier[];
  creditCards: CreditCard[];
}

export function NuevaCompraClient({ suppliers, creditCards }: NuevaCompraClientProps) {
  const router = useRouter();

  // Form fields
  const [supplierId, setSupplierId] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta_credito" | "transferencia" | "consignacion">("efectivo");
  const [creditCardId, setCreditCardId] = useState<string>("");
  const [addNewCard, setAddNewCard] = useState(false);
  const [newCard, setNewCard] = useState({ card_name: "", last_four_digits: "", credit_limit: "", cut_off_day: "", payment_due_day: "" });
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Items
  const [items, setItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PresentationResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchPresentationsForPurchase(q);
      setSearchResults(res.data as PresentationResult[]);
      setSearching(false);
    }, 300);
  };

  const addItem = (pres: PresentationResult) => {
    const existing = items.find((i) => i.presentationId === pres.id);
    if (existing) {
      setItems((prev) => prev.map((i) => i.presentationId === pres.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems((prev) => [...prev, {
        presentationId: pres.id,
        productName: pres.products?.name ?? "Producto",
        presentationName: pres.name,
        quantity: 1,
        unitCost: pres.cost_price,
      }]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateItem = (id: string, field: "quantity" | "unitCost", value: number) => {
    setItems((prev) => prev.map((i) => i.presentationId === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.presentationId !== id));
  };

  const total = items.reduce((acc, i) => acc + i.unitCost * i.quantity, 0);

  const handleSubmit = async () => {
    if (items.length === 0) { setError("Agrega al menos un producto."); return; }
    if (paymentMethod === "tarjeta_credito" && !creditCardId && !addNewCard) {
      setError("Selecciona una tarjeta o agrega una nueva."); return;
    }
    if (paymentMethod === "tarjeta_credito" && addNewCard && (!newCard.card_name || newCard.last_four_digits.length !== 4)) {
      setError("Completa los datos de la tarjeta."); return;
    }

    setLoading(true);
    setError(null);

    const res = await createCompra({
      supplier_id: supplierId || null,
      purchase_date: purchaseDate,
      payment_method: paymentMethod,
      credit_card_id: creditCardId || null,
      new_card: addNewCard ? {
        card_name: newCard.card_name,
        last_four_digits: newCard.last_four_digits,
        credit_limit: newCard.credit_limit ? parseFloat(newCard.credit_limit) : null,
        cut_off_day: newCard.cut_off_day ? parseInt(newCard.cut_off_day) : null,
        payment_due_day: newCard.payment_due_day ? parseInt(newCard.payment_due_day) : null,
      } : null,
      invoice_number: invoiceNumber || null,
      notes: notes || null,
      items: items.map((i) => ({
        presentation_id: i.presentationId,
        quantity: i.quantity,
        unit_cost: i.unitCost,
      })),
    });

    setLoading(false);

    if (res.success) {
      router.push("/admin/compras");
    } else {
      setError(res.error ?? "Error al guardar la compra.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary uppercase tracking-wide">Nueva Compra</h1>
        <Button variant="ghost" onClick={() => router.push("/admin/compras")}>
          Cancelar
        </Button>
      </div>

      {/* Purchase details */}
      <div className="bg-secondary border border-border rounded p-4 space-y-4">
        <h2 className="font-display text-sm text-primary uppercase tracking-wide">Datos de la compra</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-mid font-body mb-1">Proveedor</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
            >
              <option value="">Sin especificar</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <Input
            label="Fecha de compra"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />

          <div>
            <label className="block text-xs text-gray-mid font-body mb-1">Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value as typeof paymentMethod);
                setCreditCardId("");
                setAddNewCard(false);
              }}
              className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta_credito">Tarjeta de crédito</option>
              <option value="transferencia">Transferencia</option>
              <option value="consignacion">Consignación</option>
            </select>
          </div>

          <Input
            label="No. factura proveedor (opcional)"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Ej: F-001234"
          />
        </div>

        {/* Credit card selection */}
        {paymentMethod === "tarjeta_credito" && (
          <div className="space-y-3 border border-border rounded p-3">
            <p className="text-xs font-body font-medium text-primary">Tarjeta de crédito</p>
            {creditCards.length > 0 && (
              <div>
                <label className="block text-xs text-gray-mid font-body mb-1">Tarjeta existente</label>
                <select
                  value={creditCardId}
                  onChange={(e) => { setCreditCardId(e.target.value); setAddNewCard(false); }}
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
                >
                  <option value="">Seleccionar tarjeta...</option>
                  {creditCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.card_name} ****{c.last_four_digits} — Balance: {formatCurrency(c.current_balance)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => { setAddNewCard(!addNewCard); setCreditCardId(""); }}
              className="flex items-center gap-1 text-xs text-gray-mid hover:text-primary transition-colors font-body"
            >
              <Plus className="w-3.5 h-3.5" />
              {addNewCard ? "Cancelar nueva tarjeta" : "Agregar nueva tarjeta"}
            </button>
            {addNewCard && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input label="Nombre de la tarjeta" value={newCard.card_name} onChange={(e) => setNewCard((p) => ({ ...p, card_name: e.target.value }))} placeholder="Visa BAM" />
                <Input label="Últimos 4 dígitos" value={newCard.last_four_digits} onChange={(e) => setNewCard((p) => ({ ...p, last_four_digits: e.target.value.slice(0, 4) }))} placeholder="4532" maxLength={4} />
                <Input label="Límite de crédito (Q)" type="number" value={newCard.credit_limit} onChange={(e) => setNewCard((p) => ({ ...p, credit_limit: e.target.value }))} placeholder="0.00" />
                <Input label="Día de pago" type="number" value={newCard.payment_due_day} onChange={(e) => setNewCard((p) => ({ ...p, payment_due_day: e.target.value }))} placeholder="15" />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-mid font-body mb-1">Notas (opcional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            placeholder="Observaciones de la compra"
          />
        </div>
      </div>

      {/* Items */}
      <div className="bg-secondary border border-border rounded p-4 space-y-3">
        <h2 className="font-display text-sm text-primary uppercase tracking-wide">
          Productos ({items.length})
        </h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-mid" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar producto por nombre..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded font-body focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {(searchResults.length > 0 || searching) && (
            <div className="absolute z-20 w-full bg-secondary border border-border rounded mt-1 shadow-lg max-h-56 overflow-y-auto">
              {searching && <p className="p-3 text-sm text-gray-mid font-body text-center">Buscando...</p>}
              {searchResults.map((pres) => (
                <button
                  key={pres.id}
                  onClick={() => addItem(pres)}
                  className="w-full flex items-center justify-between gap-3 p-3 hover:bg-gray-light transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-medium text-primary truncate">{pres.products?.name}</p>
                    <p className="text-xs text-gray-mid font-body">{pres.name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-body text-gray-mid">Costo: {formatCurrency(pres.cost_price)}</p>
                    <p className="text-xs text-gray-mid font-body">{pres.stock} en stock</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items list */}
        {items.length === 0 ? (
          <p className="text-sm text-gray-mid font-body text-center py-4">
            Busca y agrega los productos comprados
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.presentationId} className="flex items-center gap-2 p-2 border border-border rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-body font-medium text-primary truncate">{item.productName}</p>
                  <p className="text-xs text-gray-mid font-body">{item.presentationName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div>
                    <label className="block text-[10px] text-gray-mid font-body">Cant.</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.presentationId, "quantity", parseInt(e.target.value) || 1)}
                      className="w-14 text-xs border border-border rounded px-2 py-1 font-body text-center focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-mid font-body">Costo unit.</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitCost}
                      onChange={(e) => updateItem(item.presentationId, "unitCost", parseFloat(e.target.value) || 0)}
                      className="w-20 text-xs border border-border rounded px-2 py-1 font-body text-right focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="w-16 text-right">
                    <label className="block text-[10px] text-gray-mid font-body">Total</label>
                    <p className="text-xs font-body font-semibold text-primary">{formatCurrency(item.unitCost * item.quantity)}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.presentationId)}
                    className="text-gray-mid hover:text-error transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        {items.length > 0 && (
          <div className="flex justify-between font-body font-semibold text-primary text-sm border-t border-border pt-3">
            <span>TOTAL COMPRA</span>
            <span>{formatCurrency(total)}</span>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-error font-body">{error}</p>}

      <div className="flex gap-3">
        <Button
          size="lg"
          className="flex-1"
          loading={loading}
          disabled={items.length === 0 || loading}
          onClick={handleSubmit}
        >
          Registrar compra
        </Button>
      </div>
    </div>
  );
}
