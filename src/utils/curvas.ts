export type TipoCurva = 'DOCENA' | 'MEDIA_A' | 'MEDIA_B';

export const getCurvaDocena = (serieName: string, tipo: TipoCurva): Record<number, number> => {
  const name = (serieName || '').toUpperCase();

  // 1. Serie Caballero / Adulto / Hombre
  if (name.includes('CABALLERO') || name.includes('HOMBRE') || name.includes('ADULTO') || name === 'TALLA_GRANDE') {
    if (name.includes('43')) {
      // 38 al 43 (6 tallas)
      if (tipo === 'DOCENA') return { 38: 1, 39: 2, 40: 3, 41: 3, 42: 2, 43: 1 };
      if (tipo === 'MEDIA_A') return { 38: 1, 39: 1, 40: 2, 41: 1, 42: 1, 43: 0 };
      return { 38: 0, 39: 1, 40: 1, 41: 2, 42: 1, 43: 1 };
    }
    // 38 al 42 (5 tallas)
    if (tipo === 'DOCENA') return { 38: 2, 39: 3, 40: 3, 41: 2, 42: 2 };
    if (tipo === 'MEDIA_A') return { 38: 1, 39: 2, 40: 1, 41: 1, 42: 1 };
    return { 38: 1, 39: 1, 40: 2, 41: 1, 42: 1 };
  }

  // 2. Serie Dama / Mujer / Femenino
  if (name.includes('DAMA') || name.includes('MUJER') || name.includes('FEMENINO')) {
    if (name.includes('34') || name.includes('39')) {
      // 34 al 39 (6 tallas)
      if (tipo === 'DOCENA') return { 34: 1, 35: 2, 36: 3, 37: 3, 38: 2, 39: 1 };
      if (tipo === 'MEDIA_A') return { 34: 1, 35: 1, 36: 2, 37: 1, 38: 1, 39: 0 };
      return { 34: 0, 35: 1, 36: 1, 37: 2, 38: 1, 39: 1 };
    }
    // 35 al 39 (5 tallas)
    if (tipo === 'DOCENA') return { 35: 2, 36: 3, 37: 3, 38: 2, 39: 2 };
    if (tipo === 'MEDIA_A') return { 35: 1, 36: 2, 37: 1, 38: 1, 39: 1 };
    return { 35: 1, 36: 1, 37: 2, 38: 1, 39: 1 };
  }

  // 3. Serie Juvenil
  if (name.includes('JUVENIL')) {
    if (tipo === 'DOCENA') return { 34: 2, 35: 3, 36: 3, 37: 2, 38: 2 };
    if (tipo === 'MEDIA_A') return { 34: 1, 35: 2, 36: 1, 37: 1, 38: 1 };
    return { 34: 1, 35: 1, 36: 2, 37: 1, 38: 1 };
  }

  // 4. Serie Niño / Niña / Escolar / Infantil
  if (name.includes('NIÑO') || name.includes('NIÑA') || name.includes('ESCOLAR') || name.includes('INFANTIL')) {
    if (tipo === 'DOCENA') return { 28: 2, 29: 2, 30: 3, 31: 3, 32: 2 };
    if (tipo === 'MEDIA_A') return { 28: 1, 29: 1, 30: 2, 31: 1, 32: 1 };
    return { 28: 1, 29: 1, 30: 1, 31: 2, 32: 1 };
  }

  return {};
};

/**
 * Calcula la curva exacta para el listado real de tallas que tiene el modelo.
 * NUNCA inventa tallas que el modelo no tenga.
 */
