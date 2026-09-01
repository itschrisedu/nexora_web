"use client";

import { useState, useEffect, Fragment } from 'react';
import { ApiService } from '../services/api.service';
import { db } from '../db/local-db';
import { SyncService } from '../services/sync.service';
import {
  Package,
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
} from 'lucide-react';

import { useToast } from './ui/toast';
import { getClienteReputacion } from '../utils/cliente-reputacion';

interface ComercialProps {
  online: boolean;
  userRole?: string;
  userPermissions?: { permiteCambiarPrecio?: boolean; rol?: string };
}

type EstadoPedido = 'PENDIENTE' | 'EN_PREPARACION' | 'EN_ESPERA_STOCK' | 'ENTREGADO' | 'CANCELADO';

interface Pedido {
  id: string;
  numero?: number;
  numeroCodigo?: string;
  clientId: string;
  clienteNombre?: string;
  montoTotal: number;
  estado: EstadoPedido;
  tipoPago: string;
  createdAt: string;
  prioridadScore?: number;
  lines?: any[];
}

const ESTADO_CONFIG: Record<EstadoPedido, { label: string; color: string; icon: React.ReactNode }> = {
  PENDIENTE:       { label: 'Pendiente',        color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',       icon: <Clock size={12} /> },
  EN_PREPARACION:  { label: 'En Preparación',   color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',          icon: <Package size={12} /> },
  EN_ESPERA_STOCK: { label: 'Espera de Stock',   color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',    icon: <Clock size={12} /> },
  ENTREGADO:       { label: 'Entregado',        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: <CheckCircle size={12} /> },
  CANCELADO:       { label: 'Anulado',          color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',          icon: <XCircle size={12} /> },
};

export default function ComercialComponent({ online, userRole, userPermissions }: ComercialProps) {
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

  const [creatingOrder, setCreatingOrder] = useState(false);

  // Búsqueda interactiva de Modelos de productos
  const [busquedaModelo, setBusquedaModelo] = useState('');
  const [showDropdownModelo, setShowDropdownModelo] = useState(false);
  const [productoSeleccionadoObj, setProductoSeleccionadoObj] = useState<any | null>(null);

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
  }, [online]);

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
    if (p.lines && p.lines.length > 0) {
      // Agrupar por producto
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

        let formato = `${totalPares} pares`;
        if (totalPares === 6) formato = 'Media Docena';
        else if (totalPares === 12) formato = '1 Docena';

        desgloseTexto += `\n• ${formato} - ${item.modelName || 'Calzado'} (${item.color || ''} / ${item.serieNombre || 'Serie'}) x $${Number(item.precioUnitario).toFixed(2)} = $${subtotal.toFixed(2)}`;
      });
    }

    const mensaje = `Estimado/a *${clienteNombre}*,\n\nLe saludamos de *${negocioNombre}*. Confirmamos la recepción de su pedido:\n\n📦 *PEDIDO ${numPedido}*\n📅 *Fecha:* ${fecha}\n💳 *Forma de Pago:* ${p.tipoPago || 'Contado'}\n\n👟 *DETALLE DE ARTÍCULOS:*${desgloseTexto || '\n• ' + (p.lines?.length || 1) + ' ítems'}\n\n💰 *VALOR TOTAL:* $${Number(p.montoTotal).toFixed(2)}\n\nPor favor, confírmenos respondiendo a este mensaje con un *"Confirmado"* o *"OK"* para proceder con la preparación y entrega. ¡Muchas gracias por su preferencia!`;

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
        const data = await ApiService.get('/catalogo/productos');
        const flat: any[] = [];
        (data || []).forEach((modelo: any) => {
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
      setSelectedProductId(pObj.id);
      setProductoSeleccionadoObj(pObj);
      setShowDropdownModelo(false);
      setBusquedaModelo('');
      // Usar salePrice del catálogo como precio base siempre
      const precioCatalogo = Number(pObj.salePrice) || Number(pObj.costPrice) || 0;
      setPrecioItem(precioCatalogo);
      setPrecioItemInput(precioCatalogo > 0 ? String(precioCatalogo) : '');
      // Resetear último precio del cliente para que el useEffect lo consulte y auto-aplique
      setUltimoPrecioCliente(null);
      setFechaUltimaVenta(null);
      
      const initialMap: Record<string, number> = {};
      if (pObj.tallas) {
        pObj.tallas.forEach((t: any) => {
          initialMap[t.tallaId] = 0;
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

    if (tipoVentaItem === 'SERIE_COMPLETA') {
      if (!prodObj.tallas || prodObj.tallas.length === 0) {
        showToast('Este modelo no tiene tallas asociadas en la serie.', 'warning');
        return;
      }

      const getCurvaRatio = (talla: any, tallas: any[]) => {
        if (talla.ratio && talla.ratio > 0) return talla.ratio;
        if (talla.cantidadSerie && talla.cantidadSerie > 0) return talla.cantidadSerie;
        const positive = tallas.map((x: any) => x.cantidad || x.stock || 1).filter((q: number) => q > 0);
        const minQ = positive.length > 0 ? Math.min(...positive) : 1;
        return minQ > 0 ? Math.max(1, Math.round((talla.cantidad || talla.stock || 1) / minQ)) : 1;
      };

      const lineasSerie = prodObj.tallas.map((t: any) => {
        const ratio = getCurvaRatio(t, prodObj.tallas);
        const factor = ratio * (subtipoSerie === 'MEDIA_DOCENA' ? 1 : 2) * (cantidadSeries || 1);
        return {
          productId: prodObj.id,
          modelName: prodObj.modelName,
          color: prodObj.color,
          serieNombre: prodObj.serieNombre,
          imageUrl: prodObj.imageUrl,
          tallaId: t.tallaId,
          numeroTalla: t.numero,
          cantidad: factor,
          precioUnitario: Number(precioItem),
          tipoVenta: 'SERIE_COMPLETA' as const,
          subtipoSerie,
          cantidadSeries,
        };
      });

      setLineasPedido([...lineasPedido, ...lineasSerie]);
    } else if (tipoVentaItem === 'SERIE_ESPECIAL') {
      const serieSeleccionada = listaSeriesDisponibles.find((s) => s.id === serieEspecialId);
      const tallasSerie = serieSeleccionada?.tallas && serieSeleccionada.tallas.length > 0
        ? serieSeleccionada.tallas
        : [
            { id: 't-esp-38', numero: 38 },
            { id: 't-esp-39', numero: 39 },
            { id: 't-esp-40', numero: 40 },
            { id: 't-esp-41', numero: 41 },
            { id: 't-esp-42', numero: 42 },
            { id: 't-esp-43', numero: 43 },
          ];

      const nombreSerieClean = serieSeleccionada?.nombre
        ? serieSeleccionada.nombre.replace(/_/g, ' ')
        : 'Serie Especial';

      const lineasSerieEspecial = tallasSerie.map((t: any) => {
        const factor = (subtipoSerie === 'MEDIA_DOCENA' ? 1 : 2) * (cantidadSeries || 1);
        return {
          productId: prodObj.id,
          modelName: prodObj.modelName,
          color: prodObj.color,
          serieNombre: `${nombreSerieClean} (${tallasSerie[0]?.numero}-${tallasSerie[tallasSerie.length - 1]?.numero}) [Bajo Pedido]`,
          imageUrl: prodObj.imageUrl,
          tallaId: t.id || t.tallaId || `t-${t.numero}`,
          numeroTalla: t.numero,
          cantidad: factor,
          precioUnitario: Number(precioItem),
          tipoVenta: 'SERIE_ESPECIAL' as const,
          esPedidoEspecial: true,
          subtipoSerie,
          cantidadSeries,
        };
      });

      setLineasPedido([...lineasPedido, ...lineasSerieEspecial]);
    } else {
      // Venta por talla específica (Numeración)
      const lineasNumeracion: any[] = [];
      Object.entries(tallaCantidadesMap).forEach(([tallaId, qty]) => {
        if (qty > 0) {
          const tallaObj = prodObj.tallas.find((t: any) => t.tallaId === tallaId);
          if (tallaObj) {
            lineasNumeracion.push({
              productId: prodObj.id,
              modelName: prodObj.modelName,
              color: prodObj.color,
              serieNombre: prodObj.serieNombre,
              imageUrl: prodObj.imageUrl,
              tallaId: tallaObj.tallaId,
              numeroTalla: tallaObj.numero,
              cantidad: Number(qty),
              precioUnitario: Number(precioItem),
              tipoVenta: 'TALLA_ESPECIFICA' as const,
            });
          }
        }
      });

      if (lineasNumeracion.length === 0) {
        showToast('Por favor asigna al menos una talla con cantidad mayor a 0.', 'warning');
        return;
      }

      setLineasPedido([...lineasPedido, ...lineasNumeracion]);
    }

    // Limpiar selección de producto
    setSelectedProductId('');
    setProductoSeleccionadoObj(null);
    setBusquedaModelo('');
    setPrecioItem(0);
    setPrecioItemInput('');
    setTallaCantidadesMap({});
    setCantidadSeries(1);
    setUltimoPrecioCliente(null);
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
        })),
        notas: notasFinales || undefined,
      };

      if (editingOrderId) {
        await ApiService.put(`/pedidos/${editingOrderId}`, payload);
        showToast('¡Pedido actualizado exitosamente!', 'success');
      } else {
        const res = await ApiService.post('/pedidos', payload);
        showToast('¡Pedido creado exitosamente!', 'success');

        // Si el cliente tiene teléfono registrado, abrir confirmación por WhatsApp
        const clienteInfo = listaClientes.find((c) => c.id === clientId);
        if (clienteInfo?.telefono) {
          const nuevoPedidoObj: Pedido = {
            id: res?.id || 'NUEVO',
            numero: res?.numero,
            numeroCodigo: res?.numeroCodigo,
            clientId,
            clienteNombre: clienteInfo.nombre,
            montoTotal: lineasPedido.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0),
            estado: 'PENDIENTE',
            tipoPago,
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
      setMetodoPagoContado('EFECTIVO');
      setReferenciaComprobante('');
      setBusquedaCliente('');
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
        {(['PENDIENTE', 'EN_PREPARACION', 'ENTREGADO', 'CANCELADO'] as EstadoPedido[]).map((st) => {
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
                        <td className="px-6 py-4 font-bold flex items-center gap-2">
                          {isExpanded ? <ChevronUp size={14} className="text-[#0F172A]" /> : <ChevronDown size={14} className="text-[var(--muted-foreground)]" />}
                          #{getNumeroPedido(p, idx)}
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
                              </div>
                            );
                          })()}
                        </td>
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
                          <div className="flex items-center justify-center gap-1.5">
                            {isUpdating ? (
                              <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                                <Loader2 size={12} className="animate-spin text-[#0F172A]" /> Actualizando...
                              </span>
                            ) : p.estado === 'PENDIENTE' || p.estado === 'EN_ESPERA_STOCK' ? (
                              <>
                                <button
                                  onClick={() => handleAbrirEditarPedido(p)}
                                  className="px-2.5 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg text-xs font-semibold transition-all border border-amber-500/20 flex items-center gap-1"
                                >
                                  ✏️ Editar
                                </button>
                                {p.estado === 'PENDIENTE' && (
                                  <button
                                    onClick={() => handleCambiarEstado(p.id, 'EN_PREPARACION')}
                                    className="px-2.5 py-1 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-blue-600/20 flex items-center gap-1"
                                  >
                                    <Package size={12} /> Preparar
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCambiarEstado(p.id, 'CANCELADO')}
                                  className="px-2.5 py-1 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-rose-500/20 flex items-center gap-1"
                                >
                                  <XCircle size={12} /> Anular
                                </button>
                              </>
                            ) : p.estado === 'EN_PREPARACION' ? (
                              <>
                                <button
                                  onClick={() => handleAbrirEditarPedido(p)}
                                  className="px-2.5 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg text-xs font-semibold transition-all border border-amber-500/20 flex items-center gap-1"
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  onClick={() => handleCambiarEstado(p.id, 'ENTREGADO')}
                                  className="px-2.5 py-1 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-emerald-600/20 flex items-center gap-1"
                                >
                                  <CheckCircle size={12} /> Entregar
                                </button>
                                <button
                                  onClick={() => handleCambiarEstado(p.id, 'CANCELADO')}
                                  className="px-2.5 py-1 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-rose-500/20 flex items-center gap-1"
                                >
                                  <XCircle size={12} /> Anular
                                </button>
                              </>
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
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-[var(--foreground)]">
                                  📦 Detalle de Artículos Solicitados — {getNumeroPedido(p, idx)}
                                </span>
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
                              <div className="space-y-1 text-xs">
                                {p.lines && p.lines.length > 0 ? (
                                  p.lines.map((l: any, lineIdx: number) => (
                                    <div
                                      key={lineIdx}
                                      className="flex justify-between items-center py-1 border-b border-[var(--border)] last:border-none"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-[var(--foreground)]">
                                          {l.modelName || 'Calzado'} ({l.color || ''})
                                        </span>
                                        <span className="text-[var(--muted-foreground)]">
                                          · Talla {l.numeroTalla || l.tallaNumero || 38} ({l.serieNombre || 'Serie'})
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-[var(--muted)] text-[var(--muted-foreground)] rounded font-mono">
                                          {l.tipoVenta === 'SERIE_COMPLETA' ? 'Serie' : 'Por Talla'}
                                        </span>
                                      </div>
                                      <div className="font-mono font-bold">
                                        {l.cantidad} pares × ${Number(l.precioUnitario).toFixed(2)} = ${(l.cantidad * Number(l.precioUnitario)).toFixed(2)}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-[var(--muted-foreground)]">Sin líneas de detalle</span>
                                )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Tipo de Pago *</label>
                    <select
                      value={tipoPago}
                      onChange={(e) => setTipoPago(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A]"
                    >
                      <option value="CONTADO">Contado</option>
                      <option value="CREDITO">Crédito</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Canal de Venta</label>
                    <select
                      value={canalEntrada}
                      onChange={(e) => setCanalEntrada(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A]"
                    >
                      <option value="VENTA_DIRECTA">Venta Directa</option>
                      <option value="POS">POS Mostrador</option>
                      <option value="CATALOGO_DIGITAL">Catálogo Digital / WhatsApp</option>
                    </select>
                  </div>

                  {/* Detalle de Pago de Contado */}
                  {tipoPago === 'CONTADO' && (
                    <div className="sm:col-span-3 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
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
                </div>
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

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Modalidad de Venta *</label>
                    <select
                      value={tipoVentaItem}
                      onChange={(e) => setTipoVentaItem(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                    >
                      <option value="SERIE_COMPLETA">📦 Venta por Serie Completa (Media Docena / Docena)</option>
                      <option value="TALLA_ESPECIFICA">👟 Venta por Talla Específica (Numeración)</option>
                      <option value="SERIE_ESPECIAL">⭐ Pedido Especial / Otra Serie (Bajo Pedido para Proveedor)</option>
                    </select>
                  </div>

                  {tipoVentaItem === 'SERIE_COMPLETA' ? (
                    <div className="sm:col-span-2 space-y-3 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      {(() => {
                        const getCurvaRatio = (talla: any, tallas: any[]) => {
                          if (talla.ratio && talla.ratio > 0) return talla.ratio;
                          if (talla.cantidadSerie && talla.cantidadSerie > 0) return talla.cantidadSerie;
                          const positive = tallas.map((x: any) => x.cantidad || x.stock || 1).filter((q: number) => q > 0);
                          const minQ = positive.length > 0 ? Math.min(...positive) : 1;
                          return minQ > 0 ? Math.max(1, Math.round((talla.cantidad || talla.stock || 1) / minQ)) : 1;
                        };

                        const baseParesPorSerie = (productoSeleccionadoObj?.tallas || []).reduce(
                          (sum: number, t: any) => sum + getCurvaRatio(t, productoSeleccionadoObj?.tallas || []),
                          0
                        ) || (productoSeleccionadoObj?.tallas?.length || 6);

                        const paresMediaDocena = baseParesPorSerie;
                        const paresDocenaCompleta = baseParesPorSerie * 2;

                        const totalParesStock = (productoSeleccionadoObj?.tallas || []).reduce(
                          (sum: number, t: any) => sum + (t.cantidad ?? t.stock ?? 0),
                          0
                        );
                        const mediasDocenasStock = Math.floor(totalParesStock / (paresMediaDocena || 1));
                        const docenasStock = Math.floor(totalParesStock / (paresDocenaCompleta || 1));
                        const stockActualSerie = subtipoSerie === 'MEDIA_DOCENA' ? mediasDocenasStock : docenasStock;
                        const hayFaltante = cantidadSeries > stockActualSerie;
                        const paresSeleccionadosTotales = (subtipoSerie === 'MEDIA_DOCENA' ? paresMediaDocena : paresDocenaCompleta) * (cantidadSeries || 1);

                        return (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                <span>Seleccionar Curva de Serie:</span>
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSubtipoSerie('MEDIA_DOCENA')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                    subtipoSerie === 'MEDIA_DOCENA'
                                      ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                                      : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-emerald-500'
                                  }`}
                                >
                                  <span>
                                    {paresMediaDocena === 6 ? '½ Media Docena (6 pares)' : `Curva Serie (${paresMediaDocena} pares)`}
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    subtipoSerie === 'MEDIA_DOCENA' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-700'
                                  }`}>
                                    Stock: {mediasDocenasStock}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSubtipoSerie('DOCENA')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                    subtipoSerie === 'DOCENA'
                                      ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                                      : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-emerald-500'
                                  }`}
                                >
                                  <span>
                                    {paresDocenaCompleta === 12 ? '1 Docena (12 pares)' : `Doble Serie (${paresDocenaCompleta} pares)`}
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    subtipoSerie === 'DOCENA' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-700'
                                  }`}>
                                    Stock: {docenasStock}
                                  </span>
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-[var(--muted-foreground)] shrink-0">
                                  ¿Cuántas {subtipoSerie === 'MEDIA_DOCENA' ? (paresMediaDocena === 6 ? 'medias docenas' : 'series') : (paresDocenaCompleta === 12 ? 'docenas' : 'doble series')}?:
                                </label>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setCantidadSeries(Math.max(1, (cantidadSeries || 1) - 1))}
                                    className="w-7 h-7 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)] transition-colors shadow-sm"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={cantidadSeries}
                                    onChange={(e) => setCantidadSeries(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-14 h-7 text-center font-bold text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[#0F172A]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setCantidadSeries((cantidadSeries || 1) + 1)}
                                    className="w-7 h-7 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)] transition-colors shadow-sm"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-xs font-black text-emerald-700 ml-1">
                                  = {paresSeleccionadosTotales} pares
                                </span>
                              </div>

                              {/* Alerta de Stock Disponible para la Serie */}
                              <div className="text-left sm:text-right">
                                {hayFaltante ? (
                                  <span className="text-[11px] font-bold text-amber-700 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg inline-block">
                                    ⚠️ Stock: {stockActualSerie} disp. (+{cantidadSeries - stockActualSerie} bajo pedido)
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-lg inline-block">
                                    🟢 Stock suficiente ({stockActualSerie} disponibles)
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      {/* Vista previa de chips de tallas de la serie con formato de curva */}
                      {productoSeleccionadoObj && productoSeleccionadoObj.tallas && (
                        <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                          {(() => {
                            const getCurvaRatio = (talla: any, tallas: any[]) => {
                              if (talla.ratio && talla.ratio > 0) return talla.ratio;
                              if (talla.cantidadSerie && talla.cantidadSerie > 0) return talla.cantidadSerie;
                              const positive = tallas.map((x: any) => x.cantidad || x.stock || 1).filter((q: number) => q > 0);
                              const minQ = positive.length > 0 ? Math.min(...positive) : 1;
                              return minQ > 0 ? Math.max(1, Math.round((talla.cantidad || talla.stock || 1) / minQ)) : 1;
                            };

                            return (
                              <>
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <span className="text-[10px] font-bold uppercase text-[var(--muted-foreground)] block">
                                    Distribución de Curva ({subtipoSerie === 'MEDIA_DOCENA' ? 'Media Docena' : 'Docena Completa'}):
                                  </span>
                                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                                    Serie: {productoSeleccionadoObj.tallas.map((t: any) => {
                                      const ratio = getCurvaRatio(t, productoSeleccionadoObj.tallas);
                                      const factor = ratio * (subtipoSerie === 'MEDIA_DOCENA' ? 1 : 2) * (cantidadSeries || 1);
                                      return `${factor}/${t.numero ?? t.nombre}`;
                                    }).join(', ')}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {productoSeleccionadoObj.tallas.map((t: any) => {
                                    const ratio = getCurvaRatio(t, productoSeleccionadoObj.tallas);
                                    const factor = ratio * (subtipoSerie === 'MEDIA_DOCENA' ? 1 : 2) * (cantidadSeries || 1);
                                    const stockTalla = t.cantidad ?? t.stock ?? 0;
                                    return (
                                      <div key={t.tallaId} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs flex items-center gap-1.5">
                                        <span className="font-bold text-emerald-700">T{t.numero ?? t.nombre}:</span>
                                        <span className="font-black text-emerald-900 bg-emerald-500/20 px-1.5 py-0.5 rounded-md">{factor} pares</span>
                                        <span className="text-[9px] text-[var(--muted-foreground)] font-semibold">(Stock: {stockTalla})</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : tipoVentaItem === 'SERIE_ESPECIAL' ? (
                    /* Pedido Especial de Serie No Existente en Stock / Fabricación Proveedor */
                    <div className="sm:col-span-2 space-y-3 p-3.5 bg-purple-500/5 border border-purple-500/25 rounded-xl">
                      <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <span>⭐ Solicitar Otra Serie (Bajo Pedido a Proveedor)</span>
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          Para Fabricación / Compra
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                            Seleccionar Serie a Pedir *
                          </label>
                          <select
                            value={serieEspecialId}
                            onChange={(e) => setSerieEspecialId(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-purple-600"
                          >
                            {listaSeriesDisponibles.map((s) => {
                              const tallasInfo = s.tallas && s.tallas.length > 0
                                ? `(${s.tallas[0].numero}-${s.tallas[s.tallas.length - 1].numero})`
                                : '';
                              return (
                                <option key={s.id} value={s.id}>
                                  {s.nombre.replace(/_/g, ' ')} {tallasInfo}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                            Curva de Serie
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSubtipoSerie('MEDIA_DOCENA')}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border text-center ${
                                subtipoSerie === 'MEDIA_DOCENA'
                                  ? 'bg-purple-600 text-white border-transparent shadow-xs'
                                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-purple-500'
                              }`}
                            >
                              ½ Media Docena (6)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSubtipoSerie('DOCENA')}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border text-center ${
                                subtipoSerie === 'DOCENA'
                                  ? 'bg-purple-600 text-white border-transparent shadow-xs'
                                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-purple-500'
                              }`}
                            >
                              1 Docena (12)
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-[var(--muted-foreground)]">
                            Cantidad de {subtipoSerie === 'MEDIA_DOCENA' ? 'medias docenas' : 'docenas'}:
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setCantidadSeries(Math.max(1, (cantidadSeries || 1) - 1))}
                              className="w-7 h-7 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={cantidadSeries}
                              onChange={(e) => setCantidadSeries(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-14 h-7 text-center font-bold text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => setCantidadSeries((cantidadSeries || 1) + 1)}
                              className="w-7 h-7 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <span className="text-xs font-black text-purple-800">
                          Total: {(subtipoSerie === 'MEDIA_DOCENA' ? 6 : 12) * (cantidadSeries || 1)} pares especiales
                        </span>
                      </div>

                      <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[11px] text-purple-900 flex items-center gap-2">
                        <span>ℹ️</span>
                        <span>
                          Este artículo se registrará con la etiqueta <strong>[Bajo Pedido]</strong> y podrá enviarse directamente a un proveedor para su fabricación.
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Venta por Talla Específica (Numeración con Chips Interactivos y Stock de Pares) */
                    <div className="sm:col-span-2 space-y-3 p-3.5 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--foreground)] block">
                          👟 Asigna la cantidad de pares por cada talla:
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">
                          Se indica el stock de pares disponibles por número
                        </span>
                      </div>

                      {productoSeleccionadoObj && productoSeleccionadoObj.tallas ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {productoSeleccionadoObj.tallas.map((t: any) => {
                            const cantActual = tallaCantidadesMap[t.tallaId] || 0;
                            const stockBodega = t.cantidad ?? t.stock ?? 0;
                            const excedeStock = cantActual > stockBodega;
                            return (
                              <div
                                key={t.tallaId}
                                className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 transition-all ${
                                  cantActual > 0
                                    ? 'bg-[#0F172A]/5 border-[#0F172A]/40 shadow-sm'
                                    : 'bg-[var(--card)] border-[var(--border)]'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-xs">Talla #{t.numero ?? t.nombre}</span>
                                  {stockBodega > 0 ? (
                                    <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded text-[9px] font-bold">
                                      {stockBodega} {stockBodega === 1 ? 'par' : 'pares'}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded text-[9px] font-bold">
                                      0 pares
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 justify-center py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setTallaCantidadesMap({ ...tallaCantidadesMap, [t.tallaId]: Math.max(0, cantActual - 1) })}
                                    className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)] transition-colors"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={cantActual}
                                    onChange={(e) => setTallaCantidadesMap({ ...tallaCantidadesMap, [t.tallaId]: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className="w-12 h-7 text-center font-bold text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[#0F172A]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setTallaCantidadesMap({ ...tallaCantidadesMap, [t.tallaId]: cantActual + 1 })}
                                    className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)] transition-colors"
                                  >
                                    +
                                  </button>
                                </div>

                                {excedeStock && cantActual > 0 && (
                                  <span className="text-[9px] text-amber-600 font-semibold text-center leading-tight">
                                    ⚠️ {stockBodega} Bodega + {cantActual - stockBodega} Pedido
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--muted-foreground)]">Selecciona un modelo arriba para cargar sus tallas.</p>
                      )}
                    </div>
                  )}

                  {/* Precio Unitario */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[var(--muted-foreground)]">
                        Precio Unitario de Venta ($)
                      </label>
                      {!puedeCambiarPrecio && (
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                          <Lock size={10} /> Fijado por catálogo (Solo Admin puede modificar)
                        </span>
                      )}
                    </div>
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
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none ${
                        !puedeCambiarPrecio
                          ? 'bg-[var(--muted)]/40 border-[var(--border)] text-[var(--muted-foreground)] cursor-not-allowed'
                          : 'bg-[var(--card)] border-[var(--border)] focus:border-[#0F172A] text-[var(--foreground)]'
                      }`}
                    />
                  </div>
                </div>

                {/* Información de último precio al cliente */}
                {ultimoPrecioCliente !== null && selectedProductId && clientId && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                    <span className="text-emerald-600 text-lg">✅</span>
                    <div className="text-[11px]">
                      <span className="font-bold text-emerald-700">Precio auto-aplicado del historial del cliente: </span>
                      <span className="font-black text-emerald-800">${ultimoPrecioCliente.toFixed(2)}</span>
                      {fechaUltimaVenta && <span className="text-emerald-600 ml-1">(ultima compra: {fechaUltimaVenta})</span>}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAgregarLinea}
                  disabled={!selectedProductId}
                  className="w-full py-2.5 bg-[#0F172A]/10 text-[#0F172A] border border-[#0F172A]/20 hover:bg-[#0F172A] hover:text-white transition-all font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> {tipoVentaItem === 'SERIE_COMPLETA' ? 'Agregar Serie Completa al Pedido' : 'Agregar Numeración Seleccionada al Pedido'}
                </button>
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

                                {/* Chips de Tallas Interactivos y Editables T34: [-] 2 [+], T35: [-] 2 [+]... */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  {lineas.map((l, i) => (
                                    <div
                                      key={i}
                                      className="px-2 py-1 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                                    >
                                      <span className="font-extrabold text-[11px]">T{l.numeroTalla}:</span>
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
                                        className="w-4 h-4 bg-emerald-500/20 hover:bg-emerald-500/40 rounded flex items-center justify-center font-black text-[11px] cursor-pointer"
                                        title="Disminuir 1 par"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="1"
                                        value={l.cantidad}
                                        onChange={(e) => {
                                          const val = Math.max(1, parseInt(e.target.value) || 1);
                                          const nuevasLineas = [...lineasPedido];
                                          const idx = nuevasLineas.findIndex(
                                            (item) => item.productId === l.productId && item.tallaId === l.tallaId && item.tipoVenta === l.tipoVenta
                                          );
                                          if (idx !== -1) {
                                            nuevasLineas[idx].cantidad = val;
                                            setLineasPedido(nuevasLineas);
                                          }
                                        }}
                                        className="w-8 h-5 text-center font-black bg-[var(--card)] border border-emerald-500/40 rounded text-xs text-[var(--foreground)] font-mono"
                                      />
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
                                        className="w-4 h-4 bg-emerald-500/20 hover:bg-emerald-500/40 rounded flex items-center justify-center font-black text-[11px] cursor-pointer"
                                        title="Aumentar 1 par"
                                      >
                                        +
                                      </button>
                                    </div>
                                  ))}
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
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-colors"
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

              {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">{errorMsg}</div>}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-[var(--muted-foreground)]">Monto Total: </span>
                <span className="font-black text-base text-emerald-600">
                  ${lineasPedido.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0).toFixed(2)}
                </span>
              </div>

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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
    </div>
  );
}
