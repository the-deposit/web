-- ============================================================
-- SEED — The Deposit
-- Datos maestros: unidades, categorías, proveedores,
-- productos y presentaciones.
-- NO depende de auth.users — se puede correr sin usuarios.
-- ============================================================

-- ============================================================
-- MEASUREMENT UNITS
-- ============================================================
INSERT INTO measurement_units (name, abbreviation, category) VALUES
  -- Peso
  ('Gramos',    'g',      'peso'),
  ('Kilogramos','kg',     'peso'),
  ('Libras',    'lb',     'peso'),
  ('Onzas',     'oz',     'peso'),
  -- Volumen
  ('Mililitros',    'ml',    'volumen'),
  ('Litros',        'l',     'volumen'),
  ('Onzas líquidas','fl_oz', 'volumen'),
  -- Cantidad
  ('Unidades', 'unidad', 'cantidad'),
  ('Resma',    'resma',  'cantidad'),
  ('Barra',    'barra',  'cantidad'),
  ('Filete',   'filete', 'cantidad');

-- ============================================================
-- CATEGORIES
-- ============================================================
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Alimentos',            'alimentos',         1),
  ('Bebidas',              'bebidas',            2),
  ('Licores',              'licores',            3),
  ('Limpieza',             'limpieza',           4),
  ('Cuidado Personal',     'cuidado-personal',   5),
  ('Mascotas',             'mascotas',           6),
  ('Bebé',                 'bebe',               7),
  ('Hogar',                'hogar',              8),
  ('Ropa',                 'ropa',               9),
  ('Farmacia',             'farmacia',           10),
  ('Oficina',              'oficina',            11),
  ('Juguetes y Recreación','juguetes-recreacion',12);

-- Subcategorías
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Galletas',            'galletas',           id, 1 FROM categories WHERE slug = 'alimentos';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Cereales',            'cereales',           id, 2 FROM categories WHERE slug = 'alimentos';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Dulces',              'dulces',             id, 3 FROM categories WHERE slug = 'alimentos';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Chocolates',          'chocolates',         id, 4 FROM categories WHERE slug = 'alimentos';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Snacks',              'snacks',             id, 5 FROM categories WHERE slug = 'alimentos';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Salsas y Condimentos','salsas-condimentos', id, 6 FROM categories WHERE slug = 'alimentos';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Gaseosas',            'gaseosas',           id, 1 FROM categories WHERE slug = 'bebidas';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Aguas',               'aguas',              id, 2 FROM categories WHERE slug = 'bebidas';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Bebidas Deportivas',  'bebidas-deportivas', id, 3 FROM categories WHERE slug = 'bebidas';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Café',                'cafe',               id, 4 FROM categories WHERE slug = 'bebidas';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Whisky',              'whisky',             id, 1 FROM categories WHERE slug = 'licores';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Ron',                 'ron',                id, 2 FROM categories WHERE slug = 'licores';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Tequila',             'tequila',            id, 3 FROM categories WHERE slug = 'licores';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Gin',                 'gin',                id, 4 FROM categories WHERE slug = 'licores';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Vodka',               'vodka',              id, 5 FROM categories WHERE slug = 'licores';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Vino',                'vino',               id, 6 FROM categories WHERE slug = 'licores';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Cerveza',             'cerveza',            id, 7 FROM categories WHERE slug = 'licores';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Alimento para Perro', 'alimento-perro',     id, 1 FROM categories WHERE slug = 'mascotas';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Alimento para Gato',  'alimento-gato',      id, 2 FROM categories WHERE slug = 'mascotas';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Papel Higiénico',     'papel-higienico',    id, 1 FROM categories WHERE slug = 'hogar';
INSERT INTO categories (name, slug, parent_id, sort_order)
  SELECT 'Servilletas',         'servilletas',        id, 2 FROM categories WHERE slug = 'hogar';

