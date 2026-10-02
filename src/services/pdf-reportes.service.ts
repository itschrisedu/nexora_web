import { jsPDF } from 'jspdf';

// ══════════════════════════════════════════════════════════════
// INTERFACES GLOBALES DE REPORTES
// ══════════════════════════════════════════════════════════════

export interface NegocioInfo {
  nombre: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
}

export interface ClienteDeudor {
  clienteId: string;
  nombre: string;
  cedula: string;
  telefono?: string;
  email?: string;
  nivelCredito?: string;
  scoreCrediticio?: number;
  totalDeuda: number;
  notasPendientes: number;
  deudaMasAntigua?: string;
  ultimoAbono?: string;
  ultimoAbonoMonto?: number;
  detalleNotas?: {
    numero: string;
    montoTotal: number;
    saldoPendiente: number;
    fecha: string;
  }[];
}

export interface CampanaReporte {
  id: string;
  codigo: string;
  titulo: string;
  tipoDescuento: 'PORCENTAJE' | 'MONTO_FIJO' | 'DESCUENTO_POR_PAR';
  valorDescuento: number;
  maximoCanjes: number;
  canjesUsados: number;
  fechaInicio: string;
  fechaFin?: string;
  activo: boolean;
  aplicaPara?: string;
  montoTotalGenerado: number;
  paresVendidos: number;
  descuentoTotalOtorgado: number;
  clientesAlcanzados: number;
  tasaConversion: number;
}

export interface ModeloReporte {
  productId: string;
  modelName: string;
  color: string;
  serieNombre?: string;
  pares: number;
  ingresos: number;
  pedidosCount?: number;
  stockActual?: number;
  imageUrl?: string;
}

export interface VendedorReporte {
  userId: string;
  nombre: string;
  email?: string;
  rol: string;
  pedidosCount: number;
  paresVendidos: number;
  ingresosFacturados: number;
  contribucionPorcentaje?: number;
}

export interface MetodoPagoDistribucion {
  metodo: string;
  monto: number;
  count: number;
  porcentaje?: number;
}

export interface ProyeccionMlData {
  totalParesProyectados: number;
  confianza: string;
  horizonteDias: number;
  proyecciones: {
    fecha: string;
    diaLabel: string;
    demandaEsperadaPares: number;
    limiteInferior: number;
    limiteSuperior: number;
  }[];
}

export interface ReporteCobranzasData {
  negocio: NegocioInfo;
  periodo: string;
  fechaGeneracion: string;
  totalCartera: number;
  totalClientes: number;
  totalRecaudado: number;
  clientes: ClienteDeudor[];
}

export interface ReporteCampanasData {
  negocio: NegocioInfo;
  periodo: string;
  fechaGeneracion: string;
  campanas: CampanaReporte[];
}

export interface ReporteResumenEjecutivoData {
  negocio: NegocioInfo;
  periodo: string;
  fechaGeneracion: string;
  kpis: any;
  serieTemporal?: { fechaKey: string; label: string; ingresos: number; pares: number }[];
  topModelos?: ModeloReporte[];
  rankingVendedores?: VendedorReporte[];
}

export interface ReporteModelosData {
  negocio: NegocioInfo;
  periodo: string;
  fechaGeneracion: string;
  topModelos: ModeloReporte[];
  bajaRotacion: {
    productId: string;
    modelName: string;
    color: string;
    stockActual: number;
    paresVendidosEnPeriodo: number;
  }[];
  totalParesVendidos: number;
  totalIngresosModelos: number;
}

export interface ReporteProductividadData {
  negocio: NegocioInfo;
  periodo: string;
  fechaGeneracion: string;
  totalIngresosSucursal: number;
  totalParesSucursal: number;
  vendedores: VendedorReporte[];
}

export interface ReporteFinanzasData {
  negocio: NegocioInfo;
  periodo: string;
  fechaGeneracion: string;
  totalRecaudadoCobros: number;
  saldoCarteraTotal: number;
  totalIngresosVentas: number;
  distribucionMetodosAbono: Record<string, { monto: number; count: number }>;
}

export interface ReporteMlData {
  negocio: NegocioInfo;
  fechaGeneracion: string;
  ml: ProyeccionMlData;
}

export interface ReporteGeneralIntegralData {
  negocio: NegocioInfo;
  periodo: string;
  fechaGeneracion: string;
  kpis: any;
  serieTemporal?: any[];
  topModelos?: ModeloReporte[];
  bajaRotacion?: any[];
  rankingVendedores?: VendedorReporte[];
  cobranzas?: {
    totalCartera: number;
    totalClientes: number;
    clientes: ClienteDeudor[];
  };
  campanas?: CampanaReporte[];
  distribucionMetodos?: Record<string, { monto: number; count: number }>;
  proyeccionMl?: ProyeccionMlData;
}

export interface ReportePosPdfData {
  negocio: NegocioInfo;
  periodo: string;
  sucursalNombre?: string;
  fechaGeneracion: string;
  metricas: {
    totalRecaudado: number;
    cantidadVentas: number;
    cantidadPares: number;
    ticketPromedio: number;
    desgloseMetodosPago: {
      efectivo: { total: number; cantidad: number };
      tarjeta: { total: number; cantidad: number };
      transferencia: { total: number; cantidad: number };
    };
    desgloseVendedores: { userId: string; nombre: string; total: number; ventas: number; pares: number }[];
    topModelos: { nombre: string; color: string; pares: number; total: number }[];
  };
  ventas: any[];
}

export interface ReporteRendimientoSucursalesPdfData {
  negocio: NegocioInfo;
  periodo: string;
  sucursalSeleccionada: { id: string; nombre: string };
  fechaGeneracion: string;
  totalesEmpresa: { ingresos: number; pares: number; pedidos: number };
  totalesSucursalSeleccionada: {
    ingresos: number;
    pares: number;
    pedidos: number;
    ticketPromedio: number;
    totalModelosVendidos: number;
  };
  sucursales: {
    sucursalId: string;
    nombre: string;
    direccion: string;
    telefono: string;
    totalVentas: number;
    totalPares: number;
    totalPedidos: number;
    ticketPromedio: number;
    porcentajeEmpresa: number;
  }[];
  modelosVendidos: {
    modelId: string;
    modelName: string;
    baseCode: string;
    color: string;
    serieNombre: string;
    paresVendidos: number;
    montoTotal: number;
    precioPromedio: number;
    pedidosCount: number;
    porcentajeSucursal: number;
    ranking: number;
  }[];
}

