import {
  validarCedula,
  validarRuc,
  validarTelefonoCelular,
  normalizarTelefonoCelular,
  validarDocumentoEcuador,
} from '../../../src/utils/ecuador-validators';

describe('Validadores de Identidad Ecuatoriana (Módulo 10 y Módulo 11)', () => {
  describe('validarCedula', () => {
    it('debe validar cédulas ecuatorianas válidas de 10 dígitos', () => {
      // Cédula válida conocida (provincia 17 - Pichincha)
      expect(validarCedula('1710034065')).toBe(true);
      expect(validarCedula('1801234567')).toBe(false); // Algoritmo estricto
    });

    it('debe rechazar cédulas con longitud inválida o caracteres inválidos', () => {
      expect(validarCedula('')).toBe(false);
      expect(validarCedula('12345')).toBe(false);
      expect(validarCedula('171003406599')).toBe(false);
      expect(validarCedula('ABCDEFGHIJ')).toBe(false);
    });

    it('debe rechazar códigos de provincia fuera de rango (01-24, 30)', () => {
      expect(validarCedula('9910034065')).toBe(false);
      expect(validarCedula('0010034065')).toBe(false);
    });
  });

  describe('validarRuc', () => {
    it('debe validar RUC de Persona Natural (10 dígitos de cédula válida + 001)', () => {
      expect(validarRuc('1710034065001')).toBe(true);
      expect(validarRuc('1710034065002')).toBe(true);
      expect(validarRuc('1710034065000')).toBe(false); // Sucursal 000 no válida
    });

    it('debe rechazar RUC con longitud menor o mayor a 13 dígitos', () => {
      expect(validarRuc('1710034065')).toBe(false);
      expect(validarRuc('17100340650019')).toBe(false);
      expect(validarRuc('')).toBe(false);
    });
  });

  describe('validarTelefonoCelular y normalización', () => {
    it('debe validar números de teléfono móviles de Ecuador que inician en 09', () => {
      expect(validarTelefonoCelular('0991234567')).toBe(true);
      expect(validarTelefonoCelular('+593991234567')).toBe(true);
      expect(validarTelefonoCelular('593991234567')).toBe(true);
      expect(validarTelefonoCelular('12345')).toBe(false);
      expect(validarTelefonoCelular('0891234567')).toBe(false);
    });

    it('debe normalizar números internacionales a formato local 10 dígitos (09...)', () => {
      expect(normalizarTelefonoCelular('+593 99 123 4567')).toBe('0991234567');
      expect(normalizarTelefonoCelular('0991234567')).toBe('0991234567');
    });
  });

  describe('validarDocumentoEcuador', () => {
    it('debe validar integralmente cédula, ruc y pasaporte', () => {
      expect(validarDocumentoEcuador('CEDULA', '1710034065').valido).toBe(true);
      expect(validarDocumentoEcuador('CEDULA', '123').valido).toBe(false);
      expect(validarDocumentoEcuador('RUC', '1710034065001').valido).toBe(true);
      expect(validarDocumentoEcuador('PASAPORTE', 'A12345678').valido).toBe(true);
    });
  });
});
