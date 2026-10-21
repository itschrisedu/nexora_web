"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
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
  Layers,
  Award,
  Activity,
  ShieldAlert,
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
  const [alertasInventario, setAlertasInventario] = useState<any[]>([]);

  const [ventasChart, setVentasChart] = useState<{ label: string; monto: number; pares: number }[]>([]);
  const [metodosPago, setMetodosPago] = useState<{ metodo: string; porcentaje: number; total: number; color: string }[]>([]);
  const [topModelos, setTopModelos] = useState<{ id: string; nombre: string; marca: string; pares: number; total: number }[]>([]);
  const [comparativoSucursales, setComparativoSucursales] = useState<{ sucursalNombre: string; total: number; porcentaje: number }[]>([]);

  // Índices Financieros de Liquidez Operativa y Rentabilidad (Admin General y Sucursal)
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
    diagnosticoTitulo: string;
    diagnosticoTexto: string;
    diagnosticoNivel: 'ALTO' | 'MEDIO' | 'CRITICO';
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
    diagnosticoTitulo: 'Capacidad Óptima de Compra',
    diagnosticoTexto: 'Disponibilidad de efectivo suficiente para compra de pedidos y abastecimiento.',
    diagnosticoNivel: 'ALTO',
  });

  useEffect(() => {
    cargarDashboard();
  }, [activeSucursalId, periodo, online]);

  const cargarDashboard = async () => {
    setLoading(true);
    try {
      const sucParam = activeSucursalId ? `&sucursalId=${activeSucursalId}` : '';
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
          clientesActivos: Number(kpisBackend.clientesConDeudaCount ?? (Number(kpisBackend.saldoCarteraTotal || 0) > 0 ? 1 : 0)),
          creditoPendiente: Number(kpisBackend.saldoCarteraTotal || 0),
          capitalInvertidoStock: Number(kpisBackend.capitalInvertidoStock || 0),
          totalParesEnStock: Number(kpisBackend.totalParesEnStock || 0),
          valorComercialStock: Number(kpisBackend.valorComercialStock || 0),
          stockBajoCount: Number(kpisBackend.stockBajoCount || 0),
          tallasAgotadasCount: Number(kpisBackend.tallasAgotadasCount || 0),
          totalModelos: Number(kpisBackend.totalModelos || 0),
          saludInventarioPct: Number(kpisBackend.saludInventarioPct ?? 100),
        });

        if (Array.isArray(data.alertasInventario)) {
          setAlertasInventario(data.alertasInventario);
        } else {
          setAlertasInventario([]);
        }

        if (Array.isArray(data.serieTemporal) && data.serieTemporal.length > 0) {
          setVentasChart(
            data.serieTemporal.map((item: any) => ({
              label: item.label || item.fechaKey || '',
              monto: Number(item.ingresos || 0),
              pares: Number(item.pares || 0),
            }))
          );
        } else {
          setVentasChart([]);
        }

        const formasPago = data.distribucionFormasPago;
        if (formasPago && typeof formasPago === 'object') {
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
              metodo: metodo === 'CREDITO' ? 'CRÉDITO DIRECTO' : metodo,
              total: Number(v.monto || 0),
              porcentaje: Math.round((Number(v.monto || 0) / totalGen) * 100),
              color: colores[metodo] || ["#0F172A", "#10B981", "#F59E0B", "#6366F1"][idx % 4],
            }));
          setMetodosPago(parsed.length > 0 ? parsed : []);
        } else {
          setMetodosPago([]);
        }

        if (Array.isArray(data.topModelos) && data.topModelos.length > 0) {
          setTopModelos(
            data.topModelos.slice(0, 4).map((m: any) => ({
              id: m.productId || '',
              nombre: m.modelName || 'Calzado de Cuero',
              marca: m.serieNombre || m.color || 'Estándar',
              pares: Number(m.pares || 0),
              total: Number(m.ingresos || 0),
            }))
          );
        } else {
          setTopModelos([]);
        }

        if (isAdmin) {
          if (Array.isArray(data.ventasPorSucursal) && data.ventasPorSucursal.length > 0) {
            setComparativoSucursales(data.ventasPorSucursal);
          } else {
            setComparativoSucursales([]);
          }

          // Cargar datos complementarios para Índices Financieros de Liquidez Operativa y Rentabilidad
          try {
            const [prvs, gStats] = await Promise.all([
              ApiService.get('/proveedores').catch(() => []),
              ApiService.get(`/gastos/stats?mes=${new Date().getMonth()}&anio=${new Date().getFullYear()}${sucParam}`).catch(() => null),
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

            // Activo disponible inmediato sumando adelantos ya entregados a fabricantes
            const activoInmediato = ingresos + cartera + adelantos;
            const capNeto = activoInmediato - pasivoInmediato;

            // Utilidad Neta Real = Total Ingresos - Costo Mercadería - Gastos Operativos
            const gananciaBruta = Number(kpisBackend.gananciaBruta || (ingresos - costoCalzado));
            const utilNeta = Math.round((gananciaBruta - gMes) * 100) / 100;
            const margenNeto = ingresos > 0 ? Math.round((utilNeta / ingresos) * 1000) / 10 : 0;

            let diagTitulo = 'Capacidad Óptima de Compra';
            let diagTexto = 'Cuentas con liquidez holgada para ordenar nuevos lotes a fabricantes sin comprometer compromisos fijos.';
            let diagNivel: 'ALTO' | 'MEDIO' | 'CRITICO' = 'ALTO';

            if (capNeto < 0) {
              diagTitulo = 'Atención: Liquidez Comprometida';
              diagTexto = 'Prioriza el cobro de cartera y el pago a talleres antes de comprometer más pedidos de calzado.';
              diagNivel = 'CRITICO';
            } else if (capNeto < 800) {
              diagTitulo = 'Capacidad de Compra Moderada';
              diagTexto = 'Se aconseja producir sólo modelos de alta rotación y recaudar los créditos pendientes.';
              diagNivel = 'MEDIO';
            }

            setLiquidezIndices({
              efectivoCaja: ingresos,
              carteraCobro: cartera,
              capitalNetoCompra: capNeto,
              deudaProveedores: dProveedores,
              gastosMes: gMes,
              adelantosAProveedores: adelantos,
              utilidadNeta: utilNeta,
              margenNetoPct: margenNeto,
              costoMercaderia: costoCalzado,
              diagnosticoTitulo: diagTitulo,
              diagnosticoTexto: diagTexto,
              diagnosticoNivel: diagNivel,
            });
          } catch (e) {
            console.warn('Error calculando índices de liquidez en dashboard:', e);
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
        setAlertasInventario([]);
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

  const maxVentaChart = Math.max(...ventasChart.map((v) => v.monto), 1);

  // Metas dinámicas para los medidores de rendimiento
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
  const pctCartera = kpis.totalFacturado > 0 
    ? Math.min(Math.round((kpis.creditoPendiente / (kpis.totalFacturado + kpis.creditoPendiente)) * 100), 100)
    : 0;
  const pctStock = kpis.saludInventarioPct;

  return (
    <div className="space-y-4 max-w-full pb-4">
      {/* ─── BANNER COMPACTO CON SELECCIÓN DE SUCURSAL Y PERIODO ─── */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/80 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Título e Insignias */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                NEXORA
              </span>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                Control Comercial e Inventario
              </h2>
            </div>
            {activeSucursalId === "TODAS" && (
              <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700 items-center gap-1">
                <MapPin size={10} className="text-amber-400" />
                Consolidado General
              </span>
            )}
          </div>

          {/* Filtros de Sucursal & Periodo Compactos */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {isGlobalAdmin && sucursales.length > 0 ? (
              <select
                value={activeSucursalId}
                onChange={(e) => onSucursalChange(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900/90 border border-slate-700 rounded-xl text-[11px] font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer shadow-inner pr-6"
              >
                <option value="TODAS">🏢 Consolidado</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.isMatriz ? "🏢 " : "🏪 "} {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900/90 text-slate-200 border border-slate-700 flex items-center gap-1.5 shadow-inner">
                <MapPin size={11} className="text-amber-400" />
                {sucursales.find((s) => s.id === activeSucursalId)?.name || "Sucursal Local"}
              </span>
            )}

            {/* Selector de Periodo Ampliado: Hoy, Semana, Mes, Trimestre, Semestre, Año */}
            <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-slate-700 overflow-x-auto scrollbar-none">
              {(
                [
                  { id: "HOY", label: "Hoy" },
                  { id: "SEMANAL", label: "Semana" },
                  { id: "MENSUAL", label: "Mes" },
                  { id: "TRIMESTRAL", label: "Trimestre" },
                  { id: "SEMESTRAL", label: "Semestre" },
                  { id: "ANUAL", label: "Año" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodo(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    periodo === p.id
                      ? "bg-amber-500 text-slate-950 shadow-sm font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={cargarDashboard}
              disabled={loading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors shrink-0"
              title="Recargar Métricas"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── TARJETAS DE KPIS PRINCIPALES CON MEDIDOR GAUGE DINÁMICO ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCardCompact
          title={
            isVendedor
              ? "Mis Ventas Totales"
              : isGlobalAdmin && activeSucursalId === "TODAS"
              ? "Ventas Totales del Negocio"
              : "Ventas de la Sucursal"
          }
          value={`$${kpis.totalFacturado.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`}
          subtitle={isVendedor ? "Mis transacciones personales" : `${kpis.totalPedidos} transacciones`}
          icon={<DollarSign size={16} />}
          iconBg="bg-emerald-500/10 text-emerald-500"
          gaugePercent={pctIngresos}
          gaugeColor="#10B981"
          gaugeLabel={`Meta: $${metaPeriodo.toLocaleString()}`}
          trend={kpis.totalFacturado > 0 ? `$${(kpis.totalFacturado / (kpis.totalPedidos || 1)).toFixed(2)} prom.` : "Sin ventas"}
          trendPositive={kpis.totalFacturado > 0}
        />
        <KpiCardCompact
          title={
            isVendedor
              ? "Mis Pares Vendidos"
              : isGlobalAdmin && activeSucursalId === "TODAS"
              ? "Calzado Vendido Total"
              : "Calzado Vendido en Sucursal"
          }
          value={`${kpis.totalParesVendidos} pares`}
          subtitle={isVendedor ? "Mis pares entregados" : "Rotación en stock"}
          icon={<ShoppingBag size={16} />}
          iconBg="bg-blue-500/10 text-blue-500"
          gaugePercent={pctPares}
          gaugeColor="#3B82F6"
          gaugeLabel={`Meta: ${metaPares} pares`}
          trend={kpis.totalParesVendidos > 0 ? "Demanda activa" : "Sin salidas"}
          trendPositive={kpis.totalParesVendidos > 0}
        />
        <KpiCardCompact
          title="Cartera por Cobrar"
          value={`$${kpis.creditoPendiente.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`}
          subtitle={`${kpis.clientesActivos} ${kpis.clientesActivos === 1 ? 'cliente con saldo' : 'clientes con saldo'}`}
          icon={<CreditCard size={16} />}
          iconBg="bg-amber-500/10 text-amber-500"
          gaugePercent={pctCartera}
          gaugeColor="#F59E0B"
          gaugeLabel="Exposición crédito"
          trend="Seguimiento cuotas"
          trendPositive={false}
        />
        <KpiCardCompact
          title="Disponibilidad de Inventario"
          value={
            kpis.capitalInvertidoStock > 0
              ? `$${kpis.capitalInvertidoStock.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`
              : kpis.stockBajoCount > 0
              ? `${kpis.stockBajoCount} modelos alerta`
              : "100% Óptimo"
          }
          subtitle={
            kpis.capitalInvertidoStock > 0
              ? `${kpis.totalParesEnStock} pares en bodega (${kpis.stockBajoCount} con stock bajo)`
              : kpis.tallasAgotadasCount > 0
              ? `${kpis.tallasAgotadasCount} tallas en 0 / < 12 pares`
              : kpis.stockBajoCount > 0
              ? `${kpis.stockBajoCount} con stock bajo (< 12 p)`
              : "Stock completo por talla"
          }
          icon={<AlertTriangle size={16} />}
          iconBg={kpis.stockBajoCount > 0 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}
          valueColor={kpis.stockBajoCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}
          gaugePercent={pctStock}
          gaugeColor={pctStock < 50 ? "#EF4444" : pctStock < 85 ? "#F59E0B" : "#10B981"}
          gaugeLabel={kpis.capitalInvertidoStock > 0 ? "Costo invertido" : `${pctStock}% disponible`}
          trend={kpis.capitalInvertidoStock > 0 ? `${kpis.totalParesEnStock} pares en stock` : kpis.stockBajoCount > 0 ? `${kpis.stockBajoCount} de ${kpis.totalModelos || kpis.stockBajoCount} afectados` : "Inventario al día"}
          trendPositive={kpis.stockBajoCount === 0}
        />
      </div>

      {/* ─── ÍNDICES FINANCIEROS & LIQUIDEZ OPERATIVA (ADMIN GENERAL Y ADMIN SUCURSAL) ─── */}
      {isAdmin && (
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <Activity size={16} />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                  <span>Capacidad de Compra & Liquidez Disponible</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    liquidezIndices.diagnosticoNivel === 'ALTO'
                      ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25'
                      : liquidezIndices.diagnosticoNivel === 'MEDIO'
                      ? 'bg-amber-500/15 text-amber-600 border border-amber-500/25'
                      : 'bg-red-500/15 text-red-600 border border-red-500/25'
                  }`}>
                    {liquidezIndices.diagnosticoTitulo}
                  </span>
                </h3>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {liquidezIndices.diagnosticoTexto}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">
                Capital Neto para Nuevos Pedidos:
              </span>
              <span className={`text-base font-black font-mono ${
                liquidezIndices.capitalNetoCompra >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'
              }`}>
                ${liquidezIndices.capitalNetoCompra >= 0 ? `+${liquidezIndices.capitalNetoCompra.toFixed(2)}` : liquidezIndices.capitalNetoCompra.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl">
              <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">Efectivo en Caja / Bancos</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">${liquidezIndices.efectivoCaja.toFixed(2)}</span>
              <span className="text-[9px] text-[var(--muted-foreground)] block mt-0.5">Dinero líquido cobrado</span>
            </div>
            <div className="p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl">
              <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">Cobros Pendientes (Cartera)</span>
              <span className="text-sm font-black text-blue-600 font-mono">${liquidezIndices.carteraCobro.toFixed(2)}</span>
              <span className="text-[9px] text-[var(--muted-foreground)] block mt-0.5">Por cobrar a clientes</span>
            </div>
            <div className="p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl">
              <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">Deuda a Talleres</span>
              <span className="text-sm font-black text-orange-500 font-mono">${liquidezIndices.deudaProveedores.toFixed(2)}</span>
              <span className="text-[9px] text-[var(--muted-foreground)] block mt-0.5">Pendiente a fabricantes</span>
            </div>
            <div className="p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl">
              <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">Egresos del Mes</span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">${liquidezIndices.gastosMes.toFixed(2)}</span>
              <span className="text-[9px] text-[var(--muted-foreground)] block mt-0.5">Servicios, nómina y arriendos</span>
            </div>
          </div>

          {/* KPI CONDICIONAL DE ANTICIPOS A PROVEEDORES: SÓLO APARECE SI SE TIENEN ADELANTOS DADOS */}
          {liquidezIndices.adelantosAProveedores > 0 && (
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/25 rounded-xl flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-blue-500/20 text-blue-500">
                  <ShieldAlert size={14} />
                </span>
                <div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase block">
                    Anticipos Entregados a Talleres (Saldo a Favor)
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    Dinero ya adelantado a fabricantes que reduce tu deuda y cubre pedidos en confección
                  </span>
                </div>
              </div>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                +${liquidezIndices.adelantosAProveedores.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── TARJETA DE UTILIDAD NETA & GANANCIA OPERATIVA (ADAPTADA A TEMA CLARO Y OSCURO) ─── */}
      {isAdmin && (
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm text-[var(--foreground)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/25">
                <DollarSign size={18} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                  <span>Utilidad Neta & Rendimiento Comercial</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                    {periodo === 'HOY' ? 'Día de Hoy' : periodo === 'SEMANAL' ? 'Esta Semana' : periodo === 'MENSUAL' ? 'Este Mes' : periodo === 'TRIMESTRAL' ? 'Trimestre' : periodo === 'SEMESTRAL' ? 'Semestre' : 'Año en Curso'}
                  </span>
                </h3>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Ganancia neta real descontando costo de calzado a talleres y egresos operativos del negocio
                </p>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold">Ganancia Neta:</span>
              <span className={`text-xl sm:text-2xl font-black font-mono ${
                liquidezIndices.utilidadNeta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
              }`}>
                ${liquidezIndices.utilidadNeta.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                liquidezIndices.margenNetoPct >= 20 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}>
                {liquidezIndices.margenNetoPct}% margen
              </span>
            </div>
          </div>

          {/* Desglose de Rentabilidad Operativa */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">(+) Ventas Brutas</span>
              <span className="text-sm font-black text-[var(--foreground)] font-mono">${kpis.totalFacturado.toLocaleString("es-EC", { minimumFractionDigits: 2 })}</span>
              <span className="text-[9px] text-[var(--muted-foreground)] block mt-0.5">{kpis.totalPedidos} transacciones</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">(-) Costo Calzado (COGS)</span>
              <span className="text-sm font-black text-orange-500 font-mono">${liquidezIndices.costoMercaderia.toLocaleString("es-EC", { minimumFractionDigits: 2 })}</span>
              <span className="text-[9px] text-[var(--muted-foreground)] block mt-0.5">Pagado a fabricantes</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">(-) Egresos Operativos</span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">${liquidezIndices.gastosMes.toLocaleString("es-EC", { minimumFractionDigits: 2 })}</span>
              <span className="text-[9px] text-[var(--muted-foreground)] block mt-0.5">Luz, arriendo, nómina</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">(=) Utilidad Neta Real</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">${liquidezIndices.utilidadNeta.toLocaleString("es-EC", { minimumFractionDigits: 2 })}</span>
              <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 block mt-0.5">Excedente real del negocio</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECCIÓN DE GRÁFICOS Y ANALÍTICA COMPACTA ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        
        {/* GRÁFICO 1: EVOLUCIÓN DE VENTAS (BARRAS SVG) */}
        <div className="lg:col-span-2 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <BarChart3 size={15} className="text-amber-500" />
                Evolución de Ventas ({periodo.toLowerCase()})
              </h3>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                Ingresos registrados por periodo en la sucursal activa
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--muted)] text-[var(--muted-foreground)] uppercase">
              {periodo}
            </span>
          </div>

          {/* Gráfico SVG de Barras Compacto */}
          <div className="pt-2">
            {ventasChart.length > 0 ? (
              <>
                <div className="h-44 w-full flex items-end justify-between gap-2 px-1 pb-1 border-b border-[var(--border)]">
                  {ventasChart.map((item, idx) => {
                    const heightPercent = Math.max(Math.round((item.monto / maxVentaChart) * 100), 10);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                        {/* Tooltip Hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-9 bg-slate-900 text-white text-[9px] font-bold py-0.5 px-2 rounded-md pointer-events-none shadow-lg z-20 whitespace-nowrap">
                          ${Number(item.monto || 0).toFixed(2)} · {item.pares || 0} p.
                        </div>

                        {/* Barra con gradiente */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[40px] bg-gradient-to-t from-slate-900 via-slate-800 to-amber-500 group-hover:from-amber-600 group-hover:to-amber-400 rounded-t-lg transition-all shadow-sm"
                        />

                        {/* Etiqueta Eje X */}
                        <span className="text-[10px] font-semibold text-[var(--muted-foreground)] truncate max-w-full">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] pt-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Monto total ventas (USD)
                  </span>
                  <span className="font-bold text-[var(--foreground)]">
                    Promedio tramo: ${Math.round(kpis.totalFacturado / (ventasChart.length || 1)).toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <div className="h-44 w-full flex flex-col items-center justify-center text-[var(--muted-foreground)] gap-2">
                <BarChart3 size={32} className="opacity-20" />
                <p className="text-xs font-bold">Sin registros de ventas en este periodo</p>
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: CANALES Y MÉTODOS DE PAGO */}
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
              <PieChart size={15} className="text-amber-500" />
              Métodos de Cobro
            </h3>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Distribución de medios de pago en caja
            </p>
          </div>

          <div className="space-y-2.5 my-auto">
            {metodosPago.length > 0 ? (
              metodosPago.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.metodo}
                    </span>
                    <span className="font-bold text-[var(--foreground)]">
                      ${Number(item.total || 0).toFixed(2)} ({item.porcentaje}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.porcentaje}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-[var(--muted-foreground)] gap-1.5">
                <PieChart size={24} className="opacity-20" />
                <p className="text-[11px] font-bold">Sin datos de cobros</p>
              </div>
            )}
          </div>

          <div className="p-2 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)] text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <span>Conciliado con arqueos diarios de caja.</span>
          </div>
        </div>
      </div>

      {/* ─── SECCIÓN INFERIOR COMPACTA: RANKING DE MODELOS & COMPARATIVO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        
        {/* TOP MODELOS MÁS VENDIDOS */}
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
              <Award size={15} className="text-amber-500" />
              Modelos Más Vendidos (Calzado de Cuero)
            </h3>
            <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">Top 4</span>
          </div>

          {topModelos.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {topModelos.map((m, idx) => (
                <div key={m.id || idx} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 font-black text-[10px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-[var(--foreground)] truncate">{m.nombre}</div>
                      <div className="text-[9px] text-[var(--muted-foreground)]">{m.marca}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-black text-[var(--foreground)]">{m.pares} p.</div>
                    <div className="text-[9px] text-emerald-600 font-bold">${Number(m.total || 0).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-[var(--muted-foreground)] gap-1.5">
              <Award size={24} className="opacity-20 text-amber-500" />
              <p className="text-[11px] font-bold">Sin rotación en este periodo</p>
            </div>
          )}
        </div>

        {/* COMPARATIVO POR SUCURSALES (SÓLO ADMINS) O VISTA VENDEDOR */}
        {isAdmin ? (
          <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <Building2 size={15} className="text-amber-500" />
                Rendimiento por Sucursal
              </h3>
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">Red Comercial</span>
            </div>

            {comparativoSucursales.length > 0 ? (
              <div className="space-y-2 pt-1">
                {comparativoSucursales.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="space-y-1 p-2 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <Store size={12} className="text-amber-500" />
                        {s.sucursalNombre}
                      </span>
                      <span className="font-black text-[var(--foreground)]">
                        ${Number(s.total || 0).toLocaleString("es-EC", { minimumFractionDigits: 2 })} ({s.porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-slate-900 to-amber-500 rounded-full transition-all"
                        style={{ width: `${s.porcentaje}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-[var(--muted-foreground)] gap-1.5">
                <Store size={24} className="opacity-20 text-amber-500" />
                <p className="text-[11px] font-bold">Sin ventas registradas en sucursales</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PUNTO DE ATENCIÓN ACTIVO
              </span>
              <h4 className="text-sm font-bold">Rendimiento Operativo Local</h4>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                Visualización de métricas correspondientes a tu sucursal. Registra ventas en el POS y atiende pedidos para elevar la productividad.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>NEXORA Inteligencia Comercial</span>
              <span className="text-amber-400 font-bold">En línea</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

{/* ─── COMPONENTE TARJETA KPI COMPACTA CON MEDIDOR GAUGE SVG INTEGRADO ─── */}
interface KpiCardCompactProps {
  title: string;
  value: string;
  subtitle: string;
  valueColor?: string;
  icon: React.ReactNode;
  iconBg: string;
  gaugePercent: number; // 0 - 100
  gaugeColor: string;
  gaugeLabel: string;
  trend: string;
  trendPositive: boolean;
}

function KpiCardCompact({
  title,
  value,
  subtitle,
  valueColor = "",
  icon,
  iconBg,
  gaugePercent,
  gaugeColor,
  gaugeLabel,
  trend,
  trendPositive,
}: KpiCardCompactProps) {
  // Cálculo SVG del arco de gauge (semicírculo o arco 180 grados)
  const radius = 22;
  const circumference = Math.PI * radius; // 180 grados
  const strokeDashoffset = circumference - (Math.min(gaugePercent, 100) / 100) * circumference;

  return (
    <div className="p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
      
      {/* Medidor Gauge SVG sutil en la esquina superior derecha */}
      <div className="absolute right-2 top-2 flex flex-col items-center pointer-events-none opacity-85">
        <svg width="54" height="32" viewBox="0 0 54 32" className="overflow-visible">
          {/* Fondo del arco */}
          <path
            d="M 5,28 A 22,22 0 0,1 49,28"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="text-[var(--muted)]/60"
          />
          {/* Progreso del arco dinámico */}
          <path
            d="M 5,28 A 22,22 0 0,1 49,28"
            fill="none"
            stroke={gaugeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="text-[8px] font-black -mt-2.5 text-[var(--muted-foreground)]">
          {gaugePercent}%
        </span>
      </div>

      <div className="space-y-1.5 pr-12">
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">{title}</span>
        </div>
        <div>
          <div className={`text-lg sm:text-xl font-black tracking-tight ${valueColor || "text-[var(--foreground)]"}`}>
            {value}
          </div>
          <div className="text-[9px] sm:text-[10px] font-semibold text-[var(--muted-foreground)] truncate">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="pt-2 mt-2 border-t border-[var(--border)] flex items-center justify-between text-[9px] font-bold">
        <span className={trendPositive ? "text-emerald-600 flex items-center gap-0.5" : "text-amber-600 flex items-center gap-0.5"}>
          {trendPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {trend}
        </span>
        <span className="text-[8px] text-[var(--muted-foreground)] truncate max-w-[80px]">
          {gaugeLabel}
        </span>
      </div>
    </div>
  );
}
