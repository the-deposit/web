-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('cliente', 'vendedor', 'admin');
CREATE TYPE payment_method AS ENUM ('efectivo', 'tarjeta_credito', 'transferencia', 'consignacion');
CREATE TYPE sale_type AS ENUM ('pos', 'online');
CREATE TYPE sale_status AS ENUM ('pendiente', 'confirmada', 'en_preparacion', 'enviada', 'entregada', 'cancelada');
CREATE TYPE payment_status AS ENUM ('pendiente', 'parcial', 'pagado');
CREATE TYPE order_status AS ENUM ('pendiente', 'revisado', 'confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado', 'listo_para_recoger', 'recogido');
CREATE TYPE delivery_method AS ENUM ('envio', 'recoger_en_tienda');
CREATE TYPE shipment_type AS ENUM ('repartidor_propio', 'empresa_tercera');
CREATE TYPE shipment_status AS ENUM ('preparando', 'en_camino', 'entregado', 'devuelto');
CREATE TYPE consignment_type AS ENUM ('dada', 'recibida');
CREATE TYPE consignment_status AS ENUM ('activa', 'liquidada', 'cancelada');
CREATE TYPE account_status AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida');
CREATE TYPE measurement_category AS ENUM ('peso', 'volumen', 'cantidad');
CREATE TYPE source_type AS ENUM ('compra_tarjeta', 'consignacion_recibida');

-- ============================================================
-- HELPER FUNCTION: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  role user_role NOT NULL DEFAULT 'cliente',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ADDRESSES
-- ============================================================
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Casa',
  full_address TEXT NOT NULL,
  department TEXT,
  municipality TEXT,
  zone TEXT,
  reference TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);

CREATE TRIGGER set_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- MEASUREMENT UNITS
-- ============================================================
CREATE TABLE measurement_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE,
  category measurement_category NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_info TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_tags ON products USING GIN(tags);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PRODUCT PRESENTATIONS
-- ============================================================
CREATE TABLE product_presentations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity_value DECIMAL(10,3),
  quantity_unit_id UUID REFERENCES measurement_units(id) ON DELETE SET NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  competitor_price DECIMAL(10,2),
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  units_per_presentation INTEGER NOT NULL DEFAULT 1,
  expiration_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_presentations_product_id ON product_presentations(product_id);
CREATE INDEX idx_presentations_barcode ON product_presentations(barcode) WHERE barcode IS NOT NULL;

CREATE TRIGGER set_presentations_updated_at
  BEFORE UPDATE ON product_presentations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CREDIT CARDS
