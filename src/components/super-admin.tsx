"use client";

import { useEffect, useState, useCallback } from "react";
import { ApiService } from "@/services/api.service";
import {
  Building2,
  Plus,
  Users,
  Package,
  ShoppingCart,
  UserCircle,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Truck,
  FileText,
} from "lucide-react";

interface TenantStats {
  users: number;
  models: number;
  clients: number;
  orders: number;
  suppliers?: number;
  saleNotes?: number;
}

interface TenantAdmin {
  id: string;
  email: string;
  nombre: string;
  activo: boolean;
}

interface TenantUser {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  stats: TenantStats;
  admins: TenantAdmin[];
}

interface TenantDetail {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  stats: TenantStats;
  users: TenantUser[];
  businessConfig: {
    nombre: string;
    ruc: string;
    direccion: string;
    telefono?: string;
  } | null;
}

export default function SuperAdminComponent({ online }: { online: boolean }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<TenantDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<{ id: string; name: string; active: boolean } | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Formulario de creación
  const [newTenant, setNewTenant] = useState({
    name: "",
    adminEmail: "",
    adminNombre: "",
    adminPassword: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const fetchTenants = useCallback(async () => {
    if (!online) return;
    setLoading(true);
    try {
      const data = await ApiService.get("/tenants");
      setTenants(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cargar tenants");
    } finally {
      setLoading(false);
    }
  }, [online]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Auto-clear messages
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(""), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setErrorMsg("");
    try {
      await ApiService.post("/tenants", newTenant);
      setSuccessMsg(`Tenant "${newTenant.name}" creado exitosamente.`);
      setShowCreateModal(false);
      setNewTenant({ name: "", adminEmail: "", adminNombre: "", adminPassword: "" });
      await fetchTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear el tenant");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleTenant = async () => {
    if (!confirmToggle) return;
    setToggleLoading(true);
    try {
      const result = await ApiService.patch(`/tenants/${confirmToggle.id}/toggle`, {});
      setSuccessMsg(
        result.active
          ? `Tenant "${confirmToggle.name}" reactivado.`
          : `Tenant "${confirmToggle.name}" desactivado.`
      );
      setConfirmToggle(null);
      await fetchTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cambiar estado del tenant");
    } finally {
      setToggleLoading(false);
    }
  };

  const handleViewDetail = async (tenantId: string) => {
    setLoadingDetail(true);
    setShowDetailModal(true);
    try {
      const data = await ApiService.get(`/tenants/${tenantId}`);
      setSelectedTenantDetail(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cargar detalles");
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getRolLabel = (rol: string) => {
    switch (rol) {
      case "ROL_SUPER_ADMIN": return "Super Admin";
      case "ROL_ADMIN": return "Administrador";
      case "ROL_VENDEDOR": return "Vendedor";
      case "ROL_BODEGUERO": return "Bodeguero";
      default: return rol;
    }
  };

  const getRolColor = (rol: string) => {
    switch (rol) {
      case "ROL_SUPER_ADMIN": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "ROL_ADMIN": return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "ROL_VENDEDOR": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "ROL_BODEGUERO": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-3">
            <Building2 size={24} className="text-[var(--primary)]" />
            Gestión de Tenants
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Administra las organizaciones y sus administradores.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!online}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
        >
          <Plus size={16} />
          Nuevo Tenant
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-xl flex items-center gap-2 animate-in">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm rounded-xl flex items-center gap-2">
          <XCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Tenants Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted-foreground)]">
          <Building2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">No hay tenants registrados</p>
          <p className="text-sm">Crea el primer tenant para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className={`bg-[var(--card)] border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all ${
                tenant.active ? "border-[var(--border)]" : "border-rose-500/30 opacity-70"
              }`}
            >
              {/* Tenant header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                      tenant.active
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                        : "bg-slate-500"
                    }`}
                  >
                    {tenant.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{tenant.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tenant.active
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {tenant.active ? "ACTIVO" : "INACTIVO"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewDetail(tenant.id)}
                    className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    title="Ver detalles"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() =>
                      setConfirmToggle({
                        id: tenant.id,
                        name: tenant.name,
                        active: tenant.active,
                      })
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      tenant.active
                        ? "hover:bg-rose-500/10 text-[var(--muted-foreground)] hover:text-rose-500"
                        : "hover:bg-emerald-500/10 text-[var(--muted-foreground)] hover:text-emerald-500"
                    }`}
                    title={tenant.active ? "Desactivar" : "Reactivar"}
                  >
                    {tenant.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-2 bg-[var(--muted)]/50 rounded-lg">
                  <Users size={14} className="mx-auto text-indigo-500 mb-1" />
                  <div className="text-sm font-bold">{tenant.stats.users}</div>
                  <div className="text-[9px] text-[var(--muted-foreground)]">Usuarios</div>
                </div>
                <div className="text-center p-2 bg-[var(--muted)]/50 rounded-lg">
                  <Package size={14} className="mx-auto text-emerald-500 mb-1" />
                  <div className="text-sm font-bold">{tenant.stats.models}</div>
                  <div className="text-[9px] text-[var(--muted-foreground)]">Modelos</div>
                </div>
                <div className="text-center p-2 bg-[var(--muted)]/50 rounded-lg">
                  <UserCircle size={14} className="mx-auto text-amber-500 mb-1" />
                  <div className="text-sm font-bold">{tenant.stats.clients}</div>
                  <div className="text-[9px] text-[var(--muted-foreground)]">Clientes</div>
                </div>
                <div className="text-center p-2 bg-[var(--muted)]/50 rounded-lg">
                  <ShoppingCart size={14} className="mx-auto text-purple-500 mb-1" />
                  <div className="text-sm font-bold">{tenant.stats.orders}</div>
                  <div className="text-[9px] text-[var(--muted-foreground)]">Pedidos</div>
                </div>
              </div>

              {/* Admins */}
              <div className="border-t border-[var(--border)] pt-3">
                <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                  Administradores
                </div>
                {tenant.admins.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">Sin administradores</p>
                ) : (
                  <div className="space-y-1.5">
                    {tenant.admins.map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500 text-[10px] font-bold">
                            {admin.nombre.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium">{admin.nombre}</span>
                            <span className="text-[var(--muted-foreground)] ml-2">{admin.email}</span>
                          </div>
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            admin.activo ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
                Creado: {new Date(tenant.createdAt).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Modal: Crear Tenant ═══ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 size={20} className="text-[var(--primary)]" />
                Crear Nuevo Tenant
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Se creará una organización con su administrador inicial.
              </p>
            </div>
            <form onSubmit={handleCreateTenant} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  required
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="Ej: Calzado Don Pepe"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nombre del Administrador
                </label>
                <input
                  type="text"
                  required
                  value={newTenant.adminNombre}
                  onChange={(e) => setNewTenant({ ...newTenant, adminNombre: e.target.value })}
                  placeholder="Ej: Pedro Pérez"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Email del Administrador
                </label>
                <input
                  type="email"
                  required
                  value={newTenant.adminEmail}
                  onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })}
                  placeholder="admin@negocio.com"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Contraseña Inicial
                </label>
                <input
                  type="password"
                  required
                  value={newTenant.adminPassword}
                  onChange={(e) => setNewTenant({ ...newTenant, adminPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createLoading && <Loader2 size={14} className="animate-spin" />}
                  {createLoading ? "Creando..." : "Crear Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Modal: Confirmar Toggle ═══ */}
      {confirmToggle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  confirmToggle.active ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                }`}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  {confirmToggle.active ? "Desactivar Tenant" : "Reactivar Tenant"}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {confirmToggle.active
                    ? `Se desactivarán todos los usuarios de "${confirmToggle.name}".`
                    : `Se reactivarán los administradores de "${confirmToggle.name}".`}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmToggle(null)}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleTenant}
                disabled={toggleLoading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  confirmToggle.active
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                }`}
              >
                {toggleLoading && <Loader2 size={14} className="animate-spin" />}
                {confirmToggle.active ? "Desactivar" : "Reactivar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal: Detalle Tenant ═══ */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
              </div>
            ) : selectedTenantDetail ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--card)] z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${
                        selectedTenantDetail.active
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                          : "bg-slate-500"
                      }`}
                    >
                      {selectedTenantDetail.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">{selectedTenantDetail.name}</h2>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedTenantDetail.active
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {selectedTenantDetail.active ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedTenantDetail(null);
                    }}
                    className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Business Config */}
                  {selectedTenantDetail.businessConfig && (
                    <div className="p-4 bg-[var(--muted)]/30 rounded-xl border border-[var(--border)]">
                      <h3 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                        Configuración del Negocio
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-[var(--muted-foreground)] text-xs">RUC:</span>
                          <div className="font-medium">{selectedTenantDetail.businessConfig.ruc}</div>
                        </div>
                        <div>
                          <span className="text-[var(--muted-foreground)] text-xs">Dirección:</span>
                          <div className="font-medium">{selectedTenantDetail.businessConfig.direccion}</div>
                        </div>
                        {selectedTenantDetail.businessConfig.telefono && (
                          <div>
                            <span className="text-[var(--muted-foreground)] text-xs">Teléfono:</span>
                            <div className="font-medium">{selectedTenantDetail.businessConfig.telefono}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div>
                    <h3 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                      Estadísticas
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        { label: "Usuarios", value: selectedTenantDetail.stats.users, icon: Users, color: "text-indigo-500" },
                        { label: "Modelos", value: selectedTenantDetail.stats.models, icon: Package, color: "text-emerald-500" },
                        { label: "Clientes", value: selectedTenantDetail.stats.clients, icon: UserCircle, color: "text-amber-500" },
                        { label: "Pedidos", value: selectedTenantDetail.stats.orders, icon: ShoppingCart, color: "text-purple-500" },
                        { label: "Proveedores", value: selectedTenantDetail.stats.suppliers ?? 0, icon: Truck, color: "text-cyan-500" },
                        { label: "Notas Venta", value: selectedTenantDetail.stats.saleNotes ?? 0, icon: FileText, color: "text-rose-500" },
                      ].map((stat) => (
                        <div key={stat.label} className="text-center p-3 bg-[var(--muted)]/50 rounded-xl">
                          <stat.icon size={16} className={`mx-auto ${stat.color} mb-1`} />
                          <div className="text-lg font-bold">{stat.value}</div>
                          <div className="text-[9px] text-[var(--muted-foreground)]">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Users Table */}
                  <div>
                    <h3 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                      Usuarios ({selectedTenantDetail.users.length})
                    </h3>
                    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] text-xs">
                            <th className="text-left px-4 py-2.5 font-semibold">Nombre</th>
                            <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                            <th className="text-left px-4 py-2.5 font-semibold">Rol</th>
                            <th className="text-center px-4 py-2.5 font-semibold">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTenantDetail.users.map((user) => (
                            <tr key={user.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/30">
                              <td className="px-4 py-2.5 font-medium">{user.nombre}</td>
                              <td className="px-4 py-2.5 text-[var(--muted-foreground)]">{user.email}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRolColor(user.rol)}`}>
                                  {getRolLabel(user.rol)}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span
                                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                                    user.activo ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                  title={user.activo ? "Activo" : "Inactivo"}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
