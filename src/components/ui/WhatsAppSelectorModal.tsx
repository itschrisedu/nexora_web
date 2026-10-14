'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Smartphone, X, Check, ShieldCheck } from 'lucide-react';
import { CanalWhatsApp, guardarCanalWhatsAppPreferido, obtenerUrlWhatsApp } from '@/utils/whatsapp';

export default function WhatsAppSelectorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dataEnvio, setDataEnvio] = useState<{ telefono?: string | null; mensaje: string } | null>(null);
  const [recordarEleccion, setRecordarEleccion] = useState(true);

  useEffect(() => {
    const handleSolicitud = (e: any) => {
      if (e?.detail) {
        setDataEnvio(e.detail);
        setIsOpen(true);
      }
    };

    window.addEventListener('nexora:solicitar-canal-whatsapp', handleSolicitud);
    return () => {
      window.removeEventListener('nexora:solicitar-canal-whatsapp', handleSolicitud);
    };
  }, []);

  if (!isOpen || !dataEnvio) return null;

  const handleSeleccionarCanal = (canal: 'WEB' | 'APP') => {
    if (recordarEleccion) {
      guardarCanalWhatsAppPreferido(canal);
    }
    const url = obtenerUrlWhatsApp(dataEnvio.telefono, dataEnvio.mensaje, canal);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
    setDataEnvio(null);
  };

  const handleCerrar = () => {
    setIsOpen(false);
    setDataEnvio(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Encabezado */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-slate-500/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Canal de envío WhatsApp</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">Selecciona la aplicación de salida</p>
            </div>
          </div>
          <button
            onClick={handleCerrar}
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-500/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo / Opciones */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            Tienes WhatsApp abierto en tu navegador o aplicación. ¿Desde cuál cuenta deseas enviar este comprobante?
          </p>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {/* Opción 1: WhatsApp Web (Cuenta del Negocio) */}
            <button
              onClick={() => handleSeleccionarCanal('WEB')}
              type="button"
              className="w-full text-left p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 transition-all group flex items-start gap-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Globe size={20} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    WhatsApp Web (Cuenta del Negocio)
                  </span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)] leading-normal">
                  Abre la pestaña web de tu navegador donde tienes abierta la sesión de WhatsApp de tu local comercial.
                </p>
              </div>
            </button>

            {/* Opción 2: App de Escritorio / Celular */}
            <button
              onClick={() => handleSeleccionarCanal('APP')}
              type="button"
              className="w-full text-left p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-slate-500/5 transition-all group flex items-start gap-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Smartphone size={20} />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Aplicación Instalada (Desktop / Móvil)
                </span>
                <p className="text-[11px] text-[var(--muted-foreground)] leading-normal">
                  Abre la aplicación de WhatsApp instalada en tu equipo (WhatsApp Desktop en PC o app móvil).
                </p>
              </div>
            </button>
          </div>

          {/* Casilla Recordar */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recordarEleccion}
                onChange={(e) => setRecordarEleccion(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs text-[var(--muted-foreground)]">
                Recordar mi elección y no volver a preguntar (puedes cambiarlo luego en Personalización)
              </span>
            </label>
          </div>
        </div>

        {/* Pie */}
        <div className="px-5 py-3 border-t border-[var(--border)] bg-slate-500/5 flex justify-end">
          <button
            onClick={handleCerrar}
            type="button"
            className="px-3.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-500/10 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
