"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ApiService } from "../services/api.service";
import UnsavedChangesModal from "./ui/unsaved-changes-modal";
import { uploadToCloudinary, deleteFromCloudinary } from "../services/cloudinary.service";
import {
  Palette, Clock, MapPin, CheckCircle, AlertCircle,
  Loader2, Shield, Lock, Building2, DollarSign,
  Truck, Star, Trash2, Plus, Phone, Globe,
  Image, ExternalLink, Eye, EyeOff, Share2,
  Copy, Check, MessageCircle, Upload, Sparkles,
  Layers, Sliders, Settings2, HelpCircle, Crop, Mail, ShieldCheck, KeyRound
} from "lucide-react";
import ConfirmModal from "./ui/confirm-modal";
import ColorPicker, { getContrastColor } from "./ui/color-picker";
import ImageCropperModal from "./ui/image-cropper-modal";
import VaultPasswordMeter, { analyzePassword } from "./ui/VaultPasswordMeter";
import { useUnsavedChanges } from "../utils/unsaved-changes";

interface CreditLevelConfigItem {
  id?: string;
  nivel: string;
  comprasRequeridas: number;
  limiteDolares: number;
  plazoDias: number;
}

interface EmpresaTransporteItem {
  id: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
  esPredeterminada: boolean;
  activo: boolean;
}

interface PersonalizacionProps {
  online: boolean;
}

interface BusinessConfig {
  nombre: string;
  ruc: string;
  direccion: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
  primaryColor?: string;
  horaInicioOperativa?: string;
  horaFinOperativa?: string;
  duracionSesionHoras?: number;
  autoDespachoHabilitado?: boolean;
  sriAmbiente?: string;
  sriEstablecimiento?: string;
  sriPuntoEmision?: string;
  sriObligadoContabilidad?: boolean;
  creditMontoMaximoInicial?: number;
  creditPlazoMaximoDias?: number;
  creditScoreMinimo?: number;
  creditTasaMoraPct?: number;
  heroTitulo?: string;
  heroSubtitulo?: string;
  heroFraseCorta?: string;
  heroBannerUrl?: string;
  heroBackgroundUrl?: string;
  cardTitulo?: string;
  cardSubtitulo?: string;
  cardEtiqueta?: string;
  cardGarantia?: string;
  sobreNosotros?: string;
  garantiaTaller?: string;
  caracteristicasCalidad?: string;
  materialDestacado?: string;
  materialDescripcion?: string;
  whatsappContacto?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  mostrarPreciosPublico?: boolean;
  mostrarStockPublico?: boolean;
}

type TabType = "general" | "credito" | "operaciones" | "fiscal" | "catalogo" | "seguridad";

