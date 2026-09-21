"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../db/local-db";
import { ApiService } from "../services/api.service";
import UnsavedChangesModal from "./ui/unsaved-changes-modal";
import {
  Search, Loader2, Package, TrendingUp, TrendingDown,
  RefreshCw, AlertTriangle, X, CheckCircle, AlertCircle, ImageIcon,
  ArrowRightLeft, Building2, ChevronDown, ChevronUp, Palette
} from "lucide-react";

interface InventarioProps {
  online: boolean;
  userRole?: string;
  activeSucursalId?: string;
  sucursales?: { id: string; name: string; isMatriz: boolean }[];
}

interface Talla {
  id: string;
  nombre?: string;
  numero?: number;
  stock: number;
  cantidad?: number;
  disponible?: number;
  stockMinimo: number;
  stockReservado: number;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  material?: string;
  color?: string;
  fotoUrl?: string;
  precioCosto: number;
  precioVenta: number;
  serie?: { id?: string; nombre: string };
  tallas: Talla[];
  tenantId?: string;
  sucursalNombre?: string;
}

interface ModeloAgrupadoInventario {
  id: string;
  name: string;
  brand: string;
  baseCode: string;
  material?: string;
  fotoUrl?: string;
  sucursalNombre?: string;
  products: Producto[];
}

const INPUT = "w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] transition-colors";

const SERIES_NOMBRES: Record<string, string> = {
  ADULTO: "adulto (38-43)",
  JUVENIL: "juvenil (34-38)",
  NINO: "junior (27-32)",
  NINO_PEQUENO_A: "niño (21-26)",
  BEBE: "bebe (18-20)",
  TALLA_GRANDE: "Adulto Grande (43-45)"
};

const getNombreSerie = (s: any, tallas?: any[]): string => {
  if (!s) return "—";
  const nombre = typeof s === "string" ? s : s?.nombre;
  if (!nombre) return "—";

  if (tallas && tallas.length > 0) {
    const nums = tallas
      .map(t => Number(t.numero ?? t.nombre))
      .filter(n => !isNaN(n) && n > 0);
    if (nums.length > 0) {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const nombreClean = nombre.toLowerCase().replace(/_/g, " ");
      return `${nombreClean} (${min}-${max})`;
    }
  }

  return SERIES_NOMBRES[nombre] || nombre.toLowerCase().replace(/_/g, " ");
};

function getDocenaLabel(pares: number): string {
  if (pares === 6) return '½ Docena';
  if (pares === 12) return '1 Docena';
  if (pares > 0 && pares % 12 === 0) return `${pares / 12} Docenas`;
  if (pares > 0 && pares % 6 === 0) return `${(pares / 12).toFixed(1)} Docenas`;
  return `${(pares / 12).toFixed(1)} Doc.`;
}