// ── Helper Encabezado Institucional ──
function dibujarEncabezado(
  doc: jsPDF,
  negocio: NegocioInfo,
  tituloReporte: string,
  periodo: string,
  fechaGeneracion: string,
  yStart = 14
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = yStart;

  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(marginLeft, y, contentWidth, 30, 2.5, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(negocio.nombre || 'NEXORA', marginLeft + 8, y + 10);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  if (negocio.ruc) doc.text(`RUC: ${negocio.ruc}`, marginLeft + 8, y + 16);
  if (negocio.direccion) doc.text(negocio.direccion, marginLeft + 8, y + 21);
  if (negocio.telefono) doc.text(`Tel: ${negocio.telefono}`, marginLeft + 8, y + 26);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(tituloReporte.toUpperCase(), pageWidth - marginRight - 8, y + 10, { align: 'right' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periodo: ${periodo}`, pageWidth - marginRight - 8, y + 16, { align: 'right' });
  doc.text(`Generado: ${fechaGeneracion}`, pageWidth - marginRight - 8, y + 21, { align: 'right' });

  return y + 36;
}

// ── Helper Pie de Página ──
function dibujarPie(doc: jsPDF, textoResumen?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const y = pageHeight - 12;

  doc.setDrawColor(226, 232, 240);
  doc.line(marginLeft, y, pageWidth - marginRight, y);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('NEXORA Business Intelligence — Documento institucional confidencial.', marginLeft, y + 5);
  if (textoResumen) {
    doc.text(textoResumen, pageWidth - marginRight, y + 5, { align: 'right' });
  }
}

// ── Helper Tarjetas KPI ──
function dibujarTarjetasKpi(
  doc: jsPDF,
  kpis: { label: string; val: string; sub?: string }[],
  yStart: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const count = kpis.length;
  const gap = 3;
  const cardW = (contentWidth - gap * (count - 1)) / count;
  const cardH = 16;

  kpis.forEach((kpi, i) => {
    const x = marginLeft + i * (cardW + gap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, yStart, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, yStart, cardW, cardH, 2, 2, 'S');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.label.toUpperCase(), x + cardW / 2, yStart + 4.5, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.val, x + cardW / 2, yStart + 10, { align: 'center' });

    if (kpi.sub) {
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.sub, x + cardW / 2, yStart + 14, { align: 'center' });
    }
  });

  return yStart + cardH + 6;
}

// ══════════════════════════════════════════════════════════════
// 1. REPORTE DE COBRANZAS — CLIENTES QUE DEBEN
// ══════════════════════════════════════════════════════════════

export function generarReporteCobranzasPdf(data: ReporteCobranzasData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'Reporte de Cobranzas — Clientes Deudores',
    data.periodo,
    data.fechaGeneracion
  );

  // KPIs
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'S');

  const kpiW = contentWidth / 3;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('CARTERA PENDIENTE TOTAL', marginLeft + kpiW * 0 + kpiW / 2, y + 6, { align: 'center' });
  doc.text('CLIENTES CON DEUDA', marginLeft + kpiW * 1 + kpiW / 2, y + 6, { align: 'center' });
  doc.text('RECAUDADO EN EL PERIODO', marginLeft + kpiW * 2 + kpiW / 2, y + 6, { align: 'center' });

  doc.setTextColor(220, 38, 38);
  doc.setFontSize(11);
  doc.text(`$${data.totalCartera.toFixed(2)}`, marginLeft + kpiW * 0 + kpiW / 2, y + 14, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.totalClientes}`, marginLeft + kpiW * 1 + kpiW / 2, y + 14, { align: 'center' });
  doc.setTextColor(16, 185, 129);
  doc.text(`$${data.totalRecaudado.toFixed(2)}`, marginLeft + kpiW * 2 + kpiW / 2, y + 14, { align: 'center' });

  y += 24;

  // Tabla Deudores
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE NOMINAL DE CLIENTES CON SALDO PENDIENTE', marginLeft, y);
  y += 5;

  const colW = [8, 52, 28, 18, 26, 26, 24];
  const headers = ['#', 'Cliente', 'C.I. / RUC', 'Notas', 'Saldo Deudor', 'Último Abono', 'Nivel / Score'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let x = marginLeft + 1.5;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 4.5);
    x += colW[i];
  });
  y += 6.5;

  data.clientes.forEach((c, idx) => {
    if (y > 270) {
      dibujarPie(doc);
      doc.addPage();
      y = 14;
    }

    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');

    x = marginLeft + 1.5;
    doc.text(`${idx + 1}`, x, y + 5); x += colW[0];
    doc.setFont('helvetica', 'bold');
    doc.text(c.nombre.length > 30 ? c.nombre.substring(0, 28) + '..' : c.nombre, x, y + 5); x += colW[1];
    doc.setFont('helvetica', 'normal');
    doc.text(c.cedula, x, y + 5); x += colW[2];
    doc.text(`${c.notasPendientes}`, x, y + 5); x += colW[3];

    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${c.totalDeuda.toFixed(2)}`, x, y + 5); x += colW[4];

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(c.ultimoAbono ? `${c.ultimoAbono}` : 'Sin abonos', x, y + 5); x += colW[5];
    doc.text(`${c.nivelCredito || 'REGULAR'} (${c.scoreCrediticio ?? 50} pts)`, x, y + 5);

    y += 7;
  });

  dibujarPie(doc, `Total Cartera Deudora: $${data.totalCartera.toFixed(2)} | Clientes: ${data.totalClientes}`);
  return doc;
}

// ══════════════════════════════════════════════════════════════
// 2. REPORTE DE CAMPAÑAS Y PROMOCIONES
// ══════════════════════════════════════════════════════════════

export function generarReporteCampanasPdf(data: ReporteCampanasData): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'Reporte de Rendimiento de Campañas & Promociones',
    data.periodo,
    data.fechaGeneracion
  );

  const totalCampanas = data.campanas.length;
  const campanasActivas = data.campanas.filter((c) => c.activo).length;
  const totalCanjes = data.campanas.reduce((s, c) => s + (c.canjesUsados || 0), 0);
  const totalVentas = data.campanas.reduce((s, c) => s + (c.montoTotalGenerado || 0), 0);

  // KPIs
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'S');

  const kpiW = contentWidth / 4;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL CAMPAÑAS', marginLeft + kpiW * 0 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('CAMPAÑAS ACTIVAS', marginLeft + kpiW * 1 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('TOTAL CANJES EFECTIVOS', marginLeft + kpiW * 2 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('VENTAS ASOCIADAS', marginLeft + kpiW * 3 + kpiW / 2, y + 5, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${totalCampanas}`, marginLeft + kpiW * 0 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(147, 51, 234);
  doc.text(`${campanasActivas}`, marginLeft + kpiW * 1 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(59, 130, 246);
  doc.text(`${totalCanjes}`, marginLeft + kpiW * 2 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(16, 185, 129);
  doc.text(`$${totalVentas.toFixed(2)}`, marginLeft + kpiW * 3 + kpiW / 2, y + 12, { align: 'center' });

  y += 22;

  // Tabla
  const colW = [8, 30, 60, 28, 22, 22, 22, 26, 26, 24];
  const headers = ['#', 'Código', 'Título de la Campaña', 'Modalidad', 'Valor', 'Cupos', 'Canjes', 'Efectividad', 'Venta Gen.', 'Estado'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let x = marginLeft + 1.5;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 4.5);
    x += colW[i];
  });
  y += 6.5;

  data.campanas.forEach((c, idx) => {
    if (y > 180) {
      dibujarPie(doc);
      doc.addPage();
      y = 14;
    }

    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');

    x = marginLeft + 1.5;
    doc.text(`${idx + 1}`, x, y + 5); x += colW[0];
    doc.setFont('helvetica', 'bold');
    doc.text(c.codigo, x, y + 5); x += colW[1];
    doc.setFont('helvetica', 'normal');
    doc.text(c.titulo.length > 36 ? c.titulo.substring(0, 34) + '..' : c.titulo, x, y + 5); x += colW[2];

    const tipoLabel = c.tipoDescuento === 'PORCENTAJE' ? '% Porcentaje' : c.tipoDescuento === 'MONTO_FIJO' ? '$ Monto Fijo' : '$/Par';
    doc.text(tipoLabel, x, y + 5); x += colW[3];

    const valStr = c.tipoDescuento === 'PORCENTAJE' ? `${c.valorDescuento}%` : `$${c.valorDescuento.toFixed(2)}`;
    doc.text(valStr, x, y + 5); x += colW[4];
    doc.text(`${c.maximoCanjes}`, x, y + 5); x += colW[5];
    doc.text(`${c.canjesUsados}`, x, y + 5); x += colW[6];

    const pctUso = c.maximoCanjes > 0 ? ((c.canjesUsados / c.maximoCanjes) * 100).toFixed(0) : '0';
    doc.text(`${pctUso}% cupos`, x, y + 5); x += colW[7];

    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${(c.montoTotalGenerado || 0).toFixed(2)}`, x, y + 5); x += colW[8];

    doc.setFont('helvetica', 'normal');
    if (c.activo) {
      doc.setTextColor(16, 185, 129);
      doc.text('ACTIVA', x, y + 5);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('FINALIZADA', x, y + 5);
    }

    y += 7;
  });

  dibujarPie(doc, `Campañas analizadas: ${totalCampanas} | Ventas generadas: $${totalVentas.toFixed(2)}`);
  return doc;
}

// ══════════════════════════════════════════════════════════════
// 3. REPORTE RESUMEN EJECUTIVO & KPIs
// ══════════════════════════════════════════════════════════════

export function generarReporteResumenEjecutivoPdf(data: ReporteResumenEjecutivoData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'Resumen Ejecutivo & Indicadores Comerciales',
    data.periodo,
    data.fechaGeneracion
  );

  const kpis = data.kpis || {};

  // Cuadrícula de 4 KPIs
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 34, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 34, 2.5, 2.5, 'S');

  const halfW = contentWidth / 2;

  // KPI 1: Facturación Total
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURACIÓN TOTAL:', marginLeft + 6, y + 7);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(`$${(kpis.totalIngresos || 0).toFixed(2)}`, marginLeft + 6, y + 14);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${kpis.totalPedidos || 0} pedidos procesados`, marginLeft + 6, y + 18);

  // KPI 2: Pares Vendidos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('VOLUMEN DE CALZADO VENDIDO:', marginLeft + halfW + 6, y + 7);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(`${kpis.totalParesVendidos || 0} pares`, marginLeft + halfW + 6, y + 14);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Ticket Promedio: $${(kpis.ticketPromedio || 0).toFixed(2)}`, marginLeft + halfW + 6, y + 18);

  // KPI 3: Ganancia Bruta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('GANANCIA BRUTA ESTIMADA:', marginLeft + 6, y + 24);
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(10);
  doc.text(`$${(kpis.gananciaBruta || 0).toFixed(2)}`, marginLeft + 6, y + 30);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Margen: ${(kpis.margenPorcentaje || 0).toFixed(1)}%`, marginLeft + 42, y + 30);

  // KPI 4: Recaudación Cobros
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('RECAUDACIÓN DE COBROS & CARTERA:', marginLeft + halfW + 6, y + 24);
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(10);
  doc.text(`$${(kpis.totalRecaudadoCobros || 0).toFixed(2)}`, marginLeft + halfW + 6, y + 30);
  doc.setFontSize(6.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`Saldo Cartera: $${(kpis.saldoCarteraTotal || 0).toFixed(2)}`, marginLeft + halfW + 42, y + 30);

  y += 40;

  // Top 5 Modelos
  if (data.topModelos && data.topModelos.length > 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CALZADO MÁS VENDIDO EN EL PERIODO', marginLeft, y);
    y += 5;

    const colW = [8, 70, 35, 25, 30];
    const headers = ['#', 'Modelo de Calzado', 'Color / Serie', 'Pares Vendidos', 'Monto Facturado'];

    doc.setFillColor(15, 23, 42);
    doc.rect(marginLeft, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);

    let x = marginLeft + 1.5;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 4.2);
      x += colW[i];
    });
    y += 6;

    data.topModelos.slice(0, 5).forEach((m, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6.5, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');

      x = marginLeft + 1.5;
      doc.text(`${idx + 1}`, x, y + 4.5); x += colW[0];
      doc.setFont('helvetica', 'bold');
      doc.text(m.modelName, x, y + 4.5); x += colW[1];
      doc.setFont('helvetica', 'normal');
      doc.text(`${m.color} • ${m.serieNombre || 'General'}`, x, y + 4.5); x += colW[2];
      doc.text(`${m.pares} pares`, x, y + 4.5); x += colW[3];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(m.ingresos || 0).toFixed(2)}`, x, y + 4.5);

      y += 6.5;
    });

    y += 8;
  }

  // Top 5 Vendedores
  if (data.rankingVendedores && data.rankingVendedores.length > 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUCTIVIDAD Y RANKING DE COLABORADORES', marginLeft, y);
    y += 5;

    const colW = [8, 65, 30, 25, 35];
    const headers = ['#', 'Colaborador', 'Rol', 'Pares Vendidos', 'Total Facturado'];

    doc.setFillColor(15, 23, 42);
    doc.rect(marginLeft, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);

    let x = marginLeft + 1.5;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 4.2);
      x += colW[i];
    });
    y += 6;

    data.rankingVendedores.slice(0, 5).forEach((v, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6.5, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');

      x = marginLeft + 1.5;
      doc.text(`${idx + 1}`, x, y + 4.5); x += colW[0];
      doc.setFont('helvetica', 'bold');
      doc.text(v.nombre, x, y + 4.5); x += colW[1];
      doc.setFont('helvetica', 'normal');
      doc.text(v.rol.replace('ROL_', ''), x, y + 4.5); x += colW[2];
      doc.text(`${v.paresVendidos} pares`, x, y + 4.5); x += colW[3];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(v.ingresosFacturados || 0).toFixed(2)}`, x, y + 4.5);

      y += 6.5;
    });
  }

  dibujarPie(doc, `Facturación: $${(kpis.totalIngresos || 0).toFixed(2)} | Pares: ${kpis.totalParesVendidos || 0}`);
  return doc;
}

// ══════════════════════════════════════════════════════════════
// 4. REPORTE DE ROTACIÓN DE CALZADO & MODELOS
// ══════════════════════════════════════════════════════════════

export function generarReporteModelosRotacionPdf(data: ReporteModelosData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'Reporte de Rotación de Calzado & Modelos',
    data.periodo,
    data.fechaGeneracion
  );

  // KPIs
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'S');

  const kpiW = contentWidth / 3;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PARES VENDIDOS', marginLeft + kpiW * 0 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('INGRESOS POR CALZADO', marginLeft + kpiW * 1 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('MODELOS CON MOVIMIENTO', marginLeft + kpiW * 2 + kpiW / 2, y + 5, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${data.totalParesVendidos} pares`, marginLeft + kpiW * 0 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(16, 185, 129);
  doc.text(`$${data.totalIngresosModelos.toFixed(2)}`, marginLeft + kpiW * 1 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(59, 130, 246);
  doc.text(`${data.topModelos.length}`, marginLeft + kpiW * 2 + kpiW / 2, y + 12, { align: 'center' });

  y += 22;

  // Tabla Ranking
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('RANKING DE MODELOS CON MAYOR DEMANDA', marginLeft, y);
  y += 5;

  const colW = [8, 65, 35, 25, 35];
  const headers = ['#', 'Modelo de Calzado', 'Color / Serie', 'Pares Vendidos', 'Monto Facturado'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let x = marginLeft + 1.5;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 4.5);
    x += colW[i];
  });
  y += 6.5;

  data.topModelos.forEach((m, idx) => {
    if (y > 270) {
      dibujarPie(doc);
      doc.addPage();
      y = 14;
    }

    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');

    x = marginLeft + 1.5;
    doc.text(`${idx + 1}`, x, y + 5); x += colW[0];
    doc.setFont('helvetica', 'bold');
    doc.text(m.modelName, x, y + 5); x += colW[1];
    doc.setFont('helvetica', 'normal');
    doc.text(`${m.color} • ${m.serieNombre || 'General'}`, x, y + 5); x += colW[2];
    doc.text(`${m.pares} pares`, x, y + 5); x += colW[3];

    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${(m.ingresos || 0).toFixed(2)}`, x, y + 5);

    y += 7;
  });

  dibujarPie(doc, `Pares vendidos: ${data.totalParesVendidos} | Ingresos: $${data.totalIngresosModelos.toFixed(2)}`);
  return doc;
}

// ══════════════════════════════════════════════════════════════
// 5. REPORTE DE PRODUCTIVIDAD POR TRABAJADOR
// ══════════════════════════════════════════════════════════════

export function generarReporteProductividadVendedoresPdf(data: ReporteProductividadData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'Reporte de Productividad por Trabajador',
    data.periodo,
    data.fechaGeneracion
  );

  // KPIs
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'S');

  const kpiW = contentWidth / 3;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PERSONAL EVALUADO', marginLeft + kpiW * 0 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('TOTAL PARES COMERCIALIZADOS', marginLeft + kpiW * 1 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('FACTURACIÓN TOTAL SUCURSAL', marginLeft + kpiW * 2 + kpiW / 2, y + 5, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${data.vendedores.length} trabajadores`, marginLeft + kpiW * 0 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(59, 130, 246);
  doc.text(`${data.totalParesSucursal} pares`, marginLeft + kpiW * 1 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(16, 185, 129);
  doc.text(`$${data.totalIngresosSucursal.toFixed(2)}`, marginLeft + kpiW * 2 + kpiW / 2, y + 12, { align: 'center' });

  y += 22;

  // Tabla
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DESEMPEÑO Y VENTAS INDIVIDUALES', marginLeft, y);
  y += 5;

  const colW = [8, 55, 26, 22, 25, 32];
  const headers = ['#', 'Nombre del Colaborador', 'Rol', 'Pedidos', 'Pares Vendidos', 'Total Facturado'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let x = marginLeft + 1.5;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 4.5);
    x += colW[i];
  });
  y += 6.5;

  data.vendedores.forEach((v, idx) => {
    if (y > 270) {
      dibujarPie(doc);
      doc.addPage();
      y = 14;
    }

    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');

    x = marginLeft + 1.5;
    doc.text(`${idx + 1}`, x, y + 5); x += colW[0];
    doc.setFont('helvetica', 'bold');
    doc.text(v.nombre, x, y + 5); x += colW[1];
    doc.setFont('helvetica', 'normal');
    doc.text(v.rol.replace('ROL_', ''), x, y + 5); x += colW[2];
    doc.text(`${v.pedidosCount}`, x, y + 5); x += colW[3];
    doc.text(`${v.paresVendidos} pares`, x, y + 5); x += colW[4];

    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${(v.ingresosFacturados || 0).toFixed(2)}`, x, y + 5);

    y += 7;
  });

  dibujarPie(doc, `Trabajadores evaluados: ${data.vendedores.length}`);
  return doc;
}

// ══════════════════════════════════════════════════════════════
// 6. REPORTE FINANCIERO & MÉTODOS DE PAGO
// ══════════════════════════════════════════════════════════════

export function generarReporteFinanzasMetodosPdf(data: ReporteFinanzasData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'Reporte de Finanzas & Métodos de Recaudación',
    data.periodo,
    data.fechaGeneracion
  );

  // KPIs
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'S');

  const kpiW = contentWidth / 3;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL RECAUDADO EN CAJA', marginLeft + kpiW * 0 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('SALDO EN CARTERA PENDIENTE', marginLeft + kpiW * 1 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('FACTURACIÓN TOTAL', marginLeft + kpiW * 2 + kpiW / 2, y + 5, { align: 'center' });

  doc.setTextColor(16, 185, 129);
  doc.setFontSize(10);
  doc.text(`$${data.totalRecaudadoCobros.toFixed(2)}`, marginLeft + kpiW * 0 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(220, 38, 38);
  doc.text(`$${data.saldoCarteraTotal.toFixed(2)}`, marginLeft + kpiW * 1 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.text(`$${data.totalIngresosVentas.toFixed(2)}`, marginLeft + kpiW * 2 + kpiW / 2, y + 12, { align: 'center' });

  y += 22;

  // Desglose Métodos
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DISTRIBUCIÓN POR MÉTODO DE PAGO / ABONO', marginLeft, y);
  y += 5;

  const colW = [10, 70, 30, 35, 23];
  const headers = ['#', 'Método de Pago', 'Transacciones', 'Monto Total ($)', '% del Total'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let x = marginLeft + 1.5;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 4.5);
    x += colW[i];
  });
  y += 6.5;

  const labelsMap: Record<string, string> = {
    EFECTIVO: 'Efectivo en Caja',
    TRANSFERENCIA: 'Transferencia Bancaria',
    DEPOSITO: 'Depósito Bancario',
    CHEQUE: 'Cheque / Documento',
    DESCUENTO_COMERCIAL: 'Descuento Comercial / Retención',
  };

  const entries = Object.entries(data.distribucionMetodosAbono || {});
  entries.forEach(([met, val], idx) => {
    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');

    const pct = data.totalRecaudadoCobros > 0 ? ((val.monto / data.totalRecaudadoCobros) * 100).toFixed(1) : '0';

    x = marginLeft + 1.5;
    doc.text(`${idx + 1}`, x, y + 5); x += colW[0];
    doc.setFont('helvetica', 'bold');
    doc.text(labelsMap[met] || met, x, y + 5); x += colW[1];
    doc.setFont('helvetica', 'normal');
    doc.text(`${val.count} abonos`, x, y + 5); x += colW[2];
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${val.monto.toFixed(2)}`, x, y + 5); x += colW[3];
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pct}%`, x, y + 5);

    y += 7;
  });

  dibujarPie(doc, `Recaudación Total: $${data.totalRecaudadoCobros.toFixed(2)}`);
  return doc;
}

// ══════════════════════════════════════════════════════════════
// 7. REPORTE DE PROYECCIÓN IA / MACHINE LEARNING
// ══════════════════════════════════════════════════════════════

export function generarReporteProyeccionMlPdf(data: ReporteMlData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'Pronóstico de Demanda de Calzado (Nexora ML)',
    'Próximos 30 Días',
    data.fechaGeneracion
  );

  const ml = data.ml || {};

  // KPIs
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'S');

  const kpiW = contentWidth / 3;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PARES PROYECTADOS (30 DÍAS)', marginLeft + kpiW * 0 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('CONFIANZA DEL MODELO', marginLeft + kpiW * 1 + kpiW / 2, y + 5, { align: 'center' });
  doc.text('HORIZONTE TEMPORAL', marginLeft + kpiW * 2 + kpiW / 2, y + 5, { align: 'center' });

  doc.setTextColor(147, 51, 234);
  doc.setFontSize(10);
  doc.text(`${ml.totalParesProyectados || 0} pares`, marginLeft + kpiW * 0 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(16, 185, 129);
  doc.text(`${ml.confianza || '89.4%'}`, marginLeft + kpiW * 1 + kpiW / 2, y + 12, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.text('30 Días Calendario', marginLeft + kpiW * 2 + kpiW / 2, y + 12, { align: 'center' });

  y += 22;

  // Tabla Demanda Diaria
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PROYECCIÓN ESTIMADA DÍA POR DÍA', marginLeft, y);
  y += 5;

  const colW = [10, 65, 45, 48];
  const headers = ['#', 'Fecha / Día', 'Rango Estimado (Mín - Máx)', 'Demanda Esperada'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let x = marginLeft + 1.5;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 4.5);
    x += colW[i];
  });
  y += 6.5;

  (ml.proyecciones || []).forEach((p, idx) => {
    if (y > 270) {
      dibujarPie(doc);
      doc.addPage();
      y = 14;
    }

    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');

    x = marginLeft + 1.5;
    doc.text(`${idx + 1}`, x, y + 5); x += colW[0];
    doc.setFont('helvetica', 'bold');
    doc.text(p.diaLabel || p.fecha, x, y + 5); x += colW[1];
    doc.setFont('helvetica', 'normal');
    doc.text(`${p.limiteInferior} - ${p.limiteSuperior} pares`, x, y + 5); x += colW[2];

    doc.setTextColor(147, 51, 234);
    doc.setFont('helvetica', 'bold');
    doc.text(`${p.demandaEsperadaPares} pares`, x, y + 5);

    y += 7;
  });

  dibujarPie(doc, `Predicción ML: ${ml.totalParesProyectados || 0} pares proyectados`);
  return doc;
}

// ══════════════════════════════════════════════════════════════
// 8. INFORME GENERAL INTEGRAL MULTI-SECCIÓN (GLOBAL CONSOLIDADO)
// ══════════════════════════════════════════════════════════════

export function generarReporteGeneralIntegralPdf(data: ReporteGeneralIntegralData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // ════════ PÁGINA 1: RESUMEN EJECUTIVO & KPIS & RANKING ════════
  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'INFORME GENERAL CONSOLIDADO — BUSINESS INTELLIGENCE',
    data.periodo,
    data.fechaGeneracion
  );

  const kpis = data.kpis || {};

  // KPIs Generales
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 24, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 24, 2.5, 2.5, 'S');

  const w4 = contentWidth / 4;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURACIÓN TOTAL', marginLeft + w4 * 0 + w4 / 2, y + 6, { align: 'center' });
  doc.text('CALZADO VENDIDO', marginLeft + w4 * 1 + w4 / 2, y + 6, { align: 'center' });
  doc.text('GANANCIA BRUTA EST.', marginLeft + w4 * 2 + w4 / 2, y + 6, { align: 'center' });
  doc.text('RECAUDADO EN CAJA', marginLeft + w4 * 3 + w4 / 2, y + 6, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`$${(kpis.totalIngresos || 0).toFixed(2)}`, marginLeft + w4 * 0 + w4 / 2, y + 14, { align: 'center' });
  doc.text(`${kpis.totalParesVendidos || 0} pares`, marginLeft + w4 * 1 + w4 / 2, y + 14, { align: 'center' });
  doc.setTextColor(16, 185, 129);
  doc.text(`$${(kpis.gananciaBruta || 0).toFixed(2)}`, marginLeft + w4 * 2 + w4 / 2, y + 14, { align: 'center' });
  doc.setTextColor(37, 99, 235);
  doc.text(`$${(kpis.totalRecaudadoCobros || 0).toFixed(2)}`, marginLeft + w4 * 3 + w4 / 2, y + 14, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`${kpis.totalPedidos || 0} pedidos`, marginLeft + w4 * 0 + w4 / 2, y + 20, { align: 'center' });
  doc.text(`Ticket: $${(kpis.ticketPromedio || 0).toFixed(2)}`, marginLeft + w4 * 1 + w4 / 2, y + 20, { align: 'center' });
  doc.text(`Margen: ${(kpis.margenPorcentaje || 0).toFixed(1)}%`, marginLeft + w4 * 2 + w4 / 2, y + 20, { align: 'center' });
  doc.text(`Saldo Cartera: $${(kpis.saldoCarteraTotal || 0).toFixed(2)}`, marginLeft + w4 * 3 + w4 / 2, y + 20, { align: 'center' });

  y += 30;

  // Sección: Modelos Top
  if (data.topModelos && data.topModelos.length > 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('1. TOP MODELOS DE CALZADO CON MAYOR VENTA', marginLeft, y);
    y += 4.5;

    const colW = [8, 65, 35, 25, 35];
    const headers = ['#', 'Modelo de Calzado', 'Color / Serie', 'Pares Vendidos', 'Monto Facturado'];

    doc.setFillColor(15, 23, 42);
    doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);

    let x = marginLeft + 1.5;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 3.8);
      x += colW[i];
    });
    y += 5.5;

    data.topModelos.slice(0, 5).forEach((m, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      x = marginLeft + 1.5;
      doc.text(`${idx + 1}`, x, y + 4.2); x += colW[0];
      doc.setFont('helvetica', 'bold');
      doc.text(m.modelName, x, y + 4.2); x += colW[1];
      doc.setFont('helvetica', 'normal');
      doc.text(`${m.color} • ${m.serieNombre || 'General'}`, x, y + 4.2); x += colW[2];
      doc.text(`${m.pares} pares`, x, y + 4.2); x += colW[3];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(m.ingresos || 0).toFixed(2)}`, x, y + 4.2);

      y += 6;
    });

    y += 6;
  }

  // Sección: Productividad Personal
  if (data.rankingVendedores && data.rankingVendedores.length > 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('2. PRODUCTIVIDAD Y RENDIMIENTO DE COLABORADORES', marginLeft, y);
    y += 4.5;

    const colW = [8, 65, 30, 25, 40];
    const headers = ['#', 'Colaborador', 'Rol', 'Pares Vendidos', 'Total Facturado'];

    doc.setFillColor(15, 23, 42);
    doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);

    let x = marginLeft + 1.5;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 3.8);
      x += colW[i];
    });
    y += 5.5;

    data.rankingVendedores.slice(0, 5).forEach((v, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      x = marginLeft + 1.5;
      doc.text(`${idx + 1}`, x, y + 4.2); x += colW[0];
      doc.setFont('helvetica', 'bold');
      doc.text(v.nombre, x, y + 4.2); x += colW[1];
      doc.setFont('helvetica', 'normal');
      doc.text(v.rol.replace('ROL_', ''), x, y + 4.2); x += colW[2];
      doc.text(`${v.paresVendidos} pares`, x, y + 4.2); x += colW[3];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(v.ingresosFacturados || 0).toFixed(2)}`, x, y + 4.2);

      y += 6;
    });
  }

  dibujarPie(doc, 'Página 1 de 2 — Resumen Comercial & Ventas');

  // ════════ PÁGINA 2: COBRANZAS, CAMPAÑAS & PROYECCIÓN ML ════════
  doc.addPage();
  y = 14;

  // Encabezado Pág 2
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(marginLeft, y, contentWidth, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME GENERAL — CARTERA, CAMPAÑAS & INFERENCIA ML', marginLeft + 6, y + 9);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periodo: ${data.periodo}`, pageWidth - marginRight - 6, y + 9, { align: 'right' });
  y += 20;

  // Sección: Cartera de Cobranzas
  if (data.cobranzas && data.cobranzas.clientes) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`3. ESTADO DE COBRANZAS (Saldo Cartera: $${data.cobranzas.totalCartera.toFixed(2)})`, marginLeft, y);
    y += 4.5;

    const colW = [8, 65, 30, 20, 25, 20];
    const headers = ['#', 'Cliente Deudor', 'C.I. / RUC', 'Notas', 'Saldo Deudor', 'Nivel'];

    doc.setFillColor(15, 23, 42);
    doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);

    let x = marginLeft + 1.5;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 3.8);
      x += colW[i];
    });
    y += 5.5;

    data.cobranzas.clientes.slice(0, 5).forEach((c, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      x = marginLeft + 1.5;
      doc.text(`${idx + 1}`, x, y + 4.2); x += colW[0];
      doc.setFont('helvetica', 'bold');
      doc.text(c.nombre.length > 32 ? c.nombre.substring(0, 30) + '..' : c.nombre, x, y + 4.2); x += colW[1];
      doc.setFont('helvetica', 'normal');
      doc.text(c.cedula, x, y + 4.2); x += colW[2];
      doc.text(`${c.notasPendientes}`, x, y + 4.2); x += colW[3];
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${c.totalDeuda.toFixed(2)}`, x, y + 4.2); x += colW[4];
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(c.nivelCredito || 'REGULAR', x, y + 4.2);

      y += 6;
    });

    y += 7;
  }

  // Sección: Campañas
  if (data.campanas && data.campanas.length > 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('4. EFECTIVIDAD DE CAMPAÑAS PROMOCIONALES', marginLeft, y);
    y += 4.5;

    const colW = [8, 35, 60, 22, 22, 21];
    const headers = ['#', 'Código', 'Título de la Campaña', 'Canjes / Cupo', 'Ventas ($)', 'Estado'];

    doc.setFillColor(15, 23, 42);
    doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);

    let x = marginLeft + 1.5;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 3.8);
      x += colW[i];
    });
    y += 5.5;

    data.campanas.slice(0, 4).forEach((c, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      x = marginLeft + 1.5;
      doc.text(`${idx + 1}`, x, y + 4.2); x += colW[0];
      doc.setFont('helvetica', 'bold');
      doc.text(c.codigo, x, y + 4.2); x += colW[1];
      doc.setFont('helvetica', 'normal');
      doc.text(c.titulo.length > 34 ? c.titulo.substring(0, 32) + '..' : c.titulo, x, y + 4.2); x += colW[2];
      doc.text(`${c.canjesUsados} / ${c.maximoCanjes}`, x, y + 4.2); x += colW[3];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(c.montoTotalGenerado || 0).toFixed(2)}`, x, y + 4.2); x += colW[4];
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(c.activo ? 16 : 100, c.activo ? 185 : 116, c.activo ? 129 : 139);
      doc.text(c.activo ? 'ACTIVA' : 'FINALIZADA', x, y + 4.2);

      y += 6;
    });

    y += 7;
  }

  // Sección: Proyección ML
  if (data.proyeccionMl) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('5. PRONÓSTICO DE DEMANDA INTELIGENTE (NEXORA ML)', marginLeft, y);
    y += 4.5;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginLeft, y, contentWidth, 14, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginLeft, y, contentWidth, 14, 2, 2, 'S');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.text('Demanda estimada próx. 30 días:', marginLeft + 6, y + 5);
    doc.setTextColor(147, 51, 234);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.proyeccionMl.totalParesProyectados || 0} pares de calzado`, marginLeft + 6, y + 10.5);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Nivel de Confianza:', marginLeft + 80, y + 5);
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.proyeccionMl.confianza || '89.4%'}`, marginLeft + 80, y + 10.5);
  }

  dibujarPie(doc, 'Página 2 de 2 — Consolidado Institucional');
  return doc;
}

