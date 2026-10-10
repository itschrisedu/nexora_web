"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, DollarSign, Loader2 } from "lucide-react";
import { ApiService } from "@/services/api.service";
import { db } from "@/db/local-db";
import {
  validarTelefonoCelular,
  validarDocumentoEcuador,
  normalizarTelefonoCelular,
} from "@/utils/ecuador-validators";
import {
  formatearNombres,
  formatearApellidos,
  formatearEmail,
  validarEmailEstricto,
  formatearTelefono,
  formatearDireccion,
  capitalizarNombreCompleto,
} from "@/utils/text-formatters";

interface NuevoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClienteCreado: (cliente: any) => void;
  online: boolean;
  activeSucursalId?: string;
  initialBusqueda?: string;
  zIndexClass?: string;
}

const INPUT_CLASS =
  "w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] transition-colors";

function FieldLabel({ title, required }: { title: string; required?: boolean }) {
  return (
    <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
      {title}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export default function NuevoClienteModal({
  isOpen,
  onClose,
  onClienteCreado,
  online,
  activeSucursalId,
  initialBusqueda = "",
  zIndexClass = "z-[70]",
}: NuevoClienteModalProps) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [tipoDoc, setTipoDoc] = useState<"CEDULA" | "RUC" | "PASAPORTE">("CEDULA");
  const [numDoc, setNumDoc] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");

  const [docErr, setDocErr] = useState("");
  const [telErr, setTelErr] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Saldo anterior / Deuda inicial al crear cliente
  const [tieneDeudaAnterior, setTieneDeudaAnterior] = useState(false);
  const [deudaAnteriorMonto, setDeudaAnteriorMonto] = useState("");
  const [deudaAnteriorConcepto, setDeudaAnteriorConcepto] = useState("Saldo anterior pendiente");
  const [deudaAnteriorFechaEmision, setDeudaAnteriorFechaEmision] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [deudaAnteriorFechaVencimiento, setDeudaAnteriorFechaVencimiento] = useState(() =>
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );
  const [deudaAnteriorNotas, setDeudaAnteriorNotas] = useState("");

  // Precargar inteligentemente si viene texto de búsqueda
  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setDocErr("");
    setTelErr("");
    setSaving(false);

    const busquedaLimpia = initialBusqueda.trim();
    if (!busquedaLimpia) {
      setNombre("");
      setApellido("");
      setTelefono("");
      setEmail("");
      setNumDoc("");
      setDireccion("");
      setNotas("");
      setTieneDeudaAnterior(false);
      setDeudaAnteriorMonto("");
      return;
    }

    // Si es solo dígitos (cédula o teléfono)
    if (/^\d+$/.test(busquedaLimpia)) {
      if (busquedaLimpia.startsWith("09") && busquedaLimpia.length <= 10) {
        setTelefono(busquedaLimpia);
        setNombre("");
        setApellido("");
        setNumDoc("");
      } else if (busquedaLimpia.length === 10) {
        setTipoDoc("CEDULA");
        setNumDoc(busquedaLimpia);
        setNombre("");
        setApellido("");
        setTelefono("");
      } else if (busquedaLimpia.length === 13) {
        setTipoDoc("RUC");
        setNumDoc(busquedaLimpia);
        setNombre("");
        setApellido("");
        setTelefono("");
      } else {
        setNumDoc(busquedaLimpia);
        setNombre("");
        setApellido("");
        setTelefono("");
      }
    } else {
      // Es texto: dividir en nombre y apellido
      const partes = busquedaLimpia.split(/\s+/);
      if (partes.length === 1) {
        setNombre(formatearNombres(partes[0]));
        setApellido("");
      } else if (partes.length === 2) {
        setNombre(formatearNombres(partes[0]));
        setApellido(formatearApellidos(partes[1]));
      } else {
        setNombre(formatearNombres(partes.slice(0, 2).join(" ")));
        setApellido(formatearApellidos(partes.slice(2).join(" ")));
      }
      setTelefono("");
      setNumDoc("");
    }
  }, [isOpen, initialBusqueda]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    let valid = true;
    setError("");
    setTelErr("");
    setDocErr("");

    if (!nombre.trim() || !apellido.trim() || !telefono.trim()) {
      setError("Nombre, Apellido y Teléfono Celular son obligatorios.");
      return false;
    }

    // Validación Celular Ecuador
    if (!validarTelefonoCelular(telefono)) {
      setTelErr("El celular debe tener 10 dígitos y empezar con 09 (ej. 0991234567).");
      valid = false;
    }

    // Validación de Email si existe
    if (email) {
      const emailRes = validarEmailEstricto(email);
      if (!emailRes.valido) {
        setError(emailRes.mensaje || "El correo electrónico ingresado no es válido.");
        valid = false;
      }
    }

    // Validación de Documento de Identificación
    if (numDoc) {
      const docRes = validarDocumentoEcuador(tipoDoc, numDoc);
      if (!docRes.valido) {
        setDocErr(docRes.mensaje || "Documento de identificación inválido.");
        valid = false;
      }
    }

    // Validación de Deuda anterior opcional
    if (tieneDeudaAnterior) {
      const montoNum = parseFloat(deudaAnteriorMonto);
      if (isNaN(montoNum) || montoNum <= 0) {
        setError("El monto de la deuda anterior debe ser mayor a $0.00.");
        return false;
      }
      if (!deudaAnteriorConcepto.trim()) {
        setError("Por favor especifica el concepto o motivo de la deuda anterior.");
        return false;
      }
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const telNormalizado = normalizarTelefonoCelular(telefono);
      const cedulaVal =
        tipoDoc === "CEDULA" || tipoDoc === "PASAPORTE"
          ? numDoc.trim() || undefined
          : undefined;
      const rucVal = tipoDoc === "RUC" ? numDoc.trim() || undefined : undefined;

      let clienteCreadoId = "";
      let clienteNuevoObj: any = null;

      if (online) {
        const res = await ApiService.post("/clientes", {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telNormalizado,
          email: email.trim() || undefined,
          cedula: cedulaVal,
          ruc: rucVal,
          direccion: direccion.trim() || undefined,
          notas: notas.trim() || undefined,
        });

        clienteCreadoId =
          res?.id || res?.data?.id || (typeof res === "string" ? res : `cli-${Date.now()}`);

        clienteNuevoObj = {
          id: clienteCreadoId,
          nombre: `${nombre.trim()} ${apellido.trim()}`.trim(),
          cedula: cedulaVal || rucVal || "—",
          telefono: telNormalizado,
          email: email.trim(),
          direccion: direccion.trim(),
          score: 100,
          nivelCredito: "SIN_CREDITO",
          totalCompras: 0,
          comprasSinAtraso: 0,
          atrasoConsecutivo: 0,
          limiteCredito: 0,
          creditoUtilizado: 0,
          creditoDisponible: 0,
          activo: true,
        };

        // Si se indicó saldo anterior / deuda previa
        const montoNum = parseFloat(deudaAnteriorMonto);
        if (tieneDeudaAnterior && clienteCreadoId && !isNaN(montoNum) && montoNum > 0) {
          try {
            await ApiService.post("/financiero/cobros/deuda-manual", {
              clientId: clienteCreadoId,
              monto: montoNum,
              concepto: deudaAnteriorConcepto.trim() || "Saldo anterior pendiente",
              fechaEmision: deudaAnteriorFechaEmision || new Date().toISOString().split("T")[0],
              fechaVencimiento:
                deudaAnteriorFechaVencimiento ||
                new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
              notas: deudaAnteriorNotas.trim() || undefined,
              sucursalId:
                activeSucursalId && activeSucursalId !== "TODAS"
                  ? activeSucursalId
                  : undefined,
            });
          } catch (errDeuda: any) {
            console.error("Aviso con saldo inicial de cliente:", errDeuda);
          }
        }
      } else {
        clienteCreadoId = `offline-${Date.now()}`;
        clienteNuevoObj = {
          id: clienteCreadoId,
          nombre: `${nombre.trim()} ${apellido.trim()}`.trim(),
          cedula: numDoc ? numDoc.trim() : "S/N",
          email: email.trim() || undefined,
          telefono: telNormalizado,
          direccion: direccion.trim() || undefined,
          limiteCredito: 0,
          cupoDisponible: 0,
          score: 100,
          nivelCredito: "SIN_CREDITO",
          activo: true,
        };

        await db.clientes.add(clienteNuevoObj);
      }

      onClienteCreado(clienteNuevoObj);
      onClose();
    } catch (err: any) {
      let msg = err.message || "Error al registrar el cliente.";
      if (
        typeof msg === "string" &&
        (msg.includes("tenantId") || msg.toLowerCase().includes("tenant"))
      ) {
        msg =
          "Por favor selecciona una sucursal en la barra superior antes de registrar un cliente.";
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-slate-950/75 backdrop-blur-sm ${zIndexClass} flex items-center justify-center p-3 sm:p-5`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="p-5 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Registrar Nuevo Cliente</h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Alta rápida para selección automática en el pedido
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto"
        >
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <FieldLabel title="Nombres" required />
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(formatearNombres(e.target.value))}
                placeholder="Ej. Juan Carlos"
                className={INPUT_CLASS}
                autoFocus
              />
            </div>
            <div>
              <FieldLabel title="Apellidos" required />
              <input
                type="text"
                required
                value={apellido}
                onChange={(e) => setApellido(formatearApellidos(e.target.value))}
                placeholder="Ej. Pérez Gómez"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <FieldLabel title="Teléfono Celular" required />
              <input
                type="tel"
                required
                maxLength={10}
                value={telefono}
                onChange={(e) => {
                  const val = formatearTelefono(e.target.value);
                  setTelefono(val);
                  if (telErr) setTelErr("");
                }}
                placeholder="0991234567 (10 dígitos)"
                className={`${INPUT_CLASS} ${telErr ? "border-red-400 focus:border-red-400" : ""}`}
              />
              {telErr && <p className="text-[10px] text-red-500 mt-1 font-medium">{telErr}</p>}
            </div>
            <div>
              <FieldLabel title="Email (Opcional)" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(formatearEmail(e.target.value))}
                placeholder="ej. cliente@correo.com"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel title="Tipo de Documento de Identificación" />
            <div className="grid grid-cols-3 gap-2">
              {(["CEDULA", "RUC", "PASAPORTE"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTipoDoc(t);
                    setDocErr("");
                  }}
                  className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    tipoDoc === t
                      ? "bg-[#0F172A] text-white border-[#0F172A] shadow-xs"
                      : "bg-[var(--muted)]/40 text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]"
                  }`}
                >
                  {t === "CEDULA" ? "Cédula" : t === "RUC" ? "RUC" : "Pasaporte"}
                </button>
              ))}
            </div>
            <div>
              <input
                type="text"
                maxLength={tipoDoc === "CEDULA" ? 10 : tipoDoc === "RUC" ? 13 : 20}
                value={numDoc}
                onChange={(e) => {
                  let val = e.target.value;
                  if (tipoDoc === "CEDULA" || tipoDoc === "RUC") {
                    val = val.replace(/\D/g, "");
                  }
                  setNumDoc(val);
                  if (docErr) setDocErr("");
                }}
                placeholder={
                  tipoDoc === "CEDULA"
                    ? "10 dígitos de la Cédula (ej. 1801234567)"
                    : tipoDoc === "RUC"
                    ? "13 dígitos del RUC (Cédula + 001)"
                    : "Número de pasaporte o ID extranjero"
                }
                className={`${INPUT_CLASS} ${docErr ? "border-red-400 focus:border-red-400" : ""}`}
              />
              {docErr && <p className="text-[10px] text-red-500 mt-1 font-medium">{docErr}</p>}
            </div>
          </div>

          <div>
            <FieldLabel title="Dirección de Entrega / Domicilio" />
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              onBlur={() => setDireccion(formatearDireccion(direccion))}
              placeholder="Ej. Av. Principal y Los Álamos, Cevallos"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <FieldLabel title="Notas u Observaciones" />
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Preferencias del cliente, indicaciones de contacto..."
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          {/* Sección Opcional: Saldo Anterior / Deuda Previa */}
          <div className="pt-2 border-t border-[var(--border)]">
            <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tieneDeudaAnterior}
                    onChange={(e) => setTieneDeudaAnterior(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={14} className="text-amber-600" />
                    ¿Registrar saldo o deuda anterior pendiente?
                  </span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-full border border-amber-500/20">
                  Opcional
                </span>
              </div>

              {tieneDeudaAnterior && (
                <div className="space-y-3 pt-2 border-t border-amber-500/15 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                      Monto del Saldo / Deuda ($ USD) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700 dark:text-amber-400">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={deudaAnteriorMonto}
                        onChange={(e) => setDeudaAnteriorMonto(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 bg-[var(--card)] border border-amber-500/30 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-600 transition-colors"
                        required={tieneDeudaAnterior}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                      Concepto / Detalle de la Deuda <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Saldo de cuenta previa, arrastre de libreta..."
                      value={deudaAnteriorConcepto}
                      onChange={(e) => setDeudaAnteriorConcepto(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-amber-500/30 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-600 transition-colors"
                      required={tieneDeudaAnterior}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                        Fecha Emisión
                      </label>
                      <input
                        type="date"
                        value={deudaAnteriorFechaEmision}
                        onChange={(e) => setDeudaAnteriorFechaEmision(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-amber-500/30 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                        Fecha Vencimiento
                      </label>
                      <input
                        type="date"
                        value={deudaAnteriorFechaVencimiento}
                        onChange={(e) => setDeudaAnteriorFechaVencimiento(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-amber-500/30 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>Guardar y Seleccionar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
