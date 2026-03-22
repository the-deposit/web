# Prompt para Claude Code — The Deposit Web App v3

## Instrucción principal

Construye una aplicación web completa para **The Deposit**, un depósito/tienda mayorista y minorista ubicada en Aldea San Pedro Las Huertas, La Antigua Guatemala. El negocio compra productos en descuentos y al por mayor de tiendas como PriceSmart, Maxi Despensa, La Torre, Paiz, y otras, y los revende al público en diferentes presentaciones (fardo, caja, unidad, pack, etc.) con precios diferenciados por presentación.

Toda la interfaz debe estar en **español**. La moneda es **Quetzales (GTQ)** con formato `Q 1,234.56`.

---

## Stack tecnológico

- **Frontend:** Next.js 14+ (App Router) con TypeScript, Tailwind CSS
- **Hosting:** Vercel (plan Hobby) — dominio principal `www.thedeposit.shop` (con `thedeposit.shop` → 308 redirect a www)
- **Base de datos y auth:** Supabase (PostgreSQL + Auth con OAuth de Google únicamente)
- **Almacenamiento de imágenes y archivos:** Cloudinary con dos upload presets (ambos **unsigned**):
  - Preset `productos`: para imágenes de producto — auto-generated unguessable public ID
  - Preset `facturas`: para PDFs de facturas — usa el filename original como public ID
  - Upload unsigned desde el frontend: `https://api.cloudinary.com/v1_1/{cloud_name}/auto/upload`
- **Emails transaccionales:** Resend — dominio `thedeposit.shop` verificado (DKIM, SPF, MX todos ✅), DNS administrado por Vercel, región us-east-1. Email de envío: `pedidos@thedeposit.shop`
- **Escaneo de códigos de barras:** Librería del lado del cliente (quagga2 o html5-qrcode) para leer códigos EAN/UPC existentes de los productos
- **Generación de PDF:** Facturas internas en PDF (usar @react-pdf/renderer o jspdf)
- **Validación:** Zod para esquemas de validación
- **Estado global:** Zustand para el carrito de compras y estado de sesión
- **Iconos:** Lucide React
- **Gráficas:** Recharts para el dashboard

---

## Identidad visual y diseño

La marca es **minimalista, industrial y urbana**. El logo es un círculo negro con letras "T" y "D" cruzadas por una X, con un icono de tienda, fecha 2025. Toda la estética gira en torno al blanco y negro con acentos grises.

### Paleta de colores:
- **Primario:** Negro `#1A1A1A`
- **Secundario:** Blanco `#FFFFFF`
- **Acento:** Gris oscuro `#333333`
- **Gris medio:** `#666666`
- **Gris claro (fondos):** `#F5F5F5`
- **Bordes:** `#E0E0E0`
- **Éxito:** `#22C55E`
- **Advertencia:** `#F59E0B`
- **Error:** `#EF4444`
- **Info:** `#3B82F6`

### Tipografía:
- **Títulos y encabezados:** Fuente display industrial/condensada (ej: "Oswald", "Barlow Condensed", o "Bebas Neue") que refleje la estética del logo
- **Cuerpo:** Sans-serif limpia y legible (ej: "DM Sans", "Plus Jakarta Sans")
- Usar todo en mayúsculas para encabezados principales, similar al logo

### Directrices de UI:
- Diseño limpio con bastante espacio en blanco
- Bordes definidos, esquinas sutilmente redondeadas (4-8px)
- Sombras muy sutiles, estilo flat con profundidad mínima
- Botones con fondo negro y texto blanco como estilo principal
- Hover states con transiciones suaves
- **Mobile-first obligatorio:** Tanto la tienda en línea como el panel admin/vendedor deben ser completamente funcionales y verse correctamente en móvil, tablet y desktop
- Bottom navigation en móvil para el panel admin
- Drawer/sidebar colapsable para el admin en desktop
- Tablas responsivas con scroll horizontal o vista de cards en móvil

---

## Arquitectura de la aplicación

La app tiene **dos grandes áreas:**

### 1. Tienda en línea (pública/cliente)
Ruta base: `/tienda`
- Catálogo de productos con filtros por categoría, búsqueda y ordenamiento
- Página de detalle de producto (con selector de presentación y precio dinámico)
- Carrito de compras (persistente con Zustand + localStorage)
- Flujo de pedido (sin pasarela de pago): seleccionar método de entrega → si es envío, seleccionar dirección → confirmar pedido → queda en estado "pendiente"
- Registro/login con Google vía Supabase Auth (OAuth)
- Página "Mi Perfil": editar datos personales, gestionar direcciones de envío (CRUD), cambiar información de contacto
- Página "Mis Pedidos": ver historial, estado del pedido en tiempo real, detalle de cada pedido, poder cancelar si está en "pendiente"

### 2. Panel de administración
Ruta base: `/admin`
- Accesible solo para roles `vendedor` y `admin`
- **Completamente funcional en móvil** con bottom navigation y layouts adaptados
- Los vendedores pueden: registrar compras, procesar ventas (POS), gestionar pedidos y envíos
- Los administradores pueden: todo lo anterior + gestionar usuarios, configuración, categorías, reportes, consignaciones, cuentas por cobrar/pagar

