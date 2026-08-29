"use client";

import { useState, useEffect, Fragment } from 'react';
import { ApiService } from '../services/api.service';
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Search,
  User,
  Phone,
  FileText,
  Calendar,
  CreditCard,
  History,
  X,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Building,
  ChevronDown,
  ChevronUp,
  Layers,
  ListFilter,
  Users,
  ShieldCheck,
  Send,
  Download,
  ExternalLink,
  Sparkles,
  Check,
  FileCheck,
  Eye,
  Settings2,
  MessageCircle,
  Printer,
  Share2,
  Mail,
  MapPin,
} from 'lucide-react';
import { useToast } from './ui/toast';
import { compartirFacturaPdf, generarFacturaPdfDoc } from '../services/pdf-factura.service';

interface FinancieroProps {
  online: boolean;
}

type EstadoCobro = 'PENDIENTE' | 'PARCIALMENTE_PAGADO' | 'SALDADO' | 'PAGADO' | 'VENCIDO';

interface Abono {
  id: string;
  monto: number;
  metodo: string;
  notas?: string;
  createdAt: string;
}

interface Cobro {
  id: string;
  numeroCobro?: string;
  clientId: string;
  clienteNombre?: string;
  clienteCedula?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  clienteDireccion?: string;
  clienteNivel?: string;
  montoOriginal?: number;
  montoTotal?: number;
  saldoPendiente: number;
  estado: EstadoCobro;
  tipo?: string;
  fechaVencimiento?: string;
  createdAt: string;
  saleNote?: {
    id: string;
    numero: number;
    total: number;
    subtotal: number;
    pdfUrl?: string;
    lines?: any[];
  };
  abonos?: Abono[];
}

interface ClienteCartera {
  clientId: string;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  clienteEmail?: string;
  clienteDireccion?: string;
  clienteNivel: string;
  montoTotalFacturado: number;
  saldoTotalPendiente: number;
  totalAbonado: number;
  totalCompras: number;
  totalComprasPendientes: number;
  estadoGlobal: EstadoCobro;
  proximoVencimiento?: string;
  cobros: Cobro[];
}

interface ClienteHistorial {
  cliente: {
    id: string;
    nombre: string;
    cedula?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    nivelCredito: string;
    limiteCredito: number;
    creditoUtilizado: number;
    totalCompras: number;
    atrasoConsecutivo: number;
  };
  resumen: {
    totalPedidos: number;
    totalComprado: number;
    saldoPendienteTotal: number;
    totalAbonado: number;
  };
  pedidos: any[];
  notasVenta: any[];
  cobros: any[];
  movimientos: {
    id: string;
    pedidoId?: string;
    tipo: 'COMPRA_PEDIDO' | 'ABONO';
    titulo: string;
    numeroCodigo?: string;
    descripcion: string;
    monto: number;
    metodo?: string;
    estado?: string;
    fecha: string;
    detalles?: any;
  }[];
}

