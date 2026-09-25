"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ApiService } from "@/services/api.service";
import { formatearEmail, validarEmailEstricto, handleEmailKeyDown } from "@/utils/text-formatters";
import {
  Building2,
  Plus,
  Users,
  Package,
  ShoppingCart,
  UserCircle,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  Truck,
  FileText,
  Pencil,
  Trash2,
  UserPlus,
  Lock,
  KeyRound,
  X,
  ShieldAlert,
  CreditCard,
  Calendar,
  DollarSign,
  Receipt,
  Sparkles,
  Clock,
  Send,
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
  rol: string;
  activo: boolean;
}

interface Tenant {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  plan?: string;
  estadoSuscripcion?: string;
  fechaVencimientoPlan?: string;
  diasRestantes?: number;
  precioMensualPlan?: number;
  stats: TenantStats;
  admins: TenantAdmin[];
}

interface SubscriptionPaymentItem {
  id: string;
  monto: number;
  fechaPago: string;
  fechaInicio: string;
  fechaFin: string;
  periodoMeses: number;
  metodoPago: string;
  plan: string;
  numeroFacturaSri?: string;
  notas?: string;
}

interface TenantDetail {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  plan?: string;
  estadoSuscripcion?: string;
  fechaVencimientoPlan?: string;
  precioMensualPlan?: number;
  stats: TenantStats;
  users: TenantAdmin[];
  businessConfig?: {
    nombre: string;
    ruc: string;
    direccion: string;
    telefono?: string;
  } | null;
  subscriptionPayments?: SubscriptionPaymentItem[];
}

