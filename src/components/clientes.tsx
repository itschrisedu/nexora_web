"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import { db } from "../db/local-db";
import {
  Plus, Search, Loader2, Users, Edit2, CheckCircle,
  AlertCircle, X, RefreshCw, Phone, Mail, MapPin, User, CreditCard,
  Award, DollarSign, TrendingUp, ShieldAlert, FileText
} from "lucide-react";

interface ClientesProps {
  online: boolean;
}

interface Cliente {
  id: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  email?: string;
  cedula?: string;
  ruc?: string;
  direccion?: string;
  notas?: string;
  limiteCredito: number;
  cupoDisponible: number;
  score: number;
  nivelCredito: string;
  activo: boolean;
}

const INPUT = "w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] transition-colors";

// --- Validaciones Ecuador ---
function validarCedula(cedula: string): boolean {
  if (!cedula || cedula.length !== 10) return false;
  const provincia = parseInt(cedula.substring(0, 2));
  if (provincia < 1 || provincia > 24) return false;
  const digits = cedula.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = digits[i];
    if (i % 2 === 0) {
      val *= 2;
      if (val > 9) val -= 9;
    }
    sum += val;
  }
  const verificador = sum % 10 === 0 ? 0 : 10 - (sum % 10);
  return verificador === digits[9];
}

function validarRuc(ruc: string): boolean {
  if (!ruc || ruc.length !== 13) return false;
  if (!ruc.endsWith("001")) return false;
  return validarCedula(ruc.substring(0, 10));
}

