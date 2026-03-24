-- Fix: la política "Customers can cancel pending orders" no tenía WITH CHECK,
-- por lo que Postgres aplicaba el USING (status = 'pendiente') también como
-- check post-update. Al cancelar el status cambia a 'cancelado', lo cual
-- hacía fallar silenciosamente el UPDATE.
--
-- USING  → condición PRE-update: solo permite tocar pedidos pendientes propios.
-- WITH CHECK → condición POST-update: solo exige que el pedido siga siendo del mismo cliente.

DROP POLICY IF EXISTS "Customers can cancel pending orders" ON orders;

CREATE POLICY "Customers can update pending orders" ON orders
  FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'pendiente')
  WITH CHECK (customer_id = auth.uid());
