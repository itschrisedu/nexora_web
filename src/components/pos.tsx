"use client";

import React, { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
import { useToast } from "./ui/toast";
import { useUnsavedChanges } from "../utils/unsaved-changes";
import { capitalizarNombreCompleto } from "@/utils/text-formatters";
import {
  generarUrlPublicaVentaPOS,
  armarMensajeWhatsAppVentaPOS,
  type VentaPosComprobanteData,
} from "@/services/comprobante-url.service";
import {
  Store,
  DollarSign,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle,
  Lock,
  Unlock,
  Calculator,
  TrendingUp,
  AlertTriangle,
  Printer,
  User,
  FileText,
  Search,
  Loader2,
  ShoppingBag,
  Calendar,
  Filter,
  History,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Package,
  Layers,
  Award,
  Users,
  Clock,
  Receipt,
  BarChart3,
  Sparkles,
  Send,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";

interface CajaEstado {
  abierta: boolean;
  sesionId?: string;
  montoInicial?: number;
  totalVentas?: number;
  totalEfectivo?: number;
  totalTarjeta?: number;
  totalTransferencia?: number;
  montoEsperadoEfectivo?: number;
  fechaApertura?: string;
}

interface ProductoBusqueda {
  id: string;
  baseCode: string;
  modelName: string;
  color: string;
  salePrice: number;
  serieNombre: string;
  serieId: string;
  imageUrl?: string;
  tallas: { tallaId: string; numero: number; cantidad: number }[];
}

interface ItemVenta {
  productId: string;
  serieId: string;
  tallaId: string;
  tallaNumero: number;
  nombre: string;
  color: string;
  imageUrl?: string;
  cantidad: number;
  precioUnitario: number;
}

interface VentaItemDetalle {
  productId: string;
  nombre: string;
  modelName: string;
  color: string;
  serie: string;
  talla: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  baseCode?: string;
  imageUrl?: string;
}

interface VentaPOS {
  id: string;
  saleNoteId?: string;
  numeroNota: string;
  fecha: string;
  total: number;
  subtotal: number;
  descuento: number;
  metodoPago: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | string;
  detallePago: string;
  vendedor: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  cliente: {
    id: string;
    nombre: string;
    cedula: string;
    telefono?: string;
    email?: string;
    direccion?: string;
  };
  totalPares: number;
  lineas: VentaItemDetalle[];
  notas?: string;
}

interface MetricasVentasPOS {
  totalRecaudado: number;
  cantidadVentas: number;
  cantidadPares: number;
  ticketPromedio: number;
  desgloseMetodosPago: {
    efectivo: { total: number; cantidad: number };
    tarjeta: { total: number; cantidad: number };
    transferencia: { total: number; cantidad: number };
  };
  desgloseVendedores: {
    userId: string;
    nombre: string;
    email: string;
    total: number;
    ventas: number;
    pares: number;
  }[];
  topModelos: {
    nombre: string;
    pares: number;
    total: number;
  }[];
}

export default function PosComponent() {
  const { showToast } = useToast();

  // ─── Pestaña Activa ('pos' = Caja Terminal, 'ventas' = Ventas Realizadas / Historial) ───
  const [tabActiva, setTabActiva] = useState<"pos" | "ventas">("pos");

  // Usuario y Rol Actual
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estado de Caja
  const [caja, setCaja] = useState<CajaEstado>({ abierta: false });
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [abriendoCaja, setAbriendoCaja] = useState(false);
  const [cerrandoCaja, setCerrandoCaja] = useState(false);
  const [montoApertura, setMontoApertura] = useState("0");

  // Venta POS Mostrador
  const [productos, setProductos] = useState<ProductoBusqueda[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>([]);
  const [descuentoVenta, setDescuentoVenta] = useState("");
  const [metodoPago, setMetodoPago] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA">("EFECTIVO");
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(false);

  // Proteger venta en curso si el usuario intenta salir
  useUnsavedChanges(
    itemsVenta.length > 0 && !ventaExitosa,
    undefined,
    `Caja POS (${itemsVenta.length} producto${itemsVenta.length > 1 ? "s" : ""} en venta actual)`
  );

  // Cupones de Campaña POS
  const [codigoCuponPOS, setCodigoCuponPOS] = useState("");
  const [cuponAplicadoPOS, setCuponAplicadoPOS] = useState<any | null>(null);
  const [validandoCuponPOS, setValidandoCuponPOS] = useState(false);
  const [cuponErrorPOS, setCuponErrorPOS] = useState("");

  // Tipo de Comprobante & Datos de Cliente
  const [tipoComprobante, setTipoComprobante] = useState<"CONSUMIDOR_FINAL" | "FACTURA">("FACTURA");
  const [clienteFactura, setClienteFactura] = useState({
    id: "",
    cedula: "",
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    direccion: "",
  });
  const [clienteRegistrado, setClienteRegistrado] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [sugerenciasClientes, setSugerenciasClientes] = useState<any[]>([]);

  // Detalle de Pago (Transferencia o Tarjeta)
  const [detalleTransferencia, setDetalleTransferencia] = useState({
    banco: "Banco Pichincha",
    numeroComprobante: "",
  });

  const [detalleTarjeta, setDetalleTarjeta] = useState({
    tipoTarjeta: "DÉBITO" as "DÉBITO" | "CRÉDITO",
    marcaTarjeta: "VISA",
    numeroVoucher: "",
    numeroAutorizacion: "",
    lote: "",
  });

  // Calculadora de Vuelto & Ticket
  const [pagaCon, setPagaCon] = useState("");
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ultimoTicket, setUltimoTicket] = useState<any>(null);
  const [negocioInfo, setNegocioInfo] = useState<any>(null);

  // Envío de Comprobante POS por WhatsApp y Email
  const [enviandoComprobantePOS, setEnviandoComprobantePOS] = useState(false);
  const [comprobanteEnviadoPOS, setComprobanteEnviadoPOS] = useState(false);

  // Cierre de caja
  const [modalCierreOpen, setModalCierreOpen] = useState(false);
  const [montoRealEfectivo, setMontoRealEfectivo] = useState("");
  const [notasCierre, setNotasCierre] = useState("");
  const [resultadoCierre, setResultadoCierre] = useState<any>(null);

  // ─── ESTADOS: PESTAÑA VENTAS REALIZADAS (HISTORIAL Y FILTROS) ───
  const [periodoFiltro, setPeriodoFiltro] = useState<"dia" | "semana" | "mes" | "trimestre" | "anio" | "custom">("dia");
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaFinFiltro, setFechaFinFiltro] = useState(() => new Date().toISOString().split("T")[0]);
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("TODOS");
  const [metodoPagoFiltro, setMetodoPagoFiltro] = useState<string>("TODOS");
  const [modeloFiltro, setModeloFiltro] = useState<string>("TODOS");
  const [busquedaVentas, setBusquedaVentas] = useState("");
  const [vendedoresLista, setVendedoresLista] = useState<{ id: string; nombre: string; email: string; rol: string }[]>([]);
  const [historialVentas, setHistorialVentas] = useState<VentaPOS[]>([]);
  const [metricasVentas, setMetricasVentas] = useState<MetricasVentasPOS | null>(null);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [ventaDetalleModalOpen, setVentaDetalleModalOpen] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaPOS | null>(null);

  // Identificar si el usuario logueado es Administrador / Dueño
  const isAdmin = currentUser?.rol === "ROL_ADMIN" || currentUser?.rol === "ROL_SUPER_ADMIN" || !!currentUser?.esAdminGeneral;

  // Modelos únicos activos disponibles en POS para filtrado
  const modelosDisponibles = React.useMemo(() => {
    const map = new Map<string, { modelName: string; totalStock: number; series: Set<string>; colores: Set<string> }>();
    productos.forEach((p) => {
      const stock = p.tallas.reduce((acc, t) => acc + (t.cantidad || 0), 0);
      const key = p.modelName.trim();
      if (!map.has(key)) {
        map.set(key, {
          modelName: key,
          totalStock: stock,
          series: new Set(p.serieNombre ? [p.serieNombre] : []),
          colores: new Set(p.color ? [p.color] : []),
        });
      } else {
        const item = map.get(key)!;
        item.totalStock += stock;
        if (p.serieNombre) item.series.add(p.serieNombre);
        if (p.color) item.colores.add(p.color);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.modelName.localeCompare(b.modelName));
  }, [productos]);

  // Manejador global de la tecla Escape para modales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (ticketModalOpen) {
        e.preventDefault();
        setTicketModalOpen(false);
        return;
      }
      if (modalCierreOpen) {
        e.preventDefault();
        setModalCierreOpen(false);
        setResultadoCierre(null);
        return;
      }
      if (ventaDetalleModalOpen) {
        e.preventDefault();
        setVentaDetalleModalOpen(false);
        setVentaSeleccionada(null);
        return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [ticketModalOpen, modalCierreOpen, ventaDetalleModalOpen]);

  // Carga inicial
  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          setCurrentUser(parsed);
        } catch {}
      }
    }

    const inicializar = async () => {
      setLoadingInicial(true);
      await Promise.allSettled([
        cargarEstadoCaja(),
        cargarProductos(),
        cargarNegocioInfo(),
        cargarVendedores(),
      ]);
      setLoadingInicial(false);
    };
    inicializar();
  }, []);

  // Cargar historial de ventas cuando se activa la pestaña o cambian los filtros
  useEffect(() => {
    if (tabActiva === "ventas") {
      cargarHistorialVentas();
    }
  }, [tabActiva, periodoFiltro, fechaInicioFiltro, fechaFinFiltro, vendedorFiltro, metodoPagoFiltro, modeloFiltro]);

  const cargarNegocioInfo = async () => {
    try {
      const res = await ApiService.get("/configuracion/negocio");
      setNegocioInfo(res);
    } catch {}
  };

  const cargarVendedores = async () => {
    try {
      const res = await ApiService.get("/pos/vendedores");
      if (Array.isArray(res)) {
        setVendedoresLista(res);
      }
    } catch (err) {
      console.error("Error al cargar vendedores POS:", err);
    }
  };

  const cargarEstadoCaja = async () => {
    try {
      const res = await ApiService.get("/pos/caja/estado");
      if (res?.abierta && res.caja) {
        setCaja({
          abierta: true,
          sesionId: res.caja.id,
          montoInicial: res.caja.montoInicial,
          totalVentas: res.caja.totalVentas,
          totalEfectivo: res.caja.ventasEfectivo,
          totalTarjeta: res.caja.ventasTarjeta,
          totalTransferencia: res.caja.ventasTransferencia,
          montoEsperadoEfectivo: res.caja.montoEsperadoEfectivo,
          fechaApertura: res.caja.fechaApertura,
        });
      } else if (res?.abierta) {
        setCaja(res);
      } else {
        setCaja({ abierta: false });
      }
    } catch (err) {
      console.error("Error al cargar estado de caja:", err);
      setCaja({ abierta: false });
    }
  };

  const cargarProductos = async () => {
    try {
      const res = await ApiService.get("/pos/productos-disponibles");
      if (Array.isArray(res)) {
        setProductos(res);
      } else {
        setProductos([]);
      }
    } catch (err) {
      console.error("Error al cargar productos POS:", err);
      setProductos([]);
    }
  };

  const cargarHistorialVentas = async () => {
    try {
      setLoadingVentas(true);
      const params = new URLSearchParams();
      if (periodoFiltro) params.append("periodo", periodoFiltro);
      if (periodoFiltro === "custom") {
        if (fechaInicioFiltro) params.append("fechaInicio", fechaInicioFiltro);
        if (fechaFinFiltro) params.append("fechaFin", fechaFinFiltro);
      }
      if (vendedorFiltro && vendedorFiltro !== "TODOS") {
        params.append("userId", vendedorFiltro);
      }
      if (metodoPagoFiltro && metodoPagoFiltro !== "TODOS") {
        params.append("metodoPago", metodoPagoFiltro);
      }
      if (modeloFiltro && modeloFiltro !== "TODOS") {
        params.append("modelo", modeloFiltro);
      }
      if (busquedaVentas.trim()) {
        params.append("busqueda", busquedaVentas.trim());
      }

      const res = await ApiService.get(`/pos/ventas?${params.toString()}`);
      if (res) {
        setHistorialVentas(res.ventas || []);
        setMetricasVentas(res.metricas || null);
      }
    } catch (err: any) {
      console.error("Error al cargar ventas POS:", err);
      showToast("Error al cargar historial de ventas: " + (err.message || ""), "error");
    } finally {
      setLoadingVentas(false);
    }
  };

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAbriendoCaja(true);
      await ApiService.post("/pos/caja/abrir", {
        montoInicial: parseFloat(montoApertura) || 0,
      });
      showToast("Caja abierta exitosamente", "success");
      await cargarEstadoCaja();
      await cargarProductos();
    } catch (err: any) {
      showToast("Error al abrir caja: " + err.message, "error");
    } finally {
      setAbriendoCaja(false);
    }
  };

  const handleAgregarItem = (prod: ProductoBusqueda, talla: { tallaId: string; numero: number; cantidad: number }) => {
    if (talla.cantidad <= 0) return;

    const existente = itemsVenta.findIndex(
      (i) => i.productId === prod.id && i.tallaId === talla.tallaId
    );

    if (existente > -1) {
      const nuevo = [...itemsVenta];
      nuevo[existente].cantidad += 1;
      setItemsVenta(nuevo);
    } else {
      setItemsVenta([
        ...itemsVenta,
        {
          productId: prod.id,
          serieId: prod.serieId,
          tallaId: talla.tallaId,
          tallaNumero: talla.numero,
          nombre: `${prod.modelName} (${prod.color})`,
          color: prod.color,
          imageUrl: prod.imageUrl,
          cantidad: 1,
          precioUnitario: prod.salePrice,
        },
      ]);
    }
  };

  const handleRemoverItem = (index: number) => {
    setItemsVenta(itemsVenta.filter((_, i) => i !== index));
  };

  const buscarCliente = async (query: string) => {
    const clean = query.trim();
    if (!clean || clean.length < 3) {
      setSugerenciasClientes([]);
      return;
    }
    try {
      setBuscandoCliente(true);
      const res = await ApiService.get(`/clientes?q=${encodeURIComponent(clean)}`);
      const lista = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(lista) && lista.length > 0) {
        setSugerenciasClientes(lista);
        // Si la búsqueda es una cédula/RUC exacta de 10 o 13 dígitos
        if (clean.length === 10 || clean.length === 13) {
          const matchExact = lista.find(
            (c: any) =>
              (c.cedula && c.cedula.trim() === clean) ||
              (c.ruc && c.ruc.trim() === clean)
          );
          if (matchExact) {
            seleccionarCliente(matchExact);
          }
        }
      } else {
        setSugerenciasClientes([]);
        if (clean.length === 10 || clean.length === 13) {
          setClienteRegistrado(false);
        }
      }
    } catch {
      setSugerenciasClientes([]);
    } finally {
      setBuscandoCliente(false);
    }
  };

  const seleccionarCliente = (c: any) => {
    setClienteFactura({
      id: c.id || "",
      cedula: c.cedula || c.ruc || "",
      nombre: c.nombre || "",
      apellido: c.apellido || "",
      email: c.email || "",
      telefono: c.telefono || "",
      direccion: c.direccion || "",
    });
    setClienteRegistrado(true);
    setSugerenciasClientes([]);
    showToast(`Cliente cargado: ${c.nombre} ${c.apellido || ""}`, "success");
  };

  const limpiarClienteFactura = () => {
    setClienteFactura({
      id: "",
      cedula: "",
      nombre: "",
      apellido: "",
      email: "",
      telefono: "",
      direccion: "",
    });
    setClienteRegistrado(false);
    setSugerenciasClientes([]);
  };

  const handleAplicarCuponPOS = async () => {
    if (!codigoCuponPOS.trim()) return;
    if (itemsVenta.length === 0) {
      setCuponErrorPOS("Agrega productos al carrito antes de aplicar el cupón.");
      return;
    }
    setValidandoCuponPOS(true);
    setCuponErrorPOS("");
    try {
      const totalPares = itemsVenta.reduce((sum, i) => sum + i.cantidad, 0);
      const res = await ApiService.post("/clientes/promociones/validar", {
        codigo: codigoCuponPOS.trim(),
        totalPares,
        totalMonto: subtotalVenta,
        tipoPago: "CONTADO",
      });
      if (res.valido) {
        setCuponAplicadoPOS(res);
        setDescuentoVenta(String(res.descuentoCalculado || 0));
        showToast(res.mensaje || "¡Cupón de descuento aplicado con éxito!", "success");
      } else {
        setCuponErrorPOS(res.mensaje || "El cupón no es válido.");
        setCuponAplicadoPOS(null);
      }
    } catch (err: any) {
      setCuponErrorPOS(err.message || "Error al validar cupón.");
      setCuponAplicadoPOS(null);
    } finally {
      setValidandoCuponPOS(false);
    }
  };

  const handleRemoverCuponPOS = () => {
    setCuponAplicadoPOS(null);
    setCodigoCuponPOS("");
    setCuponErrorPOS("");
    setDescuentoVenta("");
  };

  const subtotalVenta = itemsVenta.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0);
  const valorDescuento = Math.min(subtotalVenta, Math.max(0, parseFloat(descuentoVenta) || 0));
  const totalVenta = Math.max(0, subtotalVenta - valorDescuento);

  const handleRegistrarVenta = async () => {
    if (itemsVenta.length === 0) return;
    if (tipoComprobante === "FACTURA" && !clienteFactura.nombre.trim()) {
      showToast("Por favor ingresa la Razón Social / Nombre del cliente", "error");
      return;
    }

    try {
      setProcesandoVenta(true);
      const factorDescuento = subtotalVenta > 0 ? totalVenta / subtotalVenta : 1;

      const detallePagoPayload =
        metodoPago === "TRANSFERENCIA"
          ? {
              banco: detalleTransferencia.banco.trim(),
              numeroComprobante: detalleTransferencia.numeroComprobante.trim(),
            }
          : metodoPago === "TARJETA"
          ? {
              tipoTarjeta: detalleTarjeta.tipoTarjeta,
              marcaTarjeta: detalleTarjeta.marcaTarjeta,
              numeroVoucher: detalleTarjeta.numeroVoucher.trim(),
              numeroAutorizacion: detalleTarjeta.numeroAutorizacion.trim(),
              lote: detalleTarjeta.lote.trim(),
            }
          : undefined;

      await ApiService.post("/pos/venta-directa", {
        metodoPago,
        tipoComprobante,
        clienteId: tipoComprobante === "FACTURA" && clienteFactura.id ? clienteFactura.id : undefined,
        detallePago: detallePagoPayload,
        clienteData:
          tipoComprobante === "FACTURA"
            ? {
                cedula: clienteFactura.cedula.trim(),
                ruc: clienteFactura.cedula.trim(),
                nombre: clienteFactura.nombre.trim(),
                apellido: clienteFactura.apellido.trim(),
                email: clienteFactura.email.trim(),
                telefono: clienteFactura.telefono.trim(),
                direccion: clienteFactura.direccion.trim(),
              }
            : undefined,
        lineas: itemsVenta.map((i) => ({
          productId: i.productId,
          serieId: i.serieId,
          tallaId: i.tallaId,
          cantidad: i.cantidad,
          precioUnitario: Number((i.precioUnitario * factorDescuento).toFixed(2)),
        })),
      });
      showToast("Venta registrada exitosamente", "success");
      setVentaExitosa(true);
      setComprobanteEnviadoPOS(false);

      // Generar ticket térmico
      const nombreComercial = negocioInfo?.nombre || "CALZADO COMERCIAL";
      const clienteTelefonoFinal = tipoComprobante === "FACTURA" ? clienteFactura.telefono.trim() : "";
      const clienteEmailFinal = tipoComprobante === "FACTURA" ? clienteFactura.email.trim() : "";
      const clienteNombreFinal = tipoComprobante === "FACTURA"
        ? `${clienteFactura.nombre} ${clienteFactura.apellido}`.trim()
        : "Consumidor Final";
      const clienteIdentFinal = tipoComprobante === "FACTURA"
        ? clienteFactura.cedula.trim() || "9999999999"
        : "9999999999";

      const ticketData = {
        fecha: new Date().toLocaleString("es-EC"),
        tipoComprobante,
        clienteNombre: clienteNombreFinal,
        clienteIdentificacion: clienteIdentFinal,
        clienteEmail: clienteEmailFinal,
        clienteTelefono: clienteTelefonoFinal,
        clienteDireccion: tipoComprobante === "FACTURA" ? clienteFactura.direccion.trim() : "",
        items: [...itemsVenta],
        subtotal: subtotalVenta,
        descuento: valorDescuento,
        total: totalVenta,
        metodoPago,
        detallePago: detallePagoPayload,
        pagaCon: metodoPago === "EFECTIVO" ? parseFloat(pagaCon) || totalVenta : totalVenta,
        vuelto: metodoPago === "EFECTIVO" ? Math.max(0, (parseFloat(pagaCon) || totalVenta) - totalVenta) : 0,
        negocio: {
          nombre: nombreComercial,
          ruc: negocioInfo?.ruc || "1800000000001",
          direccion: negocioInfo?.direccion || "Cevallos, Tungurahua",
          telefono: negocioInfo?.telefono || "",
        },
      };

      if (cuponAplicadoPOS?.promocion?.codigo) {
        try {
          await ApiService.post("/clientes/promociones/canjear", {
            codigo: cuponAplicadoPOS.promocion.codigo,
          });
        } catch (e) {
          console.warn("Error canjeando cupón en POS:", e);
        }
      }

      setUltimoTicket(ticketData);
      setTicketModalOpen(true);

      setItemsVenta([]);
      setDescuentoVenta("");
      setPagaCon("");
      setCuponAplicadoPOS(null);
      setCodigoCuponPOS("");
      setCuponErrorPOS("");
      if (tipoComprobante === "FACTURA") {
        setClienteFactura({
          id: "",
          cedula: "",
          nombre: "",
          apellido: "",
          email: "",
          telefono: "",
          direccion: "",
        });
        setClienteRegistrado(false);
        setSugerenciasClientes([]);
      }
      await cargarEstadoCaja();
      await cargarProductos();
      setTimeout(() => setVentaExitosa(false), 3000);
    } catch (err: any) {
      showToast("Error al registrar venta: " + err.message, "error");
    } finally {
      setProcesandoVenta(false);
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCerrandoCaja(true);
      const res = await ApiService.post("/pos/caja/cerrar", {
        montoRealEfectivo: parseFloat(montoRealEfectivo) || 0,
        notas: notasCierre.trim() || undefined,
      });
      setResultadoCierre(res);
      showToast("Caja cerrada y arqueo completado", "success");
      await cargarEstadoCaja();
    } catch (err: any) {
      showToast("Error al cerrar caja: " + err.message, "error");
    } finally {
      setCerrandoCaja(false);
    }
  };

  // Re-imprimir ticket desde el historial de ventas
  const handleReimprimirTicket = (venta: VentaPOS) => {
    const nombreComercial = negocioInfo?.nombre || "LOCAL COMERCIAL";
    const ticketData = {
      fecha: new Date(venta.fecha).toLocaleString("es-EC"),
      tipoComprobante:
        venta.cliente?.nombre && venta.cliente.nombre !== "Consumidor Final"
          ? "FACTURA"
          : "CONSUMIDOR_FINAL",
      clienteNombre: venta.cliente?.nombre || "Consumidor Final",
      clienteIdentificacion: venta.cliente?.cedula || "9999999999",
      clienteEmail: venta.cliente?.email || "",
      clienteTelefono: venta.cliente?.telefono || "",
      clienteDireccion: venta.cliente?.direccion || "",
      items: venta.lineas.map((l) => ({
        cantidad: l.cantidad,
        nombre: l.nombre || l.modelName,
        tallaNumero: l.talla,
        precioUnitario: l.precioUnitario,
      })),
      subtotal: venta.subtotal,
      descuento: venta.descuento || 0,
      total: venta.total,
      metodoPago: venta.metodoPago,
      detallePago: venta.detallePago
        ? {
            banco: venta.detallePago.includes("Banco") ? venta.detallePago : undefined,
            numeroComprobante: venta.detallePago.includes("#") ? venta.detallePago : undefined,
          }
        : undefined,
      pagaCon: venta.total,
      vuelto: 0,
      negocio: {
        nombre: nombreComercial,
        ruc: negocioInfo?.ruc || "1800000000001",
        direccion: negocioInfo?.direccion || "Cevallos, Tungurahua",
        telefono: negocioInfo?.telefono || "",
      },
    };
    setUltimoTicket(ticketData);
    setTicketModalOpen(true);
  };

  // ─── FUNCIÓN UNIFICADA DE ENVÍO DE COMPROBANTE POS (WHATSAPP + CORREO EN SEGUNDO PLANO) ───

  const construirComprobanteData = (ticket: any): VentaPosComprobanteData => ({
    negocio: ticket.negocio,
    fecha: ticket.fecha,
    tipoComprobante: ticket.tipoComprobante,
    clienteNombre: ticket.clienteNombre,
    clienteIdentificacion: ticket.clienteIdentificacion,
    clienteEmail: ticket.clienteEmail || "",
    clienteTelefono: ticket.clienteTelefono || "",
    items: (ticket.items || []).map((it: any) => ({
      cantidad: it.cantidad,
      nombre: it.nombre,
      tallaNumero: it.tallaNumero,
      precioUnitario: it.precioUnitario,
    })),
    subtotal: ticket.subtotal,
    descuento: ticket.descuento,
    total: ticket.total,
    metodoPago: ticket.metodoPago,
    pagaCon: ticket.pagaCon,
    vuelto: ticket.vuelto,
  });

  const handleEnviarComprobanteWhatsAppYCorreo = async () => {
    if (!ultimoTicket) return;
    setEnviandoComprobantePOS(true);
    try {
      const autoEmail = typeof window !== "undefined" ? localStorage.getItem("nexora_auto_email_comprobante") !== "false" : true;
      const autoWhatsApp = typeof window !== "undefined" ? (localStorage.getItem("nexora_auto_whatsapp_abono") !== "false" && localStorage.getItem("nexora_auto_whatsapp_comprobante") !== "false") : true;

      if (!autoEmail && !autoWhatsApp) {
        showToast("Los envíos automáticos por WhatsApp y Correo están desactivados en Personalización/Configuración.", "info");
        return;
      }

      const data = construirComprobanteData(ultimoTicket);
      const urlComprobante = await generarUrlPublicaVentaPOS(data);
      const mensaje = armarMensajeWhatsAppVentaPOS(data, urlComprobante);

      // 1. Envío automático por Correo en segundo plano (si está activado y hay email)
      let enviadoCorreo = false;
      if (autoEmail && ultimoTicket.clienteEmail) {
        ApiService.post("/notificaciones/email-comprobante", {
          destinatario: ultimoTicket.clienteEmail,
          asunto: `Comprobante de Venta — $${ultimoTicket.total.toFixed(2)} — ${ultimoTicket.negocio?.nombre || "Calzado"}`,
          tipo: "GENERAL",
          detalles: {
            mensaje: mensaje,
            urlComprobante,
          },
        })
          .then(() => showToast(`Comprobante enviado por correo a ${ultimoTicket.clienteEmail}`, "success"))
          .catch((e) => console.warn("Error enviando email POS:", e));
        enviadoCorreo = true;
      }

      // 2. Abrir WhatsApp directamente (si está activado)
      let enviadoWhatsApp = false;
      if (autoWhatsApp) {
        let numLimpio = (ultimoTicket.clienteTelefono || "").replace(/\D/g, "");
        if (numLimpio.startsWith("09") && numLimpio.length === 10) {
          numLimpio = "593" + numLimpio.substring(1);
        } else if (numLimpio.startsWith("0") && numLimpio.length === 10) {
          numLimpio = "593" + numLimpio.substring(1);
        }
        const waUrl = numLimpio
          ? `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`
          : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

        const a = document.createElement("a");
        a.href = waUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        enviadoWhatsApp = true;
      }

      setComprobanteEnviadoPOS(true);
      if (enviadoWhatsApp && enviadoCorreo) {
        showToast("Comprobante abierto en WhatsApp y enviado al correo", "success");
      } else if (enviadoWhatsApp) {
        showToast("Comprobante abierto en WhatsApp", "success");
      } else if (enviadoCorreo) {
        showToast(`Comprobante enviado por correo a ${ultimoTicket.clienteEmail}`, "success");
      }
    } catch (err: any) {
      showToast("Error al enviar comprobante: " + (err.message || ""), "error");
    } finally {
      setEnviandoComprobantePOS(false);
    }
  };

  // Filtrar catálogo en vivo
  const productosFiltrados = productos.filter((p) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return (
      p.modelName.toLowerCase().includes(q) ||
      p.color.toLowerCase().includes(q) ||
      p.baseCode.toLowerCase().includes(q) ||
      p.serieNombre.toLowerCase().includes(q)
    );
  });

  if (loadingInicial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 size={36} className="animate-spin text-emerald-500" />
        <p className="text-sm text-[var(--muted-foreground)] font-medium">Cargando módulo de Punto de Venta...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── ENCABEZADO PRINCIPAL & BARRA DE PESTAÑAS (TABS) ─── */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm p-4 sm:p-5 rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Store className="text-emerald-600 dark:text-emerald-400" size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xl sm:text-2xl text-[var(--card-foreground)] tracking-tight">
                  Punto de Venta
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    caja.abierta
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${caja.abierta ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {caja.abierta ? "Caja Abierta" : "Caja Cerrada"}
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Venta directa en mostrador, arqueo de turno y auditoría analítica de transacciones comerciales.
              </p>
            </div>
          </div>

          {/* Navegación por Pestañas */}
          <div className="flex bg-[var(--background)] p-1.5 rounded-2xl border border-[var(--border)] gap-1 self-start md:self-auto">
            <button
              onClick={() => setTabActiva("pos")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                tabActiva === "pos"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              }`}
            >
              <ShoppingCart size={15} />
              <span>Terminal de Venta</span>
            </button>
            <button
              onClick={() => setTabActiva("ventas")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                tabActiva === "ventas"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              }`}
            >
              <History size={15} />
              <span>Ventas Realizadas</span>
              {historialVentas.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-md text-[10px] font-mono">
                  {historialVentas.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PESTAÑA 1: TERMINAL DE VENTA POS & CAJA MOSTRADOR
      ══════════════════════════════════════════════════════════════════════ */}
      {tabActiva === "pos" && (
        <>
          {/* Si la caja NO está abierta, mostrar formulario para apertura */}
          {!caja.abierta ? (
            <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm p-8 rounded-3xl max-w-lg mx-auto text-center">
              <form onSubmit={handleAbrirCaja} className="space-y-5">
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
                  <Lock size={32} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--card-foreground)]">Apertura de Caja & Turno</h2>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Ingrese el monto de efectivo base con el que iniciará la atención y cobro en mostrador.
                  </p>
                </div>

                <div className="text-left">
                  <label className="block text-xs text-[var(--muted-foreground)] mb-1 font-semibold">
                    Monto Inicial en Efectivo (USD) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={montoApertura}
                    onChange={(e) => setMontoApertura(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-3 text-2xl text-center font-mono font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>

                <button
                  type="submit"
                  disabled={abriendoCaja}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  {abriendoCaja ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Abriendo caja...</span>
                    </>
                  ) : (
                    <>
                      <Unlock size={18} />
                      <span>Abrir Caja y Comenzar Turno</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Vista de Caja Abierta y Terminal de Cobro */
            <div className="space-y-6">
              {/* Header con resumen de la caja actual */}
              <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm p-4 rounded-2xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <Clock className="text-emerald-600 dark:text-emerald-400" size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--card-foreground)]">Turno Mostrador Activo</h3>
                      <p className="text-xs text-[var(--muted-foreground)] font-medium">
                        Apertura: {caja.fechaApertura ? new Date(caja.fechaApertura).toLocaleTimeString("es-EC") : "Turno en curso"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 flex-wrap w-full lg:w-auto">
                    <div className="px-3.5 py-1.5 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] text-center flex-1 lg:flex-initial">
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase block font-bold">Efectivo</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ${(caja.totalEfectivo || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="px-3.5 py-1.5 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] text-center flex-1 lg:flex-initial">
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase block font-bold">Tarjeta</span>
                      <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                        ${(caja.totalTarjeta || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="px-3.5 py-1.5 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] text-center flex-1 lg:flex-initial">
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase block font-bold">Transfer.</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                        ${(caja.totalTransferencia || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="px-3.5 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center flex-1 lg:flex-initial">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase block font-bold">Total Turno</span>
                      <span className="text-xs font-black text-[var(--card-foreground)] font-mono">
                        ${(caja.totalVentas || 0).toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setModalCierreOpen(true);
                        setResultadoCierre(null);
                      }}
                      className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Calculator size={14} /> Arqueo & Cierre
                    </button>
                  </div>
                </div>
              </div>

              {/* Alerta de venta exitosa */}
              {ventaExitosa && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm animate-pulse">
                  <CheckCircle size={20} /> ¡Venta registrada exitosamente con actualización de inventario!
                </div>
              )}

              {/* Layout POS: Catálogo Izquierda + Ticket Derecha */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel Izquierdo: Catálogo de Productos con Imagen */}
                <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-3xl p-5 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 text-[var(--muted-foreground)]" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar calzado por modelo, color o código..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[58vh] overflow-y-auto pr-1">
                    {productosFiltrados.slice(0, 40).map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-3.5 hover:border-emerald-500/60 hover:shadow-sm transition-all flex flex-col justify-between gap-3"
                      >
                        {/* Cabecera del Calzado con Miniatura */}
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 rounded-xl bg-slate-900/10 dark:bg-slate-800 border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center relative">
                            {prod.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={prod.imageUrl}
                                alt={`${prod.modelName} ${prod.color}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                                <ShoppingBag size={18} />
                                <span className="text-[8px] font-mono mt-0.5 uppercase tracking-tighter truncate max-w-full">
                                  {prod.color.slice(0, 6)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-sm text-[var(--card-foreground)] truncate" title={prod.modelName}>
                                {prod.modelName}
                              </h4>
                              <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm ml-1 shrink-0 font-mono">
                                ${prod.salePrice.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5 truncate">
                              <span className="font-medium">{prod.color}</span>
                              <span>·</span>
                              <span className="truncate text-emerald-600 dark:text-emerald-400 font-semibold">{prod.serieNombre}</span>
                            </p>
                            <span className="inline-block mt-1 font-mono text-[10px] bg-[var(--background)] px-2 py-0.5 rounded-md text-[var(--muted-foreground)] border border-[var(--border)]">
                              {prod.baseCode}
                            </span>
                          </div>
                        </div>

                        {/* Tallas con Botones de Selección */}
                        <div className="pt-2 border-t border-[var(--border)]/70">
                          <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-wider block mb-1.5">
                            Existencias por Talla:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[...prod.tallas]
                              .sort((a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0))
                              .map((t) => (
                                <button
                                  key={t.tallaId}
                                  disabled={t.cantidad <= 0}
                                  onClick={() => handleAgregarItem(prod, t)}
                                  className={`px-2 py-1 text-xs rounded-lg font-bold transition-all ${
                                    t.cantidad > 0
                                      ? "bg-[var(--card)] text-[var(--foreground)] hover:bg-emerald-600 hover:text-white border border-[var(--border)] active:scale-95 cursor-pointer shadow-xs"
                                      : "bg-[var(--muted)]/40 text-[var(--muted-foreground)]/40 border border-transparent cursor-not-allowed text-[11px]"
                                  }`}
                                  title={t.cantidad > 0 ? `${t.cantidad} pares disponibles` : "Sin existencias"}
                                >
                                  T{t.numero} <span className="text-[9px] font-normal opacity-80">({t.cantidad})</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel Derecho: Ticket de Venta */}
                <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--card-foreground)] mb-3.5 flex items-center gap-2">
                      <ShoppingCart size={18} className="text-emerald-500" />
                      Ticket de Venta en Mostrador
                    </h3>

                    {itemsVenta.length === 0 ? (
                      <div className="text-center py-12 px-4 space-y-2">
                        <ShoppingBag className="mx-auto text-[var(--muted-foreground)] opacity-40" size={32} />
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Seleccione las tallas de calzado para agregar a la venta.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[32vh] overflow-y-auto pr-1">
                        {itemsVenta.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs gap-2.5"
                          >
                            <div className="w-10 h-10 rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                              {item.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.imageUrl} alt={item.nombre} className="w-full h-full object-cover" />
                              ) : (
                                <ShoppingBag size={14} className="text-[var(--muted-foreground)]" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="truncate font-bold text-[var(--foreground)]">{item.nombre}</div>
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                                Talla {item.tallaNumero}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  onClick={() => {
                                    const n = [...itemsVenta];
                                    if (n[idx].cantidad > 1) n[idx].cantidad--;
                                    setItemsVenta(n);
                                  }}
                                  className="p-0.5 bg-[var(--muted)] rounded text-[var(--foreground)] hover:bg-emerald-600 hover:text-white transition-colors"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="font-mono text-[var(--foreground)] font-bold">{item.cantidad}</span>
                                <button
                                  onClick={() => {
                                    const n = [...itemsVenta];
                                    n[idx].cantidad++;
                                    setItemsVenta(n);
                                  }}
                                  className="p-0.5 bg-[var(--muted)] rounded text-[var(--foreground)] hover:bg-emerald-600 hover:text-white transition-colors"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs font-mono block">
                                ${(item.precioUnitario * item.cantidad).toFixed(2)}
                              </span>
                              <button
                                onClick={() => handleRemoverItem(idx)}
                                className="mt-1 text-[var(--muted-foreground)] hover:text-rose-500 transition-colors ml-auto"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {itemsVenta.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-[var(--border)] mt-3">
                      {/* Cupón Promocional */}
                      <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300 flex items-center gap-1">
                            🎟️ Cupón Promocional:
                          </span>
                          {cuponAplicadoPOS && (
                            <button
                              type="button"
                              onClick={handleRemoverCuponPOS}
                              className="text-[10px] font-bold text-rose-500 hover:underline"
                            >
                              Quitar
                            </button>
                          )}
                        </div>

                        {!cuponAplicadoPOS ? (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Ej: CALZADO10"
                              value={codigoCuponPOS}
                              onChange={(e) => setCodigoCuponPOS(e.target.value.toUpperCase())}
                              className="flex-1 px-2.5 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-mono font-bold uppercase text-[var(--foreground)] focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="button"
                              onClick={handleAplicarCuponPOS}
                              disabled={validandoCuponPOS || !codigoCuponPOS.trim()}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                            >
                              {validandoCuponPOS ? <Loader2 size={11} className="animate-spin" /> : null}
                              <span>Aplicar</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                            <span className="font-mono font-black">{cuponAplicadoPOS.promocion?.codigo}</span>
                            <span>-${Number(cuponAplicadoPOS.descuentoCalculado || 0).toFixed(2)}</span>
                          </div>
                        )}

                        {cuponErrorPOS && (
                          <span className="text-[10px] text-rose-500 font-semibold block">{cuponErrorPOS}</span>
                        )}
                      </div>

                      {/* Desglose Subtotal, Descuento y Total */}
                      <div className="space-y-1.5 p-3 bg-[var(--background)] rounded-2xl border border-[var(--border)] text-xs">
                        <div className="flex justify-between text-[var(--muted-foreground)]">
                          <span>Subtotal ({itemsVenta.reduce((s, i) => s + i.cantidad, 0)} pares):</span>
                          <span className="font-semibold text-[var(--foreground)] font-mono">${subtotalVenta.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)]">
                          <span className="text-amber-500 font-semibold flex items-center gap-1">
                            🎁 Descuento ($):
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={descuentoVenta}
                            onChange={(e) => setDescuentoVenta(e.target.value)}
                            className="w-20 px-2 py-0.5 bg-[var(--card)] border border-[var(--border)] rounded-md text-right font-bold text-amber-500 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {valorDescuento > 0 && (
                          <div className="flex justify-between text-amber-500 text-[11px] font-bold">
                            <span>Rebaja aplicada:</span>
                            <span>-${valorDescuento.toFixed(2)}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-base font-black text-[var(--foreground)] pt-1.5 border-t border-[var(--border)]">
                          <span>TOTAL:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 text-lg font-mono">${totalVenta.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Comprobante & Datos de Cliente */}
                      <div className="space-y-2 p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl text-xs">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setTipoComprobante("FACTURA")}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                              tipoComprobante === "FACTURA"
                                ? "bg-emerald-600 text-white border-transparent shadow-xs"
                                : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]"
                            }`}
                          >
                            <FileText size={13} />
                            Factura con datos
                          </button>
                          <button
                            type="button"
                            onClick={() => setTipoComprobante("CONSUMIDOR_FINAL")}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                              tipoComprobante === "CONSUMIDOR_FINAL"
                                ? "bg-emerald-600 text-white border-transparent shadow-xs"
                                : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]"
                            }`}
                          >
                            <User size={13} />
                            Consumidor Final
                          </button>
                        </div>

                        {tipoComprobante === "FACTURA" && (
                          <div className="space-y-2.5 pt-2 border-t border-[var(--border)] text-xs">
                            {/* Aviso informativo de comprobante digital */}
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                                <Send size={12} />
                                Envío automático de comprobante
                              </p>
                              <p className="text-[10px] text-[var(--muted-foreground)]">
                                Se enviará el comprobante digital al WhatsApp y correo del cliente al cobrar.
                              </p>
                            </div>

                            {/* Estado de Registro del Cliente */}
                            {clienteFactura.nombre && (
                              <div
                                className={`p-2 rounded-xl text-[11px] font-semibold flex items-center justify-between border ${
                                  clienteRegistrado
                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                    : "bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Users size={13} />
                                  <span>
                                    {clienteRegistrado
                                      ? `Cliente frecuente: ${clienteFactura.nombre} ${clienteFactura.apellido}`.trim()
                                      : `Nuevo cliente (Se guardará con esta venta)`}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={limpiarClienteFactura}
                                  className="text-[10px] underline hover:opacity-80 cursor-pointer ml-2"
                                >
                                  Limpiar
                                </button>
                              </div>
                            )}

                            {/* Campo de C.I. / RUC con búsqueda en vivo */}
                            <div className="relative">
                              <div className="flex items-center justify-between pb-0.5">
                                <label className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase flex items-center gap-1">
                                  <span>C.I. / RUC:</span>
                                </label>
                                {buscandoCliente && (
                                  <span className="text-[10px] text-emerald-500 font-semibold animate-pulse flex items-center gap-1">
                                    <Loader2 size={10} className="animate-spin" /> Buscando...
                                  </span>
                                )}
                              </div>
                              <input
                                type="text"
                                maxLength={13}
                                placeholder="Ingresa cédula o RUC (ej. 1801234567)"
                                value={clienteFactura.cedula}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setClienteFactura((prev) => ({ ...prev, cedula: val }));
                                  if (val.trim().length >= 3) {
                                    buscarCliente(val);
                                  } else {
                                    setSugerenciasClientes([]);
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-xs font-mono focus:outline-none focus:border-emerald-500"
                              />

                              {/* Dropdown de Sugerencias de Clientes */}
                              {sugerenciasClientes.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-[var(--border)]">
                                  {sugerenciasClientes.map((c: any) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => seleccionarCliente(c)}
                                      className="w-full p-2 text-left hover:bg-emerald-500/10 transition-colors flex flex-col gap-0.5 cursor-pointer"
                                    >
                                      <div className="font-bold text-xs text-[var(--foreground)] flex items-center justify-between">
                                        <span>{c.nombre} {c.apellido || ""}</span>
                                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                          {c.cedula || c.ruc || ""}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-2">
                                        {c.telefono && <span>📱 {c.telefono}</span>}
                                        {c.email && <span>✉️ {c.email}</span>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Nombre y Apellido */}
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block pb-0.5">
                                  Nombres *:
                                </label>
                                <input
                                  type="text"
                                  placeholder="Nombres"
                                  value={clienteFactura.nombre}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setClienteFactura((prev) => ({ ...prev, nombre: val }));
                                    if (val.length >= 3 && !clienteRegistrado) {
                                      buscarCliente(val);
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-xs focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block pb-0.5">
                                  Apellidos:
                                </label>
                                <input
                                  type="text"
                                  placeholder="Apellidos"
                                  value={clienteFactura.apellido}
                                  onChange={(e) => setClienteFactura((prev) => ({ ...prev, apellido: e.target.value }))}
                                  className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-xs focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            {/* Teléfono / WhatsApp */}
                            <div>
                              <label className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block pb-0.5 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Phone size={10} className="text-emerald-500" />
                                  Teléfono / WhatsApp:
                                </span>
                                <span className="text-[9px] text-[var(--muted-foreground)]">Para envío del ticket</span>
                              </label>
                              <input
                                type="tel"
                                placeholder="0987654321"
                                maxLength={13}
                                value={clienteFactura.telefono}
                                onChange={(e) => setClienteFactura((prev) => ({ ...prev, telefono: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-xs font-mono focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            {/* Correo Electrónico */}
                            <div>
                              <label className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block pb-0.5 flex items-center gap-1">
                                <Mail size={10} className="text-blue-500" />
                                Correo Electrónico:
                              </label>
                              <input
                                type="email"
                                placeholder="cliente@email.com"
                                value={clienteFactura.email}
                                onChange={(e) => setClienteFactura((prev) => ({ ...prev, email: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-xs focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            {/* Dirección */}
                            <div>
                              <label className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block pb-0.5">
                                Dirección:
                              </label>
                              <input
                                type="text"
                                placeholder="Ciudad, Sector, Calle (opcional)"
                                value={clienteFactura.direccion}
                                onChange={(e) => setClienteFactura((prev) => ({ ...prev, direccion: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-xs focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Método de Pago */}
                      <div className="flex gap-2">
                        {[
                          { id: "EFECTIVO" as const, icon: <Banknote size={14} />, label: "Efectivo" },
                          { id: "TARJETA" as const, icon: <CreditCard size={14} />, label: "Tarjeta" },
                          { id: "TRANSFERENCIA" as const, icon: <ArrowRightLeft size={14} />, label: "Transf." },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setMetodoPago(m.id)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                              metodoPago === m.id
                                ? "bg-emerald-600 text-white border-transparent shadow-sm"
                                : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-emerald-500"
                            }`}
                          >
                            {m.icon} {m.label}
                          </button>
                        ))}
                      </div>

                      {/* Calculadora de Vuelto para Efectivo */}
                      {metodoPago === "EFECTIVO" && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Paga con ($):</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder={totalVenta.toFixed(2)}
                              value={pagaCon}
                              onChange={(e) => setPagaCon(e.target.value)}
                              className="w-24 px-2 py-1 bg-[var(--card)] border border-emerald-500/30 rounded-lg text-right font-black text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-600"
                            />
                          </div>

                          {pagaCon && parseFloat(pagaCon) >= totalVenta && (
                            <div className="flex justify-between items-center pt-1 border-t border-emerald-500/20 font-bold">
                              <span className="text-emerald-700 dark:text-emerald-300">Vuelto a entregar:</span>
                              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black font-mono">
                                ${(parseFloat(pagaCon) - totalVenta).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={handleRegistrarVenta}
                        disabled={procesandoVenta}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md shadow-emerald-950/30 flex items-center justify-center gap-2 cursor-pointer text-sm"
                      >
                        <DollarSign size={18} />
                        {procesandoVenta ? "Procesando Venta..." : "Cobrar Venta & Emitir Ticket"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PESTAÑA 2: VENTAS REALIZADAS & REPORTES ANALÍTICOS (HISTORIAL POS)
      ══════════════════════════════════════════════════════════════════════ */}
      {tabActiva === "ventas" && (
        <div className="space-y-6">
          {/* ── BARRA DE FILTROS AVANZADOS ── */}
          <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm p-5 rounded-3xl space-y-4">
            {/* Fila 1: Filtro de Período (Píldoras Rápidas) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-emerald-500" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--card-foreground)]">
                  Período de Análisis:
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 bg-[var(--background)] p-1 rounded-2xl border border-[var(--border)]">
                {[
                  { id: "dia" as const, label: "Hoy" },
                  { id: "semana" as const, label: "Esta Semana" },
                  { id: "mes" as const, label: "Este Mes" },
                  { id: "trimestre" as const, label: "Este Trimestre" },
                  { id: "anio" as const, label: "Este Año" },
                  { id: "custom" as const, label: "Personalizado" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriodoFiltro(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      periodoFiltro === p.id
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Rango Personalizado si está activo */}
            {periodoFiltro === "custom" && (
              <div className="p-3 bg-[var(--background)] rounded-2xl border border-[var(--border)] flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-[var(--muted-foreground)]">Desde:</span>
                <input
                  type="date"
                  value={fechaInicioFiltro}
                  onChange={(e) => setFechaInicioFiltro(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="font-bold text-[var(--muted-foreground)]">Hasta:</span>
                <input
                  type="date"
                  value={fechaFinFiltro}
                  onChange={(e) => setFechaFinFiltro(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}

            {/* Fila 2: Filtro de Empleado / Rol + Método de Pago + Buscador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtro de Empleado / Vendedor */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] uppercase mb-1.5 flex items-center gap-1">
                  <Users size={13} className="text-emerald-500" />
                  {isAdmin ? "Filtrar por Vendedor:" : "Vendedor Asignado:"}
                </label>
                {isAdmin ? (
                  <select
                    value={vendedorFiltro}
                    onChange={(e) => setVendedorFiltro(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="TODOS">Todos los Empleados (Vista General)</option>
                    {vendedoresLista.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre} ({v.rol === "ROL_ADMIN" ? "Admin" : "Vendedor"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                    <User size={14} />
                    <span>Mis Ventas Realizadas ({currentUser?.nombre || "Vendedor"})</span>
                  </div>
                )}
              </div>

              {/* Filtro de Método de Pago */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] uppercase mb-1.5 flex items-center gap-1">
                  <CreditCard size={13} className="text-cyan-500" />
                  Método de Pago:
                </label>
                <select
                  value={metodoPagoFiltro}
                  onChange={(e) => setMetodoPagoFiltro(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="TODOS">Todos los Métodos</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta de Débito / Crédito</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                </select>
              </div>

              {/* Filtro de Modelo de Calzado Activo */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] uppercase mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Package size={13} className="text-amber-500" />
                    Modelo de Calzado:
                  </span>
                  {modeloFiltro !== "TODOS" && (
                    <button
                      onClick={() => setModeloFiltro("TODOS")}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold"
                    >
                      Limpiar
                    </button>
                  )}
                </label>
                <select
                  value={modeloFiltro}
                  onChange={(e) => setModeloFiltro(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="TODOS">Todos los Modelos Activos ({modelosDisponibles.length})</option>
                  {modelosDisponibles.map((m) => (
                    <option key={m.modelName} value={m.modelName}>
                      {m.modelName} ({m.totalStock} pares en stock)
                    </option>
                  ))}
                </select>
              </div>

              {/* Buscador Textual */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] uppercase mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Search size={13} className="text-emerald-500" />
                    Búsqueda Rápida:
                  </span>
                  <button
                    onClick={cargarHistorialVentas}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-bold text-[10px]"
                  >
                    <RefreshCw size={10} className={loadingVentas ? "animate-spin" : ""} /> Actualizar
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por #, cliente, serie..."
                    value={busquedaVentas}
                    onChange={(e) => setBusquedaVentas(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") cargarHistorialVentas();
                    }}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-emerald-500 pr-9"
                  />
                  <button
                    type="button"
                    onClick={cargarHistorialVentas}
                    className="absolute right-2 top-2 p-0.5 text-[var(--muted-foreground)] hover:text-emerald-500"
                  >
                    <Search size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Chip / Alerta de Modelo Filtrado Activo */}
            {modeloFiltro !== "TODOS" && (
              <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-800 dark:text-amber-300 font-medium animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-amber-500 shrink-0" />
                  <span>
                    Filtrando ventas que contienen el modelo: <strong className="font-bold uppercase tracking-wide">{modeloFiltro}</strong>
                  </span>
                </div>
                <button
                  onClick={() => setModeloFiltro("TODOS")}
                  className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <X size={12} /> Quitar filtro de modelo
                </button>
              </div>
            )}
          </div>

          {/* ── TARJETAS DE MÉTRICAS CLAVE (KPIS ANALÍTICOS) ── */}
          {metricasVentas && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Total Recaudado */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Total Recaudado
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <DollarSign size={18} />
                  </div>
                </div>
                <div className="font-extrabold text-2xl sm:text-3xl text-[var(--card-foreground)] font-mono">
                  ${metricasVentas.totalRecaudado.toFixed(2)}
                </div>
                {/* Desglose en mini píldoras */}
                <div className="flex items-center gap-1.5 text-[10px] font-semibold pt-1 border-t border-[var(--border)] flex-wrap">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    💵 ${(metricasVentas.desgloseMetodosPago.efectivo.total || 0).toFixed(2)}
                  </span>
                  <span className="text-[var(--muted-foreground)]">·</span>
                  <span className="text-cyan-600 dark:text-cyan-400">
                    💳 ${(metricasVentas.desgloseMetodosPago.tarjeta.total || 0).toFixed(2)}
                  </span>
                  <span className="text-[var(--muted-foreground)]">·</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    📲 ${(metricasVentas.desgloseMetodosPago.transferencia.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* KPI 2: Cantidad de Ventas */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Transacciones
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Receipt size={18} />
                  </div>
                </div>
                <div className="font-extrabold text-2xl sm:text-3xl text-[var(--card-foreground)] font-mono">
                  {metricasVentas.cantidadVentas}
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]">
                  Ventas procesadas mediante mostrador
                </p>
              </div>

              {/* KPI 3: Pares Vendidos */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Pares Vendidos
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <ShoppingBag size={18} />
                  </div>
                </div>
                <div className="font-extrabold text-2xl sm:text-3xl text-[var(--card-foreground)] font-mono">
                  {metricasVentas.cantidadPares}{" "}
                  <span className="text-sm font-semibold text-[var(--muted-foreground)]">pares</span>
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]">
                  ≈ {(metricasVentas.cantidadPares / 12).toFixed(1)} docenas entregadas
                </p>
              </div>

              {/* KPI 4: Ticket Promedio */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Ticket Promedio
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div className="font-extrabold text-2xl sm:text-3xl text-[var(--card-foreground)] font-mono">
                  ${metricasVentas.ticketPromedio.toFixed(2)}
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]">
                  Monto promedio por comprobante
                </p>
              </div>
            </div>
          )}

          {/* ── PANEL DE DESGLOSE POR VENDEDOR (ADMINISTRADOR) ── */}
          {isAdmin && metricasVentas && metricasVentas.desgloseVendedores.length > 1 && (
            <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                <h3 className="font-bold text-sm text-[var(--card-foreground)] uppercase tracking-wider">
                  Rendimiento y Ventas por Empleado / Vendedor
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {metricasVentas.desgloseVendedores.map((v) => {
                  const pct =
                    metricasVentas.totalRecaudado > 0
                      ? (v.total / metricasVentas.totalRecaudado) * 100
                      : 0;
                  return (
                    <div
                      key={v.userId}
                      onClick={() => setVendedorFiltro(v.userId)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        vendedorFiltro === v.userId
                          ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                          : "bg-[var(--background)] border-[var(--border)] hover:border-emerald-500/40"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-xs text-[var(--card-foreground)] truncate" title={v.nombre}>
                          {v.nombre}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="font-black text-lg text-[var(--foreground)] font-mono">
                        ${v.total.toFixed(2)}
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1 pt-1 border-t border-[var(--border)]">
                        <span>{v.ventas} ventas</span>
                        <span>{v.pares} pares</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TABLA DE VENTAS REALIZADAS ── */}
          <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-3xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Receipt className="text-emerald-500" size={20} />
                <h3 className="font-bold text-sm text-[var(--card-foreground)] uppercase tracking-wider">
                  Listado de Ventas Realizadas ({historialVentas.length})
                </h3>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                Mostrando transacciones de {periodoFiltro.toUpperCase()}
              </span>
            </div>

            {loadingVentas ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={32} className="animate-spin text-emerald-500" />
                <span className="text-xs text-[var(--muted-foreground)] font-medium">
                  Consultando ventas registradas...
                </span>
              </div>
            ) : historialVentas.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2">
                <ShoppingBag className="mx-auto text-[var(--muted-foreground)] opacity-40" size={40} />
                <h4 className="font-bold text-sm text-[var(--card-foreground)]">
                  No se encontraron ventas para los filtros seleccionados
                </h4>
                <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto">
                  Pruebe cambiando el período de tiempo, el vendedor seleccionado o el método de pago.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--muted)]/40 border-b border-[var(--border)] text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider">
                      <th className="p-3.5 pl-5">Comprobante</th>
                      <th className="p-3.5">Fecha & Hora</th>
                      <th className="p-3.5">Vendedor</th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Modelos / Pares</th>
                      <th className="p-3.5">Método de Pago</th>
                      <th className="p-3.5 text-right font-mono">Total</th>
                      <th className="p-3.5 pr-5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-xs">
                    {historialVentas.map((venta) => (
                      <tr
                        key={venta.id}
                        className="hover:bg-[var(--muted)]/30 transition-colors"
                      >
                        {/* Comprobante */}
                        <td className="p-3.5 pl-5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {venta.numeroNota}
                        </td>

                        {/* Fecha & Hora */}
                        <td className="p-3.5 text-[var(--foreground)] whitespace-nowrap">
                          <div className="font-semibold">
                            {new Date(venta.fecha).toLocaleDateString("es-EC", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                            {new Date(venta.fecha).toLocaleTimeString("es-EC", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>

                        {/* Vendedor */}
                        <td className="p-3.5 text-[var(--foreground)] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                              {venta.vendedor.nombre.charAt(0)}
                            </div>
                            <span className="font-semibold">{venta.vendedor.nombre}</span>
                          </div>
                        </td>

                        {/* Cliente */}
                        <td className="p-3.5 text-[var(--foreground)]">
                          <div className="font-semibold truncate max-w-[160px]" title={venta.cliente.nombre}>
                            {venta.cliente.nombre}
                          </div>
                          {venta.cliente.cedula && venta.cliente.cedula !== "9999999999" && (
                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                              C.I. {venta.cliente.cedula}
                            </span>
                          )}
                        </td>

                        {/* Modelos / Calzados */}
                        <td className="p-3.5 text-[var(--foreground)] max-w-[220px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md font-black text-[10px]">
                              {venta.totalPares} {venta.totalPares === 1 ? "par" : "pares"}
                            </span>
                            <span className="text-[11px] text-[var(--muted-foreground)] truncate block max-w-[150px]" title={venta.lineas.map((l) => `${l.nombre} (T${l.talla})`).join(", ")}>
                              {venta.lineas[0]?.nombre} {venta.lineas.length > 1 ? `+${venta.lineas.length - 1}` : ""}
                            </span>
                          </div>
                        </td>

                        {/* Método de Pago */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 ${
                              venta.metodoPago === "EFECTIVO"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : venta.metodoPago === "TARJETA"
                                ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {venta.metodoPago === "EFECTIVO" && <Banknote size={11} />}
                            {venta.metodoPago === "TARJETA" && <CreditCard size={11} />}
                            {venta.metodoPago === "TRANSFERENCIA" && <ArrowRightLeft size={11} />}
                            {venta.metodoPago}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="p-3.5 text-right font-mono font-black text-sm text-[var(--card-foreground)] whitespace-nowrap">
                          ${venta.total.toFixed(2)}
                        </td>

                        {/* Acciones */}
                        <td className="p-3.5 pr-5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setVentaSeleccionada(venta);
                                setVentaDetalleModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-[var(--background)] hover:bg-emerald-500/20 text-[var(--muted-foreground)] hover:text-emerald-500 border border-[var(--border)] transition-colors"
                              title="Ver detalle completo de la venta"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleReimprimirTicket(venta)}
                              className="p-1.5 rounded-lg bg-[var(--background)] hover:bg-cyan-500/20 text-[var(--muted-foreground)] hover:text-cyan-500 border border-[var(--border)] transition-colors"
                              title="Re-imprimir Ticket Térmico"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: DETALLE COMPLETO DE LA VENTA SELECCIONADA
      ══════════════════════════════════════════════════════════════════════ */}
      {ventaDetalleModalOpen && ventaSeleccionada && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setVentaDetalleModalOpen(false);
              setVentaSeleccionada(null);
            }
          }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl max-w-2xl w-full p-6 space-y-5 relative my-8 shadow-2xl">
            <button
              onClick={() => {
                setVentaDetalleModalOpen(false);
                setVentaSeleccionada(null);
              }}
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded-lg"
            >
              <X size={20} />
            </button>

            {/* Cabecera del Comprobante */}
            <div className="flex items-start gap-3.5 border-b border-[var(--border)] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <Receipt size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg text-[var(--card-foreground)]">
                    Detalle de Venta {ventaSeleccionada.numeroNota}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    ENTREGADO & COBRADO
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Registrado el{" "}
                  {new Date(ventaSeleccionada.fecha).toLocaleString("es-EC", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>

            {/* Datos de Vendedor y Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[var(--background)] rounded-2xl border border-[var(--border)] space-y-1">
                <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">
                  Cajero / Vendedor:
                </span>
                <div className="font-bold text-[var(--foreground)]">{ventaSeleccionada.vendedor.nombre}</div>
                <div className="text-[11px] text-[var(--muted-foreground)]">{ventaSeleccionada.vendedor.email}</div>
              </div>

              <div className="p-3.5 bg-[var(--background)] rounded-2xl border border-[var(--border)] space-y-1">
                <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase block">
                  Cliente:
                </span>
                <div className="font-bold text-[var(--foreground)]">{ventaSeleccionada.cliente.nombre}</div>
                {ventaSeleccionada.cliente.cedula && (
                  <div className="text-[11px] font-mono text-[var(--muted-foreground)]">
                    C.I. / RUC: {ventaSeleccionada.cliente.cedula}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Modelos de Calzado Vendidos (Regla 7: Patrón ModelTallaCurvaCard) */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-[var(--muted-foreground)] uppercase tracking-wider">
                Artículos y Calzados Vendidos ({ventaSeleccionada.totalPares} pares):
              </h4>

              <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                {ventaSeleccionada.lineas.map((linea, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[var(--background)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Miniatura y Modelo */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[var(--card)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                        {linea.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={linea.imageUrl} alt={linea.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag size={18} className="text-[var(--muted-foreground)]" />
                        )}
                      </div>
                      <div>
                        <div className="font-black uppercase text-xs text-[var(--card-foreground)]">
                          {linea.modelName || linea.nombre}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 mt-0.5">
                          <span>{linea.color || "Color Estándar"}</span>
                          <span>·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Serie: {linea.serie || "General"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Curva de Talla y Resumen de Precio */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      {/* Píldora de Talla */}
                      <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                        <span className="text-[10px] text-[var(--muted-foreground)] block font-bold uppercase">Talla</span>
                        <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                          T{linea.talla} ({linea.cantidad} {linea.cantidad === 1 ? "par" : "pares"})
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-[var(--muted-foreground)] block">
                          ${linea.precioUnitario.toFixed(2)} / par
                        </span>
                        <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                          ${linea.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen Financiero & Método de Pago */}
            <div className="p-4 bg-[var(--background)] rounded-2xl border border-[var(--border)] space-y-2 text-xs">
              <div className="flex justify-between text-[var(--muted-foreground)]">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-[var(--foreground)]">${ventaSeleccionada.subtotal.toFixed(2)}</span>
              </div>
              {ventaSeleccionada.descuento > 0 && (
                <div className="flex justify-between text-amber-500 font-bold">
                  <span>Descuento Aplicado:</span>
                  <span className="font-mono">-${ventaSeleccionada.descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--muted-foreground)]">
                <span>Método de Pago:</span>
                <span className="font-bold text-[var(--foreground)]">{ventaSeleccionada.metodoPago}</span>
              </div>
              {ventaSeleccionada.detallePago && (
                <div className="text-[11px] text-[var(--muted-foreground)] bg-[var(--card)] p-2 rounded-xl border border-[var(--border)]">
                  {ventaSeleccionada.detallePago}
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border)] text-sm font-black text-[var(--foreground)]">
                <span>TOTAL LIQUIDADO:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-lg">
                  ${ventaSeleccionada.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setVentaDetalleModalOpen(false);
                  setVentaSeleccionada(null);
                }}
                className="flex-1 py-2.5 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] font-bold rounded-2xl transition-all text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={() => handleReimprimirTicket(ventaSeleccionada)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs"
              >
                <Printer size={15} />
                <span>Re-imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE CIERRE DE CAJA / ARQUEO DE TURNO ── */}
      {modalCierreOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModalCierreOpen(false);
              setResultadoCierre(null);
            }
          }}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl max-w-md w-full p-6 space-y-5 relative shadow-2xl">
            <button
              onClick={() => setModalCierreOpen(false)}
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                <Calculator className="text-rose-500" size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[var(--card-foreground)]">Arqueo y Cierre de Turno</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Verifique el efectivo físico en gaveta</p>
              </div>
            </div>

            {resultadoCierre ? (
              <div className="space-y-4">
                <div className="p-4 bg-[var(--background)] rounded-2xl border border-[var(--border)] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Monto Inicial:</span>
                    <span className="text-[var(--foreground)] font-mono">${resultadoCierre.montoInicial.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Total Ventas Turno:</span>
                    <span className="text-[var(--foreground)] font-mono">${resultadoCierre.totalVentas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border)] pt-2">
                    <span className="text-[var(--foreground)] font-semibold">Efectivo Esperado:</span>
                    <span className="text-[var(--foreground)] font-mono font-bold">${resultadoCierre.montoEsperadoEfectivo.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground)] font-semibold">Efectivo Real:</span>
                    <span className="text-[var(--foreground)] font-mono font-bold">${resultadoCierre.montoRealEfectivo.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border)] pt-2">
                    <span className="text-[var(--foreground)] font-bold">Diferencia:</span>
                    <span
                      className={`font-mono font-black text-lg ${
                        resultadoCierre.diferencia >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                      }`}
                    >
                      {resultadoCierre.diferencia >= 0 ? "+" : ""}${resultadoCierre.diferencia.toFixed(2)}
                    </span>
                  </div>
                </div>

                {resultadoCierre.diferencia < 0 && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle size={16} /> Faltante detectado en el arqueo de caja.
                  </div>
                )}
                {resultadoCierre.diferencia > 0 && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <TrendingUp size={16} /> Sobrante detectado en el arqueo de caja.
                  </div>
                )}
                {resultadoCierre.diferencia === 0 && (
                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-xs text-cyan-300 flex items-center gap-2">
                    <CheckCircle size={16} /> ¡Cuadre perfecto! El efectivo coincide exactamente.
                  </div>
                )}

                <button
                  onClick={() => {
                    setModalCierreOpen(false);
                    setResultadoCierre(null);
                  }}
                  className="w-full bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] font-bold py-3 rounded-2xl transition-all text-xs"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCerrarCaja} className="space-y-4">
                <div className="p-4 bg-[var(--background)] rounded-2xl border border-[var(--border)] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Monto Inicial:</span>
                    <span className="font-mono text-[var(--foreground)]">${(caja.montoInicial || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Ventas Efectivo:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ${(caja.totalEfectivo || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border)] pt-2">
                    <span className="text-[var(--foreground)] font-bold">Efectivo Esperado:</span>
                    <span className="font-mono font-black text-[var(--foreground)] text-sm">
                      ${(caja.montoEsperadoEfectivo || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[var(--muted-foreground)] mb-1 font-semibold">
                    Monto Real en Efectivo (conteo físico en gaveta) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={montoRealEfectivo}
                    onChange={(e) => setMontoRealEfectivo(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-3 text-xl text-center font-mono font-black text-amber-500 focus:outline-none focus:border-amber-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[var(--muted-foreground)] mb-1 font-semibold">
                    Notas u Observaciones del Cierre
                  </label>
                  <input
                    type="text"
                    value={notasCierre}
                    onChange={(e) => setNotasCierre(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-emerald-500"
                    placeholder="Observaciones de turno..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={cerrandoCaja}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  {cerrandoCaja ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Cerrando caja y calculando arqueo...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Realizar Arqueo y Cerrar Caja</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL TICKET TÉRMICO (58mm / 80mm) ── */}
      {ticketModalOpen && ultimoTicket && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTicketModalOpen(false);
          }}
        >
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-100 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-slate-700" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Ticket Térmico POS</span>
              </div>
              <button
                onClick={() => setTicketModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                title="Cerrar modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cuerpo del Ticket - Adaptable automáticamente al contenido */}
            <div className="p-5 font-mono text-xs overflow-y-auto space-y-3 bg-white" id="ticket-pos-print">
              <div className="text-center space-y-0.5 border-b border-dashed pb-3">
                <h2 className="font-black text-sm uppercase">{ultimoTicket.negocio?.nombre || "LOCAL COMERCIAL"}</h2>
                {ultimoTicket.negocio?.ruc && (
                  <p className="text-[10px] text-slate-600">RUC: {ultimoTicket.negocio.ruc}</p>
                )}
                <p className="text-[10px] text-slate-600">{ultimoTicket.negocio?.direccion || "Cevallos, Tungurahua"}</p>
                {ultimoTicket.negocio?.telefono && (
                  <p className="text-[10px] text-slate-600">Tel: {ultimoTicket.negocio.telefono}</p>
                )}
                <p className="text-[10px] text-slate-500 pt-1">{ultimoTicket.fecha}</p>
              </div>

              {/* Información de Comprobante y Cliente */}
              <div className="space-y-0.5 border-b border-dashed pb-2 text-[10px] text-slate-700">
                <div className="flex justify-between font-bold">
                  <span>COMPROBANTE:</span>
                  <span className="text-slate-900">{ultimoTicket.tipoComprobante === "FACTURA" ? "COMPROBANTE CON DATOS" : "NOTA DE ENTREGA"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">CLIENTE:</span>
                  <span className="truncate max-w-[65%] text-slate-900 capitalize">{capitalizarNombreCompleto(ultimoTicket.clienteNombre) || "Consumidor Final"}</span>
                </div>
                {ultimoTicket.clienteIdentificacion && ultimoTicket.clienteIdentificacion !== "9999999999" && (
                  <div className="flex justify-between">
                    <span className="font-bold">C.I. / RUC:</span>
                    <span>{ultimoTicket.clienteIdentificacion}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 border-b border-dashed pb-3">
                <div className="flex justify-between font-bold text-[11px] pb-1">
                  <span>CANT / ARTÍCULO</span>
                  <span>TOTAL</span>
                </div>
                {ultimoTicket.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-start text-[11px]">
                    <div className="max-w-[70%]">
                      <span>{it.cantidad}x {it.nombre}</span>
                      <span className="text-[9px] text-slate-500 block">Talla: {it.tallaNumero} (${it.precioUnitario.toFixed(2)})</span>
                    </div>
                    <span className="font-bold">${(it.cantidad * it.precioUnitario).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 border-b border-dashed pb-3 text-xs">
                {ultimoTicket.descuento > 0 && (
                  <>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Subtotal:</span>
                      <span>${ultimoTicket.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 font-bold text-[11px]">
                      <span>Descuento aplicado:</span>
                      <span>-${ultimoTicket.descuento.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-black text-sm pt-0.5">
                  <span>TOTAL:</span>
                  <span>${ultimoTicket.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Forma de Pago:</span>
                  <span className="font-bold text-slate-900">{ultimoTicket.metodoPago}</span>
                </div>
                {ultimoTicket.metodoPago === "EFECTIVO" && (
                  <>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Paga con:</span>
                      <span>${ultimoTicket.pagaCon.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 text-[11px]">
                      <span>Vuelto:</span>
                      <span>${ultimoTicket.vuelto.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-1 space-y-0.5">
                <p>¡Gracias por su compra!</p>
                <p className="font-bold text-slate-700">{ultimoTicket.negocio?.nombre || "Local Comercial"}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t space-y-2.5">
              {/* Indicador de datos de contacto del cliente */}
              {(ultimoTicket.clienteTelefono || ultimoTicket.clienteEmail) && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Destinatarios del Comprobante:</span>
                  {ultimoTicket.clienteTelefono && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                      <MessageCircle size={12} className="text-emerald-600 shrink-0" />
                      <span className="font-mono font-semibold">{ultimoTicket.clienteTelefono}</span>
                      <span className="text-[10px] text-slate-500">(WhatsApp)</span>
                    </div>
                  )}
                  {ultimoTicket.clienteEmail && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                      <Mail size={12} className="text-blue-600 shrink-0" />
                      <span className="font-semibold">{ultimoTicket.clienteEmail}</span>
                      <span className="text-[10px] text-slate-500">(Correo)</span>
                    </div>
                  )}
                  {comprobanteEnviadoPOS && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                      <CheckCircle size={11} />
                      <span>Comprobante enviado exitosamente</span>
                    </div>
                  )}
                </div>
              )}

              {/* Botón Único de Envío de Comprobante y Botones de Acción */}
              <div className="space-y-2">
                {(ultimoTicket.clienteTelefono || ultimoTicket.clienteEmail) && (
                  <button
                    type="button"
                    onClick={handleEnviarComprobanteWhatsAppYCorreo}
                    disabled={enviandoComprobantePOS}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    title="Enviar comprobante con PDF al cliente"
                  >
                    {enviandoComprobantePOS ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <MessageCircle size={14} />
                    )}
                    <span>
                      {ultimoTicket.clienteTelefono && ultimoTicket.clienteEmail
                        ? "Enviar Comprobante (WhatsApp y Correo)"
                        : ultimoTicket.clienteTelefono
                        ? "Enviar Comprobante por WhatsApp"
                        : "Enviar Comprobante al Correo"}
                    </span>
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setTicketModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Imprimir Ticket</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
