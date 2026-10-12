/**
 * Utilidad para sincronización dinámica del favicon exclusivamente en la pestaña de navegación.
 * 
 * Regla: Mantiene intactos apple-touch-icon, manifest.json y accesos directos móviles
 * para garantizar la identidad estándar cuando los usuarios agregan el sistema a favoritos
 * o crean accesos directos en la pantalla de inicio del móvil.
 * 
 * Solo actualiza el icono de la pestaña activa del navegador cuando el negocio cuenta con su logo configurado.
 */
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
    link.type = targetIcon.endsWith('.ico')
      ? 'image/x-icon'
      : targetIcon.endsWith('.svg')
      ? 'image/svg+xml'
      : 'image/png';
    link.href = targetIcon;

    document.head.appendChild(link);
  } catch (err) {
    console.warn('Error al actualizar el favicon de la pestaña:', err);
  }
}
