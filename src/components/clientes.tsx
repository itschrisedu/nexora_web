"use client";

import { useState, useEffect } from "react";
import { ApiService } from "../services/api.service";
import { db } from "../db/local-db";
import {
  Plus, Search, Loader2, Users, Edit2, CheckCircle,
  AlertCircle, X, RefreshCw, Phone, Mail, MapPin, User, UserPlus, CreditCard,
  DollarSign, ShieldAlert, FileText, Clock, Tag, MessageCircle, Copy, Check,
  Flame, Sparkles, Send, Gift, Calendar, UserX, AlertTriangle, ArrowUpRight
} from "lucide-react";
import { getClienteReputacion } from "../utils/cliente-reputacion";

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
  limiteCredito?: number;
  creditoUtilizado?: number;
  creditoDisponible?: number;
  cupoDisponible?: number;
  score?: number;
  scoringCredito?: number;
  nivelCredito?: string;
  totalCompras?: number;
  comprasSinAtraso?: number;
  activo: boolean;
  createdAt?: string;
}

interface ClienteInactivo extends Cliente {
  diasSinComprar: number;
  ultimaCompraFecha: string;
  ultimoMonto: number;
  nuncaCompro: boolean;
  rangoInactividad: '30_A_60_DIAS' | '60_A_90_DIAS' | 'MAS_DE_90_DIAS';
}

interface PromocionCupon {
  id: string;
  codigo: string;
  titulo: string;
  descripcion?: string;
  tipoDescuento: 'PORCENTAJE' | 'MONTO_FIJO' | 'DESCUENTO_POR_PAR';
  valorDescuento: number;
  minimoPares: number;
  maximoCanjes: number;
  canjesUsados: number;
  aplicaPara?: 'AMBAS' | 'SOLO_CONTADO' | 'SOLO_CREDITO';
  fechaInicio: string;
  fechaFin?: string;
  activo: boolean;
  mensajePlantilla?: string;
}

const INPUT = "w-full px-3 py-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] transition-colors";

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
  if (nivel === "NIVEL_4") return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  if (nivel === "NIVEL_3") return "bg-purple-500/10 text-purple-700 border-purple-500/20";
  if (nivel === "NIVEL_2") return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  if (nivel === "NIVEL_1") return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  return "bg-rose-500/10 text-rose-500 border-rose-500/20";
}

function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-600";
  if (s >= 60) return "text-amber-600";
  if (s >= 40) return "text-orange-500";
  return "text-red-500";
}

