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
  PackageCheck,
  Boxes,
  History,
  CheckCircle2,
  AlertCircle,
  Filter,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Save,
  Ban,
  Download,
  Share2,
  Printer,
  MessageCircle,
} from 'lucide-react';
import { useToast } from './ui/toast';
import { descargarOrdenCompraPdf, OrdenCompraPdfData } from '../services/pdf-factura.service';

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
    fotoUrl?: string;
    serie?: string;
    tallas?: Array<{ id?: string; talla?: number | string; sizeNumber?: number | string; stock?: number; cantidad?: number; ratio?: number; cantidadSerie?: number }>;
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
    direccion?: string;
    email?: string;
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
    id?: string;
    nombre: string;
    ruc: string;
    contacto?: string;
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

// Función auxiliar para obtener la URL de imagen limpia
function obtenerFotoProducto(prod: any): string {
  if (!prod) return '';
  return prod.fotoUrl || prod.imageUrl || prod.model?.imageUrl || prod.images?.[0] || '';
}

// Cálculo del ratio de curva de una talla
function getCurvaRatio(talla: any, tallas: any[] = []): number {
  if (talla.ratio && talla.ratio > 0) return talla.ratio;
  if (talla.cantidadSerie && talla.cantidadSerie > 0) return talla.cantidadSerie;
  const positive = tallas.map((x: any) => x.cantidad || x.stock || 1).filter((q: number) => q > 0);
  const minQ = positive.length > 0 ? Math.min(...positive) : 1;
  return minQ > 0 ? Math.max(1, Math.round((talla.cantidad || talla.stock || 1) / minQ)) : 1;
}