export default function PersonalizacionComponent({ online }: PersonalizacionProps) {
  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return null;
    }
  }, []);

  const isPersonal = user?.rol === "ROL_VENDEDOR" || user?.rol === "ROL_BODEGUERO";
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== "undefined") {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        if (u?.rol === "ROL_VENDEDOR" || u?.rol === "ROL_BODEGUERO") return "seguridad";
      } catch {}
    }
    return "general";
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeroBanner, setUploadingHeroBanner] = useState(false);
  const [uploadingHeroBg, setUploadingHeroBg] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [autoWhatsAppAbono, setAutoWhatsAppAbono] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("nexora_auto_whatsapp_abono");
    return stored === null ? true : stored === "true";
  });
  const [autoEmailComprobante, setAutoEmailComprobante] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("nexora_auto_email_comprobante");
    return stored === null ? true : stored === "true";
  });

  // Transportes state
  const [transportes, setTransportes] = useState<EmpresaTransporteItem[]>([]);
  const [loadingTransportes, setLoadingTransportes] = useState(false);
  const [showModalTransporte, setShowModalTransporte] = useState(false);
  const [nuevoTranspNombre, setNuevoTranspNombre] = useState("");
  const [nuevoTranspTel, setNuevoTranspTel] = useState("");
  const [nuevoTranspDir, setNuevoTranspDir] = useState("");
  const [nuevoTranspPredet, setNuevoTranspPredet] = useState(false);
  const [guardandoTransporte, setGuardandoTransporte] = useState(false);

  // Image Cropper Modal State
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState("");
  const [cropperAspectRatio, setCropperAspectRatio] = useState(16 / 9);
  const [cropperLabel, setCropperLabel] = useState("Panorámica (16:9)");
  const [cropperTitle, setCropperTitle] = useState("Encuadrar Fotografía");
  const [cropperTarget, setCropperTarget] = useState<"heroBg" | "heroBanner" | null>(null);

  const [initialConfig, setInitialConfig] = useState<BusinessConfig | null>(null);
  const [initialNiveles, setInitialNiveles] = useState<CreditLevelConfigItem[] | null>(null);

  // Estados para pestaña de Cambio de Contraseña integrada
  const [tabPassActual, setTabPassActual] = useState("");
  const [tabPassNuevo, setTabPassNuevo] = useState("");
  const [tabPassConfirm, setTabPassConfirm] = useState("");
  const [showTabActual, setShowTabActual] = useState(false);
  const [showTabNuevo, setShowTabNuevo] = useState(false);
  const [showTabConfirm, setShowTabConfirm] = useState(false);
  const [tabPassLoading, setTabPassLoading] = useState(false);
  const [tabPassError, setTabPassError] = useState("");
  const [tabPassSuccess, setTabPassSuccess] = useState("");

  const tabAnalysis = useMemo(() => analyzePassword(tabPassNuevo), [tabPassNuevo]);
  const tabPasswordsMatch = tabPassNuevo && tabPassNuevo === tabPassConfirm;

  const handleTabPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTabPassError("");
    setTabPassSuccess("");

    if (!tabPassActual) {
      setTabPassError("Debe ingresar su contraseña actual.");
      return;
    }
    if (!tabPassNuevo || tabPassNuevo.length < 8) {
      setTabPassError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (tabPassNuevo !== tabPassConfirm) {
      setTabPassError("Las contraseñas no coinciden. Verifíquelas nuevamente.");
      return;
    }
    if (tabAnalysis.score < 2) {
      setTabPassError("La contraseña es muy vulnerable. Debe cumplir con al menos mayúsculas, minúsculas o números.");
      return;
    }

    setTabPassLoading(true);
    try {
      await ApiService.post("/auth/change-password", {
        passwordActual: tabPassActual,
        passwordNuevo: tabPassNuevo,
      });
      setTabPassSuccess("¡Contraseña de acceso actualizada correctamente!");
      setTabPassActual("");
      setTabPassNuevo("");
      setTabPassConfirm("");
      setTimeout(() => setTabPassSuccess(""), 4000);
    } catch (err: any) {
      setTabPassError(err.message || "No se pudo actualizar la contraseña. Verifique su clave actual.");
    } finally {
      setTabPassLoading(false);
    }
  };

  // Control de descartes y cierre seguro de modales
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const pendingCloseRef = useRef<(() => void) | null>(null);

  const safeDismiss = useCallback((closeFn: () => void, isDirty: boolean) => {
    if (isDirty) {
      pendingCloseRef.current = closeFn;
      setShowDiscardModal(true);
    } else {
      closeFn();
    }
  }, []);

  const isDirtyTransporte = useCallback(() => {
    return showModalTransporte && (nuevoTranspNombre.trim() !== '' || nuevoTranspTel.trim() !== '' || nuevoTranspDir.trim() !== '');
  }, [showModalTransporte, nuevoTranspNombre, nuevoTranspTel, nuevoTranspDir]);


  const handleSeleccionarArchivo = (file: File, target: "heroBg" | "heroBanner") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setCropperImageSrc(src);
      setCropperTarget(target);
      if (target === "heroBg") {
        setCropperAspectRatio(16 / 9);
        setCropperLabel("Panorámica de Portada (16:9)");
        setCropperTitle("Encuadrar Fondo de Portada Hero");
      } else {
        setCropperAspectRatio(4 / 3);
        setCropperLabel("Tarjeta de Bienvenida (4:3)");
        setCropperTitle("Encuadrar Fotografía Destacada");
      }
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBase64: string) => {
    setCropperOpen(false);
    if (cropperTarget === "heroBg") {
      setUploadingHeroBg(true);
      try {
        const oldUrl = config.heroBackgroundUrl;
        const newUrl = await uploadToCloudinary(croppedBase64, "nexora_landing");
        if (newUrl) {
          setConfig((prev) => ({ ...prev, heroBackgroundUrl: newUrl }));
          if (oldUrl && oldUrl.includes("cloudinary.com") && oldUrl !== newUrl) {
            await deleteFromCloudinary(oldUrl);
          }
        }
      } finally {
        setUploadingHeroBg(false);
      }
    } else if (cropperTarget === "heroBanner") {
      setUploadingHeroBanner(true);
      try {
        const oldUrl = config.heroBannerUrl;
        const newUrl = await uploadToCloudinary(croppedBase64, "nexora_landing");
        if (newUrl) {
          setConfig((prev) => ({ ...prev, heroBannerUrl: newUrl }));
          if (oldUrl && oldUrl.includes("cloudinary.com") && oldUrl !== newUrl) {
            await deleteFromCloudinary(oldUrl);
          }
        }
      } finally {
        setUploadingHeroBanner(false);
      }
    }
  };

  const handleQuitarHeroBg = async () => {
    const prevUrl = config.heroBackgroundUrl;
    setConfig((prev) => ({ ...prev, heroBackgroundUrl: "" }));
    if (prevUrl && prevUrl.includes("cloudinary.com")) {
      await deleteFromCloudinary(prevUrl);
    }
  };

  const handleQuitarHeroBanner = async () => {
    const prevUrl = config.heroBannerUrl;
    setConfig((prev) => ({ ...prev, heroBannerUrl: "" }));
    if (prevUrl && prevUrl.includes("cloudinary.com")) {
      await deleteFromCloudinary(prevUrl);
    }
  };

  const [config, setConfig] = useState<BusinessConfig>({
    nombre: "",
    ruc: "",
    direccion: "",
    telefono: "",
    email: "",
    logoUrl: "",
    primaryColor: "#0F172A",
    horaInicioOperativa: "08:00",
    horaFinOperativa: "19:00",
    duracionSesionHoras: 24,
    sriAmbiente: "1",
    sriEstablecimiento: "001",
    sriPuntoEmision: "001",
    sriObligadoContabilidad: false,
    creditMontoMaximoInicial: 200,
    creditPlazoMaximoDias: 30,
    creditScoreMinimo: 60,
    creditTasaMoraPct: 2.5,
    heroTitulo: "Calzado 100% Cuero Ecuatoriano",
    heroSubtitulo: "Venta al por mayor y menor directamente desde fábrica con los mejores estándares de calidad y durabilidad.",
    heroFraseCorta: "Producción Directa desde Fábrica • Cantón Cevallos",
    heroBannerUrl: "",
    heroBackgroundUrl: "",
    cardTitulo: "Calidad Artesanal Garantizada",
    cardSubtitulo: "Cada par refleja la tradición del calzado con tecnología de confort y cuero vacuno genuino.",
    cardEtiqueta: "Artesanía & Confort",
    cardGarantia: "Cuero Vacuno Seleccionado",
    sobreNosotros: "Somos productores y comercializadores de calzado de cuero. Garantizamos calidad, acabados finos y precios directos de fabricante.",
    garantiaTaller: "Garantizamos la máxima calidad en cada par de calzado elaborado con 100% cuero vacuno ecuatoriano. Ofrecemos respaldo directo de fábrica y servicio de mantenimiento en todos nuestros puntos de venta autorizados.",
    caracteristicasCalidad: "Cueros vacunos genuinos tratados para resistir el uso continuo.\nSuelas antideslizantes de alta adherencia y costuras reforzadas.\nAtención personalizada a comerciantes mayoristas y clientes particulares.\nServicio y respaldo técnico en todos nuestros locales.",
    materialDestacado: "100% Cuero Vacuno",
    materialDescripcion: "Materia prima seleccionada para garantizar longevidad.",
    whatsappContacto: "",
    facebookUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    mostrarPreciosPublico: true,
    mostrarStockPublico: true,
  });

  const [nivelesCredito, setNivelesCredito] = useState<CreditLevelConfigItem[]>([
    { nivel: "SIN_CREDITO", comprasRequeridas: 10, limiteDolares: 0, plazoDias: 0 },
    { nivel: "NIVEL_1", comprasRequeridas: 15, limiteDolares: 300, plazoDias: 15 },
    { nivel: "NIVEL_2", comprasRequeridas: 25, limiteDolares: 700, plazoDias: 30 },
    { nivel: "NIVEL_3", comprasRequeridas: 40, limiteDolares: 1500, plazoDias: 30 },
    { nivel: "NIVEL_4", comprasRequeridas: 60, limiteDolares: 3000, plazoDias: 45 },
  ]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Manejador global de la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDiscardModal) return;
      if (confirmModal.isOpen) {
        e.preventDefault();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        return;
      }
      if (cropperOpen) {
        e.preventDefault();
        setCropperOpen(false);
        return;
      }
      if (showModalTransporte) {
        e.preventDefault();
        safeDismiss(() => setShowModalTransporte(false), isDirtyTransporte());
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDiscardModal, confirmModal.isOpen, cropperOpen, showModalTransporte, safeDismiss, isDirtyTransporte]);

  useEffect(() => {
    loadConfig();
    loadTransportes();
  }, [online]);

  const loadTransportes = async () => {
    try {
      if (online) {
        setLoadingTransportes(true);
        const data = await ApiService.get("/configuracion/transportes");
        if (Array.isArray(data)) {
          setTransportes(data);
        }
      }
    } catch (err) {
      console.error("Error cargando empresas de transporte:", err);
    } finally {
      setLoadingTransportes(false);
    }
  };

  const handleCrearTransporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTranspNombre.trim()) return;

    try {
      setGuardandoTransporte(true);
      await ApiService.post("/configuracion/transportes", {
        nombre: nuevoTranspNombre.trim(),
        telefono: nuevoTranspTel.trim() || undefined,
        direccion: nuevoTranspDir.trim() || undefined,
        esPredeterminada: nuevoTranspPredet,
      });
      setNuevoTranspNombre("");
      setNuevoTranspTel("");
      setNuevoTranspDir("");
      setNuevoTranspPredet(false);
      setShowModalTransporte(false);
      setSuccess("Empresa de transporte registrada con éxito.");
      await loadTransportes();
    } catch (err: any) {
      setError(err.message || "Error al crear empresa de transporte.");
    } finally {
      setGuardandoTransporte(false);
    }
  };

  const handleSetPredeterminada = async (id: string, nombre: string) => {
    try {
      await ApiService.patch(`/configuracion/transportes/${id}/predeterminada`, {});
      setSuccess(`"${nombre}" establecida como empresa de transporte predeterminada.`);
      await loadTransportes();
    } catch (err: any) {
      setError(err.message || "Error al cambiar empresa predeterminada.");
    }
  };

  const handleDeleteTransporte = (id: string, nombre: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Empresa de Transporte",
      message: `¿Estás seguro de que deseas eliminar la empresa de transporte "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: "Sí, Eliminar",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await ApiService.delete(`/configuracion/transportes/${id}`);
          setSuccess(`"${nombre}" eliminada correctamente.`);
          await loadTransportes();
        } catch (err: any) {
          setError(err.message || "Error al eliminar empresa de transporte.");
        }
      },
    });
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      if (online) {
        const [data, nivelesData] = await Promise.all([
          ApiService.get("/configuracion/negocio"),
          ApiService.get("/configuracion/niveles-credito").catch(() => null),
        ]);

        if (data) {
          if (data.tenantId) {
            setTenantId(data.tenantId);
            if (typeof window !== "undefined") {
              localStorage.setItem("tenantId", data.tenantId);
            }
          }
          let userTenantName = "";
          if (typeof window !== "undefined") {
            try {
              const u = JSON.parse(localStorage.getItem("user") || "{}");
              userTenantName = u.tenantName || "";
            } catch {}
          }
          const loadedConfig: BusinessConfig = {
            nombre: data.nombre || userTenantName || "",
            ruc: data.ruc || "",
            direccion: data.direccion || "",
            telefono: data.telefono || "",
            email: data.email || "",
            logoUrl: data.logoUrl || "",
            primaryColor: data.primaryColor || "#0F172A",
            horaInicioOperativa: data.horaInicioOperativa || "08:00",
            horaFinOperativa: data.horaFinOperativa || "19:00",
            duracionSesionHoras: data.duracionSesionHoras || 24,
            sriAmbiente: data.sriAmbiente || "1",
            sriEstablecimiento: data.sriEstablecimiento || "001",
            sriPuntoEmision: data.sriPuntoEmision || "001",
            sriObligadoContabilidad: data.sriObligadoContabilidad || false,
            creditMontoMaximoInicial: data.creditMontoMaximoInicial ?? 200,
            creditPlazoMaximoDias: data.creditPlazoMaximoDias ?? 30,
            creditScoreMinimo: data.creditScoreMinimo ?? 60,
            creditTasaMoraPct: data.creditTasaMoraPct ?? 2.5,
            heroTitulo: data.heroTitulo !== undefined ? data.heroTitulo : "Calzado 100% Cuero Ecuatoriano",
            heroSubtitulo: data.heroSubtitulo !== undefined ? data.heroSubtitulo : "Venta al por mayor y menor directamente desde fábrica con los mejores estándares de calidad y durabilidad.",
            heroFraseCorta: data.heroFraseCorta !== undefined ? data.heroFraseCorta : "100% Cuero Cevallos",
            heroBannerUrl: data.heroBannerUrl || "",
            heroBackgroundUrl: data.heroBackgroundUrl || "",
            cardTitulo: data.cardTitulo !== undefined ? data.cardTitulo : "Calidad Artesanal Garantizada",
            cardSubtitulo: data.cardSubtitulo !== undefined ? data.cardSubtitulo : "Cada par refleja la tradición del calzado con tecnología de confort y cuero vacuno genuino.",
            cardEtiqueta: data.cardEtiqueta !== undefined ? data.cardEtiqueta : "Artesanía & Confort",
            cardGarantia: data.cardGarantia !== undefined ? data.cardGarantia : "Cuero Vacuno Seleccionado",
            sobreNosotros: data.sobreNosotros || "Somos productores y comercializadores de calzado de cuero. Garantizamos calidad, acabados finos y precios directos de fabricante.",
            garantiaTaller: data.garantiaTaller || "Garantizamos la máxima calidad en cada par de calzado elaborado con 100% cuero vacuno ecuatoriano. Ofrecemos respaldo directo de fábrica y servicio de mantenimiento en todos nuestros puntos de venta autorizados.",
            caracteristicasCalidad: data.caracteristicasCalidad || "Cueros vacunos genuinos tratados para resistir el uso continuo.\nSuelas antideslizantes de alta adherencia y costuras reforzadas.\nAtención personalizada a comerciantes mayoristas y clientes particulares.\nServicio y respaldo técnico en todos nuestros locales.",
            materialDestacado: data.materialDestacado || "100% Cuero Vacuno",
            materialDescripcion: data.materialDescripcion || "Materia prima seleccionada para garantizar longevidad.",
            whatsappContacto: (data.whatsappContacto && data.whatsappContacto !== "593999999999") ? data.whatsappContacto : "",
            facebookUrl: data.facebookUrl || "",
            instagramUrl: data.instagramUrl || "",
            tiktokUrl: data.tiktokUrl || "",
            mostrarPreciosPublico: data.mostrarPreciosPublico ?? true,
            mostrarStockPublico: data.mostrarStockPublico ?? true,
          };

          setConfig(loadedConfig);
          setInitialConfig(loadedConfig);

          if (data.primaryColor && typeof document !== "undefined") {
            document.documentElement.style.setProperty("--primary", data.primaryColor);
            document.documentElement.style.setProperty("--primary-foreground", getContrastColor(data.primaryColor));
          }
        }

        if (Array.isArray(nivelesData) && nivelesData.length > 0) {
          const loadedNiveles = nivelesData.map(n => ({
            ...n,
            limiteDolares: Number(n.limiteDolares),
          }));
          setNivelesCredito(loadedNiveles);
          setInitialNiveles(loadedNiveles);
        } else {
          setInitialNiveles(nivelesCredito);
        }
      }
    } catch (err: any) {
      console.error("Error cargando configuración del negocio:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (!initialConfig) return false;
    const configChanged = JSON.stringify(config) !== JSON.stringify(initialConfig);
    const nivelesChanged = initialNiveles ? JSON.stringify(nivelesCredito) !== JSON.stringify(initialNiveles) : false;
    return configChanged || nivelesChanged;
  }, [config, initialConfig, nivelesCredito, initialNiveles]);

  const handleSave = async (e?: React.FormEvent, specificTabLabel?: string) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      let finalConfig = { ...config };
      delete (finalConfig as any).creditMontoMaximoInicial;
      delete (finalConfig as any).creditPlazoMaximoDias;
      delete (finalConfig as any).creditScoreMinimo;
      delete (finalConfig as any).creditTasaMoraPct;

      if (config.logoUrl && config.logoUrl.startsWith("data:image") && online) {
        const cloudUrl = await uploadToCloudinary(config.logoUrl, 'nexora_logos');
        if (cloudUrl) {
          finalConfig.logoUrl = cloudUrl;
          setConfig(prev => ({ ...prev, logoUrl: cloudUrl }));
        }
      }

      await Promise.all([
        ApiService.put("/configuracion/negocio", finalConfig),
        ApiService.put("/configuracion/niveles-credito", { niveles: nivelesCredito }),
      ]);

      setInitialConfig({ ...finalConfig });
      setInitialNiveles([...nivelesCredito]);

      const label = specificTabLabel || (
        activeTab === "general" ? "Identidad & Negocio" :
        activeTab === "credito" ? "Scoring & Crédito" :
        activeTab === "operaciones" ? "Operaciones & Logística" :
        activeTab === "fiscal" ? "Parámetros Fiscales" : "Sitio Web & Catálogo"
      );
      setSuccess(`Cambios de "${label}" guardados correctamente.`);

      if (typeof document !== "undefined" && config.primaryColor) {
        document.documentElement.style.setProperty("--primary", config.primaryColor);
        document.documentElement.style.setProperty("--primary-foreground", getContrastColor(config.primaryColor));
        window.dispatchEvent(new CustomEvent("nexora:theme-changed", {
          detail: {
            primaryColor: config.primaryColor,
            nombre: config.nombre,
            logoUrl: finalConfig.logoUrl || config.logoUrl,
          },
        }));
      }

      // Sincronizar nombre en sesión local
      const stored = localStorage.getItem('user');
      if (stored && config.nombre) {
        try {
          const u = JSON.parse(stored);
          u.tenantName = config.nombre;
          localStorage.setItem('user', JSON.stringify(u));
        } catch {}
      }

      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  // Protección contra navegación si hay cambios sin guardar
  useUnsavedChanges(
    hasChanges,
    async () => {
      await handleSave();
      return true;
    },
    "Configuración Global"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  const allTabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "Identidad & Negocio", icon: <Building2 size={16} /> },
    { id: "credito", label: "Scoring & Crédito", icon: <DollarSign size={16} /> },
    { id: "operaciones", label: "Operaciones & Logística", icon: <Truck size={16} /> },
    { id: "fiscal", label: "Parámetros Fiscales", icon: <Shield size={16} /> },
    { id: "catalogo", label: "Sitio Web & Catálogo", icon: <Globe size={16} /> },
    { id: "seguridad", label: "Seguridad & Contraseña", icon: <KeyRound size={16} /> },
  ];

  const tabs = isPersonal
    ? allTabs.filter((t) => t.id === "seguridad" || t.id === "catalogo")
    : allTabs;

  return (
    <div className="space-y-4 max-w-full pb-6">
      {/* ─── NAVEGADOR DE PESTAÑAS SUPERIOR ─── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? "bg-slate-900 text-amber-400 shadow-sm border border-slate-700"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MENSAJES DE ESTADO */}
      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <CheckCircle size={15} /> {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        
        {/* ══════════════ PESTAÑA 1: IDENTIDAD & NEGOCIO ══════════════ */}
        {activeTab === "general" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* DATOS COMERCIALES */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
                <Building2 className="text-amber-500" size={18} />
                <h3 className="text-sm font-bold text-[var(--foreground)]">Datos Comerciales del Establecimiento</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    required
                    value={config.nombre}
                    onChange={(e) => setConfig(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Calzados Don Pepe"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    RUC de la Empresa
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    value={config.ruc}
                    onChange={(e) => setConfig(prev => ({ ...prev, ruc: e.target.value }))}
                    placeholder="1790012345001"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Dirección Matriz / Local
                  </label>
                  <input
                    type="text"
                    required
                    value={config.direccion}
                    onChange={(e) => setConfig(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Av. 24 de Mayo y 10 de Agosto, Cevallos"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={config.telefono || ""}
                      onChange={(e) => setConfig(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="0991234567"
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={config.email || ""}
                      onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contacto@calzado.com"
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* IDENTIDAD VISUAL & BRANDING */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
                <Palette className="text-amber-500" size={18} />
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Identidad Visual & Branding</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Color corporativo y logotipo comercial para encabezados y documentos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker
                  value={config.primaryColor || "#0F172A"}
                  onChange={(newColor) => {
                    setConfig((prev) => ({ ...prev, primaryColor: newColor }));
                    if (typeof document !== "undefined") {
                      document.documentElement.style.setProperty("--primary", newColor);
                      document.documentElement.style.setProperty("--primary-foreground", getContrastColor(newColor));
                      window.dispatchEvent(new CustomEvent("nexora:theme-changed", { detail: { primaryColor: newColor } }));
                    }
                  }}
                  label="Color Primario de Marca"
                />

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Logotipo del Establecimiento
                  </label>

                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl bg-white border border-[var(--border)] p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                      {config.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="text-slate-300" size={24} />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={config.logoUrl || ""}
                        onChange={(e) => setConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="URL de imagen o sube un archivo"
                        className="w-full px-3 py-1.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                      />

                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer px-2.5 py-1 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] text-[11px] font-bold rounded-lg border border-[var(--border)] transition-colors flex items-center gap-1.5">
                          <Upload size={12} />
                          <span>{uploadingLogo ? 'Subiendo...' : 'Subir Archivo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingLogo}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingLogo(true);
                              try {
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  const base64 = event.target?.result as string;
                                  const url = await uploadToCloudinary(base64, 'nexora_logos');
                                  if (url) {
                                    setConfig(prev => ({ ...prev, logoUrl: url }));
                                  }
                                  setUploadingLogo(false);
                                };
                                reader.readAsDataURL(file);
                              } catch {
                                setUploadingLogo(false);
                              }
                            }}
                          />
                        </label>

                        {config.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, logoUrl: "" }))}
                            className="text-[11px] text-rose-500 hover:underline font-semibold"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SEGURIDAD & CREDENCIALES DE ACCESO */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--foreground)]">Seguridad & Credenciales de Acceso</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Administración de contraseñas con validación por bóveda de seguridad.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("seguridad")}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock size={14} />
                  <span>Cambiar Mi Contraseña</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-[var(--foreground)]">Protección de Cuenta y Bóveda Activa</div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">
                    Puedes actualizar tu contraseña en cualquier momento. El sistema evaluará en tiempo real la fortaleza de tu clave.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("seguridad")}
                  className="px-3.5 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] font-semibold text-[11px] text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
                >
                  Modificar Clave
                </button>
              </div>
            </div>

            {/* ACCIÓN DE GUARDAR PESTAÑA IDENTIDAD & NEGOCIO */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
              <div className="text-xs">
                {hasChanges ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-500 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Tienes cambios pendientes en Identidad & Negocio
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[var(--muted-foreground)]">
                    <CheckCircle size={13} className="text-emerald-500" />
                    Identidad y negocio al día
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSave(undefined, "Identidad & Negocio")}
                disabled={!hasChanges || saving}
                title={!hasChanges ? "No hay cambios pendientes por guardar" : "Guardar cambios realizados"}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md shrink-0 w-full sm:w-auto ${
                  hasChanges && !saving
                    ? "bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 cursor-pointer active:scale-95 hover:shadow-lg"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none border border-slate-300 dark:border-slate-700"
                }`}
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                <span>{saving ? "Guardando..." : "Guardar Identidad & Negocio"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ PESTAÑA 2: SCORING & NIVELES DE CRÉDITO ══════════════ */}
        {activeTab === "credito" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
                <DollarSign className="text-amber-500" size={18} />
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Escala Progresiva de Crédito Directo y Límites</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Parámetros del motor de scoring para asignación de cupos y plazos según historial comercial.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--muted)]/60 border-b border-[var(--border)] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">Nivel Crediticio</th>
                      <th className="p-2.5 text-center">Compras Requeridas (Pares)</th>
                      <th className="p-2.5 text-center">Cupo Límite Tope ($ USD)</th>
                      <th className="p-2.5 text-center">Plazo Máximo (Días)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {nivelesCredito.map((lvl, index) => {
                      const labelNivel = 
                        lvl.nivel === "SIN_CREDITO" ? "Sin Crédito (Bloqueado)" :
                        lvl.nivel === "NIVEL_1" ? "Nivel 1 (Inicial)" :
                        lvl.nivel === "NIVEL_2" ? "Nivel 2 (Bronce)" :
                        lvl.nivel === "NIVEL_3" ? "Nivel 3 (Plata)" :
                        lvl.nivel === "NIVEL_4" ? "Nivel 4 (Oro / VIP)" :
                        lvl.nivel;

                      const badgeColor = 
                        lvl.nivel === "SIN_CREDITO" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                        lvl.nivel === "NIVEL_1" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                        lvl.nivel === "NIVEL_2" ? "bg-amber-500/10 text-amber-700 border-amber-500/20" :
                        lvl.nivel === "NIVEL_3" ? "bg-purple-500/10 text-purple-700 border-purple-500/20" :
                        "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";

                      return (
                        <tr key={lvl.nivel} className="hover:bg-[var(--muted)]/20">
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${badgeColor}`}>
                              {labelNivel}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={lvl.comprasRequeridas}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setNivelesCredito(prev => prev.map((item, i) => i === index ? { ...item, comprasRequeridas: val } : item));
                              }}
                              className="w-20 px-2 py-1 bg-[var(--muted)]/50 border border-[var(--border)] rounded-lg text-center font-mono font-bold focus:outline-none focus:border-amber-500 text-xs"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              <span className="font-bold text-slate-400 text-xs">$</span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={lvl.limiteDolares}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setNivelesCredito(prev => prev.map((item, i) => i === index ? { ...item, limiteDolares: val } : item));
                                }}
                                className="w-24 px-2 py-1 bg-[var(--muted)]/50 border border-[var(--border)] rounded-lg text-center font-mono font-bold focus:outline-none focus:border-amber-500 text-xs"
                              />
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={lvl.plazoDias}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setNivelesCredito(prev => prev.map((item, i) => i === index ? { ...item, plazoDias: val } : item));
                              }}
                              className="w-20 px-2 py-1 bg-[var(--muted)]/50 border border-[var(--border)] rounded-lg text-center font-mono font-bold focus:outline-none focus:border-amber-500 text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACCIÓN DE GUARDAR PESTAÑA SCORING & CRÉDITO */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
              <div className="text-xs">
                {hasChanges ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-500 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Tienes cambios pendientes en Scoring & Crédito
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[var(--muted-foreground)]">
                    <CheckCircle size={13} className="text-emerald-500" />
                    Parámetros de crédito al día
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSave(undefined, "Scoring & Crédito")}
                disabled={!hasChanges || saving}
                title={!hasChanges ? "No hay cambios pendientes por guardar" : "Guardar cambios realizados"}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md shrink-0 w-full sm:w-auto ${
                  hasChanges && !saving
                    ? "bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 cursor-pointer active:scale-95 hover:shadow-lg"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none border border-slate-300 dark:border-slate-700"
                }`}
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                <span>{saving ? "Guardando..." : "Guardar Scoring & Crédito"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ PESTAÑA 3: OPERACIONES & LOGÍSTICA ══════════════ */}
        {activeTab === "operaciones" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* DESPACHO AUTOMÁTICO */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="text-amber-500" size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--foreground)]">Despacho Automático a Proveedores</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Consolidación diaria de pedidos faltantes hacia fabricantes de calzado.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, autoDespachoHabilitado: !prev.autoDespachoHabilitado }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.autoDespachoHabilitado !== false
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-slate-300 dark:bg-slate-600 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      config.autoDespachoHabilitado !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Hora de Envío Automático Diario
                  </label>
                  <input
                    type="time"
                    value={config.horaInicioOperativa || "08:00"}
                    onChange={(e) => setConfig(prev => ({ ...prev, horaInicioOperativa: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Duración de Sesión de Usuario
                  </label>
                  <select
                    value={config.duracionSesionHoras || 24}
                    onChange={(e) => setConfig(prev => ({ ...prev, duracionSesionHoras: parseInt(e.target.value) || 24 }))}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                  >
                    <option value={8}>8 Horas (Jornada estándar)</option>
                    <option value={12}>12 Horas (Jornada extendida)</option>
                    <option value={24}>24 Horas (Todo el día)</option>
                    <option value={168}>7 Días (Semana completa)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* MARGEN DE GANANCIA COMERCIAL */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
                <DollarSign className="text-emerald-500" size={18} />
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Margen de Ganancia Comercial</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Porcentaje de margen sobre precio de venta aplicado a las sugerencias de precio en todo el sistema.
                  </p>
                </div>
              </div>

              {(() => {
                const currentMargin = (() => {
                  if (typeof window === "undefined") return 30;
                  const stored = localStorage.getItem("nexora-margen-ganancia");
                  if (stored) {
                    const val = parseFloat(stored);
                    if (!isNaN(val) && val > 0 && val < 100) return val;
                  }
                  return 30;
                })();

                const exampleCost = 10;
                const examplePrice = (exampleCost / (1 - currentMargin / 100)).toFixed(2);
                const exampleProfit = (parseFloat(examplePrice) - exampleCost).toFixed(2);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                          Porcentaje de Margen (%)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="5"
                            max="80"
                            step="1"
                            value={currentMargin}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              localStorage.setItem("nexora-margen-ganancia", String(val));
                              window.dispatchEvent(new CustomEvent("nexora:margin-changed", { detail: { marginPct: val } }));
                              setConfig(prev => ({ ...prev }));
                            }}
                            className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="5"
                              max="80"
                              step="1"
                              value={currentMargin}
                              onChange={(e) => {
                                const val = Math.min(80, Math.max(5, parseInt(e.target.value) || 30));
                                localStorage.setItem("nexora-margen-ganancia", String(val));
                                window.dispatchEvent(new CustomEvent("nexora:margin-changed", { detail: { marginPct: val } }));
                                setConfig(prev => ({ ...prev }));
                              }}
                              className="w-16 px-2 py-1.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-lg text-sm font-bold text-center focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-sm font-bold text-[var(--muted-foreground)]">%</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          Valor por defecto: 30%. Rango permitido: 5% - 80%.
                        </p>
                      </div>

                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          Ejemplo en Vivo
                        </span>
                        <div className="text-xs text-[var(--foreground)] space-y-1">
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">Costo de compra:</span>
                            <span className="font-bold">${exampleCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">Margen aplicado:</span>
                            <span className="font-bold">{currentMargin}%</span>
                          </div>
                          <div className="border-t border-emerald-500/20 pt-1 flex justify-between">
                            <span className="text-[var(--muted-foreground)]">Precio sugerido:</span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">${examplePrice}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">Ganancia por par:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">${exampleProfit}</span>
                          </div>
                        </div>
                        <p className="text-[9px] text-emerald-600/60 dark:text-emerald-400/60 mt-1">
                          Costo / (1 - {currentMargin}%) = ${examplePrice}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* CONFIGURACIÓN DE NOTIFICACIONES Y COMPROBANTES POR WHATSAPP */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
                <MessageCircle className="text-emerald-500" size={18} />
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Notificaciones y Comprobantes por WhatsApp</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Automatizaciones para la atención de pagos y emisión de comprobantes en Gestión de Cobros.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-500/5 dark:bg-slate-800/20 border border-[var(--border)] rounded-xl">
                <label className="flex items-center justify-between cursor-pointer select-none gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                      <MessageCircle size={15} className="text-emerald-500" />
                      <span>Enviar comprobante oficial por WhatsApp al confirmar</span>
                    </span>
                    <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                      Abre directamente el chat de WhatsApp con el desglose del abono, saldo anterior y saldo pendiente al registrar cobros o pagos, sin descargas locales ni recargas de pantalla.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoWhatsAppAbono}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAutoWhatsAppAbono(checked);
                      localStorage.setItem("nexora_auto_whatsapp_abono", String(checked));
                      window.dispatchEvent(new CustomEvent("nexora:config-changed"));
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                  />
                </label>
              </div>

              {/* ENVÍO AUTOMÁTICO POR CORREO ELECTRÓNICO */}
              <div className="p-4 bg-slate-500/5 dark:bg-slate-800/20 border border-[var(--border)] rounded-xl">
                <label className="flex items-center justify-between cursor-pointer select-none gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                      <Mail size={15} className="text-blue-500" />
                      <span>Enviar comprobantes y notificaciones automáticamente por Correo</span>
                    </span>
                    <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                      Despacha en segundo plano y de forma transparente el comprobante oficial (abonos, cobros, pedidos, entregas o devoluciones) al correo registrado del cliente o proveedor sin abrir pestañas ni interrumpir la operación.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoEmailComprobante}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAutoEmailComprobante(checked);
                      localStorage.setItem("nexora_auto_email_comprobante", String(checked));
                      window.dispatchEvent(new CustomEvent("nexora:config-changed"));
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                  />
                </label>
              </div>
            </div>

            {/* EMPRESAS DE TRANSPORTE */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Truck className="text-amber-500" size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--foreground)]">Empresas de Transporte & Envíos</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Logística y encomiendas para despachos locales e interprovinciales.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModalTransporte(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Plus size={14} />
                  + Agregar Transporte
                </button>
              </div>

              {loadingTransportes ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="animate-spin text-amber-500" size={20} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {transportes.map((transp) => (
                    <div
                      key={transp.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                        transp.esPredeterminada
                          ? "bg-amber-500/5 border-amber-500/30 shadow-xs"
                          : "bg-[var(--muted)]/20 border-[var(--border)]"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-bold text-xs text-[var(--foreground)] flex items-center gap-1.5 truncate">
                            <Truck size={14} className={transp.esPredeterminada ? "text-amber-500" : "text-slate-400"} />
                            {transp.nombre}
                          </span>
                          {transp.esPredeterminada && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                              Predeterminada
                            </span>
                          )}
                        </div>

                        {transp.telefono && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                            <Phone size={11} />
                            <span>{transp.telefono}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border)]/60 text-[11px]">
                        {!transp.esPredeterminada ? (
                          <button
                            type="button"
                            onClick={() => handleSetPredeterminada(transp.id, transp.nombre)}
                            className="font-semibold text-amber-600 hover:underline flex items-center gap-1"
                          >
                            <Star size={11} />
                            Hacer Predeterminada
                          </button>
                        ) : (
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle size={11} /> Por defecto
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteTransporte(transp.id, transp.nombre)}
                          className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors ml-auto"
                          title="Eliminar Transporte"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ACCIÓN DE GUARDAR PESTAÑA OPERACIONES & LOGÍSTICA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
              <div className="text-xs">
                {hasChanges ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-500 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Tienes cambios pendientes en Operaciones & Logística
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[var(--muted-foreground)]">
                    <CheckCircle size={13} className="text-emerald-500" />
                    Operaciones y horarios al día
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSave(undefined, "Operaciones & Logística")}
                disabled={!hasChanges || saving}
                title={!hasChanges ? "No hay cambios pendientes por guardar" : "Guardar cambios realizados"}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md shrink-0 w-full sm:w-auto ${
                  hasChanges && !saving
                    ? "bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 cursor-pointer active:scale-95 hover:shadow-lg"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none border border-slate-300 dark:border-slate-700"
                }`}
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                <span>{saving ? "Guardando..." : "Guardar Operaciones & Horarios"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ PESTAÑA 4: PARÁMETROS FISCALES ══════════════ */}
        {activeTab === "fiscal" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
                <Shield className="text-amber-500" size={18} />
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Parámetros Operativos de Comprobantes</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Identificadores de serie y puntos de emisión para notas de venta internas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Ambiente SRI
                  </label>
                  <select
                    value={config.sriAmbiente || "1"}
                    onChange={(e) => setConfig(prev => ({ ...prev, sriAmbiente: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                  >
                    <option value="1">1 - Pruebas / Sandbox</option>
                    <option value="2">2 - Producción</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Establecimiento
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={config.sriEstablecimiento || "001"}
                    onChange={(e) => setConfig(prev => ({ ...prev, sriEstablecimiento: e.target.value }))}
                    placeholder="001"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold text-center font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Punto de Emisión
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={config.sriPuntoEmision || "001"}
                    onChange={(e) => setConfig(prev => ({ ...prev, sriPuntoEmision: e.target.value }))}
                    placeholder="001"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold text-center font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Obligado Contabilidad
                  </label>
                  <select
                    value={config.sriObligadoContabilidad ? "SI" : "NO"}
                    onChange={(e) => setConfig(prev => ({ ...prev, sriObligadoContabilidad: e.target.value === "SI" }))}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                  >
                    <option value="NO">NO</option>
                    <option value="SI">SÍ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ACCIÓN DE GUARDAR PESTAÑA PARÁMETROS FISCALES */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
              <div className="text-xs">
                {hasChanges ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-500 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Tienes cambios pendientes en Parámetros Fiscales
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[var(--muted-foreground)]">
                    <CheckCircle size={13} className="text-emerald-500" />
                    Parámetros de comprobantes al día
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSave(undefined, "Parámetros Fiscales")}
                disabled={!hasChanges || saving}
                title={!hasChanges ? "No hay cambios pendientes por guardar" : "Guardar cambios realizados"}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md shrink-0 w-full sm:w-auto ${
                  hasChanges && !saving
                    ? "bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 cursor-pointer active:scale-95 hover:shadow-lg"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none border border-slate-300 dark:border-slate-700"
                }`}
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                <span>{saving ? "Guardando..." : "Guardar Parámetros Fiscales"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ PESTAÑA 5: SITIO WEB & CATÁLOGO ══════════════ */}
        {activeTab === "catalogo" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-[var(--card)] border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Globe className="text-emerald-600" size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--foreground)]">Sitio Web Oficial & Catálogo Digital</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Portal público de exhibición de calzado de cuero con pedidos directos vía WhatsApp y consulta de sucursales.
                    </p>
                  </div>
                </div>
              </div>

              {/* ENLACE PÚBLICO */}
              {(() => {
                const currentTenantId =
                  tenantId ||
                  (typeof window !== "undefined"
                    ? localStorage.getItem("activeSucursalId") ||
                      JSON.parse(localStorage.getItem("user") || "{}").tenantId ||
                      localStorage.getItem("tenantId") ||
                      ""
                    : "");
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                const fullLandingUrl = `${baseUrl}/landing${currentTenantId ? `?tenantId=${currentTenantId}` : ''}`;
                const msgWhatsApp = `¡Hola! Te invito a conocer el catálogo digital oficial de ${config.nombre || 'nuestro negocio'}:\n👉 ${fullLandingUrl}`;
                const waShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msgWhatsApp)}`;

                return (
                  <div className="p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5 uppercase tracking-wider">
                        <Share2 size={13} className="text-emerald-600" />
                        <span>Enlace Público de tu Sitio Web & Catálogo</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full">
                        🟢 Activo
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-900 truncate select-all">
                        {fullLandingUrl}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(fullLandingUrl);
                            setCopiadoLink(true);
                            setTimeout(() => setCopiadoLink(false), 2500);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                          copiadoLink ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {copiadoLink ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiadoLink ? 'Copiado' : 'Copiar'}</span>
                      </button>

                      <a
                        href={waShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <MessageCircle size={13} />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={fullLandingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] text-xs font-bold rounded-lg border border-[var(--border)] transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <ExternalLink size={13} />
                        <span>Ver Sitio Web</span>
                      </a>
                    </div>
                  </div>
                );
              })()}

              {/* ─── 1. TEXTOS DE LA PORTADA PRINCIPAL ─── */}
              <div className="p-4 bg-[var(--muted)]/30 border border-[var(--border)] rounded-2xl space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                  <Sparkles className="text-amber-500" size={16} />
                  <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                    Portada Principal del Sitio Web
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                      🏷️ Distintivo de Marca / Etiqueta del Encabezado
                    </label>
                    <input
                      type="text"
                      value={config.heroFraseCorta !== undefined ? config.heroFraseCorta : "100% Cuero Cevallos"}
                      onChange={(e) => setConfig({ ...config, heroFraseCorta: e.target.value })}
                      placeholder="100% Cuero Cevallos (Dejar vacío para ocultar)"
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5 block">
                      Etiqueta que acompaña al nombre de tu negocio en la barra superior y pie de página. Si se deja vacía, se oculta automáticamente adaptando el espacio.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                      Título Principal de la Portada
                    </label>
                    <input
                      type="text"
                      value={config.heroTitulo || ""}
                      onChange={(e) => setConfig({ ...config, heroTitulo: e.target.value })}
                      placeholder="Calzado Ecuatoriano 100% Cuero de Cevallos"
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                      Eslogan / Mensaje de Bienvenida
                    </label>
                    <input
                      type="text"
                      value={config.heroSubtitulo || ""}
                      onChange={(e) => setConfig({ ...config, heroSubtitulo: e.target.value })}
                      placeholder="Venta al por mayor y menor directamente desde fábrica..."
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* IMAGEN DE FONDO GENERAL DE LA PORTADA */}
                <div className="pt-2 border-t border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                      <Image className="text-emerald-600" size={15} />
                      <span>Imagen de Fondo de la Portada Principal (Con Encuadre Panorámico)</span>
                    </label>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      Fotografía de tu local, taller o exhibición para el fondo del inicio
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-32 h-20 rounded-xl bg-slate-900 border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative">
                      {config.heroBackgroundUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={config.heroBackgroundUrl}
                          alt="Fondo Portada"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-1 p-2 text-center">
                          <Image size={18} />
                          <span className="text-[9px] font-bold leading-tight">Fondo degradado estándar</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <input
                        type="text"
                        value={config.heroBackgroundUrl || ""}
                        onChange={(e) => setConfig((prev) => ({ ...prev, heroBackgroundUrl: e.target.value }))}
                        placeholder="Enlace o ruta de la foto de fondo (https://...)"
                        className="w-full px-3 py-1.5 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 font-mono"
                      />

                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs">
                          <Crop size={13} className="text-amber-400" />
                          <span>{uploadingHeroBg ? "Subiendo fondo..." : "Subir y Encuadrar Foto de Fondo"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingHeroBg}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSeleccionarArchivo(file, "heroBg");
                              e.target.value = "";
                            }}
                          />
                        </label>

                        {config.heroBackgroundUrl && (
                          <button
                            type="button"
                            onClick={handleQuitarHeroBg}
                            className="px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>Quitar fondo (Eliminar de la nube)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── 2. TARJETA DESTACADA DE BIENVENIDA ─── */}
              <div className="p-4 bg-[var(--muted)]/30 border border-amber-500/20 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="text-amber-500" size={16} />
                    <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                      Tarjeta Destacada de Bienvenida
                    </label>
                  </div>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    Tarjeta visual del inicio (con foto, textos y distintivo)
                  </span>
                </div>

                {/* FOTO DE LA TARJETA */}
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-28 h-20 rounded-xl bg-slate-900 border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative">
                    {config.heroBannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={config.heroBannerUrl}
                        alt="Foto de Tarjeta"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1 text-center p-1">
                        <Image size={18} />
                        <span className="text-[9px] font-bold">Fondo artesanal por defecto</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <label className="block text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Fotografía Destacada de la Tarjeta
                    </label>
                    <input
                      type="text"
                      value={config.heroBannerUrl || ""}
                      onChange={(e) => setConfig((prev) => ({ ...prev, heroBannerUrl: e.target.value }))}
                      placeholder="Enlace o ruta de la fotografía (https://...)"
                      className="w-full px-3 py-1.5 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 font-mono"
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="cursor-pointer px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs">
                        <Crop size={13} className="text-amber-400" />
                        <span>{uploadingHeroBanner ? "Subiendo foto..." : "Subir y Encuadrar Fotografía"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingHeroBanner}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSeleccionarArchivo(file, "heroBanner");
                            e.target.value = "";
                          }}
                        />
                      </label>

                      {config.heroBannerUrl && (
                        <button
                          type="button"
                          onClick={handleQuitarHeroBanner}
                          className="px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Quitar fotografía (Eliminar de la nube)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* CONTENIDO Y TEXTOS EDITABLES DE LA TARJETA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                      🏷️ Etiqueta Superior
                    </label>
                    <input
                      type="text"
                      value={config.cardEtiqueta || ""}
                      onChange={(e) => setConfig({ ...config, cardEtiqueta: e.target.value })}
                      placeholder="Artesanía & Confort"
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                      🛡️ Distintivo / Garantía Destacada
                    </label>
                    <input
                      type="text"
                      value={config.cardGarantia || ""}
                      onChange={(e) => setConfig({ ...config, cardGarantia: e.target.value })}
                      placeholder="Cuero Vacuno Seleccionado"
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                      📌 Título de la Tarjeta
                    </label>
                    <input
                      type="text"
                      value={config.cardTitulo || ""}
                      onChange={(e) => setConfig({ ...config, cardTitulo: e.target.value })}
                      placeholder="Hecho a Mano en Tungurahua"
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                      📝 Mensaje / Descripción de la Tarjeta
                    </label>
                    <textarea
                      rows={2}
                      value={config.cardSubtitulo || ""}
                      onChange={(e) => setConfig({ ...config, cardSubtitulo: e.target.value })}
                      placeholder="Cada par refleja la tradición zapatera de Cevallos con tecnología de confort y cuero vacuno genuino."
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  Sobre Nosotros / Reseña
                </label>
                <textarea
                  rows={Math.max(3, (config.sobreNosotros || "").split("\n").length)}
                  value={config.sobreNosotros || ""}
                  onChange={(e) => {
                    setConfig({ ...config, sobreNosotros: e.target.value });
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 resize-none overflow-hidden transition-[height]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  🛡️ Garantía de Fábrica & Servicio de Taller
                </label>
                <textarea
                  rows={Math.max(3, (config.garantiaTaller || "").split("\n").length)}
                  value={config.garantiaTaller || ""}
                  onChange={(e) => {
                    setConfig({ ...config, garantiaTaller: e.target.value });
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  placeholder="Describe las garantías de calidad, durabilidad del cuero, mantenimiento de taller o políticas de cambio..."
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 resize-none overflow-hidden transition-[height]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  ✅ Puntos Fuertes & Características Clave (1 por línea)
                </label>
                <textarea
                  rows={Math.max(5, (config.caracteristicasCalidad || "").split("\n").length)}
                  value={config.caracteristicasCalidad || ""}
                  onChange={(e) => {
                    setConfig({ ...config, caracteristicasCalidad: e.target.value });
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  placeholder="Escribe cada punto destacado en una línea separada..."
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 font-mono resize-none overflow-hidden transition-[height] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    🏷️ Título Tarjeta de Material (Ej: 100% Cuero Vacuno)
                  </label>
                  <input
                    type="text"
                    value={config.materialDestacado || ""}
                    onChange={(e) => setConfig({ ...config, materialDestacado: e.target.value })}
                    placeholder="100% Cuero Vacuno"
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    📝 Descripción Tarjeta de Material
                  </label>
                  <input
                    type="text"
                    value={config.materialDescripcion || ""}
                    onChange={(e) => setConfig({ ...config, materialDescripcion: e.target.value })}
                    placeholder="Materia prima seleccionada para garantizar longevidad."
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                    📱 WhatsApp de Contacto / Ventas
                  </label>
                  <input
                    type="text"
                    value={config.whatsappContacto || ""}
                    onChange={(e) => setConfig({ ...config, whatsappContacto: e.target.value })}
                    placeholder="0998765432"
                    className="w-full px-2.5 py-1.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-[var(--muted-foreground)] block mt-0.5">
                    Ej: 0998765432
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                    📘 Facebook URL
                  </label>
                  <input
                    type="url"
                    value={config.facebookUrl || ""}
                    onChange={(e) => setConfig({ ...config, facebookUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                    📸 Instagram URL
                  </label>
                  <input
                    type="url"
                    value={config.instagramUrl || ""}
                    onChange={(e) => setConfig({ ...config, instagramUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                    🎵 TikTok URL
                  </label>
                  <input
                    type="url"
                    value={config.tiktokUrl || ""}
                    onChange={(e) => setConfig({ ...config, tiktokUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Visibilidad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 p-2.5 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl">
                  <input
                    type="checkbox"
                    id="chkPrecios"
                    checked={config.mostrarPreciosPublico ?? true}
                    onChange={(e) => setConfig({ ...config, mostrarPreciosPublico: e.target.checked })}
                    className="rounded border-emerald-400 text-emerald-500 h-4 w-4"
                  />
                  <label htmlFor="chkPrecios" className="text-xs font-bold text-[var(--foreground)] cursor-pointer">
                    Mostrar precios de calzado en el catálogo público
                  </label>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl">
                  <input
                    type="checkbox"
                    id="chkStock"
                    checked={config.mostrarStockPublico ?? true}
                    onChange={(e) => setConfig({ ...config, mostrarStockPublico: e.target.checked })}
                    className="rounded border-emerald-400 text-emerald-500 h-4 w-4"
                  />
                  <label htmlFor="chkStock" className="text-xs font-bold text-[var(--foreground)] cursor-pointer">
                    Mostrar disponibilidad de stock en el catálogo público
                  </label>
                </div>
              </div>
            </div>

            {/* ACCIÓN DE GUARDAR PESTAÑA SITIO WEB & CATÁLOGO */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
              <div className="text-xs">
                {hasChanges ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-500 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Tienes cambios pendientes en Sitio Web & Catálogo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[var(--muted-foreground)]">
                    <CheckCircle size={13} className="text-emerald-500" />
                    Catálogo y portada al día
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSave(undefined, "Sitio Web & Catálogo")}
                disabled={!hasChanges || saving}
                title={!hasChanges ? "No hay cambios pendientes por guardar" : "Guardar cambios realizados"}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md shrink-0 w-full sm:w-auto ${
                  hasChanges && !saving
                    ? "bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 cursor-pointer active:scale-95 hover:shadow-lg"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none border border-slate-300 dark:border-slate-700"
                }`}
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                <span>{saving ? "Guardando..." : "Guardar Sitio Web & Catálogo"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ PESTAÑA 6: SEGURIDAD & CAMBIO DE CONTRASEÑA ══════════════ */}
        {activeTab === "seguridad" && (
          <div className="space-y-6">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[var(--foreground)]">
                      Seguridad de la Cuenta & Cambio de Contraseña
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      Actualiza tu clave de acceso con blindaje criptográfico para todos los roles (Super Admin, Admin y Colaboradores)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-xs font-bold">
                    <ShieldCheck size={14} />
                    <span>Protección Activa</span>
                  </span>
                </div>
              </div>

              {/* Mensajes de Alerta */}
              {tabPassError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{tabPassError}</span>
                </div>
              )}

              {tabPassSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
                  <CheckCircle size={18} className="shrink-0" />
                  <span>{tabPassSuccess}</span>
                </div>
              )}

              {/* Formulario Responsive de Cambio de Contraseña */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Columna Izquierda: Inputs */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Contraseña Actual */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                      Contraseña Actual *
                    </label>
                    <div className="relative">
                      <input
                        type={showTabActual ? "text" : "password"}
                        required
                        value={tabPassActual}
                        onChange={(e) => setTabPassActual(e.target.value)}
                        placeholder="Ingresa tu contraseña actual"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTabActual(!showTabActual)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        {showTabActual ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Nueva Contraseña */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                      Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={showTabNuevo ? "text" : "password"}
                        required
                        value={tabPassNuevo}
                        onChange={(e) => setTabPassNuevo(e.target.value)}
                        placeholder="Ingresa tu nueva contraseña segura"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTabNuevo(!showTabNuevo)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        {showTabNuevo ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Nueva Contraseña */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                      Confirmar Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={showTabConfirm ? "text" : "password"}
                        required
                        value={tabPassConfirm}
                        onChange={(e) => setTabPassConfirm(e.target.value)}
                        placeholder="Repite tu nueva contraseña"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTabConfirm(!showTabConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        {showTabConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {tabPassConfirm && (
                      <p
                        className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                          tabPasswordsMatch ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {tabPasswordsMatch ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
                      </p>
                    )}
                  </div>

                  {/* Botón de Actualización */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleTabPasswordSubmit}
                      disabled={tabPassLoading || !tabPassActual || !tabPassNuevo || !tabPasswordsMatch || tabAnalysis.score < 2}
                      className="w-full sm:w-auto px-6 py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {tabPassLoading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Actualizando Contraseña...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound size={15} className="text-emerald-400" />
                          <span>Actualizar Contraseña de Acceso</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Columna Derecha: Componente Bank Vault Password Meter */}
                <div className="lg:col-span-6">
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Evaluador de Fortaleza Acorazada (Bóveda / Vault)
                    </label>
                    <VaultPasswordMeter
                      password={tabPassNuevo}
                      showRequirements={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* MODAL CREAR NUEVA EMPRESA DE TRANSPORTE */}
      {showModalTransporte && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowModalTransporte(false), isDirtyTransporte()); }}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Truck className="text-amber-500" size={18} />
                <h3 className="text-sm font-bold text-[var(--foreground)]">Nueva Empresa de Transporte</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalTransporte(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearTransporte} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  Nombre de la Cooperativa / Transporte *
                </label>
                <input
                  type="text"
                  required
                  value={nuevoTranspNombre}
                  onChange={(e) => setNuevoTranspNombre(e.target.value)}
                  placeholder="Ej: Transporte Los Andes"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  Teléfono de Contacto (Opcional)
                </label>
                <input
                  type="text"
                  value={nuevoTranspTel}
                  onChange={(e) => setNuevoTranspTel(e.target.value)}
                  placeholder="0987654321"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  Oficina / Dirección (Opcional)
                </label>
                <input
                  type="text"
                  value={nuevoTranspDir}
                  onChange={(e) => setNuevoTranspDir(e.target.value)}
                  placeholder="Terminal Terrestre, Oficina 3"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <input
                  type="checkbox"
                  id="chkPredet"
                  checked={nuevoTranspPredet}
                  onChange={(e) => setNuevoTranspPredet(e.target.checked)}
                  className="rounded border-amber-400 text-amber-500 h-4 w-4"
                />
                <label htmlFor="chkPredet" className="text-xs font-bold text-[var(--foreground)] cursor-pointer">
                  ⭐ Establecer como transporte predeterminado
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowModalTransporte(false)}
                  className="px-3 py-1.5 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTransporte || !nuevoTranspNombre.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {guardandoTransporte ? <Loader2 className="animate-spin" size={13} /> : <CheckCircle size={13} />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Encuadre y Recorte Interactivo */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperImageSrc}
        aspectRatio={cropperAspectRatio}
        aspectRatioLabel={cropperLabel}
        title={cropperTitle}
        onCancel={() => setCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />

      {/* Modal de Confirmación UI */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Modal de confirmación de descarte de cambios */}
      <UnsavedChangesModal
        isOpen={showDiscardModal}
        targetSectionName="Personalización"
        detail={{ hasChanges: true, sectionName: "este formulario de Transporte" }}
        onStay={() => {
          setShowDiscardModal(false);
          pendingCloseRef.current = null;
        }}
        onDiscardAndLeave={() => {
          setShowDiscardModal(false);
          if (pendingCloseRef.current) {
            pendingCloseRef.current();
            pendingCloseRef.current = null;
          }
        }}
      />
    </div>
  );
}
