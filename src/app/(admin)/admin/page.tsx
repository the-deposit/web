import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "./dashboard-actions";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = (profile as any)?.role === "admin";
  const data = await getDashboardData(isAdmin);

  return (
    <div>
      <h1 className="font-display text-2xl text-primary mb-6">Dashboard</h1>
      <DashboardClient
        isAdmin={isAdmin}
        kpis={data.kpis}
        ventasDiarias={data.ventasDiarias}
        topProductos={data.topProductos}
        ventasPorCategoria={data.ventasPorCategoria}
        margenPorCategoria={data.margenPorCategoria}
        precioVsCompetencia={data.precioVsCompetencia}
        alertas={data.alertas}
      />
    </div>
  );
}
