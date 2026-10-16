export type TipoCurva = 'DOCENA' | 'MEDIA_A' | 'MEDIA_B';

export const getCurvaDocena = (serieName: string, tipo: TipoCurva): Record<number, number> => {
  const name = (serieName || '').toUpperCase();
  if (name.includes('ADULTO') || name === 'TALLA_GRANDE') {
    if (tipo === 'DOCENA') return { 38: 2, 39: 3, 40: 3, 41: 2, 42: 2 };
    if (tipo === 'MEDIA_A') return { 38: 1, 39: 2, 40: 1, 41: 1, 42: 1 };
    return { 38: 1, 39: 1, 40: 2, 41: 1, 42: 1 };
  }
  if (name.includes('JUVENIL')) {
    if (tipo === 'DOCENA') return { 34: 2, 35: 3, 36: 3, 37: 2, 38: 2 };
    if (tipo === 'MEDIA_A') return { 34: 1, 35: 2, 36: 1, 37: 1, 38: 1 };
    return { 34: 1, 35: 1, 36: 2, 37: 1, 38: 1 };
  }
  return {};
};

export const calcularCurvaParaTallas = (
  serieName: string,
  tallas: Array<{ id?: string; tallaId?: string; numero?: number; nombre?: any; stock?: number; cantidad?: number }>,
  tipo: TipoCurva
): Record<string, number> => {
  const curva = getCurvaDocena(serieName, tipo);
  const result: Record<string, number> = {};
  const hasCustomCurva = Object.keys(curva).length > 0;
  const factorFallback = tipo === 'DOCENA' ? 2 : 1;

  tallas.forEach((t) => {
    const num = Number(t.numero ?? t.nombre);
    const key = t.tallaId || t.id || `t-${num}`;
    if (hasCustomCurva) {
      result[key] = curva[num] !== undefined ? curva[num] : 0;
    } else {
      result[key] = factorFallback;
    }
  });

  return result;
};

export const detectarMejorCurvaSegunStock = (
  serieName: string,
  tallas: Array<{ id?: string; tallaId?: string; numero?: number; nombre?: any; stock?: number; cantidad?: number; disponible?: number }>
): TipoCurva => {
  const name = (serieName || '').toUpperCase();
  if (name.includes('ADULTO') || name === 'TALLA_GRANDE') {
    const t39 = tallas.find(t => Number(t.numero ?? t.nombre) === 39);
    const t40 = tallas.find(t => Number(t.numero ?? t.nombre) === 40);
    const stock39 = t39 ? (t39.disponible ?? t39.cantidad ?? t39.stock ?? 0) : 0;
    const stock40 = t40 ? (t40.disponible ?? t40.cantidad ?? t40.stock ?? 0) : 0;

    // Si hay más stock en talla 40 que en 39 (o si 40 >= 2 y 39 < 2), sugerir Media B
    if (stock40 > stock39) {
      return 'MEDIA_B';
    }
    return 'MEDIA_A';
  }

  if (name.includes('JUVENIL')) {
    const t35 = tallas.find(t => Number(t.numero ?? t.nombre) === 35);
    const t36 = tallas.find(t => Number(t.numero ?? t.nombre) === 36);
    const stock35 = t35 ? (t35.disponible ?? t35.cantidad ?? t35.stock ?? 0) : 0;
    const stock36 = t36 ? (t36.disponible ?? t36.cantidad ?? t36.stock ?? 0) : 0;

    if (stock36 > stock35) {
      return 'MEDIA_B';
    }
    return 'MEDIA_A';
  }

  return 'MEDIA_A';
};

/**
 * Divide una distribución de docena (ej. 12 pares configurados por el usuario)
 * en media docena (por defecto 6 pares), preservando la proporción inteligente.
 * 
 * Si el usuario configuró una serie de 6 tallas (ej. 38-43) con 2 pares cada una (total 12 pares):
 * Media A y Media B darán exactamente 1 par para cada una (total 6 pares).
 * Si hay residuos impares (ej. 38:2, 39:3, 40:3, 41:2, 42:2 = 12 pares):
 * Media A favorece las tallas menores/medias (39:2, 40:1) y Media B las mayores (39:1, 40:2).
 */
export const dividirDocenaEnMediaDocena = (
  distribucionDocena: Record<number, number>,
  tipo: 'MEDIA_A' | 'MEDIA_B',
  targetTotal = 6
): Record<number, number> => {
  const tallasOrdenadas = Object.keys(distribucionDocena)
    .map(Number)
    .sort((a, b) => a - b);

  if (tallasOrdenadas.length === 0) return {};

  const totalDocena = tallasOrdenadas.reduce((sum, t) => sum + (distribucionDocena[t] || 0), 0);
  if (totalDocena === 0) return {};

  const resultado: Record<number, number> = {};
  let asignados = 0;

  // Paso 1: Asignar la parte entera de la mitad de cada talla: Math.floor(cant / 2)
  const sobrantes: Array<{ talla: number; residuo: number }> = [];

  tallasOrdenadas.forEach((t) => {
    const cant = distribucionDocena[t] || 0;
    const base = Math.floor(cant / 2);
    resultado[t] = base;
    asignados += base;
    const residuo = cant % 2;
    if (residuo > 0) {
      sobrantes.push({ talla: t, residuo });
    }
  });

  // Paso 2: Si aún faltan pares para llegar a targetTotal (normalmente 6)
  let faltan = targetTotal - asignados;
  if (faltan > 0 && sobrantes.length > 0) {
    // Si es MEDIA_A, priorizamos las tallas menores/medias (orden ascendente)
    // Si es MEDIA_B, priorizamos las tallas medias/mayores (orden descendente)
    const ordenados = tipo === 'MEDIA_A'
      ? [...sobrantes].sort((a, b) => a.talla - b.talla)
      : [...sobrantes].sort((a, b) => b.talla - a.talla);

    for (const item of ordenados) {
      if (faltan <= 0) break;
      resultado[item.talla] = (resultado[item.talla] || 0) + 1;
      faltan--;
      asignados++;
    }
  }

  // Si aún faltan pares (ej. si todas las tallas eran impares o no había sobrantes suficientes)
  if (faltan > 0) {
    const fallbackList = tipo === 'MEDIA_A' ? [...tallasOrdenadas] : [...tallasOrdenadas].reverse();
    for (const t of fallbackList) {
      if (faltan <= 0) break;
      resultado[t] = (resultado[t] || 0) + 1;
      faltan--;
    }
  }

  // Paso 3: Si por alguna razón sobraron (ej. targetTotal era menor que la mitad)
  if (faltan < 0) {
    const reversa = tipo === 'MEDIA_A'
      ? [...tallasOrdenadas].reverse()
      : [...tallasOrdenadas];
    for (const t of reversa) {
      while (faltan < 0 && (resultado[t] || 0) > 0) {
        resultado[t]--;
        faltan++;
      }
      if (faltan === 0) break;
    }
  }

  return resultado;
};

