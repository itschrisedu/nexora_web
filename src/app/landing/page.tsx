"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface NegocioInfo {
  tenantId: string;
  nombreNegocio: string;
  direccion: string;
  telefono: string;
  email: string;
  logoUrl: string | null;
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

interface LandingData {
  negocio: NegocioInfo;
  sucursales: Sucursal[];
}

function LandingContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") || "";
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLanding = async () => {
      try {
        const url = `${API_BASE_URL}/catalogo/landing${tenantId ? `?tenantId=${tenantId}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("No se pudo cargar la información");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    };
    fetchLanding();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">👟</div>
          <h2 className="text-2xl font-bold text-white">No se pudo cargar la página</h2>
          <p className="text-white/60 text-sm">{error || "Intenta de nuevo más tarde"}</p>
        </div>
      </div>
    );
  }

  const { negocio, sucursales } = data;
  const primaryColor = "#B8860B";

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-auto" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ══════ NAVBAR ══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {negocio.logoUrl ? (
              <img src={negocio.logoUrl} alt={negocio.nombreNegocio} className="h-9 w-9 rounded-xl object-cover ring-2 ring-amber-400/30" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 font-black text-sm">
                {negocio.nombreNegocio.charAt(0)}
              </div>
            )}
            <span className="font-bold text-base tracking-tight">{negocio.nombreNegocio}</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <a href="#inicio" className="hover:text-amber-400 transition-colors">Inicio</a>
            <a href="#nosotros" className="hover:text-amber-400 transition-colors">Nosotros</a>
            <a href="#sucursales" className="hover:text-amber-400 transition-colors">Sucursales</a>
            <a href="#contacto" className="hover:text-amber-400 transition-colors">Contacto</a>
          </div>
          <a
            href={`https://wa.me/${negocio.whatsappContacto}?text=${encodeURIComponent("Hola, me interesa su catálogo de calzado")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            💬 WhatsApp
          </a>
        </div>
      </nav>

      {/* ══════ HERO ══════ */}
      <section
        id="inicio"
        className="relative pt-16 min-h-[85vh] flex items-center"
        style={{
          background: negocio.heroBannerUrl
            ? `linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,23,42,0.75)), url(${negocio.heroBannerUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, #0f172a 0%, #1e293b 50%, ${primaryColor}22 100%)`,
        }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-amber-400/5 rounded-full blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-amber-400 text-xs font-semibold tracking-wide uppercase">Cantón Cevallos • Tungurahua</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
              {negocio.heroTitulo || "Calzado Ecuatoriano de Calidad"}
            </h1>

            <p className="text-lg md:text-xl text-white/60 leading-relaxed max-w-2xl">
              {negocio.heroSubtitulo || "Calzado artesanal de cuero directamente desde fábrica"}
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              {sucursales.length > 0 && (
                <a
                  href={`/catalogo/${sucursales[0].id}`}
                  className="group px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 font-bold text-sm rounded-xl transition-all shadow-xl shadow-amber-400/20 flex items-center gap-2"
                >
                  👞 Ver Catálogo
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </a>
              )}
              <a
                href={`https://wa.me/${negocio.whatsappContacto}?text=${encodeURIComponent("Hola, me interesa consultar precios mayoristas de calzado de cuero")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2"
              >
                📱 Consultar Precios
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-8">
              <div>
                <div className="text-2xl font-black text-amber-400">{sucursales.length}</div>
                <div className="text-xs text-white/40 font-medium">Sucursales</div>
              </div>
              <div>
                <div className="text-2xl font-black text-amber-400">100%</div>
                <div className="text-xs text-white/40 font-medium">Cuero Genuino</div>
              </div>
              <div>
                <div className="text-2xl font-black text-amber-400">Cevallos</div>
                <div className="text-xs text-white/40 font-medium">Capital del Calzado</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SOBRE NOSOTROS ══════ */}
      <section id="nosotros" className="py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full">
                <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Sobre Nosotros</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                Tradición y calidad desde el corazón de <span className="text-amber-400">Cevallos</span>
              </h2>
              <p className="text-white/60 leading-relaxed text-base">
                {negocio.sobreNosotros || "Somos productores y comercializadores de calzado de cuero."}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                {[
                  { icon: "🏭", label: "Producción Propia" },
                  { icon: "🐄", label: "Cuero 100% Genuino" },
                  { icon: "📦", label: "Envíos a todo Ecuador" },
                  { icon: "💰", label: "Precios de Fábrica" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-semibold text-white/80">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-amber-400/10 to-emerald-500/10 rounded-3xl border border-white/5 flex items-center justify-center">
                {negocio.logoUrl ? (
                  <img src={negocio.logoUrl} alt={negocio.nombreNegocio} className="w-48 h-48 object-contain rounded-2xl" />
                ) : (
                  <div className="text-center space-y-4">
                    <div className="text-8xl">👞</div>
                    <p className="text-white/40 text-sm font-medium">Calzado de Cuero Artesanal</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SUCURSALES ══════ */}
      {sucursales.length > 0 && (
        <section id="sucursales" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full mx-auto">
                <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Nuestras Sucursales</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black">Encuéntranos en <span className="text-amber-400">Cevallos</span></h2>
              <p className="text-white/50 text-base max-w-lg mx-auto">Visita nuestros locales o explora nuestro catálogo digital por sucursal</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sucursales.map((suc) => (
                <div
                  key={suc.id}
                  className="group relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 rounded-2xl p-6 hover:border-amber-400/30 transition-all duration-300 hover:shadow-xl hover:shadow-amber-400/5"
                >
                  {suc.isMatriz && (
                    <div className="absolute -top-2.5 right-4 px-3 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-black uppercase rounded-full tracking-wider">
                      Matriz
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white">{suc.nombre}</h3>
                        <p className="text-white/40 text-xs mt-0.5">{suc.direccion}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-white/50">
                      {suc.telefono && (
                        <div className="flex items-center gap-2">
                          <span>📞</span>
                          <span>{suc.telefono}</span>
                        </div>
                      )}
                      {suc.email && (
                        <div className="flex items-center gap-2">
                          <span>📧</span>
                          <span>{suc.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span>👟</span>
                        <span>{suc.totalModelos} modelos disponibles</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <a
                        href={`/catalogo/${suc.id}`}
                        className="flex-1 text-center px-4 py-2.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 font-bold text-xs rounded-xl transition-all border border-amber-400/10"
                      >
                        Ver Catálogo
                      </a>
                      <a
                        href={`https://wa.me/${suc.whatsapp}?text=${encodeURIComponent(`Hola ${suc.nombre}, me interesa su catálogo de calzado`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl transition-all border border-emerald-500/10"
                      >
                        💬
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════ CONTACTO ══════ */}
      <section id="contacto" className="py-24 bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full mx-auto">
            <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Contáctanos</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black">
            ¿Listo para renovar tu <span className="text-amber-400">inventario</span>?
          </h2>
          <p className="text-white/50 text-base max-w-lg mx-auto">
            Escríbenos por WhatsApp para cotizaciones mayoristas, pedidos personalizados y más
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={`https://wa.me/${negocio.whatsappContacto}?text=${encodeURIComponent("Hola, me interesa hacer un pedido mayorista de calzado")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
            >
              📱 Escribir por WhatsApp
            </a>
            {negocio.email && (
              <a
                href={`mailto:${negocio.email}`}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2"
              >
                📧 {negocio.email}
              </a>
            )}
          </div>

          {/* Redes Sociales */}
          {(negocio.facebookUrl || negocio.instagramUrl || negocio.tiktokUrl) && (
            <div className="flex justify-center gap-4 pt-4">
              {negocio.facebookUrl && (
                <a href={negocio.facebookUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 rounded-xl transition-all text-white/50 hover:text-blue-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              )}
              {negocio.instagramUrl && (
                <a href={negocio.instagramUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-pink-500/10 border border-white/5 hover:border-pink-500/20 rounded-xl transition-all text-white/50 hover:text-pink-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
              {negocio.tiktokUrl && (
                <a href={negocio.tiktokUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all text-white/50 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {negocio.logoUrl && <img src={negocio.logoUrl} alt="" className="h-6 w-6 rounded-lg object-cover" />}
            <span className="text-white/40 text-xs font-medium">{negocio.nombreNegocio}</span>
          </div>
          <div className="text-white/30 text-xs">
            RUC: {negocio.ruc} · {negocio.direccion}
          </div>
          <div className="text-white/20 text-[10px]">
            Powered by NEXORA · © {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LandingContent />
    </Suspense>
  );
}
