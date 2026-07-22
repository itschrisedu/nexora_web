"use client";

import { useState, useEffect } from 'react';
import { ApiService } from '../services/api.service';
import { DollarSign, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface FinancieroProps { online: boolean; }

type EstadoCobro = 'PENDIENTE' | 'PARCIALMENTE_PAGADO' | 'PAGADO' | 'VENCIDO';

interface Cobro {
  id: string;
  numeroCobro: string;
  clientId: string;
  montoOriginal: number;
  saldoPendiente: number;
  estado: EstadoCobro;
  fechaVencimiento?: string;
}

const COBRO_ESTADO: Record<EstadoCobro, { label: string; color: string }> = {
  PENDIENTE:            { label: 'Pendiente',       color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  PARCIALMENTE_PAGADO:  { label: 'Parcial',          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  PAGADO:               { label: 'Pagado',           color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  VENCIDO:              { label: 'Vencido',          color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

export default function FinancieroComponent({ online }: FinancieroProps) {
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
        const data = await ApiService.get('/cobros');
        setCobros(data);
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
      await ApiService.post(`/cobros/${selectedCobro.id}/abonos`, { monto: parseFloat(monto) });
      alert('Abono registrado exitosamente.');
      setSelectedCobro(null);
      setMonto('');
      loadCobros();
    } catch (err: any) {
      alert(err.message || 'Error al registrar abono.');
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
      alert('Devolución de cliente registrada exitosamente.');
      setShowDevolucionModal(false);
      setSelectedCobro(null);
      setMotivoDevolucion('');
      setMontoDevolucion('');
      loadCobros();
    } catch (err: any) {
      alert(err.message || 'Error al registrar devolución.');
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
          <h3 className="text-xl font-bold">Cobros y Cuentas por Cobrar</h3>
          <p className="text-xs text-[var(--muted-foreground)]">Registro de abonos y seguimiento de cartera</p>
        </div>
        <div className="px-5 py-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-sm">
          <span className="text-[var(--muted-foreground)] text-xs">Saldo Total Pendiente: </span>
          <span className="font-extrabold text-red-500">${cobrosTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {(['TODOS', 'PENDIENTE', 'PARCIALMENTE_PAGADO', 'PAGADO', 'VENCIDO'] as const).map((e) => (
          <button key={e} onClick={() => setFiltro(e)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              filtro === e
                ? 'bg-[var(--primary)] text-white border-transparent'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
            }`}>
            {e === 'TODOS' ? 'Todos' : COBRO_ESTADO[e].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Cobros */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
              <Loader2 className="animate-spin text-[var(--primary)] mb-2" size={32} />
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
                      const cfg = COBRO_ESTADO[cobro.estado];
                      return (
                        <tr key={cobro.id}
                          onClick={() => setSelectedCobro(cobro)}
                          className={`hover:bg-[var(--muted)]/30 cursor-pointer transition-colors ${selectedCobro?.id === cobro.id ? 'bg-[var(--primary)]/5' : ''}`}>
                          <td className="px-5 py-4 font-bold">{cobro.numeroCobro}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                          </td>
                          <td className="px-5 py-4 text-right text-[var(--muted-foreground)]">${Number(cobro.montoOriginal).toFixed(2)}</td>
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
                <div className="font-bold">{selectedCobro.numeroCobro}</div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">Saldo Pendiente</span>
                  <span className="font-extrabold text-red-500">${Number(selectedCobro.saldoPendiente).toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Monto del Abono ($)</label>
                <input type="number" step="0.01" min="0.01" max={selectedCobro.saldoPendiente} placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
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
                Devolución de Cliente — {selectedCobro.numeroCobro}
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
