import { useState, useEffect } from 'react';
import { db, type LocalClient } from '../db/local-db';
import { ApiService } from '../services/api.service';
import { Search, ShieldAlert, Award, TrendingUp, DollarSign, Loader2, Plus } from 'lucide-react';

interface ClientesProps {
  online: boolean;
}

export default function ClientesComponent({ online }: ClientesProps) {
  const [clients, setClients] = useState<LocalClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<LocalClient | null>(null);

  // Formulario Nuevo Cliente
  const [showAddModal, setShowAddModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [ruc, setRuc] = useState('');
  const [cedula, setCedula] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, [online]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!nombre || !apellido || !telefono) {
      setErrorMsg('Nombre, Apellido y Teléfono son campos obligatorios.');
      return;
    }

    const payload = {
      nombre,
      apellido,
      telefono,
      email: email || undefined,
      ruc: ruc || undefined,
      cedula: cedula || undefined,
      direccion: direccion || undefined,
      notas: notas || undefined,
    };

    setSaving(true);
    try {
      if (online) {
        await ApiService.post('/clientes', payload);
      } else {
        const offlineId = `offline-${Date.now()}`;
        await db.clientes.add({
          id: offlineId,
          nombre: `${nombre} ${apellido}`,
          cedula: cedula || ruc || 'S/N',
          email: email || undefined,
          telefono,
          limiteCredito: 0,
          cupoDisponible: 0,
          score: 100,
          nivelCredito: 'SIN_CREDITO',
        });
      }

      setShowAddModal(false);
      resetForm();
      loadClients();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setApellido('');
    setTelefono('');
    setEmail('');
    setRuc('');
    setCedula('');
    setDireccion('');
    setNotas('');
    setErrorMsg('');
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      if (online) {
        const remoteClients = await ApiService.get('/clientes');
        setClients(remoteClients);

        await db.clientes.clear();
        await db.clientes.bulkAdd(remoteClients);
      } else {
        const localClients = await db.clientes.toArray();
        setClients(localClients);
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      const localClients = await db.clientes.toArray();
      setClients(localClients);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
    if (score >= 40) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
  };

  const getBadgeColor = (nivel: string) => {
    switch (nivel.toUpperCase()) {
      case 'ORO':
      case 'EXCELENTE':
        return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold';
      case 'PLATA':
      case 'BUENO':
        return 'bg-slate-300 text-slate-800 font-bold';
      default:
        return 'bg-amber-700 text-white font-bold';
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cedula.includes(searchTerm),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Listado de Clientes */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Gestión de Clientes</h3>
            <p className="text-xs text-muted-foreground">Scoring Crediticio e Historial de Calificación de Comerciantes</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            <span>Agregar Cliente</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Buscar cliente por cédula o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Tabla / Lista */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="animate-spin text-primary mb-2" size={32} />
            <span className="text-sm">Cargando clientes...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-2xl">
            No se encontraron clientes registrados.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Cédula</th>
                    <th className="px-6 py-4 text-center">Nivel</th>
                    <th className="px-6 py-4 text-center">Score</th>
                    <th className="px-6 py-4 text-right">Cupo Disponible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`hover:bg-muted/30 cursor-pointer transition-colors ${
                        selectedClient?.id === client.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-bold">{client.nombre}</td>
                      <td className="px-6 py-4 text-muted-foreground">{client.cedula}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${getBadgeColor(client.nivelCredito)}`}>
                          {client.nivelCredito}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getScoreColor(client.score)}`}>
                          {client.score} pts
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-700 dark:text-slate-200">
                        ${Number(client.cupoDisponible).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Panel Detalle Scoring (Derecha) */}
      <div className="space-y-6">
        <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Perfil Crediticio</h4>

        {selectedClient ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            {/* Cabecera del Perfil */}
            <div className="text-center pb-4 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl mx-auto mb-3">
                {selectedClient.nombre.slice(0, 2).toUpperCase()}
              </div>
              <h4 className="font-bold text-md leading-tight">{selectedClient.nombre}</h4>
              <p className="text-xs text-muted-foreground mt-1">C.I. {selectedClient.cedula}</p>
            </div>

            {/* Score Crediticio Premium */}
            <div className="p-4 bg-muted/30 rounded-2xl border border-border flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Score NEXORA</span>
                <div className="text-3xl font-black">{selectedClient.score} <span className="text-xs text-muted-foreground">/ 100</span></div>
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${getScoreColor(selectedClient.score)}`}>
                {selectedClient.score >= 80 ? 'Excelente' : selectedClient.score >= 60 ? 'Bueno' : selectedClient.score >= 40 ? 'Regular' : 'Riesgoso'}
              </span>
            </div>

            {/* Detalles de Cupo */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><DollarSign size={14} /> Cupo Disponible</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">${Number(selectedClient.cupoDisponible).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><ShieldAlert size={14} /> Límite de Crédito</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">${Number(selectedClient.limiteCredito).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Award size={14} /> Nivel Crediticio</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${getBadgeColor(selectedClient.nivelCredito)}`}>
                  {selectedClient.nivelCredito}
                </span>
              </div>
            </div>

            {/* Gráfico Historial (Simulado) */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} /> Comportamiento de Pago
              </div>
              
              {/* Barras de Historial */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Último Pago a Tiempo</span>
                  <span className="text-emerald-500 font-semibold">+5 pts</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Días de Atraso Promedio</span>
                  <span className="text-slate-700 dark:text-slate-200 font-semibold">1.2 días</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border border-dashed rounded-2xl">
            Selecciona un cliente de la lista para ver su perfil crediticio y score.
          </div>
        )}
      </div>
      {/* MODAL AGREGAR CLIENTE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <h3 className="font-bold text-lg">Registrar Nuevo Cliente</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm">Cerrar</button>
            </div>
            <form onSubmit={handleCreateClient} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Nombre *</label>
                  <input type="text" required placeholder="Ej. Juan" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Apellido *</label>
                  <input type="text" required placeholder="Ej. Pérez" value={apellido} onChange={(e) => setApellido(e.target.value)} className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Teléfono *</label>
                  <input type="text" required placeholder="Ej. 0991234567" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Cédula</label>
                  <input type="text" placeholder="Ej. 0950123456" value={cedula} onChange={(e) => setCedula(e.target.value)} className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">RUC</label>
                  <input type="text" placeholder="Ej. 0950123456001" value={ruc} onChange={(e) => setRuc(e.target.value)} className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Email</label>
                  <input type="email" placeholder="Ej. juan@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Dirección</label>
                <input type="text" placeholder="Ej. Av. Principal 123" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Notas</label>
                <textarea placeholder="Observaciones del cliente..." value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] resize-none" />
              </div>
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">{errorMsg}</div>
              )}
              <button type="submit" disabled={saving} className="w-full py-3 bg-[var(--primary)] text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? 'Guardando...' : 'Registrar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
