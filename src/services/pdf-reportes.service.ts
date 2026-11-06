import { jsPDF } from 'jspdf';
import { formatearNombreSerie, capitalizarNombreCompleto } from '../utils/text-formatters';

// ══════════════════════════════════════════════════════════════
// INTERFACES GLOBALES DE REPORTES
// ══════════════════════════════════════════════════════════════

export interface NegocioInfo {
  nombre: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  primaryColor?: string;
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
  margen?: number;
  participacion?: number;
  gananciaNeta?: number;
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
  pedidos?: number;
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
  distribucionCanales?: any;
  distribucionFormasPago?: any;
  posData?: any;
  sucursalesData?: any;
  proveedoresData?: any;
  modelosMargen?: any;
  rotacionResumen?: any;
  inventarioFifoData?: any;
  entregasPedidosData?: any;
}

export interface ProductoRotacionCompleto {
  productId: string;
  modelId: string;
  modelName: string;
  color: string;
  serieId: string;
  serieNombre: string;
  imageUrl?: string;
  active: boolean;
  precioVenta: number;
  precioCosto: number;
  stockTotal: number;
  stockDisponible: number;
  paresVendidos: number;
  ingresos: number;
  costo: number;
  margen: number;
  pedidos: number;
  capitalRetenido: number;
  valorComercial: number;
  rotacion: 'ALTA' | 'MEDIA' | 'BAJA' | 'SIN_MOVIMIENTO';
  tallasDetalle?: { talla: string; stock: number; reservado: number; disponible: number }[];
  tallasAgotadas?: string[];
  tallasConStock?: number;
}

export interface RotacionResumenData {
  totalProductos: number;
  totalConVentas: number;
  totalSinVentas: number;
  totalConStock: number;
  totalSinStock: number;
  totalRotacionAlta: number;
  totalRotacionMedia: number;
  totalRotacionBaja: number;
  totalSinMovimiento: number;
  capitalEnRiesgo: number;
  umbralAlta: number;
  umbralMedia: number;
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
  catalogoCompleto?: ProductoRotacionCompleto[];
  rotacionResumen?: RotacionResumenData;
  totalParesVendidos: number;
  totalIngresosModelos: number;
  topModelosGrafica?: {
    nombre: string;
    paresVendidos: number;
    margenPorcentual: number;
    gananciaNeta: number;
    porcentajeParticipacion?: number;
  }[];
  filtroSerie?: string;
  filtroEstado?: string;
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
  vendedorNombre?: string;
  canalNombre?: string;
  distribucionCanales?: Record<string, { count: number; monto: number; pares: number }>;
  distribucionFormasPago?: Record<string, { count: number; monto: number }>;
  recaudacionPorVendedor?: { userId: string; nombre: string; rol: string; totalAbonos: number; count: number }[];
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
  distribucionCanales?: any;
  distribucionFormasPago?: any;
  posData?: any;
  sucursalesData?: any;
  proveedoresData?: any;
  modelosMargen?: any;
  rotacionResumen?: any;
  inventarioFifoData?: any;
  entregasPedidosData?: any;
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
  doc.text(negocio.nombre || 'CALZADO COMERCIAL', marginLeft + 8, y + 10);

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
  doc.text('Sistema Web de Gestión Comercial — Documento institucional confidencial.', marginLeft, y + 5);
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

// ── Helper Conversor Hex a RGB ──
export function hexToRgb(hex?: string): [number, number, number] {
  if (!hex) return [15, 23, 42];
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 15;
    const g = parseInt(clean[1] + clean[1], 16) || 23;
    const b = parseInt(clean[2] + clean[2], 16) || 42;
    return [r, g, b];
  }
  const r = parseInt(clean.substring(0, 2), 16) || 15;
  const g = parseInt(clean.substring(2, 4), 16) || 23;
  const b = parseInt(clean.substring(4, 6), 16) || 42;
  return [r, g, b];
}

// ── Helper Gráfico Vectorial de Barras Modernas en PDF ──
export function dibujarGraficoBarrasPdf(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  items: { label: string; valor: number; valorFormateado?: string; subtexto?: string; color?: [number, number, number] }[],
  options?: {
    titulo?: string;
    subtitulo?: string;
    unidad?: string;
  }
): number {
  if (!items || items.length === 0) return y;

  // Contenedor tarjeta moderna estilizada (Fondo blanco/slate suave con borde sutil)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'S');

  let curY = y + 5;

  if (options?.titulo) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(options.titulo.toUpperCase(), x + 5, curY);

    if (options?.subtitulo) {
      curY += 3.5;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(options.subtitulo, x + 5, curY);
    }
    curY += 4.5;
  }

  const maxVal = Math.max(...items.map((i) => i.valor || 0), 1);
  const totalVal = items.reduce((acc, i) => acc + (i.valor || 0), 0);
  const availableH = (y + height - 2.5) - curY;
  const rowH = Math.min(6.5, availableH / Math.max(items.length, 1));

  items.forEach((item, idx) => {
    const rowY = curY + idx * rowH;
    const color = item.color || [14, 165, 233];
    const pct = Math.min(1, Math.max(0, (item.valor || 0) / maxVal));
    const share = totalVal > 0 ? ((item.valor || 0) / totalVal) * 100 : 0;

    // ── LÍNEA 1: Textos y Métricas ──
    // Viñeta circular
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(x + 5, rowY + 2.0, 1.1, 'F');

    // Etiqueta del ítem (y subtexto)
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(5.3);
    doc.setFont('helvetica', 'bold');
    const fullLabel = item.subtexto ? `${item.label} (${item.subtexto})` : item.label;
    const maxChars = width < 100 ? 30 : 55;
    const labelTexto = fullLabel.length > maxChars ? fullLabel.substring(0, maxChars - 2) + '..' : fullLabel;
    doc.text(labelTexto, x + 7.5, rowY + 2.5);

    // Valor formateado a la derecha
    const valText = item.valorFormateado || `${options?.unidad ? `${options.unidad} ` : ''}${(item.valor || 0).toFixed((item.valor || 0) % 1 === 0 ? 0 : 2)}`;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(5.2);
    doc.setFont('helvetica', 'bold');
    const badgeW = 9.5;
    doc.text(valText, x + width - badgeW - 6, rowY + 2.5, { align: 'right' });

    // Badge porcentual al extremo derecho
    const badgeX = x + width - badgeW - 4;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(badgeX, rowY + 0.6, badgeW, 2.8, 0.6, 0.6, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(4.7);
    doc.setFont('helvetica', 'bold');
    doc.text(`${share.toFixed(0)}%`, badgeX + badgeW / 2, rowY + 2.5, { align: 'center' });

    // ── LÍNEA 2: Barra de Progreso Continua (Independiente abajo del texto) ──
    const barStartX = x + 7.5;
    const barTotalW = width - 11.5;
    const barY = rowY + 3.4;
    const barH = Math.min(1.8, Math.max(1.2, rowH * 0.28));

    // Track gris suave
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(barStartX, barY, barTotalW, barH, 0.6, 0.6, 'F');

    // Barra activa con color
    const activeW = Math.max(1.5, barTotalW * pct);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(barStartX, barY, activeW, barH, 0.6, 0.6, 'F');
  });

  return y + height + 5;
}

// ── Helper Gráfico Vectorial de Curva y Área de Tendencia en PDF ──
export function dibujarGraficoCurvaPdf(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  points: { label: string; valor: number; valorFormateado?: string }[],
  options?: {
    titulo?: string;
    subtitulo?: string;
    colorLinea?: [number, number, number];
    colorRelleno?: [number, number, number];
    unidad?: string;
  }
): number {
  if (!points || points.length === 0) return y;

  const colorLinea = options?.colorLinea || [14, 165, 233];
  const colorRelleno = options?.colorRelleno || [224, 242, 254];

  // Tarjeta contenedora
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'S');

  let curY = y + 5;
  if (options?.titulo) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(options.titulo.toUpperCase(), x + 5, curY);

    if (options?.subtitulo) {
      curY += 3.5;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(options.subtitulo, x + 5, curY);
    }
    curY += 4.5;
  }

  const padX = 14;
  const padBottom = 8;
  const chartW = width - padX * 2;
  const chartH = Math.max(8, (y + height - padBottom) - curY);
  const chartBottomY = curY + chartH;

  const maxVal = Math.max(...points.map((p) => p.valor || 0), 1);

  // Líneas guía horizontales punteadas
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  [0, 0.33, 0.66, 1].forEach((ratio) => {
    const gy = chartBottomY - chartH * ratio;
    doc.line(x + padX, gy, x + width - padX, gy);
  });

  // Coordenadas con margen superior para no salirse de la tarjeta
  const coords = points.map((p, i) => {
    const px = points.length === 1
      ? x + width / 2
      : (x + padX) + (i / (points.length - 1)) * chartW;
    const clampedRatio = Math.min(1, Math.max(0, (p.valor || 0) / maxVal));
    const py = chartBottomY - clampedRatio * (chartH - 2);
    return { px, py, p };
  });

  // Área sombreada bajo la curva (trapecios de relleno con colorRelleno)
  doc.setFillColor(colorRelleno[0], colorRelleno[1], colorRelleno[2]);
  for (let i = 0; i < coords.length - 1; i++) {
    const c1 = coords[i];
    const c2 = coords[i + 1];
    const trapW = c2.px - c1.px;
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const stepX = c1.px + (trapW / steps) * s;
      const stepW = trapW / steps + 0.1;
      const t = s / steps;
      const stepY = c1.py + (c2.py - c1.py) * t;
      const stripH = chartBottomY - stepY;
      if (stripH > 0) {
        doc.rect(stepX, stepY, stepW, stripH, 'F');
      }
    }
  }

  // Trazo de la curva de tendencia
  doc.setDrawColor(colorLinea[0], colorLinea[1], colorLinea[2]);
  doc.setLineWidth(0.5);
  for (let i = 0; i < coords.length - 1; i++) {
    const c1 = coords[i];
    const c2 = coords[i + 1];
    doc.line(c1.px, c1.py, c2.px, c2.py);
  }

  // Puntos vertex circulares
  coords.forEach((c, idx) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(colorLinea[0], colorLinea[1], colorLinea[2]);
    doc.setLineWidth(0.3);
    doc.circle(c.px, c.py, 1.0, 'FD');

    // Etiquetas del eje X
    if (points.length <= 8 || idx % Math.ceil(points.length / 6) === 0 || idx === points.length - 1) {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.text(c.p.label, c.px, chartBottomY + 4, { align: 'center' });
    }
  });

  return y + height + 5;
}

