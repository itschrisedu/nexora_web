import { jsPDF } from 'jspdf';
import { generarUrlPublicaAbono } from './comprobante-url.service';

export interface ComprobanteAbonoPdfData {
  emisor: {
    nombre: string;
    ruc: string;
    direccion: string;
    telefono?: string;
    email?: string;
    establecimiento?: string;
    puntoEmision?: string;
  };
  comprobante: {
    numero: string;
    fecha: string;
    hora?: string;
    formaPago: string;
    referencia?: string;
    notas?: string;
    cajero?: string;
    sucursal?: string;
  };
  cliente: {
    nombre: string;
    cedula: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    nivelCredito?: string;
  };
  movimiento: {
    numeroNota?: string;
    saldoAnterior: number;
    montoAbonado: number;
    saldoRestante: number;
    totalNotasPendientes?: number;
    entregasHoy?: {
      nota: string;
      monto: number;
    }[];
  };
}

/**
 * Genera el documento PDF formal del Comprobante de Abono / Recibo de Pago (A4 empresarial)
 */
export function generarComprobanteAbonoPdfDoc(data: ComprobanteAbonoPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // ── 1. Encabezado Institucional del Negocio ─────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(12, y, pageWidth - 24, 38, 2.5, 2.5, 'F');

  // Franja decorativa esmeralda de comprobante de ingreso
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(12, y + 36, pageWidth - 24, 2, 'F');

  // Nombre del negocio
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text(data.emisor.nombre || 'CALZADO DE CUERO', 18, y + 9);

  // Subtítulo / Razón comercial
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`RUC: ${data.emisor.ruc || '1804884664001'}`, 18, y + 16);
  doc.text(`Dirección: ${data.emisor.direccion || 'Cevallos, Tungurahua, Ecuador'}`, 18, y + 21);
  doc.text(`Teléfono: ${data.emisor.telefono || ''} ${data.emisor.email ? '| Email: ' + data.emisor.email : ''}`, 18, y + 26);
  doc.text('Control Operativo de Cartera y Cobranzas', 18, y + 31);

  // Cuadro Recibo de Caja / Abono (derecha)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 76, y + 4.5, 59, 29, 2, 2, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('RECIBO DE ABONO', pageWidth - 46.5, y + 11.5, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129); // Verde esmeralda para el número
  doc.text(data.comprobante.numero, pageWidth - 46.5, y + 17.5, { align: 'center' });

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Fecha: ${data.comprobante.fecha}`, pageWidth - 46.5, y + 23, { align: 'center' });
  if (data.comprobante.hora) {
    doc.text(`Hora: ${data.comprobante.hora}`, pageWidth - 46.5, y + 27.5, { align: 'center' });
  }

  y += 44;

  // ── 2. Datos del Cliente ─────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('INFORMACIÓN DEL CLIENTE', 17, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Cliente / Razón Social:`, 17, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.cliente.nombre, 54, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`C.I. / RUC:`, 17, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.text(data.cliente.cedula || 'Consumidor Final', 54, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.text(`Teléfono / WhatsApp:`, 17, y + 22);
  doc.text(data.cliente.telefono || '—', 54, y + 22);

  // Lado derecho datos cliente
  doc.setFont('helvetica', 'normal');
  doc.text(`Dirección:`, pageWidth / 2 + 10, y + 12);
  doc.text(data.cliente.direccion || 'Ecuador', pageWidth / 2 + 30, y + 12);

  doc.text(`Nivel Crédito:`, pageWidth / 2 + 10, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(data.cliente.nivelCredito || 'Estándar', pageWidth / 2 + 30, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Forma de Pago:`, pageWidth / 2 + 10, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.comprobante.formaPago, pageWidth / 2 + 32, y + 22);

  y += 31;

  // ── 3. Detalles de Notas / Entregas Relacionadas (si las hay) ──
  if (data.movimiento.entregasHoy && data.movimiento.entregasHoy.length > 0) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(12, y, pageWidth - 24, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('MOVIMIENTOS / ENTREGAS ASOCIADAS', 16, y + 4.5);
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    data.movimiento.entregasHoy.forEach((e) => {
      doc.text(`• ${e.nota}`, 16, y);
      doc.text(`$${e.monto.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });
      y += 5;
    });
    y += 2;
  }

  // ── 4. Cuadro Principal de Liquidación del Abono ─────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(12, y, pageWidth - 24, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('CONCEPTO Y DESGLOSE DE MOVIMIENTO', 16, y + 5);
  doc.text('VALORES (USD)', pageWidth - 16, y + 5, { align: 'right' });
  y += 7.5;

  const filas = [
    {
      concepto: 'Saldo Anterior Adeudado por el Cliente',
      desc: data.movimiento.numeroNota ? `Cuenta corriente asociada (${data.movimiento.numeroNota})` : 'Total consolidado pendiente antes del abono',
      monto: data.movimiento.saldoAnterior,
      tipo: 'NORMAL',
    },
    {
      concepto: 'MONTO DEL ABONO RECIBIDO',
      desc: `Liquidación vía ${data.comprobante.formaPago}${data.comprobante.referencia ? ` (Ref: ${data.comprobante.referencia})` : ''}`,
      monto: -data.movimiento.montoAbonado,
      tipo: 'ABONO',
    },
    {
      concepto: 'SALDO PENDIENTE ACTUAL RESTANTE',
      desc: data.movimiento.saldoRestante <= 0 ? '¡CUENTA TOTALMENTE SALDADA!' : 'Saldo remanente por cobrar',
      monto: data.movimiento.saldoRestante,
      tipo: 'SALDO_FINAL',
    },
  ];

  filas.forEach((f, idx) => {
    const alturaFila = 12;
    if (idx % 2 === 0 && f.tipo !== 'SALDO_FINAL') {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, pageWidth - 24, alturaFila, 'F');
    } else if (f.tipo === 'SALDO_FINAL') {
      doc.setFillColor(240, 253, 244); // Fondo verde muy tenue
      doc.rect(12, y, pageWidth - 24, alturaFila, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(12, y + alturaFila, pageWidth - 12, y + alturaFila);

    // Concepto
    doc.setFont('helvetica', f.tipo === 'NORMAL' ? 'normal' : 'bold');
    doc.setFontSize(8.5);
    if (f.tipo === 'ABONO') {
      doc.setTextColor(16, 185, 129); // Verde esmeralda
    } else if (f.tipo === 'SALDO_FINAL') {
      doc.setTextColor(f.monto <= 0 ? 16 : 225, f.monto <= 0 ? 185 : 29, f.monto <= 0 ? 129 : 72);
    } else {
      doc.setTextColor(15, 23, 42);
    }

    doc.text(f.concepto, 16, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(f.desc, 16, y + 9.5);

    // Monto
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    if (f.tipo === 'ABONO') {
      doc.setTextColor(16, 185, 129);
      doc.text(`-$${Math.abs(f.monto).toFixed(2)}`, pageWidth - 16, y + 7.5, { align: 'right' });
    } else if (f.tipo === 'SALDO_FINAL') {
      if (f.monto <= 0) {
        doc.setTextColor(16, 185, 129);
        doc.text('$0.00 (SALDADA)', pageWidth - 16, y + 7.5, { align: 'right' });
      } else {
        doc.setTextColor(225, 29, 72); // Rose 600
        doc.text(`$${f.monto.toFixed(2)}`, pageWidth - 16, y + 7.5, { align: 'right' });
      }
    } else {
      doc.setTextColor(15, 23, 42);
      doc.text(`$${f.monto.toFixed(2)}`, pageWidth - 16, y + 7.5, { align: 'right' });
    }

    y += alturaFila;
  });

  y += 6;

  // Observaciones adicionales
  if (data.comprobante.notas) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(12, y, pageWidth - 24, 12, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('OBSERVACIONES / NOTAS:', 16, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(data.comprobante.notas, 16, y + 8.5);
    y += 16;
  } else {
    y += 4;
  }

  // ── 5. Firmas de Conformidad ─────────────
  const firmaY = Math.max(y + 12, 210);

  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1.5, 1.5], 0);

  // Línea firma cajero/emisor
  doc.line(30, firmaY, 85, firmaY);
  // Línea firma cliente
  doc.line(pageWidth - 85, firmaY, pageWidth - 30, firmaY);
  doc.setLineDashPattern([], 0); // Restaurar sólido

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('RECIBIDO CONFORME (CAJA)', 57.5, firmaY + 4, { align: 'center' });
  doc.text('CLIENTE / PAGADOR', pageWidth - 57.5, firmaY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(data.comprobante.cajero ? `Cajero/a: ${data.comprobante.cajero}` : data.emisor.nombre, 57.5, firmaY + 8, { align: 'center' });
  doc.text(data.cliente.nombre, pageWidth - 57.5, firmaY + 8, { align: 'center' });

  // ── 6. Footer de Seguridad y Validez ─────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(12, 268, pageWidth - 24, 15, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(12, 268, pageWidth - 12, 268);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Este documento certifica el abono recibido a la cuenta corriente del cliente en ${data.emisor.nombre || 'el establecimiento'}.`,
    pageWidth / 2,
    273,
    { align: 'center' }
  );
  doc.text(
    `Generado el ${new Date().toLocaleString('es-EC')} • Comprobante válido para control interno y conciliación comercial.`,
    pageWidth / 2,
    277,
    { align: 'center' }
  );

  return doc;
}

