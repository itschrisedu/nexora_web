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
  Wallet,
  ShoppingBag,
  Package,
  LayoutList,
  User,
} from "lucide-react";

type SegmentoTab = "TODOS" | "COBROS" | "VENTAS" | "PEDIDOS";

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
  totalCobros: number;
  totalVentas: number;
  totalPedidos: number;
}

const SEGMENTO_TABS: { key: SegmentoTab; label: string; icon: any; color: string }[] = [
  { key: "TODOS", label: "Todos los Registros", icon: LayoutList, color: "blue" },
  { key: "COBROS", label: "Cobros & Abonos", icon: Wallet, color: "emerald" },
  { key: "VENTAS", label: "Ventas", icon: ShoppingBag, color: "violet" },
  { key: "PEDIDOS", label: "Pedidos", icon: Package, color: "amber" },
];

export default function AuditoriaComponent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [resumen, setResumen] = useState<ResumenAuditoria | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [limite] = useState(15);
  const [accionFiltro, setAccionFiltro] = useState<string>("TODAS");
  const [segmentoActivo, setSegmentoActivo] = useState<SegmentoTab>("TODOS");
  const [search, setSearch] = useState<string>("");
  const [logSeleccionado, setLogSeleccionado] = useState<AuditLog | null>(null);

  useEffect(() => {
    cargarResumen();
  }, []);

  useEffect(() => {
    cargarLogs();
  }, [pagina, accionFiltro, segmentoActivo]);

  const cargarResumen = async () => {
    try {
      const data = await ApiService.get("/auditoria/stats");
      if (data) setResumen(data);
    } catch (e) {
      console.warn("No se pudieron cargar estadisticas de auditoria:", e);
    }
  };

  const cargarLogs = async () => {
    setLoading(true);
    try {
      let query = `/auditoria?page=${pagina}&limit=${limite}`;
      if (accionFiltro !== "TODAS") query += `&accion=${accionFiltro}`;
      if (segmentoActivo !== "TODOS") query += `&segmento=${segmentoActivo}`;
      if (search.trim()) query += `&entidad=${encodeURIComponent(search.trim())}`;

      const res = await ApiService.get(query);
      if (res && Array.isArray(res.logs)) {
        setLogs(res.logs);
        setTotalLogs(res.total ?? res.logs.length);
      } else if (res && Array.isArray(res.data)) {
        setLogs(res.data);
        setTotalLogs(res.total ?? res.data.length);
      } else if (Array.isArray(res)) {
        setLogs(res);
        setTotalLogs(res.length);
      } else {
        setLogs([]);
        setTotalLogs(0);
      }
    } catch (e) {
      console.warn("Error cargando bitacora de auditoria:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    cargarLogs();
  };

  const handleSegmentoChange = (seg: SegmentoTab) => {
    setSegmentoActivo(seg);
    setPagina(1);
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

  const getEntidadBadge = (entidad: string) => {
    const e = entidad.toUpperCase();
    if (e.includes("COBRO") || e.includes("ABONO") || e.includes("PAGO"))
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (e.includes("VENTA") || e.includes("SALE") || e.includes("POS"))
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
    if (e.includes("PEDIDO") || e.includes("ORDER") || e.includes("DESPACHO"))
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    if (e.includes("CLIENTE"))
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    if (e.includes("INVENTARIO") || e.includes("PRODUCTO"))
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    return "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]";
  };

  // KPI count for the active segment
  const getSegmentoCount = (key: SegmentoTab) => {
    if (!resumen) return 0;
    switch (key) {
      case "COBROS": return resumen.totalCobros ?? 0;
      case "VENTAS": return resumen.totalVentas ?? 0;
      case "PEDIDOS": return resumen.totalPedidos ?? 0;
      default: return resumen.totalEventos ?? 0;
    }
  };

  // Friendly label for detalles
  const formatDetalleResumen = (log: AuditLog) => {
    if (!log.detalles) return null;
    const d = log.detalles;
    const parts: string[] = [];
    if (d.body?.monto) parts.push(`$${Number(d.body.monto).toFixed(2)}`);
    if (d.body?.metodo) parts.push(d.body.metodo);
    if (d.body?.estado) parts.push(d.body.estado);
    if (d.body?.notas) parts.push(d.body.notas.slice(0, 40));
    return parts.length > 0 ? parts.join(" · ") : null;
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

        {/* KPIs de Auditoria - Adaptativos al segmento */}
        {resumen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[var(--border)]">
            <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Activity size={18} />
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] font-medium block">Total Eventos</span>
                <span className="text-lg font-black text-[var(--card-foreground)] font-mono">{resumen.totalEventos}</span>
              </div>
            </div>

            <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Wallet size={18} />
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] font-medium block">Cobros & Abonos</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{resumen.totalCobros ?? 0}</span>
              </div>
            </div>

            <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
                <ShoppingBag size={18} />
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] font-medium block">Ventas</span>
                <span className="text-lg font-black text-violet-600 dark:text-violet-400 font-mono">{resumen.totalVentas ?? 0}</span>
              </div>
            </div>

            <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <Package size={18} />
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] font-medium block">Pedidos</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">{resumen.totalPedidos ?? 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pestanas de Segmento */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-1.5 flex gap-1">
        {SEGMENTO_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = segmentoActivo === tab.key;
          const count = getSegmentoCount(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => handleSegmentoChange(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-[#0F172A] text-white shadow-md"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                isActive ? "bg-white/15 text-white/80" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtros y Tabla */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs de Filtro de Accion */}
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
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-[#0F172A]"
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
                <th className="pb-3 font-semibold">Responsable</th>
                <th className="pb-3 font-semibold text-center">Accion</th>
                <th className="pb-3 font-semibold">Entidad</th>
                <th className="pb-3 font-semibold">Detalle Rapido</th>
                <th className="pb-3 font-semibold">IP</th>
                <th className="pb-3 font-semibold text-center">JSON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                    <RefreshCw size={20} className="animate-spin mx-auto text-amber-500 mb-2" />
                    Cargando bitacora de seguridad...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                    No se encontraron registros de auditoria{segmentoActivo !== "TODOS" ? ` en ${segmentoActivo.toLowerCase()}` : ""}.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const detalleResumen = formatDetalleResumen(log);
                  return (
                    <tr key={log.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="py-3 font-mono text-[var(--muted-foreground)] whitespace-nowrap text-[11px]">
                        {new Date(log.createdAt).toLocaleString("es-EC")}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[var(--muted)] rounded-full flex items-center justify-center border border-[var(--border)]">
                            <User size={10} className="text-[var(--muted-foreground)]" />
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--card-foreground)] text-[11px]">{log.userEmail || "Sistema"}</div>
                            {log.userRol && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)] capitalize">
                                {log.userRol.replace("ROL_", "")}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getAccionBadge(log.accion)}`}>
                          {log.accion}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${getEntidadBadge(log.entidad)}`}>
                          {log.entidad}
                        </span>
                        {log.entidadId && <span className="text-[var(--muted-foreground)] text-[9px] ml-1 font-mono">({log.entidadId.slice(0, 8)})</span>}
                      </td>
                      <td className="py-3 text-[11px] text-[var(--muted-foreground)] max-w-[180px] truncate">
                        {detalleResumen || "—"}
                      </td>
                      <td className="py-3 font-mono text-[var(--muted-foreground)] text-[10px]">
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
                  );
                })
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
              Detalles del Registro de Auditoria
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
                <span className="text-[var(--muted-foreground)] block">Responsable:</span>
                <span className="text-[var(--card-foreground)] font-semibold">{logSeleccionado.userEmail || "Sistema"}</span>
                {logSeleccionado.userRol && (
                  <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)] capitalize">
                    {logSeleccionado.userRol.replace("ROL_", "")}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">Entidad:</span>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getEntidadBadge(logSeleccionado.entidad)}`}>
                  {logSeleccionado.entidad}
                </span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">Accion:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getAccionBadge(logSeleccionado.accion)}`}>
                  {logSeleccionado.accion}
                </span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] block">Navegador / UserAgent:</span>
                <span className="text-[var(--muted-foreground)] text-[10px] truncate block">{logSeleccionado.userAgent || "Desconocido"}</span>
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
