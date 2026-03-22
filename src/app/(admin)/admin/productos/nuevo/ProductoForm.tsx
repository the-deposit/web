"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Barcode,
  Tag,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { slugify } from "@/lib/utils";
import { createProduct, updateProduct, type ProductFormData } from "../actions";

type Category = { id: string; name: string };
type MeasurementUnit = {
  id: string;
  name: string;
  abbreviation: string;
  category: string;
};

type PresentationForm = {
  id?: string;
  name: string;
  barcode: string;
  quantity_value: string;
  quantity_unit_id: string;
  sale_price: string;
  cost_price: string;
  competitor_price: string;
  stock: string;
  min_stock: string;
  units_per_presentation: string;
  expiration_date: string;
  is_active: boolean;
};

const emptyPresentation = (): PresentationForm => ({
  name: "",
  barcode: "",
  quantity_value: "",
  quantity_unit_id: "",
  sale_price: "",
  cost_price: "",
  competitor_price: "",
  stock: "0",
  min_stock: "0",
  units_per_presentation: "1",
  expiration_date: "",
  is_active: true,
});

type ProductState = {
  name: string;
  slug: string;
  description: string;
  category_id: string;
  brand: string;
  tagInput: string;
  tags: string[];
  images: string[];
  is_featured: boolean;
  is_active: boolean;
};

interface ProductoFormProps {
  categories: Category[];
  units: MeasurementUnit[];
  initialProduct?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category_id: string | null;
    brand: string | null;
    tags: string[];
    images: string[];
    is_featured: boolean;
    is_active: boolean;
  };
  initialPresentations?: Array<{
    id: string;
    name: string;
    barcode: string | null;
    quantity_value: number | null;
    quantity_unit_id: string | null;
    sale_price: number;
    cost_price: number;
    competitor_price: number | null;
    stock: number;
    min_stock: number;
    units_per_presentation: number;
    expiration_date: string | null;
    is_active: boolean;
  }>;
}

