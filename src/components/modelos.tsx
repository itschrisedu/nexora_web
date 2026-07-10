"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import {
  Plus, Search, Loader2, ImageIcon, Package, Edit2,
  DollarSign, CheckCircle, AlertCircle, X, RefreshCw, ChevronDown, ChevronUp, Palette
} from "lucide-react";

interface ModelosProps {
  online: boolean;
}

interface TallaStock {
  tallaId: string;
  numero: number;
  cantidad: number;
  cantidadReservada: number;
  disponible: number;
  stockMinimo: number;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  material?: string;
  color: string;
  fotoUrl?: string;
  precioCosto: number;
  precioVenta: number;
  serie: { id: string; nombre: string } | null;
  tallas: TallaStock[];
  activo: boolean;
}

interface ModeloAgrupado {
  id: string;
  baseCode: string;
  name: string;
  brand: string;
  material?: string;
  active: boolean;
  products: Producto[];
}

interface ColorInput {
  color: string;
  foto: string | null;
}

const SERIES_ORDEN = [
  "ADULTO",
  "JUVENIL",
  "NINO",
  "NINO_PEQUENO_A",
  "BEBE",
  "TALLA_GRANDE"
];

const SERIES_NOMBRES: Record<string, string> = {
  ADULTO: "adulto (37-42)",
  JUVENIL: "juvenil (34-38)",
  NINO: "junior (27-32)",
  NINO_PEQUENO_A: "niño (21-26)",
  BEBE: "bebe (18-20)",
  TALLA_GRANDE: "Adulto Grande (43-45)"
};

const getNombreSerie = (nombreRaw: string): string => {
  return SERIES_NOMBRES[nombreRaw] || nombreRaw;
};

const INPUT = "w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] transition-colors";

