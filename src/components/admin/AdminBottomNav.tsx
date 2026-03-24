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
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const primaryItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/ventas/pos", label: "Ventas", icon: ShoppingCart },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/inventario", label: "Inventario", icon: Package },
];

const moreSections = [
  {
    label: "Gestión",
    items: [
      { href: "/admin/compras", label: "Compras", icon: ReceiptText },
      { href: "/admin/envios", label: "Envíos", icon: Truck },
      { href: "/admin/consignaciones", label: "Consignaciones", icon: RefreshCcw },
      { href: "/admin/facturas", label: "Facturas", icon: FileText },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/admin/cuentas-por-cobrar", label: "Por Cobrar", icon: DollarSign },
      { href: "/admin/cuentas-por-pagar", label: "Por Pagar", icon: BarChart3 },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/admin/productos", label: "Productos", icon: Store },
      { href: "/admin/categorias", label: "Categorías", icon: Tag },
      { href: "/admin/proveedores", label: "Proveedores", icon: Building2 },
    ],
  },
];

const adminOnlySection = {
  label: "Sistema",
  items: [
    { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    { href: "/admin/configuracion", label: "Configuración", icon: Settings },
  ],
};

export function AdminBottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const allMoreItems = [
    ...moreSections.flatMap((s) => s.items),
    ...adminOnlySection.items,
  ];
  const moreIsActive = allMoreItems.some((item) => pathname.startsWith(item.href));

  const sections = profile?.role === "admin"
    ? [...moreSections, adminOnlySection]
    : moreSections;

  return (
    <>
      {/* Overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "md:hidden fixed left-0 right-0 bottom-16 z-50 bg-secondary rounded-t-2xl border-t border-border transition-transform duration-300 ease-out",
          moreOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ maxHeight: "72vh" }}
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border" />
          <span className="text-xs font-body font-semibold uppercase tracking-wider text-gray-mid pt-1">
            Todas las secciones
          </span>
          <button
            onClick={() => setMoreOpen(false)}
            className="p-1.5 rounded-full hover:bg-gray-light transition-colors"
          >
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Sections */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(72vh - 52px)" }}>
          {sections.map((section) => (
            <div key={section.label}>
              <p className="px-4 pt-4 pb-1.5 text-[10px] font-body font-semibold uppercase tracking-widest text-gray-mid">
                {section.label}
              </p>
              <div className="grid grid-cols-2 gap-px bg-border mx-4 rounded-lg overflow-hidden">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-body font-medium transition-colors bg-secondary",
                        active
                          ? "text-primary bg-primary/5"
                          : "text-gray-mid hover:text-primary hover:bg-gray-light"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", active && "text-primary")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="h-4" />
        </div>
      </div>

      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-primary border-t border-secondary/10">
        <div className="flex items-stretch h-16">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-body font-medium transition-all active:opacity-70",
                  active ? "text-secondary" : "text-secondary/40"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-body font-medium transition-all active:opacity-70",
              moreOpen || moreIsActive ? "text-secondary" : "text-secondary/40"
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