export const calcularCurvaParaTallas = (
  serieName: string,
  tallas: Array<{ id?: string; tallaId?: string; numero?: number; nombre?: any; stock?: number; cantidad?: number }>,
  tipo: TipoCurva
): Record<string, number> => {
  if (!tallas || tallas.length === 0) return {};

  const curvaPredefinida = getCurvaDocena(serieName, tipo);
  const result: Record<string, number> = {};

  // Ordenar tallas ascendentes para cálculo proporcional inteligente
  const tallasOrdenadas = [...tallas].sort((a, b) => {
    const na = Number(a.numero ?? a.nombre) || 0;
    const nb = Number(b.numero ?? b.nombre) || 0;
    return na - nb;
  });

  // Si hay curva exacta para los números de esta serie y cubre las tallas del modelo
  const coincideCurva = tallasOrdenadas.some((t) => {
    const num = Number(t.numero ?? t.nombre);
    return curvaPredefinida[num] !== undefined && curvaPredefinida[num] > 0;
  });

  if (coincideCurva) {
    tallasOrdenadas.forEach((t) => {
      const num = Number(t.numero ?? t.nombre);
      const key = t.tallaId || t.id || `t-${num}`;
      result[key] = curvaPredefinida[num] !== undefined ? curvaPredefinida[num] : 0;
    });
    return result;
  }

  // Si la serie del modelo tiene 6 tallas exactas sin curva especial (1 par por talla = 6 pares = media docena natural)
  if (tallasOrdenadas.length === 6) {
    const factor = tipo === 'DOCENA' ? 2 : 1;
    tallasOrdenadas.forEach((t) => {
      const num = Number(t.numero ?? t.nombre);
      const key = t.tallaId || t.id || `t-${num}`;
      result[key] = factor;
    });
    return result;
  }

  // Distribución proporcional para cualquier número de tallas (ej. 4, 5 o 7 tallas)
  const targetPares = tipo === 'DOCENA' ? 12 : 6;
  const numTallas = tallasOrdenadas.length;
  const basePorTalla = Math.floor(targetPares / numTallas);
  let sobrante = targetPares - (basePorTalla * numTallas);

  // Distribuir base
  tallasOrdenadas.forEach((t) => {
    const num = Number(t.numero ?? t.nombre);
    const key = t.tallaId || t.id || `t-${num}`;
    result[key] = basePorTalla;
  });

  // Distribuir sobrantes: si es MEDIA_A favorece tallas menores/medias; si es MEDIA_B favorece mayores
  const indicesOrdenados = tallasOrdenadas.map((_, i) => i);
  if (tipo === 'MEDIA_B') {
    indicesOrdenados.reverse();
  } else if (tipo === 'DOCENA') {
    // Para docena centrar sobrantes en tallas intermedias
    indicesOrdenados.sort((a, b) => Math.abs(a - numTallas / 2) - Math.abs(b - numTallas / 2));
  }

  for (const idx of indicesOrdenados) {
    if (sobrante <= 0) break;
    const t = tallasOrdenadas[idx];
    const num = Number(t.numero ?? t.nombre);
    const key = t.tallaId || t.id || `t-${num}`;
    result[key] += 1;
    sobrante--;
  }

  return result;
};

/**
 * Evalúa con precisión el stock físico real para Media Docena A vs Media Docena B.
 * Permite advertir al usuario cuando una serie ya no tiene stock y sugerir la que queda.
 */
