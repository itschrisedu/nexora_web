"use client";

import React, { useState } from "react";
import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  const [errorSent, setErrorSent] = useState(false);

  const triggerClientError = () => {
    try {
      throw new Error("Sentry Test Error from NEXORA Frontend!");
    } catch (error) {
      Sentry.captureException(error);
      setErrorSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ⚡
        </div>
        <h1 className="text-2xl font-bold mb-2">Prueba de Sentry.io</h1>
        <p className="text-slate-400 text-sm mb-6">
          Haz clic en el botón inferior para enviar un error de prueba a tu panel de control de Sentry y verificar la conexión.
        </p>

        <button
          onClick={triggerClientError}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer"
        >
          Provocar Error de Prueba
        </button>

        {errorSent && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg animate-fade-in">
            ✅ ¡Error capturado y enviado a Sentry! Revisa tu panel en sentry.io
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-800 text-xs text-slate-500">
          NEXORA • Sistema de Gestión Comercial
        </div>
      </div>
    </div>
  );
}
