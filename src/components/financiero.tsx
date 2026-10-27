"use client";

import { useState, useEffect, useRef, useCallback, Fragment, useMemo } from 'react';
import { ApiService } from '../services/api.service';
import UnsavedChangesModal from './ui/unsaved-changes-modal';
import {
  DollarSign,
  CheckCircle,
  CheckCircle2,
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
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  RotateCcw,
  Building,
  ChevronDown,
  ChevronUp,
  Layers,
  ListFilter,
  Users,
  ShieldCheck,
  Send,
  Download,
  ExternalLink,
  Sparkles,
  Check,
  FileCheck,
  Eye,
  Settings2,
  MessageCircle,
  Printer,
  Share2,
  Mail,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Truck,
  Tag,
  Wallet,
  PieChart,
  BarChart3,
  Filter,
  Package,
  UserCheck,
} from 'lucide-react';
import { useToast } from './ui/toast';
import { compartirFacturaPdf, generarFacturaPdfDoc } from '../services/pdf-factura.service';
import {
  generarComprobanteAbonoPdfDoc,
  descargarComprobanteAbonoPdf,
  compartirComprobanteAbonoPdf,
  armarMensajeWhatsAppAbono,
  ComprobanteAbonoPdfData,
} from '../services/pdf-abono.service';
import {
  generarHistorialPdfDoc,
  descargarHistorialPdf,
  generarHistorialPdfBase64,
  armarMensajeWhatsAppHistorial,
  compartirHistorialWhatsApp,
  preCargarImagenesHistorial,
  HistorialComercialPdfData,
} from '../services/pdf-historial.service';
import { generarUrlPublicaAbono, generarUrlPublicaHistorial } from '../services/comprobante-url.service';
import ConfirmModal from './ui/confirm-modal';
import { capitalizarNombreCompleto, formatearNombreSerie, normalizarParaBusqueda } from '@/utils/text-formatters';
import { descargarReporteDeudoresPdf } from '../services/pdf-deudores.service';
import { abrirWhatsAppUniversal } from '../utils/whatsapp';
import { getCurvaDocena } from '../utils/curvas';

interface FinancieroProps {
  online: boolean;
  activeSucursalId?: string;
  sucursales?: { id: string; name: string; isMatriz: boolean }[];
  onNavigateToPedido?: (pedidoId: string, sucursalId?: string) => void;
}

export interface GastoItem {
  id: string;
  tenantId: string;
  sucursalNombre?: string;
  userId?: string;
  descripcion: string;
  categoria: string;
  monto: number;
  metodoPago: string;
  comprobanteRef?: string;
  observaciones?: string;
  orderId?: string;
  fechaGasto: string;
  createdAt: string;
  user?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  order?: {
    id: string;
    numeroPedido: number;
    clienteNombre: string;
    tipoEntrega: string;
    asumeFlete: string;
    costoEnvio: number;
    guiaEnvio?: string;
    courier?: string;
  };
}

type EstadoCobro = 'PENDIENTE' | 'PARCIALMENTE_PAGADO' | 'SALDADO' | 'PAGADO' | 'VENCIDO';

interface Abono {
  id: string;
  monto: number;
  metodo: string;
  notas?: string;
  createdAt: string;
  usuarioNombre?: string;
  usuarioEmail?: string;
  usuarioRol?: string;
  usuarioSucursal?: string;
  esCobroOtraSucursal?: boolean;
}

interface Cobro {
  id: string;
  numeroCobro?: string;
  orderId?: string;
  orderCodigo?: string;
  orderNumero?: string;
  clientId: string;
  clienteNombre?: string;
  clienteCedula?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  clienteDireccion?: string;
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
    orderId?: string;
    orderCodigo?: string;
    total: number;
    subtotal: number;
    pdfUrl?: string;
    lines?: any[];
  };
  abonos?: Abono[];
  vendedorNombre?: string;
  vendedorEmail?: string;
  vendedorRol?: string;
  sucursalNombre?: string;
  tenantId?: string;
  tipoEntrega?: 'PRESENCIAL' | 'ENVIO';
  courier?: string;
  guiaEnvio?: string;
  direccionEnvio?: string;
  ciudadEnvio?: string;
  asumeFlete?: string;
  costoEnvio?: number;
  notasPedido?: string;
  lines?: any[];
}

interface ClienteCartera {
  clientId: string;
  sucursalNombre?: string;
  clienteNombre: string;
  clienteApellido?: string;
  clienteNombreSolo?: string;
  clienteCedula: string;
  clienteTelefono: string;
  clienteEmail?: string;
  clienteDireccion?: string;
  clienteNivel: string;
  montoTotalFacturado: number;
  saldoTotalPendiente: number;
  totalAbonado: number;
  totalCompras: number;
  totalComprasPendientes: number;
  estadoGlobal: EstadoCobro;
  proximoVencimiento?: string;
  saldoAFavorCliente: number;
  haCobradoHoy: boolean;
  totalAbonadoHoy: number;
  ultimoAbonoHoyFecha?: string;
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
    pedidoId?: string;
    tipo: 'COMPRA_PEDIDO' | 'ABONO' | 'DEVOLUCION';
    titulo: string;
    numeroCodigo?: string;
    descripcion: string;
    monto: number;
    metodo?: string;
    estado?: string;
    fecha: string;
    detalles?: any;
    saldoAnterior?: number;
    nuevoSaldo?: number;
    vendedorNombre?: string;
    vendedorEmail?: string;
    vendedorRol?: string;
    entregadoPor?: string;
    entregadoPorEmail?: string;
    entregadoPorRol?: string;
    fechaEntrega?: string | null;
    cobradoPor?: string;
    cobradoPorEmail?: string;
    cobradoPorRol?: string;
    cobradoPorSucursal?: string;
    esCobroOtraSucursal?: boolean;
    procesadoPor?: string;
    procesadoPorRol?: string;
    reciboRef?: string | null;
    notas?: string | null;
    comprobante?: string;
    referencia?: string;
    numeroTransaccion?: string;
  }[];
}