-- ============================================================
-- SUPPLIERS
-- ============================================================
INSERT INTO suppliers (name, address) VALUES
  ('PriceSmart San Cristóbal',     'San Cristóbal, Guatemala'),
  ('PriceSmart Escuintla',         'Escuintla, Guatemala'),
  ('PriceSmart Miraflores',        'Miraflores, Guatemala Ciudad'),
  ('PriceSmart Zona 10',           'Zona 10, Guatemala Ciudad'),
  ('Maxi Despensa Chimaltenango',  'Chimaltenango, Guatemala'),
  ('Maxi Despensa Escuintla',      'Escuintla, Guatemala'),
  ('La Torre El Parador',          'El Parador, Guatemala'),
  ('La Torre Plaza Telares',       'Plaza Telares, Guatemala'),
  ('La Torre La Esperanza',        'La Esperanza, Guatemala'),
  ('La Torre Online',              'En línea'),
  ('Paiz Petapa',                  'Petapa, Guatemala'),
  ('Paiz San Lucas',               'San Lucas Sacatepéquez, Guatemala'),
  ('Paiz En Línea',                'En línea'),
  ('Super 24',                     'Guatemala'),
  ('Casa del Ron Botran',          'Guatemala'),
  ('Liquor Store Antigua',         'La Antigua Guatemala'),
  ('La Vinoteca Antigua',          'La Antigua Guatemala'),
  ('La Bodegona Antigua',          'La Antigua Guatemala');

-- ============================================================
-- PRODUCTS (UUIDs fijos para referenciar en presentaciones)
-- ============================================================
INSERT INTO products (id, name, slug, description, category_id, brand, is_active, is_featured) VALUES

  -- 1. Coca-Cola
  ('11111111-0000-0000-0000-000000000001',
   'Coca-Cola', 'coca-cola',
   'La bebida más refrescante, disponible en varias presentaciones.',
   (SELECT id FROM categories WHERE slug = 'gaseosas'),
   'Coca-Cola', true, true),

  -- 2. Sprite
  ('11111111-0000-0000-0000-000000000002',
   'Sprite', 'sprite',
   'Refresco de limón-lima sin cafeína.',
   (SELECT id FROM categories WHERE slug = 'gaseosas'),
   'Coca-Cola', true, false),

  -- 3. Doritos
  ('11111111-0000-0000-0000-000000000003',
   'Doritos Nacho', 'doritos-nacho',
   'Totopos de maíz sabor nacho, crujientes y deliciosos.',
   (SELECT id FROM categories WHERE slug = 'snacks'),
   'Frito-Lay', true, true),

  -- 4. Pringles
  ('11111111-0000-0000-0000-000000000004',
   'Pringles Original', 'pringles-original',
   'Las papas en lata que nunca dejan de sorprender.',
   (SELECT id FROM categories WHERE slug = 'snacks'),
   'Pringles', true, true),

  -- 5. Dove Barra
  ('11111111-0000-0000-0000-000000000005',
   'Jabón Dove', 'jabon-dove',
   'Jabón de barra con 1/4 crema hidratante. Piel suave y nutrida.',
   (SELECT id FROM categories WHERE slug = 'cuidado-personal'),
   'Dove', true, false),

  -- 6. Scott Papel Higiénico
  ('11111111-0000-0000-0000-000000000006',
   'Papel Higiénico Scott', 'papel-higienico-scott',
   'Papel higiénico doble hoja, resistente y suave.',
   (SELECT id FROM categories WHERE slug = 'papel-higienico'),
   'Scott', true, false),

  -- 7. Folgers Café
  ('11111111-0000-0000-0000-000000000007',
   'Café Folgers', 'cafe-folgers',
   'Café molido clásico americano, aroma intenso.',
   (SELECT id FROM categories WHERE slug = 'cafe'),
   'Folgers', true, false),

  -- 8. Dog Chow Adulto
  ('11111111-0000-0000-0000-000000000008',
   'Purina Dog Chow Adulto', 'purina-dog-chow-adulto',
   'Alimento completo para perros adultos de todas las razas.',
   (SELECT id FROM categories WHERE slug = 'alimento-perro'),
   'Purina', true, false),

  -- 9. Johnnie Walker Red Label
  ('11111111-0000-0000-0000-000000000009',
   'Johnnie Walker Red Label', 'johnnie-walker-red-label',
   'Whisky escocés blended, suave y accesible.',
   (SELECT id FROM categories WHERE slug = 'whisky'),
   'Johnnie Walker', true, true),

  -- 10. Agua Pura Salvavidas
  ('11111111-0000-0000-0000-000000000010',
   'Agua Pura Salvavidas', 'agua-pura-salvavidas',
   'Agua purificada guatemalteca, garantía de pureza.',
   (SELECT id FROM categories WHERE slug = 'aguas'),
   'Salvavidas', true, false),

  -- 11. Oreo
  ('11111111-0000-0000-0000-000000000011',
   'Galleta Oreo', 'galleta-oreo',
   'La icónica galleta de chocolate con crema, perfecta para mojar.',
   (SELECT id FROM categories WHERE slug = 'galletas'),
   'Nabisco', true, true),

  -- 12. Cat Chow
  ('11111111-0000-0000-0000-000000000012',
   'Purina Cat Chow Adulto', 'purina-cat-chow-adulto',
   'Alimento completo para gatos adultos, con proteínas de calidad.',
   (SELECT id FROM categories WHERE slug = 'alimento-gato'),
   'Purina', true, false);