---

## Sistema de unidades de medida estandarizado

> **Contexto:** El negocio actualmente maneja las medidas de producto de forma inconsistente en un Excel (ej: "750 mililitros", "750ml", "16 onz / 15.97 gr", "20 kilogramos", "10kg", "5 libras"). Esto debe resolverse con un sistema estandarizado.

### Tabla `measurement_units`
El sistema debe incluir una tabla de unidades de medida predefinidas con las siguientes categorías:

**Peso:**
- `g` (gramos)
- `kg` (kilogramos)
- `lb` (libras)
- `oz` (onzas)

**Volumen:**
- `ml` (mililitros)
- `l` (litros)
- `fl_oz` (onzas líquidas)

**Cantidad:**
- `unidad` (unidades individuales)
- `resma` (para papel)
- `barra` (para granola, etc.)
- `filete` (para carnes/mariscos)

En el formulario de producto/presentación, el usuario selecciona:
1. La cantidad numérica (ej: 750)
2. La unidad de medida de un dropdown (ej: "ml")
3. El sistema almacena ambos valores por separado (`quantity_value` + `quantity_unit`)
4. La vista muestra el formato legible: "750 ml", "20 kg", "5 lb"

Los administradores pueden agregar nuevas unidades de medida desde la configuración del sistema.

---

## Modelo de datos (Supabase PostgreSQL)

Diseña las siguientes tablas con las relaciones apropiadas. Usa UUIDs como primary keys, timestamps `created_at` y `updated_at`, y soft delete con `deleted_at` donde aplique.

### profiles (extiende auth.users de Supabase)
- `id` (UUID, FK a auth.users)
- `full_name`, `phone`, `email`
- `role` ENUM: `cliente`, `vendedor`, `admin`
- `avatar_url`
- `is_active` (boolean)

### addresses
- `id`, `user_id` (FK profiles)
- `label` (ej: "Casa", "Oficina")
- `full_address`, `department`, `municipality`, `zone`, `reference`
- `is_default` (boolean)

### categories
- `id`, `name`, `slug`, `description`, `image_url`
- `parent_id` (FK self, para subcategorías)
- `sort_order`, `is_active`

> **Nota de migración:** Las 71 categorías actuales del Excel (Alimento perro, Alimento gato, Whisky, Galleta, Vino, Gaseosa, Detergente, Cerveza, Chocolate, Ron, Tequila, Gin, Vodka, etc.) deben reagruparse en categorías padre con subcategorías. Ejemplo sugerido para seed:
> - **Alimentos:** Galletas, Cereales, Dulces, Chocolates, Snacks, Azúcar, Gelatina, Salsas
> - **Bebidas:** Gaseosas, Aguas, Bebidas deportivas, Café
> - **Licores:** Whisky, Ron, Tequila, Gin, Vodka, Vino, Cerveza, Jagermeister
> - **Limpieza:** Detergente, Removedor manchas, Limpiador, Esponja
> - **Cuidado personal:** Jabón, Shampoo, Desodorante, Pasta de dientes, Cepillo de dientes, Rasuradoras, Toallas
> - **Mascotas:** Alimento perro, Alimento gato, Accesorios
> - **Bebé:** Accesorios de bebé, Pañales
> - **Hogar:** Papel higiénico, Servilletas, Pajillas, Cubiertos, Cristalería
> - **Ropa:** Tipo Columbia, Tipo Polo, Chumpas
> - **Farmacia:** Medicinas, Glucómetros, Monitor de presión
> - **Oficina:** Papel oficina
> - **Juguetes y recreación:** Cometas, Rompecabezas, Pelotas

### measurement_units
- `id`, `name` (ej: "Kilogramos"), `abbreviation` (ej: "kg")
- `category` ENUM: `peso`, `volumen`, `cantidad`
- `is_active`

### suppliers (proveedores — basado en los lugares de compra del Excel)
- `id`, `name` (ej: "PriceSmart San Cristóbal", "Maxi Despensa Chimaltenango")
- `contact_info`, `address`, `notes`
- `is_active`

### products
- `id`, `name`, `slug`, `description`
- `category_id` (FK categories)
- `brand`
- `images` (array de URLs de Cloudinary)
- `is_active`, `is_featured`
- `tags` (array de texto para búsqueda)

### product_presentations
- `id`, `product_id` (FK products)
- `name` (ej: "Fardo 24 unidades", "Unidad", "Pack 6", "Media caja")
- `barcode` (código EAN/UPC escaneado del producto físico — puede ser NULL)
- `quantity_value` (DECIMAL — el valor numérico: 750, 20, 1, etc.)
- `quantity_unit_id` (FK measurement_units — la unidad: ml, kg, unidad, etc.)
- `sale_price` (precio de venta GTQ)
- `cost_price` (costo de adquisición GTQ)
- `competitor_price` (precio de la competencia/valor real — para comparar margen, nullable)
- `stock` (inventario actual para esta presentación)
- `min_stock` (stock mínimo para alertas)
- `units_per_presentation` (cuántas unidades individuales contiene, ej: un fardo de 24 = 24)
- `expiration_date` (nullable, para productos perecederos)
- `is_active`
- **UNIQUE constraint** en `barcode` cuando no es NULL

