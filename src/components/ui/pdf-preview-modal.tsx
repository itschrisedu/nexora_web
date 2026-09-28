"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Printer, Loader2, FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: jsPDF | null;
  titulo: string;
  nombreArchivo?: string;
}

/**
 * Modal universal de previsualización de PDF para todo NEXORA.
 * Recibe un jsPDF generado y lo muestra en un iframe/embed con opciones de
 * descargar, imprimir y navegar las páginas.
 */
export default function PdfPreviewModal({
  isOpen,
  onClose,
  pdfDoc,
  titulo,
  nombreArchivo = 'reporte-nexora.pdf',
}: PdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (isOpen && pdfDoc) {
      setLoading(true);
      try {
        const blob = pdfDoc.output('blob');
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error('Error generando preview PDF:', err);
      } finally {
        setLoading(false);
      }
    }

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    };
  }, [isOpen, pdfDoc]);

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleDescargar = useCallback(() => {
    if (pdfDoc) {
      pdfDoc.save(nombreArchivo);
    }
  }, [pdfDoc, nombreArchivo]);

  const handleImprimir = useCallback(() => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  }, [pdfUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-[96vw] max-w-5xl h-[92vh] bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0F172A] text-white rounded-xl">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[var(--foreground)] tracking-tight">
                {titulo}
              </h2>
              <p className="text-[10px] text-[var(--muted-foreground)] font-semibold">
                Previsualización del documento PDF generado por NEXORA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[var(--muted)]/40 rounded-xl px-2 py-1 border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="p-1 hover:bg-[var(--muted)] rounded-lg transition-colors cursor-pointer"
                title="Reducir zoom"
              >
                <ZoomOut size={14} className="text-[var(--muted-foreground)]" />
              </button>
              <span className="text-[10px] font-bold text-[var(--muted-foreground)] min-w-[36px] text-center">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
                className="p-1 hover:bg-[var(--muted)] rounded-lg transition-colors cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn size={14} className="text-[var(--muted-foreground)]" />
              </button>
            </div>

            {/* Imprimir */}
            <button
              type="button"
              onClick={handleImprimir}
              disabled={!pdfUrl}
              className="px-3.5 py-2 bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-40"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Descargar */}
            <button
              type="button"
              onClick={handleDescargar}
              disabled={!pdfDoc}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Descargar PDF</span>
            </button>

            {/* Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── Content / PDF Viewer ─── */}
        <div className="flex-1 overflow-auto bg-[var(--muted)]/30 p-4">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Loader2 size={36} className="animate-spin text-[#0F172A]" />
              <span className="text-xs font-bold text-[var(--muted-foreground)]">
                Generando previsualización del documento...
              </span>
            </div>
          ) : pdfUrl ? (
            <div className="h-full flex items-center justify-center">
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                className="border border-[var(--border)] rounded-2xl shadow-lg bg-white"
                style={{
                  width: `${zoom}%`,
                  height: '100%',
                  minHeight: '500px',
                  maxWidth: '100%',
                }}
                title="Previsualización PDF"
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <FileText size={48} className="text-[var(--muted-foreground)] opacity-30" />
              <span className="text-xs font-bold text-[var(--muted-foreground)]">
                No se pudo generar la previsualización del documento.
              </span>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--card)] flex items-center justify-between shrink-0">
          <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">
            Archivo: {nombreArchivo}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDescargar}
              disabled={!pdfDoc}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40"
            >
              <Download size={14} />
              <span>Descargar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[var(--muted)]/60 hover:bg-[var(--muted)] text-[var(--foreground)] text-xs font-bold rounded-xl transition-all cursor-pointer border border-[var(--border)]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
