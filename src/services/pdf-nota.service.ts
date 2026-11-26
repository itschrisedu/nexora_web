import { jsPDF } from 'jspdf';
import { capitalizarNombreCompleto } from '@/utils/text-formatters';
import { cargarImagenComoBase64, dibujarPlaceholderCalzado } from './pdf-historial.service';

export interface NotaPdfModeloItem {
  modelo: string;
  color?: string;
  serie?: string;
  imageUrl?: string | null;
  loadedImageBase64?: string | null;
  tallasTexto: string;
  cantidadPares: number;
  etiquetaVolumen: string;
  precioUnitario: number;
  subtotal: number;
}

export interface NotaPdfAbonoItem {
  fecha: string;
  metodo: string;
  monto: number;
  referencia?: string;
}

export interface NotaVentaPdfData {
  emisor: {
    nombre: string;
    ruc: string;
    direccion: string;
    telefono?: string;
    email?: string;
    sucursal?: string;
  };
  nota: {
    numero: string;
    orderCodigo?: string;
    fechaEmision: string;
    fechaVencimiento?: string;
    tipo: string;
    estado: string;
    vendedor?: string;
    logistica: string;
    montoOriginal: number;
    totalAbonado: number;
    saldoPendiente: number;
  };
  cliente: {
    nombre: string;
    cedula: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    nivelCredito?: string;
  };
  items: NotaPdfModeloItem[];
  abonos?: NotaPdfAbonoItem[];
}

/**
 * Genera el documento PDF profesional de una Nota de Venta / Entrega de Calzado (A4)
 */
