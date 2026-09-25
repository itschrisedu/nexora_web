"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
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
} from 'lucide-react';

import { useToast } from './ui/toast';
import { getClienteReputacion } from '../utils/cliente-reputacion';
import { generarUrlPublicaPedidoCliente } from '../services/comprobante-url.service';
import { descargarPedidoClientePdf, PedidoClientePdfData } from '../services/pdf-factura.service';

interface ComercialProps {
  online: boolean;
  userRole?: string;
  userPermissions?: { permiteCambiarPrecio?: boolean; rol?: string };
  activeSucursalId?: string;
  sucursales?: { id: string; name: string; isMatriz: boolean }[];
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
  EN_ESPERA_STOCK:   { label: 'Espera de Stock',     color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',     icon: <Clock size={12} /> },
  ENTREGADO_PARCIAL: { label: 'Entrega Parcial',     color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',           icon: <Package size={12} /> },
  ENTREGADO:         { label: 'Entregado',          color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',  icon: <CheckCircle size={12} /> },
  CANCELADO:         { label: 'Anulado',            color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',           icon: <XCircle size={12} /> },
};

export default function ComercialComponent({ online, userRole, userPermissions, activeSucursalId, sucursales }: ComercialProps) {
  const { showToast } = useToast();
  const puedeCambiarPrecio = userRole === 'ROL_ADMIN' || userPermissions?.permiteCambiarPrecio === true;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | 'TODOS'>('TODOS');
  const [pedidoExpandidoId, setPedidoExpandidoId] = useState<string | null>(null);

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
  const [supplierOrderSubtipoSerie, setSupplierOrderSubtipoSerie] = useState<'MEDIA_DOCENA' | 'DOCENA'>('MEDIA_DOCENA');
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

  const [creatingOrder, setCreatingOrder] = useState(false);

  // ── Modal de Entrega Parcial / Total de Pedido ──
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [pedidoEntregaSeleccionado, setPedidoEntregaSeleccionado] = useState<Pedido | null>(null);
  const [entregaItemsMap, setEntregaItemsMap] = useState<Record<string, number>>({});
  const [procesandoEntrega, setProcesandoEntrega] = useState(false);

  // Cupones Promocionales (Fase E2)
  const [codigoCuponInput, setCodigoCuponInput] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<any | null>(null);

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
  };

  const isDirtyOrder = useCallback(() => {
    return showModal && (lineasPedido.length > 0 || clientId !== '' || notasPedido.trim() !== '');
  }, [showModal, lineasPedido.length, clientId, notasPedido]);

  const isDirtySupplierOrder = useCallback(() => {
    return showSupplierOrderModal && (selectedSupplierId !== '' || supplierOrderObservaciones.trim() !== '' || Object.keys(supplierOrderTallasMap).length > 0);
  }, [showSupplierOrderModal, selectedSupplierId, supplierOrderObservaciones, supplierOrderTallasMap]);

  const isDirtyNuevoTransporte = useCallback(() => {
    return showNuevoTransporteModal && nuevoTransporteNombre.trim() !== '';
  }, [showNuevoTransporteModal, nuevoTransporteNombre]);

  const isDirtyEnvio = useCallback(() => {
    return showModalEnvio && (envioModalGuiaEnvio.trim() !== '' || envioModalDireccionEnvio.trim() !== '' || envioModalCiudadEnvio.trim() !== '');
  }, [showModalEnvio, envioModalGuiaEnvio, envioModalDireccionEnvio, envioModalCiudadEnvio]);

  const isDirtyEntrega = useCallback(() => {
    return showEntregaModal && Object.keys(entregaItemsMap).length > 0;
  }, [showEntregaModal, entregaItemsMap]);

  // Manejador global de la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDiscardModal) return;
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
      if (showEntregaModal) {
        e.preventDefault();
        safeDismiss(() => { setShowEntregaModal(false); setPedidoEntregaSeleccionado(null); setEntregaItemsMap({}); }, isDirtyEntrega());
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
    showDiscardModal, showNuevoTransporteModal, showModalEnvio, showEntregaModal,
    showSupplierOrderModal, showModal, safeDismiss, isDirtyNuevoTransporte,
    isDirtyEnvio, isDirtyEntrega, isDirtySupplierOrder, isDirtyOrder
  ]);
  const [validandoCupon, setValidandoCupon] = useState(false);
  const [cuponErrorMsg, setCuponErrorMsg] = useState('');

  // Búsqueda interactiva de Modelos de productos
  const [busquedaModelo, setBusquedaModelo] = useState('');
  const [showDropdownModelo, setShowDropdownModelo] = useState(false);
  const [productoSeleccionadoObj, setProductoSeleccionadoObj] = useState<any | null>(null);

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

  // Consultar último precio al cliente cuando cambia el producto seleccionado o el cliente
  useEffect(() => {
    const fetchUltimoPrecio = async () => {
      if (!clientId || !selectedProductId || !online) {
        setUltimoPrecioCliente(null);
        setFechaUltimaVenta(null);
        return;
      }
      try {
        const data = await ApiService.get(`/pedidos/ultimo-precio?clientId=${clientId}&productId=${selectedProductId}`);
        const precioAnterior = data.precioAnterior ? Number(data.precioAnterior) : null;
        setUltimoPrecioCliente(precioAnterior);
        setFechaUltimaVenta(data.fechaUltimaVenta ? new Date(data.fechaUltimaVenta).toLocaleDateString('es-EC') : null);
        // Auto-aplicar el último precio del cliente como precio por defecto
        if (precioAnterior && precioAnterior > 0) {
          setPrecioItem(precioAnterior);
          setPrecioItemInput(String(precioAnterior));
        }
      } catch {
        setUltimoPrecioCliente(null);
        setFechaUltimaVenta(null);
      }
    };
    fetchUltimoPrecio();
  }, [clientId, selectedProductId, online]);

  const [businessConfig, setBusinessConfig] = useState<any | null>(null);

  useEffect(() => {
    loadPedidos();
    loadListaClientes();
    cargarCatalogo();
    loadBusinessConfig();
    loadSeriesConfig();
    loadListaProveedores();
    loadTransportes();
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
    const esMediaDocena = item.subtipoSerie === 'MEDIA_DOCENA';
    const esDocena = item.subtipoSerie === 'DOCENA';
    const esSerieCompleta = item.tipoVenta === 'SERIE_COMPLETA' || item.tipoVenta === 'SERIE_ESPECIAL' || esMediaDocena || esDocena;

    setSupplierOrderModalType(esSerieCompleta ? 'SERIE_COMPLETA' : 'NUMERACION');
    setSupplierOrderSubtipoSerie(esDocena ? 'DOCENA' : 'MEDIA_DOCENA');
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
      [38, 39, 40, 41, 42, 43].forEach(num => {
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
      ? (supplierOrderSubtipoSerie === 'MEDIA_DOCENA' ? 6 : 12) * supplierOrderCantSeries
      : Object.values(supplierOrderTallasMap).reduce((a, b) => a + (b || 0), 0);

    if (paresTotales <= 0) {
      showToast('La cantidad de pares debe ser mayor a 0.', 'warning');
      return;
    }

    setSavingSupplierOrder(true);
    try {
      let detalleNumeracion = '';
      if (supplierOrderModalType === 'SERIE_COMPLETA') {
        detalleNumeracion = `Serie Completa: ${supplierOrderSubtipoSerie === 'MEDIA_DOCENA' ? '½ Docena (6 pares)' : '1 Docena (12 pares)'} x ${supplierOrderCantSeries} pedido(s)`;
      } else {
        const tallasDesglose = Object.entries(supplierOrderTallasMap)
          .filter(([_, qty]) => qty > 0)
          .map(([key, qty]) => `${key}: ${qty} pares`)
          .join(', ');
        detalleNumeracion = `Por Numeración: ${tallasDesglose}`;
      }

      const notaFinal = [
        `Modelo: ${supplierOrderProductData.modelName} (${supplierOrderProductData.color}) - Serie: ${supplierOrderProductData.serieNombre || 'Estándar'}`,
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

  const construirPedidoPdfData = (p: Pedido): PedidoClientePdfData => {
    const cliente = listaClientes.find((c) => c.id === p.clientId);
    const clienteNombre = p.clienteNombre || cliente?.nombre || 'Estimado/a Cliente';
    const negocioNombre = businessConfig?.nombre || 'NEXORA';
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
        nombre: negocioNombre,
        ruc: businessConfig?.ruc,
        direccion: businessConfig?.direccion,
        telefono: businessConfig?.telefono,
        email: businessConfig?.email,
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

  const handleVerComprobanteDigital = (p: Pedido) => {
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

    const urlComprobante = generarUrlPublicaPedidoCliente({
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
      },
    });

    window.open(urlComprobante, '_blank');
  };

  const handleEnviarConfirmacionWhatsApp = (p: Pedido, clienteTel?: string) => {
    const cliente = listaClientes.find((c) => c.id === p.clientId);
    const telefono = clienteTel || cliente?.telefono;
    if (!telefono) {
      showToast('El cliente no tiene número de teléfono registrado.', 'warning');
      return;
    }

    const numPedido = p.numeroCodigo || (p.numero ? `#${String(p.numero).padStart(4, '0')}` : `#${p.id.slice(0, 6).toUpperCase()}`);
    const fecha = new Date(p.createdAt || new Date()).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    const clienteNombre = p.clienteNombre || cliente?.nombre || 'Estimado/a Cliente';
    const negocioNombre = businessConfig?.nombre || 'NEXORA';

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
        const resolvedSerie = item.serieNombre || item.serie || catProd?.serieNombre || 'Serie';
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

    // Generar enlace digital oficial del comprobante
    const urlComprobante = generarUrlPublicaPedidoCliente({
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

    const tieneAbono = Number((p as any).totalAbonado || (p as any).abono || 0) > 0 || (p as any).adelantoRegistrado === true || p.tipoPago === 'ANTICIPO' || p.tipoPago === 'ADELANTO';

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

    const mensaje = `Estimado/a *${clienteNombre}*,\n\nLe saludamos de *${negocioNombre}*. Confirmamos la recepción de su pedido:\n\n📦 *PEDIDO ${numPedido}*\n📅 *Fecha:* ${fecha}\n💳 *Forma de Pago:* ${p.tipoPago || 'Contado'}${p.tipoEntrega === 'ENVIO' ? `\n🚚 *Envío:* ${p.courier || 'Transporte'}${p.guiaEnvio ? ` (Guía: ${p.guiaEnvio})` : ''}` : ''}${obsGeneralTexto}${tiempoEntregaTexto}\n\n👟 *DETALLE DE ARTÍCULOS:*${desgloseTexto || '\n• ' + (p.lines?.length || 1) + ' ítems'}\n\n📊 *Total pares pedidos:* ${(p.lines || []).reduce((sum: number, l: any) => sum + (l.cantidad || 0), 0)} pares\n💰 *VALOR TOTAL:* $${Number(p.montoTotal).toFixed(2)}\n\n🔗 *Ver Comprobante Digital Oficial y Descargar PDF:*\n${urlComprobante}\n\nPor favor, confírmenos respondiendo a este mensaje con un *"Confirmado"* o *"OK"* para proceder con la preparación y entrega. ¡Muchas gracias por su preferencia!\n*${negocioNombre}*`;

    let numLimpio = telefono.replace(/\D/g, '');
    if (numLimpio.startsWith('09') && numLimpio.length === 10) {
      numLimpio = '593' + numLimpio.substring(1);
    } else if (numLimpio.startsWith('0') && numLimpio.length === 10) {
      numLimpio = '593' + numLimpio.substring(1);
    }

    const url = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const handleEnviarPedidoEntregadoWhatsApp = (p: Pedido, clienteTel?: string) => {
    const cliente = listaClientes.find((c) => c.id === p.clientId);
    const telefono = clienteTel || cliente?.telefono;
    if (!telefono) {
      showToast('El cliente no tiene número de teléfono registrado para WhatsApp.', 'warning');
      return;
    }

    const numPedido = p.numeroCodigo || (p.numero ? `#${String(p.numero).padStart(4, '0')}` : `#${p.id.slice(0, 6).toUpperCase()}`);
    const fecha = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    const clienteNombre = p.clienteNombre || cliente?.nombre || 'Estimado/a Cliente';
    const negocioNombre = businessConfig?.nombre || 'NEXORA';

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
        const resolvedSerie = item.serieNombre || item.serie || catProd?.serieNombre || 'Serie';
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

    const urlComprobante = generarUrlPublicaPedidoCliente({
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
        nombre: negocioNombre,
        ruc: businessConfig?.ruc,
        direccion: businessConfig?.direccion,
        telefono: businessConfig?.telefono,
      },
      lineas: lineasComprobante,
      totales: {
        totalPares: totalParesEntregadosGeneral,
        totalPagar: Number(p.montoTotal || 0),
      },
    });

    const estadoTexto = esEntregaTotal ? '✅ *ENTREGA COMPLETADA (100%)*' : '📦 *ENTREGA PARCIAL REALIZADA*';
    const pendienteTexto = !esEntregaTotal ? `\n⏳ *Pares pendientes por entregar:* ${Math.max(0, totalParesPedidoGeneral - totalParesEntregadosGeneral)} pares` : '';

    const mensaje = `Estimado/a *${clienteNombre}*,\n\nLe saludamos de *${negocioNombre}*.\n\nLe notificamos que se ha registrado la entrega de su pedido:\n\n${estadoTexto}\n📄 *PEDIDO ${numPedido}*\n📅 *Fecha de Entrega:* ${fecha}\n💳 *Forma de Pago:* ${p.tipoPago || 'Contado'}${p.tipoEntrega === 'ENVIO' ? `\n🚚 *Envío:* ${p.courier || 'Transporte'}${p.guiaEnvio ? ` (Guía: ${p.guiaEnvio})` : ''}` : ''}\n\n👟 *DETALLE DE CALZADO ENTREGADO:*${desgloseTexto || '\n• ' + (p.lines?.length || 1) + ' ítems'}\n\n📊 *Total pares entregados acumulados:* ${totalParesEntregadosGeneral} de ${totalParesPedidoGeneral} pares${pendienteTexto}\n💰 *Total pedido:* $${Number(p.montoTotal).toFixed(2)}\n\n🔗 *Descargar Nota de Entrega / Comprobante Oficial en PDF:*\n${urlComprobante}\n\n¡Muchas gracias por su preferencia!\n*${negocioNombre}*`;

    let numLimpio = telefono.replace(/\D/g, '');
    if (numLimpio.startsWith('09') && numLimpio.length === 10) {
      numLimpio = '593' + numLimpio.substring(1);
    } else if (numLimpio.startsWith('0') && numLimpio.length === 10) {
      numLimpio = '593' + numLimpio.substring(1);
    }

    const url = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const cargarCatalogo = async () => {
    try {
      if (online) {
        const res = await ApiService.get('/catalogo/productos');
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
              modelName: modelo.name,
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
          setListaClientes(
            data.map((c: any) => ({
              id: c.id,
              nombre: `${c.nombre || ''} ${c.apellido || ''}`.trim() || c.nombre || 'Cliente',
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
            }))
          );
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
      
      const initialMap: Record<string, number> = {};
      if (pObj.tallas) {
        pObj.tallas.forEach((t: any) => {
          const ratio = t.ratio || t.cantidadSerie || 1;
          const key = t.tallaId || `t-${t.numero ?? t.nombre}`;
          initialMap[key] = tipoVentaItem === 'SERIE_COMPLETA' ? ratio : 0;
        });
      }
      setTallaCantidadesMap(initialMap);
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
          { id: 't-esp-43', numero: 43 },
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

  const handleCrearPedidoOnline = async () => {
    if (!clientId) {
      setErrorMsg('Debes seleccionar un cliente.');
      return;
    }
    if (lineasPedido.length === 0) {
      setErrorMsg('Debes agregar al menos una línea de producto al pedido.');
      return;
    }

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
        lineas: lineasPedido.map((l) => ({
          productId: l.productId,
          tallaId: l.tallaId,
          cantidad: l.cantidad,
          tipoVenta: l.tipoVenta,
          observacion: l.observacionModelo || undefined,
        })),
        notas: notasFinales || undefined,
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
        const data = await ApiService.get('/pedidos');
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
    let orderToUse = p;
    try {
      if (online) {
        const fresh = await ApiService.get(`/pedidos/${p.id}`);
        if (fresh && fresh.lines) orderToUse = fresh;
      }
    } catch (e) {}

    setPedidoEntregaSeleccionado(orderToUse);
    const initialMap: Record<string, number> = {};
    (orderToUse.lines || []).forEach((l: any) => {
      const cantPedida = l.cantidad || 0;
      const cantEntregada = l.cantidadEntregada !== undefined ? l.cantidadEntregada : 0;
      const pendiente = l.cantidadPendiente !== undefined ? l.cantidadPendiente : Math.max(0, cantPedida - cantEntregada);
      const disponible = l.stockFisico !== undefined ? l.stockFisico : (l.stockDisponible !== undefined ? l.stockDisponible : pendiente);
      const sugerido = Math.min(pendiente, Math.max(0, disponible));
      initialMap[l.id] = sugerido;
    });
    setEntregaItemsMap(initialMap);
    setShowEntregaModal(true);
  };

  const handleEntregarItems = async () => {
    if (!pedidoEntregaSeleccionado) return;

    const items = Object.entries(entregaItemsMap)
      .map(([lineId, cant]) => ({
        lineId,
        cantidadAEntregar: Number(cant) || 0,
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

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroEstado === 'TODOS') return true;
    return p.estado === filtroEstado;
  });

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
            setMetodoPagoContado('EFECTIVO');
            setReferenciaComprobante('');
            setErrorMsg('');
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm shrink-0"
        >
          <Plus size={16} />
          <span>Nuevo Pedido</span>
        </button>
      </div>

      {/* Filtros de Estado */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFiltroEstado('TODOS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filtroEstado === 'TODOS'
              ? 'bg-[#0F172A] text-white shadow-xs'
              : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Todos ({pedidos.length})
        </button>
        {(['PENDIENTE', 'EN_PREPARACION', 'ENTREGADO_PARCIAL', 'ENTREGADO', 'CANCELADO'] as EstadoPedido[]).map((st) => {
          const cfg = ESTADO_CONFIG[st];
          const count = pedidos.filter((p) => p.estado === st).length;
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

      {/* Tabla de Pedidos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[#0F172A] mb-2" size={32} />
          <span className="text-sm">Cargando pedidos...</span>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          No hay pedidos registrados con este estado.
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--muted)]/40 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-6 py-4 flex items-center gap-1"><ArrowUpDown size={12} />N° Pedido</th>
                  <th className="px-6 py-4">Cliente</th>
                  {activeSucursalId === 'TODAS' && (
                    <th className="px-6 py-4 text-center">Sucursal</th>
                  )}
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
                        onClick={() => setPedidoExpandidoId(isExpanded ? null : p.id)}
                        className={`hover:bg-[var(--muted)]/30 transition-colors cursor-pointer ${isExpanded ? 'bg-[#0F172A]/5' : ''}`}
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
                                <span className="font-bold text-xs text-[var(--foreground)]">{nombreCompleto}</span>
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
                                      <span>Vendedor: {p.vendedorNombre}</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        {activeSucursalId === 'TODAS' && (
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
                              <Building size={12} className="shrink-0" />
                              <span>{p.sucursalNombre || 'Matriz'}</span>
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-[var(--muted)] text-[var(--muted-foreground)] rounded text-[10px] font-semibold">{p.tipoPago}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-emerald-600">${Number(p.montoTotal).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-[10px] text-[var(--muted-foreground)]">
                          {new Date(p.createdAt).toLocaleDateString('es-EC')}
                        </td>
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Botón rápido para gestionar logística de envío */}
                            <button
                              type="button"
                              onClick={() => handleAbrirModalEnvio(p)}
                              className="px-2 py-1 bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-blue-500/20 flex items-center gap-1"
                              title="Gestionar Courier, Guía y Flete de este pedido"
                            >
                              <Truck size={12} /> Logística
                            </button>

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
                                <button
                                  onClick={() => handleAbrirEntrega(p)}
                                  className="px-2.5 py-1 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-emerald-600/20 flex items-center gap-1"
                                  title="Entregar pares disponibles en bodega con descuento de inventario"
                                >
                                  <PackageCheck size={12} /> Entregar
                                </button>
                                {p.estado === 'ENTREGADO_PARCIAL' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEnviarPedidoEntregadoWhatsApp(p);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center gap-1"
                                    title="Enviar Comprobante de Entrega por WhatsApp"
                                  >
                                    <MessageCircle size={12} /> WhatsApp
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCambiarEstado(p.id, 'CANCELADO')}
                                  className="px-2.5 py-1 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-rose-500/20 flex items-center gap-1"
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEnviarPedidoEntregadoWhatsApp(p);
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
                                      handleEnviarConfirmacionWhatsApp(p);
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
                                          <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
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
                                                  {g.color ? `${g.color} · ${g.serieNombre || 'Calzado'}` : (g.serieNombre || 'Calzado')}
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
                                              <span className="text-[var(--muted-foreground)] text-[10px]">
                                                ${g.precioUnitario.toFixed(2)} c/u
                                              </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowModal(false); setEditingOrderId(null); resetPedidoForm(); }, isDirtyOrder()); }}>
          <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal Estandarizado */}
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold">
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
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
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
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Cliente *</label>
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
                        </div>
                      );
                    })() : (
                      <div>
                        <div className="relative">
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
                                <div className="p-3 text-center text-xs text-[var(--muted-foreground)]">
                                  No se encontraron clientes con "{busquedaDebounced}".
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
                      <button
                        type="button"
                        onClick={() => {
                          setTipoPago('CREDITO');
                          if (cuponAplicado?.promocion && cuponAplicado.promocion.aplicaPara === 'SOLO_CONTADO') {
                            setCuponAplicado(null);
                            setCuponErrorMsg('El cupón se removió automáticamente: solo es válido para pagos de Contado.');
                          }
                        }}
                        className={`h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          tipoPago === 'CREDITO'
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
                        }`}
                      >
                        <CreditCard size={13} />
                        <span>Crédito</span>
                      </button>
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

              {/* 1.1 SECCIÓN LOGÍSTICA DE ENTREGA Y FLETE (Fase E1) */}
              <div className="p-4 bg-[var(--muted)]/20 rounded-xl border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
                    1.1 Modalidad de Entrega y Logística (Flete)
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

              {/* 2. SECCIÓN AGREGAR PRODUCTO, MODELO Y TALLA */}
              <div className="p-4 bg-[var(--muted)]/20 rounded-xl border border-[var(--border)] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">2. Seleccionar Modelo, Talla y Cantidad</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative sm:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Modelo / Producto * (Buscar por Nombre o Color)</label>
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
                              Serie: {productoSeleccionadoObj.serieNombre || 'Serie Estándar'}
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
                        <input
                          type="text"
                          placeholder="Escribe para buscar modelo (ej. Mocasín, Botín, Negro)..."
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
                            {catalogoProductos
                              .filter((p) => {
                                const q = busquedaModelo.toLowerCase().trim();
                                if (!q) return false;
                                return (
                                  p.modelName.toLowerCase().includes(q) ||
                                  (p.color && p.color.toLowerCase().includes(q)) ||
                                  (p.serieNombre && p.serieNombre.toLowerCase().includes(q)) ||
                                  (p.code && p.code.toLowerCase().includes(q))
                                );
                              })
                              .map((p) => {
                                const totalPares = (p.tallas || []).reduce(
                                  (sum: number, t: any) => sum + (t.cantidad ?? t.stock ?? 0),
                                  0
                                );
                                const docenas = Math.floor(totalPares / 12);
                                const mediasDocenas = Math.floor(totalPares / 6);

                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSeleccionarProducto(p)}
                                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-[#0F172A]/10 transition-colors border-b border-[var(--border)] last:border-none flex items-center justify-between gap-3 font-bold text-[var(--foreground)]"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {p.imageUrl ? (
                                        <img src={p.imageUrl} alt="" className="w-10 h-10 object-cover rounded-lg border border-[var(--border)] shrink-0" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-[var(--muted)]/50 flex items-center justify-center text-sm shrink-0">👟</div>
                                      )}
                                      <div className="min-w-0">
                                        <span className="block font-bold text-[var(--foreground)] truncate">{p.modelName}</span>
                                        <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                          <span className="text-[var(--muted-foreground)] font-medium">Color: <strong className="text-[var(--foreground)]">{p.color}</strong></span>
                                          <span className="text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                            Serie: {p.serieNombre || 'Estándar'}
                                          </span>
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
                              })}
                            {catalogoProductos.filter((p) => {
                              const q = busquedaModelo.toLowerCase().trim();
                              if (!q) return false;
                              return (
                                p.modelName.toLowerCase().includes(q) ||
                                (p.color && p.color.toLowerCase().includes(q)) ||
                                (p.serieNombre && p.serieNombre.toLowerCase().includes(q)) ||
                                (p.code && p.code.toLowerCase().includes(q))
                              );
                            }).length === 0 && (
                              <div className="p-3 text-center text-xs text-[var(--muted-foreground)]">
                                No se encontraron combinaciones coincidentes con "{busquedaModelo}".
                              </div>
                            )}
                          </div>
                        )}
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
                            const map: Record<string, number> = {};
                            productoSeleccionadoObj.tallas.forEach((t: any) => {
                              const ratio = t.ratio || t.cantidadSerie || 1;
                              const key = t.tallaId || `t-${t.numero ?? t.nombre}`;
                              map[key] = ratio;
                            });
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
                        onClick={() => setTipoVentaItem('TALLA_ESPECIFICA')}
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
                            const map: Record<string, number> = {};
                            sObj.tallas.forEach((t: any) => {
                              map[t.id || `t-${t.numero}`] = 1;
                            });
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
                            { id: 't-esp-43', numero: 43 },
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

                      const serieNombreDisplay = tipoVentaItem === 'SERIE_ESPECIAL'
                        ? (listaSeriesDisponibles.find((s) => s.id === serieEspecialId)?.nombre?.replace(/_/g, ' ') || 'Serie Especial')
                        : (prodObj.serieNombre || 'ADULTO');

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

                                  {/* Acciones Rápidas */}
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newMap: Record<string, number> = { ...tallaCantidadesMap };
                                        tallasList.forEach((t: any) => {
                                          const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                                          newMap[key] = (newMap[key] || 0) + 1;
                                        });
                                        setTallaCantidadesMap(newMap);
                                      }}
                                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                    >
                                      +1 par c/talla
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newMap: Record<string, number> = { ...tallaCantidadesMap };
                                        tallasList.forEach((t: any) => {
                                          const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                                          newMap[key] = Math.max(0, (newMap[key] || 0) - 1);
                                        });
                                        setTallaCantidadesMap(newMap);
                                      }}
                                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                    >
                                      −1 par c/talla
                                    </button>

                                    {tipoVentaItem === 'SERIE_COMPLETA' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newMap: Record<string, number> = {};
                                            tallasList.forEach((t: any) => {
                                              const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                                              const ratio = t.ratio || t.cantidadSerie || 1;
                                              newMap[key] = ratio;
                                            });
                                            setTallaCantidadesMap(newMap);
                                          }}
                                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                        >
                                          ½ Docena (6 pares)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newMap: Record<string, number> = {};
                                            tallasList.forEach((t: any) => {
                                              const key = t.tallaId || t.id || `t-${t.numero ?? t.nombre}`;
                                              const ratio = t.ratio || t.cantidadSerie || 1;
                                              newMap[key] = ratio * 2;
                                            });
                                            setTallaCantidadesMap(newMap);
                                          }}
                                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                        >
                                          1 Docena (12 pares)
                                        </button>
                                      </>
                                    )}