### purchases (registro de compras)
- `id`, `supplier_id` (FK suppliers)
- `purchase_date`
- `payment_method` ENUM: `efectivo`, `tarjeta_credito`, `transferencia`, `consignacion`
- `total_amount`
- `credit_card_id` (FK nullable, referencia a tarjeta si aplica)
- `invoice_number` (número de factura del proveedor, opcional)
- `notes`
- `registered_by` (FK profiles)

### purchase_items
- `id`, `purchase_id` (FK purchases)
- `product_presentation_id` (FK product_presentations)
- `quantity`, `unit_cost`, `subtotal`

### sales
- `id`
- `sale_type` ENUM: `pos`, `online`
- `customer_id` (FK profiles, nullable para ventas POS sin cliente registrado)
- `customer_name` (texto libre para POS sin cliente registrado, ej: "Pedro", "Titi")
- `seller_id` (FK profiles)
- `status` ENUM: `pendiente`, `confirmada`, `en_preparacion`, `enviada`, `entregada`, `cancelada`
- `subtotal`, `discount`, `shipping_cost`, `total`
- `payment_method` ENUM: `efectivo`, `tarjeta`, `transferencia`
- `payment_status` ENUM: `pendiente`, `parcial`, `pagado`
- `notes`
- `address_id` (FK addresses, nullable — solo para envíos)

### sale_items
- `id`, `sale_id` (FK sales)
- `product_presentation_id` (FK product_presentations)
- `quantity`, `unit_price`, `subtotal`

### orders (pedidos desde tienda en línea)
- `id`, `customer_id` (FK profiles)
- `status` ENUM: `pendiente`, `revisado`, `confirmado`, `en_preparacion`, `enviado`, `entregado`, `cancelado`, `listo_para_recoger`, `recogido`
- `delivery_method` ENUM: `envio`, `recoger_en_tienda`
- `address_id` (FK addresses, nullable — solo requerido si delivery_method = 'envio')
- `notes_customer` (notas del cliente)
- `notes_internal` (notas del vendedor/admin)
- `estimated_delivery`
- `converted_sale_id` (FK sales, nullable — se llena cuando el pedido se convierte en venta)

### order_items
- `id`, `order_id` (FK orders)
- `product_presentation_id` (FK product_presentations)
- `quantity`, `unit_price`, `subtotal`

### shipments (envíos)
- `id`, `sale_id` (FK sales, nullable)
- `order_id` (FK orders, nullable)
- `shipment_type` ENUM: `repartidor_propio`, `empresa_tercera`
- `carrier_name` (nombre del repartidor o empresa)
- `tracking_number` (nullable)
- `status` ENUM: `preparando`, `en_camino`, `entregado`, `devuelto`
- `shipped_at`, `delivered_at`
- `shipping_cost`
- `notes`

### consignments
- `id`
- `type` ENUM: `dada`, `recibida`
- Para **consignación dada** (The Deposit entrega producto a un tercero):
  - `consignee_name`, `consignee_contact`
- Para **consignación recibida** (un proveedor entrega producto a The Deposit):
  - `consigner_name`, `consigner_contact`
- `status` ENUM: `activa`, `liquidada`, `cancelada`
- `date_given`, `date_due` (fecha límite para liquidar)
- `registered_by` (FK profiles)
- `notes`

### consignment_items
- `id`, `consignment_id` (FK consignments)
- `product_presentation_id` (FK product_presentations)
- `quantity_given` (cantidad entregada)
- `quantity_sold` (cantidad vendida, se actualiza)
- `quantity_returned` (cantidad devuelta)
- `unit_price` (precio por unidad para liquidación)

### accounts_receivable (cuentas por cobrar)
- `id`
- `sale_id` (FK sales, nullable)
- `customer_id` (FK profiles, nullable)
- `customer_name` (texto — para clientes no registrados como "Pedro", "Titi", "Bel")
- `total_amount`, `amount_paid`, `balance`
- `due_date`
- `status` ENUM: `pendiente`, `parcial`, `pagada`, `vencida`
- `notes`

### receivable_payments
- `id`, `account_receivable_id` (FK)
- `amount`, `payment_date`, `payment_method`
- `registered_by` (FK profiles)
- `notes`

### accounts_payable (cuentas por pagar)
- `id`
- `source_type` ENUM: `compra_tarjeta`, `consignacion_recibida`
- `source_id` (ID de la compra o consignación)
- `creditor_name`
- `total_amount`, `amount_paid`, `balance`
- `due_date`
- `status` ENUM: `pendiente`, `parcial`, `pagada`, `vencida`

### payable_payments
- `id`, `account_payable_id` (FK)
- `amount`, `payment_date`, `payment_method`
- `registered_by` (FK profiles)
- `notes`

