"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Lock,
  Unlock,
  KeyRound,
  Check,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

export interface PasswordAnalysis {
  score: number; // 0 to 4
  level: "bare" | "paperclip" | "padlock" | "deadbolt" | "vault";
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  missingRequirements: string[];
}

export function analyzePassword(password: string): PasswordAnalysis {
  if (!password) {
    return {
      score: 0,
      level: "bare",
      label: "Sin ingresar",
      color: "text-slate-500",
      bgColor: "bg-slate-800/40",
      borderColor: "border-slate-700/60",
      textColor: "text-slate-400",
      hasMinLength: false,
      hasUpperCase: false,
      hasLowerCase: false,
      hasNumber: false,
      hasSpecialChar: false,
      missingRequirements: [
        "Mínimo 8 caracteres",
        "Al menos una mayúscula (A-Z)",
        "Al menos una minúscula (a-z)",
        "Al menos un número (0-9)",
        "Al menos un carácter especial (@$!%*#?&._-)",
      ],
    };
  }

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[@$!%*#?&._\-]/.test(password);

  const missing: string[] = [];
  if (!hasMinLength) missing.push("Mínimo 8 caracteres (recomendado 10+)");
  if (!hasUpperCase) missing.push("Al menos una letra mayúscula (A-Z)");
  if (!hasLowerCase) missing.push("Al menos una letra minúscula (a-z)");
  if (!hasNumber) missing.push("Al menos un número (0-9)");
  if (!hasSpecialChar) missing.push("Al menos un carácter especial (@, $, !, %, *, #, ?, &, ., -, _)");

  let score = 0;
  if (hasMinLength) score += 1;
  if (hasUpperCase && hasLowerCase) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecialChar && password.length >= 8) score += 1;

  if (password.length < 6) {
    score = Math.min(score, 1);
  }

  let level: PasswordAnalysis["level"] = "bare";
  let label = "Muy Débil / Vulnerable";
  let color = "text-rose-400";
  let bgColor = "bg-rose-500/10";
  let borderColor = "border-rose-500/30";
  let textColor = "text-rose-400";

  switch (score) {
    case 1:
      level = "paperclip";
      label = "Débil (Clip) — Muy Vulnerable";
      color = "text-rose-400";
      bgColor = "bg-rose-500/10";
      borderColor = "border-rose-500/40";
      textColor = "text-rose-400";
      break;
    case 2:
      level = "padlock";
      label = "Moderada (Candado Estándar)";
      color = "text-amber-400";
      bgColor = "bg-amber-500/10";
      borderColor = "border-amber-500/40";
      textColor = "text-amber-400";
      break;
    case 3:
      level = "deadbolt";
      label = "Fuerte (Cerrojo Blindado)";
      color = "text-blue-400";
      bgColor = "bg-blue-500/10";
      borderColor = "border-blue-500/40";
      textColor = "text-blue-400";
      break;
    case 4:
      level = "vault";
      label = "Blindada (Bóveda Acorazada / Alta Seguridad)";
      color = "text-emerald-400";
      bgColor = "bg-emerald-500/10";
      borderColor = "border-emerald-500/40";
      textColor = "text-emerald-400";
      break;
    default:
      level = "bare";
      label = "Muy Débil";
      break;
  }

  return {
    score,
    level,
    label,
    color,
    bgColor,
    borderColor,
    textColor,
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecialChar,
    missingRequirements: missing,
  };
}

interface VaultPasswordMeterProps {
  password: string;
  showRequirements?: boolean;
}

