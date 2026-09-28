/**
 * Servicio de Generación y Decodificación de Enlaces Públicos de Comprobantes
 * Permite que los clientes accedan a su recibo digital oficial en cualquier dispositivo
 * sin requerir almacenamiento en la nube ni costos de infraestructura externa.
 */

import { ComprobanteAbonoPdfData } from './pdf-abono.service';
import { FacturaPdfData, OrdenCompraPdfData } from './pdf-factura.service';

/**
 * Obtiene el dominio actual de la aplicación de manera automática:
 * - En desarrollo local: http://localhost:3000
 * - En producción desplegada: https://tudominio.com (o el dominio configurado)
 */
export function obtenerUrlBase(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Elimina claves vacías o nulas recursivamente para mantener la URL lo más corta y limpia posible
 */
export function limpiarObjetoPayload(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(limpiarObjetoPayload).filter((v) => v !== undefined && v !== null);
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null || value === '') continue;
      if (typeof value === 'string' && value.startsWith('data:image')) continue;
      const cleanVal = limpiarObjetoPayload(value);
      if (cleanVal !== undefined && cleanVal !== null && cleanVal !== '') {
        cleaned[key] = cleanVal;
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Genera el formato estándar y profesional de hipervínculo / enlace para WhatsApp
 */
export function formatearEnlaceWhatsAppComprobante(url: string, titulo: string = 'Descarga aquí tu comprobante oficial'): string {
  if (!url) return '';
  return `📥 *${titulo}:*\n👉 ${url}`;
}

/**
 * Codifica un objeto a Base64 seguro para URL con soporte completo UTF-8
 */
export function codificarPayload(data: any): string {
  try {
    const dataLimpia = limpiarObjetoPayload(data);
    const jsonStr = JSON.stringify(dataLimpia);
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      const bytes = new TextEncoder().encode(jsonStr);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }
    return Buffer.from(jsonStr, 'utf-8').toString('base64');
  } catch (e) {
    console.error('Error al codificar payload de comprobante:', e);
    try {
      return encodeURIComponent(JSON.stringify(data));
    } catch {
      return '';
    }
  }
}

/**
 * Decodifica una cadena Base64 a su objeto JSON original con máxima resiliencia
 */
export function decodificarPayload(rawInput: string): any {
  try {
    if (!rawInput || typeof rawInput !== 'string') return null;
    let str = rawInput.trim();

    // Eliminar posibles envoltorios de comillas
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1).trim();
    }

    // Intentar parseo directo si ya es un JSON string o URL-encoded JSON
    if (str.startsWith('{') || str.startsWith('%7B')) {
      try {
        const decodedUri = decodeURIComponent(str);
        return JSON.parse(decodedUri);
      } catch {
        // Continuar con decodificación base64
      }
    }

    // Reemplazar espacios generados por la conversión automática de '+' en query params
    str = str.replace(/ /g, '+');

    // Convertir de base64url a base64 standard si aplica
    str = str.replace(/-/g, '+').replace(/_/g, '/');

    // Asegurar padding '=' correcto
    const mod4 = str.length % 4;
    if (mod4 === 2) str += '==';
    else if (mod4 === 3) str += '=';
    else if (mod4 === 1) str += '===';

    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      try {
        const binary = window.atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const jsonStr = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        return JSON.parse(jsonStr);
      } catch {
        try {
          const jsonStr = decodeURIComponent(escape(window.atob(str)));
          return JSON.parse(jsonStr);
        } catch {
          return JSON.parse(decodeURIComponent(str));
        }
      }
    }

    const jsonStr = Buffer.from(str, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Error al decodificar payload de comprobante:', e);
    return null;
  }
}

/**
 * Genera el enlace público dinámico para un Comprobante de Abono
 */
export function generarUrlPublicaAbono(data: ComprobanteAbonoPdfData): string {
  const base = obtenerUrlBase();
  const num = data.comprobante.numero?.trim() || 'REC';

  // Formato compacto en array para máxima seguridad y mínima longitud
  const compactArray = [
    'A',
    num,
    data.comprobante.fecha || '',
    data.comprobante.hora || '',
    data.comprobante.formaPago || 'EFECTIVO',
    data.cliente.nombre || 'Cliente',
    Math.round(Number(data.movimiento.saldoAnterior || 0) * 100) / 100,
    Math.round(Number(data.movimiento.montoAbonado || 0) * 100) / 100,
    Math.round(Number(data.movimiento.saldoRestante || 0) * 100) / 100,
    data.emisor.nombre || 'NEXORA',
    data.cliente.cedula || '',
  ];

  const encoded = codificarPayload(compactArray);
  return `${base}/c?d=${encodeURIComponent(encoded)}`;
}

