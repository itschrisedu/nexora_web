"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Download, RotateCcw, Move } from "lucide-react";

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  title?: string;
  subtitle?: string;
  badge?: string;
  zIndexClass?: string;
}

export default function ImageLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
  badge,
  zIndexClass = "z-[90]",
}: ImageLightboxModalProps) {
  // Estados de Zoom y Paneo
  const [zoom, setZoom] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs para gestos táctiles (Pinch-to-zoom en móvil)
  const touchStartDistRef = useRef<number>(0);
  const touchStartZoomRef = useRef<number>(1);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset al cerrar o cambiar de imagen
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetZoom();
    }
  }, [isOpen, imageUrl, resetZoom]);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Controles manuales de Zoom
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(Number((prev + 0.5).toFixed(2)), 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(Number((prev - 0.5).toFixed(2)), 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Doble clic o clic de alternancia rápida
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1) {
      resetZoom();
    } else {
      setZoom(2.5);
    }
  };

  // Rueda del ratón / Touchpad con 2 dedos en laptop (wheel + ctrlKey)
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY;
    const factor = e.ctrlKey ? 0.05 : 0.15; // Más suave en touchpad con 2 dedos

    setZoom((prev) => {
      let next = delta < 0 ? prev + factor * prev : prev - factor * prev;
      next = Math.max(1, Math.min(4, Number(next.toFixed(2))));
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // ══════════════════════════════════════════════════════════════
  // EVENTOS DE MOUSE (Desktop Pan / Arrastre)
  // ══════════════════════════════════════════════════════════════
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 || e.button !== 0) return; // Solo con clic izquierdo y con zoom
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ══════════════════════════════════════════════════════════════
  // EVENTOS TÁCTILES (Móvil: Pinch con 2 dedos y arrastre con 1 dedo)
  // ══════════════════════════════════════════════════════════════
  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Gesto de 2 dedos (Pinch-to-zoom)
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
      setIsDragging(false);
    } else if (e.touches.length === 1 && zoom > 1) {
      // 1 dedo para arrastrar la foto ampliada
      setIsDragging(true);
      touchStartPosRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pellizco con 2 dedos activo
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      if (touchStartDistRef.current > 0) {
        const scaleChange = dist / touchStartDistRef.current;
        let newZoom = touchStartZoomRef.current * scaleChange;
        newZoom = Math.max(1, Math.min(4, Number(newZoom.toFixed(2))));
        setZoom(newZoom);
        if (newZoom === 1) {
          setPosition({ x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1 && isDragging && zoom > 1) {
      // Arrastrar con 1 dedo
      setPosition({
        x: e.touches[0].clientX - touchStartPosRef.current.x,
        y: e.touches[0].clientY - touchStartPosRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      touchStartDistRef.current = 0;
      // Si el zoom quedó por debajo de 1.05, centrar
      if (zoom < 1.05) {
        resetZoom();
      }
    } else if (e.touches.length === 1) {
      // Si se suelta un dedo, iniciar arrastre suave con el restante
      setIsDragging(true);
      touchStartPosRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass || 'z-[90]'} flex items-center justify-center p-2 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none`}
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full h-[94vh] sm:max-h-[92vh] flex flex-col bg-[var(--card)] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0F172A] text-white shrink-0 border-b border-white/10 z-10">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                {title || "Visualizador de Calzado"}
              </h3>
              {badge && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-300 truncate mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Descargar o abrir en pestaña nueva"
            >
              <Download size={18} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Visor de la Imagen Interactivo con Zoom y Paneo */}
        <div
          className={`relative flex-1 overflow-hidden flex items-center justify-center bg-slate-950/60 touch-none ${
            zoom > 1
              ? isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-zoom-in"
          }`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title || "Foto de Calzado"}
            draggable={false}
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom})`,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
            className="max-h-[72vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl pointer-events-none select-none will-change-transform"
          />

          {/* Barra Flotante de Controles de Zoom (Móvil y Escritorio) */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 text-white border border-white/15 rounded-full shadow-2xl backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="p-1.5 rounded-full hover:bg-white/15 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Reducir Zoom (−)"
            >
              <ZoomOut size={16} />
            </button>

            <span className="text-[11px] font-mono font-extrabold px-2 min-w-[52px] text-center text-emerald-400">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              className="p-1.5 rounded-full hover:bg-white/15 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Aumentar Zoom (+)"
            >
              <ZoomIn size={16} />
            </button>

            {zoom > 1 && (
              <button
                type="button"
                onClick={resetZoom}
                className="ml-1 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all cursor-pointer"
                title="Restablecer tamaño original (100%)"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Pie con Instrucciones Interactivas */}
        <div className="px-5 py-2.5 bg-[#0F172A]/95 text-slate-300 text-[11px] flex items-center justify-between border-t border-white/10 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <ZoomIn size={14} />
              <span className="hidden sm:inline">Pellizca con 2 dedos en celular o usa la rueda/touchpad en PC</span>
              <span className="sm:hidden">Pellizca con 2 dedos para hacer zoom</span>
            </span>
            {zoom > 1 && (
              <span className="flex items-center gap-1 text-slate-400 font-medium">
                <Move size={12} />
                <span>Arrastra para inspeccionar costuras y cuero</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
            <span className="hidden md:inline">Doble clic: alternar 2.5x</span>
            <span>ESC para cerrar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
