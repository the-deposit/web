"use client";

import Link from "next/link";
import { ShoppingCart, User, Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/shared/Logo";
import { useCartStore } from "@/stores/cart-store";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/tienda", label: "Catálogo" },
  { href: "/tienda/mis-pedidos", label: "Mis Pedidos" },
  { href: "/tienda/mi-perfil", label: "Mi Perfil" },
];

export function TiendaNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const totalItems = useCartStore((state) => state.totalItems());

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
        <div className="flex items-center gap-2">
          <button className="p-2 rounded hover:bg-gray-light transition-colors" aria-label="Buscar">
            <Search className="w-5 h-5 text-primary" />
          </button>

          <Link href="/tienda/carrito" className="relative p-2 rounded hover:bg-gray-light transition-colors">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-secondary text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>

          <Link href="/auth/login" className="hidden md:flex p-2 rounded hover:bg-gray-light transition-colors">
            <User className="w-5 h-5 text-primary" />
          </Link>

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
              className="block px-4 py-3 text-sm font-medium text-primary hover:bg-gray-light border-b border-border last:border-0"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/auth/login"
            className="block px-4 py-3 text-sm font-medium text-primary hover:bg-gray-light"
            onClick={() => setMobileOpen(false)}
          >
            Iniciar Sesión
          </Link>
        </nav>
      )}
    </header>
  );
}
