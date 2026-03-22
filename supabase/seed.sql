-- ============================================================
-- MEASUREMENT UNITS
-- ============================================================
INSERT INTO measurement_units (name, abbreviation, category) VALUES
  -- Peso
  ('Gramos', 'g', 'peso'),
  ('Kilogramos', 'kg', 'peso'),
  ('Libras', 'lb', 'peso'),
  ('Onzas', 'oz', 'peso'),
  -- Volumen
  ('Mililitros', 'ml', 'volumen'),
  ('Litros', 'l', 'volumen'),
  ('Onzas líquidas', 'fl_oz', 'volumen'),
  -- Cantidad
  ('Unidades', 'unidad', 'cantidad'),
  ('Resma', 'resma', 'cantidad'),
  ('Barra', 'barra', 'cantidad'),
  ('Filete', 'filete', 'cantidad');

-- ============================================================
-- CATEGORIES (parent categories first, then subcategories)
-- ============================================================
-- Parent categories
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Alimentos', 'alimentos', 1),
  ('Bebidas', 'bebidas', 2),
  ('Licores', 'licores', 3),
  ('Limpieza', 'limpieza', 4),
  ('Cuidado Personal', 'cuidado-personal', 5),
  ('Mascotas', 'mascotas', 6),
  ('Bebé', 'bebe', 7),
  ('Hogar', 'hogar', 8),
  ('Ropa', 'ropa', 9),
  ('Farmacia', 'farmacia', 10),
  ('Oficina', 'oficina', 11),
  ('Juguetes y Recreación', 'juguetes-recreacion', 12);

-- Subcategories (using slugs to find parent IDs)
INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Galletas', 'galletas', id, 1 FROM categories WHERE slug = 'alimentos';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Cereales', 'cereales', id, 2 FROM categories WHERE slug = 'alimentos';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Dulces', 'dulces', id, 3 FROM categories WHERE slug = 'alimentos';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Chocolates', 'chocolates', id, 4 FROM categories WHERE slug = 'alimentos';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Snacks', 'snacks', id, 5 FROM categories WHERE slug = 'alimentos';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Salsas y Condimentos', 'salsas-condimentos', id, 6 FROM categories WHERE slug = 'alimentos';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Gaseosas', 'gaseosas', id, 1 FROM categories WHERE slug = 'bebidas';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Aguas', 'aguas', id, 2 FROM categories WHERE slug = 'bebidas';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Bebidas Deportivas', 'bebidas-deportivas', id, 3 FROM categories WHERE slug = 'bebidas';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Café', 'cafe', id, 4 FROM categories WHERE slug = 'bebidas';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Whisky', 'whisky', id, 1 FROM categories WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Ron', 'ron', id, 2 FROM categories WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Tequila', 'tequila', id, 3 FROM categories WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Gin', 'gin', id, 4 FROM categories WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Vodka', 'vodka', id, 5 FROM categories WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Vino', 'vino', id, 6 FROM categories WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Cerveza', 'cerveza', id, 7 FROM categories WHERE slug = 'licores';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Alimento para Perro', 'alimento-perro', id, 1 FROM categories WHERE slug = 'mascotas';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Alimento para Gato', 'alimento-gato', id, 2 FROM categories WHERE slug = 'mascotas';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Papel Higiénico', 'papel-higienico', id, 1 FROM categories WHERE slug = 'hogar';

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT 'Servilletas', 'servilletas', id, 2 FROM categories WHERE slug = 'hogar';

-- ============================================================
-- SUPPLIERS
-- ============================================================
INSERT INTO suppliers (name, address) VALUES
  ('PriceSmart San Cristóbal', 'San Cristóbal, Guatemala'),
  ('PriceSmart Escuintla', 'Escuintla, Guatemala'),
  ('PriceSmart Miraflores', 'Miraflores, Guatemala Ciudad'),
  ('PriceSmart Zona 10', 'Zona 10, Guatemala Ciudad'),
  ('Maxi Despensa Chimaltenango', 'Chimaltenango, Guatemala'),
  ('Maxi Despensa Escuintla', 'Escuintla, Guatemala'),
  ('La Torre El Parador', 'El Parador, Guatemala'),
  ('La Torre Plaza Telares', 'Plaza Telares, Guatemala'),
  ('La Torre La Esperanza', 'La Esperanza, Guatemala'),
  ('La Torre Online', 'En línea'),
  ('Paiz Petapa', 'Petapa, Guatemala'),
  ('Paiz San Lucas', 'San Lucas Sacatepéquez, Guatemala'),
  ('Paiz En Línea', 'En línea'),
  ('Super 24', 'Guatemala'),
  ('Casa del Ron Botran', 'Guatemala'),
  ('Liquor Store Antigua', 'La Antigua Guatemala'),
  ('La Vinoteca Antigua', 'La Antigua Guatemala'),
  ('La Bodegona Antigua', 'La Antigua Guatemala');