const COBRO_ESTADO: Record<string, { label: string; color: string }> = {
  PENDIENTE:           { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  PARCIALMENTE_PAGADO: { label: 'Parcial',   color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  PAGADO:              { label: 'Saldado',   color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  SALDADO:             { label: 'Saldado',   color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  VENCIDO:             { label: 'Vencido',   color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

interface GrupoModeloResumen {
  key: string;
  modelName: string;
  color: string;
  imageUrl?: string | null;
  serieNombre?: string;
  totalPares: number;
  precioUnitario: number;
  subtotal: number;
  tipoVenta?: string;
  etiquetaVolumen: string;
  tallas: { numero: string | number; cantidad: number }[];
}

interface LineaDevolucionItem {
  id: string;
  productId: string;
  modelName: string;
  color: string;
  serieNombre: string;
  imageUrl?: string | null;
  tallaId: string;
  numeroTalla: string | number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  tipoVenta: 'SERIE_COMPLETA' | 'POR_TALLA';
  subtipoSerie?: 'MEDIA_DOCENA' | 'DOCENA_COMPLETA';
  observacionModelo?: string;
}

interface GrupoModeloDevolucion {
  key: string;
  productId: string;
  modelName: string;
  color: string;
  serieNombre: string;
  imageUrl?: string | null;
  totalPares: number;
  precioUnitario: number;
  subtotal: number;
  tipoVenta: string;
  subtipoSerie?: string;
  etiquetaVolumen: string;
  observacionModelo?: string;
  lineas: LineaDevolucionItem[];
}

function agruparLineasDevolucion(lines: LineaDevolucionItem[]): GrupoModeloDevolucion[] {
  if (!lines || lines.length === 0) return [];
  const map = new Map<string, GrupoModeloDevolucion>();

  lines.forEach((l) => {
    const key = l.productId;
    if (!map.has(key)) {
      map.set(key, {
        key,
        productId: l.productId,
        modelName: l.modelName,
        color: l.color,
        serieNombre: l.serieNombre,
        imageUrl: l.imageUrl,
        totalPares: 0,
        precioUnitario: l.precioUnitario,
        subtotal: 0,
        tipoVenta: l.tipoVenta,
        subtipoSerie: l.subtipoSerie,
        etiquetaVolumen: '',
        observacionModelo: l.observacionModelo,
        lineas: [],
      });
    }

    const g = map.get(key)!;
    g.totalPares += l.cantidad;
    g.subtotal += l.subtotal;
    g.lineas.push(l);
    if (l.observacionModelo) g.observacionModelo = l.observacionModelo;
  });

  return Array.from(map.values()).map((g) => {
    g.lineas.sort((a, b) => Number(a.numeroTalla) - Number(b.numeroTalla));

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

const SERIES_NOMBRES: Record<string, string> = {
  ADULTO: "adulto (38-43)",
  JUVENIL: "juvenil (34-38)",
  NINO: "junior (27-32)",
  NINO_PEQUENO_A: "niño (21-26)",
  BEBE: "bebe (18-20)",
  TALLA_GRANDE: "Adulto Grande (43-45)"
};

const getNombreSerie = (s: any, tallas?: any[]): string => {
  const nombre = typeof s === "string" ? s : s?.nombre;
  const tallasNums = (tallas || [])
    .map(t => Number(t?.numero ?? t?.nombre ?? t))
    .filter(n => !isNaN(n) && n > 0);

  // Si no viene nombre o es genérico, deducir automáticamente por las tallas reales
  if (!nombre || nombre === '—' || nombre === 'Estándar' || nombre === 'General' || nombre === 'Calzado' || nombre === 'undefined') {
    if (tallasNums.length > 0) {
      const min = Math.min(...tallasNums);
      const max = Math.max(...tallasNums);
      if (min >= 38) return `adulto (${min}-${Math.max(43, max)})`;
      if (min >= 34) return `juvenil (${min}-${Math.max(38, max)})`;
      if (min >= 27) return `junior (${min}-${Math.max(32, max)})`;
      if (min >= 21) return `niño (${min}-${Math.max(26, max)})`;
      if (min >= 18) return `bebe (${min}-${Math.max(20, max)})`;
      return `Serie (${min}-${max})`;
    }
    return "adulto (38-43)";
  }

  // Si viene una clave de serie conocida
  const upper = nombre.toUpperCase().trim();
  if (SERIES_NOMBRES[upper]) {
    return SERIES_NOMBRES[upper];
  }

  if (tallasNums.length > 0) {
    const min = Math.min(...tallasNums);
    const max = Math.max(...tallasNums);
    const nombreClean = formatearNombreSerie(nombre);
    return `${nombreClean} (${min}-${max})`;
  }

  return formatearNombreSerie(nombre);
};

function agruparLineasPorModelo(lines: any[], catalogo?: any[]): GrupoModeloResumen[] {
  if (!lines || lines.length === 0) return [];
  const map = new Map<string, GrupoModeloResumen>();

  lines.forEach((l) => {
    const cat = catalogo?.find((c: any) => c.id === l.productId);
    
    // Extracción robusta del nombre del modelo
    let model = l.modelName;
    if (!model || model === 'Calzado' || model === 'Calzado de Cuero' || model === 'Calzado Mostrador POS' || model === 'undefined') {
      if (cat?.modelName) model = cat.modelName;
      else if (cat?.model) model = cat.model;
      else if (cat?.nombre) model = cat.nombre;
      else if (l.nombre && l.nombre !== 'Calzado' && l.nombre !== 'Calzado Mostrador POS') {
        const match = String(l.nombre).match(/^([^(]+)/);
        model = match ? match[1].trim() : l.nombre;
      } else {
        model = 'Campus 00s';
      }
    }

    // Extracción de color
    let color = l.color || cat?.color || '';
    if (!color && l.nombre && l.nombre.includes('(')) {
      const match = String(l.nombre).match(/\(([^)]+)\)/);
      if (match) color = match[1].trim();
    }

    // Extracción de serie
    let serie = (l.serieNombre && l.serieNombre !== 'Estándar' && l.serieNombre !== 'General')
      ? l.serieNombre
      : (cat?.serieNombre || cat?.serie || l.serie || '');

    const imageUrl = l.imageUrl || cat?.imageUrl || null;

    const key = `${model.toLowerCase()}_${color.toLowerCase()}_${serie.toLowerCase()}_${l.productId || ''}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        modelName: model,
        color,
        imageUrl,
        serieNombre: serie,
        totalPares: 0,
        precioUnitario: Number(l.precioUnitario) || 0,
        subtotal: 0,
        tipoVenta: l.tipoVenta,
        etiquetaVolumen: '',
        tallas: [],
      });
    }

    const g = map.get(key)!;
    if (!g.imageUrl && imageUrl) g.imageUrl = imageUrl;
    if ((!g.serieNombre || g.serieNombre === 'Estándar') && serie) g.serieNombre = serie;
    if (!g.color && color) g.color = color;

    const cant = Number(l.cantidad) || 1;
    const numTalla = l.numeroTalla || l.tallaNumero || l.talla || '38';

    g.totalPares += cant;
    g.subtotal += Number(l.subtotal ?? (cant * g.precioUnitario));

    const existingTalla = g.tallas.find((t) => String(t.numero) === String(numTalla));
    if (existingTalla) {
      existingTalla.cantidad += cant;
    } else {
      g.tallas.push({ numero: numTalla, cantidad: cant });
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

function getCobroConfig(estado?: string) {
  return COBRO_ESTADO[estado || 'PENDIENTE'] || { label: estado || 'Pendiente', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}

function esMismoDia(fechaStr?: string | Date | null): boolean {
  if (!fechaStr) return false;
  const f = new Date(fechaStr);
  if (isNaN(f.getTime())) return false;
  const hoy = new Date();
  return (
    f.getFullYear() === hoy.getFullYear() &&
    f.getMonth() === hoy.getMonth() &&
    f.getDate() === hoy.getDate()
  );
}

export default function FinancieroComponent({ online, activeSucursalId, sucursales, onNavigateToPedido }: FinancieroProps) {
  const { showToast } = useToast();
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState<'CLIENTES' | 'FACTURAS'>('CLIENTES');
  const [filtro, setFiltro] = useState<EstadoCobro | 'TODOS'>('TODOS');
  const [filtroCobroHoy, setFiltroCobroHoy] = useState<'TODOS' | 'FALTA_COBRAR_HOY' | 'COBRADOS_HOY'>('TODOS');
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

  const [selectedSucursalCobroId, setSelectedSucursalCobroId] = useState<string>(() => {
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
  const [sucursalesEmpresa, setSucursalesEmpresa] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');

  // Cliente o Cobro seleccionado para el modal de cuenta corriente
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string | null>(null);
  const [cobroSeleccionadoId, setCobroSeleccionadoId] = useState<string | null>(null);
  const [clienteExpandidoId, setClienteExpandidoId] = useState<string | null>(null);
  const [showCuentaModal, setShowCuentaModal] = useState(false);

  // Formulario Abono
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoAbono, setMetodoAbono] = useState('EFECTIVO');
  const [notasAbono, setNotasAbono] = useState('');
  const [savingAbono, setSavingAbono] = useState(false);
  const [showConfirmAbonoModal, setShowConfirmAbonoModal] = useState(false);
  const [formatoEnvioAbono, setFormatoEnvioAbono] = useState<'PDF' | 'TEXTO'>('PDF'); // Por defecto PDF como pidió el usuario
  const [autoEnviarWhatsAppAbono, setAutoEnviarWhatsAppAbono] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('nexora_auto_whatsapp_abono');
    return stored === null ? true : stored === 'true';
  });

  // Modal Devolución Mejorado
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [devolucionCobroId, setDevolucionCobroId] = useState('');
  const [devolucionTipo, setDevolucionTipo] = useState<'SERIE_COMPLETA' | 'TALLA_ESPECIFICA'>('TALLA_ESPECIFICA');
  const [devolucionDestino, setDevolucionDestino] = useState<'REINGRESO_INVENTARIO' | 'BAJA_POR_FALLA'>('REINGRESO_INVENTARIO');
  const [devolucionProductoId, setDevolucionProductoId] = useState('');
  const [devolucionTallaId, setDevolucionTallaId] = useState('');
  const [devolucionSubtipoSerie, setDevolucionSubtipoSerie] = useState<'MEDIA_DOCENA' | 'DOCENA_COMPLETA'>('MEDIA_DOCENA');
  const [devolucionCantidadParesInput, setDevolucionCantidadParesInput] = useState<string>('1');
  const [devolucionCantidadSeries, setDevolucionCantidadSeries] = useState<number>(1);
  const [devolucionPrecioUnitario, setDevolucionPrecioUnitario] = useState<number>(0);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [savingDevolucion, setSavingDevolucion] = useState(false);
  const [lineasDevolucion, setLineasDevolucion] = useState<LineaDevolucionItem[]>([]);

  // Modelos comprados por el cliente para devolución
  const [productosVendidosCliente, setProductosVendidosCliente] = useState<any[]>([]);
  const [loadingProductosVendidos, setLoadingProductosVendidos] = useState(false);
  const [busquedaModeloDevolucion, setBusquedaModeloDevolucion] = useState('');
  const [productoSeleccionadoDevolucionObj, setProductoSeleccionadoDevolucionObj] = useState<any | null>(null);

  // Catálogo y clientes raw para cédulas y devoluciones
  const [clientesRaw, setClientesRaw] = useState<any[]>([]);
  const [catalogoProductos, setCatalogoProductos] = useState<any[]>([]);

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

  // Modal Historial Completo del Cliente
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialCliente, setHistorialCliente] = useState<ClienteHistorial | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [filtroHistorial, setFiltroHistorial] = useState<'TODOS' | 'COMPRAS' | 'ABONOS' | 'DEVOLUCIONES'>('TODOS');
  const [pedidoHistorialExpandidoId, setPedidoHistorialExpandidoId] = useState<string | null>(null);

  // Modal Compartir Historial Comercial y Financiero (PDF, WhatsApp, Correo)
  const [showCompartirHistorialModal, setShowCompartirHistorialModal] = useState(false);
  const [filtroCompartirFechaInicio, setFiltroCompartirFechaInicio] = useState('');
  const [filtroCompartirFechaFin, setFiltroCompartirFechaFin] = useState('');
  const [compartirEmailDestino, setCompartirEmailDestino] = useState('');
  const [compartirTelefonoDestino, setCompartirTelefonoDestino] = useState('');
  const [compartiendoHistorial, setCompartiendoHistorial] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [loadingPreviewPdf, setLoadingPreviewPdf] = useState<boolean>(false);
  const [tabCompartirModal, setTabCompartirModal] = useState<'formulario' | 'preview'>('preview');

  // Modal Facturación SRI
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [tabFactura, setTabFactura] = useState<'CONFIGURAR' | 'PREVISUALIZAR'>('CONFIGURAR');
  const [facturaCliente, setFacturaCliente] = useState<{
    clientId: string;
    saleNoteId?: string;
    nombre: string;
    cedula: string;
    telefono: string;
    direccion: string;
    email: string;
    tipoIdentificacion: string;
    formaPago: string;
    detalles: {
      codigoProducto: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      descuento: number;
      tarifaIva: number;
      codigoIva: string;
    }[];
    notasSeleccionadas: string[];
  } | null>(null);
  const [notaExpandidaFacturaId, setNotaExpandidaFacturaId] = useState<string | null>(null);
  const [emittingFactura, setEmittingFactura] = useState(false);
  const [facturaResultado, setFacturaResultado] = useState<{
    success: boolean;
    numeroComprobante: string;
    claveAcceso?: string;
    estadoSri: string;
    errorMensaje?: string;
    xmlUrl?: string;
    ridePdfUrl?: string;
  } | null>(null);

  // Modal Cambiar Tipo de Venta (Contado <-> Crédito)
  const [showCambiarTipoModal, setShowCambiarTipoModal] = useState(false);
  const [cobroParaCambiarTipo, setCobroParaCambiarTipo] = useState<Cobro | null>(null);
  const [nuevoTipoVenta, setNuevoTipoVenta] = useState<'CREDITO' | 'CONTADO'>('CREDITO');
  const [cambioTipoDiasPlazo, setCambioTipoDiasPlazo] = useState<number>(30);
  const [cambioTipoFechaVencimiento, setCambioTipoFechaVencimiento] = useState<string>('');
  const [cambioTipoMontoAbonado, setCambioTipoMontoAbonado] = useState<string>('');
  const [cambioTipoMetodoAbono, setCambioTipoMetodoAbono] = useState<string>('EFECTIVO');
  const [cambioTipoNotas, setCambioTipoNotas] = useState<string>('');
  const [savingCambiarTipo, setSavingCambiarTipo] = useState(false);

  // Configuración del Emisor (Dueño del Negocio / RUC)
  const [businessConfig, setBusinessConfig] = useState<{
    nombre: string;
    ruc: string;
    direccion: string;
    telefono?: string;
    email?: string;
    sriAmbiente?: string;
    sriEstablecimiento?: string;
    sriPuntoEmision?: string;
    sriObligadoContabilidad?: boolean;
  } | null>(null);

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

  const isDirtyAbono = useCallback(() => {
    return showCuentaModal && (montoAbono.trim() !== '' || notasAbono.trim() !== '');
  }, [showCuentaModal, montoAbono, notasAbono]);

  const isDirtyDevolucion = useCallback(() => {
    return showDevolucionModal && (lineasDevolucion.length > 0 || motivoDevolucion.trim() !== '');
  }, [showDevolucionModal, lineasDevolucion.length, motivoDevolucion]);

  const isDirtyFactura = useCallback(() => {
    return showFacturaModal && facturaCliente !== null && (facturaCliente.email.trim() !== '' || facturaCliente.direccion.trim() !== '');
  }, [showFacturaModal, facturaCliente]);

  // Manejador global de la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDiscardModal) return;
      if (showConfirmAbonoModal) {
        e.preventDefault();
        setShowConfirmAbonoModal(false);
        return;
      }
      if (confirmModal.isOpen) {
        e.preventDefault();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        return;
      }
      if (showFacturaModal) {
        e.preventDefault();
        safeDismiss(() => setShowFacturaModal(false), isDirtyFactura());
        return;
      }
      if (showDevolucionModal) {
        e.preventDefault();
        safeDismiss(() => setShowDevolucionModal(false), isDirtyDevolucion());
        return;
      }
      if (showCompartirHistorialModal) {
        e.preventDefault();
        setShowCompartirHistorialModal(false);
        return;
      }
      if (showHistorialModal) {
        e.preventDefault();
        setShowHistorialModal(false);
        return;
      }
      if (showCuentaModal) {
        e.preventDefault();
        safeDismiss(() => setShowCuentaModal(false), isDirtyAbono());
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDiscardModal, showConfirmAbonoModal, confirmModal.isOpen, showFacturaModal, showDevolucionModal, showHistorialModal, showCompartirHistorialModal, showCuentaModal, safeDismiss, isDirtyFactura, isDirtyDevolucion, isDirtyAbono]);

  const loadSucursales = async () => {
    try {
      if (online) {
        const data = await ApiService.get('/configuracion/sucursales');
        if (Array.isArray(data) && data.length > 0) {
          setSucursalesEmpresa(data);
        }
      }
    } catch (e) {
      console.warn('Error cargando sucursales en financiero:', e);
    }
  };

  useEffect(() => {
    loadCobros();
    loadBusinessConfig();
    loadSucursales();

    // Por defecto siempre carga en la sucursal que pertenece el usuario
    if (miLocalId) {
      setSelectedSucursalCobroId(miLocalId);
    } else if (activeSucursalId && activeSucursalId !== 'TODAS') {
      setSelectedSucursalCobroId(activeSucursalId);
    } else if (sucursales && sucursales.length > 0) {
      setSelectedSucursalCobroId(sucursales[0].id);
    }

    const handleConfigChange = () => {
      const stored = localStorage.getItem('nexora_auto_whatsapp_abono');
      setAutoEnviarWhatsAppAbono(stored === null ? true : stored === 'true');
    };
    window.addEventListener('storage', handleConfigChange);
    window.addEventListener('nexora:config-changed', handleConfigChange);
    return () => {
      window.removeEventListener('storage', handleConfigChange);
      window.removeEventListener('nexora:config-changed', handleConfigChange);
    };
  }, [online, activeSucursalId]);

  const loadBusinessConfig = async () => {
    try {
      if (online) {
        const bData = await ApiService.get('/configuracion/negocio');
        if (bData && bData.nombre) {
          setBusinessConfig(bData);
        }
      }
    } catch (err) {
      console.warn('No se pudo obtener la configuración del negocio:', err);
    }
  };

  // Referencias para retener foco y scroll en el cliente o factura activa
  const lastActiveClienteIdRef = useRef<string | null>(null);
  const lastActiveCobroIdRef = useRef<string | null>(null);

  const loadCobros = async (isSilent = false) => {
    if (!isSilent && cobros.length === 0) {
      setLoading(true);
    }
    try {
      if (online) {
        const [dataCobros, dataClientes, dataCatalogo] = await Promise.all([
          ApiService.get('/financiero/cobros?incluirOtrasSucursales=true'),
          ApiService.get('/clientes'),
          ApiService.get('/catalogo/productos'),
        ]);
        const list = Array.isArray(dataCobros) ? dataCobros : [];
        setCobros(list);
        if (Array.isArray(dataClientes)) setClientesRaw(dataClientes);

        const flat: any[] = [];
        const modelosCatalogo = Array.isArray(dataCatalogo) ? dataCatalogo : (dataCatalogo?.modelos || []);
        modelosCatalogo.forEach((modelo: any) => {
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
              tallas: v.tallas || [],
            });
          });
        });
        setCatalogoProductos(flat);
      }
    } catch (err) {
      console.error('Error al cargar cobros:', err);
    } finally {
      setLoading(false);
      // Restaurar foco visual y scroll sin perder la posición del cliente o documento
      const targetClienteId = lastActiveClienteIdRef.current;
      const targetCobroId = lastActiveCobroIdRef.current;
      if (targetClienteId || targetCobroId) {
        const scrollToElement = (attempt = 0) => {
          let el: HTMLElement | null = null;
          if (targetClienteId) {
            el = document.getElementById(`cliente-row-${targetClienteId}`);
          }
          if (!el && targetCobroId) {
            el = document.getElementById(`cobro-row-${targetCobroId}`);
          }
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-blue-500/10', 'transition-all');
            setTimeout(() => {
              el?.classList.remove('bg-blue-500/10');
            }, 2000);
            lastActiveClienteIdRef.current = null;
            lastActiveCobroIdRef.current = null;
          } else if (attempt < 8) {
            setTimeout(() => scrollToElement(attempt + 1), 80);
          } else {
            lastActiveClienteIdRef.current = null;
            lastActiveCobroIdRef.current = null;
          }
        };
        setTimeout(() => scrollToElement(), 60);
      }
    }
  };

  // ── Agrupación Consolidada por Cliente y Sucursal ─────────
  const listaSucursalesDisponibles = useMemo<{ id: string; name: string; isMatriz: boolean }[]>(() => {
    const map = new Map<string, { id: string; name: string; isMatriz: boolean }>();
    if (sucursalesEmpresa && sucursalesEmpresa.length > 0) {
      sucursalesEmpresa.forEach((s) => map.set(s.id, { id: s.id, name: s.name, isMatriz: !!s.isMatriz }));
    }
    if (sucursales && sucursales.length > 0) {
      sucursales.forEach((s) => {
        if (!map.has(s.id)) map.set(s.id, { id: s.id, name: s.name, isMatriz: !!s.isMatriz });
      });
    }
    cobros.forEach((c) => {
      if (c.tenantId && !map.has(c.tenantId)) {
        map.set(c.tenantId, {
          id: c.tenantId,
          name: c.sucursalNombre || 'Sucursal Adicional',
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
  }, [sucursalesEmpresa, sucursales, cobros, miLocalId]);

  const cobrosFiltradosPorSucursal = cobros.filter((c) => {
    if (!selectedSucursalCobroId) return true;
    const targetSuc = listaSucursalesDisponibles.find((s) => s.id === selectedSucursalCobroId);
    if (targetSuc?.isMatriz && !c.tenantId) return true;
    return c.tenantId === selectedSucursalCobroId;
  });

  const clientesCartera: ClienteCartera[] = (() => {
    const map = new Map<string, Cobro[]>();
    cobrosFiltradosPorSucursal.forEach((c) => {
      const key = c.clientId || 'SIN_CLIENTE';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });

    const resultado: ClienteCartera[] = [];

    map.forEach((listaCobros, clientId) => {
      const primerCobro = listaCobros[0];
      const cobroConEmail = listaCobros.find((c) => c.clienteEmail) || primerCobro;
      const cobroConDireccion = listaCobros.find((c) => c.clienteDireccion) || primerCobro;

      const clienteDb = clientesRaw.find((c) => c.id === clientId);
      const cedulaResuelta =
        clienteDb?.cedula ||
        clienteDb?.ruc ||
        primerCobro.clienteCedula ||
        listaCobros.find((c) => c.clienteCedula && c.clienteCedula !== '—')?.clienteCedula ||
        '—';
      const telefonoResuelto =
        clienteDb?.telefono ||
        primerCobro.clienteTelefono ||
        listaCobros.find((c) => c.clienteTelefono && c.clienteTelefono !== '—')?.clienteTelefono ||
        '—';
      const clienteApellido = (clienteDb?.apellido || '').trim();
      const clienteNombreSolo = (clienteDb?.nombre || '').trim();

      let nombreResuelto = '';
      if (clienteApellido && clienteNombreSolo) {
        nombreResuelto = `${clienteApellido} ${clienteNombreSolo}`;
      } else if (clienteApellido) {
        nombreResuelto = clienteApellido;
      } else if (clienteNombreSolo) {
        nombreResuelto = clienteNombreSolo;
      } else if (primerCobro.clienteNombre) {
        nombreResuelto = primerCobro.clienteNombre.trim();
      } else {
        nombreResuelto = 'Cliente sin registrar';
      }

      const montoTotalFacturado = listaCobros.reduce(
        (sum, c) => sum + Number(c.montoOriginal ?? c.montoTotal ?? 0),
        0,
      );
      const saldoTotalPendiente = listaCobros.reduce((sum, c) => {
        if (c.estado === 'SALDADO' || c.tipo === 'CONTADO') return sum;
        return sum + Number(c.saldoPendiente || 0);
      }, 0);
      const totalAbonado = listaCobros.reduce(
        (sum, c) => sum + (c.abonos || []).reduce((s, a) => s + Number(a.monto || 0), 0),
        0,
      );

      const comprasPendientes = listaCobros.filter((c) => Number(c.saldoPendiente) > 0);

      // Abonos del día de hoy para este cliente
      const todosAbonosCliente = listaCobros.flatMap((c) => c.abonos || []);
      const abonosHoy = todosAbonosCliente.filter((a) => esMismoDia(a.createdAt));
      const totalAbonadoHoy = abonosHoy.reduce((sum, a) => sum + Number(a.monto || 0), 0);
      const haCobradoHoy = abonosHoy.length > 0;
      const abonosHoyOrdenados = [...abonosHoy].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const ultimoAbonoHoyFecha = abonosHoyOrdenados[0]?.createdAt;

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

      const sucursalSet = new Set<string>();
      listaCobros.forEach((c) => {
        if (c.sucursalNombre) sucursalSet.add(c.sucursalNombre);
      });
      if (clienteDb?.sucursalNombre) sucursalSet.add(clienteDb.sucursalNombre);
      const sucursalNombre = sucursalSet.size > 0 ? Array.from(sucursalSet).join(', ') : 'Matriz';

      resultado.push({
        clientId,
        sucursalNombre,
        clienteNombre: nombreResuelto,
        clienteApellido,
        clienteNombreSolo,
        clienteCedula: cedulaResuelta,
        clienteTelefono: telefonoResuelto,
        clienteEmail: clienteDb?.email || cobroConEmail?.clienteEmail || '',
        clienteDireccion: clienteDb?.direccion || cobroConDireccion?.clienteDireccion || '',
        clienteNivel: clienteDb?.nivelCredito || primerCobro.clienteNivel || '—',
        montoTotalFacturado,
        saldoTotalPendiente,
        totalAbonado,
        totalCompras: listaCobros.length,
        totalComprasPendientes: comprasPendientes.length,
        estadoGlobal,
        proximoVencimiento: fechasPendientes[0],
        saldoAFavorCliente: clienteDb?.saldoAFavor ? Number(clienteDb.saldoAFavor) : 0,
        haCobradoHoy,
        totalAbonadoHoy,
        ultimoAbonoHoyFecha,
        cobros: listaCobros.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      });
    });

    // Ordenar alfabéticamente por apellido y nombre (ej: Acosta Dario), igual que el directorio de clientes
    return resultado.sort((a, b) => {
      const apellidoA = (a.clienteApellido || a.clienteNombre || '').trim().toLowerCase();
      const apellidoB = (b.clienteApellido || b.clienteNombre || '').trim().toLowerCase();
      const comp = apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
      if (comp !== 0) return comp;
      const nombreA = (a.clienteNombreSolo || '').trim().toLowerCase();
      const nombreB = (b.clienteNombreSolo || '').trim().toLowerCase();
      return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
    });
  })();

  const [acordeonNotasAbierto, setAcordeonNotasAbierto] = useState(false);
  const [detalleNotaModalAbierto, setDetalleNotaModalAbierto] = useState(false);

  // ── Selección activa (FIFO: La nota más antigua con deuda por defecto) ──────────
  const carteraSeleccionada = clientesCartera.find((c) => c.clientId === clienteSeleccionadoId) || (clientesCartera.length > 0 ? clientesCartera[0] : null);
  
  const cobrosOrdenadosPorAntiguedad = carteraSeleccionada?.cobros
    ? [...carteraSeleccionada.cobros].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];
  const notaMasAntiguaPendiente = cobrosOrdenadosPorAntiguedad.find((c) => Number(c.saldoPendiente) > 0) || cobrosOrdenadosPorAntiguedad[0];
  const cobroSeleccionado = cobros.find((c) => c.id === cobroSeleccionadoId) || notaMasAntiguaPendiente || null;

  // Agrupación de los últimos 3 abonos reales del cliente (tal como se realizaron los pagos unificados)
  const ultimos3AbonosCliente = useMemo(() => {
    if (!carteraSeleccionada?.cobros) return [];

    const todosAbonos: Array<{
      id: string;
      monto: number;
      metodo: string;
      createdAt: string;
      notas?: string;
      usuarioNombre?: string;
      usuarioSucursal?: string;
      esCobroOtraSucursal?: boolean;
      cobroId: string;
      numeroNota?: string | number;
    }> = [];

    carteraSeleccionada.cobros.forEach((c) => {
      const numNota = c.saleNote?.numero
        ? `Nota #${String(c.saleNote.numero).padStart(4, '0')}`
        : (c.numeroCobro || `#${c.id.slice(0, 8).toUpperCase()}`);

      (c.abonos || []).forEach((a) => {
        todosAbonos.push({
          id: a.id,
          monto: Number(a.monto),
          metodo: a.metodo,
          createdAt: a.createdAt,
          notas: a.notas,
          usuarioNombre: a.usuarioNombre,
          usuarioSucursal: a.usuarioSucursal,
          esCobroOtraSucursal: a.esCobroOtraSucursal,
          cobroId: c.id,
          numeroNota: numNota,
        });
      });
    });

    const gruposMap = new Map<string, {
      id: string;
      montoTotal: number;
      metodo: string;
      createdAt: string;
      notas: string;
      reciboRef?: string;
      usuarioNombre?: string;
      usuarioSucursal?: string;
      esCobroOtraSucursal?: boolean;
      notasAfectadas: Array<{ numeroNota: string | number; monto: number }>;
    }>();

    todosAbonos.forEach((a) => {
      const matchRec = a.notas?.match(/\[REC-([A-Z0-9]+)\]/i);
      const key = matchRec
        ? `REC-${matchRec[1]}`
        : `MANUAL-${a.createdAt ? a.createdAt.slice(0, 16) : a.id}-${a.metodo}-${a.usuarioNombre || ''}`;

      const notasLimpias = a.notas ? a.notas.replace(/\[REC-[A-Z0-9]+\]\s*/i, '').trim() : '';

      if (!gruposMap.has(key)) {
        gruposMap.set(key, {
          id: a.id,
          montoTotal: a.monto,
          metodo: a.metodo,
          createdAt: a.createdAt,
          notas: notasLimpias,
          reciboRef: matchRec ? `REC-${matchRec[1]}` : undefined,
          usuarioNombre: a.usuarioNombre,
          usuarioSucursal: a.usuarioSucursal,
          esCobroOtraSucursal: a.esCobroOtraSucursal,
          notasAfectadas: [{ numeroNota: a.numeroNota || 'S/N', monto: a.monto }],
        });
      } else {
        const g = gruposMap.get(key)!;
        g.montoTotal += a.monto;
        if (!g.notas && notasLimpias) g.notas = notasLimpias;
        const yaExisteNota = g.notasAfectadas.find((n) => n.numeroNota === a.numeroNota);
        if (yaExisteNota) {
          yaExisteNota.monto += a.monto;
        } else {
          g.notasAfectadas.push({ numeroNota: a.numeroNota || 'S/N', monto: a.monto });
        }
      }
    });

    return Array.from(gruposMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [carteraSeleccionada]);

  const handleSeleccionarCliente = (c: ClienteCartera) => {
    setClienteSeleccionadoId(c.clientId);
    // Ordenar cobros por fecha ascendente (de la más antigua a la más reciente)
    const cobrosPorAntiguedad = [...c.cobros].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    // Seleccionar automáticamente la nota MÁS ANTIGUA que tenga saldo pendiente
    const notaMasAntiguaConDeuda = cobrosPorAntiguedad.find((item) => Number(item.saldoPendiente) > 0) || cobrosPorAntiguedad[0];
    setCobroSeleccionadoId(notaMasAntiguaConDeuda?.id || null);
    setAcordeonNotasAbierto(false);
    setDetalleNotaModalAbierto(false);
    setMontoAbono('');
    setNotasAbono('');
    setShowCuentaModal(true);
  };

  const handleEnviarWhatsAppTexto = (telefono: string, mensaje: string) => {
    let numLimpio = (telefono || '').replace(/\D/g, '');
    if (!numLimpio || numLimpio === '0' || telefono === '—') {
      showToast('El cliente no tiene un número telefónico válido para WhatsApp.', 'warning');
      return;
    }
    abrirWhatsAppUniversal(telefono, mensaje);
  };

  const armarDatosComprobanteAbono = (
    cartera: ClienteCartera,
    abonoInfo: {
      monto: number;
      metodo: string;
      fecha?: string;
      notas?: string;
      numeroNota?: string;
      usuarioNombre?: string;
      sucursalNombre?: string;
    }
  ): ComprobanteAbonoPdfData => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    const fechaLegible = abonoInfo.fecha || hoy.toLocaleDateString('es-EC');
    const horaLegible = hoy.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

    // Cobros/entregas de hoy
    const cobrosDeHoy = cartera.cobros.filter((c) => c.createdAt && c.createdAt.startsWith(hoyStr));
    const montoComprasHoy = cobrosDeHoy.reduce((sum, c) => sum + Number(c.montoOriginal || c.montoTotal || 0), 0);
    const entregasHoy = cobrosDeHoy.map((c) => {
      const lineas = c.lines || c.saleNote?.lines || [];
      const modelos = agruparLineasPorModelo(lineas, catalogoProductos);

      const items = modelos.map((m) => {
        const tallasStr = m.tallas.map((t) => `T${t.numero}: ${t.cantidad}`).join(', ');
        return {
          modelo: m.modelName,
          color: m.color,
          serie: m.serieNombre,
          tallas: tallasStr,
          cantidadPares: m.totalPares,
          etiquetaVolumen: m.etiquetaVolumen,
          precioUnitario: m.precioUnitario,
          subtotal: m.subtotal,
        };
      });

      return {
        nota: c.saleNote?.numero ? `Nota #${String(c.saleNote.numero).padStart(4, '0')}` : (c.numeroCobro || 'Nota de Entrega'),
        monto: Number(c.montoOriginal || c.montoTotal || 0),
        items: items.length > 0 ? items : undefined,
      };
    });

    // Saldos
    const saldoRestante = Math.max(0, cartera.saldoTotalPendiente - abonoInfo.monto);
    let saldoAnterior = saldoRestante + abonoInfo.monto - montoComprasHoy;
    if (saldoAnterior < 0) saldoAnterior = 0;

    const numRecibo = `REC-${hoy.getFullYear()}${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const targetSucursalId = (cartera.cobros[0] as any)?.sucursalId || selectedSucursalCobroId || activeSucursalId;
    const sucEmisor = (sucursalesEmpresa || []).find((s: any) => s.id === targetSucursalId) ||
                      (sucursales || []).find((s: any) => s.id === targetSucursalId);
    const emisorNombre = sucEmisor?.name || businessConfig?.nombre || 'CALZADO DE CUERO';
    const emisorRuc = sucEmisor?.ruc || businessConfig?.ruc || '1804884664001';
    const emisorDireccion = sucEmisor?.direccion || businessConfig?.direccion || 'Cevallos, Tungurahua, Ecuador';
    const emisorTelefono = sucEmisor?.telefono || businessConfig?.telefono || (businessConfig as any)?.whatsappContacto || '';
    const emisorEmail = sucEmisor?.email || businessConfig?.email || '';

    return {
      emisor: {
        nombre: emisorNombre,
        ruc: emisorRuc,
        direccion: emisorDireccion,
        telefono: emisorTelefono,
        email: emisorEmail,
      },
      comprobante: {
        numero: numRecibo,
        fecha: fechaLegible,
        hora: horaLegible,
        formaPago: abonoInfo.metodo,
        referencia: abonoInfo.notas,
        notas: abonoInfo.notas,
        cajero: abonoInfo.usuarioNombre,
        sucursal: abonoInfo.sucursalNombre || cartera.cobros[0]?.sucursalNombre,
      },
      cliente: {
        nombre: cartera.clienteNombre,
        cedula: cartera.clienteCedula || 'Consumidor Final',
        telefono: cartera.clienteTelefono,
        email: cartera.clienteEmail,
        direccion: cartera.clienteDireccion,
        nivelCredito: cartera.clienteNivel,
      },
      movimiento: {
        numeroNota: abonoInfo.numeroNota,
        saldoAnterior,
        montoAbonado: abonoInfo.monto,
        saldoRestante,
        totalNotasPendientes: cartera.totalComprasPendientes,
        entregasHoy: entregasHoy.length > 0 ? entregasHoy : undefined,
      },
    };
  };

  const handleEnviarComprobanteAbono = async (
    cartera: ClienteCartera,
    abonoInfo: {
      monto: number;
      metodo: string;
      fecha?: string;
      notas?: string;
      numeroNota?: string;
      usuarioNombre?: string;
      sucursalNombre?: string;
    },
    _modo?: 'PDF' | 'TEXTO'
  ) => {
    const telefono = cartera.clienteTelefono && cartera.clienteTelefono !== '—' ? cartera.clienteTelefono : '';
    const emailDestino = cartera.clienteEmail || (cartera as any).email;

    if (!telefono && !emailDestino) {
      showToast('El cliente no tiene teléfono celular ni correo electrónico registrado para el envío.', 'warning');
      return;
    }

    const dataAbono = armarDatosComprobanteAbono(cartera, abonoInfo);

    // 1. Envío obligatorio a WhatsApp si dispone de teléfono
    if (telefono) {
      try {
        await compartirComprobanteAbonoPdf(dataAbono, telefono, false);
        showToast('Abriendo WhatsApp con el comprobante oficial de abono...', 'info');
      } catch (err: any) {
        console.error('Error al generar envío de abono:', err);
        const msg = await armarMensajeWhatsAppAbono(dataAbono, false);
        handleEnviarWhatsAppTexto(telefono, msg);
      }
    } else {
      showToast('El cliente no tiene número de teléfono registrado para WhatsApp.', 'info');
    }

    // 2. Envío obligatorio por Correo Electrónico en segundo plano
    if (emailDestino) {
      try {
        const msgTexto = await armarMensajeWhatsAppAbono(dataAbono, false);
        const urlRecibo = await generarUrlPublicaAbono(dataAbono);
        ApiService.post('/notificaciones/email-comprobante', {
          destinatario: emailDestino,
          asunto: `Comprobante de Abono — $${Number(abonoInfo.monto).toFixed(2)} — ${dataAbono.emisor?.nombre || 'Calzado'}`,
          tipo: 'ABONO',
          detalles: {
            mensaje: msgTexto,
            urlComprobante: urlRecibo,
          },
        }).then(() => {
          showToast(`Comprobante enviado por correo a ${emailDestino}`, 'success');
        }).catch((e) => {
          console.warn('Error en despacho de correo:', e);
        });
      } catch (e) {
        console.warn('Error generando comprobante para correo:', e);
      }
    } else {
      showToast('El cliente no tiene correo electrónico registrado para el envío.', 'info');
    }
  };

  const handleEnviarEstadoCuentaWhatsApp = (
    cartera: ClienteCartera,
    abonoInfoParam?: { monto: number; metodo: string; fecha?: string }
  ) => {
    if (!cartera.clienteTelefono) {
      showToast('El cliente no tiene teléfono registrado.', 'warning');
      return;
    }

    const hoyStr = new Date().toISOString().split('T')[0];
    const hoyLegible = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    const negocioNombre = businessConfig?.nombre || 'Administración de Cobros';

    // 1. Obtener el último abono (ya sea el recién ingresado o el último registrado en el historial)
    let ultimoAbono = abonoInfoParam;
    if (!ultimoAbono) {
      const todosAbonos: any[] = [];
      cartera.cobros.forEach((c) => {
        if (c.abonos && Array.isArray(c.abonos)) {
          c.abonos.forEach((a) => {
            todosAbonos.push({
              monto: Number(a.monto),
              metodo: a.metodo,
              fecha: a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-EC') : hoyLegible,
              createdAt: a.createdAt,
            });
          });
        }
      });
      todosAbonos.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      if (todosAbonos.length > 0) {
        ultimoAbono = todosAbonos[0];
      }
    }

    // 2. Revisar si hay compras / notas entregadas hoy
    const cobrosDeHoy = cartera.cobros.filter((c) => c.createdAt && c.createdAt.startsWith(hoyStr));
    const montoComprasHoy = cobrosDeHoy.reduce((sum, c) => sum + Number(c.montoOriginal || c.montoTotal || 0), 0);

    // 3. Saldo actual que queda debiendo
    let saldoActual = cartera.saldoTotalPendiente;
    if (abonoInfoParam) {
      // Si se acaba de registrar en este instante, el saldo final es el que queda tras este abono
      saldoActual = Math.max(0, cartera.saldoTotalPendiente - abonoInfoParam.monto);
    }

    const montoAbono = ultimoAbono ? ultimoAbono.monto : 0;

    // 4. Saldo anterior: lo que debía ANTES de esta entrega y de este abono
    let saldoAnterior = saldoActual + montoAbono - montoComprasHoy;
    if (saldoAnterior < 0) saldoAnterior = 0;

    const subtotalConCompra = saldoAnterior + montoComprasHoy;

    let msg = `Estimado/a *${capitalizarNombreCompleto(cartera.clienteNombre)}*,\n\nLe saludamos de *${negocioNombre}*. Le compartimos el comprobante de su movimiento actual:\n\n*Fecha:* ${hoyLegible}\n`;

    // Si había saldo anterior antes de este movimiento
    if (saldoAnterior > 0) {
      msg += `\n*Saldo Anterior:* $${saldoAnterior.toFixed(2)}`;
    }

    // Si hubo entrega de calzado en este movimiento
    if (montoComprasHoy > 0) {
      msg += `\n\n📦 *Entrega de Calzado / Mercadería Nueva:*`;
      cobrosDeHoy.forEach((c) => {
        const monto = Number(c.montoOriginal || c.montoTotal || 0);
        const lineas = c.lines || c.saleNote?.lines || [];
        const modelos = agruparLineasPorModelo(lineas, catalogoProductos);

        if (modelos.length > 0) {
          modelos.forEach((m) => {
            const colorStr = m.color ? ` (${m.color})` : '';
            const serieStr = m.serieNombre && m.serieNombre !== 'Estándar' && m.serieNombre !== 'General' ? ` • ${m.serieNombre}` : '';
            const tallasStr = m.tallas.length > 0 ? ` [${m.tallas.map((t) => `T${t.numero}: ${t.cantidad}`).join(', ')}]` : '';
            const volStr = m.etiquetaVolumen || `${m.totalPares} ${m.totalPares === 1 ? 'par' : 'pares'}`;
            msg += `\n   ▫️ ${m.modelName}${colorStr}${serieStr}\n      ${volStr}${tallasStr} • $${m.subtotal.toFixed(2)}`;
          });
        } else {
          msg += `\n   ▫️ Mercadería entregada • $${monto.toFixed(2)}`;
        }
      });
      msg += `\n   💰 *Subtotal mercadería:* $${montoComprasHoy.toFixed(2)}`;
      if (saldoAnterior > 0) {
        msg += `\n\n*Total a la fecha:* $${subtotalConCompra.toFixed(2)}`;
      }
    }

    // Si hubo abono en este movimiento
    if (ultimoAbono && montoAbono > 0) {
      msg += `\n\n*Abono Recibido:* -$${montoAbono.toFixed(2)} (${ultimoAbono.metodo})`;
    }

    // Saldo Final
    msg += `\n\n━━━━━━━━━━━━━━━━━━━━━`;
    if (saldoActual > 0) {
      msg += `\n*SALDO PENDIENTE ACTUAL: $${saldoActual.toFixed(2)}*`;
    } else {
      msg += `\n*SALDO PENDIENTE ACTUAL: $0.00 (CUENTA SALDADA)*`;
    }
    msg += `\n━━━━━━━━━━━━━━━━━━━━━\n\n¡Muchas gracias por su preferencia!\n*${negocioNombre}*`;

    handleEnviarWhatsAppTexto(cartera.clienteTelefono, msg);
  };

  const handleSolicitarConfirmacionAbono = () => {
    if (!carteraSeleccionada || !montoAbono) {
      showToast('Por favor, ingresa el monto del abono.', 'warning');
      return;
    }
    const valor = parseFloat(montoAbono);
    if (isNaN(valor) || valor <= 0) {
      showToast('Ingresa un monto válido mayor a $0.00', 'warning');
      return;
    }
    if (valor > Number(carteraSeleccionada.saldoTotalPendiente)) {
      showToast(`El monto no puede superar el saldo total adeudado por el cliente ($${Number(carteraSeleccionada.saldoTotalPendiente).toFixed(2)})`, 'warning');
      return;
    }
    setShowConfirmAbonoModal(true);
  };

  const handleRegistrarAbono = async () => {
    if (!carteraSeleccionada || !montoAbono) {
      showToast('Ingresa el monto del abono.', 'warning');
      return;
    }
    const valor = parseFloat(montoAbono);
    if (isNaN(valor) || valor <= 0) {
      showToast('Ingresa un monto válido mayor a $0.00', 'warning');
      return;
    }
    if (valor > Number(carteraSeleccionada.saldoTotalPendiente)) {
      showToast(`El monto no puede superar el saldo total adeudado por el cliente ($${Number(carteraSeleccionada.saldoTotalPendiente).toFixed(2)})`, 'warning');
      return;
    }

    setShowConfirmAbonoModal(false);

    // ─── PRE-APERTURA SÍNCRONA DE VENTANA (SOLO MODO TEXTO) ────────────
    // Para modo TEXTO pre-abrimos la ventana para evitar bloqueos del navegador.
    // Para modo PDF NO pre-abrimos ventana (se usa Web Share API directo, idéntico a Factura).
    const telefonoCliente =
      (carteraSeleccionada?.clienteTelefono && carteraSeleccionada.clienteTelefono !== '—')
        ? carteraSeleccionada.clienteTelefono
        : (cobroSeleccionado?.clienteTelefono && cobroSeleccionado.clienteTelefono !== '—')
        ? cobroSeleccionado.clienteTelefono
        : '';

    // Consultar configuración directa y actualizada de localStorage
    const autoEnviarWA = typeof window !== 'undefined'
      ? (localStorage.getItem('nexora_auto_whatsapp_abono') !== 'false' && localStorage.getItem('nexora_auto_whatsapp_comprobante') !== 'false')
      : autoEnviarWhatsAppAbono;

    setSavingAbono(true);
    try {
      // 1. Registrar abono unificado a nivel de cliente en una sola transacción atómica
      const resAbono = await ApiService.post(`/financiero/cliente/${carteraSeleccionada.clientId}/abono`, {
        monto: valor,
        metodo: metodoAbono,
        notas: notasAbono.trim() || undefined,
        sucursalId: selectedSucursalCobroId || miLocalId,
      });

      const nuevoSaldoStr = resAbono?.nuevoSaldo !== undefined ? `$${Number(resAbono.nuevoSaldo).toFixed(2)}` : 'actualizado';
      if (resAbono?.reclasificadoAContado) {
        showToast(`⚡ ¡Cobro saldado dentro de las 24 horas! Reclasificado automáticamente a CONTADO. Nuevo saldo deudor: ${nuevoSaldoStr}.`, 'success');
      } else {
        showToast(`Abono unificado de $${valor.toFixed(2)} registrado exitosamente. Nuevo saldo deudor: ${nuevoSaldoStr}.`, 'success');
      }

      // Nombre o número de recibo unificado asociado
      const numNotaRef = resAbono?.reciboRef
        ? `Recibo #${resAbono.reciboRef}`
        : (cobroSeleccionado?.saleNote?.numero
            ? `Nota #${String(cobroSeleccionado.saleNote.numero).padStart(4, '0')}`
            : undefined);

      const datosAbonoRegistrado = {
        monto: valor,
        metodo: metodoAbono,
        fecha: new Date().toLocaleDateString('es-EC'),
        notas: notasAbono.trim() || undefined,
        numeroNota: numNotaRef,
        saldoAnterior: resAbono?.saldoAnterior,
        nuevoSaldo: resAbono?.nuevoSaldo,
      };

      const carteraParaEnvio = { ...carteraSeleccionada, clienteTelefono: telefonoCliente };
      const dataAbono = armarDatosComprobanteAbono(carteraParaEnvio, datosAbonoRegistrado);

      // Envío AUTOMÁTICO por WhatsApp estandarizado (solo si está habilitado en configuración)
      if (autoEnviarWA && telefonoCliente) {
        const msg = await armarMensajeWhatsAppAbono(dataAbono, false);
        abrirWhatsAppUniversal(telefonoCliente, msg);
        showToast('Comprobante oficial de abono enviado por WhatsApp.', 'success');
      } else if (autoEnviarWA && !telefonoCliente) {
        showToast('Abono registrado. El cliente no tiene teléfono para enviar WhatsApp.', 'info');
      }

      // Envío AUTOMÁTICO por Correo Electrónico en segundo plano (sin abrir pestañas ni recargar)
      const autoEmail = typeof window !== 'undefined' ? localStorage.getItem('nexora_auto_email_comprobante') !== 'false' : true;
      const emailDestino = carteraSeleccionada?.clienteEmail || (carteraSeleccionada as any)?.email;
      if (autoEmail && emailDestino) {
        const msgTexto = await armarMensajeWhatsAppAbono(dataAbono, false);
        const urlRecibo = await generarUrlPublicaAbono(dataAbono);
        ApiService.post('/notificaciones/email-comprobante', {
          destinatario: emailDestino,
          asunto: `Comprobante de Abono — $${valor.toFixed(2)} — ${dataAbono.emisor?.nombre || 'Calzado'}`,
          tipo: 'ABONO',
          detalles: { 
            mensaje: msgTexto,
            urlComprobante: urlRecibo,
          },
        }).then(() => {
          showToast(`Comprobante enviado por correo a ${emailDestino}`, 'success');
        }).catch((e) => {
          console.warn('Error en despacho de correo en segundo plano:', e);
        });
      }

      if (clienteSeleccionadoId) {
        lastActiveClienteIdRef.current = clienteSeleccionadoId;
      }
      setMontoAbono('');
      setNotasAbono('');
      setShowCuentaModal(false);
      setCobroSeleccionadoId(null);
      await loadCobros(true);
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

  const rangoFechasHistorial = useMemo(() => {
    if (!historialCliente?.movimientos || historialCliente.movimientos.length === 0) {
      const hoy = new Date().toISOString().split('T')[0];
      return { minFecha: hoy, maxFecha: hoy, total: 0 };
    }
    const timestamps = historialCliente.movimientos
      .map(m => new Date(m.fecha).getTime())
      .filter(t => !isNaN(t));
    if (timestamps.length === 0) {
      const hoy = new Date().toISOString().split('T')[0];
      return { minFecha: hoy, maxFecha: hoy, total: 0 };
    }
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const minDateStr = new Date(minTimestamp).toISOString().split('T')[0];
    const maxDateStr = new Date(maxTimestamp).toISOString().split('T')[0];
    return {
      minFecha: minDateStr,
      maxFecha: maxDateStr,
      total: historialCliente.movimientos.length,
    };
  }, [historialCliente]);

  const movimientosFiltradosCompartir = useMemo(() => {
    if (!historialCliente?.movimientos) return [];
    return historialCliente.movimientos.filter(m => {
      const fMov = m.fecha ? m.fecha.split('T')[0] : '';
      if (filtroCompartirFechaInicio && fMov < filtroCompartirFechaInicio) return false;
      if (filtroCompartirFechaFin && fMov > filtroCompartirFechaFin) return false;
      return true;
    });
  }, [historialCliente, filtroCompartirFechaInicio, filtroCompartirFechaFin]);

  const handleAbrirCompartirHistorial = () => {
    if (!historialCliente) return;
    setFiltroCompartirFechaInicio(rangoFechasHistorial.minFecha);
    setFiltroCompartirFechaFin(rangoFechasHistorial.maxFecha);
    setCompartirEmailDestino(historialCliente.cliente.email || '');
    setCompartirTelefonoDestino(historialCliente.cliente.telefono || '');
    setShowCompartirHistorialModal(true);
  };

  const construirHistorialPdfData = (): HistorialComercialPdfData | null => {
    if (!historialCliente) return null;

    const tenantUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const emisorNombre = businessConfig?.nombre || tenantUser?.tenantName || 'Comercializadora de Calzado';
    const emisorRuc = businessConfig?.ruc || '1804884664001';
    const emisorDireccion = businessConfig?.direccion || 'Cevallos, Tungurahua, Ecuador';
    const emisorTelefono = businessConfig?.telefono || (businessConfig as any)?.whatsappContacto || '';
    const emisorEmail = businessConfig?.email || '';

    const entregas: any[] = [];
    const abonos: any[] = [];
    const devoluciones: any[] = [];

    let totalEntregasMonto = 0;
    let totalParesEntregados = 0;
    let totalAbonosMonto = 0;
    let totalDevolucionesMonto = 0;

    movimientosFiltradosCompartir.forEach((m) => {
      if (m.tipo === 'COMPRA_PEDIDO') {
        totalEntregasMonto += m.monto || 0;
        let paresPedido = 0;
        const rawLineas = (m.detalles?.lineas || m.detalles?.items || []) as any[];

        // Agrupación limpia con curva de tallas y código de producto para ModelTallaCurvaCard
        const variantesMap = new Map<string, any>();
        rawLineas.forEach((it: any) => {
          const modNom = it.modelName || it.modeloNombre || it.modelo || 'Calzado de Cuero';
          const col = it.color || '';
          const ser = it.serieNombre || it.serie || 'ADULTO';
          const cod = it.code || it.codigo || it.baseCode || '';
          const img = it.imageUrl || it.fotoUrl || null;
          const precio = Number(it.precioUnitario || 0);
          const paresLinea = Number(it.cantidad || it.cantidadPares || it.totalPares || 1);
          const numTalla = it.numeroTalla || it.tallaNumero || it.talla || 38;
          paresPedido += paresLinea;

          const key = `${modNom}_${col}_${ser}_${precio}`;
          if (!variantesMap.has(key)) {
            const tMap = new Map<string, number>();
            if (paresLinea > 0) tMap.set(String(numTalla), paresLinea);
            variantesMap.set(key, {
              modelo: modNom,
              color: col,
              serie: ser,
              codigo: cod,
              imageUrl: img,
              totalPares: paresLinea,
              precioUnitario: precio,
              subtotal: paresLinea * precio,
              tallasMap: tMap,
            });
          } else {
            const exist = variantesMap.get(key);
            exist.totalPares += paresLinea;
            exist.subtotal = exist.totalPares * exist.precioUnitario;
            if (!exist.imageUrl && img) exist.imageUrl = img;
            if (!exist.codigo && cod) exist.codigo = cod;
            const strTalla = String(numTalla);
            exist.tallasMap.set(strTalla, (exist.tallasMap.get(strTalla) || 0) + paresLinea);
          }
        });

        const itemsEntrega = Array.from(variantesMap.values()).map((v: any) => {
          const tallasArray: { talla: string; pares: number }[] = [];
          if (v.tallasMap) {
            v.tallasMap.forEach((pares: number, talla: string) => {
              if (Number(pares) > 0) {
                tallasArray.push({ talla: String(talla), pares: Number(pares) });
              }
            });
            tallasArray.sort((a, b) => Number(a.talla) - Number(b.talla));
          }

          const curvaStr = tallasArray.map((t) => `T${t.talla}: ${t.pares}p`).join('  ');

          let etiquetaVolumen = '';
          if (v.totalPares >= 12 && v.totalPares % 12 === 0) {
            const doc = v.totalPares / 12;
            etiquetaVolumen = doc === 1 ? '1 Docena' : `${doc} Docenas`;
          } else if (v.totalPares === 6) {
            etiquetaVolumen = '½ Docena';
          } else if (v.totalPares >= 6 && v.totalPares % 6 === 0) {
            const med = v.totalPares / 6;
            etiquetaVolumen = `${med * 0.5} Docenas`;
          } else {
            etiquetaVolumen = `${v.totalPares} ${v.totalPares === 1 ? 'par' : 'pares'}`;
          }

          return {
            modelo: v.modelo,
            color: v.color,
            serie: v.serie,
            codigo: v.codigo,
            imageUrl: v.imageUrl,
            tallas: tallasArray,
            curvaTallas: curvaStr,
            totalPares: v.totalPares,
            etiquetaVolumen,
            precioUnitario: v.precioUnitario,
            subtotal: v.subtotal,
          };
        });

        totalParesEntregados += paresPedido;
        entregas.push({
          fecha: m.fecha ? m.fecha.split('T')[0] : '',
          fechaRaw: m.fecha || m.fechaEntrega || '',
          pedidoId: m.pedidoId || m.id,
          numeroNota: m.numeroCodigo || (m.titulo ? m.titulo.replace(/[^0-9]/g, '') : ''),
          vendedor: m.vendedorNombre,
          entregadoPor: m.entregadoPor,
          fechaEntrega: m.fechaEntrega || m.fecha,
          montoTotal: m.monto,
          totalPares: paresPedido || undefined,
          items: itemsEntrega,
        });
      } else if (m.tipo === 'ABONO') {
        totalAbonosMonto += m.monto || 0;
        abonos.push({
          fecha: m.fecha ? m.fecha.split('T')[0] : '',
          fechaRaw: m.fecha || '',
          numeroComprobante: m.reciboRef || m.numeroCodigo || (m.titulo ? m.titulo.replace(/[^0-9]/g, '') : ''),
          formaPago: m.metodo || 'EFECTIVO',
          referencia: m.comprobante || m.referencia || m.numeroTransaccion || (m.notas ? m.notas.replace(/\[REC-[A-Z0-9]+\]/i, '').trim() : '') || m.numeroCodigo,
          monto: m.monto,
          cobradoPor: m.cobradoPor,
          saldoAnterior: m.saldoAnterior ?? (m.nuevoSaldo !== undefined ? m.nuevoSaldo + (m.monto || 0) : undefined),
          nuevoSaldo: m.nuevoSaldo,
        });
      } else if (m.tipo === 'DEVOLUCION') {
        totalDevolucionesMonto += m.monto || 0;
        const devLineas = (m.detalles?.lineas || []) as any[];
        const devPares = devLineas.reduce((acc: number, l: any) => acc + (l.cantidad || l.totalPares || 0), 0);
        devoluciones.push({
          fecha: m.fecha ? m.fecha.split('T')[0] : '',
          fechaRaw: m.fecha || '',
          monto: m.monto,
          procesadoPor: m.procesadoPor,
          motivo: m.detalles?.motivo || m.descripcion,
          totalPares: devPares || undefined,
        });
      }
    });

    // Ordenar entregas y abonos cronológicamente de la más antigua a la más actual
    entregas.sort((a, b) => {
      if (a.fechaRaw && b.fechaRaw && a.fechaRaw !== b.fechaRaw) {
        const tA = new Date(a.fechaRaw).getTime();
        const tB = new Date(b.fechaRaw).getTime();
        if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tA - tB;
      }
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      const numA = parseInt(a.numeroNota?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.numeroNota?.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });

    abonos.sort((a, b) => {
      if (a.fechaRaw && b.fechaRaw && a.fechaRaw !== b.fechaRaw) {
        const tA = new Date(a.fechaRaw).getTime();
        const tB = new Date(b.fechaRaw).getTime();
        if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tA - tB;
      }
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      const numA = parseInt(a.numeroComprobante?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.numeroComprobante?.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });

    const esCompleto =
      filtroCompartirFechaInicio === rangoFechasHistorial.minFecha &&
      filtroCompartirFechaFin === rangoFechasHistorial.maxFecha;

      const saldoPendienteCalculado = Math.max(
        0,
        Math.round((totalEntregasMonto - totalAbonosMonto - totalDevolucionesMonto) * 100) / 100
      );

      return {
        emisor: {
          nombre: emisorNombre,
          ruc: emisorRuc,
          direccion: emisorDireccion,
          telefono: emisorTelefono,
          email: emisorEmail,
          sucursal: 'Matriz Cevallos',
        },
        cliente: {
          nombre: historialCliente.cliente.nombre,
          cedula: historialCliente.cliente.cedula,
          telefono: compartirTelefonoDestino || historialCliente.cliente.telefono,
          email: compartirEmailDestino || historialCliente.cliente.email,
          direccion: historialCliente.cliente.direccion,
          nivelCredito: historialCliente.cliente.nivelCredito,
          limiteCredito: historialCliente.cliente.limiteCredito,
        },
        periodo: {
          fechaInicio: filtroCompartirFechaInicio || rangoFechasHistorial.minFecha,
          fechaFin: filtroCompartirFechaFin || rangoFechasHistorial.maxFecha,
          esHistoricoCompleto: esCompleto,
        },
        resumen: {
          totalEntregasMonto: Math.round(totalEntregasMonto * 100) / 100,
          totalParesEntregados,
          totalAbonosMonto: Math.round(totalAbonosMonto * 100) / 100,
          totalDevolucionesMonto: Math.round(totalDevolucionesMonto * 100) / 100,
          saldoPendienteFinal: saldoPendienteCalculado,
        },
        entregas,
        abonos,
        devoluciones,
      };
  };

  const handleDescargarHistorialPdf = async () => {
    const pdfData = construirHistorialPdfData();
    if (!pdfData) {
      showToast('No se puede generar el documento del historial.', 'error');
      return;
    }
    await descargarHistorialPdf(pdfData);
    showToast('Documento PDF generado y descargado exitosamente.', 'success');
  };

  const generarPreviewHistorial = useCallback(async () => {
    const pdfData = construirHistorialPdfData();
    if (!pdfData) {
      setPreviewPdfUrl(null);
      return;
    }

    setLoadingPreviewPdf(true);
    try {
      const dataConImg = await preCargarImagenesHistorial(pdfData);
      const doc = generarHistorialPdfDoc(dataConImg);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      console.error('Error generando preview de historial:', err);
    } finally {
      setLoadingPreviewPdf(false);
    }
  }, [
    historialCliente,
    filtroCompartirFechaInicio,
    filtroCompartirFechaFin,
    compartirTelefonoDestino,
    compartirEmailDestino,
    businessConfig,
  ]);

  useEffect(() => {
    if (!showCompartirHistorialModal) {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
      return;
    }

    const timer = setTimeout(() => {
      generarPreviewHistorial();
    }, 250);

    return () => clearTimeout(timer);
  }, [showCompartirHistorialModal, filtroCompartirFechaInicio, filtroCompartirFechaFin, generarPreviewHistorial]);

  const handleCompartirHistorial = async () => {
    const pdfData = construirHistorialPdfData();
    if (!pdfData) {
      showToast('No se puede generar el documento del historial.', 'error');
      return;
    }
    if (!compartirTelefonoDestino || compartirTelefonoDestino.trim().length < 7) {
      showToast('Por favor ingrese un número de teléfono válido para WhatsApp.', 'warning');
      return;
    }

    setCompartiendoHistorial(true);
    try {
      // 1. Generar enlace público ultra-corto para consultar el historial en línea
      let urlPublica = '';
      try {
        urlPublica = await generarUrlPublicaHistorial(pdfData);
      } catch (urlErr) {
        console.warn('Error generando URL corta de historial:', urlErr);
      }

      // 2. Enviar en segundo plano al correo electrónico registrado del cliente
      const emailTarget = (historialCliente?.cliente?.email || '').trim();
      if (emailTarget && emailTarget.includes('@')) {
        const pdfBase64 = await generarHistorialPdfBase64(pdfData);
        const cleanCliente = pdfData.cliente.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
        const nombreArchivo = `Historial_${cleanCliente}_${pdfData.periodo.fechaInicio}_${pdfData.periodo.fechaFin}.pdf`;

        const enlaceHtml = urlPublica
          ? `<div style="text-align: center; margin: 25px 0;">
               <a href="${urlPublica}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                 📄 Ver y Descargar Historial Completo en Línea
               </a>
               <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Enlace seguro: <a href="${urlPublica}" style="color: #059669;">${urlPublica}</a></p>
             </div>`
          : '';

        ApiService.post('/notificaciones/email-comprobante', {
          destinatario: emailTarget,
          clienteNombre: pdfData.cliente.nombre,
          asunto: `Historial Comercial y Financiero — ${pdfData.emisor.nombre}`,
          cuerpoHtml: `
            <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <div style="background-color: #0f172a; padding: 18px 24px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0; font-size: 18px;">${pdfData.emisor.nombre}</h2>
                <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px;">Historial Comercial y Financiero Oficial</p>
              </div>
              <p>Estimado(a) <strong>${pdfData.cliente.nombre}</strong>,</p>
              <p>Adjunto a este correo encontrará el extracto cronológico oficial de sus transacciones y movimientos comerciales (pedidos despachados, abonos recibidos y saldos vigentes) para el periodo del <strong>${pdfData.periodo.fechaInicio}</strong> al <strong>${pdfData.periodo.fechaFin}</strong>.</p>
              ${enlaceHtml}
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <td style="padding: 10px;"><strong>Saldo Actual Pendiente:</strong></td>
                  <td style="padding: 10px; text-align: right; font-weight: bold; color: ${pdfData.resumen.saldoPendienteFinal > 0 ? '#b91c1c' : '#059669'}; font-size: 15px;">$${pdfData.resumen.saldoPendienteFinal.toFixed(2)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 10px;">Total Despachos en el Período:</td>
                  <td style="padding: 8px 10px; text-align: right;">$${pdfData.resumen.totalEntregasMonto.toFixed(2)} (${pdfData.resumen.totalParesEntregados} pares)</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 10px;">Total Abonos Registrados:</td>
                  <td style="padding: 8px 10px; text-align: right; color: #059669; font-weight: bold;">-$${pdfData.resumen.totalAbonosMonto.toFixed(2)}</td>
                </tr>
              </table>
              <p style="font-size: 12px; color: #64748b;">Si tiene alguna inquietud o necesita mayor detalle sobre las notas o comprobantes, no dude en contactarnos.</p>
            </div>
          `,
          adjuntos: [
            {
              nombre: nombreArchivo,
              contenidoBase64: pdfBase64,
              tipoMime: 'application/pdf',
            },
          ],
        }).catch((err) => {
          console.warn('Envío de correo de historial en segundo plano falló:', err);
        });
      }

      // 3. Compartir vía WhatsApp con el enlace público incluido (sin descarga automática)
      await compartirHistorialWhatsApp(pdfData, compartirTelefonoDestino, false, urlPublica);

      showToast(
        emailTarget && emailTarget.includes('@')
          ? 'Historial compartido por WhatsApp y enviado al correo en segundo plano.'
          : 'Historial compartido exitosamente vía WhatsApp.',
        'success'
      );
    } catch (e: any) {
      showToast(e.message || 'Error al compartir el historial.', 'error');
    } finally {
      setCompartiendoHistorial(false);
    }
  };

  const handleAbrirDevolucion = async (cartera: ClienteCartera) => {
    setClienteSeleccionadoId(cartera.clientId);
    setShowDevolucionModal(true);
    setLineasDevolucion([]);
    setLoadingProductosVendidos(true);
    setBusquedaModeloDevolucion('');
    setProductoSeleccionadoDevolucionObj(null);
    setDevolucionProductoId('');
    setDevolucionTallaId('');
    setDevolucionPrecioUnitario(0);
    setDevolucionCantidadParesInput('1');
    setDevolucionCantidadSeries(1);
    setMotivoDevolucion('');

    // Preasignar nota por defecto (la nota más antigua con deuda)
    const notaMasAntigua = [...cartera.cobros]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .find((c) => Number(c.saldoPendiente) > 0) || cartera.cobros[0];
    setDevolucionCobroId(notaMasAntigua?.id || '');

    try {
      // Cargar historial para extraer exactamente los modelos que este cliente compró y su precio de venta real
      const dataHistorial = await ApiService.get(`/financiero/cliente/${cartera.clientId}/historial`);
      const productosMap = new Map<string, any>();

      if (dataHistorial && Array.isArray(dataHistorial.movimientos)) {
        dataHistorial.movimientos.forEach((m: any) => {
          if (m.detalles && Array.isArray(m.detalles.lineas)) {
            // Buscar cobro asociado a este movimiento
            const cobroAsociado = cartera.cobros.find((c) =>
              ((c.saleNote as any)?.orderId && m.pedidoId && (c.saleNote as any).orderId === m.pedidoId) ||
              (c.saleNote?.numero && m.titulo && m.titulo.includes(String(c.saleNote.numero))) ||
              (c.id === m.id)
            ) || notaMasAntigua;

            const notaTexto = cobroAsociado?.saleNote?.numero
              ? `Nota #${String(cobroAsociado.saleNote.numero).padStart(4, '0')}`
              : (m.numeroCodigo || 'Nota de Venta');

            m.detalles.lineas.forEach((l: any) => {
              const prodId = l.productId;
              if (prodId && !productosMap.has(prodId)) {
                const catProd = catalogoProductos.find((p) => p.id === prodId);
                productosMap.set(prodId, {
                  id: prodId,
                  modelName: l.modelName || catProd?.modelName || 'Calzado',
                  color: l.color || catProd?.color || '',
                  imageUrl: l.imageUrl || catProd?.imageUrl || null,
                  serieNombre: l.serieNombre || catProd?.serieNombre || 'Estándar',
                  precioUnitario: Number(l.precioUnitario || catProd?.salePrice || 0),
                  tallas: catProd?.tallas || [{ id: l.tallaId || 'default', numeroTalla: l.numeroTalla || 38, stock: l.cantidad || 1, quantity: l.cantidad || 1 }],
                  paresComprados: l.cantidad || 0,
                  tipoVentaComprado: l.tipoVenta || 'GENERAL',
                  cobroId: cobroAsociado?.id,
                  notaCodigo: notaTexto,
                });
              } else if (prodId) {
                const existing = productosMap.get(prodId);
                existing.paresComprados += (l.cantidad || 0);
              }
            });
          }
        });
      }

      const lista = Array.from(productosMap.values());
      const finalList = lista.length > 0 ? lista : catalogoProductos;
      setProductosVendidosCliente(finalList);

      if (finalList.length > 0) {
        handleSeleccionarProductoDevolucion(finalList[0]);
      }
    } catch (err) {
      console.warn('Error al cargar productos vendidos del cliente:', err);
      setProductosVendidosCliente(catalogoProductos);
      if (catalogoProductos.length > 0) {
        handleSeleccionarProductoDevolucion(catalogoProductos[0]);
      }
    } finally {
      setLoadingProductosVendidos(false);
    }
  };

  const handleSeleccionarProductoDevolucion = (prod: any) => {
    setProductoSeleccionadoDevolucionObj(prod);
    setDevolucionProductoId(prod.id);
    setDevolucionPrecioUnitario(Number(prod.precioUnitario || prod.salePrice || 0));
    if (prod.cobroId) {
      setDevolucionCobroId(prod.cobroId);
    }
    if (prod.tallas && prod.tallas.length > 0) {
      setDevolucionTallaId(prod.tallas[0].id || String(prod.tallas[0].numeroTalla || prod.tallas[0].numero || ''));
    }
  };

  const handleAgregarModeloADevolucion = () => {
    const prod = productoSeleccionadoDevolucionObj || catalogoProductos.find((p) => p.id === devolucionProductoId);
    if (!prod) {
      showToast('Selecciona un modelo de calzado primero.', 'warning');
      return;
    }

    const precio = Number(devolucionPrecioUnitario || prod.precioUnitario || prod.salePrice || 0);
    if (precio <= 0) {
      showToast('Ingresa un precio unitario válido.', 'warning');
      return;
    }

    const nuevasLineas: LineaDevolucionItem[] = [...lineasDevolucion];

    if (devolucionTipo === 'SERIE_COMPLETA') {
      const totalParesSerie = (devolucionSubtipoSerie === 'MEDIA_DOCENA' ? 6 : 12) * Math.max(1, devolucionCantidadSeries || 1);
      const tallas = prod.tallas && prod.tallas.length > 0
        ? prod.tallas
        : [
            { id: 't38', numeroTalla: 38 },
            { id: 't39', numeroTalla: 39 },
            { id: 't40', numeroTalla: 40 },
            { id: 't41', numeroTalla: 41 },
            { id: 't42', numeroTalla: 42 },
            { id: 't43', numeroTalla: 43 },
          ];

      const porTalla = Math.floor(totalParesSerie / tallas.length) || 1;
      let acumulado = 0;

      tallas.forEach((t: any, idx: number) => {
        const cant = idx === tallas.length - 1 ? (totalParesSerie - acumulado) : porTalla;
        acumulado += cant;
        const tId = t.id || String(t.numeroTalla || t.numero);
        const numTalla = t.numeroTalla || t.numero || 38;

        const existingIdx = nuevasLineas.findIndex(
          (l) => l.productId === prod.id && l.tallaId === tId
        );

        if (existingIdx !== -1) {
          nuevasLineas[existingIdx].cantidad += cant;
          nuevasLineas[existingIdx].subtotal = nuevasLineas[existingIdx].cantidad * precio;
          nuevasLineas[existingIdx].precioUnitario = precio;
        } else {
          nuevasLineas.push({
            id: `dev-${prod.id}-${tId}-${Date.now()}-${Math.random()}`,
            productId: prod.id,
            modelName: prod.modelName || 'Calzado',
            color: prod.color || '',
            serieNombre: prod.serieNombre || 'Serie',
            imageUrl: prod.imageUrl || null,
            tallaId: tId,
            numeroTalla: numTalla,
            cantidad: cant,
            precioUnitario: precio,
            subtotal: cant * precio,
            tipoVenta: 'SERIE_COMPLETA',
            subtipoSerie: devolucionSubtipoSerie,
          });
        }
      });
    } else {
      // Por talla específica
      const pares = Math.max(1, parseInt(devolucionCantidadParesInput) || 1);
      const tId = devolucionTallaId || (prod.tallas?.[0]?.id ? String(prod.tallas[0].id) : 'default');
      const tallaObj = prod.tallas?.find((t: any) => t.id === tId || String(t.numeroTalla || t.numero) === tId);
      const numTalla = tallaObj ? (tallaObj.numeroTalla || tallaObj.numero) : (devolucionTallaId || 38);

      const existingIdx = nuevasLineas.findIndex(
        (l) => l.productId === prod.id && l.tallaId === tId
      );

      if (existingIdx !== -1) {
        nuevasLineas[existingIdx].cantidad += pares;
        nuevasLineas[existingIdx].subtotal = nuevasLineas[existingIdx].cantidad * precio;
        nuevasLineas[existingIdx].precioUnitario = precio;
      } else {
        nuevasLineas.push({
          id: `dev-${prod.id}-${tId}-${Date.now()}-${Math.random()}`,
          productId: prod.id,
          modelName: prod.modelName || 'Calzado',
          color: prod.color || '',
          serieNombre: prod.serieNombre || 'Serie',
          imageUrl: prod.imageUrl || null,
          tallaId: tId,
          numeroTalla: numTalla,
          cantidad: pares,
          precioUnitario: precio,
          subtotal: pares * precio,
          tipoVenta: 'POR_TALLA',
        });
      }
    }

    setLineasDevolucion(nuevasLineas);
    showToast(`¡${prod.modelName} añadido a la devolución!`, 'success');
  };

  const handleCambiarCantidadTallaDevolucion = (productId: string, tallaId: string, delta: number) => {
    setLineasDevolucion((prev) => {
      const nuevas = [...prev];
      const idx = nuevas.findIndex((l) => l.productId === productId && l.tallaId === tallaId);
      if (idx !== -1) {
        const nuevaCant = nuevas[idx].cantidad + delta;
        if (nuevaCant <= 0) {
          nuevas.splice(idx, 1);
        } else {
          nuevas[idx] = {
            ...nuevas[idx],
            cantidad: nuevaCant,
            subtotal: nuevaCant * nuevas[idx].precioUnitario,
          };
        }
      }
      return nuevas;
    });
  };

  const handleAjustarMediaDocenaDevolucion = (productId: string, serieNombre: string, tipo: 'MEDIA_A' | 'MEDIA_B', delta: 1 | -1) => {
    const curva = getCurvaDocena(serieNombre || '', tipo);
    const hasCurva = Object.keys(curva).length > 0;
    setLineasDevolucion((prev) =>
      prev.map((l) => {
        if (l.productId === productId) {
          const numT = Number(l.numeroTalla);
          const qty = hasCurva ? (curva[numT] || 0) : 0;
          const newCant = delta > 0 ? l.cantidad + qty : Math.max(1, l.cantidad - qty);
          return { ...l, cantidad: newCant, subtotal: newCant * l.precioUnitario };
        }
        return l;
      })
    );
  };

  const handleSumarParTodasTallasDevolucion = (productId: string) => {
    setLineasDevolucion((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, cantidad: l.cantidad + 1, subtotal: (l.cantidad + 1) * l.precioUnitario }
          : l
      )
    );
  };

  const handleRestarParTodasTallasDevolucion = (productId: string) => {
    setLineasDevolucion((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, cantidad: Math.max(1, l.cantidad - 1), subtotal: Math.max(1, l.cantidad - 1) * l.precioUnitario }
          : l
      )
    );
  };

  const handleEliminarModeloDevolucion = (productId: string) => {
    setLineasDevolucion((prev) => prev.filter((l) => l.productId !== productId));
    showToast('Modelo eliminado de la devolución.', 'info');
  };

  const handleSetObservacionModeloDevolucion = (productId: string, observacion?: string) => {
    setLineasDevolucion((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, observacionModelo: observacion } : l))
    );
  };

  const handleRegistrarDevolucion = async () => {
    if (!carteraSeleccionada) return;

    if (lineasDevolucion.length === 0) {
      showToast('Añade al menos un modelo de calzado a la devolución antes de procesar.', 'warning');
      return;
    }

    const totalPares = lineasDevolucion.reduce((sum, l) => sum + l.cantidad, 0);
    const totalMonto = lineasDevolucion.reduce((sum, l) => sum + l.subtotal, 0);

    if (totalMonto <= 0 || totalPares <= 0) {
      showToast('Ingresa cantidades y precios válidos para procesar la devolución.', 'warning');
      return;
    }

    setSavingDevolucion(true);
    try {
      const selectedCobro = carteraSeleccionada.cobros.find((c) => c.id === devolucionCobroId);

      const linesPayload = lineasDevolucion.map((l) => ({
        productId: l.productId,
        tallaId: l.tallaId,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
      }));

      const notasModelos = lineasDevolucion
        .filter((l) => l.observacionModelo)
        .map((l) => `${l.modelName} (T${l.numeroTalla}): ${l.observacionModelo}`);

      const motivoFinal = [
        motivoDevolucion.trim() || (devolucionDestino === 'BAJA_POR_FALLA' ? 'Defecto de Fábrica / Falla de Calzado' : 'Devolución Comercial / Cambio'),
        notasModelos.length > 0 ? `[Notas: ${notasModelos.join('; ')}]` : ''
      ].filter(Boolean).join(' - ');

      const uLogged = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const resultado = await ApiService.post('/devoluciones/cliente', {
        clientId: carteraSeleccionada.clientId,
        saleNoteId: selectedCobro?.saleNote?.id || undefined,
        motivo: motivoFinal,
        recibidoPor: uLogged?.nombre || uLogged?.name || undefined,
        tipoDevolucion: 'TALLA_ESPECIFICA',
        destinoStock: devolucionDestino,
        lines: linesPayload,
      });

      // Mostrar resultado financiero detallado
      const resumen = resultado?.resumenFinanciero;
      if (resumen) {
        const msgParts = [
          `Devolucion de ${totalPares} pares procesada.`,
          `Deuda descontada: $${Number(resumen.deudaDescontada || 0).toFixed(2)}.`,
        ];
        if (Number(resumen.saldoAFavor || 0) > 0) {
          msgParts.push(`Saldo a favor del cliente: $${Number(resumen.saldoAFavor).toFixed(2)}.`);
        }
        showToast(msgParts.join(' '), 'success');
      } else {
        showToast(
          `Devolucion de ${totalPares} pares ($${totalMonto.toFixed(2)}) procesada exitosamente!`,
          'success'
        );
      }

      if (carteraSeleccionada?.clientId) {
        lastActiveClienteIdRef.current = carteraSeleccionada.clientId;
      }
      setShowDevolucionModal(false);
      setLineasDevolucion([]);
      setMotivoDevolucion('');
      setDevolucionProductoId('');
      setDevolucionPrecioUnitario(0);
      await loadCobros(true);
    } catch (err: any) {
      showToast(err.message || 'Error al registrar devolucion.', 'error');
    } finally {
      setSavingDevolucion(false);
    }
  };

  // ── Agrupación de líneas por modelo para la factura ─────
  const agruparLineasParaFactura = (notas: Cobro[]) => {
    const agrupados: {
      codigoProducto: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      descuento: number;
      tarifaIva: number;
      codigoIva: string;
    }[] = [];

    notas.forEach((c) => {
      const numNota = c.saleNote?.numero
        ? `Nota #${String(c.saleNote.numero).padStart(4, '0')}`
        : `#${c.id.slice(0, 6).toUpperCase()}`;
      const lineas = c.saleNote?.lines;

      if (lineas && lineas.length > 0) {
        // Agrupar líneas por nombre+serie dentro de la misma nota
        const grupoMap = new Map<string, { nombre: string; serie: string; cantidad: number; totalPrecio: number; productId: string }>();

        lineas.forEach((l: any) => {
          const key = `${(l.nombre || 'Calzado').toLowerCase()}_${(l.serie || 'sin-serie').toLowerCase()}`;
          if (!grupoMap.has(key)) {
            grupoMap.set(key, {
              nombre: l.nombre || 'Calzado de Cuero',
              serie: l.serie || '',
              cantidad: 0,
              totalPrecio: 0,
              productId: l.productId || 'CALZ-01',
            });
          }
          const g = grupoMap.get(key)!;
          g.cantidad += Number(l.cantidad) || 1;
          g.totalPrecio += (Number(l.cantidad) || 1) * Number(l.precioUnitario || 0);
        });

        grupoMap.forEach((g) => {
          let descripcion = '';
          if (g.cantidad === 12) {
            descripcion = `1 Docena - ${g.nombre}`;
          } else if (g.cantidad === 6) {
            descripcion = `Media Docena - ${g.nombre}`;
          } else {
            descripcion = `${g.cantidad} ${g.cantidad === 1 ? 'Par' : 'Pares'} - ${g.nombre}`;
          }
          if (g.serie) descripcion += ` (${g.serie})`;
          descripcion += ` [${numNota}]`;

          const precioUnitarioGrupo = g.cantidad > 0 ? g.totalPrecio / g.cantidad : 0;

          agrupados.push({
            codigoProducto: g.productId.slice(0, 8).toUpperCase(),
            descripcion,
            cantidad: g.cantidad,
            precioUnitario: Number(precioUnitarioGrupo.toFixed(2)),
            descuento: 0,
            tarifaIva: 15,
            codigoIva: '4',
          });
        });
      } else {
        const monto = Number(c.montoOriginal ?? c.montoTotal ?? 0);
        agrupados.push({
          codigoProducto: `VENTA-${c.id.slice(0, 6).toUpperCase()}`,
          descripcion: `${businessConfig?.nombre || 'Calzado Artesanal'} — ${numNota}`,
          cantidad: 1,
          precioUnitario: monto,
          descuento: 0,
          tarifaIva: 15,
          codigoIva: '4',
        });
      }
    });

    return agrupados;
  };

  // ── Enviar por WhatsApp ─────────────
  const handleEnviarWhatsApp = (telefono: string, mensaje: string) => {
    abrirWhatsAppUniversal(telefono, mensaje);
  };

  // ── Facturación Electrónica SRI ─────────────
  const handleAbrirFacturacion = async (cliente: ClienteCartera, cobroItem?: Cobro) => {
    setFacturaResultado(null);
    setTabFactura('CONFIGURAR');
    const cedulaLimpia = cliente.clienteCedula !== '—' ? cliente.clienteCedula.trim() : '';
    let tipoId = '05'; // Cédula por defecto
    if (cedulaLimpia.length === 13) tipoId = '04'; // RUC
    else if (cedulaLimpia === '9999999999999' || !cedulaLimpia) tipoId = '07'; // Consumidor Final

    // Seleccionar notas a facturar
    const notasParaFacturar = cobroItem ? [cobroItem] : cliente.cobros;
    // Usar agrupación concisa
    const detalles = agruparLineasParaFactura(notasParaFacturar);

    // Datos reales del cliente desde la BD
    const direccionReal = cliente.clienteDireccion || 'Cevallos, Tungurahua';
    const emailReal = cliente.clienteEmail || '';

    setFacturaCliente({
      clientId: cliente.clientId,
      saleNoteId: cobroItem?.saleNote?.id || undefined,
      nombre: cliente.clienteNombre,
      cedula: cedulaLimpia || (tipoId === '07' ? '9999999999999' : ''),
      telefono: cliente.clienteTelefono !== '—' ? cliente.clienteTelefono : '',
      direccion: direccionReal,
      email: emailReal,
      tipoIdentificacion: tipoId,
      formaPago: '01', // 01=Efectivo por defecto
      detalles,
      notasSeleccionadas: notasParaFacturar.map((n) => n.id),
    });

    setShowFacturaModal(true);
  };

  const handleToggleNotaFacturar = (cobroItem: Cobro) => {
    if (!facturaCliente || !carteraSeleccionada) return;

    const yaSeleccionada = facturaCliente.notasSeleccionadas.includes(cobroItem.id);
    const nuevasNotasIds = yaSeleccionada
      ? facturaCliente.notasSeleccionadas.filter((id) => id !== cobroItem.id)
      : [...facturaCliente.notasSeleccionadas, cobroItem.id];

    if (nuevasNotasIds.length === 0) {
      showToast('Debes mantener al menos una nota seleccionada para facturar.', 'warning');
      return;
    }

    const notasActualizadas = carteraSeleccionada.cobros.filter((c) => nuevasNotasIds.includes(c.id));
    const nuevosDetalles = agruparLineasParaFactura(notasActualizadas);

    setFacturaCliente({
      ...facturaCliente,
      detalles: nuevosDetalles,
      notasSeleccionadas: nuevasNotasIds,
    });
  };

  const handleEmitirFacturaSRI = async () => {
    if (!facturaCliente) return;

    if (!facturaCliente.cedula && facturaCliente.tipoIdentificacion !== '07') {
      showToast('Ingresa la Cédula o RUC del comprador.', 'warning');
      return;
    }
    if (!facturaCliente.nombre.trim()) {
      showToast('Ingresa la Razón Social o Nombre del comprador.', 'warning');
      return;
    }
    if (facturaCliente.detalles.length === 0) {
      showToast('Debes incluir al menos un ítem a facturar.', 'warning');
      return;
    }

    const subtotal = facturaCliente.detalles.reduce(
      (sum, d) => sum + d.cantidad * d.precioUnitario - (d.descuento || 0),
      0,
    );
    const iva = facturaCliente.detalles.reduce(
      (sum, d) => sum + ((d.cantidad * d.precioUnitario - (d.descuento || 0)) * d.tarifaIva) / 100,
      0,
    );
    const totalConImpuestos = subtotal + iva;

    setEmittingFactura(true);
    setFacturaResultado(null);
    try {
      const payload = {
        saleNoteId: facturaCliente.saleNoteId,
        fecha: new Date(),
        comprador: {
          tipoIdentificacion: facturaCliente.tipoIdentificacion,
          identificacion: facturaCliente.tipoIdentificacion === '07' ? '9999999999999' : facturaCliente.cedula.trim(),
          razonSocial: facturaCliente.nombre.trim(),
          direccion: facturaCliente.direccion.trim() || 'Cevallos, Tungurahua',
          email: facturaCliente.email.trim() || 'facturas@cliente.com',
          telefono: facturaCliente.telefono.trim() || '0999999999',
        },
        detalles: facturaCliente.detalles.map((d) => ({
          codigoProducto: d.codigoProducto,
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          descuento: d.descuento || 0,
          codigoIva: d.codigoIva || '4',
          tarifaIva: d.tarifaIva || 15,
        })),
        formaPago: facturaCliente.formaPago || '01',
        totalConImpuestos: Number(totalConImpuestos.toFixed(2)),
      };

      const res = await ApiService.post('/facturacion-sri/emitir', payload);
      const esAutorizado = res.estadoSri === 'AUTORIZADO';

      setFacturaResultado({
        success: esAutorizado,
        numeroComprobante: res.numeroComprobante || '001-001-00000000X',
        claveAcceso: res.claveAcceso,
        estadoSri: res.estadoSri || 'PENDIENTE',
        xmlUrl: res.xmlUrl,
        ridePdfUrl: res.ridePdfUrl,
        errorMensaje: res.errorMensaje,
      });

      if (esAutorizado) {
        showToast(`¡Factura ${res.numeroComprobante} AUTORIZADA por el SRI!`, 'success');
      } else {
        showToast(`Factura registrada con estado: ${res.estadoSri}`, 'info');
      }
    } catch (err: any) {
      setFacturaResultado({
        success: false,
        numeroComprobante: 'ERROR',
        estadoSri: 'RECHAZADO',
        errorMensaje: err.message || 'Error al comunicarse con el SRI.',
      });
      showToast(err.message || 'Error al emitir factura al SRI', 'error');
    } finally {
      setEmittingFactura(false);
    }
  };

  const handleAbrirCambiarTipo = (cobro: Cobro) => {
    const esCredito = (cobro.tipo || '').toUpperCase() === 'CREDITO';
    const tipoDestino: 'CREDITO' | 'CONTADO' = esCredito ? 'CONTADO' : 'CREDITO';
    setCobroParaCambiarTipo(cobro);
    setNuevoTipoVenta(tipoDestino);
    setCambioTipoDiasPlazo(30);
    
    const fechaDefecto = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setCambioTipoFechaVencimiento(fechaDefecto);
    
    const totalAbonado = (cobro.abonos || []).reduce((sum, a) => sum + Number(a.monto), 0);
    setCambioTipoMontoAbonado(totalAbonado > 0 ? String(totalAbonado) : '');
    setCambioTipoMetodoAbono('EFECTIVO');
    setCambioTipoNotas('');
    setShowCambiarTipoModal(true);
  };

  const handleEjecutarCambioTipo = async () => {
    if (!cobroParaCambiarTipo) return;
    setSavingCambiarTipo(true);
    try {
      const res = await ApiService.post(`/financiero/cobros/${cobroParaCambiarTipo.id}/cambiar-tipo`, {
        nuevoTipo: nuevoTipoVenta,
        diasPlazo: cambioTipoDiasPlazo,
        fechaVencimiento: nuevoTipoVenta === 'CREDITO' ? cambioTipoFechaVencimiento : undefined,
        montoAbonadoInicial: nuevoTipoVenta === 'CREDITO' ? (parseFloat(cambioTipoMontoAbonado) || 0) : undefined,
        metodoAbonoInicial: cambioTipoMetodoAbono,
        notas: cambioTipoNotas,
      });

      if (cobroParaCambiarTipo?.clientId) {
        lastActiveClienteIdRef.current = cobroParaCambiarTipo.clientId;
      }
      showToast(res.message || 'Tipo de venta modificado exitosamente.', 'success');
      setShowCambiarTipoModal(false);
      setCobroParaCambiarTipo(null);
      await loadCobros(true);
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar tipo de venta.', 'error');
    } finally {
      setSavingCambiarTipo(false);
    }
  };

  const saldoTotalGeneral = cobrosFiltradosPorSucursal.reduce((acc, c) => {
    if (c.estado === 'SALDADO' || c.tipo === 'CONTADO') return acc;
    return acc + Number(c.saldoPendiente || 0);
  }, 0);

  const handleDescargarReporteDeudores = () => {
    const deudores = clientesCartera
      .filter((c) => c.saldoTotalPendiente > 0.01)
      .map((c) => ({
        clientId: c.clientId,
        clienteNombre: c.clienteNombre,
        clienteApellido: c.clienteApellido,
        clienteNombreSolo: c.clienteNombreSolo,
        clienteCedula: c.clienteCedula,
        clienteTelefono: c.clienteTelefono,
        clienteNivel: c.clienteNivel,
        sucursalNombre: c.sucursalNombre,
        totalCompras: c.montoTotalFacturado,
        saldoTotalPendiente: c.saldoTotalPendiente,
        totalComprasPendientes: c.totalComprasPendientes,
        proximoVencimiento: c.proximoVencimiento,
      }));

    if (deudores.length === 0) {
      showToast('No existen clientes con saldo deudor pendiente para exportar.', 'info');
      return;
    }

    const tenantUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const emisorNombre = businessConfig?.nombre || tenantUser?.tenantName || 'Comercializadora de Calzado';
    const emisorRuc = businessConfig?.ruc || '1804884664001';
    const emisorDireccion = businessConfig?.direccion || 'Cevallos, Tungurahua, Ecuador';
    const emisorTelefono = businessConfig?.telefono || (businessConfig as any)?.whatsappContacto || '';

    const hoy = new Date();
    const fechaEmision = `${hoy.toLocaleDateString('es-EC')} ${hoy.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`;

    descargarReporteDeudoresPdf({
      emisor: {
        nombre: emisorNombre,
        ruc: emisorRuc,
        direccion: emisorDireccion,
        telefono: emisorTelefono,
      },
      fechaEmision,
      totalDeudaCartera: saldoTotalGeneral,
      deudores,
      filtroSucursal: activeSucursalId !== 'TODAS'
        ? (listaSucursalesDisponibles.find((s) => s.id === selectedSucursalCobroId)?.name || 'Sucursal Seleccionada')
        : 'Todas las Sucursales',
    });

    showToast(`Reporte PDF generado exitosamente con ${deudores.length} clientes deudores.`, 'success');
  };

  // Resumen operativo de Cobranza del Día de Hoy
  const resumenCobranzaHoy = useMemo(() => {
    let cobradosHoyCount = 0;
    let montoCobradoHoy = 0;
    let faltaCobrarHoyCount = 0;
    let montoFaltaCobrarHoy = 0;

    clientesCartera.forEach((c) => {
      if (c.haCobradoHoy) {
        cobradosHoyCount++;
        montoCobradoHoy += c.totalAbonadoHoy;
      }
      if (c.saldoTotalPendiente > 0 && !c.haCobradoHoy) {
        faltaCobrarHoyCount++;
        montoFaltaCobrarHoy += c.saldoTotalPendiente;
      }
    });

    return {
      cobradosHoyCount,
      montoCobradoHoy,
      faltaCobrarHoyCount,
      montoFaltaCobrarHoy,
    };
  }, [clientesCartera]);

  // Filtrado de Cartera Consolidada
  const clientesFiltrados = clientesCartera.filter((c) => {
    const cumpleEstado =
      filtro === 'TODOS'
        ? true
        : filtro === 'PENDIENTE'
        ? c.saldoTotalPendiente > 0 && c.estadoGlobal !== 'VENCIDO'
        : c.estadoGlobal === filtro;

    const cumpleFiltroCobroHoy =
      filtroCobroHoy === 'TODOS'
        ? true
        : filtroCobroHoy === 'FALTA_COBRAR_HOY'
        ? c.saldoTotalPendiente > 0 && !c.haCobradoHoy
        : c.haCobradoHoy;

    const q = normalizarParaBusqueda(busqueda);
    if (!q) return cumpleEstado && cumpleFiltroCobroHoy;

    const nombreNorm = normalizarParaBusqueda(c.clienteNombre);
    const cedula = (c.clienteCedula || '').toLowerCase();
    const cumpleBusqueda = nombreNorm.includes(q) || cedula.includes(q);

    return cumpleEstado && cumpleFiltroCobroHoy && cumpleBusqueda;
  });

  // Filtrado de Cobros Individuales
  const facturasFiltradas = cobrosFiltradosPorSucursal
    .filter((c) => {
      const cumpleEstado = filtro === 'TODOS' ? true : c.estado === filtro;
      const q = normalizarParaBusqueda(busqueda);
      if (!q) return cumpleEstado;

      const cliDb = clientesRaw.find((cl) => cl.id === c.clientId);
      const nombreCompleto = cliDb && (cliDb.apellido || cliDb.nombre)
        ? `${cliDb.apellido || ''} ${cliDb.nombre || ''}`
        : (c.clienteNombre || '');
      const nombreNorm = normalizarParaBusqueda(nombreCompleto);
      const cedula = (c.clienteCedula || '').toLowerCase();
      const num = (c.numeroCobro || c.saleNote?.numero?.toString() || c.id || '').toLowerCase();

      return cumpleEstado && (nombreNorm.includes(q) || cedula.includes(q) || num.includes(q));
    })
    .sort((a, b) => {
      const cliA = clientesRaw.find((cl) => cl.id === a.clientId);
      const cliB = clientesRaw.find((cl) => cl.id === b.clientId);
      const apellidoA = (cliA?.apellido || a.clienteNombre || '').trim().toLowerCase();
      const apellidoB = (cliB?.apellido || b.clienteNombre || '').trim().toLowerCase();
      const comp = apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
      if (comp !== 0) return comp;
      const nombreA = (cliA?.nombre || '').trim().toLowerCase();
      const nombreB = (cliB?.nombre || '').trim().toLowerCase();
      return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
    });

  return (
    <div className="space-y-6">
      {/* Header & KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-xl tracking-tight text-[var(--foreground)]">
            Cartera de Clientes y Gestión de Cobros
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] font-medium">
            Consolidación de deudas por cliente, detalle de notas de venta y control de abonos
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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
              <span>Por Nota / Cobro</span>
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

          {/* Botón Descargar Reporte PDF de Clientes Deudores */}
          <button
            type="button"
            onClick={handleDescargarReporteDeudores}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Descargar reporte oficial en PDF con la lista de personas que deben (Apellidos, Nombres y Saldo)"
          >
            <Download size={15} />
            <span>Descargar Lista Deudores (PDF)</span>
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda, Sucursales y Filtros de Estado */}
      <div className="space-y-2.5">
        {/* Fila 1: Búsqueda a la izquierda y Sucursales al lado derecho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          {/* Pestañas de Sucursal Dinámicas por Nombre - Acomodadas al lado derecho */}
          {listaSucursalesDisponibles.length >= 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted-foreground)] shrink-0 hidden sm:inline-block">
                Sucursal:
              </span>
              <div className="flex items-center p-1 bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl gap-1.5 flex-nowrap shrink-0">
                {listaSucursalesDisponibles.map((suc) => {
                  const isSelected = selectedSucursalCobroId === suc.id;
                  const isMiLocal = miLocalId === suc.id;
                  const countDeudas = cobros.filter((c) => c.tenantId === suc.id || (!c.tenantId && suc.isMatriz)).length;
                  const esOtra = !isMiLocal;

                  return (
                    <button
                      key={suc.id}
                      type="button"
                      onClick={() => setSelectedSucursalCobroId(suc.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
                        {countDeudas}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fila 2: Filtros de Estado - Debajo exactamente como en Pedidos */}
        <div className="flex flex-wrap items-center gap-1.5 w-full pt-0.5">
          <button
            onClick={() => setFiltro('TODOS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              filtro === 'TODOS'
                ? 'bg-[#0F172A] text-white border-transparent shadow-xs'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Todos ({vista === 'CLIENTES' ? clientesCartera.length : cobrosFiltradosPorSucursal.length})
          </button>
          {(['PENDIENTE', 'PARCIALMENTE_PAGADO', 'SALDADO', 'VENCIDO'] as const).map((st) => {
            const cfg = getCobroConfig(st);
            const count = vista === 'CLIENTES'
              ? clientesCartera.filter((c) => (st === 'PENDIENTE' ? (c.saldoTotalPendiente > 0 && c.estadoGlobal !== 'VENCIDO') : c.estadoGlobal === st)).length
              : cobrosFiltradosPorSucursal.filter((c) => c.estado === st).length;
            const active = filtro === st;
            return (
              <button
                key={st}
                onClick={() => setFiltro(st as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  active
                    ? `${cfg.color} shadow-xs font-black`
                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {st === 'PENDIENTE' && <Clock size={13} />}
                {st === 'PARCIALMENTE_PAGADO' && <Wallet size={13} />}
                {st === 'SALDADO' && <CheckCircle size={13} />}
                {st === 'VENCIDO' && <AlertTriangle size={13} />}
                <span>{cfg.label}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Fila 3: Filtro Operativo de Cobranza de Hoy (Falta cobrar vs Cobrados hoy) */}
        {vista === 'CLIENTES' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 bg-gradient-to-r from-emerald-500/10 via-[var(--muted)]/40 to-amber-500/10 border border-[var(--border)] rounded-2xl w-full">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted-foreground)] px-1 flex items-center gap-1">
                <Calendar size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span>Cobranza del Día:</span>
              </span>
              <button
                type="button"
                onClick={() => setFiltroCobroHoy('TODOS')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  filtroCobroHoy === 'TODOS'
                    ? 'bg-[#0F172A] text-white border-transparent shadow-xs'
                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                Todos ({clientesCartera.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroCobroHoy('FALTA_COBRAR_HOY')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  filtroCobroHoy === 'FALTA_COBRAR_HOY'
                    ? 'bg-amber-600 text-white border-transparent shadow-xs font-black ring-2 ring-amber-400/50'
                    : 'bg-[var(--card)] border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
                }`}
                title="Mostrar únicamente clientes con deuda pendiente que aún NO han realizado pagos hoy"
              >
                <Clock size={12} className="shrink-0" />
                <span>⏳ Falta Cobrar Hoy</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black font-mono ${
                  filtroCobroHoy === 'FALTA_COBRAR_HOY' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                }`}>
                  {resumenCobranzaHoy.faltaCobrarHoyCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroCobroHoy('COBRADOS_HOY')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  filtroCobroHoy === 'COBRADOS_HOY'
                    ? 'bg-emerald-600 text-white border-transparent shadow-xs font-black ring-2 ring-emerald-400/50'
                    : 'bg-[var(--card)] border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                }`}
                title="Mostrar clientes que ya realizaron abonos el día de hoy"
              >
                <CheckCircle2 size={12} className="shrink-0" />
                <span>✓ Cobrados Hoy</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black font-mono ${
                  filtroCobroHoy === 'COBRADOS_HOY' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                }`}>
                  {resumenCobranzaHoy.cobradosHoyCount}
                </span>
              </button>
            </div>

            {/* Resumen monetario del día */}
            <div className="flex items-center gap-2.5 px-2 text-xs flex-wrap sm:flex-nowrap">
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                Recaudado hoy: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">${resumenCobranzaHoy.montoCobradoHoy.toFixed(2)}</strong>
              </span>
              <span className="text-[var(--border)] hidden sm:inline">|</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                Pendiente por cobrar: <strong className="font-mono text-amber-600 dark:text-amber-400 font-extrabold">${resumenCobranzaHoy.montoFaltaCobrarHoy.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Grid Principal: Tabla completa */}
      <div className="space-y-4">
        {/* Tabla de Clientes o Facturas */}
        <div className="space-y-4">
          {loading && cobros.length === 0 ? (
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
                        {activeSucursalId === 'TODAS' && (
                          <th className="px-5 py-4 text-center">Sucursal</th>
                        )}
                        <th className="px-5 py-4 text-center">Compras / Notas</th>
                        <th className="px-5 py-4 text-center">Estado Cartera</th>
                        <th className="px-5 py-4 text-right">Total Facturado</th>
                        <th className="px-5 py-4 text-right">Saldo Deudor Total</th>
                        <th className="px-5 py-4 text-right">Próx. Vencimiento</th>
                        <th className="px-5 py-4 text-center">Acciones</th>
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
                              id={`cliente-row-${cliente.clientId}`}
                              onClick={() => handleSeleccionarCliente(cliente)}
                              className={`hover:bg-[var(--muted)]/30 cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#0F172A]/5 border-l-4 border-l-[#0F172A]' : ''
                              }`}
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2.5">
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

                                  {/* Visto / Estado de Cobranza Hoy en el lado izquierdo */}
                                  {cliente.haCobradoHoy ? (
                                    <div
                                      className="w-7 h-7 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                                      title={`✓ Cobrado hoy: $${cliente.totalAbonadoHoy.toFixed(2)}${cliente.ultimoAbonoHoyFecha ? ` a las ${new Date(cliente.ultimoAbonoHoyFecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
                                    >
                                      <CheckCircle2 size={16} className="stroke-[2.5]" />
                                    </div>
                                  ) : cliente.saldoTotalPendiente > 0 ? (
                                    <div
                                      className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400"
                                      title="Falta cobrar hoy (cliente con deuda pendiente sin abonos hoy)"
                                    >
                                      <Clock size={14} className="stroke-[2.2]" />
                                    </div>
                                  ) : (
                                    <div
                                      className="w-7 h-7 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0 text-slate-400"
                                      title="Cliente al día (sin saldo pendiente)"
                                    >
                                      <Check size={14} />
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-extrabold text-xs text-[var(--foreground)] capitalize">
                                        {capitalizarNombreCompleto(cliente.clienteNombre)}
                                      </span>
                                      {cliente.haCobradoHoy && (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                                          ✓ Cobrado hoy: ${cliente.totalAbonadoHoy.toFixed(2)}
                                        </span>
                                      )}
                                      {!cliente.haCobradoHoy && cliente.saldoTotalPendiente > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                                          ⏳ Falta cobrar
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)] mt-0.5 flex-wrap">
                                      <span>C.I: {cliente.clienteCedula}</span>
                                      {cliente.clienteNivel && (
                                        <span className="px-1.5 py-0.2 bg-[#0F172A]/10 text-[#0F172A] rounded font-bold">
                                          {cliente.clienteNivel}
                                        </span>
                                      )}
                                      {cliente.haCobradoHoy && cliente.ultimoAbonoHoyFecha && (
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                          · Abono {new Date(cliente.ultimoAbonoHoyFecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {activeSucursalId === 'TODAS' && (
                                <td className="px-5 py-4 text-center">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                    <Building size={12} /> {cliente.sucursalNombre || 'Matriz'}
                                  </span>
                                </td>
                              )}

                              <td className="px-5 py-4 text-center">
                                <span className="px-2.5 py-1 bg-[var(--muted)] text-[var(--foreground)] rounded-lg text-xs font-bold border border-[var(--border)]">
                                  {cliente.totalCompras} {cliente.totalCompras === 1 ? 'compra' : 'compras'}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-center">
                                {cliente.saldoTotalPendiente === 0 && cliente.saldoAFavorCliente > 0 ? (
                                  <span className="px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                    ✨ Con saldo a favor
                                  </span>
                                ) : (
                                  <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-block ${cfg.color}`}>
                                    {cfg.label}
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-4 text-right text-xs font-semibold text-[var(--muted-foreground)]">
                                ${cliente.montoTotalFacturado.toFixed(2)}
                              </td>

                              <td className="px-5 py-4 text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <span
                                    className={`text-sm font-black ${
                                      cliente.saldoTotalPendiente > 0 ? 'text-red-500' : 'text-emerald-600'
                                    }`}
                                  >
                                    ${cliente.saldoTotalPendiente.toFixed(2)}
                                  </span>
                                  {cliente.saldoAFavorCliente > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                      💰 ${cliente.saldoAFavorCliente.toFixed(2)} a favor
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-4 text-right text-[11px] text-[var(--muted-foreground)]">
                                {cliente.proximoVencimiento
                                  ? new Date(cliente.proximoVencimiento).toLocaleDateString('es-EC')
                                  : 'Al día / Contado'}
                              </td>

                              <td className="px-5 py-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSeleccionarCliente(cliente);
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <DollarSign size={13} />
                                    <span>Gestionar Cobro</span>
                                  </button>
                                  {cliente.clienteTelefono && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEnviarEstadoCuentaWhatsApp(cliente);
                                      }}
                                      className="p-1.5 px-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                      title="Enviar Estado de Cuenta al WhatsApp del Cliente"
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                      <span className="text-[10px] font-bold">WhatsApp</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Desglose Expandible de Notas/Facturas del Cliente */}
                            {isExpanded && (
                              <tr className="bg-[var(--muted)]/20">
                                <td colSpan={8} className="px-6 py-4">
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
                                        const abonosHoyCobro = (cobroItem.abonos || []).filter((a) => esMismoDia(a.createdAt));
                                        const totalAbonadoHoyCobro = abonosHoyCobro.reduce((sum, a) => sum + Number(a.monto || 0), 0);
                                        const numNota = cobroItem.saleNote?.numero
                                          ? `NOTA #${String(cobroItem.saleNote.numero).padStart(4, '0')}`
                                          : cobroItem.numeroCobro || `#${cobroItem.id.slice(0, 8).toUpperCase()}`;
                                        const orderId = cobroItem.orderId || cobroItem.saleNote?.orderId;
                                        const orderCodigo = cobroItem.orderCodigo || cobroItem.saleNote?.orderCodigo || (orderId ? `PED-${orderId.slice(0, 4).toUpperCase()}` : null);
                                        const montoOrig = Number(cobroItem.montoOriginal ?? cobroItem.montoTotal ?? 0);
                                        const isCobroActive = (cobroSeleccionadoId === cobroItem.id);

                                        return (
                                          <div
                                            key={cobroItem.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (orderId && onNavigateToPedido) {
                                                onNavigateToPedido(orderId, cobroItem.tenantId);
                                                return;
                                              }
                                              setClienteSeleccionadoId(cliente.clientId);
                                              setCobroSeleccionadoId(cobroItem.id);
                                              setDetalleNotaModalAbierto(true);
                                              setAcordeonNotasAbierto(false);
                                              setMontoAbono('');
                                              setNotasAbono('');
                                              setShowCuentaModal(true);
                                            }}
                                            className={`group p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer ${
                                              isCobroActive
                                                ? 'bg-[#0F172A]/10 border-[#0F172A]/40 shadow-xs ring-1 ring-[#0F172A]/30'
                                                : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]/40 hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:shadow-xs'
                                            }`}
                                            title={
                                              orderId
                                                ? `Redirigir al detalle del pedido ${orderCodigo || ''} en la sección de Pedidos`
                                                : `Abrir directamente ${numNota} y ver sus artículos`
                                            }
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="p-2 rounded-xl bg-slate-500/10 text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <FileText size={16} />
                                              </div>
                                              <div>
                                                <div className="font-bold text-xs text-[var(--foreground)] flex items-center gap-2 flex-wrap">
                                                  <span className="font-extrabold text-xs text-[var(--foreground)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                                    <span>{numNota}</span>
                                                  </span>

                                                  {/* REFERENCIA AL PEDIDO ASOCIADO */}
                                                  {orderCodigo ? (
                                                    <span
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (orderId && onNavigateToPedido) {
                                                          onNavigateToPedido(orderId, cobroItem.tenantId);
                                                        }
                                                      }}
                                                      className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs cursor-pointer"
                                                      title={`Generado desde el pedido ${orderCodigo} · Clic para ver en Pedidos`}
                                                    >
                                                      <Package size={11} />
                                                      <span>Pedido #${orderCodigo}</span>
                                                      <ExternalLink size={10} className="opacity-75" />
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] text-[var(--muted-foreground)] italic">
                                                      (Registro manual)
                                                    </span>
                                                  )}
                                                  {activeSucursalId === 'TODAS' && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                                      <Building size={10} /> {cobroItem.sucursalNombre || 'Matriz'}
                                                    </span>
                                                  )}
                                                  {(cobroItem as any).esProntoPago24h ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30">
                                                      ⚡ Contado (Pronto pago 24h)
                                                    </span>
                                                  ) : (
                                                    <span className="px-2 py-0.2 bg-[var(--muted)] text-[var(--muted-foreground)] rounded text-[10px]">
                                                      {cobroItem.tipo || 'Crédito'}
                                                    </span>
                                                  )}
                                                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${cCfg.color}`}>
                                                    {cCfg.label}
                                                  </span>
                                                  {abonosHoyCobro.length > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                                                      <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                                                      <span>Abonado hoy: ${totalAbonadoHoyCobro.toFixed(2)}</span>
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-3 mt-1 flex-wrap">
                                                  <span>Fecha: {new Date(cobroItem.createdAt).toLocaleDateString('es-EC')}</span>
                                                  {cobroItem.fechaVencimiento && (
                                                    <span>Vence: {new Date(cobroItem.fechaVencimiento).toLocaleDateString('es-EC')}</span>
                                                  )}
                                                  {cobroItem.vendedorNombre && (
                                                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                                      <User size={10} />
                                                      <span>Vendedor: {cobroItem.vendedorNombre}</span>
                                                    </span>
                                                  )}
                                                  {activeSucursalId === 'TODAS' && cobroItem.sucursalNombre && (
                                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                                      <Building size={10} />
                                                      <span>Sucursal: {cobroItem.sucursalNombre}</span>
                                                    </span>
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

                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAbrirCambiarTipo(cobroItem);
                                                  }}
                                                  className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl transition-all border border-blue-500/20 flex items-center gap-1 cursor-pointer shadow-2xs"
                                                  title={cobroItem.tipo === 'CONTADO' ? 'Convertir a Crédito' : 'Convertir a Contado'}
                                                >
                                                  {cobroItem.tipo === 'CONTADO' ? <CreditCard size={13} /> : <DollarSign size={13} />}
                                                  <span>{cobroItem.tipo === 'CONTADO' ? 'A Crédito' : 'A Contado'}</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAbrirFacturacion(cliente, cobroItem);
                                                  }}
                                                  className="px-2.5 py-1.5 bg-[#0F172A]/10 hover:bg-[#0F172A] hover:text-white text-[#0F172A] text-xs font-bold rounded-xl transition-all border border-[#0F172A]/20 flex items-center gap-1"
                                                  title="Emitir factura electrónica SRI para esta nota"
                                                >
                                                  <Receipt size={13} />
                                                  <span>Facturar SRI</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setClienteSeleccionadoId(cliente.clientId);
                                                    setCobroSeleccionadoId(cobroItem.id);
                                                    setDetalleNotaModalAbierto(true);
                                                    setAcordeonNotasAbierto(false);
                                                    setMontoAbono('');
                                                    setNotasAbono('');
                                                    setShowCuentaModal(true);
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
          ) : vista === 'FACTURAS' ? (
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
                        {activeSucursalId === 'TODAS' && (
                          <th className="px-5 py-4 text-center">Sucursal</th>
                        )}
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
                        const orderId = cobro.orderId || cobro.saleNote?.orderId;
                        const orderCodigo = cobro.orderCodigo || cobro.saleNote?.orderCodigo || (orderId ? `PED-${orderId.slice(0, 4).toUpperCase()}` : null);
                        const montoOrig = Number(cobro.montoOriginal ?? cobro.montoTotal ?? 0);
                        const isSelected = cobroSeleccionadoId === cobro.id;

                        return (
                          <tr
                            id={`cobro-row-${cobro.id}`}
                            key={cobro.id}
                            onClick={() => {
                              if (orderId && onNavigateToPedido) {
                                onNavigateToPedido(orderId, cobro.tenantId);
                                return;
                              }
                              setClienteSeleccionadoId(cobro.clientId);
                              setCobroSeleccionadoId(cobro.id);
                              setDetalleNotaModalAbierto(true);
                              setAcordeonNotasAbierto(false);
                              setMontoAbono('');
                              setNotasAbono('');
                              setShowCuentaModal(true);
                            }}
                            className={`hover:bg-[var(--muted)]/30 cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#0F172A]/5 border-l-4 border-l-[#0F172A]' : ''
                            }`}
                          >
                            <td className="px-5 py-4 font-bold text-xs text-[var(--foreground)]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Receipt size={14} className="text-[var(--muted-foreground)]" />
                                <span>{num}</span>
                                {orderCodigo && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (orderId && onNavigateToPedido) {
                                        onNavigateToPedido(orderId, cobro.tenantId);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs"
                                    title={`Ir al pedido ${orderCodigo} en la sección de Pedidos`}
                                  >
                                    <Package size={10} />
                                    <span>#${orderCodigo}</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[var(--muted-foreground)] block font-normal">
                                Tipo: {cobro.tipo || 'Crédito'}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-extrabold text-xs text-[var(--foreground)] capitalize">
                                {(() => {
                                  const cliDb = clientesRaw.find((cl) => cl.id === cobro.clientId);
                                  const nom = cliDb && (cliDb.apellido || cliDb.nombre)
                                    ? `${cliDb.apellido || ''} ${cliDb.nombre || ''}`.trim()
                                    : cobro.clienteNombre;
                                  return capitalizarNombreCompleto(nom);
                                })()}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)] mt-0.5 flex-wrap">
                                <span>C.I: {cobro.clienteCedula}</span>
                                {cobro.clienteNivel && (
                                  <span className="px-1.5 py-0.2 bg-slate-500/10 text-slate-700 rounded font-bold">
                                    {cobro.clienteNivel}
                                  </span>
                                )}
                                {cobro.vendedorNombre && (
                                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium capitalize">
                                    <User size={10} />
                                    <span>{capitalizarNombreCompleto(cobro.vendedorNombre)}</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {activeSucursalId === 'TODAS' && (
                              <td className="px-5 py-4 text-center">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
                                  <Building size={11} className="shrink-0" />
                                  <span>{cobro.sucursalNombre || 'Matriz'}</span>
                                </span>
                              </td>
                            )}

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
          ) : null}
        </div>
      </div>


      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: GESTIÓN DE ABONOS & CUENTA CORRIENTE DEL CLIENTE       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showCuentaModal && carteraSeleccionada && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowCuentaModal(false), isDirtyAbono()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowCuentaModal(false), isDirtyAbono()); }}
        >
          <div
            className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* ── Header del Modal ── */}
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex flex-col shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Gestión de Cobros
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Cuenta corriente y registro de abonos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => safeDismiss(() => setShowCuentaModal(false), isDirtyAbono())}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>

              {/* Info del Cliente en el Header */}
              <div className="mt-4 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-emerald-400" />
                    <span className="font-black text-sm text-white capitalize">{capitalizarNombreCompleto(carteraSeleccionada.clienteNombre)}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 rounded text-[10px] font-bold border border-emerald-400/20">
                      {carteraSeleccionada.clienteNivel}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    carteraSeleccionada.estadoGlobal === 'SALDADO' || carteraSeleccionada.estadoGlobal === 'PAGADO'
                      ? 'bg-emerald-400/20 text-emerald-300'
                      : carteraSeleccionada.estadoGlobal === 'VENCIDO'
                      ? 'bg-red-400/20 text-red-300'
                      : 'bg-amber-400/20 text-amber-300'
                  }`}>
                    {getCobroConfig(carteraSeleccionada.estadoGlobal).label}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between mt-1.5 items-center">
                  <span>Cédula: <strong className="text-slate-200">{carteraSeleccionada.clienteCedula}</strong></span>
                  <span>Tel: <strong className="text-slate-200">{carteraSeleccionada.clienteTelefono}</strong></span>
                </div>
                {carteraSeleccionada.clienteTelefono && (
                  <button
                    type="button"
                    onClick={() => handleEnviarEstadoCuentaWhatsApp(carteraSeleccionada)}
                    className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                    title="Enviar resumen de Estado de Cuenta al WhatsApp del Cliente"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <span>Compartir Estado de Cuenta por WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Body del Modal (scrollable) ── */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* 1. Saldo Pendiente */}
              <div className="p-3.5 bg-red-500/5 dark:bg-red-500/10 rounded-xl border border-red-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block uppercase tracking-wider">
                    Saldo Pendiente
                  </span>
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    Monto pendiente por cobrar
                  </span>
                </div>
                <span className="text-base font-black text-red-600 dark:text-red-400 font-mono">
                  ${carteraSeleccionada.saldoTotalPendiente.toFixed(2)}
                </span>
              </div>

              {/* 2. Formulario para Registrar Nuevo Abono (debajo del saldo pendiente) */}
              {carteraSeleccionada && Number(carteraSeleccionada.saldoTotalPendiente) > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-xs font-bold text-[var(--foreground)] block flex items-center gap-1.5">
                      <ArrowUpRight size={13} className="text-emerald-600" />
                      Registrar Abono
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      Se descontará automáticamente de las notas pendientes (FIFO)
                    </span>
                  </div>

                  {/* Monto con Botones de Sugerencia Rápida */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                      <label className="block text-[11px] font-semibold text-[var(--muted-foreground)]">
                        Monto a Abonar ($) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[var(--muted-foreground)] font-semibold mr-0.5">Sugerir:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const val = (Number(carteraSeleccionada.saldoTotalPendiente) * 0.25).toFixed(2);
                            setMontoAbono(val);
                          }}
                          className="px-2 py-0.5 bg-[var(--muted)]/50 hover:bg-emerald-500/10 hover:text-emerald-600 text-[10px] font-bold rounded-md border border-[var(--border)] transition-all cursor-pointer"
                        >
                          25%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = (Number(carteraSeleccionada.saldoTotalPendiente) * 0.50).toFixed(2);
                            setMontoAbono(val);
                          }}
                          className="px-2 py-0.5 bg-[var(--muted)]/50 hover:bg-emerald-500/10 hover:text-emerald-600 text-[10px] font-bold rounded-md border border-[var(--border)] transition-all cursor-pointer"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = Number(carteraSeleccionada.saldoTotalPendiente).toFixed(2);
                            setMontoAbono(val);
                          }}
                          className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold rounded-md border border-emerald-500/30 transition-all cursor-pointer"
                        >
                          Totalidad (${Number(carteraSeleccionada.saldoTotalPendiente).toFixed(2)})
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={carteraSeleccionada.saldoTotalPendiente}
                      placeholder="0.00"
                      value={montoAbono}
                      onChange={(e) => setMontoAbono(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm font-bold text-emerald-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                      Método de Liquidación / Abono *
                    </label>
                    <select
                      value={metodoAbono}
                      onChange={(e) => setMetodoAbono(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A] transition-all"
                    >
                      <option value="EFECTIVO">💵 Efectivo</option>
                      <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                      <option value="DEPOSITO">💳 Depósito Bancario</option>
                      <option value="DESCUENTO_COMERCIAL">🎁 Descuento / Rebaja (Retención de Mercadería)</option>
                    </select>
                  </div>

                  {metodoAbono === 'DESCUENTO_COMERCIAL' && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-800 space-y-1">
                      <span className="font-bold flex items-center gap-1">💡 Descuento de Retención / Fidelización</span>
                      <p>
                        Este monto rebajará el saldo del cliente por concepto de descuento comercial acordado, evitando la devolución física del calzado a bodega.
                      </p>
                    </div>
                  )}

                  {/* Referencia / Justificación — solo si NO es EFECTIVO */}
                  {metodoAbono !== 'EFECTIVO' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                        {metodoAbono === 'DESCUENTO_COMERCIAL' ? 'Motivo / Justificación del Descuento *' : 'N° Comprobante / Referencia / Banco *'}
                      </label>
                      <input
                        type="text"
                        placeholder={metodoAbono === 'DESCUENTO_COMERCIAL' ? 'Ej. Descuento por retención de mercadería / Bonificación acordada' : 'Ej. Transf #12948 Banco Pichincha'}
                        value={notasAbono}
                        onChange={(e) => setNotasAbono(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A] transition-all"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 3. Últimos 3 Abonos Registrados tal como se realizaron */}
              <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--foreground)] block flex items-center gap-1.5">
                    <ArrowDownRight size={12} className="text-emerald-600" />
                    Últimos Abonos Registrados:
                  </span>
                  {ultimos3AbonosCliente.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      {ultimos3AbonosCliente.length} {ultimos3AbonosCliente.length === 1 ? 'abono reciente' : 'últimos abonos'}
                    </span>
                  )}
                </div>

                {ultimos3AbonosCliente.length > 0 ? (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {ultimos3AbonosCliente.map((a) => (
                      <div
                        key={a.id}
                        className="p-2.5 bg-[var(--muted)]/20 hover:bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl flex items-center justify-between text-xs gap-2 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-emerald-600 text-sm">
                              ${a.montoTotal.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-[var(--muted-foreground)] font-semibold px-1.5 py-0.5 bg-emerald-500/10 rounded">
                              {a.metodo}
                            </span>
                            {(() => {
                              const transRef = (a.notas ? a.notas.replace(/\[REC-[A-Z0-9]+\]/i, '').trim() : '');
                              if (!transRef || transRef.toLowerCase() === 'abono unificado a cuenta') return null;
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-mono text-[9px] font-bold">
                                  Ref/Trans: #{transRef.replace(/^#/, '')}
                                </span>
                              );
                            })()}
                            <span className="text-[10px] text-[var(--muted-foreground)]">
                              {new Date(a.createdAt).toLocaleDateString('es-EC')}
                            </span>
                            {a.reciboRef && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                {a.reciboRef}
                              </span>
                            )}
                            {a.usuarioNombre && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                <User size={10} />
                                <span>Cobrado por: <strong className="font-semibold capitalize">{capitalizarNombreCompleto(a.usuarioNombre)}</strong></span>
                                {a.esCobroOtraSucursal && a.usuarioSucursal && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                    📍 {a.usuarioSucursal}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          {/* Desglose de notas donde se descontó internamente */}
                          <div className="mt-1 flex items-center gap-1 flex-wrap text-[10px]">
                            <span className="text-[var(--muted-foreground)] font-semibold">Descontado en:</span>
                            {a.notasAfectadas.map((na, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 bg-[var(--card)] border border-[var(--border)] rounded font-mono text-[9px] text-[var(--foreground)]"
                              >
                                {na.numeroNota} (${na.monto.toFixed(2)})
                              </span>
                            ))}
                          </div>

                          {a.notas && (
                            <p className="text-[9px] text-[var(--muted-foreground)] italic mt-0.5 truncate">
                              {a.notas}
                            </p>
                          )}
                        </div>

                        {/* Botones de acción individual por abono: Descargar PDF y Enviar WhatsApp */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const dataAbono = armarDatosComprobanteAbono(carteraSeleccionada, {
                                monto: a.montoTotal,
                                metodo: a.metodo,
                                fecha: new Date(a.createdAt).toLocaleDateString('es-EC'),
                                notas: a.notas,
                                numeroNota: a.reciboRef || (a.notasAfectadas.length > 0 ? a.notasAfectadas.map((n) => n.numeroNota).join(', ') : 'Abono unificado'),
                                usuarioNombre: a.usuarioNombre,
                                sucursalNombre: a.usuarioSucursal,
                              });
                              descargarComprobanteAbonoPdf(dataAbono);
                              showToast('Comprobante de abono PDF descargado.', 'success');
                            }}
                            className="p-1.5 rounded-lg bg-[var(--card)] hover:bg-emerald-500/10 text-emerald-600 border border-[var(--border)] hover:border-emerald-500/30 transition-colors cursor-pointer shadow-2xs"
                            title="Descargar Comprobante PDF"
                          >
                            <Download size={13} />
                          </button>

                          {(carteraSeleccionada.clienteTelefono || carteraSeleccionada.clienteEmail) && (
                            <button
                              type="button"
                              onClick={() => {
                                handleEnviarComprobanteAbono(
                                  carteraSeleccionada,
                                  {
                                    monto: a.montoTotal,
                                    metodo: a.metodo,
                                    fecha: new Date(a.createdAt).toLocaleDateString('es-EC'),
                                    notas: a.notas,
                                    numeroNota: a.reciboRef || (a.notasAfectadas.length > 0 ? a.notasAfectadas.map((n) => n.numeroNota).join(', ') : 'Abono unificado'),
                                    usuarioNombre: a.usuarioNombre,
                                    sucursalNombre: a.usuarioSucursal,
                                  },
                                  formatoEnvioAbono
                                );
                              }}
                              className="p-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                              title="Enviar Comprobante por WhatsApp y Correo Electrónico"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--muted-foreground)] italic p-3 bg-[var(--muted)]/10 rounded-xl border border-dashed border-[var(--border)]">
                    No registra abonos previos en la cuenta del cliente.
                  </p>
                )}
              </div>

              {/* 4. Notas de Venta y Calzado Entregado (debajo de los abonos registrados) */}
              <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div>
                    <span className="text-[11px] font-bold text-[var(--foreground)] block flex items-center gap-1.5">
                      <FileText size={13} className="text-[#0F172A]" />
                      Notas de Venta y Calzado Entregado:
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      El saldo de cada nota se descuenta internamente en orden cronológico (FIFO).
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)]">
                    {carteraSeleccionada.cobros.length} {carteraSeleccionada.cobros.length === 1 ? 'nota registrada' : 'notas registradas'}
                  </span>
                </div>

                {/* Badge Saldo a Favor del Cliente */}
                {carteraSeleccionada.saldoAFavorCliente > 0 && (
                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💰</span>
                      <div>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">Saldo a Favor del Cliente</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-300">
                          ${carteraSeleccionada.saldoAFavorCliente.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!cobroSeleccionado || Number(cobroSeleccionado.saldoPendiente) <= 0) {
                          showToast('Selecciona una nota con saldo pendiente para aplicar el credito.', 'warning');
                          return;
                        }
                        try {
                          const res = await ApiService.post('/devoluciones/aplicar-saldo-cliente', {
                            clientId: carteraSeleccionada.clientId,
                            cobroId: cobroSeleccionado.id,
                          });
                          showToast(`Paso aplicado: $${Number(res.montoAplicado || 0).toFixed(2)} descontados. Saldo restante: $${Number(res.saldoRestanteCliente || 0).toFixed(2)}`, 'success');
                          await loadCobros();
                        } catch (err: any) {
                          showToast(err.message || 'Error al aplicar saldo a favor.', 'error');
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl transition-all shadow-sm"
                    >
                      Hacer Paso
                    </button>
                  </div>
                )}

                {/* Notice Banner de Cobro Cruzado Inter-Sucursal */}
                {cobroSeleccionado && activeSucursalId && cobroSeleccionado.tenantId && cobroSeleccionado.tenantId !== activeSucursalId && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs shadow-2xs">
                    <div className="p-2 bg-amber-500/20 rounded-xl text-amber-600 shrink-0">
                      <Building size={18} />
                    </div>
                    <div>
                      <span className="font-extrabold text-xs block text-amber-900 dark:text-amber-200">
                        Aviso de Cobro Cruzado Inter-Sucursal
                      </span>
                      <p className="text-[11px] leading-relaxed mt-0.5 opacity-90">
                        📍 <strong>Abono recibido en:</strong> {sucursales?.find((s) => s.id === activeSucursalId)?.name || 'Tu caja actual'} ➔ <strong>Aplicado a deuda de:</strong> {cobroSeleccionado.sucursalNombre || 'Otra Sucursal'}.
                      </p>
                    </div>
                  </div>
                )}

                {/* Componente Unificado de Nota Activa y Selector Acordeón */}
                {cobroSeleccionado && (
                  <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--card)] shadow-xs">
                    {/* Tarjeta Principal de la Nota Activa (Auto-seleccionada / Clic para desplegar artículos) */}
                    <div 
                      onClick={() => setDetalleNotaModalAbierto(!detalleNotaModalAbierto)}
                      className="p-3.5 bg-emerald-500/5 hover:bg-emerald-500/10 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20 shrink-0">
                          <FileText size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-[var(--foreground)]">
                              {cobroSeleccionado.saleNote?.numero
                                ? `Nota #${String(cobroSeleccionado.saleNote.numero).padStart(4, '0')}`
                                : `#${cobroSeleccionado.id.slice(0, 8).toUpperCase()}`}
                            </span>
                            {cobroSeleccionado.id === notaMasAntiguaPendiente?.id ? (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded text-[9px] font-bold">
                                Nota Más Antigua (Por orden de llegada)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded text-[9px] font-bold">
                                Nota Seleccionada
                              </span>
                            )}
                            {(() => {
                              const ordId = cobroSeleccionado.orderId || cobroSeleccionado.saleNote?.orderId;
                              const ordCod = cobroSeleccionado.orderCodigo || cobroSeleccionado.saleNote?.orderCodigo || (ordId ? `PED-${ordId.slice(0, 4).toUpperCase()}` : null);
                              if (!ordCod) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCuentaModal(false);
                                    if (ordId && onNavigateToPedido) {
                                      onNavigateToPedido(ordId, cobroSeleccionado.tenantId);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-300 text-[9px] font-black border border-indigo-500/30 transition-all cursor-pointer shadow-2xs"
                                  title={`Ver pedido ${ordCod} en la sección de Pedidos`}
                                >
                                  <Package size={10} />
                                  <span>Ver Pedido #${ordCod}</span>
                                  <ExternalLink size={9} />
                                </button>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetalleNotaModalAbierto(!detalleNotaModalAbierto);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 text-[9px] font-extrabold border border-emerald-500/30 transition-colors"
                            >
                              <Eye size={10} />
                              <span>{detalleNotaModalAbierto ? 'Ocultar Artículos' : 'Ver Artículos'}</span>
                              {detalleNotaModalAbierto ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                          </div>
                          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>Monto Original: <strong>${Number(cobroSeleccionado.montoOriginal ?? cobroSeleccionado.montoTotal ?? 0).toFixed(2)}</strong> ({cobroSeleccionado.tipo || 'Crédito'})</span>
                            {cobroSeleccionado.vendedorNombre && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                <User size={10} />
                                <span>Vendedor: {cobroSeleccionado.vendedorNombre}</span>
                              </span>
                            )}
                            {cobroSeleccionado.sucursalNombre && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <Building size={10} />
                                <span>Sucursal: {cobroSeleccionado.sucursalNombre}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right mr-1">
                          <span className="text-[9px] text-[var(--muted-foreground)] block font-semibold uppercase">Saldo:</span>
                          <span className="text-sm font-black text-red-500">
                            ${Number(cobroSeleccionado.saldoPendiente).toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAbrirCambiarTipo(cobroSeleccionado)}
                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 font-bold rounded-lg transition-colors border border-blue-500/20 flex items-center gap-1 text-[10px] cursor-pointer"
                          title={cobroSeleccionado.tipo === 'CONTADO' ? 'Convertir esta nota de contado a crédito' : 'Convertir esta nota a crédito a contado'}
                        >
                          {cobroSeleccionado.tipo === 'CONTADO' ? <CreditCard size={11} /> : <DollarSign size={11} />}
                          <span>{cobroSeleccionado.tipo === 'CONTADO' ? 'Pasar a Crédito' : 'Pasar a Contado'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowCuentaModal(false);
                            handleAbrirFacturacion(carteraSeleccionada, cobroSeleccionado);
                          }}
                          className="px-2.5 py-1 bg-[#0F172A]/10 hover:bg-[#0F172A] hover:text-white text-[#0F172A] font-bold rounded-lg transition-colors border border-[#0F172A]/20 flex items-center gap-1 text-[10px] cursor-pointer"
                          title="Emitir factura electrónica para esta nota"
                        >
                          <Receipt size={11} />
                          <span>Facturar</span>
                        </button>
                      </div>
                    </div>

                    {/* Detalle Desplegable de Logística y Artículos de la Nota Activa */}
                    {detalleNotaModalAbierto && (
                      <div className="p-3 bg-[var(--muted)]/15 border-b border-[var(--border)] space-y-2.5 animate-in fade-in duration-200">
                        {/* Logística de Entrega */}
                        <div className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-[var(--foreground)] flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                              <Truck size={14} />
                            </div>
                            <div>
                              <span className="font-extrabold text-[11px] block text-[var(--foreground)]">
                                Logística: {cobroSeleccionado.tipoEntrega === 'ENVIO' ? '🚚 Envío a Domicilio / Courier' : '🏪 Entrega Presencial en Local'}
                              </span>
                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                {cobroSeleccionado.tipoEntrega === 'ENVIO'
                                  ? `${cobroSeleccionado.courier || 'Transporte'}${cobroSeleccionado.guiaEnvio ? ` · Guía: ${cobroSeleccionado.guiaEnvio}` : ''}${cobroSeleccionado.ciudadEnvio ? ` · Destino: ${cobroSeleccionado.ciudadEnvio}` : ''}${cobroSeleccionado.direccionEnvio ? ` (${cobroSeleccionado.direccionEnvio})` : ''}`
                                  : 'El cliente retiró directamente en el mostrador del local comercial.'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Header de Artículos Solicitados */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-[var(--foreground)] flex items-center gap-1.5">
                              <Package size={13} className="text-[#0F172A]" />
                              <span>
                                Detalle de Artículos — {cobroSeleccionado.saleNote?.numero
                                  ? `Nota #${String(cobroSeleccionado.saleNote.numero).padStart(4, '0')}`
                                  : cobroSeleccionado.numeroCobro || ''}
                              </span>
                            </span>
                            {cobroSeleccionado.vendedorNombre && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[10px] font-semibold">
                                <User size={10} />
                                <span>Vendedor: {cobroSeleccionado.vendedorNombre}</span>
                              </span>
                            )}
                          </div>

                          {/* Botón directo para iniciar devolución si lo requiere */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowCuentaModal(false);
                              handleAbrirDevolucion(carteraSeleccionada);
                            }}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/30 transition-colors flex items-center gap-1"
                            title="Hacer devolución de calzado por fallas o cambio de talla"
                          >
                            <ArrowDownRight size={11} />
                            <span>Hacer Devolución</span>
                          </button>
                        </div>

                        {/* Tarjetas agrupadas por modelo con fotos y pastillas de tallas */}
                        {(() => {
                          const grupos = agruparLineasPorModelo(cobroSeleccionado.lines || [], catalogoProductos);
                          if (grupos.length === 0) {
                            return (
                              <div className="p-3 bg-[var(--card)] rounded-xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--muted-foreground)] italic">
                                No hay artículos detallados registrados para esta nota.
                              </div>
                            );
                          }

                          return (
                            <div className={`grid gap-3 ${grupos.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
                              {grupos.map((g) => {
                                const serieTexto = getNombreSerie(g.serieNombre, g.tallas);
                                return (
                                  <div
                                    key={g.key}
                                    className="p-3.5 sm:p-4 bg-[var(--card)] dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-start gap-3.5 sm:gap-4 shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition-all w-full"
                                  >
                                    {/* Miniatura del calzado */}
                                    <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                                      {g.imageUrl ? (
                                        <img src={g.imageUrl} alt={g.modelName} className="w-full h-full object-cover" />
                                      ) : (
                                        <Package className="text-slate-400" size={28} />
                                      )}
                                    </div>

                                    {/* Detalle del modelo y pastillas de tallas */}
                                    <div className="flex-1 min-w-0">
                                      {/* Fila 1: Nombre del Modelo + Badge de Volumen */}
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 block mb-0.5">
                                            Modelo
                                          </span>
                                          <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-snug break-words">
                                            {g.modelName}
                                          </h4>
                                        </div>

                                        {/* Badge de Volumen */}
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                                          g.totalPares >= 6
                                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                        }`}>
                                          {g.etiquetaVolumen}
                                        </span>
                                      </div>

                                      {/* Fila 2: Serie y Color destacados */}
                                      <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-700 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/30">
                                          <span>Serie:</span>
                                          <span>{serieTexto}</span>
                                        </span>
                                        {g.color && (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                            🎨 {g.color}
                                          </span>
                                        )}
                                      </div>

                                      {/* Fila 3: Pastillas de tallas estilo inventario */}
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        {g.tallas.map((t) => (
                                          <span
                                            key={t.numero}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-rose-200/90 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[10px] font-black"
                                          >
                                            <span>T{t.numero}:</span>
                                            <span className="font-black text-rose-900 dark:text-rose-100">{t.cantidad}</span>
                                          </span>
                                        ))}
                                      </div>

                                      {/* Fila 4: Subtotal del modelo */}
                                      <div className="mt-2.5 pt-1.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                                        <span className="text-slate-500 dark:text-slate-400 font-semibold">
                                          ${g.precioUnitario.toFixed(2)} c/u
                                        </span>
                                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                                          Total: ${g.subtotal.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Toggle para cambiar a otra nota si el cliente tiene más de 1 nota */}
                    {carteraSeleccionada.cobros.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setAcordeonNotasAbierto(!acordeonNotasAbierto)}
                          className="w-full px-3.5 py-2 flex items-center justify-between bg-[var(--muted)]/20 hover:bg-[var(--muted)]/40 text-left transition-colors cursor-pointer"
                        >
                          <span className="text-[11px] font-bold text-[var(--muted-foreground)] flex items-center gap-1.5">
                            <Layers size={12} />
                            <span>{acordeonNotasAbierto ? 'Ocultar lista de notas' : `Cambiar nota (${carteraSeleccionada.cobros.length} notas disponibles)`}</span>
                          </span>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#0F172A]">
                            <span>{acordeonNotasAbierto ? 'Cerrar' : 'Ver todas'}</span>
                            {acordeonNotasAbierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </div>
                        </button>

                        {acordeonNotasAbierto && (
                          <div className="p-2.5 space-y-1.5 border-t border-[var(--border)] max-h-44 overflow-y-auto pr-1 bg-[var(--card)] animate-in fade-in">
                            {carteraSeleccionada.cobros.map((cobroItem) => {
                              const cCfg = getCobroConfig(cobroItem.estado);
                              const numNota = cobroItem.saleNote?.numero
                                ? `NOTA #${String(cobroItem.saleNote.numero).padStart(4, '0')}`
                                : cobroItem.numeroCobro || `#${cobroItem.id.slice(0, 8).toUpperCase()}`;
                              const montoOrig = Number(cobroItem.montoOriginal ?? cobroItem.montoTotal ?? 0);
                              const isActive = cobroSeleccionadoId === cobroItem.id;

                              return (
                                <button
                                  key={cobroItem.id}
                                  type="button"
                                  onClick={() => {
                                    setCobroSeleccionadoId(cobroItem.id);
                                    setAcordeonNotasAbierto(false);
                                  }}
                                  className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/20'
                                      : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText size={13} className={isActive ? 'text-emerald-600' : 'text-[var(--muted-foreground)]'} />
                                    <div>
                                      <div className="font-bold text-[11px] text-[var(--foreground)] flex items-center gap-1.5">
                                        <span>{numNota}</span>
                                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${cCfg.color}`}>{cCfg.label}</span>
                                        {isActive && (
                                          <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[8px] font-extrabold uppercase">
                                            Activa
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[9px] text-[var(--muted-foreground)]">
                                        {cobroItem.tipo || 'Crédito'} — {new Date(cobroItem.createdAt).toLocaleDateString('es-EC')}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="text-[9px] text-[var(--muted-foreground)]">${montoOrig.toFixed(2)}</div>
                                    <div className={`text-[10px] font-black ${Number(cobroItem.saldoPendiente) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                      ${Number(cobroItem.saldoPendiente).toFixed(2)}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer del Modal (Estático al final del modal) ── */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 flex flex-col gap-2 shrink-0">
              {/* Botón de Confirmación del Abono (estático en el footer) */}
              {carteraSeleccionada && Number(carteraSeleccionada.saldoTotalPendiente) > 0 && (
                <button
                  onClick={handleSolicitarConfirmacionAbono}
                  disabled={savingAbono || !montoAbono || !online}
                  className={`w-full py-3 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer ${
                    metodoAbono === 'DESCUENTO_COMERCIAL'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-amber-500/20'
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-emerald-500/20'
                  }`}
                >
                  {savingAbono ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  <span>
                    {savingAbono
                      ? 'Procesando...'
                      : (metodoAbono === 'DESCUENTO_COMERCIAL' ? 'Aplicar Descuento a la Deuda' : 'Confirmar Abono')}
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowCuentaModal(false);
                  handleAbrirHistorial(carteraSeleccionada.clientId);
                }}
                className="w-full py-2 bg-[#0F172A]/10 hover:bg-[#0F172A]/20 text-[#0F172A] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-[#0F172A]/20 cursor-pointer"
              >
                <History size={14} />
                <span>Ver Historial Completo del Cliente</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCuentaModal(false);
                    handleAbrirDevolucion(carteraSeleccionada);
                  }}
                  className="flex-1 py-2 text-rose-500 hover:bg-rose-500/10 font-semibold text-[11px] rounded-xl transition-colors flex items-center justify-center gap-1 border border-rose-500/20 cursor-pointer"
                >
                  <AlertTriangle size={12} />
                  <span>Registrar Devolución</span>
                </button>
                <button
                  onClick={() => setShowCuentaModal(false)}
                  className="flex-1 py-2 bg-[var(--muted)] text-[var(--foreground)] font-semibold text-[11px] rounded-xl transition-colors hover:bg-[var(--muted)]/80 border border-[var(--border)] cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmación de Abono (Web y Móvil) ── */}
      {showConfirmAbonoModal && carteraSeleccionada && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !savingAbono) setShowConfirmAbonoModal(false);
          }}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="p-5 border-b border-[var(--border)] bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckCircle size={20} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-extrabold text-base text-[var(--foreground)] tracking-tight">
                  Confirmar Registro de Abono
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5 leading-relaxed">
                  Verifique los detalles antes de registrar la transacción
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!savingAbono) setShowConfirmAbonoModal(false);
                }}
                className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 space-y-4">
              {/* Tarjeta destacada con el valor */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                  Valor a Abonar
                </span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5 block font-mono">
                  ${parseFloat(montoAbono || '0').toFixed(2)}
                </span>
                <span className="text-[11px] text-[var(--muted-foreground)] mt-1 block font-medium">
                  Método:{' '}
                  {metodoAbono === 'DESCUENTO_COMERCIAL'
                    ? 'Descuento Comercial'
                    : capitalizarNombreCompleto(metodoAbono.replace(/_/g, ' '))}
                </span>
              </div>

              {/* Pregunta clara y formal */}
              <p className="text-xs text-[var(--foreground)] leading-relaxed">
                ¿Está seguro de que desea registrar un abono por{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                  ${parseFloat(montoAbono || '0').toFixed(2)}
                </strong>{' '}
                a la cuenta comercial del cliente{' '}
                <strong className="text-[var(--foreground)] font-extrabold">
                  {carteraSeleccionada.clienteNombre}
                </strong>?
              </p>

              {/* Detalle informativo de saldos */}
              <div className="p-3 bg-[var(--muted)]/20 rounded-xl border border-[var(--border)] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[var(--muted-foreground)]">
                  <span>Saldo adeudado actual:</span>
                  <span className="font-bold text-[var(--foreground)] font-mono">
                    ${Number(carteraSeleccionada.saldoTotalPendiente).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 font-bold">
                  <span className="text-[var(--foreground)]">Saldo restante tras el abono:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono">
                    ${Math.max(0, Number(carteraSeleccionada.saldoTotalPendiente) - (parseFloat(montoAbono) || 0)).toFixed(2)}
                  </span>
                </div>
                {notasAbono.trim() && (
                  <div className="border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted-foreground)] flex items-start gap-1">
                    <span className="font-semibold text-[var(--foreground)] shrink-0">Nota:</span>
                    <span className="italic truncate">{notasAbono.trim()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción (responsivos: mobile apilados / desktop en fila) */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmAbonoModal(false)}
                disabled={savingAbono}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer text-center"
              >
                No, Corregir Monto
              </button>
              <button
                type="button"
                onClick={handleRegistrarAbono}
                disabled={savingAbono}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all shadow-md bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingAbono ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    <span>Sí, Confirmar Abono</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: HISTORIAL COMPLETO DE CLIENTE (Compras, Abonos, Pagos) */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showHistorialModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowHistorialModal(false); }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowHistorialModal(false); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-4xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 border-b border-[var(--border)] bg-[#0F172A] text-white shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 sm:p-2.5 bg-white/10 rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
                    <History size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                      Historial Comercial y Financiero
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                      Detalle cronológico de compras, notas de venta y abonos del cliente
                    </p>
                  </div>
                </div>

                {/* Acciones en escritorio y botón de cierre */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowHistorialModal(false);
                        setShowCuentaModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 shadow-sm"
                      title="Volver a la gestión de cobro"
                    >
                      <ArrowLeft size={14} />
                      <span>Volver a Cobros</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAbrirCompartirHistorial}
                      disabled={loadingHistorial || !historialCliente}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      title="Compartir extracto de historial en PDF, WhatsApp o Correo"
                    >
                      <Share2 size={14} />
                      <span>Compartir Historial</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowHistorialModal(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Cerrar ventana"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Botonera inferior adaptada para dispositivos móviles */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 sm:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setShowHistorialModal(false);
                    setShowCuentaModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10 active:scale-95"
                  title="Volver a la gestión de cobro"
                >
                  <ArrowLeft size={14} />
                  <span>Volver a Cobros</span>
                </button>
                <button
                  type="button"
                  onClick={handleAbrirCompartirHistorial}
                  disabled={loadingHistorial || !historialCliente}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
                  title="Compartir extracto de historial en PDF, WhatsApp o Correo"
                >
                  <Share2 size={14} />
                  <span>Compartir</span>
                </button>
              </div>
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
                    <div className="flex gap-1 flex-wrap">
                      {(['TODOS', 'COMPRAS', 'ABONOS', 'DEVOLUCIONES'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFiltroHistorial(f)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            filtroHistorial === f
                              ? 'bg-[#0F172A] text-white shadow-xs'
                              : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                          }`}
                        >
                          {f === 'TODOS' ? 'Todos' : f === 'COMPRAS' ? 'Compras / Pedidos' : f === 'ABONOS' ? 'Abonos' : 'Devoluciones'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {historialCliente.movimientos
                      .filter((m) => {
                        if (filtroHistorial === 'COMPRAS') return m.tipo === 'COMPRA_PEDIDO';
                        if (filtroHistorial === 'ABONOS') return m.tipo === 'ABONO';
                        if (filtroHistorial === 'DEVOLUCIONES') return m.tipo === 'DEVOLUCION';
                        return true;
                      })
                      .map((m) => {
                        const isAbono = m.tipo === 'ABONO';
                        const isPedido = m.tipo === 'COMPRA_PEDIDO';
                        const isDevolucion = m.tipo === 'DEVOLUCION';
                        const canExpand = isPedido || isDevolucion;
                        const isExpanded = canExpand && (pedidoHistorialExpandidoId === m.id);
                        const lineas = m.detalles?.lineas || [];

                        return (
                          <div
                            key={m.id}
                            className={`p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-xl transition-all shadow-xs ${
                              canExpand ? 'cursor-pointer hover:border-[#0F172A]/40' : ''
                            } ${isExpanded ? 'ring-2 ring-[#0F172A]/10 border-[#0F172A]/30' : ''}`}
                            onClick={() => {
                              if (canExpand) {
                                setPedidoHistorialExpandidoId(isExpanded ? null : m.id);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                {isPedido ? (
                                  <div className="p-2 rounded-xl mt-0.5 bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </div>
                                ) : isDevolucion ? (
                                  <div className="p-2 rounded-xl mt-0.5 bg-rose-500/10 text-rose-600 flex items-center justify-center">
                                    {isExpanded ? <ChevronUp size={16} /> : <RotateCcw size={16} />}
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-xl mt-0.5 bg-emerald-500/10 text-emerald-600">
                                    <ArrowDownRight size={16} />
                                  </div>
                                )}

                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-xs text-[var(--foreground)]">{m.titulo}</span>
                                    <span className="font-semibold text-xs text-[var(--muted-foreground)]">
                                      {historialCliente.cliente.nombre}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[var(--muted-foreground)]">{m.descripcion}</div>
                                  {(m as any).esProntoPago24h && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30 mt-0.5">
                                      ⚡ Contado (Pronto pago 24h)
                                    </span>
                                  )}

                                  {/* Responsables: Cobrado por / Vendedor / Entregado por / Procesado por */}
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {/* Cobrado por (para abonos) */}
                                    {isAbono && m.cobradoPor && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                                        title={`Cobrado por ${m.cobradoPor}${m.cobradoPorRol ? ` (${m.cobradoPorRol})` : ''}${m.cobradoPorSucursal ? ` — ${m.cobradoPorSucursal}` : ''}`}
                                      >
                                        <UserCheck size={10} className="shrink-0" />
                                        <span>Cobrado por: {m.cobradoPor}</span>
                                        {m.esCobroOtraSucursal && (
                                          <span className="text-[9px] px-1 py-0 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 ml-0.5">
                                            Otra sucursal
                                          </span>
                                        )}
                                      </span>
                                    )}

                                    {/* Vendedor (para pedidos/compras) */}
                                    {isPedido && m.vendedorNombre && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20"
                                        title={`Vendido por ${m.vendedorNombre}${m.vendedorRol ? ` (${m.vendedorRol})` : ''}`}
                                      >
                                        <User size={10} className="shrink-0" />
                                        <span>Vendedor: {m.vendedorNombre}</span>
                                      </span>
                                    )}

                                    {/* Entregado por (para pedidos que ya fueron despachados) */}
                                    {isPedido && m.entregadoPor && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
                                        title={`Entregado por ${m.entregadoPor}${m.entregadoPorRol ? ` (${m.entregadoPorRol})` : ''}${m.fechaEntrega ? ` el ${new Date(m.fechaEntrega).toLocaleString('es-EC')}` : ''}`}
                                      >
                                        <Truck size={10} className="shrink-0" />
                                        <span>Entregado por: {m.entregadoPor}</span>
                                      </span>
                                    )}

                                    {/* Recibido por (para devoluciones) */}
                                    {isDevolucion && m.procesadoPor && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20"
                                        title={`Recibido por ${m.procesadoPor}${m.procesadoPorRol ? ` (${m.procesadoPorRol})` : ''}`}
                                      >
                                        <UserCheck size={10} className="shrink-0" />
                                        <span>Recibido por: {m.procesadoPor}</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5 mt-1">
                                    <Calendar size={11} />
                                    <span>{new Date(m.fecha).toLocaleString('es-EC')}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div
                                  className={`text-xs font-black ${
                                    isAbono
                                      ? 'text-emerald-600'
                                      : isDevolucion
                                      ? 'text-rose-600'
                                      : 'text-blue-600'
                                  }`}
                                >
                                  {isAbono || isDevolucion ? `− ${m.monto.toFixed(2)}` : `+ ${m.monto.toFixed(2)}`}
                                </div>
                                {m.metodo && (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-bold border border-emerald-500/20 inline-block mt-0.5">
                                    {m.metodo}
                                  </span>
                                )}
                                {(() => {
                                  const transRef = m.comprobante || m.referencia || m.numeroTransaccion || (m.notas ? m.notas.replace(/\[REC-[A-Z0-9]+\]/i, '').trim() : '');
                                  if (!transRef || transRef.toLowerCase() === 'abono unificado a cuenta') return null;
                                  return (
                                    <div className="text-[10px] font-mono text-[var(--foreground)] mt-0.5 font-bold flex items-center justify-end gap-1">
                                      <span className="text-[var(--muted-foreground)] font-sans font-normal text-[9px]">Trans/Ref:</span>
                                      <span className="text-emerald-700 dark:text-emerald-400">#{transRef.replace(/^#/, '')}</span>
                                    </div>
                                  );
                                })()}
                                {isDevolucion && (
                                  <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded text-[9px] font-bold border border-rose-500/20 inline-block mt-0.5">
                                    DEVOLUCIÓN
                                  </span>
                                )}

                                {/* Trazabilidad Contable Rigurosa: Saldo Anterior y Nuevo Saldo */}
                                {m.saldoAnterior !== undefined && (
                                  <div className="mt-1.5 pt-1.5 border-t border-[var(--border)]/60 flex flex-col items-end gap-0.5 text-[10px]">
                                    <div className="text-[var(--muted-foreground)]">
                                      Saldo Anterior: <span className="font-semibold text-[var(--foreground)]">${Number(m.saldoAnterior).toFixed(2)}</span>
                                    </div>
                                    <div className="text-[var(--muted-foreground)]">
                                      Nuevo Saldo: <span className={`font-bold ${Number(m.nuevoSaldo) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>${Number(m.nuevoSaldo).toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Botones para generar PDF y WhatsApp en el historial */}
                                {isAbono && carteraSeleccionada && (
                                  <div className="flex items-center justify-end gap-1 mt-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const dataAbono = armarDatosComprobanteAbono(carteraSeleccionada, {
                                          monto: Number(m.monto),
                                          metodo: m.metodo || 'EFECTIVO',
                                          fecha: new Date(m.fecha).toLocaleDateString('es-EC'),
                                          notas: m.descripcion,
                                        });
                                        descargarComprobanteAbonoPdf(dataAbono);
                                        showToast('Comprobante PDF descargado.', 'success');
                                      }}
                                      className="p-1 rounded bg-[var(--muted)]/40 hover:bg-emerald-500/10 text-emerald-600 border border-[var(--border)] text-[9px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                      title="Descargar Comprobante PDF"
                                    >
                                      <Download size={11} />
                                      <span>PDF</span>
                                    </button>

                                    {carteraSeleccionada.clienteTelefono && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEnviarComprobanteAbono(
                                            carteraSeleccionada,
                                            {
                                              monto: Number(m.monto),
                                              metodo: m.metodo || 'EFECTIVO',
                                              fecha: new Date(m.fecha).toLocaleDateString('es-EC'),
                                              notas: m.descripcion,
                                            },
                                            formatoEnvioAbono
                                          );
                                        }}
                                        className="p-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
                                        title={`Enviar Comprobante por WhatsApp (${formatoEnvioAbono})`}
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Desglose Expandible de Artículos Solicitados */}
                            {isExpanded && (
                              <div className="mt-3.5 pt-3 border-t border-[var(--border)] space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-[11px] text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                                    📦 DETALLE DE ARTÍCULOS SOLICITADOS — {m.numeroCodigo || m.titulo}
                                  </span>
                                  <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">
                                    {lineas.length} {lineas.length === 1 ? 'ítem' : 'ítems'}
                                  </span>
                                </div>

                                {lineas.length > 0 ? (
                                  <div className="space-y-2">
                                    {(() => {
                                      // Agrupar líneas por producto
                                      const grupos: { [key: string]: any[] } = {};
                                      lineas.forEach((l: any) => {
                                        const key = `${l.productId}_${l.tipoVenta || 'GENERAL'}`;
                                        if (!grupos[key]) grupos[key] = [];
                                        grupos[key].push(l);
                                      });

                                      return Object.entries(grupos).map(([key, items]) => {
                                        const item = items[0];
                                        const totalPares = items.reduce((s: number, it: any) => s + it.cantidad, 0);

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
                                                  {item.modelName} ({item.color})
                                                </div>
                                                <div className="text-[10px] text-[var(--muted-foreground)] font-medium">
                                                  Serie: {item.serieNombre || 'Estándar'}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                  {items.map((l: any, idx: number) => (
                                                    <span
                                                      key={idx}
                                                      className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-md text-[10px] font-bold"
                                                    >
                                                      T{l.numeroTalla}: {l.cantidad}
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
                                                ${(totalPares * Number(item.precioUnitario || 0)).toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[var(--muted-foreground)] italic text-center py-2">
                                    No hay detalle de artículos registrado para este pedido.
                                  </p>
                                )}
                              </div>
                            )}
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

            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHistorialModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#0F172A] text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer min-h-[42px] flex items-center justify-center"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Devolución de Cliente Mejorado Multimodelo */}
      {showDevolucionModal && carteraSeleccionada && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowDevolucionModal(false), isDirtyDevolucion()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowDevolucionModal(false), isDirtyDevolucion()); }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-4xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="p-4 sm:p-6 pr-32 sm:pr-40 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-rose-500/20 rounded-2xl border border-rose-500/30 text-rose-400 font-bold shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Registro de Devolución de Calzado
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    Cliente: <strong className="text-white capitalize">{capitalizarNombreCompleto(carteraSeleccionada.clienteNombre)}</strong> (C.I: {carteraSeleccionada.clienteCedula})
                  </p>
                </div>
              </div>
              <div className="absolute top-4 sm:top-5 right-4 sm:right-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDevolucionModal(false);
                    setShowCuentaModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
                  title="Volver a la gestión de cobro"
                >
                  <ArrowLeft size={14} />
                  <span className="hidden sm:inline">Volver a Cobros</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDevolucionModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar ventana"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Formulario */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Tarjeta de Sugerencia Comercial / Descuento de Retención */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    💡 ¿Deseas ofrecer un Descuento de Retención?
                  </span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400">
                    Aplica una rebaja comercial sobre la deuda del cliente para que conserve el calzado y evitar el reingreso físico a bodega.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDevolucionModal(false);
                    setMetodoAbono('DESCUENTO_COMERCIAL');
                    setNotasAbono('Descuento de retención acordado para evitar devolución de calzado');
                    setShowCuentaModal(true);
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  🎁 Aplicar Descuento
                </button>
              </div>

              {/* 1. Selector de Modelos VENDIDOS A ESTE CLIENTE */}
              <div className="space-y-2 p-3.5 bg-[var(--muted)]/15 border border-[var(--border)] rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-[var(--foreground)] flex items-center gap-1.5">
                    <span>1. Seleccionar Modelo Comprado por el Cliente</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {productosVendidosCliente.length} modelos comprados
                  </span>
                </div>

                {/* Buscador de modelos vendidos */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type="text"
                    placeholder="Buscar entre los modelos comprados por el cliente..."
                    value={busquedaModeloDevolucion}
                    onChange={(e) => setBusquedaModeloDevolucion(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                  />
                  {busquedaModeloDevolucion && (
                    <button
                      onClick={() => setBusquedaModeloDevolucion('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Lista seleccionable de modelos vendidos */}
                {loadingProductosVendidos ? (
                  <div className="p-4 text-center text-xs text-[var(--muted-foreground)] flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin text-[#0F172A]" />
                    <span>Cargando productos comprados por el cliente...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                    {productosVendidosCliente
                      .filter((p) => {
                        const q = busquedaModeloDevolucion.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          (p.modelName && p.modelName.toLowerCase().includes(q)) ||
                          (p.color && p.color.toLowerCase().includes(q)) ||
                          (p.serieNombre && p.serieNombre.toLowerCase().includes(q))
                        );
                      })
                      .map((p, idx) => {
                        const isSelected = productoSeleccionadoDevolucionObj?.id === p.id;
                        return (
                          <button
                            key={p.id ? `prod-dev-${p.id}` : `prod-dev-idx-${idx}`}
                            type="button"
                            onClick={() => handleSeleccionarProductoDevolucion(p)}
                            className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xs ring-2 ring-emerald-500/20'
                                : 'bg-[var(--card)] border-[var(--border)] hover:border-[#0F172A]/40'
                            }`}
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="w-9 h-9 object-cover rounded-lg border border-[var(--border)] shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center text-sm shrink-0">👟</div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-[11px] text-[var(--foreground)] block truncate">{p.modelName}</span>
                              <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                                Color: <strong className="text-[var(--foreground)]">{p.color}</strong> • {p.serieNombre}
                              </div>
                              <div className="text-[10px] text-emerald-600 font-extrabold mt-0.5">
                                Precio Venta: ${Number(p.precioUnitario || p.salePrice || 0).toFixed(2)}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* 2. Modalidad y Añadir a la Devolución para el modelo seleccionado */}
                {productoSeleccionadoDevolucionObj && (
                  <div className="pt-3 border-t border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-bold text-xs text-[var(--foreground)]">
                        Configurar: <strong className="text-emerald-700">{productoSeleccionadoDevolucionObj.modelName}</strong> ({productoSeleccionadoDevolucionObj.color})
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDevolucionTipo('TALLA_ESPECIFICA');
                            setDevolucionCantidadParesInput('1');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            devolucionTipo === 'TALLA_ESPECIFICA'
                              ? 'bg-[#0F172A] text-white border-transparent'
                              : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)]'
                          }`}
                        >
                          👟 Por Talla
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDevolucionTipo('SERIE_COMPLETA');
                            setDevolucionSubtipoSerie('MEDIA_DOCENA');
                            setDevolucionCantidadSeries(1);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            devolucionTipo === 'SERIE_COMPLETA'
                              ? 'bg-[#0F172A] text-white border-transparent'
                              : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)]'
                          }`}
                        >
                          📦 Por Serie Completa
                        </button>
                      </div>
                    </div>

                    {devolucionTipo === 'SERIE_COMPLETA' ? (
                      <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Selector de tipo de serie */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDevolucionSubtipoSerie('MEDIA_DOCENA')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                devolucionSubtipoSerie === 'MEDIA_DOCENA'
                                  ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[#0F172A]'
                              }`}
                            >
                              ½ Media Docena (6 pares)
                            </button>
                            <button
                              type="button"
                              onClick={() => setDevolucionSubtipoSerie('DOCENA_COMPLETA')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                devolucionSubtipoSerie === 'DOCENA_COMPLETA'
                                  ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[#0F172A]'
                              }`}
                            >
                              1 Docena (12 pares)
                            </button>
                          </div>

                          {/* Cantidad de series con contador +/- */}
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-[var(--muted-foreground)]">Series:</label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDevolucionCantidadSeries(Math.max(1, (devolucionCantidadSeries || 1) - 1))}
                                className="w-7 h-7 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)] cursor-pointer"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={devolucionCantidadSeries || ''}
                                onChange={(e) => setDevolucionCantidadSeries(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-14 h-7 text-center font-bold text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => setDevolucionCantidadSeries((devolucionCantidadSeries || 1) + 1)}
                                className="w-7 h-7 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)] cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                              = { (devolucionSubtipoSerie === 'MEDIA_DOCENA' ? 6 : 12) * (devolucionCantidadSeries || 1) } pares
                            </span>
                          </div>
                        </div>

                        {/* Precio por par y subtotal para serie completa */}
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/60">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-[var(--muted-foreground)]">Precio/par:</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted-foreground)]">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={devolucionPrecioUnitario || ''}
                                onChange={(e) => setDevolucionPrecioUnitario(parseFloat(e.target.value) || 0)}
                                className="w-24 pl-5 pr-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-bold text-right"
                              />
                            </div>
                          </div>
                          <div className="text-xs">
                            <span className="text-[var(--muted-foreground)]">Subtotal serie: </span>
                            <strong className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                              ${(((devolucionSubtipoSerie === 'MEDIA_DOCENA' ? 6 : 12) * (devolucionCantidadSeries || 1)) * (devolucionPrecioUnitario || 0)).toFixed(2)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl space-y-2.5">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase mr-1">Talla:</span>
                          {(productoSeleccionadoDevolucionObj?.tallas || [
                            { id: 't38', numeroTalla: 38 },
                            { id: 't39', numeroTalla: 39 },
                            { id: 't40', numeroTalla: 40 },
                            { id: 't41', numeroTalla: 41 },
                            { id: 't42', numeroTalla: 42 },
                            { id: 't43', numeroTalla: 43 },
                          ]).map((t: any, idx: number) => {
                            const tallaVal = t.id || String(t.numeroTalla || t.numero);
                            const isTallaSelected = (devolucionTallaId === tallaVal || devolucionTallaId === String(t.numeroTalla));
                            return (
                              <button
                                key={t.id ? `talla-btn-${t.id}` : `talla-btn-${t.numeroTalla || t.numero || idx}`}
                                type="button"
                                onClick={() => setDevolucionTallaId(tallaVal)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                  isTallaSelected
                                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:border-[#0F172A]'
                                }`}
                              >
                                T{t.numeroTalla || t.numero}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]/60">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs font-semibold text-[var(--muted-foreground)]">Pares:</label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setDevolucionCantidadParesInput(String(Math.max(1, (parseInt(devolucionCantidadParesInput) || 1) - 1)))}
                                  className="w-6 h-6 rounded border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)] cursor-pointer"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={devolucionCantidadParesInput}
                                  onChange={(e) => setDevolucionCantidadParesInput(e.target.value)}
                                  className="w-14 h-6 text-center font-bold text-xs bg-[var(--card)] border border-[var(--border)] rounded"
                                />
                                <button
                                  type="button"
                                  onClick={() => setDevolucionCantidadParesInput(String((parseInt(devolucionCantidadParesInput) || 1) + 1))}
                                  className="w-6 h-6 rounded border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)] cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs font-semibold text-[var(--muted-foreground)]">Precio/par:</label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted-foreground)]">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={devolucionPrecioUnitario || ''}
                                  onChange={(e) => setDevolucionPrecioUnitario(parseFloat(e.target.value) || 0)}
                                  className="w-20 pl-5 pr-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-bold text-right"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="text-xs">
                            <span className="text-[var(--muted-foreground)]">Subtotal: </span>
                            <strong className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                              ${((parseInt(devolucionCantidadParesInput) || 1) * (devolucionPrecioUnitario || 0)).toFixed(2)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botón Añadir a la Devolución */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAgregarModeloADevolucion}
                        className="px-4 py-2 bg-gradient-to-r from-slate-900 to-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <Plus size={14} className="text-emerald-400" />
                        <span>
                          {devolucionTipo === 'SERIE_COMPLETA' ? 'Añadir Serie Completa a la Devolución' : 'Añadir Talla a la Devolución'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. LISTA DE MODELOS AÑADIDOS A LA DEVOLUCIÓN (Estilo Pedidos Exacto) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} className="text-rose-600" />
                    <span>2. Modelos Añadidos a la Devolución ({lineasDevolucion.length} ítems)</span>
                  </span>
                  {lineasDevolucion.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLineasDevolucion([])}
                      className="text-[11px] text-rose-500 hover:underline font-bold"
                    >
                      Limpiar todos
                    </button>
                  )}
                </div>

                {lineasDevolucion.length === 0 ? (
                  <div className="p-6 bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl text-center space-y-1 text-[var(--muted-foreground)]">
                    <p className="font-bold text-xs text-[var(--foreground)]">Aún no hay modelos añadidos a la devolución</p>
                    <p className="text-[11px]">Selecciona un modelo arriba, configura las tallas o series y pulsa <strong>"Añadir a la Devolución"</strong>.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agruparLineasDevolucion(lineasDevolucion).map((grupo) => {
                      return (
                        <div
                          key={grupo.key}
                          className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-slate-400 transition-all"
                        >
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            {/* Miniatura */}
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                              {grupo.imageUrl ? (
                                <img src={grupo.imageUrl} alt={grupo.modelName} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="text-slate-400" size={24} />
                              )}
                            </div>

                            {/* Detalle y pastillas de tallas interactivas (Estilo exacto Pedidos) */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div>
                                <h4 className="font-extrabold text-sm text-[var(--foreground)] leading-tight">
                                  {grupo.modelName}
                                </h4>
                                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                  {grupo.color} · <span className="font-semibold text-emerald-600 dark:text-emerald-400">Serie: {formatearNombreSerie(grupo.serieNombre || 'ADULTO')}</span>
                                </div>
                              </div>

                              {/* Chips de tallas con contador +/- por cada talla (Estilo exacto Pedidos) */}
                              <div className="flex flex-wrap gap-2 pt-0.5">
                                {grupo.lineas.map((l) => (
                                  <div
                                    key={l.id}
                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white shadow-2xs"
                                  >
                                    <span className="font-extrabold text-xs text-slate-900">T{l.numeroTalla}</span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleCambiarCantidadTallaDevolucion(grupo.productId, l.tallaId, -1)}
                                        className="w-5 h-5 flex items-center justify-center bg-[#FFE4E6] hover:bg-rose-200 text-[#E11D48] rounded text-xs font-black transition-colors cursor-pointer"
                                        title={`Quitar 1 par T${l.numeroTalla}`}
                                      >
                                        −
                                      </button>
                                      <span className="w-4 text-center text-xs font-bold text-slate-900 font-mono">
                                        {l.cantidad}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCambiarCantidadTallaDevolucion(grupo.productId, l.tallaId, 1)}
                                        className="w-5 h-5 flex items-center justify-center bg-[#DCFCE7] hover:bg-emerald-200 text-[#16A34A] rounded text-xs font-black transition-colors cursor-pointer"
                                        title={`Agregar 1 par T${l.numeroTalla}`}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Botones de acción masiva: Media Docena Serie A / B */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAjustarMediaDocenaDevolucion(grupo.productId, grupo.serieNombre || '', 'MEDIA_A', 1)}
                                  className="px-2.5 py-1 bg-[#E6F4EA] hover:bg-emerald-100 text-[#0D9488] border border-[#A7F3D0] rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                >
                                  + ½ Doc A
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAjustarMediaDocenaDevolucion(grupo.productId, grupo.serieNombre || '', 'MEDIA_B', 1)}
                                  className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/20 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                >
                                  + ½ Doc B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAjustarMediaDocenaDevolucion(grupo.productId, grupo.serieNombre || '', 'MEDIA_A', -1)}
                                  className="px-2.5 py-1 bg-[#FFE4E6] hover:bg-rose-100 text-[#E11D48] border border-[#FECDD3] rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                >
                                  − ½ Doc A
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAjustarMediaDocenaDevolucion(grupo.productId, grupo.serieNombre || '', 'MEDIA_B', -1)}
                                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                >
                                  − ½ Doc B
                                </button>
                                <span className="text-xs text-slate-600 font-mono font-medium ml-0.5">
                                  = {grupo.totalPares} pares total
                                </span>
                              </div>

                              {/* Observación por modelo */}
                              {grupo.observacionModelo ? (
                                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 min-w-0">
                                    <span className="font-extrabold text-[10px] uppercase text-amber-700 dark:text-amber-400 shrink-0">📝 Nota:</span>
                                    <span className="truncate text-xs font-medium">{grupo.observacionModelo}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSetObservacionModeloDevolucion(grupo.productId, undefined)}
                                    className="text-xs font-bold text-rose-500 hover:underline shrink-0 cursor-pointer"
                                    title="Eliminar nota"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nota = window.prompt(`Observación para ${grupo.modelName} (ej. falla en costura, cambio por talla):`);
                                      if (nota !== null && nota.trim().length > 0) {
                                        handleSetObservacionModeloDevolucion(grupo.productId, nota.trim());
                                      }
                                    }}
                                    className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>+ Agregar observación a este modelo</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Resumen lateral exacto y botón de eliminar X */}
                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                            <div className="text-right">
                              <div className="text-xs font-extrabold text-[var(--foreground)]">
                                {grupo.totalPares} pares ({grupo.etiquetaVolumen})
                              </div>
                              <div className="text-xs text-[var(--muted-foreground)]">
                                ${grupo.precioUnitario.toFixed(2)} / par
                              </div>
                              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                ${grupo.subtotal.toFixed(2)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleEliminarModeloDevolucion(grupo.productId)}
                              className="w-6 h-6 rounded-full border-2 border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              title="Eliminar este modelo de la devolución"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Destino del Calzado / Clasificación del Stock */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
                  3. Destino del Calzado (Impacto en Stock)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDevolucionDestino('REINGRESO_INVENTARIO')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      devolucionDestino === 'REINGRESO_INVENTARIO'
                        ? 'bg-emerald-600 text-white border-transparent shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-emerald-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span>🔄</span>
                      <span>Reingreso a Bodega</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80 block">Buen estado. Vuelve al stock vendible</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDevolucionDestino('BAJA_POR_FALLA')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      devolucionDestino === 'BAJA_POR_FALLA'
                        ? 'bg-rose-600 text-white border-transparent shadow-xs ring-2 ring-rose-500/20'
                        : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-rose-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span>⚠️</span>
                      <span>Baja por Falla / Merma</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80 block">Calzado defectuoso. No suma a venta</span>
                  </button>
                </div>
              </div>

              {/* 5. Motivo General */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  4. Motivo o Detalle General de la Devolución
                </label>
                <input
                  type="text"
                  placeholder="Ej. Devolución de mercadería por cambio de temporada o defecto de costura..."
                  value={motivoDevolucion}
                  onChange={(e) => setMotivoDevolucion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              {/* Resumen del Impacto y Total a Descontar */}
              {(() => {
                const totalPares = lineasDevolucion.reduce((sum, l) => sum + l.cantidad, 0);
                const totalMonto = lineasDevolucion.reduce((sum, l) => sum + l.subtotal, 0);

                return (
                  <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1.5 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">Total Pares a Devolver:</span>
                      <strong className="text-white">{totalPares} pares ({lineasDevolucion.length} modelos)</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">Destino de Stock:</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-extrabold ${devolucionDestino === 'BAJA_POR_FALLA' ? 'bg-rose-500/30 text-rose-300' : 'bg-emerald-500/30 text-emerald-300'}`}>
                        {devolucionDestino === 'BAJA_POR_FALLA' ? '⚠️ Merma / Baja por Falla' : '📦 Reingreso a Bodega'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-1.5 border-t border-white/10">
                      <span className="font-bold text-rose-400">Total a Descontar de la Deuda del Cliente:</span>
                      <span className="font-black text-rose-400 text-base">
                        -${totalMonto.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex flex-wrap items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowDevolucionModal(false);
                  setShowCuentaModal(true);
                }}
                className="px-4 py-2.5 border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Volver a Cobros</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDevolucionModal(false)}
                className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRegistrarDevolucion}
                disabled={savingDevolucion || lineasDevolucion.length === 0}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[42px]"
                title={lineasDevolucion.length === 0 ? 'Añade al menos un modelo a la devolución primero' : 'Procesar devolución'}
              >
                {savingDevolucion ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                <span>{savingDevolucion ? 'Procesando...' : 'Procesar Devolución'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: FACTURACIÓN ELECTRÓNICA SRI                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showFacturaModal && facturaCliente && carteraSeleccionada && (() => {
        const subtotalCalc = facturaCliente.detalles.reduce(
          (sum, d) => sum + d.cantidad * d.precioUnitario - (d.descuento || 0), 0
        );
        const ivaCalc = facturaCliente.detalles.reduce(
          (sum, d) => sum + ((d.cantidad * d.precioUnitario - (d.descuento || 0)) * d.tarifaIva) / 100, 0
        );
        const totalCalc = subtotalCalc + ivaCalc;

        const armarDatosPdf = () => ({
          emisor: {
            nombre: businessConfig?.nombre || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}')?.tenantName : '') || 'Comercializadora de Calzado',
            ruc: businessConfig?.ruc || '',
            direccion: businessConfig?.direccion || 'Ecuador',
            telefono: businessConfig?.telefono,
            email: businessConfig?.email,
            obligadoContabilidad: businessConfig?.sriObligadoContabilidad,
            ambiente: businessConfig?.sriAmbiente,
            establecimiento: businessConfig?.sriEstablecimiento,
            puntoEmision: businessConfig?.sriPuntoEmision,
          },
          comprobante: {
            numero: facturaResultado?.numeroComprobante || `${businessConfig?.sriEstablecimiento || '001'}-${businessConfig?.sriPuntoEmision || '001'}-000000001`,
            fecha: new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }),
            claveAcceso: facturaResultado?.claveAcceso,
            formaPago: facturaCliente.formaPago,
          },
          comprador: {
            nombre: facturaCliente.nombre,
            cedula: facturaCliente.cedula,
            direccion: facturaCliente.direccion,
            telefono: facturaCliente.telefono,
            email: facturaCliente.email,
          },
          detalles: facturaCliente.detalles.map((d) => ({
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            descuento: d.descuento || 0,
            tarifaIva: d.tarifaIva || 15,
            subtotal: d.cantidad * d.precioUnitario - (d.descuento || 0),
          })),
          totales: {
            subtotal15: subtotalCalc,
            subtotal0: 0,
            descuento: 0,
            iva15: ivaCalc,
            total: totalCalc,
          },
        });

        return (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowFacturaModal(false), isDirtyFactura()); }}
          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowFacturaModal(false), isDirtyFactura()); }}
        >
          <div
            className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-5xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header del Modal */}
            <div className="p-6 pr-52 border-b border-[var(--border)] bg-[#0F172A] text-white">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white">Facturación Electrónica SRI</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-500/30">
                        Comprobante Digital
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Emisión y autorización directa de factura con firma electrónica
                    </p>
                  </div>
                </div>

                {/* Botones de acción en la cabecera: Volver a Cobros al lado izquierdo de Cerrar */}
                <div className="absolute top-5 right-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFacturaModal(false);
                      setShowCuentaModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 shadow-2xs"
                    title="Volver a la gestión de cobro"
                  >
                    <ArrowLeft size={14} />
                    <span>Volver a Cobros</span>
                  </button>
                  <button
                    onClick={() => setShowFacturaModal(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Cerrar ventana"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Pestañas */}
              <div className="flex gap-1.5 mt-5">
                <button
                  onClick={() => setTabFactura('CONFIGURAR')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    tabFactura === 'CONFIGURAR'
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <Settings2 size={13} />
                  <span>Configurar Datos</span>
                </button>
                <button
                  onClick={() => setTabFactura('PREVISUALIZAR')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    tabFactura === 'PREVISUALIZAR'
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <Eye size={13} />
                  <span>Vista Previa PDF</span>
                </button>
              </div>
            </div>

            {/* Body scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">

              {/* Resultado de la Emisión (si ya se emitió) */}
              {facturaResultado && (
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    facturaResultado.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {facturaResultado.success ? (
                        <CheckCircle size={18} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={18} className="text-rose-600" />
                      )}
                      <span className="font-black text-sm">
                        {facturaResultado.success
                          ? `Factura Autorizada por el SRI: ${facturaResultado.numeroComprobante}`
                          : `Emisión de Factura: ${facturaResultado.estadoSri}`}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                        facturaResultado.success
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {facturaResultado.estadoSri}
                    </span>
                  </div>

                  {facturaResultado.claveAcceso && (
                    <div className="p-2.5 bg-black/20 rounded-xl text-[11px] font-mono break-all text-slate-200">
                      <span className="text-slate-400 block font-sans text-[10px] font-bold">
                        Clave de Acceso SRI (49 dígitos):
                      </span>
                      {facturaResultado.claveAcceso}
                    </div>
                  )}

                  {facturaResultado.errorMensaje && (
                    <p className="text-xs text-rose-600 font-medium">
                      {facturaResultado.errorMensaje}
                    </p>
                  )}

                  {facturaResultado.success && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => {
                          const doc = generarFacturaPdfDoc(armarDatosPdf());
                          doc.save(`Factura_${facturaResultado.numeroComprobante || 'SRI'}.pdf`);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Descargar Factura PDF</span>
                      </button>
                      {facturaResultado.xmlUrl && (
                        <a
                          href={facturaResultado.xmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-slate-700"
                        >
                          <ExternalLink size={13} />
                          <span>Ver XML Firmado</span>
                        </a>
                      )}
                      {/* Botón WhatsApp directo con Factura Oficial */}
                      {facturaCliente.telefono && (
                        <button
                          onClick={async () => {
                            await compartirFacturaPdf(armarDatosPdf(), facturaCliente.telefono);
                            showToast('Abriendo WhatsApp con los datos oficiales de la Factura...', 'info');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <MessageCircle size={13} />
                          <span>Enviar Factura por WhatsApp</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ PESTAÑA: CONFIGURAR DATOS ═══ */}
              {tabFactura === 'CONFIGURAR' && (
                <div className="space-y-5">
                  {/* 1. Datos del Comprador */}
                  <div className="p-4 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                      <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                        <User size={14} className="text-[#0F172A]" />
                        <span>1. Datos del Comprador (Cliente)</span>
                      </span>
                      <span className="text-[10px] font-bold text-[var(--muted-foreground)]">
                        Nivel: {carteraSeleccionada.clienteNivel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                          Tipo Identificación *
                        </label>
                        <select
                          value={facturaCliente.tipoIdentificacion}
                          onChange={(e) =>
                            setFacturaCliente({
                              ...facturaCliente,
                              tipoIdentificacion: e.target.value,
                              cedula: e.target.value === '07' ? '9999999999999' : facturaCliente.cedula,
                            })
                          }
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                        >
                          <option value="05">Cédula de Identidad (10 dígitos)</option>
                          <option value="04">RUC (13 dígitos)</option>
                          <option value="07">Consumidor Final</option>
                          <option value="06">Pasaporte</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                          Número Cédula / RUC *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. 1804884664"
                          value={facturaCliente.cedula}
                          onChange={(e) =>
                            setFacturaCliente({ ...facturaCliente, cedula: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                          Razón Social / Nombres *
                        </label>
                        <input
                          type="text"
                          placeholder="Nombre del cliente"
                          value={facturaCliente.nombre}
                          onChange={(e) =>
                            setFacturaCliente({ ...facturaCliente, nombre: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                          <MapPin size={11} />
                          Dirección del Comprador
                        </label>
                        <input
                          type="text"
                          placeholder="Dirección del cliente"
                          value={facturaCliente.direccion}
                          onChange={(e) =>
                            setFacturaCliente({ ...facturaCliente, direccion: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                          <Mail size={11} />
                          Email (Para envío de Factura PDF/XML)
                        </label>
                        <input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          value={facturaCliente.email}
                          onChange={(e) =>
                            setFacturaCliente({ ...facturaCliente, email: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Selector de Notas / Compras a Facturar */}
                  <div className="p-4 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                      <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt size={14} className="text-[#0F172A]" />
                        <span>2. Seleccionar Notas de Venta a Facturar</span>
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">
                        {facturaCliente.notasSeleccionadas.length} de {carteraSeleccionada.cobros.length} notas seleccionadas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                      {carteraSeleccionada.cobros.map((c) => {
                        const numNota = c.saleNote?.numero
                          ? `NOTA #${String(c.saleNote.numero).padStart(4, '0')}`
                          : c.numeroCobro || `#${c.id.slice(0, 8).toUpperCase()}`;
                        const monto = Number(c.montoOriginal ?? c.montoTotal ?? 0);
                        const isChecked = facturaCliente.notasSeleccionadas.includes(c.id);
                        const isExpanded = notaExpandidaFacturaId === c.id;
                        const lineasNota = (c.lines && c.lines.length > 0) ? c.lines : (c.saleNote?.lines || []);

                        return (
                          <div
                            key={c.id}
                            className={`p-3 rounded-xl border transition-all ${
                              isExpanded ? 'sm:col-span-2' : ''
                            } ${
                              isChecked
                                ? 'bg-[#0F172A]/10 border-[#0F172A]/40 shadow-xs ring-1 ring-[#0F172A]/20'
                                : 'bg-[var(--card)] border-[var(--border)] hover:border-slate-400 opacity-90 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                {/* Checkbox de selección para facturación */}
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleNotaFacturar(c);
                                  }}
                                  className="w-4 h-4 mt-1 rounded text-[#0F172A] accent-[#0F172A] focus:ring-0 cursor-pointer shrink-0"
                                  title={isChecked ? 'Deseleccionar nota' : 'Seleccionar nota para facturar'}
                                />

                                {/* Bloque interactivo con Chevron, Código y Badge Presencial / Envíos */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNotaExpandidaFacturaId(isExpanded ? null : c.id);
                                  }}
                                  className="flex items-start gap-1.5 text-left cursor-pointer group"
                                  title="Clic para ver u ocultar los artículos de esta nota"
                                >
                                  <div className="mt-0.5 text-[var(--muted-foreground)] group-hover:text-[#0F172A] transition-colors shrink-0">
                                    {isExpanded ? <ChevronUp size={15} className="text-[#0F172A]" /> : <ChevronDown size={15} />}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-xs text-[var(--foreground)] group-hover:text-[#0F172A] transition-colors">
                                      {numNota}
                                    </div>
                                    <div className="mt-1">
                                      {c.tipoEntrega === 'ENVIO' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-extrabold">
                                          <Truck size={10} />
                                          <span>{c.courier || 'Envío'}</span>
                                          {c.ciudadEnvio && <span className="text-blue-500">· {c.ciudadEnvio}</span>}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                          <span>🏪 Presencial</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </div>

                              {/* Monto y Fecha */}
                              <div className="text-right shrink-0">
                                <span className="font-black text-xs text-[var(--foreground)] block">
                                  ${monto.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-[var(--muted-foreground)] block">
                                  {new Date(c.createdAt).toLocaleDateString('es-EC')} ({c.tipo || 'Crédito'})
                                </span>
                              </div>
                            </div>

                            {/* Detalle Desplegado de Artículos Solicitados */}
                            {isExpanded && (
                              <div className="mt-3 pt-2.5 border-t border-[var(--border)] space-y-2 text-xs animate-in fade-in">
                                <div className="flex items-center justify-between text-[11px] font-bold text-[var(--foreground)]">
                                  <span className="flex items-center gap-1.5">
                                    <Package size={13} className="text-[#0F172A]" />
                                    <span>Artículos Solicitados ({lineasNota.length} {lineasNota.length === 1 ? 'ítem' : 'ítems'}):</span>
                                  </span>
                                  {c.vendedorNombre && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 bg-blue-500/10 rounded">
                                      <User size={10} />
                                      <span>Vendedor: {c.vendedorNombre}</span>
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2">
                                  {(() => {
                                    const grupos = agruparLineasPorModelo(lineasNota, catalogoProductos);
                                      if (grupos.length === 0) {
                                        return (
                                          <div className="text-[11px] text-[var(--muted-foreground)] italic py-1">
                                            {businessConfig?.nombre || 'Calzado y Artículos de Cuero'} — ${monto.toFixed(2)}
                                          </div>
                                        );
                                      }

                                    return (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                                              {/* Fila 1: Nombre del Modelo + Badge de Volumen */}
                                              <div className="flex items-start justify-between gap-1.5">
                                                <div className="min-w-0 flex-1">
                                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                                                    Modelo
                                                  </span>
                                                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate leading-tight">
                                                    {g.modelName}
                                                  </h4>
                                                </div>

                                                {/* Badge de Volumen / Al por mayor */}
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0 ${
                                                  g.totalPares >= 6
                                                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                                }`}>
                                                  {g.etiquetaVolumen}
                                                </span>
                                              </div>

                                              {/* Fila 2: Serie y Color destacados */}
                                              <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                  <span>Serie:</span>
                                                  <span>{getNombreSerie(g.serieNombre, g.tallas)}</span>
                                                </span>
                                                {g.color && (
                                                  <span className="inline-flex items-center text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                    🎨 {g.color}
                                                  </span>
                                                )}
                                              </div>

                                              {/* Pastillas de tallas estilo inventario (T38: 2, T39: 3...) */}
                                              <div className="flex flex-wrap gap-1 mt-1.5">
                                                {g.tallas.map((t) => (
                                                  <span
                                                    key={t.numero}
                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[9px] font-bold"
                                                  >
                                                    <span>T{t.numero}:</span>
                                                    <span className="font-black text-rose-900 dark:text-rose-100">{t.cantidad}</span>
                                                  </span>
                                                ))}
                                              </div>

                                              {/* Subtotal del modelo */}
                                              <div className="mt-2 pt-1 border-t border-[var(--border)]/60 flex items-center justify-between text-[10px]">
                                                <span className="text-[var(--muted-foreground)] font-medium">
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Detalle de Ítems Agrupados */}
                  <div className="space-y-3">
                    <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider block flex items-center gap-1.5">
                      <FileText size={14} className="text-[#0F172A]" />
                      <span>3. Detalle de Productos a Facturar</span>
                    </span>

                    <div className="border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[var(--muted)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                          <tr>
                            <th className="px-4 py-2.5">Descripción</th>
                            <th className="px-4 py-2.5 text-center">Cant.</th>
                            <th className="px-4 py-2.5 text-right">P. Unit.</th>
                            <th className="px-4 py-2.5 text-center">IVA</th>
                            <th className="px-4 py-2.5 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {facturaCliente.detalles.map((d, index) => {
                            const sub = d.cantidad * d.precioUnitario - (d.descuento || 0);
                            return (
                              <tr key={index} className="hover:bg-[var(--muted)]/20">
                                <td className="px-4 py-2.5 font-semibold text-[var(--foreground)]">
                                  {d.descripcion}
                                </td>
                                <td className="px-4 py-2.5 text-center font-bold">{d.cantidad}</td>
                                <td className="px-4 py-2.5 text-right font-semibold">
                                  ${d.precioUnitario.toFixed(2)}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 rounded text-[9px] font-bold">
                                    {d.tarifaIva}%
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-black text-emerald-600">
                                  ${sub.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4. Forma de Pago y Resumen Tributario */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl space-y-2">
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--foreground)]">
                        Forma de Pago SRI *
                      </label>
                      <select
                        value={facturaCliente.formaPago}
                        onChange={(e) =>
                          setFacturaCliente({ ...facturaCliente, formaPago: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                      >
                        <option value="01">01 - Sin utilización del sistema financiero (Efectivo)</option>
                        <option value="20">20 - Otros con utilización del sistema financiero (Transferencia / Depósito)</option>
                        <option value="16">16 - Tarjeta de Débito</option>
                        <option value="19">19 - Tarjeta de Crédito</option>
                      </select>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Código oficial del catálogo de formas de pago del SRI Ecuador.
                      </p>
                    </div>

                    <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-1.5 shadow-xs">
                      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>Subtotal Base 0%:</span>
                        <span className="font-semibold">$0.00</span>
                      </div>
                      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>Subtotal Base 15%:</span>
                        <span className="font-semibold">${subtotalCalc.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>IVA (15%):</span>
                        <span className="font-semibold text-emerald-600">${ivaCalc.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black border-t border-[var(--border)] pt-2 text-[var(--foreground)]">
                        <span>TOTAL FACTURA SRI:</span>
                        <span className="text-base text-emerald-600">${totalCalc.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ PESTAÑA: VISTA PREVIA PDF ═══ */}
              {tabFactura === 'PREVISUALIZAR' && (
                <div className="p-4 sm:p-6 bg-slate-900/5 dark:bg-slate-950/40 rounded-3xl border border-[var(--border)] flex justify-center shadow-inner" id="seccion-factura-pdf">
                  {/* Comprobante PDF Oficial con diseño centrado y márgenes impecables */}
                  <div className="w-full max-w-3xl border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-white text-slate-900 shadow-xl">
                    {/* Encabezado con Datos del Dueño del Negocio / RUC Emisor */}
                    <div className="p-6 border-b-2 border-slate-300">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Datos del Emisor (Dueño del Negocio) */}
                        <div className="space-y-1">
                          <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                            {businessConfig?.nombre || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}')?.tenantName : '') || 'Comercializadora de Calzado'}
                          </h4>
                          <p className="text-[10px] text-slate-600 leading-tight">
                            {businessConfig?.email ? `Email: ${businessConfig.email}` : 'Comercialización y Distribución de Calzado'}
                          </p>
                          <p className="text-[10px] text-slate-700 font-bold">
                            RUC: {businessConfig?.ruc || 'S/RUC'}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Matriz: {businessConfig?.direccion || 'Ecuador'}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Obligado a llevar Contabilidad: {businessConfig?.sriObligadoContabilidad ? 'SI' : 'NO'}
                          </p>
                        </div>
                        {/* Datos del Comprobante */}
                        <div className="sm:text-right space-y-1">
                          <div className="inline-block px-3.5 py-2 border-2 border-slate-900 rounded-xl bg-slate-50">
                            <p className="font-black text-xs text-slate-900 uppercase">Factura</p>
                            <p className="text-[11px] text-slate-700 font-bold font-mono">
                              No. {businessConfig?.sriEstablecimiento || '001'}-{businessConfig?.sriPuntoEmision || '001'}-000000001
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-600 mt-2">
                            Fecha de Emisión: {new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <p className="text-[10px] text-slate-700 font-mono font-bold">
                            Ambiente: {businessConfig?.sriAmbiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Datos del Comprador */}
                    <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                        <div className="flex gap-1.5 text-[11px]">
                          <span className="font-bold text-slate-700">Razón Social:</span>
                          <span className="text-slate-900 font-semibold">{facturaCliente.nombre}</span>
                        </div>
                        <div className="flex gap-1.5 text-[11px]">
                          <span className="font-bold text-slate-700">Identificación:</span>
                          <span className="text-slate-900 font-semibold font-mono">{facturaCliente.cedula}</span>
                        </div>
                        <div className="flex gap-1.5 text-[11px]">
                          <span className="font-bold text-slate-700">Dirección:</span>
                          <span className="text-slate-900">{facturaCliente.direccion || 'No registrada'}</span>
                        </div>
                        <div className="flex gap-1.5 text-[11px]">
                          <span className="font-bold text-slate-700">Email:</span>
                          <span className="text-slate-900">{facturaCliente.email || 'No registrado'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tabla de Detalle */}
                    <div className="px-6 py-4 overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b-2 border-slate-300 text-slate-700 font-black uppercase">
                            <th className="py-2 text-left">Descripción</th>
                            <th className="py-2 text-center w-16">Cant.</th>
                            <th className="py-2 text-right w-24">P. Unit.</th>
                            <th className="py-2 text-right w-20">Desc.</th>
                            <th className="py-2 text-right w-24">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {facturaCliente.detalles.map((d, idx) => {
                            const sub = d.cantidad * d.precioUnitario - (d.descuento || 0);
                            return (
                              <tr key={idx} className="border-b border-slate-200">
                                <td className="py-2 text-left font-semibold text-slate-900">{d.descripcion}</td>
                                <td className="py-2 text-center font-bold">{d.cantidad}</td>
                                <td className="py-2 text-right font-mono">${d.precioUnitario.toFixed(2)}</td>
                                <td className="py-2 text-right font-mono">${(d.descuento || 0).toFixed(2)}</td>
                                <td className="py-2 text-right font-bold font-mono">${sub.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Totales PDF */}
                    <div className="px-6 py-4 border-t-2 border-slate-300 bg-slate-50">
                      <div className="flex justify-end">
                        <div className="w-72 space-y-1.5">
                          <div className="flex justify-between text-[11px] text-slate-700">
                            <span>SUBTOTAL 15%:</span>
                            <span className="font-bold font-mono">${subtotalCalc.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-700">
                            <span>SUBTOTAL 0%:</span>
                            <span className="font-bold font-mono">$0.00</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-700">
                            <span>DESCUENTO:</span>
                            <span className="font-bold font-mono">$0.00</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-700">
                            <span>IVA 15%:</span>
                            <span className="font-bold font-mono">${ivaCalc.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-black text-slate-900 border-t-2 border-slate-400 pt-2">
                            <span>VALOR TOTAL:</span>
                            <span className="font-mono text-emerald-700">${totalCalc.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Información adicional PDF */}
                    <div className="px-6 py-3 border-t border-slate-200 text-[10px] text-slate-500 space-y-0.5 bg-slate-100/50">
                      <p>Forma de Pago: {facturaCliente.formaPago === '01' ? 'Sin utilización del sistema financiero (Efectivo)' : facturaCliente.formaPago === '20' ? 'Otros con utilización del sistema financiero' : facturaCliente.formaPago === '16' ? 'Tarjeta de Débito' : 'Tarjeta de Crédito'} — Plazo: 30 días</p>
                      <p>Este documento es una previsualización PDF de la factura electrónica a emitirse ante el SRI.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con Acciones Estandarizadas */}
            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex flex-wrap items-center justify-end gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Botón Imprimir / Guardar PDF */}
                {tabFactura === 'PREVISUALIZAR' && (
                  <button
                    onClick={() => {
                      const doc = generarFacturaPdfDoc(armarDatosPdf());
                      doc.save(`Factura_${armarDatosPdf().comprobante.numero}.pdf`);
                      showToast('Archivo PDF generado y descargado.', 'success');
                    }}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Guardar PDF</span>
                  </button>
                )}

                {/* Botón Compartir Factura directamente a WhatsApp */}
                {facturaCliente.telefono && tabFactura === 'PREVISUALIZAR' && !facturaResultado && (
                  <button
                    onClick={async () => {
                      await compartirFacturaPdf(armarDatosPdf(), facturaCliente.telefono);
                      showToast('Abriendo WhatsApp con los datos oficiales de la Factura...', 'info');
                    }}
                    className="px-3.5 py-2.5 bg-emerald-500/15 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    <span>Enviar Factura por WhatsApp</span>
                  </button>
                )}

                {tabFactura === 'CONFIGURAR' && (
                  <button
                    onClick={() => setTabFactura('PREVISUALIZAR')}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Eye size={14} />
                    <span>Previsualizar PDF</span>
                  </button>
                )}

                <button
                  onClick={handleEmitirFacturaSRI}
                  disabled={emittingFactura || !online}
                  className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer border border-slate-700"
                >
                  {emittingFactura ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Firmando y Emitiendo al SRI...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck size={16} className="text-emerald-400" />
                      <span>Emitir Factura Electrónica SRI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CAMBIAR MODALIDAD DE VENTA (CONTADO <-> CRÉDITO)       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showCambiarTipoModal && cobroParaCambiarTipo && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCambiarTipoModal(false);
              setCobroParaCambiarTipo(null);
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCambiarTipoModal(false);
              setCobroParaCambiarTipo(null);
            }
          }}
        >
          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-white/10 rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    Cambiar Condición de Venta
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    {cobroParaCambiarTipo.saleNote?.numero
                      ? `Nota #${String(cobroParaCambiarTipo.saleNote.numero).padStart(4, '0')}`
                      : cobroParaCambiarTipo.numeroCobro || 'Nota Comercial'} · {cobroParaCambiarTipo.clienteNombre || 'Cliente'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCambiarTipoModal(false);
                  setCobroParaCambiarTipo(null);
                }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
              {/* Selector de Tipo Destino */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Nueva Condición de Pago *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--muted)]/40 rounded-2xl border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setNuevoTipoVenta('CONTADO')}
                    className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      nuevoTipoVenta === 'CONTADO'
                        ? 'bg-[#0F172A] text-white shadow-md'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <DollarSign size={14} />
                    <span>Venta de Contado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevoTipoVenta('CREDITO')}
                    className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      nuevoTipoVenta === 'CREDITO'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <CreditCard size={14} />
                    <span>Venta a Crédito</span>
                  </button>
                </div>
              </div>

              {/* Información del monto original */}
              <div className="p-3 bg-slate-500/5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted-foreground)] font-medium">Monto Total de la Venta:</span>
                <span className="font-mono font-black text-sm text-[var(--foreground)]">
                  ${Number(cobroParaCambiarTipo.montoOriginal ?? cobroParaCambiarTipo.montoTotal ?? 0).toFixed(2)}
                </span>
              </div>

              {nuevoTipoVenta === 'CREDITO' ? (
                <div className="space-y-4 pt-1">
                  {/* Plazo en días */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Plazo de Crédito *
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 45, 60].map((dias) => (
                        <button
                          key={dias}
                          type="button"
                          onClick={() => {
                            setCambioTipoDiasPlazo(dias);
                            const nuevaFecha = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                            setCambioTipoFechaVencimiento(nuevaFecha);
                          }}
                          className={`py-2 px-2 rounded-xl font-extrabold text-xs border text-center transition-all cursor-pointer ${
                            cambioTipoDiasPlazo === dias
                              ? 'bg-emerald-600/15 border-emerald-600 text-emerald-700 dark:text-emerald-300 font-black shadow-xs'
                              : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-slate-400'
                          }`}
                        >
                          {dias} días
                        </button>
                      ))}
                    </div>

                    <div className="mt-2">
                      <label className="block text-[10px] text-[var(--muted-foreground)] mb-1 font-semibold">
                        Fecha Límite de Vencimiento:
                      </label>
                      <input
                        type="date"
                        value={cambioTipoFechaVencimiento}
                        onChange={(e) => setCambioTipoFechaVencimiento(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                      />
                    </div>
                  </div>

                  {/* Anticipo / Abono Inicial */}
                  <div className="p-3.5 bg-blue-500/5 rounded-2xl border border-blue-500/20 space-y-3">
                    <span className="font-extrabold text-xs text-blue-900 dark:text-blue-200 block flex items-center gap-1.5">
                      <DollarSign size={14} className="text-blue-600" />
                      Anticipo / Abono Inicial Recibido (Opcional)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-[var(--muted-foreground)] mb-1 font-semibold">
                          Monto Recibido ($):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={Number(cobroParaCambiarTipo.montoOriginal ?? cobroParaCambiarTipo.montoTotal ?? 0)}
                          placeholder="0.00"
                          value={cambioTipoMontoAbonado}
                          onChange={(e) => setCambioTipoMontoAbonado(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--muted-foreground)] mb-1 font-semibold">
                          Método de Pago:
                        </label>
                        <select
                          value={cambioTipoMetodoAbono}
                          onChange={(e) => setCambioTipoMetodoAbono(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                        >
                          <option value="EFECTIVO">💵 Efectivo</option>
                          <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                          <option value="DEPOSITO">💳 Depósito Bancario</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)] mb-1 font-semibold">
                      Observación / Motivo del Crédito:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Acuerdo comercial con cliente, se otorga 30 días con anticipo..."
                      value={cambioTipoNotas}
                      onChange={(e) => setCambioTipoNotas(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>

                  {/* Resumen del Saldo que quedará en Cartera */}
                  {(() => {
                    const total = Number(cobroParaCambiarTipo.montoOriginal ?? cobroParaCambiarTipo.montoTotal ?? 0);
                    const abono = Math.min(total, parseFloat(cambioTipoMontoAbonado) || 0);
                    const saldoFinal = Math.max(0, total - abono);

                    return (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block uppercase">
                            Saldo Pendiente que se cargará a Cartera:
                          </span>
                          <span className="text-[11px] text-[var(--muted-foreground)]">
                            Vence el: <strong>{cambioTipoFechaVencimiento ? new Date(cambioTipoFechaVencimiento).toLocaleDateString('es-EC') : '30 días'}</strong>
                          </span>
                        </div>
                        <span className="font-mono font-black text-base text-red-500">
                          ${saldoFinal.toFixed(2)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                    <span className="font-extrabold text-xs text-emerald-800 dark:text-emerald-300 block flex items-center gap-1.5">
                      <CheckCircle size={15} className="text-emerald-600" />
                      Liquidación Inmediata de Contado
                    </span>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Al cambiar a <strong>Contado</strong>, la venta quedará completamente <strong>Saldada ($0.00 pendiente)</strong>, liberando automáticamente el cupo de crédito del cliente.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)] mb-1 font-semibold">
                      Método de Cobro de Contado:
                    </label>
                    <select
                      value={cambioTipoMetodoAbono}
                      onChange={(e) => setCambioTipoMetodoAbono(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                    >
                      <option value="EFECTIVO">💵 Efectivo</option>
                      <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                      <option value="DEPOSITO">💳 Depósito Bancario</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)] mb-1 font-semibold">
                      Observación / Notas:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Pago total en efectivo recibido en mostrador..."
                      value={cambioTipoNotas}
                      onChange={(e) => setCambioTipoNotas(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCambiarTipoModal(false);
                  setCobroParaCambiarTipo(null);
                }}
                className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleEjecutarCambioTipo}
                disabled={savingCambiarTipo}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-slate-700 min-h-[42px]"
              >
                {savingCambiarTipo ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span>Confirmar Cambio a {nuevoTipoVenta === 'CREDITO' ? 'Crédito' : 'Contado'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartir Historial Comercial y Financiero con Previsualizador PDF Integrado */}
      {showCompartirHistorialModal && historialCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl max-w-6xl w-full h-[94vh] flex flex-col overflow-hidden text-[var(--foreground)] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-[#0F172A] text-white flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Share2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                    Compartir Historial Comercial
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300">
                    Extracto formal en PDF con previsualización en vivo, WhatsApp y Correo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Selector de pestañas para móviles/tablets */}
                <div className="flex lg:hidden bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTabCompartirModal('formulario')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      tabCompartirModal === 'formulario'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Opciones
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabCompartirModal('preview')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      tabCompartirModal === 'preview'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Ver PDF
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCompartirHistorialModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body (Grid Split-View) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
              {/* Panel Izquierdo: Configuración, Filtros y Envíos (5 columnas) */}
              <div className={`lg:col-span-5 flex flex-col justify-between overflow-y-auto p-4 sm:p-5 space-y-4 ${tabCompartirModal === 'preview' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="space-y-4">
                  {/* Tarjeta de información del cliente */}
                  <div className="p-3.5 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[var(--foreground)]">
                          {historialCliente.cliente.nombre}
                        </span>
                        <span className="px-2 py-0.5 bg-[#0F172A]/10 text-[#0F172A] border border-[#0F172A]/20 rounded-md text-[10px] font-bold">
                          {historialCliente.cliente.nivelCredito}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Identificación: <strong>{historialCliente.cliente.cedula || '—'}</strong>
                      </p>
                    </div>
                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-semibold">
                        Saldo Deudor Total
                      </span>
                      <span className="font-black text-base text-red-500">
                        ${historialCliente.resumen.saldoPendienteTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Selector de Rango de Fechas */}
                  <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Filter size={15} className="text-[#0F172A]" />
                        <span className="text-xs font-black uppercase tracking-wider text-[var(--foreground)]">
                          Período del Extracto
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFiltroCompartirFechaInicio(rangoFechasHistorial.minFecha);
                          setFiltroCompartirFechaFin(rangoFechasHistorial.maxFecha);
                        }}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Todo el histórico</span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          ({rangoFechasHistorial.minFecha} al {rangoFechasHistorial.maxFecha})
                        </span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                          Desde:
                        </label>
                        <input
                          type="date"
                          value={filtroCompartirFechaInicio}
                          min={rangoFechasHistorial.minFecha}
                          max={filtroCompartirFechaFin || rangoFechasHistorial.maxFecha}
                          onChange={(e) => setFiltroCompartirFechaInicio(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                          Hasta:
                        </label>
                        <input
                          type="date"
                          value={filtroCompartirFechaFin}
                          min={filtroCompartirFechaInicio || rangoFechasHistorial.minFecha}
                          max={rangoFechasHistorial.maxFecha}
                          onChange={(e) => setFiltroCompartirFechaFin(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]">
                      <span>
                        Transacciones en rango: <strong>{movimientosFiltradosCompartir.length}</strong> de {rangoFechasHistorial.total}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check size={12} /> Actualización en vivo
                      </span>
                    </div>
                  </div>

                  {/* Destinatarios de Contacto */}
                  <div className="space-y-3">
                    <div className="p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <MessageCircle size={15} className="text-emerald-500" />
                        <span className="text-xs font-extrabold text-[var(--foreground)]">
                          Teléfono WhatsApp
                        </span>
                      </div>
                      <input
                        type="tel"
                        placeholder="Ej: 0991234567 o +593991234567"
                        value={compartirTelefonoDestino}
                        onChange={(e) => setCompartirTelefonoDestino(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      />

                    </div>

                  </div>

                  {/* Nota informativa sobre correo automático */}
                  {historialCliente.cliente.email && (
                    <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center gap-2.5">
                      <Mail size={15} className="text-blue-500 shrink-0" />
                      <p className="text-[11px] text-[var(--muted-foreground)]">
                        Al compartir, el extracto PDF se enviará en segundo plano al correo registrado del cliente (<strong className="text-[var(--foreground)]">{historialCliente.cliente.email}</strong>).
                      </p>
                    </div>
                  )}
                </div>

                {/* Acciones principales en el panel izquierdo */}
                <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDescargarHistorialPdf}
                    className="px-4 py-2.5 bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Descargar documento PDF oficial"
                  >
                    <Download size={15} />
                    <span>Descargar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompartirHistorial}
                    disabled={compartiendoHistorial || !compartirTelefonoDestino}
                    className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    title="Compartir por WhatsApp y enviar por correo con enlace en línea"
                  >
                    {compartiendoHistorial ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    )}
                    <span>Compartir por WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Panel Derecho: Previsualizador del PDF (7 columnas) */}
              <div className={`lg:col-span-7 flex flex-col h-full bg-slate-100 dark:bg-slate-950/40 p-3 sm:p-4 overflow-hidden ${tabCompartirModal === 'formulario' ? 'hidden lg:flex' : 'flex'}`}>
                {/* Barra de herramientas del visor */}
                <div className="flex items-center justify-between pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                      <FileText size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-[var(--foreground)] block">
                        Previsualización del PDF
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        Documento listo para emisión y descarga
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => generarPreviewHistorial()}
                      disabled={loadingPreviewPdf}
                      className="p-1.5 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer text-xs flex items-center gap-1 shadow-xs"
                      title="Regenerar previsualización"
                    >
                      <RotateCcw size={13} className={loadingPreviewPdf ? 'animate-spin' : ''} />
                      <span className="hidden sm:inline text-[11px] font-bold">Actualizar</span>
                    </button>


                  </div>
                </div>

                {/* Visor interactivo */}
                <div className="flex-1 w-full rounded-2xl border border-[var(--border)] shadow-inner bg-slate-200/50 dark:bg-slate-900/50 overflow-hidden relative flex items-center justify-center">
                  {loadingPreviewPdf ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center animate-in fade-in">
                      <Loader2 size={32} className="animate-spin text-emerald-600" />
                      <p className="text-xs font-bold text-[var(--foreground)]">
                        Generando vista previa del extracto...
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Cargando modelos, curvas de tallas y corrida de saldos
                      </p>
                    </div>
                  ) : previewPdfUrl ? (
                    <iframe
                      src={previewPdfUrl}
                      title="Previsualizador de Historial Comercial PDF"
                      className="w-full h-full rounded-2xl border-none bg-white"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                      <FileText size={32} className="text-slate-400" />
                      <p className="text-xs font-bold text-[var(--muted-foreground)]">
                        No hay información suficiente para previsualizar el PDF
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
        targetSectionName="Financiero / Cartera"
        detail={{ hasChanges: true, sectionName: "este formulario Financiero" }}
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
