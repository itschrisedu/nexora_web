"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import { uploadToCloudinary, deleteFromCloudinary } from "../services/cloudinary.service";
import {
  Plus, Search, Loader2, ImageIcon, Package, Edit2, Edit3, Trash2, AlertTriangle,
  DollarSign, CheckCircle, AlertCircle, X, RefreshCw, ChevronDown, ChevronUp, Palette,
  Layers, Boxes
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

interface SerieTallaConfig {
  id: string;
  numero: number;
}

interface SerieConfig {
  id: string;
  nombre: string;
  activa?: boolean;
  tallas?: SerieTallaConfig[];
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
  ADULTO: "adulto (38-43)",
  JUVENIL: "juvenil (34-38)",
  NINO: "junior (27-32)",
  NINO_PEQUENO_A: "niño (21-26)",
  BEBE: "bebe (18-20)",
  TALLA_GRANDE: "Adulto Grande (43-45)"
};

const getNombreSerie = (s: SerieConfig | string | null | undefined, seriesList?: SerieConfig[]): string => {
  if (!s) return "—";
  let target: SerieConfig | undefined;
  if (typeof s === "string") {
    target = seriesList?.find(x => x.nombre === s || x.id === s);
    if (!target) {
      return SERIES_NOMBRES[s] || s.toLowerCase().replace(/_/g, " ");
    }
  } else {
    target = s;
  }

  if (target && target.tallas && target.tallas.length > 0) {
    const sorted = [...target.tallas].sort((a, b) => a.numero - b.numero);
    const min = sorted[0].numero;
    const max = sorted[sorted.length - 1].numero;
    const nombreClean = target.nombre.toLowerCase().replace(/_/g, " ");
    return `${nombreClean} (${min}-${max})`;
  }

  const nombreClean = target ? target.nombre : String(s);
  return SERIES_NOMBRES[nombreClean] || nombreClean.toLowerCase().replace(/_/g, " ");
};

const INPUT = "w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] transition-colors";

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
  const [series, setSeries] = useState<SerieConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [priceProd, setPriceProd] = useState<Producto | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Tallas personalizadas seleccionadas por serie: { [serieId]: tallaId[] }
  const [customTallas, setCustomTallas] = useState<Record<string, string[]>>({});

  // Modales de Crear / Editar Serie
  const [showCreateSeriesModal, setShowCreateSeriesModal] = useState(false);
  const [newSerieNombre, setNewSerieNombre] = useState("");
  const [newSerieTallasDesde, setNewSerieTallasDesde] = useState("38");
  const [newSerieTallasHasta, setNewSerieTallasHasta] = useState("43");

  const [showEditSeriesModal, setShowEditSeriesModal] = useState(false);
  const [editingSerie, setEditingSerie] = useState<SerieConfig | null>(null);
  const [editSerieNombre, setEditSerieNombre] = useState("");
  const [editSerieTallasDesde, setEditSerieTallasDesde] = useState("");
  const [editSerieTallasHasta, setEditSerieTallasHasta] = useState("");

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
  const [supplierId, setSupplierId] = useState("");
  const [listaProveedores, setListaProveedores] = useState<{ id: string; razonSocial: string; ruc?: string }[]>([]);

  const [newColorName, setNewColorName] = useState("");
  const [newColorFoto, setNewColorFoto] = useState<string | null>(null);
  const [newColorSerieIds, setNewColorSerieIds] = useState<string[]>([]);
  const [newColorSeriesPrices, setNewColorSeriesPrices] = useState<Record<string, { costPrice: string; salePrice: string }>>({});
  const [newColorCustomTallas, setNewColorCustomTallas] = useState<Record<string, string[]>>({});
  const [newColorStockInicial, setNewColorStockInicial] = useState("1");

  const [newCosto, setNewCosto] = useState("");
  const [newVenta, setNewVenta] = useState("");
  const [motivo, setMotivo] = useState("");

  // ── Estado para modal de Edición Integral de Variante ──
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Producto | null>(null);
  const [editProductColor, setEditProductColor] = useState("");
  const [editProductSerieId, setEditProductSerieId] = useState("");
  const [editProductImage, setEditProductImage] = useState<string | null>(null);
  const [editProductImageChanged, setEditProductImageChanged] = useState(false);
  const [editProductCosto, setEditProductCosto] = useState("");
  const [editProductVenta, setEditProductVenta] = useState("");
  const [editProductTallas, setEditProductTallas] = useState<{ tallaId: string; numero: number; cantidad: number }[]>([]);
  const [newTallaNumeroInput, setNewTallaNumeroInput] = useState("");

  // ── Estado para modal de Edición del Modelo Base ──
  const [showEditModel, setShowEditModel] = useState(false);
  const [editModel, setEditModel] = useState<ModeloAgrupado | null>(null);
  const [editModelName, setEditModelName] = useState("");
  const [editModelBrand, setEditModelBrand] = useState("");
  const [editModelBaseCode, setEditModelBaseCode] = useState("");
  const [editModelMaterial, setEditModelMaterial] = useState("");

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
          }
          const provs = await ApiService.get("/proveedores");
          if (Array.isArray(provs)) setListaProveedores(provs);
        } catch {}
      }
    } catch (e: any) {
      console.error("Error cargando modelos:", e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBaseCode("");
    setName("");
    setBrand("");
    setMaterial("");
    setSupplierId("");
    setColors([{ color: "", foto: null }]);
    setSerieIds([]);
    setSeriesPrices({});
    setCustomTallas({});
    setStockInicial("1");
    setError("");
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
        setSeriesPrices(sp => {
          const copy = { ...sp };
          delete copy[id];
          return copy;
        });
        setCustomTallas(ct => {
          const copy = { ...ct };
          delete copy[id];
          return copy;
        });
        return prev.filter(x => x !== id);
      } else {
        const sObj = series.find(s => s.id === id);
        const defaultTallaIds = sObj?.tallas?.map(t => t.id) || [];
        setCustomTallas(ct => ({ ...ct, [id]: defaultTallaIds }));
        setSeriesPrices(sp => ({
          ...sp,
          [id]: { costPrice: "", salePrice: "" }
        }));
        return [...prev, id];
      }
    });
  };

  const toggleTallaInSerie = (serieId: string, tallaId: string) => {
    setCustomTallas(prev => {
      const current = prev[serieId] || [];
      const count = current.filter(id => id === tallaId).length;
      if (count > 0) {
        return { ...prev, [serieId]: current.filter(id => id !== tallaId) };
      } else {
        return { ...prev, [serieId]: [...current, tallaId] };
      }
    });
  };

  const addTallaRepeatInSerie = (serieId: string, tallaId: string) => {
    setCustomTallas(prev => {
      const current = prev[serieId] || [];
      return { ...prev, [serieId]: [...current, tallaId] };
    });
  };

  const removeOneTallaInSerie = (serieId: string, tallaId: string) => {
    setCustomTallas(prev => {
      const current = prev[serieId] || [];
      const idx = current.indexOf(tallaId);
      if (idx > -1) {
        const copy = [...current];
        copy.splice(idx, 1);
        return { ...prev, [serieId]: copy };
      }
      return prev;
    });
  };

  const openAddColorModal = (m: ModeloAgrupado) => {
    setSelectedModelForColor(m);
    setNewColorName("");
    setNewColorFoto(null);

    const existingSerieIds = Array.from(
      new Set((m.products || []).map(p => p.serie?.id).filter(Boolean))
    ) as string[];

    setNewColorSerieIds(existingSerieIds);
    
    const initialPrices: Record<string, { costPrice: string; salePrice: string }> = {};
    const initialCustomTallas: Record<string, string[]> = {};

    existingSerieIds.forEach(sid => {
      const prod = m.products.find(p => p.serie?.id === sid);
      initialPrices[sid] = {
        costPrice: prod ? String(prod.precioCosto) : "",
        salePrice: prod ? String(prod.precioVenta) : "",
      };
      const sObj = series.find(s => s.id === sid);
      initialCustomTallas[sid] = sObj?.tallas?.map(t => t.id) || [];
    });

    setNewColorSeriesPrices(initialPrices);
    setNewColorCustomTallas(initialCustomTallas);
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
        setNewColorCustomTallas(ct => {
          const copy = { ...ct };
          delete copy[id];
          return copy;
        });
        return prev.filter(x => x !== id);
      } else {
        const sObj = series.find(s => s.id === id);
        const defaultTallaIds = sObj?.tallas?.map(t => t.id) || [];
        setNewColorCustomTallas(ct => ({ ...ct, [id]: defaultTallaIds }));
        setNewColorSeriesPrices(sp => ({
          ...sp,
          [id]: { costPrice: "", salePrice: "" }
        }));
        return [...prev, id];
      }
    });
  };

  const toggleTallaInNewColorSerie = (serieId: string, tallaId: string) => {
    setNewColorCustomTallas(prev => {
      const current = prev[serieId] || [];
      const count = current.filter(id => id === tallaId).length;
      if (count > 0) {
        return { ...prev, [serieId]: current.filter(id => id !== tallaId) };
      } else {
        return { ...prev, [serieId]: [...current, tallaId] };
      }
    });
  };

  const addTallaRepeatInNewColorSerie = (serieId: string, tallaId: string) => {
    setNewColorCustomTallas(prev => {
      const current = prev[serieId] || [];
      return { ...prev, [serieId]: [...current, tallaId] };
    });
  };

  const removeOneTallaInNewColorSerie = (serieId: string, tallaId: string) => {
    setNewColorCustomTallas(prev => {
      const current = prev[serieId] || [];
      const idx = current.indexOf(tallaId);
      if (idx > -1) {
        const copy = [...current];
        copy.splice(idx, 1);
        return { ...prev, [serieId]: copy };
      }
      return prev;
    });
  };

  // Handlers para Crear y Editar Series
  const handleCreateSeriesWithTallas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerieNombre.trim()) { setError("Ingresa un nombre para la serie."); return; }
    const desde = parseInt(newSerieTallasDesde);
    const hasta = parseInt(newSerieTallasHasta);
    if (isNaN(desde) || isNaN(hasta) || hasta < desde) {
      setError("Ingresa un rango de tallas válido (ej: 38 a 43).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const createdSerie = await ApiService.post("/configuracion/series-completa", {
        nombre: newSerieNombre,
        tallasDesde: desde,
        tallasHasta: hasta,
      });
      setSuccess(`Serie "${createdSerie.nombre}" creada correctamente.`);
      setShowCreateSeriesModal(false);
      setNewSerieNombre("");
      await loadData();
      if (createdSerie?.id) {
        toggleSerie(createdSerie.id);
      }
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al crear la serie.");
    } finally {
      setSaving(false);
    }
  };

  const openEditSeriesModal = (s: SerieConfig) => {
    setEditingSerie(s);
    setEditSerieNombre(s.nombre);
    const sorted = s.tallas && s.tallas.length > 0 ? [...s.tallas].sort((a, b) => a.numero - b.numero) : [];
    setEditSerieTallasDesde(sorted.length > 0 ? String(sorted[0].numero) : "38");
    setEditSerieTallasHasta(sorted.length > 0 ? String(sorted[sorted.length - 1].numero) : "43");
    setError("");
    setShowEditSeriesModal(true);
  };

  const handleUpdateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSerie) return;
    const desde = parseInt(editSerieTallasDesde);
    const hasta = parseInt(editSerieTallasHasta);
    if (isNaN(desde) || isNaN(hasta) || hasta < desde) {
      setError("Ingresa un rango de tallas válido (ej: 38 a 43).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await ApiService.put(`/configuracion/series/${editingSerie.id}`, {
        nombre: editSerieNombre,
        tallasDesde: desde,
        tallasHasta: hasta,
      });
      setSuccess(`Serie "${editSerieNombre}" actualizada correctamente.`);
      setShowEditSeriesModal(false);
      setEditingSerie(null);
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar la serie.");
    } finally {
      setSaving(false);
    }
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
      let finalImageUrl = newColorFoto || undefined;
      if (newColorFoto && online) {
        finalImageUrl = await uploadToCloudinary(newColorFoto, 'nexora_modelos');
      }

      await ApiService.post(`/inventario/modelos/${selectedModelForColor.id}/colores`, {
        color: newColorName.trim(),
        imageUrl: finalImageUrl,
        serieIds: newColorSerieIds,
        stockInicial: parseInt(newColorStockInicial) || 0,
        seriesPrices: seriesPricesMap,
        customTallas: newColorCustomTallas,
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
      const colorsWithImages = await Promise.all(
        filteredColors.map(async c => {
          let imgUrl = c.foto || undefined;
          if (c.foto && online) {
            imgUrl = await uploadToCloudinary(c.foto, 'nexora_modelos');
          }
          return {
            color: c.color,
            imageUrl: imgUrl,
          };
        })
      );

      await ApiService.post("/inventario/modelos", {
        baseCode,
        name,
        brand,
        material: material || undefined,
        costPrice: firstPrices.costPrice,
        salePrice: firstPrices.salePrice,
        colors: colorsWithImages,
        serieIds,
        stockInicial: parseInt(stockInicial) || 0,
        stockMinimo: 0,
        seriesPrices: seriesPricesMap,
        customTallas,
        supplierId: supplierId || undefined,
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

  // ── Abrir modal de edición integral de variante ──
  const openEditProduct = (p: Producto) => {
    setEditProduct(p);
    setEditProductColor(p.color);
    setEditProductImage(p.fotoUrl || null);
    setEditProductImageChanged(false);
    setEditProductCosto(String(p.precioCosto));
    setEditProductVenta(String(p.precioVenta));
    setEditProductSerieId((p.serie as any)?.id || (p as any).serieId || "");
    const tallasData = (p.tallas || (p as any).stockPorTalla || []).map((t: any) => ({
      tallaId: t.tallaId || t.id,
      numero: t.numero,
      cantidad: t.cantidad ?? t.disponible ?? 0,
    }));
    setEditProductTallas(tallasData);
    setNewTallaNumeroInput("");
    setError("");
    setShowEditProduct(true);
  };

  const handleChangeEditSerie = (newSerieId: string) => {
    setEditProductSerieId(newSerieId);
    const selectedSerie = series.find(s => s.id === newSerieId);
    if (selectedSerie && selectedSerie.tallas) {
      const existingMap: Record<number, number> = {};
      editProductTallas.forEach(t => { existingMap[t.numero] = t.cantidad; });

      const newTallasList = selectedSerie.tallas.map(t => ({
        tallaId: t.id,
        numero: t.numero,
        cantidad: existingMap[t.numero] ?? 0,
      }));
      setEditProductTallas(newTallasList);
    }
  };

  const handleAddCustomTallaToEdit = () => {
    const num = parseInt(newTallaNumeroInput);
    if (isNaN(num) || num < 10 || num > 60) {
      setError("Ingresa un número de talla válido (ej: 38, 39, 44).");
      return;
    }
    if (editProductTallas.some(t => t.numero === num)) {
      setError(`La talla #${num} ya está en la lista.`);
      return;
    }
    setEditProductTallas(prev => [...prev, { tallaId: "", numero: num, cantidad: 0 }].sort((a, b) => a.numero - b.numero));
    setNewTallaNumeroInput("");
    setError("");
  };

  const handleRemoveTallaFromEdit = (numero: number) => {
    setEditProductTallas(prev => prev.filter(t => t.numero !== numero));
  };

  const handleEditProductFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressImageToWebP(reader.result as string);
        setEditProductImage(compressed);
        setEditProductImageChanged(true);
      } catch (err) {
        console.error("Error comprimiendo imagen:", err);
      }
    };
    reader.readAsDataURL(f);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    setError("");

    if (!editProductColor.trim()) {
      setError("El color es obligatorio.");
      return;
    }
    const costo = parseFloat(editProductCosto);
    const venta = parseFloat(editProductVenta);
    if (isNaN(costo) || costo <= 0 || isNaN(venta) || venta <= 0) {
      setError("Los precios deben ser mayores a 0.");
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = editProductImage;
      if (editProductImageChanged && editProductImage && online) {
        // Si la imagen cambió, subir a Cloudinary
        if (editProductImage.startsWith("data:")) {
          finalImageUrl = await uploadToCloudinary(editProductImage, 'nexora_modelos');
        }
      }

      await ApiService.put(`/inventario/productos/${editProduct.id}`, {
        color: editProductColor.trim(),
        imageUrl: finalImageUrl || undefined,
        serieId: editProductSerieId || undefined,
        costPrice: costo,
        salePrice: venta,
        tallas: editProductTallas.map(t => ({
          tallaId: t.tallaId || undefined,
          numero: t.numero,
          cantidad: t.cantidad,
        })),
      });

      setSuccess("Variante actualizada exitosamente.");
      setShowEditProduct(false);
      setEditProduct(null);
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar la variante.");
    } finally {
      setSaving(false);
    }
  };

  // ── Abrir modal de edición del modelo base ──
  const openEditModel = (m: ModeloAgrupado) => {
    setEditModel(m);
    setEditModelName(m.name);
    setEditModelBrand(m.brand);
    setEditModelBaseCode(m.baseCode);
    setEditModelMaterial(m.material || "");
    setError("");
    setShowEditModel(true);
  };

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModel) return;
    setError("");

    if (!editModelName.trim() || !editModelBrand.trim() || !editModelBaseCode.trim()) {
      setError("Nombre, marca y código base son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      await ApiService.put(`/inventario/modelos/${editModel.id}`, {
        name: editModelName.trim(),
        brand: editModelBrand.trim(),
        baseCode: editModelBaseCode.trim(),
        material: editModelMaterial.trim() || undefined,
      });

      setSuccess("Modelo actualizado exitosamente.");
      setShowEditModel(false);
      setEditModel(null);
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar el modelo.");
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
          await ApiService.delete(`/inventario/modelos/${id}`);
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
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
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
          className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] transition-colors" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[#0F172A] mb-3" size={36} />
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
                      <span className="text-sm font-extrabold text-[#0F172A]">
                        {activeProduct ? `$${Number(activeProduct.precioVenta).toFixed(2)}` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {online && (
                        <>
                          <button type="button" onClick={() => openEditModel(m)}
                            title="Editar nombre, marca, código base o material del modelo"
                            className="px-3 py-2 text-xs font-bold rounded-xl bg-blue-600/10 text-blue-600 border border-blue-600/20 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1">
                            <Edit2 size={13} />
                            <span>Editar Modelo</span>
                          </button>
                          <button type="button" onClick={() => openAddColorModal(m)}
                            title="Añadir un nuevo color a este modelo"
                            className="px-3 py-2 text-xs font-bold rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white transition-all flex items-center gap-1 shadow-sm">
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
                    </div>

                    {/* Tabla/Listado de Series para el Color Seleccionado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products.filter(p => p.color === activeColor).map(p => {
                        const tallas = p.tallas || (p as any).stockPorTalla || [];
                        const totalStock = tallas.reduce((acc, t) => acc + (t.cantidad ?? t.disponible ?? 0), 0);

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
                                <span className="text-xs font-extrabold text-[#0F172A]">${Number(p.precioVenta).toFixed(2)}</span>
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
                              <button onClick={() => openEditProduct(p)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-xs">
                                <Edit2 size={12} /><span>Editar Variante</span>
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
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Nuevo Modelo y Variantes</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Crea un diseño base y genera variantes para colores y series en lote</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              
              {/* Sección 1: Datos Base */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">1. Información del Modelo</h5>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><Lbl t="Código Base" req /><input type="text" value={baseCode} onChange={e => setBaseCode(e.target.value)} placeholder="Ej. NK-AIR" className={INPUT} /></div>
                  <div><Lbl t="Nombre del calzado" req /><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Air Max 90" className={INPUT} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><Lbl t="Marca" req /><input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ej. Nike" className={INPUT} /></div>
                  <div><Lbl t="Material" /><input type="text" value={material} onChange={e => setMaterial(e.target.value)} placeholder="Ej. Cuero sintético y malla" className={INPUT} /></div>
                </div>

                <div>
                  <Lbl t="Proveedor Asignado (para Órdenes de Compra Automáticas)" />
                  <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={INPUT}>
                    <option value="">-- Sin Proveedor Asignado --</option>
                    {listaProveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.razonSocial} {p.ruc ? `(${p.ruc})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sección 2: Variantes de Color */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                  <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">2. Colores y Fotografías</h5>
                  <button type="button" onClick={addColorField}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#0F172A] hover:opacity-80 transition-opacity">
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
                          })} placeholder="Ej. Blanco / Negro-Rojo" className="w-full px-2 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[#0F172A]" />
                          
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
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                  <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">3. Series y Precios</h5>
                  <button type="button" onClick={() => { setNewSerieNombre(""); setNewSerieTallasDesde("38"); setNewSerieTallasHasta("43"); setError(""); setShowCreateSeriesModal(true); }}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#0F172A] hover:underline">
                    <Plus size={13} /> <span>Crear Nueva Serie</span>
                  </button>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)] -mt-2">Activa las series que deseas generar, personaliza sus tallas y define precios.</p>

                <div className="space-y-3">
                  {series.map(s => {
                    const isActive = serieIds.includes(s.id);
                    const prices = seriesPrices[s.id] || { costPrice: "", salePrice: "" };
                    const selectedTallaIds = customTallas[s.id] || [];

                    return (
                      <div key={s.id} className={`rounded-xl border transition-all overflow-hidden ${
                        isActive
                          ? "border-[#0F172A] bg-[#0F172A]/5 shadow-sm"
                          : "border-[var(--border)] bg-[var(--card)] opacity-70 hover:opacity-100"
                      }`}>
                        {/* Toggle Header */}
                        <div className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/30">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleSerie(s.id)}>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${
                              isActive ? "bg-[#0F172A]" : "bg-[var(--border)]"
                            }`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                isActive ? "translate-x-5" : "translate-x-0.5"
                              }`} />
                            </div>
                            <span className={`text-sm font-bold ${
                              isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                            }`}>{getNombreSerie(s, series)}</span>
                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">({s.nombre})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => openEditSeriesModal(s)}
                              className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--muted)]/50 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                              title="Editar rango o nombre de esta serie">
                              <Edit2 size={13} />
                              <span>Editar</span>
                            </button>
                            {isActive && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">ACTIVA</span>
                            )}
                          </div>
                        </div>

                        {/* Detalle si la serie está activa */}
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
                            <div className="px-4 pb-4 pt-3 space-y-3">
                              {/* Inputs de Precio */}
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

                              {/* Indicador de Margen 30% */}
                              {hasCost && (
                                <div className="text-[11px] font-semibold">
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

                              {/* Personalizador de Tallas y Media Docena */}
                              <div className="pt-2 border-t border-[var(--border)]/40 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                                    Tallas para esta serie ({selectedTallaIds.length} pares)
                                  </span>
                                  {selectedTallaIds.length === 6 ? (
                                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <CheckCircle size={12} /> Media Docena (6 pares) ✅
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                      {selectedTallaIds.length}/6 pares (sugerido 6 para media docena)
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {s.tallas?.map(t => {
                                    const count = selectedTallaIds.filter(id => id === t.id).length;
                                    return (
                                      <div key={t.id} className="flex items-center">
                                        <button type="button" onClick={() => toggleTallaInSerie(s.id, t.id)}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                                            count > 0
                                              ? "bg-[#0F172A] text-white border-[#0F172A] shadow-sm"
                                              : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] opacity-60 hover:opacity-100"
                                          }`}>
                                          <span>T{t.numero}</span>
                                          {count > 1 && (
                                            <span className="bg-amber-400 text-slate-900 px-1.5 py-0.2 text-[9px] font-black rounded-full">
                                              x{count}
                                            </span>
                                          )}
                                        </button>
                                        {count > 0 && (
                                          <button type="button" onClick={() => addTallaRepeatInSerie(s.id, t.id)}
                                            title={`Repetir talla ${t.numero} para sumar un par extra (media docena)`}
                                            className="ml-0.5 px-1.5 py-0.5 text-[10px] font-black text-[#0F172A] bg-[#0F172A]/10 hover:bg-[#0F172A]/20 rounded-md transition-colors">
                                            +1
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
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
                className="w-full py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" />Generando variantes en lote...</> : <><Plus size={16} />Crear Modelo y Variantes</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AÑADIR NUEVO COLOR A MODELO EXISTENTE ── */}
      {showAddColorModal && selectedModelForColor && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-amber-400 font-bold">
                  <Palette size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Añadir Nuevo Color a "{selectedModelForColor.name}"</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Código Base: <span className="font-mono font-bold text-white">{selectedModelForColor.baseCode}</span> · Marca: {selectedModelForColor.brand}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowAddColorModal(false); setSelectedModelForColor(null); }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewColor} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Sección 1: Detalle del Color */}
              <div className="space-y-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl p-4">
                <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">
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
                        className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
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
                <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">
                  2. Series y Precios para este Color
                </h5>
                <p className="text-[10px] text-[var(--muted-foreground)] -mt-2">
                  Activa las series que deseas generar para este nuevo color y asigna sus precios de compra y venta.
                </p>

                <div className="space-y-3">
                  {series.map(s => {
                    const isActive = newColorSerieIds.includes(s.id);
                    const prices = newColorSeriesPrices[s.id] || { costPrice: "", salePrice: "" };
                    const selectedTallaIds = newColorCustomTallas[s.id] || [];

                    return (
                      <div key={s.id} className={`rounded-xl border transition-all overflow-hidden ${
                        isActive
                          ? "border-[#0F172A] bg-[#0F172A]/5 shadow-sm"
                          : "border-[var(--border)] bg-[var(--card)] opacity-70 hover:opacity-100"
                      }`}>
                        {/* Toggle Header */}
                        <div className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/30">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleNewColorSerie(s.id)}>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${
                              isActive ? "bg-[#0F172A]" : "bg-[var(--border)]"
                            }`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                isActive ? "translate-x-5" : "translate-x-0.5"
                              }`} />
                            </div>
                            <span className={`text-sm font-bold ${
                              isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                            }`}>{getNombreSerie(s, series)}</span>
                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">({s.nombre})</span>
                          </div>

                          {isActive && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">ACTIVA</span>
                          )}
                        </div>

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
                            <div className="px-4 pb-4 pt-3 space-y-3">
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

                              {/* Personalizador de Tallas */}
                              <div className="pt-2 border-t border-[var(--border)]/40 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                                    Tallas para este color ({selectedTallaIds.length} pares)
                                  </span>
                                  {selectedTallaIds.length === 6 ? (
                                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <CheckCircle size={12} /> Media Docena (6 pares) ✅
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                      {selectedTallaIds.length}/6 pares (sugerido 6 para media docena)
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {s.tallas?.map(t => {
                                    const count = selectedTallaIds.filter(id => id === t.id).length;
                                    return (
                                      <div key={t.id} className="flex items-center">
                                        <button type="button" onClick={() => toggleTallaInNewColorSerie(s.id, t.id)}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                                            count > 0
                                              ? "bg-[#0F172A] text-white border-[#0F172A] shadow-sm"
                                              : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] opacity-60 hover:opacity-100"
                                          }`}>
                                          <span>T{t.numero}</span>
                                          {count > 1 && (
                                            <span className="bg-amber-400 text-slate-900 px-1.5 py-0.2 text-[9px] font-black rounded-full">
                                              x{count}
                                            </span>
                                          )}
                                        </button>
                                        {count > 0 && (
                                          <button type="button" onClick={() => addTallaRepeatInNewColorSerie(s.id, t.id)}
                                            title={`Repetir talla ${t.numero} para sumar un par extra (media docena)`}
                                            className="ml-0.5 px-1.5 py-0.5 text-[10px] font-black text-[#0F172A] bg-[#0F172A]/10 hover:bg-[#0F172A]/20 rounded-md transition-colors">
                                            +1
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
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
                className="w-full py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" />Añadiendo nuevo color...</> : <><Palette size={16} />Añadir Color al Modelo</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRECIOS */}
      {showPrice && priceProd && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Actualizar Precios</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">{priceProd.nombre} · Color {priceProd.color} · Tallas {getNombreSerie(priceProd.serie?.nombre ?? "")}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrice(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
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
                className="w-full py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" />Guardando...</> : <><DollarSign size={16} />Actualizar Precios</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CREAR SERIE PERSONALIZADA ── */}
      {showCreateSeriesModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Crear Nueva Serie</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Define un nombre y rango de tallas para la serie (ej: CHINO, 35-40)</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateSeriesModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSeriesWithTallas} className="p-5 space-y-4">
              <div>
                <Lbl t="Nombre de la Serie" req />
                <input type="text" value={newSerieNombre} onChange={e => setNewSerieNombre(e.target.value)}
                  placeholder="Ej. CHINO, ESPECIAL, DAMA..." className={INPUT} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Lbl t="Talla Desde" req />
                  <input type="number" min="1" max="60" value={newSerieTallasDesde}
                    onChange={e => setNewSerieTallasDesde(e.target.value)} className={INPUT} required />
                </div>
                <div>
                  <Lbl t="Talla Hasta" req />
                  <input type="number" min="1" max="60" value={newSerieTallasHasta}
                    onChange={e => setNewSerieTallasHasta(e.target.value)} className={INPUT} required />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateSeriesModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--muted)]">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Crear Serie</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR SERIE EXISTENTE ── */}
      {showEditSeriesModal && editingSerie && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-amber-400 font-bold">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Editar Serie "{editingSerie.nombre}"</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Modifica el nombre o rango de tallas configurado</p>
                </div>
              </div>
              <button
                onClick={() => { setShowEditSeriesModal(false); setEditingSerie(null); }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateSeries} className="p-5 space-y-4">
              <div>
                <Lbl t="Nombre de la Serie" req />
                <input type="text" value={editSerieNombre} onChange={e => setEditSerieNombre(e.target.value)}
                  className={INPUT} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Lbl t="Talla Desde" req />
                  <input type="number" min="1" max="60" value={editSerieTallasDesde}
                    onChange={e => setEditSerieTallasDesde(e.target.value)} className={INPUT} required />
                </div>
                <div>
                  <Lbl t="Talla Hasta" req />
                  <input type="number" min="1" max="60" value={editSerieTallasHasta}
                    onChange={e => setEditSerieTallasHasta(e.target.value)} className={INPUT} required />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditSeriesModal(false); setEditingSerie(null); }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--muted)]">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={14} />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR VARIANTE INTEGRAL ── */}
      {showEditProduct && editProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold">
                  <Boxes size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Editar Variante de Calzado</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {editProduct.codigo} · Modifica color, serie, numeración, stock y precios
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowEditProduct(false); setEditProduct(null); }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateProduct} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Imagen */}
              <div>
                <Lbl t="Imagen del Producto" />
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                    {editProductImage ? (
                      <img src={editProductImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-[var(--muted-foreground)] opacity-40" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 text-blue-600 border border-blue-600/20 rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-600/20 transition-colors">
                      <ImageIcon size={14} />
                      <span>Cambiar Imagen</span>
                      <input type="file" accept="image/*" onChange={handleEditProductFoto} className="hidden" />
                    </label>
                    {editProductImage && (
                      <button type="button" onClick={() => { setEditProductImage(null); setEditProductImageChanged(true); }}
                        className="text-xs text-red-500 hover:underline">
                        Quitar imagen
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Color */}
              <div>
                <Lbl t="Color" req />
                <input type="text" value={editProductColor} onChange={e => setEditProductColor(e.target.value)}
                  className={INPUT} required placeholder="Ej: Negro, Café, Miel..." />
              </div>

              {/* Serie Asociada (Modificar Serie / Numeración) */}
              <div>
                <Lbl t="Serie de Numeración" req />
                <select
                  value={editProductSerieId}
                  onChange={(e) => handleChangeEditSerie(e.target.value)}
                  className={INPUT}
                >
                  <option value="">-- Seleccionar Serie --</option>
                  {series.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getNombreSerie(s.nombre)} {s.tallas && s.tallas.length > 0 ? `(${s.tallas[0].numero}-${s.tallas[s.tallas.length - 1].numero})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock por Tallas / Numeración */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Lbl t="Numeración y Stock (pares por número)" />
                  <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">
                    Total: {editProductTallas.reduce((acc, t) => acc + (t.cantidad || 0), 0)} pares
                  </span>
                </div>

                {editProductTallas.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl">
                    {editProductTallas.sort((a, b) => a.numero - b.numero).map((t, i) => (
                      <div key={t.tallaId || `t-${t.numero}`} className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg flex flex-col justify-between gap-1 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[var(--foreground)]">Talla #{t.numero}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTallaFromEdit(t.numero)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                            title="Quitar esta talla de la variante"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={t.cantidad}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setEditProductTallas(prev => prev.map((tt, ii) => ii === i ? { ...tt, cantidad: val } : tt));
                            }}
                            className="w-full px-2 py-1 bg-[var(--muted)]/40 border border-[var(--border)] rounded text-xs text-center font-bold focus:outline-none focus:border-blue-600"
                            placeholder="0"
                          />
                          <span className="text-[10px] text-[var(--muted-foreground)] font-medium">pares</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)] italic p-2 border border-dashed rounded-lg text-center">
                    No hay tallas asignadas. Selecciona una serie o añade tallas abajo.
                  </p>
                )}

                {/* Formulario rápido para añadir talla adicional a la numeración */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min="10"
                    max="60"
                    placeholder="N° Talla (ej: 44)"
                    value={newTallaNumeroInput}
                    onChange={(e) => setNewTallaNumeroInput(e.target.value)}
                    className="w-32 px-3 py-1.5 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTallaToEdit}
                    className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl text-xs font-bold border border-blue-500/30 flex items-center gap-1 transition-all"
                  >
                    <Plus size={13} />
                    <span>Añadir Talla</span>
                  </button>
                </div>
              </div>

              {/* Precios Unificados */}
              <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Ajuste de Precios
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Lbl t="Precio Costo ($)" req />
                    <input type="number" step="0.01" min="0.01" value={editProductCosto}
                      onChange={e => setEditProductCosto(e.target.value)} className={INPUT} required />
                  </div>
                  <div>
                    <Lbl t="Precio Venta ($)" req />
                    <input type="number" step="0.01" min="0.01" value={editProductVenta}
                      onChange={e => setEditProductVenta(e.target.value)} className={INPUT} required />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditProduct(false); setEditProduct(null); }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--muted)]">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR MODELO BASE ── */}
      {showEditModel && editModel && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-blue-400 font-bold">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Editar Modelo Base</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Modifica los datos base del modelo</p>
                </div>
              </div>
              <button
                onClick={() => { setShowEditModel(false); setEditModel(null); }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateModel} className="p-5 space-y-4">
              <div>
                <Lbl t="Nombre del Modelo" req />
                <input type="text" value={editModelName} onChange={e => setEditModelName(e.target.value)}
                  className={INPUT} required placeholder="Ej: Botín Chelsea" />
              </div>
              <div>
                <Lbl t="Marca" req />
                <input type="text" value={editModelBrand} onChange={e => setEditModelBrand(e.target.value)}
                  className={INPUT} required placeholder="Ej: NEXORA" />
              </div>
              <div>
                <Lbl t="Código Base" req />
                <input type="text" value={editModelBaseCode} onChange={e => setEditModelBaseCode(e.target.value)}
                  className={INPUT} required placeholder="Ej: BCH-001" />
              </div>
              <div>
                <Lbl t="Material (Opcional)" />
                <input type="text" value={editModelMaterial} onChange={e => setEditModelMaterial(e.target.value)}
                  className={INPUT} placeholder="Ej: Cuero genuino" />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditModel(false); setEditModel(null); }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--muted)]">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
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
                    : "bg-[#0F172A] hover:bg-slate-800 text-white"
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