export function ProductoForm({
  categories,
  units,
  initialProduct,
  initialPresentations,
}: ProductoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [scannerOpenFor, setScannerOpenFor] = useState<number | null>(null);

  const [product, setProduct] = useState<ProductState>({
    name: initialProduct?.name ?? "",
    slug: initialProduct?.slug ?? "",
    description: initialProduct?.description ?? "",
    category_id: initialProduct?.category_id ?? "",
    brand: initialProduct?.brand ?? "",
    tagInput: "",
    tags: initialProduct?.tags ?? [],
    images: initialProduct?.images ?? [],
    is_featured: initialProduct?.is_featured ?? false,
    is_active: initialProduct?.is_active ?? true,
  });

  const [presentations, setPresentations] = useState<PresentationForm[]>(
    initialPresentations && initialPresentations.length > 0
      ? initialPresentations.map((p) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode ?? "",
          quantity_value: p.quantity_value != null ? String(p.quantity_value) : "",
          quantity_unit_id: p.quantity_unit_id ?? "",
          sale_price: String(p.sale_price),
          cost_price: String(p.cost_price),
          competitor_price: p.competitor_price != null ? String(p.competitor_price) : "",
          stock: String(p.stock),
          min_stock: String(p.min_stock),
          units_per_presentation: String(p.units_per_presentation),
          expiration_date: p.expiration_date ?? "",
          is_active: p.is_active,
        }))
      : []
  );

  const [collapsedPresentations, setCollapsedPresentations] = useState<Set<number>>(new Set());

  const handleNameChange = (name: string) => {
    setProduct((prev) => ({
      ...prev,
      name,
      slug: initialProduct ? prev.slug : slugify(name),
    }));
  };

  const addTag = () => {
    const tag = product.tagInput.trim();
    if (tag && !product.tags.includes(tag)) {
      setProduct((prev) => ({ ...prev, tags: [...prev.tags, tag], tagInput: "" }));
    }
  };

  const removeTag = (tag: string) => {
    setProduct((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const addPresentation = () => {
    setPresentations((prev) => [...prev, emptyPresentation()]);
  };

  const updatePresentation = (idx: number, field: keyof PresentationForm, value: string | boolean) => {
    setPresentations((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  };

  const removePresentation = (idx: number) => {
    setPresentations((prev) => prev.filter((_, i) => i !== idx));
    setCollapsedPresentations((prev) => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  };

  const toggleCollapse = (idx: number) => {
    setCollapsedPresentations((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!product.category_id) {
      setFormError("Selecciona una categoría");
      return;
    }

    const data: ProductFormData = {
      name: product.name,
      slug: product.slug,
      description: product.description || null,
      category_id: product.category_id,
      brand: product.brand || null,
      tags: product.tags,
      images: product.images,
      is_active: product.is_active,
      is_featured: product.is_featured,
      presentations: presentations.map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode || null,
        quantity_value: p.quantity_value ? parseFloat(p.quantity_value) : null,
        quantity_unit_id: p.quantity_unit_id || null,
        sale_price: parseFloat(p.sale_price) || 0,
        cost_price: parseFloat(p.cost_price) || 0,
        competitor_price: p.competitor_price ? parseFloat(p.competitor_price) : null,
        stock: parseInt(p.stock) || 0,
        min_stock: parseInt(p.min_stock) || 0,
        units_per_presentation: parseInt(p.units_per_presentation) || 1,
        expiration_date: p.expiration_date || null,
        is_active: p.is_active,
      })),
    };

    startTransition(async () => {
      const result = initialProduct
        ? await updateProduct(initialProduct.id, data)
        : await createProduct(data);

      if (!result.success) {
        setFormError(result.error ?? "Error al guardar el producto");
      } else {
        router.push("/admin/productos");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {/* Section 1 — Información del producto */}
      <div className="bg-secondary rounded-lg border border-border p-4 md:p-6 space-y-4">
        <h2 className="font-display text-lg text-primary">Información del producto</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre *"
            required
            value={product.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ej: Agua Pura Cristal"
          />
          <Input
            label="Slug (URL)"
            required
            value={product.slug}
            onChange={(e) => setProduct((p) => ({ ...p, slug: e.target.value }))}
            placeholder="agua-pura-cristal"
            hint="Se genera automáticamente desde el nombre"
          />
        </div>

        <Textarea
          label="Descripción"
          value={product.description}
          onChange={(e) => setProduct((p) => ({ ...p, description: e.target.value }))}
          rows={3}
          placeholder="Descripción del producto"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Categoría *"
            required
            value={product.category_id}
            onChange={(e) => setProduct((p) => ({ ...p, category_id: e.target.value }))}
          >
            <option value="">— Seleccionar categoría —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Marca"
            value={product.brand}
            onChange={(e) => setProduct((p) => ({ ...p, brand: e.target.value }))}
            placeholder="Ej: Cristal"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Tags</label>
          <div className="flex gap-2">
            <Input
              value={product.tagInput}
              onChange={(e) => setProduct((p) => ({ ...p, tagInput: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Escribe y presiona Enter"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addTag}>
              <Tag className="w-4 h-4" />
            </Button>
          </div>
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-gray-light border border-border px-2.5 py-1 rounded text-xs font-body text-primary"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-error transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={product.is_featured}
              onChange={(e) => setProduct((p) => ({ ...p, is_featured: e.target.checked }))}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm font-body text-primary">Destacado</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={product.is_active}
              onChange={(e) => setProduct((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm font-body text-primary">Activo</span>
          </label>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">Imágenes</label>
          <ImageUpload
            images={product.images}
            onChange={(urls) => setProduct((p) => ({ ...p, images: urls }))}
            maxImages={6}
          />
        </div>
      </div>

      {/* Section 2 — Presentaciones */}
      <div className="bg-secondary rounded-lg border border-border p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-primary">
            Presentaciones
            {presentations.length > 0 && (
              <span className="ml-2 text-base font-body text-gray-mid">
                ({presentations.length})
              </span>
            )}
          </h2>
          <Button type="button" variant="secondary" size="sm" onClick={addPresentation}>
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
        </div>

        {presentations.length === 0 && (
          <p className="text-sm text-gray-mid text-center py-8">
            Sin presentaciones. Agrega al menos una para fijar el precio.
          </p>
        )}

        <div className="space-y-4">
          {presentations.map((pres, idx) => (
            <div key={idx} className="border border-border rounded-lg overflow-hidden">
              {/* Presentation header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-light">
                <button
                  type="button"
                  onClick={() => toggleCollapse(idx)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <span className="font-body font-medium text-primary text-sm">
                    {pres.name || `Presentación ${idx + 1}`}
                  </span>
                  {collapsedPresentations.has(idx) ? (
                    <ChevronDown className="w-4 h-4 text-gray-mid" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-gray-mid" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removePresentation(idx)}
                  className="p-1 rounded hover:bg-error/10 text-gray-mid hover:text-error transition-colors ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Presentation fields */}
              {!collapsedPresentations.has(idx) && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nombre de presentación *"
                      required
                      value={pres.name}
                      onChange={(e) => updatePresentation(idx, "name", e.target.value)}
                      placeholder="Ej: Fardo 24 unidades"
                    />
                    {/* Barcode */}
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">
                        Código de barras
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={pres.barcode}
                          onChange={(e) => updatePresentation(idx, "barcode", e.target.value)}
                          placeholder="EAN/UPC"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setScannerOpenFor(idx)}
                          className="shrink-0"
                        >
                          <Barcode className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Cantidad"
                      type="number"
                      min="0"
                      step="0.001"
                      value={pres.quantity_value}
                      onChange={(e) => updatePresentation(idx, "quantity_value", e.target.value)}
                      placeholder="750"
                    />
                    <Select
                      label="Unidad"
                      value={pres.quantity_unit_id}
                      onChange={(e) => updatePresentation(idx, "quantity_unit_id", e.target.value)}
                    >
                      <option value="">— Seleccionar —</option>
                      {(["peso", "volumen", "cantidad"] as const).map((cat) => {
                        const catUnits = units.filter((u) => u.category === cat);
                        if (catUnits.length === 0) return null;
                        return (
                          <optgroup
                            key={cat}
                            label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                          >
                            {catUnits.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.abbreviation})
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </Select>
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Precio de venta *"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={pres.sale_price}
                      onChange={(e) => updatePresentation(idx, "sale_price", e.target.value)}
                      placeholder="0.00"
                    />
                    <Input
                      label="Costo"
                      type="number"
                      min="0"
                      step="0.01"
                      value={pres.cost_price}
                      onChange={(e) => updatePresentation(idx, "cost_price", e.target.value)}
                      placeholder="0.00"
                    />
                    <Input
                      label="Precio competencia"
                      type="number"
                      min="0"
                      step="0.01"
                      value={pres.competitor_price}
                      onChange={(e) => updatePresentation(idx, "competitor_price", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Stock */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Input
                      label="Stock actual"
                      type="number"
                      min="0"
                      value={pres.stock}
                      onChange={(e) => updatePresentation(idx, "stock", e.target.value)}
                    />
                    <Input
                      label="Stock mínimo"
                      type="number"
                      min="0"
                      value={pres.min_stock}
                      onChange={(e) => updatePresentation(idx, "min_stock", e.target.value)}
                    />
                    <Input
                      label="Unidades / presentación"
                      type="number"
                      min="1"
                      value={pres.units_per_presentation}
                      onChange={(e) =>
                        updatePresentation(idx, "units_per_presentation", e.target.value)
                      }
                    />
                    <Input
                      label="Fecha de vencimiento"
                      type="date"
                      value={pres.expiration_date}
                      onChange={(e) => updatePresentation(idx, "expiration_date", e.target.value)}
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pres.is_active}
                      onChange={(e) => updatePresentation(idx, "is_active", e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm font-body text-primary">Presentación activa</span>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {formError && (
        <p className="text-sm text-error bg-error/10 px-4 py-3 rounded border border-error/20">
          {formError}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/admin/productos")}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={isPending}>
          {initialProduct ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>

      {/* Barcode scanner overlay */}
      {scannerOpenFor !== null && (
        <BarcodeScanner
          onScan={(code) => {
            updatePresentation(scannerOpenFor, "barcode", code);
            setScannerOpenFor(null);
          }}
          onClose={() => setScannerOpenFor(null)}
        />
      )}
    </form>
  );
}
