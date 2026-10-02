const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl.replace(/\/+$/, '')}/api`;

// Solo estas rutas son públicas (no necesitan Bearer token)
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/request-session-otp',
  '/auth/verify-session-otp',
  '/auth/request-unlock-otp',
  '/auth/verify-unlock-otp',
  '/auth/recuperar-contrasena',
  '/auth/reset-contrasena',
];

/**
 * Traduce errores HTTP y de validación a mensajes específicos y amigables en español.
 */
function mensajeAmigable(status: number | null, serverMessage?: any): string {
  // Si el mensaje es un array (errores de validación de NestJS / class-validator)
  if (Array.isArray(serverMessage)) {
    const traducciones: Record<string, string> = {
      'nombre should not be empty': 'El nombre comercial o corporativo es obligatorio.',
      'ruc should not be empty': 'El número de RUC es obligatorio.',
      'direccion should not be empty': 'La dirección del establecimiento es obligatoria.',
      'duracionSesionHoras must be an integer number': 'La duración de la sesión debe ser un número entero de horas.',
      'duracionSesionHoras must not be less than': 'La duración mínima de sesión es de 1 hora.',
      'creditScoreMinimo must be a number': 'El score mínimo de crédito debe ser un número válido.',
      'precioPlanBasico must be a number': 'El precio del plan básico debe ser un valor numérico.',
    };

    const mensajesTraducidos = serverMessage.map((m: string) => {
      for (const [key, val] of Object.entries(traducciones)) {
        if (m.includes(key)) return val;
      }
      // Traducir patrones comunes
      if (m.includes('should not be empty')) {
        const campo = m.replace(' should not be empty', '');
        return `El campo "${campo}" no puede estar vacío.`;
      }
      if (m.includes('must be an integer number')) {
        const campo = m.replace(' must be an integer number', '');
        return `El campo "${campo}" debe ser un número entero.`;
      }
      if (m.includes('must be a string')) {
        const campo = m.replace(' must be a string', '');
        return `El campo "${campo}" debe ser texto válido.`;
      }
      return m;
    });

    return mensajesTraducidos.join(' • ');
  }

  const msgStr = typeof serverMessage === 'string' ? serverMessage : '';

  // Si el backend ya envía un mensaje claro en español, usarlo
  if (msgStr && !msgStr.includes('fetch') && !msgStr.includes('Error en la petición') && !msgStr.includes('Internal') && msgStr.length > 5) {
    return msgStr;
  }

  if (!status) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.';
  }

  switch (status) {
    case 400: return msgStr || 'Los datos enviados no son válidos o están incompletos. Revisa los campos e intenta de nuevo.';
    case 401: return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    case 403: return 'No tienes permisos suficientes para realizar esta acción. Contacta al administrador.';
    case 404: return 'El registro o recurso solicitado no fue encontrado.';
    case 409: return msgStr || 'Ya existe un registro con esa información. Verifica los datos ingresados.';
    case 422: return msgStr || 'Algunos datos ingresados no son válidos. Revisa el formulario e intenta de nuevo.';
    case 429: return 'Demasiadas solicitudes en poco tiempo. Espera un momento antes de reintentar.';
    case 500: return 'Ocurrió un error en el servidor al procesar la solicitud. Intenta de nuevo en unos minutos.';
    case 502:
    case 503:
    case 504: return 'El servidor no está disponible temporalmente. Intenta de nuevo en unos minutos.';
    default: return msgStr || 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
  }
}

export class ApiService {
  private static getHeaders(isPublicPath = false) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const activeSucursalId = typeof window !== 'undefined' ? localStorage.getItem('activeSucursalId') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && !isPublicPath ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeSucursalId ? { 'x-sucursal-id': activeSucursalId } : {}),
    };
  }

  private static handle401() {
    if (typeof window !== 'undefined') {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      // Si está offline, NUNCA borrar la sesión ni redirigir al login;
      // esto permite seguir navegando con los datos locales guardados en IndexedDB y caché.
      if (!isOnline) {
        console.warn('📡 Modo Offline: Se conserva la sesión para operar localmente.');
        return;
      }
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
        body: JSON.stringify({ refreshToken, token: refreshToken }),
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
