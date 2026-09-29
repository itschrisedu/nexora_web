"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  ArrowUpRight,
  Globe,
  Package,
  Truck,
  Headphones,
  Monitor,
  Mail,
  Phone,
  Receipt,
  Sparkles
} from "lucide-react";
import {
  getStoredPlanPrices,
  calculateYearlyEquivalent,
  SaasPlanPrices,
  DEFAULT_SAAS_PLAN_PRICES,
} from "@/utils/saas-plans";

export default function SaasLandingPage() {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [localesCount, setLocalesCount] = useState(2);
  const [paresPromedioMes, setParesPromedioMes] = useState(350);
  const [porcentajeCredito, setPorcentajeCredito] = useState(40);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [selectedPlanForDemo, setSelectedPlanForDemo] = useState("Plan Profesional");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [planPrices, setPlanPrices] = useState<SaasPlanPrices>(DEFAULT_SAAS_PLAN_PRICES);

  useEffect(() => {
    setPlanPrices(getStoredPlanPrices());

    const handlePlansChanged = (e: any) => {
      if (e?.detail) {
        setPlanPrices(e.detail);
      } else {
        setPlanPrices(getStoredPlanPrices());
      }
    };

    window.addEventListener("nexora:saas-plans-changed", handlePlansChanged);
    window.addEventListener("storage", handlePlansChanged);

    return () => {
      window.removeEventListener("nexora:saas-plans-changed", handlePlansChanged);
      window.removeEventListener("storage", handlePlansChanged);
    };
  }, []);

  // Formulario Demo / Contacto
  const [demoForm, setDemoForm] = useState({
    nombre: "",
    negocio: "",
    ciudad: "Cevallos / Ambato",
    telefono: "",
    paresMensuales: "200 - 500 pares",
    planInteres: "Plan Profesional",
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // Teléfono WhatsApp oficial
  const WHATSAPP_NUMERO = "593991234567";

  // Cálculo ROI Dinámico
  const roiData = useMemo(() => {
    const precioPromedioPar = 24;
    const ventasMensualesEst = paresPromedioMes * precioPromedioPar;
    const ventasCredito = ventasMensualesEst * (porcentajeCredito / 100);
    const perdidasMorosidadEvitadas = ventasCredito * 0.08;
    const horasAhorradasMes = localesCount * 24;
    const valorTiempoAhorrado = horasAhorradasMes * 7.5;
    const ahorroTotalMensual = perdidasMorosidadEvitadas + valorTiempoAhorrado;
    const costoPlanMensual = planPrices.comercial || 29.0;
    const roiPorcentaje = Math.round(((ahorroTotalMensual - costoPlanMensual) / costoPlanMensual) * 100);

    return {
      ventasMensualesEst,
      perdidasMorosidadEvitadas: Math.round(perdidasMorosidadEvitadas),
      horasAhorradasMes,
      ahorroTotalMensual: Math.round(ahorroTotalMensual),
      roiPorcentaje: Math.max(120, roiPorcentaje),
    };
  }, [localesCount, paresPromedioMes, porcentajeCredito, planPrices.comercial]);

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
        `¡Hola! Me interesa solicitar una demostración y contratar el *${demoForm.planInteres}* para mi negocio.\n\n` +
          `👤 *Nombre:* ${demoForm.nombre}\n` +
          `🏢 *Establecimiento:* ${demoForm.negocio}\n` +
          `📍 *Ciudad:* ${demoForm.ciudad}\n` +
          `📞 *Teléfono:* ${demoForm.telefono}\n` +
          `📦 *Volumen mensual:* ${demoForm.paresMensuales}\n\n` +
          `Por favor contáctenme para coordinar la activación y prueba de la plataforma.`
      );
      window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${text}`, "_blank");
    }, 1000);
  };

  const plans = [
    {
      id: "PLAN_BASICO",
      name: "Plan Básico",
      tagline: "Ideal para talleres artesanales y locales individuales que inician su organización digital.",
      priceMonthly: planPrices.basico,
      priceYearly: calculateYearlyEquivalent(planPrices.basico),
      popular: false,
      badge: "Esencial",
      icon: <Store className="w-5 h-5 text-slate-700" />,
      features: [
        "1 Sucursal / Local comercial",
        "2 Cuentas de usuario (Administrador y Vendedor)",
        "Control de inventario por curvas de tallas (T34 a T44)",
        "Registro de ventas directas y notas de entrega internas",
        "Gestión de proveedores y compras de materiales",
        "Catálogo web público con recepción de pedidos por WhatsApp",
        "Validación de seguridad humana en pedidos web",
        "Soporte técnico estándar en días laborables",
      ],
      notIncluded: [
        "Scoring crediticio progresivo",
        "Control de cartera vencida y acuerdos de pago",
        "Gestión multi-sucursal con traspasos internos",
        "Auditoría con trazabilidad de inicios de sesión",
      ],
    },
    {
      id: "PLAN_PRO",
      name: "Plan Profesional",
      tagline: "El paquete recomendado para negocios en expansión, distribuidores y locales con venta a crédito.",
      priceMonthly: planPrices.comercial,
      priceYearly: calculateYearlyEquivalent(planPrices.comercial),
      popular: true,
      badge: "Más Solicitado",
      icon: <Award className="w-5 h-5 text-emerald-600" />,
      features: [
        "Hasta 3 Sucursales comerciales conectadas",
        "Hasta 8 Cuentas de usuario con roles configurables",
        "Módulo de Scoring Crediticio Progresivo (Nivel 1 al 4)",
        "Control de límites de crédito y plazos máximos por cliente",
        "Alertas automáticas de cobro y recordatorios de pago",
        "Catálogo web digital sincronizado con stock en tiempo real",
        "Traspasos de mercadería entre sucursales y bodegas",
        "Análisis de rotación de modelos y demanda por temporadas",
        "Capacitación inicial y soporte prioritario vía WhatsApp",
      ],
      notIncluded: [
        "Sucursales y usuarios ilimitados",
        "Auditoría forense especializada con geolocalización",
      ],
    },
    {
      id: "PLAN_ENTERPRISE",
      name: "Plan Corporativo",
      tagline: "Solución integral para cadenas de tiendas, fábricas de calzado y mayoristas de gran volumen.",
      priceMonthly: planPrices.mayorista,
      priceYearly: calculateYearlyEquivalent(planPrices.mayorista),
      popular: false,
      badge: "Escalabilidad Total",
      icon: <Building2 className="w-5 h-5 text-slate-900" />,
      features: [
        "Sucursales y puntos de venta ilimitados",
        "Usuarios y perfiles de acceso ilimitados",
        "Módulo completo de scoring crediticio y cobranza avanzada",
        "Auditoría completa con registro de accesos y trazabilidad",
        "Control de producción por series, lotes y docenas",
        "Consolidación comercial global y reportes ejecutivos",
        "Personalización visual y subdominio propio para el catálogo",
        "Respaldo automático diario en la nube con redundancia",
        "Asesor técnico dedicado 24/7 y puesta en marcha presencial",
      ],
      notIncluded: [],
    },
  ];

  const modules = [
    {
      title: "Control de Curvas de Tallas & Series",
      desc: "Gestión de calzado por numeración (T34 a T45), colores, materiales y modalidades de venta por par unitario, media docena o series completas.",
      icon: <Layers className="w-6 h-6 text-emerald-600" />,
      tag: "Inventario Especializado",
    },
    {
      title: "Scoring Crediticio Progresivo",
      desc: "Evaluación objetiva del historial de pago de tus clientes. Asigna límites de crédito escalonados y plazos seguros para proteger tu capital de trabajo.",
      icon: <TrendingUp className="w-6 h-6 text-emerald-600" />,
      tag: "Gestión de Riesgo",
    },
    {
      title: "Catálogo Web & Pedidos WhatsApp",
      desc: "Portal público elegante para exhibir tus modelos de calzado. Tus clientes seleccionan tallas, generan su pedido y reciben su comprobante formal en PDF.",
      icon: <Globe className="w-6 h-6 text-emerald-600" />,
      tag: "Ventas Digitales",
    },
    {
      title: "Punto de Venta & Comprobantes Internos",
      desc: "Registro ágil de ventas en mostrador, emisión de notas de entrega, control de pagos en efectivo o transferencias y arqueo de caja diario por turno.",
      icon: <Receipt className="w-6 h-6 text-emerald-600" />,
      tag: "Operación Diaria",
    },
    {
      title: "Multi-Sucursal & Traspasos de Stock",
      desc: "Conecta tu taller o bodega matriz con tus locales de exhibición. Realiza transferencias de mercadería con confirmación de recepción obligatoria.",
      icon: <Truck className="w-6 h-6 text-emerald-600" />,
      tag: "Logística Comercial",
    },
    {
      title: "Auditoría & Trazabilidad Operativa",
      desc: "Registro cronológico de cada transacción, ajuste de inventario e inicio de sesión. Controla con precisión qué usuario realizó cada acción en el sistema.",
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      tag: "Seguridad y Control",
    },
  ];

  const faqs = [
    {
      q: "¿Cómo funciona la prueba gratuita de 15 días?",
      a: "Puedes solicitar la activación de la plataforma sin compromiso previo. Configuramos tu establecimiento, cargamos tus primeras series de calzado y te guiamos en el uso diario para que compruebes los resultados en tu propio negocio.",
    },
    {
      q: "¿El sistema se adapta a la forma en que vendemos calzado (pares y docenas)?",
      a: "Sí, el sistema está concebido específicamente para el comercio de calzado. Permite registrar ventas por par individual seleccionando la talla exacta, así como despachar medias docenas o docenas completas con desglose automático de la curva de numeración.",
    },
    {
      q: "¿Qué es el Scoring Crediticio y cómo ayuda a mi negocio?",
      a: "Es un módulo que califica a tus clientes según su puntualidad de pago. Cuando un cliente nuevo inicia, el sistema le asigna un cupo moderado; a medida que cumple sus abonos en las fechas pactadas, su nivel crediticio sube permitiendo mayores ventas con bajo riesgo de morosidad.",
    },
    {
      q: "¿Necesito instalar programas pesados en mis computadoras?",
      a: "No. El sistema es 100% web y accesible desde cualquier navegador en computadoras, laptops, tablets o teléfonos móviles. La información se mantiene respaldada de forma segura en la nube con acceso permanente las 24 horas.",
    },
    {
      q: "¿Mis clientes pueden ver el catálogo sin tener que registrarse?",
      a: "Sí. Tu catálogo digital web es público y de libre acceso. Cualquier persona puede ingresar desde su celular, explorar los modelos disponibles, consultar las sucursales y generar pedidos formales que te llegarán directamente a tu WhatsApp.",
    },
    {
      q: "¿Qué incluye el soporte y la capacitación inicial?",
      a: "Todos nuestros planes incluyen acompañamiento en la configuración inicial, carga de datos y capacitación práctica para administradores y vendedores, además de soporte técnico continuo vía WhatsApp y teléfono.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/40 text-slate-800 antialiased selection:bg-slate-900 selection:text-white">
      {/* ══════════════════════════════════════════════
          1. HEADER / NAVBAR RESPONSIVE (ANCHO FLUIDO)
         ══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="h-1.5 w-full bg-slate-900" />
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16 h-18 flex items-center justify-between">
          {/* Logo & Marca */}
          <Link href="/saas" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="NEXORA"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-contain bg-white border border-slate-200 p-1 shadow-xs group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col justify-center">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight">
                NEXORA
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-fit mt-0.5">
                Plataforma Comercial de Calzado
              </span>
            </div>
          </Link>

          {/* Menú Desktop */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-600">
            <a href="#modulos" className="hover:text-slate-900 transition-colors">
              Módulos del Sistema
            </a>
            <a href="#scoring" className="hover:text-slate-900 transition-colors">
              Scoring Crediticio
            </a>
            <a href="#catalogo-digital" className="hover:text-slate-900 transition-colors">
              Catálogo Web
            </a>
            <a href="#calculadora" className="hover:text-slate-900 transition-colors">
              Calculadora de Ahorro
            </a>
            <a href="#planes" className="hover:text-slate-900 transition-colors">
              Planes & Precios
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              Preguntas Frecuentes
            </a>
          </nav>

          {/* Botones de Acción */}
          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent("¡Hola! Deseo más información sobre la plataforma NEXORA para mi negocio de calzado.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-xs"
            >
              <MessageCircle size={15} />
              <span>WhatsApp</span>
            </a>

            <button
              onClick={() => handleOpenDemoForPlan("Plan Profesional")}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer"
            >
              <span>Solicitar Demo</span>
              <ArrowRight size={14} />
            </button>

            {/* Toggle Móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X size={20} /> : <Store size={20} />}
            </button>
          </div>
        </div>

        {/* Menú Móvil desplegable */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 text-sm font-semibold shadow-lg animate-in fade-in">
            <a
              href="#modulos"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Módulos del Sistema
            </a>
            <a
              href="#scoring"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Scoring Crediticio
            </a>
            <a
              href="#catalogo-digital"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Catálogo Web
            </a>
            <a
              href="#calculadora"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Calculadora de Ahorro
            </a>
            <a
              href="#planes"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Planes & Precios
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Preguntas Frecuentes
            </a>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenDemoForPlan("Plan Profesional");
                }}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <span>Solicitar Demostración Guiada</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════
          2. HERO SECTION (TEMA CLARO & ANCHO COMPLETO)
         ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Columna Izquierda: Textos y Acciones */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badge de confianza */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Plataforma Especializada en Comercio y Distribución de Calzado</span>
              </div>

              {/* Título Principal */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Control Operativo de Inventario por Curvas, Ventas y Scoring Crediticio
              </h1>

              {/* Párrafo explicativo natural */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                Diseñado para locales comerciales, talleres artesanales y cadenas distribuidoras. Controla existencias por series completas o pares sueltos, sincroniza tu catálogo web para pedidos directos por WhatsApp y administra tus cuentas por cobrar con límites de crédito inteligentes.
              </p>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  onClick={() => handleOpenDemoForPlan("Plan Profesional")}
                  className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Solicitar Demostración Guiada</span>
                  <ArrowRight size={16} />
                </button>

                <a
                  href={`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent("¡Hola! Me gustaría conocer los planes disponibles y solicitar una demostración de la plataforma NEXORA.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} />
                  <span>Consultar por WhatsApp</span>
                </a>
              </div>

              {/* Indicadores de confianza técnica */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
                  <div className="text-lg sm:text-xl font-black text-slate-900">100% Web</div>
                  <div className="text-[11px] font-semibold text-slate-500">Sin instalaciones complejas</div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
                  <div className="text-lg sm:text-xl font-black text-emerald-700">T34 a T45</div>
                  <div className="text-[11px] font-semibold text-slate-500">Curvas y series automáticas</div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
                  <div className="text-lg sm:text-xl font-black text-slate-900">15 Días</div>
                  <div className="text-[11px] font-semibold text-slate-500">Prueba inicial guiada</div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Tarjeta de Demostración Visual */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-md space-y-4 relative">
                {/* Encabezado de la Tarjeta */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
                      NX
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Panel Operativo en Tiempo Real</div>
                      <div className="text-[10px] text-slate-500">Muestra en vivo del control de inventario</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 En Línea
                  </span>
                </div>

                {/* Tarjeta de Modelo de Calzado Estándar */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 overflow-hidden shadow-2xs">
                        <ShoppingBag size={20} className="text-slate-600" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 uppercase">Zapato Casual Oxford Cuero</div>
                        <div className="text-[11px] font-semibold text-slate-600">Color: Café Moro | Suela: Caucho</div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          Serie: Caballero Adulto (6 pares)
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">$24.00 / par</div>
                      <div className="text-[10px] font-bold text-emerald-700">$144.00 / serie</div>
                    </div>
                  </div>

                  {/* Curva de Tallas Visual */}
                  <div className="pt-2 border-t border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Desglose de Curva de Tallas:
                    </div>
                    <div className="grid grid-cols-6 gap-1.5 text-center">
                      <div className="p-1 bg-white border border-slate-200 rounded-lg">
                        <div className="text-[9px] font-bold text-slate-500">T38</div>
                        <div className="text-xs font-black text-slate-900">1</div>
                      </div>
                      <div className="p-1 bg-white border border-slate-200 rounded-lg">
                        <div className="text-[9px] font-bold text-slate-500">T39</div>
                        <div className="text-xs font-black text-slate-900">1</div>
                      </div>
                      <div className="p-1 bg-white border border-slate-200 rounded-lg">
                        <div className="text-[9px] font-bold text-slate-500">T40</div>
                        <div className="text-xs font-black text-slate-900">2</div>
                      </div>
                      <div className="p-1 bg-white border border-slate-200 rounded-lg">
                        <div className="text-[9px] font-bold text-slate-500">T41</div>
                        <div className="text-xs font-black text-slate-900">1</div>
                      </div>
                      <div className="p-1 bg-white border border-slate-200 rounded-lg">
                        <div className="text-[9px] font-bold text-slate-500">T42</div>
                        <div className="text-xs font-black text-slate-900">1</div>
                      </div>
                      <div className="p-1 bg-emerald-50 border border-emerald-300 rounded-lg">
                        <div className="text-[9px] font-bold text-emerald-700">Total</div>
                        <div className="text-xs font-black text-emerald-800">6p</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scoring Crediticio Preview */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Evaluación Crediticia de Cliente Mayorista</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                      Nivel 3 (Excelente)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-500 block text-[10px]">Cupo Aprobado:</span>
                      <span className="font-bold text-slate-900">$850.00</span>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-500 block text-[10px]">Plazo de Pago:</span>
                      <span className="font-bold text-slate-900">30 días plazo</span>
                    </div>
                  </div>
                </div>

                {/* Botón de acción en la tarjeta */}
                <button
                  onClick={() => handleOpenDemoForPlan("Plan Profesional")}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Probar esta vista con tus propios modelos</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. MÓDULOS PRINCIPALES DEL SISTEMA
         ══════════════════════════════════════════════ */}
      <section id="modulos" className="py-16 lg:py-24 bg-slate-50/60 border-b border-slate-200">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16 space-y-12">
          
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Arquitectura Funcional
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Módulos Diseñados para la Dinámica del Calzado
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Cada sección del sistema resuelve un cuello de botella real de los negocios de calzado: desde el control de tallas en bodega hasta la cobranza organizada de clientes recurrentes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((m, idx) => (
              <div
                key={idx}
                className="p-6 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
                    {m.icon}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {m.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{m.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. DETALLE: SCORING CREDITICIO & CARTERA
         ══════════════════════════════════════════════ */}
      <section id="scoring" className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Protección del Capital Comercial
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                Vende a Crédito con Seguridad y Cero Sorpresas de Morosidad
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                En el sector calzado, gran parte de las ventas a comerciantes mayoristas y clientes de confianza se realizan con plazos de pago. El sistema clasifica el comportamiento de cada comprador en 4 niveles crediticios progresivos:
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Nivel Inicial / Nuevo Comprador</div>
                    <div className="text-[11px] text-slate-500">Cupo controlado de hasta $200 a 15 días con seña inicial obligatoria.</div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Nivel Confiable / Cliente Frecuente</div>
                    <div className="text-[11px] text-slate-500">Ampliación automática de cupo a $500 a 30 días tras 3 transacciones liquidadas a tiempo.</div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Nivel Preferencial / Mayorista VIP</div>
                    <div className="text-[11px] text-slate-500">Línea de crédito extendida de hasta $1,200 para pedidos por encargo o lotes de producción.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-600" />
                    <span>Registro de Cobros y Estado de Cuenta</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500">Vista del Administrador</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-900">Almacén Calzado Cevallos</div>
                      <div className="text-[11px] text-slate-500">Pedido #0412 · 12 pares Oxford</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">$288.00</span>
                      <span className="block text-[10px] font-bold text-emerald-700">🟢 Al día (Vence en 12d)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-900">Comercial Los Andes (Ambato)</div>
                      <div className="text-[11px] text-slate-500">Pedido #0398 · 24 pares Casual</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">$576.00</span>
                      <span className="block text-[10px] font-bold text-amber-700">🟡 Abono $300 recibido</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-700" />
                    <span>Notificaciones directas por WhatsApp</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    El sistema genera recordatorios con un solo clic para enviar el estado de cuenta y comprobantes directamente al cliente.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5. DETALLE: CATÁLOGO DIGITAL WEB
         ══════════════════════════════════════════════ */}
      <section id="catalogo-digital" className="py-16 lg:py-24 bg-slate-50/60 border-b border-slate-200">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe size={18} className="text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Enlace Público de tu Catálogo</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    🟢 Activo 24/7
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 break-all select-all">
                  https://tutienda.com/catalogo
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900">Pedidos Directos</div>
                    <div className="text-[11px] text-slate-500">Llegan organizados a tu WhatsApp con modelo, color y tallas.</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900">Comprobante en PDF</div>
                    <div className="text-[11px] text-slate-500">Tu cliente descarga de inmediato su nota de pedido formal.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Canal de Ventas en Línea
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                Tus Clientes Eligen Modelos, Tallas y Compran desde su Celular
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Olvídate de enviar fotos sueltas por chat. Con la plataforma dispones de un catálogo digital oficial donde se exhiben tus modelos con sus variantes de color, series disponibles y fotografías de alta calidad.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Configuración de visibilidad de precios y disponibilidad de stock al público.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Módulo de seguridad con verificador anti-bot para evitar spam en tus pedidos.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Recepción de pedidos tanto por par unitario como por series de media docena o docenas.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          6. CALCULADORA INTERACTIVA DE RETORNO (ROI) - 100% TEMA CLARO
         ══════════════════════════════════════════════ */}
      <section id="calculadora" className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16 space-y-10">
          
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Impacto Económico
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Calcula el Ahorro Mensual en tu Negocio
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Ajusta los controles según el volumen de tu local para estimar el ahorro en horas de control de inventario y la reducción de cartera incobrable.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Controles de la calculadora */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              
              {/* Control 1: Locales */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Número de Locales o Puntos de Venta</span>
                  <span className="font-black text-slate-900 px-2.5 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                    {localesCount} {localesCount === 1 ? "local" : "locales"}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={localesCount}
                  onChange={(e) => setLocalesCount(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

              {/* Control 2: Pares mensuales */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Pares comercializados al mes (Aprox.)</span>
                  <span className="font-black text-slate-900 px-2.5 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                    {paresPromedioMes} pares / mes
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={paresPromedioMes}
                  onChange={(e) => setParesPromedioMes(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

              {/* Control 3: Porcentaje a Crédito */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Porcentaje de ventas otorgadas a crédito</span>
                  <span className="font-black text-slate-900 px-2.5 py-0.5 bg-white rounded-md border border-slate-200 shadow-2xs">
                    {porcentajeCredito}% a crédito
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={porcentajeCredito}
                  onChange={(e) => setPorcentajeCredito(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

            </div>

            {/* Resultados del ROI - Tema Claro Corporativo */}
            <div className="lg:col-span-5 bg-slate-50 border-2 border-emerald-500/80 text-slate-900 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Ahorro Mensual Estimado</div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">
                  ${roiData.ahorroTotalMensual.toLocaleString()} / mes
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Retorno estimado de inversión: <strong className="text-emerald-800 font-bold">+{roiData.roiPorcentaje}%</strong>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-slate-600 font-medium">Pérdidas de morosidad evitadas:</span>
                  <span className="font-bold text-slate-900">${roiData.perdidasMorosidadEvitadas}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-slate-600 font-medium">Horas de conteo y cuadre ahorradas:</span>
                  <span className="font-bold text-slate-900">{roiData.horasAhorradasMes} horas/mes</span>
                </div>
              </div>

              <button
                onClick={() => handleOpenDemoForPlan("Plan Profesional")}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <span>Activar este ahorro en mi negocio</span>
                <ArrowRight size={14} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          7. PLANES & PRECIOS TRANSPARENTES
         ══════════════════════════════════════════════ */}
      <section id="planes" className="py-16 lg:py-24 bg-slate-50/60 border-b border-slate-200">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Inversión Clara y Predecible
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Planes Diseñados para Cada Etapa de tu Negocio
            </h2>
            <p className="text-sm text-slate-600">
              Sin costos ocultos, sin cobros adicionales por pares registrados y con 15 días de prueba inicial sin compromiso.
            </p>

            {/* Toggle Mensual / Anual */}
            <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-xl mt-4 shadow-2xs">
              <button
                type="button"
                onClick={() => setBillingCycle("MONTHLY")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "MONTHLY"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pago Mensual
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("YEARLY")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === "YEARLY"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Pago Anual</span>
                <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 rounded text-[9px] font-black">
                  -20% DCTO
                </span>
              </button>
            </div>
          </div>

          {/* Grid de 3 Planes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {plans.map((p) => {
              const currentPrice = billingCycle === "MONTHLY" ? p.priceMonthly : p.priceYearly;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                    p.popular
                      ? "bg-white border-2 border-emerald-600 shadow-xl"
                      : "bg-white border border-slate-200 shadow-xs hover:shadow-md"
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-xs">
                      Más Elegido por los Comercios
                    </div>
                  )}

                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
                          {p.icon}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900">{p.name}</h3>
                          <span className="text-[10px] font-bold text-slate-500">{p.badge}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{p.tagline}</p>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">
                          ${currentPrice.toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">/ mes</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {billingCycle === "YEARLY"
                          ? "Modalidad de suscripción anual con ahorro del 20%"
                          : "Modalidad de suscripción mensual sin permanencia"}
                      </div>
                    </div>

                    {/* Lista de características */}
                    <div className="space-y-2.5 pt-2">
                      <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                        Incluye:
                      </div>
                      <ul className="space-y-2 text-xs text-slate-600">
                        {p.features.map((f, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span className="leading-tight">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-6">
                    <button
                      onClick={() => handleOpenDemoForPlan(p.name)}
                      className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        p.popular
                          ? "bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-300 shadow-2xs"
                      }`}
                    >
                      <span>Solicitar {p.name}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════
          8. PREGUNTAS FRECUENTES (FAQ)
         ══════════════════════════════════════════════ */}
      <section id="faq" className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16 space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Dudas y Respuestas Claras
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = faqOpen === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-100/70"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-500 transition-transform shrink-0 ${
                        isOpen ? "rotate-180 text-slate-900" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-200 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════
          9. LLAMADO A LA ACCIÓN FINAL - TEMA CLARO ELEGANTE
         ══════════════════════════════════════════════ */}
      <section className="py-16 lg:py-20 bg-slate-50 border-b border-slate-200">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16">
          <div className="p-8 sm:p-12 bg-white border border-slate-200 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-8 shadow-md">
            <div className="space-y-3 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Puesta en Marcha Inmediata
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
                ¿Listo para Organizar tu Inventario y Escalar tus Ventas?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Únete a los locales y talleres que ya controlan su mercadería por series y administran su cartera a crédito con total tranquilidad.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
              <button
                onClick={() => handleOpenDemoForPlan("Plan Profesional")}
                className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Solicitar Prueba de 15 Días</span>
                <ArrowRight size={16} />
              </button>
              <a
                href={`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent("¡Hola! Deseo conversar con un asesor técnico de NEXORA.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                <span>Hablar con un Asesor</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          10. FOOTER INSTITUCIONAL - TEMA CLARO LIMPIO
         ══════════════════════════════════════════════ */}
      <footer className="bg-white text-slate-600 py-12 border-t border-slate-200">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="NEXORA"
                  className="h-8 w-8 rounded-lg object-contain bg-white border border-slate-200 p-1"
                />
                <span className="text-base font-black text-slate-900">NEXORA Platform</span>
              </div>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Solución tecnológica especializada para el control operativo de inventario por curvas de tallas, comercialización y scoring crediticio progresivo en comercios y talleres de calzado.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Enlaces Rápidos</div>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#modulos" className="hover:text-slate-900 transition-colors">Módulos del Sistema</a></li>
                <li><a href="#scoring" className="hover:text-slate-900 transition-colors">Scoring Crediticio</a></li>
                <li><a href="#planes" className="hover:text-slate-900 transition-colors">Planes y Precios</a></li>
                <li><a href="#faq" className="hover:text-slate-900 transition-colors">Preguntas Frecuentes</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Atención y Soporte</div>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <Phone size={13} className="text-emerald-600 shrink-0" />
                  <span>Soporte Técnico Directo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={13} className="text-emerald-600 shrink-0" />
                  <span>contacto@nexora.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={13} className="text-emerald-600 shrink-0" />
                  <span>Lun - Sáb: 08:00 a 18:00</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} NEXORA Platform. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════
          MODAL: SOLICITAR DEMOSTRACIÓN / ACTIVACIÓN
         ══════════════════════════════════════════════ */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Solicitar Demostración Guiada</h3>
                <p className="text-[11px] text-slate-500">Plan seleccionado: <strong className="text-slate-900">{selectedPlanForDemo}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDemoSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={demoForm.nombre}
                  onChange={(e) => setDemoForm({ ...demoForm, nombre: e.target.value })}
                  placeholder="Ej: Carlos Morales"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de tu Negocio / Taller / Local *
                </label>
                <input
                  type="text"
                  required
                  value={demoForm.negocio}
                  onChange={(e) => setDemoForm({ ...demoForm, negocio: e.target.value })}
                  placeholder="Ej: Calzados Morales & Asociados"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número de WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={demoForm.telefono}
                    onChange={(e) => setDemoForm({ ...demoForm, telefono: e.target.value })}
                    placeholder="0998765432"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ciudad / Cantón
                  </label>
                  <input
                    type="text"
                    value={demoForm.ciudad}
                    onChange={(e) => setDemoForm({ ...demoForm, ciudad: e.target.value })}
                    placeholder="Cevallos, Ambato, etc."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800">
                ✅ Al enviar tu solicitud, un asesor se comunicará contigo para configurar tus primeros modelos y activar tu periodo de prueba de 15 días sin costo.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDemoModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={demoSubmitted}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {demoSubmitted ? <span>Enviando...</span> : (
                    <>
                      <span>Confirmar y Enviar por WhatsApp</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
