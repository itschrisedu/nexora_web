import { jsPDF } from "jspdf";
import { generarUrlPublicaFactura, generarUrlPublicaOrden } from "./comprobante-url.service";
import { capitalizarNombreCompleto } from "@/utils/text-formatters";
import { abrirWhatsAppUniversal } from "@/utils/whatsapp";

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
  doc.text(`Razón Social: ${capitalizarNombreCompleto(data.comprador.nombre)}`, 16, y + 11);
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
  doc.text(`Documento generado electrónicamente por ${data.emisor.nombre || "el establecimiento"} — Comprobante Tributario Oficial`, pageWidth / 2, y, { align: "center" });

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
  let numLimpio = telefono.replace(/\D/g, "");
  if (numLimpio.startsWith("09") && numLimpio.length === 10) {
    numLimpio = "593" + numLimpio.substring(1);
  } else if (numLimpio.startsWith("0") && numLimpio.length === 10) {
    numLimpio = "593" + numLimpio.substring(1);
  }

  const emisorNombre = data.emisor.nombre || "Facturación";
  let itemsTexto = "";
  if (Array.isArray(data.detalles)) {
    data.detalles.slice(0, 8).forEach((it) => {
      itemsTexto += `\n• ${it.cantidad}x ${it.descripcion} - $${Number(it.subtotal || it.cantidad * it.precioUnitario).toFixed(2)}`;
    });
    if (data.detalles.length > 8) {
      itemsTexto += `\n... y ${data.detalles.length - 8} ítems adicionales`;
    }
  }

  let urlDigital = "";
  try {
    urlDigital = await generarUrlPublicaFactura(data);
  } catch (e) {}

  const subtotalFactura = (Number(data.totales?.subtotal15 || 0) + Number(data.totales?.subtotal0 || 0));
  const ivaFactura = Number(data.totales?.iva15 || 0);
  const totalFactura = Number(data.totales?.total || 0);

  const mensajeTexto = `Estimado/a *${data.comprador.nombre}*,\n\nLe saludamos de *${emisorNombre}*. Adjuntamos el detalle de su Factura Electrónica Oficial:\n\n🧾 *FACTURA No:* ${data.comprobante.numero}\n📅 *Fecha:* ${data.comprobante.fecha}\n👤 *RUC/Cédula:* ${data.comprador.cedula}${itemsTexto ? `\n\n📦 *DETALLE DE COMPRA:*${itemsTexto}` : ""}\n\n━━━━━━━━━━━━━━━━━━━━━\n💵 *Subtotal:* $${subtotalFactura.toFixed(2)}\n📊 *IVA (15%):* $${ivaFactura.toFixed(2)}\n💰 *TOTAL FACTURA:* $${totalFactura.toFixed(2)}\n━━━━━━━━━━━━━━━━━━━━━\n${urlDigital ? `\n📥 *Descarga aquí tu factura digital oficial:*\n👉 ${urlDigital}\n` : ""}\n¡Muchas gracias por su preferencia!\n*${emisorNombre}*`;

  // Apertura directa universal de WhatsApp
  abrirWhatsAppUniversal(numLimpio, mensajeTexto);

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
    serie?: string;
    numeracion?: string;
    imageUrl?: string;
    tallasDetalle?: Array<{ talla: string | number; cantidad: number }>;
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

/**
 * Pre-carga una imagen a Base64 con timeout seguro para jsPDF
 */
