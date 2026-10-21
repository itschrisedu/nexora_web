"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ApiService } from '../services/api.service';
import { db } from '../db/local-db';
import UnsavedChangesModal from './ui/unsaved-changes-modal';
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
  Building2,
  ArrowRight,
  ArrowLeft,
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
  MessageCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Lock,
  UserCheck,
  User,
} from 'lucide-react';
import ConfirmModal from './ui/confirm-modal';
import { useToast } from './ui/toast';
import { descargarOrdenCompraPdf, obtenerOrdenCompraPdfBlobUrl, compartirOrdenCompraPdf, OrdenCompraPdfData, limpiarObservacionesOrden } from '../services/pdf-factura.service';
import { getClienteReputacion } from '../utils/cliente-reputacion';
import { validarRuc } from '../utils/ecuador-validators';
import { getCurvaDocena, TipoCurva } from '../utils/curvas';
import {
  formatearNombres,
  formatearApellidos,
  formatearEmail,
  validarEmailEstricto,
  formatearTelefono,
  formatearDireccion,
  formatearNombreSerie,
} from '../utils/text-formatters';
import { abrirWhatsAppUniversal } from '../utils/whatsapp';

interface ProveedoresProps {
  online: boolean;
  userRole?: string;
  activeSucursalId?: string;
  sucursales?: any[];
}

interface Proveedor {
  id: string;
  tenantId?: string;
  sucursalNombre?: string;
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
  saldoAFavor?: number;
  cruzadoConMercaderia?: number;
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
  tallasDesglose?: Array<{ talla: string | number; cantidad: number }>;
  _tallasOverride?: any;
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
  tenantId?: string;
  sucursalNombre?: string;
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
    tenantId?: string;
    sucursalNombre?: string;
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
  tenantId?: string;
  sucursalNombre?: string;
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
    tenantId?: string;
    sucursalNombre?: string;
    nombre: string;
    ruc: string;
    contacto?: string;
  };
}

interface EntradaMercancia {
  id: string;
  tenantId?: string;
  sucursalNombre?: string;
  numero: number;
  supplierOrderId?: string;
  supplierId: string;
  total: number;
  fechaIngreso: string;
  observaciones?: string;
  estado: string;
  supplier?: { nombre: string; ruc: string; sucursalNombre?: string };
  supplierOrder?: { numero: number };
}

// Función auxiliar para obtener la URL de imagen limpia
function obtenerFotoProducto(prod: any): string {
  if (!prod) return '';
  return (
    prod.imageUrl ||
    prod.fotoUrl ||
    prod.foto ||
    prod.image ||
    prod.model?.imageUrl ||
    prod.model?.products?.find((p: any) => p.imageUrl)?.imageUrl ||
    prod.images?.[0] ||
    ''
  );
}

// Función auxiliar para obtener el nombre limpio de la serie de un producto
function obtenerSerieProducto(prod: any): string {
  if (!prod) return '';
  if (prod.serieNombre && typeof prod.serieNombre === 'string') return prod.serieNombre.trim();
  if (prod.serie && typeof prod.serie === 'object') {
    if (prod.serie.nombre && typeof prod.serie.nombre === 'string') return prod.serie.nombre.trim();
    if (prod.serie.name && typeof prod.serie.name === 'string') return prod.serie.name.trim();
  }
  if (prod.serie && typeof prod.serie === 'string') return prod.serie.trim();
  if (prod.model?.serie && typeof prod.model.serie === 'object') {
    if (prod.model.serie.nombre && typeof prod.model.serie.nombre === 'string') return prod.model.serie.nombre.trim();
    if (prod.model.serie.name && typeof prod.model.serie.name === 'string') return prod.model.serie.name.trim();
  }
  return '';
}

// Cálculo del ratio de curva de una talla
function getCurvaRatio(talla: any, tallas: any[] = []): number {
  if (talla.ratio && talla.ratio > 0) return talla.ratio;
  if (talla.cantidadSerie && talla.cantidadSerie > 0) return talla.cantidadSerie;
  const positive = tallas.map((x: any) => x.cantidad || x.stock || 1).filter((q: number) => q > 0);
  const minQ = positive.length > 0 ? Math.min(...positive) : 1;
  return minQ > 0 ? Math.max(1, Math.round((talla.cantidad || talla.stock || 1) / minQ)) : 1;
}

