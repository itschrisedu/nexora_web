"use client";

import { useState, useEffect, Fragment } from 'react';
import { ApiService } from '../services/api.service';
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Search,
  User,
  Phone,
  FileText,
  Calendar,
  CreditCard,
  History,
  X,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Building,
  ChevronDown,
  ChevronUp,
  Layers,
  ListFilter,
  Users,
} from 'lucide-react';
import { useToast } from './ui/toast';

interface FinancieroProps {
  online: boolean;
}

type EstadoCobro = 'PENDIENTE' | 'PARCIALMENTE_PAGADO' | 'SALDADO' | 'PAGADO' | 'VENCIDO';

interface Abono {
  id: string;
  monto: number;
  metodo: string;
  notas?: string;
  createdAt: string;
}

interface Cobro {
  id: string;
  numeroCobro?: string;
  clientId: string;
  clienteNombre?: string;
  clienteCedula?: string;
  clienteTelefono?: string;
  clienteNivel?: string;
  montoOriginal?: number;
  montoTotal?: number;
  saldoPendiente: number;
  estado: EstadoCobro;
  tipo?: string;
  fechaVencimiento?: string;
  createdAt: string;
  saleNote?: {
    id: string;
    numero: number;
    total: number;
    subtotal: number;
    pdfUrl?: string;
    lines?: any[];
  };
  abonos?: Abono[];
}

interface ClienteCartera {
  clientId: string;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  clienteNivel: string;
  montoTotalFacturado: number;
  saldoTotalPendiente: number;
  totalAbonado: number;
  totalCompras: number;
  totalComprasPendientes: number;
  estadoGlobal: EstadoCobro;
  proximoVencimiento?: string;
  cobros: Cobro[];
}

interface ClienteHistorial {
  cliente: {
    id: string;
    nombre: string;
    cedula?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    nivelCredito: string;
    limiteCredito: number;
    creditoUtilizado: number;
    totalCompras: number;
    atrasoConsecutivo: number;
  };
  resumen: {
    totalPedidos: number;
    totalComprado: number;
    saldoPendienteTotal: number;
    totalAbonado: number;
  };
  pedidos: any[];
  notasVenta: any[];
  cobros: any[];
  movimientos: {
    id: string;
    tipo: 'COMPRA_PEDIDO' | 'ABONO';
    titulo: string;
    descripcion: string;
    monto: number;
    metodo?: string;
    estado?: string;
    fecha: string;
    detalles?: any;
  }[];
}

