"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Package, TrendingDown, AlertTriangle, Search, History, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { adjustStock, getAdjustmentHistory } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InventarioItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HistoryEntry = any;

const REASONS = [
  { value: "conteo_fisico", label: "Conteo físico" },
  { value: "dano", label: "Daño / merma" },
  { value: "vencimiento", label: "Vencimiento" },
  { value: "robo", label: "Robo / extravío" },
  { value: "devolucion", label: "Devolución recibida" },
  { value: "correccion", label: "Corrección de error" },
  { value: "otro", label: "Otro" },
];

const REASON_LABELS: Record<string, string> = Object.fromEntries(
  REASONS.map((r) => [r.value, r.label])
);

type StockFilter = "todos" | "ok" | "bajo" | "critico";

function getStockStatus(stock: number, minStock: number): "ok" | "bajo" | "critico" {
  if (stock <= 0) return "critico";
  if (stock <= minStock) return "bajo";
  return "ok";
}

function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  const status = getStockStatus(stock, minStock);
  if (status === "critico")
    return <Badge variant="error">Sin stock</Badge>;
  if (status === "bajo")
    return <Badge variant="warning">Stock bajo</Badge>;
  return <Badge variant="success">OK</Badge>;
}

interface AdjustModalProps {
  item: InventarioItem;
  onClose: () => void;
  onSuccess: (itemId: string, newStock: number) => void;
}