// Consolidación de líneas con distribución exacta de tallas
function consolidarLineasOrden(lines: OrdenCompraLine[] = [], catalogoProductos: any[] = []) {
  const map = new Map<string, {
    productId: string;
    nombre: string;
    marca: string;
    codigo: string;
    color: string;
    imageUrl: string;
    serie: string;
    cantidadPedida: number;
    precioCosto: number;
    subtotal: number;
    observacionLinea?: string;
    ids: string[];
    tallasDesglose: Array<{ talla: string | number; cantidad: number }>;
  }>();

  lines.forEach((l) => {
    const key = l.productId || l.id || Math.random().toString();
    const existing = map.get(key);
    const subtotal = l.subtotal || (l.cantidadPedida * l.precioCosto);
    const prodCat = catalogoProductos.find((p) => p.id === l.productId);
    const foto = obtenerFotoProducto(l.producto) || obtenerFotoProducto(prodCat);

    // Si el usuario editó manualmente las tallas, usar esa versión
    const tallasOverride = (l as any)._tallasOverride as Array<{ talla: string | number; cantidad: number }> | undefined;

    if (existing) {
      existing.cantidadPedida += l.cantidadPedida;
      existing.subtotal += subtotal;
      if (l.observacionLinea && !existing.observacionLinea) {
        existing.observacionLinea = l.observacionLinea;
      }
      if (l.id) existing.ids.push(l.id);

      if (tallasOverride && tallasOverride.length > 0) {
        // Usar las tallas editadas manualmente
        existing.tallasDesglose = tallasOverride;
      } else {
        // Recalcular tallas con la nueva cantidad total
        const prodTallas = prodCat?.tallas || prodCat?.stockByTalla || l.producto?.tallas;
        if (Array.isArray(prodTallas) && prodTallas.length > 0) {
          const sumRatios = prodTallas.reduce((acc: number, t: any) => acc + getCurvaRatio(t, prodTallas), 0);
          const factor = sumRatios > 0 ? existing.cantidadPedida / sumRatios : 1;
          existing.tallasDesglose = prodTallas.map((t: any) => ({
            talla: t.numero ?? t.sizeNumber ?? t.talla ?? t.nombre ?? '38',
            cantidad: Math.round(getCurvaRatio(t, prodTallas) * factor),
          }));
        }
      }
    } else {
      let tallasCalc: Array<{ talla: string | number; cantidad: number }> = [];

      if (tallasOverride && tallasOverride.length > 0) {
        // Usar las tallas editadas manualmente
        tallasCalc = tallasOverride;
      } else {
        const prodTallas = prodCat?.tallas || prodCat?.stockByTalla || l.producto?.tallas;

        if (Array.isArray(prodTallas) && prodTallas.length > 0) {
          const sumRatios = prodTallas.reduce((acc: number, t: any) => acc + getCurvaRatio(t, prodTallas), 0);
          const factor = sumRatios > 0 ? l.cantidadPedida / sumRatios : 1;
          tallasCalc = prodTallas.map((t: any) => ({
            talla: t.numero ?? t.sizeNumber ?? t.talla ?? t.nombre ?? '38',
            cantidad: Math.round(getCurvaRatio(t, prodTallas) * factor),
          }));
        } else {
          const tallasEstandar = [34, 35, 36, 37, 38];
          const ratios = [1, 1, 2, 1, 1]; // 6 pares = 1 media docena
          const sumRatios = ratios.reduce((a, b) => a + b, 0);
          const factor = l.cantidadPedida / sumRatios;
          tallasCalc = tallasEstandar.map((t, i) => ({
            talla: t,
            cantidad: Math.round(ratios[i] * factor),
          }));
        }
      }

      map.set(key, {
        productId: l.productId,
        nombre: l.producto?.nombre || prodCat?.nombre || prodCat?.name || 'Calzado de Cuero',
        marca: l.producto?.marca || prodCat?.marca || prodCat?.brand || '',
        codigo: l.producto?.codigo || prodCat?.codigo || prodCat?.code || '',
        color: l.producto?.color || prodCat?.color || '',
        imageUrl: foto,
        serie: l.producto?.serie || prodCat?.serie?.name || 'Serie Estándar',
        cantidadPedida: l.cantidadPedida,
        precioCosto: Number(l.precioCosto),
        subtotal: subtotal,
        observacionLinea: l.observacionLinea,
        ids: l.id ? [l.id] : [],
        tallasDesglose: tallasCalc,
      });
    }
  });

  return Array.from(map.values());
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

  const [saving, setSaving] = useState(false);

  // Filtros de órdenes por estado
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstadoOrden, setFiltroEstadoOrden] = useState<string>('BORRADOR');

  // Control de acordeones desplegables para numeración
  const [modelosExpandidos, setModelosExpandidos] = useState<Record<string, boolean>>({});

  const toggleExpandModelo = (key: string) => {
    setModelosExpandidos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Modales
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrdenCompra | null>(null);
  const [editingOrder, setEditingOrder] = useState(false);

  // Modal Cuenta Corriente
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [cuentaCorrienteData, setCuentaCorrienteData] = useState<any | null>(null);
  const [loadingCuenta, setLoadingCuenta] = useState(false);

  // Modal Pagos
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

  // Selector Interactivo de Modelos con Curva exacta
  const [busquedaModelo, setBusquedaModelo] = useState('');
  const [showDropdownModelo, setShowDropdownModelo] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any | null>(null);
  const [subtipoCurva, setSubtipoCurva] = useState<'MEDIA_DOCENA' | 'DOCENA'>('MEDIA_DOCENA');
  const [cantidadCurvas, setCantidadCurvas] = useState<number>(2); // Por defecto 2 medias docenas = 12 pares
  const [precioCostoInput, setPrecioCostoInput] = useState<number>(0);
  const [observacionItemInput, setObservacionItemInput] = useState<string>('');

  const [orderLines, setOrderLines] = useState<Array<{
    productId: string;
    cantidadPedida: number;
    precioCosto: number;
    observacionLinea?: string;
    producto?: any;
    tallasDesglose?: Array<{ talla: string | number; cantidad: number }>;
  }>>([]);

  // Form: Recepción de Mercancía
  const [entrySupplierId, setEntrySupplierId] = useState('');
  const [entryOrderId, setEntryOrderId] = useState('');
  const [entryObservaciones, setEntryObservaciones] = useState('');
  const [entryModelos, setEntryModelos] = useState<Array<{
    productId: string;
    nombre: string;
    marca: string;
    codigo: string;
    color: string;
    fotoUrl: string;
    serieNombre: string;
    precioCosto: number;
    observacionLinea?: string;
    tallas: Array<{
      tallaId: string;
      sizeNumber: string | number;
      cantidadIngresada: number;
      cantidadEsperada: number;
      diferencia: number;
    }>;
  }>>([]);

  useEffect(() => {
    loadData();
  }, [online]);

  const loadData = async () => {
    setLoading(true);
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
      setProductos(prods || []);

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
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const totalDeuda = proveedores.reduce((acc, p) => acc + (p.saldoPendiente || 0), 0);
    const totalPagado = proveedores.reduce((acc, p) => acc + (p.totalPagado || 0), 0);
    const totalCompras = proveedores.reduce((acc, p) => acc + (p.totalCompras || 0), 0);
    const ordenesActivas = ordenes.filter((o) => o.estado === 'PENDIENTE' || o.estado === 'BORRADOR' || o.estado === 'RECIBIDA_PARCIAL').length;

    return { totalDeuda, totalPagado, totalCompras, ordenesActivas };
  }, [proveedores, ordenes]);

  const handleCreateProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruc || !razonSocial) {
      showToast('El RUC y la Razón Social son obligatorios.', 'error');
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

      showToast('Proveedor registrado correctamente.', 'success');
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

  // Cálculo dinámico de pares totales y distribución de curva según la serie real del modelo
  const baseParesSerieSeleccionada = useMemo(() => {
    if (!productoSeleccionado) return 6;
    const prodTallas = productoSeleccionado.tallas || productoSeleccionado.stockByTalla || [];
    if (prodTallas.length === 0) return 6;
    const sum = prodTallas.reduce(
      (acc: number, t: any) => acc + getCurvaRatio(t, prodTallas),
      0
    );
    return sum || prodTallas.length || 6;
  }, [productoSeleccionado]);

  const paresCalculados = useMemo(() => {
    const base = subtipoCurva === 'MEDIA_DOCENA' ? baseParesSerieSeleccionada : baseParesSerieSeleccionada * 2;
    return (cantidadCurvas || 1) * base;
  }, [subtipoCurva, cantidadCurvas, baseParesSerieSeleccionada]);

  const distribucionPreview = useMemo(() => {
    if (!productoSeleccionado) return [];
    const prodTallas = productoSeleccionado.tallas || productoSeleccionado.stockByTalla || [];
    
    if (prodTallas.length > 0) {
      return prodTallas.map((t: any) => {
        const ratio = getCurvaRatio(t, prodTallas);
        const factor = ratio * (subtipoCurva === 'MEDIA_DOCENA' ? 1 : 2) * (cantidadCurvas || 1);
        return {
          talla: t.numero ?? t.sizeNumber ?? t.talla ?? t.nombre,
          cantidad: factor,
        };
      });
    }

    // Curva estándar
    const ratios = [1, 1, 2, 1, 1]; // 6 pares base
    const tallas = [34, 35, 36, 37, 38];
    return tallas.map((t, i) => ({
      talla: t,
      cantidad: ratios[i] * (subtipoCurva === 'MEDIA_DOCENA' ? 1 : 2) * (cantidadCurvas || 1),
    }));
  }, [productoSeleccionado, subtipoCurva, cantidadCurvas]);

  // Agregar Modelo a la orden
  const handleAgregarModeloAOrden = (isEditingExisting: boolean = false) => {
    if (!productoSeleccionado) {
      showToast('Seleccione un modelo de calzado.', 'error');
      return;
    }

    if (paresCalculados <= 0) {
      showToast('La cantidad de pares debe ser mayor a 0.', 'error');
      return;
    }

    if (precioCostoInput <= 0) {
      showToast('El precio de costo debe ser mayor a $0.00.', 'error');
      return;
    }

    const foto = obtenerFotoProducto(productoSeleccionado);
    const nuevaLinea = {
      productId: productoSeleccionado.id,
      cantidadPedida: paresCalculados,
      precioCosto: precioCostoInput,
      subtotal: paresCalculados * precioCostoInput,
      observacionLinea: observacionItemInput || undefined,
      tallasDesglose: distribucionPreview,
      producto: {
        id: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre || productoSeleccionado.name || 'Calzado',
        marca: productoSeleccionado.marca || productoSeleccionado.brand || '',
        codigo: productoSeleccionado.codigo || productoSeleccionado.code || '',
        color: productoSeleccionado.color || '',
        imageUrl: foto,
        fotoUrl: foto,
        serie: productoSeleccionado.serie?.name || productoSeleccionado.serieNombre || 'Serie Estándar',
        tallas: productoSeleccionado.tallas,
      },
    };

    if (isEditingExisting && selectedOrder) {
      const lineasActuales = [...(selectedOrder.lines || []), nuevaLinea];
      setSelectedOrder({ ...selectedOrder, lines: lineasActuales });
    } else {
      setOrderLines([...orderLines, nuevaLinea]);
    }

    setProductoSeleccionado(null);
    setBusquedaModelo('');
    setCantidadCurvas(2);
    setPrecioCostoInput(0);
    setObservacionItemInput('');
    showToast(`Modelo agregado a la orden (${paresCalculados} pares).`, 'success');
  };

  const handleRemoveOrderLine = (index: number, isEditingExisting: boolean = false) => {
    if (isEditingExisting && selectedOrder) {
      const lineas = selectedOrder.lines?.filter((_, i) => i !== index) || [];
      setSelectedOrder({ ...selectedOrder, lines: lineas });
    } else {
      setOrderLines(orderLines.filter((_, i) => i !== index));
    }
  };

  // Crear Orden en BORRADOR (Acumulativa)
  const handleCrearOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSupplierId) {
      showToast('Seleccione un proveedor.', 'error');
      return;
    }

    if (orderLines.length === 0) {
      showToast('Agregue al menos un modelo a la orden.', 'error');
      return;
    }

    setSaving(true);
    try {
      await ApiService.post('/proveedores/ordenes-compra', {
        supplierId: orderSupplierId,
        observaciones: orderObservaciones || undefined,
        estado: 'BORRADOR', // SIEMPRE BORRADOR HASTA QUE SE PRESIONE ENVIAR
        lines: orderLines.map((l) => ({
          productId: l.productId,
          cantidadPedida: l.cantidadPedida,
          precioCosto: l.precioCosto,
          observacionLinea: l.observacionLinea || undefined,
        })),
      });

      showToast('Borrador de orden guardado. Se acumulará hasta que decidas enviarla al proveedor.', 'success');
      setShowOrderModal(false);
      setOrderSupplierId('');
      setOrderObservaciones('');
      setOrderLines([]);
      setFiltroEstadoOrden('BORRADOR');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al crear la orden de compra.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarEdicionOrden = async () => {
    if (!selectedOrder) return;
    if (!selectedOrder.lines || selectedOrder.lines.length === 0) {
      showToast('La orden debe tener al menos un producto.', 'error');
      return;
    }

    setSaving(true);
    try {
      await ApiService.put(`/proveedores/ordenes-compra/${selectedOrder.id}`, {
        observaciones: selectedOrder.observaciones,
        lines: selectedOrder.lines.map((l) => ({
          productId: l.productId,
          cantidadPedida: l.cantidadPedida,
          precioCosto: l.precioCosto,
          observacionLinea: l.observacionLinea || undefined,
        })),
      });

      showToast('Orden actualizada correctamente.', 'success');
      setEditingOrder(false);
      handleVerDetalleOrden(selectedOrder.id);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar los cambios.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Botón EXPLÍCITO para ENVIAR la orden y cambiar estado a ENVIADA
  const handleEnviarYGenerarPDF = async (orderId: string) => {
    setSaving(true);
    try {
      await ApiService.patch(`/proveedores/ordenes-compra/${orderId}/confirmar`, {});
      showToast('¡Orden de compra enviada al proveedor exitosamente! Estado: ENVIADA', 'success');
      await handleDescargarPDFOrden(orderId);

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

  const handleDescargarPDFOrden = async (orderId: string) => {
    try {
      const order = await ApiService.get(`/proveedores/ordenes-compra/${orderId}`);
      if (!order) return;

      const lineasConsolidadas = consolidarLineasOrden(order.lines || [], productos);

      const pdfData: OrdenCompraPdfData = {
        emisor: {
          nombre: "LOCAL COMERCIAL DE CALZADO",
          ruc: "1804884664001",
          direccion: "Cevallos, Tungurahua, Ecuador",
          telefono: "0998765432",
          email: "pedidos@calzadocevallos.com",
        },
        orden: {
          numero: `OC-${String(order.numero).padStart(4, '0')}`,
          fecha: new Date(order.createdAt).toLocaleDateString('es-EC'),
          estado: order.estado === 'PENDIENTE' ? 'ENVIADA' : order.estado,
          observaciones: order.observaciones,
        },
        proveedor: {
          nombre: order.supplier?.razonSocial || order.supplier?.nombre || 'Proveedor',
          ruc: order.supplier?.ruc || '9999999999001',
          contacto: order.supplier?.contacto,
          direccion: order.supplier?.direccion,
          email: order.supplier?.email,
        },
        lineas: lineasConsolidadas.map((l) => ({
          modelo: l.nombre,
          marca: l.marca,
          color: l.color,
          codigo: l.codigo,
          imageUrl: l.imageUrl,
          cantidadPares: l.cantidadPedida,
          precioCosto: l.precioCosto,
          subtotal: l.subtotal,
          // Confidencialidad: En el PDF para el fabricante/proveedor NO se envía información del cliente
          observacion: l.observacionLinea && !l.observacionLinea.includes('Cliente:')
            ? l.observacionLinea
            : undefined,
        })),
        totales: {
          totalPares: lineasConsolidadas.reduce((acc, l) => acc + l.cantidadPedida, 0),
          totalPagar: Number(order.total),
        },
      };

      descargarOrdenCompraPdf(pdfData);
      showToast('PDF de Orden de Compra descargado.', 'success');
    } catch (e: any) {
      showToast('No se pudo generar el documento PDF.', 'error');
    }
  };

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

  const handleIrARecepcionDesdeOrden = (order: OrdenCompra) => {
    setShowOrderDetailModal(false);
    setActiveTab('ingreso');
    setEntrySupplierId(order.supplierId);
    handleSelectOrderForEntry(order.id);
  };

  const handleSelectOrderForEntry = async (orderId: string) => {
    setEntryOrderId(orderId);
    if (!orderId) {
      setEntryModelos([]);
      return;
    }

    try {
      const order = await ApiService.get(`/proveedores/ordenes-compra/${orderId}`);
      if (order && order.lines && order.lines.length > 0) {
        const consolidados = consolidarLineasOrden(order.lines, productos);
        const modelosData: typeof entryModelos = [];

        consolidados.forEach((c) => {
          const prodCat = productos.find((p) => p.id === c.productId);
          const foto = c.imageUrl || obtenerFotoProducto(prodCat);

          const tallasArr = (c.tallasDesglose || []).map((td: any) => ({
            tallaId: String(td.talla),
            sizeNumber: td.talla,
            cantidadIngresada: td.cantidad,
            cantidadEsperada: td.cantidad,
            diferencia: 0,
          }));

          modelosData.push({
            productId: c.productId,
            nombre: c.nombre,
            marca: c.marca,
            codigo: c.codigo,
            color: c.color,
            fotoUrl: foto,
            serieNombre: c.serie,
            precioCosto: c.precioCosto,
            observacionLinea: c.observacionLinea || '',
            tallas: tallasArr,
          });
        });

        setEntryModelos(modelosData);
        if (order.observaciones) {
          setEntryObservaciones(`Ref. Orden OC-${String(order.numero).padStart(4, '0')}: ${order.observaciones}`);
        }
      }
    } catch (e) {
      console.warn('Error al auto-llenar modelos desde orden:', e);
    }
  };

  const handleAddEntryModeloExtra = () => {
    if (!productoSeleccionado) {
      showToast('Seleccione un modelo para agregar a la recepción.', 'error');
      return;
    }
    const foto = obtenerFotoProducto(productoSeleccionado);
    const prodTallas = productoSeleccionado.tallas || productoSeleccionado.stockByTalla || [];
    
    let tallasInit: Array<{
      tallaId: string;
      sizeNumber: string | number;
      cantidadIngresada: number;
      cantidadEsperada: number;
      diferencia: number;
    }> = [];

    if (prodTallas.length > 0) {
      tallasInit = prodTallas.map((t: any) => ({
        tallaId: t.id || String(t.sizeNumber || t.talla),
        sizeNumber: t.sizeNumber || t.talla || t.numero || '38',
        cantidadIngresada: 2,
        cantidadEsperada: 0,
        diferencia: 2,
      }));
    } else {
      tallasInit = [34, 35, 36, 37, 38].map((t) => ({
        tallaId: String(t),
        sizeNumber: t,
        cantidadIngresada: 2,
        cantidadEsperada: 0,
        diferencia: 2,
      }));
    }

    setEntryModelos([
      ...entryModelos,
      {
        productId: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre || productoSeleccionado.name || 'Calzado Extra',
        marca: productoSeleccionado.marca || productoSeleccionado.brand || '',
        codigo: productoSeleccionado.codigo || productoSeleccionado.code || '',
        color: productoSeleccionado.color || '',
        fotoUrl: foto,
        serieNombre: productoSeleccionado.serie?.name || 'Serie Estándar',
        precioCosto: Number(productoSeleccionado.precioCosto || productoSeleccionado.costPrice || 10),
        observacionLinea: 'Modelo extra no pedido',
        tallas: tallasInit,
      },
    ]);

    setProductoSeleccionado(null);
    setBusquedaModelo('');
    showToast('Modelo adicional agregado a la recepción.', 'success');
  };

  const handleUpdateTallaQty = (modeloIdx: number, tallaIdx: number, val: number) => {
    const updated = [...entryModelos];
    const item = updated[modeloIdx].tallas[tallaIdx];
    item.cantidadIngresada = val;
    item.diferencia = val - item.cantidadEsperada;
    setEntryModelos(updated);
  };

  const handleRemoveEntryModelo = (idx: number) => {
    setEntryModelos(entryModelos.filter((_, i) => i !== idx));
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entrySupplierId) {
      showToast('Seleccione un proveedor.', 'error');
      return;
    }

    if (entryModelos.length === 0) {
      showToast('Agregue al menos un modelo a la recepción.', 'error');
      return;
    }

    const flatLines: any[] = [];
    let hayFaltantes = false;

    entryModelos.forEach((m) => {
      m.tallas.forEach((t) => {
        if (t.diferencia < 0) hayFaltantes = true;
        flatLines.push({
          productId: m.productId,
          tallaId: t.tallaId || 'TALLA_STANDAR',
          cantidadIngresada: t.cantidadIngresada,
          cantidadEsperada: t.cantidadEsperada,
          diferencia: t.diferencia,
          precioCosto: m.precioCosto,
          observacionLinea: m.observacionLinea || undefined,
        });
      });
    });

    const estadoCalculado = hayFaltantes ? 'CON_DIFERENCIAS' : 'COMPLETA';

    setSaving(true);
    try {
      await ApiService.post('/proveedores/entradas', {
        supplierId: entrySupplierId,
        supplierOrderId: entryOrderId || undefined,
        observaciones: entryObservaciones || undefined,
        estado: estadoCalculado,
        lines: flatLines,
      });

      showToast(
        hayFaltantes
          ? 'Mercancía ingresada con faltantes. La orden queda como Parcial y el saldo se actualizó.'
          : 'Recepción completada exitosamente. Stock físico y saldo por pagar actualizados al instante.',
        'success'
      );
      setEntrySupplierId('');
      setEntryOrderId('');
      setEntryObservaciones('');
      setEntryModelos([]);

      // Recarga inmediata de proveedores, órdenes y saldos por pagar
      await loadData();

      // Cambiar de inmediato a la pestaña de Proveedores y Deudas para ver el saldo actualizado en vivo
      setActiveTab('proveedores');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('proveedores_data_updated'));
        window.dispatchEvent(new CustomEvent('dashboard_refresh'));
      }
    } catch (err: any) {
      showToast(err.message || 'Error al registrar la recepción.', 'error');
    } finally {
      setSaving(false);
    }
  };

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

      showToast('Pago registrado correctamente. Saldo actualizado.', 'success');
      setShowPaymentModal(false);
      if (showCuentaModal && selectedSupplierId === paymentSupplierId) {
        handleAbrirCuentaCorriente(paymentSupplierId);
      }
      await loadData();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('proveedores_data_updated'));
        window.dispatchEvent(new CustomEvent('dashboard_refresh'));
      }
    } catch (err: any) {
      showToast(err.message || 'Error al registrar el pago.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarPagoWhatsApp = (p: SupplierPayment) => {
    const telefono = p.supplier?.contacto || '';
    let numLimpio = telefono.replace(/\D/g, "");
    if (numLimpio.startsWith("09") && numLimpio.length === 10) {
      numLimpio = "593" + numLimpio.substring(1);
    } else if (numLimpio.startsWith("0") && numLimpio.length === 10) {
      numLimpio = "593" + numLimpio.substring(1);
    }

    const prov = proveedores.find((pr) => pr.id === p.supplierId);
    const saldo = prov?.saldoPendiente ?? 0;

    const mensaje = `*COMPROBANTE DE PAGO A PROVEEDOR*\n\nEstimado/a *${p.supplier?.nombre || 'Proveedor'}*,\n\nLe confirmamos que se ha registrado un pago a su favor:\n\n💵 *Monto:* $${Number(p.monto).toFixed(2)}\n💳 *Método:* ${p.metodo}${p.banco ? ` (${p.banco})` : ''}\n📄 *Comprobante / Ref:* ${p.comprobante || 'N/A'}\n📅 *Fecha:* ${new Date(p.createdAt).toLocaleDateString('es-EC')}\n${p.notas ? `📝 *Concepto:* ${p.notas}\n` : ''}\n💼 *Saldo Pendiente:* $${saldo.toFixed(2)}\n\n_Comprobante emitido automáticamente._`;

    const waUrl = numLimpio
      ? `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    window.open(waUrl, "_blank");
  };

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

  // Pestañas de Órdenes
  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((o) => {
      let matchEstado = true;
      if (filtroEstadoOrden === 'BORRADOR') matchEstado = o.estado === 'BORRADOR';
      else if (filtroEstadoOrden === 'PENDIENTE') matchEstado = o.estado === 'PENDIENTE';
      else if (filtroEstadoOrden === 'RECIBIDA_PARCIAL') matchEstado = o.estado === 'RECIBIDA_PARCIAL';
      else if (filtroEstadoOrden === 'RECIBIDA') matchEstado = o.estado === 'RECIBIDA';
      else if (filtroEstadoOrden === 'CANCELADA') matchEstado = o.estado === 'CANCELADA';

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
      {/* ══════ HEADER SUPERIOR & KPIs ══════ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Truck size={22} className="text-[#0F172A] dark:text-amber-400" />
            Proveedores & Cuentas por Pagar
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Órdenes de compra acumulativas por docenas, verificación de recepciones y estados de cuenta
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
                setOrderLines([]);
                setProductoSeleccionado(null);
                setBusquedaModelo('');
                setShowOrderModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm border border-slate-700"
            >
              <Plus size={14} className="text-amber-400" />
              <span>Emitir Orden de Compra (Borrador)</span>
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
            <span>Borradores y Enviadas</span>
            <Clock size={14} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {metrics.ordenesActivas} <span className="text-xs font-normal text-[var(--muted-foreground)]">órdenes</span>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">Acumulándose o en tránsito</p>
        </div>
      </div>

      {/* ══════ TABS PRINCIPALES ══════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-2">
        <div className="flex gap-2">
          {([
            ['proveedores', 'Proveedores & Deudas', Truck],
            ['ordenes', 'Órdenes de Compra', FileText],
            ['ingreso', 'Recepción de Mercancía', PackageCheck],
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

      {loading && (
        <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[#0F172A] dark:text-amber-400 mb-2" size={32} />
          <span className="text-xs">Cargando información...</span>
        </div>
      )}

      {/* ══════════════════════════════════════════
          PESTAÑA 1: PROVEEDORES & DEUDAS
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
          PESTAÑA 2: ÓRDENES DE COMPRA (Pestañas Ordenadas)
         ══════════════════════════════════════════ */}
      {!loading && activeTab === 'ordenes' && (
        <div className="space-y-4">
          {/* Barra de Filtros: Borradores por defecto, Enviadas, Parciales, Recibidas, Canceladas, Todas */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { key: 'BORRADOR', label: 'Pendientes (Borradores del Día)' },
              { key: 'PENDIENTE', label: 'Enviadas al Proveedor' },
              { key: 'RECIBIDA_PARCIAL', label: 'Parciales' },
              { key: 'RECIBIDA', label: 'Recibidas' },
              { key: 'CANCELADA', label: 'Canceladas' },
              { key: 'TODOS', label: 'Todas las Órdenes' },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setFiltroEstadoOrden(st.key)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs border ${
                  filtroEstadoOrden === st.key
                    ? 'bg-[#0F172A] text-white dark:bg-amber-400 dark:text-slate-900 border-transparent shadow-sm'
                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {ordenesFiltradas.length === 0 ? (
            <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              No hay órdenes de compra en esta pestaña ({filtroEstadoOrden === 'BORRADOR' ? 'No hay borradores pendientes' : filtroEstadoOrden}).
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--muted)]/50 border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-5 py-3.5">N° Orden</th>
                      <th className="px-4 py-3.5">Proveedor</th>
                      <th className="px-4 py-3.5">Modelo / Curva</th>
                      <th className="px-4 py-3.5 text-center">Estado</th>
                      <th className="px-4 py-3.5 text-right">Monto Total</th>
                      <th className="px-4 py-3.5 text-right">Fecha</th>
                      <th className="px-5 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {ordenesFiltradas.map((o) => {
                      const lineasConsolidadas = consolidarLineasOrden(o.lines || [], productos);
                      const firstModel = lineasConsolidadas[0];
                      const totalPares = lineasConsolidadas.reduce((acc, l) => acc + l.cantidadPedida, 0);

                      return (
                        <tr key={o.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                          <td className="px-5 py-3.5 font-bold font-mono text-[var(--foreground)]">
                            OC-{String(o.numero).padStart(4, '0')}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-xs text-[var(--foreground)]">
                            {o.supplier?.nombre || o.supplier?.razonSocial || 'Proveedor'}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-lg bg-[var(--muted)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
                                {firstModel?.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={firstModel.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={16} className="text-[var(--muted-foreground)]" />
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-xs block truncate max-w-[170px]">
                                  {firstModel?.nombre || 'Calzado'}
                                </span>
                                <span className="text-[10px] text-[var(--muted-foreground)]">
                                  {totalPares} pares ({ (totalPares / 12).toFixed(1) } doc.)
                                  {lineasConsolidadas.length > 1 && ` • +${lineasConsolidadas.length - 1} modelo(s) más`}
                                </span>
                              </div>
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
                              {o.estado === 'BORRADOR' ? 'Borrador' : o.estado === 'PENDIENTE' ? 'Enviada' : o.estado}
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
                                title="Ver Detalle / Modificar / Enviar"
                              >
                                <Eye size={13} />
                              </button>
                              {o.estado === 'BORRADOR' && (
                                <button
                                  onClick={() => handleEnviarYGenerarPDF(o.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                  title="Enviar Orden al Proveedor"
                                >
                                  <Send size={11} />
                                  <span>Enviar</span>
                                </button>
                              )}
                              {(o.estado === 'PENDIENTE' || o.estado === 'RECIBIDA_PARCIAL') && (
                                <button
                                  onClick={() => handleIrARecepcionDesdeOrden(o)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-lg transition-all text-xs font-bold shadow-2xs"
                                  title="Recibir Mercancía en Bodega"
                                >
                                  <PackageCheck size={13} />
                                  <span>Recibir</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDescargarPDFOrden(o.id)}
                                className="p-1.5 bg-[var(--muted)] hover:bg-emerald-600 hover:text-white rounded-lg transition-colors text-[var(--foreground)]"
                                title="Descargar PDF"
                              >
                                <Download size={13} />
                              </button>
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
                  Carga la orden de compra y despliega las tallas de cada modelo para registrar los pares que ingresan
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
                      setEntryModelos([]);
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
                    Vincular Orden de Compra (Carga Automática)
                  </label>
                  <select
                    disabled={!entrySupplierId}
                    value={entryOrderId}
                    onChange={(e) => handleSelectOrderForEntry(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A] disabled:opacity-50"
                  >
                    <option value="">Ingreso Manual Directo</option>
                    {ordenes
                      .filter((o) => o.supplierId === entrySupplierId && (o.estado === 'PENDIENTE' || o.estado === 'BORRADOR' || o.estado === 'RECIBIDA_PARCIAL'))
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          OC-{String(o.numero).padStart(4, '0')} (${Number(o.total).toFixed(2)}) - {o.estado === 'PENDIENTE' ? 'ENVIADA' : o.estado}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Observaciones Generales de la Entrega / Guía de Remisión
                </label>
                <input
                  type="text"
                  placeholder="Ej. Guía N° 001-928. Bultos revisados en recepción."
                  value={entryObservaciones}
                  onChange={(e) => setEntryObservaciones(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              {/* Buscador de modelos extra */}
              <div className="p-4 bg-[var(--muted)]/20 rounded-2xl border border-[var(--border)] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
                  ¿Entregaron modelos adicionales fuera de la orden?
                </span>

                {productoSeleccionado ? (
                  <div className="flex items-center justify-between p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                    <div className="flex items-center gap-3">
                      {obtenerFotoProducto(productoSeleccionado) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={obtenerFotoProducto(productoSeleccionado)} alt="" className="w-10 h-10 object-cover rounded-lg border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center font-bold">👟</div>
                      )}
                      <div>
                        <span className="font-bold text-xs block">{productoSeleccionado.nombre || productoSeleccionado.name}</span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {productoSeleccionado.marca} • {productoSeleccionado.color} ({productoSeleccionado.codigo})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddEntryModeloExtra}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                      >
                        + Agregar a Recepción
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductoSeleccionado(null)}
                        className="text-xs font-bold text-rose-500 hover:underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar modelo adicional con foto (nombre, código, color)..."
                      value={busquedaModelo}
                      onChange={(e) => {
                        setBusquedaModelo(e.target.value);
                        setShowDropdownModelo(true);
                      }}
                      onFocus={() => setShowDropdownModelo(true)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                    />
                    {showDropdownModelo && busquedaModelo.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                        {productos
                          .filter((p) => {
                            const q = busquedaModelo.toLowerCase().trim();
                            return (
                              (p.nombre && p.nombre.toLowerCase().includes(q)) ||
                              (p.name && p.name.toLowerCase().includes(q)) ||
                              (p.codigo && p.codigo.toLowerCase().includes(q)) ||
                              (p.color && p.color.toLowerCase().includes(q))
                            );
                          })
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setProductoSeleccionado(p);
                                setShowDropdownModelo(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--muted)] border-b border-[var(--border)] last:border-none flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                {obtenerFotoProducto(p) && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={obtenerFotoProducto(p)} alt="" className="w-8 h-8 object-cover rounded" />
                                )}
                                <div>
                                  <span className="font-bold block">{p.nombre || p.name}</span>
                                  <span className="text-[10px] text-[var(--muted-foreground)]">{p.marca} • {p.color}</span>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lista de Modelos en Recepción con Acordeón */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
                  Modelos a Recepcionar ({entryModelos.length})
                </span>

                {entryModelos.length === 0 ? (
                  <p className="text-center text-[var(--muted-foreground)] py-6 bg-[var(--muted)]/20 rounded-xl">
                    Seleccione una orden de compra o busque modelos para ingresar a bodega.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {entryModelos.map((m, mIdx) => {
                      const totalParesModelo = m.tallas.reduce((acc, t) => acc + t.cantidadIngresada, 0);
                      const isExpanded = modelosExpandidos[`recepcion_${mIdx}`] ?? true;

                      return (
                        <div
                          key={mIdx}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm"
                        >
                          <div
                            onClick={() => toggleExpandModelo(`recepcion_${mIdx}`)}
                            className="p-3.5 bg-[var(--muted)]/30 hover:bg-[var(--muted)]/50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-[var(--muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                                {m.fotoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={m.fotoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={18} className="text-[var(--muted-foreground)]" />
                                )}
                              </div>
                              <div>
                                <h5 className="font-bold text-xs text-[var(--foreground)]">{m.nombre}</h5>
                                <p className="text-[10px] text-[var(--muted-foreground)]">
                                  {m.marca} • {m.color} • {m.serieNombre}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-extrabold text-xs text-[#0F172A] dark:text-amber-400 font-mono block">
                                  {totalParesModelo} pares ({ (totalParesModelo / 12).toFixed(1) } doc.)
                                </span>
                                <span className="text-[10px] text-[var(--muted-foreground)]">
                                  ${m.precioCosto.toFixed(2)} c/u
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveEntryModelo(mIdx);
                                }}
                                className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                                title="Quitar modelo"
                              >
                                <Trash2 size={13} />
                              </button>
                              <div className="p-1 text-[var(--muted-foreground)]">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-4 border-t border-[var(--border)] bg-[var(--card)] space-y-3">
                              <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase block">
                                Pares Recibidos por Numeración:
                              </span>
                              <div className="flex flex-wrap gap-2.5">
                                {m.tallas.map((t, tIdx) => {
                                  const dif = t.diferencia;

                                  return (
                                    <div
                                      key={tIdx}
                                      className={`p-2 rounded-xl border flex items-center gap-2 ${
                                        dif < 0
                                          ? 'bg-rose-500/5 border-rose-500/30'
                                          : dif > 0
                                          ? 'bg-blue-500/5 border-blue-500/30'
                                          : 'bg-[var(--muted)]/20 border-[var(--border)]'
                                      }`}
                                    >
                                      <span className="font-extrabold text-xs text-[var(--foreground)] font-mono">
                                        T{t.sizeNumber}
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={t.cantidadIngresada}
                                        onChange={(e) => handleUpdateTallaQty(mIdx, tIdx, parseInt(e.target.value) || 0)}
                                        className="w-12 px-1.5 py-1 text-center font-bold text-xs bg-[var(--card)] border rounded-lg font-mono"
                                      />
                                      {t.cantidadEsperada > 0 && (
                                        <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                          / {t.cantidadEsperada} esp.
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <input
                                type="text"
                                placeholder="Observación específica de este modelo (ej. faltó 1 par talla 36)"
                                value={m.observacionLinea || ''}
                                onChange={(e) => {
                                  const updated = [...entryModelos];
                                  updated[mIdx].observacionLinea = e.target.value;
                                  setEntryModelos(updated);
                                }}
                                className="w-full px-2.5 py-1 bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg text-[11px] focus:outline-none focus:border-[#0F172A]"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs">
                  <span className="text-[var(--muted-foreground)]">Total Cargamento: </span>
                  <span className="font-extrabold text-[#0F172A] dark:text-amber-400 font-mono text-base ml-1">
                    ${entryModelos.reduce((sum, m) => sum + m.tallas.reduce((s, t) => s + (t.cantidadIngresada * m.precioCosto), 0), 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={saving || !online || entryModelos.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /><span>Guardando...</span></>
                  ) : (
                    <><CheckCircle size={14} className="text-emerald-400" /><span>Confirmar Recepción & Actualizar Stock</span></>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
              <h5 className="font-extrabold text-xs flex items-center gap-2 text-[#0F172A] dark:text-amber-400">
                <FileText size={15} />
                <span>Control de Entrada a Bodega</span>
              </h5>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Al recepcionar la mercancía, el sistema incrementa automáticamente el inventario físico por modelo y talla.
              </p>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Si la orden tiene faltantes, queda en estado <strong>RECIBIDA PARCIAL</strong> para controlar lo pendiente por entregar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          PESTAÑA 4: HISTORIAL DE PAGOS
         ══════════════════════════════════════════ */}
      {!loading && activeTab === 'pagos' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" />
              <span>Bitácora de Pagos & Abonos a Proveedores</span>
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
                    <th className="px-4 py-3 text-right">Monto Pagado</th>
                    <th className="px-5 py-3 text-center">WhatsApp</th>
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
                      <td className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        ${Number(p.monto).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => handleEnviarPagoWhatsApp(p)}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 mx-auto"
                          title="Enviar Comprobante al WhatsApp del Proveedor"
                        >
                          <MessageCircle size={12} />
                          <span>Notificar</span>
                        </button>
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
          MODAL: DETALLE DE ORDEN (Con Botón Enviar Explícito)
         ══════════════════════════════════════════ */}
      {showOrderDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#0F172A] text-white dark:bg-amber-400 dark:text-slate-900 rounded-2xl font-bold">
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
                      {selectedOrder.estado === 'BORRADOR' ? 'Borrador (Acumulándose)' : selectedOrder.estado === 'PENDIENTE' ? 'Enviada al Proveedor' : selectedOrder.estado}
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Proveedor: <strong>{selectedOrder.supplier?.razonSocial || selectedOrder.supplier?.nombre}</strong> ({selectedOrder.supplier?.ruc})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDescargarPDFOrden(selectedOrder.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Download size={13} />
                  <span>PDF Orden</span>
                </button>
                <button
                  onClick={() => { setShowOrderDetailModal(false); setEditingOrder(false); }}
                  className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-2xl p-4 space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Observaciones / Términos de Entrega
                </label>
                {editingOrder ? (
                  <textarea
                    rows={2}
                    value={selectedOrder.observaciones || ''}
                    onChange={(e) => setSelectedOrder({ ...selectedOrder, observaciones: e.target.value })}
                    placeholder="Instrucciones al proveedor..."
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                ) : (
                  <p className="text-xs text-[var(--foreground)] italic">
                    {selectedOrder.observaciones || 'Sin observaciones registradas.'}
                  </p>
                )}
              </div>

              {/* Lista de Modelos Consolidados con Acordeón Desplegable de Numeración */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Modelos Solicitados ({consolidarLineasOrden(selectedOrder.lines || [], productos).length})
                  </span>
                  {(selectedOrder.estado === 'BORRADOR' || selectedOrder.estado === 'PENDIENTE') && (
                    <button
                      onClick={() => setEditingOrder(!editingOrder)}
                      className="flex items-center gap-1 text-xs font-bold text-[#0F172A] dark:text-amber-400 hover:opacity-80"
                    >
                      <Edit3 size={13} />
                      <span>{editingOrder ? 'Finalizar Edición' : 'Modificar Orden (Pares / Docenas)'}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {consolidarLineasOrden(selectedOrder.lines || [], productos).map((line, idx) => {
                    const docenas = (line.cantidadPedida / 12).toFixed(1);
                    const isExpanded = modelosExpandidos[`orden_${idx}`] ?? true;

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm transition-all"
                      >
                        <div
                          onClick={() => toggleExpandModelo(`orden_${idx}`)}
                          className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-[var(--muted)]/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[var(--muted)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
                              {line.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={line.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={18} className="text-[var(--muted-foreground)]" />
                              )}
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-[var(--foreground)]">{line.nombre}</h5>
                              <div className="flex gap-2 text-[10px] text-[var(--muted-foreground)]">
                                <span>Cód: {line.codigo}</span>
                                {line.color && <span>• Color: {line.color}</span>}
                                {line.serie && <span>• Serie: {line.serie}</span>}
                              </div>
                              {line.observacionLinea && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  {line.observacionLinea.includes('Cliente:') ? (
                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded-md text-[10px] font-bold flex items-center gap-1">
                                      <span>👤 {line.observacionLinea}</span>
                                    </span>
                                  ) : (
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                      Nota: {line.observacionLinea}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            {editingOrder ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <span className="text-[9px] text-[var(--muted-foreground)] block text-center">Total Pares</span>
                                  <span className="w-16 px-2 py-1 bg-[var(--muted)] border border-[var(--border)] rounded text-xs text-center font-bold font-mono block">
                                    {line.tallasDesglose?.reduce((s, t) => s + t.cantidad, 0) || line.cantidadPedida}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedLines = (selectedOrder.lines || []).filter((l) => l.productId !== line.productId);
                                    setSelectedOrder({ ...selectedOrder, lines: updatedLines });
                                  }}
                                  className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                                  title="Quitar modelo"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ) : (
                              <div className="text-right">
                                <span className="text-[10px] text-[var(--muted-foreground)] block">
                                  {line.cantidadPedida} pares ({docenas} doc.) × ${Number(line.precioCosto).toFixed(2)}
                                </span>
                                <span className="font-extrabold text-[#0F172A] dark:text-amber-400 font-mono text-sm">
                                  ${(line.cantidadPedida * line.precioCosto).toFixed(2)}
                                </span>
                              </div>
                            )}

                            <div className="p-1 text-[var(--muted-foreground)]">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>

                        {/* Despliegue de Chips de Numeración — con +/- por talla en edición */}
                        {isExpanded && (
                          <div className="px-4 py-3 bg-[var(--muted)]/20 border-t border-[var(--border)]">
                            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase mr-1 block mb-2">
                              {editingOrder ? 'Ajustar Numeración por Talla:' : 'Numeración Solicitada:'}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {line.tallasDesglose?.map((td, tIdx) => (
                                <div
                                  key={tIdx}
                                  className={`flex items-center gap-1 rounded-lg border border-[var(--border)] shadow-2xs ${editingOrder ? 'bg-[var(--card)] px-1.5 py-1' : 'bg-[var(--card)] px-2.5 py-1'}`}
                                >
                                  <span className="text-[var(--foreground)] font-extrabold text-xs font-mono">T{td.talla}</span>
                                  {editingOrder ? (
                                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (td.cantidad <= 0) return;
                                          const newTallas = [...(line.tallasDesglose || [])];
                                          newTallas[tIdx] = { ...newTallas[tIdx], cantidad: td.cantidad - 1 };
                                          const newTotal = newTallas.reduce((s, t) => s + t.cantidad, 0);
                                          // Update the actual order lines
                                          const updatedLines = [...(selectedOrder.lines || [])];
                                          const target = updatedLines.find((l) => l.productId === line.productId);
                                          if (target) {
                                            target.cantidadPedida = newTotal;
                                            // Store tallas breakdown in a temporary field for UI
                                            (target as any)._tallasOverride = newTallas;
                                          }
                                          setSelectedOrder({ ...selectedOrder, lines: updatedLines });
                                        }}
                                        className="w-5 h-5 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded text-xs font-black transition-colors"
                                        title={`Quitar 1 par T${td.talla}`}
                                      >
                                        −
                                      </button>
                                      <span className="w-7 text-center text-xs font-bold font-mono text-[var(--foreground)]">
                                        {td.cantidad}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newTallas = [...(line.tallasDesglose || [])];
                                          newTallas[tIdx] = { ...newTallas[tIdx], cantidad: td.cantidad + 1 };
                                          const newTotal = newTallas.reduce((s, t) => s + t.cantidad, 0);
                                          const updatedLines = [...(selectedOrder.lines || [])];
                                          const target = updatedLines.find((l) => l.productId === line.productId);
                                          if (target) {
                                            target.cantidadPedida = newTotal;
                                            (target as any)._tallasOverride = newTallas;
                                          }
                                          setSelectedOrder({ ...selectedOrder, lines: updatedLines });
                                        }}
                                        className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded text-xs font-black transition-colors"
                                        title={`Agregar 1 par T${td.talla}`}
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-[var(--muted-foreground)]">({td.cantidad})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            {editingOrder && (
                              <div className="mt-2 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newTallas = (line.tallasDesglose || []).map(t => ({ ...t, cantidad: t.cantidad + 1 }));
                                    const newTotal = newTallas.reduce((s, t) => s + t.cantidad, 0);
                                    const updatedLines = [...(selectedOrder.lines || [])];
                                    const target = updatedLines.find((l) => l.productId === line.productId);
                                    if (target) {
                                      target.cantidadPedida = newTotal;
                                      (target as any)._tallasOverride = newTallas;
                                    }
                                    setSelectedOrder({ ...selectedOrder, lines: updatedLines });
                                  }}
                                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg text-[10px] font-bold transition-colors"
                                >
                                  +1 par c/talla
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newTallas = (line.tallasDesglose || []).map(t => ({ ...t, cantidad: Math.max(0, t.cantidad - 1) }));
                                    const newTotal = newTallas.reduce((s, t) => s + t.cantidad, 0);
                                    const updatedLines = [...(selectedOrder.lines || [])];
                                    const target = updatedLines.find((l) => l.productId === line.productId);
                                    if (target) {
                                      target.cantidadPedida = newTotal;
                                      (target as any)._tallasOverride = newTallas;
                                    }
                                    setSelectedOrder({ ...selectedOrder, lines: updatedLines });
                                  }}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-[10px] font-bold transition-colors"
                                >
                                  −1 par c/talla
                                </button>
                                <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                  = {line.tallasDesglose?.reduce((s, t) => s + t.cantidad, 0) || 0} pares total
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Modal con Botones */}
            <div className="p-6 border-t border-[var(--border)] bg-[var(--muted)]/20 flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="text-sm">
                <span className="text-[var(--muted-foreground)]">Total de la Orden: </span>
                <span className="font-black text-[#0F172A] dark:text-amber-400 font-mono text-lg ml-1">
                  ${consolidarLineasOrden(selectedOrder.lines || [], productos).reduce((sum, l) => sum + (l.cantidadPedida * l.precioCosto), 0).toFixed(2)}
                </span>
                <span className="text-xs text-[var(--muted-foreground)] ml-2 font-mono">
                  ({consolidarLineasOrden(selectedOrder.lines || [], productos).reduce((sum, l) => sum + l.cantidadPedida, 0)} pares totales)
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

                {selectedOrder.estado === 'BORRADOR' && (
                  <button
                    onClick={() => handleEnviarYGenerarPDF(selectedOrder.id)}
                    disabled={saving}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md transition-transform hover:scale-105"
                  >
                    <Send size={14} />
                    <span>Enviar Orden de Compra al Proveedor</span>
                  </button>
                )}

                {(selectedOrder.estado === 'PENDIENTE' || selectedOrder.estado === 'RECIBIDA_PARCIAL') && (
                  <button
                    onClick={() => {
                      setShowOrderDetailModal(false);
                      handleIrARecepcionDesdeOrden(selectedOrder);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <PackageCheck size={14} />
                    <span>Recibir Mercancía en Bodega</span>
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
                <span className="text-xs">Cargando balance...</span>
              </div>
            ) : cuentaCorrienteData ? (
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
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

                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-[var(--foreground)]">
                    <History size={16} />
                    <span>Línea de Tiempo de Movimientos</span>
                  </h4>
                  <button
                    onClick={() => handleAbrirModalPago(selectedSupplierId!, undefined, cuentaCorrienteData.resumen.saldoPendiente)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <DollarSign size={13} />
                    <span>Registrar Pago / Abono</span>
                  </button>
                </div>

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

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="text-right">
                              <span className={`font-black font-mono text-sm ${
                                isPago ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#0F172A] dark:text-amber-400'
                              }`}>
                                {isPago ? `-$${Number(mov.monto).toFixed(2)}` : `+$${Number(mov.monto).toFixed(2)}`}
                              </span>
                              <span className="text-[10px] text-[var(--muted-foreground)] block font-mono">
                                {new Date(mov.fecha).toLocaleDateString('es-EC')}
                              </span>
                            </div>

                            {isPago && (
                              <button
                                onClick={() => handleEnviarPagoWhatsApp({
                                  id: mov.id,
                                  supplierId: selectedSupplierId!,
                                  monto: mov.monto,
                                  metodo: mov.metodo || 'TRANSFERENCIA',
                                  banco: mov.banco,
                                  comprobante: mov.comprobante,
                                  notas: mov.descripcion,
                                  createdAt: mov.fecha,
                                  supplier: cuentaCorrienteData.supplier,
                                })}
                                className="p-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
                                title="Enviar Comprobante por WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </button>
                            )}
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
          MODAL: REGISTRAR PAGO A PROVEEDOR
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
          MODAL: EMITIR NUEVA ORDEN (Borrador con Curva Exacta)
         ══════════════════════════════════════════ */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center shrink-0">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <FileText className="text-[#0F172A] dark:text-amber-400" size={18} />
                <span>Emitir Orden de Compra a Proveedor (Borrador)</span>
              </h3>
              <button onClick={() => setShowOrderModal(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCrearOrden} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
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
                    Estado Inicial
                  </label>
                  <div className="px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-xs text-[var(--muted-foreground)] font-semibold flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    <span>Borrador (Acumulativo durante el día)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Observaciones Generales de la Orden
                </label>
                <input
                  type="text"
                  placeholder="Ej. Entrega antes del fin de mes, empacar en cajas individuales..."
                  value={orderObservaciones}
                  onChange={(e) => setOrderObservaciones(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              {/* Selector de Modelos con Curva Exacta */}
              <div className="p-4 bg-[var(--muted)]/20 rounded-2xl border border-[var(--border)] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
                  Seleccionar Modelo de Calzado & Curva
                </span>

                {productoSeleccionado ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl gap-3">
                    <div className="flex items-center gap-3">
                      {obtenerFotoProducto(productoSeleccionado) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={obtenerFotoProducto(productoSeleccionado)} alt="" className="w-12 h-12 object-cover rounded-lg border shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[var(--muted)] flex items-center justify-center text-lg shrink-0">👟</div>
                      )}
                      <div>
                        <div className="font-extrabold text-sm text-[var(--foreground)]">
                          {productoSeleccionado.nombre || productoSeleccionado.name} — {productoSeleccionado.color}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Marca: {productoSeleccionado.marca} • Cód: {productoSeleccionado.codigo} • Serie: {productoSeleccionado.serie?.name || 'Estándar'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setProductoSeleccionado(null)}
                      className="text-xs font-bold text-rose-500 hover:underline shrink-0"
                    >
                      Cambiar Modelo
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escribe para buscar modelo con foto (ej. Samba, Mocasín)..."
                      value={busquedaModelo}
                      onChange={(e) => {
                        setBusquedaModelo(e.target.value);
                        setShowDropdownModelo(true);
                      }}
                      onFocus={() => setShowDropdownModelo(true)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                    />

                    {showDropdownModelo && busquedaModelo.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto">
                        {productos
                          .filter((p) => {
                            const q = busquedaModelo.toLowerCase().trim();
                            return (
                              (p.nombre && p.nombre.toLowerCase().includes(q)) ||
                              (p.name && p.name.toLowerCase().includes(q)) ||
                              (p.codigo && p.codigo.toLowerCase().includes(q)) ||
                              (p.color && p.color.toLowerCase().includes(q)) ||
                              (p.marca && p.marca.toLowerCase().includes(q))
                            );
                          })
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setProductoSeleccionado(p);
                                setPrecioCostoInput(Number(p.precioCosto || p.costPrice || 0));
                                setShowDropdownModelo(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--muted)] border-b border-[var(--border)] last:border-none flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                {obtenerFotoProducto(p) && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={obtenerFotoProducto(p)} alt="" className="w-8 h-8 object-cover rounded" />
                                )}
                                <div>
                                  <span className="font-bold block">{p.nombre || p.name}</span>
                                  <span className="text-[10px] text-[var(--muted-foreground)]">{p.marca} • {p.color} ({p.codigo})</span>
                                </div>
                              </div>
                              <span className="font-mono text-emerald-600 font-bold">${Number(p.precioCosto || p.costPrice || 0).toFixed(2)}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Configuración de Curva Exacta */}
                {productoSeleccionado && (
                  <div className="p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] space-y-3">
                    <div>
                      <span className="text-xs font-bold text-[var(--foreground)] block mb-1.5">Seleccionar Curva de Serie:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSubtipoCurva('MEDIA_DOCENA')}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            subtipoCurva === 'MEDIA_DOCENA'
                              ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                              : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
                          }`}
                        >
                          {baseParesSerieSeleccionada === 6 ? '½ Media Docena (6 pares)' : `Curva Serie (${baseParesSerieSeleccionada} pares)`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtipoCurva('DOCENA')}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            subtipoCurva === 'DOCENA'
                              ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                              : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]'
                          }`}
                        >
                          {baseParesSerieSeleccionada * 2 === 12 ? '1 Docena (12 pares)' : `Doble Serie (${baseParesSerieSeleccionada * 2} pares)`}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-[var(--foreground)]">
                        {subtipoCurva === 'MEDIA_DOCENA'
                          ? (baseParesSerieSeleccionada === 6 ? '¿Cuántas medias docenas?:' : '¿Cuántas series?:')
                          : (baseParesSerieSeleccionada * 2 === 12 ? '¿Cuántas docenas?:' : '¿Cuántas doble series?:')}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCantidadCurvas(Math.max(1, cantidadCurvas - 1))}
                          className="w-8 h-8 rounded-lg border bg-[var(--muted)] flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={cantidadCurvas}
                          onChange={(e) => setCantidadCurvas(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 h-8 text-center font-bold text-xs bg-[var(--card)] border rounded-lg font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setCantidadCurvas(cantidadCurvas + 1)}
                          className="w-8 h-8 rounded-lg border bg-[var(--muted)] flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-black text-emerald-600">
                        = {paresCalculados} pares ({ (paresCalculados / 12).toFixed(1) } doc.)
                      </span>
                    </div>

                    {/* Previsualización idéntica de la distribución de curva */}
                    <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">
                          DISTRIBUCIÓN DE CURVA ({subtipoCurva === 'MEDIA_DOCENA' ? 'MEDIA DOCENA' : 'DOCENA COMPLETA'}):
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
                          Serie: {distribucionPreview.map((d: any) => `${d.cantidad}/${d.talla}`).join(', ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {distribucionPreview.map((d: any, i: number) => (
                          <div key={i} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs flex items-center gap-1.5">
                            <span className="font-bold text-emerald-700">T{d.talla}:</span>
                            <span className="font-black text-emerald-900 dark:text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                              {d.cantidad} pares
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Precio Costo Unit ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={precioCostoInput}
                          onChange={(e) => setPrecioCostoInput(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-[var(--card)] border rounded-lg text-xs font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Observación del Modelo</label>
                        <input
                          type="text"
                          placeholder="Ej. Hebilla dorada..."
                          value={observacionItemInput}
                          onChange={(e) => setObservacionItemInput(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--card)] border rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAgregarModeloAOrden(false)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Agregar a la Orden ({paresCalculados} pares)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Modelos en la Orden */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
                  Modelos en esta Orden ({orderLines.length})
                </span>

                {orderLines.length === 0 ? (
                  <p className="text-center text-[var(--muted-foreground)] py-4 bg-[var(--muted)]/20 rounded-xl">
                    Aún no has agregado ningún modelo a la orden.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orderLines.map((line, idx) => {
                      const docenas = (line.cantidadPedida / 12).toFixed(1);

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--muted)] border overflow-hidden shrink-0 flex items-center justify-center">
                              {line.producto?.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={line.producto.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package size={16} className="text-[var(--muted-foreground)]" />
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-xs block">{line.producto?.nombre}</span>
                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                {line.cantidadPedida} pares ({docenas} doc.) × ${line.precioCosto.toFixed(2)}
                                {line.observacionLinea && ` • Nota: ${line.observacionLinea}`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-extrabold font-mono text-sm text-[#0F172A] dark:text-amber-400">
                              ${(line.cantidadPedida * line.precioCosto).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderLine(idx, false)}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-[var(--muted-foreground)]">Total de la Orden: </span>
                  <span className="font-black text-[#0F172A] dark:text-amber-400 font-mono text-base ml-1">
                    ${orderLines.reduce((sum, l) => sum + (l.cantidadPedida * l.precioCosto), 0).toFixed(2)}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)] ml-2 font-mono">
                    ({orderLines.reduce((sum, l) => sum + l.cantidadPedida, 0)} pares)
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={saving || orderLines.length === 0}
                  className="px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 border border-slate-700"
                >
                  {saving ? 'Guardando...' : 'Guardar Borrador de Orden'}
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
