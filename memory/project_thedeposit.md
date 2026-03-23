---
name: project_thedeposit
description: The Deposit web app — descripción, fases, stack, estado actual y archivos clave
type: project
---

## The Deposit — Web App

**Descripción:** Depósito/tienda mayorista y minorista en Aldea San Pedro Las Huertas, La Antigua Guatemala. Compran al por mayor y revenden en diferentes presentaciones.

**Stack:** Next.js 16.2.1, React 19, TypeScript, Tailwind CSS v4, Supabase (PostgreSQL + Auth Google OAuth), Cloudinary (presets: `productos`, `facturas`), Resend (pedidos@thedeposit.shop), Zustand, jsPDF.

**Dominio:** www.thedeposit.shop · Vercel Hobby

---

## Estado de Fases

- ✅ **Fase 1** — Setup, Supabase migrations, Auth Google + email/password, layouts admin/tienda, middleware roles
- ✅ **Fase 2** — Categorías CRUD, unidades de medida, proveedores, productos + presentaciones + BarcodeScanner + Cloudinary, catálogo tienda, detalle producto
- ✅ **Fase 3** — Carrito, checkout (envío/recoger en tienda), Mis Pedidos, Mi Perfil (addresses CRUD), POS con escáner, gestión de pedidos admin (ambos flujos), facturas PDF (jsPDF), módulo facturas admin. Fixes: NIT en proveedores/pedidos, amount_paid en ventas, rango de precios en tarjetas, PDF de factura a Cloudinary, email de confirmación al hacer pedido.
- ✅ **Fase 4** — Financiero: compras con proveedores (tarjeta crea CxP automático), cuentas por cobrar (auto-CxC desde POS y pedidos), cuentas por pagar, consignaciones (dada/recibida).
- ✅ **Fase 5** — Logística: módulo envíos (crear, avanzar estado, tracking), emails transaccionales completos: confirmación pedido, actualización de estado de pedido, notificación de envío (en camino / entregado).
- ✅ **Fase 6** — Dashboard: KPIs, Recharts, alertas, info financiera oculta a vendedores. Correcciones post-lanzamiento: redirect login desde carrito/mis-pedidos (param `redirect=`), sincronización automática estado pedido al avanzar envío (en_camino → enviado, entregado → entregado), cancelar pedido con feedback de error + loading, edición de pedidos antes de confirmación desde cliente (pendiente) y admin/vendedor (pendiente/revisado).
- 🔲 **Fase 7** — Seed completo, pulido UX, tests básicos

---

## Migraciones aplicadas
- `001_initial_schema.sql` — Tablas base, ENUMs, RLS parcial, trigger handle_new_user
- `002_fase3_ventas.sql` — Tablas: sales, sale_items, orders, order_items, invoices; secuencia invoice_number_seq, función next_invoice_number(), RLS
- `003_fase3_fixes.sql` — Agrega: `suppliers.nit`, `sales.amount_paid`, `orders.customer_nit`
- `004_fase4_cxp_flexible.sql` — Hace `accounts_payable.source_type` y `source_id` nullable; agrega columna `notes` — **PENDIENTE APLICAR**

---

## Módulos y archivos Fase 4–6 (nuevos)

### Compras (`/admin/compras`)
- `src/app/(admin)/admin/compras/actions.ts` — createCompra, getCompras, getSuppliersList, getCreditCardsList, searchPresentationsForPurchase
- `src/app/(admin)/admin/compras/ComprasList.tsx`
- `src/app/(admin)/admin/compras/page.tsx`
- `src/app/(admin)/admin/compras/nueva/NuevaCompraClient.tsx`
- `src/app/(admin)/admin/compras/nueva/page.tsx`

### Cuentas por Cobrar (`/admin/cuentas-por-cobrar`)
- `src/app/(admin)/admin/cuentas-por-cobrar/actions.ts` — getCxC, registerCxCPayment, createManualCxC, **autoCreateCxC** (importada por POS y pedidos)
- `src/app/(admin)/admin/cuentas-por-cobrar/CxCList.tsx`
- `src/app/(admin)/admin/cuentas-por-cobrar/page.tsx`

### Cuentas por Pagar (`/admin/cuentas-por-pagar`)
- `src/app/(admin)/admin/cuentas-por-pagar/actions.ts` — getCxP, registerCxPPayment, createManualCxP
- `src/app/(admin)/admin/cuentas-por-pagar/CxPList.tsx` — usa `creditor_name` (campo real del schema)
- `src/app/(admin)/admin/cuentas-por-pagar/page.tsx`
- **Nota:** compras/actions.ts ya crea CxP inline (usando source_type='compra_tarjeta') al pagar con tarjeta