function Lbl({ t, req }: { t: string; req?: boolean }) {
  return (
    <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
      {t}{req && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

export default function InventarioComponent({ online, userRole, activeSucursalId, sucursales }: InventarioProps) {
  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");

  // Estado de acordeones expandidos por modelo y color activo seleccionado
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
  const [selectedColorForModel, setSelectedColorForModel] = useState<Record<string, string>>({});

  // Modal movimiento (Entrada / Salida)
  const [showMovModal, setShowMovModal] = useState(false);
  const [movType, setMovType] = useState<"entrada" | "salida">("entrada");
  const [movProd, setMovProd] = useState<Producto | null>(null);
  const [movTallaId, setMovTallaId] = useState("");
  const [movCantidad, setMovCantidad] = useState("1");
  const [movMotivo, setMovMotivo] = useState("");
  const [movError, setMovError] = useState("");
  const [movSaving, setMovSaving] = useState(false);

  // Modal transferencia inter-sucursal
  const [showTransfModal, setShowTransfModal] = useState(false);
  const [transfProd, setTransfProd] = useState<Producto | null>(null);
  const [transfDestinoId, setTransfDestinoId] = useState("");
  const [transfFormato, setTransfFormato] = useState<"suelto" | "serie">("suelto");
  const [transfMultiplicador, setTransfMultiplicador] = useState<number>(1);
  const [transfLoteCantidades, setTransfLoteCantidades] = useState<Record<string, number>>({});
  const [transfMotivo, setTransfMotivo] = useState("");
  const [transfError, setTransfError] = useState("");
  const [transfSaving, setTransfSaving] = useState(false);

  // Multiformato (Pares Sueltos vs Serie Completa)
  const [ingresoFormato, setIngresoFormato] = useState<"suelto" | "serie">("suelto");
  const [serieMultiplicador, setSerieMultiplicador] = useState<number>(1);
  const [loteCantidades, setLoteCantidades] = useState<Record<string, number>>({});

  // Control de descartes y cierre seguro de modales
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const pendingCloseRef = useRef<(() => void) | null>(null);

  const safeDismiss = useCallback((closeFn: () => void, isDirty: boolean) => {
    if (isDirty) {
      pendingCloseRef.current = closeFn;
      setShowDiscardModal(true);
    } else {
      closeFn();
    }
  }, []);

  const isDirtyMov = useCallback(() => {
    return showMovModal && (movMotivo.trim() !== "" || movCantidad !== "1" || Object.keys(loteCantidades).length > 0);
  }, [showMovModal, movMotivo, movCantidad, loteCantidades]);

  const isDirtyTransf = useCallback(() => {
    return showTransfModal && (transfDestinoId !== "" || transfMotivo.trim() !== "" || Object.keys(transfLoteCantidades).length > 0);
  }, [showTransfModal, transfDestinoId, transfMotivo, transfLoteCantidades]);

  // Manejador global de la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDiscardModal) return;
      if (showTransfModal) {
        e.preventDefault();
        safeDismiss(() => setShowTransfModal(false), isDirtyTransf());
        return;
      }
      if (showMovModal) {
        e.preventDefault();
        safeDismiss(() => setShowMovModal(false), isDirtyMov());
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDiscardModal, showTransfModal, showMovModal, safeDismiss, isDirtyTransf, isDirtyMov]);

  const isAdmin = !userRole || userRole === "ROL_ADMIN";
  const isBodeguero = userRole === "ROL_BODEGUERO";
  const canMove = isAdmin || isBodeguero;

  useEffect(() => { loadProducts(); }, [online, activeSucursalId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      if (online) {
        const data = await ApiService.get("/inventario/productos");
        const arr = Array.isArray(data) ? data : [];
        setProducts(arr);
        await db.productos.clear();
        await db.productos.bulkAdd(arr);
      } else {
        const local = await db.productos.toArray();
        setProducts(local as any);
      }
    } catch (e) {
      console.error("Error al cargar productos:", e);
      const local = await db.productos.toArray();
      setProducts(local as any);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandModel = (modelId: string) => {
    setExpandedModels(prev => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  const openMovimiento = (p: Producto, tipo: "entrada" | "salida") => {
    setMovProd(p);
    setMovType(tipo);
    setIngresoFormato("suelto");
    setMovTallaId(p.tallas?.[0]?.id || "");
    setMovCantidad("1");
    setMovMotivo("");
    setMovError("");
    setSerieMultiplicador(1);

    const initialLote: Record<string, number> = {};
    if (p.tallas && p.tallas.length > 0) {
      p.tallas.forEach((t) => {
        initialLote[t.id] = 0;
      });
    }
    setLoteCantidades(initialLote);
    setShowMovModal(true);
  };

  const aplicarPresetSerie = (mult: number) => {
    setSerieMultiplicador(mult);
    if (!movProd || !movProd.tallas || movProd.tallas.length === 0) return;
    const paresPorTalla = Math.max(1, Math.round((12 * mult) / movProd.tallas.length));
    const newLote: Record<string, number> = {};
    movProd.tallas.forEach((t) => {
      newLote[t.id] = paresPorTalla;
    });
    setLoteCantidades(newLote);
  };

  const handleMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movProd) return;
    setMovError("");

    if (!movMotivo.trim()) {
      setMovError("Ingresa el motivo del movimiento.");
      return;
    }

    setMovSaving(true);
    try {
      if (movType === "entrada") {
        const items = Object.entries(loteCantidades)
          .map(([tallaId, cant]) => ({ tallaId, cantidad: Number(cant) || 0 }))
          .filter((i) => i.cantidad > 0);

        if (items.length === 0) {
          setMovError("Ingresa al menos 1 par en alguna talla.");
          setMovSaving(false);
          return;
        }

        await ApiService.post(`/inventario/productos/${movProd.id}/entrada-lote`, {
          items,
          motivo: movMotivo.trim(),
        });

        const totalPares = items.reduce((s, i) => s + i.cantidad, 0);
        setSuccess(`Entrada de mercancía (${totalPares} pares) registrada correctamente.`);
      } else {
        if (!movTallaId || !movCantidad || parseInt(movCantidad) <= 0) {
          setMovError("Selecciona una talla y una cantidad mayor a cero.");
          setMovSaving(false);
          return;
        }
        await ApiService.post(`/inventario/productos/${movProd.id}/salida`, {
          tallaId: movTallaId,
          cantidad: parseInt(movCantidad),
          motivo: movMotivo.trim(),
        });
        setSuccess(`Salida de stock registrada correctamente.`);
      }

      setShowMovModal(false);
      setMovProd(null);
      loadProducts();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setMovError(err.message || "Error al registrar movimiento.");
    } finally {
      setMovSaving(false);
    }
  };

  const openTransferencia = (p: Producto) => {
    setTransfProd(p);
    setTransfFormato("suelto");
    setTransfMultiplicador(1);
    const otrasSucursales = (sucursales || []).filter(s => s.id !== activeSucursalId);
    setTransfDestinoId(otrasSucursales[0]?.id || "");
    setTransfMotivo("Despacho para exhibición y venta en mostrador");
    setTransfError("");
    
    const initialLote: Record<string, number> = {};
    if (p.tallas && p.tallas.length > 0) {
      p.tallas.forEach((t) => {
        initialLote[t.id] = 0;
      });
    }
    setTransfLoteCantidades(initialLote);
    setShowTransfModal(true);
  };

  const aplicarPresetTransfSerie = (mult: number) => {
    setTransfMultiplicador(mult);
    if (!transfProd || !transfProd.tallas || transfProd.tallas.length === 0) return;
    const paresPorTalla = Math.max(1, Math.round((12 * mult) / transfProd.tallas.length));
    const newLote: Record<string, number> = {};
    transfProd.tallas.forEach((t) => {
      const stockDisp = t.stock ?? t.cantidad ?? t.disponible ?? 0;
      newLote[t.id] = Math.min(stockDisp, paresPorTalla);
    });
    setTransfLoteCantidades(newLote);
  };

  const handleTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transfProd) return;
    setTransfError("");

    if (!transfDestinoId) {
      setTransfError("Selecciona la sucursal de destino.");
      return;
    }

    const items = Object.entries(transfLoteCantidades)
      .map(([tallaId, cant]) => ({ tallaId, cantidad: Number(cant) || 0 }))
      .filter((i) => i.cantidad > 0);

    if (items.length === 0) {
      setTransfError("Ingresa al menos 1 par en alguna talla para despachar.");
      return;
    }

    // Validar stock disponible en origen
    for (const item of items) {
      const tallaObj = transfProd.tallas?.find((t) => t.id === item.tallaId);
      const stockActual = tallaObj ? (tallaObj.stock ?? tallaObj.cantidad ?? tallaObj.disponible ?? 0) : 0;
      if (item.cantidad > stockActual) {
        setTransfError(`Stock insuficiente en Talla ${tallaObj?.nombre || tallaObj?.numero}. Solo dispones de ${stockActual} pares.`);
        return;
      }
    }

    if (!transfMotivo.trim()) {
      setTransfError("Ingresa el motivo del despacho.");
      return;
    }

    setTransfSaving(true);
    try {
      const res = await ApiService.post("/inventario/transferir-stock-lote", {
        destinoTenantId: transfDestinoId,
        productId: transfProd.id,
        items,
        motivo: transfMotivo.trim(),
      });
      const totalDespachado = items.reduce((acc, i) => acc + i.cantidad, 0);
      setSuccess(res?.message || `Despacho de ${totalDespachado} pares registrado exitosamente.`);
      setShowTransfModal(false);
      setTransfProd(null);
      loadProducts();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setTransfError(err.message || "Error al realizar el despacho inter-sucursal.");
    } finally {
      setTransfSaving(false);
    }
  };

  const stockTotal = (p: Producto) => {
    const list = p.tallas || (p as any).stockPorTalla || [];
    return Array.isArray(list) ? list.reduce((s, t) => s + (t.stock ?? t.cantidad ?? t.disponible ?? 0), 0) : 0;
  };

  const stockBajo = (p: Producto) => {
    const list = p.tallas || (p as any).stockPorTalla || [];
    const total = stockTotal(p);
    if (total <= 11) return true;
    return Array.isArray(list) && list.some(t => {
      const qty = t.stock ?? t.cantidad ?? t.disponible ?? 0;
      return qty === 0;
    });
  };

  const totalParesLote = Object.values(loteCantidades).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const totalParesTransf = Object.values(transfLoteCantidades).reduce((sum, val) => sum + (Number(val) || 0), 0);

  // Agrupar productos por Modelo
  const groupedModelos: ModeloAgrupadoInventario[] = (() => {
    const map = new Map<string, ModeloAgrupadoInventario>();

    products.forEach(p => {
      const baseCode = p.modelo || (p.codigo ? p.codigo.split('-')[0] : '') || p.nombre || 'MOD';
      const key = `${baseCode}___${p.nombre || ''}___${p.marca || ''}___${p.tenantId || ''}`;
      
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: p.nombre || p.modelo,
          brand: p.marca || '',
          baseCode: baseCode,
          material: p.material,
          fotoUrl: p.fotoUrl,
          sucursalNombre: p.sucursalNombre,
          products: [],
        });
      }
      const m = map.get(key)!;
      if (!m.fotoUrl && p.fotoUrl) {
        m.fotoUrl = p.fotoUrl;
      }
      m.products.push(p);
    });

    return Array.from(map.values());
  })();

  // Filtro de búsqueda por modelo, marca, código, color o serie
  const filteredModelos = groupedModelos.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchModel =
      m.name.toLowerCase().includes(q) ||
      m.brand.toLowerCase().includes(q) ||
      m.baseCode.toLowerCase().includes(q) ||
      (m.material && m.material.toLowerCase().includes(q));

    const matchVariant = m.products.some(p =>
      p.codigo.toLowerCase().includes(q) ||
      (p.color && p.color.toLowerCase().includes(q)) ||
      (p.serie?.nombre && p.serie.nombre.toLowerCase().includes(q))
    );

    return matchModel || matchVariant;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-[var(--foreground)]">Control de Inventario</h2>
            {activeSucursalId === 'TODAS' && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-[#0F172A]/10 dark:bg-white/10 text-[var(--foreground)] border border-[var(--border)] rounded-full">
                📍 🏢 Todas las Sucursales (Consolidado)
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] font-medium mt-0.5">Control físico de existencias por modelo, serie y talla en tiempo real</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <button onClick={loadProducts} className="p-2.5 border border-[var(--border)] rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors shrink-0 cursor-pointer">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search size={16} className="absolute left-3 top-3 text-[var(--muted-foreground)]" />
            <input type="text" placeholder="Buscar modelo, código o serie..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]" />
          </div>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl">
          <CheckCircle size={16} /> <span>{success}</span>
        </div>
      )}

      {/* Listado de Modelos Agrupados estilo Catálogo */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[#0F172A]" size={32} />
          <span className="text-sm mt-2">Cargando inventario...</span>
        </div>
      ) : filteredModelos.length === 0 ? (
        <div className="p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          No se encontraron productos en el inventario de esta sucursal.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredModelos.map((m) => {
            const modelProducts = m.products || [];
            const uniqueColors = Array.from(new Set(modelProducts.map(p => p.color || 'Único')));
            const activeColor = selectedColorForModel[m.id] || uniqueColors[0] || '';
            const activeProduct = modelProducts.find(p => (p.color || 'Único') === activeColor) || modelProducts[0];
            const isExpanded = expandedModels[m.id];
            const totalStockModelo = modelProducts.reduce((acc, p) => acc + stockTotal(p), 0);

            return (
              <div
                key={m.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all"
              >
                {/* Resumen Cabecera del Modelo */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-16 h-16 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                      {activeProduct?.fotoUrl || m.fotoUrl ? (
                        <img
                          src={activeProduct?.fotoUrl || m.fotoUrl}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={20} className="text-[var(--muted-foreground)] opacity-40" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-base text-[var(--foreground)]">{m.name}</h4>
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider">
                          {m.baseCode}
                        </span>
                        {m.material && (
                          <span className="px-2 py-0.5 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-lg text-[10px] font-semibold">
                            {m.material}
                          </span>
                        )}
                        {activeSucursalId === "TODAS" && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Building2 size={10} /> {m.sucursalNombre || "Matriz"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {m.brand} · {uniqueColors.length} {uniqueColors.length === 1 ? 'color' : 'colores'}
                        </p>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            totalStockModelo === 0
                              ? "bg-red-500/10 text-red-500"
                              : "bg-emerald-500/10 text-emerald-600"
                          }`}
                        >
                          {totalStockModelo} {totalStockModelo === 1 ? 'par' : 'pares'} en stock
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones principales / Precios / Botón Expandir */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider block">
                        Precios Variantes
                      </span>
                      <span className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                        {activeProduct ? `$${Number(activeProduct.precioVenta).toFixed(2)}` : "—"}
                      </span>
                      {isAdmin && activeProduct && (
                        <span className="text-[10px] text-[var(--muted-foreground)] block">
                          Costo: ${Number(activeProduct.precioCosto).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpandModel(m.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[var(--muted)]/50 hover:bg-[var(--muted)] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        {isExpanded ? (
                          <><span>Ocultar Variantes</span><ChevronUp size={14} /></>
                        ) : (
                          <><span>Ver Variantes ({modelProducts.length})</span><ChevronDown size={14} /></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vista Detallada de Variantes (Expandible) */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] bg-[var(--muted)]/10 p-4 sm:p-5 space-y-4">
                    {/* Selector de Color Activo */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider flex items-center gap-1">
                        <Palette size={12}/> Color Activo:
                      </span>
                      {uniqueColors.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setSelectedColorForModel(prev => ({ ...prev, [m.id]: col }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                            activeColor === col
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-slate-400"
                          }`}
                        >
                          <span>{col}</span>
                        </button>
                      ))}
                    </div>

                    {/* Grid de Tarjetas de Variantes (Series) para el Color Seleccionado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {modelProducts
                        .filter(p => (p.color || 'Único') === activeColor)
                        .map(p => {
                          const tallas = p.tallas || (p as any).stockPorTalla || [];
                          const totalStock = tallas.reduce((acc: number, t: any) => acc + (t.stock ?? t.cantidad ?? t.disponible ?? 0), 0);
                          const bajo = stockBajo(p);

                          return (
                            <div
                              key={p.id}
                              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider block">Código Variante</span>
                                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{p.codigo}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider block">Serie</span>
                                  <span className="text-xs font-semibold text-[var(--foreground)]">
                                    {p.serie?.nombre ? getNombreSerie(p.serie.nombre, tallas) : "—"}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider block">Precio</span>
                                  <span className="text-xs font-extrabold text-[#0F172A] dark:text-emerald-400">
                                    ${Number(p.precioVenta).toFixed(2)}
                                  </span>
                                  {/* COSTO VISIBLE EXCLUSIVAMENTE PARA ADMINISTRADOR */}
                                  {isAdmin && (
                                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                                      Costo: <strong className="text-[var(--foreground)]">${Number(p.precioCosto).toFixed(2)}</strong>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Detalle de Tallas y Stocks */}
                              <div className="bg-[var(--muted)]/20 rounded-lg p-2.5 space-y-1.5">
                                <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
                                  Stock Físico por Talla
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {tallas.map((t: any, idx: number) => {
                                    const st = t.stock ?? t.cantidad ?? t.disponible ?? 0;
                                    const min = t.stockMinimo || 0;
                                    const num = t.nombre || t.numero;
                                    return (
                                      <span
                                        key={t.id || t.tallaId || idx}
                                        title={`Stock: ${st} pares`}
                                        className={`px-2 py-1 rounded-md text-[10px] font-bold border whitespace-nowrap inline-flex items-center ${
                                          st === 0
                                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                                            : min > 0 && st <= min
                                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                        }`}
                                      >
                                        T{num}: {st}
                                      </span>
                                    );
                                  })}
                                </div>
                                <div className="text-[10px] text-[var(--muted-foreground)] pt-1 flex justify-between items-center">
                                  <span>Total: <b>{totalStock} pares</b> {getDocenaLabel(totalStock)}</span>
                                  {totalStock === 0 ? (
                                    <span className="text-red-500 font-bold">Sin Stock</span>
                                  ) : bajo ? (
                                    <span className="text-amber-600 font-bold">Stock Bajo</span>
                                  ) : (
                                    <span className="text-emerald-600 font-semibold">Disponible</span>
                                  )}
                                </div>
                              </div>

                              {/* Botones de acción de inventario */}
                              {canMove && (
                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border)]/40 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => openMovimiento(p, "entrada")}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all cursor-pointer"
                                  >
                                    <TrendingUp size={13} /> <span>Entrada</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openMovimiento(p, "salida")}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all cursor-pointer"
                                  >
                                    <TrendingDown size={13} /> <span>Salida</span>
                                  </button>
                                  {isAdmin && (sucursales || []).length > 1 && totalStock > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => openTransferencia(p)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all cursor-pointer"
                                      title="Despachar pares a otra sucursal"
                                    >
                                      <ArrowRightLeft size={13} /> <span>Despachar</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL MOVIMIENTO MULTIFORMATO */}
      {showMovModal && movProd && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowMovModal(false), isDirtyMov()); }}>
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 font-bold ${
                  movType === "entrada" ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {movType === "entrada" ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {movType === "entrada" ? "Ingreso de Mercadería a Bodega" : "Salida / Ajuste de Stock"}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {movProd.nombre} · {movProd.codigo} {movProd.serie?.nombre ? `(${movProd.serie.nombre})` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMovModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleMovimiento} className="p-5 space-y-4">
              {movType === "entrada" && (
                <div className="space-y-4">
                  {/* Selector de modo: Pares Sueltos vs Serie Completa */}
                  <div className="p-1 bg-[var(--muted)]/60 border border-[var(--border)] rounded-xl flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIngresoFormato("suelto")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        ingresoFormato === "suelto"
                          ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      👟 Pares Sueltos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIngresoFormato("serie");
                        if (totalParesLote === 0) {
                          aplicarPresetSerie(1);
                        }
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        ingresoFormato === "serie"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      📦 Serie Completa
                    </button>
                  </div>

                  {/* Componente Interactivo Idéntico */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3.5">
                    {/* Cabecera del Producto */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-1 border-b border-[var(--border)]/50">
                      <div>
                        <h4 className="font-extrabold text-base text-[var(--foreground)] uppercase tracking-wide">
                          {movProd.modelo || movProd.nombre}
                        </h4>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          <span className="font-semibold">{movProd.marca}</span>
                          {movProd.nombre && movProd.modelo && <span> · {movProd.nombre}</span>}
                          {movProd.serie?.nombre && (
                            <span> · <span className="text-emerald-600 dark:text-emerald-400 font-bold">Serie: {movProd.serie.nombre}</span></span>
                          )}
                          {movProd.codigo && <span className="ml-1 opacity-70">({movProd.codigo})</span>}
                        </p>
                      </div>

                      {/* Resumen Derecho de Pares, Docenas y Costo */}
                      <div className="text-left sm:text-right shrink-0">
                        <div className="font-extrabold text-xs text-[var(--foreground)]">
                          {totalParesLote} {totalParesLote === 1 ? 'par' : 'pares'} {totalParesLote > 0 ? `(${getDocenaLabel(totalParesLote)})` : ''}
                        </div>
                        {isAdmin && (
                          <>
                            <div className="text-[11px] text-[var(--muted-foreground)]">
                              ${Number(movProd.precioCosto).toFixed(2)} / par
                            </div>
                            <div className="font-black text-sm text-emerald-600">
                              ${(totalParesLote * Number(movProd.precioCosto)).toFixed(2)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Fila Principal: Foto | Pastillas de Tallas y Botones */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                        {movProd.fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={movProd.fotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-[var(--muted-foreground)]" />
                        )}
                      </div>

                      <div className="space-y-2.5 flex-1 min-w-0">
                        {/* Pastillas Interactivas por Talla */}
                        <div className="flex flex-wrap items-center gap-2">
                          {movProd.tallas?.map((t) => {
                            const qty = loteCantidades[t.id] ?? 0;
                            return (
                              <div
                                key={t.id}
                                className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs ${
                                  qty > 0
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-[var(--foreground)]'
                                    : 'bg-[var(--muted)]/20 border-[var(--border)]/70 text-[var(--muted-foreground)]'
                                }`}
                              >
                                <span className="font-extrabold text-xs font-mono mr-0.5">
                                  T{t.nombre || t.numero}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setLoteCantidades({...loteCantidades, [t.id]: Math.max(0, qty - 1)})}
                                  className="w-5 h-5 flex items-center justify-center bg-rose-500/15 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 rounded-md text-xs font-black transition-colors cursor-pointer"
                                  title={`Restar 1 par T${t.nombre || t.numero}`}
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={qty}
                                  onChange={(e) => setLoteCantidades({...loteCantidades, [t.id]: Math.max(0, parseInt(e.target.value) || 0)})}
                                  className="w-7 text-center text-xs font-black font-mono bg-transparent border-none focus:outline-none p-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => setLoteCantidades({...loteCantidades, [t.id]: qty + 1})}
                                  className="w-5 h-5 flex items-center justify-center bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md text-xs font-black transition-colors cursor-pointer"
                                  title={`Sumar 1 par T${t.nombre || t.numero}`}
                                >
                                  +
                                </button>
                                <span className="text-[10px] text-[var(--muted-foreground)] font-mono ml-0.5" title={`Stock actual: ${t.stock}`}>
                                  stk:{t.stock}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Acciones Rápidas Masivas */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const newLote: Record<string, number> = {...loteCantidades};
                              movProd.tallas?.forEach((t) => { newLote[t.id] = (newLote[t.id] || 0) + 1; });
                              setLoteCantidades(newLote);
                            }}
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                          >
                            +1 par c/talla
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newLote: Record<string, number> = {...loteCantidades};
                              movProd.tallas?.forEach((t) => { newLote[t.id] = Math.max(0, (newLote[t.id] || 0) - 1); });
                              setLoteCantidades(newLote);
                            }}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                          >
                            −1 par c/talla
                          </button>
                          {ingresoFormato === "serie" && (
                            <>
                              {[0.5, 1, 2].map(m => {
                                const label = m === 0.5 ? "½ Docena" : m === 1 ? "1 Docena" : "2 Docenas";
                                return (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => aplicarPresetSerie(m)}
                                    className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                                      serieMultiplicador === m
                                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                                    }`}
                                  >
                                    📦 {label}
                                  </button>
                                );
                              })}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const newLote: Record<string, number> = {};
                              movProd.tallas?.forEach((t) => { newLote[t.id] = 0; });
                              setLoteCantidades(newLote);
                            }}
                            className="px-2.5 py-1 bg-slate-500/10 hover:bg-slate-500/20 text-[var(--muted-foreground)] border border-[var(--border)] rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                          >
                            ↺ Poner en 0
                          </button>
                          <span className="text-[11px] text-[var(--muted-foreground)] font-mono ml-1">
                            = {totalParesLote} {totalParesLote === 1 ? 'par' : 'pares'} total
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {movType === "salida" && (
                <>
                  <div>
                    <Lbl t="Talla Seleccionada" req />
                    <select value={movTallaId} onChange={(e) => setMovTallaId(e.target.value)} className={INPUT}>
                      <option value="">Seleccionar talla...</option>
                      {movProd.tallas?.map((t) => <option key={t.id} value={t.id}>Talla {t.nombre || t.numero} (stock: {t.stock})</option>)}
                    </select>
                  </div>
                  <div>
                    <Lbl t="Cantidad de Pares a Descargar" req />
                    <input type="number" min="1" value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} className={INPUT} />
                  </div>
                </>
              )}
              <div>
                <Lbl t="Motivo / Documento" req />
                <input type="text" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder={movType === "entrada" ? "Ej. Comprobante de recepción / Guía N° 001" : "Ej. Ajuste de inventario"} className={INPUT} />
              </div>
              {movError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {movError}
                </div>
              )}
              <button type="submit" disabled={movSaving} className={`w-full py-3 text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 ${movType === "entrada" ? "bg-emerald-600" : "bg-red-500"}`}>
                {movSaving ? <><Loader2 size={16} className="animate-spin" /> Registrando...</> : movType === "entrada" ? <><TrendingUp size={16} /> Registrar Entrada ({ingresoFormato === "serie" ? `${totalParesLote} pares` : "Pares sueltos"})</> : <><TrendingDown size={16} /> Registrar Salida</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERENCIA INTER-SUCURSAL */}
      {showTransfModal && transfProd && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowTransfModal(false), isDirtyTransf()); }}>
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 backdrop-blur-sm rounded-2xl border border-blue-400/30 font-bold text-blue-300">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Despacho / Transferencia a Sucursal
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {transfProd.nombre} · {transfProd.codigo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTransfModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransferencia} className="p-5 space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                <span>Transfiere pares físicos desde <strong>{activeSucursalId === 'TODAS' ? 'Matriz' : sucursales?.find(s => s.id === activeSucursalId)?.name || 'Matriz'}</strong> hacia otra sucursal del negocio. El stock se actualizará de inmediato en ambos locales.</span>
              </div>

              <div>
                <Lbl t="Sucursal de Destino" req />
                <select
                  value={transfDestinoId}
                  onChange={(e) => setTransfDestinoId(e.target.value)}
                  className={INPUT}
                >
                  {(sucursales || [])
                    .filter((s) => s.id !== activeSucursalId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.isMatriz ? "🏢 Matriz: " : "🏪 Sucursal: "} {s.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Selector de modo: Pares Sueltos vs Serie Completa */}
              <div className="p-1 bg-[var(--muted)]/60 border border-[var(--border)] rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTransfFormato("suelto")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    transfFormato === "suelto"
                      ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  👟 Pares Sueltos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransfFormato("serie");
                    if (totalParesTransf === 0) {
                      aplicarPresetTransfSerie(1);
                    }
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    transfFormato === "serie"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  📦 Serie Completa
                </button>
              </div>

              {/* Componente Interactivo Idéntico */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3.5">
                {/* Cabecera del Producto */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-1 border-b border-[var(--border)]/50">
                  <div>
                    <h4 className="font-extrabold text-base text-[var(--foreground)] uppercase tracking-wide">
                      {transfProd.modelo || transfProd.nombre}
                    </h4>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      <span className="font-semibold">{transfProd.marca}</span>
                      {transfProd.nombre && transfProd.modelo && <span> · {transfProd.nombre}</span>}
                      {transfProd.serie?.nombre && (
                        <span> · <span className="text-blue-600 dark:text-blue-400 font-bold">Serie: {transfProd.serie.nombre}</span></span>
                      )}
                      {transfProd.codigo && <span className="ml-1 opacity-70">({transfProd.codigo})</span>}
                    </p>
                  </div>

                  {/* Resumen Derecho de Pares, Docenas y Costo */}
                  <div className="text-left sm:text-right shrink-0">
                    <div className="font-extrabold text-xs text-[var(--foreground)]">
                      {totalParesTransf} {totalParesTransf === 1 ? 'par' : 'pares'} {totalParesTransf > 0 ? `(${getDocenaLabel(totalParesTransf)})` : ''}
                    </div>
                    {isAdmin && (
                      <>
                        <div className="text-[11px] text-[var(--muted-foreground)]">
                          ${Number(transfProd.precioCosto || transfProd.precioVenta || 0).toFixed(2)} / par
                        </div>
                        <div className="font-black text-sm text-blue-600 dark:text-blue-400">
                          ${(totalParesTransf * Number(transfProd.precioCosto || transfProd.precioVenta || 0)).toFixed(2)}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Fila Principal: Foto | Pastillas de Tallas y Botones */}
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                    {transfProd.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={transfProd.fotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={20} className="text-[var(--muted-foreground)]" />
                    )}
                  </div>

                  <div className="space-y-2.5 flex-1 min-w-0">
                    {/* Pastillas Interactivas por Talla */}
                    <div className="flex flex-wrap items-center gap-2">
                      {transfProd.tallas?.map((t) => {
                        const qty = transfLoteCantidades[t.id] ?? 0;
                        const stockDisp = t.stock ?? t.cantidad ?? t.disponible ?? 0;
                        return (
                          <div
                            key={t.id}
                            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs ${
                              qty > 0
                                ? 'bg-blue-500/10 border-blue-500/40 text-[var(--foreground)]'
                                : 'bg-[var(--muted)]/20 border-[var(--border)]/70 text-[var(--muted-foreground)]'
                            }`}
                          >
                            <span className="font-extrabold text-xs font-mono mr-0.5">
                              T{t.nombre || t.numero}
                            </span>
                            <button
                              type="button"
                              onClick={() => setTransfLoteCantidades({...transfLoteCantidades, [t.id]: Math.max(0, qty - 1)})}
                              className="w-5 h-5 flex items-center justify-center bg-rose-500/15 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 rounded-md text-xs font-black transition-colors cursor-pointer"
                              title={`Restar 1 par T${t.nombre || t.numero}`}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={stockDisp}
                              value={qty}
                              onChange={(e) => {
                                const parsed = parseInt(e.target.value) || 0;
                                const clamped = Math.max(0, Math.min(stockDisp, parsed));
                                setTransfLoteCantidades({...transfLoteCantidades, [t.id]: clamped});
                              }}
                              className="w-7 text-center text-xs font-black font-mono bg-transparent border-none focus:outline-none p-0"
                            />
                            <button
                              type="button"
                              disabled={qty >= stockDisp}
                              onClick={() => setTransfLoteCantidades({...transfLoteCantidades, [t.id]: Math.min(stockDisp, qty + 1)})}
                              className="w-5 h-5 flex items-center justify-center bg-blue-500/15 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 rounded-md text-xs font-black transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={`Sumar 1 par T${t.nombre || t.numero}`}
                            >
                              +
                            </button>
                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono ml-0.5" title={`Disponible en origen: ${stockDisp}`}>
                              stk:{stockDisp}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Acciones Rápidas Masivas */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const newLote: Record<string, number> = {...transfLoteCantidades};
                          transfProd.tallas?.forEach((t) => {
                            const stockDisp = t.stock ?? t.cantidad ?? t.disponible ?? 0;
                            newLote[t.id] = Math.min(stockDisp, (newLote[t.id] || 0) + 1);
                          });
                          setTransfLoteCantidades(newLote);
                        }}
                        className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/25 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        +1 par c/talla
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newLote: Record<string, number> = {...transfLoteCantidades};
                          transfProd.tallas?.forEach((t) => {
                            newLote[t.id] = Math.max(0, (newLote[t.id] || 0) - 1);
                          });
                          setTransfLoteCantidades(newLote);
                        }}
                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        −1 par c/talla
                      </button>
                      {transfFormato === "serie" && (
                        <>
                          {[0.5, 1, 2].map(m => {
                            const label = m === 0.5 ? "½ Docena" : m === 1 ? "1 Docena" : "2 Docenas";
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => aplicarPresetTransfSerie(m)}
                                className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                                  transfMultiplicador === m
                                    ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400"
                                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                                }`}
                              >
                                📦 {label}
                              </button>
                            );
                          })}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const newLote: Record<string, number> = {};
                          transfProd.tallas?.forEach((t) => { newLote[t.id] = 0; });
                          setTransfLoteCantidades(newLote);
                        }}
                        className="px-2.5 py-1 bg-slate-500/10 hover:bg-slate-500/20 text-[var(--muted-foreground)] border border-[var(--border)] rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        ↺ Poner en 0
                      </button>
                      <span className="text-[11px] text-[var(--muted-foreground)] font-mono ml-1">
                        = {totalParesTransf} {totalParesTransf === 1 ? 'par' : 'pares'} total
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Lbl t="Motivo / Guía Interna de Despacho" req />
                <input
                  type="text"
                  value={transfMotivo}
                  onChange={(e) => setTransfMotivo(e.target.value)}
                  placeholder="Ej. Abastecimiento de mostrador para fin de semana"
                  className={INPUT}
                />
              </div>

              {transfError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {transfError}
                </div>
              )}

              <button
                type="submit"
                disabled={transfSaving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {transfSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Despachando pares...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={16} /> Confirmar Despacho a Sucursal ({transfFormato === "serie" ? `${totalParesTransf} pares` : "Pares sueltos"})
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de descarte de cambios */}
      <UnsavedChangesModal
        isOpen={showDiscardModal}
        targetSectionName="Inventario"
        detail={{ hasChanges: true, sectionName: "este formulario de Inventario" }}
        onStay={() => {
          setShowDiscardModal(false);
          pendingCloseRef.current = null;
        }}
        onDiscardAndLeave={() => {
          setShowDiscardModal(false);
          if (pendingCloseRef.current) {
            pendingCloseRef.current();
            pendingCloseRef.current = null;
          }
        }}
      />
    </div>
  );
}
