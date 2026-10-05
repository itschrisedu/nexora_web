import {
  calculateSuggestedPrice,
  calculateRealMarginPercent,
  calculateProfitAmount,
} from '../../../src/utils/pricing';
import {
  DEFAULT_SAAS_PLAN_PRICES,
  calculateYearlyEquivalent,
} from '../../../src/utils/saas-plans';

describe('Cálculos Financieros y Precios SaaS en Frontend', () => {
  describe('calculateSuggestedPrice & Margins', () => {
    it('debe calcular el precio sugerido con margen del 30%', () => {
      // Costo $14, margen 30% -> $14 / (1 - 0.30) = $20.00
      const precio = calculateSuggestedPrice(14, 30);
      expect(precio).toBe(20.00);
    });

    it('debe calcular el margen real en porcentaje a partir del costo y venta', () => {
      // Costo $14, Venta $20 -> ((20 - 14) / 20) * 100 = 30.0%
      const margen = calculateRealMarginPercent(14, 20);
      expect(margen).toBe(30.0);
    });

    it('debe calcular la ganancia monetaria por par', () => {
      const ganancia = calculateProfitAmount(14, 20);
      expect(ganancia).toBe(6.00);
    });

    it('debe manejar entradas inválidas o en cero sin arrojar error', () => {
      expect(calculateSuggestedPrice(0)).toBe(0);
      expect(calculateRealMarginPercent(0, 0)).toBe(0);
      expect(calculateProfitAmount(0, 0)).toBe(0);
    });
  });

  describe('SaaS Plans & Yearly Discounts', () => {
    it('debe contener los precios por defecto de suscripción SaaS', () => {
      expect(DEFAULT_SAAS_PLAN_PRICES.basico).toBe(15);
      expect(DEFAULT_SAAS_PLAN_PRICES.comercial).toBe(29);
      expect(DEFAULT_SAAS_PLAN_PRICES.mayorista).toBe(49);
    });

    it('debe calcular el equivalente mensual con 20% de descuento en facturación anual', () => {
      // $15 * 0.8 = $12
      expect(calculateYearlyEquivalent(15)).toBe(12);
      // $29 * 0.8 = $23.2 -> redondeado a 23
      expect(calculateYearlyEquivalent(29)).toBe(23);
      // $49 * 0.8 = $39.2 -> redondeado a 39
      expect(calculateYearlyEquivalent(49)).toBe(39);
    });
  });
});
