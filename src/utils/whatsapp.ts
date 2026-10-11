/**
 * Utilidad universal para apertura de WhatsApp compatible con múltiples clientes (WhatsApp estándar, Business, Dual)
 * Utiliza el endpoint oficial https://api.whatsapp.com/send que activa el selector de aplicaciones en Android e iOS
 */

export function formatearNumeroWhatsApp(telefono?: string | null): string {
  if (!telefono) return '';
  let numLimpio = String(telefono).replace(/\D/g, '');
  if (numLimpio.startsWith('09') && numLimpio.length === 10) {
    numLimpio = '593' + numLimpio.substring(1);
  } else if (numLimpio.startsWith('0') && numLimpio.length === 10) {
    numLimpio = '593' + numLimpio.substring(1);
  }
  return numLimpio;
}

export function obtenerUrlWhatsApp(telefono: string | undefined | null, mensaje: string): string {
  const num = formatearNumeroWhatsApp(telefono);
  const textoCodificado = encodeURIComponent(mensaje);
  if (num) {
    return `https://api.whatsapp.com/send?phone=${num}&text=${textoCodificado}`;
  }
  return `https://api.whatsapp.com/send?text=${textoCodificado}`;
}

export function abrirWhatsAppUniversal(telefono: string | undefined | null, mensaje: string): boolean {
  if (typeof window === 'undefined') return false;
  const url = obtenerUrlWhatsApp(telefono, mensaje);
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
