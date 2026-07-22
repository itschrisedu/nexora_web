"use client";

import React, { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
import {
  ShoppingBag,
  Search,
  Filter,
  ShoppingCart,
  Send,
  CheckCircle,
  X,
  Plus,
  Minus,
  Trash2,
  Building,
  Phone,
  MapPin,
  MessageSquare,
} from "lucide-react";

interface TiendaInfo {
  tenantId: string;
  nombreNegocio: string;
  direccion: string;
  telefono: string;
  email: string;
  logoUrl?: string;
  ruc?: string;
}

interface TallaStock {
  tallaId: string;
  numero: number;
  cantidad: number;
}

interface Variante {
  id: string;
  code: string;
  color: string;
  imageUrl?: string;
  salePrice: number;
  serieNombre: string;
  serieId: string;
  tallas: TallaStock[];
}

interface ModeloCalzado {
  id: string;
  baseCode: string;
  name: string;
  brand: string;
  material?: string;
  variantes: Variante[];
}

interface ItemCarrito {
  productId: string;
  modeloNombre: string;
  color: string;
  serieNombre: string;
  serieId: string;
  tallaId: string;
  tallaNumero: number;
  precioUnitario: number;
  cantidad: number;
  imageUrl?: string;
}

export default function CatalogoDigitalComponent() {
  const [tienda, setTienda] = useState<TiendaInfo | null>(null);
  const [modelos, setModelos] = useState<ModeloCalzado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [serieFiltro, setSerieFiltro] = useState<string>("TODOS");

  // Cart & Modal State
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [modeloSeleccionado, setModeloSeleccionado] = useState<ModeloCalzado | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Variante | null>(null);
  const [tallaSeleccionada, setTallaSeleccionada] = useState<TallaStock | null>(null);
  const [cantidadPares, setCantidadPares] = useState(1);

  // Client Data Form for WhatsApp Order
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteCedula, setClienteCedula] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [notasPedido, setNotasPedido] = useState("");
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [pedidoExitoso, setPedidoExitoso] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [info, catalog] = await Promise.all([
        ApiService.get("/catalogo/tienda"),
        ApiService.get("/catalogo/productos"),
      ]);
      setTienda(info);
      setModelos(catalog || []);
    } catch (err: any) {
      console.error("Error al cargar el catálogo:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModelo = (modelo: ModeloCalzado) => {
    setModeloSeleccionado(modelo);
    if (modelo.variantes.length > 0) {
      setVarianteSeleccionada(modelo.variantes[0]);
      setTallaSeleccionada(null);
      setCantidadPares(1);
    }
  };

  const handleAgregarAlCarrito = () => {
    if (!modeloSeleccionado || !varianteSeleccionada || !tallaSeleccionada) {
      alert("Por favor seleccione un modelo, variante y talla.");
      return;
    }

    if (tallaSeleccionada.cantidad < cantidadPares) {
      alert(`Solo hay ${tallaSeleccionada.cantidad} pares disponibles en talla ${tallaSeleccionada.numero}.`);
      return;
    }

    const itemExistenteIndex = carrito.findIndex(
      (i) => i.productId === varianteSeleccionada.id && i.tallaId === tallaSeleccionada.tallaId
    );

    if (itemExistenteIndex > -1) {
      const nuevoCarrito = [...carrito];
      nuevoCarrito[itemExistenteIndex].cantidad += cantidadPares;
      setCarrito(nuevoCarrito);
    } else {
      setCarrito([
        ...carrito,
        {
          productId: varianteSeleccionada.id,
          modeloNombre: modeloSeleccionado.name,
          color: varianteSeleccionada.color,
          serieNombre: varianteSeleccionada.serieNombre,
          serieId: varianteSeleccionada.serieId,
          tallaId: tallaSeleccionada.tallaId,
          tallaNumero: tallaSeleccionada.numero,
          precioUnitario: varianteSeleccionada.salePrice,
          cantidad: cantidadPares,
          imageUrl: varianteSeleccionada.imageUrl,
        },
      ]);
    }

    setModeloSeleccionado(null);
    setIsCartOpen(true);
  };

  const handleRemoverDelCarrito = (index: number) => {
    setCarrito(carrito.filter((_, i) => i !== index));
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
  const totalPares = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  const handleEnviarWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (carrito.length === 0) return;

    try {
      setEnviandoPedido(true);

      // 1. Registrar el pedido en el backend
      await ApiService.post("/catalogo/pedido-whatsapp", {
        tenantId: tienda?.tenantId,
        cliente: {
          nombre: clienteNombre,
          identificacion: clienteCedula || "9999999999",
          telefono: clienteTelefono,
          direccion: clienteDireccion,
        },
        lineas: carrito.map((item) => ({
          productId: item.productId,
          serieId: item.serieId,
          tallaId: item.tallaId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
        })),
        notas: notasPedido,
      });

      // 2. Construir mensaje formateado de WhatsApp
      let mensajeWA = `*NUEVO PEDIDO DESDE CATÁLOGO DIGITAL*\n`;
      mensajeWA += `──────────────────────\n`;
      mensajeWA += `👤 *Cliente:* ${clienteNombre}\n`;
      mensajeWA += `📱 *Teléfono:* ${clienteTelefono}\n`;
      if (clienteDireccion) mensajeWA += `📍 *Dirección:* ${clienteDireccion}\n`;
      mensajeWA += `──────────────────────\n`;
      mensajeWA += `📦 *DETALLE DEL PEDIDO:*\n`;

      carrito.forEach((item, idx) => {
        mensajeWA += `${idx + 1}. *${item.modeloNombre}* (${item.color})\n`;
        mensajeWA += `   • Talla: ${item.tallaNumero} | Cantidad: ${item.cantidad} par(es)\n`;
        mensajeWA += `   • P. Unit: $${item.precioUnitario.toFixed(2)} | Subtotal: $${(item.precioUnitario * item.cantidad).toFixed(2)}\n`;
      });

      mensajeWA += `──────────────────────\n`;
      mensajeWA += `💰 *TOTAL A PAGAR:* $${totalCarrito.toFixed(2)} (${totalPares} pares)\n`;
      if (notasPedido) mensajeWA += `📝 *Notas:* ${notasPedido}\n`;

      // 3. Formatear número de teléfono destino WhatsApp
      const numeroDestino = tienda?.telefono.replace(/\D/g, "") || "593991234567";
      const urlWA = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensajeWA)}`;

      // 4. Abrir WhatsApp y limpiar estado
      window.open(urlWA, "_blank");
      setPedidoExitoso(true);
      setCarrito([]);
      setIsCartOpen(false);
    } catch (err: any) {
      alert("Error al procesar el pedido: " + err.message);
    } finally {
      setEnviandoPedido(false);
    }
  };

  // Filtrado de modelos
  const modelosFiltrados = modelos.filter((m) => {
    const cumpleBusqueda =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.brand.toLowerCase().includes(search.toLowerCase());
    const cumpleSerie =
      serieFiltro === "TODOS" ||
      m.variantes.some((v) => v.serieNombre.toUpperCase() === serieFiltro.toUpperCase());
    return cumpleBusqueda && cumpleSerie;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      {/* Navbar / Header Tienda */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur-xl mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-emerald-500/20">
            {tienda?.nombreNegocio ? tienda.nombreNegocio.charAt(0) : "N"}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide">
              {tienda?.nombreNegocio || "Catálogo Digital Nexora"}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-emerald-400" />
                {tienda?.direccion || "Cevallos, Tungurahua"}
              </span>
              <span className="flex items-center gap-1">
                <Phone size={13} className="text-teal-400" />
                {tienda?.telefono || "WhatsApp"}
              </span>
            </div>
          </div>
        </div>

        {/* Carrito Indicator */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2"
        >
          <ShoppingCart size={20} />
          <span>Ver Mi Pedido</span>
          {totalPares > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 text-slate-950 text-xs font-black rounded-full flex items-center justify-center border-2 border-slate-950">
              {totalPares}
            </span>
          )}
        </button>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto space-y-6">
        {/* Barra de Búsqueda y Filtros */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar modelo o marca de calzado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <Filter size={16} className="text-slate-500 shrink-0" />
            {["TODOS", "BEBE", "NINO", "JUVENIL", "ADULTO"].map((serie) => (
              <button
                key={serie}
                onClick={() => setSerieFiltro(serie)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  serieFiltro === serie
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {serie}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Productos */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 font-medium">
            Cargando catálogo digital...
          </div>
        ) : modelosFiltrados.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No se encontraron modelos con los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {modelosFiltrados.map((modelo) => {
              const primeraVariante = modelo.variantes[0];
              const precioMin = Math.min(...modelo.variantes.map((v) => v.salePrice));
              const stockTotal = modelo.variantes.reduce(
                (sum, v) => sum + v.tallas.reduce((tSum, t) => tSum + t.cantidad, 0),
                0
              );

              return (
                <div
                  key={modelo.id}
                  onClick={() => handleOpenModelo(modelo)}
                  className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden cursor-pointer group transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-emerald-950/20 flex flex-col justify-between"
                >
                  <div className="relative h-48 bg-slate-950 flex items-center justify-center p-4">
                    {primeraVariante?.imageUrl ? (
                      <img
                        src={primeraVariante.imageUrl}
                        alt={modelo.name}
                        className="max-h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <ShoppingBag size={48} className="text-slate-800" />
                    )}
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-slate-900/90 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-800">
                      {modelo.brand}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {modelo.name}
                    </h3>
                    <p className="text-xs text-slate-400">Código: {modelo.baseCode}</p>

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <span className="text-xs text-slate-500 block">Desde</span>
                        <span className="text-lg font-black text-emerald-400">
                          ${precioMin.toFixed(2)}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          stockTotal > 0
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                            : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                        }`}
                      >
                        {stockTotal > 0 ? `${stockTotal} pares disp.` : "Agotado"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Detalle de Modelo */}
      {modeloSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModeloSeleccionado(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {modeloSeleccionado.brand}
              </span>
              <h2 className="text-2xl font-black text-white">{modeloSeleccionado.name}</h2>
              <p className="text-xs text-slate-400">Material: {modeloSeleccionado.material || "Sintético Premium"}</p>
            </div>

            {/* Selector de Color/Variante */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                Color / Variante:
              </label>
              <div className="flex gap-2 overflow-x-auto">
                {modeloSeleccionado.variantes.map((varItem) => (
                  <button
                    key={varItem.id}
                    onClick={() => {
                      setVarianteSeleccionada(varItem);
                      setTallaSeleccionada(null);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      varianteSeleccionada?.id === varItem.id
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    }`}
                  >
                    {varItem.color} (${varItem.salePrice.toFixed(2)})
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Tallas */}
            {varianteSeleccionada && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  Seleccione Talla Disponible:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {varianteSeleccionada.tallas.map((st) => (
                    <button
                      key={st.tallaId}
                      disabled={st.cantidad === 0}
                      onClick={() => setTallaSeleccionada(st)}
                      className={`p-2.5 rounded-xl text-center border transition-all ${
                        tallaSeleccionada?.tallaId === st.tallaId
                          ? "bg-emerald-600 text-white border-emerald-400 font-bold"
                          : st.cantidad > 0
                          ? "bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700"
                          : "bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed"
                      }`}
                    >
                      <div className="text-sm font-bold">Talla {st.numero}</div>
                      <div className="text-[10px] text-slate-400">{st.cantidad} disp.</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selector de Cantidad */}
            {tallaSeleccionada && (
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-sm font-semibold text-slate-300">Cantidad de pares:</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCantidadPares(Math.max(1, cantidadPares - 1))}
                    className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-bold text-lg text-white w-6 text-center">{cantidadPares}</span>
                  <button
                    onClick={() => setCantidadPares(Math.min(tallaSeleccionada.cantidad, cantidadPares + 1))}
                    className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleAgregarAlCarrito}
              disabled={!tallaSeleccionada}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
            >
              <ShoppingCart size={18} />
              Agregar al Pedido
            </button>
          </div>
        </div>
      )}

      {/* Drawer / Modal del Carrito de Pedidos WhatsApp */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="text-emerald-400" size={24} />
                  Resumen de Pedido
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-500 hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>

              {carrito.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  El pedido está vacío. Selecciona calzado del catálogo.
                </div>
              ) : (
                <div className="space-y-3">
                  {carrito.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-slate-200">{item.modeloNombre}</h4>
                        <p className="text-xs text-slate-400">
                          {item.color} | Talla {item.tallaNumero} ({item.cantidad} pair/s)
                        </p>
                        <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                          ${(item.precioUnitario * item.cantidad).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoverDelCarrito(idx)}
                        className="text-slate-600 hover:text-rose-400 p-1.5 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario de Checkout WhatsApp */}
            {carrito.length > 0 && (
              <form onSubmit={handleEnviarWhatsApp} className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex justify-between text-sm font-bold text-slate-200 py-1">
                  <span>Total Estimado ({totalPares} pares):</span>
                  <span className="text-emerald-400 text-base">${totalCarrito.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Teléfono WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 0991234567"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Cédula / RUC (Opcional)</label>
                  <input
                    type="text"
                    placeholder="1801234567"
                    value={clienteCedula}
                    onChange={(e) => setClienteCedula(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Dirección de Entrega</label>
                  <input
                    type="text"
                    placeholder="Ciudad, Calle Principal y Secundaria"
                    value={clienteDireccion}
                    onChange={(e) => setClienteDireccion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviandoPedido}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 text-sm mt-2"
                >
                  <Send size={16} />
                  {enviandoPedido ? "Procesando..." : "Enviar Pedido por WhatsApp"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
