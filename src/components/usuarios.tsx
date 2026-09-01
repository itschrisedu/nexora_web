"use client";

import { useState, useEffect } from 'react';
import { ApiService } from '../services/api.service';
import {
  User, UserPlus, Plus, Loader2, ShieldCheck, UserCheck, UserMinus,
  RefreshCw, CheckCircle, AlertCircle, Building2, Store,
  Users, KeyRound, Search, Share2, Edit2, MapPin, X
} from 'lucide-react';

interface UsuariosProps {
  online: boolean;
}

interface SucursalItem {
  id: string;
  name: string;
  active: boolean;
  isMatriz: boolean;
  isCurrent: boolean;
  direccion: string;
  telefono: string;
  email: string;
  stats: {
    usuarios: number;
    pedidos: number;
    modelos: number;
  };
  createdAt: string;
}

interface UserListItem {
  id: string;
  email: string;
  nombre: string;
  rol: 'ROL_ADMIN' | 'ROL_VENDEDOR' | 'ROL_BODEGUERO';
  activo: boolean;
  permiteCambiarPrecio?: boolean;
  createdAt: string;
}

interface StockInterItem {
  sucursalId: string;
  sucursalNombre: string;
  modeloId: string;
  modeloNombre: string;
  codigo: string;
  color: string;
  precioVenta: number;
  stockTotal: number;
  tallasDisponibles: { talla: number; cantidad: number }[];
}

