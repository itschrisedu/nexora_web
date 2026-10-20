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
  BrainCircuit,
  ShieldAlert,
  Gavel,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ApiService } from "@/services/api.service";

interface TermsModalProps {
  isOpen: boolean;
  userNombre: string;
  userEmail: string;
  userRol: string;
  onAccepted: () => void;
}

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
                  DOCUMENTO LEGAL UNIFICADO — ECUADOR
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Cumplimiento LOPDP · COESCCI · COIP · Código del Trabajo
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Términos del Servicio, Política de Privacidad y Tratamiento de Datos
              </h2>
            </div>
          </div>
          
          <div className="text-right hidden sm:block shrink-0">
            <span className="text-xs font-bold text-slate-200 block">{userNombre}</span>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">{userRol}</span>
          </div>
        </div>

        {/* ─── CUERPO DEL DOCUMENTO LEGAL EN CARD CONTINUA Y SCROLLABLE ─── */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[var(--foreground)] leading-relaxed max-h-[60vh] divide-y divide-[var(--border)]">
          
          {/* BANNER INFORMATIVO INICIAL */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-900 dark:text-emerald-200 font-medium space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300">
              <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
              Marco Contractual y Regulatorio Aplicable
            </p>
            <p className="text-[11px] leading-relaxed text-emerald-800/90 dark:text-emerald-200/90">
              El presente instrumento regula de forma integral el acceso, uso de software, procesamiento de inventario de calzado, registro de clientes, gestión de créditos y custodia de datos en la plataforma tecnológica, de estricta conformidad con el marco jurídico vigente de la República del Ecuador.
            </p>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* CAPÍTULO I: OBJETO DEL SISTEMA Y LICENCIA DE USO (COESCCI)     */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="pt-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-[10px] uppercase">
                Capítulo I
              </span>
              <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-1.5">
                <FileText size={15} className="text-emerald-600" />
                Objeto del Servicio y Licencia de Software (COESCCI)
              </h3>
            </div>

            <div className="space-y-3 text-[var(--muted-foreground)] pl-1">
              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  1.1 Naturaleza del Servicio y Funcionalidad Operativa
                </h4>
                <p>
                  La plataforma opera como una solución de software como servicio (SaaS) orientada al control operativo del ciclo comercial de calzado de cuero, administración de inventarios estructurados por curvas de tallas, punto de venta (POS), gestión de notas de entrega internas, seguimiento de cartera de cobro y analítica comercial para comercios en el cantón Cevallos y a escala nacional.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  1.2 Propiedad Intelectual y Titularidad de Autor
                </h4>
                <p>
                  En conformidad con el Código Orgánico de la Economía Social de los Conocimientos, Creatividad e Innovación (COESCCI), la arquitectura técnica, código fuente, esquemas de bases de datos, lógica algorítmica e interfaces visuales constituyen propiedad intelectual exclusiva de su autor y desarrollador Christopher Eduardo Paucar Manzano. El comercio adquiere una licencia de uso legítima, revocable y no transferible, prohibiéndose estrictamente cualquier acto de ingeniería inversa, clonación o redistribución no autorizada.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  1.3 Eficacia Jurídica de Mensajes de Datos y Firmas Electrónicas
                </h4>
                <p>
                  Bajo el amparo de la Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos del Ecuador, todos los registros electrónicos, asignaciones de stock, órdenes internas y autorizaciones de doble factor (códigos OTP) registrados en el aplicativo gozan de plena validez jurídica, valor probatorio y eficacia vinculante.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  1.4 Uso de Credenciales y Sesión Segura
                </h4>
                <p>
                  Las credenciales de acceso son de carácter estrictamente personal, confidencial e intransferible. Cada operador o administrador es legalmente responsable de las transacciones emitidas bajo su perfil. Para mitigar accesos indebidos, el sistema restringe inicios de sesión concurrentes y aplica verificación de seguridad ante nuevos dispositivos.
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* CAPÍTULO II: PROTECCIÓN DE DATOS PERSONALES (LOPDP)             */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="pt-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px] uppercase">
                Capítulo II
              </span>
              <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-1.5">
                <Lock size={15} className="text-blue-600" />
                Política de Protección de Datos Personales (LOPDP Ecuador)
              </h3>
            </div>

            <div className="space-y-3 text-[var(--muted-foreground)] pl-1">
              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  2.1 Categorías de Datos Objeto de Tratamiento
                </h4>
                <p className="mb-2">
                  En cumplimiento de la Ley Orgánica de Protección de Datos Personales (LOPDP), la plataforma almacena y procesa exclusivamente los siguientes datos estrictamente necesarios para la relación comercial y operativa:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Identificación comercial:</strong> Nombres completos, razón social, número de cédula o RUC, teléfono, dirección y correo electrónico.</li>
                  <li><strong>Actividad transaccional:</strong> Registro de calzado adquirido, curvas de tallas solicitadas, comprobantes de entrega internos y estados de despacho.</li>
                  <li><strong>Información de cartera y pagos:</strong> Historial de abonos comerciales, saldos adeudados, fechas de vencimiento y puntaje crediticio progresivo.</li>
                  <li><strong>Metadatos de seguridad:</strong> Dirección IP, fecha/hora de transacciones, agente de navegación y bitácoras de auditoría de modificaciones.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  2.2 Finalidad Legítima y Prohibición de Comercialización
                </h4>
                <p>
                  Los datos personales y comerciales se emplean con el único propósito de despachar calzado, gestionar cobros internos, controlar garantías con proveedores y prevenir fraudes. Queda prohibida la venta, arriendo, cesión o monetización de las bases de datos de clientes y comerciantes a terceras empresas o agencias externas.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  2.3 Medidas de Seguridad Técnicas y Cifrado
                </h4>
                <p>
                  Se implementa aislamiento de datos por establecimiento (arquitectura multi-inquilino segura), cifrado criptográfico unidireccional de contraseñas mediante algoritmo bcrypt, tokens de autenticación web seguros con expiración controlada y transmisión de datos protegida mediante protocolo HTTPS/TLS.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  2.4 Derechos ARCO+ del Titular de Datos
                </h4>
                <p>
                  Conforme a los Artículos 21 al 26 de la LOPDP, los titulares podrán ejercer sus derechos de acceso, rectificación, actualización, oposición o eliminación respecto de sus datos personales acudiendo directamente a los canales de atención del establecimiento comercial responsable de su cuenta.
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* CAPÍTULO III: INTELIGENCIA ARTIFICIAL & SCORING CREDITICIO      */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="pt-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-600 text-white font-black text-[10px] uppercase">
                Capítulo III
              </span>
              <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-1.5">
                <BrainCircuit size={15} className="text-purple-600" />
                Transparencia Algorítmica y Scoring Crediticio Progresivo
              </h3>
            </div>

            <div className="space-y-3 text-[var(--muted-foreground)] pl-1">
              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  3.1 Modelos Analíticos y Pronóstico de Demanda
                </h4>
                <p>
                  La plataforma utiliza algoritmos analíticos y estimaciones estadísticas para proyectar curvas de rotación de calzado por tallas y sugerir niveles de reposición en bodega. Dichas funciones operan como herramientas asistivas de recomendación y no constituyen garantías absolutas de ventas futuras.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  3.2 Variables Objetivas del Scoring Crediticio
                </h4>
                <p>
                  La asignación progresiva de crédito comercial se sustenta en parámetros financieros objetivos: puntualidad de pagos en cuotas previas, volumen acumulado de calzado comercializado y tiempo de permanencia activa. No se consideran variables sensibles (como género, credo, etnia u orientación) para calificar a ningún comerciante o cliente.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  3.3 Derecho a la Revisión Humana Directa (Art. 20 LOPDP)
                </h4>
                <p>
                  En observancia del Artículo 20 de la LOPDP sobre decisiones basadas en valoraciones automatizadas, la administración del comercio local conserva el derecho y la facultad permanente de intervenir, ajustar, modificar o autorizar manualmente cualquier límite crediticio o condición comercial sin quedar supeditada exclusivamente al resultado algorítmico.
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* CAPÍTULO IV: RÉGIMEN LABORAL Y DEBER DE SIGILO COMERCIAL       */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="pt-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] uppercase">
                Capítulo IV
              </span>
              <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-amber-600" />
                Régimen Laboral y Deber de Sigilo Comercial (Código del Trabajo)
              </h3>
            </div>

            <div className="space-y-3 text-[var(--muted-foreground)] pl-1">
              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  4.1 Diligencia en Arqueo de Caja y Custodia de Mercadería
                </h4>
                <p>
                  De conformidad con los Artículos 42, 44 y 45 del Código del Trabajo, los colaboradores con perfiles de atención, caja o bodega asumen la responsabilidad laboral de reportar con total exactitud las ventas por par o lotes, los cobros recaudados y el inventario físico existente en tienda y almacén.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  4.2 Confidencialidad y Protección de Secretos del Negocio
                </h4>
                <p>
                  Los operadores se comprometen a guardar absoluta reserva y sigilo respecto a los precios de costo de proveedores, márgenes brutos de ganancia, cartera de clientes y estrategias comerciales a las que tengan acceso en razón de sus labores, extendiéndose esta obligación tras la terminación de la relación laboral.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  4.3 Prohibición de Alteración Fraudulenta
                </h4>
                <p>
                  Cualquier intento de alteración intencional de inventarios para encubrir faltantes, anulación ficticia de comprobantes o desvío de mercadería facultará al empleador a iniciar las acciones laborales (trámite de visto bueno) y penales correspondientes.
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* CAPÍTULO V: SEGURIDAD DIGITAL Y DELITOS INFORMÁTICOS (COIP)    */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="pt-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] uppercase">
                Capítulo V
              </span>
              <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-1.5">
                <Gavel size={15} className="text-rose-600" />
                Seguridad Digital y Régimen Sancionatorio (COIP)
              </h3>
            </div>

            <div className="space-y-3 text-[var(--muted-foreground)] pl-1">
              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  5.1 Tipificación de Infracciones Informáticas
                </h4>
                <p className="mb-2">
                  El usuario declara conocer que las siguientes acciones constituyen delitos sancionados con pena privativa de libertad bajo el Código Orgánico Integral Penal (COIP):
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Revelación ilegal de bases de datos (Art. 229 COIP):</strong> Sustracción, comercialización o difusión no autorizada de registros comerciales o personales.</li>
                  <li><strong>Acceso no consentido (Art. 230 COIP):</strong> Utilización de credenciales ajenas o vulneración de mecanismos de control de acceso.</li>
                  <li><strong>Ataque a la integridad de sistemas (Art. 232 COIP):</strong> Destrucción, bloqueo o alteración fraudulenta de información de stock o saldos.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  5.2 Bitácoras de Auditoría y Resguardo Pericial
                </h4>
                <p>
                  Las transacciones, aperturas de turno, despachos y anulaciones generan un registro de auditoría digital inmutable con marcas de tiempo. En caso de incidentes graves o sospecha fundada de fraude, la información se remitirá a la Fiscalía General del Estado para peritajes técnicos.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  5.3 Fuero y Jurisdicción Aplicable
                </h4>
                <p>
                  Cualquier controversia que no pudiere resolverse de mutuo acuerdo entre las partes se someterá a la jurisdicción ordinaria de los jueces competentes en la provincia de Tungurahua (cantón Cevallos / Ambato).
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* CAPÍTULO VI: SUSCRIPCIÓN SAAS, FACTURACIÓN Y CANCELACIÓN       */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="pt-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[10px] uppercase">
                Capítulo VI
              </span>
              <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-1.5">
                <RefreshCw size={15} className="text-emerald-600" />
                Términos de Suscripción SaaS, Facturación y Cancelación Libre
              </h3>
            </div>

            <div className="space-y-3 text-[var(--muted-foreground)] pl-1">
              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  6.1 Modalidad de Pago y Sin Cláusulas de Permanencia Forzosa
                </h4>
                <p>
                  El servicio se presta bajo el esquema de suscripción mensual o anual para locales comerciales. Los planes no contemplan plazos forzosos de permanencia ni cláusulas de penalización por desvinculación voluntaria.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  6.2 Procedimiento de Cancelación Transparente
                </h4>
                <p>
                  El titular del negocio puede rescindir o cancelar su plan en cualquier momento previo a su siguiente ciclo de facturación, mediante comunicación directa a la administración de soporte o desde su panel de configuración de suscripción, cesando los cobros de renovación subsecuentes.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-1">
                  6.3 Portabilidad y Exportación de Datos
                </h4>
                <p>
                  En caso de terminación del servicio, el comercio titular conservará el derecho inalienable de descargar y respaldar su historial de transacciones, catálogo de calzado y base de clientes en formatos estándar (hojas electrónicas/PDF) antes del cierre definitivo de su instancia operativa.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ─── MENSAJE DE ERROR SI OCURRE ─── */}
        {error && (
          <div className="mx-6 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl flex items-center gap-2 text-xs font-semibold shrink-0">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {/* ─── CHECKBOX DE ACEPTACIÓN Y BOTÓN FINAL (SIN BOTÓN DE IMPRIMIR) ─── */}
        <div className="px-6 py-4 bg-[var(--muted)]/30 border-t border-[var(--border)] shrink-0 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedCheckbox}
              onChange={(e) => setAcceptedCheckbox(e.target.checked)}
              className="mt-0.5 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0 cursor-pointer"
            />
            <span className="text-xs text-[var(--foreground)] font-medium leading-tight">
              Declaro que he leído en su totalidad este documento legal unificado, comprendo sus términos y acepto las condiciones de servicio, la <strong>Política de Protección de Datos Personales (LOPDP)</strong>, las cláusulas de <strong>Transparencia de Inteligencia Artificial</strong> y las responsabilidades operativas en el territorio ecuatoriano.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
              <ShieldAlert size={14} className="text-emerald-600 shrink-0" />
              <span>Registro digital vinculante y obligatorio para el uso de los módulos del sistema.</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
