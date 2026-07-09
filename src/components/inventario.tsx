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
  nombre: string;
  stock: number;
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

const INPUT = "w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] transition-colors";

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
    setMovTallaId(p.tallas?.[0]?.id || "");
    setMovCantidad("1");
    setMovMotivo("");
    setMovError("");
    setShowMovModal(true);
  };

  const handleMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movProd) return;
    setMovError("");
    if (!movTallaId || !movCantidad || !movMotivo) {
      setMovError("Completa todos los campos.");
      return;
    }
    setMovSaving(true);
    try {
      const endpoint = movType === "entrada"
        ? `/inventario/productos/${movProd.id}/entrada`
        : `/inventario/productos/${movProd.id}/salida`;
      await ApiService.post(endpoint, {
        tallaId: movTallaId,
        cantidad: parseInt(movCantidad),
        motivo: movMotivo,
      });
      setSuccess(`${movType === "entrada" ? "Entrada" : "Salida"} de stock registrada correctamente.`);
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

  const stockTotal = (p: Producto) =>
    Array.isArray(p.tallas) ? p.tallas.reduce((s, t) => s + (t.stock || 0), 0) : 0;

  const stockBajo = (p: Producto) =>
    Array.isArray(p.tallas) && p.tallas.some(t => t.stock <= t.stockMinimo);

  const filtered = products.filter(p =>
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    p.marca?.toLowerCase().includes(search.toLowerCase())
  );

  const totalProductos = products.length;
  const totalStockBajo = products.filter(stockBajo).length;
  const totalUnidades = products.reduce((s, p) => s + stockTotal(p), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Inventario</h3>
          <p className="text-xs text-[var(--muted-foreground)]">Consulta el stock actual y registra movimientos de entrada/salida</p>
        </div>
        <button onClick={loadProducts} className="flex items-center gap-2 p-2.5 border border-[var(--border)] rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors self-start">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Modelos", value: totalProductos, color: "text-[var(--primary)]" },
          { label: "Unidades totales", value: totalUnidades, color: "text-emerald-600" },
          { label: "Stock bajo", value: totalStockBajo, color: totalStockBajo > 0 ? "text-red-500" : "text-emerald-600" },
        ].map(k => (
          <div key={k.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-center">
            <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
        <input type="text" placeholder="Buscar por código, nombre o marca..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] transition-colors" />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[var(--primary)] mb-3" size={36} />
          <span className="text-sm">Cargando inventario...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-[var(--card)] border border-[var(--border)] border-dashed rounded-2xl text-[var(--muted-foreground)]">
          <Package size={48} className="mb-4 opacity-30" />
          <p className="font-semibold">Sin productos en inventario</p>
          <p className="text-xs mt-1">Ve a "Catálogo de Modelos" para agregar nuevos productos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const st = stockTotal(p);
            const bajo = stockBajo(p);
            return (
              <div key={p.id}
                className={`bg-[var(--card)] border rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer ${selected?.id === p.id ? "border-[var(--primary)]/50 shadow-md" : "border-[var(--border)]"}`}
                onClick={() => setSelected(s => s?.id === p.id ? null : p)}>
                <div className="flex items-start gap-4">
                  {/* Imagen */}
                  <div className="w-14 h-14 rounded-xl bg-[var(--muted)]/40 flex items-center justify-center shrink-0 overflow-hidden">
                    {p.fotoUrl
                      ? <img src={p.fotoUrl} alt={p.nombre} className="w-full h-full object-cover" />
                      : <ImageIcon size={20} className="text-[var(--muted-foreground)] opacity-40" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm">{p.nombre}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{p.marca} · {p.modelo} · <span className="font-mono text-[10px]">{p.codigo}</span></div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-black ${st < 10 ? "text-red-500" : "text-emerald-600"}`}>{st}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">unidades</div>
                      </div>
                    </div>

                    {/* Tallas */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Array.isArray(p.tallas) && p.tallas.map(t => (
                        <span key={t.id}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                            t.stock === 0 ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : t.stock <= t.stockMinimo ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          }`}>
                          T{t.nombre}: {t.stock}
                        </span>
                      ))}
                    </div>

                    {/* Alertas y acciones */}
                    {selected?.id === p.id && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                          <span>Costo: <strong>${Number(p.precioCosto).toFixed(2)}</strong></span>
                          <span>Venta: <strong className="text-[var(--primary)]">${Number(p.precioVenta).toFixed(2)}</strong></span>
                          {p.material && <span>· {p.material}</span>}
                        </div>
                        {canMove && (
                          <div className="flex items-center gap-2">
                            <button onClick={e => { e.stopPropagation(); openMovimiento(p, "entrada"); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-semibold hover:bg-emerald-500/20 transition-colors">
                              <TrendingUp size={13} /> Entrada
                            </button>
                            <button onClick={e => { e.stopPropagation(); openMovimiento(p, "salida"); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition-colors">
                              <TrendingDown size={13} /> Salida
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {bajo && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-600 font-semibold">
                    <AlertTriangle size={11} /> Algunas tallas están por debajo del stock mínimo
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL MOVIMIENTO */}
      {showMovModal && movProd && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {movType === "entrada"
                    ? <TrendingUp size={16} className="text-emerald-600" />
                    : <TrendingDown size={16} className="text-red-500" />}
                  <h3 className="font-bold text-base">
                    {movType === "entrada" ? "Entrada de Stock" : "Salida de Stock"}
                  </h3>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{movProd.nombre} · {movProd.codigo}</p>
              </div>
              <button onClick={() => setShowMovModal(false)} className="p-2 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleMovimiento} className="p-5 space-y-4">
              <div>
                <Lbl t="Talla" req />
                <select value={movTallaId} onChange={e => setMovTallaId(e.target.value)} className={INPUT}>
                  <option value="">Seleccionar talla...</option>
                  {movProd.tallas?.map(t => (
                    <option key={t.id} value={t.id}>Talla {t.nombre} (stock actual: {t.stock})</option>
                  ))}
                </select>
              </div>
              <div>
                <Lbl t="Cantidad" req />
                <input type="number" min="1" value={movCantidad} onChange={e => setMovCantidad(e.target.value)} className={INPUT} />
              </div>
              <div>
                <Lbl t="Motivo" req />
                <input type="text" value={movMotivo} onChange={e => setMovMotivo(e.target.value)}
                  placeholder={movType === "entrada" ? "Ej. Recepción de pedido proveedor" : "Ej. Venta directa, ajuste de inventario"}
                  className={INPUT} />
              </div>
              {movError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {movError}
                </div>
              )}
              <button type="submit" disabled={movSaving}
                className={`w-full py-3 text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 ${
                  movType === "entrada" ? "bg-emerald-600" : "bg-red-500"
                }`}>
                {movSaving ? <><Loader2 size={16} className="animate-spin" />Registrando...</>
                  : movType === "entrada"
                  ? <><TrendingUp size={16} />Registrar Entrada</>
                  : <><TrendingDown size={16} />Registrar Salida</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
