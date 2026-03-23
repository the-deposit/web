import { z } from "zod";

export const CategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  image_url: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export type CategoryFormData = z.infer<typeof CategorySchema>;

export const SupplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  nit: z.string().optional().nullable(),
  contact_info: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type SupplierFormData = z.infer<typeof SupplierSchema>;

export const ProductSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  slug: z.string().min(1, "El slug es requerido"),
  description: z.string().optional().nullable(),
  category_id: z.string().uuid("Selecciona una categoría válida"),
  brand: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export type ProductFormData = z.infer<typeof ProductSchema>;

export const PresentationSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string().min(1, "El nombre es requerido"),
  barcode: z.string().optional().nullable(),
  quantity_value: z.coerce
    .number()
    .min(0, "La cantidad debe ser positiva")
    .optional()
    .nullable(),
  quantity_unit_id: z.string().uuid().optional().nullable(),
  sale_price: z.coerce.number().min(0, "El precio de venta debe ser positivo"),
  cost_price: z.coerce.number().min(0, "El costo debe ser positivo"),
  competitor_price: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().default(0),
  min_stock: z.coerce.number().int().default(0),
  units_per_presentation: z.coerce.number().int().min(1).default(1),
  expiration_date: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type PresentationFormData = z.infer<typeof PresentationSchema>;

export const MeasurementUnitSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  abbreviation: z.string().min(1, "La abreviatura es requerida"),
  category: z.enum(["peso", "volumen", "cantidad"]),
  is_active: z.boolean().default(true),
});

export type MeasurementUnitFormData = z.infer<typeof MeasurementUnitSchema>;
