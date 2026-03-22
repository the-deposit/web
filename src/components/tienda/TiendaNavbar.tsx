"use client";

import Link from "next/link";
import { ShoppingCart, User, Search, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/shared/Logo";
import { useCartStore } from "@/stores/cart-store";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/tienda", label: "Catálogo" },
  { href: "/tienda/mis-pedidos", label: "Mis Pedidos" },
];

const WHATSAPP_URL = "https://wa.me/50254204805";

export function TiendaNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const totalItems = useCartStore((state) => state.totalItems());
  const { user, profile, signOut, isVendedor, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-secondary border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Logo size="sm" href="/tienda" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-mid hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* WhatsApp */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex p-2 rounded hover:bg-gray-light transition-colors"
            aria-label="WhatsApp"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-primary" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>

          {/* Cart */}
          <Link href="/tienda/carrito" className="relative p-2 rounded hover:bg-gray-light transition-colors">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-secondary text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>

          {/* User — desktop */}
          {!loading && (
            <div className="hidden md:flex items-center gap-1">
              {user ? (
                <>
                  <Link href="/tienda/mi-perfil" className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-light transition-colors">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-sm font-medium text-primary max-w-[100px] truncate">
                      {profile?.full_name?.split(" ")[0] ?? "Mi cuenta"}
                    </span>
                  </Link>
                  {isVendedor && (
                    <Link href="/admin" className="p-2 rounded hover:bg-gray-light transition-colors" title="Panel Admin">
                      <LayoutDashboard className="w-4 h-4 text-primary" />
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-error hover:bg-error/5 transition-colors"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="w-4 h-4" />
                    Salir
                  </button>
                </>
              ) : (
                <Link href="/auth/login" className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-gray-light transition-colors">
                  <User className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Ingresar</span>
                </Link>
              )}
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded hover:bg-gray-light transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-secondary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-3 text-sm font-medium text-primary hover:bg-gray-light border-b border-border"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary hover:bg-gray-light border-b border-border"
            onClick={() => setMobileOpen(false)}
          >
            WhatsApp
          </a>
          {user ? (
            <>
              <Link
                href="/tienda/mi-perfil"
                className="block px-4 py-3 text-sm font-medium text-primary hover:bg-gray-light border-b border-border"
                onClick={() => setMobileOpen(false)}
              >
                Mi Perfil
              </Link>
              {isVendedor && (
                <Link
                  href="/admin"
                  className="block px-4 py-3 text-sm font-medium text-primary hover:bg-gray-light border-b border-border"
                  onClick={() => setMobileOpen(false)}
                >
                  Panel Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className={cn(
                  "flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-error hover:bg-gray-light"
                )}
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="block px-4 py-3 text-sm font-medium text-primary hover:bg-gray-light"
              onClick={() => setMobileOpen(false)}
            >
              Iniciar Sesión
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
