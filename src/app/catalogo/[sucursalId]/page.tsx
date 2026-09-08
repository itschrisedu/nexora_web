"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface TallaItem {
  tallaId: string;
  numero: number;
  cantidad: number;
  stock: number;
}

interface VarianteItem {
  id: string;
  code: string;
  color: string;
  imageUrl: string | null;
  costPrice: number;
  salePrice: number;
  serieNombre: string;
  serieId: string;
  tallas: TallaItem[];
}

interface ModeloItem {
  id: string;
  baseCode: string;
  name: string;
  brand: string;
  material: string | null;
  variantes: VarianteItem[];
}

interface SucursalInfo {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  whatsappContacto: string;
}

interface NegocioInfo {
  tenantId: string;
  nombreNegocio: string;
  direccion: string;
  telefono: string;
  email: string;
  logoUrl: string | null;
  ruc: string;
  whatsappContacto: string;
  mostrarPreciosPublico: boolean;
  mostrarStockPublico: boolean;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
}

interface SucursalCatalog {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  whatsapp: string;
  isCurrent: boolean;
}

interface CatalogoData {
  sucursalActual: SucursalInfo;
  negocio: NegocioInfo;
  sucursales: SucursalCatalog[];
  modelos: ModeloItem[];
}

export default function CatalogoSucursalPage() {
  const params = useParams();
  const sucursalId = params?.sucursalId as string;

  const [data, setData] = useState<CatalogoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedVariante, setSelectedVariante] = useState<VarianteItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!sucursalId) return;
    const fetchCatalogo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/catalogo/sucursal/${sucursalId}`);
        if (!res.ok) throw new Error("No se pudo cargar el catálogo");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogo();
  }, [sucursalId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm font-medium">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">👟</div>
          <h2 className="text-2xl font-bold text-white">No se pudo cargar el catálogo</h2>
          <p className="text-white/60 text-sm">{error}</p>
          <a href="/landing" className="inline-block px-6 py-2 bg-amber-400/10 text-amber-400 font-bold text-sm rounded-xl hover:bg-amber-400/20 transition-all">
            ← Volver al Inicio
          </a>
        </div>
      </div>
    );
  }

  const { negocio, sucursales, modelos, sucursalActual } = data;
  const mostrarPrecios = negocio.mostrarPreciosPublico;
  const mostrarStock = negocio.mostrarStockPublico;

  // Filtros
  const allColors = [...new Set(modelos.flatMap((m) => m.variantes.map((v) => v.color)))].sort();
  const allBrands = [...new Set(modelos.map((m) => m.brand))].sort();

  const filteredModelos = modelos.filter((m) => {
    const matchSearch = searchTerm === "" ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.baseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBrand = selectedBrand === "" || m.brand === selectedBrand;
    const matchColor = selectedColor === "" || m.variantes.some((v) => v.color === selectedColor);
    return matchSearch && matchBrand && matchColor;
  });

  const totalVariantes = modelos.reduce((acc, m) => acc + m.variantes.length, 0);

  const handleWhatsAppPedido = (variante: VarianteItem, modelo: ModeloItem) => {
    const tallasDisp = variante.tallas.filter((t) => t.stock > 0).map((t) => `Talla ${t.numero}`).join(", ");
    const msg = `Hola ${sucursalActual.nombre}, me interesa el modelo:\n\n` +
      `👟 *${modelo.name}* (${modelo.brand})\n` +
      `🎨 Color: ${variante.color}\n` +
      `📐 Serie: ${variante.serieNombre}\n` +
      (mostrarPrecios ? `💰 Precio: $${variante.salePrice.toFixed(2)}\n` : "") +
      (tallasDisp ? `📏 Tallas disponibles: ${tallasDisp}\n` : "") +
      `\n¿Tienen disponibilidad?`;
    const whatsapp = sucursalActual.whatsappContacto || negocio.whatsappContacto;
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-auto" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ══════ NAVBAR ══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href={`/landing?tenantId=${negocio.tenantId}`} className="text-white/40 hover:text-white/70 transition-colors text-sm">
              ← Inicio
            </a>
            <span className="text-white/10">|</span>
            {negocio.logoUrl ? (
              <img src={negocio.logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover ring-1 ring-amber-400/20" />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 font-black text-[10px]">
                {negocio.nombreNegocio.charAt(0)}
              </div>
            )}
            <div className="hidden md:block">
              <div className="text-xs font-bold">{sucursalActual.nombre}</div>
              <div className="text-[10px] text-white/30">{sucursalActual.direccion}</div>
            </div>
          </div>

          {/* Selector de Sucursal */}
          {sucursales.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 hidden md:block">Sucursal:</span>
              <select
                value={sucursalId}
                onChange={(e) => {
                  window.location.href = `/catalogo/${e.target.value}`;
                }}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-amber-400/30 appearance-none cursor-pointer"
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.nombre} {s.isCurrent ? "(Actual)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <a
            href={`https://wa.me/${sucursalActual.whatsappContacto || negocio.whatsappContacto}?text=${encodeURIComponent("Hola, quiero hacer un pedido")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[11px] font-bold rounded-xl shadow-lg shadow-emerald-500/20"
          >
            💬 Pedir
          </a>
        </div>
      </nav>

      {/* ══════ HEADER + STATS ══════ */}
      <div className="pt-14">
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border-b border-white/5 py-8">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                  Catálogo de <span className="text-amber-400">Calzado</span>
                </h1>
                <p className="text-white/40 text-sm">{sucursalActual.nombre} · {sucursalActual.direccion}</p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-xl font-black text-amber-400">{modelos.length}</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">Modelos</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-amber-400">{totalVariantes}</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">Variantes</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-amber-400">{allBrands.length}</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">Marcas</div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 mt-6">
              <input
                type="text"
                placeholder="🔍 Buscar modelo, código, marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/30"
              />
              {allBrands.length > 1 && (
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/30 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Todas las marcas</option>
                  {allBrands.map((b) => (
                    <option key={b} value={b} className="bg-slate-900">{b}</option>
                  ))}
                </select>
              )}
              {allColors.length > 1 && (
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/30 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Todos los colores</option>
                  {allColors.map((c) => (
                    <option key={c} value={c} className="bg-slate-900">{c}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ GRID DE MODELOS ══════ */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {filteredModelos.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-5xl">🔍</div>
            <h3 className="text-lg font-bold text-white/60">No se encontraron modelos</h3>
            <p className="text-sm text-white/30">Intenta con otra búsqueda o quita los filtros</p>
            <button
              onClick={() => { setSearchTerm(""); setSelectedBrand(""); setSelectedColor(""); }}
              className="px-4 py-2 bg-amber-400/10 text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-400/20 transition-all"
            >
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredModelos.map((modelo) =>
              modelo.variantes
                .filter((v) => selectedColor === "" || v.color === selectedColor)
                .map((variante) => {
                  const tallasConStock = variante.tallas.filter((t) => t.stock > 0);
                  const stockTotal = variante.tallas.reduce((a, t) => a + t.stock, 0);

                  return (
                    <div
                      key={variante.id}
                      className="group bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 rounded-2xl overflow-hidden hover:border-amber-400/20 transition-all duration-300 hover:shadow-xl hover:shadow-amber-400/5 cursor-pointer"
                      onClick={() => { setSelectedVariante(variante); setShowModal(true); }}
                    >
                      {/* Imagen */}
                      <div className="relative aspect-square bg-slate-900/50 overflow-hidden">
                        {variante.imageUrl ? (
                          <img
                            src={variante.imageUrl}
                            alt={`${modelo.name} - ${variante.color}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <span className="text-5xl">👟</span>
                            <span className="text-white/20 text-xs">{variante.code}</span>
                          </div>
                        )}
                        {/* Badge Stock */}
                        {mostrarStock && (
                          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm ${
                            stockTotal > 0 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/20 text-rose-400 border border-rose-500/20"
                          }`}>
                            {stockTotal > 0 ? `${stockTotal} pares` : "Agotado"}
                          </div>
                        )}
                        {/* Badge Serie */}
                        <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-[10px] font-bold text-white/70 border border-white/10">
                          {variante.serieNombre}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-bold text-sm text-white truncate">{modelo.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-white/30 font-medium">{modelo.brand}</span>
                            <span className="text-white/10">·</span>
                            <span className="text-[10px] text-amber-400/60 font-semibold">{variante.color}</span>
                          </div>
                        </div>

                        {mostrarPrecios && (
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-amber-400">${variante.salePrice.toFixed(2)}</span>
                            <span className="text-[10px] text-white/20">c/par</span>
                          </div>
                        )}

                        {/* Tallas Preview */}
                        {mostrarStock && tallasConStock.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tallasConStock.slice(0, 8).map((t) => (
                              <span key={t.tallaId} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[10px] font-semibold text-white/50">
                                {t.numero}
                              </span>
                            ))}
                            {tallasConStock.length > 8 && (
                              <span className="px-2 py-0.5 text-[10px] text-amber-400/60 font-semibold">+{tallasConStock.length - 8}</span>
                            )}
                          </div>
                        )}

                        {/* CTA */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleWhatsAppPedido(variante, modelo); }}
                          className="w-full py-2.5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 hover:from-emerald-500/20 hover:to-emerald-600/20 border border-emerald-500/10 text-emerald-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          📱 Pedir por WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>

      {/* ══════ MODAL DETALLE ══════ */}
      {showModal && selectedVariante && (() => {
        const modelo = modelos.find((m) => m.variantes.some((v) => v.id === selectedVariante.id));
        if (!modelo) return null;
        const tallasConStock = selectedVariante.tallas.filter((t) => t.stock > 0);

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Header Image */}
              <div className="relative aspect-video bg-slate-800 overflow-hidden rounded-t-2xl">
                {selectedVariante.imageUrl ? (
                  <img src={selectedVariante.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-7xl">👟</span>
                  </div>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-xl text-white hover:bg-black/70 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-xl font-black text-white">{modelo.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-amber-400/10 text-amber-400 text-xs font-bold rounded-lg">{modelo.brand}</span>
                    <span className="px-3 py-1 bg-white/5 text-white/60 text-xs font-bold rounded-lg">{selectedVariante.color}</span>
                    <span className="px-3 py-1 bg-white/5 text-white/60 text-xs font-bold rounded-lg">{selectedVariante.serieNombre}</span>
                    {modelo.material && <span className="px-3 py-1 bg-white/5 text-white/40 text-xs font-bold rounded-lg">{modelo.material}</span>}
                  </div>
                </div>

                {mostrarPrecios && (
                  <div className="flex items-baseline gap-2 p-4 bg-amber-400/5 border border-amber-400/10 rounded-xl">
                    <span className="text-3xl font-black text-amber-400">${selectedVariante.salePrice.toFixed(2)}</span>
                    <span className="text-sm text-white/30">por par</span>
                  </div>
                )}

                {/* Tallas */}
                {mostrarStock && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">Tallas Disponibles</h4>
                    {tallasConStock.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {selectedVariante.tallas.map((t) => (
                          <div
                            key={t.tallaId}
                            className={`text-center p-2.5 rounded-xl border text-xs font-bold ${
                              t.stock > 0
                                ? "bg-white/5 border-white/10 text-white"
                                : "bg-white/[0.02] border-white/5 text-white/15 line-through"
                            }`}
                          >
                            <div className="text-sm">{t.numero}</div>
                            {t.stock > 0 && <div className="text-[9px] text-emerald-400/60 mt-0.5">{t.stock}p</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-rose-400/60">Sin stock disponible en esta sucursal</p>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleWhatsAppPedido(selectedVariante, modelo)}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    📱 Pedir por WhatsApp
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-bold text-sm rounded-xl transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-white/5 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {negocio.logoUrl && <img src={negocio.logoUrl} alt="" className="h-5 w-5 rounded object-cover" />}
            <span className="text-white/30 text-xs">{negocio.nombreNegocio} · {sucursalActual.nombre}</span>
          </div>
          <div className="text-white/20 text-[10px]">
            Powered by NEXORA · © {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </div>
  );
}
