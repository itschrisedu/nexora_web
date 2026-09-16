"use client";

import { useState, useEffect, useMemo } from "react";
import { ApiService } from "../services/api.service";
import {
  Wallet, DollarSign, Plus, Search, Filter, RefreshCw,
  Building, Truck, Users, Lightbulb, Home, Wrench, Package,
  AlertCircle, CheckCircle, Edit2, Trash2, X, Loader2,
  TrendingDown, TrendingUp, Calendar, FileText, ChevronRight,
  PieChart, BarChart3, Check, ArrowUpRight, ArrowDownRight,
  ShieldAlert, Layers, Receipt, CreditCard
} from "lucide-react";
import ConfirmModal from "./ui/confirm-modal";

interface FinanzasProps {
  online: boolean;
  activeSucursalId?: string;
  sucursales?: { id: string; name: string; isMatriz: boolean }[];
  userRole?: string;
}

export type GastoCategoriaKey =
  | 'SERVICIOS_BASICOS'
  | 'ARRIENDOS'
  | 'PERSONAL_NOMINA'
  | 'LOGISTICA_ENVIOS'
  | 'SUMINISTROS_LOCAL'
  | 'MARKETING_PUBLICIDAD'
  | 'MANTENIMIENTO_REPARACIONES'
  | 'FINANCIERO_BANCARIO'
  | 'OTRO';

export interface GastoItem {
  id: string;
  tenantId: string;
  sucursalNombre?: string;
  categoria: GastoCategoriaKey;
  descripcion: string;
  monto: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE' | 'OTRO';
  fechaGasto: string;
  comprobanteRef?: string;
  proveedorServicio?: string;
  comprobanteUrl?: string;
  observaciones?: string;
  orderId?: string;
  order?: {
    id: string;
    numeroPedido: number;
    clienteNombre: string;
    total: number;
    asumeFlete?: 'EMPRESA' | 'CLIENTE' | 'NO_APLICA';
    costoEnvio?: number;
    empresaEnvio?: string;
    guiaEnvio?: string;
  };
  user?: {
    id: string;
    nombre: string;
    email?: string;
  };
  createdAt?: string;
}

export interface FleteEnvioItem {
  id: string;
  orderId: string;
  numeroPedido: number;
  clienteNombre: string;
  clienteTelefono?: string;
  destino?: string;
  sucursalNombre: string;
  empresaEnvio: string;
  guiaEnvio?: string;
  costoEnvio: number;
  asumeFlete: 'EMPRESA' | 'CLIENTE' | 'NO_APLICA';
  fecha: string;
  estadoPedido?: string;
}

export interface EstadisticasGastos {
  totalMonto: number;
  totalCantidad: number;
  fletesEmpresaMonto: number;
  fletesEmpresaCantidad: number;
  porCategoria: {
    categoria: GastoCategoriaKey;
    totalMonto: number;
    cantidad: number;
    porcentaje: number;
  }[];
  porSucursal?: {
    sucursalId: string;
    sucursalNombre: string;
    totalMonto: number;
    cantidad: number;
  }[];
  comparativaMesAnterior?: {
    totalMesAnterior: number;
    diferenciaMonto: number;
    porcentajeCambio: number;
    incremento: boolean;
  };
}

