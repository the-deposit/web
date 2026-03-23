"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { createOrder, createAddress } from "./actions";
import { MapPin, Store, Plus, CheckCircle, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Database } from "@/lib/supabase/types";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

interface CheckoutClientProps {
  addresses: Address[];
  userPhone: string | null;
}

type Step = "delivery" | "address" | "review" | "done";

export function CheckoutClient({ addresses: initialAddresses, userPhone }: CheckoutClientProps) {
  const { items, totalAmount, clearCart } = useCartStore();
  const router = useRouter();

  const [step, setStep] = useState<Step>("delivery");
  const [deliveryMethod, setDeliveryMethod] = useState<"envio" | "recoger_en_tienda">("recoger_en_tienda");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialAddresses.find((a) => a.is_default)?.id ?? initialAddresses[0]?.id ?? null
  );
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [customerNit, setCustomerNit] = useState("CF");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // New address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "Casa",
    full_address: "",
    department: "",
    municipality: "",
    zone: "",
    reference: "",
    is_default: false,
  });

  const subtotal = totalAmount();

  const handleAddAddress = async () => {
    if (!newAddress.full_address.trim()) return;
    setLoading(true);
    const res = await createAddress({
      ...newAddress,
      department: newAddress.department || null,
      municipality: newAddress.municipality || null,
      zone: newAddress.zone || null,
      reference: newAddress.reference || null,
    });
    setLoading(false);

    if (res.success && res.addressId) {
      const addr: Address = {
        id: res.addressId,
        user_id: "",
        label: newAddress.label,
        full_address: newAddress.full_address,
        department: newAddress.department || null,
        municipality: newAddress.municipality || null,
        zone: newAddress.zone || null,
        reference: newAddress.reference || null,
        is_default: newAddress.is_default,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAddresses((prev) => [...prev, addr]);
      setSelectedAddressId(res.addressId);
      setShowAddressForm(false);
      setNewAddress({ label: "Casa", full_address: "", department: "", municipality: "", zone: "", reference: "", is_default: false });
    } else {
      setError(res.error ?? "Error al guardar la dirección.");
    }
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    setError(null);

    const res = await createOrder({
      delivery_method: deliveryMethod,
      address_id: deliveryMethod === "envio" ? selectedAddressId : null,
      notes_customer: notes || null,
      customer_nit: customerNit || "CF",
      items: items.map((i) => ({
        presentation_id: i.presentationId,
        quantity: i.quantity,
        unit_price: i.salePrice,
      })),
    });

    setLoading(false);

    if (res.success && res.orderId) {
      setOrderId(res.orderId);
      clearCart();
      setStep("done");
    } else {
      setError(res.error ?? "Error al crear el pedido.");
    }
  };

  // DONE state
  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-success mx-auto" />
        <h1 className="font-display text-2xl text-primary uppercase tracking-wide">
          ¡Pedido recibido!
        </h1>
        <p className="text-gray-mid font-body text-sm">
          Tu pedido ha sido registrado exitosamente. Nos pondremos en contacto contigo pronto.
        </p>
        {deliveryMethod === "recoger_en_tienda" && (
          <div className="bg-gray-light border border-border rounded p-4 text-left space-y-1">
            <p className="text-sm font-body font-medium text-primary">Dónde recoger:</p>
            <p className="text-sm font-body text-gray-mid">
              Calle Real Lote 25, Aldea San Pedro Las Huertas, La Antigua Guatemala
            </p>
            <p className="text-sm font-body text-gray-mid">
              WhatsApp: +502 5420-4805
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => router.push("/tienda/mis-pedidos")}>
            Ver mis pedidos
          </Button>
          <Button variant="secondary" onClick={() => router.push("/tienda")}>
            Seguir comprando
          </Button>
        </div>
      </div>
    );
  }

  // Phone required warning
  if (!userPhone) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-warning mx-auto" />
        <h2 className="font-display text-xl text-primary uppercase tracking-wide">
          Registro de teléfono requerido
        </h2>
        <p className="text-sm text-gray-mid font-body">
          Para realizar pedidos necesitas registrar tu número de WhatsApp. Lo usamos como medio principal de comunicación para confirmar y coordinar tu pedido.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/tienda/mi-perfil">
            <Button className="w-full">Ir a mi perfil</Button>
          </Link>
          <Button variant="secondary" onClick={() => router.push("/tienda")}>
            Volver a la tienda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl md:text-3xl text-primary mb-6 uppercase tracking-wide">
        Finalizar pedido
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Step 1: Delivery method */}
          <div className="bg-secondary border border-border rounded overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-light transition-colors"
              onClick={() => setStep(step === "delivery" ? "address" : "delivery")}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-secondary flex items-center justify-center text-xs font-body font-bold shrink-0">
                  1
                </span>
                <div className="text-left">
                  <p className="font-body font-semibold text-primary text-sm">Método de entrega</p>
                  {deliveryMethod && (
                    <p className="text-xs text-gray-mid font-body">
                      {deliveryMethod === "envio" ? "Envío a domicilio" : "Recoger en tienda"}
                    </p>
                  )}
                </div>
              </div>
              {step === "delivery" ? (
                <ChevronUp className="w-4 h-4 text-gray-mid" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-mid" />
              )}
            </button>

            {step === "delivery" && (
              <div className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setDeliveryMethod("recoger_en_tienda")}
                    className={`p-4 rounded border-2 text-left transition-all ${
                      deliveryMethod === "recoger_en_tienda"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-gray-mid"
                    }`}
                  >
                    <Store className={`w-6 h-6 mb-2 ${deliveryMethod === "recoger_en_tienda" ? "text-primary" : "text-gray-mid"}`} />
                    <p className="font-body font-semibold text-primary text-sm">Recoger en tienda</p>
                    <p className="text-xs text-gray-mid font-body mt-0.5">Gratis · Aldea San Pedro Las Huertas</p>
                  </button>
                  <button
                    onClick={() => setDeliveryMethod("envio")}
                    className={`p-4 rounded border-2 text-left transition-all ${
                      deliveryMethod === "envio"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-gray-mid"
                    }`}
                  >
                    <MapPin className={`w-6 h-6 mb-2 ${deliveryMethod === "envio" ? "text-primary" : "text-gray-mid"}`} />
                    <p className="font-body font-semibold text-primary text-sm">Envío a domicilio</p>
                    <p className="text-xs text-gray-mid font-body mt-0.5">Costo a coordinar</p>
                  </button>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    setStep(deliveryMethod === "envio" ? "address" : "review")
                  }
                >
                  Continuar
                </Button>
              </div>
            )}
          </div>

          {/* Step 2: Address (only for envio) */}
          {deliveryMethod === "envio" && (
            <div className="bg-secondary border border-border rounded overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-gray-light transition-colors"
                onClick={() => setStep(step === "address" ? "delivery" : "address")}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-secondary flex items-center justify-center text-xs font-body font-bold shrink-0">
                    2
                  </span>
                  <div className="text-left">
                    <p className="font-body font-semibold text-primary text-sm">Dirección de envío</p>
                    {selectedAddressId && (
                      <p className="text-xs text-gray-mid font-body">
                        {addresses.find((a) => a.id === selectedAddressId)?.full_address ?? ""}
                      </p>
                    )}
                  </div>
                </div>
                {step === "address" ? (
                  <ChevronUp className="w-4 h-4 text-gray-mid" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-mid" />
                )}
              </button>

              {step === "address" && (
                <div className="p-4 pt-0 space-y-3">
                  {addresses.length > 0 && (
                    <div className="space-y-2">
                      {addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`flex items-start gap-3 p-3 rounded border-2 cursor-pointer transition-all ${
                            selectedAddressId === addr.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-gray-mid"
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            value={addr.id}
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-0.5 accent-primary"
                          />
                          <div>
                            <p className="font-body font-medium text-primary text-sm">{addr.label}</p>
                            <p className="text-xs text-gray-mid font-body">{addr.full_address}</p>
                            {addr.reference && (
                              <p className="text-xs text-gray-mid font-body">{addr.reference}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Add new address */}
                  {!showAddressForm ? (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="flex items-center gap-2 text-sm text-gray-mid hover:text-primary transition-colors font-body"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar nueva dirección
                    </button>
                  ) : (
                    <div className="border border-border rounded p-3 space-y-2">
                      <p className="text-sm font-body font-medium text-primary">Nueva dirección</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <input
                            placeholder="Etiqueta (Casa, Oficina…)"
                            value={newAddress.label}
                            onChange={(e) => setNewAddress((p) => ({ ...p, label: e.target.value }))}
                            className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            placeholder="Dirección completa *"
                            value={newAddress.full_address}
                            onChange={(e) => setNewAddress((p) => ({ ...p, full_address: e.target.value }))}
                            className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <input
                          placeholder="Departamento"
                          value={newAddress.department}
                          onChange={(e) => setNewAddress((p) => ({ ...p, department: e.target.value }))}
                          className="text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          placeholder="Municipio"
                          value={newAddress.municipality}
                          onChange={(e) => setNewAddress((p) => ({ ...p, municipality: e.target.value }))}
                          className="text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="col-span-2">
                          <input
                            placeholder="Referencia (color de casa, cerca de...)"
                            value={newAddress.reference}
                            onChange={(e) => setNewAddress((p) => ({ ...p, reference: e.target.value }))}
                            className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddAddress} loading={loading}>
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAddressForm(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    disabled={!selectedAddressId}
                    onClick={() => setStep("review")}
                  >
                    Continuar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step review */}
          <div className="bg-secondary border border-border rounded overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-light transition-colors"
              onClick={() => setStep("review")}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-secondary flex items-center justify-center text-xs font-body font-bold shrink-0">
                  {deliveryMethod === "envio" ? "3" : "2"}
                </span>
                <p className="font-body font-semibold text-primary text-sm">Notas del pedido (opcional)</p>
              </div>
              {step === "review" ? (
                <ChevronUp className="w-4 h-4 text-gray-mid" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-mid" />
              )}
            </button>

            {step === "review" && (
              <div className="p-4 pt-0 space-y-3">
                <div>
                  <label className="block text-xs text-gray-mid font-body mb-1">
                    NIT para factura <span className="text-gray-mid">(o CF si no tienes)</span>
                  </label>
                  <input
                    type="text"
                    value={customerNit}
                    onChange={(e) => setCustomerNit(e.target.value.toUpperCase())}
                    placeholder="CF"
                    className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder="¿Alguna instrucción especial para tu pedido?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-error font-body">{error}</p>
          )}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-secondary border border-border rounded p-4 sticky top-4 space-y-4">
            <h2 className="font-display text-lg text-primary uppercase">Tu pedido</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={item.presentationId} className="flex justify-between gap-2 text-sm font-body">
                  <span className="text-primary truncate">
                    {item.productName}{" "}
                    <span className="text-gray-mid">×{item.quantity}</span>
                  </span>
                  <span className="text-primary shrink-0">
                    {formatCurrency(item.salePrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-1 text-sm font-body">
              <div className="flex justify-between text-gray-mid">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-mid">
                <span>Envío</span>
                <span>{deliveryMethod === "recoger_en_tienda" ? "Gratis" : "Por coordinar"}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary pt-1">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full"
              loading={loading}
              disabled={
                loading ||
                items.length === 0 ||
                (deliveryMethod === "envio" && !selectedAddressId)
              }
              onClick={handleConfirmOrder}
            >
              Confirmar pedido
            </Button>
            <p className="text-xs text-gray-mid text-center font-body">
              Sin pago en línea — coordinaremos contigo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
