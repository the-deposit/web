"use client";

import { useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ClipboardList, ChevronDown, ChevronUp, Package } from "lucide-react";
import { cancelOrder } from "../checkout/actions";
import type { OrderStatus, DeliveryMethod } from "@/lib/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = any;

function statusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pendiente: "Pendiente",
    revisado: "Revisado",
    confirmado: "Confirmado",
    en_preparacion: "En preparación",
    enviado: "Enviado",
    entregado: "Entregado",
    cancelado: "Cancelado",
    listo_para_recoger: "Listo para recoger",
    recogido: "Recogido",
  };
  return map[status] ?? status;
}

function statusColor(status: OrderStatus): string {
  if (status === "cancelado") return "bg-error/10 text-error border-error/20";
  if (status === "entregado" || status === "recogido") return "bg-success/10 text-success border-success/20";
  if (status === "listo_para_recoger" || status === "enviado") return "bg-info/10 text-info border-info/20";
  return "bg-warning/10 text-warning border-warning/20";
}

function deliveryLabel(method: DeliveryMethod): string {
  return method === "envio" ? "Envío a domicilio" : "Recoger en tienda";
}

export function MisPedidosClient({ orders }: { orders: Order[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  const handleCancel = async (orderId: string) => {
    setLoadingId(orderId);
    const res = await cancelOrder(orderId);
    setLoadingId(null);
    if (res.success) {
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelado" } : o))
      );
    }
    setCancellingId(null);
  };

  if (localOrders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <EmptyState
          icon={ClipboardList}
          title="Aún no tienes pedidos"
          description="Cuando realices un pedido, aparecerá aquí."
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl md:text-3xl text-primary mb-6 uppercase tracking-wide">
        Mis pedidos
      </h1>

      <div className="space-y-3">
        {localOrders.map((order: Order) => (
          <div key={order.id} className="bg-secondary border border-border rounded overflow-hidden">
            {/* Header */}
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-light transition-colors text-left"
              onClick={() => toggle(order.id)}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-body text-gray-mid">
                    #{order.id.slice(-8).toUpperCase()}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-body font-medium rounded border ${statusColor(order.status)}`}
                  >
                    {statusLabel(order.status)}
                  </span>
                  <span className="text-xs font-body text-gray-mid border border-border rounded px-2 py-0.5">
                    {deliveryLabel(order.delivery_method)}
                  </span>
                </div>
                <p className="text-xs text-gray-mid font-body">
                  {formatDateTime(order.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-body font-semibold text-primary text-sm">
                  {formatCurrency(order.total)}
                </span>
                {expanded === order.id ? (
                  <ChevronUp className="w-4 h-4 text-gray-mid" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-mid" />
                )}
              </div>
            </button>

            {/* Expanded detail */}
            {expanded === order.id && (
              <div className="border-t border-border p-4 space-y-4">
                {/* Items */}
                <div className="space-y-2">
                  {order.order_items?.map((item: Order) => {
                    const pres = item.product_presentations;
                    const prod = pres?.products;
                    const imgUrl = prod?.images?.[0]
                      ? prod.images[0].replace("/upload/", "/upload/w_60,h_60,c_fill,f_auto,q_auto/")
                      : null;
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gray-light border border-border overflow-hidden shrink-0">
                          {imgUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-border" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-body font-medium text-primary truncate">
                            {prod?.name ?? "Producto"}
                          </p>
                          <p className="text-xs text-gray-mid font-body">
                            {pres?.name} × {item.quantity}
                          </p>
                        </div>
                        <span className="text-sm font-body text-primary shrink-0">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Delivery info */}
                {order.delivery_method === "recoger_en_tienda" && (
                  <div className="bg-gray-light rounded p-3 text-xs font-body text-gray-mid space-y-0.5">
                    <p className="font-medium text-primary">Recoger en:</p>
                    <p>Calle Real Lote 25, Aldea San Pedro Las Huertas, La Antigua Guatemala</p>
                    <p>WhatsApp: +502 5420-4805</p>
                  </div>
                )}
                {order.delivery_method === "envio" && order.address && (
                  <div className="bg-gray-light rounded p-3 text-xs font-body text-gray-mid space-y-0.5">
                    <p className="font-medium text-primary">Dirección de envío:</p>
                    <p>{order.address.label}: {order.address.full_address}</p>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between text-sm font-body font-semibold text-primary border-t border-border pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>

                {/* Cancel button */}
                {order.status === "pendiente" && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={loadingId === order.id}
                    onClick={() => {
                      setLoadingId(null);
                      setCancellingId(order.id);
                    }}
                  >
                    Cancelar pedido
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!cancellingId}
        onClose={() => setCancellingId(null)}
        onConfirm={() => cancellingId && handleCancel(cancellingId)}
        title="Cancelar pedido"
        message="¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
        variant="danger"
      />
    </div>
  );
}