export const GASTO_CATEGORIAS: Record<GastoCategoriaKey, { label: string; icon: any; color: string; bg: string; border: string }> = {
  SERVICIOS_BASICOS: {
    label: 'Servicios Básicos (Luz/Agua/Net)',
    icon: Lightbulb,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  ARRIENDOS: {
    label: 'Arriendo de Local / Bodega',
    icon: Home,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  PERSONAL_NOMINA: {
    label: 'Nómina & Pago a Empleados',
    icon: Users,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  LOGISTICA_ENVIOS: {
    label: 'Logística & Fletes Envíos',
    icon: Truck,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  SUMINISTROS_LOCAL: {
    label: 'Suministros & Empaque Calzado',
    icon: Package,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  MANTENIMIENTO_REPARACIONES: {
    label: 'Mantenimiento & Local',
    icon: Wrench,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  MARKETING_PUBLICIDAD: {
    label: 'Marketing & Publicidad',
    icon: PieChart,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  FINANCIERO_BANCARIO: {
    label: 'Comisiones & Gastos Bancarios',
    icon: CreditCard,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  OTRO: {
    label: 'Otros Gastos Operativos',
    icon: Wallet,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
  },
};

export const METODOS_PAGO_GASTO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia Bancaria',
  TARJETA: 'Tarjeta Débito/Crédito',
  CHEQUE: 'Cheque Comercial',
  OTRO: 'Otro Medio',
};

const PRESETS_GASTOS: { label: string; categoria: GastoCategoriaKey; concepto: string; icon: string }[] = [
  { label: 'Luz Eléctrica (EEASA / CNEL)', categoria: 'SERVICIOS_BASICOS', concepto: 'Planilla de luz eléctrica del local', icon: '💡' },
  { label: 'Agua Potable', categoria: 'SERVICIOS_BASICOS', concepto: 'Planilla de agua potable del local', icon: '💧' },
  { label: 'Internet / WiFi Local', categoria: 'SERVICIOS_BASICOS', concepto: 'Servicio mensual de internet y conectividad', icon: '🌐' },
  { label: 'Arriendo de Local Comercial', categoria: 'ARRIENDOS', concepto: 'Canon de arriendo mensual del local', icon: '🏢' },
  { label: 'Pago de Nómina / Sueldo Empleado', categoria: 'PERSONAL_NOMINA', concepto: 'Pago de sueldo/jornal a empleado de calzado', icon: '👥' },
  { label: 'Anticipo de Sueldo', categoria: 'PERSONAL_NOMINA', concepto: 'Anticipo de sueldo a personal', icon: '💵' },
  { label: 'Cajas y Fundas de Empaque', categoria: 'SUMINISTROS_LOCAL', concepto: 'Compra de cajas de calzado y fundas comerciales', icon: '📦' },
  { label: 'Flete Transporte Los Andes', categoria: 'LOGISTICA_ENVIOS', concepto: 'Flete de envío de pedido por Transporte Los Andes', icon: '🚚' },
  { label: 'Mantenimiento de Vitrinas / Local', categoria: 'MANTENIMIENTO_REPARACIONES', concepto: 'Mantenimiento e iluminación de vitrinas de exhibición', icon: '🛠️' },
];

export default function FinanzasComponent({ online, activeSucursalId = 'TODAS', sucursales = [] }: FinanzasProps) {
  // Pestañas principales
  const [vista, setVista] = useState<'LIBRO_GASTOS' | 'FLETES_ENVIOS' | 'COMPARATIVA_SUCURSALES'>('LIBRO_GASTOS');

  // Estados de datos
  const [gastosList, setGastosList] = useState<GastoItem[]>([]);
  const [gastosStats, setGastosStats] = useState<EstadisticasGastos | null>(null);
  const [pedidosFletes, setPedidosFletes] = useState<FleteEnvioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtros de fecha y categoría
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [filtroMes, setFiltroMes] = useState<number>(currentMonth);
  const [filtroAnio, setFiltroAnio] = useState<number>(currentYear);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [filtroMetodoPago, setFiltroMetodoPago] = useState<string>('TODOS');
  const [filtroFleteAsume, setFiltroFleteAsume] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Modal de Crear / Editar Gasto
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [editingGastoId, setEditingGastoId] = useState<string | null>(null);
  const [savingGasto, setSavingGasto] = useState(false);
  const [gastoForm, setGastoForm] = useState({
    sucursalId: '',
    categoria: 'SERVICIOS_BASICOS' as GastoCategoriaKey,
    concepto: '',
    monto: '',
    metodoPago: 'EFECTIVO' as 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE' | 'OTRO',
    proveedorServicio: '',
    numeroComprobante: '',
    observaciones: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  // Modal de Confirmación UI
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    loadFinanzasData();
  }, [online, activeSucursalId, filtroMes, filtroAnio]);

  const loadFinanzasData = async () => {
    setLoading(true);
    setError('');
    try {
      if (online) {
        const queryParams = new URLSearchParams();
        queryParams.set('mes', filtroMes.toString());
        queryParams.set('anio', filtroAnio.toString());
        if (activeSucursalId && activeSucursalId !== 'TODAS') {
          queryParams.set('sucursalId', activeSucursalId);
        }

        const [gastosRes, statsRes, pedidosRes] = await Promise.all([
          ApiService.get(`/gastos?${queryParams.toString()}`).catch(() => []),
          ApiService.get(`/gastos/stats?${queryParams.toString()}`).catch(() => null),
          ApiService.get(`/pedidos?limit=100`).catch(() => []),
        ]);

        const rawGastos = Array.isArray(gastosRes) ? gastosRes : [];
        setGastosList(rawGastos);
        setGastosStats(statsRes || null);

        // Procesar pedidos con envíos/fletes
        const rawPedidos = Array.isArray(pedidosRes) ? pedidosRes : (pedidosRes?.pedidos || []);
        const fletesList: FleteEnvioItem[] = rawPedidos
          .filter((p: any) => p.costoEnvio && Number(p.costoEnvio) > 0)
          .map((p: any) => ({
            id: p.id,
            orderId: p.id,
            numeroPedido: p.numeroPedido || p.numero || 0,
            clienteNombre: `${p.cliente?.nombre || ''} ${p.cliente?.apellido || ''}`.trim() || p.clienteNombre || 'Cliente Comercial',
            clienteTelefono: p.cliente?.telefono || p.clienteTelefono,
            destino: p.direccionEntrega || p.cliente?.direccion || 'Cevallos / Despacho Los Andes',
            sucursalNombre: p.sucursalNombre || p.tenant?.name || 'Matriz',
            empresaEnvio: p.empresaEnvio || 'Transporte Los Andes',
            guiaEnvio: p.guiaEnvio || 'S/G',
            costoEnvio: Number(p.costoEnvio) || 0,
            asumeFlete: p.asumeFlete || 'NO_APLICA',
            fecha: p.createdAt || p.fecha || new Date().toISOString(),
            estadoPedido: p.estado || 'PENDIENTE',
          }));
        setPedidosFletes(fletesList);
      }
    } catch (err: any) {
      console.error('Error cargando finanzas:', err);
      setError(err.message || 'No se pudieron cargar los datos financieros.');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de nuevo gasto
  const handleAbrirNuevoGasto = () => {
    setEditingGastoId(null);
    const defaultSucursal = activeSucursalId !== 'TODAS' ? activeSucursalId : (sucursales[0]?.id || '');
    setGastoForm({
      sucursalId: defaultSucursal,
      categoria: 'SERVICIOS_BASICOS',
      concepto: '',
      monto: '',
      metodoPago: 'EFECTIVO',
      proveedorServicio: '',
      numeroComprobante: '',
      observaciones: '',
      fecha: new Date().toISOString().split('T')[0],
    });
    setShowGastoModal(true);
  };

  // Abrir modal de editar gasto
  const handleAbrirEditarGasto = (g: GastoItem) => {
    setEditingGastoId(g.id);
    setGastoForm({
      sucursalId: g.tenantId || (sucursales[0]?.id || ''),
      categoria: g.categoria || 'SERVICIOS_BASICOS',
      concepto: g.descripcion || '',
      monto: g.monto ? g.monto.toString() : '',
      metodoPago: g.metodoPago || 'EFECTIVO',
      proveedorServicio: g.proveedorServicio || '',
      numeroComprobante: g.comprobanteRef || '',
      observaciones: g.observaciones || '',
      fecha: g.fechaGasto ? g.fechaGasto.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowGastoModal(true);
  };

  // Aplicar sugerencia rápida
  const handleAplicarPreset = (preset: typeof PRESETS_GASTOS[0]) => {
    setGastoForm((prev) => ({
      ...prev,
      categoria: preset.categoria,
      concepto: preset.concepto,
    }));
  };

  // Guardar Gasto
  const handleGuardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(gastoForm.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('Por favor ingresa un monto válido mayor a $0.00');
      return;
    }
    if (!gastoForm.concepto.trim()) {
      setError('El concepto o descripción del gasto es obligatorio');
      return;
    }

    setSavingGasto(true);
    setError('');
    try {
      const payload: any = {
        categoria: gastoForm.categoria,
        concepto: gastoForm.concepto.trim(),
        monto: montoNum,
        metodoPago: gastoForm.metodoPago,
        fecha: gastoForm.fecha,
        numeroComprobante: gastoForm.numeroComprobante.trim() || undefined,
        proveedorServicio: gastoForm.proveedorServicio.trim() || undefined,
        observaciones: gastoForm.observaciones.trim() || undefined,
      };

      if (gastoForm.sucursalId) {
        payload.sucursalId = gastoForm.sucursalId;
      }

      if (editingGastoId) {
        await ApiService.put(`/gastos/${editingGastoId}`, payload);
        setSuccess('Gasto actualizado correctamente.');
      } else {
        await ApiService.post('/gastos', payload);
        setSuccess('Gasto operativo registrado con éxito.');
      }

      setShowGastoModal(false);
      await loadFinanzasData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el gasto operativo.');
    } finally {
      setSavingGasto(false);
    }
  };

  // Eliminar Gasto
  const handleEliminarGasto = (id: string, concepto: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Gasto Operativo',
      message: `¿Estás seguro de que deseas anular y eliminar el gasto "${concepto}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      danger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await ApiService.delete(`/gastos/${id}`);
          setSuccess('Gasto eliminado de los registros.');
          await loadFinanzasData();
          setTimeout(() => setSuccess(''), 4000);
        } catch (err: any) {
          setError(err.message || 'Error al eliminar el gasto.');
        }
      },
    });
  };

  // Filtrado de gastos en tabla
  const gastosFiltrados = useMemo(() => {
    return gastosList.filter((g) => {
      // Filtro por categoría
      if (filtroCategoria !== 'TODOS' && g.categoria !== filtroCategoria) return false;
      // Filtro por método de pago
      if (filtroMetodoPago !== 'TODOS' && g.metodoPago !== filtroMetodoPago) return false;
      // Búsqueda de texto
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const desc = (g.descripcion || '').toLowerCase();
        const comp = (g.comprobanteRef || '').toLowerCase();
        const prov = (g.proveedorServicio || '').toLowerCase();
        const obs = (g.observaciones || '').toLowerCase();
        const cat = (GASTO_CATEGORIAS[g.categoria]?.label || g.categoria || '').toLowerCase();
        if (!desc.includes(q) && !comp.includes(q) && !prov.includes(q) && !obs.includes(q) && !cat.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [gastosList, filtroCategoria, filtroMetodoPago, busqueda]);

  // Filtrado de fletes
  const fletesFiltrados = useMemo(() => {
    return pedidosFletes.filter((f) => {
      if (filtroFleteAsume !== 'TODOS' && f.asumeFlete !== filtroFleteAsume) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const cli = f.clienteNombre.toLowerCase();
        const emp = f.empresaEnvio.toLowerCase();
        const guia = (f.guiaEnvio || '').toLowerCase();
        const num = f.numeroPedido.toString();
        if (!cli.includes(q) && !emp.includes(q) && !guia.includes(q) && !num.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [pedidosFletes, filtroFleteAsume, busqueda]);

  // Resumen de Fletes
  const resumenFletes = useMemo(() => {
    let totalEmpresa = 0;
    let totalCliente = 0;
    let cantEmpresa = 0;
    let cantCliente = 0;

    pedidosFletes.forEach((f) => {
      if (f.asumeFlete === 'EMPRESA') {
        totalEmpresa += f.costoEnvio;
        cantEmpresa++;
      } else {
        totalCliente += f.costoEnvio;
        cantCliente++;
      }
    });

    return { totalEmpresa, totalCliente, cantEmpresa, cantCliente, totalGeneral: totalEmpresa + totalCliente };
  }, [pedidosFletes]);

  const nombreSucursalActiva = useMemo(() => {
    if (activeSucursalId === 'TODAS') return 'Todas las Sucursales (Consolidado)';
    const found = sucursales.find((s) => s.id === activeSucursalId);
    return found ? (found.isMatriz ? `🏢 Matriz: ${found.name}` : `🏪 Sucursal: ${found.name}`) : 'Sucursal Actual';
  }, [activeSucursalId, sucursales]);

  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header & Navegación Financiera ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-xl tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <span>Finanzas & Gastos por Sucursal</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
              <Building size={12} /> {nombreSucursalActiva}
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 font-medium">
            Control exhaustivo de egresos fijos, servicios básicos, nómina de personal, logística y balance operativo
          </p>
        </div>

        {/* Selector de Período y Botón de Nuevo Gasto */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-transparent text-xs font-bold text-[var(--foreground)] focus:outline-none cursor-pointer"
            >
              {mesesNombres.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(Number(e.target.value))}
              className="px-2 py-1.5 bg-transparent text-xs font-bold text-[var(--foreground)] focus:outline-none cursor-pointer border-l border-[var(--border)]"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={loadFinanzasData}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Recargar finanzas"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleAbrirNuevoGasto}
            className="px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Plus size={16} />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs rounded-2xl animate-in fade-in">
          <CheckCircle size={16} className="shrink-0" />
          <span className="font-bold">{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-2xl animate-in fade-in">
          <AlertCircle size={16} className="shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {/* ─── Tarjetas de Resumen KPI ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Gastos del Mes */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Total Egresos (Mes)</span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <Wallet size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-500 font-mono">
              ${(gastosStats?.totalMonto ?? 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">
              ({gastosStats?.totalCantidad ?? 0} registros)
            </span>
          </div>
          <div className="mt-2 text-[10px] text-[var(--muted-foreground)] flex items-center gap-1">
            <Calendar size={11} />
            <span>{mesesNombres[filtroMes]} {filtroAnio}</span>
          </div>
        </div>

        {/* Servicios Básicos & Arriendos */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Luz, Agua & Arriendos</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Lightbulb size={16} />
            </div>
          </div>
          {(() => {
            const serv = gastosStats?.porCategoria?.find((c) => c.categoria === 'SERVICIOS_BASICOS')?.totalMonto || 0;
            const arr = gastosStats?.porCategoria?.find((c) => c.categoria === 'ARRIENDOS')?.totalMonto || 0;
            const sum = serv + arr;
            return (
              <>
                <div className="text-2xl font-black text-blue-600 font-mono">${sum.toFixed(2)}</div>
                <div className="mt-2 text-[10px] text-[var(--muted-foreground)] flex items-center justify-between">
                  <span>Luz/Agua: ${serv.toFixed(2)}</span>
                  <span>Arriendos: ${arr.toFixed(2)}</span>
                </div>
              </>
            );
          })()}
        </div>

        {/* Nómina & Personal */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Nómina & Empleados</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Users size={16} />
            </div>
          </div>
          {(() => {
            const nom = gastosStats?.porCategoria?.find((c) => c.categoria === 'PERSONAL_NOMINA');
            const montoNom = nom?.totalMonto || 0;
            return (
              <>
                <div className="text-2xl font-black text-purple-600 font-mono">${montoNom.toFixed(2)}</div>
                <div className="mt-2 text-[10px] text-[var(--muted-foreground)] flex items-center gap-1">
                  <span>{nom?.cantidad || 0} pagos registrados este mes</span>
                </div>
              </>
            );
          })()}
        </div>

        {/* Fletes & Logística Asumidos */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Fletes Pagados x Empresa</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Truck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            ${(resumenFletes.totalEmpresa ?? 0).toFixed(2)}
          </div>
          <div className="mt-2 text-[10px] text-[var(--muted-foreground)] flex items-center justify-between">
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{resumenFletes.cantEmpresa} envíos asumidos</span>
            <span className="text-blue-600">({resumenFletes.cantCliente} pagados x cliente)</span>
          </div>
        </div>
      </div>

      {/* ─── Pestañas de Navegación del Módulo ─── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl">
          <button
            onClick={() => setVista('LIBRO_GASTOS')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              vista === 'LIBRO_GASTOS' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Wallet size={14} />
            <span>Libro Diario de Gastos ({gastosList.length})</span>
          </button>

          <button
            onClick={() => setVista('FLETES_ENVIOS')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
              vista === 'FLETES_ENVIOS' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Truck size={14} />
            <span>Auditoría de Envíos & Fletes ({pedidosFletes.length})</span>
          </button>

          {activeSucursalId === 'TODAS' && sucursales.length > 1 && (
            <button
              onClick={() => setVista('COMPARATIVA_SUCURSALES')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                vista === 'COMPARATIVA_SUCURSALES' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <BarChart3 size={14} />
              <span>Comparativa por Sucursal</span>
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* VISTA 1: LIBRO DIARIO DE GASTOS OPERATIVOS                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {vista === 'LIBRO_GASTOS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Desglose Rápido por Categorías */}
          {gastosStats && gastosStats.porCategoria && gastosStats.porCategoria.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {gastosStats.porCategoria.map((cat) => {
                const catConfig = GASTO_CATEGORIAS[cat.categoria] || {
                  label: cat.categoria,
                  color: 'text-slate-600',
                  bg: 'bg-slate-500/10',
                  border: 'border-slate-500/20',
                };
                const isSelected = filtroCategoria === cat.categoria;
                return (
                  <button
                    key={cat.categoria}
                    onClick={() => setFiltroCategoria(isSelected ? 'TODOS' : cat.categoria)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0F172A] border-transparent text-white shadow-sm'
                        : `${catConfig.bg} ${catConfig.border} hover:opacity-90`
                    }`}
                  >
                    <span className={`text-[10px] font-bold block truncate ${isSelected ? 'text-white/80' : catConfig.color}`}>
                      {catConfig.label}
                    </span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-[var(--foreground)]'} font-mono`}>
                        ${(cat.totalMonto ?? 0).toFixed(2)}
                      </span>
                      <span className={`text-[9px] font-bold ${isSelected ? 'text-white/60' : 'text-[var(--muted-foreground)]'}`}>
                        {(cat.porcentaje ?? 0).toFixed(0)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Barra de Búsqueda y Filtros de Tabla */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Buscar por concepto, comprobante, proveedor o nota..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#0F172A] shadow-xs"
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

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--foreground)] focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todas las Categorías</option>
                {Object.entries(GASTO_CATEGORIAS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>

              <select
                value={filtroMetodoPago}
                onChange={(e) => setFiltroMetodoPago(e.target.value)}
                className="px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--foreground)] focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todos los Métodos</option>
                {Object.entries(METODOS_PAGO_GASTO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              {(filtroCategoria !== 'TODOS' || filtroMetodoPago !== 'TODOS' || busqueda) && (
                <button
                  onClick={() => {
                    setFiltroCategoria('TODOS');
                    setFiltroMetodoPago('TODOS');
                    setBusqueda('');
                  }}
                  className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-xs font-bold text-[var(--muted-foreground)] hover:border-[#0F172A] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Filter size={12} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Gastos */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <Loader2 className="animate-spin text-[#0F172A] mb-3" size={32} />
              <span className="text-xs font-bold">Cargando registros de egresos...</span>
            </div>
          ) : gastosFiltrados.length === 0 ? (
            <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2 border-dashed">
              <Wallet size={40} className="mx-auto text-[var(--muted-foreground)]/30 mb-2" />
              <p className="text-sm font-bold">No se encontraron gastos registrados</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {busqueda ? `No hay coincidencias para "${busqueda}"` : 'Utiliza el botón "+ Registrar Gasto" para ingresar el primer egreso del mes.'}
              </p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--muted)]/40 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    <tr>
                      <th className="px-4 py-3.5">Concepto / Detalle</th>
                      <th className="px-4 py-3.5">Categoría</th>
                      {activeSucursalId === 'TODAS' && (
                        <th className="px-4 py-3.5 text-center">Sucursal</th>
                      )}
                      <th className="px-4 py-3.5 text-center">Método Pago</th>
                      <th className="px-4 py-3.5 text-right">Monto ($ USD)</th>
                      <th className="px-4 py-3.5 text-center">Fecha</th>
                      <th className="px-4 py-3.5">Comprobante / Prov.</th>
                      <th className="px-4 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {gastosFiltrados.map((g) => {
                      const catCfg = GASTO_CATEGORIAS[g.categoria] || {
                        label: g.categoria,
                        color: 'text-slate-600',
                        bg: 'bg-slate-500/10',
                        border: 'border-slate-500/20',
                      };
                      const IconCat = catCfg.icon || Wallet;
                      const metodoPagoLabel = METODOS_PAGO_GASTO[g.metodoPago] || g.metodoPago;
                      const fechaDisplay = g.fechaGasto
                        ? new Date(g.fechaGasto).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—';
                      const esFleteAuto = g.categoria === 'LOGISTICA_ENVIOS' && g.orderId;

                      return (
                        <tr key={g.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-extrabold text-xs text-[var(--foreground)] flex items-center gap-1.5">
                              <span>{g.descripcion}</span>
                            </div>
                            {esFleteAuto && g.order && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Truck size={11} className="text-emerald-500 shrink-0" />
                                <span className="text-[10px] text-emerald-600 font-bold">
                                  Auto-generado — Pedido #{g.order.numeroPedido} ({g.order.clienteNombre})
                                </span>
                              </div>
                            )}
                            {g.observaciones && (
                              <span className="text-[10px] text-[var(--muted-foreground)] block mt-0.5 max-w-[260px] truncate">
                                📝 {g.observaciones}
                              </span>
                            )}
                            {g.user && (
                              <span className="text-[9px] text-[var(--muted-foreground)]/80 block mt-0.5">
                                Registrado por: {g.user.nombre}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${catCfg.bg} ${catCfg.border} ${catCfg.color}`}>
                              <IconCat size={11} />
                              <span>{catCfg.label}</span>
                            </span>
                          </td>

                          {activeSucursalId === 'TODAS' && (
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
                                <Building size={11} className="shrink-0" />
                                <span>{g.sucursalNombre || 'Matriz'}</span>
                              </span>
                            </td>
                          )}

                          <td className="px-4 py-3.5 text-center">
                            <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
                              {metodoPagoLabel}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <span className="text-sm font-black text-orange-500 font-mono">
                              ${Number(g.monto ?? 0).toFixed(2)}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="text-[11px] font-semibold text-[var(--muted-foreground)] font-mono">
                              {fechaDisplay}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-[11px] font-bold text-[var(--foreground)] truncate max-w-[140px]">
                              {g.proveedorServicio || '—'}
                            </div>
                            {g.comprobanteRef && (
                              <span className="text-[10px] text-[var(--muted-foreground)] block truncate font-mono">
                                Comp: {g.comprobanteRef}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleAbrirEditarGasto(g)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                title="Editar Gasto"
                              >
                                <Edit2 size={13} />
                              </button>
                              {!esFleteAuto && (
                                <button
                                  onClick={() => handleEliminarGasto(g.id, g.descripcion)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Eliminar Gasto"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
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

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* VISTA 2: AUDITORÍA DE ENVÍOS & FLETES (EMPRESA VS CLIENTE)       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {vista === 'FLETES_ENVIOS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Tarjeta de Resumen Logístico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Fletes Pagados por la Empresa</span>
                <Truck size={16} className="text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-600 font-mono">${(resumenFletes.totalEmpresa ?? 0).toFixed(2)}</div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">
                {resumenFletes.cantEmpresa} envíos donde el negocio cubrió el transporte (Costo Operativo)
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase">Fletes Pagados por el Cliente</span>
                <Users size={16} className="text-blue-600" />
              </div>
              <div className="text-xl font-black text-blue-600 font-mono">${(resumenFletes.totalCliente ?? 0).toFixed(2)}</div>
              <p className="text-[10px] text-blue-700 dark:text-blue-400 mt-1">
                {resumenFletes.cantCliente} envíos cobrados directamente al comprador en nota de pedido
              </p>
            </div>

            <div className="bg-slate-500/10 border border-slate-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Movimiento Logístico Total</span>
                <Layers size={16} className="text-[var(--foreground)]" />
              </div>
              <div className="text-xl font-black text-[var(--foreground)] font-mono">${(resumenFletes.totalGeneral ?? 0).toFixed(2)}</div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                {pedidosFletes.length} despachos despachados por encomienda / transporte
              </p>
            </div>
          </div>

          {/* Filtros de Fletes */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Buscar por cliente, pedido #, empresa de transporte o guía..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filtroFleteAsume}
                onChange={(e) => setFiltroFleteAsume(e.target.value)}
                className="px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--foreground)] focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todos los Fletes</option>
                <option value="EMPRESA">🟢 Pagados por la Empresa</option>
                <option value="CLIENTE">🔵 Pagados por el Cliente</option>
              </select>
            </div>
          </div>

          {/* Tabla de Fletes */}
          {fletesFiltrados.length === 0 ? (
            <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2 border-dashed">
              <Truck size={40} className="mx-auto text-[var(--muted-foreground)]/30 mb-2" />
              <p className="text-sm font-bold">No hay registros de fletes en este período</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Los fletes se generan automáticamente al registrar pedidos comerciales con envío por encomienda.
              </p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--muted)]/40 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    <tr>
                      <th className="px-4 py-3.5">Pedido / Destinatario</th>
                      <th className="px-4 py-3.5">Transporte & Guía</th>
                      {activeSucursalId === 'TODAS' && (
                        <th className="px-4 py-3.5 text-center">Sucursal</th>
                      )}
                      <th className="px-4 py-3.5 text-center">¿Quién asumió el flete?</th>
                      <th className="px-4 py-3.5 text-right">Costo Flete ($)</th>
                      <th className="px-4 py-3.5 text-center">Fecha Despacho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {fletesFiltrados.map((f) => {
                      const esEmpresa = f.asumeFlete === 'EMPRESA';
                      return (
                        <tr key={f.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-extrabold text-xs text-[var(--foreground)]">
                              Pedido #{f.numeroPedido} — {f.clienteNombre}
                            </div>
                            <span className="text-[10px] text-[var(--muted-foreground)] block mt-0.5">
                              📍 Destino: {f.destino} {f.clienteTelefono ? `· Tel: ${f.clienteTelefono}` : ''}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-xs text-[var(--foreground)] flex items-center gap-1">
                              <Truck size={12} className="text-amber-600 shrink-0" />
                              <span>{f.empresaEnvio}</span>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--muted-foreground)] block mt-0.5">
                              Guía: {f.guiaEnvio || 'Sin guía registrada'}
                            </span>
                          </td>

                          {activeSucursalId === 'TODAS' && (
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                <Building size={11} />
                                <span>{f.sucursalNombre}</span>
                              </span>
                            </td>
                          )}

                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${
                              esEmpresa
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                            }`}>
                              {esEmpresa ? '🏢 Empresa Pagó el Envío' : '👤 Cliente Pagó el Envío'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono">
                            <span className={`text-sm font-black ${esEmpresa ? 'text-emerald-600' : 'text-blue-600'}`}>
                              ${(f.costoEnvio ?? 0).toFixed(2)}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center font-mono text-[11px] text-[var(--muted-foreground)]">
                            {new Date(f.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
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

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* VISTA 3: COMPARATIVA CONSOLIDADA MULTI-SUCURSAL                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {vista === 'COMPARATIVA_SUCURSALES' && activeSucursalId === 'TODAS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--foreground)] flex items-center gap-2">
                <BarChart3 size={16} className="text-amber-500" />
                <span>Distribución de Costos Operativos por Sucursal</span>
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Comparativa de egresos para identificar la rentabilidad y eficiencia de cada punto de venta
              </p>
            </div>

            {/* Tarjetas comparativas por sucursal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {sucursales.map((suc) => {
                const gastosSucursal = gastosList.filter((g) => g.tenantId === suc.id || g.sucursalNombre === suc.name);
                const totalMonto = gastosSucursal.reduce((acc, g) => acc + Number(g.monto || 0), 0);
                const porcentaje = gastosStats?.totalMonto ? (totalMonto / gastosStats.totalMonto) * 100 : 0;

                return (
                  <div key={suc.id} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[var(--foreground)] flex items-center gap-1.5">
                        <Building size={14} className="text-amber-600" />
                        <span>{suc.name}</span>
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${suc.isMatriz ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                        {suc.isMatriz ? 'Matriz' : 'Sucursal'}
                      </span>
                    </div>

                    <div>
                      <div className="text-xl font-black text-orange-500 font-mono">${totalMonto.toFixed(2)}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                        {gastosSucursal.length} egresos ({porcentaje.toFixed(1)}% del total global)
                      </div>
                    </div>

                    {/* Barra de progreso visual */}
                    <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-orange-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(porcentaje, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: REGISTRAR / EDITAR GASTO OPERATIVO                        */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showGastoModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header del Modal */}
            <div className="p-5 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {editingGastoId ? 'Editar Gasto Operativo' : 'Registrar Gasto Operativo'}
                  </h3>
                  <p className="text-[10px] text-slate-300">Control de egresos, servicios, nómina y mantenimiento</p>
                </div>
              </div>
              <button
                onClick={() => setShowGastoModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Presets Rápidos */}
            {!editingGastoId && (
              <div className="px-5 pt-3.5 pb-1 shrink-0 bg-[var(--muted)]/20 border-b border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block mb-1.5">
                  Sugerencias Rápidas para Negocios de Calzado:
                </span>
                <div className="flex flex-wrap gap-1.5 pb-2 overflow-x-auto">
                  {PRESETS_GASTOS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleAplicarPreset(p)}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-[var(--card)] border border-[var(--border)] hover:border-amber-500 hover:text-amber-600 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleGuardarGasto} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Sucursal (visible si está en TODAS o multi-sucursal) */}
              {sucursales.length > 1 && (
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    Sucursal Imputada *
                  </label>
                  <select
                    value={gastoForm.sucursalId}
                    onChange={(e) => setGastoForm({ ...gastoForm, sucursalId: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--foreground)] focus:outline-none focus:border-[#0F172A]"
                    required
                  >
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.isMatriz ? '🏢 Matriz: ' : '🏪 Sucursal: '} {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Categoría y Monto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    Categoría del Gasto *
                  </label>
                  <select
                    value={gastoForm.categoria}
                    onChange={(e) => setGastoForm({ ...gastoForm, categoria: e.target.value as GastoCategoriaKey })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                    required
                  >
                    {Object.entries(GASTO_CATEGORIAS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    Monto ($ USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-orange-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={gastoForm.monto}
                      onChange={(e) => setGastoForm({ ...gastoForm, monto: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-mono font-black focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Concepto / Descripción */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  Concepto / Descripción del Egreso *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pago de planilla de luz mes de Agosto, Sueldo vendedor quincena..."
                  value={gastoForm.concepto}
                  onChange={(e) => setGastoForm({ ...gastoForm, concepto: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  required
                />
              </div>

              {/* Método de Pago y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    Método de Pago *
                  </label>
                  <select
                    value={gastoForm.metodoPago}
                    onChange={(e) => setGastoForm({ ...gastoForm, metodoPago: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  >
                    {Object.entries(METODOS_PAGO_GASTO).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    Fecha del Gasto
                  </label>
                  <input
                    type="date"
                    value={gastoForm.fecha}
                    onChange={(e) => setGastoForm({ ...gastoForm, fecha: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              {/* Proveedor / Empleado y Comprobante */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    Beneficiario / Proveedor / Empleado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: EEASA, Arrendador, Juan Pérez (Vendedor)..."
                    value={gastoForm.proveedorServicio}
                    onChange={(e) => setGastoForm({ ...gastoForm, proveedorServicio: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    N° Comprobante / Recibo / Ref
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: REC-00234, Factura 001-002-1234"
                    value={gastoForm.numeroComprobante}
                    onChange={(e) => setGastoForm({ ...gastoForm, numeroComprobante: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-mono focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                  Observaciones / Notas Adicionales (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el egreso, número de cheque o acuerdo con el beneficiario..."
                  value={gastoForm.observaciones}
                  onChange={(e) => setGastoForm({ ...gastoForm, observaciones: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F172A] resize-none"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowGastoModal(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGasto}
                  className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingGasto ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  <span>{editingGastoId ? 'Guardar Cambios' : 'Registrar Gasto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación UI */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
