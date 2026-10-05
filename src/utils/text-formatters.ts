/**
 * Utilidades de formato y normalización estricta de texto para NEXORA.
 * Implementa las reglas de validación para nombres, apellidos, emails, teléfonos y direcciones.
 */

/**
 * Convierte una palabra a Capital Case (Primera mayúscula, resto minúsculas).
 * Soporta tildes y caracteres en español (á, é, í, ó, ú, ñ).
 */
export function capitalizarPalabra(palabra: string): string {
  if (!palabra) return '';
  const limpia = palabra.trim();
  if (!limpia) return '';
  return limpia.charAt(0).toUpperCase() + limpia.slice(1).toLowerCase();
}

/**
 * Formatea una cadena de nombres.
 * - Elimina números y caracteres especiales (solo letras y espacios).
 * - Convierte cada palabra a formato Capital Case (Primera letra mayúscula, resto minúsculas).
 * - Preserva espacios finales para una experiencia fluida al escribir.
 */
export function formatearNombres(valor: string, maxPalabras?: number): string {
  if (!valor) return '';
  // Filtrar caracteres no permitidos (solo letras en español y espacios)
  const soloLetras = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
  // Dividir por espacios y descartar vacíos
  const palabras = soloLetras.split(/\s+/).filter(Boolean);
  // Limitar al número máximo de palabras permitidas si se especifica
  const palabrasPermitidas = maxPalabras ? palabras.slice(0, maxPalabras) : palabras;
  // Capitalizar cada palabra
  const formateadas = palabrasPermitidas.map(capitalizarPalabra);
  
  // Si el usuario termina escribiendo un espacio al final, preservarlo para no trabar la escritura
  const terminaEnEspacio = valor.endsWith(' ') && (!maxPalabras || palabras.length < maxPalabras);
  return formateadas.join(' ') + (terminaEnEspacio ? ' ' : '');
}

/**
 * Formatea una cadena de apellidos.
 * - Elimina números y caracteres especiales.
 * - Formatea cada apellido a Capital Case.
 */
export function formatearApellidos(valor: string): string {
  return formatearNombres(valor);
}

/**
 * Divide una cadena de nombres en componentes individuales normalizados.
 * Retorna hasta 3 nombres separados.
 */
export function dividirNombres(nombresStr: string): {
  primerNombre: string;
  segundoNombre: string;
  tercerNombre: string;
  lista: string[];
} {
  const palabras = (nombresStr || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalizarPalabra);
  return {
    primerNombre: palabras[0] || '',
    segundoNombre: palabras[1] || '',
    tercerNombre: palabras[2] || '',
    lista: palabras.slice(0, 3),
  };
}

/**
 * Divide una cadena de apellidos en componentes individuales normalizados.
 * Retorna hasta 2 apellidos separados.
 */
export function dividirApellidos(apellidosStr: string): {
  primerApellido: string;
  segundoApellido: string;
  lista: string[];
} {
  const palabras = (apellidosStr || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalizarPalabra);
  return {
    primerApellido: palabras[0] || '',
    segundoApellido: palabras[1] || '',
    lista: palabras.slice(0, 2),
  };
}

/**
 * Normaliza y formatea un correo electrónico:
 * - Fuerza todo a minúsculas.
 * - Elimina espacios en blanco.
 * - Impide estrictamente más de un solo símbolo '@' (bloquea doble arroba).
 */
export function formatearEmail(email: string): string {
  if (!email) return '';
  const clean = email.toLowerCase().replace(/\s+/g, '');
  let atCount = 0;
  return clean.replace(/@/g, (match) => {
    atCount++;
    return atCount === 1 ? match : '';
  });
}

/**
 * Previene la inserción de un segundo '@' por teclado.
 */
export function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
  if (e.key === '@') {
    const input = e.currentTarget;
    const val = input.value;
    if (val.includes('@')) {
      const selStart = input.selectionStart || 0;
      const selEnd = input.selectionEnd || 0;
      const selectedText = val.substring(selStart, selEnd);
      // Si la selección actual no incluye el '@' existente, bloquea la tecla
      if (!selectedText.includes('@')) {
        e.preventDefault();
      }
    }
  }
}

