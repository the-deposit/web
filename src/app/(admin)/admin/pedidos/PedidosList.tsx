"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ChevronDown, ChevronUp, ClipboardList, Package, Truck,
  Store, MapPin, User, Clock
} from "lucide-react";
import { updateOrderStatus } from "./actions";
import type { OrderStatus, DeliveryMethod } from "@/lib/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = any;

const STATUS_LABELS: Record<OrderStatus, string> = {
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

const STATUS_COLOR: Record<OrderStatus, string> = {
  pendiente: "bg-warning/10 text-warning border-warning/20",
  revisado: "bg-info/10 text-info border-info/20",
  confirmado: "bg-info/10 text-info border-info/20",
  en_preparacion: "bg-info/10 text-info border-info/20",
  enviado: "bg-info/10 text-info border-info/20",
  entregado: "bg-success/10 text-success border-success/20",
  cancelado: "bg-error/10 text-error border-error/20",
  listo_para_recoger: "bg-success/10 text-success border-success/20",
  recogido: "bg-success/10 text-success border-success/20",
};

// Next statuses for each flow
const NEXT_STATUS_ENVIO: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  pendiente: { next: "revisado", label: "Marcar revisado" },
  revisado: { next: "confirmado", label: "Confirmar pedido" },
  confirmado: { next: "en_preparacion", label: "Iniciar preparación" },
  en_preparacion: { next: "enviado", label: "Marcar como enviado" },
  enviado: { next: "entregado", label: "Marcar entregado" },
};

const NEXT_STATUS_RECOGIDA: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  pendiente: { next: "revisado", label: "Marcar revisado" },
  revisado: { next: "confirmado", label: "Confirmar pedido" },
  confirmado: { next: "en_preparacion", label: "Iniciar preparación" },
  en_preparacion: { next: "listo_para_recoger", label: "Listo para recoger" },
  listo_para_recoger: { next: "recogido", label: "Marcar recogido" },
};

interface PedidosListProps {
  orders: Order[];
}

