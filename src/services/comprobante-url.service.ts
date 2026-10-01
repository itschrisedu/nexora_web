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
    numeroComprobante?: string;
    referenciaPago?: string;
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
    referenciaAdelanto?: string;
  };
}

/**
 * Genera el enlace publico ultra-corto para un Pedido de Cliente
 */
export async function generarUrlPublicaPedidoCliente(data: PedidoClienteComprobanteData): Promise<string> {
  const num = data.pedido.numeroCodigo || (data.pedido.numero ? `PED-${String(data.pedido.numero).padStart(4, '0')}` : data.pedido.id.slice(0, 8));

  const montoAdelanto = Number(data.totales.adelanto || 0);
  const saldoPendiente = data.totales.saldoPendiente !== undefined
    ? Number(data.totales.saldoPendiente)
    : Math.max(0, Number(data.totales.totalPagar || 0) - montoAdelanto);

  const refComprobante = data.pedido.numeroComprobante || data.pedido.referenciaPago || data.totales.referenciaAdelanto || '';

  const payload = {
    t: 'PEDIDO',
    num,
    f: data.pedido.fecha || '',
    c_nom: data.cliente.nombre || 'Cliente',
    c_tel: data.cliente.telefono || '',
    c_id: data.cliente.cedula || '',
    c_dir: data.cliente.direccion || '',
    fp: data.pedido.tipoPago || (refComprobante ? 'TRANSFERENCIA BANCARIA' : 'CONTADO'),
    ref: refComprobante,
    pares: data.totales.totalPares || 0,
    tot: data.totales.totalPagar || 0,
    ad: montoAdelanto,
    sal: saldoPendiente,
    met_ad: data.totales.metodoAdelanto || (refComprobante ? 'TRANSFERENCIA' : 'EFECTIVO'),
    e_nom: data.emisor.nombre || 'NEXORA',
    obs: data.pedido.observaciones || '',
    lineas: (data.lineas || []).slice(0, 10).map((l) => ({
      m: l.modelo || 'Calzado',
      col: l.color || '',
      num: l.numeracion || '',
      qty: l.cantidadPares || 1,
      u: l.precioUnitario || 0,
      tot: l.subtotal || 0,
      img: l.imageUrl || '',
      obs: l.observacion || '',
    })),
  };

  return guardarYObtenerToken('PEDIDO', payload);
}

// ─────────────────────────────────────────────────────────────
// COMPROBANTE DE VENTA POS (Nota de Venta en Mostrador)
// ─────────────────────────────────────────────────────────────

export interface VentaPosComprobanteData {
  negocio: {
    nombre: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
  };
  fecha: string;
  tipoComprobante: string;
  clienteNombre: string;
  clienteIdentificacion?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  clienteDireccion?: string;
  items: Array<{
    nombre: string;
    cantidad: number;
    tallaNumero: number | string;
    precioUnitario: number;
  }>;
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: string;
  pagaCon?: number;
  vuelto?: number;
}

/**
 * Genera el enlace publico ultra-corto para una Venta POS (Nota de Venta en Mostrador)
 */
export async function generarUrlPublicaVentaPOS(data: VentaPosComprobanteData): Promise<string> {
  const payload = {
    t: 'VENTA_POS',
    f: data.fecha || '',
    tc: data.tipoComprobante || 'COMPROBANTE_VENTA',
    c_nom: data.clienteNombre || 'Consumidor Final',
    c_id: data.clienteIdentificacion || '9999999999',
    c_tel: data.clienteTelefono || '',
    c_mail: data.clienteEmail || '',
    c_dir: data.clienteDireccion || '',
    fp: data.metodoPago || 'EFECTIVO',
    sub: data.subtotal || 0,
    desc: data.descuento || 0,
    tot: data.total || 0,
    pagaCon: data.pagaCon || 0,
    vuelto: data.vuelto || 0,
    e_nom: data.negocio.nombre || 'LOCAL COMERCIAL',
    e_ruc: data.negocio.ruc || '',
    e_dir: data.negocio.direccion || '',
    e_tel: data.negocio.telefono || '',
    items: (data.items || []).slice(0, 30).map((it) => ({
      d: it.nombre || 'Calzado',
      c: it.cantidad || 1,
      t: it.tallaNumero || '',
      u: it.precioUnitario || 0,
      tot: (it.cantidad || 1) * (it.precioUnitario || 0),
    })),
  };

  return guardarYObtenerToken('VENTA_POS', payload);
}

/**
 * Genera el mensaje de WhatsApp para enviar el comprobante de venta POS al cliente
 */
export function armarMensajeWhatsAppVentaPOS(data: VentaPosComprobanteData, urlComprobante?: string): string {
  const negocioNombre = data.negocio.nombre || 'LOCAL COMERCIAL';
  const totalPares = data.items.reduce((sum, i) => sum + (i.cantidad || 1), 0);

  const lineasTexto = data.items
    .map((it) => `  ${it.cantidad}x ${it.nombre} (Talla ${it.tallaNumero}) — $${((it.cantidad || 1) * (it.precioUnitario || 0)).toFixed(2)}`)
    .join('\n');

  let msg = `🧾 *COMPROBANTE DE VENTA — ${negocioNombre}*\n\n`;
  msg += `📅 *Fecha:* ${data.fecha}\n`;
  msg += `👤 *Cliente:* ${data.clienteNombre}\n`;
  if (data.clienteIdentificacion && data.clienteIdentificacion !== '9999999999') {
    msg += `🆔 *C.I./RUC:* ${data.clienteIdentificacion}\n`;
  }
  msg += `\n👟 *Detalle de Calzado (${totalPares} ${totalPares === 1 ? 'par' : 'pares'}):*\n${lineasTexto}\n`;

  if (data.descuento > 0) {
    msg += `\n💰 Subtotal: $${data.subtotal.toFixed(2)}`;
    msg += `\n🎁 Descuento: -$${data.descuento.toFixed(2)}`;
  }
  msg += `\n\n💵 *TOTAL: $${data.total.toFixed(2)}*`;
  msg += `\n💳 *Forma de Pago:* ${data.metodoPago}`;

  if (urlComprobante) {
    msg += `\n\n📄 *Descarga tu comprobante en PDF aquí:*\n👉 ${urlComprobante}`;
  }

  msg += `\n\n¡Gracias por su compra!\n*${negocioNombre}*`;

  return msg;
}