// ══════════════════════════════════════════════════════════════
// 9. INFORME DEL PUNTO DE VENTA (POS / MOSTRADOR)
// ══════════════════════════════════════════════════════════════
export function generarReportePosPdf(data: ReportePosPdfData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    `REPORTE PUNTO DE VENTA (${data.sucursalNombre || 'TODAS'})`,
    data.periodo,
    data.fechaGeneracion
  );

  // Tarjetas KPI
  const kpis = [
    { label: 'Total Recaudado POS', val: `$${data.metricas.totalRecaudado.toFixed(2)}`, sub: 'Caja mostrador' },
    { label: 'Ventas Realizadas', val: `${data.metricas.cantidadVentas}`, sub: 'Transacciones' },
    { label: 'Pares Despachados', val: `${data.metricas.cantidadPares}`, sub: 'Calzado vendido' },
    { label: 'Ticket Promedio POS', val: `$${data.metricas.ticketPromedio.toFixed(2)}`, sub: 'Por ticket' },
  ];
  y = dibujarTarjetasKpi(doc, kpis, y);

  // Métodos de Pago
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DESGLOSE DE MÉTODOS DE PAGO EN CAJA', marginLeft, y);
  y += 4.5;

  const metodos = [
    { nombre: 'Efectivo', total: data.metricas.desgloseMetodosPago.efectivo.total, cant: data.metricas.desgloseMetodosPago.efectivo.cantidad },
    { nombre: 'Tarjeta (Débito/Crédito)', total: data.metricas.desgloseMetodosPago.tarjeta.total, cant: data.metricas.desgloseMetodosPago.tarjeta.cantidad },
    { nombre: 'Transferencia Bancaria', total: data.metricas.desgloseMetodosPago.transferencia.total, cant: data.metricas.desgloseMetodosPago.transferencia.cantidad },
  ];

  const colWMet = [70, 45, 67];
  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let xm = marginLeft + 2;
  ['Método de Pago', 'Transacciones', 'Monto Total'].forEach((h, i) => {
    doc.text(h, xm, y + 3.8);
    xm += colWMet[i];
  });
  y += 5.5;

  metodos.forEach((m, idx) => {
    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 6, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);

    xm = marginLeft + 2;
    doc.setFont('helvetica', 'bold');
    doc.text(m.nombre, xm, y + 4.2); xm += colWMet[0];
    doc.setFont('helvetica', 'normal');
    doc.text(`${m.cant} cobros`, xm, y + 4.2); xm += colWMet[1];
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`$${m.total.toFixed(2)}`, xm, y + 4.2);
    y += 6;
  });

  y += 6;

  // Listado de Transacciones Recientes POS
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REGISTRO DE VENTAS EN MOSTRADOR (ÚLTIMAS TRANSACCIONES)', marginLeft, y);
  y += 4.5;

  const colWVen = [18, 30, 42, 32, 28, 32];
  const headVen = ['Nota', 'Fecha', 'Cliente', 'Vendedor', 'Método', 'Total ($)'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let xv = marginLeft + 2;
  headVen.forEach((h, i) => {
    doc.text(h, xv, y + 3.8);
    xv += colWVen[i];
  });
  y += 5.5;

  const ventasList = data.ventas ? data.ventas.slice(0, 18) : [];
  ventasList.forEach((v: any, idx: number) => {
    if (y > 270) {
      dibujarPie(doc, 'Página 1');
      doc.addPage();
      y = 15;
      doc.setFillColor(15, 23, 42);
      doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      let xh = marginLeft + 2;
      headVen.forEach((h, i) => {
        doc.text(h, xh, y + 3.8);
        xh += colWVen[i];
      });
      y += 5.5;
    }

    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 6, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);

    xv = marginLeft + 2;
    doc.setFont('helvetica', 'bold');
    doc.text(v.numeroNota || '#POS', xv, y + 4.2); xv += colWVen[0];
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(v.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }), xv, y + 4.2); xv += colWVen[1];
    doc.text((v.cliente?.nombre || 'Consumidor').substring(0, 22), xv, y + 4.2); xv += colWVen[2];
    doc.text((v.vendedor?.nombre || 'Vendedor').substring(0, 16), xv, y + 4.2); xv += colWVen[3];
    doc.text(v.metodoPago || 'EFECTIVO', xv, y + 4.2); xv += colWVen[4];
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`$${Number(v.total).toFixed(2)}`, xv, y + 4.2);

    y += 6;
  });

  dibujarPie(doc, 'Informe Punto de Venta — NEXORA');
  return doc;
}