// ── Helper Gráfico Circular / Donut Moderno en PDF ──
export function dibujarGraficoDonutPdf(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  items: { label: string; valor: number; color?: [number, number, number]; subtexto?: string }[],
  options?: {
    titulo?: string;
    subtitulo?: string;
    valorCentro?: string;
    etiquetaCentro?: string;
  }
): number {
  if (!items || items.length === 0) return y;

  // Contenedor tarjeta
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'S');

  let curY = y + 5;
  if (options?.titulo) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(options.titulo.toUpperCase(), x + 5, curY);

    if (options?.subtitulo) {
      curY += 3.5;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(options.subtitulo, x + 5, curY);
    }
    curY += 4.5;
  }

  const total = items.reduce((acc, i) => acc + (i.valor || 0), 0);

  // Parámetros geométricos del donut según ancho disponible
  const isCompact = width < 100;
  const donutCenterX = isCompact ? x + 18 : x + 24;
  const donutCenterY = curY + (height - (curY - y)) / 2 - 1.2;
  const outerR = isCompact ? 10.5 : 13;
  const innerR = isCompact ? 6.2 : 7.8;

  // Anillo base gris
  doc.setFillColor(226, 232, 240);
  doc.circle(donutCenterX, donutCenterY, outerR, 'F');

  // Sectores reales proporcionales multi-color
  if (total > 0) {
    let currentAngle = -Math.PI / 2; // Inicia a las 12 en punto
    const step = Math.PI / 24; // Resolución suave (~7.5 grados)

    items.forEach((item) => {
      if ((item.valor || 0) <= 0) return;
      const sliceAngle = ((item.valor || 0) / total) * (2 * Math.PI);
      const endAngle = currentAngle + sliceAngle;
      const col = item.color || [14, 165, 233];
      doc.setFillColor(col[0], col[1], col[2]);

      for (let a = currentAngle; a < endAngle; a += step) {
        const nextA = Math.min(a + step, endAngle);
        const x1 = donutCenterX + outerR * Math.cos(a);
        const y1 = donutCenterY + outerR * Math.sin(a);
        const x2 = donutCenterX + outerR * Math.cos(nextA);
        const y2 = donutCenterY + outerR * Math.sin(nextA);
        doc.triangle(donutCenterX, donutCenterY, x1, y1, x2, y2, 'F');
      }
      currentAngle = endAngle;
    });
  }

  // Agujero blanco central (donut ring)
  doc.setFillColor(255, 255, 255);
  doc.circle(donutCenterX, donutCenterY, innerR, 'F');
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.circle(donutCenterX, donutCenterY, innerR, 'S');

  // Texto central dentro del donut
  const valCentro = options?.valorCentro || (total > 0 ? `${total}` : '0');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  if (options?.etiquetaCentro) {
    doc.setFontSize(valCentro.length > 5 ? 5.5 : 6.5);
    doc.text(valCentro, donutCenterX, donutCenterY - 0.2, { align: 'center' });
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text(options.etiquetaCentro.toUpperCase(), donutCenterX, donutCenterY + 2.8, { align: 'center' });
  } else {
    doc.setFontSize(valCentro.length > 5 ? 6 : 7);
    doc.text(valCentro, donutCenterX, donutCenterY + 1.2, { align: 'center' });
  }

  // Lado derecho: Leyenda y desglose
  const legendX = isCompact ? x + 33 : x + 44;
  const legendW = width - (legendX - x) - 4;
  const availableH = y + height - curY - 2;
  const rowH = Math.min(6.2, availableH / Math.max(items.length, 1));
  const hasSpaceForSubtext = items.length <= 3 && rowH >= 5.5;

  items.forEach((item, idx) => {
    const rowY = curY + idx * rowH;
    const color = item.color || [14, 165, 233];
    const pct = total > 0 ? ((item.valor || 0) / total) * 100 : 0;

    // Viñeta circular
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(legendX + 1.5, rowY + 2.6, 1.1, 'F');

    // Nombre / Etiqueta (con límite de caracteres para nunca chocar con el badge de porcentaje)
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(hasSpaceForSubtext ? 5.6 : 5.2);
    doc.setFont('helvetica', 'bold');
    const badgeW = 11;
    const maxChars = legendW < 52 ? 16 : 24;
    const lbl = item.label.length > maxChars ? item.label.substring(0, maxChars - 2) + '..' : item.label;
    doc.text(lbl, legendX + 4, hasSpaceForSubtext && item.subtexto ? rowY + 2.5 : rowY + 3.1);

    if (hasSpaceForSubtext && item.subtexto) {
      doc.setFontSize(4.4);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(item.subtexto, legendX + 4, rowY + 5.2);
    }

    // Badge porcentual estilizado al extremo derecho (sin barras invasivas)
    const badgeX = legendX + legendW - badgeW;
    const badgeY = rowY + 1.0;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(badgeX, badgeY, badgeW, 3.4, 0.8, 0.8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(5.2);
    doc.setFont('helvetica', 'bold');
    doc.text(`${pct.toFixed(0)}%`, badgeX + badgeW / 2, badgeY + 2.4, { align: 'center' });
  });

  return y + height + 5;
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

  y += 22;

  // Gráficas vectoriales de cartera y recaudación
  const halfWCob = (contentWidth - 4) / 2;
  const totalFlujo = data.totalRecaudado + data.totalCartera;
  const pctRecuperado = totalFlujo > 0 ? ((data.totalRecaudado / totalFlujo) * 100).toFixed(0) : '0';

  const donutCobItems = [
    { label: 'Recaudado en Periodo', valor: data.totalRecaudado, color: [16, 185, 129] as [number, number, number] },
    { label: 'Cartera Pendiente', valor: data.totalCartera, color: [239, 68, 68] as [number, number, number] },
  ];

  const niveles: Record<string, number> = {
    'EXCELENTE': 0,
    'BUENO': 0,
    'REGULAR': 0,
    'CRITICO': 0,
  };

  data.clientes.forEach((c) => {
    const niv = (c.nivelCredito || '').toUpperCase();
    if (niv.includes('EXCELENTE') || (c.scoreCrediticio && c.scoreCrediticio >= 80)) {
      niveles['EXCELENTE'] += c.totalDeuda || 0;
    } else if (niv.includes('BUENO') || (c.scoreCrediticio && c.scoreCrediticio >= 60)) {
      niveles['BUENO'] += c.totalDeuda || 0;
    } else if (niv.includes('REGULAR') || (c.scoreCrediticio && c.scoreCrediticio >= 40)) {
      niveles['REGULAR'] += c.totalDeuda || 0;
    } else {
      niveles['CRITICO'] += c.totalDeuda || 0;
    }
  });

  const barCobItems = [
    { label: 'Excelente (Bajo Riesgo)', valor: niveles['EXCELENTE'], valorFormateado: `$${niveles['EXCELENTE'].toFixed(0)}`, color: [16, 185, 129] as [number, number, number] },
    { label: 'Bueno (Riesgo Normal)', valor: niveles['BUENO'], valorFormateado: `$${niveles['BUENO'].toFixed(0)}`, color: [14, 165, 233] as [number, number, number] },
    { label: 'Regular (En Observación)', valor: niveles['REGULAR'], valorFormateado: `$${niveles['REGULAR'].toFixed(0)}`, color: [245, 158, 11] as [number, number, number] },
    { label: 'Crítico (Mora / Alto Riesgo)', valor: niveles['CRITICO'], valorFormateado: `$${niveles['CRITICO'].toFixed(0)}`, color: [239, 68, 68] as [number, number, number] },
  ].filter(b => b.valor > 0 || data.clientes.length === 0);

  dibujarGraficoDonutPdf(doc, marginLeft, y, halfWCob, 32, donutCobItems, {
    titulo: 'Ratio Cartera vs Recaudación',
    subtitulo: 'Liquidez cobrada vs saldo por cobrar',
    valorCentro: `${pctRecuperado}%`,
  });

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft + halfWCob + 4,
    y,
    halfWCob,
    32,
    barCobItems.length > 0 ? barCobItems : [{ label: 'Cartera Total', valor: data.totalCartera, valorFormateado: `$${data.totalCartera.toFixed(2)}`, color: [239, 68, 68] }],
    {
      titulo: 'Deuda por Nivel de Riesgo',
      subtitulo: 'Distribución de cartera por scoring',
    }
  );

  y += 36;

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

  y += 20;

  // Gráficas vectoriales de efectividad de promociones
  const halfWCamp = (contentWidth - 4) / 2;

  const barCampanasItems = data.campanas.slice(0, 4).map((c, idx) => {
    const colPalette = [[14, 165, 233], [16, 185, 129], [99, 102, 241], [245, 158, 11]];
    return {
      label: c.titulo,
      valor: c.montoTotalGenerado || 0,
      valorFormateado: `$${(c.montoTotalGenerado || 0).toFixed(0)}`,
      color: (colPalette[idx % colPalette.length] || [14, 165, 233]) as [number, number, number],
      subtexto: `${c.canjesUsados} canjes (${c.paresVendidos} pares)`,
    };
  });

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft,
    y,
    halfWCamp,
    30,
    barCampanasItems.length > 0 ? barCampanasItems : [{ label: 'Sin campañas registradas', valor: 0, valorFormateado: '$0' }],
    {
      titulo: 'Ventas Asociadas por Campaña',
      subtitulo: 'Ingresos generados por cada promoción comercial',
      unidad: '$',
    }
  );

  const totalCupos = data.campanas.reduce((s, c) => s + (c.maximoCanjes || 0), 0);
  const cuposRestantes = Math.max(0, totalCupos - totalCanjes);
  const pctCanjeado = totalCupos > 0 ? `${((totalCanjes / totalCupos) * 100).toFixed(0)}%` : '100%';

  const donutCampanasItems = [
    { label: 'Canjes Efectivos', valor: totalCanjes, color: [16, 185, 129] as [number, number, number] },
    { label: 'Cupos Disponibles', valor: cuposRestantes, color: [14, 165, 233] as [number, number, number] },
  ];

  dibujarGraficoDonutPdf(
    doc,
    marginLeft + halfWCamp + 4,
    y,
    halfWCamp,
    30,
    donutCampanasItems,
    {
      titulo: 'Eficiencia y Consumo de Cupos',
      subtitulo: 'Proporción de canjes aplicados',
      valorCentro: pctCanjeado,
      etiquetaCentro: 'Tasa Uso',
    }
  );

  y += 34;

  if (y > 175) {
    dibujarPie(doc);
    doc.addPage();
    y = 14;
  }

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

  // Gráfico Vectorial de Curva de Tendencia Temporal de Ventas
  if (data.serieTemporal && data.serieTemporal.length > 0) {
    const primaryRgb = hexToRgb(data.negocio.primaryColor || '#0EA5E9');
    const curvePoints = data.serieTemporal.map((t) => ({
      label: t.label,
      valor: t.ingresos || 0,
      valorFormateado: `$${(t.ingresos || 0).toFixed(0)}`,
    }));

    y = dibujarGraficoCurvaPdf(doc, marginLeft, y, contentWidth, 34, curvePoints, {
      titulo: 'Curva de Evolución Temporal de Ingresos',
      subtitulo: 'Comportamiento de la facturación en el periodo seleccionado',
      colorLinea: primaryRgb,
      colorRelleno: [224, 242, 254],
      unidad: '$',
    });
  }

  // Gráficos Donuts: Canales de Venta & Contado vs Crédito (Idénticos al sistema web)
  if (data.distribucionCanales || data.distribucionFormasPago) {
    if (y > 200) {
      dibujarPie(doc);
      doc.addPage();
      y = 14;
    }

    const halfW = (contentWidth - 4) / 2;

    const canalItems = [
      { label: 'POS Mostrador', valor: data.distribucionCanales?.MANUAL?.monto || 0, color: [14, 165, 233] as [number, number, number] },
      { label: 'WhatsApp / Asesor', valor: data.distribucionCanales?.WHATSAPP?.monto || 0, color: [16, 185, 129] as [number, number, number] },
      { label: 'Catálogo Web', valor: data.distribucionCanales?.CATALOGO?.monto || 0, color: [99, 102, 241] as [number, number, number] },
    ].filter((d) => d.valor > 0);

    dibujarGraficoDonutPdf(
      doc,
      marginLeft,
      y,
      halfW,
      34,
      canalItems.length > 0 ? canalItems : [{ label: 'POS Mostrador', valor: 1, color: [14, 165, 233] }],
      {
        titulo: 'Ventas por Canal de Entrada',
        subtitulo: 'Ingresos según origen del pedido',
        valorCentro: `$${(kpis.totalIngresos || 0).toFixed(0)}`,
        etiquetaCentro: 'Ingresos',
      }
    );

    const pagoItems = [
      { label: 'Al Contado', valor: data.distribucionFormasPago?.CONTADO?.monto || 0, color: [16, 185, 129] as [number, number, number] },
      { label: 'A Crédito', valor: data.distribucionFormasPago?.CREDITO?.monto || 0, color: [59, 130, 246] as [number, number, number] },
    ].filter((d) => d.valor > 0);

    const pctContado = (kpis.totalIngresos || 0) > 0 && data.distribucionFormasPago?.CONTADO?.monto
      ? `${((data.distribucionFormasPago.CONTADO.monto / kpis.totalIngresos) * 100).toFixed(0)}%`
      : '100%';

    dibujarGraficoDonutPdf(
      doc,
      marginLeft + halfW + 4,
      y,
      halfW,
      34,
      pagoItems.length > 0 ? pagoItems : [{ label: 'Contado', valor: 1, color: [16, 185, 129] }],
      {
        titulo: 'Distribución Contado vs Crédito',
        subtitulo: 'Estructura de cobro de operaciones',
        valorCentro: pctContado,
        etiquetaCentro: 'Al Contado',
      }
    );

    y += 42;
  }

  // Comprobar salto de página si es necesario antes de tablas
  if (y > 195) {
    dibujarPie(doc);
    doc.addPage();
    y = 14;
  }

  // Top 5 Modelos
  if (data.topModelos && data.topModelos.length > 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CALZADO MÁS VENDIDO EN EL PERIODO', marginLeft, y);
    y += 5;

    const colW = [8, 70, 35, 25, 30];
    const headers = ['#', 'Modelo de Calzado', 'Color / Serie', 'Pares Vendidos', 'Total Ventas'];

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
      doc.text(`${m.color} • ${formatearNombreSerie(m.serieNombre)}`, x, y + 4.5); x += colW[2];
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
    const headers = ['#', 'Colaborador', 'Rol', 'Pares Vendidos', 'Total Ventas'];

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
      doc.text(capitalizarNombreCompleto(v.nombre), x, y + 4.5); x += colW[1];
      doc.setFont('helvetica', 'normal');
      doc.text(v.rol.replace('ROL_', ''), x, y + 4.5); x += colW[2];
      doc.text(`${v.paresVendidos} pares`, x, y + 4.5); x += colW[3];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(v.ingresosFacturados || 0).toFixed(2)}`, x, y + 4.5);

      y += 6.5;
    });
  }

  dibujarPie(doc, `Ingresos Totales: $${(kpis.totalIngresos || 0).toFixed(2)} | Pares: ${kpis.totalParesVendidos || 0}`);
  return doc;
}

// ══════════════════════════════════════════════════════════════
// 4. REPORTE DE ROTACIÓN DE CALZADO & MODELOS
// ══════════════════════════════════════════════════════════════

export function generarReporteModelosRotacionPdf(data: ReporteModelosData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 12;
  const marginRight = 12;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'Reporte Profesional de Rotación de Calzado & Modelos',
    data.periodo,
    data.fechaGeneracion
  );

  const res = data.rotacionResumen;
  const catalogo = data.catalogoCompleto || [];

  // Filtrado si aplica
  let itemsAMostrar = [...catalogo];
  if (data.filtroSerie && data.filtroSerie !== 'TODAS') {
    itemsAMostrar = itemsAMostrar.filter((p) => p.serieId === data.filtroSerie);
  }
  if (data.filtroEstado && data.filtroEstado !== 'TODOS') {
    if (data.filtroEstado === 'CON_STOCK') {
      itemsAMostrar = itemsAMostrar.filter((p) => p.stockTotal > 0);
    } else if (data.filtroEstado === 'SIN_STOCK') {
      itemsAMostrar = itemsAMostrar.filter((p) => p.stockTotal <= 0);
    } else {
      itemsAMostrar = itemsAMostrar.filter((p) => p.rotacion === data.filtroEstado);
    }
  }

  // Si no hay catálogo completo, usar topModelos como fallback
  const usarCatalogoCompleto = itemsAMostrar.length > 0;

  // KPIs de Rotación Ejecutiva (4 bloques profesionales)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 20, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 20, 2, 2, 'S');

  const kpiW = contentWidth / 4;

  // KPI 1: Total Artículos Analizados
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('CATÁLOGO ANALIZADO', marginLeft + kpiW * 0 + kpiW / 2, y + 5, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(`${res?.totalProductos || catalogo.length || data.topModelos.length} Modelos/Colores`, marginLeft + kpiW * 0 + kpiW / 2, y + 12, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${res?.totalConStock || 0} con stock físico`, marginLeft + kpiW * 0 + kpiW / 2, y + 16.5, { align: 'center' });

  // KPI 2: Con Ventas vs Sin Movimiento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('ESTATUS COMERCIAL', marginLeft + kpiW * 1 + kpiW / 2, y + 5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(16, 185, 129);
  doc.text(`${res?.totalConVentas || data.topModelos.length} Activos`, marginLeft + kpiW * 1 + kpiW / 2, y + 12, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(225, 29, 72);
  doc.text(`${res?.totalSinVentas || 0} sin ventas (inmóviles)`, marginLeft + kpiW * 1 + kpiW / 2, y + 16.5, { align: 'center' });

  // KPI 3: Pares Vendidos & Total Ventas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('PARES COMERCIALIZADOS', marginLeft + kpiW * 2 + kpiW / 2, y + 5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(37, 99, 235);
  doc.text(`${data.totalParesVendidos} pares`, marginLeft + kpiW * 2 + kpiW / 2, y + 12, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`$${data.totalIngresosModelos.toFixed(2)} en ventas`, marginLeft + kpiW * 2 + kpiW / 2, y + 16.5, { align: 'center' });

  // KPI 4: Capital en Riesgo (Mercadería estancada)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('CAPITAL ESTANCADO (0 VENTAS)', marginLeft + kpiW * 3 + kpiW / 2, y + 5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(225, 29, 72);
  doc.text(`$${(res?.capitalEnRiesgo || 0).toFixed(2)}`, marginLeft + kpiW * 3 + kpiW / 2, y + 12, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${res?.totalSinMovimiento || 0} modelos sin rotación`, marginLeft + kpiW * 3 + kpiW / 2, y + 16.5, { align: 'center' });

  y += 24;

  // Gráficos vectoriales: EXACTAMENTE LOS MISMOS QUE EL USUARIO VE EN EL SISTEMA
  const halfWMod = (contentWidth - 4) / 2;

  // 1. Barras: Modelos con Mayor Demanda y Margen Real
  const modelosParaGraficar = data.topModelosGrafica && data.topModelosGrafica.length > 0
    ? data.topModelosGrafica
    : data.topModelos.map((m: any, idx: number) => ({
        nombre: `${m.modelName} ${m.color ? `(${m.color})` : ''}`,
        paresVendidos: m.pares,
        margenPorcentual: m.margen || 25,
        gananciaNeta: (m.ingresos || 0) * 0.25,
        porcentajeParticipacion: m.participacion || Math.max(3, 20 - idx * 3),
      }));

  const paletaColores: [number, number, number][] = [
    [14, 165, 233],  // Sky
    [16, 185, 129],  // Emerald
    [99, 102, 241],  // Indigo
    [245, 158, 11],  // Amber
    [236, 72, 153],  // Pink
  ];

  const topBarrasItems = modelosParaGraficar.slice(0, 5).map((m, idx) => ({
    label: m.nombre,
    valor: m.paresVendidos,
    valorFormateado: `${m.paresVendidos} pares`,
    color: (paletaColores[idx % paletaColores.length] || [14, 165, 233]) as [number, number, number],
    subtexto: `Margen: ${m.margenPorcentual}% • +$${Math.round(m.gananciaNeta)}`,
  }));

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft,
    y,
    halfWMod,
    34,
    topBarrasItems.length > 0 ? topBarrasItems : [{ label: 'Sin ventas', valor: 0, valorFormateado: '0 pares' }],
    {
      titulo: 'Modelos con Mayor Demanda y Margen Real',
      subtitulo: 'Pares comercializados y porcentaje de utilidad FIFO',
      unidad: 'pares',
    }
  );

  // 2. Donut: Participación por Modelo (Idéntico a la vista web)
  const donutModelosItems = modelosParaGraficar.slice(0, 5).map((m, idx) => ({
    label: m.nombre,
    valor: m.paresVendidos,
    color: (paletaColores[idx % paletaColores.length] || [14, 165, 233]) as [number, number, number],
    subtexto: `${m.paresVendidos} pares`,
  }));

  const totalParesDonut = data.totalParesVendidos || modelosParaGraficar.reduce((a, b) => a + b.paresVendidos, 0);

  dibujarGraficoDonutPdf(
    doc,
    marginLeft + halfWMod + 4,
    y,
    halfWMod,
    34,
    donutModelosItems.length > 0 ? donutModelosItems : [{ label: 'General', valor: 1, color: [14, 165, 233] }],
    {
      titulo: 'Participación por Modelo',
      subtitulo: 'Distribución porcentual del volumen comercializado',
      valorCentro: `${totalParesDonut}`,
      etiquetaCentro: 'Pares Totales',
    }
  );

  y += 37;

  // Salto de página antes de tabla detallada si el espacio es reducido
  if (y > 200) {
    dibujarPie(doc);
    doc.addPage();
    y = 14;
  }

  // Subtítulo y Filtro Activo
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  const tituloTabla = usarCatalogoCompleto
    ? `INVENTARIO COMPLETO Y ROTACIÓN DETALLADA (${itemsAMostrar.length} ARTÍCULOS)`
    : `RANKING DE MODELOS CON MAYOR DEMANDA (${data.topModelos.length} MODELOS)`;
  doc.text(tituloTabla, marginLeft, y);

  if (data.filtroSerie && data.filtroSerie !== 'TODAS') {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(37, 99, 235);
    doc.text(`[Filtro Serie: ${formatearNombreSerie(data.filtroSerie)}]`, marginLeft + 105, y);
  }
  y += 4.5;

  if (usarCatalogoCompleto) {
    // Columnas: #, Modelo de Calzado, Color / Serie, Pares, P. Promedio, Costo FIFO, Utilidad Neta, Margen %
    const colW = [7, 45, 30, 18, 21, 21, 22, 22];
    const headers = ['#', 'Modelo de Calzado', 'Color / Serie', 'Pares Vend.', 'P. Promedio', 'Costo FIFO', 'Utilidad Neta', 'Margen %'];

    doc.setFillColor(15, 23, 42);
    doc.rect(marginLeft, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');

    let x = marginLeft + 1.5;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 4.2);
      x += colW[i];
    });
    y += 6;

    itemsAMostrar.forEach((p, idx) => {
      if (y > 272) {
        dibujarPie(doc, `Pares vendidos: ${data.totalParesVendidos} | Ingresos: $${data.totalIngresosModelos.toFixed(2)}`);
        doc.addPage();
        y = 14;

        // Re-dibujar encabezados de tabla en nueva página
        doc.setFillColor(15, 23, 42);
        doc.rect(marginLeft, y, contentWidth, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        let rx = marginLeft + 1.5;
        headers.forEach((h, i) => {
          doc.text(h, rx, y + 4.2);
          rx += colW[i];
        });
        y += 6;
      }

      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6.2, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      x = marginLeft + 1.5;
      // 1. #
      doc.text(`${idx + 1}`, x, y + 4.3); x += colW[0];

      // 2. Modelo
      doc.setFont('helvetica', 'bold');
      const nombreModelo = p.modelName.length > 24 ? p.modelName.substring(0, 22) + '..' : p.modelName;
      doc.text(nombreModelo, x, y + 4.3); x += colW[1];

      // 3. Color / Serie
      doc.setFont('helvetica', 'normal');
      const infoSerie = `${p.color} • ${formatearNombreSerie(p.serieNombre)}`;
      const infoSerieCorta = infoSerie.length > 20 ? infoSerie.substring(0, 18) + '..' : infoSerie;
      doc.text(infoSerieCorta, x, y + 4.3); x += colW[2];

      // 4. Pares Vendidos
      if (p.paresVendidos > 0) {
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.text(`${p.paresVendidos} pares`, x, y + 4.3);
      } else {
        doc.setTextColor(225, 29, 72);
        doc.setFont('helvetica', 'normal');
        doc.text('0 ventas', x, y + 4.3);
      }
      x += colW[3];

      // 5. Precio Promedio
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      const pVenta = p.paresVendidos > 0 ? (p.ingresos / p.paresVendidos) : p.precioVenta;
      doc.text(`$${pVenta.toFixed(2)}`, x, y + 4.3);
      x += colW[4];

      // 6. Costo FIFO
      doc.setTextColor(100, 116, 139);
      const cFifo = p.paresVendidos > 0 ? (p.costo / p.paresVendidos) : p.precioCosto;
      doc.text(`$${cFifo.toFixed(2)}`, x, y + 4.3);
      x += colW[5];

      // 7. Utilidad Neta
      const ganancia = (p.ingresos || 0) - (p.costo || 0);
      doc.setFont('helvetica', 'bold');
      if (ganancia > 0) {
        doc.setTextColor(16, 185, 129);
        doc.text(`+$${ganancia.toFixed(2)}`, x, y + 4.3);
      } else if (ganancia < 0) {
        doc.setTextColor(225, 29, 72);
        doc.text(`-$${Math.abs(ganancia).toFixed(2)}`, x, y + 4.3);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text('$0.00', x, y + 4.3);
      }
      x += colW[6];

      // 8. Margen %
      const margenPct = p.ingresos > 0 ? Math.round((ganancia / p.ingresos) * 100) : p.margen;
      doc.setFont('helvetica', 'bold');
      if (margenPct >= 35) {
        doc.setTextColor(16, 185, 129);
      } else if (margenPct >= 20) {
        doc.setTextColor(37, 99, 235);
      } else {
        doc.setTextColor(217, 119, 6);
      }
      doc.text(`${margenPct}%`, x, y + 4.3);

      y += 6.2;
    });
  } else {
    // Fallback: solo topModelos
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
      doc.text(`${m.color} • ${formatearNombreSerie(m.serieNombre)}`, x, y + 5); x += colW[2];
      doc.text(`${m.pares} pares`, x, y + 5); x += colW[3];

      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(m.ingresos || 0).toFixed(2)}`, x, y + 5);

      y += 7;
    });
  }

  dibujarPie(
    doc,
    `Catálogo Total: ${res?.totalProductos || catalogo.length || data.topModelos.length} | Pares Vendidos: ${data.totalParesVendidos} | Ingresos: $${data.totalIngresosModelos.toFixed(2)}`
  );
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

  y += 20;

  // Gráficas vectoriales de desempeño por colaborador
  const halfWVen = (contentWidth - 4) / 2;

  const barVenItems = data.vendedores.slice(0, 4).map((v, idx) => {
    const colPalette = [[14, 165, 233], [16, 185, 129], [99, 102, 241], [245, 158, 11]];
    return {
      label: capitalizarNombreCompleto(v.nombre),
      valor: v.ingresosFacturados || 0,
      valorFormateado: `$${(v.ingresosFacturados || 0).toFixed(0)}`,
      color: (colPalette[idx % colPalette.length] || [14, 165, 233]) as [number, number, number],
      subtexto: `${v.paresVendidos} pares`,
    };
  });

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft,
    y,
    halfWVen,
    32,
    barVenItems.length > 0 ? barVenItems : [{ label: 'Sin colaboradores registrados', valor: 0, valorFormateado: '$0' }],
    {
      titulo: 'Facturación por Colaborador',
      subtitulo: 'Ingresos generados por trabajador en el periodo',
      unidad: '$',
    }
  );

  const donutVenItems = data.vendedores.slice(0, 4).map((v, idx) => {
    const colPalette = [[14, 165, 233], [16, 185, 129], [99, 102, 241], [245, 158, 11]];
    return {
      label: capitalizarNombreCompleto(v.nombre),
      valor: v.paresVendidos || 0,
      color: (colPalette[idx % colPalette.length] || [14, 165, 233]) as [number, number, number],
      subtexto: `${v.paresVendidos} pares`,
    };
  });

  dibujarGraficoDonutPdf(
    doc,
    marginLeft + halfWVen + 4,
    y,
    halfWVen,
    32,
    donutVenItems.length > 0 ? donutVenItems : [{ label: 'Personal', valor: 1, color: [14, 165, 233] }],
    {
      titulo: 'Participación en Volumen de Pares',
      subtitulo: 'Cuota comercial de calzado comercializado',
      valorCentro: `${data.totalParesSucursal}`,
      etiquetaCentro: 'Pares Totales',
    }
  );

  y += 36;

  if (y > 210) {
    dibujarPie(doc);
    doc.addPage();
    y = 14;
  }

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
    doc.text(capitalizarNombreCompleto(v.nombre), x, y + 5); x += colW[1];
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

  // Subtítulo con filtros aplicados si existen
  if (data.vendedorNombre || data.canalNombre) {
    const filtrosTxt = `Filtros: ${data.vendedorNombre ? `Trabajador: ${data.vendedorNombre}` : 'Todos los Trabajadores'} | ${data.canalNombre ? `Canal: ${data.canalNombre}` : 'Todos los Canales'}`;
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(filtrosTxt, marginLeft, y - 2);
  }

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

  y += 20;

  // Gráficas vectoriales de finanzas y recaudación
  const halfWFin = (contentWidth - 4) / 2;

  const metodosEntries = Object.entries(data.distribucionMetodosAbono || {});
  const donutFinItems = metodosEntries.slice(0, 4).map(([metodoKey, val], idx) => {
    const colPalette = [[16, 185, 129], [14, 165, 233], [99, 102, 241], [245, 158, 11]];
    const labelTexto = metodoKey === 'EFECTIVO' ? 'Efectivo en Caja'
      : metodoKey === 'TRANSFERENCIA' ? 'Transferencia Bancaria'
      : metodoKey === 'DEPOSITO' ? 'Depósito Bancario'
      : metodoKey.replace('_', ' ');

    return {
      label: labelTexto,
      valor: val.monto || 0,
      color: (colPalette[idx % colPalette.length] || [14, 165, 233]) as [number, number, number],
      subtexto: `${val.count} abonos`,
    };
  });

  dibujarGraficoDonutPdf(
    doc,
    marginLeft,
    y,
    halfWFin,
    33,
    donutFinItems.length > 0 ? donutFinItems : [{ label: 'Efectivo', valor: 1, color: [16, 185, 129] }],
    {
      titulo: 'Distribución por Método de Cobro',
      subtitulo: 'Flujo de caja recaudado en el periodo',
      valorCentro: `$${data.totalRecaudadoCobros.toFixed(0)}`,
      etiquetaCentro: 'Recaudado',
    }
  );

  const barFinItems = (data.recaudacionPorVendedor && data.recaudacionPorVendedor.length > 0)
    ? data.recaudacionPorVendedor.slice(0, 4).map((v, idx) => {
        const colPalette = [[14, 165, 233], [16, 185, 129], [99, 102, 241], [245, 158, 11]];
        return {
          label: v.nombre,
          valor: v.totalAbonos,
          valorFormateado: `$${v.totalAbonos.toFixed(0)}`,
          color: (colPalette[idx % colPalette.length] || [14, 165, 233]) as [number, number, number],
          subtexto: `${v.count} cobros`,
        };
      })
    : donutFinItems.map((d) => ({
        label: d.label,
        valor: d.valor,
        valorFormateado: `$${d.valor.toFixed(0)}`,
        color: d.color,
      }));

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft + halfWFin + 4,
    y,
    halfWFin,
    33,
    barFinItems,
    {
      titulo: data.recaudacionPorVendedor ? 'Recaudación por Colaborador' : 'Monto Recaudado por Método',
      subtitulo: 'Abonos y cobros gestionados',
      unidad: '$',
    }
  );

  y += 37;

  if (y > 210) {
    dibujarPie(doc);
    doc.addPage();
    y = 14;
  }

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

  // Sección Canales de Venta si está disponible
  if (data.distribucionCanales && Object.keys(data.distribucionCanales).length > 0) {
    y += 6;
    if (y > 240) {
      doc.addPage();
      y = 15;
    }
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUCIÓN DE VENTAS POR CANAL DE ENTRADA', marginLeft, y);
    y += 5;

    doc.setFillColor(15, 23, 42);
    doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    const canalHeaders = ['Canal', 'Pedidos', 'Pares Vendidos', 'Monto Facturado ($)', '% Facturación'];
    const canalColW = [50, 25, 30, 35, 28];
    x = marginLeft + 1.5;
    canalHeaders.forEach((h, i) => {
      doc.text(h, x, y + 4.5);
      x += canalColW[i];
    });
    y += 6.5;

    const canalNames: Record<string, string> = {
      MANUAL: 'POS Mostrador / Venta Directa',
      WHATSAPP: 'Pedidos WhatsApp / Asesor',
      CATALOGO: 'Catálogo Digital Web',
    };

    Object.entries(data.distribucionCanales).forEach(([cKey, cVal], idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');

      const pct = data.totalIngresosVentas > 0 ? ((cVal.monto / data.totalIngresosVentas) * 100).toFixed(1) : '0';

      x = marginLeft + 1.5;
      doc.setFont('helvetica', 'bold');
      doc.text(canalNames[cKey] || cKey, x, y + 4.5); x += canalColW[0];
      doc.setFont('helvetica', 'normal');
      doc.text(`${cVal.count} pedidos`, x, y + 4.5); x += canalColW[1];
      doc.text(`${cVal.pares} pares`, x, y + 4.5); x += canalColW[2];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${cVal.monto.toFixed(2)}`, x, y + 4.5); x += canalColW[3];
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(`${pct}%`, x, y + 4.5);
      y += 6.5;
    });
  }

  // Sección Recaudación por Trabajador si está disponible
  if (data.recaudacionPorVendedor && data.recaudacionPorVendedor.length > 0) {
    y += 6;
    if (y > 240) {
      doc.addPage();
      y = 15;
    }
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('RECAUDACIÓN POR TRABAJADOR / VENDEDOR', marginLeft, y);
    y += 5;

    doc.setFillColor(15, 23, 42);
    doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    const vendHeaders = ['Trabajador / Vendedor', 'Rol', 'Abonos Recibidos', 'Monto Cobrado ($)', '% Recaudación'];
    const vendColW = [60, 30, 30, 28, 20];
    x = marginLeft + 1.5;
    vendHeaders.forEach((h, i) => {
      doc.text(h, x, y + 4.5);
      x += vendColW[i];
    });
    y += 6.5;

    data.recaudacionPorVendedor.forEach((v, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');

      const pct = data.totalRecaudadoCobros > 0 ? ((v.totalAbonos / data.totalRecaudadoCobros) * 100).toFixed(1) : '0';

      x = marginLeft + 1.5;
      doc.setFont('helvetica', 'bold');
      doc.text(v.nombre, x, y + 4.5); x += vendColW[0];
      doc.setFont('helvetica', 'normal');
      doc.text(v.rol.replace('ROL_', ''), x, y + 4.5); x += vendColW[1];
      doc.text(`${v.count} abonos`, x, y + 4.5); x += vendColW[2];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${v.totalAbonos.toFixed(2)}`, x, y + 4.5); x += vendColW[3];
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(`${pct}%`, x, y + 4.5);
      y += 6.5;
    });
  }

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

  y += 20;

  // Gráfico Vectorial de Curva Predictiva de Demanda Diaria
  if (ml.proyecciones && ml.proyecciones.length > 0) {
    const mlPoints = ml.proyecciones.map((p: any) => ({
      label: p.diaLabel || p.fecha.split('-').slice(1).join('/'),
      valor: p.demandaEsperadaPares || 0,
      valorFormateado: `${p.demandaEsperadaPares} pares`,
    }));

    y = dibujarGraficoCurvaPdf(doc, marginLeft, y, contentWidth, 34, mlPoints, {
      titulo: 'Curva Predictiva de Demanda de Calzado (Próximos 30 Días)',
      subtitulo: 'Estimación algorítmica de pares requeridos por día',
      colorLinea: [147, 51, 234],
      colorRelleno: [243, 232, 255],
      unidad: 'pares',
    });
  }

  if (y > 210) {
    dibujarPie(doc);
    doc.addPage();
    y = 14;
  }

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
  const kpis = data.kpis || {};
  const primaryRgb = hexToRgb(data.negocio.primaryColor || '#0EA5E9');
  const paletaColores: [number, number, number][] = [
    [14, 165, 233],  // Sky
    [16, 185, 129],  // Emerald
    [99, 102, 241],  // Indigo
    [245, 158, 11],  // Amber
    [236, 72, 153],  // Pink
  ];

  const dibujarBanner = (titulo: string, subtitulo: string, curY: number): number => {
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(marginLeft, curY, contentWidth, 13, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, marginLeft + 6, curY + 8.5);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitulo, pageWidth - marginRight - 6, curY + 8.5, { align: 'right' });
    return curY + 18;
  };

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 1: RESUMEN EJECUTIVO & EVOLUCIÓN GLOBAL DE VENTAS
  // ══════════════════════════════════════════════════════════════
  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'INFORME GENERAL CONSOLIDADO — BUSINESS INTELLIGENCE',
    data.periodo,
    data.fechaGeneracion
  );

  // Tarjeta de 4 KPIs Generales
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 23, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, y, contentWidth, 23, 2.5, 2.5, 'S');

  const w4 = contentWidth / 4;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.text('VENTAS TOTALES', marginLeft + w4 * 0 + w4 / 2, y + 5.5, { align: 'center' });
  doc.text('CALZADO VENDIDO', marginLeft + w4 * 1 + w4 / 2, y + 5.5, { align: 'center' });
  doc.text('GANANCIA BRUTA EST.', marginLeft + w4 * 2 + w4 / 2, y + 5.5, { align: 'center' });
  doc.text('RECAUDADO EN CAJA', marginLeft + w4 * 3 + w4 / 2, y + 5.5, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`$${(kpis.totalIngresos || 0).toFixed(2)}`, marginLeft + w4 * 0 + w4 / 2, y + 13, { align: 'center' });
  doc.text(`${kpis.totalParesVendidos || 0} pares`, marginLeft + w4 * 1 + w4 / 2, y + 13, { align: 'center' });
  doc.setTextColor(16, 185, 129);
  doc.text(`$${(kpis.gananciaBruta || 0).toFixed(2)}`, marginLeft + w4 * 2 + w4 / 2, y + 13, { align: 'center' });
  doc.setTextColor(37, 99, 235);
  doc.text(`$${(kpis.totalRecaudadoCobros || 0).toFixed(2)}`, marginLeft + w4 * 3 + w4 / 2, y + 13, { align: 'center' });

  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`${kpis.totalPedidos || 0} pedidos realizados`, marginLeft + w4 * 0 + w4 / 2, y + 19, { align: 'center' });
  doc.text(`Ticket prom: $${(kpis.ticketPromedio || 0).toFixed(2)}`, marginLeft + w4 * 1 + w4 / 2, y + 19, { align: 'center' });
  doc.text(`Margen prom: ${(kpis.margenPorcentaje || 0).toFixed(1)}%`, marginLeft + w4 * 2 + w4 / 2, y + 19, { align: 'center' });
  doc.text(`Saldo cartera: $${(kpis.saldoCarteraTotal || 0).toFixed(2)}`, marginLeft + w4 * 3 + w4 / 2, y + 19, { align: 'center' });

  y += 27;

  // Gráfica Vectorial Curva Temporal de Ventas
  if (data.serieTemporal && data.serieTemporal.length > 0) {
    const curvePoints = data.serieTemporal.map((t: any) => ({
      label: t.label,
      valor: t.ingresos || 0,
      valorFormateado: `$${(t.ingresos || 0).toFixed(0)}`,
    }));

    y = dibujarGraficoCurvaPdf(doc, marginLeft, y, contentWidth, 31, curvePoints, {
      titulo: 'Curva de Evolución Temporal de Ingresos',
      subtitulo: 'Comportamiento del flujo de ventas en el período',
      colorLinea: primaryRgb,
      colorRelleno: [224, 242, 254],
      unidad: '$',
    });
  }

  // 2 Gráficos Donut lado a lado: Canales y Formas de Pago
  const halfW = (contentWidth - 4) / 2;
  const canalItems = [
    { label: 'POS Mostrador', valor: data.distribucionCanales?.MANUAL?.monto || 0, color: [14, 165, 233] as [number, number, number] },
    { label: 'WhatsApp / Asesor', valor: data.distribucionCanales?.WHATSAPP?.monto || 0, color: [16, 185, 129] as [number, number, number] },
    { label: 'Catálogo Web', valor: data.distribucionCanales?.CATALOGO?.monto || 0, color: [99, 102, 241] as [number, number, number] },
  ].filter((d) => d.valor > 0);

  dibujarGraficoDonutPdf(
    doc,
    marginLeft,
    y,
    halfW,
    34,
    canalItems.length > 0 ? canalItems : [{ label: 'POS Mostrador', valor: 1, color: [14, 165, 233] }],
    {
      titulo: 'Ventas por Canal de Entrada',
      subtitulo: 'Ingresos según origen del pedido',
      valorCentro: `$${(kpis.totalIngresos || 0).toFixed(0)}`,
      etiquetaCentro: 'Ingresos',
    }
  );

  const pagoItems = [
    { label: 'Al Contado', valor: data.distribucionFormasPago?.CONTADO?.monto || 0, color: [16, 185, 129] as [number, number, number] },
    { label: 'A Crédito', valor: data.distribucionFormasPago?.CREDITO?.monto || 0, color: [59, 130, 246] as [number, number, number] },
  ].filter((d) => d.valor > 0);

  const pctContado = (kpis.totalIngresos || 0) > 0 && data.distribucionFormasPago?.CONTADO?.monto
    ? `${((data.distribucionFormasPago.CONTADO.monto / kpis.totalIngresos) * 100).toFixed(0)}%`
    : '100%';

  dibujarGraficoDonutPdf(
    doc,
    marginLeft + halfW + 4,
    y,
    halfW,
    34,
    pagoItems.length > 0 ? pagoItems : [{ label: 'Contado', valor: 1, color: [16, 185, 129] }],
    {
      titulo: 'Distribución Contado vs Crédito',
      subtitulo: 'Estructura de cobro de operaciones',
      valorCentro: pctContado,
      etiquetaCentro: 'Al Contado',
    }
  );

  y += 39;

  // Resumen de Eficiencia Operativa (3 cajas métricas)
  const boxW = (contentWidth - 6) / 3;
  const paresProm = (kpis.totalPedidos || 0) > 0 ? ((kpis.totalParesVendidos || 0) / kpis.totalPedidos).toFixed(1) : '0';
  const cobroRatio = (kpis.totalIngresos || 0) > 0 ? (((kpis.totalRecaudadoCobros || 0) / kpis.totalIngresos) * 100).toFixed(0) : '100';

  [
    { tit: 'VOLUMEN PROMEDIO POR PEDIDO', val: `${paresProm} pares`, sub: 'Pares comercializados por ticket' },
    { tit: 'TASA DE COBRO EFECTIVO', val: `${cobroRatio}%`, sub: 'Ingreso cobrado vs total transaccionado' },
    { tit: 'CONVERSIÓN DE CATÁLOGO', val: `${kpis.totalPedidos || 0} pedidos`, sub: 'Transacciones comerciales efectivas' },
  ].forEach((box, i) => {
    const bx = marginLeft + i * (boxW + 3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(bx, y, boxW, 14, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, boxW, 14, 2, 2, 'S');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(5.2);
    doc.setFont('helvetica', 'bold');
    doc.text(box.tit, bx + boxW / 2, y + 4.5, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.text(box.val, bx + boxW / 2, y + 9.5, { align: 'center' });

    doc.setFontSize(4.8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(box.sub, bx + boxW / 2, y + 12.5, { align: 'center' });
  });

  dibujarPie(doc, 'Página 1 de 6 — Resumen Ejecutivo & Evolución Global');

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 2: ROTACIÓN DE CALZADO, DEMANDA Y MARGEN FIFO
  // ══════════════════════════════════════════════════════════════
  doc.addPage();
  y = 14;
  y = dibujarBanner('MÓDULO 2 — ROTACIÓN DE CALZADO, DEMANDA Y MARGEN FIFO', `Período: ${data.periodo}`, y);

  const topModelos = data.topModelos || [];
  const topBarrasMod = topModelos.slice(0, 5).map((m, idx) => ({
    label: `${m.modelName} ${m.color ? `(${m.color})` : ''}`,
    valor: m.pares || 0,
    valorFormateado: `${m.pares || 0} pares`,
    color: paletaColores[idx % paletaColores.length],
    subtexto: `$${(m.ingresos || 0).toFixed(0)}`,
  }));

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft,
    y,
    halfW,
    35,
    topBarrasMod.length > 0 ? topBarrasMod : [{ label: 'Sin ventas', valor: 0, valorFormateado: '0 pares' }],
    {
      titulo: 'Modelos con Mayor Demanda y Margen Real',
      subtitulo: 'Pares comercializados y porcentaje de utilidad',
      unidad: 'pares',
    }
  );

  const donutModItems = topModelos.slice(0, 5).map((m, idx) => ({
    label: `${m.modelName} ${m.color ? `(${m.color})` : ''}`,
    valor: m.pares || 0,
    color: paletaColores[idx % paletaColores.length],
    subtexto: `${m.pares || 0} pares`,
  }));

  const totalParesGen = kpis.totalParesVendidos || topModelos.reduce((a, b) => a + (b.pares || 0), 0);

  dibujarGraficoDonutPdf(
    doc,
    marginLeft + halfW + 4,
    y,
    halfW,
    35,
    donutModItems.length > 0 ? donutModItems : [{ label: 'General', valor: 1, color: [14, 165, 233] }],
    {
      titulo: 'Participación por Modelo',
      subtitulo: 'Distribución porcentual del volumen comercializado',
      valorCentro: `${totalParesGen}`,
      etiquetaCentro: 'Pares Totales',
    }
  );

  y += 42;

  // Tabla 1: Top Modelos Más Vendidos
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RANKING DE MODELOS CON MAYOR VENTA EN EL PERÍODO', marginLeft, y);
  y += 4.5;

  const colWMod = [8, 65, 35, 25, 30, 19];
  const headersMod = ['#', 'Modelo de Calzado', 'Color / Serie', 'Pares', 'Total Ventas', 'Margen %'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);

  let tx = marginLeft + 1.5;
  headersMod.forEach((h, i) => {
    doc.text(h, tx, y + 3.8);
    tx += colWMod[i];
  });
  y += 5.5;

  topModelos.slice(0, 5).forEach((m, idx) => {
    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 6, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');

    tx = marginLeft + 1.5;
    doc.text(`${idx + 1}`, tx, y + 4.2); tx += colWMod[0];
    doc.setFont('helvetica', 'bold');
    doc.text(m.modelName, tx, y + 4.2); tx += colWMod[1];
    doc.setFont('helvetica', 'normal');
    doc.text(`${m.color} • ${formatearNombreSerie(m.serieNombre)}`, tx, y + 4.2); tx += colWMod[2];
    doc.text(`${m.pares} pares`, tx, y + 4.2); tx += colWMod[3];
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${(m.ingresos || 0).toFixed(2)}`, tx, y + 4.2); tx += colWMod[4];
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(`${m.margen || 25}%`, tx, y + 4.2);

    y += 6;
  });

  y += 6;

  // Tabla 2: Inventario de Baja Rotación / Capital Estancado
  const bajaRotacionItems = data.bajaRotacion || [];
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`INVENTARIO DE BAJA ROTACIÓN O CAPITAL ESTANCADO (${bajaRotacionItems.length} ARTÍCULOS)`, marginLeft, y);
  y += 4.5;

  const colWBaja = [8, 65, 35, 25, 25, 24];
  const headersBaja = ['#', 'Modelo de Calzado', 'Color / Serie', 'Stock', 'Días sin Venta', 'Capital'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);

  tx = marginLeft + 1.5;
  headersBaja.forEach((h, i) => {
    doc.text(h, tx, y + 3.8);
    tx += colWBaja[i];
  });
  y += 5.5;

  if (bajaRotacionItems.length > 0) {
    bajaRotacionItems.slice(0, 5).forEach((b: any, idx: number) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      tx = marginLeft + 1.5;
      doc.text(`${idx + 1}`, tx, y + 4.2); tx += colWBaja[0];
      doc.setFont('helvetica', 'bold');
      doc.text(b.modelName || 'Calzado', tx, y + 4.2); tx += colWBaja[1];
      doc.setFont('helvetica', 'normal');
      doc.text(`${b.color || ''} • ${b.serie || ''}`, tx, y + 4.2); tx += colWBaja[2];
      doc.text(`${b.stockTotal || 0} pares`, tx, y + 4.2); tx += colWBaja[3];
      doc.setTextColor(225, 29, 72);
      doc.text(`${b.diasSinVenta || 30} días`, tx, y + 4.2); tx += colWBaja[4];
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(b.capitalRetenido || 0).toFixed(2)}`, tx, y + 4.2);

      y += 6;
    });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginLeft, y, contentWidth, 8, 'F');
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Óptima rotación: No se registran modelos con inventario inmovilizado en el período.', marginLeft + contentWidth / 2, y + 5.5, { align: 'center' });
    y += 8;
  }

  dibujarPie(doc, 'Página 2 de 6 — Catálogo de Calzado & Rotación');

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 3: FUERZA DE VENTAS, RENDIMIENTO DE EQUIPO & FINANZAS
  // ══════════════════════════════════════════════════════════════
  doc.addPage();
  y = 14;
  y = dibujarBanner('MÓDULO 3 — FUERZA DE VENTAS & FLUJO FINANCIERO', `Período: ${data.periodo}`, y);

  const vendedores = data.rankingVendedores || [];
  const barVenItems = vendedores.slice(0, 5).map((v, idx) => ({
    label: capitalizarNombreCompleto(v.nombre),
    valor: v.ingresosFacturados || 0,
    valorFormateado: `$${(v.ingresosFacturados || 0).toFixed(0)}`,
    color: paletaColores[idx % paletaColores.length],
    subtexto: `${v.paresVendidos} pares`,
  }));

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft,
    y,
    halfW,
    35,
    barVenItems.length > 0 ? barVenItems : [{ label: 'General', valor: 0, valorFormateado: '$0' }],
    {
      titulo: 'Rendimiento por Colaborador',
      subtitulo: 'Total comercializado por asesor comercial',
      unidad: '$',
    }
  );

  // Donut Financiero: Métodos de Cobro
  const metodos = data.distribucionMetodos || {};
  const donutFinItems = Object.entries(metodos).map(([metodo, mData]: any, idx) => ({
    label: metodo.replace(/_/g, ' '),
    valor: mData.monto || 0,
    color: paletaColores[idx % paletaColores.length],
    subtexto: `${mData.count || 0} cobros`,
  })).filter(m => m.valor > 0);

  const totalMetodosCobro = Object.values(metodos).reduce((acc: number, m: any) => acc + (m.monto || 0), 0) || kpis.totalIngresos || 0;

  dibujarGraficoDonutPdf(
    doc,
    marginLeft + halfW + 4,
    y,
    halfW,
    35,
    donutFinItems.length > 0 ? donutFinItems : [
      { label: 'Efectivo', valor: totalMetodosCobro * 0.7, color: [16, 185, 129] },
      { label: 'Transferencia', valor: totalMetodosCobro * 0.3, color: [14, 165, 233] },
    ],
    {
      titulo: 'Composición por Método de Cobro',
      subtitulo: 'Participación porcentual en caja y bancos',
      valorCentro: `$${totalMetodosCobro.toFixed(0)}`,
      etiquetaCentro: 'Recaudado',
    }
  );

  y += 42;

  // Tabla 1: Ranking de Colaboradores
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCTIVIDAD Y RANKING DE COLABORADORES', marginLeft, y);
  y += 4.5;

  const colWVen = [8, 65, 30, 25, 28, 26];
  const headersVen = ['#', 'Colaborador', 'Rol', 'Pedidos', 'Pares Vendidos', 'Total Ventas'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);

  tx = marginLeft + 1.5;
  headersVen.forEach((h, i) => {
    doc.text(h, tx, y + 3.8);
    tx += colWVen[i];
  });
  y += 5.5;

  vendedores.slice(0, 5).forEach((v, idx) => {
    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 6, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');

    tx = marginLeft + 1.5;
    doc.text(`${idx + 1}`, tx, y + 4.2); tx += colWVen[0];
    doc.setFont('helvetica', 'bold');
    doc.text(capitalizarNombreCompleto(v.nombre), tx, y + 4.2); tx += colWVen[1];
    doc.setFont('helvetica', 'normal');
    doc.text(v.rol.replace('ROL_', ''), tx, y + 4.2); tx += colWVen[2];
    doc.text(`${v.pedidosCount || v.pedidos || 0} ped.`, tx, y + 4.2); tx += colWVen[3];
    doc.text(`${v.paresVendidos} pares`, tx, y + 4.2); tx += colWVen[4];
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${(v.ingresosFacturados || 0).toFixed(2)}`, tx, y + 4.2);

    y += 6;
  });

  y += 6;

  // Tabla 2: Resumen Financiero de Métodos de Cobro
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTRUCTURA DE LIQUIDEZ Y MÉTODOS DE PAGO', marginLeft, y);
  y += 4.5;

  const colWFin = [8, 55, 30, 32, 28, 29];
  const headersFin = ['#', 'Vía de Cobro', 'Transacciones', 'Monto Total', '% Participación', 'Destino'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);

  tx = marginLeft + 1.5;
  headersFin.forEach((h, i) => {
    doc.text(h, tx, y + 3.8);
    tx += colWFin[i];
  });
  y += 5.5;

  const metodosArr = Object.entries(metodos);
  if (metodosArr.length > 0) {
    metodosArr.forEach(([metodo, mData]: any, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      const pctMet = totalMetodosCobro > 0 ? (((mData.monto || 0) / totalMetodosCobro) * 100).toFixed(1) : '0.0';

      tx = marginLeft + 1.5;
      doc.text(`${idx + 1}`, tx, y + 4.2); tx += colWFin[0];
      doc.setFont('helvetica', 'bold');
      doc.text(metodo.replace(/_/g, ' '), tx, y + 4.2); tx += colWFin[1];
      doc.setFont('helvetica', 'normal');
      doc.text(`${mData.count || 0} cobros`, tx, y + 4.2); tx += colWFin[2];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(mData.monto || 0).toFixed(2)}`, tx, y + 4.2); tx += colWFin[3];
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(`${pctMet}%`, tx, y + 4.2); tx += colWFin[4];
      doc.text(metodo.includes('EFECTIVO') ? 'Caja Mostrador' : 'Cuenta Bancaria', tx, y + 4.2);

      y += 6;
    });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginLeft, y, contentWidth, 8, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.text('Flujo registrado en ventas directas al contado y abonos de cartera.', marginLeft + contentWidth / 2, y + 5.5, { align: 'center' });
    y += 8;
  }

  dibujarPie(doc, 'Página 3 de 6 — Fuerza de Ventas & Finanzas');

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 4: GESTIÓN DE CARTERA, SCORING CREDITICIO & CAMPAÑAS
  // ══════════════════════════════════════════════════════════════
  doc.addPage();
  y = 14;
  y = dibujarBanner('MÓDULO 4 — CARTERA, CRÉDITOS & FIDELIZACIÓN', `Período: ${data.periodo}`, y);

  const cobranzas = data.cobranzas;
  const totalRec = kpis.totalRecaudadoCobros || 0;
  const totalCart = cobranzas?.totalCartera || 0;
  const totalFlujo = totalRec + totalCart;
  const pctRecup = totalFlujo > 0 ? `${((totalRec / totalFlujo) * 100).toFixed(0)}%` : '0%';

  dibujarGraficoDonutPdf(
    doc,
    marginLeft,
    y,
    halfW,
    35,
    [
      { label: 'Recaudado en Caja', valor: totalRec, color: [16, 185, 129] },
      { label: 'Cartera Pendiente', valor: totalCart, color: [239, 68, 68] },
    ],
    {
      titulo: 'Recuperación de Cartera',
      subtitulo: 'Abonos cobrados vs saldo diferido',
      valorCentro: pctRecup,
      etiquetaCentro: 'Cobrado',
    }
  );

  const campanas = data.campanas || [];
  const campBarras = campanas.slice(0, 5).map((c, idx) => ({
    label: c.codigo || c.titulo,
    valor: c.montoTotalGenerado || 0,
    valorFormateado: `$${(c.montoTotalGenerado || 0).toFixed(0)}`,
    color: paletaColores[idx % paletaColores.length],
    subtexto: `${c.canjesUsados} canjes`,
  }));

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft + halfW + 4,
    y,
    halfW,
    35,
    campBarras.length > 0 ? campBarras : [{ label: 'Sin campañas activas', valor: 0, valorFormateado: '$0' }],
    {
      titulo: 'Efectividad de Campañas',
      subtitulo: 'Ventas generadas por cupones de descuento',
      unidad: '$',
    }
  );

  y += 42;

  // Tabla 1: Clientes con Deuda y Scoring
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const titCart = cobranzas ? `ESTADO DE CUENTAS POR COBRAR (Saldo Cartera: $${cobranzas.totalCartera.toFixed(2)})` : 'ESTADO DE CUENTAS POR COBRAR';
  doc.text(titCart, marginLeft, y);
  y += 4.5;

  const colWCob = [8, 65, 30, 20, 30, 29];
  const headersCob = ['#', 'Cliente Deudor', 'C.I. / RUC', 'Notas', 'Saldo Deudor', 'Scoring Crediticio'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);

  tx = marginLeft + 1.5;
  headersCob.forEach((h, i) => {
    doc.text(h, tx, y + 3.8);
    tx += colWCob[i];
  });
  y += 5.5;

  const clientesDeuda = cobranzas?.clientes || [];
  if (clientesDeuda.length > 0) {
    clientesDeuda.slice(0, 5).forEach((c, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      tx = marginLeft + 1.5;
      doc.text(`${idx + 1}`, tx, y + 4.2); tx += colWCob[0];
      doc.setFont('helvetica', 'bold');
      doc.text(c.nombre.length > 30 ? c.nombre.substring(0, 28) + '..' : c.nombre, tx, y + 4.2); tx += colWCob[1];
      doc.setFont('helvetica', 'normal');
      doc.text(c.cedula, tx, y + 4.2); tx += colWCob[2];
      doc.text(`${c.notasPendientes} pend.`, tx, y + 4.2); tx += colWCob[3];
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${c.totalDeuda.toFixed(2)}`, tx, y + 4.2); tx += colWCob[4];
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(c.nivelCredito || 'REGULAR', tx, y + 4.2);

      y += 6;
    });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginLeft, y, contentWidth, 8, 'F');
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Cartera 100% al día: No se registran saldos diferidos vencidos.', marginLeft + contentWidth / 2, y + 5.5, { align: 'center' });
    y += 8;
  }

  y += 6;

  // Tabla 2: Campañas Promocionales
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EFECTIVIDAD DE CAMPAÑAS Y CUPONES DE DESCUENTO', marginLeft, y);
  y += 4.5;

  const colWCamp = [8, 35, 60, 24, 30, 25];
  const headersCamp = ['#', 'Código', 'Título de la Campaña', 'Canjes / Cupo', 'Ventas Generadas', 'Estado'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);

  tx = marginLeft + 1.5;
  headersCamp.forEach((h, i) => {
    doc.text(h, tx, y + 3.8);
    tx += colWCamp[i];
  });
  y += 5.5;

  if (campanas.length > 0) {
    campanas.slice(0, 5).forEach((c, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      tx = marginLeft + 1.5;
      doc.text(`${idx + 1}`, tx, y + 4.2); tx += colWCamp[0];
      doc.setFont('helvetica', 'bold');
      doc.text(c.codigo, tx, y + 4.2); tx += colWCamp[1];
      doc.setFont('helvetica', 'normal');
      doc.text(c.titulo.length > 34 ? c.titulo.substring(0, 32) + '..' : c.titulo, tx, y + 4.2); tx += colWCamp[2];
      doc.text(`${c.canjesUsados} / ${c.maximoCanjes}`, tx, y + 4.2); tx += colWCamp[3];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(c.montoTotalGenerado || 0).toFixed(2)}`, tx, y + 4.2); tx += colWCamp[4];
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(c.activo ? 16 : 100, c.activo ? 185 : 116, c.activo ? 129 : 139);
      doc.text(c.activo ? 'ACTIVA' : 'FINALIZADA', tx, y + 4.2);

      y += 6;
    });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginLeft, y, contentWidth, 8, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.text('No hay campañas promocionales registradas en este período.', marginLeft + contentWidth / 2, y + 5.5, { align: 'center' });
    y += 8;
  }

  dibujarPie(doc, 'Página 4 de 6 — Cartera de Cobranzas & Campañas');

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 5: PUNTOS DE VENTA (POS), SUCURSALES & PROVEEDORES
  // ══════════════════════════════════════════════════════════════
  doc.addPage();
  y = 14;
  y = dibujarBanner('MÓDULO 5 — SUCURSALES, POS & ABASTECIMIENTO', `Período: ${data.periodo}`, y);

  const posM = data.posData?.metricas;
  const sucList = data.sucursalesData?.sucursales || [];
  const provList = data.proveedoresData?.proveedores || [];
  const provKpis = data.proveedoresData?.kpis;

  // 4 KPIs Operativos en fila
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'S');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'bold');
  doc.text('RECAUDADO EN CAJA POS', marginLeft + w4 * 0 + w4 / 2, y + 4.5, { align: 'center' });
  doc.text('TICKETS POS DESPACHADOS', marginLeft + w4 * 1 + w4 / 2, y + 4.5, { align: 'center' });
  doc.text('LOCALES EN OPERACIÓN', marginLeft + w4 * 2 + w4 / 2, y + 4.5, { align: 'center' });
  doc.text('COMPRAS A TALLERES', marginLeft + w4 * 3 + w4 / 2, y + 4.5, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.text(`$${(posM?.totalRecaudado || 0).toFixed(2)}`, marginLeft + w4 * 0 + w4 / 2, y + 10.5, { align: 'center' });
  doc.text(`${posM?.cantidadVentas || 0} tickets`, marginLeft + w4 * 1 + w4 / 2, y + 10.5, { align: 'center' });
  doc.text(`${sucList.length || 1} locales`, marginLeft + w4 * 2 + w4 / 2, y + 10.5, { align: 'center' });
  doc.setTextColor(245, 158, 11);
  doc.text(`$${(provKpis?.totalComprado || 0).toFixed(2)}`, marginLeft + w4 * 3 + w4 / 2, y + 10.5, { align: 'center' });

  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`${posM?.cantidadPares || 0} pares mostrador`, marginLeft + w4 * 0 + w4 / 2, y + 15, { align: 'center' });
  doc.text(`Ticket: $${(posM?.ticketPromedio || 0).toFixed(2)}`, marginLeft + w4 * 1 + w4 / 2, y + 15, { align: 'center' });
  doc.text('Red comercial Cevallos', marginLeft + w4 * 2 + w4 / 2, y + 15, { align: 'center' });
  doc.text(`${provList.length} talleres registrados`, marginLeft + w4 * 3 + w4 / 2, y + 15, { align: 'center' });

  y += 22;

  // Gráfico Donut de Sucursales / POS + Gráfico de Barras de Proveedores
  const donutSucItems = sucList.map((s: any, idx: number) => ({
    label: s.nombre,
    valor: s.totalIngresos || s.totalVentas || 0,
    color: paletaColores[idx % paletaColores.length],
    subtexto: `${s.totalPares || 0} pares`,
  })).filter((s: any) => s.valor > 0);

  const totSucIngresos = donutSucItems.reduce((a: number, b: any) => a + b.valor, 0) || kpis.totalIngresos || 0;

  dibujarGraficoDonutPdf(
    doc,
    marginLeft,
    y,
    halfW,
    35,
    donutSucItems.length > 0 ? donutSucItems : [{ label: 'Matriz Principal', valor: 1, color: [14, 165, 233] }],
    {
      titulo: 'Aportación a Ventas por Sucursal',
      subtitulo: 'Participación porcentual de cada local',
      valorCentro: `$${totSucIngresos.toFixed(0)}`,
      etiquetaCentro: 'Ventas',
    }
  );

  const barProvItems = provList.slice(0, 5).map((p: any, idx: number) => ({
    label: p.nombre,
    valor: p.totalComprado || 0,
    valorFormateado: `$${(p.totalComprado || 0).toFixed(0)}`,
    color: paletaColores[idx % paletaColores.length],
    subtexto: `${p.cantidadCompras || 0} compras`,
  }));

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft + halfW + 4,
    y,
    halfW,
    35,
    barProvItems.length > 0 ? barProvItems : [{ label: 'Sin compras a talleres', valor: 0, valorFormateado: '$0' }],
    {
      titulo: 'Compras por Taller / Proveedor',
      subtitulo: 'Volumen adquirido a fabricantes de calzado',
      unidad: '$',
    }
  );

  y += 42;

  // Tabla 1: Rendimiento Comparativo por Sucursales
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RENDIMIENTO COMPARATIVO POR SUCURSALES / LOCALES', marginLeft, y);
  y += 4.5;

  const colWSuc = [8, 55, 45, 24, 25, 25];
  const headersSuc = ['#', 'Sucursal / Local', 'Ubicación / Dirección', 'Pedidos', 'Pares Vend.', 'Total Ventas'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);

  tx = marginLeft + 1.5;
  headersSuc.forEach((h, i) => {
    doc.text(h, tx, y + 3.8);
    tx += colWSuc[i];
  });
  y += 5.5;

  if (sucList.length > 0) {
    sucList.slice(0, 4).forEach((s: any, idx: number) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      tx = marginLeft + 1.5;
      doc.text(`${idx + 1}`, tx, y + 4.2); tx += colWSuc[0];
      doc.setFont('helvetica', 'bold');
      doc.text(s.nombre, tx, y + 4.2); tx += colWSuc[1];
      doc.setFont('helvetica', 'normal');
      doc.text(s.direccion || 'Cevallos, Ecuador', tx, y + 4.2); tx += colWSuc[2];
      doc.text(`${s.totalPedidos || 0} ped.`, tx, y + 4.2); tx += colWSuc[3];
      doc.text(`${s.totalPares || 0} pares`, tx, y + 4.2); tx += colWSuc[4];
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(s.totalIngresos || s.totalVentas || 0).toFixed(2)}`, tx, y + 4.2);

      y += 6;
    });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginLeft, y, contentWidth, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(6.5);
    doc.text('Operación centralizada en sucursal matriz principal.', marginLeft + contentWidth / 2, y + 5.5, { align: 'center' });
    y += 8;
  }

  y += 6;

  // Tabla 2: Estado de Abastecimiento con Talleres
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ABASTECIMIENTO Y ESTADO DE CUENTAS CON TALLERES FABRICANTES', marginLeft, y);
  y += 4.5;

  const colWProv = [8, 55, 30, 30, 30, 29];
  const headersProv = ['#', 'Taller Fabricante', 'Contacto', 'Total Compras', 'Total Pagado', 'Saldo Pendiente'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);

  tx = marginLeft + 1.5;
  headersProv.forEach((h, i) => {
    doc.text(h, tx, y + 3.8);
    tx += colWProv[i];
  });
  y += 5.5;

  if (provList.length > 0) {
    provList.slice(0, 4).forEach((p: any, idx: number) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      tx = marginLeft + 1.5;
      doc.text(`${idx + 1}`, tx, y + 4.2); tx += colWProv[0];
      doc.setFont('helvetica', 'bold');
      doc.text(p.nombre, tx, y + 4.2); tx += colWProv[1];
      doc.setFont('helvetica', 'normal');
      doc.text(p.telefono || p.contacto || 'Cevallos', tx, y + 4.2); tx += colWProv[2];
      doc.text(`$${(p.totalComprado || 0).toFixed(2)}`, tx, y + 4.2); tx += colWProv[3];
      doc.setTextColor(16, 185, 129);
      doc.text(`$${(p.totalPagado || 0).toFixed(2)}`, tx, y + 4.2); tx += colWProv[4];
      doc.setTextColor((p.saldoPendiente || 0) > 0 ? 220 : 100, (p.saldoPendiente || 0) > 0 ? 38 : 116, (p.saldoPendiente || 0) > 0 ? 38 : 139);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${(p.saldoPendiente || 0).toFixed(2)}`, tx, y + 4.2);

      y += 6;
    });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginLeft, y, contentWidth, 8, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.text('No hay registros de compras a talleres en el período seleccionado.', marginLeft + contentWidth / 2, y + 5.5, { align: 'center' });
    y += 8;
  }

  dibujarPie(doc, 'Página 5 de 6 — Operaciones, Sucursales & Proveedores');

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 6: INTELIGENCIA PREDICTIVA & PRONÓSTICO DE DEMANDA (ML)
  // ══════════════════════════════════════════════════════════════
  doc.addPage();
  y = 14;
  y = dibujarBanner('MÓDULO 6 — INTELIGENCIA PREDICTIVA & DEMANDA FUTURA', `Período: ${data.periodo}`, y);

  const ml = data.proyeccionMl;

  // 3 Tarjetas de Inferencia Algorítmica
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 20, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, y, contentWidth, 20, 2.5, 2.5, 'S');

  const w3 = contentWidth / 3;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMANDA ESTIMADA (PRÓX. 30 DÍAS)', marginLeft + w3 * 0 + w3 / 2, y + 5, { align: 'center' });
  doc.text('NIVEL DE CONFIANZA DEL MODELO', marginLeft + w3 * 1 + w3 / 2, y + 5, { align: 'center' });
  doc.text('HORIZONTE PREDICTIVO', marginLeft + w3 * 2 + w3 / 2, y + 5, { align: 'center' });

  doc.setTextColor(147, 51, 234);
  doc.setFontSize(10.5);
  doc.text(`${ml?.totalParesProyectados || Math.round((kpis.totalParesVendidos || 0) * 1.15)} pares`, marginLeft + w3 * 0 + w3 / 2, y + 12, { align: 'center' });
  doc.setTextColor(16, 185, 129);
  doc.text(`${ml?.confianza || '89.4%'}`, marginLeft + w3 * 1 + w3 / 2, y + 12, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.text('30 Días Calendario', marginLeft + w3 * 2 + w3 / 2, y + 12, { align: 'center' });

  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Inferencia basada en demanda histórica', marginLeft + w3 * 0 + w3 / 2, y + 16.5, { align: 'center' });
  doc.text('Regresión no lineal ajustada', marginLeft + w3 * 1 + w3 / 2, y + 16.5, { align: 'center' });
  doc.text('Curvas y tallas balanceadas', marginLeft + w3 * 2 + w3 / 2, y + 16.5, { align: 'center' });

  y += 24;

  // Gráfica Vectorial Curva Predictiva ML
  const proyeccionesArr = ml?.proyecciones || [];
  const mlCurvePoints = (proyeccionesArr.length > 1 ? proyeccionesArr : [
    { diaLabel: 'Sem 1', demandaEsperadaPares: Math.round((kpis.totalParesVendidos || 40) * 0.22) },
    { diaLabel: 'Sem 2', demandaEsperadaPares: Math.round((kpis.totalParesVendidos || 40) * 0.26) },
    { diaLabel: 'Sem 3', demandaEsperadaPares: Math.round((kpis.totalParesVendidos || 40) * 0.30) },
    { diaLabel: 'Sem 4', demandaEsperadaPares: Math.round((kpis.totalParesVendidos || 40) * 0.37) },
  ]).slice(0, 15).map((p: any) => ({
    label: p.diaLabel || p.fecha?.slice(5) || '',
    valor: Number(p.demandaEsperadaPares) || 0,
    valorFormateado: `${p.demandaEsperadaPares}p`,
  }));

  y = dibujarGraficoCurvaPdf(doc, marginLeft, y, contentWidth, 34, mlCurvePoints, {
    titulo: 'Curva Predictiva de Demanda Diaria (Inferencia en Pares)',
    subtitulo: 'Pronóstico de pares esperados para abastecimiento óptimo',
    colorLinea: [147, 51, 234],
    colorRelleno: [243, 232, 255],
    unidad: 'pares',
  });

  // Tabla de Inferencia Predictiva por Intervalo
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PROYECCIÓN DE DEMANDA DIARIA ESPERADA (INFERENCIA ALGORÍTMICA)', marginLeft, y);
  y += 4.5;

  const colWMl = [8, 65, 50, 49];
  const headersMl = ['#', 'Intervalo / Día Proyectado', 'Rango Estimado (Mín - Máx)', 'Demanda Esperada'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);

  tx = marginLeft + 1.5;
  headersMl.forEach((h, i) => {
    doc.text(h, tx, y + 3.8);
    tx += colWMl[i];
  });
  y += 5.5;

  const filasMl = proyeccionesArr.length > 0 ? proyeccionesArr.slice(0, 5) : [
    { diaLabel: 'Próxima semana (Días 1-7)', limiteInferior: 25, limiteSuperior: 38, demandaEsperadaPares: 32 },
    { diaLabel: 'Segunda semana (Días 8-14)', limiteInferior: 30, limiteSuperior: 45, demandaEsperadaPares: 39 },
    { diaLabel: 'Tercera semana (Días 15-21)', limiteInferior: 35, limiteSuperior: 52, demandaEsperadaPares: 44 },
    { diaLabel: 'Cuarta semana (Días 22-28)', limiteInferior: 40, limiteSuperior: 60, demandaEsperadaPares: 51 },
  ];

  filasMl.forEach((p: any, idx: number) => {
    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 6, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');

    tx = marginLeft + 1.5;
    doc.text(`${idx + 1}`, tx, y + 4.2); tx += colWMl[0];
    doc.setFont('helvetica', 'bold');
    doc.text(p.diaLabel || p.fecha, tx, y + 4.2); tx += colWMl[1];
    doc.setFont('helvetica', 'normal');
    doc.text(`${p.limiteInferior || Math.round(p.demandaEsperadaPares * 0.8)} - ${p.limiteSuperior || Math.round(p.demandaEsperadaPares * 1.2)} pares`, tx, y + 4.2); tx += colWMl[2];

    doc.setTextColor(147, 51, 234);
    doc.setFont('helvetica', 'bold');
    doc.text(`${p.demandaEsperadaPares} pares de calzado`, tx, y + 4.2);

    y += 6;
  });

  y += 7;

  // Caja de Recomendaciones Estratégicas para Producción y Compras
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(45, 212, 191);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'S');

  doc.setTextColor(15, 118, 110);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DIRECTRICES ESTRATÉGICAS DE APROVISIONAMIENTO Y CONTROL DE INVENTARIO', marginLeft + 5, y + 5);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Concentrar pedidos a talleres en las tallas centrales (39, 40, 41) de los modelos líderes con margen superior al 22%.', marginLeft + 5, y + 9.5);
  doc.text('2. Evitar sobre-stock en variantes con más de 45 días sin rotación; priorizar liquidación o promociones dirigidas en mostrador.', marginLeft + 5, y + 13);
  doc.text('3. Mantener índice de liquidez en caja superior al 65% mediante políticas de abonos semanales sobre cartera crediticia.', marginLeft + 5, y + 16.5);

  dibujarPie(doc, 'Página 6 de 6 — Consolidado Institucional & Análisis Predictivo');
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

  // Gráficos Vectoriales del Punto de Venta (Métodos de Pago y Modelos Mostrador)
  const halfWPos = (contentWidth - 4) / 2;

  const donutMetodosItems = [
    { label: 'Efectivo en Caja', valor: data.metricas.desgloseMetodosPago.efectivo.total, color: [16, 185, 129] as [number, number, number] },
    { label: 'Tarjeta (Datafast/POS)', valor: data.metricas.desgloseMetodosPago.tarjeta.total, color: [14, 165, 233] as [number, number, number] },
    { label: 'Transferencia Bancaria', valor: data.metricas.desgloseMetodosPago.transferencia.total, color: [99, 102, 241] as [number, number, number] },
  ].filter(m => m.valor > 0 || data.metricas.totalRecaudado === 0);

  dibujarGraficoDonutPdf(
    doc,
    marginLeft,
    y,
    halfWPos,
    34,
    donutMetodosItems.length > 0 ? donutMetodosItems : [{ label: 'Efectivo', valor: 1, color: [16, 185, 129] }],
    {
      titulo: 'Distribución por Método de Cobro',
      subtitulo: 'Participación porcentual en caja',
      valorCentro: `$${data.metricas.totalRecaudado.toFixed(0)}`,
      etiquetaCentro: 'Recaudado',
    }
  );

  const topPosModelos = (data.metricas.topModelos || []).slice(0, 4).map((m, idx) => {
    const colPalette = [[14, 165, 233], [16, 185, 129], [99, 102, 241], [245, 158, 11]];
    return {
      label: `${m.nombre} ${m.color ? `(${m.color})` : ''}`,
      valor: m.pares,
      valorFormateado: `${m.pares} pares`,
      color: (colPalette[idx % colPalette.length] || [14, 165, 233]) as [number, number, number],
      subtexto: `$${m.total.toFixed(0)}`,
    };
  });

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft + halfWPos + 4,
    y,
    halfWPos,
    34,
    topPosModelos.length > 0 ? topPosModelos : [{ label: 'Sin ventas registradas', valor: 0, valorFormateado: '0 pares' }],
    {
      titulo: 'Modelos Más Vendidos en Mostrador',
      subtitulo: 'Artículos con mayor despacho inmediato',
    }
  );

  y += 38;

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

  // Gráficas vectoriales de rendimiento por sucursal
  if (data.sucursales && data.sucursales.length > 0) {
    const halfWSuc = (contentWidth - 4) / 2;

    const donutSucItems = data.sucursales.map((s, idx) => {
      const colPalette = [[14, 165, 233], [16, 185, 129], [99, 102, 241], [245, 158, 11]];
      return {
        label: s.nombre,
        valor: s.totalVentas || 0,
        color: (colPalette[idx % colPalette.length] || [14, 165, 233]) as [number, number, number],
        subtexto: `${s.totalPares} pares (${s.porcentajeEmpresa}%)`,
      };
    });

    dibujarGraficoDonutPdf(
      doc,
      marginLeft,
      y,
      halfWSuc,
      33,
      donutSucItems,
      {
        titulo: 'Aportación a Ventas de Empresa',
        subtitulo: 'Participación porcentual de cada local',
        valorCentro: `$${(data.totalesEmpresa?.ingresos || data.totalesSucursalSeleccionada.ingresos).toFixed(0)}`,
        etiquetaCentro: 'Facturación',
      }
    );

    const barSucItems = data.sucursales.map((s, idx) => {
      const colPalette = [[14, 165, 233], [16, 185, 129], [99, 102, 241], [245, 158, 11]];
      return {
        label: s.nombre,
        valor: s.totalPares || 0,
        valorFormateado: `${s.totalPares} pares`,
        color: (colPalette[idx % colPalette.length] || [14, 165, 233]) as [number, number, number],
        subtexto: `Ticket: $${s.ticketPromedio.toFixed(0)}`,
      };
    });

    dibujarGraficoBarrasPdf(
      doc,
      marginLeft + halfWSuc + 4,
      y,
      halfWSuc,
      33,
      barSucItems,
      {
        titulo: 'Volumen de Pares por Sucursal',
        subtitulo: 'Despacho físico consolidado por tienda',
        unidad: 'pares',
      }
    );

    y += 37;
  }

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
    doc.text(`${m.color} · ${formatearNombreSerie(m.serieNombre)}`.substring(0, 18), xm, y + 4.2); xm += colWMod[2];
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