export default function UsuariosComponent({ online }: UsuariosProps) {
  const [tabActiva, setTabActiva] = useState<'sucursales' | 'personal' | 'stock-inter'>('sucursales');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ─── SUCURSALES ───
  const [sucursales, setSucursales] = useState<SucursalItem[]>([]);
  const [showAddSucursalModal, setShowAddSucursalModal] = useState(false);
  const [creatingSucursal, setCreatingSucursal] = useState(false);
  const [newSucursal, setNewSucursal] = useState({
    name: '',
    direccion: '',
    telefono: '',
    email: '',
    adminNombre: '',
    adminEmail: '',
    adminPassword: '',
  });

  // ─── PERSONAL ───
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);

  // Formulario Nuevo Colaborador
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'ROL_VENDEDOR' | 'ROL_BODEGUERO' | 'ROL_ADMIN'>('ROL_VENDEDOR');
  const [permiteCambiarPrecio, setPermiteCambiarPrecio] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal Reset Password
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resettingUser, setResettingUser] = useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // ─── STOCK INTER-SUCURSAL ───
  const [searchStockQuery, setSearchStockQuery] = useState('');
  const [stockResultados, setStockResultados] = useState<StockInterItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    if (online) {
      loadAll();
    }
  }, [online]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadSucursales(), loadUsers()]);
    } finally {
      setLoading(false);
    }
  };

  const loadSucursales = async () => {
    try {
      const data = await ApiService.get('/configuracion/sucursales');
      if (Array.isArray(data)) {
        setSucursales(data);
      }
    } catch (err) {
      console.error('Error cargando sucursales:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await ApiService.get('/configuracion/personal');
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        const fallback = await ApiService.get('/auth/usuarios');
        setUsers(Array.isArray(fallback) ? fallback : []);
      }
    } catch (err) {
      console.error('Error al cargar personal:', err);
    }
  };

  const handleCreateSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSucursal(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await ApiService.post('/configuracion/sucursales', newSucursal);
      setSuccessMsg(`Sucursal "${newSucursal.name}" creada exitosamente.`);
      setShowAddSucursalModal(false);
      setNewSucursal({
        name: '',
        direccion: '',
        telefono: '',
        email: '',
        adminNombre: '',
        adminEmail: '',
        adminPassword: '',
      });
      await loadSucursales();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la sucursal.');
    } finally {
      setCreatingSucursal(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!nombre || !email || !password || !rol) {
      setErrorMsg('Todos los campos son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      await ApiService.post('/auth/usuarios', {
        nombre,
        email,
        password,
        rol,
        permiteCambiarPrecio,
      });

      setSuccessMsg('Colaborador registrado con éxito.');
      setShowAddModal(false);
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('ROL_VENDEDOR');
      setPermiteCambiarPrecio(false);
      loadUsers();

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await ApiService.put(`/configuracion/personal/${editingUser.id}`, {
        nombre: editingUser.nombre,
        email: editingUser.email,
        rol: editingUser.rol,
        activo: editingUser.activo,
        permiteCambiarPrecio: editingUser.permiteCambiarPrecio,
      });

      setSuccessMsg(`Colaborador "${editingUser.nombre}" actualizado.`);
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar colaborador.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserListItem) => {
    setErrorMsg('');
    try {
      await ApiService.put(`/configuracion/personal/${user.id}`, {
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: !user.activo,
        permiteCambiarPrecio: user.permiteCambiarPrecio,
      });
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar estado.');
    }
  };

  const handleTogglePermisoPrecio = async (user: UserListItem) => {
    setErrorMsg('');
    try {
      await ApiService.put(`/configuracion/personal/${user.id}`, {
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: user.activo,
        permiteCambiarPrecio: !user.permiteCambiarPrecio,
      });
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al modificar permisos de precio.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setSavingPassword(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await ApiService.post(`/configuracion/personal/${resettingUser.id}/reset-password`, {
        password: newPassword,
      });

      setSuccessMsg(`Contraseña restablecida exitosamente para ${resettingUser.nombre}.`);
      setShowResetPasswordModal(false);
      setResettingUser(null);
      setNewPassword('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al restablecer contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSearchStockInter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchStockQuery.trim()) return;
    setLoadingStock(true);
    try {
      const data = await ApiService.get(`/configuracion/stock-inter-sucursal?search=${encodeURIComponent(searchStockQuery.trim())}`);
      setStockResultados(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error buscando stock inter-sucursal:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* Pestañas Superiores */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
        <button
          type="button"
          onClick={() => setTabActiva('sucursales')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            tabActiva === 'sucursales'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <Store size={15} /> Sucursales & Puntos de Venta ({sucursales.length})
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('personal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            tabActiva === 'personal'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <Users size={15} /> Equipo de Trabajo & Permisos ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('stock-inter')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            tabActiva === 'stock-inter'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <Share2 size={15} /> Consulta de Stock Inter-Sucursal
        </button>
      </div>

      {/* ═══ TAB 1: SUCURSALES ═══ */}
      {tabActiva === 'sucursales' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">Sucursales del Negocio</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Organiza tus puntos de venta. Los inventarios y colaboradores están aislados por sucursal.
              </p>
            </div>
            <button
              onClick={() => setShowAddSucursalModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              <Plus size={15} /> Nueva Sucursal
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-[#0F172A]" size={28} />
            </div>
          ) : sucursales.length === 0 ? (
            <div className="p-8 text-center bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl text-xs text-[var(--muted-foreground)]">
              No hay sucursales registradas para esta empresa.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sucursales.map((sucursal) => (
                <div
                  key={sucursal.id}
                  className={`bg-[var(--card)] border rounded-2xl p-5 space-y-4 shadow-sm transition-all ${
                    sucursal.isCurrent ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        sucursal.isMatriz ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      }`}>
                        {sucursal.isMatriz ? 'M' : 'S'}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{sucursal.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            sucursal.isMatriz ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          }`}>
                            {sucursal.isMatriz ? 'Matriz Principal' : 'Sucursal'}
                          </span>
                          {sucursal.isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full">
                              Sesión Actual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-1.5"><MapPin size={13} />{sucursal.direccion}</div>
                    {sucursal.telefono && <div>Tel: {sucursal.telefono}</div>}
                    {sucursal.email && <div>Email: {sucursal.email}</div>}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] text-center text-xs">
                    <div className="p-2 bg-[var(--muted)]/30 rounded-xl">
                      <div className="text-[10px] text-[var(--muted-foreground)]">Colaboradores</div>
                      <div className="font-bold text-sm font-mono">{sucursal.stats.usuarios}</div>
                    </div>
                    <div className="p-2 bg-[var(--muted)]/30 rounded-xl">
                      <div className="text-[10px] text-[var(--muted-foreground)]">Modelos</div>
                      <div className="font-bold text-sm font-mono">{sucursal.stats.modelos}</div>
                    </div>
                    <div className="p-2 bg-[var(--muted)]/30 rounded-xl">
                      <div className="text-[10px] text-[var(--muted-foreground)]">Pedidos</div>
                      <div className="font-bold text-sm font-mono">{sucursal.stats.pedidos}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: PERSONAL Y PERMISOS ═══ */}
      {tabActiva === 'personal' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">Colaboradores y Permisos</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Gestiona roles, accesos y reseteo de claves del personal del local comercial.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadUsers}
                className="p-2 border border-[var(--border)] rounded-xl hover:bg-[var(--muted)] transition-colors"
                title="Refrescar Lista"
              >
                <RefreshCw size={15} />
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                <Plus size={15} /> Nuevo Colaborador
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-[var(--border)] rounded-2xl bg-[var(--card)] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--muted)]/60 border-b border-[var(--border)] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Colaborador</th>
                  <th className="p-3.5">Rol Asignado</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-center">Modificar Precios</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-sm text-[var(--foreground)]">{user.nombre}</div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">{user.email}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        user.rol === 'ROL_ADMIN' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                        user.rol === 'ROL_VENDEDOR' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {user.rol === 'ROL_ADMIN' ? 'Administrador' : user.rol === 'ROL_VENDEDOR' ? 'Vendedor' : 'Bodeguero'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                          user.activo ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleTogglePermisoPrecio(user)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          user.permiteCambiarPrecio ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}
                      >
                        {user.permiteCambiarPrecio ? 'Permitido' : 'Bloqueado'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(user);
                          setShowEditModal(true);
                        }}
                        className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
                        title="Editar Colaborador"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResettingUser(user);
                          setShowResetPasswordModal(true);
                        }}
                        className="p-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 transition-colors"
                        title="Resetear Contraseña"
                      >
                        <KeyRound size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB 3: STOCK INTER-SUCURSAL ═══ */}
      {tabActiva === 'stock-inter' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-[var(--foreground)]">Consulta de Stock Inter-Sucursal</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Verifica la existencia de calzado y tallas disponibles en las demás sucursales de tu empresa.
            </p>
          </div>

          <form onSubmit={handleSearchStockInter} className="flex gap-3 max-w-lg">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-3 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={searchStockQuery}
                onChange={(e) => setSearchStockQuery(e.target.value)}
                placeholder="Buscar por modelo o código (Ej: Oxford, 2026)..."
                className="w-full pl-10 pr-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              />
            </div>
            <button
              type="submit"
              disabled={loadingStock}
              className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loadingStock ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Consultar
            </button>
          </form>

          {loadingStock ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#0F172A]" size={28} />
            </div>
          ) : stockResultados.length === 0 ? (
            <div className="p-8 text-center bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl text-xs text-[var(--muted-foreground)]">
              {searchStockQuery ? 'No se encontraron existencias en las otras sucursales para esta búsqueda.' : 'Ingresa un nombre o código para consultar pares disponibles en otras sucursales.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stockResultados.map((item, idx) => (
                <div key={idx} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-full">
                        Sucursal: {item.sucursalNombre}
                      </span>
                      <div className="font-bold text-sm mt-1">{item.modeloNombre} - {item.color}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">Código: {item.codigo}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[var(--muted-foreground)]">Stock Total</div>
                      <div className="text-lg font-black text-emerald-600 font-mono">{item.stockTotal} pares</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)]">
                    <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                      Tallas Disponibles:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.tallasDisponibles.map((t, tidx) => (
                        <span key={tidx} className="px-2 py-1 bg-[var(--muted)]/50 border border-[var(--border)] rounded-lg text-xs font-mono font-bold">
                          T{t.talla}: <span className="text-emerald-600">{t.cantidad}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAL CREAR SUCURSAL ═══ */}
      {showAddSucursalModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold">
                  <Store size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Nueva Sucursal / Punto de Venta</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Gestión de locales comerciales de calzado</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSucursalModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSucursal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Nombre de la Sucursal</label>
                <input
                  type="text"
                  required
                  value={newSucursal.name}
                  onChange={(e) => setNewSucursal({ ...newSucursal, name: e.target.value })}
                  placeholder="Ej: Calzados Cevallos - Sucursal Mall"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Dirección del Local</label>
                <input
                  type="text"
                  value={newSucursal.direccion}
                  onChange={(e) => setNewSucursal({ ...newSucursal, direccion: e.target.value })}
                  placeholder="Av. Cevallos y Montalvo"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Teléfono</label>
                  <input
                    type="text"
                    value={newSucursal.telefono}
                    onChange={(e) => setNewSucursal({ ...newSucursal, telefono: e.target.value })}
                    placeholder="0991234567"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                  <input
                    type="email"
                    value={newSucursal.email}
                    onChange={(e) => setNewSucursal({ ...newSucursal, email: e.target.value })}
                    placeholder="sucursal@calzados.com"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSucursalModal(false)}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl font-bold text-xs hover:bg-[var(--muted)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Crear Sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL CREAR COLABORADOR ═══ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Registrar Nuevo Colaborador</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Asignación de rol, contraseña y permisos</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Carlos Gómez"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos@calzados.com"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Contraseña Temporal</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Rol en el Negocio</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="ROL_VENDEDOR">Vendedor</option>
                  <option value="ROL_BODEGUERO">Bodeguero</option>
                  <option value="ROL_ADMIN">Administrador</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permiteCambiarPrecio}
                    onChange={(e) => setPermiteCambiarPrecio(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0F172A]"
                  />
                  Permitir modificar precios de venta
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl font-bold text-xs hover:bg-[var(--muted)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Crear Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL EDITAR COLABORADOR ═══ */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-amber-400 font-bold">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Editar Colaborador</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Modificación de permisos, rol y estado</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editingUser.nombre}
                  onChange={(e) => setEditingUser({ ...editingUser, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Rol</label>
                  <select
                    value={editingUser.rol}
                    onChange={(e) => setEditingUser({ ...editingUser, rol: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="ROL_VENDEDOR">Vendedor</option>
                    <option value="ROL_BODEGUERO">Bodeguero</option>
                    <option value="ROL_ADMIN">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Estado</label>
                  <select
                    value={editingUser.activo ? 'ACTIVO' : 'INACTIVO'}
                    onChange={(e) => setEditingUser({ ...editingUser, activo: e.target.value === 'ACTIVO' })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.permiteCambiarPrecio || false}
                    onChange={(e) => setEditingUser({ ...editingUser, permiteCambiarPrecio: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0F172A]"
                  />
                  Permitir modificar precios de venta
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl font-bold text-xs hover:bg-[var(--muted)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL RESETEAR CONTRASEÑA ═══ */}
      {showResetPasswordModal && resettingUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-amber-400 font-bold">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Restablecer Contraseña</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Clave para <strong>{resettingUser.nombre}</strong></p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResettingUser(null);
                  setNewPassword('');
                }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setResettingUser(null);
                    setNewPassword('');
                  }}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl font-bold text-xs hover:bg-[var(--muted)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {savingPassword ? 'Guardando...' : 'Restablecer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
