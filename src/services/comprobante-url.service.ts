/**
 * Servicio de Generacion y Decodificacion de Enlaces Publicos de Comprobantes
 * Genera URLs ultra-cortas almacenando los datos en el backend con un token de 8 caracteres.
 * Ejemplo de URL resultante: https://nexora-web-dusky-six.vercel.app/c?t=a7Bx9kQ2
 */

import { ComprobanteAbonoPdfData } from './pdf-abono.service';
import { FacturaPdfData, OrdenCompraPdfData } from './pdf-factura.service';

/**
 * Obtiene la URL base del backend (API)
 */
function obtenerApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
}

/**
 * Obtiene el dominio actual de la aplicacion de manera automatica
 */
export function obtenerUrlBase(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Elimina claves vacias o nulas recursivamente para mantener el payload limpio
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
 * Genera el formato estandar y profesional de hipervinculo / enlace para WhatsApp
 */
export function formatearEnlaceWhatsAppComprobante(url: string, titulo: string = 'Descarga aqui tu comprobante oficial'): string {
  if (!url) return '';
  return `\u{1F4E5} *${titulo}:*\n\u{1F449} ${url}`;
}

/**
 * Codifica un objeto a Base64 seguro para URL (fallback si el backend no responde)
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
 * Decodifica una cadena Base64 a su objeto JSON original con maxima resiliencia
 */
export function decodificarPayload(rawInput: string): any {
  try {
    if (!rawInput || typeof rawInput !== 'string') return null;
    let str = rawInput.trim();

    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1).trim();
    }

    if (str.startsWith('{') || str.startsWith('%7B') || str.startsWith('[') || str.startsWith('%5B')) {
      try {
        const decodedUri = decodeURIComponent(str);
        return JSON.parse(decodedUri);
      } catch {
        // Continuar con decodificacion base64
      }
    }

    str = str.replace(/ /g, '+');
    str = str.replace(/-/g, '+').replace(/_/g, '/');

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

// ─────────────────────────────────────────────────────────────
// GUARDAR COMPROBANTE EN BACKEND Y OBTENER TOKEN ULTRA-CORTO
// ─────────────────────────────────────────────────────────────

/**
 * Envia el payload del comprobante al backend y obtiene un token corto de 8 caracteres.
 * Si el backend no responde (offline), genera un enlace de fallback con Base64.
 */
async function guardarYObtenerToken(tipo: string, payload: any): Promise<string> {
  const base = obtenerUrlBase();
  try {
    const apiUrl = obtenerApiUrl();
    const res = await fetch(`${apiUrl}/catalogo/comprobante`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, payload }),
    });

    if (res.ok) {
      const result = await res.json();
      if (result?.token) {
        return `${base}/c?t=${result.token}`;
      }
    }
  } catch (e) {
    console.warn('Backend no disponible para comprobante, usando fallback Base64:', e);
  }

  // Fallback offline: codificar en la URL (enlace largo)
  const encoded = codificarPayload(payload);
  return `${base}/c?d=${encodeURIComponent(encoded)}`;
}

// ─────────────────────────────────────────────────────────────
// FUNCIONES PUBLICAS DE GENERACION DE URL
// ─────────────────────────────────────────────────────────────

/**
 * Genera el enlace publico ultra-corto para un Comprobante de Abono
 */
export async function generarUrlPublicaAbono(data: ComprobanteAbonoPdfData): Promise<string> {
  const payload = {
    t: 'ABONO',
    num: data.comprobante.numero?.trim() || 'REC',
    f: data.comprobante.fecha || '',
    h: data.comprobante.hora || '',
    fp: data.comprobante.formaPago || 'EFECTIVO',
    c_nom: data.cliente.nombre || 'Cliente',
    c_id: data.cliente.cedula || '',
    c_tel: data.cliente.telefono || '',
    c_dir: data.cliente.direccion || '',
    m_ant: Math.round(Number(data.movimiento.saldoAnterior || 0) * 100) / 100,
    m_abo: Math.round(Number(data.movimiento.montoAbonado || 0) * 100) / 100,
    m_res: Math.round(Number(data.movimiento.saldoRestante || 0) * 100) / 100,
    e_nom: data.emisor.nombre || 'NEXORA',
  };

  return guardarYObtenerToken('ABONO', payload);
}

/**
 * Genera el enlace publico ultra-corto para una Factura Electronica
 */
export async function generarUrlPublicaFactura(data: FacturaPdfData): Promise<string> {
  const payload = {
    t: 'FACTURA',
    num: data.comprobante.numero?.trim() || 'FAC',
    f: data.comprobante.fecha || '',
    c_nom: data.comprador.nombre || 'Cliente',
    c_id: data.comprador.cedula || '',
    sub: (Number(data.totales?.subtotal15 || 0) + Number(data.totales?.subtotal0 || 0)),
    iva: Number(data.totales?.iva15 || 0),
    tot: Number(data.totales?.total || 0),
    e_nom: data.emisor.nombre || 'NEXORA',
    items: (data.detalles || []).slice(0, 10).map((it) => ({
      d: it.descripcion || 'Calzado',
      c: it.cantidad || 1,
      u: it.precioUnitario || 0,
      t: it.subtotal || 0,
    })),
  };

  return guardarYObtenerToken('FACTURA', payload);
}

/**
 * Genera el enlace publico ultra-corto para una Orden de Compra
 */
export async function generarUrlPublicaOrden(data: OrdenCompraPdfData): Promise<string> {
  const payload = {
    t: 'ORDEN',
    num: data.orden.numero?.trim() || 'ORD',
    f: data.orden.fecha || '',
    p_nom: data.proveedor.nombre || 'Proveedor',
    pares: data.totales.totalPares || 0,
    tot: data.totales.totalPagar || 0,
    e_nom: data.emisor.nombre || 'NEXORA',
    lineas: (data.lineas || []).slice(0, 10).map((l) => ({
      m: l.modelo || 'Calzado',
      col: l.color || '',
      num: l.numeracion || '',
      qty: l.cantidadPares || 1,
      u: l.precioCosto || 0,
      tot: l.subtotal || 0,
    })),
  };

  return guardarYObtenerToken('ORDEN', payload);
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
 * Genera el enlace publico ultra-corto para un Pedido de Cliente
 */
export async function generarUrlPublicaPedidoCliente(data: PedidoClienteComprobanteData): Promise<string> {
  const num = data.pedido.numeroCodigo || (data.pedido.numero ? `PED-${String(data.pedido.numero).padStart(4, '0')}` : data.pedido.id.slice(0, 8));

  const payload = {
    t: 'PEDIDO',
    num,
    f: data.pedido.fecha || '',
    c_nom: data.cliente.nombre || 'Cliente',
    pares: data.totales.totalPares || 0,
    tot: data.totales.totalPagar || 0,
    ad: data.totales.adelanto || 0,
    sal: data.totales.saldoPendiente || 0,
    e_nom: data.emisor.nombre || 'NEXORA',
    lineas: (data.lineas || []).slice(0, 8).map((l) => ({
      m: l.modelo || 'Calzado',
      col: l.color || '',
      num: l.numeracion || '',
      qty: l.cantidadPares || 1,
      u: l.precioUnitario || 0,
      tot: l.subtotal || 0,
    })),
  };

  return guardarYObtenerToken('PEDIDO', payload);
}
