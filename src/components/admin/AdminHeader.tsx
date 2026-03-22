"use client";

import { Bell, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

const routeLabels: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/inventario": "Inventario",
  "/admin/productos": "Productos",
  "/admin/ventas/pos": "Punto de Venta",
  "/admin/pedidos": "Pedidos",
  "/admin/compras": "Compras",
  "/admin/envios": "Envíos",
  "/admin/consignaciones": "Consignaciones",
  "/admin/cuentas-por-cobrar": "Cuentas por Cobrar",
  "/admin/cuentas-por-pagar": "Cuentas por Pagar",
  "/admin/facturas": "Facturas",
  "/admin/usuarios": "Usuarios",
  "/admin/configuracion": "Configuración",
};

export function AdminHeader() {
  const pathname = usePathname();
  const label = routeLabels[pathname] ?? "Admin";

  return (
    <header className="bg-secondary border-b border-border px-4 md:px-6 h-14 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <span className="md:hidden font-display text-primary tracking-widest uppercase text-sm">
          The Deposit
        </span>
        <span className="hidden md:flex items-center gap-2 text-sm font-body text-gray-mid">
          Admin
          <ChevronRight className="w-3 h-3" />
          <span className="text-primary font-medium">{label}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded hover:bg-gray-light transition-colors" aria-label="Notificaciones">
          <Bell className="w-5 h-5 text-primary" />
          {/* Badge placeholder */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
        </button>
      </div>
    </header>
  );
}