export const evaluarDisponibilidadMedias = (
  serieName: string,
  tallas: Array<{ id?: string; tallaId?: string; numero?: number; nombre?: any; disponible?: number; stock?: number; cantidad?: number }>
): {
  mediaADisponible: boolean;
  mediaBDisponible: boolean;
  maxMediasA: number;
  maxMediasB: number;
  recomendacion: 'AMBAS' | 'SOLO_A' | 'SOLO_B' | 'NINGUNA';
  mensajeAdvertencia?: string;
} => {
  if (!tallas || tallas.length === 0) {
    return {
      mediaADisponible: false,
      mediaBDisponible: false,
      maxMediasA: 0,
      maxMediasB: 0,
      recomendacion: 'NINGUNA',
      mensajeAdvertencia: 'No hay tallas configuradas en este modelo.',
    };
  }

  const curvaA = calcularCurvaParaTallas(serieName, tallas, 'MEDIA_A');
  const curvaB = calcularCurvaParaTallas(serieName, tallas, 'MEDIA_B');

  let maxA = Infinity;
  let maxB = Infinity;

  tallas.forEach((t) => {
    const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
    const disp = Math.max(0, Number(t.disponible ?? t.stock ?? t.cantidad ?? 0));

    const reqA = curvaA[key] || 0;
    if (reqA > 0) {
      maxA = Math.min(maxA, Math.floor(disp / reqA));
    }

    const reqB = curvaB[key] || 0;
    if (reqB > 0) {
      maxB = Math.min(maxB, Math.floor(disp / reqB));
    }
  });

  const finalMaxA = maxA === Infinity ? 0 : Math.max(0, maxA);
  const finalMaxB = maxB === Infinity ? 0 : Math.max(0, maxB);

  const mediaADisponible = finalMaxA > 0;
  const mediaBDisponible = finalMaxB > 0;

  let recomendacion: 'AMBAS' | 'SOLO_A' | 'SOLO_B' | 'NINGUNA' = 'AMBAS';
  let mensajeAdvertencia: string | undefined = undefined;

  if (mediaADisponible && mediaBDisponible) {
    recomendacion = 'AMBAS';
  } else if (!mediaADisponible && mediaBDisponible) {
    recomendacion = 'SOLO_B';
    mensajeAdvertencia = `⚠️ Serie A sin stock suficiente. Solo Serie B disponible (${finalMaxB} ${finalMaxB === 1 ? 'media docena' : 'medias docenas'}).`;
  } else if (mediaADisponible && !mediaBDisponible) {
    recomendacion = 'SOLO_A';
    mensajeAdvertencia = `⚠️ Serie B sin stock suficiente. Solo Serie A disponible (${finalMaxA} ${finalMaxA === 1 ? 'media docena' : 'medias docenas'}).`;
  } else {
    recomendacion = 'NINGUNA';
    mensajeAdvertencia = '⚠️ Stock insuficiente para completar una media docena.';
  }

  return {
    mediaADisponible,
    mediaBDisponible,
    maxMediasA: finalMaxA,
    maxMediasB: finalMaxB,
    recomendacion,
    mensajeAdvertencia,
  };
};

/**
 * Detecta automáticamente cuál curva sugerir según el stock disponible en bodega.
 */
export const detectarMejorCurvaSegunStock = (
  serieName: string,
  tallas: Array<{ id?: string; tallaId?: string; numero?: number; nombre?: any; stock?: number; cantidad?: number; disponible?: number }>
): TipoCurva => {
  const evalDisp = evaluarDisponibilidadMedias(serieName, tallas);
  if (evalDisp.recomendacion === 'SOLO_B') return 'MEDIA_B';
  if (evalDisp.recomendacion === 'SOLO_A') return 'MEDIA_A';

  // Si ambas están disponibles, comparar stock de tallas clave
  const curvaA = calcularCurvaParaTallas(serieName, tallas, 'MEDIA_A');
  const curvaB = calcularCurvaParaTallas(serieName, tallas, 'MEDIA_B');

  let deficitA = 0;
  let deficitB = 0;

  tallas.forEach((t) => {
    const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
    const disp = Math.max(0, Number(t.disponible ?? t.stock ?? t.cantidad ?? 0));
    deficitA += Math.max(0, (curvaA[key] || 0) - disp);
    deficitB += Math.max(0, (curvaB[key] || 0) - disp);
  });

  return deficitB < deficitA ? 'MEDIA_B' : 'MEDIA_A';
};

/**
 * Divide una distribución de docena en media docena inteligente.
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

  let faltan = targetTotal - asignados;
  if (faltan > 0 && sobrantes.length > 0) {
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

  if (faltan > 0) {
    const fallbackList = tipo === 'MEDIA_A' ? [...tallasOrdenadas] : [...tallasOrdenadas].reverse();
    for (const t of fallbackList) {
      if (faltan <= 0) break;
      resultado[t] = (resultado[t] || 0) + 1;
      faltan--;
    }
  }

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
