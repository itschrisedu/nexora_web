const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiService {
  private static getHeaders(isAuthPath = false) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && !isAuthPath ? { Authorization: `Bearer ${token}` } : {}),
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
    const isAuth = path.startsWith('/auth/');
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(isAuth),
      body: JSON.stringify(body),
    });

    if (res.status === 401 && !isAuth) {
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
    const isAuth = path.startsWith('/auth/');
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders(isAuth),
    });

    if (res.status === 401 && !isAuth) {
      this.handle401();
      throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
    }

    if (!res.ok) {
      throw new Error(`Error en la petición: ${res.status}`);
    }

    return res.json();
  }
}

