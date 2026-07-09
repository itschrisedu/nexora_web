const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiService {
  private static getHeaders(isAuthPath = false) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && !isAuthPath ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async post(path: string, body: unknown) {
    const isAuth = path.startsWith('/auth/');
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(isAuth),
      body: JSON.stringify(body),
    });

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

    if (!res.ok) {
      throw new Error(`Error en la petición: ${res.status}`);
    }

    return res.json();
  }
}
