"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { SyncService } from '@/services/sync.service';
import { ApiService } from '@/services/api.service';
import { Building2, Store, BrainCircuit, ShieldCheck } from 'lucide-react';
import { db } from '@/db/local-db';
import {
  Wifi,
  WifiOff,
  Database,
  Users,
  TrendingUp,
  AlertTriangle,
  TrendingDown,
  User,
  Lock,
  LogOut,
  ShoppingBag,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  RefreshCw,
  Package,
  CreditCard,
  Truck,
  DollarSign,
  LayoutDashboard,
  Eye,
  EyeOff,
  FileText,
  Palette,
  Loader2,
  MapPin,
  Settings,
} from 'lucide-react';
import { GeolocationService } from '@/services/geolocation.service';
import { ToastProvider } from '@/components/ui/toast';

// Importaciones dinámicas para evitar SSR con Dexie
const InventarioComponent = dynamic(() => import('@/components/inventario'), { ssr: false });
const ClientesComponent = dynamic(() => import('@/components/clientes'), { ssr: false });
const ComercialComponent = dynamic(() => import('@/components/comercial'), { ssr: false });
const FinancieroComponent = dynamic(() => import('@/components/financiero'), { ssr: false });
const ProveedoresComponent = dynamic(() => import('@/components/proveedores'), { ssr: false });
const UsuariosComponent = dynamic(() => import('@/components/usuarios'), { ssr: false });
const ModelosComponent = dynamic(() => import('@/components/modelos'), { ssr: false });
const SuperAdminComponent = dynamic(() => import('@/components/super-admin'), { ssr: false });
const SriComponent = dynamic(() => import('@/components/sri'), { ssr: false });
const CatalogoDigitalComponent = dynamic(() => import('@/components/catalogo-digital'), { ssr: false });
const PosComponent = dynamic(() => import('@/components/pos'), { ssr: false });
const PrediccionDemandaComponent = dynamic(() => import('@/components/prediccion-demanda'), { ssr: false });
const AuditoriaComponent = dynamic(() => import('@/components/auditoria'), { ssr: false });
const PersonalizacionComponent = dynamic(() => import('@/components/personalizacion'), { ssr: false });
const UbicacionesComponent = dynamic(() => import('@/components/ubicaciones'), { ssr: false });

type Vista = 'dashboard' | 'inventario' | 'modelos' | 'clientes' | 'comercial' | 'financiero' | 'proveedores' | 'usuarios' | 'super-admin' | 'sri' | 'personalizacion' | 'catalogo' | 'pos' | 'prediccion-ml' | 'auditoria' | 'ubicaciones';

interface NavItem {
  id: Vista;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',       label: 'Dashboard',            icon: <LayoutDashboard size={18} /> },
  { id: 'super-admin',     label: 'Gestión de Empresas',  icon: <Building2 size={18} /> },
  { id: 'ubicaciones',     label: 'Rastreo GPS Personal', icon: <MapPin size={18} /> },
  { id: 'sri',             label: 'Facturación SRI',       icon: <FileText size={18} /> },
  { id: 'catalogo',     label: 'Catálogo WhatsApp',    icon: <ShoppingBag size={18} /> },
  { id: 'pos',           label: 'POS Mostrador',        icon: <Store size={18} /> },
  { id: 'prediccion-ml', label: 'Predicción ML Demanda', icon: <BrainCircuit size={18} /> },
  { id: 'auditoria',     label: 'Auditoría & Seguridad', icon: <ShieldCheck size={18} /> },
  { id: 'inventario',   label: 'Inventario',            icon: <ShoppingBag size={18} /> },
  { id: 'modelos',      label: 'Catálogo de Modelos',   icon: <Package size={18} /> },
  { id: 'clientes',     label: 'Clientes & Crédito',   icon: <Users size={18} /> },
  { id: 'comercial',    label: 'Pedidos',               icon: <CreditCard size={18} /> },
  { id: 'financiero',   label: 'Cobros & Finanzas',    icon: <DollarSign size={18} /> },
  { id: 'proveedores',  label: 'Proveedores',           icon: <Truck size={18} /> },
  { id: 'usuarios',     label: 'Sucursales & Personal', icon: <Store size={18} /> },
];

