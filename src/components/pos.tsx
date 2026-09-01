"use client";

import React, { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
import { useToast } from "./ui/toast";
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

export default function PosComponent() {
  const { showToast } = useToast();
  const [caja, setCaja] = useState<CajaEstado>({ abierta: false });
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [abriendoCaja, setAbriendoCaja] = useState(false);
  const [cerrandoCaja, setCerrandoCaja] = useState(false);
  const [montoApertura, setMontoApertura] = useState("0");
  const [modalAperturaOpen, setModalAperturaOpen] = useState(false);

  // Venta POS
  const [productos, setProductos] = useState<ProductoBusqueda[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>([]);
  const [descuentoVenta, setDescuentoVenta] = useState("");
  const [metodoPago, setMetodoPago] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA">("EFECTIVO");
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(false);

  // Tipo de Comprobante & Datos de Facturación
  const [tipoComprobante, setTipoComprobante] = useState<"CONSUMIDOR_FINAL" | "FACTURA">("CONSUMIDOR_FINAL");
  const [clienteFactura, setClienteFactura] = useState({
    cedula: "",
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    direccion: "",
  });
  const [buscandoCliente, setBuscandoCliente] = useState(false);

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
  const [anchoTicket, setAnchoTicket] = useState<"58mm" | "80mm">("80mm");

  // Cierre de caja
  const [modalCierreOpen, setModalCierreOpen] = useState(false);
  const [montoRealEfectivo, setMontoRealEfectivo] = useState("");
  const [notasCierre, setNotasCierre] = useState("");
  const [resultadoCierre, setResultadoCierre] = useState<any>(null);

  useEffect(() => {
    const inicializar = async () => {
      setLoadingInicial(true);
      await Promise.allSettled([
        cargarEstadoCaja(),
        cargarProductos(),
        cargarNegocioInfo(),
      ]);
      setLoadingInicial(false);
    };
    inicializar();
  }, []);

  const cargarNegocioInfo = async () => {
    try {
      const res = await ApiService.get("/configuracion/negocio");
      setNegocioInfo(res);
    } catch {}
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

  const buscarClientePorCedula = async (ident: string) => {
    const cleanIdent = ident.trim();
    if (!cleanIdent || cleanIdent.length < 5) return;
    try {
      setBuscandoCliente(true);
      const res = await ApiService.get(`/clientes?busqueda=${encodeURIComponent(cleanIdent)}`);
      const lista = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(lista) && lista.length > 0) {
        const c = lista[0];
        setClienteFactura((prev) => ({
          ...prev,
          cedula: c.cedula || c.ruc || cleanIdent,
          nombre: c.nombre || prev.nombre,
          apellido: c.apellido || prev.apellido,
          email: c.email || prev.email,
          telefono: c.telefono || prev.telefono,
          direccion: c.direccion || prev.direccion,
        }));
        showToast(`Cliente encontrado: ${c.nombre} ${c.apellido || ''}`, "success");
      }
    } catch {
      // Ignorar si es un cliente nuevo no registrado
    } finally {
      setBuscandoCliente(false);
    }
  };

  const subtotalVenta = itemsVenta.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0);
  const valorDescuento = Math.min(subtotalVenta, Math.max(0, parseFloat(descuentoVenta) || 0));
  const totalVenta = Math.max(0, subtotalVenta - valorDescuento);

  const handleRegistrarVenta = async () => {
    if (itemsVenta.length === 0) return;
    if (tipoComprobante === "FACTURA" && !clienteFactura.nombre.trim()) {
      showToast("Por favor ingresa la Razón Social / Nombre del cliente para la Factura", "error");
      return;
    }

    try {
      setProcesandoVenta(true);
      // Si hay descuento global, distribuirlo proporcionalmente en los precios unitarios
      const factorDescuento = subtotalVenta > 0 ? (totalVenta / subtotalVenta) : 1;

      const detallePagoPayload = metodoPago === "TRANSFERENCIA"
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
        detallePago: detallePagoPayload,
        clienteData: tipoComprobante === "FACTURA" ? {
          cedula: clienteFactura.cedula.trim(),
          ruc: clienteFactura.cedula.trim(),
          nombre: clienteFactura.nombre.trim(),
          apellido: clienteFactura.apellido.trim(),
          email: clienteFactura.email.trim(),
          telefono: clienteFactura.telefono.trim(),
          direccion: clienteFactura.direccion.trim(),
        } : undefined,
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

      // Generar ticket térmico
      const nombreComercial = negocioInfo?.nombre || "CALZADO COMERCIAL";
      const ticketData = {
        fecha: new Date().toLocaleString("es-EC"),
        tipoComprobante,
        clienteNombre: tipoComprobante === "FACTURA"
          ? `${clienteFactura.nombre} ${clienteFactura.apellido}`.trim()
          : "Consumidor Final",
        clienteIdentificacion: tipoComprobante === "FACTURA"
          ? (clienteFactura.cedula.trim() || "9999999999")
          : "9999999999",
        clienteEmail: tipoComprobante === "FACTURA" ? clienteFactura.email.trim() : "",
        clienteDireccion: tipoComprobante === "FACTURA" ? clienteFactura.direccion.trim() : "",
        items: [...itemsVenta],
        subtotal: subtotalVenta,
        descuento: valorDescuento,
        total: totalVenta,
        metodoPago,
        detallePago: detallePagoPayload,
        pagaCon: metodoPago === "EFECTIVO" ? (parseFloat(pagaCon) || totalVenta) : totalVenta,
        vuelto: metodoPago === "EFECTIVO" ? Math.max(0, (parseFloat(pagaCon) || totalVenta) - totalVenta) : 0,
        negocio: {
          nombre: nombreComercial,
          ruc: negocioInfo?.ruc || "1800000000001",
          direccion: negocioInfo?.direccion || "Cevallos, Tungurahua",
          telefono: negocioInfo?.telefono || "",
        },
      };
      setUltimoTicket(ticketData);
      setTicketModalOpen(true);

      setItemsVenta([]);
      setDescuentoVenta("");
      setPagaCon("");
      if (tipoComprobante === "FACTURA") {
        setClienteFactura({
          cedula: "",
          nombre: "",
          apellido: "",
          email: "",
          telefono: "",
          direccion: "",
        });
      }
      await cargarEstadoCaja();
      await cargarProductos();
      setTimeout(() => setVentaExitosa(false), 3000);
    } catch (err: any) {
      showToast("Error en la venta: " + err.message, "error");
    } finally {
      setProcesandoVenta(false);
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCerrandoCaja(true);
      const resultado = await ApiService.post("/pos/caja/cerrar", {
        montoRealEfectivo: parseFloat(montoRealEfectivo) || 0,
        notas: notasCierre,
      });
      showToast("Caja cerrada exitosamente", "info");
      setResultadoCierre(resultado);
      await cargarEstadoCaja();
    } catch (err: any) {
      showToast("Error al cerrar caja: " + err.message, "error");
    } finally {
      setCerrandoCaja(false);
    }
  };

  const productosFiltrados = productos.filter(
    (p) =>
      p.modelName.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.baseCode?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ─── Vista: Cargando Estado Inicial ──────────────────
  if (loadingInicial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-[var(--muted-foreground)] font-medium">
          Verificando estado de caja y catálogo de tienda...
        </p>
      </div>
    );
  }

  // ─── Vista: Caja Cerrada ──────────────────
  if (!caja.abierta) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <form onSubmit={handleAbrirCaja} className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-3xl p-10 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={40} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--card-foreground)]">Apertura de Caja & Venta Rápida</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Ingrese el monto de efectivo inicial para comenzar el turno de atención y ventas en tienda.
          </p>
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1 text-left font-medium">Monto Inicial (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={montoApertura}
              onChange={(e) => setMontoApertura(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-lg text-center font-mono text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={abriendoCaja}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
    );
  }

  // ─── Vista: Caja Activa & Venta Rápida ──────────────────
  return (
    <div className="space-y-6">
      {/* Header con resumen de caja */}
      <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm p-5 rounded-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Store className="text-emerald-600 dark:text-emerald-400" size={22} />
            </div>
            <div>
              <h2 className="font-bold text-base text-[var(--card-foreground)]">Caja & Venta Rápida</h2>
              <p className="text-xs text-[var(--muted-foreground)] font-medium">
                Caja abierta desde {caja.fechaApertura ? new Date(caja.fechaApertura).toLocaleTimeString("es-EC") : 'Turno actual'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="px-4 py-2 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] text-center">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase block font-semibold">Efectivo</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${(caja.totalEfectivo || 0).toFixed(2)}</span>
            </div>
            <div className="px-4 py-2 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] text-center">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase block font-semibold">Tarjeta</span>
              <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">${(caja.totalTarjeta || 0).toFixed(2)}</span>
            </div>
            <div className="px-4 py-2 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] text-center">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase block font-semibold">Transfer.</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">${(caja.totalTransferencia || 0).toFixed(2)}</span>
            </div>
            <div className="px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase block font-semibold">Total Turno</span>
              <span className="text-sm font-bold text-[var(--card-foreground)]">${(caja.totalVentas || 0).toFixed(2)}</span>
            </div>
            <button
              onClick={() => { setModalCierreOpen(true); setResultadoCierre(null); }}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/20 flex items-center gap-1.5 transition-all"
            >
              <Calculator size={14} /> Arqueo & Cierre
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de venta exitosa */}
      {ventaExitosa && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-3 text-emerald-300 text-sm animate-pulse">
          <CheckCircle size={20} /> ¡Venta registrada exitosamente!
        </div>
      )}

      {/* Layout POS: Productos + Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Catálogo de Productos con Imagen */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-4 space-y-4">
          <input
            type="text"
            placeholder="🔍 Buscar calzado por modelo, color o código de barras..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-500"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[58vh] overflow-y-auto pr-1">
            {productosFiltrados.slice(0, 30).map((prod) => (
              <div
                key={prod.id}
                className="bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-3 hover:border-emerald-500/60 hover:shadow-sm transition-all flex flex-col justify-between gap-2.5"
              >
                {/* Cabecera del Calzado con Imagen de la Variante */}
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
                        <span className="text-[8px] font-mono mt-0.5 uppercase tracking-tighter truncate max-w-full">{prod.color.slice(0, 6)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-[var(--card-foreground)] truncate" title={prod.modelName}>
                        {prod.modelName}
                      </h4>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm ml-1 shrink-0">
                        ${prod.salePrice.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5 truncate">
                      <span className="font-medium text-slate-300">{prod.color}</span>
                      <span>·</span>
                      <span className="truncate">{prod.serieNombre}</span>
                    </p>
                    <span className="inline-block mt-1 font-mono text-[10px] bg-[var(--muted)] px-1.5 py-0.2 rounded text-[var(--muted-foreground)]">
                      {prod.baseCode}
                    </span>
                  </div>
                </div>

                {/* Tallas con Botones de Selección */}
                <div className="pt-2 border-t border-[var(--border)]/70">
                  <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-wider block mb-1">
                    Tallas Disponibles:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {prod.tallas.map((t) => (
                      <button
                        key={t.tallaId}
                        disabled={t.cantidad <= 0}
                        onClick={() => handleAgregarItem(prod, t)}
                        className={`px-2 py-1 text-xs rounded-lg font-bold transition-all ${
                          t.cantidad > 0
                            ? "bg-[var(--card)] text-[var(--foreground)] hover:bg-emerald-600 hover:text-white border border-[var(--border)] active:scale-95 cursor-pointer shadow-2xs"
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
        <div className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
              <ShoppingCart size={18} className="text-emerald-400" />
              Ticket de Venta
            </h3>

            {itemsVenta.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                Seleccione productos para agregar al ticket.
              </p>
            ) : (
              <div className="space-y-2 max-h-[35vh] overflow-y-auto">
                {itemsVenta.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs gap-2.5"
                  >
                    {/* Miniatura de la variante */}
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag size={14} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold text-slate-200">{item.nombre}</div>
                      <span className="text-slate-400 text-[11px]">Talla {item.tallaNumero}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => {
                            const n = [...itemsVenta];
                            if (n[idx].cantidad > 1) n[idx].cantidad--;
                            setItemsVenta(n);
                          }}
                          className="p-0.5 bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-mono text-slate-200 font-bold">{item.cantidad}</span>
                        <button
                          onClick={() => {
                            const n = [...itemsVenta];
                            n[idx].cantidad++;
                            setItemsVenta(n);
                          }}
                          className="p-0.5 bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-emerald-400 text-xs">
                        ${(item.precioUnitario * item.cantidad).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemoverItem(idx)}
                        className="block mt-1 text-slate-500 hover:text-rose-400 ml-auto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer del Ticket */}
          {itemsVenta.length > 0 && (
            <div className="pt-4 border-t border-slate-700/50 space-y-3 mt-4">
              {/* Desglose Subtotal, Descuento y Total */}
              <div className="space-y-1.5 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal ({itemsVenta.reduce((s, i) => s + i.cantidad, 0)} pares):</span>
                  <span className="font-semibold text-slate-200">${subtotalVenta.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    🎁 Descuento ($):
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={descuentoVenta}
                      onChange={(e) => setDescuentoVenta(e.target.value)}
                      className="w-20 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-bold text-amber-400 text-xs focus:outline-none focus:border-amber-500"
                    />
                    {/* Botones rápidos de descuento % */}
                    <button
                      type="button"
                      onClick={() => setDescuentoVenta((subtotalVenta * 0.05).toFixed(2))}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 rounded text-[10px] font-bold cursor-pointer"
                    >
                      5%
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescuentoVenta((subtotalVenta * 0.10).toFixed(2))}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 rounded text-[10px] font-bold cursor-pointer"
                    >
                      10%
                    </button>
                  </div>
                </div>

                {valorDescuento > 0 && (
                  <div className="flex justify-between text-amber-400 text-[11px] font-bold">
                    <span>Rebaja aplicada:</span>
                    <span>-${valorDescuento.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-base font-black text-white pt-1 border-t border-slate-700">
                  <span>TOTAL A COBRAR:</span>
                  <span className="text-emerald-400 text-lg">${totalVenta.toFixed(2)}</span>
                </div>
              </div>

              {/* Tipo de Comprobante: Consumidor Final vs Factura con Datos */}
              <div className="space-y-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <label className="text-[11px] font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <FileText size={13} className="text-emerald-400" />
                  Comprobante:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTipoComprobante("CONSUMIDOR_FINAL")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      tipoComprobante === "CONSUMIDOR_FINAL"
                        ? "bg-emerald-600 text-white border-transparent shadow-xs"
                        : "bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <User size={13} />
                    Consumidor Final
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoComprobante("FACTURA")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      tipoComprobante === "FACTURA"
                        ? "bg-emerald-600 text-white border-transparent shadow-xs"
                        : "bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <FileText size={13} />
                    Factura con Datos
                  </button>
                </div>

                {/* Formulario de Factura si está seleccionado */}
                {tipoComprobante === "FACTURA" && (
                  <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <div className="flex items-center justify-between pb-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Cédula / RUC:</label>
                        {buscandoCliente && <span className="text-[10px] text-emerald-400 animate-pulse">Buscando...</span>}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={13}
                          placeholder="Ej: 1801234567"
                          value={clienteFactura.cedula}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClienteFactura((prev) => ({ ...prev, cedula: val }));
                            if (val.length === 10 || val.length === 13) {
                              buscarClientePorCedula(val);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => buscarClientePorCedula(clienteFactura.cedula)}
                          className="absolute right-1.5 top-1.5 p-1 text-slate-400 hover:text-emerald-400"
                          title="Buscar cliente en base de datos"
                        >
                          <Search size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">Nombre / Razón Social *:</label>
                        <input
                          type="text"
                          placeholder="Nombres o Razón Social"
                          value={clienteFactura.nombre}
                          onChange={(e) => setClienteFactura((prev) => ({ ...prev, nombre: e.target.value }))}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">Apellido:</label>
                        <input
                          type="text"
                          placeholder="Apellidos"
                          value={clienteFactura.apellido}
                          onChange={(e) => setClienteFactura((prev) => ({ ...prev, apellido: e.target.value }))}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">Email (para Factura SRI):</label>
                        <input
                          type="email"
                          placeholder="cliente@email.com"
                          value={clienteFactura.email}
                          onChange={(e) => setClienteFactura((prev) => ({ ...prev, email: e.target.value }))}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">Teléfono:</label>
                        <input
                          type="text"
                          placeholder="0999999999"
                          value={clienteFactura.telefono}
                          onChange={(e) => setClienteFactura((prev) => ({ ...prev, telefono: e.target.value }))}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">Dirección:</label>
                      <input
                        type="text"
                        placeholder="Dirección del cliente"
                        value={clienteFactura.direccion}
                        onChange={(e) => setClienteFactura((prev) => ({ ...prev, direccion: e.target.value }))}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
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
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
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
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-800 uppercase">Paga con ($):</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={totalVenta.toFixed(2)}
                      value={pagaCon}
                      onChange={(e) => setPagaCon(e.target.value)}
                      className="w-24 px-2 py-1 bg-[var(--card)] border border-emerald-500/30 rounded-lg text-right font-black text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Botones rápidos de billetes */}
                  <div className="flex gap-1 justify-end">
                    {[totalVenta, 10, 20, 50, 100]
                      .filter((val, i, arr) => val >= totalVenta && arr.indexOf(val) === i)
                      .slice(0, 4)
                      .map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPagaCon(String(val))}
                          className="px-2 py-0.5 bg-[var(--card)] hover:bg-emerald-600 hover:text-white border border-[var(--border)] rounded text-[10px] font-bold transition-colors"
                        >
                          ${val.toFixed(0)}
                        </button>
                      ))}
                  </div>

                  {pagaCon && parseFloat(pagaCon) >= totalVenta && (
                    <div className="flex justify-between items-center pt-1 border-t border-emerald-500/20 font-bold">
                      <span className="text-emerald-700">Vuelto a entregar:</span>
                      <span className="text-emerald-700 text-sm font-black">
                        ${(parseFloat(pagaCon) - totalVenta).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Detalle de Pago para Transferencia */}
              {metodoPago === "TRANSFERENCIA" && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2 text-xs">
                  <label className="text-[11px] font-bold text-blue-400 uppercase flex items-center gap-1">
                    <ArrowRightLeft size={13} />
                    Detalle de Transferencia:
                  </label>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">Banco / Cooperativa:</label>
                    <select
                      value={detalleTransferencia.banco}
                      onChange={(e) => setDetalleTransferencia((prev) => ({ ...prev, banco: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="Banco Pichincha">Banco Pichincha</option>
                      <option value="Banco Guayaquil">Banco Guayaquil</option>
                      <option value="Produbanco">Produbanco / Promerica</option>
                      <option value="Banco del Pacífico">Banco del Pacífico</option>
                      <option value="Banco Bolivariano">Banco Bolivariano</option>
                      <option value="Banco Internacional">Banco Internacional</option>
                      <option value="Coop. San Francisco">Coop. San Francisco</option>
                      <option value="Coop. Mushuc Runa">Coop. Mushuc Runa</option>
                      <option value="Coop. 29 de Octubre">Coop. 29 de Octubre</option>
                      <option value="Coop. Oscus">Coop. Oscus</option>
                      <option value="DeUna / Billetera Digital">DeUna / Billetera Digital</option>
                      <option value="Otro Banco/Coop">Otro Banco / Cooperativa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">N° Comprobante / Referencia:</label>
                    <input
                      type="text"
                      placeholder="Ej: 9832145 o # TRX"
                      value={detalleTransferencia.numeroComprobante}
                      onChange={(e) => setDetalleTransferencia((prev) => ({ ...prev, numeroComprobante: e.target.value }))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Detalle de Pago para Tarjeta */}
              {metodoPago === "TARJETA" && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl space-y-2 text-xs">
                  <label className="text-[11px] font-bold text-cyan-400 uppercase flex items-center gap-1">
                    <CreditCard size={13} />
                    Detalle de Cobro con Tarjeta:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">Tipo:</label>
                      <select
                        value={detalleTarjeta.tipoTarjeta}
                        onChange={(e) => setDetalleTarjeta((prev) => ({ ...prev, tipoTarjeta: e.target.value as any }))}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-semibold"
                      >
                        <option value="DÉBITO">DÉBITO</option>
                        <option value="CRÉDITO">CRÉDITO</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">Franquicia / Red:</label>
                      <select
                        value={detalleTarjeta.marcaTarjeta}
                        onChange={(e) => setDetalleTarjeta((prev) => ({ ...prev, marcaTarjeta: e.target.value }))}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-semibold"
                      >
                        <option value="VISA">VISA</option>
                        <option value="MASTERCARD">MASTERCARD</option>
                        <option value="DINERS">DINERS CLUB</option>
                        <option value="DISCOVER">DISCOVER</option>
                        <option value="AMEX">AMERICAN EXPRESS</option>
                        <option value="OTRA">OTRA</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">N° Voucher / Recibo:</label>
                      <input
                        type="text"
                        placeholder="Ej: 004812"
                        value={detalleTarjeta.numeroVoucher}
                        onChange={(e) => setDetalleTarjeta((prev) => ({ ...prev, numeroVoucher: e.target.value }))}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block pb-0.5">N° Autorización / Lote:</label>
                      <input
                        type="text"
                        placeholder="Ej: AUT-9234"
                        value={detalleTarjeta.numeroAutorizacion}
                        onChange={(e) => setDetalleTarjeta((prev) => ({ ...prev, numeroAutorizacion: e.target.value }))}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleRegistrarVenta}
                disabled={procesandoVenta}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
              >
                <DollarSign size={18} />
                {procesandoVenta ? "Procesando..." : "Cobrar Venta & Emitir Ticket"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cierre de Caja */}
      {modalCierreOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 relative">
            <button
              onClick={() => setModalCierreOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                <Calculator className="text-rose-400" size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Arqueo y Cierre de Turno</h3>
                <p className="text-xs text-slate-400">Verifique el efectivo antes de cerrar</p>
              </div>
            </div>

            {resultadoCierre ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monto Inicial:</span>
                    <span className="text-slate-200 font-mono">${resultadoCierre.montoInicial.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Ventas:</span>
                    <span className="text-slate-200 font-mono">${resultadoCierre.totalVentas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2">
                    <span className="text-slate-300 font-semibold">Efectivo Esperado:</span>
                    <span className="text-white font-mono font-bold">${resultadoCierre.montoEsperadoEfectivo.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-semibold">Efectivo Real:</span>
                    <span className="text-white font-mono font-bold">${resultadoCierre.montoRealEfectivo.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2">
                    <span className="text-slate-300 font-bold">Diferencia:</span>
                    <span
                      className={`font-mono font-black text-lg ${
                        resultadoCierre.diferencia >= 0 ? "text-emerald-400" : "text-rose-400"
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
                  onClick={() => { setModalCierreOpen(false); setResultadoCierre(null); }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl transition-all"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCerrarCaja} className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monto Inicial:</span>
                    <span className="font-mono text-slate-200">${(caja.montoInicial || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ventas Efectivo:</span>
                    <span className="font-mono text-emerald-400">${(caja.totalEfectivo || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2">
                    <span className="text-white font-semibold">Efectivo Esperado:</span>
                    <span className="font-mono font-bold text-white">
                      ${(caja.montoEsperadoEfectivo || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Monto Real en Efectivo (conteo físico) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={montoRealEfectivo}
                    onChange={(e) => setMontoRealEfectivo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg text-center font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Notas del Cierre (Opcional)</label>
                  <input
                    type="text"
                    value={notasCierre}
                    onChange={(e) => setNotasCierre(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500"
                    placeholder="Observaciones del turno..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={cerrandoCaja}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-100 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-slate-700" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Ticket de Venta en Tienda</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-200 rounded-lg p-0.5 text-[10px] font-bold">
                  <button
                    onClick={() => setAnchoTicket("58mm")}
                    className={`px-2 py-0.5 rounded ${anchoTicket === "58mm" ? "bg-white shadow-xs" : ""}`}
                  >
                    58mm
                  </button>
                  <button
                    onClick={() => setAnchoTicket("80mm")}
                    className={`px-2 py-0.5 rounded ${anchoTicket === "80mm" ? "bg-white shadow-xs" : ""}`}
                  >
                    80mm
                  </button>
                </div>
                <button
                  onClick={() => setTicketModalOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Cuerpo del Ticket Térmico */}
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
                  <span className="text-slate-900">{ultimoTicket.tipoComprobante === "FACTURA" ? "FACTURA CON DATOS" : "NOTA DE VENTA"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">CLIENTE:</span>
                  <span className="truncate max-w-[65%] text-slate-900">{ultimoTicket.clienteNombre || "Consumidor Final"}</span>
                </div>
                {ultimoTicket.clienteIdentificacion && ultimoTicket.clienteIdentificacion !== "9999999999" && (
                  <div className="flex justify-between">
                    <span className="font-bold">C.I. / RUC:</span>
                    <span>{ultimoTicket.clienteIdentificacion}</span>
                  </div>
                )}
                {ultimoTicket.clienteEmail && (
                  <div className="flex justify-between">
                    <span className="font-bold">EMAIL:</span>
                    <span className="truncate max-w-[65%]">{ultimoTicket.clienteEmail}</span>
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
                {ultimoTicket.metodoPago === "TRANSFERENCIA" && ultimoTicket.detallePago && (
                  <div className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 p-1.5 rounded space-y-0.5 mt-1">
                    {ultimoTicket.detallePago.banco && (
                      <div className="flex justify-between">
                        <span>Banco / Coop:</span>
                        <span className="font-semibold text-slate-900">{ultimoTicket.detallePago.banco}</span>
                      </div>
                    )}
                    {ultimoTicket.detallePago.numeroComprobante && (
                      <div className="flex justify-between">
                        <span>N° Comprobante / Ref:</span>
                        <span className="font-mono font-bold text-slate-900">#{ultimoTicket.detallePago.numeroComprobante}</span>
                      </div>
                    )}
                  </div>
                )}
                {ultimoTicket.metodoPago === "TARJETA" && ultimoTicket.detallePago && (
                  <div className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 p-1.5 rounded space-y-0.5 mt-1">
                    <div className="flex justify-between">
                      <span>Tipo / Franquicia:</span>
                      <span className="font-semibold text-slate-900">{ultimoTicket.detallePago.tipoTarjeta} {ultimoTicket.detallePago.marcaTarjeta}</span>
                    </div>
                    {ultimoTicket.detallePago.numeroVoucher && (
                      <div className="flex justify-between">
                        <span>N° Voucher:</span>
                        <span className="font-mono font-bold text-slate-900">#{ultimoTicket.detallePago.numeroVoucher}</span>
                      </div>
                    )}
                    {ultimoTicket.detallePago.numeroAutorizacion && (
                      <div className="flex justify-between">
                        <span>Autorización / Lote:</span>
                        <span className="font-mono text-slate-900">{ultimoTicket.detallePago.numeroAutorizacion}</span>
                      </div>
                    )}
                  </div>
                )}
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
                <p>¡Gracias por su compra y preferencia!</p>
                <p className="font-bold text-slate-700">{ultimoTicket.negocio?.nombre || "Local Comercial"}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t flex gap-2">
              <button
                onClick={() => setTicketModalOpen(false)}
                className="flex-1 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
