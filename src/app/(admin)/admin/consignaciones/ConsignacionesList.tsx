"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Package, ChevronDown, ChevronUp, Plus } from "lucide-react";
import Link from "next/link";
import { updateConsignacionStatus, updateConsignacionItem } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Consignacion = any;

const STATUS_LABELS: Record<string, string> = {
  activa: "Activa",
  liquidada: "Liquidada",
  cancelada: "Cancelada",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "outline"> = {
  activa: "warning",
  liquidada: "success",
  cancelada: "error",
};

const TYPE_LABELS: Record<string, string> = {
  dada: "Dada",
  recibida: "Recibida",
};

interface ConsignacionesListProps {
  consignaciones: Consignacion[];
}

export function ConsignacionesList({ consignaciones: initial }: ConsignacionesListProps) {
  const [consignaciones, setConsignaciones] = useState<Consignacion[]>(initial);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemSold, setItemSold] = useState("");
  const [itemReturned, setItemReturned] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = consignaciones.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    return true;
  });

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      const res = await updateConsignacionStatus({ consignment_id: id, status });
      if (res.success) {
        setConsignaciones((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      }
    });
  };

  const handleEditItem = (item: Consignacion) => {
    setEditingItem(item.id);
    setItemSold(String(item.quantity_sold));
    setItemReturned(String(item.quantity_returned));
    setFormError(null);
  };

  const handleSaveItem = (itemId: string) => {
    startTransition(async () => {
      const res = await updateConsignacionItem({
        item_id: itemId,
        quantity_sold: parseInt(itemSold) || 0,
        quantity_returned: parseInt(itemReturned) || 0,
      });
      if (res.success) {
        setEditingItem(null);
        setConsignaciones((prev) => prev.map((c) => ({
          ...c,
          consignment_items: c.consignment_items?.map((item: Consignacion) =>
            item.id === itemId
              ? { ...item, quantity_sold: parseInt(itemSold) || 0, quantity_returned: parseInt(itemReturned) || 0 }
              : item
          ),
        })));
      } else {
        setFormError(res.error ?? "Error.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary uppercase">Consignaciones</h1>
        <Link href="/admin/consignaciones/nueva">
          <Button size="sm"><Plus className="w-4 h-4" /> Nueva</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {["all", "activa", "liquidada", "cancelada"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-body rounded border transition-colors ${
                statusFilter === s ? "bg-primary text-secondary border-primary" : "border-border text-gray-mid hover:border-primary"
              }`}
            >
              {s === "all" ? "Todas" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "dada", "recibida"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-body rounded border transition-colors ${
                typeFilter === t ? "bg-primary text-secondary border-primary" : "border-border text-gray-mid hover:border-primary"
              }`}
            >
              {t === "all" ? "Todos los tipos" : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="Sin consignaciones" description="No hay consignaciones con ese filtro." />
      ) : (
        <div className="space-y-2">
          {filtered.map((c: Consignacion) => {
            const contactName = c.type === "dada" ? c.consignee_name : c.consigner_name;
            const contactInfo = c.type === "dada" ? c.consignee_contact : c.consigner_contact;
            const totalValue = c.consignment_items?.reduce(
              (acc: number, item: Consignacion) => acc + item.quantity_given * item.unit_price,
              0
            ) ?? 0;
            const soldValue = c.consignment_items?.reduce(
              (acc: number, item: Consignacion) => acc + item.quantity_sold * item.unit_price,
              0
            ) ?? 0;

            return (
              <div key={c.id} className="bg-secondary border border-border rounded overflow-hidden">
                <button
                  className="w-full flex items-start md:items-center justify-between p-4 hover:bg-gray-light transition-colors text-left gap-3"
                  onClick={() => setExpanded((prev) => prev === c.id ? null : c.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={c.type === "dada" ? "default" : "outline"} className="text-[10px]">
                        {TYPE_LABELS[c.type]}
                      </Badge>
                      <Badge variant={(STATUS_VARIANT[c.status] ?? "outline") as "default" | "success" | "warning" | "error" | "info" | "outline"}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </Badge>
                      {contactName && (
                        <span className="text-xs font-body font-semibold text-primary">{contactName}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-mid font-body">
                      <span>{formatDate(c.date_given)}</span>
                      {c.date_due && <span>Vence: {formatDate(c.date_due)}</span>}
                      {contactInfo && <span>{contactInfo}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-mid font-body">Vendido</p>
                      <p className="font-body font-semibold text-primary text-sm">{formatCurrency(soldValue)}</p>
                    </div>
                    {expanded === c.id ? <ChevronUp className="w-4 h-4 text-gray-mid" /> : <ChevronDown className="w-4 h-4 text-gray-mid" />}
                  </div>
                </button>

                {expanded === c.id && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Items */}
                    <div className="space-y-3">
                      <p className="text-xs font-body font-semibold text-gray-mid uppercase tracking-wide">Productos</p>
                      {c.consignment_items?.map((item: Consignacion) => {
                        const pres = item.product_presentation;
                        const remaining = item.quantity_given - item.quantity_sold - item.quantity_returned;
                        return (
                          <div key={item.id} className="space-y-2">
                            <div className="flex items-start justify-between gap-2 text-xs font-body">
                              <div className="flex-1 min-w-0">
                                <p className="text-primary font-semibold truncate">
                                  {pres?.products?.name} — {pres?.name}
                                </p>
                                <p className="text-gray-mid">
                                  Dado: {item.quantity_given} · Vendido: {item.quantity_sold} · Dev: {item.quantity_returned} · Pendiente: {remaining}
                                </p>
                                <p className="text-gray-mid">{formatCurrency(item.unit_price)} c/u · Subtotal: {formatCurrency(item.quantity_given * item.unit_price)}</p>
                              </div>
                              {c.status === "activa" && (
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="text-xs text-primary border border-primary rounded px-2 py-1 hover:bg-primary hover:text-secondary transition-colors shrink-0"
                                >
                                  Actualizar
                                </button>
                              )}
                            </div>
                            {editingItem === item.id && (
                              <div className="bg-gray-light rounded p-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-mid font-body mb-1">Vendido</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={item.quantity_given}
                                      value={itemSold}
                                      onChange={(e) => setItemSold(e.target.value)}
                                      className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-mid font-body mb-1">Devuelto</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={item.quantity_given}
                                      value={itemReturned}
                                      onChange={(e) => setItemReturned(e.target.value)}
                                      className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                </div>
                                {formError && <p className="text-xs text-error font-body">{formError}</p>}
                                <div className="flex gap-2">
                                  <Button size="sm" loading={isPending} onClick={() => handleSaveItem(item.id)}>Guardar</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>Cancelar</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-border pt-2 flex justify-between text-xs font-body text-gray-mid">
                      <span>Total consignado</span>
                      <span className="font-semibold text-primary">{formatCurrency(totalValue)}</span>
                    </div>

                    {c.notes && (
                      <p className="text-xs font-body text-gray-mid bg-gray-light rounded p-2">{c.notes}</p>
                    )}

                    {/* Status actions */}
                    {c.status === "activa" && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          loading={isPending}
                          onClick={() => handleStatusChange(c.id, "liquidada")}
                        >
                          Liquidar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={isPending}
                          onClick={() => handleStatusChange(c.id, "cancelada")}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
