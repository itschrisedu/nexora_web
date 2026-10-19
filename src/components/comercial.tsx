"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { ApiService } from '../services/api.service';
import { db } from '../db/local-db';
import { SyncService } from '../services/sync.service';
import UnsavedChangesModal from './ui/unsaved-changes-modal';
import {
  Package,
  PackageCheck,
  Plus,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Truck,
  ArrowUpDown,
  X,
  Lock,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ShoppingBag,
  AlertCircle,
  User,
  Building,
  FileText,
  Edit3,
  Eye,
  Download,
  CreditCard,
  DollarSign,
  Layers,
  UserPlus,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Search,
  RotateCcw,
} from 'lucide-react';

import { useToast } from './ui/toast';
import { getClienteReputacion } from '../utils/cliente-reputacion';
import { generarUrlPublicaPedidoCliente } from '../services/comprobante-url.service';
import { descargarPedidoClientePdf, PedidoClientePdfData } from '../services/pdf-factura.service';
import { getCurvaDocena, calcularCurvaParaTallas, detectarMejorCurvaSegunStock, evaluarDisponibilidadMedias } from '../utils/curvas';
import { capitalizarNombreCompleto, formatearNombreSerie } from '@/utils/text-formatters';
import { abrirWhatsAppUniversal } from '../utils/whatsapp';
import ImageLightboxModal from './ui/image-lightbox-modal';
import NuevoClienteModal from './ui/nuevo-cliente-modal';

interface ComercialProps {
  online: boolean;
  userRole?: string;
  userPermissions?: { permiteCambiarPrecio?: boolean; rol?: string };
  activeSucursalId?: string;
  sucursales?: { id: string; name: string; isMatriz: boolean }[];
  initialPedidoId?: string | null;
  onClearInitialPedido?: () => void;
}

type EstadoPedido = 'PENDIENTE' | 'EN_PREPARACION' | 'EN_ESPERA_STOCK' | 'ENTREGADO' | 'ENTREGADO_PARCIAL' | 'CANCELADO';

interface Pedido {
  id: string;
  numero?: number;
  numeroCodigo?: string;
  clientId: string;
  clienteNombre?: string;
  vendedorNombre?: string;
  sucursalNombre?: string;
  montoTotal: number;
  estado: EstadoPedido;
  tipoPago: string;
  adelanto?: number;
  metodoAdelanto?: string;
  referenciaAdelanto?: string;
  tipoEntrega?: 'PRESENCIAL' | 'ENVIO';
  asumeFlete?: 'NO_APLICA' | 'CLIENTE' | 'EMPRESA';
  costoEnvio?: number;
  guiaEnvio?: string;
  courier?: string;
  direccionEnvio?: string;
  ciudadEnvio?: string;
  createdAt: string;
  prioridadScore?: number;
  lines?: any[];
}

interface GrupoModeloResumen {
  key: string;
  modelName: string;
  color: string;
  imageUrl?: string | null;
  serieNombre?: string;
  totalPares: number;
  totalEntregados: number;
  precioUnitario: number;
  subtotal: number;
  tipoVenta?: string;
  etiquetaVolumen: string;
  tallas: { numero: string | number; cantidad: number; cantidadEntregada: number }[];
}

