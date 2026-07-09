"use client";

import { useState, useEffect } from 'react';
import { ApiService } from '../services/api.service';
import { db } from '../db/local-db';
import { Truck, Plus, Loader2, CheckCircle, Clock, Trash2, Tag, Calendar, ShieldCheck, Mail, Phone, MapPin, FileText, AlertTriangle } from 'lucide-react';

interface ProveedoresProps {
  online: boolean;
  userRole?: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  ruc: string;
  contacto?: string;
  direccion?: string;
  email?: string;
}

interface OrdenCompra {
  id: string;
  numero: number;
  supplierId: string;
  total: number;
  estado: string;
  createdAt: string;
  supplier?: { nombre: string };
}

export default function ProveedoresComponent({ online, userRole }: ProveedoresProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'proveedores' | 'ordenes' | 'ingreso'>('proveedores');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Modales
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Form: Nuevo Proveedor
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [contacto, setContacto] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');

  // Form: Nueva Orden
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderLines, setOrderLines] = useState<Array<{ productId: string; cantidadPedida: number; precioCosto: number }>>([
    { productId: '', cantidadPedida: 1, precioCosto: 0 },
  ]);

  // Form: Nuevo Ingreso
  const [entrySupplierId, setEntrySupplierId] = useState('');
  const [entryOrderId, setEntryOrderId] = useState('');
  const [entryLines, setEntryLines] = useState<Array<{ productId: string; tallaId: string; cantidadIngresada: number; precioCosto: number }>>([
    { productId: '', tallaId: '', cantidadIngresada: 1, precioCosto: 0 },
  ]);

  useEffect(() => {
    loadData();
  }, [online]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Cargar productos
      let prods = [];
      try {
        if (online) {
          prods = await ApiService.get('/inventario/productos');
        } else {
          prods = await db.productos.toArray();
        }
      } catch (e) {
        prods = await db.productos.toArray();
      }
      setProductos(prods);

      if (online) {
        const [prvs, ords] = await Promise.all([
          ApiService.get('/proveedores'),
          ApiService.get('/proveedores/ordenes-compra'),
        ]);
        setProveedores(prvs);
        setOrdenes(ords);
      }
    } catch (err: any) {
      console.error('Error al cargar datos de proveedores:', err);
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // ── Registrar Proveedor ──────────────────────
  const handleCreateProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!ruc || !razonSocial) {
      setErrorMsg('El RUC y la Razón Social son campos obligatorios.');
      return;
    }

    setSaving(true);
    try {
      await ApiService.post('/proveedores', {
        ruc,
        razonSocial,
        contacto: contacto || undefined,
        direccion: direccion || undefined,
        email: email || undefined,
      });

      setSuccessMsg('Proveedor registrado con éxito.');
      setShowSupplierModal(false);
      resetSupplierForm();
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const resetSupplierForm = () => {
    setRuc('');
    setRazonSocial('');
    setContacto('');
    setDireccion('');
    setEmail('');
  };

  // ── Crear Orden de Compra ────────────────────
  const handleAddOrderLine = () => {
    setOrderLines([...orderLines, { productId: '', cantidadPedida: 1, precioCosto: 0 }]);
  };

  const handleRemoveOrderLine = (index: number) => {
    if (orderLines.length === 1) return;
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };

  const handleOrderLineChange = (index: number, field: string, value: any) => {
    const updated = [...orderLines];
    if (field === 'productId') {
      updated[index].productId = value;
      const prod = productos.find((p) => p.id === value);
      if (prod) {
        updated[index].precioCosto = Number(prod.precioCosto);
      }
    } else if (field === 'cantidadPedida') {
      updated[index].cantidadPedida = parseInt(value) || 1;
    } else if (field === 'precioCosto') {
      updated[index].precioCosto = parseFloat(value) || 0;
    }
    setOrderLines(updated);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!orderSupplierId) {
      setErrorMsg('Seleccione un proveedor.');
      return;
    }

    const invalid = orderLines.some((l) => !l.productId || l.cantidadPedida < 1 || l.precioCosto <= 0);
    if (invalid) {
      setErrorMsg('Asegúrese de rellenar todas las filas con cantidades y precios válidos.');
      return;
    }

    setSaving(true);
    try {
      await ApiService.post('/proveedores/ordenes-compra', {
        supplierId: orderSupplierId,
        lines: orderLines.map((l) => ({
          productId: l.productId,
          cantidadPedida: l.cantidadPedida,
          precioCosto: l.precioCosto,
        })),
      });

      setSuccessMsg('Orden de compra registrada con éxito.');
      setShowOrderModal(false);
      setOrderSupplierId('');
      setOrderLines([{ productId: '', cantidadPedida: 1, precioCosto: 0 }]);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la orden de compra.');
    } finally {
      setSaving(false);
    }
  };

  // ── Registrar Ingreso a Bodega ────────────────
  const handleAddEntryLine = () => {
    setEntryLines([...entryLines, { productId: '', tallaId: '', cantidadIngresada: 1, precioCosto: 0 }]);
  };

  const handleRemoveEntryLine = (index: number) => {
    if (entryLines.length === 1) return;
    setEntryLines(entryLines.filter((_, i) => i !== index));
  };

  const handleEntryLineChange = (index: number, field: string, value: any) => {
    const updated = [...entryLines];
    if (field === 'productId') {
      updated[index].productId = value;
      updated[index].tallaId = '';
      const prod = productos.find((p) => p.id === value);
      if (prod) {
        updated[index].precioCosto = Number(prod.precioCosto);
      }
    } else if (field === 'tallaId') {
      updated[index].tallaId = value;
    } else if (field === 'cantidadIngresada') {
      updated[index].cantidadIngresada = parseInt(value) || 1;
    } else if (field === 'precioCosto') {
      updated[index].precioCosto = parseFloat(value) || 0;
    }
    setEntryLines(updated);
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!entrySupplierId) {
      setErrorMsg('Seleccione un proveedor.');
      return;
    }

    const invalid = entryLines.some((l) => !l.productId || !l.tallaId || l.cantidadIngresada < 1 || l.precioCosto <= 0);
    if (invalid) {
      setErrorMsg('Asegúrese de rellenar todas las filas con tallas, cantidades y precios válidos.');
      return;
    }

    setSaving(true);
    try {
      await ApiService.post('/proveedores/entradas', {
        supplierId: entrySupplierId,
        supplierOrderId: entryOrderId || undefined,
        lines: entryLines.map((l) => ({
          productId: l.productId,
          tallaId: l.tallaId,
          cantidadIngresada: l.cantidadIngresada,
          precioCosto: l.precioCosto,
        })),
      });

      setSuccessMsg('Ingreso de mercancía registrado con éxito. Stock físico actualizado.');
      setEntrySupplierId('');
      setEntryOrderId('');
      setEntryLines([{ productId: '', tallaId: '', cantidadIngresada: 1, precioCosto: 0 }]);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la entrada de bodega.');
    } finally {
      setSaving(false);
    }
  };

  const getTallasForProduct = (productId: string) => {
    const prod = productos.find((p) => p.id === productId);
    return prod && Array.isArray(prod.tallas) ? prod.tallas : [];
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Proveedores & Trazabilidad de Compra</h3>
          <p className="text-xs text-muted-foreground">Gestión de aprovisionamiento, órdenes de compra y recepción en bodega</p>
        </div>

        {online && userRole === 'ROL_ADMIN' && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSupplierModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border bg-card rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Plus size={15} />
              <span>Nuevo Proveedor</span>
            </button>
            <button
              onClick={() => setShowOrderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus size={15} />
              <span>Crear Orden de Compra</span>
            </button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl flex items-center gap-2">
          <ShieldCheck size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {([
          ['proveedores', 'Listado de Proveedores'],
          ['ordenes', 'Órdenes de Compra'],
          ['ingreso', 'Ingresar Mercancía'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="animate-spin text-primary mb-2" size={32} />
          <span className="text-sm">Cargando datos del módulo...</span>
        </div>
      )}

      {/* PESTAÑA: PROVEEDORES */}
      {!loading && activeTab === 'proveedores' && (
        proveedores.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-2xl">
            {online ? 'No se encontraron proveedores registrados.' : 'Sin conexión para sincronizar proveedores.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proveedores.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-sm">{p.nombre}</h4>
                    <span className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-bold font-mono tracking-wider">{p.ruc}</span>
                  </div>
                  <span className="p-2 bg-primary/10 text-primary rounded-xl"><Truck size={16} /></span>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                  {p.contacto && <div className="flex items-center gap-2"><Phone size={13} /><span>{p.contacto}</span></div>}
                  {p.email && <div className="flex items-center gap-2"><Mail size={13} /><span>{p.email}</span></div>}
                  {p.direccion && <div className="flex items-center gap-2"><MapPin size={13} /><span>{p.direccion}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* PESTAÑA: ÓRDENES DE COMPRA */}
      {!loading && activeTab === 'ordenes' && (
        ordenes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-2xl">
            No hay órdenes de compra registradas.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/45 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4">N° Orden</th>
                    <th className="px-6 py-4">Proveedor</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Monto Total</th>
                    <th className="px-6 py-4 text-right">Fecha de Emisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ordenes.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-bold">OC-{String(o.numero).padStart(4, '0')}</td>
                      <td className="px-6 py-4 font-semibold text-xs">
                        {o.supplier?.nombre || proveedores.find((p) => p.id === o.supplierId)?.nombre || 'Proveedor Desconocido'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${
                          o.estado === 'RECIBIDA' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {o.estado === 'RECIBIDA' ? <CheckCircle size={11} /> : <Clock size={11} />}
                          {o.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-primary">${Number(o.total).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-[10px] text-muted-foreground">
                        <div className="flex items-center justify-end gap-1.5"><Calendar size={11} /><span>{new Date(o.createdAt).toLocaleDateString('es-EC')}</span></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* PESTAÑA: INGRESAR MERCANCÍA */}
      {!loading && activeTab === 'ingreso' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h4 className="font-bold text-md flex items-center gap-2"><Truck className="text-primary" size={18} /><span>Recepción de Mercancía en Bodega</span></h4>
              {!online && <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold rounded-lg">Offline: Bloqueado</span>}
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Proveedor Emisor *</label>
                  <select
                    required
                    disabled={!online}
                    value={entrySupplierId}
                    onChange={(e) => setEntrySupplierId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="">Seleccione proveedor</option>
                    {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.ruc})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Orden de Compra Asociada (Opcional)</label>
                  <select
                    disabled={!online || !entrySupplierId}
                    value={entryOrderId}
                    onChange={(e) => setEntryOrderId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="">Sin orden (Ingreso directo)</option>
                    {ordenes
                      .filter((o) => o.supplierId === entrySupplierId && o.estado !== 'RECIBIDA')
                      .map((o) => <option key={o.id} value={o.id}>OC-{String(o.numero).padStart(4, '0')} (${Number(o.total).toFixed(2)})</option>)}
                  </select>
                </div>
              </div>

              {/* Lineas de Ingreso */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detalle del Cargamento</span>
                  <button
                    type="button"
                    disabled={!online}
                    onClick={handleAddEntryLine}
                    className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity font-semibold disabled:opacity-50"
                  >
                    <Plus size={14} />Agregar Producto
                  </button>
                </div>

                <div className="space-y-4">
                  {entryLines.map((line, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-end bg-muted/15 p-4 rounded-xl border border-border relative">
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">Modelo / Calzado</label>
                        <select
                          required
                          disabled={!online}
                          value={line.productId}
                          onChange={(e) => handleEntryLineChange(index, 'productId', e.target.value)}
                          className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
                        >
                          <option value="">Seleccione modelo</option>
                          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.marca} - {p.codigo})</option>)}
                        </select>
                      </div>

                      <div className="w-full sm:w-28">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">Talla</label>
                        <select
                          required
                          disabled={!online || !line.productId}
                          value={line.tallaId}
                          onChange={(e) => handleEntryLineChange(index, 'tallaId', e.target.value)}
                          className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:border-primary disabled:opacity-50"
                        >
                          <option value="">Elegir</option>
                          {getTallasForProduct(line.productId).map((t: any) => (
                            <option key={t.id} value={t.id}>Nro {t.talla} ({t.stock} disp.)</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-24">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          required
                          disabled={!online}
                          value={line.cantidadIngresada}
                          onChange={(e) => handleEntryLineChange(index, 'cantidadIngresada', e.target.value)}
                          className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="w-full sm:w-28">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">Costo Unitario ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          disabled={!online}
                          value={line.precioCosto}
                          onChange={(e) => handleEntryLineChange(index, 'precioCosto', e.target.value)}
                          className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
                        />
                      </div>

                      {entryLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEntryLine(index)}
                          className="p-2 border border-border hover:border-red-500 hover:text-red-500 text-muted-foreground rounded-lg transition-colors bg-card sm:mb-0.5"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !online}
                className="w-full py-3.5 bg-primary text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /><span>Guardando Ingreso...</span></>
                ) : (
                  <><Truck size={16} /><span>Registrar Ingreso y Actualizar Stock</span></>
                )}
              </button>
            </form>
          </div>

          {/* Informativo */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-fit space-y-4">
            <h5 className="font-extrabold text-sm flex items-center gap-2 text-primary"><FileText size={16} /><span>Proceso de Recepción</span></h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              El registro de mercancías actualiza de forma automática el **stock físico** de las tallas especificadas en bodega.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Si se asocia a una **Orden de Compra**, la orden cambiará automáticamente a estado **RECIBIDA** y se generará una cuenta por pagar en el módulo de Cobros & Finanzas.
            </p>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR PROVEEDOR */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Registrar Nuevo Proveedor</h3>
              <button
                onClick={() => { setShowSupplierModal(false); resetSupplierForm(); }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateProveedor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">RUC del Proveedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 1792348574001"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Razón Social / Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Distribuidora CalzaEc S.A."
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Teléfono de Contacto</label>
                <input
                  type="text"
                  placeholder="Ej. 022987654"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email de Ventas</label>
                <input
                  type="email"
                  placeholder="Ej. ventas@calzaec.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Dirección de Oficina/Fábrica</label>
                <input
                  type="text"
                  placeholder="Ej. Av. de los Granados N32 y Colina"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-primary text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /><span>Guardando...</span></>
                ) : (
                  <><Truck size={14} /><span>Registrar Proveedor</span></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR ORDEN DE COMPRA */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Crear Nueva Orden de Compra</h3>
              <button
                onClick={() => { setShowOrderModal(false); setOrderSupplierId(''); setOrderLines([{ productId: '', cantidadPedida: 1, precioCosto: 0 }]); }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Proveedor Aprovisionador *</label>
                <select
                  required
                  value={orderSupplierId}
                  onChange={(e) => setOrderSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Seleccione proveedor</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.ruc})</option>)}
                </select>
              </div>

              {/* Detalle Orden */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Productos de la Orden</span>
                  <button
                    type="button"
                    onClick={handleAddOrderLine}
                    className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity font-semibold"
                  >
                    <Plus size={14} />Agregar Fila
                  </button>
                </div>

                <div className="space-y-3">
                  {orderLines.map((line, index) => (
                    <div key={index} className="flex gap-3 items-end bg-muted/10 p-3 rounded-xl border border-border relative">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">Modelo / Calzado</label>
                        <select
                          required
                          value={line.productId}
                          onChange={(e) => handleOrderLineChange(index, 'productId', e.target.value)}
                          className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
                        >
                          <option value="">Seleccione producto</option>
                          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.marca} - {p.codigo})</option>)}
                        </select>
                      </div>

                      <div className="w-20">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={line.cantidadPedida}
                          onChange={(e) => handleOrderLineChange(index, 'cantidadPedida', e.target.value)}
                          className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="w-24">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">Costo Unit. ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={line.precioCosto}
                          onChange={(e) => handleOrderLineChange(index, 'precioCosto', e.target.value)}
                          className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
                        />
                      </div>

                      {orderLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOrderLine(index)}
                          className="p-2 border border-border hover:border-red-500 hover:text-red-500 text-muted-foreground rounded-lg transition-colors bg-card"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total Estimado: </span>
                  <span className="font-extrabold text-primary text-base">
                    ${orderLines.reduce((sum, l) => sum + (l.cantidadPedida * l.precioCosto), 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Creando Orden...' : 'Emitir Orden de Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