function MainApp() {
  const [online, setOnline] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard');
  const [user, setUser] = useState<any>(null);

  const [stats, setStats] = useState({
    totalSales: 0,
    activeClients: 0,
    lowStockCount: 0,
    pendingSyncCount: 0,
  });

  useEffect(() => {
    setOnline(SyncService.isOnline());
    SyncService.init((isOnline) => setOnline(isOnline));

    const savedTheme = localStorage.getItem('nexora-theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme ?? (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    if (initialTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token) { 
      setIsLoggedIn(true); 
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      fetchStats();
      fetchBusinessBranding();
      GeolocationService.captureAndReportLocation();
    }
  }, []);

  const [businessLogo, setBusinessLogo] = useState<string>('');

  const fetchBusinessBranding = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.rol === 'ROL_SUPER_ADMIN') return;
      }
      const config = await ApiService.get('/configuracion/negocio');
      if (config) {
        if (config.logoUrl) setBusinessLogo(config.logoUrl);
        if (config.primaryColor && typeof document !== 'undefined') {
          const lowerColor = config.primaryColor.toLowerCase();
          const isPurple = lowerColor.includes('6366f1') || 
                           lowerColor.includes('8b5cf6') || 
                           lowerColor.includes('7c3aed') || 
                           lowerColor.includes('violet') || 
                           lowerColor.includes('purple');
          const finalColor = isPurple ? '#0F172A' : config.primaryColor;
          document.documentElement.style.setProperty('--primary', finalColor);
        }
      }
    } catch (err) {}
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('nexora-theme', next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      if (online) {
        const response = await ApiService.post('/auth/login', { email: username.trim(), password: password.trim() });
        localStorage.setItem('token', response.accessToken);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
      } else {
        let mockUser;
        if (username.trim() === 'superadmin@nexora.com' && password.trim() === 'SuperAdmin2026!') {
          mockUser = { id: 'offline-superadmin', email: 'superadmin@nexora.com', nombre: 'Super Administrador Global', rol: 'ROL_SUPER_ADMIN' };
        } else if (username.trim() === 'admin@nexora.com' && password.trim() === 'Admin123!') {
          mockUser = { id: 'offline-admin', email: 'admin@nexora.com', nombre: 'Administrador Local', rol: 'ROL_ADMIN' };
        } else {
          throw new Error('Modo Offline: use superadmin@nexora.com / SuperAdmin2026! o admin@nexora.com / Admin123!');
        }
        localStorage.setItem('token', 'offline-token-mock');
        localStorage.setItem('user', JSON.stringify(mockUser));
        setUser(mockUser);
      }
      setIsLoggedIn(true);
      fetchStats();
      fetchBusinessBranding();
    } catch (err: any) {
      setLoginError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
    setVistaActual('dashboard');
  };

  const fetchStats = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.rol === 'ROL_SUPER_ADMIN') {
          setStats({ totalSales: 0, activeClients: 0, lowStockCount: 0, pendingSyncCount: 0 });
          return;
        }
      }

      const pendingOrders = await db.pedidosOffline.count();
      const pendingMovements = await db.movimientosOffline.count();
      
      let realSales = 0;
      let realClients = 0;
      let realLowStock = 0;

      if (navigator.onLine) {
        try {
          const [resumen, clientes, productos] = await Promise.all([
            ApiService.get('/financiero/resumen').catch(() => ({ totalFacturado: 0 })),
            ApiService.get('/clientes').catch(() => []),
            ApiService.get('/inventario/productos').catch(() => []),
          ]);

          realSales = resumen.totalFacturado || 0;
          realClients = Array.isArray(clientes) ? clientes.length : 0;
          
          if (Array.isArray(productos)) {
            // Contar productos donde la suma de stock de todas sus tallas sea menor a 15
            realLowStock = productos.filter((p: any) => {
              const totalStock = Array.isArray(p.tallas) 
                ? p.tallas.reduce((sum: number, t: any) => sum + (t.stock || 0), 0)
                : 0;
              return totalStock < 15;
            }).length;
          }
        } catch (apiErr) {
          console.warn('Error al obtener estadísticas del servidor:', apiErr);
        }
      }

      setStats({
        totalSales: realSales,
        activeClients: realClients,
        lowStockCount: realLowStock,
        pendingSyncCount: pendingOrders + pendingMovements,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncManual = async () => {
    if (!online) return;
    setLoading(true);
    await SyncService.syncPendingData();
    await fetchStats();
    setLoading(false);
  };

  // ══════════════════════════════════════════
  // PANTALLA LOGIN
  // ══════════════════════════════════════════
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 relative overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold glass text-white shadow-lg">
          {online
            ? <><Wifi size={14} className="text-emerald-400 animate-pulse" /><span>Online</span></>
            : <><WifiOff size={14} className="text-rose-400 animate-bounce" /><span>Offline</span></>}
        </div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-amber-300 bg-clip-text text-transparent">
              NEXORA
            </h1>
            <p className="text-xs text-slate-400 mt-2">Sistema integral de gestión para negocios de calzado</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Usuario</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><User size={16} /></span>
                <input type="text" required placeholder="Ingrese su usuario" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><Lock size={16} /></span>
                <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/50 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" /><span>{loginError}</span>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white font-semibold text-sm rounded-lg shadow-lg hover:shadow-amber-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-amber-500/20">
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
          <div className="mt-6 text-center text-[10px] text-slate-500">
            {online ? 'Conectado al servidor' : 'Sin conexión: use admin@nexora.com / Admin123!'}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // SHELL PRINCIPAL: Sidebar + Vista Activa
  // ══════════════════════════════════════════
  return (
    <div className="h-screen max-h-screen w-full flex overflow-hidden bg-[var(--background)] text-[var(--foreground)]">

      {/* ─── SIDEBAR ─── */}
      <aside className="w-64 h-full max-h-screen border-r border-[var(--border)] bg-[var(--card)] flex flex-col justify-between shrink-0 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Logo + Toggle tema (Fijo arriba) */}
          <div className="shrink-0 p-6 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {businessLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={businessLogo} alt="Logo" className="w-7 h-7 object-contain rounded-lg" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#0F172A] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {businessLogo ? <img src={businessLogo} alt="Logo" className="w-full h-full object-cover rounded-lg" /> : "N"}
                </div>
              )}
              <span className="text-xl font-black tracking-widest text-[#0F172A]">NEXORA</span>
            </div>
            <button onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--muted)] hover:opacity-80 transition-opacity">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Navegación (Scroll vertical independiente únicamente en el área de items) */}
          <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
              Módulos Operativos
            </div>
            {NAV_ITEMS.filter((item) => {
              if (!user) return item.id !== 'super-admin';
              if (user.rol === 'ROL_SUPER_ADMIN') {
                return ['dashboard', 'super-admin', 'auditoria', 'ubicaciones'].includes(item.id);
              }
              if (user.rol === 'ROL_ADMIN') return item.id !== 'super-admin'; // Admin ve todo excepto gestión de tenants
              if (user.rol === 'ROL_VENDEDOR') {
                return !['proveedores', 'usuarios', 'modelos', 'super-admin', 'personalizacion', 'sri', 'ubicaciones'].includes(item.id);
              }
              if (user.rol === 'ROL_BODEGUERO') {
                return !['clientes', 'financiero', 'usuarios', 'modelos', 'super-admin', 'personalizacion', 'sri', 'ubicaciones'].includes(item.id);
              }
              return !['modelos', 'super-admin'].includes(item.id); // Por defecto ocultar modelos y super-admin
            }).map((item) => (
              <button
                key={item.id}
                onClick={() => setVistaActual(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  vistaActual === item.id
                    ? 'bg-[#0F172A]/10 text-[#0F172A] font-semibold'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <div className="flex items-center gap-3">{item.icon}<span>{item.label}</span></div>
                {vistaActual !== item.id && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>
        </div>

        {/* Usuario (Fijo abajo) */}
        <div className="shrink-0 p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--muted)]/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
              {user?.nombre ? user.nombre.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div>
              <div className="text-xs font-semibold truncate max-w-[100px]">{user?.nombre || 'Usuario'}</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">
                {user?.rol === 'ROL_SUPER_ADMIN' ? 'Super Admin' : user?.rol === 'ROL_ADMIN' ? 'Administrador' : user?.rol === 'ROL_VENDEDOR' ? 'Vendedor' : user?.rol === 'ROL_BODEGUERO' ? 'Bodeguero' : 'Desconocido'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(user?.rol === 'ROL_ADMIN' || user?.rol === 'ROL_SUPER_ADMIN') && (
              <button
                onClick={() => setVistaActual('personalizacion')}
                className={`p-1.5 rounded-lg transition-colors ${
                  vistaActual === 'personalizacion'
                    ? 'bg-[#0F172A] text-amber-400'
                    : 'text-[var(--muted-foreground)] hover:text-[#0F172A] hover:bg-[var(--muted)]'
                }`}
                title="Configuración Global ⚙️"
              >
                <Settings size={16} />
              </button>
            )}
            <button onClick={handleLogout} className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <main className="flex-1 flex flex-col h-full max-h-screen overflow-hidden min-w-0">

        {/* Navbar superior (Fijo arriba) */}
        <header className="h-16 shrink-0 border-b border-[var(--border)] bg-white dark:bg-slate-900 px-8 flex items-center justify-between z-30 shadow-sm">
          <h1 className="text-xl font-black text-[#0F172A] dark:text-white tracking-tight">
            {NAV_ITEMS.find((n) => n.id === vistaActual)?.label ?? 'Panel de Control'}
          </h1>
          <div className="flex items-center gap-4">
            {online
              ? <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Wifi size={13} className="animate-pulse" /><span>Online</span></div>
              : <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400"><WifiOff size={13} className="animate-bounce" /><span>Offline</span></div>
            }
            {stats.pendingSyncCount > 0 && (
              <button onClick={handleSyncManual} disabled={loading}
                className="flex items-center gap-2 px-3 py-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 text-xs font-semibold transition-all disabled:opacity-50">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span>Sincronizar ({stats.pendingSyncCount})</span>
              </button>
            )}
            <button className="p-2 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1 right-1.5 w-2 h-2 bg-[#0F172A] rounded-full" />
            </button>
          </div>
        </header>

        {/* ─── VISTA ACTIVA (Scroll vertical independiente únicamente en el contenido) ─── */}
        <section className="flex-1 min-h-0 overflow-y-auto p-8 space-y-8">
          {/* Alerta de datos offline pendientes */}
          {stats.pendingSyncCount > 0 && (
            <div className="p-4 border border-yellow-500/20 bg-yellow-500/5 text-yellow-600 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="shrink-0" />
                <div>
                  <div className="text-sm font-bold">Datos pendientes de sincronizar</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Transacciones guardadas offline. Conéctate a internet para subirlos.</div>
                </div>
              </div>
              {online && (
                <button onClick={handleSyncManual} className="px-4 py-2 bg-yellow-500 text-slate-900 rounded-lg text-xs font-bold hover:opacity-90">
                  Sincronizar Ahora
                </button>
              )}
            </div>
          )}

          {/* Renderizado condicional de vistas */}
          {vistaActual === 'dashboard' && (
            user?.rol === 'ROL_SUPER_ADMIN' ? (
              <SuperAdminDashboard online={online} onNavigateToTenants={() => setVistaActual('super-admin')} />
            ) : (
              <DashboardView stats={stats} />
            )
          )}
          {vistaActual === 'inventario' && <InventarioComponent online={online} userRole={user?.rol} />}
          {vistaActual === 'modelos' && <ModelosComponent online={online} />}
          {vistaActual === 'clientes' && <ClientesComponent online={online} />}
          {vistaActual === 'comercial' && <ComercialComponent online={online} userRole={user?.rol} userPermissions={user} />}
          {vistaActual === 'financiero' && <FinancieroComponent online={online} />}
          {vistaActual === 'proveedores' && <ProveedoresComponent online={online} userRole={user?.rol} />}
          {vistaActual === 'usuarios' && <UsuariosComponent online={online} />}
          {vistaActual === 'super-admin' && <SuperAdminComponent online={online} />}
          {vistaActual === 'sri' && <SriComponent />}
          {vistaActual === 'personalizacion' && <PersonalizacionComponent online={online} />}
          {vistaActual === 'catalogo' && <CatalogoDigitalComponent />}
          {vistaActual === 'pos' && <PosComponent />}
          {vistaActual === 'prediccion-ml' && <PrediccionDemandaComponent />}
          {vistaActual === 'auditoria' && <AuditoriaComponent />}
          {vistaActual === 'ubicaciones' && <UbicacionesComponent online={online} />}
        </section>
      </main>
    </div>
  );
}

// ─── Super Admin Global Dashboard ──────────────────────────────
function SuperAdminDashboard({ online, onNavigateToTenants }: { online: boolean; onNavigateToTenants: () => void }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!online) {
      setLoading(false);
      return;
    }
    ApiService.get('/tenants')
      .then((data) => {
        if (Array.isArray(data)) setTenants(data);
      })
      .catch((err) => console.error('Error cargando tenants para dashboard:', err))
      .finally(() => setLoading(false));
  }, [online]);

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.active).length;
  const totalUsers = tenants.reduce((sum, t) => sum + (t.stats?.users || 0), 0);
  const totalModels = tenants.reduce((sum, t) => sum + (t.stats?.models || 0), 0);
  const totalOrders = tenants.reduce((sum, t) => sum + (t.stats?.orders || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 rounded-3xl border border-slate-700/80 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Gobernanza Multitenant
              </span>
              <span className="text-xs text-slate-400">Panel Central de Control</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Super Administrador Global</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Supervisión de sucursales, administración centralizada de administradores y gobernanza general de la plataforma NEXORA.
            </p>
          </div>
          <button
            onClick={onNavigateToTenants}
            className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg hover:shadow-amber-500/20 shrink-0"
          >
            <Building2 size={16} />
            <span>Gestionar Sucursales / Tenants</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Sucursales / Tenants"
          value={loading ? '...' : String(totalTenants)}
          subtitle={loading ? 'Cargando...' : `${activeTenants} activas • ${totalTenants - activeTenants} inactivas`}
          subtitleColor="text-emerald-500"
          icon={<Building2 size={16} />}
          iconBg="bg-blue-500/10 text-blue-500"
        />
        <KpiCard
          title="Personal Registrado"
          value={loading ? '...' : String(totalUsers)}
          subtitle="En todas las sucursales"
          icon={<Users size={16} />}
          iconBg="bg-amber-500/10 text-amber-500"
        />
        <KpiCard
          title="Modelos de Calzado"
          value={loading ? '...' : String(totalModels)}
          subtitle="Catálogos combinados"
          icon={<Package size={16} />}
          iconBg="bg-emerald-500/10 text-emerald-500"
        />
        <KpiCard
          title="Pedidos Procesados"
          value={loading ? '...' : String(totalOrders)}
          subtitle="Volumen transaccional global"
          icon={<CreditCard size={16} />}
          iconBg="bg-indigo-500/10 text-indigo-500"
        />
      </div>

      {/* Resumen de Sucursales */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">Sucursales del Ecosistema</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Resumen de comercios conectados a NEXORA</p>
          </div>
          <button
            onClick={onNavigateToTenants}
            className="text-xs text-amber-500 hover:text-amber-400 font-bold hover:underline"
          >
            Ver todas →
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
            <Loader2 className="animate-spin text-amber-500 mr-2" size={20} />
            <span className="text-xs">Cargando sucursales...</span>
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--muted-foreground)]">
            No hay sucursales registradas aún.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <div
                key={t.id}
                onClick={onNavigateToTenants}
                className="p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--muted)]/50 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--foreground)] truncate">{t.name}</span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      t.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {t.active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-[var(--border)]">
                  <div>
                    <div className="font-bold text-[var(--foreground)]">{t.stats?.users || 0}</div>
                    <div className="text-[9px] text-[var(--muted-foreground)]">Usuarios</div>
                  </div>
                  <div>
                    <div className="font-bold text-[var(--foreground)]">{t.stats?.models || 0}</div>
                    <div className="text-[9px] text-[var(--muted-foreground)]">Modelos</div>
                  </div>
                  <div>
                    <div className="font-bold text-[var(--foreground)]">{t.stats?.orders || 0}</div>
                    <div className="text-[9px] text-[var(--muted-foreground)]">Pedidos</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard KPIs View ───────────────────────────────────────
function DashboardView({ stats }: { stats: { totalSales: number; activeClients: number; lowStockCount: number; pendingSyncCount: number } }) {
  const hasSales = stats.totalSales > 0;
  const hasClients = stats.activeClients > 0;
  const hasLowStock = stats.lowStockCount > 0;
  const hasPendingSync = stats.pendingSyncCount > 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Ventas Acumuladas" 
          value={`$${stats.totalSales.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`} 
          subtitle={hasSales ? "Ventas del periodo actual" : "Sin facturación registrada"} 
          subtitleColor={hasSales ? "text-emerald-500" : "text-[var(--muted-foreground)]"} 
          icon={<TrendingUp size={16} />} 
          iconBg={hasSales ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"} 
        />
        <KpiCard 
          title="Clientes Activos" 
          value={String(stats.activeClients)} 
          subtitle={hasClients ? "Registrados con historial de crédito" : "Sin clientes en el sistema"} 
          icon={<Users size={16} />} 
          iconBg="bg-slate-800/10 text-slate-700 dark:text-slate-300" 
        />
        <KpiCard 
          title="Calzado Stock Bajo" 
          value={String(stats.lowStockCount)} 
          subtitle={hasLowStock ? "Requiere orden de compra" : "Todo el inventario óptimo"} 
          subtitleColor={hasLowStock ? "text-red-500" : "text-emerald-500"} 
          valueColor={hasLowStock ? "text-red-500" : ""} 
          icon={<TrendingDown size={16} />} 
          iconBg={hasLowStock ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"} 
        />
        <KpiCard 
          title="Tareas Pendientes" 
          value={String(stats.pendingSyncCount)} 
          subtitle={hasPendingSync ? "Por sincronizar" : "Todo sincronizado"} 
          subtitleColor={hasPendingSync ? "text-amber-500" : "text-emerald-500"}
          icon={<AlertTriangle size={16} />} 
          iconBg={hasPendingSync ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"} 
        />
      </div>

      <div className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl border border-slate-700 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-600 text-white">NEXORA WEB</span>
          <h3 className="text-2xl font-black">Sistema de Gestión Integral para tu Negocio</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Administra tu inventario, ventas, clientes y facturación desde un solo lugar. El sistema funciona incluso sin internet, guardando tus datos de forma segura hasta que se restablezca la conexión.
          </p>
        </div>
      </div>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  subtitleColor?: string;
  valueColor?: string;
  icon: React.ReactNode;
  iconBg: string;
}

function KpiCard({ title, value, subtitle, subtitleColor = 'text-[var(--muted-foreground)]', valueColor = '', icon, iconBg }: KpiCardProps) {
  return (
    <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start text-[var(--muted-foreground)]">
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
        <span className={`p-2 rounded-lg ${iconBg}`}>{icon}</span>
      </div>
      <div className="mt-4">
        <span className={`text-2xl font-bold ${valueColor}`}>{value}</span>
        <div className={`text-[10px] font-semibold mt-1 ${subtitleColor}`}>{subtitle}</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