function agruparLineasPorModelo(lines: any[]): GrupoModeloResumen[] {
  if (!lines || lines.length === 0) return [];
  const map = new Map<string, GrupoModeloResumen>();

  lines.forEach((l) => {
    const model = l.modelName || l.nombre || 'Calzado de Cuero';
    const color = l.color || '';
    const serieName = l.serieNombre || l.serie || '';
    const key = `${model.toLowerCase()}_${color.toLowerCase()}_${l.productId || ''}_${serieName.toLowerCase()}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        modelName: model,
        color,
        imageUrl: l.imageUrl || null,
        serieNombre: serieName,
        totalPares: 0,
        totalEntregados: 0,
        precioUnitario: Number(l.precioUnitario) || 0,
        subtotal: 0,
        tipoVenta: l.tipoVenta,
        etiquetaVolumen: '',
        tallas: [],
      });
    }

    const g = map.get(key)!;
    const cant = Number(l.cantidad) || 1;
    const cantEntregada = Number(l.cantidadEntregada) || 0;
    const numTalla = l.numeroTalla || l.tallaNumero || l.talla || '38';

    g.totalPares += cant;
    g.totalEntregados += cantEntregada;
    g.subtotal += Number(l.subtotal ?? (cant * g.precioUnitario));

    const existingTalla = g.tallas.find((t) => String(t.numero) === String(numTalla));
    if (existingTalla) {
      existingTalla.cantidad += cant;
      existingTalla.cantidadEntregada += cantEntregada;
    } else {
      g.tallas.push({ numero: numTalla, cantidad: cant, cantidadEntregada: cantEntregada });
    }
  });

  return Array.from(map.values()).map((g) => {
    g.tallas.sort((a, b) => Number(a.numero) - Number(b.numero));

    if (g.totalPares >= 12 && g.totalPares % 12 === 0) {
      const doc = g.totalPares / 12;
      g.etiquetaVolumen = doc === 1 ? '1 Docena (12 pares)' : `${doc} Docenas (${g.totalPares} pares)`;
    } else if (g.totalPares === 6) {
      g.etiquetaVolumen = 'Media Docena (6 pares)';
    } else if (g.totalPares >= 6 && g.totalPares % 6 === 0) {
      const med = g.totalPares / 6;
      g.etiquetaVolumen = `${med * 0.5} Docenas (${g.totalPares} pares)`;
    } else {
      g.etiquetaVolumen = `${g.totalPares} ${g.totalPares === 1 ? 'par' : 'pares'}`;
    }

    return g;
  });
}

const ESTADO_CONFIG: Record<EstadoPedido, { label: string; color: string; icon: React.ReactNode }> = {
  PENDIENTE:         { label: 'Pendiente',          color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',        icon: <Clock size={12} /> },
  EN_PREPARACION:    { label: 'En Preparación',     color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',           icon: <Package size={12} /> },
  EN_ESPERA_STOCK:   { label: 'Pendiente por Pedir', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',     icon: <Clock size={12} /> },
  ENTREGADO_PARCIAL: { label: 'Entrega Parcial',     color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',           icon: <Package size={12} /> },
  ENTREGADO:         { label: 'Entregado',          color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',  icon: <CheckCircle size={12} /> },
  CANCELADO:         { label: 'Anulado',            color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',           icon: <XCircle size={12} /> },
};

export default function ComercialComponent({
  online,
  userRole,
  userPermissions,
  activeSucursalId,
  sucursales,
  initialPedidoId,
  onClearInitialPedido,
}: ComercialProps) {
  const { showToast } = useToast();
  const puedeCambiarPrecio = userRole === 'ROL_ADMIN' || userPermissions?.permiteCambiarPrecio === true;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | 'TODOS'>('TODOS');
  const [selectedSucursalPedidoId, setSelectedSucursalPedidoId] = useState<string>(() => {
    if (activeSucursalId && activeSucursalId !== 'TODAS') return activeSucursalId;
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u?.tenantId || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [selectedOrderSucursalId, setSelectedOrderSucursalId] = useState<string>('');
  const [pedidoExpandidoId, setPedidoExpandidoId] = useState<string | null>(null);

  // Auto-expandir y enfocar el pedido solicitado desde Cobros y Cartera o Notificaciones
  useEffect(() => {
    const targetId =
      initialPedidoId ||
      (typeof window !== 'undefined' ? localStorage.getItem('comercial_selected_pedido_id') : null);
    if (!targetId || pedidos.length === 0) return;

    const pedidoEncontrado = pedidos.find(
      (p) => p.id === targetId || p.numeroCodigo === targetId || String(p.numero) === targetId,
    );
    if (pedidoEncontrado) {
      setPedidoExpandidoId(pedidoEncontrado.id);
      setFiltroEstado('TODOS');
      try {
        localStorage.removeItem('comercial_selected_pedido_id');
      } catch (e) {}
      if (onClearInitialPedido) {
        onClearInitialPedido();
      }
      setTimeout(() => {
        const el = document.getElementById(`pedido-row-${pedidoEncontrado.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [initialPedidoId, pedidos, onClearInitialPedido]);

  // Formulario nuevo pedido
  const [clientId, setClientId] = useState('');
  const [tipoPago, setTipoPago] = useState('CONTADO');
  const [errorMsg, setErrorMsg] = useState('');
  const [savingOffline, setSavingOffline] = useState(false);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderNumero, setEditingOrderNumero] = useState<string>('');

  // Búsqueda de clientes con Debounce de 3 segundos
  const [listaClientes, setListaClientes] = useState<any[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [esperandoDebounce, setEsperandoDebounce] = useState(false);
  const [showDropdownCliente, setShowDropdownCliente] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);

  // Alerta de pedido duplicado por cliente (Fase 2B)
  const [alertaPedidoDuplicado, setAlertaPedidoDuplicado] = useState<{
    cliente: any;
    pedidoExistente: Pedido;
  } | null>(null);
  const [ignoroAlertaDuplicado, setIgnoroAlertaDuplicado] = useState(false);

  const verificarPedidoActivoCliente = useCallback((clienteObj: any) => {
    if (!clienteObj || !clienteObj.id) {
      setAlertaPedidoDuplicado(null);
      setIgnoroAlertaDuplicado(false);
      return;
    }
    const pedidoActivo = pedidos.find(
      (p) =>
        p.clientId === clienteObj.id &&
        ['PENDIENTE', 'EN_PREPARACION', 'EN_ESPERA_STOCK', 'EN_TRANSITO'].includes(p.estado) &&
        (!editingOrderId || p.id !== editingOrderId)
    );

    if (pedidoActivo) {
      setAlertaPedidoDuplicado({
        cliente: clienteObj,
        pedidoExistente: pedidoActivo,
      });
      setIgnoroAlertaDuplicado(false);
    } else {
      setAlertaPedidoDuplicado(null);
      setIgnoroAlertaDuplicado(false);
    }
  }, [pedidos, editingOrderId]);

  const handleClienteCreadoRapido = (nuevoCliente: any) => {
    setListaClientes((prev) => [nuevoCliente, ...prev.filter((c) => c.id !== nuevoCliente.id)]);
    setClientId(nuevoCliente.id);
    setClienteSeleccionado(nuevoCliente);
    setBusquedaCliente('');
    setBusquedaDebounced('');
    setShowDropdownCliente(false);
    verificarPedidoActivoCliente(nuevoCliente);
    // Cliente recién creado → SIN_CREDITO → forzar CONTADO
    setTipoPago('CONTADO');
    showToast(`¡Cliente ${nuevoCliente.nombre} registrado y seleccionado para el pedido!`, 'success');
    loadListaClientes();
  };

  // Catálogo de Productos y Líneas de Pedido
  const [catalogoProductos, setCatalogoProductos] = useState<any[]>([]);
  const [lineasPedido, setLineasPedido] = useState<
    {
      productId: string;
      modelName: string;
      color: string;
      serieNombre?: string;
      imageUrl?: string;
      tallaId: string;
      numeroTalla: number;
      cantidad: number;
      precioUnitario: number;
      tipoVenta: 'SERIE_COMPLETA' | 'TALLA_ESPECIFICA' | 'SERIE_ESPECIAL';
      esPedidoEspecial?: boolean;
      subtipoSerie?: 'MEDIA_DOCENA' | 'DOCENA';
      cantidadSeries?: number;
      observacionModelo?: string;
    }[]
  >([]);

  // Selección de Producto actual para agregar
  const [selectedProductId, setSelectedProductId] = useState('');
  const [precioItem, setPrecioItem] = useState(0);
  const [precioItemInput, setPrecioItemInput] = useState('');
  const [tipoVentaItem, setTipoVentaItem] = useState<'SERIE_COMPLETA' | 'TALLA_ESPECIFICA' | 'SERIE_ESPECIAL'>('SERIE_COMPLETA');
  const [subtipoSerie, setSubtipoSerie] = useState<'MEDIA_DOCENA' | 'DOCENA'>('MEDIA_DOCENA');
  const [cantidadSeries, setCantidadSeries] = useState(1);
  const [tallaCantidadesMap, setTallaCantidadesMap] = useState<Record<string, number>>({});
  const [observacionModeloActual, setObservacionModeloActual] = useState('');
  const [mostrarObsModeloActual, setMostrarObsModeloActual] = useState(false);

  // Series Disponibles para Pedidos Especiales
  const [listaSeriesDisponibles, setListaSeriesDisponibles] = useState<any[]>([]);
  const [serieEspecialId, setSerieEspecialId] = useState<string>('');

  // Modal para Generar Orden a Proveedor desde Pedido Especial
  const [showSupplierOrderModal, setShowSupplierOrderModal] = useState(false);
  const [supplierOrderProductData, setSupplierOrderProductData] = useState<any>(null);
  const [supplierOrderModalType, setSupplierOrderModalType] = useState<'SERIE_COMPLETA' | 'NUMERACION'>('SERIE_COMPLETA');
  const [supplierOrderSubtipoSerie, setSupplierOrderSubtipoSerie] = useState<'MEDIA_A' | 'MEDIA_B' | 'DOCENA'>('MEDIA_A');
  const [supplierOrderCantSeries, setSupplierOrderCantSeries] = useState(1);
  const [supplierOrderTallasMap, setSupplierOrderTallasMap] = useState<Record<string, number>>({});
  const [supplierOrderObservaciones, setSupplierOrderObservaciones] = useState('');
  const [listaProveedores, setListaProveedores] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierOrderCost, setSupplierOrderCost] = useState('15.00');
  const [savingSupplierOrder, setSavingSupplierOrder] = useState(false);

  const [canalEntrada, setCanalEntrada] = useState<'VENTA_DIRECTA' | 'POS' | 'CATALOGO_DIGITAL'>('VENTA_DIRECTA');
  const [metodoPagoContado, setMetodoPagoContado] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO' | 'CHEQUE'>('EFECTIVO');
  const [referenciaComprobante, setReferenciaComprobante] = useState('');
  const [notasPedido, setNotasPedido] = useState('');
  const [mostrarObservacionGeneral, setMostrarObservacionGeneral] = useState(false);

  // ── Anticipos / Adelantos de Dinero ──
  const [registraAdelanto, setRegistraAdelanto] = useState(false);
  const [adelantoInput, setAdelantoInput] = useState('');
  const [metodoAdelanto, setMetodoAdelanto] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO' | 'CHEQUE'>('EFECTIVO');
  const [referenciaAdelanto, setReferenciaAdelanto] = useState('');

  // ── Logística de Entrega (Fase E1) ──
  const [tipoEntrega, setTipoEntrega] = useState<'PRESENCIAL' | 'ENVIO'>('PRESENCIAL');
  const [asumeFlete, setAsumeFlete] = useState<'CLIENTE' | 'EMPRESA'>('CLIENTE');
  const [costoEnvio, setCostoEnvio] = useState('5.00');
  const [guiaEnvio, setGuiaEnvio] = useState('');
  const [courier, setCourier] = useState('Transporte Los Andes');
  const [direccionEnvio, setDireccionEnvio] = useState('');
  const [ciudadEnvio, setCiudadEnvio] = useState('');

  // Empresas de Transporte dinámicas
  const [listaTransportes, setListaTransportes] = useState<any[]>([]);
  const [showNuevoTransporteModal, setShowNuevoTransporteModal] = useState(false);
  const [nuevoTransporteNombre, setNuevoTransporteNombre] = useState('');
  const [guardandoTransporte, setGuardandoTransporte] = useState(false);

  // Modal independiente de Gestión de Envío de Pedido
  const [showModalEnvio, setShowModalEnvio] = useState(false);
  const [pedidoEnvioSeleccionado, setPedidoEnvioSeleccionado] = useState<Pedido | null>(null);
  const [envioModalTipoEntrega, setEnvioModalTipoEntrega] = useState<'PRESENCIAL' | 'ENVIO'>('PRESENCIAL');
  const [envioModalAsumeFlete, setEnvioModalAsumeFlete] = useState<'CLIENTE' | 'EMPRESA'>('CLIENTE');
  const [envioModalCostoEnvio, setEnvioModalCostoEnvio] = useState('5.00');
  const [envioModalGuiaEnvio, setEnvioModalGuiaEnvio] = useState('');
  const [envioModalCourier, setEnvioModalCourier] = useState('Transporte Los Andes');
  const [envioModalDireccionEnvio, setEnvioModalDireccionEnvio] = useState('');
  const [envioModalCiudadEnvio, setEnvioModalCiudadEnvio] = useState('');
  const [savingEnvioModal, setSavingEnvioModal] = useState(false);

  // ── Modal independiente de Gestión Rápida de Adelanto / Anticipo ──
  const [showModalAdelanto, setShowModalAdelanto] = useState(false);
  const [pedidoAdelantoSeleccionado, setPedidoAdelantoSeleccionado] = useState<Pedido | null>(null);
  const [modalAdelantoMonto, setModalAdelantoMonto] = useState('');
  const [modalAdelantoMetodo, setModalAdelantoMetodo] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO' | 'CHEQUE'>('EFECTIVO');
  const [modalAdelantoRef, setModalAdelantoRef] = useState('');
  const [savingAdelantoModal, setSavingAdelantoModal] = useState(false);

  const [creatingOrder, setCreatingOrder] = useState(false);

  // ── Modal de Entrega Parcial / Total de Pedido ──
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [pedidoEntregaSeleccionado, setPedidoEntregaSeleccionado] = useState<Pedido | null>(null);
  const [entregaItemsMap, setEntregaItemsMap] = useState<Record<string, number>>({});
  const [entregaPreciosMap, setEntregaPreciosMap] = useState<Record<string, string>>({});
  const [entregaSustitutasMap, setEntregaSustitutasMap] = useState<Record<string, string>>({});
  const [mostrarAlertasInsuficientes, setMostrarAlertasInsuficientes] = useState(false);
  const [entregaProductosStockMap, setEntregaProductosStockMap] = useState<Record<string, any>>({});
  const [procesandoEntrega, setProcesandoEntrega] = useState(false);

  // ── Modal de Reversión / Corrección de Entrega Errónea (Fase 2) ──
  const [showRevertirEntregaModal, setShowRevertirEntregaModal] = useState(false);
  const [pedidoRevertirSeleccionado, setPedidoRevertirSeleccionado] = useState<Pedido | null>(null);
  const [revertirItemsMap, setRevertirItemsMap] = useState<Record<string, number>>({});
  const [motivoReversion, setMotivoReversion] = useState('');
  const [procesandoReversion, setProcesandoReversion] = useState(false);
  const [confirmandoReversionPaso, setConfirmandoReversionPaso] = useState(false);
  const [editingObservacionProductId, setEditingObservacionProductId] = useState<string | null>(null);
  const [tempObservacionText, setTempObservacionText] = useState('');

    // ── Modal de Corrección de Precio Post-Venta / Post-Entrega ──
  const [showCorregirPrecioModal, setShowCorregirPrecioModal] = useState(false);
  const [pedidoACorregir, setPedidoACorregir] = useState<Pedido | null>(null);
  const [preciosCorregirMap, setPreciosCorregirMap] = useState<Record<string, string>>({});
  const [guardandoCorreccionPrecio, setGuardandoCorreccionPrecio] = useState(false);

  // ── Modal de Devolución de Calzado por Cliente (Fase 3) ──
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [pedidoDevolucionSeleccionado, setPedidoDevolucionSeleccionado] = useState<Pedido | null>(null);
  const [devolucionItemsMap, setDevolucionItemsMap] = useState<Record<string, number>>({});
  const [devolucionDestinoStock, setDevolucionDestinoStock] = useState<'REINGRESO_INVENTARIO' | 'BAJA_POR_FALLA'>('REINGRESO_INVENTARIO');
  const [devolucionMotivo, setDevolucionMotivo] = useState('Defecto de fábrica / Garantía');
  const [devolucionObservacion, setDevolucionObservacion] = useState('');
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false);
  const [confirmandoDevolucionPaso, setConfirmandoDevolucionPaso] = useState(false);

  // Visor Lightbox de Foto de Calzado
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);

  // Cupones Promocionales (Fase E2)
  const [codigoCuponInput, setCodigoCuponInput] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<any | null>(null);
  const [promocionesActivas, setPromocionesActivas] = useState<any[]>([]);

  const loadPromociones = useCallback(async () => {
    try {
      const res = await ApiService.get('/clientes/promociones');
      if (Array.isArray(res)) {
        const activas = res.filter((p: any) => p.activa !== false && (!p.fechaFin || new Date(p.fechaFin) >= new Date()));
        setPromocionesActivas(activas);
      } else {
        setPromocionesActivas([]);
      }
    } catch {
      setPromocionesActivas([]);
    }
  }, []);

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

  const resetPedidoForm = () => {
    setClientId('');
    setClienteSeleccionado(null);
    setLineasPedido([]);
    setNotasPedido('');
    setEditingOrderId(null);
    setEditingOrderNumero('');
    setReferenciaComprobante('');
    setRegistraAdelanto(false);
    setAdelantoInput('');
    setMetodoAdelanto('EFECTIVO');
    setReferenciaAdelanto('');
    setSerieFiltroBuscador('TODAS');
    setAlertaPedidoDuplicado(null);
    setIgnoroAlertaDuplicado(false);
  };

  const isDirtyOrder = useCallback(() => {
    return showModal && (lineasPedido.length > 0 || clientId !== '' || notasPedido.trim() !== '' || adelantoInput.trim() !== '');
  }, [showModal, lineasPedido.length, clientId, notasPedido, adelantoInput]);

  const isDirtySupplierOrder = useCallback(() => {
    return showSupplierOrderModal && (selectedSupplierId !== '' || supplierOrderObservaciones.trim() !== '' || Object.keys(supplierOrderTallasMap).length > 0);
  }, [showSupplierOrderModal, selectedSupplierId, supplierOrderObservaciones, supplierOrderTallasMap]);

  const isDirtyNuevoTransporte = useCallback(() => {
    return showNuevoTransporteModal && nuevoTransporteNombre.trim() !== '';
  }, [showNuevoTransporteModal, nuevoTransporteNombre]);

  const isDirtyEnvio = useCallback(() => {
    return showModalEnvio && (envioModalGuiaEnvio.trim() !== '' || envioModalDireccionEnvio.trim() !== '' || envioModalCiudadEnvio.trim() !== '');
  }, [showModalEnvio, envioModalGuiaEnvio, envioModalDireccionEnvio, envioModalCiudadEnvio]);

  const isDirtyAdelanto = useCallback(() => {
    return showModalAdelanto && (modalAdelantoMonto.trim() !== '' || modalAdelantoRef.trim() !== '');
  }, [showModalAdelanto, modalAdelantoMonto, modalAdelantoRef]);

  const isDirtyEntrega = useCallback(() => {
    return showEntregaModal && Object.keys(entregaItemsMap).length > 0;
  }, [showEntregaModal, entregaItemsMap]);

  // Manejador global de la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDiscardModal) return;
      if (showNuevoClienteModal) {
        e.preventDefault();
        setShowNuevoClienteModal(false);
        return;
      }
      if (showNuevoTransporteModal) {
        e.preventDefault();
        safeDismiss(() => setShowNuevoTransporteModal(false), isDirtyNuevoTransporte());
        return;
      }
      if (showModalEnvio) {
        e.preventDefault();
        safeDismiss(() => { setShowModalEnvio(false); setPedidoEnvioSeleccionado(null); }, isDirtyEnvio());
        return;
      }
      if (showModalAdelanto) {
        e.preventDefault();
        safeDismiss(() => { setShowModalAdelanto(false); setPedidoAdelantoSeleccionado(null); }, isDirtyAdelanto());
        return;
      }
      if (showEntregaModal) {
        e.preventDefault();
        safeDismiss(() => {
          setShowEntregaModal(false);
          setPedidoEntregaSeleccionado(null);
          setEntregaItemsMap({});
          setEntregaSustitutasMap({});
          setMostrarAlertasInsuficientes(false);
        }, isDirtyEntrega());
        return;
      }
      if (showSupplierOrderModal) {
        e.preventDefault();
        safeDismiss(() => { setShowSupplierOrderModal(false); setSupplierOrderProductData(null); }, isDirtySupplierOrder());
        return;
      }
      if (showModal) {
        e.preventDefault();
        safeDismiss(() => { setShowModal(false); setEditingOrderId(null); resetPedidoForm(); }, isDirtyOrder());
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    showDiscardModal, showNuevoTransporteModal, showModalEnvio, showModalAdelanto, showEntregaModal,
    showSupplierOrderModal, showModal, safeDismiss, isDirtyNuevoTransporte,
    isDirtyEnvio, isDirtyAdelanto, isDirtyEntrega, isDirtySupplierOrder, isDirtyOrder
  ]);
  const [validandoCupon, setValidandoCupon] = useState(false);
  const [cuponErrorMsg, setCuponErrorMsg] = useState('');

  const [busquedaModelo, setBusquedaModelo] = useState('');
  const [showDropdownModelo, setShowDropdownModelo] = useState(false);
  const [productoSeleccionadoObj, setProductoSeleccionadoObj] = useState<any | null>(null);
  const [serieFiltroBuscador, setSerieFiltroBuscador] = useState<string>('TODAS');

  // Mapa de cantidad total de pares vendidos por variante para ordenar de más vendidas a menos vendidas
  const ventasPorVarianteMap = useMemo(() => {
    const map = new Map<string, number>();
    pedidos.forEach((ped) => {
      const estadoUpper = String(ped.estado || '').toUpperCase();
      if (estadoUpper === 'CANCELADO') return;
      (ped.lines || []).forEach((l: any) => {
        const cant = Number(l.cantidad) || 1;
        if (l.productId) {
          map.set(l.productId, (map.get(l.productId) || 0) + cant);
        }
      });
    });
    return map;
  }, [pedidos]);

  // Consulta de Stock Inter-Sucursal en Punto de Venta
  const [stockInterSucursalResult, setStockInterSucursalResult] = useState<any[]>([]);
  const [loadingInterSucursal, setLoadingInterSucursal] = useState(false);

  const handleAplicarCupon = async () => {
    if (!codigoCuponInput.trim()) return;
    if (lineasPedido.length === 0) {
      setCuponErrorMsg('Agrega productos al pedido antes de aplicar el cupón.');
      return;
    }
    setValidandoCupon(true);
    setCuponErrorMsg('');
    try {
      const totalPares = lineasPedido.reduce((acc, l) => acc + l.cantidad, 0);
      const subtotal = lineasPedido.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
      const res = await ApiService.post('/clientes/promociones/validar', {
        codigo: codigoCuponInput.trim(),
        totalPares,
        totalMonto: subtotal,
        tipoPago,
      });
      if (res.valido) {
        setCuponAplicado(res);
        showToast(res.mensaje || '¡Cupón de descuento aplicado con éxito!', 'success');
      } else {
        setCuponErrorMsg(res.mensaje || 'El cupón no es válido.');
        setCuponAplicado(null);
      }
    } catch (err: any) {
      setCuponErrorMsg(err.message || 'Error al validar cupón.');
      setCuponAplicado(null);
    } finally {
      setValidandoCupon(false);
    }
  };

  const handleRemoverCupon = () => {
    setCuponAplicado(null);
    setCodigoCuponInput('');
    setCuponErrorMsg('');
  };

  useEffect(() => {
    const checkInterSucursalStock = async () => {
      if (!productoSeleccionadoObj || !online) {
        setStockInterSucursalResult([]);
        return;
      }
      try {
        setLoadingInterSucursal(true);
        const res = await ApiService.get(
          `/configuracion/stock-inter-sucursal?search=${encodeURIComponent(productoSeleccionadoObj.modelName)}`
        );
        if (Array.isArray(res)) {
          setStockInterSucursalResult(res);
        } else {
          setStockInterSucursalResult([]);
        }
      } catch {
        setStockInterSucursalResult([]);
      } finally {
        setLoadingInterSucursal(false);
      }
    };
    checkInterSucursalStock();
  }, [productoSeleccionadoObj, online]);

  const handleAgregarInterSucursal = (sucursalStockInfo: any) => {
    if (!productoSeleccionadoObj) return;

    const lineasInter: any[] = [];
    (sucursalStockInfo.tallasDisponibles || []).forEach((t: any) => {
      if (t.cantidad > 0) {
        const num = Number(t.talla ?? t.numero);
        const matchedTalla = (productoSeleccionadoObj.tallas || []).find(
          (pt: any) => Number(pt.numero) === num,
        );
        const resolvedTallaId = matchedTalla?.tallaId || matchedTalla?.id || t.tallaId || `t-${num}`;

        lineasInter.push({
          productId: productoSeleccionadoObj.id,
          modelName: `${productoSeleccionadoObj.modelName} [Origen: ${sucursalStockInfo.sucursalNombre}]`,
          color: productoSeleccionadoObj.color,
          serieNombre: `${productoSeleccionadoObj.serieNombre || 'Serie'} (Despacho Inter-Sucursal Urgente)`,
          imageUrl: productoSeleccionadoObj.imageUrl,
          tallaId: resolvedTallaId,
          numeroTalla: num,
          cantidad: 1,
          precioUnitario: Number(precioItem) || Number(sucursalStockInfo.precioVenta) || 15,
          tipoVenta: 'TALLA_ESPECIFICA' as const,
        });
      }
    });

    if (lineasInter.length === 0) {
      showToast('No hay tallas con stock disponible en esta sucursal.', 'warning');
      return;
    }

    setLineasPedido([...lineasPedido, ...lineasInter]);
    showToast(`¡Calzado agregado con origen ${sucursalStockInfo.sucursalNombre}!`, 'success');
  };

  const [ultimoPrecioCliente, setUltimoPrecioCliente] = useState<number | null>(null);
  const [fechaUltimaVenta, setFechaUltimaVenta] = useState<string | null>(null);
  const [sucursalUltimaVenta, setSucursalUltimaVenta] = useState<string | null>(null);

  // Debounce de 3 segundos para la búsqueda de clientes (como solicitó el usuario)
  useEffect(() => {
    if (!busquedaCliente.trim()) {
      setBusquedaDebounced('');
      setEsperandoDebounce(false);
      return;
    }
    setEsperandoDebounce(true);
    const timer = setTimeout(() => {
      setBusquedaDebounced(busquedaCliente.trim());
      setEsperandoDebounce(false);
    }, 3000); // 3 segundos de retardo exactos

    return () => clearTimeout(timer);
  }, [busquedaCliente]);

  // Consultar último precio al cliente cuando cambia el producto seleccionado o el cliente (busca a nivel de MODELO en toda la red)
  useEffect(() => {
    const fetchUltimoPrecio = async () => {
      if (!clientId || !selectedProductId || !online) {
        setUltimoPrecioCliente(null);
        setFechaUltimaVenta(null);
        setSucursalUltimaVenta(null);
        return;
      }
      try {
        const mId = productoSeleccionadoObj?.modelId || productoSeleccionadoObj?.modeloId || '';
        const mName = productoSeleccionadoObj?.modelName || '';
        const data = await ApiService.get(
          `/pedidos/ultimo-precio?clientId=${clientId}&productId=${selectedProductId}${mId ? `&modelId=${mId}` : ''}${mName ? `&modelName=${encodeURIComponent(mName)}` : ''}`
        );
        const precioAnterior = data.precioAnterior ? Number(data.precioAnterior) : null;
        setUltimoPrecioCliente(precioAnterior);
        setFechaUltimaVenta(data.fechaUltimaVenta ? new Date(data.fechaUltimaVenta).toLocaleDateString('es-EC') : null);
        setSucursalUltimaVenta(data.sucursalNombre || null);
        // Auto-aplicar el último precio del cliente como precio por defecto
        if (precioAnterior && precioAnterior > 0) {
          setPrecioItem(precioAnterior);
          setPrecioItemInput(String(precioAnterior));
        }
      } catch {
        setUltimoPrecioCliente(null);
        setFechaUltimaVenta(null);
        setSucursalUltimaVenta(null);
      }
    };
    fetchUltimoPrecio();
  }, [clientId, selectedProductId, productoSeleccionadoObj?.modelId, productoSeleccionadoObj?.modelName, online]);

  const [businessConfig, setBusinessConfig] = useState<any | null>(null);
  const [sucursalesEmpresa, setSucursalesEmpresa] = useState<any[]>([]);

  // Modal: Pedir stock a otra sucursal para pedidos EN_ESPERA_STOCK
  const [modalInterSucursalPedido, setModalInterSucursalPedido] = useState(false);
  const [pedidoInterSucursal, setPedidoInterSucursal] = useState<any>(null);
  const [interSucursalOrigenId, setInterSucursalOrigenId] = useState('');
  const [interSucursalModalidad, setInterSucursalModalidad] = useState<'DEVOLUCION_MERCADERIA' | 'PAGO_INTERNO'>('DEVOLUCION_MERCADERIA');
  const [interSucursalNotas, setInterSucursalNotas] = useState('');
  const [loadingInterSucursalPedido, setLoadingInterSucursalPedido] = useState(false);
  const [verificandoStockInterSucursal, setVerificandoStockInterSucursal] = useState(false);
  const [resultadoVerificacionStock, setResultadoVerificacionStock] = useState<any | null>(null);

  // Modal: Cancelar / Anular Pedido con sincronización automática
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<any | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [loadingCancelacion, setLoadingCancelacion] = useState(false);

  const loadSucursales = async () => {
    try {
      if (online) {
        const data = await ApiService.get('/configuracion/sucursales');
        if (Array.isArray(data) && data.length > 0) {
          setSucursalesEmpresa(data);
        }
      }
    } catch (e) {
      console.warn('Error cargando sucursales de la empresa:', e);
    }
  };

  useEffect(() => {
    loadPedidos();
    loadListaClientes();
    cargarCatalogo();
    loadBusinessConfig();
    loadSeriesConfig();
    loadListaProveedores();
    loadTransportes();
    loadSucursales();
    loadPromociones();

    // Por defecto siempre carga en la sucursal a la que pertenece el usuario
    const userLocalId = (activeSucursalId && activeSucursalId !== 'TODAS')
      ? activeSucursalId
      : (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}')?.tenantId : '') || '';
    const initialTarget = userLocalId || (sucursales && sucursales.length > 0 ? sucursales[0].id : '');
    if (initialTarget) {
      setSelectedSucursalPedidoId(initialTarget);
      setSelectedOrderSucursalId(initialTarget);
    }
  }, [online, activeSucursalId]);

  const loadTransportes = async () => {
    try {
      if (online) {
        const trs = await ApiService.get('/configuracion/transportes');
        if (Array.isArray(trs) && trs.length > 0) {
          setListaTransportes(trs);
          const predet = trs.find((t: any) => t.esPredeterminada);
          if (predet) {
            setCourier(predet.nombre);
            setEnvioModalCourier(predet.nombre);
          }
        }
      }
    } catch (e) {
      console.warn('Error cargando empresas de transporte:', e);
    }
  };

  const handleCrearNuevoTransporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTransporteNombre.trim()) {
      showToast('Ingresa el nombre de la empresa de transporte.', 'warning');
      return;
    }
    setGuardandoTransporte(true);
    try {
      await ApiService.post('/configuracion/transportes', {
        nombre: nuevoTransporteNombre.trim(),
      });
      showToast(`¡Transporte "${nuevoTransporteNombre.trim()}" registrado exitosamente!`, 'success');
      setCourier(nuevoTransporteNombre.trim());
      setEnvioModalCourier(nuevoTransporteNombre.trim());
      setNuevoTransporteNombre('');
      setShowNuevoTransporteModal(false);
      await loadTransportes();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar el transporte', 'error');
    } finally {
      setGuardandoTransporte(false);
    }
  };

  const loadSeriesConfig = async () => {
    try {
      if (online) {
        const srs = await ApiService.get('/configuracion/series');
        if (Array.isArray(srs)) {
          setListaSeriesDisponibles(srs);
          if (srs.length > 0) setSerieEspecialId(srs[0].id);
        }
      }
    } catch (e) {
      console.warn('Error cargando series:', e);
    }
  };

  const loadListaProveedores = async () => {
    try {
      if (online) {
        const prvs = await ApiService.get('/proveedores');
        if (Array.isArray(prvs)) {
          setListaProveedores(prvs);
          if (prvs.length > 0) setSelectedSupplierId(prvs[0].id);
        }
      }
    } catch (e) {
      console.warn('Error cargando proveedores:', e);
    }
  };

  const handleAbrirOrdenProveedor = (item: any) => {
    setSupplierOrderProductData(item);
    
    // Determinar si es venta por serie completa o numeración
    const esMediaDocena = item.subtipoSerie === 'MEDIA_DOCENA' || item.subtipoSerie === 'MEDIA_A' || item.subtipoSerie === 'MEDIA_B';
    const esDocena = item.subtipoSerie === 'DOCENA';
    const esSerieCompleta = item.tipoVenta === 'SERIE_COMPLETA' || item.tipoVenta === 'SERIE_ESPECIAL' || esMediaDocena || esDocena;

    setSupplierOrderModalType(esSerieCompleta ? 'SERIE_COMPLETA' : 'NUMERACION');
    setSupplierOrderSubtipoSerie(esDocena ? 'DOCENA' : (item.subtipoSerie === 'MEDIA_B' ? 'MEDIA_B' : 'MEDIA_A'));
    setSupplierOrderCantSeries(1);

    // Mapear tallas si vienen líneas específicas
    const mapTallas: Record<string, number> = {};
    if (item.lineas && Array.isArray(item.lineas)) {
      item.lineas.forEach((l: any) => {
        const key = `Talla #${l.numeroTalla || l.tallaNumero || 38}`;
        mapTallas[key] = (mapTallas[key] || 0) + l.cantidad;
      });
    } else {
      // Tallas estándar por defecto si no vienen
      [38, 39, 40, 41, 42].forEach(num => {
        mapTallas[`Talla #${num}`] = 0;
      });
    }
    setSupplierOrderTallasMap(mapTallas);

    setSupplierOrderCost(String(item.costPrice || (Number(item.precioUnitario) * 0.6).toFixed(2) || '15.00'));
    setSupplierOrderObservaciones('');

    if (listaProveedores.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(listaProveedores[0].id);
    }
    setShowSupplierOrderModal(true);
  };

  const handleCrearOrdenProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('Selecciona un proveedor para emitir la orden.', 'warning');
      return;
    }

    const paresTotales = supplierOrderModalType === 'SERIE_COMPLETA'
      ? (supplierOrderSubtipoSerie === 'DOCENA' ? 12 : 6) * supplierOrderCantSeries
      : Object.values(supplierOrderTallasMap).reduce((a, b) => a + (b || 0), 0);

    if (paresTotales <= 0) {
      showToast('La cantidad de pares debe ser mayor a 0.', 'warning');
      return;
    }

    setSavingSupplierOrder(true);
    try {
      let detalleNumeracion = '';
      if (supplierOrderModalType === 'SERIE_COMPLETA') {
        const curvaNombre = supplierOrderSubtipoSerie === 'MEDIA_A'
          ? 'Media A (38/1, 39/2, 40/1, 41/1, 42/1)'
          : supplierOrderSubtipoSerie === 'MEDIA_B'
          ? 'Media B (38/1, 39/1, 40/2, 41/1, 42/1)'
          : 'Docena (38/2, 39/3, 40/3, 41/2, 42/2)';
        detalleNumeracion = `Serie Completa: ${curvaNombre} x ${supplierOrderCantSeries} pedido(s) = ${paresTotales} pares`;
      } else {
        const tallasDesglose = Object.entries(supplierOrderTallasMap)
          .filter(([_, qty]) => qty > 0)
          .map(([key, qty]) => `${key}: ${qty} pares`)
          .join(', ');
        detalleNumeracion = `Por Numeración: ${tallasDesglose}`;
      }

      const notaFinal = [
        `Modelo: ${supplierOrderProductData.modelName} (${supplierOrderProductData.color}) - Serie: ${formatearNombreSerie(supplierOrderProductData.serieNombre)}`,
        detalleNumeracion,
        supplierOrderObservaciones.trim() ? `Observaciones: ${supplierOrderObservaciones.trim()}` : '',
      ].filter(Boolean).join(' | ');

      await ApiService.post('/proveedores/ordenes-compra', {
        supplierId: selectedSupplierId,
        observaciones: notaFinal,
        lines: [
          {
            productId: supplierOrderProductData.productId || (supplierOrderProductData as any).id,
            cantidadPedida: paresTotales,
            precioCosto: parseFloat(supplierOrderCost) || 10,
          },
        ],
      });
      showToast('¡Orden de compra y fabricación enviada al proveedor exitosamente!', 'success');
      setShowSupplierOrderModal(false);
      setSupplierOrderProductData(null);
    } catch (err: any) {
      showToast(err.message || 'Error al crear orden de compra', 'error');
    } finally {
      setSavingSupplierOrder(false);
    }
  };

  const loadBusinessConfig = async () => {
    try {
      if (online) {
        const b = await ApiService.get('/configuracion/negocio');
        if (b && b.nombre) setBusinessConfig(b);
      }
    } catch (e) {
      console.warn('No se pudo cargar businessConfig en comercial:', e);
    }
  };

  const obtenerDatosSucursalEmisor = (p?: Pedido) => {
    const targetSucursalId = (p as any)?.sucursalId || selectedSucursalPedidoId || activeSucursalId;
    const suc = (sucursalesEmpresa || []).find((s: any) => s.id === targetSucursalId) ||
                (sucursales || []).find((s: any) => s.id === targetSucursalId);
    return {
      nombre: suc?.name || businessConfig?.nombre || 'Calzado de Cuero',
      ruc: suc?.ruc || businessConfig?.ruc || '',
      direccion: suc?.direccion || businessConfig?.direccion || 'Cevallos, Tungurahua, Ecuador',
      telefono: suc?.telefono || businessConfig?.telefono || businessConfig?.whatsappContacto || '',
      email: suc?.email || businessConfig?.email || '',
    };
  };

  const construirPedidoPdfData = (p: Pedido): PedidoClientePdfData => {
    const cliente = listaClientes.find((c) => c.id === p.clientId);
    const clienteNombre = p.clienteNombre || cliente?.nombre || 'Estimado/a Cliente';
    const emisorData = obtenerDatosSucursalEmisor(p);
    const negocioNombre = emisorData.nombre;
    const numPedido = p.numeroCodigo || (p.numero ? `#${String(p.numero).padStart(4, '0')}` : `#${p.id.slice(0, 6).toUpperCase()}`);
    const fecha = new Date(p.createdAt || new Date()).toLocaleDateString('es-EC');

    const lineasPdf: any[] = [];
    if (p.lines && p.lines.length > 0) {
      const grupos: { [key: string]: any[] } = {};
      p.lines.forEach((l: any) => {
        const key = `${l.productId}_${l.tipoVenta || 'GENERAL'}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(l);
      });

      Object.entries(grupos).forEach(([_, lineas]) => {
        const item = lineas[0];
        const totalPares = lineas.reduce((sum, l) => sum + l.cantidad, 0);
        const subtotal = lineas.reduce((sum, l) => sum + (l.subtotal ?? (l.cantidad * Number(l.precioUnitario || 0))), 0);
        const obsItem = item.observacionModelo || item.observacion;

        let formato = `${totalPares} pares`;
        if (totalPares === 6) formato = 'Media Docena';
        else if (totalPares === 12) formato = '1 Docena';

        const tallasStr = lineas.map((l: any) => `T${l.tallaNumero || l.tallaId}: ${l.cantidad}`).join(', ');

        lineasPdf.push({
          modelo: item.modelName || 'Calzado',
          codigo: item.codigo || item.code,
          color: item.color,
          serie: item.serieNombre || item.serie,
          numeracion: tallasStr || `${totalPares} pares (${formato})`,
          imageUrl: item.imageUrl,
          cantidadPares: totalPares,
          precioUnitario: Number(item.precioUnitario || 0),
          subtotal: Number(subtotal || 0),
          observacion: obsItem,
        });
      });
    }

    return {
      emisor: {
        nombre: emisorData.nombre,
        ruc: emisorData.ruc,
        direccion: emisorData.direccion,
        telefono: emisorData.telefono,
        email: emisorData.email,
      },
      pedido: {
        numero: numPedido,
        fecha,
        tipoPago: p.tipoPago,
        tipoEntrega: p.tipoEntrega,
        courier: p.courier,
        guiaEnvio: p.guiaEnvio,
        observaciones: (p as any).notas || (p as any).observaciones,
      },
      cliente: {
        nombre: clienteNombre,
        cedula: cliente?.cedula,
        telefono: cliente?.telefono,
        direccion: p.direccionEnvio || cliente?.direccion,
        ciudad: p.ciudadEnvio,
      },
      lineas: lineasPdf,
      totales: {
        totalPares: (p.lines || []).reduce((sum: number, l: any) => sum + (l.cantidad || 0), 0),
        costoEnvio: Number(p.costoEnvio || 0),
        totalPagar: Number(p.montoTotal || 0),
      },
    };
  };

  const handleDescargarPdfPedido = (p: Pedido) => {
    try {
      const pdfData = construirPedidoPdfData(p);
      descargarPedidoClientePdf(pdfData);
      showToast('Comprobante PDF de pedido descargado.', 'success');
    } catch (e) {
      showToast('No se pudo generar el comprobante PDF.', 'error');
    }
  };

  const handleVerComprobanteDigital = async (p: Pedido) => {
    const cliente = listaClientes.find((c) => c.id === p.clientId);
    const telefono = cliente?.telefono;
    const clienteNombre = p.clienteNombre || cliente?.nombre || 'Estimado/a Cliente';
    const negocioNombre = businessConfig?.nombre || 'NEXORA';

    const lineasComprobante: any[] = [];
    if (p.lines && p.lines.length > 0) {
      const grupos: { [key: string]: any[] } = {};
      p.lines.forEach((l: any) => {
        const key = `${l.productId}_${l.tipoVenta || 'GENERAL'}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(l);
      });

      Object.entries(grupos).forEach(([_, lineas]) => {
        const item = lineas[0];
        const totalPares = lineas.reduce((sum, l) => sum + l.cantidad, 0);
        const subtotal = lineas.reduce((sum, l) => sum + (l.subtotal ?? (l.cantidad * Number(l.precioUnitario || 0))), 0);
        const obsItem = item.observacionModelo || item.observacion;

        let formato = `${totalPares} pares`;
        if (totalPares === 6) formato = 'Media Docena';
        else if (totalPares === 12) formato = '1 Docena';

        lineasComprobante.push({
          modelo: item.modelName || 'Calzado',
          codigo: item.codigo || item.code,
          color: item.color,
          serie: item.serieNombre || item.serie,
          imageUrl: item.imageUrl,
          numeracion: `${totalPares} pares (${formato})`,
          observacion: obsItem,
          cantidadPares: totalPares,
          precioUnitario: Number(item.precioUnitario || 0),
          subtotal: Number(subtotal || 0),
        });
      });
    }

    const urlComprobante = await generarUrlPublicaPedidoCliente({
      pedido: {
        id: p.id,
        numero: p.numero,
        numeroCodigo: p.numeroCodigo,
        fecha: new Date(p.createdAt || new Date()).toLocaleDateString('es-EC'),
        tipoPago: p.tipoPago,
        observaciones: (p as any).notas || (p as any).observaciones,
      },
      cliente: {
        nombre: clienteNombre,
        cedula: cliente?.cedula,
        telefono: telefono,
        direccion: p.direccionEnvio || cliente?.direccion,
      },
      emisor: {
        nombre: negocioNombre,
        ruc: businessConfig?.ruc,
        direccion: businessConfig?.direccion,
        telefono: businessConfig?.telefono,
      },
      lineas: lineasComprobante,
      totales: {
        totalPares: (p.lines || []).reduce((sum: number, l: any) => sum + (l.cantidad || 0), 0),
        totalPagar: Number(p.montoTotal || 0),
        adelanto: Number((p as any).adelanto || 0),
        saldoPendiente: Math.max(0, Number(p.montoTotal || 0) - Number((p as any).adelanto || 0)),
        metodoAdelanto: (p as any).metodoAdelanto || undefined,
      },
    });

    window.open(urlComprobante, '_blank');
  };

  const handleEnviarConfirmacionWhatsApp = async (p: Pedido, clienteTel?: string, esManual: boolean = false) => {
    const cliente = listaClientes.find((c) => c.id === p.clientId);
    const telefono = clienteTel || cliente?.telefono;
    if (!telefono) {
      if (esManual) showToast('El cliente no tiene número de teléfono registrado.', 'warning');
      return;
    }

    const emisorData = obtenerDatosSucursalEmisor(p);
    const numPedido = p.numeroCodigo || (p.numero ? `#${String(p.numero).padStart(4, '0')}` : `#${p.id.slice(0, 6).toUpperCase()}`);
    const fecha = new Date(p.createdAt || new Date()).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    const clienteNombre = p.clienteNombre || cliente?.nombre || 'Estimado/a Cliente';
    const negocioNombre = emisorData.nombre;

    let desgloseTexto = '';
    const lineasComprobante: any[] = [];

    if (p.lines && p.lines.length > 0) {
      const grupos: { [key: string]: any[] } = {};
      p.lines.forEach((l: any) => {
        const key = `${l.productId || l.varianteId || l.id}_${l.tipoVenta || 'GENERAL'}_${(l.serieNombre || l.serie || '').toLowerCase()}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(l);
      });

      Object.entries(grupos).forEach(([_, lineas]) => {
        const item = lineas[0];
        const catProd = (catalogoProductos || []).find(
          (cp: any) => cp.id === (item.productId || item.varianteId) || cp.code === (item.codigo || item.code)
        );
        const resolvedImg = item.imageUrl || item.producto?.imageUrl || item.variante?.imageUrl || catProd?.imageUrl || null;
        const resolvedModelName = item.modelName || item.nombre || catProd?.modelName || 'Calzado';
        const resolvedColor = item.color || catProd?.color || 'Color estándar';
        const resolvedSerie = formatearNombreSerie(item.serieNombre || item.serie || catProd?.serieNombre || 'Serie');
        const resolvedCode = item.codigo || item.code || catProd?.code || '';

        const totalPares = lineas.reduce((sum, l) => sum + (l.cantidad || 0), 0);
        const subtotal = lineas.reduce((sum, l) => sum + (l.subtotal ?? ((l.cantidad || 0) * Number(l.precioUnitario || 0))), 0);
        const obsItem = item.observacionModelo || item.observacion;

        let formato = `${totalPares} pares`;
        if (totalPares === 6) formato = 'Media Docena';
        else if (totalPares === 12) formato = '1 Docena';

        const resolverTallaNum = (l: any) => {
          if (l.numeroTalla) return l.numeroTalla;
          if (l.tallaNumero) return l.tallaNumero;
          if (l.talla?.numero) return l.talla.numero;
          if (l.talla?.nombre) return l.talla.nombre;
          if (catProd && Array.isArray(catProd.tallas)) {
            const tFound = catProd.tallas.find((t: any) => t.id === l.tallaId || t.id === l.id);
            if (tFound) return tFound.numero || tFound.nombre;
          }
          if (l.tallaId && String(l.tallaId).length <= 4) return l.tallaId;
          return '?';
        };

        const sortedLineas = [...lineas].sort((a, b) => (Number(resolverTallaNum(a)) || 0) - (Number(resolverTallaNum(b)) || 0));
        const tallasDesglose = sortedLineas.map((l: any) => `T${resolverTallaNum(l)}: ${l.cantidad}`).join(', ');
        const tallasNumeracionPdf = sortedLineas.map((l: any) => `T${resolverTallaNum(l)} (${l.cantidad})`).join(' | ');
        const notaExtra = obsItem ? ` (Nota: ${obsItem})` : '';

        desgloseTexto += `\n📦 *${resolvedModelName}* (${resolvedColor})\n   • Serie: *${resolvedSerie}*\n   • Numeración: ${tallasDesglose}\n   • Cantidad: *${formato}* (${totalPares} pares) x $${Number(item.precioUnitario).toFixed(2)} = *$${subtotal.toFixed(2)}*${notaExtra}`;

        lineasComprobante.push({
          modelo: resolvedModelName,
          codigo: resolvedCode,
          color: resolvedColor,
          serie: resolvedSerie,
          imageUrl: resolvedImg,
          numeracion: `${tallasNumeracionPdf} (${formato})`,
          observacion: obsItem,
          cantidadPares: totalPares,
          precioUnitario: Number(item.precioUnitario || 0),
          subtotal: Number(subtotal || 0),
        });
      });
    }

    const montoAdelanto = Number((p as any).adelanto || 0);
    const totalPagar = Number(p.montoTotal || 0);
    const saldoPendiente = Math.max(0, totalPagar - montoAdelanto);

    // Generar enlace digital oficial del comprobante
    const urlComprobante = await generarUrlPublicaPedidoCliente({
      pedido: {
        id: p.id,
        numero: p.numero,
        numeroCodigo: p.numeroCodigo,
        fecha: new Date(p.createdAt || new Date()).toLocaleDateString('es-EC'),
        tipoPago: p.tipoPago,
        observaciones: (p as any).notas || (p as any).observaciones,
      },
      cliente: {
        nombre: clienteNombre,
        cedula: cliente?.cedula,
        telefono: telefono,
        direccion: p.direccionEnvio || cliente?.direccion,
      },
      emisor: {
        nombre: emisorData.nombre,
        ruc: emisorData.ruc,
        direccion: emisorData.direccion,
        telefono: emisorData.telefono,
        email: emisorData.email,
      },
      lineas: lineasComprobante,
      totales: {
        totalPares: (p.lines || []).reduce((sum: number, l: any) => sum + (l.cantidad || 0), 0),
        totalPagar,
        adelanto: montoAdelanto,
        saldoPendiente,
        metodoAdelanto: (p as any).metodoAdelanto || undefined,
      },
    });

    const obsGeneral = (p as any).notas || (p as any).observaciones;
    const obsGeneralTexto = obsGeneral && obsGeneral.trim() ? `\n📝 *Observaciones:* ${obsGeneral.trim()}` : '';

    // Reputación y condición de cliente para tiempo de entrega (7 a 15 días)
    const reputacion = getClienteReputacion(cliente);
    const esClienteHabitual = reputacion.tipo === 'VIP' || reputacion.tipo === 'CONFIABLE' || (cliente?.totalPedidos ?? 0) > 1 || (cliente?.totalVentas ?? 0) > 0;
    
    // Identificar si el pedido contiene líneas sin stock físico inmediato o está en espera de producción
    const haySinStock = (p.lines || []).some((l: any) => {
      const stockDisp = l.stockFisico !== undefined ? l.stockFisico : (l.stockDisponible !== undefined ? l.stockDisponible : 999);
      return stockDisp < (l.cantidad || 1);
    }) || p.estado === 'EN_ESPERA_STOCK' || (p as any).bajoPedido === true;

    const tieneAbono = montoAdelanto > 0 || (p as any).adelantoRegistrado === true || p.tipoPago === 'ANTICIPO' || p.tipoPago === 'ADELANTO';

    let tiempoEntregaTexto = '';
    if (haySinStock) {
      if (esClienteHabitual) {
        tiempoEntregaTexto = '\n⏳ *Tiempo Estimado de Entrega:* 7 a 15 días laborables (Confección en fábrica iniciada de inmediato por ser cliente habitual).';
      } else if (tieneAbono) {
        tiempoEntregaTexto = '\n⏳ *Tiempo Estimado de Entrega:* 7 a 15 días laborables (Confección en fábrica iniciada tras confirmación de su anticipo).';
      } else {
        tiempoEntregaTexto = '\n⏳ *Tiempo Estimado de Entrega:* 7 a 15 días laborables una vez confirmado el anticipo para iniciar la producción en fábrica.';
      }
    }

    let desgloseFinancieroTexto = `\n💰 *VALOR TOTAL:* $${totalPagar.toFixed(2)}`;
    if (montoAdelanto > 0) {
      desgloseFinancieroTexto = `\n💰 *VALOR TOTAL:* $${totalPagar.toFixed(2)}\n💵 *ANTICIPO RECIBIDO (${(p as any).metodoAdelanto || 'EFECTIVO'}):* -$${montoAdelanto.toFixed(2)}\n⏳ *SALDO PENDIENTE A LA ENTREGA:* *$${saldoPendiente.toFixed(2)}*`;
    }

    const contactoSucursal = emisorData.telefono ? `\n📞 *Contacto / WhatsApp:* ${emisorData.telefono}` : '';
    const direccionSucursal = emisorData.direccion ? `\n📍 *Ubicación:* ${emisorData.direccion}` : '';

    const mensaje = `Estimado/a *${clienteNombre}*,\n\nLe saludamos de *${negocioNombre}*. Confirmamos la recepción de su pedido:\n\n📦 *PEDIDO ${numPedido}*\n📅 *Fecha:* ${fecha}\n💳 *Forma de Pago:* ${p.tipoPago || 'Contado'}${p.tipoEntrega === 'ENVIO' ? `\n🚚 *Envío:* ${p.courier || 'Transporte'}${p.guiaEnvio ? ` (Guía: ${p.guiaEnvio})` : ''}` : ''}${obsGeneralTexto}${tiempoEntregaTexto}\n\n👟 *DETALLE DE ARTÍCULOS:*${desgloseTexto || '\n• ' + (p.lines?.length || 1) + ' ítems'}\n\n📊 *Total pares pedidos:* ${(p.lines || []).reduce((sum: number, l: any) => sum + (l.cantidad || 0), 0)} pares${desgloseFinancieroTexto}\n\n📥 *Descarga aquí tu comprobante oficial de pedido:*\n👉 ${urlComprobante}\n\nPor favor, confírmenos respondiendo a este mensaje con un *"Confirmado"* o *"OK"* para proceder con la preparación y entrega. ¡Muchas gracias por su preferencia!\n*${negocioNombre}*${contactoSucursal}${direccionSucursal}`;

    const autoEmail = typeof window !== 'undefined' ? localStorage.getItem('nexora_auto_email_comprobante') !== 'false' : true;
    const autoWhatsApp = typeof window !== 'undefined' ? (localStorage.getItem('nexora_auto_whatsapp_abono') !== 'false' && localStorage.getItem('nexora_auto_whatsapp_comprobante') !== 'false') : true;

    if (!esManual && !autoEmail && !autoWhatsApp) {
      return;
    }

    // Envío automático por Correo en segundo plano si está activo y el cliente tiene email
    const emailDestino = cliente?.email || (p as any).clienteEmail || (p as any).email;
    let enviadoCorreo = false;
    if (autoEmail && emailDestino) {
      ApiService.post('/notificaciones/email-comprobante', {
        destinatario: emailDestino,
        asunto: `Comprobante de Pedido ${numPedido} — ${negocioNombre}`,
        tipo: 'PEDIDO',
        detalles: {
          mensaje,
          urlComprobante,
        },
      })
        .then(() => showToast(`Comprobante de pedido enviado al correo ${emailDestino}`, 'success'))
        .catch((e) => console.warn('Error enviando correo de pedido:', e));
      enviadoCorreo = true;
    }

    let enviadoWhatsApp = false;
    if ((esManual || autoWhatsApp) && telefono) {
      abrirWhatsAppUniversal(telefono, mensaje);
      enviadoWhatsApp = true;
    }

    if (enviadoCorreo && !enviadoWhatsApp) {
      showToast(`Comprobante de pedido enviado por correo a ${emailDestino}`, 'success');
    }
  };

  const handleEnviarPedidoEntregadoWhatsApp = async (p: Pedido, clienteTel?: string, esManual: boolean = false) => {
    const cliente = listaClientes.find((c) => c.id === p.clientId);
    const telefono = clienteTel || cliente?.telefono;
    if (!telefono) {
      if (esManual) showToast('El cliente no tiene número de teléfono registrado para WhatsApp.', 'warning');
      return;
    }

    const emisorData = obtenerDatosSucursalEmisor(p);
    const numPedido = p.numeroCodigo || (p.numero ? `#${String(p.numero).padStart(4, '0')}` : `#${p.id.slice(0, 6).toUpperCase()}`);
    const fecha = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    const clienteNombre = p.clienteNombre || cliente?.nombre || 'Estimado/a Cliente';
    const negocioNombre = emisorData.nombre;

    let desgloseTexto = '';
    const lineasComprobante: any[] = [];

    if (p.lines && p.lines.length > 0) {
      const grupos: { [key: string]: any[] } = {};
      p.lines.forEach((l: any) => {
        const key = `${l.productId || l.varianteId || l.id}_${l.tipoVenta || 'GENERAL'}_${(l.serieNombre || l.serie || '').toLowerCase()}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(l);
      });

      Object.entries(grupos).forEach(([_, lineas]) => {
        const item = lineas[0];
        const catProd = (catalogoProductos || []).find(
          (cp: any) => cp.id === (item.productId || item.varianteId) || cp.code === (item.codigo || item.code)
        );
        const resolvedImg = item.imageUrl || item.producto?.imageUrl || item.variante?.imageUrl || catProd?.imageUrl || null;
        const resolvedModelName = item.modelName || item.nombre || catProd?.modelName || 'Calzado';
        const resolvedColor = item.color || catProd?.color || 'Color estándar';
        const resolvedSerie = formatearNombreSerie(item.serieNombre || item.serie || catProd?.serieNombre || 'Serie');
        const resolvedCode = item.codigo || item.code || catProd?.code || '';

        const totalParesEntregados = lineas.reduce((sum, l) => sum + Number(l.cantidadEntregada !== undefined ? l.cantidadEntregada : (l.cantidad || 0)), 0);
        const totalParesSolicitados = lineas.reduce((sum, l) => sum + Number(l.cantidad || 0), 0);
        const subtotal = lineas.reduce((sum, l) => sum + (Number(l.cantidadEntregada !== undefined ? l.cantidadEntregada : (l.cantidad || 0)) * Number(l.precioUnitario || 0)), 0);
        const obsItem = item.observacionModelo || item.observacion;

        let formato = `${totalParesEntregados} pares`;
        if (totalParesEntregados === 6) formato = 'Media Docena';
        else if (totalParesEntregados === 12) formato = '1 Docena';

        const resolverTallaNum = (l: any) => {
          if (l.numeroTalla) return l.numeroTalla;
          if (l.tallaNumero) return l.tallaNumero;
          if (l.talla?.numero) return l.talla.numero;
          if (l.talla?.nombre) return l.talla.nombre;
          if (catProd && Array.isArray(catProd.tallas)) {
            const tFound = catProd.tallas.find((t: any) => t.id === l.tallaId || t.id === l.id);
            if (tFound) return tFound.numero || tFound.nombre;
          }
          if (l.tallaId && String(l.tallaId).length <= 4) return l.tallaId;
          return '?';
        };

        // Ordenar tallas numéricamente y construir desglose legible
        const sortedLineas = [...lineas].sort((a, b) => (Number(resolverTallaNum(a)) || 0) - (Number(resolverTallaNum(b)) || 0));
        const tallasDesglose = sortedLineas.map((l: any) => {
          const cEnt = l.cantidadEntregada !== undefined ? l.cantidadEntregada : l.cantidad;
          const cPed = l.cantidad || cEnt;
          return cEnt < cPed ? `T${resolverTallaNum(l)}: ${cEnt}/${cPed}` : `T${resolverTallaNum(l)}: ${cEnt}`;
        }).join(', ');
        const tallasNumeracionPdf = sortedLineas.map((l: any) => {
          const cEnt = l.cantidadEntregada !== undefined ? l.cantidadEntregada : l.cantidad;
          return `T${resolverTallaNum(l)} (${cEnt})`;
        }).join(' | ');
        const notaExtra = obsItem ? ` (Nota: ${obsItem})` : '';

        desgloseTexto += `\n📦 *${resolvedModelName}* (${resolvedColor})\n   • Serie: *${resolvedSerie}*\n   • Tallas entregadas: ${tallasDesglose}\n   • Cantidad acumulada: *${formato}* (${totalParesEntregados}/${totalParesSolicitados} pares) x $${Number(item.precioUnitario).toFixed(2)} = *$${subtotal.toFixed(2)}*${notaExtra}`;

        lineasComprobante.push({
          modelo: resolvedModelName,
          codigo: resolvedCode,
          color: resolvedColor,
          serie: resolvedSerie,
          imageUrl: resolvedImg,
          numeracion: `${tallasNumeracionPdf} (${formato})`,
          observacion: obsItem,
          cantidadPares: totalParesEntregados,
          precioUnitario: Number(item.precioUnitario || 0),
          subtotal: Number(subtotal || 0),
        });
      });
    }

    const totalParesEntregadosGeneral = (p.lines || []).reduce((sum: number, l: any) => sum + Number(l.cantidadEntregada !== undefined ? l.cantidadEntregada : (l.cantidad || 0)), 0);
    const totalParesPedidoGeneral = (p.lines || []).reduce((sum: number, l: any) => sum + Number(l.cantidad || 0), 0);
    const esEntregaTotal = totalParesEntregadosGeneral >= totalParesPedidoGeneral;

    const urlComprobante = await generarUrlPublicaPedidoCliente({
      pedido: {
        id: p.id,
        numero: p.numero,
        numeroCodigo: p.numeroCodigo,
        fecha: new Date().toLocaleDateString('es-EC'),
        tipoPago: p.tipoPago,
        observaciones: (p as any).notas || (p as any).observaciones,
      },
      cliente: {
        nombre: clienteNombre,
        cedula: cliente?.cedula,
        telefono: telefono,
        direccion: p.direccionEnvio || cliente?.direccion,
      },
      emisor: {
        nombre: emisorData.nombre,
        ruc: emisorData.ruc,
        direccion: emisorData.direccion,
        telefono: emisorData.telefono,
        email: emisorData.email,
      },
      lineas: lineasComprobante,
      totales: {
        totalPares: totalParesEntregadosGeneral,
        totalPagar: Number(p.montoTotal || 0),
      },
    });

    const estadoTexto = esEntregaTotal ? '✅ *ENTREGA COMPLETADA (100%)*' : '📦 *ENTREGA PARCIAL REALIZADA*';
    const pendienteTexto = !esEntregaTotal ? `\n⏳ *Pares pendientes por entregar:* ${Math.max(0, totalParesPedidoGeneral - totalParesEntregadosGeneral)} pares` : '';

    const contactoSucursal = emisorData.telefono ? `\n📞 *Contacto / WhatsApp:* ${emisorData.telefono}` : '';
    const direccionSucursal = emisorData.direccion ? `\n📍 *Ubicación:* ${emisorData.direccion}` : '';

    const mensaje = `Estimado/a *${clienteNombre}*,\n\nLe saludamos de *${negocioNombre}*.\n\nLe notificamos que se ha registrado la entrega de su pedido:\n\n${estadoTexto}\n📄 *PEDIDO ${numPedido}*\n📅 *Fecha de Entrega:* ${fecha}\n💳 *Forma de Pago:* ${p.tipoPago || 'Contado'}${p.tipoEntrega === 'ENVIO' ? `\n🚚 *Envío:* ${p.courier || 'Transporte'}${p.guiaEnvio ? ` (Guía: ${p.guiaEnvio})` : ''}` : ''}\n\n👟 *DETALLE DE CALZADO ENTREGADO:*${desgloseTexto || '\n• ' + (p.lines?.length || 1) + ' ítems'}\n\n📊 *Total pares entregados acumulados:* ${totalParesEntregadosGeneral} de ${totalParesPedidoGeneral} pares${pendienteTexto}\n💰 *Total pedido:* $${Number(p.montoTotal).toFixed(2)}\n\n📥 *Descarga aquí tu comprobante oficial de entrega en PDF:*\n👉 ${urlComprobante}\n\n¡Muchas gracias por su preferencia!\n*${negocioNombre}*${contactoSucursal}${direccionSucursal}`;

    const autoEmail = typeof window !== 'undefined' ? localStorage.getItem('nexora_auto_email_comprobante') !== 'false' : true;
    const autoWhatsApp = typeof window !== 'undefined' ? (localStorage.getItem('nexora_auto_whatsapp_abono') !== 'false' && localStorage.getItem('nexora_auto_whatsapp_comprobante') !== 'false') : true;

    if (!esManual && !autoEmail && !autoWhatsApp) {
      return;
    }

    // Envío automático por Correo en segundo plano si está activo y el cliente tiene email
    const emailDestino = cliente?.email || (p as any).clienteEmail || (p as any).email;
    let enviadoCorreo = false;
    if (autoEmail && emailDestino) {
      ApiService.post('/notificaciones/email-comprobante', {
        destinatario: emailDestino,
        asunto: `Comprobante de Entrega de Pedido ${numPedido} — ${negocioNombre}`,
        tipo: 'PEDIDO',
        detalles: {
          mensaje,
          urlComprobante,
        },
      })
        .then(() => showToast(`Comprobante de entrega enviado al correo ${emailDestino}`, 'success'))
        .catch((e) => console.warn('Error enviando correo de entrega:', e));
      enviadoCorreo = true;
    }

    let enviadoWhatsApp = false;
    if ((esManual || autoWhatsApp) && telefono) {
      abrirWhatsAppUniversal(telefono, mensaje);
      enviadoWhatsApp = true;
    }

    if (enviadoCorreo && !enviadoWhatsApp) {
      showToast(`Comprobante de entrega enviado por correo a ${emailDestino}`, 'success');
    }
  };

  const cargarCatalogo = async (sucursalIdParam?: string) => {
    try {
      if (online) {
        const targetSuc = sucursalIdParam || selectedOrderSucursalId || (activeSucursalId !== 'TODAS' ? activeSucursalId : '');
        const queryStr = targetSuc ? `?tenantId=${encodeURIComponent(targetSuc)}` : '';
        const res = await ApiService.get(`/catalogo/productos${queryStr}`);
        const modelosData = Array.isArray(res) ? res : (res?.modelos || []);
        const flat: any[] = [];
        modelosData.forEach((modelo: any) => {
          (modelo.variantes || []).forEach((v: any) => {
            flat.push({
              id: v.id,
              code: v.code,
              color: v.color,
              imageUrl: v.imageUrl,
              costPrice: Number(v.costPrice || 0),
              salePrice: Number(v.salePrice || 0),
              modelId: modelo.id,
              modelName: modelo.name,
              baseCode: modelo.baseCode,
              serieNombre: v.serieNombre,
              tallas: (v.tallas || []).slice().sort((a: any, b: any) => (Number(a.numero ?? a.nombre) || 0) - (Number(b.numero ?? b.nombre) || 0)),
            });
          });
        });
        setCatalogoProductos(flat);
      }
    } catch (e) {
      console.error('Error cargando catálogo para nuevo pedido:', e);
    }
  };

  const loadListaClientes = async () => {
    try {
      if (online) {
        const data = await ApiService.get('/clientes');
        if (Array.isArray(data)) {
          const clientesFormateados = data.map((c: any) => {
            const apellido = (c.apellido || '').trim();
            const nombre = (c.nombre || '').trim();
            const nombreFormateado = apellido ? `${apellido} ${nombre}` : (nombre || 'Cliente');
            return {
              id: c.id,
              nombre: nombreFormateado,
              apellido: c.apellido || '',
              nombrePila: c.nombre || '',
              cedula: c.cedula || c.ruc || '',
              telefono: c.telefono || '',
              score: c.score ?? c.scoringCredito ?? 100,
              nivelCredito: c.nivelCredito || 'SIN_CREDITO',
              totalCompras: c.totalCompras || 0,
              comprasSinAtraso: c.comprasSinAtraso || 0,
              atrasoConsecutivo: c.atrasoConsecutivo || 0,
              limiteCredito: Number(c.limiteCredito || 0),
              creditoUtilizado: Number(c.creditoUtilizado || 0),
              creditoDisponible: Number(c.creditoDisponible || 0),
              activo: c.activo !== false,
            };
          });

          // Ordenar alfabéticamente por apellido/nombre
          clientesFormateados.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
          setListaClientes(clientesFormateados);
        }
      } else {
        const local = await db.clientes.toArray();
        setListaClientes(
          local.map((c: any) => ({
            id: c.id,
            nombre: c.nombre,
            cedula: c.cedula,
            telefono: c.telefono,
            score: c.score || 100,
            nivelCredito: c.nivelCredito || 'SIN_CREDITO',
            totalCompras: 0,
            comprasSinAtraso: 0,
            atrasoConsecutivo: 0,
            limiteCredito: Number(c.limiteCredito || 0),
            creditoUtilizado: 0,
            creditoDisponible: Number(c.cupoDisponible || 0),
            activo: true,
          }))
        );
      }
    } catch (e) {
      console.error('Error cargando clientes:', e);
    }
  };

  const handleSeleccionarProducto = (pObj: any) => {
    if (pObj) {
      const tallasSorted = (pObj.tallas || []).slice().sort((a: any, b: any) => {
        const numA = Number(a.numero ?? a.nombre) || 0;
        const numB = Number(b.numero ?? b.nombre) || 0;
        return numA - numB;
      });
      const pObjSorted = { ...pObj, tallas: tallasSorted };
      setSelectedProductId(pObj.id);
      setProductoSeleccionadoObj(pObjSorted);
      setShowDropdownModelo(false);
      setBusquedaModelo('');
      // Usar salePrice del catálogo como precio base siempre
      const precioCatalogo = Number(pObj.salePrice) || Number(pObj.costPrice) || 0;
      setPrecioItem(precioCatalogo);
      setPrecioItemInput(precioCatalogo > 0 ? String(precioCatalogo) : '');
      setUltimoPrecioCliente(null);
      setFechaUltimaVenta(null);
      
      if (tipoVentaItem === 'SERIE_COMPLETA' && pObjSorted.tallas) {
        const mejorCurva = detectarMejorCurvaSegunStock(pObjSorted.serieNombre, pObjSorted.tallas);
        const mapCalculado = calcularCurvaParaTallas(pObjSorted.serieNombre, pObjSorted.tallas, mejorCurva);
        setTallaCantidadesMap(mapCalculado);
      } else if (pObjSorted.tallas) {
        const initialMap: Record<string, number> = {};
        pObjSorted.tallas.forEach((t: any) => {
          const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
          initialMap[key] = 0;
        });
        setTallaCantidadesMap(initialMap);
      }
    } else {
      setSelectedProductId('');
      setProductoSeleccionadoObj(null);
      setPrecioItem(0);
      setPrecioItemInput('');
      setTallaCantidadesMap({});
    }
  };

  const handleAgregarLinea = () => {
    if (!selectedProductId || !productoSeleccionadoObj) {
      showToast('Por favor selecciona un producto.', 'warning');
      return;
    }
    if (precioItem <= 0) {
      showToast('El precio unitario debe ser mayor a 0.', 'warning');
      return;
    }

    const prodObj = productoSeleccionadoObj;
    const tallasList = tipoVentaItem === 'SERIE_ESPECIAL'
      ? (listaSeriesDisponibles.find((s) => s.id === serieEspecialId)?.tallas || [
          { id: 't-esp-38', numero: 38 },
          { id: 't-esp-39', numero: 39 },
          { id: 't-esp-40', numero: 40 },
          { id: 't-esp-41', numero: 41 },
          { id: 't-esp-42', numero: 42 },
        ])
      : (prodObj.tallas || []);

    const lineasAgregadas: any[] = [];
    tallasList.forEach((t: any) => {
      const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
      const qty = tallaCantidadesMap[key] || 0;
      if (qty > 0) {
        const num = Number(t.numero ?? t.nombre);
        const matchedTalla = (prodObj.tallas || []).find((pt: any) => Number(pt.numero ?? pt.nombre) === num);
        const resolvedTallaId = matchedTalla?.tallaId || matchedTalla?.id || t.id || key;

        lineasAgregadas.push({
          productId: prodObj.id,
          modelName: prodObj.modelName,
          color: prodObj.color,
          serieNombre: tipoVentaItem === 'SERIE_ESPECIAL'
            ? `${listaSeriesDisponibles.find((s) => s.id === serieEspecialId)?.nombre?.replace(/_/g, ' ') || 'Serie Especial'} [Bajo Pedido]`
            : (prodObj.serieNombre || 'ADULTO'),
          imageUrl: prodObj.imageUrl,
          tallaId: resolvedTallaId,
          numeroTalla: num,
          cantidad: qty,
          precioUnitario: Number(precioItem),
          tipoVenta: tipoVentaItem,
          esPedidoEspecial: tipoVentaItem === 'SERIE_ESPECIAL',
          subtipoSerie: qty === 12 ? 'DOCENA' : 'MEDIA_DOCENA',
          cantidadSeries: Math.max(1, Math.floor(qty / 6)),
          observacionModelo: observacionModeloActual.trim() || undefined,
        });
      }
    });

    if (lineasAgregadas.length === 0) {
      showToast('Por favor asigna al menos una talla con cantidad mayor a 0.', 'warning');
      return;
    }

    // Advertencia de calzados ya solicitados en pedido vigente del cliente (Fase 2B)
    if (alertaPedidoDuplicado?.pedidoExistente?.lines && alertaPedidoDuplicado.pedidoExistente.lines.length > 0) {
      const lineasExistentes = alertaPedidoDuplicado.pedidoExistente.lines;
      const coincidentes = lineasAgregadas.filter((nueva) =>
        lineasExistentes.some(
          (ex: any) =>
            (ex.productId === nueva.productId || ex.modelName === nueva.modelName) &&
            (ex.tallaId === nueva.tallaId || Number(ex.numeroTalla || ex.tallaNumero) === Number(nueva.numeroTalla))
        )
      );
      if (coincidentes.length > 0) {
        const tallasNombres = coincidentes.map((c) => `T${c.numeroTalla}`).join(', ');
        showToast(
          `⚠️ Advertencia: ${prodObj.modelName} (${tallasNombres}) ya consta en el pedido vigente ${getNumeroPedido(alertaPedidoDuplicado.pedidoExistente)} de este cliente. Verifica si no se trata de un pedido duplicado.`,
          'warning'
        );
      }
    }

    setLineasPedido([...lineasPedido, ...lineasAgregadas]);
    showToast(`¡${prodObj.modelName} agregado al pedido!`, 'success');

    // Limpiar selección de producto y observación del modelo
    setSelectedProductId('');
    setProductoSeleccionadoObj(null);
    setBusquedaModelo('');
    setPrecioItem(0);
    setPrecioItemInput('');
    setObservacionModeloActual('');
    setMostrarObsModeloActual(false);
    setTallaCantidadesMap({});
  };

  const handleEliminarLinea = (index: number) => {
    setLineasPedido(lineasPedido.filter((_, i) => i !== index));
  };

  const handleAbrirEditarPedido = (p: Pedido) => {
    setEditingOrderId(p.id);
    setEditingOrderNumero(getNumeroPedido(p));
    setClientId(p.clientId);
    setClienteSeleccionado({
      id: p.clientId,
      nombre: p.clienteNombre || 'Cliente seleccionado',
    });
    setTipoPago(p.tipoPago || 'CONTADO');
    setNotasPedido((p as any).notas || '');

    // Anticipo / Adelanto
    const montoAd = Number(p.adelanto || 0);
    if (montoAd > 0) {
      setRegistraAdelanto(true);
      setAdelantoInput(String(montoAd));
      setMetodoAdelanto((p.metodoAdelanto as any) || 'EFECTIVO');
      setReferenciaAdelanto(p.referenciaAdelanto || '');
    } else {
      setRegistraAdelanto(false);
      setAdelantoInput('');
      setMetodoAdelanto('EFECTIVO');
      setReferenciaAdelanto('');
    }

    // Logística
    setTipoEntrega(p.tipoEntrega || 'PRESENCIAL');
    setAsumeFlete(p.asumeFlete === 'EMPRESA' ? 'EMPRESA' : 'CLIENTE');
    setCostoEnvio(p.costoEnvio ? String(p.costoEnvio) : '5.00');
    setGuiaEnvio(p.guiaEnvio || '');
    setCourier(p.courier || 'Servientrega');
    setDireccionEnvio(p.direccionEnvio || '');
    setCiudadEnvio(p.ciudadEnvio || '');

    if (p.lines && p.lines.length > 0) {
      setLineasPedido(
        p.lines.map((l: any) => ({
          productId: l.productId,
          modelName: l.modelName || 'Modelo',
          color: l.color || '',
          serieNombre: l.serieNombre || 'Serie',
          imageUrl: l.imageUrl || '',
          tallaId: l.tallaId,
          numeroTalla: l.numeroTalla || l.tallaNumero || 38,
          cantidad: l.cantidad,
          precioUnitario: Number(l.precioUnitario),
          tipoVenta: l.tipoVenta || 'SERIE_COMPLETA',
          subtipoSerie: l.subtipoSerie || 'MEDIA_DOCENA',
        }))
      );
    } else {
      setLineasPedido([]);
    }
    setErrorMsg('');
    setShowModal(true);
  };

  const handleAbrirModalEnvio = (p: Pedido) => {
    setPedidoEnvioSeleccionado(p);
    setEnvioModalTipoEntrega(p.tipoEntrega || 'PRESENCIAL');
    setEnvioModalAsumeFlete(p.asumeFlete === 'EMPRESA' ? 'EMPRESA' : 'CLIENTE');
    setEnvioModalCostoEnvio(p.costoEnvio ? String(p.costoEnvio) : '5.00');
    setEnvioModalGuiaEnvio(p.guiaEnvio || '');
    setEnvioModalCourier(p.courier || 'Servientrega');
    setEnvioModalDireccionEnvio(p.direccionEnvio || '');
    setEnvioModalCiudadEnvio(p.ciudadEnvio || '');
    setShowModalEnvio(true);
  };

  const handleGuardarLogisticaEnvio = async () => {
    if (!pedidoEnvioSeleccionado) return;
    setSavingEnvioModal(true);
    try {
      await ApiService.put(`/pedidos/${pedidoEnvioSeleccionado.id}/envio`, {
        tipoEntrega: envioModalTipoEntrega,
        asumeFlete: envioModalTipoEntrega === 'ENVIO' ? envioModalAsumeFlete : 'NO_APLICA',
        costoEnvio: envioModalTipoEntrega === 'ENVIO' ? Number(envioModalCostoEnvio || 0) : 0,
        guiaEnvio: envioModalTipoEntrega === 'ENVIO' ? envioModalGuiaEnvio.trim() || undefined : undefined,
        courier: envioModalTipoEntrega === 'ENVIO' ? envioModalCourier.trim() || undefined : undefined,
        direccionEnvio: envioModalTipoEntrega === 'ENVIO' ? envioModalDireccionEnvio.trim() || undefined : undefined,
        ciudadEnvio: envioModalTipoEntrega === 'ENVIO' ? envioModalCiudadEnvio.trim() || undefined : undefined,
      });

      showToast('¡Logística de entrega actualizada con éxito!', 'success');
      setShowModalEnvio(false);
      setPedidoEnvioSeleccionado(null);
      await loadPedidos();
    } catch (err: any) {
      console.error('Error al actualizar logística:', err);
      showToast(err.message || 'Error al actualizar logística de envío', 'error');
    } finally {
      setSavingEnvioModal(false);
    }
  };

  const handleAbrirModalAdelanto = (p: Pedido) => {
    setPedidoAdelantoSeleccionado(p);
    setModalAdelantoMonto(p.adelanto && Number(p.adelanto) > 0 ? String(p.adelanto) : '');
    setModalAdelantoMetodo((p.metodoAdelanto as any) || 'EFECTIVO');
    setModalAdelantoRef(p.referenciaAdelanto || '');
    setShowModalAdelanto(true);
  };

  const handleGuardarAdelanto = async () => {
    if (!pedidoAdelantoSeleccionado) return;
    const monto = Number(modalAdelantoMonto || 0);
    if (isNaN(monto) || monto < 0) {
      showToast('El monto del anticipo no puede ser negativo', 'error');
      return;
    }
    const total = Number(pedidoAdelantoSeleccionado.montoTotal || 0);
    if (monto > total) {
      showToast(`El anticipo ($${monto.toFixed(2)}) no puede exceder el valor total del pedido ($${total.toFixed(2)})`, 'error');
      return;
    }

    setSavingAdelantoModal(true);
    try {
      await ApiService.put(`/pedidos/${pedidoAdelantoSeleccionado.id}/adelanto`, {
        adelanto: monto,
        metodoAdelanto: monto > 0 ? modalAdelantoMetodo : undefined,
        referenciaAdelanto: monto > 0 ? modalAdelantoRef.trim() || undefined : undefined,
      });

      showToast(monto > 0 ? `¡Anticipo de $${monto.toFixed(2)} registrado correctamente!` : 'Anticipo retirado exitosamente', 'success');
      setShowModalAdelanto(false);
      setPedidoAdelantoSeleccionado(null);
      await loadPedidos();
    } catch (err: any) {
      console.error('Error al actualizar anticipo:', err);
      showToast(err.message || 'Error al actualizar anticipo del pedido', 'error');
    } finally {
      setSavingAdelantoModal(false);
    }
  };

  const handleCrearPedidoOnline = async () => {
    if (!clientId) {
      setErrorMsg('Debes seleccionar un cliente.');
      return;
    }
    if (lineasPedido.length === 0) {
      setErrorMsg('Debes agregar al menos una línea de producto al pedido.');
      return;
    }

    const valorAdelanto = registraAdelanto && Number(adelantoInput) > 0 ? Number(adelantoInput) : 0;

    setCreatingOrder(true);
    setErrorMsg('');
    try {
      const canalMapeado = canalEntrada === 'CATALOGO_DIGITAL' ? 'CATALOGO' : 'MANUAL';
      let notasFinales = notasPedido.trim();
      if (tipoPago === 'CONTADO') {
        const detallePago = `Pago: ${metodoPagoContado}${
          metodoPagoContado !== 'EFECTIVO' && referenciaComprobante
            ? ` - Ref: ${referenciaComprobante.trim()}`
            : ''
        }`;
        notasFinales = notasFinales ? `${detallePago} | ${notasFinales}` : detallePago;
      }

      const payload = {
        clientId,
        canal: canalMapeado,
        tipoPago,
        sucursalId: selectedOrderSucursalId || (activeSucursalId !== 'TODAS' ? activeSucursalId : undefined),
        lineas: lineasPedido.map((l) => ({
          productId: l.productId,
          tallaId: l.tallaId,
          cantidad: l.cantidad,
          tipoVenta: l.tipoVenta,
          precioUnitario: Number(l.precioUnitario),
          observacion: l.observacionModelo || undefined,
        })),
        notas: notasFinales || undefined,
        adelanto: valorAdelanto,
        metodoAdelanto: valorAdelanto > 0 ? metodoAdelanto : undefined,
        referenciaAdelanto: valorAdelanto > 0 && referenciaAdelanto.trim() ? referenciaAdelanto.trim() : undefined,
        tipoEntrega,
        asumeFlete: tipoEntrega === 'ENVIO' ? asumeFlete : 'NO_APLICA',
        costoEnvio: tipoEntrega === 'ENVIO' ? Number(costoEnvio || 0) : 0,
        guiaEnvio: tipoEntrega === 'ENVIO' ? guiaEnvio.trim() || undefined : undefined,
        courier: tipoEntrega === 'ENVIO' ? courier.trim() || undefined : undefined,
        direccionEnvio: tipoEntrega === 'ENVIO' ? direccionEnvio.trim() || undefined : undefined,
        ciudadEnvio: tipoEntrega === 'ENVIO' ? ciudadEnvio.trim() || undefined : undefined,
      };

      if (editingOrderId) {
        await ApiService.put(`/pedidos/${editingOrderId}`, payload);
        showToast('¡Pedido actualizado exitosamente!', 'success');
      } else {
        const res = await ApiService.post('/pedidos', payload);
        // Si se aplicó cupón, registrar el canje
        if (cuponAplicado && cuponAplicado.promocion?.codigo) {
          try {
            await ApiService.post('/clientes/promociones/canjear', {
              codigo: cuponAplicado.promocion.codigo,
            });
          } catch (e) {
            console.warn('Error registrando canje de cupón:', e);
          }
        }

        // Si el cliente tiene teléfono registrado, abrir confirmación por WhatsApp
        const clienteInfo = listaClientes.find((c) => c.id === clientId);
        if (clienteInfo?.telefono) {
          const subtotalTotal = lineasPedido.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
          const descuentoFinal = cuponAplicado ? Number(cuponAplicado.descuentoCalculado || 0) : 0;
          const totalFinal = Math.max(0, subtotalTotal - descuentoFinal);

          const nuevoPedidoObj: Pedido = {
            id: res?.id || 'NUEVO',
            numero: res?.numero,
            numeroCodigo: res?.numeroCodigo,
            clientId,
            clienteNombre: clienteInfo.nombre,
            montoTotal: totalFinal,
            estado: 'PENDIENTE',
            tipoPago,
            adelanto: valorAdelanto,
            metodoAdelanto: valorAdelanto > 0 ? metodoAdelanto : undefined,
            referenciaAdelanto: valorAdelanto > 0 ? referenciaAdelanto : undefined,
            tipoEntrega,
            asumeFlete,
            costoEnvio: Number(costoEnvio || 0),
            guiaEnvio,
            courier,
            direccionEnvio,
            ciudadEnvio,
            createdAt: new Date().toISOString(),
            lines: lineasPedido.map((l) => ({ ...l, subtotal: l.cantidad * l.precioUnitario })),
          };
          handleEnviarConfirmacionWhatsApp(nuevoPedidoObj, clienteInfo.telefono);
        }
      }

      setShowModal(false);
      // Resetear estado
      setEditingOrderId(null);
      setEditingOrderNumero('');
      setClientId('');
      setClienteSeleccionado(null);
      setLineasPedido([]);
      setNotasPedido('');
      setMostrarObservacionGeneral(false);
      setObservacionModeloActual('');
      setMostrarObsModeloActual(false);
      setMetodoPagoContado('EFECTIVO');
      setReferenciaComprobante('');
      setBusquedaCliente('');
      setTipoEntrega('PRESENCIAL');
      setAsumeFlete('CLIENTE');
      setCostoEnvio('5.00');
      setGuiaEnvio('');
      setCourier('Transporte Los Andes');
      setDireccionEnvio('');
      setCiudadEnvio('');
      setCuponAplicado(null);
      setCodigoCuponInput('');
      setCuponErrorMsg('');
      await loadPedidos();
    } catch (err: any) {
      console.error('Error al guardar pedido:', err);
      const msg = err.message || 'Error al guardar el pedido. Verifica el stock o el límite de crédito.';
      setErrorMsg(msg);
      showToast(msg, 'warning', 5000);
    } finally {
      setCreatingOrder(false);
    }
  };

  const loadPedidos = async () => {
    try {
      setLoading(true);
      if (online) {
        const data = await ApiService.get('/pedidos?incluirOtrasSucursales=true');
        setPedidos(data || []);
      } else {
        const local = await db.pedidosOffline.toArray();
        setPedidos(
          local.map((p: any) => ({
            id: p.id || String(p.idLocal),
            clientId: p.clientId,
            montoTotal: p.total || 0,
            estado: 'PENDIENTE' as const,
            tipoPago: p.tipoPago || 'CONTADO',
            createdAt: p.createdAt || new Date().toISOString(),
            lines: p.lineas || [],
          }))
        );
      }
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: EstadoPedido) => {
    setUpdatingId(id);
    try {
      if (online) {
        await ApiService.put(`/pedidos/${id}/estado`, { estado: nuevoEstado });
        showToast(`Pedido actualizado a ${ESTADO_CONFIG[nuevoEstado]?.label || nuevoEstado}`, 'success');
        await loadPedidos();
      } else {
        showToast('Debes estar online para actualizar el estado del pedido.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar estado', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handler: Abrir modal de préstamo inter-sucursal para pedidos EN_ESPERA_STOCK
  const handleAbrirInterSucursal = (pedido: any) => {
    setPedidoInterSucursal(pedido);
    setInterSucursalOrigenId('');
    setResultadoVerificacionStock(null);
    setVerificandoStockInterSucursal(false);
    setInterSucursalModalidad('DEVOLUCION_MERCADERIA');
    setInterSucursalNotas('');
    if (!sucursalesEmpresa || sucursalesEmpresa.length === 0) {
      loadSucursales();
    }
    setModalInterSucursalPedido(true);
  };

  // Handler: Seleccionar sucursal de origen y verificar stock en tiempo real
  const handleSeleccionarSucursalInter = async (sucursalId: string) => {
    setInterSucursalOrigenId(sucursalId);
    setResultadoVerificacionStock(null);
    if (!sucursalId || !pedidoInterSucursal) return;

    setVerificandoStockInterSucursal(true);
    try {
      const res = await ApiService.get(
        `/pedidos/${pedidoInterSucursal.id}/verificar-stock-inter-sucursal/${sucursalId}`
      );
      setResultadoVerificacionStock(res);
    } catch (err: any) {
      showToast(err.message || 'Error al verificar existencias en la sucursal seleccionada', 'error');
    } finally {
      setVerificandoStockInterSucursal(false);
    }
  };

  // Handler: Confirmar y ejecutar préstamo inter-sucursal
  const handleConfirmarInterSucursal = async () => {
    if (!pedidoInterSucursal || !interSucursalOrigenId) {
      showToast('Selecciona la sucursal de origen para el préstamo de mercadería.', 'warning');
      return;
    }
    if (resultadoVerificacionStock && !resultadoVerificacionStock.tieneStockCompleto) {
      showToast('La sucursal seleccionada no dispone del stock suficiente para este calzado.', 'error');
      return;
    }
    setLoadingInterSucursalPedido(true);
    try {
      const res = await ApiService.post(`/pedidos/${pedidoInterSucursal.id}/solicitar-inter-sucursal`, {
        sucursalOrigenId: interSucursalOrigenId,
        modalidad: interSucursalModalidad,
        notas: interSucursalNotas.trim() || undefined,
      });
      showToast(res.message || 'Préstamo inter-sucursal registrado con éxito. El pedido avanzó a Preparación.', 'success');
      setModalInterSucursalPedido(false);
      setPedidoInterSucursal(null);
      setResultadoVerificacionStock(null);
      await loadPedidos();
    } catch (err: any) {
      showToast(err.message || 'Error al solicitar stock inter-sucursal', 'error');
    } finally {
      setLoadingInterSucursalPedido(false);
    }
  };

  // Handler: Abrir modal de cancelación sincronizada
  const handleAbrirCancelarPedido = (p: any) => {
    setPedidoParaCancelar(p);
    setMotivoCancelacion('');
  };

  // Handler: Confirmar anulación y revertir préstamos/reservas de forma sincronizada
  const handleConfirmarCancelarPedido = async () => {
    if (!pedidoParaCancelar) return;
    setLoadingCancelacion(true);
    try {
      await ApiService.put(`/pedidos/${pedidoParaCancelar.id}/estado`, {
        estado: 'CANCELADO',
        motivo: motivoCancelacion.trim() || 'Cancelado por el cliente/usuario',
      });
      const teniaPrestamo = pedidoParaCancelar.notas?.includes('[Préstamo Inter-Sucursal]');
      showToast(
        teniaPrestamo
          ? 'Pedido cancelado. El préstamo fue revertido y el stock sincronizado en la sucursal prestamista.'
          : 'Pedido anulado exitosamente.',
        'success'
      );
      setPedidoParaCancelar(null);
      setMotivoCancelacion('');
      await loadPedidos();
    } catch (err: any) {
      showToast(err.message || 'Error al anular pedido', 'error');
    } finally {
      setLoadingCancelacion(false);
    }
  };

  const handleGuardarOffline = async () => {
    if (!clientId || lineasPedido.length === 0) {
      setErrorMsg('Selecciona un cliente y agrega al menos un producto.');
      return;
    }
    setSavingOffline(true);
    try {
      const totalOffline = lineasPedido.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
      await db.pedidosOffline.add({
        clientId,
        tipoPago,
        lineas: lineasPedido.map((l) => ({
          productId: l.productId,
          serieId: l.serieNombre || 'default',
          tallaId: l.tallaId,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          tipoVenta: l.tipoVenta,
        })),
        total: totalOffline,
        createdAt: Date.now(),
        estadoSync: 'PENDIENTE',
      });

      showToast('Pedido guardado localmente (Offline). Se sincronizará al volver la conexión.', 'info');
      setShowModal(false);
      setClientId('');
      setClienteSeleccionado(null);
      setLineasPedido([]);
      await loadPedidos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar offline');
    } finally {
      setSavingOffline(false);
    }
  };

  const handleAbrirEntrega = async (p: Pedido) => {
    const pedidoTenantId = (p as any).tenantId || (p as any).sucursalId;
    if (pedidoTenantId && miLocalId && pedidoTenantId !== miLocalId && userRole !== 'ROL_SUPER_ADMIN') {
      showToast(`Solo la sucursal asignada a este pedido (${p.sucursalNombre || 'sucursal propietaria'}) puede registrar la entrega física de la mercadería.`, 'warning');
      return;
    }

    let orderToUse = p;
    try {
      if (online) {
        const fresh = await ApiService.get(`/pedidos/${p.id}`);
        if (fresh && fresh.lines) orderToUse = fresh;
      }
    } catch (e) {}

    const productStockDetails: Record<string, any> = {};
    const productIds = Array.from(new Set((orderToUse.lines || []).map((l: any) => l.productId).filter(Boolean)));
    if (online && productIds.length > 0) {
      await Promise.all(
        productIds.map(async (prodId) => {
          try {
            const prod = await ApiService.get(`/inventario/productos/${prodId}`);
            if (prod && prod.id) {
              productStockDetails[prod.id] = prod;
            }
          } catch (err) {
            console.warn(`No se pudo cargar stock en vivo para producto ${prodId}`, err);
          }
        })
      );
    }
    setEntregaProductosStockMap(productStockDetails);

    setPedidoEntregaSeleccionado(orderToUse);
    setEntregaSustitutasMap({});
    setMostrarAlertasInsuficientes(false);
    const initialMap: Record<string, number> = {};
    const initialPrecios: Record<string, string> = {};
    (orderToUse.lines || []).forEach((l: any) => {
      const cantPedida = l.cantidad || 0;
      const cantEntregada = l.cantidadEntregada !== undefined ? l.cantidadEntregada : 0;
      const pendiente = l.cantidadPendiente !== undefined ? l.cantidadPendiente : Math.max(0, cantPedida - cantEntregada);
      const disponible = l.stockFisico !== undefined ? l.stockFisico : (l.stockDisponible !== undefined ? l.stockDisponible : pendiente);
      const sugerido = Math.min(pendiente, Math.max(0, disponible));
      initialMap[l.id] = sugerido;

      const pUnit = l.precioUnitario !== undefined && l.precioUnitario !== null
        ? Number(l.precioUnitario)
        : (l.precio !== undefined ? Number(l.precio) : Number(l.product?.precioVenta || l.product?.salePrice || 0));
      initialPrecios[l.id] = pUnit > 0 ? String(pUnit) : '';
    });
    setEntregaItemsMap(initialMap);
    setEntregaPreciosMap(initialPrecios);
    setShowEntregaModal(true);
  };

  const handleEntregarItems = async () => {
    if (!pedidoEntregaSeleccionado) return;

    const items = Object.entries(entregaItemsMap)
      .map(([lineId, cant]) => ({
        lineId,
        cantidadAEntregar: Number(cant) || 0,
        tallaIdSustituta: entregaSustitutasMap[lineId] || undefined,
        precioUnitario: entregaPreciosMap[lineId] !== undefined && entregaPreciosMap[lineId] !== ''
          ? Number(entregaPreciosMap[lineId])
          : undefined,
      }))
      .filter((i) => i.cantidadAEntregar > 0);

    if (items.length === 0) {
      showToast('Ingresa al menos una cantidad a entregar mayor a 0.', 'warning');
      return;
    }

    setProcesandoEntrega(true);
    try {
      if (online) {
        const res = await ApiService.post(`/pedidos/${pedidoEntregaSeleccionado.id}/entregar-items`, { items });
        showToast(res.message || 'Entrega registrada correctamente. Abriendo WhatsApp...', 'success');
        
        const pedidoActualizado = res.pedido || pedidoEntregaSeleccionado;
        handleEnviarPedidoEntregadoWhatsApp(pedidoActualizado);

        setShowEntregaModal(false);
        setPedidoEntregaSeleccionado(null);
        setEntregaItemsMap({});
        setEntregaPreciosMap({});
        setEntregaSustitutasMap({});
        setMostrarAlertasInsuficientes(false);
        await loadPedidos();
        await loadListaClientes();
      } else {
        showToast('Debes estar online para registrar entregas de pedidos.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al procesar la entrega', 'error');
    } finally {
      setProcesandoEntrega(false);
    }
  };

  const handleAbrirCorregirPrecio = async (p: Pedido) => {
    let orderToUse = p;
    try {
      if (online) {
        const fresh = await ApiService.get(`/pedidos/${p.id}`);
        if (fresh && fresh.lines) orderToUse = fresh;
      }
    } catch (e) {}

    setPedidoACorregir(orderToUse);
    const mapPrecios: Record<string, string> = {};
    (orderToUse.lines || []).forEach((l: any) => {
      const modelKey = (l.modelId ? String(l.modelId) : '') || (l.modelName ? l.modelName.trim().toUpperCase() : '') || String(l.productId || l.id);
      const pUnit = l.precioUnitario !== undefined && l.precioUnitario !== null
        ? Number(l.precioUnitario)
        : (l.precio !== undefined ? Number(l.precio) : Number(l.product?.precioVenta || l.product?.salePrice || 0));
      if (mapPrecios[modelKey] === undefined && pUnit > 0) {
        mapPrecios[modelKey] = String(pUnit);
      }
    });
    setPreciosCorregirMap(mapPrecios);
    setShowCorregirPrecioModal(true);
  };

  const handleGuardarTodasCorreccionesPrecio = async (modelosList: Array<{
    modelKey: string;
    productIds: string[];
    modelName: string;
    totalPares: number;
    precioActual: number;
  }>) => {
    if (!pedidoACorregir) return;

    const itemsAEnviar: Array<{ productIds: string[]; nuevoPrecioUnitario: number }> = [];

    for (const m of modelosList) {
      const valorStr = preciosCorregirMap[m.modelKey] !== undefined
        ? preciosCorregirMap[m.modelKey]
        : (m.precioActual > 0 ? String(m.precioActual) : '');
      const precioNum = parseFloat(valorStr);
      if (isNaN(precioNum) || precioNum <= 0) {
        showToast(`Ingresa un precio válido mayor a 0 para el modelo "${m.modelName}"`, 'warning');
        return;
      }
      itemsAEnviar.push({
        productIds: m.productIds,
        nuevoPrecioUnitario: precioNum,
      });
    }

    if (itemsAEnviar.length === 0) {
      showToast('No se encontraron modelos para actualizar', 'warning');
      return;
    }

    setGuardandoCorreccionPrecio(true);
    try {
      const res = await ApiService.patch(`/pedidos/${pedidoACorregir.id}/corregir-precio`, {
        items: itemsAEnviar,
      });
      showToast(res.message || 'Precios corregidos exitosamente. Se actualizaron saldos y notas de entrega.', 'success');
      setShowCorregirPrecioModal(false);
      setPedidoACorregir(null);
      await loadPedidos();
      await loadListaClientes();
    } catch (err: any) {
      showToast(err.message || 'Error al corregir precios', 'error');
    } finally {
      setGuardandoCorreccionPrecio(false);
    }
  };

  // ── Handlers de Reversión / Corrección de Entrega Errónea (Fase 2) ──
  const handleAbrirRevertirEntrega = async (p: Pedido) => {
    const pedidoTenantId = (p as any).tenantId || (p as any).sucursalId;
    if (pedidoTenantId && miLocalId && pedidoTenantId !== miLocalId && userRole !== 'ROL_SUPER_ADMIN') {
      showToast(`Solo la sucursal asignada a este pedido (${p.sucursalNombre || 'sucursal propietaria'}) puede revertir o corregir entregas.`, 'warning');
      return;
    }

    let orderToUse = p;
    try {
      if (online) {
        const fresh = await ApiService.get(`/pedidos/${p.id}`);
        if (fresh && fresh.lines) orderToUse = fresh;
      }
    } catch (e) {}

    // Auto-sanar pedidos existentes cuyo estado es ENTREGADO pero lines tenían cantidadEntregada en 0
    const linesNormalizadas = (orderToUse.lines || []).map((l: any) => {
      const yaEntregado = (l.cantidadEntregada !== undefined && l.cantidadEntregada !== null && l.cantidadEntregada > 0)
        ? l.cantidadEntregada
        : (orderToUse.estado === 'ENTREGADO' ? l.cantidad : 0);
      return { ...l, cantidadEntregada: yaEntregado };
    });
    orderToUse = { ...orderToUse, lines: linesNormalizadas };

    setPedidoRevertirSeleccionado(orderToUse);
    const initialMap: Record<string, number> = {};
    linesNormalizadas.forEach((l: any) => {
      initialMap[l.id] = 0;
    });
    setRevertirItemsMap(initialMap);
    setMotivoReversion('');
    setConfirmandoReversionPaso(false);
    setShowRevertirEntregaModal(true);
  };

  const handleEjecutarReversionDirecta = async () => {
    if (!pedidoRevertirSeleccionado) return;

    const items = Object.entries(revertirItemsMap)
      .filter(([_, cant]) => Number(cant) > 0)
      .map(([lineId, cantidadARevertir]) => ({
        lineId,
        cantidadARevertir: Number(cantidadARevertir),
      }));

    if (items.length === 0) {
      showToast('Selecciona al menos 1 par para revertir al inventario.', 'warning');
      return;
    }

    const totalPares = items.reduce((acc, it) => acc + it.cantidadARevertir, 0);

    setProcesandoReversion(true);
    try {
      const res = await ApiService.put(`/pedidos/${pedidoRevertirSeleccionado.id}/revertir-entrega`, {
        items,
        motivo: motivoReversion || 'Corrección de entrega errónea',
      });

      showToast(res.message || `Reversión exitosa: se restituyeron ${totalPares} pares al inventario.`, 'success');
      setShowRevertirEntregaModal(false);
      setPedidoRevertirSeleccionado(null);
      setRevertirItemsMap({});
      setMotivoReversion('');
      setConfirmandoReversionPaso(false);
      await loadPedidos();
      await loadListaClientes();
    } catch (err: any) {
      showToast(err.message || 'Error al revertir la entrega errónea', 'error');
    } finally {
      setProcesandoReversion(false);
    }
  };

  // ── Handlers de Devolución de Calzado por Cliente (Fase 3) ──
  const handleAbrirDevolucion = async (p: Pedido) => {
    const pedidoTenantId = (p as any).tenantId || (p as any).sucursalId;
    if (pedidoTenantId && miLocalId && pedidoTenantId !== miLocalId && userRole !== 'ROL_SUPER_ADMIN') {
      showToast(`Solo la sucursal asignada a este pedido (${p.sucursalNombre || 'sucursal propietaria'}) puede registrar devoluciones.`, 'warning');
      return;
    }

    let orderToUse = p;
    try {
      if (online) {
        const fresh = await ApiService.get(`/pedidos/${p.id}`);
        if (fresh && fresh.lines) orderToUse = fresh;
      }
    } catch (e) {}

    const linesNormalizadas = (orderToUse.lines || []).map((l: any) => {
      const yaEntregado = (l.cantidadEntregada !== undefined && l.cantidadEntregada !== null && l.cantidadEntregada > 0)
        ? l.cantidadEntregada
        : (orderToUse.estado === 'ENTREGADO' ? l.cantidad : 0);
      const yaDevuelto = l.cantidadDevuelta || 0;
      const disponible = Math.max(0, yaEntregado - yaDevuelto);
      return { ...l, cantidadEntregada: yaEntregado, cantidadDevuelta: yaDevuelto, disponibleParaDevolver: disponible };
    });

    const hayParesDisponibles = linesNormalizadas.some((l: any) => l.disponibleParaDevolver > 0);
    if (!hayParesDisponibles) {
      showToast('Este pedido no tiene pares entregados disponibles para devolver (o ya fueron devueltos en su totalidad).', 'warning');
      return;
    }

    orderToUse = { ...orderToUse, lines: linesNormalizadas };
    setPedidoDevolucionSeleccionado(orderToUse);

    const initialMap: Record<string, number> = {};
    linesNormalizadas.forEach((l: any) => {
      initialMap[l.id] = 0;
    });
    setDevolucionItemsMap(initialMap);
    setDevolucionDestinoStock('REINGRESO_INVENTARIO');
    setDevolucionMotivo('Defecto de fábrica / Garantía');
    setDevolucionObservacion('');
    setConfirmandoDevolucionPaso(false);
    setShowDevolucionModal(true);
  };

  const handleEjecutarDevolucion = async () => {
    if (!pedidoDevolucionSeleccionado) return;

    const items = Object.entries(devolucionItemsMap)
      .filter(([_, cant]) => Number(cant) > 0)
      .map(([lineId, cantidadADevolver]) => ({
        lineId,
        cantidadADevolver: Number(cantidadADevolver),
      }));

    if (items.length === 0) {
      showToast('Selecciona al menos 1 par para procesar la devolución.', 'warning');
      return;
    }

    const totalPares = items.reduce((acc, it) => acc + it.cantidadADevolver, 0);

    const motivoFinal = devolucionObservacion.trim()
      ? `${devolucionMotivo} - ${devolucionObservacion.trim()}`
      : devolucionMotivo;

    setProcesandoDevolucion(true);
    try {
      const res: any = await ApiService.post(`/pedidos/${pedidoDevolucionSeleccionado.id}/devolucion`, {
        motivo: motivoFinal,
        destinoStock: devolucionDestinoStock,
        items,
      });

      showToast(res.message || `Devolución exitosa: se procesaron ${totalPares} pares.`, 'success');
      setShowDevolucionModal(false);
      setPedidoDevolucionSeleccionado(null);
      setDevolucionItemsMap({});
      setDevolucionObservacion('');
      setConfirmandoDevolucionPaso(false);
      await loadPedidos();
      await loadListaClientes();
    } catch (err: any) {
      showToast(err.message || 'Error al procesar la devolución del cliente', 'error');
    } finally {
      setProcesandoDevolucion(false);
    }
  };

    // ── Identificador del local propio del usuario ─────────
  const miLocalId = useMemo(() => {
    if (activeSucursalId && activeSucursalId !== 'TODAS') return activeSucursalId;
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return u?.tenantId || '';
      } catch {
        return '';
      }
    }
    return '';
  }, [activeSucursalId]);

  // ── Lista Dinámica de Sucursales para Pedidos ─────────
  const listaSucursalesDisponibles = useMemo(() => {
    const map = new Map<string, { id: string; name: string; isMatriz: boolean }>();
    if (sucursalesEmpresa && sucursalesEmpresa.length > 0) {
      sucursalesEmpresa.forEach((s) => map.set(s.id, { id: s.id, name: s.name, isMatriz: !!s.isMatriz }));
    }
    if (sucursales && sucursales.length > 0) {
      sucursales.forEach((s) => {
        if (!map.has(s.id)) map.set(s.id, { id: s.id, name: s.name, isMatriz: !!s.isMatriz });
      });
    }
    pedidos.forEach((p) => {
      const pTenantId = (p as any).tenantId || (p as any).sucursalId;
      if (pTenantId && !map.has(pTenantId)) {
        map.set(pTenantId, {
          id: pTenantId,
          name: p.sucursalNombre || 'Sucursal Adicional',
          isMatriz: false,
        });
      }
    });
    const res = Array.from(map.values());
    if (res.length === 0) {
      res.push({ id: miLocalId || 'matriz', name: 'Matriz Principal', isMatriz: true });
    }

    // Regla obligatoria: La sucursal a la que pertenece el usuario SIEMPRE debe aparecer PRIMERA (extremo izquierdo)
    const miLocalItem = res.find((s) => s.id === miLocalId);
    const otrasSucursales = res.filter((s) => s.id !== miLocalId);

    // El resto de sucursales a la derecha: matriz primero, luego alfabético
    otrasSucursales.sort((a, b) => {
      if (a.isMatriz && !b.isMatriz) return -1;
      if (!a.isMatriz && b.isMatriz) return 1;
      return a.name.localeCompare(b.name);
    });

    return miLocalItem ? [miLocalItem, ...otrasSucursales] : otrasSucursales;
  }, [sucursalesEmpresa, sucursales, pedidos, miLocalId]);

  const pedidosDeSucursal = useMemo(() => {
    if (!selectedSucursalPedidoId) return pedidos;
    const targetSuc = listaSucursalesDisponibles.find((s) => s.id === selectedSucursalPedidoId);
    const esMiLocal = miLocalId && selectedSucursalPedidoId === miLocalId;
    const esSuperAdminSinLocal = userRole === 'ROL_SUPER_ADMIN' && (!miLocalId || activeSucursalId === 'TODAS');

    return pedidos.filter((p) => {
      const pTenant = (p as any).tenantId || (p as any).sucursalId;
      const perteneceATarget = targetSuc?.isMatriz
        ? (pTenant === selectedSucursalPedidoId || !pTenant)
        : (pTenant === selectedSucursalPedidoId);

      if (!perteneceATarget) return false;

      // REGLA FASE 2B:
      // Si estoy viendo mi propio local o soy SuperAdmin global, veo todos los pedidos del local.
      if (esMiLocal || esSuperAdminSinLocal) {
        return true;
      }

      // Si estoy en la pestaña de OTRA sucursal:
      // ÚNICAMENTE puedo ver los pedidos que MI LOCAL creó en esta otra sucursal.
      const pCreadorTenant = (p as any).creadoPorSucursalId;
      return pCreadorTenant && pCreadorTenant === miLocalId;
    });
  }, [pedidos, selectedSucursalPedidoId, listaSucursalesDisponibles, miLocalId, userRole, activeSucursalId]);

  const pedidosFiltrados = useMemo(() => {
    return pedidosDeSucursal.filter((p) => {
      return filtroEstado === 'TODOS' || p.estado === filtroEstado;
    });
  }, [pedidosDeSucursal, filtroEstado]);

  const getNumeroPedido = (p: Pedido, index?: number) => {
    if (p.numeroCodigo) return p.numeroCodigo;
    if (p.numero !== undefined && p.numero !== null) return String(p.numero).padStart(4, '0');
    if (index !== undefined) return String(index + 1).padStart(4, '0');
    return (p.id || '').slice(0, 6).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-xl tracking-tight text-[var(--foreground)]">
            Gestión de Pedidos
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] font-medium">
            Control de flujo operativo, estados de preparación y entrega
          </p>
        </div>

        <button
          onClick={() => {
            setEditingOrderId(null);
            setEditingOrderNumero('');
            setClientId('');
            setClienteSeleccionado(null);
            setLineasPedido([]);
            setNotasPedido('');
            setTipoPago('CONTADO');
            setMetodoPagoContado('EFECTIVO');
            setReferenciaComprobante('');
            const targetSuc = selectedSucursalPedidoId || (activeSucursalId !== 'TODAS' ? activeSucursalId : sucursales?.[0]?.id) || '';
            setSelectedOrderSucursalId(targetSuc);
            cargarCatalogo(targetSuc);
            loadPromociones();
            setCodigoCuponInput('');
            setCuponAplicado(null);
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm shrink-0"
        >
          <Plus size={16} />
          <span>Nuevo Pedido</span>
          {(() => {
            const sucActiva = listaSucursalesDisponibles.find((s) => s.id === selectedSucursalPedidoId);
            const esOtraSucursal = sucActiva && sucActiva.id !== activeSucursalId;
            return sucActiva ? (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${esOtraSucursal ? 'bg-amber-400/30 text-amber-200' : 'bg-emerald-500/30 text-emerald-300'}`}>
                {esOtraSucursal ? '📍 ' : ''}{sucActiva.name}
              </span>
            ) : null;
          })()}
        </button>
      </div>

      {/* Pestañas Dinámicas de Sucursal & Filtros de Estado */}
      <div className="space-y-2.5">
        {/* Pestañas de Sucursal Dinámicas por Nombre (Una pestaña por cada sucursal del negocio) */}
        {listaSucursalesDisponibles.length >= 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted-foreground)] shrink-0 hidden sm:inline-block">
              Sucursal:
            </span>
            <div className="flex p-1 bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl flex-wrap gap-1.5">
              {listaSucursalesDisponibles.map((suc) => {
                const isSelected = selectedSucursalPedidoId === suc.id;
                const isMiLocal = miLocalId === suc.id;
                const countPedidos = pedidos.filter((p) => {
                  const pTenant = (p as any).tenantId || (p as any).sucursalId;
                  const perteneceATarget = suc.isMatriz
                    ? (pTenant === suc.id || !pTenant)
                    : (pTenant === suc.id);

                  if (!perteneceATarget) return false;

                  if (isMiLocal || (userRole === 'ROL_SUPER_ADMIN' && (!miLocalId || activeSucursalId === 'TODAS'))) {
                    return true;
                  }

                  // Pestaña ajena: solo cuenta los pedidos creados por mi local
                  const pCreadorTenant = (p as any).creadoPorSucursalId;
                  return pCreadorTenant && pCreadorTenant === miLocalId;
                }).length;
                const esOtra = !isMiLocal;

                return (
                  <button
                    key={suc.id}
                    type="button"
                    onClick={() => {
                      setSelectedSucursalPedidoId(suc.id);
                      setSelectedOrderSucursalId(suc.id);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? (esOtra ? 'bg-amber-600 text-white shadow-sm font-black ring-2 ring-amber-400/40' : 'bg-[#0F172A] text-white shadow-sm font-black ring-2 ring-slate-400/40')
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
                    }`}
                  >
                    <Building size={13} className={isSelected ? (esOtra ? 'text-amber-200' : 'text-emerald-400') : 'text-slate-400'} />
                    <span>{suc.name}</span>
                    {isMiLocal && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                        isSelected ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        Mi Local
                      </span>
                    )}
                    {esOtra && isSelected && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-amber-400/30 text-amber-100">
                        Otra Sucursal
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                    }`}>
                      {countPedidos}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtros de Estado: autoajustables en la siguiente línea */}
        <div className="flex flex-wrap items-center gap-1.5 w-full pt-0.5">
          <button
            onClick={() => setFiltroEstado('TODOS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filtroEstado === 'TODOS'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Todos ({pedidosDeSucursal.length})
          </button>
          {(['PENDIENTE', 'EN_PREPARACION', 'EN_ESPERA_STOCK', 'ENTREGADO_PARCIAL', 'ENTREGADO', 'CANCELADO'] as EstadoPedido[]).map((st) => {
            const cfg = ESTADO_CONFIG[st];
            const count = pedidosDeSucursal.filter((p) => p.estado === st).length;
            const active = filtroEstado === st;
            return (
              <button
                key={st}
                onClick={() => setFiltroEstado(st)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  active
                    ? `${cfg.color} shadow-xs font-black`
                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {cfg.icon}
                <span>{cfg.label}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner Informativo de Visibilidad Inter-Sucursal Restringida (Fase 2B) */}
      {(() => {
        const targetSuc = listaSucursalesDisponibles.find((s) => s.id === selectedSucursalPedidoId);
        const miSucNombre = listaSucursalesDisponibles.find((s) => s.id === miLocalId)?.name || 'Mi Local';
        const esOtra = miLocalId && selectedSucursalPedidoId !== miLocalId && userRole !== 'ROL_SUPER_ADMIN';

        if (!esOtra || !targetSuc) return null;

        return (
          <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
            <Building size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1">
              <span className="font-extrabold">Vista inter-sucursal restringida: </span>
              <span>
                Estás consultando la sucursal <strong>{targetSuc.name}</strong>. Por política de privacidad operativa, únicamente se muestran los pedidos que tu local (<strong>{miSucNombre}</strong>) ha solicitado o creado en este establecimiento.
              </span>
            </div>
          </div>
        );
      })()}

      {/* Tabla de Pedidos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[#0F172A] mb-2" size={32} />
          <span className="text-sm">Cargando pedidos...</span>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-1">
          <p className="font-bold text-sm text-[var(--foreground)]">
            {(() => {
              const esOtra = miLocalId && selectedSucursalPedidoId !== miLocalId && userRole !== 'ROL_SUPER_ADMIN';
              const targetSuc = listaSucursalesDisponibles.find((s) => s.id === selectedSucursalPedidoId);
              const miSucNombre = listaSucursalesDisponibles.find((s) => s.id === miLocalId)?.name || 'Tu sucursal';
              if (esOtra && targetSuc) {
                return `${miSucNombre} aún no registra pedidos realizados en ${targetSuc.name}.`;
              }
              return 'No hay pedidos registrados con este estado.';
            })()}
          </p>
          <p className="text-xs">
            {miLocalId && selectedSucursalPedidoId !== miLocalId && userRole !== 'ROL_SUPER_ADMIN'
              ? 'Cuando crees un pedido asignando como destino esta sucursal, aparecerá registrado en este panel.'
              : 'Prueba cambiando el filtro de estado o registrando un nuevo pedido.'}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--muted)]/40 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-6 py-4 flex items-center gap-1"><ArrowUpDown size={12} />N° Pedido</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4 text-center">Sucursal / Origen</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4">Tipo Pago</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-right">Fecha</th>
                  <th className="px-6 py-4 text-center">Acciones / Cambiar Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {pedidosFiltrados.map((p, idx) => {
                  const cfg = ESTADO_CONFIG[p.estado] || { label: p.estado, color: 'bg-slate-500/10 text-slate-600', icon: <Clock size={12} /> };
                  const isUpdating = updatingId === p.id;
                  const isExpanded = pedidoExpandidoId === p.id;
                  return (
                    <Fragment key={p.id}>
                      <tr
                        id={`pedido-row-${p.id}`}
                        onClick={() => setPedidoExpandidoId(isExpanded ? null : p.id)}
                        className={`hover:bg-[var(--muted)]/30 transition-all cursor-pointer ${
                          isExpanded
                            ? 'bg-[#0F172A]/5 border-l-4 border-l-blue-600 dark:border-l-blue-400 shadow-2xs'
                            : ''
                        }`}
                      >
                        <td className="px-6 py-4 font-bold">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp size={14} className="text-[#0F172A]" /> : <ChevronDown size={14} className="text-[var(--muted-foreground)]" />}
                            <span>#{getNumeroPedido(p, idx)}</span>
                          </div>
                          <div className="mt-1">
                            {p.tipoEntrega === 'ENVIO' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-extrabold">
                                <Truck size={10} />
                                <span>{p.courier || 'Envío'}</span>
                                {p.ciudadEnvio && <span className="text-blue-500">· {p.ciudadEnvio}</span>}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                                <span>🏪 Presencial</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const cliObj = listaClientes.find((c) => c.id === p.clientId);
                            const nombreCompleto = cliObj?.nombre || p.clienteNombre || (p.clientId ? p.clientId.slice(0, 8).toUpperCase() : 'Consumidor Final');
                            const rep = getClienteReputacion(cliObj);

                            return (
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-xs text-[var(--foreground)] capitalize">{capitalizarNombreCompleto(nombreCompleto)}</span>
                                {cliObj && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border w-fit ${rep.badgeClass}`} title={rep.descripcion}>
                                    <span>{rep.icon}</span>
                                    <span>{rep.label}</span>
                                  </span>
                                )}
                                {p.vendedorNombre && (
                                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                      <User size={10} />
                                      <span>Vendedor: <strong className="font-semibold capitalize">{capitalizarNombreCompleto(p.vendedorNombre)}</strong></span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
                              <Building size={12} className="shrink-0" />
                              <span>{p.sucursalNombre || listaSucursalesDisponibles.find((s) => s.id === (p as any).tenantId)?.name || 'Matriz'}</span>
                            </span>
                            {(p as any).creadoPorSucursalNombre && (p as any).creadoPorSucursalId !== (p as any).tenantId && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15">
                                ↩ Creado desde: {(p as any).creadoPorSucursalNombre}
                              </span>
                            )}
                            {p.vendedorNombre && (p as any).tenantId !== activeSucursalId && (
                              <span className="text-[9px] text-[var(--muted-foreground)] font-medium">
                                por {p.vendedorNombre}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-[var(--muted)] text-[var(--muted-foreground)] rounded text-[10px] font-semibold">{p.tipoPago}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-extrabold text-emerald-600">${Number(p.montoTotal).toFixed(2)}</div>
                          {Number(p.adelanto || 0) > 0 && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                              Anticipo: ${Number(p.adelanto).toFixed(2)}
                            </div>
                          )}
                          {Number(p.adelanto || 0) > 0 && (
                            <div className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                              Saldo: ${Math.max(0, Number(p.montoTotal) - Number(p.adelanto)).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-[10px] text-[var(--muted-foreground)]">
                          {new Date(p.createdAt).toLocaleDateString('es-EC')}
                        </td>
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Botón rápido para gestionar logística de envío */}
                            <button
                              type="button"
                              onClick={() => handleAbrirModalEnvio(p)}
                              className="px-2 py-1 bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-blue-500/20 flex items-center gap-1 cursor-pointer"
                              title="Gestionar Courier, Guía y Flete de este pedido"
                            >
                              <Truck size={12} /> Logística
                            </button>

                            {/* Botón directo para registrar o modificar Anticipo / Adelanto */}
                            {(p.estado === 'PENDIENTE' || p.estado === 'EN_ESPERA_STOCK' || p.estado === 'EN_PREPARACION' || p.estado === 'ENTREGADO_PARCIAL') && (
                              <button
                                type="button"
                                onClick={() => handleAbrirModalAdelanto(p)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                                  Number(p.adelanto || 0) > 0
                                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950'
                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-600 hover:text-white'
                                }`}
                                title={Number(p.adelanto || 0) > 0 ? `Modificar anticipo registrado ($${Number(p.adelanto).toFixed(2)})` : 'Registrar anticipo o abono de dinero'}
                              >
                                <DollarSign size={12} />
                                <span>{Number(p.adelanto || 0) > 0 ? `Anticipo: $${Number(p.adelanto).toFixed(2)}` : '+ Adelanto'}</span>
                              </button>
                            )}

                            {isUpdating ? (
                              <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                                <Loader2 size={12} className="animate-spin text-[#0F172A]" /> Actualizando...
                              </span>
                            ) : p.estado === 'PENDIENTE' || p.estado === 'EN_ESPERA_STOCK' || p.estado === 'EN_PREPARACION' || p.estado === 'ENTREGADO_PARCIAL' ? (
                              <>
                                <button
                                  onClick={() => handleAbrirEditarPedido(p)}
                                  className="px-2.5 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg text-xs font-semibold transition-all border border-amber-500/20 flex items-center gap-1"
                                >
                                  ✏️ Editar
                                </button>
                                {(p.estado === 'PENDIENTE' || p.estado === 'EN_ESPERA_STOCK') && (
                                  <button
                                    onClick={() => handleCambiarEstado(p.id, 'EN_PREPARACION')}
                                    className="px-2.5 py-1 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-blue-600/20 flex items-center gap-1"
                                    title="Marcar como Listo para Preparar en Bodega"
                                  >
                                    <Package size={12} /> Preparar
                                  </button>
                                )}
                                {p.estado === 'EN_ESPERA_STOCK' && (
                                  <button
                                    onClick={() => handleAbrirInterSucursal(p)}
                                    className="px-2.5 py-1 bg-purple-600/10 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-purple-600/20 flex items-center gap-1"
                                    title="Pedir o transferir stock de otra sucursal de la empresa para completar este pedido"
                                  >
                                    <Building size={12} /> Pedir a Otra Sucursal
                                  </button>
                                )}
                                {(() => {
                                  const pTenant = (p as any).tenantId || (p as any).sucursalId;
                                  const esDeMiSucursal = !pTenant || !miLocalId || pTenant === miLocalId || userRole === 'ROL_SUPER_ADMIN';
                                  if (esDeMiSucursal) {
                                    return (
                                      <button
                                        onClick={() => handleAbrirEntrega(p)}
                                        className="px-2.5 py-1 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-emerald-600/20 flex items-center gap-1 cursor-pointer"
                                        title="Entregar pares disponibles en bodega con descuento de inventario"
                                      >
                                        <PackageCheck size={12} /> Entregar
                                      </button>
                                    );
                                  }
                                  return (
                                    <span
                                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-not-allowed opacity-75"
                                      title={`Solo la sucursal asignada (${p.sucursalNombre || 'otra sucursal'}) puede registrar la entrega física de este pedido`}
                                    >
                                      <Lock size={11} /> Entrega en sucursal
                                    </span>
                                  );
                                })()}
                                {p.estado === 'ENTREGADO_PARCIAL' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAbrirDevolucion(p);
                                      }}
                                      className="px-2.5 py-1 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-rose-500/20 flex items-center gap-1 cursor-pointer"
                                      title="Registrar devolución de calzado por garantía, defecto o cambio"
                                    >
                                      <RotateCcw size={12} /> Devolución
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAbrirRevertirEntrega(p);
                                      }}
                                      className="px-2.5 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-amber-500/20 flex items-center gap-1 cursor-pointer"
                                      title="Corregir o revertir pares entregados por error"
                                    >
                                      <RotateCcw size={12} /> Corregir Entrega
                                    </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEnviarPedidoEntregadoWhatsApp(p, undefined, true);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center gap-1"
                                    title="Enviar Comprobante de Entrega por WhatsApp"
                                  >
                                    <MessageCircle size={12} /> WhatsApp
                                  </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleAbrirCancelarPedido(p)}
                                  className="px-2.5 py-1 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-rose-500/20 flex items-center gap-1 cursor-pointer"
                                  title="Anular pedido y revertir automáticamente préstamos o reservas"
                                >
                                  <XCircle size={12} /> Anular
                                </button>
                              </>
                            ) : p.estado === 'ENTREGADO' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle size={13} /> Entregado
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAbrirDevolucion(p);
                                  }}
                                  className="px-2.5 py-1 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-rose-500/20 flex items-center gap-1 cursor-pointer"
                                  title="Registrar devolución de calzado por garantía, defecto o cambio"
                                >
                                  <RotateCcw size={12} /> Devolución
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAbrirRevertirEntrega(p);
                                  }}
                                  className="px-2.5 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-amber-500/20 flex items-center gap-1 cursor-pointer"
                                  title="Revertir o corregir pares entregados por error y restituir al inventario"
                                >
                                  <RotateCcw size={12} /> Corregir Entrega
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAbrirCorregirPrecio(p);
                                  }}
                                  className="px-2.5 py-1 bg-violet-600/10 text-violet-600 hover:bg-violet-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-violet-600/20 flex items-center gap-1"
                                  title="Corregir precio de venta y ajustar notas y cuenta del cliente"
                                >
                                  ✏️ Editar Precio
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEnviarPedidoEntregadoWhatsApp(p, undefined, true);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center gap-1"
                                  title="Enviar Comprobante de Entrega por WhatsApp al Cliente"
                                >
                                  <MessageCircle size={12} /> WhatsApp
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-[var(--muted-foreground)]">Finalizado</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Fila expandible con detalle */}
                      {isExpanded && (
                        <tr className="bg-[#0F172A]/5">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-3">
                              {/* Tarjeta de Logística de Entrega */}
                              <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
                                    <Truck size={18} />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                                      <span>Logística: {p.tipoEntrega === 'ENVIO' ? `🚚 Envío por ${p.courier || 'Transporte'}` : '🏪 Entrega Presencial en Local'}</span>
                                      {p.guiaEnvio && (
                                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-mono">
                                          Guía: {p.guiaEnvio}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                                      {p.tipoEntrega === 'ENVIO' ? (
                                        <>
                                          <span>Destino: {p.ciudadEnvio || 'No especificada'} {p.direccionEnvio ? `(${p.direccionEnvio})` : ''}</span>
                                          <span className="mx-1.5">·</span>
                                          <span>Flete: {p.asumeFlete === 'EMPRESA' ? `🟢 Asume Empresa ($${Number(p.costoEnvio || 0).toFixed(2)})` : '🔵 Cobro en Destino (Paga Cliente)'}</span>
                                        </>
                                      ) : (
                                        <span>El cliente retira directamente en el mostrador del local comercial.</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAbrirModalEnvio(p);
                                  }}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                                >
                                  <Truck size={13} />
                                  <span>Modificar Envío / Guía</span>
                                </button>
                              </div>

                              {/* Tarjeta de Anticipo Registrado / Botón para Gestionar Anticipo */}
                              <div className={`p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border ${
                                Number(p.adelanto || 0) > 0
                                  ? 'bg-amber-500/10 border-amber-500/30'
                                  : 'bg-[var(--card)] border-[var(--border)]'
                              }`}>
                                <div className="flex items-center gap-2.5">
                                  <div className={`p-2 rounded-xl font-black ${
                                    Number(p.adelanto || 0) > 0
                                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                      : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                                  }`}>
                                    <DollarSign size={16} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-black ${
                                        Number(p.adelanto || 0) > 0
                                          ? 'text-amber-900 dark:text-amber-200'
                                          : 'text-[var(--foreground)]'
                                      }`}>
                                        {Number(p.adelanto || 0) > 0
                                          ? `Anticipo / Adelanto Recibido: $${Number(p.adelanto).toFixed(2)}`
                                          : 'Sin anticipo registrado'}
                                      </span>
                                      {Number(p.adelanto || 0) > 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold text-[10px]">
                                          {p.metodoAdelanto || 'EFECTIVO'}{p.referenciaAdelanto ? ` · Ref: ${p.referenciaAdelanto}` : ''}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-[var(--muted-foreground)] block mt-0.5">
                                      {Number(p.adelanto || 0) > 0
                                        ? `Saldo restante a cobrar al entregar: $${Math.max(0, Number(p.montoTotal) - Number(p.adelanto)).toFixed(2)}`
                                        : 'Puedes registrar un abono o anticipo entregado por el cliente antes de realizar la entrega'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                  {(p.estado === 'PENDIENTE' || p.estado === 'EN_ESPERA_STOCK' || p.estado === 'EN_PREPARACION' || p.estado === 'ENTREGADO_PARCIAL') && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAbrirModalAdelanto(p);
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                                        Number(p.adelanto || 0) > 0
                                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      }`}
                                    >
                                      <DollarSign size={13} />
                                      <span>{Number(p.adelanto || 0) > 0 ? 'Modificar Anticipo' : '+ Registrar Anticipo'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="font-bold text-xs text-[var(--foreground)]">
                                    📦 Detalle de Artículos Solicitados — #{getNumeroPedido(p, idx)}
                                  </span>
                                  {p.vendedorNombre && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[10px] font-semibold">
                                      <User size={10} />
                                      <span>Vendedor: {p.vendedorNombre}</span>
                                    </span>
                                  )}
                                  {activeSucursalId === 'TODAS' && p.sucursalNombre && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] font-semibold">
                                      <Building size={10} />
                                      <span>Sucursal: {p.sucursalNombre}</span>
                                    </span>
                                  )}
                                </div>
                                {online && p.clientId && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEnviarConfirmacionWhatsApp(p, undefined, true);
                                    }}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                                    title="Notificar recepción del pedido al cliente por WhatsApp"
                                  >
                                    <MessageCircle size={13} />
                                    <span>Notificar por WhatsApp</span>
                                  </button>
                                )}
                              </div>
                              {/* Tarjetas compactas agrupadas por modelo / variante con foto y pastillas de tallas */}
                              <div className="mt-2">
                                {(() => {
                                  const grupos = agruparLineasPorModelo(p.lines || []);
                                  if (grupos.length === 0) {
                                    return <span className="text-[var(--muted-foreground)] text-xs italic">Sin líneas de detalle</span>;
                                  }

                                  return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {grupos.map((g) => (
                                        <div
                                          key={g.key}
                                          className="p-3 bg-[var(--card)] dark:bg-slate-900/60 border border-[var(--border)] rounded-2xl flex items-start gap-3 shadow-2xs hover:border-slate-400 transition-all"
                                        >
                                          {/* Miniatura del calzado */}
                                          <div
                                            onClick={() => {
                                              if (g.imageUrl) setLightboxImage({ url: g.imageUrl, title: `${g.modelName} (${g.color || ''})` });
                                            }}
                                            className={`w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center ${g.imageUrl ? 'cursor-zoom-in hover:opacity-90' : ''}`}
                                            title={g.imageUrl ? "Ver foto ampliada del calzado" : ""}
                                          >
                                            {g.imageUrl ? (
                                              <img src={g.imageUrl} alt={g.modelName} className="w-full h-full object-cover" />
                                            ) : (
                                              <Package className="text-slate-400" size={22} />
                                            )}
                                          </div>

                                          {/* Detalle del modelo y pastillas de tallas */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-1">
                                              <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider truncate">
                                                  {g.color ? `${g.color} · ${formatearNombreSerie(g.serieNombre)}` : formatearNombreSerie(g.serieNombre)}
                                                </div>
                                                <h4 className="font-extrabold text-xs text-[var(--foreground)] truncate">
                                                  {g.modelName}
                                                </h4>
                                              </div>

                                              {/* Badge de Volumen / Al por mayor */}
                                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0 ${
                                                g.totalPares >= 6
                                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                              }`}>
                                                {g.etiquetaVolumen}
                                              </span>
                                            </div>

                                            {/* Pastillas de tallas estilo inventario (T38: 2, T39: 3...) */}
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                              {g.tallas.map((t) => (
                                                <span
                                                  key={t.numero}
                                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-[10px] font-bold"
                                                >
                                                  <span>T{t.numero}:</span>
                                                  <span className="font-black text-rose-900 dark:text-rose-100">{t.cantidad}</span>
                                                  {t.cantidadEntregada > 0 && (
                                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold ml-0.5">
                                                      (✓{t.cantidadEntregada})
                                                    </span>
                                                  )}
                                                </span>
                                              ))}
                                            </div>

                                            {/* Subtotal del modelo */}
                                            <div className="mt-2 pt-1 border-t border-[var(--border)]/60 flex items-center justify-between text-[11px]">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-[var(--muted-foreground)] text-[10px]">
                                                  ${g.precioUnitario.toFixed(2)} c/u
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAbrirCorregirPrecio(p);
                                                  }}
                                                  className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline font-bold cursor-pointer"
                                                  title="Modificar precio de este modelo y actualizar saldos de cuenta"
                                                >
                                                  ✏️ Editar
                                                </button>
                                              </div>
                                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                Total: ${g.subtotal.toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
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
      )}

      {/* MODAL CREAR / EDITAR PEDIDO */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowModal(false); setEditingOrderId(null); resetPedidoForm(); }, isDirtyOrder()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowModal(false); setEditingOrderId(null); resetPedidoForm(); }, isDirtyOrder()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-4xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal Estandarizado */}
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {editingOrderId ? `Editar Pedido #${editingOrderNumero || editingOrderId.slice(0, 6).toUpperCase()}` : 'Registrar Nuevo Pedido'}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {editingOrderId ? 'Modifica los datos del pedido y líneas de calzado' : 'Selecciona el cliente y agrega las series o tallas'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
              {!online && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs rounded-xl flex items-center gap-2">
                  <span>📡 Modo Offline: El pedido se guardará localmente y se sincronizará cuando vuelva la conexión.</span>
                </div>
              )}

              {/* 1. SECCIÓN CLIENTE & PAGO */}
              <div className="p-4 bg-[var(--muted)]/20 rounded-xl border border-[var(--border)] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">1. Datos del Cliente & Pago</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative sm:col-span-2">
                    <div className="mb-1">
                      <label className="block text-xs font-semibold text-[var(--muted-foreground)]">Cliente *</label>
                    </div>
                    {clienteSeleccionado ? (() => {
                      const repSel = getClienteReputacion(clienteSeleccionado);

                      return (
                        <div className="p-3 bg-[#0F172A]/5 border border-[var(--border)] rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-[#0F172A]/10 text-[#0F172A] flex items-center justify-center text-sm font-black">
                                {(clienteSeleccionado.nombre || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-extrabold text-sm text-[var(--foreground)]">{clienteSeleccionado.nombre}</div>
                                {clienteSeleccionado.cedula && <div className="text-[10px] text-[var(--muted-foreground)]">C.I / RUC: {clienteSeleccionado.cedula}</div>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setClienteSeleccionado(null);
                                setClientId('');
                                setBusquedaCliente('');
                                setBusquedaDebounced('');
                                setAlertaPedidoDuplicado(null);
                                setIgnoroAlertaDuplicado(false);
                                setTipoPago('CONTADO');
                              }}
                              className="text-xs font-semibold text-red-500 hover:underline"
                            >
                              Cambiar
                            </button>
                          </div>

                          {/* Alerta / Insignia de Reputación del Cliente */}
                          <div className={`px-3 py-2 rounded-lg border flex items-center justify-between text-xs ${repSel.badgeClass}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-base">{repSel.icon}</span>
                              <div>
                                <span className="font-extrabold block">{repSel.label}</span>
                                <span className="text-[10px] opacity-80">{repSel.descripcion}</span>
                              </div>
                            </div>
                            {clienteSeleccionado.creditoDisponible !== undefined && clienteSeleccionado.creditoDisponible > 0 && (
                              <div className="text-right">
                                <span className="text-[9px] opacity-75 block">Cupo Crédito:</span>
                                <span className="font-extrabold font-mono text-xs">${Number(clienteSeleccionado.creditoDisponible).toFixed(2)}</span>
                              </div>
                            )}
                          </div>

                          {/* Alerta de Pedido Activo / Duplicado en Curso (Fase 2B) */}
                          {alertaPedidoDuplicado && (
                            <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 text-xs transition-all ${
                              ignoroAlertaDuplicado
                                ? 'bg-amber-500/5 border-amber-500/20 text-amber-800 dark:text-amber-300'
                                : 'bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-100 shadow-sm'
                            }`}>
                              <div className="flex items-start gap-2.5">
                                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                                      ⚠️ Pedido Vigente en Proceso Detectado
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${ESTADO_CONFIG[alertaPedidoDuplicado.pedidoExistente.estado]?.color || 'bg-amber-100 text-amber-800'}`}>
                                      {ESTADO_CONFIG[alertaPedidoDuplicado.pedidoExistente.estado]?.label || alertaPedidoDuplicado.pedidoExistente.estado}
                                    </span>
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-[var(--foreground)]">
                                    El cliente <strong>{alertaPedidoDuplicado.cliente.nombre}</strong> ya tiene el pedido <strong>{getNumeroPedido(alertaPedidoDuplicado.pedidoExistente)}</strong> registrado el {new Date(alertaPedidoDuplicado.pedidoExistente.createdAt).toLocaleDateString()} ({alertaPedidoDuplicado.pedidoExistente.sucursalNombre ? `en ${alertaPedidoDuplicado.pedidoExistente.sucursalNombre}` : 'en el local'}) por <strong>${Number(alertaPedidoDuplicado.pedidoExistente.montoTotal || 0).toFixed(2)}</strong>.
                                  </p>
                                  <p className="text-[10px] text-[var(--muted-foreground)]">
                                    {ignoroAlertaDuplicado
                                      ? '✓ Continuaste con la creación de un nuevo pedido independiente. Si agregas los mismos modelos o tallas, recibirás una advertencia.'
                                      : 'Si el cliente desea pares adicionales, es recomendable añadirlos a este pedido existente para evitar duplicar comprobantes o envíos.'}
                                  </p>
                                </div>
                              </div>

                              {!ignoroAlertaDuplicado && (
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/25">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const pedidoAEditar = alertaPedidoDuplicado.pedidoExistente;
                                      setAlertaPedidoDuplicado(null);
                                      setIgnoroAlertaDuplicado(false);
                                      handleAbrirEditarPedido(pedidoAEditar);
                                      showToast(`Cargado pedido ${getNumeroPedido(pedidoAEditar)} para añadir calzado adicional.`, 'info');
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition-all"
                                  >
                                    <ExternalLink size={13} />
                                    <span>Ver / Añadir a este pedido existente</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIgnoroAlertaDuplicado(true);
                                      showToast('Continuando con la creación de un nuevo pedido independiente.', 'info');
                                    }}
                                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/30 rounded-lg font-bold text-xs cursor-pointer transition-all"
                                  >
                                    Crear pedido nuevo independiente
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Sugerencia de Venta al Contado por Historial de Mora */}
                          {(repSel.tipo === 'MOROSO' || repSel.tipo === 'RIESGO' || (clienteSeleccionado.atrasoConsecutivo ?? 0) > 0) && (
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-lg flex items-start gap-2 text-xs text-rose-900 dark:text-rose-200 animate-in fade-in duration-150">
                              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-black block text-rose-700 dark:text-rose-300">
                                  💡 Sugerencia del Sistema: Venta de Contado
                                </span>
                                <span className="text-[11px] opacity-90 leading-tight block">
                                  El cliente registra antecedentes de atraso o morosidad en compras previas. Se sugiere realizar la venta de <strong>CONTADO</strong> o solicitar anticipo. (La opción de crédito sigue habilitada si usted decide autorizarla).
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div>
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder="Escribe apellido, nombre o número de cédula..."
                              value={busquedaCliente}
                              onChange={(e) => {
                                setBusquedaCliente(e.target.value);
                                setShowDropdownCliente(true);
                              }}
                              onFocus={() => {
                                if (listaClientes.length === 0) loadListaClientes();
                                setShowDropdownCliente(true);
                              }}
                              className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] pr-24"
                            />
                            {esperandoDebounce && (
                              <span className="absolute right-3 top-2.5 text-[10px] text-amber-600 flex items-center gap-1 font-semibold animate-pulse">
                                <Loader2 size={12} className="animate-spin" /> Buscando en 3s...
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowNuevoClienteModal(true)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer h-[38px]"
                            title="Registrar nuevo cliente"
                          >
                            <UserPlus size={14} />
                            <span className="hidden sm:inline">Nuevo</span>
                          </button>
                        </div>

                        {showDropdownCliente && busquedaCliente.trim().length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto">
                            {listaClientes
                              .filter((c) => {
                                const q = (busquedaDebounced || busquedaCliente).toLowerCase().trim();
                                if (!q) return false;
                                return (
                                  c.nombre.toLowerCase().includes(q) ||
                                  (c.cedula && c.cedula.toLowerCase().includes(q)) ||
                                  (c.telefono && c.telefono.toLowerCase().includes(q))
                                );
                              })
                              .slice(0, 10)
                              .map((c) => {
                                const repItem = getClienteReputacion(c);

                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setClientId(c.id);
                                      setClienteSeleccionado(c);
                                      setShowDropdownCliente(false);
                                      verificarPedidoActivoCliente(c);
                                      // Preselección inteligente de forma de pago según nivel crediticio
                                      const tieneCredito = c.nivelCredito && c.nivelCredito !== 'SIN_CREDITO' && Number(c.limiteCredito || 0) > 0;
                                      setTipoPago(tieneCredito ? 'CREDITO' : 'CONTADO');
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-[#0F172A]/10 transition-colors border-b border-[var(--border)] last:border-none flex justify-between items-center gap-2"
                                  >
                                    <div>
                                      <span className="font-bold block text-[var(--foreground)]">{c.nombre}</span>
                                      {c.cedula && <span className="text-[10px] text-[var(--muted-foreground)]">C.I: {c.cedula}</span>}
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border ${repItem.badgeClass}`}>
                                      <span>{repItem.icon}</span>
                                      <span>{repItem.label}</span>
                                    </span>
                                  </button>
                                );
                              })}
                            {busquedaDebounced.trim().length > 0 &&
                              listaClientes.filter((c) => {
                                const q = busquedaDebounced.toLowerCase().trim();
                                if (!q) return false;
                                return (
                                  c.nombre.toLowerCase().includes(q) ||
                                  (c.cedula && c.cedula.toLowerCase().includes(q)) ||
                                  (c.telefono && c.telefono.toLowerCase().includes(q))
                                );
                              }).length === 0 && (
                                <div className="p-4 text-center space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                                  <p className="text-xs text-[var(--muted-foreground)]">
                                    No se encontraron clientes con "{busquedaDebounced}".
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowDropdownCliente(false);
                                      setShowNuevoClienteModal(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                                  >
                                    <UserPlus size={14} />
                                    <span>Registrar a "{busquedaCliente}" como Nuevo Cliente</span>
                                  </button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Tipo de Pago *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)] min-h-[42px] items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoPago('CONTADO');
                          if (cuponAplicado?.promocion && cuponAplicado.promocion.aplicaPara === 'SOLO_CREDITO') {
                            setCuponAplicado(null);
                            setCuponErrorMsg('El cupón se removió automáticamente: solo es válido para compras a Crédito.');
                          }
                        }}
                        className={`h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          tipoPago === 'CONTADO'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
                        }`}
                      >
                        <DollarSign size={13} />
                        <span>Contado</span>
                      </button>
                      {(() => {
                        const clienteSinCredito = !clienteSeleccionado || !clienteSeleccionado.nivelCredito || clienteSeleccionado.nivelCredito === 'SIN_CREDITO' || Number(clienteSeleccionado.limiteCredito || 0) <= 0;
                        return (
                          <div className="relative group flex-1">
                            <button
                              type="button"
                              disabled={clienteSinCredito}
                              onClick={() => {
                                if (clienteSinCredito) return;
                                setTipoPago('CREDITO');
                                if (cuponAplicado?.promocion && cuponAplicado.promocion.aplicaPara === 'SOLO_CONTADO') {
                                  setCuponAplicado(null);
                                  setCuponErrorMsg('El cupón se removió automáticamente: solo es válido para pagos de Contado.');
                                }
                              }}
                              className={`w-full h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                clienteSinCredito
                                  ? 'opacity-40 cursor-not-allowed text-[var(--muted-foreground)]'
                                  : tipoPago === 'CREDITO'
                                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs cursor-pointer'
                                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] cursor-pointer'
                              }`}
                            >
                              <CreditCard size={13} />
                              <span>Crédito</span>
                              {clienteSinCredito && <span className="text-[9px]">🔒</span>}
                            </button>
                            {clienteSinCredito && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 font-semibold">
                                {!clienteSeleccionado ? 'Selecciona un cliente primero' : 'Cliente sin crédito asignado'}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Canal de Venta</label>
                    <select
                      value={canalEntrada}
                      onChange={(e) => setCanalEntrada(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] min-h-[42px]"
                    >
                      <option value="VENTA_DIRECTA">Venta Directa</option>
                      <option value="POS">POS Mostrador</option>
                      <option value="CATALOGO_DIGITAL">Catálogo Digital / WhatsApp</option>
                    </select>
                  </div>

                  {/* Selector Elegante de Sucursal de Emisión y Despacho (Pestañas tipo píldora, sin menú desplegable) */}
                  {listaSucursalesDisponibles.length > 1 ? (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1 flex items-center gap-1.5">
                        <Building size={12} className="text-emerald-500" />
                        <span>Sucursal de Emisión y Despacho</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 p-1 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)] min-h-[42px] items-center">
                        {listaSucursalesDisponibles.map((s) => {
                          const currentSelected = selectedOrderSucursalId || selectedSucursalPedidoId || (activeSucursalId !== 'TODAS' ? activeSucursalId : s.id);
                          const isSel = currentSelected === s.id;
                          const isMiLocal = s.id === activeSucursalId;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedOrderSucursalId(s.id);
                                setSelectedProductId('');
                                setProductoSeleccionadoObj(null);
                                setBusquedaModelo('');
                                setPrecioItem(0);
                                setPrecioItemInput('');
                                setTallaCantidadesMap({});
                                cargarCatalogo(s.id);
                              }}
                              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-[#0F172A] text-white shadow-xs font-black'
                                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
                              }`}
                            >
                              <Building size={13} className={isSel ? 'text-emerald-400' : 'text-slate-400'} />
                              <span>{s.name}</span>
                              {isMiLocal ? (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                  isSel ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                }`}>
                                  Mi Local
                                </span>
                              ) : (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                  isSel ? 'bg-amber-400/30 text-amber-200' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                }`}>
                                  Otra
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : listaSucursalesDisponibles.length === 1 ? (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1 flex items-center gap-1.5">
                        <Building size={12} className="text-emerald-500" />
                        <span>Sucursal de Emisión</span>
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--foreground)] min-h-[42px]">
                        <Building size={14} className="text-emerald-500" />
                        <span>{listaSucursalesDisponibles[0].name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Local Actual
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Detalle de Pago de Contado */}
                  {tipoPago === 'CONTADO' && (
                    <div className="sm:col-span-2 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Detalle del Cobro de Contado
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                            Método de Pago *
                          </label>
                          <select
                            value={metodoPagoContado}
                            onChange={(e) => setMetodoPagoContado(e.target.value as any)}
                            className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                          >
                            <option value="EFECTIVO">💵 Efectivo (Caja)</option>
                            <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                            <option value="DEPOSITO">📥 Depósito Bancario</option>
                            <option value="CHEQUE">📝 Cheque</option>
                          </select>
                        </div>

                        {/* Campo de Referencia: Solo visible cuando NO es efectivo (ej. Transferencia) */}
                        {metodoPagoContado !== 'EFECTIVO' ? (
                          <div>
                            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                              N° Comprobante / Referencia / Banco *
                            </label>
                            <input
                              type="text"
                              placeholder="Ej. Transf #12948 Banco Pichincha"
                              value={referenciaComprobante}
                              onChange={(e) => setReferenciaComprobante(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center text-[11px] text-[var(--muted-foreground)] pt-6 italic">
                            Pago en efectivo registrado en caja automáticamente al entregar.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 1.1 SECCIÓN DE ANTICIPO / ADELANTO DE DINERO */}
                  <div className="sm:col-span-2 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-amber-600" />
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                          ¿El cliente deja un Adelanto / Anticipo de Dinero?
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !registraAdelanto;
                          setRegistraAdelanto(nextState);
                          if (!nextState) {
                            setAdelantoInput('');
                            setReferenciaAdelanto('');
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                          registraAdelanto
                            ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-amber-500'
                        }`}
                      >
                        {registraAdelanto ? '✓ Sí, con anticipo' : '+ Registrar Anticipo'}
                      </button>
                    </div>

                    {registraAdelanto && (
                      <div className="pt-2 border-t border-amber-500/20 space-y-3 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                              Monto del Adelanto ($) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="Ej: 200.00"
                              value={adelantoInput}
                              onChange={(e) => setAdelantoInput(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--card)] border border-amber-500/40 rounded-xl text-xs font-black text-amber-900 dark:text-amber-200 focus:outline-none focus:border-amber-600 font-mono"
                              required={registraAdelanto}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                              Método de Anticipo *
                            </label>
                            <select
                              value={metodoAdelanto}
                              onChange={(e) => setMetodoAdelanto(e.target.value as any)}
                              className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-600"
                            >
                              <option value="EFECTIVO">💵 Efectivo</option>
                              <option value="TRANSFERENCIA">🏦 Transferencia</option>
                              <option value="DEPOSITO">📥 Depósito</option>
                              <option value="CHEQUE">📝 Cheque</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                              N° Comprobante / Ref. (Opcional)
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Transf #99321"
                              value={referenciaAdelanto}
                              onChange={(e) => setReferenciaAdelanto(e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-600"
                            />
                          </div>
                        </div>

                        {/* Resumen de cálculo en tiempo real */}
                        {(() => {
                          const subtotalActual = lineasPedido.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
                          const montoAd = Number(adelantoInput || 0);
                          const saldoRestanteCalc = Math.max(0, subtotalActual - montoAd);

                          return (
                            <div className="p-2.5 bg-[var(--card)] border border-amber-500/20 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                              <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                                <span>Total Pedido:</span>
                                <span className="font-bold text-[var(--foreground)]">${subtotalActual.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                <span>Anticipo:</span>
                                <span>-${montoAd.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-black">
                                <span>Saldo a Cobrar al Entregar:</span>
                                <span className="text-sm font-mono">${saldoRestanteCalc.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Observación General del Pedido (Compacta y Opcional) */}
                  <div className="sm:col-span-2 pt-1">
                    {!mostrarObservacionGeneral && !notasPedido ? (
                      <button
                        type="button"
                        onClick={() => setMostrarObservacionGeneral(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[#0F172A] hover:bg-[var(--card)] transition-all cursor-pointer"
                      >
                        <FileText size={13} />
                        <span>+ Agregar Observación General del Pedido</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider flex items-center gap-1">
                            <FileText size={12} />
                            <span>Observación General del Pedido (Opcional)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setNotasPedido('');
                              setMostrarObservacionGeneral(false);
                            }}
                            className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                          >
                            ✕ Quitar / Cerrar
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          placeholder="Instrucciones generales de entrega, empaque o solicitud del cliente (opcional)..."
                          value={notasPedido}
                          onChange={(e) => setNotasPedido(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. SECCIÓN AGREGAR PRODUCTO, MODELO Y TALLA */}
              <div className="p-4 bg-[var(--muted)]/20 rounded-xl border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
                    2. Seleccionar Modelo, Talla y Cantidad
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span>👟 Catálogo de Calzado</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative sm:col-span-2">
                    {/* Header de Selección de Modelo con Píldoras de Filtro por Serie */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-semibold text-[var(--muted-foreground)]">
                        Modelo / Producto * (Buscar por Nombre o Color)
                      </label>

                      {/* Botones / Píldoras de Series Dinámicas */}
                      {(() => {
                        const seriesUnicas = Array.from(
                          new Set(
                            catalogoProductos
                              .map((p) => p.serieNombre?.trim())
                              .filter((s): s is string => Boolean(s && s.length > 0))
                          )
                        ).sort();

                        if (seriesUnicas.length === 0) return null;

                        return (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
                            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase mr-0.5 shrink-0">
                              Series:
                            </span>
                            {seriesUnicas.map((ser) => {
                              const isActiva = serieFiltroBuscador.toLowerCase() === ser.toLowerCase();
                              const count = catalogoProductos.filter(
                                (p) => (p.serieNombre || '').toLowerCase() === ser.toLowerCase()
                              ).length;

                              return (
                                <button
                                  key={ser}
                                  type="button"
                                  onClick={() => {
                                    const nueva = isActiva ? 'TODAS' : ser;
                                    setSerieFiltroBuscador(nueva);
                                    if (busquedaModelo.trim().length > 0) {
                                      setShowDropdownModelo(true);
                                    } else {
                                      setShowDropdownModelo(false);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                    isActiva
                                      ? 'bg-emerald-600 text-white shadow-xs border border-emerald-500 font-black'
                                      : 'bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]'
                                  }`}
                                  title={`Filtrar variantes de serie ${ser}`}
                                >
                                  <span>{formatearNombreSerie(ser)}</span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${isActiva ? 'bg-white/20 text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {productoSeleccionadoObj ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl gap-3">
                        <div className="flex items-center gap-3">
                          {productoSeleccionadoObj.imageUrl ? (
                            <img src={productoSeleccionadoObj.imageUrl} alt="" className="w-12 h-12 object-cover rounded-lg border border-[var(--border)] shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[var(--muted)]/50 flex items-center justify-center text-lg shrink-0">👟</div>
                          )}
                          <div>
                            <div className="font-extrabold text-sm text-[var(--foreground)]">
                              {productoSeleccionadoObj.modelName} — {productoSeleccionadoObj.color}
                            </div>
                            <div className="text-[11px] font-semibold text-emerald-700">
                              Serie: {formatearNombreSerie(productoSeleccionadoObj.serieNombre)}
                            </div>
                          </div>
                        </div>

                        {/* Resumen de Stock Disponible a un ladito */}
                        {(() => {
                          const totalPares = (productoSeleccionadoObj.tallas || []).reduce(
                            (sum: number, t: any) => sum + (t.cantidad ?? t.stock ?? 0),
                            0
                          );
                          const mediasDocenas = Math.floor(totalPares / 6);
                          const docenas = Math.floor(totalPares / 12);

                          return (
                            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-500/20">
                              <div className="text-left sm:text-right">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
                                  Stock Disponible en Bodega:
                                </span>
                                <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                                  {totalPares > 0 ? (
                                    <>
                                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-xs font-black">
                                        {totalPares} pares
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-800 rounded text-[10px] font-bold">
                                        ½ {mediasDocenas} doc.
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-800 rounded text-[10px] font-bold">
                                        1 {docenas} doc.
                                      </span>
                                    </>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-md text-xs font-bold">
                                      🔴 Sin Stock (Bajo Pedido)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setProductoSeleccionadoObj(null);
                                  setSelectedProductId('');
                                  setBusquedaModelo('');
                                  setPrecioItem(0);
                                  setPrecioItemInput('');
                                }}
                                className="text-xs font-bold text-red-500 hover:underline shrink-0"
                              >
                                Cambiar
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative flex items-center">
                          <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder={
                              serieFiltroBuscador !== 'TODAS'
                                ? `Serie ${serieFiltroBuscador} activa: escribe modelo o color...`
                                : "Buscar calzado por modelo, color o código (ej. Mocasín, Botín, Negro)..."
                            }
                            value={busquedaModelo}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBusquedaModelo(val);
                              setShowDropdownModelo(val.trim().length > 0);
                            }}
                            onFocus={() => {
                              if (busquedaModelo.trim().length > 0) {
                                setShowDropdownModelo(true);
                              }
                            }}
                            className="w-full pl-10 pr-9 py-2.5 bg-[var(--card)] border-2 border-[var(--border)] hover:border-[#0F172A] focus:border-[#0F172A] rounded-xl text-xs font-semibold focus:outline-none shadow-xs transition-all"
                          />
                          {busquedaModelo.trim().length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setBusquedaModelo('');
                                setShowDropdownModelo(false);
                              }}
                              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-black cursor-pointer p-0.5 rounded-full hover:bg-[var(--muted)]"
                              title="Limpiar búsqueda"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {serieFiltroBuscador !== 'TODAS' && busquedaModelo.trim().length === 0 && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                            <span>💡</span>
                            <span>Serie <strong>{serieFiltroBuscador}</strong> lista. Ingresa letras o el nombre en el buscador para ver los modelos.</span>
                          </p>
                        )}

                        {showDropdownModelo && busquedaModelo.trim().length > 0 && (() => {
                          const q = busquedaModelo.toLowerCase().trim();
                          const listaModelosFiltradosYOrdenados = catalogoProductos
                            .filter((p) => {
                              // Filtro por Serie Seleccionada (si no es TODAS)
                              if (serieFiltroBuscador !== 'TODAS') {
                                const coincideSerie = (p.serieNombre || '').toLowerCase().trim() === serieFiltroBuscador.toLowerCase().trim();
                                if (!coincideSerie) return false;
                              }
                              // Filtro por coincidencia de texto (letra, letras o palabra)
                              if (!q) return false;
                              return (
                                (p.modelName || '').toLowerCase().includes(q) ||
                                (p.color && p.color.toLowerCase().includes(q)) ||
                                (p.serieNombre && p.serieNombre.toLowerCase().includes(q)) ||
                                (p.code && p.code.toLowerCase().includes(q))
                              );
                            })
                            .sort((a, b) => {
                              // 1. Primero: orden alfabético por nombre del modelo
                              const cmpModelo = (a.modelName || '').localeCompare(b.modelName || '', 'es', { sensitivity: 'base' });
                              if (cmpModelo !== 0) return cmpModelo;

                              // 2. Si son variantes del mismo modelo, ordenar de más vendidas a menos vendidas
                              const ventasA = ventasPorVarianteMap.get(a.id) || 0;
                              const ventasB = ventasPorVarianteMap.get(b.id) || 0;

                              if (ventasB !== ventasA) {
                                return ventasB - ventasA; // Más vendidas primero
                              }

                              // Desempate: orden alfabético por color
                              return (a.color || '').localeCompare(b.color || '', 'es', { sensitivity: 'base' });
                            });

                          return (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                              {listaModelosFiltradosYOrdenados.length > 0 ? (
                                listaModelosFiltradosYOrdenados.map((p) => {
                                  const totalPares = (p.tallas || []).reduce(
                                    (sum: number, t: any) => sum + (t.cantidad ?? t.stock ?? 0),
                                    0
                                  );
                                  const docenas = Math.floor(totalPares / 12);
                                  const mediasDocenas = Math.floor(totalPares / 6);
                                  const ventasTotal = ventasPorVarianteMap.get(p.id) || 0;

                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => handleSeleccionarProducto(p)}
                                      className="w-full text-left px-3 py-2.5 text-xs hover:bg-[#0F172A]/10 transition-colors border-b border-[var(--border)] last:border-none flex items-center justify-between gap-3 font-bold text-[var(--foreground)] cursor-pointer"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        {p.imageUrl ? (
                                          <img src={p.imageUrl} alt="" className="w-10 h-10 object-cover rounded-lg border border-[var(--border)] shrink-0" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-lg bg-[var(--muted)]/50 flex items-center justify-center text-sm shrink-0">👟</div>
                                        )}
                                        <div className="min-w-0">
                                          <span className="block font-bold text-[var(--foreground)] truncate">{p.modelName}</span>
                                          <div className="flex items-center gap-2 text-[10px] mt-0.5 flex-wrap">
                                            <span className="text-[var(--muted-foreground)] font-medium">
                                              Color: <strong className="text-[var(--foreground)]">{p.color}</strong>
                                            </span>
                                            <span className="text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                              Serie: {formatearNombreSerie(p.serieNombre)}
                                            </span>
                                            {ventasTotal > 0 && (
                                              <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                🔥 {ventasTotal} {ventasTotal === 1 ? 'par vendido' : 'pares vendidos'}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        {totalPares > 0 ? (
                                          <>
                                            <span className="text-xs font-black text-emerald-600 block">{totalPares} pares</span>
                                            <span className="text-[9px] text-[var(--muted-foreground)] block">
                                              ({docenas} doc. / {mediasDocenas} ½ doc.)
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-[10px] font-bold text-rose-500">0 pares</span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="p-3 text-center text-xs text-[var(--muted-foreground)]">
                                  No se encontraron modelos {serieFiltroBuscador !== 'TODAS' ? `en serie "${serieFiltroBuscador}"` : ''} que coincidan con "{busquedaModelo}".
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Selector de Modalidad de Venta con BOTONES */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Modalidad de Venta *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoVentaItem('SERIE_COMPLETA');
                          if (productoSeleccionadoObj?.tallas) {
                            const mejorCurva = detectarMejorCurvaSegunStock(productoSeleccionadoObj.serieNombre, productoSeleccionadoObj.tallas);
                            const map = calcularCurvaParaTallas(productoSeleccionadoObj.serieNombre, productoSeleccionadoObj.tallas, mejorCurva);
                            setTallaCantidadesMap(map);
                          }
                        }}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          tipoVentaItem === 'SERIE_COMPLETA'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-emerald-500'
                        }`}
                      >
                        <span>📦</span>
                        <span>Serie Completa (Docena / ½ Doc.)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTipoVentaItem('TALLA_ESPECIFICA');
                          if (productoSeleccionadoObj?.tallas) {
                            const map: Record<string, number> = {};
                            productoSeleccionadoObj.tallas.forEach((t: any) => {
                              const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                              map[key] = 0;
                            });
                            setTallaCantidadesMap(map);
                          }
                        }}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          tipoVentaItem === 'TALLA_ESPECIFICA'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-emerald-500'
                        }`}
                      >
                        <span>👟</span>
                        <span>Por Talla (Numeración)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTipoVentaItem('SERIE_ESPECIAL');
                          const sObj = listaSeriesDisponibles.find((s) => s.id === serieEspecialId) || listaSeriesDisponibles[0];
                          if (sObj?.tallas) {
                            const mejorCurva = detectarMejorCurvaSegunStock(sObj.nombre, sObj.tallas);
                            const map = calcularCurvaParaTallas(sObj.nombre, sObj.tallas, mejorCurva);
                            setTallaCantidadesMap(map);
                          }
                        }}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          tipoVentaItem === 'SERIE_ESPECIAL'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-emerald-500'
                        }`}
                      >
                        <span>⭐</span>
                        <span>Pedido Especial / Otra Serie</span>
                      </button>
                    </div>
                  </div>

                  {/* Alerta de Stock Inter-Sucursal si existe */}
                  {productoSeleccionadoObj && stockInterSucursalResult.length > 0 && (
                    <div className="sm:col-span-2">
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                            <span>⚡ Disponibilidad Inter-Sucursal (Otras Sucursales)</span>
                          </span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                            {stockInterSucursalResult.length} sucursal(es) con stock
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {stockInterSucursalResult.map((res: any) => (
                            <div key={res.sucursalId} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl gap-2 text-xs">
                              <div>
                                <span className="font-extrabold text-[var(--foreground)] block">{res.sucursalNombre}</span>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                                  <span>Color: <strong className="text-[var(--foreground)]">{res.color}</strong></span>
                                  <span>• Total: <strong className="text-emerald-700 dark:text-emerald-300">{res.stockTotal} pares</strong></span>
                                  <span>({res.tallasDisponibles.map((t: any) => `#${t.talla}: ${t.cantidad}p`).join(', ')})</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAgregarInterSucursal(res)}
                                className="px-3 py-1.5 bg-[#0F172A] hover:bg-black text-white text-xs font-bold rounded-lg transition-colors shrink-0 shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>📦 Despachar de {res.sucursalNombre}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Componente Estándar ModelTallaCurvaCard para Configurar y Agregar Modelo al Pedido */}
                  <div className="sm:col-span-2">
                    {productoSeleccionadoObj ? (() => {
                      const prodObj = productoSeleccionadoObj;
                      const tallasList = tipoVentaItem === 'SERIE_ESPECIAL'
                        ? (listaSeriesDisponibles.find((s) => s.id === serieEspecialId)?.tallas || [
                            { id: 't-esp-38', numero: 38 },
                            { id: 't-esp-39', numero: 39 },
                            { id: 't-esp-40', numero: 40 },
                            { id: 't-esp-41', numero: 41 },
                            { id: 't-esp-42', numero: 42 },
                          ])
                        : (prodObj.tallas || []).slice().sort((a: any, b: any) => (Number(a.numero ?? a.nombre) || 0) - (Number(b.numero ?? b.nombre) || 0));

                      const totalParesConfig = tallasList.reduce((sum: number, t: any) => {
                        const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                        return sum + (tallaCantidadesMap[key] || 0);
                      }, 0);

                      const subtotalConfig = totalParesConfig * (precioItem || 0);
                      const mediasDocenasCount = totalParesConfig / 6;
                      const docenasCount = totalParesConfig / 12;
                      const docenasLabel = totalParesConfig === 6
                        ? '½ Docena'
                        : totalParesConfig === 12
                        ? '1 Docena'
                        : totalParesConfig > 0 && totalParesConfig % 12 === 0
                        ? `${docenasCount} Docenas`
                        : totalParesConfig > 0 && totalParesConfig % 6 === 0
                        ? `${mediasDocenasCount} Medias Docenas`
                        : `${totalParesConfig} pares`;

                      const serieNombreDisplay = formatearNombreSerie(
                        tipoVentaItem === 'SERIE_ESPECIAL'
                          ? listaSeriesDisponibles.find((s) => s.id === serieEspecialId)?.nombre || 'Serie Especial'
                          : prodObj.serieNombre || 'ADULTO'
                      );

                      return (
                        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-3">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Lado Izquierdo: Miniatura, Datos del Modelo y Curva de Tallas */}
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              {prodObj.imageUrl ? (
                                <img src={prodObj.imageUrl} alt="" className="w-12 h-12 object-cover rounded-xl border border-[var(--border)] shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-[var(--muted)]/50 flex items-center justify-center text-lg shrink-0 border border-[var(--border)]">
                                  👟
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-sm text-[var(--foreground)] uppercase tracking-wide">
                                    {prodObj.modelName}
                                  </span>
                                  <span className="text-xs text-[var(--muted-foreground)] font-medium">
                                    {prodObj.color}
                                  </span>
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                    Serie: {serieNombreDisplay}
                                  </span>
                                </div>

                                {/* Selector de serie alternativa para Pedido Especial */}
                                {tipoVentaItem === 'SERIE_ESPECIAL' && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <label className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                                      Serie a Solicitar:
                                    </label>
                                    <select
                                      value={serieEspecialId}
                                      onChange={(e) => {
                                        const newSerieId = e.target.value;
                                        setSerieEspecialId(newSerieId);
                                        const sObj = listaSeriesDisponibles.find((s) => s.id === newSerieId);
                                        if (sObj?.tallas) {
                                          const map: Record<string, number> = {};
                                          sObj.tallas.forEach((t: any) => {
                                            map[t.id || `t-${t.numero}`] = 1;
                                          });
                                          setTallaCantidadesMap(map);
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-bold focus:outline-none focus:border-purple-600"
                                    >
                                      {listaSeriesDisponibles.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.nombre.replace(/_/g, ' ')}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {/* Curva de Tallas con Pills Estandarizadas */}
                                <div className="mt-2.5 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {tallasList.map((t: any) => {
                                      const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                                      const qty = tallaCantidadesMap[key] || 0;
                                      const stockBodega = t.cantidad ?? t.stock ?? 0;

                                      return (
                                        <div
                                          key={key}
                                          className={`flex items-center gap-1 rounded-xl border px-2 py-1 shadow-2xs transition-all ${
                                            qty > 0
                                              ? 'bg-[var(--card)] border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/20'
                                              : 'bg-[var(--card)] border-[var(--border)] opacity-70'
                                          }`}
                                        >
                                          <span className="text-[var(--foreground)] font-extrabold text-xs font-mono">
                                            T{t.numero ?? t.nombre}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setTallaCantidadesMap({
                                                  ...tallaCantidadesMap,
                                                  [key]: Math.max(0, qty - 1),
                                                });
                                              }}
                                              className="w-5 h-5 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded text-xs font-black transition-colors cursor-pointer"
                                              title={`Restar 1 par T${t.numero ?? t.nombre}`}
                                            >
                                              −
                                            </button>
                                            <span className="w-5 text-center text-xs font-bold font-mono text-[var(--foreground)]">
                                              {qty}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setTallaCantidadesMap({
                                                  ...tallaCantidadesMap,
                                                  [key]: qty + 1,
                                                });
                                              }}
                                              className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded text-xs font-black transition-colors cursor-pointer"
                                              title={`Sumar 1 par T${t.numero ?? t.nombre}`}
                                            >
                                              +
                                            </button>
                                          </div>
                                          {tipoVentaItem !== 'SERIE_ESPECIAL' && (
                                            <span className="text-[9px] text-[var(--muted-foreground)] ml-0.5 font-medium">
                                              ({stockBodega}p)
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Acciones Rápidas: Media Docena Serie A / B con Validación y Recomendación de Stock */}
                                  {(() => {
                                    const evalStock = tipoVentaItem !== 'SERIE_ESPECIAL'
                                      ? evaluarDisponibilidadMedias(serieNombreDisplay, tallasList)
                                      : null;

                                    return (
                                      <div className="space-y-1.5 pt-0.5">
                                        {evalStock && evalStock.mensajeAdvertencia && (
                                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                                            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                                            <span>{evalStock.mensajeAdvertencia}</span>
                                          </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (evalStock && !evalStock.mediaADisponible) {
                                                showToast(
                                                  evalStock.mensajeAdvertencia ||
                                                  `No hay stock suficiente para Serie A. ${evalStock.mediaBDisponible ? `Solo queda disponible la Serie B (${evalStock.maxMediasB} disp.).` : 'No hay medias completas disponibles.'}`,
                                                  'warning'
                                                );
                                              }
                                              const curva = calcularCurvaParaTallas(serieNombreDisplay, tallasList, 'MEDIA_A');
                                              const newMap: Record<string, number> = { ...tallaCantidadesMap };
                                              tallasList.forEach((t: any) => {
                                                const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                                                newMap[key] = (newMap[key] || 0) + (curva[key] || 0);
                                              });
                                              setTallaCantidadesMap(newMap);
                                            }}
                                            className={`px-2.5 py-1 border rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                              evalStock && !evalStock.mediaADisponible
                                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                                : evalStock?.recomendacion === 'SOLO_A'
                                                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 border-emerald-500 ring-2 ring-emerald-500/30'
                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                            }`}
                                            title={evalStock ? `Disponibles en bodega: ${evalStock.maxMediasA} media(s) A` : undefined}
                                          >
                                            <span>+ ½ Doc A</span>
                                            {evalStock && evalStock.maxMediasA !== 99 && (
                                              <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${evalStock.mediaADisponible ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'}`}>
                                                {evalStock.maxMediasA} disp
                                              </span>
                                            )}
                                            {evalStock?.recomendacion === 'SOLO_A' && (
                                              <span className="text-[9px] bg-emerald-600 text-white px-1 rounded uppercase font-black">
                                                Recomendada
                                              </span>
                                            )}
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (evalStock && !evalStock.mediaBDisponible) {
                                                showToast(
                                                  evalStock.mensajeAdvertencia ||
                                                  `No hay stock suficiente para Serie B. ${evalStock.mediaADisponible ? `Solo queda disponible la Serie A (${evalStock.maxMediasA} disp.).` : 'No hay medias completas disponibles.'}`,
                                                  'warning'
                                                );
                                              }
                                              const curva = calcularCurvaParaTallas(serieNombreDisplay, tallasList, 'MEDIA_B');
                                              const newMap: Record<string, number> = { ...tallaCantidadesMap };
                                              tallasList.forEach((t: any) => {
                                                const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                                                newMap[key] = (newMap[key] || 0) + (curva[key] || 0);
                                              });
                                              setTallaCantidadesMap(newMap);
                                            }}
                                            className={`px-2.5 py-1 border rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                              evalStock && !evalStock.mediaBDisponible
                                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                                : evalStock?.recomendacion === 'SOLO_B'
                                                ? 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-800 dark:text-teal-200 border-teal-500 ring-2 ring-teal-500/30'
                                                : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/20'
                                            }`}
                                            title={evalStock ? `Disponibles en bodega: ${evalStock.maxMediasB} media(s) B` : undefined}
                                          >
                                            <span>+ ½ Doc B</span>
                                            {evalStock && evalStock.maxMediasB !== 99 && (
                                              <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${evalStock.mediaBDisponible ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'}`}>
                                                {evalStock.maxMediasB} disp
                                              </span>
                                            )}
                                            {evalStock?.recomendacion === 'SOLO_B' && (
                                              <span className="text-[9px] bg-teal-600 text-white px-1 rounded uppercase font-black">
                                                Recomendada
                                              </span>
                                            )}
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              const curva = calcularCurvaParaTallas(serieNombreDisplay, tallasList, 'MEDIA_A');
                                              const newMap: Record<string, number> = { ...tallaCantidadesMap };
                                              tallasList.forEach((t: any) => {
                                                const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                                                newMap[key] = Math.max(0, (newMap[key] || 0) - (curva[key] || 0));
                                              });
                                              setTallaCantidadesMap(newMap);
                                            }}
                                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                          >
                                            − ½ Doc A
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              const curva = calcularCurvaParaTallas(serieNombreDisplay, tallasList, 'MEDIA_B');
                                              const newMap: Record<string, number> = { ...tallaCantidadesMap };
                                              tallasList.forEach((t: any) => {
                                                const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                                                newMap[key] = Math.max(0, (newMap[key] || 0) - (curva[key] || 0));
                                              });
                                              setTallaCantidadesMap(newMap);
                                            }}
                                            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                          >
                                            − ½ Doc B
                                          </button>

                                          <span className="text-[11px] text-[var(--muted-foreground)] font-mono font-medium ml-1">
                                            = {totalParesConfig} pares total
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Línea de Observación para este Modelo */}
                                  <div className="pt-1">
                                    {!mostrarObsModeloActual && !observacionModeloActual ? (
                                      <button
                                        type="button"
                                        onClick={() => setMostrarObsModeloActual(true)}
                                        className="text-[11px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <Plus size={11} />
                                        <span>Agregar observación a este modelo</span>
                                      </button>
                                    ) : (
                                      <div className="flex items-center gap-2 p-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl">
                                        <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase shrink-0">
                                          📝 Obs:
                                        </span>
                                        <input
                                          type="text"
                                          placeholder="Ej: Suela especial, hebilla dorada, cuero café mate..."
                                          value={observacionModeloActual}
                                          onChange={(e) => setObservacionModeloActual(e.target.value)}
                                          className="flex-1 px-2.5 py-1 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] focus:outline-none focus:border-emerald-600"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setObservacionModeloActual('');
                                            setMostrarObsModeloActual(false);
                                          }}
                                          className="text-[10px] font-bold text-rose-500 hover:underline shrink-0 cursor-pointer"
                                        >
                                          ✕ Quitar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Lado Derecho: Resumen, Precio, Subtotal y Botón de Agregar */}
                            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[var(--border)] shrink-0 min-w-[200px]">
                              <div className="text-left lg:text-right">
                                <div className="text-xs font-black text-[var(--foreground)]">
                                  {totalParesConfig} pares <span className="text-[11px] font-medium text-[var(--muted-foreground)] font-mono">({docenasLabel})</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 justify-start lg:justify-end">
                                  <span className="text-xs font-bold text-[var(--muted-foreground)]">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    disabled={!puedeCambiarPrecio}
                                    value={precioItemInput}
                                    onChange={(e) => {
                                      let valStr = e.target.value;
                                      if (valStr.length > 1 && valStr.startsWith('0') && valStr[1] !== '.') {
                                        valStr = valStr.replace(/^0+/, '');
                                      }
                                      setPrecioItemInput(valStr);
                                      const parsed = parseFloat(valStr);
                                      setPrecioItem(isNaN(parsed) ? 0 : parsed);
                                    }}
                                    className={`w-20 px-2 py-1 border rounded-lg text-xs font-bold text-center focus:outline-none ${
                                      !puedeCambiarPrecio
                                        ? 'bg-[var(--muted)]/40 border-[var(--border)] text-[var(--muted-foreground)] cursor-not-allowed'
                                        : 'bg-[var(--card)] border-[var(--border)] focus:border-emerald-600 text-[var(--foreground)]'
                                    }`}
                                  />
                                  <span className="text-[11px] text-[var(--muted-foreground)] font-medium">/ par</span>
                                </div>

                                {/* Sugerencia Inmediata del Último Precio Vendido al Cliente */}
                                {ultimoPrecioCliente !== null && (
                                  <div className="mt-1 flex flex-col items-start lg:items-end gap-0.5">
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[10px] font-black shadow-2xs">
                                      <span>💡 Vendido antes: ${ultimoPrecioCliente.toFixed(2)}/par</span>
                                      {sucursalUltimaVenta && (
                                        <span className="font-semibold text-[9px] text-amber-700 dark:text-amber-300">({sucursalUltimaVenta})</span>
                                      )}
                                    </div>
                                    {precioItem !== ultimoPrecioCliente && puedeCambiarPrecio && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPrecioItem(ultimoPrecioCliente);
                                          setPrecioItemInput(String(ultimoPrecioCliente));
                                        }}
                                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                                        title="Re-aplicar el precio al que se le vendió anteriormente este modelo"
                                      >
                                        <span>👉 Usar ${ultimoPrecioCliente.toFixed(2)} sugerido</span>
                                      </button>
                                    )}
                                  </div>
                                )}

                                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  ${subtotalConfig.toFixed(2)}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={handleAgregarLinea}
                                disabled={totalParesConfig === 0}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>Agregar al Pedido</span>
                              </button>
                            </div>
                          </div>

                          {/* Info de último precio al cliente si aplica */}
                          {ultimoPrecioCliente !== null && selectedProductId && clientId && (
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between gap-2 text-xs animate-in fade-in duration-200">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-600 text-sm shrink-0">💡</span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-bold text-emerald-800 dark:text-emerald-200">
                                    Último precio a este cliente:
                                  </span>
                                  <span className="font-black text-emerald-700 dark:text-emerald-300 font-mono text-sm">
                                    ${ultimoPrecioCliente.toFixed(2)}
                                  </span>
                                  {sucursalUltimaVenta && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold text-[10px]">
                                      · {sucursalUltimaVenta}
                                    </span>
                                  )}
                                  {fechaUltimaVenta && (
                                    <span className="text-emerald-600/80 dark:text-emerald-400/80 font-mono text-[11px]">
                                      ({fechaUltimaVenta})
                                    </span>
                                  )}
                                </div>
                              </div>
                              {precioItem !== ultimoPrecioCliente && puedeCambiarPrecio && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrecioItem(ultimoPrecioCliente);
                                    setPrecioItemInput(String(ultimoPrecioCliente));
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                                  title="Aplicar el último precio vendido a este cliente"
                                >
                                  Usar ${ultimoPrecioCliente.toFixed(2)}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="p-6 text-center border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--card)]/50">
                        <span className="text-2xl block mb-1">👟</span>
                        <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                          Busca y selecciona un modelo de calzado arriba para configurar su curva de tallas y agregarlo al pedido.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. TABLA DE PRODUCTOS EN EL PEDIDO (Agrupado compacto por modelo en Serie Completa) */}
              {lineasPedido.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase">
                      Resumen del Pedido ({lineasPedido.length} renglones de tallas)
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600">
                      Total: ${lineasPedido.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Render de ítems agrupados compactos */}
                    {(() => {
                      // Agrupar por productId y tipoVenta
                      const grupos: { [key: string]: typeof lineasPedido } = {};
                      lineasPedido.forEach((l) => {
                        const key = `${l.productId}_${l.tipoVenta}`;
                        if (!grupos[key]) grupos[key] = [];
                        grupos[key].push(l);
                      });

                      return Object.entries(grupos).map(([key, lineas]) => {
                        const primerItem = lineas[0];
                        const totalPares = lineas.reduce((acc, l) => acc + l.cantidad, 0);
                        const subtotalGrupo = lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
                        const sortedLineas = [...lineas].sort((a, b) => (a.numeroTalla || 0) - (b.numeroTalla || 0));

                        return (
                          <div key={key} className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {primerItem.imageUrl ? (
                                <img src={primerItem.imageUrl} alt="" className="w-12 h-12 object-cover rounded-xl border border-[var(--border)] shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-[var(--muted)]/50 flex items-center justify-center text-lg shrink-0">👟</div>
                              )}

                              <div className="min-w-0">
                                <div className="font-extrabold text-sm text-[var(--foreground)] truncate">
                                  {primerItem.modelName}
                                </div>
                                <div className="text-xs text-[var(--muted-foreground)]">
                                  {primerItem.color} · <span className="font-semibold text-emerald-600">Serie: {formatearNombreSerie(primerItem.serieNombre)}</span>
                                </div>

                                {/* Chips de Tallas Interactivos y Editables con diseño estandarizado (Photo 1) */}
                                <div className="mt-2.5 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {sortedLineas.map((l, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-2 py-1 shadow-2xs"
                                      >
                                        <span className="text-[var(--foreground)] font-extrabold text-xs font-mono">T{l.numeroTalla}</span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const nuevasLineas = [...lineasPedido];
                                              const idx = nuevasLineas.findIndex(
                                                (item) => item.productId === l.productId && item.tallaId === l.tallaId
                                              );
                                              if (idx !== -1) {
                                                if (nuevasLineas[idx].cantidad > 1) {
                                                  nuevasLineas[idx].cantidad -= 1;
                                                  setLineasPedido(nuevasLineas);
                                                } else {
                                                  setLineasPedido(nuevasLineas.filter((_, itemIdx) => itemIdx !== idx));
                                                }
                                              }
                                            }}
                                            className="w-5 h-5 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded text-xs font-black transition-colors cursor-pointer"
                                            title={`Quitar 1 par T${l.numeroTalla}`}
                                          >
                                            −
                                          </button>
                                          <span className="w-6 text-center text-xs font-bold font-mono text-[var(--foreground)]">
                                            {l.cantidad}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const nuevasLineas = [...lineasPedido];
                                              const idx = nuevasLineas.findIndex(
                                                (item) => item.productId === l.productId && item.tallaId === l.tallaId
                                              );
                                              if (idx !== -1) {
                                                nuevasLineas[idx].cantidad += 1;
                                                setLineasPedido(nuevasLineas);
                                              }
                                            }}
                                            className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded text-xs font-black transition-colors cursor-pointer"
                                            title={`Agregar 1 par T${l.numeroTalla}`}
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const curva = getCurvaDocena(primerItem.serieNombre || '', 'MEDIA_A');
                                        const hasCurva = Object.keys(curva).length > 0;
                                        const nuevasLineas = lineasPedido.map(item => {
                                          if (item.productId === primerItem.productId) {
                                            const num = Number(item.numeroTalla);
                                            const qty = hasCurva ? (curva[num] ?? 0) : 1;
                                            return { ...item, cantidad: item.cantidad + qty };
                                          }
                                          return item;
                                        });
                                        setLineasPedido(nuevasLineas);
                                      }}
                                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                    >
                                      + ½ Doc A
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const curva = getCurvaDocena(primerItem.serieNombre || '', 'MEDIA_B');
                                        const hasCurva = Object.keys(curva).length > 0;
                                        const nuevasLineas = lineasPedido.map(item => {
                                          if (item.productId === primerItem.productId) {
                                            const num = Number(item.numeroTalla);
                                            const qty = hasCurva ? (curva[num] ?? 0) : 1;
                                            return { ...item, cantidad: item.cantidad + qty };
                                          }
                                          return item;
                                        });
                                        setLineasPedido(nuevasLineas);
                                      }}
                                      className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                    >
                                      + ½ Doc B
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const curva = getCurvaDocena(primerItem.serieNombre || '', 'MEDIA_A');
                                        const hasCurva = Object.keys(curva).length > 0;
                                        const nuevasLineas = lineasPedido
                                          .map(item => {
                                            if (item.productId === primerItem.productId) {
                                              const num = Number(item.numeroTalla);
                                              const qty = hasCurva ? (curva[num] ?? 0) : 1;
                                              return { ...item, cantidad: Math.max(0, item.cantidad - qty) };
                                            }
                                            return item;
                                          })
                                          .filter(item => item.cantidad > 0);
                                        setLineasPedido(nuevasLineas);
                                      }}
                                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                    >
                                      − ½ Doc A
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const curva = getCurvaDocena(primerItem.serieNombre || '', 'MEDIA_B');
                                        const hasCurva = Object.keys(curva).length > 0;
                                        const nuevasLineas = lineasPedido
                                          .map(item => {
                                            if (item.productId === primerItem.productId) {
                                              const num = Number(item.numeroTalla);
                                              const qty = hasCurva ? (curva[num] ?? 0) : 1;
                                              return { ...item, cantidad: Math.max(0, item.cantidad - qty) };
                                            }
                                            return item;
                                          })
                                          .filter(item => item.cantidad > 0);
                                        setLineasPedido(nuevasLineas);
                                      }}
                                      className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                    >
                                      − ½ Doc B
                                    </button>
                                    <span className="text-[11px] text-[var(--muted-foreground)] font-mono font-medium ml-1">
                                      = {totalPares} pares total
                                    </span>
                                  </div>

                                  {/* Observación específica de este modelo en el resumen */}
                                  {primerItem.observacionModelo ? (
                                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-between gap-2 text-xs">
                                      <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 min-w-0">
                                        <span className="font-extrabold text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 shrink-0">📝 Nota:</span>
                                        <span className="truncate text-[11px] font-medium">{primerItem.observacionModelo}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nuevasLineas = lineasPedido.map(item => {
                                            if (item.productId === primerItem.productId) {
                                              return { ...item, observacionModelo: undefined };
                                            }
                                            return item;
                                          });
                                          setLineasPedido(nuevasLineas);
                                        }}
                                        className="text-[10px] font-bold text-rose-500 hover:underline shrink-0 cursor-pointer"
                                        title="Eliminar observación de este modelo"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : editingObservacionProductId === primerItem.productId ? (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <input
                                        type="text"
                                        autoFocus
                                        value={tempObservacionText}
                                        onChange={(e) => setTempObservacionText(e.target.value)}
                                        placeholder="Ej: hebilla dorada, suela especial..."
                                        className="text-xs px-2.5 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg flex-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            const nuevasLineas = lineasPedido.map(item => {
                                              if (item.productId === primerItem.productId) {
                                                return { ...item, observacionModelo: tempObservacionText.trim() || undefined };
                                              }
                                              return item;
                                            });
                                            setLineasPedido(nuevasLineas);
                                            setEditingObservacionProductId(null);
                                            setTempObservacionText('');
                                          } else if (e.key === 'Escape') {
                                            setEditingObservacionProductId(null);
                                            setTempObservacionText('');
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nuevasLineas = lineasPedido.map(item => {
                                            if (item.productId === primerItem.productId) {
                                              return { ...item, observacionModelo: tempObservacionText.trim() || undefined };
                                            }
                                            return item;
                                          });
                                          setLineasPedido(nuevasLineas);
                                          setEditingObservacionProductId(null);
                                          setTempObservacionText('');
                                        }}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                      >
                                        Guardar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingObservacionProductId(null);
                                          setTempObservacionText('');
                                        }}
                                        className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="mt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingObservacionProductId(primerItem.productId);
                                          setTempObservacionText('');
                                        }}
                                        className="text-[10px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <Plus size={10} />
                                        <span>Agregar observación a este modelo</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                              <div className="text-right">
                                <div className="text-xs font-bold text-[var(--foreground)]">
                                  {totalPares} pares ({primerItem.tipoVenta === 'SERIE_COMPLETA' ? (primerItem.subtipoSerie === 'MEDIA_DOCENA' ? '½ Docena' : '1 Docena') : 'Numeración'})
                                </div>
                                <div className="text-[11px] text-[var(--muted-foreground)]">
                                  ${primerItem.precioUnitario.toFixed(2)} / par
                                </div>
                                <div className="text-sm font-extrabold text-emerald-600">
                                  ${subtotalGrupo.toFixed(2)}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  // Eliminar todas las líneas de este modelo
                                  setLineasPedido(lineasPedido.filter((l) => l.productId !== primerItem.productId));
                                }}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar este modelo del pedido"
                              >
                                <XCircle size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* MODALIDAD DE ENTREGA Y LOGÍSTICA (FLETE) */}
              <div className="p-4 bg-[var(--muted)]/20 rounded-xl border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
                    Modalidad de Entrega y Logística (Flete)
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    tipoEntrega === 'ENVIO' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  }`}>
                    {tipoEntrega === 'ENVIO' ? '🚚 Envío / Encomienda' : '🏪 Entrega Presencial en Local'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('PRESENCIAL')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                      tipoEntrega === 'PRESENCIAL'
                        ? 'bg-[#0F172A] text-white border-transparent shadow-xs'
                        : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[#0F172A]'
                    }`}
                  >
                    <span>🏪 Entrega Presencial (Local)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('ENVIO')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                      tipoEntrega === 'ENVIO'
                        ? 'bg-blue-600 text-white border-transparent shadow-xs'
                        : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-blue-600'
                    }`}
                  >
                    <Truck size={14} />
                    <span>🚚 Envío a Domicilio / Encomienda</span>
                  </button>
                </div>

                {tipoEntrega === 'ENVIO' && (
                  <div className="pt-2 border-t border-[var(--border)]/60 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-[var(--muted-foreground)]">
                            Empresa de Transporte / Courier *
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowNuevoTransporteModal(true)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                          >
                            <Plus size={10} /> Nuevo Transporte
                          </button>
                        </div>
                        <select
                          value={courier}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_NEW__') {
                              setShowNuevoTransporteModal(true);
                            } else {
                              setCourier(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                        >
                          {listaTransportes.length > 0 ? (
                            listaTransportes.map((t: any) => (
                              <option key={t.id || t.nombre} value={t.nombre}>
                                {t.nombre === 'Transporte Los Andes' ? '⭐ Transporte Los Andes (Predeterminada)' : t.esPredeterminada ? `⭐ ${t.nombre} (Predeterminada)` : `🚚 ${t.nombre}`}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="Transporte Los Andes">⭐ Transporte Los Andes (Predeterminada)</option>
                              <option value="Servientrega">📦 Servientrega</option>
                              <option value="Cooperativa Baños">🚌 Cooperativa Baños</option>
                              <option value="Cooperativa Cevallos">🚌 Cooperativa Cevallos</option>
                              <option value="Transportes Santa">🚌 Transportes Santa</option>
                              <option value="Cooperativa Cita Express">🚌 Cooperativa Cita Express</option>
                              <option value="Flota Pelileo">🚌 Flota Pelileo</option>
                              <option value="Urbano Express">🚚 Urbano Express</option>
                              <option value="Encomienda Provincial / Transporte">🚛 Encomienda Provincial / Transporte</option>
                            </>
                          )}
                          <option value="__ADD_NEW__">➕ + Registrar Nuevo Transporte...</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                          Ciudad de Destino *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Quito, Guayaquil, Cuenca, Riobamba, Latacunga..."
                          value={ciudadEnvio}
                          onChange={(e) => setCiudadEnvio(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                          Dirección de Entrega / Agencia Destino
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Av. 10 de Agosto y Colón / Agencia Terminal Terrestre"
                          value={direccionEnvio}
                          onChange={(e) => setDireccionEnvio(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                          N° Guía de Encomienda / Tracking (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: GUIA-2026-88492"
                          value={guiaEnvio}
                          onChange={(e) => setGuiaEnvio(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* Quién asume el Flete */}
                    <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2">
                      <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 block">
                        Gestión del Costo de Envío (Flete)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setAsumeFlete('CLIENTE')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                              asumeFlete === 'CLIENTE'
                                ? 'bg-blue-600 text-white border-transparent'
                                : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]'
                            }`}
                          >
                            🔵 Cobro en Destino (Paga Cliente)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAsumeFlete('EMPRESA')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                              asumeFlete === 'EMPRESA'
                                ? 'bg-emerald-600 text-white border-transparent'
                                : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]'
                            }`}
                          >
                            🟢 Cubre la Empresa (Cortesía)
                          </button>
                        </div>

                        {asumeFlete === 'EMPRESA' ? (
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
                              Gasto Flete ($):
                            </label>
                            <input
                              type="number"
                              step="0.50"
                              min="0"
                              value={costoEnvio}
                              onChange={(e) => setCostoEnvio(e.target.value)}
                              className="w-24 px-2.5 py-1 bg-[var(--card)] border border-emerald-500/40 rounded-lg text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-600 text-center"
                            />
                            <span className="text-[10px] text-emerald-600 italic">
                              (Registra gasto operativo automático)
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[var(--muted-foreground)] italic">
                            El cliente pagará el costo del flete directamente a la empresa de transporte al retirar.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. CUPÓN DE DESCUENTO PROMOCIONAL (FASE E2) */}
              {lineasPedido.length > 0 && promocionesActivas.length > 0 && (
                <div className="p-3.5 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <span>🎟️ Cupón de Descuento Promocional</span>
                    </span>
                    <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold">
                      (Válido por volumen / primeras personas)
                    </span>
                  </div>

                  {!cuponAplicado ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej: NEXORA10, LOTE10..."
                        value={codigoCuponInput}
                        onChange={(e) => setCodigoCuponInput(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:border-purple-600"
                      />
                      <button
                        type="button"
                        onClick={handleAplicarCupon}
                        disabled={validandoCupon || !codigoCuponInput.trim()}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        {validandoCupon ? <Loader2 size={12} className="animate-spin" /> : null}
                        <span>Aplicar Cupón</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-purple-600 text-white font-mono text-[11px] font-black rounded-md">
                            {cuponAplicado.promocion?.codigo}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                            Descuento: -${Number(cuponAplicado.descuentoCalculado || 0).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          {cuponAplicado.promocion?.titulo} · Quedan {cuponAplicado.cuposRestantes} cupos
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoverCupon}
                        className="text-xs font-bold text-rose-500 hover:underline px-2 py-1"
                      >
                        Quitar
                      </button>
                    </div>
                  )}

                  {cuponErrorMsg && (
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px] font-semibold rounded-lg flex items-center gap-1.5">
                      <AlertCircle size={13} />
                      <span>{cuponErrorMsg}</span>
                    </div>
                  )}
                </div>
              )}

              {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-medium">{errorMsg}</div>}
            </div>

            {/* Sticky Pinned Footer on Mobile and Desktop con Soporte Safe-Area iOS/Android */}
            <div className="p-3.5 sm:p-4 pb-[max(1.25rem,env(safe-area-inset-bottom,20px))] border-t border-[var(--border)] bg-[var(--card)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-lg z-20">
              {(() => {
                const subtotalBase = lineasPedido.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
                const descCupon = cuponAplicado ? Number(cuponAplicado.descuentoCalculado || 0) : 0;
                const totalConDescuento = Math.max(0, subtotalBase - descCupon);
                const montoAdelanto = registraAdelanto ? Number(adelantoInput || 0) : 0;
                const saldoRestanteFinal = Math.max(0, totalConDescuento - montoAdelanto);

                return (
                  <div className="text-xs space-y-1">
                    {descCupon > 0 && (
                      <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                        <span>Subtotal: ${subtotalBase.toFixed(2)}</span>
                        <span className="text-purple-600 font-bold">Cupón ({cuponAplicado.promocion?.codigo}): -${descCupon.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--muted-foreground)]">Total Pedido: </span>
                        <span className="font-bold text-sm text-[var(--foreground)]">
                          ${totalConDescuento.toFixed(2)}
                        </span>
                      </div>
                      {montoAdelanto > 0 && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-emerald-600 font-bold">
                            Anticipo: -${montoAdelanto.toFixed(2)}
                          </span>
                          <span className="text-slate-300">·</span>
                          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-amber-900 dark:text-amber-200">
                            <span className="font-bold">Saldo al Entregar:</span>
                            <span className="font-black text-sm font-mono">${saldoRestanteFinal.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>

                {online ? (
                  <button
                    type="button"
                    disabled={creatingOrder || lineasPedido.length === 0 || !clientId}
                    onClick={handleCrearPedidoOnline}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                  >
                    {creatingOrder ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    <span>
                      {creatingOrder
                        ? (editingOrderId ? 'Guardando Cambios...' : 'Creando Pedido...')
                        : (editingOrderId ? 'Guardar Cambios del Pedido' : 'Guardar Pedido Completo')}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGuardarOffline}
                    disabled={savingOffline}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-500 text-slate-900 font-bold text-xs rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center cursor-pointer min-h-[42px]"
                  >
                    {savingOffline ? 'Guardando...' : 'Guardar Offline'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GENERAR ORDEN A PROVEEDOR ── */}
      {showSupplierOrderModal && supplierOrderProductData && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowSupplierOrderModal(false); setSupplierOrderProductData(null); }, isDirtySupplierOrder()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowSupplierOrderModal(false); setSupplierOrderProductData(null); }, isDirtySupplierOrder()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">Orden de Fabricación / Compra</h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">Especifica curva, numeración y observaciones para el proveedor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSupplierOrderModal(false);
                  setSupplierOrderProductData(null);
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearOrdenProveedor} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Resumen del Artículo */}
              <div className="p-3 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Artículo Solicitado</span>
                <p className="text-xs font-black text-[var(--foreground)]">
                  {supplierOrderProductData.modelName} ({supplierOrderProductData.color})
                </p>
                <p className="text-[11px] text-purple-700 font-semibold">
                  Serie: {formatearNombreSerie(supplierOrderProductData.serieNombre)}
                </p>
              </div>

              {/* Proveedor */}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                  Proveedor Asignado *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-purple-600"
                  required
                >
                  {listaProveedores.map((prv) => (
                    <option key={prv.id} value={prv.id}>
                      {prv.razonSocial || prv.nombre} {prv.ruc ? `(RUC: ${prv.ruc})` : ''}
                    </option>
                  ))}
                  {listaProveedores.length === 0 && (
                    <option value="">No hay proveedores registrados</option>
                  )}
                </select>
              </div>

              {/* Modalidad de Pedido a Proveedor: Serie Completa vs Numeración */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--muted-foreground)]">
                  Modalidad de Pedido al Proveedor *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSupplierOrderModalType('SERIE_COMPLETA')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                      supplierOrderModalType === 'SERIE_COMPLETA'
                        ? 'bg-purple-600 text-white border-transparent shadow-xs'
                        : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-purple-500'
                    }`}
                  >
                    <Package size={13} />
                    <span>Serie Completa / Curva</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupplierOrderModalType('NUMERACION')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                      supplierOrderModalType === 'NUMERACION'
                        ? 'bg-purple-600 text-white border-transparent shadow-xs'
                        : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-purple-500'
                    }`}
                  >
                    <span>👟 Por Numeración</span>
                  </button>
                </div>
              </div>

              {/* Configuración de Serie Completa */}
              {supplierOrderModalType === 'SERIE_COMPLETA' ? (
                <div className="p-3.5 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Curva de Serie
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSupplierOrderSubtipoSerie('MEDIA_A')}
                        className={`flex-1 min-w-[130px] py-1.5 px-2 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                          supplierOrderSubtipoSerie === 'MEDIA_A'
                            ? 'bg-purple-600 text-white border-transparent shadow-xs'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]/50'
                        }`}
                      >
                        ½ Media A (6 pares: 38/1, 39/2, 40/1, 41/1, 42/1)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSupplierOrderSubtipoSerie('MEDIA_B')}
                        className={`flex-1 min-w-[130px] py-1.5 px-2 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                          supplierOrderSubtipoSerie === 'MEDIA_B'
                            ? 'bg-purple-600 text-white border-transparent shadow-xs'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]/50'
                        }`}
                      >
                        ½ Media B (6 pares: 38/1, 39/1, 40/2, 41/1, 42/1)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSupplierOrderSubtipoSerie('DOCENA')}
                        className={`flex-1 min-w-[130px] py-1.5 px-2 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                          supplierOrderSubtipoSerie === 'DOCENA'
                            ? 'bg-purple-600 text-white border-transparent shadow-xs'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]/50'
                        }`}
                      >
                        1 Docena (12 pares: 38/2, 39/3, 40/3, 41/2, 42/2)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                      Cantidad de {supplierOrderSubtipoSerie === 'DOCENA' ? 'docenas' : 'medias docenas'}:
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSupplierOrderCantSeries(Math.max(1, supplierOrderCantSeries - 1))}
                        className="w-7 h-7 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={supplierOrderCantSeries}
                        onChange={(e) => setSupplierOrderCantSeries(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 h-7 text-center font-bold text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setSupplierOrderCantSeries(supplierOrderCantSeries + 1)}
                        className="w-7 h-7 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-2 bg-purple-500/10 rounded-lg text-[11px] font-semibold text-purple-900 dark:text-purple-200 flex justify-between">
                    <span>Pares Totales a Fabricar:</span>
                    <span className="font-black font-mono">
                      {(supplierOrderSubtipoSerie === 'DOCENA' ? 12 : 6) * supplierOrderCantSeries} pares
                    </span>
                  </div>
                </div>
              ) : (
                /* Configuración Por Numeración Específica */
                <div className="p-3.5 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl space-y-2">
                  <span className="text-xs font-bold text-[var(--foreground)] block">
                    👟 Asigna la cantidad de pares por cada número de talla:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(supplierOrderTallasMap).map(([key, qty]) => (
                      <div key={key} className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg flex items-center justify-between shadow-xs">
                        <span className="text-xs font-bold">{key}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSupplierOrderTallasMap({ ...supplierOrderTallasMap, [key]: Math.max(0, qty - 1) })}
                            className="w-6 h-6 rounded bg-[var(--muted)]/40 hover:bg-[var(--muted)] flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => setSupplierOrderTallasMap({ ...supplierOrderTallasMap, [key]: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-10 h-6 text-center font-bold text-xs bg-[var(--card)] border border-[var(--border)] rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setSupplierOrderTallasMap({ ...supplierOrderTallasMap, [key]: qty + 1 })}
                            className="w-6 h-6 rounded bg-[var(--muted)]/40 hover:bg-[var(--muted)] flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 bg-purple-500/10 rounded-lg text-[11px] font-semibold text-purple-900 flex justify-between">
                    <span>Pares Totales:</span>
                    <span className="font-black font-mono">
                      {Object.values(supplierOrderTallasMap).reduce((a, b) => a + (b || 0), 0)} pares
                    </span>
                  </div>
                </div>
              )}

              {/* Costo Estimado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                    Costo Estimado c/u ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={supplierOrderCost}
                    onChange={(e) => setSupplierOrderCost(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                    Total Orden Compra ($)
                  </label>
                  <div className="w-full px-3 py-2 bg-purple-500/10 border border-purple-500/25 rounded-xl text-xs font-black text-purple-900 flex items-center">
                    ${((supplierOrderModalType === 'SERIE_COMPLETA'
                        ? (supplierOrderSubtipoSerie === 'DOCENA' ? 12 : 6) * supplierOrderCantSeries
                        : Object.values(supplierOrderTallasMap).reduce((a, b) => a + (b || 0), 0)
                      ) * (parseFloat(supplierOrderCost) || 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Observaciones para el Proveedor (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                  Observaciones / Especificaciones para el Proveedor (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Suela de caucho color beige, empaque individual en cajas con etiqueta de marca, entrega urgente para el viernes..."
                  value={supplierOrderObservaciones}
                  onChange={(e) => setSupplierOrderObservaciones(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] focus:outline-none focus:border-purple-600 placeholder:text-[var(--muted-foreground)]"
                />
              </div>

              </div>

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowSupplierOrderModal(false);
                    setSupplierOrderProductData(null);
                  }}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSupplierOrder || !selectedSupplierId}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  {savingSupplierOrder ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />}
                  <span>Enviar Orden al Proveedor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL GESTIONAR LOGÍSTICA DE ENVÍO Y FLETE (Fase E1) ── */}
      {showModalEnvio && pedidoEnvioSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowModalEnvio(false); setPedidoEnvioSeleccionado(null); }, isDirtyEnvio()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowModalEnvio(false); setPedidoEnvioSeleccionado(null); }, isDirtyEnvio()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-blue-500/20 backdrop-blur-sm rounded-2xl border border-blue-400/30 text-blue-400 font-bold shrink-0">
                  <Truck size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Logística de Envío — Pedido #{getNumeroPedido(pedidoEnvioSeleccionado)}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Cliente: {pedidoEnvioSeleccionado.clienteNombre || 'Consumidor Final'} · Total: ${Number(pedidoEnvioSeleccionado.montoTotal).toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModalEnvio(false);
                  setPedidoEnvioSeleccionado(null);
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGuardarLogisticaEnvio();
              }}
              className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs"
            >
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Selector de Modalidad */}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Modalidad de Entrega del Pedido *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvioModalTipoEntrega('PRESENCIAL')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                      envioModalTipoEntrega === 'PRESENCIAL'
                        ? 'bg-[#0F172A] text-white border-transparent shadow-xs'
                        : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[#0F172A]'
                    }`}
                  >
                    <span>🏪 Entrega Presencial (Local)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvioModalTipoEntrega('ENVIO')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                      envioModalTipoEntrega === 'ENVIO'
                        ? 'bg-blue-600 text-white border-transparent shadow-xs'
                        : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-blue-600'
                    }`}
                  >
                    <Truck size={14} />
                    <span>🚚 Envío / Encomienda</span>
                  </button>
                </div>
              </div>

              {envioModalTipoEntrega === 'ENVIO' ? (
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-3.5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-[var(--muted-foreground)]">
                          Empresa Courier / Transporte *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowNuevoTransporteModal(true)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                        >
                          <Plus size={10} /> Nuevo Transporte
                        </button>
                      </div>
                      <select
                        value={envioModalCourier}
                        onChange={(e) => {
                          if (e.target.value === '__ADD_NEW__') {
                            setShowNuevoTransporteModal(true);
                          } else {
                            setEnvioModalCourier(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                      >
                        {listaTransportes.length > 0 ? (
                          listaTransportes.map((t: any) => (
                            <option key={t.id || t.nombre} value={t.nombre}>
                              {t.nombre === 'Transporte Los Andes' ? '⭐ Transporte Los Andes (Predeterminada)' : t.esPredeterminada ? `⭐ ${t.nombre} (Predeterminada)` : `🚚 ${t.nombre}`}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Transporte Los Andes">⭐ Transporte Los Andes (Predeterminada)</option>
                            <option value="Servientrega">📦 Servientrega</option>
                            <option value="Cooperativa Baños">🚌 Cooperativa Baños</option>
                            <option value="Cooperativa Cevallos">🚌 Cooperativa Cevallos</option>
                            <option value="Transportes Santa">🚌 Transportes Santa</option>
                            <option value="Cooperativa Cita Express">🚌 Cooperativa Cita Express</option>
                            <option value="Flota Pelileo">🚌 Flota Pelileo</option>
                            <option value="Urbano Express">🚚 Urbano Express</option>
                            <option value="Encomienda Provincial / Transporte">🚛 Encomienda Provincial / Transporte</option>
                          </>
                        )}
                        <option value="__ADD_NEW__">➕ + Registrar Nuevo Transporte...</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                        Ciudad de Destino *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Quito, Guayaquil, Cuenca, Ambato..."
                        value={envioModalCiudadEnvio}
                        onChange={(e) => setEnvioModalCiudadEnvio(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                        required={envioModalTipoEntrega === 'ENVIO'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Dirección de Entrega / Sucursal de Retiro
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Av. 10 de Agosto y Colón / Agencia Terminal Quitumbe"
                      value={envioModalDireccionEnvio}
                      onChange={(e) => setEnvioModalDireccionEnvio(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      N° de Guía de Encomienda / Tracking
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: GUIA-2026-99381"
                      value={envioModalGuiaEnvio}
                      onChange={(e) => setEnvioModalGuiaEnvio(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 font-mono"
                    />
                  </div>

                  {/* Quién asume el Flete */}
                  <div className="pt-2 border-t border-blue-500/20 space-y-2">
                    <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 block">
                      Gestión del Flete
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEnvioModalAsumeFlete('CLIENTE')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                          envioModalAsumeFlete === 'CLIENTE'
                            ? 'bg-blue-600 text-white border-transparent'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]'
                        }`}
                      >
                        🔵 Cobro en Destino (Paga Cliente)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnvioModalAsumeFlete('EMPRESA')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                          envioModalAsumeFlete === 'EMPRESA'
                            ? 'bg-emerald-600 text-white border-transparent'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]'
                        }`}
                      >
                        🟢 Cubre la Empresa (Cortesía)
                      </button>
                    </div>

                    {envioModalAsumeFlete === 'EMPRESA' ? (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-emerald-800 block">Costo de Flete a Registrar ($):</span>
                          <span className="text-[10px] text-emerald-600">Se añadirá automáticamente al Libro de Gastos Operativos</span>
                        </div>
                        <input
                          type="number"
                          step="0.50"
                          min="0.01"
                          value={envioModalCostoEnvio}
                          onChange={(e) => setEnvioModalCostoEnvio(e.target.value)}
                          className="w-24 px-2.5 py-1 bg-[var(--card)] border border-emerald-500/40 rounded-lg text-xs font-extrabold text-emerald-800 focus:outline-none focus:border-emerald-600 text-center"
                          required
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-[var(--muted-foreground)] italic">
                        El cliente pagará el valor del flete directamente a la empresa de transporte al retirar el paquete.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-800">Entrega Presencial en Mostrador</div>
                    <div className="text-[11px] text-[var(--muted-foreground)]">
                      El cliente retirará su calzado directamente en el local comercial sin costo de flete.
                    </div>
                  </div>
                </div>
              )}

              </div>

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalEnvio(false);
                    setPedidoEnvioSeleccionado(null);
                  }}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEnvioModal}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  {savingEnvioModal ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />}
                  <span>Guardar Logística de Entrega</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL GESTIONAR ANTICIPO / ADELANTO DE DINERO ── */}
      {showModalAdelanto && pedidoAdelantoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              safeDismiss(() => {
                setShowModalAdelanto(false);
                setPedidoAdelantoSeleccionado(null);
              }, isDirtyAdelanto());
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              safeDismiss(() => {
                setShowModalAdelanto(false);
                setPedidoAdelantoSeleccionado(null);
              }, isDirtyAdelanto());
            }
          }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-amber-500/20 backdrop-blur-sm rounded-2xl border border-amber-400/30 text-amber-400 font-bold shrink-0">
                  <DollarSign size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Anticipo / Adelanto — Pedido #{getNumeroPedido(pedidoAdelantoSeleccionado)}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Cliente: {pedidoAdelantoSeleccionado.clienteNombre || 'Consumidor Final'} · Total Pedido: ${Number(pedidoAdelantoSeleccionado.montoTotal).toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModalAdelanto(false);
                  setPedidoAdelantoSeleccionado(null);
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGuardarAdelanto();
              }}
              className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs"
            >
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Resumen Financiero Dinámico */}
              {(() => {
                const totalPedido = Number(pedidoAdelantoSeleccionado.montoTotal || 0);
                const montoAnticipo = Number(modalAdelantoMonto || 0);
                const saldoPendiente = Math.max(0, totalPedido - montoAnticipo);

                return (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/25 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted-foreground)]">Valor Total del Pedido:</span>
                      <span className="font-black text-sm text-[var(--foreground)] font-mono">${totalPedido.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Anticipo Ingresado:</span>
                      <span className="font-black text-sm text-emerald-600 font-mono">-${montoAnticipo.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-amber-900 dark:text-amber-300 block">Saldo a Cancelar al Entregar:</span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">Se cobrará al momento de despachar</span>
                      </div>
                      <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">${saldoPendiente.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Botones de Atajo Rápido */}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Atajos de Anticipo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const total = Number(pedidoAdelantoSeleccionado.montoTotal || 0);
                      setModalAdelantoMonto((total * 0.5).toFixed(2));
                    }}
                    className="py-1.5 px-2 rounded-xl text-xs font-bold border border-[var(--border)] hover:border-amber-500 bg-[var(--card)] text-[var(--foreground)] transition-all text-center cursor-pointer"
                  >
                    50% (${(Number(pedidoAdelantoSeleccionado.montoTotal || 0) * 0.5).toFixed(2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const total = Number(pedidoAdelantoSeleccionado.montoTotal || 0);
                      setModalAdelantoMonto(total.toFixed(2));
                    }}
                    className="py-1.5 px-2 rounded-xl text-xs font-bold border border-[var(--border)] hover:border-amber-500 bg-[var(--card)] text-[var(--foreground)] transition-all text-center cursor-pointer"
                  >
                    100% (${Number(pedidoAdelantoSeleccionado.montoTotal || 0).toFixed(2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalAdelantoMonto('0.00');
                    }}
                    className="py-1.5 px-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 bg-[var(--card)] transition-all text-center cursor-pointer"
                  >
                    Quitar Anticipo
                  </button>
                </div>
              </div>

              {/* Inputs de Anticipo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    Monto del Anticipo ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={Number(pedidoAdelantoSeleccionado.montoTotal || 0)}
                    placeholder="0.00"
                    value={modalAdelantoMonto}
                    onChange={(e) => setModalAdelantoMonto(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-amber-500/40 rounded-xl text-sm font-black text-amber-900 dark:text-amber-200 focus:outline-none focus:border-amber-600 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                    Método de Anticipo *
                  </label>
                  <select
                    value={modalAdelantoMetodo}
                    onChange={(e) => setModalAdelantoMetodo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-600"
                  >
                    <option value="EFECTIVO">💵 Efectivo (Caja)</option>
                    <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                    <option value="DEPOSITO">📥 Depósito Bancario</option>
                    <option value="CHEQUE">📝 Cheque</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                    N° Comprobante / Referencia / Banco (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Transf #84931 Banco Pichincha"
                    value={modalAdelantoRef}
                    onChange={(e) => setModalAdelantoRef(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              {/* Mensaje de Sincronización Automática */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <CheckCircle size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  Este anticipo se sincronizará automáticamente como pago inicial en el módulo de Cobranzas / Financiero al entregar el pedido.
                </span>
              </div>

              </div>

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalAdelanto(false);
                    setPedidoAdelantoSeleccionado(null);
                  }}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdelantoModal}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  {savingAdelantoModal ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
                  <span>Guardar Anticipo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR NUEVA EMPRESA DE TRANSPORTE ── */}
      {showNuevoTransporteModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowNuevoTransporteModal(false), isDirtyNuevoTransporte()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowNuevoTransporteModal(false), isDirtyNuevoTransporte()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-md h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 rounded-xl text-blue-400 shrink-0">
                  <Truck size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">Nueva Empresa de Transporte</h4>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">Registra un nuevo courier o cooperativa de encomiendas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNuevoTransporteModal(false)}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearNuevoTransporte} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Nombre de la Empresa o Cooperativa *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Transporte Los Andes, Cooperativa Pelileo, Express..."
                  value={nuevoTransporteNombre}
                  onChange={(e) => setNuevoTransporteNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  autoFocus
                  required
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-900 dark:text-blue-300">
                💡 Esta empresa quedará guardada en el sistema para que todos los vendedores puedan seleccionarla en futuros envíos.
              </div>

              </div>

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNuevoTransporteModal(false)}
                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTransporte || !nuevoTransporteNombre.trim()}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  {guardandoTransporte ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  <span>Guardar Transporte</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Entrega Parcial / Total */}
      {showEntregaModal && pedidoEntregaSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowEntregaModal(false); setPedidoEntregaSeleccionado(null); setEntregaItemsMap({}); }, isDirtyEntrega()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowEntregaModal(false); setPedidoEntregaSeleccionado(null); setEntregaItemsMap({}); }, isDirtyEntrega()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-3xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shrink-0">
                  <PackageCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">Entrega de Pedido</h3>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-xs font-mono font-black">
                      #{getNumeroPedido(pedidoEntregaSeleccionado)}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Cliente: <span className="font-bold text-white">{pedidoEntregaSeleccionado.clienteNombre || 'Consumidor'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEntregaModal(false);
                  setPedidoEntregaSeleccionado(null);
                  setEntregaItemsMap({});
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs">
                <div className="text-[var(--muted-foreground)]">
                  Indica los pares a despachar. El sistema descontará el inventario físico y actualizará el estado a <strong className="text-cyan-600 dark:text-cyan-400">Entregado Parcial</strong> o <strong className="text-emerald-600 dark:text-emerald-400">Entregado</strong>.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allMax: Record<string, number> = {};
                      let huboInsuficiente = false;
                      (pedidoEntregaSeleccionado.lines || []).forEach((l: any) => {
                        const pend = l.cantidadPendiente !== undefined ? l.cantidadPendiente : Math.max(0, l.cantidad - (l.cantidadEntregada || 0));
                        const substId = entregaSustitutasMap[l.id];
                        let disp = l.stockDisponible !== undefined ? l.stockDisponible : pend;
                        const prodInfo = entregaProductosStockMap[l.productId];
                        if (substId && prodInfo?.stockByTalla) {
                          const stSub = prodInfo.stockByTalla.find((s: any) => s.tallaId === substId || s.talla?.id === substId);
                          if (stSub) disp = stSub.stockDisponible !== undefined ? stSub.stockDisponible : (stSub.stockFisico !== undefined ? stSub.stockFisico : 0);
                        } else if (prodInfo?.stockByTalla) {
                          const st = prodInfo.stockByTalla.find((s: any) => s.tallaId === l.tallaId || s.talla?.id === l.tallaId);
                          if (st) disp = st.stockDisponible !== undefined ? st.stockDisponible : (st.stockFisico !== undefined ? st.stockFisico : 0);
                        }
                        const canFill = Math.min(pend, Math.max(0, disp));
                        allMax[l.id] = canFill;
                        if (canFill < pend && pend > 0) {
                          huboInsuficiente = true;
                        }
                      });
                      setEntregaItemsMap(allMax);
                      if (huboInsuficiente) {
                        setMostrarAlertasInsuficientes(true);
                        showToast('Se llenaron los pares con el stock disponible. Ciertas tallas tienen faltante en bodega.', 'warning');
                      } else {
                        setMostrarAlertasInsuficientes(false);
                        showToast('Todas las tallas pendientes fueron cubiertas con el stock disponible.', 'success');
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-600/20 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    ⚡ Llenar Disponibles
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allZero: Record<string, number> = {};
                      (pedidoEntregaSeleccionado.lines || []).forEach((l: any) => {
                        allZero[l.id] = 0;
                      });
                      setEntregaItemsMap(allZero);
                    }}
                    className="px-2.5 py-1 bg-slate-500/10 text-slate-600 hover:bg-slate-500 hover:text-white border border-slate-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    🔄 Poner en 0
                  </button>
                </div>
              </div>

              {/* Banner de alerta si hay stock insuficiente en bodega (Fase 4.3) */}
              {mostrarAlertasInsuficientes && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200 animate-in fade-in">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold">Stock insuficiente en ciertas tallas</div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-300">
                      Las tallas resaltadas en ámbar o rojo no alcanzan a cubrir el pedido completo por falta de inventario físico. Puedes entregar las unidades disponibles o aplicar despacho compensatorio seleccionando una talla sustituta con stock.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarAlertasInsuficientes(false)}
                    className="text-amber-500 hover:text-amber-700 p-0.5 cursor-pointer"
                    title="Cerrar advertencia"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Tarjetas interactivas agrupadas por Modelo / Variante (Idéntico a componente de pedidos) */}
              <div className="space-y-3">
                {(() => {
                  // Agrupar líneas por modelo / variante
                  const gruposMap = new Map<string, {
                    key: string;
                    productId: string;
                    modelName: string;
                    color: string;
                    serieNombre: string;
                    imageUrl?: string;
                    precioUnitario: number;
                    tipoVenta?: string;
                    observacionModelo?: string;
                    lineas: any[];
                  }>();

                  (pedidoEntregaSeleccionado.lines || []).forEach((l: any) => {
                    const key = `${l.productId || l.modelName}_${l.color || ''}_${l.serieNombre || ''}_${l.tipoVenta || 'GENERAL'}`;
                    if (!gruposMap.has(key)) {
                      gruposMap.set(key, {
                        key,
                        productId: l.productId,
                        modelName: l.modelName || 'Calzado',
                        color: l.color || '',
                        serieNombre: l.serieNombre || 'Serie Estándar',
                        imageUrl: l.imageUrl,
                        precioUnitario: Number(l.precioUnitario || 0),
                        tipoVenta: l.tipoVenta,
                        observacionModelo: l.observacionModelo || l.observacion,
                        lineas: [],
                      });
                    }
                    gruposMap.get(key)!.lineas.push(l);
                  });

                  const grupos = Array.from(gruposMap.values());

                  if (grupos.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                        No hay artículos para entregar en este pedido.
                      </div>
                    );
                  }

                  return grupos.map((g) => {
                    const sortedTallas = [...g.lineas].sort(
                      (a, b) => (Number(a.numeroTalla || a.tallaNumero || 0) || 0) - (Number(b.numeroTalla || b.tallaNumero || 0) || 0)
                    );

                    const totalParesPedidoModelo = g.lineas.reduce((acc, l) => acc + (l.cantidad || 0), 0);
                    const totalParesEntregadosAntes = g.lineas.reduce((acc, l) => acc + (l.cantidadEntregada || 0), 0);
                    const totalParesADespacharHoy = g.lineas.reduce((acc, l) => acc + (entregaItemsMap[l.id] || 0), 0);
                    const rawPrecio = entregaPreciosMap[g.lineas[0]?.id];
                    const valorString = rawPrecio !== undefined
                      ? rawPrecio
                      : (g.precioUnitario > 0 ? String(g.precioUnitario) : '');
                    const precioEntregaActual = parseFloat(valorString) || 0;
                    const subtotalDespachoHoy = totalParesADespacharHoy * precioEntregaActual;

                    let formato = `${totalParesADespacharHoy} pares`;
                    if (totalParesADespacharHoy === 6) formato = '6 pares (½ Docena)';
                    else if (totalParesADespacharHoy === 12) formato = '12 pares (1 Docena)';
                    else if (totalParesADespacharHoy > 12 && totalParesADespacharHoy % 12 === 0) formato = `${totalParesADespacharHoy} pares (${totalParesADespacharHoy / 12} Docenas)`;
                    else if (totalParesADespacharHoy > 6 && totalParesADespacharHoy % 6 === 0) formato = `${totalParesADespacharHoy} pares (${(totalParesADespacharHoy / 6) * 0.5} Docenas)`;

                    return (
                      <div
                        key={g.key}
                        className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs"
                      >
                        {/* Izquierda: Imagen, Información y Steppers por Talla */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            onClick={() => {
                              if (g.imageUrl) setLightboxImage({ url: g.imageUrl, title: g.modelName });
                            }}
                            className={`w-12 h-12 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)] overflow-hidden shrink-0 mt-0.5 flex items-center justify-center ${g.imageUrl ? 'cursor-zoom-in hover:opacity-90' : ''}`}
                            title={g.imageUrl ? "Ver foto ampliada" : ""}
                          >
                            {g.imageUrl ? (
                              <img
                                src={g.imageUrl}
                                alt={g.modelName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-lg">👟</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-sm text-[var(--foreground)] uppercase tracking-wide truncate">
                              {g.modelName}
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {g.color ? `${g.color.toUpperCase()} · ` : ''}
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Serie: {formatearNombreSerie(g.serieNombre)}
                              </span>
                            </div>

                            {/* Chips de Tallas Interactivos con diseño idéntico al pedido */}
                            <div className="mt-2 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {sortedTallas.map((l, i) => {
                                  const cantPedida = l.cantidad || 0;
                                  const cantEntregada = l.cantidadEntregada !== undefined ? l.cantidadEntregada : 0;
                                  const cantPendiente = l.cantidadPendiente !== undefined ? l.cantidadPendiente : Math.max(0, cantPedida - cantEntregada);

                                  const origTallaId = l.tallaId;
                                  const sustitutaId = entregaSustitutasMap[l.id];
                                  const isSustituta = Boolean(sustitutaId && sustitutaId !== origTallaId);
                                  const activeTallaId = isSustituta ? sustitutaId : origTallaId;

                                  const prodInfo = entregaProductosStockMap[g.productId || l.productId];
                                  let stockDisp = l.stockFisico !== undefined ? l.stockFisico : (l.stockDisponible !== undefined ? l.stockDisponible : cantPendiente);
                                  let activeTallaNumero = l.numeroTalla || l.tallaNumero || '38';

                                  if (prodInfo && Array.isArray(prodInfo.stockByTalla)) {
                                    const st = prodInfo.stockByTalla.find((s: any) => s.tallaId === activeTallaId || s.talla?.id === activeTallaId);
                                    if (st) {
                                      stockDisp = st.stockDisponible !== undefined ? st.stockDisponible : (st.stockFisico !== undefined ? st.stockFisico : 0);
                                      if (st.talla?.numero) activeTallaNumero = String(st.talla.numero);
                                    }
                                  }

                                  const aEntregar = entregaItemsMap[l.id] ?? 0;
                                  const maxPermitido = Math.min(cantPendiente, Math.max(0, stockDisp));
                                  const numTallaOrig = l.numeroTalla || l.tallaNumero || '38';
                                  const tieneFaltante = cantPendiente > 0 && stockDisp < cantPendiente;

                                  // Lista de tallas alternativas del mismo modelo que tienen stock disponible
                                  const tallasAlternativasConStock = prodInfo && Array.isArray(prodInfo.stockByTalla)
                                    ? prodInfo.stockByTalla.filter((st: any) => {
                                        const tId = st.tallaId || st.talla?.id;
                                        const qty = st.stockDisponible !== undefined ? st.stockDisponible : (st.stockFisico || 0);
                                        return tId !== origTallaId && qty > 0;
                                      })
                                    : [];

                                  return (
                                    <div
                                      key={i}
                                      className={`flex flex-wrap items-center gap-1.5 rounded-2xl border bg-[var(--card)] px-2.5 py-1.5 shadow-2xs transition-all ${
                                        isSustituta
                                          ? 'border-purple-500/40 bg-purple-500/5'
                                          : tieneFaltante && mostrarAlertasInsuficientes
                                          ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30'
                                          : 'border-[var(--border)]'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[var(--foreground)] font-black text-xs font-mono">
                                          T{numTallaOrig}
                                        </span>

                                        {cantPendiente > 0 && (
                                          <span
                                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                              stockDisp <= 0
                                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                                : stockDisp < cantPendiente
                                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                            }`}
                                            title={`Stock en bodega: ${stockDisp} pares`}
                                          >
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stockDisp <= 0 ? 'bg-rose-500' : stockDisp < cantPendiente ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                            {stockDisp <= 0 ? 'Sin stock' : stockDisp < cantPendiente ? `Parcial: ${stockDisp}/${cantPendiente}` : `Stock: ${stockDisp}`}
                                          </span>
                                        )}
                                      </div>

                                      {/* Talla Sustituta Activa o Selector de Sustitución */}
                                      {cantPendiente > 0 && (
                                        <div className="flex items-center gap-1">
                                          {isSustituta ? (
                                            <div className="flex items-center gap-1 text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-md">
                                              <span>🔄 Sustituida por T{activeTallaNumero}</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEntregaSustitutasMap((prev) => {
                                                    const copy = { ...prev };
                                                    delete copy[l.id];
                                                    return copy;
                                                  });
                                                  setEntregaItemsMap((prev) => ({
                                                    ...prev,
                                                    [l.id]: 0,
                                                  }));
                                                }}
                                                className="hover:text-rose-600 ml-0.5 font-bold cursor-pointer"
                                                title="Quitar sustitución y volver a talla original"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ) : (
                                            tallasAlternativasConStock.length > 0 && (
                                              <select
                                                value=""
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  if (val) {
                                                    setEntregaSustitutasMap((prev) => ({
                                                      ...prev,
                                                      [l.id]: val,
                                                    }));
                                                    const stAlt = prodInfo.stockByTalla.find((s: any) => s.tallaId === val || s.talla?.id === val);
                                                    const dispAlt = stAlt ? (stAlt.stockDisponible !== undefined ? stAlt.stockDisponible : (stAlt.stockFisico || 0)) : 0;
                                                    setEntregaItemsMap((prev) => ({
                                                      ...prev,
                                                      [l.id]: Math.min(cantPendiente, Math.max(0, dispAlt)),
                                                    }));
                                                  }
                                                }}
                                                className="text-[9px] font-medium bg-[var(--muted)]/50 text-[var(--foreground)] border border-[var(--border)] rounded px-1 py-0.5 hover:border-purple-400 focus:outline-hidden cursor-pointer"
                                                title="Sustituir por otra talla con stock disponible de este mismo modelo"
                                              >
                                                <option value="">🔄 Sustituir...</option>
                                                {tallasAlternativasConStock.map((st: any) => (
                                                  <option key={st.tallaId || st.talla?.id} value={st.tallaId || st.talla?.id}>
                                                    T{st.talla?.numero} (Disp: {st.stockDisponible !== undefined ? st.stockDisponible : (st.stockFisico || 0)})
                                                  </option>
                                                ))}
                                              </select>
                                            )
                                          )}
                                        </div>
                                      )}

                                      {/* Stepper y Cantidades */}
                                      {cantPendiente === 0 ? (
                                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 ml-auto" title="Talla completada al 100%">
                                          ✓ {cantEntregada} entregados
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-1 ml-auto">
                                          {cantEntregada > 0 && (
                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded mr-0.5" title={`Ya entregados: ${cantEntregada}, faltan: ${cantPendiente}`}>
                                              {cantEntregada}/{cantPedida}
                                            </span>
                                          )}
                                          <button
                                            type="button"
                                            disabled={aEntregar <= 0}
                                            onClick={() => {
                                              setEntregaItemsMap((prev) => ({
                                                ...prev,
                                                [l.id]: Math.max(0, aEntregar - 1),
                                              }));
                                            }}
                                            className={`w-5 h-5 flex items-center justify-center rounded text-xs font-black transition-colors ${
                                              aEntregar <= 0
                                                ? 'bg-slate-500/10 text-slate-400 opacity-40 cursor-not-allowed'
                                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 cursor-pointer'
                                            }`}
                                            title={`Quitar 1 par`}
                                          >
                                            −
                                          </button>
                                          <span className="w-5 text-center text-xs font-bold font-mono text-[var(--foreground)]">
                                            {aEntregar}
                                          </span>
                                          <button
                                            type="button"
                                            disabled={aEntregar >= maxPermitido}
                                            onClick={() => {
                                              setEntregaItemsMap((prev) => ({
                                                ...prev,
                                                [l.id]: Math.min(maxPermitido, aEntregar + 1),
                                              }));
                                            }}
                                            className={`w-5 h-5 flex items-center justify-center rounded text-xs font-black transition-colors ${
                                              aEntregar >= maxPermitido
                                                ? 'bg-slate-500/10 text-slate-400 opacity-40 cursor-not-allowed'
                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 cursor-pointer'
                                            }`}
                                            title={
                                              maxPermitido <= 0
                                                ? stockDisp <= 0
                                                  ? `Sin stock disponible en bodega para T${activeTallaNumero}`
                                                  : `Ya se alcanzó el tope pendiente (${cantPendiente})`
                                                : aEntregar >= maxPermitido
                                                ? `Tope alcanzado (máx a entregar hoy: ${maxPermitido})`
                                                : `Agregar 1 par T${activeTallaNumero}`
                                            }
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Botones de acción rápida: Media Docena Serie A / B */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curva = getCurvaDocena(g.serieNombre || '', 'MEDIA_A');
                                    const hasCurva = Object.keys(curva).length > 0;
                                    const nextMap = { ...entregaItemsMap };
                                    sortedTallas.forEach((l) => {
                                      const cantPendiente = l.cantidadPendiente !== undefined ? l.cantidadPendiente : Math.max(0, (l.cantidad || 0) - (l.cantidadEntregada || 0));
                                      const stockDisp = l.stockFisico !== undefined ? l.stockFisico : (l.stockDisponible !== undefined ? l.stockDisponible : cantPendiente);
                                      const maxPermitido = Math.min(cantPendiente, Math.max(0, stockDisp));
                                      const actual = nextMap[l.id] ?? 0;
                                      const num = Number(l.talla?.numero ?? l.tallaNumero);
                                      const qty = hasCurva ? (curva[num] ?? 0) : 1;
                                      nextMap[l.id] = Math.min(maxPermitido, actual + qty);
                                    });
                                    setEntregaItemsMap(nextMap);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  + ½ Doc A
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curva = getCurvaDocena(g.serieNombre || '', 'MEDIA_B');
                                    const hasCurva = Object.keys(curva).length > 0;
                                    const nextMap = { ...entregaItemsMap };
                                    sortedTallas.forEach((l) => {
                                      const cantPendiente = l.cantidadPendiente !== undefined ? l.cantidadPendiente : Math.max(0, (l.cantidad || 0) - (l.cantidadEntregada || 0));
                                      const stockDisp = l.stockFisico !== undefined ? l.stockFisico : (l.stockDisponible !== undefined ? l.stockDisponible : cantPendiente);
                                      const maxPermitido = Math.min(cantPendiente, Math.max(0, stockDisp));
                                      const actual = nextMap[l.id] ?? 0;
                                      const num = Number(l.talla?.numero ?? l.tallaNumero);
                                      const qty = hasCurva ? (curva[num] ?? 0) : 1;
                                      nextMap[l.id] = Math.min(maxPermitido, actual + qty);
                                    });
                                    setEntregaItemsMap(nextMap);
                                  }}
                                  className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  + ½ Doc B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curva = getCurvaDocena(g.serieNombre || '', 'MEDIA_A');
                                    const hasCurva = Object.keys(curva).length > 0;
                                    const nextMap = { ...entregaItemsMap };
                                    sortedTallas.forEach((l) => {
                                      const actual = nextMap[l.id] ?? 0;
                                      const num = Number(l.talla?.numero ?? l.tallaNumero);
                                      const qty = hasCurva ? (curva[num] ?? 0) : 1;
                                      nextMap[l.id] = Math.max(0, actual - qty);
                                    });
                                    setEntregaItemsMap(nextMap);
                                  }}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  − ½ Doc A
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curva = getCurvaDocena(g.serieNombre || '', 'MEDIA_B');
                                    const hasCurva = Object.keys(curva).length > 0;
                                    const nextMap = { ...entregaItemsMap };
                                    sortedTallas.forEach((l) => {
                                      const actual = nextMap[l.id] ?? 0;
                                      const num = Number(l.talla?.numero ?? l.tallaNumero);
                                      const qty = hasCurva ? (curva[num] ?? 0) : 1;
                                      nextMap[l.id] = Math.max(0, actual - qty);
                                    });
                                    setEntregaItemsMap(nextMap);
                                  }}
                                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  − ½ Doc B
                                </button>
                                <span className="text-[11px] text-[var(--muted-foreground)] font-mono font-medium ml-1">
                                  = {totalParesADespacharHoy} pares a entregar hoy
                                </span>
                              </div>

                              {/* Observación del modelo */}
                              {g.observacionModelo ? (
                                <div className="mt-1.5 p-2 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-200">
                                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 shrink-0">
                                    📝 Nota:
                                  </span>
                                  <span className="truncate text-[11px] font-medium">{g.observacionModelo}</span>
                                </div>
                              ) : (
                                <div className="mt-1 text-[10px] font-semibold text-[var(--muted-foreground)] flex items-center gap-1">
                                  <span>+ Observación:</span>
                                  <span className="font-normal text-slate-400">Sin notas adicionales</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Derecha: Resumen de pares, precio y subtotal */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                          <div className="text-right">
                            <div className="text-xs font-bold text-[var(--foreground)]">
                              {formato}
                            </div>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-[11px] text-[var(--muted-foreground)] font-medium">$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={valorString}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  val = val.replace(/[^0-9.]/g, '');
                                  const parts = val.split('.');
                                  if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                                  if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
                                    val = val.replace(/^0+/, '');
                                  }
                                  setEntregaPreciosMap((prev) => {
                                    const next = { ...prev };
                                    g.lineas.forEach((l) => {
                                      next[l.id] = val;
                                    });
                                    return next;
                                  });
                                }}
                                className="w-16 h-6 px-1 text-right text-xs font-bold bg-[var(--card)] border border-[var(--border)] rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                                title="Precio de entrega por par (editable)"
                              />
                              <span className="text-[11px] text-[var(--muted-foreground)] font-medium">/ par</span>
                            </div>
                            <div className="font-black text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                              ${subtotalDespachoHoy.toFixed(2)}
                            </div>
                            {totalParesEntregadosAntes > 0 && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                ✓ {totalParesEntregadosAntes} ya entregados
                              </div>
                            )}
                          </div>

                          {/* Botón para resetear este modelo a 0 */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextMap = { ...entregaItemsMap };
                              sortedTallas.forEach((l) => {
                                nextMap[l.id] = 0;
                              });
                              setEntregaItemsMap(nextMap);
                            }}
                            className="w-6 h-6 rounded-full border border-rose-400/40 text-rose-500 hover:bg-rose-500/10 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                            title="Poner en 0 pares a entregar para este modelo"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Resumen de la entrega */}
              {(() => {
                const totalEntregaActual = Object.values(entregaItemsMap).reduce((acc, q) => acc + (Number(q) || 0), 0);
                const totalPedida = (pedidoEntregaSeleccionado.lines || []).reduce((acc: number, l: any) => acc + (l.cantidad || 0), 0);
                const totalYaEntregada = (pedidoEntregaSeleccionado.lines || []).reduce((acc: number, l: any) => acc + (l.cantidadEntregada || 0), 0);
                const acumulado = totalYaEntregada + totalEntregaActual;
                const esTotal = acumulado >= totalPedida;

                return (
                  <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-xs text-slate-300">Pares a despachar en esta entrega:</div>
                      <div className="text-lg font-black text-emerald-400">
                        {totalEntregaActual} pares <span className="text-xs text-slate-300 font-normal">({acumulado} de {totalPedida} entregados en total)</span>
                      </div>
                    </div>
                    <div>
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${
                        esTotal
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      }`}>
                        {esTotal ? '✨ Entrega Completa (ENTREGADO)' : '📦 Entrega Parcial (ENTREGADO_PARCIAL)'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Pie de modal */}
            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowEntregaModal(false);
                  setPedidoEntregaSeleccionado(null);
                  setEntregaItemsMap({});
                }}
                className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  procesandoEntrega ||
                  Object.values(entregaItemsMap).reduce((acc, q) => acc + (Number(q) || 0), 0) === 0
                }
                onClick={handleEntregarItems}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
              >
                {procesandoEntrega ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />}
                <span>Confirmar y Despachar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reversión / Corrección de Entrega Errónea (Fase 2) */}
      {showRevertirEntregaModal && pedidoRevertirSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowRevertirEntregaModal(false);
              setPedidoRevertirSeleccionado(null);
              setRevertirItemsMap({});
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRevertirEntregaModal(false);
              setPedidoRevertirSeleccionado(null);
              setRevertirItemsMap({});
            }
          }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-3xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shrink-0">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">Corregir / Revertir Entrega</h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Pedido #{pedidoRevertirSeleccionado.numeroCodigo || pedidoRevertirSeleccionado.id.slice(0, 8)} · {pedidoRevertirSeleccionado.clienteNombre || 'Cliente'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRevertirEntregaModal(false);
                  setPedidoRevertirSeleccionado(null);
                  setRevertirItemsMap({});
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                Selecciona la cantidad de pares que fueron entregados por error para restituirlos al inventario físico. El saldo del cliente y las notas de entrega se ajustarán automáticamente.
              </div>

              {/* Tarjetas de Modelos con Curva de Tallas entregadas (Rule 7) */}
              <div className="space-y-3">
                {(() => {
                  const lineasEntregadas = (pedidoRevertirSeleccionado.lines || []).filter(
                    (l: any) => (l.cantidadEntregada || 0) > 0
                  );
                  if (lineasEntregadas.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-[var(--muted-foreground)]">
                        No hay pares entregados registrados en este pedido para revertir.
                      </div>
                    );
                  }

                  const gruposMap = new Map<string, { key: string; productId: string; modelName: string; color: string; serieNombre: string; imageUrl?: string; precioUnitario: number; tipoVenta?: string; observacionModelo?: string; lineas: any[]; }>();
                  lineasEntregadas.forEach((l: any) => {
                    const key = [l.productId || l.modelName, l.color || '', l.serieNombre || '', l.tipoVenta || 'GENERAL'].join('_');
                    if (!gruposMap.has(key)) {
                      gruposMap.set(key, {
                        key,
                        productId: l.productId,
                        modelName: l.modelName || 'Calzado',
                        color: l.color || '',
                        serieNombre: l.serieNombre || 'Serie Estándar',
                        imageUrl: l.imageUrl,
                        precioUnitario: Number(l.precioUnitario || 0),
                        tipoVenta: l.tipoVenta,
                        observacionModelo: l.observacionModelo || l.observacion,
                        lineas: [],
                      });
                    }
                    gruposMap.get(key)!.lineas.push(l);
                  });
                  return Array.from(gruposMap.values()).map((g) => {
                    const sortedTallas = [...g.lineas].sort((a, b) => {
                      const na = Number(a.numeroTalla || a.tallaNumero || 0);
                      const nb = Number(b.numeroTalla || b.tallaNumero || 0);
                      return na - nb;
                    });

                    const paresARevertirModelo = sortedTallas.reduce(
                      (acc, l) => acc + (revertirItemsMap[l.id] || 0),
                      0
                    );
                    const subtotalRevertirModelo = sortedTallas.reduce(
                      (acc, l) => acc + (revertirItemsMap[l.id] || 0) * Number(l.precioUnitario || 0),
                      0
                    );

                    return (
                      <div
                        key={g.key}
                        className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs"
                      >
                        {/* Izquierda: Miniatura + Info + Chips */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Miniatura cuadrada Rule 7 */}
                          <div className="w-12 h-12 rounded-xl object-cover border border-[var(--border)] overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {g.imageUrl ? (
                              <img src={g.imageUrl} alt={g.modelName} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="text-slate-400" size={20} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Encabezado Rule 7 */}
                            <h4 className="font-black uppercase text-xs text-[var(--foreground)] truncate">
                              {g.modelName}
                            </h4>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {g.color ? `${g.color.toUpperCase()} · ` : ''}
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Serie: {formatearNombreSerie(g.serieNombre)}
                              </span>
                            </div>

                            {/* Curva de Tallas con controles + / - */}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {sortedTallas.map((l, i) => {
                                const yaEntregado = l.cantidadEntregada || 0;
                                const aRevertir = revertirItemsMap[l.id] || 0;
                                const numTalla = l.numeroTalla || l.tallaNumero || '38';

                                return (
                                  <div
                                    key={i}
                                    className="flex items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 shadow-2xs"
                                  >
                                    <span className="text-[var(--foreground)] font-black text-xs font-mono">
                                      T{numTalla}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-500/10 px-1 py-0.5 rounded mr-0.5" title={`Entregados previamente: ${yaEntregado}`}>
                                      {yaEntregado} ent.
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={aRevertir <= 0}
                                        onClick={() => {
                                          setRevertirItemsMap((prev) => ({
                                            ...prev,
                                            [l.id]: Math.max(0, aRevertir - 1),
                                          }));
                                        }}
                                        className={`w-5 h-5 flex items-center justify-center rounded text-xs font-black transition-colors ${
                                          aRevertir <= 0
                                            ? 'bg-slate-500/10 text-slate-400 opacity-40 cursor-not-allowed'
                                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 cursor-pointer'
                                        }`}
                                        title={`Restar 1 par a revertir T${numTalla}`}
                                      >
                                        −
                                      </button>
                                      <span className="w-5 text-center text-xs font-bold font-mono text-[var(--foreground)]">
                                        {aRevertir}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={aRevertir >= yaEntregado}
                                        onClick={() => {
                                          setRevertirItemsMap((prev) => ({
                                            ...prev,
                                            [l.id]: Math.min(yaEntregado, aRevertir + 1),
                                          }));
                                        }}
                                        className={`w-5 h-5 flex items-center justify-center rounded text-xs font-black transition-colors ${
                                          aRevertir >= yaEntregado
                                            ? 'bg-slate-500/10 text-slate-400 opacity-40 cursor-not-allowed'
                                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 cursor-pointer'
                                        }`}
                                        title={`Sumar 1 par a revertir T${numTalla} (máx: ${yaEntregado})`}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Acciones Rápidas Rule 7 */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextMap = { ...revertirItemsMap };
                                  sortedTallas.forEach((l) => {
                                    nextMap[l.id] = l.cantidadEntregada || 0;
                                  });
                                  setRevertirItemsMap(nextMap);
                                }}
                                className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 rounded text-[10px] font-bold border border-amber-500/20 cursor-pointer"
                              >
                                Revertir Todo el Modelo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextMap = { ...revertirItemsMap };
                                  sortedTallas.forEach((l) => {
                                    nextMap[l.id] = 0;
                                  });
                                  setRevertirItemsMap(nextMap);
                                }}
                                className="px-2 py-0.5 bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 rounded text-[10px] font-bold border border-slate-500/20 cursor-pointer"
                              >
                                Poner en 0
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Derecha: Resumen Lateral Rule 7 */}
                        <div className="text-right shrink-0 min-w-[120px] border-t md:border-t-0 md:border-l border-[var(--border)] pt-2 md:pt-0 md:pl-4">
                          <div className="text-xs font-bold text-[var(--foreground)]">
                            {paresARevertirModelo} {paresARevertirModelo === 1 ? 'par' : 'pares'} a revertir
                          </div>
                          <div className="text-[11px] text-[var(--muted-foreground)]">
                            ${Number(sortedTallas[0]?.precioUnitario || 0).toFixed(2)} / par
                          </div>
                          <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            -${subtotalRevertirModelo.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Campo de motivo obligatorio para auditoría */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--foreground)]">
                  Motivo de la corrección o reversión:
                </label>
                <input
                  type="text"
                  value={motivoReversion}
                  onChange={(e) => setMotivoReversion(e.target.value)}
                  placeholder="Ej: Despacho de calzado equivocado al cliente / Devolución inmediata en mostrador"
                  className="w-full px-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Barra de totales generales */}
              {(() => {
                const totalRevertirGeneral = Object.values(revertirItemsMap).reduce((acc, q) => acc + (Number(q) || 0), 0);
                let montoTotalRevertirGeneral = 0;
                (pedidoRevertirSeleccionado.lines || []).forEach((l: any) => {
                  const cant = Number(revertirItemsMap[l.id] || 0);
                  if (cant > 0) {
                    montoTotalRevertirGeneral += cant * Number(l.precioUnitario || 0);
                  }
                });

                return (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="text-xs text-slate-300">Total de pares a restituir al inventario:</div>
                        <div className="text-lg font-black text-amber-400">
                          {totalRevertirGeneral} pares
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-300">Descuento total a reflejar en saldo:</div>
                        <div className="text-lg font-black text-emerald-400">
                          -${montoTotalRevertirGeneral.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Alerta de confirmación in-modal (100% sin alerts ni confirms de navegador) */}
                    {confirmandoReversionPaso && (
                      <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-xs">
                          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                          <span>¿Confirmas la restitución de estos calzados al inventario?</span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                          Se devolverán <strong>{totalRevertirGeneral} pares</strong> a la bodega física del local y se descontará automáticamente <strong>${montoTotalRevertirGeneral.toFixed(2)}</strong> del saldo de la cuenta corriente de este cliente.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Pie del modal */}
            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
              {confirmandoReversionPaso ? (
                <>
                  <button
                    type="button"
                    disabled={procesandoReversion}
                    onClick={() => setConfirmandoReversionPaso(false)}
                    className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                  >
                    Volver y Modificar
                  </button>
                  <button
                    type="button"
                    disabled={procesandoReversion}
                    onClick={handleEjecutarReversionDirecta}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                  >
                    {procesandoReversion ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                    <span>Sí, Proceder con la Reversión</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRevertirEntregaModal(false);
                      setPedidoRevertirSeleccionado(null);
                      setRevertirItemsMap({});
                      setConfirmandoReversionPaso(false);
                    }}
                    className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={
                      procesandoReversion ||
                      Object.values(revertirItemsMap).reduce((acc, q) => acc + (Number(q) || 0), 0) === 0
                    }
                    onClick={() => {
                      const totalPares = Object.values(revertirItemsMap).reduce((acc, q) => acc + (Number(q) || 0), 0);
                      if (totalPares === 0) {
                        showToast('Selecciona al menos 1 par para revertir al inventario.', 'warning');
                        return;
                      }
                      setConfirmandoReversionPaso(true);
                    }}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                  >
                    <RotateCcw size={15} />
                    <span>Continuar a Confirmación</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: REGISTRAR DEVOLUCIÓN DE CALZADO POR CLIENTE (FASE 3)        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showDevolucionModal && pedidoDevolucionSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowDevolucionModal(false);
              setPedidoDevolucionSeleccionado(null);
              setDevolucionItemsMap({});
              setConfirmandoDevolucionPaso(false);
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDevolucionModal(false);
              setPedidoDevolucionSeleccionado(null);
              setDevolucionItemsMap({});
              setConfirmandoDevolucionPaso(false);
            }
          }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-3xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera oscura institucional */}
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 shrink-0">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">Registrar Devolución de Calzado</h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Pedido #{pedidoDevolucionSeleccionado.numeroCodigo || pedidoDevolucionSeleccionado.id.slice(0, 8)} · {pedidoDevolucionSeleccionado.clienteNombre || 'Cliente'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDevolucionModal(false);
                  setPedidoDevolucionSeleccionado(null);
                  setDevolucionItemsMap({});
                  setConfirmandoDevolucionPaso(false);
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0 text-xs">
              {/* Selector de Destino de Stock */}
              <div className="p-3.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-[var(--foreground)] block">
                  Destino de la Mercadería Devuelta:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDevolucionDestinoStock('REINGRESO_INVENTARIO')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      devolucionDestinoStock === 'REINGRESO_INVENTARIO'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                        : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <Package size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-[var(--foreground)]">📦 Reingreso a Bodega</div>
                      <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                        Calzado en óptimo estado (talla no le quedó, cambio de modelo). Regresa al stock vendible.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDevolucionDestinoStock('BAJA_POR_FALLA')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      devolucionDestinoStock === 'BAJA_POR_FALLA'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-300 font-bold shadow-xs'
                        : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                    <div>
                      <div className="text-xs font-bold text-[var(--foreground)]">⚠️ Falla / Garantía de Fábrica</div>
                      <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                        Calzado con defecto o falla. Queda retenido como merma para reclamo y devolución al fabricante.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Selector de Motivo de Devolución */}
              <div className="p-3.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-[var(--foreground)] block">
                  Motivo de la Devolución:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Defecto de fábrica / Garantía',
                    'Talla no le quedó al cliente',
                    'Cambio de modelo o color',
                    'Falla de pegado o costura',
                    'Cancelación comercial',
                  ].map((mot) => (
                    <button
                      key={mot}
                      type="button"
                      onClick={() => setDevolucionMotivo(mot)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        devolucionMotivo === mot
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]'
                      }`}
                    >
                      {mot}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <input
                    type="text"
                    value={devolucionObservacion}
                    onChange={(e) => setDevolucionObservacion(e.target.value)}
                    placeholder="Detalles u observaciones adicionales (opcional)..."
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Tarjetas de Modelos con Curva de Tallas entregadas (Rule 7 ModelTallaCurvaCard) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-[var(--foreground)]">
                    Modelos Entregados en este Pedido:
                  </label>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    Solo puedes devolver pares efectivamente entregados que no hayan sido devueltos antes.
                  </span>
                </div>

                {(() => {
                  const lineasEntregadas = (pedidoDevolucionSeleccionado.lines || []).filter(
                    (l: any) => (l.disponibleParaDevolver !== undefined ? l.disponibleParaDevolver > 0 : (l.cantidadEntregada || 0) > 0)
                  );

                  if (lineasEntregadas.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-[var(--muted-foreground)] bg-[var(--muted)]/20 rounded-2xl border border-dashed border-[var(--border)]">
                        No hay pares entregados disponibles para devolver en este pedido.
                      </div>
                    );
                  }

                  // Agrupar por modelo/color
                  const modelosGroup = new Map<string, any[]>();
                  lineasEntregadas.forEach((l: any) => {
                    const key = `${l.modelName || 'Calzado'}-${l.color || ''}-${l.serieNombre || ''}`;
                    const list = modelosGroup.get(key) || [];
                    list.push(l);
                    modelosGroup.set(key, list);
                  });

                  return Array.from(modelosGroup.entries()).map(([mKey, tallasGroup]) => {
                    const first = tallasGroup[0];
                    const sortedTallas = [...tallasGroup].sort(
                      (a, b) => (Number(a.numeroTalla) || 0) - (Number(b.numeroTalla) || 0)
                    );

                    const paresADevolverModelo = sortedTallas.reduce(
                      (acc, l) => acc + (devolucionItemsMap[l.id] || 0),
                      0
                    );
                    const subtotalDevolverModelo = sortedTallas.reduce(
                      (acc, l) => acc + (devolucionItemsMap[l.id] || 0) * Number(l.precioUnitario || 0),
                      0
                    );

                    return (
                      <div
                        key={mKey}
                        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-2xs hover:border-[var(--border)]/80 transition-all"
                      >
                        {/* Miniatura y Encabezado del Modelo */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            {first.imageUrl ? (
                              <img
                                src={first.imageUrl}
                                alt={first.modelName}
                                className="w-12 h-12 rounded-xl object-cover border border-[var(--border)] shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center shrink-0">
                                <Package size={20} className="text-[var(--muted-foreground)]" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-black uppercase text-xs sm:text-sm text-[var(--foreground)] tracking-tight">
                                {first.modelName || 'Calzado'}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {first.color && (
                                  <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
                                    Color: <span className="text-[var(--foreground)] font-bold">{first.color}</span>
                                  </span>
                                )}
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  Serie: {first.serieNombre || 'Estándar'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-semibold text-[var(--muted-foreground)]">Precio Venta:</span>
                            <div className="text-xs font-black font-mono text-[var(--foreground)]">
                              ${Number(first.precioUnitario || 0).toFixed(2)} / par
                            </div>
                          </div>
                        </div>

                        {/* Curva de Tallas Entregadas y Controles de Devolución */}
                        <div className="bg-[var(--muted)]/30 rounded-xl p-2.5 sm:p-3 border border-[var(--border)]/60">
                          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                            Pares Entregados vs Cantidad a Devolver:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {sortedTallas.map((l: any) => {
                              const numTalla = l.numeroTalla || 0;
                              const yaEntregado = l.cantidadEntregada || 0;
                              const yaDevuelto = l.cantidadDevuelta || 0;
                              const disponible = l.disponibleParaDevolver !== undefined
                                ? l.disponibleParaDevolver
                                : Math.max(0, yaEntregado - yaDevuelto);
                              const aDevolver = devolucionItemsMap[l.id] || 0;

                              return (
                                <div
                                  key={l.id}
                                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 min-w-[76px] transition-all ${
                                    aDevolver > 0
                                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200'
                                      : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]'
                                  }`}
                                >
                                  <span className="text-xs font-black font-mono">T{numTalla}</span>
                                  <span className="text-[9px] font-bold text-[var(--muted-foreground)]">
                                    Disp: {disponible}
                                  </span>
                                  {yaDevuelto > 0 && (
                                    <span className="text-[8px] font-semibold text-rose-600">
                                      Dev: {yaDevuelto}
                                    </span>
                                  )}

                                  {/* Controles numéricos − / + */}
                                  <div className="flex items-center gap-1 mt-1">
                                    <button
                                      type="button"
                                      disabled={aDevolver <= 0}
                                      onClick={() => {
                                        setDevolucionItemsMap((prev) => ({
                                          ...prev,
                                          [l.id]: Math.max(0, aDevolver - 1),
                                        }));
                                      }}
                                      className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs transition-colors ${
                                        aDevolver <= 0
                                          ? 'opacity-30 cursor-not-allowed bg-[var(--muted)] text-[var(--muted-foreground)]'
                                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 cursor-pointer'
                                      }`}
                                      title={`Restar 1 par a devolver T${numTalla}`}
                                    >
                                      −
                                    </button>
                                    <span className="w-5 text-center font-black font-mono text-xs">
                                      {aDevolver}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={aDevolver >= disponible}
                                      onClick={() => {
                                        setDevolucionItemsMap((prev) => ({
                                          ...prev,
                                          [l.id]: Math.min(disponible, aDevolver + 1),
                                        }));
                                      }}
                                      className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs transition-colors ${
                                        aDevolver >= disponible
                                          ? 'opacity-30 cursor-not-allowed bg-[var(--muted)] text-[var(--muted-foreground)]'
                                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 cursor-pointer'
                                      }`}
                                      title={`Sumar 1 par a devolver T${numTalla} (máx disponible: ${disponible})`}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Acciones Rápidas y Resumen del Modelo */}
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--border)]/60 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const nextMap = { ...devolucionItemsMap };
                                sortedTallas.forEach((l: any) => {
                                  const disp = l.disponibleParaDevolver !== undefined
                                    ? l.disponibleParaDevolver
                                    : Math.max(0, (l.cantidadEntregada || 0) - (l.cantidadDevuelta || 0));
                                  nextMap[l.id] = disp;
                                });
                                setDevolucionItemsMap(nextMap);
                              }}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Devolver Todo el Modelo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const nextMap = { ...devolucionItemsMap };
                                sortedTallas.forEach((l: any) => {
                                  nextMap[l.id] = 0;
                                });
                                setDevolucionItemsMap(nextMap);
                              }}
                              className="px-2.5 py-1 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--muted-foreground)] rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Limpiar Modelo
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] font-black text-rose-600 dark:text-rose-400">
                              {paresADevolverModelo} {paresADevolverModelo === 1 ? 'par' : 'pares'} a devolver
                            </span>
                            {subtotalDevolverModelo > 0 && (
                              <span className="text-[11px] font-mono font-bold text-[var(--muted-foreground)] ml-2">
                                (-${subtotalDevolverModelo.toFixed(2)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Barra de Totales Generales */}
              {(() => {
                const totalDevolucionGeneral = Object.values(devolucionItemsMap).reduce((acc, q) => acc + (Number(q) || 0), 0);
                let montoTotalDevolucionGeneral = 0;
                (pedidoDevolucionSeleccionado.lines || []).forEach((l: any) => {
                  const cant = Number(devolucionItemsMap[l.id] || 0);
                  if (cant > 0) {
                    montoTotalDevolucionGeneral += cant * Number(l.precioUnitario || 0);
                  }
                });

                return (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="text-xs text-slate-300">Total pares seleccionados para devolución:</div>
                        <div className="text-lg font-black text-rose-400 font-mono">
                          {totalDevolucionGeneral} pares
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-300">Descuento total a reflejar en cartera:</div>
                        <div className="text-lg font-black text-emerald-400 font-mono">
                          -${montoTotalDevolucionGeneral.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Paso de Confirmación dentro del Modal */}
                    {confirmandoDevolucionPaso && (
                      <div className="p-4 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-extrabold text-xs">
                          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                          <span>¿Confirmas el registro formal de esta devolución?</span>
                        </div>
                        <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                          Se procesarán <strong>{totalDevolucionGeneral} pares</strong> con destino{' '}
                          <strong>{devolucionDestinoStock === 'REINGRESO_INVENTARIO' ? 'REINGRESO A BODEGA' : 'BAJA POR FALLA / PROVEEDOR'}</strong>.
                          Se descontarán automáticamente <strong>${montoTotalDevolucionGeneral.toFixed(2)}</strong> de la deuda o se registrarán a favor del cliente si ya estaba cancelado.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Pinned Footer */}
            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
              {confirmandoDevolucionPaso ? (
                <>
                  <button
                    type="button"
                    disabled={procesandoDevolucion}
                    onClick={() => setConfirmandoDevolucionPaso(false)}
                    className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                  >
                    Volver y Modificar
                  </button>
                  <button
                    type="button"
                    disabled={procesandoDevolucion}
                    onClick={handleEjecutarDevolucion}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                  >
                    {procesandoDevolucion ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                    <span>Confirmar Devolución Definitiva</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDevolucionModal(false);
                      setPedidoDevolucionSeleccionado(null);
                      setDevolucionItemsMap({});
                      setConfirmandoDevolucionPaso(false);
                    }}
                    className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={
                      procesandoDevolucion ||
                      Object.values(devolucionItemsMap).reduce((acc, q) => acc + (Number(q) || 0), 0) === 0
                    }
                    onClick={() => {
                      const totalPares = Object.values(devolucionItemsMap).reduce((acc, q) => acc + (Number(q) || 0), 0);
                      if (totalPares === 0) {
                        showToast('Selecciona al menos 1 par para procesar la devolución.', 'warning');
                        return;
                      }
                      setConfirmandoDevolucionPaso(true);
                    }}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                  >
                    <RotateCcw size={15} />
                    <span>Continuar a Confirmación</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Modal de Corrección de Precio Post-Venta / Post-Entrega */}
      {showCorregirPrecioModal && pedidoACorregir && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCorregirPrecioModal(false);
              setPedidoACorregir(null);
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCorregirPrecioModal(false);
              setPedidoACorregir(null);
            }
          }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Corregir Precio de Venta
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Pedido #{pedidoACorregir.numeroCodigo || pedidoACorregir.id.slice(0, 8).toUpperCase()} · Se recalculan totales, nota de entrega y saldo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCorregirPrecioModal(false);
                  setPedidoACorregir(null);
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                💡 Si hubo un error en el precio pactado con el cliente, modifícalo aquí por modelo. Se aplicará a todos los colores de ese modelo y se reajustarán notas de entrega, total del pedido y saldos de cartera automáticamente.
              </div>

              {(() => {
                const modelosMap = new Map<string, {
                  modelKey: string;
                  modelName: string;
                  colores: Set<string>;
                  serieNombre: string;
                  imageUrl?: string;
                  productIds: Set<string>;
                  totalPares: number;
                  precioActual: number;
                }>();

                (pedidoACorregir.lines || []).forEach((l: any) => {
                  const modelKey = (l.modelId ? String(l.modelId) : '') || (l.modelName ? l.modelName.trim().toUpperCase() : '') || String(l.productId || l.id);
                  const pUnit = l.precioUnitario !== undefined && l.precioUnitario !== null
                    ? Number(l.precioUnitario)
                    : (l.precio !== undefined ? Number(l.precio) : Number(l.product?.precioVenta || l.product?.salePrice || 0));

                  if (!modelosMap.has(modelKey)) {
                    modelosMap.set(modelKey, {
                      modelKey,
                      modelName: l.modelName || l.product?.name || 'Calzado',
                      colores: new Set<string>(),
                      serieNombre: l.serieNombre || l.product?.serie?.nombre || 'Estándar',
                      imageUrl: l.imageUrl || l.product?.imageUrl,
                      productIds: new Set<string>(),
                      totalPares: 0,
                      precioActual: pUnit,
                    });
                  }

                  const m = modelosMap.get(modelKey)!;
                  if (l.color) m.colores.add(l.color.trim());
                  if (l.product?.color) m.colores.add(l.product.color.trim());
                  if (l.productId) m.productIds.add(l.productId);
                  if (!m.imageUrl && (l.imageUrl || l.product?.imageUrl)) {
                    m.imageUrl = l.imageUrl || l.product?.imageUrl;
                  }
                  m.totalPares += (l.cantidad || 0);
                  if (m.precioActual <= 0 && pUnit > 0) {
                    m.precioActual = pUnit;
                  }
                });

                const list = Array.from(modelosMap.values()).map((m) => ({
                  ...m,
                  productIds: Array.from(m.productIds),
                  coloresList: Array.from(m.colores).filter(Boolean),
                }));

                if (list.length === 0) {
                  return (
                    <div className="p-4 text-center text-xs text-[var(--muted-foreground)]">
                      No se encontraron líneas de calzado en este pedido.
                    </div>
                  );
                }

                // Cálculo de totales previos y nuevos
                let granTotalNuevo = 0;
                let granTotalPrevio = 0;
                list.forEach((m) => {
                  const valStr = preciosCorregirMap[m.modelKey] !== undefined
                    ? preciosCorregirMap[m.modelKey]
                    : (m.precioActual > 0 ? String(m.precioActual) : '');
                  const pNum = parseFloat(valStr) || 0;
                  granTotalNuevo += m.totalPares * pNum;
                  granTotalPrevio += m.totalPares * m.precioActual;
                });
                const difTotal = granTotalNuevo - granTotalPrevio;

                return (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {list.map((m) => {
                        const valorString = preciosCorregirMap[m.modelKey] !== undefined
                          ? preciosCorregirMap[m.modelKey]
                          : (m.precioActual > 0 ? String(m.precioActual) : '');
                        const precioEditadoNum = parseFloat(valorString) || 0;
                        const nuevoSubtotal = m.totalPares * precioEditadoNum;
                        const docenasTexto = m.totalPares % 12 === 0
                          ? `${m.totalPares / 12} ${m.totalPares / 12 === 1 ? 'Docena' : 'Docenas'}`
                          : (m.totalPares === 6 ? '½ Docena' : `${m.totalPares} pares`);

                        return (
                          <div
                            key={m.modelKey}
                            className="p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-purple-500/40 transition-colors"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <div
                                onClick={() => {
                                  if (m.imageUrl) setLightboxImage({ url: m.imageUrl, title: m.modelName });
                                }}
                                className={`w-14 h-14 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center ${
                                  m.imageUrl ? 'cursor-zoom-in hover:opacity-90' : ''
                                }`}
                                title={m.imageUrl ? 'Ver foto ampliada' : ''}
                              >
                                {m.imageUrl ? (
                                  <img src={m.imageUrl} alt={m.modelName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-2xl">👟</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-xs sm:text-sm text-[var(--foreground)] uppercase truncate">
                                  {m.modelName}
                                </h4>

                                {/* Colores agrupados del modelo */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span className="text-[10px] font-bold text-[var(--muted-foreground)]">
                                    Colores:
                                  </span>
                                  {m.coloresList.length > 0 ? (
                                    m.coloresList.map((col, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                                      >
                                        {col}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-[var(--muted-foreground)] italic">
                                      Estándar
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
                                  <span className="text-emerald-600 font-bold">
                                    Serie: {formatearNombreSerie(m.serieNombre)}
                                  </span>
                                  <span className="text-[var(--muted-foreground)] font-medium">
                                    · {m.totalPares} pares ({docenasTexto})
                                  </span>
                                </div>

                                <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                                  Precio registrado: ${m.precioActual.toFixed(2)} / par
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[var(--border)] shrink-0">
                              <div className="text-right">
                                <label className="text-[10px] font-bold text-[var(--muted-foreground)] block">
                                  Nuevo Precio / Par (Todos los colores):
                                </label>
                                <div className="flex items-center gap-1 mt-0.5 justify-end">
                                  <span className="text-xs font-bold text-[var(--muted-foreground)]">$</span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={valorString}
                                    onChange={(e) => {
                                      let val = e.target.value;
                                      val = val.replace(/[^0-9.]/g, '');
                                      const parts = val.split('.');
                                      if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                                      if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
                                        val = val.replace(/^0+/, '');
                                      }
                                      setPreciosCorregirMap((prev) => ({
                                        ...prev,
                                        [m.modelKey]: val,
                                      }));
                                    }}
                                    className="w-24 h-8 px-2 text-right text-xs font-bold bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-hidden focus:border-purple-600 font-mono shadow-inner"
                                  />
                                </div>
                                <div className="text-[11px] font-extrabold text-emerald-600 mt-0.5 font-mono">
                                  Subtotal: ${nuevoSubtotal.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resumen Comparativo de Totales */}
                    <div className="p-3.5 bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
                          Resumen General de la Corrección
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--foreground)]">
                          <span>Total actual: <strong className="font-mono">${granTotalPrevio.toFixed(2)}</strong></span>
                          <span>➔</span>
                          <span>Nuevo total: <strong className="font-mono text-emerald-600">${granTotalNuevo.toFixed(2)}</strong></span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-[var(--muted-foreground)] block">
                          Diferencia en Pedido:
                        </span>
                        <span className={`text-xs font-black font-mono ${difTotal > 0 ? 'text-amber-600' : (difTotal < 0 ? 'text-blue-600' : 'text-slate-500')}`}>
                          {difTotal > 0 ? `+ $${difTotal.toFixed(2)}` : (difTotal < 0 ? `- $${Math.abs(difTotal).toFixed(2)}` : '$0.00')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Pie con un solo botón de Guardar Cambios */}
            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCorregirPrecioModal(false);
                  setPedidoACorregir(null);
                }}
                disabled={guardandoCorreccionPrecio}
                className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={guardandoCorreccionPrecio}
                onClick={() => {
                  if (!pedidoACorregir) return;
                  const modelosMap = new Map<string, {
                    modelKey: string;
                    productIds: Set<string>;
                    modelName: string;
                    totalPares: number;
                    precioActual: number;
                  }>();

                  (pedidoACorregir.lines || []).forEach((l: any) => {
                    const modelKey = (l.modelId ? String(l.modelId) : '') || (l.modelName ? l.modelName.trim().toUpperCase() : '') || String(l.productId || l.id);
                    const pUnit = l.precioUnitario !== undefined && l.precioUnitario !== null
                      ? Number(l.precioUnitario)
                      : (l.precio !== undefined ? Number(l.precio) : Number(l.product?.precioVenta || l.product?.salePrice || 0));

                    if (!modelosMap.has(modelKey)) {
                      modelosMap.set(modelKey, {
                        modelKey,
                        productIds: new Set<string>(),
                        modelName: l.modelName || l.product?.name || 'Calzado',
                        totalPares: 0,
                        precioActual: pUnit,
                      });
                    }
                    const m = modelosMap.get(modelKey)!;
                    if (l.productId) m.productIds.add(l.productId);
                    m.totalPares += (l.cantidad || 0);
                    if (m.precioActual <= 0 && pUnit > 0) m.precioActual = pUnit;
                  });

                  const list = Array.from(modelosMap.values()).map((m) => ({
                    ...m,
                    productIds: Array.from(m.productIds),
                  }));

                  handleGuardarTodasCorreccionesPrecio(list);
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[42px]"
              >
                {guardandoCorreccionPrecio ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Guardando precios...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    <span>Guardar Todos los Precios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Préstamo Inter-Sucursal para Pedidos EN_ESPERA_STOCK */}
      {modalInterSucursalPedido && pedidoInterSucursal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModalInterSucursalPedido(false);
              setPedidoInterSucursal(null);
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalInterSucursalPedido(false);
              setPedidoInterSucursal(null);
            }
          }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 rounded-2xl border border-white/10 text-purple-400 font-bold shrink-0">
                  <Building size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Préstamo de Mercadería Inter-Sucursal
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Pedido #{pedidoInterSucursal.id.slice(0, 8)} · Cliente: {pedidoInterSucursal.clienteNombre || 'Consumidor'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalInterSucursalPedido(false);
                  setPedidoInterSucursal(null);
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-700 dark:text-purple-300">
                <strong>¿Cómo funciona?</strong> Este pedido se encuentra en espera de stock. Al solicitar mercadería a otra sucursal, los pares requeridos se descontarán del inventario de la sucursal prestamista y el pedido avanzará automáticamente a <strong>En Preparación</strong>.
              </div>

              {/* Selector de Sucursal Origen */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Sucursal que entregará/prestará la mercadería *
                </label>
                <select
                  value={interSucursalOrigenId}
                  onChange={(e) => handleSeleccionarSucursalInter(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="">-- Seleccionar sucursal de origen --</option>
                  {sucursalesEmpresa
                    .filter((s) => s.id !== pedidoInterSucursal.tenantId && s.id !== pedidoInterSucursal.sucursalId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.nombre} {s.code ? `(${s.code})` : ''} {s.isMatriz ? '⭐ Matriz' : ''}
                      </option>
                    ))}
                </select>
                {sucursalesEmpresa.filter((s) => s.id !== pedidoInterSucursal.tenantId && s.id !== pedidoInterSucursal.sucursalId).length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No hay otras sucursales configuradas en el sistema para realizar transferencias.
                  </p>
                )}
              </div>

              {/* Indicador de Estado de Disponibilidad de Stock en Origen */}
              {verificandoStockInterSucursal && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs flex items-center gap-2.5 text-purple-700 dark:text-purple-300 animate-pulse">
                  <Loader2 size={16} className="animate-spin text-purple-600 shrink-0" />
                  <span className="font-semibold">Verificando existencias y variantes en tiempo real en la sucursal seleccionada...</span>
                </div>
              )}

              {!verificandoStockInterSucursal && resultadoVerificacionStock && (
                resultadoVerificacionStock.tieneStockCompleto ? (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle size={18} className="shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-xs">
                        Stock disponible confirmado en {resultadoVerificacionStock.sucursalOrigenNombre}
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                        Esta sucursal cuenta con los <strong>{resultadoVerificacionStock.totalParesRequeridos} pares requeridos</strong> listos para ser transferidos a este pedido.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs flex items-start gap-2.5 text-rose-800 dark:text-rose-300">
                    <AlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-xs">
                        Sin stock suficiente en {resultadoVerificacionStock.sucursalOrigenNombre}
                      </div>
                      <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 leading-relaxed">
                        Faltan <strong>{resultadoVerificacionStock.totalFaltante} de los {resultadoVerificacionStock.totalParesRequeridos} pares solicitados</strong>. No es posible solicitar el préstamo a esta sucursal porque no dispone de la mercadería requerida.
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Modalidad de Compensación */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
                  Modalidad de Compensación / Arreglo
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInterSucursalModalidad('DEVOLUCION_MERCADERIA')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      interSucursalModalidad === 'DEVOLUCION_MERCADERIA'
                        ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]/50 text-[var(--foreground)]'
                    }`}
                  >
                    <div className="font-extrabold text-xs">🔄 Reposición de Pares</div>
                    <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      Devolver los mismos pares físicos cuando llegue nueva mercadería del taller o proveedor.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterSucursalModalidad('PAGO_INTERNO')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      interSucursalModalidad === 'PAGO_INTERNO'
                        ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]/50 text-[var(--foreground)]'
                    }`}
                  >
                    <div className="font-extrabold text-xs">💵 Compensación Interna</div>
                    <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      Ajuste contable interno de costos entre las cajas o balances de ambas sucursales.
                    </div>
                  </button>
                </div>
              </div>

              {/* Resumen de Artículos Solicitados en el Pedido con Validación por Talla */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
                  Artículos que se solicitarán en préstamo:
                </label>
                <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--muted)]/10 space-y-2.5 max-h-56 overflow-y-auto">
                  {pedidoInterSucursal.lines && pedidoInterSucursal.lines.length > 0 ? (
                    agruparLineasPorModelo(pedidoInterSucursal.lines).map((g) => (
                      <div key={g.key} className="flex items-start justify-between text-xs py-1.5 border-b border-[var(--border)]/40 last:border-0 gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-[var(--foreground)]">{g.modelName}</span>
                          <span className="text-[var(--muted-foreground)] ml-1">({g.color || 'Estándar'})</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {g.tallas.map((t) => {
                              // Buscar disponibilidad de esta talla en resultadoVerificacionStock
                              const matchItem = resultadoVerificacionStock?.desgloseLineas?.find(
                                (d: any) =>
                                  String(d.tallaNumero) === String(t.numero) &&
                                  (d.color === g.color || d.modelName === g.modelName)
                              );

                              if (!resultadoVerificacionStock || matchItem === undefined) {
                                return (
                                  <span key={t.numero} className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                                    T{t.numero}: {t.cantidad}p
                                  </span>
                                );
                              }

                              const tieneDisp = matchItem.stockDisponible >= t.cantidad;

                              return (
                                <span
                                  key={t.numero}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                                    tieneDisp
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                                  }`}
                                  title={tieneDisp ? `Stock disponible en origen: ${matchItem.stockDisponible} pares` : `Stock insuficiente en origen: solo hay ${matchItem.stockDisponible} pares (faltan ${matchItem.faltante})`}
                                >
                                  <span>T{t.numero}: {t.cantidad}p</span>
                                  <span className="font-normal opacity-85">({tieneDisp ? `disp: ${matchItem.stockDisponible}` : 'Sin stock'})</span>
                                  <span>{tieneDisp ? '✓' : '✗'}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <span className="font-extrabold text-purple-600 shrink-0 text-xs">
                          {g.totalPares} pares
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)] italic">Sin líneas registradas</span>
                  )}
                </div>
              </div>

              {/* Observaciones / Notas */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Notas u Observaciones (Opcional)
                </label>
                <textarea
                  value={interSucursalNotas}
                  onChange={(e) => setInterSucursalNotas(e.target.value)}
                  placeholder="Ej: Acordado entrega por mensajero a las 15:00..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>

            {/* Pie */}
            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModalInterSucursalPedido(false);
                  setPedidoInterSucursal(null);
                  setResultadoVerificacionStock(null);
                }}
                disabled={loadingInterSucursalPedido}
                className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarInterSucursal}
                disabled={
                  !interSucursalOrigenId ||
                  loadingInterSucursalPedido ||
                  verificandoStockInterSucursal ||
                  Boolean(resultadoVerificacionStock && !resultadoVerificacionStock.tieneStockCompleto)
                }
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer min-h-[42px] ${
                  resultadoVerificacionStock && !resultadoVerificacionStock.tieneStockCompleto
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 cursor-not-allowed opacity-80'
                    : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {loadingInterSucursalPedido ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Procesando Préstamo...
                  </>
                ) : verificandoStockInterSucursal ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Verificando Existencias...
                  </>
                ) : resultadoVerificacionStock && !resultadoVerificacionStock.tieneStockCompleto ? (
                  <>
                    <XCircle size={13} />
                    Sin Stock en Sucursal Seleccionada
                  </>
                ) : (
                  <>
                    <Building size={13} />
                    Confirmar Préstamo y Preparar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación y Sincronización Automática para Anular Pedido */}
      {pedidoParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            {/* Cabecera */}
            <div className="p-4 bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Anular Pedido #{getNumeroPedido(pedidoParaCancelar)}</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Cliente: <span className="font-bold text-white">{pedidoParaCancelar.clienteNombre || 'Consumidor'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPedidoParaCancelar(null)}
                disabled={loadingCancelacion}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 space-y-4">
              {pedidoParaCancelar.notas?.includes('[Préstamo Inter-Sucursal]') ? (
                <div className="p-3.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-900 dark:text-purple-300 flex items-start gap-2.5">
                  <RefreshCw size={18} className="shrink-0 text-purple-600 mt-0.5" />
                  <div>
                    <div className="font-black text-xs">🔄 Sincronización Automática con Sucursal Prestamista</div>
                    <div className="text-[11px] text-purple-700 dark:text-purple-400 mt-1 leading-relaxed">
                      Este pedido cuenta con un préstamo inter-sucursal activo. Al cancelarlo, <strong>los pares prestados serán devueltos y sincronizados de inmediato en el inventario de la sucursal de origen</strong>.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-500/10 border border-[var(--border)] rounded-xl text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Al anular este pedido, cualquier reserva de inventario físico será liberada de inmediato y las órdenes de compra asociadas serán ajustadas o canceladas de forma automática.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Motivo de Anulación (Opcional)
                </label>
                <textarea
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Ej: Cliente canceló por cambio de modelo o falta de tiempo..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>
            </div>

            {/* Pie */}
            <div className="p-4 bg-[var(--muted)]/30 border-t border-[var(--border)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPedidoParaCancelar(null)}
                disabled={loadingCancelacion}
                className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
              >
                Regresar
              </button>
              <button
                type="button"
                onClick={handleConfirmarCancelarPedido}
                disabled={loadingCancelacion}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loadingCancelacion ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Anulando y Sincronizando...
                  </>
                ) : (
                  <>
                    <XCircle size={13} />
                    Confirmar Anulación y Sincronizar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal de Foto de Calzado */}
      <ImageLightboxModal
        isOpen={Boolean(lightboxImage)}
        imageUrl={lightboxImage?.url || ''}
        title={lightboxImage?.title}
        onClose={() => setLightboxImage(null)}
      />

      {/* Modal para Crear Nuevo Cliente de forma Rápida e Inmediata */}
      <NuevoClienteModal
        isOpen={showNuevoClienteModal}
        onClose={() => setShowNuevoClienteModal(false)}
        onClienteCreado={handleClienteCreadoRapido}
        online={online}
        activeSucursalId={activeSucursalId}
        initialBusqueda={busquedaCliente}
        zIndexClass="z-[70]"
      />

      {/* Modal de confirmación de descarte de cambios */}
      <UnsavedChangesModal
        isOpen={showDiscardModal}
        targetSectionName="Comercial / Pedidos"
        detail={{ hasChanges: true, sectionName: "este formulario de Pedidos" }}
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

