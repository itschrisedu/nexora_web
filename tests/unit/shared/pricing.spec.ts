import {
  calculateSuggestedPrice,
  calculateRealMarginPercent,
  calculateProfitAmount,
  DEFAULT_PROFIT_MARGIN_PCT,
} from '../../../src/utils/pricing';

describe('Pricing — Cálculos Financieros de Precio, Margen y Utilidad', () => {
  describe('calculateSuggestedPrice', () => {
    it('debe calcular precio sugerido con margen del 30% por defecto', () => {
      // Fórmula: Costo / (1 - 0.30) = 20 / 0.70 = 28.57
      const precio = calculateSuggestedPrice(20, 30);
      expect(precio).toBe(28.57);
    });

    it('debe calcular precio sugerido con margen del 50%', () => {
      // 25 / (1 - 0.50) = 25 / 0.50 = 50
      const precio = calculateSuggestedPrice(25, 50);
      expect(precio).toBe(50);
    });

    it('debe retornar 0 si el costo es 0 o negativo', () => {
      expect(calculateSuggestedPrice(0, 30)).toBe(0);
      expect(calculateSuggestedPrice(-5, 30)).toBe(0);
    });

    it('debe retornar 0 si el costo es NaN', () => {
      expect(calculateSuggestedPrice(NaN, 30)).toBe(0);
    });

    it('debe limitar margen al rango seguro (1% - 99%)', () => {
      // Margen 0% se ajusta a 1%: 20 / (1 - 0.01) = 20.20
      const precioMin = calculateSuggestedPrice(20, 0);
      expect(precioMin).toBe(20.20);

      // Margen 100% se ajusta a 99%: 20 / (1 - 0.99) = 2000
      const precioMax = calculateSuggestedPrice(20, 100);
      expect(precioMax).toBe(2000);
    });
  });

  describe('calculateRealMarginPercent', () => {
    it('debe calcular el margen real a partir de costo y precio de venta', () => {
      // ((35 - 20) / 35) * 100 = 42.9%
      const margen = calculateRealMarginPercent(20, 35);
      expect(margen).toBe(42.9);
    });

    it('debe retornar 0 si el precio de venta es 0 o negativo', () => {
      expect(calculateRealMarginPercent(10, 0)).toBe(0);
      expect(calculateRealMarginPercent(10, -5)).toBe(0);
    });

    it('debe retornar 0 si el costo es NaN', () => {
      expect(calculateRealMarginPercent(NaN, 35)).toBe(0);
    });

    it('debe calcular margen correcto cuando costo = precio (0%)', () => {
      expect(calculateRealMarginPercent(20, 20)).toBe(0);
    });
  });

  describe('calculateProfitAmount', () => {
    it('debe calcular la ganancia por par (precio - costo)', () => {
      const ganancia = calculateProfitAmount(18, 35);
      expect(ganancia).toBe(17);
    });

    it('debe retornar 0 si algun valor es NaN', () => {
      expect(calculateProfitAmount(NaN, 35)).toBe(0);
      expect(calculateProfitAmount(18, NaN)).toBe(0);
    });

    it('debe manejar ganancia negativa (cuando precio < costo)', () => {
      const ganancia = calculateProfitAmount(40, 30);
      expect(ganancia).toBe(-10);
    });
  });

  describe('DEFAULT_PROFIT_MARGIN_PCT', () => {
    it('debe tener un valor por defecto de 30%', () => {
      expect(DEFAULT_PROFIT_MARGIN_PCT).toBe(30);
    });
  });
});
