"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Truck, ChevronDown, ChevronUp, Plus, MapPin, Phone } from "lucide-react";
import { updateEnvioStatus, createEnvio } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Shipment = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PendingOrder = any;

const STATUS_LABELS: Record<string, string> = {
  preparando: "Preparando",
  en_camino: "En camino",
  entregado: "Entregado",
  devuelto: "Devuelto",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "outline"> = {
  preparando: "default",
  en_camino: "warning",
  entregado: "success",
  devuelto: "error",
};

const NEXT_STATUS: Record<string, string> = {
  preparando: "en_camino",
  en_camino: "entregado",
  entregado: "devuelto",
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  preparando: "Marcar en camino",
  en_camino: "Marcar entregado",
  entregado: "Marcar devuelto",
};

const TYPE_LABELS: Record<string, string> = {
  repartidor_propio: "Repartidor propio",
  empresa_tercera: "Empresa tercera",
};

interface EnviosListProps {
  shipments: Shipment[];
  pendingOrders: PendingOrder[];
}

export function EnviosList({ shipments: initialShipments, pendingOrders }: EnviosListProps) {
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateTracking, setUpdateTracking] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    order_id: "",
    shipment_type: "repartidor_propio" as "repartidor_propio" | "empresa_tercera",
    carrier_name: "",
    tracking_number: "",
    shipping_cost: "",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = shipments.filter((s) => statusFilter === "all" || s.status === statusFilter);

  const handleAdvanceStatus = (shipment: Shipment) => {
    setUpdatingId(shipment.id);
    setUpdateTracking(shipment.tracking_number ?? "");
    setUpdateNotes("");
    setFormError(null);
  };

  const handleConfirmUpdate = (shipment: Shipment) => {
    const nextStatus = NEXT_STATUS[shipment.status];
    if (!nextStatus) return;

    startTransition(async () => {
      const res = await updateEnvioStatus({
        shipment_id: shipment.id,
        status: nextStatus,
        tracking_number: updateTracking || null,
        notes: updateNotes || null,
      });
      if (res.success) {
        setUpdatingId(null);
        setShipments((prev) => prev.map((s) =>
          s.id === shipment.id ? {
            ...s,
            status: nextStatus,
            tracking_number: updateTracking || s.tracking_number,
            shipped_at: nextStatus === "en_camino" ? new Date().toISOString() : s.shipped_at,
            delivered_at: nextStatus === "entregado" ? new Date().toISOString() : s.delivered_at,
          } : s
        ));
      } else {
        setFormError(res.error ?? "Error al actualizar.");
      }
    });
  };

  const handleCreate = () => {
    if (!createForm.order_id) {
      setFormError("Selecciona un pedido.");
      return;
    }
    if (!createForm.carrier_name) {
      setFormError("Ingresa el nombre del transportista.");
      return;
    }
    setFormError(null);

    startTransition(async () => {
      const res = await createEnvio({
        order_id: createForm.order_id,
        shipment_type: createForm.shipment_type,
        carrier_name: createForm.carrier_name,
        tracking_number: createForm.tracking_number || null,
        shipping_cost: parseFloat(createForm.shipping_cost) || 0,
        notes: createForm.notes || null,
      });
      if (res.success) {
        setShowCreateForm(false);
        setCreateForm({ order_id: "", shipment_type: "repartidor_propio", carrier_name: "", tracking_number: "", shipping_cost: "", notes: "" });
        window.location.reload();
      } else {
        setFormError(res.error ?? "Error.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary uppercase">Envíos</h1>
        <Button size="sm" onClick={() => { setShowCreateForm(true); setFormError(null); }}>
          <Plus className="w-4 h-4" /> Nuevo envío
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "preparando", "en_camino", "entregado", "devuelto"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs font-body rounded border transition-colors ${
              statusFilter === s ? "bg-primary text-secondary border-primary" : "border-border text-gray-mid hover:border-primary"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Truck} title="Sin envíos" description="No hay envíos con ese filtro." />
      ) : (
        <div className="space-y-2">
          {filtered.map((s: Shipment) => {
            const customer = s.order?.customer;
            const address = s.order?.address;

            return (
              <div key={s.id} className="bg-secondary border border-border rounded overflow-hidden">
                <button
                  className="w-full flex items-start md:items-center justify-between p-4 hover:bg-gray-light transition-colors text-left gap-3"
                  onClick={() => setExpanded((prev) => prev === s.id ? null : s.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={(STATUS_VARIANT[s.status] ?? "outline") as "default" | "success" | "warning" | "error" | "info" | "outline"}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[s.shipment_type] ?? s.shipment_type}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-mid font-body">
                      {customer && (
                        <span className="font-semibold text-primary">{customer.full_name}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {s.carrier_name}
                      </span>
                      {s.tracking_number && <span>#{s.tracking_number}</span>}
                      <span>{formatDate(s.created_at)}</span>
                    </div>
                  </div>
                  {expanded === s.id ? <ChevronUp className="w-4 h-4 text-gray-mid shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-mid shrink-0" />}
                </button>

                {expanded === s.id && (
                  <div className="border-t border-border p-4 space-y-3">
                    {/* Address */}
                    {address && (
                      <div className="text-xs font-body text-gray-mid space-y-0.5">
                        <p className="flex items-center gap-1 font-semibold text-primary">
                          <MapPin className="w-3.5 h-3.5" /> {address.label}
                        </p>
                        <p>{address.full_address}</p>
                        <p>{address.municipality}, {address.department}</p>
                      </div>
                    )}
                    {customer?.phone && (
                      <p className="text-xs font-body text-gray-mid flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        <a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} className="hover:text-primary transition-colors">{customer.phone}</a>
                      </p>
                    )}

                    {/* Timestamps */}
                    <div className="text-xs font-body text-gray-mid space-y-0.5">
                      {s.shipped_at && <p>Enviado: {formatDate(s.shipped_at)}</p>}
                      {s.delivered_at && <p>Entregado: {formatDate(s.delivered_at)}</p>}
                    </div>

                    {s.notes && (
                      <p className="text-xs font-body text-gray-mid bg-gray-light rounded p-2">{s.notes}</p>
                    )}

                    {/* Advance status */}
                    {NEXT_STATUS[s.status] && (
                      <div>
                        {updatingId === s.id ? (
                          <div className="space-y-2">
                            {(s.status === "preparando") && (
                              <Input
                                label="Número de tracking (opcional)"
                                value={updateTracking}
                                onChange={(e) => setUpdateTracking(e.target.value)}
                                placeholder="Ej: GT123456"
                              />
                            )}
                            <input
                              type="text"
                              value={updateNotes}
                              onChange={(e) => setUpdateNotes(e.target.value)}
                              placeholder="Notas (opcional)"
                              className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {formError && <p className="text-xs text-error font-body">{formError}</p>}
                            <div className="flex gap-2">
                              <Button size="sm" loading={isPending} onClick={() => handleConfirmUpdate(s)}>
                                {NEXT_STATUS_LABEL[s.status]}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setUpdatingId(null)}>Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => handleAdvanceStatus(s)}>
                            {NEXT_STATUS_LABEL[s.status]}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create shipment modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setShowCreateForm(false)} />
          <div className="relative z-10 w-full md:max-w-lg bg-secondary rounded-t-2xl md:rounded-lg md:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-secondary border-b border-border p-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-primary">Nuevo envío</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-mid hover:text-primary text-xl">×</button>
            </div>
            <div className="p-4 space-y-3">
              {/* Order selector */}
              <div>
                <label className="block text-xs text-gray-mid font-body mb-1">Pedido *</label>
                <select
                  value={createForm.order_id}
                  onChange={(e) => setCreateForm((p) => ({ ...p, order_id: e.target.value }))}
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
                >
                  <option value="">Seleccionar pedido...</option>
                  {pendingOrders.map((o: PendingOrder) => (
                    <option key={o.id} value={o.id}>
                      #{o.id.slice(-8).toUpperCase()} — {o.customer?.full_name ?? "Sin nombre"} ({formatDate(o.created_at)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-gray-mid font-body mb-1">Tipo de envío</label>
                <div className="flex gap-2">
                  {(["repartidor_propio", "empresa_tercera"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCreateForm((p) => ({ ...p, shipment_type: t }))}
                      className={`flex-1 px-3 py-2 text-xs font-body rounded border transition-colors ${
                        createForm.shipment_type === t ? "bg-primary text-secondary border-primary" : "border-border text-gray-mid hover:border-primary"
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Transportista / Repartidor *"
                value={createForm.carrier_name}
                onChange={(e) => setCreateForm((p) => ({ ...p, carrier_name: e.target.value }))}
                placeholder={createForm.shipment_type === "repartidor_propio" ? "Ej: Juan, Pedro..." : "Ej: Cargo Express, Guatex..."}
                required
              />
              <Input
                label="Número de tracking"
                value={createForm.tracking_number}
                onChange={(e) => setCreateForm((p) => ({ ...p, tracking_number: e.target.value }))}
                placeholder="Opcional"
              />
              <Input
                label="Costo de envío (Q)"
                type="number"
                min={0}
                value={createForm.shipping_cost}
                onChange={(e) => setCreateForm((p) => ({ ...p, shipping_cost: e.target.value }))}
                placeholder="0.00"
              />
              <input
                type="text"
                value={createForm.notes}
                onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notas (opcional)"
                className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
              />

              {formError && <p className="text-xs text-error font-body">{formError}</p>}
              <div className="flex gap-2">
                <Button className="flex-1" loading={isPending} onClick={handleCreate}>Crear envío</Button>
                <Button variant="ghost" onClick={() => setShowCreateForm(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
