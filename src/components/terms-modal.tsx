"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  FileText,
  Lock,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Building2,
  ExternalLink,
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
  const [activeSection, setActiveSection] = useState<"terminos" | "privacidad" | "laboral">("terminos");

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!acceptedCheckbox) return;
    setLoading(true);
    setError("");

    try {
      await ApiService.post("/auth/accept-terms", { version: "1.0" });
      onAccepted();
    } catch (err: any) {
      setError(err.message || "Error al registrar la aceptación legal. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[var(--card)] border border-slate-700/80 rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* ─── CABECERA DEL MODAL ─── */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Scale size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  MARCO LEGAL V1.0
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">República del Ecuador</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Términos y Condiciones de Uso del Sistema NEXORA
              </h2>
            </div>
          </div>
          
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-300">{userNombre}</span>
            <span className="text-[10px] text-amber-400 block font-mono font-semibold">{userRol}</span>
          </div>
        </div>

        {/* ─── SELECTOR DE PESTAÑAS LEGALES ─── */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-[var(--muted)]/40 border-b border-[var(--border)] shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSection("terminos")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === "terminos"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <FileText size={14} />
            <span>1. Términos de Servicio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("privacidad")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === "privacidad"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Lock size={14} />
            <span>2. Protección de Datos (LOPDP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("laboral")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSection === "laboral"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <ShieldCheck size={14} />
            <span>3. Responsabilidad Laboral</span>
          </button>
        </div>

        {/* ─── CUERPO DEL DOCUMENTO LEGAL (SCROLLABLE) ─── */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[var(--foreground)] leading-relaxed divide-y divide-[var(--border)] max-h-[46vh]">
          
          {activeSection === "terminos" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 font-medium">
                Este instrumento regula el acceso, registro de transacciones, custodia de información y uso operativo de la plataforma NEXORA en los locales comerciales del cantón Cevallos.
              </div>

              <div>
                <h4 className="font-bold text-sm mb-1 text-[var(--foreground)]">1. Objeto y Alcance del Sistema</h4>
                <p className="text-[var(--muted-foreground)]">
                  NEXORA es una plataforma web especializada para la gestión comercial, control de inventario de calzado de cuero, administración de pedidos, recaudación de valores y análisis de scoring crediticio progresivo. Toda actividad efectuada dentro de la cuenta del usuario queda registrada de forma inalterable en pistas de auditoría digital.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-1 text-[var(--foreground)]">2. Validez de Mensajes de Datos y Firmas Electrónicas</h4>
                <p className="text-[var(--muted-foreground)]">
                  Conforme a la Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos del Ecuador, los registros de ventas, movimientos de stock, abonos a créditos y comprobantes internos emitidos mediante NEXORA poseen plena validez jurídica y fuerza probatoria entre las partes intervinientes.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-1 text-[var(--foreground)]">3. Uso Autorizado de Credenciales</h4>
                <p className="text-[var(--muted-foreground)]">
                  Las credenciales de acceso (correo electrónico y contraseña) son de carácter personal e intransferible. El usuario asume la total responsabilidad por las acciones, aperturas de caja, despachos o modificaciones ejecutadas bajo su sesión activa.
                </p>
              </div>
            </div>
          )}

          {activeSection === "privacidad" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-800 dark:text-blue-300 font-medium">
                Conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador, se garantiza el tratamiento legítimo, seguro y confidencial de toda información comercial y de clientes.
              </div>

              <div>
                <h4 className="font-bold text-sm mb-1 text-[var(--foreground)]">1. Finalidad del Tratamiento de Datos</h4>
                <p className="text-[var(--muted-foreground)]">
                  Los datos de clientes, teléfonos, direcciones y registros de compra almacenados en NEXORA se utilizarán exclusivamente para el cálculo de cupos de crédito directo, emisión de notas de entrega, gestión de cobranza y atención de pedidos de calzado. Queda terminantemente prohibida la comercialización, cesión o filtración de bases de datos a terceros.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-1 text-[var(--foreground)]">2. Deber de Confidencialidad y Sigilo Comercial</h4>
                <p className="text-[var(--muted-foreground)]">
                  Todo usuario que acceda a reportes financieros, márgenes de utilidad, listados de proveedores o información crediticia de clientes está obligado a guardar estricta reserva, subsistiendo esta obligación incluso tras la finalización de su relación laboral o contractual.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-1 text-[var(--foreground)]">3. Seguridad y Resguardo Técnico</h4>
                <p className="text-[var(--muted-foreground)]">
                  NEXORA implementa controles de cifrado, arquitectura multi-inquilino aislada y políticas de respaldo periódico para salvaguardar la integridad de la información frente a accesos no autorizados o pérdidas accidentales.
                </p>
              </div>
            </div>
          )}

          {activeSection === "laboral" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-300 font-medium">
                Deberes y obligaciones de los colaboradores en el uso de herramientas tecnológicas de conformidad con el Código del Trabajo del Ecuador (Artículos 42 y 45).
              </div>

              <div>
                <h4 className="font-bold text-sm mb-1 text-[var(--foreground)]">1. Diligencia en la Custodia de Mercadería y Caja</h4>
                <p className="text-[var(--muted-foreground)]">
                  El personal asignado a los roles de vendedor, cajero o bodeguero tiene la obligación de registrar con exactitud cada ingreso y egreso de pares de calzado de cuero, así como los valores monetarios recaudados en efectivo o transferencias, cuadrando la caja diariamente sin omisiones.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-1 text-[var(--foreground)]">2. Uso Exclusivo en Jornada de Trabajo</h4>
                <p className="text-[var(--muted-foreground)]">
                  El sistema NEXORA y los permisos de geolocalización o registro de ventas deben ser utilizados durante la jornada operativa establecida por el empleador, absteniéndose de alterar o manipular información de inventarios de manera indebida.
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
              className="mt-0.5 rounded border-amber-400 text-amber-500 focus:ring-amber-400 h-4 w-4 shrink-0"
            />
            <span className="text-xs text-[var(--foreground)] font-medium leading-tight">
              He leído, comprendo y acepto expresamente los <strong>Términos y Condiciones de Uso</strong>, la <strong>Política de Protección de Datos Personales</strong> y los deberes operativos del sistema NEXORA en la República del Ecuador.
            </span>
          </label>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-[var(--muted-foreground)]">
              Acción obligatoria para acceder a los módulos operativos del establecimiento.
            </span>

            <button
              type="button"
              disabled={!acceptedCheckbox || loading}
              onClick={handleAccept}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} className="text-amber-400" />}
              <span>Aceptar y Continuar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
