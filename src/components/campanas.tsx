'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tag,
  Gift,
  Plus,
  Search,
  Calendar,
  Users,
  CheckCircle,
  X,
  AlertTriangle,
  Copy,
  MessageCircle,
  Check,
  Loader2,
  TrendingUp,
  Clock,
  Filter,
  Layers,
  Power,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { ApiService } from '../services/api.service';
import { useToast } from './ui/toast';
import { abrirWhatsAppUniversal } from '../utils/whatsapp';

export interface PromocionCupon {
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
  createdAt?: string;
}

interface ClienteDirectorio {
  id: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  score?: number;
  nivelCredito?: string;
}

interface CampanasProps {
  online?: boolean;
  activeSucursalId?: string;
  sucursales?: any[];
}

export default function CampanasComponent({ online = true, activeSucursalId, sucursales }: CampanasProps) {
  const { showToast } = useToast();

  // Estados principales
  const [campanas, setCampanas] = useState<PromocionCupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'ACTIVAS' | 'VENCIDAS' | 'AGOTADAS'>('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Modal de Creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    titulo: '',
    codigo: '',
    descripcion: '',
    tipoDescuento: 'PORCENTAJE' as 'PORCENTAJE' | 'MONTO_FIJO' | 'DESCUENTO_POR_PAR',
    valorDescuento: '10',
    minimoPares: '1',
    maximoCanjes: '20',
    aplicaPara: 'AMBAS' as 'AMBAS' | 'SOLO_CONTADO' | 'SOLO_CREDITO',
    fechaFin: '',
    mensajePlantilla: '',
  });

  // Modal de Difusión por WhatsApp
  const [showDifusionModal, setShowDifusionModal] = useState(false);
  const [campanaParaDifundir, setCampanaParaDifundir] = useState<PromocionCupon | null>(null);
  const [clientes, setClientes] = useState<ClienteDirectorio[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [filtroClienteTexto, setFiltroClienteTexto] = useState('');
  const [businessNombre, setBusinessNombre] = useState('NEXORA');

  // Cargar nombre del negocio para las plantillas
  useEffect(() => {
    try {
      const stored = localStorage.getItem('business_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.nombre) setBusinessNombre(parsed.nombre);
      }
    } catch {}
  }, []);

  // Cargar Campañas
  const cargarCampanas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApiService.get('/clientes/promociones');
      if (Array.isArray(data)) {
        setCampanas(data);
      }
    } catch (err: any) {
      console.error('Error al cargar campañas:', err);
      showToast('Error al obtener el listado de campañas.', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (online) {
      cargarCampanas();
    }
  }, [online, cargarCampanas, activeSucursalId]);

  // Generador de Código de Validación Automático
  const generarCodigoUnico = (titulo: string) => {
    if (!titulo || !titulo.trim()) return '';
    const clean = titulo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .trim();

    const palabras = clean.split(/\s+/).filter(Boolean);
    let sigla = '';
    if (palabras.length >= 3) {
      sigla = palabras.slice(0, 3).map((p) => p.substring(0, 3)).join('-');
    } else if (palabras.length === 2) {
      sigla = `${palabras[0].substring(0, 4)}-${palabras[1].substring(0, 4)}`;
    } else if (palabras.length === 1) {
      sigla = palabras[0].substring(0, 8);
    } else {
      sigla = 'PROMO';
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `${sigla}-${randomSuffix}`;
  };

  const handleTituloChange = (titulo: string) => {
    const nuevoCodigo = generarCodigoUnico(titulo);
    setForm((prev) => ({
      ...prev,
      titulo,
      codigo: nuevoCodigo,
    }));
    if (formError) setFormError('');
  };

  const handleRegenerarCodigo = () => {
    if (!form.titulo.trim()) return;
    const nuevoCodigo = generarCodigoUnico(form.titulo);
    setForm((prev) => ({ ...prev, codigo: nuevoCodigo }));
  };

  // Abrir y Cerrar Modal de Creación
  const openCreate = () => {
    const fechaMinima = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    setForm({
      titulo: '',
      codigo: '',
      descripcion: '',
      tipoDescuento: 'PORCENTAJE',
      valorDescuento: '10',
      minimoPares: '1',
      maximoCanjes: '20',
      aplicaPara: 'AMBAS',
      fechaFin: fechaMinima,
      mensajePlantilla: '',
    });
    setFormError('');
    setShowCreateModal(true);
  };

  const closeCreate = () => {
    setShowCreateModal(false);
    setFormError('');
  };

  // Crear Campaña
  const handleGuardarCampana = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const tituloTrim = form.titulo.trim();
    if (!tituloTrim) {
      setFormError('El título de la campaña es obligatorio.');
      return;
    }

    const existeDuplicada = campanas.some(
      (c) => c.titulo.trim().toLowerCase() === tituloTrim.toLowerCase() && c.activo !== false
    );
    if (existeDuplicada) {
      setFormError(`Ya existe una campaña activa con el título "${tituloTrim}". Utiliza un nombre diferente.`);
      return;
    }

    if (!form.codigo.trim()) {
      setFormError('El código de validación de la campaña es requerido.');
      return;
    }

    if (!form.fechaFin) {
      setFormError('Debes seleccionar la fecha de vigencia de la campaña.');
      return;
    }

    const hoyStr = new Date().toISOString().split('T')[0];
    if (form.fechaFin < hoyStr) {
      setFormError('La fecha de vigencia no puede ser una fecha pasada.');
      return;
    }

    const valorDesc = parseFloat(form.valorDescuento);
    if (isNaN(valorDesc) || valorDesc <= 0) {
      setFormError('El valor del descuento debe ser mayor a 0.');
      return;
    }

    setGuardando(true);
    try {
      await ApiService.post('/clientes/promociones', {
        codigo: form.codigo.toUpperCase().trim(),
        titulo: tituloTrim,
        descripcion: form.descripcion.trim() || undefined,
        tipoDescuento: form.tipoDescuento,
        valorDescuento: valorDesc,
        minimoPares: parseInt(form.minimoPares, 10) || 1,
        maximoCanjes: parseInt(form.maximoCanjes, 10) || 10,
        aplicaPara: form.aplicaPara,
        fechaFin: form.fechaFin,
        mensajePlantilla: form.mensajePlantilla.trim() || undefined,
      });

      showToast('Campaña comercial creada exitosamente.', 'success');
      setShowCreateModal(false);
      cargarCampanas();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la campaña.');
    } finally {
      setGuardando(false);
    }
  };

  // Conmutar Activo/Inactivo
  const handleToggleActivo = async (campana: PromocionCupon) => {
    try {
      await ApiService.put(`/clientes/promociones/${campana.id}`, {
        activo: !campana.activo,
      });
      showToast(
        campana.activo ? 'Campaña pausada correctamente.' : 'Campaña reactivada exitosamente.',
        'info'
      );
      cargarCampanas();
    } catch (err: any) {
      showToast('Error al actualizar el estado de la campaña.', 'warning');
    }
  };

  // Eliminar Campaña
  const handleEliminarCampana = async (campana: PromocionCupon) => {
    if (campana.canjesUsados > 0) {
      showToast('No se puede eliminar una campaña que ya registra ventas canjeadas. Puedes pausarla.', 'warning');
      return;
    }

    try {
      await ApiService.delete(`/clientes/promociones/${campana.id}`);
      showToast('Campaña eliminada exitosamente.', 'success');
      cargarCampanas();
    } catch (err: any) {
      showToast('Error al eliminar la campaña.', 'warning');
    }
  };

  // Construir Texto de Difusión
  const getTextoPlantillaDifusion = (c: PromocionCupon) => {
    const textoDescuento =
      c.tipoDescuento === 'PORCENTAJE'
        ? `${Number(c.valorDescuento)}% de descuento directo`
        : c.tipoDescuento === 'DESCUENTO_POR_PAR'
        ? `$${Number(c.valorDescuento).toFixed(2)} de descuento por cada par`
        : `$${Number(c.valorDescuento).toFixed(2)} de descuento en tu compra`;

    const textoPares = c.minimoPares > 1 ? ` (Válido en pedidos desde ${c.minimoPares} pares)` : '';
    const textoValidez = c.fechaFin ? `\nFecha límite: ${new Date(c.fechaFin).toLocaleDateString('es-EC')}` : '';

    if (c.mensajePlantilla && c.mensajePlantilla.trim()) {
      return c.mensajePlantilla
        .replace(/{codigo}/g, c.codigo)
        .replace(/{descuento}/g, textoDescuento)
        .replace(/{negocio}/g, businessNombre);
    }

    return (
      `Estimado/a cliente, te saludamos desde ${businessNombre}.\n\n` +
      `Tenemos disponible una promoción especial con ${textoDescuento}${textoPares}.\n\n` +
      `Código de validación: ${c.codigo}\n` +
      `Cupos disponibles: ${c.maximoCanjes - c.canjesUsados} de ${c.maximoCanjes}.${textoValidez}\n\n` +
      `Menciona este código al realizar tu compra o pedido para aplicar el beneficio comercial.`
    );
  };

  const copiarTextoDifusion = (c: PromocionCupon) => {
    const texto = getTextoPlantillaDifusion(c);
    navigator.clipboard.writeText(texto);
    setCopiadoId(c.id);
    setTimeout(() => setCopiadoId(null), 3000);
    showToast('Texto de difusión copiado al portapapeles.', 'success');
  };

  // Abrir Modal de Difusión Directa
  const openDifusion = async (c: PromocionCupon) => {
    setCampanaParaDifundir(c);
    setShowDifusionModal(true);
    setFiltroClienteTexto('');
    setLoadingClientes(true);
    try {
      const data = await ApiService.get('/clientes');
      if (Array.isArray(data)) {
        setClientes(data);
      }
    } catch {
      showToast('No se pudo cargar el directorio de clientes.', 'warning');
    } finally {
      setLoadingClientes(false);
    }
  };

  const enviarWhatsAppCliente = (cliente: ClienteDirectorio) => {
    if (!cliente.telefono) {
      showToast(`El cliente ${cliente.nombre} no tiene registrado número de teléfono celular.`, 'warning');
      return;
    }
    if (!campanaParaDifundir) return;

    const textoBase = getTextoPlantillaDifusion(campanaParaDifundir);
    const mensajePersonalizado = `Hola ${cliente.nombre},\n\n${textoBase}`;
    abrirWhatsAppUniversal(cliente.telefono, mensajePersonalizado);
  };

  // Métricas y Filtros
  const hoyStr = new Date().toISOString().split('T')[0];

  const campanasProcesadas = useMemo(() => {
    return campanas.map((c) => {
      const esVencida = c.fechaFin ? c.fechaFin < hoyStr : false;
      const esAgotada = c.maximoCanjes > 0 && c.canjesUsados >= c.maximoCanjes;
      return {
        ...c,
        esVencida,
        esAgotada,
      };
    });
  }, [campanas, hoyStr]);

  const campanasFiltradas = useMemo(() => {
    return campanasProcesadas.filter((c) => {
      if (filtroEstado === 'ACTIVAS' && (!c.activo || c.esVencida || c.esAgotada)) return false;
      if (filtroEstado === 'VENCIDAS' && !c.esVencida) return false;
      if (filtroEstado === 'AGOTADAS' && !c.esAgotada) return false;

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideTitulo = c.titulo.toLowerCase().includes(q);
        const coincideCodigo = c.codigo.toLowerCase().includes(q);
        if (!coincideTitulo && !coincideCodigo) return false;
      }
      return true;
    });
  }, [campanasProcesadas, filtroEstado, busqueda]);

  const totalActivas = campanasProcesadas.filter((c) => c.activo && !c.esVencida && !c.esAgotada).length;
  const totalCanjesUsados = campanasProcesadas.reduce((sum, c) => sum + (c.canjesUsados || 0), 0);

  const clientesFiltrados = useMemo(() => {
    if (!filtroClienteTexto.trim()) return clientes;
    const q = filtroClienteTexto.toLowerCase().trim();
    return clientes.filter((cl) => {
      const nom = `${cl.nombre} ${cl.apellido || ''}`.toLowerCase();
      const tel = (cl.telefono || '').toLowerCase();
      return nom.includes(q) || tel.includes(q);
    });
  }, [clientes, filtroClienteTexto]);

  return (
    <div className="space-y-6">
      {/* Header del Módulo */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Gift size={22} />
            </span>
            <div>
              <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">Campañas & Promociones</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Administra cupones de descuento, límites de canje y difusión comercial directa a clientes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-purple-600 dark:hover:bg-purple-500 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Crear Nueva Campaña</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
              Campañas Activas
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalActivas}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Tag size={20} />
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
              Canjes Utilizados
            </span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{totalCanjesUsados}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
              Total Registradas
            </span>
            <span className="text-2xl font-black text-[var(--foreground)]">{campanas.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--card)] border border-[var(--border)] p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {(['TODAS', 'ACTIVAS', 'VENCIDAS', 'AGOTADAS'] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setFiltroEstado(est)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filtroEstado === est
                  ? 'bg-slate-900 text-white dark:bg-purple-600 dark:text-white'
                  : 'bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
              }`}
            >
              {est === 'TODAS'
                ? 'Todas'
                : est === 'ACTIVAS'
                ? 'Activas'
                : est === 'VENCIDAS'
                ? 'Vencidas'
                : 'Agotadas'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Buscar por título o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-purple-600"
          />
        </div>
      </div>

      {/* Listado de Campañas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
          <Loader2 size={32} className="animate-spin text-purple-600 mb-2" />
          <p className="text-xs font-bold">Cargando campañas comerciales...</p>
        </div>
      ) : campanasFiltradas.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 mx-auto flex items-center justify-center">
            <Gift size={24} />
          </div>
          <h3 className="text-base font-bold text-[var(--foreground)]">No hay campañas para mostrar</h3>
          <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
            {busqueda.trim()
              ? 'No se encontraron campañas que coincidan con tu búsqueda.'
              : 'Aún no se han registrado campañas comerciales. Crea una para comenzar a premiar a tus clientes.'}
          </p>
          {!busqueda.trim() && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>Crear Primera Campaña</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campanasFiltradas.map((c) => {
            const porcentajeUso = c.maximoCanjes > 0 ? Math.min(100, Math.round((c.canjesUsados / c.maximoCanjes) * 100)) : 0;
            const esVigente = c.activo && !c.esVencida && !c.esAgotada;

            return (
              <div
                key={c.id}
                className={`bg-[var(--card)] border rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm transition-all ${
                  !c.activo
                    ? 'border-slate-300 dark:border-slate-800 opacity-60 bg-[var(--muted)]/10'
                    : c.esVencida || c.esAgotada
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-[var(--border)] hover:border-purple-500/50 hover:shadow-md'
                }`}
              >
                <div className="space-y-3">
                  {/* Cabecera de la tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
                        Campaña Comercial
                      </span>
                      <h4 className="text-sm font-extrabold text-[var(--foreground)] truncate" title={c.titulo}>
                        {c.titulo}
                      </h4>
                    </div>

                    <div className="shrink-0">
                      {c.esVencida ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          Vencida
                        </span>
                      ) : c.esAgotada ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          Agotada
                        </span>
                      ) : !c.activo ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                          Pausada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Activa
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Código de Cupón */}
                  <div className="p-2.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
                        Código de Validación
                      </span>
                      <span className="font-mono font-black text-sm text-purple-700 dark:text-purple-300">
                        {c.codigo}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copiarTextoDifusion(c)}
                      title="Copiar texto de la campaña"
                      className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
                    >
                      {copiadoId === c.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>

                  {/* Beneficio y Condiciones */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-[var(--muted)]/20 rounded-lg">
                      <span className="text-[10px] text-[var(--muted-foreground)] block">Descuento</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-extrabold">
                        {c.tipoDescuento === 'PORCENTAJE'
                          ? `${Number(c.valorDescuento)}%`
                          : c.tipoDescuento === 'DESCUENTO_POR_PAR'
                          ? `$${Number(c.valorDescuento).toFixed(2)} / par`
                          : `$${Number(c.valorDescuento).toFixed(2)}`}
                      </strong>
                    </div>

                    <div className="p-2 bg-[var(--muted)]/20 rounded-lg">
                      <span className="text-[10px] text-[var(--muted-foreground)] block">Mínimo Pares</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-extrabold">
                        {c.minimoPares > 1 ? `${c.minimoPares} pares` : 'Desde 1 par'}
                      </strong>
                    </div>
                  </div>

                  {/* Barra de progreso de canjes */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[var(--muted-foreground)]">
                      <span>Cupos de Canje</span>
                      <span className="font-mono font-bold text-[var(--foreground)]">
                        {c.canjesUsados} / {c.maximoCanjes} ({porcentajeUso}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          c.esAgotada ? 'bg-amber-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${porcentajeUso}%` }}
                      />
                    </div>
                  </div>

                  {/* Fecha de Vigencia */}
                  {c.fechaFin && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] pt-1">
                      <Calendar size={12} />
                      <span>Válido hasta: <strong>{new Date(c.fechaFin).toLocaleDateString('es-EC')}</strong></span>
                    </div>
                  )}
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="pt-2 border-t border-[var(--border)]/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openDifusion(c)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <MessageCircle size={13} />
                    <span>Difundir WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActivo(c)}
                    title={c.activo ? 'Pausar campaña' : 'Reanudar campaña'}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      c.activo
                        ? 'border-amber-500/20 text-amber-600 hover:bg-amber-500/10'
                        : 'border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10'
                    }`}
                  >
                    <Power size={13} />
                  </button>

                  {c.canjesUsados === 0 && (
                    <button
                      type="button"
                      onClick={() => handleEliminarCampana(c)}
                      title="Eliminar campaña"
                      className="p-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREAR NUEVA CAMPAÑA */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600/30 text-purple-300 flex items-center justify-center">
                  <Gift size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Nueva Campaña Comercial</h3>
                  <p className="text-[11px] text-slate-400">Define cupones con cupo limitado de canje</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarCampana} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Título de la Campaña */}
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    1. Título de la Campaña *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Descuento Temporada Escolar o Feria de Fin de Mes"
                    value={form.titulo}
                    onChange={(e) => handleTituloChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-purple-600"
                    required
                    autoFocus
                  />
                  <span className="text-[10px] text-[var(--muted-foreground)] mt-1 block">
                    Al escribir el título se generará automáticamente el código único.
                  </span>
                </div>

                {/* 2. Código de Validación Automático */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      2. Código de Validación *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={form.codigo}
                        placeholder="Generado automáticamente..."
                        className="w-full px-3 py-2 bg-[var(--muted)]/60 border border-[var(--border)] rounded-xl text-xs font-mono font-black text-purple-700 dark:text-purple-300 uppercase cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={handleRegenerarCodigo}
                        title="Regenerar código"
                        className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                      >
                        <Sparkles size={13} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      Cupo Máximo de Canjes *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={form.maximoCanjes}
                      onChange={(e) => setForm((p) => ({ ...p, maximoCanjes: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                {/* 3. Tipo y Valor del Descuento */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      Tipo de Descuento *
                    </label>
                    <select
                      value={form.tipoDescuento}
                      onChange={(e) => setForm((p) => ({ ...p, tipoDescuento: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold"
                    >
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                      <option value="DESCUENTO_POR_PAR">Descuento por Par ($/par)</option>
                      <option value="MONTO_FIJO">Monto Fijo Total ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      Valor del Descuento *
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={form.valorDescuento}
                      onChange={(e) => setForm((p) => ({ ...p, valorDescuento: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold font-mono"
                      required
                    />
                  </div>
                </div>

                {/* 4. Condiciones de Compra */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      Mínimo de Pares Requeridos
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={form.minimoPares}
                      onChange={(e) => setForm((p) => ({ ...p, minimoPares: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      Fecha de Vigencia *
                    </label>
                    <input
                      type="date"
                      value={form.fechaFin}
                      onChange={(e) => setForm((p) => ({ ...p, fechaFin: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                {/* 5. Mensaje de Difusión Personalizado */}
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    Mensaje de Difusión Personalizado (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Escribe el texto que se enviará por WhatsApp..."
                    value={form.mensajePlantilla}
                    onChange={(e) => setForm((p) => ({ ...p, mensajePlantilla: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-purple-600 resize-none"
                  />
                  <span className="text-[10px] text-[var(--muted-foreground)] block mt-0.5">
                    Variables disponibles: {'{codigo}'}, {'{descuento}'}, {'{negocio}'}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--muted)]/20 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeCreate}
                  className="px-4 py-2 text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-xl border border-[var(--border)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-xs"
                >
                  {guardando ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Activar Campaña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIFUSIÓN POR WHATSAPP A CLIENTES */}
      {showDifusionModal && campanaParaDifundir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Difundir Campaña por WhatsApp</h3>
                  <p className="text-[11px] text-emerald-100">
                    Campaña: {campanaParaDifundir.titulo} ({campanaParaDifundir.codigo})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDifusionModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]/20 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre o teléfono..."
                  value={filtroClienteTexto}
                  onChange={(e) => setFiltroClienteTexto(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Selecciona cualquier cliente de tu cartera para enviarle el mensaje con el cupón listo:
              </p>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {loadingClientes ? (
                <div className="flex items-center justify-center py-8 text-xs text-[var(--muted-foreground)]">
                  <Loader2 size={18} className="animate-spin mr-2 text-emerald-600" />
                  Cargando clientes...
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--muted-foreground)]">
                  No se encontraron clientes con teléfono registrado.
                </div>
              ) : (
                clientesFiltrados.map((cl) => (
                  <div
                    key={cl.id}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/30 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-[var(--foreground)]">
                        {cl.nombre} {cl.apellido || ''}
                      </h5>
                      <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                        {cl.telefono || 'Sin celular'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => enviarWhatsAppCliente(cl)}
                      disabled={!cl.telefono}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                    >
                      <MessageCircle size={13} />
                      <span>Enviar</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDifusionModal(false)}
                className="px-4 py-2 text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-xl border border-[var(--border)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
