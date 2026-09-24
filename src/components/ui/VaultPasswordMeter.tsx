"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Check, X, Volume2, VolumeX, ShieldCheck, ShieldAlert, Lock, Unlock, KeyRound } from "lucide-react";

export interface PasswordAnalysis {
  score: number; // 0 to 4
  level: "bare" | "paperclip" | "padlock" | "deadbolt" | "vault";
  label: string;
  crackTime: string;
  entropyBits: number;
  color: string;
  borderColor: string;
  glowColor: string;
  ledColor: string;
  ledGlow: string;
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
      label: "Too weak",
      crackTime: "Cracked instantly.",
      entropyBits: 0,
      color: "text-slate-400",
      borderColor: "border-slate-800",
      glowColor: "rgba(100, 116, 139, 0.1)",
      ledColor: "#64748b",
      ledGlow: "rgba(100, 116, 139, 0.3)",
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
  const hasSpecialChar = /[@$!%*#?&._\-~^+=<>]/.test(password);

  let poolSize = 0;
  if (hasLowerCase) poolSize += 26;
  if (hasUpperCase) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSpecialChar) poolSize += 33;

  const entropyBits = Math.round(password.length * Math.log2(poolSize || 2));

  const missing: string[] = [];
  if (!hasMinLength) missing.push("Mínimo 8 caracteres");
  if (!hasUpperCase) missing.push("Al menos una letra mayúscula (A-Z)");
  if (!hasLowerCase) missing.push("Al menos una letra minúscula (a-z)");
  if (!hasNumber) missing.push("Al menos un número (0-9)");
  if (!hasSpecialChar) missing.push("Al menos un carácter especial (@, $, !, %, *, #, ?, &, ., -, _)");

  let score = 0;
  if (password.length >= 6) score += 1;
  if (hasMinLength && (hasUpperCase || hasLowerCase) && hasNumber) score += 1;
  if (hasMinLength && hasUpperCase && hasLowerCase && hasNumber) score += 1;
  if (hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && entropyBits >= 60) score += 1;

  if (entropyBits >= 70 && password.length >= 10 && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar) {
    score = 4;
  } else if (entropyBits >= 52 && score >= 3) {
    score = 3;
  } else if (entropyBits >= 30 && score >= 2) {
    score = 2;
  } else if (score >= 1) {
    score = 1;
  } else {
    score = 0;
  }

  let level: PasswordAnalysis["level"] = "bare";
  let label = "Too weak";
  let crackTime = "Cracked instantly.";
  let color = "text-slate-400";
  let borderColor = "border-slate-800";
  let glowColor = "rgba(100, 116, 139, 0.1)";
  let ledColor = "#64748b";
  let ledGlow = "rgba(100, 116, 139, 0.2)";

  switch (score) {
    case 1:
      level = "paperclip";
      label = "Seguridad Débil";
      crackTime = "Fácil de adivinar en pocos segundos.";
      color = "text-[#F87171]";
      borderColor = "border-red-500/40";
      glowColor = "rgba(239, 68, 68, 0.15)";
      ledColor = "#ef4444";
      ledGlow = "rgba(239, 68, 68, 0.6)";
      break;
    case 2:
      level = "padlock";
      label = "Seguridad Aceptable";
      crackTime = "Protección básica contra intentos comunes.";
      color = "text-[#FB923C]";
      borderColor = "border-orange-500/40";
      glowColor = "rgba(249, 115, 22, 0.15)";
      ledColor = "#f97316";
      ledGlow = "rgba(249, 115, 22, 0.6)";
      break;
    case 3:
      level = "deadbolt";
      label = "Seguridad Alta";
      crackTime = "Buena protección, difícil de descifrar.";
      color = "text-[#FACC15]";
      borderColor = "border-amber-400/40";
      glowColor = "rgba(234, 179, 8, 0.15)";
      ledColor = "#eab308";
      ledGlow = "rgba(234, 179, 8, 0.6)";
      break;
    case 4:
      level = "vault";
      label = "Máxima Seguridad (Bóveda)";
      crackTime = "Totalmente protegida e imposible de vulnerar.";
      color = "text-[#4ADE80]";
      borderColor = "border-emerald-500/50";
      glowColor = "rgba(16, 185, 129, 0.2)";
      ledColor = "#10b981";
      ledGlow = "rgba(16, 185, 129, 0.8)";
      break;
    default:
      level = "bare";
      label = "Muy Débil";
      crackTime = "Se vulnera al instante. Ingresa una clave más segura.";
      color = "text-slate-400";
      borderColor = "border-slate-800";
      glowColor = "rgba(100, 116, 139, 0.1)";
      ledColor = "#64748b";
      ledGlow = "rgba(100, 116, 139, 0.3)";
      break;
  }

