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
 * Formatea una cadena de nombres permitiendo hasta `maxPalabras` (por defecto 3).
 * - Elimina números y caracteres especiales (solo letras y espacios).
 * - Convierte cada nombre a formato Capital Case (Primera letra mayúscula, resto minúsculas).
 * - Permite 1, 2 o hasta `maxPalabras` nombres sin obligar a ingresar todos.
 */
export function formatearNombres(valor: string, maxPalabras: number = 3): string {
  if (!valor) return '';
  // Filtrar caracteres no permitidos (solo letras en español y espacios)
  const soloLetras = valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
  // Dividir por espacios y descartar vacíos
  const palabras = soloLetras.split(/\s+/).filter(Boolean);
  // Limitar al número máximo de palabras permitidas
  const palabrasPermitidas = palabras.slice(0, maxPalabras);
  // Capitalizar cada palabra
  const formateadas = palabrasPermitidas.map(capitalizarPalabra);
  
  // Si el usuario termina escribiendo un espacio al final, preservarlo para no trabar la escritura
  const terminaEnEspacio = valor.endsWith(' ') && palabras.length < maxPalabras;
  return formateadas.join(' ') + (terminaEnEspacio ? ' ' : '');
}

/**
 * Formatea una cadena de apellidos permitiendo hasta 2 apellidos.
 * - Elimina números y caracteres especiales.
 * - Formatea cada apellido a Capital Case.
 * - Permite 1 o 2 apellidos.
 */
export function formatearApellidos(valor: string): string {
  return formatearNombres(valor, 2);
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
 * - Elimina espacios y caracteres de control.
 */
export function formatearEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase().replace(/\s+/g, '').trim();
}

/**
 * Valida un correo electrónico con reglas estrictas:
 * - Debe tener exactamente un solo símbolo '@'.
 * - Debe tener un dominio válido con punto posterior.
 */
export function validarEmailEstricto(email: string): { valido: boolean; mensaje?: string } {
  const limpio = formatearEmail(email);
  if (!limpio) {
    return { valido: true }; // Opcional si está vacío
  }
  
  const arrobas = (limpio.match(/@/g) || []).length;
  if (arrobas === 0) {
    return { valido: false, mensaje: 'El correo electrónico debe incluir el símbolo "@".' };
  }
  if (arrobas > 1) {
    return { valido: false, mensaje: 'El correo electrónico solo puede contener un único símbolo "@".' };
  }

  const partes = limpio.split('@');
  const usuario = partes[0];
  const dominio = partes[1];

  if (!usuario || !dominio) {
    return { valido: false, mensaje: 'El formato del correo es incompleto (ej: usuario@empresa.com).' };
  }

  if (!dominio.includes('.') || dominio.startsWith('.') || dominio.endsWith('.')) {
    return { valido: false, mensaje: 'El dominio del correo electrónico debe incluir una extensión válida (ej: .com, .ec).' };
  }

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(limpio)) {
    return { valido: false, mensaje: 'El correo electrónico contiene caracteres no válidos.' };
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
  return telefono.replace(/\D/g, '').slice(0, 10);
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

