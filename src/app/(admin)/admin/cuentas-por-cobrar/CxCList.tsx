"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { DollarSign, Plus, User } from "lucide-react";
import { registerCxCPayment, createManualCxC } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Account = any;

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  pagada: "Pagada",
  vencida: "Vencida",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "outline"> = {
  pendiente: "warning",
  parcial: "default",
  pagada: "success",
  vencida: "error",
};

interface CxCListProps {
  accounts: Account[];
}

export function CxCList({ accounts: initialAccounts }: CxCListProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [statusFilter, setStatusFilter] = useState("all");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"efectivo" | "tarjeta_credito" | "transferencia" | "consignacion">("efectivo");
  const [payNotes, setPayNotes] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ customer_name: "", total_amount: "", due_date: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = accounts.filter((a) => statusFilter === "all" || a.status === statusFilter);

  const totalPending = accounts
    .filter((a) => a.status !== "pagada")
    .reduce((acc: number, a: Account) => acc + (a.balance ?? 0), 0);

  const handlePay = (id: string) => {
    setPayingId(id);
    setPayAmount("");
    setPayMethod("efectivo");
    setPayNotes("");
    setFormError(null);
  };

  const handleConfirmPayment = () => {
    if (!payingId || !payAmount || parseFloat(payAmount) <= 0) {
      setFormError("Ingresa un monto válido.");
      return;
    }
    startTransition(async () => {
      const res = await registerCxCPayment({
        account_id: payingId,
        amount: parseFloat(payAmount),
        payment_method: payMethod,
        notes: payNotes || null,
      });
      if (res.success) {
        setPayingId(null);
        // Update local state
        setAccounts((prev) => prev.map((a) => {
          if (a.id !== payingId) return a;
          const newPaid = Math.min(a.amount_paid + parseFloat(payAmount), a.total_amount);
          return { ...a, amount_paid: newPaid, balance: a.total_amount - newPaid, status: newPaid >= a.total_amount ? "pagada" : "parcial" };
        }));
      } else {
        setFormError(res.error ?? "Error al registrar el pago.");
      }
    });
  };

  const handleCreateManual = () => {
    if (!manualForm.customer_name || !manualForm.total_amount) {
      setFormError("Nombre y monto son requeridos.");
      return;
    }
    startTransition(async () => {
      const res = await createManualCxC({
        customer_name: manualForm.customer_name,
        total_amount: parseFloat(manualForm.total_amount),
        due_date: manualForm.due_date || null,
        notes: manualForm.notes || null,
      });
      if (res.success) {
        setShowManualForm(false);
        setManualForm({ customer_name: "", total_amount: "", due_date: "", notes: "" });
        window.location.reload();
      } else {
        setFormError(res.error ?? "Error.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary uppercase">Por Cobrar</h1>
        <Button size="sm" onClick={() => { setShowManualForm(true); setFormError(null); }}>
          <Plus className="w-4 h-4" /> Nueva cuenta
        </Button>
      </div>

      {/* Summary */}
      <div className="bg-secondary border border-border rounded p-4">
        <p className="text-xs font-body text-gray-mid uppercase tracking-wide mb-1">Total pendiente por cobrar</p>
        <p className="font-display text-2xl text-primary">{formatCurrency(totalPending)}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pendiente", "parcial", "vencida", "pagada"].map((s) => (
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

      {filtered.length === 0 ? (
        <EmptyState icon={DollarSign} title="Sin cuentas" description="No hay cuentas por cobrar con ese filtro." />
      ) : (
        <div className="space-y-2">
          {filtered.map((a: Account) => (
            <div key={a.id} className="bg-secondary border border-border rounded p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-body font-semibold text-primary text-sm flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {a.customer_name ?? a.customer?.full_name ?? "Cliente"}
                    </p>
                    <Badge variant={(STATUS_VARIANT[a.status] ?? "outline") as "default" | "success" | "warning" | "error" | "info" | "outline"}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-mid font-body">
                    <span>Total: {formatCurrency(a.total_amount)}</span>
                    <span>Pagado: {formatCurrency(a.amount_paid)}</span>
                    <span className="font-semibold text-primary">Saldo: {formatCurrency(a.balance ?? (a.total_amount - a.amount_paid))}</span>
                    {a.due_date && <span>Vence: {formatDate(a.due_date)}</span>}
                  </div>
                  {a.notes && <p className="text-xs text-gray-mid font-body mt-1">{a.notes}</p>}
                </div>
                {a.status !== "pagada" && (
                  <Button size="sm" variant="secondary" onClick={() => handlePay(a.id)}>
                    Abonar
                  </Button>
                )}
              </div>

              {/* Payment form */}
              {payingId === a.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <p className="text-xs font-body font-semibold text-primary">Registrar abono — saldo: {formatCurrency(a.balance ?? (a.total_amount - a.amount_paid))}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Monto (Q)"
                      type="number"
                      min={0.01}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0.00"
                    />
                    <div>
                      <label className="block text-xs text-gray-mid font-body mb-1">Método</label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                        className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary bg-secondary"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta_credito">Tarjeta</option>
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="Notas (opcional)"
                    className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {formError && <p className="text-xs text-error font-body">{formError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" loading={isPending} onClick={handleConfirmPayment}>Registrar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setPayingId(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manual CxC modal */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setShowManualForm(false)} />
          <div className="relative z-10 w-full md:max-w-md bg-secondary rounded-t-2xl md:rounded-lg md:mx-4">
            <div className="sticky top-0 bg-secondary border-b border-border p-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-primary">Nueva cuenta por cobrar</h3>
              <button onClick={() => setShowManualForm(false)} className="text-gray-mid hover:text-primary text-xl">×</button>
            </div>
            <div className="p-4 space-y-3">
              <Input label="Nombre del cliente" required value={manualForm.customer_name} onChange={(e) => setManualForm((p) => ({ ...p, customer_name: e.target.value }))} placeholder="Pedro, Titi, Bel..." />
              <Input label="Monto total (Q)" type="number" min={0.01} required value={manualForm.total_amount} onChange={(e) => setManualForm((p) => ({ ...p, total_amount: e.target.value }))} placeholder="0.00" />
              <Input label="Fecha de vencimiento" type="date" value={manualForm.due_date} onChange={(e) => setManualForm((p) => ({ ...p, due_date: e.target.value }))} />
              <input
                type="text"
                value={manualForm.notes}
                onChange={(e) => setManualForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notas (opcional)"
                className="w-full text-sm border border-border rounded px-3 py-2 font-body focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {formError && <p className="text-xs text-error font-body">{formError}</p>}
              <div className="flex gap-2">
                <Button className="flex-1" loading={isPending} onClick={handleCreateManual}>Crear cuenta</Button>
                <Button variant="ghost" onClick={() => setShowManualForm(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
