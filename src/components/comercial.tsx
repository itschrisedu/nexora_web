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
} from 'lucide-react';

interface ComercialProps {
  online: boolean;
  userRole?: string;
  userPermissions?: { permiteCambiarPrecio?: boolean; rol?: string };
}

type EstadoPedido = 'PENDIENTE' | 'EN_PREPARACION' | 'EN_TRANSITO' | 'ENTREGADO' | 'CANCELADO';

interface Pedido {
  id: string;
  numero: number;
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
  PENDIENTE:       { label: 'Pendiente',      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',     icon: <Clock size={12} /> },
  EN_PREPARACION:  { label: 'En Preparación', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',        icon: <Package size={12} /> },
  EN_TRANSITO:     { label: 'En Tránsito',    color: 'bg-sky-500/10 text-sky-600 border-sky-500/20',  icon: <Truck size={12} /> },
  ENTREGADO:       { label: 'Entregado',      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: <CheckCircle size={12} /> },
  CANCELADO:       { label: 'Cancelado',      color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',        icon: <XCircle size={12} /> },
};

export default function ComercialComponent({ online, userRole, userPermissions }: ComercialProps) {
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

  // Búsqueda de clientes con Debounce de 3 segundos
  const [listaClientes, setListaClientes] = useState<{ id: string; nombre: string; cedula?: string; telefono?: string }[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [esperandoDebounce, setEsperandoDebounce] = useState(false);
  const [showDropdownCliente, setShowDropdownCliente] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<{ id: string; nombre: string; cedula?: string } | null>(null);

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
      tipoVenta: 'SERIE_COMPLETA' | 'TALLA_ESPECIFICA';
      subtipoSerie?: 'MEDIA_DOCENA' | 'DOCENA';
      cantidadSeries?: number;
    }[]
  >([]);

  // Selección de Producto actual para agregar
  const [selectedProductId, setSelectedProductId] = useState('');
  const [precioItem, setPrecioItem] = useState(0);
  const [tipoVentaItem, setTipoVentaItem] = useState<'SERIE_COMPLETA' | 'TALLA_ESPECIFICA'>('SERIE_COMPLETA');
  const [subtipoSerie, setSubtipoSerie] = useState<'MEDIA_DOCENA' | 'DOCENA'>('MEDIA_DOCENA');
  const [cantidadSeries, setCantidadSeries] = useState(1);
  const [tallaCantidadesMap, setTallaCantidadesMap] = useState<Record<string, number>>({});

  const [canalEntrada, setCanalEntrada] = useState<'VENTA_DIRECTA' | 'POS' | 'CATALOGO_DIGITAL'>('VENTA_DIRECTA');
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
        setUltimoPrecioCliente(data.precioAnterior || null);
        setFechaUltimaVenta(data.fechaUltimaVenta ? new Date(data.fechaUltimaVenta).toLocaleDateString('es-EC') : null);
      } catch {
        setUltimoPrecioCliente(null);
        setFechaUltimaVenta(null);
      }
    };
    fetchUltimoPrecio();
  }, [clientId, selectedProductId, online]);

  useEffect(() => {
    loadPedidos();
    loadListaClientes();
    cargarCatalogo();
  }, [online]);

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
              nombre: `${c.nombre || ''} ${c.apellido || ''}`.trim(),
              cedula: c.cedula || c.ruc || '',
              telefono: c.telefono || '',
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
      setPrecioItem(pObj.salePrice || 0); // Pre-llenar directamente con precio de venta del catálogo
      
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
      setTallaCantidadesMap({});
    }
  };

  const handleAgregarLinea = () => {
    if (!selectedProductId || !productoSeleccionadoObj) {
      alert('Por favor selecciona un producto.');
      return;
    }
    if (precioItem <= 0) {
      alert('El precio unitario debe ser mayor a 0.');
      return;
    }

    const prodObj = productoSeleccionadoObj;

    if (tipoVentaItem === 'SERIE_COMPLETA') {
      if (!prodObj.tallas || prodObj.tallas.length === 0) {
        alert('Este modelo no tiene tallas asociadas en la serie.');
        return;
      }

      const factor = (subtipoSerie === 'MEDIA_DOCENA' ? 1 : 2) * (cantidadSeries || 1);

      const lineasSerie = prodObj.tallas.map((t: any) => ({
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
      }));

      setLineasPedido([...lineasPedido, ...lineasSerie]);
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
        alert('Por favor asigna al menos una talla con cantidad mayor a 0.');
        return;
      }

      setLineasPedido([...lineasPedido, ...lineasNumeracion]);
    }

    // Limpiar selección de producto
    setSelectedProductId('');
    setProductoSeleccionadoObj(null);
    setBusquedaModelo('');
    setPrecioItem(0);
    setTallaCantidadesMap({});
    setCantidadSeries(1);
    setUltimoPrecioCliente(null);
  };

  const handleEliminarLinea = (index: number) => {
    setLineasPedido(lineasPedido.filter((_, i) => i !== index));
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
      await ApiService.post('/pedidos', {
        clientId,
        canal: canalEntrada,
        tipoPago,
        lineas: lineasPedido.map((l) => ({
          productId: l.productId,
          tallaId: l.tallaId,
          cantidad: l.cantidad,
          tipoVenta: l.tipoVenta,
        })),
        notas: notasPedido || undefined,
      });

      alert('¡Pedido creado exitosamente!');
      setShowModal(false);
      // Resetear estado
      setClientId('');
      setClienteSeleccionado(null);
      setLineasPedido([]);
      setNotasPedido('');
      await loadPedidos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear el pedido.');
    } finally {
      setCreatingOrder(false);
    }
  };

  const loadPedidos = async () => {
    setLoading(true);
    try {
      if (online) {
        const data = await ApiService.get('/pedidos');
        setPedidos(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (pedidoId: string, nuevoEstado: string) => {
    try {
      setUpdatingId(pedidoId);
      if (nuevoEstado === 'EN_PREPARACION') {
        await ApiService.post(`/pedidos/${pedidoId}/iniciar-preparacion`, {});
      } else if (nuevoEstado === 'EN_TRANSITO') {
        await ApiService.post(`/pedidos/${pedidoId}/marcar-en-transito`, {});
      } else if (nuevoEstado === 'ENTREGADO') {
        await ApiService.post(`/pedidos/${pedidoId}/confirmar-entrega`, {});
      } else if (nuevoEstado === 'CANCELADO') {
        await ApiService.delete(`/pedidos/${pedidoId}`, { motivo: 'Cancelado por el usuario' });
      }
      await loadPedidos();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el estado del pedido.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleGuardarOffline = async () => {
    if (!clientId) { setErrorMsg('El ID del cliente es obligatorio.'); return; }
    setSavingOffline(true);
    try {
      const offlineOrder = {
        clientId,
        lineas: [],
        tipoPago,
        total: 0,
        createdAt: Date.now(),
        estadoSync: 'PENDIENTE' as const,
      };
      await db.pedidosOffline.add(offlineOrder);
      setShowModal(false);
      setClientId('');
      setClienteSeleccionado(null);
      setBusquedaCliente('');
      alert('Pedido guardado localmente. Se sincronizará cuando haya conexión a internet.');
    } catch (err) {
      setErrorMsg('Error al guardar offline.');
    } finally {
      setSavingOffline(false);
    }
  };

  const pedidosFiltrados = filtroEstado === 'TODOS' ? pedidos : pedidos.filter((p) => p.estado === filtroEstado);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--muted-foreground)] font-medium">Administra y da seguimiento a los pedidos de tus clientes</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
          <Plus size={16} /><span>Nuevo Pedido</span>
        </button>
      </div>

      {/* Filtros de Estado */}
      <div className="flex flex-wrap gap-2">
        {(['TODOS', 'PENDIENTE', 'EN_PREPARACION', 'EN_TRANSITO', 'ENTREGADO', 'CANCELADO'] as const).map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              filtroEstado === estado
                ? 'bg-[#0F172A] text-white border-transparent'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[#0F172A]'
            }`}
          >
            {estado === 'TODOS' ? 'Todos' : ESTADO_CONFIG[estado].label}
          </button>
        ))}
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[#0F172A] mb-2" size={32} />
          <span className="text-sm">Cargando pedidos...</span>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          {online
            ? 'No hay pedidos registrados con este estado.'
            : 'Sin conexión. Los pedidos se cargan desde el servidor.'}
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
                {pedidosFiltrados.map((p) => {
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
                          #{p.numero || p.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[var(--foreground)]">
                          {p.clienteNombre || (p.clientId ? p.clientId.slice(0, 8).toUpperCase() : 'Consumidor Final')}
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
                            ) : p.estado === 'PENDIENTE' ? (
                              <>
                                <button
                                  onClick={() => handleCambiarEstado(p.id, 'EN_PREPARACION')}
                                  title="Iniciar preparación en bodega"
                                  className="px-2.5 py-1 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-blue-600/20 flex items-center gap-1"
                                >
                                  <Package size={12} /> Preparar
                                </button>
                                <button
                                  onClick={() => handleCambiarEstado(p.id, 'CANCELADO')}
                                  title="Cancelar pedido"
                                  className="px-2.5 py-1 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-rose-500/20 flex items-center gap-1"
                                >
                                  <XCircle size={12} /> Cancelar
                                </button>
                              </>
                            ) : p.estado === 'EN_PREPARACION' ? (
                              <>
                                <button
                                  onClick={() => handleCambiarEstado(p.id, 'EN_TRANSITO')}
                                  title="Marcar como enviado en tránsito"
                                  className="px-2.5 py-1 bg-sky-600/10 text-sky-600 hover:bg-sky-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-sky-600/20 flex items-center gap-1"
                                >
                                  <Truck size={12} /> En Tránsito
                                </button>
                                <button
                                  onClick={() => handleCambiarEstado(p.id, 'CANCELADO')}
                                  title="Cancelar pedido"
                                  className="px-2.5 py-1 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-rose-500/20 flex items-center gap-1"
                                >
                                  <XCircle size={12} /> Cancelar
                                </button>
                              </>
                            ) : p.estado === 'EN_TRANSITO' ? (
                              <button
                                onClick={() => handleCambiarEstado(p.id, 'ENTREGADO')}
                                title="Confirmar entrega al cliente"
                                className="px-2.5 py-1 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-emerald-600/20 flex items-center gap-1"
                              >
                                <CheckCircle size={12} /> Entregar
                              </button>
                            ) : p.estado === 'ENTREGADO' ? (
                              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                                <CheckCircle size={12} /> Completado
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-rose-500 flex items-center gap-1">
                                <XCircle size={12} /> Cancelado
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Fila expandible con detalle del pedido */}
                      {isExpanded && (
                        <tr className="bg-[var(--muted)]/20">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl space-y-3">
                              <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                                <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider">
                                  📦 Detalle de Artículos Solicitados — Pedido #{p.numero || p.id.slice(0, 8)}
                                </span>
                                <span className="text-xs font-bold text-[var(--muted-foreground)]">
                                  Cliente: <strong className="text-[var(--foreground)]">{p.clienteNombre}</strong>
                                </span>
                              </div>

                              {p.lines && p.lines.length > 0 ? (
                                <div className="space-y-2">
                                  {(() => {
                                    // Agrupar por productId
                                    const grupos: { [key: string]: any[] } = {};
                                    p.lines.forEach((l: any) => {
                                      const key = `${l.productId}_${l.tipoVenta || 'GENERAL'}`;
                                      if (!grupos[key]) grupos[key] = [];
                                      grupos[key].push(l);
                                    });

                                    return Object.entries(grupos).map(([key, lineas]) => {
                                      const item = lineas[0];
                                      const totalPares = lineas.reduce((sum, l) => sum + l.cantidad, 0);
                                      const subtotal = lineas.reduce((sum, l) => sum + l.subtotal, 0);

                                      return (
                                        <div key={key} className="p-3 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-3">
                                            {item.imageUrl ? (
                                              <img src={item.imageUrl} alt="" className="w-10 h-10 object-cover rounded-lg border border-[var(--border)] shrink-0" />
                                            ) : (
                                              <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center text-sm shrink-0">👟</div>
                                            )}
                                            <div>
                                              <div className="font-bold text-xs text-[var(--foreground)]">
                                                {item.modelName} ({item.color})
                                              </div>
                                              <div className="text-[10px] text-[var(--muted-foreground)]">
                                                Serie: {item.serieNombre || 'Estándar'}
                                              </div>
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {lineas.map((l, idx) => (
                                                  <span key={idx} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded text-[10px] font-bold">
                                                    T{l.numeroTalla}: {l.cantidad}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="text-right">
                                            <div className="text-xs font-bold">{totalPares} pares</div>
                                            <div className="text-[10px] text-[var(--muted-foreground)]">${Number(item.precioUnitario).toFixed(2)} c/u</div>
                                            <div className="text-xs font-black text-emerald-600">${subtotal.toFixed(2)}</div>
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              ) : (
                                <p className="text-xs text-[var(--muted-foreground)] italic">Cargando desglose de productos del pedido...</p>
                              )}
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

      {/* Modal Nuevo Pedido (Completo con Selección de Producto, Modelo, Talla y Debounce de 3s) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--muted)]/20">
              <div>
                <h3 className="font-extrabold text-base">Crear Nuevo Pedido Completo</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Selecciona el cliente, tipo de pago y añade los productos con sus tallas</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setLineasPedido([]);
                  setClienteSeleccionado(null);
                  setClientId('');
                  setBusquedaCliente('');
                }}
                className="p-1.5 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

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
                    {clienteSeleccionado ? (
                      <div className="flex items-center justify-between p-3 bg-[#0F172A]/10 border border-[#0F172A]/30 rounded-xl">
                        <div>
                          <div className="font-bold text-sm text-[var(--foreground)]">{clienteSeleccionado.nombre}</div>
                          {clienteSeleccionado.cedula && <div className="text-[10px] text-[var(--muted-foreground)]">C.I / RUC: {clienteSeleccionado.cedula}</div>}
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
                    ) : (
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
                          <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
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
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setClientId(c.id);
                                    setClienteSeleccionado(c);
                                    setShowDropdownCliente(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#0F172A]/10 transition-colors border-b border-[var(--border)] last:border-none flex justify-between items-center"
                                >
                                  <div>
                                    <span className="font-bold block text-[var(--foreground)]">{c.nombre}</span>
                                    {c.cedula && <span className="text-[10px] text-[var(--muted-foreground)]">C.I: {c.cedula}</span>}
                                  </div>
                                  {c.telefono && <span className="text-[10px] text-[var(--muted-foreground)]">{c.telefono}</span>}
                                </button>
                              ))}
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
                </div>
              </div>

              {/* 2. SECCIÓN AGREGAR PRODUCTO, MODELO Y TALLA */}
              <div className="p-4 bg-[var(--muted)]/20 rounded-xl border border-[var(--border)] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">2. Seleccionar Modelo, Talla y Cantidad</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative sm:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Modelo / Producto * (Buscar por Nombre o Color)</label>
                    {productoSeleccionadoObj ? (
                      <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          {productoSeleccionadoObj.imageUrl ? (
                            <img src={productoSeleccionadoObj.imageUrl} alt="" className="w-10 h-10 object-cover rounded-lg border border-[var(--border)] shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[var(--muted)]/50 flex items-center justify-center text-base shrink-0">👟</div>
                          )}
                          <div>
                            <div className="font-bold text-sm text-[var(--foreground)]">
                              {productoSeleccionadoObj.modelName} — {productoSeleccionadoObj.color}
                            </div>
                            <div className="text-[11px] font-semibold text-emerald-600">
                              Serie: {productoSeleccionadoObj.serieNombre || 'Serie Estándar'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProductoSeleccionadoObj(null);
                            setSelectedProductId('');
                            setBusquedaModelo('');
                            setPrecioItem(0);
                          }}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          Cambiar
                        </button>
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
                              .map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSeleccionarProducto(p)}
                                  className="w-full text-left px-3 py-2.5 text-xs hover:bg-[#0F172A]/10 transition-colors border-b border-[var(--border)] last:border-none flex items-center gap-3 font-bold text-[var(--foreground)]"
                                >
                                  {p.imageUrl ? (
                                    <img src={p.imageUrl} alt="" className="w-10 h-10 object-cover rounded-lg border border-[var(--border)] shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-[var(--muted)]/50 flex items-center justify-center text-sm shrink-0">👟</div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="block font-bold text-[var(--foreground)] truncate">{p.modelName}</span>
                                    <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                      <span className="text-[var(--muted-foreground)] font-medium">Color: <strong className="text-[var(--foreground)]">{p.color}</strong></span>
                                      <span className="text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        Serie: {p.serieNombre || 'Estándar'}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              ))}
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
                    </select>
                  </div>

                  {tipoVentaItem === 'SERIE_COMPLETA' ? (
                    <div className="sm:col-span-2 space-y-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-emerald-700">Seleccionar Curva de Serie:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSubtipoSerie('MEDIA_DOCENA')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              subtipoSerie === 'MEDIA_DOCENA'
                                ? 'bg-emerald-600 text-white border-transparent'
                                : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-emerald-500'
                            }`}
                          >
                            ½ Media Docena (6 pares)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubtipoSerie('DOCENA')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              subtipoSerie === 'DOCENA'
                                ? 'bg-emerald-600 text-white border-transparent'
                                : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-emerald-500'
                            }`}
                          >
                            1 Docena Completa (12 pares)
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-[var(--muted-foreground)] shrink-0">¿Cuántas {subtipoSerie === 'MEDIA_DOCENA' ? 'medias docenas' : 'docenas'}?:</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setCantidadSeries(Math.max(1, (cantidadSeries || 1) - 1))}
                            className="w-7 h-7 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)] transition-colors shadow-sm"
                            title="Reducir cantidad"
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
                            title="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 ml-1">
                          = { (subtipoSerie === 'MEDIA_DOCENA' ? 6 : 12) * (cantidadSeries || 1) } pares en total
                        </span>
                      </div>

                      {/* Vista previa de chips de tallas de la serie con formato de curva (ej. 1/38, 1/39, 2/40...) */}
                      {productoSeleccionadoObj && productoSeleccionadoObj.tallas && (
                        <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="text-[10px] font-bold uppercase text-[var(--muted-foreground)] block">
                              Distribución de Curva ({subtipoSerie === 'MEDIA_DOCENA' ? 'Media Docena' : 'Docena Completa'}):
                            </span>
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                              Serie: {productoSeleccionadoObj.tallas.map((t: any) => {
                                const ratio = t.ratio || t.cantidadSerie || 1;
                                const factor = ratio * (subtipoSerie === 'MEDIA_DOCENA' ? 1 : 2) * (cantidadSeries || 1);
                                return `${factor}/${t.numero ?? t.nombre}`;
                              }).join(', ')}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {productoSeleccionadoObj.tallas.map((t: any) => {
                              const ratio = t.ratio || t.cantidadSerie || 1;
                              const factor = ratio * (subtipoSerie === 'MEDIA_DOCENA' ? 1 : 2) * (cantidadSeries || 1);
                              return (
                                <div key={t.tallaId} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs flex items-center gap-1">
                                  <span className="font-bold text-emerald-700">T{t.numero ?? t.nombre}:</span>
                                  <span className="font-black text-emerald-900 bg-emerald-500/20 px-1.5 py-0.5 rounded-md">{factor}</span>
                                  <span className="text-[9px] text-[var(--muted-foreground)] ml-0.5">(St: {t.cantidad})</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Venta por Talla Específica (Numeración con Chips Interactivos) */
                    <div className="sm:col-span-2 space-y-3 p-3 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl">
                      <span className="text-xs font-bold text-[var(--foreground)] block">
                        👟 Asigna la cantidad de pares por cada talla (Numeración):
                      </span>
                      {productoSeleccionadoObj && productoSeleccionadoObj.tallas ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {productoSeleccionadoObj.tallas.map((t: any) => {
                            const cantActual = tallaCantidadesMap[t.tallaId] || 0;
                            const stockBodega = t.cantidad || 0;
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
                                  <span className="font-bold text-xs">Talla #{t.numero ?? t.nombre}</span>
                                  <span className="text-[10px] text-[var(--muted-foreground)]">Stock: {stockBodega}</span>
                                </div>

                                <div className="flex items-center gap-1 justify-center">
                                  <button
                                    type="button"
                                    onClick={() => setTallaCantidadesMap({ ...tallaCantidadesMap, [t.tallaId]: Math.max(0, cantActual - 1) })}
                                    className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)]"
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
                                    className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center font-bold text-xs hover:bg-[var(--muted)]"
                                  >
                                    +
                                  </button>
                                </div>

                                {excedeStock && cantActual > 0 && (
                                  <span className="text-[9px] text-amber-600 font-semibold text-center leading-tight">
                                    ⚠️ {stockBodega} Bodega + {cantActual - stockBodega} Proveedor
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
                      disabled={!puedeCambiarPrecio}
                      value={precioItem}
                      onChange={(e) => setPrecioItem(parseFloat(e.target.value) || 0)}
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
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2">
                    <span className="text-blue-600 text-lg">💡</span>
                    <div className="text-[11px]">
                      <span className="font-bold text-blue-700">Último precio pagado por este cliente: </span>
                      <span className="font-black text-blue-800">${ultimoPrecioCliente.toFixed(2)}</span>
                      {fechaUltimaVenta && <span className="text-blue-600 ml-1">(el {fechaUltimaVenta})</span>}
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

                                {/* Chips de Tallas estilo Catálogo/Modelos T38: 2, T39: 2, T40: 4... */}
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {lineas.map((l, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-md text-[11px] font-bold">
                                      T{l.numeroTalla}: {l.cantidad}
                                    </span>
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
                    {creatingOrder ? 'Creando Pedido...' : 'Guardar Pedido Completo'}
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
    </div>
  );
}