### Consignaciones (`/admin/consignaciones`)
- `src/app/(admin)/admin/consignaciones/actions.ts` — getConsignaciones, createConsignacion, updateConsignacionStatus, updateConsignacionItem
- `src/app/(admin)/admin/consignaciones/ConsignacionesList.tsx`
- `src/app/(admin)/admin/consignaciones/page.tsx`
- `src/app/(admin)/admin/consignaciones/nueva/NuevaConsignacionClient.tsx`
- `src/app/(admin)/admin/consignaciones/nueva/page.tsx`

### Envíos (`/admin/envios`)
- `src/app/(admin)/admin/envios/actions.ts` — getEnvios, createEnvio, **updateEnvioStatus** (envía email + sincroniza estado del order: en_camino → enviado, entregado → entregado), getPendingShipmentOrders
- `src/app/(admin)/admin/envios/EnviosList.tsx`
- `src/app/(admin)/admin/envios/page.tsx`

### Dashboard (`/admin`)
- `src/app/(admin)/admin/page.tsx` — SSR que obtiene KPIs y pasa a DashboardClient
- `src/app/(admin)/admin/dashboard-actions.ts` — queries por rol (info financiera oculta a vendedores)
- `src/app/(admin)/admin/DashboardClient.tsx` — gráficas Recharts + alertas

### Email (`src/lib/email.ts`)
- `sendOrderConfirmation` — al crear pedido
- `sendOrderStatusUpdate` — al cambiar estado (confirmado, en_preparacion, listo_para_recoger, enviado, cancelado)
- `sendShipmentUpdate` — al marcar en_camino o entregado

---

## Schema relevante (accounts_payable)
La tabla `accounts_payable` usa:
- `source_type` ENUM ('compra_tarjeta', 'consignacion_recibida') — nullable tras migración 004
- `source_id` UUID — nullable tras migración 004
- `creditor_name` TEXT — nombre del acreedor (NO `supplier_name`)
No tiene columnas supplier_id, credit_card_id ni purchase_id.

---

## Archivos clave

### Tipos Supabase
`src/lib/supabase/types.ts` — Incluye todos los tipos hasta Fase 3 (sales, orders, invoices, etc.)

### Acciones (server actions)
- `src/app/(tienda)/tienda/checkout/actions.ts` — createOrder, getUserAddresses, createAddress, cancelOrder, **updateOrderDetails** (edición de pedido en estado `pendiente` por el cliente — delivery_method, address_id, notes_customer, customer_nit, items con cantidades)
- `src/app/(tienda)/tienda/mis-pedidos/page.tsx` — select incluye `address_id` y `customer_nit`; redirect usa `?redirect=`
- `src/app/(tienda)/tienda/mi-perfil/actions.ts` — updateProfile, CRUD addresses
- `src/app/(admin)/admin/ventas/pos/actions.ts` — searchByBarcode, searchByName, createPOSSale (llama autoCreateCxC si pago parcial/pendiente)
- `src/app/(admin)/admin/pedidos/actions.ts` — updateOrderStatus, getOrders, convertOrderToSale, **updateOrderAdmin** (edición pedidos `pendiente`/`revisado` por admin — notas, NIT, items), **searchPresentationsForOrder**

### Auth
- `src/app/auth/login/page.tsx` — lee `searchParams.get("redirect")` para el redirect post-login
- Todos los redirects a login usan `?redirect=` (NO `?next=`)

### Utilidades
- `src/lib/pdf.ts` — generateInvoicePDF (abre en nueva tab), generateInvoicePDFBlob (retorna Blob para upload)
- `src/lib/cloudinary-server.ts` — uploadPDFToCloudinary (server-side, buffer→base64)
- `src/lib/utils.ts` — formatCurrency (GTQ), formatDate, formatDateTime, formatMeasure, generateInvoiceNumber
- `src/stores/cart-store.ts` — Zustand + localStorage

### Componentes UI
- `src/components/ui/Badge.tsx` — variants: `"default" | "success" | "warning" | "error" | "info" | "outline"` (NO "danger")
- `src/components/ui/ConfirmDialog.tsx` — tiene prop `variant: "danger" | "primary"` y `loading?: boolean`
- `src/components/ui/EmptyState.tsx` — icon es `LucideIcon` (no JSX)
- `src/components/admin/BarcodeScanner.tsx` — props: `onScan(code)`, `onClose()` — renderiza como modal full-screen
- `src/components/admin/AdminSidebar.tsx` — ya incluye rutas de Fase 4, 5 y 6

### Patrón crítico
Todos los server actions usan:
```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;
const supabase: SupabaseClient = await createClient();
```
Esto es necesario porque los tipos de Supabase tienen referencias circulares.