/**
 * Genera el enlace público dinámico para una Factura Electrónica
 */
export function generarUrlPublicaFactura(data: FacturaPdfData): string {
  const base = obtenerUrlBase();
  const num = data.comprobante.numero?.trim() || 'FAC';
  const subtotal = (Number(data.totales?.subtotal15 || 0) + Number(data.totales?.subtotal0 || 0));
  const iva = Number(data.totales?.iva15 || 0);
  const total = Number(data.totales?.total || 0);

  const compactArray = [
    'F',
    num,
    data.comprobante.fecha || '',
    data.comprador.nombre || 'Cliente',
    data.comprador.cedula || '',
    subtotal,
    iva,
    total,
    data.emisor.nombre || 'NEXORA',
    (data.detalles || []).slice(0, 10).map((it) => [
      it.descripcion || 'Calzado',
      it.cantidad || 1,
      it.precioUnitario || 0,
      it.subtotal || 0,
    ]),
  ];

  const encoded = codificarPayload(compactArray);
  return `${base}/c?d=${encodeURIComponent(encoded)}`;
}

/**
 * Genera el enlace público dinámico para una Orden de Compra
 */
export function generarUrlPublicaOrden(data: OrdenCompraPdfData): string {
  const base = obtenerUrlBase();
  const num = data.orden.numero?.trim() || 'ORD';

  const compactArray = [
    'O',
    num,
    data.orden.fecha || '',
    data.proveedor.nombre || 'Proveedor',
    data.totales.totalPares || 0,
    data.totales.totalPagar || 0,
    data.emisor.nombre || 'NEXORA',
    (data.lineas || []).slice(0, 10).map((l) => [
      l.modelo || 'Calzado',
      l.color || '',
      l.numeracion || '',
      l.cantidadPares || 1,
      l.precioCosto || 0,
      l.subtotal || 0,
    ]),
  ];

  const encoded = codificarPayload(compactArray);
  return `${base}/c?d=${encodeURIComponent(encoded)}`;
}

export interface PedidoClienteComprobanteData {
  pedido: {
    id: string;
    numero?: number;
    numeroCodigo?: string;
    fecha: string;
    hora?: string;
    tipoPago?: string;
    observaciones?: string;
  };
  cliente: {
    nombre: string;
    cedula?: string;
    telefono?: string;
    direccion?: string;
  };
  emisor: {
    nombre: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
  };
  lineas: Array<{
    modelo: string;
    codigo?: string;
    color?: string;
    serie?: string;
    imageUrl?: string;
    numeracion?: string;
    observacion?: string;
    cantidadPares: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  totales: {
    totalPares: number;
    totalPagar: number;
    adelanto?: number;
    saldoPendiente?: number;
    metodoAdelanto?: string;
  };
}

/**
 * Genera el enlace público dinámico para un Pedido de Cliente
 */
export function generarUrlPublicaPedidoCliente(data: PedidoClienteComprobanteData): string {
  const base = obtenerUrlBase();
  const num = data.pedido.numeroCodigo || (data.pedido.numero ? `PED-${String(data.pedido.numero).padStart(4, '0')}` : data.pedido.id.slice(0, 8));

  const compactArray = [
    'P',
    num,
    data.pedido.fecha || '',
    data.cliente.nombre || 'Cliente',
    data.totales.totalPares || 0,
    data.totales.totalPagar || 0,
    data.totales.adelanto || 0,
    data.totales.saldoPendiente || 0,
    data.emisor.nombre || 'NEXORA',
    (data.lineas || []).slice(0, 8).map((l) => [
      l.modelo || 'Calzado',
      l.color || '',
      l.numeracion || '',
      l.cantidadPares || 1,
      l.precioUnitario || 0,
      l.subtotal || 0,
    ]),
  ];

  const encoded = codificarPayload(compactArray);
  return `${base}/c?d=${encodeURIComponent(encoded)}`;
}

