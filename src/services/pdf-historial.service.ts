import { jsPDF } from 'jspdf';
import { capitalizarNombreCompleto } from '@/utils/text-formatters';
import { abrirWhatsAppUniversal } from '@/utils/whatsapp';

export interface HistorialComercialItemEntrega {
  modelo: string;
  color?: string;
  serie?: string;
  imageUrl?: string;
  curvaTallas?: string;
  totalPares: number;
  etiquetaVolumen?: string;
  precioUnitario: number;
  subtotal: number;
}

export interface HistorialEntregaDetallada {
  fecha: string;
  pedidoId?: string;
  numeroNota?: string;
  vendedor?: string;
  entregadoPor?: string;
  fechaEntrega?: string;
  montoTotal: number;
  totalPares: number;
  items: HistorialComercialItemEntrega[];
}

export interface HistorialAbonoDetallado {
  fecha: string;
  numeroComprobante?: string;
  formaPago: string;
  referencia?: string;
  monto: number;
  cobradoPor?: string;
  saldoAnterior?: number;
  nuevoSaldo?: number;
}

export interface HistorialDevolucionDetallada {
  fecha: string;
  monto: number;
  procesadoPor?: string;
  motivo?: string;
  totalPares?: number;
}

export interface HistorialComercialPdfData {
  emisor: {
    nombre: string;
    ruc: string;
    direccion: string;
    telefono?: string;
    email?: string;
    sucursal?: string;
  };
  cliente: {
    nombre: string;
    cedula?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    nivelCredito?: string;
    limiteCredito?: number;
  };
  periodo: {
    fechaInicio: string;
    fechaFin: string;
    esHistoricoCompleto: boolean;
  };
  resumen: {
    totalEntregasMonto: number;
    totalParesEntregados: number;
    totalAbonosMonto: number;
    totalDevolucionesMonto: number;
    saldoPendienteFinal: number;
  };
  entregas: HistorialEntregaDetallada[];
  abonos: HistorialAbonoDetallado[];
  devoluciones: HistorialDevolucionDetallada[];
}

/**
 * Genera el documento PDF formal del Historial Comercial y Financiero (A4 empresarial)
 */
