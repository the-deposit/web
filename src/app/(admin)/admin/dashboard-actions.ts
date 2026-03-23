"use server";

import { createClient } from "@/lib/supabase/server";

export type KPIs = {
  ventasHoy: number;
  ventasSemana: number;
  ventasMes: number;
  gananciaMes: number;
  pedidosPendientes: number;
  stockBajoCount: number;
  cxcVencidasMonto: number;
  cxpProximasMonto: number;
  consignacionesActivas: number;
};

export type VentaDiaria = {
  fecha: string;
  ventas: number;
  ganancia: number;
};

export type TopProducto = {
  nombre: string;
  cantidad: number;
  ingresos: number;
};

export type VentaCategoria = {
  nombre: string;
  ventas: number;
};

export type MargenCategoria = {
  nombre: string;
  margen: number;
  ventas: number;
};

export type CompetenciaProducto = {
  nombre: string;
  precioVenta: number;
  precioCompetencia: number;
};

export type AlertaTipo =
  | "stock_bajo"
  | "proximo_vencer"
  | "pedido_sin_procesar"
  | "consignacion"
  | "cxc_vencida"
  | "cxp_proxima";

export type Alerta = {
  tipo: AlertaTipo;
  mensaje: string;
  detalle?: string;
  urgente: boolean;
};

