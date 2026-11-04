/**
 * Utilidad para sincronización dinámica del favicon exclusivamente en la pestaña de navegación.
 *
 * Regla: Mantiene intactos apple-touch-icon, manifest.json y accesos directos móviles
 * para garantizar la identidad estándar cuando los usuarios agregan el sistema a favoritos
 * o crean accesos directos en la pantalla de inicio del móvil.
 *
 * Solo actualiza el icono de la pestaña activa del navegador cuando el negocio cuenta con su logo configurado.
 */

/**
 * Detecta el MIME type correcto a partir de la URL, limpiando query params
 * y fragmentos antes de evaluar la extensión.
 */
function detectMimeType(url: string): string | undefined {
  const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
  if (cleanUrl.endsWith('.ico')) return 'image/x-icon';
  if (cleanUrl.endsWith('.svg')) return 'image/svg+xml';
  if (cleanUrl.endsWith('.png')) return 'image/png';
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg';
  if (cleanUrl.endsWith('.webp')) return 'image/webp';
  if (cleanUrl.endsWith('.gif')) return 'image/gif';
  // Para URLs externas sin extensión reconocible (Cloudinary, S3, etc.)
  // no declarar type y dejar que el navegador detecte desde el Content-Type HTTP
  return undefined;
}

export function updateTabFavicon(iconUrl?: string | null): void {
  if (typeof document === 'undefined') return;

  const targetIcon = iconUrl && iconUrl.trim() ? iconUrl.trim() : '/favicon.ico';

  try {
    // 1. Seleccionar exclusivamente los tags de favicon de la pestaña (nunca apple-touch-icon)
    const existingFavicons = document.querySelectorAll<HTMLLinkElement>(
      "link[rel='icon'], link[rel='shortcut icon']"
    );

    // 2. Remover los links anteriores para forzar al motor del navegador a invalidar la caché de la pestaña
    existingFavicons.forEach((el) => {
      el.remove();
    });

    // 3. Crear e inyectar un nuevo elemento link limpio
    const link = document.createElement('link');
    link.rel = 'icon';

    const mime = detectMimeType(targetIcon);
    if (mime) {
      link.type = mime;
    }
    // Sin type => el navegador auto-detecta desde Content-Type del servidor

    // Cache-bust para forzar al navegador a recargar cuando cambia el logo
    const separator = targetIcon.includes('?') ? '&' : '?';
    link.href = targetIcon.startsWith('/') ? targetIcon : `${targetIcon}${separator}_f=${Date.now()}`;

    document.head.appendChild(link);

    // 4. Fallback: si la imagen del logo externo falla, revertir a favicon por defecto
    if (targetIcon !== '/favicon.ico' && !targetIcon.startsWith('/')) {
      const probe = new Image();
      probe.onload = () => {
        // Logo cargó correctamente, el link ya está puesto
      };
      probe.onerror = () => {
        // Logo falló (CORS, URL rota, etc.) => revertir a favicon local
        link.href = '/favicon.ico';
        link.type = 'image/x-icon';
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nexora_business_logo');
        }
      };
      probe.src = targetIcon;
    }
  } catch (err) {
    console.warn('Error al actualizar el favicon de la pestaña:', err);
  }
}
