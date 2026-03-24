"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  MoreHorizontal,
  X,
  Truck,
  ReceiptText,
  RefreshCcw,
  DollarSign,
  BarChart3,
  FileText,
  Settings,
  Store,
  Tag,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/ventas/pos", label: "Ventas", icon: ShoppingCart },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/inventario", label: "Inventario", icon: Package },
];

const moreItems = [
  { href: "/admin/compras", label: "Compras", icon: ReceiptText },
  { href: "/admin/envios", label: "Envíos", icon: Truck },
  { href: "/admin/consignaciones", label: "Consignaciones", icon: RefreshCcw },
  { href: "/admin/cuentas-por-cobrar", label: "Por Cobrar", icon: DollarSign },
  { href: "/admin/cuentas-por-pagar", label: "Por Pagar", icon: BarChart3 },
  { href: "/admin/facturas", label: "Facturas", icon: FileText },
  { href: "/admin/productos", label: "Productos", icon: Store },
  { href: "/admin/categorias", label: "Categorías", icon: Tag },
  { href: "/admin/proveedores", label: "Proveedores", icon: Building2 },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const moreIsActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {/* More sheet overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More sheet */}
      {moreOpen && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-secondary border-t border-border rounded-t-2xl pb-2 safe-area-bottom">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-body font-semibold uppercase tracking-wider text-gray-mid">
              Más secciones
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-1 rounded hover:bg-gray-light transition-colors"
            >
              <X className="w-4 h-4 text-primary" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 p-3">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-lg text-[10px] font-body font-medium transition-all",
                    active
                      ? "bg-primary text-secondary"
                      : "text-primary hover:bg-gray-light"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-center leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-primary border-t border-secondary/10 safe-area-bottom">
        <div className="flex items-stretch h-16">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-body font-medium transition-all",
                  active ? "text-secondary" : "text-secondary/50"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-body font-medium transition-all",
              moreOpen || moreIsActive ? "text-secondary" : "text-secondary/50"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}
