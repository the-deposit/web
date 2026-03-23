import { getDashboardData } from "./dashboard-actions";
import DashboardClient from "./DashboardClient";

export default async function AdminDashboard() {
  const data = await getDashboardData();

  return (
    <div>
      <h1 className="font-display text-2xl text-primary mb-6">Dashboard</h1>
      <DashboardClient
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
