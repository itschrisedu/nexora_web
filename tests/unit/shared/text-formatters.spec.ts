import {
  capitalizarPalabra,
  formatearNombres,
  dividirNombres,
  generarCodigoBaseModelo,
  formatearTelefono,
  validarEmailEstricto,
} from '../../../src/utils/text-formatters';

describe('Normalizadores y Formateadores de Texto', () => {
  describe('capitalizarPalabra', () => {
    it('debe capitalizar correctamente palabras simples y con tildes', () => {
      expect(capitalizarPalabra('carlos')).toBe('Carlos');
      expect(capitalizarPalabra('ÁNGEL')).toBe('Ángel');
      expect(capitalizarPalabra('ñandú')).toBe('Ñandú');
      expect(capitalizarPalabra('')).toBe('');
    });
  });

  describe('formatearNombres', () => {
    it('debe limpiar números y caracteres especiales convirtiendo a Capital Case', () => {
      expect(formatearNombres('juan123 pablo!!')).toBe('Juan Pablo');
      expect(formatearNombres('maría   elena')).toBe('María Elena');
    });

    it('debe respetar el límite máximo de palabras si se especifica', () => {
      expect(formatearNombres('juan pablo segundo de jesus', 2)).toBe('Juan Pablo');
    });
  });

  describe('dividirNombres', () => {
    it('debe segmentar nombres en primerNombre, segundoNombre y lista', () => {
      const res = dividirNombres('Christopher Eduardo');
      expect(res.primerNombre).toBe('Christopher');
      expect(res.segundoNombre).toBe('Eduardo');
      expect(res.lista.length).toBe(2);
    });
  });

  describe('generarCodigoBaseModelo', () => {
    it('debe generar código con 3 letras iniciales y sufijo -01 para nombres de varias palabras', () => {
      const code = generarCodigoBaseModelo('Valentina Hermosa Lucero');
      expect(code).toBe('VHL-01');
    });

    it('debe omitir stopwords y extraer 3 letras mayúsculas', () => {
      const code = generarCodigoBaseModelo('Botín de Hombre Londres');
      expect(code).toBe('BHL-01');
    });

    it('debe generar código para nombres de 2 palabras', () => {
      const code = generarCodigoBaseModelo('Air Max');
      expect(code).toBe('AIM-01');
    });

    it('debe generar código para nombres de 1 sola palabra', () => {
      const code = generarCodigoBaseModelo('Valentina');
      expect(code).toBe('VAL-01');
    });

    it('debe incrementar el secuencial si ya existe un modelo con las mismas siglas (VHL-01 -> VHL-02)', () => {
      const existing = ['VHL-01', 'BHL-01'];
      const nextCode = generarCodigoBaseModelo('Valentina Hermosa Lucero', existing);
      expect(nextCode).toBe('VHL-02');

      const thirdCode = generarCodigoBaseModelo('Valentina Hermosa Lucero', ['VHL-01', 'VHL-02']);
      expect(thirdCode).toBe('VHL-03');
    });

    it('debe manejar fallback ante nombres vacíos o especiales', () => {
      expect(generarCodigoBaseModelo('')).toBe('MOD-01');
      expect(generarCodigoBaseModelo('12345')).toBe('MOD-01');
    });
  });

  describe('formatearTelefono', () => {
    it('debe formatear teléfonos celulares ecuatorianos adecuadamente sin borrar números', () => {
      expect(formatearTelefono('0987654321')).toBe('0987654321');
      expect(formatearTelefono('+593 98 765 4321')).toBe('0987654321');
    });
  });

  describe('validarEmailEstricto', () => {
    it('debe validar correos válidos y permitir vacío cuando es opcional', () => {
      expect(validarEmailEstricto('proveedor@taller.com').valido).toBe(true);
      expect(validarEmailEstricto('').valido).toBe(true);
      expect(validarEmailEstricto('invalido-sin-arroba').valido).toBe(false);
    });
  });
});
