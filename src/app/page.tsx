"use client";

import { useEffect, useState } from 'react';
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
  RefreshCw
} from 'lucide-react';

export default function Home() {
  const [online, setOnline] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // KPIs del Dashboard
  const [stats, setStats] = useState({
    totalSales: 0,
    activeClients: 0,
    lowStockCount: 0,
    pendingSyncCount: 0
  });

  useEffect(() => {
    // Inicializar sincronización y estado de red
    setOnline(SyncService.isOnline());
    SyncService.init((isOnline) => {
      setOnline(isOnline);
    });

    // Detectar tema inicial de preferencia o sistema
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(currentTheme);

    // Verificar si ya hay token guardado
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchStats();
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      if (online) {
        // Petición real al backend
        const response = await ApiService.post('/auth/login', { username, password });
        localStorage.setItem('token', response.access_token);
        setIsLoggedIn(true);
        fetchStats();
      } else {
        // Modo offline de contingencia (credenciales offline de prueba)
        if (username === 'admin' && password === 'admin123') {
          localStorage.setItem('token', 'offline-token-mock');
          setIsLoggedIn(true);
          fetchStats();
        } else {
          throw new Error('Credenciales inválidas (modo offline requiere admin/admin123)');
        }
      }
    } catch (error: any) {
      setLoginError(error.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  const fetchStats = async () => {
    try {
      // Contar elementos pendientes de sincronizar localmente
      const pendingOrders = await db.pedidosOffline.count();
      const pendingMovements = await db.movimientosOffline.count();

      // En un escenario real, haríamos fetch de estadísticas del backend
      setStats({
        totalSales: 12450.75, // Datos Mock iniciales premium
        activeClients: 42,
        lowStockCount: 5,
        pendingSyncCount: pendingOrders + pendingMovements
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
  // RENDER PANTALLA LOGIN
  // ══════════════════════════════════════════
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 relative overflow-hidden">
        {/* Indicador de Red flotante */}
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold glass text-white shadow-lg">
          {online ? (
            <>
              <Wifi size={14} className="text-emerald-400 animate-pulse" />
              <span>Modo Online</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-rose-400 animate-bounce" />
              <span>Modo Offline</span>
            </>
          )}
        </div>

        {/* Círculos de luz flotantes (Estética Premium) */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              NEXORA
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Trazabilidad Operativa y Scoring Crediticio de Calzado
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Usuario
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ingrese su usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm rounded-lg shadow-lg hover:shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 text-center text-[10px] text-slate-500">
            {online 
              ? 'Conectado al servidor de producción NestJS' 
              : 'Modo Offline: use usuario "admin" y contraseña "admin123"'}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // RENDER DASHBOARD PRINCIPAL
  // ══════════════════════════════════════════
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* BARRA LATERAL (Sidebar Premium) */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <span className="text-xl font-black tracking-widest text-primary">NEXORA</span>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-border bg-muted hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Módulos Operativos
            </div>
            <a href="#dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-semibold text-sm transition-colors">
              <Database size={18} />
              <span>Dashboard</span>
            </a>
            <a href="#inventario" className="flex items-center justify-between px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground text-sm transition-colors">
              <div className="flex items-center gap-3">
                <ShoppingBag size={18} />
                <span>Inventario</span>
              </div>
              <ChevronRight size={14} />
            </a>
            <a href="#clientes" className="flex items-center justify-between px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground text-sm transition-colors">
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span>Clientes & Crédito</span>
              </div>
              <ChevronRight size={14} />
            </a>
          </nav>
        </div>

        {/* Sección de usuario inferior */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
              AD
            </div>
            <div>
              <div className="text-xs font-semibold">Administrador</div>
              <div className="text-[10px] text-muted-foreground">En línea</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col">
        {/* NAV SUPERIOR (Navbar) */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
          <h2 className="text-md font-bold text-slate-700 dark:text-slate-200">Panel de Control Operativo</h2>
          
          <div className="flex items-center gap-4">
            {/* Estado de Red */}
            <div className="flex items-center gap-2">
              {online ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Wifi size={13} className="animate-pulse" />
                  <span>Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <WifiOff size={13} className="animate-bounce" />
                  <span>Offline</span>
                </div>
              )}
            </div>

            {/* Sincronización Manual */}
            {stats.pendingSyncCount > 0 && (
              <button
                onClick={handleSyncManual}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1 rounded-lg border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 text-xs font-semibold transition-all disabled:opacity-50"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                <span>Sincronizar ({stats.pendingSyncCount})</span>
              </button>
            )}

            <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <section className="flex-1 p-8 space-y-8 overflow-y-auto">
          {/* Tarjeta de advertencia si hay datos pendientes offline */}
          {stats.pendingSyncCount > 0 && (
            <div className="p-4 border border-warning/20 bg-warning/5 text-warning rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-warning shrink-0" />
                <div>
                  <div className="text-sm font-bold">Datos pendientes de sincronizar</div>
                  <div className="text-xs text-muted-foreground">Tienes transacciones guardadas localmente en modo Offline. Conéctate a internet para subirlos.</div>
                </div>
              </div>
              {online && (
                <button
                  onClick={handleSyncManual}
                  className="px-4 py-2 bg-warning text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Sincronizar Ahora
                </button>
              )}
            </div>
          )}

          {/* Grid de KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Ventas Acumuladas</span>
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><TrendingUp size={16} /></span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold">${stats.totalSales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                <div className="text-[10px] text-emerald-500 font-semibold mt-1">+14.2% este mes</div>
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Clientes Activos</span>
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500"><Users size={16} /></span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold">{stats.activeClients}</span>
                <div className="text-[10px] text-muted-foreground mt-1">Con scoring crediticio activo</div>
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Calzado Stock Bajo</span>
                <span className="p-2 rounded-lg bg-rose-500/10 text-rose-500"><TrendingDown size={16} /></span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-danger">{stats.lowStockCount}</span>
                <div className="text-[10px] text-danger font-semibold mt-1">Requiere orden de compra</div>
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Tareas Pendientes</span>
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><AlertTriangle size={16} /></span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold">{stats.pendingSyncCount}</span>
                <div className="text-[10px] text-muted-foreground mt-1">Por sincronizar a base principal</div>
              </div>
            </div>
          </div>

          {/* Información del Sistema de Tesis */}
          <div className="p-8 bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl border border-indigo-950 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 max-w-xl space-y-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500 text-white">NEXORA WEB</span>
              <h3 className="text-2xl font-black">Sistema de Trazabilidad e Inteligencia de Crédito</h3>
              <p className="text-sm text-indigo-200 leading-relaxed">
                Esta interfaz controla y consolida en tiempo real todos los procesos del almacén. El sistema detecta caídas de red de forma transparente para el usuario y almacena los pedidos en la IndexedDB local garantizando la continuidad operativa.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
