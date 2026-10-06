import { validarCedula } from '../../../src/utils/ecuador-validators';
import { getClienteReputacion, ClienteReputacion } from '../../../src/utils/cliente-reputacion';

describe('Integración Frontend — Flujo de Reputación Crediticia, Validación Ecuatoriana y Sugerencia de Pago', () => {
  it('debe integrar la validación de identificación ecuatoriana con la clasificación del perfil crediticio', () => {
    // 1. Cédula válida en Ecuador (Módulo 10)
    const cedulaValida = '1710034065';
    expect(validarCedula(cedulaValida)).toBe(true);

    // 2. Cliente con historial impecable y múltiples compras
    const clienteVIP = {
      cedula: cedulaValida,
      nombre: 'Calzados Cevallos Mayorista',
      totalCompras: 10,
      comprasSinAtraso: 10,
      atrasoConsecutivo: 0,
      nivelCredito: 'NIVEL_3',
      score: 95,
      activo: true,
    };

    const repVIP: ClienteReputacion = getClienteReputacion(clienteVIP);
    expect(repVIP.tipo).toBe('VIP');
    expect(repVIP.label).toContain('VIP');
    expect(repVIP.icon).toBe('⭐');
  });

  it('debe advertir y sugerir venta de CONTADO para clientes con historial de mora recurrente', () => {
    const cedulaMoroso = '1710034065';
    expect(validarCedula(cedulaMoroso)).toBe(true);

    const clienteMoroso = {
      cedula: cedulaMoroso,
      nombre: 'Distribuidor Comercial con Atrasos',
      totalCompras: 4,
      comprasSinAtraso: 0,
      atrasoConsecutivo: 2, // 2 atrasos consecutivos
      nivelCredito: 'SIN_CREDITO',
      score: 30,
      activo: true,
    };

    const repMoroso: ClienteReputacion = getClienteReputacion(clienteMoroso);
    expect(repMoroso.tipo).toBe('MOROSO');
    expect(repMoroso.badgeClass).toContain('rose');
    expect(repMoroso.descripcion).toContain('2 pagos atrasados consecutivos');

    // Lógica de recomendación de interfaz: sugerir contado cuando el perfil es moroso o de riesgo
    const sugerirSoloContado = repMoroso.tipo === 'MOROSO' || repMoroso.tipo === 'RIESGO';
    expect(sugerirSoloContado).toBe(true);
  });

  it('debe evaluar correctamente a clientes con riesgo moderado (1 atraso)', () => {
    const clienteRiesgo = {
      totalCompras: 3,
      comprasSinAtraso: 2,
      atrasoConsecutivo: 1,
      score: 60,
      activo: true,
    };

    const repRiesgo = getClienteReputacion(clienteRiesgo);
    expect(repRiesgo.tipo).toBe('RIESGO');
    expect(repRiesgo.icon).toBe('⚠️');
  });
});
