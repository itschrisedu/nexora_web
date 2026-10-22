import { jsPDF } from 'jspdf';
import { capitalizarNombreCompleto } from '@/utils/text-formatters';

export interface DeudorItemReporte {
  clientId: string;
  clienteNombre: string;
  clienteApellido?: string;
  clienteNombreSolo?: string;
  clienteCedula?: string;
  clienteTelefono?: string;
  clienteNivel?: string;
  sucursalNombre?: string;
  totalCompras?: number;
  saldoTotalPendiente: number;
  totalComprasPendientes?: number;
  proximoVencimiento?: string | null;
}

export interface ReporteDeudoresData {
  emisor: {
    nombre: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  fechaEmision: string;
  totalDeudaCartera: number;
  deudores: DeudorItemReporte[];
  filtroSucursal?: string;
}

/**
 * Genera el documento PDF oficial de la lista consolidada de clientes deudores.
 * Cumple con los requerimientos de presentación: Apellido, Nombre y Saldo Pendiente destacado.
 */
export function generarReporteDeudoresPdfDoc(data: ReporteDeudoresData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let y = 14;

  // Ordenar deudores de forma estricta por Apellido y luego por Nombre
  const deudoresOrdenados = [...data.deudores]
    .filter((d) => Number(d.saldoTotalPendiente || 0) > 0.01)
    .sort((a, b) => {
      const apeA = (a.clienteApellido || a.clienteNombre || '').trim().toLowerCase();
      const apeB = (b.clienteApellido || b.clienteNombre || '').trim().toLowerCase();
      const comp = apeA.localeCompare(apeB, 'es', { sensitivity: 'base' });
      if (comp !== 0) return comp;
      const nomA = (a.clienteNombreSolo || '').trim().toLowerCase();
      const nomB = (b.clienteNombreSolo || '').trim().toLowerCase();
      return nomA.localeCompare(nomB, 'es', { sensitivity: 'base' });
    });

  const totalDeudores = deudoresOrdenados.length;
  const saldoTotal = deudoresOrdenados.reduce((sum, d) => sum + Number(d.saldoTotalPendiente || 0), 0);
  const promedioDeuda = totalDeudores > 0 ? saldoTotal / totalDeudores : 0;

  // ── 1. Encabezado Institucional ───────────────────────────────────────
  const headerHeight = 32;
  doc.setFillColor(15, 23, 42); // Slate 900 (#0F172A)
  doc.roundedRect(marginX, y, contentWidth, headerHeight, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const nombreNegocio = (data.emisor.nombre || 'Comercializadora de Calzado').toUpperCase();
  doc.text(nombreNegocio, marginX + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  const subInfo = [
    data.emisor.ruc ? `RUC: ${data.emisor.ruc}` : '',
    data.emisor.direccion ? `Dir: ${data.emisor.direccion}` : '',
    data.emisor.telefono ? `Telf: ${data.emisor.telefono}` : '',
  ].filter(Boolean).join('  •  ');
  if (subInfo) {
    doc.text(subInfo, marginX + 6, y + 13);
  }

  // Título del Reporte
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('REPORTE OFICIAL DE CLIENTES DEUDORES', marginX + 6, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  const fechaTexto = `Emisión: ${data.fechaEmision}  |  Ámbito: ${data.filtroSucursal || 'Todas las Sucursales'}`;
  doc.text(fechaTexto, marginX + 6, y + 26);

  // Badge derecho: Cartera Total
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.roundedRect(pageWidth - marginX - 52, y + 5, 46, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('TOTAL CARTERA POR COBRAR', pageWidth - marginX - 49, y + 11);
  doc.setFontSize(12);
  doc.setTextColor(239, 68, 68); // Red 500
  doc.text(`$${saldoTotal.toFixed(2)}`, pageWidth - marginX - 49, y + 21);

  y += headerHeight + 6;

  // ── 2. Métricas Resumen KPI ──────────────────────────────────────────
  const kpiCardWidth = (contentWidth - 6) / 3;
  const kpiHeight = 15;

  // KPI 1: Total Deudores
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(marginX, y, kpiCardWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL CLIENTES DEUDORES', marginX + 4, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalDeudores} clientes`, marginX + 4, y + 12);

  // KPI 2: Cartera Total
  const kpi2X = marginX + kpiCardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi2X, y, kpiCardWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('SALDO TOTAL PENDIENTE', kpi2X + 4, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`$${saldoTotal.toFixed(2)}`, kpi2X + 4, y + 12);

  // KPI 3: Promedio por Deudor
  const kpi3X = kpi2X + kpiCardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi3X, y, kpiCardWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('DEUDA PROMEDIO POR CLIENTE', kpi3X + 4, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`$${promedioDeuda.toFixed(2)}`, kpi3X + 4, y + 12);

  y += kpiHeight + 6;

  // ── 3. Tabla Detallada de Clientes Deudores ───────────────────────────
  // Dimensiones de columnas: Suma contentWidth = 182mm (pageWidth 210 - 28)
  const colN = 10;
  const colCliente = 64;
  const colCedula = 30;
  const colTelefono = 26;
  const colSucursal = 26;
  const colSaldo = 26;

  const renderTableHeader = (currentY: number) => {
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(marginX, currentY, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    let curX = marginX;
    doc.text('N°', curX + 2, currentY + 4.8);
    curX += colN;
    doc.text('APELLIDOS Y NOMBRES', curX + 2, currentY + 4.8);
    curX += colCliente;
    doc.text('C.I. / RUC', curX + 2, currentY + 4.8);
    curX += colCedula;
    doc.text('TELÉFONO', curX + 2, currentY + 4.8);
    curX += colTelefono;
    doc.text('LOCAL / SUCURSAL', curX + 2, currentY + 4.8);
    curX += colSucursal;
    doc.text('SALDO DEUDOR', curX + colSaldo - 2, currentY + 4.8, { align: 'right' });

    return currentY + 7;
  };

  y = renderTableHeader(y);

  if (deudoresOrdenados.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, y, contentWidth, 14, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('¡Excelente! No existen clientes con saldo deudor pendiente en este momento.', marginX + contentWidth / 2, y + 8, { align: 'center' });
    y += 14;
  } else {
    const rowHeight = 7.5;
    deudoresOrdenados.forEach((deudor, index) => {
      // Salto de página si excede el límite
      if (y + rowHeight > pageHeight - 18) {
        doc.addPage();
        y = 14;
        y = renderTableHeader(y);
      }

      // Fondo alternado (Zebra)
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(marginX, y, contentWidth, rowHeight, 'F');
      }

      // Línea divisoria tenue
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, y + rowHeight, marginX + contentWidth, y + rowHeight);

      // Formatear Apellido y Nombre
      let nombreFormateado = '';
      if (deudor.clienteApellido && deudor.clienteNombreSolo) {
        nombreFormateado = `${capitalizarNombreCompleto(deudor.clienteApellido)} ${capitalizarNombreCompleto(deudor.clienteNombreSolo)}`;
      } else {
        nombreFormateado = capitalizarNombreCompleto(deudor.clienteNombre);
      }
      if (nombreFormateado.length > 34) {
        nombreFormateado = `${nombreFormateado.substring(0, 32)}...`;
      }

      let curX = marginX;

      // N°
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(index + 1), curX + 2, y + 5);
      curX += colN;

      // Apellidos y Nombres
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(nombreFormateado, curX + 2, y + 5);
      curX += colCliente;

      // Cédula / RUC
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const ced = deudor.clienteCedula && deudor.clienteCedula !== '—' ? deudor.clienteCedula : '—';
      doc.text(ced, curX + 2, y + 5);
      curX += colCedula;

      // Teléfono
      const tel = deudor.clienteTelefono && deudor.clienteTelefono !== '—' ? deudor.clienteTelefono : '—';
      doc.text(tel, curX + 2, y + 5);
      curX += colTelefono;

      // Sucursal
      let suc = deudor.sucursalNombre || 'Matriz';
      if (suc.length > 16) suc = `${suc.substring(0, 14)}...`;
      doc.text(suc, curX + 2, y + 5);
      curX += colSucursal;

      // Saldo Pendiente
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 38, 38); // Rojo
      doc.text(`$${Number(deudor.saldoTotalPendiente).toFixed(2)}`, curX + colSaldo - 2, y + 5, { align: 'right' });

      y += rowHeight;
    });

    // Fila de Total Final
    if (y + 10 > pageHeight - 18) {
      doc.addPage();
      y = 14;
    }
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(marginX, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL GENERAL (${totalDeudores} CLIENTES DEUDORES):`, marginX + 4, y + 5.3);

    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38);
    doc.text(`$${saldoTotal.toFixed(2)}`, marginX + contentWidth - 2, y + 5.3, { align: 'right' });
    y += 12;
  }

  // ── 4. Numeración de Páginas y Pie de Documento ───────────────────────
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 10, marginX + contentWidth, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Documento de control interno de cuentas por cobrar. Válido para conciliación comercial y financiera.',
      marginX,
      pageHeight - 6.5
    );
    doc.text(
      `Página ${i} de ${totalPaginas}`,
      pageWidth - marginX,
      pageHeight - 6.5,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Descarga directamente el reporte PDF en el navegador del usuario.
 */
export function descargarReporteDeudoresPdf(data: ReporteDeudoresData): void {
  const doc = generarReporteDeudoresPdfDoc(data);
  const fechaLimpia = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Reporte_Clientes_Deudores_${fechaLimpia}.pdf`;
  doc.save(nombreArchivo);
}
