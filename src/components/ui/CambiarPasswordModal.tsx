"use client";

import { useState } from "react";
import { ApiService } from "@/services/api.service";
import VaultPasswordMeter, { analyzePassword } from "./VaultPasswordMeter";
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
} from "lucide-react";

interface CambiarPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CambiarPasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: CambiarPasswordModalProps) {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [showActual, setShowActual] = useState(false);
  const [showNuevo, setShowNuevo] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const analysis = analyzePassword(passwordNuevo);
  const passwordsMatch = passwordNuevo && passwordNuevo === passwordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!passwordActual) {
      setErrorMsg("Debe ingresar su contraseña actual.");
      return;
    }

    if (!passwordNuevo || passwordNuevo.length < 8) {
      setErrorMsg("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (passwordNuevo !== passwordConfirm) {
      setErrorMsg("Las contraseñas no coinciden. Verifíquelas nuevamente.");
      return;
    }

    if (analysis.score < 2) {
      setErrorMsg("La contraseña seleccionada es muy vulnerable. Debe cumplir con al menos mayúsculas, minúsculas o números.");
      return;
    }

    setLoading(true);
    try {
      await ApiService.post("/auth/change-password", {
        passwordActual,
        passwordNuevo,
      });

      setSuccessMsg("¡Contraseña actualizada exitosamente!");
      setTimeout(() => {
        setPasswordActual("");
        setPasswordNuevo("");
        setPasswordConfirm("");
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo actualizar la contraseña. Verifique su clave actual.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Cambiar Contraseña de Acceso</h3>
              <p className="text-xs text-slate-400">Actualiza tus credenciales de seguridad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña Actual */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Contraseña Actual
            </label>
            <div className="relative">
              <input
                type={showActual ? "text" : "password"}
                required
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => setShowActual(!showActual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showNuevo ? "text" : "password"}
                required
                value={passwordNuevo}
                onChange={(e) => setPasswordNuevo(e.target.value)}
                placeholder="Ingresa tu nueva contraseña segura"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => setShowNuevo(!showNuevo)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showNuevo ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Vault Password Meter Component */}
          {passwordNuevo && (
            <div className="animate-in fade-in duration-200">
              <VaultPasswordMeter password={passwordNuevo} showRequirements={true} />
            </div>
          )}

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordConfirm && (
              <p
                className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                  passwordsMatch ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {passwordsMatch ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !passwordActual || !passwordNuevo || !passwordsMatch || analysis.score < 2}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Guardar Contraseña</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
