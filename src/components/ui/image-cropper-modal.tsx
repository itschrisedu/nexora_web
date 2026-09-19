"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Crop, ZoomIn, ZoomOut, Check, RotateCw } from "lucide-react";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  aspectRatio?: number; // e.g. 16/9 = 1.777, 4/3 = 1.333, 1/1 = 1
  aspectRatioLabel?: string;
  title?: string;
  onCancel: () => void;
  onCropComplete: (croppedBase64: string) => void;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  aspectRatio = 16 / 9,
  aspectRatioLabel = "Panorámica (16:9)",
  title = "Encuadrar Fotografía",
  onCancel,
  onCropComplete,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(false);
    }
  }, [isOpen, imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleApplyCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // The target frame dimensions in pixels inside the container
    const frameWidth = containerRect.width;
    const frameHeight = containerRect.height;

    // Create high-res export canvas
    const canvas = document.createElement("canvas");
    // Standard high definition dimensions based on aspect ratio
    const targetWidth = 1600;
    const targetHeight = Math.round(1600 / aspectRatio);
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Calculate scaling factor between preview frame and high-res export canvas
    const exportScale = targetWidth / frameWidth;

    ctx.save();
    // Move origin to center of canvas
    ctx.translate(targetWidth / 2, targetHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Offset scaled
    const scaledOffsetX = offset.x * exportScale;
    const scaledOffsetY = offset.y * exportScale;

    // Base drawn image dimensions in preview frame
    const imgNaturalW = img.naturalWidth;
    const imgNaturalH = img.naturalHeight;

    // Fit image to frame initial scale
    const fitScale = Math.max(frameWidth / imgNaturalW, frameHeight / imgNaturalH);
    const renderW = imgNaturalW * fitScale * zoom * exportScale;
    const renderH = imgNaturalH * fitScale * zoom * exportScale;

    ctx.drawImage(
      img,
      scaledOffsetX - renderW / 2,
      scaledOffsetY - renderH / 2,
      renderW,
      renderH
    );
    ctx.restore();

    // Export clean JPEG (EXIF/GPS stripped natively by canvas)
    const cleanBase64 = canvas.toDataURL("image/jpeg", 0.9);
    onCropComplete(cleanBase64);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--border)] flex justify-between items-center bg-[#0F172A] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Crop size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="px-2 py-0.5 bg-white/10 text-slate-300 text-[10px] font-bold rounded-full">
                  {aspectRatioLabel}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Arrastre para centrar y use el zoom para que calce a la perfección.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport / Crop Frame */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950/80 select-none overflow-hidden">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              aspectRatio: `${aspectRatio}`,
              width: "100%",
              maxWidth: "520px",
            }}
            className="relative border-2 border-dashed border-amber-400/70 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing shadow-2xl bg-black flex items-center justify-center"
          >
            {/* Rule of thirds grid */}
            <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 opacity-30">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>

            {/* Hidden/Displayed Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Preview"
              onLoad={() => setImageLoaded(true)}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                maxWidth: "none",
                maxHeight: "none",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
              }}
              className="user-select-none"
            />

            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-bold">
                Cargando imagen...
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            💡 Mantenga presionado y mueva para encuadrar la zona visible
          </p>
        </div>

        {/* Controls */}
        <div className="p-4 px-6 border-t border-[var(--border)] bg-[var(--card)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <ZoomOut size={16} className="text-slate-400 shrink-0" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <ZoomIn size={16} className="text-slate-400 shrink-0" />
              <span className="text-xs font-mono font-bold w-12 text-right text-[var(--foreground)]">
                {zoom.toFixed(1)}x
              </span>
            </div>

            {/* Rotation Button */}
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="px-3 py-1.5 border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--foreground)] hover:bg-[var(--muted)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw size={13} />
              <span>Girar 90°</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-3 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Check size={14} />
              <span>Aplicar Encuadre y Subir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
