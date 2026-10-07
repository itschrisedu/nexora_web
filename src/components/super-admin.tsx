"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ApiService } from "@/services/api.service";
import { formatearEmail, validarEmailEstricto, handleEmailKeyDown } from "@/utils/text-formatters";
import { useWindowFocusRefresh } from "@/hooks/useWindowFocusRefresh";
import { getStoredPlanPrices } from "@/utils/saas-plans";
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
  Download,
  BarChart3,
  TrendingUp,
  Filter,
  Search,
  FileSpreadsheet,
  RefreshCw,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  descargarReporteSuscripcionesPdf,
  descargarReporteSuscripcionesCsv,
  previsualizarReporteSuscripcionesPdf,
  SuperAdminReportData,
} from "@/services/pdf-super-admin-reporte.service";
import UserAvatar from "@/components/ui/UserAvatar";

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
  esAdminGeneral?: boolean;
  activo: boolean;
}

interface SucursalItem {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  logoUrl?: string | null;
  direccion?: string;
  telefono?: string;
  email?: string;
  stats: TenantStats;
  admins: TenantAdmin[];
}

interface Tenant {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  plan?: string;
  estadoSuscripcion?: string;
  fechaVencimientoPlan?: string;
  diasPruebaGratis?: number;
  diasRestantes?: number;
  maxSucursales?: number;
  maxUsuarios?: number;
  precioMensualPlan?: number;
  logoUrl?: string | null;
  stats: TenantStats;
  admins: TenantAdmin[];
  sucursales?: SucursalItem[];
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
  diasPruebaGratis?: number;
  maxSucursales?: number;
  maxUsuarios?: number;
  precioMensualPlan?: number;
  stats: TenantStats;
  users: TenantAdmin[];
  sucursales?: {
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    businessConfig?: {
      nombre: string;
      ruc: string;
      direccion: string;
      telefono?: string;
      email?: string;
    } | null;
    stats: TenantStats;
    users: TenantAdmin[];
  }[];
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

  // Pestaña Principal Super Admin
  const [activeMainTab, setActiveMainTab] = useState<'EMPRESAS' | 'REPORTES_SUSCRIPCIONES' | 'SUPER_ADMINS'>('EMPRESAS');

