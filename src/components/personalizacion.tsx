"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import {
  Palette, Upload, Clock, MapPin, RefreshCw, CheckCircle, AlertCircle,
  Loader2, Shield, User, Smartphone, Navigation, Sun, Moon, Lock
} from "lucide-react";

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
  });

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
        const data = await ApiService.get("/configuracion/negocio");
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
          });

          if (data.primaryColor && typeof document !== "undefined") {
            document.documentElement.style.setProperty("--primary", data.primaryColor);
          }
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
      await ApiService.put("/configuracion/negocio", config);
      setSuccess("Configuración de personalización guardada correctamente.");
      if (typeof document !== "undefined" && config.primaryColor) {
        document.documentElement.style.setProperty("--primary", config.primaryColor);
      }
    } catch (err: any) {
      setError(err.message || "Error al guardar la personalización.");
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
            Personalización & Sistema
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Gestiona la identidad de tu marca, horarios operativos de sesión y seguimiento GPS de personal.
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
        {/* SECCIÓN 1: IDENTIDAD Y MARCA */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Palette className="text-[#0F172A]" size={20} />
            <h2 className="text-base font-bold text-[var(--foreground)]">1. Identidad Visual y Marca</h2>
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
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                    <Upload size={14} />
                    Subir Imagen
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
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

        {/* SECCIÓN 2: HORARIOS OPERATIVOS DE SESIÓN */}
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