### invoices (facturas internas)
- `id`, `sale_id` (FK sales)
- `invoice_number` (secuencial, formato: "TD-00001")
- `customer_name`, `customer_nit` (NIT o "CF" para consumidor final)
- `customer_address`
- `subtotal`, `total`
- `pdf_url` (URL del PDF generado)
- `issued_at`
- `issued_by` (FK profiles)

### credit_cards (para tracking de compras con tarjeta)
- `id`, `card_name` (ej: "Visa BAM terminación 4532")
- `last_four_digits`
- `credit_limit`, `current_balance`
- `cut_off_day`, `payment_due_day`

### activity_log
- `id`, `user_id` (FK profiles)
- `action` (ej: "venta_creada", "stock_actualizado", "pedido_confirmado")
- `entity_type`, `entity_id`
- `details` (JSONB)
- `created_at`

---

## Row Level Security (RLS)

Implementa políticas RLS en Supabase:
- **Clientes** solo pueden ver/editar su propio perfil, sus propias direcciones, sus propios pedidos
- **Clientes** pueden ver productos, categorías y presentaciones activos (`is_active = true`)
- **Clientes** NUNCA ven `cost_price` ni `competitor_price` — estas columnas se excluyen en las queries del frontend de tienda
- **Vendedores** pueden ver todos los pedidos, crear ventas, ver inventario completo (incluyendo costos), gestionar envíos
- **Admins** tienen acceso completo a todas las tablas
- Las políticas deben asegurar que `sale_price` sea visible para todos pero `cost_price` y `competitor_price` solo para vendedores y admins

---

## Funcionalidades detalladas

### Módulo: Inventario
- Vista de tabla (cards en móvil) con todos los productos y sus presentaciones
- Filtros por categoría, estado de stock (bajo stock, sin stock, normal), búsqueda
- Edición rápida de stock (ajustes manuales con motivo)
- Alertas visuales para productos con stock bajo (`stock <= min_stock`)
- Alertas para productos próximos a vencer (30 días o menos)
- Historial de movimientos de inventario por producto
- Vista de **rentabilidad**: columnas de costo, precio competencia, precio de venta, margen bruto (similar a lo que tenían en el Excel con Costo, Valor Real, Diferencia, Precio Venta, Ganancia)

### Módulo: Productos y Presentaciones
- CRUD completo de productos
- Upload de múltiples imágenes a Cloudinary con drag & drop (usar preset `productos`, unsigned upload)
- Para facturas PDF, subir a Cloudinary con preset `facturas` (unsigned, filename como ID)
- CRUD de presentaciones por producto:
  - Nombre de presentación
  - Código de barras (escanear con cámara o escribir manual)
  - Cantidad + unidad de medida estandarizada (dropdown de `measurement_units`)
  - Precio de venta, precio de costo, precio competencia (opcional)
  - Stock actual, stock mínimo
  - Unidades por presentación
  - Fecha de vencimiento (opcional)
- Gestión de categorías (CRUD con posibilidad de subcategorías)
- Gestión de unidades de medida (CRUD desde configuración)

### Módulo: Proveedores
- CRUD de proveedores (tiendas donde compran)
- Historial de compras por proveedor
- Seed data con los proveedores del Excel: PriceSmart (San Cristóbal, Escuintla, Miraflores, zona 10), Maxi Despensa (Chimaltenango, Escuintla), La Torre (El Parador, Plaza Telares, La Esperanza, Online), Paiz (Petapa, San Lucas, en línea), Super 24, Casa del Ron Botran, Liquor Store Antigua, La Vinoteca Antigua, La Bodegona Antigua, entre otros

### Módulo: Compras
- Formulario de registro de compra: seleccionar proveedor (de la tabla suppliers), fecha, método de pago, items
- Cada item: seleccionar producto → presentación → cantidad → costo unitario
- Al guardar la compra, el stock se incrementa automáticamente
- Si el método de pago es `tarjeta_credito`, crear automáticamente una cuenta por pagar vinculada a la tarjeta
- Historial de compras con filtros por fecha, proveedor, método de pago

### Módulo: Ventas — POS (para vendedores en local)
- Interfaz estilo punto de venta optimizada para velocidad, **funcional en móvil y tablet**
- Escanear código de barras con cámara → busca en `product_presentations.barcode` → agrega al ticket
- También búsqueda manual por nombre de producto
- Mostrar producto, presentación, precio, y permitir ajustar cantidad
- Campo opcional de nombre de cliente (texto libre para clientes no registrados, ej: "Pedro", "Titi")
- Aplicar descuento general o por item
- Seleccionar método de pago
- Si el pago es parcial o fiado, crear cuenta por cobrar automáticamente (vinculada al nombre del cliente)
- Al confirmar la venta, decrementar stock y generar factura PDF
- Opción de imprimir/descargar ticket/factura