                                    <span className="text-[11px] text-[var(--muted-foreground)] font-mono font-medium">
                                      = {totalParesConfig} pares total
                                    </span>
                                  </div>

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
                                      const valStr = e.target.value;
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
                                <Plus size={14} />
                                <span>+ Agregar al Pedido</span>
                              </button>
                            </div>
                          </div>

                          {/* Info de último precio al cliente si aplica */}
                          {ultimoPrecioCliente !== null && selectedProductId && clientId && (
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs">
                              <span className="text-emerald-600 text-sm">✅</span>
                              <div>
                                <span className="font-bold text-emerald-700 dark:text-emerald-300">Precio del historial del cliente: </span>
                                <span className="font-black text-emerald-800 dark:text-emerald-200">${ultimoPrecioCliente.toFixed(2)}</span>
                                {fechaUltimaVenta && <span className="text-emerald-600 ml-1">({fechaUltimaVenta})</span>}
                              </div>
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
                                  {primerItem.color} · <span className="font-semibold text-emerald-600">Serie: {primerItem.serieNombre || 'Estándar'}</span>
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
                                                (item) => item.productId === l.productId && item.tallaId === l.tallaId && item.tipoVenta === l.tipoVenta
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
                                                (item) => item.productId === l.productId && item.tallaId === l.tallaId && item.tipoVenta === l.tipoVenta
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

                                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nuevasLineas = lineasPedido.map(item => {
                                          if (item.productId === primerItem.productId && item.tipoVenta === primerItem.tipoVenta) {
                                            return { ...item, cantidad: item.cantidad + 1 };
                                          }
                                          return item;
                                        });
                                        setLineasPedido(nuevasLineas);
                                      }}
                                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                    >
                                      +1 par c/talla
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nuevasLineas = lineasPedido.map(item => {
                                          if (item.productId === primerItem.productId && item.tipoVenta === primerItem.tipoVenta) {
                                            return { ...item, cantidad: Math.max(1, item.cantidad - 1) };
                                          }
                                          return item;
                                        });
                                        setLineasPedido(nuevasLineas);
                                      }}
                                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                    >
                                      −1 par c/talla
                                    </button>
                                    <span className="text-[11px] text-[var(--muted-foreground)] font-mono font-medium">
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
                                            if (item.productId === primerItem.productId && item.tipoVenta === primerItem.tipoVenta) {
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
                                  ) : (
                                    <div className="mt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nota = window.prompt(`Observación para ${primerItem.modelName} (ej. hebilla dorada, suela especial):`);
                                          if (nota !== null && nota.trim().length > 0) {
                                            const nuevasLineas = lineasPedido.map(item => {
                                              if (item.productId === primerItem.productId && item.tipoVenta === primerItem.tipoVenta) {
                                                return { ...item, observacionModelo: nota.trim() };
                                              }
                                              return item;
                                            });
                                            setLineasPedido(nuevasLineas);
                                          }
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
                                  // Eliminar todas las líneas de este grupo
                                  setLineasPedido(lineasPedido.filter((l) => !(l.productId === primerItem.productId && l.tipoVenta === primerItem.tipoVenta)));
                                }}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar del pedido"
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

              {/* 3. CUPÓN DE DESCUENTO PROMOCIONAL (FASE E2) */}
              {lineasPedido.length > 0 && (
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

              {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">{errorMsg}</div>}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {(() => {
                const subtotalBase = lineasPedido.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
                const descCupon = cuponAplicado ? Number(cuponAplicado.descuentoCalculado || 0) : 0;
                const totalConDescuento = Math.max(0, subtotalBase - descCupon);

                return (
                  <div className="text-xs space-y-0.5">
                    {descCupon > 0 && (
                      <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                        <span>Subtotal: ${subtotalBase.toFixed(2)}</span>
                        <span className="text-purple-600 font-bold">Cupón ({cuponAplicado.promocion?.codigo}): -${descCupon.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--muted-foreground)]">Total a Pagar: </span>
                      <span className="font-black text-base text-emerald-600">
                        ${totalConDescuento.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                >
                  Cancelar
                </button>

                {online ? (
                  <button
                    type="button"
                    disabled={creatingOrder || lineasPedido.length === 0 || !clientId}
                    onClick={handleCrearPedidoOnline}
                    className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {creatingOrder ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    {creatingOrder
                      ? (editingOrderId ? 'Guardando Cambios...' : 'Creando Pedido...')
                      : (editingOrderId ? 'Guardar Cambios del Pedido' : 'Guardar Pedido Completo')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGuardarOffline}
                    disabled={savingOffline}
                    className="px-5 py-2 bg-amber-500 text-slate-900 font-bold text-xs rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowSupplierOrderModal(false); setSupplierOrderProductData(null); }, isDirtySupplierOrder()); }}>
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Orden de Fabricación / Compra</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Especifica curva, numeración y observaciones para el proveedor</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSupplierOrderModal(false);
                  setSupplierOrderProductData(null);
                }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearOrdenProveedor} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Resumen del Artículo */}
              <div className="p-3 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Artículo Solicitado</span>
                <p className="text-xs font-black text-[var(--foreground)]">
                  {supplierOrderProductData.modelName} ({supplierOrderProductData.color})
                </p>
                <p className="text-[11px] text-purple-700 font-semibold">
                  Serie: {supplierOrderProductData.serieNombre || 'Especial'}
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSupplierOrderSubtipoSerie('MEDIA_DOCENA')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border text-center transition-all ${
                          supplierOrderSubtipoSerie === 'MEDIA_DOCENA'
                            ? 'bg-purple-600 text-white border-transparent'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]'
                        }`}
                      >
                        ½ Media Docena (6 pares)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSupplierOrderSubtipoSerie('DOCENA')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border text-center transition-all ${
                          supplierOrderSubtipoSerie === 'DOCENA'
                            ? 'bg-purple-600 text-white border-transparent'
                            : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]'
                        }`}
                      >
                        1 Docena (12 pares)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                      Cantidad de {supplierOrderSubtipoSerie === 'MEDIA_DOCENA' ? 'medias docenas' : 'docenas'}:
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

                  <div className="p-2 bg-purple-500/10 rounded-lg text-[11px] font-semibold text-purple-900 flex justify-between">
                    <span>Pares Totales a Fabricar:</span>
                    <span className="font-black font-mono">
                      {(supplierOrderSubtipoSerie === 'MEDIA_DOCENA' ? 6 : 12) * supplierOrderCantSeries} pares
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
                        ? (supplierOrderSubtipoSerie === 'MEDIA_DOCENA' ? 6 : 12) * supplierOrderCantSeries
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSupplierOrderModal(false);
                    setSupplierOrderProductData(null);
                  }}
                  className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSupplierOrder || !selectedSupplierId}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingSupplierOrder ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                  <span>Enviar Orden al Proveedor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL GESTIONAR LOGÍSTICA DE ENVÍO Y FLETE (Fase E1) ── */}
      {showModalEnvio && pedidoEnvioSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowModalEnvio(false); setPedidoEnvioSeleccionado(null); }, isDirtyEnvio()); }}>
          <div className="relative bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 backdrop-blur-sm rounded-2xl border border-blue-400/30 text-blue-400 font-bold">
                  <Truck size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Logística de Envío — Pedido #{getNumeroPedido(pedidoEnvioSeleccionado)}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Cliente: {pedidoEnvioSeleccionado.clienteNombre || 'Consumidor Final'} · Total: ${Number(pedidoEnvioSeleccionado.montoTotal).toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModalEnvio(false);
                  setPedidoEnvioSeleccionado(null);
                }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
              className="p-5 space-y-4 overflow-y-auto flex-1"
            >
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

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalEnvio(false);
                    setPedidoEnvioSeleccionado(null);
                  }}
                  className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEnvioModal}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingEnvioModal ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                  <span>Guardar Logística de Entrega</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR NUEVA EMPRESA DE TRANSPORTE ── */}
      {showNuevoTransporteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowNuevoTransporteModal(false), isDirtyNuevoTransporte()); }}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl text-blue-400">
                  <Truck size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Nueva Empresa de Transporte</h4>
                  <p className="text-[10px] text-slate-300">Registra un nuevo courier o cooperativa de encomiendas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNuevoTransporteModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCrearNuevoTransporte} className="p-5 space-y-4">
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

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowNuevoTransporteModal(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTransporte || !nuevoTransporteNombre.trim()}
                  className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {guardandoTransporte ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Guardar Transporte</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Entrega Parcial / Total */}
      {showEntregaModal && pedidoEntregaSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowEntregaModal(false); setPedidoEntregaSeleccionado(null); setEntregaItemsMap({}); }, isDirtyEntrega()); }}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <PackageCheck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base">Entrega de Pedido</h3>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-xs font-mono font-black">
                      #{getNumeroPedido(pedidoEntregaSeleccionado)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
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
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl text-xs">
                <div className="text-[var(--muted-foreground)]">
                  Indica los pares a despachar. El sistema descontará el inventario físico y actualizará el estado a <strong className="text-cyan-600 dark:text-cyan-400">Entregado Parcial</strong> o <strong className="text-emerald-600 dark:text-emerald-400">Entregado</strong>.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allMax: Record<string, number> = {};
                      (pedidoEntregaSeleccionado.lines || []).forEach((l: any) => {
                        const pend = l.cantidadPendiente !== undefined ? l.cantidadPendiente : Math.max(0, l.cantidad - (l.cantidadEntregada || 0));
                        const disp = l.stockDisponible !== undefined ? l.stockDisponible : pend;
                        allMax[l.id] = Math.min(pend, Math.max(0, disp));
                      });
                      setEntregaItemsMap(allMax);
                    }}
                    className="px-2.5 py-1 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-600/20 rounded-lg text-xs font-bold transition-all"
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
                    className="px-2.5 py-1 bg-slate-500/10 text-slate-600 hover:bg-slate-500 hover:text-white border border-slate-500/20 rounded-lg text-xs font-bold transition-all"
                  >
                    🔄 Poner en 0
                  </button>
                </div>
              </div>

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
                    const subtotalDespachoHoy = totalParesADespacharHoy * g.precioUnitario;

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
                          {g.imageUrl ? (
                            <img
                              src={g.imageUrl}
                              alt={g.modelName}
                              className="w-12 h-12 object-cover rounded-xl border border-[var(--border)] shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[var(--muted)]/50 flex items-center justify-center text-lg shrink-0 mt-0.5">
                              👟
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-sm text-[var(--foreground)] uppercase tracking-wide truncate">
                              {g.modelName}
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {g.color ? `${g.color.toUpperCase()} · ` : ''}
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Serie: {g.serieNombre.toUpperCase()}
                              </span>
                            </div>

                            {/* Chips de Tallas Interactivos con diseño idéntico al pedido */}
                            <div className="mt-2 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {sortedTallas.map((l, i) => {
                                  const cantPedida = l.cantidad || 0;
                                  const cantEntregada = l.cantidadEntregada !== undefined ? l.cantidadEntregada : 0;
                                  const cantPendiente = l.cantidadPendiente !== undefined ? l.cantidadPendiente : Math.max(0, cantPedida - cantEntregada);
                                  const stockDisp = l.stockFisico !== undefined ? l.stockFisico : (l.stockDisponible !== undefined ? l.stockDisponible : cantPendiente);
                                  const aEntregar = entregaItemsMap[l.id] ?? 0;
                                  const maxPermitido = Math.min(cantPendiente, Math.max(0, stockDisp));
                                  const numTalla = l.numeroTalla || l.tallaNumero || '38';

                                  return (
                                    <div
                                      key={i}
                                      className="flex items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 shadow-2xs"
                                    >
                                      <span className="text-[var(--foreground)] font-black text-xs font-mono">
                                        T{numTalla}
                                      </span>

                                      {cantPendiente === 0 ? (
                                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 ml-1" title="Talla completada al 100%">
                                          ✓ {cantEntregada} entregados
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          {cantEntregada > 0 && (
                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded mr-0.5" title={`Ya entregados: ${cantEntregada}, faltan: ${cantPendiente}`}>
                                              {cantEntregada}/{cantPedida}
                                            </span>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEntregaItemsMap((prev) => ({
                                                ...prev,
                                                [l.id]: Math.max(0, aEntregar - 1),
                                              }));
                                            }}
                                            className="w-5 h-5 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded text-xs font-black transition-colors cursor-pointer"
                                            title={`Quitar 1 par T${numTalla}`}
                                          >
                                            −
                                          </button>
                                          <span className="w-5 text-center text-xs font-bold font-mono text-[var(--foreground)]">
                                            {aEntregar}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEntregaItemsMap((prev) => ({
                                                ...prev,
                                                [l.id]: Math.min(maxPermitido, aEntregar + 1),
                                              }));
                                            }}
                                            className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded text-xs font-black transition-colors cursor-pointer"
                                            title={`Agregar 1 par T${numTalla} (máx disponible a entregar hoy: ${maxPermitido})`}
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Botones de acción rápida: +1 par c/talla, -1 par c/talla */}
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextMap = { ...entregaItemsMap };
                                    sortedTallas.forEach((l) => {
                                      const cantPendiente = l.cantidadPendiente !== undefined ? l.cantidadPendiente : Math.max(0, (l.cantidad || 0) - (l.cantidadEntregada || 0));
                                      const stockDisp = l.stockFisico !== undefined ? l.stockFisico : (l.stockDisponible !== undefined ? l.stockDisponible : cantPendiente);
                                      const maxPermitido = Math.min(cantPendiente, Math.max(0, stockDisp));
                                      const actual = nextMap[l.id] ?? 0;
                                      nextMap[l.id] = Math.min(maxPermitido, actual + 1);
                                    });
                                    setEntregaItemsMap(nextMap);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  +1 par c/talla
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextMap = { ...entregaItemsMap };
                                    sortedTallas.forEach((l) => {
                                      const actual = nextMap[l.id] ?? 0;
                                      nextMap[l.id] = Math.max(0, actual - 1);
                                    });
                                    setEntregaItemsMap(nextMap);
                                  }}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  −1 par c/talla
                                </button>
                                <span className="text-[11px] text-[var(--muted-foreground)] font-mono font-medium">
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
                            <div className="text-[11px] text-[var(--muted-foreground)] font-medium">
                              ${g.precioUnitario.toFixed(2)} / par
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
            <div className="p-4 bg-[var(--muted)]/30 border-t border-[var(--border)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEntregaModal(false);
                  setPedidoEntregaSeleccionado(null);
                  setEntregaItemsMap({});
                }}
                className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)]"
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
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                {procesandoEntrega ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                <span>Confirmar y Despachar</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