/**
 * Valida un correo electrónico con reglas detalladas y mensajes claros:
 * - Obligatoriedad opcional.
 * - Debe tener exactamente un solo símbolo '@'.
 * - Nombre de usuario antes del '@'.
 * - Dominio válido con extensión posterior (ej: .com, .ec).
 */
export function validarEmailEstricto(email: string, obligatorio: boolean = false): { valido: boolean; mensaje?: string } {
  const limpio = formatearEmail(email);
  if (!limpio) {
    if (obligatorio) {
      return { valido: false, mensaje: 'El correo electrónico es requerido.' };
    }
    return { valido: true };
  }
  
  const arrobas = (limpio.match(/@/g) || []).length;
  if (arrobas === 0) {
    return { valido: false, mensaje: 'El correo debe incluir un arroba (@), ej: usuario@correo.com' };
  }
  if (arrobas > 1) {
    return { valido: false, mensaje: 'El correo no puede tener más de un arroba (@).' };
  }

  const partes = limpio.split('@');
  const usuario = partes[0];
  const dominio = partes[1];

  if (!usuario) {
    return { valido: false, mensaje: 'Falta el nombre de usuario antes del arroba (@).' };
  }

  if (!dominio) {
    return { valido: false, mensaje: 'Falta el dominio después del arroba (@), ej: negocio.com' };
  }

  if (!dominio.includes('.') || dominio.startsWith('.') || dominio.endsWith('.')) {
    return { valido: false, mensaje: 'El dominio debe incluir una extensión válida (ej: .com, .ec).' };
  }

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(limpio)) {
    return { valido: false, mensaje: 'Formato de correo no válido. Ej: usuario@negocio.com' };
  }

  return { valido: true };
}

/**
 * Formatea un número de teléfono celular:
 * - Permite únicamente dígitos numéricos.
 * - Limita la longitud a máximo 10 dígitos.
 */
export function formatearTelefono(telefono: string): string {
  if (!telefono) return '';
  let limpio = telefono.replace(/\D/g, '');
  if (limpio.startsWith('5939') && limpio.length === 12) {
    limpio = '0' + limpio.substring(3);
  } else if (limpio.startsWith('593') && limpio.length === 11) {
    limpio = '0' + limpio.substring(3);
  }
  return limpio.slice(0, 10);
}

/**
 * Valida un número de teléfono celular de Ecuador:
 * - Exactamente 10 dígitos.
 * - Debe iniciar con '09'.
 */
export function validarTelefonoEstricto(telefono: string): { valido: boolean; mensaje?: string } {
  const limpio = formatearTelefono(telefono);
  if (!limpio) {
    return { valido: true }; // Si es opcional
  }
  if (limpio.length !== 10) {
    return { valido: false, mensaje: 'El teléfono celular debe tener exactamente 10 dígitos numéricos.' };
  }
  if (!limpio.startsWith('09')) {
    return { valido: false, mensaje: 'El teléfono celular debe comenzar con 09 (ej: 0991234567).' };
  }
  return { valido: true };
}

/**
 * Formatea una dirección:
 * - Primera letra en mayúscula y el resto en minúscula o formato título respetando números y caracteres especiales.
 * - Permite caracteres especiales (#, -, ., ,, /, °) y números.
 */
export function formatearDireccion(direccion: string): string {
  if (!direccion) return '';
  const limpia = direccion.trim();
  if (!limpia) return '';
  // Capitalizar la primera letra y mantener el resto preservando números y símbolos
  return limpia.charAt(0).toUpperCase() + limpia.slice(1);
}

/**
 * Normaliza el nombre comercial o de negocio para almacenamiento en base de datos:
 * - Convierte a minúsculas homogéneas para indexación y búsqueda.
 */
export function normalizarNombreNegocioBD(nombre: string): string {
  if (!nombre) return '';
  return nombre.toLowerCase().trim();
}

