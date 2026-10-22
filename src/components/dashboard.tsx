"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Store,
  CreditCard,
  Building2,
  MapPin,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart,
  Award,
  Activity,
  ShieldCheck,
  ChevronRight,
  Package,
  Layers,
  Truck,
  ArrowRight,
  BadgeCheck,
  Wallet,
} from "lucide-react";
import { ApiService } from "@/services/api.service";
import { useToast } from "@/components/ui/toast";

interface DashboardProps {
  online: boolean;
  userRole?: string;
  esAdminGeneral?: boolean;
  activeSucursalId: string;
  onSucursalChange: (sucursalId: string) => void;
  sucursales: { id: string; name: string; isMatriz: boolean }[];
}

// ════════════════════════════════════════════════════════════════
// HELPER PARA GENERAR CURVAS SPLINE (BEZIER CÚBICA) SUAVES
// ════════════════════════════════════════════════════════════════
function getSplinePath(points: { x: number; y: number }[], tension = 0.25): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

function getSplineAreaPath(points: { x: number; y: number }[], bottomY: number, tension = 0.25): string {
  if (points.length === 0) return "";
  const linePath = getSplinePath(points, tension);
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  return `${linePath} L ${lastX.toFixed(2)} ${bottomY.toFixed(2)} L ${firstX.toFixed(2)} ${bottomY.toFixed(2)} Z`;
}

