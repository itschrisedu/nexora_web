import { validarCedula, validarRuc } from '../../../src/utils/ecuador-validators';
import { getCurvaDocena, calcularCurvaParaTallas } from '../../../src/utils/curvas';
import { getClienteReputacion } from '../../../src/utils/cliente-reputacion';

describe('Rendimiento / Benchmark Frontend — Algoritmos de Curvas, Validadores y Reputación', () => {
  const tallasAdulto = [
    { id: 't-38', numero: 38, stock: 10 },
    { id: 't-39', numero: 39, stock: 15 },
    { id: 't-40', numero: 40, stock: 20 },
    { id: 't-41', numero: 41, stock: 12 },
    { id: 't-42', numero: 42, stock: 8 },
  ];

  it('debe validar 1,000 cédulas ecuatorianas con Módulo 10 en menos de 20 ms (< 0.02 ms por validación)', () => {
    const total = 1000;
    const cedulas = Array.from({ length: total }, () => '1710034065');

    const inicio = performance.now();
    const resultados = cedulas.map((c) => validarCedula(c));
    const fin = performance.now();

    const tiempoTotalMs = fin - inicio;
    expect(resultados.every(Boolean)).toBe(true);
    expect(tiempoTotalMs).toBeLessThan(20);
  });

  it('debe calcular 1,000 distribuciones de curvas por docena en menos de 20 ms', () => {
    const total = 1000;

    const inicio = performance.now();
    for (let i = 0; i < total; i++) {
      calcularCurvaParaTallas('SERIE_ADULTO', tallasAdulto, 'DOCENA');
    }
    const fin = performance.now();

    const tiempoTotalMs = fin - inicio;
    expect(tiempoTotalMs).toBeLessThan(20);
  });

  it('debe evaluar 1,000 perfiles de reputación y clasificación de riesgo en menos de 20 ms', () => {
    const total = 1000;
    const perfiles = Array.from({ length: total }, (_, i) => ({
      totalCompras: (i % 15) + 1,
      comprasSinAtraso: (i % 10) + 1,
      atrasoConsecutivo: i % 3,
      score: 40 + (i % 60),
      activo: true,
    }));

    const inicio = performance.now();
    const resultados = perfiles.map((p) => getClienteReputacion(p));
    const fin = performance.now();

    const tiempoTotalMs = fin - inicio;
    expect(resultados.length).toBe(total);
    expect(tiempoTotalMs).toBeLessThan(20);
  });
});
