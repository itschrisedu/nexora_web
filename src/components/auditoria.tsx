"use client";

import React, { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileJson,
  User,
  Clock,
  Globe,
  Lock,
  Activity,
  ChevronLeft,
  ChevronRight,
  AlertOctagon,
  CheckCircle,
  Database,
  X,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  tenantId: string;
  userId?: string;
  userEmail?: string;
  userRol?: string;
  accion: "CREAR" | "ACTUALIZAR" | "ELIMINAR" | "LOGIN" | "LOGOUT" | "EXPORTAR" | "OPERACION_CRITICA";
  entidad: string;
  entidadId?: string;
  detalles?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface ResumenSeguridad {
  totalEventos: number;
  operacionesCriticas: number;
  loginsUltimas24h: number;
}

export default function AuditoriaComponent() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [resumen, setResumen] = useState<ResumenSeguridad | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [accionFiltro, setAccionFiltro] = useState<string>("TODAS");
  const [pagina, setPagina] = useState<number>(1);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [logSeleccionado, setLogSeleccionado] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    cargarResumen();
    cargarLogs();
  }, [pagina, accionFiltro]);

  const cargarResumen = async () => {
    try {
      const data = await ApiService.get("/auditoria/resumen");
      setResumen(data);
    } catch (err: any) {
      console.error("Error al cargar resumen de seguridad:", err);
    }
  };

  const cargarLogs = async () => {
    setLoading(true);
    try {
      let query = `/auditoria?page=${pagina}&limit=15`;
      if (accionFiltro !== "TODAS") query += `&accion=${accionFiltro}`;
      if (search.trim()) query += `&entidad=${encodeURIComponent(search)}`;

      const data = await ApiService.get(query);
      setLogs(data.logs || []);
      setTotalPaginas(data.totalPaginas || 1);
      setTotalLogs(data.total || 0);
    } catch (err: any) {
      console.error("Error al cargar logs de auditoría:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    cargarLogs();
  };

  const getAccionBadge = (accion: string) => {
    switch (accion) {
      case "CREAR":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "ACTUALIZAR":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "ELIMINAR":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "OPERACION_CRITICA":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse";
      case "LOGIN":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-slate-700/20 text-slate-400 border-slate-700/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
              <ShieldCheck className="text-purple-400" size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Bitácora de Auditoría & Seguridad</h1>
              <p className="text-xs text-slate-400">
                Trazabilidad inmutable multi-tenant con registro de IP, cambios de estado y operaciones críticas.
              </p>
            </div>
          </div>

          <button
            onClick={() => { cargarResumen(); cargarLogs(); }}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/60 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualizar Logs
          </button>
        </div>

        {/* KPIs de Auditoría */}
        {resumen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700/40">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                <Activity size={20} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Total de Eventos</span>
                <span className="text-xl font-black text-white font-mono">{resumen.totalEventos}</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <ShieldAlert size={20} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Operaciones Críticas</span>
                <span className="text-xl font-black text-amber-400 font-mono">{resumen.operacionesCriticas}</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Lock size={20} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Inicios de Sesión (24h)</span>
                <span className="text-xl font-black text-emerald-400 font-mono">{resumen.loginsUltimas24h}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtros y Buscador */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs de Filtro de Acción */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {["TODAS", "CREAR", "ACTUALIZAR", "ELIMINAR", "LOGIN", "OPERACION_CRITICA"].map((acc) => (
              <button
                key={acc}
                onClick={() => { setAccionFiltro(acc); setPagina(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  accionFiltro === acc
                    ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/40"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                {acc}
              </button>
            ))}
          </div>

          {/* Formulario Buscador */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Filtrar por entidad o recurso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          </form>
        </div>

        {/* Tabla de Audit Logs */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/60 text-slate-400">
                <th className="pb-3 font-semibold">Fecha & Hora</th>
                <th className="pb-3 font-semibold">Usuario</th>
                <th className="pb-3 font-semibold text-center">Acción</th>
                <th className="pb-3 font-semibold">Entidad / Recurso</th>
                <th className="pb-3 font-semibold">Dirección IP</th>
                <th className="pb-3 font-semibold text-center">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <RefreshCw size={20} className="animate-spin mx-auto text-purple-400 mb-2" />
                    Cargando bitácora de seguridad...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("es-EC")}
                    </td>
                    <td className="py-3">
                      <div className="font-semibold text-slate-200">{log.userEmail || "Sistema"}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{log.userRol || "N/A"}</div>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getAccionBadge(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-300">
                      {log.entidad}
                      {log.entidadId && <span className="text-slate-500 text-[10px] ml-1">({log.entidadId.slice(0, 8)}...)</span>}
                    </td>
                    <td className="py-3 font-mono text-slate-400 text-[11px]">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => setLogSeleccionado(log)}
                        className="p-1.5 bg-slate-900 hover:bg-purple-950/40 border border-slate-700 hover:border-purple-500/40 rounded-lg text-slate-300 hover:text-purple-300 transition-all"
                        title="Ver payload JSON"
                      >
                        <FileJson size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs text-slate-400">
          <span>Mostrando {logs.length} de {totalLogs} registros</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1 || loading}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono text-slate-300">{pagina} / {totalPaginas}</span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas || loading}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Inspector de Detalles JSON */}
      {logSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 relative">
            <button
              onClick={() => setLogSeleccionado(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <FileJson className="text-purple-400" size={22} />
              Detalles del Registro de Auditoría
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block">ID Evento:</span>
                <span className="font-mono text-slate-300">{logSeleccionado.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Fecha y Hora:</span>
                <span className="font-mono text-slate-300">{new Date(logSeleccionado.createdAt).toLocaleString("es-EC")}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Usuario:</span>
                <span className="text-slate-200 font-semibold">{logSeleccionado.userEmail || "Sistema"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Navegador / UserAgent:</span>
                <span className="text-slate-400 text-[11px] truncate block">{logSeleccionado.userAgent || "Desconocido"}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Payload de Cambios (JSON):</label>
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 max-h-72 overflow-y-auto">
                {JSON.stringify(logSeleccionado.detalles || {}, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => setLogSeleccionado(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl transition-all"
            >
              Cerrar Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
