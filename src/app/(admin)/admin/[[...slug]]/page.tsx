import { notFound } from "next/navigation";

// Catch-all para rutas inexistentes dentro de /admin/*
// Al llamar notFound() aquí, Next.js usa el not-found.tsx del segmento
// manteniendo el AdminLayout intacto.
export default function AdminCatchAll() {
  notFound();
}
