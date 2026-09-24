"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Layers,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Store,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  ChevronRight,
  MessageCircle,
  HelpCircle,
  Clock,
  Award,
  ChevronDown,
  Lock,
  Send,
  Sliders,
  Eye,
  Check,
  Star,
} from "lucide-react";

export default function SaasLandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoForm, setDemoForm] = useState({
    nombre: "",
    negocio: "",
    telefono: "",
    ciudad: "Cevallos",
    paresMensuales: "100-500",
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // ROI Calculator state
  const [localesCount, setLocalesCount] = useState(1);
  const [paresPromedioMes, setParesPromedioMes] = useState(300);

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setShowDemoModal(false);
      setDemoSubmitted(false);
      const text = encodeURIComponent(
        `¡Hola NEXORA! Me interesa solicitar una demostración para mi negocio "${demoForm.negocio}" en ${demoForm.ciudad}. Mi nombre es ${demoForm.nombre} (Tel: ${demoForm.telefono}).`
      );
      window.open(`https://wa.me/593999999999?text=${text}`, "_blank");
    }, 1500);
  };

  const plans = [
    {
      id: "PLAN_BASICO",
      name: "Plan Taller / Básico",
      desc: "Diseñado para locales individuales y talleres de producción de calzado que inician su digitalización.",
      priceMonthly: 29.99,
      priceYearly: 24.99,
      popular: false,
      features: [
        "1 Sucursal / Local Comercial",
        "Control de Inventario por Curvas y Tallas",
        "Notas de Entrega y Registro de Ventas",
        "Gestión de Proveedores y Talleres de Aparado",
        "Catálogo Digital Básico",
        "15 Días de Prueba Gratis",
        "Soporte Estándar por WhatsApp",
      ],
      cta: "Comenzar Gratis",
      accent: "from-blue-500/20 to-emerald-500/10 border-blue-500/30",
    },
    {
      id: "PLAN_COMERCIAL",
      name: "Plan Comercial Pro",
      desc: "La solución completa para distribuidoras y locales con crédito directo y alto flujo de rotación.",
      priceMonthly: 49.99,
      priceYearly: 39.99,
      popular: true,
      badge: "Más Recomendado",
      features: [
        "Hasta 3 Sucursales Conectadas",
        "Scoring Crediticio Progresivo de Clientes",
        "Control de Cartera de Crédito y Cobranzas",
        "Módulo de Pedidos por Mayor (Docenas y Series)",
        "Precios y Costos Diferenciados por Taller",
        "Tienda Virtual y Pedidos por WhatsApp",
        "Verificación de Seguridad OTP Gyre",
        "Soporte Prioritario 24/7",
      ],
      cta: "Iniciar Prueba Pro",
      accent: "from-emerald-500/20 via-emerald-600/10 to-teal-500/20 border-emerald-500/50 shadow-emerald-500/10 shadow-2xl",
    },
    {
      id: "PLAN_EMPRESARIAL",
      name: "Plan Empresarial",
      desc: "Para cadenas comerciales, fábricas y comercializadoras mayoristas con múltiples sucursales.",
      priceMonthly: 89.99,
      priceYearly: 74.99,
      popular: false,
      features: [
        "Sucursales y Bodegas Ilimitadas",
        "Permisos Restringidos por Administrador de Local",
        "Predicción de Demanda Inteligente",
        "Auditoría Completa y Registro de Trazabilidad",
        "Geolocalización de Entregas y Rutas",
        "Integración con Microservicio SRI",
        "Capacitación Personalizada en Sitio",
        "Gestor de Cuenta Dedicado",
      ],
      cta: "Contactar a Ventas",
      accent: "from-purple-500/20 to-indigo-500/10 border-purple-500/30",
    },
  ];

  const faqs = [
    {
      q: "¿NEXORA maneja específicamente la venta de calzado por tallas y series completas?",
      a: "Sí. NEXORA está desarrollado específicamente para la industria del calzado de cuero. Permite gestionar inventarios por curvas de tallas (ej. T38 a T42), series de producción completas por docenas, medios pares y venta directa unitaria.",
    },
    {
      q: "¿Cómo funciona el scoring crediticio progresivo para comerciantes?",
      a: "NEXORA evalúa el comportamiento real de pagos y abonos de cada cliente. A medida que tus compradores cumplen sus plazos en pedidos por mayor, el sistema incrementa automáticamente su cupo de crédito y califica su nivel de confiabilidad (A, B, C, D).",
    },
    {
      q: "¿Puedo asignar un taller o proveedor diferente para cada modelo o color?",
      a: "Completamente. Puedes definir qué taller artesanal fabricó cada variante específica de calzado, registrar su costo de entrega particular y calcular el margen de ganancia exacto por modelo.",
    },
    {
      q: "¿Qué sucede si tengo múltiples locales o sucursales?",
      a: "NEXORA permite crear sucursales independientes. Puedes tener un Administrador General que visualice y controle todas las sucursales, o asignar administradores que solo tengan acceso y reportes de su local específico.",
    },
    {
      q: "¿Se requiere instalar algún programa en mi computadora?",
      a: "No. NEXORA es 100% web en la nube. Puedes acceder desde cualquier computadora, tablet o teléfono celular sin instalaciones complicadas y con sincronización en tiempo real.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white font-sans">
      {/* Glow Ambient Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/15 blur-[140px] rounded-full" />
        <div className="absolute top-[40%] -left-40 w-[600px] h-[600px] bg-blue-500/10 blur-[160px] rounded-full" />
        <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-emerald-600/10 blur-[150px] rounded-full" />
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white">
                NEXORA <span className="text-emerald-400">SaaS</span>
              </span>
              <span className="block text-[10px] tracking-wider uppercase font-semibold text-slate-400">
                Calzado de Cuero • Cevallos
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#solucion" className="hover:text-emerald-400 transition-colors">
              Módulos
            </a>
            <a href="#curvas" className="hover:text-emerald-400 transition-colors">
              Curvas de Calzado
            </a>
            <a href="#scoring" className="hover:text-emerald-400 transition-colors">
              Scoring Crediticio
            </a>
            <a href="#precios" className="hover:text-emerald-400 transition-colors">
              Planes y Precios
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              Preguntas
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
            >
              Iniciar Sesión
            </Link>
            <button
              onClick={() => setShowDemoModal(true)}
              className="px-4 py-2 text-sm font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.02]"
            >
              Prueba Gratis 15 Días
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-8 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          La plataforma especializada para el sector calzado de Cevallos
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.1]">
          Control Integral del <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">Ciclo Comercial</span> y Scoring Crediticio
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
          Diseñado a la medida para locales comerciales, comercializadoras y talleres de calzado de cuero. Administra ventas por pares o series completas, seguimiento de créditos a clientes y control de talleres artesanos.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setShowDemoModal(true)}
            className="w-full sm:w-auto px-8 py-4 text-base font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-2xl shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
          >
            Comenzar Prueba Gratis <ArrowRight className="w-5 h-5" />
          </button>
          <a
            href="#solucion"
            className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            Explorar Módulos
          </a>
        </div>

        {/* Feature Badges */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-emerald-400 font-black text-2xl mb-1">100%</div>
            <div className="text-xs text-slate-400 font-medium">Adaptado a tallas (T34-T45) y curvas de producción</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-teal-400 font-black text-2xl mb-1">Scoring</div>
            <div className="text-xs text-slate-400 font-medium">Calificación progresiva de riesgo crediticio</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-blue-400 font-black text-2xl mb-1">Multi-Taller</div>
            <div className="text-xs text-slate-400 font-medium">Asignación de costo por variante de proveedor</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-purple-400 font-black text-2xl mb-1">Omnicanal</div>
            <div className="text-xs text-slate-400 font-medium">Catálogo web con pedidos automáticos por WhatsApp</div>
          </div>
        </div>

        {/* Preview UI Component Showcase */}
        <div className="mt-16 relative rounded-3xl p-2 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border border-slate-700/60 shadow-2xl overflow-hidden max-w-5xl mx-auto">
          <div className="bg-slate-950 rounded-2xl p-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-semibold text-slate-400 ml-2">
                  Vista Previa • Módulo de Gestión de Modelos y Curvas
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                EN VIVO
              </span>
            </div>

            {/* Standard Model Card Pattern */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                  <ShoppingBag className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-black text-base uppercase text-white tracking-wide">
                    Mocasín Oxford Cuero Vacuno
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">Color: Negro Brillante</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                      Serie: Curva Completa Caballero (38-42)
                    </span>
                  </div>
                </div>
              </div>

              {/* Tallas Píldoras */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { t: "T38", q: 2 },
                  { t: "T39", q: 4 },
                  { t: "T40", q: 6 },
                  { t: "T41", q: 4 },
                  { t: "T42", q: 2 },
                ].map((item) => (
                  <div
                    key={item.t}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center"
                  >
                    <div className="text-[10px] text-slate-400 font-bold">{item.t}</div>
                    <div className="text-xs text-emerald-400 font-black">{item.q} pares</div>
                  </div>
                ))}
              </div>

              {/* Resumen */}
              <div className="text-right">
                <div className="text-xs text-slate-400 font-medium">18 pares (1.5 Docenas)</div>
                <div className="text-xs text-slate-300 font-semibold">$24.00 / par</div>
                <div className="text-lg font-black text-emerald-400">$432.00</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions / Modules Grid */}
      <section id="solucion" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">
            Arquitectura Especializada
          </h2>
          <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Todo lo que tu negocio de calzado necesita en una sola plataforma
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Curvas y Tallas por Serie</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Organiza lotes completos por serie y docena o maneja el despiece por tallas sueltas para venta directa al cliente final.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mb-6 text-teal-400 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Scoring y Cartera a Crédito</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Otorga créditos a comerciantes con reglas claras de cupo, historial de cumplimiento y emisión de comprobantes digitales de abono.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Catálogo y Pedidos WhatsApp</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Publica tu vitrina virtual con fotos de alta resolución y recibe pedidos listos para despachar con un solo toque desde WhatsApp.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Talleres de Aparado y Armado</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Asigna a cada modelo su taller artesano correspondiente, lleva el control de pagos por entrega y mantén trazabilidad de confección.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Seguridad OTP y Sesión Única</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Protección contra accesos no autorizados mediante códigos de verificación de 4 dígitos (Gyre) y auditoría de todas las transacciones.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Multisucursal Inteligente</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Controla la matriz y los puntos de venta satélites con inventario independiente o centralizado y reportes de rentabilidad consolidados.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">
            Planes Claros y Transparentes
          </h2>
          <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-6">
            Inversión justa para potenciar tu negocio
          </h3>
          <p className="text-slate-400 text-base">
            Sin costos ocultos ni contratos forzosos. Todos los planes incluyen 15 días de prueba gratuita.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Pago Mensual
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Pago Anual <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-extrabold">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 bg-gradient-to-b ${plan.accent} bg-slate-900/60 border flex flex-col justify-between backdrop-blur-md`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-400/20">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-black text-white">{plan.name}</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">{plan.desc}</p>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl sm:text-5xl font-black text-white">${price.toFixed(2)}</span>
                    <span className="text-sm font-semibold text-slate-400">/ mes</span>
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowDemoModal(true)}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                    plan.popular
                      ? "bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/25"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-900">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">
            Resolución de Dudas
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Preguntas Frecuentes
          </h3>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-base text-white hover:text-emerald-400 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    faqOpen === index ? "rotate-180 text-emerald-400" : ""
                  }`}
                />
              </button>
              {faqOpen === index && (
                <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-800/50 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl p-10 sm:p-16 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto">
            <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-6">
              Empieza a modernizar tu negocio de calzado hoy
            </h3>
            <p className="text-slate-300 text-base mb-8">
              Únete a los comerciantes de Cevallos que ya tienen el control absoluto de sus curvas de calzado, inventario y cartera de crédito.
            </p>
            <button
              onClick={() => setShowDemoModal(true)}
              className="px-8 py-4 text-base font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-2xl shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
            >
              Solicitar Demostración y Prueba de 15 Días
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-400">NEXORA Platform</span> • Cevallos, Tungurahua - Ecuador
          </div>
          <div>
            © {new Date().getFullYear()} NEXORA. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-xl font-black text-white mb-2">Solicitar Prueba Gratuita</h3>
            <p className="text-xs text-slate-400 mb-6">
              Déjanos tus datos y un especialista configurará tu entorno de pruebas en minutos.
            </p>

            {demoSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                ¡Solicitud recibida! Redirigiendo a WhatsApp...
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={demoForm.nombre}
                    onChange={(e) => setDemoForm({ ...demoForm, nombre: e.target.value })}
                    placeholder="Ej. Christopher Paucar"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Negocio / Taller</label>
                  <input
                    type="text"
                    required
                    value={demoForm.negocio}
                    onChange={(e) => setDemoForm({ ...demoForm, negocio: e.target.value })}
                    placeholder="Ej. Calzado Cevallos Deluxe"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={demoForm.telefono}
                    onChange={(e) => setDemoForm({ ...demoForm, telefono: e.target.value })}
                    placeholder="Ej. 0991234567"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ciudad o Cantón</label>
                  <input
                    type="text"
                    required
                    value={demoForm.ciudad}
                    onChange={(e) => setDemoForm({ ...demoForm, ciudad: e.target.value })}
                    placeholder="Ej. Cevallos, Ambato, etc."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Enviar y Comenzar 15 Días Gratis
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
