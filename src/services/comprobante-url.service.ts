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
 * Codifica un objeto a Base64 seguro para URL con soporte completo UTF-8
 */
export function codificarPayload(data: any): string {
  try {
    const jsonStr = JSON.stringify(data);
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
 * Decodifica una cadena Base64 a su objeto JSON original
 */
export function decodificarPayload(base64Str: string): any {
  try {
    if (!base64Str) return null;
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      try {
        const binary = window.atob(base64Str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const jsonStr = new TextDecoder().decode(bytes);
        return JSON.parse(jsonStr);
      } catch {
        return JSON.parse(decodeURIComponent(base64Str));
      }
    }
    const jsonStr = Buffer.from(base64Str, 'base64').toString('utf-8');
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
  const payload = {
    t: 'ABONO',
    num: data.comprobante.numero,
    f: data.comprobante.fecha,
    h: data.comprobante.hora || '',
    fp: data.comprobante.formaPago,
    ref: data.comprobante.referencia || '',
    c_nom: data.cliente.nombre,
    c_id: data.cliente.cedula,
    c_tel: data.cliente.telefono || '',
    c_dir: data.cliente.direccion || '',
    m_ant: data.movimiento.saldoAnterior,
    m_abo: data.movimiento.montoAbonado,
    m_res: data.movimiento.saldoRestante,
    e_nom: data.emisor.nombre,
    e_ruc: data.emisor.ruc,
    e_dir: data.emisor.direccion,
    e_tel: data.emisor.telefono,
    not: data.comprobante.notas || '',
  };

  const encoded = codificarPayload(payload);
  const base = obtenerUrlBase();
  return `${base}/comprobante?d=${encodeURIComponent(encoded)}`;
}

/**
 * Genera el enlace público dinámico para una Factura Electrónica
 */
export function generarUrlPublicaFactura(data: FacturaPdfData): string {
  const subtotalFactura = (Number(data.totales?.subtotal15 || 0) + Number(data.totales?.subtotal0 || 0));
  const ivaFactura = Number(data.totales?.iva15 || 0);
  const totalFactura = Number(data.totales?.total || 0);

  const payload = {
    t: 'FACTURA',
    num: data.comprobante.numero,
    f: data.comprobante.fecha,
    aut: data.comprobante.claveAcceso || '',
    c_nom: data.comprador.nombre,
    c_id: data.comprador.cedula,
    c_dir: data.comprador.direccion || '',
    c_tel: data.comprador.telefono || '',
    c_mail: data.comprador.email || '',
    sub: subtotalFactura,
    iva: ivaFactura,
    tot: totalFactura,
    e_nom: data.emisor.nombre,
    e_ruc: data.emisor.ruc,
    e_dir: data.emisor.direccion,
    e_tel: data.emisor.telefono,
    items: (data.detalles || []).slice(0, 15).map((it) => ({
      d: it.descripcion,
      c: it.cantidad,
      u: it.precioUnitario,
      t: it.subtotal,
    })),
  };

  const encoded = codificarPayload(payload);
  const base = obtenerUrlBase();
  return `${base}/comprobante?d=${encodeURIComponent(encoded)}`;
}

/**
 * Genera el enlace público dinámico para una Orden de Compra
 */
export function generarUrlPublicaOrden(data: OrdenCompraPdfData): string {
  const payload = {
    t: 'ORDEN',
    num: data.orden.numero,
    f: data.orden.fecha,
    p_nom: data.proveedor.nombre,
    p_ruc: data.proveedor.ruc || '',
    p_tel: data.proveedor.contacto || '',
    pares: data.totales.totalPares,
    tot: data.totales.totalPagar,
    e_nom: data.emisor.nombre,
    e_ruc: data.emisor.ruc,
    e_dir: data.emisor.direccion,
    e_tel: data.emisor.telefono,
    lineas: (data.lineas || []).slice(0, 15).map((l) => ({
      m: l.modelo,
      c: l.codigo,
      col: l.color || '',
      num: l.numeracion || '',
      qty: l.cantidadPares,
      u: l.precioCosto,
      tot: l.subtotal,
    })),
    obs: data.orden.observaciones || '',
  };

  const encoded = codificarPayload(payload);
  const base = obtenerUrlBase();
  return `${base}/comprobante?d=${encodeURIComponent(encoded)}`;
}
