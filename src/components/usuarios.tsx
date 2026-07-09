"use client";

import { useState, useEffect } from 'react';
import { ApiService } from '../services/api.service';
import { User, Plus, Loader2, ShieldCheck, UserCheck, UserMinus, AlertTriangle } from 'lucide-react';

interface UsuariosProps {
  online: boolean;
}

interface UserListItem {
  id: string;
  email: string;
  nombre: string;
  rol: 'ROL_ADMIN' | 'ROL_VENDEDOR' | 'ROL_BODEGUERO';
  activo: boolean;
  createdAt: string;
}

export default function UsuariosComponent({ online }: UsuariosProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Formulario Nuevo Usuario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'ROL_VENDEDOR' | 'ROL_BODEGUERO' | 'ROL_ADMIN'>('ROL_VENDEDOR');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (online) {
      loadUsers();
    }
  }, [online]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await ApiService.get('/auth/usuarios');
      setUsers(data);
    } catch (err) {
      console.error('Error al cargar personal:', err);
    } finally {
      setLoading(false);
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
      });

      setSuccessMsg('Usuario registrado con éxito.');
      setShowAddModal(false);
      resetForm();
      loadUsers();

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    setErrorMsg('');
    try {
      await ApiService.patch(`/auth/usuarios/${id}/toggle`, {});
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar estado del usuario.');
    }
  };

  const resetForm = () => {
    setNombre('');
    setEmail('');
    setPassword('');
    setRol('ROL_VENDEDOR');
    setErrorMsg('');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ROL_ADMIN':
        return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
      case 'ROL_VENDEDOR':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'ROL_BODEGUERO':
        return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ROL_ADMIN':
        return 'Administrador';
      case 'ROL_VENDEDOR':
        return 'Vendedor';
      case 'ROL_BODEGUERO':
        return 'Bodeguero';
      default:
        return role;
    }
  };

  if (!online) {
    return (
      <div className="p-8 text-center bg-card border border-border border-dashed rounded-2xl flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="text-amber-500" size={48} />
        <h3 className="text-lg font-bold">Módulo fuera de línea</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          La gestión de personal y vendedores requiere una conexión activa con el servidor central para validar las credenciales y crear cuentas de forma segura.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Gestión de Personal & Vendedores</h3>
          <p className="text-xs text-muted-foreground">Control de acceso y asignación de roles operativos de Nexora</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          <span>Registrar Personal</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl flex items-center gap-2">
          <ShieldCheck size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Listado de personal */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="animate-spin text-primary mb-2" size={32} />
          <span className="text-sm">Cargando personal...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-2xl">
          No se encontraron usuarios registrados.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Correo Electrónico</th>
                  <th className="px-6 py-4">Rol Asignado</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 text-xs font-semibold">
                        {u.nombre.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{u.nombre}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-bold ${getRoleBadge(u.rol)}`}>
                        {getRoleLabel(u.rol)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        u.activo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          u.activo 
                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                            : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.activo ? (
                          <><UserMinus size={13} /><span>Desactivar</span></>
                        ) : (
                          <><UserCheck size={13} /><span>Activar</span></>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR USUARIO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Registrar Nuevo Personal</h3>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Mendoza"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email / Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  placeholder="Ej. carlos@nexora.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Contraseña (Mín. 6 caracteres) *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Rol / Permisos del Sistema *</label>
                <select
                  required
                  value={rol}
                  onChange={(e) => setRol(e.target.value as any)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                >
                  <option value="ROL_VENDEDOR">Vendedor (Venta y pedidos)</option>
                  <option value="ROL_BODEGUERO">Bodeguero (Gestión de stock)</option>
                  <option value="ROL_ADMIN">Administrador (Control total)</option>
                </select>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-primary text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /><span>Guardando...</span></>
                ) : (
                  <><User size={14} /><span>Registrar Usuario</span></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
