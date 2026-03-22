-- ============================================================
-- FASE 3: Índices adicionales y ajustes
-- Las tablas sales, sale_items, orders, order_items, invoices,
-- shipments, y sus RLS ya están en 001_initial_schema.sql
-- Este archivo solo agrega índices de rendimiento faltantes.
-- ============================================================

-- Índices faltantes en orders
CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON orders(delivery_method);

-- Índices faltantes en sales
CREATE INDEX IF NOT EXISTS idx_sales_sale_type ON sales(sale_type);

-- Índice para búsqueda de presentación por id en sale_items
CREATE INDEX IF NOT EXISTS idx_sale_items_presentation_id ON sale_items(product_presentation_id);

-- Índice para búsqueda de presentación por id en order_items
CREATE INDEX IF NOT EXISTS idx_order_items_presentation_id ON order_items(product_presentation_id);
