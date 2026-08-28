"use client";

import { useState, useEffect } from 'react';
import { ApiService } from '../services/api.service';
import { DollarSign, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from './ui/toast';

interface FinancieroProps { online: boolean; }

type EstadoCobro = 'PENDIENTE' | 'PARCIALMENTE_PAGADO' | 'SALDADO' | 'PAGADO' | 'VENCIDO';

interface Cobro {
  id: string;
  numeroCobro?: string;
  clientId: string;
  montoOriginal?: number;
  montoTotal?: number;
  saldoPendiente: number;
  estado: EstadoCobro;
  fechaVencimiento?: string;
  saleNote?: { numero: number; total: number };
}

const COBRO_ESTADO: Record<string, { label: string; color: string }> = {
  PENDIENTE:            { label: 'Pendiente',       color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  PARCIALMENTE_PAGADO:  { label: 'Parcial',          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  PAGADO:               { label: 'Pagado',           color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  SALDADO:              { label: 'Saldado',          color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  VENCIDO:              { label: 'Vencido',          color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

function getCobroConfig(estado?: string) {
  return COBRO_ESTADO[estado || 'PENDIENTE'] || { label: estado || 'Pendiente', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}

export default function FinancieroComponent({ online }: FinancieroProps) {
  const { showToast } = useToast();
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<EstadoCobro | 'TODOS'>('TODOS');
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);
  const [monto, setMonto] = useState('');
  const [savingAbono, setSavingAbono] = useState(false);

  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [montoDevolucion, setMontoDevolucion] = useState('');
  const [savingDevolucion, setSavingDevolucion] = useState(false);

  useEffect(() => { loadCobros(); }, [online]);

  const loadCobros = async () => {
    setLoading(true);
    try {
      if (online) {
        const data = await ApiService.get('/financiero/cobros');
        setCobros(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error al cargar cobros:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarAbono = async () => {
    if (!selectedCobro || !monto) return;
    setSavingAbono(true);
    try {
      await ApiService.post(`/financiero/cobros/${selectedCobro.id}/abono`, { monto: parseFloat(monto), metodo: 'EFECTIVO' });
      showToast('Abono registrado exitosamente.', 'success');
      setSelectedCobro(null);
      setMonto('');
      loadCobros();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar abono.', 'error');
    } finally {
      setSavingAbono(false);
    }
  };

  const handleRegistrarDevolucion = async () => {
    if (!selectedCobro || !montoDevolucion || !motivoDevolucion) return;
    setSavingDevolucion(true);
    try {
      await ApiService.post('/devoluciones/cliente', {
        clientId: selectedCobro.clientId,
        motivo: motivoDevolucion,
        lines: [
          {
            productId: 'sin-especificar',
            tallaId: 'sin-especificar',
            cantidad: 1,
            precioUnitario: parseFloat(montoDevolucion),
          },
        ],
      });
      showToast('Devolución de cliente registrada exitosamente.', 'success');
      setShowDevolucionModal(false);
      setSelectedCobro(null);
      setMotivoDevolucion('');
      setMontoDevolucion('');
      loadCobros();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar devolución.', 'error');
    } finally {
      setSavingDevolucion(false);
    }
  };

  const cobrosTotal = cobros.reduce((acc, c) => acc + Number(c.saldoPendiente), 0);
  const filtrados = filtro === 'TODOS' ? cobros : cobros.filter((c) => c.estado === filtro);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--muted-foreground)] font-medium">Registro de abonos y seguimiento de cartera</p>
        </div>
        <div className="px-5 py-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-sm">
          <span className="text-[var(--muted-foreground)] text-xs">Saldo Total Pendiente: </span>
          <span className="font-extrabold text-red-500">${cobrosTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {(['TODOS', 'PENDIENTE', 'PARCIALMENTE_PAGADO', 'SALDADO', 'PAGADO', 'VENCIDO'] as const).map((e) => (
          <button key={e} onClick={() => setFiltro(e as any)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              filtro === e
                ? 'bg-[#0F172A] text-white border-transparent'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[#0F172A]'
            }`}>
            {e === 'TODOS' ? 'Todos' : getCobroConfig(e).label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Cobros */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
              <Loader2 className="animate-spin text-[#0F172A] mb-2" size={32} />
              <span className="text-sm">Cargando cobros...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              No hay cobros con este estado.
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--muted)]/40 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-5 py-4">N° Cobro</th>
                      <th className="px-5 py-4 text-center">Estado</th>
                      <th className="px-5 py-4 text-right">Monto Original</th>
                      <th className="px-5 py-4 text-right">Saldo Pendiente</th>
                      <th className="px-5 py-4 text-right">Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filtrados.map((cobro) => {
                      const cfg = getCobroConfig(cobro.estado);
                      const num = cobro.numeroCobro || cobro.saleNote?.numero ? `#${cobro.numeroCobro || cobro.saleNote?.numero}` : `#${cobro.id.slice(0, 8).toUpperCase()}`;
                      const montoOrig = Number(cobro.montoOriginal ?? cobro.montoTotal ?? 0);
                      return (
                        <tr key={cobro.id}
                          onClick={() => setSelectedCobro(cobro)}
                          className={`hover:bg-[var(--muted)]/30 cursor-pointer transition-colors ${selectedCobro?.id === cobro.id ? 'bg-[#0F172A]/5' : ''}`}>
                          <td className="px-5 py-4 font-bold">{num}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                          </td>
                          <td className="px-5 py-4 text-right text-[var(--muted-foreground)]">${montoOrig.toFixed(2)}</td>
                          <td className="px-5 py-4 text-right font-extrabold text-red-500">${Number(cobro.saldoPendiente).toFixed(2)}</td>
                          <td className="px-5 py-4 text-right text-[10px] text-[var(--muted-foreground)]">
                            {cobro.fechaVencimiento ? new Date(cobro.fechaVencimiento).toLocaleDateString('es-EC') : '—'}
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

        {/* Panel de Registro de Abono */}
        <div className="space-y-4">
          <h4 className="font-bold text-sm text-[var(--muted-foreground)] uppercase tracking-wider">Registrar Abono</h4>
          {selectedCobro ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="space-y-2 pb-4 border-b border-[var(--border)]">
                <div className="text-xs text-[var(--muted-foreground)]">Cobro seleccionado:</div>
                <div className="font-bold">#{selectedCobro.numeroCobro || selectedCobro.saleNote?.numero || selectedCobro.id.slice(0, 8).toUpperCase()}</div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">Saldo Pendiente</span>
                  <span className="font-extrabold text-red-500">${Number(selectedCobro.saldoPendiente).toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Monto del Abono ($)</label>
                <input type="number" step="0.01" min="0.01" max={selectedCobro.saldoPendiente} placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A]" />
              </div>
              <button onClick={handleRegistrarAbono} disabled={savingAbono || !monto || !online}
                className="w-full py-3 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                {savingAbono ? 'Procesando...' : 'Registrar Abono'}
              </button>
              {selectedCobro && (
                <button
                  onClick={() => setShowDevolucionModal(true)}
                  className="w-full py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-semibold text-xs rounded-xl hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle size={14} />
                  <span>Registrar Devolución de Cliente</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] border-dashed rounded-2xl text-sm">
              Selecciona un cobro de la tabla para registrar un abono o devolución.
            </div>
          )}
        </div>
      </div>

      {/* Modal Devolución de Cliente */}
      {showDevolucionModal && selectedCobro && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-rose-500 flex items-center gap-2">
                <AlertTriangle size={16} />
                Devolución de Cliente — #{selectedCobro.numeroCobro || selectedCobro.saleNote?.numero || selectedCobro.id.slice(0, 8).toUpperCase()}
              </h3>
              <button onClick={() => setShowDevolucionModal(false)} className="text-[var(--muted-foreground)] text-sm">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Motivo de Devolución</label>
                <input
                  type="text"
                  placeholder="Ej. Talla incorrecta, producto defectuoso..."
                  value={motivoDevolucion}
                  onChange={(e) => setMotivoDevolucion(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Monto a Devolver ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCobro.saldoPendiente}
                  placeholder="0.00"
                  value={montoDevolucion}
                  onChange={(e) => setMontoDevolucion(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-bold text-rose-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl text-[11px]">
                💡 La devolución descontará el monto del saldo pendiente y registrará el ajuste contable.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDevolucionModal(false)}
                className="flex-1 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarDevolucion}
                disabled={savingDevolucion || !montoDevolucion || !motivoDevolucion}
                className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 disabled:opacity-50"
              >
                {savingDevolucion ? 'Guardando...' : 'Confirmar Devolución'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
