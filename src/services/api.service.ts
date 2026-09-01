const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Solo estas rutas son públicas (no necesitan Bearer token)
const PUBLIC_PATHS = ['/auth/login', '/auth/refresh'];

/**
 * Traduce errores HTTP y de red a mensajes amigables para usuarios finales.
 * Los usuarios no son técnicos: nunca deben ver códigos de estado ni errores de fetch crudos.
 */
function mensajeAmigable(status: number | null, serverMessage?: string): string {
  // Si el backend ya envía un mensaje claro, usarlo
  if (serverMessage && !serverMessage.includes('fetch') && !serverMessage.includes('Error en la petición') && !serverMessage.includes('Internal') && serverMessage.length > 5) {
    return serverMessage;
  }

  if (!status) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.';
  }

  switch (status) {
    case 400: return serverMessage || 'Los datos enviados no son correctos. Revisa la información e intenta de nuevo.';
    case 401: return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    case 403: return 'No tienes permisos para realizar esta acción. Contacta al administrador.';
    case 404: return 'El recurso solicitado no fue encontrado. Es posible que haya sido eliminado o movido.';
    case 409: return serverMessage || 'Ya existe un registro con esa información. Verifica los datos ingresados.';
    case 422: return serverMessage || 'Algunos datos ingresados no son válidos. Revisa el formulario e intenta de nuevo.';
    case 429: return 'Demasiadas solicitudes. Espera un momento antes de intentar de nuevo.';
    case 500: return 'Ocurrió un error interno en el servidor. Intenta de nuevo en unos minutos.';
    case 502:
    case 503:
    case 504: return 'El servidor no está disponible temporalmente. Intenta de nuevo en unos minutos.';
    default: return serverMessage || 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
  }
}

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
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: this.getHeaders(isPublic),
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error(mensajeAmigable(null));
    }

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
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: '' }));
      throw new Error(mensajeAmigable(res.status, errorData.message));
    }

    return res.json();
  }

  static async get(path: string): Promise<any> {
    const isPublic = PUBLIC_PATHS.includes(path);
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'GET',
        headers: this.getHeaders(isPublic),
      });
    } catch {
      throw new Error(mensajeAmigable(null));
    }

    if (res.status === 401 && !isPublic) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        res = await fetch(`${API_BASE_URL}${path}`, {
          method: 'GET',
          headers: this.getHeaders(isPublic),
        });
      } else {
        this.handle401();
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: '' }));
      throw new Error(mensajeAmigable(res.status, errorData.message));
    }

    return res.json();
  }

  static async patch(path: string, body: unknown): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error(mensajeAmigable(null));
    }

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
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: '' }));
      throw new Error(mensajeAmigable(res.status, errorData.message));
    }

    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  static async delete(path: string, body?: unknown): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new Error(mensajeAmigable(null));
    }

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
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: '' }));
      throw new Error(mensajeAmigable(res.status, errorData.message));
    }

    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  static async put(path: string, body: unknown): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error(mensajeAmigable(null));
    }

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
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: '' }));
      throw new Error(mensajeAmigable(res.status, errorData.message));
    }

    return res.json();
  }

  static async postFormData(path: string, formData: FormData): Promise<any> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch {
      throw new Error(mensajeAmigable(null));
    }

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
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: '' }));
      throw new Error(mensajeAmigable(res.status, errorData.message));
    }

    return res.json();
  }
}
