"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { createOrder, createAddress } from "./actions";
import { MapPin, Store, Plus, CheckCircle, ChevronDown, ChevronUp, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/types";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

interface CheckoutClientProps {
  addresses: Address[];
  userPhone: string | null;
}

type Step = "delivery" | "address" | "notes";

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
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

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
  const needsPhone = !userPhone;
  const canConfirm =
    items.length > 0 &&
    !(deliveryMethod === "envio" && !selectedAddressId) &&
    !(needsPhone && !phone.trim());

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
    setError(null);
    if (needsPhone && !phone.trim()) {
      setError("Ingresa tu número de WhatsApp para continuar.");
      return;
    }
    if (deliveryMethod === "envio" && !selectedAddressId) {
      setError("Selecciona una dirección de envío.");
      return;
    }
    setLoading(true);
    const res = await createOrder({
      delivery_method: deliveryMethod,
      address_id: deliveryMethod === "envio" ? selectedAddressId : null,
      notes_customer: notes || null,
      customer_nit: customerNit || "CF",
      phone: needsPhone ? phone.trim() : null,
      items: items.map((i) => ({
        presentation_id: i.presentationId,
        quantity: i.quantity,
        unit_price: i.salePrice,
      })),
    });
    setLoading(false);
    if (res.success && res.orderId) {
      clearCart();
      setDone(true);
    } else {
      setError(res.error ?? "Error al crear el pedido.");
    }
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-success mx-auto" />
        <h1 className="font-display text-2xl text-primary uppercase tracking-wide">¡Pedido recibido!</h1>
        <p className="text-gray-mid font-body text-sm">
          Tu pedido ha sido registrado exitosamente. Nos pondremos en contacto contigo pronto.
        </p>
        {deliveryMethod === "recoger_en_tienda" && (
          <div className="bg-gray-light border border-border rounded p-4 text-left space-y-1">
            <p className="text-sm font-body font-medium text-primary">Dónde recoger:</p>
            <p className="text-sm font-body text-gray-mid">
              Calle Real Lote 25, Aldea San Pedro Las Huertas, La Antigua Guatemala
            </p>
            <p className="text-sm font-body text-gray-mid">WhatsApp: +502 5420-4805</p>
          </div>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => router.push("/tienda/mis-pedidos")}>Ver mis pedidos</Button>
          <Button variant="secondary" onClick={() => router.push("/tienda")}>Seguir comprando</Button>
        </div>
      </div>
    );
  }

  // ─── Shared sections ────────────────────────────────────────────────────────

  const phoneSection = needsPhone && (
    <div className="bg-secondary border border-primary/30 rounded p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-primary shrink-0" />
        <p className="font-body font-semibold text-primary text-sm">
          Teléfono de WhatsApp <span className="text-error">*</span>
        </p>
      </div>
      <p className="text-xs text-gray-mid font-body">
        Lo usamos para confirmar y coordinar tu pedido. Solo se guarda una vez.
      </p>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+502 0000-0000"
        className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );

  const deliverySection = (
    <div className="bg-secondary border border-border rounded overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-gray-light transition-colors"
        onClick={() => setStep(step === "delivery" ? "notes" : "delivery")}
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-primary text-secondary flex items-center justify-center text-xs font-body font-bold shrink-0">1</span>
          <div className="text-left">
            <p className="font-body font-semibold text-primary text-sm">Método de entrega</p>
            <p className="text-xs text-gray-mid font-body">
              {deliveryMethod === "envio" ? "Envío a domicilio" : "Recoger en tienda"}
            </p>
          </div>
        </div>
        {step === "delivery" ? <ChevronUp className="w-4 h-4 text-gray-mid" /> : <ChevronDown className="w-4 h-4 text-gray-mid" />}
      </button>
      {step === "delivery" && (
        <div className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeliveryMethod("recoger_en_tienda")}
              className={`p-3 rounded border-2 text-left transition-all ${deliveryMethod === "recoger_en_tienda" ? "border-primary bg-primary/5" : "border-border hover:border-gray-mid"}`}
            >
              <Store className={`w-5 h-5 mb-1.5 ${deliveryMethod === "recoger_en_tienda" ? "text-primary" : "text-gray-mid"}`} />
              <p className="font-body font-semibold text-primary text-sm">Recoger</p>
              <p className="text-xs text-gray-mid font-body mt-0.5">Gratis</p>
            </button>
            <button
              onClick={() => setDeliveryMethod("envio")}
              className={`p-3 rounded border-2 text-left transition-all ${deliveryMethod === "envio" ? "border-primary bg-primary/5" : "border-border hover:border-gray-mid"}`}
            >
              <MapPin className={`w-5 h-5 mb-1.5 ${deliveryMethod === "envio" ? "text-primary" : "text-gray-mid"}`} />
              <p className="font-body font-semibold text-primary text-sm">Envío</p>
              <p className="text-xs text-gray-mid font-body mt-0.5">A coordinar</p>
            </button>
          </div>
          <Button size="sm" onClick={() => setStep(deliveryMethod === "envio" ? "address" : "notes")}>
            Continuar
          </Button>
        </div>
      )}
    </div>
  );

  const addressSection = deliveryMethod === "envio" && (
    <div className="bg-secondary border border-border rounded overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-gray-light transition-colors"
        onClick={() => setStep(step === "address" ? "delivery" : "address")}
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-primary text-secondary flex items-center justify-center text-xs font-body font-bold shrink-0">2</span>
          <div className="text-left">
            <p className="font-body font-semibold text-primary text-sm">Dirección de envío</p>
            {selectedAddressId && (
              <p className="text-xs text-gray-mid font-body truncate max-w-[200px]">
                {addresses.find((a) => a.id === selectedAddressId)?.full_address ?? ""}
              </p>
            )}
          </div>
        </div>
        {step === "address" ? <ChevronUp className="w-4 h-4 text-gray-mid" /> : <ChevronDown className="w-4 h-4 text-gray-mid" />}
      </button>
      {step === "address" && (
        <div className="p-4 pt-0 space-y-3">
          {addresses.length > 0 && (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex items-start gap-3 p-3 rounded border-2 cursor-pointer transition-all ${selectedAddressId === addr.id ? "border-primary bg-primary/5" : "border-border hover:border-gray-mid"}`}
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
                    {addr.reference && <p className="text-xs text-gray-mid font-body">{addr.reference}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}
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
                <Button size="sm" onClick={handleAddAddress} loading={loading}>Guardar</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddressForm(false)}>Cancelar</Button>
              </div>
            </div>
          )}
          <Button size="sm" disabled={!selectedAddressId} onClick={() => setStep("notes")}>Continuar</Button>
        </div>
      )}
    </div>
  );

  const notesSection = (
    <div className="bg-secondary border border-border rounded overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-gray-light transition-colors"
        onClick={() => setStep(step === "notes" ? "delivery" : "notes")}
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-primary text-secondary flex items-center justify-center text-xs font-body font-bold shrink-0">
            {deliveryMethod === "envio" ? "3" : "2"}
          </span>
          <p className="font-body font-semibold text-primary text-sm">
            Notas{" "}
            <span className="font-normal text-gray-mid">(opcional)</span>
          </p>
        </div>
        {step === "notes" ? <ChevronUp className="w-4 h-4 text-gray-mid" /> : <ChevronDown className="w-4 h-4 text-gray-mid" />}
      </button>
      {step === "notes" && (
        <div className="p-4 pt-0">
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
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-8 lg:py-8">
        <h1 className="font-display text-2xl md:text-3xl text-primary mb-5 uppercase tracking-wide">
          Finalizar pedido
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Main form ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Mobile-only: collapsible order summary */}
            <div className="lg:hidden bg-secondary border border-border rounded overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4"
                onClick={() => setSummaryOpen(!summaryOpen)}
              >
                <div className="flex items-center gap-2">
                  {summaryOpen
                    ? <ChevronUp className="w-4 h-4 text-gray-mid" />
                    : <ChevronDown className="w-4 h-4 text-gray-mid" />}
                  <span className="font-body font-medium text-primary text-sm">
                    {items.length} {items.length === 1 ? "producto" : "productos"}
                  </span>
                </div>
                <span className="font-body font-semibold text-primary">{formatCurrency(subtotal)}</span>
              </button>
              {summaryOpen && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.presentationId} className="flex justify-between gap-2 text-sm font-body">
                      <span className="text-primary truncate">
                        {item.productName} <span className="text-gray-mid">×{item.quantity}</span>
                      </span>
                      <span className="text-primary shrink-0">{formatCurrency(item.salePrice * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border flex justify-between text-sm font-body text-gray-mid">
                    <span>Envío</span>
                    <span>{deliveryMethod === "recoger_en_tienda" ? "Gratis" : "Por coordinar"}</span>
                  </div>
                </div>
              )}
            </div>

            {phoneSection}
            {deliverySection}
            {addressSection}
            {notesSection}

            {/* Mobile-only: NIT inline */}
            <div className="lg:hidden bg-secondary border border-border rounded p-4 space-y-2">
              <label htmlFor="nit-mobile" className="block text-sm font-body font-semibold text-primary">
                NIT para factura
              </label>
              <input
                id="nit-mobile"
                type="text"
                value={customerNit}
                onChange={(e) => setCustomerNit(e.target.value.toUpperCase())}
                placeholder="CF"
                className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-gray-mid font-body">Escribe CF si no tienes NIT</p>
            </div>

            {error && <p className="text-sm text-error font-body lg:hidden">{error}</p>}
          </div>

          {/* ── Desktop sidebar ── */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-secondary border border-border rounded p-4 sticky top-4 space-y-4">
              <h2 className="font-display text-lg text-primary uppercase">Tu pedido</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.presentationId} className="flex justify-between gap-2 text-sm font-body">
                    <span className="text-primary truncate">
                      {item.productName} <span className="text-gray-mid">×{item.quantity}</span>
                    </span>
                    <span className="text-primary shrink-0">{formatCurrency(item.salePrice * item.quantity)}</span>
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
              <div className="border-t border-border pt-3 space-y-1">
                <label htmlFor="nit-desktop" className="block text-xs font-body font-medium text-primary">
                  NIT para factura
                </label>
                <input
                  id="nit-desktop"
                  type="text"
                  value={customerNit}
                  onChange={(e) => setCustomerNit(e.target.value.toUpperCase())}
                  placeholder="CF"
                  className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[11px] text-gray-mid font-body">Escribe CF si no tienes NIT</p>
              </div>
              {error && <p className="text-sm text-error font-body">{error}</p>}
              <Button
                size="lg"
                className="w-full"
                loading={loading}
                disabled={loading || !canConfirm}
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

      {/* ── Mobile sticky bottom bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-secondary border-t border-border shadow-lg">
        {error && (
          <div className="px-4 pt-2">
            <p className="text-xs text-error font-body">{error}</p>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="shrink-0">
            <p className="text-[11px] text-gray-mid font-body leading-none mb-0.5">Total</p>
            <p className="font-display text-lg text-primary leading-none">{formatCurrency(subtotal)}</p>
          </div>
          <Button
            size="lg"
            className="flex-1"
            loading={loading}
            disabled={loading || !canConfirm}
            onClick={handleConfirmOrder}
          >
            Confirmar pedido
          </Button>
        </div>
      </div>
    </>
  );
}
