"use client";

import { useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ClipboardList, ChevronDown, ChevronUp, Package, Pencil, Minus, Plus, Store, MapPin } from "lucide-react";
import { cancelOrder, updateOrderDetails, getUserAddresses } from "../checkout/actions";
import type { OrderStatus, DeliveryMethod } from "@/lib/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Address = any;

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

interface EditState {
  orderId: string;
  delivery_method: "envio" | "recoger_en_tienda";
  address_id: string | null;
  notes_customer: string;
  customer_nit: string;
  items: { presentation_id: string; quantity: number; unit_price: number; productName: string; presName: string; imgUrl: string | null }[];
  addresses: Address[];
  loadingAddresses: boolean;
}

export function MisPedidosClient({ orders }: { orders: Order[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  const handleCancel = async (orderId: string) => {
    setLoadingId(orderId);
    setCancelError(null);
    const res = await cancelOrder(orderId);
    setLoadingId(null);
    if (res.success) {
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelado" } : o))
      );
      setCancellingId(null);
    } else {
      setCancelError(res.error ?? "No se pudo cancelar el pedido.");
      setCancellingId(null);
    }
  };

  const openEdit = async (order: Order) => {
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
          ? prod.images[0].replace("/upload/", "/upload/w_60,h_60,c_fill,f_auto,q_auto/")
          : null,
      };
    });

    setEditState({
      orderId: order.id,
      delivery_method: order.delivery_method,
      address_id: order.address_id ?? null,
      notes_customer: order.notes_customer ?? "",
      customer_nit: order.customer_nit ?? "CF",
      items,
      addresses: [],
      loadingAddresses: true,
    });
    setEditError(null);

    const { addresses } = await getUserAddresses();
    setEditState((prev) => prev ? { ...prev, addresses, loadingAddresses: false } : null);
  };

  const handleSaveEdit = async () => {
    if (!editState) return;
    setEditLoading(true);
    setEditError(null);

    const res = await updateOrderDetails({
      orderId: editState.orderId,
      delivery_method: editState.delivery_method,
      address_id: editState.delivery_method === "envio" ? editState.address_id : null,
      notes_customer: editState.notes_customer || null,
      customer_nit: editState.customer_nit || "CF",
      items: editState.items.map((i) => ({
        presentation_id: i.presentation_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    });

    setEditLoading(false);
    if (res.success) {
      // Update local orders with new data
      setLocalOrders((prev) =>
        prev.map((o) => {
          if (o.id !== editState.orderId) return o;
          const newTotal = editState.items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
          const updatedAddress = editState.delivery_method === "envio"
            ? editState.addresses.find((a: Address) => a.id === editState.address_id) ?? o.address
            : null;
          return {
            ...o,
            delivery_method: editState.delivery_method,
            address_id: editState.address_id,
            address: updatedAddress,
            notes_customer: editState.notes_customer || null,
            customer_nit: editState.customer_nit || "CF",
            subtotal: newTotal,
            total: newTotal,
            order_items: o.order_items.filter((item: Order) =>
              editState.items.some((ei) => ei.presentation_id === item.product_presentations?.id)
            ).map((item: Order) => {
              const editItem = editState.items.find((ei) => ei.presentation_id === item.product_presentations?.id);
              return editItem ? { ...item, quantity: editItem.quantity, subtotal: editItem.unit_price * editItem.quantity } : item;
            }),
          };
        })
      );
      setEditState(null);
    } else {
      setEditError(res.error ?? "Error al guardar los cambios.");
    }
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

                {/* Notes */}
                {order.notes_customer && (
                  <p className="text-xs text-gray-mid font-body bg-gray-light rounded p-2">
                    <span className="font-medium text-primary">Nota: </span>{order.notes_customer}
                  </p>
                )}

                {/* Total */}
                <div className="flex justify-between text-sm font-body font-semibold text-primary border-t border-border pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>

                {/* Actions for pendiente */}
                {order.status === "pendiente" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(order)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar pedido
                    </Button>
                    <>
                      {cancelError && (
                        <p className="w-full text-xs text-error font-body bg-error/5 border border-error/20 rounded px-3 py-2">
                          {cancelError}
                        </p>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        loading={loadingId === order.id}
                        onClick={() => {
                          setCancelError(null);
                          setCancellingId(order.id);
                        }}
                      >
                        Cancelar pedido
                      </Button>
                    </>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setEditState(null)} />
          <div className="relative z-10 w-full md:max-w-lg bg-secondary rounded-t-2xl md:rounded-lg md:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-secondary border-b border-border p-4 flex items-center justify-between">
              <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border" />
              <h3 className="font-display text-lg text-primary mt-2 md:mt-0">Modificar pedido</h3>
              <button onClick={() => setEditState(null)} className="text-gray-mid hover:text-primary text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Delivery method */}
              <div>
                <p className="text-xs font-body font-semibold text-gray-mid uppercase tracking-wide mb-2">Método de entrega</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEditState((s) => s ? { ...s, delivery_method: "recoger_en_tienda" } : s)}
                    className={`p-3 rounded border-2 text-left transition-all ${editState.delivery_method === "recoger_en_tienda" ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <Store className={`w-4 h-4 mb-1 ${editState.delivery_method === "recoger_en_tienda" ? "text-primary" : "text-gray-mid"}`} />
                    <p className="text-xs font-body font-semibold text-primary">Recoger en tienda</p>
                  </button>
                  <button
                    onClick={() => setEditState((s) => s ? { ...s, delivery_method: "envio" } : s)}
                    className={`p-3 rounded border-2 text-left transition-all ${editState.delivery_method === "envio" ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <MapPin className={`w-4 h-4 mb-1 ${editState.delivery_method === "envio" ? "text-primary" : "text-gray-mid"}`} />
                    <p className="text-xs font-body font-semibold text-primary">Envío a domicilio</p>
                  </button>
                </div>
              </div>

              {/* Address selector */}
              {editState.delivery_method === "envio" && (
                <div>
                  <p className="text-xs font-body font-semibold text-gray-mid uppercase tracking-wide mb-2">Dirección de envío</p>
                  {editState.loadingAddresses ? (
                    <p className="text-xs text-gray-mid font-body">Cargando direcciones…</p>
                  ) : editState.addresses.length === 0 ? (
                    <p className="text-xs text-gray-mid font-body">No tienes direcciones guardadas.</p>
                  ) : (
                    <div className="space-y-2">
                      {editState.addresses.map((addr: Address) => (
                        <label
                          key={addr.id}
                          className={`flex items-start gap-3 p-3 rounded border-2 cursor-pointer transition-all ${editState.address_id === addr.id ? "border-primary bg-primary/5" : "border-border"}`}
                        >
                          <input
                            type="radio"
                            name="edit_address"
                            value={addr.id}
                            checked={editState.address_id === addr.id}
                            onChange={() => setEditState((s) => s ? { ...s, address_id: addr.id } : s)}
                            className="mt-0.5 accent-primary"
                          />
                          <div>
                            <p className="text-xs font-body font-medium text-primary">{addr.label}</p>
                            <p className="text-xs text-gray-mid font-body">{addr.full_address}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs font-body font-semibold text-gray-mid uppercase tracking-wide mb-2">Productos</p>
                <div className="space-y-2">
                  {editState.items.map((item, idx) => (
                    <div key={item.presentation_id} className="flex items-center gap-3 bg-gray-light rounded p-2">
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
                          onClick={() => setEditState((s) => {
                            if (!s) return s;
                            const newItems = [...s.items];
                            if (newItems[idx].quantity <= 1) {
                              if (newItems.length === 1) return s; // keep at least 1 item
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
                        <span className="w-6 text-center text-xs font-body font-semibold text-primary">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setEditState((s) => {
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
                    </div>
                  ))}
                </div>
              </div>

              {/* NIT */}
              <div>
                <label className="block text-xs font-body text-gray-mid mb-1">NIT para factura</label>
                <input
                  type="text"
                  value={editState.customer_nit}
                  onChange={(e) => setEditState((s) => s ? { ...s, customer_nit: e.target.value.toUpperCase() } : s)}
                  placeholder="CF"
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-body text-gray-mid mb-1">Notas (opcional)</label>
                <textarea
                  rows={2}
                  value={editState.notes_customer}
                  onChange={(e) => setEditState((s) => s ? { ...s, notes_customer: e.target.value } : s)}
                  placeholder="Instrucciones especiales…"
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Total preview */}
              <div className="flex justify-between text-sm font-body font-semibold text-primary border-t border-border pt-2">
                <span>Total estimado</span>
                <span>{formatCurrency(editState.items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0))}</span>
              </div>

              {editError && (
                <p className="text-sm text-error font-body bg-error/5 border border-error/20 rounded px-3 py-2">
                  {editError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button className="flex-1" loading={editLoading} onClick={handleSaveEdit}>
                  Guardar cambios
                </Button>
                <Button variant="ghost" onClick={() => setEditState(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!cancellingId}
        onClose={() => { setCancellingId(null); setCancelError(null); }}
        onConfirm={() => cancellingId && handleCancel(cancellingId)}
        title="Cancelar pedido"
        message="¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
        loading={!!loadingId}
        variant="danger"
      />
    </div>
  );
}
