"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import { uploadToCloudinary, deleteFromCloudinary } from "../services/cloudinary.service";
import {
  Palette, Upload, Clock, MapPin, RefreshCw, CheckCircle, AlertCircle,
  Loader2, Shield, User, Smartphone, Navigation, Sun, Moon, Lock, Trash2, Building2, DollarSign
} from "lucide-react";

interface CreditLevelConfigItem {
  id?: string;
  nivel: string;
  comprasRequeridas: number;
  limiteDolares: number;
  plazoDias: number;
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
}

interface VendedorUbicacion {
  id: string;
  nombre: string;
  email: string;
  ultimaUbicacion?: {
    lat: number;
    lng: number;
    direccion?: string;
    timestamp: string;
  } | null;
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
  });

  const [nivelesCredito, setNivelesCredito] = useState<CreditLevelConfigItem[]>([
    { nivel: "NIVEL_1", comprasRequeridas: 10, limiteDolares: 300, plazoDias: 15 },
    { nivel: "NIVEL_2", comprasRequeridas: 15, limiteDolares: 700, plazoDias: 30 },
    { nivel: "NIVEL_3", comprasRequeridas: 25, limiteDolares: 1500, plazoDias: 30 },
    { nivel: "NIVEL_4", comprasRequeridas: 40, limiteDolares: 3000, plazoDias: 45 },
  ]);

  const [vendedores, setVendedores] = useState<VendedorUbicacion[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);

  useEffect(() => {
    loadConfig();
    loadVendedores();
  }, [online]);

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

  const loadVendedores = async () => {
    if (!online) return;
    setLoadingVendedores(true);
    try {
      const data = await ApiService.get("/configuracion/geolocalizacion/vendedores");
      if (Array.isArray(data)) {
        setVendedores(data);
      }
    } catch (err) {
      console.error("Error cargando ubicaciones de vendedores:", err);
    } finally {
      setLoadingVendedores(false);
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#0F172A]" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)] flex items-center gap-2">
            <Palette className="text-[#0F172A]" size={26} />
            Centro de Configuración Global ⚙️
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Parámetros comerciales del negocio, datos fiscales SRI, personalización visual y gobernanza del sistema.
          </p>
        </div>
        <button
          onClick={loadConfig}
          disabled={!online}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--foreground)] hover:opacity-80 transition-opacity self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Recargar
        </button>
      </div>

      {/* Mensajes de Estado */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-fadeIn">
          <CheckCircle size={18} />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-fadeIn">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECCIÓN 1: DATOS COMERCIALES DEL NEGOCIO */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Building2 className="text-[#0F172A]" size={20} />
            <h2 className="text-base font-bold text-[var(--foreground)]">1. Datos Comerciales del Establecimiento</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Nombre Comercial / Razón Social <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={config.nombre}
                onChange={(e) => setConfig(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej. Calzados Cevallos S.A."
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                RUC del Comercio <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={config.ruc}
                onChange={(e) => setConfig(prev => ({ ...prev, ruc: e.target.value }))}
                placeholder="Ej. 1890123456001"
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Dirección Matriz <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={config.direccion}
                onChange={(e) => setConfig(prev => ({ ...prev, direccion: e.target.value }))}
                placeholder="Ej. Av. 13 de Mayo y Gonzales Suárez, Cevallos"
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
                  placeholder="Ej. 0991234567"
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
                  placeholder="contacto@calzadocevallos.com"
                  className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: IDENTIDAD Y MARCA */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Palette className="text-[#0F172A]" size={20} />
            <h2 className="text-base font-bold text-[var(--foreground)]">2. Identidad Visual & Personalización (Branding)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Corporativo */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                Logo de la Empresa
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)]/40 flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {config.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Upload className="text-[var(--muted-foreground)]" size={24} />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                      <Upload size={14} />
                      Subir Imagen
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                    {config.logoUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (config.logoUrl && config.logoUrl.includes("cloudinary.com")) {
                            await deleteFromCloudinary(config.logoUrl);
                          }
                          setConfig(prev => ({ ...prev, logoUrl: "" }));
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-xs font-bold transition-all border border-rose-500/20"
                        title="Eliminar logo actual"
                      >
                        <Trash2 size={14} /> Quitar
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Recomendado: Formato PNG o SVG transparente (Máx. 2MB).
                  </p>
                </div>
              </div>
            </div>

            {/* Color Principal */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                Color Principal de la Interfaz
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, primaryColor: c.hex }))}
                    style={{ backgroundColor: c.hex }}
                    className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center ${
                      config.primaryColor === c.hex
                        ? "ring-4 ring-offset-2 ring-[#0F172A] scale-110 shadow-md"
                        : "opacity-80 hover:opacity-100"
                    }`}
                    title={c.label}
                  />
                ))}
                <div className="flex items-center gap-2 border border-[var(--border)] rounded-xl px-2 py-1 bg-[var(--muted)]/40">
                  <input
                    type="color"
                    value={config.primaryColor || "#0F172A"}
                    onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold uppercase">{config.primaryColor || "#0F172A"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: PARAMETROS FISCALES SRI */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Shield className="text-[#0F172A]" size={20} />
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">3. Parámetros Fiscales & Facturación SRI</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Datos de emisión de comprobantes electrónicos autorizados por el SRI Ecuador.
              </p>
            </div>
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
                <option value="1">1 - Pruebas / Homologación</option>
                <option value="2">2 - Producción Real</option>
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

        {/* SECCIÓN 4: PARÁMETROS DEL SCORING CREDITICIO */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <DollarSign className="text-[#0F172A]" size={20} />
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">4. Parámetros del Scoring Crediticio Progresivo 💳</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Define las políticas de crédito directo, cupos máximos iniciales y plazos permitidos para clientes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Cupo Crédito Inicial ($)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={config.creditMontoMaximoInicial ?? 200}
                onChange={(e) => setConfig(prev => ({ ...prev, creditMontoMaximoInicial: parseFloat(e.target.value) || 0 }))}
                placeholder="200"
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold text-center font-mono focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Plazo Máximo Pago (Días)
              </label>
              <select
                value={config.creditPlazoMaximoDias ?? 30}
                onChange={(e) => setConfig(prev => ({ ...prev, creditPlazoMaximoDias: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0F172A]"
              >
                <option value={15}>15 Días (Quincenal)</option>
                <option value={30}>30 Días (Mensual)</option>
                <option value={60}>60 Días (Bimensual)</option>
                <option value={90}>90 Días (Trimestral)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Score Mínimo Aprobación
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={config.creditScoreMinimo ?? 60}
                onChange={(e) => setConfig(prev => ({ ...prev, creditScoreMinimo: parseInt(e.target.value) || 0 }))}
                placeholder="60"
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold text-center font-mono focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Recargo por Mora (% Mensual)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={config.creditTasaMoraPct ?? 2.5}
                onChange={(e) => setConfig(prev => ({ ...prev, creditTasaMoraPct: parseFloat(e.target.value) || 0 }))}
                placeholder="2.5"
                className="w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-semibold text-center font-mono focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          {/* TABLA EDITABLE DE ESCALA DE NIVELES DE CRÉDITO */}
          <div className="border-t border-[var(--border)] pt-4 space-y-3">
            <h3 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
              Escala de Niveles de Crédito Directo y Topes Asignados por la Sucursal
            </h3>
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
                    const labelNivel = lvl.nivel === "NIVEL_1" ? "Nivel 1 (Inicial)" : lvl.nivel === "NIVEL_2" ? "Nivel 2 (Bronce)" : lvl.nivel === "NIVEL_3" ? "Nivel 3 (Plata)" : "Nivel 4 (Oro / VIP)";
                    const badgeColor = lvl.nivel === "NIVEL_1" ? "bg-slate-500/10 text-slate-600 border-slate-500/20" : lvl.nivel === "NIVEL_2" ? "bg-amber-500/10 text-amber-700 border-amber-500/20" : lvl.nivel === "NIVEL_3" ? "bg-slate-300/30 text-slate-700 border-slate-400/30" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
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
                            min="1"
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
        </div>

        {/* SECCIÓN 5: HORARIOS OPERATIVOS DE SESIÓN */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Clock className="text-[#0F172A]" size={20} />
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">2. Horarios Operativos de Sesión</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Define la jornada de trabajo para mantener las sesiones activas sin cierres constantes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                Hora de Inicio Jornada
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

        {/* BOTÓN GUARDAR */}
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

      {/* SECCIÓN 3: RASTREO Y GEOLOCALIZACIÓN DE VENDEDORES */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Navigation className="text-[#0F172A]" size={20} />
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">3. Seguimiento y Geolocalización de Vendedores (GPS)</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Supervisa la ubicación en tiempo real reportada por el personal de ventas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadVendedores}
            disabled={loadingVendedores}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--foreground)] hover:opacity-80 transition-opacity self-start"
          >
            <RefreshCw size={13} className={loadingVendedores ? "animate-spin" : ""} />
            Actualizar GPS
          </button>
        </div>

        {loadingVendedores ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[#0F172A]" size={24} />
          </div>
        ) : vendedores.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--muted-foreground)] italic border border-dashed border-[var(--border)] rounded-xl">
            No se han encontrado registros de ubicación recientes de vendedores.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendedores.map((v) => {
              const ub = v.ultimaUbicacion;
              return (
                <div key={v.id} className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0F172A]/10 text-[#0F172A] flex items-center justify-center font-bold text-xs">
                        {v.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{v.nombre}</div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">{v.email}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      ub ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                    }`}>
                      {ub ? "GPS Activo" : "Sin Datos GPS"}
                    </span>
                  </div>

                  {ub ? (
                    <div className="space-y-1.5 text-xs border-t border-[var(--border)] pt-2.5">
                      <div className="flex items-center gap-1.5 text-[var(--foreground)] font-semibold">
                        <MapPin size={13} className="text-red-500" />
                        {ub.lat.toFixed(5)}, {ub.lng.toFixed(5)}
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)]">
                        Última actualización: {new Date(ub.timestamp).toLocaleString("es-EC")}
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${ub.lat},${ub.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline pt-1"
                      >
                        <Navigation size={12} /> Ver Mapa Google
                      </a>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[var(--muted-foreground)] italic">
                      El vendedor aún no ha iniciado reporte de GPS desde su dispositivo.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
