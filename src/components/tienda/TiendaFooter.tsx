import Link from "next/link";

export function TiendaFooter() {
  return (
    <footer className="bg-primary text-secondary mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <span className="font-display text-lg tracking-widest text-secondary uppercase">
                The Deposit
              </span>
            </div>
            <p className="text-sm text-secondary/70">
              Depósito mayorista y minorista.<br />
              La Antigua Guatemala.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-sm tracking-widest mb-3 text-secondary/50">Tienda</h4>
            <ul className="space-y-2 text-sm text-secondary/80">
              <li><Link href="/tienda" className="hover:text-secondary transition-colors">Catálogo</Link></li>
              <li><Link href="/tienda/mis-pedidos" className="hover:text-secondary transition-colors">Mis Pedidos</Link></li>
              <li><Link href="/tienda/mi-perfil" className="hover:text-secondary transition-colors">Mi Perfil</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-sm tracking-widest mb-3 text-secondary/50">Contacto</h4>
            <address className="not-italic text-sm text-secondary/80 space-y-1">
              <p>Calle Real Lote 25</p>
              <p>Aldea San Pedro Las Huertas</p>
              <p>La Antigua Guatemala</p>
              <p className="mt-2">
                <a href="tel:54204805" className="hover:text-secondary transition-colors">54204805</a>
              </p>
            </address>
            <div className="flex gap-4 mt-3 text-sm text-secondary/80">
              <a href="https://facebook.com" className="hover:text-secondary transition-colors">FB</a>
              <a href="https://instagram.com/deposit.the" className="hover:text-secondary transition-colors">IG</a>
              <a href="https://tiktok.com/@the.deposit3" className="hover:text-secondary transition-colors">TK</a>
            </div>
          </div>
        </div>

        <div className="border-t border-secondary/10 mt-8 pt-6 text-center text-xs text-secondary/50">
          © 2025 The Deposit. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