export function generarHistorialPdfDoc(data: HistorialComercialPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;

  const checkSaltoPagina = (espacioNecesario: number) => {
    if (y + espacioNecesario > pageHeight - 20) {
      doc.addPage();
      y = 16;
      dibujarEncabezadoPaginaSecundaria();
    }
  };

  const dibujarEncabezadoPaginaSecundaria = () => {
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(12, 10, pageWidth - 24, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`${data.emisor.nombre || 'CALZADO'} — Historial Comercial: ${data.cliente.nombre}`, 16, 15);
    doc.setTextColor(148, 163, 184);
    doc.text(`Período: ${data.periodo.fechaInicio} al ${data.periodo.fechaFin}`, pageWidth - 16, 15, { align: 'right' });
    y = 22;
  };

  // ── 1. Encabezado Institucional ─────────────────────────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(12, y, pageWidth - 24, 38, 2.5, 2.5, 'F');

  // Franja decorativa esmeralda
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(12, y + 36, pageWidth - 24, 2, 'F');

  // Nombre del negocio
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.emisor.nombre || 'CALZADO DE CUERO', 18, y + 9);

  // Subtítulo / Datos comerciales
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`RUC: ${data.emisor.ruc || '1804884664001'}`, 18, y + 16);
  doc.text(`Dirección: ${data.emisor.direccion || 'Cevallos, Tungurahua, Ecuador'}`, 18, y + 21);
  doc.text(`Teléfono: ${data.emisor.telefono || ''} ${data.emisor.email ? '| ' + data.emisor.email : ''}`, 18, y + 26);
  doc.text(`Sucursal: ${data.emisor.sucursal || 'Matriz Cevallos'}`, 18, y + 31);

  // Cuadro derecho: Título del Extracto
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 76, y + 4.5, 59, 29, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTADO DE CUENTA', pageWidth - 46.5, y + 11.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Historial de Entregas y Pagos', pageWidth - 46.5, y + 16, { align: 'center' });

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth - 72, y + 19, 51, 11, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(`Desde: ${data.periodo.fechaInicio}`, pageWidth - 46.5, y + 23.5, { align: 'center' });
  doc.text(`Hasta: ${data.periodo.fechaFin}`, pageWidth - 46.5, y + 27.5, { align: 'center' });

  y += 44;

  // ── 2. Información del Cliente ──────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, y, pageWidth - 24, 23, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 23, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DATOS DEL CLIENTE:', 16, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Cliente: ${capitalizarNombreCompleto(data.cliente.nombre)}`, 16, y + 11.5);
  doc.text(`Cédula / RUC: ${data.cliente.cedula || 'N/A'}`, 16, y + 16.5);
  doc.text(`Teléfono: ${data.cliente.telefono || 'N/A'}`, 16, y + 20.5);

  const col2X = pageWidth / 2 + 5;
  doc.text(`Nivel de Crédito: ${data.cliente.nivelCredito || 'Estándar'}`, col2X, y + 11.5);
  doc.text(`Límite Aprobado: $${(data.cliente.limiteCredito || 0).toFixed(2)}`, col2X, y + 16.5);
  doc.text(`Correo Electrónico: ${data.cliente.email || 'N/A'}`, col2X, y + 20.5);

  y += 28;

  // ── 3. Resumen Financiero del Período (KPIs) ───────────────────
  const cardW = (pageWidth - 24 - 9) / 4;
  const kpis = [
    { label: 'TOTAL ENTREGADO', val: `$${data.resumen.totalEntregasMonto.toFixed(2)}`, sub: `${data.resumen.totalParesEntregados} pares`, color: [37, 99, 235] },
    { label: 'TOTAL ABONADO', val: `-$${data.resumen.totalAbonosMonto.toFixed(2)}`, sub: `${data.abonos.length} pagos`, color: [16, 185, 129] },
    { label: 'DEVOLUCIONES', val: `-$${data.resumen.totalDevolucionesMonto.toFixed(2)}`, sub: `${data.devoluciones.length} reg.`, color: [225, 29, 72] },
    { label: 'SALDO DEUDOR', val: `$${data.resumen.saldoPendienteFinal.toFixed(2)}`, sub: 'Saldo al corte', color: data.resumen.saldoPendienteFinal > 0 ? [225, 29, 72] : [16, 185, 129] },
  ];

  kpis.forEach((kpi, idx) => {
    const kX = 12 + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(kX, y, cardW, 17, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kX, y, cardW, 17, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kX + cardW / 2, y + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, kX + cardW / 2, y + 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, kX + cardW / 2, y + 14.5, { align: 'center' });
  });

  y += 23;

  // ── 4. Sección de Entregas Realizadas (Resumen por Variante) ──
  checkSaltoPagina(20);
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(12, y, pageWidth - 24, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('1. RESUMEN DE ENTREGAS Y MERCADERÍA DESPACHADA', 16, y + 4.5);
  y += 9.5;

  if (data.entregas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No se registran entregas de mercadería en el rango de fechas seleccionado.', 16, y + 3);
    y += 8;
  } else {
    data.entregas.forEach((ent, index) => {
      checkSaltoPagina(20 + ent.items.length * 6.5);

      // Cabecera de la entrega
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(12, y, pageWidth - 24, 6.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      const numPedido = ent.numeroNota ? `Nota: ${ent.numeroNota}` : `Entrega #${index + 1}`;
      doc.text(`📦 ${numPedido} • Fecha: ${ent.fecha}`, 16, y + 4.5);

      // Responsables
      let respStr = '';
      if (ent.entregadoPor) respStr += `Entregado por: ${ent.entregadoPor}`;
      if (ent.vendedor) respStr += `${respStr ? ' | ' : ''}Vendedor: ${ent.vendedor}`;
      if (respStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(respStr, pageWidth / 2, y + 4.5, { align: 'center' });
      }

      // Total entrega
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text(`${ent.totalPares} pares • $${ent.montoTotal.toFixed(2)}`, pageWidth - 16, y + 4.5, { align: 'right' });
      y += 8.5;

      // Detalle de ítems entregados por variante (sin desglosar par por par)
      ent.items.forEach((it) => {
        checkSaltoPagina(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        const colStr = it.color ? ` (${it.color})` : '';
        const serStr = it.serie && it.serie !== 'Estándar' ? ` • Serie: ${it.serie}` : '';
        doc.text(`▫️ ${it.modelo}${colStr}${serStr}`, 18, y + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        const volTxt = `${it.totalPares} ${it.totalPares === 1 ? 'par' : 'pares'}`;
        doc.text(volTxt, 88, y + 3.5);

        doc.text(`$${it.precioUnitario.toFixed(2)} / par`, pageWidth - 42, y + 3.5, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(`$${it.subtotal.toFixed(2)}`, pageWidth - 16, y + 3.5, { align: 'right' });

        // Línea divisoria muy tenue
        doc.setDrawColor(241, 245, 249);
        doc.line(18, y + 5.5, pageWidth - 16, y + 5.5);
        y += 6;
      });

      y += 3;
    });
  }

  y += 4;

  // ── 5. Extracto Cronológico Unificado de Movimientos (Entregas y Pagos) ──
  checkSaltoPagina(22);
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(12, y, pageWidth - 24, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('2. EXTRACTO CRONOLÓGICO DE MOVIMIENTOS (PAGOS Y ENTREGAS)', 16, y + 4.5);
  y += 9.5;

  // Consolidar cronológicamente todas las entregas, abonos y devoluciones
  const movimientosCronologicos: Array<{
    fecha: string;
    tipo: 'ENTREGA' | 'ABONO' | 'DEVOLUCION';
    referencia: string;
    detalle: string;
    cargo?: number;
    abono?: number;
    saldo?: number;
  }> = [];

  data.entregas.forEach((ent) => {
    movimientosCronologicos.push({
      fecha: ent.fecha,
      tipo: 'ENTREGA',
      referencia: ent.numeroNota ? `Nota ${ent.numeroNota}` : 'Pedido',
      detalle: `Despacho de ${ent.totalPares} pares (${ent.vendedor ? 'Vend: ' + ent.vendedor : 'Almacén'})`,
      cargo: ent.montoTotal,
    });
  });

  data.abonos.forEach((ab) => {
    const cobStr = ab.cobradoPor ? ` • Cobrado: ${capitalizarNombreCompleto(ab.cobradoPor)}` : '';
    movimientosCronologicos.push({
      fecha: ab.fecha,
      tipo: 'ABONO',
      referencia: ab.numeroComprobante || 'Recibo',
      detalle: `${ab.formaPago}${cobStr}`,
      abono: ab.monto,
      saldo: ab.nuevoSaldo,
    });
  });

  data.devoluciones?.forEach((dev) => {
    movimientosCronologicos.push({
      fecha: dev.fecha,
      tipo: 'DEVOLUCION',
      referencia: dev.motivo || 'Devolución',
      detalle: dev.totalPares ? `Acreditación (${dev.totalPares} pares)` : 'Acreditación por devolución',
      abono: dev.monto,
    });
  });

  // Ordenar cronológicamente
  movimientosCronologicos.sort((a, b) => (a.fecha > b.fecha ? 1 : a.fecha < b.fecha ? -1 : 0));

  if (movimientosCronologicos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No se registran movimientos en el rango de fechas seleccionado.', 16, y + 3);
    y += 8;
  } else {
    // Encabezado de tabla cronológica
    doc.setFillColor(241, 245, 249);
    doc.rect(12, y, pageWidth - 24, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text('FECHA', 16, y + 3.8);
    doc.text('MOVIMIENTO / REF.', 40, y + 3.8);
    doc.text('DETALLE OPERATIVO', 78, y + 3.8);
    doc.text('ENTREGA (+)', pageWidth - 46, y + 3.8, { align: 'right' });
    doc.text('ABONO (-)', pageWidth - 28, y + 3.8, { align: 'right' });
    doc.text('SALDO', pageWidth - 16, y + 3.8, { align: 'right' });
    y += 7;

    movimientosCronologicos.forEach((mov, idx) => {
      checkSaltoPagina(6.5);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(12, y - 1, pageWidth - 24, 5.5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(mov.fecha, 16, y + 3);

      doc.setFont('helvetica', 'bold');
      if (mov.tipo === 'ENTREGA') {
        doc.setTextColor(37, 99, 235);
        doc.text(`📦 ${mov.referencia}`, 40, y + 3);
      } else if (mov.tipo === 'ABONO') {
        doc.setTextColor(16, 185, 129);
        doc.text(`💳 ${mov.referencia}`, 40, y + 3);
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text(`↩️ ${mov.referencia}`, 40, y + 3);
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(mov.detalle, 78, y + 3);

      // Columna Entrega (Cargo +)
      doc.setFont('helvetica', 'bold');
      if (mov.cargo) {
        doc.setTextColor(37, 99, 235);
        doc.text(`+$${mov.cargo.toFixed(2)}`, pageWidth - 46, y + 3, { align: 'right' });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', pageWidth - 46, y + 3, { align: 'right' });
      }

      // Columna Abono (Pago -)
      if (mov.abono) {
        doc.setTextColor(16, 185, 129);
        doc.text(`-$${mov.abono.toFixed(2)}`, pageWidth - 28, y + 3, { align: 'right' });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', pageWidth - 28, y + 3, { align: 'right' });
      }

      // Columna Saldo
      if (mov.saldo !== undefined) {
        doc.setTextColor(mov.saldo > 0 ? 225 : 16, mov.saldo > 0 ? 29 : 185, mov.saldo > 0 ? 72 : 129);
        doc.text(`$${mov.saldo.toFixed(2)}`, pageWidth - 16, y + 3, { align: 'right' });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', pageWidth - 16, y + 3, { align: 'right' });
      }

      y += 5.5;
    });
  }

  y += 4;

  // ── 6. Devoluciones (si existen) ────────────────────────────────
  if (data.devoluciones && data.devoluciones.length > 0) {
    checkSaltoPagina(20);
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(12, y, pageWidth - 24, 6.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('3. DEVOLUCIONES Y CRÉDITOS APLICADOS', 16, y + 4.5);
    y += 9.5;

    data.devoluciones.forEach((dev) => {
      checkSaltoPagina(6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`↩️ Fecha: ${dev.fecha} • Motivo: ${dev.motivo || 'Devolución de calzado'}`, 16, y + 3.5);
      if (dev.procesadoPor) {
        doc.setTextColor(100, 116, 139);
        doc.text(`Procesado por: ${dev.procesadoPor}`, 115, y + 3.5);
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(225, 29, 72);
      doc.text(`-$${dev.monto.toFixed(2)}`, pageWidth - 16, y + 3.5, { align: 'right' });
      y += 6;
    });
    y += 4;
  }

  // ── 7. Cuadro de Firmas y Validación ────────────────────────────
  checkSaltoPagina(30);
  const firmaY = Math.max(y + 8, pageHeight - 38);
  doc.setDrawColor(203, 213, 225);
  doc.line(25, firmaY, 85, firmaY);
  doc.line(pageWidth - 85, firmaY, pageWidth - 25, firmaY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('EMISOR / ADMINISTRACIÓN', 55, firmaY + 4, { align: 'center' });
  doc.text('CLIENTE / CONFORMIDAD', pageWidth - 55, firmaY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(data.emisor.nombre, 55, firmaY + 8, { align: 'center' });
  doc.text(capitalizarNombreCompleto(data.cliente.nombre), pageWidth - 55, firmaY + 8, { align: 'center' });

  // ── 8. Pie de Página y Numeración ──────────────────────────────
  const totalPaginas = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252);
    doc.rect(12, pageHeight - 14, pageWidth - 24, 10, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Generado el ${new Date().toLocaleString('es-EC')} • Extracto comercial oficial de cuenta corriente.`,
      pageWidth / 2,
      pageHeight - 9,
      { align: 'center' }
    );
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - 16, pageHeight - 9, { align: 'right' });
  }

  return doc;
}

/**
 * Descarga el archivo PDF localmente
 */
export function descargarHistorialPdf(data: HistorialComercialPdfData): void {
  const doc = generarHistorialPdfDoc(data);
  const cleanNombre = data.cliente.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Historial_${cleanNombre}_${data.periodo.fechaInicio}_${data.periodo.fechaFin}.pdf`);
}

/**
 * Obtiene el PDF codificado en Base64 para adjuntarlo a correos electrónicos
 */
export function generarHistorialPdfBase64(data: HistorialComercialPdfData): string {
  const doc = generarHistorialPdfDoc(data);
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1] || '';
}

/**
 * Genera el mensaje de WhatsApp formal y detallado con la estructura idéntica a los comprobantes de abonos
 */
export async function armarMensajeWhatsAppHistorial(
  data: HistorialComercialPdfData,
  urlPublica?: string
): Promise<string> {
  const nombreNegocio = data.emisor.nombre || 'Administración de Cobros';
  let msg = `Estimado/a *${capitalizarNombreCompleto(data.cliente.nombre)}*,\n\n`;
  msg += `Le saludamos cordialmente de *${nombreNegocio}*. Adjuntamos el extracto detallado de su *Historial Comercial y Financiero*:\n\n`;
  msg += `📋 *ESTADO DE CUENTA CORRIENTE*\n`;
  msg += `🗓️ *Período:* Del ${data.periodo.fechaInicio} al ${data.periodo.fechaFin}\n`;
  msg += `👤 *Cliente:* ${capitalizarNombreCompleto(data.cliente.nombre)}\n`;
  if (data.cliente.cedula) msg += `🪪 *Cédula/RUC:* ${data.cliente.cedula}\n`;

  msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 *RESUMEN DE MOVIMIENTOS:*\n`;
  msg += `📦 *Total Mercadería Entregada:* $${data.resumen.totalEntregasMonto.toFixed(2)} (${data.resumen.totalParesEntregados} pares)\n`;
  msg += `✅ *Total Abonos Recibidos:* -$${data.resumen.totalAbonosMonto.toFixed(2)}\n`;
  if (data.resumen.totalDevolucionesMonto > 0) {
    msg += `↩️ *Devoluciones Acreditadas:* -$${data.resumen.totalDevolucionesMonto.toFixed(2)}\n`;
  }

  if (data.resumen.saldoPendienteFinal <= 0) {
    msg += `🎉 *SALDO PENDIENTE: $0.00 (CUENTA AL DÍA)*\n`;
  } else {
    msg += `📌 *SALDO DEUDOR PENDIENTE: $${data.resumen.saldoPendienteFinal.toFixed(2)}*\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Detalle de entregas por variante (sin desglose de tallas)
  if (data.entregas.length > 0) {
    msg += `📦 *DETALLE DE ENTREGAS REALIZADAS:*\n`;
    data.entregas.forEach((ent) => {
      const notaStr = ent.numeroNota ? ` (Nota ${ent.numeroNota})` : '';
      const entregadorStr = ent.entregadoPor ? ` • Entregado por: ${ent.entregadoPor}` : '';
      msg += `🔹 *${ent.fecha}*${notaStr}${entregadorStr}\n`;
      ent.items.forEach((it) => {
        const colorStr = it.color ? ` (${it.color})` : '';
        const serieStr = it.serie && it.serie !== 'Estándar' ? ` • Serie: ${it.serie}` : '';
        const volStr = `${it.totalPares} ${it.totalPares === 1 ? 'par' : 'pares'}`;
        msg += `   ▫️ ${it.modelo}${colorStr}${serieStr}\n      ${volStr} • $${it.subtotal.toFixed(2)}\n`;
      });
      msg += `   💰 Subtotal entrega: $${ent.montoTotal.toFixed(2)}\n\n`;
    });
  }

  // Detalle de abonos y pagos
  if (data.abonos.length > 0) {
    msg += `💳 *DETALLE DE ABONOS Y COBROS RECIBIDOS:*\n`;
    data.abonos.forEach((ab) => {
      const cobradorStr = ab.cobradoPor ? ` • Cobrado por: ${ab.cobradoPor}` : '';
      const refStr = ab.referencia ? ` (Ref: ${ab.referencia})` : '';
      msg += `   ▫️ *${ab.fecha}* • $${ab.monto.toFixed(2)} [${ab.formaPago}${refStr}]${cobradorStr}\n`;
    });
    msg += `\n`;
  }

  if (urlPublica) {
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📥 *Consulta y descarga aquí tu historial completo en línea:*\n👉 ${urlPublica}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  msg += `📄 _Este extracto certifica las transacciones comerciales registradas en su cuenta corriente._\n\n`;
  msg += `¡Agradecemos su preferencia y puntualidad!\n*${nombreNegocio}*`;

  return msg;
}

/**
 * Comparte el Historial vía WhatsApp
 */
export async function compartirHistorialWhatsApp(
  data: HistorialComercialPdfData,
  telefono: string,
  descargarLocal: boolean = false,
  urlPublica?: string,
): Promise<void> {
  let numLimpio = telefono.replace(/\D/g, '');
  if (numLimpio.startsWith('09') && numLimpio.length === 10) {
    numLimpio = '593' + numLimpio.substring(1);
  } else if (numLimpio.startsWith('0') && numLimpio.length === 10) {
    numLimpio = '593' + numLimpio.substring(1);
  }

  if (descargarLocal) {
    descargarHistorialPdf(data);
  }

  const mensajeTexto = await armarMensajeWhatsAppHistorial(data, urlPublica);
  abrirWhatsAppUniversal(numLimpio, mensajeTexto);
}
