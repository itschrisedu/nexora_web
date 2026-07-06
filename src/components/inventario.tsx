import { useState, useEffect } from 'react';
import { db, type LocalProduct } from '../db/local-db';
import { ApiService } from '../services/api.service';
import { optimizeImageToWebp } from '../utils/image-optimizer';
import { Search, Plus, Filter, Image as ImageIcon, Check, Loader2 } from 'lucide-react';

interface InventarioProps {
  online: boolean;
}

export default function InventarioComponent({ online }: InventarioProps) {
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulario de Producto
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [material, setMaterial] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [serieId, setSerieId] = useState('');
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoLoading, setFotoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Series Mock para el formulario (usadas en la tesis)
  const seriesList = [
    { id: '1', nombre: 'Serie Niños (24-30)' },
    { id: '2', nombre: 'Serie Juvenil (31-37)' },
    { id: '3', nombre: 'Serie Adultos (38-44)' },
  ];

  useEffect(() => {
    loadProducts();
  }, [online]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      if (online) {
        // Cargar del backend
        const remoteProducts = await ApiService.get('/inventario/productos');
        setProducts(remoteProducts);

        // Guardar/Actualizar caché en Dexie
        await db.productos.clear();
        await db.productos.bulkAdd(remoteProducts);
      } else {
        // Cargar de Dexie local
        const localProducts = await db.productos.toArray();
        setProducts(localProducts);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      // Fallback a Dexie si falla la API
      const localProducts = await db.productos.toArray();
      setProducts(localProducts);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFotoLoading(true);
    try {
      // Comprimir a WebP en el cliente antes de subir
      const optimizedBase64 = await optimizeImageToWebp(file);
      setFotoBase64(optimizedBase64);
    } catch (err) {
      console.error('Error al comprimir imagen:', err);
      setErrorMsg('No se pudo optimizar la imagen.');
    } finally {
      setFotoLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!codigo || !nombre || !marca || !modelo || !precioCosto || !precioVenta || !serieId) {
      setErrorMsg('Todos los campos obligatorios deben ser llenados.');
      return;
    }

    const payload = {
      codigo,
      nombre,
      marca,
      modelo,
      material: material || undefined,
      fotoUrl: fotoBase64 || undefined,
      precioCosto: parseFloat(precioCosto),
      precioVenta: parseFloat(precioVenta),
      serieId,
      tallas: [
        { tallaId: 'talla-38', stockMinimo: 5 },
        { tallaId: 'talla-39', stockMinimo: 5 },
      ], // Tallas por defecto para inicializar stock
    };

    try {
      if (online) {
        // Guardar en el backend directamente
        await ApiService.post('/inventario/productos', payload);
      } else {
        // Guardar en IndexedDB localmente para sincronización posterior
        const offlineId = `offline-${Date.now()}`;
        await db.productos.add({
          id: offlineId,
          ...payload,
          activo: true,
        });

        // Registrar en cola de sincronización de movimientos si fuera necesario
        console.log('Guardado en IndexedDB localmente (Modo Offline).');
      }

      setShowAddModal(false);
      resetForm();
      loadProducts();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el producto.');
    }
  };

  const resetForm = () => {
    setCodigo('');
    setNombre('');
    setMarca('');
    setModelo('');
    setMaterial('');
    setPrecioCosto('');
    setPrecioVenta('');
    setSerieId('');
    setFotoBase64(null);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.marca.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Catálogo de Calzado</h3>
          <p className="text-xs text-muted-foreground">Administra el inventario físico y de venta</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          <span>Agregar Modelo</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 bg-card border border-border p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Buscar por código, nombre o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-border bg-card rounded-xl text-sm text-muted-foreground hover:text-foreground">
          <Filter size={16} />
          <span>Filtros</span>
        </button>
      </div>

      {/* Listado de Calzado */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="animate-spin text-primary mb-2" size={32} />
          <span className="text-sm">Cargando catálogo...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-2xl">
          No se encontraron productos registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              {/* Vista previa de imagen o Icono */}
              <div className="h-48 bg-muted flex items-center justify-center relative">
                {product.fotoUrl ? (
                  <img
                    src={product.fotoUrl}
                    alt={product.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={48} className="text-slate-400" />
                )}
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white tracking-wider">
                  {product.codigo}
                </span>
              </div>

              {/* Contenido / Info */}
              <div className="p-4 space-y-2">
                <div>
                  <h4 className="font-bold text-sm leading-tight">{product.nombre}</h4>
                  <p className="text-[10px] text-muted-foreground">{product.marca} — {product.modelo}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Venta</div>
                    <div className="font-extrabold text-primary text-sm">${Number(product.precioVenta).toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Costo</div>
                    <div className="font-bold text-xs text-muted-foreground">${Number(product.precioCosto).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL AGREGAR PRODUCTO (Premium) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Agregar Nuevo Calzado</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Código Único *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. NK-200"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Air Max Running"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Nike"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 2026-Sport"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Precio Costo ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={precioCosto}
                    onChange={(e) => setPrecioCosto(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Precio Venta ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Serie de Tallas *</label>
                  <select
                    required
                    value={serieId}
                    onChange={(e) => setSerieId(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Seleccione una serie</option>
                    {seriesList.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Material (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Cuero sintético"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Subida de Imagen WebP */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Foto de Calzado (Optimización WebP Automática)</label>
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 border border-dashed border-border rounded-xl flex items-center justify-center bg-muted/30 relative overflow-hidden">
                    {fotoBase64 ? (
                      <img src={fotoBase64} alt="Vista previa" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-muted-foreground" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="text-xs"
                  />
                </div>
                {fotoLoading && <span className="text-[10px] text-primary">Comprimiendo imagen a WebP...</span>}
              </div>

              {errorMsg && (
                <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-primary text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity"
              >
                Registrar Calzado en Inventario
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