/**
 * Genera una sigla corta y discreta (2 a 3 letras mayúsculas) a partir del nombre o razón social del proveedor/taller.
 * Utilizada para identificación interna discreta de variantes de calzado (ej: JP para Juan Pérez, CC para Curtiduría Cevallos).
 */
export function generarSiglaProveedor(nombreOrazonSocial: string): string {
  if (!nombreOrazonSocial) return '';
  const limpia = nombreOrazonSocial
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
    .trim();
  if (!limpia) return '';

  const stopwords = new Set([
    'de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'en', 'sa', 'cia', 'cia.', 's.a.', 'ltda', 'sas', 'taller', 'calzado', 'calzados'
  ]);

  const palabras = limpia
    .split(/\s+/)
    .filter(p => Boolean(p) && !stopwords.has(p.toLowerCase()));

  if (palabras.length >= 2) {
    // Tomar la primera letra de las primeras 2 o 3 palabras significativas
    const sigla = palabras.slice(0, 3).map(p => p.charAt(0).toUpperCase()).join('');
    return sigla.slice(0, 3);
  } else if (palabras.length === 1) {
    // Si es una sola palabra, tomar las primeras 3 letras
    return palabras[0].slice(0, 3).toUpperCase();
  }

  // Fallback si todas eran stopwords (ej: "Taller Calzados")
  const todasPalabras = limpia.split(/\s+/).filter(Boolean);
  if (todasPalabras.length >= 2) {
    return todasPalabras.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
  }
  return limpia.slice(0, 2).toUpperCase();
}

/**
 * Genera un código base único de modelo a partir del nombre del calzado.
 * Regla: 3 letras mayúsculas derivadas del nombre + sufijo secuencial (ej: VHL-01, VHL-02, NKM-01).
 * Si existen códigos con ese prefijo, incrementa el número secuencial garantizando que sea único e irrepetible.
 */
export function generarCodigoBaseModelo(nombreCalzado: string, codigosExistentes: string[] = []): string {
  if (!nombreCalzado || !nombreCalzado.trim()) {
    return 'MOD-01';
  }

  const sinAcentos = nombreCalzado
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const soloLetras = sinAcentos.replace(/[^A-Z\s]/g, ' ').trim();
  if (!soloLetras) {
    return 'MOD-01';
  }

  const stopwords = new Set([
    'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'E', 'EN', 'CON', 'A', 'POR', 'PARA', 'CALZADO', 'ZAPATO', 'MODELO'
  ]);

  const palabras = soloLetras.split(/\s+/).filter(Boolean);
  const palabrasUtiles = palabras.filter(p => !stopwords.has(p));
  const fuente = palabrasUtiles.length > 0 ? palabrasUtiles : palabras;

  let prefijo = '';

  if (fuente.length >= 3) {
    prefijo = fuente.slice(0, 3).map(p => p.charAt(0)).join('');
  } else if (fuente.length === 2) {
    if (fuente[0].length >= 2) {
      prefijo = fuente[0].slice(0, 2) + fuente[1].charAt(0);
    } else {
      prefijo = fuente[0].charAt(0) + fuente[1].slice(0, 2);
    }
  } else if (fuente.length === 1) {
    prefijo = fuente[0].slice(0, 3);
  }

  if (prefijo.length < 3) {
    prefijo = prefijo.padEnd(3, 'X');
  }
  prefijo = prefijo.slice(0, 3).toUpperCase();

  const codigosUpper = codigosExistentes.map(c => (c || '').toUpperCase().trim());
  let maxSeq = 0;

  const regex = new RegExp(`^${prefijo}-(\\d+)$`);
  for (const cod of codigosUpper) {
    const match = cod.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    } else if (cod === prefijo) {
      if (maxSeq < 1) maxSeq = 1;
    }
  }

  const siguienteSeq = maxSeq + 1;
  const sufijo = String(siguienteSeq).padStart(2, '0');

  return `${prefijo}-${sufijo}`;
}

