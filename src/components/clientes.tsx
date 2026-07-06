import { useState, useEffect } from 'react';
import { db, type LocalClient } from '../db/local-db';
import { ApiService } from '../services/api.service';
import { Search, ShieldAlert, Award, TrendingUp, DollarSign, Loader2 } from 'lucide-react';

interface ClientesProps {
  online: boolean;
}

export default function ClientesComponent({ online }: ClientesProps) {
  const [clients, setClients] = useState<LocalClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<LocalClient | null>(null);

  useEffect(() => {
    loadClients();
  }, [online]);

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
        <div>
          <h3 className="text-xl font-bold">Gestión de Clientes</h3>
          <p className="text-xs text-muted-foreground">Scoring Crediticio e Historial de Calificación de Comerciantes</p>
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
    </div>
  );
}
