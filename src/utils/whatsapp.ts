/**
 * Utilidad universal para apertura de WhatsApp compatible con múltiples clientes (WhatsApp estándar, Business, Dual)
 * Utiliza el endpoint oficial https://api.whatsapp.com/send que activa el selector de aplicaciones en Android e iOS
 */

export function formatearNumeroWhatsApp(telefono?: string | null): string {
  if (!telefono) return '';
  let numLimpio = String(telefono).replace(/\D/g, '');
  if (!numLimpio) return '';

  // Quitar ceros internacionales iniciales (00593...)
  if (numLimpio.startsWith('00593')) {
    numLimpio = numLimpio.substring(2);
  }

  // Ya tiene código de país 593 y longitud adecuada (11 o 12 dígitos)
  if (numLimpio.startsWith('593') && (numLimpio.length === 11 || numLimpio.length === 12)) {
    return numLimpio;
  }

  // Celular nacional con 0 inicial (ej: 0991234567 -> 593991234567)
  if (numLimpio.startsWith('09') && numLimpio.length === 10) {
    return '593' + numLimpio.substring(1);
  }

  // Teléfono fijo nacional con 0 inicial (ej: 032740123 -> 59332740123)
  if (numLimpio.startsWith('0') && numLimpio.length === 9) {
    return '593' + numLimpio.substring(1);
  }

  // Celular sin el cero inicial (ej: 991234567 -> 593991234567)
  if (numLimpio.startsWith('9') && numLimpio.length === 9) {
    return '593' + numLimpio;
  }

  // Teléfono de 10 dígitos general
  if (numLimpio.startsWith('0') && numLimpio.length === 10) {
    return '593' + numLimpio.substring(1);
  }

  return numLimpio;
}

export function normalizarTelefonoEcuador(telefono?: string | null): string {
  if (!telefono) return '';
  let numLimpio = String(telefono).replace(/\D/g, '');
  if (!numLimpio) return '';

  if (numLimpio.startsWith('593') && numLimpio.length === 12) {
    return '0' + numLimpio.substring(3);
  }
  if (numLimpio.startsWith('9') && numLimpio.length === 9) {
    return '0' + numLimpio;
  }
  return numLimpio;
}

export type CanalWhatsApp = 'WEB' | 'APP' | 'PREGUNTAR';

export function obtenerCanalWhatsAppPreferido(): CanalWhatsApp {
  if (typeof window === 'undefined') return 'WEB';
  const pref = localStorage.getItem('nexora_whatsapp_canal_pref') as CanalWhatsApp;
  if (pref === 'WEB' || pref === 'APP' || pref === 'PREGUNTAR') return pref;
  return 'WEB'; // Por defecto WEB para usar la cuenta del negocio en el navegador y no la app personal de Windows
}

export function guardarCanalWhatsAppPreferido(canal: CanalWhatsApp): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nexora_whatsapp_canal_pref', canal);
    window.dispatchEvent(new CustomEvent('nexora:config-changed'));
  }
}

export function obtenerUrlWhatsApp(telefono: string | undefined | null, mensaje: string, canal?: CanalWhatsApp): string {
  const num = formatearNumeroWhatsApp(telefono);
  const textoCodificado = encodeURIComponent(mensaje);
  const canalFinal = canal || obtenerCanalWhatsAppPreferido();

  if (canalFinal === 'WEB') {
    // Abre directamente WhatsApp Web en el navegador (donde está iniciada la cuenta del negocio)
    if (num) {
      return `https://web.whatsapp.com/send?phone=${num}&text=${textoCodificado}`;
    }
    return `https://web.whatsapp.com/send?text=${textoCodificado}`;
  }

  // Si es 'APP' o universal (activa app nativa o selector de Android)
  if (num) {
    return `https://api.whatsapp.com/send?phone=${num}&text=${textoCodificado}`;
  }
  return `https://api.whatsapp.com/send?text=${textoCodificado}`;
}

export function abrirWhatsAppUniversal(telefono: string | undefined | null, mensaje: string, forzarCanal?: CanalWhatsApp): boolean {
  if (typeof window === 'undefined') return false;

  const canal = forzarCanal || obtenerCanalWhatsAppPreferido();
  if (canal === 'PREGUNTAR') {
    // Disparar evento para que el modal global pregunte al usuario
    window.dispatchEvent(
      new CustomEvent('nexora:solicitar-canal-whatsapp', {
        detail: { telefono, mensaje },
      })
    );
    return true;
  }

  const url = obtenerUrlWhatsApp(telefono, mensaje, canal);
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
