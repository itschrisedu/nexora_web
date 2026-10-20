import { getCurvaDocena, calcularCurvaParaTallas, detectarMejorCurvaSegunStock } from '../../../src/utils/curvas';

describe('Integración Frontend — Flujo Comercial de Curvas de Tallas y Cálculo por Docenas', () => {
  const tallasAdulto = [
    { id: 't-38', numero: 38, stock: 4, disponible: 4 },
    { id: 't-39', numero: 39, stock: 8, disponible: 8 },
    { id: 't-40', numero: 40, stock: 12, disponible: 12 },
    { id: 't-41', numero: 41, stock: 10, disponible: 10 },
    { id: 't-42', numero: 42, stock: 6, disponible: 6 },
  ];

  it('debe integrar la curva de docena estándar de calzado con el cálculo de pares requeridos', () => {
    const curvaEstandar = getCurvaDocena('SERIE_ADULTO', 'DOCENA');
    expect(curvaEstandar).toBeDefined();
    expect(curvaEstandar[38]).toBe(2);
    expect(curvaEstandar[39]).toBe(3);
    expect(curvaEstandar[40]).toBe(3);
    expect(curvaEstandar[41]).toBe(2);
    expect(curvaEstandar[42]).toBe(2);

    // Calcular distribución por talla para una docena completa (12 pares)
    const paresPorTalla = calcularCurvaParaTallas('SERIE_ADULTO', tallasAdulto, 'DOCENA');
    const totalParesCalculados = Object.values(paresPorTalla).reduce((acc, qty) => acc + qty, 0);
    expect(totalParesCalculados).toBe(12);

    // Validar cálculo económico integrado para 2 docenas (24 pares)
    const precioUnitarioPar = 18.5;
    const subtotal = totalParesCalculados * 2 * precioUnitarioPar;
    expect(subtotal).toBe(444.0);
    expect(`$${subtotal.toFixed(2)}`).toBe('$444.00');
  });

  it('debe detectar la mejor curva recomendada según el inventario real en stock', () => {
    // Con stock balanceado (todas las tallas tienen suficiente), el déficit es 0 para ambas
    // medias, entonces la función retorna MEDIA_A por defecto (deficitB >= deficitA)
    const curvaOptima = detectarMejorCurvaSegunStock('SERIE_ADULTO', tallasAdulto);
    expect(curvaOptima).toBe('MEDIA_A');

    // Con curva MEDIA_A, la talla 39 recibe 2 pares y la 40 recibe 1 par
    const curvaMediaA = getCurvaDocena('SERIE_ADULTO', 'MEDIA_A');
    expect(curvaMediaA[39]).toBe(2);
    expect(curvaMediaA[40]).toBe(1);

    // Si el stock favorece tallas altas (sin stock en bajas), sugiere MEDIA_B
    const tallasSesgadasAltas = [
      { id: 't-38', numero: 38, stock: 0, disponible: 0 },
      { id: 't-39', numero: 39, stock: 0, disponible: 0 },
      { id: 't-40', numero: 40, stock: 12, disponible: 12 },
      { id: 't-41', numero: 41, stock: 10, disponible: 10 },
      { id: 't-42', numero: 42, stock: 8, disponible: 8 },
    ];
    const curvaAltas = detectarMejorCurvaSegunStock('SERIE_ADULTO', tallasSesgadasAltas);
    expect(curvaAltas).toBe('MEDIA_B');
  });

  it('debe calcular correctamente medias docenas (6 pares) manteniendo proporciones exactas', () => {
    const paresMediaA = calcularCurvaParaTallas('SERIE_ADULTO', tallasAdulto, 'MEDIA_A');
    const totalMediaA = Object.values(paresMediaA).reduce((acc, qty) => acc + qty, 0);
    expect(totalMediaA).toBe(6);

    const paresMediaB = calcularCurvaParaTallas('SERIE_ADULTO', tallasAdulto, 'MEDIA_B');
    const totalMediaB = Object.values(paresMediaB).reduce((acc, qty) => acc + qty, 0);
    expect(totalMediaB).toBe(6);
  });
});