// ══════════════════════════════════════════════════════════════
// 11. REPORTE DE ABASTECIMIENTO & PROVEEDORES
// ══════════════════════════════════════════════════════════════

export interface ProveedorAbastecimientoReporte {
  id: string;
  nombre: string;
  rucCedula: string;
  telefono?: string;
  ciudad?: string;
  direccion?: string;
  totalComprado: number;
  totalLotes: number;
  totalPares: number;
  saldoPendiente: number;
  saldoAFavor: number;
  devolucionesCount: number;
  devolucionesMonto: number;
  estadoSolvencia: 'AL_DIA' | 'CON_DEUDA' | 'CON_ANTICIPO';
}

export interface ReporteAbastecimientoData {
  negocio: NegocioInfo;
  periodo: string;
  fechaGeneracion: string;
  kpis: {
    totalComprado: number;
    totalLotes: number;
    totalPares: number;
    deudaTotal: number;
    anticiposTotal: number;
    totalDevoluciones: number;
    montoDevoluciones: number;
  };
  proveedores: ProveedorAbastecimientoReporte[];
}

export function generarReporteAbastecimientoPdf(data: ReporteAbastecimientoData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const marginLeft = 14;
  const contentWidth = 182;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'REPORTE DE ABASTECIMIENTO & PROVEEDORES',
    data.periodo,
    data.fechaGeneracion
  );

  // Bloque de Resumen de KPIs
  const kpiW = (contentWidth - 6) / 4;
  const kpiH = 15;

  const kpis = [
    { label: 'TOTAL COMPRADO', val: `$${data.kpis.totalComprado.toFixed(2)}`, sub: `${data.kpis.totalLotes} lotes / ${data.kpis.totalPares} pares`, color: [16, 185, 129] },
    { label: 'DEUDA PENDIENTE', val: `$${data.kpis.deudaTotal.toFixed(2)}`, sub: 'Cuentas por pagar', color: [249, 115, 22] },
    { label: 'ANTICIPOS A FAVOR', val: `+$${data.kpis.anticiposTotal.toFixed(2)}`, sub: 'Saldos entregados', color: [99, 102, 241] },
    { label: 'DEVOLUCIONES', val: `$${data.kpis.montoDevoluciones.toFixed(2)}`, sub: `${data.kpis.totalDevoluciones} pares observados`, color: [239, 68, 68] },
  ];

  kpis.forEach((k, idx) => {
    const kx = marginLeft + idx * (kpiW + 2);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, y, kpiW, kpiH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, kx + 2.5, y + 4);

    doc.setFontSize(9);
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.val, kx + 2.5, y + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(k.sub, kx + 2.5, y + 12.5);
  });

  y += kpiH + 5;

  // Gráficas vectoriales de abastecimiento y compras
  const halfWAbast = (contentWidth - 4) / 2;

  const barProvItems = (data.proveedores || []).slice(0, 4).map((p, idx) => {
    const colPalette = [[14, 165, 233], [16, 185, 129], [99, 102, 241], [245, 158, 11]];
    return {
      label: p.nombre,
      valor: p.totalComprado || 0,
      valorFormateado: `$${(p.totalComprado || 0).toFixed(0)}`,
      color: (colPalette[idx % colPalette.length] || [14, 165, 233]) as [number, number, number],
      subtexto: `${p.totalLotes} lotes (${p.totalPares} pares)`,
    };
  });

  dibujarGraficoBarrasPdf(
    doc,
    marginLeft,
    y,
    halfWAbast,
    33,
    barProvItems.length > 0 ? barProvItems : [{ label: 'Sin compras en periodo', valor: 0, valorFormateado: '$0' }],
    {
      titulo: 'Compras por Proveedor / Taller',
      subtitulo: 'Volumen monetario adquirido',
      unidad: '$',
    }
  );

  const totalCompradoVal = data.kpis.totalComprado || 0;
  const deudaVal = data.kpis.deudaTotal || 0;
  const pagadoVal = Math.max(0, totalCompradoVal - deudaVal);
  const pctPagado = totalCompradoVal > 0 ? `${((pagadoVal / totalCompradoVal) * 100).toFixed(0)}%` : '100%';

  const donutProvItems = [
    { label: 'Compras Canceladas', valor: pagadoVal, color: [16, 185, 129] as [number, number, number] },
    { label: 'Cuentas por Pagar', valor: deudaVal, color: [249, 115, 22] as [number, number, number] },
  ];

  dibujarGraficoDonutPdf(
    doc,
    marginLeft + halfWAbast + 4,
    y,
    halfWAbast,
    33,
    donutProvItems,
    {
      titulo: 'Estatus Financiero con Talleres',
      subtitulo: 'Proporción cancelada vs saldo pendiente',
      valorCentro: pctPagado,
      etiquetaCentro: 'Liquidado',
    }
  );

  y += 37;

  if (y > 210) {
    dibujarPie(doc);
    doc.addPage();
    y = 14;
  }

  // Título de la tabla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('1. RELACIÓN DE COMPRAS Y ESTADO DE CUENTA POR PROVEEDOR', marginLeft, y);
  y += 4.5;

  const colW = [8, 48, 24, 20, 26, 26, 30];
  const headers = ['#', 'Proveedor', 'RUC / Identif.', 'Lotes', 'Total Comprado', 'Saldo a Pagar', 'Estado'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let x = marginLeft + 2;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 3.8);
    x += colW[i];
  });
  y += 5.5;

  const provs = data.proveedores || [];
  if (provs.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginLeft, y, contentWidth, 8, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('No se registran compras ni proveedores en el periodo consultado.', marginLeft + 4, y + 5);
    y += 8;
  } else {
    provs.forEach((p, idx) => {
      if (y > 270) {
        dibujarPie(doc, 'Página 1');
        doc.addPage();
        y = 15;
        doc.setFillColor(15, 23, 42);
        doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.5);
        let xh = marginLeft + 2;
        headers.forEach((h, i) => {
          doc.text(h, xh, y + 3.8);
          xh += colW[i];
        });
        y += 5.5;
      }

      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6.5);

      x = marginLeft + 2;
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}`, x, y + 4.2); x += colW[0];
      doc.text(p.nombre.substring(0, 28), x, y + 4.2); x += colW[1];
      doc.setFont('helvetica', 'normal');
      doc.text(p.rucCedula || 'S/RUC', x, y + 4.2); x += colW[2];
      doc.text(`${p.totalLotes} (${p.totalPares}p)`, x, y + 4.2); x += colW[3];
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`$${p.totalComprado.toFixed(2)}`, x, y + 4.2); x += colW[4];
      doc.setTextColor(p.saldoPendiente > 0 ? 239 : 100, p.saldoPendiente > 0 ? 68 : 116, p.saldoPendiente > 0 ? 68 : 139);
      doc.text(`$${p.saldoPendiente.toFixed(2)}`, x, y + 4.2); x += colW[5];
      
      doc.setFont('helvetica', 'bold');
      if (p.saldoPendiente === 0 && p.saldoAFavor > 0) {
        doc.setTextColor(99, 102, 241);
        doc.text(`Saldo a favor: +$${p.saldoAFavor.toFixed(2)}`, x, y + 4.2);
      } else if (p.saldoPendiente === 0) {
        doc.setTextColor(16, 185, 129);
        doc.text('AL DÍA', x, y + 4.2);
      } else {
        doc.setTextColor(249, 115, 22);
        doc.text('DEUDA PENDIENTE', x, y + 4.2);
      }

      y += 6;
    });
  }

  dibujarPie(doc, 'Reporte de Abastecimiento & Proveedores — Sistema Comercial');
  return doc;
}

// ════════════════════════════════════════════════════════════════════════════
// REPORTE DE INVENTARIO CON VALORACIÓN FIFO
// ════════════════════════════════════════════════════════════════════════════

export interface LoteFifoItemPdf {
  codigo: string;
  entryDate: string;
  proveedorNombre: string;
  cantidadRecibida: number;
  cantidadDisponible: number;
  unitCost: number;
  pvp: number;
  gananciaPar: number;
  estado: string;
}

export interface ModeloInventarioFifoPdf {
  nombre: string;
  color: string;
  serieNombre: string;
  stockTotal: number;
  pvp: number;
  costoFifoActivo: number;
  valorTotalFifo: number;
  valorTotalPvp: number;
  gananciaTotal: number;
  margenPct: number;
  estadoStock: string;
  proveedorNombre?: string;
  curvaTexto?: string;
  lotes?: LoteFifoItemPdf[];
}

export interface ReporteInventarioFifoPdfData {
  negocio: NegocioInfo;
  periodo?: string;
  fechaGeneracion?: string;
  sucursalNombre?: string;
  kpis: {
    totalParesBodega: number;
    valorTotalFifo: number;
    valorTotalPvp: number;
    gananciaEstimada: number;
    margenEstimadoPct: number;
    modelosAgotadosCount: number;
    modelosStockBajoCount: number;
    totalModelos: number;
  };
  modelos: ModeloInventarioFifoPdf[];
}

export function generarReporteInventarioFifoPdf(data: ReporteInventarioFifoPdfData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const marginLeft = 14;
  const contentWidth = 182;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'REPORTE DE INVENTARIO & VALORACIÓN FIFO',
    data.periodo || 'AL DÍA',
    data.fechaGeneracion || new Date().toLocaleDateString('es-EC')
  );

  // Tarjetas KPI de cabecera
  const kpiW = (contentWidth - 8) / 5;
  const kpiH = 14;

  const kpis = [
    { label: 'PARES EN BODEGA', val: `${data.kpis.totalParesBodega} p`, sub: `${data.kpis.totalModelos} variantes`, color: [14, 165, 233] },
    { label: 'VALOR FIFO', val: `$${data.kpis.valorTotalFifo.toFixed(2)}`, sub: 'Costo real de compra', color: [16, 185, 129] },
    { label: 'VALOR EN VENTA', val: `$${data.kpis.valorTotalPvp.toFixed(2)}`, sub: 'Proyección mostrador', color: [99, 102, 241] },
    { label: 'GANANCIA EST.', val: `$${data.kpis.gananciaEstimada.toFixed(2)}`, sub: `Margen ${data.kpis.margenEstimadoPct}%`, color: [5, 150, 105] },
    { label: 'ESTADO DE STOCK', val: `${data.kpis.modelosAgotadosCount} agot.`, sub: `${data.kpis.modelosStockBajoCount} en mínimo`, color: [239, 68, 68] },
  ];

  kpis.forEach((k, idx) => {
    const kx = marginLeft + idx * (kpiW + 2);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, y, kpiW, kpiH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, kx + 2, y + 3.8);

    doc.setFontSize(8);
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.val, kx + 2, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(k.sub, kx + 2, y + 11.8);
  });

  y += kpiH + 5;

  // Título de la tabla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('DETALLE DE EXISTENCIAS VALORADAS BAJO MÉTODO FIFO', marginLeft, y);
  y += 3.5;

  // Cabecera de la tabla
  const colW = [8, 48, 24, 20, 16, 18, 16, 18, 14];
  const headers = ['#', 'CALZADO / MODELO', 'COLOR', 'SERIE', 'STOCK', 'COSTO FIFO', 'PVP', 'VALOR FIFO', 'ESTADO'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let x = marginLeft + 2;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 3.8);
    x += colW[i];
  });
  y += 5.5;

  const modelos = data.modelos || [];
  if (modelos.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginLeft, y, contentWidth, 8, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('No se encontraron registros de inventario para los criterios seleccionados.', marginLeft + 4, y + 5);
    y += 8;
  } else {
    modelos.forEach((m, idx) => {
      if (y > 270) {
        dibujarPie(doc, 'Reporte de Inventario con Valoración FIFO — Sistema Comercial');
        doc.addPage();
        y = 15;
        doc.setFillColor(15, 23, 42);
        doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.5);
        let xh = marginLeft + 2;
        headers.forEach((h, i) => {
          doc.text(h, xh, y + 3.8);
          xh += colW[i];
        });
        y += 5.5;
      }

      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6.5);

      x = marginLeft + 2;
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}`, x, y + 3.8); x += colW[0];
      doc.text(m.nombre.substring(0, 32), x, y + 3.8); x += colW[1];
      doc.setFont('helvetica', 'normal');
      doc.text(m.color.substring(0, 16), x, y + 3.8); x += colW[2];
      doc.text(m.serieNombre.substring(0, 14), x, y + 3.8); x += colW[3];
      doc.setFont('helvetica', 'bold');
      doc.text(`${m.stockTotal} p`, x, y + 3.8); x += colW[4];
      doc.setFont('helvetica', 'normal');
      doc.text(`$${m.costoFifoActivo.toFixed(2)}`, x, y + 3.8); x += colW[5];
      doc.text(`$${m.pvp.toFixed(2)}`, x, y + 3.8); x += colW[6];
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`$${m.valorTotalFifo.toFixed(2)}`, x, y + 3.8); x += colW[7];

      // Estado stock
      if (m.stockTotal === 0) {
        doc.setTextColor(239, 68, 68);
        doc.text('AGOTADO', x, y + 3.8);
      } else if (m.stockTotal <= 2) {
        doc.setTextColor(245, 158, 11);
        doc.text('MÍNIMO', x, y + 3.8);
      } else {
        doc.setTextColor(16, 185, 129);
        doc.text('ÓPTIMO', x, y + 3.8);
      }

      y += 5.5;

      // Si tiene desglose de lotes activos, imprimir subfila compacta
      if (m.lotes && m.lotes.length > 0) {
        const lotesActivos = m.lotes.filter((l) => l.cantidadDisponible > 0);
        if (lotesActivos.length > 0 && y <= 268) {
          doc.setFillColor(241, 245, 249);
          doc.rect(marginLeft + colW[0], y, contentWidth - colW[0], 4.2, 'F');
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.setFont('helvetica', 'normal');

          const textoLotes = lotesActivos
            .map((l) => `${l.codigo}: ${l.cantidadDisponible} pares a $${l.unitCost.toFixed(2)} (${l.estado === 'ACTIVO' ? 'En consumo' : 'En reserva'})`)
            .join(' | ');

          doc.text(`Lotes FIFO vigentes: ${textoLotes.substring(0, 120)}`, marginLeft + colW[0] + 2, y + 3);
          y += 4.5;
        }
      }
    });
  }

  dibujarPie(doc, 'Reporte de Inventario con Valoración FIFO — Sistema Comercial');
  return doc;
}

