"use client";

import React, { useState } from "react";
import {
  MapPin,
  Navigation,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Compass,
  Info,
  Smartphone,
  Lock,
} from "lucide-react";
import { ApiService } from "@/services/api.service";

interface GpsConsentModalProps {
  isOpen: boolean;
  userNombre: string;
  userRol: string;
  onAccepted: () => void;
}

export default function GpsConsentModal({
  isOpen,
  userNombre,
  userRol,
  onAccepted,
}: GpsConsentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gpsDenied, setGpsDenied] = useState(false);
  const [coordsObtained, setCoordsObtained] = useState<{ lat: number; lng: number } | null>(null);

  if (!isOpen) return null;

  const handleRequestGps = () => {
    setLoading(true);
    setError("");
    setGpsDenied(false);

    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Tu dispositivo o navegador no soporta geolocalización GPS.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoordsObtained({ lat: latitude, lng: longitude });

        try {
          // Registrar en el backend el consentimiento GPS
          await ApiService.post("/auth/accept-gps", {});

          // Enviar reporte de ubicación inicial de inicio de jornada si existe el endpoint
          await ApiService.post("/audit/vendor-locations", {
            lat: latitude,
            lng: longitude,
            accuracy: accuracy || 10,
            tipoEvento: "INICIO_JORNADA_ONBOARDING",
          }).catch(() => null);

          setLoading(false);
          onAccepted();
        } catch (err: any) {
          setError(err.message || "Error al registrar la confirmación de GPS.");
          setLoading(false);
        }
      },
      (geoError) => {
        setLoading(false);
        setGpsDenied(true);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(
            "El permiso de ubicación fue denegado. Para operar como personal de ventas o bodega, debes autorizar el acceso a la ubicación en tu navegador."
          );
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setError("No se pudo obtener la señal satelital GPS. Verifica que tu antena de ubicación esté activa.");
        } else {
          setError("Tiempo de espera agotado al consultar la ubicación satelital.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[var(--card)] border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* ─── CABECERA DEL MODAL ─── */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Navigation size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  ONBOARDING OPERATIVO
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">{userRol}</span>
              </div>
              <h2 className="text-base font-black tracking-tight text-white">
                Activación de Geolocalización Operativa
              </h2>
            </div>
          </div>
        </div>

        {/* ─── CONTENIDO EXPLICATIVO ─── */}
        <div className="p-6 space-y-4 text-xs text-[var(--foreground)] leading-relaxed">
          <div className="text-center py-2 space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
              <MapPin size={28} />
            </div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              {userNombre}, requerimos tu ubicación en jornada laboral
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] max-w-sm mx-auto">
              Para validar las visitas a clientes mayoristas, entregas de lotes de calzado en Cevallos y apertura de turnos en sucursal.
            </p>
          </div>

          {/* FUNDAMENTO LEGAL Y TRANSPARENCIA */}
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[var(--foreground)]">
                <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                <span>Uso exclusivo en horario de trabajo</span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Conforme al Art. 42 del Código del Trabajo, el monitoreo satelital opera únicamente durante tu jornada operativa para certificar transacciones y despachos comerciales.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[var(--foreground)]">
                <Lock size={15} className="text-amber-500 shrink-0" />
                <span>Privacidad y Protección LOPDP</span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Tus datos de posicionamiento están resguardados bajo estricto sigilo comercial y no son compartidos con terceros ajenos a la operación del establecimiento.
              </p>
            </div>
          </div>

          {/* GUÍA EN CASO DE PERMISO DENEGADO */}
          {gpsDenied && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-amber-900 dark:text-amber-300">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>¿Cómo activar la ubicación en tu navegador?</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-[var(--foreground)] pl-1">
                <li>Haz clic en el <strong>icono del candado 🔒</strong> junto a la dirección URL en la barra superior.</li>
                <li>Busca la opción <strong>Ubicación / Localización</strong> y cámbiala a <strong>Permitir</strong>.</li>
                <li>Vuelve a presionar el botón <strong>Activar Ubicación y Continuar</strong>.</li>
              </ol>
            </div>
          )}

          {/* MENSAJE DE ERROR */}
          {error && !gpsDenied && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* ─── BOTÓN DE ACCIÓN BLOQUEANTE ─── */}
        <div className="px-6 py-4 bg-[var(--muted)]/30 border-t border-[var(--border)] shrink-0 space-y-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleRequestGps}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={15} />
                <span>Consultando señal satelital GPS...</span>
              </>
            ) : (
              <>
                <Compass size={15} className="text-blue-400" />
                <span>Activar Ubicación y Continuar</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-[var(--muted-foreground)]">
            Requisito mandatorio para habilitar el Punto de Venta y Registro de Pedidos.
          </p>
        </div>
      </div>
    </div>
  );
}
