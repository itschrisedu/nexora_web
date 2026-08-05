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
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/'; // Redirigir al inicio/login
    }
  }

  private static async tryRefreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          localStorage.setItem('token', data.accessToken);
          return true;
        }
      }
    } catch (e) {
      console.warn('Error intentando refrescar token:', e);
    }
    return false;
  }

  static async post(path: string, body: unknown): Promise<any> {
    const isPublic = PUBLIC_PATHS.includes(path);
    let res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(isPublic),
      body: JSON.stringify(body),
    });

    if (res.status === 401 && !isPublic) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        res = await fetch(`${API_BASE_URL}${path}`, {
          method: 'POST',
          headers: this.getHeaders(isPublic),
          body: JSON.stringify(body),
        });
      } else {
        this.handle401();
        throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error en la petición: ${res.status}`);
    }

    return res.json();
  }

  static async get(path: string): Promise<any> {
    const isPublic = PUBLIC_PATHS.includes(path);
    let res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders(isPublic),
    });

    if (res.status === 401 && !isPublic) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        res = await fetch(`${API_BASE_URL}${path}`, {
          method: 'GET',
          headers: this.getHeaders(isPublic),
        });
      } else {
        this.handle401();
        throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error en la petición: ${res.status}`);
    }

    return res.json();
  }

  static async patch(path: string, body: unknown): Promise<any> {
    let res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        res = await fetch(`${API_BASE_URL}${path}`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        this.handle401();
        throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error en la petición: ${res.status}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  static async delete(path: string, body?: unknown): Promise<any> {
    let res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (res.status === 401) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        res = await fetch(`${API_BASE_URL}${path}`, {
          method: 'DELETE',
          headers: this.getHeaders(),
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
      } else {
        this.handle401();
        throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error en la petición: ${res.status}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  static async put(path: string, body: unknown): Promise<any> {
    let res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        res = await fetch(`${API_BASE_URL}${path}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        this.handle401();
        throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error en la petición: ${res.status}`);
    }

    return res.json();
  }

  static async postFormData(path: string, formData: FormData): Promise<any> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (res.status === 401) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem('token');
        if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${API_BASE_URL}${path}`, {
          method: 'POST',
          headers,
          body: formData,
        });
      } else {
        this.handle401();
        throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || `Error en la petición: ${res.status}`);
    }

    return res.json();
  }
}
