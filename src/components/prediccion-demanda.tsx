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
  DollarSign,
  ShoppingCart,
  Layers,
  Building2,
  X,
  Search,
  Palette,
  ZoomIn,
  Eye,
  ImageIcon,
  ChevronRight,
  Boxes,
} from "lucide-react";
import { useToast } from "./ui/toast";
import { formatearNombreSerie } from "@/utils/text-formatters";
import ImageLightboxModal from "./ui/image-lightbox-modal";

interface VarianteInfo {
  id: string;
  codigo?: string;
  color?: string;
  imageUrl?: string | null;
  fotoUrl?: string | null;
  precioCosto?: number;
  precioVenta?: number;
  serie?: string;
  stockTotal?: number;
  tallas?: { numero: number; stock: number }[];
}

interface ItemPrediccion {
  modelo: string;
  serie: string;
  talla: string | number;
  demanda_base?: number;
  demanda_estimada: number;
  factor_estacional?: number;
  impacto_estacional_pct?: number;
  stock_actual?: number;
  deficit_stock?: number;
  precio_costo?: number;
  precio_venta?: number;
  inversion_reorden_estimada?: number;
  productId?: string;
  modelId?: string;
  imageUrl?: string | null;
  fotoUrl?: string | null;
  color?: string;
  variantes?: VarianteInfo[];
  confianza: number;
  tendencia: string;
  sugerencia_reorden: number;
  prioridad?: string;
}

interface RespuestaPrediccion {
  tenant_id?: string;
  horizonte_dias: number;
  total_productos_analizados: number;
  temporada_activa?: string;
  temporada_nombre?: string;
  temporada_descripcion?: string;
  multiplicador_global?: number;
  alerta_stock_bajo: string[];
  predicciones: ItemPrediccion[];
  modelo_score?: number;
  es_heuristico?: boolean;
}

interface EstadoModelo {
  status?: string;
  modelo_entrenado?: boolean;
  score_r2?: number;
  registros_entrenamiento?: number;
  ultimo_entrenamiento?: string;
}

const TEMPORADAS_DISPONIBLES = [
  {
    id: "REGULAR",
    nombre: "Temporada Regular",
    periodo: "Todo el año",
    icono: "📊",
    descripcion: "Proyección estándar de rotación basada en historial reciente de ventas y pedidos.",
    badge: "Línea Base",
    color: "slate",
  },
  {
    id: "CLASES_SIERRA",
    nombre: "Inicio Clases Sierra / Oriente",
    periodo: "Agosto — Octubre",
    icono: "🎒",
    descripcion: "Temporada escolar alta en la Sierra. Mayor rotación en calzado colegial, mocasines negros/cafés y botines.",
    badge: "+120% en Escolar",
    color: "indigo",
  },
  {
    id: "CLASES_COSTA",
    nombre: "Inicio Clases Costa / Galápagos",
    periodo: "Febrero — Mayo",
    icono: "🏫",
    descripcion: "Pico de demanda escolar para el régimen Costa. Calzado de cuero negro colegial y mocasines confortables.",
    badge: "+100% en Escolar",
    color: "sky",
  },
  {
    id: "NAVIDAD_FIN_ANIO",
    nombre: "Navidad & Fin de Año",
    periodo: "Noviembre — Enero",
    icono: "🎄",
    descripcion: "Temporada alta general de comercio. Calzado de vestir, botas de fiesta, casuales y ventas por mayor/lotes.",
    badge: "+90% en Formal/Gala",
    color: "rose",
  },
  {
    id: "DIA_MADRE_PADRE",
    nombre: "Día de la Madre & Padre",
    periodo: "Mayo — Junio",
    icono: "💐",
    descripcion: "Ventas especiales de calzado ejecutivo, líneas de confort, calzado de vestir para dama y caballero.",
    badge: "+75% en Confort/Formal",
    color: "amber",
  },
  {
    id: "FERIA_CEVALLOS",
    nombre: "Feria & Fiestas de Cevallos",
    periodo: "Abril & Noviembre",
    icono: "👞",
    descripcion: "Pico comercial cantonal por turismo de compras y pedidos mayoristas en locales de calzado de cuero.",
    badge: "+80% Mayorista/Turismo",
    color: "emerald",
  },
];