// Formateo de docenas para etiquetas comerciales
function getDocenaLabel(pares: number): string {
  if (pares === 6) return '½ Docena';
  if (pares === 12) return '1 Docena';
  if (pares > 0 && pares % 12 === 0) return `${pares / 12} Docenas`;
  if (pares > 0 && pares % 6 === 0) return `${(pares / 12).toFixed(1)} Docenas`;
  return `${(pares / 12).toFixed(1)} Doc.`;
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
    reordenAutomatica?: boolean;
  }>();

  lines.forEach((l) => {
    const key = l.productId || l.id || Math.random().toString();
    const existing = map.get(key);
    const subtotal = l.subtotal || (l.cantidadPedida * l.precioCosto);
    const prodCat = catalogoProductos.find((p) => p.id === l.productId);
    const foto =
      obtenerFotoProducto(l.producto) ||
      obtenerFotoProducto(prodCat) ||
      (l as any).imageUrl ||
      (l as any).fotoUrl ||
      '';

    // 1. Si el usuario editó manualmente las tallas en memoria durante la sesión activa:
    let tallasOverride = (l as any)._tallasOverride as Array<{ talla: string | number; cantidad: number }> | undefined;

    // 2. Si no hay override en memoria, verificar si la curva viene persistida en observacionLinea:
    if (!tallasOverride && l.observacionLinea) {
      const matchCurva = l.observacionLinea.match(/\[Curva:\s*([^\]]+)\]/i) || l.observacionLinea.match(/Curva:\s*([0-9:,\s]+)/i);
      if (matchCurva) {
        const partes = matchCurva[1].split(',').map((s: string) => s.trim()).filter(Boolean);
        const parsedTallas = partes.map((pt: string) => {
          const [tStr, cStr] = pt.split(':').map((x: string) => x.trim().replace(/^T/i, ''));
          return {
            talla: isNaN(Number(tStr)) ? tStr : Number(tStr),
            cantidad: Number(cStr) || 0,
          };
        }).filter((t: any) => t.talla !== undefined && !isNaN(t.cantidad));
        if (parsedTallas.length > 0) {
          tallasOverride = parsedTallas;
        }
      }
    }

    if (existing) {
      existing.cantidadPedida += l.cantidadPedida;
      existing.subtotal += subtotal;
      if (l.observacionLinea && !existing.observacionLinea) {
        existing.observacionLinea = l.observacionLinea;
      }
      if (l.id) existing.ids.push(l.id);

      if (tallasOverride && tallasOverride.length > 0) {
        const prodTallas = prodCat?.tallas || prodCat?.stockByTalla || l.producto?.tallas;
        if (Array.isArray(prodTallas) && prodTallas.length > 0) {
          const sortedProdTallas = [...prodTallas].sort((a: any, b: any) => {
            const numA = Number(a.numero ?? a.sizeNumber ?? a.talla ?? a.nombre) || 0;
            const numB = Number(b.numero ?? b.sizeNumber ?? b.talla ?? b.nombre) || 0;
            return numA - numB;
          });
          existing.tallasDesglose = sortedProdTallas.map((pt: any) => {
            const num = pt.numero ?? pt.sizeNumber ?? pt.talla ?? pt.nombre ?? '38';
            const found = tallasOverride?.find((to: any) => String(to.talla) === String(num));
            return {
              tallaId: pt.id || pt.tallaId || String(num),
              talla: num,
              cantidad: found ? Number(found.cantidad) || 0 : 0,
            };
          });
        } else {
          existing.tallasDesglose = tallasOverride;
        }
      } else {
        // Recalcular tallas con la nueva cantidad total
        const prodTallas = prodCat?.tallas || prodCat?.stockByTalla || l.producto?.tallas;
        if (Array.isArray(prodTallas) && prodTallas.length > 0) {
          const sortedProdTallas = [...prodTallas].sort((a: any, b: any) => {
            const numA = Number(a.numero ?? a.sizeNumber ?? a.talla ?? a.nombre) || 0;
            const numB = Number(b.numero ?? b.sizeNumber ?? b.talla ?? b.nombre) || 0;
            return numA - numB;
          });
          const sumRatios = sortedProdTallas.reduce((acc: number, t: any) => acc + getCurvaRatio(t, sortedProdTallas), 0);
          const factor = sumRatios > 0 ? existing.cantidadPedida / sumRatios : 1;
          existing.tallasDesglose = sortedProdTallas.map((t: any) => ({
            tallaId: t.id || t.tallaId || '',
            talla: t.numero ?? t.sizeNumber ?? t.talla ?? t.nombre ?? '38',
            cantidad: Math.round(getCurvaRatio(t, sortedProdTallas) * factor),
          }));
        }
      }
    } else {
      let tallasCalc: Array<{ tallaId?: string; talla: string | number; cantidad: number }> = [];

      if (tallasOverride && tallasOverride.length > 0) {
        const prodTallas = prodCat?.tallas || prodCat?.stockByTalla || l.producto?.tallas;
        if (Array.isArray(prodTallas) && prodTallas.length > 0) {
          const sortedProdTallas = [...prodTallas].sort((a: any, b: any) => {
            const numA = Number(a.numero ?? a.sizeNumber ?? a.talla ?? a.nombre) || 0;
            const numB = Number(b.numero ?? b.sizeNumber ?? b.talla ?? b.nombre) || 0;
            return numA - numB;
          });
          tallasCalc = sortedProdTallas.map((pt: any) => {
            const num = pt.numero ?? pt.sizeNumber ?? pt.talla ?? pt.nombre ?? '38';
            const found = tallasOverride?.find((to: any) => String(to.talla) === String(num));
            return {
              tallaId: pt.id || pt.tallaId || String(num),
              talla: num,
              cantidad: found ? Number(found.cantidad) || 0 : 0,
            };
          });
        } else {
          tallasCalc = tallasOverride.map((to: any) => ({
            tallaId: (to as any).tallaId || String(to.talla),
            talla: to.talla,
            cantidad: Number(to.cantidad) || 0,
          }));
        }
      } else {
        const prodTallas = prodCat?.tallas || prodCat?.stockByTalla || l.producto?.tallas;

        if (Array.isArray(prodTallas) && prodTallas.length > 0) {
          const sortedProdTallas = [...prodTallas].sort((a: any, b: any) => {
            const numA = Number(a.numero ?? a.sizeNumber ?? a.talla ?? a.nombre) || 0;
            const numB = Number(b.numero ?? b.sizeNumber ?? b.talla ?? b.nombre) || 0;
            return numA - numB;
          });
          const sumRatios = sortedProdTallas.reduce((acc: number, t: any) => acc + getCurvaRatio(t, sortedProdTallas), 0);
          const factor = sumRatios > 0 ? l.cantidadPedida / sumRatios : 1;
          tallasCalc = sortedProdTallas.map((t: any) => ({
            tallaId: t.id || t.tallaId || '',
            talla: t.numero ?? t.sizeNumber ?? t.talla ?? t.nombre ?? '38',
            cantidad: Math.round(getCurvaRatio(t, sortedProdTallas) * factor),
          }));
        } else {
          const tallasEstandar = [34, 35, 36, 37, 38];
          const ratios = [1, 1, 2, 1, 1]; // 6 pares = 1 media docena
          const sumRatios = ratios.reduce((a, b) => a + b, 0);
          const factor = l.cantidadPedida / sumRatios;
          tallasCalc = tallasEstandar.map((t, i) => ({
            tallaId: '',
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
        reordenAutomatica: (l.producto as any)?.reordenAutomatica ?? prodCat?.reordenAutomatica ?? true,
      });
    }
  });

  return Array.from(map.values());
}

export default function ProveedoresComponent({ online, userRole, activeSucursalId, sucursales }: ProveedoresProps) {
  const { showToast } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [pagos, setPagos] = useState<SupplierPayment[]>([]);
  const [entradas, setEntradas] = useState<EntradaMercancia[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'proveedores' | 'ordenes' | 'ingreso' | 'pagos' | 'devoluciones'>('proveedores');
  const [pendientesDevolucion, setPendientesDevolucion] = useState<any[]>([]);
  const [devolucionesProveedor, setDevolucionesProveedor] = useState<any[]>([]);

  // Modales Devoluciones
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [showManualDefectuosoModal, setShowManualDefectuosoModal] = useState(false);
  const [showConstanciaModal, setShowConstanciaModal] = useState(false);
  const [selectedConstancia, setSelectedConstancia] = useState<any | null>(null);

  // Form: Devolución a Proveedor
  const [devSupplierId, setDevSupplierId] = useState('');
  const [devClienteDevolucionId, setDevClienteDevolucionId] = useState('');
  const [devMotivo, setDevMotivo] = useState('');
  const [devEntregadoPor, setDevEntregadoPor] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u?.nombre || u?.name || 'Bodega / Despacho';
      } catch {
        return 'Bodega / Despacho';
      }
    }
    return 'Bodega / Despacho';
  });
  const [devRecibidoPor, setDevRecibidoPor] = useState('');
  const [devLines, setDevLines] = useState<Array<{
    productId: string;
    tallaId: string;
    cantidad: number;
    precioCosto: number;
    modelName: string;
    color: string;
    brand: string;
    imageUrl: string;
    numeroTalla: number | string;
  }>>([]);

  // Form: Registro Manual de Defectuoso
  const [manualProd, setManualProd] = useState<any | null>(null);
  const [busquedaManualProd, setBusquedaManualProd] = useState('');
  const [manualMotivo, setManualMotivo] = useState('');
  const [manualTallaId, setManualTallaId] = useState('');
  const [manualCantidad, setManualCantidad] = useState(1);
  const [manualPrecioCosto, setManualPrecioCosto] = useState(0);

  const [saving, setSaving] = useState(false);

  // Modal de confirmación UI (reemplaza confirm nativo)
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

  // Filtros de órdenes por estado (Borrador/Pendiente por pedir por defecto)
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
  const [addingModelToDetail, setAddingModelToDetail] = useState(false);

  // Modal Consolidar Demanda Pendiente de Clientes (Fase 5.2)
  const [showConsolidarDemandaModal, setShowConsolidarDemandaModal] = useState(false);
  const [demandaPendienteData, setDemandaPendienteData] = useState<any | null>(null);
  const [loadingDemanda, setLoadingDemanda] = useState(false);
  const [proveedorConsolidarId, setProveedorConsolidarId] = useState('');
  const [cantidadesConsolidadasMap, setCantidadesConsolidadasMap] = useState<Record<string, number>>({});
  const [modelosSeleccionadosConsolidar, setModelosSeleccionadosConsolidar] = useState<Record<string, boolean>>({});
  const [generandoOCConsolidada, setGenerandoOCConsolidada] = useState(false);
  const [observacionesConsolidar, setObservacionesConsolidar] = useState('');

  // Modal Previsualizador de PDF
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewData, setPdfPreviewData] = useState<OrdenCompraPdfData | null>(null);

  // Modal Cuenta Corriente
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [cuentaCorrienteData, setCuentaCorrienteData] = useState<any | null>(null);
  const [loadingCuenta, setLoadingCuenta] = useState(false);
  const [movimientoExpandidoId, setMovimientoExpandidoId] = useState<string | null>(null);

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
  const [provNombres, setProvNombres] = useState('');
  const [provApellidos, setProvApellidos] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [contacto, setContacto] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');

  // Saldo anterior / Deuda inicial al crear proveedor
  const [tieneDeudaAnterior, setTieneDeudaAnterior] = useState(false);
  const [deudaAnteriorMonto, setDeudaAnteriorMonto] = useState('');
  const [deudaAnteriorConcepto, setDeudaAnteriorConcepto] = useState('Saldo anterior pendiente');
  const [deudaAnteriorFechaEmision, setDeudaAnteriorFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [deudaAnteriorFechaVencimiento, setDeudaAnteriorFechaVencimiento] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [deudaAnteriorNotas, setDeudaAnteriorNotas] = useState('');

  // Proveedores Globales de la Empresa (para adopción inter-sucursales)
  const [globalSuppliers, setGlobalSuppliers] = useState<any[]>([]);
  const [loadingGlobalSuppliers, setLoadingGlobalSuppliers] = useState(false);

  const loadGlobalSuppliers = useCallback(async () => {
    setLoadingGlobalSuppliers(true);
    try {
      const res = await ApiService.get('/proveedores/buscar-global');
      if (Array.isArray(res)) {
        setGlobalSuppliers(res);
      }
    } catch (e) {
      console.warn('Error cargando catálogo global de proveedores:', e);
    } finally {
      setLoadingGlobalSuppliers(false);
    }
  }, []);

  const sugerenciasGlobales = useMemo(() => {
    if (!showSupplierModal) return [];
    const rucQuery = (ruc || '').trim().toLowerCase();
    const nomQuery = `${provNombres} ${provApellidos} ${nombreComercial}`.trim().toLowerCase();
    if (rucQuery.length < 3 && nomQuery.length < 3) return [];

    return globalSuppliers.filter((s) => {
      if (s.estaEnEstaSucursal) return false;
      const rucS = (s.ruc || '').toLowerCase();
      const razonS = (s.razonSocial || s.nombre || '').toLowerCase();
      const contactoS = (s.contacto || '').toLowerCase();
      const rucMatch = rucQuery.length >= 3 && rucS.includes(rucQuery);
      const nomMatch = nomQuery.length >= 3 && (razonS.includes(nomQuery) || contactoS.includes(nomQuery));
      return rucMatch || nomMatch;
    });
  }, [showSupplierModal, ruc, provNombres, provApellidos, nombreComercial, globalSuppliers]);

  const adoptarProveedorGlobal = (prov: any) => {
    if (prov.ruc) setRuc(prov.ruc);
    if (prov.razonSocial) {
      setNombreComercial(prov.razonSocial);
      const partes = prov.razonSocial.trim().split(/\s+/);
      if (partes.length >= 2) {
        setProvNombres(partes[0]);
        setProvApellidos(partes.slice(1).join(' '));
      } else {
        setProvNombres(prov.razonSocial);
        setProvApellidos('');
      }
    }
    if (prov.contacto) setContacto(prov.contacto);
    if (prov.direccion) setDireccion(prov.direccion);
    if (prov.email) setEmail(prov.email);
    showToast(`Datos del proveedor "${prov.razonSocial}" autocompletados desde ${prov.sucursalOrigenNombre || 'otra sucursal'}.`, 'info');
  };

  // Form: Editar Proveedor
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Proveedor | null>(null);
  const [editRazonSocial, setEditRazonSocial] = useState('');
  const [editContacto, setEditContacto] = useState('');
  const [editDireccion, setEditDireccion] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Form: Nueva Orden
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderObservaciones, setOrderObservaciones] = useState('');
  const [mostrarObsGeneralOrden, setMostrarObsGeneralOrden] = useState(false);

  // Selector Interactivo de Modelos con Curva exacta
  const [busquedaModelo, setBusquedaModelo] = useState('');
  const [showDropdownModelo, setShowDropdownModelo] = useState(false);
  const [serieFiltroOrden, setSerieFiltroOrden] = useState<string>('TODAS');
  const [productoSeleccionado, setProductoSeleccionado] = useState<any | null>(null);
  const [subtipoCurva, setSubtipoCurva] = useState<TipoCurva>('MEDIA_A');
  const [cantidadCurvas, setCantidadCurvas] = useState<number>(2); // Por defecto 2 medias docenas = 12 pares
  const [precioCostoInput, setPrecioCostoInput] = useState<number>(0);
  const [observacionItemInput, setObservacionItemInput] = useState<string>('');
  const [mostrarObsModeloOrden, setMostrarObsModeloOrden] = useState(false);

  const [orderLines, setOrderLines] = useState<Array<{
    productId: string;
    cantidadPedida: number;
    precioCosto: number;
    subtotal?: number;
    observacionLinea?: string;
    producto?: any;
    tallasDesglose?: Array<{ talla: string | number; cantidad: number }>;
    _tallasOverride?: any;
  }>>([]);

  // Form: Recepción de Mercancía
  const [entrySupplierId, setEntrySupplierId] = useState('');
  const [entryOrderId, setEntryOrderId] = useState('');
  const [entryEntregadoPor, setEntryEntregadoPor] = useState('');
  const [entryRecibidoPor, setEntryRecibidoPor] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u?.nombre || u?.name || 'Bodega / Recepción';
      } catch {
        return 'Bodega / Recepción';
      }
    }
    return 'Bodega / Recepción';
  });
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
    if (showSupplierModal) {
      loadGlobalSuppliers();
    }
  }, [showSupplierModal, loadGlobalSuppliers]);

  // Control de descartes y cierre seguro de modales
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const pendingCloseRef = useRef<(() => void) | null>(null);

  const safeDismiss = useCallback((closeFn: () => void, isDirty: boolean) => {
    if (isDirty) {
      pendingCloseRef.current = closeFn;
      setShowDiscardModal(true);
    } else {
      closeFn();
    }
  }, []);

  const isDirtySupplier = useCallback(() => {
    return showSupplierModal && (ruc.trim() !== '' || provNombres.trim() !== '' || provApellidos.trim() !== '' || nombreComercial.trim() !== '' || contacto.trim() !== '' || direccion.trim() !== '' || email.trim() !== '');
  }, [showSupplierModal, ruc, provNombres, provApellidos, nombreComercial, contacto, direccion, email]);

  const isDirtyOrder = useCallback(() => {
    return showOrderModal && (orderLines.length > 0 || orderSupplierId !== '' || orderObservaciones.trim() !== '');
  }, [showOrderModal, orderLines.length, orderSupplierId, orderObservaciones]);

  const isDirtyPayment = useCallback(() => {
    return showPaymentModal && (montoPago.trim() !== '' || (metodoPago !== 'EFECTIVO' && (comprobantePago.trim() !== '' || bancoPago.trim() !== '')) || notasPago.trim() !== '');
  }, [showPaymentModal, montoPago, metodoPago, comprobantePago, notasPago, bancoPago]);

  const isDirtyDevolucion = useCallback(() => {
    return showDevolucionModal && (devSupplierId !== '' || devMotivo.trim() !== '' || devLines.length > 0);
  }, [showDevolucionModal, devSupplierId, devMotivo, devLines.length]);

  const isDirtyManualDefectuoso = useCallback(() => {
    return showManualDefectuosoModal && (manualProd !== null || manualMotivo.trim() !== '' || busquedaManualProd.trim() !== '');
  }, [showManualDefectuosoModal, manualProd, manualMotivo, busquedaManualProd]);

  // Manejador global de la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDiscardModal) return;
      if (confirmModal.isOpen) {
        e.preventDefault();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        return;
      }
      if (showPdfPreviewModal) {
        e.preventDefault();
        setShowPdfPreviewModal(false);
        return;
      }
      if (showConstanciaModal) {
        e.preventDefault();
        setShowConstanciaModal(false);
        return;
      }
      if (showManualDefectuosoModal) {
        e.preventDefault();
        safeDismiss(() => setShowManualDefectuosoModal(false), isDirtyManualDefectuoso());
        return;
      }
      if (showDevolucionModal) {
        e.preventDefault();
        safeDismiss(() => setShowDevolucionModal(false), isDirtyDevolucion());
        return;
      }
      if (showSupplierModal) {
        e.preventDefault();
        safeDismiss(() => { setShowSupplierModal(false); resetSupplierForm(); }, isDirtySupplier());
        return;
      }
      if (showEditSupplierModal) {
        e.preventDefault();
        setShowEditSupplierModal(false);
        setEditingSupplier(null);
        return;
      }
      if (showOrderModal) {
        e.preventDefault();
        safeDismiss(() => setShowOrderModal(false), isDirtyOrder());
        return;
      }
      if (showPaymentModal) {
        e.preventDefault();
        safeDismiss(() => setShowPaymentModal(false), isDirtyPayment());
        return;
      }
      if (showCuentaModal) {
        e.preventDefault();
        setShowCuentaModal(false);
        return;
      }
      if (showOrderDetailModal) {
        e.preventDefault();
        setShowOrderDetailModal(false);
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    showDiscardModal, confirmModal.isOpen, showPdfPreviewModal, showConstanciaModal,
    showManualDefectuosoModal, showDevolucionModal, showSupplierModal, showEditSupplierModal, showOrderModal,
    showPaymentModal, showCuentaModal, showOrderDetailModal, safeDismiss,
    isDirtyManualDefectuoso, isDirtyDevolucion, isDirtySupplier, isDirtyOrder, isDirtyPayment
  ]);

  useEffect(() => {
    loadData();
  }, [online, activeSucursalId]);

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
        const querySucursal = activeSucursalId && activeSucursalId !== 'TODAS' ? `?sucursalId=${activeSucursalId}` : '';
        const [prvs, ords, pgs, ents, clis, pends, devs] = await Promise.all([
          ApiService.get('/proveedores').catch((e) => { console.warn('Error cargando proveedores:', e); return []; }),
          ApiService.get(`/proveedores/ordenes-compra${querySucursal}`).catch((e) => { console.warn('Error cargando ordenes:', e); return []; }),
          ApiService.get('/proveedores/pagos/todos').catch((e) => { console.warn('Error cargando pagos:', e); return []; }),
          ApiService.get('/proveedores/entradas').catch((e) => { console.warn('Error cargando entradas:', e); return []; }),
          ApiService.get('/clientes').catch(() => []),
          ApiService.get('/devoluciones/cliente/pendientes-proveedor').catch(() => []),
          ApiService.get('/devoluciones/proveedor').catch(() => []),
        ]);
        setProveedores(prvs || []);
        setOrdenes(ords || []);
        setPagos(pgs || []);
        setEntradas(ents || []);
        setClientesList(Array.isArray(clis) ? clis : []);
        setPendientesDevolucion(pends || []);
        setDevolucionesProveedor(devs || []);

        try {
          const initialTab = localStorage.getItem('proveedores_initial_tab');
          if (initialTab && ['proveedores', 'ordenes', 'ingreso', 'pagos', 'devoluciones'].includes(initialTab)) {
            setActiveTab(initialTab as any);
            localStorage.removeItem('proveedores_initial_tab');
          }
          const initialOrderId = localStorage.getItem('proveedores_selected_order_id');
          if (initialOrderId) {
            localStorage.removeItem('proveedores_selected_order_id');
            const match = (ords || []).find((o: any) => o.id === initialOrderId);
            if (match) {
              handleVerDetalleOrden(match.id);
            }
          }
        } catch (e) {}
      } else {
        const localClis = await db.clientes.toArray();
        setClientesList(localClis || []);
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
    if (!provNombres.trim() || !provApellidos.trim()) {
      showToast('Los Nombres y Apellidos del proveedor son obligatorios.', 'error');
      return;
    }

    if (!contacto.trim()) {
      showToast('El número de teléfono / WhatsApp es obligatorio.', 'error');
      return;
    }

    if (ruc && !validarRuc(ruc)) {
      showToast('El RUC o Cédula ingresado no es válido (debe tener 10 o 13 dígitos numéricos).', 'error');
      return;
    }

    if (email) {
      const emailVal = validarEmailEstricto(email);
      if (!emailVal.valido) {
        showToast(emailVal.mensaje || 'El correo electrónico no es válido.', 'error');
        return;
      }
    }

    const razonSocialFinal = nombreComercial.trim() || `${provNombres.trim()} ${provApellidos.trim()}`;

    setSaving(true);
    try {
      const res = await ApiService.post('/proveedores', {
        ruc: ruc.trim(),
        razonSocial: razonSocialFinal,
        nombreComercial: nombreComercial.trim() || undefined,
        nombres: provNombres.trim(),
        apellidos: provApellidos.trim(),
        contacto: contacto.trim() ? (formatearTelefono(contacto) || contacto.trim()) : `${provNombres.trim()} ${provApellidos.trim()}`,
        direccion: direccion.trim() ? formatearDireccion(direccion) : undefined,
        email: email.trim() ? formatearEmail(email) : undefined,
      });

      const montoNum = parseFloat(deudaAnteriorMonto);
      if (tieneDeudaAnterior && res?.id && !isNaN(montoNum) && montoNum > 0) {
        try {
          await ApiService.post('/proveedores/deuda-manual', {
            supplierId: res.id,
            monto: montoNum,
            concepto: deudaAnteriorConcepto.trim() || 'Saldo anterior pendiente',
            fechaEmision: deudaAnteriorFechaEmision || new Date().toISOString().split('T')[0],
            fechaVencimiento: deudaAnteriorFechaVencimiento || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            notas: deudaAnteriorNotas.trim() || undefined,
          });
        } catch (errDeuda: any) {
          console.error("Error al registrar saldo inicial del proveedor:", errDeuda);
        }
      }

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

  const handleOpenEditSupplier = (p: Proveedor) => {
    setEditingSupplier(p);
    setEditRazonSocial(p.razonSocial || p.nombre || '');
    setEditContacto(p.contacto || '');
    setEditDireccion(p.direccion || '');
    setEditEmail(p.email || '');
    setTieneDeudaAnterior(false);
    setDeudaAnteriorMonto('');
    setDeudaAnteriorConcepto('Saldo anterior pendiente');
    setDeudaAnteriorFechaEmision(new Date().toISOString().split('T')[0]);
    setDeudaAnteriorFechaVencimiento(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setDeudaAnteriorNotas('');
    setShowEditSupplierModal(true);
  };

  const handleUpdateProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    if (!editRazonSocial.trim()) {
      showToast('La Razón Social o Nombre es obligatoria.', 'error');
      return;
    }

    if (editEmail && editEmail.trim() !== '') {
      const emailVal = validarEmailEstricto(editEmail);
      if (!emailVal.valido) {
        showToast(emailVal.mensaje || 'El correo electrónico no es válido.', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const updatedContacto = editContacto.trim() ? (formatearTelefono(editContacto) || editContacto.trim()) : '';
      const updatedDireccion = editDireccion.trim() ? formatearDireccion(editDireccion) : '';
      const updatedEmail = editEmail.trim() ? formatearEmail(editEmail) : '';

      await ApiService.put(`/proveedores/${editingSupplier.id}`, {
        razonSocial: editRazonSocial.trim(),
        contacto: updatedContacto,
        direccion: updatedDireccion,
        email: updatedEmail,
      });

      const montoNum = parseFloat(deudaAnteriorMonto);
      if (tieneDeudaAnterior && editingSupplier.id && !isNaN(montoNum) && montoNum > 0) {
        try {
          await ApiService.post('/proveedores/deuda-manual', {
            supplierId: editingSupplier.id,
            monto: montoNum,
            concepto: deudaAnteriorConcepto.trim() || 'Saldo anterior pendiente',
            fechaEmision: deudaAnteriorFechaEmision || new Date().toISOString().split('T')[0],
            fechaVencimiento: deudaAnteriorFechaVencimiento || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            notas: deudaAnteriorNotas.trim() || undefined,
          });
        } catch (errDeuda: any) {
          console.error("Error al registrar saldo del proveedor:", errDeuda);
        }
      }

      setProveedores((prev) =>
        prev.map((item) =>
          item.id === editingSupplier.id
            ? {
                ...item,
                razonSocial: editRazonSocial.trim(),
                nombre: editRazonSocial.trim(),
                contacto: updatedContacto,
                direccion: updatedDireccion,
                email: updatedEmail,
                saldoPendiente: (item.saldoPendiente || 0) + (tieneDeudaAnterior && !isNaN(montoNum) && montoNum > 0 ? montoNum : 0),
              }
            : item
        )
      );

      showToast('Proveedor actualizado correctamente.', 'success');
      setShowEditSupplierModal(false);
      setEditingSupplier(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar el proveedor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetSupplierForm = () => {
    setRuc('');
    setProvNombres('');
    setProvApellidos('');
    setNombreComercial('');
    setContacto('');
    setDireccion('');
    setEmail('');
    setTieneDeudaAnterior(false);
    setDeudaAnteriorMonto('');
    setDeudaAnteriorConcepto('Saldo anterior pendiente');
    setDeudaAnteriorFechaEmision(new Date().toISOString().split('T')[0]);
    setDeudaAnteriorFechaVencimiento(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setDeudaAnteriorNotas('');
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

  const serieNombreActiva = useMemo(() => {
    if (!productoSeleccionado) return 'ADULTO';
    return (
      productoSeleccionado.serie?.nombre ||
      productoSeleccionado.serieNombre ||
      productoSeleccionado.model?.serie?.nombre ||
      productoSeleccionado.model?.serieNombre ||
      (typeof productoSeleccionado.serie === 'string' ? productoSeleccionado.serie : null) ||
      productoSeleccionado.serie?.name ||
      'ADULTO'
    );
  }, [productoSeleccionado]);

  // Cálculo de pares totales de la orden
  const paresCalculados = useMemo(() => {
    const base = subtipoCurva === 'DOCENA' ? 12 : 6;
    return (cantidadCurvas || 1) * base;
  }, [subtipoCurva, cantidadCurvas]);

  // Previsualización y distribución exacta de tallas según curva de calzado (Media A, Media B, Docena)
  const distribucionPreview = useMemo(() => {
    if (!productoSeleccionado) return [];
    const prodTallas = productoSeleccionado.tallas || productoSeleccionado.stockByTalla || [];
    const curvaMap = getCurvaDocena(serieNombreActiva, subtipoCurva);
    const hasCurva = Object.keys(curvaMap).length > 0;
    const factorCurvas = cantidadCurvas || 1;

    if (prodTallas.length > 0) {
      const sortedTallas = [...prodTallas].sort((a: any, b: any) => {
        const numA = Number(a.numero ?? a.sizeNumber ?? a.talla ?? a.nombre) || 0;
        const numB = Number(b.numero ?? b.sizeNumber ?? b.talla ?? b.nombre) || 0;
        return numA - numB;
      });

      return sortedTallas.map((t: any) => {
        const num = Number(t.numero ?? t.sizeNumber ?? t.talla ?? t.nombre) || 0;
        let qty = 0;
        if (hasCurva) {
          qty = (curvaMap[num] || 0) * factorCurvas;
        } else {
          qty = (subtipoCurva === 'DOCENA' ? 2 : 1) * factorCurvas;
        }
        return {
          tallaId: t.id || t.tallaId || '',
          talla: num || (t.numero ?? t.sizeNumber ?? t.talla ?? t.nombre),
          cantidad: qty,
        };
      });
    }

    // Tallas estándar de respaldo si no están cargadas en BD
    const tallasFallback = serieNombreActiva.toUpperCase().includes('JUVENIL')
      ? [34, 35, 36, 37, 38]
      : [38, 39, 40, 41, 42];

    return tallasFallback.map((num) => ({
      tallaId: '',
      talla: num,
      cantidad: ((curvaMap[num] ?? (subtipoCurva === 'DOCENA' ? 2 : 1)) * factorCurvas),
    }));
  }, [productoSeleccionado, serieNombreActiva, subtipoCurva, cantidadCurvas]);

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
      _tallasOverride: distribucionPreview,
    };

    if (isEditingExisting && selectedOrder) {
      const existingIdx = (selectedOrder.lines || []).findIndex((l: any) => l.productId === productoSeleccionado.id);
      if (existingIdx >= 0) {
        const lineasActuales = [...(selectedOrder.lines || [])];
        const exist = lineasActuales[existingIdx];
        const newCant = exist.cantidadPedida + paresCalculados;
        lineasActuales[existingIdx] = {
          ...exist,
          cantidadPedida: newCant,
          subtotal: newCant * (exist.precioCosto || precioCostoInput),
          observacionLinea: observacionItemInput ? `${exist.observacionLinea || ''} | ${observacionItemInput}`.trim() : exist.observacionLinea,
          tallasDesglose: distribucionPreview,
          _tallasOverride: distribucionPreview,
        };
        setSelectedOrder({ ...selectedOrder, lines: lineasActuales });
      } else {
        setSelectedOrder({ ...selectedOrder, lines: [...(selectedOrder.lines || []), nuevaLinea] });
      }
    } else {
      const existingIdx = orderLines.findIndex((l: any) => l.productId === productoSeleccionado.id);
      if (existingIdx >= 0) {
        const lineasActuales = [...orderLines];
        const exist = lineasActuales[existingIdx];
        const newCant = exist.cantidadPedida + paresCalculados;
        lineasActuales[existingIdx] = {
          ...exist,
          cantidadPedida: newCant,
          subtotal: newCant * (exist.precioCosto || precioCostoInput),
          observacionLinea: observacionItemInput ? `${exist.observacionLinea || ''} | ${observacionItemInput}`.trim() : exist.observacionLinea,
          tallasDesglose: distribucionPreview,
          _tallasOverride: distribucionPreview,
        };
        setOrderLines(lineasActuales);
      } else {
        setOrderLines([...orderLines, nuevaLinea]);
      }
    }

    setProductoSeleccionado(null);
    setBusquedaModelo('');
    setCantidadCurvas(2);
    setPrecioCostoInput(0);
    setObservacionItemInput('');
    setMostrarObsModeloOrden(false);
    setAddingModelToDetail(false);
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
      const consolidadas = consolidarLineasOrden(selectedOrder.lines || [], productos);
      const lineasAGuardar = consolidadas.map((c) => {
        const tallas = c.tallasDesglose || [];
        const cantFinal = tallas.length > 0
          ? tallas.reduce((s, t) => s + (Number(t.cantidad) || 0), 0)
          : c.cantidadPedida;

        // Limpiar cualquier residuo previo de curva
        let obs = (c.observacionLinea || '').trim();
        obs = obs
          .replace(/\[Curva:\s*[^\]]+\]/gi, '')
          .replace(/Curva:\s*[^|;)]+/gi, '')
          .replace(/^\|\s*|\s*\|\s*$/g, '')
          .trim();

        // Serializar la curva exacta de tallas para que persista en BD
        const curvaTag = tallas.length > 0
          ? `[Curva: ${tallas.map((t) => `${t.talla}:${t.cantidad}`).join(', ')}]`
          : '';

        const obsFinal = [curvaTag, obs].filter(Boolean).join(' | ');

        return {
          productId: c.productId,
          cantidadPedida: cantFinal,
          precioCosto: c.precioCosto,
          observacionLinea: obsFinal || undefined,
        };
      });

      // Añadir marca de ajuste manual si no la tiene para proteger la orden de auto-acumulaciones
      let obsOrden = (selectedOrder.observaciones || '').trim();
      if (!obsOrden.includes('[AJUSTE_MANUAL]')) {
        obsOrden = obsOrden ? `[AJUSTE_MANUAL] ${obsOrden}` : '[AJUSTE_MANUAL]';
      }

      await ApiService.put(`/proveedores/ordenes-compra/${selectedOrder.id}`, {
        observaciones: obsOrden,
        lines: lineasAGuardar,
      });

      showToast('Orden actualizada y guardada con éxito.', 'success');
      setEditingOrder(false);
      await handleVerDetalleOrden(selectedOrder.id);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar los cambios.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────
  // FASE 5.2 — Handlers para Consolidación de Demanda
  // ──────────────────────────────────────────
  const handleAbrirConsolidarDemanda = async () => {
    setLoadingDemanda(true);
    setShowConsolidarDemandaModal(true);
    try {
      const data = await ApiService.get('/proveedores/demanda-pendiente');
      setDemandaPendienteData(data);
      if (data && data.items) {
        const cMap: Record<string, number> = {};
        const sMap: Record<string, boolean> = {};
        data.items.forEach((item: any) => {
          cMap[item.productId] = item.totalParesFaltantes;
          sMap[item.productId] = true;
        });
        setCantidadesConsolidadasMap(cMap);
        setModelosSeleccionadosConsolidar(sMap);
        if (data.items.length > 0 && data.items[0].supplierId) {
          setProveedorConsolidarId(data.items[0].supplierId);
        } else if (proveedores.length > 0) {
          setProveedorConsolidarId(proveedores[0].id);
        }
      }
    } catch (e: any) {
      showToast(e.message || 'Error al obtener la demanda pendiente de pedidos.', 'error');
    } finally {
      setLoadingDemanda(false);
    }
  };

  const handleGenerarOCConsolidada = async () => {
    if (!proveedorConsolidarId) {
      showToast('Por favor selecciona un proveedor destinatario para la orden.', 'warning');
      return;
    }
    if (!demandaPendienteData || !demandaPendienteData.items) return;

    const itemsAIncluir = demandaPendienteData.items.filter(
      (it: any) => modelosSeleccionadosConsolidar[it.productId] && (cantidadesConsolidadasMap[it.productId] || 0) > 0
    );

    if (itemsAIncluir.length === 0) {
      showToast('Debes seleccionar al menos un modelo con cantidad mayor a 0.', 'warning');
      return;
    }

    setGenerandoOCConsolidada(true);
    try {
      const lines = itemsAIncluir.map((it: any) => ({
        productId: it.productId,
        cantidadPedida: cantidadesConsolidadasMap[it.productId] || it.totalParesFaltantes,
        precioCosto: it.costPrice > 0 ? it.costPrice : 15.00,
        observacionLinea: `Demanda clientes: ${it.tallas.map((t: any) => `T${t.tallaNumero}:${t.paresFaltantes}`).join(', ')}`,
      }));

      const res = await ApiService.post('/proveedores/ordenes-compra/consolidar-demanda', {
        supplierId: proveedorConsolidarId,
        lines,
        observaciones: observacionesConsolidar || undefined,
        estado: 'BORRADOR',
      });

      showToast(res.message || 'Orden de compra consolidada creada exitosamente.', 'success');
      setShowConsolidarDemandaModal(false);
      setObservacionesConsolidar('');
      setFiltroEstadoOrden('BORRADOR');
      setActiveTab('ordenes');
      await loadData();
    } catch (e: any) {
      showToast(e.message || 'Error al consolidar la orden de compra.', 'error');
    } finally {
      setGenerandoOCConsolidada(false);
    }
  };

  // Constructor unificado de datos para el PDF del fabricante (100% Confidencial - Sin datos de clientes)
  const construirPdfData = (order: any): OrdenCompraPdfData => {
    const lineasConsolidadas = consolidarLineasOrden(order.lines || [], productos);
    const sucursalActual = sucursales?.find((s) => s.id === (order.sucursalId || activeSucursalId));
    const emisorNombre = sucursalActual?.nombre || "LOCAL COMERCIAL DE CALZADO";
    const emisorDireccion = sucursalActual?.direccion || "Cevallos, Tungurahua, Ecuador";
    const emisorTelefono = sucursalActual?.telefono || "0998765432";

    // Limpieza estricta de observaciones para no filtrar textos internos al taller
    const obsOrdenLimpia = limpiarObservacionesOrden(order.observaciones);

    return {
      emisor: {
        nombre: emisorNombre,
        ruc: "1804884664001",
        direccion: emisorDireccion,
        telefono: emisorTelefono,
        email: sucursalActual?.email || "pedidos@calzadocevallos.com",
      },
      orden: {
        numero: `OC-${String(order.numero).padStart(4, '0')}`,
        fecha: new Date(order.createdAt).toLocaleDateString('es-EC'),
        estado: order.estado === 'PENDIENTE' ? 'ENVIADA' : order.estado,
        observaciones: obsOrdenLimpia || undefined,
      },
      proveedor: {
        nombre: order.supplier?.razonSocial || order.supplier?.nombre || 'Proveedor',
        ruc: order.supplier?.ruc || '9999999999001',
        contacto: order.supplier?.contacto,
        direccion: order.supplier?.direccion,
        email: order.supplier?.email,
      },
      lineas: lineasConsolidadas.map((l) => {
        // Tallas con pares pedidos > 0
        const tallasValidas = (l.tallasDesglose || [])
          .filter((t) => Number(t.cantidad) > 0)
          .map((t) => ({ talla: String(t.talla), cantidad: Number(t.cantidad) }));

        const numeracionStr = tallasValidas.length > 0
          ? tallasValidas.map((t) => `T${t.talla} (${t.cantidad})`).join(' | ')
          : undefined;

        // Limpieza de privacidad estricta en la línea
        const obsFab = limpiarObservacionesOrden(l.observacionLinea);

        return {
          modelo: l.nombre,
          marca: l.marca,
          color: l.color,
          codigo: l.codigo,
          serie: l.serie || obtenerSerieProducto(l) || 'Adulto',
          numeracion: numeracionStr,
          tallasDetalle: tallasValidas,
          imageUrl: l.imageUrl || '',
          cantidadPares: l.cantidadPedida,
          precioCosto: l.precioCosto,
          subtotal: l.subtotal,
          observacion: obsFab || undefined,
        };
      }),
      totales: {
        totalPares: lineasConsolidadas.reduce((acc, l) => acc + l.cantidadPedida, 0),
        totalPagar: Number(order.total),
      },
    };
  };

  // Botón EXPLÍCITO para ENVIAR la orden y despachar por WhatsApp al proveedor
  const handleEnviarYGenerarPDF = async (orderId: string) => {
    setSaving(true);
    try {
      await ApiService.patch(`/proveedores/ordenes-compra/${orderId}/confirmar`, {});
      showToast('¡Orden enviada al proveedor exitosamente! Abriendo WhatsApp...', 'success');

      const order = await ApiService.get(`/proveedores/ordenes-compra/${orderId}`);
      if (order) {
        await handleEnviarOrdenWhatsApp(order);
      }

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

  const handleEjecutarAutoDespachoManual = async () => {
    setSaving(true);
    try {
      const res = await ApiService.post('/proveedores/auto-despacho/ejecutar-manual', {});
      showToast(res.message || 'Despacho automático ejecutado con éxito.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al ejecutar el despacho.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrevisualizarPDFOrden = async (orderId: string) => {
    try {
      const order = await ApiService.get(`/proveedores/ordenes-compra/${orderId}`);
      if (!order) return;

      const pdfData = construirPdfData(order);
      const url = await obtenerOrdenCompraPdfBlobUrl(pdfData);
      setPdfPreviewData(pdfData);
      setPdfPreviewUrl(url);
      setShowPdfPreviewModal(true);
    } catch (e: any) {
      showToast('No se pudo generar la vista previa del PDF.', 'error');
    }
  };

  const handleDescargarPDFOrden = async (orderId: string) => {
    try {
      const order = await ApiService.get(`/proveedores/ordenes-compra/${orderId}`);
      if (!order) return;

      const pdfData = construirPdfData(order);
      await descargarOrdenCompraPdf(pdfData);
      showToast('PDF de Orden de Compra descargado.', 'success');
    } catch (e: any) {
      showToast('No se pudo generar el documento PDF.', 'error');
    }
  };

  const handleEnviarOrdenWhatsApp = async (order: any) => {
    let telefono = order.supplier?.contacto;
    if (!telefono) {
      telefono = window.prompt(
        `El proveedor "${order.supplier?.razonSocial || order.supplier?.nombre || 'Proveedor'}" no tiene teléfono registrado en Contacto.\n\nIngrese el número de WhatsApp para enviar el pedido (ej: 0991234567):`
      );
      if (!telefono) {
        showToast('No se ingresó número de teléfono. Puede previsualizar o descargar el PDF.', 'info');
        await handlePrevisualizarPDFOrden(order.id);
        return;
      }
    }

    try {
      let orderToUse = order;
      if (!order.lines || order.lines.length === 0 || !order.lines[0]?.producto?.imageUrl) {
        try {
          const fullOrder = await ApiService.get(`/proveedores/ordenes-compra/${order.id}`);
          if (fullOrder && fullOrder.lines) orderToUse = fullOrder;
        } catch (e) {}
      }

      const pdfData = construirPdfData(orderToUse);
      await compartirOrdenCompraPdf(pdfData, telefono);
      showToast('Abriendo WhatsApp con la Orden de Compra y enlace digital oficial...', 'success');
    } catch (e: any) {
      showToast('No se pudo enviar la orden de compra a WhatsApp.', 'error');
    }
  };

  const handleCancelarOrden = (orderId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Orden de Compra',
      message: '¿Está seguro de que desea cancelar esta orden de compra a proveedor? Esta acción no se puede deshacer.',
      confirmText: 'Sí, Cancelar Orden',
      cancelText: 'Volver',
      danger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
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
      },
    });
  };

  const handleCancelarYBloquearReorden = (orderId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar y Marcar "Ya No Se Vende"',
      message:
        '¿Está seguro de CANCELAR esta orden y marcar que los calzados YA NO SE VENDEN?\n\n' +
        '• La orden de compra quedará CANCELADA.\n' +
        '• El sistema NO volverá a generar órdenes automáticas para estos modelos aunque se queden sin stock.\n' +
        '• Siempre podrás volver a realizar un pedido manualmente si lo requieres en el futuro.',
      confirmText: 'Sí, Cancelar y Bloquear',
      cancelText: 'Volver',
      danger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setSaving(true);
        try {
          await ApiService.patch(`/proveedores/ordenes-compra/${orderId}/cancelar-y-desactivar-reorden`, {});
          showToast('Orden cancelada y reorden automática desactivada (Producto marcado como "Ya no se vende").', 'success');
          setShowOrderDetailModal(false);
          loadData();
        } catch (err: any) {
          showToast(err.message || 'Error al cancelar y bloquear reorden.', 'error');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleIrARecepcionDesdeOrden = (order: OrdenCompra) => {
    if (order.tenantId && miLocalId && order.tenantId !== miLocalId && userRole !== 'ROL_SUPER_ADMIN') {
      showToast('Solo la sucursal propietaria de esta orden puede realizar la recepción en bodega.', 'warning');
      return;
    }
    setShowOrderDetailModal(false);
    setActiveTab('ingreso');
    setEntrySupplierId(order.supplierId);
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        if (u?.nombre || u?.name) setEntryRecibidoPor(u.nombre || u.name);
      } catch {}
    }
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
      if (order) {
        if (order.supplierId) {
          setEntrySupplierId(order.supplierId);
        }
        if (order.lines && order.lines.length > 0) {
          const consolidados = consolidarLineasOrden(order.lines, productos);
          const modelosData: typeof entryModelos = [];

          consolidados.forEach((c) => {
            const prodCat = productos.find((p) => p.id === c.productId);
            const foto = c.imageUrl || obtenerFotoProducto(prodCat) || obtenerFotoProducto(c);

            const tallasArr = (c.tallasDesglose || []).map((td: any) => {
              const matchedTalla = (prodCat?.tallas || prodCat?.stockByTalla || []).find(
                (pt: any) => String(pt.numero ?? pt.sizeNumber ?? pt.talla ?? pt.nombre) === String(td.talla)
              );
              const yaRecibido = Number(td.yaRecibido || 0);
              const cantPendiente = Math.max(0, Number(td.cantidad || 0) - yaRecibido);
              return {
                tallaId: td.tallaId || matchedTalla?.id || matchedTalla?.tallaId || String(td.talla),
                sizeNumber: td.talla,
                cantidadIngresada: cantPendiente,
                cantidadEsperada: cantPendiente,
                diferencia: 0,
              };
            });

            modelosData.push({
              productId: c.productId,
              nombre: c.nombre,
              marca: c.marca,
              codigo: c.codigo,
              color: c.color,
              fotoUrl: foto,
              serieNombre: c.serie || 'Serie Estándar',
              precioCosto: c.precioCosto,
              observacionLinea: c.observacionLinea || '',
              tallas: tallasArr,
            });
          });

          setEntryModelos(modelosData);
          if (order.observaciones) {
            setEntryObservaciones(`Ref. Orden OC-${String(order.numero).padStart(4, '0')}: ${order.observaciones}`);
          }
          showToast(`Orden OC-${String(order.numero).padStart(4, '0')} vinculada. Se cargaron ${modelosData.length} modelos con sus tallas.`, 'info');
        } else {
          setEntryModelos([]);
          showToast('La orden seleccionada no contiene líneas de productos.', 'warning');
        }
      }
    } catch (e) {
      console.warn('Error al auto-llenar modelos desde orden:', e);
      showToast('No se pudo cargar la orden de compra.', 'error');
    }
  };

  const handleAddEntryModeloExtra = () => {
    if (!productoSeleccionado) {
      showToast('Seleccione un modelo para agregar a la recepción.', 'error');
      return;
    }
    const foto = obtenerFotoProducto(productoSeleccionado);
    const serieName = (
      productoSeleccionado.serie?.nombre ||
      productoSeleccionado.serieNombre ||
      productoSeleccionado.model?.serie?.nombre ||
      productoSeleccionado.model?.serieNombre ||
      (typeof productoSeleccionado.serie === 'string' ? productoSeleccionado.serie : null) ||
      productoSeleccionado.serie?.name ||
      'ADULTO'
    );
    const prodTallas = productoSeleccionado.serie?.tallas || productoSeleccionado.model?.serie?.tallas || productoSeleccionado.tallas || productoSeleccionado.stockByTalla || [];
    
    let tallasInit: Array<{
      tallaId: string;
      sizeNumber: string | number;
      cantidadIngresada: number;
      cantidadEsperada: number;
      diferencia: number;
    }> = [];

    if (prodTallas.length > 0) {
      const sorted = [...prodTallas].sort((a: any, b: any) => {
        const numA = Number(a.numero ?? a.sizeNumber ?? a.talla ?? a.nombre) || 0;
        const numB = Number(b.numero ?? b.sizeNumber ?? b.talla ?? b.nombre) || 0;
        return numA - numB;
      });
      tallasInit = sorted.map((t: any) => ({
        tallaId: t.id || t.tallaId || String(t.sizeNumber || t.talla || t.numero),
        sizeNumber: t.sizeNumber || t.talla || t.numero || '38',
        cantidadIngresada: 0,
        cantidadEsperada: 0,
        diferencia: 0,
      }));
    } else {
      const curvaDoc = getCurvaDocena(serieName, 'DOCENA');
      const tallasFromCurva = Object.keys(curvaDoc).length > 0 ? Object.keys(curvaDoc).map(Number) : [38, 39, 40, 41, 42];
      tallasInit = tallasFromCurva.map((t) => ({
        tallaId: String(t),
        sizeNumber: t,
        cantidadIngresada: 0,
        cantidadEsperada: 0,
        diferencia: 0,
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
        serieNombre: serieName,
        precioCosto: Number(productoSeleccionado.precioCosto || productoSeleccionado.costPrice || 10),
        observacionLinea: 'Modelo adicional fuera de orden',
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
      const prodCat = productos.find((p) => p.id === m.productId);
      m.tallas.forEach((t) => {
        if (t.diferencia < 0) hayFaltantes = true;

        let resolvedTallaId = t.tallaId;
        if (!resolvedTallaId || resolvedTallaId === String(t.sizeNumber)) {
          const matchedTalla = (prodCat?.tallas || prodCat?.stockByTalla || []).find(
            (pt: any) => String(pt.numero ?? pt.sizeNumber ?? pt.talla ?? pt.nombre) === String(t.sizeNumber)
          );
          if (matchedTalla) {
            resolvedTallaId = matchedTalla.id || matchedTalla.tallaId || resolvedTallaId;
          }
        }

        if ((t.cantidadIngresada || 0) > 0 || (t.cantidadEsperada || 0) > 0) {
          flatLines.push({
            productId: m.productId,
            tallaId: resolvedTallaId || String(t.sizeNumber) || 'TALLA_STANDAR',
            cantidadIngresada: Math.max(0, t.cantidadIngresada || 0),
            cantidadEsperada: t.cantidadEsperada ?? 0,
            diferencia: t.diferencia ?? 0,
            precioCosto: m.precioCosto,
            observacionLinea: m.observacionLinea || undefined,
          });
        }
      });
    });

    const estadoCalculado = hayFaltantes ? 'RECIBIDA_PARCIAL' : 'COMPLETA';

    const entregadoTag = entryEntregadoPor.trim() ? `[ENTREGADO POR: ${entryEntregadoPor.trim()}] ` : '';
    const recibidoTag = entryRecibidoPor.trim() ? `[RECIBIDO POR: ${entryRecibidoPor.trim()}] ` : '';
    const obsTotal = `${entregadoTag}${recibidoTag}${entryObservaciones || ''}`.trim() || undefined;

    setSaving(true);
    try {
      await ApiService.post('/proveedores/entradas', {
        supplierId: entrySupplierId,
        supplierOrderId: entryOrderId || undefined,
        observaciones: obsTotal,
        estado: estadoCalculado,
        lines: flatLines,
      });

      showToast(
        hayFaltantes
          ? 'Mercancía ingresada con faltantes. La orden queda en Órdenes Parciales hasta completarse todo el pedido.'
          : 'Recepción completada exitosamente. Stock físico y saldo por pagar actualizados al instante.',
        'success'
      );
      const uLogged = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      setEntrySupplierId('');
      setEntryOrderId('');
      setEntryEntregadoPor('');
      setEntryRecibidoPor(uLogged?.nombre || uLogged?.name || 'Bodega / Recepción');
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
    setMontoPago(sugeridoMonto && sugeridoMonto > 0 ? String(sugeridoMonto) : '');
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
        banco: metodoPago !== 'EFECTIVO' ? (bancoPago || undefined) : undefined,
        comprobante: metodoPago !== 'EFECTIVO' ? (comprobantePago || undefined) : undefined,
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

    abrirWhatsAppUniversal(numLimpio, mensaje);
  };

  const handleAbrirDevolucionProveedor = (item?: any) => {
    if (item) {
      setDevClienteDevolucionId(item.id || '');
      setDevMotivo(item.motivo || 'Devolución de calzado defectuoso / garantía');
      
      const firstLineWithSupplier = item.lines?.find((l: any) => l.supplierId);
      const targetSuppId = firstLineWithSupplier?.supplierId || (proveedores.length > 0 ? proveedores[0].id : '');
      setDevSupplierId(targetSuppId);

      const provTarget = proveedores.find((p) => p.id === targetSuppId);
      const uLogged = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      setDevRecibidoPor(provTarget?.contacto || provTarget?.razonSocial || '');
      setDevEntregadoPor(uLogged?.nombre || uLogged?.name || 'Bodega / Despacho');

      setDevLines(
        (item.lines || []).map((l: any) => ({
          productId: l.productId,
          tallaId: l.tallaId,
          cantidad: l.cantidad,
          precioCosto: Number(l.costPrice || l.precioCosto || l.precioUnitario || 10),
          modelName: l.modelName || 'Calzado',
          color: l.color || '',
          brand: l.brand || '',
          imageUrl: l.imageUrl || '',
          numeroTalla: l.numeroTalla || 38,
        }))
      );
    } else {
      setDevClienteDevolucionId('');
      setDevMotivo('');
      const firstSupp = proveedores[0];
      const uLogged = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      setDevSupplierId(firstSupp?.id || '');
      setDevRecibidoPor(firstSupp?.contacto || firstSupp?.razonSocial || '');
      setDevEntregadoPor(uLogged?.nombre || uLogged?.name || 'Bodega / Despacho');
      setDevLines([]);
    }
    setShowDevolucionModal(true);
  };

  const handleGuardarDevolucionProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devSupplierId) {
      showToast('Seleccione el proveedor al que devolverá la mercadería.', 'error');
      return;
    }
    if (devLines.length === 0) {
      showToast('Agregue al menos un modelo a la devolución.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res: any = await ApiService.post('/devoluciones/proveedor', {
        supplierId: devSupplierId,
        motivo: devMotivo || 'Devolución de calzado por falla / garantía de fábrica',
        entregadoPor: devEntregadoPor || undefined,
        recibidoPor: devRecibidoPor || undefined,
        clienteDevolucionId: devClienteDevolucionId || undefined,
        lines: devLines.map((l) => ({
          productId: l.productId,
          tallaId: l.tallaId,
          cantidad: l.cantidad,
          precioCosto: l.precioCosto,
        })),
      });

      showToast(`Devolución registrada con éxito (#${res.resumenFinanciero?.numeroCodigo || 'DEV'}). Se descontó $${Number(res.deudaDescontada || 0).toFixed(2)} de la deuda con el proveedor.`, 'success');
      setShowDevolucionModal(false);
      await loadData();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('proveedores_data_updated'));
        window.dispatchEvent(new CustomEvent('dashboard_refresh'));
      }
    } catch (err: any) {
      showToast(err.message || 'Error al registrar la devolución al proveedor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAbrirManualDefectuoso = () => {
    setManualProd(null);
    setBusquedaManualProd('');
    setManualMotivo('');
    setManualTallaId('');
    setManualCantidad(1);
    setManualPrecioCosto(0);
    setShowManualDefectuosoModal(true);
  };

  const handleGuardarManualDefectuoso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProd) {
      showToast('Seleccione un producto del catálogo.', 'error');
      return;
    }
    if (!manualTallaId) {
      showToast('Seleccione la talla del calzado defectuoso.', 'error');
      return;
    }
    if (manualCantidad <= 0) {
      showToast('La cantidad debe ser mayor a 0.', 'error');
      return;
    }

    setSaving(true);
    try {
      await ApiService.post('/devoluciones/mercaderia-por-devolver/manual', {
        motivo: manualMotivo || 'Calzado defectuoso registrado en bodega para devolución',
        lines: [
          {
            productId: manualProd.id,
            tallaId: manualTallaId,
            cantidad: manualCantidad,
            precioUnitario: manualPrecioCosto || Number(manualProd.costPrice || manualProd.precioCosto || 10),
          },
        ],
      });

      showToast('Calzado defectuoso agregado a la bandeja de mercadería por devolver.', 'success');
      setShowManualDefectuosoModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar la mercadería defectuosa.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarDevolucionWhatsApp = (dev: any) => {
    const telefono = dev.supplier?.contacto || '';
    let numLimpio = telefono.replace(/\D/g, "");
    if (numLimpio.startsWith("09") && numLimpio.length === 10) {
      numLimpio = "593" + numLimpio.substring(1);
    } else if (numLimpio.startsWith("0") && numLimpio.length === 10) {
      numLimpio = "593" + numLimpio.substring(1);
    }

    const prov = proveedores.find((pr) => pr.id === dev.supplierId);
    const saldo = prov?.saldoPendiente ?? 0;

    let itemsDetalle = (dev.lines || [])
      .map((l: any) => `• *${l.modelName || 'Calzado'}* (${l.color || 'Estándar'}) Talla *${l.numeroTalla || '38'}*: ${l.cantidad} par(es) × $${Number(l.precioCosto || 0).toFixed(2)} = $${Number(l.subtotal || 0).toFixed(2)}`)
      .join('\n');

    const mensaje = `*CONSTANCIA DE DEVOLUCIÓN DE CALZADO (GARANTÍA / FALLA)*\n\nEstimado/a *${dev.supplier?.razonSocial || 'Proveedor'}*,\n\nLe notificamos formalmente la devolución de mercadería por defecto / garantía:\n\n📄 *Comprobante N°:* ${dev.numeroCodigo || 'DEV-0001'}\n📅 *Fecha:* ${new Date(dev.createdAt).toLocaleDateString('es-EC')}\n📝 *Motivo:* ${dev.motivo || 'Falla de fábrica / defecto de fabricación'}\n\n👟 *DETALLE DE MERCADERÍA DEVUELTA:*\n${itemsDetalle}\n\n📦 *Total Pares Devueltos:* ${dev.totalPares || (dev.lines || []).reduce((acc: number, l: any) => acc + l.cantidad, 0)} pares\n💵 *Monto Total Devuelto:* $${Number(dev.totalDevuelto || 0).toFixed(2)}\n📉 *Descontado de Deuda / Saldo:* -$${Number(dev.deudaDescontada || dev.totalDevuelto || 0).toFixed(2)}\n💼 *Nuevo Saldo Pendiente:* $${saldo.toFixed(2)}\n\n_Constancia comercial emitida por sistema NEXORA._`;

    abrirWhatsAppUniversal(numLimpio, mensaje);
  };

  const proveedoresFiltrados = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(q) ||
        p.razonSocial?.toLowerCase().includes(q) ||
        p.ruc?.includes(q) ||
        p.contacto?.toLowerCase().includes(q)
    );
  }, [proveedores, searchQuery]);

  const miLocalId = useMemo(() => {
    if (activeSucursalId && activeSucursalId !== 'TODAS') return activeSucursalId;
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u.tenantId || '';
      } catch {
        return '';
      }
    }
    return '';
  }, [activeSucursalId]);

  const ordenesDeSucursal = useMemo(() => {
    if (!activeSucursalId || activeSucursalId === 'TODAS') {
      if (miLocalId && userRole !== 'ROL_SUPER_ADMIN') {
        const suc = sucursales?.find((s) => s.id === miLocalId);
        if (suc?.isMatriz) return ordenes;
        return ordenes.filter((o: any) => o.tenantId === miLocalId || o.sucursalId === miLocalId || !o.tenantId);
      }
      return ordenes;
    }
    return ordenes.filter((o: any) => {
      const targetSuc = sucursales?.find((s) => s.id === activeSucursalId);
      if (targetSuc?.isMatriz) {
        return true;
      }
      return o.tenantId === activeSucursalId || o.sucursalId === activeSucursalId || !o.tenantId;
    });
  }, [ordenes, activeSucursalId, miLocalId, userRole, sucursales]);

  // Pestañas de Órdenes
  const ordenesFiltradas = useMemo(() => {
    return ordenesDeSucursal.filter((o) => {
      let matchEstado = true;
      if (filtroEstadoOrden === 'BORRADOR') matchEstado = o.estado === 'BORRADOR';
      else if (filtroEstadoOrden === 'PENDIENTE') matchEstado = o.estado === 'PENDIENTE';
      else if (filtroEstadoOrden === 'ENVIADAS_HISTORIAL') {
        matchEstado = o.estado === 'PENDIENTE' || o.estado === 'RECIBIDA_PARCIAL' || o.estado === 'RECIBIDA';
      }
      else if (filtroEstadoOrden === 'RECIBIDA_PARCIAL') matchEstado = o.estado === 'RECIBIDA_PARCIAL';
      else if (filtroEstadoOrden === 'RECIBIDA') matchEstado = o.estado === 'RECIBIDA';
      else if (filtroEstadoOrden === 'CANCELADA') matchEstado = o.estado === 'CANCELADA';

      const matchSearch =
        !searchQuery ||
        `OC-${String(o.numero).padStart(4, '0')}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.supplier?.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.supplier?.razonSocial?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.observaciones?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchEstado && matchSearch;
    });
  }, [ordenesDeSucursal, filtroEstadoOrden, searchQuery]);

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
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setShowSupplierModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-xs font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap"
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
                setSerieFiltroOrden('TODAS');
                setShowOrderModal(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm border border-slate-700 whitespace-nowrap"
            >
              <Plus size={14} className="text-amber-400" />
              <span>Emitir Orden de Compra</span>
            </button>
            <button
              onClick={handleAbrirConsolidarDemanda}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm border border-emerald-500/30 whitespace-nowrap cursor-pointer"
              title="Consolidar pedidos de clientes en espera de stock y generar Orden de Compra"
            >
              <Package size={14} className="text-white" />
              <span>Consolidar Demanda de Clientes</span>
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

      {/* ══════ TABS PRINCIPALES & BUSCADOR ══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-2">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {([
            ['proveedores', 'Proveedores & Deudas', Truck, 0],
            ['ordenes', 'Órdenes de Compra', FileText, 0],
            ['ingreso', 'Recepción de Mercancía', PackageCheck, 0],
            ['pagos', 'Historial de Pagos', DollarSign, 0],
            ['devoluciones', 'Devoluciones & Garantías', RotateCcw, pendientesDevolucion.length],
          ] as const).map(([id, label, Icon, badge]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all relative whitespace-nowrap ${
                activeTab === id
                  ? 'bg-[#0F172A] text-white dark:bg-amber-400 dark:text-slate-900 shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
              {badge > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-rose-500 text-white animate-pulse">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
          <input
            type="text"
            placeholder={activeTab === 'ordenes' ? 'Buscar N° orden, modelo...' : 'Buscar proveedor, RUC...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all shadow-2xs"
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
              const totalCompras = p.totalCompras || 0;
              const totalPagado = p.totalPagado || 0;
              const saldoAFavor = p.saldoAFavor !== undefined ? p.saldoAFavor : Math.max(0, totalPagado - totalCompras);
              const tieneSaldoAFavor = saldoAFavor > 0.01;
              const cruzado = p.cruzadoConMercaderia !== undefined ? p.cruzadoConMercaderia : Math.min(totalCompras, totalPagado);

              return (
                <div
                  key={p.id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all relative flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-sm text-[var(--foreground)] line-clamp-1">{p.razonSocial || p.nombre}</h4>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Building2 size={10} /> {p.sucursalNombre || 'Matriz'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[var(--muted)] text-[10px] text-[var(--muted-foreground)] font-bold font-mono tracking-wider">
                          {p.ruc}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono border ${
                        tieneDeuda
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : tieneSaldoAFavor
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}>
                        {tieneDeuda
                          ? `Debe $${deuda.toFixed(2)}`
                          : tieneSaldoAFavor
                            ? `Adelanto a Favor: $${saldoAFavor.toFixed(2)}`
                            : 'Al Día $0.00'}
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

                    {/* Desglose Financiero: Facturado, Abonado/Adelantado, Cruce y Adelanto Disponible */}
                    <div className="grid grid-cols-2 gap-2 bg-[var(--muted)]/40 p-2.5 rounded-xl text-xs border border-[var(--border)]">
                      <div>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Total Facturado</span>
                        <span className="font-bold text-[var(--foreground)] font-mono">${totalCompras.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Total Abonado / Adelanto</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">${totalPagado.toFixed(2)}</span>
                      </div>
                      {cruzado > 0 && (
                        <div className="col-span-2 pt-1.5 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                          <span className="text-[10px] text-[var(--muted-foreground)]">Cruzado con Mercancía:</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">${cruzado.toFixed(2)}</span>
                        </div>
                      )}
                      {tieneSaldoAFavor && (
                        <div className="col-span-2 pt-1 border-t border-blue-500/20 flex items-center justify-between text-[11px] bg-blue-500/5 -mx-2.5 -mb-2.5 p-2 rounded-b-xl">
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">Adelanto Disponible:</span>
                          <span className="font-black text-blue-700 dark:text-blue-300 font-mono">${saldoAFavor.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border)] flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditSupplier(p)}
                      className="py-2 px-3 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Editar datos del proveedor"
                    >
                      <Edit3 size={13} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleAbrirCuentaCorriente(p.id)}
                      className="flex-1 py-2 px-3 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <History size={13} />
                      <span>Estado de Cuenta</span>
                    </button>
                    <button
                      onClick={() => handleAbrirModalPago(p.id, undefined, deuda > 0 ? deuda : undefined)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm cursor-pointer ${
                        tieneDeuda
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      }`}
                      title={tieneDeuda ? 'Registrar Abono o Pago' : 'Registrar Adelanto / Anticipo'}
                    >
                      <DollarSign size={13} />
                      <span>{tieneDeuda ? 'Abonar' : 'Adelanto'}</span>
                    </button>
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
          {/* Banner explicativo: Pendientes por Pedir vs Enviadas (Despacho diario a las 08:00 AM) */}
          <div className="p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0 mt-0.5">🚚</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[var(--foreground)]">
                    Despacho Automático Diario a Proveedores (08:00 AM)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                    Programado 1 vez al día
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
                  Las órdenes generadas por ventas sin stock se acumulan en <strong className="text-[var(--foreground)]">"⏳ Pendientes por Pedir"</strong>. Cada mañana a las <strong className="text-blue-600 dark:text-blue-400">08:00 AM</strong> se envían automáticamente al fabricante. Puedes revisarlas, reasignar proveedor, cancelarlas, presionar <strong className="text-emerald-600">"Enviar"</strong> individualmente o despachar todo en lote.
                </p>
              </div>
            </div>
            {ordenes.some((o) => o.estado === 'BORRADOR') && (
              <button
                onClick={handleEjecutarAutoDespachoManual}
                disabled={saving}
                className="shrink-0 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Despachar todas las órdenes pendientes por pedir ahora mismo sin esperar a las 08:00 AM"
              >
                <Send size={13} />
                <span>Despachar Todo Ahora</span>
              </button>
            )}
            <button
              onClick={handleAbrirConsolidarDemanda}
              className="shrink-0 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Consolidar pedidos de clientes en espera de stock y generar Orden de Compra"
            >
              <Package size={13} />
              <span>Consolidar Demanda</span>
            </button>
          </div>

          {/* Barra de Filtros: Separación clara de Pendientes por Pedir y Enviadas */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { key: 'BORRADOR', label: '⏳ Pendientes por Pedir', count: ordenesDeSucursal.filter((o) => o.estado === 'BORRADOR').length },
              { key: 'PENDIENTE', label: '📤 En Tránsito (Esperando Entrega)', count: ordenesDeSucursal.filter((o) => o.estado === 'PENDIENTE').length },
              { key: 'ENVIADAS_HISTORIAL', label: '🚚 Historial de Enviadas', count: ordenesDeSucursal.filter((o) => o.estado === 'PENDIENTE' || o.estado === 'RECIBIDA_PARCIAL' || o.estado === 'RECIBIDA').length },
              { key: 'RECIBIDA_PARCIAL', label: '📦 Parciales (Con Faltantes)', count: ordenesDeSucursal.filter((o) => o.estado === 'RECIBIDA_PARCIAL').length },
              { key: 'RECIBIDA', label: '✅ Recibidas en Bodega', count: ordenesDeSucursal.filter((o) => o.estado === 'RECIBIDA').length },
              { key: 'CANCELADA', label: '🚫 Canceladas', count: ordenesDeSucursal.filter((o) => o.estado === 'CANCELADA').length },
              { key: 'TODOS', label: '📋 Todas las Órdenes', count: ordenesDeSucursal.length },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setFiltroEstadoOrden(st.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs border ${
                  filtroEstadoOrden === st.key
                    ? 'bg-[#0F172A] text-white dark:bg-amber-400 dark:text-slate-900 border-transparent shadow-sm'
                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                <span>{st.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  filtroEstadoOrden === st.key
                    ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>

          {ordenesFiltradas.length === 0 ? (
            <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              {filtroEstadoOrden === 'BORRADOR'
                ? 'No hay órdenes pendientes por pedir acumuladas para hoy.'
                : filtroEstadoOrden === 'PENDIENTE'
                ? 'No hay órdenes enviadas en tránsito hacia los proveedores.'
                : filtroEstadoOrden === 'ENVIADAS_HISTORIAL'
                ? 'No hay historial de órdenes enviadas a proveedores.'
                : `No hay órdenes de compra en esta pestaña (${filtroEstadoOrden}).`}
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs text-left min-w-[780px]">
                  <thead className="bg-[var(--muted)]/50 border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-5 py-3.5">N° Orden</th>
                      <th className="px-4 py-3.5">Proveedor</th>
                      <th className="px-4 py-3.5 text-center">Sucursal</th>
                      <th className="px-4 py-3.5">Modelo / Curva</th>
                      <th className="px-4 py-3.5 text-center">Estado</th>
                      <th className="px-4 py-3.5 text-right">Monto Total</th>
                      <th className="px-4 py-3.5 text-right">Fecha / Recepción</th>
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
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              <Building size={10} /> {o.supplier?.sucursalNombre || (o as any).sucursalNombre || 'Matriz'}
                            </span>
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
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold ${
                                o.estado === 'BORRADOR'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                  : o.estado === 'PENDIENTE'
                                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                  : o.estado === 'RECIBIDA_PARCIAL'
                                  ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                                  : o.estado === 'RECIBIDA'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              }`}>
                                {o.estado === 'BORRADOR' && <Clock size={10} />}
                                {o.estado === 'PENDIENTE' && <Send size={10} />}
                                {o.estado === 'RECIBIDA' && <CheckCircle size={10} />}
                                {o.estado === 'BORRADOR' ? 'Pendiente por Pedir' : o.estado === 'PENDIENTE' ? 'Enviada al Proveedor' : o.estado === 'RECIBIDA_PARCIAL' ? 'Recibida Parcial' : o.estado === 'RECIBIDA' ? 'Recibida en Bodega' : o.estado === 'CANCELADA' ? 'Cancelada' : o.estado}
                              </span>
                              {o.observaciones?.includes('[AJUSTE_MANUAL]') && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 text-[9px] font-bold" title="Orden fijada manualmente según presupuesto del local">
                                  <span>🔒 Ajuste Manual</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-[#0F172A] dark:text-amber-400 font-mono text-sm">
                            ${Number(o.total).toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-[11px] text-[var(--muted-foreground)]">
                            {o.estado === 'RECIBIDA' || o.estado === 'RECIBIDA_PARCIAL' ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1" title="Fecha de Ingreso de Mercancía a Bodega">
                                  <span>📥</span>
                                  {new Date((o as any).entry?.fechaIngreso || (o as any).entry?.createdAt || o.updatedAt || o.createdAt).toLocaleDateString('es-EC')}
                                </span>
                                <span className="text-[10px] text-[var(--muted-foreground)]" title="Fecha en que se realizó el pedido">
                                  Pedido: {new Date(o.createdAt).toLocaleDateString('es-EC')}
                                </span>
                              </div>
                            ) : o.estado === 'PENDIENTE' ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1" title="Fecha de Envío al Proveedor">
                                  <span>📤</span>
                                  {new Date(o.updatedAt || o.createdAt).toLocaleDateString('es-EC')}
                                </span>
                                <span className="text-[10px] text-[var(--muted-foreground)]" title="Fecha en que se realizó el pedido">
                                  Pedido: {new Date(o.createdAt).toLocaleDateString('es-EC')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="font-semibold text-[var(--foreground)]">
                                  {new Date(o.createdAt).toLocaleDateString('es-EC')}
                                </span>
                                <span className="text-[10px] text-[var(--muted-foreground)]">
                                  {o.estado === 'BORRADOR' ? 'Borrador' : ''}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleVerDetalleOrden(o.id)}
                                className="p-1.5 bg-[var(--muted)] hover:bg-[#0F172A] hover:text-white rounded-lg transition-colors text-[var(--foreground)] cursor-pointer"
                                title="Ver Detalle / Modificar / Enviar"
                              >
                                <Eye size={13} />
                              </button>
                              {o.estado === 'BORRADOR' && (
                                <button
                                  onClick={() => handleEnviarYGenerarPDF(o.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Enviar Orden al Proveedor"
                                >
                                  <Send size={11} />
                                  <span>Enviar</span>
                                </button>
                              )}
                              {(o.estado === 'PENDIENTE' || o.estado === 'RECIBIDA_PARCIAL') && (
                                o.tenantId && miLocalId && o.tenantId !== miLocalId && userRole !== 'ROL_SUPER_ADMIN' ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-not-allowed opacity-75"
                                    title="Solo la sucursal propietaria de esta orden puede realizar la recepción de mercadería"
                                  >
                                    <Lock size={11} /> Otra sucursal
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleIrARecepcionDesdeOrden(o)}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-lg transition-all text-xs font-bold shadow-2xs cursor-pointer"
                                    title="Recibir Mercancía en Bodega"
                                  >
                                    <PackageCheck size={13} />
                                    <span>Recibir</span>
                                  </button>
                                )
                              )}
                              {o.estado === 'RECIBIDA' && (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg text-xs font-bold opacity-80 cursor-default"
                                  title="Mercancía 100% recibida e ingresada en bodega"
                                >
                                  <CheckCircle size={11} className="text-emerald-500" />
                                  <span>Recibido</span>
                                </span>
                              )}
                              <button
                                onClick={() => handleDescargarPDFOrden(o.id)}
                                className="p-1.5 bg-[var(--muted)] hover:bg-emerald-600 hover:text-white rounded-lg transition-colors text-[var(--foreground)] cursor-pointer"
                                title="Descargar PDF"
                              >
                                <Download size={13} />
                              </button>
                              {(o.estado === 'PENDIENTE' || o.estado === 'BORRADOR') && (
                                <button
                                  onClick={() => handleCancelarYBloquearReorden(o.id)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 rounded-lg transition-colors border border-rose-500/20 cursor-pointer"
                                  title="🚫 Cancelar y No Volver a Generar Automáticamente (Producto ya no se vende)"
                                >
                                  <Ban size={13} />
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
                    value={entryOrderId}
                    onChange={(e) => handleSelectOrderForEntry(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="">Ingreso Manual Directo (Sin orden)</option>
                    {ordenes
                      .filter((o) => (entrySupplierId ? o.supplierId === entrySupplierId : true) && (o.estado === 'PENDIENTE' || o.estado === 'BORRADOR' || o.estado === 'RECIBIDA_PARCIAL'))
                      .map((o) => {
                        const prov = proveedores.find((p) => p.id === o.supplierId);
                        const provLabel = prov ? ` • ${prov.razonSocial || prov.nombre}` : '';
                        return (
                          <option key={o.id} value={o.id}>
                            OC-{String(o.numero).padStart(4, '0')}{provLabel} (${Number(o.total).toFixed(2)}) [{o.estado === 'PENDIENTE' ? 'ENVIADA' : o.estado}]
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>

              {/* Trazabilidad: Quién entrega y Quién recibe en bodega */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Truck size={12} className="text-amber-500" />
                    <span>Entregado por (Proveedor / Transportista)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Chofer distribuidor / Nombre del proveedor"
                    value={entryEntregadoPor}
                    onChange={(e) => setEntryEntregadoPor(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <UserCheck size={12} className="text-blue-500" />
                    <span>Recibido por (Bodega / Responsable)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Bodega Central / Chris Paucar"
                    value={entryRecibidoPor}
                    onChange={(e) => setEntryRecibidoPor(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  />
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
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        + Agregar a Recepción
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductoSeleccionado(null)}
                        className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
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

              {/* Barra Resumen y Acciones Globales de Recepción */}
              {entryModelos.length > 0 && (() => {
                const totalParesIngresados = entryModelos.reduce(
                  (sum, m) => sum + m.tallas.reduce((s, t) => s + (t.cantidadIngresada || 0), 0),
                  0
                );
                const totalParesEsperados = entryModelos.reduce(
                  (sum, m) => sum + m.tallas.reduce((s, t) => s + (t.cantidadEsperada || 0), 0),
                  0
                );
                const difGlobal = totalParesIngresados - totalParesEsperados;

                return (
                  <div className="p-3.5 bg-[var(--muted)]/30 rounded-2xl border border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-bold text-[var(--foreground)]">
                        Conteo Global: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{totalParesIngresados}</strong> pares ingresados
                        {totalParesEsperados > 0 && (
                          <span className="text-[var(--muted-foreground)] font-normal ml-1">
                            (de <strong className="font-mono">{totalParesEsperados}</strong> pedidos)
                          </span>
                        )}
                      </span>

                      {totalParesEsperados > 0 && (
                        <div>
                          {difGlobal === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              ✓ Pedido Completo (100%)
                            </span>
                          ) : difGlobal < 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                              ⚠️ Faltante: {Math.abs(difGlobal)} pares
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                              ℹ️ Excedente: +{difGlobal} pares extras
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {totalParesEsperados > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = entryModelos.map((m) => ({
                              ...m,
                              tallas: m.tallas.map((t) => ({
                                ...t,
                                cantidadIngresada: t.cantidadEsperada,
                                diferencia: 0,
                              })),
                            }));
                            setEntryModelos(updated);
                            showToast('Todas las cantidades ajustadas al 100% de lo pedido.', 'success');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle size={13} />
                          <span>Marcar Todo Completo</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const updated = entryModelos.map((m) => ({
                            ...m,
                            tallas: m.tallas.map((t) => ({
                              ...t,
                              cantidadIngresada: 0,
                              diferencia: 0 - t.cantidadEsperada,
                            })),
                          }));
                          setEntryModelos(updated);
                          showToast('Contadores reiniciados a 0 para conteo físico.', 'info');
                        }}
                        className="px-2.5 py-1.5 bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)] rounded-xl text-xs font-bold transition-all cursor-pointer"
                        title="Poner todos los pares recibidos en 0 para contar uno por uno"
                      >
                        <span>↺ Poner en 0</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Lista de Modelos en Recepción con Componente Estandarizado */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
                  Modelos a Recepcionar ({entryModelos.length})
                </span>

                {entryModelos.length === 0 ? (
                  <p className="text-center text-[var(--muted-foreground)] py-6 bg-[var(--muted)]/20 rounded-xl text-xs">
                    Seleccione una orden de compra o busque modelos para ingresar a bodega.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {entryModelos.map((m, mIdx) => {
                      const totalParesModelo = m.tallas.reduce((acc, t) => acc + (t.cantidadIngresada || 0), 0);
                      const totalParesEsperadosModelo = m.tallas.reduce((acc, t) => acc + (t.cantidadEsperada || 0), 0);
                      const totalPrecioModelo = totalParesModelo * m.precioCosto;

                      return (
                        <div
                          key={mIdx}
                          className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xs space-y-3 transition-all hover:border-[var(--border)]/80"
                        >
                          {/* Cabecera del Producto / Modelo */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                            <div>
                              <h4 className="font-extrabold text-sm text-[var(--foreground)] uppercase tracking-wide">
                                {m.nombre}
                              </h4>
                              <p className="text-[11px] text-[var(--muted-foreground)]">
                                <span className="font-semibold">{m.marca}</span>
                                {m.color && <span> • {m.color}</span>}
                                {m.serieNombre && (
                                  <span> · <span className="text-emerald-600 dark:text-emerald-400 font-bold">Serie: {formatearNombreSerie(m.serieNombre)}</span></span>
                                )}
                                {m.codigo && <span className="ml-1 opacity-70">({m.codigo})</span>}
                              </p>
                            </div>

                            {totalParesEsperadosModelo > 0 && (
                              <div className="flex items-center gap-2">
                                {totalParesModelo === totalParesEsperadosModelo ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    ✓ Completo ({totalParesModelo} pares)
                                  </span>
                                ) : totalParesModelo < totalParesEsperadosModelo ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    Faltan {totalParesEsperadosModelo - totalParesModelo} pares
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                    +{totalParesModelo - totalParesEsperadosModelo} pares extra
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Fila Principal: Foto | Pastillas de Tallas y Botones | Resumen y Eliminar */}
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            {/* Izquierda: Foto + Pastillas Interactivas */}
                            <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                              <div className="w-14 h-14 rounded-2xl bg-[var(--muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                                {m.fotoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={m.fotoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={20} className="text-[var(--muted-foreground)]" />
                                )}
                              </div>

                              <div className="space-y-2 flex-1 min-w-0">
                                {/* Pastillas de Tallas con Botones - y + */}
                                <div className="flex flex-wrap items-center gap-2">
                                  {m.tallas.map((t, tIdx) => {
                                    const dif = (t.cantidadIngresada || 0) - (t.cantidadEsperada || 0);

                                    return (
                                      <div
                                        key={tIdx}
                                        className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs ${
                                          dif > 0
                                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                                            : dif < 0
                                            ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300'
                                            : t.cantidadIngresada > 0
                                            ? 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]'
                                            : 'bg-[var(--muted)]/20 border-[var(--border)]/70 text-[var(--muted-foreground)]'
                                        }`}
                                      >
                                        <span className="font-extrabold text-xs font-mono mr-0.5">
                                          T{t.sizeNumber}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateTallaQty(mIdx, tIdx, Math.max(0, (t.cantidadIngresada || 0) - 1))}
                                          className="w-5 h-5 flex items-center justify-center bg-rose-500/15 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 rounded-md text-xs font-black transition-colors cursor-pointer"
                                          title={`Restar 1 par T${t.sizeNumber}`}
                                        >
                                          −
                                        </button>
                                        <input
                                          type="number"
                                          min="0"
                                          value={t.cantidadIngresada}
                                          onChange={(e) => handleUpdateTallaQty(mIdx, tIdx, Math.max(0, parseInt(e.target.value) || 0))}
                                          className="w-7 text-center text-xs font-black font-mono bg-transparent border-none focus:outline-none p-0"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateTallaQty(mIdx, tIdx, (t.cantidadIngresada || 0) + 1)}
                                          className="w-5 h-5 flex items-center justify-center bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md text-xs font-black transition-colors cursor-pointer"
                                          title={`Sumar 1 par T${t.sizeNumber}`}
                                        >
                                          +
                                        </button>

                                        {t.cantidadEsperada > 0 && (
                                          <span className="text-[10px] text-[var(--muted-foreground)] font-mono ml-0.5" title={`Pedido en orden: ${t.cantidadEsperada} pares`}>
                                            /{t.cantidadEsperada}
                                          </span>
                                        )}

                                        {dif > 0 && (
                                          <span className="text-[9px] font-black bg-blue-500 text-white px-1 py-0.2 rounded font-mono ml-0.5" title={`+${dif} pares extras entregados`}>
                                            +{dif}
                                          </span>
                                        )}
                                        {dif < 0 && (
                                          <span className="text-[9px] font-black bg-rose-500 text-white px-1 py-0.2 rounded font-mono ml-0.5" title={`${dif} pares faltantes`}>
                                            {dif}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Acciones Rápidas Masivas */}
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curva = getCurvaDocena(m.serieNombre || '', 'MEDIA_A');
                                      const hasCurva = Object.keys(curva).length > 0;
                                      const updated = [...entryModelos];
                                      updated[mIdx].tallas.forEach((t) => {
                                        const qty = hasCurva ? (curva[Number(t.sizeNumber)] || 0) : 0;
                                        t.cantidadIngresada = (t.cantidadIngresada || 0) + qty;
                                        t.diferencia = t.cantidadIngresada - t.cantidadEsperada;
                                      });
                                      setEntryModelos(updated);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                                  >
                                    + ½ Doc A
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curva = getCurvaDocena(m.serieNombre || '', 'MEDIA_B');
                                      const hasCurva = Object.keys(curva).length > 0;
                                      const updated = [...entryModelos];
                                      updated[mIdx].tallas.forEach((t) => {
                                        const qty = hasCurva ? (curva[Number(t.sizeNumber)] || 0) : 0;
                                        t.cantidadIngresada = (t.cantidadIngresada || 0) + qty;
                                        t.diferencia = t.cantidadIngresada - t.cantidadEsperada;
                                      });
                                      setEntryModelos(updated);
                                    }}
                                    className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/25 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                                  >
                                    + ½ Doc B
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curva = getCurvaDocena(m.serieNombre || '', 'MEDIA_A');
                                      const hasCurva = Object.keys(curva).length > 0;
                                      const updated = [...entryModelos];
                                      updated[mIdx].tallas.forEach((t) => {
                                        const qty = hasCurva ? (curva[Number(t.sizeNumber)] || 0) : 0;
                                        t.cantidadIngresada = Math.max(0, (t.cantidadIngresada || 0) - qty);
                                        t.diferencia = t.cantidadIngresada - t.cantidadEsperada;
                                      });
                                      setEntryModelos(updated);
                                    }}
                                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                                  >
                                    − ½ Doc A
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curva = getCurvaDocena(m.serieNombre || '', 'MEDIA_B');
                                      const hasCurva = Object.keys(curva).length > 0;
                                      const updated = [...entryModelos];
                                      updated[mIdx].tallas.forEach((t) => {
                                        const qty = hasCurva ? (curva[Number(t.sizeNumber)] || 0) : 0;
                                        t.cantidadIngresada = Math.max(0, (t.cantidadIngresada || 0) - qty);
                                        t.diferencia = t.cantidadIngresada - t.cantidadEsperada;
                                      });
                                      setEntryModelos(updated);
                                    }}
                                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/25 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                                  >
                                    − ½ Doc B
                                  </button>
                                  {m.tallas.some((t) => t.cantidadEsperada > 0) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...entryModelos];
                                        updated[mIdx].tallas.forEach((t) => {
                                          t.cantidadIngresada = t.cantidadEsperada;
                                          t.diferencia = 0;
                                        });
                                        setEntryModelos(updated);
                                      }}
                                      className="px-2.5 py-1 bg-slate-500/10 hover:bg-slate-500/20 text-[var(--foreground)] border border-[var(--border)] rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                                      title="Ajustar cantidades exactamente a lo pedido en la orden para este modelo"
                                    >
                                      ✓ Recibir Pedido Exacto
                                    </button>
                                  )}
                                  <span className="text-[11px] text-[var(--muted-foreground)] font-mono ml-1">
                                    = {totalParesModelo} {totalParesModelo === 1 ? 'par' : 'pares'} total
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Derecha: Resumen de Pares, Costo y Subtotal + Botón Eliminar */}
                            <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                              <div className="text-right">
                                <span className="font-extrabold text-xs text-[var(--foreground)] block">
                                  {totalParesModelo} {totalParesModelo === 1 ? 'par' : 'pares'} ({getDocenaLabel(totalParesModelo)})
                                </span>
                                <span className="text-[11px] text-[var(--muted-foreground)] block font-mono">
                                  ${m.precioCosto.toFixed(2)} / par
                                </span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-base block">
                                  ${totalPrecioModelo.toFixed(2)}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveEntryModelo(mIdx)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-rose-500 hover:text-white hover:bg-rose-500 transition-all border border-rose-500/30 cursor-pointer shadow-2xs shrink-0"
                                title="Quitar modelo de recepción"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Observación específica por modelo */}
                          <div className="pt-2 border-t border-[var(--border)]/40">
                            <input
                              type="text"
                              placeholder="Observación específica de este modelo (ej. faltó 1 par talla 36, caja dañada, etc.)"
                              value={m.observacionLinea || ''}
                              onChange={(e) => {
                                const updated = [...entryModelos];
                                updated[mIdx].observacionLinea = e.target.value;
                                setEntryModelos(updated);
                              }}
                              className="w-full px-3 py-1.5 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                            />
                          </div>
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
                    ${entryModelos.reduce((sum, m) => sum + m.tallas.reduce((s, t) => s + ((t.cantidadIngresada || 0) * m.precioCosto), 0), 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={saving || !online || entryModelos.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50 cursor-pointer"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-extrabold text-sm flex items-center gap-2 text-[var(--foreground)]">
              <DollarSign size={16} className="text-emerald-500" />
              <span>Bitácora de Pagos & Abonos a Proveedores</span>
            </h3>
            <button
              type="button"
              onClick={() => handleAbrirModalPago(proveedores[0]?.id || '')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus size={14} />
              <span>+ Registrar Pago / Adelanto</span>
            </button>
          </div>

          {pagos.length === 0 ? (
            <div className="p-16 text-center text-[var(--muted-foreground)]">
              No hay pagos registrados aún en el sistema.
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin -mx-5">
              <table className="w-full text-xs text-left min-w-[780px]">
                <thead className="bg-[var(--muted)]/50 border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3 text-center">Sucursal</th>
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
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <Building size={10} /> {p.supplier?.sucursalNombre || (p as any).sucursalNombre || 'Matriz'}
                        </span>
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
          PESTAÑA 5: DEVOLUCIONES & GARANTÍAS A PROVEEDORES
         ══════════════════════════════════════════ */}
      {!loading && activeTab === 'devoluciones' && (
        <div className="space-y-6">
          {/* Header de la sección */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <RotateCcw size={18} className="text-rose-500" />
                <span>Mercadería por Devolver & Garantías a Fabricantes</span>
              </h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Control de calzado defectuoso, generación manual de constancias y descuento automático de cuentas por pagar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAbrirManualDefectuoso}
                className="px-3.5 py-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] border border-[var(--border)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus size={14} className="text-rose-500" />
                <span>Registrar Defectuoso en Bodega</span>
              </button>
              <button
                onClick={() => handleAbrirDevolucionProveedor()}
                className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-slate-700 cursor-pointer"
              >
                <RotateCcw size={14} className="text-amber-400" />
                <span>Nueva Devolución a Proveedor</span>
              </button>
            </div>
          </div>

          {/* 1. BANDEJA DE MERCADERÍA PENDIENTE POR DEVOLVER */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-[var(--foreground)]">
                  Bandeja de Calzado Pendiente de Entrega al Proveedor ({pendientesDevolucion.length} ítems)
                </h4>
              </div>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                Mermas de clientes y productos defectuosos sin liquidar
              </span>
            </div>

            {pendientesDevolucion.length === 0 ? (
              <div className="p-10 text-center text-[var(--muted-foreground)] space-y-1">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 opacity-60 mb-2" />
                <p className="font-bold text-xs text-[var(--foreground)]">No hay mercadería pendiente por devolver al proveedor</p>
                <p className="text-[11px]">Cuando un cliente devuelva calzado con falla o registres mercadería defectuosa en bodega, aparecerá aquí lista para devolver al fabricante.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendientesDevolucion.map((item: any) => {
                  const totalPares = (item.lines || []).reduce((acc: number, l: any) => acc + (l.cantidad || 0), 0);
                  const totalCostoEst = (item.lines || []).reduce((acc: number, l: any) => acc + ((l.cantidad || 0) * Number(l.costPrice || l.precioCosto || l.precioUnitario || 10)), 0);
                  const firstLine = item.lines?.[0] || {};
                  const foto = firstLine.imageUrl || firstLine.fotoUrl || '';
                  const modelName = firstLine.modelName || item.motivo || 'Calzado con Defecto';
                  const color = firstLine.color || 'COLOR ESTÁNDAR';
                  const serie = firstLine.serie || 'ADULTO';
                  const precioUnit = Number(firstLine.costPrice || firstLine.precioCosto || firstLine.precioUnitario || 10);

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 bg-[var(--card)] shadow-xs transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Imagen Thumbnail */}
                        <div className="w-14 h-14 rounded-2xl bg-[var(--muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                          {foto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={foto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package size={22} className="text-slate-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Título y Subtítulo */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-[var(--foreground)] leading-tight uppercase tracking-tight">
                                {modelName}
                              </h4>
                              <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                PENDIENTE
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted-foreground)] mt-0.5">
                              <span>{color}</span>
                              <span>·</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                Serie: {formatearNombreSerie(serie)}
                              </span>
                              {firstLine.supplierNombre && (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                    Fabricante: {firstLine.supplierNombre}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Pills de Tallas */}
                          <div className="flex flex-wrap gap-2">
                            {(item.lines || []).map((l: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 px-2.5 py-1 shadow-2xs"
                              >
                                <span className="text-[var(--foreground)] font-black text-xs font-mono">
                                  T{l.numeroTalla}
                                </span>
                                <span className="font-bold text-xs font-mono text-rose-600 dark:text-rose-400 px-1 bg-rose-500/10 rounded">
                                  {l.cantidad} par{l.cantidad > 1 ? 'es' : ''}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Observación / Motivo */}
                          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                            <span className="font-bold text-slate-500 dark:text-slate-400">📝 Motivo:</span>
                            <span className="italic">{item.motivo || 'Garantía / Falla de fábrica'}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">({new Date(item.createdAt).toLocaleDateString('es-EC')})</span>
                          </div>
                        </div>
                      </div>

                      {/* Resumen Derecho con Acción */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                        <div className="text-right">
                          <div className="text-xs font-bold text-[var(--foreground)]">
                            {totalPares} pares ({getDocenaLabel(totalPares)})
                          </div>
                          <div className="text-[11px] text-[var(--muted-foreground)] font-medium">
                            ${precioUnit.toFixed(2)} / par
                          </div>
                          <div className="font-black text-base text-rose-600 dark:text-rose-400 mt-0.5">
                            ${totalCostoEst.toFixed(2)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleAbrirDevolucionProveedor(item)}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <RotateCcw size={14} />
                          <span>Devolver</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. HISTORIAL DE CONSTANCIAS DE DEVOLUCIÓN */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-500" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-[var(--foreground)]">
                  Historial de Devoluciones Procesadas ({devolucionesProveedor.length} constancias)
                </h4>
              </div>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                Registro de calzado entregado y descuentos aplicados en cuenta corriente
              </span>
            </div>

            {devolucionesProveedor.length === 0 ? (
              <div className="p-12 text-center text-[var(--muted-foreground)]">
                No hay devoluciones a proveedores procesadas aún.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin -mx-5">
                <table className="w-full text-xs text-left min-w-[780px]">
                  <thead className="bg-[var(--muted)]/50 border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-5 py-3">Constancia</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3 text-center">Pares</th>
                      <th className="px-4 py-3">Motivo / Detalle</th>
                      <th className="px-4 py-3 text-right">Monto Descontado</th>
                      <th className="px-5 py-3 text-center">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {devolucionesProveedor.map((dev: any) => (
                      <tr key={dev.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-rose-600">
                          {dev.numeroCodigo || `DEV-${dev.id.slice(0, 4).toUpperCase()}`}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-[var(--muted-foreground)] font-mono">
                          {new Date(dev.createdAt).toLocaleDateString('es-EC')}
                        </td>
                        <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                          {dev.supplier?.razonSocial || dev.supplier?.nombre || 'Proveedor'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold font-mono">
                          {dev.totalPares || (dev.lines || []).reduce((acc: number, l: any) => acc + l.cantidad, 0)} pares
                        </td>
                        <td className="px-4 py-3 text-[11px] text-[var(--muted-foreground)] truncate max-w-xs">
                          {dev.motivo}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-rose-600 font-mono text-sm">
                          -${Number(dev.totalDevuelto || dev.deudaDescontada || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => handleEnviarDevolucionWhatsApp(dev)}
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                            title="Enviar Constancia al WhatsApp del Proveedor"
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
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: DETALLE DE ORDEN (Con Botón Enviar Explícito)
         ══════════════════════════════════════════ */}
      {showOrderDetailModal && selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowOrderDetailModal(false);
              setEditingOrder(false);
              setAddingModelToDetail(false);
              setProductoSeleccionado(null);
              setBusquedaModelo('');
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowOrderDetailModal(false);
              setEditingOrder(false);
              setAddingModelToDetail(false);
              setProductoSeleccionado(null);
              setBusquedaModelo('');
            }
          }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-4xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header del Modal Estandarizado (Azul Oscuro #0F172A / Blanco) */}
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-amber-400 font-bold shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                      Orden de Compra OC-{String(selectedOrder.numero).padStart(4, '0')}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedOrder.estado === 'BORRADOR'
                        ? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                        : selectedOrder.estado === 'PENDIENTE'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : selectedOrder.estado === 'RECIBIDA'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}>
                      {selectedOrder.estado === 'BORRADOR' 
                        ? (selectedOrder.observaciones?.includes('[AJUSTE_MANUAL]') ? 'Borrador Fijado' : 'Borrador (Acumulándose)') 
                        : selectedOrder.estado === 'PENDIENTE' 
                        ? 'Enviada al Proveedor' 
                        : selectedOrder.estado}
                    </span>
                    {selectedOrder.observaciones?.includes('[AJUSTE_MANUAL]') && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1" title="Esta orden fue ajustada manualmente según tu presupuesto y está protegida contra alteraciones automáticas">
                        <span>🔒</span>
                        <span>Ajustada Manualmente</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                    Proveedor: <strong className="text-white">{selectedOrder.supplier?.razonSocial || selectedOrder.supplier?.nombre}</strong> ({selectedOrder.supplier?.ruc})
                  </p>
                </div>
              </div>

              {/* Botón Cerrar (X) Anclado en la Esquina Superior Derecha */}
              <button
                onClick={() => {
                  setShowOrderDetailModal(false);
                  setEditingOrder(false);
                  setAddingModelToDetail(false);
                  setProductoSeleccionado(null);
                  setBusquedaModelo('');
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 min-h-0 text-xs">
              {/* Tarjeta Destacada: Cliente / Pedido Originador */}
              {(() => {
                const obsText = (selectedOrder.lines || []).map((l: any) => l.observacionLinea).filter(Boolean).join(' ');
                const clienteMatch = obsText.match(/Cliente:\s*([^|]+)/i);
                const refMatch = obsText.match(/Ref Pedido:\s*(#?[a-z0-9]+)/i);
                const rawCli = clienteMatch ? clienteMatch[1].trim() : null;
                const foundCli = rawCli ? clientesList.find(c => `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase().includes(rawCli.toLowerCase()) || rawCli.toLowerCase().includes(c.nombre?.toLowerCase())) : null;
                const cliNombre = foundCli ? `${foundCli.nombre || ''} ${foundCli.apellido || ''}`.trim() : rawCli;
                const rep = getClienteReputacion(foundCli);
                let refCode = refMatch ? refMatch[1].trim() : null;
                if (refCode && !refCode.startsWith('#')) refCode = `#${refCode}`;
                if (refCode) refCode = refCode.slice(0, 7).toUpperCase();

                if (!cliNombre) return null;

                return (
                  <div className="p-3.5 bg-blue-500/10 border border-blue-500/25 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        👤
                      </div>
                      <div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                          Pedido Solicitado para Cliente
                        </div>
                        <div className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
                          <span>{cliNombre}</span>
                          {foundCli && (
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${rep.badgeClass}`} title={rep.descripcion}>
                              {rep.icon} {rep.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {refCode && (
                      <span className="px-2.5 py-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 rounded-xl font-mono text-xs font-black">
                        📦 Ref Pedido: {refCode}
                      </span>
                    )}
                  </div>
                );
              })()}
              <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-2xl p-4 space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Observaciones / Términos de Entrega
                </label>
                {editingOrder ? (
                  <textarea
                    rows={2}
                    value={(selectedOrder.observaciones || '').replace(/\[AJUSTE_MANUAL\]\s*/g, '').trim()}
                    onChange={(e) => {
                      const text = e.target.value;
                      const hasTag = (selectedOrder.observaciones || '').includes('[AJUSTE_MANUAL]');
                      setSelectedOrder({
                        ...selectedOrder,
                        observaciones: hasTag ? `[AJUSTE_MANUAL] ${text}`.trim() : text,
                      });
                    }}
                    placeholder="Instrucciones al proveedor..."
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                ) : (
                  <p className="text-xs text-[var(--foreground)] italic">
                    {(selectedOrder.observaciones || '').replace(/\[AJUSTE_MANUAL\]\s*/g, '').trim() || 'Sin observaciones registradas.'}
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
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-xs text-[var(--foreground)]">{line.nombre}</h5>
                                {line.reordenAutomatica === false && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                    <Ban size={10} className="shrink-0" /> Descontinuado (Auto-reorden desactivada)
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2 text-[10px] text-[var(--muted-foreground)]">
                                <span>Cód: {line.codigo}</span>
                                {line.color && <span>• Color: {line.color}</span>}
                                {line.serie && <span>• Serie: {formatearNombreSerie(line.serie)}</span>}
                              </div>
                              {line.observacionLinea && (() => {
                                const obs = line.observacionLinea;
                                if (obs.includes('Cliente:') || obs.includes('Ref Pedido:')) {
                                  const clienteMatch = obs.match(/Cliente:\s*([^|]+)/i);
                                  const refMatch = obs.match(/Ref Pedido:\s*(#?[a-z0-9]+)/i) || obs.match(/(#[a-f0-9]{4,8})/i);
                                  const detalleMatch = obs.match(/\(([^)]+)\)/i);

                                  const rawClientName = clienteMatch ? clienteMatch[1].trim() : null;
                                  const foundClient = rawClientName
                                    ? clientesList.find((c) => {
                                        const full = `${c.nombre || ''} ${c.apellido || ''}`.trim().toLowerCase();
                                        const raw = rawClientName.toLowerCase();
                                        return full.includes(raw) || (c.nombre && raw.includes(c.nombre.toLowerCase()));
                                      })
                                    : null;

                                  const fullClientName = foundClient
                                    ? `${foundClient.nombre || ''} ${foundClient.apellido || ''}`.trim()
                                    : rawClientName;

                                  const rep = getClienteReputacion(foundClient);

                                  let refCode = refMatch ? refMatch[1].trim() : null;
                                  if (refCode && !refCode.startsWith('#')) refCode = `#${refCode}`;
                                  if (refCode) refCode = refCode.slice(0, 7).toUpperCase();
                                  
                                  let detalle = detalleMatch ? detalleMatch[1].trim() : null;
                                  if (detalle) {
                                    detalle = detalle
                                      .replace(/\b1\s+pares\b/gi, '1 par')
                                      .replace(/^faltante:?\s*/i, 'Déficit pedido: ')
                                      .replace(/\+\s*12\s*stock/i, '+ 12 pares p/ stock')
                                      .replace(/\+\s*12\s*pares\s*stock/i, '+ 12 pares p/ stock');
                                  }

                                  return (
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                      {fullClientName && (
                                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-2xs">
                                          <span>👤</span>
                                          <span className="text-blue-500/80 font-normal">Cliente:</span>
                                          <span className="font-extrabold">{fullClientName}</span>
                                          {foundClient && (
                                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] border ${rep.badgeClass}`} title={rep.descripcion}>
                                              {rep.icon} {rep.label}
                                            </span>
                                          )}
                                        </span>
                                      )}
                                      {refCode && (
                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 rounded-lg text-[10px] font-bold flex items-center gap-1 font-mono shadow-2xs">
                                          <span>📦</span>
                                          <span className="text-purple-500/80 font-normal">Pedido:</span>
                                          <span className="font-extrabold">{refCode}</span>
                                        </span>
                                      )}
                                      {detalle && (
                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                                          <span>⚡</span>
                                          <span>{detalle}</span>
                                        </span>
                                      )}
                                    </div>
                                  );
                                }

                                const obsLimpia = limpiarObservacionesOrden(obs);
                                if (!obsLimpia) return null;

                                return (
                                  <div className="mt-1.5">
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                      • Observación: {obsLimpia}
                                    </p>
                                  </div>
                                );
                              })()}
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
                                          const otherLines = (selectedOrder.lines || []).filter((l) => l.productId !== line.productId);
                                          const baseLine = (selectedOrder.lines || []).find((l) => l.productId === line.productId) || line;
                                          const updatedLine = {
                                            ...baseLine,
                                            cantidadPedida: newTotal,
                                            subtotal: newTotal * (baseLine.precioCosto || line.precioCosto || 0),
                                            _tallasOverride: newTallas,
                                            tallasDesglose: newTallas,
                                          };
                                          setSelectedOrder({ ...selectedOrder, lines: [...otherLines, updatedLine] });
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
                                          const otherLines = (selectedOrder.lines || []).filter((l) => l.productId !== line.productId);
                                          const baseLine = (selectedOrder.lines || []).find((l) => l.productId === line.productId) || line;
                                          const updatedLine = {
                                            ...baseLine,
                                            cantidadPedida: newTotal,
                                            subtotal: newTotal * (baseLine.precioCosto || line.precioCosto || 0),
                                            _tallasOverride: newTallas,
                                            tallasDesglose: newTallas,
                                          };
                                          setSelectedOrder({ ...selectedOrder, lines: [...otherLines, updatedLine] });
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
                                    const serieName = (line as any).serieNombre || (line as any).product?.serie?.nombre || '';
                                    const curva = getCurvaDocena(serieName, 'MEDIA_A');
                                    const hasCurva = Object.keys(curva).length > 0;
                                    const newTallas = (line.tallasDesglose || []).map(t => {
                                      const qty = hasCurva ? (curva[Number(t.talla)] || 0) : 0;
                                      return { ...t, cantidad: t.cantidad + qty };
                                    });
                                    const newTotal = newTallas.reduce((s, t) => s + t.cantidad, 0);
                                    const otherLines = (selectedOrder.lines || []).filter((l) => l.productId !== line.productId);
                                    const baseLine = (selectedOrder.lines || []).find((l) => l.productId === line.productId) || line;
                                    const updatedLine = {
                                      ...baseLine,
                                      cantidadPedida: newTotal,
                                      subtotal: newTotal * (baseLine.precioCosto || line.precioCosto || 0),
                                      _tallasOverride: newTallas,
                                      tallasDesglose: newTallas,
                                    };
                                    setSelectedOrder({ ...selectedOrder, lines: [...otherLines, updatedLine] });
                                  }}
                                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  + ½ Doc A
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const serieName = (line as any).serieNombre || (line as any).product?.serie?.nombre || '';
                                    const curva = getCurvaDocena(serieName, 'MEDIA_B');
                                    const hasCurva = Object.keys(curva).length > 0;
                                    const newTallas = (line.tallasDesglose || []).map(t => {
                                      const qty = hasCurva ? (curva[Number(t.talla)] || 0) : 0;
                                      return { ...t, cantidad: t.cantidad + qty };
                                    });
                                    const newTotal = newTallas.reduce((s, t) => s + t.cantidad, 0);
                                    const otherLines = (selectedOrder.lines || []).filter((l) => l.productId !== line.productId);
                                    const baseLine = (selectedOrder.lines || []).find((l) => l.productId === line.productId) || line;
                                    const updatedLine = {
                                      ...baseLine,
                                      cantidadPedida: newTotal,
                                      subtotal: newTotal * (baseLine.precioCosto || line.precioCosto || 0),
                                      _tallasOverride: newTallas,
                                      tallasDesglose: newTallas,
                                    };
                                    setSelectedOrder({ ...selectedOrder, lines: [...otherLines, updatedLine] });
                                  }}
                                  className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/20 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  + ½ Doc B
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const serieName = (line as any).serieNombre || (line as any).product?.serie?.nombre || '';
                                    const curva = getCurvaDocena(serieName, 'MEDIA_A');
                                    const hasCurva = Object.keys(curva).length > 0;
                                    const newTallas = (line.tallasDesglose || []).map(t => {
                                      const qty = hasCurva ? (curva[Number(t.talla)] || 0) : 0;
                                      return { ...t, cantidad: Math.max(0, t.cantidad - qty) };
                                    });
                                    const newTotal = newTallas.reduce((s, t) => s + t.cantidad, 0);
                                    const otherLines = (selectedOrder.lines || []).filter((l) => l.productId !== line.productId);
                                    const baseLine = (selectedOrder.lines || []).find((l) => l.productId === line.productId) || line;
                                    const updatedLine = {
                                      ...baseLine,
                                      cantidadPedida: newTotal,
                                      subtotal: newTotal * (baseLine.precioCosto || line.precioCosto || 0),
                                      _tallasOverride: newTallas,
                                      tallasDesglose: newTallas,
                                    };
                                    setSelectedOrder({ ...selectedOrder, lines: [...otherLines, updatedLine] });
                                  }}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  − ½ Doc A
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const serieName = (line as any).serieNombre || (line as any).product?.serie?.nombre || '';
                                    const curva = getCurvaDocena(serieName, 'MEDIA_B');
                                    const hasCurva = Object.keys(curva).length > 0;
                                    const newTallas = (line.tallasDesglose || []).map(t => {
                                      const qty = hasCurva ? (curva[Number(t.talla)] || 0) : 0;
                                      return { ...t, cantidad: Math.max(0, t.cantidad - qty) };
                                    });
                                    const newTotal = newTallas.reduce((s, t) => s + t.cantidad, 0);
                                    const otherLines = (selectedOrder.lines || []).filter((l) => l.productId !== line.productId);
                                    const baseLine = (selectedOrder.lines || []).find((l) => l.productId === line.productId) || line;
                                    const updatedLine = {
                                      ...baseLine,
                                      cantidadPedida: newTotal,
                                      subtotal: newTotal * (baseLine.precioCosto || line.precioCosto || 0),
                                      _tallasOverride: newTallas,
                                      tallasDesglose: newTallas,
                                    };
                                    setSelectedOrder({ ...selectedOrder, lines: [...otherLines, updatedLine] });
                                  }}
                                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  − ½ Doc B
                                </button>
                                <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                  = {line.tallasDesglose?.reduce((s, t) => s + t.cantidad, 0) || 0} pares total
                                </span>
                              </div>
                            )}

                            {/* Observación para proveedor (editable al modificar la orden) */}
                            <div className="mt-2.5 pt-2 border-t border-[var(--border)]/40" onClick={(e) => e.stopPropagation()}>
                              {editingOrder ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
                                    📝 Observación para proveedor:
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Ej: Hebilla dorada, suela caramelo en T38 y T39..."
                                    value={line.observacionLinea || ''}
                                    onChange={(e) => {
                                      const updatedLines = [...(selectedOrder.lines || [])];
                                      const target = updatedLines.find((l) => l.productId === line.productId);
                                      if (target) {
                                        target.observacionLinea = e.target.value;
                                      }
                                      setSelectedOrder({ ...selectedOrder, lines: updatedLines });
                                    }}
                                    className="flex-1 px-2.5 py-1 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-amber-500 text-[var(--foreground)]"
                                  />
                                </div>
                              ) : (
                                line.observacionLinea && (() => {
                                  const obsLimpia = limpiarObservacionesOrden(line.observacionLinea);
                                  if (!obsLimpia) return null;
                                  return (
                                    <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                      <span className="font-bold">📝 Observación proveedor:</span>
                                      <span className="italic font-medium">{obsLimpia}</span>
                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Sección Agregar Otro Modelo a esta Orden (Fase 2) */}
                {(selectedOrder.estado === 'BORRADOR' || selectedOrder.estado === 'PENDIENTE') && (
                  <div className="pt-2">
                    {!addingModelToDetail ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOrder(true);
                          setAddingModelToDetail(true);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus size={15} />
                        <span>Agregar Otro Modelo a esta Orden</span>
                      </button>
                    ) : (
                      <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4 animate-in fade-in duration-200">
                        {/* Cabecera del formulario de agregar modelo */}
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Plus size={14} /> Agregar Nuevo Modelo a esta Orden
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingModelToDetail(false);
                              setProductoSeleccionado(null);
                              setBusquedaModelo('');
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>

                        {/* Buscador de Producto */}
                        {!productoSeleccionado && (
                          <div className="relative">
                            <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">
                              Buscar Modelo de Calzado *
                            </label>
                            <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                              <input
                                type="text"
                                placeholder="Escribe para buscar modelo (ej. Mocasín, Botín, Negro)..."
                                value={busquedaModelo}
                                onChange={(e) => {
                                  setBusquedaModelo(e.target.value);
                                  setShowDropdownModelo(true);
                                }}
                                onFocus={() => setShowDropdownModelo(true)}
                                className="w-full pl-9 pr-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                              />
                            </div>

                            {showDropdownModelo && (busquedaModelo.trim().length > 0 || serieFiltroOrden !== 'TODAS') && (() => {
                              const q = busquedaModelo.toLowerCase().trim();
                              const filtrados = productos
                                .filter((p) => {
                                  if (serieFiltroOrden !== 'TODAS') {
                                    const serProd = obtenerSerieProducto(p);
                                    if (serProd.toLowerCase() !== serieFiltroOrden.toLowerCase()) {
                                      return false;
                                    }
                                  }
                                  if (!q) return true;
                                  return (
                                    (p.nombre && p.nombre.toLowerCase().includes(q)) ||
                                    (p.name && p.name.toLowerCase().includes(q)) ||
                                    (p.codigo && p.codigo.toLowerCase().includes(q)) ||
                                    (p.color && p.color.toLowerCase().includes(q)) ||
                                    (p.marca && p.marca.toLowerCase().includes(q)) ||
                                    (obtenerSerieProducto(p).toLowerCase().includes(q))
                                  );
                                })
                                .sort((a, b) => {
                                  const nomA = (a.nombre || a.name || '').toLowerCase();
                                  const nomB = (b.nombre || b.name || '').toLowerCase();
                                  const cmp = nomA.localeCompare(nomB, 'es', { sensitivity: 'base' });
                                  if (cmp !== 0) return cmp;
                                  return (a.color || '').localeCompare(b.color || '', 'es', { sensitivity: 'base' });
                                });

                              return (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto">
                                  {filtrados.length > 0 ? (
                                    filtrados.map((p) => {
                                      const serieName = obtenerSerieProducto(p);
                                      return (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => {
                                            setProductoSeleccionado(p);
                                            setPrecioCostoInput(Number(p.precioCosto || p.costPrice || 0));
                                            setShowDropdownModelo(false);
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--muted)] border-b border-[var(--border)] last:border-none flex items-center justify-between cursor-pointer"
                                        >
                                          <div className="flex items-center gap-2.5">
                                            {obtenerFotoProducto(p) ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img src={obtenerFotoProducto(p)} alt="" className="w-8 h-8 object-cover rounded" />
                                            ) : (
                                              <div className="w-8 h-8 rounded bg-[var(--muted)] flex items-center justify-center text-sm">👟</div>
                                            )}
                                            <div>
                                              <span className="font-bold block">{p.nombre || p.name}</span>
                                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                                {p.marca} • {p.color} ({p.codigo})
                                                {serieName && ` • Serie: ${formatearNombreSerie(serieName)}`}
                                              </span>
                                            </div>
                                          </div>
                                          <span className="font-mono text-emerald-600 font-bold">${Number(p.precioCosto || p.costPrice || 0).toFixed(2)}</span>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="p-4 text-center text-xs text-[var(--muted-foreground)]">
                                      No se encontraron modelos que coincidan con "{busquedaModelo}".
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Configuración de Curva Exacta cuando hay producto seleccionado */}
                        {productoSeleccionado && (
                          <div className="p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                              <div className="flex items-center gap-2.5">
                                {obtenerFotoProducto(productoSeleccionado) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={obtenerFotoProducto(productoSeleccionado)} alt="" className="w-10 h-10 object-cover rounded-xl border border-[var(--border)]" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center text-base">👟</div>
                                )}
                                <div>
                                  <span className="font-black text-xs uppercase block text-[var(--foreground)]">
                                    {productoSeleccionado.nombre || productoSeleccionado.name}
                                  </span>
                                  <span className="text-[10px] text-[var(--muted-foreground)]">
                                    {productoSeleccionado.color} • <span className="text-emerald-600 font-bold">Serie: {formatearNombreSerie(serieNombreActiva)}</span>
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setProductoSeleccionado(null);
                                  setBusquedaModelo('');
                                }}
                                className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                              >
                                Cambiar modelo
                              </button>
                            </div>

                            <div>
                              <span className="text-xs font-bold text-[var(--foreground)] block mb-1.5">Seleccionar Curva de Serie:</span>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSubtipoCurva('MEDIA_A')}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    subtipoCurva === 'MEDIA_A'
                                      ? 'bg-emerald-600 text-white border-transparent shadow-xs font-black'
                                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]/80'
                                  }`}
                                >
                                  ½ Media A (6 pares)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSubtipoCurva('MEDIA_B')}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    subtipoCurva === 'MEDIA_B'
                                      ? 'bg-emerald-600 text-white border-transparent shadow-xs font-black'
                                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]/80'
                                  }`}
                                >
                                  ½ Media B (6 pares)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSubtipoCurva('DOCENA')}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    subtipoCurva === 'DOCENA'
                                      ? 'bg-emerald-600 text-white border-transparent shadow-xs font-black'
                                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]/80'
                                  }`}
                                >
                                  1 Docena (12 pares)
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs font-bold text-[var(--foreground)]">
                                {subtipoCurva === 'DOCENA' ? '¿Cuántas docenas?:' : '¿Cuántas medias docenas?:'}
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
                                  DISTRIBUCIÓN DE CURVA ({subtipoCurva === 'MEDIA_A' ? 'MEDIA DOCENA A' : subtipoCurva === 'MEDIA_B' ? 'MEDIA DOCENA B' : 'DOCENA COMPLETA'}):
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

                            <div className="space-y-2 pt-2">
                              <div className="w-full">
                                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Precio Costo Unit ($) *</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={precioCostoInput}
                                  onChange={(e) => setPrecioCostoInput(parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-1.5 bg-[var(--card)] border rounded-lg text-xs font-mono font-bold"
                                />
                              </div>

                              {/* Observación por Modelo Opcional */}
                              <div>
                                {!mostrarObsModeloOrden && !observacionItemInput ? (
                                  <button
                                    type="button"
                                    onClick={() => setMostrarObsModeloOrden(true)}
                                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>+ Agregar observación a este modelo (opcional)</span>
                                  </button>
                                ) : (
                                  <div className="space-y-1 animate-in fade-in duration-150">
                                    <div className="flex justify-between items-center">
                                      <label className="block text-[10px] font-bold text-[var(--muted-foreground)]">
                                        Observación Específica del Modelo (Opcional)
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMostrarObsModeloOrden(false);
                                          setObservacionItemInput('');
                                        }}
                                        className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                                      >
                                        Quitar observación
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Ej. Hebilla dorada, cuero charol, suela cocida..."
                                      value={observacionItemInput}
                                      onChange={(e) => setObservacionItemInput(e.target.value)}
                                      className="w-full px-3 py-1.5 bg-[var(--card)] border rounded-lg text-xs"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAgregarModeloAOrden(true)}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus size={14} />
                              <span>Agregar a esta Orden ({paresCalculados} pares)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal con Botones Estandarizados */}
            <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--muted)]/20 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOrderDetailModal(false);
                    setEditingOrder(false);
                    setAddingModelToDetail(false);
                    setProductoSeleccionado(null);
                    setBusquedaModelo('');
                  }}
                  className="px-4 py-2.5 border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ArrowLeft size={14} />
                  <span>Volver a Órdenes</span>
                </button>

                {(selectedOrder.estado === 'BORRADOR' || selectedOrder.estado === 'PENDIENTE') && !editingOrder && (
                  <>
                    <button
                      onClick={() => handleCancelarOrden(selectedOrder.id)}
                      disabled={saving}
                      className="px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 text-[var(--muted-foreground)] hover:bg-[var(--muted)] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Cancelar solo esta orden puntual"
                    >
                      <X size={13} />
                      <span>Cancelar Orden</span>
                    </button>
                    <button
                      onClick={() => handleCancelarYBloquearReorden(selectedOrder.id)}
                      disabled={saving}
                      className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/30 text-rose-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Cancelar orden y desactivar reorden automática de estos productos (ya no se venden)"
                    >
                      <Ban size={14} className="shrink-0" />
                      <span>Descontinuar (No volver a generar)</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Botón Previsualizar PDF */}
                <button
                  onClick={() => handlePrevisualizarPDFOrden(selectedOrder.id)}
                  className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Previsualizar documento PDF oficial"
                >
                  <Eye size={14} />
                  <span>Previsualizar PDF</span>
                </button>

                {/* Botón Descargar PDF */}
                <button
                  onClick={() => handleDescargarPDFOrden(selectedOrder.id)}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Descargar archivo PDF"
                >
                  <Download size={14} />
                  <span>Guardar PDF</span>
                </button>

                {/* Botón Enviar PDF por WhatsApp */}
                <button
                  onClick={() => handleEnviarOrdenWhatsApp(selectedOrder)}
                  className="px-3.5 py-2.5 bg-emerald-500/15 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Enviar archivo PDF por WhatsApp al fabricante"
                >
                  <MessageCircle size={14} />
                  <span>Enviar PDF</span>
                </button>

                {/* Acción Principal */}
                {editingOrder ? (
                  <button
                    onClick={handleGuardarEdicionOrden}
                    disabled={saving}
                    className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm border border-slate-700 cursor-pointer"
                  >
                    <Save size={14} className="text-emerald-400" />
                    <span>Guardar Cambios</span>
                  </button>
                ) : selectedOrder.estado === 'BORRADOR' ? (
                  <button
                    onClick={() => handleEnviarYGenerarPDF(selectedOrder.id)}
                    disabled={saving}
                    className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm border border-slate-700 cursor-pointer"
                  >
                    <Send size={14} className="text-emerald-400" />
                    <span>Confirmar y Enviar al Proveedor</span>
                  </button>
                ) : (selectedOrder.estado === 'PENDIENTE' || selectedOrder.estado === 'RECIBIDA_PARCIAL') ? (
                  <button
                    onClick={() => {
                      setShowOrderDetailModal(false);
                      handleIrARecepcionDesdeOrden(selectedOrder);
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <PackageCheck size={14} />
                    <span>Recibir Mercancía en Bodega</span>
                  </button>
                ) : selectedOrder.estado === 'RECIBIDA' ? (
                  <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>Mercancía 100% Recibida e Ingresada a Bodega</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: ESTADO DE CUENTA MASTER-DETAIL
         ══════════════════════════════════════════ */}
      {showCuentaModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCuentaModal(false); }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCuentaModal(false); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-4xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Estado de Cuenta — {cuentaCorrienteData?.supplier?.razonSocial || cuentaCorrienteData?.supplier?.nombre || 'Proveedor'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    RUC: {cuentaCorrienteData?.supplier?.ruc} • Histórico de compras, entregas y pagos
                  </p>
                </div>
              </div>

              {/* Botón Cerrar (X) Anclado en la Esquina Superior Derecha */}
              <button
                onClick={() => setShowCuentaModal(false)}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {loadingCuenta ? (
              <div className="p-16 flex flex-col items-center justify-center text-[var(--muted-foreground)] space-y-2">
                <Loader2 size={28} className="animate-spin text-[#0F172A] dark:text-amber-400" />
                <span className="text-xs">Cargando balance...</span>
              </div>
            ) : cuentaCorrienteData ? (() => {
              /* ── Calcular desglose detallado de adelantos vs pagos contra deuda ── */
              const resumen = cuentaCorrienteData.resumen;
              const movs = cuentaCorrienteData.movimientos || [];
              const totalFacturado = resumen.totalFacturado || 0;
              const totalPagado = resumen.totalPagado || 0;
              const totalDevoluciones = resumen.totalDevoluciones || 0;
              const cruzado = resumen.cruzadoConMercaderia || Math.min(totalFacturado, totalPagado + totalDevoluciones);
              const saldoAFavor = resumen.saldoAFavor || 0;
              const saldoPendiente = resumen.saldoPendiente || 0;

              /* Desglose: cuánto del total pagado cubrió deuda vs cuánto es adelanto puro */
              const pagadoQueCobrioDeuda = Math.min(totalPagado, totalFacturado - totalDevoluciones);
              const adelantoPuro = Math.max(0, totalPagado - Math.max(0, totalFacturado - totalDevoluciones));

              /* Running balance: ordenar cronológicamente ASC y calcular saldo acumulado */
              const movsOrdenadosAsc = [...movs].sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
              let saldoAcumulado = 0;
              const runningBalanceMap = new Map<string, number>();
              movsOrdenadosAsc.forEach((mov: any) => {
                const isIngreso = mov.tipo === 'ENTREGA_MERCANCIA';
                const isDescuento = mov.tipo === 'PAGO_PROVEEDOR' || mov.tipo === 'DEVOLUCION_PROVEEDOR';
                if (isIngreso) {
                  saldoAcumulado += Number(mov.monto);
                } else if (isDescuento) {
                  saldoAcumulado -= Number(mov.monto);
                }
                runningBalanceMap.set(`${mov.id}-${mov.fecha}`, saldoAcumulado);
              });

              /* Clasificar cada pago: fue adelanto o abono a deuda */
              let deudaAcumAlMomentoDelPago = 0;
              const clasificacionPagos = new Map<string, 'ADELANTO' | 'ABONO' | 'MIXTO'>();
              movsOrdenadosAsc.forEach((mov: any) => {
                if (mov.tipo === 'ENTREGA_MERCANCIA') {
                  deudaAcumAlMomentoDelPago += Number(mov.monto);
                } else if (mov.tipo === 'DEVOLUCION_PROVEEDOR') {
                  deudaAcumAlMomentoDelPago -= Number(mov.monto);
                } else if (mov.tipo === 'PAGO_PROVEEDOR') {
                  const montoP = Number(mov.monto);
                  if (deudaAcumAlMomentoDelPago <= 0.01) {
                    clasificacionPagos.set(mov.id, 'ADELANTO');
                  } else if (montoP > deudaAcumAlMomentoDelPago + 0.01) {
                    clasificacionPagos.set(mov.id, 'MIXTO');
                  } else {
                    clasificacionPagos.set(mov.id, 'ABONO');
                  }
                  deudaAcumAlMomentoDelPago -= montoP;
                }
              });

              /* Contar entregas que fueron cruzadas con adelantos previos */
              let adelantoDisponiblePrevio = 0;
              const crucesPorEntrega = new Map<string, number>();
              movsOrdenadosAsc.forEach((mov: any) => {
                if (mov.tipo === 'PAGO_PROVEEDOR') {
                  adelantoDisponiblePrevio += Number(mov.monto);
                } else if (mov.tipo === 'DEVOLUCION_PROVEEDOR') {
                  adelantoDisponiblePrevio += Number(mov.monto);
                } else if (mov.tipo === 'ENTREGA_MERCANCIA') {
                  const montoEntrega = Number(mov.monto);
                  if (adelantoDisponiblePrevio > 0.01) {
                    const cruzadoEnEsta = Math.min(adelantoDisponiblePrevio, montoEntrega);
                    crucesPorEntrega.set(mov.id, cruzadoEnEsta);
                  }
                  adelantoDisponiblePrevio -= montoEntrega;
                }
              });

              return (
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 min-h-0 text-xs">
                {/* ── PANEL RESUMEN GENERAL (4 tarjetas) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">Total Facturado</span>
                    <span className="text-base font-black text-[var(--foreground)] font-mono">
                      ${totalFacturado.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-[var(--muted-foreground)] block">
                      {resumen.totalEntregas || 0} entrega(s) de mercaderia
                    </span>
                  </div>
                  <div className="bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">Total Pagado</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ${totalPagado.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-[var(--muted-foreground)] block">
                      {resumen.totalPagos || 0} pago(s) registrado(s)
                    </span>
                  </div>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Cruzado con Mercancia</span>
                    <span className="text-base font-black text-indigo-700 dark:text-indigo-400 font-mono">
                      ${cruzado.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-300 block">
                      Pagos aplicados a entregas
                    </span>
                  </div>
                  <div className={`border rounded-2xl p-3.5 space-y-1 ${
                    saldoPendiente > 0.01
                      ? 'bg-rose-500/10 border-rose-500/20'
                      : saldoAFavor > 0.01
                        ? 'bg-blue-500/10 border-blue-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block">
                      {saldoPendiente > 0.01
                        ? 'Saldo Pendiente (Deuda)'
                        : saldoAFavor > 0.01
                          ? 'Adelanto Disponible (A Favor)'
                          : 'Estado de Cuenta'}
                    </span>
                    <span className={`text-base font-black font-mono ${
                      saldoPendiente > 0.01
                        ? 'text-rose-600 dark:text-rose-400'
                        : saldoAFavor > 0.01
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {saldoPendiente > 0.01
                        ? `$${saldoPendiente.toFixed(2)}`
                        : saldoAFavor > 0.01
                          ? `$${saldoAFavor.toFixed(2)}`
                          : 'Al Dia ($0.00)'}
                    </span>
                  </div>
                </div>

                {/* ── DESGLOSE DETALLADO: Adelantos vs Abonos a Deuda ── */}
                {(totalPagado > 0 || totalDevoluciones > 0) && (
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-800/40 dark:to-blue-900/20 border border-[var(--border)] rounded-2xl p-4 space-y-3">
                    <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                      <Receipt size={14} className="text-blue-500" />
                      Desglose Detallado de Pagos y Adelantos
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Pagos que cubrieron deuda */}
                      <div className="bg-white/70 dark:bg-slate-800/60 rounded-xl p-3 border border-emerald-200/50 dark:border-emerald-700/30">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Abonos a Deuda</span>
                        </div>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                          ${Math.max(0, pagadoQueCobrioDeuda).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-[var(--muted-foreground)]">
                          Pagos que cubrieron mercaderia recibida
                        </span>
                      </div>

                      {/* Adelantos puros */}
                      <div className="bg-white/70 dark:bg-slate-800/60 rounded-xl p-3 border border-blue-200/50 dark:border-blue-700/30">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                          <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Adelantos Puros</span>
                        </div>
                        <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono block">
                          ${adelantoPuro.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-[var(--muted-foreground)]">
                          Anticipos sin mercaderia pendiente
                        </span>
                      </div>

                      {/* Devoluciones */}
                      {totalDevoluciones > 0 && (
                        <div className="bg-white/70 dark:bg-slate-800/60 rounded-xl p-3 border border-rose-200/50 dark:border-rose-700/30">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Devoluciones</span>
                          </div>
                          <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono block">
                            ${totalDevoluciones.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-[var(--muted-foreground)]">
                            Descontado de deuda por garantia
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Barra visual proporcional */}
                    {totalPagado > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[9px] text-[var(--muted-foreground)] font-bold uppercase tracking-wider">
                          <span>Composicion de pagos</span>
                          <span>Total: ${totalPagado.toFixed(2)}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                          {pagadoQueCobrioDeuda > 0 && (
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${Math.min(100, (Math.max(0, pagadoQueCobrioDeuda) / totalPagado) * 100)}%` }}
                              title={`Abonos a deuda: $${Math.max(0, pagadoQueCobrioDeuda).toFixed(2)}`}
                            />
                          )}
                          {adelantoPuro > 0 && (
                            <div
                              className="h-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${Math.min(100, (adelantoPuro / totalPagado) * 100)}%` }}
                              title={`Adelantos puros: $${adelantoPuro.toFixed(2)}`}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[9px]">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[var(--muted-foreground)]">Abonos ({totalPagado > 0 ? Math.round((Math.max(0, pagadoQueCobrioDeuda) / totalPagado) * 100) : 0}%)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-[var(--muted-foreground)]">Adelantos ({totalPagado > 0 ? Math.round((adelantoPuro / totalPagado) * 100) : 0}%)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TITULO LINEA DE TIEMPO ── */}
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-[var(--foreground)]">
                    <History size={16} />
                    <span>Linea de Tiempo de Movimientos</span>
                  </h4>
                  <button
                    onClick={() => handleAbrirModalPago(selectedSupplierId!, undefined, cuentaCorrienteData.resumen.saldoPendiente)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <DollarSign size={13} />
                    <span>Registrar Pago / Abono</span>
                  </button>
                </div>

                {/* ── MOVIMIENTOS CON SALDO ACUMULADO ── */}
                <div className="space-y-3">
                  {movs.length === 0 ? (
                    <p className="text-center text-[var(--muted-foreground)] py-8">No hay movimientos registrados para este proveedor.</p>
                  ) : (
                    movs.map((mov: any, idx: number) => {
                      const isEntrega = mov.tipo === 'ENTREGA_MERCANCIA';
                      const isPago = mov.tipo === 'PAGO_PROVEEDOR';
                      const isDevolucion = mov.tipo === 'DEVOLUCION_PROVEEDOR';
                      const canExpand = isEntrega || isDevolucion;
                      const isExpanded = canExpand && (movimientoExpandidoId === mov.id);
                      const lineas = mov.detalles?.lineas || [];
                      const tipoPago = isPago ? clasificacionPagos.get(mov.id) : null;
                      const cruceEntrega = isEntrega ? (crucesPorEntrega.get(mov.id) || 0) : 0;

                      return (
                        <div
                          key={mov.id || idx}
                          className={`p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-xl transition-all shadow-xs ${
                            canExpand ? 'cursor-pointer hover:border-[#0F172A]/40' : ''
                          } ${isExpanded ? 'ring-2 ring-[#0F172A]/10 border-[#0F172A]/30' : ''}`}
                          onClick={() => {
                            if (canExpand) {
                              setMovimientoExpandidoId(isExpanded ? null : mov.id);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {isEntrega ? (
                                <div className="p-2 rounded-xl mt-0.5 bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                              ) : isDevolucion ? (
                                <div className="p-2 rounded-xl mt-0.5 bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                                  {isExpanded ? <ChevronUp size={16} /> : <RotateCcw size={16} />}
                                </div>
                              ) : (
                                <div className="p-2 rounded-xl mt-0.5 bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                  <DollarSign size={16} />
                                </div>
                              )}

                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-xs text-[var(--foreground)]">{mov.titulo}</span>
                                  <span className="font-semibold text-xs text-[var(--muted-foreground)]">
                                    {cuentaCorrienteData.supplier?.razonSocial || cuentaCorrienteData.supplier?.nombre || 'Proveedor'}
                                  </span>
                                  {tipoPago === 'ADELANTO' && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                                      ADELANTO
                                    </span>
                                  )}
                                  {tipoPago === 'ABONO' && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                      ABONO A DEUDA
                                    </span>
                                  )}
                                  {tipoPago === 'MIXTO' && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                                      ABONO + ADELANTO
                                    </span>
                                  )}
                                  {isEntrega && cruceEntrega > 0.01 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                                      CRUZADO: ${cruceEntrega.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[var(--muted-foreground)]">{mov.subtitulo || mov.descripcion}</div>

                                {/* Responsables: Entregado por y Recibido por */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  {/* Entregado por */}
                                  {mov.entregadoPor && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
                                      title={`Entregado por: ${mov.entregadoPor}`}
                                    >
                                      <Truck size={10} className="shrink-0" />
                                      <span>Entregado por: {mov.entregadoPor}</span>
                                    </span>
                                  )}

                                  {/* Recibido por */}
                                  {mov.recibidoPor && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20"
                                      title={`Recibido por: ${mov.recibidoPor}`}
                                    >
                                      <UserCheck size={10} className="shrink-0" />
                                      <span>Recibido por: {mov.recibidoPor}</span>
                                    </span>
                                  )}

                                  {/* Pagado por */}
                                  {isPago && mov.pagadoPor && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                                      title={`Registrado por: ${mov.pagadoPor}`}
                                    >
                                      <User size={10} className="shrink-0" />
                                      <span>Pagado por: {mov.pagadoPor}</span>
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5 mt-1">
                                  <Calendar size={11} />
                                  <span>{new Date(mov.fecha).toLocaleString('es-EC')}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0" onClick={(e) => e.stopPropagation()}>
                              <div
                                className={`text-xs font-black ${
                                  isPago
                                    ? 'text-emerald-600'
                                    : isDevolucion
                                    ? 'text-rose-600'
                                    : 'text-blue-600'
                                }`}
                              >
                                {isPago || isDevolucion ? `− ${Number(mov.monto).toFixed(2)}` : `+ ${Number(mov.monto).toFixed(2)}`}
                              </div>
                              {mov.metodo && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 rounded text-[9px] font-bold border border-emerald-500/20 inline-block mt-0.5">
                                  {mov.metodo}
                                </span>
                              )}
                              {isDevolucion && (
                                <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded text-[9px] font-bold border border-rose-500/20 inline-block mt-0.5">
                                  DEVOLUCIÓN
                                </span>
                              )}

                              {/* Trazabilidad Contable Rigurosa: Saldo Anterior y Nuevo Saldo */}
                              {mov.saldoAnterior !== undefined && (
                                <div className="mt-1.5 pt-1.5 border-t border-[var(--border)]/60 flex flex-col items-end gap-0.5 text-[10px]">
                                  <div className="text-[var(--muted-foreground)]">
                                    Saldo Anterior: <span className="font-semibold text-[var(--foreground)]">${Number(mov.saldoAnterior).toFixed(2)}</span>
                                  </div>
                                  <div className="text-[var(--muted-foreground)]">
                                    Nuevo Saldo: <span className={`font-bold ${Number(mov.nuevoSaldo) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${Number(mov.nuevoSaldo).toFixed(2)}</span>
                                  </div>
                                </div>
                              )}

                              {/* Acciones de WhatsApp */}
                              {isPago && (
                                <div className="flex items-center justify-end gap-1 mt-1.5">
                                  <button
                                    type="button"
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
                                    className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                    title="Enviar Comprobante por WhatsApp"
                                  >
                                    <MessageCircle size={11} />
                                    <span>WhatsApp</span>
                                  </button>
                                </div>
                              )}

                              {isDevolucion && (
                                <div className="flex items-center justify-end gap-1 mt-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleEnviarDevolucionWhatsApp({
                                      id: mov.id,
                                      numeroCodigo: mov.numeroCodigo,
                                      supplierId: selectedSupplierId!,
                                      motivo: mov.descripcion,
                                      totalDevuelto: mov.monto,
                                      deudaDescontada: mov.detalles?.deudaDescontada || mov.monto,
                                      lines: mov.detalles?.lines || [],
                                      createdAt: mov.fecha,
                                      supplier: cuentaCorrienteData.supplier,
                                    })}
                                    className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[9px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                    title="Enviar Constancia por WhatsApp"
                                  >
                                    <MessageCircle size={11} />
                                    <span>WhatsApp</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Desglose Expandible de Artículos Recibidos o Devueltos */}
                          {isExpanded && (
                            <div className="mt-3.5 pt-3 border-t border-[var(--border)] space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-[11px] text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                                  📦 DETALLE DE ARTÍCULOS {isDevolucion ? 'DEVUELTOS' : 'RECIBIDOS'} — {mov.numeroCodigo || mov.titulo}
                                </span>
                                <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">
                                  {lineas.length} {lineas.length === 1 ? 'ítem' : 'ítems'} ({mov.detalles?.totalPares || 0} pares)
                                </span>
                              </div>

                              {lineas.length > 0 ? (
                                <div className="space-y-2">
                                  {(() => {
                                    const grupos: { [key: string]: any[] } = {};
                                    lineas.forEach((l: any) => {
                                      const key = l.productId || l.modelName;
                                      if (!grupos[key]) grupos[key] = [];
                                      grupos[key].push(l);
                                    });

                                    return Object.entries(grupos).map(([key, items]) => {
                                      const item = items[0];
                                      const totalPares = items.reduce((s: number, it: any) => s + (it.cantidad || it.cantidadIngresada || 0), 0);
                                      const subtotalModelo = items.reduce((s: number, it: any) => s + Number(it.subtotal || ((it.cantidad || it.cantidadIngresada || 0) * (it.precioCosto || 0))), 0);

                                      return (
                                        <div
                                          key={key}
                                          className="p-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl flex items-center justify-between gap-3"
                                        >
                                          <div className="flex items-center gap-3">
                                            {item.imageUrl ? (
                                              <img
                                                src={item.imageUrl}
                                                alt=""
                                                className="w-12 h-12 object-cover rounded-lg border border-[var(--border)] shrink-0"
                                              />
                                            ) : (
                                              <div className="w-12 h-12 rounded-lg bg-[var(--muted)] flex items-center justify-center text-base shrink-0">
                                                👟
                                              </div>
                                            )}
                                            <div>
                                              <div className="font-extrabold text-xs text-[var(--foreground)]">
                                                {item.modelName} {item.color ? `(${item.color})` : ''}
                                              </div>
                                              <div className="text-[10px] text-[var(--muted-foreground)] font-medium">
                                                Serie: {item.serieNombre || 'ADULTO'}
                                              </div>
                                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                {items.map((l: any, iIdx: number) => (
                                                  <span
                                                    key={iIdx}
                                                    className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-md text-[10px] font-bold"
                                                  >
                                                    T{l.numeroTalla}: {l.cantidad || l.cantidadIngresada}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="text-right shrink-0">
                                            <span className="text-xs font-black text-emerald-600 block">
                                              {totalPares} {totalPares === 1 ? 'par' : 'pares'}
                                            </span>
                                            <span className="text-[10px] text-[var(--muted-foreground)] font-semibold block">
                                              ${subtotalModelo.toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              ) : (
                                <p className="text-[11px] text-[var(--muted-foreground)] italic text-center py-2">
                                  No hay detalle de artículos registrado para este movimiento.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })() : null}

            {/* Pinned Footer */}
            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowCuentaModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: REGISTRAR PAGO A PROVEEDOR
         ══════════════════════════════════════════ */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowPaymentModal(false), isDirtyPayment()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowPaymentModal(false), isDirtyPayment()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-md h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">Registrar Pago a Proveedor</h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">Abono o liquidación de compra con comprobante</p>
                </div>
              </div>

              {/* Botón Cerrar (X) Anclado en la Esquina Superior Derecha */}
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarPago} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Proveedor / Fabricante Receptor *
                </label>
                <select
                  value={paymentSupplierId}
                  onChange={(e) => setPaymentSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Seleccionar Proveedor --</option>
                  {proveedores.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.razonSocial || pr.nombre} (RUC: {pr.ruc}) {pr.saldoPendiente && pr.saldoPendiente > 0 ? `• Debe $${pr.saldoPendiente.toFixed(2)}` : '• Al Día'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Monto a Pagar / Adelantar ($ USD) *
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

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Método de Pago / Anticipo *
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMetodoPago(val);
                    if (val === 'EFECTIVO') {
                      setBancoPago('');
                      setComprobantePago('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="DEPOSITO">Depósito Bancario</option>
                  <option value="EFECTIVO">Efectivo</option>
                  {/* <option value="CHEQUE">Cheque</option> -- Oculto temporalmente para presentación de tesis */}
                </select>
              </div>

              {metodoPago !== 'EFECTIVO' && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                      Banco Emisor {metodoPago === 'CHEQUE' ? 'del Cheque' : ''}
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Pichincha / Guayaquil"
                      value={bancoPago}
                      onChange={(e) => setBancoPago(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                      N° Comprobante / Referencia
                    </label>
                    <input
                      type="text"
                      placeholder={metodoPago === 'CHEQUE' ? 'Ej. N° Cheque 00482' : 'Ej. TRANS-98234 o Depósito'}
                      value={comprobantePago}
                      onChange={(e) => setComprobantePago(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

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

              </div>

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => safeDismiss(() => setShowPaymentModal(false), isDirtyPayment())}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /><span>Registrando...</span></>
                  ) : (
                    <><CheckCircle size={14} /><span>Confirmar y Descontar Deuda</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: EMITIR NUEVA ORDEN (Borrador con Curva Exacta)
         ══════════════════════════════════════════ */}
      {showOrderModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowOrderModal(false), isDirtyOrder()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowOrderModal(false), isDirtyOrder()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-3xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-amber-400 font-bold shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">Emitir Orden de Compra a Proveedor</h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">Borrador acumulativo con cálculo de curva y numeración</p>
                </div>
              </div>

              {/* Botón Cerrar (X) Anclado en la Esquina Superior Derecha */}
              <button
                onClick={() => setShowOrderModal(false)}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearOrden} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
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

              {/* Observación General Opcional (Toggle compacto para ahorrar espacio) */}
              <div>
                {!mostrarObsGeneralOrden && !orderObservaciones ? (
                  <button
                    type="button"
                    onClick={() => setMostrarObsGeneralOrden(true)}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Agregar observación general de la orden (opcional)</span>
                  </button>
                ) : (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                        Observaciones Generales de la Orden (Opcional)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarObsGeneralOrden(false);
                          setOrderObservaciones('');
                        }}
                        className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                      >
                        Quitar observación
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Ej. Entrega antes del fin de mes, empacar en cajas individuales..."
                      value={orderObservaciones}
                      onChange={(e) => setOrderObservaciones(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>
                )}
              </div>

              {/* Selector de Modelos con Curva Exacta */}
              <div className="p-4 bg-[var(--muted)]/20 rounded-2xl border border-[var(--border)] space-y-3">
                {/* Header con Título a la izquierda y Botones de Series a la derecha */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)]">
                    Modelo / Producto * (Buscar por Nombre o Color)
                  </label>

                  {/* Botones / Píldoras de Series Dinámicas */}
                  {(() => {
                    const seriesUnicas = Array.from(
                      new Set(
                        productos
                          .map((p) => obtenerSerieProducto(p))
                          .filter((s): s is string => Boolean(s && s.length > 0))
                      )
                    ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

                    if (seriesUnicas.length === 0) return null;

                    return (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
                        <span className="text-[10px] font-extrabold text-[var(--muted-foreground)] uppercase tracking-wider mr-0.5 shrink-0">
                          SERIES:
                        </span>
                        {seriesUnicas.map((ser) => {
                          const isActiva = serieFiltroOrden.toLowerCase() === ser.toLowerCase();
                          const count = productos.filter(
                            (p) => obtenerSerieProducto(p).toLowerCase() === ser.toLowerCase()
                          ).length;

                          return (
                            <button
                              key={ser}
                              type="button"
                              onClick={() => {
                                const nueva = isActiva ? 'TODAS' : ser;
                                setSerieFiltroOrden(nueva);
                                setShowDropdownModelo(true);
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                isActiva
                                  ? 'bg-[#0F172A] text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                              title={`Filtrar modelos de serie ${formatearNombreSerie(ser)}`}
                            >
                              <span>{formatearNombreSerie(ser)}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                                isActiva
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

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
                          Marca: {productoSeleccionado.marca} • Cód: {productoSeleccionado.codigo} • Serie: {formatearNombreSerie(obtenerSerieProducto(productoSeleccionado))}
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
                      placeholder={
                        serieFiltroOrden !== 'TODAS'
                          ? `Serie ${serieFiltroOrden} seleccionada: escribe el modelo (ej. Mocasín, Botín)...`
                          : "Escribe para buscar modelo (ej. Mocasín, Botín, Negro)..."
                      }
                      value={busquedaModelo}
                      onChange={(e) => {
                        setBusquedaModelo(e.target.value);
                        setShowDropdownModelo(true);
                      }}
                      onFocus={() => setShowDropdownModelo(true)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                    />

                    {/* Indicador de serie activa cuando no hay texto ingresado */}
                    {serieFiltroOrden !== 'TODAS' && busquedaModelo.trim().length === 0 && showDropdownModelo && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center justify-between mt-1">
                        <span>Serie <strong>{serieFiltroOrden}</strong> activa. Mostrando modelos de esta serie:</span>
                        <button
                          type="button"
                          onClick={() => setSerieFiltroOrden('TODAS')}
                          className="text-[10px] font-bold hover:underline cursor-pointer"
                        >
                          Mostrar todas
                        </button>
                      </div>
                    )}

                    {showDropdownModelo && (busquedaModelo.trim().length > 0 || serieFiltroOrden !== 'TODAS') && (() => {
                      const q = busquedaModelo.toLowerCase().trim();
                      const filtrados = productos
                        .filter((p) => {
                          if (serieFiltroOrden !== 'TODAS') {
                            const serProd = obtenerSerieProducto(p);
                            if (serProd.toLowerCase() !== serieFiltroOrden.toLowerCase()) {
                              return false;
                            }
                          }
                          if (!q) return true;
                          return (
                            (p.nombre && p.nombre.toLowerCase().includes(q)) ||
                            (p.name && p.name.toLowerCase().includes(q)) ||
                            (p.codigo && p.codigo.toLowerCase().includes(q)) ||
                            (p.color && p.color.toLowerCase().includes(q)) ||
                            (p.marca && p.marca.toLowerCase().includes(q)) ||
                            (obtenerSerieProducto(p).toLowerCase().includes(q))
                          );
                        })
                        .sort((a, b) => {
                          const nomA = (a.nombre || a.name || '').toLowerCase();
                          const nomB = (b.nombre || b.name || '').toLowerCase();
                          const cmp = nomA.localeCompare(nomB, 'es', { sensitivity: 'base' });
                          if (cmp !== 0) return cmp;
                          return (a.color || '').localeCompare(b.color || '', 'es', { sensitivity: 'base' });
                        });

                      return (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto">
                          {filtrados.length > 0 ? (
                            filtrados.map((p) => {
                              const serieName = obtenerSerieProducto(p);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setProductoSeleccionado(p);
                                    setPrecioCostoInput(Number(p.precioCosto || p.costPrice || 0));
                                    setShowDropdownModelo(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--muted)] border-b border-[var(--border)] last:border-none flex items-center justify-between cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5">
                                    {obtenerFotoProducto(p) ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={obtenerFotoProducto(p)} alt="" className="w-8 h-8 object-cover rounded" />
                                    ) : (
                                      <div className="w-8 h-8 rounded bg-[var(--muted)] flex items-center justify-center text-sm">👟</div>
                                    )}
                                    <div>
                                      <span className="font-bold block">{p.nombre || p.name}</span>
                                      <span className="text-[10px] text-[var(--muted-foreground)]">
                                        {p.marca} • {p.color} ({p.codigo})
                                        {serieName && ` • Serie: ${formatearNombreSerie(serieName)}`}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="font-mono text-emerald-600 font-bold">${Number(p.precioCosto || p.costPrice || 0).toFixed(2)}</span>
                                </button>
                              );
                            })
                          ) : (
                            <div className="p-4 text-center text-xs text-[var(--muted-foreground)]">
                              No se encontraron modelos {serieFiltroOrden !== 'TODAS' ? `en serie "${serieFiltroOrden}"` : ''} que coincidan con "{busquedaModelo}".
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Configuración de Curva Exacta */}
                {productoSeleccionado && (
                  <div className="p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] space-y-3">
                    <div>
                      <span className="text-xs font-bold text-[var(--foreground)] block mb-1.5">Seleccionar Curva de Serie:</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSubtipoCurva('MEDIA_A')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            subtipoCurva === 'MEDIA_A'
                              ? 'bg-emerald-600 text-white border-transparent shadow-xs font-black'
                              : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]/80'
                          }`}
                        >
                          ½ Media A (6 pares: 38/1, 39/2, 40/1, 41/1, 42/1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtipoCurva('MEDIA_B')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            subtipoCurva === 'MEDIA_B'
                              ? 'bg-emerald-600 text-white border-transparent shadow-xs font-black'
                              : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]/80'
                          }`}
                        >
                          ½ Media B (6 pares: 38/1, 39/1, 40/2, 41/1, 42/1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtipoCurva('DOCENA')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            subtipoCurva === 'DOCENA'
                              ? 'bg-emerald-600 text-white border-transparent shadow-xs font-black'
                              : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]/80'
                          }`}
                        >
                          1 Docena (12 pares: 38/2, 39/3, 40/3, 41/2, 42/2)
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-[var(--foreground)]">
                        {subtipoCurva === 'DOCENA' ? '¿Cuántas docenas?:' : '¿Cuántas medias docenas?:'}
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
                          DISTRIBUCIÓN DE CURVA ({subtipoCurva === 'MEDIA_A' ? 'MEDIA DOCENA A' : subtipoCurva === 'MEDIA_B' ? 'MEDIA DOCENA B' : 'DOCENA COMPLETA'}):
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

                    <div className="space-y-2 pt-2">
                      <div className="w-full">
                        <label className="block text-[10px] font-bold text-[var(--muted-foreground)] mb-1">Precio Costo Unit ($) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={precioCostoInput}
                          onChange={(e) => setPrecioCostoInput(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-[var(--card)] border rounded-lg text-xs font-mono font-bold"
                        />
                      </div>

                      {/* Observación por Modelo Opcional (Toggle compacto para ahorrar espacio) */}
                      <div>
                        {!mostrarObsModeloOrden && !observacionItemInput ? (
                          <button
                            type="button"
                            onClick={() => setMostrarObsModeloOrden(true)}
                            className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>+ Agregar observación a este modelo (opcional)</span>
                          </button>
                        ) : (
                          <div className="space-y-1 animate-in fade-in duration-150">
                            <div className="flex justify-between items-center">
                              <label className="block text-[10px] font-bold text-[var(--muted-foreground)]">
                                Observación Específica del Modelo (Opcional)
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setMostrarObsModeloOrden(false);
                                  setObservacionItemInput('');
                                }}
                                className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                              >
                                Quitar observación
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Ej. Hebilla dorada, cuero charol, suela cocida..."
                              value={observacionItemInput}
                              onChange={(e) => setObservacionItemInput(e.target.value)}
                              className="w-full px-3 py-1.5 bg-[var(--card)] border rounded-lg text-xs"
                            />
                          </div>
                        )}
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
              </div>

              <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--muted)]/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="text-xs w-full sm:w-auto text-center sm:text-left">
                  <span className="text-[var(--muted-foreground)]">Total de la Orden: </span>
                  <span className="font-black text-[#0F172A] dark:text-amber-400 font-mono text-base ml-1">
                    ${orderLines.reduce((sum, l) => sum + (l.cantidadPedida * l.precioCosto), 0).toFixed(2)}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)] ml-2 font-mono">
                    ({orderLines.reduce((sum, l) => sum + l.cantidadPedida, 0)} pares)
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => safeDismiss(() => setShowOrderModal(false), isDirtyOrder())}
                    className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || orderLines.length === 0}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                  >
                    {saving ? 'Guardando...' : 'Guardar Borrador de Orden'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: REGISTRAR NUEVO PROVEEDOR
         ══════════════════════════════════════════ */}
      {showSupplierModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowSupplierModal(false); resetSupplierForm(); }, isDirtySupplier()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowSupplierModal(false); resetSupplierForm(); }, isDirtySupplier()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">Registrar Nuevo Proveedor</h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">Proveedor de calzado o insumos</p>
                </div>
              </div>

              {/* Botón Cerrar (X) Anclado en la Esquina Superior Derecha */}
              <button
                onClick={() => { setShowSupplierModal(false); resetSupplierForm(); }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProveedor} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Sugerencias de Proveedores Existentes en la Empresa (Inter-Sucursal) */}
              {sugerenciasGlobales.length > 0 && (
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/25 rounded-2xl space-y-2.5 animate-in fade-in shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                      <Building2 size={14} className="text-blue-500" /> Proveedor detectado en otra sucursal:
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-500/15 px-2 py-0.5 rounded-full">
                      {sugerenciasGlobales.length} {sugerenciasGlobales.length === 1 ? 'coincidencia' : 'coincidencias'}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {sugerenciasGlobales.slice(0, 3).map((prov) => (
                      <div
                        key={prov.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[var(--card)] p-3 rounded-xl border border-blue-500/20 shadow-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-black text-xs text-[var(--foreground)] truncate flex items-center gap-1.5">
                            <span>{prov.razonSocial || prov.nombre}</span>
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              {prov.sucursalOrigenNombre || 'Matriz'}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-[var(--muted-foreground)] font-mono flex items-center gap-2 mt-0.5">
                            <span>RUC: {prov.ruc || 'Sin RUC'}</span>
                            {prov.contacto && <span>• Tel: {prov.contacto}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => adoptarProveedorGlobal(prov)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Sparkles size={13} className="text-amber-300" />
                          <span>Usar estos datos</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  RUC del Proveedor / Cédula
                </label>
                <input
                  type="text"
                  placeholder="Ej. 1792348574001 (10 o 13 dígitos)"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Nombres del Proveedor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Carlos"
                    value={provNombres}
                    onChange={(e) => setProvNombres(formatearNombres(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Apellidos del Proveedor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pérez Gómez"
                    value={provApellidos}
                    onChange={(e) => setProvApellidos(formatearApellidos(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Nombre Comercial / Proveedor
                </label>
                <input
                  type="text"
                  placeholder="Ej. Calzados Artesanales Cevallos (Dejar vacío si es persona natural)"
                  value={nombreComercial}
                  onChange={(e) => setNombreComercial(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                  Si no se ingresa, se usarán los nombres y apellidos como razón social.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Teléfono / WhatsApp de Contacto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 0998765432"
                  value={contacto}
                  onChange={(e) => setContacto(formatearTelefono(e.target.value))}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="Ej. pedidos@proveedor.com"
                  value={email}
                  onChange={(e) => setEmail(formatearEmail(e.target.value))}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Dirección del Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Parque Industrial / Av. Principal"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  onBlur={() => setDireccion(formatearDireccion(direccion))}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Sección Opcional: Saldo Anterior / Deuda Previa al crear proveedor */}
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
                        ¿Tiene saldo o deuda anterior pendiente con este proveedor?
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
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700 dark:text-amber-400">$</span>
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
                          Concepto / Especificación del Saldo <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Saldo anterior pendiente, Lote de calzado previo..."
                          value={deudaAnteriorConcepto}
                          onChange={(e) => setDeudaAnteriorConcepto(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--card)] border border-amber-500/30 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-600 transition-colors"
                          required={tieneDeudaAnterior}
                        />
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[
                            'Saldo anterior pendiente',
                            'Arrastre de libreta anterior',
                            'Entrega previa sin liquidar',
                            'Cheque / pagaré comercial',
                          ].map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => setDeudaAnteriorConcepto(sug)}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/70 dark:bg-slate-800/80 border border-amber-500/20 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 transition-all cursor-pointer"
                            >
                              + {sug}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                            Fecha Origen
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

                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                          Observación / Respaldo (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Anotación en nota de entrega #104"
                          value={deudaAnteriorNotas}
                          onChange={(e) => setDeudaAnteriorNotas(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--card)] border border-amber-500/30 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-600"
                        />
                      </div>

                      <p className="text-[10px] text-amber-800 dark:text-amber-300/80 leading-tight">
                        💡 Al registrar al proveedor, este saldo se ingresará automáticamente a su <strong>Cuenta Corriente y Cuentas por Pagar</strong> para control y abonos.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              </div>

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowSupplierModal(false); resetSupplierForm(); }}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  {saving ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      <span>Guardando...</span>
                    </div>
                  ) : (
                    <span>Guardar Proveedor</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: EDITAR PROVEEDOR
         ══════════════════════════════════════════ */}
      {showEditSupplierModal && editingSupplier && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setShowEditSupplierModal(false); setEditingSupplier(null); } }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowEditSupplierModal(false); setEditingSupplier(null); } }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-amber-400 font-bold shrink-0">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">Editar Proveedor</h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">Actualizar datos de {editingSupplier.razonSocial || editingSupplier.nombre}</p>
                </div>
              </div>

              <button
                onClick={() => { setShowEditSupplierModal(false); setEditingSupplier(null); }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateProveedor} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  RUC del Proveedor
                </label>
                <input
                  type="text"
                  disabled
                  value={editingSupplier.ruc || ''}
                  className="w-full px-3 py-2 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl text-xs font-mono font-bold text-[var(--muted-foreground)] cursor-not-allowed opacity-60"
                />
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1">El RUC no puede modificarse una vez registrado.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Razón Social / Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Curtiduría & Cueros del Ecuador S.A."
                  value={editRazonSocial}
                  onChange={(e) => setEditRazonSocial(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Teléfono / WhatsApp de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej. 0998765432"
                  value={editContacto}
                  onChange={(e) => setEditContacto(formatearTelefono(e.target.value))}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="Ej. pedidos@proveedor.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(formatearEmail(e.target.value))}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  Dirección del Proveedor
                </label>
                <input
                  type="text"
                  placeholder="Ej. Parque Industrial / Av. Principal"
                  value={editDireccion}
                  onChange={(e) => setEditDireccion(e.target.value)}
                  onBlur={() => setEditDireccion(formatearDireccion(editDireccion))}
                  className="w-full px-3 py-2 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Sección Opcional: Registrar Saldo Anterior / Deuda Adicional al editar proveedor */}
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
                        ¿Deseas ingresar un saldo o deuda anterior pendiente?
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
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700 dark:text-amber-400">$</span>
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
                          Concepto / Especificación del Saldo <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Saldo anterior pendiente, Lote de calzado previo..."
                          value={deudaAnteriorConcepto}
                          onChange={(e) => setDeudaAnteriorConcepto(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--card)] border border-amber-500/30 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-600 transition-colors"
                          required={tieneDeudaAnterior}
                        />
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[
                            'Saldo anterior pendiente',
                            'Arrastre de libreta anterior',
                            'Entrega previa sin liquidar',
                            'Cheque / pagaré comercial',
                          ].map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => setDeudaAnteriorConcepto(sug)}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/70 dark:bg-slate-800/80 border border-amber-500/20 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 transition-all cursor-pointer"
                            >
                              + {sug}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                            Fecha Origen
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

                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                          Observación / Respaldo (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Anotación en nota de entrega #104"
                          value={deudaAnteriorNotas}
                          onChange={(e) => setDeudaAnteriorNotas(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--card)] border border-amber-500/30 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-600"
                        />
                      </div>

                      <p className="text-[10px] text-amber-800 dark:text-amber-300/80 leading-tight">
                        💡 Este saldo se sumará a la <strong>Cuenta Corriente y Cuentas por Pagar</strong> del proveedor para su control y abonos.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              </div>

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowEditSupplierModal(false); setEditingSupplier(null); }}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  {saving ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      <span>Actualizando...</span>
                    </div>
                  ) : (
                    <span>Actualizar Proveedor</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: PREVISUALIZADOR DE PDF DE ORDEN
         ══════════════════════════════════════════ */}
      {showPdfPreviewModal && pdfPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowPdfPreviewModal(false); }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPdfPreviewModal(false); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-5xl h-[92dvh] sm:h-[92vh] max-h-[92dvh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] flex justify-between items-center bg-[#0F172A] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2 tracking-tight truncate">
                    <span>Documento Oficial: {pdfPreviewData?.orden.numero || 'Orden de Compra'}</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-full">
                      Confidencial / Fabricante
                    </span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Proveedor: <strong className="text-white">{pdfPreviewData?.proveedor.nombre}</strong> • Sin datos de clientes en el documento
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                {pdfPreviewData && (
                  <button
                    onClick={async () => {
                      if (pdfPreviewData) await descargarOrdenCompraPdf(pdfPreviewData);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Descargar PDF</span>
                  </button>
                )}
              </div>

              {/* Botón Cerrar (X) Anclado en la Esquina Superior Derecha */}
              <button
                onClick={() => {
                  setShowPdfPreviewModal(false);
                  if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                  setPdfPreviewUrl(null);
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar visor"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 w-full h-full bg-slate-900/5 dark:bg-slate-950/40 p-2">
              <iframe
                src={pdfPreviewUrl}
                title="Vista Previa de Orden de Compra"
                className="w-full h-full rounded-2xl border border-[var(--border)] shadow-inner"
              />
            </div>

            {/* Pinned Footer */}
            <div className="p-3 sm:p-4 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-between gap-2 shrink-0">
              {pdfPreviewData ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (pdfPreviewData) await descargarOrdenCompraPdf(pdfPreviewData);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  <span>Descargar PDF</span>
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => {
                  setShowPdfPreviewModal(false);
                  if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                  setPdfPreviewUrl(null);
                }}
                className="px-5 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: REGISTRAR DEVOLUCIÓN AL PROVEEDOR
         ══════════════════════════════════════════ */}
      {showDevolucionModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowDevolucionModal(false), isDirtyDevolucion()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowDevolucionModal(false), isDirtyDevolucion()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 shrink-0">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2 tracking-tight truncate">
                    <span>Registrar Devolución al Fabricante</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Garantía / Falla
                    </span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Descuenta automáticamente de la deuda del proveedor y genera el comprobante DEV
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDevolucionModal(false)}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarDevolucionProveedor} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Proveedor Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                  Proveedor / Fabricante Receptor *
                </label>
                <select
                  value={devSupplierId}
                  onChange={(e) => setDevSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
                  required
                >
                  <option value="">-- Seleccione un proveedor --</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.razonSocial || p.nombre} (RUC: {p.ruc}) • Deuda Actual: ${Number(p.saldoPendiente || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                  Motivo de la Devolución *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Calzado despegado de fábrica, cuero rasgado en talón, producto con defecto..."
                  value={devMotivo}
                  onChange={(e) => setDevMotivo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
                  required
                />
              </div>

              {/* Trazabilidad: Quién entrega y Quién recibe en el proveedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1">
                    <Truck size={12} className="text-amber-500" />
                    <span>Entregado / Despachado por *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Bodega / Despacho / Chris Paucar"
                    value={devEntregadoPor}
                    onChange={(e) => setDevEntregadoPor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1">
                    <UserCheck size={12} className="text-emerald-500" />
                    <span>Recibido en Proveedor por *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Carmen Rojas / Repartidor / Asesor"
                    value={devRecibidoPor}
                    onChange={(e) => setDevRecibidoPor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Items a Devolver */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Calzado a Devolver ({devLines.length} {devLines.length === 1 ? 'modelo' : 'modelos'})
                  </label>
                  <span className="text-[11px] font-bold text-slate-500">
                    Total: {devLines.reduce((acc, l) => acc + l.cantidad, 0)} pares
                  </span>
                </div>

                {devLines.length === 0 ? (
                  <div className="p-6 border-2 border-dashed border-[var(--border)] rounded-2xl text-center">
                    <ShieldAlert size={28} className="mx-auto text-amber-500 mb-2 opacity-60" />
                    <p className="text-xs font-bold text-[var(--foreground)]">No hay modelos seleccionados para devolución</p>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                      Puede seleccionar ítems directamente desde la pestaña de "Devoluciones & Garantías" o ingresar calzado defectuoso manualmente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {(() => {
                      // Agrupar devLines por modelo para mostrar el componente estándar
                      const gruposMap = new Map<string, {
                        productId: string;
                        modelName: string;
                        color: string;
                        brand: string;
                        serie: string;
                        imageUrl: string;
                        precioCosto: number;
                        tallas: Array<{ tallaId: string; numeroTalla: number | string; cantidad: number; originalIdx: number }>;
                      }>();

                      devLines.forEach((line, idx) => {
                        const key = line.productId || line.modelName || `line-${idx}`;
                        const existing = gruposMap.get(key);
                        if (existing) {
                          existing.tallas.push({
                            tallaId: line.tallaId,
                            numeroTalla: line.numeroTalla,
                            cantidad: line.cantidad,
                            originalIdx: idx,
                          });
                          if (line.precioCosto) existing.precioCosto = line.precioCosto;
                        } else {
                          gruposMap.set(key, {
                            productId: line.productId,
                            modelName: line.modelName || 'Calzado',
                            color: line.color || 'COLOR ESTÁNDAR',
                            brand: line.brand || '',
                            serie: (line as any).serie || 'ADULTO',
                            imageUrl: line.imageUrl || '',
                            precioCosto: Number(line.precioCosto || 10),
                            tallas: [{
                              tallaId: line.tallaId,
                              numeroTalla: line.numeroTalla,
                              cantidad: line.cantidad,
                              originalIdx: idx,
                            }],
                          });
                        }
                      });

                      return Array.from(gruposMap.values()).map((m, mIdx) => {
                        const totalParesModelo = m.tallas.reduce((acc, t) => acc + t.cantidad, 0);
                        const subtotalModelo = totalParesModelo * m.precioCosto;

                        return (
                          <div
                            key={mIdx}
                            className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xs transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                              {/* Imagen Thumbnail */}
                              <div className="w-14 h-14 rounded-2xl bg-[var(--muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                                {m.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={m.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={22} className="text-slate-400" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0 space-y-2">
                                {/* Título y Subtítulo */}
                                <div>
                                  <h4 className="font-extrabold text-sm text-[var(--foreground)] leading-tight uppercase tracking-tight">
                                    {m.modelName}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted-foreground)] mt-0.5">
                                    <span>{m.color}</span>
                                    <span>·</span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                      Serie: {formatearNombreSerie(m.serie)}
                                    </span>
                                  </div>
                                </div>

                                {/* Pills de Tallas con Controles - / + */}
                                <div className="flex flex-wrap gap-2">
                                  {m.tallas.map((t, tIdx) => (
                                    <div
                                      key={tIdx}
                                      className="flex items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 shadow-2xs"
                                    >
                                      <span className="text-[var(--foreground)] font-black text-xs font-mono">
                                        T{t.numeroTalla}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDevLines((prev) =>
                                              prev.map((l, i) =>
                                                i === t.originalIdx ? { ...l, cantidad: Math.max(0, l.cantidad - 1) } : l
                                              )
                                            );
                                          }}
                                          className="w-5 h-5 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded text-xs font-black transition-colors cursor-pointer"
                                          title={`Quitar 1 par T${t.numeroTalla}`}
                                        >
                                          −
                                        </button>
                                        <span className="w-5 text-center text-xs font-bold font-mono text-[var(--foreground)]">
                                          {t.cantidad}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDevLines((prev) =>
                                              prev.map((l, i) =>
                                                i === t.originalIdx ? { ...l, cantidad: l.cantidad + 1 } : l
                                              )
                                            );
                                          }}
                                          className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded text-xs font-black transition-colors cursor-pointer"
                                          title={`Agregar 1 par T${t.numeroTalla}`}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Botones de acción rápida: Media Docena Serie A / B */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curva = getCurvaDocena(m.serie || '', 'MEDIA_A');
                                      const hasCurva = Object.keys(curva).length > 0;
                                      setDevLines((prev) =>
                                        prev.map((l, i) => {
                                          const tMatch = m.tallas.find((t) => t.originalIdx === i);
                                          if (tMatch) {
                                            const qty = hasCurva ? (curva[Number(tMatch.numeroTalla)] || 0) : 0;
                                            return { ...l, cantidad: l.cantidad + qty };
                                          }
                                          return l;
                                        })
                                      );
                                    }}
                                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  >
                                    + ½ Doc A
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curva = getCurvaDocena(m.serie || '', 'MEDIA_B');
                                      const hasCurva = Object.keys(curva).length > 0;
                                      setDevLines((prev) =>
                                        prev.map((l, i) => {
                                          const tMatch = m.tallas.find((t) => t.originalIdx === i);
                                          if (tMatch) {
                                            const qty = hasCurva ? (curva[Number(tMatch.numeroTalla)] || 0) : 0;
                                            return { ...l, cantidad: l.cantidad + qty };
                                          }
                                          return l;
                                        })
                                      );
                                    }}
                                    className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  >
                                    + ½ Doc B
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curva = getCurvaDocena(m.serie || '', 'MEDIA_A');
                                      const hasCurva = Object.keys(curva).length > 0;
                                      setDevLines((prev) =>
                                        prev.map((l, i) => {
                                          const tMatch = m.tallas.find((t) => t.originalIdx === i);
                                          if (tMatch) {
                                            const qty = hasCurva ? (curva[Number(tMatch.numeroTalla)] || 0) : 0;
                                            return { ...l, cantidad: Math.max(0, l.cantidad - qty) };
                                          }
                                          return l;
                                        })
                                      );
                                    }}
                                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  >
                                    − ½ Doc A
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curva = getCurvaDocena(m.serie || '', 'MEDIA_B');
                                      const hasCurva = Object.keys(curva).length > 0;
                                      setDevLines((prev) =>
                                        prev.map((l, i) => {
                                          const tMatch = m.tallas.find((t) => t.originalIdx === i);
                                          if (tMatch) {
                                            const qty = hasCurva ? (curva[Number(tMatch.numeroTalla)] || 0) : 0;
                                            return { ...l, cantidad: Math.max(0, l.cantidad - qty) };
                                          }
                                          return l;
                                        })
                                      );
                                    }}
                                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  >
                                    − ½ Doc B
                                  </button>
                                  <span className="text-[11px] text-[var(--muted-foreground)] font-mono font-medium ml-1">
                                    = {totalParesModelo} pares total
                                  </span>
                                </div>

                                {/* Observación / Nota del modelo */}
                                <div className="pt-0.5 text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                                  <span className="font-semibold text-slate-500 dark:text-slate-400">+ Observación:</span>
                                  <span className="italic">{devMotivo || 'Garantía / Defecto de fábrica'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Derecha: Resumen de pares, precio y subtotal */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                              <div className="text-right">
                                <div className="text-xs font-bold text-[var(--foreground)]">
                                  {totalParesModelo} pares ({getDocenaLabel(totalParesModelo)})
                                </div>
                                <div className="text-[11px] text-[var(--muted-foreground)] font-medium flex items-center justify-end gap-1">
                                  <span>$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={m.precioCosto}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                                      setDevLines((prev) =>
                                        prev.map((l, i) =>
                                          m.tallas.some((t) => t.originalIdx === i) ? { ...l, precioCosto: val } : l
                                        )
                                      );
                                    }}
                                    className="w-14 px-1 py-0.5 text-right font-mono font-bold bg-[var(--muted)] border border-[var(--border)] rounded text-[11px]"
                                    title="Editar costo unitario de devolución"
                                  />
                                  <span>/ par</span>
                                </div>
                                <div className="font-black text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  ${subtotalModelo.toFixed(2)}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setDevLines((prev) => prev.filter((_, i) => !m.tallas.some((t) => t.originalIdx === i)));
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-full transition-colors cursor-pointer"
                                title="Quitar este modelo de la devolución"
                              >
                                <X size={18} className="stroke-[2.5]" />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Impacto Financiero Card */}
              {devLines.length > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                        Descuento Inmediato de Cuenta
                      </h4>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                        Se rebajará del saldo adeudado con el fabricante.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                      -${devLines.reduce((sum, l) => sum + l.cantidad * l.precioCosto, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              </div>

              {/* Botones de acción */}
              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDevolucionModal(false)}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || devLines.length === 0 || !devSupplierId}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Confirmar y Generar Acta DEV</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: INGRESO MANUAL DE CALZADO DEFECTUOSO
         ══════════════════════════════════════════ */}
      {showManualDefectuosoModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowManualDefectuosoModal(false), isDirtyManualDefectuoso()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowManualDefectuosoModal(false), isDirtyManualDefectuoso()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] flex justify-between items-center bg-[#0F172A] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Ingresar Calzado Defectuoso
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Añade calzado con fallas de bodega a la bandeja de devolución a fábrica
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualDefectuosoModal(false)}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarManualDefectuoso} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Buscador de Producto */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                  Buscar Modelo de Calzado *
                </label>
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Escriba el nombre, código o marca del modelo..."
                    value={busquedaManualProd}
                    onChange={(e) => setBusquedaManualProd(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
                  />
                </div>

                {busquedaManualProd.trim().length > 0 && !manualProd && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-[var(--border)] rounded-2xl bg-[var(--card)] shadow-lg divide-y divide-[var(--border)]">
                    {productos
                      .filter(
                        (p) =>
                          p.name?.toLowerCase().includes(busquedaManualProd.toLowerCase()) ||
                          p.nombre?.toLowerCase().includes(busquedaManualProd.toLowerCase()) ||
                          p.code?.toLowerCase().includes(busquedaManualProd.toLowerCase()) ||
                          p.codigo?.toLowerCase().includes(busquedaManualProd.toLowerCase())
                      )
                      .slice(0, 8)
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setManualProd(p);
                            setBusquedaManualProd('');
                            setManualPrecioCosto(Number(p.costPrice || p.precioCosto || 10));
                            const tallasArr = p.tallas || p.stockByTalla || [];
                            if (tallasArr.length > 0) {
                              setManualTallaId(tallasArr[0].id || tallasArr[0].tallaId || '');
                            }
                          }}
                          className="p-2.5 flex items-center justify-between hover:bg-[var(--muted)] cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[var(--muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                              {p.imageUrl || p.fotoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.imageUrl || p.fotoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package size={14} className="text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[var(--foreground)]">{p.name || p.nombre}</p>
                              <p className="text-[10px] text-[var(--muted-foreground)]">
                                {p.brand || p.marca || 'Calzado'} • Código: {p.code || p.codigo}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-600">
                            Costo: ${Number(p.costPrice || p.precioCosto || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Producto Seleccionado Banner */}
              {manualProd && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border overflow-hidden shrink-0">
                      {manualProd.imageUrl || manualProd.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={manualProd.imageUrl || manualProd.fotoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package size={16} className="text-amber-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[var(--foreground)]">{manualProd.name || manualProd.nombre}</h4>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                        {manualProd.brand || manualProd.marca || 'Calzado'} • {manualProd.code || manualProd.codigo}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setManualProd(null);
                      setManualTallaId('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Talla y Cantidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                    Talla del Calzado *
                  </label>
                  <select
                    value={manualTallaId}
                    onChange={(e) => setManualTallaId(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
                    required
                  >
                    <option value="">-- Seleccionar Talla --</option>
                    {manualProd && (manualProd.tallas || manualProd.stockByTalla || []).map((t: any) => (
                      <option key={t.id || t.tallaId} value={t.id || t.tallaId}>
                        Talla {t.numero || t.sizeNumber || t.talla || t.nombre} (Stock: {t.stock ?? 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                    Cantidad (Pares) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={manualCantidad}
                    onChange={(e) => setManualCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Precio Costo y Motivo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                    Costo Unit. ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={manualPrecioCosto}
                    onChange={(e) => setManualPrecioCosto(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                    Detalle del Defecto / Falla *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Suela despegada, costura rota..."
                    value={manualMotivo}
                    onChange={(e) => setManualMotivo(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              </div>

              {/* Botones de acción */}
              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowManualDefectuosoModal(false)}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !manualProd || !manualTallaId}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Ingresar a Bandeja</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: CONSTANCIA DE DEVOLUCIÓN A PROVEEDOR
         ══════════════════════════════════════════ */}
      {showConstanciaModal && selectedConstancia && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowConstanciaModal(false); }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowConstanciaModal(false); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] flex justify-between items-center bg-[#0F172A] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 shrink-0">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2 tracking-tight truncate">
                    <span>Constancia #{selectedConstancia.numeroCodigo || 'DEV-0001'}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Liquidada
                    </span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Proveedor: {selectedConstancia.supplier?.razonSocial || selectedConstancia.supplier?.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConstanciaModal(false)}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
              {/* Metadatos */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[var(--muted)]/40 rounded-2xl border border-[var(--border)] text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase block">Fecha de Emisión</span>
                  <span className="font-bold text-[var(--foreground)]">
                    {new Date(selectedConstancia.createdAt).toLocaleDateString('es-EC', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase block">RUC Proveedor</span>
                  <span className="font-bold text-[var(--foreground)] font-mono">
                    {selectedConstancia.supplier?.ruc || 'No especificado'}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-[var(--border)]">
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase block">Motivo</span>
                  <span className="font-medium text-[var(--foreground)]">{selectedConstancia.motivo}</span>
                </div>
              </div>

              {/* Detalle de Modelos */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
                  Modelos de Calzado Devueltos
                </span>
                <div className="border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                  {(selectedConstancia.lines || []).map((l: any, i: number) => (
                    <div key={i} className="p-3 flex items-center justify-between bg-[var(--card)]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[var(--muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                          {l.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={l.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package size={15} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--foreground)]">{l.modelName || 'Calzado'}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            Talla: <strong className="text-[var(--foreground)]">{l.numeroTalla}</strong> • {l.cantidad} par(es) × ${Number(l.precioCosto || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-black text-xs text-rose-600 dark:text-rose-400">
                        ${Number(l.subtotal || l.cantidad * l.precioCosto || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase block tracking-wider">
                    Total Descontado de la Deuda
                  </span>
                  <span className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                    Total: {selectedConstancia.totalPares || (selectedConstancia.lines || []).reduce((acc: number, l: any) => acc + l.cantidad, 0)} pares
                  </span>
                </div>
                <span className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                  -${Number(selectedConstancia.totalDevuelto || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3 bg-[var(--muted)]/20 shrink-0">
              <button
                type="button"
                onClick={() => handleEnviarDevolucionWhatsApp(selectedConstancia)}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <MessageCircle size={14} />
                <span>Notificar por WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConstanciaModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer text-center"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL CONSOLIDACIÓN DE DEMANDA DE CLIENTES (FASE 5.2)
         ══════════════════════════════════════════ */}
      {showConsolidarDemandaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--muted)]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[var(--foreground)]">
                    Consolidación de Demanda para Órdenes de Compra
                  </h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Agrupación automática de calzado faltante de pedidos de clientes en espera de stock.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConsolidarDemandaModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {loadingDemanda ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)] space-y-2">
                  <Loader2 className="animate-spin text-emerald-600" size={32} />
                  <span className="text-xs">Analizando pedidos de clientes y stock en bodega...</span>
                </div>
              ) : !demandaPendienteData || !demandaPendienteData.items || demandaPendienteData.items.length === 0 ? (
                <div className="text-center py-12 space-y-2 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl p-6">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                  <h4 className="font-bold text-sm text-[var(--foreground)]">
                    No hay déficit de stock en pedidos pendientes
                  </h4>
                  <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto">
                    Todos los pedidos de clientes cuentan con inventario suficiente o ya se encuentran completados.
                  </p>
                </div>
              ) : (
                <>
                  {/* Selector de Proveedor Destinatario */}
                  <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[var(--foreground)] block mb-1">
                        Proveedor Fabricante Destinatario:
                      </label>
                      <select
                        value={proveedorConsolidarId}
                        onChange={(e) => setProveedorConsolidarId(e.target.value)}
                        className="px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Seleccionar Proveedor --</option>
                        {proveedores.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.razonSocial || p.nombre} {p.contacto ? `(${p.contacto})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-[var(--muted-foreground)]">
                      <div>
                        Total Modelos: <strong className="text-[var(--foreground)]">{demandaPendienteData.totalModelos}</strong>
                      </div>
                      <div>
                        Pares Requeridos: <strong className="text-emerald-600 text-sm font-black">{demandaPendienteData.totalParesFaltantes}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Modelos Faltantes (Rule 7 ModelTallaCurvaCard) */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">
                      Modelos con Pedidos de Clientes en Espera de Mercancía:
                    </div>

                    {demandaPendienteData.items.map((item: any) => {
                      const isSelected = Boolean(modelosSeleccionadosConsolidar[item.productId]);
                      const cantPedir = cantidadesConsolidadasMap[item.productId] ?? item.totalParesFaltantes;
                      const subtotal = cantPedir * (item.costPrice || 15);

                      return (
                        <div
                          key={item.productId}
                          className={`p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-[var(--card)] border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/20'
                              : 'bg-[var(--muted)]/20 border-[var(--border)] opacity-60'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Checkbox y Miniatura + Info */}
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  setModelosSeleccionadosConsolidar((prev) => ({
                                    ...prev,
                                    [item.productId]: e.target.checked,
                                  }))
                                }
                                className="mt-2.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />

                              <div className="w-12 h-12 rounded-xl border border-[var(--border)] bg-[var(--muted)] overflow-hidden shrink-0 flex items-center justify-center">
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={20} className="text-[var(--muted-foreground)]" />
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black uppercase text-xs text-[var(--foreground)]">
                                    {item.modelName}
                                  </h4>
                                  <span className="text-[10px] font-bold text-[var(--muted-foreground)]">
                                    • {item.color}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    Serie: {item.serieNombre}
                                  </span>
                                </div>

                                {/* Desglose de Curva y Tallas faltantes */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  {item.tallas.map((t: any) => (
                                    <span
                                      key={t.tallaId}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--muted)] border border-[var(--border)] text-[10px] font-mono"
                                    >
                                      <strong className="text-[var(--foreground)]">T{t.tallaNumero}:</strong>
                                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                                        {t.paresFaltantes}p
                                      </span>
                                    </span>
                                  ))}
                                </div>

                                <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5 pt-0.5">
                                  <span>Proveedor sugerido: <strong>{item.supplierName}</strong></span>
                                  <span>•</span>
                                  <span>{item.pedidosAfectados?.length || 0} pedido(s) de clientes</span>
                                </div>
                              </div>
                            </div>

                            {/* Control de Pares a Pedir y Subtotal (Rule 7 Resumen Derecho) */}
                            <div className="flex items-center gap-5 justify-end pl-8 md:pl-0">
                              <div className="text-right">
                                <label className="text-[10px] font-bold text-[var(--muted-foreground)] block">
                                  Pares a Pedir
                                </label>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCantidadesConsolidadasMap((prev) => ({
                                        ...prev,
                                        [item.productId]: Math.max(1, (prev[item.productId] ?? item.totalParesFaltantes) - 6),
                                      }))
                                    }
                                    className="w-6 h-6 rounded bg-[var(--muted)] hover:bg-[var(--border)] text-xs font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    -6
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={cantPedir}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setCantidadesConsolidadasMap((prev) => ({
                                        ...prev,
                                        [item.productId]: val,
                                      }));
                                    }}
                                    className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-[var(--card)] border border-[var(--border)] rounded-md"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCantidadesConsolidadasMap((prev) => ({
                                        ...prev,
                                        [item.productId]: (prev[item.productId] ?? item.totalParesFaltantes) + 6,
                                      }))
                                    }
                                    className="w-6 h-6 rounded bg-[var(--muted)] hover:bg-[var(--border)] text-xs font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    +6
                                  </button>
                                </div>
                                <span className="text-[9px] text-[var(--muted-foreground)] block mt-0.5">
                                  {(cantPedir / 12).toFixed(1)} Docenas
                                </span>
                              </div>

                              <div className="text-right min-w-[90px]">
                                <span className="text-[10px] text-[var(--muted-foreground)] block">
                                  ${(item.costPrice || 15).toFixed(2)} / par
                                </span>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                                  ${subtotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Observaciones generales */}
                  <div>
                    <label className="text-[11px] font-bold text-[var(--foreground)] block mb-1">
                      Observaciones o Instrucciones de Fabricación:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Prioridad para entrega urgente fin de semana..."
                      value={observacionesConsolidar}
                      onChange={(e) => setObservacionesConsolidar(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {demandaPendienteData && demandaPendienteData.items && demandaPendienteData.items.length > 0 && (
              <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--muted)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {(() => {
                  const seleccionados = demandaPendienteData.items.filter(
                    (it: any) => modelosSeleccionadosConsolidar[it.productId]
                  );
                  const totalPares = seleccionados.reduce(
                    (acc: number, it: any) => acc + (cantidadesConsolidadasMap[it.productId] ?? it.totalParesFaltantes),
                    0
                  );
                  const totalMonto = seleccionados.reduce(
                    (acc: number, it: any) =>
                      acc +
                      (cantidadesConsolidadasMap[it.productId] ?? it.totalParesFaltantes) * (it.costPrice || 15),
                    0
                  );

                  return (
                    <>
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span>
                          Modelos: <strong>{seleccionados.length}</strong>
                        </span>
                        <span>
                          Pares: <strong className="text-emerald-600 text-sm font-black">{totalPares}</strong> ({ (totalPares / 12).toFixed(1) } Doc.)
                        </span>
                        <span>
                          Costo Est.: <strong className="text-emerald-600 font-mono text-sm font-black">${totalMonto.toFixed(2)}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowConsolidarDemandaModal(false)}
                          className="px-4 py-2 border border-[var(--border)] text-xs font-semibold rounded-xl hover:bg-[var(--muted)] transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={generandoOCConsolidada || seleccionados.length === 0 || !proveedorConsolidarId}
                          onClick={handleGenerarOCConsolidada}
                          className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                          {generandoOCConsolidada ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>Generando Orden...</span>
                            </>
                          ) : (
                            <>
                              <Package size={14} />
                              <span>Generar Orden de Compra Consolidada</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación UI (Reemplaza confirm nativo) */}
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

      {/* Modal de confirmación de descarte de cambios */}
      <UnsavedChangesModal
        isOpen={showDiscardModal}
        targetSectionName="Proveedores"
        detail={{ hasChanges: true, sectionName: "este formulario de Proveedores" }}
        onStay={() => {
          setShowDiscardModal(false);
          pendingCloseRef.current = null;
        }}
        onDiscardAndLeave={() => {
          setShowDiscardModal(false);
          if (pendingCloseRef.current) {
            pendingCloseRef.current();
            pendingCloseRef.current = null;
          }
        }}
      />
    </div>
  );
}