export default function SuperAdminComponent({ online }: { online: boolean }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modales Tenant
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: "",
    adminEmail: "",
    adminNombre: "",
    adminPassword: "",
    plan: "PLAN_COMERCIAL",
    diasPruebaGratis: 15,
    precioMensualPlan: 50,
  });
  const [showPassTenant, setShowPassTenant] = useState(false);
  const [showPassCreateUser, setShowPassCreateUser] = useState(false);
  const [showPassEditUser, setShowPassEditUser] = useState(false);

  // Modal Suscripción & Pagos
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscribingTenant, setSubscribingTenant] = useState<Tenant | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subPayments, setSubPayments] = useState<SubscriptionPaymentItem[]>([]);
  const [newPayment, setNewPayment] = useState<{
    monto: number | string;
    periodoMeses: number;
    metodoPago: string;
    plan: string;
    numeroFacturaSri: string;
    facturaAutorizada: boolean;
    notas: string;
  }>({
    monto: 50,
    periodoMeses: 1,
    metodoPago: "TRANSFERENCIA",
    plan: "PLAN_COMERCIAL",
    numeroFacturaSri: "",
    facturaAutorizada: true,
    notas: "",
  });

  const [showEditTenantModal, setShowEditTenantModal] = useState(false);
  const [editTenantLoading, setEditTenantLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState<{
    id: string;
    name: string;
    plan: string;
    estadoSuscripcion: string;
    precioMensualPlan: number;
    ruc: string;
    direccion: string;
    telefono: string;
  } | null>(null);

  const [confirmToggle, setConfirmToggle] = useState<{ id: string; name: string; active: boolean } | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [confirmDeleteTenant, setConfirmDeleteTenant] = useState<{ id: string; name: string } | null>(null);
  const [deleteTenantLoading, setDeleteTenantLoading] = useState(false);

  // Modales Detalle y Usuarios
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<TenantDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    nombre: "",
    password: "",
    rol: "ROL_ADMIN",
  });

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    id: string;
    nombre: string;
    email: string;
    rol: string;
    activo: boolean;
    password: string;
  } | null>(null);

  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; nombre: string; email: string } | null>(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  // ═══ VALIDACIÓN DE EMAIL ═══
  const validateEmail = (email: string): string => {
    const res = validarEmailEstricto(email);
    return res.valido ? "" : (res.mensaje || "Formato de correo no válido");
  };

  const [adminEmailError, setAdminEmailError] = useState("");
  const [newUserEmailError, setNewUserEmailError] = useState("");
  const [editUserEmailError, setEditUserEmailError] = useState("");

  // Control de Cambios sin Guardar (Dirty Form) y Descarte Seguro
  const initialTenantRef = useRef<string>("");
  const initialUserRef = useRef<string>("");
  const [discardConfirm, setDiscardConfirm] = useState<{ isOpen: boolean; onDiscard: () => void } | null>(null);

  const isCreateTenantDirty = () => {
    return (
      newTenant.name.trim() !== "" ||
      newTenant.adminEmail.trim() !== "" ||
      newTenant.adminNombre.trim() !== "" ||
      newTenant.adminPassword.trim() !== ""
    );
  };

  const isEditTenantDirty = () => {
    if (!editingTenant) return false;
    return JSON.stringify(editingTenant) !== initialTenantRef.current;
  };

  const isCreateUserDirty = () => {
    return (
      newUser.nombre.trim() !== "" ||
      newUser.email.trim() !== "" ||
      newUser.password.trim() !== ""
    );
  };

  const isEditUserDirty = () => {
    if (!editingUser) return false;
    return JSON.stringify(editingUser) !== initialUserRef.current;
  };

  const isSubscriptionDirty = () => {
    return newPayment.notas.trim() !== "" || newPayment.numeroFacturaSri.trim() !== "";
  };

  const requestCloseEditTenant = () => {
    if (isEditTenantDirty()) {
      setDiscardConfirm({
        isOpen: true,
        onDiscard: () => {
          setShowEditTenantModal(false);
          setEditingTenant(null);
          setDiscardConfirm(null);
        },
      });
    } else {
      setShowEditTenantModal(false);
      setEditingTenant(null);
    }
  };

  const requestCloseCreateTenant = () => {
    if (isCreateTenantDirty()) {
      setDiscardConfirm({
        isOpen: true,
        onDiscard: () => {
          setShowCreateModal(false);
          setNewTenant({
            name: "",
            adminEmail: "",
            adminNombre: "",
            adminPassword: "",
            plan: "PLAN_COMERCIAL",
            diasPruebaGratis: 15,
            precioMensualPlan: 50,
          });
          setDiscardConfirm(null);
        },
      });
    } else {
      setShowCreateModal(false);
    }
  };

  const requestCloseCreateUser = () => {
    if (isCreateUserDirty()) {
      setDiscardConfirm({
        isOpen: true,
        onDiscard: () => {
          setShowCreateUserModal(false);
          setNewUser({ email: "", nombre: "", password: "", rol: "ROL_ADMIN" });
          setDiscardConfirm(null);
        },
      });
    } else {
      setShowCreateUserModal(false);
    }
  };

  const requestCloseEditUser = () => {
    if (isEditUserDirty()) {
      setDiscardConfirm({
        isOpen: true,
        onDiscard: () => {
          setShowEditUserModal(false);
          setEditingUser(null);
          setDiscardConfirm(null);
        },
      });
    } else {
      setShowEditUserModal(false);
      setEditingUser(null);
    }
  };

  const requestCloseSubscription = () => {
    if (isSubscriptionDirty()) {
      setDiscardConfirm({
        isOpen: true,
        onDiscard: () => {
          setShowSubscriptionModal(false);
          setSubscribingTenant(null);
          setDiscardConfirm(null);
        },
      });
    } else {
      setShowSubscriptionModal(false);
      setSubscribingTenant(null);
    }
  };

  // Listener para cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (discardConfirm?.isOpen) {
          setDiscardConfirm(null);
          return;
        }
        if (confirmDeleteUser) {
          setConfirmDeleteUser(null);
          return;
        }
        if (confirmDeleteTenant) {
          setConfirmDeleteTenant(null);
          return;
        }
        if (confirmToggle) {
          setConfirmToggle(null);
          return;
        }
        if (showEditUserModal) {
          requestCloseEditUser();
          return;
        }
        if (showCreateUserModal) {
          requestCloseCreateUser();
          return;
        }
        if (showEditTenantModal) {
          requestCloseEditTenant();
          return;
        }
        if (showSubscriptionModal) {
          requestCloseSubscription();
          return;
        }
        if (showCreateModal) {
          requestCloseCreateTenant();
          return;
        }
        if (showDetailModal) {
          setShowDetailModal(false);
          setSelectedTenantDetail(null);
          return;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    discardConfirm,
    confirmDeleteUser,
    confirmDeleteTenant,
    confirmToggle,
    showEditUserModal,
    showCreateUserModal,
    showEditTenantModal,
    showSubscriptionModal,
    showCreateModal,
    showDetailModal,
    editingTenant,
    newTenant,
    newUser,
    editingUser,
    newPayment,
  ]);

  const fetchTenants = useCallback(async () => {
    if (!online) return;
    setLoading(true);
    try {
      const data = await ApiService.get("/tenants");
      setTenants(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cargar los tenants");
    } finally {
      setLoading(false);
    }
  }, [online]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

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

  // ═══ HANDLERS TENANT ═══
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(newTenant.adminEmail);
    if (emailErr) {
      setAdminEmailError(emailErr);
      return;
    }
    setCreateLoading(true);
    setErrorMsg("");
    try {
      await ApiService.post("/tenants", {
        ...newTenant,
        diasPruebaGratis: Number(newTenant.diasPruebaGratis || 0),
        precioMensualPlan: (newTenant.precioMensualPlan as any) !== "" && newTenant.precioMensualPlan !== undefined && newTenant.precioMensualPlan !== null ? Number(newTenant.precioMensualPlan) : 50,
      });
      setSuccessMsg(`Tenant "${newTenant.name}" creado con ${newTenant.plan} y ${newTenant.diasPruebaGratis} días de prueba.`);
      setShowCreateModal(false);
      setAdminEmailError("");
      setNewTenant({
        name: "",
        adminEmail: "",
        adminNombre: "",
        adminPassword: "",
        plan: "PLAN_COMERCIAL",
        diasPruebaGratis: 15,
        precioMensualPlan: 50,
      });
      await fetchTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear el tenant");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEditTenant = (tenant: Tenant) => {
    const initialData = {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan || "PLAN_COMERCIAL",
      estadoSuscripcion: tenant.estadoSuscripcion || "ACTIVA",
      precioMensualPlan: (tenant.precioMensualPlan !== undefined && tenant.precioMensualPlan !== null) ? tenant.precioMensualPlan : 50,
      ruc: "",
      direccion: "",
      telefono: "",
    };
    setEditingTenant(initialData);
    initialTenantRef.current = JSON.stringify(initialData);
    setShowEditTenantModal(true);
    ApiService.get(`/tenants/${tenant.id}`).then((detail) => {
      const fullData = {
        id: tenant.id,
        name: detail.name,
        plan: detail.plan || "PLAN_COMERCIAL",
        estadoSuscripcion: detail.estadoSuscripcion || "ACTIVA",
        precioMensualPlan: (detail.precioMensualPlan !== undefined && detail.precioMensualPlan !== null) ? detail.precioMensualPlan : 50,
        ruc: detail.businessConfig?.ruc || "",
        direccion: detail.businessConfig?.direccion || "",
        telefono: detail.businessConfig?.telefono || "",
      };
      setEditingTenant(fullData);
      initialTenantRef.current = JSON.stringify(fullData);
    }).catch(() => {});
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setEditTenantLoading(true);
    try {
      const updated = await ApiService.patch(`/tenants/${editingTenant.id}`, {
        name: editingTenant.name,
        plan: editingTenant.plan,
        estadoSuscripcion: editingTenant.estadoSuscripcion,
        precioMensualPlan: Number(editingTenant.precioMensualPlan || 0),
        businessConfig: {
          nombre: editingTenant.name,
          ruc: editingTenant.ruc,
          direccion: editingTenant.direccion,
          telefono: editingTenant.telefono,
        },
      });
      setSuccessMsg(`Tenant "${editingTenant.name}" actualizado correctamente.`);
      setShowEditTenantModal(false);
      setEditingTenant(null);
      await fetchTenants();
      if (selectedTenantDetail?.id === updated.id) {
        setSelectedTenantDetail(updated);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar el tenant");
    } finally {
      setEditTenantLoading(false);
    }
  };

  const handleOpenSubscriptionModal = async (tenant: Tenant) => {
    setSubscribingTenant(tenant);
    const defaultMonto = (tenant.precioMensualPlan !== undefined && tenant.precioMensualPlan !== null)
      ? tenant.precioMensualPlan
      : (tenant.plan === "PLAN_BASICO" ? 30 : tenant.plan === "PLAN_MAYORISTA" ? 90 : 50);
    setNewPayment({
      monto: defaultMonto,
      periodoMeses: 1,
      metodoPago: "TRANSFERENCIA",
      plan: tenant.plan || "PLAN_COMERCIAL",
      numeroFacturaSri: "",
      facturaAutorizada: true,
      notas: "",
    });
    setShowSubscriptionModal(true);
    setSubLoading(true);
    try {
      const payments = await ApiService.get(`/tenants/${tenant.id}/subscription-payments`);
      setSubPayments(payments || []);
    } catch {
      setSubPayments([]);
    } finally {
      setSubLoading(false);
    }
  };

  const handleRegisterSubscriptionPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribingTenant) return;
    setSubLoading(true);
    try {
      const payload = {
        ...newPayment,
        monto: Number(newPayment.monto || 0),
      };
      await ApiService.post(`/tenants/${subscribingTenant.id}/subscription-payment`, payload);
      setSuccessMsg(`Pago de $${Number(newPayment.monto || 0).toFixed(2)} registrado para ${subscribingTenant.name}. Vigencia renovada.`);
      const updatedPayments = await ApiService.get(`/tenants/${subscribingTenant.id}/subscription-payments`);
      setSubPayments(updatedPayments || []);
      await fetchTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar el pago");
    } finally {
      setSubLoading(false);
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
      if (selectedTenantDetail?.id === confirmToggle.id) {
        handleViewDetail(confirmToggle.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cambiar estado del tenant");
    } finally {
      setToggleLoading(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!confirmDeleteTenant) return;
    setDeleteTenantLoading(true);
    try {
      await ApiService.delete(`/tenants/${confirmDeleteTenant.id}`);
      setSuccessMsg(`Tenant "${confirmDeleteTenant.name}" fue eliminado permanentemente.`);
      setConfirmDeleteTenant(null);
      if (selectedTenantDetail?.id === confirmDeleteTenant.id) {
        setShowDetailModal(false);
        setSelectedTenantDetail(null);
      }
      await fetchTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar el tenant");
    } finally {
      setDeleteTenantLoading(false);
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

  // ═══ HANDLERS USUARIOS ═══
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantDetail) return;
    const emailErr = validateEmail(newUser.email);
    if (emailErr) {
      setNewUserEmailError(emailErr);
      return;
    }
    setCreateUserLoading(true);
    try {
      await ApiService.post(`/tenants/${selectedTenantDetail.id}/users`, newUser);
      setSuccessMsg(`Usuario "${newUser.nombre}" creado exitosamente.`);
      setShowCreateUserModal(false);
      setNewUserEmailError("");
      setNewUser({ email: "", nombre: "", password: "", rol: "ROL_ADMIN" });
      await handleViewDetail(selectedTenantDetail.id);
      await fetchTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear usuario");
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const emailErr = validateEmail(editingUser.email);
    if (emailErr) {
      setEditUserEmailError(emailErr);
      return;
    }
    setEditUserLoading(true);
    try {
      const payload: any = {
        nombre: editingUser.nombre,
        email: editingUser.email,
        rol: editingUser.rol,
        activo: editingUser.activo,
      };
      if (editingUser.password.trim()) {
        payload.password = editingUser.password.trim();
      }
      await ApiService.patch(`/tenants/users/${editingUser.id}`, payload);
      setSuccessMsg(`Usuario "${editingUser.nombre}" actualizado.`);
      setShowEditUserModal(false);
      setEditUserEmailError("");
      setEditingUser(null);
      if (selectedTenantDetail) {
        await handleViewDetail(selectedTenantDetail.id);
      }
      await fetchTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar usuario");
    } finally {
      setEditUserLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    setDeleteUserLoading(true);
    try {
      await ApiService.delete(`/tenants/users/${confirmDeleteUser.id}`);
      setSuccessMsg(`Usuario "${confirmDeleteUser.nombre}" eliminado.`);
      setConfirmDeleteUser(null);
      if (selectedTenantDetail) {
        await handleViewDetail(selectedTenantDetail.id);
      }
      await fetchTenants();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar el usuario");
    } finally {
      setDeleteUserLoading(false);
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
      case "ROL_SUPER_ADMIN": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "ROL_ADMIN": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
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
          <p className="text-sm text-[var(--muted-foreground)] font-medium flex items-center gap-2">
            <Building2 size={18} className="text-[#0F172A]" />
            Crear, editar, activar/desactivar y administrar organizaciones o usuarios del sistema.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!online}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
        >
          <Plus size={16} />
          Nueva Empresa / Local
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
          <Loader2 size={32} className="animate-spin text-[#0F172A]" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted-foreground)]">
          <Building2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">No hay empresas o locales registrados</p>
          <p className="text-sm">Crea la primera empresa o local para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tenants.map((tenant) => {
            const planBadge =
              tenant.plan === "PLAN_BASICO"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : tenant.plan === "PLAN_MAYORISTA"
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20";

            const planName =
              tenant.plan === "PLAN_BASICO"
                ? "Básico ($30/m)"
                : tenant.plan === "PLAN_MAYORISTA"
                ? "Mayorista ($90/m)"
                : "Comercial ($50/m)";

            const isOverdue = tenant.diasRestantes !== undefined && tenant.diasRestantes < 0;
            const isNearRenewal = tenant.diasRestantes !== undefined && tenant.diasRestantes >= 0 && tenant.diasRestantes <= 3;

            return (
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
                          ? "bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/30 text-amber-400"
                          : "bg-slate-500"
                      }`}
                    >
                      {tenant.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base">{tenant.name}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${planBadge}`}>
                          {planName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            tenant.active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          {tenant.active ? "ACTIVO" : "INACTIVO"}
                        </span>
                        {tenant.estadoSuscripcion === "EN_PRUEBA" && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            PRUEBA GRATIS
                          </span>
                        )}
                        {isOverdue ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                            VENCIDO ({Math.abs(tenant.diasRestantes || 0)}d gracia)
                          </span>
                        ) : isNearRenewal ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Vence en {tenant.diasRestantes}d
                          </span>
                        ) : tenant.diasRestantes !== undefined ? (
                          <span className="text-[9px] font-semibold text-slate-400">
                            {tenant.diasRestantes}d restantes
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Acciones principales */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenSubscriptionModal(tenant)}
                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                      title="Gestionar Suscripción y Facturación"
                    >
                      <CreditCard size={16} />
                    </button>
                    <button
                      onClick={() => handleViewDetail(tenant.id)}
                      className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      title="Ver detalle y usuarios"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleOpenEditTenant(tenant)}
                      className="p-2 rounded-lg hover:bg-amber-500/10 text-[var(--muted-foreground)] hover:text-amber-500 transition-colors"
                      title="Editar Tenant y Negocio"
                    >
                      <Pencil size={16} />
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
                    <button
                      onClick={() => setConfirmDeleteTenant({ id: tenant.id, name: tenant.name })}
                      className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-600 transition-colors"
                      title="Eliminar Tenant Definitivamente"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-2 bg-[var(--muted)]/50 rounded-lg">
                    <Users size={14} className="mx-auto text-amber-500 mb-1" />
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
                    <ShoppingCart size={14} className="mx-auto text-amber-500 mb-1" />
                    <div className="text-sm font-bold">{tenant.stats.orders}</div>
                    <div className="text-[9px] text-[var(--muted-foreground)]">Pedidos</div>
                  </div>
                </div>

                {/* Admins list */}
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
                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 text-[10px] font-bold">
                              {admin.nombre.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium">{admin.nombre}</span>
                              <span className="text-[var(--muted-foreground)] ml-2">{admin.email}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingUser({
                                  id: admin.id,
                                  nombre: admin.nombre,
                                  email: admin.email,
                                  rol: "ROL_ADMIN",
                                  activo: admin.activo,
                                  password: "",
                                });
                                setShowEditUserModal(true);
                              }}
                              className="p-1 rounded hover:bg-[var(--muted)] text-amber-500 transition-colors"
                              title="Editar Administrador"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteUser({ id: admin.id, nombre: admin.nombre, email: admin.email })}
                              className="p-1 rounded hover:bg-rose-500/10 text-rose-500 transition-colors"
                              title="Eliminar Administrador"
                            >
                              <Trash2 size={13} />
                            </button>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                admin.activo ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                  <span>
                    Creado: {new Date(tenant.createdAt).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {tenant.fechaVencimientoPlan && (
                    <span className="font-mono">
                      Vence: {new Date(tenant.fechaVencimientoPlan).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL: CREAR TENANT / EMPRESA ═══ */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) requestCloseCreateTenant(); }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Building2 size={20} className="text-[#0F172A]" />
                  Crear Nueva Empresa
                </h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Registra una nueva organización con su administrador principal.
                </p>
              </div>
              <button
                type="button"
                onClick={requestCloseCreateTenant}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTenant} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nombre de la Empresa / Organización *
                </label>
                <input
                  type="text"
                  required
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="Ej: Calzados Tungurahua"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Plan Contratado
                </label>
                <select
                  value={newTenant.plan}
                  onChange={(e) => {
                    const planVal = e.target.value;
                    const precioDefecto = planVal === "PLAN_BASICO" ? 30 : planVal === "PLAN_MAYORISTA" ? 90 : 50;
                    setNewTenant({ ...newTenant, plan: planVal, precioMensualPlan: precioDefecto });
                  }}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="PLAN_BASICO">Plan Básico ($30.00/mes - 1 Local, 3 Usuarios)</option>
                  <option value="PLAN_COMERCIAL">Plan Comercial ($50.00/mes - 3 Locales, 10 Usuarios)</option>
                  <option value="PLAN_MAYORISTA">Plan Mayorista ($90.00/mes - Locales y Usuarios Ilimitados)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Todos los planes incluyen ciclo comercial completo (Compras, Curvas, Stock, POS, Cobranzas y Reportes).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Días de Prueba Gratis
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={newTenant.diasPruebaGratis === ("" as any) ? "" : newTenant.diasPruebaGratis}
                    onChange={(e) => setNewTenant({ ...newTenant, diasPruebaGratis: e.target.value === "" ? ("" as any) : Number(e.target.value) })}
                    placeholder="15"
                    className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Precio Mensual ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTenant.precioMensualPlan === ("" as any) || newTenant.precioMensualPlan === 0 || (newTenant.precioMensualPlan as any) === "0" ? "" : newTenant.precioMensualPlan}
                    onChange={(e) => setNewTenant({ ...newTenant, precioMensualPlan: e.target.value as any })}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nombre del Administrador *
                </label>
                <input
                  type="text"
                  required
                  value={newTenant.adminNombre}
                  onChange={(e) => setNewTenant({ ...newTenant, adminNombre: e.target.value })}
                  placeholder="Ej: Pedro Pérez"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Email del Administrador *
                </label>
                <input
                  type="email"
                  required
                  value={newTenant.adminEmail}
                  onKeyDown={handleEmailKeyDown}
                  onChange={(e) => {
                    const val = formatearEmail(e.target.value);
                    setNewTenant({ ...newTenant, adminEmail: val });
                    setAdminEmailError(val.trim() ? validateEmail(val) : "");
                  }}
                  onBlur={() => {
                    if (newTenant.adminEmail.trim()) setAdminEmailError(validateEmail(newTenant.adminEmail));
                  }}
                  placeholder="admin@negocio.com"
                  className={`w-full px-3 py-2.5 bg-[var(--muted)] border rounded-lg text-sm focus:outline-none transition-colors ${
                    adminEmailError 
                      ? "border-red-500 focus:border-red-500 bg-red-500/5 ring-1 ring-red-500/20 text-red-600 dark:text-red-400" 
                      : "border-[var(--border)] focus:border-[#0F172A]"
                  }`}
                />
                {adminEmailError && (
                  <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1.5 animate-fadeIn">
                    <AlertTriangle size={13} className="shrink-0 text-red-500" /> {adminEmailError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Contraseña Inicial *
                </label>
                <div className="relative">
                  <input
                    type={showPassTenant ? "text" : "password"}
                    required
                    value={newTenant.adminPassword}
                    onChange={(e) => setNewTenant({ ...newTenant, adminPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassTenant(!showPassTenant)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    title={showPassTenant ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassTenant ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={requestCloseCreateTenant}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {createLoading && <Loader2 size={14} className="animate-spin" />}
                  {createLoading ? "Creando..." : "Crear Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: EDITAR EMPRESA / PLAN ═══ */}
      {showEditTenantModal && editingTenant && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) requestCloseEditTenant(); }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Pencil size={20} className="text-amber-500" />
                  Editar Empresa y Plan
                </h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Modifica el nombre, plan contratado y datos comerciales.
                </p>
              </div>
              <button
                type="button"
                onClick={requestCloseEditTenant}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateTenant} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nombre de la Organización
                </label>
                <input
                  type="text"
                  required
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Plan
                  </label>
                  <select
                    value={editingTenant.plan}
                    onChange={(e) => setEditingTenant({ ...editingTenant, plan: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
                  >
                    <option value="PLAN_BASICO">Plan Básico</option>
                    <option value="PLAN_COMERCIAL">Plan Comercial</option>
                    <option value="PLAN_MAYORISTA">Plan Mayorista</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Estado Suscripción
                  </label>
                  <select
                    value={editingTenant.estadoSuscripcion}
                    onChange={(e) => setEditingTenant({ ...editingTenant, estadoSuscripcion: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
                  >
                    <option value="EN_PRUEBA">En Prueba</option>
                    <option value="ACTIVA">Activa</option>
                    <option value="GRACIA">Gracia</option>
                    <option value="SUSPENDIDA">Suspendida</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Precio Mensual ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingTenant.precioMensualPlan === ("" as any) || editingTenant.precioMensualPlan === 0 || (editingTenant.precioMensualPlan as any) === "0" ? "" : editingTenant.precioMensualPlan}
                  onChange={(e) => setEditingTenant({ ...editingTenant, precioMensualPlan: e.target.value as any })}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  RUC del Negocio
                </label>
                <input
                  type="text"
                  value={editingTenant.ruc}
                  onChange={(e) => setEditingTenant({ ...editingTenant, ruc: e.target.value })}
                  placeholder="1792945281001"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Dirección Comercial
                </label>
                <input
                  type="text"
                  value={editingTenant.direccion}
                  onChange={(e) => setEditingTenant({ ...editingTenant, direccion: e.target.value })}
                  placeholder="Av. Amazonas N24-123"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={editingTenant.telefono}
                  onChange={(e) => setEditingTenant({ ...editingTenant, telefono: e.target.value })}
                  placeholder="0991234567"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A] transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={requestCloseEditTenant}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editTenantLoading}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {editTenantLoading && <Loader2 size={14} className="animate-spin" />}
                  {editTenantLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: GESTIÓN DE SUSCRIPCIÓN Y PAGOS ═══ */}
      {showSubscriptionModal && subscribingTenant && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) requestCloseSubscription(); }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)] bg-[#0F172A] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Suscripción y Licenciamiento Super Admin</h3>
                  <p className="text-xs text-slate-300 mt-0.5">{subscribingTenant.name}</p>
                </div>
              </div>
              <button
                onClick={requestCloseSubscription}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Resumen del Plan Actual */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Plan Actual</span>
                  <span className="text-base font-black text-white">{subscribingTenant.plan || "PLAN_COMERCIAL"}</span>
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                    Tarifa: ${(subscribingTenant.precioMensualPlan !== undefined && subscribingTenant.precioMensualPlan !== null ? Number(subscribingTenant.precioMensualPlan) : 50).toFixed(2)} / mes
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Vigencia Actual</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {subscribingTenant.fechaVencimientoPlan
                      ? new Date(subscribingTenant.fechaVencimientoPlan).toLocaleDateString("es-EC")
                      : "Sin fecha"}
                  </span>
                  <span className="text-xs block text-slate-400 mt-0.5">
                    {subscribingTenant.diasRestantes !== undefined
                      ? subscribingTenant.diasRestantes >= 0
                        ? `${subscribingTenant.diasRestantes} días restantes`
                        : `Vencido hace ${Math.abs(subscribingTenant.diasRestantes)} días`
                      : ""}
                  </span>
                </div>
              </div>

              {/* Formulario de Registro de Cobro / Renovación */}
              <form onSubmit={handleRegisterSubscriptionPayment} className="space-y-4 bg-black/20 p-4 rounded-2xl border border-[var(--border)]">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <DollarSign size={15} /> Registrar Cobro & Renovar Suscripción
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Período a Renovar
                    </label>
                    <select
                      value={newPayment.periodoMeses}
                      onChange={(e) => {
                        const meses = Number(e.target.value);
                        const mensual = subscribingTenant.precioMensualPlan !== undefined && subscribingTenant.precioMensualPlan !== null ? Number(subscribingTenant.precioMensualPlan) : 50;
                        setNewPayment({ ...newPayment, periodoMeses: meses, monto: mensual * meses });
                      }}
                      className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
                    >
                      <option value={1}>1 Mes</option>
                      <option value={3}>3 Meses (Trimestre)</option>
                      <option value={6}>6 Meses (Semestre)</option>
                      <option value={12}>12 Meses (Anual)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Monto Total ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPayment.monto === "" || newPayment.monto === 0 || newPayment.monto === "0" ? "" : newPayment.monto}
                      onChange={(e) => setNewPayment({ ...newPayment, monto: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm font-bold focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Método de Pago
                    </label>
                    <select
                      value={newPayment.metodoPago}
                      onChange={(e) => setNewPayment({ ...newPayment, metodoPago: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
                    >
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="DEPOSITO">Depósito Bancario</option>
                      <option value="TARJETA">Tarjeta de Crédito</option>
                      <option value="EFECTIVO">Efectivo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Comprobante / Referencia (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newPayment.numeroFacturaSri}
                      onChange={(e) => setNewPayment({ ...newPayment, numeroFacturaSri: e.target.value })}
                      placeholder="001-001-000000123"
                      className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Observación / Detalle de Pago
                    </label>
                    <input
                      type="text"
                      value={newPayment.notas}
                      onChange={(e) => setNewPayment({ ...newPayment, notas: e.target.value })}
                      placeholder="Ej: Comprobante Transf. #84920 Pichincha"
                      className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={subLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {subLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  <span>Registrar Pago y Extender Vigencia</span>
                </button>
              </form>

              {/* Historial de Pagos del Tenant */}
              <div>
                <h4 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Receipt size={14} /> Historial de Pagos de Suscripción ({subPayments.length})
                </h4>

                {subPayments.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] py-4 text-center bg-[var(--muted)]/20 rounded-xl">
                    No hay pagos registrados para este cliente aún.
                  </p>
                ) : (
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[var(--muted)]/50 text-[var(--muted-foreground)]">
                          <th className="text-left px-3 py-2 font-semibold">Fecha Pago</th>
                          <th className="text-left px-3 py-2 font-semibold">Período</th>
                          <th className="text-right px-3 py-2 font-semibold">Monto</th>
                          <th className="text-left px-3 py-2 font-semibold">Método</th>
                          <th className="text-left px-3 py-2 font-semibold">Comprobante</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subPayments.map((pay) => (
                          <tr key={pay.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/20">
                            <td className="px-3 py-2 font-mono">{new Date(pay.fechaPago).toLocaleDateString("es-EC")}</td>
                            <td className="px-3 py-2">
                              {pay.periodoMeses} mes(es) ({new Date(pay.fechaInicio).toLocaleDateString("es-EC")} - {new Date(pay.fechaFin).toLocaleDateString("es-EC")})
                            </td>
                            <td className="px-3 py-2 text-right font-black text-emerald-400">
                              ${pay.monto.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 font-semibold">{pay.metodoPago}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-300">
                              {pay.numeroFacturaSri ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> {pay.numeroFacturaSri}
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIRMACIÓN: TOGGLE TENANT ═══ */}
      {confirmToggle && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmToggle(null); }}
        >
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
                className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleTenant}
                disabled={toggleLoading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
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

      {/* ═══ MODAL CONFIRMACIÓN: ELIMINAR TENANT ═══ */}
      {confirmDeleteTenant && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDeleteTenant(null); }}
        >
          <div className="bg-[var(--card)] border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 className="font-bold text-base text-rose-500">¿Eliminar Tenant Permanentemente?</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Está a punto de borrar el tenant <strong className="text-[var(--foreground)]">"{confirmDeleteTenant.name}"</strong>.
                </p>
              </div>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} /> ADVERTENCIA DE ELIMINACIÓN DE DATOS
              </p>
              <p>
                Esta acción eliminará de forma irreversible la organización, sus administradores, usuarios, catálogo de calzado, clientes, notas de venta y configuraciones.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteTenant(null)}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTenant}
                disabled={deleteTenantLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {deleteTenantLoading && <Loader2 size={14} className="animate-spin" />}
                {deleteTenantLoading ? "Eliminando..." : "Eliminar Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL DETALLE TENANT ═══ */}
      {showDetailModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { 
            if (e.target === e.currentTarget) {
              setShowDetailModal(false);
              setSelectedTenantDetail(null);
            }
          }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-[#0F172A]" />
              </div>
            ) : selectedTenantDetail ? (
              <>
                {/* Header modal */}
                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--card)] z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${
                        selectedTenantDetail.active
                          ? "bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/30 text-amber-400"
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditTenant({ id: selectedTenantDetail.id, name: selectedTenantDetail.name } as any)}
                      className="px-3 py-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil size={14} /> Editar Tenant
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setSelectedTenantDetail(null);
                      }}
                      className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
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
                      Estadísticas Generales
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        { label: "Usuarios", value: selectedTenantDetail.stats.users, icon: Users, color: "text-blue-500" },
                        { label: "Modelos", value: selectedTenantDetail.stats.models, icon: Package, color: "text-emerald-500" },
                        { label: "Clientes", value: selectedTenantDetail.stats.clients, icon: UserCircle, color: "text-amber-500" },
                        { label: "Pedidos", value: selectedTenantDetail.stats.orders, icon: ShoppingCart, color: "text-amber-500" },
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

                  {/* Tabla de Usuarios del Tenant */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Usuarios y Administradores ({selectedTenantDetail.users.length})
                      </h3>
                      <button
                        onClick={() => setShowCreateUserModal(true)}
                        className="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <UserPlus size={14} /> Nuevo Usuario
                      </button>
                    </div>

                    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] text-xs">
                            <th className="text-left px-4 py-2.5 font-semibold">Nombre</th>
                            <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                            <th className="text-left px-4 py-2.5 font-semibold">Rol</th>
                            <th className="text-center px-4 py-2.5 font-semibold">Estado</th>
                            <th className="text-right px-4 py-2.5 font-semibold">Acciones</th>
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
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      const userData = {
                                        id: user.id,
                                        nombre: user.nombre,
                                        email: user.email,
                                        rol: user.rol,
                                        activo: user.activo,
                                        password: "",
                                      };
                                      setEditingUser(userData);
                                      initialUserRef.current = JSON.stringify(userData);
                                      setShowEditUserModal(true);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-500 transition-colors cursor-pointer"
                                    title="Editar Usuario"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setConfirmDeleteUser({
                                        id: user.id,
                                        nombre: user.nombre,
                                        email: user.email,
                                      })
                                    }
                                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                    title="Eliminar Usuario"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
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

      {/* ═══ MODAL: CREAR USUARIO PARA TENANT ═══ */}
      {showCreateUserModal && selectedTenantDetail && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) requestCloseCreateUser(); }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <UserPlus size={20} className="text-[#0F172A]" />
                Agregar Usuario a {selectedTenantDetail.name}
              </h2>
              <button
                type="button"
                onClick={requestCloseCreateUser}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={newUser.nombre}
                  onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onKeyDown={handleEmailKeyDown}
                  onChange={(e) => {
                    const val = formatearEmail(e.target.value);
                    setNewUser({ ...newUser, email: val });
                    setNewUserEmailError(val.trim() ? validateEmail(val) : "");
                  }}
                  onBlur={() => {
                    if (newUser.email.trim()) setNewUserEmailError(validateEmail(newUser.email));
                  }}
                  placeholder="usuario@negocio.com"
                  className={`w-full px-3 py-2.5 bg-[var(--muted)] border rounded-lg text-sm focus:outline-none transition-colors ${
                    newUserEmailError 
                      ? "border-red-500 focus:border-red-500 bg-red-500/5 ring-1 ring-red-500/20 text-red-600 dark:text-red-400" 
                      : "border-[var(--border)] focus:border-[#0F172A]"
                  }`}
                />
                {newUserEmailError && (
                  <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1.5 animate-fadeIn">
                    <AlertTriangle size={13} className="shrink-0 text-red-500" /> {newUserEmailError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Rol del Usuario
                </label>
                <select
                  value={newUser.rol}
                  onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="ROL_ADMIN">Administrador de Tenant</option>
                  <option value="ROL_VENDEDOR">Vendedor</option>
                  <option value="ROL_BODEGUERO">Bodeguero</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPassCreateUser ? "text" : "password"}
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassCreateUser(!showPassCreateUser)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    title={showPassCreateUser ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassCreateUser ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={requestCloseCreateUser}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createUserLoading}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {createUserLoading && <Loader2 size={14} className="animate-spin" />}
                  {createUserLoading ? "Creando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: EDITAR USUARIO ═══ */}
      {showEditUserModal && editingUser && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) requestCloseEditUser(); }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Pencil size={20} className="text-amber-500" />
                Editar Usuario
              </h2>
              <button
                type="button"
                onClick={requestCloseEditUser}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.nombre}
                  onChange={(e) => setEditingUser({ ...editingUser, nombre: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onKeyDown={handleEmailKeyDown}
                  onChange={(e) => {
                    const val = formatearEmail(e.target.value);
                    setEditingUser({ ...editingUser, email: val });
                    setEditUserEmailError(val.trim() ? validateEmail(val) : "");
                  }}
                  onBlur={() => {
                    if (editingUser.email.trim()) setEditUserEmailError(validateEmail(editingUser.email));
                  }}
                  className={`w-full px-3 py-2.5 bg-[var(--muted)] border rounded-lg text-sm focus:outline-none transition-colors ${
                    editUserEmailError 
                      ? "border-red-500 focus:border-red-500 bg-red-500/5 ring-1 ring-red-500/20 text-red-600 dark:text-red-400" 
                      : "border-[var(--border)] focus:border-[#0F172A]"
                  }`}
                />
                {editUserEmailError && (
                  <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1.5 animate-fadeIn">
                    <AlertTriangle size={13} className="shrink-0 text-red-500" /> {editUserEmailError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Rol
                </label>
                <select
                  value={editingUser.rol}
                  onChange={(e) => setEditingUser({ ...editingUser, rol: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="ROL_ADMIN">Administrador</option>
                  <option value="ROL_VENDEDOR">Vendedor</option>
                  <option value="ROL_BODEGUERO">Bodeguero</option>
                  <option value="ROL_SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Estado
                </label>
                <select
                  value={editingUser.activo ? "true" : "false"}
                  onChange={(e) => setEditingUser({ ...editingUser, activo: e.target.value === "true" })}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Cambiar Contraseña (Opcional)
                </label>
                <div className="relative">
                  <input
                    type={showPassEditUser ? "text" : "password"}
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="Dejar en blanco para mantener contraseña"
                    className="w-full px-3 py-2.5 pr-10 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassEditUser(!showPassEditUser)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    title={showPassEditUser ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassEditUser ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={requestCloseEditUser}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editUserLoading}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {editUserLoading && <Loader2 size={14} className="animate-spin" />}
                  {editUserLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIRMACIÓN: ELIMINAR USUARIO ═══ */}
      {confirmDeleteUser && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDeleteUser(null); }}
        >
          <div className="bg-[var(--card)] border border-rose-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-rose-500">¿Eliminar Usuario?</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Está a punto de eliminar a <strong className="text-[var(--foreground)]">{confirmDeleteUser.nombre}</strong> ({confirmDeleteUser.email}).
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-rose-500">
              Esta acción no se puede deshacer. El usuario perderá el acceso al sistema inmediatamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteUserLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {deleteUserLoading && <Loader2 size={14} className="animate-spin" />}
                {deleteUserLoading ? "Eliminando..." : "Eliminar Usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIRMACIÓN: DESCARTAR CAMBIOS SIN GUARDAR ═══ */}
      {discardConfirm?.isOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDiscardConfirm(null); }}
        >
          <div className="bg-[var(--card)] border border-amber-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--foreground)]">¿Descartar cambios sin guardar?</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Has realizado modificaciones en el formulario. Si cierras ahora, los cambios no guardados se perderán.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDiscardConfirm(null)}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
              >
                Continuar Editando
              </button>
              <button
                type="button"
                onClick={discardConfirm.onDiscard}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Descartar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
