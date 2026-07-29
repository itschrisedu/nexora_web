"use client";

import { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface ComercialProps { online: boolean; }

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
}

const ESTADO_CONFIG: Record<EstadoPedido, { label: string; color: string; icon: React.ReactNode }> = {
  PENDIENTE:       { label: 'Pendiente',      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',     icon: <Clock size={12} /> },
  EN_PREPARACION:  { label: 'En Preparación', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',        icon: <Package size={12} /> },
  EN_TRANSITO:     { label: 'En Tránsito',    color: 'bg-sky-500/10 text-sky-600 border-sky-500/20',  icon: <Truck size={12} /> },
  ENTREGADO:       { label: 'Entregado',      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: <CheckCircle size={12} /> },
  CANCELADO:       { label: 'Cancelado',      color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',        icon: <XCircle size={12} /> },
};

export default function ComercialComponent({ online }: ComercialProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | 'TODOS'>('TODOS');

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
    { productId: string; modelName: string; color: string; tallaId: string; numeroTalla: number; cantidad: number; precioUnitario: number; tipoVenta: 'SERIE_COMPLETA' | 'TALLA_ESPECIFICA' }[]
  >([]);

  // Selección de Producto actual para agregar
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedTallaId, setSelectedTallaId] = useState('');
  const [cantidadItem, setCantidadItem] = useState(1);
  const [precioItem, setPrecioItem] = useState(0);
  const [tipoVentaItem, setTipoVentaItem] = useState<'SERIE_COMPLETA' | 'TALLA_ESPECIFICA'>('TALLA_ESPECIFICA');
  const [canalEntrada, setCanalEntrada] = useState<'VENTA_DIRECTA' | 'POS' | 'CATALOGO_DIGITAL'>('VENTA_DIRECTA');
  const [notasPedido, setNotasPedido] = useState('');

  const [creatingOrder, setCreatingOrder] = useState(false);

  // Búsqueda interactiva de Modelos de productos
  const [busquedaModelo, setBusquedaModelo] = useState('');
  const [showDropdownModelo, setShowDropdownModelo] = useState(false);
  const [productoSeleccionadoObj, setProductoSeleccionadoObj] = useState<any | null>(null);

  // Precio sugerido con 30% ganancia, costo del producto y último precio al cliente
  const [costoProdSeleccionado, setCostoProdSeleccionado] = useState(0);
  const [precioSugerido30, setPrecioSugerido30] = useState(0);
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
      const costo = pObj.costPrice || 0;
      const sugerido = Math.round(costo * 1.30 * 100) / 100; // 30% ganancia
      setCostoProdSeleccionado(costo);
      setPrecioSugerido30(sugerido);
      setPrecioItem(sugerido); // Pre-llenar con precio sugerido
      if (pObj.tallas && pObj.tallas.length > 0) {
        setSelectedTallaId(pObj.tallas[0].tallaId);
      } else {
        setSelectedTallaId('');
      }
    } else {
      setSelectedProductId('');
      setProductoSeleccionadoObj(null);
      setCostoProdSeleccionado(0);
      setPrecioSugerido30(0);
      setPrecioItem(0);
    }
  };

  const esPrecioMenorAlCosto = precioItem > 0 && costoProdSeleccionado > 0 && precioItem < costoProdSeleccionado;

  const handleAgregarLinea = () => {
    if (!selectedProductId || cantidadItem <= 0 || precioItem <= 0) {
      alert('Por favor selecciona un producto, cantidad y precio válidos.');
      return;
    }

    const prodObj = catalogoProductos.find((p) => p.id === selectedProductId);
    if (!prodObj) return;

    if (tipoVentaItem === 'SERIE_COMPLETA') {
      if (!prodObj.tallas || prodObj.tallas.length === 0) {
        alert('Este modelo no tiene tallas asociadas en la serie.');
        return;
      }

      // Agregar automáticamente cada talla de la serie con la cantidad indicada
      const lineasSerie = prodObj.tallas.map((t: any) => ({
        productId: prodObj.id,
        modelName: prodObj.modelName,
        color: prodObj.color,
        tallaId: t.tallaId,
        numeroTalla: t.numero,
        cantidad: Number(cantidadItem),
        precioUnitario: Number(precioItem),
        tipoVenta: 'SERIE_COMPLETA' as const,
      }));

      setLineasPedido([...lineasPedido, ...lineasSerie]);
    } else {
      // Venta por talla específica
      if (!selectedTallaId) {
        alert('Por favor selecciona una talla específica.');
        return;
      }

      const tallaObj = prodObj.tallas.find((t: any) => t.tallaId === selectedTallaId);
      if (!tallaObj) return;

      const nuevaLinea = {
        productId: prodObj.id,
        modelName: prodObj.modelName,
        color: prodObj.color,
        tallaId: tallaObj.tallaId,
        numeroTalla: tallaObj.numero,
        cantidad: Number(cantidadItem),
        precioUnitario: Number(precioItem),
        tipoVenta: 'TALLA_ESPECIFICA' as const,
      };

      setLineasPedido([...lineasPedido, nuevaLinea]);
    }

    // Limpiar selección de producto
    setSelectedProductId('');
    setProductoSeleccionadoObj(null);
    setBusquedaModelo('');
    setSelectedTallaId('');
    setCantidadItem(1);
    setPrecioItem(0);
    setCostoProdSeleccionado(0);
    setPrecioSugerido30(0);
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
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
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
                ? 'bg-[var(--primary)] text-white border-transparent'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
            }`}
          >
            {estado === 'TODOS' ? 'Todos' : ESTADO_CONFIG[estado].label}
          </button>
        ))}
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin text-[var(--primary)] mb-2" size={32} />
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
                  const cfg = ESTADO_CONFIG[p.estado];
                  const isUpdating = updatingId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-[var(--muted)]/30 transition-colors cursor-default">
                      <td className="px-6 py-4 font-bold">#{p.numero}</td>
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
                      <td className="px-6 py-4 text-right font-extrabold">${Number(p.montoTotal).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-[10px] text-[var(--muted-foreground)]">
                        {new Date(p.createdAt).toLocaleDateString('es-EC')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isUpdating ? (
                            <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                              <Loader2 size={12} className="animate-spin text-[var(--primary)]" /> Actualizando...
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
                      <div className="flex items-center justify-between p-3 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl">
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
                            className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] pr-24"
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
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--primary)]/10 transition-colors border-b border-[var(--border)] last:border-none flex justify-between items-center"
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
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
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
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]"
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
                        <div>
                          <div className="font-bold text-sm text-[var(--foreground)]">
                            {productoSeleccionadoObj.modelName} — {productoSeleccionadoObj.color}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProductoSeleccionadoObj(null);
                            setSelectedProductId('');
                            setBusquedaModelo('');
                            setCostoProdSeleccionado(0);
                            setPrecioSugerido30(0);
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
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--primary)]"
                        />

                        {showDropdownModelo && busquedaModelo.trim().length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                            {catalogoProductos
                              .filter((p) => {
                                const q = busquedaModelo.toLowerCase().trim();
                                if (!q) return false;
                                return (
                                  p.modelName.toLowerCase().includes(q) ||
                                  (p.color && p.color.toLowerCase().includes(q))
                                );
                              })
                              .map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSeleccionarProducto(p)}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--primary)]/10 transition-colors border-b border-[var(--border)] last:border-none font-bold text-[var(--foreground)]"
                                >
                                  {p.modelName} — {p.color}
                                </button>
                              ))}
                            {catalogoProductos.filter((p) => {
                              const q = busquedaModelo.toLowerCase().trim();
                              if (!q) return false;
                              return (
                                p.modelName.toLowerCase().includes(q) ||
                                (p.color && p.color.toLowerCase().includes(q))
                              );
                            }).length === 0 && (
                              <div className="p-3 text-center text-xs text-[var(--muted-foreground)]">
                                No se encontraron modelos con "{busquedaModelo}".
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
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--primary)]"
                    >
                      <option value="TALLA_ESPECIFICA">👟 Venta por Talla Específica</option>
                      <option value="SERIE_COMPLETA">📦 Venta por Serie Completa (Toda la curva)</option>
                    </select>
                  </div>

                  {tipoVentaItem === 'TALLA_ESPECIFICA' ? (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Talla Disponible *</label>
                      <select
                        value={selectedTallaId}
                        onChange={(e) => setSelectedTallaId(e.target.value)}
                        disabled={!selectedProductId}
                        className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--primary)] disabled:opacity-50"
                      >
                        <option value="">-- Selecciona Talla --</option>
                        {selectedProductId &&
                          catalogoProductos
                            .find((p) => p.id === selectedProductId)
                            ?.tallas.map((t: any) => (
                              <option key={t.tallaId} value={t.tallaId}>
                                Talla #{t.numero} (Stock disponible: {t.cantidad})
                              </option>
                            ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Serie Completa Seleccionada</label>
                      <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 font-semibold flex items-center justify-between">
                        <span>📦 Se incluirán todas las tallas de la serie</span>
                        {selectedProductId && (
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                            {catalogoProductos.find((p) => p.id === selectedProductId)?.tallas?.length || 0} tallas
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Cantidad {tipoVentaItem === 'SERIE_COMPLETA' ? '(por cada talla de la serie)' : ''}</label>
                    <input
                      type="number"
                      min="1"
                      value={cantidadItem}
                      onChange={(e) => setCantidadItem(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Precio Unitario ($)
                      {precioSugerido30 > 0 && (
                        <span className="ml-1 text-[10px] text-emerald-600 font-normal">
                          Sugerido +30%: ${precioSugerido30.toFixed(2)}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={precioItem}
                      placeholder={precioSugerido30 > 0 ? `$${precioSugerido30.toFixed(2)} (30% ganancia)` : '0.00'}
                      onChange={(e) => setPrecioItem(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none ${
                        esPrecioMenorAlCosto
                          ? 'bg-red-50 border-red-500 text-red-700 focus:border-red-600'
                          : 'bg-[var(--card)] border-[var(--border)] focus:border-[var(--primary)]'
                      }`}
                    />
                    {esPrecioMenorAlCosto && (
                      <p className="mt-1 text-[10px] text-red-600 font-bold flex items-center gap-1">
                        ⚠️ ¡ALERTA! El precio ${precioItem.toFixed(2)} es MENOR al costo de compra (${costoProdSeleccionado.toFixed(2)}). Estás perdiendo dinero.
                      </p>
                    )}
                    {costoProdSeleccionado > 0 && !esPrecioMenorAlCosto && precioItem > 0 && (
                      <p className="mt-1 text-[10px] text-emerald-600">
                        ✅ Ganancia: ${(precioItem - costoProdSeleccionado).toFixed(2)} ({((precioItem - costoProdSeleccionado) / costoProdSeleccionado * 100).toFixed(1)}%)
                      </p>
                    )}
                  </div>
                </div>

                {/* Información de último precio al cliente */}
                {ultimoPrecioCliente !== null && selectedProductId && clientId && (
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2">
                    <span className="text-blue-600 text-lg">💡</span>
                    <div className="text-[11px]">
                      <span className="font-bold text-blue-700">Último precio a este cliente: </span>
                      <span className="font-black text-blue-800">${ultimoPrecioCliente.toFixed(2)}</span>
                      {fechaUltimaVenta && <span className="text-blue-600 ml-1">(vendido el {fechaUltimaVenta})</span>}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAgregarLinea}
                  disabled={!selectedProductId || (tipoVentaItem === 'TALLA_ESPECIFICA' && !selectedTallaId)}
                  className="w-full py-2 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)] hover:text-white transition-all font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> {tipoVentaItem === 'SERIE_COMPLETA' ? 'Agregar Serie Completa al Pedido' : 'Agregar Producto al Pedido'}
                </button>
              </div>

              {/* 3. TABLA DE PRODUCTOS EN EL PEDIDO */}
              {lineasPedido.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase">Productos en este pedido ({lineasPedido.length})</span>
                    <span className="text-xs font-bold text-emerald-600">
                      Total: ${lineasPedido.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--muted)]/40 font-semibold uppercase text-[var(--muted-foreground)] text-[10px]">
                        <tr>
                          <th className="px-3 py-2">Modelo / Color</th>
                          <th className="px-3 py-2">Talla</th>
                          <th className="px-3 py-2 text-center">Cant.</th>
                          <th className="px-3 py-2 text-right">Precio</th>
                          <th className="px-3 py-2 text-right">Subtotal</th>
                          <th className="px-3 py-2 text-center">Quitar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {lineasPedido.map((l, idx) => (
                          <tr key={idx} className="hover:bg-[var(--muted)]/20">
                            <td className="px-3 py-2 font-bold">{l.modelName} ({l.color})</td>
                            <td className="px-3 py-2 font-medium text-[var(--muted-foreground)]">Talla #{l.numeroTalla}</td>
                            <td className="px-3 py-2 text-center font-bold">{l.cantidad}</td>
                            <td className="px-3 py-2 text-right">${l.precioUnitario.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-600">${(l.cantidad * l.precioUnitario).toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleEliminarLinea(idx)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <XCircle size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                    className="px-5 py-2 bg-[var(--primary)] text-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
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
