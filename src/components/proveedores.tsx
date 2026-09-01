"use client";

import { useState, useEffect, useMemo } from 'react';
import { ApiService } from '../services/api.service';
import { db } from '../db/local-db';
import {
  Truck,
  Plus,
  Loader2,
  CheckCircle,
  Clock,
  Trash2,
  Tag,
  Calendar,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  FileText,
  AlertTriangle,
  Search,
  DollarSign,
  Receipt,
  Eye,
  Edit3,
  Send,
  X,
  CreditCard,
  Building,
  ArrowRight,
  Package,
  History,
  CheckCircle2,
  AlertCircle,
  Filter,
  Layers,
  ChevronRight,
  Image as ImageIcon,
  Save,
  Ban,
} from 'lucide-react';
import { useToast } from './ui/toast';

interface ProveedoresProps {
  online: boolean;
  userRole?: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  razonSocial: string;
  ruc: string;
  contacto?: string;
  direccion?: string;
  email?: string;
  activo?: boolean;
  totalCompras?: number;
  totalPagado?: number;
  saldoPendiente?: number;
  ordenesPendientes?: number;
  totalOrdenes?: number;
  totalEntregas?: number;
}

interface OrdenCompraLine {
  id?: string;
  productId: string;
  cantidadPedida: number;
  precioCosto: number;
  subtotal?: number;
  observacionLinea?: string;
  producto?: {
    id: string;
    nombre: string;
    marca?: string;
    codigo: string;
    color?: string;
    imageUrl?: string;
    serie?: string;
  };
}

interface OrdenCompra {
  id: string;
  numero: number;
  supplierId: string;
  total: number;
  estado: 'BORRADOR' | 'PENDIENTE' | 'RECIBIDA_PARCIAL' | 'RECIBIDA' | 'CANCELADA';
  observaciones?: string;
  createdAt: string;
  updatedAt?: string;
  totalLineas?: number;
  lines?: OrdenCompraLine[];
  supplier?: {
    id: string;
    nombre: string;
    razonSocial: string;
    ruc: string;
    contacto?: string;
  };
}

interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierOrderId?: string;
  monto: number;
  metodo: string;
  comprobante?: string;
  banco?: string;
  notas?: string;
  createdAt: string;
  supplier?: {
    nombre: string;
    ruc: string;
  };
}

interface EntradaMercancia {
  id: string;
  numero: number;
  supplierOrderId?: string;
  supplierId: string;
  total: number;
  fechaIngreso: string;
  observaciones?: string;
  estado: string;
  supplier?: { nombre: string; ruc: string };
  supplierOrder?: { numero: number };
}

