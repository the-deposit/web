-- ============================================================
-- FASE 3 FIXES
-- ============================================================

-- NIT para proveedores
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS nit TEXT;

-- Monto pagado en ventas (para pago parcial)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0;

-- NIT del cliente en pedidos online
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_nit TEXT NOT NULL DEFAULT 'CF';
