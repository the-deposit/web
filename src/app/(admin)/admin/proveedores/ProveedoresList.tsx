"use client";

import { useState, useTransition } from "react";
import { Edit2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { createSupplier, updateSupplier, deleteSupplier } from "./actions";

type Supplier = {
  id: string;
  name: string;
  nit: string | null;
  contact_info: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
};

interface ProveedoresListProps {
  suppliers: Supplier[];
}

const emptyForm = {
  name: "",
  nit: "",
  contact_info: "",
  address: "",
  notes: "",
  is_active: true,
};

type FormState = typeof emptyForm;

export function ProveedoresList({ suppliers }: ProveedoresListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      nit: s.nit ?? "",
      contact_info: s.contact_info ?? "",
      address: s.address ?? "",
      notes: s.notes ?? "",
      is_active: s.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name: form.name,
      nit: form.nit || null,
      contact_info: form.contact_info || null,
      address: form.address || null,
      notes: form.notes || null,
      is_active: form.is_active,
    };

    startTransition(async () => {
      const result = editing
        ? await updateSupplier(editing.id, payload)
        : await createSupplier(payload);

      if (!result.success) {
        setFormError(result.error ?? "Error desconocido");
      } else {
        setModalOpen(false);
      }
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    startTransition(async () => {
      const result = await deleteSupplier(deletingId);
      if (!result.success) {
        setFormError(result.error ?? "Error al eliminar");
      }
      setDeleteOpen(false);
      setDeletingId(null);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-primary">Proveedores</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-secondary rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm font-body">
          <thead className="bg-gray-light border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-primary">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-primary">NIT</th>
              <th className="text-left px-4 py-3 font-medium text-primary">Contacto</th>
              <th className="text-left px-4 py-3 font-medium text-primary">Dirección</th>
              <th className="text-left px-4 py-3 font-medium text-primary">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-primary">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-light/50 transition-colors">
                <td className="px-4 py-3 font-medium text-primary">{s.name}</td>
                <td className="px-4 py-3 text-gray-mid">{s.nit ?? "—"}</td>
                <td className="px-4 py-3 text-gray-mid">{s.contact_info ?? "—"}</td>
                <td className="px-4 py-3 text-gray-mid">{s.address ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={s.is_active ? "success" : "outline"}>
                    {s.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 rounded hover:bg-gray-light text-gray-mid hover:text-primary transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDelete(s.id)}
                      className="p-1.5 rounded hover:bg-error/10 text-gray-mid hover:text-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && (
          <div className="py-16 text-center text-gray-mid text-sm">
            No hay proveedores aún.
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {suppliers.map((s) => (
          <div key={s.id} className="bg-secondary rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-primary font-body">{s.name}</p>
                {s.contact_info && (
                  <p className="text-xs text-gray-mid mt-0.5">{s.contact_info}</p>
                )}
                {s.address && (
                  <p className="text-xs text-gray-mid">{s.address}</p>
                )}
              </div>
              <Badge variant={s.is_active ? "success" : "outline"} className="shrink-0">
                {s.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>
                <Edit2 className="w-3.5 h-3.5" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openDelete(s.id)}>
                <Trash2 className="w-3.5 h-3.5 text-error" />
              </Button>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && (
          <div className="py-12 text-center text-gray-mid text-sm">
            No hay proveedores aún.
          </div>
        )}
      </div>

      {/* Modal — create/edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Proveedor" : "Nuevo Proveedor"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre del proveedor"
          />
          <Input
            label="NIT"
            value={form.nit}
            onChange={(e) => setForm({ ...form, nit: e.target.value })}
            placeholder="12345678-9"
          />
          <Input
            label="Información de contacto"
            value={form.contact_info}
            onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
            placeholder="Email, teléfono, etc."
          />
          <Input
            label="Dirección"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Dirección física"
          />
          <Textarea
            label="Notas"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Notas adicionales"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm font-body text-primary">Activo</span>
          </label>

          {formError && (
            <p className="text-sm text-error bg-error/10 px-3 py-2 rounded">{formError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              {editing ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Desactivar proveedor"
        message="El proveedor será marcado como inactivo. Esta acción se puede revertir editando el proveedor."
        confirmLabel="Desactivar"
        loading={isPending}
      />
    </div>
  );
}
