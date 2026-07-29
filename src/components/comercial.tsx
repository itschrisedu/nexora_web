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

  useEffect(() => { loadPedidos(); }, [online]);

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

      {/* Modal Nuevo Pedido (Offline Compatible) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <h3 className="font-bold text-lg">Nuevo Pedido</h3>
              <button onClick={() => setShowModal(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm">Cerrar</button>
            </div>
            <div className="p-6 space-y-4">
              {!online && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs rounded-xl">
                  📡 Modo Offline: El pedido se guardará localmente y se sincronizará cuando vuelva la conexión.
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">ID del Cliente *</label>
                <input type="text" required placeholder="UUID del cliente registrado" value={clientId} onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Tipo de Pago *</label>
                <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]">
                  <option value="CONTADO">Contado</option>
                  <option value="CREDITO">Crédito</option>
                </select>
              </div>
              {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">{errorMsg}</div>}
              <div className="flex gap-3 pt-2">
                {online ? (
                  <button onClick={() => { alert('Implementar formulario de líneas completo para pedido online.'); }}
                    className="flex-1 py-2.5 bg-[var(--primary)] text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity">
                    Crear Pedido Online
                  </button>
                ) : (
                  <button onClick={handleGuardarOffline} disabled={savingOffline}
                    className="flex-1 py-2.5 bg-amber-500 text-slate-900 font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
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
