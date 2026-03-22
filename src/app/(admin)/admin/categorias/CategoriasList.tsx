"use client";

import { useState, useTransition } from "react";
import { Edit2, Trash2, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { createCategory, updateCategory, deleteCategory } from "./actions";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  parent?: { name: string } | null;
};

interface CategoriasListProps {
  categories: Category[];
}

const emptyForm = {
  name: "",
  description: "",
  parent_id: "",
  sort_order: 0,
  is_active: true,
};

type FormState = typeof emptyForm;

export function CategoriasList({ categories }: CategoriasListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parentCategories = categories.filter((c) => !c.parent_id);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description ?? "",
      parent_id: cat.parent_id ?? "",
      sort_order: cat.sort_order,
      is_active: cat.is_active,
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
      description: form.description || undefined,
      parent_id: form.parent_id || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    startTransition(async () => {
      const result = editing
        ? await updateCategory(editing.id, payload)
        : await createCategory(payload);

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
      const result = await deleteCategory(deletingId);
      if (!result.success) {
        setFormError(result.error ?? "Error al eliminar");
      }
      setDeleteOpen(false);
      setDeletingId(null);
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-primary">Categorías</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-secondary rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm font-body">
          <thead className="bg-gray-light border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-primary">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-primary">Subcategoría de</th>
              <th className="text-left px-4 py-3 font-medium text-primary">Orden</th>
              <th className="text-left px-4 py-3 font-medium text-primary">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-primary">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-light/50 transition-colors">
                <td className="px-4 py-3 font-medium text-primary">{cat.name}</td>
                <td className="px-4 py-3 text-gray-mid">
                  {cat.parent?.name ?? <span className="text-border italic">Categoría principal</span>}
                </td>
                <td className="px-4 py-3 text-gray-mid">{cat.sort_order}</td>
                <td className="px-4 py-3">
                  <Badge variant={cat.is_active ? "success" : "outline"}>
                    {cat.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1.5 rounded hover:bg-gray-light text-gray-mid hover:text-primary transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDelete(cat.id)}
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
        {categories.length === 0 && (
          <div className="py-16 text-center text-gray-mid text-sm">
            No hay categorías aún. Crea la primera.
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-secondary rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-primary font-body">{cat.name}</p>
                {cat.parent?.name && (
                  <p className="text-xs text-gray-mid mt-0.5">↳ {cat.parent.name}</p>
                )}
              </div>
              <Badge variant={cat.is_active ? "success" : "outline"} className="shrink-0">
                {cat.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button variant="secondary" size="sm" onClick={() => openEdit(cat)}>
                <Edit2 className="w-3.5 h-3.5" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openDelete(cat.id)}>
                <Trash2 className="w-3.5 h-3.5 text-error" />
              </Button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="py-12 text-center text-gray-mid text-sm">
            No hay categorías aún.
          </div>
        )}
      </div>

      {/* Modal — create/edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Categoría" : "Nueva Categoría"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Bebidas"
          />
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Descripción opcional"
          />
          <Select
            label="Categoría padre"
            value={form.parent_id}
            onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
          >
            <option value="">— Ninguna (categoría principal) —</option>
            {parentCategories
              .filter((c) => !editing || c.id !== editing.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>

          <div className="flex items-center gap-4">
            <Input
              label="Orden"
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })
              }
              className="w-24"
            />
            <label className="flex items-center gap-2 cursor-pointer mt-5">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm font-body text-primary">Activo</span>
            </label>
          </div>

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
              {editing ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar categoría"
        message="Si la categoría tiene productos asociados, se desactivará. De lo contrario, se eliminará permanentemente."
        confirmLabel="Eliminar"
        loading={isPending}
      />
    </div>
  );
}