export function generarNotaVentaPdfDoc(data: NotaVentaPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2;
  let y = 14;

  const asegurarEspacio = (alturaNecesaria: number) => {
    if (y + alturaNecesaria > pageHeight - 24) {
      doc.addPage();
      y = 16;
    }
  };

  // ── 1. Encabezado Institucional del Negocio ─────────────────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(marginX, y, contentWidth, 38, 2.5, 2.5, 'F');

  // Franja decorativa esmeralda
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(marginX, y + 36, contentWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.emisor.nombre || 'CALZADO DE CUERO', 18, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(203, 213, 225);
  doc.text(`RUC: ${data.emisor.ruc || '1804884664001'}`, 18, y + 16);
  doc.text(`Dirección: ${data.emisor.direccion || 'Cevallos, Tungurahua, Ecuador'}`, 18, y + 21);
  doc.text(
    `Teléfono: ${data.emisor.telefono || '—'}${data.emisor.email ? ' | Email: ' + data.emisor.email : ''}`,
    18,
    y + 26
  );
  doc.text(
    data.emisor.sucursal ? `Sucursal: ${data.emisor.sucursal}` : 'Control Operativo de Comercialización y Cartera',
    18,
    y + 31
  );

  // Recuadro derecho: Identificador de la Nota
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 76, y + 4.5, 59, 29, 2, 2, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('NOTA DE ENTREGA', pageWidth - 46.5, y + 11, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setTextColor(16, 185, 129);
  doc.text(data.nota.numero, pageWidth - 46.5, y + 17, { align: 'center' });

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Emisión: ${data.nota.fechaEmision}`, pageWidth - 46.5, y + 22.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Estado: ${data.nota.estado.toUpperCase()}`, pageWidth - 46.5, y + 27.5, { align: 'center' });

  y += 44;

  // ── 2. Datos del Cliente y Operación ────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, contentWidth, 31, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('INFORMACIÓN DEL CLIENTE Y OPERACIÓN', 17, y + 6);

  // Columna izquierda (Cliente)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Cliente:', 17, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(capitalizarNombreCompleto(data.cliente.nombre) || 'Cliente', 42, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('C.I. / RUC:', 17, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.cliente.cedula || 'Consumidor Final', 42, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Teléfono:', 17, y + 22);
  doc.setTextColor(15, 23, 42);
  doc.text(data.cliente.telefono || '—', 42, y + 22);

  doc.setTextColor(71, 85, 105);
  doc.text('Dirección:', 17, y + 27);
  doc.setTextColor(15, 23, 42);
  doc.text((data.cliente.direccion || 'Ecuador').slice(0, 42), 42, y + 27);

  // Columna derecha (Nota / Logística)
  const colDerX = pageWidth / 2 + 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Modalidad:', colDerX, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.nota.tipo || 'Crédito', colDerX + 24, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Pedido Ref.:', colDerX, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.nota.orderCodigo ? `#${data.nota.orderCodigo}` : 'Registro manual', colDerX + 24, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Vencimiento:', colDerX, y + 22);
  doc.setTextColor(15, 23, 42);
  doc.text(data.nota.fechaVencimiento || 'No definido', colDerX + 24, y + 22);

  doc.setTextColor(71, 85, 105);
  doc.text('Vendedor:', colDerX, y + 27);
  doc.setTextColor(15, 23, 42);
  doc.text(capitalizarNombreCompleto(data.nota.vendedor || '') || '—', colDerX + 24, y + 27);

  y += 35;

  // Franja de logística
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, y, contentWidth, 7.5, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(data.nota.logistica, 16, y + 5);

  y += 12;

  // ── 3. Tabla de Detalle de Calzado Entregado ────────────────────────
  const dibujarCabeceraTabla = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, y, contentWidth, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('MODELO / SERIE / COLOR', 15, y + 5.3);
    doc.text('CURVA DE TALLAS', 80, y + 5.3);
    doc.text('PARES', 143, y + 5.3, { align: 'right' });
    doc.text('P. UNIT.', 168, y + 5.3, { align: 'right' });
    doc.text('SUBTOTAL', pageWidth - 15, y + 5.3, { align: 'right' });
    y += 8;
  };

  dibujarCabeceraTabla();

  let totalPares = 0;

  if (data.items.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, y, contentWidth, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, y + 12, pageWidth - marginX, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Cargo comercial directo / Registro manual sin desglose de pares.', 16, y + 7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`$${data.nota.montoOriginal.toFixed(2)}`, pageWidth - 15, y + 7.5, { align: 'right' });
    y += 12;
  } else {
    data.items.forEach((item, idx) => {
      totalPares += item.cantidadPares;
      const detallesSub = [
        item.serie ? `Serie: ${item.serie}` : '',
        item.color ? `Color: ${item.color}` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      const tallasLines = doc.splitTextToSize(item.tallasTexto || '—', 50);
      const modeloLines = doc.splitTextToSize(item.modelo, 45);
      const alturaContenido = Math.max(modeloLines.length * 4 + (detallesSub ? 4.5 : 0), tallasLines.length * 3.8);
      const alturaFila = Math.max(18, alturaContenido + 5);

      if (y + alturaFila > pageHeight - 28) {
        doc.addPage();
        y = 16;
        dibujarCabeceraTabla();
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, contentWidth, alturaFila, 'F');
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, y + alturaFila, pageWidth - marginX, y + alturaFila);

      // Miniatura del modelo
      const imgX = 14.5;
      const imgY = y + 2;
      const imgSize = 14;
      if (item.loadedImageBase64) {
        try {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(imgX, imgY, imgSize, imgSize, 1.2, 1.2, 'FD');
          doc.addImage(item.loadedImageBase64, 'JPEG', imgX + 0.5, imgY + 0.5, imgSize - 1, imgSize - 1);
        } catch {
          dibujarPlaceholderCalzado(doc, imgX, imgY, imgSize, item.modelo);
        }
      } else {
        dibujarPlaceholderCalzado(doc, imgX, imgY, imgSize, item.modelo);
      }

      // Modelo + serie/color
      const textModeloX = 31;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(modeloLines, textModeloX, y + 5.5);

      if (detallesSub) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(detallesSub.slice(0, 38), textModeloX, y + 5.5 + modeloLines.length * 4);
      }

      // Tallas
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);
      doc.text(tallasLines, 80, y + 5.5);

      // Pares y volumen
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${item.cantidadPares}`, 143, y + 6, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(item.etiquetaVolumen, 143, y + 10, { align: 'right' });

      // Precio unitario
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`$${item.precioUnitario.toFixed(2)}`, 168, y + 7, { align: 'right' });

      // Subtotal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129);
      doc.text(`$${item.subtotal.toFixed(2)}`, pageWidth - 15, y + 7, { align: 'right' });

      y += alturaFila;
    });
  }

  // Fila total de pares
  if (totalPares > 0) {
    asegurarEspacio(10);
    const totalDocenas = (totalPares / 12).toFixed(1).replace('.0', '');
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, y, contentWidth, 8.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, y + 8.5, pageWidth - marginX, y + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `TOTAL MERCADERÍA ENTREGADA: ${totalPares} ${totalPares === 1 ? 'par' : 'pares'} (${totalDocenas} ${Number(totalDocenas) === 1 ? 'Docena' : 'Docenas'})`,
      15,
      y + 5.6
    );
    doc.setFontSize(8.5);
    doc.text(`$${data.nota.montoOriginal.toFixed(2)}`, pageWidth - 15, y + 5.6, { align: 'right' });
    y += 12;
  } else {
    y += 6;
  }

  // ── 4. Abonos Aplicados a Esta Nota (si existen) ────────────────────
  if (data.abonos && data.abonos.length > 0) {
    asegurarEspacio(24);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(marginX, y, contentWidth, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    doc.text(`ABONOS REGISTRADOS EN ESTA NOTA (${data.abonos.length})`, 16, y + 4.8);
    y += 8.5;

    data.abonos.forEach((abono, idx) => {
      asegurarEspacio(8);
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, contentWidth, 7.5, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, y + 7.5, pageWidth - marginX, y + 7.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(abono.fecha, 16, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(abono.metodo, 46, y + 5);

      if (abono.referencia) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(abono.referencia.slice(0, 50), 82, y + 5);
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`+$${abono.monto.toFixed(2)}`, pageWidth - 15, y + 5, { align: 'right' });
      y += 7.5;
    });

    y += 5;
  }

  // ── 5. Resumen Financiero de la Nota ────────────────────────────────
  asegurarEspacio(32);
  const resumenW = 86;
  const resumenX = pageWidth - marginX - resumenW;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(resumenX, y, resumenW, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Monto Original de la Nota:', resumenX + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${data.nota.montoOriginal.toFixed(2)}`, pageWidth - marginX - 4, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Abonado:', resumenX + 4, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`-$${data.nota.totalAbonado.toFixed(2)}`, pageWidth - marginX - 4, y + 12, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(resumenX + 3, y + 15, pageWidth - marginX - 3, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('SALDO PENDIENTE:', resumenX + 4, y + 20.5);

  if (data.nota.saldoPendiente <= 0) {
    doc.setTextColor(16, 185, 129);
    doc.text('$0.00 (SALDADA)', pageWidth - marginX - 4, y + 20.5, { align: 'right' });
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text(`$${data.nota.saldoPendiente.toFixed(2)}`, pageWidth - marginX - 4, y + 20.5, { align: 'right' });
  }

  y += 32;

  // ── 6. Firmas de Conformidad ────────────────────────────────────────
  asegurarEspacio(32);
  const firmaY = Math.max(y + 10, pageHeight - 48);

  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(30, firmaY, 85, firmaY);
  doc.line(pageWidth - 85, firmaY, pageWidth - 30, firmaY);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('ENTREGADO CONFORME (EMISOR)', 57.5, firmaY + 4, { align: 'center' });
  doc.text('RECIBIDO CONFORME (CLIENTE)', pageWidth - 57.5, firmaY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(data.emisor.nombre || 'Establecimiento Comercial', 57.5, firmaY + 8, { align: 'center' });
  doc.text(capitalizarNombreCompleto(data.cliente.nombre) || 'Cliente', pageWidth - 57.5, firmaY + 8, { align: 'center' });

  // ── 7. Pie de Página ────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, pageHeight - 20, contentWidth, 12, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, pageHeight - 20, pageWidth - marginX, pageHeight - 20);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Documento de control operativo interno de entrega de mercadería y estado de cuenta por nota.',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  doc.text(
    `Generado el ${new Date().toLocaleString('es-EC')} · ${data.emisor.nombre || 'Calzado de Cuero'}`,
    pageWidth / 2,
    pageHeight - 11,
    { align: 'center' }
  );

  return doc;
}

/**
 * Descarga directamente el PDF de la Nota de Venta / Entrega (precargando imágenes de modelos)
 */
export async function descargarNotaVentaPdf(data: NotaVentaPdfData): Promise<void> {
  const itemsConImagenes = await Promise.all(
    (data.items || []).map(async (item) => {
      if (item.loadedImageBase64) return item;
      const b64 = item.imageUrl ? await cargarImagenComoBase64(item.imageUrl) : null;
      return {
        ...item,
        loadedImageBase64: b64,
      };
    })
  );

  const doc = generarNotaVentaPdfDoc({
    ...data,
    items: itemsConImagenes,
  });
  const numLimpio = (data.nota.numero || 'Nota').replace(/[^a-zA-Z0-9_-]/g, '_');
  const clienteLimpio = (data.cliente.nombre || 'Cliente')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
  doc.save(`${numLimpio}_${clienteLimpio}.pdf`);
}