export function PedidosList({ orders: initialOrders }: PedidosListProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [confirmingAction, setConfirmingAction] = useState<{
    orderId: string;
    status: OrderStatus;
    label: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (deliveryFilter !== "all" && o.delivery_method !== deliveryFilter) return false;
    return true;
  });

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    startTransition(async () => {
      const res = await updateOrderStatus({ orderId, status });
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
      }
    });
    setConfirmingAction(null);
  };

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No hay pedidos"
        description="Los pedidos de la tienda en línea aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-border rounded px-3 py-1.5 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={deliveryFilter}
          onChange={(e) => setDeliveryFilter(e.target.value)}
          className="text-sm border border-border rounded px-3 py-1.5 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
        >
          <option value="all">Todo tipo</option>
          <option value="envio">Envío a domicilio</option>
          <option value="recoger_en_tienda">Recoger en tienda</option>
        </select>
        <span className="text-sm text-gray-mid font-body self-center">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Orders list */}
      <div className="space-y-2">
        {filteredOrders.map((order) => {
          const isShipping = order.delivery_method === "envio";
          const nextStatusMap = isShipping ? NEXT_STATUS_ENVIO : NEXT_STATUS_RECOGIDA;
          const nextAction = nextStatusMap[order.status as OrderStatus];

          return (
            <div key={order.id} className="bg-secondary border border-border rounded overflow-hidden">
              {/* Header */}
              <button
                className="w-full flex items-start md:items-center justify-between p-4 hover:bg-gray-light transition-colors text-left gap-3"
                onClick={() => setExpanded((prev) => (prev === order.id ? null : order.id))}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-body text-gray-mid">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-body font-medium rounded border ${STATUS_COLOR[order.status as OrderStatus] ?? ""}`}>
                      {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-body rounded border border-border ${
                      isShipping ? "text-info" : "text-gray-mid"
                    }`}>
                      {isShipping ? <Truck className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                      {isShipping ? "Envío" : "Recoger"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-mid font-body">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {order.customer?.full_name ?? order.customer?.email ?? "Cliente"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(order.created_at)}
                    </span>
                  </div>
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

              {/* Expanded */}
              {expanded === order.id && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Items */}
                  <div className="space-y-2">
                    <p className="text-xs font-body font-semibold text-gray-mid uppercase tracking-wide">
                      Productos
                    </p>
                    {order.order_items?.map((item: Order) => {
                      const pres = item.product_presentations;
                      const prod = pres?.products;
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-light border border-border overflow-hidden shrink-0">
                            {prod?.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={prod.images[0].replace("/upload/", "/upload/w_50,h_50,c_fill/")}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-3 h-3 text-border" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-body font-medium text-primary truncate">
                              {prod?.name}
                            </p>
                            <p className="text-xs text-gray-mid font-body">
                              {pres?.name} × {item.quantity}
                            </p>
                          </div>
                          <span className="text-xs font-body font-semibold text-primary shrink-0">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Customer info */}
                  <div className="space-y-2">
                    <p className="text-xs font-body font-semibold text-gray-mid uppercase tracking-wide">
                      Cliente
                    </p>
                    <div className="bg-gray-light rounded p-3 text-xs font-body text-gray-mid space-y-0.5">
                      <p className="text-primary font-medium">{order.customer?.full_name ?? "–"}</p>
                      <p>{order.customer?.email}</p>
                      {order.customer?.phone && <p>{order.customer.phone}</p>}
                    </div>
                  </div>

                  {/* Delivery info */}
                  {isShipping && order.address && (
                    <div className="space-y-2">
                      <p className="text-xs font-body font-semibold text-gray-mid uppercase tracking-wide flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Dirección de envío
                      </p>
                      <div className="bg-gray-light rounded p-3 text-xs font-body text-gray-mid">
                        <p className="text-primary font-medium">{order.address.label}</p>
                        <p>{order.address.full_address}</p>
                        {order.address.reference && <p>{order.address.reference}</p>}
                      </div>
                    </div>
                  )}

                  {/* Customer notes */}
                  {order.notes_customer && (
                    <div>
                      <p className="text-xs font-body font-semibold text-gray-mid uppercase tracking-wide mb-1">
                        Notas del cliente
                      </p>
                      <p className="text-xs font-body text-gray-mid bg-gray-light rounded p-2">
                        {order.notes_customer}
                      </p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between text-sm font-body font-semibold text-primary border-t border-border pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>

                  {/* Action buttons */}
                  {order.status !== "cancelado" &&
                    order.status !== "entregado" &&
                    order.status !== "recogido" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {nextAction && (
                          <Button
                            size="sm"
                            loading={isPending}
                            onClick={() =>
                              setConfirmingAction({
                                orderId: order.id,
                                status: nextAction.next,
                                label: nextAction.label,
                              })
                            }
                          >
                            {nextAction.label}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          loading={isPending}
                          onClick={() =>
                            setConfirmingAction({
                              orderId: order.id,
                              status: "cancelado",
                              label: "Cancelar pedido",
                            })
                          }
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

      <ConfirmDialog
        isOpen={!!confirmingAction}
        onClose={() => setConfirmingAction(null)}
        onConfirm={() =>
          confirmingAction &&
          handleStatusUpdate(confirmingAction.orderId, confirmingAction.status)
        }
        title={confirmingAction?.label ?? ""}
        message={
          confirmingAction?.status === "cancelado"
            ? "¿Cancelar este pedido? El cliente será notificado."
            : confirmingAction?.status === "entregado" || confirmingAction?.status === "recogido"
            ? "Esto convertirá el pedido en una venta y decrementará el inventario. ¿Continuar?"
            : `¿Cambiar estado a "${STATUS_LABELS[confirmingAction?.status as OrderStatus] ?? ""}"?`
        }
        confirmLabel={confirmingAction?.label ?? "Confirmar"}
        variant={confirmingAction?.status === "cancelado" ? "danger" : "primary"}
      />
    </div>
  );
}
