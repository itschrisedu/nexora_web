import { jsPDF } from 'jspdf';
import { capitalizarNombreCompleto } from '@/utils/text-formatters';
import { abrirWhatsAppUniversal } from '@/utils/whatsapp';

export interface HistorialComercialTallaItem {
  talla: string | number;
  pares: number;
}

export interface HistorialComercialItemEntrega {
  modelo: string;
  color?: string;
  serie?: string;
  codigo?: string;
  imageUrl?: string;
  loadedImageBase64?: string | null;
  curvaTallas?: string;
  tallas?: HistorialComercialTallaItem[];
  totalPares: number;
  etiquetaVolumen?: string;
  precioUnitario: number;
  subtotal: number;
}

export interface HistorialEntregaDetallada {
  fecha: string;
  fechaRaw?: string;
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
  fechaRaw?: string;
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
  fechaRaw?: string;
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
 * Carga una imagen remota y la convierte en data URL Base64 para incrustarla en el PDF
 */
async function cargarImagenComoBase64(url: string, timeoutMs = 2500): Promise<string | null> {
  if (!url || typeof window === 'undefined') return null;
  if (url.startsWith('data:image/')) return url;

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
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 120;
          canvas.height = img.naturalHeight || img.height || 120;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
            return;
          }
        } catch {
          // Bloqueo CORS en canvas fallback
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
 * Dibuja un placeholder visual elegante cuando no hay imagen disponible del calzado
 */
function dibujarPlaceholderCalzado(doc: jsPDF, x: number, y: number, size: number, nombre: string) {
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.roundedRect(x, y, size, size, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate 400
  const initials = nombre ? nombre.substring(0, 3).toUpperCase() : 'CAL';
  doc.text(initials, x + size / 2, y + size / 2 + 1, { align: 'center' });
}

/**
 * Formato estándar de docenas de calzado
 */
export function formatearDocenasCorto(pares: number): string {
  if (pares <= 0) return '0 pares';
  if (pares === 6) return '½ Docena';
  if (pares === 12) return '1 Docena';
  if (pares === 18) return '1½ Docena';
  if (pares % 12 === 0) return `${pares / 12} Docenas`;
  if (pares % 6 === 0) {
    const docEnteras = Math.floor(pares / 12);
    return `${docEnteras > 0 ? `${docEnteras}½` : '½'} Docena${docEnteras > 1 ? 's' : ''}`;
  }
  return `${(pares / 12).toFixed(1)} doc.`;
}

/**
 * Extrae tallas con pares mayores a 0
 */
export function extraerTallasValidas(
  tallasDetalle?: Array<HistorialComercialTallaItem | { talla: string | number; cantidad: number }>,
  curvaStr?: string,
): HistorialComercialTallaItem[] {
  if (Array.isArray(tallasDetalle) && tallasDetalle.length > 0) {
    return tallasDetalle
      .map((t: any) => ({
        talla: String(t.talla ?? t.numero ?? 38),
        pares: Number(t.pares ?? t.cantidad ?? 0),
      }))
      .filter((t) => t.pares > 0)
      .sort((a, b) => Number(a.talla) - Number(b.talla));
  }

  if (curvaStr) {
    const result: HistorialComercialTallaItem[] = [];
    const regex = /T?(\d{2})\s*(?::|\()\s*(\d+)p?/gi;
    let match;
    while ((match = regex.exec(curvaStr)) !== null) {
      const cant = parseInt(match[2], 10);
      if (cant > 0) {
        result.push({ talla: match[1], pares: cant });
      }
    }
    if (result.length > 0) {
      return result.sort((a, b) => Number(a.talla) - Number(b.talla));
    }
  }

  return [];
}

/**
 * Pre-carga imágenes de todas las entregas en paralelo antes de renderizar el PDF
 */
export async function preCargarImagenesHistorial(data: HistorialComercialPdfData): Promise<HistorialComercialPdfData> {
  const entregasConImagenes = await Promise.all(
    (data.entregas || []).map(async (ent) => {
      const itemsConImagenes = await Promise.all(
        (ent.items || []).map(async (it) => {
          if (it.loadedImageBase64) return it;
          let b64: string | null = null;
          if (it.imageUrl) {
            b64 = await cargarImagenComoBase64(it.imageUrl);
          }
          return {
            ...it,
            loadedImageBase64: b64,
          };
        })
      );
      return {
        ...ent,
        items: itemsConImagenes,
      };
    })
  );

  return {
    ...data,
    entregas: entregasConImagenes,
  };
}

/**
 * Genera el documento PDF formal del Historial Comercial y Financiero con tarjeta estándar de calzado y corrida contable
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

  const dibujarEncabezadoPaginaSecundaria = () => {
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(12, 10, pageWidth - 24, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`${data.emisor.nombre || 'CALZADO'} — Historial Comercial: ${data.cliente.nombre}`, 16, 14.8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Período: ${data.periodo.fechaInicio} al ${data.periodo.fechaFin}`, pageWidth - 16, 14.8, { align: 'right' });
    y = 21;
  };

  const checkSaltoPagina = (espacioNecesario: number) => {
    if (y + espacioNecesario > pageHeight - 20) {
      doc.addPage();
      dibujarEncabezadoPaginaSecundaria();
    }
  };

  // ── 1. Encabezado Institucional ─────────────────────────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(12, y, pageWidth - 24, 38, 2.5, 2.5, 'F');

  // Franja decorativa verde esmeralda
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(12, y + 36, pageWidth - 24, 2, 'F');

  // Datos del Emisor
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.emisor.nombre || 'CALZADO DE CUERO', 18, y + 9);

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

  y += 43;

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

  y += 27;

  // ── 3. Resumen Financiero del Período (KPIs) ───────────────────
  const cardW = (pageWidth - 24 - 9) / 4;
  const saldoMatematico = Math.max(
    0,
    Math.round((data.resumen.totalEntregasMonto - data.resumen.totalAbonosMonto - data.resumen.totalDevolucionesMonto) * 100) / 100
  );
  const kpis = [
    { label: 'TOTAL ENTREGADO', val: `$${data.resumen.totalEntregasMonto.toFixed(2)}`, sub: `${data.resumen.totalParesEntregados} pares`, color: [37, 99, 235] },
    { label: 'TOTAL ABONADO', val: `-$${data.resumen.totalAbonosMonto.toFixed(2)}`, sub: `${data.abonos.length} pagos`, color: [16, 185, 129] },
    { label: 'DEVOLUCIONES', val: `-$${data.resumen.totalDevolucionesMonto.toFixed(2)}`, sub: `${data.devoluciones.length} reg.`, color: [225, 29, 72] },
    { label: 'SALDO DEUDOR', val: `$${saldoMatematico.toFixed(2)}`, sub: 'Saldo al corte', color: saldoMatematico > 0 ? [225, 29, 72] : [16, 185, 129] },
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

  y += 22;

  // ── 4. Sección de Entregas Realizadas (Cronológico: de la primera a la última) ──
  checkSaltoPagina(20);
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(12, y, pageWidth - 24, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('1. RESUMEN DE ENTREGAS Y MERCADERÍA DESPACHADA (DE LA PRIMERA A LA ÚLTIMA)', 16, y + 4.5);
  y += 9.5;

  // Orden estricto cronológico ascendente (de la primera a la última entrega: PED-0001 -> PED-0005)
  const entregasOrdenadas = [...(data.entregas || [])].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    const numA = parseInt(a.numeroNota?.replace(/\D/g, '') || '0', 10);
    const numB = parseInt(b.numeroNota?.replace(/\D/g, '') || '0', 10);
    return numA - numB;
  });

  if (entregasOrdenadas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No se registran entregas de mercadería en el rango de fechas seleccionado.', 16, y + 3);
    y += 8;
  } else {
    entregasOrdenadas.forEach((ent, index) => {
      checkSaltoPagina(28);

      // Cabecera de la Entrega (Banner suave Slate 100)
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(12, y, pageWidth - 24, 7, 1.2, 1.2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const numNota = ent.numeroNota ? `Nota #${ent.numeroNota}` : `Entrega #${index + 1}`;
      doc.text(`${numNota} • Fecha: ${ent.fecha}`, 16, y + 4.8);

      // Total de la entrega
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text(`${ent.totalPares} pares • $${ent.montoTotal.toFixed(2)}`, pageWidth - 16, y + 4.8, { align: 'right' });
      y += 8.5;

      // Sub-cabecera oscura estilo tabla (IDÉNTICA AL COMPONENTE ModelTallaCurvaCard DE LA FOTO)
      checkSaltoPagina(20);
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.roundedRect(12, y, pageWidth - 24, 6.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(255, 255, 255);
      doc.text('DETALLE DE MODELO, FOTO Y CURVA DE TALLAS', 16, y + 4.5);
      doc.text('CANTIDAD', 144, y + 4.5, { align: 'center' });
      doc.text('PRECIO', 170, y + 4.5, { align: 'right' });
      doc.text('SUBTOTAL', 194, y + 4.5, { align: 'right' });
      y += 8;

      // Dibujar cada modelo como tarjeta ModelTallaCurvaCard
      ent.items.forEach((it) => {
        const tallas = extraerTallasValidas(it.tallas, it.curvaTallas);
        const muchasTallas = tallas.length > 6;
        const extraH = muchasTallas ? 5 : 0;
        const cardHeight = Math.max(22, 18.5 + extraH);

        checkSaltoPagina(cardHeight + 2);

        // Fondo y borde de tarjeta blanca redondeada
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(12, y, pageWidth - 24, cardHeight, 1.5, 1.5, 'FD');

        // Miniatura fotográfica cuadrada
        const imgX = 14.5;
        const imgY = y + 2.5;
        const imgSize = 16.5;

        if (it.loadedImageBase64) {
          try {
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(imgX, imgY, imgSize, imgSize, 1.2, 1.2, 'FD');
            doc.addImage(it.loadedImageBase64, 'JPEG', imgX + 0.6, imgY + 0.6, imgSize - 1.2, imgSize - 1.2);
          } catch {
            dibujarPlaceholderCalzado(doc, imgX, imgY, imgSize, it.modelo);
          }
        } else {
          dibujarPlaceholderCalzado(doc, imgX, imgY, imgSize, it.modelo);
        }

        // Información central
        let nextX = 34;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42); // Slate 900
        const modeloMayus = (it.modelo || 'CALZADO').toUpperCase();
        doc.text(modeloMayus, nextX, y + 5.5);
        nextX += doc.getTextWidth(modeloMayus) + 2.5;

        if (it.color) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(it.color, nextX, y + 5.5);
          nextX += doc.getTextWidth(it.color) + 3;
        }

        // Píldora de Serie (Verde Esmeralda estándar: Serie: NOMBRE)
        const serieNombre = it.serie && it.serie !== 'Estándar' && it.serie !== 'General' ? it.serie : 'ADULTO';
        const serieText = `Serie: ${serieNombre.toUpperCase()}`;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        const badgeW = doc.getTextWidth(serieText) + 4.5;
        const badgeH = 4.2;

        if (nextX + badgeW <= 134) {
          doc.setFillColor(236, 253, 245); // Emerald 50
          doc.setDrawColor(167, 243, 208); // Emerald 200
          doc.roundedRect(nextX, y + 2.3, badgeW, badgeH, 1.2, 1.2, 'FD');
          doc.setTextColor(4, 120, 87); // Emerald 700
          doc.text(serieText, nextX + 2.2, y + 5.2);
        }

        // Línea 2: Código del Modelo / Fabricación
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139); // Slate 500
        const codText = it.codigo ? `Código: ${it.codigo}` : 'Calzado de cuero nacional';
        doc.text(codText, 34, y + 9.5);

        // Línea 3: Curva de Tallas en Píldoras
        if (tallas.length > 0) {
          let curTallaX = 34;
          let curTallaY = y + 11.5;
          tallas.forEach((t) => {
            const tText = `T${t.talla}: ${t.pares}p`;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.8);
            const tw = doc.getTextWidth(tText) + 3.8;

            if (curTallaX + tw > 132) {
              curTallaX = 34;
              curTallaY += 4.5;
            }

            doc.setFillColor(241, 245, 249); // Slate 100
            doc.setDrawColor(203, 213, 225); // Slate 300
            doc.roundedRect(curTallaX, curTallaY, tw, 4, 1, 1, 'FD');
            doc.setTextColor(30, 41, 59); // Slate 800
            doc.text(tText, curTallaX + 1.9, curTallaY + 2.9);
            curTallaX += tw + 1.8;
          });
        }

        // ── Resumen Lateral Derecho ──
        // Cantidad y Docenas (Centrado en x=144)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${it.totalPares} pares`, 144, y + 7.5, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        doc.text(it.etiquetaVolumen || formatearDocenasCorto(it.totalPares), 144, y + 12.5, { align: 'center' });

        // Precio Unitario (Alineado derecha en x=170)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`$${Number(it.precioUnitario).toFixed(2)}`, 170, y + 7.5, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(148, 163, 184);
        doc.text('por par', 170, y + 12.5, { align: 'right' });

        // Subtotal (Alineado derecha en x=194, Verde Esmeralda)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(5, 150, 105); // Emerald 600
        doc.text(`$${Number(it.subtotal).toFixed(2)}`, 194, y + 9.5, { align: 'right' });

        y += cardHeight + 2.5;
      });

      y += 3.5;
    });
  }

  y += 3;

  // ── 5. Extracto Cronológico y Corrida Contable Matemática Paso a Paso ──
  checkSaltoPagina(24);
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(12, y, pageWidth - 24, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('2. EXTRACTO CRONOLÓGICO Y CORRIDA CONTABLE DE SALDOS', 16, y + 4.5);
  y += 9.5;

  // Consolidar cronológicamente todas las entregas, abonos y devoluciones
  const movimientosCronologicos: Array<{
    fecha: string;
    fechaRaw: string;
    tipo: 'ENTREGA' | 'ABONO' | 'DEVOLUCION';
    referencia: string;
    detalle: string;
    cargo: number;
    abono: number;
    saldoResultante?: number;
    secuenciaDoc?: number;
  }> = [];

  function extraerNumeroSecuencia(texto?: string): number {
    if (!texto) return 0;
    const matches = texto.match(/\d+/g);
    if (!matches || matches.length === 0) return 0;
    return parseInt(matches[matches.length - 1], 10);
  }

  (data.entregas || []).forEach((ent) => {
    const resumenModelos = ent.items.map((it) => `${it.totalPares}p ${it.modelo}`).join(', ');
    const descCorta = resumenModelos.length > 26 ? resumenModelos.substring(0, 26) + '...' : resumenModelos;
    movimientosCronologicos.push({
      fecha: ent.fecha,
      fechaRaw: ent.fechaRaw || ent.fechaEntrega || ent.fecha,
      tipo: 'ENTREGA',
      referencia: ent.numeroNota ? `Nota #${ent.numeroNota}` : 'Nota de Entrega',
      detalle: descCorta ? `Despacho ${ent.totalPares}p (${descCorta})` : `Despacho de ${ent.totalPares} pares`,
      cargo: Number(ent.montoTotal || 0),
      abono: 0,
      secuenciaDoc: extraerNumeroSecuencia(ent.numeroNota),
    });
  });

  (data.abonos || []).forEach((ab) => {
    movimientosCronologicos.push({
      fecha: ab.fecha,
      fechaRaw: ab.fechaRaw || ab.fecha,
      tipo: 'ABONO',
      referencia: ab.numeroComprobante ? `Recibo #${ab.numeroComprobante}` : 'Recibo de Abono',
      detalle: `Abono ${ab.formaPago || 'EFECTIVO'}`,
      cargo: 0,
      abono: Number(ab.monto || 0),
      secuenciaDoc: extraerNumeroSecuencia(ab.numeroComprobante),
    });
  });

  (data.devoluciones || []).forEach((dev) => {
    movimientosCronologicos.push({
      fecha: dev.fecha,
      fechaRaw: dev.fechaRaw || dev.fecha,
      tipo: 'DEVOLUCION',
      referencia: dev.motivo ? `Dev. ${dev.motivo.substring(0, 14)}` : 'Devolución',
      detalle: dev.totalPares ? `Acreditación devolución (${dev.totalPares} pares)` : 'Acreditación por devolución',
      cargo: 0,
      abono: Number(dev.monto || 0),
      secuenciaDoc: 0,
    });
  });

  // Ordenar estrictamente de la fecha/hora más antigua a la más actual respetando la jerarquía comercial
  movimientosCronologicos.sort((a, b) => {
    // 1. Comparar por timestamp ISO exacto con hora/minuto/segundo si está disponible
    if (a.fechaRaw && b.fechaRaw && a.fechaRaw !== b.fechaRaw) {
      const timeA = new Date(a.fechaRaw).getTime();
      const timeB = new Date(b.fechaRaw).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeA - timeB;
      }
    }

    // 2. Comparar por fecha YYYY-MM-DD
    if (a.fecha !== b.fecha) {
      return a.fecha.localeCompare(b.fecha);
    }

    // 3. Jerarquía comercial universal: La entrega genera la deuda antes de que el abono la liquide
    const prioridadTipo: Record<string, number> = { ENTREGA: 1, ABONO: 2, DEVOLUCION: 3 };
    const pA = prioridadTipo[a.tipo] || 2;
    const pB = prioridadTipo[b.tipo] || 2;
    if (pA !== pB) {
      return pA - pB;
    }

    // 4. Si son del mismo tipo en la misma fecha: Correlativo numérico de comprobante
    const secA = a.secuenciaDoc || 0;
    const secB = b.secuenciaDoc || 0;
    if (secA !== secB) {
      return secA - secB;
    }

    return 0;
  });

  // Realizar la corrida contable matemática secuencial paso a paso
  let saldoAcumulado = 0;
  movimientosCronologicos.forEach((mov) => {
    if (mov.tipo === 'ENTREGA') {
      saldoAcumulado += mov.cargo;
    } else {
      saldoAcumulado -= mov.abono;
    }
    mov.saldoResultante = Math.round(saldoAcumulado * 100) / 100;
  });

  if (movimientosCronologicos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No se registran movimientos en el rango de fechas seleccionado.', 16, y + 3);
    y += 8;
  } else {
    // Encabezado de la tabla cronológica
    doc.setFillColor(241, 245, 249);
    doc.rect(12, y, pageWidth - 24, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text('FECHA', 16, y + 4.2);
    doc.text('COMPROBANTE / REF.', 36, y + 4.2);
    doc.text('DETALLE OPERATIVO', 70, y + 4.2);
    doc.text('ENTREGA (+)', 142, y + 4.2, { align: 'right' });
    doc.text('ABONO (-)', 168, y + 4.2, { align: 'right' });
    doc.text('SALDO (=)', 194, y + 4.2, { align: 'right' });
    y += 7.5;

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
        doc.text(mov.referencia, 36, y + 3);
      } else if (mov.tipo === 'ABONO') {
        doc.setTextColor(16, 185, 129);
        doc.text(mov.referencia, 36, y + 3);
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text(mov.referencia, 36, y + 3);
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(mov.detalle, 70, y + 3, { maxWidth: 50 });

      // Columna Entrega (Cargo +)
      doc.setFont('helvetica', 'bold');
      if (mov.cargo > 0) {
        doc.setTextColor(37, 99, 235);
        doc.text(`+$${mov.cargo.toFixed(2)}`, 142, y + 3, { align: 'right' });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', 142, y + 3, { align: 'right' });
      }

      // Columna Abono (Pago -)
      if (mov.abono > 0) {
        doc.setTextColor(16, 185, 129);
        doc.text(`-$${mov.abono.toFixed(2)}`, 168, y + 3, { align: 'right' });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', 168, y + 3, { align: 'right' });
      }

      // Columna Saldo Resultante (=)
      if (mov.saldoResultante !== undefined) {
        doc.setTextColor(mov.saldoResultante > 0 ? 225 : 5, mov.saldoResultante > 0 ? 29 : 150, mov.saldoResultante > 0 ? 72 : 105);
        doc.text(`$${mov.saldoResultante.toFixed(2)}`, 194, y + 3, { align: 'right' });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', 194, y + 3, { align: 'right' });
      }

      y += 5.5;
    });

    // ── Cuadro de Cierre Contable Matemático ──
    checkSaltoPagina(26);
    y += 2;
    const cierreW = 88;
    const cierreX = pageWidth - 12 - cierreW;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cierreX, y, cierreW, 23, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text('Total Mercadería Entregada (+):', cierreX + 4, y + 5.5);
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.text(`+$${data.resumen.totalEntregasMonto.toFixed(2)}`, cierreX + cierreW - 4, y + 5.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Total Abonos Recibidos (-):', cierreX + 4, y + 9.5);
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text(`-$${data.resumen.totalAbonosMonto.toFixed(2)}`, cierreX + cierreW - 4, y + 9.5, { align: 'right' });

    if (data.resumen.totalDevolucionesMonto > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Total Devoluciones Acreditadas (-):', cierreX + 4, y + 13.5);
      doc.setTextColor(225, 29, 72);
      doc.setFont('helvetica', 'bold');
      doc.text(`-$${data.resumen.totalDevolucionesMonto.toFixed(2)}`, cierreX + cierreW - 4, y + 13.5, { align: 'right' });
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(cierreX + 4, y + 16, cierreX + cierreW - 4, y + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text('SALDO FINAL PENDIENTE (=):', cierreX + 4, y + 20.2);

    if (saldoMatematico > 0) {
      doc.setTextColor(225, 29, 72); // Rose
      doc.text(`$${saldoMatematico.toFixed(2)}`, cierreX + cierreW - 4, y + 20.2, { align: 'right' });
    } else {
      doc.setTextColor(5, 150, 105); // Emerald
      doc.text('$0.00 (AL DÍA)', cierreX + cierreW - 4, y + 20.2, { align: 'right' });
    }

    y += 27;
  }

  // ── Pie de Página en Todas las Hojas ───────────────────────────
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(12, pageHeight - 12, pageWidth - 12, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generado el ${new Date().toLocaleString('es-EC')} • Extracto comercial oficial de cuenta corriente.`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - 16, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

/**
 * Descarga el archivo PDF localmente tras pre-cargar las fotos de calzado
 */
export async function descargarHistorialPdf(data: HistorialComercialPdfData): Promise<void> {
  const dataConImg = await preCargarImagenesHistorial(data);
  const doc = generarHistorialPdfDoc(dataConImg);
  const cleanNombre = data.cliente.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Historial_${cleanNombre}_${data.periodo.fechaInicio}_${data.periodo.fechaFin}.pdf`);
}

/**
 * Obtiene el PDF codificado en Base64 para adjuntarlo a correos electrónicos
 */
export async function generarHistorialPdfBase64(data: HistorialComercialPdfData): Promise<string> {
  const dataConImg = await preCargarImagenesHistorial(data);
  const doc = generarHistorialPdfDoc(dataConImg);
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1] || '';
}

/**
 * Genera el mensaje de WhatsApp formal y detallado
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

  // Detalle de entregas
  if (data.entregas.length > 0) {
    msg += `📦 *DETALLE DE ENTREGAS REALIZADAS (Cronológico):*\n`;
    const ordenadas = [...data.entregas].sort((a, b) => new Date(a.fechaEntrega || a.fecha).getTime() - new Date(b.fechaEntrega || b.fecha).getTime());
    ordenadas.forEach((ent) => {
      const notaStr = ent.numeroNota ? ` (Nota ${ent.numeroNota})` : '';
      msg += `🔹 *${ent.fecha}*${notaStr}\n`;
      ent.items.forEach((it) => {
        const colorStr = it.color ? ` (${it.color})` : '';
        const serieStr = it.serie && it.serie !== 'Estándar' ? ` • Serie: ${it.serie}` : '';
        const volStr = `${it.totalPares} ${it.totalPares === 1 ? 'par' : 'pares'}`;
        const tallasStr = it.curvaTallas ? ` [${it.curvaTallas}]` : '';
        msg += `   ▫️ ${it.modelo}${colorStr}${serieStr}\n      ${volStr}${tallasStr} • $${it.subtotal.toFixed(2)}\n`;
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
    await descargarHistorialPdf(data);
  }

  const mensajeTexto = await armarMensajeWhatsAppHistorial(data, urlPublica);
  abrirWhatsAppUniversal(numLimpio, mensajeTexto);
}
