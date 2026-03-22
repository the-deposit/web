import Link from "next/link";

const WHATSAPP_NUMBER = "50254204805";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

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
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-secondary transition-colors"
                >
                  {/* WhatsApp icon */}
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  +502 5420-4805
                </a>
              </p>
            </address>
            <div className="flex gap-4 mt-3 text-sm text-secondary/80">
              <a
                href="https://www.facebook.com/share/1Hrq2JukAd/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-secondary transition-colors"
              >
                Facebook
              </a>
              <a
                href="https://www.instagram.com/deposit.the?igsh=Z3R6emo3eXZ0ZGZq"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-secondary transition-colors"
              >
                Instagram
              </a>
              <a
                href="https://www.tiktok.com/@the.deposit3?_r=1&_t=ZS-94uCuyltnu4"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-secondary transition-colors"
              >
                TikTok
              </a>
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
