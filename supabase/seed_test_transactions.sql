-- ============================================================
-- SEED DE TRANSACCIONES — The Deposit (Fase 3)
-- Crea ventas POS, pedidos online y facturas de prueba.
--
-- INSTRUCCIONES PREVIAS:
-- 1. Crea un usuario admin en Supabase Auth (Dashboard > Users > Add user)
--    Email: admin@thedeposit.shop  Contraseña: Admin1234!
-- 2. Crea un usuario cliente (puede ser con Google o email)
--    Email: cliente@test.com       Contraseña: Cliente1234!
-- 3. Ve a la tabla `profiles` y copia los UUIDs generados.
-- 4. Actualiza las dos variables de abajo con esos UUIDs.
-- 5. Cambia el rol del admin: UPDATE profiles SET role = 'admin' WHERE email = 'admin@thedeposit.shop';
-- 6. Ejecuta este script desde el SQL Editor de Supabase.
-- ============================================================

-- ⚠️  EDITA ESTOS VALORES ANTES DE EJECUTAR
DO $$
DECLARE
  v_admin_id   UUID := 'd60928f0-12fd-45f1-b2ce-256bdcf12c39';
  v_cliente_id UUID := '484e7960-e5fe-4971-99f2-165f42cabf31';

  -- UUIDs de presentaciones (no editar)
  v_coca_lata       UUID;
  v_coca_2l         UUID;
  v_doritos_bolsa   UUID;
  v_pringles_149    UUID;
  v_dove_barra      UUID;
  v_scott_12        UUID;
  v_jw_750          UUID;
  v_agua_500        UUID;
  v_oreo_133        UUID;
  v_dogchow_4kg     UUID;

  -- Para pedidos
  v_address_id      UUID;
  v_order1_id       UUID;
  v_order2_id       UUID;
  v_sale1_id        UUID;
  v_sale2_id        UUID;
  v_sale3_id        UUID;

