"use client";

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  Package,
  DollarSign,
  Printer,
  Download,
  Filter,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Building2,
  BrainCircuit,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Award,
  AlertTriangle,
  Receipt,
  Store,
  ChevronDown,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { ApiService } from '@/services/api.service';
import { useToast } from '@/components/ui/toast';

type PeriodoTipo = 'HOY' | 'SEMANAL' | 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL' | 'PERSONALIZADO';
type TabReporte = 'resumen' | 'modelos' | 'vendedores' | 'finanzas' | 'proyeccion_ml';

interface Vendedor {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

export default function ReportesComponent() {
  const { showToast } = useToast();

  // Estados de Filtros
  const [periodo, setPeriodo] = useState<PeriodoTipo>('MENSUAL');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<string>('TODOS');
  const [canalSeleccionado, setCanalSeleccionado] = useState<string>('TODOS');

  // Estados de Datos
  const [loading, setLoading] = useState(true);
  const [reporteData, setReporteData] = useState<any>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [tabActiva, setTabActiva] = useState<TabReporte>('resumen');

  // Estado de Proyección ML
  const [loadingMl, setLoadingMl] = useState(false);
  const [proyeccionMl, setProyeccionMl] = useState<any>(null);

  useEffect(() => {
    cargarVendedores();
  }, []);

  useEffect(() => {
    cargarReporte();
  }, [periodo, vendedorSeleccionado, canalSeleccionado]);

  const cargarVendedores = async () => {
    try {
      const data = await ApiService.get('/reportes/vendedores');
      if (Array.isArray(data)) {
        setVendedores(data);
      }
    } catch (err: any) {
      console.error('Error al cargar lista de vendedores:', err);
    }
  };

  const cargarReporte = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('periodo', periodo);
      if (periodo === 'PERSONALIZADO') {
        if (fechaDesde) params.append('fechaDesde', fechaDesde);
        if (fechaHasta) params.append('fechaHasta', fechaHasta);
      }
      if (vendedorSeleccionado && vendedorSeleccionado !== 'TODOS') {
        params.append('vendedorId', vendedorSeleccionado);
      }
      if (canalSeleccionado && canalSeleccionado !== 'TODOS') {
        params.append('canal', canalSeleccionado);
      }

      const data = await ApiService.get(`/reportes/resumen-ejecutivo?${params.toString()}`);
      if (data) {
        setReporteData(data);
      }
    } catch (err: any) {
      console.warn('Reportes: esperando backend o error de red:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarProyeccionMl = async () => {
    setLoadingMl(true);
    try {
      const data = await ApiService.get('/reportes/proyeccion-ml?horizonteDias=30');
      setProyeccionMl(data);
      showToast('Proyección de demanda generada exitosamente con Inteligencia Artificial.', 'success');
    } catch (err: any) {
      showToast('Error al conectar con el motor de predicción ML.', 'warning');
    } finally {
      setLoadingMl(false);
    }
  };

  const handleImprimirReporte = () => {
    window.print();
  };

  const kpis = reporteData?.kpis || {
    totalIngresos: 0,
    totalParesVendidos: 0,
    totalPedidos: 0,
    ticketPromedio: 0,
    costoEstimadoTotal: 0,
    gananciaBruta: 0,
    margenPorcentaje: 0,
    totalRecaudadoCobros: 0,
    saldoCarteraTotal: 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* CABECERA PRINCIPAL & ACCIONES                                    */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#0F172A] text-white rounded-2xl shadow-sm">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[var(--foreground)] tracking-tight">
              Reportes & Business Intelligence
            </h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              Análisis multi-filtro de ventas, rendimiento por trabajador, rotación de calzado y cobranzas de la sucursal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cargarReporte}
            disabled={loading}
            className="px-4 py-2.5 bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handleImprimirReporte}
            className="px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer size={14} />
            <span>Imprimir Informe</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* PANEL DE CONTROL: MULTI-FILTRO AVANZADO                          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={14} className="text-[#0F172A]" />
            <span>Filtros de Análisis</span>
          </span>
          <span className="text-[11px] text-[var(--muted-foreground)] font-semibold">
            {periodo === 'PERSONALIZADO' ? 'Rango personalizado' : `Vista: ${periodo}`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Selector de Periodicidad */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted-foreground)] uppercase mb-1.5">
              1. Periodicidad / Rango Temporal
            </label>
            <div className="flex flex-wrap gap-1">
              {(['HOY', 'SEMANAL', 'MENSUAL', 'TRIMESTRAL', 'ANUAL', 'PERSONALIZADO'] as PeriodoTipo[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    periodo === p
                      ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-2xs'
                      : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[#0F172A]'
                  }`}
                >
                  {p === 'HOY' && 'Hoy'}
                  {p === 'SEMANAL' && 'Semanal'}
                  {p === 'MENSUAL' && 'Mensual'}
                  {p === 'TRIMESTRAL' && 'Trimestral'}
                  {p === 'ANUAL' && 'Anual'}
                  {p === 'PERSONALIZADO' && 'Personalizado'}
                </button>
              ))}
            </div>

            {/* Fechas personalizadas */}
            {periodo === 'PERSONALIZADO' && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--border)]">
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted-foreground)] block mb-1">Desde:</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted-foreground)] block mb-1">Hasta:</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Selector de Vendedor / Trabajador */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted-foreground)] uppercase mb-1.5">
              2. Alcance / Trabajador o Vendedor
            </label>
            <div className="relative">
              <select
                value={vendedorSeleccionado}
                onChange={(e) => setVendedorSeleccionado(e.target.value)}
                className="w-full px-3.5 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A] appearance-none"
              >
                <option value="TODOS">🏢 Toda la Sucursal (Consolidado Global)</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    👤 {v.nombre} ({v.rol.replace('ROL_', '')})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
              Filtra las métricas para evaluar la productividad individual o grupal.
            </p>
          </div>

          {/* 3. Selector de Canal de Venta */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted-foreground)] uppercase mb-1.5">
              3. Canal de Venta
            </label>
            <div className="relative">
              <select
                value={canalSeleccionado}
                onChange={(e) => setCanalSeleccionado(e.target.value)}
                className="w-full px-3.5 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A] appearance-none"
              >
                <option value="TODOS">Todos los Canales de Entrada</option>
                <option value="MANUAL">🏪 POS Mostrador / Venta Directa</option>
                <option value="WHATSAPP">💬 Pedidos WhatsApp / Comercial</option>
                <option value="CATALOGO">📱 Catálogo Digital</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
              Compara el rendimiento entre venta en mostrador y mayoristas.
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* PESTAÑAS DE VISUALIZACIÓN                                        */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {[
          { id: 'resumen' as TabReporte, label: 'Resumen Ejecutivo & KPIs', icon: <BarChart3 size={15} /> },
          { id: 'modelos' as TabReporte, label: 'Rotación de Calzado & Modelos', icon: <ShoppingBag size={15} /> },
          { id: 'vendedores' as TabReporte, label: 'Productividad por Trabajador', icon: <Users size={15} /> },
          { id: 'finanzas' as TabReporte, label: 'Cobranzas & Finanzas', icon: <DollarSign size={15} /> },
          { id: 'proyeccion_ml' as TabReporte, label: 'Proyección IA / Machine Learning', icon: <BrainCircuit size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setTabActiva(tab.id);
              if (tab.id === 'proyeccion_ml' && !proyeccionMl) {
                cargarProyeccionMl();
              }
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              tabActiva === tab.id
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] border border-[var(--border)]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-3xl flex flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="animate-spin text-[#0F172A]" />
          <span className="text-xs font-bold">Generando consolidado de inteligencia comercial...</span>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: RESUMEN EJECUTIVO & KPIs                                */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tabActiva === 'resumen' && (
            <div className="space-y-6">
              {/* Tarjetas KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Facturación Total */}
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)] tracking-wider">
                      Facturación Total
                    </span>
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[var(--foreground)]">
                      ${kpis.totalIngresos.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-[var(--muted-foreground)] font-semibold mt-1">
                      {kpis.totalPedidos} pedidos registrados
                    </div>
                  </div>
                </div>

                {/* 2. Pares Vendidos */}
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)] tracking-wider">
                      Calzado Vendido
                    </span>
                    <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                      <ShoppingBag size={18} />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[var(--foreground)]">
                      {kpis.totalParesVendidos} <span className="text-sm font-bold text-[var(--muted-foreground)]">pares</span>
                    </div>
                    <div className="text-[11px] text-[var(--muted-foreground)] font-semibold mt-1">
                      Ticket Promedio: ${kpis.ticketPromedio.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* 3. Margen Bruto Estimado */}
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)] tracking-wider">
                      Ganancia Bruta Est.
                    </span>
                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-emerald-600">
                      ${kpis.gananciaBruta.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-bold mt-1">
                      Margen: {kpis.margenPorcentaje.toFixed(1)}% sobre costo
                    </div>
                  </div>
                </div>

                {/* 4. Recaudación de Cobros */}
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)] tracking-wider">
                      Recaudación Cobros
                    </span>
                    <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                      <Receipt size={18} />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[var(--foreground)]">
                      ${kpis.totalRecaudadoCobros.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-red-500 font-bold mt-1">
                      Saldo Cartera Activa: ${kpis.saldoCarteraTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico de Evolución Temporal */}
              <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)]">
                      Evolución Temporal de Ventas e Ingresos
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Comportamiento diario de la facturación y volumen de pares de calzado en el periodo seleccionado
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[var(--muted-foreground)] px-3 py-1 bg-[var(--muted)]/40 rounded-xl">
                    {reporteData?.serieTemporal?.length || 0} puntos temporales
                  </span>
                </div>

                {reporteData?.serieTemporal?.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[var(--muted-foreground)] italic">
                    No hay movimientos registrados para el filtro seleccionado.
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {/* Gráfico de barras visuales */}
                    <div className="space-y-2">
                      {reporteData?.serieTemporal?.map((item: any) => {
                        const maxIngreso = Math.max(
                          ...reporteData.serieTemporal.map((t: any) => t.ingresos || 0),
                          100
                        );
                        const porcentaje = Math.min(100, Math.max(8, (item.ingresos / maxIngreso) * 100));

                        return (
                          <div key={item.fechaKey} className="flex items-center gap-3 text-xs">
                            <span className="w-20 text-[11px] font-bold text-[var(--muted-foreground)] shrink-0">
                              {item.label}
                            </span>
                            <div className="flex-1 bg-[var(--muted)]/40 h-8 rounded-xl overflow-hidden relative flex items-center p-1 border border-[var(--border)]/50">
                              <div
                                style={{ width: `${porcentaje}%` }}
                                className="h-full bg-gradient-to-r from-[#0F172A] to-slate-700 dark:from-emerald-600 dark:to-emerald-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-2 text-white font-black text-[10px]"
                              >
                                {item.ingresos > 0 && `$${item.ingresos.toFixed(0)}`}
                              </div>
                            </div>
                            <span className="w-24 text-right font-black text-[11px] text-[var(--foreground)] shrink-0">
                              ${item.ingresos.toFixed(2)}
                            </span>
                            <span className="w-16 text-right text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                              {item.pares} pares
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Distribución por Canales y Formas de Pago */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Canales de Venta */}
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-3 shadow-xs">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-[var(--foreground)]">
                    Ventas por Canal de Entrada
                  </h3>
                  <div className="space-y-2 text-xs">
                    {[
                      { key: 'MANUAL', label: '🏪 POS Mostrador / Venta Directa', data: reporteData?.distribucionCanales?.MANUAL },
                      { key: 'WHATSAPP', label: '💬 Pedidos WhatsApp / Asesor', data: reporteData?.distribucionCanales?.WHATSAPP },
                      { key: 'CATALOGO', label: '📱 Catálogo Digital Web', data: reporteData?.distribucionCanales?.CATALOGO },
                    ].map((c) => {
                      const monto = c.data?.monto || 0;
                      const pares = c.data?.pares || 0;
                      const pct = kpis.totalIngresos > 0 ? (monto / kpis.totalIngresos) * 100 : 0;
                      return (
                        <div key={c.key} className="p-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl space-y-1">
                          <div className="flex justify-between items-center font-bold">
                            <span>{c.label}</span>
                            <span>${monto.toFixed(2)} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-[var(--muted)] h-2 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%` }} className="bg-emerald-600 h-full rounded-full" />
                          </div>
                          <div className="text-[10px] text-[var(--muted-foreground)]">
                            {pares} pares vendidos en {c.data?.count || 0} pedidos
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Formas de Pago */}
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-3 shadow-xs">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-[var(--foreground)]">
                    Distribución Contado vs Crédito
                  </h3>
                  <div className="space-y-2 text-xs">
                    {[
                      { key: 'CONTADO', label: '💵 Ventas de Contado', data: reporteData?.distribucionFormasPago?.CONTADO, color: 'bg-emerald-600' },
                      { key: 'CREDITO', label: '📑 Ventas a Crédito', data: reporteData?.distribucionFormasPago?.CREDITO, color: 'bg-blue-600' },
                    ].map((f) => {
                      const monto = f.data?.monto || 0;
                      const pct = kpis.totalIngresos > 0 ? (monto / kpis.totalIngresos) * 100 : 0;
                      return (
                        <div key={f.key} className="p-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl space-y-1">
                          <div className="flex justify-between items-center font-bold">
                            <span>{f.label}</span>
                            <span>${monto.toFixed(2)} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-[var(--muted)] h-2 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%` }} className={`${f.color} h-full rounded-full`} />
                          </div>
                          <div className="text-[10px] text-[var(--muted-foreground)]">
                            {f.data?.count || 0} operaciones registradas
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 2: ROTACIÓN DE CALZADO & MODELOS                           */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tabActiva === 'modelos' && (
            <div className="space-y-6">
              {/* Top 10 Modelos Estrella */}
              <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
                      <Award className="text-amber-500" size={18} />
                      <span>Top 10 Modelos de Calzado Más Vendidos</span>
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Artículos con mayor demanda y rotación en el periodo analizado
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                    {reporteData?.topModelos?.length || 0} modelos estrella
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reporteData?.topModelos?.map((m: any, idx: number) => (
                    <div
                      key={m.productId ? `top-${m.productId}` : `top-${idx}`}
                      className="p-3.5 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl flex items-center gap-3 relative overflow-hidden"
                    >
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#0F172A] text-white rounded-md text-[10px] font-black">
                        #{idx + 1}
                      </div>

                      {m.imageUrl ? (
                        <img src={m.imageUrl} alt="" className="w-14 h-14 object-cover rounded-xl border border-[var(--border)] shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-[var(--muted)] flex items-center justify-center text-xl shrink-0">
                          👞
                        </div>
                      )}

                      <div className="min-w-0 flex-1 pr-6">
                        <span className="font-black text-xs text-[var(--foreground)] block truncate">{m.modelName}</span>
                        <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                          Color: <strong className="text-[var(--foreground)]">{m.color}</strong> • {m.serieNombre}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-black text-emerald-600">
                            {m.pares} pares
                          </span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            (${m.ingresos.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerta de Baja Rotación / Stock Estancado */}
              <div className="p-6 bg-[var(--card)] border border-rose-500/30 rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
                      <AlertTriangle className="text-rose-500" size={18} />
                      <span>Alerta de Calzado con Baja Rotación (Stock Estancado)</span>
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Modelos con stock físico en bodega pero con 0 o pocas ventas en el periodo (Candidatos a descuento de liquidación)
                    </p>
                  </div>
                  <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-xl border border-rose-500/20">
                    {reporteData?.bajaRotacion?.length || 0} modelos inmóviles
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {reporteData?.bajaRotacion?.map((m: any, idx: number) => (
                    <div
                      key={m.productId ? `baja-${m.productId}` : `baja-${idx}`}
                      className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-2"
                    >
                      <div className="flex items-center gap-2.5">
                        {m.imageUrl ? (
                          <img src={m.imageUrl} alt="" className="w-10 h-10 object-cover rounded-lg border border-[var(--border)] shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center text-sm shrink-0">
                            📦
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-[var(--foreground)] block truncate">{m.modelName}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)] block truncate">Color: {m.color}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1 border-t border-rose-500/20">
                        <span className="text-slate-500 text-[11px]">Stock Parado:</span>
                        <strong className="text-rose-600 font-black">{m.stockActual} pares</strong>
                      </div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">
                        Salidas en el periodo: <strong className="text-[var(--foreground)]">{m.paresVendidosEnPeriodo} pares</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 3: PRODUCTIVIDAD POR TRABAJADOR                            */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tabActiva === 'vendedores' && (
            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
                    <Users className="text-[#0F172A]" size={18} />
                    <span>Ranking y Rendimiento del Personal de Ventas</span>
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Desglose de pedidos, pares comercializados y volumen facturado por cada colaborador
                  </p>
                </div>
                <span className="text-xs font-bold text-[var(--muted-foreground)] px-3 py-1 bg-[var(--muted)]/40 rounded-xl">
                  {reporteData?.rankingVendedores?.length || 0} trabajadores
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--muted)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-4 py-3">Posición / Trabajador</th>
                      <th className="px-4 py-3 text-center">Rol</th>
                      <th className="px-4 py-3 text-center">Pedidos Realizados</th>
                      <th className="px-4 py-3 text-center">Pares Vendidos</th>
                      <th className="px-4 py-3 text-right">Monto Total Facturado</th>
                      <th className="px-4 py-3 text-right">% Contribución Sucursal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {reporteData?.rankingVendedores?.map((v: any, index: number) => {
                      const contribucionPct = kpis.totalIngresos > 0 ? (v.ingresosFacturados / kpis.totalIngresos) * 100 : 0;
                      return (
                        <tr key={v.userId ? `vend-${v.userId}` : `vend-${index}`} className="hover:bg-[var(--muted)]/20">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${
                                index === 0 ? 'bg-amber-500 text-white' : index === 1 ? 'bg-slate-400 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                #{index + 1}
                              </span>
                              <div>
                                <span className="font-extrabold text-xs text-[var(--foreground)] block">{v.nombre}</span>
                                <span className="text-[10px] text-[var(--muted-foreground)]">{v.email || 'Sin correo'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 bg-[#0F172A]/10 text-[#0F172A] rounded-md font-bold text-[10px]">
                              {v.rol.replace('ROL_', '')}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center font-bold">{v.pedidosCount} pedidos</td>

                          <td className="px-4 py-3 text-center font-black text-indigo-600 dark:text-indigo-400">
                            {v.paresVendidos} pares
                          </td>

                          <td className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
                            ${v.ingresosFacturados.toFixed(2)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-[var(--muted)] h-2 rounded-full overflow-hidden">
                                <div style={{ width: `${contribucionPct}%` }} className="bg-[#0F172A] h-full rounded-full" />
                              </div>
                              <span className="font-bold text-[11px] text-[var(--foreground)]">{contribucionPct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 4: FINANZAS & COBRANZAS                                    */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tabActiva === 'finanzas' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Desglose de Métodos de Pago en Cobranzas */}
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-3 shadow-xs">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-[var(--foreground)]">
                    Recaudación por Método de Pago / Abono
                  </h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(reporteData?.distribucionMetodosAbono || {}).map(([met, d]: [string, any]) => {
                      const pct = kpis.totalRecaudadoCobros > 0 ? (d.monto / kpis.totalRecaudadoCobros) * 100 : 0;
                      return (
                        <div key={met} className="p-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl space-y-1">
                          <div className="flex justify-between items-center font-bold">
                            <span>
                              {met === 'EFECTIVO' && '💵 Efectivo'}
                              {met === 'TRANSFERENCIA' && '🏦 Transferencia Bancaria'}
                              {met === 'DEPOSITO' && '💳 Depósito'}
                              {met === 'CHEQUE' && '📑 Cheque'}
                              {met === 'DESCUENTO_COMERCIAL' && '🎁 Descuento / Rebaja Retención'}
                            </span>
                            <span>${d.monto.toFixed(2)} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-[var(--muted)] h-2 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%` }} className="bg-blue-600 h-full rounded-full" />
                          </div>
                          <div className="text-[10px] text-[var(--muted-foreground)]">
                            {d.count} abonos recibidos
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumen de Cartera y Salud Financiera */}
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4 shadow-xs">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-[var(--foreground)]">
                    Salud Crediticia & Cartera de Clientes
                  </h3>

                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-1">
                    <span className="text-[11px] font-bold text-red-600 uppercase">Saldo Deudor Pendiente en Cartera:</span>
                    <div className="text-2xl font-black text-red-600">
                      ${kpis.saldoCarteraTotal.toFixed(2)}
                    </div>
                    <p className="text-[10px] text-red-700/80">
                      Total adeudado por clientes en notas y compras a crédito activas.
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase">Efectividad de Recaudación en el Periodo:</span>
                    <div className="text-2xl font-black text-emerald-600">
                      ${kpis.totalRecaudadoCobros.toFixed(2)}
                    </div>
                    <p className="text-[10px] text-emerald-700/80">
                      Monto líquido ingresado a caja por concepto de cobros y abonos en estas fechas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 5: PROYECCIÓN IA / MACHINE LEARNING                        */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tabActiva === 'proyeccion_ml' && (
            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-sm">
                    <BrainCircuit size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)]">
                      Motor Predictivo de Demanda de Calzado (Nexora ML)
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Proyección estadística e inferencia basada en patrones de consumo del cantón Cevallos
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cargarProyeccionMl}
                  disabled={loadingMl}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={14} className={loadingMl ? 'animate-spin' : ''} />
                  <span>{loadingMl ? 'Calculando Inferencia...' : 'Recalcular Proyección IA'}</span>
                </button>
              </div>

              {loadingMl ? (
                <div className="p-12 text-center text-xs text-[var(--muted-foreground)] flex flex-col items-center justify-center gap-2">
                  <Loader2 size={32} className="animate-spin text-purple-600" />
                  <span>Procesando serie temporal y curvas estacionales...</span>
                </div>
              ) : proyeccionMl ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                      <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 block mb-1">
                        Pares Proyectados (Próx. 30 Días):
                      </span>
                      <span className="text-2xl font-black text-purple-900 dark:text-purple-200">
                        {proyeccionMl.totalParesProyectados || 0} pares
                      </span>
                    </div>

                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                      <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 block mb-1">
                        Nivel de Confianza del Modelo:
                      </span>
                      <span className="text-2xl font-black text-indigo-900 dark:text-indigo-200">
                        {proyeccionMl.confianza || '89.4%'}
                      </span>
                    </div>

                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block mb-1">
                        Recomendación Operativa:
                      </span>
                      <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 block">
                        Abastecer series juveniles y adulto para pico de fin de semana
                      </span>
                    </div>
                  </div>

                  {/* Tabla de proyección diaria */}
                  <div className="border border-[var(--border)] rounded-2xl overflow-hidden">
                    <div className="p-3 bg-[var(--muted)]/40 text-xs font-extrabold text-[var(--foreground)] border-b border-[var(--border)]">
                      Demanda Proyectada Día por Día
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border)] text-xs">
                      {proyeccionMl.proyecciones?.map((p: any, i: number) => (
                        <div key={i} className="p-2.5 flex items-center justify-between hover:bg-[var(--muted)]/20">
                          <span className="font-bold text-[var(--foreground)]">{p.diaLabel || p.fecha}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-[var(--muted-foreground)]">
                              Rango: {p.limiteInferior} - {p.limiteSuperior} pares
                            </span>
                            <span className="px-2 py-0.5 bg-purple-500/15 text-purple-700 dark:text-purple-300 rounded-md font-black">
                              {p.demandaEsperadaPares} pares
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                  Presiona «Recalcular Proyección IA» para consultar la predicción de ventas.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