const COBRO_ESTADO: Record<string, { label: string; color: string }> = {
  PENDIENTE:           { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  PARCIALMENTE_PAGADO: { label: 'Parcial',   color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  PAGADO:              { label: 'Saldado',   color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  SALDADO:             { label: 'Saldado',   color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  VENCIDO:             { label: 'Vencido',   color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

function getCobroConfig(estado?: string) {
  return COBRO_ESTADO[estado || 'PENDIENTE'] || { label: estado || 'Pendiente', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}

export default function FinancieroComponent({ online }: FinancieroProps) {
  const { showToast } = useToast();
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState<'CLIENTES' | 'FACTURAS'>('CLIENTES');
  const [filtro, setFiltro] = useState<EstadoCobro | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Cliente o Cobro seleccionado para el panel lateral
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string | null>(null);
  const [cobroSeleccionadoId, setCobroSeleccionadoId] = useState<string | null>(null);
  const [clienteExpandidoId, setClienteExpandidoId] = useState<string | null>(null);

  // Formulario Abono
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoAbono, setMetodoAbono] = useState('EFECTIVO');
  const [notasAbono, setNotasAbono] = useState('');
  const [savingAbono, setSavingAbono] = useState(false);

  // Modal Devolución
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [montoDevolucion, setMontoDevolucion] = useState('');
  const [savingDevolucion, setSavingDevolucion] = useState(false);

  // Modal Historial Completo del Cliente
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialCliente, setHistorialCliente] = useState<ClienteHistorial | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [filtroHistorial, setFiltroHistorial] = useState<'TODOS' | 'COMPRAS' | 'ABONOS'>('TODOS');

  useEffect(() => {
    loadCobros();
  }, [online]);

  const loadCobros = async () => {
    setLoading(true);
    try {
      if (online) {
        const data = await ApiService.get('/financiero/cobros');
        const list = Array.isArray(data) ? data : [];
        setCobros(list);
      }
    } catch (err) {
      console.error('Error al cargar cobros:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Agrupación Consolidada por Cliente ─────────
  const clientesCartera: ClienteCartera[] = (() => {
    const map = new Map<string, Cobro[]>();
    cobros.forEach((c) => {
      const key = c.clientId || 'SIN_CLIENTE';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });

    const resultado: ClienteCartera[] = [];

    map.forEach((listaCobros, clientId) => {
      const primerCobro = listaCobros[0];
      const montoTotalFacturado = listaCobros.reduce(
        (sum, c) => sum + Number(c.montoOriginal ?? c.montoTotal ?? 0),
        0,
      );
      const saldoTotalPendiente = listaCobros.reduce(
        (sum, c) => sum + Number(c.saldoPendiente || 0),
        0,
      );
      const totalAbonado = listaCobros.reduce(
        (sum, c) => sum + (c.abonos || []).reduce((s, a) => s + Number(a.monto || 0), 0),
        0,
      );

      const comprasPendientes = listaCobros.filter((c) => Number(c.saldoPendiente) > 0);

      // Estado global del cliente
      let estadoGlobal: EstadoCobro = 'SALDADO';
      const tieneVencido = listaCobros.some(
        (c) => c.estado === 'VENCIDO' || (Number(c.saldoPendiente) > 0 && c.fechaVencimiento && new Date(c.fechaVencimiento) < new Date()),
      );
      if (tieneVencido) {
        estadoGlobal = 'VENCIDO';
      } else if (saldoTotalPendiente > 0) {
        if (totalAbonado > 0) {
          estadoGlobal = 'PARCIALMENTE_PAGADO';
        } else {
          estadoGlobal = 'PENDIENTE';
        }
      }

      // Próximo vencimiento
      const fechasPendientes = comprasPendientes
        .map((c) => c.fechaVencimiento)
        .filter(Boolean)
        .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime());

      resultado.push({
        clientId,
        clienteNombre: primerCobro.clienteNombre || 'Cliente sin registrar',
        clienteCedula: primerCobro.clienteCedula || '—',
        clienteTelefono: primerCobro.clienteTelefono || '—',
        clienteNivel: primerCobro.clienteNivel || '—',
        montoTotalFacturado,
        saldoTotalPendiente,
        totalAbonado,
        totalCompras: listaCobros.length,
        totalComprasPendientes: comprasPendientes.length,
        estadoGlobal,
        proximoVencimiento: fechasPendientes[0],
        cobros: listaCobros.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      });
    });

    // Ordenar de mayor saldo pendiente a menor
    return resultado.sort((a, b) => b.saldoTotalPendiente - a.saldoTotalPendiente);
  })();

  // ── Selección activa ──────────────────────────
  const carteraSeleccionada = clientesCartera.find((c) => c.clientId === clienteSeleccionadoId) || (clientesCartera.length > 0 ? clientesCartera[0] : null);
  const cobroSeleccionado = cobros.find((c) => c.id === cobroSeleccionadoId) || (carteraSeleccionada?.cobros.find((c) => Number(c.saldoPendiente) > 0) || carteraSeleccionada?.cobros[0] || null);

  const handleSeleccionarCliente = (c: ClienteCartera) => {
    setClienteSeleccionadoId(c.clientId);
    const cobroConDeuda = c.cobros.find((item) => Number(item.saldoPendiente) > 0) || c.cobros[0];
    setCobroSeleccionadoId(cobroConDeuda?.id || null);
    setMontoAbono('');
  };

  const handleRegistrarAbono = async () => {
    if (!cobroSeleccionado || !montoAbono) {
      showToast('Selecciona un cobro e ingresa el monto.', 'warning');
      return;
    }
    const valor = parseFloat(montoAbono);
    if (isNaN(valor) || valor <= 0) {
      showToast('Ingresa un monto válido mayor a $0.00', 'warning');
      return;
    }
    if (valor > Number(cobroSeleccionado.saldoPendiente)) {
      showToast(`El monto no puede superar el saldo pendiente de esta nota ($${Number(cobroSeleccionado.saldoPendiente).toFixed(2)})`, 'warning');
      return;
    }

    setSavingAbono(true);
    try {
      await ApiService.post(`/financiero/cobros/${cobroSeleccionado.id}/abono`, {
        monto: valor,
        metodo: metodoAbono,
        notas: notasAbono.trim() || undefined,
      });
      showToast(`¡Abono de $${valor.toFixed(2)} registrado exitosamente vía ${metodoAbono}!`, 'success');
      setMontoAbono('');
      setNotasAbono('');
      await loadCobros();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar abono.', 'error');
    } finally {
      setSavingAbono(false);
    }
  };

  const handleAbrirHistorial = async (clientId: string) => {
    setShowHistorialModal(true);
    setLoadingHistorial(true);
    try {
      const data = await ApiService.get(`/financiero/cliente/${clientId}/historial`);
      setHistorialCliente(data);
    } catch (err: any) {
      showToast('Error al cargar el historial del cliente.', 'error');
      setShowHistorialModal(false);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleRegistrarDevolucion = async () => {
    if (!carteraSeleccionada || !montoDevolucion || !motivoDevolucion) return;
    setSavingDevolucion(true);
    try {
      await ApiService.post('/devoluciones/cliente', {
        clientId: carteraSeleccionada.clientId,
        motivo: motivoDevolucion,
        lines: [
          {
            productId: 'sin-especificar',
            tallaId: 'sin-especificar',
            cantidad: 1,
            precioUnitario: parseFloat(montoDevolucion),
          },
        ],
      });
      showToast('Devolución de cliente registrada exitosamente.', 'success');
      setShowDevolucionModal(false);
      setMotivoDevolucion('');
      setMontoDevolucion('');
      loadCobros();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar devolución.', 'error');
    } finally {
      setSavingDevolucion(false);
    }
  };

  const saldoTotalGeneral = cobros.reduce((acc, c) => acc + Number(c.saldoPendiente), 0);

  // Filtrado de Cartera Consolidada
  const clientesFiltrados = clientesCartera.filter((c) => {
    const cumpleEstado =
      filtro === 'TODOS'
        ? true
        : filtro === 'PENDIENTE'
        ? c.saldoTotalPendiente > 0 && c.estadoGlobal !== 'VENCIDO'
        : c.estadoGlobal === filtro;

    const q = busqueda.toLowerCase().trim();
    if (!q) return cumpleEstado;

    const nombre = c.clienteNombre.toLowerCase();
    const cedula = c.clienteCedula.toLowerCase();
    const cumpleBusqueda = nombre.includes(q) || cedula.includes(q);

    return cumpleEstado && cumpleBusqueda;
  });

  // Filtrado de Cobros Individuales
  const facturasFiltradas = cobros.filter((c) => {
    const cumpleEstado = filtro === 'TODOS' ? true : c.estado === filtro;
    const q = busqueda.toLowerCase().trim();
    if (!q) return cumpleEstado;

    const nombre = (c.clienteNombre || '').toLowerCase();
    const cedula = (c.clienteCedula || '').toLowerCase();
    const num = (c.numeroCobro || c.saleNote?.numero?.toString() || c.id || '').toLowerCase();

    return cumpleEstado && (nombre.includes(q) || cedula.includes(q) || num.includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header & KPI Saldo Pendiente */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-xl tracking-tight text-[var(--foreground)]">
            Cartera de Clientes y Gestión de Cobros
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] font-medium">
            Consolidación de deudas por cliente, detalle de notas de venta y control de abonos
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Vistas */}
          <div className="flex p-1 bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl">
            <button
              onClick={() => setVista('CLIENTES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                vista === 'CLIENTES' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Users size={14} />
              <span>Por Cliente</span>
            </button>
            <button
              onClick={() => setVista('FACTURAS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                vista === 'FACTURAS' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Receipt size={14} />
              <span>Por Nota/Cobro</span>
            </button>
          </div>

          <div className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm text-sm flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
              <DollarSign size={18} />
            </div>
            <div>
              <span className="text-[10px] text-[var(--muted-foreground)] block font-semibold leading-tight">Total por Cobrar:</span>
              <span className="font-extrabold text-base text-red-500 leading-tight">${saldoTotalGeneral.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros de Estado */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre o número de cédula/RUC..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#0F172A] shadow-sm"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['TODOS', 'PENDIENTE', 'PARCIALMENTE_PAGADO', 'SALDADO', 'VENCIDO'] as const).map((e) => (
            <button
              key={e}
              onClick={() => setFiltro(e as any)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                filtro === e
                  ? 'bg-[#0F172A] text-white border-transparent'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[#0F172A]'
              }`}
            >
              {e === 'TODOS' ? 'Todos los Registros' : getCobroConfig(e).label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal: Tabla + Panel Detalle/Abono */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla de Clientes o Facturas */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <Loader2 className="animate-spin text-[#0F172A] mb-3" size={36} />
              <span className="text-xs font-bold">Cargando cartera consolidada de clientes...</span>
            </div>
          ) : vista === 'CLIENTES' ? (
            /* ══════════════════════════════════════════════════════════════ */
            /* VISTA CONSOLIDADA POR CLIENTE                                   */
            /* ══════════════════════════════════════════════════════════════ */
            clientesFiltrados.length === 0 ? (
              <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2">
                <Users size={40} className="mx-auto text-[var(--muted-foreground)]/40 mb-2" />
                <p className="text-sm font-bold">No se encontraron clientes con cobros</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {busqueda ? `No hay resultados para "${busqueda}"` : 'Los clientes con pedidos aparecerán aquí.'}
                </p>
              </div>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[var(--muted)]/40 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      <tr>
                        <th className="px-5 py-4">Cliente Deudor</th>
                        <th className="px-5 py-4 text-center">Compras / Notas</th>
                        <th className="px-5 py-4 text-center">Estado Cartera</th>
                        <th className="px-5 py-4 text-right">Total Facturado</th>
                        <th className="px-5 py-4 text-right">Saldo Deudor Total</th>
                        <th className="px-5 py-4 text-right">Próx. Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {clientesFiltrados.map((cliente) => {
                        const cfg = getCobroConfig(cliente.estadoGlobal);
                        const isSelected = (carteraSeleccionada?.clientId === cliente.clientId);
                        const isExpanded = (clienteExpandidoId === cliente.clientId);

                        return (
                          <Fragment key={cliente.clientId}>
                            <tr
                              onClick={() => handleSeleccionarCliente(cliente)}
                              className={`hover:bg-[var(--muted)]/30 cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#0F172A]/5 border-l-4 border-l-[#0F172A]' : ''
                              }`}
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setClienteExpandidoId(isExpanded ? null : cliente.clientId);
                                    }}
                                    className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                                    title="Ver desglose de compras"
                                  >
                                    {isExpanded ? <ChevronUp size={16} className="text-[#0F172A]" /> : <ChevronDown size={16} />}
                                  </button>
                                  <div>
                                    <div className="font-extrabold text-xs text-[var(--foreground)]">
                                      {cliente.clienteNombre}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)] mt-0.5">
                                      <span>C.I: {cliente.clienteCedula}</span>
                                      {cliente.clienteNivel && (
                                        <span className="px-1.5 py-0.2 bg-[#0F172A]/10 text-[#0F172A] rounded font-bold">
                                          {cliente.clienteNivel}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 text-center">
                                <span className="px-2.5 py-1 bg-[var(--muted)] text-[var(--foreground)] rounded-lg text-xs font-bold border border-[var(--border)]">
                                  {cliente.totalCompras} {cliente.totalCompras === 1 ? 'compra' : 'compras'}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-center">
                                <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-block ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-right text-xs font-semibold text-[var(--muted-foreground)]">
                                ${cliente.montoTotalFacturado.toFixed(2)}
                              </td>

                              <td className="px-5 py-4 text-right">
                                <span
                                  className={`text-sm font-black ${
                                    cliente.saldoTotalPendiente > 0 ? 'text-red-500' : 'text-emerald-600'
                                  }`}
                                >
                                  ${cliente.saldoTotalPendiente.toFixed(2)}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-right text-[11px] text-[var(--muted-foreground)]">
                                {cliente.proximoVencimiento
                                  ? new Date(cliente.proximoVencimiento).toLocaleDateString('es-EC')
                                  : 'Al día / Contado'}
                              </td>
                            </tr>

                            {/* Desglose Expandible de Notas/Facturas del Cliente */}
                            {isExpanded && (
                              <tr className="bg-[var(--muted)]/20">
                                <td colSpan={6} className="px-6 py-4">
                                  <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-3">
                                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                                      <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                                        <Receipt size={14} className="text-[#0F172A]" />
                                        <span>Desglose de Compras y Facturas de {cliente.clienteNombre}</span>
                                      </span>
                                      <span className="text-xs font-bold text-[var(--muted-foreground)]">
                                        Saldo Total: <strong className="text-red-500">${cliente.saldoTotalPendiente.toFixed(2)}</strong>
                                      </span>
                                    </div>

                                    <div className="space-y-2">
                                      {cliente.cobros.map((cobroItem) => {
                                        const cCfg = getCobroConfig(cobroItem.estado);
                                        const numNota = cobroItem.saleNote?.numero
                                          ? `NOTA #${String(cobroItem.saleNote.numero).padStart(4, '0')}`
                                          : cobroItem.numeroCobro || `#${cobroItem.id.slice(0, 8).toUpperCase()}`;
                                        const montoOrig = Number(cobroItem.montoOriginal ?? cobroItem.montoTotal ?? 0);
                                        const isCobroActive = (cobroSeleccionadoId === cobroItem.id);

                                        return (
                                          <div
                                            key={cobroItem.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setClienteSeleccionadoId(cliente.clientId);
                                              setCobroSeleccionadoId(cobroItem.id);
                                            }}
                                            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer ${
                                              isCobroActive
                                                ? 'bg-[#0F172A]/10 border-[#0F172A]/40 shadow-xs'
                                                : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]/40'
                                            }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="p-2 rounded-xl bg-slate-500/10 text-slate-700">
                                                <FileText size={16} />
                                              </div>
                                              <div>
                                                <div className="font-bold text-xs text-[var(--foreground)] flex items-center gap-2">
                                                  <span>{numNota}</span>
                                                  <span className="px-2 py-0.2 bg-[var(--muted)] text-[var(--muted-foreground)] rounded text-[10px]">
                                                    {cobroItem.tipo || 'Crédito'}
                                                  </span>
                                                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${cCfg.color}`}>
                                                    {cCfg.label}
                                                  </span>
                                                </div>
                                                <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-3 mt-1">
                                                  <span>Fecha: {new Date(cobroItem.createdAt).toLocaleDateString('es-EC')}</span>
                                                  {cobroItem.fechaVencimiento && (
                                                    <span>Vence: {new Date(cobroItem.fechaVencimiento).toLocaleDateString('es-EC')}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="text-right flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                                              <div>
                                                <div className="text-[10px] text-[var(--muted-foreground)]">Original: ${montoOrig.toFixed(2)}</div>
                                                <div className="text-xs font-black text-red-500">
                                                  Saldo: ${Number(cobroItem.saldoPendiente).toFixed(2)}
                                                </div>
                                              </div>

                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setClienteSeleccionadoId(cliente.clientId);
                                                  setCobroSeleccionadoId(cobroItem.id);
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                                  isCobroActive
                                                    ? 'bg-[#0F172A] text-white'
                                                    : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[#0F172A] hover:text-white'
                                                }`}
                                              >
                                                {Number(cobroItem.saldoPendiente) > 0 ? 'Abonar Esta Nota' : 'Ver Detalles'}
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            /* ══════════════════════════════════════════════════════════════ */
            /* VISTA DETALLADA POR NOTA / FACTURA INDIVIDUAL                  */
            /* ══════════════════════════════════════════════════════════════ */
            facturasFiltradas.length === 0 ? (
              <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2">
                <Receipt size={40} className="mx-auto text-[var(--muted-foreground)]/40 mb-2" />
                <p className="text-sm font-bold">No se encontraron facturas o notas de venta</p>
              </div>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[var(--muted)]/40 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      <tr>
                        <th className="px-5 py-4">N° Cobro / Nota</th>
                        <th className="px-5 py-4">Cliente Deudor</th>
                        <th className="px-5 py-4 text-center">Estado</th>
                        <th className="px-5 py-4 text-right">Monto Total</th>
                        <th className="px-5 py-4 text-right">Saldo Pendiente</th>
                        <th className="px-5 py-4 text-right">Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {facturasFiltradas.map((cobro) => {
                        const cfg = getCobroConfig(cobro.estado);
                        const num = cobro.saleNote?.numero
                          ? `NOTA #${String(cobro.saleNote.numero).padStart(4, '0')}`
                          : cobro.numeroCobro || `#${cobro.id.slice(0, 8).toUpperCase()}`;
                        const montoOrig = Number(cobro.montoOriginal ?? cobro.montoTotal ?? 0);
                        const isSelected = cobroSeleccionadoId === cobro.id;

                        return (
                          <tr
                            key={cobro.id}
                            onClick={() => {
                              setClienteSeleccionadoId(cobro.clientId);
                              setCobroSeleccionadoId(cobro.id);
                            }}
                            className={`hover:bg-[var(--muted)]/30 cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#0F172A]/5 border-l-4 border-l-[#0F172A]' : ''
                            }`}
                          >
                            <td className="px-5 py-4 font-bold text-xs text-[var(--foreground)]">
                              <div className="flex items-center gap-1.5">
                                <Receipt size={14} className="text-[var(--muted-foreground)]" />
                                <span>{num}</span>
                              </div>
                              <span className="text-[10px] text-[var(--muted-foreground)] block font-normal">
                                Tipo: {cobro.tipo || 'Crédito'}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-extrabold text-xs text-[var(--foreground)]">
                                {cobro.clienteNombre}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)] mt-0.5">
                                <span>C.I: {cobro.clienteCedula}</span>
                                {cobro.clienteNivel && (
                                  <span className="px-1.5 py-0.2 bg-slate-500/10 text-slate-700 rounded font-bold">
                                    {cobro.clienteNivel}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-block ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right text-xs font-semibold text-[var(--muted-foreground)]">
                              ${montoOrig.toFixed(2)}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span
                                className={`text-xs font-black ${
                                  Number(cobro.saldoPendiente) > 0 ? 'text-red-500' : 'text-emerald-600'
                                }`}
                              >
                                ${Number(cobro.saldoPendiente).toFixed(2)}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right text-[11px] text-[var(--muted-foreground)]">
                              {cobro.fechaVencimiento ? new Date(cobro.fechaVencimiento).toLocaleDateString('es-EC') : 'Contado'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* PANEL LATERAL: GESTIÓN DE ABONOS Y ESTADO DEL CLIENTE         */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <h4 className="font-bold text-xs text-[var(--muted-foreground)] uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard size={14} />
            <span>Gestión de Abonos & Cuenta Corriente</span>
          </h4>

          {carteraSeleccionada ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
              {/* Resumen del Cliente */}
              <div className="space-y-2 pb-3 border-b border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Cuenta del Cliente
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getCobroConfig(carteraSeleccionada.estadoGlobal).color}`}>
                    {getCobroConfig(carteraSeleccionada.estadoGlobal).label}
                  </span>
                </div>

                <div className="p-3 bg-[var(--muted)]/30 rounded-xl border border-[var(--border)] space-y-1">
                  <div className="text-xs font-black text-[var(--foreground)] flex items-center gap-1.5">
                    <User size={13} className="text-[#0F172A]" />
                    <span>{carteraSeleccionada.clienteNombre}</span>
                    <span className="px-1.5 py-0.2 bg-[#0F172A]/10 text-[#0F172A] rounded text-[10px] font-bold">
                      {carteraSeleccionada.clienteNivel}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--muted-foreground)] flex justify-between">
                    <span>Cédula: <strong>{carteraSeleccionada.clienteCedula}</strong></span>
                    <span>Tel: <strong>{carteraSeleccionada.clienteTelefono}</strong></span>
                  </div>
                </div>

                {/* Saldos Totales del Cliente */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-slate-500/5 rounded-xl border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--muted-foreground)] block">Total Facturado:</span>
                    <span className="text-xs font-extrabold text-[var(--foreground)]">
                      ${carteraSeleccionada.montoTotalFacturado.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-red-500/5 rounded-xl border border-red-500/20">
                    <span className="text-[10px] text-red-600 block font-semibold">Saldo Deudor Total:</span>
                    <span className="text-xs font-black text-red-500">
                      ${carteraSeleccionada.saldoTotalPendiente.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nota / Cobro Activo para Abonar */}
              {cobroSeleccionado && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800">
                      Abonar a: {cobroSeleccionado.saleNote?.numero ? `Nota #${String(cobroSeleccionado.saleNote.numero).padStart(4, '0')}` : `#${cobroSeleccionado.id.slice(0, 8).toUpperCase()}`}
                    </span>
                    <span className="text-xs font-black text-red-500">
                      Saldo: ${Number(cobroSeleccionado.saldoPendiente).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">
                    Monto Original: ${Number(cobroSeleccionado.montoOriginal ?? cobroSeleccionado.montoTotal ?? 0).toFixed(2)} ({cobroSeleccionado.tipo || 'Crédito'})
                  </div>
                </div>
              )}

              {/* Últimos Abonos Realizados al Cobro Seleccionado */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[var(--foreground)] block">
                  Abonos registrados a esta nota:
                </span>
                {cobroSeleccionado?.abonos && cobroSeleccionado.abonos.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {cobroSeleccionado.abonos.map((a) => (
                      <div
                        key={a.id}
                        className="p-2 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-extrabold text-emerald-600">${Number(a.monto).toFixed(2)}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)] ml-2 font-semibold">
                            ({a.metodo})
                          </span>
                          {a.notas && <p className="text-[9px] text-[var(--muted-foreground)] italic">{a.notas}</p>}
                        </div>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {new Date(a.createdAt).toLocaleDateString('es-EC')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--muted-foreground)] italic">No registra abonos previos en esta nota.</p>
                )}
              </div>

              {/* Formulario para Registrar Nuevo Abono */}
              {cobroSeleccionado && Number(cobroSeleccionado.saldoPendiente) > 0 && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--foreground)] block">Registrar Abono</span>

                  {/* Monto */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                      Monto a Abonar ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={cobroSeleccionado.saldoPendiente}
                      placeholder="0.00"
                      value={montoAbono}
                      onChange={(e) => setMontoAbono(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold text-emerald-600 focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                      Método de Pago *
                    </label>
                    <select
                      value={metodoAbono}
                      onChange={(e) => setMetodoAbono(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                    >
                      <option value="EFECTIVO">💵 Efectivo</option>
                      <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                      <option value="DEPOSITO">📥 Depósito Bancario</option>
                      <option value="CHEQUE">📝 Cheque</option>
                    </select>
                  </div>

                  {/* Referencia / Comprobante: Solo visible si NO es efectivo (ej. Transferencia, Depósito, Cheque) */}
                  {metodoAbono !== 'EFECTIVO' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                        N° Comprobante / Referencia / Banco *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Transf #12948 Banco Pichincha"
                        value={notasAbono}
                        onChange={(e) => setNotasAbono(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleRegistrarAbono}
                    disabled={savingAbono || !montoAbono || !online}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {savingAbono ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    <span>{savingAbono ? 'Guardando...' : 'Confirmar Abono'}</span>
                  </button>
                </div>
              )}

              {/* Botón Ver Historial Completo del Cliente */}
              <div className="pt-2 border-t border-[var(--border)] space-y-2">
                <button
                  onClick={() => handleAbrirHistorial(carteraSeleccionada.clientId)}
                  className="w-full py-2 bg-[#0F172A]/10 hover:bg-[#0F172A]/20 text-[#0F172A] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-[#0F172A]/20"
                >
                  <History size={14} />
                  <span>Ver Historial Completo del Cliente</span>
                </button>

                <button
                  onClick={() => setShowDevolucionModal(true)}
                  className="w-full py-1.5 text-rose-500 hover:bg-rose-500/10 font-semibold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <AlertTriangle size={12} />
                  <span>Registrar Devolución de Mercadería</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] border-dashed rounded-2xl text-xs space-y-2">
              <CreditCard size={32} className="mx-auto text-[var(--muted-foreground)]/40" />
              <p className="font-bold">Selecciona un cliente de la tabla</p>
              <p className="text-[11px]">
                Podrás consultar todas sus compras y registrar abonos de contado, cheque o transferencia.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: HISTORIAL COMPLETO DE CLIENTE (Compras, Abonos, Pagos) */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showHistorialModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--muted)]/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#0F172A] text-white rounded-xl">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[var(--foreground)]">Historial Comercial y Financiero</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Detalle cronológico de compras, notas de venta y abonos del cliente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistorialModal(false)}
                className="p-1.5 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {loadingHistorial || !historialCliente ? (
                <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
                  <Loader2 size={32} className="animate-spin text-[#0F172A] mb-2" />
                  <span className="text-xs font-bold">Cargando todos los movimientos del cliente...</span>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[var(--foreground)]">{historialCliente.cliente.nombre}</span>
                        <span className="px-2 py-0.5 bg-[#0F172A]/10 text-[#0F172A] border border-[#0F172A]/20 rounded-md text-[10px] font-bold">
                          {historialCliente.cliente.nivelCredito}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>Cédula: <strong>{historialCliente.cliente.cedula || '—'}</strong></span>
                        <span>Teléfono: <strong>{historialCliente.cliente.telefono || '—'}</strong></span>
                        <span>Límite Crédito: <strong>${historialCliente.cliente.limiteCredito.toFixed(2)}</strong></span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-semibold">Saldo Deudor Total:</span>
                      <span className="font-black text-base text-red-500">
                        ${historialCliente.resumen.saldoPendienteTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">Total Pedidos</span>
                      <span className="font-extrabold text-sm">{historialCliente.resumen.totalPedidos}</span>
                    </div>
                    <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">Total Comprado</span>
                      <span className="font-extrabold text-sm text-blue-600">
                        ${historialCliente.resumen.totalComprado.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">Total Abonado</span>
                      <span className="font-extrabold text-sm text-emerald-600">
                        ${historialCliente.resumen.totalAbonado.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">Compras Contado</span>
                      <span className="font-extrabold text-sm">{historialCliente.cliente.totalCompras}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-xs font-extrabold text-[var(--foreground)] uppercase tracking-wider">
                      Línea de Tiempo de Transacciones
                    </span>
                    <div className="flex gap-1">
                      {(['TODOS', 'COMPRAS', 'ABONOS'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFiltroHistorial(f)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            filtroHistorial === f
                              ? 'bg-[#0F172A] text-white'
                              : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                          }`}
                        >
                          {f === 'TODOS' ? 'Todos' : f === 'COMPRAS' ? 'Compras / Pedidos' : 'Abonos'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {historialCliente.movimientos
                      .filter((m) => {
                        if (filtroHistorial === 'COMPRAS') return m.tipo === 'COMPRA_PEDIDO';
                        if (filtroHistorial === 'ABONOS') return m.tipo === 'ABONO';
                        return true;
                      })
                      .map((m) => {
                        const isAbono = m.tipo === 'ABONO';
                        return (
                          <div
                            key={m.id}
                            className="p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-xl flex items-start justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`p-2 rounded-xl mt-0.5 ${
                                  isAbono ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                                }`}
                              >
                                {isAbono ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-bold text-xs text-[var(--foreground)]">{m.titulo}</div>
                                <div className="text-[11px] text-[var(--muted-foreground)]">{m.descripcion}</div>
                                <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5 mt-1">
                                  <Calendar size={11} />
                                  <span>{new Date(m.fecha).toLocaleString('es-EC')}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div
                                className={`text-xs font-black ${
                                  isAbono ? 'text-emerald-600' : 'text-blue-600'
                                }`}
                              >
                                {isAbono ? `+ $${m.monto.toFixed(2)}` : `$${m.monto.toFixed(2)}`}
                              </div>
                              {m.metodo && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 rounded text-[9px] font-bold border border-emerald-500/20 inline-block mt-1">
                                  {m.metodo}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {historialCliente.movimientos.length === 0 && (
                      <p className="text-xs text-[var(--muted-foreground)] italic text-center py-6">
                        No hay movimientos registrados para este cliente.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 flex justify-end">
              <button
                onClick={() => setShowHistorialModal(false)}
                className="px-5 py-2 bg-[#0F172A] text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Devolución de Cliente */}
      {showDevolucionModal && carteraSeleccionada && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-rose-500 flex items-center gap-2">
                <AlertTriangle size={16} />
                Devolución de Cliente — {carteraSeleccionada.clienteNombre}
              </h3>
              <button onClick={() => setShowDevolucionModal(false)} className="text-[var(--muted-foreground)] text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                  Motivo de Devolución
                </label>
                <input
                  type="text"
                  placeholder="Ej. Talla incorrecta, producto defectuoso..."
                  value={motivoDevolucion}
                  onChange={(e) => setMotivoDevolucion(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                  Monto a Devolver ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={carteraSeleccionada.saldoTotalPendiente}
                  placeholder="0.00"
                  value={montoDevolucion}
                  onChange={(e) => setMontoDevolucion(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-bold text-rose-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl text-[11px]">
                💡 La devolución descontará el monto del saldo pendiente del cliente y registrará el ajuste contable.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDevolucionModal(false)}
                className="flex-1 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarDevolucion}
                disabled={savingDevolucion || !montoDevolucion || !motivoDevolucion}
                className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 disabled:opacity-50"
              >
                {savingDevolucion ? 'Guardando...' : 'Confirmar Devolución'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
