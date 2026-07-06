"use client";

import { useState, useEffect } from 'react';
import { ApiService } from '../services/api.service';
import { db } from '../db/local-db';
import { Truck, Plus, Loader2, CheckCircle, Clock } from 'lucide-react';

interface ProveedoresProps { online: boolean; }

interface Proveedor { id: string; nombre: string; ruc: string; ciudad: string; }
interface OrdenCompra { id: string; numero: number; supplierId: string; total: number; estado: string; createdAt: string; }
interface IngresoMercancia { supplierId: string; lineas: Array<{ productId: string; tallaId: string; cantidadIngresada: number; precioCosto: number; }>; }

export default function ProveedoresComponent({ online }: ProveedoresProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ordenes' | 'ingreso'>('ordenes');

  // Ingreso de mercancía
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [productId, setProductId] = useState('');
  const [tallaId, setTallaId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [savingIngreso, setSavingIngreso] = useState(false);
  const [ingresoSuccess, setIngresoSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { loadData(); }, [online]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (online) {
        const [prvs, ords] = await Promise.all([
          ApiService.get('/proveedores'),
          ApiService.get('/ordenes-compra'),
        ]);
        setProveedores(prvs);
        setOrdenes(ords);
      }
    } catch (err) {
      console.error('Error al cargar datos de proveedores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarIngreso = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedSupplier || !productId || !tallaId || !cantidad || !precioCosto) {
      setErrorMsg('Todos los campos son obligatorios.');
      return;
    }
    setSavingIngreso(true);
    try {
      await ApiService.post('/merchandise-entries', {
        supplierId: selectedSupplier,
        lineas: [{ productId, tallaId, cantidadIngresada: parseInt(cantidad), precioCosto: parseFloat(precioCosto) }],
      });
      setIngresoSuccess(true);
      setProductId(''); setTallaId(''); setCantidad(''); setPrecioCosto('');
      setTimeout(() => setIngresoSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar el ingreso.');
    } finally {
      setSavingIngreso(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold">Proveedores y Gestión de Compras</h3>
        <p className="text-xs text-[var(--muted-foreground)]">Órdenes de compra e ingresos de mercancía a bodega</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {([['ordenes', 'Órdenes de Compra'], ['ingreso', 'Ingresar Mercancía']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Pestaña: Órdenes de Compra */}
      {activeTab === 'ordenes' && (
        loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
            <Loader2 className="animate-spin text-[var(--primary)] mb-2" size={32} />
            <span className="text-sm">Cargando órdenes...</span>
          </div>
        ) : ordenes.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
            {online ? 'No hay órdenes de compra registradas.' : 'Sin conexión a internet.'}
          </div>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--muted)]/40 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-6 py-4">N° Orden</th>
                    <th className="px-6 py-4">Proveedor</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {ordenes.map((o) => (
                    <tr key={o.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-6 py-4 font-bold">OC-{o.numero}</td>
                      <td className="px-6 py-4 text-[var(--muted-foreground)] text-xs">{o.supplierId.slice(0, 8).toUpperCase()}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${
                          o.estado === 'RECIBIDA' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {o.estado === 'RECIBIDA' ? <CheckCircle size={11} /> : <Clock size={11} />}
                          {o.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold">${Number(o.total).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-[10px] text-[var(--muted-foreground)]">
                        {new Date(o.createdAt).toLocaleDateString('es-EC')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Pestaña: Ingreso de Mercancía */}
      {activeTab === 'ingreso' && (
        <div className="max-w-lg">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
            <h4 className="font-bold">Registro Manual de Ingreso a Bodega</h4>
            <p className="text-xs text-[var(--muted-foreground)]">
              Al registrar el ingreso, el sistema actualizará automáticamente el stock físico del producto seleccionado y generará la cuenta por pagar al proveedor.
            </p>

            {ingresoSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl flex items-center gap-2">
                <CheckCircle size={16} /> Ingreso registrado exitosamente. Stock e inventario actualizados de forma automática.
              </div>
            )}

            {!online && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs rounded-xl">
                ⚠️ Sin conexión: el registro de ingresos requiere estar en línea.
              </div>
            )}

            <form onSubmit={handleRegistrarIngreso} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Proveedor *</label>
                <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} disabled={!online}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] disabled:opacity-60">
                  <option value="">Seleccione un proveedor</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.ruc})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">ID del Producto (UUID) *</label>
                <input type="text" placeholder="UUID del producto registrado" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!online}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] disabled:opacity-60" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">ID Talla *</label>
                  <input type="text" placeholder="UUID talla" value={tallaId} onChange={(e) => setTallaId(e.target.value)} disabled={!online}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Cantidad *</label>
                  <input type="number" min="1" placeholder="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} disabled={!online}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Precio Costo *</label>
                  <input type="number" step="0.01" placeholder="0.00" value={precioCosto} onChange={(e) => setPrecioCosto(e.target.value)} disabled={!online}
                    className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] disabled:opacity-60" />
                </div>
              </div>
              {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">{errorMsg}</div>}
              <button type="submit" disabled={savingIngreso || !online}
                className="w-full py-3 bg-[var(--primary)] text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {savingIngreso ? <><Loader2 size={14} className="animate-spin" />Registrando...</> : <><Truck size={14} />Registrar Ingreso a Bodega</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