function Lbl({ t, req }: { t: string; req?: boolean }) {
  return (
    <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
      {t}{req && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function nivelColor(nivel: string) {
  if (nivel === "PREMIUM") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (nivel === "BUENO") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (nivel === "REGULAR") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (nivel === "RIESGO") return "bg-red-500/10 text-red-500 border-red-500/20";
  return "bg-slate-500/10 text-slate-500 border-slate-500/20";
}

function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-600";
  if (s >= 60) return "text-amber-600";
  if (s >= 40) return "text-orange-500";
  return "text-red-500";
}

export default function ClientesComponent({ online }: ClientesProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Campos del formulario
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [cedula, setCedula] = useState("");
  const [ruc, setRuc] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");

  // Errores de validación inline
  const [cedulaErr, setCedulaErr] = useState("");
  const [rucErr, setRucErr] = useState("");

  useEffect(() => { loadClientes(); }, [online]);

  const loadClientes = async () => {
    setLoading(true);
    try {
      if (online) {
        const data = await ApiService.get("/clientes");
        setClientes(Array.isArray(data) ? data : []);
        await db.clientes.clear();
        if (Array.isArray(data)) {
          await db.clientes.bulkPut(
            data.map((c: any) => ({
              id: c.id,
              nombre: `${c.nombre || ""} ${c.apellido || ""}`.trim(),
              cedula: c.cedula || c.ruc || "S/N",
              email: c.email,
              telefono: c.telefono,
              limiteCredito: c.limiteCredito || 0,
              cupoDisponible: c.cupoDisponible || 0,
              score: c.score || 100,
              nivelCredito: c.nivelCredito || "SIN_CREDITO",
            }))
          );
        }
      } else {
        const local = await db.clientes.toArray();
        setClientes(local.map((c: any) => ({
          ...c, nombre: c.nombre, apellido: "", activo: true,
          nivelCredito: c.nivelCredito || "SIN_CREDITO",
        })));
      }
    } catch (e: any) {
      console.error("Error cargando clientes:", e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombre(""); setApellido(""); setTelefono(""); setEmail("");
    setCedula(""); setRuc(""); setDireccion(""); setNotas("");
    setError(""); setCedulaErr(""); setRucErr("");
  };

  const openCreate = () => { resetForm(); setShowCreate(true); };
  const openEdit = (c: Cliente) => {
    setNombre(c.nombre || ""); setApellido(c.apellido || "");
    setTelefono(c.telefono || ""); setEmail(c.email || "");
    setCedula(c.cedula || ""); setRuc(c.ruc || "");
    setDireccion(c.direccion || ""); setNotas(c.notas || "");
    setError(""); setCedulaErr(""); setRucErr("");
    setShowEdit(true);
  };

  const validateForm = (): boolean => {
    let valid = true;
    if (!nombre || !apellido || !telefono) {
      setError("Nombre, Apellido y Teléfono son obligatorios.");
      return false;
    }
    if (cedula && !validarCedula(cedula)) {
      setCedulaErr("Cédula ecuatoriana inválida (10 dígitos, verificado).");
      valid = false;
    } else { setCedulaErr(""); }
    if (ruc && !validarRuc(ruc)) {
      setRucErr("RUC inválido (13 dígitos, debe terminar en 001).");
      valid = false;
    } else { setRucErr(""); }
    return valid;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (online) {
        await ApiService.post("/clientes", {
          nombre, apellido, telefono,
          email: email || undefined, cedula: cedula || undefined,
          ruc: ruc || undefined, direccion: direccion || undefined, notas: notas || undefined,
        });
      } else {
        await db.clientes.add({
          id: `offline-${Date.now()}`,
          nombre: `${nombre} ${apellido}`.trim(),
          cedula: cedula || ruc || "S/N",
          email: email || undefined, telefono,
          limiteCredito: 0, cupoDisponible: 0, score: 100, nivelCredito: "SIN_CREDITO",
        });
      }
      setSuccess("Cliente registrado correctamente.");
      setShowCreate(false); resetForm(); loadClientes();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al guardar el cliente.");
    } finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError("");
    if (!validateForm()) return;
    setSaving(true);
    try {
      await ApiService.patch(`/clientes/${selected.id}`, {
        nombre, apellido, telefono,
        email: email || undefined, cedula: cedula || undefined,
        ruc: ruc || undefined, direccion: direccion || undefined, notas: notas || undefined,
      });
      setSuccess("Cliente actualizado correctamente.");
      setShowEdit(false); setSelected(null); resetForm(); loadClientes();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar el cliente.");
    } finally { setSaving(false); }
  };

  const filtered = clientes.filter(c => {
    const q = search.toLowerCase();
    const fullName = `${c.nombre || ""} ${c.apellido || ""}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (c.cedula && c.cedula.includes(q)) ||
      (c.ruc && c.ruc.includes(q)) ||
      (c.telefono && c.telefono.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const FormModal = ({ title, onSubmit, onClose }: { title: string; onSubmit: (e: React.FormEvent) => void; onClose: () => void }) => (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">{title}</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Los campos con * son obligatorios</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div><Lbl t="Nombre" req /><input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Juan" className={INPUT} /></div>
            <div><Lbl t="Apellido" req /><input type="text" required value={apellido} onChange={e => setApellido(e.target.value)} placeholder="Ej. Pérez" className={INPUT} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Lbl t="Teléfono" req /><input type="tel" required value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej. 0991234567" className={INPUT} /></div>
            <div><Lbl t="Email" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ej. juan@correo.com" className={INPUT} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Lbl t="Cédula" />
              <input type="text" maxLength={10} value={cedula} onChange={e => { setCedula(e.target.value); if (cedulaErr) setCedulaErr(""); }}
                placeholder="10 dígitos" className={`${INPUT} ${cedulaErr ? "border-red-400" : ""}`} />
              {cedulaErr && <p className="text-[10px] text-red-400 mt-1">{cedulaErr}</p>}
            </div>
            <div>
              <Lbl t="RUC" />
              <input type="text" maxLength={13} value={ruc} onChange={e => { setRuc(e.target.value); if (rucErr) setRucErr(""); }}
                placeholder="13 dígitos (termina 001)" className={`${INPUT} ${rucErr ? "border-red-400" : ""}`} />
              {rucErr && <p className="text-[10px] text-red-400 mt-1">{rucErr}</p>}
            </div>
          </div>
          <div><Lbl t="Dirección" /><input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Ej. Av. Principal 123, Guayaquil" className={INPUT} /></div>
          <div><Lbl t="Notas" /><textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones del cliente..." className={`${INPUT} resize-none`} /></div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <button type="submit" disabled={saving}
            className="w-full py-3 bg-[var(--primary)] text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={16} className="animate-spin" />Guardando...</> : <><CheckCircle size={16} />{title}</>}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex gap-6 h-full">
      {/* Lista de clientes */}
      <div className="flex-1 space-y-5 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Clientes & Crédito</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Gestiona la cartera de clientes y su scoring crediticio</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadClientes} className="p-2.5 border border-[var(--border)] rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
              <RefreshCw size={16} />
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus size={16} /><span>Nuevo Cliente</span>
            </button>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
          <input type="text" placeholder="Buscar por nombre, cédula, RUC, teléfono o email..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] transition-colors" />
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)]">
            <Loader2 className="animate-spin text-[var(--primary)] mb-3" size={36} />
            <span className="text-sm">Cargando clientes...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-[var(--card)] border border-[var(--border)] border-dashed rounded-2xl text-[var(--muted-foreground)]">
            <Users size={48} className="mb-4 opacity-30" />
            <p className="font-semibold">Sin clientes registrados</p>
            <p className="text-xs mt-1">Haz clic en "Nuevo Cliente" para registrar el primero.</p>
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider hidden md:table-cell">Cédula / RUC</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Contacto</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Score</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Nivel</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => setSelected(c)}
                    className={`hover:bg-[var(--muted)]/20 cursor-pointer transition-colors ${selected?.id === c.id ? "bg-[var(--primary)]/5" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-xs font-bold shrink-0">
                          {(c.nombre || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{c.nombre} {c.apellido || ""}</div>
                          <div className="text-[10px] text-[var(--muted-foreground)]">{c.telefono || "Sin teléfono"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-mono text-[var(--muted-foreground)]">{c.cedula || c.ruc || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-[var(--muted-foreground)]">{c.email || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold text-sm ${scoreColor(c.score)}`}>{c.score}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${nivelColor(c.nivelCredito)}`}>
                        {c.nivelCredito?.replace("_", " ") || "SIN CRÉDITO"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={e => { e.stopPropagation(); setSelected(c); openEdit(c); }}
                        className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors">
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
              {filtered.length} cliente{filtered.length !== 1 ? "s" : ""} {search ? "encontrado" : "en total"}{search ? `s para "${search}"` : ""}
            </div>
          </div>
        )}
      </div>

      {/* Panel de detalle */}
      <div className="w-72 shrink-0 hidden xl:block">
        {selected ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-5 sticky top-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-lg font-black">
                {(selected.nombre || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-sm">{selected.nombre} {selected.apellido || ""}</div>
                <div className={`text-[10px] px-2 py-0.5 rounded-lg border inline-block mt-0.5 font-semibold ${nivelColor(selected.nivelCredito)}`}>
                  {selected.nivelCredito?.replace("_", " ")}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
              {selected.telefono && <div className="flex items-center gap-2"><Phone size={13} />{selected.telefono}</div>}
              {selected.email && <div className="flex items-center gap-2"><Mail size={13} />{selected.email}</div>}
              {selected.cedula && <div className="flex items-center gap-2"><User size={13} />C.I: {selected.cedula}</div>}
              {selected.ruc && <div className="flex items-center gap-2"><FileText size={13} />RUC: {selected.ruc}</div>}
              {selected.direccion && <div className="flex items-center gap-2"><MapPin size={13} />{selected.direccion}</div>}
            </div>

            <div className="p-3 bg-[var(--muted)]/30 rounded-xl border border-[var(--border)]">
              <div className="text-[10px] text-[var(--muted-foreground)] font-semibold uppercase tracking-wider">Score NEXORA</div>
              <div className={`text-2xl font-black mt-1 ${scoreColor(selected.score)}`}>{selected.score}<span className="text-xs text-[var(--muted-foreground)] ml-1">/ 100</span></div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--muted-foreground)] flex items-center gap-1.5"><DollarSign size={13} />Cupo Disponible</span>
                <span className="font-bold text-emerald-600">${Number(selected.cupoDisponible).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--muted-foreground)] flex items-center gap-1.5"><ShieldAlert size={13} />Límite de Crédito</span>
                <span className="font-bold">${Number(selected.limiteCredito).toFixed(2)}</span>
              </div>
            </div>

            {selected.notas && (
              <div className="p-3 bg-[var(--muted)]/20 rounded-xl text-xs text-[var(--muted-foreground)] border border-[var(--border)]">
                <span className="font-semibold block mb-1">Notas:</span>{selected.notas}
              </div>
            )}

            <button onClick={() => { setSelected(selected); openEdit(selected); }}
              className="w-full py-2.5 flex items-center justify-center gap-2 border border-[var(--primary)] text-[var(--primary)] rounded-xl text-xs font-semibold hover:bg-[var(--primary)]/10 transition-colors">
              <Edit2 size={14} /> Editar cliente
            </button>
          </div>
        ) : (
          <div className="p-8 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] border-dashed rounded-2xl">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">Selecciona un cliente</p>
            <p className="text-xs mt-1">Haz clic en cualquier fila para ver el perfil crediticio.</p>
          </div>
        )}
      </div>

      {showCreate && <FormModal title="Registrar Cliente" onSubmit={handleCreate} onClose={() => { setShowCreate(false); resetForm(); }} />}
      {showEdit && selected && <FormModal title="Editar Cliente" onSubmit={handleEdit} onClose={() => { setShowEdit(false); resetForm(); }} />}
    </div>
  );
}
