"use client";

import { useState, useEffect } from "react";
import { db } from "../db/local-db";
import { ApiService } from "../services/api.service";
import {
  Search, Loader2, Package, TrendingUp, TrendingDown,
  RefreshCw, AlertTriangle, X, CheckCircle, AlertCircle, ImageIcon
} from "lucide-react";

interface InventarioProps {
  online: boolean;
  userRole?: string;
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
  fotoUrl?: string;
  precioCosto: number;
  precioVenta: number;
  serie?: { nombre: string };
  tallas: Talla[];
}

const INPUT = "w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] transition-colors";

function Lbl({ t, req }: { t: string; req?: boolean }) {
  return (
    <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
      {t}{req && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

export default function InventarioComponent({ online, userRole }: InventarioProps) {
  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Producto | null>(null);
  const [success, setSuccess] = useState("");

  // Modal movimiento
  const [showMovModal, setShowMovModal] = useState(false);
  const [movType, setMovType] = useState<"entrada" | "salida">("entrada");
  const [movProd, setMovProd] = useState<Producto | null>(null);
  const [movTallaId, setMovTallaId] = useState("");
  const [movCantidad, setMovCantidad] = useState("1");
  const [movMotivo, setMovMotivo] = useState("");
  const [movError, setMovError] = useState("");
  const [movSaving, setMovSaving] = useState(false);

  // Multiformato (Pares Sueltos vs Serie Completa)
  const [ingresoFormato, setIngresoFormato] = useState<"suelto" | "serie">("suelto");
  const [serieMultiplicador, setSerieMultiplicador] = useState<number>(1);
  const [loteCantidades, setLoteCantidades] = useState<Record<string, number>>({});

  const isAdmin = !userRole || userRole === "ROL_ADMIN";
  const isBodeguero = userRole === "ROL_BODEGUERO";
  const canMove = isAdmin || isBodeguero;

  useEffect(() => { loadProducts(); }, [online]);

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
      const paresPorTallaDefault = Math.max(1, Math.floor(12 / p.tallas.length));
      p.tallas.forEach((t) => {
        initialLote[t.id] = paresPorTallaDefault;
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
      if (movType === "entrada" && ingresoFormato === "serie") {
        const items = Object.entries(loteCantidades)
          .map(([tallaId, cant]) => ({ tallaId, cantidad: Number(cant) || 0 }))
          .filter((i) => i.cantidad > 0);

        if (items.length === 0) {
          setMovError("Ingresa al menos 1 par en alguna talla de la serie.");
          setMovSaving(false);
          return;
        }

        await ApiService.post(`/inventario/productos/${movProd.id}/entrada-lote`, {
          items,
          motivo: movMotivo.trim(),
        });

        const totalPares = items.reduce((s, i) => s + i.cantidad, 0);
        setSuccess(`Entrada por Serie Completa (${totalPares} pares) registrada correctamente.`);
      } else {
        if (!movTallaId || !movCantidad || parseInt(movCantidad) <= 0) {
          setMovError("Selecciona una talla y una cantidad mayor a cero.");
          setMovSaving(false);
          return;
        }
        const endpoint =
          movType === "entrada"
            ? `/inventario/productos/${movProd.id}/entrada`
            : `/inventario/productos/${movProd.id}/salida`;
        await ApiService.post(endpoint, {
          tallaId: movTallaId,
          cantidad: parseInt(movCantidad),
          motivo: movMotivo.trim(),
        });
        setSuccess(`${movType === "entrada" ? "Entrada" : "Salida"} de stock registrada correctamente.`);
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

  const stockTotal = (p: Producto) => {
    const list = p.tallas || (p as any).stockPorTalla || [];
    return Array.isArray(list) ? list.reduce((s, t) => s + (t.stock ?? t.cantidad ?? t.disponible ?? 0), 0) : 0;
  };

  const stockBajo = (p: Producto) => {
    const list = p.tallas || (p as any).stockPorTalla || [];
    const total = stockTotal(p);
    if (total <= 12) return true;
    return Array.isArray(list) && list.some(t => {
      const qty = t.stock ?? t.cantidad ?? t.disponible ?? 0;
      const min = t.stockMinimo || 0;
      return min > 0 ? qty <= min : qty === 0;
    });
  };

  const totalParesLote = Object.values(loteCantidades).reduce((sum, val) => sum + (Number(val) || 0), 0);

  const filteredProducts = products.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q) ||
      p.marca.toLowerCase().includes(q) ||
      p.modelo.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--muted-foreground)] font-medium">Control físico de existencias por modelo y talla en tiempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadProducts} className="p-2.5 border border-[var(--border)] rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-3 text-[var(--muted-foreground)]" />
            <input type="text" placeholder="Buscar calzado..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]" />
          </div>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl">
          <CheckCircle size={16} /> <span>{success}</span>
        </div>
      )}

      {/* Grid de Productos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[#0F172A] mb-2" size={32} />
          <span className="text-sm">Cargando inventario...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          No se encontraron productos en el inventario.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const total = stockTotal(p);
            const bajo = stockBajo(p);
            return (
              <div key={p.id} onClick={() => setSelected(selected?.id === p.id ? null : p)}
                className={`bg-[var(--card)] border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${selected?.id === p.id ? "border-[#0F172A] ring-1 ring-[#0F172A]" : "border-[var(--border)]"}`}>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
                    {p.fotoUrl ? <img src={p.fotoUrl} alt={p.nombre} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-[var(--muted-foreground)] opacity-40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">{p.marca} · {p.modelo}</span>
                        <h4 className="font-bold text-sm truncate text-[var(--foreground)]">{p.nombre}</h4>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${total === 0 ? "bg-red-500/10 text-red-500" : bajo ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                        {total} pares
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(p.tallas || []).map((t, idx) => {
                        const st = t.stock ?? t.cantidad ?? t.disponible ?? 0;
                        const min = t.stockMinimo || 0;
                        const num = t.nombre || t.numero;
                        return (
                          <span key={t.id || idx} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${st === 0 ? "bg-red-500/10 text-red-500 border-red-500/20" : min > 0 && st <= min ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>
                            T{num}: {st}
                          </span>
                        );
                      })}
                    </div>
                    {selected?.id === p.id && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                          <span>Costo: <strong>${Number(p.precioCosto).toFixed(2)}</strong></span>
                          <span>Venta: <strong className="text-[#0F172A]">${Number(p.precioVenta).toFixed(2)}</strong></span>
                        </div>
                        {canMove && (
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); openMovimiento(p, "entrada"); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-semibold hover:bg-emerald-500/20 transition-colors">
                              <TrendingUp size={13} /> Entrada
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openMovimiento(p, "salida"); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition-colors">
                              <TrendingDown size={13} /> Salida
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL MOVIMIENTO MULTIFORMATO */}
      {showMovModal && movProd && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                <div className="p-1 bg-[var(--muted)]/60 border border-[var(--border)] rounded-xl flex items-center gap-1">
                  <button type="button" onClick={() => setIngresoFormato("suelto")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${ingresoFormato === "suelto" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>👟 Pares Sueltos</button>
                  <button type="button" onClick={() => setIngresoFormato("serie")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${ingresoFormato === "serie" ? "bg-emerald-600 text-white shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>📦 Serie Completa</button>
                </div>
              )}
              {(movType === "salida" || ingresoFormato === "suelto") && (
                <>
                  <div>
                    <Lbl t="Talla Seleccionada" req />
                    <select value={movTallaId} onChange={(e) => setMovTallaId(e.target.value)} className={INPUT}>
                      <option value="">Seleccionar talla...</option>
                      {movProd.tallas?.map((t) => <option key={t.id} value={t.id}>Talla {t.nombre || t.numero} (stock: {t.stock})</option>)}
                    </select>
                  </div>
                  <div>
                    <Lbl t="Cantidad de Pares" req />
                    <input type="number" min="1" value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} className={INPUT} />
                  </div>
                </>
              )}
              {movType === "entrada" && ingresoFormato === "serie" && (
                <div className="space-y-4">
                  <div>
                    <Lbl t="Multiplicador de Serie" />
                    <div className="grid grid-cols-3 gap-2">
                      {[0.5, 1, 2].map(m => (
                        <button key={m} type="button" onClick={() => aplicarPresetSerie(m)} className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${serieMultiplicador === m ? "bg-emerald-500/10 border-emerald-500 text-emerald-600" : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}>
                          {m === 0.5 ? "½ Docena (6p)" : m === 1 ? "1 Docena (12p)" : "2 Docenas (24p)"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Lbl t="Desglose por Talla" />
                      <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Total: {totalParesLote} pares</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl">
                      {movProd.tallas?.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-bold text-[var(--foreground)] w-20">Talla {t.nombre || t.numero}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">Stock: {t.stock}</span>
                          <input type="number" min="0" value={loteCantidades[t.id] ?? 0} onChange={(e) => setLoteCantidades({...loteCantidades, [t.id]: Math.max(0, parseInt(e.target.value) || 0)})} className="w-16 px-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded-lg text-center font-bold text-xs" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <Lbl t="Motivo / Documento" req />
                <input type="text" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder={movType === "entrada" ? "Ej. Factura Proveedor N° 001" : "Ej. Ajuste de inventario"} className={INPUT} />
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
    </div>
  );
}
