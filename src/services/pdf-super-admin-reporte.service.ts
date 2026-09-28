import { jsPDF } from 'jspdf';

export interface SuperAdminReportData {
  kpis: {
    totalRecaudado: number;
    ingresosMesActual: number;
    mrrProyectado: number;
    totalLocales: number;
    localesAlDia: number;
    localesPorVencer: number;
    localesVencidos: number;
    localesEnPrueba: number;
  };
  recaudacionPorPlan: Record<string, number>;
  recaudacionPorMetodo: Record<string, number>;
  pagos: Array<{
    id: string;
    tenantName: string;
    tenantPlan: string;
    monto: number;
    periodoMeses: number;
    metodoPago: string;
    fechaPago: string;
    fechaInicio: string;
    fechaFin: string;
    numeroFacturaSri?: string;
    notas?: string;
  }>;
  locales: Array<{
    id: string;
    name: string;
    plan?: string;
    precioMensualPlan: number;
    estadoCalculado: string;
    diasRestantes: number;
    fechaVencimientoPlan?: string;
    totalUsuarios: number;
    totalPedidos: number;
  }>;
  filtroAplicado?: string;
}

const formatPlan = (plan?: string) => {
  if (plan === 'PLAN_BASICO') return 'Plan Básico';
  if (plan === 'PLAN_MAYORISTA') return 'Plan Mayorista';
  return 'Plan Comercial';
};

const formatEstado = (est: string) => {
  if (est === 'AL_DIA') return 'Al Día';
  if (est === 'POR_VENCER') return 'Por Vencer';
  if (est === 'VENCIDO') return 'Vencido';
  if (est === 'EN_PRUEBA') return 'En Prueba';
  return est;
};

export function generarReporteSuscripcionesPdfDoc(data: SuperAdminReportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2;
  let y = 12;

  // ── 1. Header Institucional Super Admin ─────────────
  const headerHeight = 32;
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(marginX, y, contentWidth, headerHeight, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('NEXORA SaaS — REPORTE DE SUSCRIPCIONES Y RECAUDACIÓN', marginX + 6, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Panel de Control Super Admin · Auditoría de Ingresos y Estado de Locales Comerciales', marginX + 6, y + 18);

  const fechaEmision = new Date().toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Fecha de emisión: ${fechaEmision}`, pageWidth - marginX - 6, y + 26, { align: 'right' });

  y += headerHeight + 5;

  // ── 2. Resumen Financiero y Métricas Clave (KPIs) ─────────────
  const kpiHeight = 28;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, contentWidth, kpiHeight, 2.5, 2.5, 'FD');

  const colWidth = contentWidth / 4;

  // Separadores verticales
  doc.setDrawColor(226, 232, 240);
  for (let c = 1; c < 4; c++) {
    doc.line(marginX + colWidth * c, y + 4, marginX + colWidth * c, y + kpiHeight - 4);
  }

  // KPI 1: Total Recaudado
  const col1X = marginX + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('RECAUDACIÓN TOTAL', col1X, y + 7.5);
  doc.setFontSize(11.5);
  doc.setTextColor(16, 185, 129); // Emerald 600
  doc.text(`$${Number(data.kpis?.totalRecaudado || 0).toFixed(2)}`, col1X, y + 17.5);

  // KPI 2: Ingresos Mes Actual
  const col2X = marginX + colWidth + 4;
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('INGRESOS ESTE MES', col2X, y + 7.5);
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${Number(data.kpis?.ingresosMesActual || 0).toFixed(2)}`, col2X, y + 17.5);

  // KPI 3: MRR Proyectado
  const col3X = marginX + colWidth * 2 + 4;
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('MRR MENSUAL ACTIVO', col3X, y + 7.5);
  doc.setFontSize(11.5);
  doc.setTextColor(59, 130, 246); // Blue 500
  doc.text(`$${Number(data.kpis?.mrrProyectado || 0).toFixed(2)}`, col3X, y + 16.5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('/ mes proyectado', col3X, y + 22.5);

  // KPI 4: Estado de Locales
  const col4X = marginX + colWidth * 3 + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('ESTADO DE LOCALES', col4X, y + 7.5);

  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.kpis?.localesAlDia || 0} Al Día · ${data.kpis?.localesEnPrueba || 0} Prueba`, col4X, y + 15);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const vencidos = data.kpis?.localesVencidos || 0;
  if (vencidos > 0) {
    doc.setTextColor(239, 68, 68);
  } else {
    doc.setTextColor(100, 116, 139);
  }
  doc.text(`${vencidos} Vencidos · ${data.kpis?.totalLocales || 0} Total`, col4X, y + 21);

  y += kpiHeight + 7;

  // ── 3. Tabla Detallada de Historial de Pagos de Suscripción ─────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Historial Detallado de Pagos Registrados', marginX, y);
  y += 4.5;

  // Cabecera de Tabla
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('EMPRESA / LOCAL', marginX + 3, y + 4.8);
  doc.text('PLAN', marginX + 58, y + 4.8);
  doc.text('MÉTODO', marginX + 90, y + 4.8);
  doc.text('FECHA PAGO', marginX + 118, y + 4.8);
  doc.text('VIGENCIA', marginX + 144, y + 4.8);
  doc.text('MONTO ($)', pageWidth - marginX - 3, y + 4.8, { align: 'right' });

  y += 7;

  if (!data.pagos || data.pagos.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, contentWidth, 9, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('No hay registros de pagos de suscripción en el sistema.', pageWidth / 2, y + 5.8, { align: 'center' });
    y += 11;
  } else {
    data.pagos.forEach((p, idx) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 15;
      }

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(241, 245, 249);
      doc.rect(marginX, y, contentWidth, 7, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const safeTenantName = (p.tenantName || 'Local Comercial').length > 28
        ? (p.tenantName || '').substring(0, 27) + '...'
        : p.tenantName;
      doc.text(safeTenantName, marginX + 3, y + 4.7);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(formatPlan(p.tenantPlan), marginX + 58, y + 4.7);
      doc.text(p.metodoPago || 'TRANSFERENCIA', marginX + 90, y + 4.7);

      const fechaP = p.fechaPago ? new Date(p.fechaPago).toLocaleDateString('es-EC') : '—';
      const fechaF = p.fechaFin ? new Date(p.fechaFin).toLocaleDateString('es-EC') : '—';
      doc.text(fechaP, marginX + 118, y + 4.7);
      doc.text(fechaF, marginX + 144, y + 4.7);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`$${Number(p.monto || 0).toFixed(2)}`, pageWidth - marginX - 3, y + 4.7, { align: 'right' });

      y += 7;
    });
  }

  y += 6;

  // ── 4. Estado Actual de Todos los Locales y Clientes SaaS ─────────────
  if (y > pageHeight - 45) {
    doc.addPage();
    y = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Estado y Próximos Vencimientos de Locales SaaS', marginX, y);
  y += 4.5;

  doc.setFillColor(51, 65, 85); // Slate 700
  doc.rect(marginX, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('LOCAL / EMPRESA', marginX + 3, y + 4.8);
  doc.text('PLAN ASIGNADO', marginX + 58, y + 4.8);
  doc.text('TARIFA MENSUAL', marginX + 95, y + 4.8);
  doc.text('DÍAS RESTANTES', marginX + 132, y + 4.8);
  doc.text('ESTADO SUSCRIPCIÓN', pageWidth - marginX - 3, y + 4.8, { align: 'right' });

  y += 7;

  (data.locales || []).forEach((loc, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(241, 245, 249);
    doc.rect(marginX, y, contentWidth, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const safeLocName = (loc.name || 'Local').length > 28
      ? (loc.name || '').substring(0, 27) + '...'
      : loc.name;
    doc.text(safeLocName, marginX + 3, y + 4.7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(formatPlan(loc.plan), marginX + 58, y + 4.7);
    doc.text(`$${Number(loc.precioMensualPlan || 0).toFixed(2)}/mes`, marginX + 95, y + 4.7);

    let diasTxt = `${loc.diasRestantes} días`;
    if (loc.estadoCalculado === 'EN_PRUEBA') diasTxt = 'Prueba Gratis';
    else if (loc.diasRestantes < 0) diasTxt = `Vencido (${Math.abs(loc.diasRestantes)}d)`;
    doc.text(diasTxt, marginX + 132, y + 4.7);

    doc.setFont('helvetica', 'bold');
    if (loc.estadoCalculado === 'AL_DIA') doc.setTextColor(16, 185, 129);
    else if (loc.estadoCalculado === 'POR_VENCER') doc.setTextColor(245, 158, 11);
    else if (loc.estadoCalculado === 'EN_PRUEBA') doc.setTextColor(59, 130, 246);
    else doc.setTextColor(239, 68, 68);

    doc.text(formatEstado(loc.estadoCalculado), pageWidth - marginX - 3, y + 4.7, { align: 'right' });

    y += 7;
  });

  // Pie de Página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`NEXORA Platform — Documento Oficial de Auditoría SaaS · Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 6, {
      align: 'center',
    });
  }

  return doc;
}

