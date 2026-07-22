"use client";

import React, { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
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
} from "lucide-react";

interface CajaEstado {
  abierta: boolean;
  caja: {
    id: string;
    montoInicial: number;
    ventasEfectivo: number;
    ventasTarjeta: number;
    ventasTransferencia: number;
    totalVentas: number;
    montoEsperadoEfectivo: number;
    fechaApertura: string;
  } | null;
}

interface ProductoBusqueda {
  id: string;
  code: string;
  color: string;
  imageUrl?: string;
  salePrice: number;
  modelName: string;
  serieId: string;
  serieNombre: string;
  tallas: { tallaId: string; numero: number; cantidad: number }[];
}

interface ItemVenta {
  productId: string;
  serieId: string;
  tallaId: string;
  tallaNumero: number;
  nombre: string;
  color: string;
  cantidad: number;
  precioUnitario: number;
}

export default function PosComponent() {
  const [cajaEstado, setCajaEstado] = useState<CajaEstado>({ abierta: false, caja: null });
  const [montoApertura, setMontoApertura] = useState("0");
  const [loadingCaja, setLoadingCaja] = useState(false);

  // Productos & Venta
  const [productos, setProductos] = useState<ProductoBusqueda[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>([]);
  const [metodoPago, setMetodoPago] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA">("EFECTIVO");
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(false);

  // Cierre de Caja
  const [showCierre, setShowCierre] = useState(false);
  const [montoRealEfectivo, setMontoRealEfectivo] = useState("");
  const [notasCierre, setNotasCierre] = useState("");
  const [resultadoCierre, setResultadoCierre] = useState<any>(null);

  useEffect(() => {
    cargarEstadoCaja();
    cargarProductos();
  }, []);

  const cargarEstadoCaja = async () => {
    try {
      const data = await ApiService.get("/pos/caja/estado");
      setCajaEstado(data);
    } catch (err: any) {
      console.error("Error al cargar estado de caja:", err);
    }
  };

  const cargarProductos = async () => {
    try {
      const data = await ApiService.get("/catalogo/productos");
      const flat: ProductoBusqueda[] = [];
      (data || []).forEach((modelo: any) => {
        modelo.variantes.forEach((v: any) => {
          flat.push({
            id: v.id,
            code: v.code,
            color: v.color,
            imageUrl: v.imageUrl,
            salePrice: v.salePrice,
            modelName: modelo.name,
            serieId: v.serieId,
            serieNombre: v.serieNombre,
            tallas: v.tallas,
          });
        });
      });
      setProductos(flat);
    } catch (err: any) {
      console.error("Error al cargar productos:", err);
    }
  };

  const handleAbrirCaja = async () => {
    try {
      setLoadingCaja(true);
      await ApiService.post("/pos/caja/abrir", {
        montoInicial: parseFloat(montoApertura) || 0,
      });
      await cargarEstadoCaja();
    } catch (err: any) {
      alert("Error al abrir caja: " + err.message);
    } finally {
      setLoadingCaja(false);
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
          cantidad: 1,
          precioUnitario: prod.salePrice,
        },
      ]);
    }
  };

  const handleRemoverItem = (index: number) => {
    setItemsVenta(itemsVenta.filter((_, i) => i !== index));
  };

  const totalVenta = itemsVenta.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0);

  const handleRegistrarVenta = async () => {
    if (itemsVenta.length === 0) return;
    try {
      setProcesandoVenta(true);
      await ApiService.post("/pos/venta-directa", {
        metodoPago,
        lineas: itemsVenta.map((i) => ({
          productId: i.productId,
          serieId: i.serieId,
          tallaId: i.tallaId,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
      });
      setVentaExitosa(true);
      setItemsVenta([]);
      await cargarEstadoCaja();
      await cargarProductos();
      setTimeout(() => setVentaExitosa(false), 3000);
    } catch (err: any) {
      alert("Error en la venta: " + err.message);
    } finally {
      setProcesandoVenta(false);
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingCaja(true);
      const resultado = await ApiService.post("/pos/caja/cerrar", {
        montoRealEfectivo: parseFloat(montoRealEfectivo) || 0,
        notas: notasCierre,
      });
      setResultadoCierre(resultado);
      await cargarEstadoCaja();
    } catch (err: any) {
      alert("Error al cerrar caja: " + err.message);
    } finally {
      setLoadingCaja(false);
    }
  };

  const productosFiltrados = productos.filter(
    (p) =>
      p.modelName.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.code.toLowerCase().includes(searchProduct.toLowerCase())
  );

  // ─── Vista: Caja Cerrada ──────────────────
  if (!cajaEstado.abierta) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-10 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={40} className="text-amber-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Apertura de Caja POS</h2>
          <p className="text-sm text-slate-400">
            Ingrese el monto de efectivo inicial para comenzar el turno de ventas en mostrador.
          </p>
          <div>
            <label className="block text-xs text-slate-400 mb-1 text-left">Monto Inicial (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={montoApertura}
              onChange={(e) => setMontoApertura(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-lg text-center font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={handleAbrirCaja}
            disabled={loadingCaja}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
          >
            <Unlock size={18} />
            {loadingCaja ? "Abriendo..." : "Abrir Caja y Comenzar Turno"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Vista: POS Activo ──────────────────
  return (
    <div className="space-y-6">
      {/* Header con resumen de caja */}
      <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Store className="text-emerald-400" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Punto de Venta (POS)</h1>
              <p className="text-xs text-slate-400">
                Caja abierta desde {new Date(cajaEstado.caja!.fechaApertura).toLocaleTimeString("es-EC")}
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-700/40 text-center">
              <span className="text-[10px] text-slate-500 uppercase block">Efectivo</span>
              <span className="text-sm font-bold text-emerald-400">${cajaEstado.caja!.ventasEfectivo.toFixed(2)}</span>
            </div>
            <div className="px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-700/40 text-center">
              <span className="text-[10px] text-slate-500 uppercase block">Tarjeta</span>
              <span className="text-sm font-bold text-cyan-400">${cajaEstado.caja!.ventasTarjeta.toFixed(2)}</span>
            </div>
            <div className="px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-700/40 text-center">
              <span className="text-[10px] text-slate-500 uppercase block">Transfer.</span>
              <span className="text-sm font-bold text-violet-400">${cajaEstado.caja!.ventasTransferencia.toFixed(2)}</span>
            </div>
            <div className="px-4 py-2 bg-emerald-950/40 rounded-xl border border-emerald-800/40 text-center">
              <span className="text-[10px] text-emerald-500 uppercase block">Total Turno</span>
              <span className="text-sm font-bold text-white">${cajaEstado.caja!.totalVentas.toFixed(2)}</span>
            </div>
            <button
              onClick={() => { setShowCierre(true); setResultadoCierre(null); }}
              className="px-4 py-2 bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 text-xs font-semibold rounded-xl border border-rose-800/40 flex items-center gap-1.5 transition-all"
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
        {/* Panel Izquierdo: Búsqueda de Productos */}
        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-4">
          <input
            type="text"
            placeholder="🔍 Buscar calzado por nombre o código..."
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
            {productosFiltrados.slice(0, 20).map((prod) => (
              <div
                key={prod.id}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{prod.modelName}</h4>
                    <p className="text-xs text-slate-400">
                      {prod.color} | {prod.serieNombre} | <span className="font-mono">{prod.code}</span>
                    </p>
                  </div>
                  <span className="text-emerald-400 font-bold text-sm">${prod.salePrice.toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {prod.tallas.map((t) => (
                    <button
                      key={t.tallaId}
                      disabled={t.cantidad <= 0}
                      onClick={() => handleAgregarItem(prod, t)}
                      className={`px-2 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                        t.cantidad > 0
                          ? "bg-slate-800 text-slate-200 hover:bg-emerald-600 hover:text-white border border-slate-700"
                          : "bg-slate-950 text-slate-700 cursor-not-allowed border border-slate-900"
                      }`}
                      title={`${t.cantidad} disponibles`}
                    >
                      T{t.numero} ({t.cantidad})
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel Derecho: Ticket de Venta */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-between">
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
                    className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex-1">
                      <span className="font-semibold text-slate-200">{item.nombre}</span>
                      <span className="text-slate-500 ml-1">T{item.tallaNumero}</span>
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
                        <span className="font-mono text-slate-200">{item.cantidad}</span>
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
                    <div className="text-right">
                      <span className="font-bold text-emerald-400">
                        ${(item.precioUnitario * item.cantidad).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemoverItem(idx)}
                        className="block mt-1 text-slate-600 hover:text-rose-400"
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
              <div className="flex justify-between items-center text-lg font-black text-white">
                <span>TOTAL:</span>
                <span className="text-emerald-400">${totalVenta.toFixed(2)}</span>
              </div>

              {/* Método de Pago */}
              <div className="flex gap-2">
                {[
                  { id: "EFECTIVO" as const, icon: <Banknote size={14} />, color: "emerald" },
                  { id: "TARJETA" as const, icon: <CreditCard size={14} />, color: "cyan" },
                  { id: "TRANSFERENCIA" as const, icon: <ArrowRightLeft size={14} />, color: "violet" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMetodoPago(m.id)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
                      metodoPago === m.id
                        ? `bg-${m.color}-500/20 text-${m.color}-400 border-${m.color}-500/40`
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                  >
                    {m.icon} {m.id}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRegistrarVenta}
                disabled={procesandoVenta}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
              >
                <DollarSign size={18} />
                {procesandoVenta ? "Procesando..." : "Cobrar Venta"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cierre de Caja */}
      {showCierre && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 relative">
            <button
              onClick={() => setShowCierre(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calculator className="text-amber-400" size={22} />
              Arqueo y Cierre de Caja
            </h2>

            {resultadoCierre ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-sm">
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
                  onClick={() => { setShowCierre(false); setResultadoCierre(null); }}
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
                    <span className="font-mono text-slate-200">${cajaEstado.caja!.montoInicial.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ventas Efectivo:</span>
                    <span className="font-mono text-emerald-400">${cajaEstado.caja!.ventasEfectivo.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2">
                    <span className="text-white font-semibold">Efectivo Esperado:</span>
                    <span className="font-mono font-bold text-white">
                      ${cajaEstado.caja!.montoEsperadoEfectivo.toFixed(2)}
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
                  disabled={loadingCaja}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Lock size={16} />
                  {loadingCaja ? "Cerrando..." : "Realizar Arqueo y Cerrar Caja"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
