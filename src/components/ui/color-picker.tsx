"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Pipette, Sparkles, Check, SlidersHorizontal } from "lucide-react";

interface ColorPickerProps {
  value: string;
  onChange: (colorHex: string) => void;
  label?: string;
}

// ─────────────────────────────────────────────────────────────
// Utilidades de conversión y cálculo de color (HSV / RGB / HEX)
// ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const hexR = clamp(r).toString(16).padStart(2, "0");
  const hexG = clamp(g).toString(16).padStart(2, "0");
  const hexB = clamp(b).toString(16).padStart(2, "0");
  return `#${hexR}${hexG}${hexB}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  v = Math.max(0, Math.min(100, v)) / 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function getContrastColor(hex: string): "#FFFFFF" | "#0F172A" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#FFFFFF";
  // Luminancia percibida según ITU-R BT.709
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 160 ? "#0F172A" : "#FFFFFF";
}

// Paleta corporativa elegante de calzado y comercio (sin tonos morados)
export const PALETA_RECOMENDADA = [
  { hex: "#0F172A", label: "Azul Marino Imperial (Predeterminado)" },
  { hex: "#1E293B", label: "Slate Carbón Ejecutivo" },
  { hex: "#064E3B", label: "Verde Esmeralda Bosque" },
  { hex: "#7C2D12", label: "Cuero Terracota & Artesanal" },
  { hex: "#1E3A8A", label: "Azul Cobalto Empresarial" },
  { hex: "#7F1D1D", label: "Borgoña & Granate Fino" },
  { hex: "#B45309", label: "Ámbar Suela & Tostado" },
  { hex: "#14532D", label: "Verde Musgo Clásico" },
  { hex: "#18181B", label: "Negro Ónix Premium" },
];

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>({ h: 220, s: 60, v: 20 });
  const [hexInput, setHexInput] = useState(value || "#0F172A");
  const [rgbInput, setRgbInput] = useState<{ r: number; g: number; b: number }>({ r: 15, g: 23, b: 42 });
  const [mode, setMode] = useState<"HEX" | "RGB">("HEX");
  const [isEyedropperSupported, setIsEyedropperSupported] = useState(false);

  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const hiddenColorInputRef = useRef<HTMLInputElement>(null);

  // Inicializar estado a partir del valor externo
  useEffect(() => {
    if (value && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
      setHexInput(value.toUpperCase());
      const rgb = hexToRgb(value);
      if (rgb) {
        setRgbInput(rgb);
        const nextHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        setHsv(nextHsv);
      }
    }
  }, [value]);

  useEffect(() => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      setIsEyedropperSupported(true);
    }
  }, []);

  // Actualizar cuando cambia HSV
  const updateFromHsv = useCallback((nextHsv: { h: number; s: number; v: number }) => {
    setHsv(nextHsv);
    const rgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
    setRgbInput(rgb);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  // Manejo de clic y arrastre en la caja 2D (Saturación y Brillo)
  const handleSatValPointer = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!satValRef.current) return;
    const rect = satValRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const s = (x / rect.width) * 100;
    const v = (1 - y / rect.height) * 100;

    updateFromHsv({ h: hsv.h, s, v });
  }, [hsv.h, updateFromHsv]);

  const onSatValMouseDown = (e: React.MouseEvent) => {
    handleSatValPointer(e);

    const onMouseMove = (moveEvent: MouseEvent) => handleSatValPointer(moveEvent);
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onSatValTouchStart = (e: React.TouchEvent) => {
    handleSatValPointer(e);

    const onTouchMove = (moveEvent: TouchEvent) => handleSatValPointer(moveEvent);
    const onTouchEnd = () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  };

  // Manejo de clic y arrastre en la barra de Hue (Matiz)
  const handleHuePointer = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const h = (x / rect.width) * 360;

    updateFromHsv({ h, s: hsv.s, v: hsv.v });
  }, [hsv.s, hsv.v, updateFromHsv]);

  const onHueMouseDown = (e: React.MouseEvent) => {
    handleHuePointer(e);
    const onMouseMove = (moveEvent: MouseEvent) => handleHuePointer(moveEvent);
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onHueTouchStart = (e: React.TouchEvent) => {
    handleHuePointer(e);
    const onTouchMove = (moveEvent: TouchEvent) => handleHuePointer(moveEvent);
    const onTouchEnd = () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  };

  // Pipeta cuentagotas
  const handleEyeDropper = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          applyHex(result.sRGBHex);
        }
      } catch (err) {
        // Cancelado por el usuario
      }
    } else if (hiddenColorInputRef.current) {
      hiddenColorInputRef.current.click();
    }
  };

  // Aplicar Hex escrito a mano
  const applyHex = (hex: string) => {
    let clean = hex.trim();
    if (!clean.startsWith("#")) clean = `#${clean}`;
    setHexInput(clean.toUpperCase());

    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean)) {
      const rgb = hexToRgb(clean);
      if (rgb) {
        setRgbInput(rgb);
        const nextHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        setHsv(nextHsv);
        onChange(clean.toUpperCase());
      }
    }
  };

  // Aplicar RGB escrito a mano
  const applyRgb = (field: "r" | "g" | "b", val: number) => {
    const clamped = Math.max(0, Math.min(255, isNaN(val) ? 0 : val));
    const nextRgb = { ...rgbInput, [field]: clamped };
    setRgbInput(nextRgb);
    const hex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setHexInput(hex);
    const nextHsv = rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b);
    setHsv(nextHsv);
    onChange(hex);
  };

  // Color de fondo para la caja 2D basado únicamente en Hue
  const pureHueRgb = hsvToRgb(hsv.h, 100, 100);
  const pureHueCss = `rgb(${pureHueRgb.r}, ${pureHueRgb.g}, ${pureHueRgb.b})`;

  const contrastText = getContrastColor(hexInput);

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* COMPONENTE COLOR PICKER PRINCIPAL (CARD ELEGANTE) */}
      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-4 max-w-md">
        {/* BARRA SUPERIOR: INPUT HEX / RGB + BOTÓN PIPETA + SELECTOR DE MODO */}
        <div className="flex items-center gap-2">
          {/* Muestra visual del color actual */}
          <div
            className="w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 shadow-inner flex items-center justify-center shrink-0 transition-colors"
            style={{ backgroundColor: hexInput }}
            title={`Color actual: ${hexInput}`}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: contrastText }}
            />
          </div>

          {/* Campo de Texto Principal */}
          {mode === "HEX" ? (
            <div className="flex-1 relative">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => applyHex(e.target.value)}
                maxLength={7}
                placeholder="#0F172A"
                className="w-full px-3 py-2 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl text-sm font-mono font-bold text-[var(--foreground)] tracking-wide focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-3 gap-1.5">
              <div className="relative">
                <span className="absolute left-2 top-2 text-[10px] font-bold text-[var(--muted-foreground)]">R</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgbInput.r}
                  onChange={(e) => applyRgb("r", parseInt(e.target.value, 10))}
                  className="w-full pl-6 pr-2 py-2 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl text-xs font-mono font-bold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="relative">
                <span className="absolute left-2 top-2 text-[10px] font-bold text-[var(--muted-foreground)]">G</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgbInput.g}
                  onChange={(e) => applyRgb("g", parseInt(e.target.value, 10))}
                  className="w-full pl-6 pr-2 py-2 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl text-xs font-mono font-bold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="relative">
                <span className="absolute left-2 top-2 text-[10px] font-bold text-[var(--muted-foreground)]">B</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgbInput.b}
                  onChange={(e) => applyRgb("b", parseInt(e.target.value, 10))}
                  className="w-full pl-6 pr-2 py-2 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl text-xs font-mono font-bold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>
          )}

          {/* Botón de Alternancia HEX / RGB */}
          <button
            type="button"
            onClick={() => setMode(mode === "HEX" ? "RGB" : "HEX")}
            className="px-2.5 py-2 bg-[var(--muted)]/60 hover:bg-[var(--muted)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--foreground)] transition-colors flex items-center gap-1 shrink-0"
            title="Alternar entre formato Hexadecimal y RGB"
          >
            <SlidersHorizontal size={13} />
            <span>{mode}</span>
          </button>

          {/* Botón Pipeta Cuentagotas */}
          <button
            type="button"
            onClick={handleEyeDropper}
            className="w-10 h-10 bg-[var(--muted)]/60 hover:bg-[var(--muted)] border border-[var(--border)] rounded-xl flex items-center justify-center text-[var(--foreground)] transition-transform hover:scale-105 active:scale-95 shrink-0"
            title={isEyedropperSupported ? "Cuentagotas: Tomar color exacto de cualquier elemento en pantalla" : "Abrir selector nativo del sistema"}
          >
            <Pipette size={18} />
          </button>

          {/* Input oculto nativo como respaldo */}
          <input
            ref={hiddenColorInputRef}
            type="color"
            value={hexInput.length === 7 ? hexInput : "#0F172A"}
            onChange={(e) => applyHex(e.target.value)}
            className="hidden"
          />
        </div>

        {/* 1. BARRA DE MATIZ (HUE RAINBOW STRIP) */}
        <div className="space-y-1.5">
          <div
            ref={hueRef}
            onMouseDown={onHueMouseDown}
            onTouchStart={onHueTouchStart}
            className="h-6 w-full rounded-xl cursor-pointer relative shadow-inner select-none"
            style={{
              background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
            }}
            title="Desliza para elegir la tonalidad de color"
          >
            {/* Puntero Circular del Hue */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-md pointer-events-none transition-transform"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                backgroundColor: pureHueCss,
              }}
            />
          </div>
        </div>

        {/* 2. ÁREA 2D DE SATURACIÓN Y BRILLO (CANVAS GRADIENTE) */}
        <div
          ref={satValRef}
          onMouseDown={onSatValMouseDown}
          onTouchStart={onSatValTouchStart}
          className="h-44 w-full rounded-2xl cursor-crosshair relative shadow-inner select-none overflow-hidden"
          style={{ backgroundColor: pureHueCss }}
        >
          {/* Capa de saturación horizontal (blanco a transparente) */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, #ffffff, transparent)",
            }}
          />
          {/* Capa de brillo vertical (transparente a negro) */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, #000000, transparent)",
            }}
          />

          {/* Indicador Circular de Selección */}
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${hsv.s}%`,
              top: `${100 - hsv.v}%`,
              backgroundColor: hexInput,
            }}
          />
        </div>

        {/* PALETA DE TONOS RECOMENDADOS PARA CALZADO Y MARCA (SIN MORADOS) */}
        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted-foreground)]">
            <span className="uppercase tracking-wider">Paletas Recomendadas</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">100% Elegante & Neutro</span>
          </div>

          <div className="grid grid-cols-9 gap-1.5">
            {PALETA_RECOMENDADA.map((item) => {
              const isSelected = hexInput.toUpperCase() === item.hex.toUpperCase();
              return (
                <button
                  key={item.hex}
                  type="button"
                  onClick={() => applyHex(item.hex)}
                  className={`h-8 rounded-lg border transition-all relative flex items-center justify-center ${
                    isSelected
                      ? "border-black dark:border-white ring-2 ring-black/20 dark:ring-white/20 scale-105 shadow-sm"
                      : "border-transparent hover:scale-105 opacity-90 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: item.hex }}
                  title={item.label}
                >
                  {isSelected && (
                    <Check
                      size={14}
                      className="drop-shadow-md"
                      style={{ color: getContrastColor(item.hex) }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* VISTA PREVIA DINÁMICA DE ARMONÍA VISUAL */}
        <div className="p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[var(--foreground)]">
              <Sparkles size={13} className="text-amber-500" />
              <span>Simulación en Vivo</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] font-bold">
              Texto: {contrastText === "#FFFFFF" ? "Blanco" : "Oscuro"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Botón Primario */}
            <div
              className="px-3 py-2 rounded-xl text-center text-xs font-bold shadow-xs transition-colors flex items-center justify-center"
              style={{
                backgroundColor: hexInput,
                color: contrastText,
              }}
            >
              Botón Primario
            </div>

            {/* Badge / Insignia de Contorno */}
            <div
              className="px-3 py-2 rounded-xl text-center text-xs font-bold border transition-colors flex items-center justify-center bg-[var(--card)]"
              style={{
                borderColor: hexInput,
                color: hexInput,
              }}
            >
              Insignia Activa
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