export default function ProveedoresComponent({ online, userRole }: ProveedoresProps) {
  const { showToast } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [pagos, setPagos] = useState<SupplierPayment[]>([]);
  const [entradas, setEntradas] = useState<EntradaMercancia[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'proveedores' | 'ordenes' | 'ingreso' | 'pagos'>('proveedores');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Filtros y búsquedas
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstadoOrden, setFiltroEstadoOrden] = useState<string>('TODOS');

  // Modales
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrdenCompra | null>(null);
  const [editingOrder, setEditingOrder] = useState(false);

  // Modal Cuenta Corriente / Master-Detail Proveedor
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [cuentaCorrienteData, setCuentaCorrienteData] = useState<any | null>(null);
  const [loadingCuenta, setLoadingCuenta] = useState(false);

  // Modal Registrar Pago / Abono
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSupplierId, setPaymentSupplierId] = useState('');
  const [paymentOrderId, setPaymentOrderId] = useState('');
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('TRANSFERENCIA');
  const [bancoPago, setBancoPago] = useState('');
  const [comprobantePago, setComprobantePago] = useState('');
  const [notasPago, setNotasPago] = useState('');

  // Form: Nuevo Proveedor
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [contacto, setContacto] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');

  // Form: Nueva Orden
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderObservaciones, setOrderObservaciones] = useState('');
  const [orderEstadoInicial, setOrderEstadoInicial] = useState<'BORRADOR' | 'PENDIENTE'>('BORRADOR');
  const [orderLines, setOrderLines] = useState<Array<{ productId: string; cantidadPedida: number; precioCosto: number; observacionLinea?: string }>>([
    { productId: '', cantidadPedida: 1, precioCosto: 0, observacionLinea: '' },
  ]);

  // Form: Nuevo Ingreso
  const [entrySupplierId, setEntrySupplierId] = useState('');
  const [entryOrderId, setEntryOrderId] = useState('');
  const [entryObservaciones, setEntryObservaciones] = useState('');
  const [entryLines, setEntryLines] = useState<Array<{
    productId: string;
    tallaId: string;
    cantidadIngresada: number;
    cantidadEsperada?: number;
    diferencia?: number;
    precioCosto: number;
    observacionLinea?: string;
  }>>([
    { productId: '', tallaId: '', cantidadIngresada: 1, cantidadEsperada: 1, diferencia: 0, precioCosto: 0, observacionLinea: '' },
  ]);

  useEffect(() => {
    loadData();
  }, [online]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let prods = [];
      try {
        if (online) {
          prods = await ApiService.get('/inventario/productos');
        } else {
          prods = await db.productos.toArray();
        }
      } catch (e) {
        prods = await db.productos.toArray();
      }
      setProductos(prods);

      if (online) {
        const [prvs, ords, pgs, ents] = await Promise.all([
          ApiService.get('/proveedores'),
          ApiService.get('/proveedores/ordenes-compra'),
          ApiService.get('/proveedores/pagos/todos'),
          ApiService.get('/proveedores/entradas'),
        ]);
        setProveedores(prvs || []);
        setOrdenes(ords || []);
        setPagos(pgs || []);
        setEntradas(ents || []);
      }
    } catch (err: any) {
      console.error('Error al cargar datos de proveedores:', err);
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // ── Métricas Globales de Cabecera ──────────────────────
  const metrics = useMemo(() => {
    const totalDeuda = proveedores.reduce((acc, p) => acc + (p.saldoPendiente || 0), 0);
    const totalPagado = proveedores.reduce((acc, p) => acc + (p.totalPagado || 0), 0);
    const totalCompras = proveedores.reduce((acc, p) => acc + (p.totalCompras || 0), 0);
    const ordenesActivas = ordenes.filter((o) => o.estado === 'PENDIENTE' || o.estado === 'BORRADOR').length;

    return { totalDeuda, totalPagado, totalCompras, ordenesActivas };
  }, [proveedores, ordenes]);

  // ── Registrar Proveedor ──────────────────────
  const handleCreateProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruc || !razonSocial) {
      showToast('El RUC y la Razón Social son campos obligatorios.', 'error');
      return;
    }

    setSaving(true);
    try {
      await ApiService.post('/proveedores', {
        ruc,
        razonSocial,
        contacto: contacto || undefined,
        direccion: direccion || undefined,
        email: email || undefined,
      });

      showToast('Proveedor registrado con éxito.', 'success');
      setShowSupplierModal(false);
      resetSupplierForm();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar el proveedor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetSupplierForm = () => {
    setRuc('');
    setRazonSocial('');
    setContacto('');
    setDireccion('');
    setEmail('');
  };

  // ── Ver Detalle de Orden ──────────────────────
  const handleVerDetalleOrden = async (orderId: string) => {
    try {
      const order = await ApiService.get(`/proveedores/ordenes-compra/${orderId}`);
      setSelectedOrder(order);
      setEditingOrder(false);
      setShowOrderDetailModal(true);
    } catch (err: any) {
      showToast('No se pudo cargar el detalle de la orden.', 'error');
    }
  };

  // ── Crear Orden de Compra ────────────────────
  const handleAddOrderLine = () => {
    setOrderLines([...orderLines, { productId: '', cantidadPedida: 1, precioCosto: 0, observacionLinea: '' }]);
  };

  const handleRemoveOrderLine = (index: number) => {
    if (orderLines.length === 1) return;
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };

  const handleOrderLineChange = (index: number, field: string, value: any) => {
    const updated = [...orderLines];
    if (field === 'productId') {
      updated[index].productId = value;
      const prod = productos.find((p) => p.id === value);
      if (prod) {
        updated[index].precioCosto = Number(prod.precioCosto || prod.costPrice || 0);
      }
    } else if (field === 'cantidadPedida') {
      updated[index].cantidadPedida = parseInt(value) || 1;
    } else if (field === 'precioCosto') {
      updated[index].precioCosto = parseFloat(value) || 0;
    } else if (field === 'observacionLinea') {
      updated[index].observacionLinea = value;
    }
    setOrderLines(updated);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSupplierId) {
      showToast('Seleccione un proveedor.', 'error');
      return;
    }

    const invalid = orderLines.some((l) => !l.productId || l.cantidadPedida < 1 || l.precioCosto <= 0);
    if (invalid) {
      showToast('Complete todas las filas con cantidades y precios de costo válidos.', 'error');
      return;
    }

    setSaving(true);
    try {
      await ApiService.post('/proveedores/ordenes-compra', {
        supplierId: orderSupplierId,
        observaciones: orderObservaciones || undefined,
        estado: orderEstadoInicial,
        lines: orderLines.map((l) => ({
          productId: l.productId,
          cantidadPedida: l.cantidadPedida,
          precioCosto: l.precioCosto,
          observacionLinea: l.observacionLinea || undefined,
        })),
      });

      showToast(`Orden de compra creada exitosamente (${orderEstadoInicial === 'BORRADOR' ? 'Borrador editable' : 'Enviada al proveedor'}).`, 'success');
      setShowOrderModal(false);
      setOrderSupplierId('');
      setOrderObservaciones('');
      setOrderLines([{ productId: '', cantidadPedida: 1, precioCosto: 0, observacionLinea: '' }]);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al crear la orden de compra.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Guardar Edición de Orden Existente ────────────────────
  const handleGuardarEdicionOrden = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      await ApiService.put(`/proveedores/ordenes-compra/${selectedOrder.id}`, {
        observaciones: selectedOrder.observaciones,
        lines: selectedOrder.lines?.map((l) => ({
          productId: l.productId,
          cantidadPedida: l.cantidadPedida,
          precioCosto: l.precioCosto,
          observacionLinea: l.observacionLinea || undefined,
        })),
      });

      showToast('Orden de compra actualizada correctamente.', 'success');
      setEditingOrder(false);
      handleVerDetalleOrden(selectedOrder.id);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar los cambios de la orden.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Confirmar / Enviar Orden ────────────────────
  const handleConfirmarEnvioOrden = async (orderId: string) => {
    setSaving(true);
    try {
      await ApiService.patch(`/proveedores/ordenes-compra/${orderId}/confirmar`, {});
      showToast('Orden confirmada y enviada al proveedor.', 'success');
      if (selectedOrder && selectedOrder.id === orderId) {
        handleVerDetalleOrden(orderId);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al enviar la orden.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Cancelar Orden ────────────────────
  const handleCancelarOrden = async (orderId: string) => {
    if (!confirm('¿Está seguro de que desea cancelar esta orden de compra?')) return;
    setSaving(true);
    try {
      await ApiService.patch(`/proveedores/ordenes-compra/${orderId}/cancelar`, {});
      showToast('Orden de compra cancelada.', 'info');
      setShowOrderDetailModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al cancelar la orden.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Auto-llenar al seleccionar Orden en Ingreso ────────────────
  const handleSelectOrderForEntry = async (orderId: string) => {
    setEntryOrderId(orderId);
    if (!orderId) {
      setEntryLines([{ productId: '', tallaId: '', cantidadIngresada: 1, cantidadEsperada: 1, diferencia: 0, precioCosto: 0, observacionLinea: '' }]);
      return;
    }

    try {
      const order = await ApiService.get(`/proveedores/ordenes-compra/${orderId}`);
      if (order && order.lines && order.lines.length > 0) {
        const linesAuto: any[] = [];
        order.lines.forEach((l: any) => {
          const prod = productos.find((p) => p.id === l.productId);
          const firstTalla = prod?.tallas?.[0] || prod?.stockByTalla?.[0]?.talla;
          linesAuto.push({
            productId: l.productId,
            tallaId: firstTalla?.id || '',
            cantidadIngresada: l.cantidadPedida,
            cantidadEsperada: l.cantidadPedida,
            diferencia: 0,
            precioCosto: l.precioCosto,
            observacionLinea: l.observacionLinea || '',
          });
        });
        setEntryLines(linesAuto);
        if (order.observaciones) {
          setEntryObservaciones(`Ref. Orden OC-${String(order.numero).padStart(4, '0')}: ${order.observaciones}`);
        }
      }
    } catch (e) {
      console.warn('Error al auto-llenar líneas desde orden:', e);
    }
  };

  // ── Líneas de Recepción ────────────────
  const handleAddEntryLine = () => {
    setEntryLines([...entryLines, { productId: '', tallaId: '', cantidadIngresada: 1, cantidadEsperada: 1, diferencia: 0, precioCosto: 0, observacionLinea: '' }]);
  };

  const handleRemoveEntryLine = (index: number) => {
    if (entryLines.length === 1) return;
    setEntryLines(entryLines.filter((_, i) => i !== index));
  };

  const handleEntryLineChange = (index: number, field: string, value: any) => {
    const updated = [...entryLines];
    if (field === 'productId') {
      updated[index].productId = value;
      updated[index].tallaId = '';
      const prod = productos.find((p) => p.id === value);
      if (prod) {
        updated[index].precioCosto = Number(prod.precioCosto || prod.costPrice || 0);
      }
    } else if (field === 'tallaId') {
      updated[index].tallaId = value;
    } else if (field === 'cantidadIngresada') {
      const ingresada = parseInt(value) || 0;
      updated[index].cantidadIngresada = ingresada;
      if (updated[index].cantidadEsperada !== undefined) {
        updated[index].diferencia = ingresada - updated[index].cantidadEsperada!;
      }
    } else if (field === 'precioCosto') {
      updated[index].precioCosto = parseFloat(value) || 0;
    } else if (field === 'observacionLinea') {
      updated[index].observacionLinea = value;
    }
    setEntryLines(updated);
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entrySupplierId) {
      showToast('Seleccione un proveedor.', 'error');
      return;
    }

    const invalid = entryLines.some((l) => !l.productId || !l.tallaId || l.cantidadIngresada < 1 || l.precioCosto <= 0);
    if (invalid) {
      showToast('Asegúrese de seleccionar modelo, talla, cantidad y costo en todas las filas.', 'error');
      return;
    }

    // Comprobar diferencias
    const hayFaltantes = entryLines.some((l) => (l.diferencia !== undefined && l.diferencia < 0));
    const estadoCalculado = hayFaltantes ? 'CON_DIFERENCIAS' : 'COMPLETA';

    setSaving(true);
    try {
      await ApiService.post('/proveedores/entradas', {
        supplierId: entrySupplierId,
        supplierOrderId: entryOrderId || undefined,
        observaciones: entryObservaciones || undefined,
        estado: estadoCalculado,
        lines: entryLines.map((l) => ({
          productId: l.productId,
          tallaId: l.tallaId,
          cantidadIngresada: l.cantidadIngresada,
          cantidadEsperada: l.cantidadEsperada,
          diferencia: l.diferencia,
          precioCosto: l.precioCosto,
          observacionLinea: l.observacionLinea || undefined,
        })),
      });

      showToast(
        hayFaltantes
          ? 'Mercancía ingresada con diferencias registradas. Se actualizó el stock y el saldo por pagar.'
          : 'Ingreso de mercancía registrado con éxito. Stock físico y saldo actualizados.',
        'success'
      );
      setEntrySupplierId('');
      setEntryOrderId('');
      setEntryObservaciones('');
      setEntryLines([{ productId: '', tallaId: '', cantidadIngresada: 1, cantidadEsperada: 1, diferencia: 0, precioCosto: 0, observacionLinea: '' }]);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar la entrada de bodega.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Cuenta Corriente / Historial del Proveedor ────────────────
  const handleAbrirCuentaCorriente = async (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setLoadingCuenta(true);
    setShowCuentaModal(true);
    try {
      const data = await ApiService.get(`/proveedores/${supplierId}/cuenta-corriente`);
      setCuentaCorrienteData(data);
    } catch (e: any) {
      showToast('Error al obtener estado de cuenta del proveedor.', 'error');
    } finally {
      setLoadingCuenta(false);
    }
  };

  // ── Registrar Pago a Proveedor ────────────────
  const handleAbrirModalPago = (supplierId: string, orderId?: string, sugeridoMonto?: number) => {
    setPaymentSupplierId(supplierId);
    setPaymentOrderId(orderId || '');
    setMontoPago(sugeridoMonto ? String(sugeridoMonto) : '');
    setMetodoPago('TRANSFERENCIA');
    setBancoPago('');
    setComprobantePago('');
    setNotasPago('');
    setShowPaymentModal(true);
  };

  const handleGuardarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(montoPago);
    if (isNaN(montoNum) || montoNum <= 0) {
      showToast('Ingrese un monto válido mayor a $0.00.', 'error');
      return;
    }

    setSaving(true);
    try {
      await ApiService.post(`/proveedores/${paymentSupplierId}/pagos`, {
        monto: montoNum,
        metodo: metodoPago,
        banco: bancoPago || undefined,
        comprobante: comprobantePago || undefined,
        notas: notasPago || undefined,
        supplierOrderId: paymentOrderId || undefined,
      });

      showToast('Pago registrado correctamente. Estado de cuenta actualizado.', 'success');
      setShowPaymentModal(false);
      if (showCuentaModal && selectedSupplierId === paymentSupplierId) {
        handleAbrirCuentaCorriente(paymentSupplierId);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar el pago.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getTallasForProduct = (productId: string) => {
    const prod = productos.find((p) => p.id === productId);
    if (!prod) return [];
    if (Array.isArray(prod.tallas)) return prod.tallas;
    if (Array.isArray(prod.stockByTalla)) {
      return prod.stockByTalla.map((st: any) => ({
        id: st.tallaId || st.talla?.id,
        talla: st.talla?.sizeNumber || st.talla?.name || 'Única',
        stock: st.quantity ?? 0,
      }));
    }
    return [];
  };

  // Filtrado de proveedores
  const proveedoresFiltrados = useMemo(() => {
    if (!searchQuery) return proveedores;
    const q = searchQuery.toLowerCase();
    return proveedores.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(q) ||
        p.razonSocial?.toLowerCase().includes(q) ||
        p.ruc?.includes(q) ||
        p.contacto?.toLowerCase().includes(q)
    );
  }, [proveedores, searchQuery]);

  // Filtrado de órdenes
  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((o) => {
      const matchEstado = filtroEstadoOrden === 'TODOS' || o.estado === filtroEstadoOrden;
      const matchSearch =
        !searchQuery ||
        `OC-${String(o.numero).padStart(4, '0')}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.supplier?.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.observaciones?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchEstado && matchSearch;
    });
  }, [ordenes, filtroEstadoOrden, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ══════ HEADER SUPERIOR & KPIs DE PROVEEDORES ══════ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Truck size={22} className="text-[#0F172A] dark:text-amber-400" />
            Proveedores & Cuentas por Pagar
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Órdenes de compra, control de entregas, diferencias de mercancía y estado de cuenta financiero
          </p>
        </div>

        {online && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setShowSupplierModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <Plus size={14} className="text-emerald-500" />
              <span>Nuevo Proveedor</span>
            </button>
            <button
              onClick={() => {
                setOrderSupplierId('');
                setOrderObservaciones('');
                setOrderEstadoInicial('BORRADOR');
                setOrderLines([{ productId: '', cantidadPedida: 1, precioCosto: 0, observacionLinea: '' }]);
                setShowOrderModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm border border-slate-700"
            >
              <Plus size={14} className="text-amber-400" />
              <span>Emitir Orden de Compra</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
            <span>Saldo por Pagar</span>
            <AlertCircle size={14} className="text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            ${metrics.totalDeuda.toFixed(2)}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">Deuda total con proveedores</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
            <span>Total Pagado</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ${metrics.totalPagado.toFixed(2)}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">Abonos y liquidaciones registradas</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
            <span>Total Compras</span>
            <Package size={14} className="text-[#0F172A] dark:text-amber-400" />
          </div>
          <div className="text-xl font-black text-[var(--foreground)] font-mono">
            ${metrics.totalCompras.toFixed(2)}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">Mercancía recibida en bodega</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
            <span>Órdenes en Tránsito</span>
            <Clock size={14} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {metrics.ordenesActivas} <span className="text-xs font-normal text-[var(--muted-foreground)]">órdenes</span>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">Borradores y pendientes de entrega</p>
        </div>
      </div>

      {/* ══════ TABS DE NAVEGACIÓN ══════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-2">
        <div className="flex gap-2">
          {([
            ['proveedores', 'Proveedores & Deudas', Truck],
            ['ordenes', 'Órdenes de Compra', FileText],
            ['ingreso', 'Recepción de Mercancía', Package],
            ['pagos', 'Historial de Pagos', DollarSign],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === id
                  ? 'bg-[#0F172A] text-white dark:bg-amber-400 dark:text-slate-900 shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Buscador Contextual */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder={activeTab === 'ordenes' ? 'Buscar N° orden, modelo...' : 'Buscar proveedor, RUC...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A] transition-colors"
          />
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[#0F172A] dark:text-amber-400 mb-2" size={32} />
          <span className="text-xs">Cargando información de proveedores...</span>
        </div>
      )}

      {/* ══════════════════════════════════════════
          PESTAÑA 1: PROVEEDORES & ESTADO DE CUENTA
         ══════════════════════════════════════════ */}
      {!loading && activeTab === 'proveedores' && (
        proveedoresFiltrados.length === 0 ? (
          <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2">
            <Truck size={36} className="mx-auto opacity-40" />
            <p className="text-sm font-semibold">No se encontraron proveedores registrados.</p>
            <p className="text-xs">Crea un nuevo proveedor para gestionar compras y cuentas por pagar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {proveedoresFiltrados.map((p) => {
              const deuda = p.saldoPendiente || 0;
              const tieneDeuda = deuda > 0.01;

              return (
                <div
                  key={p.id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all relative flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Encabezado Card */}
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="font-extrabold text-sm text-[var(--foreground)] line-clamp-1">{p.razonSocial || p.nombre}</h4>
                        <span className="px-2 py-0.5 rounded bg-[var(--muted)] text-[10px] text-[var(--muted-foreground)] font-bold font-mono tracking-wider">
                          {p.ruc}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono border ${
                        tieneDeuda
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}>
                        {tieneDeuda ? `Debe $${deuda.toFixed(2)}` : 'Al Día'}
                      </span>
                    </div>

                    {/* Datos de contacto */}
                    <div className="space-y-1.5 text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] pt-3">
                      {p.contacto && (
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="shrink-0" />
                          <span className="truncate">{p.contacto}</span>
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="shrink-0" />
                          <span className="truncate">{p.email}</span>
                        </div>
                      )}
                      {p.direccion && (
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{p.direccion}</span>
                        </div>
                      )}
                    </div>

                    {/* Resumen Financiero Proveedor */}
                    <div className="grid grid-cols-2 gap-2 bg-[var(--muted)]/40 p-2.5 rounded-xl text-xs border border-[var(--border)]">
                      <div>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Total Facturado</span>
                        <span className="font-bold text-[var(--foreground)] font-mono">${(p.totalCompras || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Total Abonado</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">${(p.totalPagado || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="pt-3 border-t border-[var(--border)] flex items-center gap-2">
                    <button
                      onClick={() => handleAbrirCuentaCorriente(p.id)}
                      className="flex-1 py-2 px-3 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <History size={13} />
                      <span>Estado de Cuenta</span>
                    </button>
                    {tieneDeuda && (
                      <button
                        onClick={() => handleAbrirModalPago(p.id, undefined, deuda)}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                        title="Registrar Abono o Pago"
                      >
                        <DollarSign size={13} />
                        <span>Abonar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ══════════════════════════════════════════
          PESTAÑA 2: ÓRDENES DE COMPRA
         ══════════════════════════════════════════ */}
      {!loading && activeTab === 'ordenes' && (
        <div className="space-y-4">
          {/* Filtros de Estado */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[var(--muted-foreground)] flex items-center gap-1 mr-1">
              <Filter size={12} /> Estado:
            </span>
            {['TODOS', 'BORRADOR', 'PENDIENTE', 'RECIBIDA_PARCIAL', 'RECIBIDA', 'CANCELADA'].map((st) => (
              <button
                key={st}
                onClick={() => setFiltroEstadoOrden(st)}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                  filtroEstadoOrden === st
                    ? 'bg-[#0F172A] text-white dark:bg-amber-400 dark:text-slate-900'
                    : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {st === 'TODOS' ? 'Todos' : st === 'BORRADOR' ? 'Borradores' : st === 'PENDIENTE' ? 'Pendientes' : st === 'RECIBIDA_PARCIAL' ? 'Parciales' : st === 'RECIBIDA' ? 'Recibidas' : 'Canceladas'}
              </button>
            ))}
          </div>

          {ordenesFiltradas.length === 0 ? (
            <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              No hay órdenes de compra registradas con los filtros seleccionados.
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--muted)]/50 border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-5 py-3.5">N° Orden</th>
                      <th className="px-4 py-3.5">Proveedor</th>
                      <th className="px-4 py-3.5">Productos / Miniaturas</th>
                      <th className="px-4 py-3.5 text-center">Estado</th>
                      <th className="px-4 py-3.5 text-right">Monto Total</th>
                      <th className="px-4 py-3.5 text-right">Fecha Emisión</th>
                      <th className="px-5 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {ordenesFiltradas.map((o) => (
                      <tr key={o.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                        <td className="px-5 py-3.5 font-bold font-mono text-[var(--foreground)]">
                          OC-{String(o.numero).padStart(4, '0')}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-xs text-[var(--foreground)]">
                          {o.supplier?.nombre || o.supplier?.razonSocial || 'Proveedor'}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {o.lines && o.lines.slice(0, 3).map((l, idx) => (
                              <div
                                key={idx}
                                className="w-8 h-8 rounded-lg bg-[var(--muted)] border border-[var(--border)] overflow-hidden flex items-center justify-center relative group"
                                title={l.producto?.nombre || 'Producto'}
                              >
                                {l.producto?.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={l.producto.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={12} className="text-[var(--muted-foreground)]" />
                                )}
                              </div>
                            ))}
                            {(o.lines?.length || 0) > 3 && (
                              <span className="text-[10px] font-bold text-[var(--muted-foreground)] bg-[var(--muted)] px-1.5 py-0.5 rounded">
                                +{(o.lines?.length || 0) - 3}
                              </span>
                            )}
                            <span className="text-[11px] text-[var(--muted-foreground)] ml-1">
                              ({o.totalLineas || o.lines?.length || 0} modelos)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold ${
                            o.estado === 'BORRADOR'
                              ? 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20'
                              : o.estado === 'PENDIENTE'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : o.estado === 'RECIBIDA_PARCIAL'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : o.estado === 'RECIBIDA'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}>
                            {o.estado === 'BORRADOR' && <Edit3 size={10} />}
                            {o.estado === 'PENDIENTE' && <Clock size={10} />}
                            {o.estado === 'RECIBIDA' && <CheckCircle size={10} />}
                            {o.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-[#0F172A] dark:text-amber-400 font-mono text-sm">
                          ${Number(o.total).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[11px] text-[var(--muted-foreground)]">
                          {new Date(o.createdAt).toLocaleDateString('es-EC')}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleVerDetalleOrden(o.id)}
                              className="p-1.5 bg-[var(--muted)] hover:bg-[#0F172A] hover:text-white rounded-lg transition-colors text-[var(--foreground)]"
                              title="Ver Detalle / Editar"
                            >
                              <Eye size={13} />
                            </button>
                            {o.estado === 'BORRADOR' && (
                              <button
                                onClick={() => handleConfirmarEnvioOrden(o.id)}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 rounded-lg transition-colors"
                                title="Confirmar y Enviar al Proveedor"
                              >
                                <Send size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          PESTAÑA 3: RECEPCIÓN DE MERCANCÍA EN BODEGA
         ══════════════════════════════════════════ */}
      {!loading && activeTab === 'ingreso' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
              <div>
                <h4 className="font-extrabold text-sm flex items-center gap-2">
                  <Package className="text-[#0F172A] dark:text-amber-400" size={18} />
                  <span>Recepción y Verificación de Mercancía</span>
                </h4>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Compara los pares pedidos vs recibidos y registra observaciones por lote
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Proveedor Emisor *
                  </label>
                  <select
                    required
                    value={entrySupplierId}
                    onChange={(e) => {
                      setEntrySupplierId(e.target.value);
                      setEntryOrderId('');
                      setEntryLines([{ productId: '', tallaId: '', cantidadIngresada: 1, cantidadEsperada: 1, diferencia: 0, precioCosto: 0, observacionLinea: '' }]);
                    }}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="">Seleccione proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.razonSocial || p.nombre} ({p.ruc})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Vincular a Orden de Compra (Auto-llenar)
                  </label>
                  <select
                    disabled={!entrySupplierId}
                    value={entryOrderId}
                    onChange={(e) => handleSelectOrderForEntry(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A] disabled:opacity-50"
                  >
                    <option value="">Ingreso Manual Directo (Sin orden)</option>
                    {ordenes
                      .filter((o) => o.supplierId === entrySupplierId && (o.estado === 'PENDIENTE' || o.estado === 'BORRADOR' || o.estado === 'RECIBIDA_PARCIAL'))
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          OC-{String(o.numero).padStart(4, '0')} (${Number(o.total).toFixed(2)}) - {o.estado}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Observaciones generales de la entrega */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Observaciones Generales de la Entrega / Guía de Remisión
                </label>
                <input
                  type="text"
                  placeholder="Ej. Guía N° 001-928. Furgón llegó a las 10:00 AM, bultos completos."
                  value={entryObservaciones}
                  onChange={(e) => setEntryObservaciones(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              {/* Líneas de Mercancía */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Detalle de Modelos & Tallas a Ingresar
                  </span>
                  <button
                    type="button"
                    onClick={handleAddEntryLine}
                    className="flex items-center gap-1 text-xs text-[#0F172A] dark:text-amber-400 font-bold hover:opacity-80"
                  >
                    <Plus size={13} />
                    <span>Agregar Fila</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {entryLines.map((line, index) => {
                    const prod = productos.find((p) => p.id === line.productId);
                    const dif = line.diferencia ?? 0;

                    return (
                      <div
                        key={index}
                        className={`p-3.5 rounded-xl border space-y-2.5 transition-colors ${
                          dif < 0
                            ? 'bg-rose-500/5 border-rose-500/30'
                            : dif > 0
                            ? 'bg-blue-500/5 border-blue-500/30'
                            : 'bg-[var(--muted)]/20 border-[var(--border)]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          {/* Miniatura imagen si existe */}
                          {prod?.imageUrl && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--muted)] border border-[var(--border)] shrink-0 hidden sm:block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={prod.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="flex-1 w-full">
                            <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Modelo / Calzado</label>
                            <select
                              required
                              value={line.productId}
                              onChange={(e) => handleEntryLineChange(index, 'productId', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[#0F172A]"
                            >
                              <option value="">Seleccione modelo</option>
                              {productos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre || p.name} ({p.marca || p.brand} - {p.codigo || p.code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-full sm:w-28">
                            <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Talla</label>
                            <select
                              required
                              disabled={!line.productId}
                              value={line.tallaId}
                              onChange={(e) => handleEntryLineChange(index, 'tallaId', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[#0F172A] disabled:opacity-50"
                            >
                              <option value="">Elegir Talla</option>
                              {getTallasForProduct(line.productId).map((t: any) => (
                                <option key={t.id} value={t.id}>
                                  Nro {t.talla || t.numero} ({t.stock} disp.)
                                </option>
                              ))}
                            </select>
                          </div>

                          {entryOrderId && (
                            <div className="w-full sm:w-20">
                              <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Esperados</label>
                              <input
                                type="number"
                                readOnly
                                value={line.cantidadEsperada ?? '-'}
                                className="w-full px-2.5 py-1.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-xs font-mono text-[var(--muted-foreground)] text-center cursor-not-allowed"
                              />
                            </div>
                          )}

                          <div className="w-full sm:w-24">
                            <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Recibidos *</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={line.cantidadIngresada}
                              onChange={(e) => handleEntryLineChange(index, 'cantidadIngresada', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-[#0F172A] text-center"
                            />
                          </div>

                          <div className="w-full sm:w-24">
                            <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Costo Unit ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              value={line.precioCosto}
                              onChange={(e) => handleEntryLineChange(index, 'precioCosto', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-mono focus:outline-none focus:border-[#0F172A]"
                            />
                          </div>

                          {entryLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEntryLine(index)}
                              className="p-2 border border-[var(--border)] hover:border-rose-500 hover:text-rose-500 text-[var(--muted-foreground)] rounded-lg transition-colors bg-[var(--card)] sm:mb-0.5"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Campo de observación por línea si faltan o sobran pares */}
                        <div className="flex items-center gap-2 pt-1">
                          {entryOrderId && dif !== 0 && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                              dif < 0 ? 'bg-rose-500/20 text-rose-600' : 'bg-blue-500/20 text-blue-600'
                            }`}>
                              {dif < 0 ? `Faltan ${Math.abs(dif)} pares` : `Excedente +${dif} pares`}
                            </span>
                          )}
                          <input
                            type="text"
                            placeholder="Observación de este producto (ej. hebilla defectuosa, cambio de color acordado)"
                            value={line.observacionLinea || ''}
                            onChange={(e) => handleEntryLineChange(index, 'observacionLinea', e.target.value)}
                            className="flex-1 px-2.5 py-1 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[11px] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:border-[#0F172A]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total y Botón de Envío */}
              <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs">
                  <span className="text-[var(--muted-foreground)]">Total Cargamento: </span>
                  <span className="font-extrabold text-[#0F172A] dark:text-amber-400 font-mono text-base ml-1">
                    ${entryLines.reduce((sum, l) => sum + (l.cantidadIngresada * l.precioCosto), 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={saving || !online}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border border-slate-700"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /><span>Guardando Ingreso...</span></>
                  ) : (
                    <><CheckCircle size={14} className="text-emerald-400" /><span>Registrar Ingreso & Actualizar Stock</span></>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Panel Lateral Informativo y Últimos Ingresos */}
          <div className="space-y-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
              <h5 className="font-extrabold text-xs flex items-center gap-2 text-[#0F172A] dark:text-amber-400">
                <FileText size={15} />
                <span>Control de Entrada a Bodega</span>
              </h5>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Al confirmar la recepción, el sistema incrementa automáticamente el inventario físico por modelo y talla.
              </p>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Si vinculas una orden con faltantes, la orden pasará a estado <strong>RECIBIDA PARCIAL</strong> y el saldo pendiente con el proveedor se ajustará únicamente por lo efectivamente recibido.
              </p>
            </div>

            {/* Últimas Recepciones */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
              <h5 className="font-extrabold text-xs flex items-center gap-2 text-[var(--foreground)]">
                <History size={14} />
                <span>Últimos Ingresos Registrados</span>
              </h5>
              {entradas.length === 0 ? (
                <p className="text-[11px] text-[var(--muted-foreground)]">No hay ingresos registrados aún.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {entradas.slice(0, 5).map((e) => (
                    <div key={e.id} className="p-2.5 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)] text-xs space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>ENT-{String(e.numero).padStart(4, '0')}</span>
                        <span className="font-mono text-emerald-600">${Number(e.total).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
                        <span>{e.supplier?.nombre || 'Proveedor'}</span>
                        <span>{new Date(e.fechaIngreso).toLocaleDateString('es-EC')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          PESTAÑA 4: HISTORIAL DE PAGOS A PROVEEDORES
         ══════════════════════════════════════════ */}
      {!loading && activeTab === 'pagos' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" />
              <span>Bitácora Consolidada de Pagos & Abonos a Proveedores</span>
            </h3>
          </div>

          {pagos.length === 0 ? (
            <div className="p-16 text-center text-[var(--muted-foreground)]">
              No hay pagos registrados aún en el sistema.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--muted)]/50 border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Banco / Comprobante</th>
                    <th className="px-4 py-3">Notas / Concepto</th>
                    <th className="px-5 py-3 text-right">Monto Pagado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pagos.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-5 py-3 text-[11px] text-[var(--muted-foreground)] font-mono">
                        {new Date(p.createdAt).toLocaleDateString('es-EC')}
                      </td>
                      <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                        {p.supplier?.nombre || 'Proveedor'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-[var(--muted)] border border-[var(--border)] rounded text-[10px] font-bold">
                          {p.metodo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px]">
                        {p.banco && <span className="font-semibold mr-1">{p.banco}</span>}
                        {p.comprobante && <span className="font-mono text-[var(--muted-foreground)]">#{p.comprobante}</span>}
                        {!p.banco && !p.comprobante && <span className="text-[var(--muted-foreground)]">-</span>}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[var(--muted-foreground)] truncate max-w-xs">
                        {p.notas || 'Abono directo a cuenta'}
                      </td>
                      <td className="px-5 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        ${Number(p.monto).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: DETALLE / EDICIÓN DE ORDEN DE COMPRA
         ══════════════════════════════════════════ */}
      {showOrderDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0F172A] text-white dark:bg-amber-400 dark:text-slate-900 rounded-xl font-bold">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <span>Orden de Compra OC-{String(selectedOrder.numero).padStart(4, '0')}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedOrder.estado === 'BORRADOR'
                        ? 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20'
                        : selectedOrder.estado === 'PENDIENTE'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : selectedOrder.estado === 'RECIBIDA'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    }`}>
                      {selectedOrder.estado}
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Proveedor: <strong>{selectedOrder.supplier?.nombre || selectedOrder.supplier?.razonSocial}</strong> ({selectedOrder.supplier?.ruc})
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setShowOrderDetailModal(false); setEditingOrder(false); }}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido Scrollable */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Observaciones generales */}
              <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-2xl p-4 space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Observaciones Generales de la Orden
                </label>
                {editingOrder ? (
                  <textarea
                    rows={2}
                    value={selectedOrder.observaciones || ''}
                    onChange={(e) => setSelectedOrder({ ...selectedOrder, observaciones: e.target.value })}
                    placeholder="Instrucciones al proveedor, términos de entrega, personalizaciones generales..."
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                ) : (
                  <p className="text-xs text-[var(--foreground)] italic">
                    {selectedOrder.observaciones || 'Sin observaciones registradas.'}
                  </p>
                )}
              </div>

              {/* Lista de Productos con Imagen */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Modelos Solicitados ({selectedOrder.lines?.length || 0})
                  </span>
                  {(selectedOrder.estado === 'BORRADOR' || selectedOrder.estado === 'PENDIENTE') && (
                    <button
                      onClick={() => setEditingOrder(!editingOrder)}
                      className="flex items-center gap-1 text-xs font-bold text-[#0F172A] dark:text-amber-400 hover:opacity-80"
                    >
                      <Edit3 size={13} />
                      <span>{editingOrder ? 'Cancelar Edición' : 'Modificar Orden'}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedOrder.lines?.map((line, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[var(--muted)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
                          {line.producto?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={line.producto.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={18} className="text-[var(--muted-foreground)]" />
                          )}
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-[var(--foreground)]">
                            {line.producto?.nombre || 'Producto'}
                          </h5>
                          <div className="flex gap-2 text-[10px] text-[var(--muted-foreground)]">
                            <span>Cód: {line.producto?.codigo}</span>
                            {line.producto?.color && <span>• Color: {line.producto.color}</span>}
                          </div>
                          {/* Nota de línea */}
                          {editingOrder ? (
                            <input
                              type="text"
                              value={line.observacionLinea || ''}
                              onChange={(e) => {
                                const newLines = [...(selectedOrder.lines || [])];
                                newLines[idx].observacionLinea = e.target.value;
                                setSelectedOrder({ ...selectedOrder, lines: newLines });
                              }}
                              placeholder="Observación del modelo (ej. cambio de suela)"
                              className="mt-1 px-2 py-0.5 bg-[var(--muted)] border border-[var(--border)] rounded text-[10px] w-full"
                            />
                          ) : (
                            line.observacionLinea && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 italic">
                                Nota: {line.observacionLinea}
                              </p>
                            )
                          )}
                        </div>
                      </div>

                      {/* Cantidad y Costos */}
                      <div className="flex items-center gap-4 self-end sm:self-center">
                        {editingOrder ? (
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="text-[9px] text-[var(--muted-foreground)] block">Pares</span>
                              <input
                                type="number"
                                min="1"
                                value={line.cantidadPedida}
                                onChange={(e) => {
                                  const newLines = [...(selectedOrder.lines || [])];
                                  newLines[idx].cantidadPedida = parseInt(e.target.value) || 1;
                                  setSelectedOrder({ ...selectedOrder, lines: newLines });
                                }}
                                className="w-16 px-2 py-1 bg-[var(--muted)] border border-[var(--border)] rounded text-xs text-center font-bold font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-[var(--muted-foreground)] block">Costo ($)</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={line.precioCosto}
                                onChange={(e) => {
                                  const newLines = [...(selectedOrder.lines || [])];
                                  newLines[idx].precioCosto = parseFloat(e.target.value) || 0;
                                  setSelectedOrder({ ...selectedOrder, lines: newLines });
                                }}
                                className="w-20 px-2 py-1 bg-[var(--muted)] border border-[var(--border)] rounded text-xs font-mono"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-[10px] text-[var(--muted-foreground)] block">
                              {line.cantidadPedida} pares × ${Number(line.precioCosto).toFixed(2)}
                            </span>
                            <span className="font-extrabold text-[#0F172A] dark:text-amber-400 font-mono text-sm">
                              ${(line.cantidadPedida * line.precioCosto).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Modal con Acciones de Negocio */}
            <div className="p-6 border-t border-[var(--border)] bg-[var(--muted)]/20 flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="text-sm">
                <span className="text-[var(--muted-foreground)]">Total de la Orden: </span>
                <span className="font-black text-[#0F172A] dark:text-amber-400 font-mono text-lg ml-1">
                  ${selectedOrder.lines?.reduce((sum, l) => sum + (l.cantidadPedida * l.precioCosto), 0).toFixed(2)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {editingOrder && (
                  <button
                    onClick={handleGuardarEdicionOrden}
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Save size={13} />
                    <span>Guardar Cambios</span>
                  </button>
                )}

                {selectedOrder.estado === 'BORRADOR' && !editingOrder && (
                  <button
                    onClick={() => handleConfirmarEnvioOrden(selectedOrder.id)}
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Send size={13} />
                    <span>Enviar al Proveedor</span>
                  </button>
                )}

                {(selectedOrder.estado === 'BORRADOR' || selectedOrder.estado === 'PENDIENTE') && !editingOrder && (
                  <button
                    onClick={() => handleCancelarOrden(selectedOrder.id)}
                    disabled={saving}
                    className="px-4 py-2 border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Ban size={13} />
                    <span>Cancelar Orden</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: ESTADO DE CUENTA MASTER-DETAIL
         ══════════════════════════════════════════ */}
      {showCuentaModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl font-bold">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    Estado de Cuenta — {cuentaCorrienteData?.supplier?.razonSocial || cuentaCorrienteData?.supplier?.nombre || 'Proveedor'}
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    RUC: {cuentaCorrienteData?.supplier?.ruc} • Histórico de compras, entregas y pagos
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCuentaModal(false)}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
              >
                <X size={16} />
              </button>
            </div>

            {loadingCuenta ? (
              <div className="p-16 flex flex-col items-center justify-center text-[var(--muted-foreground)] space-y-2">
                <Loader2 size={28} className="animate-spin text-[#0F172A] dark:text-amber-400" />
                <span className="text-xs">Cargando movimientos y balance...</span>
              </div>
            ) : cuentaCorrienteData ? (
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* KPIs Estado de Cuenta */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">Total Facturado</span>
                    <span className="text-lg font-black text-[var(--foreground)] font-mono">
                      ${cuentaCorrienteData.resumen.totalFacturado.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">Total Abonado</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ${cuentaCorrienteData.resumen.totalPagado.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Saldo Pendiente</span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                      ${cuentaCorrienteData.resumen.saldoPendiente.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Botón registrar abono */}
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-[var(--foreground)]">
                    <History size={16} />
                    <span>Línea de Tiempo de Movimientos (Entregas & Pagos)</span>
                  </h4>
                  <button
                    onClick={() => handleAbrirModalPago(selectedSupplierId!, undefined, cuentaCorrienteData.resumen.saldoPendiente)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <DollarSign size={13} />
                    <span>Registrar Pago / Abono</span>
                  </button>
                </div>

                {/* Timeline Cronológico */}
                <div className="space-y-3">
                  {cuentaCorrienteData.movimientos.length === 0 ? (
                    <p className="text-center text-[var(--muted-foreground)] py-8">No hay movimientos registrados para este proveedor.</p>
                  ) : (
                    cuentaCorrienteData.movimientos.map((mov: any, idx: number) => {
                      const isEntrega = mov.tipo === 'ENTREGA_MERCANCIA';
                      const isPago = mov.tipo === 'PAGO_PROVEEDOR';

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors ${
                            isPago
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : isEntrega
                              ? 'bg-blue-500/5 border-blue-500/20'
                              : 'bg-[var(--card)] border-[var(--border)]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl text-white font-bold shrink-0 ${
                              isPago ? 'bg-emerald-600' : isEntrega ? 'bg-blue-600' : 'bg-slate-700'
                            }`}>
                              {isPago ? <DollarSign size={14} /> : isEntrega ? <Package size={14} /> : <FileText size={14} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-xs text-[var(--foreground)]">{mov.titulo}</h5>
                                {mov.numeroCodigo && (
                                  <span className="text-[10px] font-mono text-[var(--muted-foreground)] bg-[var(--muted)] px-1.5 py-0.5 rounded">
                                    {mov.numeroCodigo}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                                {mov.descripcion}
                              </p>
                            </div>
                          </div>

                          <div className="text-right self-end sm:self-center">
                            <span className={`font-black font-mono text-sm ${
                              isPago ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#0F172A] dark:text-amber-400'
                            }`}>
                              {isPago ? `-$${Number(mov.monto).toFixed(2)}` : `+$${Number(mov.monto).toFixed(2)}`}
                            </span>
                            <span className="text-[10px] text-[var(--muted-foreground)] block font-mono">
                              {new Date(mov.fecha).toLocaleDateString('es-EC')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: REGISTRAR PAGO / ABONO A PROVEEDOR
         ══════════════════════════════════════════ */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <DollarSign className="text-emerald-500" size={18} />
                <span>Registrar Pago a Proveedor</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGuardarPago} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Monto a Pagar ($ USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-sm font-bold font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Método de Pago *
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Banco Emisor
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Pichincha / Guayaquil"
                    value={bancoPago}
                    onChange={(e) => setBancoPago(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  N° Comprobante / Referencia
                </label>
                <input
                  type="text"
                  placeholder="Ej. TRANS-98234 o N° Cheque"
                  value={comprobantePago}
                  onChange={(e) => setComprobantePago(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Notas / Observaciones del Pago
                </label>
                <textarea
                  rows={2}
                  placeholder="Liquidación de factura N° 124, abono quincenal..."
                  value={notasPago}
                  onChange={(e) => setNotasPago(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /><span>Registrando Pago...</span></>
                ) : (
                  <><CheckCircle size={14} /><span>Confirmar y Descontar Deuda</span></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: CREAR NUEVA ORDEN DE COMPRA
         ══════════════════════════════════════════ */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center shrink-0">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <FileText className="text-[#0F172A] dark:text-amber-400" size={18} />
                <span>Emitir Orden de Compra a Proveedor</span>
              </h3>
              <button onClick={() => setShowOrderModal(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Proveedor Aprovisionador *
                  </label>
                  <select
                    required
                    value={orderSupplierId}
                    onChange={(e) => setOrderSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="">Seleccione proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.razonSocial || p.nombre} ({p.ruc})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Estado Inicial de la Orden
                  </label>
                  <select
                    value={orderEstadoInicial}
                    onChange={(e) => setOrderEstadoInicial(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="BORRADOR">Guardar como Borrador (Permite editar)</option>
                    <option value="PENDIENTE">Confirmar y Enviar al Proveedor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Observaciones Generales de la Orden
                </label>
                <input
                  type="text"
                  placeholder="Ej. Entrega urgente antes del fin de mes, empaque en cajas individuales..."
                  value={orderObservaciones}
                  onChange={(e) => setOrderObservaciones(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              {/* Detalle Orden */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Modelos a Solicitar
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOrderLine}
                    className="flex items-center gap-1 text-xs text-[#0F172A] dark:text-amber-400 font-bold hover:opacity-80"
                  >
                    <Plus size={13} />
                    <span>Agregar Fila</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {orderLines.map((line, index) => {
                    const prod = productos.find((p) => p.id === line.productId);

                    return (
                      <div key={index} className="bg-[var(--muted)]/20 p-3.5 rounded-2xl border border-[var(--border)] space-y-2.5">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          {prod?.imageUrl && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--muted)] border border-[var(--border)] shrink-0 hidden sm:block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={prod.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="flex-1 w-full">
                            <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Modelo / Calzado</label>
                            <select
                              required
                              value={line.productId}
                              onChange={(e) => handleOrderLineChange(index, 'productId', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[#0F172A]"
                            >
                              <option value="">Seleccione producto</option>
                              {productos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre || p.name} ({p.marca || p.brand} - {p.codigo || p.code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-full sm:w-20">
                            <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Cantidad</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={line.cantidadPedida}
                              onChange={(e) => handleOrderLineChange(index, 'cantidadPedida', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-mono font-bold text-center focus:outline-none focus:border-[#0F172A]"
                            />
                          </div>

                          <div className="w-full sm:w-24">
                            <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Costo Unit ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              value={line.precioCosto}
                              onChange={(e) => handleOrderLineChange(index, 'precioCosto', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-mono focus:outline-none focus:border-[#0F172A]"
                            />
                          </div>

                          {orderLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderLine(index)}
                              className="p-2 border border-[var(--border)] hover:border-rose-500 hover:text-rose-500 text-[var(--muted-foreground)] rounded-lg transition-colors bg-[var(--card)]"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Observación por línea */}
                        <div>
                          <input
                            type="text"
                            placeholder="Observación o especificación especial de este modelo (opcional)"
                            value={line.observacionLinea || ''}
                            onChange={(e) => handleOrderLineChange(index, 'observacionLinea', e.target.value)}
                            className="w-full px-2.5 py-1 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[11px] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none focus:border-[#0F172A]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-[var(--muted-foreground)]">Total Estimado: </span>
                  <span className="font-black text-[#0F172A] dark:text-amber-400 font-mono text-base ml-1">
                    ${orderLines.reduce((sum, l) => sum + (l.cantidadPedida * l.precioCosto), 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 border border-slate-700"
                >
                  {saving ? 'Guardando...' : orderEstadoInicial === 'BORRADOR' ? 'Guardar Borrador' : 'Emitir Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: REGISTRAR NUEVO PROVEEDOR
         ══════════════════════════════════════════ */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Truck className="text-emerald-500" size={18} />
                <span>Registrar Nuevo Proveedor</span>
              </h3>
              <button onClick={() => { setShowSupplierModal(false); resetSupplierForm(); }} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProveedor} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  RUC del Proveedor / Cédula *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 1792348574001"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Razón Social / Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Curtiduría & Calzado Cevallos S.A."
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Teléfono / WhatsApp de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej. 0998765432"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="Ej. pedidos@proveedor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Dirección de Taller / Fábrica
                </label>
                <input
                  type="text"
                  placeholder="Ej. Av. 24 de Mayo y Calzado, Cevallos"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 border border-slate-700"
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /><span>Registrando...</span></>
                ) : (
                  <><CheckCircle size={14} className="text-emerald-400" /><span>Guardar Proveedor</span></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
