"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  FileText,
  Lock,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  Sparkles,
  BrainCircuit,
  ShieldAlert,
  Gavel,
  Printer,
  Info,
  Check,
} from "lucide-react";
import { ApiService } from "@/services/api.service";

interface TermsModalProps {
  isOpen: boolean;
  userNombre: string;
  userEmail: string;
  userRol: string;
  onAccepted: () => void;
}

type TabSeccionLegal = "terminos" | "privacidad" | "ia_scoring" | "laboral" | "penal_jurisdiccion";

export default function TermsModal({
  isOpen,
  userNombre,
  userEmail,
  userRol,
  onAccepted,
}: TermsModalProps) {
  const [acceptedCheckbox, setAcceptedCheckbox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<TabSeccionLegal>("terminos");

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!acceptedCheckbox) return;
    setLoading(true);
    setError("");

    try {
      await ApiService.post("/auth/accept-terms", {
        version: "2.0",
        fechaAceptacion: new Date().toISOString(),
        dispositivo: typeof navigator !== "undefined" ? navigator.userAgent : "Web Browser",
      });
      onAccepted();
    } catch (err: any) {
      setError(err.message || "Error al registrar la aceptación legal. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[var(--card)] border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* ─── CABECERA DEL MODAL ─── */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shrink-0">
              <Scale size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  MARCO LEGAL V2.0 — ECUADOR
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Cumplimiento LOPDP · COESCCI · COIP · C. Trabajo
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Términos de Servicio, Tratamiento de Datos Personales y Uso de IA
              </h2>
            </div>
          </div>
          
          <div className="text-right hidden sm:block shrink-0">
            <span className="text-xs font-bold text-slate-200 block">{userNombre}</span>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">{userRol}</span>
          </div>
        </div>

        {/* ─── SELECTOR DE PESTAÑAS LEGALES ─── */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-[var(--muted)]/40 border-b border-[var(--border)] shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSection("terminos")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === "terminos"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/60"
            }`}
          >
            <FileText size={14} />
            <span>1. Términos & Licencia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("privacidad")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === "privacidad"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/60"
            }`}
          >
            <Lock size={14} />
            <span>2. Datos Personales (LOPDP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("ia_scoring")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === "ia_scoring"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/60"
            }`}
          >
            <BrainCircuit size={14} />
            <span>3. Inteligencia Artificial & Scoring</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("laboral")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === "laboral"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/60"
            }`}
          >
            <ShieldCheck size={14} />
            <span>4. Régimen Laboral & Sigilo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("penal_jurisdiccion")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === "penal_jurisdiccion"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/60"
            }`}
          >
            <Gavel size={14} />
            <span>5. Delitos Informáticos & Fuero</span>
          </button>
        </div>

        {/* ─── CUERPO DEL DOCUMENTO LEGAL (SCROLLABLE) ─── */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[var(--foreground)] leading-relaxed divide-y divide-[var(--border)] max-h-[48vh]">
          
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN 1: TÉRMINOS GENERALES Y LICENCIA DE USO                 */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeSection === "terminos" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-800 dark:text-emerald-300 font-medium">
                El presente instrumento regula el acceso, registro de operaciones, administración de inventarios, comercialización de calzado de cuero y custodia de información dentro del ecosistema digital NEXORA, en estricto cumplimiento del marco legal vigente en la República del Ecuador.
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-black">1</span>
                  Objeto del Sistema y Naturaleza del Servicio
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  NEXORA es una plataforma de software como servicio (SaaS) especializada en el control operativo del ciclo comercial de calzado de cuero, administración multi-sucursal, control de stock por curvas de tallas, punto de venta (POS), gestión de garantías/devoluciones, cartera crediticia y análisis de inteligencia empresarial en el cantón Cevallos y el territorio nacional.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-black">2</span>
                  Propiedad Intelectual y Derechos de Autor (COESCCI)
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  De conformidad con el Código Orgánico de la Economía Social de los Conocimientos, Creatividad e Innovación (COESCCI) del Ecuador, la arquitectura de software, bases de datos, algoritmos, interfaz gráfica, flujos analíticos y código fuente de NEXORA constituyen propiedad intelectual protegida de su autor y desarrollador Christopher Eduardo Paucar Manzano. El establecimiento comercial y sus usuarios adquieren una licencia de uso no exclusiva, intransferible y revocable, quedando expresamente prohibida la ingeniería inversa, descompilación, reproducción o copia no autorizada.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-black">3</span>
                  Validez Jurídica de Mensajes de Datos y Trazabilidad Digital
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  Al amparo de la Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos del Ecuador, todos los registros de transacciones, notas de entrega internas, abonos de cartera, movimientos de inventario y autorizaciones mediante códigos OTP emitidos y almacenados en la plataforma tienen plena validez jurídica, eficacia vinculante y fuerza probatoria entre las partes involucradas.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-black">4</span>
                  Uso Autorizado de Credenciales y Sesión Única Segura
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  Las credenciales de acceso son personales, secretas e intransferibles. Cada usuario es legalmente responsable de las operaciones, transacciones, registros o modificaciones efectuadas bajo su cuenta. La plataforma implementa validación de sesión única activa; el inicio de sesión concurrente en un segundo dispositivo exigirá confirmación forzosa mediante código de verificación temporal (OTP) enviado al correo electrónico registrado.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[10px] font-black">5</span>
                  Límite de Responsabilidad e Indemnidad del Desarrollador
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  El titular/desarrollador de la plataforma queda completamente exento de responsabilidad respecto a disputas comerciales entre comerciantes y compradores, errores u omisiones en el ingreso manual de datos por parte de los operadores del local, incumplimientos tributarios o contractuales de los usuarios, o pérdidas derivadas de negligencia en el resguardo de claves de acceso personales.
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN 2: PROTECCIÓN DE DATOS PERSONALES (LOPDP)              */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeSection === "privacidad" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-800 dark:text-blue-300 font-medium">
                Conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador, se establece la presente política de privacidad y consentimiento expreso para el tratamiento legítimo, seguro, confidencial y proporcional de la información comercial y personal.
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                  Categorías de Datos Personales y Comerciales Recopilados
                </h4>
                <p className="text-[var(--muted-foreground)] mb-2">
                  La plataforma procesa y almacena las siguientes categorías de datos proporcionados directamente por los usuarios, clientes o el establecimiento:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[var(--muted-foreground)]">
                  <li><strong>Datos de Identificación:</strong> Nombres completos, cédula de identidad, RUC, número telefónico, correo electrónico y dirección domiciliaria o comercial.</li>
                  <li><strong>Datos Transaccionales:</strong> Historial de compras de calzado, tallas preferidas, métodos de pago, comprobantes internos y detalles de entrega.</li>
                  <li><strong>Datos Crediticios y de Comportamiento de Pago:</strong> Saldo deudor pendiente, puntualidad de abonos, nivel de cumplimiento y puntaje de scoring progresivo.</li>
                  <li><strong>Datos Operativos y de Registro:</strong> Dirección IP de acceso, fecha y hora de transacciones, agente de usuario del navegador y bitácoras de auditoría de actividad.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                  Finalidad Exclusiva del Tratamiento
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  Los datos personales serán utilizados única y exclusivamente para: (a) Gestión y despacho de pedidos de calzado de cuero; (b) Emisión de comprobantes y notas de venta internas; (c) Control de cartera y cobro de créditos comerciales concedidos; (d) Cálculo algorítmico del scoring crediticio progresivo; (e) Garantías de producto y devoluciones a proveedores; y (f) Prevención de fraudes y trazabilidad de seguridad interna. <strong>Queda terminantemente prohibida la venta, cesión o comercialización de bases de datos a terceros.</strong>
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                  Medidas de Seguridad Técnicas y Organizativas
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  NEXORA aplica mecanismos de seguridad de estándar industrial: aislamiento estricto multi-inquilino (multi-tenant con validación forzosa en cada consulta), cifrado unidireccional de contraseñas mediante hashing bcrypt, tokens de autenticación JWT protegidos, canales de comunicación cifrados mediante HTTPS/TLS y bitácoras de auditoría inmutables para cada evento administrativo.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">4</span>
                  Ejercicio de Derechos ARCO+ (Acceso, Rectificación, Eliminación y Oposición)
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  En cumplimiento de los artículos 21 al 26 de la LOPDP, los titulares de los datos tienen derecho a solicitar el acceso, rectificación, actualización, supresión u oposición sobre sus datos personales almacenados, canalizando sus requerimientos formales a través de la administración del establecimiento comercial titular de la cuenta.
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN 3: INTELIGENCIA ARTIFICIAL & SCORING CREDITICIO         */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeSection === "ia_scoring" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-800 dark:text-purple-300 font-medium">
                Cláusula de transparencia y uso ético de algoritmos de Machine Learning, motores predictivos de demanda e inferencia estadística en el sistema NEXORA.
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                  Tratamiento Mediante Inteligencia Artificial y Machine Learning
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  El sistema incorpora modelos analíticos de Machine Learning y algoritmos de series temporales diseñados para estimar la demanda proyectada de calzado de cuero, identificar curvas de tallas críticas, sugerir niveles óptimos de reabastecimiento en bodega y detectar patrones estacionales en el cantón Cevallos.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                  Naturaleza Asistiva y Criterio Humano Prevalente
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  Las proyecciones, alertas de stock estancado, estimaciones de demanda y recomendaciones generadas por los módulos de Inteligencia Artificial constituyen herramientas de soporte operativo y asistencia a la toma de decisiones. No constituyen una garantía de ventas futuras ni asesoramiento financiero vinculante. La decisión final de compra de insumos, fijación de precios y producción recae exclusivamente bajo el criterio y responsabilidad de la administración del negocio.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                  Criterios Objetivos del Scoring Crediticio Progresivo
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  El algoritmo de scoring crediticio evalúa exclusivamente variables financieras y comerciales objetivas: historial de puntualidad en abonos anteriores, volumen total de compras acumuladas, tiempo de relación comercial y cumplimiento de plazos de pago acordados. El sistema <strong>no utiliza variables sensibles</strong> (etnia, género, religión, afiliación política u orientación) para perfilar ni clasificar a ningún cliente o comerciante.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">4</span>
                  Derecho a la Revisión Humana de Decisiones Automatizadas (Art. 20 LOPDP)
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  De conformidad con el Artículo 20 de la LOPDP, todo cliente o comerciante tiene derecho a no someterse a decisiones basadas únicamente en valoraciones automatizadas. La administración del local comercial mantiene en todo momento la potestad y obligación de revisar, ajustar manualmente o reconsiderar cualquier cupo de crédito otorgado mediante evaluación humana directa.
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN 4: RESPONSABILIDAD LABORAL Y DEBER DE SIGILO            */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeSection === "laboral" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-800 dark:text-amber-300 font-medium">
                Deberes, obligaciones y responsabilidades de los colaboradores en el uso de herramientas tecnológicas de conformidad con los Artículos 42, 44 y 45 del Código del Trabajo del Ecuador.
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">1</span>
                  Diligencia en la Custodia de Mercadería y Arqueo de Caja
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  Los colaboradores que desempeñen roles de Administrador, Vendedor, Cajero o Bodeguero están obligados a registrar de manera veraz, inmediata y exacta cada ingreso, venta por par, pedido por lote, despacho o devolución de calzado, así como la totalidad de los valores monetarios recaudados en efectivo, transferencias bancarias o vouchers de tarjeta, respondiendo legalmente por faltantes o inconsistencias no justificadas.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">2</span>
                  Deber de Confidencialidad y Secreto Comercial
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  Todo usuario que tenga acceso a listados de clientes, precios de costo de proveedores, márgenes brutos, reportes de inteligencia o fórmulas comerciales del establecimiento asume la obligación de guardar estricta reserva y sigilo profesional, prohibiéndose la divulgación, copia o aprovechamiento personal de dicha información durante y después de la terminación de su contrato de trabajo.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">3</span>
                  Prohibición de Alteración Fraudulenta de Inventarios
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  Se prohíbe terminantemente la anulación dolosa de comprobantes, la manipulación de stock para encubrir pérdidas, el otorgamiento no autorizado de descuentos o la concesión de créditos a clientes sin el debido registro en la plataforma. Estas conductas facultan al empleador a iniciar las acciones laborales (visto bueno) y penales pertinentes.
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN 5: DELITOS INFORMÁTICOS & JURISDICCIÓN                  */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeSection === "penal_jurisdiccion" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-800 dark:text-rose-300 font-medium">
                Marco sancionatorio por vulneración de sistemas y delitos contra la seguridad de los activos de información conforme al Código Orgánico Integral Penal (COIP).
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                  Tipificación de Delitos Informáticos (COIP Arts. 229, 230 y 232)
                </h4>
                <p className="text-[var(--muted-foreground)] mb-2">
                  El usuario reconoce expresamente que las siguientes conductas constituyen infracciones penales sancionadas con pena privativa de libertad bajo la legislación ecuatoriana:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[var(--muted-foreground)]">
                  <li><strong>Revelación ilegal de base de datos (Art. 229 COIP):</strong> Difundir, extraer, transferir o comercializar datos personales o comerciales de la plataforma.</li>
                  <li><strong>Interceptación o acceso no consentido (Art. 230 COIP):</strong> Utilizar credenciales ajenas, alterar sesiones o interceptar comunicaciones del sistema.</li>
                  <li><strong>Ataque a la integridad de sistemas informáticos (Art. 232 COIP):</strong> Borrar, alterar, deteriorar o manipular registros de transacciones, saldos o auditorías.</li>
                  <li><strong>Falsificación y estafa electrónica:</strong> Simular pagos ficticios o generar notas de entrega falsificadas.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                  Auditoría Forense Digital y Resguardo de Evidencias
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  El sistema genera bitácoras criptográficas continuas que registran cada inicio de sesión, cambio de estado, modificación de precios y movimiento de cartera. En caso de detectarse anomalías o indicios de fraude, dichas bitácoras serán puestas a disposición de la Fiscalía General del Estado como evidencia pericial informática.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-sm mb-1.5 text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                  Legislación Aplicable, Jurisdicción y Competencia
                </h4>
                <p className="text-[var(--muted-foreground)]">
                  Para todos los efectos legales y la resolución de controversias derivadas del uso de la plataforma, las partes se someten a las leyes de la República del Ecuador y a los jueces competentes de la Unidad Judicial correspondiente a la provincia de Tungurahua (cantón Cevallos / Ambato).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── MENSAJE DE ERROR SI OCURRE ─── */}
        {error && (
          <div className="mx-6 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl flex items-center gap-2 text-xs font-semibold shrink-0">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {/* ─── CHECKBOX DE ACEPTACIÓN Y BOTÓN FINAL ─── */}
        <div className="px-6 py-4 bg-[var(--muted)]/30 border-t border-[var(--border)] shrink-0 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedCheckbox}
              onChange={(e) => setAcceptedCheckbox(e.target.checked)}
              className="mt-0.5 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0 cursor-pointer"
            />
            <span className="text-xs text-[var(--foreground)] font-medium leading-tight">
              Declaro que he leído, comprendo cabalmente y acepto en su totalidad los <strong>Términos y Condiciones de Uso</strong>, la <strong>Política de Protección de Datos Personales (LOPDP)</strong>, el <strong>Tratamiento Asistivo con Inteligencia Artificial</strong> y las responsabilidades legales y penales vigentes en la República del Ecuador.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
              <ShieldAlert size={14} className="text-emerald-600 shrink-0" />
              <span>Registro con validez jurídica vinculante. Requerido para acceder a las funciones operativas.</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Imprimir copia de los términos legales"
              >
                <Printer size={13} />
                <span className="hidden sm:inline">Imprimir Copia</span>
              </button>

              <button
                type="button"
                disabled={!acceptedCheckbox || loading}
                onClick={handleAccept}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} className="text-white" />}
                <span>Aceptar y Continuar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

