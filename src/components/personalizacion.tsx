"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import { uploadToCloudinary } from "../services/cloudinary.service";
import {
  Palette, Clock, MapPin, CheckCircle, AlertCircle,
  Loader2, Shield, Lock, Building2, DollarSign,
  Truck, Star, Trash2, Plus, Phone, Globe,
  Image, ExternalLink, Eye, EyeOff, Share2
} from "lucide-react";
import ConfirmModal from "./ui/confirm-modal";

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
  sriAmbiente?: string;
  sriEstablecimiento?: string;
  sriPuntoEmision?: string;
  sriObligadoContabilidad?: boolean;
  creditMontoMaximoInicial?: number;
  creditPlazoMaximoDias?: number;
  creditScoreMinimo?: number;
  creditTasaMoraPct?: number;
  // Landing Page & Catálogo (Fase E3)
  heroTitulo?: string;
  heroSubtitulo?: string;
  heroBannerUrl?: string;
  sobreNosotros?: string;
  whatsappContacto?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  mostrarPreciosPublico?: boolean;
  mostrarStockPublico?: boolean;
}

const PRESET_COLORS = [
  { hex: "#0F172A", label: "Azul Profundo (Predeterminado)" },
  { hex: "#1d4ed8", label: "Azul Real" },
  { hex: "#10b981", label: "Esmeralda" },
  { hex: "#06b6d4", label: "Cian" },
  { hex: "#f43f5e", label: "Rosa" },
  { hex: "#B8860B", label: "Dorado" },
];