### Módulo: Tienda en Línea
- Página principal con productos destacados, categorías, barra de búsqueda
- Grid de productos con imagen, nombre, precio desde (la presentación más barata)
- Página de detalle: galería de imágenes, selector de presentación con cambio dinámico de precio, cantidad de medida mostrada (ej: "750 ml", "20 kg"), botón agregar al carrito
- Carrito: lista de items, ajustar cantidades, eliminar items, ver subtotal y total
- Checkout (requiere login con Google):
  1. Seleccionar método de entrega: **"Envío a domicilio"** o **"Recoger en tienda"**
  2. Si elige envío: seleccionar dirección existente o agregar nueva
  3. Si elige recoger en tienda: mostrar dirección de la tienda (Calle Real Lote 25, Aldea San Pedro Las Huertas, La Antigua Guatemala) y horarios
  4. Revisar pedido → confirmar (sin pago online, solo se registra como pedido pendiente)
- El cliente recibe email de confirmación vía Resend
- Página "Mis Pedidos":
  - Lista de pedidos con estado visual (badges de color por estado)
  - Puede cancelar si está en "pendiente"
  - Ver detalle de cada pedido
  - Indicador de método de entrega (envío o recoger)
  - Si es para recoger: mostrar estado "listo_para_recoger" cuando el vendedor lo marque
- Página "Mi Perfil": editar nombre, teléfono, email; CRUD de direcciones

### Módulo: Gestión de Pedidos (admin/vendedor)
- Lista de pedidos con filtros por estado, fecha, cliente, método de entrega
- Badge visual de método de entrega (envío / recoger en tienda)
- Al abrir un pedido: ver detalle, items, dirección del cliente (si es envío) o indicación de recogida
- Flujo de procesamiento para **pedidos con envío:**
  1. Revisar pedido → cambiar a "revisado"
  2. Confirmar disponibilidad → cambiar a "confirmado"
  3. Preparar → cambiar a "en_preparacion"
  4. El vendedor decide tipo de envío: repartidor propio o empresa tercera
  5. Si es repartidor propio: asignar nombre de repartidor
  6. Si es empresa tercera: ingresar nombre empresa, número de rastreo
  7. Enviar → cambiar a "enviado"
  8. Marcar como entregado → convierte el pedido en venta formal, decrementa stock, genera factura
- Flujo de procesamiento para **pedidos de recogida en tienda:**
  1. Revisar → confirmar → preparar (igual que envío)
  2. Cambiar a "listo_para_recoger" (se notifica al cliente por email)
  3. Cuando el cliente recoge → marcar como "recogido" → convierte en venta, decrementa stock, genera factura
- Enviar notificaciones por email en cada cambio de estado

### Módulo: Cuentas por Cobrar
- Lista de cuentas pendientes con filtros por estado, fecha de vencimiento, nombre de cliente
- Soporta clientes registrados Y clientes por nombre (texto libre, como lo manejan en el Excel: "Pedro", "Titi", "Bel")
- Registro de abonos parciales o pago completo
- Alerta de cuentas vencidas
- Resumen: total por cobrar, vencido, por vencer

### Módulo: Cuentas por Pagar
- Se generan automáticamente al comprar con tarjeta de crédito o recibir consignación
- Registro de pagos/abonos
- Vista de tarjetas de crédito con balance actual y fechas de corte
- Alerta de pagos próximos a vencer

### Módulo: Consignaciones
- **Consignación dada:** registrar a quién se entrega, qué productos/presentaciones y cantidades. Al liquidar: registrar cuánto se vendió (generan cobro / ingreso), cuánto se devolvió (regresa al inventario).
- **Consignación recibida:** registrar de quién se recibe, qué productos/presentaciones y cantidades. El stock se incrementa al registrar. Al liquidar: registrar qué se vendió (genera cuenta por pagar al proveedor), devolver sobrante (decrementa stock).
- Vista de consignaciones activas, liquidadas, vencidas
- Alertas de consignaciones próximas a fecha límite

### Módulo: Envíos
- Lista de envíos activos con estado
- Filtrar por tipo (propio/tercero), estado, fecha
- Actualizar estado del envío
- Ver dirección de entrega y datos del cliente

### Módulo: Facturas
- Generación automática al cerrar una venta
- Campos: número correlativo "TD-XXXXX", datos del cliente (nombre, NIT o "CF"), dirección, detalle de items con presentación y medida, subtotal, total
- Generar PDF descargable con la identidad visual de The Deposit (logo, colores, tipografía)
- Historial de facturas con búsqueda por número, cliente, fecha

### Módulo: Dashboard (página principal del admin)
- **Completamente responsive, funcional en móvil**
- **KPIs en tarjetas:**
  - Ventas del día / semana / mes (en GTQ)
  - Ganancia bruta del período (ventas - costos)
  - Número de pedidos pendientes
  - Productos con stock bajo (cantidad)
  - Cuentas por cobrar vencidas (monto total)
  - Cuentas por pagar próximas (monto total)
  - Consignaciones activas por liquidar
- **Gráficas (Recharts):**
  - Ventas por día/semana/mes (gráfica de líneas o barras)
  - Top 10 productos más vendidos (barras horizontales)
  - Ventas por categoría (dona/pie)
  - Productos en tendencia (mayor crecimiento en ventas esta semana vs la anterior)
  - Margen de ganancia por categoría (para identificar qué categorías son más rentables)
  - Comparativa: precio competencia vs precio de venta (para los productos que tienen `competitor_price`)
