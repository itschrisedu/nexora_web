'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Smartphone, X, Check, Building2, MessageCircle, Laptop, Settings } from 'lucide-react';
import {
  CanalWhatsApp,
  guardarCanalWhatsAppPreferido,
  obtenerUrlWhatsApp,
  esDispositivoMovil,
  obtenerCanalWhatsAppPreferido,
} from '@/utils/whatsapp';

export default function WhatsAppSelectorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dataEnvio, setDataEnvio] = useState<{ telefono?: string | null; mensaje?: string; soloConfiguracion?: boolean } | null>(null);
  const [recordarEleccion, setRecordarEleccion] = useState(true);
  const [esMovil, setEsMovil] = useState(false);
  const [canalActual, setCanalActual] = useState<CanalWhatsApp>('PREGUNTAR');

  useEffect(() => {
    setEsMovil(esDispositivoMovil());
    setCanalActual(obtenerCanalWhatsAppPreferido());

    const handleSolicitud = (e: any) => {
      if (e?.detail) {
        setEsMovil(esDispositivoMovil());
        setCanalActual(obtenerCanalWhatsAppPreferido());
        setDataEnvio(e.detail);
        setIsOpen(true);
      }
    };

    window.addEventListener('nexora:solicitar-canal-whatsapp', handleSolicitud);
    return () => {
      window.removeEventListener('nexora:solicitar-canal-whatsapp', handleSolicitud);
    };
  }, []);

  if (!isOpen) return null;

  const handleSeleccionarCanal = (canal: CanalWhatsApp) => {
    if (recordarEleccion) {
      guardarCanalWhatsAppPreferido(canal);
      setCanalActual(canal);
    }

    if (dataEnvio && !dataEnvio.soloConfiguracion && dataEnvio.mensaje) {
      const url = obtenerUrlWhatsApp(dataEnvio.telefono, dataEnvio.mensaje, canal);
      if (url.startsWith('intent://') || url.startsWith('whatsapp://') || esMovil) {
        window.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }

    setIsOpen(false);
    setDataEnvio(null);
  };

  const handleCerrar = () => {
    setIsOpen(false);
    setDataEnvio(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Encabezado */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
              {esMovil ? <Smartphone size={20} /> : <Laptop size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-[var(--foreground)]">
                  {esMovil ? 'WhatsApp en tu Celular' : 'WhatsApp en tu Computadora'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {esMovil ? '📱 Móvil' : '💻 PC'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {dataEnvio?.soloConfiguracion
                  ? 'Configura la aplicación por defecto para este dispositivo'
                  : '¿Desde qué aplicación deseas enviar este mensaje?'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCerrar}
            className="p-1.5 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Opciones según dispositivo */}
        <div className="p-5 space-y-3">
          {esMovil ? (
            /* ═══ OPCIONES PARA CELULAR / TABLET ═══ */
            <div className="space-y-2.5">
              {/* Opción 1: WhatsApp Business (Recomendada para el Negocio) */}
              <button
                type="button"
                onClick={() => handleSeleccionarCanal('BUSINESS_MOVIL')}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all flex items-start gap-3.5 group cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-500/40"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Building2 size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                      WhatsApp Business (Negocio)
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-emerald-600 text-white shrink-0">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 leading-tight">
                    Abre directamente tu cuenta comercial del local comercial para no mezclar con tus chats personales.
                  </p>
                </div>
              </button>

              {/* Opción 2: WhatsApp Normal / Personal */}
              <button
                type="button"
                onClick={() => handleSeleccionarCanal('NORMAL_MOVIL')}
                className="w-full text-left p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:bg-slate-500/5 transition-all flex items-start gap-3.5 group cursor-pointer focus:ring-2 focus:ring-slate-500/40"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MessageCircle size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-emerald-600 transition-colors block">
                    WhatsApp Normal (Personal)
                  </span>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 leading-tight">
                    Abre la aplicación estándar de WhatsApp instalada en tu teléfono.
                  </p>
                </div>
              </button>

              {/* Opción 3: Preguntar al sistema operativo ("Abrir con") */}
              <button
                type="button"
                onClick={() => handleSeleccionarCanal('NATIVO_MOVIL')}
                className="w-full text-left p-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-slate-500/5 transition-all flex items-center gap-3 group cursor-pointer text-xs"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-500/10 text-[var(--muted-foreground)] flex items-center justify-center shrink-0">
                  <Smartphone size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-[var(--foreground)] text-[11px]">
                    Preguntar a mi celular ("Abrir con...")
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)] block">
                    Muestra el selector nativo de Android / iOS
                  </span>
                </div>
              </button>
            </div>
          ) : (
            /* ═══ OPCIONES PARA COMPUTADORA (PC / LAPTOP) ═══ */
            <div className="space-y-2.5">
              {/* Opción 1: WhatsApp Web (Recomendado para PC) */}
              <button
                type="button"
                onClick={() => handleSeleccionarCanal('WEB')}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all flex items-start gap-3.5 group cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-500/40"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Globe size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                      WhatsApp Web (Navegador)
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-emerald-600 text-white shrink-0">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 leading-tight">
                    Abre en una nueva pestaña usando la sesión web donde está conectado el número comercial de la tienda.
                  </p>
                </div>
              </button>

              {/* Opción 2: App de Escritorio instalada */}
              <button
                type="button"
                onClick={() => handleSeleccionarCanal('DESKTOP')}
                className="w-full text-left p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:bg-slate-500/5 transition-all flex items-start gap-3.5 group cursor-pointer focus:ring-2 focus:ring-slate-500/40"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Laptop size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-blue-600 transition-colors block">
                    Aplicación de Escritorio (Windows / Mac)
                  </span>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 leading-tight">
                    Abre la aplicación WhatsApp Desktop instalada en esta computadora.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Casilla Recordar Elección */}
          <div className="pt-2 border-t border-[var(--border)]">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recordarEleccion}
                onChange={(e) => setRecordarEleccion(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
              />
              <span className="text-xs text-[var(--foreground)] font-medium leading-tight">
                Recordar mi elección en este {esMovil ? 'celular' : 'computador'} para que los próximos envíos salgan de una sola vez sin volver a preguntar.
              </span>
            </label>
          </div>
        </div>

        {/* Pie */}
        <div className="px-5 py-3 border-t border-[var(--border)] bg-slate-500/5 flex items-center justify-between text-xs">
          <span className="text-[10px] text-[var(--muted-foreground)]">
            {esMovil ? 'Configuración guardada en este celular' : 'Configuración guardada en esta PC'}
          </span>
          <button
            onClick={handleCerrar}
            type="button"
            className="px-3.5 py-1.5 font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-500/10 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