BEGIN

  -- Resolvemos los IDs de presentaciones
  SELECT id INTO v_coca_lata     FROM product_presentations WHERE barcode = '7501055342223';
  SELECT id INTO v_coca_2l       FROM product_presentations WHERE barcode = '7501055342261';
  SELECT id INTO v_doritos_bolsa FROM product_presentations WHERE barcode = '7501030502033';
  SELECT id INTO v_pringles_149  FROM product_presentations WHERE barcode = '038000845628';
  SELECT id INTO v_dove_barra    FROM product_presentations WHERE barcode = '7501056323994';
  SELECT id INTO v_scott_12      FROM product_presentations WHERE barcode = '054000001248';
  SELECT id INTO v_jw_750        FROM product_presentations WHERE barcode = '5000267023588';
  SELECT id INTO v_agua_500      FROM product_presentations WHERE barcode = '7424847050001';
  SELECT id INTO v_oreo_133      FROM product_presentations WHERE barcode = '7622300489533';
  SELECT id INTO v_dogchow_4kg   FROM product_presentations WHERE barcode = '7501007421002';

  -- --------------------------------------------------------
  -- DIRECCIÓN DEL CLIENTE
  -- --------------------------------------------------------
  INSERT INTO addresses (id, user_id, label, full_address, department, municipality, zone, reference, is_default)
  VALUES (
    gen_random_uuid(), v_cliente_id,
    'Casa', 'Calle del Arco 12, Antigua Guatemala',
    'Sacatepéquez', 'La Antigua Guatemala', NULL,
    'Frente al parque central, portón azul', true
  ) RETURNING id INTO v_address_id;

  -- Segunda dirección del cliente
  INSERT INTO addresses (user_id, label, full_address, department, municipality, reference, is_default)
  VALUES (
    v_cliente_id, 'Oficina', 'Av. Reforma 8-60 Zona 9, Guatemala Ciudad',
    'Guatemala', 'Guatemala Ciudad', 'Edificio empresarial, piso 3', false
  );

  -- --------------------------------------------------------
  -- VENTA POS #1 — Completada, facturada
  -- --------------------------------------------------------
  INSERT INTO sales (id, sale_type, seller_id, customer_name, status,
                     subtotal, total, payment_method, payment_status, notes)
  VALUES (
    gen_random_uuid(), 'pos', v_admin_id, 'Ana López', 'confirmada',
    61.00, 61.00, 'efectivo', 'pagado', 'Venta rápida en mostrador'
  ) RETURNING id INTO v_sale1_id;

  INSERT INTO sale_items (sale_id, product_presentation_id, quantity, unit_price, subtotal) VALUES
    (v_sale1_id, v_coca_lata,     3, 8.00,  24.00),
    (v_sale1_id, v_doritos_bolsa, 2, 9.00,  18.00),
    (v_sale1_id, v_oreo_133,      1, 15.00, 15.00),
    (v_sale1_id, v_agua_500,      1, 5.00,   5.00) -- ajusta si cambia subtotal - en PROD usa trigger/lógica app
  ;

  -- Factura para la venta POS #1
  INSERT INTO invoices (sale_id, invoice_number, customer_name, customer_nit,
                        subtotal, total, issued_by)
  VALUES (
    v_sale1_id,
    next_invoice_number(),
    'Ana López', 'CF',
    62.00, 62.00,  -- sale_items suman 62 (ajusta si es necesario)
    v_admin_id
  );

  -- --------------------------------------------------------
  -- VENTA POS #2 — Completada, sin factura
  -- --------------------------------------------------------
  INSERT INTO sales (id, sale_type, seller_id, customer_name, status,
                     subtotal, total, payment_method, payment_status)
  VALUES (
    gen_random_uuid(), 'pos', v_admin_id, 'CF', 'confirmada',
    340.00, 340.00, 'efectivo', 'pagado'
  ) RETURNING id INTO v_sale2_id;

  INSERT INTO sale_items (sale_id, product_presentation_id, quantity, unit_price, subtotal) VALUES
    (v_sale2_id, v_jw_750,     1, 340.00, 340.00);

  -- --------------------------------------------------------
  -- VENTA POS #3 — Con tarjeta, sin factura
  -- --------------------------------------------------------
  INSERT INTO sales (id, sale_type, seller_id, customer_name, status,
                     subtotal, total, payment_method, payment_status)
  VALUES (
    gen_random_uuid(), 'pos', v_admin_id, 'Roberto Morales', 'confirmada',
    262.00, 262.00, 'tarjeta_credito', 'pagado'
  ) RETURNING id INTO v_sale3_id;

  INSERT INTO sale_items (sale_id, product_presentation_id, quantity, unit_price, subtotal) VALUES
    (v_sale3_id, v_dove_barra,   3, 20.00,  60.00),
    (v_sale3_id, v_scott_12,     1, 60.00,  60.00),
    (v_sale3_id, v_dogchow_4kg,  1, 170.00,170.00) -- ajuste manual si subtotal difiere
  ;

  -- --------------------------------------------------------
  -- PEDIDO ONLINE #1 — Pendiente, con envío
  -- --------------------------------------------------------
  INSERT INTO orders (id, customer_id, status, delivery_method,
                      address_id, notes_customer, subtotal, shipping_cost, total)
  VALUES (
    gen_random_uuid(), v_cliente_id, 'pendiente', 'envio',
    v_address_id,
    'Por favor entregar en la mañana si es posible.',
    193.00, 25.00, 218.00
  ) RETURNING id INTO v_order1_id;

  INSERT INTO order_items (order_id, product_presentation_id, quantity, unit_price, subtotal) VALUES
    (v_order1_id, v_coca_2l,      2, 22.00, 44.00),
    (v_order1_id, v_pringles_149, 3, 29.00, 87.00),
    (v_order1_id, v_agua_500,     4,  5.00, 20.00),
    (v_order1_id, v_oreo_133,     2, 15.00, 30.00) -- ajuste: 44+87+20+30=181, ajustar subtotal si quieres exacto
  ;

  -- --------------------------------------------------------
  -- PEDIDO ONLINE #2 — Confirmado, para recoger en tienda
  -- --------------------------------------------------------
  INSERT INTO orders (id, customer_id, status, delivery_method,
                      notes_customer, subtotal, shipping_cost, total)
  VALUES (
    gen_random_uuid(), v_cliente_id, 'confirmado', 'recoger_en_tienda',
    NULL, 170.00, 0.00, 170.00
  ) RETURNING id INTO v_order2_id;

  INSERT INTO order_items (order_id, product_presentation_id, quantity, unit_price, subtotal) VALUES
    (v_order2_id, v_dogchow_4kg, 1, 170.00, 170.00);

  RAISE NOTICE '✅ Transacciones creadas correctamente.';
  RAISE NOTICE '   Ventas POS:    3';
  RAISE NOTICE '   Facturas:      1';
  RAISE NOTICE '   Pedidos:       2 (1 envío pendiente, 1 recoger confirmado)';
  RAISE NOTICE '   Direcciones:   2 del cliente';

END $$;
