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
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Wallet,
  ShoppingBag,
  Package,
  LayoutList,
  User,
  Eye,
  Calendar,
  CheckCircle2,
  DollarSign,
  Layers,
  Building2,
  HelpCircle,
  FileText,
  Clock,
  Laptop,
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
  { key: "TODOS", label: "Todas las Operaciones", icon: LayoutList, color: "blue" },
  { key: "COBROS", label: "Cobros & Abonos", icon: Wallet, color: "emerald" },
  { key: "VENTAS", label: "Ventas & Notas", icon: ShoppingBag, color: "violet" },
  { key: "PEDIDOS", label: "Pedidos a Talleres", icon: Package, color: "amber" },
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
  const [mostrarTecnico, setMostrarTecnico] = useState<boolean>(false);

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
      console.warn("No se pudieron cargar estadísticas de auditoría:", e);
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

  const handleSegmentoChange = (seg: SegmentoTab) => {
    setSegmentoActivo(seg);
    setPagina(1);
  };

  const totalPaginas = Math.ceil(totalLogs / limite) || 1;

  // Traducir acciones técnicas a español claro
  const getAccionInfo = (accion: string) => {
    switch (accion) {
      case "CREAR":
        return {
          label: "Nuevo Registro",
          badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
          icon: "🟢",
        };
      case "ACTUALIZAR":
        return {
          label: "Modificación",
          badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
          icon: "🔵",
        };
      case "ELIMINAR":
        return {
          label: "Eliminación",
          badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
          icon: "🔴",
        };
      case "OPERACION_CRITICA":
        return {
          label: "Operación Especial",
          badge: "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30",
          icon: "⚠️",
        };
      case "LOGIN":
        return {
          label: "Inicio de Sesión",
          badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
          icon: "🔐",
        };
      default:
        return {
          label: accion || "Registro",
          badge: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]",
          icon: "📄",
        };
    }
  };

  // Traducir nombres de entidades a términos comerciales amigables
  const getEntidadInfo = (entidad: string) => {
    const e = (entidad || "").toUpperCase();
    if (e.includes("COBRO") || e.includes("ABONO") || e.includes("PAGO")) {
      return {
        nombre: "Cobros & Abonos",
        badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      };
    }
    if (e.includes("VENTA") || e.includes("SALE") || e.includes("POS") || e.includes("NOTA")) {
      return {
        nombre: "Ventas (POS / Notas)",
        badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
      };
    }
    if (e.includes("PEDIDO") || e.includes("ORDER") || e.includes("DESPACHO")) {
      return {
        nombre: "Pedidos & Lotes",
        badge: "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20",
      };
    }
    if (e.includes("CLIENTE") || e.includes("CLIENT")) {
      return {
        nombre: "Clientes",
        badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
      };
    }
    if (e.includes("INVENTARIO") || e.includes("PRODUCT") || e.includes("STOCK")) {
      return {
        nombre: "Calzado / Inventario",
        badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
      };
    }
    if (e.includes("PROVEEDOR") || e.includes("SUPPLIER")) {
      return {
        nombre: "Talleres / Proveedores",
        badge: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
      };
    }
    if (e.includes("CIERRE") || e.includes("CAJA")) {
      return {
        nombre: "Caja & Finanzas",
        badge: "bg-yellow-500/10 text-yellow-800 dark:text-yellow-400 border-yellow-500/20",
      };
    }
    if (e.includes("AUTH") || e.includes("LOGIN")) {
      return {
        nombre: "Seguridad & Acceso",
        badge: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
      };
    }
    return {
      nombre: entidad || "General",
      badge: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]",
    };
  };

  const getSegmentoCount = (key: SegmentoTab) => {
    if (!resumen) return 0;
    switch (key) {
      case "COBROS": return resumen.totalCobros ?? 0;
      case "VENTAS": return resumen.totalVentas ?? 0;
      case "PEDIDOS": return resumen.totalPedidos ?? 0;
      default: return resumen.totalEventos ?? 0;
    }
  };

  // Genera un texto en español 100% entendible para el administrador del local
  const formatDetalleHumano = (log: AuditLog): string => {
    if (log.detalles?.resumenHumano) {
      return log.detalles.resumenHumano;
    }

    const d = log.detalles || {};
    const body = d.body || {};
    const params = d.params || {};
    const url = (d.url || "").toLowerCase();
    const entidad = (log.entidad || "").toUpperCase();

    // 1. Cobros & Abonos
    if (entidad.includes("COBRO") || entidad.includes("ABONO") || url.includes("/abono") || url.includes("/cobro")) {
      const monto = body.monto ? `$${Number(body.monto).toFixed(2)}` : "";
      const metodo = body.metodo ? ` mediante ${body.metodo}` : "";
      const notas = body.notas ? ` (${body.notas})` : "";
      return `Cobro/Abono de ${monto || "pago recibido"}${metodo}${notas}`;
    }

    // 2. Ventas
    if (entidad.includes("VENTA") || url.includes("/venta") || url.includes("/nota-venta") || url.includes("/sale-note")) {
      const total = body.total ? `$${Number(body.total).toFixed(2)}` : "";
      const cliente = body.clienteNombre || body.clientName ? ` a ${body.clienteNombre || body.clientName}` : "";
      return `Registro de venta${total ? " por " + total : ""}${cliente}`;
    }

    // 3. Pedidos
    if (entidad.includes("PEDIDO") || entidad.includes("ORDER") || url.includes("/order") || url.includes("/pedido")) {
      const lineas = Array.isArray(body.lines) ? body.lines.length : (Array.isArray(body.items) ? body.items.length : "");
      return `Pedido comercial registrado${lineas ? ` con ${lineas} líneas de calzado` : ""}`;
    }

    // 4. Clientes
    if (entidad.includes("CLIENTE") || url.includes("/cliente")) {
      const nombre = [body.nombres || body.nombre, body.apellidos || body.apellido].filter(Boolean).join(" ");
      const cedula = body.cedula ? ` (CI: ${body.cedula})` : "";
      return `${log.accion === "CREAR" ? "Nuevo cliente registrado" : "Cliente modificado"}: ${nombre || "Cliente"}${cedula}`;
    }

    // 5. Inventario / Productos
    if (entidad.includes("INVENTARIO") || entidad.includes("PRODUCT") || url.includes("/product") || url.includes("/inventario")) {
      const modelo = body.modelName || body.nombre || body.name || body.code || "";
      const precio = body.salePrice ? ` por $${Number(body.salePrice).toFixed(2)}` : "";
      return `${log.accion === "CREAR" ? "Creación de modelo de calzado" : "Ajuste de producto / stock"}: ${modelo || "Calzado"}${precio}`;
    }

    // 6. Proveedores
    if (entidad.includes("PROVEEDOR") || url.includes("/proveedor")) {
      const nombre = body.nombre || body.name || "";
      return `Gestión de taller proveedor: ${nombre || "Proveedor"}`;
    }

    // 7. Login
    if (log.accion === "LOGIN" || url.includes("/login")) {
      return "Inicio de sesión seguro en la plataforma";
    }

    // 8. Fallback amigable
    const accionTexto = log.accion === "CREAR" ? "Nuevo registro" : log.accion === "ELIMINAR" ? "Eliminación" : "Modificación";
    return `${accionTexto} en ${getEntidadInfo(log.entidad).nombre}`;
  };

  return (
    <div className="space-y-6">
      {/* ══════ Header Principal ══════ */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm p-6 rounded-3xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-[#0F172A] dark:bg-white/10 rounded-2xl flex items-center justify-center border border-slate-700 shadow-sm text-white">
              <ShieldCheck className="text-amber-400" size={26} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--foreground)] tracking-tight">
                Bitácora de Auditoría & Control de Actividades
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Registro cronológico y transparente de todas las operaciones realizadas en el sistema (cobros, ventas, inventario y pedidos).
              </p>
            </div>
          </div>

          <button
            onClick={() => { cargarResumen(); cargarLogs(); }}
            disabled={loading}
            className="px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualizar Bitácora
          </button>
        </div>

        {/* ══════ KPIs Rápidos de Auditoría ══════ */}
        {resumen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[var(--border)]">
            <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Activity size={18} />
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] font-medium block">Total Operaciones</span>
                <span className="text-lg font-black text-[var(--foreground)] font-mono">{resumen.totalEventos}</span>
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
                <span className="text-[10px] text-[var(--muted-foreground)] font-medium block">Ventas Registradas</span>
                <span className="text-lg font-black text-violet-600 dark:text-violet-400 font-mono">{resumen.totalVentas ?? 0}</span>
              </div>
            </div>

            <div className="bg-[var(--muted)]/40 border border-[var(--border)] shadow-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <Package size={18} />
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] font-medium block">Pedidos a Talleres</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">{resumen.totalPedidos ?? 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════ Pestañas de Segmento Comercial ══════ */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-1.5 flex gap-1">
        {SEGMENTO_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = segmentoActivo === tab.key;
          const count = getSegmentoCount(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => handleSegmentoChange(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#0F172A] text-white shadow-md"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                isActive ? "bg-white/15 text-white/90" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ══════ Filtros y Tabla ══════ */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs de Filtro de Tipo de Acción */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: "TODAS", label: "Todas" },
              { id: "CREAR", label: "Nuevos Registros" },
              { id: "ACTUALIZAR", label: "Modificaciones" },
              { id: "ELIMINAR", label: "Eliminaciones" },
              { id: "LOGIN", label: "Inicios de Sesión" },
            ].map((acc) => (
              <button
                key={acc.id}
                onClick={() => { setAccionFiltro(acc.id); setPagina(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  accionFiltro === acc.id
                    ? "bg-[#0F172A] text-white border-slate-700 shadow-sm"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--border)]"
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Buscar por módulo o detalle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-[#0F172A]"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-[var(--muted-foreground)]" />
          </form>
        </div>

        {/* Tabla Principal de Auditoría */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] bg-[var(--muted)]/20">
                <th className="px-4 py-3 font-bold">Fecha & Hora</th>
                <th className="px-3 py-3 font-bold">Responsable</th>
                <th className="px-3 py-3 font-bold text-center">Tipo de Acción</th>
                <th className="px-3 py-3 font-bold">Módulo Afectado</th>
                <th className="px-3 py-3 font-bold">Detalle de la Actividad</th>
                <th className="px-4 py-3 font-bold text-center">Información</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--muted-foreground)]">
                    <RefreshCw size={22} className="animate-spin mx-auto text-amber-500 mb-2" />
                    Cargando bitácora de operaciones...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--muted-foreground)] space-y-1">
                    <ShieldCheck size={28} className="mx-auto text-slate-400 opacity-50 mb-1" />
                    <p className="font-medium text-xs">No se encontraron registros de auditoría{segmentoActivo !== "TODOS" ? ` en ${segmentoActivo.toLowerCase()}` : ""}.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const accionInfo = getAccionInfo(log.accion);
                  const entidadInfo = getEntidadInfo(log.entidad);
                  const detalleHumano = formatDetalleHumano(log);

                  return (
                    <tr key={log.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      {/* 1. Fecha & Hora */}
                      <td className="px-4 py-3 font-mono text-[var(--muted-foreground)] whitespace-nowrap text-[11px]">
                        {new Date(log.createdAt).toLocaleString("es-EC", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      {/* 2. Responsable */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[var(--muted)] rounded-full flex items-center justify-center border border-[var(--border)] shrink-0">
                            <User size={11} className="text-[var(--muted-foreground)]" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--foreground)] text-[11px] truncate max-w-[140px]">
                              {log.userEmail || "Sistema"}
                            </div>
                            {log.userRol && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)] capitalize">
                                {log.userRol.replace("ROL_", "").toLowerCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Acción */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${accionInfo.badge}`}>
                          <span>{accionInfo.icon}</span>
                          <span>{accionInfo.label}</span>
                        </span>
                      </td>

                      {/* 4. Entidad / Módulo */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${entidadInfo.badge}`}>
                          {entidadInfo.nombre}
                        </span>
                      </td>

                      {/* 5. Detalle Humano */}
                      <td className="px-3 py-3 text-[11px] text-[var(--foreground)] font-medium max-w-[280px]">
                        <p className="line-clamp-2 leading-snug">
                          {detalleHumano}
                        </p>
                      </td>

                      {/* 6. Botón Ver Detalle Amigable */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setLogSeleccionado(log);
                            setMostrarTecnico(false);
                          }}
                          className="px-2.5 py-1.5 bg-[var(--muted)] hover:bg-[#0F172A] hover:text-white border border-[var(--border)] rounded-xl text-[11px] font-semibold text-[var(--foreground)] transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                          title="Ver detalle completo de esta actividad"
                        >
                          <Eye size={12} />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ══════ Paginador ══════ */}
        <div className="flex justify-between items-center pt-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          <span>Mostrando <strong>{logs.length}</strong> de <strong>{totalLogs}</strong> registros</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1 || loading}
              className="p-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] disabled:opacity-40 shadow-sm cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono font-bold text-[var(--foreground)]">{pagina} / {totalPaginas}</span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas || loading}
              className="p-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] disabled:opacity-40 shadow-sm cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════ MODAL DE DETALLE AMIGABLE PARA EL ADMINISTRADOR ══════ */}
      {logSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] shadow-2xl rounded-3xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="p-5 border-b border-[var(--border)] bg-[#0F172A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <FileText size={18} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Detalle de la Operación
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Registro de seguridad del sistema NEXORA
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLogSeleccionado(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido en lenguaje comercial entendible */}
            <div className="p-5 space-y-4 text-xs">
              {/* Tarjeta de Resumen Explicativo */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1">
                <p className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 size={14} /> ¿Qué ocurrió en esta acción?
                </p>
                <p className="text-emerald-800 dark:text-emerald-200 text-xs font-medium leading-relaxed">
                  {formatDetalleHumano(logSeleccionado)}
                </p>
              </div>

              {/* Ficha de Información General */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl space-y-0.5">
                  <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase flex items-center gap-1">
                    <User size={11} /> Responsable
                  </span>
                  <p className="font-bold text-[var(--foreground)] truncate">
                    {logSeleccionado.userEmail || "Sistema"}
                  </p>
                  {logSeleccionado.userRol && (
                    <span className="text-[10px] text-[var(--muted-foreground)] capitalize">
                      Rol: {logSeleccionado.userRol.replace("ROL_", "").toLowerCase()}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl space-y-0.5">
                  <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase flex items-center gap-1">
                    <Clock size={11} /> Fecha & Hora
                  </span>
                  <p className="font-mono font-bold text-[var(--foreground)]">
                    {new Date(logSeleccionado.createdAt).toLocaleDateString("es-EC")}
                  </p>
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                    {new Date(logSeleccionado.createdAt).toLocaleTimeString("es-EC")}
                  </span>
                </div>

                <div className="p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl space-y-0.5">
                  <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase">
                    Tipo de Acción
                  </span>
                  <p className="font-bold text-[var(--foreground)]">
                    {getAccionInfo(logSeleccionado.accion).label}
                  </p>
                </div>

                <div className="p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl space-y-0.5">
                  <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase">
                    Módulo Afectado
                  </span>
                  <p className="font-bold text-[var(--foreground)]">
                    {getEntidadInfo(logSeleccionado.entidad).nombre}
                  </p>
                </div>
              </div>

              {/* Datos Relevantes de la Operación */}
              {logSeleccionado.detalles?.body && (
                <div className="p-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl space-y-1.5">
                  <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">
                    Datos Registrados en la Operación
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {logSeleccionado.detalles.body.monto !== undefined && (
                      <div>
                        <span className="text-[var(--muted-foreground)] text-[10px] block">Monto / Valor:</span>
                        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          ${Number(logSeleccionado.detalles.body.monto).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {logSeleccionado.detalles.body.total !== undefined && (
                      <div>
                        <span className="text-[var(--muted-foreground)] text-[10px] block">Total Venta:</span>
                        <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400">
                          ${Number(logSeleccionado.detalles.body.total).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {logSeleccionado.detalles.body.metodo && (
                      <div>
                        <span className="text-[var(--muted-foreground)] text-[10px] block">Método de Pago:</span>
                        <span className="font-bold text-[var(--foreground)] capitalize">
                          {logSeleccionado.detalles.body.metodo.toLowerCase()}
                        </span>
                      </div>
                    )}
                    {logSeleccionado.detalles.body.estado && (
                      <div>
                        <span className="text-[var(--muted-foreground)] text-[10px] block">Estado:</span>
                        <span className="font-bold text-[var(--foreground)]">
                          {logSeleccionado.detalles.body.estado}
                        </span>
                      </div>
                    )}
                    {logSeleccionado.detalles.body.notas && (
                      <div className="col-span-2">
                        <span className="text-[var(--muted-foreground)] text-[10px] block">Observaciones / Notas:</span>
                        <span className="text-[var(--foreground)] italic">
                          "{logSeleccionado.detalles.body.notas}"
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botón opcional para técnicos (colapsado por defecto) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setMostrarTecnico(!mostrarTecnico)}
                  className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline flex items-center gap-1 cursor-pointer"
                >
                  <Laptop size={11} />
                  {mostrarTecnico ? "Ocultar detalles técnicos" : "Ver detalles técnicos del sistema (IP / Navegador)"}
                </button>

                {mostrarTecnico && (
                  <div className="mt-2 p-2.5 bg-slate-950 text-slate-300 rounded-xl font-mono text-[10px] space-y-1">
                    <p>IP de origen: <span className="text-emerald-400">{logSeleccionado.ipAddress || "127.0.0.1"}</span></p>
                    <p>Dispositivo: <span className="text-slate-400">{logSeleccionado.userAgent || "Navegador Web"}</span></p>
                    <p>Ruta: <span className="text-amber-400">{logSeleccionado.detalles?.url || "N/A"}</span></p>
                  </div>
                )}
              </div>

              {/* Botón de Cierre */}
              <button
                onClick={() => setLogSeleccionado(null)}
                className="w-full py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl transition-all border border-slate-700 shadow-sm cursor-pointer text-xs"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

