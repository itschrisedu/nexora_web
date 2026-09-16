"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import { uploadToCloudinary } from "../services/cloudinary.service";
import {
  Palette, Clock, MapPin, CheckCircle, AlertCircle,
  Loader2, Shield, Lock, Building2, DollarSign,
  Truck, Star, Trash2, Plus, Phone, Globe,
  Image, ExternalLink, Eye, EyeOff, Share2,
  Copy, Check, MessageCircle, Upload, Sparkles,
  Layers, Sliders, Settings2, HelpCircle
} from "lucide-react";
import ConfirmModal from "./ui/confirm-modal";
import ColorPicker, { getContrastColor } from "./ui/color-picker";

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

type TabType = "general" | "credito" | "operaciones" | "fiscal" | "catalogo";

export default function PersonalizacionComponent({ online }: PersonalizacionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeroBanner, setUploadingHeroBanner] = useState(false);
  const [uploadingHeroBg, setUploadingHeroBg] = useState(false);
  const [tenantId, setTenantId] = useState("");

  // Transportes state
  const [transportes, setTransportes] = useState<EmpresaTransporteItem[]>([]);
  const [loadingTransportes, setLoadingTransportes] = useState(false);
  const [showModalTransporte, setShowModalTransporte] = useState(false);
  const [nuevoTranspNombre, setNuevoTranspNombre] = useState("");
  const [nuevoTranspTel, setNuevoTranspTel] = useState("");
  const [nuevoTranspDir, setNuevoTranspDir] = useState("");
  const [nuevoTranspPredet, setNuevoTranspPredet] = useState(false);
  const [guardandoTransporte, setGuardandoTransporte] = useState(false);

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
    heroTitulo: "Calzado Ecuatoriano 100% Cuero de Cevallos",
    heroSubtitulo: "Venta al por mayor y menor directamente desde fábrica con los mejores estándares de calidad y durabilidad.",
    heroBannerUrl: "",
    heroBackgroundUrl: "",
    cardTitulo: "Hecho a Mano en Tungurahua",
    cardSubtitulo: "Cada par refleja la tradición zapatera de Cevallos con tecnología de confort y cuero vacuno genuino.",
    cardEtiqueta: "Artesanía & Confort",
    cardGarantia: "Cuero Vacuno Seleccionado",
    sobreNosotros: "Somos productores y comercializadores de calzado de cuero en el cantón Cevallos, Tungurahua. Garantizamos calidad de exportación, acabados finos y precios directos de fabricante.",
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
          setConfig({
            nombre: data.nombre || "",
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
            heroTitulo: data.heroTitulo || "Calzado Ecuatoriano 100% Cuero de Cevallos",
            heroSubtitulo: data.heroSubtitulo || "Venta al por mayor y menor directamente desde fábrica con los mejores estándares de calidad y durabilidad.",
            heroBannerUrl: data.heroBannerUrl || "",
            heroBackgroundUrl: data.heroBackgroundUrl || "",
            cardTitulo: data.cardTitulo || "Hecho a Mano en Tungurahua",
            cardSubtitulo: data.cardSubtitulo || "Cada par refleja la tradición zapatera de Cevallos con tecnología de confort y cuero vacuno genuino.",
            cardEtiqueta: data.cardEtiqueta || "Artesanía & Confort",
            cardGarantia: data.cardGarantia || "Cuero Vacuno Seleccionado",
            sobreNosotros: data.sobreNosotros || "Somos productores y comercializadores de calzado de cuero en el cantón Cevallos, Tungurahua.",
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
          });

          if (data.primaryColor && typeof document !== "undefined") {
            document.documentElement.style.setProperty("--primary", data.primaryColor);
            document.documentElement.style.setProperty("--primary-foreground", getContrastColor(data.primaryColor));
          }
        }

        if (Array.isArray(nivelesData) && nivelesData.length > 0) {
          setNivelesCredito(nivelesData.map(n => ({
            ...n,
            limiteDolares: Number(n.limiteDolares),
          })));
        }
      }
    } catch (err: any) {
      console.error("Error cargando configuración del negocio:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setSuccess("Configuración global guardada correctamente.");
      if (typeof document !== "undefined" && config.primaryColor) {
        document.documentElement.style.setProperty("--primary", config.primaryColor);
        document.documentElement.style.setProperty("--primary-foreground", getContrastColor(config.primaryColor));
        window.dispatchEvent(new CustomEvent("nexora:theme-changed", { detail: { primaryColor: config.primaryColor } }));
      }
    } catch (err: any) {
      setError(err.message || "Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "Identidad & Negocio", icon: <Building2 size={16} /> },
    { id: "credito", label: "Scoring & Crédito", icon: <DollarSign size={16} /> },
    { id: "operaciones", label: "Operaciones & Logística", icon: <Truck size={16} /> },
    { id: "fiscal", label: "Parámetros Fiscales", icon: <Shield size={16} /> },
    { id: "catalogo", label: "Landing Web & Catálogo", icon: <Globe size={16} /> },
  ];

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
          </div>
        )}

        {/* ══════════════ PESTAÑA 5: LANDING WEB & CATÁLOGO ══════════════ */}
        {activeTab === "catalogo" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-[var(--card)] border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Globe className="text-emerald-600" size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--foreground)]">Catálogo Digital & Landing Web</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Portal público de exhibición de calzado de cuero con pedidos directos vía WhatsApp.
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
                const msgWhatsApp = `¡Hola! Te invito a conocer el catálogo digital oficial de ${config.nombre || 'nuestro calzado'} (100% Cuero de Cevallos):\n👉 ${fullLandingUrl}`;
                const waShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msgWhatsApp)}`;

                return (
                  <div className="p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5 uppercase tracking-wider">
                        <Share2 size={13} className="text-emerald-600" />
                        <span>Enlace Público de tu Catálogo</span>
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
                        <span>Ver Web</span>
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
                    Portada Principal del Catálogo
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <span>Imagen de Fondo de la Portada Principal</span>
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
                          <Upload size={13} />
                          <span>{uploadingHeroBg ? "Subiendo fondo..." : "Subir Foto de Fondo"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingHeroBg}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingHeroBg(true);
                              try {
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  const base64 = event.target?.result as string;
                                  const url = await uploadToCloudinary(base64, "nexora_landing");
                                  if (url) {
                                    setConfig((prev) => ({ ...prev, heroBackgroundUrl: url }));
                                  }
                                  setUploadingHeroBg(false);
                                };
                                reader.readAsDataURL(file);
                              } catch {
                                setUploadingHeroBg(false);
                              }
                            }}
                          />
                        </label>

                        {config.heroBackgroundUrl && (
                          <button
                            type="button"
                            onClick={() => setConfig((prev) => ({ ...prev, heroBackgroundUrl: "" }))}
                            className="px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors font-semibold"
                          >
                            Quitar fondo (Usar estilo limpio estándar)
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
                        <Upload size={13} />
                        <span>{uploadingHeroBanner ? "Subiendo foto..." : "Subir Fotografía"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingHeroBanner}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingHeroBanner(true);
                            try {
                              const reader = new FileReader();
                              reader.onload = async (event) => {
                                const base64 = event.target?.result as string;
                                const url = await uploadToCloudinary(base64, "nexora_landing");
                                if (url) {
                                  setConfig((prev) => ({ ...prev, heroBannerUrl: url }));
                                }
                                setUploadingHeroBanner(false);
                              };
                              reader.readAsDataURL(file);
                            } catch {
                              setUploadingHeroBanner(false);
                            }
                          }}
                        />
                      </label>

                      {config.heroBannerUrl && (
                        <button
                          type="button"
                          onClick={() => setConfig((prev) => ({ ...prev, heroBannerUrl: "" }))}
                          className="px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors font-semibold"
                        >
                          Quitar fotografía (Usar fondo artesanal por defecto)
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
          </div>
        )}

        {/* BOTÓN GUARDAR FLOTANTE / INFERIOR */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
            Guardar Configuración
          </button>
        </div>
      </form>

      {/* MODAL CREAR NUEVA EMPRESA DE TRANSPORTE */}
      {showModalTransporte && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
    </div>
  );
}
