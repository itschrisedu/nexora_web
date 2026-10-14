/**
 * Utilidad universal para apertura inteligente de WhatsApp
 * Detecta automáticamente si se navega desde Celular o Computadora (PC).
 * Soporta de forma nativa WhatsApp Business, WhatsApp Personal, WhatsApp Web y Desktop.
 * Guarda la preferencia de forma independiente en cada dispositivo.
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

/**
 * Detecta si el cliente actual está ejecutando el sistema desde un dispositivo móvil (Android / iOS / Tablet)
 */
export function esDispositivoMovil(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const esTouch = navigator.maxTouchPoints > 0;
  const esMovilUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const esPantallaPequena = window.innerWidth <= 768;
  return esMovilUA || (esTouch && esPantallaPequena);
}

export type CanalWhatsApp =
  | 'WEB'                 // WhatsApp Web en navegador (PC)
  | 'DESKTOP'             // App instalada de WhatsApp en escritorio (Windows/Mac)
  | 'BUSINESS_MOVIL'      // WhatsApp Business en móvil (com.whatsapp.w4b)
  | 'NORMAL_MOVIL'        // WhatsApp Personal / Estándar en móvil (com.whatsapp)
  | 'NATIVO_MOVIL'        // Selector universal del sistema operativo (Android / iOS)
  | 'APP'                 // Compatibilidad hacia atrás
  | 'PREGUNTAR';          // Forzar modal de elección

/**
 * Obtiene la preferencia según el dispositivo en uso (Celular vs Computadora)
 */
export function obtenerCanalWhatsAppPreferido(): CanalWhatsApp {
  if (typeof window === 'undefined') return 'WEB';

  const esMovil = esDispositivoMovil();

  if (esMovil) {
    const prefMovil = localStorage.getItem('nexora_whatsapp_pref_movil') as CanalWhatsApp;
    if (prefMovil && ['BUSINESS_MOVIL', 'NORMAL_MOVIL', 'NATIVO_MOVIL', 'PREGUNTAR'].includes(prefMovil)) {
      return prefMovil;
    }
    // Si nunca ha configurado en su móvil, preguntar la primera vez para que elija su app de WhatsApp y la recuerde
    return 'PREGUNTAR';
  } else {
    const prefPc = localStorage.getItem('nexora_whatsapp_pref_pc') as CanalWhatsApp;
    if (prefPc && ['WEB', 'DESKTOP', 'PREGUNTAR'].includes(prefPc)) {
      return prefPc;
    }
    // Si viene la clave genérica antigua
    const prefVieja = localStorage.getItem('nexora_whatsapp_canal_pref') as CanalWhatsApp;
    if (prefVieja === 'APP') return 'DESKTOP';
    if (prefVieja === 'PREGUNTAR') return 'PREGUNTAR';
    return 'WEB'; // Por defecto en PC WhatsApp Web
  }
}

/**
 * Guarda la preferencia diferenciada para este dispositivo
 */
export function guardarCanalWhatsAppPreferido(canal: CanalWhatsApp): void {
  if (typeof window === 'undefined') return;

  const esMovil = esDispositivoMovil();
  if (esMovil) {
    localStorage.setItem('nexora_whatsapp_pref_movil', canal);
  } else {
    localStorage.setItem('nexora_whatsapp_pref_pc', canal);
  }
  // Sincronizar clave global para componentes antiguos
  localStorage.setItem('nexora_whatsapp_canal_pref', canal);
  window.dispatchEvent(new CustomEvent('nexora:config-changed'));
}

/**
 * Genera la URL o Intent adecuado según el canal y dispositivo
 */
export function obtenerUrlWhatsApp(telefono: string | undefined | null, mensaje: string, canal?: CanalWhatsApp): string {
  const num = formatearNumeroWhatsApp(telefono);
  const textoCodificado = encodeURIComponent(mensaje);
  const canalFinal = canal || obtenerCanalWhatsAppPreferido();
  const isAndroid = typeof window !== 'undefined' && /android/i.test(navigator.userAgent || '');

  // 1. WhatsApp Business en Móvil
  if (canalFinal === 'BUSINESS_MOVIL') {
    if (isAndroid) {
      // Intent nativo directo al paquete oficial de WhatsApp Business
      if (num) {
        return `intent://send?phone=${num}&text=${textoCodificado}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
      }
      return `intent://send?text=${textoCodificado}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
    }
    // En iOS u otros móviles
    if (num) {
      return `whatsapp://send?phone=${num}&text=${textoCodificado}`;
    }
    return `whatsapp://send?text=${textoCodificado}`;
  }

  // 2. WhatsApp Normal / Personal en Móvil
  if (canalFinal === 'NORMAL_MOVIL') {
    if (isAndroid) {
      // Intent nativo directo al paquete oficial de WhatsApp estándar
      if (num) {
        return `intent://send?phone=${num}&text=${textoCodificado}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
      }
      return `intent://send?text=${textoCodificado}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
    }
    if (num) {
      return `whatsapp://send?phone=${num}&text=${textoCodificado}`;
    }
    return `whatsapp://send?text=${textoCodificado}`;
  }

  // 3. Selector Nativo Móvil / Compatibilidad APP
  if (canalFinal === 'NATIVO_MOVIL' || canalFinal === 'APP') {
    if (num) {
      return `https://api.whatsapp.com/send?phone=${num}&text=${textoCodificado}`;
    }
    return `https://api.whatsapp.com/send?text=${textoCodificado}`;
  }

  // 4. WhatsApp Desktop (PC)
  if (canalFinal === 'DESKTOP') {
    if (num) {
      return `whatsapp://send?phone=${num}&text=${textoCodificado}`;
    }
    return `whatsapp://send?text=${textoCodificado}`;
  }

  // 5. WhatsApp Web (Navegador PC - Por defecto)
  if (num) {
    return `https://web.whatsapp.com/send?phone=${num}&text=${textoCodificado}`;
  }
  return `https://web.whatsapp.com/send?text=${textoCodificado}`;
}

/**
 * Abre WhatsApp de manera directa según la preferencia guardada en este equipo
 */
export function abrirWhatsAppUniversal(telefono: string | undefined | null, mensaje: string, forzarCanal?: CanalWhatsApp): boolean {
  if (typeof window === 'undefined') return false;

  const canal = forzarCanal || obtenerCanalWhatsAppPreferido();

  // Si no está configurado en este dispositivo o pide preguntar, disparar modal selector
  if (canal === 'PREGUNTAR') {
    window.dispatchEvent(
      new CustomEvent('nexora:solicitar-canal-whatsapp', {
        detail: { telefono, mensaje },
      })
    );
    return true;
  }

  const url = obtenerUrlWhatsApp(telefono, mensaje, canal);

  // En Android los intents se deben navegar en la misma ventana para invocar la app nativa sin bloquearse
  if (url.startsWith('intent://') || url.startsWith('whatsapp://')) {
    window.location.href = url;
    return true;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
