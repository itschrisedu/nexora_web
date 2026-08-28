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
} from "lucide-react";
import { useToast } from "./ui/toast";

interface ItemPrediccion {
  modelo: string;
  serie: string;
  talla: string;
  demanda_estimada: number;
  confianza: number;
  tendencia: "subida" | "bajada" | "estable";
  sugerencia_reorden: number;
  prioridad: "Alta" | "Media" | "Baja";
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
        setPrediccion(res);
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
      await ApiService.post("/ml/reentrenar", {});
      showToast("Modelo IA reentrenado exitosamente", "success");
      await cargarEstadoModelo();
      await cargarPrediccion(horizonte);
    } catch (err: any) {
      showToast("No se pudo reentrenar el modelo: " + (err.message || "Error de conexión"), "error");
    } finally {
      setReentrenando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-[#0F172A] dark:text-amber-400 bg-slate-900/10 dark:bg-amber-400/10 px-3 py-1 rounded-full w-fit border border-slate-900/20 dark:border-amber-400/20">
              <BrainCircuit size={14} className="animate-pulse" />
              Inteligencia Artificial
            </div>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
              El sistema analiza tus ventas anteriores para calcular qué productos, tallas y colores vas a necesitar en los próximos días, ayudándote a planificar tus compras.
            </p>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-[var(--muted)]/60 border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs text-[var(--foreground)]">
              <Calendar size={14} className="mr-2 text-[#0F172A] dark:text-amber-400" />
              <span>Horizonte:</span>
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

        {/* Métricas del Modelo */}
        {estadoModelo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--border)] text-xs">
            <div>
              <span className="text-[var(--muted-foreground)] block">Estado del Servicio</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={13} /> Activo
              </span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Nivel de Confianza</span>
              <span className="font-bold text-[#0F172A] dark:text-amber-400 font-mono mt-0.5 block">
                {estadoModelo.score_r2 ? `${(estadoModelo.score_r2 * 100).toFixed(1)}%` : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Ventas Analizadas</span>
              <span className="font-bold text-[var(--card-foreground)] font-mono mt-0.5 block">
                {estadoModelo.registros_entrenamiento ?? 0} ventas
              </span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Última Actualización</span>
              <span className="font-bold text-[var(--muted-foreground)] mt-0.5 block">
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
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-700 dark:text-amber-300 text-sm">
          <AlertTriangle size={20} className="shrink-0 text-amber-500" />
          <div>
            <p className="font-bold">Información de Predicción</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-300/80 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Alertas de Reabastecimiento Crítico */}
      {prediccion?.alerta_stock_bajo && prediccion.alerta_stock_bajo.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-[var(--card-foreground)] flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            Alertas Prioritarias de Reabastecimiento ({prediccion.horizonte_dias} días)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {prediccion.alerta_stock_bajo.map((alerta, idx) => (
              <div
                key={idx}
                className="px-3.5 py-2.5 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] flex items-center gap-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>{alerta}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de Predicciones por Producto */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[var(--card-foreground)] flex items-center gap-2 text-base">
            <Package size={18} className="text-[#0F172A] dark:text-amber-400" />
            Proyección de Demanda por Calzado
          </h3>
          {prediccion && (
            <span className="text-xs text-[var(--muted-foreground)]">
              Analizados: <strong className="text-[var(--card-foreground)]">{prediccion.total_productos_analizados}</strong> productos
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-[var(--muted-foreground)] space-y-3">
            <RefreshCw size={24} className="animate-spin mx-auto text-[#0F172A] dark:text-amber-400" />
            <p className="text-xs">Ejecutando modelos predictivos de Machine Learning...</p>
          </div>
        ) : !prediccion || prediccion.predicciones.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted-foreground)] text-xs">
            Sin proyecciones disponibles para este período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                  <th className="pb-3 font-semibold">Modelo</th>
                  <th className="pb-3 font-semibold">Serie</th>
                  <th className="pb-3 font-semibold text-center">Talla</th>
                  <th className="pb-3 font-semibold text-center">Demanda Estimada</th>
                  <th className="pb-3 font-semibold text-center">Tendencia</th>
                  <th className="pb-3 font-semibold text-center">Sugerencia Reorden</th>
                  <th className="pb-3 font-semibold text-right">Confianza ML</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {prediccion.predicciones.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="py-3 font-bold text-[var(--card-foreground)]">{item.modelo}</td>
                    <td className="py-3 text-[var(--muted-foreground)]">{item.serie}</td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 bg-[var(--muted)] border border-[var(--border)] rounded-md font-mono text-[var(--foreground)]">
                        {item.talla}
                      </span>
                    </td>
                    <td className="py-3 text-center font-bold text-[#0F172A] dark:text-amber-400 font-mono text-sm">
                      {item.demanda_estimada} <span className="text-[10px] font-normal text-[var(--muted-foreground)]">par(es)</span>
                    </td>
                    <td className="py-3 text-center">
                      {item.tendencia === "subida" && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <ArrowUpRight size={14} /> Alta Rotación
                        </span>
                      )}
                      {item.tendencia === "bajada" && (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                          <ArrowDownRight size={14} /> Desacelerando
                        </span>
                      )}
                      {item.tendencia === "estable" && (
                        <span className="inline-flex items-center gap-1 text-[var(--muted-foreground)] font-medium">
                          <Minus size={14} /> Estable
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
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
                    <td className="py-3 text-right font-mono text-[var(--muted-foreground)]">
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