- **Alertas/Notificaciones:**
  - Productos próximos a vencer (< 30 días)
  - Productos con stock bajo
  - Pedidos pendientes sin procesar (> 24 horas)
  - Consignaciones por liquidar próximas a vencerse
  - Cuentas por cobrar vencidas
  - Cuentas por pagar próximas a vencer

### Módulo: Usuarios
- Lista de usuarios con filtro por rol
- Los administradores pueden crear vendedores y otros admins manualmente (email + contraseña o enviar invitación)
- Los clientes se registran solos desde la tienda en línea con Google OAuth
- Desactivar/reactivar usuarios
- Ver actividad reciente por usuario

---

## Emails con Resend

El dominio `thedeposit.shop` ya está verificado en Resend con todos los registros DNS confirmados (DKIM, SPF, MX). El email de envío es `pedidos@thedeposit.shop`.

Para usar Resend en el código:
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL, // pedidos@thedeposit.shop
  to: customerEmail,
  subject: 'Tu pedido ha sido confirmado',
  html: renderEmailTemplate(data),
});
```

Templates HTML responsive con la identidad visual de The Deposit (logo, paleta blanco/negro, tipografía):

1. **Bienvenida:** cuando un usuario se registra por primera vez
2. **Confirmación de pedido:** cuando el cliente realiza un pedido (incluir si es envío o recogida)
3. **Pedido confirmado:** cuando el vendedor confirma el pedido
4. **Pedido en preparación:** cuando inicia preparación
5. **Pedido enviado:** incluir datos del envío (repartidor/empresa, tracking si aplica)
6. **Pedido listo para recoger:** cuando el pedido está listo en tienda
7. **Pedido entregado/recogido:** confirmación final
8. **Pedido cancelado:** si se cancela un pedido

---

## Estructura de carpetas sugerida

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── registro/
│   ├── (tienda)/
│   │   ├── tienda/
│   │   │   ├── page.tsx (catálogo)
│   │   │   ├── [slug]/page.tsx (detalle producto)
│   │   │   ├── carrito/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   ├── mis-pedidos/page.tsx
│   │   │   └── mi-perfil/page.tsx
│   │   └── layout.tsx (layout tienda con navbar y bottom nav móvil, footer)
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── page.tsx (dashboard)
│   │   │   ├── inventario/
│   │   │   ├── productos/
│   │   │   ├── categorias/
│   │   │   ├── proveedores/
│   │   │   ├── compras/
│   │   │   ├── ventas/
│   │   │   │   ├── pos/page.tsx
│   │   │   │   └── historial/page.tsx
│   │   │   ├── pedidos/
│   │   │   ├── envios/
│   │   │   ├── consignaciones/
│   │   │   ├── cuentas-por-cobrar/
│   │   │   ├── cuentas-por-pagar/
│   │   │   ├── facturas/
│   │   │   ├── usuarios/
│   │   │   └── configuracion/ (unidades de medida, datos de la tienda)
│   │   └── layout.tsx (layout admin con sidebar desktop + bottom nav móvil)
│   ├── api/
│   │   ├── auth/
│   │   ├── products/
│   │   ├── sales/
│   │   ├── orders/
│   │   ├── invoices/
│   │   ├── email/
│   │   └── cloudinary/
│   ├── layout.tsx
│   └── page.tsx (landing/redirect)
├── components/
│   ├── ui/ (botones, inputs, modales, tablas responsivas, badges, drawers, bottom-sheet, etc.)
│   ├── tienda/ (ProductCard, CartDrawer, CategoryFilter, CheckoutForm, DeliveryMethodSelector, etc.)
│   ├── admin/ (Sidebar, BottomNav, StatsCard, DataTable, BarcodeScanner, MobileCardList, etc.)
│   └── shared/ (Logo, LoadingSpinner, EmptyState, etc.)
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── middleware.ts
│   │   └── types.ts (tipos generados de la DB)
│   ├── cloudinary.ts
│   ├── resend.ts
│   ├── pdf.ts (generación de facturas)
│   ├── validations/ (esquemas Zod)
│   └── utils.ts (formateo de moneda GTQ, fechas, etc.)
├── hooks/
│   ├── useAuth.ts
│   ├── useCart.ts
│   ├── useBarcodeScanner.ts
│   ├── useMediaQuery.ts (para responsive)
│   └── ...
├── stores/
│   └── cart-store.ts (Zustand)
├── types/
│   └── index.ts
└── middleware.ts (protección de rutas por rol)
```

### Referencia de implementación Cloudinary (`lib/cloudinary.ts`):
```typescript
// Upload unsigned desde el frontend
const uploadToCloudinary = async (
  file: File,
  type: 'productos' | 'facturas'
) => {
  const preset = type === 'productos'
    ? process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_PRODUCTOS  // 'productos'
    : process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_FACTURAS;  // 'facturas'

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset!);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  return data.secure_url;
};

// Transformaciones recomendadas para mostrar imágenes de producto:
// Thumbnail catálogo: w_400,h_400,c_fill,q_auto,f_auto
// Detalle producto:   w_800,h_800,c_limit,q_auto,f_auto
// Miniatura carrito:  w_100,h_100,c_fill,q_auto,f_auto
```

