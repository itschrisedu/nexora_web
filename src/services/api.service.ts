const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Solo estas rutas son públicas (no necesitan Bearer token)
const PUBLIC_PATHS = ['/auth/login', '/auth/refresh'];

export class ApiService {
  private static getHeaders(isPublicPath = false) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && !isPublicPath ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private static handle401() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/'; // Redirigir al inicio/login
    }
  }

  static async post(path: string, body: unknown) {
    const isPublic = PUBLIC_PATHS.includes(path);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(isPublic),
      body: JSON.stringify(body),
    });

    if (res.status === 401 && !isPublic) {
      this.handle401();
      throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error en la petición: ${res.status}`);
    }

    return res.json();
  }

  static async get(path: string) {
    const isPublic = PUBLIC_PATHS.includes(path);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders(isPublic),
    });

    if (res.status === 401 && !isPublic) {
      this.handle401();
      throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error en la petición: ${res.status}`);
    }

    return res.json();
  }

  static async patch(path: string, body: unknown) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      this.handle401();
      throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error en la petición: ${res.status}`);
    }

    // Algunos endpoints PATCH devuelven 200 con cuerpo o 204 sin cuerpo
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  static async delete(path: string) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (res.status === 401) {
      this.handle401();
      throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error en la petición: ${res.status}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }
}
