'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  RefreshCw,
  AlertTriangle,
  Clock,
  Send,
  MessageSquare,
  Mail,
  CheckCircle2,
  Package,
  Truck,
  Building2,
  ChevronRight,
  Filter,
  Copy,
  ExternalLink,
  ShieldAlert,
  Calendar,
  CreditCard,
  User,
  Phone,
  FileText,
  DollarSign,
  Info,
} from 'lucide-react';
import { ApiService } from '@/services/api.service';
import { useToast } from '@/components/ui/toast';

interface NotificacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSucursalId?: string;
  onNavigateToView?: (view: string) => void;
  onRefreshStats?: () => void;
}

export default function NotificacionesModal({
  isOpen,
  onClose,
  activeSucursalId,
  onNavigateToView,
  onRefreshStats,
}: NotificacionesModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'cobros' | 'stock' | 'ordenes' | 'historial'>('cobros');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    metricas: {
      totalAlertas: number;
      totalCobrosVencidos: number;
      totalCobrosPorVencer: number;
      totalStockCritico: number;
      totalOrdenesDemoradas: number;
      totalEnviosEnTransito: number;
      saldoTotalVencido: number;
      saldoTotalPorVencer: number;
    };
    cobrosVencidos: any[];
    cobrosPorVencer: any[];
    stockCritico: any[];
    ordenesProveedor: any[];
    enviosEnTransito: any[];
  }>({
    metricas: {
      totalAlertas: 0,
      totalCobrosVencidos: 0,
      totalCobrosPorVencer: 0,
      totalStockCritico: 0,
      totalOrdenesDemoradas: 0,
      totalEnviosEnTransito: 0,
      saldoTotalVencido: 0,
      saldoTotalPorVencer: 0,
    },
    cobrosVencidos: [],
    cobrosPorVencer: [],
    stockCritico: [],
    ordenesProveedor: [],
    enviosEnTransito: [],
  });

  const [historialLogs, setHistorialLogs] = useState<any[]>([]);
  const [filtroCobro, setFiltroCobro] = useState<'TODOS' | 'VENCIDOS' | 'POR_VENCER'>('TODOS');

  // Modal de Envío de Recordatorio
  const [recordatorioModalOpen, setRecordatorioModalOpen] = useState(false);
  const [selectedCobro, setSelectedCobro] = useState<any | null>(null);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<'PREVENTIVO' | 'FORMAL' | 'URGENTE' | 'PERSONALIZADO'>('FORMAL');
  const [incluirDatosBancarios, setIncluirDatosBancarios] = useState(true);
  const [datosBancarios, setDatosBancarios] = useState({
    banco: 'Banco Pichincha',
    tipoCuenta: 'Cuenta de Ahorros',
    numeroCuenta: '2205498301',
    titular: 'NEXORA CALZADO DE CUERO',
    identificacion: '1801234567001',
  });
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [enviandoRecordatorio, setEnviandoRecordatorio] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarNotificaciones();
    }
  }, [isOpen, activeSucursalId]);

  const cargarNotificaciones = async () => {
    setLoading(true);
    try {
      const sucursalParam = activeSucursalId ? `?sucursalId=${activeSucursalId}` : '';
      const [resumenRes, historialRes] = await Promise.all([
        ApiService.get(`/notificaciones/resumen${sucursalParam}`).catch(() => null),
        ApiService.get('/notificaciones/historial').catch(() => []),
      ]);

      if (resumenRes) {
        setData(resumenRes);
      }
      if (Array.isArray(historialRes)) {
        setHistorialLogs(historialRes);
      }
    } catch (err: any) {
      console.error('Error al cargar notificaciones:', err);
      showToast('No se pudieron sincronizar las notificaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const ejecutarEscaneoManual = async () => {
    try {
      setLoading(true);
      await ApiService.post('/notificaciones/ejecutar-cron-cobros', {});
      await cargarNotificaciones();
      if (onRefreshStats) onRefreshStats();
      showToast('Se actualizaron los estados y alertas de cobros', 'success');
    } catch (err: any) {
      showToast('No se pudo forzar el escaneo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalRecordatorio = (cobro: any) => {
    setSelectedCobro(cobro);
    if (cobro.categoria === 'VENCIDO') {
      if (cobro.diasVencido > 15) setPlantillaSeleccionada('URGENTE');
      else setPlantillaSeleccionada('FORMAL');
    } else {
      setPlantillaSeleccionada('PREVENTIVO');
    }
    setRecordatorioModalOpen(true);
  };

  // Generador dinámico de texto para la vista previa
  const obtenerTextoMensaje = () => {
    if (!selectedCobro) return '';
    if (plantillaSeleccionada === 'PERSONALIZADO' && mensajePersonalizado.trim()) {
      return mensajePersonalizado.trim();
    }

    const cliente = selectedCobro.clienteNombre || 'Estimado/a Cliente';
    const saldo = Number(selectedCobro.saldoPendiente || 0).toFixed(2);
    const nota = selectedCobro.numeroNota || 'S/N';
    const dias = selectedCobro.diasVencido || 0;
    const fechaVencStr = new Date(selectedCobro.fechaVencimiento).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    let bloqueBanco = '';
    if (incluirDatosBancarios && datosBancarios.banco && datosBancarios.numeroCuenta) {
      bloqueBanco = `\n\n🏦 *Cuentas para Transferencia o Depósito:*\n• *Banco:* ${datosBancarios.banco}\n• *Tipo:* ${datosBancarios.tipoCuenta}\n• *Nro:* ${datosBancarios.numeroCuenta}\n• *Titular:* ${datosBancarios.titular}\n• *RUC/CI:* ${datosBancarios.identificacion}`;
    }

    if (plantillaSeleccionada === 'PREVENTIVO') {
      return `👟 *RECORDATORIO DE PAGO — NEXORA*\n\nEstimado/a *${cliente}*,\n\nLe saludamos cordialmente de *NEXORA (Calzado 100% Cuero de Cevallos)*.\n\nLe recordamos amablemente que su compra a crédito con la Nota de Venta *#${nota}* por un saldo de *$${saldo}* tiene fecha programada de pago para el *${fechaVencStr}*.${bloqueBanco}\n\nAgradecemos de antemano su puntualidad para mantener su cupo mayorista siempre activo.\n\n¡Que tenga un excelente día! ✨`;
    }

    if (plantillaSeleccionada === 'FORMAL') {
      return `⚠️ *ESTADO DE CUENTA — AVISO DE COBRO NEXORA*\n\nEstimado/a *${cliente}*,\n\nNos comunicamos de *NEXORA* para informarle que su crédito asociado a la Nota de Venta *#${nota}* presenta un saldo pendiente de *$${saldo}* con *${dias > 0 ? dias : '1'} días de vencimiento* (Fecha límite: ${fechaVencStr}).\n\nLe invitamos a realizar su abono o cancelación para mantener su calificación crediticia activa y seguir disfrutando de precios de fabricante.${bloqueBanco}\n\nSi ya realizó su pago, por favor remítanos su comprobante por este medio.\n\nAtentamente,\n*Departamento de Cartera — NEXORA*`;
    }

    // URGENTE
    return `🚨 *NOTIFICACIÓN DE COBRO URGENTE — NEXORA*\n\nEstimado/a *${cliente}*,\n\nRegistramos un atraso prolongado de *${dias > 0 ? dias : 'más de 15'} días* en el pago de su cuenta pendiente por el valor de *$${saldo}* (Nota de Venta #${nota}).\n\nLe solicitamos comunicarse de manera prioritaria el día de hoy para coordinar la regularización de su saldo y evitar la suspensión definitiva de sus líneas de crédito comercial.${bloqueBanco}\n\nEsperamos su confirmación el día de hoy.\n\n*Área Legal y Cobranzas — NEXORA*`;
  };

  const enviarWhatsAppDirecto = async () => {
    if (!selectedCobro) return;
    setEnviandoRecordatorio(true);
    try {
      const textoFinal = obtenerTextoMensaje();
      const res = await ApiService.post('/notificaciones/recordatorio-cobro', {
        cobroId: selectedCobro.id,
        canal: 'WHATSAPP',
        plantilla: plantillaSeleccionada,
        datosBancarios: incluirDatosBancarios ? datosBancarios : undefined,
        mensajePersonalizado: plantillaSeleccionada === 'PERSONALIZADO' ? mensajePersonalizado : undefined,
      });

      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }

      showToast(`Mensaje de WhatsApp abierto para ${selectedCobro.clienteNombre}`, 'success');
      setRecordatorioModalOpen(false);
      cargarNotificaciones();
    } catch (err: any) {
      showToast(err.message || 'Error al procesar recordatorio', 'error');
    } finally {
      setEnviandoRecordatorio(false);
    }
  };

  const enviarEmailDirecto = async (cobro: any) => {
    if (!cobro.clienteEmail) {
      showToast('Este cliente no tiene un email registrado', 'error');
      return;
    }

    try {
      showToast('Despachando correo formal de cobro...', 'info');
      await ApiService.post('/notificaciones/recordatorio-cobro', {
        cobroId: cobro.id,
        canal: 'EMAIL',
        plantilla: cobro.categoria === 'VENCIDO' ? 'FORMAL' : 'PREVENTIVO',
        datosBancarios,
      });
      showToast(`Notificación enviada a ${cobro.clienteEmail}`, 'success');
      cargarNotificaciones();
    } catch (err: any) {
      showToast(err.message || 'Error al enviar email', 'error');
    }
  };

  if (!isOpen) return null;

  const todosCobros = [...data.cobrosVencidos, ...data.cobrosPorVencer];
  const cobrosFiltrados = todosCobros.filter((c) => {
    if (filtroCobro === 'VENCIDOS') return c.categoria === 'VENCIDO';
    if (filtroCobro === 'POR_VENCER') return c.categoria === 'POR_VENCER' || c.categoria === 'HOY';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-2xl overflow-hidden"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* ── HEADER ── */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--muted)]/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Bell size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Centro de Notificaciones & Cobranza</h2>
                {data.metricas.totalAlertas > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
                    {data.metricas.totalAlertas} {data.metricas.totalAlertas === 1 ? 'alerta' : 'alertas'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] truncate">
                Alertas automáticas de cobros a crédito, stock crítico y despachos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={ejecutarEscaneoManual}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-2xs"
              title="Forzar escaneo en tiempo real"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── KPIS RÁPIDOS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-[var(--muted)]/15 border-b border-[var(--border)] shrink-0">
          <div className="p-2.5 rounded-xl bg-[var(--card)] border border-rose-500/20 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <ShieldAlert size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-black text-rose-500/80">Cobros Vencidos</div>
              <div className="text-sm font-black text-rose-500">${data.metricas.saldoTotalVencido.toFixed(2)}</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">{data.metricas.totalCobrosVencidos} clientes en mora</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[var(--card)] border border-amber-500/20 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-black text-amber-500/80">Por Vencer (3-5d)</div>
              <div className="text-sm font-black text-amber-500">${data.metricas.saldoTotalPorVencer.toFixed(2)}</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">{data.metricas.totalCobrosPorVencer} cobros próximos</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[var(--card)] border border-blue-500/20 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Package size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-black text-blue-500/80">Stock Crítico</div>
              <div className="text-sm font-black text-blue-500">{data.metricas.totalStockCritico} modelos</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">Pares agotándose</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[var(--card)] border border-emerald-500/20 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Truck size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-black text-emerald-500/80">Envíos & Talleres</div>
              <div className="text-sm font-black text-emerald-500">{data.metricas.totalEnviosEnTransito + data.metricas.totalOrdenesDemoradas} activos</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">Seguimiento courier</div>
            </div>
          </div>
        </div>

        {/* ── TABS DE NAVEGACIÓN ── */}
        <div className="flex border-b border-[var(--border)] px-4 bg-[var(--card)] gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('cobros')}
            className={`py-3 px-3.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'cobros'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <DollarSign size={15} />
            <span>Cobros & Recordatorios</span>
            {todosCobros.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">
                {todosCobros.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`py-3 px-3.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'stock'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Package size={15} />
            <span>Stock Crítico</span>
            {data.stockCritico.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {data.stockCritico.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ordenes')}
            className={`py-3 px-3.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ordenes'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Truck size={15} />
            <span>Talleres & Despachos</span>
            {(data.ordenesProveedor.length > 0 || data.enviosEnTransito.length > 0) && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {data.ordenesProveedor.length + data.enviosEnTransito.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`py-3 px-3.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'historial'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <FileText size={15} />
            <span>Bitácora de Envíos</span>
          </button>
        </div>

        {/* ── CONTENIDO PRINCIPAL SCROLLABLE ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* ═════════ TAB 1: COBROS ═════════ */}
          {activeTab === 'cobros' && (
            <div className="space-y-4">
              {/* Filtros de Cobro */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-[var(--muted)]/30 p-2.5 rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-1.5">
                  <Filter size={14} className="text-[var(--muted-foreground)]" />
                  <span className="text-xs font-bold text-[var(--muted-foreground)]">Filtrar por estado:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFiltroCobro('TODOS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      filtroCobro === 'TODOS'
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]'
                    }`}
                  >
                    Todos ({todosCobros.length})
                  </button>
                  <button
                    onClick={() => setFiltroCobro('VENCIDOS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      filtroCobro === 'VENCIDOS'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-[var(--card)] text-rose-500 border border-rose-500/20'
                    }`}
                  >
                    Vencidos ({data.cobrosVencidos.length})
                  </button>
                  <button
                    onClick={() => setFiltroCobro('POR_VENCER')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      filtroCobro === 'POR_VENCER'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-[var(--card)] text-amber-500 border border-amber-500/20'
                    }`}
                  >
                    Próximos a Vencer ({data.cobrosPorVencer.length})
                  </button>
                </div>
              </div>

              {cobrosFiltrados.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-[var(--muted)]/20 border border-[var(--border)]">
                  <CheckCircle2 size={42} className="mx-auto text-emerald-500 mb-2.5" />
                  <h3 className="text-sm font-extrabold">¡Cartera al día!</h3>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-sm mx-auto">
                    No se registran cobros vencidos ni en mora inmediata para la sucursal seleccionada.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {cobrosFiltrados.map((cobro) => {
                    const esVencido = cobro.categoria === 'VENCIDO';
                    return (
                      <div
                        key={cobro.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between shadow-2xs hover:shadow-md ${
                          esVencido
                            ? 'bg-rose-500/5 border-rose-500/20'
                            : 'bg-amber-500/5 border-amber-500/20'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-black text-[var(--foreground)] flex items-center gap-1.5">
                                <User size={14} className="text-[var(--primary)] shrink-0" />
                                <span className="truncate">{cobro.clienteNombre}</span>
                              </div>
                              <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-2 mt-0.5">
                                <span>{cobro.numeroNota}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                  <Building2 size={11} /> {cobro.sucursalNombre}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider shrink-0 ${
                                esVencido
                                  ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                                  : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                              }`}
                            >
                              {esVencido
                                ? `Vencido hace ${cobro.diasVencido}d`
                                : cobro.categoria === 'HOY'
                                ? 'Vence Hoy'
                                : `Vence en ${Math.abs(cobro.diasVencido)}d`}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-between">
                            <div>
                              <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Saldo Pendiente</div>
                              <div className="text-base font-black text-rose-500">${cobro.saldoPendiente.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Total Factura</div>
                              <div className="text-xs font-bold text-[var(--foreground)]">${cobro.montoTotal.toFixed(2)}</div>
                            </div>
                          </div>

                          <div className="text-[11px] text-[var(--muted-foreground)] flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {cobro.clienteTelefono || 'Sin teléfono'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={11} /> Límite: {new Date(cobro.fechaVencimiento).toLocaleDateString('es-EC')}
                            </span>
                          </div>
                        </div>

                        {/* Botones de Cobranza */}
                        <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center gap-2">
                          <button
                            onClick={() => abrirModalRecordatorio(cobro)}
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <MessageSquare size={14} />
                            <span>Cobrar WhatsApp</span>
                          </button>

                          {cobro.clienteEmail && (
                            <button
                              onClick={() => enviarEmailDirecto(cobro)}
                              className="p-2 rounded-lg text-xs font-bold bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors cursor-pointer"
                              title="Enviar recordatorio formal por Email"
                            >
                              <Mail size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═════════ TAB 2: STOCK CRÍTICO ═════════ */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Info size={16} className="shrink-0" />
                <span>
                  Mostrando modelos de calzado con inventario por debajo del stock mínimo ({15} pares) o con tallas agotadas.
                </span>
              </div>

              {data.stockCritico.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-[var(--muted)]/20 border border-[var(--border)]">
                  <CheckCircle2 size={42} className="mx-auto text-emerald-500 mb-2.5" />
                  <h3 className="text-sm font-extrabold">¡Inventario en Niveles Óptimos!</h3>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-sm mx-auto">
                    Todos los modelos de cuero disponen de stock suficiente en bodega.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.stockCritico.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-2xs flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="text-xs font-black text-[var(--foreground)] truncate">{item.nombre}</div>
                            <div className="text-[10px] text-[var(--muted-foreground)]">{item.marca} • {item.modelo}</div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black border uppercase ${
                              item.estadoStock === 'AGOTADO'
                                ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                            }`}
                          >
                            {item.estadoStock}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-[var(--muted)]/40 flex items-center justify-between text-xs">
                          <span className="text-[var(--muted-foreground)]">Stock Actual:</span>
                          <span className="font-black text-rose-500">{item.stockTotal} pares</span>
                        </div>

                        {item.tallasAgotadas?.length > 0 && (
                          <div className="text-[10px] text-[var(--muted-foreground)]">
                            <span className="font-bold text-rose-500">Tallas en 0:</span> {item.tallasAgotadas.join(', ')}
                          </div>
                        )}
                      </div>

                      {onNavigateToView && (
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateToView('inventario');
                          }}
                          className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Ver en Inventario</span>
                          <ChevronRight size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═════════ TAB 3: TALLERES & DESPACHOS ═════════ */}
          {activeTab === 'ordenes' && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-[var(--muted-foreground)] tracking-wider">
                📦 Envíos con Courier / Cooperativa en Tránsito
              </h3>

              {data.enviosEnTransito.length === 0 ? (
                <div className="text-xs text-[var(--muted-foreground)] p-4 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] text-center">
                  No hay encomiendas de calzado en tránsito en este momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.enviosEnTransito.map((envio) => (
                    <div
                      key={envio.id}
                      className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <Truck size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-[var(--foreground)] truncate">
                            {envio.numeroPedido} — {envio.clienteNombre}
                          </div>
                          <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-2">
                            <span>🚛 {envio.courier}</span>
                            <span>•</span>
                            <span>Guía: <b className="text-[var(--foreground)]">{envio.guia}</b></span>
                            <span>•</span>
                            <span className="text-emerald-500 font-bold">{envio.flete}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-500 border border-blue-500/30">
                          EN TRÁNSITO
                        </span>
                        <div className="text-xs font-black text-[var(--foreground)] mt-1">${envio.total.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-xs font-black uppercase text-[var(--muted-foreground)] tracking-wider pt-2">
                🏭 Órdenes de Compra a Fabricantes / Talleres
              </h3>

              {data.ordenesProveedor.length === 0 ? (
                <div className="text-xs text-[var(--muted-foreground)] p-4 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] text-center">
                  No hay órdenes a talleres pendientes o demoradas.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.ordenesProveedor.map((orden) => (
                    <div
                      key={orden.id}
                      className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="text-xs font-black text-[var(--foreground)] flex items-center gap-2">
                          <span>{orden.numero}</span>
                          <span className="text-[var(--muted-foreground)]">•</span>
                          <span>{orden.proveedorNombre}</span>
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                          Emitida hace {orden.diasTranscurridos} días • Total: ${orden.total.toFixed(2)}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${
                          orden.esDemorada
                            ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                            : 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                        }`}
                      >
                        {orden.esDemorada ? 'Demorada' : orden.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═════════ TAB 4: HISTORIAL DE ENVÍOS ═════════ */}
          {activeTab === 'historial' && (
            <div className="space-y-3">
              <div className="text-xs text-[var(--muted-foreground)] flex items-center justify-between">
                <span>Bitácora de notificaciones y recordatorios emitidos por el sistema:</span>
                <span className="font-bold">{historialLogs.length} registros</span>
              </div>

              {historialLogs.length === 0 ? (
                <div className="text-center py-10 text-xs text-[var(--muted-foreground)]">
                  No hay registros de notificaciones en el historial.
                </div>
              ) : (
                <div className="space-y-2">
                  {historialLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between gap-3 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            log.canal === 'WHATSAPP'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-blue-500/15 text-blue-500'
                          }`}
                        >
                          {log.canal === 'WHATSAPP' ? <MessageSquare size={14} /> : <Mail size={14} />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--foreground)] truncate">{log.asunto}</div>
                          <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                            <span>Destino: <b>{log.destinatario}</b></span>
                            <span>•</span>
                            <span>{new Date(log.createdAt).toLocaleString('es-EC')}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black border shrink-0 ${
                          log.estado === 'ENVIADO'
                            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                        }`}
                      >
                        {log.estado}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--muted)]/30 flex items-center justify-between text-xs text-[var(--muted-foreground)] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Notificaciones automáticas sincronizadas con el servidor</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── SUB-MODAL DE GENERADOR DE COBRO POR WHATSAPP ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {recordatorioModalOpen && selectedCobro && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-emerald-600/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black">Recordatorio de Cobro por WhatsApp</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Cliente: <b>{selectedCobro.clienteNombre}</b> • Saldo: <b className="text-rose-500">${selectedCobro.saldoPendiente.toFixed(2)}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRecordatorioModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Selector de Tono/Plantilla */}
              <div>
                <label className="text-xs font-bold text-[var(--foreground)] block mb-1.5">
                  Seleccionar Tono del Mensaje:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => setPlantillaSeleccionada('PREVENTIVO')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      plantillaSeleccionada === 'PREVENTIVO'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-2xs'
                        : 'border-[var(--border)] bg-[var(--muted)]/40 text-[var(--muted-foreground)]'
                    }`}
                  >
                    🟢 Preventivo
                  </button>
                  <button
                    onClick={() => setPlantillaSeleccionada('FORMAL')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      plantillaSeleccionada === 'FORMAL'
                        ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold shadow-2xs'
                        : 'border-[var(--border)] bg-[var(--muted)]/40 text-[var(--muted-foreground)]'
                    }`}
                  >
                    🟡 Aviso Formal
                  </button>
                  <button
                    onClick={() => setPlantillaSeleccionada('URGENTE')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      plantillaSeleccionada === 'URGENTE'
                        ? 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold shadow-2xs'
                        : 'border-[var(--border)] bg-[var(--muted)]/40 text-[var(--muted-foreground)]'
                    }`}
                  >
                    🚨 Urgente
                  </button>
                  <button
                    onClick={() => setPlantillaSeleccionada('PERSONALIZADO')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      plantillaSeleccionada === 'PERSONALIZADO'
                        ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)] font-extrabold shadow-2xs'
                        : 'border-[var(--border)] bg-[var(--muted)]/40 text-[var(--muted-foreground)]'
                    }`}
                  >
                    ✍️ Libre
                  </button>
                </div>
              </div>

              {/* Checkbox datos bancarios */}
              <div className="p-3 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)] space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incluirDatosBancarios}
                    onChange={(e) => setIncluirDatosBancarios(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Incluir datos de cuenta bancaria para depósito/transferencia</span>
                </label>

                {incluirDatosBancarios && (
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--muted-foreground)] block">Banco:</span>
                      <input
                        type="text"
                        value={datosBancarios.banco}
                        onChange={(e) => setDatosBancarios({ ...datosBancarios, banco: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted-foreground)] block">Nro. de Cuenta:</span>
                      <input
                        type="text"
                        value={datosBancarios.numeroCuenta}
                        onChange={(e) => setDatosBancarios({ ...datosBancarios, numeroCuenta: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Mensaje Personalizado si aplica */}
              {plantillaSeleccionada === 'PERSONALIZADO' && (
                <div>
                  <label className="text-xs font-bold block mb-1">Escribir Mensaje Personalizado:</label>
                  <textarea
                    rows={4}
                    value={mensajePersonalizado}
                    onChange={(e) => setMensajePersonalizado(e.target.value)}
                    placeholder="Escriba el mensaje para el cliente..."
                    className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Vista Previa del Mensaje (Burbuja WhatsApp) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare size={13} className="text-emerald-500" />
                    Vista Previa del Mensaje:
                  </label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(obtenerTextoMensaje());
                      showToast('Texto copiado al portapapeles', 'success');
                    }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Copy size={12} /> Copiar
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0b141a]/95 text-emerald-50 border border-emerald-900/40 text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-inner">
                  {obtenerTextoMensaje()}
                </div>
              </div>
            </div>

            {/* Footer de Acciones */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/30 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => setRecordatorioModalOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-[var(--border)] hover:bg-[var(--muted)] cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={enviarWhatsAppDirecto}
                disabled={enviandoRecordatorio}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Send size={15} />
                <span>{enviandoRecordatorio ? 'Generando...' : 'Abrir en WhatsApp Web / App'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