/**
 * Descarga el PDF del comprobante de abono
 */
export function descargarComprobanteAbonoPdf(data: ComprobanteAbonoPdfData): void {
  const doc = generarComprobanteAbonoPdfDoc(data);
  const cleanNum = data.comprobante.numero.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Recibo_Abono_${cleanNum}.pdf`);
}


/**
 * Genera el texto formal para WhatsApp
 */
export function armarMensajeWhatsAppAbono(data: ComprobanteAbonoPdfData, incluirDescargaPdf = false): string {
  const nombreNegocio = data.emisor.nombre || 'Administración de Cobros';
  let msg = `Estimado/a *${data.cliente.nombre}*,\n\n`;
  msg += `Le saludamos de *${nombreNegocio}*. Confirmamos la recepción de su abono:\n\n`;
  msg += `📋 *COMPROBANTE DE ABONO No:* ${data.comprobante.numero}\n`;
  msg += `📅 *Fecha y Hora:* ${data.comprobante.fecha}${data.comprobante.hora ? ` a las ${data.comprobante.hora}` : ''}\n`;
  msg += `💳 *Método de Pago:* ${data.comprobante.formaPago}\n`;
  if (data.comprobante.referencia) {
    msg += `🔖 *Referencia / Banco:* ${data.comprobante.referencia}\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💵 *Saldo Anterior:* $${data.movimiento.saldoAnterior.toFixed(2)}\n`;
  msg += `✅ *Abono Aplicado:* -$${data.movimiento.montoAbonado.toFixed(2)}\n`;

  if (data.movimiento.saldoRestante <= 0) {
    msg += `🎉 *SALDO PENDIENTE: $0.00 (CUENTA SALDADA)*\n`;
  } else {
    msg += `📌 *SALDO PENDIENTE ACTUAL: $${data.movimiento.saldoRestante.toFixed(2)}*\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Enlace oficial al recibo digital (se adapta automáticamente al dominio desplegado)
  try {
    const urlRecibo = generarUrlPublicaAbono(data);
    if (urlRecibo) {
      msg += `🔗 *Ver o descargar comprobante digital oficial:*\n${urlRecibo}\n\n`;
    }
  } catch (e) {
    // Si falla, el mensaje continúa con el detalle completo
  }

  if (incluirDescargaPdf) {
    msg += `📄 _Adjuntamos a continuación su Comprobante Oficial para su archivo digital._\n\n`;
  }

  msg += `¡Agradecemos su puntualidad y confianza!\n*${nombreNegocio}*`;
  return msg;
}

