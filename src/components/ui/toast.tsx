"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// ── Tipos ──
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ── Hook global ──
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback para componentes que aún no tienen el provider
    return {
      showToast: (message: string) => {
        console.warn('[Toast] Provider no encontrado, usando console:', message);
      },
    };
  }
  return context;
}

// ── Iconos por tipo ──
const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

// ── Colores por tipo (alineados al diseño de NEXORA) ──
const styleMap: Record<ToastType, string> = {
  success:
    'bg-emerald-900/95 border-emerald-500/40 text-emerald-100 shadow-emerald-500/20',
  error:
    'bg-red-900/95 border-red-500/40 text-red-100 shadow-red-500/20',
  warning:
    'bg-amber-900/95 border-amber-500/40 text-amber-100 shadow-amber-500/20',
  info:
    'bg-sky-900/95 border-sky-500/40 text-sky-100 shadow-sky-500/20',
};

const iconColorMap: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-sky-400',
};

const progressMap: Record<ToastType, string> = {
  success: 'bg-emerald-400',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-sky-400',
};

// ── Componente individual Toast ──
function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: (id: string) => void;
}) {
  const Icon = iconMap[toast.type];

  return (
    <div
      className={`
        relative flex items-start gap-3 px-4 py-3 rounded-xl border
        backdrop-blur-xl shadow-2xl
        animate-[slideIn_0.35s_ease-out]
        max-w-[420px] w-full
        ${styleMap[toast.type]}
      `}
      role="alert"
    >
      <Icon size={20} className={`mt-0.5 shrink-0 ${iconColorMap[toast.type]}`} />
      <p className="text-sm font-medium leading-snug flex-1 pr-2">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>

      {/* Barra de progreso animada */}
      <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full overflow-hidden bg-white/10">
        <div
          className={`h-full ${progressMap[toast.type]} rounded-full`}
          style={{
            animation: `shrinkWidth ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

// ── Provider ──
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newToast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Contenedor fijo de toasts — esquina superior derecha */}
      {toasts.length > 0 && (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-auto">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      )}

      {/* Keyframes CSS inline */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