  // Estado para Equipo Super Admin
  const [superAdmins, setSuperAdmins] = useState<any[]>([]);
  const [loadingSuperAdmins, setLoadingSuperAdmins] = useState(false);
  const [showCreateSuperAdminModal, setShowCreateSuperAdminModal] = useState(false);
  const [showEditSuperAdminModal, setShowEditSuperAdminModal] = useState(false);
  const [editingSuperAdmin, setEditingSuperAdmin] = useState<any | null>(null);
  const [confirmDeleteSuperAdmin, setConfirmDeleteSuperAdmin] = useState<any | null>(null);
  const [superAdminForm, setSuperAdminForm] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    activo: true,
  });
  const [showPassSuperAdmin, setShowPassSuperAdmin] = useState(false);
  const [showPassSuperAdminConfirm, setShowPassSuperAdminConfirm] = useState(false);
  const [savingSuperAdmin, setSavingSuperAdmin] = useState(false);
  const [deletingSuperAdmin, setDeletingSuperAdmin] = useState(false);

  // Estado para Reporte de Suscripciones y Recaudación
  const [reportData, setReportData] = useState<SuperAdminReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilterPlan, setReportFilterPlan] = useState("TODOS");
  const [reportFilterEstado, setReportFilterEstado] = useState("TODOS");
  const [showReportPreviewModal, setShowReportPreviewModal] = useState(false);
  const [reportPreviewUrl, setReportPreviewUrl] = useState<string | null>(null);

  // Modales Tenant
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: "",
    adminEmail: "",
    adminNombre: "",
    adminPassword: "",
    adminConfirmPassword: "",
    plan: "PLAN_COMERCIAL",
    diasPruebaGratis: 365,
    precioMensualPlan: 29,
  });
  const [showPassTenant, setShowPassTenant] = useState(false);
  const [showPassTenantConfirm, setShowPassTenantConfirm] = useState(false);
  const [showPassCreateUser, setShowPassCreateUser] = useState(false);
  const [showPassCreateUserConfirm, setShowPassCreateUserConfirm] = useState(false);
  const [showPassEditUser, setShowPassEditUser] = useState(false);
  const [showPassEditUserConfirm, setShowPassEditUserConfirm] = useState(false);
  const [createModalError, setCreateModalError] = useState("");
  const [editModalError, setEditModalError] = useState("");

  // Modal Suscripción & Pagos & Renovación de Prueba
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscribingTenant, setSubscribingTenant] = useState<Tenant | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [trialDaysInput, setTrialDaysInput] = useState<number>(365);
  const [trialResetToday, setTrialResetToday] = useState<boolean>(false);
  const [renewingTrial, setRenewingTrial] = useState<boolean>(false);
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
    diasPruebaGratis?: number;
    ruc: string;
    direccion: string;
    telefono: string;
  } | null>(null);

  const [confirmToggle, setConfirmToggle] = useState<{ id: string; name: string; active: boolean } | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [confirmDeleteTenant, setConfirmDeleteTenant] = useState<{ id: string; name: string } | null>(null);
  const [deleteTenantLoading, setDeleteTenantLoading] = useState(false);

  // Búsqueda y Modo de Vista de Empresas y Locales
  const [searchTenant, setSearchTenant] = useState("");
  const [viewModeTenants, setViewModeTenants] = useState<"grid" | "list">("grid");

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
    confirmPassword: "",
    rol: "ROL_ADMIN",
    esAdminGeneral: true,
  });

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    id: string;
    nombre: string;
    email: string;
    rol: string;
    esAdminGeneral?: boolean;
    activo: boolean;
    password: string;
    confirmPassword?: string;
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
            adminConfirmPassword: "",
            plan: "PLAN_COMERCIAL",
            diasPruebaGratis: 15,
            precioMensualPlan: 29,
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
          setNewUser({ email: "", nombre: "", password: "", confirmPassword: "", rol: "ROL_ADMIN", esAdminGeneral: true });
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
        if (showReportPreviewModal) {
          setShowReportPreviewModal(false);
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
    showReportPreviewModal,
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

  const fetchSuperAdmins = useCallback(async () => {
    if (!online) return;
    setLoadingSuperAdmins(true);
    try {
      const data = await ApiService.get('/tenants/super-admins');
      setSuperAdmins(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error cargando super administradores:', err);
      setErrorMsg(err.message || 'Error al cargar lista de Super Administradores');
    } finally {
      setLoadingSuperAdmins(false);
    }
  }, [online]);

  const handleCrearSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminForm.nombre.trim() || !superAdminForm.email.trim() || !superAdminForm.password.trim() || !superAdminForm.confirmPassword.trim()) {
      setErrorMsg('Todos los campos son obligatorios.');
      return;
    }
    if (superAdminForm.password.trim().length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (superAdminForm.password.trim() !== superAdminForm.confirmPassword.trim()) {
      setErrorMsg('Las contraseñas no coinciden. Verifíquelas nuevamente.');
      return;
    }
    setSavingSuperAdmin(true);
    setErrorMsg('');
    try {
      await ApiService.post('/tenants/super-admins', {
        nombre: superAdminForm.nombre.trim(),
        email: superAdminForm.email.trim(),
        password: superAdminForm.password.trim(),
      });
      setSuccessMsg('¡Super Administrador creado exitosamente!');
      setShowCreateSuperAdminModal(false);
      setSuperAdminForm({ nombre: '', email: '', password: '', confirmPassword: '', activo: true });
      await fetchSuperAdmins();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear Super Administrador');
    } finally {
      setSavingSuperAdmin(false);
    }
  };

  const handleActualizarSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSuperAdmin) return;
    if (superAdminForm.password.trim()) {
      if (superAdminForm.password.trim().length < 6) {
        setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (superAdminForm.password.trim() !== (superAdminForm.confirmPassword || '').trim()) {
        setErrorMsg('Las contraseñas no coinciden. Verifíquelas nuevamente.');
        return;
      }
    }
    setSavingSuperAdmin(true);
    setErrorMsg('');
    try {
      await ApiService.patch(`/tenants/super-admins/${editingSuperAdmin.id}`, {
        nombre: superAdminForm.nombre.trim(),
        email: superAdminForm.email.trim(),
        password: superAdminForm.password.trim() || undefined,
        activo: superAdminForm.activo,
      });
      setSuccessMsg('¡Super Administrador actualizado exitosamente!');
      setShowEditSuperAdminModal(false);
      setEditingSuperAdmin(null);
      await fetchSuperAdmins();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar Super Administrador');
    } finally {
      setSavingSuperAdmin(false);
    }
  };

  const handleEliminarSuperAdmin = async () => {
    if (!confirmDeleteSuperAdmin) return;
    setDeletingSuperAdmin(true);
    setErrorMsg('');
    try {
      await ApiService.delete(`/tenants/super-admins/${confirmDeleteSuperAdmin.id}`);
      setSuccessMsg(`Super Administrador "${confirmDeleteSuperAdmin.nombre}" eliminado correctamente.`);
      setConfirmDeleteSuperAdmin(null);
      await fetchSuperAdmins();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar Super Administrador');
    } finally {
      setDeletingSuperAdmin(false);
    }
  };

  // Precarga simultánea al ingresar al módulo de Gestión de Empresas
  useEffect(() => {
    fetchTenants();
    fetchSuperAdmins();
  }, [fetchTenants, fetchSuperAdmins]);

  // Revalidar datos automáticamente al volver a la pestaña + polling suave cada 60s
  useWindowFocusRefresh(
    useCallback(() => { fetchTenants(); fetchSuperAdmins(); }, [fetchTenants, fetchSuperAdmins]),
    { enabled: online, pollingIntervalMs: 60000 },
  );

  // Si cambia a la pestaña de Super Admins, refrescar de fondo
  useEffect(() => {
    if (activeMainTab === 'SUPER_ADMINS') {
      fetchSuperAdmins();
    }
  }, [activeMainTab, fetchSuperAdmins]);

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
    setCreateModalError("");
    const cleanTenantName = (newTenant.name || "").trim();
    if (!cleanTenantName) {
      setCreateModalError("El nombre del negocio es obligatorio.");
      return;
    }
    const tenantExists = tenants.some(
      (t) => t.name.trim().toLowerCase() === cleanTenantName.toLowerCase()
    );
    if (tenantExists) {
      setCreateModalError(`Ya existe un negocio registrado con el nombre "${cleanTenantName}".`);
      return;
    }

    const emailErr = validateEmail(newTenant.adminEmail);
    if (emailErr) {
      setAdminEmailError(emailErr);
      return;
    }
    if (!newTenant.adminPassword || !newTenant.adminConfirmPassword) {
      setCreateModalError("Debe ingresar y confirmar la contraseña del administrador.");
      return;
    }
    if (newTenant.adminPassword.length < 6) {
      setCreateModalError("La contraseña del administrador debe tener al menos 6 caracteres.");
      return;
    }
    if (newTenant.adminPassword !== newTenant.adminConfirmPassword) {
      setCreateModalError("Las contraseñas no coinciden. Verifíquelas nuevamente.");
      return;
    }
    setCreateLoading(true);
    setCreateModalError("");
    try {
      await ApiService.post("/tenants", {
        ...newTenant,
        diasPruebaGratis: Number(newTenant.diasPruebaGratis || 0),
        precioMensualPlan: (newTenant.precioMensualPlan as any) !== "" && newTenant.precioMensualPlan !== undefined && newTenant.precioMensualPlan !== null ? Number(newTenant.precioMensualPlan) : 29,
      });
      setSuccessMsg(`Tenant "${newTenant.name}" creado con ${newTenant.plan} y ${newTenant.diasPruebaGratis} días de prueba.`);
      setShowCreateModal(false);
      setCreateModalError("");
      setAdminEmailError("");
      setNewTenant({
        name: "",
        adminEmail: "",
        adminNombre: "",
        adminPassword: "",
        adminConfirmPassword: "",
        plan: "PLAN_COMERCIAL",
        diasPruebaGratis: 365,
        precioMensualPlan: 29,
      });
      await fetchTenants();
    } catch (err: any) {
      setCreateModalError(err.message || "Error al crear el tenant");
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
      precioMensualPlan: (tenant.precioMensualPlan !== undefined && tenant.precioMensualPlan !== null) ? tenant.precioMensualPlan : 29,
      diasPruebaGratis: tenant.diasPruebaGratis !== undefined ? tenant.diasPruebaGratis : 365,
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
        precioMensualPlan: (detail.precioMensualPlan !== undefined && detail.precioMensualPlan !== null) ? detail.precioMensualPlan : 29,
        diasPruebaGratis: detail.diasPruebaGratis !== undefined ? detail.diasPruebaGratis : 365,
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
    setEditModalError("");

    const cleanTenantName = (editingTenant.name || "").trim();
    if (!cleanTenantName) {
      setEditModalError("El nombre del negocio es obligatorio.");
      return;
    }
    const tenantExists = tenants.some(
      (t) => t.id !== editingTenant.id && t.name.trim().toLowerCase() === cleanTenantName.toLowerCase()
    );
    if (tenantExists) {
      setEditModalError(`Ya existe otro negocio registrado con el nombre "${cleanTenantName}".`);
      return;
    }

    setEditTenantLoading(true);
    try {
      const updated = await ApiService.patch(`/tenants/${editingTenant.id}`, {
        name: cleanTenantName,
        plan: editingTenant.plan,
        estadoSuscripcion: editingTenant.estadoSuscripcion,
        precioMensualPlan: Number(editingTenant.precioMensualPlan || 0),
        diasPruebaGratis: Number(editingTenant.diasPruebaGratis || 365),
        businessConfig: {
          nombre: editingTenant.name,
          ruc: editingTenant.ruc,
          direccion: editingTenant.direccion,
          telefono: editingTenant.telefono,
        },
      });
      setSuccessMsg(`Tenant "${editingTenant.name}" actualizado correctamente.`);
      setEditModalError("");
      setShowEditTenantModal(false);
      setEditingTenant(null);
      await fetchTenants();
      if (selectedTenantDetail?.id === updated.id) {
        setSelectedTenantDetail(updated);
      }
    } catch (err: any) {
      setEditModalError(err.message || "Error al actualizar el tenant");
    } finally {
      setEditTenantLoading(false);
    }
  };

  const handleOpenSubscriptionModal = async (tenant: Tenant) => {
    setSubscribingTenant(tenant);
    setTrialDaysInput(365);
    setTrialResetToday(false);
    const configuredPrices = getStoredPlanPrices();
    const defaultMonto = (tenant.precioMensualPlan !== undefined && tenant.precioMensualPlan !== null)
      ? tenant.precioMensualPlan
      : (tenant.plan === "PLAN_BASICO" ? configuredPrices.basico : tenant.plan === "PLAN_MAYORISTA" ? configuredPrices.mayorista : configuredPrices.comercial);
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

  const handleRenewTrial = async (dias: number = 365, resetToday: boolean = false) => {
    if (!subscribingTenant) return;
    setRenewingTrial(true);
    setErrorMsg("");
    try {
      const res = await ApiService.post(`/tenants/${subscribingTenant.id}/renew-trial`, {
        diasExtension: Number(dias || 365),
        reiniciarDesdeHoy: resetToday,
      });
      setSuccessMsg(res.message || `Prueba gratuita renovada exitosamente por ${dias} días.`);
      await fetchTenants();
      const detail = await ApiService.get(`/tenants/${subscribingTenant.id}`);
      setSubscribingTenant((prev) => (prev ? { ...prev, ...detail } : null));
      if (activeMainTab === "REPORTES_SUSCRIPCIONES") {
        fetchSubscriptionReport();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al renovar la prueba gratuita");
    } finally {
      setRenewingTrial(false);
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
      // Recargar los pagos del tenant tras registrar exitosamente
      const detail = await ApiService.get(`/tenants/${subscribingTenant.id}`);
      setSubPayments(detail.subscriptionPayments || []);
      setSuccessMsg("Pago registrado correctamente");
      await fetchTenants();
      if (activeMainTab === 'REPORTES_SUSCRIPCIONES') {
        fetchSubscriptionReport();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar el pago");
    } finally {
      setSubLoading(false);
    }
  };

  const fetchSubscriptionReport = useCallback(async () => {
    if (!online) return;
    setReportLoading(true);
    try {
      const data = await ApiService.get('/tenants/reportes/ingresos-suscripciones');
      setReportData(data);
    } catch (err: any) {
      console.error('Error cargando reporte de suscripciones:', err);
    } finally {
      setReportLoading(false);
    }
  }, [online]);

  useEffect(() => {
    if (activeMainTab === 'REPORTES_SUSCRIPCIONES') {
      fetchSubscriptionReport();
    }
  }, [activeMainTab, fetchSubscriptionReport]);

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
    if (!newUser.password || !newUser.confirmPassword) {
      setErrorMsg("Debe ingresar y confirmar la contraseña.");
      return;
    }
    if (newUser.password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden. Verifíquelas nuevamente.");
      return;
    }
    setCreateUserLoading(true);
    try {
      await ApiService.post(`/tenants/${selectedTenantDetail.id}/users`, {
        nombre: newUser.nombre,
        email: newUser.email,
        password: newUser.password,
        rol: newUser.rol,
        esAdminGeneral: newUser.rol === 'ROL_ADMIN' ? newUser.esAdminGeneral : false,
      });
      setSuccessMsg(`Usuario "${newUser.nombre}" creado exitosamente.`);
      setShowCreateUserModal(false);
      setNewUserEmailError("");
      setNewUser({ email: "", nombre: "", password: "", confirmPassword: "", rol: "ROL_ADMIN", esAdminGeneral: true });
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
    if (editingUser.password.trim()) {
      if (editingUser.password.trim().length < 6) {
        setErrorMsg("La nueva contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (editingUser.password.trim() !== (editingUser.confirmPassword || "").trim()) {
        setErrorMsg("Las contraseñas no coinciden. Verifíquelas nuevamente.");
        return;
      }
    }
    setEditUserLoading(true);
    try {
      const payload: any = {
        nombre: editingUser.nombre,
        email: editingUser.email,
        rol: editingUser.rol,
        activo: editingUser.activo,
        esAdminGeneral: editingUser.rol === 'ROL_ADMIN' ? (editingUser.esAdminGeneral ?? true) : false,
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

  const getRolLabel = (rol: string, esAdminGeneral?: boolean) => {
    switch (rol) {
      case "ROL_SUPER_ADMIN": return "Super Admin";
      case "ROL_ADMIN": return esAdminGeneral ? "Admin General" : "Admin de Sucursal";
      case "ROL_VENDEDOR": return "Vendedor";
      case "ROL_BODEGUERO": return "Bodeguero";
      default: return rol;
    }
  };

  const getRolColor = (rol: string, esAdminGeneral?: boolean) => {
    switch (rol) {
      case "ROL_SUPER_ADMIN": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "ROL_ADMIN": return esAdminGeneral ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "ROL_VENDEDOR": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "ROL_BODEGUERO": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header y Selector de Pestañas Super Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-[var(--muted)]/50 p-1.5 rounded-2xl border border-[var(--border)] flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMainTab('EMPRESAS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'EMPRESAS'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Building2 size={15} />
            <span>Empresas y Locales ({tenants.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMainTab('SUPER_ADMINS');
              fetchSuperAdmins();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'SUPER_ADMINS'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <ShieldAlert size={15} className={activeMainTab === 'SUPER_ADMINS' ? 'text-amber-400' : ''} />
            <span>Equipo Super Admin ({superAdmins.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('REPORTES_SUSCRIPCIONES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'REPORTES_SUSCRIPCIONES'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <BarChart3 size={15} />
            <span>Reportes y Recaudación SaaS</span>
          </button>
        </div>

        {activeMainTab === 'EMPRESAS' && (
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!online}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            Nueva Empresa / Local
          </button>
        )}
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

      {/* VISTA 1: GESTIÓN DE EMPRESAS Y LOCALES */}
      {activeMainTab === 'EMPRESAS' && (() => {
        const tenantsFiltrados = tenants.filter((t) => {
          if (!searchTenant.trim()) return true;
          const q = searchTenant.toLowerCase().trim();
          const matchName = (t.name || "").toLowerCase().includes(q);
          const matchPlan = (t.plan || "").toLowerCase().includes(q);
          const matchAdmin = (t.admins || []).some(
            (a) => (a.nombre || "").toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q)
          );
          const matchSucursal = (t.sucursales || []).some(
            (s) =>
              (s.name || "").toLowerCase().includes(q) ||
              (s.admins || []).some((a) => (a.nombre || "").toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q))
          );
          return matchName || matchPlan || matchAdmin || matchSucursal;
        });

        return (
          <div className="space-y-4">
            {/* BARRA DE BÚSQUEDA Y VISTAS (CUADRÍCULA / LISTA) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--card)] border border-[var(--border)] p-3.5 rounded-2xl shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Buscar empresa por nombre, plan, admin o sucursal..."
                  value={searchTenant}
                  onChange={(e) => setSearchTenant(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-amber-500 transition-colors"
                />
                {searchTenant && (
                  <button
                    type="button"
                    onClick={() => setSearchTenant("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-0.5 rounded-md cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-[11px] text-[var(--muted-foreground)] font-semibold">
                  {tenantsFiltrados.length} {tenantsFiltrados.length === 1 ? "empresa" : "empresas"}
                  {searchTenant.trim() ? ` de ${tenants.length}` : ""}
                </span>

                <div className="flex bg-[var(--background)] p-1 rounded-xl border border-[var(--border)] gap-1">
                  <button
                    type="button"
                    onClick={() => setViewModeTenants("grid")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewModeTenants === "grid"
                        ? "bg-[#0F172A] text-white shadow-xs"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                    title="Vista en Cuadrícula"
                  >
                    <LayoutGrid size={14} />
                    <span className="hidden md:inline">Cuadrícula</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewModeTenants("list")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewModeTenants === "list"
                        ? "bg-[#0F172A] text-white shadow-xs"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                    title="Vista en Lista"
                  >
                    <List size={14} />
                    <span className="hidden md:inline">Lista</span>
                  </button>
                </div>
              </div>
            </div>

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
            ) : tenantsFiltrados.length === 0 ? (
              <div className="text-center py-16 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <Search size={40} className="mx-auto mb-3 text-[var(--muted-foreground)] opacity-40" />
                <p className="text-base font-bold text-[var(--foreground)]">No se encontraron empresas coincidentes</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">No hay resultados para la búsqueda "{searchTenant}"</p>
                <button
                  type="button"
                  onClick={() => setSearchTenant("")}
                  className="mt-4 px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Limpiar Búsqueda
                </button>
              </div>
            ) : viewModeTenants === "grid" ? (
              /* ── MODO CUADRÍCULA (GRID) ── */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {tenantsFiltrados.map((tenant) => {
                  const planBadge =
                    tenant.plan === "PLAN_BASICO"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : tenant.plan === "PLAN_MAYORISTA"
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20";

                  const planName =
                    tenant.plan === "PLAN_BASICO"
                      ? "Plan Básico"
                      : tenant.plan === "PLAN_MAYORISTA"
                      ? "Plan Mayorista"
                      : "Plan Comercial";

                  const isOverdue = tenant.diasRestantes !== undefined && tenant.diasRestantes < 0;
                  const isNearRenewal = tenant.diasRestantes !== undefined && tenant.diasRestantes >= 0 && tenant.diasRestantes <= 3;
                  const numSucursales = tenant.sucursales?.length || 0;

                  return (
                    <div
                      key={tenant.id}
                      className={`bg-[var(--card)] border rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${
                        tenant.active ? "border-[var(--border)]" : "border-rose-500/30 opacity-70"
                      }`}
                    >
                      <div>
                        {/* Tenant header responsive */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border ${
                                tenant.active
                                  ? "bg-gradient-to-br from-slate-900 to-slate-800 border-amber-500/30 text-amber-400 shadow-xs"
                                  : "bg-slate-500 border-slate-600 text-white"
                              }`}
                            >
                              {tenant.logoUrl ? (
                                <img
                                  src={tenant.logoUrl}
                                  alt={tenant.name}
                                  className="w-full h-full object-contain p-0.5 bg-white rounded-xl"
                                />
                              ) : (
                                tenant.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className="font-bold text-base text-[var(--foreground)] break-words leading-tight">{tenant.name}</h3>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${planBadge}`}>
                                  {planName}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                    tenant.active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                  }`}
                                >
                                  {tenant.active ? "ACTIVO" : "INACTIVO"}
                                </span>
                                {tenant.estadoSuscripcion === "EN_PRUEBA" && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                    PRUEBA GRATIS
                                  </span>
                                )}
                                {numSucursales > 0 ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                    1 Matriz + {numSucursales} {numSucursales === 1 ? 'Sucursal' : 'Sucursales'}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] shrink-0">
                                    Matriz Principal (0 Sucursales)
                                  </span>
                                )}
                                {isOverdue ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse shrink-0">
                                    VENCIDO ({Math.abs(tenant.diasRestantes || 0)}d gracia)
                                  </span>
                                ) : isNearRenewal ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                    Vence en {tenant.diasRestantes}d
                                  </span>
                                ) : tenant.diasRestantes !== undefined ? (
                                  <span className="text-[9px] font-semibold text-slate-400 shrink-0">
                                    {tenant.diasRestantes}d restantes
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Acciones principales con contenedor adaptativo */}
                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-start bg-[var(--muted)]/40 sm:bg-transparent p-1 sm:p-0 rounded-xl border border-[var(--border)]/50 sm:border-transparent">
                            <button
                              onClick={() => handleOpenSubscriptionModal(tenant)}
                              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                              title="Gestionar Suscripción y Facturación"
                            >
                              <CreditCard size={15} />
                            </button>
                            <button
                              onClick={() => handleViewDetail(tenant.id)}
                              className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                              title="Ver detalle y usuarios"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEditTenant(tenant)}
                              className="p-2 rounded-lg hover:bg-amber-500/10 text-[var(--muted-foreground)] hover:text-amber-500 transition-colors cursor-pointer"
                              title="Editar Tenant y Negocio"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmToggle({
                                  id: tenant.id,
                                  name: tenant.name,
                                  active: tenant.active,
                                })
                              }
                              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                tenant.active
                                  ? "hover:bg-rose-500/10 text-[var(--muted-foreground)] hover:text-rose-500"
                                  : "hover:bg-emerald-500/10 text-[var(--muted-foreground)] hover:text-emerald-500"
                              }`}
                              title={tenant.active ? "Desactivar" : "Reactivar"}
                            >
                              {tenant.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteTenant({ id: tenant.id, name: tenant.name })}
                              className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Eliminar Tenant Definitivamente"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Stats Grid 2x2 en móvil / 4 columnas en desktop */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
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

                        {/* Admins list con truncate y flex responsive */}
                        <div className="border-t border-[var(--border)] pt-3">
                          <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                            Administradores de la Empresa
                          </div>
                          {tenant.admins.length === 0 ? (
                            <p className="text-xs text-[var(--muted-foreground)]">Sin administradores</p>
                          ) : (
                            <div className="space-y-1.5">
                              {tenant.admins.map((admin) => (
                                <div key={admin.id} className="flex items-center justify-between gap-2 text-xs p-1 rounded-lg hover:bg-[var(--muted)]/30 transition-colors">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 text-[10px] font-bold shrink-0">
                                      {admin.nombre.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-[var(--foreground)] truncate">{admin.nombre}</div>
                                      <div className="text-[10px] text-[var(--muted-foreground)] truncate">{admin.email}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
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
                                      className="p-1 rounded hover:bg-[var(--muted)] text-amber-500 transition-colors cursor-pointer"
                                      title="Editar Administrador"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteUser({ id: admin.id, nombre: admin.nombre, email: admin.email })}
                                      className="p-1 rounded hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                      title="Eliminar Administrador"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        admin.activo ? "bg-emerald-500" : "bg-rose-500"
                                      }`}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Sucursales asociadas a esta Empresa */}
                        {tenant.sucursales && tenant.sucursales.length > 0 && (
                          <div className="border-t border-[var(--border)] pt-3 mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider flex items-center gap-1.5">
                                <Building2 size={13} className="text-emerald-500" />
                                <span>Sucursales Asociadas ({tenant.sucursales.length})</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {tenant.sucursales.map((suc) => (
                                <div
                                  key={suc.id}
                                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs shadow-2xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                                      {suc.name.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-[var(--foreground)] truncate flex items-center gap-1.5">
                                        <span className="truncate">{suc.name}</span>
                                        <span
                                          className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                                            suc.active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                          }`}
                                        >
                                          {suc.active ? "ACTIVA" : "INACTIVA"}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5 truncate mt-0.5">
                                        <span>{suc.stats.users} usr</span>
                                        <span>•</span>
                                        <span>{suc.stats.orders} ped</span>
                                        <span>•</span>
                                        <span>{suc.stats.models} mod</span>
                                        {suc.admins.length > 0 && (
                                          <>
                                            <span>•</span>
                                            <span className="truncate text-slate-400">Encargado: {suc.admins[0].nombre}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleViewDetail(suc.id)}
                                      className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                                      title="Ver detalle de sucursal"
                                    >
                                      <Eye size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmToggle({
                                          id: suc.id,
                                          name: suc.name,
                                          active: suc.active,
                                        })
                                      }
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        suc.active
                                          ? "hover:bg-rose-500/10 text-[var(--muted-foreground)] hover:text-rose-500"
                                          : "hover:bg-emerald-500/10 text-[var(--muted-foreground)] hover:text-emerald-500"
                                      }`}
                                      title={suc.active ? "Desactivar sucursal" : "Reactivar sucursal"}
                                    >
                                      {suc.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
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
            ) : (
              /* ── MODO LISTA (HORIZONTAL LIST ALINEADO CON CSS GRID) ── */
              <div className="space-y-3">
                {tenantsFiltrados.map((tenant) => {
                  const planBadge =
                    tenant.plan === "PLAN_BASICO"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : tenant.plan === "PLAN_MAYORISTA"
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20";

                  const planName =
                    tenant.plan === "PLAN_BASICO"
                      ? "Plan Básico"
                      : tenant.plan === "PLAN_MAYORISTA"
                      ? "Plan Mayorista"
                      : "Plan Comercial";

                  const isOverdue = tenant.diasRestantes !== undefined && tenant.diasRestantes < 0;
                  const isNearRenewal = tenant.diasRestantes !== undefined && tenant.diasRestantes >= 0 && tenant.diasRestantes <= 3;

                  return (
                    <div
                      key={tenant.id}
                      className={`bg-[var(--card)] border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all grid grid-cols-1 lg:grid-cols-12 items-center gap-4 ${
                        tenant.active ? "border-[var(--border)]" : "border-rose-500/30 opacity-70"
                      }`}
                    >
                      {/* Columna 1: Info principal y Empresa con Logo (4 cols) */}
                      <div className="lg:col-span-4 flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border ${
                            tenant.active
                              ? "bg-gradient-to-br from-slate-900 to-slate-800 border-amber-500/30 text-amber-400 shadow-xs"
                              : "bg-slate-500 border-slate-600 text-white"
                          }`}
                        >
                          {tenant.logoUrl ? (
                            <img
                              src={tenant.logoUrl}
                              alt={tenant.name}
                              className="w-full h-full object-contain p-0.5 bg-white rounded-xl"
                            />
                          ) : (
                            tenant.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-bold text-sm text-[var(--foreground)] truncate" title={tenant.name}>
                              {tenant.name}
                            </h3>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${planBadge}`}>
                              {planName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
                                VENCIDO ({Math.abs(tenant.diasRestantes || 0)}d)
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

                      {/* Columna 2: Métricas Rápidas en Subgrid 4 columnas fijas (3 cols) */}
                      <div className="lg:col-span-3 min-w-0">
                        <div className="grid grid-cols-4 gap-1.5 w-full">
                          <div className="flex items-center justify-center gap-1 px-1.5 py-1.5 bg-[var(--muted)]/50 rounded-xl text-xs" title="Usuarios">
                            <Users size={12} className="text-amber-500 shrink-0" />
                            <span className="font-bold text-[var(--foreground)]">{tenant.stats.users}</span>
                            <span className="text-[9px] text-[var(--muted-foreground)]">Usr</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 px-1.5 py-1.5 bg-[var(--muted)]/50 rounded-xl text-xs" title="Modelos de Calzado">
                            <Package size={12} className="text-emerald-500 shrink-0" />
                            <span className="font-bold text-[var(--foreground)]">{tenant.stats.models}</span>
                            <span className="text-[9px] text-[var(--muted-foreground)]">Mod</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 px-1.5 py-1.5 bg-[var(--muted)]/50 rounded-xl text-xs" title="Clientes Registrados">
                            <UserCircle size={12} className="text-amber-500 shrink-0" />
                            <span className="font-bold text-[var(--foreground)]">{tenant.stats.clients}</span>
                            <span className="text-[9px] text-[var(--muted-foreground)]">Cli</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 px-1.5 py-1.5 bg-[var(--muted)]/50 rounded-xl text-xs" title="Pedidos">
                            <ShoppingCart size={12} className="text-amber-500 shrink-0" />
                            <span className="font-bold text-[var(--foreground)]">{tenant.stats.orders}</span>
                            <span className="text-[9px] text-[var(--muted-foreground)]">Ped</span>
                          </div>
                        </div>
                      </div>

                      {/* Columna 3: Administrador Principal Alineado (2 cols) */}
                      <div className="lg:col-span-2 min-w-0 text-xs">
                        <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block mb-0.5">
                          ADMINISTRADOR:
                        </span>
                        {tenant.admins.length > 0 ? (
                          <div className="min-w-0" title={`${tenant.admins[0].nombre} (${tenant.admins[0].email})`}>
                            <div className="font-semibold text-xs text-[var(--foreground)] truncate">
                              {tenant.admins[0].nombre}
                            </div>
                            <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                              {tenant.admins[0].email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--muted-foreground)]">Sin admin</span>
                        )}
                      </div>

                      {/* Columna 4: Fechas (1 col) */}
                      <div className="lg:col-span-1 min-w-0 text-[10px] text-[var(--muted-foreground)] space-y-0.5">
                        <div className="truncate">
                          Creado: <span className="font-semibold text-[var(--foreground)]">{new Date(tenant.createdAt).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "2-digit" })}</span>
                        </div>
                        {tenant.fechaVencimientoPlan && (
                          <div className="truncate">
                            Vence: <span className="font-semibold text-[var(--foreground)]">{new Date(tenant.fechaVencimientoPlan).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "2-digit" })}</span>
                          </div>
                        )}
                      </div>

                      {/* Columna 5: Acciones (2 cols) */}
                      <div className="lg:col-span-2 flex items-center justify-end gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenSubscriptionModal(tenant)}
                          className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                          title="Gestionar Suscripción y Facturación"
                        >
                          <CreditCard size={15} />
                        </button>
                        <button
                          onClick={() => handleViewDetail(tenant.id)}
                          className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                          title="Ver detalle y usuarios"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEditTenant(tenant)}
                          className="p-2 rounded-lg hover:bg-amber-500/10 text-[var(--muted-foreground)] hover:text-amber-500 transition-colors cursor-pointer"
                          title="Editar Tenant y Negocio"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmToggle({
                              id: tenant.id,
                              name: tenant.name,
                              active: tenant.active,
                            })
                          }
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            tenant.active
                              ? "hover:bg-rose-500/10 text-[var(--muted-foreground)] hover:text-rose-500"
                              : "hover:bg-emerald-500/10 text-[var(--muted-foreground)] hover:text-emerald-500"
                          }`}
                          title={tenant.active ? "Desactivar" : "Reactivar"}
                        >
                          {tenant.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteTenant({ id: tenant.id, name: tenant.name })}
                          className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Eliminar Tenant Definitivamente"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* VISTA 2: REPORTES DE SUSCRIPCIONES, PAGOS Y RECAUDACIÓN */}
      {activeMainTab === 'REPORTES_SUSCRIPCIONES' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {reportLoading && !reportData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={32} className="animate-spin text-[#0F172A]" />
              <p className="text-xs text-[var(--muted-foreground)] font-semibold">Generando consolidado financiero de suscripciones...</p>
            </div>
          ) : !reportData ? (
            <div className="p-8 text-center bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <AlertTriangle size={32} className="mx-auto text-amber-500 mb-2" />
              <p className="text-sm font-bold text-[var(--foreground)]">No se pudo cargar el reporte</p>
              <button
                type="button"
                onClick={fetchSubscriptionReport}
                className="mt-3 px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-xl"
              >
                Reintentar
              </button>
            </div>
          ) : (() => {
            const kpis = reportData.kpis || {
              totalRecaudado: 0,
              ingresosMesActual: 0,
              mrrProyectado: 0,
              totalLocales: 0,
              localesAlDia: 0,
              localesPorVencer: 0,
              localesVencidos: 0,
              localesEnPrueba: 0,
            };

            const formatPlanName = (p?: string) => {
              if (p === 'PLAN_BASICO') return 'Plan Básico';
              if (p === 'PLAN_MAYORISTA') return 'Plan Mayorista';
              return 'Plan Comercial';
            };

            // Filtrado interactivo de pagos
            const pagosFiltrados = (reportData.pagos || []).filter((p) => {
              const matchesSearch = !reportSearch.trim() ||
                p.tenantName.toLowerCase().includes(reportSearch.toLowerCase()) ||
                (p.metodoPago && p.metodoPago.toLowerCase().includes(reportSearch.toLowerCase())) ||
                (p.numeroFacturaSri && p.numeroFacturaSri.toLowerCase().includes(reportSearch.toLowerCase()));

              const matchesPlan = reportFilterPlan === 'TODOS' || p.tenantPlan === reportFilterPlan;
              return matchesSearch && matchesPlan;
            });

            // Filtrado interactivo de locales
            const localesFiltrados = (reportData.locales || []).filter((loc) => {
              const matchesSearch = !reportSearch.trim() || loc.name.toLowerCase().includes(reportSearch.toLowerCase());
              const matchesPlan = reportFilterPlan === 'TODOS' || loc.plan === reportFilterPlan;
              const matchesEstado = reportFilterEstado === 'TODOS' || loc.estadoCalculado === reportFilterEstado;
              return matchesSearch && matchesPlan && matchesEstado;
            });

            return (
              <div className="space-y-6">
                {/* Tarjetas de Métricas Principales (KPIs) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between text-[var(--muted-foreground)]">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Recaudación Total</span>
                      <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ${Number(kpis.totalRecaudado || 0).toFixed(2)}
                    </div>
                    <span className="text-[11px] text-[var(--muted-foreground)] mt-1 block">
                      {reportData.pagos?.length || 0} pagos registrados en total
                    </span>
                  </div>

                  <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between text-[var(--muted-foreground)]">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Ingresos Este Mes</span>
                      <DollarSign size={16} className="text-blue-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-[var(--foreground)] font-mono">
                      ${Number(kpis.ingresosMesActual || 0).toFixed(2)}
                    </div>
                    <span className="text-[11px] text-[var(--muted-foreground)] mt-1 block">
                      Mes en curso
                    </span>
                  </div>

                  <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between text-[var(--muted-foreground)]">
                      <span className="text-[11px] font-bold uppercase tracking-wider">MRR Proyectado</span>
                      <Sparkles size={16} className="text-purple-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                      ${Number(kpis.mrrProyectado || 0).toFixed(2)} <span className="text-xs font-semibold text-[var(--muted-foreground)]">/ mes</span>
                    </div>
                    <span className="text-[11px] text-[var(--muted-foreground)] mt-1 block">
                      Ingreso recurrente de {kpis.totalLocales} locales
                    </span>
                  </div>

                  <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between text-[var(--muted-foreground)]">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Estado de Locales</span>
                      <Building2 size={16} className="text-[#0F172A]" />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md text-xs font-bold">
                        {kpis.localesAlDia} Al Día
                      </span>
                      {kpis.localesPorVencer > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-md text-xs font-bold">
                          {kpis.localesPorVencer} Por Vencer
                        </span>
                      )}
                      {kpis.localesVencidos > 0 && (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-md text-xs font-bold">
                          {kpis.localesVencidos} Vencidos
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--muted-foreground)] mt-2 block">
                      {kpis.localesEnPrueba} en período de prueba gratis
                    </span>
                  </div>
                </div>

                {/* Barra de Filtros y Acciones de Descarga */}
                <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <input
                        type="text"
                        placeholder="Buscar por local, método o factura..."
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Filter size={13} className="text-[var(--muted-foreground)]" />
                      <select
                        value={reportFilterPlan}
                        onChange={(e) => setReportFilterPlan(e.target.value)}
                        className="px-2.5 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="TODOS">Todos los Planes</option>
                        <option value="PLAN_BASICO">Plan Básico</option>
                        <option value="PLAN_COMERCIAL">Plan Comercial</option>
                        <option value="PLAN_MAYORISTA">Plan Mayorista</option>
                      </select>

                      <select
                        value={reportFilterEstado}
                        onChange={(e) => setReportFilterEstado(e.target.value)}
                        className="px-2.5 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none"
                      >
                        <option value="TODOS">Todos los Estados</option>
                        <option value="AL_DIA">Al Día</option>
                        <option value="POR_VENCER">Por Vencer (&le; 7 días)</option>
                        <option value="VENCIDO">Vencidos</option>
                        <option value="EN_PRUEBA">En Prueba Gratis</option>
                      </select>
                    </div>
                  </div>

                  {/* Botones de Descarga y Previsualización */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!reportData) return;
                        try {
                          const url = previsualizarReporteSuscripcionesPdf(reportData);
                          setReportPreviewUrl(url);
                          setShowReportPreviewModal(true);
                        } catch (err) {
                          console.error("Error generando previsualización de PDF:", err);
                          setErrorMsg("No se pudo generar la previsualización del reporte");
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Previsualizar Reporte Formal en Pantalla"
                    >
                      <Eye size={14} />
                      <span>Previsualizar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => descargarReporteSuscripcionesPdf(reportData)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Descargar Reporte Formal en PDF"
                    >
                      <Download size={14} />
                      <span>Descargar PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => descargarReporteSuscripcionesCsv(reportData)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Exportar Reporte a Excel / CSV"
                    >
                      <FileSpreadsheet size={14} />
                      <span>Exportar CSV / Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={fetchSubscriptionReport}
                      disabled={reportLoading}
                      className="p-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] rounded-xl transition-all cursor-pointer"
                      title="Actualizar datos"
                    >
                      <RefreshCw size={14} className={reportLoading ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>

                {/* TABLA 1: HISTORIAL CONSOLIDADO DE PAGOS DE SUSCRIPCIÓN */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs overflow-hidden space-y-0">
                  <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
                        <Receipt size={16} className="text-emerald-600" />
                        Historial Consolidado de Pagos de Suscripción ({pagosFiltrados.length})
                      </h3>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Registro oficial de transferencias, depósitos y renovaciones de todos los clientes SaaS.
                      </p>
                    </div>
                  </div>

                  {pagosFiltrados.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                      No hay registros de pagos que coincidan con los filtros aplicados.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                            <th className="p-3.5">Empresa / Local</th>
                            <th className="p-3.5">Plan</th>
                            <th className="p-3.5">Monto ($)</th>
                            <th className="p-3.5">Período</th>
                            <th className="p-3.5">Método</th>
                            <th className="p-3.5">Fecha de Pago</th>
                            <th className="p-3.5">Vigencia Fin</th>
                            <th className="p-3.5">Factura SRI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {pagosFiltrados.map((p) => (
                            <tr key={p.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                              <td className="p-3.5 font-bold text-[var(--foreground)]">
                                {p.tenantName}
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-md font-semibold text-[11px]">
                                  {formatPlanName(p.tenantPlan)}
                                </span>
                              </td>
                              <td className="p-3.5 font-extrabold text-emerald-600 font-mono text-sm">
                                ${Number(p.monto).toFixed(2)}
                              </td>
                              <td className="p-3.5 text-[var(--muted-foreground)]">
                                {p.periodoMeses} mes(es)
                              </td>
                              <td className="p-3.5 font-medium text-[var(--foreground)]">
                                {p.metodoPago || 'TRANSFERENCIA'}
                              </td>
                              <td className="p-3.5 font-mono text-[var(--muted-foreground)]">
                                {p.fechaPago ? new Date(p.fechaPago).toLocaleDateString('es-EC') : '—'}
                              </td>
                              <td className="p-3.5 font-mono font-semibold text-[var(--foreground)]">
                                {p.fechaFin ? new Date(p.fechaFin).toLocaleDateString('es-EC') : '—'}
                              </td>
                              <td className="p-3.5">
                                {p.numeroFacturaSri ? (
                                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-bold bg-slate-500/10 px-1.5 py-0.5 rounded">
                                    {p.numeroFacturaSri}
                                  </span>
                                ) : (
                                  <span className="text-[var(--muted-foreground)] italic">Sin factura</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* TABLA 2: ESTADO Y VIGENCIA DE TODOS LOS LOCALES */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs overflow-hidden space-y-0">
                  <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
                        <Building2 size={16} className="text-[#0F172A]" />
                        Estado de Suscripción y Vencimientos por Local ({localesFiltrados.length})
                      </h3>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Monitoreo de locales al día, próximos vencimientos y acceso a renovación directa.
                      </p>
                    </div>
                  </div>

                  {localesFiltrados.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                      No hay locales que coincidan con los filtros aplicados.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                            <th className="p-3.5">Local / Organización</th>
                            <th className="p-3.5">Plan Asignado</th>
                            <th className="p-3.5">Tarifa Mensual</th>
                            <th className="p-3.5">Estado de Pago</th>
                            <th className="p-3.5">Días Restantes</th>
                            <th className="p-3.5">Vencimiento</th>
                            <th className="p-3.5 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {localesFiltrados.map((loc) => {
                            const tenantObj = tenants.find((t) => t.id === loc.id);

                            return (
                              <tr key={loc.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                                <td className="p-3.5 font-bold text-[var(--foreground)]">
                                  {loc.name}
                                  {tenantObj && !tenantObj.active && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded text-[9px] font-bold">
                                      Desactivado
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {formatPlanName(loc.plan)}
                                  </span>
                                </td>
                                <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                                  ${Number(loc.precioMensualPlan || 0).toFixed(2)} / mes
                                </td>
                                <td className="p-3.5">
                                  {loc.estadoCalculado === 'AL_DIA' && (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                                      <CheckCircle2 size={12} /> Al Día
                                    </span>
                                  )}
                                  {loc.estadoCalculado === 'POR_VENCER' && (
                                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                                      <Clock size={12} /> Por Vencer
                                    </span>
                                  )}
                                  {loc.estadoCalculado === 'VENCIDO' && (
                                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                                      <AlertTriangle size={12} /> Vencido
                                    </span>
                                  )}
                                  {loc.estadoCalculado === 'EN_PRUEBA' && (
                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                                      <Sparkles size={12} /> En Prueba
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 font-mono font-semibold">
                                  {loc.estadoCalculado === 'EN_PRUEBA'
                                    ? 'Prueba Gratis'
                                    : loc.diasRestantes < 0
                                    ? `${Math.abs(loc.diasRestantes)} días vencido`
                                    : `${loc.diasRestantes} días`}
                                </td>
                                <td className="p-3.5 font-mono text-[var(--muted-foreground)]">
                                  {loc.fechaVencimientoPlan
                                    ? new Date(loc.fechaVencimientoPlan).toLocaleDateString('es-EC')
                                    : '—'}
                                </td>
                                <td className="p-3.5 text-right">
                                  {tenantObj && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSubscriptionModal(tenantObj)}
                                      className="px-2.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <CreditCard size={12} />
                                      <span>Registrar Pago</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* VISTA 3: GESTIÓN DE EQUIPO SUPER ADMIN                          */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeMainTab === 'SUPER_ADMINS' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Banner Informativo */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700/50 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  Equipo de Super Administradores NEXORA
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                    {superAdmins.length} {superAdmins.length === 1 ? 'cuenta' : 'cuentas'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Los miembros de este equipo tienen control total sobre la plataforma, creación de empresas y reportes SaaS.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuperAdminForm({ nombre: '', email: '', password: '', confirmPassword: '', activo: true });
                setShowCreateSuperAdminModal(true);
              }}
              disabled={!online}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <UserPlus size={15} />
              <span>+ Nuevo Super Admin</span>
            </button>
          </div>

          {loadingSuperAdmins ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={32} className="animate-spin text-[#0F172A]" />
              <p className="text-xs text-[var(--muted-foreground)] font-semibold">Cargando equipo de Super Administradores...</p>
            </div>
          ) : superAdmins.length === 0 ? (
            <div className="p-12 text-center bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-3">
              <ShieldAlert size={36} className="mx-auto text-amber-500 opacity-60" />
              <h4 className="font-bold text-sm text-[var(--foreground)]">No se encontraron Super Administradores</h4>
              <p className="text-xs text-[var(--muted-foreground)]">Puedes registrar un nuevo Super Administrador con el botón superior.</p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--muted)]/50 border-b border-[var(--border)] text-[var(--muted-foreground)] uppercase text-[10px] tracking-wider font-bold">
                      <th className="p-4">Super Administrador</th>
                      <th className="p-4">Rol en Plataforma</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Fecha de Registro</th>
                      <th className="p-4">Seguridad</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {superAdmins.map((sa) => {
                      const isBloqueado = sa.bloqueadoHasta && new Date(sa.bloqueadoHasta) > new Date();

                      return (
                        <tr key={sa.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                nombre={sa.nombre}
                                email={sa.email}
                                sizeClassName="w-9 h-9"
                                textClassName="text-sm font-black"
                              />
                              <div>
                                <span className="font-bold text-[var(--foreground)] block text-xs">
                                  {sa.nombre}
                                </span>
                                <span className="text-[11px] text-[var(--muted-foreground)] font-mono">
                                  {sa.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1">
                              <ShieldAlert size={12} className="text-blue-500" />
                              Super Admin Global
                            </span>
                          </td>
                          <td className="p-4">
                            {sa.activo ? (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                                <CheckCircle2 size={11} /> Activo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                                <XCircle size={11} /> Inactivo
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-[var(--muted-foreground)] font-mono">
                            {sa.createdAt ? new Date(sa.createdAt).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </td>
                          <td className="p-4">
                            {isBloqueado ? (
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                                <Lock size={11} /> Bloqueado por intentos
                              </span>
                            ) : sa.intentosFallidos > 0 ? (
                              <span className="text-amber-600 text-[11px] font-medium">
                                {sa.intentosFallidos} intento(s) fallido(s)
                              </span>
                            ) : (
                              <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                                <CheckCircle2 size={12} /> Seguro
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSuperAdmin(sa);
                                  setSuperAdminForm({
                                    nombre: sa.nombre,
                                    email: sa.email,
                                    password: '',
                                    confirmPassword: '',
                                    activo: sa.activo,
                                  });
                                  setShowEditSuperAdminModal(true);
                                }}
                                className="p-2 text-[var(--muted-foreground)] hover:text-blue-600 hover:bg-blue-500/10 rounded-xl transition-colors cursor-pointer"
                                title="Editar Super Administrador"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSuperAdmin(sa)}
                                className="p-2 text-[var(--muted-foreground)] hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                                title="Eliminar Super Administrador"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                    const configuredPrices = getStoredPlanPrices();
                    const precioDefecto = planVal === "PLAN_BASICO" ? configuredPrices.basico : planVal === "PLAN_MAYORISTA" ? configuredPrices.mayorista : configuredPrices.comercial;
                    setNewTenant({ ...newTenant, plan: planVal, precioMensualPlan: precioDefecto });
                  }}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="PLAN_BASICO">Plan Básico</option>
                  <option value="PLAN_COMERCIAL">Plan Comercial</option>
                  <option value="PLAN_MAYORISTA">Plan Mayorista</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Todos los planes incluyen ciclo comercial completo (Compras, Curvas, Stock, POS, Cobranzas y Reportes).
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Días de Prueba Gratis
                  </label>
                  <span className="text-[11px] font-bold text-amber-500">
                    Hasta 365 días (1 año) con renovación
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={newTenant.diasPruebaGratis === ("" as any) ? "" : newTenant.diasPruebaGratis}
                      onChange={(e) => setNewTenant({ ...newTenant, diasPruebaGratis: e.target.value === "" ? ("" as any) : Number(e.target.value) })}
                      placeholder="365"
                      className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newTenant.precioMensualPlan === ("" as any) || newTenant.precioMensualPlan === 0 || (newTenant.precioMensualPlan as any) === "0" ? "" : newTenant.precioMensualPlan}
                      onChange={(e) => setNewTenant({ ...newTenant, precioMensualPlan: e.target.value as any })}
                      placeholder="Precio Mensual ($)"
                      className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>
                </div>
                {/* Accesos rápidos de días de prueba */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Preajustes:</span>
                  {[
                    { label: "15 Días", val: 15 },
                    { label: "30 Días", val: 30 },
                    { label: "90 Días (3m)", val: 90 },
                    { label: "180 Días (6m)", val: 180 },
                    { label: "365 Días (1 Año)", val: 365 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setNewTenant({ ...newTenant, diasPruebaGratis: p.val })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        newTenant.diasPruebaGratis === p.val
                          ? "bg-amber-500 text-slate-950 font-black shadow-2xs"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
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
                    minLength={6}
                    value={newTenant.adminPassword}
                    onChange={(e) => setNewTenant({ ...newTenant, adminPassword: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
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

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPassTenantConfirm ? "text" : "password"}
                    required
                    minLength={6}
                    value={newTenant.adminConfirmPassword}
                    onChange={(e) => setNewTenant({ ...newTenant, adminConfirmPassword: e.target.value })}
                    placeholder="Repita la contraseña"
                    className={`w-full px-3 py-2.5 pr-10 bg-[var(--muted)] border rounded-lg text-sm focus:outline-none transition-colors ${
                      newTenant.adminConfirmPassword && newTenant.adminPassword !== newTenant.adminConfirmPassword
                        ? "border-red-500 focus:border-red-500 bg-red-500/5 ring-1 ring-red-500/20"
                        : newTenant.adminConfirmPassword && newTenant.adminPassword === newTenant.adminConfirmPassword
                        ? "border-emerald-500 focus:border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                        : "border-[var(--border)] focus:border-[#0F172A]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassTenantConfirm(!showPassTenantConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    title={showPassTenantConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassTenantConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newTenant.adminConfirmPassword && (
                  <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                    newTenant.adminPassword === newTenant.adminConfirmPassword ? "text-emerald-500" : "text-rose-500"
                  }`}>
                    {newTenant.adminPassword === newTenant.adminConfirmPassword ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
                  </p>
                )}
              </div>

              {/* ── Error de validación dentro del modal ── */}
              {createModalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                  <span>{createModalError}</span>
                </div>
              )}

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
                  disabled={createLoading || !newTenant.adminPassword || !newTenant.adminConfirmPassword || newTenant.adminPassword !== newTenant.adminConfirmPassword || newTenant.adminPassword.length < 6}
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

              <div className="grid grid-cols-2 gap-3">
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
                    Días Prueba / Vigencia
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={editingTenant.diasPruebaGratis === ("" as any) ? "" : editingTenant.diasPruebaGratis}
                    onChange={(e) => setEditingTenant({ ...editingTenant, diasPruebaGratis: e.target.value === "" ? ("" as any) : Number(e.target.value) })}
                    placeholder="365"
                    className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
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

              {/* ── Error de validación dentro del modal ── */}
              {editModalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                  <span>{editModalError}</span>
                </div>
              )}

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
                    Tarifa: ${(subscribingTenant.precioMensualPlan !== undefined && subscribingTenant.precioMensualPlan !== null ? Number(subscribingTenant.precioMensualPlan) : 29).toFixed(2)} / mes
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

              {/* SECCIÓN 1: RENOVAR / EXTENDER PRUEBA GRATUITA */}
              <div className="space-y-3 bg-gradient-to-br from-blue-950/30 via-slate-900/40 to-indigo-950/20 p-4 rounded-2xl border border-blue-500/30 shadow-inner">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Sparkles size={15} /> Renovar / Extender Prueba Gratuita
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Sin cobro obligatorio
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Otorga acceso de prueba por hasta 1 año (365 días) o el plazo que elijas. Al renovar, el local se reactiva automáticamente si estaba suspendido.
                </p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Preajustes rápidos:</span>
                  {[
                    { label: "+15 Días", val: 15 },
                    { label: "+30 Días", val: 30 },
                    { label: "+90 Días (3m)", val: 90 },
                    { label: "+180 Días (6m)", val: 180 },
                    { label: "+365 Días (1 Año)", val: 365 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setTrialDaysInput(preset.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        trialDaysInput === preset.val
                          ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/50"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Días a Extender
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={trialDaysInput}
                      onChange={(e) => setTrialDaysInput(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={trialResetToday}
                        onChange={(e) => setTrialResetToday(e.target.checked)}
                        className="rounded accent-blue-600 cursor-pointer"
                      />
                      <span>Reiniciar conteo desde hoy (si ya venció)</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={renewingTrial || !trialDaysInput || trialDaysInput < 1}
                  onClick={() => handleRenewTrial(trialDaysInput, trialResetToday)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {renewingTrial ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  <span>Aplicar Renovación de Prueba Gratuita (+{trialDaysInput} Días)</span>
                </button>
              </div>

              {/* SECCIÓN 2: FORMULARIO DE REGISTRO DE COBRO / PLAN PAGO */}
              <form onSubmit={handleRegisterSubscriptionPayment} className="space-y-4 bg-black/20 p-4 rounded-2xl border border-[var(--border)]">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <DollarSign size={15} /> Registrar Cobro & Renovar Suscripción Pagada
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
                        const mensual = subscribingTenant.precioMensualPlan !== undefined && subscribingTenant.precioMensualPlan !== null ? Number(subscribingTenant.precioMensualPlan) : 29;
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
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRolColor(user.rol, user.esAdminGeneral)}`}>
                                  {getRolLabel(user.rol, user.esAdminGeneral)}
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
                                        esAdminGeneral: user.esAdminGeneral,
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

                  {/* Sucursales asociadas en el Detalle */}
                  {selectedTenantDetail.sucursales && selectedTenantDetail.sucursales.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Building2 size={14} className="text-emerald-500" />
                        <span>Sucursales de la Empresa ({selectedTenantDetail.sucursales.length})</span>
                      </h3>

                      <div className="space-y-3">
                        {selectedTenantDetail.sucursales.map((suc) => (
                          <div
                            key={suc.id}
                            className="p-4 bg-[var(--muted)]/30 rounded-xl border border-[var(--border)] space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                                  {suc.name.slice(0, 1).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-sm text-[var(--foreground)]">{suc.name}</div>
                                  <div className="text-[10px] text-[var(--muted-foreground)]">
                                    {suc.businessConfig?.direccion || 'Sin dirección'}
                                    {suc.businessConfig?.telefono ? ` • Tel: ${suc.businessConfig.telefono}` : ''}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  suc.active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                }`}
                              >
                                {suc.active ? "ACTIVA" : "INACTIVA"}
                              </span>
                            </div>

                            {/* Mini stats de la sucursal */}
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                              <div className="p-2 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                                <div className="font-bold text-[var(--foreground)]">{suc.stats.users}</div>
                                <div className="text-[9px] text-[var(--muted-foreground)]">Usuarios</div>
                              </div>
                              <div className="p-2 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                                <div className="font-bold text-[var(--foreground)]">{suc.stats.models}</div>
                                <div className="text-[9px] text-[var(--muted-foreground)]">Modelos</div>
                              </div>
                              <div className="p-2 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                                <div className="font-bold text-[var(--foreground)]">{suc.stats.orders}</div>
                                <div className="text-[9px] text-[var(--muted-foreground)]">Pedidos</div>
                              </div>
                              <div className="p-2 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                                <div className="font-bold text-[var(--foreground)]">{suc.stats.clients}</div>
                                <div className="text-[9px] text-[var(--muted-foreground)]">Clientes</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                  value={newUser.rol === 'ROL_ADMIN' ? (newUser.esAdminGeneral ? 'ADMIN_GENERAL' : 'ADMIN_SUCURSAL') : newUser.rol}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ADMIN_GENERAL') {
                      setNewUser({ ...newUser, rol: 'ROL_ADMIN', esAdminGeneral: true });
                    } else if (val === 'ADMIN_SUCURSAL') {
                      setNewUser({ ...newUser, rol: 'ROL_ADMIN', esAdminGeneral: false });
                    } else {
                      setNewUser({ ...newUser, rol: val, esAdminGeneral: false });
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="ADMIN_GENERAL">Admin General (todas las sucursales)</option>
                  <option value="ADMIN_SUCURSAL">Admin de Sucursal (solo sucursal asignada)</option>
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
                    minLength={6}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
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
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPassCreateUserConfirm ? "text" : "password"}
                    required
                    minLength={6}
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    placeholder="Repita la contraseña"
                    className={`w-full px-3 py-2.5 pr-10 bg-[var(--muted)] border rounded-lg text-sm focus:outline-none transition-colors ${
                      newUser.confirmPassword && newUser.password !== newUser.confirmPassword
                        ? "border-red-500 focus:border-red-500 bg-red-500/5 ring-1 ring-red-500/20"
                        : newUser.confirmPassword && newUser.password === newUser.confirmPassword
                        ? "border-emerald-500 focus:border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                        : "border-[var(--border)] focus:border-[#0F172A]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassCreateUserConfirm(!showPassCreateUserConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    title={showPassCreateUserConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassCreateUserConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newUser.confirmPassword && (
                  <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                    newUser.password === newUser.confirmPassword ? "text-emerald-500" : "text-rose-500"
                  }`}>
                    {newUser.password === newUser.confirmPassword ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
                  </p>
                )}
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
                  disabled={createUserLoading || !newUser.password || !newUser.confirmPassword || newUser.password !== newUser.confirmPassword || newUser.password.length < 6}
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
                  value={editingUser.rol === 'ROL_ADMIN' ? (editingUser.esAdminGeneral ? 'ADMIN_GENERAL' : 'ADMIN_SUCURSAL') : editingUser.rol}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ADMIN_GENERAL') {
                      setEditingUser({ ...editingUser, rol: 'ROL_ADMIN', esAdminGeneral: true });
                    } else if (val === 'ADMIN_SUCURSAL') {
                      setEditingUser({ ...editingUser, rol: 'ROL_ADMIN', esAdminGeneral: false });
                    } else {
                      setEditingUser({ ...editingUser, rol: val, esAdminGeneral: false });
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="ADMIN_GENERAL">Admin General (todas las sucursales)</option>
                  <option value="ADMIN_SUCURSAL">Admin de Sucursal (solo sucursal asignada)</option>
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
              {editingUser.password && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Confirmar Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassEditUserConfirm ? "text" : "password"}
                      value={editingUser.confirmPassword || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, confirmPassword: e.target.value })}
                      placeholder="Repita la nueva contraseña"
                      className={`w-full px-3 py-2.5 pr-10 bg-[var(--muted)] border rounded-lg text-sm focus:outline-none transition-colors ${
                        editingUser.confirmPassword && editingUser.password !== editingUser.confirmPassword
                          ? "border-red-500 focus:border-red-500 bg-red-500/5 ring-1 ring-red-500/20"
                          : editingUser.confirmPassword && editingUser.password === editingUser.confirmPassword
                          ? "border-emerald-500 focus:border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                          : "border-[var(--border)] focus:border-[#0F172A]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassEditUserConfirm(!showPassEditUserConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      title={showPassEditUserConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassEditUserConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {editingUser.confirmPassword && (
                    <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                      editingUser.password === editingUser.confirmPassword ? "text-emerald-500" : "text-rose-500"
                    }`}>
                      {editingUser.password === editingUser.confirmPassword ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
                    </p>
                  )}
                </div>
              )}
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
                  disabled={editUserLoading || (!!editingUser.password.trim() && (editingUser.password.trim().length < 6 || editingUser.password.trim() !== (editingUser.confirmPassword || "").trim()))}
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

      {/* ═══ MODAL: CREAR SUPER ADMINISTRADOR ═══ */}
      {showCreateSuperAdminModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCreateSuperAdminModal(false); }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border)] bg-[#0F172A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Nuevo Super Administrador</h2>
                  <p className="text-[11px] text-slate-300 mt-0.5">Acceso irrestricto y control global de la plataforma</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateSuperAdminModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCrearSuperAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Administrador Maestro"
                  value={superAdminForm.nombre}
                  onChange={(e) => setSuperAdminForm({ ...superAdminForm, nombre: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@nexora.com"
                  value={superAdminForm.email}
                  onKeyDown={handleEmailKeyDown}
                  onChange={(e) => setSuperAdminForm({ ...superAdminForm, email: formatearEmail(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Contraseña de Acceso (mín. 6 caracteres) *
                </label>
                <div className="relative">
                  <input
                    type={showPassSuperAdmin ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={superAdminForm.password}
                    onChange={(e) => setSuperAdminForm({ ...superAdminForm, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassSuperAdmin(!showPassSuperAdmin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {showPassSuperAdmin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPassSuperAdminConfirm ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Repita la contraseña"
                    value={superAdminForm.confirmPassword}
                    onChange={(e) => setSuperAdminForm({ ...superAdminForm, confirmPassword: e.target.value })}
                    className={`w-full px-3 py-2.5 bg-[var(--muted)] border rounded-xl text-sm focus:outline-none pr-10 transition-colors ${
                      superAdminForm.confirmPassword && superAdminForm.password !== superAdminForm.confirmPassword
                        ? "border-red-500 focus:border-red-500 bg-red-500/5 ring-1 ring-red-500/20"
                        : superAdminForm.confirmPassword && superAdminForm.password === superAdminForm.confirmPassword
                        ? "border-emerald-500 focus:border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                        : "border-[var(--border)] focus:border-[#0F172A]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassSuperAdminConfirm(!showPassSuperAdminConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {showPassSuperAdminConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {superAdminForm.confirmPassword && (
                  <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                    superAdminForm.password === superAdminForm.confirmPassword ? "text-emerald-500" : "text-rose-500"
                  }`}>
                    {superAdminForm.password === superAdminForm.confirmPassword ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSuperAdminModal(false)}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSuperAdmin || !superAdminForm.password || !superAdminForm.confirmPassword || superAdminForm.password !== superAdminForm.confirmPassword || superAdminForm.password.length < 6}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingSuperAdmin && <Loader2 size={14} className="animate-spin" />}
                  {savingSuperAdmin ? "Guardando..." : "Crear Super Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: EDITAR SUPER ADMINISTRADOR ═══ */}
      {showEditSuperAdminModal && editingSuperAdmin && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setShowEditSuperAdminModal(false); setEditingSuperAdmin(null); } }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border)] bg-[#0F172A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Pencil size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Editar Super Administrador</h2>
                  <p className="text-[11px] text-slate-300 mt-0.5">{editingSuperAdmin.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditSuperAdminModal(false); setEditingSuperAdmin(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleActualizarSuperAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={superAdminForm.nombre}
                  onChange={(e) => setSuperAdminForm({ ...superAdminForm, nombre: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={superAdminForm.email}
                  onKeyDown={handleEmailKeyDown}
                  onChange={(e) => setSuperAdminForm({ ...superAdminForm, email: formatearEmail(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nueva Contraseña (Opcional)
                </label>
                <div className="relative">
                  <input
                    type={showPassSuperAdmin ? "text" : "password"}
                    placeholder="Dejar en blanco para conservar la actual"
                    value={superAdminForm.password}
                    onChange={(e) => setSuperAdminForm({ ...superAdminForm, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassSuperAdmin(!showPassSuperAdmin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {showPassSuperAdmin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {superAdminForm.password && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Confirmar Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassSuperAdminConfirm ? "text" : "password"}
                      placeholder="Repita la nueva contraseña"
                      value={superAdminForm.confirmPassword}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, confirmPassword: e.target.value })}
                      className={`w-full px-3 py-2.5 bg-[var(--muted)] border rounded-xl text-sm focus:outline-none pr-10 transition-colors ${
                        superAdminForm.confirmPassword && superAdminForm.password !== superAdminForm.confirmPassword
                          ? "border-red-500 focus:border-red-500 bg-red-500/5 ring-1 ring-red-500/20"
                          : superAdminForm.confirmPassword && superAdminForm.password === superAdminForm.confirmPassword
                          ? "border-emerald-500 focus:border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                          : "border-[var(--border)] focus:border-[#0F172A]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassSuperAdminConfirm(!showPassSuperAdminConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      {showPassSuperAdminConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {superAdminForm.confirmPassword && (
                    <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                      superAdminForm.password === superAdminForm.confirmPassword ? "text-emerald-500" : "text-rose-500"
                    }`}>
                      {superAdminForm.password === superAdminForm.confirmPassword ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Estado de la Cuenta
                </label>
                <select
                  value={superAdminForm.activo ? "true" : "false"}
                  onChange={(e) => setSuperAdminForm({ ...superAdminForm, activo: e.target.value === "true" })}
                  className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="true">Activo (Habilitado)</option>
                  <option value="false">Inactivo (Deshabilitado)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditSuperAdminModal(false); setEditingSuperAdmin(null); }}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSuperAdmin || (!!superAdminForm.password.trim() && (superAdminForm.password.trim().length < 6 || superAdminForm.password.trim() !== (superAdminForm.confirmPassword || "").trim()))}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingSuperAdmin && <Loader2 size={14} className="animate-spin" />}
                  {savingSuperAdmin ? "Actualizando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIRMACIÓN: ELIMINAR SUPER ADMIN ═══ */}
      {confirmDeleteSuperAdmin && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDeleteSuperAdmin(null); }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              ¿Eliminar Super Administrador?
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              ¿Estás seguro de que deseas eliminar la cuenta de <strong className="text-[var(--foreground)]">{confirmDeleteSuperAdmin.nombre}</strong> ({confirmDeleteSuperAdmin.email})? Esta acción revocará todos los permisos de acceso global de forma permanente.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteSuperAdmin(null)}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminarSuperAdmin}
                disabled={deletingSuperAdmin}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deletingSuperAdmin && <Loader2 size={14} className="animate-spin" />}
                {deletingSuperAdmin ? "Eliminando..." : "Eliminar"}
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

      {/* ═══ MODAL PREVISUALIZADOR DE REPORTE PDF ═══ */}
      {showReportPreviewModal && reportPreviewUrl && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[85] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 focus:outline-none"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setShowReportPreviewModal(false);
            }
          }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowReportPreviewModal(false); }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--muted)]/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--foreground)]">Vista Previa del Reporte de Suscripciones</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">Documento oficial generado en formato A4 para auditoría e impresión</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => reportData && descargarReporteSuscripcionesPdf(reportData)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Descargar este reporte en PDF"
                >
                  <Download size={14} />
                  <span>Descargar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportPreviewModal(false)}
                  className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  title="Cerrar vista previa"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Contenedor del PDF (iFrame) */}
            <div className="flex-1 bg-slate-900/50 p-1 sm:p-2 relative overflow-hidden">
              <iframe
                src={`${reportPreviewUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full rounded-xl border border-[var(--border)] bg-white shadow-inner"
                title="Previsualización de Reporte PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