async function cargarImagenComoBase64(url: string, timeoutMs = 2500): Promise<string | null> {
  if (!url || typeof window === "undefined") return null;
  if (url.startsWith("data:image/")) return url;

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 120;
          canvas.height = img.naturalHeight || img.height || 120;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            resolve(dataUrl);
            return;
          }
        } catch {
          // Si el canvas es bloqueado por CORS, resolver null
        }
        resolve(null);
      };
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      };
      img.src = url;
    } catch {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Limpia y filtra observaciones para que NUNCA aparezcan referencias a pedidos sin stock,
 * clientes particulares ni textos internos del sistema en la orden de compra del taller.
 */
export function limpiarObservacionesOrden(obs?: string): string {
  if (!obs) return "";
  const partes = obs.split(/[\r\n+|]/);
  const limpias = partes
    .map((p) => p.trim())
    .filter((p) => {
      if (!p) return false;
      const lower = p.toLowerCase();
      if (lower.includes("generada autom")) return false;
      if (lower.includes("pedido #") || lower.includes("pedido#")) return false;
      if (lower.includes("anexo pedido")) return false;
      if (lower.includes("sin stock")) return false;
      if (lower.includes("faltan:")) return false;
      if (lower.includes("faltan")) return false;
      if (lower.includes("extra de stock")) return false;
      if (lower.includes("demanda clientes")) return false;
      if (lower.includes("cliente:")) return false;
      if (lower.startsWith("nota:") && lower.includes("#")) return false;
      if (lower.includes("curva:") || lower.startsWith("curva")) return false;
      if (/^curva/i.test(lower)) return false;
      if (/^t\d{2}\s*[:=]\s*\d+/i.test(p)) return false;
      if (/^[-+]?\d+p\s*\(/i.test(lower)) return false;
      if (lower.includes("anulación pedido") || lower.includes("anulacion pedido")) return false;
      if (lower.includes("ajustada por anulación") || lower.includes("ajustada por anulacion")) return false;
      return true;
    })
    .map((p) => {
      // Remover prefijos repetidos tipo "Nota:" o "Observación:"
      return p.replace(/^(nota|observaci[oó]n):\s*/i, "").trim();
    })
    .filter(Boolean);

  return limpias.join(" • ").trim();
}

/**
 * Formatea y limpia el nombre del modelo y marca evitando repeticiones absurdas
 * (ej: "Straye Straye" -> "STRAYE")
 */
export function formatearTituloModelo(modeloRaw: string, marcaRaw?: string): {
  modeloLimpio: string;
  marcaLimpia: string;
  nombreCompleto: string;
} {
  let marca = (marcaRaw || "").trim();
  let modelo = (modeloRaw || "").trim();

  // Si modelo ya empieza con la marca (ej: "Straye Straye" o "Straye Logan"), no duplicar
  if (marca && modelo.toLowerCase().startsWith(marca.toLowerCase())) {
    modelo = modelo.substring(marca.length).trim();
  }

  // Eliminar repeticiones consecutivas de la misma palabra (ej: "Straye Straye" -> "Straye")
  modelo = modelo.replace(/\b(\w+)\s+\1\b/gi, "$1").trim();
  marca = marca.replace(/\b(\w+)\s+\1\b/gi, "$1").trim();

  if (!modelo) {
    modelo = marca || "CALZADO DE CUERO";
    marca = "";
  }

  const nombreCompleto = marca ? `${marca.toUpperCase()} ${modelo.toUpperCase()}` : modelo.toUpperCase();
  return {
    modeloLimpio: modelo.toUpperCase(),
    marcaLimpia: marca.toUpperCase(),
    nombreCompleto,
  };
}

/**
 * Extrae tallas con cantidad > 0 de un desglose o de una cadena de numeración
 */
export function extraerTallasValidas(
  tallasDetalle?: Array<{ talla: string | number; cantidad: number }>,
  numeracionStr?: string
): Array<{ talla: string; cantidad: number }> {
  if (Array.isArray(tallasDetalle) && tallasDetalle.length > 0) {
    return tallasDetalle
      .filter((t) => Number(t.cantidad) > 0)
      .map((t) => ({ talla: String(t.talla), cantidad: Number(t.cantidad) }));
  }

  if (numeracionStr) {
    const result: Array<{ talla: string; cantidad: number }> = [];
    // Soporta formatos: T38 (1), T38: 1, T38: 1p, T38 (0)
    const regex = /T?(\d{2})\s*(?:\(|:)\s*(\d+)/gi;
    let match;
    while ((match = regex.exec(numeracionStr)) !== null) {
      const cant = parseInt(match[2], 10);
      if (cant > 0) {
        result.push({ talla: match[1], cantidad: cant });
      }
    }
    if (result.length > 0) return result;
  }

  return [];
}

/**
 * Formatea docenas de calzado con terminología comercial clara (½ docena, 1½ docena, etc.)
 */
export function formatearDocenasCorto(pares: number): string {
  if (pares <= 0) return "0 pares";
  if (pares === 6) return "½ Docena";
  if (pares === 12) return "1 Docena";
  if (pares === 18) return "1½ Docena";
  if (pares % 12 === 0) return `${pares / 12} Docenas`;
  if (pares % 6 === 0) {
    const docEnteras = Math.floor(pares / 12);
    return `${docEnteras > 0 ? `${docEnteras}½` : "½"} Docena${docEnteras > 1 ? "s" : ""}`;
  }
  return `${(pares / 12).toFixed(1)} doc.`;
}

/**
 * Dibuja un placeholder elegante para cuando no hay foto disponible del calzado
 */
function dibujarPlaceholderCalzado(doc: jsPDF, x: number, y: number, size: number, nombre: string) {
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.roundedRect(x, y, size, size, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate 400
  const initials = nombre ? nombre.substring(0, 3).toUpperCase() : "MOD";
  doc.text(initials, x + size / 2, y + size / 2 + 1, { align: "center" });
}

export async function generarOrdenCompraPdfDoc(data: OrdenCompraPdfData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Pre-cargar imágenes de las líneas en paralelo
  const lineasConImagenes = await Promise.all(
    data.lineas.map(async (l) => {
      let b64: string | null = null;
      if (l.imageUrl) {
        b64 = await cargarImagenComoBase64(l.imageUrl);
      }
      return {
        ...l,
        loadedImageBase64: b64,
      };
    })
  );

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;

  // ── 1. Encabezado Oficial / Emisor ──
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(12, y, pageWidth - 24, 34, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(data.emisor.nombre || "COMERCIAL DE CALZADO", 18, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(52, 211, 153); // Emerald 400
  doc.text("ORDEN OFICIAL DE COMPRA Y CONFECCIÓN DE CALZADO", 18, y + 13.5);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`RUC: ${data.emisor.ruc || "1804884664001"}`, 18, y + 19);
  doc.text(`Ubicación: ${data.emisor.direccion || "Cevallos, Tungurahua, Ecuador"}`, 18, y + 24);
  if (data.emisor.telefono) {
    doc.text(`Contacto: ${data.emisor.telefono}`, 18, y + 29);
  }

  // Cuadro Número de Orden (derecha)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 76, y + 4, 60, 26, 1.5, 1.5, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("ORDEN DE COMPRA", pageWidth - 46, y + 10.5, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text(`No. ${data.orden.numero}`, pageWidth - 46, y + 16.5, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Emisión: ${data.orden.fecha}`, pageWidth - 46, y + 22.5, { align: "center" });

  y += 38;

  // ── 2. Datos del Proveedor / Taller de Producción ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 23, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("DESTINATARIO / TALLER DE PRODUCCIÓN", 16, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Razón Social: ${data.proveedor.nombre}`, 16, y + 11);
  doc.text(`RUC / C.I: ${data.proveedor.ruc}`, 16, y + 16);
  if (data.proveedor.contacto) {
    doc.text(`Teléfono / WhatsApp: ${data.proveedor.contacto}`, 16, y + 20.5);
  }

  doc.text(`Dirección: ${data.proveedor.direccion || "No especificada"}`, pageWidth / 2 + 10, y + 11);
  doc.text(`Email: ${data.proveedor.email || "No registrado"}`, pageWidth / 2 + 10, y + 16);
  doc.text(`Estado Documento: ${data.orden.estado}`, pageWidth / 2 + 10, y + 20.5);

  y += 26.5;

  // ── 3. Observaciones Generales (Solo si hay observaciones legítimas de fabricación) ──
  const obsGeneralLimpia = limpiarObservacionesOrden(data.orden.observaciones);
  if (obsGeneralLimpia) {
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(251, 191, 36); // Amber 400
    doc.roundedRect(12, y, pageWidth - 24, 11, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text("OBSERVACIONES / ESPECIFICACIONES DE ENTREGA:", 16, y + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(obsGeneralLimpia.substring(0, 140), 16, y + 8.5);
    y += 14.5;
  }

  // ── 4. Cabecera de la Tabla de Modelos ──
  const dibujarCabeceraTabla = (currentY: number) => {
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.roundedRect(12, currentY, pageWidth - 24, 7.5, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("DETALLE DE MODELO, FOTO Y CURVA DE TALLAS", 16, currentY + 5);
    doc.text("CANTIDAD", 144, currentY + 5, { align: "center" });
    doc.text("P. COSTO", 170, currentY + 5, { align: "right" });
    doc.text("SUBTOTAL", 194, currentY + 5, { align: "right" });
  };

  dibujarCabeceraTabla(y);
  y += 9.5;

  // ── 5. Filas de Modelos (Estructura de Tarjeta con Foto, Serie y Píldoras de Talla) ──
  lineasConImagenes.forEach((line, i) => {
    const { nombreCompleto, modeloLimpio } = formatearTituloModelo(line.modelo, line.marca);
    const colorLimpio = line.color ? line.color.trim() : "";
    const serieLimpia = line.serie && line.serie !== "Serie Estándar" ? line.serie.trim() : "Adulto";
    const codigoLimpio = line.codigo ? line.codigo.trim() : "";
    const tallas = extraerTallasValidas(line.tallasDetalle, line.numeracion);
    const obsLineaLimpia = limpiarObservacionesOrden(line.observacion);

    // Calcular altura dinámica de la fila
    const tieneTallas = tallas.length > 0;
    const muchasTallas = tallas.length > 6;
    let extraH = 0;
    if (muchasTallas) extraH += 5;
    if (obsLineaLimpia) extraH += 4;
    const rowHeight = Math.max(22, 18 + extraH);

    // Salto de página si excede el límite
    if (y + rowHeight > pageHeight - 32) {
      doc.addPage();
      y = 15;
      dibujarCabeceraTabla(y);
      y += 9.5;
    }

    // Fondo y borde de tarjeta para cada modelo
    doc.setFillColor(i % 2 === 0 ? 255 : 249, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, y, pageWidth - 24, rowHeight, 1.5, 1.5, "FD");

    // Miniatura de la Imagen del Calzado (Cuadrada con bordes redondeados)
    const imgX = 14.5;
    const imgY = y + 2.5;
    const imgSize = 16.5;

    if (line.loadedImageBase64) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(imgX, imgY, imgSize, imgSize, 1.5, 1.5, "FD");
        doc.addImage(line.loadedImageBase64, "JPEG", imgX + 0.6, imgY + 0.6, imgSize - 1.2, imgSize - 1.2);
      } catch {
        dibujarPlaceholderCalzado(doc, imgX, imgY, imgSize, modeloLimpio);
      }
    } else {
      dibujarPlaceholderCalzado(doc, imgX, imgY, imgSize, modeloLimpio);
    }

    // ── Columna de Información Central (x = 34 a 132) ──
    // Línea 1: Nombre del Modelo + Color + Píldora de Serie
    let nextX = 34;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(nombreCompleto, nextX, y + 5.5);
    nextX += doc.getTextWidth(nombreCompleto) + 2.5;

    if (colorLimpio) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.text(colorLimpio, nextX, y + 5.5);
      nextX += doc.getTextWidth(colorLimpio) + 3;
    }

    // Píldora de Serie (Verde Esmeralda estándar)
    const serieText = `Serie: ${serieLimpia}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    const badgeW = doc.getTextWidth(serieText) + 4.5;
    const badgeH = 4.2;

    if (nextX + badgeW <= 134) {
      doc.setFillColor(236, 253, 245); // Emerald 50
      doc.setDrawColor(167, 243, 208); // Emerald 200
      doc.roundedRect(nextX, y + 2.3, badgeW, badgeH, 1.2, 1.2, "FD");
      doc.setTextColor(4, 120, 87); // Emerald 700
      doc.text(serieText, nextX + 2.2, y + 5.2);
    }

    // Línea 2: Referencia / Código de Fabricación
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // Slate 500
    const refText = codigoLimpio ? `Código: ${codigoLimpio}` : "Calzado de cuero nacional";
    doc.text(refText, 34, y + 9.5);

    // Línea 3: Curva de Tallas (Píldoras individuales por talla > 0)
    if (tieneTallas) {
      let curTallaX = 34;
      let curTallaY = y + 11.5;
      tallas.forEach((t) => {
        const tText = `T${t.talla}: ${t.cantidad}p`;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.8);
        const tw = doc.getTextWidth(tText) + 3.8;

        if (curTallaX + tw > 132) {
          curTallaX = 34;
          curTallaY += 4.5;
        }

        doc.setFillColor(241, 245, 249); // Slate 100
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.roundedRect(curTallaX, curTallaY, tw, 4, 1, 1, "FD");
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.text(tText, curTallaX + 1.9, curTallaY + 2.9);
        curTallaX += tw + 1.8;
      });
    }

    // Línea 4: Observación legítima de confección/entrega si existe
    if (obsLineaLimpia) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.8);
      doc.setTextColor(180, 83, 9); // Amber 700
      doc.text(`• Observación: ${obsLineaLimpia.substring(0, 95)}`, 34, y + rowHeight - 2.5);
    }

    // ── Resumen Lateral Derecho ──
    // Cantidad y Docenas
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${line.cantidadPares} pares`, 144, y + 7.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(formatearDocenasCorto(line.cantidadPares), 144, y + 12.5, { align: "center" });

    // P. Costo Unitario
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`$${Number(line.precioCosto).toFixed(2)}`, 170, y + 7.5, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text("por par", 170, y + 12.5, { align: "right" });

    // Subtotal Destacado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(4, 120, 87); // Emerald 700
    doc.text(`$${Number(line.subtotal).toFixed(2)}`, 194, y + 10, { align: "right" });

    y += rowHeight + 2;
  });

  // ── 6. Totales y Firmas ──
  if (y + 36 > pageHeight - 15) {
    doc.addPage();
    y = 15;
  } else {
    y += 2;
  }

  const startTotalsX = pageWidth - 85;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(startTotalsX, y, 73, 22, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL PARES PEDIDOS:", startTotalsX + 4, y + 6);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.totales.totalPares} pares (${formatearDocenasCorto(data.totales.totalPares)})`, startTotalsX + 69, y + 6, { align: "right" });

  doc.setDrawColor(203, 213, 225);
  doc.line(startTotalsX + 4, y + 9.5, startTotalsX + 69, y + 9.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("VALOR TOTAL ORDEN:", startTotalsX + 4, y + 16);
  doc.setTextColor(4, 120, 87); // Emerald 700
  doc.setFontSize(11);
  doc.text(`$${data.totales.totalPagar.toFixed(2)}`, startTotalsX + 69, y + 16, { align: "right" });

  // Espacio de Firmas Formales
  y += 28;
  doc.setDrawColor(148, 163, 184);
  doc.line(20, y + 8, 80, y + 8);
  doc.line(pageWidth - 80, y + 8, pageWidth - 20, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Autorizado por (Comprador)", 50, y + 12, { align: "center" });
  doc.text("Recibido y Conforme (Proveedor / Taller)", pageWidth - 50, y + 12, { align: "center" });

  // Pie de Página
  y += 18;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento oficial de Orden de Compra emitido electrónicamente por ${data.emisor.nombre || "el comprador"} • Cevallos, Tungurahua`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  return doc;
}

export async function descargarOrdenCompraPdf(data: OrdenCompraPdfData): Promise<void> {
  const doc = await generarOrdenCompraPdfDoc(data);
  const fileName = `Orden_Compra_${data.orden.numero}.pdf`;
  doc.save(fileName);
}

export async function obtenerOrdenCompraPdfBlobUrl(data: OrdenCompraPdfData): Promise<string> {
  const doc = await generarOrdenCompraPdfDoc(data);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

/**
 * Comparte la Orden de Compra oficial como archivo PDF (vía Web Share API con PDF adjunto,
 * o descarga automática y apertura de WhatsApp)
 */
export async function compartirOrdenCompraPdf(
  data: OrdenCompraPdfData,
  telefono: string
): Promise<{ metodo: "WEB_SHARE" | "DOWNLOAD_WHATSAPP" }> {
  let numLimpio = telefono.replace(/\D/g, "");
  if (numLimpio.startsWith("09") && numLimpio.length === 10) {
    numLimpio = "593" + numLimpio.substring(1);
  } else if (numLimpio.startsWith("0") && numLimpio.length === 10) {
    numLimpio = "593" + numLimpio.substring(1);
  }

  let urlDigital = "";
  try {
    urlDigital = await generarUrlPublicaOrden(data);
  } catch (e) {}

  const mensajeTexto = `Estimado/a *${data.proveedor.nombre}*,\n\nLe compartimos la *Orden de Compra No. ${data.orden.numero}* (${data.totales.totalPares} pares):\n\n📥 *Descarga aquí la orden de compra oficial en PDF:*\n👉 ${urlDigital}\n\nPor favor confirmar recepción del pedido. ¡Muchas gracias!\n*${data.emisor.nombre || "Gerencia de Compras"}*`;

  // Apertura directa garantizada de WhatsApp
  abrirWhatsAppUniversal(numLimpio, mensajeTexto);

  return { metodo: "DOWNLOAD_WHATSAPP" };
}

// ══════════════════════════════════════════
// GENERACIÓN DE PDF PARA PEDIDOS DE CLIENTES
// ══════════════════════════════════════════

export interface PedidoClientePdfData {
  emisor: {
    nombre: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  pedido: {
    numero: string;
    fecha: string;
    tipoPago?: string;
    tipoEntrega?: string;
    courier?: string;
    guiaEnvio?: string;
    comprobantePago?: string;
    referenciaPago?: string;
    observaciones?: string;
  };
  cliente: {
    nombre: string;
    cedula?: string;
    telefono?: string;
    direccion?: string;
    ciudad?: string;
  };
  lineas: {
    modelo: string;
    marca?: string;
    color?: string;
    codigo?: string;
    serie?: string;
    numeracion?: string;
    imageUrl?: string;
    cantidadPares: number;
    precioUnitario: number;
    subtotal: number;
    observacion?: string;
  }[];
  totales: {
    totalPares: number;
    subtotal?: number;
    descuento?: number;
    costoEnvio?: number;
    totalPagar: number;
    adelanto?: number;
    saldoPendiente?: number;
    metodoAdelanto?: string;
    referenciaAdelanto?: string;
  };
}

export function generarPedidoClientePdfDoc(data: PedidoClientePdfData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // ── 1. Encabezado / Emisor ──
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
    doc.text(`Teléfono / Atención: ${data.emisor.telefono}`, 18, y + 25);
  }

  // Cuadro Número de Pedido (derecha)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 75, y + 4, 58, 26, 1.5, 1.5, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("COMPROBANTE DE PEDIDO", pageWidth - 46, y + 11, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text(`No. ${data.pedido.numero}`, pageWidth - 46, y + 17, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha: ${data.pedido.fecha}`, pageWidth - 46, y + 23, { align: "center" });

  y += 38;

  // ── 2. Datos del Cliente & Logística ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 26, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text("DATOS DEL CLIENTE & ENTREGA", 16, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Cliente: ${capitalizarNombreCompleto(data.cliente.nombre)}`, 16, y + 11);
  if (data.cliente.cedula) {
    doc.text(`C.I / RUC: ${data.cliente.cedula}`, 16, y + 16);
  }
  if (data.cliente.telefono) {
    doc.text(`Teléfono: ${data.cliente.telefono}`, 16, y + 21);
  }

  const entregaStr = data.pedido.tipoEntrega === "ENVIO"
    ? `Envío (${data.pedido.courier || "Courier"}${data.pedido.guiaEnvio ? " - Guía: " + data.pedido.guiaEnvio : ""})`
    : "Retiro Presencial en Local";
  const refPago = data.pedido.comprobantePago || data.pedido.referenciaPago || data.totales.referenciaAdelanto;
  doc.text(`Entrega: ${entregaStr}`, pageWidth / 2 + 10, y + 11);
  doc.text(`Pago: ${data.pedido.tipoPago || "Contado"}${refPago ? ` (Ref: ${refPago})` : ""}`, pageWidth / 2 + 10, y + 16);
  if (data.cliente.direccion) {
    doc.text(`Dirección: ${data.cliente.direccion}`, pageWidth / 2 + 10, y + 21);
  }

  y += 30;

  // ── 3. Observaciones Generales si existen ──
  if (data.pedido.observaciones && data.pedido.observaciones.trim()) {
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(12, y, pageWidth - 24, 11, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text("OBSERVACIONES GENERALES DEL PEDIDO:", 16, y + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(data.pedido.observaciones.trim(), 16, y + 8.5);
    y += 15;
  }

  // ── 4. Tabla de Artículos ──
  doc.setFillColor(15, 23, 42);
  doc.rect(12, y, pageWidth - 24, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("MODELO / DETALLE DEL ARTÍCULO", 16, y + 4.5);
  doc.text("CANTIDAD", pageWidth - 75, y + 4.5, { align: "center" });
  doc.text("P. UNITARIO", pageWidth - 48, y + 4.5, { align: "right" });
  doc.text("SUBTOTAL", pageWidth - 16, y + 4.5, { align: "right" });

  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  data.lineas.forEach((line, i) => {
    let extraLines = 0;
    if (line.numeracion) extraLines += 4;
    if (line.observacion && line.observacion.trim()) extraLines += 4;
    const rowHeight = 8 + extraLines;

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, pageWidth - 24, rowHeight, "F");
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(12, y + rowHeight, pageWidth - 12, y + rowHeight);

    let currentLineY = y + 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${line.marca ? line.marca + " " : ""}${line.modelo}${line.color ? " - " + line.color : ""}${line.codigo ? " (" + line.codigo + ")" : ""}`, 16, currentLineY);

    if (line.numeracion) {
      currentLineY += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(`Numeración: ${line.numeracion}`, 16, currentLineY);
    }

    if (line.observacion && line.observacion.trim()) {
      currentLineY += 4;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(180, 83, 9);
      doc.text(`Nota: ${line.observacion.trim()}`, 16, currentLineY);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${line.cantidadPares} pares`, pageWidth - 75, y + 4.5, { align: "center" });
    doc.text(`$${Number(line.precioUnitario).toFixed(2)}`, pageWidth - 48, y + 4.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`$${Number(line.subtotal).toFixed(2)}`, pageWidth - 16, y + 4.5, { align: "right" });

    y += rowHeight;
  });

  y += 5;

  // ── 5. Totales & Desglose de Anticipos ──
  const startTotalsX = pageWidth - 90;
  const montoAdelanto = Number(data.totales.adelanto || 0);
  const saldoPendiente = data.totales.saldoPendiente !== undefined
    ? Number(data.totales.saldoPendiente)
    : Math.max(0, data.totales.totalPagar - montoAdelanto);

  const boxHeight = montoAdelanto > 0 ? 32 : 20;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(startTotalsX, y, 78, boxHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL PARES:", startTotalsX + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.totales.totalPares} pares`, startTotalsX + 74, y + 5, { align: "right" });

  doc.setDrawColor(203, 213, 225);
  doc.line(startTotalsX + 4, y + 8, startTotalsX + 74, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("VALOR TOTAL:", startTotalsX + 4, y + 13);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${data.totales.totalPagar.toFixed(2)}`, startTotalsX + 74, y + 13, { align: "right" });

  if (montoAdelanto > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105); // Emerald 600
    const metodoStr = data.totales.metodoAdelanto || (refPago ? "TRANSFERENCIA" : "EFECTIVO");
    doc.text(`ANTICIPO (${metodoStr}${refPago ? ` #${refPago}` : ""}):`, startTotalsX + 4, y + 19);
    doc.setFont("helvetica", "bold");
    doc.text(`-$${montoAdelanto.toFixed(2)}`, startTotalsX + 74, y + 19, { align: "right" });

    doc.line(startTotalsX + 4, y + 22, startTotalsX + 74, y + 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9); // Amber 700
    doc.text("SALDO PENDIENTE:", startTotalsX + 4, y + 28);
    doc.text(`$${saldoPendiente.toFixed(2)}`, startTotalsX + 74, y + 28, { align: "right" });
  }

  // Footer
  y += boxHeight + 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Comprobante oficial de pedido emitido por ${data.emisor.nombre || "NEXORA"}`, pageWidth / 2, y, { align: "center" });

  return doc;
}

export function descargarPedidoClientePdf(data: PedidoClientePdfData): void {
  const doc = generarPedidoClientePdfDoc(data);
  const fileName = `Pedido_${data.pedido.numero}.pdf`;
  doc.save(fileName);
}

export function obtenerPedidoClientePdfBlobUrl(data: PedidoClientePdfData): string {
  const doc = generarPedidoClientePdfDoc(data);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

// ═══════════════════════════════════════════════════════════════
// TICKET POS — COMPROBANTE DE COMPRA EN MOSTRADOR
// ═══════════════════════════════════════════════════════════════

export interface TicketPosPdfData {
  emisor: {
    nombre: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
  };
  comprobante: {
    numero?: string;
    tipo?: string;
    fecha: string;
    formaPago: string;
    detallePago?: string;
  };
  cliente: {
    nombre: string;
    cedula?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
  };
  items: Array<{
    nombre: string;
    cantidad: number;
    tallaNumero?: string | number;
    precioUnitario: number;
    subtotal?: number;
  }>;
  totales: {
    subtotal: number;
    descuento: number;
    total: number;
    pagaCon?: number;
    vuelto?: number;
  };
}

export function generarTicketPosPdfDoc(data: TicketPosPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // 1. Encabezado Oficial del Establecimiento
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(12, y, pageWidth - 24, 38, 2.5, 2.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text((data.emisor.nombre || "CALZADO COMERCIAL").toUpperCase(), 20, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  if (data.emisor.ruc) {
    doc.text(`RUC: ${data.emisor.ruc}`, 20, y + 19);
  }
  doc.text(`Dirección: ${data.emisor.direccion || "Cevallos, Tungurahua"}`, 20, y + 25);
  if (data.emisor.telefono) {
    doc.text(`Tel: ${data.emisor.telefono}`, 20, y + 31);
  }

  // Tarjeta derecha de Tipo de Documento
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.roundedRect(pageWidth - 85, y + 5, 67, 28, 2, 2, "F");

  doc.setTextColor(52, 211, 153); // Emerald 400
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("COMPROBANTE DE VENTA", pageWidth - 51.5, y + 13, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.comprobante.numero || "TICKET DE CAJA", pageWidth - 51.5, y + 21, { align: "center" });

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(data.comprobante.fecha || new Date().toLocaleString("es-EC"), pageWidth - 51.5, y + 27, { align: "center" });

  y += 44;

  // 2. Información del Cliente
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("DATOS DEL CLIENTE:", 18, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Cliente: ${data.cliente.nombre || "Consumidor Final"}`, 18, y + 12);
  if (data.cliente.cedula && data.cliente.cedula !== "9999999999") {
    doc.text(`C.I. / RUC: ${data.cliente.cedula}`, 18, y + 18);
  }

  if (data.cliente.telefono) {
    doc.text(`Teléfono / WhatsApp: ${data.cliente.telefono}`, pageWidth / 2 + 10, y + 12);
  }
  if (data.cliente.email) {
    doc.text(`Email: ${data.cliente.email}`, pageWidth / 2 + 10, y + 18);
  }

  y += 28;

  // 3. Tabla de Productos y Tallas
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(12, y, pageWidth - 24, 8, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("CANT.", 18, y + 5.5);
  doc.text("DESCRIPCIÓN / MODELO DE CALZADO", 35, y + 5.5);
  doc.text("TALLA", pageWidth - 65, y + 5.5, { align: "center" });
  doc.text("P. UNIT.", pageWidth - 38, y + 5.5, { align: "right" });
  doc.text("SUBTOTAL", pageWidth - 18, y + 5.5, { align: "right" });

  y += 10;

  // Filas de productos
  data.items.forEach((it, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y - 1.5, pageWidth - 24, 7.5, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(it.cantidad), 18, y + 3.5);

    doc.setFont("helvetica", "normal");
    doc.text(it.nombre || "Calzado", 35, y + 3.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text(it.tallaNumero ? `T${it.tallaNumero}` : "—", pageWidth - 65, y + 3.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`$${it.precioUnitario.toFixed(2)}`, pageWidth - 38, y + 3.5, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    const sub = (it.subtotal !== undefined ? it.subtotal : it.cantidad * it.precioUnitario);
    doc.text(`$${sub.toFixed(2)}`, pageWidth - 18, y + 3.5, { align: "right" });

    y += 7.5;
  });

  y += 4;

  // 4. Totales y Método de Pago
  const startTotalsX = pageWidth - 90;
  const boxHeight = data.totales.descuento > 0 ? 32 : 24;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(startTotalsX, y, 78, boxHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal:", startTotalsX + 4, y + 5);
  doc.text(`$${data.totales.subtotal.toFixed(2)}`, startTotalsX + 74, y + 5, { align: "right" });

  let offsetTot = 10;
  if (data.totales.descuento > 0) {
    doc.setTextColor(217, 119, 6);
    doc.text("Descuento:", startTotalsX + 4, y + 10);
    doc.text(`-$${data.totales.descuento.toFixed(2)}`, startTotalsX + 74, y + 10, { align: "right" });
    offsetTot = 16;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(startTotalsX + 4, y + offsetTot - 1, startTotalsX + 74, y + offsetTot - 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL PAGADO:", startTotalsX + 4, y + offsetTot + 4);
  doc.setTextColor(5, 150, 105);
  doc.text(`$${data.totales.total.toFixed(2)}`, startTotalsX + 74, y + offsetTot + 4, { align: "right" });

  // Método de pago info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Forma de pago: ${data.comprobante.formaPago}`, startTotalsX + 4, y + offsetTot + 9);

  // Pie de página
  y += boxHeight + 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`¡Gracias por su compra y preferencia! — ${data.emisor.nombre || "Comercio de Calzado"}`, pageWidth / 2, y, { align: "center" });

  return doc;
}

export function descargarTicketPosPdf(data: TicketPosPdfData): void {
  const doc = generarTicketPosPdfDoc(data);
  const clienteNom = (data.cliente.nombre || "Ticket").replace(/\s+/g, "_");
  doc.save(`Ticket_Venta_${clienteNom}.pdf`);
}

export function obtenerTicketPosPdfBlobUrl(data: TicketPosPdfData): string {
  const doc = generarTicketPosPdfDoc(data);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

