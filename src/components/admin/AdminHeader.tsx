"use client";

import { Bell, ChevronRight, LogOut, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

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
  const { profile, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName =
    profile?.full_name?.split(" ")[0] ??
    profile?.email?.split("@")[0] ??
    null;

  const handleSignOut = async () => {
    await signOut();
    window.location.replace("/auth/login");
  };

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
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded hover:bg-gray-light transition-colors"
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-secondary" />
              </div>
            )}
            {/* Show name on desktop, show on mobile too once loaded */}
            {!loading && (
              <span className="text-sm font-medium text-primary max-w-[140px] truncate">
                {displayName ?? "Mi cuenta"}
              </span>
            )}
            {loading && (
              <span className="w-16 h-4 bg-gray-light rounded animate-pulse hidden md:block" />
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-52 bg-secondary border border-border rounded shadow-md z-50">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-primary truncate">
                    {profile?.full_name ?? profile?.email ?? "Usuario"}
                  </p>
                  <p className="text-xs text-gray-mid truncate">{profile?.email}</p>
                  {profile?.role && (
                    <span className="mt-1 inline-block text-[10px] font-body uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {profile.role}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-error hover:bg-gray-light transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