/**
 * Comparte el Comprobante de Abono en PDF vía WhatsApp:
 * - Envía el archivo PDF directo al WhatsApp del cliente mediante Web Share API (adjunto).
 * - Exactamente igual que el envío de Factura PDF a WhatsApp.
 */
export async function compartirComprobanteAbonoPdf(
  data: ComprobanteAbonoPdfData,
  telefono: string,
  descargarLocalmente: boolean = false
): Promise<{ metodo: 'WEB_SHARE' | 'DOWNLOAD_WHATSAPP' }> {
  let numLimpio = telefono.replace(/\D/g, '');
  if (numLimpio.startsWith('09') && numLimpio.length === 10) {
    numLimpio = '593' + numLimpio.substring(1);
  } else if (numLimpio.startsWith('0') && numLimpio.length === 10) {
    numLimpio = '593' + numLimpio.substring(1);
  }

  const mensajeTexto = armarMensajeWhatsAppAbono(data, false);

  // Si el usuario solicitó expresamente descargar el archivo en su equipo
  if (descargarLocalmente) {
    const doc = generarComprobanteAbonoPdfDoc(data);
    const cleanNum = data.comprobante.numero.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Recibo_Abono_${cleanNum}.pdf`);
  }

  // Apertura directa e inmediata de WhatsApp sin ventanas emergentes de Windows
  const waUrl = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensajeTexto)}`;
  try {
    const win = window.open(waUrl, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (e) {
    const a = document.createElement('a');
    a.href = waUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return { metodo: 'DOWNLOAD_WHATSAPP' };
}
