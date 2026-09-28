import { jsPDF } from 'jspdf';

// ══════════════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════════════

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

export interface ReporteCobranzasData {
  negocio: {
    nombre: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
  };
  periodo: string;
  fechaGeneracion: string;
  totalCartera: number;
  totalClientes: number;
  totalRecaudado: number;
  clientes: ClienteDeudor[];
}

export interface ReporteCampanasData {
  negocio: {
    nombre: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
  };
  periodo: string;
  fechaGeneracion: string;
  campanas: CampanaReporte[];
}

// ══════════════════════════════════════════════════════════════
// 1. REPORTE DE COBRANZAS - CLIENTES QUE DEBEN
// ══════════════════════════════════════════════════════════════

export function generarReporteCobranzasPdf(data: ReporteCobranzasData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 14;

  // ── Encabezado Institucional ──
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(marginLeft, y, contentWidth, 32, 2.5, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.negocio.nombre || 'NEXORA', marginLeft + 8, y + 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  if (data.negocio.ruc) doc.text(`RUC: ${data.negocio.ruc}`, marginLeft + 8, y + 18);
  if (data.negocio.direccion) doc.text(data.negocio.direccion, marginLeft + 8, y + 23);
  if (data.negocio.telefono) doc.text(`Tel: ${data.negocio.telefono}`, marginLeft + 8, y + 28);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE COBRANZAS', pageWidth - marginRight - 8, y + 12, { align: 'right' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periodo: ${data.periodo}`, pageWidth - marginRight - 8, y + 18, { align: 'right' });
  doc.text(`Generado: ${data.fechaGeneracion}`, pageWidth - marginRight - 8, y + 23, { align: 'right' });

  y += 38;

  // ── KPIs Resumidos ──
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'S');

  const kpiW = contentWidth / 3;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('CARTERA PENDIENTE', marginLeft + kpiW * 0 + kpiW / 2, y + 6, { align: 'center' });
  doc.text('CLIENTES DEUDORES', marginLeft + kpiW * 1 + kpiW / 2, y + 6, { align: 'center' });
  doc.text('RECAUDADO EN PERIODO', marginLeft + kpiW * 2 + kpiW / 2, y + 6, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`$${data.totalCartera.toFixed(2)}`, marginLeft + kpiW * 0 + kpiW / 2, y + 14, { align: 'center' });
  doc.text(`${data.totalClientes}`, marginLeft + kpiW * 1 + kpiW / 2, y + 14, { align: 'center' });

  doc.setTextColor(16, 185, 129);
  doc.text(`$${data.totalRecaudado.toFixed(2)}`, marginLeft + kpiW * 2 + kpiW / 2, y + 14, { align: 'center' });

  y += 24;

  // ── Tabla de Clientes Deudores ──
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DE CLIENTES CON SALDO PENDIENTE', marginLeft, y);
  y += 6;

  // Cabecera de tabla
  const colWidths = [8, 42, 26, 18, 22, 22, 22, 22];
  const headers = ['#', 'Cliente', 'Cedula', 'Notas', 'Deuda Total', 'Ultimo Abono', 'Nivel', 'Score'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');

  let xPos = marginLeft + 2;
  headers.forEach((h, i) => {
    doc.text(h, xPos, y + 5);
    xPos += colWidths[i];
  });
  y += 8;

  // Filas de datos
  const clientesOrdenados = [...data.clientes].sort((a, b) => b.totalDeuda - a.totalDeuda);

  clientesOrdenados.forEach((c, idx) => {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 14;
      // Re-pintar cabecera
      doc.setFillColor(15, 23, 42);
      doc.rect(marginLeft, y, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      let xh = marginLeft + 2;
      headers.forEach((h, i) => {
        doc.text(h, xh, y + 5);
        xh += colWidths[i];
      });
      y += 8;
    }

    const bgColor = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');

    xPos = marginLeft + 2;
    doc.text(`${idx + 1}`, xPos, y + 5);
    xPos += colWidths[0];

    doc.setFont('helvetica', 'bold');
    const nombreCorto = c.nombre.length > 24 ? c.nombre.substring(0, 22) + '..' : c.nombre;
    doc.text(nombreCorto, xPos, y + 5);
    xPos += colWidths[1];

    doc.setFont('helvetica', 'normal');
    doc.text(c.cedula || '-', xPos, y + 5);
    xPos += colWidths[2];

    doc.text(`${c.notasPendientes}`, xPos, y + 5);
    xPos += colWidths[3];

    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${c.totalDeuda.toFixed(2)}`, xPos, y + 5);
    xPos += colWidths[4];

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    const ultimoAbonoStr = c.ultimoAbono
      ? new Date(c.ultimoAbono).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: '2-digit' })
      : 'Sin abonos';
    doc.text(ultimoAbonoStr, xPos, y + 5);
    xPos += colWidths[5];

    const nivelStr = c.nivelCredito ? c.nivelCredito.replace('NIVEL_', 'Nv.') : '-';
    doc.text(nivelStr, xPos, y + 5);
    xPos += colWidths[6];

    const scoreStr = c.scoreCrediticio !== undefined ? `${c.scoreCrediticio}` : '-';
    doc.text(scoreStr, xPos, y + 5);

    y += 7.5;
  });

  // ── Pie de página ──
  y += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 5;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento generado por NEXORA. Este reporte es de uso exclusivamente interno y confidencial.', marginLeft, y);
  doc.text(`Total Clientes: ${data.totalClientes} | Cartera Activa: $${data.totalCartera.toFixed(2)}`, pageWidth - marginRight, y, { align: 'right' });

  return doc;
}

// ══════════════════════════════════════════════════════════════
// 2. REPORTE DE CAMPANAS PROMOCIONALES
// ══════════════════════════════════════════════════════════════

export function generarReporteCampanasPdf(data: ReporteCampanasData): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 14;

  // ── Encabezado Institucional ──
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(marginLeft, y, contentWidth, 28, 2.5, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.negocio.nombre || 'NEXORA', marginLeft + 8, y + 11);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  if (data.negocio.ruc) doc.text(`RUC: ${data.negocio.ruc}`, marginLeft + 8, y + 17);
  if (data.negocio.direccion) doc.text(data.negocio.direccion, marginLeft + 8, y + 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE CAMPANAS PROMOCIONALES', pageWidth - marginRight - 8, y + 11, { align: 'right' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periodo: ${data.periodo}`, pageWidth - marginRight - 8, y + 17, { align: 'right' });
  doc.text(`Generado: ${data.fechaGeneracion}`, pageWidth - marginRight - 8, y + 22, { align: 'right' });

  y += 34;

  // ── KPIs Globales ──
  const totalCampanas = data.campanas.length;
  const campanasActivas = data.campanas.filter((c) => c.activo).length;
  const totalVentas = data.campanas.reduce((s, c) => s + c.montoTotalGenerado, 0);
  const totalDescuentos = data.campanas.reduce((s, c) => s + c.descuentoTotalOtorgado, 0);
  const totalCanjes = data.campanas.reduce((s, c) => s + c.canjesUsados, 0);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'S');

  const kW = contentWidth / 5;
  const kpiLabels = ['CAMPANAS TOTAL', 'ACTIVAS', 'VENTAS GENERADAS', 'DESCUENTOS OTORGADOS', 'CANJES REALIZADOS'];
  const kpiValues = [`${totalCampanas}`, `${campanasActivas}`, `$${totalVentas.toFixed(2)}`, `$${totalDescuentos.toFixed(2)}`, `${totalCanjes}`];

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  kpiLabels.forEach((lbl, i) => {
    doc.text(lbl, marginLeft + kW * i + kW / 2, y + 5, { align: 'center' });
  });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  kpiValues.forEach((val, i) => {
    doc.text(val, marginLeft + kW * i + kW / 2, y + 12, { align: 'center' });
  });

  y += 22;

  // ── Tabla de Campanas ──
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DE CAMPANAS Y RENDIMIENTO', marginLeft, y);
  y += 5;

  const colW = [8, 28, 48, 22, 18, 22, 22, 22, 24, 22, 22, 22];
  const hdrs = ['#', 'Codigo', 'Titulo', 'Tipo Desc.', 'Valor', 'Max Canjes', 'Usados', 'Conversion', 'Ventas Gen.', 'Desc. Otorg.', 'Clientes', 'Estado'];

  doc.setFillColor(15, 23, 42);
  doc.rect(marginLeft, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');

  let x = marginLeft + 1.5;
  hdrs.forEach((h, i) => {
    doc.text(h, x, y + 5);
    x += colW[i];
  });
  y += 8;

  // Filas
  data.campanas.forEach((c, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 14;
      doc.setFillColor(15, 23, 42);
      doc.rect(marginLeft, y, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      let xh = marginLeft + 1.5;
      hdrs.forEach((h, i) => {
        doc.text(h, xh, y + 5);
        xh += colW[i];
      });
      y += 8;
    }

    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');

    x = marginLeft + 1.5;
    doc.text(`${idx + 1}`, x, y + 5); x += colW[0];
    doc.setFont('helvetica', 'bold');
    doc.text(c.codigo, x, y + 5); x += colW[1];
    doc.setFont('helvetica', 'normal');

    const tituloCorto = c.titulo.length > 28 ? c.titulo.substring(0, 26) + '..' : c.titulo;
    doc.text(tituloCorto, x, y + 5); x += colW[2];

    const tipoMap: Record<string, string> = {
      'PORCENTAJE': '% Porcentaje',
      'MONTO_FIJO': '$ Monto Fijo',
      'DESCUENTO_POR_PAR': '$/Par',
    };
    doc.text(tipoMap[c.tipoDescuento] || c.tipoDescuento, x, y + 5); x += colW[3];

    const valorStr = c.tipoDescuento === 'PORCENTAJE' ? `${c.valorDescuento}%` : `$${c.valorDescuento.toFixed(2)}`;
    doc.text(valorStr, x, y + 5); x += colW[4];
    doc.text(`${c.maximoCanjes}`, x, y + 5); x += colW[5];
    doc.text(`${c.canjesUsados}`, x, y + 5); x += colW[6];

    const conversionPct = c.maximoCanjes > 0 ? ((c.canjesUsados / c.maximoCanjes) * 100).toFixed(1) : '0';
    doc.text(`${conversionPct}%`, x, y + 5); x += colW[7];

    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${c.montoTotalGenerado.toFixed(2)}`, x, y + 5); x += colW[8];

    doc.setTextColor(220, 38, 38);
    doc.text(`$${c.descuentoTotalOtorgado.toFixed(2)}`, x, y + 5); x += colW[9];

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(`${c.clientesAlcanzados}`, x, y + 5); x += colW[10];

    if (c.activo) {
      doc.setTextColor(16, 185, 129);
      doc.text('ACTIVA', x, y + 5);
    } else {
      doc.setTextColor(148, 163, 184);
      doc.text('FINALIZADA', x, y + 5);
    }

    y += 7.5;
  });

  // ── Pie ──
  y += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 5;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento generado por NEXORA. Uso interno y confidencial.', marginLeft, y);
  doc.text(`Total: ${totalCampanas} campanas | Ventas: $${totalVentas.toFixed(2)} | Desc.: $${totalDescuentos.toFixed(2)}`, pageWidth - marginRight, y, { align: 'right' });

  return doc;
}