export default function PersonalizacionComponent({ online }: PersonalizacionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

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
    sobreNosotros: "Somos productores y comercializadores de calzado de cuero en el cantón Cevallos, Tungurahua. Garantizamos calidad de exportación, acabados finos y precios directos de fabricante.",
    whatsappContacto: "593999999999",
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

  // Modal de confirmación UI (reemplaza confirm nativo)
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
          });

          if (data.primaryColor && typeof document !== "undefined") {
            document.documentElement.style.setProperty("--primary", data.primaryColor);
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

      setSuccess("Configuración global y escala de niveles crediticios guardados correctamente.");
      if (typeof document !== "undefined" && config.primaryColor) {
        document.documentElement.style.setProperty("--primary", config.primaryColor);
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
        <Loader2 className="animate-spin text-[#0F172A]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MENSAJES */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECCIÓN 1: DATOS COMERCIALES */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Building2 className="text-[#0F172A]" size={20} />
            <h2 className="text-base font-bold text-[var(--foreground)]">1. Datos Comerciales del Establecimiento</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Nombre Comercial
              </label>
              <input
                type="text"
                required
                value={config.nombre}
                onChange={(e) => setConfig(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Calzados Don Pepe"
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                RUC de la Empresa
              </label>
              <input
                type="text"
                required
                maxLength={13}
                value={config.ruc}
                onChange={(e) => setConfig(prev => ({ ...prev, ruc: e.target.value }))}
                placeholder="1790012345001"
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Dirección Matriz / Local
              </label>
              <input
                type="text"
                required
                value={config.direccion}
                onChange={(e) => setConfig(prev => ({ ...prev, direccion: e.target.value }))}
                placeholder="Av. 24 de Mayo y 10 de Agosto, Cevallos"
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={config.telefono || ""}
                  onChange={(e) => setConfig(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="0991234567"
                  className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={config.email || ""}
                  onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contacto@calzado.com"
                  className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: IDENTIDAD VISUAL */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Palette className="text-[#0F172A]" size={20} />
            <h2 className="text-base font-bold text-[var(--foreground)]">2. Identidad Visual & Personalización (Branding)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Color Primario Corporativo
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, primaryColor: c.hex }))}
                    className={`w-8 h-8 rounded-xl border-2 transition-transform ${
                      config.primaryColor === c.hex ? "scale-110 border-black shadow-sm" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
                <input
                  type="color"
                  value={config.primaryColor || "#0F172A"}
                  onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-8 h-8 rounded-xl cursor-pointer border border-[var(--border)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Logo Corporativo
              </label>
              <input
                type="text"
                value={config.logoUrl || ""}
                onChange={(e) => setConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://... URL del logo"
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: PARÁMETROS SRI */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Shield className="text-[#0F172A]" size={20} />
            <h2 className="text-base font-bold text-[var(--foreground)]">3. Parámetros Fiscales & Facturación SRI</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Ambiente SRI
              </label>
              <select
                value={config.sriAmbiente || "1"}
                onChange={(e) => setConfig(prev => ({ ...prev, sriAmbiente: e.target.value }))}
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              >
                <option value="1">1 - Pruebas / Sandbox</option>
                <option value="2">2 - Producción</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Establecimiento
              </label>
              <input
                type="text"
                maxLength={3}
                value={config.sriEstablecimiento || "001"}
                onChange={(e) => setConfig(prev => ({ ...prev, sriEstablecimiento: e.target.value }))}
                placeholder="001"
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold text-center font-mono focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Punto de Emisión
              </label>
              <input
                type="text"
                maxLength={3}
                value={config.sriPuntoEmision || "001"}
                onChange={(e) => setConfig(prev => ({ ...prev, sriPuntoEmision: e.target.value }))}
                placeholder="001"
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold text-center font-mono focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Obligado Contabilidad
              </label>
              <select
                value={config.sriObligadoContabilidad ? "SI" : "NO"}
                onChange={(e) => setConfig(prev => ({ ...prev, sriObligadoContabilidad: e.target.value === "SI" }))}
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              >
                <option value="NO">NO</option>
                <option value="SI">SÍ</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: NIVELES DE CRÉDITO */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <DollarSign className="text-[#0F172A]" size={20} />
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">4. Escala de Niveles de Crédito Directo y Topes Asignados 💳</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Define las políticas de crédito directo, cupos máximos iniciales y plazos permitidos para los clientes según su nivel.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--muted)]/60 border-b border-[var(--border)] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Nivel Crediticio</th>
                  <th className="p-3 text-center">Compras Requeridas (Pares)</th>
                  <th className="p-3 text-center">Cupo Límite Tope ($ USD)</th>
                  <th className="p-3 text-center">Plazo Máximo (Días)</th>
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
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeColor}`}>
                          {labelNivel}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={lvl.comprasRequeridas}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setNivelesCredito(prev => prev.map((item, i) => i === index ? { ...item, comprasRequeridas: val } : item));
                          }}
                          className="w-24 px-2 py-1.5 bg-[var(--muted)]/50 border border-[var(--border)] rounded-lg text-center font-mono font-bold focus:outline-none focus:border-[#0F172A]"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <span className="font-bold text-slate-400">$</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={lvl.limiteDolares}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setNivelesCredito(prev => prev.map((item, i) => i === index ? { ...item, limiteDolares: val } : item));
                            }}
                            className="w-28 px-2 py-1.5 bg-[var(--muted)]/50 border border-[var(--border)] rounded-lg text-center font-mono font-bold focus:outline-none focus:border-[#0F172A]"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={lvl.plazoDias}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setNivelesCredito(prev => prev.map((item, i) => i === index ? { ...item, plazoDias: val } : item));
                          }}
                          className="w-24 px-2 py-1.5 bg-[var(--muted)]/50 border border-[var(--border)] rounded-lg text-center font-mono font-bold focus:outline-none focus:border-[#0F172A]"
                        />
                      </td>
            </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECCIÓN 5: DESPACHO AUTOMÁTICO DE ÓRDENES DE COMPRA A PROVEEDORES */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="text-[#0F172A] dark:text-amber-400" size={20} />
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">5. Envío Automático Programado de Órdenes a Proveedores 🚚</h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Configura el envío automático diario de los pedidos y borradores acumulados a cada fabricante/proveedor.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              08:00 AM (Por Defecto)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Hora de Envío Automático Diario a Proveedores
              </label>
              <input
                type="time"
                value={config.horaInicioOperativa || "08:00"}
                onChange={(e) => setConfig(prev => ({ ...prev, horaInicioOperativa: e.target.value }))}
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              />
              <span className="text-[11px] text-[var(--muted-foreground)] mt-1 block">
                A esta hora, todas las órdenes en Borrador generadas por ventas o faltantes se emiten automáticamente.
              </span>
            </div>

            <div className="p-4 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs space-y-2">
              <span className="font-bold text-[var(--foreground)] block">💡 ¿Cómo funciona la consolidación?</span>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Durante el día, todos los pedidos de clientes con faltante de stock y calzados bajo inventario mínimo se acumulan en un solo <strong>Borrador por Proveedor</strong> (con el faltante + 1 docena de reserva). A la hora indicada ({config.horaInicioOperativa || "08:00"}), el sistema envía automáticamente el consolidado sin que tengas que generar múltiples órdenes manuales.
              </p>
            </div>
          </div>
        </div>

        {/* SECCIÓN 6: HORARIOS OPERATIVOS Y SEGURIDAD */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Clock className="text-[#0F172A]" size={20} />
            <h2 className="text-base font-bold text-[var(--foreground)]">6. Horarios Operativos de Sesión & Duración de Tokens</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Hora Inicio Jornada
              </label>
              <input
                type="time"
                value={config.horaInicioOperativa || "08:00"}
                onChange={(e) => setConfig(prev => ({ ...prev, horaInicioOperativa: e.target.value }))}
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Hora de Cierre Jornada
              </label>
              <input
                type="time"
                value={config.horaFinOperativa || "19:00"}
                onChange={(e) => setConfig(prev => ({ ...prev, horaFinOperativa: e.target.value }))}
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Duración de Sesión (Horas)
              </label>
              <select
                value={config.duracionSesionHoras || 24}
                onChange={(e) => setConfig(prev => ({ ...prev, duracionSesionHoras: parseInt(e.target.value) || 24 }))}
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              >
                <option value={8}>8 Horas (Turno Regular)</option>
                <option value={12}>12 Horas (Jornada Extendida)</option>
                <option value={24}>24 Horas (Todo el Día)</option>
                <option value={168}>7 Días (Semana Completa)</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-xl flex items-start gap-3 text-xs leading-relaxed">
            <Lock size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Protección de Sesión Activa</span>
              Durante la jornada de <strong>{config.horaInicioOperativa || "08:00"}</strong> a <strong>{config.horaFinOperativa || "19:00"}</strong>, el personal podrá utilizar los módulos sin que la pantalla se bloquee o se cierre la sesión cada 15 minutos.
            </div>
          </div>
        </div>

        {/* SECCIÓN 7: EMPRESAS DE TRANSPORTE Y LOGÍSTICA DE ENVÍOS */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <Truck className="text-[#0F172A] dark:text-amber-400" size={20} />
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">7. Empresas de Transporte y Envíos (Logística de Despacho) 🚚</h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Administra las cooperativas y empresas de encomienda disponibles para los pedidos con envío interprovincial o local.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowModalTransporte(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm w-fit"
            >
              <Plus size={15} />
              + Agregar Empresa de Transporte
            </button>
          </div>

          {loadingTransportes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[#0F172A]" size={24} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transportes.map((transp) => (
                <div
                  key={transp.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    transp.esPredeterminada
                      ? "bg-amber-500/5 border-amber-500/30 shadow-sm"
                      : "bg-[var(--muted)]/20 border-[var(--border)] hover:border-slate-400"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-sm text-[var(--foreground)]">
                        <Truck size={16} className={transp.esPredeterminada ? "text-amber-500" : "text-[var(--muted-foreground)]"} />
                        <span>{transp.nombre}</span>
                      </div>
                      {transp.esPredeterminada && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Star size={10} className="fill-amber-500 text-amber-500" />
                          Predeterminada
                        </span>
                      )}
                    </div>

                    {transp.telefono && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <Phone size={12} />
                        <span>{transp.telefono}</span>
                      </div>
                    )}
                    {transp.direccion && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <MapPin size={12} />
                        <span>{transp.direccion}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border)]/60 text-xs">
                    {!transp.esPredeterminada ? (
                      <button
                        type="button"
                        onClick={() => handleSetPredeterminada(transp.id, transp.nombre)}
                        className="text-[11px] font-semibold text-[#0F172A] dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Star size={12} />
                        Marcar como Predeterminada
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle size={12} /> Opción por defecto
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteTransporte(transp.id, transp.nombre)}
                      className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors ml-auto"
                      title="Eliminar Transporte"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══════ LANDING PAGE & CATÁLOGO ONLINE (Fase E3) ══════ */}
        <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-emerald-500/20">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Landing Page y Catálogo Online Público</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">Configura tu página pública de presentación del negocio y catálogo de calzado</p>
            </div>
            {config.nombre && (
              <a
                href={`/landing?tenantId=${typeof window !== 'undefined' ? localStorage.getItem('tenantId') || '' : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold rounded-xl transition-all"
              >
                <ExternalLink size={12} />
                Ver Landing Pública
              </a>
            )}
          </div>

          {/* Hero */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Título Principal (Hero)
              </label>
              <input
                type="text"
                value={config.heroTitulo || ""}
                onChange={(e) => setConfig({ ...config, heroTitulo: e.target.value })}
                placeholder="Ej: Calzado 100% Cuero de Cevallos"
                className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Subtítulo del Hero
              </label>
              <input
                type="text"
                value={config.heroSubtitulo || ""}
                onChange={(e) => setConfig({ ...config, heroSubtitulo: e.target.value })}
                placeholder="Ej: Venta mayorista directa de fábrica..."
                className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Banner URL */}
          <div>
            <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
              <Image size={12} className="inline mr-1" /> URL de Imagen Banner del Hero (opcional)
            </label>
            <input
              type="url"
              value={config.heroBannerUrl || ""}
              onChange={(e) => setConfig({ ...config, heroBannerUrl: e.target.value })}
              placeholder="https://res.cloudinary.com/...  o cualquier URL de imagen"
              className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500"
            />
            {config.heroBannerUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border border-[var(--border)] max-h-32">
                <img src={config.heroBannerUrl} alt="Banner preview" className="w-full h-32 object-cover" />
              </div>
            )}
          </div>

          {/* Sobre Nosotros */}
          <div>
            <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
              Sobre Nosotros / Descripción del Negocio
            </label>
            <textarea
              rows={3}
              value={config.sobreNosotros || ""}
              onChange={(e) => setConfig({ ...config, sobreNosotros: e.target.value })}
              placeholder="Descripción para la sección 'Sobre Nosotros' de tu landing..."
              className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Redes Sociales y WhatsApp */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Share2 size={14} className="text-emerald-600" />
              <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Redes Sociales y Contacto</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                  📱 WhatsApp de Contacto (con código de país)
                </label>
                <input
                  type="text"
                  value={config.whatsappContacto || ""}
                  onChange={(e) => setConfig({ ...config, whatsappContacto: e.target.value })}
                  placeholder="Ej: 593987654321"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                  📘 Facebook (URL completa)
                </label>
                <input
                  type="url"
                  value={config.facebookUrl || ""}
                  onChange={(e) => setConfig({ ...config, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/tu-pagina"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                  📸 Instagram (URL completa)
                </label>
                <input
                  type="url"
                  value={config.instagramUrl || ""}
                  onChange={(e) => setConfig({ ...config, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/tu-cuenta"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                  🎵 TikTok (URL completa)
                </label>
                <input
                  type="url"
                  value={config.tiktokUrl || ""}
                  onChange={(e) => setConfig({ ...config, tiktokUrl: e.target.value })}
                  placeholder="https://tiktok.com/@tu-cuenta"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Visibilidad del Catálogo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-emerald-600" />
              <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Visibilidad del Catálogo Público</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl">
                <input
                  type="checkbox"
                  id="chkMostrarPrecios"
                  checked={config.mostrarPreciosPublico ?? true}
                  onChange={(e) => setConfig({ ...config, mostrarPreciosPublico: e.target.checked })}
                  className="rounded border-emerald-400 text-emerald-500 focus:ring-emerald-400 h-4 w-4"
                />
                <label htmlFor="chkMostrarPrecios" className="text-xs font-bold text-[var(--foreground)] cursor-pointer">
                  {config.mostrarPreciosPublico ? <Eye size={12} className="inline mr-1 text-emerald-500" /> : <EyeOff size={12} className="inline mr-1 text-rose-400" />}
                  Mostrar precios en el catálogo público
                </label>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl">
                <input
                  type="checkbox"
                  id="chkMostrarStock"
                  checked={config.mostrarStockPublico ?? true}
                  onChange={(e) => setConfig({ ...config, mostrarStockPublico: e.target.checked })}
                  className="rounded border-emerald-400 text-emerald-500 focus:ring-emerald-400 h-4 w-4"
                />
                <label htmlFor="chkMostrarStock" className="text-xs font-bold text-[var(--foreground)] cursor-pointer">
                  {config.mostrarStockPublico ? <Eye size={12} className="inline mr-1 text-emerald-500" /> : <EyeOff size={12} className="inline mr-1 text-rose-400" />}
                  Mostrar disponibilidad de stock en el catálogo público
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle size={15} />}
            Guardar Personalización
          </button>
        </div>
      </form>

      {/* MODAL CREAR NUEVA EMPRESA DE TRANSPORTE */}
      {showModalTransporte && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Truck className="text-[#0F172A] dark:text-amber-400" size={20} />
                <h3 className="text-base font-bold text-[var(--foreground)]">Nueva Empresa de Transporte</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalTransporte(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearTransporte} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  Nombre de la Empresa / Cooperativa *
                </label>
                <input
                  type="text"
                  required
                  value={nuevoTranspNombre}
                  onChange={(e) => setNuevoTranspNombre(e.target.value)}
                  placeholder="Ej: Transporte Los Andes, Flota Pelileo..."
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp de Encomiendas (Opcional)
                </label>
                <input
                  type="text"
                  value={nuevoTranspTel}
                  onChange={(e) => setNuevoTranspTel(e.target.value)}
                  placeholder="Ej: 0987654321 / 032-876543"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  Dirección de Terminal / Oficina (Opcional)
                </label>
                <input
                  type="text"
                  value={nuevoTranspDir}
                  onChange={(e) => setNuevoTranspDir(e.target.value)}
                  placeholder="Ej: Terminal Terrestre de Cevallos, Oficina 4"
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <input
                  type="checkbox"
                  id="chkPredet"
                  checked={nuevoTranspPredet}
                  onChange={(e) => setNuevoTranspPredet(e.target.checked)}
                  className="rounded border-amber-400 text-amber-500 focus:ring-amber-400 h-4 w-4"
                />
                <label htmlFor="chkPredet" className="text-xs font-bold text-[var(--foreground)] cursor-pointer">
                  ⭐ Establecer como empresa predeterminada para todos los envíos
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowModalTransporte(false)}
                  className="px-4 py-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] text-xs font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTransporte || !nuevoTranspNombre.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {guardandoTransporte ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  Guardar Transporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación UI (Reemplaza confirm nativo) */}
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
