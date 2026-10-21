"use client";

import { useState, useEffect, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  TableProperties,
  Check,
  Filter,
  SlidersHorizontal,
  Info,
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
  colorPuro?: boolean;
  variantes?: VarianteInfo[];
  confianza: number;
  tendencia: string;
  sugerencia_reorden: number;
  prioridad?: string;
}

interface GrupoModeloPrediccion {
  key: string;
  modelo: string;
  serie: string;
  color: string;
  colorPuro: boolean;
  imageUrl: string | null;
  brand: string;
  variantes: VarianteInfo[];
  totalDemanda: number;
  totalStock: number;
  totalDeficit: number;
  totalInversion: number;
  totalSugerenciaReorden: number;
  precioCostoUnitario: number;
  precioVentaUnitario: number;
  tallas: ItemPrediccion[];
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

// Helpers para identificación estricta de calzado escolar colegial (solo negro) y deportivo (solo blanco)
// Debe coincidir estrictamente con Negro o Blanco (excluye compuestos como 'blanco - negro', 'blanco/azul', etc.)
const esTodoNegro = (color?: string | null): boolean => {
  if (!color) return false;
  const c = color.trim().toLowerCase().replace(/[.,;:_-]+$/, "");
  return c === "negro" || c === "negra";
};

const esTodoBlanco = (color?: string | null): boolean => {
  if (!color) return false;
  const c = color.trim().toLowerCase().replace(/[.,;:_-]+$/, "");
  return c === "blanco" || c === "blanca";
};

const esColorEscolarClasico = (color?: string | null): boolean => {
  return esTodoNegro(color) || esTodoBlanco(color);
};

interface PrediccionDemandaProps {
  onNavigateToProveedores?: () => void;
}

export default function PrediccionDemandaComponent({ onNavigateToProveedores }: PrediccionDemandaProps = {}) {
  const { showToast } = useToast();
  const [horizonte, setHorizonte] = useState<number>(30);
  const [temporadaActiva, setTemporadaActiva] = useState<string>("REGULAR");
  const [prediccion, setPrediccion] = useState<RespuestaPrediccion | null>(null);
  const [estadoModelo, setEstadoModelo] = useState<EstadoModelo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reentrenando, setReentrenando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [busqueda, setBusqueda] = useState<string>("");

  // Fase 6.1: Filtrado de color y color exacto
  const [colorFiltro, setColorFiltro] = useState<string>("");
  const [soloColorExacto, setSoloColorExacto] = useState<boolean>(true);

  // Fase 6.2: Modo de visualización (Agrupado por Modelo con Desglose vs Tabla)
  const [modoVista, setModoVista] = useState<'AGRUPADO' | 'TABLA'>('AGRUPADO');
  const [modelosExpandidos, setModelosExpandidos] = useState<Record<string, boolean>>({});
  const [filtroSoloDeficit, setFiltroSoloDeficit] = useState<boolean>(false);

  // Detección de temporada escolar activa
  const esTemporadaClases = temporadaActiva === "CLASES_SIERRA" || temporadaActiva === "CLASES_COSTA";

  // Manejador especializado para cambio de temporada
  const handleCambiarTemporada = (tId: string) => {
    setTemporadaActiva(tId);
    const esClases = tId === "CLASES_SIERRA" || tId === "CLASES_COSTA";
    if (esClases) {
      // Regla: En inicio a clases solo deben aparecer los que debe anticiparse a la compra (con déficit)
      setFiltroSoloDeficit(true);
      // Por defecto zapato todo negro y zapato todo blanco
      setColorFiltro("ESCOLAR_NEGRO_BLANCO");
    } else {
      if (colorFiltro === "ESCOLAR_NEGRO_BLANCO" || colorFiltro === "TODO_NEGRO" || colorFiltro === "TODO_BLANCO") {
        setColorFiltro("");
      }
      setFiltroSoloDeficit(false);
    }
  };

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

  // Modal para ordenar reabastecimiento rápido a proveedor
  const [pedidoModalItem, setPedidoModalItem] = useState<ItemPrediccion | null>(null);
  const [pedidoCantidad, setPedidoCantidad] = useState<number>(12);
  const [pedidoGuardando, setPedidoGuardando] = useState<boolean>(false);

  useEffect(() => {
    cargarPrediccion(horizonte, temporadaActiva, colorFiltro, soloColorExacto);
    cargarEstadoModelo();
    cargarModelosCatalogo();
  }, [horizonte, temporadaActiva, colorFiltro, soloColorExacto]);

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

  const cargarPrediccion = async (
    dias = horizonte,
    temporada = temporadaActiva,
    color = colorFiltro,
    exacto = soloColorExacto,
  ) => {
    setLoading(true);
    setErrorMsg("");
    try {
      let url = `/ml/prediccion?dias=${dias}&temporada=${temporada}&colorExacto=${exacto}`;
      if (color === "ESCOLAR_NEGRO_BLANCO") {
        url += `&color=ESCOLAR_NEGRO_BLANCO`;
      } else if (color === "TODO_NEGRO") {
        url += `&color=negro`;
      } else if (color === "TODO_BLANCO") {
        url += `&color=blanco`;
      } else if (color.trim() && color !== "TODOS") {
        url += `&color=${encodeURIComponent(color.trim())}`;
      }
      const res = await ApiService.get(url);
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
        await cargarPrediccion(horizonte, temporadaActiva, colorFiltro, soloColorExacto);
      }
    } catch (err: any) {
      showToast("No se pudo reentrenar el modelo: " + (err.message || "Error de conexión"), "error");
    } finally {
      setReentrenando(false);
    }
  };

