"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import {
  Plus, Search, Loader2, ImageIcon, Package, Edit2,
  DollarSign, CheckCircle, AlertCircle, X, RefreshCw
} from "lucide-react";

interface ModelosProps {
  online: boolean;
}

interface TallaConfig {
  id: string;
  numero: number;
}

interface Serie {
  id: string;
  nombre: string;
  tallas: TallaConfig[];
}

interface Talla {
  id: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  material?: string;
  fotoUrl?: string;
  precioCosto: number;
  precioVenta: number;
  serie?: { id: string; nombre: string };
  tallas: Talla[];
  activo: boolean;
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
  ADULTO: "Adulto (37-42)",
  JUVENIL: "Juvenil (34-38)",
  NINO: "Junior (27-32)",
  NINO_PEQUENO_A: "Niño (21-26)",
  BEBE: "Bebé (18-20)",
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

export default function ModelosComponent({ online }: ModelosProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [priceProd, setPriceProd] = useState<Producto | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Formulario de creación
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [material, setMaterial] = useState("");
  const [serieId, setSerieId] = useState("");
  const [costo, setCosto] = useState("");
  const [venta, setVenta] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  
  // Tallas dinámicas de la serie elegida
  const [tallasDeSerie, setTallasDeSerie] = useState<TallaConfig[]>([]);
  const [tallasSel, setTallasSel] = useState<string[]>([]); // Almacena los UUIDs de TallaConfig
  const [tallaStock, setTallaStock] = useState<Record<string, number>>({}); // tId -> stock

  const [newCosto, setNewCosto] = useState("");
  const [newVenta, setNewVenta] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => { loadData(); }, [online]);

  // Manejar cambio de serie seleccionada
  useEffect(() => {
    const elegida = series.find(s => s.id === serieId);
    if (elegida && elegida.tallas) {
      setTallasDeSerie(elegida.tallas);
    } else {
      setTallasDeSerie([]);
    }
    setTallasSel([]);
    setTallaStock({});
  }, [serieId, series]);

