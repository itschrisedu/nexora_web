"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Menu,
  X,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Search,
  ChevronRight,
  ShieldCheck,
  Truck,
  Award,
  Layers,
  ArrowUpRight,
  Store,
  Clock
} from "lucide-react";
import { getContrastColor } from "@/components/ui/color-picker";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

interface NegocioInfo {
  tenantId: string;
  nombreNegocio: string;
  direccion: string;
  telefono: string;
  email: string;
  logoUrl: string | null;
  primaryColor?: string;
  ruc: string;
  heroTitulo: string;
  heroSubtitulo: string;
  heroBannerUrl: string | null;
  sobreNosotros: string;
  whatsappContacto: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  mostrarPreciosPublico: boolean;
  mostrarStockPublico: boolean;
}

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  whatsapp: string;
  email: string;
  totalModelos: number;
  isMatriz: boolean;
}

interface Variante {
  id: string;
  code: string;
  color: string;
  imageUrl?: string;
  salePrice: number;
  serieNombre?: string;
  totalStock?: number;
  tallas?: Array<{
    tallaId: string;
    numero: number | string;
    stock: number;
    disponible: number;
  }>;
}

interface ModeloCalzado {
  id: string;
  baseCode: string;
  name: string;
  brand: string;
  material: string;
  sucursalNombre?: string;
  precioMin: number;
  precioMax: number;
  variantes: Variante[];
}

interface LandingData {
  negocio: NegocioInfo;
  sucursales: Sucursal[];
  modelos?: ModeloCalzado[];
}

function LandingContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") || "";
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estado del menú móvil
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filtros del catálogo
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("TODAS");

  // Estado de variantes seleccionadas por modelo: { [modeloId]: varianteId }
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchLanding = async () => {
      try {
        const url = `${API_BASE_URL}/catalogo/landing${tenantId ? `?tenantId=${tenantId}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("No se pudo cargar la información del negocio");
        const json = await res.json();
        setData(json);

        // Inicializar la primera variante de cada modelo
        if (json.modelos && Array.isArray(json.modelos)) {
          const initialMap: Record<string, string> = {};
          json.modelos.forEach((m: ModeloCalzado) => {
            if (m.variantes && m.variantes.length > 0) {
              initialMap[m.id] = m.variantes[0].id;
            }
          });
          setSelectedVariants(initialMap);
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar la información");
      } finally {
        setLoading(false);
      }
    };
    fetchLanding();
  }, [tenantId]);

  // Lista de marcas únicas para filtros
  const brands = useMemo(() => {
    if (!data?.modelos) return [];
    const set = new Set<string>();
    data.modelos.forEach((m) => {
      if (m.brand) set.add(m.brand);
    });
    return Array.from(set);
  }, [data]);

  // Filtrado de modelos
  const filteredModelos = useMemo(() => {
    if (!data?.modelos) return [];
    return data.modelos.filter((m) => {
      const matchBrand = selectedBrand === "TODAS" || m.brand === selectedBrand;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.baseCode.toLowerCase().includes(q) ||
        m.material.toLowerCase().includes(q) ||
        m.variantes.some((v) => v.color.toLowerCase().includes(q) || v.code.toLowerCase().includes(q));
      return matchBrand && matchSearch;
    });
  }, [data, selectedBrand, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl max-w-sm text-center">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-amber-500 rounded-full animate-spin" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm">Cargando Catálogo Oficial...</h3>
            <p className="text-slate-500 text-xs">Conectando con los puntos de venta y calzado de cuero en Cevallos.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
          <div className="text-5xl">👞</div>
          <h2 className="text-xl font-bold text-slate-900">Catálogo Temporalmente No Disponible</h2>
          <p className="text-slate-600 text-xs leading-relaxed">{error || "Intenta recargar la página en unos momentos."}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { negocio, sucursales } = data;
  const brandColor = negocio.primaryColor || "#0F172A";

  const handleSelectVariant = (modeloId: string, varianteId: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [modeloId]: varianteId,
    }));
  };

  const getWhatsAppOrderUrl = (modelo: ModeloCalzado, variante: Variante) => {
    const phone = negocio.whatsappContacto || negocio.telefono || "593999999999";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const msg = `¡Hola ${negocio.nombreNegocio}! 👋\n\nEstoy interesado en el siguiente modelo de calzado de su catálogo web:\n\n👞 *Modelo:* ${modelo.name}\n🎨 *Color:* ${variante.color}\n🏷️ *Código:* ${variante.code}\n💎 *Material:* ${modelo.material}\n${negocio.mostrarPreciosPublico && variante.salePrice > 0 ? `💵 *Precio:* $${variante.salePrice.toFixed(2)}\n` : ""}\n¿Tienen disponibilidad de tallas y realizan envíos?`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased selection:bg-slate-900 selection:text-white">
      {/* ══════════════════════════════════════════════
          1. HEADER / NAVBAR RESPONSIVE
         ══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="h-1.5 w-full transition-colors" style={{ backgroundColor: brandColor }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Logo & Nombre */}
          <a href="#inicio" className="flex items-center gap-3 group">
            {negocio.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={negocio.logoUrl}
                alt={negocio.nombreNegocio}
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl object-contain bg-white border border-slate-200 p-1 shadow-xs group-hover:scale-105 transition-transform"
              />
            ) : (
              <div
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-sm group-hover:scale-105 transition-transform"
                style={{ backgroundColor: brandColor }}
              >
                {negocio.nombreNegocio ? negocio.nombreNegocio.charAt(0) : "N"}
              </div>
            )}
            <div>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight block leading-tight">
                {negocio.nombreNegocio || "Calzado en Cuero"}
              </span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-500/10 px-1.5 py-0.2 rounded-md border border-amber-500/20">
                100% Cuero Cevallos
              </span>
            </div>
          </a>

          {/* Menú Desktop */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-600">
            <a href="#inicio" className="hover:text-slate-900 transition-colors">
              Inicio
            </a>
            <a href="#catalogo" className="hover:text-slate-900 transition-colors flex items-center gap-1">
              <span>Catálogo de Modelos</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {data.modelos?.length || 0}
              </span>
            </a>
            <a href="#sucursales" className="hover:text-slate-900 transition-colors">
              Sucursales ({sucursales.length})
            </a>
            <a href="#nosotros" className="hover:text-slate-900 transition-colors">
              Garantía & Taller
            </a>
            <a href="#contacto" className="hover:text-slate-900 transition-colors">
              Contacto
            </a>
          </nav>

          {/* Botón WhatsApp & Hamburguesa Móvil */}
          <div className="flex items-center gap-2.5">
            <a
              href={`https://wa.me/${(negocio.whatsappContacto || negocio.telefono || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`¡Hola ${negocio.nombreNegocio}! Deseo consultar sobre su catálogo de calzado de cuero.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <MessageCircle size={15} />
              <span>Contactar WhatsApp</span>
            </a>

            {/* Botón Menú Móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Abrir Menú"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Menú Móvil Desplegable */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-3 duration-200">
            <nav className="flex flex-col space-y-2 text-sm font-bold text-slate-700">
              <a
                href="#inicio"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                🏠 Inicio
              </a>
              <a
                href="#catalogo"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between"
              >
                <span>👟 Catálogo de Modelos</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-800 font-mono">
                  {data.modelos?.length || 0}
                </span>
              </a>
              <a
                href="#sucursales"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                🏪 Sucursales & Locales ({sucursales.length})
              </a>
              <a
                href="#nosotros"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                🛡️ Garantía & Taller en Cevallos
              </a>
              <a
                href="#contacto"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                📞 Contacto & Ubicaciones
              </a>
            </nav>

            <div className="pt-2 border-t border-slate-200">
              <a
                href={`https://wa.me/${(negocio.whatsappContacto || negocio.telefono || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`¡Hola! Deseo más información sobre su catálogo.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md"
              >
                <MessageCircle size={16} />
                <span>Pedir y Consultar por WhatsApp</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════
          2. HERO SECTION ELEGANTE Y LUMINOSO
         ══════════════════════════════════════════════ */}
      <section
        id="inicio"
        className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/50 py-16 sm:py-24 border-b border-slate-200/60"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Texto Hero */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-900 font-bold text-xs">
                <Sparkles size={14} className="text-amber-600" />
                <span>Producción Directa desde Fábrica • Cantón Cevallos</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                {negocio.heroTitulo || "Calzado Ecuatoriano 100% Cuero de Cevallos"}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-2xl">
                {negocio.heroSubtitulo ||
                  "Fabricación con los mejores estándares de calidad, acabados finos y venta directa por par y por mayor a todo el país."}
              </p>

              {/* Botones de Acción */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#catalogo"
                  className="px-6 py-3.5 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:scale-[1.02]"
                  style={{ backgroundColor: brandColor }}
                >
                  <ShoppingBag size={17} />
                  <span>Explorar Colección ({data.modelos?.length || 0} Modelos)</span>
                </a>

                <a
                  href="#sucursales"
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl border border-slate-200 transition-all flex items-center gap-2"
                >
                  <Store size={17} />
                  <span>Ver Puntos de Venta</span>
                </a>
              </div>

              {/* Pilares rápidos */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-200/80">
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-600" /> 100% Cuero
                  </div>
                  <p className="text-[11px] text-slate-500">Material vacuno legítimo</p>
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1">
                    <Truck size={14} className="text-blue-600" /> Envíos Seguros
                  </div>
                  <p className="text-[11px] text-slate-500">A todo el Ecuador</p>
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1">
                    <Award size={14} className="text-amber-600" /> Venta por Mayor
                  </div>
                  <p className="text-[11px] text-slate-500">Precios de fabricante</p>
                </div>
              </div>
            </div>

            {/* Banner / Ilustración Hero */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 bg-slate-100 shadow-2xl p-2 group">
                {negocio.heroBannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={negocio.heroBannerUrl}
                    alt={negocio.heroTitulo}
                    className="w-full h-80 sm:h-96 object-cover rounded-2xl group-hover:scale-102 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-80 sm:h-96 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Artesanía & Confort
                      </span>
                      <h3 className="text-2xl font-black">Hecho a Mano en Tungurahua</h3>
                      <p className="text-xs text-slate-300">
                        Cada par refleja la tradición zapatera de Cevallos con tecnología y estilo contemporáneo.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-slate-300 block text-[10px]">Garantía de Calidad</span>
                        <span className="font-bold">Cuero Vacuno Seleccionado</span>
                      </div>
                      <span className="text-2xl">👞</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. CATÁLOGO DE MODELOS CON VARIANTES INTEGRADAS
         ══════════════════════════════════════════════ */}
      <section id="catalogo" className="py-16 sm:py-20 bg-slate-50/60 border-b border-slate-200/60 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          {/* Encabezado del Catálogo */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Colección en Exhibición
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Modelos de Calzado & Variantes
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Selecciona cualquier modelo para ver sus colores y fotografías reales. Puedes hacer tu pedido o cotización directa a través de WhatsApp.
              </p>
            </div>

            {/* Barra de Búsqueda y Marcas */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar modelo, color..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 w-full sm:w-60 shadow-xs"
                />
              </div>

              {brands.length > 1 && (
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 shadow-xs"
                >
                  <option value="TODAS">Todas las Marcas ({brands.length})</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Grid de Modelos */}
          {filteredModelos.length === 0 ? (
            <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
              <div className="text-4xl">🔍</div>
              <h4 className="text-base font-bold text-slate-900">No se encontraron modelos con esa búsqueda</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Intenta buscar con otro término o selecciona &quot;Todas las Marcas&quot;.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBrand("TODAS");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredModelos.map((modelo) => {
                const currentVarId = selectedVariants[modelo.id] || (modelo.variantes[0]?.id ?? "");
                const currentVariant =
                  modelo.variantes.find((v) => v.id === currentVarId) || modelo.variantes[0];
                const fotoUrl = currentVariant?.imageUrl || "";

                return (
                  <div
                    key={modelo.id}
                    className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Imagen de la Variante con Badge */}
                      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden border-b border-slate-100 flex items-center justify-center">
                        {fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={fotoUrl}
                            alt={`${modelo.name} - ${currentVariant?.color}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                            <span className="text-3xl">👞</span>
                            <span className="text-[10px] font-bold">Foto en catálogo</span>
                          </div>
                        )}

                        {/* Badges superiores */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold shadow-xs transition-colors"
                            style={{
                              backgroundColor: brandColor,
                              color: getContrastColor(brandColor),
                            }}
                          >
                            {modelo.brand || "Cuero"}
                          </span>
                        </div>

                        {/* Precio Flotante (si está habilitado) */}
                        {negocio.mostrarPreciosPublico && currentVariant?.salePrice > 0 && (
                          <div
                            className="absolute bottom-3 right-3 px-3 py-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl font-black text-sm font-mono shadow-md"
                            style={{ color: brandColor }}
                          >
                            ${currentVariant.salePrice.toFixed(2)}
                          </div>
                        )}
                      </div>

                      {/* Detalles del Modelo */}
                      <div className="p-5 space-y-3.5">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                            {modelo.baseCode} · {modelo.material}
                          </span>
                          <h3 className="font-extrabold text-base text-slate-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                            {modelo.name}
                          </h3>
                        </div>

                        {/* Selector Interactivo de Colores / Variantes */}
                        {modelo.variantes.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-500">Color seleccionado:</span>
                              <span className="font-extrabold text-slate-900">
                                {currentVariant?.color || "Estándar"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {modelo.variantes.map((v) => {
                                const isSelected = v.id === currentVariant?.id;
                                return (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => handleSelectVariant(modelo.id, v.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                                      isSelected
                                        ? "shadow-xs scale-105"
                                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                                    }`}
                                    style={
                                      isSelected
                                        ? {
                                            backgroundColor: brandColor,
                                            color: getContrastColor(brandColor),
                                            borderColor: brandColor,
                                          }
                                        : {}
                                    }
                                    title={`Ver en color ${v.color}`}
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full border border-white/40 shrink-0"
                                      style={{
                                        backgroundColor:
                                          v.color.toLowerCase().includes("negro")
                                            ? "#111"
                                            : v.color.toLowerCase().includes("café") || v.color.toLowerCase().includes("cafe")
                                            ? "#6F4E37"
                                            : v.color.toLowerCase().includes("miel")
                                            ? "#D4A373"
                                            : v.color.toLowerCase().includes("suela")
                                            ? "#99582A"
                                            : v.color.toLowerCase().includes("azul")
                                            ? "#1D4ED8"
                                            : v.color.toLowerCase().includes("blanco")
                                            ? "#FFF"
                                            : "#777",
                                      }}
                                    />
                                    <span>{v.color}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Desglose de Tallas Disponibles (si está habilitado) */}
                        {negocio.mostrarStockPublico && currentVariant?.tallas && currentVariant.tallas.length > 0 && (
                          <div className="space-y-1 pt-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Tallas Disponibles:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {currentVariant.tallas.map((t, tidx) => {
                                const tieneStock = t.stock > 0;
                                return (
                                  <span
                                    key={tidx}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                      tieneStock
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        : "bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60"
                                    }`}
                                  >
                                    T{t.numero}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botón WhatsApp de la Card */}
                    <div className="p-4 pt-0">
                      <a
                        href={getWhatsAppOrderUrl(modelo, currentVariant)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-md hover:scale-[1.01]"
                        style={{
                          backgroundColor: brandColor,
                          color: getContrastColor(brandColor),
                        }}
                      >
                        <MessageCircle size={14} />
                        <span>Pedir / Cotizar por WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. SUCURSALES & PUNTOS DE VENTA
         ══════════════════════════════════════════════ */}
      <section id="sucursales" className="py-16 sm:py-20 bg-white border-b border-slate-200/60 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Locales Físicos
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Nuestras Sucursales & Puntos de Venta
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Visítanos en nuestras tiendas físicas en Cevallos y demás localidades o solicita envíos directos a cualquier provincia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sucursales.map((suc) => (
              <div
                key={suc.id}
                className={`p-6 rounded-3xl border transition-all space-y-4 ${
                  suc.isMatriz
                    ? "bg-gradient-to-br from-amber-500/5 via-slate-50 to-amber-500/10 border-amber-500/30 shadow-md ring-1 ring-amber-500/20"
                    : "bg-white border-slate-200/90 shadow-xs hover:shadow-lg"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        suc.isMatriz
                          ? "bg-amber-500/20 text-amber-900 border-amber-500/30"
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }`}
                    >
                      <Store size={11} />
                      {suc.isMatriz ? "🏢 Casa Matriz & Fábrica" : "🏪 Sucursal Oficial"}
                    </span>
                    <h3 className="font-extrabold text-lg text-slate-900">{suc.nombre}</h3>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{suc.direccion || "Cantón Cevallos, Tungurahua"}</span>
                  </div>
                  {suc.telefono && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span>{suc.telefono}</span>
                    </div>
                  )}
                  {suc.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span>{suc.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <Clock size={14} className="shrink-0" />
                    <span>Atención de Lunes a Domingo</span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${(suc.whatsapp || suc.telefono || negocio.whatsappContacto || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`¡Hola! Deseo comunicarme con el punto de venta de ${suc.nombre}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <MessageCircle size={14} className="text-emerald-400" />
                  <span>Contactar este Local</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5. SOBRE NOSOTROS & TRADICIÓN EN CEVALLOS
         ══════════════════════════════════════════════ */}
      <section id="nosotros" className="py-16 sm:py-20 bg-slate-50/50 border-b border-slate-200/60 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Tradición Zapatera
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Calidad de Exportación en Cuero Ecuatoriano
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {negocio.sobreNosotros ||
                  "Somos una empresa dedicada a la fabricación y comercialización de calzado de cuero en el cantón Cevallos, cuna del calzado en Tungurahua. Seleccionamos cuidadosamente cueros vacunos de primera y combinamos técnicas tradicionales con moldes anatómicos contemporáneos para garantizar máxima durabilidad y confort."}
              </p>

              <div className="space-y-3 pt-2">
                {[
                  "Cueros vacunos genuinos tratados para resistir el uso continuo.",
                  "Suelas antideslizantes de alta adherencia y costuras reforzadas.",
                  "Atención personalizada a comerciantes mayoristas y clientes particulares.",
                  "Garantía de fábrica en cada uno de nuestros modelos.",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <span className="text-3xl font-black text-slate-900 block font-mono">100%</span>
                <h4 className="font-extrabold text-xs text-slate-900">Cuero Vacuno</h4>
                <p className="text-[11px] text-slate-500">Materia prima seleccionada para garantizar longevidad.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <span className="text-3xl font-black text-slate-900 block font-mono">{sucursales.length}</span>
                <h4 className="font-extrabold text-xs text-slate-900">Puntos de Venta</h4>
                <p className="text-[11px] text-slate-500">Locales para atención directa y retiro de pedidos.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <span className="text-3xl font-black text-slate-900 block font-mono">{data.modelos?.length || 0}+</span>
                <h4 className="font-extrabold text-xs text-slate-900">Modelos Activos</h4>
                <p className="text-[11px] text-slate-500">Variedad de estilos casuales, formales y botas.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <span className="text-3xl font-black text-slate-900 block font-mono">24h</span>
                <h4 className="font-extrabold text-xs text-slate-900">Despacho Rápido</h4>
                <p className="text-[11px] text-slate-500">Envíos coordinados por transporte interprovincial.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          6. FOOTER CORPORATIVO
         ══════════════════════════════════════════════ */}
      <footer id="contacto" className="bg-slate-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-3">
                {negocio.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={negocio.logoUrl}
                    alt=""
                    className="h-10 w-10 rounded-2xl object-contain bg-white p-1"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-900 font-black text-sm">
                    {negocio.nombreNegocio?.charAt(0) || "N"}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base">{negocio.nombreNegocio}</h3>
                  <p className="text-xs text-slate-400">Calzado 100% Cuero de Cevallos</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Venta mayorista y minorista de calzado en cuero genuino. Visita nuestros locales o realiza pedidos desde cualquier parte del país con entrega garantizada.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-2">Contacto Matriz</h4>
              <p className="flex items-center gap-2">
                <MapPin size={13} className="text-slate-400" />
                <span>{negocio.direccion || "Cantón Cevallos, Tungurahua"}</span>
              </p>
              {negocio.telefono && (
                <p className="flex items-center gap-2">
                  <Phone size={13} className="text-slate-400" />
                  <span>{negocio.telefono}</span>
                </p>
              )}
              {negocio.email && (
                <p className="flex items-center gap-2">
                  <Mail size={13} className="text-slate-400" />
                  <span>{negocio.email}</span>
                </p>
              )}
            </div>

            <div className="space-y-3 text-xs text-slate-400">
              <h4 className="font-bold text-sm text-white uppercase tracking-wider">Enlaces</h4>
              <ul className="space-y-1.5 font-semibold">
                <li>
                  <a href="#catalogo" className="hover:text-amber-400 transition-colors">
                    Catálogo de Calzado
                  </a>
                </li>
                <li>
                  <a href="#sucursales" className="hover:text-amber-400 transition-colors">
                    Nuestras Sucursales
                  </a>
                </li>
                <li>
                  <a href="#nosotros" className="hover:text-amber-400 transition-colors">
                    Sobre la Fábrica
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>
              &copy; {new Date().getFullYear()} {negocio.nombreNegocio}. Todos los derechos reservados.
            </span>
            <span className="text-[11px] text-slate-400">
              Plataforma y Catálogo Digital impulsado por <strong>NEXORA</strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-amber-500 rounded-full animate-spin" />
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