export default function VaultPasswordMeter({
  password,
  showRequirements = true,
}: VaultPasswordMeterProps) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevScoreRef = useRef(0);

  const analysis = useMemo(() => analyzePassword(password), [password]);

  // Audio synthesis for lock physical click sounds
  const playLockSound = (tier: number) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "suspended") {
        ctx?.resume();
      }
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (tier === 4) {
        // Vault sealed sound
        osc.type = "triangle";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (tier === 3) {
        // Deadbolt metal clack
        osc.type = "square";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else {
        // Small mechanical click
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch {}
  };

  useEffect(() => {
    if (analysis.score !== prevScoreRef.current && analysis.score > 0) {
      playLockSound(analysis.score);
    }
    prevScoreRef.current = analysis.score;
  }, [analysis.score, soundEnabled]);

  return (
    <div className="space-y-3">
      {/* ─── Lock Animation & Status Badge ─── */}
      <div
        className={`p-3.5 rounded-2xl border ${analysis.borderColor} ${analysis.bgColor} transition-all duration-300 flex items-center justify-between gap-3 shadow-xs`}
      >
        <div className="flex items-center gap-3">
          {/* Animated Lock Stage Icon */}
          <div className="relative w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
            {analysis.level === "vault" ? (
              <div className="relative flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-400 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
            ) : analysis.level === "deadbolt" ? (
              <Lock className="w-5 h-5 text-blue-400 transition-transform transform rotate-0" />
            ) : analysis.level === "padlock" ? (
              <Lock className="w-5 h-5 text-amber-400" />
            ) : analysis.level === "paperclip" ? (
              <Unlock className="w-5 h-5 text-rose-400 animate-pulse" />
            ) : (
              <KeyRound className="w-5 h-5 text-slate-500" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nivel de Seguridad:
              </span>
              <span className={`text-xs font-black ${analysis.textColor}`}>
                {analysis.label}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {analysis.score === 4
                ? "Contraseña blindada apta para producción."
                : analysis.score === 3
                ? "Seguridad alta. Agrega un símbolo para blindarla."
                : analysis.score === 2
                ? "Moderada. Requiere mayúsculas o números."
                : analysis.score === 1
                ? "Muy vulnerable. Fácil de vulnerar."
                : "Ingresa tu contraseña para evaluar su fortaleza."}
            </div>
          </div>
        </div>

        {/* Sound FX Toggle Button */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-xl text-xs transition-colors shrink-0 ${
            soundEnabled
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
              : "bg-slate-900/60 text-slate-500 hover:text-slate-300 border border-slate-800"
          }`}
          title={soundEnabled ? "Efectos de sonido de bóveda activados" : "Activar sonido de cerradura"}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
      </div>

      {/* ─── 4-Segment Strength Progress Bar ─── */}
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((tier) => {
          const isActive = analysis.score >= tier;
          const barColor =
            tier === 1
              ? "bg-rose-500"
              : tier === 2
              ? "bg-amber-500"
              : tier === 3
              ? "bg-blue-500"
              : "bg-emerald-500 shadow-xs shadow-emerald-500/50";

          return (
            <div
              key={tier}
              className={`h-2 rounded-full transition-all duration-300 ${
                isActive ? barColor : "bg-slate-800/80 border border-slate-700/40"
              }`}
            />
          );
        })}
      </div>

      {/* ─── Detailed Requirements Checklist ─── */}
      {showRequirements && (
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Requisitos de Seguridad NEXORA</span>
            <span className="text-emerald-400 font-bold">
              {
                [
                  analysis.hasMinLength,
                  analysis.hasUpperCase,
                  analysis.hasLowerCase,
                  analysis.hasNumber,
                  analysis.hasSpecialChar,
                ].filter(Boolean).length
              }{" "}
              / 5
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
            <div
              className={`flex items-center gap-2 font-medium ${
                analysis.hasMinLength ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {analysis.hasMinLength ? <Check size={14} /> : <X size={14} className="text-slate-600" />}
              <span>Mínimo 8 caracteres</span>
            </div>

            <div
              className={`flex items-center gap-2 font-medium ${
                analysis.hasUpperCase ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {analysis.hasUpperCase ? <Check size={14} /> : <X size={14} className="text-slate-600" />}
              <span>Una mayúscula (A-Z)</span>
            </div>

            <div
              className={`flex items-center gap-2 font-medium ${
                analysis.hasLowerCase ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {analysis.hasLowerCase ? <Check size={14} /> : <X size={14} className="text-slate-600" />}
              <span>Una minúscula (a-z)</span>
            </div>

            <div
              className={`flex items-center gap-2 font-medium ${
                analysis.hasNumber ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {analysis.hasNumber ? <Check size={14} /> : <X size={14} className="text-slate-600" />}
              <span>Un número (0-9)</span>
            </div>

            <div
              className={`flex items-center gap-2 font-medium sm:col-span-2 ${
                analysis.hasSpecialChar ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {analysis.hasSpecialChar ? <Check size={14} /> : <X size={14} className="text-slate-600" />}
              <span>Carácter especial (@, $, !, %, *, #, ?, &, ., -, _)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