-- ============================================================
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_name TEXT NOT NULL,
  last_four_digits CHAR(4) NOT NULL,
  credit_limit DECIMAL(10,2),
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  cut_off_day INTEGER CHECK (cut_off_day BETWEEN 1 AND 31),
  payment_due_day INTEGER CHECK (payment_due_day BETWEEN 1 AND 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PURCHASES
-- ============================================================
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_method NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  invoice_number TEXT,
  notes TEXT,
  registered_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_registered_by ON purchases(registered_by);

CREATE TRIGGER set_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PURCHASE ITEMS
-- ============================================================
CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_presentation_id UUID NOT NULL REFERENCES product_presentations(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_type sale_type NOT NULL DEFAULT 'pos',
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name TEXT,
  seller_id UUID NOT NULL REFERENCES profiles(id),
  status sale_status NOT NULL DEFAULT 'pendiente',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'efectivo',
  payment_status payment_status NOT NULL DEFAULT 'pendiente',
  notes TEXT,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_seller_id ON sales(seller_id);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_status ON sales(status);

CREATE TRIGGER set_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SALE ITEMS
-- ============================================================
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_presentation_id UUID NOT NULL REFERENCES product_presentations(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);

-- ============================================================
-- ORDERS (online store)
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  status order_status NOT NULL DEFAULT 'pendiente',
  delivery_method delivery_method NOT NULL,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  notes_customer TEXT,
  notes_internal TEXT,
  estimated_delivery DATE,
  converted_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_presentation_id UUID NOT NULL REFERENCES product_presentations(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- SHIPMENTS
-- ============================================================
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  shipment_type shipment_type NOT NULL,
  carrier_name TEXT NOT NULL,
  tracking_number TEXT,
  status shipment_status NOT NULL DEFAULT 'preparando',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_sale_id ON shipments(sale_id);
CREATE INDEX idx_shipments_status ON shipments(status);

CREATE TRIGGER set_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CONSIGNMENTS
-- ============================================================
CREATE TABLE consignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type consignment_type NOT NULL,
  consignee_name TEXT,
  consignee_contact TEXT,
  consigner_name TEXT,
  consigner_contact TEXT,
  status consignment_status NOT NULL DEFAULT 'activa',
  date_given DATE NOT NULL DEFAULT CURRENT_DATE,
  date_due DATE,
  registered_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consignments_status ON consignments(status);

CREATE TRIGGER set_consignments_updated_at
  BEFORE UPDATE ON consignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CONSIGNMENT ITEMS
-- ============================================================
CREATE TABLE consignment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consignment_id UUID NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  product_presentation_id UUID NOT NULL REFERENCES product_presentations(id),
  quantity_given INTEGER NOT NULL,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  quantity_returned INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consignment_items_consignment_id ON consignment_items(consignment_id);

-- ============================================================
-- ACCOUNTS RECEIVABLE
-- ============================================================
CREATE TABLE accounts_receivable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  due_date DATE,
  status account_status NOT NULL DEFAULT 'pendiente',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receivable_status ON accounts_receivable(status);
CREATE INDEX idx_receivable_customer_id ON accounts_receivable(customer_id);

CREATE TRIGGER set_receivable_updated_at
  BEFORE UPDATE ON accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RECEIVABLE PAYMENTS
-- ============================================================
CREATE TABLE receivable_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_receivable_id UUID NOT NULL REFERENCES accounts_receivable(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_method NOT NULL DEFAULT 'efectivo',
  registered_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receivable_payments_account_id ON receivable_payments(account_receivable_id);

-- ============================================================
-- ACCOUNTS PAYABLE
-- ============================================================
CREATE TABLE accounts_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type source_type NOT NULL,
  source_id UUID NOT NULL,
  creditor_name TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  due_date DATE,
  status account_status NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payable_status ON accounts_payable(status);

CREATE TRIGGER set_payable_updated_at
  BEFORE UPDATE ON accounts_payable
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PAYABLE PAYMENTS
-- ============================================================
CREATE TABLE payable_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_payable_id UUID NOT NULL REFERENCES accounts_payable(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_method NOT NULL DEFAULT 'efectivo',
  registered_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payable_payments_account_id ON payable_payments(account_payable_id);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_nit TEXT NOT NULL DEFAULT 'CF',
  customer_address TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by UUID NOT NULL REFERENCES profiles(id)
);

CREATE INDEX idx_invoices_sale_id ON invoices(sale_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- Invoice sequence
CREATE SEQUENCE invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS TEXT AS $$
  SELECT 'TD-' || LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
$$ LANGUAGE SQL;

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE payable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ---- PROFILES ----
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can view all profiles" ON profiles
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

-- ---- ADDRESSES ----
CREATE POLICY "Users can manage own addresses" ON addresses
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Staff can view all addresses" ON addresses
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

-- ---- CATEGORIES (public read) ----
CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (get_user_role() = 'admin');

-- ---- MEASUREMENT UNITS (public read) ----
CREATE POLICY "Anyone can view active units" ON measurement_units
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage units" ON measurement_units
  FOR ALL USING (get_user_role() = 'admin');

-- ---- SUPPLIERS ----
CREATE POLICY "Staff can view suppliers" ON suppliers
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Admins can manage suppliers" ON suppliers
  FOR ALL USING (get_user_role() = 'admin');

-- ---- PRODUCTS (public read for active) ----
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Staff can view all products" ON products
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (get_user_role() = 'admin');

-- ---- PRODUCT PRESENTATIONS ----
-- Clients: can see sale_price but NOT cost_price/competitor_price — enforced via view or application layer
CREATE POLICY "Anyone can view active presentations" ON product_presentations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can view all presentations" ON product_presentations
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Admins can manage presentations" ON product_presentations
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores can update stock" ON product_presentations
  FOR UPDATE USING (get_user_role() IN ('vendedor', 'admin'));

-- ---- PURCHASES ----
CREATE POLICY "Staff can view purchases" ON purchases
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Vendedores can create purchases" ON purchases
  FOR INSERT WITH CHECK (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Admins can manage purchases" ON purchases
  FOR ALL USING (get_user_role() = 'admin');

-- ---- PURCHASE ITEMS ----
CREATE POLICY "Staff can view purchase items" ON purchase_items
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Vendedores can create purchase items" ON purchase_items
  FOR INSERT WITH CHECK (get_user_role() IN ('vendedor', 'admin'));

-- ---- SALES ----
CREATE POLICY "Customers can view own sales" ON sales
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Staff can view all sales" ON sales
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Vendedores can create sales" ON sales
  FOR INSERT WITH CHECK (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Vendedores can update sales" ON sales
  FOR UPDATE USING (get_user_role() IN ('vendedor', 'admin'));

-- ---- SALE ITEMS ----
CREATE POLICY "Staff can view sale items" ON sale_items
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Vendedores can create sale items" ON sale_items
  FOR INSERT WITH CHECK (get_user_role() IN ('vendedor', 'admin'));

-- ---- ORDERS ----
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can create orders" ON orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can cancel pending orders" ON orders
  FOR UPDATE USING (customer_id = auth.uid() AND status = 'pendiente');

CREATE POLICY "Staff can view all orders" ON orders
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Staff can update orders" ON orders
  FOR UPDATE USING (get_user_role() IN ('vendedor', 'admin'));

-- ---- ORDER ITEMS ----
CREATE POLICY "Customers can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage order items" ON order_items
  FOR ALL USING (get_user_role() IN ('vendedor', 'admin'));

-- ---- SHIPMENTS ----
CREATE POLICY "Customers can view own shipments" ON shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage shipments" ON shipments
  FOR ALL USING (get_user_role() IN ('vendedor', 'admin'));

-- ---- CONSIGNMENTS ----
CREATE POLICY "Staff can manage consignments" ON consignments
  FOR ALL USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Admins only for consignment write" ON consignment_items
  FOR ALL USING (get_user_role() IN ('vendedor', 'admin'));

-- ---- ACCOUNTS RECEIVABLE ----
CREATE POLICY "Staff can manage receivable" ON accounts_receivable
  FOR ALL USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Staff can manage receivable payments" ON receivable_payments
  FOR ALL USING (get_user_role() IN ('vendedor', 'admin'));

-- ---- ACCOUNTS PAYABLE ----
CREATE POLICY "Admins manage payable" ON accounts_payable
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Vendedores view payable" ON accounts_payable
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Admins manage payable payments" ON payable_payments
  FOR ALL USING (get_user_role() = 'admin');

-- ---- INVOICES ----
CREATE POLICY "Customers can view own invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales WHERE sales.id = invoices.sale_id AND sales.customer_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all invoices" ON invoices
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Vendedores can create invoices" ON invoices
  FOR INSERT WITH CHECK (get_user_role() IN ('vendedor', 'admin'));

-- ---- CREDIT CARDS ----
CREATE POLICY "Admins manage credit cards" ON credit_cards
  FOR ALL USING (get_user_role() = 'admin');

-- ---- ACTIVITY LOG ----
CREATE POLICY "Staff can view activity log" ON activity_log
  FOR SELECT USING (get_user_role() IN ('vendedor', 'admin'));

CREATE POLICY "Authenticated can create activity" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