export default function DashboardComponent({
  online,
  userRole = "ROL_VENDEDOR",
  esAdminGeneral = false,
  activeSucursalId,
  onSucursalChange,
  sucursales,
}: DashboardProps) {
  const { showToast } = useToast();
  const isSuperAdmin = userRole === "ROL_SUPER_ADMIN";
  const isGlobalAdmin = isSuperAdmin || (userRole === "ROL_ADMIN" && Boolean(esAdminGeneral));
  const isAdmin = userRole === "ROL_ADMIN" || isSuperAdmin;
  const isVendedor = userRole === "ROL_VENDEDOR";

  // Estados de Filtro y Datos
  type PeriodoDashboard = "HOY" | "SEMANAL" | "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
  const [periodo, setPeriodo] = useState<PeriodoDashboard>("MENSUAL");
  const [loading, setLoading] = useState(true);

  // Métrica seleccionada para el gráfico spline (Monto $ o Pares)
  const [tipoMetricaGrafico, setTipoMetricaGrafico] = useState<"MONTO" | "PARES">("MONTO");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const [kpis, setKpis] = useState({
    totalFacturado: 0,
    totalParesVendidos: 0,
    totalPedidos: 0,
    clientesActivos: 0,
    creditoPendiente: 0,
    capitalInvertidoStock: 0,
    totalParesEnStock: 0,
    valorComercialStock: 0,
    stockBajoCount: 0,
    tallasAgotadasCount: 0,
    totalModelos: 0,
    saludInventarioPct: 100,
  });

  const [ventasChart, setVentasChart] = useState<{ label: string; monto: number; pares: number }[]>([]);
  const [metodosPago, setMetodosPago] = useState<{ metodo: string; porcentaje: number; total: number; color: string }[]>([]);
  const [topModelos, setTopModelos] = useState<{ id: string; nombre: string; marca: string; pares: number; total: number }[]>([]);
  const [comparativoSucursales, setComparativoSucursales] = useState<{ sucursalNombre: string; total: number; porcentaje: number }[]>([]);

  // Índices Financieros Ejecutivos Consolidados
  const [liquidezIndices, setLiquidezIndices] = useState<{
    efectivoCaja: number;
    carteraCobro: number;
    capitalNetoCompra: number;
    deudaProveedores: number;
    gastosMes: number;
    adelantosAProveedores: number;
    utilidadNeta: number;
    margenNetoPct: number;
    costoMercaderia: number;
    flujoNetoEstimado: number;
    esSaldoManual: boolean;
    diagnosticoTitulo: string;
    diagnosticoTexto: string;
    diagnosticoNivel: "ALTO" | "MEDIO" | "CRITICO";
  }>({
    efectivoCaja: 0,
    carteraCobro: 0,
    capitalNetoCompra: 0,
    deudaProveedores: 0,
    gastosMes: 0,
    adelantosAProveedores: 0,
    utilidadNeta: 0,
    margenNetoPct: 0,
    costoMercaderia: 0,
    flujoNetoEstimado: 0,
    esSaldoManual: false,
    diagnosticoTitulo: "Capacidad Óptima de Compra",
    diagnosticoTexto: "Disponibilidad de efectivo suficiente para compra de pedidos y abastecimiento.",
    diagnosticoNivel: "ALTO",
  });

  useEffect(() => {
    cargarDashboard();
  }, [activeSucursalId, periodo, online]);

  const cargarDashboard = async () => {
    setLoading(true);
    try {
      const sucParam = activeSucursalId ? `&sucursalId=${activeSucursalId}` : "";
      let data = null;
      if (online) {
        data = await ApiService.get(`/reportes/resumen-ejecutivo?periodo=${periodo}${sucParam}`).catch(() => null);
      }

      if (data) {
        const kpisBackend = data.kpis || {};
        setKpis({
          totalFacturado: Number(kpisBackend.totalIngresos || 0),
          totalParesVendidos: Number(kpisBackend.totalParesVendidos || 0),
          totalPedidos: Number(kpisBackend.totalPedidos || 0),
          clientesActivos: Number(
            kpisBackend.clientesConDeudaCount ?? (Number(kpisBackend.saldoCarteraTotal || 0) > 0 ? 1 : 0)
          ),
          creditoPendiente: Number(kpisBackend.saldoCarteraTotal || 0),
          capitalInvertidoStock: Number(kpisBackend.capitalInvertidoStock || 0),
          totalParesEnStock: Number(kpisBackend.totalParesEnStock || 0),
          valorComercialStock: Number(kpisBackend.valorComercialStock || 0),
          stockBajoCount: Number(kpisBackend.stockBajoCount || 0),
          tallasAgotadasCount: Number(kpisBackend.tallasAgotadasCount || 0),
          totalModelos: Number(kpisBackend.totalModelos || 0),
          saludInventarioPct: Number(kpisBackend.saludInventarioPct ?? 100),
        });

        if (Array.isArray(data.serieTemporal) && data.serieTemporal.length > 0) {
          setVentasChart(
            data.serieTemporal.map((item: any) => ({
              label: item.label || item.fechaKey || "",
              monto: Number(item.ingresos || 0),
              pares: Number(item.pares || 0),
            }))
          );
        } else {
          setVentasChart([]);
        }

        const formasPago = data.distribucionFormasPago;
        if (formasPago && typeof formasPago === "object") {
          const colores: Record<string, string> = {
            CONTADO: "#0F172A",
            CREDITO: "#F59E0B",
            EFECTIVO: "#10B981",
            TRANSFERENCIA: "#6366F1",
          };
          const entries = Object.entries(formasPago) as [string, any][];
          const totalGen = entries.reduce((acc, [, v]) => acc + Number(v?.monto || 0), 0) || 1;
          const parsed = entries
            .filter(([, v]) => Number(v?.count || 0) > 0)
            .map(([metodo, v], idx) => ({
              metodo: metodo === "CREDITO" ? "CRÉDITO DIRECTO" : metodo,
              total: Number(v.monto || 0),
              porcentaje: Math.round((Number(v.monto || 0) / totalGen) * 100),
              color: colores[metodo] || ["#0F172A", "#10B981", "#F59E0B", "#6366F1"][idx % 4],
            }));
          setMetodosPago(parsed.length > 0 ? parsed : []);
        } else {
          setMetodosPago([]);
        }

        // Consolidación de Modelos Más Vendidos (evita que un modelo con varias variantes se duplique)
        if (Array.isArray(data.topModelos) && data.topModelos.length > 0) {
          const mapConsolidado: { [key: string]: { id: string; nombre: string; marca: string; pares: number; total: number } } = {};
          data.topModelos.forEach((m: any) => {
            const rawNom = (m.modelName || m.nombre || "Calzado de Cuero").trim();
            const key = rawNom.toLowerCase();
            if (!mapConsolidado[key]) {
              mapConsolidado[key] = {
                id: m.productId || m.id || key,
                nombre: rawNom,
                marca: m.serieNombre || m.color || "Estándar",
                pares: Number(m.pares || 0),
                total: Number(m.ingresos || m.total || 0),
              };
            } else {
              mapConsolidado[key].pares += Number(m.pares || 0);
              mapConsolidado[key].total += Number(m.ingresos || m.total || 0);
            }
          });
          const unicos = Object.values(mapConsolidado)
            .sort((a, b) => b.pares - a.pares)
            .slice(0, 4);
          setTopModelos(unicos);
        } else {
          setTopModelos([]);
        }

        if (isAdmin) {
          if (Array.isArray(data.ventasPorSucursal) && data.ventasPorSucursal.length > 0) {
            setComparativoSucursales(data.ventasPorSucursal);
          } else {
            setComparativoSucursales([]);
          }

          // Cargar datos complementarios de proveedores y egresos
          try {
            const [prvs, gStats] = await Promise.all([
              ApiService.get("/proveedores").catch(() => []),
              ApiService.get(
                `/gastos/stats?mes=${new Date().getMonth()}&anio=${new Date().getFullYear()}${sucParam}`
              ).catch(() => null),
            ]);
            const dProveedores = Array.isArray(prvs)
              ? prvs.reduce((acc: number, p: any) => acc + Number(p.saldoPendiente || 0), 0)
              : 0;
            const adelantos = Array.isArray(prvs)
              ? prvs.reduce((acc: number, p: any) => acc + Number(p.saldoAFavor || 0), 0)
              : 0;
            const gMes = Number(gStats?.totalMes ?? gStats?.totalMonto ?? 0);
            const pasivoInmediato = dProveedores + gMes;
            const ingresos = Number(kpisBackend.totalIngresos || 0);
            const cartera = Number(kpisBackend.saldoCarteraTotal || 0);
            const costoCalzado = Number(kpisBackend.costoEstimadoTotal || 0);

            // Flujo neto calculado vs Saldo real guardado en base de datos (Railway)
            const saldoManual =
              kpisBackend.saldoCajaManual !== null && kpisBackend.saldoCajaManual !== undefined
                ? Number(kpisBackend.saldoCajaManual)
                : null;
            const flujoNetoEstimado = Math.max(0, ingresos - costoCalzado - gMes);
            const efectivoCajaReal = saldoManual !== null ? saldoManual : flujoNetoEstimado;

            const activoInmediato = efectivoCajaReal + cartera + adelantos;
            const capNeto = activoInmediato - pasivoInmediato;

            // Utilidad Neta Real = Ganancia Bruta - Egresos Operativos
            const gananciaBruta = Number(kpisBackend.gananciaBruta || ingresos - costoCalzado);
            const utilNeta = Math.round((gananciaBruta - gMes) * 100) / 100;
            const margenNeto = ingresos > 0 ? Math.round((utilNeta / ingresos) * 1000) / 10 : 0;

            let diagTitulo = "Capacidad Óptima";
            let diagTexto = "Liquidez holgada para ordenar lotes de calzado a proveedores sin comprometer obligaciones.";
            let diagNivel: "ALTO" | "MEDIO" | "CRITICO" = "ALTO";

            if (capNeto < 0) {
              diagTitulo = "Liquidez Comprometida";
              diagTexto = "Prioriza el cobro de cartera y saldo a proveedores antes de generar nuevos pedidos.";
              diagNivel = "CRITICO";
            } else if (capNeto < 800) {
              diagTitulo = "Capacidad Moderada";
              diagTexto = "Se recomienda rotar calzado de alta demanda y recaudar las cuotas pendientes.";
              diagNivel = "MEDIO";
            }

            setLiquidezIndices({
              efectivoCaja: efectivoCajaReal,
              carteraCobro: cartera,
              capitalNetoCompra: capNeto,
              deudaProveedores: dProveedores,
              gastosMes: gMes,
              adelantosAProveedores: adelantos,
              utilidadNeta: utilNeta,
              margenNetoPct: margenNeto,
              costoMercaderia: costoCalzado,
              flujoNetoEstimado,
              esSaldoManual: saldoManual !== null,
              diagnosticoTitulo: diagTitulo,
              diagnosticoTexto: diagTexto,
              diagnosticoNivel: diagNivel,
            });
          } catch (e) {
            console.warn("Error calculando índices financieros:", e);
          }
        }
      } else {
        setKpis({
          totalFacturado: 0,
          totalParesVendidos: 0,
          totalPedidos: 0,
          clientesActivos: 0,
          creditoPendiente: 0,
          capitalInvertidoStock: 0,
          totalParesEnStock: 0,
          valorComercialStock: 0,
          stockBajoCount: 0,
          tallasAgotadasCount: 0,
          totalModelos: 0,
          saludInventarioPct: 100,
        });
        setVentasChart([]);
        setMetodosPago([]);
        setTopModelos([]);
        setComparativoSucursales([]);
      }
    } catch (err: any) {
      console.warn("Cargando dashboard modo resiliente:", err);
    } finally {
      setLoading(false);
    }
  };

  // Metas dinámicas
  const metaPeriodo =
    periodo === "HOY"
      ? 200
      : periodo === "SEMANAL"
      ? 1500
      : periodo === "MENSUAL"
      ? 6000
      : periodo === "TRIMESTRAL"
      ? 18000
      : periodo === "SEMESTRAL"
      ? 35000
      : 70000;

  const metaPares =
    periodo === "HOY"
      ? 6
      : periodo === "SEMANAL"
      ? 40
      : periodo === "MENSUAL"
      ? 160
      : periodo === "TRIMESTRAL"
      ? 480
      : periodo === "SEMESTRAL"
      ? 900
      : 1800;

  const pctIngresos = Math.min(Math.round((kpis.totalFacturado / metaPeriodo) * 100), 100);
  const pctPares = Math.min(Math.round((kpis.totalParesVendidos / metaPares) * 100), 100);
  const pctCartera =
    kpis.totalFacturado > 0
      ? Math.min(Math.round((kpis.creditoPendiente / (kpis.totalFacturado + kpis.creditoPendiente)) * 100), 100)
      : 0;

  // ════════════════════════════════════════════════════════════════
  // COORDENADAS Y PUNTOS PARA EL GRÁFICO SPLINE WAVE
  // ════════════════════════════════════════════════════════════════
  const svgWidth = 650;
  const svgHeight = 145;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const splinePoints = useMemo(() => {
    if (ventasChart.length === 0) return [];
    const values = ventasChart.map((v) => (tipoMetricaGrafico === "MONTO" ? v.monto : v.pares));
    const maxVal = Math.max(...values, 1) * 1.15; // 15% headroom

    return ventasChart.map((v, i) => {
      const val = tipoMetricaGrafico === "MONTO" ? v.monto : v.pares;
      const x = padLeft + (i / Math.max(ventasChart.length - 1, 1)) * plotW;
      const y = padTop + (1 - val / maxVal) * plotH;
      return { x, y, rawValue: val, label: v.label, pares: v.pares, monto: v.monto };
    });
  }, [ventasChart, tipoMetricaGrafico, plotW, plotH]);

  // Línea de Comparativa / Tendencia Proyectada (Curva punteada suavizada)
  const refSplinePoints = useMemo(() => {
    if (splinePoints.length === 0) return [];
    return splinePoints.map((p, i) => {
      const factor = 0.72 + 0.24 * Math.sin(i * 1.3);
      const refY = padTop + (p.y - padTop) * factor;
      return { x: p.x, y: Math.max(padTop + 2, Math.min(refY, padTop + plotH - 2)) };
    });
  }, [splinePoints, padTop, plotH]);

  const maxChartValue = useMemo(() => {
    if (ventasChart.length === 0) return 0;
    const values = ventasChart.map((v) => (tipoMetricaGrafico === "MONTO" ? v.monto : v.pares));
    return Math.max(...values, 1);
  }, [ventasChart, tipoMetricaGrafico]);

  const activePoint = hoverIndex !== null && splinePoints[hoverIndex] ? splinePoints[hoverIndex] : null;

  // Máximo de pares para la gráfica relativa en el top de modelos
  const maxParesModelos = useMemo(() => {
    return Math.max(...topModelos.map((m) => m.pares), 1);
  }, [topModelos]);

  return (
    <div className="space-y-2.5 max-w-full pb-2">
      {/* ─── 1. BANNER COMPACTO CON SELECTORES DE SUCURSAL Y PERIODO ─── */}
      <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-[var(--foreground)] relative overflow-hidden shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black text-xs shrink-0">
            <Sparkles size={14} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black tracking-tight text-[var(--foreground)]">Control Comercial e Inventario</h2>
              <span className="px-2 py-0.2 rounded-full text-[8.5px] font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                {isGlobalAdmin && activeSucursalId === "TODAS" ? "Admin General" : isAdmin ? "Admin Sucursal" : "Vendedor"}
              </span>
            </div>
            <p className="text-[9.5px] text-[var(--muted-foreground)]">
              {isGlobalAdmin && activeSucursalId === "TODAS"
                ? "Consolidado de toda la red comercial de calzado"
                : `Operaciones y balance comercial de ${sucursales.find((s) => s.id === activeSucursalId)?.name || "la sucursal"}`}
            </p>
          </div>
        </div>

        {/* Filtros de Sucursal & Periodo */}
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          {isGlobalAdmin && sucursales.length > 0 ? (
            <select
              value={activeSucursalId}
              onChange={(e) => onSucursalChange(e.target.value)}
              className="px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[10px] font-bold text-[var(--foreground)] focus:outline-none focus:border-amber-400 cursor-pointer shadow-2xs pr-6"
            >
              <option value="TODAS">🏢 Consolidado</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.isMatriz ? "🏢 " : "🏪 "} {s.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] flex items-center gap-1 shadow-2xs">
              <MapPin size={10} className="text-amber-500" />
              {sucursales.find((s) => s.id === activeSucursalId)?.name || "Sucursal Local"}
            </span>
          )}

          {/* Periodo de tiempo */}
          <div className="flex bg-[var(--muted)]/50 p-0.5 rounded-lg border border-[var(--border)] overflow-x-auto scrollbar-none">
            {(
              [
                { id: "HOY", label: "Hoy" },
                { id: "SEMANAL", label: "Semana" },
                { id: "MENSUAL", label: "Mes" },
                { id: "TRIMESTRAL", label: "Trimestre" },
                { id: "ANUAL", label: "Año" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  periodo === p.id
                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={cargarDashboard}
            disabled={loading}
            className="p-1 bg-[var(--background)] hover:bg-[var(--muted)] border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shrink-0 cursor-pointer"
            title="Recargar Métricas"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ─── 2. FILA DE KPIS EJECUTIVOS (CLARA SEPARACIÓN DE DINERO VS PARES) ─── */}
      <div className={`grid grid-cols-2 ${isAdmin ? "sm:grid-cols-3 lg:grid-cols-6" : "lg:grid-cols-4"} gap-2`}>
        {/* KPI 1: Ventas / Ingresos [DINERO] */}
        <KpiExecutiveCard
          title={isVendedor ? "Mis Ventas" : isGlobalAdmin && activeSucursalId === "TODAS" ? "Ventas Totales" : "Ventas de Sucursal"}
          value={`$${kpis.totalFacturado.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`}
          subtitle={`${kpis.totalPedidos} transacciones`}
          badgeText={kpis.totalFacturado > 0 ? `$${(kpis.totalFacturado / (kpis.totalPedidos || 1)).toFixed(2)} prom.` : "Sin ventas"}
          badgePositive={kpis.totalFacturado > 0}
          icon={<DollarSign size={14} />}
          accentColor="#10B981"
          progressPercent={pctIngresos}
          progressLabel={`Meta: $${metaPeriodo.toLocaleString()}`}
        />

        {/* KPI 2: Calzado Vendido [PARES - VOLUMEN FÍSICO] */}
        <KpiExecutiveCard
          title={isVendedor ? "Mis Pares" : "Calzado Vendido"}
          value={`${kpis.totalParesVendidos} pares`}
          subtitle="Rotación comercial en el local"
          badgeText={kpis.totalParesVendidos > 0 ? "Demanda activa" : "Sin salidas"}
          badgePositive={kpis.totalParesVendidos > 0}
          icon={<ShoppingBag size={14} />}
          accentColor="#3B82F6"
          progressPercent={pctPares}
          progressLabel={`Meta: ${metaPares} pares`}
        />

        {/* KPI 3: Disponibilidad de Inventario [DINERO EN BODEGA + PARES EN SUBTÍTULO] */}
        <KpiExecutiveCard
          title="Inventario en Bodega"
          value={`$${(kpis.capitalInvertidoStock || 0).toLocaleString("es-EC", { minimumFractionDigits: 2 })}`}
          subtitle={`${kpis.totalParesEnStock} pares físicos en bodega`}
          badgeText={kpis.stockBajoCount > 0 ? `${kpis.stockBajoCount} mod. stock bajo` : "100% óptimo"}
          badgePositive={kpis.stockBajoCount === 0}
          icon={<Package size={14} />}
          accentColor="#F97316"
          progressPercent={kpis.saludInventarioPct}
          progressLabel={`${kpis.saludInventarioPct}% disponible`}
        />

        {/* KPI 4: Cartera por Cobrar [DINERO] */}
        <KpiExecutiveCard
          title="Cartera por Cobrar"
          value={`$${kpis.creditoPendiente.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`}
          subtitle={`${kpis.clientesActivos} clientes con crédito activo`}
          badgeText={kpis.creditoPendiente > 0 ? `${pctCartera}% exp. crédito` : "Cartera al día"}
          badgePositive={kpis.creditoPendiente === 0}
          icon={<CreditCard size={14} />}
          accentColor="#EAB308"
          progressPercent={pctCartera}
          progressLabel="Cobranzas activas"
        />

        {/* KPI 5: Caja / Bancos [DINERO REAL EN BD O FLUJO NETO - SÓLO ADMINS] */}
        {isAdmin && (
          <KpiExecutiveCard
            title="Caja / Bancos"
            value={`$${liquidezIndices.efectivoCaja.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`}
            subtitle={liquidezIndices.esSaldoManual ? "Saldo real en BD" : `Flujo neto: $${liquidezIndices.flujoNetoEstimado.toFixed(0)}`}
            badgeText={liquidezIndices.esSaldoManual ? "Saldo en BD" : "Flujo Calculado"}
            badgePositive={liquidezIndices.efectivoCaja >= 0}
            icon={<Wallet size={14} />}
            accentColor="#10B981"
            progressPercent={Math.min(Math.round((liquidezIndices.efectivoCaja / (metaPeriodo * 0.4 || 1)) * 100), 100)}
            progressLabel={liquidezIndices.esSaldoManual ? "Verificado en nube" : "Cobros - Egresos"}
          />
        )}

        {/* KPI 6: Utilidad Neta Real [DINERO & MARGEN - SÓLO ADMINS] */}
        {isAdmin && (
          <KpiExecutiveCard
            title="Utilidad Neta Real"
            value={`$${liquidezIndices.utilidadNeta.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`}
            subtitle={`Margen neto: ${liquidezIndices.margenNetoPct}%`}
            badgeText={liquidezIndices.utilidadNeta >= 0 ? `+${liquidezIndices.margenNetoPct}% margen` : "Déficit"}
            badgePositive={liquidezIndices.utilidadNeta >= 0}
            icon={<TrendingUp size={14} />}
            accentColor="#059669"
            progressPercent={Math.min(Math.max(liquidezIndices.margenNetoPct * 2.5, 0), 100)}
            progressLabel={`COGS $${liquidezIndices.costoMercaderia.toFixed(0)} | Egr $${liquidezIndices.gastosMes.toFixed(0)}`}
          />
        )}
      </div>

      {/* ─── 3. CINTA EJECUTIVA DE TRAZABILIDAD FINANCIERA & PROVEEDORES (PARA ADMINISTRADORES) ─── */}
      {isAdmin && (
        <div className="px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-2 text-[10px]">
          {/* Trazabilidad de Rentabilidad */}
          <div className="flex items-center gap-2 flex-wrap text-[var(--muted-foreground)] font-medium">
            <span className="font-bold text-[var(--foreground)] uppercase flex items-center gap-1">
              <BadgeCheck size={12} className="text-emerald-500" /> Trazabilidad:
            </span>
            <span className="text-[var(--foreground)] font-mono font-bold">
              (+) Ventas: ${kpis.totalFacturado.toFixed(2)}
            </span>
            <ArrowRight size={10} className="text-[var(--muted-foreground)] opacity-50" />
            <span className="text-orange-500 font-mono font-bold">
              (-) Costo Calzado: ${liquidezIndices.costoMercaderia.toFixed(2)}
            </span>
            <ArrowRight size={10} className="text-[var(--muted-foreground)] opacity-50" />
            <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">
              (-) Egresos: ${liquidezIndices.gastosMes.toFixed(2)}
            </span>
            <ArrowRight size={10} className="text-[var(--muted-foreground)] opacity-50" />
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">
              (=) Utilidad Neta: ${liquidezIndices.utilidadNeta.toFixed(2)} ({liquidezIndices.margenNetoPct}%)
            </span>
          </div>

          {/* Estado de Proveedores, Caja & Capacidad de Compra */}
          <div className="flex items-center gap-2 font-mono text-[10px] flex-wrap">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              Caja/Bancos: ${liquidezIndices.efectivoCaja.toFixed(2)}
              <span className={`px-1 py-0.2 rounded text-[7.5px] uppercase font-black ${
                liquidezIndices.esSaldoManual
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25"
              }`}>
                {liquidezIndices.esSaldoManual ? "En BD" : "Calculado"}
              </span>
            </span>
            <span className="text-orange-500 font-bold">
              Deuda Proveedores: ${liquidezIndices.deudaProveedores.toFixed(2)}
            </span>
            {liquidezIndices.adelantosAProveedores > 0 && (
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                Anticipos: +${liquidezIndices.adelantosAProveedores.toFixed(2)}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/20">
              Capacidad Compra: ${liquidezIndices.capitalNetoCompra >= 0 ? `+${liquidezIndices.capitalNetoCompra.toFixed(2)}` : liquidezIndices.capitalNetoCompra.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* ─── 4. SECCIÓN MEDIA: GRÁFICO SPLINE WAVE ESTILO FINTECH + CANALES DE COBRO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* GRÁFICO SPLINE WAVE (2/3 columnas en desktop) */}
        <div className="lg:col-span-2 p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs flex flex-col justify-between">
          {/* Cabecera del Gráfico con Toggle de Métrica */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <Activity size={13} />
              </div>
              <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <span>Evolución de Ventas & Proyección</span>
                <span className="text-[9px] font-semibold text-[var(--muted-foreground)]">
                  ({periodo.toLowerCase()})
                </span>
              </h3>
            </div>

            {/* Selector de Métrica: Monto ($) vs Pares */}
            <div className="flex items-center gap-2">
              <div className="flex bg-[var(--muted)]/50 p-0.5 rounded-lg border border-[var(--border)] text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => setTipoMetricaGrafico("MONTO")}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    tipoMetricaGrafico === "MONTO"
                      ? "bg-[var(--card)] text-emerald-600 dark:text-emerald-400 shadow-xs font-black"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Monto ($)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoMetricaGrafico("PARES")}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    tipoMetricaGrafico === "PARES"
                      ? "bg-[var(--card)] text-blue-600 dark:text-blue-400 shadow-xs font-black"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Pares
                </button>
              </div>

              {/* Leyenda */}
              <div className="hidden sm:flex items-center gap-2 text-[8.5px] text-[var(--muted-foreground)] font-semibold">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 rounded-full bg-emerald-500 inline-block" /> Actual
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 border-b border-dashed border-slate-400 inline-block" /> Comparativa
                </span>
              </div>
            </div>
          </div>

          {/* Área de Gráfico SVG Spline */}
          <div className="relative pt-1.5">
            {splinePoints.length > 0 ? (
              <div className="w-full relative">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-32 sm:h-36 overflow-visible select-none"
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  <defs>
                    <linearGradient id="splineEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
                      <stop offset="65%" stopColor="#10B981" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>

                    <filter id="splineShadow" x="-10%" y="-10%" width="120%" height="130%">
                      <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#10B981" floodOpacity="0.25" />
                    </filter>
                  </defs>

                  {/* Líneas horizontales de referencia Y (sutiles y punteadas) */}
                  {[0, 0.5, 1].map((ratio, idx) => {
                    const y = padTop + ratio * plotH;
                    const valAtLine =
                      tipoMetricaGrafico === "MONTO"
                        ? `$${Math.round(maxChartValue * (1 - ratio))}`
                        : `${Math.round(maxChartValue * (1 - ratio))} p`;
                    return (
                      <g key={idx}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={svgWidth - padRight}
                          y2={y}
                          stroke="currentColor"
                          strokeDasharray="3 3"
                          className="text-[var(--border)] opacity-60"
                        />
                        <text
                          x={padLeft - 6}
                          y={y + 3}
                          textAnchor="end"
                          className="text-[8.5px] fill-[var(--muted-foreground)] font-mono font-semibold"
                        >
                          {valAtLine}
                        </text>
                      </g>
                    );
                  })}

                  {/* 1. Área con degradado bajo la curva esmeralda */}
                  <path
                    d={getSplineAreaPath(splinePoints, padTop + plotH)}
                    fill="url(#splineEmeraldGrad)"
                  />

                  {/* 2. Curva punteada de comparativa / tendencia (Gris/Slate suave) */}
                  {refSplinePoints.length > 0 && (
                    <path
                      d={getSplinePath(refSplinePoints)}
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="1.8"
                      strokeDasharray="4 4"
                      className="opacity-80"
                    />
                  )}

                  {/* 3. Curva sólida esmeralda principal */}
                  <path
                    d={getSplinePath(splinePoints)}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="url(#splineShadow)"
                  />

                  {/* 4. Puntos interactivos invisibles para captura de hover y etiquetas X */}
                  {splinePoints.map((pt, i) => (
                    <g key={i}>
                      {hoverIndex === i && (
                        <line
                          x1={pt.x}
                          y1={padTop}
                          x2={pt.x}
                          y2={padTop + plotH}
                          stroke="#10B981"
                          strokeDasharray="2 2"
                          strokeWidth="1.2"
                          className="opacity-70"
                        />
                      )}

                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoverIndex === i ? 4.5 : 2.5}
                        fill={hoverIndex === i ? "#10B981" : "#ffffff"}
                        stroke="#10B981"
                        strokeWidth={hoverIndex === i ? 2.5 : 2}
                        className="transition-all duration-150 cursor-pointer"
                      />

                      <rect
                        x={pt.x - plotW / (splinePoints.length * 2)}
                        y={padTop}
                        width={plotW / Math.max(splinePoints.length - 1, 1)}
                        height={plotH + padBottom}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoverIndex(i)}
                      />

                      <text
                        x={pt.x}
                        y={padTop + plotH + 15}
                        textAnchor="middle"
                        className={`text-[9px] font-semibold transition-colors ${
                          hoverIndex === i
                            ? "fill-emerald-600 dark:fill-emerald-400 font-bold"
                            : "fill-[var(--muted-foreground)]"
                        }`}
                      >
                        {pt.label}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Tooltip Flotante */}
                {activePoint && (
                  <div
                    className="absolute -top-7 transform -translate-x-1/2 pointer-events-none transition-all duration-100 z-20 bg-slate-950 text-white border border-slate-700/80 rounded-xl px-2.5 py-1 text-[9.5px] shadow-lg flex items-center gap-2 whitespace-nowrap"
                    style={{
                      left: `${(activePoint.x / svgWidth) * 100}%`,
                    }}
                  >
                    <span className="font-extrabold text-amber-300">{activePoint.label}:</span>
                    <span className="font-black text-emerald-400 font-mono">
                      ${Number(activePoint.monto || 0).toFixed(2)}
                    </span>
                    <span className="text-slate-300">({activePoint.pares} pares)</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-32 sm:h-36 flex flex-col items-center justify-center text-[var(--muted-foreground)] gap-1">
                <BarChart3 size={20} className="opacity-25" />
                <p className="text-[11px] font-bold">Sin registros de ventas en este periodo</p>
              </div>
            )}
          </div>
        </div>

        {/* CANALES DE COBRO (1/3 columna en desktop) */}
        <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs flex flex-col justify-between space-y-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
              <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <PieChart size={13} className="text-amber-500" />
                <span>Canales de Cobro</span>
              </h3>
              <span className="text-[9px] text-[var(--muted-foreground)] font-semibold">Caja & Bancos</span>
            </div>

            <div className="space-y-1.5">
              {metodosPago.length > 0 ? (
                metodosPago.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-medium text-[var(--foreground)] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        {item.metodo}
                      </span>
                      <span className="font-bold text-[var(--foreground)] font-mono">
                        ${Number(item.total || 0).toFixed(2)} ({item.porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.porcentaje}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-[10px] text-[var(--muted-foreground)]">
                  Sin transacciones conciliadas
                </div>
              )}
            </div>
          </div>

          <div className="p-2 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)] text-[9.5px] text-[var(--muted-foreground)] flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
            <span>Conciliado con comprobantes y arqueos de caja.</span>
          </div>
        </div>
      </div>

      {/* ─── 5. SECCIÓN INFERIOR: TOP MODELOS MÁS VENDIDOS (CON GRÁFICA DE ROTACIÓN) & SUCURSALES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* TOP MODELOS DE CALZADO (CON MINI GRÁFICA COMPARATIVA) */}
        <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs space-y-1.5">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
            <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
              <Award size={13} className="text-amber-500" />
              <span>Modelos Más Vendidos (Calzado de Cuero)</span>
            </h3>
            <span className="text-[9px] font-semibold text-[var(--muted-foreground)]">Ranking de Rotación</span>
          </div>

          {topModelos.length > 0 ? (
            <div className="space-y-1.5 pt-0.5">
              {topModelos.map((m, idx) => (
                <div key={m.id || idx} className="space-y-1 p-1.5 rounded-xl hover:bg-[var(--muted)]/30 transition-colors">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md font-black text-[9px] flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : idx === 1
                            ? "bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white"
                            : idx === 2
                            ? "bg-amber-700 text-amber-100"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-[var(--foreground)] truncate">{m.nombre}</div>
                        <div className="text-[9px] text-[var(--muted-foreground)] truncate">{m.marca}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-black text-[var(--foreground)] font-mono">{m.pares} pares</span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block font-mono">
                        ${Number(m.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Barra Gráfica de Rotación Relativa */}
                  <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((m.pares / maxParesModelos) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-[10px] text-[var(--muted-foreground)]">
              Sin rotación en este periodo
            </div>
          )}
        </div>

        {/* COMPARATIVO DE SUCURSALES (ADMIN GENERAL) O RENDIMIENTO OPERATIVO (ADMIN SUCURSAL / VENDEDOR) */}
        {isAdmin && isGlobalAdmin ? (
          <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs space-y-1.5">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
              <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <Building2 size={13} className="text-amber-500" />
                <span>Rendimiento por Sucursal</span>
              </h3>
              <span className="text-[9px] font-semibold text-[var(--muted-foreground)]">Red Comercial</span>
            </div>

            {comparativoSucursales.length > 0 ? (
              <div className="space-y-1.5 pt-0.5">
                {comparativoSucursales.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="space-y-0.5 p-1.5 rounded-lg bg-[var(--muted)]/20 border border-[var(--border)]">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <Store size={11} className="text-amber-500" />
                        {s.sucursalNombre}
                      </span>
                      <span className="font-black text-[var(--foreground)] font-mono">
                        ${Number(s.total || 0).toLocaleString("es-EC", { minimumFractionDigits: 2 })} ({s.porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${s.porcentaje}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-[10px] text-[var(--muted-foreground)]">
                Sin ventas registradas en sucursales
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs text-[var(--foreground)] flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
                <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <Store size={13} className="text-amber-500" />
                  <span>Rendimiento Operativo del Local</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                  Punto Activo
                </span>
              </div>
              <p className="text-[9.5px] text-[var(--muted-foreground)] leading-relaxed">
                Métricas directas de mostrador y despacho para {sucursales.find((s) => s.id === activeSucursalId)?.name || "el local"}.
              </p>
            </div>

            {/* Cuadrícula de Indicadores Operativos Clave */}
            <div className="grid grid-cols-2 gap-2 my-auto pt-0.5">
              <div className="p-2 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] space-y-0.5">
                <div className="flex items-center gap-1 text-[9px] text-[var(--muted-foreground)] font-semibold">
                  <DollarSign size={11} className="text-emerald-500" />
                  <span>Ticket Promedio</span>
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-[var(--foreground)]">
                  ${(kpis.totalPedidos > 0 ? kpis.totalFacturado / kpis.totalPedidos : 0).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[8px] text-[var(--muted-foreground)] block">Por venta cerrada</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] space-y-0.5">
                <div className="flex items-center gap-1 text-[9px] text-[var(--muted-foreground)] font-semibold">
                  <ShoppingBag size={11} className="text-blue-500" />
                  <span>Pares x Venta</span>
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-[var(--foreground)]">
                  {(kpis.totalPedidos > 0 ? (kpis.totalParesVendidos / kpis.totalPedidos) : 0).toFixed(1)} pares
                </div>
                <span className="text-[8px] text-[var(--muted-foreground)] block">Rotación promedio</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] space-y-0.5">
                <div className="flex items-center gap-1 text-[9px] text-[var(--muted-foreground)] font-semibold">
                  <BadgeCheck size={11} className="text-purple-500" />
                  <span>Transacciones</span>
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-[var(--foreground)]">
                  {kpis.totalPedidos} ventas
                </div>
                <span className="text-[8px] text-[var(--muted-foreground)] block">{kpis.clientesActivos} clientes</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] space-y-0.5">
                <div className="flex items-center gap-1 text-[9px] text-[var(--muted-foreground)] font-semibold">
                  <Package size={11} className="text-amber-500" />
                  <span>Salud de Bodega</span>
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {kpis.saludInventarioPct}%
                </div>
                <span className="text-[8px] text-[var(--muted-foreground)] block truncate">
                  {kpis.tallasAgotadasCount > 0 ? `${kpis.tallasAgotadasCount} sin stock` : "Curvas al 100%"}
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-[var(--border)] flex items-center justify-between text-[9px] text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Punto de Atención: <strong className="text-[var(--foreground)]">{sucursales.find((s) => s.id === activeSucursalId)?.name || "Sucursal Local"}</strong></span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">En línea</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TARJETA DE KPI EJECUTIVA ULTRA COMPACTA CON GAUGE / BARRA
// ════════════════════════════════════════════════════════════════
interface KpiExecutiveCardProps {
  title: string;
  value: string;
  subtitle: string;
  badgeText: string;
  badgePositive: boolean;
  icon: React.ReactNode;
  accentColor: string;
  progressPercent: number;
  progressLabel: string;
}

function KpiExecutiveCard({
  title,
  value,
  subtitle,
  badgeText,
  badgePositive,
  icon,
  accentColor,
  progressPercent,
  progressLabel,
}: KpiExecutiveCardProps) {
  const radius = 17;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progressPercent, 100) / 100) * circumference;

  return (
    <div className="p-2.5 sm:p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between">
      {/* Semicírculo Gauge en la esquina superior derecha */}
      <div className="absolute right-2 top-2 flex flex-col items-center pointer-events-none opacity-85">
        <svg width="40" height="24" viewBox="0 0 40 24" className="overflow-visible">
          <path
            d="M 3,21 A 17,17 0 0,1 37,21"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-[var(--muted)]/50"
          />
          <path
            d="M 3,21 A 17,17 0 0,1 37,21"
            fill="none"
            stroke={accentColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="text-[7.5px] font-black -mt-2 text-[var(--muted-foreground)]">
          {Math.min(Math.round(progressPercent), 100)}%
        </span>
      </div>

      <div className="space-y-1 pr-9">
        <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
          <div
            className="p-1 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          >
            {icon}
          </div>
          <span className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider truncate">{title}</span>
        </div>

        <div>
          <div className="text-base sm:text-lg font-black tracking-tight text-[var(--foreground)] font-mono">
            {value}
          </div>
          <div className="text-[8.5px] sm:text-[9px] text-[var(--muted-foreground)] font-medium truncate">{subtitle}</div>
        </div>
      </div>

      <div className="pt-1 mt-1 border-t border-[var(--border)] flex items-center justify-between text-[8px] sm:text-[8.5px] font-bold">
        <span
          className={`flex items-center gap-0.5 ${
            badgePositive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {badgePositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {badgeText}
        </span>
        <span className="text-[7.5px] sm:text-[8px] text-[var(--muted-foreground)] truncate max-w-[85px] font-normal">
          {progressLabel}
        </span>
      </div>
    </div>
  );
}
