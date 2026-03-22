import { TiendaNavbar } from "@/components/tienda/TiendaNavbar";
import { TiendaFooter } from "@/components/tienda/TiendaFooter";

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <TiendaNavbar />
      <main className="flex-1">{children}</main>
      <TiendaFooter />
    </div>
  );
}
