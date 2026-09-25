"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { ApiService } from '../services/api.service';
import {
  User, UserPlus, Plus, Loader2, ShieldCheck, UserCheck, UserMinus,
  RefreshCw, CheckCircle, AlertCircle, Building2, Store,
  Users, KeyRound, Search, Share2, Edit2, MapPin, X,
  Palette, Upload, ArrowRightLeft, Paintbrush, ImageIcon, Trash2, Eye, EyeOff, Lock, Unlock
} from 'lucide-react';
import UnsavedChangesModal from './ui/unsaved-changes-modal';

interface UsuariosProps {
  online: boolean;
}

interface SucursalItem {
  id: string;
  name: string;
  active: boolean;
  isMatriz: boolean;
  isCurrent: boolean;
  ruc?: string;
  isRucPropio?: boolean;
  rucMatriz?: string;
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
  esAdminGeneral?: boolean;
  activo: boolean;
  permiteCambiarPrecio?: boolean;
  intentosFallidos?: number;
  bloqueadoHasta?: string | null;
  tenantId?: string;
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
  const [showCustomRucNew, setShowCustomRucNew] = useState(false);
  const [creatingSucursal, setCreatingSucursal] = useState(false);
  const [newSucursal, setNewSucursal] = useState({
    name: '',
    ruc: '',
    direccion: '',
    telefono: '',
    email: '',
    adminNombre: '',
    adminEmail: '',
    adminPassword: '',
  });