const COBRO_ESTADO: Record<string, { label: string; color: string }> = {
  PENDIENTE:           { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  PARCIALMENTE_PAGADO: { label: 'Parcial',   color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  PAGADO:              { label: 'Saldado',   color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  SALDADO:             { label: 'Saldado',   color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  VENCIDO:             { label: 'Vencido',   color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

function getCobroConfig(estado?: string) {
  return COBRO_ESTADO[estado || 'PENDIENTE'] || { label: estado || 'Pendiente', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}

export default function FinancieroComponent({ online }: FinancieroProps) {
  const { showToast } = useToast();
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState<'CLIENTES' | 'FACTURAS'>('CLIENTES');
  const [filtro, setFiltro] = useState<EstadoCobro | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Cliente o Cobro seleccionado para el modal de cuenta corriente
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string | null>(null);
  const [cobroSeleccionadoId, setCobroSeleccionadoId] = useState<string | null>(null);
  const [clienteExpandidoId, setClienteExpandidoId] = useState<string | null>(null);
  const [showCuentaModal, setShowCuentaModal] = useState(false);

  // Formulario Abono
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoAbono, setMetodoAbono] = useState('EFECTIVO');
  const [notasAbono, setNotasAbono] = useState('');
  const [savingAbono, setSavingAbono] = useState(false);

  // Modal Devolución
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [montoDevolucion, setMontoDevolucion] = useState('');
  const [savingDevolucion, setSavingDevolucion] = useState(false);

  // Modal Historial Completo del Cliente
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialCliente, setHistorialCliente] = useState<ClienteHistorial | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [filtroHistorial, setFiltroHistorial] = useState<'TODOS' | 'COMPRAS' | 'ABONOS'>('TODOS');
  const [pedidoHistorialExpandidoId, setPedidoHistorialExpandidoId] = useState<string | null>(null);

  // Modal Facturación SRI
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [tabFactura, setTabFactura] = useState<'CONFIGURAR' | 'PREVISUALIZAR'>('CONFIGURAR');
  const [facturaCliente, setFacturaCliente] = useState<{
    clientId: string;
    saleNoteId?: string;
    nombre: string;
    cedula: string;
    telefono: string;
    direccion: string;
    email: string;
    tipoIdentificacion: string;
    formaPago: string;
    detalles: {
      codigoProducto: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      descuento: number;
      tarifaIva: number;
      codigoIva: string;
    }[];
    notasSeleccionadas: string[];
  } | null>(null);
  const [emittingFactura, setEmittingFactura] = useState(false);
  const [facturaResultado, setFacturaResultado] = useState<{
    success: boolean;
    numeroComprobante: string;
    claveAcceso?: string;
    estadoSri: string;
    errorMensaje?: string;
    xmlUrl?: string;
    ridePdfUrl?: string;
  } | null>(null);

  // Configuración del Emisor (Dueño del Negocio / RUC)
  const [businessConfig, setBusinessConfig] = useState<{
    nombre: string;
    ruc: string;
    direccion: string;
    telefono?: string;
    email?: string;
    sriAmbiente?: string;
    sriEstablecimiento?: string;
    sriPuntoEmision?: string;
    sriObligadoContabilidad?: boolean;
  } | null>(null);

  useEffect(() => {
    loadCobros();
    loadBusinessConfig();
  }, [online]);

  const loadBusinessConfig = async () => {
    try {
      if (online) {
        const bData = await ApiService.get('/configuracion/negocio');
        if (bData && bData.nombre) {
          setBusinessConfig(bData);
        }
      }
    } catch (err) {
      console.warn('No se pudo obtener la configuración del negocio:', err);
    }
  };

  const loadCobros = async () => {
    setLoading(true);
    try {
      if (online) {
        const data = await ApiService.get('/financiero/cobros');
        const list = Array.isArray(data) ? data : [];
        setCobros(list);
      }
    } catch (err) {
      console.error('Error al cargar cobros:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Agrupación Consolidada por Cliente ─────────
  const clientesCartera: ClienteCartera[] = (() => {
    const map = new Map<string, Cobro[]>();
    cobros.forEach((c) => {
      const key = c.clientId || 'SIN_CLIENTE';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });

    const resultado: ClienteCartera[] = [];

    map.forEach((listaCobros, clientId) => {
      const primerCobro = listaCobros[0];
      const cobroConEmail = listaCobros.find((c) => c.clienteEmail) || primerCobro;
      const cobroConDireccion = listaCobros.find((c) => c.clienteDireccion) || primerCobro;

      const montoTotalFacturado = listaCobros.reduce(
        (sum, c) => sum + Number(c.montoOriginal ?? c.montoTotal ?? 0),
        0,
      );
      const saldoTotalPendiente = listaCobros.reduce(
        (sum, c) => sum + Number(c.saldoPendiente || 0),
        0,
      );
      const totalAbonado = listaCobros.reduce(
        (sum, c) => sum + (c.abonos || []).reduce((s, a) => s + Number(a.monto || 0), 0),
        0,
      );

      const comprasPendientes = listaCobros.filter((c) => Number(c.saldoPendiente) > 0);

      // Estado global del cliente
      let estadoGlobal: EstadoCobro = 'SALDADO';
      const tieneVencido = listaCobros.some(
        (c) => c.estado === 'VENCIDO' || (Number(c.saldoPendiente) > 0 && c.fechaVencimiento && new Date(c.fechaVencimiento) < new Date()),
      );
      if (tieneVencido) {
        estadoGlobal = 'VENCIDO';
      } else if (saldoTotalPendiente > 0) {
        if (totalAbonado > 0) {
          estadoGlobal = 'PARCIALMENTE_PAGADO';
        } else {
          estadoGlobal = 'PENDIENTE';
        }
      }

      // Próximo vencimiento
      const fechasPendientes = comprasPendientes
        .map((c) => c.fechaVencimiento)
        .filter(Boolean)
        .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime());

      resultado.push({
        clientId,
        clienteNombre: primerCobro.clienteNombre || 'Cliente sin registrar',
        clienteCedula: primerCobro.clienteCedula || '—',
        clienteTelefono: primerCobro.clienteTelefono || '—',
        clienteEmail: cobroConEmail?.clienteEmail || '',
        clienteDireccion: cobroConDireccion?.clienteDireccion || '',
        clienteNivel: primerCobro.clienteNivel || '—',
        montoTotalFacturado,
        saldoTotalPendiente,
        totalAbonado,
        totalCompras: listaCobros.length,
        totalComprasPendientes: comprasPendientes.length,
        estadoGlobal,
        proximoVencimiento: fechasPendientes[0],
        cobros: listaCobros.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      });
    });

    // Ordenar de mayor saldo pendiente a menor
    return resultado.sort((a, b) => b.saldoTotalPendiente - a.saldoTotalPendiente);
  })();

  // ── Selección activa ──────────────────────────
  const carteraSeleccionada = clientesCartera.find((c) => c.clientId === clienteSeleccionadoId) || (clientesCartera.length > 0 ? clientesCartera[0] : null);
  const cobroSeleccionado = cobros.find((c) => c.id === cobroSeleccionadoId) || (carteraSeleccionada?.cobros.find((c) => Number(c.saldoPendiente) > 0) || carteraSeleccionada?.cobros[0] || null);

  const handleSeleccionarCliente = (c: ClienteCartera) => {
    setClienteSeleccionadoId(c.clientId);
    const cobroConDeuda = c.cobros.find((item) => Number(item.saldoPendiente) > 0) || c.cobros[0];
    setCobroSeleccionadoId(cobroConDeuda?.id || null);
    setMontoAbono('');
    setNotasAbono('');
    setShowCuentaModal(true);
  };

  const handleRegistrarAbono = async () => {
    if (!cobroSeleccionado || !montoAbono) {
      showToast('Selecciona un cobro e ingresa el monto.', 'warning');
      return;
    }
    const valor = parseFloat(montoAbono);
    if (isNaN(valor) || valor <= 0) {
      showToast('Ingresa un monto válido mayor a $0.00', 'warning');
      return;
    }
    if (valor > Number(cobroSeleccionado.saldoPendiente)) {
      showToast(`El monto no puede superar el saldo pendiente de esta nota ($${Number(cobroSeleccionado.saldoPendiente).toFixed(2)})`, 'warning');
      return;
    }

    setSavingAbono(true);
    try {
      await ApiService.post(`/financiero/cobros/${cobroSeleccionado.id}/abono`, {
        monto: valor,
        metodo: metodoAbono,
        notas: notasAbono.trim() || undefined,
      });
      showToast(`¡Abono de $${valor.toFixed(2)} registrado exitosamente vía ${metodoAbono}!`, 'success');
      setMontoAbono('');
      setNotasAbono('');
      await loadCobros();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar abono.', 'error');
    } finally {
      setSavingAbono(false);
    }
  };

  const handleAbrirHistorial = async (clientId: string) => {
    setShowHistorialModal(true);
    setLoadingHistorial(true);
    try {
      const data = await ApiService.get(`/financiero/cliente/${clientId}/historial`);
      setHistorialCliente(data);
    } catch (err: any) {
      showToast('Error al cargar el historial del cliente.', 'error');
      setShowHistorialModal(false);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleRegistrarDevolucion = async () => {
    if (!carteraSeleccionada || !montoDevolucion || !motivoDevolucion) return;
    setSavingDevolucion(true);
    try {
      await ApiService.post('/devoluciones/cliente', {
        clientId: carteraSeleccionada.clientId,
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
      setMotivoDevolucion('');
      setMontoDevolucion('');
      loadCobros();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar devolución.', 'error');
    } finally {
      setSavingDevolucion(false);
    }
  };

  // ── Agrupación de líneas por modelo para la factura ─────
  const agruparLineasParaFactura = (notas: Cobro[]) => {
    const agrupados: {
      codigoProducto: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      descuento: number;
      tarifaIva: number;
      codigoIva: string;
    }[] = [];

    notas.forEach((c) => {
      const numNota = c.saleNote?.numero
        ? `Nota #${String(c.saleNote.numero).padStart(4, '0')}`
        : `#${c.id.slice(0, 6).toUpperCase()}`;
      const lineas = c.saleNote?.lines;

      if (lineas && lineas.length > 0) {
        // Agrupar líneas por nombre+serie dentro de la misma nota
        const grupoMap = new Map<string, { nombre: string; serie: string; cantidad: number; totalPrecio: number; productId: string }>();

        lineas.forEach((l: any) => {
          const key = `${(l.nombre || 'Calzado').toLowerCase()}_${(l.serie || 'sin-serie').toLowerCase()}`;
          if (!grupoMap.has(key)) {
            grupoMap.set(key, {
              nombre: l.nombre || 'Calzado de Cuero',
              serie: l.serie || '',
              cantidad: 0,
              totalPrecio: 0,
              productId: l.productId || 'CALZ-01',
            });
          }
          const g = grupoMap.get(key)!;
          g.cantidad += Number(l.cantidad) || 1;
          g.totalPrecio += (Number(l.cantidad) || 1) * Number(l.precioUnitario || 0);
        });

        grupoMap.forEach((g) => {
          let descripcion = '';
          if (g.cantidad === 12) {
            descripcion = `1 Docena - ${g.nombre}`;
          } else if (g.cantidad === 6) {
            descripcion = `Media Docena - ${g.nombre}`;
          } else {
            descripcion = `${g.cantidad} ${g.cantidad === 1 ? 'Par' : 'Pares'} - ${g.nombre}`;
          }
          if (g.serie) descripcion += ` (${g.serie})`;
          descripcion += ` [${numNota}]`;

          const precioUnitarioGrupo = g.cantidad > 0 ? g.totalPrecio / g.cantidad : 0;

          agrupados.push({
            codigoProducto: g.productId.slice(0, 8).toUpperCase(),
            descripcion,
            cantidad: g.cantidad,
            precioUnitario: Number(precioUnitarioGrupo.toFixed(2)),
            descuento: 0,
            tarifaIva: 15,
            codigoIva: '4',
          });
        });
      } else {
        const monto = Number(c.montoOriginal ?? c.montoTotal ?? 0);
        agrupados.push({
          codigoProducto: `VENTA-${c.id.slice(0, 6).toUpperCase()}`,
          descripcion: `Calzado de Cuero Cevallos Artesanal — ${numNota}`,
          cantidad: 1,
          precioUnitario: monto,
          descuento: 0,
          tarifaIva: 15,
          codigoIva: '4',
        });
      }
    });

    return agrupados;
  };

  // ── Enviar por WhatsApp ─────────────
  const handleEnviarWhatsApp = (telefono: string, mensaje: string) => {
    let numLimpio = telefono.replace(/\D/g, '');
    // Conversión Ecuador: 09XXXXXXXX → 5939XXXXXXXX
    if (numLimpio.startsWith('09') && numLimpio.length === 10) {
      numLimpio = '593' + numLimpio.substring(1);
    } else if (numLimpio.startsWith('0') && numLimpio.length === 10) {
      numLimpio = '593' + numLimpio.substring(1);
    }
    const url = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // ── Facturación Electrónica SRI ─────────────
  const handleAbrirFacturacion = async (cliente: ClienteCartera, cobroItem?: Cobro) => {
    setFacturaResultado(null);
    setTabFactura('CONFIGURAR');
    const cedulaLimpia = cliente.clienteCedula !== '—' ? cliente.clienteCedula.trim() : '';
    let tipoId = '05'; // Cédula por defecto
    if (cedulaLimpia.length === 13) tipoId = '04'; // RUC
    else if (cedulaLimpia === '9999999999999' || !cedulaLimpia) tipoId = '07'; // Consumidor Final

    // Seleccionar notas a facturar
    const notasParaFacturar = cobroItem ? [cobroItem] : cliente.cobros;
    // Usar agrupación concisa
    const detalles = agruparLineasParaFactura(notasParaFacturar);

    // Datos reales del cliente desde la BD
    const direccionReal = cliente.clienteDireccion || 'Cevallos, Tungurahua';
    const emailReal = cliente.clienteEmail || '';

    setFacturaCliente({
      clientId: cliente.clientId,
      saleNoteId: cobroItem?.saleNote?.id || undefined,
      nombre: cliente.clienteNombre,
      cedula: cedulaLimpia || (tipoId === '07' ? '9999999999999' : ''),
      telefono: cliente.clienteTelefono !== '—' ? cliente.clienteTelefono : '',
      direccion: direccionReal,
      email: emailReal,
      tipoIdentificacion: tipoId,
      formaPago: '01', // 01=Efectivo por defecto
      detalles,
      notasSeleccionadas: notasParaFacturar.map((n) => n.id),
    });

    setShowFacturaModal(true);
  };

  const handleToggleNotaFacturar = (cobroItem: Cobro) => {
    if (!facturaCliente || !carteraSeleccionada) return;

    const yaSeleccionada = facturaCliente.notasSeleccionadas.includes(cobroItem.id);
    const nuevasNotasIds = yaSeleccionada
      ? facturaCliente.notasSeleccionadas.filter((id) => id !== cobroItem.id)
      : [...facturaCliente.notasSeleccionadas, cobroItem.id];

    if (nuevasNotasIds.length === 0) {
      showToast('Debes mantener al menos una nota seleccionada para facturar.', 'warning');
      return;
    }

    const notasActualizadas = carteraSeleccionada.cobros.filter((c) => nuevasNotasIds.includes(c.id));
    const nuevosDetalles = agruparLineasParaFactura(notasActualizadas);

    setFacturaCliente({
      ...facturaCliente,
      detalles: nuevosDetalles,
      notasSeleccionadas: nuevasNotasIds,
    });
  };

  const handleEmitirFacturaSRI = async () => {
    if (!facturaCliente) return;

    if (!facturaCliente.cedula && facturaCliente.tipoIdentificacion !== '07') {
      showToast('Ingresa la Cédula o RUC del comprador.', 'warning');
      return;
    }
    if (!facturaCliente.nombre.trim()) {
      showToast('Ingresa la Razón Social o Nombre del comprador.', 'warning');
      return;
    }
    if (facturaCliente.detalles.length === 0) {
      showToast('Debes incluir al menos un ítem a facturar.', 'warning');
      return;
    }

    const subtotal = facturaCliente.detalles.reduce(
      (sum, d) => sum + d.cantidad * d.precioUnitario - (d.descuento || 0),
      0,
    );
    const iva = facturaCliente.detalles.reduce(
      (sum, d) => sum + ((d.cantidad * d.precioUnitario - (d.descuento || 0)) * d.tarifaIva) / 100,
      0,
    );
    const totalConImpuestos = subtotal + iva;

    setEmittingFactura(true);
    setFacturaResultado(null);
    try {
      const payload = {
        saleNoteId: facturaCliente.saleNoteId,
        fecha: new Date(),
        comprador: {
          tipoIdentificacion: facturaCliente.tipoIdentificacion,
          identificacion: facturaCliente.tipoIdentificacion === '07' ? '9999999999999' : facturaCliente.cedula.trim(),
          razonSocial: facturaCliente.nombre.trim(),
          direccion: facturaCliente.direccion.trim() || 'Cevallos, Tungurahua',
          email: facturaCliente.email.trim() || 'facturas@cliente.com',
          telefono: facturaCliente.telefono.trim() || '0999999999',
        },
        detalles: facturaCliente.detalles.map((d) => ({
          codigoProducto: d.codigoProducto,
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          descuento: d.descuento || 0,
          codigoIva: d.codigoIva || '4',
          tarifaIva: d.tarifaIva || 15,
        })),
        formaPago: facturaCliente.formaPago || '01',
        totalConImpuestos: Number(totalConImpuestos.toFixed(2)),
      };

      const res = await ApiService.post('/facturacion-sri/emitir', payload);
      const esAutorizado = res.estadoSri === 'AUTORIZADO';

      setFacturaResultado({
        success: esAutorizado,
        numeroComprobante: res.numeroComprobante || '001-001-00000000X',
        claveAcceso: res.claveAcceso,
        estadoSri: res.estadoSri || 'PENDIENTE',
        xmlUrl: res.xmlUrl,
        ridePdfUrl: res.ridePdfUrl,
        errorMensaje: res.errorMensaje,
      });

      if (esAutorizado) {
        showToast(`¡Factura ${res.numeroComprobante} AUTORIZADA por el SRI!`, 'success');
      } else {
        showToast(`Factura registrada con estado: ${res.estadoSri}`, 'info');
      }
    } catch (err: any) {
      setFacturaResultado({
        success: false,
        numeroComprobante: 'ERROR',
        estadoSri: 'RECHAZADO',
        errorMensaje: err.message || 'Error al comunicarse con el SRI.',
      });
      showToast(err.message || 'Error al emitir factura al SRI', 'error');
    } finally {
      setEmittingFactura(false);
    }
  };

  const saldoTotalGeneral = cobros.reduce((acc, c) => acc + Number(c.saldoPendiente), 0);

  // Filtrado de Cartera Consolidada
  const clientesFiltrados = clientesCartera.filter((c) => {
    const cumpleEstado =
      filtro === 'TODOS'
        ? true
        : filtro === 'PENDIENTE'
        ? c.saldoTotalPendiente > 0 && c.estadoGlobal !== 'VENCIDO'
        : c.estadoGlobal === filtro;

    const q = busqueda.toLowerCase().trim();
    if (!q) return cumpleEstado;

    const nombre = c.clienteNombre.toLowerCase();
    const cedula = c.clienteCedula.toLowerCase();
    const cumpleBusqueda = nombre.includes(q) || cedula.includes(q);

    return cumpleEstado && cumpleBusqueda;
  });

  // Filtrado de Cobros Individuales
  const facturasFiltradas = cobros.filter((c) => {
    const cumpleEstado = filtro === 'TODOS' ? true : c.estado === filtro;
    const q = busqueda.toLowerCase().trim();
    if (!q) return cumpleEstado;

    const nombre = (c.clienteNombre || '').toLowerCase();
    const cedula = (c.clienteCedula || '').toLowerCase();
    const num = (c.numeroCobro || c.saleNote?.numero?.toString() || c.id || '').toLowerCase();

    return cumpleEstado && (nombre.includes(q) || cedula.includes(q) || num.includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header & KPI Saldo Pendiente */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-xl tracking-tight text-[var(--foreground)]">
            Cartera de Clientes y Gestión de Cobros
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] font-medium">
            Consolidación de deudas por cliente, detalle de notas de venta y control de abonos
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Vistas */}
          <div className="flex p-1 bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl">
            <button
              onClick={() => setVista('CLIENTES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                vista === 'CLIENTES' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Users size={14} />
              <span>Por Cliente</span>
            </button>
            <button
              onClick={() => setVista('FACTURAS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                vista === 'FACTURAS' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Receipt size={14} />
              <span>Por Nota/Cobro</span>
            </button>
          </div>

          <div className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm text-sm flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
              <DollarSign size={18} />
            </div>
            <div>
              <span className="text-[10px] text-[var(--muted-foreground)] block font-semibold leading-tight">Total por Cobrar:</span>
              <span className="font-extrabold text-base text-red-500 leading-tight">${saldoTotalGeneral.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros de Estado */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre o número de cédula/RUC..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#0F172A] shadow-sm"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['TODOS', 'PENDIENTE', 'PARCIALMENTE_PAGADO', 'SALDADO', 'VENCIDO'] as const).map((e) => (
            <button
              key={e}
              onClick={() => setFiltro(e as any)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                filtro === e
                  ? 'bg-[#0F172A] text-white border-transparent'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[#0F172A]'
              }`}
            >
              {e === 'TODOS' ? 'Todos los Registros' : getCobroConfig(e).label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal: Tabla completa */}
      <div className="space-y-4">
        {/* Tabla de Clientes o Facturas */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <Loader2 className="animate-spin text-[#0F172A] mb-3" size={36} />
              <span className="text-xs font-bold">Cargando cartera consolidada de clientes...</span>
            </div>
          ) : vista === 'CLIENTES' ? (
            /* ══════════════════════════════════════════════════════════════ */
            /* VISTA CONSOLIDADA POR CLIENTE                                   */
            /* ══════════════════════════════════════════════════════════════ */
            clientesFiltrados.length === 0 ? (
              <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2">
                <Users size={40} className="mx-auto text-[var(--muted-foreground)]/40 mb-2" />
                <p className="text-sm font-bold">No se encontraron clientes con cobros</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {busqueda ? `No hay resultados para "${busqueda}"` : 'Los clientes con pedidos aparecerán aquí.'}
                </p>
              </div>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[var(--muted)]/40 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      <tr>
                        <th className="px-5 py-4">Cliente Deudor</th>
                        <th className="px-5 py-4 text-center">Compras / Notas</th>
                        <th className="px-5 py-4 text-center">Estado Cartera</th>
                        <th className="px-5 py-4 text-right">Total Facturado</th>
                        <th className="px-5 py-4 text-right">Saldo Deudor Total</th>
                        <th className="px-5 py-4 text-right">Próx. Vencimiento</th>
                        <th className="px-5 py-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {clientesFiltrados.map((cliente) => {
                        const cfg = getCobroConfig(cliente.estadoGlobal);
                        const isSelected = (carteraSeleccionada?.clientId === cliente.clientId);
                        const isExpanded = (clienteExpandidoId === cliente.clientId);

                        return (
                          <Fragment key={cliente.clientId}>
                            <tr
                              onClick={() => handleSeleccionarCliente(cliente)}
                              className={`hover:bg-[var(--muted)]/30 cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#0F172A]/5 border-l-4 border-l-[#0F172A]' : ''
                              }`}
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setClienteExpandidoId(isExpanded ? null : cliente.clientId);
                                    }}
                                    className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                                    title="Ver desglose de compras"
                                  >
                                    {isExpanded ? <ChevronUp size={16} className="text-[#0F172A]" /> : <ChevronDown size={16} />}
                                  </button>
                                  <div>
                                    <div className="font-extrabold text-xs text-[var(--foreground)]">
                                      {cliente.clienteNombre}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)] mt-0.5">
                                      <span>C.I: {cliente.clienteCedula}</span>
                                      {cliente.clienteNivel && (
                                        <span className="px-1.5 py-0.2 bg-[#0F172A]/10 text-[#0F172A] rounded font-bold">
                                          {cliente.clienteNivel}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 text-center">
                                <span className="px-2.5 py-1 bg-[var(--muted)] text-[var(--foreground)] rounded-lg text-xs font-bold border border-[var(--border)]">
                                  {cliente.totalCompras} {cliente.totalCompras === 1 ? 'compra' : 'compras'}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-center">
                                <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-block ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-right text-xs font-semibold text-[var(--muted-foreground)]">
                                ${cliente.montoTotalFacturado.toFixed(2)}
                              </td>

                              <td className="px-5 py-4 text-right">
                                <span
                                  className={`text-sm font-black ${
                                    cliente.saldoTotalPendiente > 0 ? 'text-red-500' : 'text-emerald-600'
                                  }`}
                                >
                                  ${cliente.saldoTotalPendiente.toFixed(2)}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-right text-[11px] text-[var(--muted-foreground)]">
                                {cliente.proximoVencimiento
                                  ? new Date(cliente.proximoVencimiento).toLocaleDateString('es-EC')
                                  : 'Al día / Contado'}
                              </td>

                              <td className="px-5 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSeleccionarCliente(cliente);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 mx-auto"
                                >
                                  <DollarSign size={13} />
                                  <span>Gestionar Cobro</span>
                                </button>
                              </td>
                            </tr>

                            {/* Desglose Expandible de Notas/Facturas del Cliente */}
                            {isExpanded && (
                              <tr className="bg-[var(--muted)]/20">
                                <td colSpan={7} className="px-6 py-4">
                                  <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-3">
                                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                                      <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                                        <Receipt size={14} className="text-[#0F172A]" />
                                        <span>Desglose de Compras y Facturas de {cliente.clienteNombre}</span>
                                      </span>
                                      <span className="text-xs font-bold text-[var(--muted-foreground)]">
                                        Saldo Total: <strong className="text-red-500">${cliente.saldoTotalPendiente.toFixed(2)}</strong>
                                      </span>
                                    </div>

                                    <div className="space-y-2">
                                      {cliente.cobros.map((cobroItem) => {
                                        const cCfg = getCobroConfig(cobroItem.estado);
                                        const numNota = cobroItem.saleNote?.numero
                                          ? `NOTA #${String(cobroItem.saleNote.numero).padStart(4, '0')}`
                                          : cobroItem.numeroCobro || `#${cobroItem.id.slice(0, 8).toUpperCase()}`;
                                        const montoOrig = Number(cobroItem.montoOriginal ?? cobroItem.montoTotal ?? 0);
                                        const isCobroActive = (cobroSeleccionadoId === cobroItem.id);

                                        return (
                                          <div
                                            key={cobroItem.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setClienteSeleccionadoId(cliente.clientId);
                                              setCobroSeleccionadoId(cobroItem.id);
                                            }}
                                            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer ${
                                              isCobroActive
                                                ? 'bg-[#0F172A]/10 border-[#0F172A]/40 shadow-xs'
                                                : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]/40'
                                            }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="p-2 rounded-xl bg-slate-500/10 text-slate-700">
                                                <FileText size={16} />
                                              </div>
                                              <div>
                                                <div className="font-bold text-xs text-[var(--foreground)] flex items-center gap-2">
                                                  <span>{numNota}</span>
                                                  <span className="px-2 py-0.2 bg-[var(--muted)] text-[var(--muted-foreground)] rounded text-[10px]">
                                                    {cobroItem.tipo || 'Crédito'}
                                                  </span>
                                                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${cCfg.color}`}>
                                                    {cCfg.label}
                                                  </span>
                                                </div>
                                                <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-3 mt-1">
                                                  <span>Fecha: {new Date(cobroItem.createdAt).toLocaleDateString('es-EC')}</span>
                                                  {cobroItem.fechaVencimiento && (
                                                    <span>Vence: {new Date(cobroItem.fechaVencimiento).toLocaleDateString('es-EC')}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="text-right flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                                              <div>
                                                <div className="text-[10px] text-[var(--muted-foreground)]">Original: ${montoOrig.toFixed(2)}</div>
                                                <div className="text-xs font-black text-red-500">
                                                  Saldo: ${Number(cobroItem.saldoPendiente).toFixed(2)}
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAbrirFacturacion(cliente, cobroItem);
                                                  }}
                                                  className="px-2.5 py-1.5 bg-[#0F172A]/10 hover:bg-[#0F172A] hover:text-white text-[#0F172A] text-xs font-bold rounded-xl transition-all border border-[#0F172A]/20 flex items-center gap-1"
                                                  title="Emitir factura electrónica SRI para esta nota"
                                                >
                                                  <Receipt size={13} />
                                                  <span>Facturar SRI</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setClienteSeleccionadoId(cliente.clientId);
                                                    setCobroSeleccionadoId(cobroItem.id);
                                                    setShowCuentaModal(true);
                                                  }}
                                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                                    isCobroActive
                                                      ? 'bg-[#0F172A] text-white'
                                                      : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[#0F172A] hover:text-white'
                                                  }`}
                                                >
                                                  {Number(cobroItem.saldoPendiente) > 0 ? 'Abonar Esta Nota' : 'Ver Detalles'}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
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
            )
          ) : (
            /* ══════════════════════════════════════════════════════════════ */
            /* VISTA DETALLADA POR NOTA / FACTURA INDIVIDUAL                  */
            /* ══════════════════════════════════════════════════════════════ */
            facturasFiltradas.length === 0 ? (
              <div className="p-16 text-center text-[var(--muted-foreground)] bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2">
                <Receipt size={40} className="mx-auto text-[var(--muted-foreground)]/40 mb-2" />
                <p className="text-sm font-bold">No se encontraron facturas o notas de venta</p>
              </div>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[var(--muted)]/40 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      <tr>
                        <th className="px-5 py-4">N° Cobro / Nota</th>
                        <th className="px-5 py-4">Cliente Deudor</th>
                        <th className="px-5 py-4 text-center">Estado</th>
                        <th className="px-5 py-4 text-right">Monto Total</th>
                        <th className="px-5 py-4 text-right">Saldo Pendiente</th>
                        <th className="px-5 py-4 text-right">Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {facturasFiltradas.map((cobro) => {
                        const cfg = getCobroConfig(cobro.estado);
                        const num = cobro.saleNote?.numero
                          ? `NOTA #${String(cobro.saleNote.numero).padStart(4, '0')}`
                          : cobro.numeroCobro || `#${cobro.id.slice(0, 8).toUpperCase()}`;
                        const montoOrig = Number(cobro.montoOriginal ?? cobro.montoTotal ?? 0);
                        const isSelected = cobroSeleccionadoId === cobro.id;

                        return (
                          <tr
                            key={cobro.id}
                            onClick={() => {
                              setClienteSeleccionadoId(cobro.clientId);
                              setCobroSeleccionadoId(cobro.id);
                              setMontoAbono('');
                              setNotasAbono('');
                              setShowCuentaModal(true);
                            }}
                            className={`hover:bg-[var(--muted)]/30 cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#0F172A]/5 border-l-4 border-l-[#0F172A]' : ''
                            }`}
                          >
                            <td className="px-5 py-4 font-bold text-xs text-[var(--foreground)]">
                              <div className="flex items-center gap-1.5">
                                <Receipt size={14} className="text-[var(--muted-foreground)]" />
                                <span>{num}</span>
                              </div>
                              <span className="text-[10px] text-[var(--muted-foreground)] block font-normal">
                                Tipo: {cobro.tipo || 'Crédito'}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-extrabold text-xs text-[var(--foreground)]">
                                {cobro.clienteNombre}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)] mt-0.5">
                                <span>C.I: {cobro.clienteCedula}</span>
                                {cobro.clienteNivel && (
                                  <span className="px-1.5 py-0.2 bg-slate-500/10 text-slate-700 rounded font-bold">
                                    {cobro.clienteNivel}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-block ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right text-xs font-semibold text-[var(--muted-foreground)]">
                              ${montoOrig.toFixed(2)}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span
                                className={`text-xs font-black ${
                                  Number(cobro.saldoPendiente) > 0 ? 'text-red-500' : 'text-emerald-600'
                                }`}
                              >
                                ${Number(cobro.saldoPendiente).toFixed(2)}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right text-[11px] text-[var(--muted-foreground)]">
                              {cobro.fechaVencimiento ? new Date(cobro.fechaVencimiento).toLocaleDateString('es-EC') : 'Contado'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: GESTIÓN DE ABONOS & CUENTA CORRIENTE DEL CLIENTE       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showCuentaModal && carteraSeleccionada && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCuentaModal(false)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header del Modal ── */}
            <div className="p-5 border-b border-[var(--border)] bg-gradient-to-r from-[#0F172A] to-[#1e293b]">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                    <CreditCard size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Gestión de Cobros</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">Cuenta corriente y registro de abonos</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCuentaModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Info del Cliente en el Header */}
              <div className="mt-4 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-emerald-400" />
                    <span className="font-black text-sm text-white">{carteraSeleccionada.clienteNombre}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 rounded text-[10px] font-bold border border-emerald-400/20">
                      {carteraSeleccionada.clienteNivel}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    carteraSeleccionada.estadoGlobal === 'SALDADO' || carteraSeleccionada.estadoGlobal === 'PAGADO'
                      ? 'bg-emerald-400/20 text-emerald-300'
                      : carteraSeleccionada.estadoGlobal === 'VENCIDO'
                      ? 'bg-red-400/20 text-red-300'
                      : 'bg-amber-400/20 text-amber-300'
                  }`}>
                    {getCobroConfig(carteraSeleccionada.estadoGlobal).label}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between mt-1.5">
                  <span>Cédula: <strong className="text-slate-200">{carteraSeleccionada.clienteCedula}</strong></span>
                  <span>Tel: <strong className="text-slate-200">{carteraSeleccionada.clienteTelefono}</strong></span>
                </div>
              </div>
            </div>

            {/* ── Body del Modal (scrollable) ── */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Saldos Totales */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-500/5 rounded-xl border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">Total Facturado:</span>
                  <span className="text-sm font-extrabold text-[var(--foreground)]">
                    ${carteraSeleccionada.montoTotalFacturado.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/20">
                  <span className="text-[10px] text-red-600 block font-semibold">Saldo Deudor Total:</span>
                  <span className="text-sm font-black text-red-500">
                    ${carteraSeleccionada.saldoTotalPendiente.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Selector de Nota/Cobro a Abonar */}
              {carteraSeleccionada.cobros.length > 1 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
                    Seleccionar Nota para Abonar
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {carteraSeleccionada.cobros.map((cobroItem) => {
                      const cCfg = getCobroConfig(cobroItem.estado);
                      const numNota = cobroItem.saleNote?.numero
                        ? `NOTA #${String(cobroItem.saleNote.numero).padStart(4, '0')}`
                        : cobroItem.numeroCobro || `#${cobroItem.id.slice(0, 8).toUpperCase()}`;
                      const montoOrig = Number(cobroItem.montoOriginal ?? cobroItem.montoTotal ?? 0);
                      const isActive = cobroSeleccionadoId === cobroItem.id;

                      return (
                        <button
                          key={cobroItem.id}
                          type="button"
                          onClick={() => setCobroSeleccionadoId(cobroItem.id)}
                          className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                            isActive
                              ? 'bg-[#0F172A]/10 border-[#0F172A]/40 shadow-xs ring-1 ring-[#0F172A]/10'
                              : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]/40'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText size={14} className={isActive ? 'text-[#0F172A]' : 'text-[var(--muted-foreground)]'} />
                            <div>
                              <div className="font-bold text-[11px] text-[var(--foreground)] flex items-center gap-1.5">
                                <span>{numNota}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${cCfg.color}`}>{cCfg.label}</span>
                              </div>
                              <div className="text-[10px] text-[var(--muted-foreground)]">
                                {cobroItem.tipo || 'Crédito'} — {new Date(cobroItem.createdAt).toLocaleDateString('es-EC')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-[var(--muted-foreground)]">${montoOrig.toFixed(2)}</div>
                            <div className={`text-[11px] font-black ${Number(cobroItem.saldoPendiente) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                              ${Number(cobroItem.saldoPendiente).toFixed(2)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nota / Cobro Activo Seleccionado */}
              {cobroSeleccionado && (
                <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                        <FileText size={14} className="text-emerald-600" />
                      </div>
                      <span className="font-bold text-emerald-800">
                        Abonar a: {cobroSeleccionado.saleNote?.numero ? `Nota #${String(cobroSeleccionado.saleNote.numero).padStart(4, '0')}` : `#${cobroSeleccionado.id.slice(0, 8).toUpperCase()}`}
                      </span>
                    </div>
                    <span className="text-sm font-black text-red-500">
                      Saldo: ${Number(cobroSeleccionado.saldoPendiente).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] ml-8">
                    <span>Monto Original: ${Number(cobroSeleccionado.montoOriginal ?? cobroSeleccionado.montoTotal ?? 0).toFixed(2)} ({cobroSeleccionado.tipo || 'Crédito'})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCuentaModal(false);
                        handleAbrirFacturacion(carteraSeleccionada, cobroSeleccionado);
                      }}
                      className="px-2 py-0.5 bg-[#0F172A]/10 hover:bg-[#0F172A] hover:text-white text-[#0F172A] font-bold rounded-lg transition-colors border border-[#0F172A]/20 flex items-center gap-1"
                    >
                      <Receipt size={11} />
                      <span>Facturar Esta Nota</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Últimos Abonos Realizados */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[var(--foreground)] block flex items-center gap-1.5">
                  <ArrowDownRight size={12} className="text-emerald-600" />
                  Abonos registrados a esta nota:
                </span>
                {cobroSeleccionado?.abonos && cobroSeleccionado.abonos.length > 0 ? (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {cobroSeleccionado.abonos.map((a) => (
                      <div
                        key={a.id}
                        className="p-2.5 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-extrabold text-emerald-600">${Number(a.monto).toFixed(2)}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)] ml-2 font-semibold px-1.5 py-0.5 bg-emerald-500/10 rounded">
                            {a.metodo}
                          </span>
                          {a.notas && <p className="text-[9px] text-[var(--muted-foreground)] italic mt-0.5">{a.notas}</p>}
                        </div>
                        <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                          {new Date(a.createdAt).toLocaleDateString('es-EC')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--muted-foreground)] italic p-3 bg-[var(--muted)]/10 rounded-xl border border-dashed border-[var(--border)]">
                    No registra abonos previos en esta nota.
                  </p>
                )}
              </div>

              {/* Formulario para Registrar Nuevo Abono */}
              {cobroSeleccionado && Number(cobroSeleccionado.saldoPendiente) > 0 && (
                <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--foreground)] block flex items-center gap-1.5">
                    <ArrowUpRight size={13} className="text-emerald-600" />
                    Registrar Abono
                  </span>

                  {/* Monto */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                      Monto a Abonar ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={cobroSeleccionado.saldoPendiente}
                      placeholder="0.00"
                      value={montoAbono}
                      onChange={(e) => setMontoAbono(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm font-bold text-emerald-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                      Método de Pago *
                    </label>
                    <select
                      value={metodoAbono}
                      onChange={(e) => setMetodoAbono(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A] transition-all"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                      <option value="DEPOSITO">Depósito Bancario</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  {/* Referencia / Comprobante — solo si NO es EFECTIVO */}
                  {metodoAbono !== 'EFECTIVO' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                        N° Comprobante / Referencia / Banco *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Transf #12948 Banco Pichincha"
                        value={notasAbono}
                        onChange={(e) => setNotasAbono(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A] transition-all"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleRegistrarAbono}
                    disabled={savingAbono || !montoAbono || !online}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {savingAbono ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    <span>{savingAbono ? 'Guardando...' : 'Confirmar Abono'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* ── Footer del Modal ── */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowCuentaModal(false);
                  handleAbrirFacturacion(carteraSeleccionada, cobroSeleccionado || undefined);
                }}
                className="w-full py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <FileCheck size={14} />
                <span>Emitir Factura Electrónica SRI</span>
              </button>

              <button
                onClick={() => {
                  setShowCuentaModal(false);
                  handleAbrirHistorial(carteraSeleccionada.clientId);
                }}
                className="w-full py-2 bg-[#0F172A]/10 hover:bg-[#0F172A]/20 text-[#0F172A] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-[#0F172A]/20"
              >
                <History size={14} />
                <span>Ver Historial Completo del Cliente</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCuentaModal(false);
                    setShowDevolucionModal(true);
                  }}
                  className="flex-1 py-2 text-rose-500 hover:bg-rose-500/10 font-semibold text-[11px] rounded-xl transition-colors flex items-center justify-center gap-1 border border-rose-500/20"
                >
                  <AlertTriangle size={12} />
                  <span>Registrar Devolución</span>
                </button>
                <button
                  onClick={() => setShowCuentaModal(false)}
                  className="flex-1 py-2 bg-[var(--muted)] text-[var(--foreground)] font-semibold text-[11px] rounded-xl transition-colors hover:bg-[var(--muted)]/80 border border-[var(--border)]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: HISTORIAL COMPLETO DE CLIENTE (Compras, Abonos, Pagos) */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showHistorialModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--muted)]/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#0F172A] text-white rounded-xl">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[var(--foreground)]">Historial Comercial y Financiero</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Detalle cronológico de compras, notas de venta y abonos del cliente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistorialModal(false)}
                className="p-1.5 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {loadingHistorial || !historialCliente ? (
                <div className="flex flex-col items-center justify-center p-12 text-[var(--muted-foreground)]">
                  <Loader2 size={32} className="animate-spin text-[#0F172A] mb-2" />
                  <span className="text-xs font-bold">Cargando todos los movimientos del cliente...</span>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[var(--foreground)]">{historialCliente.cliente.nombre}</span>
                        <span className="px-2 py-0.5 bg-[#0F172A]/10 text-[#0F172A] border border-[#0F172A]/20 rounded-md text-[10px] font-bold">
                          {historialCliente.cliente.nivelCredito}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>Cédula: <strong>{historialCliente.cliente.cedula || '—'}</strong></span>
                        <span>Teléfono: <strong>{historialCliente.cliente.telefono || '—'}</strong></span>
                        <span>Límite Crédito: <strong>${historialCliente.cliente.limiteCredito.toFixed(2)}</strong></span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-semibold">Saldo Deudor Total:</span>
                      <span className="font-black text-base text-red-500">
                        ${historialCliente.resumen.saldoPendienteTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">Total Pedidos</span>
                      <span className="font-extrabold text-sm">{historialCliente.resumen.totalPedidos}</span>
                    </div>
                    <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">Total Comprado</span>
                      <span className="font-extrabold text-sm text-blue-600">
                        ${historialCliente.resumen.totalComprado.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">Total Abonado</span>
                      <span className="font-extrabold text-sm text-emerald-600">
                        ${historialCliente.resumen.totalAbonado.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                      <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">Compras Contado</span>
                      <span className="font-extrabold text-sm">{historialCliente.cliente.totalCompras}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-xs font-extrabold text-[var(--foreground)] uppercase tracking-wider">
                      Línea de Tiempo de Transacciones
                    </span>
                    <div className="flex gap-1">
                      {(['TODOS', 'COMPRAS', 'ABONOS'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFiltroHistorial(f)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            filtroHistorial === f
                              ? 'bg-[#0F172A] text-white'
                              : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                          }`}
                        >
                          {f === 'TODOS' ? 'Todos' : f === 'COMPRAS' ? 'Compras / Pedidos' : 'Abonos'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {historialCliente.movimientos
                      .filter((m) => {
                        if (filtroHistorial === 'COMPRAS') return m.tipo === 'COMPRA_PEDIDO';
                        if (filtroHistorial === 'ABONOS') return m.tipo === 'ABONO';
                        return true;
                      })
                      .map((m) => {
                        const isAbono = m.tipo === 'ABONO';
                        const isPedido = m.tipo === 'COMPRA_PEDIDO';
                        const isExpanded = isPedido && (pedidoHistorialExpandidoId === m.id);
                        const lineas = m.detalles?.lineas || [];

                        return (
                          <div
                            key={m.id}
                            className={`p-3.5 bg-[var(--card)] border border-[var(--border)] rounded-xl transition-all shadow-xs ${
                              isPedido ? 'cursor-pointer hover:border-[#0F172A]/40' : ''
                            } ${isExpanded ? 'ring-2 ring-[#0F172A]/10 border-[#0F172A]/30' : ''}`}
                            onClick={() => {
                              if (isPedido) {
                                setPedidoHistorialExpandidoId(isExpanded ? null : m.id);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                {isPedido ? (
                                  <div className="p-2 rounded-xl mt-0.5 bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-xl mt-0.5 bg-emerald-500/10 text-emerald-600">
                                    <ArrowDownRight size={16} />
                                  </div>
                                )}

                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-xs text-[var(--foreground)]">{m.titulo}</span>
                                    <span className="font-semibold text-xs text-[var(--muted-foreground)]">
                                      {historialCliente.cliente.nombre}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[var(--muted-foreground)]">{m.descripcion}</div>
                                  <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5 mt-1">
                                    <Calendar size={11} />
                                    <span>{new Date(m.fecha).toLocaleString('es-EC')}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div
                                  className={`text-xs font-black ${
                                    isAbono ? 'text-emerald-600' : 'text-blue-600'
                                  }`}
                                >
                                  {isAbono ? `+ $${m.monto.toFixed(2)}` : `$${m.monto.toFixed(2)}`}
                                </div>
                                {m.metodo && (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 rounded text-[9px] font-bold border border-emerald-500/20 inline-block mt-1">
                                    {m.metodo}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Desglose Expandible de Artículos Solicitados */}
                            {isExpanded && (
                              <div className="mt-3.5 pt-3 border-t border-[var(--border)] space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-[11px] text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                                    📦 DETALLE DE ARTÍCULOS SOLICITADOS — {m.numeroCodigo || m.titulo}
                                  </span>
                                  <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">
                                    {lineas.length} {lineas.length === 1 ? 'ítem' : 'ítems'}
                                  </span>
                                </div>

                                {lineas.length > 0 ? (
                                  <div className="space-y-2">
                                    {(() => {
                                      // Agrupar líneas por producto
                                      const grupos: { [key: string]: any[] } = {};
                                      lineas.forEach((l: any) => {
                                        const key = `${l.productId}_${l.tipoVenta || 'GENERAL'}`;
                                        if (!grupos[key]) grupos[key] = [];
                                        grupos[key].push(l);
                                      });

                                      return Object.entries(grupos).map(([key, items]) => {
                                        const item = items[0];
                                        const totalPares = items.reduce((s: number, it: any) => s + it.cantidad, 0);

                                        return (
                                          <div
                                            key={key}
                                            className="p-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl flex items-center justify-between gap-3"
                                          >
                                            <div className="flex items-center gap-3">
                                              {item.imageUrl ? (
                                                <img
                                                  src={item.imageUrl}
                                                  alt=""
                                                  className="w-12 h-12 object-cover rounded-lg border border-[var(--border)] shrink-0"
                                                />
                                              ) : (
                                                <div className="w-12 h-12 rounded-lg bg-[var(--muted)] flex items-center justify-center text-base shrink-0">
                                                  👟
                                                </div>
                                              )}
                                              <div>
                                                <div className="font-extrabold text-xs text-[var(--foreground)]">
                                                  {item.modelName} ({item.color})
                                                </div>
                                                <div className="text-[10px] text-[var(--muted-foreground)] font-medium">
                                                  Serie: {item.serieNombre || 'Estándar'}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                  {items.map((l: any, idx: number) => (
                                                    <span
                                                      key={idx}
                                                      className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-md text-[10px] font-bold"
                                                    >
                                                      T{l.numeroTalla}: {l.cantidad}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                              <span className="text-xs font-black text-emerald-600 block">
                                                {totalPares} {totalPares === 1 ? 'par' : 'pares'}
                                              </span>
                                              <span className="text-[10px] text-[var(--muted-foreground)] font-semibold block">
                                                ${(totalPares * Number(item.precioUnitario || 0)).toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[var(--muted-foreground)] italic text-center py-2">
                                    No hay detalle de artículos registrado para este pedido.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                    {historialCliente.movimientos.length === 0 && (
                      <p className="text-xs text-[var(--muted-foreground)] italic text-center py-6">
                        No hay movimientos registrados para este cliente.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 flex justify-end">
              <button
                onClick={() => setShowHistorialModal(false)}
                className="px-5 py-2 bg-[#0F172A] text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Devolución de Cliente */}
      {showDevolucionModal && carteraSeleccionada && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-rose-500 flex items-center gap-2">
                <AlertTriangle size={16} />
                Devolución de Cliente — {carteraSeleccionada.clienteNombre}
              </h3>
              <button onClick={() => setShowDevolucionModal(false)} className="text-[var(--muted-foreground)] text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                  Motivo de Devolución
                </label>
                <input
                  type="text"
                  placeholder="Ej. Talla incorrecta, producto defectuoso..."
                  value={motivoDevolucion}
                  onChange={(e) => setMotivoDevolucion(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                  Monto a Devolver ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={carteraSeleccionada.saldoTotalPendiente}
                  placeholder="0.00"
                  value={montoDevolucion}
                  onChange={(e) => setMontoDevolucion(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl text-xs font-bold text-rose-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl text-[11px]">
                💡 La devolución descontará el monto del saldo pendiente del cliente y registrará el ajuste contable.
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

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL: FACTURACIÓN ELECTRÓNICA SRI                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showFacturaModal && facturaCliente && carteraSeleccionada && (() => {
        const subtotalCalc = facturaCliente.detalles.reduce(
          (sum, d) => sum + d.cantidad * d.precioUnitario - (d.descuento || 0), 0
        );
        const ivaCalc = facturaCliente.detalles.reduce(
          (sum, d) => sum + ((d.cantidad * d.precioUnitario - (d.descuento || 0)) * d.tarifaIva) / 100, 0
        );
        const totalCalc = subtotalCalc + ivaCalc;

        const armarDatosPdf = () => ({
          emisor: {
            nombre: businessConfig?.nombre || 'CALZADO ARTESANAL CEVALLOS',
            ruc: businessConfig?.ruc || '1804884664001',
            direccion: businessConfig?.direccion || 'Cevallos, Tungurahua, Ecuador',
            telefono: businessConfig?.telefono,
            email: businessConfig?.email,
            obligadoContabilidad: businessConfig?.sriObligadoContabilidad,
            ambiente: businessConfig?.sriAmbiente,
            establecimiento: businessConfig?.sriEstablecimiento,
            puntoEmision: businessConfig?.sriPuntoEmision,
          },
          comprobante: {
            numero: facturaResultado?.numeroComprobante || `${businessConfig?.sriEstablecimiento || '001'}-${businessConfig?.sriPuntoEmision || '001'}-000000001`,
            fecha: new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }),
            claveAcceso: facturaResultado?.claveAcceso,
            formaPago: facturaCliente.formaPago,
          },
          comprador: {
            nombre: facturaCliente.nombre,
            cedula: facturaCliente.cedula,
            direccion: facturaCliente.direccion,
            telefono: facturaCliente.telefono,
            email: facturaCliente.email,
          },
          detalles: facturaCliente.detalles.map((d) => ({
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            descuento: d.descuento || 0,
            tarifaIva: d.tarifaIva || 15,
            subtotal: d.cantidad * d.precioUnitario - (d.descuento || 0),
          })),
          totales: {
            subtotal15: subtotalCalc,
            subtotal0: 0,
            descuento: 0,
            iva15: ivaCalc,
            total: totalCalc,
          },
        });

        return (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFacturaModal(false)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-5 border-b border-[var(--border)] bg-gradient-to-r from-[#0F172A] to-[#1e293b]">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 text-emerald-400">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white">Facturación Electrónica SRI</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold border border-emerald-500/30">
                        Comprobante Digital
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Emisión y autorización directa de factura con firma electrónica
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFacturaModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Pestañas */}
              <div className="flex gap-1 mt-4">
                <button
                  onClick={() => setTabFactura('CONFIGURAR')}
                  className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    tabFactura === 'CONFIGURAR'
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <Settings2 size={13} />
                  <span>Configurar Datos</span>
                </button>
                <button
                  onClick={() => setTabFactura('PREVISUALIZAR')}
                  className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    tabFactura === 'PREVISUALIZAR'
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <Eye size={13} />
                  <span>Vista Previa PDF</span>
                </button>
              </div>
            </div>

            {/* Body scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">

              {/* Resultado de la Emisión (si ya se emitió) */}
              {facturaResultado && (
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    facturaResultado.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {facturaResultado.success ? (
                        <CheckCircle size={18} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={18} className="text-rose-600" />
                      )}
                      <span className="font-black text-sm">
                        {facturaResultado.success
                          ? `Factura Autorizada por el SRI: ${facturaResultado.numeroComprobante}`
                          : `Emisión de Factura: ${facturaResultado.estadoSri}`}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                        facturaResultado.success
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {facturaResultado.estadoSri}
                    </span>
                  </div>

                  {facturaResultado.claveAcceso && (
                    <div className="p-2.5 bg-black/20 rounded-xl text-[11px] font-mono break-all text-slate-200">
                      <span className="text-slate-400 block font-sans text-[10px] font-bold">
                        Clave de Acceso SRI (49 dígitos):
                      </span>
                      {facturaResultado.claveAcceso}
                    </div>
                  )}

                  {facturaResultado.errorMensaje && (
                    <p className="text-xs text-rose-600 font-medium">
                      {facturaResultado.errorMensaje}
                    </p>
                  )}

                  {facturaResultado.success && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => {
                          const doc = generarFacturaPdfDoc(armarDatosPdf());
                          doc.save(`Factura_${facturaResultado.numeroComprobante || 'SRI'}.pdf`);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Descargar Factura PDF</span>
                      </button>
                      {facturaResultado.xmlUrl && (
                        <a
                          href={facturaResultado.xmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-slate-700"
                        >
                          <ExternalLink size={13} />
                          <span>Ver XML Firmado</span>
                        </a>
                      )}
                      {/* Botón WhatsApp directo con archivo PDF */}
                      {facturaCliente.telefono && (
                        <button
                          onClick={async () => {
                            const res = await compartirFacturaPdf(armarDatosPdf(), facturaCliente.telefono);
                            if (res.metodo === 'WEB_SHARE') {
                              showToast('Factura PDF compartida exitosamente.', 'success');
                            } else {
                              showToast('Se descargó el PDF y se abrió el chat de WhatsApp.', 'info');
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <MessageCircle size={13} />
                          <span>Enviar Factura PDF por WhatsApp</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ PESTAÑA: CONFIGURAR DATOS ═══ */}
              {tabFactura === 'CONFIGURAR' && (
                <div className="space-y-5">
                  {/* 1. Datos del Comprador */}
                  <div className="p-4 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                      <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                        <User size={14} className="text-[#0F172A]" />
                        <span>1. Datos del Comprador (Cliente)</span>
                      </span>
                      <span className="text-[10px] font-bold text-[var(--muted-foreground)]">
                        Nivel: {carteraSeleccionada.clienteNivel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                          Tipo Identificación *
                        </label>
                        <select
                          value={facturaCliente.tipoIdentificacion}
                          onChange={(e) =>
                            setFacturaCliente({
                              ...facturaCliente,
                              tipoIdentificacion: e.target.value,
                              cedula: e.target.value === '07' ? '9999999999999' : facturaCliente.cedula,
                            })
                          }
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                        >
                          <option value="05">Cédula de Identidad (10 dígitos)</option>
                          <option value="04">RUC (13 dígitos)</option>
                          <option value="07">Consumidor Final</option>
                          <option value="06">Pasaporte</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                          Número Cédula / RUC *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. 1804884664"
                          value={facturaCliente.cedula}
                          onChange={(e) =>
                            setFacturaCliente({ ...facturaCliente, cedula: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                          Razón Social / Nombres *
                        </label>
                        <input
                          type="text"
                          placeholder="Nombre del cliente"
                          value={facturaCliente.nombre}
                          onChange={(e) =>
                            setFacturaCliente({ ...facturaCliente, nombre: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-bold focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                          <MapPin size={11} />
                          Dirección del Comprador
                        </label>
                        <input
                          type="text"
                          placeholder="Dirección del cliente"
                          value={facturaCliente.direccion}
                          onChange={(e) =>
                            setFacturaCliente({ ...facturaCliente, direccion: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                          <Mail size={11} />
                          Email (Para envío de Factura PDF/XML)
                        </label>
                        <input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          value={facturaCliente.email}
                          onChange={(e) =>
                            setFacturaCliente({ ...facturaCliente, email: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Selector de Notas / Compras a Facturar */}
                  <div className="p-4 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                      <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt size={14} className="text-[#0F172A]" />
                        <span>2. Seleccionar Notas de Venta a Facturar</span>
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">
                        {facturaCliente.notasSeleccionadas.length} de {carteraSeleccionada.cobros.length} notas seleccionadas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {carteraSeleccionada.cobros.map((c) => {
                        const numNota = c.saleNote?.numero
                          ? `NOTA #${String(c.saleNote.numero).padStart(4, '0')}`
                          : c.numeroCobro || `#${c.id.slice(0, 8).toUpperCase()}`;
                        const monto = Number(c.montoOriginal ?? c.montoTotal ?? 0);
                        const isChecked = facturaCliente.notasSeleccionadas.includes(c.id);

                        return (
                          <label
                            key={c.id}
                            onClick={() => handleToggleNotaFacturar(c)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-[#0F172A]/10 border-[#0F172A]/40 shadow-xs'
                                : 'bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-[#0F172A] accent-[#0F172A] focus:ring-0 cursor-pointer"
                              />
                              <div>
                                <div className="font-bold text-xs text-[var(--foreground)]">{numNota}</div>
                                <div className="text-[10px] text-[var(--muted-foreground)]">
                                  {new Date(c.createdAt).toLocaleDateString('es-EC')} ({c.tipo || 'Crédito'})
                                </div>
                              </div>
                            </div>
                            <span className="font-black text-xs text-[var(--foreground)]">
                              ${monto.toFixed(2)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Detalle de Ítems Agrupados */}
                  <div className="space-y-3">
                    <span className="font-extrabold text-xs text-[var(--foreground)] uppercase tracking-wider block flex items-center gap-1.5">
                      <FileText size={14} className="text-[#0F172A]" />
                      <span>3. Detalle de Productos a Facturar</span>
                    </span>

                    <div className="border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[var(--muted)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                          <tr>
                            <th className="px-4 py-2.5">Descripción</th>
                            <th className="px-4 py-2.5 text-center">Cant.</th>
                            <th className="px-4 py-2.5 text-right">P. Unit.</th>
                            <th className="px-4 py-2.5 text-center">IVA</th>
                            <th className="px-4 py-2.5 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {facturaCliente.detalles.map((d, index) => {
                            const sub = d.cantidad * d.precioUnitario - (d.descuento || 0);
                            return (
                              <tr key={index} className="hover:bg-[var(--muted)]/20">
                                <td className="px-4 py-2.5 font-semibold text-[var(--foreground)]">
                                  {d.descripcion}
                                </td>
                                <td className="px-4 py-2.5 text-center font-bold">{d.cantidad}</td>
                                <td className="px-4 py-2.5 text-right font-semibold">
                                  ${d.precioUnitario.toFixed(2)}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 rounded text-[9px] font-bold">
                                    {d.tarifaIva}%
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-black text-emerald-600">
                                  ${sub.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4. Forma de Pago y Resumen Tributario */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl space-y-2">
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--foreground)]">
                        Forma de Pago SRI *
                      </label>
                      <select
                        value={facturaCliente.formaPago}
                        onChange={(e) =>
                          setFacturaCliente({ ...facturaCliente, formaPago: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0F172A]"
                      >
                        <option value="01">01 - Sin utilización del sistema financiero (Efectivo)</option>
                        <option value="20">20 - Otros con utilización del sistema financiero (Transferencia / Depósito)</option>
                        <option value="16">16 - Tarjeta de Débito</option>
                        <option value="19">19 - Tarjeta de Crédito</option>
                      </select>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Código oficial del catálogo de formas de pago del SRI Ecuador.
                      </p>
                    </div>

                    <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-1.5 shadow-xs">
                      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>Subtotal Base 0%:</span>
                        <span className="font-semibold">$0.00</span>
                      </div>
                      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>Subtotal Base 15%:</span>
                        <span className="font-semibold">${subtotalCalc.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>IVA (15%):</span>
                        <span className="font-semibold text-emerald-600">${ivaCalc.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black border-t border-[var(--border)] pt-2 text-[var(--foreground)]">
                        <span>TOTAL FACTURA SRI:</span>
                        <span className="text-base text-emerald-600">${totalCalc.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ PESTAÑA: VISTA PREVIA PDF ═══ */}
              {tabFactura === 'PREVISUALIZAR' && (
                <div className="space-y-0" id="seccion-factura-pdf">
                  {/* Comprobante PDF Oficial */}
                  <div className="border-2 border-[var(--border)] rounded-2xl overflow-hidden bg-white dark:bg-slate-50 text-slate-900 shadow-lg">
                    {/* Encabezado con Datos del Dueño del Negocio / RUC Emisor */}
                    <div className="p-5 border-b-2 border-slate-300">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Datos del Emisor (Dueño del Negocio) */}
                        <div className="space-y-1">
                          <h4 className="font-black text-sm text-slate-900 uppercase">
                            {businessConfig?.nombre || 'CALZADO ARTESANAL CEVALLOS'}
                          </h4>
                          <p className="text-[10px] text-slate-600 leading-tight">
                            {businessConfig?.email ? `Email: ${businessConfig.email}` : 'Comercialización y Distribución de Calzado'}
                          </p>
                          <p className="text-[10px] text-slate-700 font-bold">
                            RUC: {businessConfig?.ruc || '1804884664001'}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Matriz: {businessConfig?.direccion || 'Cevallos, Tungurahua, Ecuador'}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Obligado a llevar Contabilidad: {businessConfig?.sriObligadoContabilidad ? 'SI' : 'NO'}
                          </p>
                        </div>
                        {/* Datos del Comprobante */}
                        <div className="text-right space-y-1">
                          <div className="inline-block px-3 py-1.5 border-2 border-slate-900 rounded-lg">
                            <p className="font-black text-xs text-slate-900 uppercase">Factura</p>
                            <p className="text-[10px] text-slate-700 font-bold">
                              No. {businessConfig?.sriEstablecimiento || '001'}-{businessConfig?.sriPuntoEmision || '001'}-000000001
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-600 mt-2">
                            Fecha de Emisión: {new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <p className="text-[10px] text-slate-700 font-mono font-bold">
                            Ambiente: {businessConfig?.sriAmbiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Datos del Comprador */}
                    <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <div className="flex gap-1 text-[10px]">
                          <span className="font-bold text-slate-700">Razón Social:</span>
                          <span className="text-slate-900 font-semibold">{facturaCliente.nombre}</span>
                        </div>
                        <div className="flex gap-1 text-[10px]">
                          <span className="font-bold text-slate-700">Identificación:</span>
                          <span className="text-slate-900 font-semibold">{facturaCliente.cedula}</span>
                        </div>
                        <div className="flex gap-1 text-[10px]">
                          <span className="font-bold text-slate-700">Dirección:</span>
                          <span className="text-slate-900">{facturaCliente.direccion || 'No registrada'}</span>
                        </div>
                        <div className="flex gap-1 text-[10px]">
                          <span className="font-bold text-slate-700">Email:</span>
                          <span className="text-slate-900">{facturaCliente.email || 'No registrado'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tabla de Detalle */}
                    <div className="px-5 py-3">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b-2 border-slate-300 text-slate-700 font-black uppercase">
                            <th className="py-1.5 text-left">Descripción</th>
                            <th className="py-1.5 text-center w-14">Cant.</th>
                            <th className="py-1.5 text-right w-20">P. Unit.</th>
                            <th className="py-1.5 text-right w-16">Desc.</th>
                            <th className="py-1.5 text-right w-20">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {facturaCliente.detalles.map((d, idx) => {
                            const sub = d.cantidad * d.precioUnitario - (d.descuento || 0);
                            return (
                              <tr key={idx} className="border-b border-slate-200">
                                <td className="py-1.5 text-left font-semibold text-slate-900">{d.descripcion}</td>
                                <td className="py-1.5 text-center font-bold">{d.cantidad}</td>
                                <td className="py-1.5 text-right">${d.precioUnitario.toFixed(2)}</td>
                                <td className="py-1.5 text-right">${(d.descuento || 0).toFixed(2)}</td>
                                <td className="py-1.5 text-right font-bold">${sub.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Totales PDF */}
                    <div className="px-5 py-3 border-t-2 border-slate-300 bg-slate-50">
                      <div className="flex justify-end">
                        <div className="w-64 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-700">
                            <span>SUBTOTAL 15%:</span>
                            <span className="font-bold">${subtotalCalc.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-700">
                            <span>SUBTOTAL 0%:</span>
                            <span className="font-bold">$0.00</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-700">
                            <span>DESCUENTO:</span>
                            <span className="font-bold">$0.00</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-700">
                            <span>IVA 15%:</span>
                            <span className="font-bold">${ivaCalc.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-black text-slate-900 border-t-2 border-slate-400 pt-1.5">
                            <span>VALOR TOTAL:</span>
                            <span>${totalCalc.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Información adicional PDF */}
                    <div className="px-5 py-3 border-t border-slate-200 text-[9px] text-slate-500 space-y-0.5">
                      <p>Forma de Pago: {facturaCliente.formaPago === '01' ? 'Sin utilización del sistema financiero (Efectivo)' : facturaCliente.formaPago === '20' ? 'Otros con utilización del sistema financiero' : facturaCliente.formaPago === '16' ? 'Tarjeta de Débito' : 'Tarjeta de Crédito'} — Plazo: 30 días</p>
                      <p>Este documento es una previsualización PDF de la factura electrónica a emitirse ante el SRI.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con Acciones */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowFacturaModal(false)}
                  className="flex-1 sm:flex-none px-5 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--muted)] transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                {/* Botón Imprimir / Guardar PDF */}
                {tabFactura === 'PREVISUALIZAR' && (
                  <button
                    onClick={() => {
                      const doc = generarFacturaPdfDoc(armarDatosPdf());
                      doc.save(`Factura_${armarDatosPdf().comprobante.numero}.pdf`);
                      showToast('Archivo PDF generado y descargado.', 'success');
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-bold hover:bg-[var(--muted)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Guardar PDF</span>
                  </button>
                )}
                {/* Botón Compartir PDF directamente a WhatsApp */}
                {facturaCliente.telefono && tabFactura === 'PREVISUALIZAR' && !facturaResultado && (
                  <button
                    onClick={async () => {
                      const res = await compartirFacturaPdf(armarDatosPdf(), facturaCliente.telefono);
                      if (res.metodo === 'WEB_SHARE') {
                        showToast('Factura PDF enviada a WhatsApp.', 'success');
                      } else {
                        showToast('Se descargó el PDF y se abrió el chat de WhatsApp.', 'info');
                      }
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    <span>Enviar Factura PDF por WhatsApp</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {tabFactura === 'CONFIGURAR' && (
                  <button
                    onClick={() => setTabFactura('PREVISUALIZAR')}
                    className="flex-1 sm:flex-none px-5 py-2.5 border border-[#0F172A]/30 bg-[#0F172A]/5 hover:bg-[#0F172A]/10 text-[#0F172A] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye size={14} />
                    <span>Ver Previsualización PDF</span>
                  </button>
                )}
                <button
                  onClick={handleEmitirFacturaSRI}
                  disabled={emittingFactura || !online}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {emittingFactura ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Firmando y Emitiendo al SRI...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck size={16} />
                      <span>Emitir Factura Electrónica SRI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
