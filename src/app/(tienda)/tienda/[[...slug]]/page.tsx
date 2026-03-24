import { notFound } from "next/navigation";

// Catch-all para rutas inexistentes dentro de /tienda/* con más de un segmento.
// (Un segmento como /tienda/foo ya lo maneja [slug]/page.tsx)
export default function TiendaCatchAll() {
  notFound();
}
