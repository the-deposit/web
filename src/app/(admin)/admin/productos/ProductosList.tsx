"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, Plus, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { deleteProduct } from "./actions";

type Category = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  categories: { name: string } | null;
  presentations_count: number;
  min_price: number | null;
};

interface ProductosListProps {
  products: Product[];
  categories: Category[];
}

export function ProductosList({ products, categories }: ProductosListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCat = !catFilter || p.category_id === catFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" ? p.is_active : !p.is_active);
    return matchesSearch && matchesCat && matchesStatus;
  });

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    startTransition(async () => {
      await deleteProduct(deletingId);
      setDeleteOpen(false);
      setDeletingId(null);
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-primary">Productos</h1>
        <Button size="sm" onClick={() => router.push("/admin/productos/nuevo")}>
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre o marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="sm:w-48"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-36"
        >
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay productos"
          description={
            search || catFilter || statusFilter
              ? "No se encontraron productos con esos filtros."
              : "Crea tu primer producto para comenzar."
          }
          action={
            !search && !catFilter && !statusFilter ? (
              <Button size="sm" onClick={() => router.push("/admin/productos/nuevo")}>
                <Plus className="w-4 h-4" />
                Nuevo Producto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-secondary rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead className="bg-gray-light border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-primary">Producto</th>
                  <th className="text-left px-4 py-3 font-medium text-primary">Categoría</th>
                  <th className="text-left px-4 py-3 font-medium text-primary">Presentaciones</th>
                  <th className="text-left px-4 py-3 font-medium text-primary">Precio desde</th>
                  <th className="text-left px-4 py-3 font-medium text-primary">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-primary">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-light/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.images[0].replace("/upload/", "/upload/w_80,h_80,c_fill/")}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded border border-border bg-gray-light flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-border" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-primary">{p.name}</p>
                          {p.brand && <p className="text-xs text-gray-mid">{p.brand}</p>}
                          {p.is_featured && (
                            <Badge variant="info" className="mt-0.5">Destacado</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-mid">
                      {p.categories?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-mid">
                      {p.presentations_count}
                    </td>
                    <td className="px-4 py-3 text-primary font-medium">
                      {p.min_price != null ? formatCurrency(p.min_price) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.is_active ? "success" : "outline"}>
                        {p.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/admin/productos/${p.id}`)}
                          className="p-1.5 rounded hover:bg-gray-light text-gray-mid hover:text-primary transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDelete(p.id)}
                          className="p-1.5 rounded hover:bg-error/10 text-gray-mid hover:text-error transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-secondary rounded-lg border border-border p-4">
                <div className="flex items-start gap-3">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.images[0].replace("/upload/", "/upload/w_80,h_80,c_fill/")}
                      alt={p.name}
                      className="w-14 h-14 object-cover rounded border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded border border-border bg-gray-light flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-border" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-primary font-body truncate">{p.name}</p>
                      <Badge variant={p.is_active ? "success" : "outline"} className="shrink-0">
                        {p.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    {p.brand && <p className="text-xs text-gray-mid mt-0.5">{p.brand}</p>}
                    <p className="text-xs text-gray-mid mt-1">
                      {p.categories?.name ?? "Sin categoría"} · {p.presentations_count} presentaciones
                    </p>
                    {p.min_price != null && (
                      <p className="text-sm font-medium text-primary mt-1">
                        Desde {formatCurrency(p.min_price)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/admin/productos/${p.id}`)}
                    className="flex-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openDelete(p.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-error" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Desactivar producto"
        message="El producto será marcado como inactivo y no aparecerá en la tienda."
        confirmLabel="Desactivar"
        loading={isPending}
      />
    </div>
  );
}
