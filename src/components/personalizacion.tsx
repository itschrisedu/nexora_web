"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import { uploadToCloudinary } from "../services/cloudinary.service";
import {
  Palette, Clock, MapPin, CheckCircle, AlertCircle,
  Loader2, Shield, Lock, Building2, DollarSign
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
    { nivel: "SIN_CREDITO", comprasRequeridas: 10, limiteDolares: 0, plazoDias: 0 },
    { nivel: "NIVEL_1", comprasRequeridas: 15, limiteDolares: 300, plazoDias: 15 },
    { nivel: "NIVEL_2", comprasRequeridas: 25, limiteDolares: 700, plazoDias: 30 },
    { nivel: "NIVEL_3", comprasRequeridas: 40, limiteDolares: 1500, plazoDias: 30 },
    { nivel: "NIVEL_4", comprasRequeridas: 60, limiteDolares: 3000, plazoDias: 45 },
  ]);

  useEffect(() => {
    loadConfig();
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
    </div>
  );
}