---

## Instrucciones adicionales

1. **Seguridad:** Validar todos los inputs con Zod en cliente y servidor. Sanitizar datos. Usar RLS en Supabase. El middleware de Next.js debe verificar roles antes de permitir acceso a rutas del admin. Los vendedores no deben poder acceder a configuración ni gestión de usuarios.

2. **Performance:** Usar Server Components donde sea posible. Implementar paginación en todas las listas. Lazy loading de imágenes. Optimizar imágenes con Cloudinary transformations (auto format, auto quality, resize).

3. **Responsive / Mobile-first:**
   - **Tienda en línea:** Diseñada primero para móvil. Grid de 1-2 columnas en móvil, 3-4 en desktop.
   - **Panel admin:** Bottom navigation con los módulos principales en móvil (Dashboard, Ventas, Pedidos, Inventario, Más). Sidebar colapsable en desktop/tablet landscape.
   - **Tablas de datos:** En móvil, mostrar como lista de cards con la info clave visible y el detalle expandible. En desktop, tabla convencional.
   - **POS:** Layout vertical en móvil con el escáner arriba y el ticket abajo. Layout dividido (50/50 o 60/40) en desktop.
   - **Formularios:** Campos de una columna en móvil, multi-columna en desktop.
   - **Modales:** En móvil usar bottom-sheet (drawer desde abajo) en lugar de modales centrados.

4. **UX:**
   - Loading states y skeletons en toda la app
   - Confirmaciones antes de acciones destructivas
   - Toasts para feedback de acciones (éxito, error)
   - Breadcrumbs en el panel admin (en desktop)
   - Búsqueda con debounce
   - El POS debe funcionar de forma fluida, sin lag al escanear
   - Pull-to-refresh en vistas de lista en móvil (donde aplique)

5. **Variables de entorno (ya configuradas en Vercel):**

**Todos los entornos** (Production, Preview, Development) — son públicas, visibles en el cliente:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=(anon key)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=(cloud name)
NEXT_PUBLIC_CLOUDINARY_PRESET_PRODUCTOS=productos
NEXT_PUBLIC_CLOUDINARY_PRESET_FACTURAS=facturas
NEXT_PUBLIC_APP_URL=https://www.thedeposit.shop
```

**Solo Production y Preview** — son secretas, solo accesibles desde el servidor:
```
SUPABASE_SERVICE_ROLE_KEY=(service role key)
CLOUDINARY_API_KEY=(API key)
CLOUDINARY_API_SECRET=(API secret)
RESEND_API_KEY=(API key)
RESEND_FROM_EMAIL=pedidos@thedeposit.shop
```

> En desarrollo local usar `.env.local` con `NEXT_PUBLIC_APP_URL=http://localhost:3000`. En el código, usar fallback: `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'`

6. **Seed data:** Incluir un script de seed que cree:
   - Categorías organizadas con subcategorías (basadas en la reorganización sugerida arriba)
   - Unidades de medida predefinidas (g, kg, lb, oz, ml, l, fl_oz, unidad, resma, barra, filete)
   - Proveedores del Excel (PriceSmart, Maxi Despensa, La Torre, Paiz, Super 24, Casa del Ron Botran, etc.)
   - Algunos productos de ejemplo con presentaciones y precios (basados en datos reales del Excel: Beneful 20kg, Purina Cat Chow 9kg, JW Red Label 750ml, Chiky Fresa 480g, etc.)
   - Un usuario admin de prueba
   - Un usuario vendedor de prueba

7. **Migraciones:** Proveer las migraciones SQL de Supabase para crear todas las tablas, enums, índices, triggers (para updated_at automático), funciones y políticas RLS.

---

## Estado actual e infraestructura confirmada

### ✅ Completado:
- **Dominio:** `www.thedeposit.shop` (primario) con `thedeposit.shop` redirigiendo vía 308. SSL activo. DNS administrado por Vercel (nameservers: ns1.vercel-dns.com, ns2.vercel-dns.com).
- **Vercel:** Proyecto desplegado en plan Hobby, dominio configurado y validado.
- **Resend:** Dominio `thedeposit.shop` verificado (DKIM ✅, SPF ✅, MX ✅). Provider detectado: Vercel. Región: us-east-1 (North Virginia). API Key creada. Configurado como SMTP custom en Supabase Auth (smtp.resend.com:465, usuario `resend`, sender `pedidos@thedeposit.shop`).
- **Cloudinary:** Dos presets unsigned configurados — `productos` (auto-generated unguessable ID) y `facturas` (filename como ID).
- **Variables de entorno:** Todas configuradas en Vercel con los scopes correctos.
- **Supabase:** Migración `001_initial_schema.sql` aplicada. Trigger `handle_new_user` corregido con `SET search_path = public`. Google OAuth activo. Email/password auth activo.

