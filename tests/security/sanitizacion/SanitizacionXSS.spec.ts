import {
  formatearNombres,
  formatearApellidos,
  formatearTelefono,
  validarEmailEstricto,
} from '../../../src/utils/text-formatters';

describe('Seguridad Frontend — Sanitización de Entradas y Prevención de XSS / Inyecciones', () => {
  it('debe neutralizar y eliminar etiquetas script y caracteres HTML en campos de nombres y apellidos', () => {
    const maliciousScript = '<script> alert("XSS") </script> Juan Carlos';
    const cleanNombre = formatearNombres(maliciousScript);

    // Los caracteres especiales de código (<, >, ", ;) deben ser completamente eliminados
    expect(cleanNombre).not.toContain('<');
    expect(cleanNombre).not.toContain('>');
    expect(cleanNombre).not.toContain('"');
    expect(cleanNombre).toContain('Juan Carlos');
  });

  it('debe rechazar correos electrónicos con inyecciones de cabeceras SMTP o caracteres no permitidos', () => {
    const maliciousEmail = 'cliente%0d%0abcc:hacker@evil.com@gmail.com';
    const validation = validarEmailEstricto(maliciousEmail);

    expect(validation.valido).toBe(false);
    expect(validation.mensaje).toBeDefined();
  });

  it('debe limpiar números de teléfono permitiendo únicamente dígitos y bloqueando inyecciones SQL', () => {
    const maliciousPhone = '0991234567; DROP TABLE clientes; --';
    const cleanPhone = formatearTelefono(maliciousPhone);

    expect(cleanPhone).not.toContain('DROP');
    expect(cleanPhone).not.toContain('--');
    expect(cleanPhone).not.toContain(';');
    expect(cleanPhone).toBe('0991234567');
  });
});
