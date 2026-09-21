"use client";

import { useEffect, useState, useCallback } from "react";
import { ApiService } from "@/services/api.service";
import {
  AlertTriangle,
  Clock,
  Lock,
  MessageCircle,
  Copy,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Building,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export interface SubscriptionStatus {
  tenantId: string;
  tenantName: string;
  plan: "PLAN_BASICO" | "PLAN_COMERCIAL" | "PLAN_MAYORISTA";
  estadoSuscripcion: "EN_PRUEBA" | "ACTIVA" | "GRACIA" | "SUSPENDIDA";
  fechaVencimientoPlan: string | null;
  diasRestantes: number;
  diasVencido: number;
  stage: "OK" | "RENOVACION_PROXIMA" | "GRACIA_1" | "GRACIA_2" | "BLOQUEADO";
  opacidad: number;
  bloqueado: boolean;
  mensaje: string;
  maxSucursales: number;
  maxUsuarios: number;
  precioMensualPlan: number;
  superAdminWhatsapp: string;
  bancoInfo: {
    banco: string;
    tipoCuenta: string;
    numeroCuenta: string;
    titular: string;
    ruc: string;
    email: string;
  };
}

const PLAN_NAMES: Record<string, string> = {
  PLAN_BASICO: "Plan Básico (1 Sucursal / 2 Usuarios)",
  PLAN_COMERCIAL: "Plan Comercial (3 Sucursales / 6 Usuarios)",
  PLAN_MAYORISTA: "Plan Mayorista (Ilimitado / Multi-Bodega / ML Scoring)",
};

export default function SubscriptionGraceBanner({
  onStatusChange,
}: {
  onStatusChange?: (status: SubscriptionStatus | null) => void;
}) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = (await ApiService.get("/tenants/my-status")) as SubscriptionStatus;
      if (res && res.stage) {
        setStatus(res);
        if (onStatusChange) onStatusChange(res);

        // Aplicar opacidad visual dinámica al contenedor principal de la aplicación
        const appMain = document.getElementById("nexora-main-content");
        if (appMain) {
          if (res.stage === "GRACIA_2") {
            appMain.style.opacity = "0.60";
            appMain.style.transition = "opacity 0.5s ease-in-out";
          } else if (res.stage === "GRACIA_1") {
            appMain.style.opacity = "0.95";
            appMain.style.transition = "opacity 0.5s ease-in-out";
          } else if (res.stage === "BLOQUEADO") {
            appMain.style.opacity = "0.0";
          } else {
            appMain.style.opacity = "1.0";
          }
        }
      }
    } catch {
      // Ignorar si el usuario no tiene sesión o es superadmin general
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchStatus();
    // Consultar periódicamente cada 5 minutos
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  if (!status || status.stage === "OK" || status.tenantId === "SUPER_ADMIN") {
    return null;
  }

  const planName = PLAN_NAMES[status.plan] || status.plan;
  const whatsappUrl = `https://wa.me/${status.superAdminWhatsapp}?text=${encodeURIComponent(
    `Hola NEXORA, adjunto el comprobante de pago de la suscripción para el negocio "${status.tenantName}" (${planName}) por un valor de $${status.precioMensualPlan}.00.`
  )}`;

  return (
    <>
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. BANNERS SUPERIORES DE AVISO Y PERÍODO DE GRACIA (Etapas 1 a 4) */}
      {/* ────────────────────────────────────────────────────────── */}
      {!status.bloqueado && (
        <div
          className={`w-full px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md z-40 relative transition-all border-b ${
            status.stage === "RENOVACION_PROXIMA"
              ? "bg-amber-950/80 border-amber-600/40 text-amber-200"
              : status.stage === "GRACIA_1"
              ? "bg-orange-950/90 border-orange-600/50 text-orange-200"
              : "bg-rose-950/90 border-rose-600/60 text-rose-200 animate-pulse"
          }`}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {status.stage === "RENOVACION_PROXIMA" ? (
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            ) : status.stage === "GRACIA_1" ? (
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <div className="truncate">
              <span className="font-black uppercase tracking-wider text-[11px] mr-2 px-2 py-0.5 rounded-full border bg-black/40 border-current">
                {status.stage === "RENOVACION_PROXIMA"
                  ? "Aviso de Renovación"
                  : status.stage === "GRACIA_1"
                  ? `Gracia Día ${status.diasVencido}/5`
                  : `Aviso Urgente: Gracia Día ${status.diasVencido}/5`}
              </span>
              <span>{status.mensaje}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold rounded-lg border border-white/20 transition-all text-xs flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Ver Datos de Pago</span>
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all text-xs flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reportar Pago</span>
            </a>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. PANTALLA COMPLETA DE BLOQUEO (Día 5+ o SUSPENDIDA)       */}
      {/* ────────────────────────────────────────────────────────── */}
      {status.bloqueado && (
        <div className="fixed inset-0 z-[9999] bg-[#07080a]/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-[#0f1114] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/40 text-center relative overflow-hidden">
            {/* Glow decorativo de fondo */}
            <div className="absolute -top-24 -left-24 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              Acceso a NEXORA Pausado
            </span>

            <h2 className="text-2xl font-black text-white tracking-tight">
              {status.tenantName}
            </h2>

            <p className="text-sm text-slate-400 mt-2 mb-6 max-w-md mx-auto leading-relaxed">
              El período de gracia de 5 días para tu <strong className="text-white">{planName}</strong> ha finalizado. Realiza tu transferencia para reactivar el sistema inmediatamente.
            </p>

            {/* Tarjeta con los datos de cuenta bancaria */}
            <div className="bg-[#14161a] border border-white/10 rounded-2xl p-5 text-left mb-6 relative group">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Datos para Transferencia Bancaria
                  </span>
                </div>
                <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-700/50">
                  Total: ${status.precioMensualPlan}.00 / mes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Banco:</span>
                  <span className="text-white font-semibold">{status.bancoInfo.banco}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Tipo de Cuenta:</span>
                  <span className="text-white font-semibold">{status.bancoInfo.tipoCuenta}</span>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Número de Cuenta:</span>
                    <span className="text-white font-mono font-bold text-sm tracking-wider">
                      {status.bancoInfo.numeroCuenta}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(status.bancoInfo.numeroCuenta, "cta")}
                    className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all flex items-center gap-1 text-xs"
                    title="Copiar número"
                  >
                    {copiedField === "cta" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Titular:</span>
                  <span className="text-white font-semibold">{status.bancoInfo.titular}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">RUC / C.I.:</span>
                  <span className="text-white font-semibold">{status.bancoInfo.ruc}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block text-[11px]">Email para Comprobante:</span>
                  <span className="text-emerald-400 font-semibold">{status.bancoInfo.email}</span>
                </div>
              </div>
            </div>

            {/* Acciones principales */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar Comprobante por WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <button
                onClick={fetchStatus}
                disabled={loading}
                className="py-3 px-4 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl text-sm transition-all border border-white/10 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
                <span>Verificar Reactivación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. MODAL FLOTANTE DE DATOS BANCARIOS (Para etapas 1 a 4)   */}
      {/* ────────────────────────────────────────────────────────── */}
      {showPaymentModal && !status.bloqueado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#111317] border border-white/15 rounded-3xl p-6 shadow-2xl relative text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Datos de Pago de Suscripción</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 bg-emerald-950/30 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Plan Asignado:</span>
                <span className="text-sm font-bold text-white">{planName}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Valor Mensual:</span>
                <span className="text-base font-black text-emerald-400">${status.precioMensualPlan}.00</span>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-black/40 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between">
                <span className="text-slate-500">Banco:</span>
                <span className="text-white font-semibold">{status.bancoInfo.banco}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo:</span>
                <span className="text-white font-semibold">{status.bancoInfo.tipoCuenta}</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                <span className="text-slate-400">Cuenta:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono font-bold text-xs">{status.bancoInfo.numeroCuenta}</span>
                  <button
                    onClick={() => copyToClipboard(status.bancoInfo.numeroCuenta, "cta_modal")}
                    className="p-1 hover:text-emerald-400 transition-colors"
                  >
                    {copiedField === "cta_modal" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Titular:</span>
                <span className="text-white font-semibold">{status.bancoInfo.titular}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">RUC:</span>
                <span className="text-white font-semibold">{status.bancoInfo.ruc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-emerald-400 font-semibold">{status.bancoInfo.email}</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar Comprobante WhatsApp</span>
              </a>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