export default function ClientesComponent({ online }: ClientesProps) {
  // Pestañas de Navegación
  const [vista, setVista] = useState<'DIRECTORIO' | 'INACTIVOS' | 'PROMOCIONES'>('DIRECTORIO');

  // Estado Directorio
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingLevel, setUpdatingLevel] = useState(false);

  // Estado Clientes Inactivos (Fase E2)
  const [inactivos, setInactivos] = useState<ClienteInactivo[]>([]);
  const [loadingInactivos, setLoadingInactivos] = useState(false);
  const [filtroRangoInactivo, setFiltroRangoInactivo] = useState<'TODOS' | '30_A_60_DIAS' | '60_A_90_DIAS' | 'MAS_DE_90_DIAS'>('TODOS');
  const [showModalWhatsApp, setShowModalWhatsApp] = useState(false);
  const [clienteWhatsApp, setClienteWhatsApp] = useState<ClienteInactivo | null>(null);
  const [mensajeWhatsAppCustom, setMensajeWhatsAppCustom] = useState('');
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<'ABANDONO' | 'DESCUENTO_6_PARES' | 'NUEVA_COLECCION'>('ABANDONO');

  // Estado Campañas y Cupones (Fase E2)
  const [promociones, setPromociones] = useState<PromocionCupon[]>([]);
  const [loadingPromociones, setLoadingPromociones] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [guardandoPromo, setGuardandoPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({
    codigo: '',
    titulo: '',
    descripcion: '',
    tipoDescuento: 'PORCENTAJE' as 'PORCENTAJE' | 'MONTO_FIJO' | 'DESCUENTO_POR_PAR',
    valorDescuento: '10',
    minimoPares: '6',
    maximoCanjes: '10', // Ej: primeras 10 personas
    aplicaPara: 'AMBAS' as 'AMBAS' | 'SOLO_CONTADO' | 'SOLO_CREDITO',
    fechaFin: '',
    mensajePlantilla: '',
  });
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Config del Negocio
  const [businessNombre, setBusinessNombre] = useState('NEXORA');

  // Campos del formulario cliente
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [tipoDoc, setTipoDoc] = useState<"CEDULA" | "RUC" | "PASAPORTE">("CEDULA");
  const [numDoc, setNumDoc] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [docErr, setDocErr] = useState("");

  useEffect(() => {
    loadClientes();
    loadBusinessInfo();
    if (vista === 'INACTIVOS') loadInactivos();
    if (vista === 'PROMOCIONES') loadPromociones();
  }, [online, vista]);

  const loadBusinessInfo = async () => {
    try {
      if (online) {
        const b = await ApiService.get('/configuracion/negocio');
        if (b && b.nombre) setBusinessNombre(b.nombre);
      }
    } catch {
      // fallback
    }
  };

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

  const loadInactivos = async () => {
    setLoadingInactivos(true);
    try {
      if (online) {
        const data = await ApiService.get("/clientes/inactivos?dias=30");
        setInactivos(Array.isArray(data) ? data : []);
      }
    } catch (e: any) {
      console.error("Error cargando clientes inactivos:", e);
    } finally {
      setLoadingInactivos(false);
    }
  };

  const loadPromociones = async () => {
    setLoadingPromociones(true);
    try {
      if (online) {
        const data = await ApiService.get("/clientes/promociones");
        setPromociones(Array.isArray(data) ? data : []);
      }
    } catch (e: any) {
      console.error("Error cargando promociones:", e);
    } finally {
      setLoadingPromociones(false);
    }
  };

  const resetForm = () => {
    setNombre(""); setApellido(""); setTelefono(""); setEmail("");
    setTipoDoc("CEDULA"); setNumDoc(""); setDireccion(""); setNotas("");
    setError(""); setDocErr("");
  };

  const openCreate = () => { resetForm(); setShowCreate(true); };
  const openEdit = (c: Cliente) => {
    setNombre(c.nombre || ""); setApellido(c.apellido || "");
    setTelefono(c.telefono || ""); setEmail(c.email || "");
    setDireccion(c.direccion || ""); setNotas(c.notas || "");
    
    if (c.ruc) {
      setTipoDoc("RUC");
      setNumDoc(c.ruc);
    } else if (c.cedula && c.cedula.length !== 10) {
      setTipoDoc("PASAPORTE");
      setNumDoc(c.cedula);
    } else {
      setTipoDoc("CEDULA");
      setNumDoc(c.cedula || "");
    }
    
    setError(""); setDocErr("");
    setShowEdit(true);
  };

  const validateForm = (): boolean => {
    let valid = true;
    if (!nombre || !apellido || !telefono) {
      setError("Nombre, Apellido y Teléfono son obligatorios.");
      return false;
    }
    if (numDoc) {
      if (tipoDoc === "CEDULA" && !validarCedula(numDoc)) {
        setDocErr("Cédula ecuatoriana inválida (debe tener 10 dígitos verificado).");
        valid = false;
      } else if (tipoDoc === "RUC" && !validarRuc(numDoc)) {
        setDocErr("RUC ecuatoriano inválido (13 dígitos, debe terminar en 001).");
        valid = false;
      } else {
        setDocErr("");
      }
    } else {
      setDocErr("");
    }
    return valid;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    setSaving(true);
    try {
      const cedulaVal = tipoDoc === "CEDULA" || tipoDoc === "PASAPORTE" ? (numDoc || undefined) : undefined;
      const rucVal = tipoDoc === "RUC" ? (numDoc || undefined) : undefined;

      if (online) {
        await ApiService.post("/clientes", {
          nombre, apellido, telefono,
          email: email || undefined, cedula: cedulaVal,
          ruc: rucVal, direccion: direccion || undefined, notas: notas || undefined,
        });
      } else {
        await db.clientes.add({
          id: `offline-${Date.now()}`,
          nombre: `${nombre} ${apellido}`.trim(),
          cedula: numDoc || "S/N",
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
      const cedulaVal = tipoDoc === "CEDULA" || tipoDoc === "PASAPORTE" ? (numDoc || undefined) : undefined;
      const rucVal = tipoDoc === "RUC" ? (numDoc || undefined) : undefined;

      await ApiService.patch(`/clientes/${selected.id}`, {
        nombre, apellido, telefono,
        email: email || undefined, cedula: cedulaVal,
        ruc: rucVal, direccion: direccion || undefined, notas: notas || undefined,
      });
      setSuccess("Cliente actualizado correctamente.");
      setShowEdit(false); setSelected(null); resetForm(); loadClientes();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar el cliente.");
    } finally { setSaving(false); }
  };

  const handleAjustarNivel = async (clienteId: string, nuevoNivel: string) => {
    try {
      setUpdatingLevel(true);
      setError("");
      await ApiService.post(`/clientes/${clienteId}/ajustar-nivel`, { nuevoNivel });
      setSuccess(`Línea de crédito actualizada a: ${nuevoNivel === "SIN_CREDITO" ? "Sin Crédito (Bloqueado)" : nuevoNivel.replace("_", " ")}`);
      const updatedData = await ApiService.get("/clientes");
      if (Array.isArray(updatedData)) {
        setClientes(updatedData);
        const updatedObj = updatedData.find((c: Cliente) => c.id === clienteId);
        if (updatedObj) setSelected(updatedObj);
      }
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar la línea de crédito");
    } finally {
      setUpdatingLevel(false);
    }
  };

  // ── Generador de Mensajes de WhatsApp para Inactivos (Enfoque Mayorista) ──
  const abrirModalReactivacion = (cliente: ClienteInactivo) => {
    setClienteWhatsApp(cliente);
    const nombreCliente = `${cliente.nombre || ''}`.trim() || 'Estimado/a';
    
    // Plantilla Mayorista por defecto (persuasiva para reactivar compras al por mayor)
    const msgDefault = `¡Hola ${nombreCliente}! 👋 Te saludamos desde ${businessNombre}. Hace tiempito no renovamos el stock de tu negocio y queremos que sigas generando excelentes márgenes de ganancia 📈.\n\nNos acaba de salir una producción exclusiva de calzado en cuero 100% garantizado con altísima rotación comercial. En pedidos a partir de media docena (6 pares) o docenas completas, te activamos precio mayorista directo de fábrica + prioridad de despacho con Transporte Los Andes 🚚📦.\n\n¿Te comparto el catálogo mayorista con los modelos más pedidos para apartar tu lote antes de que se agote la producción semanal? 👞✨`;
    
    setMensajeWhatsAppCustom(msgDefault);
    setPlantillaSeleccionada('ABANDONO');
    setShowModalWhatsApp(true);
  };

  const aplicarPlantilla = (tipo: 'ABANDONO' | 'DESCUENTO_6_PARES' | 'NUEVA_COLECCION') => {
    if (!clienteWhatsApp) return;
    setPlantillaSeleccionada(tipo);
    const nombreCliente = `${clienteWhatsApp.nombre || ''}`.trim() || 'Estimado/a';

    if (tipo === 'ABANDONO') {
      setMensajeWhatsAppCustom(`¡Hola ${nombreCliente}! 👋 Te saludamos desde ${businessNombre}. Hace tiempito no renovamos el stock de tu negocio y queremos que sigas generando excelentes márgenes de ganancia 📈.\n\nNos acaba de salir una producción exclusiva de calzado en cuero 100% garantizado con altísima rotación comercial. En pedidos a partir de media docena (6 pares) o docenas completas, te activamos precio mayorista directo de fábrica + prioridad de despacho con Transporte Los Andes 🚚📦.\n\n¿Te comparto el catálogo mayorista con los modelos más pedidos para apartar tu lote antes de que se agote la producción semanal? 👞✨`);
    } else if (tipo === 'DESCUENTO_6_PARES') {
      setMensajeWhatsAppCustom(`Estimado/a ${nombreCliente}, ¡un gusto saludarte desde ${businessNombre}! 👞🔥 Los locales comerciales están teniendo gran salida con nuestra nueva línea de calzado de cuero para esta temporada.\n\nPara respaldar tu inventario, en tu próximo pedido por curvas o bultos (desde 6 pares) te garantizamos precio especial de fabricante y facilidades en tu compra 💼.\n\n¿Qué numeraciones y modelos necesitas para abastecer tu vitrina esta semana? ¡Escríbenos para enviarte el catálogo digital! 📲`);
    } else {
      setMensajeWhatsAppCustom(`¡Hola ${nombreCliente}! ⚡ Solo por esta semana en ${businessNombre} abrimos cupos de producción con descuento especial por volumen a partir de 6 pares para nuestros clientes aliados.\n\nAprovecha precios directos de fábrica antes del reajuste de temporada 💸. ¡Asegura tu pedido antes de que se complete el despacho semanal!\n\n¿Revisamos tu pedido hoy mismo? 🚚💨`);
    }
  };

  const enviarWhatsAppInactivo = () => {
    if (!clienteWhatsApp || !clienteWhatsApp.telefono) return;
    let tel = clienteWhatsApp.telefono.replace(/[^0-9]/g, '');
    if (tel.startsWith('0')) {
      tel = `593${tel.substring(1)}`;
    } else if (!tel.startsWith('593')) {
      tel = `593${tel}`;
    }
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensajeWhatsAppCustom)}`;
    window.open(url, '_blank');
    setShowModalWhatsApp(false);
  };

  // ── Gestión de Campañas Promocionales & Cupones ──
  const handleCrearPromocion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.codigo.trim() || !promoForm.titulo.trim()) {
      setError("Código y Título de la promoción son obligatorios.");
      return;
    }
    setGuardandoPromo(true);
    try {
      await ApiService.post("/clientes/promociones", {
        codigo: promoForm.codigo.toUpperCase().trim(),
        titulo: promoForm.titulo.trim(),
        descripcion: promoForm.descripcion.trim() || undefined,
        tipoDescuento: promoForm.tipoDescuento,
        valorDescuento: parseFloat(promoForm.valorDescuento) || 10,
        minimoPares: parseInt(promoForm.minimoPares, 10) || 6,
        maximoCanjes: parseInt(promoForm.maximoCanjes, 10) || 10,
        aplicaPara: promoForm.aplicaPara,
        fechaFin: promoForm.fechaFin || undefined,
        mensajePlantilla: promoForm.mensajePlantilla.trim() || undefined,
      });
      setSuccess(`¡Campaña "${promoForm.codigo.toUpperCase().trim()}" creada con éxito!`);
      setShowPromoModal(false);
      setPromoForm({
        codigo: '',
        titulo: '',
        descripcion: '',
        tipoDescuento: 'PORCENTAJE',
        valorDescuento: '10',
        minimoPares: '6',
        maximoCanjes: '10',
        aplicaPara: 'AMBAS',
        fechaFin: '',
        mensajePlantilla: '',
      });
      await loadPromociones();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al crear la promoción.");
    } finally {
      setGuardandoPromo(false);
    }
  };

  const handleEliminarPromocion = async (id: string) => {
    if (!confirm("¿Deseas desactivar esta campaña promocional?")) return;
    try {
      await ApiService.delete(`/clientes/promociones/${id}`);
      setSuccess("Promoción eliminada correctamente.");
      await loadPromociones();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Error al eliminar la promoción.");
    }
  };

  const copiarMensajeDifusion = (promo: PromocionCupon) => {
    const textoDescuento = promo.tipoDescuento === 'PORCENTAJE'
      ? `${Number(promo.valorDescuento)}% de descuento directo`
      : promo.tipoDescuento === 'DESCUENTO_POR_PAR'
      ? `$${Number(promo.valorDescuento).toFixed(2)} de descuento por cada par`
      : `$${Number(promo.valorDescuento).toFixed(2)} de descuento en tu compra`;

    const texto = promo.mensajePlantilla || `🏭 ¡PROMOCIÓN MAYORISTA EXCLUSIVA EN ${businessNombre.toUpperCase()}! 🏭\n\nEstimados clientes y distribuidores, activamos el código promocional: *${promo.codigo}*.\n\nRecibe ${textoDescuento} en pedidos al por mayor a partir de ${promo.minimoPares} pares de calzado de cuero legítimo 👞💸.\n\n⚡ ¡Válido únicamente para los primeros ${promo.maximoCanjes} comerciantes en confirmar su pedido! (Quedan ${promo.maximoCanjes - promo.canjesUsados} cupos disponibles con despacho prioritario por Transporte Los Andes 🚚📦).\n\n📲 ¡Responde este mensaje con tu pedido y el código antes de que se completen los cupos de producción!`;

    navigator.clipboard.writeText(texto);
    setCopiadoId(promo.id);
    setTimeout(() => setCopiadoId(null), 3000);
  };

  // Filtrado Directorio
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

  // Filtrado Inactivos
  const inactivosFiltrados = inactivos.filter(c => {
    if (filtroRangoInactivo === 'TODOS') return true;
    return c.rangoInactividad === filtroRangoInactivo;
  });

  return (
    <div className="space-y-5">
      {/* ── Header & Pestañas CRM ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-xl tracking-tight text-[var(--foreground)] flex items-center gap-2">
            <span>Gestión de Clientes & CRM</span>
            {inactivos.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-xs font-bold flex items-center gap-1">
                <Clock size={11} /> {inactivos.length} inactivos
              </span>
            )}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Directorio de contactos, scoring crediticio, fidelización de clientes inactivos y promociones
          </p>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl w-fit">
          <button
            onClick={() => setVista('DIRECTORIO')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              vista === 'DIRECTORIO'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Users size={14} />
            <span>Directorio ({clientes.length})</span>
          </button>

          <button
            onClick={() => setVista('INACTIVOS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
              vista === 'INACTIVOS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-[var(--muted-foreground)] hover:text-amber-600'
            }`}
          >
            <Clock size={14} />
            <span>Fidelización Inactivos</span>
            {inactivos.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                vista === 'INACTIVOS' ? 'bg-white text-amber-900' : 'bg-amber-500/20 text-amber-600'
              }`}>
                {inactivos.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setVista('PROMOCIONES')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              vista === 'PROMOCIONES'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-[var(--muted-foreground)] hover:text-purple-600'
            }`}
          >
            <Gift size={14} />
            <span>Campañas & Cupones</span>
            {promociones.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                vista === 'PROMOCIONES' ? 'bg-white text-purple-900' : 'bg-purple-500/20 text-purple-600'
              }`}>
                {promociones.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* VISTA 1: DIRECTORIO DE CLIENTES & SCORING                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {vista === 'DIRECTORIO' && (
        <div className="flex gap-6 h-full animate-in fade-in duration-150">
          {/* Lista de clientes */}
          <div className="flex-1 space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, cédula, RUC, teléfono o email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] transition-colors"
                />
              </div>
              <button
                onClick={loadClientes}
                className="p-2.5 border border-[var(--border)] rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors shrink-0"
                title="Actualizar listado"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
              >
                <Plus size={16} /><span>Nuevo Cliente</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVista('PROMOCIONES');
                  setShowPromoModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
              >
                <Gift size={16} /><span>+ Nueva Promoción / Cupón</span>
              </button>
            </div>

            {/* Tabla Directorio */}
            {loading ? (
              <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)]">
                <Loader2 className="animate-spin text-[#0F172A] mb-3" size={36} />
                <span className="text-sm">Cargando clientes...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 bg-[var(--card)] border border-[var(--border)] border-dashed rounded-2xl text-[var(--muted-foreground)]">
                <Users size={48} className="mb-4 opacity-30" />
                <p className="font-semibold">Sin clientes registrados</p>
                <p className="text-xs mt-1">Haz clic en "Nuevo Cliente" para registrar el primero.</p>
              </div>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Cliente</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider hidden md:table-cell">Cédula / RUC</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Contacto</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Score</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Nivel</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Reputación</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filtered.map(c => {
                      const rep = getClienteReputacion(c);

                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelected(c)}
                          className={`hover:bg-[var(--muted)]/20 cursor-pointer transition-colors ${selected?.id === c.id ? "bg-[#0F172A]/5" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#0F172A]/10 text-[#0F172A] flex items-center justify-center text-xs font-bold shrink-0">
                                {(c.nombre || "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-sm">{c.nombre} {c.apellido || ""}</div>
                                {c.direccion && <div className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[160px]">{c.direccion}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs font-mono text-[var(--muted-foreground)]">{c.cedula || c.ruc || "—"}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="text-xs font-semibold text-[var(--foreground)]">{c.telefono || "—"}</div>
                            {c.email && <div className="text-[10px] text-[var(--muted-foreground)]">{c.email}</div>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-sm ${scoreColor(Number(c.score ?? c.scoringCredito ?? 100))}`}>{Number(c.score ?? c.scoringCredito ?? 100)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${nivelColor(c.nivelCredito || "SIN_CREDITO")}`}>
                              {(c.nivelCredito || "SIN_CREDITO").replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] border ${rep.badgeClass}`} title={rep.descripcion}>
                              <span>{rep.icon}</span>
                              <span>{rep.label}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={e => { e.stopPropagation(); setSelected(c); openEdit(c); }}
                              className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[#0F172A] hover:bg-[#0F172A]/10 transition-colors"
                              title="Editar cliente"
                            >
                              <Edit2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                  {filtered.length} cliente{filtered.length !== 1 ? "s" : ""} {search ? "encontrado" : "en total"}{search ? `s para "${search}"` : ""}
                </div>
              </div>
            )}
          </div>

          {/* Panel Lateral de Detalle */}
          <div className="w-72 shrink-0 hidden xl:block">
            {selected ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-5 sticky top-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0F172A]/10 text-[#0F172A] flex items-center justify-center text-lg font-black">
                    {(selected.nombre || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{selected.nombre} {selected.apellido || ""}</div>
                    <div className={`text-[10px] px-2 py-0.5 rounded-lg border inline-block mt-0.5 font-semibold ${nivelColor(selected.nivelCredito || "SIN_CREDITO")}`}>
                      {selected.nivelCredito?.replace("_", " ")}
                    </div>
                  </div>
                </div>

                {/* Insignia de Perfil y Reputación */}
                {(() => {
                  const rep = getClienteReputacion(selected);
                  return (
                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${rep.badgeClass}`}>
                      <span className="text-xl shrink-0 mt-0.5">{rep.icon}</span>
                      <div>
                        <div className="text-xs font-black">{rep.label}</div>
                        <div className="text-[10px] opacity-90 mt-0.5 leading-tight">{rep.descripcion}</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
                  {selected.telefono && <div className="flex items-center gap-2"><Phone size={13} />{selected.telefono}</div>}
                  {selected.email && <div className="flex items-center gap-2"><Mail size={13} />{selected.email}</div>}
                  {selected.cedula && <div className="flex items-center gap-2"><User size={13} />C.I: {selected.cedula}</div>}
                  {selected.ruc && <div className="flex items-center gap-2"><FileText size={13} />RUC: {selected.ruc}</div>}
                  {selected.direccion && <div className="flex items-center gap-2"><MapPin size={13} />{selected.direccion}</div>}
                </div>

                {(() => {
                  const limite = Number(selected.limiteCredito ?? 0);
                  const utilizado = Number(selected.creditoUtilizado ?? 0);
                  const disponible = Number(selected.creditoDisponible ?? selected.cupoDisponible ?? Math.max(0, limite - utilizado));
                  const scoreVal = Number(selected.score ?? selected.scoringCredito ?? 100);

                  return (
                    <>
                      <div className="p-3 bg-[var(--muted)]/30 rounded-xl border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--muted-foreground)] font-semibold uppercase tracking-wider">Score Crediticio</div>
                        <div className={`text-2xl font-black mt-1 ${scoreColor(scoreVal)}`}>{scoreVal}<span className="text-xs text-[var(--muted-foreground)] ml-1">/ 100</span></div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--muted-foreground)] flex items-center gap-1.5"><DollarSign size={13} />Cupo Disponible</span>
                          <span className="font-bold text-emerald-600">${disponible.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--muted-foreground)] flex items-center gap-1.5"><ShieldAlert size={13} />Límite de Crédito</span>
                          <span className="font-bold">${limite.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {selected.notas && (
                  <div className="p-3 bg-[var(--muted)]/20 rounded-xl text-xs text-[var(--muted-foreground)] border border-[var(--border)]">
                    <span className="font-semibold block mb-1">Notas:</span>{selected.notas}
                  </div>
                )}

                {/* Control Administrativo de Crédito */}
                <div className="p-3.5 bg-[var(--muted)]/20 rounded-2xl border border-[var(--border)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                      <CreditCard size={13} /> Autorización de Crédito
                    </span>
                    {updatingLevel && <Loader2 size={12} className="animate-spin text-[#0F172A]" />}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={updatingLevel}
                      onClick={() => handleAjustarNivel(selected.id, "SIN_CREDITO")}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                        selected.nivelCredito === "SIN_CREDITO"
                          ? "bg-red-500 text-white border-red-500 shadow-sm"
                          : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-red-500/10 hover:text-red-500"
                      }`}
                    >
                      Sin Crédito
                    </button>

                    <button
                      type="button"
                      disabled={updatingLevel}
                      onClick={() => handleAjustarNivel(selected.id, "NIVEL_1")}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                        selected.nivelCredito === "NIVEL_1"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-blue-500/10 hover:text-blue-600"
                      }`}
                    >
                      Nivel 1
                    </button>

                    <button
                      type="button"
                      disabled={updatingLevel}
                      onClick={() => handleAjustarNivel(selected.id, "NIVEL_2")}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                        selected.nivelCredito === "NIVEL_2"
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-amber-500/10 hover:text-amber-600"
                      }`}
                    >
                      Nivel 2
                    </button>

                    <button
                      type="button"
                      disabled={updatingLevel}
                      onClick={() => handleAjustarNivel(selected.id, "NIVEL_3")}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                        selected.nivelCredito === "NIVEL_3"
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-purple-500/10 hover:text-purple-600"
                      }`}
                    >
                      Nivel 3
                    </button>

                    <button
                      type="button"
                      disabled={updatingLevel}
                      onClick={() => handleAjustarNivel(selected.id, "NIVEL_4")}
                      className={`col-span-2 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                        selected.nivelCredito === "NIVEL_4"
                          ? "bg-yellow-600 text-white border-yellow-600 shadow-sm"
                          : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-yellow-500/10 hover:text-yellow-600"
                      }`}
                    >
                      Nivel 4 (Oro / VIP)
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => { setSelected(selected); openEdit(selected); }}
                  className="w-full py-2.5 flex items-center justify-center gap-2 border border-[#0F172A] text-[#0F172A] rounded-xl text-xs font-semibold hover:bg-[#0F172A]/10 transition-colors cursor-pointer"
                >
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* VISTA 2: CRM DE FIDELIZACIÓN & CLIENTES INACTIVOS (> 30 DÍAS) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {vista === 'INACTIVOS' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Tarjetas KPI de Inactividad */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] font-bold mb-1">
                <span>Total Inactivos</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600">
                {inactivos.length} <span className="text-xs font-normal text-[var(--muted-foreground)]">clientes</span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Más de 30 días sin comprar</p>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-amber-600 font-bold mb-1">
                <span>Inactividad Leve (30-60d)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              </div>
              <div className="text-2xl font-black text-[var(--foreground)]">
                {inactivos.filter(c => c.rangoInactividad === '30_A_60_DIAS').length}
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Fácil de recuperar con oferta</p>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-orange-600 font-bold mb-1">
                <span>Inactividad Media (60-90d)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              </div>
              <div className="text-2xl font-black text-[var(--foreground)]">
                {inactivos.filter(c => c.rangoInactividad === '60_A_90_DIAS').length}
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Requiere incentivo o descuento</p>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-red-600 font-bold mb-1">
                <span>Inactividad Crítica (+90d)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              </div>
              <div className="text-2xl font-black text-red-500">
                {inactivos.filter(c => c.rangoInactividad === 'MAS_DE_90_DIAS').length}
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Riesgo alto de fuga de cliente</p>
            </div>
          </div>

          {/* Barra de Filtros de Inactividad */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5 mr-2">
                <Clock size={14} className="text-amber-500" /> Filtrar por Tiempo:
              </span>
              {(['TODOS', '30_A_60_DIAS', '60_A_90_DIAS', 'MAS_DE_90_DIAS'] as const).map((rango) => {
                const label = rango === 'TODOS' ? 'Todos los Inactivos' : rango === '30_A_60_DIAS' ? '30 a 60 días' : rango === '60_A_90_DIAS' ? '60 a 90 días' : 'Más de 90 días';
                const active = filtroRangoInactivo === rango;
                return (
                  <button
                    key={rango}
                    onClick={() => setFiltroRangoInactivo(rango)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-xs'
                        : 'bg-[var(--muted)]/40 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={loadInactivos}
              className="px-3 py-1.5 border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={13} />
              <span>Actualizar Diagnóstico</span>
            </button>
          </div>

          {/* Tabla de Inactivos */}
          {loadingInactivos ? (
            <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <Loader2 className="animate-spin text-amber-500 mb-3" size={36} />
              <span className="text-xs font-bold">Calculando días de inactividad de clientes...</span>
            </div>
          ) : inactivosFiltrados.length === 0 ? (
            <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2">
              <Sparkles size={40} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-[var(--foreground)]">¡Excelente! No hay clientes en este rango de inactividad</p>
              <p className="text-xs">Tus clientes están realizando compras de forma periódica y frecuente.</p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--muted)]/40 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-5 py-4">Cliente Deudor / Contacto</th>
                      <th className="px-5 py-4 text-center">Tiempo sin Compras</th>
                      <th className="px-5 py-4">Última Compra Registrada</th>
                      <th className="px-5 py-4 text-center">Nivel / Reputación</th>
                      <th className="px-5 py-4 text-right">Acción de Reactivación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {inactivosFiltrados.map((c) => {
                      const rep = getClienteReputacion(c);
                      const badgeColor = c.diasSinComprar > 90
                        ? 'bg-red-500/10 text-red-600 border-red-500/20'
                        : c.diasSinComprar > 60
                        ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                        : 'bg-amber-500/10 text-amber-700 border-amber-500/20';

                      return (
                        <tr key={c.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-extrabold text-xs text-[var(--foreground)]">
                              {c.nombre} {c.apellido || ''}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)] mt-0.5">
                              {c.telefono ? (
                                <span className="flex items-center gap-1 font-mono text-emerald-600 font-semibold">
                                  <Phone size={11} /> {c.telefono}
                                </span>
                              ) : (
                                <span className="text-slate-400">Sin teléfono</span>
                              )}
                              {c.cedula && <span>· C.I: {c.cedula}</span>}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg border text-xs font-black inline-flex items-center gap-1 ${badgeColor}`}>
                              <Clock size={12} />
                              <span>{c.diasSinComprar} días</span>
                            </span>
                            <span className="text-[10px] text-[var(--muted-foreground)] block mt-0.5">
                              {c.diasSinComprar > 60 ? `(~${Math.floor(c.diasSinComprar / 30)} meses)` : '(1 mes+)'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-[var(--muted-foreground)]">
                            {c.nuncaCompro ? (
                              <span className="text-slate-400 italic">Registrado el {new Date(c.ultimaCompraFecha).toLocaleDateString('es-EC')} (Sin compras)</span>
                            ) : (
                              <div>
                                <span className="font-bold text-[var(--foreground)] block">
                                  {new Date(c.ultimaCompraFecha).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                                {c.ultimoMonto > 0 && (
                                  <span className="text-[10px] text-emerald-600 font-mono font-bold">
                                    Monto: ${c.ultimoMonto.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${nivelColor(c.nivelCredito || "SIN_CREDITO")}`}>
                                {(c.nivelCredito || "SIN_CREDITO").replace("_", " ")}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9px] border ${rep.badgeClass}`}>
                                {rep.label}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => abrirModalReactivacion(c)}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <MessageCircle size={14} />
                              <span>Reactivar por WhatsApp</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* VISTA 3: CAMPAÑAS PROMOCIONALES & CUPONES LIMITADOS            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {vista === 'PROMOCIONES' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Header de Promociones */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
            <div>
              <h3 className="font-black text-sm text-[var(--foreground)] flex items-center gap-2">
                <Gift size={16} className="text-purple-600" />
                <span>Campañas Masivas de Descuento con Cupo Limitado</span>
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Crea códigos de validación limitados a N personas (ej. 10 compradores) y genera mensajes para difusión de WhatsApp.
              </p>
            </div>
            <button
              onClick={() => setShowPromoModal(true)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Plus size={15} />
              <span>Crear Nueva Campaña / Cupón</span>
            </button>
          </div>

          {/* Grid de Promociones */}
          {loadingPromociones ? (
            <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <Loader2 className="animate-spin text-purple-600 mb-3" size={36} />
              <span className="text-xs font-bold">Cargando campañas promocionales...</span>
            </div>
          ) : promociones.length === 0 ? (
            <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] border-dashed rounded-2xl space-y-3">
              <Gift size={44} className="mx-auto text-purple-400 opacity-60 mb-1" />
              <p className="font-bold text-sm text-[var(--foreground)]">No hay campañas promocionales activas</p>
              <p className="text-xs max-w-md mx-auto">
                Crea promociones con códigos de validación para las primeras 10 personas y envía mensajes masivos a tus clientes de calzado.
              </p>
              <button
                onClick={() => setShowPromoModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Crear Primera Promoción
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promociones.map((p) => {
                const cuposLibres = p.maximoCanjes - p.canjesUsados;
                const porcentajeUso = Math.round((p.canjesUsados / p.maximoCanjes) * 100);
                const estaAgotado = cuposLibres <= 0;

                const textoDescuento = p.tipoDescuento === 'PORCENTAJE'
                  ? `${Number(p.valorDescuento)}% OFF`
                  : p.tipoDescuento === 'DESCUENTO_POR_PAR'
                  ? `$${Number(p.valorDescuento).toFixed(2)} / par`
                  : `$${Number(p.valorDescuento).toFixed(2)} OFF`;

                return (
                  <div
                    key={p.id}
                    className={`bg-[var(--card)] border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all ${
                      estaAgotado ? 'border-slate-300 opacity-75' : 'border-purple-500/30 hover:border-purple-500'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Badge y Código */}
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-mono font-black tracking-wider shadow-xs">
                          {p.codigo}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-md text-[11px] font-extrabold">
                          {textoDescuento}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm text-[var(--foreground)]">{p.titulo}</h4>
                        {p.descripcion && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{p.descripcion}</p>
                        )}
                      </div>

                      {/* Reglas de la promoción */}
                      <div className="p-3 bg-[var(--muted)]/30 rounded-xl space-y-1.5 text-xs text-[var(--muted-foreground)]">
                        <div className="flex justify-between">
                          <span>Mínimo requerido:</span>
                          <strong className="text-[var(--foreground)]">{p.minimoPares} pares de calzado</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Condición de Pago:</span>
                          <strong className="text-purple-700">
                            {p.aplicaPara === 'SOLO_CONTADO' 
                              ? '💵 Solo Contado' 
                              : p.aplicaPara === 'SOLO_CREDITO'
                              ? '💳 Solo Crédito'
                              : '🟢 Contado y Crédito'}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Cupo total:</span>
                          <strong className="text-[var(--foreground)]">Primeras {p.maximoCanjes} personas</strong>
                        </div>
                        {p.fechaFin && (
                          <div className="flex justify-between">
                            <span>Vence:</span>
                            <strong className="text-purple-700">{new Date(p.fechaFin).toLocaleDateString('es-EC')}</strong>
                          </div>
                        )}
                      </div>

                      {/* Barra de Progreso de Canjes */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className={estaAgotado ? 'text-red-500 font-black' : 'text-purple-700'}>
                            {estaAgotado ? '🚫 Cupos Agotados' : `🎯 Quedan ${cuposLibres} cupos disponibles`}
                          </span>
                          <span className="text-[var(--muted-foreground)] font-mono">
                            {p.canjesUsados}/{p.maximoCanjes}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              estaAgotado ? 'bg-red-500' : 'bg-gradient-to-r from-purple-600 to-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, porcentajeUso)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="pt-4 border-t border-[var(--border)] mt-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => copiarMensajeDifusion(p)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          copiadoId === p.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#0F172A] hover:bg-slate-800 text-white'
                        }`}
                      >
                        {copiadoId === p.id ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiadoId === p.id ? '¡Mensaje Copiado!' : 'Copiar Difusión WhatsApp'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEliminarPromocion(p.id)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                        title="Eliminar campaña"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: REACTIVACIÓN DE CLIENTE INACTIVO POR WHATSAPP           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showModalWhatsApp && clienteWhatsApp && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Reactivación por WhatsApp</h3>
                  <p className="text-[11px] text-slate-300">Cliente inactivo: {clienteWhatsApp.nombre} {clienteWhatsApp.apellido || ''}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModalWhatsApp(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Info de inactividad */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Clock size={13} /> Tiempo sin comprar: <strong>{clienteWhatsApp.diasSinComprar} días</strong>
                </span>
                <span className="font-mono text-emerald-600 font-bold">
                  Tel: {clienteWhatsApp.telefono || 'Sin número'}
                </span>
              </div>

              {/* Selector de Plantilla */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">Seleccionar Enfoque Comercial (Venta al por Mayor):</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarPlantilla('ABANDONO')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col gap-0.5 ${
                      plantillaSeleccionada === 'ABANDONO'
                        ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                        : 'bg-[var(--muted)]/30 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <span>📈 Lote Mayorista & Fidelidad</span>
                    <span className="text-[10px] font-normal opacity-80">Reactivar stock por docenas / 6 pares</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => aplicarPlantilla('DESCUENTO_6_PARES')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col gap-0.5 ${
                      plantillaSeleccionada === 'DESCUENTO_6_PARES'
                        ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                        : 'bg-[var(--muted)]/30 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <span>🔥 Curvas & Alta Rotación</span>
                    <span className="text-[10px] font-normal opacity-80">Margen superior para revender</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => aplicarPlantilla('NUEVA_COLECCION')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col gap-0.5 ${
                      plantillaSeleccionada === 'NUEVA_COLECCION'
                        ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                        : 'bg-[var(--muted)]/30 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <span>⚡ Cupos Limitados de Fábrica</span>
                    <span className="text-[10px] font-normal opacity-80">Descuento por volumen antes de reajuste</span>
                  </button>
                </div>
              </div>

              {/* Editor del Mensaje */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Texto del Mensaje a Enviar (Personalizable):
                </label>
                <textarea
                  rows={4}
                  value={mensajeWhatsAppCustom}
                  onChange={(e) => setMensajeWhatsAppCustom(e.target.value)}
                  className="w-full p-3 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600 resize-none leading-relaxed"
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowModalWhatsApp(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={enviarWhatsAppInactivo}
                  disabled={!clienteWhatsApp.telefono}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Abrir Chat de WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREAR NUEVA CAMPAÑA PROMOCIONAL / CUPÓN                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Gift size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Crear Campaña con Cupo Limitado</h3>
                  <p className="text-[10px] text-slate-300">Genera cupones exclusivos para listas de difusión</p>
                </div>
              </div>
              <button
                onClick={() => setShowPromoModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCrearPromocion} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    Código de Validación *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: NEXORA10, CUERO2026..."
                    value={promoForm.codigo}
                    onChange={(e) => setPromoForm({ ...promoForm, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-mono font-black focus:outline-none focus:border-purple-600 uppercase"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    Límite de Personas (Cupos) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="10"
                    value={promoForm.maximoCanjes}
                    onChange={(e) => setPromoForm({ ...promoForm, maximoCanjes: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Título de la Campaña *</label>
                <input
                  type="text"
                  placeholder="Ej: Descuento 10% por inauguración de temporada escolar"
                  value={promoForm.titulo}
                  onChange={(e) => setPromoForm({ ...promoForm, titulo: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-600"
                  required
                />
              </div>

              {/* Tipo de Descuento y Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Modalidad de Descuento</label>
                  <select
                    value={promoForm.tipoDescuento}
                    onChange={(e) => setPromoForm({ ...promoForm, tipoDescuento: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-600"
                  >
                    <option value="PORCENTAJE">Porcentaje (% de la venta)</option>
                    <option value="DESCUENTO_POR_PAR">Descuento por Par ($/par)</option>
                    <option value="MONTO_FIJO">Monto Fijo ($ directo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    Valor del Descuento ({promoForm.tipoDescuento === 'PORCENTAJE' ? '%' : '$'}) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={promoForm.valorDescuento}
                    onChange={(e) => setPromoForm({ ...promoForm, valorDescuento: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>
              </div>

              {/* Mínimo de pares y Fecha de Expiración */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Mínimo de Pares Requeridos</label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.minimoPares}
                    onChange={(e) => setPromoForm({ ...promoForm, minimoPares: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Fecha de Expiración (Opcional)</label>
                  <input
                    type="date"
                    value={promoForm.fechaFin}
                    onChange={(e) => setPromoForm({ ...promoForm, fechaFin: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Condición de Pago Permitida */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Condición de Pago Permitida *
                </label>
                <select
                  value={promoForm.aplicaPara}
                  onChange={(e) => setPromoForm({ ...promoForm, aplicaPara: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-600"
                >
                  <option value="AMBAS">🟢 Contado y Crédito (Ambas Modalidades)</option>
                  <option value="SOLO_CONTADO">💵 Exclusivo para Pagos de Contado (Efectivo / Transferencia)</option>
                  <option value="SOLO_CREDITO">💳 Exclusivo para Compras a Crédito</option>
                </select>
                <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5 block">
                  {promoForm.aplicaPara === 'SOLO_CONTADO' 
                    ? '💡 Incentiva la liquidez inmediata impidiendo que se aplique en ventas a crédito.'
                    : promoForm.aplicaPara === 'SOLO_CREDITO'
                    ? '💡 Exclusivo para clientes que compran por líneas de crédito autorizadas.'
                    : '💡 Aplica para cualquier cliente independientemente de si paga al contado o a crédito.'}
                </span>
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[11px] text-purple-900 dark:text-purple-300">
                💡 El sistema llevará el control estricto de canjes. Cuando {promoForm.maximoCanjes} clientes utilicen este código, la promoción se desactivará automáticamente.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPromo}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {guardandoPromo ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Crear Campaña</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL CREAR / EDITAR CLIENTE                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {(showCreate || (showEdit && selected)) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">{showCreate ? "Registrar Cliente" : "Editar Cliente"}</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Gestión de datos de facturación, contacto y crédito</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreate(false); setShowEdit(false); resetForm(); }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={showCreate ? handleCreate : handleEdit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div><Lbl t="Nombre" req /><input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Juan" className={INPUT} /></div>
                <div><Lbl t="Apellido" req /><input type="text" required value={apellido} onChange={e => setApellido(e.target.value)} placeholder="Ej. Pérez" className={INPUT} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Lbl t="Teléfono" req /><input type="tel" required value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej. 0991234567" className={INPUT} /></div>
                <div><Lbl t="Email" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ej. juan@correo.com" className={INPUT} /></div>
              </div>
              <div className="space-y-2">
                <Lbl t="Tipo de Documento de Identificación" />
                <div className="grid grid-cols-3 gap-2">
                  {(["CEDULA", "RUC", "PASAPORTE"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTipoDoc(t); setDocErr(""); }}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        tipoDoc === t
                          ? "bg-[#0F172A] text-white border-[#0F172A] shadow-sm"
                          : "bg-[var(--muted)]/40 text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]"
                      }`}
                    >
                      {t === "CEDULA" ? "Cédula" : t === "RUC" ? "RUC" : "Pasaporte / Extranjero"}
                    </button>
                  ))}
                </div>
                <div>
                  <input
                    type="text"
                    maxLength={tipoDoc === "CEDULA" ? 10 : tipoDoc === "RUC" ? 13 : 20}
                    value={numDoc}
                    onChange={(e) => { setNumDoc(e.target.value); if (docErr) setDocErr(""); }}
                    placeholder={
                      tipoDoc === "CEDULA"
                        ? "Ingrese los 10 dígitos de la Cédula"
                        : tipoDoc === "RUC"
                        ? "Ingrese los 13 dígitos del RUC (ej. 1801234567001)"
                        : "Ingrese número de pasaporte o ID extranjero"
                    }
                    className={`${INPUT} ${docErr ? "border-red-400" : ""}`}
                  />
                  {docErr && <p className="text-[10px] text-red-400 mt-1">{docErr}</p>}
                </div>
              </div>
              <div><Lbl t="Dirección" /><input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Ej. Av. Principal 123, Guayaquil" className={INPUT} /></div>
              <div><Lbl t="Notas" /><textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones del cliente..." className={`${INPUT} resize-none`} /></div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" />Guardando...</> : <><CheckCircle size={16} />{showCreate ? "Registrar Cliente" : "Guardar Cambios"}</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
