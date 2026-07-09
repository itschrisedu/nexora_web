"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { SyncService } from '@/services/sync.service';
import { ApiService } from '@/services/api.service';
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
} from 'lucide-react';

// Importaciones dinámicas para evitar SSR con Dexie
const InventarioComponent = dynamic(() => import('@/components/inventario'), { ssr: false });
const ClientesComponent = dynamic(() => import('@/components/clientes'), { ssr: false });
const ComercialComponent = dynamic(() => import('@/components/comercial'), { ssr: false });
const FinancieroComponent = dynamic(() => import('@/components/financiero'), { ssr: false });
const ProveedoresComponent = dynamic(() => import('@/components/proveedores'), { ssr: false });

type Vista = 'dashboard' | 'inventario' | 'clientes' | 'comercial' | 'financiero' | 'proveedores';

interface NavItem {
  id: Vista;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',         icon: <LayoutDashboard size={18} /> },
  { id: 'inventario',   label: 'Inventario',         icon: <ShoppingBag size={18} /> },
  { id: 'clientes',     label: 'Clientes & Crédito', icon: <Users size={18} /> },
  { id: 'comercial',    label: 'Pedidos',            icon: <Package size={18} /> },
  { id: 'financiero',   label: 'Cobros & Finanzas',  icon: <DollarSign size={18} /> },
  { id: 'proveedores',  label: 'Proveedores',        icon: <Truck size={18} /> },
];

export default function Home() {
  const [online, setOnline] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard');

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
    if (token) { setIsLoggedIn(true); fetchStats(); }
  }, []);

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
        const response = await ApiService.post('/auth/login', { email: username, password });
        localStorage.setItem('token', response.access_token);
      } else {
        if (username !== 'admin' || password !== 'admin123') {
          throw new Error('Modo Offline: use admin / admin123');
        }
        localStorage.setItem('token', 'offline-token-mock');
      }
      setIsLoggedIn(true);
      fetchStats();
    } catch (err: any) {
      setLoginError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setVistaActual('dashboard');
  };

  const fetchStats = async () => {
    try {
      const pendingOrders = await db.pedidosOffline.count();
      const pendingMovements = await db.movimientosOffline.count();
      setStats({
        totalSales: 12450.75,
        activeClients: 42,
        lowStockCount: 5,
        pendingSyncCount: pendingOrders + pendingMovements,
      });
    } catch (e) { console.error(e); }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 relative overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold glass text-white shadow-lg">
          {online
            ? <><Wifi size={14} className="text-emerald-400 animate-pulse" /><span>Online</span></>
            : <><WifiOff size={14} className="text-rose-400 animate-bounce" /><span>Offline</span></>}
        </div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              NEXORA
            </h1>
            <p className="text-xs text-slate-400 mt-2">Trazabilidad Operativa y Scoring Crediticio de Calzado</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Usuario</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><User size={16} /></span>
                <input type="text" required placeholder="Ingrese su usuario" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><Lock size={16} /></span>
                <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
            </div>
            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" /><span>{loginError}</span>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm rounded-lg shadow-lg hover:shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
          <div className="mt-6 text-center text-[10px] text-slate-500">
            {online ? 'Conectado al servidor NestJS' : 'Offline: use admin / admin123'}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // SHELL PRINCIPAL: Sidebar + Vista Activa
  // ══════════════════════════════════════════
  return (
    <div className="min-h-screen flex bg-[var(--background)] text-[var(--foreground)]">

      {/* ─── SIDEBAR ─── */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo + Toggle tema */}
          <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-xl font-black tracking-widest text-[var(--primary)]">NEXORA</span>
            <button onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--muted)] hover:opacity-80 transition-opacity">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Navegación */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
              Módulos Operativos
            </div>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setVistaActual(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  vistaActual === item.id
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-semibold'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <div className="flex items-center gap-3">{item.icon}<span>{item.label}</span></div>
                {vistaActual !== item.id && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>
        </div>

        {/* Usuario */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--muted)]/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs">AD</div>
            <div>
              <div className="text-xs font-semibold">Administrador</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">{online ? 'En línea' : 'Offline'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Cerrar sesión">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Navbar superior */}
        <header className="h-16 border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
          <h2 className="text-md font-bold text-slate-700 dark:text-slate-200">
            {NAV_ITEMS.find((n) => n.id === vistaActual)?.label ?? 'Panel de Control'}
          </h2>
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
              <span className="absolute top-1 right-1.5 w-2 h-2 bg-[var(--primary)] rounded-full" />
            </button>
          </div>
        </header>

        {/* ─── VISTA ACTIVA ─── */}
        <section className="flex-1 p-8 overflow-y-auto space-y-8">
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
          {vistaActual === 'dashboard' && <DashboardView stats={stats} />}
          {vistaActual === 'inventario' && <InventarioComponent online={online} />}
          {vistaActual === 'clientes' && <ClientesComponent online={online} />}
          {vistaActual === 'comercial' && <ComercialComponent online={online} />}
          {vistaActual === 'financiero' && <FinancieroComponent online={online} />}
          {vistaActual === 'proveedores' && <ProveedoresComponent online={online} />}
        </section>
      </main>
    </div>
  );
}

// ─── Dashboard KPIs View ───────────────────────────────────────
function DashboardView({ stats }: { stats: { totalSales: number; activeClients: number; lowStockCount: number; pendingSyncCount: number } }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Ventas Acumuladas" value={`$${stats.totalSales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`} subtitle="+14.2% este mes" subtitleColor="text-emerald-500" icon={<TrendingUp size={16} />} iconBg="bg-emerald-500/10 text-emerald-500" />
        <KpiCard title="Clientes Activos" value={String(stats.activeClients)} subtitle="Con scoring crediticio activo" icon={<Users size={16} />} iconBg="bg-indigo-500/10 text-indigo-500" />
        <KpiCard title="Calzado Stock Bajo" value={String(stats.lowStockCount)} subtitle="Requiere orden de compra" subtitleColor="text-red-500" valueColor="text-red-500" icon={<TrendingDown size={16} />} iconBg="bg-red-500/10 text-red-500" />
        <KpiCard title="Tareas Pendientes" value={String(stats.pendingSyncCount)} subtitle="Por sincronizar" icon={<AlertTriangle size={16} />} iconBg="bg-amber-500/10 text-amber-500" />
      </div>

      <div className="p-8 bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl border border-indigo-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500 text-white">NEXORA WEB</span>
          <h3 className="text-2xl font-black">Sistema de Trazabilidad e Inteligencia de Crédito</h3>
          <p className="text-sm text-indigo-200 leading-relaxed">
            Esta interfaz controla en tiempo real todos los procesos del almacén. El sistema detecta caídas de red de forma transparente y almacena los pedidos en IndexedDB garantizando la continuidad operativa.
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
