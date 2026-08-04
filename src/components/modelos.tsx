"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import {
  Plus, Search, Loader2, ImageIcon, Package, Edit2, Trash2, AlertTriangle,
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

  // Modal de confirmación UI (reemplaza window.confirm sin 'localhost:3000 dice')
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Color seleccionado para previsualización por cada modelo
  const [selectedColorForModel, setSelectedColorForModel] = useState<Record<string, string>>({});

  // Formulario de creación masiva
  const [baseCode, setBaseCode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [material, setMaterial] = useState("");
  const [colors, setColors] = useState<ColorInput[]>([{ color: "", foto: null }]);
  const [serieIds, setSerieIds] = useState<string[]>([]);
  // Precios individuales por serie: { [serieId]: { costPrice: string, salePrice: string } }
  const [seriesPrices, setSeriesPrices] = useState<Record<string, { costPrice: string; salePrice: string }>>({});
  const [stockInicial, setStockInicial] = useState("1"); // 1 por defecto

  // Estado para el modal de añadir nuevo color a modelo existente
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [selectedModelForColor, setSelectedModelForColor] = useState<ModeloAgrupado | null>(null);
  const [newColorName, setNewColorName] = useState("");
  const [newColorFoto, setNewColorFoto] = useState<string | null>(null);
  const [newColorSerieIds, setNewColorSerieIds] = useState<string[]>([]);
  const [newColorSeriesPrices, setNewColorSeriesPrices] = useState<Record<string, { costPrice: string; salePrice: string }>>({});
  const [newColorStockInicial, setNewColorStockInicial] = useState("1");

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
            // Las series empiezan desactivadas por defecto
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
    setSerieIds(prev => {
      if (prev.includes(id)) {
        // Desactivar: quitar de la lista y limpiar precios
        setSeriesPrices(sp => {
          const copy = { ...sp };
          delete copy[id];
          return copy;
        });
        return prev.filter(x => x !== id);
      } else {
        // Activar: agregar y crear entrada de precios vacía
        setSeriesPrices(sp => ({
          ...sp,
          [id]: { costPrice: "", salePrice: "" }
        }));
        return [...prev, id];
      }
    });
  };

  const openAddColorModal = (m: ModeloAgrupado) => {
    setSelectedModelForColor(m);
    setNewColorName("");
    setNewColorFoto(null);

    // Pre-activar por defecto las series que ya tenga este modelo
    const existingSerieIds = Array.from(
      new Set((m.products || []).map(p => p.serie?.id).filter(Boolean))
    ) as string[];

    setNewColorSerieIds(existingSerieIds);
    
    // Inicializar mapa de precios para las series existentes
    const initialPrices: Record<string, { costPrice: string; salePrice: string }> = {};
    existingSerieIds.forEach(sid => {
      // Buscar si algún producto tiene esa serie para pre-llenar precios de sugerencia
      const prod = m.products.find(p => p.serie?.id === sid);
      initialPrices[sid] = {
        costPrice: prod ? String(prod.precioCosto) : "",
        salePrice: prod ? String(prod.precioVenta) : "",
      };
    });
    setNewColorSeriesPrices(initialPrices);
    setNewColorStockInicial("1");
    setError("");
    setShowAddColorModal(true);
  };

  const toggleNewColorSerie = (id: string) => {
    setNewColorSerieIds(prev => {
      if (prev.includes(id)) {
        setNewColorSeriesPrices(sp => {
          const copy = { ...sp };
          delete copy[id];
          return copy;
        });
        return prev.filter(x => x !== id);
      } else {
        setNewColorSeriesPrices(sp => ({
          ...sp,
          [id]: { costPrice: "", salePrice: "" }
        }));
        return [...prev, id];
      }
    });
  };

  const handleNewColorFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressImageToWebP(reader.result as string);
        setNewColorFoto(compressed);
      } catch (err) {
        console.error("Error comprimiendo imagen:", err);
      }
    };
    reader.readAsDataURL(f);
  };

  const handleCreateNewColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelForColor) return;
    setError("");

    if (!newColorName.trim()) {
      setError("Ingresa el nombre del nuevo color.");
      return;
    }

    if (newColorSerieIds.length === 0) {
      setError("Activa al menos una serie para este nuevo color.");
      return;
    }

    for (const sid of newColorSerieIds) {
      const sp = newColorSeriesPrices[sid];
      const serieName = series.find(s => s.id === sid)?.nombre || sid;
      if (!sp || !sp.costPrice || !sp.salePrice) {
        setError(`Ingresa ambos precios para la serie "${getNombreSerie(serieName)}".`);
        return;
      }
      if (parseFloat(sp.costPrice) <= 0 || parseFloat(sp.salePrice) <= 0) {
        setError(`Los precios de la serie "${getNombreSerie(serieName)}" deben ser mayores a 0.`);
        return;
      }
    }

    const seriesPricesMap: Record<string, { costPrice: number; salePrice: number }> = {};
    for (const sid of newColorSerieIds) {
      const sp = newColorSeriesPrices[sid];
      seriesPricesMap[sid] = {
        costPrice: parseFloat(sp.costPrice),
        salePrice: parseFloat(sp.salePrice),
      };
    }

    setSaving(true);
    try {
      await ApiService.post(`/inventario/modelos/${selectedModelForColor.id}/colores`, {
        color: newColorName.trim(),
        imageUrl: newColorFoto || undefined,
        serieIds: newColorSerieIds,
        stockInicial: parseInt(newColorStockInicial) || 0,
        seriesPrices: seriesPricesMap,
      });

      const addedColor = newColorName.trim();
      const modelId = selectedModelForColor.id;

      setSuccess(`Nuevo color "${addedColor}" añadido exitosamente al modelo "${selectedModelForColor.name}".`);
      setShowAddColorModal(false);
      setSelectedModelForColor(null);

      // Auto-seleccionar el nuevo color y expandir variante
      setSelectedColorForModel(prev => ({ ...prev, [modelId]: addedColor }));
      setExpandedModels(prev => ({ ...prev, [modelId]: true }));

      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al añadir el nuevo color.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setBaseCode("");
    setName("");
    setBrand("");
    setMaterial("");
    setColors([{ color: "", foto: null }]);
    setSerieIds([]);
    setSeriesPrices({});
    setStockInicial("1");
    setError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!baseCode || !name || !brand) {
      setError("Completa todos los campos obligatorios del modelo.");
      return;
    }

    const filteredColors = colors.filter(c => c.color.trim() !== "");
    if (filteredColors.length === 0) {
      setError("Debes ingresar al menos un color.");
      return;
    }

    if (serieIds.length === 0) {
      setError("Activa al menos una serie.");
      return;
    }

    // Validar que cada serie activa tenga precios válidos
    for (const sid of serieIds) {
      const sp = seriesPrices[sid];
      const serieName = series.find(s => s.id === sid)?.nombre || sid;
      if (!sp || !sp.costPrice || !sp.salePrice) {
        setError(`Ingresa ambos precios para la serie "${getNombreSerie(serieName)}".`);
        return;
      }
      if (parseFloat(sp.costPrice) <= 0 || parseFloat(sp.salePrice) <= 0) {
        setError(`Los precios de la serie "${getNombreSerie(serieName)}" deben ser mayores a 0.`);
        return;
      }
    }

    // Construir mapa de precios por serie
    const seriesPricesMap: Record<string, { costPrice: number; salePrice: number }> = {};
    for (const sid of serieIds) {
      const sp = seriesPrices[sid];
      seriesPricesMap[sid] = {
        costPrice: parseFloat(sp.costPrice),
        salePrice: parseFloat(sp.salePrice),
      };
    }

    // Usar los precios de la primera serie como fallback global (requerido por el DTO)
    const firstPrices = seriesPricesMap[serieIds[0]];

    setSaving(true);
    try {
      await ApiService.post("/inventario/modelos", {
        baseCode,
        name,
        brand,
        material: material || undefined,
        costPrice: firstPrices.costPrice,
        salePrice: firstPrices.salePrice,
        colors: filteredColors.map(c => ({
          color: c.color,
          imageUrl: c.foto || undefined
        })),
        serieIds,
        stockInicial: parseInt(stockInicial) || 0,
        stockMinimo: 0,
        seriesPrices: seriesPricesMap,
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

  const handleToggleModel = (id: string, modelName: string, currentActive: boolean) => {
    if (currentActive) {
      setConfirmModal({
        isOpen: true,
        title: "Deshabilitar Modelo",
        message: `¿Estás seguro de que deseas deshabilitar el modelo "${modelName}"? Esto también deshabilitará todas sus variantes de color y serie.`,
        confirmText: "Sí, deshabilitar",
        danger: true,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setSaving(true);
          try {
            await ApiService.patch(`/inventario/modelos/${id}/toggle`, {});
            setSuccess(`Modelo deshabilitado correctamente.`);
            loadData();
            setTimeout(() => setSuccess(""), 4000);
          } catch (err: any) {
            setError(err.message || "Error al cambiar estado del modelo.");
          } finally {
            setSaving(false);
          }
        },
      });
    } else {
      // Habilitar no necesita confirmación
      (async () => {
        setSaving(true);
        try {
          await ApiService.patch(`/inventario/modelos/${id}/toggle`, {});
          setSuccess(`Modelo habilitado correctamente.`);
          loadData();
          setTimeout(() => setSuccess(""), 4000);
        } catch (err: any) {
          setError(err.message || "Error al cambiar estado del modelo.");
        } finally {
          setSaving(false);
        }
      })();
    }
  };

  const handleDeleteModel = (id: string, modelName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Modelo Permanentemente",
      message: `¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE el modelo "${modelName}"?\n\nEsta acción eliminará el modelo, todas sus variantes de color y su inventario de la base de datos. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar permanentemente",
      danger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSaving(true);
        try {
          await ApiService.delete(`/inventario/modelos/${id}`, {});
          setSuccess(`Modelo "${modelName}" eliminado permanentemente.`);
          loadData();
          setTimeout(() => setSuccess(""), 4000);
        } catch (err: any) {
          setError(err.message || "Error al eliminar el modelo.");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleToggleProduct = (id: string, code: string, currentActive: boolean) => {
    if (currentActive) {
      setConfirmModal({
        isOpen: true,
        title: "Deshabilitar Variante",
        message: `¿Estás seguro de que deseas deshabilitar la variante con código "${code}"?`,
        confirmText: "Sí, deshabilitar",
        danger: true,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setSaving(true);
          try {
            await ApiService.patch(`/inventario/productos/${id}/toggle`, {});
            setSuccess(`Variante deshabilitada correctamente.`);
            loadData();
            setTimeout(() => setSuccess(""), 4000);
          } catch (err: any) {
            setError(err.message || "Error al cambiar estado de la variante.");
          } finally {
            setSaving(false);
          }
        },
      });
    } else {
      (async () => {
        setSaving(true);
        try {
          await ApiService.patch(`/inventario/productos/${id}/toggle`, {});
          setSuccess(`Variante habilitada correctamente.`);
          loadData();
          setTimeout(() => setSuccess(""), 4000);
        } catch (err: any) {
          setError(err.message || "Error al cambiar estado de la variante.");
        } finally {
          setSaving(false);
        }
      })();
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
          <p className="text-xs text-[var(--muted-foreground)] font-medium">Administra diseños base y sus variantes de color y serie</p>
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
              <div key={m.id} className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${
                !m.active ? "opacity-60 bg-[var(--muted)]/20" : ""
              }`}>
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
                        {!m.active && (
                          <span className="px-2 py-0.5 bg-red-500/15 text-red-500 rounded-lg text-[10px] font-bold">Deshabilitado</span>
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
                      {online && (
                        <>
                          <button type="button" onClick={() => openAddColorModal(m)}
                            title="Añadir un nuevo color a este modelo"
                            className="px-3 py-2 text-xs font-bold rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-all flex items-center gap-1 shadow-sm">
                            <Plus size={13} />
                            <span>Añadir Color</span>
                          </button>
                          <button type="button" onClick={() => handleToggleModel(m.id, m.name, m.active)}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                              m.active
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                            }`}>
                            {m.active ? "Deshabilitar" : "Habilitar"}
                          </button>
                          <button type="button" onClick={() => handleDeleteModel(m.id, m.name)}
                            title="Eliminar modelo permanentemente"
                            className="px-3 py-2 text-xs font-semibold rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1">
                            <Trash2 size={13} />
                            <span>Eliminar</span>
                          </button>
                        </>
                      )}
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
                      {uniqueColors.map(col => {
                        const countActive = products.filter(p => p.color === col && p.activo).length;
                        const countTotal = products.filter(p => p.color === col).length;

                        return (
                          <button key={col} onClick={() => setSelectedColorForModel(prev => ({ ...prev, [m.id]: col }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                              activeColor === col
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-slate-400"
                            }`}>
                            <span>{col}</span>
                            {countActive < countTotal && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Contiene variantes deshabilitadas" />
                            )}
                          </button>
                        );
                      })}
                      {online && (
                        <button type="button" onClick={() => openAddColorModal(m)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-colors flex items-center gap-1">
                          <Plus size={12} />
                          <span>+ Añadir Color</span>
                        </button>
                      )}
                    </div>

                    {/* Tabla/Listado de Series para el Color Seleccionado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products.filter(p => p.color === activeColor).map(p => {
                        const tallas = p.tallas || [];
                        const totalStock = tallas.reduce((acc, t) => acc + (t.cantidad || 0), 0);

                        return (
                          <div key={p.id} className={`bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm transition-all ${
                            !p.activo ? "opacity-60 bg-[var(--muted)]/10 border-dashed" : ""
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider block">Código Variante</span>
                                  {!p.activo && (
                                    <span className="px-1.5 py-0.5 bg-red-500/15 text-red-500 rounded text-[9px] font-bold leading-none">Deshabilitada</span>
                                  )}
                                </div>
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

                            {/* Botones de acción */}
                            <div className="flex justify-end items-center gap-2 pt-1">
                              {online && (
                                <button type="button" onClick={() => handleToggleProduct(p.id, p.codigo, p.activo)}
                                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                                    p.activo
                                      ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                                  }`}>
                                  {p.activo ? "Deshabilitar" : "Habilitar"}
                                </button>
                              )}
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

              {/* Sección 3: Series y Precios */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">3. Series y Precios</h5>
                <p className="text-[10px] text-[var(--muted-foreground)] -mt-2">Activa las series que deseas generar y define los precios de compra y venta para cada una.</p>

                <div className="space-y-3">
                  {series.map(s => {
                    const isActive = serieIds.includes(s.id);
                    const prices = seriesPrices[s.id] || { costPrice: "", salePrice: "" };
                    return (
                      <div key={s.id} className={`rounded-xl border transition-all overflow-hidden ${
                        isActive
                          ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm"
                          : "border-[var(--border)] bg-[var(--card)] opacity-70 hover:opacity-100"
                      }`}>
                        {/* Toggle Header */}
                        <button type="button" onClick={() => toggleSerie(s.id)}
                          className="w-full flex items-center justify-between px-4 py-3 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${
                              isActive ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                            }`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                isActive ? "translate-x-5" : "translate-x-0.5"
                              }`} />
                            </div>
                            <span className={`text-sm font-bold ${
                              isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                            }`}>{getNombreSerie(s.nombre)}</span>
                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">({s.nombre})</span>
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">ACTIVA</span>
                          )}
                        </button>

                        {/* Price inputs (solo si está activa) */}
                        {isActive && (() => {
                          const costVal = parseFloat(prices.costPrice);
                          const saleVal = parseFloat(prices.salePrice);
                          const hasCost = !isNaN(costVal) && costVal > 0;
                          const hasSale = !isNaN(saleVal) && saleVal > 0;
                          const suggestedSale = hasCost ? (costVal * 1.30).toFixed(2) : "";
                          const isLoss = hasCost && hasSale && saleVal < costVal;
                          const marginPercent = hasCost && hasSale ? ((saleVal - costVal) / costVal) * 100 : 0;
                          const profitAmount = hasCost && hasSale ? saleVal - costVal : 0;

                          return (
                            <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]/50 space-y-2">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Lbl t="Precio de Compra ($)" req />
                                  <input type="number" min="0.01" step="0.01"
                                    value={prices.costPrice}
                                    onChange={e => setSeriesPrices(prev => ({
                                      ...prev,
                                      [s.id]: { ...prev[s.id], costPrice: e.target.value }
                                    }))}
                                    placeholder="0.00" className={INPUT} />
                                </div>
                                <div>
                                  <Lbl t="Precio de Venta ($)" req />
                                  <input type="number" min="0.01" step="0.01"
                                    value={prices.salePrice}
                                    onChange={e => setSeriesPrices(prev => ({
                                      ...prev,
                                      [s.id]: { ...prev[s.id], salePrice: e.target.value }
                                    }))}
                                    placeholder={suggestedSale ? `$${suggestedSale} (+30%)` : "0.00"}
                                    className={`${INPUT} ${isLoss ? "border-red-500 text-red-500 bg-red-500/5" : ""}`} />
                                </div>
                              </div>

                              {/* Indicador de Margen de Ganancia / Sugerencia 30% */}
                              {hasCost && (
                                <div className="text-[11px] font-semibold pt-1">
                                  {hasSale ? (
                                    isLoss ? (
                                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-1.5">
                                        <AlertCircle size={14} className="shrink-0 animate-bounce" />
                                        <span>⚠️ Venta menor al costo: Margen {marginPercent.toFixed(1)}% (Pérdida de -${Math.abs(profitAmount).toFixed(2)}/par)</span>
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center gap-1.5">
                                        <CheckCircle size={14} className="shrink-0" />
                                        <span>Margen de ganancia: <strong className="font-extrabold">{marginPercent.toFixed(1)}%</strong> (+${profitAmount.toFixed(2)} de utilidad por par)</span>
                                      </div>
                                    )
                                  ) : (
                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-lg flex items-center gap-1.5">
                                      <DollarSign size={14} className="shrink-0" />
                                      <span>Precio sugerido (30% margen): <strong className="font-extrabold">${suggestedSale}</strong> (Ganancia estimada: +${(costVal * 0.30).toFixed(2)})</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[var(--muted)]/20 p-3.5 rounded-xl border border-[var(--border)]">
                  <div>
                    <Lbl t="Stock Físico por Talla (Por Defecto)" req />
                    <input type="number" min="0" value={stockInicial} onChange={e => setStockInicial(e.target.value)} className="px-3 py-1.5 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-semibold focus:outline-none" />
                  </div>
                  <div className="flex items-center text-[10px] text-[var(--muted-foreground)] italic leading-relaxed">
                    Cada talla de las series activadas se creará inicialmente con esta cantidad de stock.
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

      {/* ── MODAL AÑADIR NUEVO COLOR A MODELO EXISTENTE ── */}
      {showAddColorModal && selectedModelForColor && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Palette size={18} className="text-[var(--primary)]" />
                  <span>Añadir Nuevo Color a "{selectedModelForColor.name}"</span>
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Código Base: <span className="font-mono font-bold text-[var(--foreground)]">{selectedModelForColor.baseCode}</span> · Marca: {selectedModelForColor.brand}
                </p>
              </div>
              <button onClick={() => { setShowAddColorModal(false); setSelectedModelForColor(null); }}
                className="p-2 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewColor} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Sección 1: Detalle del Color */}
              <div className="space-y-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl p-4">
                <h5 className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">
                  1. Detalle del Nuevo Color
                </h5>
                <div className="flex gap-4 items-start">
                  <div className="w-16 h-16 bg-[var(--muted)]/40 border-2 border-dashed border-[var(--border)] rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {newColorFoto ? (
                      <img src={newColorFoto} className="w-full h-full object-cover" alt="preview" />
                    ) : (
                      <ImageIcon size={18} className="text-[var(--muted-foreground)] opacity-40" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Lbl t="Nombre del Color" req />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newColorName}
                        onChange={e => setNewColorName(e.target.value)}
                        placeholder="Ej. Azul Marino / Negro-Rojo"
                        className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-semibold focus:outline-none focus:border-[var(--primary)]"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleNewColorFoto}
                        className="w-full text-[10px] text-[var(--muted-foreground)] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-900 file:text-white file:text-[9px] file:font-semibold hover:file:opacity-90 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 2: Series y Precios para este Color */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">
                  2. Series y Precios para este Color
                </h5>
                <p className="text-[10px] text-[var(--muted-foreground)] -mt-2">
                  Activa las series que deseas generar para este nuevo color y asigna sus precios de compra y venta.
                </p>

                <div className="space-y-3">
                  {series.map(s => {
                    const isActive = newColorSerieIds.includes(s.id);
                    const prices = newColorSeriesPrices[s.id] || { costPrice: "", salePrice: "" };
                    return (
                      <div key={s.id} className={`rounded-xl border transition-all overflow-hidden ${
                        isActive
                          ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm"
                          : "border-[var(--border)] bg-[var(--card)] opacity-70 hover:opacity-100"
                      }`}>
                        {/* Toggle Header */}
                        <button type="button" onClick={() => toggleNewColorSerie(s.id)}
                          className="w-full flex items-center justify-between px-4 py-3 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${
                              isActive ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                            }`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                isActive ? "translate-x-5" : "translate-x-0.5"
                              }`} />
                            </div>
                            <span className={`text-sm font-bold ${
                              isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                            }`}>{getNombreSerie(s.nombre)}</span>
                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">({s.nombre})</span>
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">ACTIVA</span>
                          )}
                        </button>

                        {/* Inputs de Precio */}
                        {isActive && (() => {
                          const costVal = parseFloat(prices.costPrice);
                          const saleVal = parseFloat(prices.salePrice);
                          const hasCost = !isNaN(costVal) && costVal > 0;
                          const hasSale = !isNaN(saleVal) && saleVal > 0;
                          const suggestedSale = hasCost ? (costVal * 1.30).toFixed(2) : "";
                          const isLoss = hasCost && hasSale && saleVal < costVal;
                          const marginPercent = hasCost && hasSale ? ((saleVal - costVal) / costVal) * 100 : 0;
                          const profitAmount = hasCost && hasSale ? saleVal - costVal : 0;

                          return (
                            <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]/50 space-y-2">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Lbl t="Precio de Compra ($)" req />
                                  <input type="number" min="0.01" step="0.01"
                                    value={prices.costPrice}
                                    onChange={e => setNewColorSeriesPrices(prev => ({
                                      ...prev,
                                      [s.id]: { ...prev[s.id], costPrice: e.target.value }
                                    }))}
                                    placeholder="0.00" className={INPUT} />
                                </div>
                                <div>
                                  <Lbl t="Precio de Venta ($)" req />
                                  <input type="number" min="0.01" step="0.01"
                                    value={prices.salePrice}
                                    onChange={e => setNewColorSeriesPrices(prev => ({
                                      ...prev,
                                      [s.id]: { ...prev[s.id], salePrice: e.target.value }
                                    }))}
                                    placeholder={suggestedSale ? `$${suggestedSale} (+30%)` : "0.00"}
                                    className={`${INPUT} ${isLoss ? "border-red-500 text-red-500 bg-red-500/5" : ""}`} />
                                </div>
                              </div>

                              {/* Indicadores de Ganancia */}
                              {hasCost && (
                                <div className="text-[11px] font-semibold pt-1">
                                  {hasSale ? (
                                    isLoss ? (
                                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-1.5">
                                        <AlertCircle size={14} className="shrink-0 animate-bounce" />
                                        <span>⚠️ Venta menor al costo: Margen {marginPercent.toFixed(1)}% (Pérdida de -${Math.abs(profitAmount).toFixed(2)}/par)</span>
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center gap-1.5">
                                        <CheckCircle size={14} className="shrink-0" />
                                        <span>Margen de ganancia: <strong className="font-extrabold">{marginPercent.toFixed(1)}%</strong> (+${profitAmount.toFixed(2)} de utilidad por par)</span>
                                      </div>
                                    )
                                  ) : (
                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-lg flex items-center gap-1.5">
                                      <DollarSign size={14} className="shrink-0" />
                                      <span>Precio sugerido (30% margen): <strong className="font-extrabold">${suggestedSale}</strong> (Ganancia estimada: +${(costVal * 0.30).toFixed(2)})</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[var(--muted)]/20 p-3.5 rounded-xl border border-[var(--border)]">
                  <div>
                    <Lbl t="Stock Físico por Talla (Por Defecto)" req />
                    <input type="number" min="0" value={newColorStockInicial} onChange={e => setNewColorStockInicial(e.target.value)} className="px-3 py-1.5 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-semibold focus:outline-none" />
                  </div>
                  <div className="flex items-center text-[10px] text-[var(--muted-foreground)] italic leading-relaxed">
                    Cada talla de las series activadas se creará inicialmente con esta cantidad de stock.
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
                {saving ? <><Loader2 size={16} className="animate-spin" />Añadiendo nuevo color...</> : <><Palette size={16} />Añadir Color al Modelo</>}
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
                <div>
                  <Lbl t="Precio de Costo ($)" req />
                  <input type="number" min="0.01" step="0.01" value={newCosto} onChange={e => setNewCosto(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <Lbl t="Precio de Venta ($)" req />
                  <input type="number" min="0.01" step="0.01" value={newVenta} onChange={e => setNewVenta(e.target.value)} className={INPUT} />
                </div>
              </div>

              {/* Recomendación y Margen de Rentabilidad */}
              {(() => {
                const c = parseFloat(newCosto) || 0;
                const v = parseFloat(newVenta) || 0;
                const rec20 = c > 0 ? (c * 1.20).toFixed(2) : "0.00";
                const diff = v - c;
                const pct = c > 0 ? ((diff / c) * 100).toFixed(1) : "0";
                const esPerdida = c > 0 && v < c;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)] text-xs">
                      <div>
                        <span className="text-[var(--muted-foreground)]">Recomendación (+20% mínimo): </span>
                        <span className="font-bold text-emerald-500">${rec20}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewVenta(rec20)}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold rounded-lg text-[10px] transition-colors"
                      >
                        Aplicar +20%
                      </button>
                    </div>

                    {c > 0 && (
                      <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        esPerdida
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse font-bold"
                          : parseFloat(pct) >= 20
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-semibold"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-500 font-semibold"
                      }`}>
                        <div>
                          {esPerdida ? "⚠️ PÉRDIDA DETECTADA" : "Ganancia Estimada:"}
                        </div>
                        <div>
                          ${diff.toFixed(2)} ({pct}%)
                        </div>
                      </div>
                    )}

                    {esPerdida && (
                      <div className="p-3 bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs rounded-xl font-bold flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0 text-rose-500 animate-bounce" />
                        <span>¡ALERTA ROJA! El precio de venta es MENOR al costo de compra. Estás vendiendo a pérdida.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

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

      {/* ── Modal de Confirmación Global (reemplaza window.confirm) ── */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in"
            onClick={e => e.stopPropagation()}
            style={{ animation: "modalSlideIn 0.2s ease-out" }}>
            {/* Header */}
            <div className={`p-5 flex items-start gap-4 ${confirmModal.danger ? "bg-red-500/5" : "bg-amber-500/5"}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                confirmModal.danger
                  ? "bg-red-500/15 text-red-500"
                  : "bg-amber-500/15 text-amber-500"
              }`}>
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base">{confirmModal.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mt-1.5 whitespace-pre-line leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border)]">
              <button type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 hover:bg-[var(--muted)] transition-colors">
                {confirmModal.cancelText || "Cancelar"}
              </button>
              <button type="button"
                onClick={() => confirmModal.onConfirm()}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  confirmModal.danger
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                    : "bg-[var(--primary)] hover:opacity-90 text-white"
                }`}>
                {confirmModal.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
