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
  BarChart3,
  Menu,
  X,
  Receipt,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import { GeolocationService } from '@/services/geolocation.service';
import { ToastProvider } from '@/components/ui/toast';
import { GyreOtpVerification } from '@/components/ui/GyreOtpVerification';
import SubscriptionGraceBanner from '@/components/ui/SubscriptionGraceBanner';
import UnsavedChangesModal from '@/components/ui/unsaved-changes-modal';
import CambiarPasswordModal from '@/components/ui/CambiarPasswordModal';
import { getUnsavedChanges, clearUnsavedChanges, UnsavedChangesDetail } from '@/utils/unsaved-changes';

// Importaciones dinámicas para evitar SSR con Dexie
const InventarioComponent = dynamic(() => import('@/components/inventario'), { ssr: false });
const DashboardComponent = dynamic(() => import('@/components/dashboard'), { ssr: false });
const ClientesComponent = dynamic(() => import('@/components/clientes'), { ssr: false });
const ComercialComponent = dynamic(() => import('@/components/comercial'), { ssr: false });
const FinancieroComponent = dynamic(() => import('@/components/financiero'), { ssr: false });
const FinanzasComponent = dynamic(() => import('@/components/finanzas'), { ssr: false });
const ProveedoresComponent = dynamic(() => import('@/components/proveedores'), { ssr: false });
const UsuariosComponent = dynamic(() => import('@/components/usuarios'), { ssr: false });
const ModelosComponent = dynamic(() => import('@/components/modelos'), { ssr: false });
const SuperAdminComponent = dynamic(() => import('@/components/super-admin'), { ssr: false });
const SriComponent = dynamic(() => import('@/components/sri'), { ssr: false });

const PosComponent = dynamic(() => import('@/components/pos'), { ssr: false });
const PrediccionDemandaComponent = dynamic(() => import('@/components/prediccion-demanda'), { ssr: false });
const AuditoriaComponent = dynamic(() => import('@/components/auditoria'), { ssr: false });
const PersonalizacionComponent = dynamic(() => import('@/components/personalizacion'), { ssr: false });
const UbicacionesComponent = dynamic(() => import('@/components/ubicaciones'), { ssr: false });
const ReportesComponent = dynamic(() => import('@/components/reportes'), { ssr: false });
const NotificacionesModal = dynamic(() => import('@/components/notificaciones-modal'), { ssr: false });
const TermsModal = dynamic(() => import('@/components/terms-modal'), { ssr: false });
const GpsConsentModal = dynamic(() => import('@/components/gps-consent-modal'), { ssr: false });

type Vista = 'dashboard' | 'reportes' | 'inventario' | 'modelos' | 'clientes' | 'comercial' | 'financiero' | 'finanzas' | 'proveedores' | 'usuarios' | 'super-admin' | 'sri' | 'personalizacion' | 'pos' | 'prediccion-ml' | 'auditoria' | 'ubicaciones';

interface NavItem {
  id: Vista;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  // ── Operativo Diario (Mayor uso) ──
  { id: 'dashboard',       label: 'Panel Principal',       icon: <LayoutDashboard size={18} /> },
  { id: 'pos',             label: 'Punto de Venta',        icon: <Store size={18} /> },
  { id: 'comercial',       label: 'Pedidos',               icon: <CreditCard size={18} /> },
  { id: 'inventario',      label: 'Inventario',            icon: <Package size={18} /> },

  // ── Gestión Comercial ──
  { id: 'clientes',        label: 'Clientes y Créditos',   icon: <Users size={18} /> },
  { id: 'financiero',      label: 'Cobros y Crédito',      icon: <Receipt size={18} /> },
  { id: 'proveedores',     label: 'Proveedores',           icon: <Truck size={18} /> },
  { id: 'modelos',         label: 'Catálogo de Modelos',   icon: <ShoppingBag size={18} /> },

  // ── Finanzas & Analítica ──
  { id: 'finanzas',        label: 'Finanzas por Sucursal', icon: <DollarSign size={18} /> },
  { id: 'reportes',        label: 'Reportes',              icon: <BarChart3 size={18} /> },
  { id: 'prediccion-ml',   label: 'Predicción Inteligente', icon: <BrainCircuit size={18} /> },

  // ── Administración ──
  { id: 'usuarios',        label: 'Sucursales y Equipo',   icon: <Building2 size={18} /> },

  { id: 'sri',             label: 'Facturación SRI',       icon: <FileText size={18} /> },
  { id: 'auditoria',       label: 'Auditoría',             icon: <ShieldCheck size={18} /> },
  { id: 'ubicaciones',     label: 'Rastreo GPS',           icon: <MapPin size={18} /> },
  { id: 'super-admin',     label: 'Gestión de Empresas',   icon: <Building2 size={18} /> },
];