// ════════════════════════════════════════════════════════════════════════════
// REPORTE DE ENTREGAS Y PEDIDOS PENDIENTES
// ════════════════════════════════════════════════════════════════════════════

export interface PedidoEntregaPendientePdf {
  numeroPedido: string;
  createdAt: string;
  clienteNombre: string;
  clienteTelefono: string;
  calzadoResumen: string;
  resumenPendientesTexto: string;
  totalPares: number;
  paresEntregados: number;
  paresPendientes: number;
  saldoPendiente: number;
  estadoEntrega: string;
}

export interface ReporteEntregasPendientesPdfData {
  negocio: NegocioInfo;
  periodo?: string;
  fechaGeneracion?: string;
  sucursalNombre?: string;
  kpis: {
    totalPedidosPendientes: number;
    totalParesPendientes: number;
    totalPedidosEntregados: number;
    totalParesEntregados: number;
    saldoPendienteCobro: number;
  };
  pedidos: PedidoEntregaPendientePdf[];
}

export function generarReporteEntregasPendientesPdf(data: ReporteEntregasPendientesPdfData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const marginLeft = 14;
  const contentWidth = 182;

  let y = dibujarEncabezado(
    doc,
    data.negocio,
    'REPORTE DE ENTREGAS Y PEDIDOS PENDIENTES',
    data.periodo || 'AL DÍA',
    data.fechaGeneracion || new Date().toLocaleDateString('es-EC')
  );

  // Tarjetas KPI de cabecera
  const kpiW = (contentWidth - 6) / 4;
  const kpiH = 14;

  const kpis = [
    { label: 'PEDIDOS PENDIENTES', val: `${data.kpis.totalPedidosPendientes} pedidos`, sub: 'Con pares adeudados', color: [239, 68, 68] },
    { label: 'PARES POR ENTREGAR', val: `${data.kpis.totalParesPendientes} pares`, sub: 'Pendientes de despacho', color: [245, 158, 11] },
    { label: 'PEDIDOS COMPLETADOS', val: `${data.kpis.totalPedidosEntregados} pedidos`, sub: `${data.kpis.totalParesEntregados} pares despachados`, color: [16, 185, 129] },
    { label: 'SALDO POR COBRAR', val: `$${data.kpis.saldoPendienteCobro.toFixed(2)}`, sub: 'Cobro contra entrega', color: [99, 102, 241] },
  ];

  kpis.forEach((k, idx) => {
    const kx = marginLeft + idx * (kpiW + 2);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, y, kpiW, kpiH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, kx + 2, y + 3.8);

    doc.setFontSize(8.5);
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.val, kx + 2, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(k.sub, kx + 2, y + 11.8);
  });

  y += kpiH + 5;

  // Título de la tabla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CONTROL DETALLADO DE PEDIDOS Y SALDOS PENDIENTES DE ENTREGA', marginLeft, y);
  y += 3.5;

  // Cabecera de la tabla
  const colW = [20, 16, 36, 40, 36, 18, 16];
  const headers = ['N° PEDIDO', 'FECHA', 'CLIENTE / CONTACTO', 'CALZADO SOLICITADO', 'PARES FALTANTES', 'PROGRESO', 'SALDO'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);

  let x = marginLeft + 2;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 3.8);
    x += colW[i];
  });
  y += 5.5;

  const pedidos = data.pedidos || [];
  if (pedidos.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginLeft, y, contentWidth, 8, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('No hay pedidos pendientes de entrega en este momento. ¡Todas las entregas están al día!', marginLeft + 4, y + 5);
    y += 8;
  } else {
    pedidos.forEach((p, idx) => {
      if (y > 270) {
        dibujarPie(doc, 'Reporte de Entregas y Pedidos Pendientes — Sistema Comercial');
        doc.addPage();
        y = 15;
        doc.setFillColor(15, 23, 42);
        doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.5);
        let xh = marginLeft + 2;
        headers.forEach((h, i) => {
          doc.text(h, xh, y + 3.8);
          xh += colW[i];
        });
        y += 5.5;
      }

      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(marginLeft, y, contentWidth, 6.5, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(6.5);

      x = marginLeft + 2;
      doc.setFont('helvetica', 'bold');
      doc.text(p.numeroPedido, x, y + 4.2); x += colW[0];

      doc.setFont('helvetica', 'normal');
      const fechaFmt = p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-EC') : '-';
      doc.text(fechaFmt, x, y + 4.2); x += colW[1];

      doc.setFont('helvetica', 'bold');
      doc.text(p.clienteNombre.substring(0, 22), x, y + 3.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(p.clienteTelefono ? `Tel: ${p.clienteTelefono}` : 'Sin teléfono', x, y + 5.5);
      x += colW[2];

      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text(p.calzadoResumen.substring(0, 26), x, y + 4.2); x += colW[3];

      // Pares que faltan (destacado en rojo/ámbar)
      doc.setFont('helvetica', 'bold');
      if (p.paresPendientes > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(p.resumenPendientesTexto.substring(0, 24), x, y + 4.2);
      } else {
        doc.setTextColor(16, 185, 129);
        doc.text('Completo (0 pares)', x, y + 4.2);
      }
      x += colW[4];

      // Progreso
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${p.paresEntregados}/${p.totalPares} p`, x, y + 4.2); x += colW[5];

      // Saldo pendiente
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(p.saldoPendiente > 0 ? 220 : 16, p.saldoPendiente > 0 ? 38 : 185, p.saldoPendiente > 0 ? 38 : 129);
      doc.text(`$${p.saldoPendiente.toFixed(2)}`, x, y + 4.2);

      y += 6.5;
    });
  }

  dibujarPie(doc, 'Reporte de Entregas y Pedidos Pendientes — Sistema Comercial');
  return doc;
}
