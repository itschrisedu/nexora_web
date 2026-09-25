"use client";

import React, { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isClientInitialized, setIsClientInitialized] = useState(false);

  useEffect(() => {
    // Garantizar que el SDK esté inicializado en el navegador
    if (!Sentry.isInitialized()) {
      Sentry.init({
        dsn: "https://094d4c94366907325a9d334d266428a4@o4512144445603840.ingest.us.sentry.io/4512144457990144",
        tracesSampleRate: 1.0,
      });
    }
    setIsClientInitialized(Sentry.isInitialized());
  }, []);

  const triggerDirectError = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const eventId = Sentry.captureMessage(
        "⚡ [NEXORA] Prueba de Conexión en Vivo desde Producción",
        "error"
      );
      
      const flushed = await Sentry.flush(3000);
      
      if (flushed) {
        setStatusMessage(`✅ Evento enviado y confirmado con Sentry (ID del Evento: ${eventId || "OK"}).`);
      } else {
        setStatusMessage(`⚠️ Enviado (ID: ${eventId}), pero la red tardó en responder. Revisa si un bloqueador de anuncios (AdBlock) está bloqueando sentry.io.`);
      }
    } catch (e: any) {
      setStatusMessage(`❌ Error: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerUnhandledException = () => {
    try {
      throw new Error("🚨 [NEXORA] Error Crítico de Prueba (Exception Stack Trace)");
    } catch (err) {
      const id = Sentry.captureException(err);
      setStatusMessage(`🚨 Excepción capturada (ID: ${id}). Revisa tu panel en Sentry.`);
      Sentry.flush(3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ⚡
        </div>
        <h1 className="text-2xl font-bold mb-2">Prueba de Sentry.io</h1>
        <p className="text-slate-400 text-sm mb-4">
          Estado del SDK:{" "}
          <span className={isClientInitialized ? "text-emerald-400 font-semibold" : "text-amber-400"}>
            {isClientInitialized ? "● Conectado e Inicializado" : "● Inicializando..."}
          </span>
        </p>

        <div className="space-y-3">
          <button
            onClick={triggerDirectError}
            disabled={loading}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer text-sm"
          >
            {loading ? "Enviando paquete a Sentry..." : "1. Enviar Mensaje de Error (Capture Message)"}
          </button>

          <button
            onClick={triggerUnhandledException}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-600/20 active:scale-95 cursor-pointer text-sm"
          >
            2. Enviar Excepción con Stack Trace
          </button>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg text-left break-all font-mono">
            {statusMessage}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
          Nota: Si usas extensiones como AdBlock, uBlock o Brave Shields, desactívalas en esta pestaña porque bloquean las conexiones salientes a sentry.io.
        </div>
      </div>
    </div>
  );
}
