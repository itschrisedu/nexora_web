import { useEffect, useRef } from 'react';

/**
 * Hook personalizado que revalida datos automáticamente cuando:
 * 1. El usuario vuelve a enfocar la pestaña del navegador (visibilitychange / focus)
 * 2. Como respaldo, realiza un sondeo suave cada `pollingIntervalMs` milisegundos (por defecto 60s)
 *
 * Esto evita que el usuario tenga que refrescar manualmente la página
 * para ver cambios realizados desde otro panel (ej. Super Admin → Negocio).
 *
 * @param refetchFn - Función async que recarga los datos (ej. fetchTenants, loadUsers)
 * @param options - Configuración opcional
 */
export function useWindowFocusRefresh(
  refetchFn: () => void | Promise<void>,
  options: {
    /** Habilitar o deshabilitar el hook (ej. solo cuando `online`) */
    enabled?: boolean;
    /** Intervalo de polling en ms (por defecto 60000 = 60s). Pasar 0 para desactivar polling. */
    pollingIntervalMs?: number;
    /** Tiempo mínimo entre revalidaciones en ms (por defecto 5000 = 5s) para evitar ráfagas */
    throttleMs?: number;
  } = {},
) {
  const { enabled = true, pollingIntervalMs = 60000, throttleMs = 5000 } = options;
  const lastRefetchRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const throttledRefetch = () => {
      const now = Date.now();
      if (now - lastRefetchRef.current < throttleMs) return;
      lastRefetchRef.current = now;
      refetchFn();
    };

    // 1. Revalidar cuando el usuario vuelve a la pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        throttledRefetch();
      }
    };

    // 2. Revalidar al enfocar la ventana (cubre alt+tab y clic en la pestaña)
    const handleFocus = () => {
      throttledRefetch();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 3. Polling suave de respaldo (si está habilitado)
    let pollingTimer: ReturnType<typeof setInterval> | null = null;
    if (pollingIntervalMs > 0) {
      pollingTimer = setInterval(() => {
        // Solo hacer polling si la pestaña está visible
        if (document.visibilityState === 'visible') {
          throttledRefetch();
        }
      }, pollingIntervalMs);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (pollingTimer) clearInterval(pollingTimer);
    };
  }, [enabled, refetchFn, pollingIntervalMs, throttleMs]);
}
