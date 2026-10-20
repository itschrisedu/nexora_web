import {
  getCurvaDocena,
  calcularCurvaParaTallas,
  detectarMejorCurvaSegunStock,
} from '../../../src/utils/curvas';

describe('Cálculo y Distribución de Curvas de Tallas de Calzado', () => {
  describe('getCurvaDocena', () => {
    it('debe devolver la curva correcta de docena completa (12 pares) para Serie Adulto', () => {
      const curva = getCurvaDocena('SERIE ADULTO CABALLERO', 'DOCENA');
      expect(curva[38]).toBe(2);
      expect(curva[39]).toBe(3);
      expect(curva[40]).toBe(3);
      expect(curva[41]).toBe(2);
      expect(curva[42]).toBe(2);

      const totalPares = Object.values(curva).reduce((a, b) => a + b, 0);
      expect(totalPares).toBe(12);
    });

    it('debe devolver la curva correcta de media docena A (6 pares) para Serie Adulto', () => {
      const curva = getCurvaDocena('SERIE ADULTO', 'MEDIA_A');
      const totalPares = Object.values(curva).reduce((a, b) => a + b, 0);
      expect(totalPares).toBe(6);
      expect(curva[39]).toBe(2);
    });

    it('debe devolver la curva correcta de media docena B (6 pares) para Serie Adulto', () => {
      const curva = getCurvaDocena('SERIE ADULTO', 'MEDIA_B');
      const totalPares = Object.values(curva).reduce((a, b) => a + b, 0);
      expect(totalPares).toBe(6);
      expect(curva[40]).toBe(2);
    });
  });

  describe('calcularCurvaParaTallas', () => {
    it('debe mapear cantidades correctamente a objetos de tallas', () => {
      const tallas = [
        { id: 't-38', numero: 38 },
        { id: 't-39', numero: 39 },
        { id: 't-40', numero: 40 },
        { id: 't-41', numero: 41 },
        { id: 't-42', numero: 42 },
      ];

      const resultado = calcularCurvaParaTallas('SERIE ADULTO', tallas, 'DOCENA');
      expect(resultado['t-38']).toBe(2);
      expect(resultado['t-39']).toBe(3);
      expect(resultado['t-40']).toBe(3);
      expect(resultado['t-41']).toBe(2);
      expect(resultado['t-42']).toBe(2);
    });
  });

  describe('detectarMejorCurvaSegunStock', () => {
    it('debe sugerir MEDIA_B si el stock favorece las tallas altas de la curva', () => {
      // Con 5 tallas y stock mucho mayor en tallas altas (40,41,42),
      // MEDIA_B (que pide más de esas tallas) tiene menor déficit que MEDIA_A
      const tallas = [
        { id: 't-38', numero: 38, disponible: 0 },
        { id: 't-39', numero: 39, disponible: 0 },
        { id: 't-40', numero: 40, disponible: 8 },
        { id: 't-41', numero: 41, disponible: 6 },
        { id: 't-42', numero: 42, disponible: 5 },
      ];

      const sugerida = detectarMejorCurvaSegunStock('ADULTO', tallas);
      expect(sugerida).toBe('MEDIA_B');
    });

    it('debe sugerir MEDIA_A si hay igual o más stock en talla 39 que en 40', () => {
      const tallas = [
        { id: 't-39', numero: 39, disponible: 5 },
        { id: 't-40', numero: 40, disponible: 2 },
      ];

      const sugerida = detectarMejorCurvaSegunStock('ADULTO', tallas);
      expect(sugerida).toBe('MEDIA_A');
    });
  });
});