function AdjustModal({ item, onClose, onSuccess }: AdjustModalProps) {
  const [type, setType] = useState<"entrada" | "salida">("entrada");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const quantity = parseInt(qty, 10);
    if (!quantity || quantity <= 0) {
      setError("Ingresa una cantidad válida mayor a 0");
      return;
    }
    if (!reason) {
      setError("Selecciona un motivo");
      return;
    }
    startTransition(async () => {
      const quantityChange = type === "entrada" ? quantity : -quantity;
      const result = await adjustStock({
        presentation_id: item.id,
        quantity_change: quantityChange,
        reason,
        notes: notes || null,
      });
      if (!result.success) {
        setError(result.error ?? "Error al ajustar stock");
        return;
      }
      onSuccess(item.id, result.newStock!);
      onClose();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product info */}
      <div className="bg-gray-light rounded p-3">
        <p className="text-sm font-medium text-primary">{item.product_name}</p>
        <p className="text-xs text-gray-mid">{item.name}</p>
        <p className="text-xs text-gray-mid mt-1">
          Stock actual: <span className="font-semibold text-primary">{item.stock}</span> unidades
        </p>
      </div>

      {/* Type toggle */}
      <div>
        <p className="text-sm font-medium text-primary mb-2">Tipo de ajuste</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("entrada")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded border text-sm font-medium transition-colors ${
              type === "entrada"
                ? "bg-success/10 border-success/40 text-success"
                : "border-border text-gray-mid hover:bg-gray-light"
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Entrada
          </button>
          <button
            type="button"
            onClick={() => setType("salida")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded border text-sm font-medium transition-colors ${
              type === "salida"
                ? "bg-error/10 border-error/40 text-error"
                : "border-border text-gray-mid hover:bg-gray-light"
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Salida
          </button>
        </div>
      </div>

      {/* Quantity */}
      <Input
        id="qty"
        label="Cantidad"
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="0"
        required
      />

      {/* Reason */}
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-primary mb-1">
          Motivo
        </label>
        <select
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-border rounded px-3 py-2 text-sm bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          <option value="">Selecciona un motivo…</option>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-primary mb-1">
          Notas <span className="font-normal text-gray-mid">(opcional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Detalles adicionales…"
          className="w-full border border-border rounded px-3 py-2 text-sm bg-secondary text-primary placeholder-gray-mid focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar ajuste"}
        </Button>
      </div>
    </form>
  );
}

interface HistoryModalProps {
  item: InventarioItem;
  onClose: () => void;
}

function HistoryModal({ item, onClose }: HistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdjustmentHistory(item.id).then(({ history: h }) => {
      setHistory(h);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="bg-gray-light rounded p-3">
        <p className="text-sm font-medium text-primary">{item.product_name}</p>
        <p className="text-xs text-gray-mid">{item.name}</p>
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (!history || history.length === 0) && (
        <p className="text-sm text-gray-mid text-center py-4">Sin ajustes registrados</p>
      )}

      {!loading && history && history.length > 0 && (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {history.map((entry: HistoryEntry) => (
            <div key={entry.id} className="border border-border rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-semibold ${
                    entry.quantity_change > 0 ? "text-success" : "text-error"
                  }`}
                >
                  {entry.quantity_change > 0 ? "+" : ""}
                  {entry.quantity_change} unidades
                </span>
                <span className="text-xs text-gray-mid">
                  {formatDateTime(entry.created_at)}
                </span>
              </div>
              <p className="text-xs text-primary">
                {REASON_LABELS[entry.reason] ?? entry.reason}
              </p>
              {entry.notes && (
                <p className="text-xs text-gray-mid">{entry.notes}</p>
              )}
              {entry.adjusted_by_name && (
                <p className="text-xs text-gray-mid">Por: {entry.adjusted_by_name}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Button variant="secondary" className="w-full" onClick={onClose}>
        Cerrar
      </Button>
    </div>
  );
}

interface InventarioClientProps {
  items: InventarioItem[];
  categories: { id: string; name: string }[];
}

export function InventarioClient({ items: initialItems, categories }: InventarioClientProps) {
  const [items, setItems] = useState<InventarioItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [stockFilter, setStockFilter] = useState<StockFilter>("todos");
  const [adjustItem, setAdjustItem] = useState<InventarioItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventarioItem | null>(null);

  const stats = useMemo(() => {
    const total = items.filter((i) => i.is_active && i.product_active).length;
    const bajo = items.filter((i) => i.is_active && i.product_active && getStockStatus(i.stock, i.min_stock) === "bajo").length;
    const critico = items.filter((i) => i.is_active && i.product_active && getStockStatus(i.stock, i.min_stock) === "critico").length;
    return { total, bajo, critico };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !search ||
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.barcode && item.barcode.includes(search));

      const matchCategory =
        categoryFilter === "todos" || item.category_name === categoryFilter;

      const matchStock =
        stockFilter === "todos" ||
        getStockStatus(item.stock, item.min_stock) === stockFilter;

      return matchSearch && matchCategory && matchStock;
    });
  }, [items, search, categoryFilter, stockFilter]);

  const handleAdjustSuccess = (itemId: string, newStock: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, stock: newStock } : i))
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <h1 className="font-display text-2xl text-primary uppercase">Inventario</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-secondary border border-border rounded p-3 text-center">
          <p className="text-2xl font-display text-primary">{stats.total}</p>
          <p className="text-xs text-gray-mid mt-0.5">SKUs activos</p>
        </div>
        <div className="bg-secondary border border-warning/30 rounded p-3 text-center">
          <p className="text-2xl font-display text-warning">{stats.bajo}</p>
          <p className="text-xs text-gray-mid mt-0.5">Stock bajo</p>
        </div>
        <div className="bg-secondary border border-error/30 rounded p-3 text-center">
          <p className="text-2xl font-display text-error">{stats.critico}</p>
          <p className="text-xs text-gray-mid mt-0.5">Sin stock</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-mid pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar producto, presentación o código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-border rounded text-sm bg-secondary text-primary placeholder-gray-mid focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-border rounded px-3 py-2 text-sm bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="todos">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          className="border border-border rounded px-3 py-2 text-sm bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="todos">Todo el stock</option>
          <option value="ok">OK</option>
          <option value="bajo">Stock bajo</option>
          <option value="critico">Sin stock</option>
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <EmptyState
          icon={Package}
          title="Sin resultados"
          description="Prueba cambiando los filtros de búsqueda."
        />
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <>
          <div className="hidden md:block bg-secondary border border-border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-light">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Presentación</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Mínimo</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">Costo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-mid uppercase tracking-wide">PVP</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item: InventarioItem) => (
                  <tr key={item.id} className="hover:bg-gray-light/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">{item.product_name}</p>
                      {item.product_brand && (
                        <p className="text-xs text-gray-mid">{item.product_brand}</p>
                      )}
                      {item.category_name && (
                        <p className="text-xs text-gray-mid">{item.category_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-primary">{item.name}</p>
                      {item.barcode && (
                        <p className="text-xs text-gray-mid font-mono">{item.barcode}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-lg font-semibold ${
                          getStockStatus(item.stock, item.min_stock) === "critico"
                            ? "text-error"
                            : getStockStatus(item.stock, item.min_stock) === "bajo"
                            ? "text-warning"
                            : "text-primary"
                        }`}
                      >
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-mid">{item.min_stock}</td>
                    <td className="px-4 py-3 text-center">
                      <StockBadge stock={item.stock} minStock={item.min_stock} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-mid">{formatCurrency(item.cost_price)}</td>
                    <td className="px-4 py-3 text-right font-medium text-primary">{formatCurrency(item.sale_price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setHistoryItem(item)}
                          className="p-1.5 rounded hover:bg-gray-light text-gray-mid hover:text-primary transition-colors"
                          title="Ver historial"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <Button size="sm" variant="secondary" onClick={() => setAdjustItem(item)}>
                          Ajustar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((item: InventarioItem) => (
              <div key={item.id} className="bg-secondary border border-border rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-primary text-sm truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-mid">{item.name}</p>
                    {item.category_name && (
                      <p className="text-xs text-gray-mid">{item.category_name}</p>
                    )}
                  </div>
                  <StockBadge stock={item.stock} minStock={item.min_stock} />
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-center border-t border-border pt-2">
                  <div>
                    <p
                      className={`text-xl font-display ${
                        getStockStatus(item.stock, item.min_stock) === "critico"
                          ? "text-error"
                          : getStockStatus(item.stock, item.min_stock) === "bajo"
                          ? "text-warning"
                          : "text-primary"
                      }`}
                    >
                      {item.stock}
                    </p>
                    <p className="text-[10px] text-gray-mid">Stock</p>
                  </div>
                  <div>
                    <p className="text-xl font-display text-gray-mid">{item.min_stock}</p>
                    <p className="text-[10px] text-gray-mid">Mínimo</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">{formatCurrency(item.sale_price)}</p>
                    <p className="text-[10px] text-gray-mid">PVP</p>
                  </div>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setHistoryItem(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-border text-xs text-gray-mid hover:bg-gray-light transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    Historial
                  </button>
                  <Button size="sm" className="flex-1" onClick={() => setAdjustItem(item)}>
                    Ajustar stock
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-mid text-right">
            {filtered.length} {filtered.length === 1 ? "presentación" : "presentaciones"}
          </p>
        </>
      )}

      {/* Adjust modal */}
      <Modal
        isOpen={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        title="Ajustar stock"
      >
        {adjustItem && (
          <AdjustModal
            item={adjustItem}
            onClose={() => setAdjustItem(null)}
            onSuccess={handleAdjustSuccess}
          />
        )}
      </Modal>

      {/* History modal */}
      <Modal
        isOpen={!!historyItem}
        onClose={() => setHistoryItem(null)}
        title="Historial de ajustes"
      >
        {historyItem && (
          <HistoryModal
            item={historyItem}
            onClose={() => setHistoryItem(null)}
          />
        )}
      </Modal>
    </div>
  );
}
