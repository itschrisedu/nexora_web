"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  Building2,
  FileText,
  MapPin,
  RefreshCw,
  BarChart3,
  PhoneCall,
  CheckCircle,
  X,
  Calculator,
  Flame,
  ArrowUpRight,
  Globe,
  Cloud,
  Fingerprint,
  Package,
  Truck,
  Headphones,
  Monitor,
  Mail,
  Phone,
  ChevronUp,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   ANIMATED COUNTER HOOK
   ══════════════════════════════════════════════════════════════════ */
function useAnimatedCounter(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!startOnView) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, startOnView]);

  return { count, ref };
}

/* ══════════════════════════════════════════════════════════════════
   SCROLL REVEAL HOOK
   ══════════════════════════════════════════════════════════════════ */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════ */
export default function SaasLandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [selectedPlanForDemo, setSelectedPlanForDemo] = useState<string>("Plan Comercial Pro");
  const [activeFeatureTab, setActiveFeatureTab] = useState<"scoring" | "curvas" | "talleres" | "offline">("scoring");
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll tracking for parallax
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll reveal hooks for each major section
  const heroReveal = useScrollReveal();
  const statsReveal = useScrollReveal();
  const howItWorksReveal = useScrollReveal();
  const featuresReveal = useScrollReveal();
  const roiReveal = useScrollReveal();
  const pricingReveal = useScrollReveal();
  const testimonialsReveal = useScrollReveal();
  const faqReveal = useScrollReveal();
  const ctaReveal = useScrollReveal();

  // Animated counters
  const counter1 = useAnimatedCounter(100, 1800);
  const counter2 = useAnimatedCounter(99, 1800);
  const counter3 = useAnimatedCounter(15, 1200);
  const counter4 = useAnimatedCounter(24, 1000);

  // Demo form state
  const [demoForm, setDemoForm] = useState({
    nombre: "",
    negocio: "",
    telefono: "",
    ciudad: "Cevallos",
    paresMensuales: "300 - 800 pares",
    planInteres: "Plan Comercial Pro",
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // ROI Calculator state
  const [localesCount, setLocalesCount] = useState(2);
  const [paresPromedioMes, setParesPromedioMes] = useState(450);
  const [porcentajeCredito, setPorcentajeCredito] = useState(50);

  const roiCalculado = useMemo(() => {
    const ventasMensualesEst = paresPromedioMes * 26 * localesCount;
    const ventasCredito = ventasMensualesEst * (porcentajeCredito / 100);
    const perdidasMorosidadEvitadas = ventasCredito * 0.08;
    const horasAhorradasMes = localesCount * 22;
    const valorTiempoAhorrado = horasAhorradasMes * 7.5;
    const ahorroTotalMensual = perdidasMorosidadEvitadas + valorTiempoAhorrado;
    const costoPlanMensual = 49.99;
    const roiPorcentaje = Math.round(((ahorroTotalMensual - costoPlanMensual) / costoPlanMensual) * 100);

    return {
      ventasMensualesEst,
      perdidasMorosidadEvitadas: Math.round(perdidasMorosidadEvitadas),
      horasAhorradasMes,
      ahorroTotalMensual: Math.round(ahorroTotalMensual),
      roiPorcentaje: Math.max(150, roiPorcentaje),
    };
  }, [localesCount, paresPromedioMes, porcentajeCredito]);

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const handleOpenDemoForPlan = (planName: string) => {
    setSelectedPlanForDemo(planName);
    setDemoForm((prev) => ({ ...prev, planInteres: planName }));
    setShowDemoModal(true);
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setShowDemoModal(false);
      setDemoSubmitted(false);
      const text = encodeURIComponent(
        `¡Hola NEXORA! Me interesa adquirir el *${demoForm.planInteres}* para mi negocio de calzado.\n\n` +
          `👤 *Nombre:* ${demoForm.nombre}\n` +
          `🏢 *Negocio:* ${demoForm.negocio}\n` +
          `📍 *Ciudad:* ${demoForm.ciudad}\n` +
          `📞 *Teléfono:* ${demoForm.telefono}\n` +
          `📦 *Volumen:* ${demoForm.paresMensuales}\n\n` +
          `¿Me podrían brindar una demostración guiada y activar mi prueba de 15 días?`
      );
      window.open(`https://wa.me/593991234567?text=${text}`, "_blank");
    }, 1200);
  };

  const plans = [
    {
      id: "PLAN_BASICO",
      name: "Plan Taller / Básico",
      tagline: "Ideal para talleres artesanales y locales independientes que inician su digitalización.",
      priceMonthly: 29.99,
      priceYearly: 23.99,
      popular: false,
      badge: "Esencial",
      icon: <Store className="w-6 h-6" />,
      features: [
        "1 Sucursal / Local Comercial",
        "Control de Inventario por Curvas y Tallas (T34 a T45)",
        "Registro de Ventas y Notas de Entrega Internas",
        "Gestión de Proveedores y Talleres de Aparado",
        "Catálogo Digital Web con Pedidos por WhatsApp",
        "Validación Anti-Bot con Deslizador de Seguridad",
        "15 Días de Prueba Completa Gratis",
        "Soporte Estándar por WhatsApp",
      ],
      notIncluded: [
        "Scoring crediticio progresivo",
        "Control avanzado de cartera a crédito",
        "Multisucursales conectadas",
        "Auditoría con trazabilidad de IP y accesos",
      ],
      cta: "Comenzar Prueba Gratis",
      accent: "from-slate-900/90 to-slate-900/70 border-slate-700/60",
      buttonStyle: "bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/25",
      iconColor: "text-slate-300",
    },
    {
      id: "PLAN_COMERCIAL",
      name: "Plan Comercial Pro",
      tagline: "La solución integral para distribuidoras y locales con crédito directo y venta al por mayor.",
      priceMonthly: 49.99,
      priceYearly: 39.99,
      popular: true,
      badge: "Más Recomendado",
      icon: <TrendingUp className="w-6 h-6" />,
      features: [
        "Hasta 3 Sucursales Conectadas en Red",
        "Scoring Crediticio Progresivo de Clientes (A, B, C, D)",
        "Control de Cartera de Crédito, Plazos y Abonos",
        "Módulo de Pedidos por Mayor (Series, Curvas y Docenas)",
        "Costos y Precios Diferenciados por Taller de Confección",
        "Vitrina Virtual con Desglose de Tallas y Colores",
        "Bitácora de Auditoría y Control de Actividades (Logins/IP)",
        "Seguridad OTP Gyre de 4 Dígitos para Transferencia de Sesión",
        "Soporte Prioritario 24/7 en Cevallos y Tungurahua",
      ],
      notIncluded: [
        "Bodegas y sucursales ilimitadas",
        "Predicción de demanda con Inteligencia Artificial",
      ],
      cta: "Adquirir Plan Comercial Pro",
      accent: "from-emerald-950/80 via-slate-900/95 to-teal-950/70 border-emerald-500/40 ring-1 ring-emerald-500/20",
      buttonStyle: "bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25 font-black",
      iconColor: "text-emerald-400",
    },
    {
      id: "PLAN_EMPRESARIAL",
      name: "Plan Empresarial",
      tagline: "Para fábricas, cadenas comerciales y comercializadoras mayoristas con múltiples sucursales.",
      priceMonthly: 89.99,
      priceYearly: 71.99,
      popular: false,
      badge: "Ilimitado",
      icon: <Building2 className="w-6 h-6" />,
      features: [
        "Sucursales y Bodegas de Almacén Ilimitadas",
        "Scoring Crediticio Avanzado con Límites Personalizados",
        "Módulo de Predicción de Demanda de Calzado",
        "Permisos Restringidos y Auditoría Detallada por Empleado",
        "Geolocalización GPS y Trazabilidad de Vendedores en Ruta",
        "Personalización Completa de Marca, Logo y Colores",
        "Capacitación Presencial en su Fábrica / Local en Cevallos",
        "Gestor de Cuenta VIP y Asistencia Inmediata",
        "Copia de Seguridad Automática Diaria en la Nube",
      ],
      notIncluded: [],
      cta: "Contactar a un Asesor VIP",
      accent: "from-indigo-950/60 via-slate-900/90 to-violet-950/50 border-indigo-500/30",
      buttonStyle: "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white shadow-lg shadow-indigo-600/20 font-bold",
      iconColor: "text-indigo-400",
    },
  ];

  const faqs = [
    {
      q: "¿NEXORA maneja específicamente la venta de calzado por tallas y series completas?",
      a: "Sí, absolutamente. A diferencia de sistemas genéricos de abarrotes o farmacias, NEXORA fue diseñado exclusivamente para la industria del calzado de cuero en Cevallos. Permite crear curvas de producción por serie (ej. T38 a T42), pedidos por docenas, medios pares y venta unitaria por talla con control automático de stock.",
    },
    {
      q: "¿Cómo funciona el scoring crediticio progresivo para clientes de calzado?",
      a: "El algoritmo de scoring analiza el historial real de pagos, puntualidad y volumen de compra de cada comerciante. Si un cliente paga puntualmente sus abonos, el sistema le asigna automáticamente una categoría de confianza superior (A o B) y sugiere aumentos de cupo seguros para evitar ventas con riesgo de morosidad.",
    },
    {
      q: "¿Puedo asignar a cada modelo el taller artesanal que lo fabricó?",
      a: "Totalmente. Puedes registrar a los talleres de aparado, corte y armado de Cevallos. Al crear un modelo, indicas qué taller confeccionó el lote y el costo por par acordado, permitiéndote conocer la rentabilidad neta exacta de cada diseño.",
    },
    {
      q: "¿Qué sucede si tengo 2 o más locales comerciales en el cantón?",
      a: "Con los Planes Comercial Pro y Empresarial puedes administrar todas tus sucursales desde una única cuenta. Tienes la opción de ver el inventario global consolidado o restringir para que los vendedores solo vean el stock de su sucursal física asignada.",
    },
    {
      q: "¿Cómo es el proceso de contratación y activación?",
      a: "La activación es inmediata. Al solicitar tu plan, te habilitamos tu entorno en la nube con 15 días de prueba gratuita sin compromiso. Te brindamos acompañamiento para cargar tus primeros modelos, curvas de tallas y colaboradores.",
    },
    {
      q: "¿Necesito instalar programas pesados o comprar computadoras caras?",
      a: "No. NEXORA es 100% web en la nube y funciona con tecnología progresiva de última generación. Puedes usarlo desde cualquier laptop, computadora, tablet o teléfono celular con conexión a internet y sincronización en tiempo real.",
    },
  ];

  const howItWorksSteps = [
    {
      step: 1,
      title: "Solicita tu Prueba Gratuita",
      description: "Completa el formulario o escríbenos por WhatsApp. En minutos activamos tu entorno en la nube con acceso completo a todas las funciones durante 15 días.",
      icon: <Send className="w-6 h-6" />,
      color: "from-emerald-400 to-teal-400",
    },
    {
      step: 2,
      title: "Configura tu Negocio",
      description: "Carga tus modelos de calzado, curvas de tallas, proveedores y talleres artesanales. Te acompañamos paso a paso con soporte directo en Cevallos.",
      icon: <Sliders className="w-6 h-6" />,
      color: "from-blue-400 to-cyan-400",
    },
    {
      step: 3,
      title: "Controla Todo desde un Panel",
      description: "Ventas, créditos, scoring, inventario por tallas y pedidos mayoristas, todo sincronizado en tiempo real desde cualquier dispositivo conectado.",
      icon: <Monitor className="w-6 h-6" />,
      color: "from-violet-400 to-purple-400",
    },
  ];

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-[family-name:var(--font-geist-sans)] overflow-x-hidden">
      {/* ═══════ INLINE KEYFRAME ANIMATIONS ═══════ */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(3deg); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up-delayed {
          0% { opacity: 0; transform: translateY(30px); }
          30% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-gradient-shift { 
          background-size: 200% 200%;
          animation: gradient-shift 6s ease infinite; 
        }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.7s ease-out forwards; }
        .animate-slide-up-delayed { animation: slide-up-delayed 1s ease-out forwards; }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.5s ease-out forwards; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
        
        .reveal-hidden { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal-visible { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }
        
        .glass-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.4));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .shimmer-line::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          animation: shimmer 3s infinite;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #060a12; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>

      {/* ═══════ BACKGROUND AMBIENT LIGHTS ═══════ */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-emerald-500/12 via-teal-500/8 to-transparent blur-[160px] rounded-full animate-pulse-glow"
          style={{ transform: `translateY(${scrollY * 0.05}px)` }}
        />
        <div className="absolute top-[30%] -left-48 w-[700px] h-[700px] bg-blue-600/8 blur-[180px] rounded-full animate-float-slow" />
        <div className="absolute top-[60%] -right-48 w-[650px] h-[650px] bg-emerald-600/8 blur-[170px] rounded-full animate-float" />
        <div className="absolute bottom-[10%] left-1/4 w-[550px] h-[550px] bg-indigo-600/6 blur-[160px] rounded-full animate-float-slow" />
        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 0.8px, transparent 0.8px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* ════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════ */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrollY > 50 ? "backdrop-blur-2xl bg-[#060a12]/90 border-b border-white/5 shadow-xl shadow-black/20" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 p-[2px] shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#060a12] rounded-[14px] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">
                  NEXORA
                </span>
                <span className="hidden sm:inline px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                  SaaS
                </span>
              </div>
              <span className="hidden sm:block text-[10px] tracking-wider uppercase font-medium text-slate-500">
                Software Especializado en Calzado
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-slate-400">
            {[
              { href: "#solucion", label: "Módulos" },
              { href: "#como-funciona", label: "Cómo Funciona" },
              { href: "#roi", label: "Calculadora ROI" },
              { href: "#precios", label: "Planes" },
              { href: "#faq", label: "Preguntas" },
            ].map((link) => (
              <a key={link.href} href={link.href} className="hover:text-emerald-400 transition-colors duration-200 relative group">
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-emerald-400 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden md:inline-flex px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-200"
            >
              Acceso Clientes
            </Link>
            <button
              onClick={() => handleOpenDemoForPlan("Plan Comercial Pro")}
              className="px-5 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-xl shadow-lg shadow-emerald-500/15 transition-all transform hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
            >
              Prueba Gratis
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400"
            >
              {mobileMenuOpen ? <X size={20} /> : (
                <div className="space-y-1.5">
                  <div className="w-5 h-0.5 bg-current" />
                  <div className="w-4 h-0.5 bg-current" />
                  <div className="w-5 h-0.5 bg-current" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/5 bg-[#060a12]/98 backdrop-blur-2xl px-4 py-4 space-y-2 animate-slide-up">
            {[
              { href: "#solucion", label: "Módulos" },
              { href: "#como-funciona", label: "Cómo Funciona" },
              { href: "#roi", label: "Calculadora ROI" },
              { href: "#precios", label: "Planes y Precios" },
              { href: "#faq", label: "Preguntas" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ════════════════════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════════════════════ */}
      <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center z-10">
        <div ref={heroReveal.ref} className={`reveal-hidden ${heroReveal.isVisible ? "reveal-visible" : ""}`}>
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-8 animate-bounce-subtle">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plataforma #1 para Locales de Calzado en Cevallos</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.06]">
            Digitaliza tu Negocio de Calzado con{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent animate-gradient-shift inline-block">
              Inteligencia y Control Total
            </span>
          </h1>

          <p className="mt-7 text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Gestiona ventas por series completas o pares sueltos, evalua el credito de tus comerciantes con scoring progresivo y controla los costos de talleres artesanales. Todo desde un solo panel en la nube.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleOpenDemoForPlan("Plan Comercial Pro")}
              className="w-full sm:w-auto group px-8 py-4 text-sm font-black text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:from-emerald-300 hover:to-teal-300 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 cursor-pointer relative overflow-hidden"
            >
              <span className="relative z-10">Activar 15 Días de Prueba Gratis</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="https://wa.me/593991234567?text=Hola%20NEXORA%2C%20deseo%20solicitar%20informaci%C3%B3n%20sobre%20los%20planes%20del%20sistema%20para%20mi%20local%20de%20calzado"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 text-sm font-bold text-emerald-400 hover:text-white bg-white/5 hover:bg-emerald-950/40 border border-emerald-500/25 rounded-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
            >
              <MessageCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Hablar por WhatsApp</span>
            </a>
          </div>

          {/* Trust pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
            {[
              { icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />, text: "Sin contratos forzosos" },
              { icon: <Lock className="w-3.5 h-3.5 text-emerald-500" />, text: "Datos cifrados SSL" },
              { icon: <Cloud className="w-3.5 h-3.5 text-emerald-500" />, text: "100% en la nube" },
              { icon: <Headphones className="w-3.5 h-3.5 text-emerald-500" />, text: "Soporte local en Cevallos" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 font-medium">
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════ ANIMATED STATS BAR ═══════ */}
        <div
          ref={statsReveal.ref}
          className={`mt-16 sm:mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto reveal-hidden ${statsReveal.isVisible ? "reveal-visible" : ""}`}
        >
          {[
            { ref: counter1.ref, value: `${counter1.count}%`, label: "Especializado en Calzado", desc: "Curvas, series y numeración T34 a T45", color: "text-emerald-400", borderHover: "hover:border-emerald-500/30" },
            { ref: counter2.ref, value: `${counter2.count}.9%`, label: "Disponibilidad Garantizada", desc: "Servidores cloud con uptime continuo", color: "text-teal-400", borderHover: "hover:border-teal-500/30" },
            { ref: counter3.ref, value: counter3.count.toString(), label: "Días de Prueba Gratis", desc: "Acceso completo sin compromiso", color: "text-blue-400", borderHover: "hover:border-blue-500/30" },
            { ref: counter4.ref, value: `${counter4.count}/7`, label: "Soporte Técnico Directo", desc: "Atención por WhatsApp y presencial", color: "text-purple-400", borderHover: "hover:border-purple-500/30" },
          ].map((stat, i) => (
            <div
              key={i}
              ref={stat.ref}
              className={`group p-5 rounded-2xl glass-card border border-white/5 ${stat.borderHover} transition-all duration-300 hover:translate-y-[-2px] text-left reveal-delay-${i + 1}`}
            >
              <div className={`${stat.color} font-black text-3xl mb-1 font-[family-name:var(--font-geist-mono)]`}>{stat.value}</div>
              <div className="text-xs text-slate-200 font-bold">{stat.label}</div>
              <div className="text-[10px] text-slate-500 mt-1 leading-snug">{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          TRUST BADGES / POWERED BY
      ════════════════════════════════════════════════════════ */}
      <section className="py-10 px-4 border-y border-white/[0.03] relative z-10">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {[
            { icon: <Lock size={18} />, text: "Cifrado SSL 256-bit" },
            { icon: <Cloud size={18} />, text: "Infraestructura Cloud" },
            { icon: <Fingerprint size={18} />, text: "Autenticación OTP" },
            { icon: <ShieldCheck size={18} />, text: "Auditoría de Accesos" },
            { icon: <Globe size={18} />, text: "PWA Multiplataforma" },
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors">
              {badge.icon}
              <span className="text-[11px] font-semibold tracking-wide uppercase">{badge.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          CÓMO FUNCIONA (TIMELINE)
      ════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div
          ref={howItWorksReveal.ref}
          className={`reveal-hidden ${howItWorksReveal.isVisible ? "reveal-visible" : ""}`}
        >
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/8 border border-blue-500/20 text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-4">
              <Zap size={14} />
              Activación Inmediata
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
              Listo para vender en{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">3 simples pasos</span>
            </h3>
            <p className="text-slate-400 text-sm sm:text-base">
              No necesitas conocimientos técnicos. Te guiamos en cada etapa hasta que domines la plataforma por completo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-[60px] left-[16.6%] right-[16.6%] h-[2px] bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-violet-500/20" />

            {howItWorksSteps.map((step, i) => (
              <div
                key={step.step}
                className={`relative text-center group reveal-delay-${i + 1}`}
              >
                {/* Step number circle */}
                <div className="relative inline-flex mb-6">
                  <div className={`w-[72px] h-[72px] rounded-3xl bg-gradient-to-br ${step.color} p-[2px] shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <div className="w-full h-full bg-[#0a0f1c] rounded-[22px] flex items-center justify-center text-white">
                      {step.icon}
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#060a12] border-2 border-slate-800 flex items-center justify-center text-xs font-black text-white">
                    {step.step}
                  </div>
                </div>

                <h4 className="text-lg font-black text-white mb-2">{step.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          DEMOSTRACIÓN INTERACTIVA (FEATURE SHOWCASE)
      ════════════════════════════════════════════════════════ */}
      <section id="solucion" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div ref={featuresReveal.ref} className={`reveal-hidden ${featuresReveal.isVisible ? "reveal-visible" : ""}`}>
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-4">
              <Eye size={14} />
              Vista Previa en Vivo
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
              Herramientas que{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">transforman tu negocio</span>
            </h3>
            <p className="text-slate-400 text-sm sm:text-base">
              Explora las funciones que hacen a NEXORA la plataforma lider para locales de calzado de cuero.
            </p>
          </div>

          {/* Feature Selector Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              { id: "scoring" as const, label: "Scoring Crediticio", icon: <CreditCard size={14} /> },
              { id: "curvas" as const, label: "Curvas de Tallas", icon: <Layers size={14} /> },
              { id: "talleres" as const, label: "Talleres de Confección", icon: <Users size={14} /> },
              { id: "offline" as const, label: "Seguridad y Auditoría", icon: <ShieldCheck size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFeatureTab(tab.id)}
                className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeFeatureTab === tab.id
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/15 font-black scale-105"
                    : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Feature Container */}
          <div className="glass-card border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/20 relative overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 shimmer-line pointer-events-none" />

            {activeFeatureTab === "scoring" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/8 text-emerald-400 text-[11px] font-bold uppercase">
                    <CreditCard size={14} />
                    Algoritmo Progresivo de Confianza
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    Otorga Creditos con Cero Incertidumbre
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Evalua de forma automatica a tus clientes mayoristas segun su historial de compras, puntualidad en abonos y dias de morosidad. Asigna cupos de credito seguros y visualiza su clasificacion en tiempo real.
                  </p>
                  <div className="space-y-2.5 pt-1">
                    {[
                      "Clasificacion por categorias de riesgo: A (Excelente), B, C y D",
                      "Registro instantaneo de abonos con emision de comprobante PDF",
                      "Bloqueo preventivo de nuevos pedidos si supera su cupo asignado",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock UI Card */}
                <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        CT
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">Comercializadora Tungurahua</div>
                        <div className="text-[11px] text-slate-500">RUC: 1803928190001 &bull; Cevallos</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black border border-emerald-500/20 uppercase tracking-wider">
                      Nivel A
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "Score Actual", value: "890 / 1000", color: "text-emerald-400" },
                      { label: "Cupo Asignado", value: "$2,500.00", color: "text-white" },
                      { label: "Saldo Utilizado", value: "$640.00", color: "text-amber-400" },
                    ].map((stat, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{stat.label}</div>
                        <div className={`text-base font-black ${stat.color} font-[family-name:var(--font-geist-mono)]`}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Limite de Credito Utilizado (25.6%)</span>
                      <span className="text-emerald-400 font-bold">$1,860.00 Disponible</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[25.6%] transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === "curvas" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/8 text-teal-400 text-[11px] font-bold uppercase">
                    <Layers size={14} />
                    Modulo Estandar de Curvas
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    Inventario por Series, Docenas y Despiece de Tallas
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Configura lotes comerciales por serie (ej. Caballero 38 al 42) o vende por pares unitarios. El sistema descuenta las tallas exactas de cada modelo y actualiza los totales en tiempo real.
                  </p>
                  <div className="space-y-2.5 pt-1">
                    {[
                      "Selector rapido de +1 par por talla o series de 1/2 docena y docena completa",
                      "Calculo automatico de precios por mayor y por par al instante",
                      "Visualizacion con fotografia en alta resolucion y ficha tecnica",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 size={15} className="text-teal-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Curvas Mock Card */}
                <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-6 space-y-4 shadow-2xl text-left">
                  <div className="flex items-center gap-3.5 border-b border-white/5 pb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-900/30 to-orange-900/20 border border-amber-800/30 flex items-center justify-center text-2xl">
                      👞
                    </div>
                    <div>
                      <h5 className="font-black text-sm uppercase text-white">Botin Casual Cuero Nobuck</h5>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Color: Miel Encerado</span>
                        <span className="text-emerald-400 font-semibold">Serie: Curva Comercial (38-42)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { t: "T38", q: 2 },
                      { t: "T39", q: 4 },
                      { t: "T40", q: 4 },
                      { t: "T41", q: 2 },
                    ].map((talla) => (
                      <div key={talla.t} className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center flex-1 min-w-[60px]">
                        <div className="text-[10px] text-slate-500 font-bold">{talla.t}</div>
                        <div className="text-xs text-emerald-400 font-black">{talla.q} pares</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between text-xs">
                    <span className="text-slate-400">12 pares (1 Docena) &bull; $28.00 c/par</span>
                    <span className="text-emerald-400 font-black text-lg font-[family-name:var(--font-geist-mono)]">$336.00</span>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === "talleres" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/8 text-blue-400 text-[11px] font-bold uppercase">
                    <Users size={14} />
                    Red de Fabricantes y Proveedores
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    Trazabilidad de Talleres de Aparado y Armado
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Lleva el control de que taller artesanal de Cevallos confecciono cada variante. Conoce costos de mano de obra, fecha de entrega y margenes netos de rentabilidad.
                  </p>
                  <div className="space-y-2.5 pt-1">
                    {[
                      "Registro de costos diferenciados por taller artesano",
                      "Control de entregas por lote y devoluciones por garantia",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-6 space-y-3 shadow-2xl text-left">
                  {[
                    { name: "Taller Los Laureles (Aparado)", detail: "Cevallos - Maestro: Manuel Sanchez", cost: "$12.50 / par", color: "border-l-emerald-500" },
                    { name: "Taller San Pedro (Armado y Suela)", detail: "Cevallos - Maestro: Carlos Villegas", cost: "$15.00 / par", color: "border-l-blue-500" },
                    { name: "Taller Artesanias Cevallos (Corte)", detail: "Cevallos - Maestro: Luis Paredes", cost: "$8.50 / par", color: "border-l-amber-500" },
                  ].map((taller, i) => (
                    <div key={i} className={`p-4 rounded-xl bg-white/[0.03] border border-white/5 border-l-2 ${taller.color} flex items-center justify-between hover:bg-white/[0.05] transition-colors`}>
                      <div>
                        <div className="text-xs font-bold text-white">{taller.name}</div>
                        <div className="text-[11px] text-slate-500">{taller.detail}</div>
                      </div>
                      <span className="text-xs font-[family-name:var(--font-geist-mono)] font-bold text-emerald-400">{taller.cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeFeatureTab === "offline" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/8 text-purple-400 text-[11px] font-bold uppercase">
                    <ShieldCheck size={14} />
                    Seguridad Blindada de Datos
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    Auditoria Completa, Control de IP y Sesion Unica OTP
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Evita que empleados compartan credenciales indebidamente. Cada accion (ventas, cobros, abonos e inicios de sesion) queda auditada con fecha, hora, direccion IP y navegador.
                  </p>
                  <div className="space-y-2.5 pt-1">
                    {[
                      "Bitacora de auditoria con registro de inicios de sesion y operaciones",
                      "Transferencia de sesion segura mediante codigo OTP de 4 digitos",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 size={15} className="text-purple-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0a0f1c] border border-white/5 rounded-2xl p-5 space-y-2 shadow-2xl text-left font-[family-name:var(--font-geist-mono)] text-xs">
                  {[
                    { icon: "🔐", type: "LOGIN", color: "text-indigo-400", detail: "admin@calzadoconal.com", extra: "190.152.14.88" },
                    { icon: "💵", type: "COBRO", color: "text-emerald-400", detail: "Abono $150.00 (Efectivo)", extra: "✓ Exitoso" },
                    { icon: "🛍️", type: "VENTA", color: "text-violet-400", detail: "12 pares Mocasin Oxford", extra: "Nota #1042" },
                    { icon: "🔓", type: "LOGOUT", color: "text-amber-400", detail: "vendedor02@local.com", extra: "Sesion cerrada" },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                      <span className={`${log.color} font-bold`}>{log.icon} {log.type}</span>
                      <span className="text-slate-400 hidden sm:inline">{log.detail}</span>
                      <span className={`${log.color} font-semibold text-[11px]`}>{log.extra}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          CALCULADORA ROI
      ════════════════════════════════════════════════════════ */}
      <section id="roi" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div ref={roiReveal.ref} className={`reveal-hidden ${roiReveal.isVisible ? "reveal-visible" : ""}`}>
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-4">
              <Calculator size={14} />
              Calculadora de Beneficio Economico
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
              ¿Cuanto dinero y tiempo{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">ahorrara tu local?</span>
            </h3>
            <p className="text-slate-400 text-sm sm:text-base">
              Ajusta los controles segun las ventas de tu negocio para calcular el impacto financiero estimado.
            </p>
          </div>

          <div className="glass-card border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Controls */}
              <div className="lg:col-span-7 space-y-7 text-left">
                {[
                  {
                    label: "Numero de Sucursales / Locales Comerciales",
                    value: `${localesCount} ${localesCount === 1 ? "Local" : "Locales"}`,
                    min: 1, max: 6, step: 1, current: localesCount,
                    onChange: (v: number) => setLocalesCount(v),
                  },
                  {
                    label: "Pares de calzado comercializados al mes (por local)",
                    value: `${paresPromedioMes} pares / mes`,
                    min: 100, max: 1500, step: 50, current: paresPromedioMes,
                    onChange: (v: number) => setParesPromedioMes(v),
                  },
                  {
                    label: "Porcentaje aproximado de ventas a credito",
                    value: `${porcentajeCredito}% de tus ventas`,
                    min: 10, max: 90, step: 5, current: porcentajeCredito,
                    onChange: (v: number) => setPorcentajeCredito(v),
                  },
                ].map((slider, i) => (
                  <div key={i} className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                      <span>{`${i + 1}. ${slider.label}:`}</span>
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-black font-[family-name:var(--font-geist-mono)] text-sm">
                        {slider.value}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      step={slider.step}
                      value={slider.current}
                      onChange={(e) => slider.onChange(Number(e.target.value))}
                      className="w-full accent-emerald-400 h-2 bg-white/5 rounded-lg cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* Results card */}
              <div className="lg:col-span-5 bg-[#0a0f1c] border border-emerald-500/20 rounded-2xl p-7 text-left space-y-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
                
                <div className="flex items-center justify-between border-b border-white/5 pb-3 relative z-10">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Impacto Mensual Estimado</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-black">
                    +{roiCalculado.roiPorcentaje}% ROI
                  </span>
                </div>

                <div className="space-y-4 relative z-10">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Reduccion de Cartera Vencida</span>
                    <span className="text-2xl font-black text-emerald-400 font-[family-name:var(--font-geist-mono)]">
                      +${roiCalculado.perdidasMorosidadEvitadas.toLocaleString()} / mes
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Tiempo Ahorrado en Cuadres y Cobranzas</span>
                    <span className="text-lg font-black text-teal-300 font-[family-name:var(--font-geist-mono)]">
                      ~{roiCalculado.horasAhorradasMes} horas al mes
                    </span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <span className="text-xs text-slate-300 font-bold block">Ahorro y Recuperacion Total Estimada</span>
                    <span className="text-3xl font-black font-[family-name:var(--font-geist-mono)] bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                      ${roiCalculado.ahorroTotalMensual.toLocaleString()} / mes
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenDemoForPlan("Plan Comercial Pro")}
                  className="w-full py-3.5 text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-xl transition-all shadow-md cursor-pointer text-center relative z-10"
                >
                  Comenzar a Ahorrar con Prueba Gratis
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          PLANES Y PRECIOS
      ════════════════════════════════════════════════════════ */}
      <section id="precios" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div ref={pricingReveal.ref} className={`reveal-hidden ${pricingReveal.isVisible ? "reveal-visible" : ""}`}>
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-4">
              <Zap size={14} />
              Planes Transparentes
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
              Elige el plan ideal para tu negocio
            </h3>
            <p className="text-slate-400 text-sm sm:text-base">
              Sin costos ocultos, sin comisiones por par vendido. Todos los planes incluyen 15 dias de prueba 100% gratuita.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-white/5 border border-white/5 shadow-lg">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Pago Mensual
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  billingCycle === "yearly"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Pago Anual</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 text-[10px] font-black uppercase">
                  Ahorra 20%
                </span>
              </button>
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {plans.map((plan, planIndex) => {
              const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-8 bg-gradient-to-b ${plan.accent} border flex flex-col justify-between backdrop-blur-xl transition-all duration-500 hover:translate-y-[-6px] hover:shadow-2xl group reveal-delay-${planIndex + 1}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-400/25 whitespace-nowrap">
                      ⭐ {plan.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`${plan.iconColor}`}>{plan.icon}</div>
                      <h4 className="text-xl font-black text-white">{plan.name}</h4>
                    </div>
                    {!plan.popular && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white/5 text-slate-400 mb-3">
                        {plan.badge}
                      </span>
                    )}
                    <p className="text-xs text-slate-400 leading-relaxed mb-6 min-h-[36px]">{plan.tagline}</p>

                    <div className="flex items-baseline gap-1.5 mb-6">
                      <span className="text-4xl sm:text-5xl font-black text-white font-[family-name:var(--font-geist-mono)]">
                        ${price.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">/ mes</span>
                    </div>

                    <div className="space-y-3 mb-8 text-left border-t border-white/5 pt-6">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        Incluye:
                      </div>
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}

                      {plan.notIncluded.length > 0 && (
                        <div className="pt-3 space-y-2 border-t border-white/5 opacity-40">
                          {plan.notIncluded.map((notFeat, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-500 line-through">
                              <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                              <span>{notFeat}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-4">
                    <button
                      onClick={() => handleOpenDemoForPlan(plan.name)}
                      className={`w-full py-4 rounded-2xl text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer ${plan.buttonStyle} hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      {plan.cta}
                    </button>
                    <div className="text-center text-[10px] text-slate-500">
                      Prueba completa de 15 dias &bull; Activacion instantanea
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          TESTIMONIOS
      ════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div ref={testimonialsReveal.ref} className={`reveal-hidden ${testimonialsReveal.isVisible ? "reveal-visible" : ""}`}>
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/8 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-4">
              <Award size={14} />
              Respaldado por Productores Reales
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Comerciantes que confian en NEXORA
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              {
                quote: "El scoring de credito nos cambio la vida. Antes anotabamos los creditos en cuadernos y perdiamos dinero en comerciantes que no cumplian. Ahora sabemos con exactitud a quien podemos fiar por docenas.",
                name: "Calzado Rossi",
                role: "Distribuidora y Local Comercial - Cevallos",
                initials: "CR",
                color: "from-emerald-500/20 to-teal-500/20",
                textColor: "text-emerald-400",
              },
              {
                quote: "Poder manejar el despiece de tallas y las series por docenas nos ahorra mas de 2 horas diarias al momento de despachar los pedidos que nos llegan directo por WhatsApp.",
                name: "Calzados D'Pao",
                role: "Fabrica y Venta Mayorista - Cevallos",
                initials: "DP",
                color: "from-teal-500/20 to-cyan-500/20",
                textColor: "text-teal-400",
              },
              {
                quote: "La trazabilidad de los talleres de aparado y armado nos permite saber cuanto nos cuesta cada modelo y cuanto margen estamos ganando por cada par de cuero terminado.",
                name: "Comercializadora Cevallos",
                role: "Cadena de Locales - Tungurahua",
                initials: "CC",
                color: "from-purple-500/20 to-violet-500/20",
                textColor: "text-purple-400",
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className={`group p-7 rounded-3xl glass-card border border-white/5 hover:border-white/10 transition-all duration-300 hover:translate-y-[-4px] reveal-delay-${i + 1}`}
              >
                <div className="flex items-center gap-1 text-amber-400 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-[13px] text-slate-300 leading-relaxed mb-7 italic">
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className="flex items-center gap-3 border-t border-white/5 pt-5">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${testimonial.color} ${testimonial.textColor} flex items-center justify-center font-bold text-sm`}>
                    {testimonial.initials}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{testimonial.name}</div>
                    <div className="text-[10px] text-slate-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FAQ
      ════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative z-10">
        <div ref={faqReveal.ref} className={`reveal-hidden ${faqReveal.isVisible ? "reveal-visible" : ""}`}>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/8 border border-blue-500/20 text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-4">
              <HelpCircle size={14} />
              Centro de Ayuda
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Preguntas Frecuentes
            </h3>
          </div>

          <div className="space-y-3 text-left">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl glass-card border border-white/5 overflow-hidden transition-all hover:border-white/10"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-300 shrink-0 ${
                      faqOpen === index ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>
                {faqOpen === index && (
                  <div className="px-6 pb-6 text-[13px] text-slate-400 leading-relaxed border-t border-white/5 pt-4 animate-slide-up">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FINAL CTA BANNER
      ════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div ref={ctaReveal.ref} className={`reveal-hidden ${ctaReveal.isVisible ? "reveal-visible" : ""}`}>
          <div className="rounded-3xl p-10 sm:p-16 bg-gradient-to-br from-emerald-950/80 via-[#0a0f1c] to-teal-950/60 border border-emerald-500/25 text-center relative overflow-hidden shadow-2xl">
            {/* Ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <Sparkles size={14} />
                Unete a la Nueva Era del Calzado
              </div>

              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Moderniza tu comercio de calzado hoy mismo
              </h3>

              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                Solicita tu demostracion gratuita de 15 dias y descubre como controlar tus curvas, creditos y ventas desde un solo panel en la nube.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => handleOpenDemoForPlan("Plan Comercial Pro")}
                  className="w-full sm:w-auto px-8 py-4 text-sm uppercase tracking-wider font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-2xl shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Solicitar Demostracion Gratis (15 Dias)
                </button>

                <a
                  href="https://wa.me/593991234567?text=Hola%20NEXORA%2C%20quiero%20conocer%20m%C3%A1s%20sobre%20el%20sistema%20para%20calzado"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-4 text-sm font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} className="text-emerald-400" />
                  <span>WhatsApp Directo</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FOOTER PROFESIONAL
      ════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.03] relative z-10 bg-[#050810]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 p-[2px] flex items-center justify-center">
                  <div className="w-full h-full bg-[#050810] rounded-[10px] flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <span className="text-lg font-black text-white tracking-tight">NEXORA</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Plataforma SaaS especializada en el control operativo del ciclo de comercializacion de calzado de cuero para talleres y locales del canton Cevallos.
              </p>
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin size={13} />
                <span className="text-[11px]">Cevallos, Tungurahua - Ecuador</span>
              </div>
            </div>

            {/* Links Column */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-widest mb-5">Plataforma</h5>
              <div className="space-y-3">
                {["Scoring Crediticio", "Control de Inventario", "Pedidos por Mayor", "Catalogo Digital", "Auditoria de Accesos"].map((link) => (
                  <a key={link} href="#solucion" className="block text-xs text-slate-500 hover:text-emerald-400 transition-colors">{link}</a>
                ))}
              </div>
            </div>

            {/* Plans Column */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-widest mb-5">Planes</h5>
              <div className="space-y-3">
                {["Plan Taller / Basico", "Plan Comercial Pro", "Plan Empresarial", "Prueba Gratuita 15 Dias"].map((link) => (
                  <a key={link} href="#precios" className="block text-xs text-slate-500 hover:text-emerald-400 transition-colors">{link}</a>
                ))}
              </div>
            </div>

            {/* Contact Column */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-widest mb-5">Contacto</h5>
              <div className="space-y-3">
                <a
                  href="https://wa.me/593991234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp: +593 99 123 4567</span>
                </a>
                <a href="mailto:info@nexora.ec" className="flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-400 transition-colors">
                  <Mail size={13} />
                  <span>info@nexora.ec</span>
                </a>
                <a href="tel:+593991234567" className="flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-400 transition-colors">
                  <Phone size={13} />
                  <span>+593 99 123 4567</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/[0.03] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-600">
            <span>© {new Date().getFullYear()} NEXORA. Todos los derechos reservados.</span>
            <span>Plataforma para la Industria del Calzado de Cuero &bull; Cevallos, Ecuador</span>
          </div>
        </div>
      </footer>

      {/* ════════════════════════════════════════════════════════
          FLOATING WHATSAPP BUTTON
      ════════════════════════════════════════════════════════ */}
      <a
        href="https://wa.me/593991234567?text=Hola%20NEXORA%2C%20deseo%20activar%20mi%20prueba%20gratuita%20de%2015%20d%C3%ADas%20para%20mi%20negocio%20de%20calzado"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 group cursor-pointer"
        aria-label="Contacto por WhatsApp"
      >
        <div className="relative">
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
          <div className="relative p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-full shadow-2xl shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all">
            <MessageCircle size={24} className="fill-white" />
          </div>
        </div>
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-3 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
          ¿Necesitas ayuda? Escribenos
          <div className="absolute top-full right-6 w-2 h-2 bg-slate-900 border-r border-b border-white/10 rotate-45 -mt-1" />
        </div>
      </a>

      {/* ════════════════════════════════════════════════════════
          SCROLL TO TOP BUTTON
      ════════════════════════════════════════════════════════ */}
      {scrollY > 600 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 left-6 z-50 p-3 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-lg backdrop-blur-xl cursor-pointer hover:scale-110 active:scale-95"
          aria-label="Volver arriba"
        >
          <ChevronUp size={18} />
        </button>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL DE SOLICITUD DE DEMO / PLAN
      ════════════════════════════════════════════════════════ */}
      {showDemoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) setShowDemoModal(false); }}>
          <div className="w-full max-w-md bg-[#0d1220] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-left animate-scale-in">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-3">
              <Sparkles size={11} />
              Prueba de 15 Dias Sin Costo
            </div>

            <h3 className="text-xl font-black text-white">
              Solicitar Demostracion
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Plan seleccionado: <strong className="text-emerald-400">{demoForm.planInteres}</strong>
            </p>

            {demoSubmitted ? (
              <div className="p-8 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 text-center text-emerald-400 font-bold text-sm space-y-3">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 animate-bounce" />
                <div className="text-base">Solicitud recibida con exito</div>
                <div className="text-xs text-slate-400 font-normal">Conectando con un asesor por WhatsApp...</div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                {[
                  { label: "Nombre y Apellido", key: "nombre", placeholder: "Ej. Christopher Paucar", type: "text" },
                  { label: "Nombre del Local / Fabrica", key: "negocio", placeholder: "Ej. Calzado Rossi Cevallos", type: "text" },
                  { label: "Telefono Celular / WhatsApp", key: "telefono", placeholder: "Ej. 0991234567", type: "tel" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      required
                      value={demoForm[field.key as keyof typeof demoForm]}
                      onChange={(e) => setDemoForm({ ...demoForm, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Ciudad / Canton</label>
                    <input
                      type="text"
                      required
                      value={demoForm.ciudad}
                      onChange={(e) => setDemoForm({ ...demoForm, ciudad: e.target.value })}
                      placeholder="Cevallos"
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Plan Deseado</label>
                    <select
                      value={demoForm.planInteres}
                      onChange={(e) => setDemoForm({ ...demoForm, planInteres: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                    >
                      <option value="Plan Taller / Básico">Plan Taller ($29.99)</option>
                      <option value="Plan Comercial Pro">Plan Pro ($49.99)</option>
                      <option value="Plan Empresarial">Empresarial ($89.99)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-2 text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-xl shadow-lg shadow-emerald-500/15 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  Enviar y Comenzar 15 Dias Gratis
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
