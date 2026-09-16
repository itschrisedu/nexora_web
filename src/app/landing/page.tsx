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
  Clock,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  Check
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
  garantiaTaller?: string;
  caracteristicasCalidad?: string;
  materialDestacado?: string;
  materialDescripcion?: string;
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

interface ItemCarrito {
  id: string;
  modeloId: string;
  modeloNombre: string;
  varianteId: string;
  color: string;
  serieNombre: string;
  fotoUrl?: string;
  tipoPedido: "PAR" | "SERIE_COMPLETA";
  tallaNumero?: number | string;
  precioUnitario: number;
  cantidad: number;
  paresPorSerie?: number;
  desgloseTallas?: string;
}

function LandingContent() {
  const searchParams = useSearchParams();
  const [effectiveTenantId, setEffectiveTenantId] = useState<string>("");
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estado del menú móvil
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estado del Carrito de Pedidos
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Estado del Modal de Selección de Pedido (Por Par / Por Serie Completa)
  const [modalConfigOpen, setModalConfigOpen] = useState(false);
  const [modeloConfig, setModeloConfig] = useState<ModeloCalzado | null>(null);
  const [varianteConfig, setVarianteConfig] = useState<Variante | null>(null);
  const [serieConfigNombre, setSerieConfigNombre] = useState<string>("");
  const [tipoPedidoConfig, setTipoPedidoConfig] = useState<"PAR" | "SERIE_COMPLETA">("PAR");
  const [tallaSeleccionadaConfig, setTallaSeleccionadaConfig] = useState<number | string>("");
  const [cantidadConfig, setCantidadConfig] = useState(1);

  // Datos del cliente para el pedido
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [notasPedido, setNotasPedido] = useState("");

  // Filtros del catálogo
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("TODAS");

  // Estado de variantes seleccionadas por modelo: { [modeloId]: varianteId }
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Estado de serie seleccionada por modelo: { [modeloId]: serieNombre }
  const [selectedSeries, setSelectedSeries] = useState<Record<string, string>>({});

  useEffect(() => {
    const fromParam = searchParams.get("tenantId");
    if (fromParam) {
      setEffectiveTenantId(fromParam);
      return;
    }
    if (typeof window !== "undefined") {
      const stored =
        localStorage.getItem("activeSucursalId") ||
        (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user") || "{}").tenantId : "") ||
        localStorage.getItem("tenantId") ||
        "";
      if (stored) {
        setEffectiveTenantId(stored);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchLanding = async () => {
      try {
        const url = `${API_BASE_URL}/catalogo/landing${effectiveTenantId ? `?tenantId=${effectiveTenantId}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("No se pudo cargar la información del negocio");
        const json = await res.json();
        setData(json);

        // Inicializar la primera variante y serie de cada modelo
        if (json.modelos && Array.isArray(json.modelos)) {
          const initialVarMap: Record<string, string> = {};
          const initialSerieMap: Record<string, string> = {};
          json.modelos.forEach((m: ModeloCalzado) => {
            if (m.variantes && m.variantes.length > 0) {
              initialVarMap[m.id] = m.variantes[0].id;
              if (m.variantes[0].serieNombre) {
                initialSerieMap[m.id] = m.variantes[0].serieNombre;
              }
            }
          });
          setSelectedVariants(initialVarMap);
          setSelectedSeries(initialSerieMap);
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar la información");
      } finally {
        setLoading(false);
      }
    };
    fetchLanding();
  }, [effectiveTenantId]);

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

  // bulletPoints debe estar ANTES de los early returns para respetar las reglas de Hooks
  const bulletPoints = useMemo(() => {
    const caracCalidad = data?.negocio?.caracteristicasCalidad;
    if (caracCalidad) {
      const parsed = caracCalidad
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (parsed.length > 0) return parsed;
    }
    return [
      "Cueros vacunos genuinos tratados para resistir el uso continuo.",
      "Suelas antideslizantes de alta adherencia y costuras reforzadas.",
      "Atención personalizada a comerciantes mayoristas y clientes particulares.",
      "Servicio y respaldo técnico en todos nuestros locales.",
    ];
  }, [data?.negocio?.caracteristicasCalidad]);

  // Totales del carrito (useMemo para respetar las reglas de Hooks)
  const totalParesCarrito = useMemo(() => {
    return carrito.reduce((sum, item) => {
      if (item.tipoPedido === "SERIE_COMPLETA") {
        return sum + item.cantidad * (item.paresPorSerie || 6);
      }
      return sum + item.cantidad;
    }, 0);
  }, [carrito]);

  const totalPrecioCarrito = useMemo(() => {
    return carrito.reduce((sum, item) => {
      if (item.tipoPedido === "SERIE_COMPLETA") {
        return sum + item.cantidad * (item.paresPorSerie || 6) * item.precioUnitario;
      }
      return sum + item.cantidad * item.precioUnitario;
    }, 0);
  }, [carrito]);

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

  const formatWhatsAppNumber = (phone?: string) => {
    if (!phone) return "";
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "593" + clean.substring(1);
    } else if (!clean.startsWith("593") && clean.length === 9) {
      clean = "593" + clean;
    }
    return clean;
  };

  const handleSelectVariant = (modeloId: string, varianteId: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [modeloId]: varianteId,
    }));
  };

  const handleSelectSerie = (modeloId: string, serieNombre: string, variantes: Variante[]) => {
    setSelectedSeries((prev) => ({
      ...prev,
      [modeloId]: serieNombre,
    }));
    // Seleccionar automáticamente la primera variante de esa serie
    const primeraVarianteDeSerie = variantes.find((v) => v.serieNombre === serieNombre);
    if (primeraVarianteDeSerie) {
      setSelectedVariants((prev) => ({
        ...prev,
        [modeloId]: primeraVarianteDeSerie.id,
      }));
    }
  };

  const getWhatsAppOrderUrl = (modelo: ModeloCalzado, variante: Variante) => {
    const rawPhone = negocio.whatsappContacto || negocio.telefono || "";
    const cleanPhone = formatWhatsAppNumber(rawPhone);
    const serieLine = variante.serieNombre ? `📦 *Serie:* ${variante.serieNombre}\n` : "";
    const msg = `¡Hola ${negocio.nombreNegocio}! 👋\n\nEstoy interesado en el siguiente modelo de calzado de su catálogo web:\n\n👞 *Modelo:* ${modelo.name}\n${serieLine}🎨 *Color:* ${variante.color}\n🏷️ *Código:* ${variante.code}\n💎 *Material:* ${modelo.material}\n${negocio.mostrarPreciosPublico && variante.salePrice > 0 ? `💵 *Precio:* $${variante.salePrice.toFixed(2)}\n` : ""}\n¿Tienen disponibilidad de tallas y realizan envíos?`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleOpenConfigModal = (modelo: ModeloCalzado, variante: Variante, serie: string) => {
    setModeloConfig(modelo);
    setVarianteConfig(variante);
    setSerieConfigNombre(serie || variante.serieNombre || "Estándar");
    setTipoPedidoConfig("PAR");
    const primeraTalla = variante.tallas?.find((t) => t.stock > 0)?.numero ?? variante.tallas?.[0]?.numero ?? 38;
    setTallaSeleccionadaConfig(primeraTalla);
    setCantidadConfig(1);
    setModalConfigOpen(true);
  };

  const handleCambiarSerieModal = (nuevaSerie: string) => {
    if (!modeloConfig) return;
    setSerieConfigNombre(nuevaSerie);
    const varsDeNuevaSerie = modeloConfig.variantes.filter((v) => v.serieNombre === nuevaSerie);
    const nuevaVar =
      varsDeNuevaSerie.find((v) => v.color === varianteConfig?.color) ||
      varsDeNuevaSerie[0] ||
      modeloConfig.variantes[0];
    if (nuevaVar) {
      setVarianteConfig(nuevaVar);
      const primeraTalla = nuevaVar.tallas?.find((t) => t.stock > 0)?.numero ?? nuevaVar.tallas?.[0]?.numero ?? 38;
      setTallaSeleccionadaConfig(primeraTalla);
    }
  };

  const handleCambiarColorModal = (nuevaVar: Variante) => {
    setVarianteConfig(nuevaVar);
    const primeraTalla = nuevaVar.tallas?.find((t) => t.stock > 0)?.numero ?? nuevaVar.tallas?.[0]?.numero ?? 38;
    setTallaSeleccionadaConfig(primeraTalla);
  };

  const handleAgregarAlCarrito = () => {
    if (!modeloConfig || !varianteConfig) return;

    const paresPorSerieCalc = varianteConfig.tallas && varianteConfig.tallas.length > 0 ? varianteConfig.tallas.length : 6;
    const desgloseCalc =
      varianteConfig.tallas && varianteConfig.tallas.length > 0
        ? varianteConfig.tallas.map((t) => `T${t.numero}`).join(", ")
        : "Curva comercial estándar";

    const nuevoItem: ItemCarrito = {
      id: `${modeloConfig.id}-${varianteConfig.id}-${tipoPedidoConfig}-${tallaSeleccionadaConfig}-${Date.now()}`,
      modeloId: modeloConfig.id,
      modeloNombre: modeloConfig.name,
      varianteId: varianteConfig.id,
      color: varianteConfig.color,
      serieNombre: serieConfigNombre || varianteConfig.serieNombre || "Estándar",
      fotoUrl: varianteConfig.imageUrl,
      tipoPedido: tipoPedidoConfig,
      tallaNumero: tipoPedidoConfig === "PAR" ? tallaSeleccionadaConfig : undefined,
      precioUnitario: varianteConfig.salePrice || 0,
      cantidad: cantidadConfig,
      paresPorSerie: tipoPedidoConfig === "SERIE_COMPLETA" ? paresPorSerieCalc : undefined,
      desgloseTallas: tipoPedidoConfig === "SERIE_COMPLETA" ? desgloseCalc : undefined,
    };

    setCarrito((prev) => [...prev, nuevoItem]);
    setModalConfigOpen(false);
    setIsCartOpen(true);
  };

  const handleUpdateCantidadCarrito = (id: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nuevaCantidad = item.cantidad + delta;
            return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
          }
          return item;
        })
        .filter(Boolean) as ItemCarrito[]
    );
  };

  const handleEliminarItemCarrito = (id: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEnviarPedidoWhatsApp = () => {
    if (carrito.length === 0) return;
    const rawPhone = negocio.whatsappContacto || negocio.telefono || "";
    const cleanPhone = formatWhatsAppNumber(rawPhone);

    let texto = `🛒 *NUEVO PEDIDO - ${negocio.nombreNegocio.toUpperCase()}*\n`;
    texto += `──────────────────────\n`;
    if (clienteNombre.trim()) texto += `👤 *Cliente:* ${clienteNombre.trim()}\n`;
    if (clienteTelefono.trim()) texto += `📱 *Teléfono:* ${clienteTelefono.trim()}\n`;
    if (clienteDireccion.trim()) texto += `📍 *Entrega / Ciudad:* ${clienteDireccion.trim()}\n`;
    texto += `──────────────────────\n`;
    texto += `📦 *DETALLE DE ARTÍCULOS:*\n\n`;

    carrito.forEach((item, idx) => {
      texto += `${idx + 1}. *${item.modeloNombre}*\n`;
      texto += `   • Color: ${item.color} | Serie: ${item.serieNombre}\n`;
      if (item.tipoPedido === "PAR") {
        texto += `   • Modalidad: *Por Par* (Talla: ${item.tallaNumero})\n`;
        texto += `   • Cantidad: ${item.cantidad} par(es)\n`;
        if (item.precioUnitario > 0) {
          texto += `   • Subtotal: $${(item.cantidad * item.precioUnitario).toFixed(2)}\n`;
        }
      } else {
        const totalParesSerie = item.cantidad * (item.paresPorSerie || 6);
        texto += `   • Modalidad: *Por Serie Completa* (${item.desgloseTallas || "Curva comercial"})\n`;
        texto += `   • Cantidad: ${item.cantidad} serie(s) (${totalParesSerie} pares)\n`;
        if (item.precioUnitario > 0) {
          texto += `   • Subtotal: $${(totalParesSerie * item.precioUnitario).toFixed(2)}\n`;
        }
      }
      texto += `\n`;
    });

    texto += `──────────────────────\n`;
    texto += `👟 *TOTAL PARES:* ${totalParesCarrito} pares\n`;
    if (totalPrecioCarrito > 0) {
      texto += `💰 *TOTAL ESTIMADO:* $${totalPrecioCarrito.toFixed(2)}\n`;
    }
    if (notasPedido.trim()) {
      texto += `📝 *Observaciones:* ${notasPedido.trim()}\n`;
    }
    texto += `──────────────────────\n`;
    texto += `_Pedido generado desde el catálogo web oficial de ${negocio.nombreNegocio}_`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(texto)}`, "_blank");
  };



  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased selection:bg-slate-900 selection:text-white">
      {/* ══════════════════════════════════════════════
          1. HEADER / NAVBAR RESPONSIVE
         ══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="h-1.5 w-full transition-colors" style={{ backgroundColor: brandColor }} />
        <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
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

          {/* Botón Carrito, WhatsApp & Hamburguesa Móvil */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
              title="Ver mi pedido"
            >
              <ShoppingCart size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Mi Pedido</span>
              {totalParesCarrito > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                  {totalParesCarrito}
                </span>
              )}
            </button>

            <a
              href={`https://wa.me/${formatWhatsAppNumber(negocio.whatsappContacto || negocio.telefono)}?text=${encodeURIComponent(`¡Hola ${negocio.nombreNegocio}! Deseo consultar sobre su catálogo de calzado de cuero.`)}`}
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
                href={`https://wa.me/${formatWhatsAppNumber(negocio.whatsappContacto || negocio.telefono)}?text=${encodeURIComponent(`¡Hola! Deseo más información sobre su catálogo.`)}`}
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
        className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/50 py-12 sm:py-20 border-b border-slate-200/60"
      >
        {/* Efecto de luz sutil de fondo */}
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: brandColor }}
        />

        <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
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
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-600 shrink-0" /> 100% Cuero
                  </div>
                  <p className="text-[11px] text-slate-500">Material vacuno legítimo</p>
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                    <Truck size={16} className="text-blue-600 shrink-0" /> Envíos Seguros
                  </div>
                  <p className="text-[11px] text-slate-500">A todo el Ecuador</p>
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                    <Award size={16} className="text-amber-600 shrink-0" /> Venta por Mayor
                  </div>
                  <p className="text-[11px] text-slate-500">Precios de fabricante</p>
                </div>
              </div>
            </div>

            {/* Banner / Card Hero Mejorada */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-2xl group transition-all duration-300 hover:shadow-amber-500/10 hover:border-slate-300">
                {negocio.heroBannerUrl ? (
                  <div className="relative aspect-4/3 sm:aspect-16/10 lg:aspect-4/3 w-full overflow-hidden bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={negocio.heroBannerUrl}
                      alt={negocio.heroTitulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                    <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                          100% Cuero Vacuno
                        </span>
                        <span className="text-xs font-black tracking-tight">
                          Calzado Artesanal de Cevallos
                        </span>
                      </div>
                      <span className="text-xl">👞</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-4/3 sm:aspect-16/10 lg:aspect-4/3 w-full overflow-hidden bg-slate-950 flex flex-col justify-between p-6 sm:p-8 text-white">
                    {/* Imagen de fondo artesanal de calzado de cuero */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=80"
                      alt="Taller de Calzado de Cuero Cevallos"
                      className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-slate-950/40" />

                    {/* Contenido superior de la card */}
                    <div className="relative z-10 space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 text-[11px] font-extrabold shadow-sm">
                        <Sparkles size={12} />
                        <span>Artesanía & Confort</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        Hecho a Mano en Tungurahua
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
                        Cada par refleja la tradición zapatera de Cevallos con tecnología de confort y cuero vacuno genuino.
                      </p>
                    </div>

                    {/* Badge inferior en vidrio */}
                    <div className="relative z-10 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-between shadow-lg">
                      <div className="text-xs">
                        <span className="text-amber-300 block text-[10px] font-bold uppercase tracking-wider">
                          Garantía de Calidad
                        </span>
                        <span className="font-extrabold text-white">Cuero Vacuno Seleccionado</span>
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
        <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Encabezado del Catálogo */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: brandColor }}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredModelos.map((modelo) => {
                // Extraer series únicas del modelo
                const seriesUnicas = Array.from(
                  new Set(modelo.variantes.map((v) => v.serieNombre).filter(Boolean))
                ) as string[];
                const tieneMúltiplesSeries = seriesUnicas.length > 1;
                const serieActual = selectedSeries[modelo.id] || seriesUnicas[0] || "";

                // Filtrar variantes por serie seleccionada (si hay múltiples series)
                const variantesFiltradas = tieneMúltiplesSeries
                  ? modelo.variantes.filter((v) => v.serieNombre === serieActual)
                  : modelo.variantes;

                const currentVarId = selectedVariants[modelo.id] || (variantesFiltradas[0]?.id ?? "");
                const currentVariant =
                  variantesFiltradas.find((v) => v.id === currentVarId) || variantesFiltradas[0];
                const fotoUrl = currentVariant?.imageUrl || "";

                return (
                  <div
                    key={modelo.id}
                    onClick={() => handleOpenConfigModal(modelo, currentVariant, serieActual || seriesUnicas[0] || "Estándar")}
                    className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col h-full group cursor-pointer"
                  >
                    {/* Imagen de la Variante con Badge */}
                    <div className="relative aspect-4/3 bg-slate-100 overflow-hidden border-b border-slate-100 flex items-center justify-center shrink-0">
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

                      {/* Badge de Marca */}
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

                      {/* Badge de Serie (en la imagen como en la foto) */}
                      {(serieActual || seriesUnicas[0]) && (
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/95 backdrop-blur-sm border border-slate-200 text-slate-800 shadow-xs flex items-center gap-1">
                            📦 {serieActual || seriesUnicas[0]}
                          </span>
                        </div>
                      )}

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
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          {/* Área de Nombre / Título */}
                          <div className="min-h-[2.5rem] flex flex-col justify-start">
                            <h3
                              className="font-extrabold text-base line-clamp-2 leading-snug group-hover:opacity-90 transition-opacity"
                              style={{ color: "#b45309" }}
                              title={modelo.name}
                            >
                              {modelo.name}
                            </h3>
                          </div>

                          {/* Área de Descripción / Código y Material */}
                          <div className="min-h-[1.25rem] flex items-center">
                            <span
                              className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono truncate"
                              title={`${modelo.baseCode} · ${modelo.material || "CUERO VACUNO"}`}
                            >
                              {modelo.baseCode} · {modelo.material || "CUERO VACUNO"}
                            </span>
                          </div>
                        </div>

                        {/* Selector Interactivo de Colores / Variantes */}
                        {variantesFiltradas.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-500">Color seleccionado:</span>
                              <span className="font-extrabold text-slate-900">
                                {currentVariant?.color || "Estándar"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {variantesFiltradas.map((v) => {
                                const isSelected = v.id === currentVariant?.id;
                                return (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectVariant(modelo.id, v.id);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
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
                      </div>
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
        <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: brandColor }}>
              Locales Físicos
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Nuestras Sucursales & Puntos de Venta
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Visítanos en nuestras tiendas físicas en Cevallos y demás localidades o solicita envíos directos a cualquier provincia.
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-stretch gap-6 max-w-6xl mx-auto">
            {sucursales.map((suc) => (
              <div
                key={suc.id}
                className={`w-full max-w-sm flex flex-col justify-between p-6 rounded-3xl border transition-all space-y-4 ${
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
                  href={`https://wa.me/${formatWhatsAppNumber(suc.whatsapp || suc.telefono || negocio.whatsappContacto || negocio.telefono)}?text=${encodeURIComponent(`¡Hola! Deseo comunicarme con el punto de venta de ${suc.nombre}.`)}`}
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
        <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: brandColor }}>
                Sobre Nosotros & Garantía
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {negocio.nombreNegocio || "Calzado de Cuero"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {negocio.sobreNosotros ||
                  "Somos una empresa dedicada a la fabricación y comercialización de calzado de cuero en el cantón Cevallos, cuna del calzado en Tungurahua. Seleccionamos cuidadosamente cueros vacunos de primera y combinamos técnicas tradicionales con moldes anatómicos contemporáneos para garantizar máxima durabilidad y confort."}
              </p>

              {/* Bloque Destacado de Garantía & Taller */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-950">
                  <ShieldCheck size={16} className="text-amber-700 shrink-0" />
                  <span>Garantía de Fábrica & Respaldo de Taller</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {negocio.garantiaTaller ||
                    "Garantizamos la máxima calidad en cada par de calzado elaborado con 100% cuero vacuno ecuatoriano. Ofrecemos respaldo directo de fábrica y servicio de mantenimiento en todos nuestros puntos de venta autorizados."}
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {bulletPoints.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900 block font-mono">
                  {negocio.materialDestacado || "100% Cuero Vacuno"}
                </span>
                <h4 className="font-extrabold text-xs text-slate-900">Garantía de Material</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {negocio.materialDescripcion || "Materia prima seleccionada para garantizar longevidad."}
                </p>
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
      <footer id="contacto" className="bg-slate-900 text-white py-8 sm:py-10">
        <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2.5">
                {negocio.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={negocio.logoUrl}
                    alt=""
                    className="h-8 w-8 rounded-xl object-contain bg-white p-0.5"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-900 font-black text-xs">
                    {negocio.nombreNegocio?.charAt(0) || "N"}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm leading-tight">{negocio.nombreNegocio}</h3>
                  <p className="text-[11px] text-slate-400">Calzado 100% Cuero de Cevallos</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Venta mayorista y minorista de calzado en cuero genuino con entrega directa a nivel nacional.
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-400">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-1">Contacto Matriz</h4>
              <p className="flex items-center gap-2">
                <MapPin size={12} className="text-slate-400" />
                <span>{negocio.direccion || "Cantón Cevallos, Tungurahua"}</span>
              </p>
              {negocio.telefono && (
                <p className="flex items-center gap-2">
                  <Phone size={12} className="text-slate-400" />
                  <span>{negocio.telefono}</span>
                </p>
              )}
              {negocio.email && (
                <p className="flex items-center gap-2">
                  <Mail size={12} className="text-slate-400" />
                  <span>{negocio.email}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-slate-400">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-1">Enlaces</h4>
              <ul className="space-y-1 font-semibold text-[11px]">
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
                    Garantía & Taller
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[11px]">
              &copy; {new Date().getFullYear()} {negocio.nombreNegocio}. Todos los derechos reservados.
            </span>
            <span className="text-[11px] text-slate-500">
              Catálogo web oficial del negocio
            </span>
          </div>
        </div>
      </footer>

      {/* Botón Flotante de Carrito */}
      {carrito.length > 0 && (
        <aside aria-label="Acceso flotante al pedido" className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 group animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <div className="relative">
              <ShoppingCart size={22} className="text-amber-400" />
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xs">
                {totalParesCarrito}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">Mi Pedido</div>
              <div className="text-xs font-bold text-white">
                {totalParesCarrito} {totalParesCarrito === 1 ? "par" : "pares"}
                {totalPrecioCarrito > 0 ? ` · $${totalPrecioCarrito.toFixed(2)}` : ""}
              </div>
            </div>
          </button>
        </aside>
      )}

      {/* Modal de Configuración de Pedido (Por Par o Por Serie Completa) */}
      {modalConfigOpen && modeloConfig && varianteConfig && (() => {
        const seriesDelModeloConfig = Array.from(
          new Set(modeloConfig.variantes.map((v) => v.serieNombre).filter(Boolean))
        ) as string[];

        const variantesDeSerieConfig =
          seriesDelModeloConfig.length > 0 && serieConfigNombre
            ? modeloConfig.variantes.filter((v) => v.serieNombre === serieConfigNombre)
            : modeloConfig.variantes;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
              {/* Cabecera del modal */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {varianteConfig.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={varianteConfig.imageUrl}
                        alt={modeloConfig.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">👞</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      {modeloConfig.brand} · {modeloConfig.baseCode} · {modeloConfig.material || "CUERO VACUNO"}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                      {modeloConfig.name}
                    </h3>
                    {negocio.mostrarPreciosPublico && varianteConfig.salePrice > 0 && (
                      <div className="text-xs font-extrabold font-mono text-amber-700 mt-0.5">
                        ${varianteConfig.salePrice.toFixed(2)} por par
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalConfigOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Selector / Indicador de Serie del Modelo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider">Serie del Modelo:</span>
                  <span className="font-extrabold text-amber-800">{serieConfigNombre}</span>
                </div>
                {seriesDelModeloConfig.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {seriesDelModeloConfig.map((s) => {
                      const isSelected = s === serieConfigNombre;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleCambiarSerieModal(s)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          <Package size={13} className={isSelected ? "text-amber-400" : "text-slate-500"} />
                          <span>{s}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                    <Package size={13} className="text-amber-600" />
                    <span>{serieConfigNombre || seriesDelModeloConfig[0] || "Serie Estándar"}</span>
                    <span className="text-[10px] text-slate-500 font-normal">(Curva comercial completa)</span>
                  </div>
                )}
              </div>

              {/* Selector de Color dentro del modal */}
              {variantesDeSerieConfig.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">Color:</span>
                    <span className="font-extrabold text-slate-900">{varianteConfig.color}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variantesDeSerieConfig.map((v) => {
                      const isSelected = v.id === varianteConfig.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleCambiarColorModal(v)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            isSelected
                              ? "shadow-sm scale-105"
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
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
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

              {/* Selector de Modalidad: Por Par vs Por Serie Completa */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Modalidad de Pedido:
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setTipoPedidoConfig("PAR")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      tipoPedidoConfig === "PAR"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>👟</span>
                    <span>Por Par (Individual)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPedidoConfig("SERIE_COMPLETA")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                      tipoPedidoConfig === "SERIE_COMPLETA"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Package size={14} className="text-amber-600" />
                    <span>Por Serie Completa</span>
                  </button>
                </div>
              </div>

              {/* Vista según la modalidad */}
              {tipoPedidoConfig === "PAR" ? (
                <div className="space-y-4">
                  {/* Selector de Talla */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Selecciona la Talla:
                      </label>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Talla elegida: <strong className="text-slate-900 font-mono">T{tallaSeleccionadaConfig}</strong>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {varianteConfig.tallas && varianteConfig.tallas.length > 0 ? (
                        varianteConfig.tallas.map((t, idx) => {
                          const isSelected = String(tallaSeleccionadaConfig) === String(t.numero);
                          const tieneStock = t.stock > 0;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setTallaSeleccionadaConfig(t.numero)}
                              className={`min-w-12 py-2 px-2.5 rounded-xl text-xs font-mono font-bold border transition-all flex flex-col items-center justify-center ${
                                isSelected
                                  ? "bg-amber-500 text-white border-amber-500 shadow-sm scale-105"
                                  : tieneStock
                                  ? "bg-white text-slate-800 border-slate-200 hover:border-slate-400"
                                  : "bg-slate-50 text-slate-400 border-slate-200"
                              }`}
                            >
                              <span>T{t.numero}</span>
                              {negocio.mostrarStockPublico && (
                                <span className={`text-[9px] ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                                  {t.stock > 0 ? `${t.stock}` : "0"}
                                </span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        // Fallback numérico si no viene array de tallas
                        [37, 38, 39, 40, 41, 42].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setTallaSeleccionadaConfig(num)}
                            className={`min-w-12 py-2 px-2.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                              String(tallaSeleccionadaConfig) === String(num)
                                ? "bg-amber-500 text-white border-amber-500 shadow-sm scale-105"
                                : "bg-white text-slate-800 border-slate-200 hover:border-slate-400"
                            }`}
                          >
                            T{num}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Cantidad de Pares */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Cantidad de pares:</span>
                      <span className="text-[11px] text-slate-500">Unidades de la talla seleccionada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCantidadConfig(Math.max(1, cantidadConfig - 1))}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-100 font-bold"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-slate-900 font-mono">
                        {cantidadConfig}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCantidadConfig(cantidadConfig + 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-100 font-bold"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Detalle de Curva Comercial de la Serie */}
                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                      <Package size={15} className="text-amber-700" />
                      <span>Curva Completa de la Serie {serieConfigNombre}</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Cada serie completa incluye el lote con todas las tallas correspondientes de la curva comercial:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {varianteConfig.tallas && varianteConfig.tallas.length > 0 ? (
                        varianteConfig.tallas.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 font-mono font-bold text-[11px]"
                          >
                            T{t.numero}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-amber-700 font-semibold">Tallas completas del lote estándar</span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-amber-900 pt-1">
                      Total: {varianteConfig.tallas?.length || 6} pares por cada serie completa.
                    </div>
                  </div>

                  {/* Cantidad de Series Completas */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Cantidad de series completas:</span>
                      <span className="text-[11px] text-slate-500">
                        Total: {cantidadConfig * (varianteConfig.tallas?.length || 6)} pares en total
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCantidadConfig(Math.max(1, cantidadConfig - 1))}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-100 font-bold"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-slate-900 font-mono">
                        {cantidadConfig}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCantidadConfig(cantidadConfig + 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-100 font-bold"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtotal y Botón Agregar */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                {negocio.mostrarPreciosPublico && varianteConfig.salePrice > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider">Subtotal estimado:</span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      ${(
                        tipoPedidoConfig === "PAR"
                          ? cantidadConfig * varianteConfig.salePrice
                          : cantidadConfig * (varianteConfig.tallas?.length || 6) * varianteConfig.salePrice
                      ).toFixed(2)}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAgregarAlCarrito}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={16} className="text-amber-400" />
                  <span>Agregar al Pedido</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Drawer Lateral del Carrito de Pedidos */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header del Carrito */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">Mi Pedido</h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {totalParesCarrito} {totalParesCarrito === 1 ? "par seleccionado" : "pares seleccionados"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista de Ítems */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {carrito.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="text-4xl">🛒</div>
                  <h4 className="font-bold text-sm text-slate-800">Tu pedido está vacío</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Explora los modelos en nuestro catálogo y añade calzado por par o por serie completa.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 transition-all"
                  >
                    Ver Catálogo
                  </button>
                </div>
              ) : (
                carrito.map((item) => {
                  const paresItem = item.tipoPedido === "SERIE_COMPLETA" ? item.cantidad * (item.paresPorSerie || 6) : item.cantidad;
                  const subtotalItem = item.precioUnitario * paresItem;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.fotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.fotoUrl} alt={item.modeloNombre} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">👞</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-extrabold text-xs text-slate-900 truncate">
                              {item.modeloNombre}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleEliminarItemCarrito(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                              title="Eliminar artículo"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5 space-x-1">
                            <span>Color: <strong className="text-slate-700">{item.color}</strong></span>
                            <span>·</span>
                            <span>Serie: <strong className="text-amber-700">{item.serieNombre}</strong></span>
                          </div>

                          <div className="mt-1">
                            {item.tipoPedido === "PAR" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md text-[10px] font-bold border border-blue-200">
                                👟 Par suelto · Talla {item.tallaNumero}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 rounded-md text-[10px] font-bold border border-amber-200" title={item.desgloseTallas}>
                                <Package size={10} />
                                <span>Serie completa ({item.paresPorSerie || 6} pares/serie)</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contador y Subtotal */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateCantidadCarrito(item.id, -1)}
                            className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-200"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-mono font-bold text-slate-900 px-1">
                            {item.cantidad} {item.tipoPedido === "SERIE_COMPLETA" ? "serie(s)" : "par(es)"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCantidadCarrito(item.id, 1)}
                            className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-200"
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        {subtotalItem > 0 && (
                          <div className="font-mono font-extrabold text-slate-900 text-xs">
                            ${subtotalItem.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Formulario de Cliente (si hay ítems) */}
              {carrito.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 mt-4">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Datos para el Pedido:
                  </h4>
                  <div className="space-y-2 text-xs">
                    <input
                      type="text"
                      placeholder="Tu nombre completo *"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900"
                    />
                    <input
                      type="tel"
                      placeholder="Número de WhatsApp *"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Ciudad / Dirección de entrega (opcional)"
                      value={clienteDireccion}
                      onChange={(e) => setClienteDireccion(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900"
                    />
                    <textarea
                      placeholder="Observaciones adicionales (ej. entrega a domicilio, envío interprovincial...)"
                      rows={2}
                      value={notasPedido}
                      onChange={(e) => setNotasPedido(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer con Totales y Botón WhatsApp */}
            {carrito.length > 0 && (
              <div className="p-5 border-t border-slate-200 bg-white space-y-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span>Total de Calzado:</span>
                    <span className="font-bold text-slate-900 font-mono">{totalParesCarrito} pares</span>
                  </div>
                  {totalPrecioCarrito > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-extrabold text-slate-900">Total Estimado:</span>
                      <span className="font-black text-lg text-emerald-700 font-mono">
                        ${totalPrecioCarrito.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleEnviarPedidoWhatsApp}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  <span>Enviar Pedido por WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
