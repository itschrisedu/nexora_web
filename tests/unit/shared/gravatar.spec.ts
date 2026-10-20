import { getGravatarUrl } from '../../../src/utils/gravatar';

describe('Gravatar — Generación de URL desde Email con MD5', () => {
  it('debe generar URL de gravatar valida para un email', () => {
    const url = getGravatarUrl('test@example.com');
    expect(url).not.toBeNull();
    expect(url).toContain('https://www.gravatar.com/avatar/');
    expect(url).toContain('?s=80');
    expect(url).toContain('&d=404');
  });

  it('debe generar hash consistente para el mismo email', () => {
    const url1 = getGravatarUrl('usuario@test.com');
    const url2 = getGravatarUrl('usuario@test.com');
    expect(url1).toBe(url2);
  });

  it('debe normalizar email a minusculas antes de generar hash', () => {
    const url1 = getGravatarUrl('Test@Example.COM');
    const url2 = getGravatarUrl('test@example.com');
    expect(url1).toBe(url2);
  });

  it('debe respetar el tamaño personalizado', () => {
    const url = getGravatarUrl('test@example.com', 200);
    expect(url).toContain('?s=200');
  });

  it('debe retornar null para email vacio o nulo', () => {
    expect(getGravatarUrl('')).toBeNull();
    expect(getGravatarUrl(undefined)).toBeNull();
    expect(getGravatarUrl('   ')).toBeNull();
  });

  it('debe generar hashes MD5 diferentes para emails diferentes', () => {
    const url1 = getGravatarUrl('admin@nexora.ec');
    const url2 = getGravatarUrl('ventas@nexora.ec');
    expect(url1).not.toBe(url2);
  });
});