  return {
    score,
    level,
    label,
    crackTime,
    entropyBits,
    color,
    borderColor,
    glowColor,
    ledColor,
    ledGlow,
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
  className?: string;
}

export default function VaultPasswordMeter({
  password,
  showRequirements = true,
  className = "",
}: VaultPasswordMeterProps) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevScoreRef = useRef(0);

  const analysis = useMemo(() => analyzePassword(password), [password]);

  // Audio click synthesizer on tier change
  const playLockSound = (tier: number) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "suspended") ctx?.resume();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (tier === 4) {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (tier === 3) {
        osc.type = "square";
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
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

  const rotationAngle = (password.length * 45) % 360;

  return (
    <div className={`space-y-3 font-sans ${className}`}>
      {/* ─── EXACT REPRODUCTION OF VAULT CARD FROM SCREENSHOT ─── */}
      <div
        className={`relative overflow-hidden p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border ${analysis.borderColor} bg-[#0A0F14] transition-all duration-300 shadow-xl flex items-center gap-3.5 sm:gap-4`}
        style={{
          boxShadow: `0 0 25px ${analysis.glowColor}`,
        }}
      >
        {/* ─── 3D Realistic Vault Door SVG ─── */}
        <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <svg
            className="w-full h-full drop-shadow-md"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Dark Steel Rounded Backing Plate */}
            <rect x="4" y="4" width="92" height="92" rx="18" fill="url(#vaultBackplate)" stroke="#1e293b" strokeWidth="1.5" />

            {/* 8 Radial Heavy Steel Lock Bolts / Spokes */}
            <rect x="46.5" y="1" width="7" height="12" rx="2" fill="url(#steelBolt)" stroke="#0f172a" strokeWidth="0.5" />
            <rect x="46.5" y="87" width="7" height="12" rx="2" fill="url(#steelBolt)" stroke="#0f172a" strokeWidth="0.5" />
            <rect x="1" y="46.5" width="12" height="7" rx="2" fill="url(#steelBolt)" stroke="#0f172a" strokeWidth="0.5" />
            <rect x="87" y="46.5" width="12" height="7" rx="2" fill="url(#steelBolt)" stroke="#0f172a" strokeWidth="0.5" />
            
            <g transform="rotate(45 50 50)">
              <rect x="46.5" y="1" width="7" height="12" rx="2" fill="url(#steelBolt)" stroke="#0f172a" strokeWidth="0.5" />
              <rect x="46.5" y="87" width="7" height="12" rx="2" fill="url(#steelBolt)" stroke="#0f172a" strokeWidth="0.5" />
              <rect x="1" y="46.5" width="12" height="7" rx="2" fill="url(#steelBolt)" stroke="#0f172a" strokeWidth="0.5" />
              <rect x="87" y="46.5" width="12" height="7" rx="2" fill="url(#steelBolt)" stroke="#0f172a" strokeWidth="0.5" />
            </g>

            {/* Outer Circular Steel Bevel Rim */}
            <circle cx="50" cy="50" r="38" fill="url(#vaultRim)" stroke="#334155" strokeWidth="2" />

            {/* Inner Vault Door Plate with Dial Marks */}
            <circle cx="50" cy="50" r="30" fill="url(#vaultDoorPlate)" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="28" stroke="#475569" strokeWidth="1" strokeDasharray="1.5 3" opacity="0.6" />

            {/* Rotating Central Combination Wheel with Spokes */}
            <g
              className="transition-transform duration-500 ease-out"
              style={{
                transformOrigin: "50px 50px",
                transform: `rotate(${rotationAngle}deg)`,
              }}
            >
              <circle cx="50" cy="50" r="18" fill="url(#wheelRim)" stroke="#64748b" strokeWidth="2.5" />
              <circle cx="50" cy="50" r="13" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              
              {/* Central Cross Spokes */}
              <rect x="47.5" y="34" width="5" height="32" rx="2" fill="url(#steelBolt)" />
              <rect x="34" y="47.5" width="32" height="5" rx="2" fill="url(#steelBolt)" />
              
              {/* Center Hub & Axis Pin */}
              <circle cx="50" cy="50" r="6" fill="url(#centerHub)" stroke="#1e293b" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="2.5" fill="#090d16" />
            </g>

            {/* Status LED Indicator Light at the bottom of the dial */}
            <circle cx="50" cy="73" r="2.5" fill={analysis.ledColor} />
            <circle
              cx="50"
              cy="73"
              r="5.5"
              fill={analysis.ledGlow}
              opacity="0.8"
              className={analysis.score >= 3 ? "animate-pulse" : ""}
            />

            {/* SVG Gradients for realistic metallic finish */}
            <defs>
              <linearGradient id="vaultBackplate" x1="0" y1="0" x2="100" y2="100">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#090d16" />
              </linearGradient>

              <linearGradient id="steelBolt" x1="0" y1="0" x2="0" y2="100">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="50%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              <linearGradient id="vaultRim" x1="0" y1="0" x2="100" y2="100">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="30%" stopColor="#1e293b" />
                <stop offset="70%" stopColor="#334155" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>

              <linearGradient id="vaultDoorPlate" x1="0" y1="0" x2="100" y2="100">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#090d16" />
              </linearGradient>

              <linearGradient id="wheelRim" x1="0" y1="0" x2="100" y2="100">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="50%" stopColor="#475569" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>

              <linearGradient id="centerHub" x1="0" y1="0" x2="100" y2="100">
                <stop offset="0%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* ─── Right Details: 4 Segment Progress Bars + Headings + Entropy ─── */}
        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
          {/* 4 Segment Colored Progress Bars */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {/* Segment 1: Red */}
            <div
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                analysis.score >= 1 ? "bg-[#EF4444] shadow-xs shadow-red-500/50" : "bg-slate-800/80 border border-slate-700/40"
              }`}
            />
            {/* Segment 2: Orange */}
            <div
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                analysis.score >= 2 ? "bg-[#F97316] shadow-xs shadow-orange-500/50" : "bg-slate-800/80 border border-slate-700/40"
              }`}
            />
            {/* Segment 3: Yellow */}
            <div
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                analysis.score >= 3 ? "bg-[#FACC15] shadow-xs shadow-yellow-500/50" : "bg-slate-800/80 border border-slate-700/40"
              }`}
            />
            {/* Segment 4: Emerald Green */}
            <div
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                analysis.score >= 4 ? "bg-[#10B981] shadow-xs shadow-emerald-500/50" : "bg-slate-800/80 border border-slate-700/40"
              }`}
            />
          </div>

          {/* Level Title (e.g. "A bank vault") */}
          <div className="flex items-center justify-between gap-2">
            <h4 className={`text-sm sm:text-base font-extrabold tracking-tight ${analysis.color}`}>
              {analysis.label}
            </h4>

            {/* Sound Effects Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                soundEnabled
                  ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-900/60 text-slate-500 hover:text-slate-300 border border-slate-800"
              }`}
              title={soundEnabled ? "Efectos sonoros activados" : "Activar sonido mecánico"}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
          </div>

          {/* Subtitle: Estado en lenguaje claro */}
          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-tight">
            {analysis.crackTime}
          </p>
        </div>
      </div>

      {/* ─── Detailed Requirements Checklist ─── */}
      {showRequirements && (
        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs">
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
              {analysis.hasMinLength ? <Check size={14} className="shrink-0" /> : <X size={14} className="text-slate-600 shrink-0" />}
              <span>Mínimo 8 caracteres</span>
            </div>

            <div
              className={`flex items-center gap-2 font-medium ${
                analysis.hasUpperCase ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {analysis.hasUpperCase ? <Check size={14} className="shrink-0" /> : <X size={14} className="text-slate-600 shrink-0" />}
              <span>Una mayúscula (A-Z)</span>
            </div>

            <div
              className={`flex items-center gap-2 font-medium ${
                analysis.hasLowerCase ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {analysis.hasLowerCase ? <Check size={14} className="shrink-0" /> : <X size={14} className="text-slate-600 shrink-0" />}
              <span>Una minúscula (a-z)</span>
            </div>

            <div
              className={`flex items-center gap-2 font-medium ${
                analysis.hasNumber ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {analysis.hasNumber ? <Check size={14} className="shrink-0" /> : <X size={14} className="text-slate-600 shrink-0" />}
              <span>Un número (0-9)</span>
            </div>

            <div
              className={`flex items-center gap-2 font-medium sm:col-span-2 ${
                analysis.hasSpecialChar ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {analysis.hasSpecialChar ? <Check size={14} className="shrink-0" /> : <X size={14} className="text-slate-600 shrink-0" />}
              <span>Carácter especial (@, $, !, %, *, #, ?, &, ., -, _)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
