"use client";

import { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  Users,
  Search,
  RefreshCw,
  FileJson,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";

interface AuditLog {
  id: string;
  userEmail?: string;
  userRol?: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  detalles?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface ResumenAuditoria {
  totalEventos: number;
  sensibles: number;
  usuariosConEventos: number;
  loginsUltimas24h: number;
}

export default function AuditoriaComponent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [resumen, setResumen] = useState<ResumenAuditoria | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [limite] = useState(15);
  const [accionFiltro, setAccionFiltro] = useState<string>("TODAS");
  const [search, setSearch] = useState<string>("");
  const [logSeleccionado, setLogSeleccionado] = useState<AuditLog | null>(null);

  useEffect(() => {
    cargarResumen();
    cargarLogs();
  }, [pagina, accionFiltro]);

  const cargarResumen = async () => {
    try {
      const data = await ApiService.get("/auditoria/stats");
      if (data) setResumen(data);
    } catch (e) {
      console.warn("No se pudieron cargar estadísticas de auditoría:", e);
    }
  };

  const cargarLogs = async () => {
    setLoading(true);
    try {
      let query = `/auditoria?page=${pagina}&limit=${limite}`;
      if (accionFiltro !== "TODAS") query += `&accion=${accionFiltro}`;
      if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;

      const res = await ApiService.get(query);
      if (res && res.data) {
        setLogs(res.data);
        setTotalLogs(res.total || 0);
      } else if (Array.isArray(res)) {
        setLogs(res);
        setTotalLogs(res.length);
      }
    } catch (e) {
      console.warn("Error cargando bitácora de auditoría:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    cargarLogs();
  };

  const totalPaginas = Math.ceil(totalLogs / limite) || 1;

  const getAccionBadge = (accion: string) => {
    switch (accion) {
      case "CREAR":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "ACTUALIZAR":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "ELIMINAR":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "OPERACION_CRITICA":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse";
      case "LOGIN":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm p-6 rounded-3xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
              <ShieldCheck className="text-amber-600 dark:text-amber-400" size={26} />
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] font-medium">
                Historial completo de todas las acciones realizadas en el sistema para mayor seguridad y control.
              </p>
            </div>
          </div>

          <button
            onClick={() => { cargarResumen(); cargarLogs(); }}
            disabled={loading}
            className="px-4 py-2.5 bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] text-xs font-semibold rounded-xl border border-[var(--border)] flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualizar Logs
          </button>
        </div>

        {/* KPIs de Auditoría */}
        {resumen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--border)]">
            <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Activity size={20} />
              </div>
              <div>
                <span className="text-[11px] text-[var(--muted-foreground)] font-medium block">Total de Eventos</span>
                <span className="text-xl font-black text-[var(--card-foreground)] font-mono">{resumen.totalEventos}</span>
              </div>
            </div>

            <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <ShieldAlert size={20} />
              </div>
              <div>
                <span className="text-[11px] text-[var(--muted-foreground)] font-medium block">Eventos Sensibles</span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{resumen.sensibles}</span>
              </div>
            </div>

            <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Users size={20} />
              </div>
              <div>
                <span className="text-[11px] text-[var(--muted-foreground)] font-medium block">Usuarios Activos</span>
                <span className="text-xl font-black text-[var(--card-foreground)] font-mono">{resumen.usuariosConEventos}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtros y Buscador */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs de Filtro de Acción */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {["TODAS", "CREAR", "ACTUALIZAR", "ELIMINAR", "LOGIN", "OPERACION_CRITICA"].map((acc) => (
              <button
                key={acc}
                onClick={() => { setAccionFiltro(acc); setPagina(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  accionFiltro === acc
                    ? "bg-[#0F172A] text-white border-slate-700 shadow-sm"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--border)]"
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
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-[var(--muted-foreground)]" />
          </form>
        </div>

        {/* Tabla de Audit Logs */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] uppercase">
                <th className="pb-3 font-semibold">Fecha & Hora</th>
                <th className="pb-3 font-semibold">Usuario</th>
                <th className="pb-3 font-semibold text-center">Acción</th>
                <th className="pb-3 font-semibold">Entidad / Recurso</th>
                <th className="pb-3 font-semibold">Dirección IP</th>
                <th className="pb-3 font-semibold text-center">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                    <RefreshCw size={20} className="animate-spin mx-auto text-amber-500 mb-2" />
                    Cargando bitácora de seguridad...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="py-3 font-mono text-[var(--muted-foreground)] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("es-EC")}
                    </td>
                    <td className="py-3">
                      <div className="font-semibold text-[var(--card-foreground)]">{log.userEmail || "Sistema"}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)] capitalize">{log.userRol || "N/A"}</div>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getAccionBadge(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[var(--card-foreground)]">
                      {log.entidad}
                      {log.entidadId && <span className="text-[var(--muted-foreground)] text-[10px] ml-1">({log.entidadId.slice(0, 8)}...)</span>}
                    </td>
                    <td className="py-3 font-mono text-[var(--muted-foreground)] text-[11px]">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => setLogSeleccionado(log)}
                        className="p-1.5 bg-[var(--muted)] hover:bg-[var(--border)] border border-[var(--border)] rounded-lg text-[var(--foreground)] transition-all shadow-sm"
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
        <div className="flex justify-between items-center pt-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          <span>Mostrando {logs.length} de {totalLogs} registros</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1 || loading}
              className="p-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] disabled:opacity-40 shadow-sm"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono text-[var(--foreground)]">{pagina} / {totalPaginas}</span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas || loading}
              className="p-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] disabled:opacity-40 shadow-sm"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Inspector de Detalles JSON */}
      {logSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] shadow-2xl rounded-3xl max-w-2xl w-full p-6 space-y-4 relative">
            <button
              onClick={() => setLogSeleccionado(null)}
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 text-lg font-bold text-[var(--card-foreground)]">
              <FileJson className="text-amber-600 dark:text-amber-400" size={22} />
              Detalles del Registro de Auditoría
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--muted)]/50 p-3 rounded-xl border border-[var(--border)]">
              <div>
                <span className="text-[var(--muted-foreground)] block">ID Evento:</span>
                <span className="font-mono text-[var(--foreground)]">{logSeleccionado.id}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">Fecha y Hora:</span>
                <span className="font-mono text-[var(--foreground)]">{new Date(logSeleccionado.createdAt).toLocaleString("es-EC")}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">Usuario:</span>
                <span className="text-[var(--card-foreground)] font-semibold">{logSeleccionado.userEmail || "Sistema"}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">Navegador / UserAgent:</span>
                <span className="text-[var(--muted-foreground)] text-[11px] truncate block">{logSeleccionado.userAgent || "Desconocido"}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Payload de Cambios (JSON):</label>
              <pre className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 max-h-72 overflow-y-auto">
                {JSON.stringify(logSeleccionado.detalles || {}, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => setLogSeleccionado(null)}
              className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-all border border-slate-700"
            >
              Cerrar Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