  const loadData = async () => {
    setLoading(true);
    try {
      const prods = await ApiService.get("/inventario/productos");
      setProductos(Array.isArray(prods) ? prods : []);
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
        } catch {}
      }
    } catch (e: any) {
      console.error("Error cargando catálogo:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onloadend = () => setFoto(reader.result as string);
    reader.readAsDataURL(f);
  };

  const toggleTalla = (tId: string) =>
    setTallasSel(prev => prev.includes(tId) ? prev.filter(x => x !== tId) : [...prev, tId]);

  const resetForm = () => {
    setCodigo(""); setNombre(""); setMarca(""); setModelo(""); setMaterial("");
    setSerieId(""); setCosto(""); setVenta(""); setFoto(null);
    setTallasSel([]);
    setTallaStock({});
    setError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!codigo || !nombre || !marca || !modelo || !serieId || !costo || !venta) {
      setError("Completa todos los campos obligatorios (marcados con *).");
      return;
    }
    if (tallasSel.length === 0) {
      setError("Selecciona al menos una talla disponible.");
      return;
    }
    setSaving(true);
    try {
      const tallasPayload = tallasSel.map(tId => ({
        tallaId: tId,
        stockInicial: tallaStock[tId] || 0,
        stockMinimo: 5,
      }));
      await ApiService.post("/inventario/productos", {
        codigo, nombre, marca, modelo,
        material: material || undefined,
        fotoUrl: foto || undefined,
        precioCosto: parseFloat(costo),
        precioVenta: parseFloat(venta),
        serieId,
        tallas: tallasPayload,
      });
      setSuccess("Modelo creado correctamente.");
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

  const stockTotal = (p: Producto) =>
    Array.isArray(p.tallas) ? p.tallas.reduce((s, t) => s + (t.stock || 0), 0) : 0;

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo.toLowerCase().includes(search.toLowerCase()) ||
    p.marca.toLowerCase().includes(search.toLowerCase()) ||
    p.modelo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Catálogo de Modelos</h3>
          <p className="text-xs text-[var(--muted-foreground)]">Administra los modelos de calzado del inventario</p>
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
        <input type="text" placeholder="Buscar por código, nombre, marca o modelo..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] transition-colors" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[var(--primary)] mb-3" size={36} />
          <span className="text-sm">Cargando catálogo...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-[var(--card)] border border-[var(--border)] border-dashed rounded-2xl text-[var(--muted-foreground)]">
          <Package size={48} className="mb-4 opacity-30" />
          <p className="font-semibold">Sin modelos registrados</p>
          <p className="text-xs mt-1">Haz clic en "Nuevo Modelo" para agregar el primer modelo de calzado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(p => (
            <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="relative h-44 bg-[var(--muted)]/30 flex items-center justify-center overflow-hidden">
                {p.fotoUrl ? (
                  <img src={p.fotoUrl} alt={p.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
                    <ImageIcon size={36} className="opacity-30" />
                    <span className="text-[10px]">Sin imagen</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/80 text-white rounded-lg text-[10px] font-mono font-bold">
                  {p.codigo}
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-sm truncate">{p.nombre}</h4>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">{p.marca} · {p.modelo}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">P. Venta</div>
                    <div className="text-lg font-black text-[var(--primary)]">${Number(p.precioVenta).toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Stock Total</div>
                    <div className={`text-lg font-black ${stockTotal(p) < 10 ? "text-red-500" : "text-emerald-600"}`}>
                      {stockTotal(p)} pares
                    </div>
                  </div>
                </div>
                {Array.isArray(p.tallas) && p.tallas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.tallas.map(t => (
                      <span key={t.id} title={`T${t.nombre}: ${t.stock} pares`}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                          t.stock === 0 ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : t.stock <= t.stockMinimo ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        }`}>
                        {t.nombre}: {t.stock}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <span className="text-[10px] text-[var(--muted-foreground)]">{p.serie?.nombre ? getNombreSerie(p.serie.nombre) : "Sin serie"}</span>
                  <button onClick={() => openPrice(p)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[var(--primary)] border border-[var(--primary)]/30 rounded-lg hover:bg-[var(--primary)]/10 transition-colors">
                    <Edit2 size={11} /> Precios
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Nuevo Modelo de Calzado</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Completa la información para agregar el modelo al catálogo</p>
              </div>
              <button onClick={() => { setShowCreate(false); resetForm(); }}
                className="p-2 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Imagen preview */}
              <div className="flex gap-4 items-start">
                <div className="w-24 h-24 bg-[var(--muted)]/40 border-2 border-dashed border-[var(--border)] rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  {foto ? <img src={foto} className="w-full h-full object-cover" alt="preview" />
                    : <ImageIcon size={24} className="text-[var(--muted-foreground)] opacity-40" />}
                </div>
                <div className="flex-1">
                  <Lbl t="Foto del modelo" />
                  <input type="file" accept="image/*" onChange={handleFoto}
                    className="w-full text-xs text-[var(--muted-foreground)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--primary)] file:text-white file:text-xs file:font-semibold hover:file:opacity-90 cursor-pointer" />
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">JPG, PNG o WEBP recomendado.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Lbl t="Código" req /><input type="text" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ej. CAL-001" className={INPUT} /></div>
                <div><Lbl t="Serie" req />
                  <select value={serieId} onChange={e => setSerieId(e.target.value)} className={INPUT}>
                    <option value="">Seleccionar...</option>
                    {series.map(s => <option key={s.id} value={s.id}>{getNombreSerie(s.nombre)}</option>)}
                    {series.length === 0 && <option value="GENERAL">GENERAL</option>}
                  </select>
                </div>
              </div>

              <div><Lbl t="Nombre del modelo" req /><input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Running Pro 2024" className={INPUT} /></div>

              <div className="grid grid-cols-2 gap-4">
                <div><Lbl t="Marca" req /><input type="text" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ej. Nike" className={INPUT} /></div>
                <div><Lbl t="Referencia / Modelo" req /><input type="text" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Ej. Air Max 90" className={INPUT} /></div>
              </div>

              <div><Lbl t="Material" /><input type="text" value={material} onChange={e => setMaterial(e.target.value)} placeholder="Ej. Cuero sintético, malla respirable" className={INPUT} /></div>

              <div className="grid grid-cols-2 gap-4">
                <div><Lbl t="Precio de Costo ($)" req /><input type="number" min="0.01" step="0.01" value={costo} onChange={e => setCosto(e.target.value)} placeholder="0.00" className={INPUT} /></div>
                <div><Lbl t="Precio de Venta ($)" req /><input type="number" min="0.01" step="0.01" value={venta} onChange={e => setVenta(e.target.value)} placeholder="0.00" className={INPUT} /></div>
              </div>

              {/* Tallas */}
              <div>
                <Lbl t="Tallas disponibles" req />
                {tallasDeSerie.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] italic">Selecciona una serie primero para ver sus tallas configuradas.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tallasDeSerie.map(tc => (
                      <button key={tc.id} type="button" onClick={() => toggleTalla(tc.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                          tallasSel.includes(tc.id)
                            ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                            : "bg-[var(--muted)]/40 text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--primary)]"
                        }`}>
                        {tc.numero}
                      </button>
                    ))}
                  </div>
                )}
                {tallasSel.length > 0 && (
                  <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-4">
                    <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Stock Inicial por Talla</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {tallasDeSerie.filter(tc => tallasSel.includes(tc.id)).map(tc => (
                        <div key={tc.id} className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-[var(--primary)]">T-{tc.numero}</span>
                          <input type="number" min="0" value={tallaStock[tc.id] || 0}
                            onChange={e => setTallaStock(prev => ({ ...prev, [tc.id]: parseInt(e.target.value) || 0 }))}
                            className="w-full text-center px-2 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm font-semibold focus:outline-none focus:border-[var(--primary)]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <button type="submit" disabled={saving}
                className="w-full py-3 bg-[var(--primary)] text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" />Guardando...</> : <><Plus size={16} />Crear Modelo</>}
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
                <p className="text-xs text-[var(--muted-foreground)]">{priceProd.nombre} · {priceProd.codigo}</p>
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
