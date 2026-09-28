"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ShieldCheck, ChevronRight, Check, X, ShieldAlert, Sparkles } from "lucide-react";

interface SlideToVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const VERIFIED_SESSION_KEY = "nexora_human_verified";

export function isHumanVerified(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(VERIFIED_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function setHumanVerified(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(VERIFIED_SESSION_KEY, "true");
  } catch {}
}

export default function SlideToVerifyModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Verificación de Seguridad",
  description = "Para proteger la disponibilidad de nuestro calzado y procesar tu pedido, desliza el botón para confirmar que eres humano.",
}: SlideToVerifyModalProps) {
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setDragProgress(0);
      setIsDragging(false);
      setIsVerified(false);
    }
  }, [isOpen]);

  const handleStart = (clientX: number) => {
    if (isVerified) return;
    setIsDragging(true);
    startXRef.current = clientX;
  };

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging || isVerified || !trackRef.current) return;
      const trackRect = trackRef.current.getBoundingClientRect();
      const maxDrag = trackRect.width - 56; // 56px knob width + padding
      if (maxDrag <= 0) return;

      const currentX = clientX - trackRect.left - 28;
      const progress = Math.max(0, Math.min(1, currentX / maxDrag));
      setDragProgress(progress);

      // Threshold to verify
      if (progress >= 0.88) {
        setIsDragging(false);
        setIsVerified(true);
        setDragProgress(1);
        setHumanVerified();

        // Trigger success callback after brief positive feedback
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      }
    },
    [isDragging, isVerified, onSuccess, onClose]
  );

  const handleEnd = useCallback(() => {
    if (isVerified) return;
    setIsDragging(false);
    // If not reached threshold, smoothly bounce back
    setDragProgress(0);
  }, [isVerified]);

  // Global mouse & touch listeners when dragging
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };
    const onMouseUp = () => {
      handleEnd();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };
    const onTouchEnd = () => {
      handleEnd();
    };

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-center space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {/* Icono de Seguridad */}
        <div className="flex justify-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
              isVerified
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/20 scale-105"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm"
            }`}
          >
            {isVerified ? (
              <Check className="w-8 h-8 animate-in zoom-in-50 duration-200" strokeWidth={3} />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )}
          </div>
        </div>

        {/* Títulos y descripción */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold tracking-wide uppercase">
            <Sparkles size={12} />
            Protección Anti-Bot
          </div>
          <h3 className="font-extrabold text-lg text-white">
            {isVerified ? "¡Verificación Exitosa!" : title}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            {isVerified
              ? "Agregando producto a tu carrito de compras..."
              : description}
          </p>
        </div>

        {/* Slider Track */}
        <div className="pt-2">
          <div
            ref={trackRef}
            className={`relative h-14 bg-slate-950 border rounded-2xl select-none overflow-hidden flex items-center p-1 transition-colors duration-200 ${
              isVerified
                ? "border-emerald-500/60 bg-emerald-950/20"
                : isDragging
                ? "border-emerald-500/40"
                : "border-slate-800"
            }`}
          >
            {/* Barra de progreso de arrastre */}
            <div
              className={`absolute left-0 top-0 bottom-0 transition-all ${
                isDragging ? "duration-0" : "duration-300"
              } ${
                isVerified
                  ? "bg-emerald-500/30 w-full"
                  : "bg-gradient-to-r from-emerald-500/10 to-emerald-500/30"
              }`}
              style={{ width: isVerified ? "100%" : `${dragProgress * 100}%` }}
            />

            {/* Texto de guía animado en el fondo */}
            <div
              className={`w-full text-center text-xs font-bold tracking-wide transition-opacity duration-200 select-none ${
                isVerified
                  ? "text-emerald-400 font-extrabold"
                  : "text-slate-400"
              }`}
              style={{
                opacity: isVerified ? 1 : Math.max(0.1, 1 - dragProgress * 1.5),
              }}
            >
              {isVerified ? "✓ Eres Humano Verificado" : "Desliza para verificar ➔"}
            </div>

            {/* Botón Deslizador (Knob) */}
            <div
              onMouseDown={(e) => handleStart(e.clientX)}
              onTouchStart={(e) => {
                if (e.touches.length > 0) handleStart(e.touches[0].clientX);
              }}
              className={`absolute top-1 bottom-1 w-12 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing font-bold shadow-lg transition-transform ${
                isDragging ? "duration-0 scale-105" : "duration-300"
              } ${
                isVerified
                  ? "bg-emerald-500 text-slate-950 shadow-emerald-500/50"
                  : "bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 hover:brightness-110 active:scale-95 shadow-emerald-950/60"
              }`}
              style={{
                left: isVerified
                  ? `calc(100% - 52px)`
                  : `calc(${dragProgress * 100}% * (1 - 52px / 100%) + 4px)`,
              }}
            >
              {isVerified ? (
                <Check size={20} strokeWidth={3} />
              ) : (
                <div className="flex items-center -space-x-1">
                  <ChevronRight size={18} strokeWidth={2.5} />
                  <ChevronRight size={18} strokeWidth={2.5} className="opacity-60" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldAlert size={12} />
          <span>Solo se requiere una única vez por visita</span>
        </div>
      </div>
    </div>
  );
}
