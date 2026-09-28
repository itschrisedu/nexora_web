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
  Eye,
  Search,
  Megaphone,
  Percent,
  Tag,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { ApiService } from '@/services/api.service';
import { useToast } from '@/components/ui/toast';
import PdfPreviewModal from '@/components/ui/pdf-preview-modal';
import {
  generarReporteCobranzasPdf,
  generarReporteCampanasPdf,
  generarReporteResumenEjecutivoPdf,
  generarReporteModelosRotacionPdf,
  generarReporteProductividadVendedoresPdf,
  generarReporteFinanzasMetodosPdf,
  generarReporteProyeccionMlPdf,
  generarReporteGeneralIntegralPdf,
  ClienteDeudor,
  CampanaReporte,
  ModeloReporte,
  VendedorReporte,
} from '@/services/pdf-reportes.service';
import { jsPDF } from 'jspdf';

type PeriodoTipo = 'HOY' | 'SEMANAL' | 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL' | 'PERSONALIZADO';
type TabReporte = 'resumen' | 'modelos' | 'vendedores' | 'finanzas' | 'cobranzas' | 'campanas' | 'proyeccion_ml';

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

  // Estados de Datos Generales
  const [loading, setLoading] = useState(true);
  const [reporteData, setReporteData] = useState<any>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [tabActiva, setTabActiva] = useState<TabReporte>('resumen');
  const [negocioInfo, setNegocioInfo] = useState<any>(null);

  // Filtros específicos para Productividad por Trabajador
  const [filtroTrabajadorTexto, setFiltroTrabajadorTexto] = useState('');
  const [filtroTrabajadorRol, setFiltroTrabajadorRol] = useState('TODOS');
  const [filtroTrabajadorOrden, setFiltroTrabajadorOrden] = useState<'VENTAS_DESC' | 'PARES_DESC' | 'PEDIDOS_DESC' | 'VENTAS_ASC'>('VENTAS_DESC');

  // Estado de Reporte de Cobranzas (Clientes Deudores)
  const [loadingCobranzas, setLoadingCobranzas] = useState(false);
  const [cobranzasData, setCobranzasData] = useState<any>(null);
  const [filtroDeudor, setFiltroDeudor] = useState('');
  const [filtroScoreDeudor, setFiltroScoreDeudor] = useState('TODOS');
  const [clienteExpandidoId, setClienteExpandidoId] = useState<string | null>(null);

  // Estado de Reporte de Campañas
  const [loadingCampanas, setLoadingCampanas] = useState(false);
  const [campanasData, setCampanasData] = useState<any>(null);
  const [filtroCampanaEstado, setFiltroCampanaEstado] = useState('TODAS');
  const [busquedaCampana, setBusquedaCampana] = useState('');

  // Estado de Proyección ML
  const [loadingMl, setLoadingMl] = useState(false);
  const [proyeccionMl, setProyeccionMl] = useState<any>(null);

  // Estado del Modal de Previsualización de PDF Universal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [pdfDocPreview, setPdfDocPreview] = useState<jsPDF | null>(null);
  const [previewTitulo, setPreviewTitulo] = useState('Previsualización de Documento');
  const [previewNombreArchivo, setPreviewNombreArchivo] = useState('reporte-nexora.pdf');
  const [generandoGeneralPdf, setGenerandoGeneralPdf] = useState(false);

  useEffect(() => {
    cargarVendedores();
    cargarNegocioInfo();
  }, []);

  useEffect(() => {
    cargarReporte();
  }, [periodo, vendedorSeleccionado, canalSeleccionado]);

  useEffect(() => {
    if (tabActiva === 'cobranzas' && !cobranzasData) {
      cargarCobranzas();
    } else if (tabActiva === 'campanas' && !campanasData) {
      cargarCampanas();
    } else if (tabActiva === 'proyeccion_ml' && !proyeccionMl) {
      cargarProyeccionMl();
    }
  }, [tabActiva]);

  const cargarNegocioInfo = async () => {
    try {
      const data = await ApiService.get('/configuracion/negocio');
      if (data) setNegocioInfo(data);
    } catch (err: any) {
      console.warn('No se pudo cargar config negocio:', err?.message);
    }
  };

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

  const cargarCobranzas = async () => {
    setLoadingCobranzas(true);
    try {
      const data = await ApiService.get('/reportes/cobranzas');
      setCobranzasData(data);
    } catch (err: any) {
      console.error('Error al cargar reporte de cobranzas:', err);
      showToast('Error al obtener reporte de clientes deudores.', 'warning');
    } finally {
      setLoadingCobranzas(false);
    }
  };

  const cargarCampanas = async () => {
    setLoadingCampanas(true);
    try {
      const data = await ApiService.get('/reportes/campanas');
      setCampanasData(data);
    } catch (err: any) {
      console.error('Error al cargar reporte de campañas:', err);
      showToast('Error al obtener reporte de campañas promocionales.', 'warning');
    } finally {
      setLoadingCobranzas(false);
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

  const obtenerNegocioPayload = () => ({
    nombre: negocioInfo?.nombre || 'CALZADO COMERCIAL',
    ruc: negocioInfo?.ruc || '1800000000001',
    direccion: negocioInfo?.direccion || 'Cevallos, Tungurahua, Ecuador',
    telefono: negocioInfo?.telefono || '',
  });

  // ══════════════════════════════════════════════════════════════
  // GENERADORES DE PDF PARA TODAS LAS SECCIONES
  // ══════════════════════════════════════════════════════════════

  // 1. INFORME GENERAL CONSOLIDADO (UNIFICA TODO EL NEGOCIO)
  const handleReporteGeneralIntegral = async (modo: 'preview' | 'download') => {
    setGenerandoGeneralPdf(true);
    try {
      let cobData = cobranzasData;
      let campData = campanasData;
      let mlData = proyeccionMl;

      if (!cobData) {
        try {
          cobData = await ApiService.get('/reportes/cobranzas');
          setCobranzasData(cobData);
        } catch (e) {}
      }
      if (!campData) {
        try {
          campData = await ApiService.get('/reportes/campanas');
          setCampanasData(campData);
        } catch (e) {}
      }
      if (!mlData) {
        try {
          mlData = await ApiService.get('/reportes/proyeccion-ml?horizonteDias=30');
          setProyeccionMl(mlData);
        } catch (e) {}
      }

      const payload = {
        negocio: obtenerNegocioPayload(),
        periodo,
        fechaGeneracion: new Date().toLocaleString('es-EC'),
        kpis,
        serieTemporal: reporteData?.serieTemporal || [],
        topModelos: reporteData?.topModelos || [],
        bajaRotacion: reporteData?.bajaRotacion || [],
        rankingVendedores: reporteData?.rankingVendedores || [],
        cobranzas: cobData ? {
          totalCartera: cobData.totalCartera || 0,
          totalClientes: cobData.totalClientes || 0,
          clientes: cobData.clientes || [],
        } : undefined,
        campanas: campData?.campanas || [],
        distribucionMetodos: reporteData?.distribucionMetodosAbono || {},
        proyeccionMl: mlData || undefined,
      };

      const doc = generarReporteGeneralIntegralPdf(payload);
      const nombre = `informe_general_consolidado_${new Date().toISOString().split('T')[0]}.pdf`;

      if (modo === 'preview') {
        setPdfDocPreview(doc);
        setPreviewTitulo('Informe General Consolidado — Business Intelligence');
        setPreviewNombreArchivo(nombre);
        setPreviewModalOpen(true);
      } else {
        doc.save(nombre);
        showToast('Informe General Consolidado descargado exitosamente.', 'success');
      }
    } catch (err: any) {
      console.error('Error generando informe general:', err);
      showToast('Error al generar el informe general consolidado.', 'error');
    } finally {
      setGenerandoGeneralPdf(false);
    }
  };

  // 2. RESUMEN EJECUTIVO
  const handleReporteResumenPdf = (modo: 'preview' | 'download') => {
    const payload = {
      negocio: obtenerNegocioPayload(),
      periodo,
      fechaGeneracion: new Date().toLocaleString('es-EC'),
      kpis,
      serieTemporal: reporteData?.serieTemporal || [],
      topModelos: reporteData?.topModelos || [],
      rankingVendedores: reporteData?.rankingVendedores || [],
    };

    const doc = generarReporteResumenEjecutivoPdf(payload);
    const nombre = `reporte_resumen_ejecutivo_${new Date().toISOString().split('T')[0]}.pdf`;

    if (modo === 'preview') {
      setPdfDocPreview(doc);
      setPreviewTitulo('Reporte de Resumen Ejecutivo & KPIs');
      setPreviewNombreArchivo(nombre);
      setPreviewModalOpen(true);
    } else {
      doc.save(nombre);
      showToast('Reporte de Resumen Ejecutivo descargado exitosamente.', 'success');
    }
  };

  // 3. ROTACIÓN DE CALZADO & MODELOS
  const handleReporteModelosPdf = (modo: 'preview' | 'download') => {
    const payload = {
      negocio: obtenerNegocioPayload(),
      periodo,
      fechaGeneracion: new Date().toLocaleString('es-EC'),
      topModelos: (reporteData?.topModelos as ModeloReporte[]) || [],
      bajaRotacion: reporteData?.bajaRotacion || [],
      totalParesVendidos: kpis.totalParesVendidos || 0,
      totalIngresosModelos: kpis.totalIngresos || 0,
    };

    const doc = generarReporteModelosRotacionPdf(payload);
    const nombre = `reporte_rotacion_calzado_${new Date().toISOString().split('T')[0]}.pdf`;

    if (modo === 'preview') {
      setPdfDocPreview(doc);
      setPreviewTitulo('Reporte de Rotación de Calzado & Modelos');
      setPreviewNombreArchivo(nombre);
      setPreviewModalOpen(true);
    } else {
      doc.save(nombre);
      showToast('Reporte de Rotación de Calzado descargado exitosamente.', 'success');
    }
  };

  // 4. PRODUCTIVIDAD POR TRABAJADOR
  const handleReporteProductividadPdf = (modo: 'preview' | 'download') => {
    const payload = {
      negocio: obtenerNegocioPayload(),
      periodo,
      fechaGeneracion: new Date().toLocaleString('es-EC'),
      totalIngresosSucursal: kpis.totalIngresos || 0,
      totalParesSucursal: kpis.totalParesVendidos || 0,
      vendedores: (reporteData?.rankingVendedores as VendedorReporte[]) || [],
    };

    const doc = generarReporteProductividadVendedoresPdf(payload);
    const nombre = `reporte_productividad_personal_${new Date().toISOString().split('T')[0]}.pdf`;

    if (modo === 'preview') {
      setPdfDocPreview(doc);
      setPreviewTitulo('Reporte de Productividad por Trabajador');
      setPreviewNombreArchivo(nombre);
      setPreviewModalOpen(true);
    } else {
      doc.save(nombre);
      showToast('Reporte de Productividad descargado exitosamente.', 'success');
    }
  };

  // 5. COBRANZAS & CLIENTES DEUDORES
  const handleReporteCobranzasPdf = (modo: 'preview' | 'download') => {
    if (!cobranzasData || !cobranzasData.clientes) {
      showToast('No hay datos de cobranzas disponibles para generar el PDF.', 'warning');
      return;
    }

    const payload = {
      negocio: obtenerNegocioPayload(),
      periodo,
      fechaGeneracion: new Date().toLocaleString('es-EC'),
      totalCartera: cobranzasData.totalCartera || 0,
      totalClientes: cobranzasData.totalClientes || 0,
      totalRecaudado: kpis.totalRecaudadoCobros || 0,
      clientes: cobranzasData.clientes as ClienteDeudor[],
    };

    const doc = generarReporteCobranzasPdf(payload);
    const nombre = `reporte_cobranzas_${new Date().toISOString().split('T')[0]}.pdf`;

    if (modo === 'preview') {
      setPdfDocPreview(doc);
      setPreviewTitulo('Reporte de Cobranzas — Clientes Deudores');
      setPreviewNombreArchivo(nombre);
      setPreviewModalOpen(true);
    } else {
      doc.save(nombre);
      showToast('Reporte de cobranzas descargado exitosamente.', 'success');
    }
  };

  // 6. CAMPAÑAS Y PROMOCIONES
  const handleReporteCampanasPdf = (modo: 'preview' | 'download') => {
    if (!campanasData || !campanasData.campanas) {
      showToast('No hay datos de campañas disponibles para generar el PDF.', 'warning');
      return;
    }

    const payload = {
      negocio: obtenerNegocioPayload(),
      periodo,
      fechaGeneracion: new Date().toLocaleString('es-EC'),
      campanas: campanasData.campanas as CampanaReporte[],
    };

    const doc = generarReporteCampanasPdf(payload);
    const nombre = `reporte_campanas_promociones_${new Date().toISOString().split('T')[0]}.pdf`;

    if (modo === 'preview') {
      setPdfDocPreview(doc);
      setPreviewTitulo('Reporte de Rendimiento de Campañas y Promociones');
      setPreviewNombreArchivo(nombre);
      setPreviewModalOpen(true);
    } else {
      doc.save(nombre);
      showToast('Reporte de campañas descargado exitosamente.', 'success');
    }
  };

  // 7. FINANZAS & MÉTODOS DE PAGO
  const handleReporteFinanzasPdf = (modo: 'preview' | 'download') => {
    const payload = {
      negocio: obtenerNegocioPayload(),
      periodo,
      fechaGeneracion: new Date().toLocaleString('es-EC'),
      totalRecaudadoCobros: kpis.totalRecaudadoCobros || 0,
      saldoCarteraTotal: kpis.saldoCarteraTotal || 0,
      totalIngresosVentas: kpis.totalIngresos || 0,
      distribucionMetodosAbono: reporteData?.distribucionMetodosAbono || {},
    };

    const doc = generarReporteFinanzasMetodosPdf(payload);
    const nombre = `reporte_finanzas_metodos_pago_${new Date().toISOString().split('T')[0]}.pdf`;

    if (modo === 'preview') {
      setPdfDocPreview(doc);
      setPreviewTitulo('Reporte de Finanzas & Métodos de Recaudación');
      setPreviewNombreArchivo(nombre);
      setPreviewModalOpen(true);
    } else {
      doc.save(nombre);
      showToast('Reporte de Finanzas descargado exitosamente.', 'success');
    }
  };

  // 8. PROYECCIÓN IA / MACHINE LEARNING
  const handleReporteProyeccionMlPdf = (modo: 'preview' | 'download') => {
    if (!proyeccionMl) {
      showToast('Por favor calcula la inferencia IA antes de previsualizar el reporte.', 'warning');
      return;
    }

    const payload = {
      negocio: obtenerNegocioPayload(),
      fechaGeneracion: new Date().toLocaleString('es-EC'),
      ml: proyeccionMl,
    };

    const doc = generarReporteProyeccionMlPdf(payload);
    const nombre = `reporte_proyeccion_ia_ml_${new Date().toISOString().split('T')[0]}.pdf`;

    if (modo === 'preview') {
      setPdfDocPreview(doc);
      setPreviewTitulo('Reporte de Pronóstico de Demanda Inteligente (Nexora ML)');
      setPreviewNombreArchivo(nombre);
      setPreviewModalOpen(true);
    } else {
      doc.save(nombre);
      showToast('Reporte de Proyección IA descargado exitosamente.', 'success');
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={cargarReporte}
            disabled={loading}
            className="px-3.5 py-2.5 bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={() => handleReporteGeneralIntegral('preview')}
            disabled={generandoGeneralPdf || loading}
            className="px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            title="Previsualizar el informe integral consolidado de toda la sucursal"
          >
            {generandoGeneralPdf ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            <span>Previsualizar Informe General</span>
          </button>

          <button
            type="button"
            onClick={() => handleReporteGeneralIntegral('download')}
            disabled={generandoGeneralPdf || loading}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            title="Descargar PDF consolidado con todas las áreas del negocio"
          >
            <Download size={14} />
            <span>Descargar Informe General</span>
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
          { id: 'cobranzas' as TabReporte, label: 'Cobranzas & Clientes Deudores', icon: <Receipt size={15} /> },
          { id: 'campanas' as TabReporte, label: 'Rendimiento de Campañas & Promos', icon: <Megaphone size={15} /> },
          { id: 'finanzas' as TabReporte, label: 'Finanzas & Métodos de Pago', icon: <DollarSign size={15} /> },
          { id: 'proyeccion_ml' as TabReporte, label: 'Proyección IA / Machine Learning', icon: <BrainCircuit size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setTabActiva(tab.id);
              if (tab.id === 'proyeccion_ml' && !proyeccionMl) {
                cargarProyeccionMl();
              } else if (tab.id === 'cobranzas' && !cobranzasData) {
                cargarCobranzas();
              } else if (tab.id === 'campanas' && !campanasData) {
                cargarCampanas();
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
              {/* Encabezado y Acciones de PDF para Resumen */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                    <BarChart3 size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)]">
                      Resumen Ejecutivo & Indicadores Clave (KPIs)
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Facturación total, volumen de calzado, margen bruto y comportamiento de ventas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleReporteResumenPdf('preview')}
                    disabled={loading || !reporteData}
                    className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Eye size={14} />
                    <span>Previsualizar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReporteResumenPdf('download')}
                    disabled={loading || !reporteData}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>
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
              {/* Encabezado y Acciones de PDF para Modelos */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
                    <ShoppingBag size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)]">
                      Reporte de Rotación de Calzado & Catálogo de Modelos
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Análisis de modelos estrella más demandados y alertas de calzado con baja rotación en bodega
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleReporteModelosPdf('preview')}
                    disabled={loading || !reporteData}
                    className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Eye size={14} />
                    <span>Previsualizar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReporteModelosPdf('download')}
                    disabled={loading || !reporteData}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>
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
            <div className="space-y-6">
              {/* Encabezado y Acciones de PDF para Productividad */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
                    <Users size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)]">
                      Reporte de Productividad por Trabajador
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Rendimiento individual, pedidos atendidos, pares comercializados y contribución al local
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleReporteProductividadPdf('preview')}
                    disabled={loading || !reporteData?.rankingVendedores?.length}
                    className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Eye size={14} />
                    <span>Previsualizar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReporteProductividadPdf('download')}
                    disabled={loading || !reporteData?.rankingVendedores?.length}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>

              {/* Componente de Filtro Avanzado para Trabajadores */}
              <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col md:flex-row items-center gap-3 shadow-xs">
                <div className="relative flex-1 w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
                  <input
                    type="text"
                    value={filtroTrabajadorTexto}
                    onChange={(e) => setFiltroTrabajadorTexto(e.target.value)}
                    placeholder="Buscar trabajador por nombre o correo electrónico..."
                    className="w-full pl-9 pr-3.5 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div className="w-full md:w-48">
                  <select
                    value={filtroTrabajadorRol}
                    onChange={(e) => setFiltroTrabajadorRol(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="TODOS">Todos los Roles</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="BODEGUERO">Bodeguero</option>
                    <option value="PRODUCCION">Producción</option>
                  </select>
                </div>

                <div className="w-full md:w-56">
                  <select
                    value={filtroTrabajadorOrden}
                    onChange={(e) => setFiltroTrabajadorOrden(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="VENTAS_DESC">Mayor Facturación ($)</option>
                    <option value="PARES_DESC">Más Pares Vendidos</option>
                    <option value="PEDIDOS_DESC">Más Pedidos Atendidos</option>
                    <option value="VENTAS_ASC">Menor Facturación ($)</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Ranking y Productividad */}
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
                      {(() => {
                        const listaTrabajadores: any[] = (reporteData?.rankingVendedores || []).filter((v: any) => {
                          const matchTexto =
                            !filtroTrabajadorTexto ||
                            v.nombre?.toLowerCase().includes(filtroTrabajadorTexto.toLowerCase()) ||
                            v.email?.toLowerCase().includes(filtroTrabajadorTexto.toLowerCase());
                          const matchRol =
                            filtroTrabajadorRol === 'TODOS' ||
                            v.rol === filtroTrabajadorRol ||
                            v.rol === `ROL_${filtroTrabajadorRol}`;
                          return matchTexto && matchRol;
                        }).sort((a: any, b: any) => {
                          if (filtroTrabajadorOrden === 'VENTAS_DESC') return (b.ingresosFacturados || 0) - (a.ingresosFacturados || 0);
                          if (filtroTrabajadorOrden === 'PARES_DESC') return (b.paresVendidos || 0) - (a.paresVendidos || 0);
                          if (filtroTrabajadorOrden === 'PEDIDOS_DESC') return (b.pedidosCount || 0) - (a.pedidosCount || 0);
                          if (filtroTrabajadorOrden === 'VENTAS_ASC') return (a.ingresosFacturados || 0) - (b.ingresosFacturados || 0);
                          return 0;
                        });

                        if (listaTrabajadores.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                                No se encontraron colaboradores que coincidan con los filtros de búsqueda.
                              </td>
                            </tr>
                          );
                        }

                        return listaTrabajadores.map((v: any, index: number) => {
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
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB: REPORTE DE COBRANZAS — CLIENTES QUE DEBEN                */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tabActiva === 'cobranzas' && (
            <div className="space-y-6">
              {/* Encabezado y Acciones de PDF */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/10 text-red-600 rounded-2xl">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)]">
                      Reporte de Cobranzas — Clientes Deudores
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Detalle nominal de clientes con saldo pendiente, notas de entrega a crédito y antigüedad de deuda
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={cargarCobranzas}
                    disabled={loadingCobranzas}
                    className="px-3.5 py-2 bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw size={13} className={loadingCobranzas ? 'animate-spin' : ''} />
                    <span>Actualizar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReporteCobranzasPdf('preview')}
                    disabled={loadingCobranzas || !cobranzasData?.clientes?.length}
                    className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Eye size={14} />
                    <span>Previsualizar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReporteCobranzasPdf('download')}
                    disabled={loadingCobranzas || !cobranzasData?.clientes?.length}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>

              {/* KPIs de Cobranzas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-2 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)]">Cartera Pendiente Total</span>
                  <div className="text-2xl font-black text-red-600">
                    ${(cobranzasData?.totalCartera || 0).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Monto total por recaudar en el negocio</p>
                </div>

                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-2 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)]">Clientes con Deuda</span>
                  <div className="text-2xl font-black text-[var(--foreground)]">
                    {cobranzasData?.totalClientes || 0}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Clientes con notas o créditos pendientes</p>
                </div>

                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-2 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)]">Deuda Promedio / Cliente</span>
                  <div className="text-2xl font-black text-amber-600">
                    ${cobranzasData?.totalClientes > 0 ? ((cobranzasData.totalCartera || 0) / cobranzasData.totalClientes).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Promedio adeudado por comprador activo</p>
                </div>

                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-2 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)]">Recaudado en Periodo</span>
                  <div className="text-2xl font-black text-emerald-600">
                    ${kpis.totalRecaudadoCobros.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Abonos y pagos ingresados efectivamente</p>
                </div>
              </div>

              {/* Filtros de búsqueda de deudores */}
              <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row items-center gap-3 shadow-xs">
                <div className="relative flex-1 w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
                  <input
                    type="text"
                    value={filtroDeudor}
                    onChange={(e) => setFiltroDeudor(e.target.value)}
                    placeholder="Buscar por nombre, cédula o teléfono..."
                    className="w-full pl-9 pr-3.5 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div className="w-full sm:w-56">
                  <select
                    value={filtroScoreDeudor}
                    onChange={(e) => setFiltroScoreDeudor(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="TODOS">Todos los Niveles Crediticios</option>
                    <option value="EXCELENTE">Nivel Excelente</option>
                    <option value="BUENO">Nivel Bueno</option>
                    <option value="REGULAR">Nivel Regular</option>
                    <option value="RIESGO">Nivel Riesgo</option>
                    <option value="CRITICO">Nivel Crítico</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Clientes Deudores */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-xs">
                {loadingCobranzas ? (
                  <div className="p-14 text-center text-xs text-[var(--muted-foreground)] flex flex-col items-center justify-center gap-2">
                    <Loader2 size={30} className="animate-spin text-red-600" />
                    <span>Cargando estado de cartera y notas pendientes...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--muted)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                        <tr>
                          <th className="px-4 py-3">Cliente / Identificación</th>
                          <th className="px-4 py-3 text-center">Nivel / Score</th>
                          <th className="px-4 py-3 text-center">Notas Pendientes</th>
                          <th className="px-4 py-3 text-right">Saldo Deudor Total</th>
                          <th className="px-4 py-3 text-center">Último Abono</th>
                          <th className="px-4 py-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {(() => {
                          const clientesFiltrados = (cobranzasData?.clientes || []).filter((c: ClienteDeudor) => {
                            const matchTexto =
                              !filtroDeudor ||
                              c.nombre?.toLowerCase().includes(filtroDeudor.toLowerCase()) ||
                              c.cedula?.includes(filtroDeudor) ||
                              c.telefono?.includes(filtroDeudor);
                            const matchNivel =
                              filtroScoreDeudor === 'TODOS' ||
                              c.nivelCredito?.toUpperCase() === filtroScoreDeudor;
                            return matchTexto && matchNivel;
                          });

                          if (clientesFiltrados.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="p-10 text-center text-xs text-[var(--muted-foreground)]">
                                  No se encontraron clientes deudores con los criterios seleccionados.
                                </td>
                              </tr>
                            );
                          }

                          return clientesFiltrados.map((c: ClienteDeudor) => {
                            const expandido = clienteExpandidoId === c.clienteId;
                            return (
                              <React.Fragment key={c.clienteId}>
                                <tr className="hover:bg-[var(--muted)]/20 transition-colors">
                                  <td className="px-4 py-3.5">
                                    <div className="font-extrabold text-[var(--foreground)] text-xs">
                                      {c.nombre}
                                    </div>
                                    <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-2 mt-0.5">
                                      <span>C.I./RUC: {c.cedula}</span>
                                      {c.telefono && <span>• Tel: {c.telefono}</span>}
                                    </div>
                                  </td>

                                  <td className="px-4 py-3.5 text-center">
                                    <div className="inline-flex flex-col items-center">
                                      <span className="px-2 py-0.5 bg-[#0F172A]/10 text-[#0F172A] rounded-md font-extrabold text-[10px] uppercase">
                                        {c.nivelCredito || 'REGULAR'}
                                      </span>
                                      <span className="text-[10px] text-[var(--muted-foreground)] font-semibold mt-0.5">
                                        Score: {c.scoreCrediticio ?? 50}/100
                                      </span>
                                    </div>
                                  </td>

                                  <td className="px-4 py-3.5 text-center">
                                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-extrabold text-xs rounded-lg">
                                      {c.notasPendientes} {c.notasPendientes === 1 ? 'nota' : 'notas'}
                                    </span>
                                  </td>

                                  <td className="px-4 py-3.5 text-right font-black text-sm text-red-600">
                                    ${c.totalDeuda.toFixed(2)}
                                  </td>

                                  <td className="px-4 py-3.5 text-center">
                                    {c.ultimoAbono ? (
                                      <div>
                                        <span className="font-bold text-[var(--foreground)] text-[11px]">
                                          ${(c.ultimoAbonoMonto || 0).toFixed(2)}
                                        </span>
                                        <div className="text-[10px] text-[var(--muted-foreground)]">
                                          {c.ultimoAbono}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-[var(--muted-foreground)] italic">Sin abonos</span>
                                    )}
                                  </td>

                                  <td className="px-4 py-3.5 text-center">
                                    {c.detalleNotas && c.detalleNotas.length > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => setClienteExpandidoId(expandido ? null : c.clienteId)}
                                        className="px-2.5 py-1 bg-[var(--muted)]/50 hover:bg-[var(--muted)] text-[var(--foreground)] text-[11px] font-bold rounded-lg border border-[var(--border)] transition-all cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <span>{expandido ? 'Ocultar' : 'Ver Notas'}</span>
                                        <ChevronDown size={12} className={`transition-transform ${expandido ? 'rotate-180' : ''}`} />
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-[var(--muted-foreground)]">—</span>
                                    )}
                                  </td>
                                </tr>

                                {/* Desglose expandido de notas */}
                                {expandido && c.detalleNotas && (
                                  <tr className="bg-[var(--muted)]/10">
                                    <td colSpan={6} className="px-6 py-3 border-y border-[var(--border)]">
                                      <div className="text-[11px] font-bold uppercase text-[var(--muted-foreground)] mb-2">
                                        Desglose de Comprobantes Pendientes:
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        {c.detalleNotas.map((n, i) => (
                                          <div key={i} className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl flex items-center justify-between text-xs shadow-2xs">
                                            <div>
                                              <span className="font-extrabold text-[var(--foreground)] block">
                                                {n.numero}
                                              </span>
                                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                                Fecha: {n.fecha}
                                              </span>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-[10px] text-[var(--muted-foreground)] block">
                                                Total: ${n.montoTotal.toFixed(2)}
                                              </span>
                                              <span className="font-extrabold text-red-600">
                                                Saldo: ${n.saldoPendiente.toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB: REPORTE DE CAMPAÑAS Y PROMOCIONES                        */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tabActiva === 'campanas' && (
            <div className="space-y-6">
              {/* Encabezado y Acciones de PDF */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
                    <Megaphone size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)]">
                      Reporte de Campañas & Promociones
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Métricas de efectividad, cupones canjeados, volumen de calzado comercializado y ROI
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={cargarCampanas}
                    disabled={loadingCampanas}
                    className="px-3.5 py-2 bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw size={13} className={loadingCampanas ? 'animate-spin' : ''} />
                    <span>Actualizar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReporteCampanasPdf('preview')}
                    disabled={loadingCampanas || !campanasData?.campanas?.length}
                    className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Eye size={14} />
                    <span>Previsualizar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReporteCampanasPdf('download')}
                    disabled={loadingCampanas || !campanasData?.campanas?.length}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>

              {/* KPIs de Campañas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-2 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)]">Total Campañas Registradas</span>
                  <div className="text-2xl font-black text-[var(--foreground)]">
                    {campanasData?.totalCampanas || 0}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Estrategias promocionales creadas</p>
                </div>

                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-2 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)]">Campañas Activas</span>
                  <div className="text-2xl font-black text-purple-600">
                    {campanasData?.campanasActivas || 0}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Vigentes para canje en venta y POS</p>
                </div>

                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-2 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)]">Total Canjes Usados</span>
                  <div className="text-2xl font-black text-indigo-600">
                    {campanasData?.totalCanjes || 0}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Cupones y promociones redimidos</p>
                </div>

                <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-2 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)]">Ingresos Brutos Asociados</span>
                  <div className="text-2xl font-black text-emerald-600">
                    ${(campanasData?.montoGeneradoTotal || 0).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Facturación generada con campañas</p>
                </div>
              </div>

              {/* Filtros de campañas */}
              <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row items-center gap-3 shadow-xs">
                <div className="relative flex-1 w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
                  <input
                    type="text"
                    value={busquedaCampana}
                    onChange={(e) => setBusquedaCampana(e.target.value)}
                    placeholder="Buscar por código promocional o título..."
                    className="w-full pl-9 pr-3.5 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <select
                    value={filtroCampanaEstado}
                    onChange={(e) => setFiltroCampanaEstado(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="TODAS">Todos los Estados</option>
                    <option value="ACTIVAS">Solo Activas</option>
                    <option value="INACTIVAS">Solo Finalizadas / Inactivas</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Rendimiento de Campañas */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-xs">
                {loadingCampanas ? (
                  <div className="p-14 text-center text-xs text-[var(--muted-foreground)] flex flex-col items-center justify-center gap-2">
                    <Loader2 size={30} className="animate-spin text-purple-600" />
                    <span>Analizando métricas de campañas y canjes...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--muted)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                        <tr>
                          <th className="px-4 py-3">Campaña / Código</th>
                          <th className="px-4 py-3 text-center">Tipo de Descuento</th>
                          <th className="px-4 py-3 text-center">Canjes / Límite</th>
                          <th className="px-4 py-3 text-center">Efectividad</th>
                          <th className="px-4 py-3 text-right">Venta Generada</th>
                          <th className="px-4 py-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {(() => {
                          const campanasFiltradas = (campanasData?.campanas || []).filter((c: CampanaReporte) => {
                            const matchTexto =
                              !busquedaCampana ||
                              c.titulo?.toLowerCase().includes(busquedaCampana.toLowerCase()) ||
                              c.codigo?.toLowerCase().includes(busquedaCampana.toLowerCase());
                            const matchEstado =
                              filtroCampanaEstado === 'TODAS' ||
                              (filtroCampanaEstado === 'ACTIVAS' && c.activo) ||
                              (filtroCampanaEstado === 'INACTIVAS' && !c.activo);
                            return matchTexto && matchEstado;
                          });

                          if (campanasFiltradas.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="p-10 text-center text-xs text-[var(--muted-foreground)]">
                                  No se encontraron campañas promocionales con los filtros seleccionados.
                                </td>
                              </tr>
                            );
                          }

                          return campanasFiltradas.map((c: CampanaReporte) => {
                            const usoPct = c.maximoCanjes > 0 ? (c.canjesUsados / c.maximoCanjes) * 100 : 0;
                            const funciono = c.canjesUsados > 0;
                            return (
                              <tr key={c.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                                <td className="px-4 py-3.5">
                                  <div className="font-extrabold text-[var(--foreground)] text-xs">
                                    {c.titulo}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded font-mono font-bold text-[10px]">
                                      {c.codigo}
                                    </span>
                                    <span className="text-[10px] text-[var(--muted-foreground)]">
                                      Desde {new Date(c.fechaInicio).toLocaleDateString('es-EC')}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-4 py-3.5 text-center">
                                  <span className="font-bold text-[var(--foreground)] text-[11px]">
                                    {c.tipoDescuento === 'PORCENTAJE' && `${c.valorDescuento}% de descuento`}
                                    {c.tipoDescuento === 'MONTO_FIJO' && `$${c.valorDescuento.toFixed(2)} fijos`}
                                    {c.tipoDescuento === 'DESCUENTO_POR_PAR' && `$${c.valorDescuento.toFixed(2)} por par`}
                                  </span>
                                </td>

                                <td className="px-4 py-3.5 text-center">
                                  <div className="space-y-1">
                                    <div className="font-bold text-xs">
                                      {c.canjesUsados} / {c.maximoCanjes > 0 ? c.maximoCanjes : '∞'}
                                    </div>
                                    {c.maximoCanjes > 0 && (
                                      <div className="w-20 mx-auto bg-[var(--muted)] h-1.5 rounded-full overflow-hidden">
                                        <div
                                          style={{ width: `${Math.min(usoPct, 100)}%` }}
                                          className={`h-full rounded-full ${usoPct >= 80 ? 'bg-emerald-500' : 'bg-purple-600'}`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="px-4 py-3.5 text-center">
                                  {funciono ? (
                                    <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                                      usoPct >= 50
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                    }`}>
                                      {usoPct >= 50 ? '🔥 Alta Efectividad' : '⚡ Desempeño Positivo'}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-slate-500/15 text-slate-600 dark:text-slate-400 rounded-md font-bold text-[10px]">
                                      ⚪ Sin Canjes
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3.5 text-right">
                                  <div className="font-black text-sm text-emerald-600">
                                    ${(c.montoTotalGenerado || 0).toFixed(2)}
                                  </div>
                                  <div className="text-[10px] text-[var(--muted-foreground)]">
                                    {c.paresVendidos || 0} pares comercializados
                                  </div>
                                </td>

                                <td className="px-4 py-3.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                                    c.activo
                                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                      : 'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                                  }`}>
                                    {c.activo ? 'ACTIVA' : 'FINALIZADA'}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 4: FINANZAS & MÉTODOS DE PAGO                              */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {tabActiva === 'finanzas' && (
            <div className="space-y-6">
              {/* Encabezado y Acciones de PDF para Finanzas */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                    <DollarSign size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)]">
                      Reporte Financiero & Canales de Recaudación
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Desglose de liquidez por método de abono, efectivo, transferencias bancarias y cartera pendiente
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleReporteFinanzasPdf('preview')}
                    disabled={loading || !reporteData}
                    className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Eye size={14} />
                    <span>Previsualizar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReporteFinanzasPdf('download')}
                    disabled={loading || !reporteData}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>
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

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={cargarProyeccionMl}
                    disabled={loadingMl}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={14} className={loadingMl ? 'animate-spin' : ''} />
                    <span>{loadingMl ? 'Calculando...' : 'Recalcular Proyección'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReporteProyeccionMlPdf('preview')}
                    disabled={loadingMl || !proyeccionMl}
                    className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Eye size={14} />
                    <span>Previsualizar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReporteProyeccionMlPdf('download')}
                    disabled={loadingMl || !proyeccionMl}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>Descargar PDF</span>
                  </button>
                </div>
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

      {/* Modal Universal de Previsualización de PDF */}
      <PdfPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        pdfDoc={pdfDocPreview}
        titulo={previewTitulo}
        nombreArchivo={previewNombreArchivo}
      />
    </div>
  );
}
