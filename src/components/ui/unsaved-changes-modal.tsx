"use client";

import React, { useState } from "react";
import { AlertTriangle, Save, LogOut, ArrowLeft, Loader2 } from "lucide-react";
import { UnsavedChangesDetail } from "../../utils/unsaved-changes";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  targetSectionName?: string;
  detail: UnsavedChangesDetail;
  onStay: () => void;
  onDiscardAndLeave: () => void;
  onSaveSuccessAndLeave?: () => void;
}

export default function UnsavedChangesModal({
  isOpen,
  targetSectionName,
  detail,
  onStay,
  onDiscardAndLeave,
  onSaveSuccessAndLeave,
}: UnsavedChangesModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (!isOpen) return null;

  const handleSaveAndLeave = async () => {
    if (!detail.onSave) {
      onDiscardAndLeave();
      return;
    }

    try {
      setIsSaving(true);
      setSaveError("");
      const res = await detail.onSave();
      if (res !== false) {
        if (onSaveSuccessAndLeave) {
          onSaveSuccessAndLeave();
        } else {
          onDiscardAndLeave();
        }
      }
    } catch (err: any) {
      console.error("Error al guardar antes de salir:", err);
      setSaveError(err?.message || "Ocurrió un error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera con Icono de Advertencia */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 shadow-xs">
            <AlertTriangle size={26} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-[var(--foreground)] leading-tight">
              ¿Deseas salir sin guardar los cambios?
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1.5 leading-relaxed">
              Tienes modificaciones pendientes en{" "}
              <strong className="text-[var(--foreground)] font-bold">
                {detail.sectionName || "esta sección"}
              </strong>
              . Si cambias de vista ahora sin guardar, todos los datos editados se perderán.
            </p>
          </div>
        </div>

        {/* Mensaje de Error si falla el guardado */}
        {saveError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="mt-6 flex flex-col sm:flex-row-reverse gap-2.5">
          {detail.onSave && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndLeave}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Guardar y Continuar
                </>
              )}
            </button>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={onDiscardAndLeave}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white dark:bg-red-500/15 dark:text-red-400 dark:hover:text-white dark:hover:bg-red-600 font-bold text-xs flex items-center justify-center gap-2 border border-red-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <LogOut size={15} />
            Descartar Cambios
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={onStay}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft size={15} />
            Continuar Editando
          </button>
        </div>
      </div>
    </div>
  );
}
