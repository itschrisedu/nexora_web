"use client";

import { useEffect, useCallback } from "react";

export interface UseModalDismissOptions {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Function to close the modal */
  onClose: () => void;
  /** Optional: returns true if there are unsaved changes */
  isDirty?: () => boolean;
  /** Optional: callback when user wants to dismiss but has unsaved changes */
  onDirtyDismiss?: () => void;
}

/**
 * Hook that provides Escape key dismissal and backdrop click dismissal for modals.
 * 
 * If `isDirty` is provided and returns true, the `onDirtyDismiss` callback is called
 * instead of `onClose`, allowing the parent to show a confirmation modal.
 * 
 * If `isDirty` is not provided or returns false, the modal is closed immediately.
 * 
 * Usage:
 * ```tsx
 * const { backdropProps } = useModalDismiss({
 *   isOpen: showModal,
 *   onClose: () => setShowModal(false),
 *   isDirty: () => formChanged,
 *   onDirtyDismiss: () => setShowUnsavedConfirm(true),
 * });
 * 
 * return (
 *   <div className="fixed inset-0 ..." {...backdropProps}>
 *     <div className="modal-content" onClick={(e) => e.stopPropagation()}>
 *       ...
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useModalDismiss({
  isOpen,
  onClose,
  isDirty,
  onDirtyDismiss,
}: UseModalDismissOptions) {
  const handleDismiss = useCallback(() => {
    if (isDirty && isDirty()) {
      if (onDirtyDismiss) {
        onDirtyDismiss();
      }
      // If no onDirtyDismiss handler, do nothing (prevent accidental close)
      return;
    }
    onClose();
  }, [onClose, isDirty, onDirtyDismiss]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleDismiss();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleDismiss]);

  // Backdrop click props
  const backdropProps = {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      // Only trigger if clicking directly on the backdrop (not on modal content)
      if (e.target === e.currentTarget) {
        handleDismiss();
      }
    },
  };

  return { backdropProps, handleDismiss };
}
