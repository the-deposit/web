"use client";

import { useState, useTransition } from "react";
import { Edit2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { createMeasurementUnit, updateMeasurementUnit, toggleMeasurementUnit } from "./actions";

type MeasurementUnit = {
  id: string;
  name: string;
  abbreviation: string;
  category: "peso" | "volumen" | "cantidad";
  is_active: boolean;
};

interface UnidadesMedidaProps {
  units: MeasurementUnit[];
}

const categoryLabels: Record<string, string> = {
  peso: "Peso",
  volumen: "Volumen",
  cantidad: "Cantidad",
};

const emptyForm = {
  name: "",
  abbreviation: "",
  category: "cantidad" as "peso" | "volumen" | "cantidad",
  is_active: true,
};

type FormState = typeof emptyForm;

export function UnidadesMedida({ units }: UnidadesMedidaProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MeasurementUnit | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grouped = (["peso", "volumen", "cantidad"] as const).reduce(
    (acc, cat) => {
      acc[cat] = units.filter((u) => u.category === cat);
      return acc;
    },
    {} as Record<string, MeasurementUnit[]>
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (u: MeasurementUnit) => {
    setEditing(u);
    setForm({
      name: u.name,
      abbreviation: u.abbreviation,
      category: u.category,
      is_active: u.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      const result = editing
        ? await updateMeasurementUnit(editing.id, form)
        : await createMeasurementUnit(form);

      if (!result.success) {
        setFormError(result.error ?? "Error desconocido");
      } else {
        setModalOpen(false);
      }
    });
  };

  const handleToggle = (u: MeasurementUnit) => {
    startTransition(async () => {
      await toggleMeasurementUnit(u.id, !u.is_active);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl text-primary">Unidades de Medida</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4" />
          Nueva Unidad
        </Button>
      </div>

      <div className="space-y-6">
        {(["peso", "volumen", "cantidad"] as const).map((cat) => (
          <div key={cat}>
            <h3 className="font-body text-sm font-semibold text-gray-mid uppercase tracking-wider mb-3">
              {categoryLabels[cat]}
            </h3>
            <div className="bg-secondary rounded-lg border border-border overflow-hidden">
              {grouped[cat].length === 0 ? (
                <p className="text-sm text-gray-mid px-4 py-6 text-center">
                  No hay unidades de {categoryLabels[cat].toLowerCase()}
                </p>
              ) : (
                <table className="w-full text-sm font-body">
                  <thead className="bg-gray-light border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-primary">Nombre</th>
                      <th className="text-left px-4 py-2.5 font-medium text-primary">Abreviatura</th>
                      <th className="text-left px-4 py-2.5 font-medium text-primary">Estado</th>
                      <th className="text-right px-4 py-2.5 font-medium text-primary">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {grouped[cat].map((u) => (
                      <tr key={u.id} className="hover:bg-gray-light/50 transition-colors">
                        <td className="px-4 py-3 text-primary">{u.name}</td>
                        <td className="px-4 py-3">
                          <code className="bg-gray-light px-2 py-0.5 rounded text-xs font-mono text-primary">
                            {u.abbreviation}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={u.is_active ? "success" : "outline"}>
                            {u.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(u)}
                              className="p-1.5 rounded hover:bg-gray-light text-gray-mid hover:text-primary transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggle(u)}
                              disabled={isPending}
                              className="p-1.5 rounded hover:bg-gray-light text-gray-mid hover:text-primary transition-colors"
                              title={u.is_active ? "Desactivar" : "Activar"}
                            >
                              {u.is_active ? (
                                <ToggleRight className="w-4 h-4 text-success" />
                              ) : (
                                <ToggleLeft className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Unidad de Medida" : "Nueva Unidad de Medida"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Kilogramo"
          />
          <Input
            label="Abreviatura"
            required
            value={form.abbreviation}
            onChange={(e) => setForm({ ...form, abbreviation: e.target.value })}
            placeholder="Ej: kg"
          />
          <Select
            label="Categoría"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as "peso" | "volumen" | "cantidad" })
            }
          >
            <option value="peso">Peso</option>
            <option value="volumen">Volumen</option>
            <option value="cantidad">Cantidad</option>
          </Select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm font-body text-primary">Activa</span>
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
              {editing ? "Guardar cambios" : "Crear unidad"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
