import { jsPDF } from "jspdf";

export interface FacturaPdfData {
  emisor: {
    nombre: string;
    ruc: string;
    direccion: string;
    telefono?: string;
    email?: string;
    obligadoContabilidad?: boolean;
    ambiente?: string;
    establecimiento?: string;
    puntoEmision?: string;
  };
  comprobante: {
    numero: string;
    fecha: string;
    claveAcceso?: string;
    formaPago?: string;
  };
  comprador: {
    nombre: string;
    cedula: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  detalles: {
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento?: number;
    tarifaIva?: number;
    subtotal: number;
  }[];
  totales: {
    subtotal15: number;
    subtotal0: number;
    descuento: number;
    iva15: number;
    total: number;
  };
}

/**
 * Genera el documento PDF formal de la Factura Electrónica
 */
export function generarFacturaPdfDoc(data: FacturaPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // ── 1. Encabezado / Emisor ─────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(12, y, pageWidth - 24, 38, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.emisor.nombre || "NEXORA - CALZADO DE CUERO", 18, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`RUC: ${data.emisor.ruc || "1804884664001"}`, 18, y + 15);
  doc.text(`Matriz: ${data.emisor.direccion || "Cevallos, Tungurahua, Ecuador"}`, 18, y + 20);
  doc.text(`Obligado a llevar Contabilidad: ${data.emisor.obligadoContabilidad ? "SI" : "NO"}`, 18, y + 25);
  if (data.emisor.email) {
    doc.text(`Email: ${data.emisor.email}`, 18, y + 30);
  }

  // Cuadro Número Factura (derecha)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 75, y + 4, 58, 28, 1.5, 1.5, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("FACTURA ELECTRÓNICA", pageWidth - 46, y + 11, { align: "center" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`No. ${data.comprobante.numero || "001-001-000000001"}`, pageWidth - 46, y + 17, { align: "center" });
  doc.text(`Fecha: ${data.comprobante.fecha || new Date().toLocaleDateString("es-EC")}`, pageWidth - 46, y + 23, { align: "center" });
  doc.text(`Ambiente: ${data.emisor.ambiente === "2" ? "PRODUCCIÓN" : "PRUEBAS"}`, pageWidth - 46, y + 28, { align: "center" });

  y += 42;

  // Clave de Acceso si existe
  if (data.comprobante.claveAcceso) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(12, y, pageWidth - 24, 10, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("CLAVE DE ACCESO SRI:", 16, y + 4);
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(data.comprobante.claveAcceso, 16, y + 8);
    y += 13;
  }

  // ── 2. Datos del Comprador ─────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 22, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text("DATOS DEL CLIENTE / COMPRADOR", 16, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Razón Social: ${data.comprador.nombre}`, 16, y + 11);
  doc.text(`Identificación: ${data.comprador.cedula}`, 16, y + 16);

  doc.text(`Dirección: ${data.comprador.direccion || "Cevallos, Ecuador"}`, pageWidth / 2 + 10, y + 11);
  doc.text(`Email: ${data.comprador.email || "No registrado"}`, pageWidth / 2 + 10, y + 16);

  y += 26;

  // ── 3. Tabla de Productos ─────────────
  // Header tabla
  doc.setFillColor(15, 23, 42);
  doc.rect(12, y, pageWidth - 24, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPCIÓN PRODUCTO", 16, y + 4.5);
  doc.text("CANT.", pageWidth - 78, y + 4.5, { align: "center" });
  doc.text("P. UNIT.", pageWidth - 58, y + 4.5, { align: "right" });
  doc.text("IVA", pageWidth - 42, y + 4.5, { align: "center" });
  doc.text("SUBTOTAL", pageWidth - 16, y + 4.5, { align: "right" });

  y += 7;

  // Líneas
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  data.detalles.forEach((d, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, pageWidth - 24, 6.5, "F");
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(12, y + 6.5, pageWidth - 12, y + 6.5);

    doc.text(d.descripcion, 16, y + 4.5);
    doc.text(String(d.cantidad), pageWidth - 78, y + 4.5, { align: "center" });
    doc.text(`$${d.precioUnitario.toFixed(2)}`, pageWidth - 58, y + 4.5, { align: "right" });
    doc.text(`${d.tarifaIva ?? 15}%`, pageWidth - 42, y + 4.5, { align: "center" });
    doc.text(`$${d.subtotal.toFixed(2)}`, pageWidth - 16, y + 4.5, { align: "right" });

    y += 6.5;
  });

  y += 4;

  // ── 4. Totales ─────────────
  const startTotalsX = pageWidth - 80;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(startTotalsX, y, 68, 26, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text("SUBTOTAL 15%:", startTotalsX + 4, y + 5);
  doc.text(`$${data.totales.subtotal15.toFixed(2)}`, startTotalsX + 64, y + 5, { align: "right" });

  doc.text("SUBTOTAL 0%:", startTotalsX + 4, y + 10);
  doc.text(`$${data.totales.subtotal0.toFixed(2)}`, startTotalsX + 64, y + 10, { align: "right" });

  doc.text("IVA 15%:", startTotalsX + 4, y + 15);
  doc.text(`$${data.totales.iva15.toFixed(2)}`, startTotalsX + 64, y + 15, { align: "right" });

  doc.setDrawColor(203, 213, 225);
  doc.line(startTotalsX + 4, y + 18, startTotalsX + 64, y + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("VALOR TOTAL:", startTotalsX + 4, y + 23);
  doc.text(`$${data.totales.total.toFixed(2)}`, startTotalsX + 64, y + 23, { align: "right" });

  // Pie de página
  y += 34;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Documento generado electrónicamente por NEXORA — Sistema de Gestión Comercial y Financiera", pageWidth / 2, y, { align: "center" });

  return doc;
}

/**
 * Comparte el archivo PDF directamente (mediante Web Share API nativo si está soportado,
 * o descargando y abriendo WhatsApp con mensaje formateado)
 */
export async function compartirFacturaPdf(
  data: FacturaPdfData,
  telefono: string
): Promise<{ metodo: "WEB_SHARE" | "DOWNLOAD_WHATSAPP" }> {
  const doc = generarFacturaPdfDoc(data);
  const pdfBlob = doc.output("blob");
  const fileName = `Factura_${data.comprobante.numero.replace(/\s+/g, "_")}.pdf`;
  const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

  let numLimpio = telefono.replace(/\D/g, "");
  if (numLimpio.startsWith("09") && numLimpio.length === 10) {
    numLimpio = "593" + numLimpio.substring(1);
  } else if (numLimpio.startsWith("0") && numLimpio.length === 10) {
    numLimpio = "593" + numLimpio.substring(1);
  }

  const mensajeTexto = `Estimado/a ${data.comprador.nombre},\n\nAdjuntamos su Factura Electrónica Oficial No. ${data.comprobante.numero}.\n\n💵 Total: $${data.totales.total.toFixed(2)}\n\n¡Gracias por su compra!\n${data.emisor.nombre}`;

  // 1. Intentar Web Share API con archivo físico
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        title: `Factura ${data.comprobante.numero}`,
        text: mensajeTexto,
        files: [pdfFile],
      });
      return { metodo: "WEB_SHARE" };
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Error en navigator.share, usando fallback WhatsApp:", err);
      } else {
        return { metodo: "WEB_SHARE" };
      }
    }
  }

  // 2. Fallback: Descarga automática del archivo PDF + apertura directa de WhatsApp Web
  doc.save(fileName);
  const waUrl = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensajeTexto)}`;
  window.open(waUrl, "_blank");

  return { metodo: "DOWNLOAD_WHATSAPP" };
}

// ══════════════════════════════════════════
// GENERACIÓN DE PDF PARA ÓRDENES DE COMPRA
// ══════════════════════════════════════════

export interface OrdenCompraPdfData {
  emisor: {
    nombre: string;
    ruc: string;
    direccion: string;
    telefono?: string;
    email?: string;
  };
  orden: {
    numero: string;
    fecha: string;
    estado: string;
    observaciones?: string;
  };
  proveedor: {
    nombre: string;
    ruc: string;
    contacto?: string;
    direccion?: string;
    email?: string;
  };
  lineas: {
    modelo: string;
    marca?: string;
    color?: string;
    codigo: string;
    imageUrl?: string;
    cantidadPares: number;
    precioCosto: number;
    subtotal: number;
    observacion?: string;
  }[];
  totales: {
    totalPares: number;
    totalPagar: number;
  };
}

export function generarOrdenCompraPdfDoc(data: OrdenCompraPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // ── Encabezado / Empresa ──
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(12, y, pageWidth - 24, 34, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.emisor.nombre || "COMERCIAL DE CALZADO", 18, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`RUC: ${data.emisor.ruc || "1804884664001"}`, 18, y + 15);
  doc.text(`Dirección: ${data.emisor.direccion || "Cevallos, Tungurahua, Ecuador"}`, 18, y + 20);
  if (data.emisor.telefono) {
    doc.text(`Teléfono / Contacto: ${data.emisor.telefono}`, 18, y + 25);
  }

  // Cuadro Número de Orden (derecha)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 75, y + 4, 58, 26, 1.5, 1.5, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ORDEN DE COMPRA", pageWidth - 46, y + 11, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text(`No. ${data.orden.numero}`, pageWidth - 46, y + 17, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha: ${data.orden.fecha}`, pageWidth - 46, y + 23, { align: "center" });

  y += 38;

  // ── Datos del Proveedor ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 24, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text("PROVEEDOR / TALLER DE PRODUCCIÓN", 16, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Razón Social: ${data.proveedor.nombre}`, 16, y + 11);
  doc.text(`RUC / C.I: ${data.proveedor.ruc}`, 16, y + 16);
  if (data.proveedor.contacto) {
    doc.text(`Teléfono / Contacto: ${data.proveedor.contacto}`, 16, y + 21);
  }

  doc.text(`Dirección: ${data.proveedor.direccion || "No especificada"}`, pageWidth / 2 + 10, y + 11);
  doc.text(`Email: ${data.proveedor.email || "No registrado"}`, pageWidth / 2 + 10, y + 16);
  doc.text(`Estado: ${data.orden.estado}`, pageWidth / 2 + 10, y + 21);

  y += 28;

  // ── Observaciones Generales ──
  if (data.orden.observaciones) {
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(12, y, pageWidth - 24, 11, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text("OBSERVACIONES / ESPECIFICACIONES DE ENTREGA:", 16, y + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(data.orden.observaciones, 16, y + 8.5);
    y += 15;
  }

  // ── Tabla de Modelos Solicitados ──
  doc.setFillColor(15, 23, 42);
  doc.rect(12, y, pageWidth - 24, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("MODELO / PRODUCTO", 16, y + 4.5);
  doc.text("CANTIDAD", pageWidth - 75, y + 4.5, { align: "center" });
  doc.text("P. COSTO", pageWidth - 48, y + 4.5, { align: "right" });
  doc.text("SUBTOTAL", pageWidth - 16, y + 4.5, { align: "right" });

  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  data.lineas.forEach((line, i) => {
    const rowHeight = line.observacion ? 11 : 7.5;
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, pageWidth - 24, rowHeight, "F");
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(12, y + rowHeight, pageWidth - 12, y + rowHeight);

    const docenas = (line.cantidadPares / 12).toFixed(1);
    const textoPares = line.cantidadPares >= 12
      ? `${line.cantidadPares} pares (${docenas} doc.)`
      : line.cantidadPares === 6
      ? `6 pares (½ docena)`
      : `${line.cantidadPares} pares`;

    doc.setFont("helvetica", "bold");
    doc.text(`${line.marca ? line.marca + " " : ""}${line.modelo} (${line.codigo}${line.color ? " - " + line.color : ""})`, 16, y + 4.5);
    
    if (line.observacion) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(180, 83, 9);
      doc.text(`Nota: ${line.observacion}`, 16, y + 8.5);
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
    }

    doc.setFont("helvetica", "normal");
    doc.text(textoPares, pageWidth - 75, y + 4.5, { align: "center" });
    doc.text(`$${Number(line.precioCosto).toFixed(2)}`, pageWidth - 48, y + 4.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`$${Number(line.subtotal).toFixed(2)}`, pageWidth - 16, y + 4.5, { align: "right" });

    y += rowHeight;
  });

  y += 5;

  // ── Totales y Firmas ──
  const startTotalsX = pageWidth - 85;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(startTotalsX, y, 73, 20, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL PARES PEDIDOS:", startTotalsX + 4, y + 6);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.totales.totalPares} pares`, startTotalsX + 69, y + 6, { align: "right" });

  doc.setDrawColor(203, 213, 225);
  doc.line(startTotalsX + 4, y + 9, startTotalsX + 69, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("VALOR TOTAL ORDEN:", startTotalsX + 4, y + 15);
  doc.setTextColor(180, 83, 9);
  doc.text(`$${data.totales.totalPagar.toFixed(2)}`, startTotalsX + 69, y + 15, { align: "right" });

  // Espacios de firmas
  y += 28;
  doc.setDrawColor(148, 163, 184);
  doc.line(20, y + 12, 80, y + 12);
  doc.line(pageWidth - 80, y + 12, pageWidth - 20, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Autorizado por (Comprador)", 50, y + 16, { align: "center" });
  doc.text("Recibido por (Proveedor)", pageWidth - 50, y + 16, { align: "center" });

  // Footer
  y += 24;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Documento oficial de Orden de Compra emitido electrónicamente", pageWidth / 2, y, { align: "center" });

  return doc;
}

export function descargarOrdenCompraPdf(data: OrdenCompraPdfData): void {
  const doc = generarOrdenCompraPdfDoc(data);
  const fileName = `Orden_Compra_${data.orden.numero}.pdf`;
  doc.save(fileName);
}