  // ─── MASTER-DETAIL: Sucursal seleccionada ───
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null);
  const [personalSucursal, setPersonalSucursal] = useState<UserListItem[]>([]);
  const [loadingPersonalSuc, setLoadingPersonalSuc] = useState(false);

  // ─── EDITAR SUCURSAL ───
  const [showEditSucursalModal, setShowEditSucursalModal] = useState(false);
  const [showCustomRucEdit, setShowCustomRucEdit] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState<SucursalItem | null>(null);
  const [editSucursalForm, setEditSucursalForm] = useState({ name: '', ruc: '', direccion: '', telefono: '', email: '', active: true });
  const [savingSucursal, setSavingSucursal] = useState(false);

  // ─── ELIMINAR SUCURSAL ───
  const [showDeleteSucursalModal, setShowDeleteSucursalModal] = useState(false);
  const [sucursalToDelete, setSucursalToDelete] = useState<SucursalItem | null>(null);
  const [deletingSucursal, setDeletingSucursal] = useState(false);

  // ─── TRANSFERIR PERSONAL ───
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringUser, setTransferringUser] = useState<UserListItem | null>(null);
  const [targetSucursalId, setTargetSucursalId] = useState('');
  const [savingTransfer, setSavingTransfer] = useState(false);

  // ─── PERSONAL ───
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [searchPersonalQuery, setSearchPersonalQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTenantForNewUser, setSelectedTenantForNewUser] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);

  // Formulario Nuevo Colaborador
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordAddUser, setShowPasswordAddUser] = useState(false);
  const [rolOption, setRolOption] = useState<'ADMIN_GENERAL' | 'ADMIN_SUCURSAL' | 'ROL_VENDEDOR' | 'ROL_BODEGUERO'>('ROL_VENDEDOR');
  const [permiteCambiarPrecio, setPermiteCambiarPrecio] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal Reset Password
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resettingUser, setResettingUser] = useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ─── STOCK INTER-SUCURSAL ───
  const [searchStockQuery, setSearchStockQuery] = useState('');
  const [stockResultados, setStockResultados] = useState<StockInterItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // ─── PERSONALIZACIÓN ───
  const [businessConfig, setBusinessConfig] = useState<any>(null);
  const [customColor, setCustomColor] = useState('#0F172A');
  const [customLogo, setCustomLogo] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (online) {
      loadAll();
    }
  }, [online]);

  // === Estado para modal de cambios sin guardar ===
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const pendingCloseRef = useRef<(() => void) | null>(null);
  const sucursalFormSnapshotRef = useRef<string>('');
  const userFormSnapshotRef = useRef<string>('');
  const editUserSnapshotRef = useRef<string>('');
  const editSucursalSnapshotRef = useRef<string>('');
  const resetPwSnapshotRef = useRef<string>('');
  const transferSnapshotRef = useRef<string>('');

  // === Snapshots al abrir modales ===
  useEffect(() => { if (showAddSucursalModal) sucursalFormSnapshotRef.current = JSON.stringify(newSucursal); }, [showAddSucursalModal]);
  useEffect(() => { if (showAddModal) userFormSnapshotRef.current = JSON.stringify({ nombre, email, password, rolOption, permiteCambiarPrecio }); }, [showAddModal]);
  useEffect(() => { if (showEditModal && editingUser) editUserSnapshotRef.current = JSON.stringify({ nombre: editingUser.nombre, email: editingUser.email, rol: editingUser.rol, activo: editingUser.activo, permiteCambiarPrecio: editingUser.permiteCambiarPrecio }); }, [showEditModal, editingUser]);
  useEffect(() => { if (showEditSucursalModal) editSucursalSnapshotRef.current = JSON.stringify(editSucursalForm); }, [showEditSucursalModal]);
  useEffect(() => { if (showResetPasswordModal) resetPwSnapshotRef.current = JSON.stringify({ newPassword }); }, [showResetPasswordModal]);
  useEffect(() => { if (showTransferModal) transferSnapshotRef.current = JSON.stringify({ targetSucursalId }); }, [showTransferModal]);

  // === Dirty check helpers ===
  const isDirtySucursal = useCallback(() => showAddSucursalModal && JSON.stringify(newSucursal) !== sucursalFormSnapshotRef.current, [showAddSucursalModal, newSucursal]);
  const isDirtyAddUser = useCallback(() => showAddModal && JSON.stringify({ nombre, email, password, rolOption, permiteCambiarPrecio }) !== userFormSnapshotRef.current, [showAddModal, nombre, email, password, rolOption, permiteCambiarPrecio]);
  const isDirtyEditUser = useCallback(() => showEditModal && editingUser ? JSON.stringify({ nombre: editingUser.nombre, email: editingUser.email, rol: editingUser.rol, activo: editingUser.activo, permiteCambiarPrecio: editingUser.permiteCambiarPrecio }) !== editUserSnapshotRef.current : false, [showEditModal, editingUser]);
  const isDirtyEditSucursal = useCallback(() => showEditSucursalModal && JSON.stringify(editSucursalForm) !== editSucursalSnapshotRef.current, [showEditSucursalModal, editSucursalForm]);
  const isDirtyResetPw = useCallback(() => showResetPasswordModal && JSON.stringify({ newPassword }) !== resetPwSnapshotRef.current, [showResetPasswordModal, newPassword]);
  const isDirtyTransfer = useCallback(() => showTransferModal && JSON.stringify({ targetSucursalId }) !== transferSnapshotRef.current, [showTransferModal, targetSucursalId]);

  // === Cierre seguro ===
  const safeDismiss = useCallback((closeFn: () => void, dirty: boolean) => {
    if (dirty) { pendingCloseRef.current = closeFn; setShowDiscardModal(true); } else { closeFn(); }
  }, []);

  // === Global Escape handler ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDiscardModal) return;
      if (showTransferModal) { e.preventDefault(); safeDismiss(() => setShowTransferModal(false), isDirtyTransfer()); return; }
      if (showResetPasswordModal) { e.preventDefault(); safeDismiss(() => setShowResetPasswordModal(false), isDirtyResetPw()); return; }
      if (showEditSucursalModal) { e.preventDefault(); safeDismiss(() => setShowEditSucursalModal(false), isDirtyEditSucursal()); return; }
      if (showEditModal) { e.preventDefault(); safeDismiss(() => { setShowEditModal(false); setEditingUser(null); }, isDirtyEditUser()); return; }
      if (showAddModal) { e.preventDefault(); safeDismiss(() => setShowAddModal(false), isDirtyAddUser()); return; }
      if (showAddSucursalModal) { e.preventDefault(); safeDismiss(() => setShowAddSucursalModal(false), isDirtySucursal()); return; }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDiscardModal, showTransferModal, showResetPasswordModal, showEditSucursalModal, showEditModal, showAddModal, showAddSucursalModal, safeDismiss, isDirtyTransfer, isDirtyResetPw, isDirtyEditSucursal, isDirtyEditUser, isDirtyAddUser, isDirtySucursal]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadSucursales(), loadUsers(), loadBusinessConfig()]);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessConfig = async () => {
    try {
      const data = await ApiService.get('/configuracion/negocio');
      if (data) {
        setBusinessConfig(data);
        setCustomColor(data.primaryColor || '#0F172A');
        setCustomLogo(data.logoUrl || '');
        setLogoPreview(data.logoUrl || '');
      }
    } catch (err) {
      console.error('Error cargando config negocio:', err);
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
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = newSucursal.name.trim();
    if (!cleanName) {
      setErrorMsg('El nombre de la sucursal es obligatorio.');
      return;
    }

    let cleanRucToSend = '';
    if (showCustomRucNew && newSucursal.ruc.trim()) {
      const cleanDigits = newSucursal.ruc.replace(/\D/g, '').trim();
      if (cleanDigits.length !== 13) {
        setErrorMsg('El RUC propio de la sucursal debe contener exactamente 13 dígitos numéricos (ej. 1801234567001).');
        return;
      }
      cleanRucToSend = cleanDigits;
    }

    const cleanTel = newSucursal.telefono.replace(/\D/g, '').trim();
    if (cleanTel) {
      if (cleanTel.length !== 10) {
        setErrorMsg('El teléfono debe tener exactamente 10 dígitos numéricos (ej. 0991234567).');
        return;
      }
    }

    const cleanEmail = newSucursal.email.trim();
    if (cleanEmail) {
      const atCount = (cleanEmail.match(/@/g) || []).length;
      if (atCount !== 1 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setErrorMsg('El correo electrónico no es válido. Debe contener un solo "@" y un dominio válido (ej. sucursal@ejemplo.com).');
        return;
      }
    }

    setCreatingSucursal(true);
    try {
      await ApiService.post('/configuracion/sucursales', {
        name: cleanName,
        ruc: cleanRucToSend || undefined,
        direccion: newSucursal.direccion.trim(),
        telefono: cleanTel,
        email: cleanEmail,
      });
      setSuccessMsg(`Sucursal "${cleanName}" creada exitosamente.`);
      setShowAddSucursalModal(false);
      setShowCustomRucNew(false);
      setNewSucursal({
        name: '',
        ruc: '',
        direccion: '',
        telefono: '',
        email: '',
        adminNombre: '',
        adminEmail: '',
        adminPassword: '',
      });
      await loadSucursales();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexora:sucursales-changed'));
      }
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

    if (!nombre || !email || !password || !rolOption) {
      setErrorMsg('Todos los campos son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      const isGlobal = rolOption === 'ADMIN_GENERAL';
      const actualRol = (rolOption === 'ADMIN_GENERAL' || rolOption === 'ADMIN_SUCURSAL') ? 'ROL_ADMIN' : rolOption;

      await ApiService.post('/auth/usuarios', {
        nombre,
        email,
        password,
        rol: actualRol,
        esAdminGeneral: isGlobal,
        permiteCambiarPrecio,
        tenantId: selectedTenantForNewUser || undefined,
      });

      setSuccessMsg('Colaborador registrado con éxito.');
      setShowAddModal(false);
      setNombre('');
      setEmail('');
      setPassword('');
      setRolOption('ROL_VENDEDOR');
      setPermiteCambiarPrecio(false);
      setSelectedTenantForNewUser('');
      loadUsers();
      if (selectedSucursalId) handleSelectSucursal(selectedSucursalId);

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
        esAdminGeneral: editingUser.esAdminGeneral,
        activo: editingUser.activo,
        permiteCambiarPrecio: editingUser.permiteCambiarPrecio,
        tenantId: editingUser.tenantId,
      });

      setSuccessMsg(`Colaborador "${editingUser.nombre}" actualizado.`);
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
      if (selectedSucursalId) handleSelectSucursal(selectedSucursalId);
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
      if (selectedSucursalId) handleSelectSucursal(selectedSucursalId);
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
      if (selectedSucursalId) handleSelectSucursal(selectedSucursalId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al modificar permisos de precio.');
    }
  };

  const isUserLocked = (user: UserListItem): boolean => {
    if (!user.bloqueadoHasta) return false;
    return new Date(user.bloqueadoHasta) > new Date();
  };

  const handleUnlockUser = async (user: UserListItem) => {
    setErrorMsg('');
    try {
      await ApiService.patch(`/auth/usuarios/${user.id}/unlock`, {});
      setSuccessMsg(`Cuenta de ${user.nombre} desbloqueada exitosamente.`);
      loadUsers();
      if (selectedSucursalId) handleSelectSucursal(selectedSucursalId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al desbloquear cuenta.');
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

  // ─── HANDLERS MASTER-DETAIL SUCURSAL ───
  const handleSelectSucursal = async (sucursalId: string) => {
    if (selectedSucursalId === sucursalId) {
      setSelectedSucursalId(null);
      setPersonalSucursal([]);
      return;
    }
    setSelectedSucursalId(sucursalId);
    setLoadingPersonalSuc(true);
    try {
      const data = await ApiService.get(`/configuracion/sucursales/${sucursalId}/personal`);
      setPersonalSucursal(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando personal de sucursal:', err);
      setPersonalSucursal([]);
    } finally {
      setLoadingPersonalSuc(false);
    }
  };

  const handleEditSucursal = (suc: SucursalItem) => {
    setEditingSucursal(suc);
    const hasCustomRuc = Boolean(suc.isRucPropio && suc.ruc);
    setShowCustomRucEdit(hasCustomRuc);
    setEditSucursalForm({
      name: suc.name,
      ruc: hasCustomRuc ? (suc.ruc || '') : '',
      direccion: suc.direccion,
      telefono: suc.telefono,
      email: suc.email,
      active: suc.active,
    });
    setShowEditSucursalModal(true);
  };

  const handleSaveEditSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSucursal) return;
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = (editSucursalForm.name || '').trim();
    if (!cleanName) {
      setErrorMsg('El nombre de la sucursal es obligatorio.');
      return;
    }

    let cleanRucToSend: string | undefined = undefined;
    if (showCustomRucEdit) {
      const cleanDigits = (editSucursalForm.ruc || '').replace(/\D/g, '').trim();
      if (cleanDigits) {
        if (cleanDigits.length !== 13) {
          setErrorMsg('El RUC propio debe contener exactamente 13 dígitos numéricos (ej. 1801234567001).');
          return;
        }
        cleanRucToSend = cleanDigits;
      } else {
        cleanRucToSend = ''; // Limpiar RUC propio para heredar matriz
      }
    } else {
      cleanRucToSend = ''; // Heredar RUC matriz
    }

    const cleanTel = (editSucursalForm.telefono || '').replace(/\D/g, '').trim();
    if (cleanTel) {
      if (cleanTel.length !== 10) {
        setErrorMsg('El teléfono debe tener exactamente 10 dígitos numéricos (ej. 0991234567).');
        return;
      }
    }

    const cleanEmail = (editSucursalForm.email || '').trim();
    if (cleanEmail) {
      const atCount = (cleanEmail.match(/@/g) || []).length;
      if (atCount !== 1 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setErrorMsg('El correo electrónico no es válido. Debe contener un solo "@" y un dominio válido (ej. sucursal@ejemplo.com).');
        return;
      }
    }

    setSavingSucursal(true);
    try {
      const data = await ApiService.put(`/configuracion/sucursales/${editingSucursal.id}`, {
        name: cleanName,
        ruc: cleanRucToSend,
        direccion: (editSucursalForm.direccion || '').trim(),
        telefono: cleanTel,
        email: cleanEmail,
        active: editSucursalForm.active,
      });
      if (Array.isArray(data)) setSucursales(data);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexora:sucursales-changed'));
      }
      setSuccessMsg(`Sucursal "${cleanName}" actualizada.`);
      setShowEditSucursalModal(false);
      setEditingSucursal(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar sucursal.');
    } finally {
      setSavingSucursal(false);
    }
  };

  const handleDeleteSucursal = async () => {
    if (!sucursalToDelete) return;
    if (sucursalToDelete.isMatriz) {
      setErrorMsg('No es posible eliminar la Matriz Principal.');
      return;
    }

    setDeletingSucursal(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const data = await ApiService.delete(`/configuracion/sucursales/${sucursalToDelete.id}`);
      if (Array.isArray(data)) setSucursales(data);
      if (selectedSucursalId === sucursalToDelete.id) {
        setSelectedSucursalId(null);
        setPersonalSucursal([]);
      }
      setSuccessMsg(`Sucursal "${sucursalToDelete.name}" eliminada exitosamente.`);
      setShowDeleteSucursalModal(false);
      setShowEditSucursalModal(false);
      setSucursalToDelete(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexora:sucursales-changed'));
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar la sucursal.');
    } finally {
      setDeletingSucursal(false);
    }
  };

  const handleOpenTransfer = (user: UserListItem) => {
    setTransferringUser(user);
    setTargetSucursalId('');
    setShowTransferModal(true);
  };

  const handleTransferPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringUser || !targetSucursalId) return;
    setSavingTransfer(true);
    setErrorMsg('');
    try {
      await ApiService.patch(`/configuracion/personal/${transferringUser.id}/transferir`, { targetTenantId: targetSucursalId });
      setSuccessMsg(`${transferringUser.nombre} transferido exitosamente.`);
      setShowTransferModal(false);
      setTransferringUser(null);
      if (selectedSucursalId) handleSelectSucursal(selectedSucursalId);
      loadSucursales();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al transferir colaborador.');
    } finally {
      setSavingTransfer(false);
    }
  };

  // ─── HANDLERS PERSONALIZACIÓN ───
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        const res = await ApiService.post('/cloudinary/upload', { base64Data: base64, folder: 'nexora-logos' });
        if (res?.secure_url) {
          setCustomLogo(res.secure_url);
          setLogoPreview(res.secure_url);
        }
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al subir logo.');
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setCustomLogo('');
    setLogoPreview('');
  };

  const handleSavePersonalizacion = async () => {
    if (!businessConfig) return;
    setSavingConfig(true);
    setErrorMsg('');
    try {
      await ApiService.put('/configuracion/negocio', {
        ...businessConfig,
        primaryColor: customColor,
        logoUrl: customLogo,
      });
      setSuccessMsg('Personalización guardada correctamente.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexora:theme-changed', {
          detail: {
            primaryColor: customColor,
            logoUrl: customLogo,
            nombre: businessConfig.nombre,
          }
        }));
      }
      loadBusinessConfig();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar personalización.');
    } finally {
      setSavingConfig(false);
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedSucursalId) {
                    setSelectedTenantForNewUser(selectedSucursalId);
                  } else if (sucursales.length > 0 && !selectedTenantForNewUser) {
                    setSelectedTenantForNewUser(sucursales[0].id);
                  }
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
              >
                <UserPlus size={16} /> Registrar Colaborador
              </button>
              <button
                onClick={() => setShowAddSucursalModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                <Plus size={15} /> Nueva Sucursal
              </button>
            </div>
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
                  onClick={() => handleSelectSucursal(sucursal.id)}
                  className={`bg-[var(--card)] border rounded-2xl p-5 space-y-4 shadow-sm transition-all cursor-pointer hover:shadow-md ${
                    !sucursal.active ? 'opacity-80 bg-[var(--muted)]/20' : ''
                  } ${
                    selectedSucursalId === sucursal.id
                      ? 'border-[#0F172A] ring-2 ring-[#0F172A]/20'
                      : sucursal.isCurrent ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-[var(--border)]'
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
                        <div className="font-bold text-sm flex items-center gap-2">
                          <span>{sucursal.name}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            sucursal.isMatriz ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          }`}>
                            {sucursal.isMatriz ? 'Matriz Principal' : 'Sucursal'}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            sucursal.active
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                          }`}>
                            {sucursal.active ? 'Activa' : 'Inactiva'}
                          </span>

                          {sucursal.isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full">
                              Sesión Actual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEditSucursal(sucursal); }}
                        className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
                        title="Editar Sucursal"
                      >
                        <Edit2 size={14} />
                      </button>
                      {!sucursal.isMatriz && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSucursalToDelete(sucursal);
                            setShowDeleteSucursalModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-600 transition-colors"
                          title="Eliminar Sucursal"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[var(--muted-foreground)]">
                    {sucursal.isMatriz ? (
                      sucursal.ruc ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[10.5px] font-bold border border-amber-500/20">
                          <span>🏛️ RUC Matriz:</span>
                          <span>{sucursal.ruc}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--muted)]/60 text-[var(--muted-foreground)] font-mono text-[10.5px] border border-[var(--border)]">
                          <span>🏛️ RUC Matriz:</span>
                          <span>Sin registrar</span>
                        </div>
                      )
                    ) : sucursal.isRucPropio && sucursal.ruc ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 font-mono text-[10.5px] font-bold border border-blue-500/20" title="Esta sucursal opera con su propio RUC independiente">
                        <span>🏢 RUC Propio:</span>
                        <span>{sucursal.ruc}</span>
                      </div>
                    ) : sucursal.ruc ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--muted)]/60 text-[var(--foreground)] font-mono text-[10.5px] font-medium border border-[var(--border)]" title="Hereda el RUC comercial de la Matriz Principal">
                        <span>🏛️ RUC (Heredado de Matriz):</span>
                        <span>{sucursal.ruc}</span>
                      </div>
                    ) : null}
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

          {/* ─── PANEL MASTER-DETAIL: Personal de la Sucursal seleccionada ─── */}
          {selectedSucursalId && (
            <div className="mt-6 p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#0F172A]" />
                  <h3 className="font-bold text-sm text-[var(--foreground)]">
                    Personal de: {sucursales.find(s => s.id === selectedSucursalId)?.name || 'Sucursal'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-full">
                    {personalSucursal.length} colaboradores
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTenantForNewUser(selectedSucursalId);
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                  >
                    <Plus size={13} /> Nuevo Colaborador en esta Sucursal
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedSucursalId(null); setPersonalSucursal([]); }}
                    className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                    title="Cerrar panel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {loadingPersonalSuc ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-[#0F172A]" size={24} />
                </div>
              ) : personalSucursal.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--muted-foreground)] bg-[var(--muted)]/20 rounded-xl border border-dashed border-[var(--border)]">
                  Esta sucursal no tiene colaboradores asignados.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--muted)]/60 border-b border-[var(--border)] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Colaborador</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-center">Modificar Precios</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {personalSucursal.map((user) => (
                        <tr key={user.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-sm text-[var(--foreground)]">{user.nombre}</div>
                            <div className="text-[11px] text-[var(--muted-foreground)]">{user.email}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              user.rol === 'ROL_ADMIN' ? (user.esAdminGeneral ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20') :
                              user.rol === 'ROL_VENDEDOR' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                              'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                              {user.rol === 'ROL_ADMIN' ? (user.esAdminGeneral ? 'Admin General' : 'Admin Sucursal') : user.rol === 'ROL_VENDEDOR' ? 'Vendedor' : 'Bodeguero'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(user)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                user.activo ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                              }`}
                            >
                              {user.activo ? 'Activo' : 'Inactivo'}
                            </button>
                            {isUserLocked(user) && (
                              <span className="inline-flex items-center gap-1 ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500/15 text-red-600 border border-red-500/25">
                                <Lock size={10} /> Bloqueada
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermisoPrecio(user)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                user.permiteCambiarPrecio ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}
                            >
                              {user.permiteCambiarPrecio ? 'Permitido' : 'Bloqueado'}
                            </button>
                          </td>
                          <td className="p-3 text-right space-x-1.5">
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
                            <button
                              type="button"
                              onClick={() => handleOpenTransfer(user)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 text-[10px] font-bold transition-colors"
                              title="Transferir a otra sucursal"
                            >
                              <ArrowRightLeft size={12} /> Transferir
                            </button>
                            {isUserLocked(user) && (
                              <button
                                type="button"
                                onClick={() => handleUnlockUser(user)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[10px] font-bold transition-colors"
                                title="Desbloquear Cuenta"
                              >
                                <Unlock size={12} /> Desbloquear
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: PERSONAL Y PERMISOS ═══ */}
      {tabActiva === 'personal' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">Colaboradores y Permisos</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Gestiona roles, accesos y reseteo de claves del personal del local comercial.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3 top-2.5 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={searchPersonalQuery}
                  onChange={(e) => setSearchPersonalQuery(e.target.value)}
                  placeholder="Buscar por nombre, cedula o correo..."
                  className="w-full pl-9 pr-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                />
              </div>
              <button
                onClick={loadUsers}
                className="p-2 border border-[var(--border)] rounded-xl hover:bg-[var(--muted)] transition-colors shrink-0"
                title="Refrescar Lista"
              >
                <RefreshCw size={15} />
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0"
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
                  <th className="p-3.5">Sucursal Asignada</th>
                  <th className="p-3.5">Rol Asignado</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-center">Modificar Precios</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users
                  .filter((user) => {
                    if (!searchPersonalQuery.trim()) return true;
                    const q = searchPersonalQuery.toLowerCase().trim();
                    return (
                      user.nombre.toLowerCase().includes(q) ||
                      user.email.toLowerCase().includes(q)
                    );
                  })
                  .map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-sm text-[var(--foreground)]">{user.nombre}</div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">{user.email}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-500/10 text-[var(--foreground)] border border-slate-500/20">
                        <Building2 size={12} className="text-amber-500" />
                        {sucursales.find(s => s.id === user.tenantId)?.name || 'Matriz Principal'}
                      </span>
                      {user.rol === 'ROL_ADMIN' && (
                        <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                          {user.esAdminGeneral ? '👑 Administrador General' : '🏢 Admin de Sucursal'}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        user.rol === 'ROL_ADMIN' ? (user.esAdminGeneral ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20') :
                        user.rol === 'ROL_VENDEDOR' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {user.rol === 'ROL_ADMIN' ? (user.esAdminGeneral ? 'Admin General' : 'Admin Sucursal') : user.rol === 'ROL_VENDEDOR' ? 'Vendedor' : 'Bodeguero'}
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
                      {isUserLocked(user) && (
                        <span className="inline-flex items-center gap-1 ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500/15 text-red-600 border border-red-500/25">
                          <Lock size={10} /> Bloqueada
                        </span>
                      )}
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
                      {isUserLocked(user) && (
                        <button
                          type="button"
                          onClick={() => handleUnlockUser(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[10px] font-bold transition-colors"
                          title="Desbloquear Cuenta"
                        >
                          <Unlock size={12} /> Desbloquear
                        </button>
                      )}
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowAddSucursalModal(false), isDirtySucursal()); }}>
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
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Nombre de la Sucursal *</label>
                <input
                  type="text"
                  required
                  value={newSucursal.name}
                  onChange={(e) => setNewSucursal({ ...newSucursal, name: e.target.value })}
                  placeholder="Ej: Sucursal Centro / Sucursal Norte"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              {/* Bloque Identificación Tributaria / RUC */}
              <div className="space-y-2 p-3 bg-[var(--muted)]/30 border border-[var(--border)] rounded-2xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <Store size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[11px] text-[var(--foreground)]">Identificación Tributaria (RUC)</div>
                      <div className="text-[10.5px] text-[var(--muted-foreground)] leading-tight mt-0.5">
                        {!showCustomRucNew
                          ? 'Por defecto, la sucursal operará con el RUC de la Matriz Principal.'
                          : 'Esta sucursal emitirá notas y transacciones con su propio RUC independiente.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !showCustomRucNew;
                      setShowCustomRucNew(nextState);
                      if (!nextState) setNewSucursal({ ...newSucursal, ruc: '' });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all shrink-0 cursor-pointer ${
                      showCustomRucNew
                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20'
                        : 'bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20'
                    }`}
                  >
                    {showCustomRucNew ? '− Usar RUC Matriz' : '+ Agregar RUC Propio'}
                  </button>
                </div>

                {showCustomRucNew && (
                  <div className="pt-2 border-t border-[var(--border)]/60 animate-in fade-in duration-150">
                    <label className="block text-[10px] font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">
                      RUC Propio de la Sucursal (13 dígitos) *
                    </label>
                    <input
                      type="text"
                      maxLength={13}
                      required={showCustomRucNew}
                      value={newSucursal.ruc}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
                        setNewSucursal({ ...newSucursal, ruc: digits });
                      }}
                      placeholder="Ej: 1801234567001"
                      className="w-full px-3 py-2 bg-[var(--card)] border border-blue-500/40 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-[10px] text-[var(--muted-foreground)] mt-1 block">
                      Debe contener 13 dígitos numéricos terminados en 001.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Dirección del Local</label>
                <input
                  type="text"
                  value={newSucursal.direccion}
                  onChange={(e) => setNewSucursal({ ...newSucursal, direccion: e.target.value })}
                  placeholder="Ej: Av. Principal y Calle Secundaria"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Teléfono (10 dígitos)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={newSucursal.telefono}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setNewSucursal({ ...newSucursal, telefono: digits });
                    }}
                    placeholder="0991234567"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-mono focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    value={newSucursal.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      const atMatches = val.match(/@/g);
                      if (atMatches && atMatches.length > 1) return;
                      setNewSucursal({ ...newSucursal, email: val });
                    }}
                    placeholder="sucursal@ejemplo.com"
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowAddModal(false), isDirtyAddUser()); }}>
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
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Contraseña Inicial de Acceso *</label>
                <p className="text-[10px] text-[var(--muted-foreground)] mb-1.5 leading-tight">
                  Contraseña inicial que usará el colaborador para iniciar sesión. Funcionará permanentemente hasta que el colaborador decida cambiarla o el Administrador la reseteé.
                </p>
                <div className="relative">
                  <input
                    type={showPasswordAddUser ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 pr-10 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordAddUser(!showPasswordAddUser)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1"
                    tabIndex={-1}
                    title={showPasswordAddUser ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPasswordAddUser ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Rol en el Negocio *</label>
                <select
                  value={rolOption}
                  onChange={(e) => setRolOption(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="ROL_VENDEDOR">💼 Vendedor</option>
                  <option value="ROL_BODEGUERO">📦 Bodeguero</option>
                  <option value="ADMIN_SUCURSAL">🏢 Administrador de Sucursal (Solo este local)</option>
                  <option value="ADMIN_GENERAL">👑 Administrador General (Dueño / Todas las sucursales)</option>
                </select>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                  {rolOption === 'ADMIN_GENERAL' && '👑 Podrá ver y alternar entre todas las sucursales del negocio.'}
                  {rolOption === 'ADMIN_SUCURSAL' && '🏢 Su gestión administrativa estará limitada exclusivamente a este local.'}
                  {rolOption === 'ROL_VENDEDOR' && '💼 Ventas, pedidos, cobros y consulta de existencias inter-sucursales.'}
                  {rolOption === 'ROL_BODEGUERO' && '📦 Recepción de mercancía, kardex y gestión de stock de este local.'}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Sucursal Asignada *</label>
                <select
                  value={selectedTenantForNewUser || (sucursales[0]?.id || '')}
                  onChange={(e) => setSelectedTenantForNewUser(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isMatriz ? '(Matriz Principal)' : ''}
                    </option>
                  ))}
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowEditModal(false); setEditingUser(null); }, isDirtyEditUser()); }}>
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
                    value={
                      editingUser.rol === 'ROL_ADMIN'
                        ? (editingUser.esAdminGeneral ? 'ADMIN_GENERAL' : 'ADMIN_SUCURSAL')
                        : editingUser.rol
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'ADMIN_GENERAL') {
                        setEditingUser({ ...editingUser, rol: 'ROL_ADMIN', esAdminGeneral: true });
                      } else if (val === 'ADMIN_SUCURSAL') {
                        setEditingUser({ ...editingUser, rol: 'ROL_ADMIN', esAdminGeneral: false });
                      } else {
                        setEditingUser({ ...editingUser, rol: val as any, esAdminGeneral: false });
                      }
                    }}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="ROL_VENDEDOR">💼 Vendedor</option>
                    <option value="ROL_BODEGUERO">📦 Bodeguero</option>
                    <option value="ADMIN_SUCURSAL">🏢 Administrador de Sucursal (Solo este local)</option>
                    <option value="ADMIN_GENERAL">👑 Administrador General (Todas las sucursales)</option>
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

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Sucursal Asignada</label>
                <select
                  value={editingUser.tenantId || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, tenantId: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isMatriz ? '(Matriz Principal)' : ''}
                    </option>
                  ))}
                </select>
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowResetPasswordModal(false), isDirtyResetPw()); }}>
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
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Nueva Contraseña *</label>
                <div className="relative">
                  <input
                    type={showPasswordReset ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 pr-10 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordReset(!showPasswordReset)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1"
                    tabIndex={-1}
                    title={showPasswordReset ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPasswordReset ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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

      {/* ═══ MODAL EDITAR SUCURSAL ═══ */}
      {showEditSucursalModal && editingSucursal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowEditSucursalModal(false), isDirtyEditSucursal()); }}>
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-amber-400 font-bold">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Editar Sucursal</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Modificar datos del punto de venta</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditSucursalModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEditSucursal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Nombre de la Sucursal</label>
                <input
                  type="text"
                  required
                  value={editSucursalForm.name}
                  onChange={(e) => setEditSucursalForm({ ...editSucursalForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>
              {/* Bloque Identificación Tributaria / RUC en Editar */}
              <div className="space-y-2 p-3 bg-[var(--muted)]/30 border border-[var(--border)] rounded-2xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <Store size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[11px] text-[var(--foreground)]">Identificación Tributaria (RUC)</div>
                      <div className="text-[10.5px] text-[var(--muted-foreground)] leading-tight mt-0.5">
                        {showCustomRucEdit && editSucursalForm.ruc
                          ? 'Esta sucursal tiene configurado un RUC propio independiente.'
                          : 'Esta sucursal opera bajo el RUC de la Matriz Principal.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !showCustomRucEdit;
                      setShowCustomRucEdit(nextState);
                      if (!nextState) {
                        setEditSucursalForm({ ...editSucursalForm, ruc: '' });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all shrink-0 cursor-pointer ${
                      showCustomRucEdit
                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20'
                        : 'bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20'
                    }`}
                  >
                    {showCustomRucEdit ? '− Volver a RUC Matriz' : '+ Configurar RUC Propio'}
                  </button>
                </div>

                {showCustomRucEdit && (
                  <div className="pt-2 border-t border-[var(--border)]/60 animate-in fade-in duration-150">
                    <label className="block text-[10px] font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">
                      RUC Propio de la Sucursal (13 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={13}
                      value={editSucursalForm.ruc}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
                        setEditSucursalForm({ ...editSucursalForm, ruc: digits });
                      }}
                      placeholder="Ej: 1801234567001"
                      className="w-full px-3 py-2 bg-[var(--card)] border border-blue-500/40 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-[10px] text-[var(--muted-foreground)] mt-1 block">
                      Dejar vacío o presionar "Volver a RUC Matriz" para heredar el RUC de la Matriz.
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Direccion</label>
                <input
                  type="text"
                  value={editSucursalForm.direccion}
                  onChange={(e) => setEditSucursalForm({ ...editSucursalForm, direccion: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Telefono (10 dígitos)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editSucursalForm.telefono}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditSucursalForm({ ...editSucursalForm, telefono: digits });
                    }}
                    placeholder="0991234567"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-mono focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Correo Electronico (Opcional)</label>
                  <input
                    type="email"
                    value={editSucursalForm.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      const atMatches = val.match(/@/g);
                      if (atMatches && atMatches.length > 1) return;
                      setEditSucursalForm({ ...editSucursalForm, email: val });
                    }}
                    placeholder="sucursal@ejemplo.com"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Estado</label>
                <select
                  value={editSucursalForm.active ? 'ACTIVA' : 'INACTIVA'}
                  onChange={(e) => setEditSucursalForm({ ...editSucursalForm, active: e.target.value === 'ACTIVA' })}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="ACTIVA">Activa</option>
                  <option value="INACTIVA">Inactiva</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                {!editingSucursal.isMatriz && (
                  <button
                    type="button"
                    onClick={() => {
                      setSucursalToDelete(editingSucursal);
                      setShowDeleteSucursalModal(true);
                    }}
                    className="px-3 py-2.5 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                    title="Eliminar esta sucursal"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowEditSucursalModal(false)}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl font-bold text-xs hover:bg-[var(--muted)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSucursal || !isDirtyEditSucursal()}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingSucursal ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIRMAR ELIMINAR SUCURSAL ═══ */}
      {showDeleteSucursalModal && sucursalToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-rose-500/30 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-[var(--border)] bg-rose-500/10 text-rose-700 dark:text-rose-400">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/20 rounded-2xl text-rose-600 font-bold">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-rose-700 dark:text-rose-400">¿Eliminar Sucursal?</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Acción permanente</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-[var(--foreground)] leading-relaxed">
                ¿Estás seguro de que deseas eliminar la sucursal <strong>"{sucursalToDelete.name}"</strong>?
              </p>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-[11px] leading-tight">
                Nota: Si la sucursal ya cuenta con pedidos o notas de venta registradas, el sistema no permitirá borrarla para no afectar el historial contable. En ese caso, debes cambiar su estado a <strong>"Inactiva"</strong>.
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteSucursalModal(false);
                    setSucursalToDelete(null);
                  }}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl font-bold text-xs hover:bg-[var(--muted)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deletingSucursal}
                  onClick={handleDeleteSucursal}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {deletingSucursal ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deletingSucursal ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL TRANSFERIR PERSONAL ═══ */}
      {showTransferModal && transferringUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowTransferModal(false), isDirtyTransfer()); }}>
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-purple-400 font-bold">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Transferir Colaborador</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Mover a <strong>{transferringUser.nombre}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleTransferPersonal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">Sucursal Destino</label>
                <select
                  required
                  value={targetSucursalId}
                  onChange={(e) => setTargetSucursalId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="">Seleccionar sucursal...</option>
                  {sucursales
                    .filter(s => s.id !== selectedSucursalId)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.isMatriz ? '(Matriz)' : ''}</option>
                    ))
                  }
                </select>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-600 font-semibold">
                El colaborador sera desvinculado de la sucursal actual y asignado a la sucursal seleccionada.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-xl font-bold text-xs hover:bg-[var(--muted)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTransfer || !targetSucursalId}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {savingTransfer ? 'Transfiriendo...' : 'Confirmar Transferencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <UnsavedChangesModal
        isOpen={showDiscardModal}
        detail={{ hasChanges: true, sectionName: 'el formulario actual' }}
        onStay={() => setShowDiscardModal(false)}
        onDiscardAndLeave={() => {
          setShowDiscardModal(false);
          if (pendingCloseRef.current) { pendingCloseRef.current(); pendingCloseRef.current = null; }
        }}
      />
    </div>
  );
}
