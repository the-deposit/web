"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  Truck,
  DollarSign,
  ReceiptText,
  Users,
  Settings,
  BarChart3,
  FileText,
  RefreshCcw,
  Store,
  LogOut,
  Tag,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/inventario", label: "Inventario", icon: Package },
  { href: "/admin/productos", label: "Productos", icon: Store },
  { href: "/admin/categorias", label: "Categorías", icon: Tag },
  { href: "/admin/proveedores", label: "Proveedores", icon: Building2 },
  { href: "/admin/ventas/pos", label: "Punto de Venta", icon: ShoppingCart },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/compras", label: "Compras", icon: ReceiptText },
  { href: "/admin/envios", label: "Envíos", icon: Truck },
  { href: "/admin/consignaciones", label: "Consignaciones", icon: RefreshCcw },
  { href: "/admin/cuentas-por-cobrar", label: "Por Cobrar", icon: DollarSign },
  { href: "/admin/cuentas-por-pagar", label: "Por Pagar", icon: BarChart3 },
  { href: "/admin/facturas", label: "Facturas", icon: FileText },
];

const adminOnlyItems = [
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const handleSignOut = () => {
    window.location.href = "/auth/signout";
  };

  const NavLink = ({ href, label, icon: Icon, exact }: typeof navItems[0]) => {
    const active = isActive(href, exact);
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded text-sm font-body font-medium transition-all duration-150",
          active
            ? "bg-secondary/10 text-secondary"
            : "text-secondary/60 hover:text-secondary hover:bg-secondary/5"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-primary text-secondary min-h-screen shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-secondary/10">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="font-display text-secondary text-lg tracking-widest uppercase">
            The Deposit
          </span>
        </Link>
        <p className="text-xs text-secondary/50 mt-0.5 font-body">Panel Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        {/* Admin-only section */}
        {profile?.role === "admin" && (
          <div className="px-3 mt-6">
            <p className="text-[10px] font-body tracking-widest text-secondary/30 uppercase px-3 mb-2">
              Administración
            </p>
            <div className="space-y-0.5">
              {adminOnlyItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-secondary/10 space-y-2">
        <Link
          href="/tienda"
          className="block text-xs text-secondary/50 hover:text-secondary transition-colors font-body"
        >
          ← Ver tienda
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs text-secondary/50 hover:text-error transition-colors font-body w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
