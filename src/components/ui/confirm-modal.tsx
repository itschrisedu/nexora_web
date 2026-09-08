"use client";

import { AlertTriangle, X } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con icono distintivo */}
        <div
          className={`p-5 flex items-start gap-4 ${
            danger ? "bg-red-500/10 border-b border-red-500/20" : "bg-amber-500/10 border-b border-amber-500/20"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              danger
                ? "bg-red-500/20 text-red-500 border border-red-500/30"
                : "bg-amber-500/20 text-amber-500 border border-amber-500/30"
            }`}
          >
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-extrabold text-base text-[var(--foreground)] tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1.5 whitespace-pre-line leading-relaxed font-medium">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-[var(--border)] bg-[var(--muted)]/20">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer ${
              danger
                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20"
                : "bg-[#0F172A] hover:bg-slate-800 text-white shadow-slate-900/20"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
