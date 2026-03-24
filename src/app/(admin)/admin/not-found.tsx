import Link from "next/link";
import { Home } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center">
      <p className="font-display text-7xl text-gray-300 leading-none">404</p>
      <h1 className="font-display text-xl text-primary">Página no encontrada</h1>
      <p className="text-sm text-gray-mid max-w-xs">
        La sección que buscas no existe o fue movida.
      </p>
      <Link
        href="/admin"
        className="flex items-center gap-2 mt-2 px-4 py-2 bg-primary text-secondary rounded text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Home className="w-4 h-4" />
        Ir al Dashboard
      </Link>
    </div>
  );
}