-- ============================================================
-- PRODUCT PRESENTATIONS
-- Columnas: product_id, name, barcode, quantity_value,
--           quantity_unit_id, sale_price, cost_price,
--           competitor_price, stock, min_stock,
--           units_per_presentation
-- ============================================================

-- ---- Coca-Cola ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Lata 355ml',   '7501055342223', 355,  (SELECT id FROM measurement_units WHERE abbreviation='ml'), 8.00,  5.50,  9.00,  120, 24, 1),
  ('11111111-0000-0000-0000-000000000001', 'Botella 600ml','7501055342247', 600,  (SELECT id FROM measurement_units WHERE abbreviation='ml'), 10.00, 7.00,  11.50, 80,  12, 1),
  ('11111111-0000-0000-0000-000000000001', 'Botella 2L',   '7501055342261', 2000, (SELECT id FROM measurement_units WHERE abbreviation='ml'), 22.00, 15.00, 25.00, 60,  12, 1),
  ('11111111-0000-0000-0000-000000000001', 'Pack 6 Latas', '7501055399998', NULL, NULL,                                                        42.00, 30.00, 50.00, 30,  6,  6);

-- ---- Sprite ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000002', 'Lata 355ml',   '7501055370417', 355,  (SELECT id FROM measurement_units WHERE abbreviation='ml'), 8.00,  5.50,  9.00,  90,  24, 1),
  ('11111111-0000-0000-0000-000000000002', 'Botella 600ml','7501055370431', 600,  (SELECT id FROM measurement_units WHERE abbreviation='ml'), 10.00, 7.00,  11.50, 50,  12, 1),
  ('11111111-0000-0000-0000-000000000002', 'Botella 2L',   '7501055370455', 2000, (SELECT id FROM measurement_units WHERE abbreviation='ml'), 22.00, 15.00, 25.00, 40,  12, 1);

-- ---- Doritos ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000003', 'Bolsa 55g',     '7501030502033', 55,  (SELECT id FROM measurement_units WHERE abbreviation='g'), 9.00,  6.50,  10.00, 100, 20, 1),
  ('11111111-0000-0000-0000-000000000003', 'Bolsa 340g',    '7501030502057', 340, (SELECT id FROM measurement_units WHERE abbreviation='g'), 42.00, 30.00, 48.00, 40,  8,  1),
  ('11111111-0000-0000-0000-000000000003', 'Caja 24 bolsas','7501030599990', NULL, NULL,                                                      195.00,140.00,210.00, 15,  3,  24);

-- ---- Pringles ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000004', 'Lata 149g',     '038000845628', 149, (SELECT id FROM measurement_units WHERE abbreviation='g'), 29.00, 20.00, 32.00, 60,  12, 1),
  ('11111111-0000-0000-0000-000000000004', 'Lata 274g',     '038000845642', 274, (SELECT id FROM measurement_units WHERE abbreviation='g'), 49.00, 35.00, 55.00, 35,  6,  1);

-- ---- Jabón Dove ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000005', 'Barra 90g',     '7501056323994', 90,  (SELECT id FROM measurement_units WHERE abbreviation='g'), 20.00, 14.00, 22.00, 150, 30, 1),
  ('11111111-0000-0000-0000-000000000005', 'Pack 4 barras', '7501056323987', 360, (SELECT id FROM measurement_units WHERE abbreviation='g'), 72.00, 52.00, 80.00, 50,  10, 4),
  ('11111111-0000-0000-0000-000000000005', 'Caja 12 barras','7501056399998', 1080,(SELECT id FROM measurement_units WHERE abbreviation='g'), 200.00,145.00,220.00, 20,  4,  12);

