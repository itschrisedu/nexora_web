/**
 * Utilidades de cálculo financiero y fijación de precios comerciales en NEXORA.
 *
 * Fórmula comercial estándar de margen sobre precio de venta:
 * Precio Sugerido = Costo ÷ (1 − % Margen) = Costo × (1 / (1 − Margen))
 */

export const DEFAULT_PROFIT_MARGIN_PCT = 30;

/**
 * Obtiene el margen de ganancia configurado para el negocio (por defecto 30%).
 */
export function getStoredProfitMargin(): number {
  if (typeof window === 'undefined') return DEFAULT_PROFIT_MARGIN_PCT;
  const stored = localStorage.getItem('nexora-margen-ganancia');
  if (stored) {
    const val = parseFloat(stored);
    if (!isNaN(val) && val > 0 && val < 100) return val;
  }
  return DEFAULT_PROFIT_MARGIN_PCT;
}

/**
 * Guarda el margen de ganancia configurado en almacenamiento local.
 */
export function setStoredProfitMargin(marginPct: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nexora-margen-ganancia', String(marginPct));
    window.dispatchEvent(new CustomEvent('nexora:margin-changed', { detail: { marginPct } }));
  }
}

/**
 * Calcula el precio de venta sugerido a partir del costo y el margen deseado.
 * Fórmula: Costo ÷ (1 − (Margen / 100))
 */
export function calculateSuggestedPrice(cost: number, marginPct: number = getStoredProfitMargin()): number {
  if (isNaN(cost) || cost <= 0) return 0;
  const safeMargin = Math.min(Math.max(marginPct, 1), 99) / 100;
  return Number((cost / (1 - safeMargin)).toFixed(2));
}

/**
 * Calcula el margen real (%) obtenido a partir del precio de venta y el costo.
 * Fórmula: ((Precio − Costo) ÷ Precio) × 100
 */
export function calculateRealMarginPercent(cost: number, salePrice: number): number {
  if (isNaN(salePrice) || salePrice <= 0 || isNaN(cost) || cost <= 0) return 0;
  return Number((((salePrice - cost) / salePrice) * 100).toFixed(1));
}

/**
 * Calcula la ganancia / utilidad monetaria por par.
 */
export function calculateProfitAmount(cost: number, salePrice: number): number {
  if (isNaN(salePrice) || isNaN(cost)) return 0;
  return Number((salePrice - cost).toFixed(2));
}