function MainApp() {
  const [online, setOnline] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [activeSucursalId, setActiveSucursalId] = useState<string>('TODAS');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificacionesModalOpen, setNotificacionesModalOpen] = useState(false);
  const [alertaCount, setAlertaCount] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showGlobalPasswordModal, setShowGlobalPasswordModal] = useState(false);

  // ── Estados para Sesión Única, Transferencia y Desbloqueo con OTP Gyre ──
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpMode, setOtpMode] = useState<'session-transfer' | 'account-unlock'>('session-transfer');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [conflictData, setConflictData] = useState<{ email: string; password?: string } | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockEmail, setUnlockEmail] = useState('');
  const [unlockNewPassword, setUnlockNewPassword] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // ── Estados para Prevención de Pérdida de Cambios Sin Guardar ──
  const [unsavedDetail, setUnsavedDetail] = useState<UnsavedChangesDetail>({ hasChanges: false });
  const [pendingVista, setPendingVista] = useState<Vista | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const verifyGpsPermission = () => {
    if (typeof window === 'undefined') return;
    const storedUser = localStorage.getItem('user');
    const parsed = storedUser ? JSON.parse(storedUser) : user;
    if (parsed?.rol === 'ROL_SUPER_ADMIN') {
      setShowGpsModal(false);
      return;
    }
    if (!navigator.geolocation) {
      setShowGpsModal(true);
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied' || result.state === 'prompt') {
          setShowGpsModal(true);
        } else if (result.state === 'granted') {
          navigator.geolocation.getCurrentPosition(
            () => {
              setShowGpsModal(false);
              GeolocationService.captureAndReportLocation();
            },
            () => {
              setShowGpsModal(true);
            },
            { timeout: 8000, maximumAge: 30000 }
          );
        }
      }).catch(() => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setShowGpsModal(false);
            GeolocationService.captureAndReportLocation();
          },
          () => {
            setShowGpsModal(true);
          },
          { timeout: 8000, maximumAge: 30000 }
        );
      });
    } else {
      navigator.geolocation.getCurrentPosition(
        () => {
          setShowGpsModal(false);
          GeolocationService.captureAndReportLocation();
        },
        () => {
          setShowGpsModal(true);
        },
        { timeout: 8000, maximumAge: 30000 }
      );
    }
  };

  const checkLegalAndGpsConsent = (userData: any) => {
    if (!userData) return;
    if (userData.rol === 'ROL_SUPER_ADMIN') {
      setShowTermsModal(false);
      setShowGpsModal(false);
      return;
    }
    if (!userData.termsAcceptedAt) {
      setShowTermsModal(true);
      setShowGpsModal(false);
    } else {
      setShowTermsModal(false);
      verifyGpsPermission();
    }
  };

  const handleTermsAccepted = () => {
    const updated = { ...(user || {}), termsAcceptedAt: new Date().toISOString(), termsVersion: '1.0' };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
    setShowTermsModal(false);
    verifyGpsPermission();
  };

  const handleGpsAccepted = () => {
    const updated = { ...(user || {}), gpsConsentAt: new Date().toISOString() };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
    setShowGpsModal(false);
    GeolocationService.captureAndReportLocation();
  };

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
    const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedSucursal = localStorage.getItem('activeSucursalId');
    if (savedSucursal) setActiveSucursalId(savedSucursal);

    const handleThemeChange = (e: any) => {
      if (e.detail?.primaryColor) {
        applyBrandingColor(e.detail.primaryColor);
      }
      if (e.detail?.nombre) {
        setBusinessNombre(e.detail.nombre);
      }
      if (e.detail?.logoUrl) {
        setBusinessLogo(e.detail.logoUrl);
      }
    };
    window.addEventListener('nexora:theme-changed', handleThemeChange);

    const handleSucursalesChange = () => {
      fetchSucursales();
    };
    window.addEventListener('nexora:sucursales-changed', handleSucursalesChange);

    let permStatus: PermissionStatus | null = null;
    if (typeof window !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        permStatus = status;
        status.onchange = () => {
          const token = localStorage.getItem('token');
          if (token) {
            if (status.state === 'denied' || status.state === 'prompt') {
              setShowGpsModal(true);
              ApiService.post('/audit/vendor-locations', {
                lat: 0,
                lng: 0,
                accuracy: 0,
                tipoEvento: 'GPS_DESACTIVADO_DURANTE_SESION',
                observaciones: 'El usuario desactivó o revocó el permiso de ubicación en su navegador durante la sesión activa.',
              }).catch(() => null);
            } else if (status.state === 'granted') {
              verifyGpsPermission();
              ApiService.post('/audit/vendor-locations', {
                tipoEvento: 'GPS_REACTIVADO',
                observaciones: 'El usuario restauró los permisos de geolocalización satelital.',
              }).catch(() => null);
            }
          }
        };
      }).catch(() => null);
    }

    const handleWindowFocus = () => {
      const token = localStorage.getItem('token');
      if (token) {
        verifyGpsPermission();
      }
    };
    window.addEventListener('focus', handleWindowFocus);

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const savedActiveView = localStorage.getItem('nexora_active_view') as Vista | null;
    if (token) { 
      setIsLoggedIn(true); 
      if (savedActiveView) {
        setVistaActual(savedActiveView);
      }
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        checkLegalAndGpsConsent(parsed);
      } else {
        verifyGpsPermission();
      }
      fetchStats();
      fetchSucursales();
      fetchBusinessBranding();
      GeolocationService.captureAndReportLocation();
    }

    const handleUnsavedEvent = (e: any) => {
      if (e.detail) {
        setUnsavedDetail(e.detail);
      }
    };
    window.addEventListener('app_unsaved_changes', handleUnsavedEvent);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const cur = getUnsavedChanges();
      if (cur.hasChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('nexora:theme-changed', handleThemeChange);
      window.removeEventListener('nexora:sucursales-changed', handleSucursalesChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('app_unsaved_changes', handleUnsavedEvent);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (permStatus) permStatus.onchange = null;
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchStats();
    }
  }, [activeSucursalId, isLoggedIn]);

  const applyBrandingColor = (color: string) => {
    if (!color || typeof document === 'undefined') return;
    const lowerColor = color.toLowerCase();
    const isPurple = lowerColor.includes('6366f1') || 
                     lowerColor.includes('8b5cf6') || 
                     lowerColor.includes('7c3aed') || 
                     lowerColor.includes('violet') || 
                     lowerColor.includes('purple');
    const finalColor = isPurple ? '#0F172A' : color;
    document.documentElement.style.setProperty('--primary', finalColor);
    
    // Calcular contraste de texto automático
    let clean = finalColor.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const contrastColor = lum > 135 ? '#0F172A' : '#FFFFFF';
        document.documentElement.style.setProperty('--primary-foreground', contrastColor);
      }
    }
  };

  const isMatrizAdmin = user?.rol === 'ROL_SUPER_ADMIN' || (user?.rol === 'ROL_ADMIN' && (!user?.tenantId || sucursales.find(s => s.id === user?.tenantId)?.isMatriz !== false));
  const isBranchRestricted = !!(user?.rol && user?.rol !== 'ROL_SUPER_ADMIN' && !isMatrizAdmin);

  const fetchSucursales = async () => {
    try {
      const data = await ApiService.get('/configuracion/sucursales').catch(() => null);
      if (Array.isArray(data) && data.length > 0) {
        setSucursales(data);
        const storedUser = localStorage.getItem('user');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        if (parsed?.tenantId) {
          const userSuc = data.find(s => s.id === parsed.tenantId);
          if (userSuc && !userSuc.isMatriz) {
            setActiveSucursalId(parsed.tenantId);
            localStorage.setItem('activeSucursalId', parsed.tenantId);
          }
        }
      } else {
        const storedUser = localStorage.getItem('user');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        setSucursales([
          { id: parsed?.tenantId || 'matriz', name: parsed?.tenantName || 'Matriz Principal', isMatriz: true, active: true },
        ]);
      }
    } catch (err) {
      console.warn('Cargando sucursales de la empresa:', err);
    }
  };

  const [businessLogo, setBusinessLogo] = useState<string>('');
  const [businessNombre, setBusinessNombre] = useState<string>('');

  const fetchBusinessBranding = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.rol === 'ROL_SUPER_ADMIN') {
          setBusinessNombre('NEXORA GLOBAL');
          setBusinessLogo('');
          applyBrandingColor('#0F172A');
          return;
        }
        if (parsed?.tenantName) setBusinessNombre(parsed.tenantName);
      }
      const config = await ApiService.get('/configuracion/negocio');
      if (config) {
        if (config.logoUrl) setBusinessLogo(config.logoUrl);
        if (config.nombre) setBusinessNombre(config.nombre);
        if (config.primaryColor) {
          applyBrandingColor(config.primaryColor);
        }
      }
    } catch (err) {
      console.warn('Error fetching business branding:', err);
    }
  };

  useEffect(() => {
    // Sincronización dinámica del favicon y título de la pestaña del navegador
    const targetIcon = businessLogo || '/logo.png';
    const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon'], link[rel='apple-touch-icon'], link[rel='shortcut icon']");
    if (iconLinks.length > 0) {
      iconLinks.forEach((l) => {
        l.href = targetIcon;
      });
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = targetIcon;
      document.head.appendChild(link);
    }

    if (businessNombre) {
      document.title = `${businessNombre} | NEXORA`;
    } else {
      document.title = 'NEXORA - Sistema de Gestión Comercial';
    }
  }, [businessLogo, businessNombre]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('nexora-theme', next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  // ── Navegación Segura: verificar cambios sin guardar antes de cambiar de vista ──
  const navigateToView = (target: Vista) => {
    if (target === vistaActual) return;
    const current = getUnsavedChanges();
    if (current.hasChanges) {
      setUnsavedDetail(current);
      setPendingVista(target);
      setShowUnsavedModal(true);
    } else {
      setVistaActual(target);
      localStorage.setItem('nexora_active_view', target);
    }
  };

  const handleUnsavedStay = () => {
    setShowUnsavedModal(false);
    setPendingVista(null);
  };

  const handleUnsavedDiscard = () => {
    clearUnsavedChanges();
    setShowUnsavedModal(false);
    if (pendingVista) {
      setVistaActual(pendingVista);
      localStorage.setItem('nexora_active_view', pendingVista);
      setPendingVista(null);
    }
  };

  const handleUnsavedSaveAndLeave = () => {
    clearUnsavedChanges();
    setShowUnsavedModal(false);
    if (pendingVista) {
      setVistaActual(pendingVista);
      localStorage.setItem('nexora_active_view', pendingVista);
      setPendingVista(null);
    }
  };

  const finalizeLogin = (response: any) => {
    localStorage.setItem('token', response.accessToken);
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(response.user));
    if (response.user?.tenantId) {
      localStorage.setItem('tenantId', response.user.tenantId);
    }
    localStorage.setItem('nexora_active_view', 'dashboard');
    setVistaActual('dashboard');
    setUser(response.user);
    checkLegalAndGpsConsent(response.user);
    setIsLoggedIn(true);
    setShowOtpModal(false);
    setShowConflictModal(false);
    setShowUnlockModal(false);
    fetchStats();
    fetchSucursales();
    fetchBusinessBranding();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      if (online) {
        const response = await ApiService.post('/auth/login', {
          email: username.trim(),
          password: password.trim(),
        });

        if (response.sessionConflict) {
          setConflictData({ email: username.trim(), password: password.trim() });
          setMaskedEmail(response.maskedEmail || username.trim());
          setShowConflictModal(true);
          return;
        }

        finalizeLogin(response);
      } else {
        let mockUser;
        if (username.trim() === 'superadmin@nexora.com' && password.trim() === 'SuperAdmin2026!') {
          mockUser = { id: 'offline-superadmin', email: 'superadmin@nexora.com', nombre: 'Super Administrador Global', rol: 'ROL_SUPER_ADMIN', termsAcceptedAt: new Date().toISOString() };
        } else if (username.trim() === 'admin@nexora.com' && password.trim() === 'Admin123!') {
          mockUser = { id: 'offline-admin', email: 'admin@nexora.com', nombre: 'Administrador Local', rol: 'ROL_ADMIN', termsAcceptedAt: new Date().toISOString() };
        } else {
          throw new Error('Modo Offline: use superadmin@nexora.com / SuperAdmin2026! o admin@nexora.com / Admin123!');
        }
        localStorage.setItem('token', 'offline-token-mock');
        localStorage.setItem('user', JSON.stringify(mockUser));
        setUser(mockUser);
        checkLegalAndGpsConsent(mockUser);
        setIsLoggedIn(true);
        fetchStats();
        fetchSucursales();
        fetchBusinessBranding();
      }
    } catch (err: any) {
      setLoginError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!conflictData) return;
    setLoading(true);
    setLoginError('');
    try {
      const response = await ApiService.post('/auth/login', {
        email: conflictData.email,
        password: conflictData.password,
        forceTransfer: true,
      });
      setShowConflictModal(false);
      finalizeLogin(response);
    } catch (err: any) {
      setLoginError(err.message || 'Error al transferir la sesión.');
      setShowConflictModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (otpMode === 'session-transfer') {
        if (!conflictData) return { success: false, error: 'Datos de sesión no disponibles.' };
        const response = await ApiService.post('/auth/verify-session-otp', {
          email: conflictData.email,
          otp: code,
        });
        finalizeLogin(response);
        return { success: true };
      } else {
        const response = await ApiService.post('/auth/verify-unlock-otp', {
          email: unlockEmail.trim(),
          otp: code,
          newPassword: unlockNewPassword.trim() || undefined,
        });
        finalizeLogin(response);
        return { success: true };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Código incorrecto.' };
    }
  };

  const handleResendOtp = async () => {
    if (otpMode === 'session-transfer') {
      if (!conflictData) return;
      await ApiService.post('/auth/request-session-otp', {
        email: conflictData.email,
        password: conflictData.password,
      });
    } else {
      await ApiService.post('/auth/request-unlock-otp', {
        email: unlockEmail.trim(),
      });
    }
  };

  const handleRequestUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockEmail.trim()) return;
    setUnlockLoading(true);
    setUnlockError('');
    try {
      const res = await ApiService.post('/auth/request-unlock-otp', {
        email: unlockEmail.trim(),
      });
      setMaskedEmail(res.maskedEmail || unlockEmail.trim());
      setOtpMode('account-unlock');
      setShowUnlockModal(false);
      setShowOtpModal(true);
    } catch (err: any) {
      setUnlockError(err.message || 'No se pudo enviar el código de desbloqueo.');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');
      let userId: string | undefined;
      if (storedUser) {
        try {
          userId = JSON.parse(storedUser)?.id;
        } catch (_) {}
      }
      if (online && (refreshToken || userId)) {
        await ApiService.post('/auth/logout', { refreshToken, userId }).catch(() => {});
      }
    } catch (_) {}

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('nexora_active_view');
    clearUnsavedChanges();
    setUser(null);
    setIsLoggedIn(false);
    setVistaActual('dashboard');
    setBusinessNombre('');
    setBusinessLogo('');
    setSucursales([]);
  };

  // Manejador de tecla Escape para modal de confirmación de salida
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showLogoutModal) {
        e.preventDefault();
        setShowLogoutModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutModal]);

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
          const [resumen, clientes, productos, notifRes] = await Promise.all([
            ApiService.get('/financiero/resumen').catch(() => ({ totalFacturado: 0 })),
            ApiService.get('/clientes').catch(() => []),
            ApiService.get('/inventario/productos').catch(() => []),
            ApiService.get(`/notificaciones/resumen?sucursalId=${activeSucursalId}`).catch(() => null),
          ]);

          realSales = resumen.totalFacturado || 0;
          realClients = Array.isArray(clientes) ? clientes.length : 0;
          if (notifRes?.metricas?.totalAlertas !== undefined) {
            setAlertaCount(notifRes.metricas.totalAlertas);
          } else {
            setAlertaCount(0);
          }
          
          if (notifRes?.metricas?.totalStockCritico !== undefined) {
            realLowStock = notifRes.metricas.totalStockCritico;
          } else if (Array.isArray(productos)) {
            realLowStock = productos.filter((p: any) => {
              const tallas = Array.isArray(p.tallas) ? p.tallas : (p.stockPorTalla || []);
              const totalStock = Array.isArray(tallas)
                ? tallas.reduce((sum: number, t: any) => sum + (t.stock ?? t.cantidad ?? t.disponible ?? 0), 0)
                : 0;
              const tieneTallaAgotada = Array.isArray(tallas) && tallas.some((t: any) => (t.stock ?? t.cantidad ?? t.disponible ?? 0) === 0);
              return totalStock <= 11 || tieneTallaAgotada;
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
          <div className="text-center mb-8 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="NEXORA"
              className="w-16 h-16 object-contain mb-3 rounded-2xl p-1 bg-white shadow-xl ring-1 ring-white/10"
            />
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
              className="w-full py-3 bg-linear-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white font-semibold text-sm rounded-lg shadow-lg hover:shadow-amber-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-amber-500/20 cursor-pointer">
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Enlace de recuperación y desbloqueo universal */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setUnlockEmail(username.trim());
                setUnlockError('');
                setShowUnlockModal(true);
              }}
              className="text-xs text-amber-400/90 hover:text-amber-300 font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound size={13} />
              <span>¿Cuenta bloqueada o clave olvidada? Desbloquear por correo</span>
            </button>
          </div>

          <div className="mt-5 text-center text-[10px] text-slate-500">
            {online ? 'Conectado al servidor' : 'Sin conexión: use admin@nexora.com / Admin123!'}
          </div>
        </div>

        {/* ═══ MODAL 1: CONFLICTO DE SESIÓN ACTIVA ═══ */}
        {showConflictModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md bg-[#14161a] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
                <ShieldAlert size={28} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Sesión Activa Detectada
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Existe una sesión activa previa para <b className="text-amber-400">{username}</b>.
                </p>
                <div className="p-3.5 rounded-2xl bg-[#1c1f24] border border-white/5 text-xs text-slate-400 mt-3 text-left leading-relaxed">
                  Por políticas de seguridad, <b>solo se permite una terminal activa simultánea</b>. ¿Deseas cerrar la sesión previa y continuar en esta ventana?
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConflictModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Cerrar Previa e Ingresar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODAL 2: SOLICITUD DE DESBLOQUEO / RECUPERACIÓN UNIVERSAL ═══ */}
        {showUnlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md bg-[#14161a] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center relative">
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                <KeyRound size={28} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Desbloquear Cuenta o Recuperar Clave
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ingresa tu correo registrado para recibir un código de verificación de 4 dígitos y restablecer tu acceso de inmediato.
                </p>
              </div>

              <form onSubmit={handleRequestUnlock} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Correo Registrado</label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@dominio.com"
                    value={unlockEmail}
                    onChange={(e) => setUnlockEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1c1f24] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Nueva Contraseña (Opcional)</label>
                  <input
                    type="password"
                    placeholder="Dejar en blanco si solo desea desbloquear"
                    value={unlockNewPassword}
                    onChange={(e) => setUnlockNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1c1f24] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {unlockError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{unlockError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={unlockLoading || !unlockEmail.trim()}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {unlockLoading ? <Loader2 size={16} className="animate-spin" /> : 'Enviar Código de Desbloqueo'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══ MODAL 3: VERIFICACIÓN CON COMPONENTE GYRE (4 DÍGITOS) ═══ */}
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in">
            <GyreOtpVerification
              title={otpMode === 'session-transfer' ? 'Autorizar Transferencia' : 'Desbloquear Cuenta'}
              subtitle={
                otpMode === 'session-transfer'
                  ? 'Ingresa el código de 4 dígitos para cerrar la otra sesión y acceder aquí:'
                  : 'Ingresa el código de 4 dígitos enviado para desbloquear tu cuenta:'
              }
              maskedContact={maskedEmail}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onCancel={() => setShowOtpModal(false)}
              onSuccessContinue={() => {
                setShowOtpModal(false);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════
  // Helper para renderizar el contenido del sidebar (compartido entre escritorio y móvil)
  const renderSidebarContent = (isMobile: boolean = false) => {
    const SECTION_GROUPS: { label: string; ids: Vista[] }[] = [
      { label: 'Operativo Diario', ids: ['dashboard', 'pos', 'comercial', 'inventario'] },
      { label: 'Gestión Comercial', ids: ['clientes', 'financiero', 'proveedores', 'modelos'] },
      { label: 'Finanzas & Analítica', ids: ['finanzas', 'reportes', 'prediccion-ml'] },
      { label: 'Administración', ids: ['usuarios', 'sri', 'auditoria', 'ubicaciones', 'super-admin'] },
    ];

    const filteredItems = NAV_ITEMS.filter((item) => {
      if (!user) return item.id !== 'super-admin';
      if (user.rol === 'ROL_SUPER_ADMIN') {
        return ['dashboard', 'super-admin', 'auditoria', 'ubicaciones'].includes(item.id);
      }
      if (user.rol === 'ROL_ADMIN') return item.id !== 'super-admin';
      if (user.rol === 'ROL_VENDEDOR') {
        return !['finanzas', 'proveedores', 'usuarios', 'modelos', 'super-admin', 'personalizacion', 'sri', 'ubicaciones'].includes(item.id);
      }
      if (user.rol === 'ROL_BODEGUERO') {
        return !['finanzas', 'clientes', 'financiero', 'usuarios', 'modelos', 'super-admin', 'personalizacion', 'sri', 'ubicaciones'].includes(item.id);
      }
      return !['modelos', 'super-admin'].includes(item.id);
    });

    return (
      <div className="flex-1 min-h-0 flex flex-col justify-between h-full">
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Logo + Toggle tema + Botón Cerrar (en móvil) */}
          <div className="shrink-0 p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {user?.rol === 'ROL_SUPER_ADMIN' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/logo.png"
                  alt="NEXORA"
                  className="w-8 h-8 object-contain rounded-lg shrink-0 border border-[var(--border)] p-0.5 bg-white shadow-xs"
                />
              ) : businessLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={businessLogo}
                  alt="Logo"
                  className="w-8 h-8 object-contain rounded-lg shrink-0 border border-[var(--border)] p-0.5 bg-white shadow-xs"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/logo.png"
                  alt="NEXORA"
                  className="w-8 h-8 object-contain rounded-lg shrink-0 border border-[var(--border)] p-0.5 bg-white shadow-xs"
                />
              )}
              <div className="min-w-0 flex-1 flex flex-col justify-center pr-1">
                <span 
                  className="text-xs sm:text-sm font-black tracking-tight block leading-tight break-words font-sans"
                  style={{ color: 'var(--foreground)' }}
                >
                  {user?.rol === 'ROL_SUPER_ADMIN' ? 'NEXORA GLOBAL' : ((businessNombre && businessNombre.trim()) || (user?.tenantName && user.tenantName.trim()) || 'NEXORA')}
                </span>
                <span 
                  className="text-[9.5px] font-extrabold uppercase tracking-wider block mt-0.5"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {user?.rol === 'ROL_SUPER_ADMIN' ? 'Control Central de la Plataforma' : (user?.tenantSector || 'Sistema de Gestión Comercial')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--muted)] hover:opacity-80 transition-opacity cursor-pointer"
                title="Cambiar tema"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              {isMobile && (
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
                  title="Cerrar menú"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Selector de sucursal móvil */}
          {isMobile && user?.rol && user?.rol !== 'ROL_SUPER_ADMIN' && (
            <div className="p-3 mx-3 mt-3 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)]">
              <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MapPin size={12} /> Sucursal Activa
              </div>
              {!isBranchRestricted && user?.rol === 'ROL_ADMIN' ? (
                <select
                  value={activeSucursalId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveSucursalId(val);
                    localStorage.setItem('activeSucursalId', val);
                    fetchStats();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 text-xs font-bold text-[var(--foreground)] focus:outline-none cursor-pointer"
                >
                  <option value="TODAS">🏢 Todas las Sucursales (Consolidado)</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.isMatriz ? '🏢 Matriz: ' : '🏪 Sucursal: '} {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs font-bold text-[var(--foreground)] py-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>{sucursales.find((s) => s.id === (user?.tenantId || activeSucursalId))?.name || 'Sucursal Asignada'}</span>
                  {user?.rol === 'ROL_ADMIN' && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">(Admin Local)</span>}
                </div>
              )}
            </div>
          )}

          {/* Navegación (Scroll vertical independiente únicamente en el área de items) */}
          <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-0.5">
            {SECTION_GROUPS.map((group, gi) => {
              const groupItems = group.ids
                .map((id) => filteredItems.find((fi) => fi.id === id))
                .filter(Boolean) as NavItem[];
              if (groupItems.length === 0) return null;
              return (
                <div key={group.label}>
                  {gi > 0 && <div className="my-2 border-t border-[var(--border)]" />}
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    {group.label}
                  </div>
                  {groupItems.map((item) => {
                    const isActive = vistaActual === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigateToView(item.id);
                          if (isMobile) setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                          isActive
                            ? 'font-extrabold shadow-sm'
                            : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                        }`}
                        style={
                          isActive
                            ? {
                                backgroundColor: 'var(--primary)',
                                color: 'var(--primary-foreground)',
                              }
                            : {}
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="transition-colors"
                            style={{ color: isActive ? 'var(--primary-foreground)' : undefined }}
                          >
                            {item.icon}
                          </span>
                          <span
                            style={{ color: isActive ? 'var(--primary-foreground)' : undefined }}
                          >
                            {item.label}
                          </span>
                        </div>
                        <ChevronRight 
                          size={14} 
                          style={{ color: isActive ? 'var(--primary-foreground)' : undefined }} 
                        />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Usuario (Fijo abajo) */}
        <div className="shrink-0 p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--muted)]/30">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs shrink-0"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {user?.nombre ? user.nombre.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate max-w-[110px]">{user?.nombre || 'Usuario'}</div>
              <div className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[110px]">
                {user?.rol === 'ROL_SUPER_ADMIN' ? 'Super Admin' : user?.rol === 'ROL_ADMIN' ? 'Administrador' : user?.rol === 'ROL_VENDEDOR' ? 'Vendedor' : user?.rol === 'ROL_BODEGUERO' ? 'Bodeguero' : 'Desconocido'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                navigateToView('personalizacion');
                if (isMobile) setMobileMenuOpen(false);
              }}
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={
                vistaActual === 'personalizacion'
                  ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                  : {}
              }
              title="Configuración Global ⚙️"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => setShowGlobalPasswordModal(true)}
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
              title="Cambiar Contraseña 🔐"
            >
              <KeyRound size={16} />
            </button>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════
  // SHELL PRINCIPAL: Sidebar + Vista Activa
  // ══════════════════════════════════════════
  return (
    <div className="h-screen max-h-screen w-full flex overflow-hidden bg-[var(--background)] text-[var(--foreground)]">

      {/* ─── SIDEBAR ESCRITORIO (Fijo, visible en pantallas >= md) ─── */}
      <aside className="hidden md:flex w-64 h-full max-h-screen border-r border-[var(--border)] bg-[var(--card)] flex-col justify-between shrink-0 overflow-hidden">
        {renderSidebarContent(false)}
      </aside>

      {/* ─── SIDEBAR MÓVIL (Off-canvas Drawer) ─── */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 md:hidden transition-opacity duration-200 animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] h-full bg-[var(--card)] border-r border-[var(--border)] flex flex-col justify-between shadow-2xl md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent(true)}
      </aside>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <main className="flex-1 flex flex-col h-full max-h-screen overflow-hidden min-w-0 relative">

        {/* Banner de Suscripción / Período de Gracia & Modal de Bloqueo */}
        <SubscriptionGraceBanner />

        {/* Navbar superior (Fijo arriba) */}
        <header
          className="h-16 shrink-0 border-b px-4 sm:px-6 md:px-8 flex items-center justify-between z-30 shadow-xs transition-colors duration-200"
          style={{ 
            backgroundColor: 'var(--primary)', 
            color: 'var(--primary-foreground)',
            borderColor: 'color-mix(in srgb, var(--primary) 80%, black)'
          }}
        >
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Botón Hamburguesa Móvil */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 sm:-ml-2 rounded-xl text-[var(--primary-foreground)] hover:bg-black/15 md:hidden flex items-center justify-center transition-colors cursor-pointer"
              title="Abrir menú"
              aria-label="Abrir menú de navegación"
            >
              <Menu size={22} />
            </button>

            <h1 
              className="text-base sm:text-lg md:text-xl font-black tracking-tight truncate"
              style={{ color: 'var(--primary-foreground)' }}
            >
              {NAV_ITEMS.find((n) => n.id === vistaActual)?.label ?? 'Panel de Control'}
            </h1>

            {/* Conmutador / Indicador de Sucursal Activa */}
            {user?.rol && user?.rol !== 'ROL_SUPER_ADMIN' && (
              <div 
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs backdrop-blur-sm shadow-xs shrink-0"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--primary-foreground) 15%, transparent)', 
                  border: '1px solid color-mix(in srgb, var(--primary-foreground) 25%, transparent)',
                  color: 'var(--primary-foreground)'
                }}
              >
                <MapPin size={14} className="shrink-0" style={{ color: 'var(--primary-foreground)' }} />
                {!isBranchRestricted && user?.rol === 'ROL_ADMIN' ? (
                  <select
                    value={activeSucursalId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActiveSucursalId(val);
                      localStorage.setItem('activeSucursalId', val);
                      fetchStats();
                    }}
                    className="bg-transparent font-bold focus:outline-none cursor-pointer text-xs"
                    style={{ color: 'var(--primary-foreground)' }}
                    title="Navegar entre sucursales con 1 clic"
                  >
                    <option value="TODAS" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🏢 Todas las Sucursales (Consolidado)</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {s.isMatriz ? '🏢 Matriz: ' : '🏪 Sucursal: '} {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold text-xs truncate max-w-[200px] flex items-center gap-1.5" style={{ color: 'var(--primary-foreground)' }}>
                    <span>📍 {sucursales.find((s) => s.id === (user?.tenantId || activeSucursalId))?.name || 'Sucursal Asignada'}</span>
                    {user?.rol === 'ROL_ADMIN' && (
                      <span className="text-[10px] opacity-80 font-normal">(Admin Local)</span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {online
              ? <div 
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold backdrop-blur-sm"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--primary-foreground) 15%, transparent)',
                    color: 'var(--primary-foreground)',
                    border: '1px solid color-mix(in srgb, var(--primary-foreground) 25%, transparent)'
                  }}
                >
                  <Wifi size={13} className="animate-pulse shrink-0" style={{ color: 'var(--primary-foreground)' }} />
                  <span className="hidden xs:inline" style={{ color: 'var(--primary-foreground)' }}>Online</span>
                </div>
              : <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <WifiOff size={13} className="animate-bounce shrink-0" />
                  <span>Offline</span>
                </div>
            }
            {stats.pendingSyncCount > 0 && (
              <button onClick={handleSyncManual} disabled={loading}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--primary-foreground) 15%, transparent)',
                  color: 'var(--primary-foreground)',
                  border: '1px solid color-mix(in srgb, var(--primary-foreground) 30%, transparent)'
                }}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin shrink-0' : 'shrink-0'} />
                <span className="hidden sm:inline">Sincronizar</span> <span>({stats.pendingSyncCount})</span>
              </button>
            )}
            <button 
              onClick={() => setNotificacionesModalOpen(true)}
              className="p-1.5 sm:p-2 rounded-lg transition-colors relative hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
              style={{ color: 'var(--primary-foreground)' }}
              title="Centro de Notificaciones & Cobranza"
            >
              <Bell size={18} style={{ color: 'var(--primary-foreground)' }} />
              {alertaCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-rose-500 text-white flex items-center justify-center shadow-md border-2 animate-pulse"
                  style={{ borderColor: 'var(--primary)' }}
                >
                  {alertaCount > 99 ? '99+' : alertaCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* ─── VISTA ACTIVA (Scroll vertical independiente con margen para móvil) ─── */}
        <section
          id="nexora-main-content"
          key={`${vistaActual}-${activeSucursalId}`}
          className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-6 md:space-y-8 pb-24 md:pb-8 transition-opacity duration-300"
        >
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
              <SuperAdminDashboard online={online} onNavigateToTenants={() => navigateToView('super-admin')} />
            ) : (
              <DashboardComponent
                online={online}
                userRole={user?.rol}
                activeSucursalId={activeSucursalId}
                onSucursalChange={(id) => {
                  setActiveSucursalId(id);
                  localStorage.setItem('activeSucursalId', id);
                }}
                sucursales={sucursales}
              />
            )
          )}
          {vistaActual === 'reportes' && <ReportesComponent />}
          {vistaActual === 'inventario' && (
            <InventarioComponent
              online={online}
              userRole={user?.rol}
              activeSucursalId={activeSucursalId}
              sucursales={sucursales}
            />
          )}
          {vistaActual === 'modelos' && <ModelosComponent online={online} />}
          {vistaActual === 'clientes' && <ClientesComponent online={online} />}
          {vistaActual === 'comercial' && (
            <ComercialComponent
              online={online}
              userRole={user?.rol}
              userPermissions={user}
              activeSucursalId={activeSucursalId}
              sucursales={sucursales}
            />
          )}
          {vistaActual === 'financiero' && (
            <FinancieroComponent
              online={online}
              activeSucursalId={activeSucursalId}
              sucursales={sucursales}
            />
          )}
          {vistaActual === 'finanzas' && (
            <FinanzasComponent
              online={online}
              activeSucursalId={activeSucursalId}
              sucursales={sucursales}
              userRole={user?.rol}
            />
          )}
          {vistaActual === 'proveedores' && <ProveedoresComponent online={online} userRole={user?.rol} />}
          {vistaActual === 'usuarios' && <UsuariosComponent online={online} />}
          {vistaActual === 'super-admin' && <SuperAdminComponent online={online} />}
          {vistaActual === 'sri' && <SriComponent />}
          {vistaActual === 'personalizacion' && <PersonalizacionComponent online={online} />}

          {vistaActual === 'pos' && <PosComponent />}
          {vistaActual === 'prediccion-ml' && <PrediccionDemandaComponent />}
          {vistaActual === 'auditoria' && <AuditoriaComponent />}
          {vistaActual === 'ubicaciones' && <UbicacionesComponent online={online} />}
        </section>
      </main>

      {/* ─── BARRA DE NAVEGACIÓN RÁPIDA INFERIOR (MÓVIL) ─── */}
      <nav 
        aria-label="Navegación rápida móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[var(--card)]/95 backdrop-blur-md border-t border-[var(--border)] flex items-center justify-around px-1 shadow-lg"
      >
        <button
          onClick={() => navigateToView('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            vistaActual === 'dashboard' ? 'font-bold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
          style={vistaActual === 'dashboard' ? { color: 'var(--primary)' } : {}}
        >
          <LayoutDashboard size={19} />
          <span className="text-[10px] mt-1 font-medium">Panel</span>
        </button>

        <button
          onClick={() => navigateToView('pos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            vistaActual === 'pos' ? 'font-bold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
          style={vistaActual === 'pos' ? { color: 'var(--primary)' } : {}}
        >
          <CreditCard size={19} />
          <span className="text-[10px] mt-1 font-medium">Caja</span>
        </button>

        <button
          onClick={() => navigateToView('comercial')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            vistaActual === 'comercial' ? 'font-bold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
          style={vistaActual === 'comercial' ? { color: 'var(--primary)' } : {}}
        >
          <Package size={19} />
          <span className="text-[10px] mt-1 font-medium">Pedidos</span>
        </button>

        <button
          onClick={() => navigateToView('clientes')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            vistaActual === 'clientes' ? 'font-bold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
          style={vistaActual === 'clientes' ? { color: 'var(--primary)' } : {}}
        >
          <User size={19} />
          <span className="text-[10px] mt-1 font-medium">Clientes</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        >
          <Menu size={19} />
          <span className="text-[10px] mt-1 font-medium">Menú</span>
        </button>
      </nav>

      {/* ─── MODAL DE NOTIFICACIONES & COBRANZA ─── */}
      <NotificacionesModal
        isOpen={notificacionesModalOpen}
        onClose={() => {
          setNotificacionesModalOpen(false);
          fetchStats();
        }}
        activeSucursalId={activeSucursalId}
        onNavigateToView={(v) => {
          navigateToView(v as Vista);
          setNotificacionesModalOpen(false);
        }}
        onRefreshStats={fetchStats}
      />

      {/* ─── MODALES BLOQUEANTES LEGALES & ONBOARDING (FASE E8) ─── */}
      {isLoggedIn && user && showTermsModal && (
        <TermsModal
          isOpen={showTermsModal}
          userNombre={user.nombre || user.email}
          userEmail={user.email}
          userRol={user.rol}
          onAccepted={handleTermsAccepted}
        />
      )}

      {isLoggedIn && user && !showTermsModal && showGpsModal && (
        <GpsConsentModal
          isOpen={showGpsModal}
          userNombre={user.nombre || user.email}
          userRol={user.rol}
          onAccepted={handleGpsAccepted}
        />
      )}

      {/* ─── MODAL DE ADVERTENCIA DE CAMBIOS SIN GUARDAR ─── */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        targetSectionName={pendingVista ? pendingVista.toUpperCase() : undefined}
        detail={unsavedDetail}
        onStay={handleUnsavedStay}
        onDiscardAndLeave={handleUnsavedDiscard}
        onSaveSuccessAndLeave={handleUnsavedSaveAndLeave}
      />

      {/* ─── MODAL DE CONFIRMACIÓN DE CIERRE DE SESIÓN ─── */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Encabezado elegante oscuro */}
            <div className="p-5 px-6 border-b border-[var(--border)] bg-[#0F172A] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
                  <LogOut size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">¿Cerrar Sesión?</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Confirmación de salida segura de NEXORA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                title="Cancelar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-[var(--foreground)] leading-relaxed">
                ¿Estás seguro de que deseas salir del sistema?
              </p>

              {user && (
                <div className="p-3.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {user.nombre?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[var(--foreground)] truncate">{user.nombre}</div>
                    <div className="text-[11px] text-[var(--muted-foreground)] truncate">{user.email}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-[#0F172A]/10 text-[#0F172A] dark:bg-white/10 dark:text-slate-200 rounded-md text-[9px] font-bold uppercase tracking-wider">
                      {user.rol === 'ROL_SUPER_ADMIN'
                        ? 'Super Admin'
                        : user.rol === 'ROL_ADMIN'
                        ? 'Administrador'
                        : user.rol === 'ROL_VENDEDOR'
                        ? 'Vendedor'
                        : user.rol === 'ROL_BODEGUERO'
                        ? 'Bodeguero'
                        : user.rol}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[var(--muted-foreground)] italic">
                Para continuar trabajando más tarde, deberás iniciar sesión con tus credenciales nuevamente.
              </p>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutModal(false);
                    handleLogout();
                  }}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sí, Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Global de Cambio de Contraseña (Vault Password Meter) */}
      <CambiarPasswordModal
        isOpen={showGlobalPasswordModal}
        onClose={() => setShowGlobalPasswordModal(false)}
      />
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
  const activePercent = totalTenants > 0 ? Math.round((activeTenants / totalTenants) * 100) : 100;

  const formatPlanLabel = (plan?: string) => {
    if (!plan) return 'Plan Comercial';
    if (plan === 'PLAN_BASICO') return 'Plan Básico';
    if (plan === 'PLAN_MAYORISTA') return 'Plan Mayorista';
    if (plan === 'PLAN_COMERCIAL') return 'Plan Comercial';
    return plan.replace('_', ' ');
  };

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
              Supervisión de empresas afiliadas, licenciamiento comercial, gestión centralizada de accesos y monitoreo global de la plataforma NEXORA.
            </p>
          </div>
          <button
            onClick={onNavigateToTenants}
            className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg hover:shadow-amber-500/20 shrink-0 cursor-pointer"
          >
            <Building2 size={16} />
            <span>Gestionar Empresas / Tenants</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Globales para Super Admin */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Empresas Afiliadas"
          value={loading ? '...' : String(totalTenants)}
          subtitle={loading ? 'Cargando...' : `${activeTenants} activas • ${totalTenants - activeTenants} inactivas`}
          subtitleColor="text-emerald-500"
          icon={<Building2 size={16} />}
          iconBg="bg-blue-500/10 text-blue-500"
        />
        <KpiCard
          title="Usuarios Globales"
          value={loading ? '...' : String(totalUsers)}
          subtitle="En toda la plataforma"
          icon={<Users size={16} />}
          iconBg="bg-amber-500/10 text-amber-500"
        />
        <KpiCard
          title="Licenciamiento Activo"
          value={loading ? '...' : `${activePercent}%`}
          subtitle={`${activeTenants} de ${totalTenants} con servicio al día`}
          subtitleColor="text-emerald-500"
          icon={<ShieldCheck size={16} />}
          iconBg="bg-emerald-500/10 text-emerald-500"
        />
        <KpiCard
          title="Infraestructura Cloud"
          value="100% Online"
          subtitle="Aislamiento multitenant activo"
          subtitleColor="text-emerald-500"
          icon={<Database size={16} />}
          iconBg="bg-indigo-500/10 text-indigo-500"
        />
      </div>

      {/* Resumen de Empresas / Tenants */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">Empresas del Ecosistema</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Organizaciones conectadas a la red NEXORA</p>
          </div>
          <button
            onClick={onNavigateToTenants}
            className="text-xs text-amber-500 hover:text-amber-400 font-bold hover:underline cursor-pointer"
          >
            Ver todas →
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
            <Loader2 className="animate-spin text-amber-500 mr-2" size={20} />
            <span className="text-xs">Cargando empresas...</span>
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--muted-foreground)]">
            No hay empresas registradas aún.
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
                    <div className="font-bold text-[var(--foreground)] truncate text-[11px]">{formatPlanLabel(t.plan)}</div>
                    <div className="text-[9px] text-[var(--muted-foreground)]">Plan Actual</div>
                  </div>
                  <div>
                    <div className="font-bold text-[var(--foreground)]">{t.stats?.users || 0}</div>
                    <div className="text-[9px] text-[var(--muted-foreground)]">Usuarios</div>
                  </div>
                  <div>
                    <div className="font-bold text-emerald-500">${t.precioMensualPlan !== undefined && t.precioMensualPlan !== null ? t.precioMensualPlan : 50}/m</div>
                    <div className="text-[9px] text-[var(--muted-foreground)]">Tarifa</div>
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