-- ---- Scott Papel Higiénico ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000006', 'Paquete 4 rollos', '054000001234', NULL, NULL, 22.00, 15.00, 25.00, 80,  20, 4),
  ('11111111-0000-0000-0000-000000000006', 'Paquete 12 rollos','054000001248', NULL, NULL, 60.00, 42.00, 68.00, 40,  8,  12),
  ('11111111-0000-0000-0000-000000000006', 'Paquete 24 rollos','054000001262', NULL, NULL, 115.00,80.00, 130.00,20,  4,  24);

-- ---- Café Folgers ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000007', 'Tarro 226g', '025500007001', 226, (SELECT id FROM measurement_units WHERE abbreviation='g'), 75.00,  55.00, 85.00, 40,  8,  1),
  ('11111111-0000-0000-0000-000000000007', 'Tarro 680g', '025500007002', 680, (SELECT id FROM measurement_units WHERE abbreviation='g'), 195.00,145.00,215.00,20,  4,  1);

-- ---- Dog Chow ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000008', 'Bolsa 1.5kg', '7501007421001', 1500, (SELECT id FROM measurement_units WHERE abbreviation='g'), 70.00,  50.00, 80.00,  60, 12, 1),
  ('11111111-0000-0000-0000-000000000008', 'Bolsa 4kg',   '7501007421002', 4000, (SELECT id FROM measurement_units WHERE abbreviation='g'), 170.00,125.00,190.00, 30, 6,  1),
  ('11111111-0000-0000-0000-000000000008', 'Bolsa 8kg',   '7501007421003', 8000, (SELECT id FROM measurement_units WHERE abbreviation='g'), 320.00,235.00,360.00, 15, 3,  1);

-- ---- Johnnie Walker Red Label ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000009', 'Botella 375ml', '5000267023571', 375,  (SELECT id FROM measurement_units WHERE abbreviation='ml'), 180.00,130.00,195.00, 24, 6,  1),
  ('11111111-0000-0000-0000-000000000009', 'Botella 750ml', '5000267023588', 750,  (SELECT id FROM measurement_units WHERE abbreviation='ml'), 340.00,250.00,365.00, 18, 3,  1),
  ('11111111-0000-0000-0000-000000000009', 'Botella 1L',    '5000267023595', 1000, (SELECT id FROM measurement_units WHERE abbreviation='ml'), 430.00,315.00,460.00, 10, 2,  1);

-- ---- Agua Salvavidas ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000010', 'Botella 500ml',  '7424847050001', 500,  (SELECT id FROM measurement_units WHERE abbreviation='ml'), 5.00,  3.50,  6.00,  200, 48, 1),
  ('11111111-0000-0000-0000-000000000010', 'Botella 1.5L',   '7424847050002', 1500, (SELECT id FROM measurement_units WHERE abbreviation='ml'), 10.00, 7.00,  12.00, 100, 24, 1),
  ('11111111-0000-0000-0000-000000000010', 'Pack 24 botellas','7424847099990', NULL, NULL,                                                       110.00,78.00, 130.00, 20,  4,  24);

-- ---- Oreo ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000011', 'Paquete 133g',   '7622300489533', 133, (SELECT id FROM measurement_units WHERE abbreviation='g'), 15.00, 10.00, 17.00, 120, 24, 1),
  ('11111111-0000-0000-0000-000000000011', 'Paquete 432g',   '7622300489557', 432, (SELECT id FROM measurement_units WHERE abbreviation='g'), 42.00, 30.00, 48.00, 60,  12, 1),
  ('11111111-0000-0000-0000-000000000011', 'Caja 12 paquetes','7622300499990', NULL, NULL,                                                       165.00,115.00,180.00,20,  4,  12);

-- ---- Cat Chow ----
INSERT INTO product_presentations
  (product_id, name, barcode, quantity_value, quantity_unit_id, sale_price, cost_price, competitor_price, stock, min_stock, units_per_presentation)
VALUES
  ('11111111-0000-0000-0000-000000000012', 'Bolsa 500g',  '7501007431001', 500,  (SELECT id FROM measurement_units WHERE abbreviation='g'), 35.00,  25.00, 40.00,  80, 16, 1),
  ('11111111-0000-0000-0000-000000000012', 'Bolsa 1.5kg', '7501007431002', 1500, (SELECT id FROM measurement_units WHERE abbreviation='g'), 90.00,  65.00, 100.00, 40, 8,  1),
  ('11111111-0000-0000-0000-000000000012', 'Bolsa 3kg',   '7501007431003', 3000, (SELECT id FROM measurement_units WHERE abbreviation='g'), 165.00,120.00,180.00,  20, 4,  1);
