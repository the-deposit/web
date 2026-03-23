"use client";

import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
  CreditCard, Clock, Boxes, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type {
  KPIs, VentaDiaria, TopProducto, VentaCategoria,
  MargenCategoria, CompetenciaProducto, Alerta,
} from "./dashboard-actions";

const PIE_COLORS = ["#1A1A1A", "#555555", "#888888", "#AAAAAA", "#CCCCCC", "#E5E5E5"];

type Props = {
  isAdmin: boolean;
  kpis: KPIs;
  ventasDiarias: VentaDiaria[];
  topProductos: TopProducto[];
  ventasPorCategoria: VentaCategoria[];
  margenPorCategoria: MargenCategoria[];
  precioVsCompetencia: CompetenciaProducto[];
  alertas: Alerta[];
};

function KPICard({
  titulo,
  valor,
  sub,
  icon: Icon,
  urgente,
}: {
  titulo: string;
  valor: string;
  sub?: string;
  icon: React.ElementType;
  urgente?: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-lg p-4 flex items-start gap-3 ${
        urgente ? "border-red-300 bg-red-50" : "border-gray-200"
      }`}
    >
      <div
        className={`mt-0.5 p-2 rounded-md ${
          urgente ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-700"
        }`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{titulo}</p>
        <p className="font-display text-xl font-bold text-primary truncate">{valor}</p>
        {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-base font-bold uppercase tracking-wider text-primary mb-3">
      {children}
    </h2>
  );
}

function AlertaItem({ alerta }: { alerta: Alerta }) {
  const iconos: Record<Alerta["tipo"], React.ElementType> = {
    stock_bajo: Package,
    proximo_vencer: Clock,
    pedido_sin_procesar: ShoppingCart,
    consignacion: Boxes,
    cxc_vencida: CreditCard,
    cxp_proxima: CreditCard,
  };
  const Icon = iconos[alerta.tipo];
  return (
    <div
      className={`flex items-start gap-2 py-2 px-3 rounded-md text-sm ${
        alerta.urgente ? "bg-red-50 border border-red-200 text-red-800" : "bg-gray-50 border border-gray-200 text-gray-700"
      }`}
    >
      <Icon size={15} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium leading-tight">{alerta.mensaje}</p>
        {alerta.detalle && <p className="text-xs opacity-70 mt-0.5">{alerta.detalle}</p>}
      </div>
    </div>
  );
}

type PeriodTab = "dia" | "semana" | "mes";

export default function DashboardClient({
  isAdmin,
  kpis,
  ventasDiarias,
  topProductos,
  ventasPorCategoria,
  margenPorCategoria,
  precioVsCompetencia,
  alertas,
}: Props) {
  const [ventasPeriodo, setVentasPeriodo] = useState<PeriodTab>("mes");
  const [alertasExpandidas, setAlertasExpandidas] = useState(false);

  // Filtrar ventas diarias según período seleccionado
  const ventasFiltradas = (() => {
    if (ventasPeriodo === "dia") return ventasDiarias.slice(-1);
    if (ventasPeriodo === "semana") return ventasDiarias.slice(-7);
    return ventasDiarias;
  })();

  const alertasUrgentes = alertas.filter((a) => a.urgente);
  const alertasMostradas = alertasExpandidas ? alertas : alertas.slice(0, 5);

  return (
    <div className="space-y-6 pb-8">
      {/* Alertas */}
      {alertas.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <SectionTitle>
              Alertas
              {alertasUrgentes.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-red-600 normal-case tracking-normal">
                  <AlertTriangle size={12} />
                  {alertasUrgentes.length} urgente(s)
                </span>
              )}
            </SectionTitle>
          </div>
          <div className="space-y-1.5">
            {alertasMostradas.map((a, i) => (
              <AlertaItem key={i} alerta={a} />
            ))}
          </div>
          {alertas.length > 5 && (
            <button
              onClick={() => setAlertasExpandidas(!alertasExpandidas)}
              className="mt-2 text-xs text-gray-500 flex items-center gap-1 hover:text-gray-800 transition-colors"
            >
              {alertasExpandidas ? (
                <>
                  <ChevronUp size={12} /> Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown size={12} /> Ver {alertas.length - 5} más
                </>
              )}
            </button>
          )}
        </section>
      )}

      {/* KPIs */}
      <section>
        <SectionTitle>Resumen</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <KPICard
            titulo="Ventas hoy"
            valor={formatCurrency(kpis.ventasHoy)}
            icon={TrendingUp}
          />
          <KPICard
            titulo="Ventas semana"
            valor={formatCurrency(kpis.ventasSemana)}
            icon={TrendingUp}
          />
          <KPICard
            titulo="Ventas mes"
            valor={formatCurrency(kpis.ventasMes)}
            icon={TrendingUp}
          />
          {isAdmin && (
            <KPICard
              titulo="Ganancia bruta (mes)"
              valor={formatCurrency(kpis.gananciaMes)}
              sub={kpis.ventasMes > 0 ? `${Math.round((kpis.gananciaMes / kpis.ventasMes) * 100)}% margen` : undefined}
              icon={TrendingUp}
            />
          )}
          <KPICard
            titulo="Pedidos pendientes"
            valor={String(kpis.pedidosPendientes)}
            icon={ShoppingCart}
            urgente={kpis.pedidosPendientes > 0}
          />
          <KPICard
            titulo="Stock bajo"
            valor={String(kpis.stockBajoCount)}
            icon={Package}
            urgente={kpis.stockBajoCount > 0}
          />
          {isAdmin && (
            <>
              <KPICard
                titulo="CxC vencidas"
                valor={formatCurrency(kpis.cxcVencidasMonto)}
                icon={CreditCard}
                urgente={kpis.cxcVencidasMonto > 0}
              />
              <KPICard
                titulo="CxP próximas (7 días)"
                valor={formatCurrency(kpis.cxpProximasMonto)}
                icon={CreditCard}
                urgente={kpis.cxpProximasMonto > 0}
              />
              <KPICard
                titulo="Consignaciones activas"
                valor={String(kpis.consignacionesActivas)}
                icon={Boxes}
              />
            </>
          )}
        </div>
      </section>

      {/* Gráfica ventas diarias */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>{isAdmin ? "Ventas y ganancia" : "Ventas"}</SectionTitle>
          <div className="flex gap-1">
            {(["dia", "semana", "mes"] as PeriodTab[]).map((p) => (
              <button
                key={p}
                onClick={() => setVentasPeriodo(p)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  ventasPeriodo === p
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {p === "dia" ? "Hoy" : p === "semana" ? "7 días" : "30 días"}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {ventasFiltradas.every((v) => v.ventas === 0) ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin ventas en el período</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={ventasFiltradas} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => `Q${v}`} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value ?? 0)),
                    name === "ventas" ? "Ventas" : "Ganancia",
                  ]}
                />
                {isAdmin && (
                  <Legend formatter={(v) => (v === "ventas" ? "Ventas" : "Ganancia")} />
                )}
                <Line
                  type="monotone"
                  dataKey="ventas"
                  stroke="#1A1A1A"
                  strokeWidth={2}
                  dot={false}
                />
                {isAdmin && (
                  <Line
                    type="monotone"
                    dataKey="ganancia"
                    stroke="#888888"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 2"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Top 10 productos */}
      {topProductos.length > 0 && (
        <section>
          <SectionTitle>Top 10 productos (mes)</SectionTitle>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                layout="vertical"
                data={topProductos}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={120}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 16) + "…" : v)}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    name === "cantidad" ? `${value} uds` : formatCurrency(Number(value ?? 0)),
                    name === "cantidad" ? "Vendidos" : "Ingresos",
                  ]}
                />
                <Bar dataKey="cantidad" fill="#1A1A1A" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Ventas por categoría + Margen */}
      {ventasPorCategoria.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 ${isAdmin ? "md:grid-cols-2" : ""}`}>
          <section>
            <SectionTitle>Ventas por categoría (mes)</SectionTitle>
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={ventasPorCategoria}
                    dataKey="ventas"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={(entry: any) =>
                      `${(entry.nombre as string)?.split(" ")[0] ?? "—"} ${Math.round((entry.percent ?? 0) * 100)}%`
                    }
                    labelLine={false}
                  >
                    {ventasPorCategoria.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {isAdmin && (
            <section>
              <SectionTitle>Margen por categoría (mes)</SectionTitle>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                {margenPorCategoria.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={margenPorCategoria}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="nombre"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 10) + "…" : v)}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Tooltip formatter={(v: any) => [`${v}%`, "Margen"]} />
                      <Bar dataKey="margen" fill="#333333" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Precio vs competencia — solo admin */}
      {isAdmin && precioVsCompetencia.length > 0 && (
        <section>
          <SectionTitle>Precio vs competencia</SectionTitle>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={precioVsCompetencia}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 12) + "…" : v)}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Q${v}`} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip formatter={(v: any) => formatCurrency(Number(v ?? 0))} />
                <Legend />
                <Bar dataKey="precioVenta" name="Nuestro precio" fill="#1A1A1A" radius={[3, 3, 0, 0]} />
                <Bar dataKey="precioCompetencia" name="Competencia" fill="#AAAAAA" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