### 📁 Archivos y estructura actual (post Fase 2):
```
src/
├── app/
│   ├── (admin)/admin/
│   │   ├── page.tsx                      — dashboard vacío (Fase 6)
│   │   ├── categorias/                   — CRUD completo ✅
│   │   ├── configuracion/                — unidades de medida CRUD ✅
│   │   ├── productos/                    — CRUD + presentaciones + barcode + Cloudinary ✅
│   │   │   ├── nuevo/
│   │   │   └── [id]/
│   │   └── proveedores/                  — CRUD completo ✅
│   ├── (tienda)/tienda/
│   │   ├── page.tsx                      — catálogo con filtros/búsqueda/paginación ✅
│   │   └── [slug]/                       — detalle de producto ✅
│   └── auth/
│       ├── login/page.tsx                — email+password + Google OAuth, anti-loop ✅
│       └── callback/route.ts             ✅
├── components/
│   ├── admin/
│   │   ├── AdminSidebar.tsx              — filtro por rol, cerrar sesión ✅
│   │   ├── AdminBottomNav.tsx            ✅
│   │   ├── AdminHeader.tsx               — avatar, cerrar sesión ✅
│   │   ├── BarcodeScanner.tsx            — html5-qrcode ✅
│   │   └── ImageUpload.tsx               — drag&drop, Cloudinary ✅
│   ├── tienda/
│   │   ├── TiendaNavbar.tsx              — nombre usuario + dropdown + cerrar sesión ✅
│   │   ├── TiendaFooter.tsx              — redes sociales reales + WhatsApp ✅
│   │   ├── ProductCard.tsx               ✅
│   │   ├── CategoryFilter.tsx            ✅
│   │   └── CatalogoFilters.tsx           ✅
│   ├── shared/Logo.tsx                   ✅
│   └── ui/
│       ├── Button, Input, Badge, Spinner, EmptyState  ✅
│       ├── Modal.tsx                     — bottom-sheet móvil ✅
│       ├── Select.tsx                    ✅
│       ├── Textarea.tsx                  ✅
│       └── ConfirmDialog.tsx             ✅
├── hooks/useAuth.ts                      — imports estáticos, signIn/signUp/reset/signOut ✅
├── lib/
│   ├── cloudinary.ts                     ✅
│   ├── validations/index.ts              — Zod schemas ✅
│   └── supabase/{client,server,middleware,types}.ts  ✅
├── stores/cart-store.ts                  — Zustand + localStorage ✅
└── middleware.ts                         — protección de rutas por rol ✅
```

---

## Prioridad de implementación

Construye en este orden, asegurando que cada fase funcione antes de avanzar:

1. ~~**Fase 1 — Base:** Setup del proyecto, configuración Supabase (migraciones, RLS, triggers), auth con Google OAuth, middleware de roles, layouts (admin con sidebar+bottom nav, tienda con navbar responsive), componentes UI base responsive~~ ✅ **COMPLETADA**
2. ~~**Fase 2 — Catálogo:** Categorías CRUD, unidades de medida, proveedores CRUD, Productos CRUD con presentaciones (barcode scanner, sistema de medidas estandarizado), upload a Cloudinary (preset `productos`), tienda en línea (catálogo responsive, detalle de producto, búsqueda, filtros), auth email+password, navbar con sesión y cerrar sesión~~ ✅ **COMPLETADA**
3. **Fase 3 — Ventas (SIGUIENTE):** Carrito, checkout con selector de método de entrega (envío/recoger en tienda), POS con escáner de código de barras (responsive), gestión de pedidos (ambos flujos: envío y recogida), generación de facturas PDF (subir a Cloudinary con preset `facturas`)
4. **Fase 4 — Financiero:** Compras con proveedores, cuentas por cobrar (con soporte de clientes no registrados por nombre), cuentas por pagar, consignaciones (dadas y recibidas con liquidación)
5. **Fase 5 — Logística:** Envíos (repartidor propio y empresa tercera), tracking, integración de emails transaccionales con Resend desde `pedidos@thedeposit.shop` (todos los templates)
6. **Fase 6 — Dashboard:** KPIs, gráficas con Recharts, alertas, actividad reciente, vista de rentabilidad
7. **Fase 7 — Pulido:** Seed data completo, optimización de rendimiento, revisión de UX en móvil y desktop, tests básicos

---

## Información del negocio para contenido estático

- **Nombre:** The Deposit
- **Dominio principal:** www.thedeposit.shop (thedeposit.shop redirige con 308)
- **Dirección:** Calle Real Lote 25, Aldea San Pedro Las Huertas, La Antigua Guatemala
- **Teléfono/WhatsApp:** +50254204805
- **Email de pedidos/notificaciones:** pedidos@thedeposit.shop
- **Redes sociales:**
  - Facebook: https://www.facebook.com/share/1Hrq2JukAd/?mibextid=wwXIfr
  - Instagram: https://www.instagram.com/deposit.the?igsh=Z3R6emo3eXZ0ZGZq
  - TikTok: https://www.tiktok.com/@the.deposit3?_r=1&_t=ZS-94uCuyltnu4
- **Año de fundación:** 2025

---

*Este prompt describe la versión 1.0. La versión 2.0 incluirá integración con FEL (SAT Guatemala) para facturación electrónica certificada.*
