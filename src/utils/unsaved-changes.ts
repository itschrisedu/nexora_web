import { useEffect } from "react";

export interface UnsavedChangesDetail {
  hasChanges: boolean;
  sectionName?: string;
  onSave?: () => Promise<boolean | void> | boolean | void;
}

declare global {
  interface Window {
    __unsavedChangesDetail?: UnsavedChangesDetail;
  }
}

/**
 * Notifica al shell principal si la sección actual tiene cambios pendientes de guardar.
 */
export function setUnsavedChanges(detail: UnsavedChangesDetail) {
  if (typeof window !== "undefined") {
    window.__unsavedChangesDetail = detail;
    window.dispatchEvent(new CustomEvent("app_unsaved_changes", { detail }));
  }
}

/**
 * Limpia el estado de cambios sin guardar.
 */
export function clearUnsavedChanges() {
  setUnsavedChanges({ hasChanges: false });
}

/**
 * Obtiene el estado actual de cambios sin guardar.
 */
export function getUnsavedChanges(): UnsavedChangesDetail {
  if (typeof window !== "undefined" && window.__unsavedChangesDetail) {
    return window.__unsavedChangesDetail;
  }
  return { hasChanges: false };
}

/**
 * Hook de React para vincular automáticamente el estado "dirty" de un formulario con el protector de navegación.
 */
export function useUnsavedChanges(
  isDirty: boolean,
  onSave?: () => Promise<boolean | void> | boolean | void,
  sectionName?: string
) {
  useEffect(() => {
    setUnsavedChanges({
      hasChanges: isDirty,
      onSave,
      sectionName,
    });

    return () => {
      // Al desmontar la sección, limpiar el estado
      clearUnsavedChanges();
    };
  }, [isDirty, onSave, sectionName]);
}
