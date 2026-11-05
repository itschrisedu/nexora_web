/**
 * Utilidades para la estandarización y anonimización de nombres de productos en facturación SRI.
 *
 * Evita facturar con nombres de marcas comerciales (como Adidas, Nike, Vanz) para proteger
 * a los comerciantes artesanales de calzado de cuero de Cevallos ante el SRI y auditorías tributarias.
 * Formato estándar:
 *   "{Cantidad/Docenas} - Zapato {Color} ({RangoDeTallas})"
 * Ejemplos:
 *   "1 Docena - Zapato Negro / Blanco (38-43)"
 *   "Media Docena - Zapato Café (34-39)"
 *   "1 Par - Zapato Blanco (T.39)"
 */

export function formatearRangoTallasSerie(serieNombre?: string, tallasNumeros?: number[]): string {
  if (tallasNumeros && tallasNumeros.length > 0) {
    const validas = tallasNumeros.filter((n) => typeof n === 'number' && !isNaN(n) && n > 0);
    if (validas.length > 0) {
      const min = Math.min(...validas);
      const max = Math.max(...validas);
      if (min === max) return `T.${min}`;
      return `${min}-${max}`;
    }
  }

  const s = (serieNombre || '').toUpperCase();
  // Si la serie ya contiene un rango numérico explícito (ej: "37-42" o "38 A 43")
  const matchNum = s.match(/(\d{2})\s*[-A/]\s*(\d{2})/);
  if (matchNum) return `${matchNum[1]}-${matchNum[2]}`;

  if (s.includes('ADULTO') || s.includes('CABALLERO') || s.includes('HOMBRE')) return '38-43';
  if (s.includes('DAMA') || s.includes('MUJER') || s.includes('FEMENINO')) return '34-39';
  if (s.includes('JUVENIL') || s.includes('JUNIOR')) return '34-38';
  if (s.includes('NIÑO') || s.includes('NINO') || s.includes('ESCOLAR') || s.includes('INFANTIL')) return '27-32';
  if (s.includes('PEQUEÑO') || s.includes('PEQUENO')) return '21-26';
  if (s.includes('BEBE') || s.includes('BEBÉ')) return '18-20';
  if (s.includes('GRANDE')) return '43-45';

  return '38-43';
}

export function formatearDescripcionFacturaSri(opts: {
  cantidad: number;
  color?: string;
  serieNombre?: string;
  tallas?: number[];
  nombreGenerico?: string;
}): string {
  const { cantidad, color, serieNombre, tallas, nombreGenerico = 'Zapato' } = opts;

  let prefijoCantidad = '';
  if (cantidad === 12) {
    prefijoCantidad = '1 Docena';
  } else if (cantidad === 6) {
    prefijoCantidad = 'Media Docena';
  } else if (cantidad > 12 && cantidad % 12 === 0) {
    prefijoCantidad = `${cantidad / 12} Docenas`;
  } else if (cantidad === 1) {
    prefijoCantidad = '1 Par';
  } else {
    prefijoCantidad = `${cantidad} Pares`;
  }

  // Limpiar color (quitar marcas o texto no relacionado si existiera)
  let colorLimpio = (color || '').trim();
  // Capitalizar color si es necesario
  if (colorLimpio) {
    colorLimpio = colorLimpio
      .split(/(\s*[\/\-]\s*)/)
      .map((part) => {
        if (part.includes('/') || part.includes('-')) return part;
        const p = part.trim();
        return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '';
      })
      .join('');
  }

  const colorTexto = colorLimpio ? ` ${colorLimpio}` : '';
  const rango = formatearRangoTallasSerie(serieNombre, tallas);
  const rangoTexto = rango ? ` (${rango})` : '';

  return `${prefijoCantidad} - ${nombreGenerico}${colorTexto}${rangoTexto}`;
}

