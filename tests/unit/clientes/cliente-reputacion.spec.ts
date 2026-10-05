import { getClienteReputacion } from '../../../src/utils/cliente-reputacion';

describe('Cálculo de Reputación y Scoring Crediticio en Frontend', () => {
  it('debe clasificar como REGULAR si el cliente no tiene historial crediticio', () => {
    const rep = getClienteReputacion(null);
    expect(rep.tipo).toBe('REGULAR');
    expect(rep.label).toBe('Cliente Regular');
  });

  it('debe clasificar como MOROSO si el cliente está inactivo o tiene 2 o más atrasos', () => {
    const repInactivo = getClienteReputacion({ activo: false, score: 90 });
    expect(repInactivo.tipo).toBe('MOROSO');

    const repAtrasos = getClienteReputacion({ atrasoConsecutivo: 2, score: 70 });
    expect(repAtrasos.tipo).toBe('MOROSO');

    const repScoreBajo = getClienteReputacion({ score: 35, atrasoConsecutivo: 0 });
    expect(repScoreBajo.tipo).toBe('MOROSO');
  });

  it('debe clasificar como RIESGO si tiene 1 atraso o score entre 40 y 64', () => {
    const rep = getClienteReputacion({ score: 55, atrasoConsecutivo: 1 });
    expect(rep.tipo).toBe('RIESGO');
    expect(rep.icon).toBe('⚠️');
  });

  it('debe clasificar como VIP si tiene 5 o más compras y pagos puntuales o score alto', () => {
    const rep = getClienteReputacion({
      totalCompras: 8,
      comprasSinAtraso: 7,
      score: 95,
      nivelCredito: 'NIVEL_3',
      atrasoConsecutivo: 0,
      activo: true,
    });
    expect(rep.tipo).toBe('VIP');
    expect(rep.icon).toBe('⭐');
  });
});