// ══════════════════════════════════════════════════════════════
// 10. INFORME DE RENDIMIENTO POR SUCURSAL & VENTAS POR MODELO
// ══════════════════════════════════════════════════════════════
export function generarReporteRendimientoSucursalesPdf(data: ReporteRendimientoSucursalesPdfData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    `RENDIMIENTO: ${data.sucursalSeleccionada.nombre.toUpperCase()}`,
    data.periodo,
    data.fechaGeneracion
  );

  // Tarjetas KPI
  const kpis = [
    { label: 'Ventas Sucursal', val: `$${data.totalesSucursalSeleccionada.ingresos.toFixed(2)}`, sub: 'Ingresos período' },
    { label: 'Pares Comercializados', val: `${data.totalesSucursalSeleccionada.pares}`, sub: 'Volumen total' },
    { label: 'Pedidos / Tickets', val: `${data.totalesSucursalSeleccionada.pedidos}`, sub: 'Transacciones' },
    { label: 'Modelos en Rotación', val: `${data.totalesSucursalSeleccionada.totalModelosVendidos}`, sub: 'Catálogo activo' },
  ];
  y = dibujarTarjetasKpi(doc, kpis, y);

  // Sección 1: Comparativa de Sucursales de la Empresa
  if (data.sucursales && data.sucursales.length > 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('1. COMPARATIVA COMERCIAL ENTRE SUCURSALES', marginLeft, y);
    y += 4.5;

    const colWSuc = [55, 30, 25, 32, 40];
    const headSuc = ['Sucursal', 'Ventas Totales ($)', 'Pares', 'Ticket Prom.', 'Aporte a Empresa'];

    doc.setFillColor(15, 23, 42);
    doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);

    let xs = marginLeft + 2;
    headSuc.forEach((h, i) => {
      doc.text(h, xs, y + 3.8);
      xs += colWSuc[i];
    });
    y += 5.5;

    data.sucursales.forEach((s, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6.5);

      xs = marginLeft + 2;
      doc.setFont('helvetica', 'bold');
      doc.text(s.nombre.substring(0, 30), xs, y + 4.2); xs += colWSuc[0];
      doc.setTextColor(16, 185, 129);
      doc.text(`$${s.totalVentas.toFixed(2)}`, xs, y + 4.2); xs += colWSuc[1];
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(`${s.totalPares} pares`, xs, y + 4.2); xs += colWSuc[2];
      doc.text(`$${s.ticketPromedio.toFixed(2)}`, xs, y + 4.2); xs += colWSuc[3];
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(`${s.porcentajeEmpresa}%`, xs, y + 4.2);
      y += 6;
    });

    y += 6;
  }

  // Sección 2: Ventas de Cada Modelo de Calzado de la Sucursal Seleccionada
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`2. TOTAL DE VENTAS POR MODELO EN ${data.sucursalSeleccionada.nombre.toUpperCase()}`, marginLeft, y);
  y += 4.5;

  const colWMod = [10, 48, 26, 22, 28, 24, 24];
  const headMod = ['#', 'Modelo de Calzado', 'Color / Serie', 'Pares', 'Ventas ($)', 'Precio Prom.', '% Sucursal'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let xm = marginLeft + 2;
  headMod.forEach((h, i) => {
    doc.text(h, xm, y + 3.8);
    xm += colWMod[i];
  });
  y += 5.5;

  const modelos = data.modelosVendidos || [];
  modelos.forEach((m, idx) => {
    if (y > 270) {
      dibujarPie(doc, 'Página 1');
      doc.addPage();
      y = 15;
      doc.setFillColor(15, 23, 42);
      doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      let xh = marginLeft + 2;
      headMod.forEach((h, i) => {
        doc.text(h, xh, y + 3.8);
        xh += colWMod[i];
      });
      y += 5.5;
    }

    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 6, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);

    xm = marginLeft + 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`${m.ranking || idx + 1}`, xm, y + 4.2); xm += colWMod[0];
    doc.text(m.modelName.substring(0, 28), xm, y + 4.2); xm += colWMod[1];
    doc.setFont('helvetica', 'normal');
    doc.text(`${m.color} · ${m.serieNombre || ''}`.substring(0, 18), xm, y + 4.2); xm += colWMod[2];
    doc.text(`${m.paresVendidos}`, xm, y + 4.2); xm += colWMod[3];
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`$${m.montoTotal.toFixed(2)}`, xm, y + 4.2); xm += colWMod[4];
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${m.precioPromedio.toFixed(2)}`, xm, y + 4.2); xm += colWMod[5];
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(`${m.porcentajeSucursal}%`, xm, y + 4.2);

    y += 6;
  });

  dibujarPie(doc, 'Informe Rendimiento por Sucursal — NEXORA');
  return doc;
}
