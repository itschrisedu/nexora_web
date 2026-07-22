"use client";

import React, { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  BrainCircuit,
  AlertTriangle,
  Sparkles,
  Package,
  Calendar,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

interface PrediccionItem {
  modelo: string;
  serie: string;
  talla: number;
  demanda_estimada: number;
  confianza: number;
  tendencia: "ALZA" | "ESTABLE" | "BAJA";
  sugerencia_reorden: number;
}

interface PrediccionResponse {
  tenant_id: string;
  horizonte_dias: number;
  total_productos_analizados: number;
  predicciones: PrediccionItem[];
  modelo_score: number;
  alerta_stock_bajo: string[];
  error?: string;
  mensaje?: string;
}

interface EstadoModelo {
  tenant_id: string;
  modelo_entrenado: boolean;
  ultimo_entrenamiento?: string;
  registros_entrenamiento?: number;
  score_r2?: number;
  ml_service_disponible?: boolean;
}

export default function PrediccionDemandaComponent() {
  const [horizonte, setHorizonte] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);
  const [reentrenando, setReentrenando] = useState<boolean>(false);
  const [prediccion, setPrediccion] = useState<PrediccionResponse | null>(null);
  const [estadoModelo, setEstadoModelo] = useState<EstadoModelo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    cargarEstadoYPrediccion();
  }, [horizonte]);

  const cargarEstadoYPrediccion = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const estado = await ApiService.get("/ml/estado");
      setEstadoModelo(estado);

      const res = await ApiService.post("/ml/prediccion", {
        horizonteDias: horizonte,
      });

      if (res.error) {
        setErrorMsg(res.mensaje || res.error);
        setPrediccion(null);
      } else {
        setPrediccion(res);
      }
    } catch (err: any) {
      console.error("Error al consultar ML Service:", err);
      setErrorMsg(
        "No se pudo conectar con el microservicio de Machine Learning o faltan ventas suficientes."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReentrenar = async () => {
    setReentrenando(true);
    try {
      await ApiService.post("/ml/reentrenamiento", {});
      await cargarEstadoYPrediccion();
    } catch (err: any) {
      alert("Error al reentrenar: " + (err.message || err));
    } finally {
      setReentrenando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-slate-900/60 border border-violet-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full w-fit border border-purple-500/20">
              <BrainCircuit size={14} className="animate-pulse" />
              Machine Learning & Business Intelligence
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Predicción de Demanda de Calzado
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Algoritmo predictivo basado en Gradient Boosting Regressor que proyecta la rotación de stock por modelo, serie y talla utilizando patrones estacionales y series de tiempo.
            </p>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Calendar size={14} className="mr-2 text-purple-400" />
              <span>Horizonte:</span>
              <select
                value={horizonte}
                onChange={(e) => setHorizonte(Number(e.target.value))}
                className="bg-transparent font-bold text-purple-300 ml-2 focus:outline-none cursor-pointer"
              >
                <option value={15} className="bg-slate-900 text-slate-200">15 días</option>
                <option value={30} className="bg-slate-900 text-slate-200">30 días</option>
                <option value={60} className="bg-slate-900 text-slate-200">60 días</option>
                <option value={90} className="bg-slate-900 text-slate-200">90 días</option>
              </select>
            </div>

            <button
              onClick={handleReentrenar}
              disabled={reentrenando || loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2"
            >
              <RefreshCw size={14} className={reentrenando ? "animate-spin" : ""} />
              {reentrenando ? "Reentrenando..." : "Reentrenar Modelo"}
            </button>
          </div>
        </div>

        {/* Métricas del Modelo */}
        {estadoModelo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/40 text-xs">
            <div>
              <span className="text-slate-400 block">Estado del Servicio</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={13} /> Activo (Python ML)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Precisión (R² Score)</span>
              <span className="font-bold text-purple-300 font-mono mt-0.5 block">
                {estadoModelo.score_r2 ? `${(estadoModelo.score_r2 * 100).toFixed(1)}%` : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Ventas de Entrenamiento</span>
              <span className="font-bold text-slate-200 font-mono mt-0.5 block">
                {estadoModelo.registros_entrenamiento ?? 0} registros
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Última Actualización</span>
              <span className="font-bold text-slate-300 mt-0.5 block">
                {estadoModelo.ultimo_entrenamiento
                  ? new Date(estadoModelo.ultimo_entrenamiento).toLocaleDateString("es-EC")
                  : "En espera"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Alerta si faltan datos */}
      {errorMsg && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center gap-3 text-amber-200 text-sm">
          <AlertTriangle size={20} className="shrink-0 text-amber-400" />
          <div>
            <p className="font-bold">Información de Predicción</p>
            <p className="text-xs text-amber-300/80 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Alertas de Reabastecimiento Crítico */}
      {prediccion?.alerta_stock_bajo && prediccion.alerta_stock_bajo.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            Alertas Prioritarias de Reabastecimiento ({prediccion.horizonte_dias} días)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {prediccion.alerta_stock_bajo.map((alerta, idx) => (
              <div
                key={idx}
                className="px-3.5 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>{alerta}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de Predicciones por Producto */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2 text-base">
            <Package size={18} className="text-purple-400" />
            Proyección de Demanda por Calzado
          </h3>
          {prediccion && (
            <span className="text-xs text-slate-400">
              Analizados: <strong className="text-slate-200">{prediccion.total_productos_analizados}</strong> productos
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <RefreshCw size={24} className="animate-spin mx-auto text-purple-400" />
            <p className="text-xs">Ejecutando modelos predictivos de Machine Learning...</p>
          </div>
        ) : !prediccion || prediccion.predicciones.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Sin proyecciones disponibles para este período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700/60 text-slate-400">
                  <th className="pb-3 font-semibold">Modelo</th>
                  <th className="pb-3 font-semibold">Serie</th>
                  <th className="pb-3 font-semibold text-center">Talla</th>
                  <th className="pb-3 font-semibold text-center">Demanda Estimada</th>
                  <th className="pb-3 font-semibold text-center">Tendencia</th>
                  <th className="pb-3 font-semibold text-center">Sugerencia Reorden</th>
                  <th className="pb-3 font-semibold text-right">Confianza ML</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {prediccion.predicciones.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-bold text-slate-200">{item.modelo}</td>
                    <td className="py-3 text-slate-400">{item.serie}</td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 bg-slate-900 border border-slate-700/50 rounded-md font-mono text-slate-300">
                        {item.talla}
                      </span>
                    </td>
                    <td className="py-3 text-center font-bold text-purple-300 font-mono text-sm">
                      {item.demanda_estimada} <span className="text-[10px] font-normal text-slate-500">par(es)</span>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          item.tendencia === "ALZA"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : item.tendencia === "BAJA"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-slate-700/30 text-slate-400 border border-slate-700/40"
                        }`}
                      >
                        {item.tendencia === "ALZA" && <TrendingUp size={12} />}
                        {item.tendencia === "BAJA" && <TrendingDown size={12} />}
                        {item.tendencia === "ESTABLE" && <Minus size={12} />}
                        {item.tendencia}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold font-mono rounded-lg">
                        +{item.sugerencia_reorden} pares
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-slate-400">
                      {(item.confianza * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