function Lbl({ t, req }: { t: string; req?: boolean }) {
  return (
    <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
      {t}{req && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

const compressImageToWebP = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const webpBase64 = canvas.toDataURL("image/webp", quality);
      resolve(webpBase64);
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
};

export default function ModelosComponent({ online }: ModelosProps) {
  const [modelos, setModelos] = useState<ModeloAgrupado[]>([]);
  const [series, setSeries] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [priceProd, setPriceProd] = useState<Producto | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Acordeones abiertos
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});

  // Color seleccionado para previsualización por cada modelo
  const [selectedColorForModel, setSelectedColorForModel] = useState<Record<string, string>>({});

  // Formulario de creación masiva
  const [baseCode, setBaseCode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [material, setMaterial] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [colors, setColors] = useState<ColorInput[]>([{ color: "", foto: null }]);
  const [serieIds, setSerieIds] = useState<string[]>([]);
  const [stockInicial, setStockInicial] = useState("1"); // 1 por defecto

  const [newCosto, setNewCosto] = useState("");
  const [newVenta, setNewVenta] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => { loadData(); }, [online]);

  const loadData = async () => {
    setLoading(true);
    try {
      const mdls = await ApiService.get("/inventario/modelos");
      setModelos(Array.isArray(mdls) ? mdls : []);

      if (online) {
        try {
          const srs = await ApiService.get("/configuracion/series");
          if (Array.isArray(srs)) {
            const filtradasYOrdenadas = srs
              .filter((s: any) => s.nombre !== "NINO_PEQUENO_B")
              .sort((a: any, b: any) => {
                const idxA = SERIES_ORDEN.indexOf(a.nombre);
                const idxB = SERIES_ORDEN.indexOf(b.nombre);
                const valA = idxA === -1 ? 999 : idxA;
                const valB = idxB === -1 ? 999 : idxB;
                return valA - valB;
              });
            setSeries(filtradasYOrdenadas);
            // Preseleccionar todas las series por defecto
            setSerieIds(filtradasYOrdenadas.map(s => s.id));
          }
        } catch {}
      }
    } catch (e: any) {
      console.error("Error cargando modelos:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFoto = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressImageToWebP(reader.result as string);
        setColors(prev => {
          const copy = [...prev];
          copy[index].foto = compressed;
          return copy;
        });
      } catch (err) {
        console.error("Error comprimiendo imagen:", err);
      }
    };
    reader.readAsDataURL(f);
  };

  const addColorField = () => {
    setColors(prev => [...prev, { color: "", foto: null }]);
  };

  const removeColorField = (index: number) => {
    if (colors.length === 1) return;
    setColors(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSerie = (id: string) => {
    setSerieIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const resetForm = () => {
    setBaseCode("");
    setName("");
    setBrand("");
    setMaterial("");
    setCostPrice("");
    setSalePrice("");
    setColors([{ color: "", foto: null }]);
    setStockInicial("1");
    setError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!baseCode || !name || !brand || !costPrice || !salePrice) {
      setError("Completa todos los campos obligatorios del modelo.");
      return;
    }

    const filteredColors = colors.filter(c => c.color.trim() !== "");
    if (filteredColors.length === 0) {
      setError("Debes ingresar al menos un color.");
      return;
    }

    if (serieIds.length === 0) {
      setError("Selecciona al menos una serie.");
      return;
    }

    setSaving(true);
    try {
      await ApiService.post("/inventario/modelos", {
        baseCode,
        name,
        brand,
        material: material || undefined,
        costPrice: parseFloat(costPrice),
        salePrice: parseFloat(salePrice),
        colors: filteredColors.map(c => ({
          color: c.color,
          imageUrl: c.foto || undefined
        })),
        serieIds,
        stockInicial: parseInt(stockInicial) || 0,
        stockMinimo: 0
      });

      setSuccess("Modelo y sus variantes creados exitosamente.");
      setShowCreate(false);
      resetForm();
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al crear el modelo.");
    } finally {
      setSaving(false);
    }
  };

  const openPrice = (p: Producto) => {
    setPriceProd(p);
    setNewCosto(String(p.precioCosto));
    setNewVenta(String(p.precioVenta));
    setMotivo("");
    setError("");
    setShowPrice(true);
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceProd || !newCosto || !newVenta) { setError("Ingresa ambos precios."); return; }
    setSaving(true);
    try {
      await ApiService.patch(`/inventario/productos/${priceProd.id}/precio`, {
        nuevoPrecioCosto: parseFloat(newCosto),
        nuevoPrecioVenta: parseFloat(newVenta),
        motivo: motivo || "Actualización manual de precios",
      });
      setSuccess("Precios actualizados.");
      setShowPrice(false);
      setPriceProd(null);
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar precios.");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpandModel = (id: string) => {
    setExpandedModels(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredModelos = modelos.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.baseCode.toLowerCase().includes(search.toLowerCase()) ||
    m.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Catálogo de Modelos</h3>
          <p className="text-xs text-[var(--muted-foreground)]">Administra diseños base y sus variantes de color y serie</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="p-2.5 border border-[var(--border)] rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
            <RefreshCw size={16} />
          </button>
          {online && (
            <button onClick={() => { resetForm(); setShowCreate(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus size={16} /><span>Nuevo Modelo</span>
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
        <input type="text" placeholder="Buscar por código base, nombre o marca..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] transition-colors" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[var(--primary)] mb-3" size={36} />
          <span className="text-sm">Cargando catálogo...</span>
        </div>
      ) : filteredModelos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-[var(--card)] border border-[var(--border)] border-dashed rounded-2xl text-[var(--muted-foreground)]">
          <Package size={48} className="mb-4 opacity-30" />
          <p className="font-semibold">Sin modelos registrados</p>
          <p className="text-xs mt-1">Haz clic en "Nuevo Modelo" para agregar diseños y generar variantes en lote.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredModelos.map(m => {
            // Obtener colores únicos disponibles en el modelo
            const products = m.products || [];
            const uniqueColors = Array.from(new Set(products.map(p => p.color)));
            const activeColor = selectedColorForModel[m.id] || uniqueColors[0] || "";

            // Variante seleccionada por color (primer producto que coincida con el color activo)
            const activeProduct = products.find(p => p.color === activeColor);

            const isExpanded = expandedModels[m.id];

            return (
              <div key={m.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Resumen del Modelo */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-16 h-16 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                      {activeProduct?.fotoUrl ? (
                        <img src={activeProduct.fotoUrl} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={20} className="text-[var(--muted-foreground)] opacity-40" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-base">{m.name}</h4>
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider">{m.baseCode}</span>
                        {m.material && (
                          <span className="px-2 py-0.5 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-lg text-[10px] font-semibold">{m.material}</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{m.brand} · {uniqueColors.length} colores disponibles</p>
                    </div>
                  </div>

                  {/* Acciones principales */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider block">Precios Variantes</span>
                      <span className="text-sm font-extrabold text-[var(--primary)]">
                        {activeProduct ? `$${Number(activeProduct.precioVenta).toFixed(2)}` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleExpandModel(m.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[var(--muted)]/50 hover:bg-[var(--muted)] text-xs font-semibold rounded-xl transition-colors">
                        {isExpanded ? (
                          <><span>Ocultar Variantes</span><ChevronUp size={14} /></>
                        ) : (
                          <><span>Ver Variantes ({products.length})</span><ChevronDown size={14} /></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vista Detallada de Variantes (Expandible) */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] bg-[var(--muted)]/10 p-4 sm:p-5 space-y-4">
                    {/* Selector de Color */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider flex items-center gap-1"><Palette size={12}/> Color Activo:</span>
                      {uniqueColors.map(col => (
                        <button key={col} onClick={() => setSelectedColorForModel(prev => ({ ...prev, [m.id]: col }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            activeColor === col
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-slate-400"
                          }`}>
                          {col}
                        </button>
                      ))}
                    </div>

                    {/* Tabla/Listado de Series para el Color Seleccionado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products.filter(p => p.color === activeColor).map(p => {
                        const tallas = p.tallas || [];
                        const totalStock = tallas.reduce((acc, t) => acc + (t.cantidad || 0), 0);

                        return (
                          <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider block">Código Variante</span>
                                <span className="text-xs font-mono font-bold text-slate-800">{p.codigo}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider block">Serie</span>
                                <span className="text-xs font-semibold">{p.serie?.nombre ? getNombreSerie(p.serie.nombre) : "—"}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider block">Precio</span>
                                <span className="text-xs font-extrabold text-[var(--primary)]">${Number(p.precioVenta).toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Detalle de Tallas y Stocks */}
                            <div className="bg-[var(--muted)]/20 rounded-lg p-2.5 space-y-1.5">
                              <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">Stock Físico por Talla</span>
                              <div className="flex flex-wrap gap-1.5">
                                {tallas.map(t => (
                                  <span key={t.tallaId} title={`Stock: ${t.cantidad} pares`}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                                      t.cantidad === 0 ? "bg-red-500/10 text-red-500 border-red-500/20"
                                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    }`}>
                                    T{t.numero}: {t.cantidad}
                                  </span>
                                ))}
                              </div>
                              <div className="text-[10px] text-[var(--muted-foreground)] pt-1 flex justify-between">
                                <span>Total: <b>{totalStock} pares</b></span>
                                {totalStock === 0 && <span className="text-red-500 font-bold">Sin Stock</span>}
                              </div>
                            </div>

                            {/* Botón precios */}
                            <div className="flex justify-end pt-1">
                              <button onClick={() => openPrice(p)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/30 rounded-lg hover:bg-[var(--primary)]/10 transition-colors">
                                <Edit2 size={12} /><span>Ajustar Precios</span>
                              </button>
                            </div>
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

      {/* MODAL CREAR MASIVO */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Nuevo Modelo y Variantes</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Crea un diseño base y genera variantes para colores y series en lote</p>
              </div>
              <button onClick={() => { setShowCreate(false); resetForm(); }}
                className="p-2 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              
              {/* Sección 1: Datos Base */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">1. Información del Modelo</h5>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><Lbl t="Código Base" req /><input type="text" value={baseCode} onChange={e => setBaseCode(e.target.value)} placeholder="Ej. NK-AIR" className={INPUT} /></div>
                  <div><Lbl t="Nombre del calzado" req /><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Air Max 90" className={INPUT} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><Lbl t="Marca" req /><input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ej. Nike" className={INPUT} /></div>
                  <div><Lbl t="Material" /><input type="text" value={material} onChange={e => setMaterial(e.target.value)} placeholder="Ej. Cuero sintético y malla" className={INPUT} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><Lbl t="Precio de Costo ($)" req /><input type="number" min="0.01" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" className={INPUT} /></div>
                  <div><Lbl t="Precio de Venta ($)" req /><input type="number" min="0.01" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0.00" className={INPUT} /></div>
                </div>
              </div>

              {/* Sección 2: Variantes de Color */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                  <h5 className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest">2. Colores y Fotografías</h5>
                  <button type="button" onClick={addColorField}
                    className="flex items-center gap-1 text-[11px] font-bold text-[var(--primary)] hover:opacity-80 transition-opacity">
                    <Plus size={12} /><span>Añadir Color</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {colors.map((cInput, idx) => (
                    <div key={idx} className="flex gap-4 items-start bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl p-3 relative">
                      <div className="w-16 h-16 bg-[var(--muted)]/40 border-2 border-dashed border-[var(--border)] rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {cInput.foto ? <img src={cInput.foto} className="w-full h-full object-cover" alt="preview" />
                          : <ImageIcon size={18} className="text-[var(--muted-foreground)] opacity-40" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Lbl t={`Nombre de Color #${idx + 1}`} req />
                          {colors.length > 1 && (
                            <button type="button" onClick={() => removeColorField(idx)}
                              className="text-[10px] font-bold text-red-500 hover:opacity-80 transition-opacity">
                              Eliminar
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input type="text" value={cInput.color} onChange={e => setColors(prev => {
                            const copy = [...prev];
                            copy[idx].color = e.target.value;
                            return copy;
                          })} placeholder="Ej. Blanco / Negro-Rojo" className="w-full px-2 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[var(--primary)]" />
                          
                          <input type="file" accept="image/*" onChange={e => handleFoto(idx, e)}
                            className="w-full text-[10px] text-[var(--muted-foreground)] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-900 file:text-white file:text-[9px] file:font-semibold hover:file:opacity-90 cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección 3: Selección de Series */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">3. Series a Generar</h5>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {series.map(s => {
                    const isChecked = serieIds.includes(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleSerie(s.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-colors flex items-center justify-between ${
                          isChecked
                            ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]"
                            : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-slate-400"
                        }`}>
                        <span>{getNombreSerie(s.nombre)}</span>
                        <input type="checkbox" checked={isChecked} readOnly className="pointer-events-none accent-[var(--primary)]" />
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[var(--muted)]/20 p-3.5 rounded-xl border border-[var(--border)]">
                  <div>
                    <Lbl t="Stock Físico por Talla (Por Defecto)" req />
                    <input type="number" min="0" value={stockInicial} onChange={e => setStockInicial(e.target.value)} className="px-3 py-1.5 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-semibold focus:outline-none" />
                  </div>
                  <div className="flex items-center text-[10px] text-[var(--muted-foreground)] italic leading-relaxed">
                    Cada talla de las series marcadas se creará inicialmente con esta cantidad de stock en inventario (un par equivale a 1 unidad).
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              
              <button type="submit" disabled={saving}
                className="w-full py-3 bg-[var(--primary)] text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" />Generando variantes en lote...</> : <><Plus size={16} />Crear Modelo y Variantes</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRECIOS */}
      {showPrice && priceProd && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Actualizar Precios</h3>
                <p className="text-xs text-[var(--muted-foreground)]">{priceProd.nombre} · Color {priceProd.color} · Tallas {getNombreSerie(priceProd.serie?.nombre ?? "")}</p>
              </div>
              <button onClick={() => setShowPrice(false)}
                className="p-2 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdatePrice} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Lbl t="Precio de Costo ($)" req /><input type="number" min="0.01" step="0.01" value={newCosto} onChange={e => setNewCosto(e.target.value)} className={INPUT} /></div>
                <div><Lbl t="Precio de Venta ($)" req /><input type="number" min="0.01" step="0.01" value={newVenta} onChange={e => setNewVenta(e.target.value)} className={INPUT} /></div>
              </div>
              <div><Lbl t="Motivo (opcional)" /><input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Ajuste de temporada..." className={INPUT} /></div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <button type="submit" disabled={saving}
                className="w-full py-3 bg-[var(--primary)] text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" />Guardando...</> : <><DollarSign size={16} />Actualizar Precios</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
