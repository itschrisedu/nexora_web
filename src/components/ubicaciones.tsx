"use client";

import { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
import { GeolocationService } from "@/services/geolocation.service";
import {
  MapPin,
  RefreshCw,
  Search,
  ExternalLink,
  Users,
  Navigation,
  Clock,
  Building2,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface VendorLocation {
  id: string;
  lat: number;
  lng: number;
  direccion?: string;
  timestamp: string;
}

interface Vendedor {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  sucursal: string;
  ultimaUbicacion?: VendorLocation | null;
}

export default function UbicacionesComponent({ online }: { online: boolean }) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  useEffect(() => {
    cargarUbicaciones();
  }, [online]);

  const cargarUbicaciones = async () => {
    setLoading(true);
    try {
      if (online) {
        const res = await ApiService.get("/configuracion/geolocalizacion/vendedores");
        if (Array.isArray(res)) setVendedores(res);
      }
    } catch (e) {
      console.warn("Error cargando ubicaciones de vendedores:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReportCurrentLocation = async () => {
    setReporting(true);
    setReportMsg("");
    try {
      const ok = await GeolocationService.captureAndReportLocation();
      if (ok) {
        setReportMsg("Ubicación actual enviada al servidor con éxito.");
        cargarUbicaciones();
      } else {
        setReportMsg("No se pudo obtener la geolocalización del navegador. Verifica los permisos de GPS.");
      }
    } catch (err: any) {
      setReportMsg(err.message || "Error al capturar ubicación.");
    } finally {
      setReporting(false);
      setTimeout(() => setReportMsg(""), 5000);
    }
  };

  const getTimeAgo = (timestampStr?: string) => {
    if (!timestampStr) return "Sin reportes";
    const diffMs = new Date().getTime() - new Date(timestampStr).getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return "Hace un momento";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  };

  const isRecent = (timestampStr?: string) => {
    if (!timestampStr) return false;
    const diffMs = new Date().getTime() - new Date(timestampStr).getTime();
    return diffMs < 24 * 60 * 60 * 1000; // Últimas 24 horas
  };

  const filtered = vendedores.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.nombre.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.sucursal.toLowerCase().includes(q)
    );
  });

  const totalVendedores = vendedores.length;
  const activosHoy = vendedores.filter((v) => isRecent(v.ultimaUbicacion?.timestamp)).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm p-6 rounded-3xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
              <MapPin className="text-amber-600 dark:text-amber-400" size={26} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-[var(--foreground)]">
                Centro de Monitoreo GPS
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] font-medium">
                Rastreo geográfico de personal en campo, cobradores y vendedores en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReportCurrentLocation}
              disabled={reporting}
              className="px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              {reporting ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
              <span>Reportar Mi Posición GPS</span>
            </button>
            <button
              onClick={cargarUbicaciones}
              disabled={loading}
              className="p-2.5 bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-xl transition-colors shadow-sm"
              title="Actualizar datos"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* KPIs de Monitoreo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--border)]">
          <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[11px] text-[var(--muted-foreground)] font-medium block">
                Personal Registrado
              </span>
              <span className="text-xl font-black text-[var(--foreground)] font-mono">{totalVendedores}</span>
            </div>
          </div>

          <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[11px] text-[var(--muted-foreground)] font-medium block">
                Reportes en las Últimas 24h
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {activosHoy}
              </span>
            </div>
          </div>

          <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="text-[11px] text-[var(--muted-foreground)] font-medium block">Frecuencia GPS</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Automático cada 15 min
              </span>
            </div>
          </div>
        </div>
      </div>

      {reportMsg && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{reportMsg}</span>
        </div>
      )}

      {/* Buscador */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Buscar por vendedor, correo o sucursal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] focus:outline-none focus:border-[#0F172A]"
          />
        </div>
      </div>

      {/* Grid de Vendedores y Ubicaciones */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)]">
          <Loader2 size={32} className="animate-spin text-amber-500 mb-2" />
          <span className="text-xs">Cargando monitoreo de personal...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          No se encontraron usuarios de personal para geolocalización.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((v) => {
            const loc = v.ultimaUbicacion;
            const tieneLoc = !!loc && typeof loc.lat === "number" && typeof loc.lng === "number";
            const reciente = isRecent(loc?.timestamp);

            return (
              <div
                key={v.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                {/* Header Vendedor */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 font-bold text-sm flex items-center justify-center border border-amber-500/20">
                        {v.nombre ? v.nombre.slice(0, 2).toUpperCase() : "US"}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--foreground)]">{v.nombre}</h4>
                        <span className="text-[10px] text-[var(--muted-foreground)] block truncate">{v.email}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                        reciente ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-500"
                      }`}
                    >
                      {reciente ? "ACTIVO" : "INACTIVO"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--muted)] font-semibold border border-[var(--border)]">
                      {v.rol === "ROL_VENDEDOR" ? "Vendedor" : v.rol === "ROL_ADMIN" ? "Administrador" : v.rol}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={11} /> {v.sucursal}
                    </span>
                  </div>
                </div>

                {/* Info Ubicación */}
                <div className="p-3.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl space-y-2">
                  {tieneLoc ? (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[10px] font-bold text-[var(--foreground)]">
                          {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                          <Clock size={11} /> {getTimeAgo(loc.timestamp)}
                        </span>
                      </div>
                      {loc.direccion && (
                        <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                          📍 {loc.direccion}
                        </p>
                      )}
                      <a
                        href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        <span>Ver en Google Maps</span>
                        <ExternalLink size={12} />
                      </a>
                    </>
                  ) : (
                    <div className="py-2 text-center space-y-1">
                      <MapPin size={18} className="mx-auto text-[var(--muted-foreground)] opacity-40" />
                      <p className="text-xs text-[var(--muted-foreground)] font-medium">Sin ubicación registrada</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        El dispositivo reportará coordenadas al iniciar sesión o realizar cobros.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
