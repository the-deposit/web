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
- ✅ **Fase 3** — Carrito, checkout (envío/recoger en tienda), Mis Pedidos, Mi Perfil (addresses CRUD), POS con escáner, gestión de pedidos admin (ambos flujos), facturas PDF (jsPDF), módulo facturas admin
- 🔲 **Fase 4** — Financiero: compras con proveedores, cuentas por cobrar/pagar, consignaciones
- 🔲 **Fase 5** — Logística: envíos, tracking, emails transaccionales con Resend
- 🔲 **Fase 6** — Dashboard: KPIs, Recharts, alertas
- 🔲 **Fase 7** — Seed completo, pulido UX, tests básicos

---

## Migraciones aplicadas
- `001_initial_schema.sql` — Tablas base, ENUMs, RLS parcial, trigger handle_new_user
- `002_fase3_ventas.sql` — Tablas: sales, sale_items, orders, order_items, invoices; secuencia invoice_number_seq, función next_invoice_number(), RLS

**Why:** El negocio necesita digitalizar operaciones de venta, pedidos online y facturación interna.
**How to apply:** Al comenzar Fase 4, revisar si hay necesidad de migración adicional para purchases, accounts_receivable, accounts_payable, consignments.

---

## Archivos clave

### Tipos Supabase
`src/lib/supabase/types.ts` — Incluye todos los tipos hasta Fase 3 (sales, orders, invoices, etc.)

### Acciones (server actions)
- `src/app/(tienda)/tienda/checkout/actions.ts` — createOrder, getUserAddresses, createAddress, cancelOrder
- `src/app/(tienda)/tienda/mi-perfil/actions.ts` — updateProfile, CRUD addresses
- `src/app/(admin)/admin/ventas/pos/actions.ts` — searchByBarcode, searchByName, createPOSSale
- `src/app/(admin)/admin/pedidos/actions.ts` — updateOrderStatus, getOrders, convertOrderToSale

### Utilidades
- `src/lib/pdf.ts` — generateInvoicePDF (abre en nueva tab), generateInvoicePDFBlob (retorna Blob para upload)
- `src/lib/utils.ts` — formatCurrency (GTQ), formatDate, formatDateTime, formatMeasure, generateInvoiceNumber
- `src/stores/cart-store.ts` — Zustand + localStorage

### Componentes UI
- `src/components/ui/ConfirmDialog.tsx` — tiene prop `variant: "danger" | "primary"` (actualizado Fase 3)
- `src/components/ui/EmptyState.tsx` — icon es `LucideIcon` (no JSX)
- `src/components/admin/BarcodeScanner.tsx` — props: `onScan(code)`, `onClose()` — renderiza como modal full-screen

### Patrón crítico
Todos los server actions usan:
```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;
const supabase: SupabaseClient = await createClient();
```
Esto es necesario porque los tipos de Supabase tienen referencias circulares.
