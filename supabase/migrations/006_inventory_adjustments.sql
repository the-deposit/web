-- Tabla para registrar ajustes manuales de inventario
CREATE TABLE inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES product_presentations(id) ON DELETE CASCADE,
  adjusted_by UUID NOT NULL REFERENCES profiles(id),
  quantity_change INTEGER NOT NULL, -- positivo = entrada, negativo = salida/pérdida
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view inventory adjustments"
  ON inventory_adjustments FOR SELECT
  USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Staff can insert inventory adjustments"
  ON inventory_adjustments FOR INSERT
  WITH CHECK (get_user_role() IN ('vendedor', 'admin'));