export type DashboardData = {
  kpis: KPIs;
  ventasDiarias: VentaDiaria[];
  topProductos: TopProducto[];
  ventasPorCategoria: VentaCategoria[];
  margenPorCategoria: MargenCategoria[];
  precioVsCompetencia: CompetenciaProducto[];
  alertas: Alerta[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcGanancia(sales: any[]): number {
  return sales.reduce((total, sale) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const costo = (sale.sale_items ?? []).reduce((c: number, item: any) => {
      return c + (item.product_presentations?.cost_price ?? 0) * item.quantity;
    }, 0);
    return total + sale.total - costo;
  }, 0);
}

export async function getDashboardData(isAdmin: boolean): Promise<DashboardData> {
  const supabase = await createClient();

  const ahora = new Date();
  const hoy = ahora.toISOString().split("T")[0];
  const inicioSemana = new Date(ahora);
  inicioSemana.setDate(ahora.getDate() - 6);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const hace30Dias = new Date(ahora);
  hace30Dias.setDate(ahora.getDate() - 29);
  const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const en30Dias = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Queries base (todos los roles)
  const baseQueries = Promise.all([
    supabase
      .from("sales")
      .select("total")
      .gte("created_at", `${hoy}T00:00:00`)
      .lte("created_at", `${hoy}T23:59:59`)
      .eq("status", "completada"),

    supabase
      .from("sales")
      .select("total")
      .gte("created_at", inicioSemana.toISOString())
      .eq("status", "completada"),

    supabase
      .from("sales")
      .select("total")
      .gte("created_at", inicioMes.toISOString())
      .eq("status", "completada"),

    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendiente"),

    supabase
      .from("product_presentations")
      .select("id, name, stock, min_stock, products(name)")
      .eq("is_active", true),

    supabase
      .from("sales")
      .select("created_at, total")
      .gte("created_at", hace30Dias.toISOString())
      .eq("status", "completada")
      .order("created_at"),

    supabase
      .from("sale_items")
      .select("quantity, subtotal, product_presentations(name, products(name))")
      .gte("created_at", inicioMes.toISOString()),

    supabase
      .from("sale_items")
      .select("subtotal, product_presentations(products(categories(name)))")
      .gte("created_at", inicioMes.toISOString()),

    supabase
      .from("product_presentations")
      .select("name, expiration_date, products(name)")
      .not("expiration_date", "is", null)
      .gte("expiration_date", hoy)
      .lte("expiration_date", en30Dias)
      .eq("is_active", true),

    supabase
      .from("orders")
      .select("id, created_at")
      .eq("status", "pendiente")
      .lte("created_at", hace24h),
  ]);

  // Queries solo admin (financiero)
  const adminQueries = isAdmin
    ? Promise.all([
        supabase
          .from("sales")
          .select("total, sale_items(quantity, product_presentations(cost_price))")
          .gte("created_at", inicioMes.toISOString())
          .eq("status", "completada"),

        supabase
          .from("accounts_receivable")
          .select("balance")
          .in("status", ["vencida", "pendiente"])
          .lt("due_date", hoy),

        supabase
          .from("accounts_payable")
          .select("balance")
          .in("status", ["pendiente", "parcial"])
          .lte("due_date", en7Dias)
          .gte("due_date", hoy),

        supabase
          .from("consignments")
          .select("id", { count: "exact", head: true })
          .eq("status", "activa"),

        supabase
          .from("sale_items")
          .select("subtotal, product_presentations(cost_price, products(categories(name)))")
          .gte("created_at", inicioMes.toISOString()),

        supabase
          .from("product_presentations")
          .select("name, sale_price, competitor_price, products(name)")
          .not("competitor_price", "is", null)
          .eq("is_active", true)
          .limit(10),

        supabase
          .from("consignments")
          .select("id, consignee_name, consigner_name, date_due, type")
          .eq("status", "activa")
          .not("date_due", "is", null)
          .lte("date_due", en7Dias)
          .gte("date_due", hoy),

        supabase
          .from("accounts_receivable")
          .select("customer_name, balance, due_date")
          .in("status", ["vencida", "pendiente"])
          .lt("due_date", hoy)
          .limit(5),

        supabase
          .from("accounts_payable")
          .select("creditor_name, balance, due_date")
          .in("status", ["pendiente", "parcial"])
          .lte("due_date", en7Dias)
          .gte("due_date", hoy)
          .limit(5),
      ])
    : Promise.resolve(null);

  const [base, admin] = await Promise.all([baseQueries, adminQueries]);

  const [
    ventasHoyRes,
    ventasSemanaRes,
    ventasMesRes,
    pedidosPendientesRes,
    presentacionesRes,
    ventasDiariasRes,
    topProductosRes,
    ventasCategoriaBaseRes,
    alertasVencimientoRes,
    alertasPedidosRes,
  ] = base;

  const [
    ventasMesCostoRes,
    cxcVencidasRes,
    cxpProximasRes,
    consignacionesActivasRes,
    ventasCategoriaCostoRes,
    compProductosRes,
    alertasConsignacionesRes,
    alertasCxcRes,
    alertasCxpRes,
  ] = admin ?? [null, null, null, null, null, null, null, null, null];

  // ---- KPIs ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ventasHoy = ((ventasHoyRes.data ?? []) as any[]).reduce((s: number, v: any) => s + (v.total ?? 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ventasSemana = ((ventasSemanaRes.data ?? []) as any[]).reduce((s: number, v: any) => s + (v.total ?? 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ventasMes = ((ventasMesRes.data ?? []) as any[]).reduce((s: number, v: any) => s + (v.total ?? 0), 0);
  const gananciaMes = isAdmin ? calcGanancia(ventasMesCostoRes?.data ?? []) : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cxcVencidasMonto = ((cxcVencidasRes?.data ?? []) as any[]).reduce((s: number, r: any) => s + (r.balance ?? 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cxpProximasMonto = ((cxpProximasRes?.data ?? []) as any[]).reduce((s: number, r: any) => s + (r.balance ?? 0), 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stockBajoItems = (presentacionesRes.data ?? []).filter((p: any) => p.stock <= p.min_stock);
  const stockBajoCount = stockBajoItems.length;

  // ---- Ventas diarias ----
  const ventasDiariasMap = new Map<string, { ventas: number; ganancia: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(hace30Dias);
    d.setDate(d.getDate() + i);
    ventasDiariasMap.set(d.toISOString().split("T")[0], { ventas: 0, ganancia: 0 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const sale of (ventasDiariasRes.data ?? []) as any[]) {
    const fecha = sale.created_at.split("T")[0];
    const entry = ventasDiariasMap.get(fecha) ?? { ventas: 0, ganancia: 0 };
    entry.ventas += sale.total;
    ventasDiariasMap.set(fecha, entry);
  }
  const ventasDiarias: VentaDiaria[] = Array.from(ventasDiariasMap.entries()).map(([fecha, v]) => ({
    fecha: fecha.slice(5),
    ventas: Math.round(v.ventas * 100) / 100,
    ganancia: Math.round(v.ganancia * 100) / 100,
  }));

  // ---- Top 10 productos ----
  const productoMap = new Map<string, { cantidad: number; ingresos: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of (topProductosRes.data ?? []) as any[]) {
    const prodNombre = item.product_presentations?.products?.name ?? "";
    const presNombre = item.product_presentations?.name ?? "";
    const nombre = prodNombre ? `${prodNombre} - ${presNombre}` : presNombre || "Desconocido";
    const entry = productoMap.get(nombre) ?? { cantidad: 0, ingresos: 0 };
    entry.cantidad += item.quantity;
    entry.ingresos += item.subtotal;
    productoMap.set(nombre, entry);
  }
  const topProductos: TopProducto[] = Array.from(productoMap.entries())
    .sort((a, b) => b[1].cantidad - a[1].cantidad)
    .slice(0, 10)
    .map(([nombre, v]) => ({
      nombre,
      cantidad: v.cantidad,
      ingresos: Math.round(v.ingresos * 100) / 100,
    }));

  // ---- Ventas por categoría (base, sin costos) ----
  const catVentasMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of (ventasCategoriaBaseRes.data ?? []) as any[]) {
    const cat = item.product_presentations?.products?.categories?.name ?? "Sin categoría";
    catVentasMap.set(cat, (catVentasMap.get(cat) ?? 0) + item.subtotal);
  }
  const ventasPorCategoria: VentaCategoria[] = Array.from(catVentasMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, ventas]) => ({ nombre, ventas: Math.round(ventas * 100) / 100 }));

  // ---- Margen por categoría (solo admin, con costos) ----
  const margenPorCategoria: MargenCategoria[] = [];
  if (isAdmin && ventasCategoriaCostoRes?.data) {
    const catCostoMap = new Map<string, { ventas: number; costos: number }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of ventasCategoriaCostoRes.data as any[]) {
      const cat = item.product_presentations?.products?.categories?.name ?? "Sin categoría";
      const entry = catCostoMap.get(cat) ?? { ventas: 0, costos: 0 };
      entry.ventas += item.subtotal;
      entry.costos += item.product_presentations?.cost_price ?? 0;
      catCostoMap.set(cat, entry);
    }
    for (const [nombre, v] of catCostoMap.entries()) {
      if (v.ventas > 0) {
        margenPorCategoria.push({
          nombre,
          margen: Math.round(((v.ventas - v.costos) / v.ventas) * 10000) / 100,
          ventas: Math.round(v.ventas * 100) / 100,
        });
      }
    }
    margenPorCategoria.sort((a, b) => b.margen - a.margen);
  }

  // ---- Precio vs competencia (solo admin) ----
  const precioVsCompetencia: CompetenciaProducto[] = isAdmin
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((compProductosRes?.data ?? []) as any[]).map((p) => ({
        nombre: p.products?.name ? `${p.products.name} - ${p.name}` : p.name,
        precioVenta: p.sale_price,
        precioCompetencia: p.competitor_price,
      }))
    : [];

  // ---- Alertas ----
  const alertas: Alerta[] = [];

  // Stock bajo (todos los roles)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of stockBajoItems as any[]) {
    alertas.push({
      tipo: "stock_bajo",
      mensaje: `${p.products?.name ?? ""} - ${p.name}: stock bajo`,
      detalle: `Stock: ${p.stock} / Mínimo: ${p.min_stock}`,
      urgente: p.stock === 0,
    });
  }

  // Próximos a vencer (todos los roles)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (alertasVencimientoRes.data ?? []) as any[]) {
    const dias = Math.ceil(
      (new Date(p.expiration_date).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
    );
    alertas.push({
      tipo: "proximo_vencer",
      mensaje: `${p.products?.name ?? ""} - ${p.name} vence en ${dias} día(s)`,
      detalle: `Fecha: ${p.expiration_date}`,
      urgente: dias <= 7,
    });
  }

  // Pedidos > 24h (todos los roles)
  if ((alertasPedidosRes.data ?? []).length > 0) {
    alertas.push({
      tipo: "pedido_sin_procesar",
      mensaje: `${alertasPedidosRes.data!.length} pedido(s) pendientes sin procesar por más de 24 horas`,
      urgente: true,
    });
  }

  // Solo admin: consignaciones, CxC, CxP
  if (isAdmin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of (alertasConsignacionesRes?.data ?? []) as any[]) {
      const nombre = c.type === "dada" ? c.consignee_name : c.consigner_name;
      alertas.push({
        tipo: "consignacion",
        mensaje: `Consignación con ${nombre ?? "—"} vence el ${c.date_due}`,
        urgente: false,
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const cxc of (alertasCxcRes?.data ?? []) as any[]) {
      alertas.push({
        tipo: "cxc_vencida",
        mensaje: `CxC vencida: ${cxc.customer_name ?? "Cliente"} — Q ${cxc.balance.toFixed(2)}`,
        detalle: `Desde ${cxc.due_date}`,
        urgente: true,
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const cxp of (alertasCxpRes?.data ?? []) as any[]) {
      alertas.push({
        tipo: "cxp_proxima",
        mensaje: `CxP: ${cxp.creditor_name} — Q ${cxp.balance.toFixed(2)}`,
        detalle: `Vence ${cxp.due_date}`,
        urgente: false,
      });
    }
  }

  alertas.sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0));

  return {
    kpis: {
      ventasHoy: Math.round(ventasHoy * 100) / 100,
      ventasSemana: Math.round(ventasSemana * 100) / 100,
      ventasMes: Math.round(ventasMes * 100) / 100,
      gananciaMes: Math.round(gananciaMes * 100) / 100,
      pedidosPendientes: pedidosPendientesRes.count ?? 0,
      stockBajoCount,
      cxcVencidasMonto: Math.round(cxcVencidasMonto * 100) / 100,
      cxpProximasMonto: Math.round(cxpProximasMonto * 100) / 100,
      consignacionesActivas: consignacionesActivasRes?.count ?? 0,
    },
    ventasDiarias,
    topProductos,
    ventasPorCategoria,
    margenPorCategoria,
    precioVsCompetencia,
    alertas,
  };
}