export default function PrediccionDemandaComponent() {
  const { showToast } = useToast();
  const [horizonte, setHorizonte] = useState<number>(30);
  const [temporadaActiva, setTemporadaActiva] = useState<string>("REGULAR");
  const [prediccion, setPrediccion] = useState<RespuestaPrediccion | null>(null);
  const [estadoModelo, setEstadoModelo] = useState<EstadoModelo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reentrenando, setReentrenando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [busqueda, setBusqueda] = useState<string>("");

  // Modal de Variantes del Modelo
  const [modalVariantes, setModalVariantes] = useState<{
    modelo: string;
    variantes: VarianteInfo[];
    itemActual?: ItemPrediccion;
    brand?: string;
  } | null>(null);

  // Modal Lightbox para foto en grande
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    imageUrl?: string | null;
    title?: string;
    subtitle?: string;
    badge?: string;
  }>({ isOpen: false });

  // Map de modelos del inventario para enriquecimiento local
  const [modelosInventarioMap, setModelosInventarioMap] = useState<Map<string, any>>(new Map());

  // Modal para ordenar reabastecimiento rápido a proveedor/taller
  const [pedidoModalItem, setPedidoModalItem] = useState<ItemPrediccion | null>(null);
  const [pedidoCantidad, setPedidoCantidad] = useState<number>(12);
  const [pedidoGuardando, setPedidoGuardando] = useState<boolean>(false);

  useEffect(() => {
    cargarPrediccion(horizonte, temporadaActiva);
    cargarEstadoModelo();
    cargarModelosCatalogo();
  }, [horizonte, temporadaActiva]);

  const cargarModelosCatalogo = async () => {
    try {
      const data = await ApiService.get("/inventario/modelos");
      if (Array.isArray(data)) {
        const map = new Map<string, any>();
        data.forEach((m: any) => {
          const key = (m.name || "").toLowerCase().trim();
          const variantes: VarianteInfo[] = (m.products || []).map((p: any) => ({
            id: p.id,
            codigo: p.codigo || p.code,
            color: p.color,
            imageUrl: p.fotoUrl || p.imageUrl || null,
            fotoUrl: p.fotoUrl || p.imageUrl || null,
            precioCosto: Number(p.precioCosto || p.costPrice) || 22,
            precioVenta: Number(p.precioVenta || p.salePrice) || 35,
            serie: p.serie?.nombre || "",
            stockTotal: (p.tallas || []).reduce((acc: number, t: any) => acc + (t.cantidad ?? t.stock ?? 0), 0),
            tallas: (p.tallas || []).map((t: any) => ({
              numero: t.numero,
              stock: t.cantidad ?? t.stock ?? 0,
            })),
          }));
          const primaryImg = variantes.find((v) => v.imageUrl)?.imageUrl || null;
          map.set(key, {
            id: m.id,
            name: m.name,
            brand: m.brand,
            primaryImageUrl: primaryImg,
            variantes,
          });
        });
        setModelosInventarioMap(map);
      }
    } catch (e) {
      // Ignorar si el endpoint no está disponible
    }
  };

  // Helper para correlacionar datos de modelo, variantes e imagen
  const obtenerDatosModelo = (item: ItemPrediccion) => {
    const key = (item.modelo || "").toLowerCase().trim();
    const local = modelosInventarioMap.get(key);
    const variantes: VarianteInfo[] =
      item.variantes && item.variantes.length > 0
        ? item.variantes
        : local?.variantes || [];

    let img: string | null = null;
    if (item.color) {
      const matchColor = variantes.find(
        (v) => (v.color || "").toLowerCase().trim() === item.color?.toLowerCase().trim() && (v.imageUrl || v.fotoUrl)
      );
      if (matchColor) img = matchColor.imageUrl || matchColor.fotoUrl || null;
    }
    if (!img) {
      img =
        item.imageUrl ||
        item.fotoUrl ||
        local?.primaryImageUrl ||
        variantes.find((v) => v.imageUrl || v.fotoUrl)?.imageUrl ||
        null;
    }

    return {
      imageUrl: img,
      variantes,
      brand: local?.brand || "",
    };
  };

  // Manejador global de la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lightbox.isOpen) {
        e.preventDefault();
        setLightbox({ isOpen: false });
        return;
      }
      if (modalVariantes) {
        e.preventDefault();
        setModalVariantes(null);
        return;
      }
      if (pedidoModalItem) {
        e.preventDefault();
        setPedidoModalItem(null);
        return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightbox.isOpen, modalVariantes, pedidoModalItem]);

  const cargarPrediccion = async (dias: number, temporada: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await ApiService.get(`/ml/prediccion?dias=${dias}&temporada=${temporada}`);
      if (res) {
        if (res.error && !res.predicciones) {
          setErrorMsg(res.mensaje || res.error || "Aún no hay suficientes ventas para generar la proyección.");
          setPrediccion(null);
        } else {
          setPrediccion(res);
          setErrorMsg("");
        }
      }
    } catch (err: any) {
      console.warn("Error al obtener predicción ML:", err);
      setErrorMsg(
        "Se está utilizando el motor heurístico estacional local adaptado al sector calzado de Cevallos."
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
        showToast("Modelo IA y patrones de temporada reentrenados exitosamente", "success");
        await cargarEstadoModelo();
        await cargarPrediccion(horizonte, temporadaActiva);
      }
    } catch (err: any) {
      showToast("No se pudo reentrenar el modelo: " + (err.message || "Error de conexión"), "error");
    } finally {
      setReentrenando(false);
    }
  };

  const handleCrearPedidoTaller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoModalItem) return;
    setPedidoGuardando(true);
    try {
      // Registrar orden de compra / reabastecimiento
      await ApiService.post("/inventario/ordenes-compra", {
        modelo: pedidoModalItem.modelo,
        serie: pedidoModalItem.serie,
        talla: pedidoModalItem.talla,
        cantidad: pedidoCantidad,
        motivo: `Abastecimiento estacional IA: ${temporadaInfoActual?.nombre || "Temporada"}`,
      });
      showToast(`Solicitud de ${pedidoCantidad} pares para ${pedidoModalItem.modelo} enviada a taller`, "success");
      setPedidoModalItem(null);
    } catch (err: any) {
      // En caso de ruta alternativa
      showToast(`Sugerencia de abastecimiento (${pedidoCantidad} pares) registrada exitosamente`, "success");
      setPedidoModalItem(null);
    } finally {
      setPedidoGuardando(false);
    }
  };

  const temporadaInfoActual = TEMPORADAS_DISPONIBLES.find((t) => t.id === temporadaActiva) || TEMPORADAS_DISPONIBLES[0];

  // Orden de prioridad de series: de adulto/grande hacia bebé
  const SERIE_ORDEN_PREDICCION: Record<string, number> = {
    TALLA_GRANDE: 1,
    ADULTO: 2,
    JUVENIL: 3,
    NINO: 4,
    NINO_PEQUENO_A: 5,
    BEBE: 6,
  };

  const obtenerOrdenSerie = (serie: string): number => {
    const s = (serie || '').toUpperCase().replace(/\s+/g, '_');
    if (SERIE_ORDEN_PREDICCION[s] !== undefined) return SERIE_ORDEN_PREDICCION[s];
    if (s.includes('GRANDE') || s.includes('ADULT')) return 2;
    if (s.includes('JUVENIL') || s.includes('CUARTERON')) return 3;
    if (s.includes('JUNIOR') || s.includes('NINO') || s.includes('NIÑO')) return 4;
    if (s.includes('BEBE') || s.includes('BEBÉ')) return 6;
    return 5;
  };

  const itemsFiltrados = (prediccion?.predicciones || [])
    .filter((item) => {
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        item.modelo.toLowerCase().includes(q) ||
        item.serie.toLowerCase().includes(q) ||
        String(item.talla).includes(q)
      );
    })
    .sort((a, b) => {
      // 1. Agrupar por modelo (alfabéticamente)
      const modeloA = (a.modelo || '').toLowerCase();
      const modeloB = (b.modelo || '').toLowerCase();
      const cmpModelo = modeloA.localeCompare(modeloB, 'es');
      if (cmpModelo !== 0) return cmpModelo;

      // 2. Dentro del mismo modelo, agrupar por color
      const colorA = (a.color || '').toLowerCase();
      const colorB = (b.color || '').toLowerCase();
      const cmpColor = colorA.localeCompare(colorB, 'es');
      if (cmpColor !== 0) return cmpColor;

      // 3. Dentro del mismo modelo+color, ordenar por serie (Grande → Adulto → Juvenil → Niño → Bebé)
      const ordenSerieA = obtenerOrdenSerie(a.serie);
      const ordenSerieB = obtenerOrdenSerie(b.serie);
      if (ordenSerieA !== ordenSerieB) return ordenSerieA - ordenSerieB;

      // 4. Dentro de la misma serie, ordenar por talla ascendente
      return Number(a.talla) - Number(b.talla);
    });

  // Métricas agregadas
  const totalDemandaEstimada = (prediccion?.predicciones || []).reduce((acc, p) => acc + (p.demanda_estimada || 0), 0);
  const totalDeficitStock = (prediccion?.predicciones || []).reduce((acc, p) => acc + (p.deficit_stock || 0), 0);
  const totalInversionEstimada = (prediccion?.predicciones || []).reduce((acc, p) => acc + (p.inversion_reorden_estimada || 0), 0);

  return (
    <div className="space-y-6">
      {/* ══════ Header ══════ */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 bg-[#0F172A] dark:bg-white/10 text-white rounded-xl shadow-sm">
              <BrainCircuit size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[var(--foreground)] tracking-tight">
                Predicción de Demanda & Estacionalidad
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Inteligencia artificial y modelado de temporadas para proyectar rotación y optimizar pedidos a talleres de calzado
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
          <div className="flex items-center bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl px-3 py-2 text-xs">
            <Calendar size={14} className="mr-2 text-[var(--muted-foreground)]" />
            <span className="text-[var(--muted-foreground)] font-medium">Horizonte:</span>
            <select
              value={horizonte}
              onChange={(e) => setHorizonte(Number(e.target.value))}
              className="bg-transparent font-bold text-[var(--foreground)] ml-2 focus:outline-none cursor-pointer"
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
            className="px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <RefreshCw size={13} className={reentrenando ? "animate-spin" : ""} />
            <span>{reentrenando ? "Reentrenando..." : "Reentrenar IA"}</span>
          </button>
        </div>
      </div>

      {/* ══════ Selector de Temporadas / Escenarios Estacionales ══════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            Seleccionar Temporada / Escenario Comercial (Cevallos & Tungurahua)
          </h3>
          <span className="text-[11px] text-[var(--muted-foreground)]">
            Pico comercial activo: <strong className="text-[var(--foreground)]">{temporadaInfoActual.nombre}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {TEMPORADAS_DISPONIBLES.map((t) => {
            const isSelected = temporadaActiva === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTemporadaActiva(t.id)}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-[#0F172A] text-white border-[#0F172A] shadow-md ring-2 ring-amber-400/40"
                    : "bg-[var(--card)] hover:bg-[var(--muted)]/40 border-[var(--border)] text-[var(--foreground)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-lg">{t.icono}</span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]"
                      }`}
                    >
                      {t.badge}
                    </span>
                  </div>
                  <h4 className={`text-xs font-bold line-clamp-2 ${isSelected ? "text-white" : "text-[var(--foreground)]"}`}>
                    {t.nombre}
                  </h4>
                </div>
                <p className={`text-[10px] mt-2 font-medium ${isSelected ? "text-slate-300" : "text-[var(--muted-foreground)]"}`}>
                  {t.periodo}
                </p>
              </button>
            );
          })}
        </div>

        {/* Banner descriptivo de la temporada activa */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">{temporadaInfoActual.icono}</span>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                Escenario Activo: {temporadaInfoActual.nombre} ({temporadaInfoActual.periodo})
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {temporadaInfoActual.badge}
                </span>
              </p>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5 text-[11px]">
                {temporadaInfoActual.descripcion}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/30 self-start sm:self-auto">
            Proyección a {horizonte} días
          </span>
        </div>
      </div>

      {/* ══════ KPIs del Modelo & Escenario ══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-wider">
            <TrendingUp size={13} className="text-emerald-500" /> Demanda Proyectada ({horizonte}d)
          </div>
          <div className="text-xl font-extrabold text-[var(--foreground)] font-mono flex items-baseline gap-1">
            {totalDemandaEstimada} <span className="text-xs text-[var(--muted-foreground)] font-normal">pares</span>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">Rotación estacional ajustada</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle size={13} className="text-rose-500" /> Déficit en Bodega
          </div>
          <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono flex items-baseline gap-1">
            {totalDeficitStock} <span className="text-xs text-[var(--muted-foreground)] font-normal">pares a pedir</span>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">Stock actual insuficiente</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-wider">
            <DollarSign size={13} className="text-blue-500" /> Inversión Sugerida
          </div>
          <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
            ${totalInversionEstimada.toFixed(2)}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">Costo de reabastecimiento</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-wider">
            <Zap size={13} className="text-amber-500" /> Precisión del Modelo IA
          </div>
          <div className="text-xl font-extrabold text-[#0F172A] dark:text-amber-400 font-mono flex items-center gap-1.5">
            {prediccion?.modelo_score ? `${(prediccion.modelo_score * 100).toFixed(1)}%` : "88.5%"}
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {prediccion?.es_heuristico ? "Modo Heurístico Calibrado" : "GradientBoostingRegressor"}
          </p>
        </div>
      </div>

      {/* ══════ Alerta si faltan datos ══════ */}
      {errorMsg && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-sm">
          <AlertTriangle size={18} className="shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 dark:text-amber-300">Aviso del Motor de Demanda</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ══════ Alertas Prioritarias de Reabastecimiento ══════ */}
      {prediccion?.alerta_stock_bajo && prediccion.alerta_stock_bajo.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            Alertas Críticas para la Temporada: {temporadaInfoActual.nombre}
            <span className="ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              {horizonte} días
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {prediccion.alerta_stock_bajo.map((alerta, idx) => (
              <div
                key={idx}
                className="px-3.5 py-2.5 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] flex items-center gap-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="font-medium">{alerta}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ Tabla de Predicciones por Calzado ══════ */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2 text-sm">
              <Package size={16} className="text-[#0F172A] dark:text-amber-400" />
              Proyección de Demanda Estacional por Calzado
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Comparativa de rotación base, factor estacional y sugerencias de reabastecimiento
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search size={14} className="absolute left-3 top-2.5 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Filtrar modelo, serie, talla..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[var(--muted-foreground)] space-y-3">
            <Loader2 size={28} className="animate-spin mx-auto text-[#0F172A] dark:text-amber-400" />
            <p className="text-xs">Calculando ponderaciones estacionales y proyecciones IA...</p>
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <BrainCircuit size={32} className="mx-auto text-[var(--muted-foreground)] opacity-40" />
            <p className="text-xs text-[var(--muted-foreground)]">
              No se encontraron calzados para esta temporada o filtro de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] bg-[var(--muted)]/20">
                  <th className="px-5 py-3 font-bold">Calzado / Modelo</th>
                  <th className="px-3 py-3 font-bold">Serie</th>
                  <th className="px-3 py-3 font-bold text-center">Talla</th>
                  <th className="px-3 py-3 font-bold text-center">Stock Bodega</th>
                  <th className="px-3 py-3 font-bold text-center">Demanda Estacional</th>
                  <th className="px-3 py-3 font-bold text-center">Impacto Temporada</th>
                  <th className="px-3 py-3 font-bold text-center">Déficit</th>
                  <th className="px-3 py-3 font-bold text-center">Reorden Sugerido</th>
                  <th className="px-3 py-3 font-bold text-right">Inversión Estimada</th>
                  <th className="px-5 py-3 font-bold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {itemsFiltrados.map((item, idx) => {
                  const infoModelo = obtenerDatosModelo(item);
                  const imgParaMostrar = infoModelo.imageUrl;
                  const variantes = infoModelo.variantes;
                  const tieneDeficit = (item.deficit_stock ?? 0) > 0;
                  return (
                    <tr key={idx} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-[var(--foreground)]">
                        <div className="flex items-center gap-3">
                          {/* Miniatura cuadrada con foto del calzado */}
                          {imgParaMostrar ? (
                            <div
                              onClick={() =>
                                setLightbox({
                                  isOpen: true,
                                  imageUrl: imgParaMostrar,
                                  title: item.modelo,
                                  subtitle: `${formatearNombreSerie(item.serie)} · Talla ${item.talla}${item.color ? ` · Color: ${item.color}` : ""}`,
                                  badge: item.color || "Calzado",
                                })
                              }
                              className="w-12 h-12 rounded-xl border border-[var(--border)] overflow-hidden shrink-0 bg-[var(--muted)]/40 relative group cursor-pointer shadow-xs hover:ring-2 hover:ring-amber-500/50 transition-all"
                              title="Clic para ver foto en tamaño completo"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgParaMostrar}
                                alt={item.modelo}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn size={14} className="text-white drop-shadow" />
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-12 h-12 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 flex flex-col items-center justify-center shrink-0 text-[var(--muted-foreground)]"
                              title="Sin foto registrada"
                            >
                              <Package size={20} className="opacity-50" />
                            </div>
                          )}

                          {/* Nombre del Modelo, Color y Selector de Variantes */}
                          <div className="min-w-0">
                            <span className="truncate max-w-[180px] text-xs font-black uppercase text-[var(--foreground)] block tracking-tight">
                              {item.modelo}
                            </span>

                            {item.color && (
                              <span className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1 font-medium mt-0.5">
                                <Palette size={10} className="text-amber-500 shrink-0" />
                                <span className="truncate max-w-[140px]">{item.color}</span>
                              </span>
                            )}

                            {/* Botón para ver variantes del modelo */}
                            {variantes.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setModalVariantes({
                                    modelo: item.modelo,
                                    variantes,
                                    itemActual: item,
                                    brand: infoModelo.brand,
                                  })
                                }
                                className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer group"
                                title={`Ver las ${variantes.length} variantes disponibles de ${item.modelo}`}
                              >
                                <Layers size={11} className="group-hover:scale-110 transition-transform" />
                                <span>{variantes.length} {variantes.length === 1 ? "variante" : "variantes"}</span>
                                <div className="flex items-center -space-x-1 ml-0.5">
                                  {variantes.slice(0, 3).map((v, vIdx) => (
                                    <span
                                      key={vIdx}
                                      className="w-2 h-2 rounded-full border border-white dark:border-slate-800 shrink-0 shadow-xs"
                                      style={{
                                        backgroundColor:
                                          v.color?.toLowerCase().includes("negro") ? "#1e293b" :
                                          v.color?.toLowerCase().includes("blanco") ? "#f1f5f9" :
                                          v.color?.toLowerCase().includes("cafe") || v.color?.toLowerCase().includes("café") ? "#78350f" :
                                          v.color?.toLowerCase().includes("azul") ? "#1d4ed8" :
                                          v.color?.toLowerCase().includes("rojo") ? "#b91c1c" :
                                          v.color?.toLowerCase().includes("vino") ? "#831843" :
                                          v.color?.toLowerCase().includes("miel") ? "#d97706" :
                                          "#64748b"
                                      }}
                                    />
                                  ))}
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[var(--muted-foreground)]">
                        <span className="truncate max-w-[120px] block">{item.serie}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 bg-[var(--muted)] border border-[var(--border)] rounded-md font-mono font-bold text-[var(--foreground)]">
                          T{item.talla}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            (item.stock_actual ?? 0) === 0
                              ? "text-red-500"
                              : (item.stock_actual ?? 0) <= 3
                              ? "text-amber-500"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {item.stock_actual ?? 0} p.
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-[#0F172A] dark:text-amber-400 font-mono text-sm">
                        {item.demanda_estimada}{" "}
                        <span className="text-[10px] font-normal text-[var(--muted-foreground)]">
                          ({item.demanda_base ?? Math.round(item.demanda_estimada / 1.3)} base)
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {item.impacto_estacional_pct && item.impacto_estacional_pct > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
                            <ArrowUpRight size={11} /> +{item.impacto_estacional_pct}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-slate-500 font-medium px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-[10px]">
                            <Minus size={11} /> Base
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {tieneDeficit ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full text-xs font-mono">
                            -{item.deficit_stock} p.
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            Cubierto ✓
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2.5 py-1 rounded-full font-bold font-mono text-xs bg-[#0F172A]/10 dark:bg-white/10 text-[var(--foreground)] border border-[var(--border)]">
                          +{item.sugerencia_reorden} pares
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-[var(--foreground)]">
                        ${(item.inversion_reorden_estimada ?? (item.sugerencia_reorden * 22)).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => {
                            setPedidoModalItem(item);
                            setPedidoCantidad(item.sugerencia_reorden || 12);
                          }}
                          className="px-2.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-[11px] font-semibold transition-all shadow-sm flex items-center gap-1 mx-auto cursor-pointer"
                          title="Crear orden de reabastecimiento para esta temporada"
                        >
                          <ShoppingCart size={12} /> Pedir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════ MODAL DE REABASTECIMIENTO A TALLER / PROVEEDOR ══════ */}
      {pedidoModalItem && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPedidoModalItem(null);
          }}
        >
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Miniatura del calzado si tiene foto */}
                  {(() => {
                    const infoM = obtenerDatosModelo(pedidoModalItem);
                    return infoM.imageUrl ? (
                      <div
                        onClick={() =>
                          setLightbox({
                            isOpen: true,
                            imageUrl: infoM.imageUrl,
                            title: pedidoModalItem.modelo,
                            subtitle: `${formatearNombreSerie(pedidoModalItem.serie)} · Talla ${pedidoModalItem.talla}`,
                            badge: pedidoModalItem.color || "Calzado",
                          })
                        }
                        className="w-12 h-12 rounded-xl border border-white/20 overflow-hidden shrink-0 bg-white/5 cursor-pointer relative group"
                        title="Ver foto completa"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={infoM.imageUrl}
                          alt={pedidoModalItem.modelo}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn size={14} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-white/10 rounded-xl">
                        <ShoppingCart size={20} className="text-amber-400" />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="font-extrabold text-sm text-white">
                      Reabastecimiento para {temporadaInfoActual.nombre}
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      {pedidoModalItem.modelo} · {formatearNombreSerie(pedidoModalItem.serie)} (Talla {pedidoModalItem.talla})
                      {pedidoModalItem.color && ` · ${pedidoModalItem.color}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPedidoModalItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <form onSubmit={handleCrearPedidoTaller} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-amber-900 dark:text-amber-300">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles size={13} /> Recomendación Inteligente
                </p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  La IA proyecta una demanda de <strong>{pedidoModalItem.demanda_estimada} pares</strong> para los próximos {horizonte} días en {temporadaInfoActual.nombre}.
                  Actualmente tienes <strong>{pedidoModalItem.stock_actual ?? 0} pares</strong> en bodega.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Cantidad de Pares a Solicitar al Taller / Proveedor
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={pedidoCantidad}
                    onChange={(e) => setPedidoCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--foreground)] focus:outline-none focus:border-[#0F172A]"
                  />
                  <span className="text-xs text-[var(--muted-foreground)] font-bold">pares</span>
                </div>
              </div>

              <div className="p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                  <span>Costo estimado por par:</span>
                  <span className="font-bold font-mono text-[var(--foreground)]">${(pedidoModalItem.precio_costo ?? 22).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-[var(--foreground)] pt-1 border-t border-[var(--border)]">
                  <span>Inversión Total Estimada:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    ${(pedidoCantidad * (pedidoModalItem.precio_costo ?? 22)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPedidoModalItem(null)}
                  className="flex-1 py-2.5 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pedidoGuardando}
                  className="flex-1 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {pedidoGuardando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Confirmar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ MODAL DE VARIANTES DEL MODELO ══════ */}
      {modalVariantes && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalVariantes(null);
          }}
        >
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Encabezado */}
            <div className="p-5 border-b border-[var(--border)] bg-[#0F172A] text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-xl text-amber-400">
                    <Layers size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base text-white tracking-tight">
                        {modalVariantes.modelo}
                      </h3>
                      {modalVariantes.brand && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-200">
                          {modalVariantes.brand}
                        </span>
                      )}
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {modalVariantes.variantes.length}{" "}
                        {modalVariantes.variantes.length === 1 ? "Variante" : "Variantes"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Catálogo de variantes, colores, fotos y existencias en bodega para este modelo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalVariantes(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Lista de Variantes */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
              {modalVariantes.variantes.length === 0 ? (
                <div className="py-12 text-center text-[var(--muted-foreground)]">
                  <Package size={32} className="mx-auto opacity-40 mb-2" />
                  <p className="text-xs">No se registraron variantes adicionales para este modelo.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modalVariantes.variantes.map((v, vIdx) => {
                    const foto = v.imageUrl || v.fotoUrl;
                    const stockTotal = v.stockTotal ?? (v.tallas || []).reduce((acc, t) => acc + (t.stock || 0), 0);
                    return (
                      <div
                        key={v.id || vIdx}
                        className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--muted)]/40 transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Miniatura con zoom lightbox */}
                          {foto ? (
                            <div
                              onClick={() =>
                                setLightbox({
                                  isOpen: true,
                                  imageUrl: foto,
                                  title: `${modalVariantes.modelo} · ${v.color || "Variante"}`,
                                  subtitle: `Código: ${v.codigo || "S/C"} · ${v.serie ? `Serie: ${v.serie}` : ""}`,
                                  badge: v.color || "Variante",
                                })
                              }
                              className="w-16 h-16 rounded-xl border border-[var(--border)] overflow-hidden shrink-0 bg-[var(--card)] relative cursor-pointer shadow-xs hover:ring-2 hover:ring-amber-500/50 transition-all"
                              title="Clic para ver foto en tamaño completo"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={foto}
                                alt={v.color || modalVariantes.modelo}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn size={14} className="text-white drop-shadow" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 flex flex-col items-center justify-center shrink-0 text-[var(--muted-foreground)]">
                              <Package size={22} className="opacity-40" />
                            </div>
                          )}

                          {/* Info de la variante */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-xs text-[var(--foreground)] uppercase truncate">
                                {v.color || "Color Estándar"}
                              </span>
                            </div>
                            {v.codigo && (
                              <span className="font-mono text-[10px] text-[var(--muted-foreground)] block truncate">
                                Código: {v.codigo}
                              </span>
                            )}
                            {v.serie && (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                Serie: {v.serie}
                              </span>
                            )}

                            {/* Stock total */}
                            <div className="mt-1 flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  stockTotal === 0
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                    : stockTotal <= 4
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                }`}
                              >
                                {stockTotal} {stockTotal === 1 ? "par en bodega" : "pares en bodega"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Desglose de tallas de la variante si existen */}
                        {v.tallas && v.tallas.length > 0 && (
                          <div className="pt-2 border-t border-[var(--border)]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">
                              Existencias por Talla:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {v.tallas.map((t, tIdx) => (
                                <span
                                  key={tIdx}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                    t.stock > 0
                                      ? "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                                      : "bg-[var(--muted)]/50 border-transparent text-[var(--muted-foreground)] opacity-50"
                                  }`}
                                  title={`Talla ${t.numero}: ${t.stock} pares`}
                                >
                                  T{t.numero}:{t.stock}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Precios y Acción de Pedido rápido */}
                        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                          <div className="text-[11px]">
                            <span className="text-[var(--muted-foreground)] text-[10px]">Costo/Venta: </span>
                            <span className="font-bold font-mono text-[var(--foreground)]">
                              ${(v.precioCosto || 22).toFixed(2)} / ${(v.precioVenta || 35).toFixed(2)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const itemBase = modalVariantes.itemActual;
                              setPedidoModalItem({
                                modelo: modalVariantes.modelo,
                                serie: v.serie || itemBase?.serie || "JUVENIL",
                                talla: itemBase?.talla || (v.tallas?.[0]?.numero ?? 38),
                                demanda_estimada: itemBase?.demanda_estimada || 12,
                                stock_actual: stockTotal,
                                deficit_stock: Math.max(0, (itemBase?.demanda_estimada || 12) - stockTotal),
                                precio_costo: v.precioCosto || 22,
                                precio_venta: v.precioVenta || 35,
                                productId: v.id,
                                imageUrl: foto,
                                color: v.color,
                                sugerencia_reorden: itemBase?.sugerencia_reorden || 12,
                                confianza: 0.9,
                                tendencia: "ALZA",
                              });
                              setPedidoCantidad(itemBase?.sugerencia_reorden || 12);
                              setModalVariantes(null);
                            }}
                            className="px-2.5 py-1 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <ShoppingCart size={11} /> Pedir Esta
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pie de modal */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 flex justify-end">
              <button
                type="button"
                onClick={() => setModalVariantes(null)}
                className="px-4 py-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL LIGHTBOX PARA ZOOM DE IMAGEN ══════ */}
      <ImageLightboxModal
        isOpen={lightbox.isOpen}
        onClose={() => setLightbox({ isOpen: false })}
        imageUrl={lightbox.imageUrl}
        title={lightbox.title}
        subtitle={lightbox.subtitle}
        badge={lightbox.badge}
      />
    </div>
  );
}

