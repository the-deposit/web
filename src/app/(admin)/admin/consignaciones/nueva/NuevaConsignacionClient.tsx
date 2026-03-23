"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Search } from "lucide-react";
import { createConsignacion } from "../actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Presentation = any;

interface CartItem {
  presentation_id: string;
  product_name: string;
  presentation_name: string;
  quantity: number;
  unit_price: number;
}

interface NuevaConsignacionClientProps {
  presentations: Presentation[];
}

export function NuevaConsignacionClient({ presentations }: NuevaConsignacionClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"dada" | "recibida">("dada");
  const [contactName, setContactName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [dateGiven, setDateGiven] = useState(new Date().toISOString().slice(0, 10));
  const [dateDue, setDateDue] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredPresentations = presentations.filter((p: Presentation) => {
    const q = search.toLowerCase();
    return (
      p.products?.name?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q)
    );
  });

  const addItem = (p: Presentation) => {
    const exists = items.find((i) => i.presentation_id === p.id);
    if (exists) return;
    setItems((prev) => [...prev, {
      presentation_id: p.id,
      product_name: p.products?.name ?? "",
      presentation_name: p.name ?? "",
      quantity: 1,
      unit_price: p.sale_price ?? 0,
    }]);
    setSearch("");
  };

  const updateItem = (id: string, field: "quantity" | "unit_price", value: number) => {
    setItems((prev) => prev.map((i) => i.presentation_id === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.presentation_id !== id));
  };

  const totalValue = items.reduce((acc, i) => acc + i.quantity * i.unit_price, 0);

  const handleSubmit = () => {
    if (items.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }
    if (!contactName) {
      setError(type === "dada" ? "Ingresa el nombre del consignatario." : "Ingresa el nombre del consignante.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await createConsignacion({
        type,
        consignee_name: type === "dada" ? contactName : null,
        consignee_contact: type === "dada" ? contactInfo || null : null,
        consigner_name: type === "recibida" ? contactName : null,
        consigner_contact: type === "recibida" ? contactInfo || null : null,
        date_given: dateGiven,
        date_due: dateDue || null,
        notes: notes || null,
        items: items.map((i) => ({
          product_presentation_id: i.presentation_id,
          quantity_given: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      if (res.success) {
        router.push("/admin/consignaciones");
      } else {
        setError(res.error ?? "Error al crear.");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-mid hover:text-primary text-sm font-body">← Volver</button>
        <h1 className="font-display text-2xl text-primary uppercase">Nueva consignación</h1>
      </div>

      {/* Type selector */}
      <div>
        <label className="block text-xs text-gray-mid font-body mb-2">Tipo</label>
        <div className="flex gap-2">
          {(["dada", "recibida"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 text-sm font-body rounded border transition-colors ${
                type === t ? "bg-primary text-secondary border-primary" : "border-border text-gray-mid hover:border-primary"
              }`}
            >
              {t === "dada" ? "Dada (damos productos)" : "Recibida (nos dan productos)"}
            </button>
          ))}
        </div>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label={type === "dada" ? "Consignatario (nombre)*" : "Consignante (nombre)*"}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder={type === "dada" ? "Quién recibe los productos" : "Quién nos entrega los productos"}
          required
        />
        <Input
          label="Teléfono / Contacto"
          value={contactInfo}
          onChange={(e) => setContactInfo(e.target.value)}
          placeholder="Opcional"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Fecha de entrega" type="date" value={dateGiven} onChange={(e) => setDateGiven(e.target.value)} required />
        <Input label="Fecha de vencimiento" type="date" value={dateDue} onChange={(e) => setDateDue(e.target.value)} />
      </div>

      {/* Product search */}
      <div className="space-y-2">
        <label className="block text-xs text-gray-mid font-body">Productos</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-mid" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full text-sm border border-border rounded pl-9 pr-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {search && filteredPresentations.length > 0 && (
          <div className="border border-border rounded divide-y divide-border max-h-48 overflow-y-auto">
            {filteredPresentations.slice(0, 20).map((p: Presentation) => (
              <button
                key={p.id}
                onClick={() => addItem(p)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-light transition-colors text-left"
              >
                <span className="text-sm font-body text-primary">{p.products?.name} — {p.name}</span>
                <span className="text-xs text-gray-mid font-body">{formatCurrency(p.sale_price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.presentation_id} className="bg-secondary border border-border rounded p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body font-semibold text-primary truncate">{item.product_name} — {item.presentation_name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.presentation_id, "quantity", parseInt(e.target.value) || 1)}
                    className="w-full text-sm border border-border rounded px-2 py-1 font-body focus:outline-none focus:ring-1 focus:ring-primary text-center"
                    title="Cantidad"
                  />
                </div>
                <span className="text-xs text-gray-mid font-body">×</span>
                <div className="w-24">
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.presentation_id, "unit_price", parseFloat(e.target.value) || 0)}
                    className="w-full text-sm border border-border rounded px-2 py-1 font-body focus:outline-none focus:ring-1 focus:ring-primary text-right"
                    title="Precio unitario"
                  />
                </div>
                <span className="text-xs font-body font-semibold text-primary w-20 text-right">
                  {formatCurrency(item.quantity * item.unit_price)}
                </span>
                <button onClick={() => removeItem(item.presentation_id)} className="text-gray-mid hover:text-error transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm font-body font-semibold text-primary border-t border-border pt-2">
            <span>Total consignado</span>
            <span>{formatCurrency(totalValue)}</span>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="border-2 border-dashed border-border rounded p-6 text-center">
          <Plus className="w-6 h-6 text-gray-mid mx-auto mb-2" />
          <p className="text-sm text-gray-mid font-body">Busca y agrega productos arriba</p>
        </div>
      )}

      <Input
        label="Notas"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Observaciones (opcional)"
      />

      {error && <p className="text-xs text-error font-body">{error}</p>}

      <Button className="w-full" loading={isPending} onClick={handleSubmit}>
        Crear consignación
      </Button>
    </div>
  );
}
