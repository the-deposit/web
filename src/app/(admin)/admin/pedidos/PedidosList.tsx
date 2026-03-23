"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ChevronDown, ChevronUp, ClipboardList, Package, Truck,
  Store, MapPin, User, Clock, Pencil, Minus, Plus, Search, X
} from "lucide-react";
import { updateOrderStatus, updateOrderAdmin, searchPresentationsForOrder } from "./actions";
import type { OrderStatus, DeliveryMethod } from "@/lib/supabase/types";

type PaymentMethod = "efectivo" | "tarjeta_credito" | "transferencia" | "consignacion";
type PaymentStatus = "pagado" | "parcial" | "pendiente";

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

interface EditOrderState {
  orderId: string;
  notes_customer: string;
  notes_internal: string;
  customer_nit: string;
  items: { presentation_id: string; quantity: number; unit_price: number; productName: string; presName: string; imgUrl: string | null }[];
  searchQuery: string;
  searchResults: Order[];
  searchLoading: boolean;
}

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
  // Payment modal for closing sale
  const [closingOrder, setClosingOrder] = useState<{ orderId: string; orderTotal: number; status: OrderStatus } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pendiente");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const [editOrder, setEditOrder] = useState<EditOrderState | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (deliveryFilter !== "all" && o.delivery_method !== deliveryFilter) return false;
    return true;
  });

  const handleStatusUpdate = async (orderId: string, status: OrderStatus, paymentData?: {
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    amount_paid: number;
  }) => {
    startTransition(async () => {
      const res = await updateOrderStatus({ orderId, status, ...paymentData });
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
      }
    });
    setConfirmingAction(null);
  };

  const handleCloseAction = (orderId: string, status: OrderStatus, orderTotal: number) => {
    setClosingOrder({ orderId, orderTotal, status });
    setPaymentMethod("transferencia");
    setPaymentStatus("pendiente");
    setAmountPaid(0);
  };

  const handleConfirmClose = () => {
    if (!closingOrder) return;
    const effectiveAmountPaid =
      paymentStatus === "pagado" ? closingOrder.orderTotal :
      paymentStatus === "pendiente" ? 0 :
      amountPaid;
    handleStatusUpdate(closingOrder.orderId, closingOrder.status, {
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      amount_paid: effectiveAmountPaid,
    });
    setClosingOrder(null);
  };

  const openEditOrder = (order: Order) => {
    const items = (order.order_items ?? []).map((item: Order) => {
      const pres = item.product_presentations;
      const prod = pres?.products;
      return {
        presentation_id: pres?.id ?? item.product_presentation_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        productName: prod?.name ?? "Producto",
        presName: pres?.name ?? "",
        imgUrl: prod?.images?.[0]
          ? prod.images[0].replace("/upload/", "/upload/w_50,h_50,c_fill/")
          : null,
      };
    });
    setEditOrder({
      orderId: order.id,
      notes_customer: order.notes_customer ?? "",
      notes_internal: order.notes_internal ?? "",
      customer_nit: order.customer_nit ?? "CF",
      items,
      searchQuery: "",
      searchResults: [],
      searchLoading: false,
    });
    setEditError(null);
  };

  const handleSearchProducts = useCallback((query: string) => {
    setEditOrder((s) => s ? { ...s, searchQuery: query, searchLoading: query.length >= 2 } : s);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) {
      setEditOrder((s) => s ? { ...s, searchResults: [], searchLoading: false } : s);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const { results } = await searchPresentationsForOrder(query);
      setEditOrder((s) => s ? { ...s, searchResults: results, searchLoading: false } : s);
    }, 350);
  }, []);

  const handleSaveEditOrder = async () => {
    if (!editOrder) return;
    setEditLoading(true);
    setEditError(null);
    const res = await updateOrderAdmin({
      orderId: editOrder.orderId,
      notes_customer: editOrder.notes_customer || null,
      notes_internal: editOrder.notes_internal || null,
      customer_nit: editOrder.customer_nit || "CF",
      items: editOrder.items.map((i) => ({
        presentation_id: i.presentation_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    });
    setEditLoading(false);
    if (res.success) {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== editOrder.orderId) return o;
          const newTotal = editOrder.items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
          return {
            ...o,
            notes_customer: editOrder.notes_customer || null,
            notes_internal: editOrder.notes_internal || null,
            customer_nit: editOrder.customer_nit || "CF",
            subtotal: newTotal,
            total: newTotal,
            order_items: editOrder.items.map((ei) => {
              const existing = o.order_items.find((item: Order) => item.product_presentations?.id === ei.presentation_id);
              return existing
                ? { ...existing, quantity: ei.quantity, subtotal: ei.unit_price * ei.quantity }
                : {
                    id: `new-${ei.presentation_id}`,
                    quantity: ei.quantity,
                    unit_price: ei.unit_price,
                    subtotal: ei.unit_price * ei.quantity,
                    product_presentations: { id: ei.presentation_id, name: ei.presName, products: { name: ei.productName } },
                  };
            }),
          };
        })
      );
      setEditOrder(null);
    } else {
      setEditError(res.error ?? "Error al guardar los cambios.");
    }
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
                            onClick={() => {
                              const isClosing = nextAction.next === "entregado" || nextAction.next === "recogido";
                              if (isClosing) {
                                handleCloseAction(order.id, nextAction.next, order.total);
                              } else {
                                setConfirmingAction({
                                  orderId: order.id,
                                  status: nextAction.next,
                                  label: nextAction.label,
                                });
                              }
                            }}
                          >
                            {nextAction.label}
                          </Button>
                        )}
                        {(order.status === "pendiente" || order.status === "revisado") && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEditOrder(order)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
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
            : `¿Cambiar estado a "${STATUS_LABELS[confirmingAction?.status as OrderStatus] ?? ""}"?`
        }
        confirmLabel={confirmingAction?.label ?? "Confirmar"}
        variant={confirmingAction?.status === "cancelado" ? "danger" : "primary"}
      />

      {/* Payment modal when closing sale */}
      {closingOrder && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setClosingOrder(null)} />
          <div className="relative z-10 w-full md:max-w-md bg-secondary rounded-t-2xl md:rounded-lg md:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-secondary border-b border-border p-4 flex items-center justify-between">
              <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border" />
              <h3 className="font-display text-lg text-primary mt-2 md:mt-0">Registrar pago</h3>
              <button onClick={() => setClosingOrder(null)} className="text-gray-mid hover:text-primary text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm font-body text-gray-mid">
                Esto convertirá el pedido en una venta y decrementará el inventario.
                Registra los datos de pago del cliente.
              </p>
              <div className="bg-gray-light rounded p-3 flex justify-between text-sm font-body">
                <span className="text-gray-mid">Total del pedido</span>
                <span className="font-semibold text-primary">{formatCurrency(closingOrder.orderTotal)}</span>
              </div>

              <div>
                <label className="block text-xs text-gray-mid font-body mb-1">Método de pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta_credito">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="consignacion">Consignación</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-mid font-body mb-1">Estado del pago</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
                >
                  <option value="pagado">Pagado completo</option>
                  <option value="parcial">Pago parcial</option>
                  <option value="pendiente">Fiado / pendiente</option>
                </select>
              </div>

              {paymentStatus === "parcial" && (
                <div>
                  <label className="block text-xs text-gray-mid font-body mb-1">Monto pagado (Q)</label>
                  <input
                    type="number"
                    min={0}
                    max={closingOrder.orderTotal}
                    value={amountPaid === 0 ? "" : String(amountPaid)}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" loading={isPending} onClick={handleConfirmClose}>
                  Confirmar y cerrar venta
                </Button>
                <Button variant="ghost" onClick={() => setClosingOrder(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit order modal */}
      {editOrder && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setEditOrder(null)} />
          <div className="relative z-10 w-full md:max-w-lg bg-secondary rounded-t-2xl md:rounded-lg md:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-secondary border-b border-border p-4 flex items-center justify-between">
              <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border" />
              <h3 className="font-display text-lg text-primary mt-2 md:mt-0">Editar pedido</h3>
              <button onClick={() => setEditOrder(null)} className="text-gray-mid hover:text-primary text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Items */}
              <div>
                <p className="text-xs font-body font-semibold text-gray-mid uppercase tracking-wide mb-2">Productos</p>
                <div className="space-y-2">
                  {editOrder.items.map((item, idx) => (
                    <div key={item.presentation_id} className="flex items-center gap-2 bg-gray-light rounded p-2">
                      <div className="w-8 h-8 rounded bg-secondary border border-border overflow-hidden shrink-0">
                        {item.imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imgUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-3 h-3 text-border" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-body font-medium text-primary truncate">{item.productName}</p>
                        <p className="text-xs text-gray-mid font-body">{item.presName} · {formatCurrency(item.unit_price)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditOrder((s) => {
                            if (!s) return s;
                            const newItems = [...s.items];
                            if (newItems[idx].quantity <= 1) {
                              if (newItems.length === 1) return s;
                              newItems.splice(idx, 1);
                            } else {
                              newItems[idx] = { ...newItems[idx], quantity: newItems[idx].quantity - 1 };
                            }
                            return { ...s, items: newItems };
                          })}
                          className="w-6 h-6 flex items-center justify-center rounded border border-border hover:border-primary text-gray-mid hover:text-primary transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-body font-semibold text-primary">{item.quantity}</span>
                        <button
                          onClick={() => setEditOrder((s) => {
                            if (!s) return s;
                            const newItems = [...s.items];
                            newItems[idx] = { ...newItems[idx], quantity: newItems[idx].quantity + 1 };
                            return { ...s, items: newItems };
                          })}
                          className="w-6 h-6 flex items-center justify-center rounded border border-border hover:border-primary text-gray-mid hover:text-primary transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-xs font-body font-semibold text-primary shrink-0 w-14 text-right">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </span>
                      <button
                        onClick={() => setEditOrder((s) => {
                          if (!s || s.items.length === 1) return s;
                          return { ...s, items: s.items.filter((_, i) => i !== idx) };
                        })}
                        className="ml-1 text-gray-mid hover:text-error transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add product search */}
                <div className="mt-3 relative">
                  <div className="flex items-center gap-2 border border-border rounded px-3 py-2">
                    <Search className="w-3.5 h-3.5 text-gray-mid shrink-0" />
                    <input
                      type="text"
                      value={editOrder.searchQuery}
                      onChange={(e) => handleSearchProducts(e.target.value)}
                      placeholder="Agregar producto por nombre…"
                      className="flex-1 text-sm font-body focus:outline-none bg-transparent"
                    />
                    {editOrder.searchLoading && (
                      <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                    )}
                  </div>
                  {editOrder.searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-secondary border border-border rounded shadow-lg max-h-48 overflow-y-auto">
                      {editOrder.searchResults.map((r: Order) => {
                        const alreadyAdded = editOrder.items.some((i) => i.presentation_id === r.id);
                        return (
                          <button
                            key={r.id}
                            disabled={alreadyAdded}
                            onClick={() => {
                              setEditOrder((s) => {
                                if (!s) return s;
                                if (s.items.some((i) => i.presentation_id === r.id)) return s;
                                const prod = r.products;
                                return {
                                  ...s,
                                  items: [...s.items, {
                                    presentation_id: r.id,
                                    quantity: 1,
                                    unit_price: r.sale_price,
                                    productName: prod?.name ?? "Producto",
                                    presName: r.name ?? "",
                                    imgUrl: prod?.images?.[0]
                                      ? prod.images[0].replace("/upload/", "/upload/w_50,h_50,c_fill/")
                                      : null,
                                  }],
                                  searchQuery: "",
                                  searchResults: [],
                                };
                              });
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-light transition-colors ${alreadyAdded ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-body font-medium text-primary truncate">{r.products?.name}</p>
                              <p className="text-xs text-gray-mid font-body">{r.name} · {formatCurrency(r.sale_price)} · stock: {r.stock}</p>
                            </div>
                            {alreadyAdded && <span className="text-xs text-gray-mid font-body">Ya agregado</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* NIT */}
              <div>
                <label className="block text-xs font-body text-gray-mid mb-1">NIT</label>
                <input
                  type="text"
                  value={editOrder.customer_nit}
                  onChange={(e) => setEditOrder((s) => s ? { ...s, customer_nit: e.target.value.toUpperCase() } : s)}
                  placeholder="CF"
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Notes customer */}
              <div>
                <label className="block text-xs font-body text-gray-mid mb-1">Notas del cliente</label>
                <textarea
                  rows={2}
                  value={editOrder.notes_customer}
                  onChange={(e) => setEditOrder((s) => s ? { ...s, notes_customer: e.target.value } : s)}
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Notes internal */}
              <div>
                <label className="block text-xs font-body text-gray-mid mb-1">Notas internas</label>
                <textarea
                  rows={2}
                  value={editOrder.notes_internal}
                  onChange={(e) => setEditOrder((s) => s ? { ...s, notes_internal: e.target.value } : s)}
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Total */}
              <div className="flex justify-between text-sm font-body font-semibold text-primary border-t border-border pt-2">
                <span>Total estimado</span>
                <span>{formatCurrency(editOrder.items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0))}</span>
              </div>

              {editError && (
                <p className="text-sm text-error font-body bg-error/5 border border-error/20 rounded px-3 py-2">
                  {editError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button className="flex-1" loading={editLoading} onClick={handleSaveEditOrder}>
                  Guardar cambios
                </Button>
                <Button variant="ghost" onClick={() => setEditOrder(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