export function previsualizarReporteSuscripcionesPdf(data: SuperAdminReportData): string {
  const doc = generarReporteSuscripcionesPdfDoc(data);
  return doc.output('bloburl').toString();
}

export function descargarReporteSuscripcionesPdf(data: SuperAdminReportData) {
  const doc = generarReporteSuscripcionesPdfDoc(data);
  const fechaStr = new Date().toISOString().split('T')[0];
  doc.save(`NEXORA_Reporte_Suscripciones_${fechaStr}.pdf`);
}

export function descargarReporteSuscripcionesCsv(data: SuperAdminReportData) {
  const headers = ['ID', 'Empresa / Local', 'Plan', 'Monto ($)', 'Meses Pagados', 'Método de Pago', 'Fecha Pago', 'Vigencia Inicio', 'Vigencia Fin', 'Nro Factura SRI', 'Notas'];

  const rows = (data.pagos || []).map((p) => [
    p.id,
    `"${(p.tenantName || '').replace(/"/g, '""')}"`,
    `"${formatPlan(p.tenantPlan)}"`,
    Number(p.monto || 0).toFixed(2),
    p.periodoMeses || 1,
    `"${p.metodoPago || 'TRANSFERENCIA'}"`,
    p.fechaPago ? new Date(p.fechaPago).toLocaleDateString('es-EC') : '',
    p.fechaInicio ? new Date(p.fechaInicio).toLocaleDateString('es-EC') : '',
    p.fechaFin ? new Date(p.fechaFin).toLocaleDateString('es-EC') : '',
    `"${p.numeroFacturaSri || ''}"`,
    `"${(p.notas || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const fechaStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `NEXORA_Reporte_Recaudacion_${fechaStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
