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
  let y = 14;

  // ── Header Institucional Super Admin ─────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(12, y, pageWidth - 24, 32, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('NEXORA SaaS — REPORTE DE SUSCRIPCIONES Y RECAUDACIÓN', 18, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Panel de Control Super Admin · Auditoría de Ingresos y Estado de Locales Comerciales', 18, y + 19);

  const fechaEmision = new Date().toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Fecha de emisión: ${fechaEmision}`, pageWidth - 18, y + 26, { align: 'right' });

  y += 38;

  // ── 2. Resumen Financiero y Métricas Clave (KPIs) ─────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 24, 2, 2, 'FD');

  const colWidth = (pageWidth - 24) / 4;

  // KPI 1: Total Recaudado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('RECAUDACIÓN TOTAL', 12 + 6, y + 7);
  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129); // Emerald 600
  doc.text(`$${Number(data.kpis.totalRecaudado || 0).toFixed(2)}`, 12 + 6, y + 17);

  // KPI 2: Ingresos Mes Actual
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('INGRESOS ESTE MES', 12 + colWidth + 6, y + 7);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${Number(data.kpis.ingresosMesActual || 0).toFixed(2)}`, 12 + colWidth + 6, y + 17);

  // KPI 3: MRR Proyectado
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('MRR MENSUAL ACTIVO', 12 + colWidth * 2 + 6, y + 7);
  doc.setFontSize(13);
  doc.setTextColor(59, 130, 246); // Blue 500
  doc.text(`$${Number(data.kpis.mrrProyectado || 0).toFixed(2)} / mes`, 12 + colWidth * 2 + 6, y + 17);

  // KPI 4: Locales Al Día vs Vencidos
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('ESTADO DE LOCALES', 12 + colWidth * 3 + 6, y + 7);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.kpis.localesAlDia} Al Día · ${data.kpis.localesVencidos} Vencidos · ${data.kpis.localesEnPrueba} Prueba`, 12 + colWidth * 3 + 6, y + 17);

  y += 30;

  // ── 3. Tabla Detallada de Historial de Pagos de Suscripción ─────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Historial Detallado de Pagos Registrados', 12, y);
  y += 5;

  // Cabecera de Tabla
  doc.setFillColor(15, 23, 42);
  doc.rect(12, y, pageWidth - 24, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('EMPRESA / LOCAL', 15, y + 4.8);
  doc.text('PLAN', 70, y + 4.8);
  doc.text('MÉTODO', 105, y + 4.8);
  doc.text('FECHA PAGO', 135, y + 4.8);
  doc.text('VIGENCIA HASTA', 162, y + 4.8);
  doc.text('MONTO ($)', pageWidth - 15, y + 4.8, { align: 'right' });

  y += 7;

  if (!data.pagos || data.pagos.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(12, y, pageWidth - 24, 10, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('No hay registros de pagos de suscripción en el sistema.', pageWidth / 2, y + 6.5, { align: 'center' });
    y += 12;
  } else {
    data.pagos.forEach((p, idx) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 15;
      }

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(241, 245, 249);
      doc.rect(12, y, pageWidth - 24, 7.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(p.tenantName.substring(0, 26), 15, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(formatPlan(p.tenantPlan), 70, y + 5);
      doc.text(p.metodoPago || 'TRANSFERENCIA', 105, y + 5);

      const fechaP = p.fechaPago ? new Date(p.fechaPago).toLocaleDateString('es-EC') : '—';
      const fechaF = p.fechaFin ? new Date(p.fechaFin).toLocaleDateString('es-EC') : '—';
      doc.text(fechaP, 135, y + 5);
      doc.text(fechaF, 162, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`$${Number(p.monto).toFixed(2)}`, pageWidth - 15, y + 5, { align: 'right' });

      y += 7.5;
    });
  }

  y += 8;

  // ── 4. Estado Actual de Todos los Locales y Clientes SaaS ─────────────
  if (y > pageHeight - 45) {
    doc.addPage();
    y = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Estado y Próximos Vencimientos de Locales SaaS', 12, y);
  y += 5;

  doc.setFillColor(51, 65, 85); // Slate 700
  doc.rect(12, y, pageWidth - 24, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('LOCAL / EMPRESA', 15, y + 4.8);
  doc.text('PLAN ASIGNADO', 70, y + 4.8);
  doc.text('TARIFA MENSUAL', 105, y + 4.8);
  doc.text('DÍAS RESTANTES', 140, y + 4.8);
  doc.text('ESTADO SUSCRIPCIÓN', pageWidth - 15, y + 4.8, { align: 'right' });

  y += 7;

  (data.locales || []).forEach((loc, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(241, 245, 249);
    doc.rect(12, y, pageWidth - 24, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(loc.name.substring(0, 26), 15, y + 4.7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(formatPlan(loc.plan), 70, y + 4.7);
    doc.text(`$${Number(loc.precioMensualPlan || 0).toFixed(2)}/mes`, 105, y + 4.7);

    let diasTxt = `${loc.diasRestantes} días`;
    if (loc.estadoCalculado === 'EN_PRUEBA') diasTxt = 'Prueba Gratis';
    else if (loc.diasRestantes < 0) diasTxt = `Vencido (${Math.abs(loc.diasRestantes)}d)`;
    doc.text(diasTxt, 140, y + 4.7);

    doc.setFont('helvetica', 'bold');
    if (loc.estadoCalculado === 'AL_DIA') doc.setTextColor(16, 185, 129);
    else if (loc.estadoCalculado === 'POR_VENCER') doc.setTextColor(245, 158, 11);
    else if (loc.estadoCalculado === 'EN_PRUEBA') doc.setTextColor(59, 130, 246);
    else doc.setTextColor(239, 68, 68);

    doc.text(formatEstado(loc.estadoCalculado), pageWidth - 15, y + 4.7, { align: 'right' });

    y += 7;
  });

  // Pie de Página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`NEXORA Platform — Documento Oficial de Auditoría SaaS · Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 7, {
      align: 'center',
    });
  }

  return doc;
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
