"use client";

import { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
import {
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Sparkles,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  Loader2,
  Activity,
  Zap,
  BarChart3,
} from "lucide-react";
import { useToast } from "./ui/toast";

interface ItemPrediccion {
  modelo: string;
  serie: string;
  talla: string | number;
  demanda_estimada: number;
  confianza: number;
  tendencia: string;
  sugerencia_reorden: number;
  prioridad?: string;
}

interface RespuestaPrediccion {
  horizonte_dias: number;
  total_productos_analizados: number;
  alerta_stock_bajo: string[];
  predicciones: ItemPrediccion[];
}

interface EstadoModelo {
  status: string;
  score_r2?: number;
  registros_entrenamiento?: number;
  ultimo_entrenamiento?: string;
}

export default function PrediccionDemandaComponent() {
  const { showToast } = useToast();
  const [horizonte, setHorizonte] = useState<number>(30);
  const [prediccion, setPrediccion] = useState<RespuestaPrediccion | null>(null);
  const [estadoModelo, setEstadoModelo] = useState<EstadoModelo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reentrenando, setReentrenando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    cargarPrediccion(horizonte);
    cargarEstadoModelo();
  }, [horizonte]);

  const cargarPrediccion = async (dias: number) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await ApiService.get(`/ml/prediccion?dias=${dias}`);
      if (res) {
        if (res.error || res.success === false) {
          setErrorMsg(res.mensaje || res.error || "Aún no hay suficientes ventas para generar la proyección.");
          setPrediccion(null);
        } else {
          setPrediccion(res);
          setErrorMsg("");
        }
      }
    } catch (err: any) {
      console.warn("No se pudo obtener la predicción ML:", err);
      setErrorMsg(
        "Se está utilizando el motor heurístico local. Registre más ventas para mejorar la precisión del modelo ML."
      );
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadoModelo = async () => {
    try {
      const res = await ApiService.get("/ml/estado");
      if (res) setEstadoModelo(res);
    } catch (e) {
      // Ignorar silenciosamente si el microservicio ML está inactivo
    }
  };

  const handleReentrenar = async () => {
    setReentrenando(true);
    try {
      const result = await ApiService.post("/ml/reentrenamiento", {});
      if (result?.success === false) {
        showToast(result.mensaje || result.error || "No se pudo reentrenar el modelo", "error");
      } else {
        showToast("Modelo IA reentrenado exitosamente", "success");
        await cargarEstadoModelo();
        await cargarPrediccion(horizonte);
      }
    } catch (err: any) {
      showToast("No se pudo reentrenar el modelo: " + (err.message || "Error de conexión"), "error");
    } finally {
      setReentrenando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ══════ Header ══════ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
            <BrainCircuit size={22} className="text-[#0F172A] dark:text-amber-400" />
            Predicción Inteligente
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            El sistema analiza ventas anteriores para proyectar demanda futura y optimizar tus compras
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs">
            <Calendar size={14} className="mr-2 text-[#0F172A] dark:text-amber-400" />
            <span className="text-[var(--muted-foreground)]">Horizonte:</span>
            <select
              value={horizonte}
              onChange={(e) => setHorizonte(Number(e.target.value))}
              className="bg-transparent font-bold text-[#0F172A] dark:text-amber-400 ml-2 focus:outline-none cursor-pointer"
            >
              <option value={15} className="bg-[var(--card)] text-[var(--foreground)]">15 días</option>
              <option value={30} className="bg-[var(--card)] text-[var(--foreground)]">30 días</option>
              <option value={60} className="bg-[var(--card)] text-[var(--foreground)]">60 días</option>
              <option value={90} className="bg-[var(--card)] text-[var(--foreground)]">90 días</option>
            </select>
          </div>
          <button
            onClick={handleReentrenar}
            disabled={reentrenando || loading}
            className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 border border-slate-700"
          >
            <RefreshCw size={14} className={reentrenando ? "animate-spin" : ""} />
            {reentrenando ? "Reentrenando..." : "Reentrenar Modelo"}
          </button>
        </div>
      </div>

      {/* ══════ KPIs del Modelo ══════ */}
      {estadoModelo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-wider">
              <Activity size={13} /> Estado del Servicio
            </div>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> Activo
            </div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-wider">
              <Zap size={13} /> Nivel de Confianza
            </div>
            <div className="text-lg font-extrabold text-[#0F172A] dark:text-amber-400 font-mono">
              {estadoModelo.score_r2 ? `${(estadoModelo.score_r2 * 100).toFixed(1)}%` : "N/A"}
            </div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-wider">
              <BarChart3 size={13} /> Ventas Analizadas
            </div>
            <div className="text-lg font-extrabold text-[var(--foreground)] font-mono">
              {estadoModelo.registros_entrenamiento ?? 0}
            </div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-wider">
              <Calendar size={13} /> Última Actualización
            </div>
            <div className="text-sm font-bold text-[var(--muted-foreground)]">
              {estadoModelo.ultimo_entrenamiento
                ? new Date(estadoModelo.ultimo_entrenamiento).toLocaleDateString("es-EC", { day: '2-digit', month: 'short', year: 'numeric' })
                : "En espera"}
            </div>
          </div>
        </div>
      )}

      {/* ══════ Alerta si faltan datos ══════ */}
      {errorMsg && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-sm">
          <AlertTriangle size={18} className="shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="font-bold text-amber-700 dark:text-amber-300">Información de Predicción</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-300/80 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ══════ Alertas de Reabastecimiento Crítico ══════ */}
      {prediccion?.alerta_stock_bajo && prediccion.alerta_stock_bajo.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            Alertas Prioritarias de Reabastecimiento
            <span className="ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {prediccion.horizonte_dias} días
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {prediccion.alerta_stock_bajo.map((alerta, idx) => (
              <div
                key={idx}
                className="px-3.5 py-2.5 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] flex items-center gap-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>{alerta}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ Tabla de Predicciones por Producto ══════ */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2 text-sm">
            <Package size={16} className="text-[#0F172A] dark:text-amber-400" />
            Proyección de Demanda por Calzado
          </h3>
          {prediccion && (
            <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
              Analizados: <strong className="text-[var(--foreground)]">{prediccion.total_productos_analizados}</strong> productos
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-[var(--muted-foreground)] space-y-3">
            <Loader2 size={28} className="animate-spin mx-auto text-[#0F172A] dark:text-amber-400" />
            <p className="text-xs">Ejecutando modelos predictivos de Machine Learning...</p>
          </div>
        ) : !prediccion || prediccion.predicciones.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <BrainCircuit size={32} className="mx-auto text-[var(--muted-foreground)] opacity-40" />
            <p className="text-xs text-[var(--muted-foreground)]">Sin proyecciones disponibles para este período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-5 pb-3 font-semibold text-[var(--muted-foreground)]">Modelo</th>
                  <th className="px-3 pb-3 font-semibold text-[var(--muted-foreground)]">Serie</th>
                  <th className="px-3 pb-3 font-semibold text-center text-[var(--muted-foreground)]">Talla</th>
                  <th className="px-3 pb-3 font-semibold text-center text-[var(--muted-foreground)]">Demanda Estimada</th>
                  <th className="px-3 pb-3 font-semibold text-center text-[var(--muted-foreground)]">Tendencia</th>
                  <th className="px-3 pb-3 font-semibold text-center text-[var(--muted-foreground)]">Sugerencia Reorden</th>
                  <th className="px-5 pb-3 font-semibold text-right text-[var(--muted-foreground)]">Confianza ML</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {prediccion.predicciones.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-5 py-3 font-bold text-[var(--foreground)]">{item.modelo}</td>
                    <td className="px-3 py-3 text-[var(--muted-foreground)]">{item.serie}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 bg-[var(--muted)] border border-[var(--border)] rounded-md font-mono text-[var(--foreground)]">
                        {item.talla}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-[#0F172A] dark:text-amber-400 font-mono text-sm">
                      {item.demanda_estimada} <span className="text-[10px] font-normal text-[var(--muted-foreground)]">par(es)</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {(item.tendencia?.toUpperCase() === "ALZA" || item.tendencia?.toLowerCase() === "subida" || item.tendencia?.toUpperCase() === "CRECIENTE") ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px]">
                          <ArrowUpRight size={13} /> Alta Rotación
                        </span>
                      ) : (item.tendencia?.toUpperCase() === "BAJA" || item.tendencia?.toLowerCase() === "bajada" || item.tendencia?.toUpperCase() === "DECRECIENTE") ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[11px]">
                          <ArrowDownRight size={13} /> Desacelerando
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium px-2.5 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-[11px]">
                          <Minus size={13} /> Estable
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold font-mono text-xs ${
                          item.prioridad === "Alta"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : item.prioridad === "Media"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        +{item.sugerencia_reorden} pares
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0F172A] dark:bg-amber-400 transition-all"
                            style={{ width: `${(item.confianza * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[var(--muted-foreground)] font-semibold w-8 text-right">
                          {(item.confianza * 100).toFixed(0)}%
                        </span>
                      </div>
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