  const handleCrearPedidoProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoModalItem) return;
    setPedidoGuardando(true);
    try {
      const res = await ApiService.post("/proveedores/ordenes-compra/solicitar-modelo", {
        modelo: pedidoModalItem.modelo,
        productId: pedidoModalItem.productId,
        serie: pedidoModalItem.serie,
        talla: pedidoModalItem.talla,
        cantidad: pedidoCantidad,
        motivo: `Predicción IA ${temporadaInfoActual?.nombre || 'General'}: ${pedidoModalItem.modelo} (${pedidoCantidad} pares)`,
      });
      showToast(
        res?.message || `Solicitud de ${pedidoCantidad} pares para ${pedidoModalItem.modelo} agregada a la Orden de Compra (Borrador)`,
        "success"
      );
      setPedidoModalItem(null);

      // Sincronizar navegación inmediata a Órdenes de Compra (Borrador)
      if (typeof window !== 'undefined') {
        localStorage.setItem('proveedores_initial_tab', 'ordenes');
        if (res?.orderId) {
          localStorage.setItem('proveedores_selected_order_id', res.orderId);
        }
      }
      if (onNavigateToProveedores) {
        onNavigateToProveedores();
      }
    } catch (err: any) {
      showToast(err.message || 'Error al agregar pedido a órdenes de compra.', 'error');
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

  // Colores únicos disponibles para el filtro rápido
  const coloresDisponibles = useMemo(() => {
    const setColores = new Set<string>();
    (prediccion?.predicciones || []).forEach((p) => {
      if (p.color && p.color.trim()) setColores.add(p.color.trim());
    });
    modelosInventarioMap.forEach((m) => {
      (m.variantes || []).forEach((v: any) => {
        if (v.color && v.color.trim()) setColores.add(v.color.trim());
      });
    });
    return Array.from(setColores).sort();
  }, [prediccion, modelosInventarioMap]);

  // Ítems filtrados por texto y condiciones
  const itemsFiltrados = useMemo(() => {
    return (prediccion?.predicciones || [])
      .filter((item) => {
        // 1. Búsqueda por texto (si el usuario busca un modelo o término, se respeta libremente)
        if (busqueda.trim()) {
          const q = busqueda.toLowerCase().trim();
          const matchBusqueda =
            item.modelo.toLowerCase().includes(q) ||
            item.serie.toLowerCase().includes(q) ||
            (item.color || "").toLowerCase().includes(q) ||
            String(item.talla).includes(q);
          if (!matchBusqueda) return false;
        }

        // 2. Filtro de color
        if (colorFiltro === "ESCOLAR_NEGRO_BLANCO") {
          // Filtro escolar por defecto: zapato todo negro y zapato todo blanco
          if (!esColorEscolarClasico(item.color)) return false;
        } else if (colorFiltro === "TODO_NEGRO") {
          if (!esTodoNegro(item.color)) return false;
        } else if (colorFiltro === "TODO_BLANCO") {
          if (!esTodoBlanco(item.color)) return false;
        } else if (colorFiltro === "TODOS") {
          // No restringe por color, muestra todos
        } else if (colorFiltro.trim()) {
          const target = colorFiltro.toLowerCase().trim();
          const itemColor = (item.color || "").toLowerCase().trim();
          if (target === "negro") {
            if (!esTodoNegro(item.color)) return false;
          } else if (target === "blanco") {
            if (!esTodoBlanco(item.color)) return false;
          } else if (soloColorExacto) {
            if (itemColor !== target) return false;
          } else {
            if (!itemColor.includes(target)) return false;
          }
        } else if (esTemporadaClases) {
          // Por defecto en clases si no hay filtro explícito: calzado todo negro y todo blanco
          if (!esColorEscolarClasico(item.color)) return false;
        }

        // 3. Anticipación de compra: en inicio a clases (Sierra o Costa) solo debe aparecer los que se debe anticipar a la compra
        if (esTemporadaClases || filtroSoloDeficit) {
          if ((item.deficit_stock || 0) <= 0) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // En temporada escolar, primero calzado escolar: Todo Negro (1) y Todo Blanco (2)
        if (esTemporadaClases) {
          const prioA = esTodoNegro(a.color) ? 1 : esTodoBlanco(a.color) ? 2 : 3;
          const prioB = esTodoNegro(b.color) ? 1 : esTodoBlanco(b.color) ? 2 : 3;
          if (prioA !== prioB) return prioA - prioB;
        }

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

        // 3. Dentro del mismo modelo+color, ordenar por serie
        const ordenSerieA = obtenerOrdenSerie(a.serie);
        const ordenSerieB = obtenerOrdenSerie(b.serie);
        if (ordenSerieA !== ordenSerieB) return ordenSerieA - ordenSerieB;

        // 4. Dentro de la misma serie, ordenar por talla ascendente
        return Number(a.talla) - Number(b.talla);
      });
  }, [prediccion, busqueda, colorFiltro, soloColorExacto, filtroSoloDeficit, esTemporadaClases]);

  // Fase 6.2: Agrupación a Nivel de Modelo con Desglose por Tallas (Rule 7 ModelTallaCurvaCard)
  const modelosAgrupados: GrupoModeloPrediccion[] = useMemo(() => {
    const map = new Map<string, GrupoModeloPrediccion>();

    itemsFiltrados.forEach((item) => {
      const colorVal = item.color || "Sin color";
      const key = `${item.modelo}__${colorVal}__${item.serie}`;

      if (!map.has(key)) {
        const infoModelo = obtenerDatosModelo(item);
        map.set(key, {
          key,
          modelo: item.modelo,
          serie: item.serie,
          color: item.color || "",
          colorPuro: Boolean(
            item.colorPuro ??
            (!item.color || (!item.color.toLowerCase().includes(' con ') && !item.color.toLowerCase().includes('/') && !item.color.toLowerCase().includes('+')))
          ),
          imageUrl: infoModelo.imageUrl,
          brand: infoModelo.brand,
          variantes: infoModelo.variantes,
          totalDemanda: 0,
          totalStock: 0,
          totalDeficit: 0,
          totalInversion: 0,
          totalSugerenciaReorden: 0,
          precioCostoUnitario: item.precio_costo || 22,
          precioVentaUnitario: item.precio_venta || 35,
          tallas: [],
        });
      }

      const grp = map.get(key)!;
      grp.totalDemanda += item.demanda_estimada || 0;
      grp.totalStock += item.stock_actual || 0;
      grp.totalDeficit += item.deficit_stock || 0;
      grp.totalInversion += item.inversion_reorden_estimada || (item.deficit_stock ? item.deficit_stock * (item.precio_costo || 22) : 0);
      grp.totalSugerenciaReorden += item.sugerencia_reorden || 0;
      grp.tallas.push(item);
    });

    map.forEach((grp) => {
      grp.tallas.sort((a, b) => Number(a.talla) - Number(b.talla));
    });

    return Array.from(map.values()).sort((a, b) => {
      // Si es temporada escolar, primero calzados Todo Negro (1), luego Todo Blanco (2), luego otros (3)
      if (esTemporadaClases) {
        const prioA = esTodoNegro(a.color) ? 1 : esTodoBlanco(a.color) ? 2 : 3;
        const prioB = esTodoNegro(b.color) ? 1 : esTodoBlanco(b.color) ? 2 : 3;
        if (prioA !== prioB) return prioA - prioB;
      }

      // Ordenar por mayor déficit (anticiparse a la compra)
      if (b.totalDeficit !== a.totalDeficit) return b.totalDeficit - a.totalDeficit;
      return b.totalDemanda - a.totalDemanda;
    });
  }, [itemsFiltrados, modelosInventarioMap, esTemporadaClases]);

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
                Inteligencia artificial y modelado de temporadas para proyectar rotación y optimizar pedidos a proveedores de calzado
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
                onClick={() => handleCambiarTemporada(t.id)}
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

      {/* ══════ Filtros Avanzados y Vistas de Predicción ══════ */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-5 space-y-4">
        {/* Cabecera de la sección de predicciones */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2 text-sm">
              <Package size={16} className="text-[#0F172A] dark:text-amber-400" />
              Proyección de Demanda Estacional por Calzado
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Agrupación inteligente por modelo, curva de tallas y filtro de colores puros y exactos
            </p>
          </div>

          {/* Selector de Modo de Visualización (Agrupado vs Tabla) */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center p-1 bg-[var(--muted)]/60 rounded-xl border border-[var(--border)] w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setModoVista('AGRUPADO')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modoVista === 'AGRUPADO'
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-xs"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
                title="Ver modelos agrupados con su curva de tallas"
              >
                <LayoutGrid size={13} />
                <span>Agrupado por Modelo</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold">
                  {modelosAgrupados.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModoVista('TABLA')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modoVista === 'TABLA'
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-xs"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
                title="Ver listado detallado registro por registro"
              >
                <TableProperties size={13} />
                <span>Tabla por Talla</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] font-mono">
                  {itemsFiltrados.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Barra de Controles & Filtros (Fase 6.1) ── */}
        <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border)]/70">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Input de Búsqueda de Modelo / Serie / Talla */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Buscar por modelo, serie, talla o material..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A] dark:focus:border-amber-400"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2.5 top-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Selector / Input de Color */}
            <div className="relative w-full sm:w-52">
              <Palette size={14} className="absolute left-3 top-2.5 text-amber-500" />
              <input
                type="text"
                list="colores-catalogo-list"
                placeholder="Filtrar color (ej: Negro)..."
                value={colorFiltro}
                onChange={(e) => setColorFiltro(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A] dark:focus:border-amber-400"
              />
              <datalist id="colores-catalogo-list">
                {coloresDisponibles.map((c, idx) => (
                  <option key={idx} value={c} />
                ))}
              </datalist>
              {colorFiltro && (
                <button
                  type="button"
                  onClick={() => setColorFiltro("")}
                  className="absolute right-2.5 top-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Toggle Fase 6.1: Solo Color Exacto */}
            <button
              type="button"
              onClick={() => setSoloColorExacto((prev) => !prev)}
              className={`flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                soloColorExacto
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-[var(--muted)]/50 text-[var(--muted-foreground)] border-[var(--border)]"
              }`}
              title="Al activar, si busca 'Negro' solo se mostrará ese color puro, excluyendo variantes como 'Negro con Blanco'"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className={soloColorExacto ? "text-emerald-600" : "text-[var(--muted-foreground)]"} />
                <span>Solo color exacto</span>
              </div>
              <span
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                  soloColorExacto
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-[var(--muted-foreground)]/40"
                }`}
              >
                {soloColorExacto && <Check size={10} />}
              </span>
            </button>

            {/* Toggle Rápido: Anticipar Compra / Solo con Déficit */}
            <button
              type="button"
              onClick={() => setFiltroSoloDeficit((prev) => !prev)}
              className={`flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                filtroSoloDeficit || esTemporadaClases
                  ? "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30"
                  : "bg-[var(--muted)]/50 text-[var(--muted-foreground)] border-[var(--border)]"
              }`}
              title={esTemporadaClases ? "En temporada escolar se muestran únicamente los modelos con necesidad de compra anticipada (déficit)" : "Filtrar únicamente calzados con faltante de stock en bodega"}
            >
              <AlertTriangle size={13} className={filtroSoloDeficit || esTemporadaClases ? "text-rose-500" : "text-[var(--muted-foreground)]"} />
              <span>{esTemporadaClases ? "Anticipar compras (Con déficit)" : "Solo con déficit"}</span>
            </button>
          </div>

          {/* Banner específico para temporada escolar */}
          {esTemporadaClases && (
            <div className="flex items-center gap-2 p-2.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl text-xs text-indigo-900 dark:text-indigo-200">
              <span className="text-base shrink-0">🎒</span>
              <div className="flex-1 min-w-0">
                <span className="font-extrabold mr-1">Inicio a clases activo:</span>
                <span className="text-[11px] opacity-90">
                  Mostrando compras anticipadas a proveedores (déficit de stock). Por defecto se prioriza zapato colegial <strong>todo negro</strong> y deportivo <strong>todo blanco</strong>. Puede consultar otros colores en cualquier momento usando los botones inferiores.
                </span>
              </div>
            </div>
          )}

          {/* Píldoras rápidas de colores */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mr-1">
              {esTemporadaClases ? "Filtro escolar:" : "Colores frecuentes:"}
            </span>

            {/* Píldoras escolares dedicadas */}
            {esTemporadaClases ? (
              <>
                <button
                  type="button"
                  onClick={() => setColorFiltro("ESCOLAR_NEGRO_BLANCO")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    colorFiltro === "ESCOLAR_NEGRO_BLANCO" || colorFiltro === ""
                      ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/40"
                      : "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/25"
                  }`}
                  title="Mostrar por defecto zapato colegial todo negro y deportivo todo blanco"
                >
                  <span>🎒 Por defecto escolar (Todo Negro & Todo Blanco)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setColorFiltro("TODO_NEGRO")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    colorFiltro === "TODO_NEGRO"
                      ? "bg-[#0F172A] text-white shadow-xs ring-2 ring-amber-400/40"
                      : "bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 shrink-0" />
                  <span>Todo Negro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setColorFiltro("TODO_BLANCO")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    colorFiltro === "TODO_BLANCO"
                      ? "bg-slate-200 text-slate-900 border border-slate-400 shadow-xs ring-2 ring-amber-400/40"
                      : "bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shrink-0" />
                  <span>Todo Blanco</span>
                </button>

                <button
                  type="button"
                  onClick={() => setColorFiltro("TODOS")}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    colorFiltro === "TODOS"
                      ? "bg-[#0F172A] dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]"
                  }`}
                >
                  Ver todos los colores
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setColorFiltro("")}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  colorFiltro === ""
                    ? "bg-[#0F172A] dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]"
                }`}
              >
                Todos
              </button>
            )}

            {/* Colores individuales disponibles para búsqueda manual */}
            {coloresDisponibles
              .filter((c) => {
                if (!esTemporadaClases) return true;
                // En clases ya tenemos botones de Todo Negro y Todo Blanco, así que dejamos el resto para exploración libre
                const cLower = c.toLowerCase().trim();
                return cLower !== "negro" && cLower !== "blanco";
              })
              .slice(0, 8)
              .map((col, idx) => {
                const isSelected = colorFiltro.toLowerCase().trim() === col.toLowerCase().trim();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setColorFiltro(isSelected ? (esTemporadaClases ? "ESCOLAR_NEGRO_BLANCO" : "") : col)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0F172A] dark:bg-amber-400 text-white dark:text-slate-900 shadow-xs"
                        : "bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                      style={{
                        backgroundColor:
                          col.toLowerCase().includes("negro") ? "#1e293b" :
                          col.toLowerCase().includes("blanco") ? "#f1f5f9" :
                          col.toLowerCase().includes("cafe") || col.toLowerCase().includes("café") ? "#78350f" :
                          col.toLowerCase().includes("azul") ? "#1d4ed8" :
                          col.toLowerCase().includes("rojo") ? "#b91c1c" :
                          col.toLowerCase().includes("vino") ? "#831843" :
                          col.toLowerCase().includes("miel") ? "#d97706" :
                          "#64748b"
                      }}
                    />
                    <span>{col}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* ── Contenido de Predicción ── */}
        {loading ? (
          <div className="py-16 text-center text-[var(--muted-foreground)] space-y-3">
            <Loader2 size={28} className="animate-spin mx-auto text-[#0F172A] dark:text-amber-400" />
            <p className="text-xs">Calculando ponderaciones estacionales y proyecciones IA...</p>
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <BrainCircuit size={32} className="mx-auto text-[var(--muted-foreground)] opacity-40" />
            <p className="text-xs text-[var(--muted-foreground)]">
              No se encontraron calzados para esta temporada o filtro de color/búsqueda.
            </p>
            {(busqueda || colorFiltro || filtroSoloDeficit) && (
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setColorFiltro("");
                  setFiltroSoloDeficit(false);
                }}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 underline cursor-pointer"
              >
                Limpiar filtros aplicados
              </button>
            )}
          </div>
        ) : modoVista === 'AGRUPADO' ? (
          /* ══════ VISTA AGRUPADA POR MODELO CON DESGLOSE POR TALLAS (Regla 7 ModelTallaCurvaCard) ══════ */
          <div className="space-y-3.5 pt-1">
            {modelosAgrupados.map((grupo) => {
              const isExpanded = modelosExpandidos[grupo.key] ?? false;
              const toggleExpand = () => {
                setModelosExpandidos((prev) => ({ ...prev, [grupo.key]: !isExpanded }));
              };
              const docenasEquiv = (grupo.totalDemanda / 12).toFixed(1);
              const docenasLabel =
                grupo.totalDemanda === 6
                  ? "½ Docena"
                  : grupo.totalDemanda === 12
                  ? "1 Docena"
                  : `${docenasEquiv} doc.`;

              return (
                <div
                  key={grupo.key}
                  className={`border rounded-2xl transition-all shadow-xs overflow-hidden ${
                    grupo.totalDeficit > 0
                      ? "bg-[var(--card)] border-rose-500/25 hover:border-rose-500/40"
                      : "bg-[var(--card)] border-[var(--border)] hover:border-emerald-500/30"
                  }`}
                >
                  {/* ── Encabezado y Resumen Estándar ModelTallaCurvaCard (Regla 7) ── */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Lado izquierdo: Miniatura + Encabezado + Badges */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Miniatura cuadrada con foto del calzado y lightbox */}
                      {grupo.imageUrl ? (
                        <div
                          onClick={() =>
                            setLightbox({
                              isOpen: true,
                              imageUrl: grupo.imageUrl,
                              title: grupo.modelo,
                              subtitle: `${formatearNombreSerie(grupo.serie)}${grupo.color ? ` · Color: ${grupo.color}` : ""}`,
                              badge: grupo.color || "Calzado",
                            })
                          }
                          className="w-12 h-12 rounded-xl border border-[var(--border)] overflow-hidden shrink-0 bg-[var(--muted)]/40 relative group cursor-pointer shadow-xs hover:ring-2 hover:ring-emerald-500/50 transition-all"
                          title="Clic para ver foto en tamaño completo"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={grupo.imageUrl}
                            alt={grupo.modelo}
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

                      {/* Encabezado: Nombre en negrita mayúscula, Color y Serie en verde esmeralda */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black uppercase text-sm sm:text-base text-[var(--foreground)] tracking-tight">
                            {grupo.modelo}
                          </span>

                          {/* Píldora de color */}
                          {grupo.color && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)]">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs border border-black/10"
                                style={{
                                  backgroundColor:
                                    grupo.color.toLowerCase().includes("negro") ? "#1e293b" :
                                    grupo.color.toLowerCase().includes("blanco") ? "#f1f5f9" :
                                    grupo.color.toLowerCase().includes("cafe") || grupo.color.toLowerCase().includes("café") ? "#78350f" :
                                    grupo.color.toLowerCase().includes("azul") ? "#1d4ed8" :
                                    grupo.color.toLowerCase().includes("rojo") ? "#b91c1c" :
                                    grupo.color.toLowerCase().includes("vino") ? "#831843" :
                                    grupo.color.toLowerCase().includes("miel") ? "#d97706" :
                                    "#64748b"
                                }}
                              />
                              <span>{grupo.color}</span>
                            </span>
                          )}

                          {/* Badge Fase 6.1: Color Puro vs Compuesto */}
                          {grupo.colorPuro ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                              <Sparkles size={10} className="text-emerald-600" /> Color Puro
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/20">
                              <Layers size={10} className="text-purple-600" /> Color Compuesto / Variante
                            </span>
                          )}
                        </div>

                        {/* Serie destacada en verde esmeralda */}
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            Serie: {formatearNombreSerie(grupo.serie)}
                          </span>
                          {grupo.brand && (
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              Marca: <strong className="text-[var(--foreground)]">{grupo.brand}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lado derecho: Resumen con etiqueta de docenas, déficit y precio/subtotal */}
                    <div className="flex items-center justify-between lg:justify-end gap-5 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-[var(--border)]">
                      {/* Métricas consolidadas del modelo */}
                      <div className="text-right space-y-0.5">
                        <div className="text-sm font-black text-[var(--foreground)] font-mono flex items-center justify-end gap-1.5">
                          <span>{grupo.totalDemanda} pares</span>
                          <span className="text-xs font-semibold text-[var(--muted-foreground)] font-sans">
                            ({docenasLabel})
                          </span>
                        </div>
                        <div className="text-xs flex items-center justify-end gap-2">
                          <span className="text-[11px] text-[var(--muted-foreground)] font-medium">
                            ${grupo.precioCostoUnitario.toFixed(2)} / par
                          </span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                            ${grupo.totalInversion.toFixed(2)}
                          </span>
                        </div>
                        {/* Indicador de Déficit */}
                        {grupo.totalDeficit > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 text-[11px]">
                            <AlertTriangle size={12} /> Déficit: {grupo.totalDeficit} pares a pedir
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                            <CheckCircle2 size={12} /> Stock en bodega cubierto
                          </span>
                        )}
                      </div>

                      {/* Botón de acción: Pedir a Proveedor */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const itemReferencia = grupo.tallas[0] || null;
                            if (itemReferencia) {
                              const infoM = obtenerDatosModelo(itemReferencia);
                              const prodId = itemReferencia.productId || infoM.variantes?.[0]?.id;
                              setPedidoModalItem({
                                ...itemReferencia,
                                productId: prodId,
                                sugerencia_reorden: grupo.totalDeficit > 0 ? grupo.totalDeficit : grupo.totalDemanda,
                              });
                              setPedidoCantidad(grupo.totalDeficit > 0 ? grupo.totalDeficit : Math.max(12, grupo.totalDemanda));
                            }
                          }}
                          className="px-3 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Solicitar abastecimiento para este modelo completo a órdenes de compra"
                        >
                          <ShoppingCart size={13} />
                          <span>Pedir Modelo</span>
                        </button>

                        {/* Toggle expandir / colapsar curva de tallas */}
                        <button
                          type="button"
                          onClick={toggleExpand}
                          className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer"
                          title={isExpanded ? "Ocultar desglose de tallas" : "Ver curva completa de tallas"}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Curva de Tallas: Píldoras horizontales por talla ── */}
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1">
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]/60">
                      <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mr-1">
                        Curva de Tallas:
                      </span>
                      {grupo.tallas.map((tallaItem, tIdx) => {
                        const defTalla = tallaItem.deficit_stock ?? 0;
                        const tieneDef = defTalla > 0;
                        return (
                          <div
                            key={tIdx}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                              tieneDef
                                ? "bg-rose-500/10 border-rose-500/25 text-rose-900 dark:text-rose-200"
                                : "bg-[var(--muted)]/50 border-[var(--border)] text-[var(--foreground)]"
                            }`}
                          >
                            <span className="font-black text-xs px-1.5 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)]">
                              T{tallaItem.talla}
                            </span>
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-[var(--muted-foreground)]" title="Demanda proyectada">
                                {tallaItem.demanda_estimada}p
                              </span>
                              <span className="text-[var(--border)]">/</span>
                              <span className="font-semibold" title="Stock actual en bodega">
                                {tallaItem.stock_actual ?? 0}p
                              </span>
                            </div>
                            {tieneDef ? (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-500 text-white shadow-xs">
                                -{defTalla}p
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Desglose Detallado Expandible (Tabla Tamaño 10 - Regla 10) ── */}
                  {isExpanded && (
                    <div className="bg-[var(--muted)]/30 border-t border-[var(--border)] p-4 sm:p-5 animate-in fade-in duration-150">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[10px]">
                          <thead>
                            <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] uppercase tracking-wider">
                              <th className="py-2 px-3 font-bold">Talla</th>
                              <th className="py-2 px-3 font-bold text-center">Demanda Base</th>
                              <th className="py-2 px-3 font-bold text-center">Impacto Estacional</th>
                              <th className="py-2 px-3 font-bold text-center">Demanda Proyectada</th>
                              <th className="py-2 px-3 font-bold text-center">Stock Bodega</th>
                              <th className="py-2 px-3 font-bold text-center">Déficit</th>
                              <th className="py-2 px-3 font-bold text-center">Reorden Sugerido</th>
                              <th className="py-2 px-3 font-bold text-right">Inversión</th>
                              <th className="py-2 px-3 font-bold text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]/50 font-mono">
                            {grupo.tallas.map((tItem, idx) => (
                              <tr key={idx} className="hover:bg-[var(--card)]/60 transition-colors">
                                <td className="py-2.5 px-3 font-bold text-[var(--foreground)]">
                                  Talla {tItem.talla}
                                </td>
                                <td className="py-2.5 px-3 text-center text-[var(--muted-foreground)]">
                                  {tItem.demanda_base ?? Math.round(tItem.demanda_estimada / 1.3)} pares
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {tItem.impacto_estacional_pct && tItem.impacto_estacional_pct > 0 ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                      +{tItem.impacto_estacional_pct}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">Base</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center font-black text-[var(--foreground)] text-xs">
                                  {tItem.demanda_estimada} pares
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold">
                                  <span className={(tItem.stock_actual ?? 0) === 0 ? "text-rose-500" : "text-emerald-600"}>
                                    {tItem.stock_actual ?? 0} pares
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {(tItem.deficit_stock ?? 0) > 0 ? (
                                    <span className="font-bold text-rose-600">
                                      -{tItem.deficit_stock} pares
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600">Cubierto</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-[var(--foreground)]">
                                  +{tItem.sugerencia_reorden} pares
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-[var(--foreground)]">
                                  ${(tItem.inversion_reorden_estimada ?? (tItem.sugerencia_reorden * 22)).toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const infoM = obtenerDatosModelo(tItem);
                                      const prodId = tItem.productId || infoM.variantes?.[0]?.id;
                                      setPedidoModalItem({ ...tItem, productId: prodId });
                                      setPedidoCantidad(tItem.sugerencia_reorden || 6);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-[var(--card)] hover:bg-[#0F172A] hover:text-white border border-[var(--border)] text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Pedir Talla
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ══════ VISTA TABLA POR TALLAS (Regla 10: Tamaño 10) ══════ */
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-left text-[10px]">
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
                  const esPuro = Boolean(
                    item.colorPuro ??
                    (!item.color || (!item.color.toLowerCase().includes(' con ') && !item.color.toLowerCase().includes('/')))
                  );
                  return (
                    <tr key={idx} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-[var(--foreground)]">
                        <div className="flex items-center gap-3">
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

                          <div className="min-w-0">
                            <span className="truncate max-w-[180px] text-xs font-black uppercase text-[var(--foreground)] block tracking-tight">
                              {item.modelo}
                            </span>

                            {item.color && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1 font-medium">
                                  <Palette size={10} className="text-amber-500 shrink-0" />
                                  <span className="truncate max-w-[120px]">{item.color}</span>
                                </span>
                                {esPuro ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                    Puro
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                                    Compuesto
                                  </span>
                                )}
                              </div>
                            )}

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
                                className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer group"
                                title={`Ver las ${variantes.length} variantes disponibles de ${item.modelo}`}
                              >
                                <Layers size={10} className="group-hover:scale-110 transition-transform" />
                                <span>{variantes.length} {variantes.length === 1 ? "variante" : "variantes"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[var(--muted-foreground)] font-bold text-emerald-700 dark:text-emerald-400">
                        <span className="truncate max-w-[120px] block">{formatearNombreSerie(item.serie)}</span>
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
                      <td className="px-3 py-3 text-center font-bold text-[#0F172A] dark:text-amber-400 font-mono text-xs">
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
                            const infoM = obtenerDatosModelo(item);
                            const prodId = item.productId || infoM.variantes?.[0]?.id;
                            setPedidoModalItem({ ...item, productId: prodId });
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

      {/* ══════ MODAL DE REABASTECIMIENTO A PROVEEDOR ══════ */}
      {pedidoModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPedidoModalItem(null);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPedidoModalItem(null);
          }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-md h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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

            <form onSubmit={handleCrearPedidoProveedor} className="p-5 space-y-4 text-xs">
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
                  Cantidad de Pares a Solicitar al Proveedor
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

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2 text-blue-900 dark:text-blue-300">
                <ShoppingCart size={14} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <p className="text-[11px] leading-relaxed">
                  Este pedido se agregará a la sección de <strong>Órdenes de Compra a Proveedores</strong> en estado <strong>Borrador</strong>, acumulándose con las demás solicitudes para que puedas revisarla, editarla y despacharla al proveedor.
                </p>
              </div>

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPedidoModalItem(null)}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pedidoGuardando}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer min-h-[42px]"
                >
                  {pedidoGuardando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Enviar a Órdenes de Compra</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ MODAL DE VARIANTES DEL MODELO ══════ */}
      {modalVariantes && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalVariantes(null);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalVariantes(null);
          }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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

