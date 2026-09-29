/**
 * Utilidades para la gestión dinámica y configurable de los precios de suscripción SaaS de NEXORA.
 */

export interface SaasPlanPrices {
  basico: number;
  comercial: number;
  mayorista: number;
}

export const DEFAULT_SAAS_PLAN_PRICES: SaasPlanPrices = {
  basico: 15,
  comercial: 29,
  mayorista: 49,
};

const STORAGE_KEY = "nexora_saas_plan_prices";

/**
 * Obtiene los precios de los planes configurados actualmente por el Super Administrador.
 */
export function getStoredPlanPrices(): SaasPlanPrices {
  if (typeof window === "undefined") return { ...DEFAULT_SAAS_PLAN_PRICES };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAAS_PLAN_PRICES };
    const parsed = JSON.parse(raw);
    return {
      basico: Number(parsed.basico) > 0 ? Number(parsed.basico) : DEFAULT_SAAS_PLAN_PRICES.basico,
      comercial: Number(parsed.comercial) > 0 ? Number(parsed.comercial) : DEFAULT_SAAS_PLAN_PRICES.comercial,
      mayorista: Number(parsed.mayorista) > 0 ? Number(parsed.mayorista) : DEFAULT_SAAS_PLAN_PRICES.mayorista,
    };
  } catch {
    return { ...DEFAULT_SAAS_PLAN_PRICES };
  }
}

/**
 * Guarda la nueva configuración de precios y notifica a todos los componentes del sistema.
 */
export function setStoredPlanPrices(prices: Partial<SaasPlanPrices>): void {
  if (typeof window === "undefined") return;
  const current = getStoredPlanPrices();
  const updated: SaasPlanPrices = {
    basico: prices.basico !== undefined && Number(prices.basico) > 0 ? Number(prices.basico) : current.basico,
    comercial: prices.comercial !== undefined && Number(prices.comercial) > 0 ? Number(prices.comercial) : current.comercial,
    mayorista: prices.mayorista !== undefined && Number(prices.mayorista) > 0 ? Number(prices.mayorista) : current.mayorista,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("nexora:saas-plans-changed", { detail: updated }));
}

/**
 * Calcula el equivalente mensual con descuento en pago anual (-20% dcto).
 */
export function calculateYearlyEquivalent(monthlyPrice: number): number {
  if (!monthlyPrice || monthlyPrice <= 0) return 0;
  return Math.max(1, Math.round(monthlyPrice * 0.8));
}
