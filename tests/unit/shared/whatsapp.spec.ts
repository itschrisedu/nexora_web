import {
  formatearNumeroWhatsApp,
  normalizarTelefonoEcuador,
} from '../../../src/utils/whatsapp';

describe('WhatsApp — Formateo y Normalización de Teléfonos Ecuador', () => {
  describe('formatearNumeroWhatsApp', () => {
    it('debe retornar vacío para valores nulos o indefinidos', () => {
      expect(formatearNumeroWhatsApp(null)).toBe('');
      expect(formatearNumeroWhatsApp(undefined)).toBe('');
      expect(formatearNumeroWhatsApp('')).toBe('');
    });

    it('debe convertir celular nacional con 0 inicial a formato internacional 593', () => {
      expect(formatearNumeroWhatsApp('0991234567')).toBe('593991234567');
    });

    it('debe convertir celular sin cero inicial a formato internacional 593', () => {
      expect(formatearNumeroWhatsApp('991234567')).toBe('593991234567');
    });

    it('debe mantener numero que ya tiene codigo 593 correcto', () => {
      expect(formatearNumeroWhatsApp('593991234567')).toBe('593991234567');
    });

    it('debe limpiar caracteres no numericos (guiones, espacios, parentesis)', () => {
      expect(formatearNumeroWhatsApp('099-123-4567')).toBe('593991234567');
      expect(formatearNumeroWhatsApp('(099) 123 4567')).toBe('593991234567');
      expect(formatearNumeroWhatsApp('+593 99 123 4567')).toBe('593991234567');
    });

    it('debe manejar telefono fijo nacional con 0 inicial', () => {
      expect(formatearNumeroWhatsApp('032740123')).toBe('59332740123');
    });

    it('debe manejar formato con doble cero internacional 00593', () => {
      expect(formatearNumeroWhatsApp('00593991234567')).toBe('593991234567');
    });

    it('debe manejar celular de 10 digitos con 0 inicial', () => {
      expect(formatearNumeroWhatsApp('0987654321')).toBe('593987654321');
    });
  });

  describe('normalizarTelefonoEcuador', () => {
    it('debe retornar vacío para valores nulos', () => {
      expect(normalizarTelefonoEcuador(null)).toBe('');
      expect(normalizarTelefonoEcuador(undefined)).toBe('');
    });

    it('debe convertir formato internacional 593 a formato nacional con 0', () => {
      expect(normalizarTelefonoEcuador('593991234567')).toBe('0991234567');
    });

    it('debe agregar 0 inicial a celular de 9 digitos que empieza con 9', () => {
      expect(normalizarTelefonoEcuador('991234567')).toBe('0991234567');
    });

    it('debe retornar el numero limpio si no coincide con patrones conocidos', () => {
      expect(normalizarTelefonoEcuador('12345')).toBe('12345');
    });
  });
});
