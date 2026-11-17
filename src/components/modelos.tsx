"use client";



import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { ApiService } from "../services/api.service";

import UnsavedChangesModal from "./ui/unsaved-changes-modal";

import { uploadToCloudinary, deleteFromCloudinary } from "../services/cloudinary.service";

import {

  Plus, Search, Loader2, ImageIcon, Package, Edit2, Edit3, Trash2, AlertTriangle,

  DollarSign, CheckCircle, AlertCircle, X, RefreshCw, ChevronDown, ChevronUp, Palette,

  Layers, Boxes, Truck, Sparkles, Copy, Building2, PackageCheck, Info, Check, TrendingUp, ZoomIn

} from "lucide-react";

import { getStoredProfitMargin, calculateSuggestedPrice, calculateRealMarginPercent, calculateProfitAmount } from "../utils/pricing";

import { dividirDocenaEnMediaDocena } from "../utils/curvas";

import {

  generarSiglaProveedor,

  generarCodigoBaseModelo,

  formatearNombres,

  formatearApellidos,

  formatearEmail,

  validarEmailEstricto,

  formatearTelefono,

  formatearDireccion,

  formatearNombreSerie,

} from "../utils/text-formatters";

import { validarRuc, validarCedula } from "../utils/ecuador-validators";



interface ModelosProps {

  online: boolean;

  userRole?: string;

  activeSucursalId?: string;

  sucursales?: { id: string; name: string; isMatriz?: boolean }[];

}



interface TallaStock {

  tallaId: string;

  numero: number;

  cantidad: number;

  cantidadReservada: number;

  disponible: number;

  stockMinimo: number;

}



interface Producto {

  id: string;

  modelId?: string;

  codigo: string;

  nombre: string;

  marca: string;

  modelo: string;

  material?: string;

  color: string;

  fotoUrl?: string;

  precioCosto: number;

  precioVenta: number;

  serie: { id: string; nombre: string } | null;

  supplierId?: string | null;

  supplier?: { id: string; razonSocial: string; ruc?: string; contacto?: string } | null;

  supplierSigla?: string;

  priceHistory?: {

    precioCostoAnterior: number;

    precioVentaAnterior: number;

    precioCostoNuevo: number;

    precioVentaNuevo: number;

    motivo?: string;

    createdAt: string;

  }[];

  tallas: TallaStock[];

  activo: boolean;

}



interface SupplierInfo {

  id: string;

  razonSocial: string;

  ruc?: string;

  contacto?: string;

  isPrimary?: boolean;

  isMostFrequent?: boolean;

  totalOrdenes?: number;

}



interface ModeloAgrupado {

  id: string;

  baseCode: string;

  name: string;

  brand: string;

  material?: string;

  active: boolean;

  supplierId?: string;

  supplier?: { id: string; razonSocial: string; ruc?: string };

  alternateSupplierIds?: string[];

  suppliers?: SupplierInfo[];

  products: Producto[];

}



interface VarianteRed {

  id: string;

  code: string;

  color: string;

  imageUrl: string | null;

  costPrice: number;

  salePrice: number;

  serieId: string;

  serieNombre: string;

  tallas: number[];

  supplierId: string | null;

  supplier: { id: string; razonSocial: string; ruc?: string; contacto?: string } | null;

}



interface ModeloRed {

  id: string;

  tenantId: string;

  sucursalOrigenNombre: string;

  baseCode: string;

  name: string;

  brand: string;

  material?: string;

  status: 'DISPONIBLE' | 'PARCIAL' | 'COMPLETO';

  yaImportado: boolean;

  parcial: boolean;

  totalVariantesRed: number;

  variantesFaltantes: VarianteRed[];

  variantesExistentes: VarianteRed[];

  localModelId: string | null;

  colores: { color: string; fotoUrl: string | null }[];

  series: { id: string; nombre: string; tallas: number[]; costPrice: number; salePrice: number }[];

  precioCostoReferencial: number;

  precioVentaReferencial: number;

  fotoPrincipal: string | null;

  supplier: { id: string; razonSocial: string; ruc?: string; contacto?: string } | null;

}



interface ModeloMatriz {

  id: string;

  baseCode: string;

  name: string;

  brand: string;

  material?: string;

  yaImportado: boolean;

  colores: { color: string; fotoUrl: string | null }[];

  series: { id: string; nombre: string; tallas: number[]; costPrice: number; salePrice: number }[];

  precioCostoReferencial: number;

  precioVentaReferencial: number;

  fotoPrincipal: string | null;

}



interface ColorInput {

  color: string;

  foto: string | null;

  supplierId?: string;

}



interface SerieTallaConfig {

  id: string;

  numero: number;

}



interface SerieConfig {

  id: string;

  nombre: string;

  activa?: boolean;

  tallas?: SerieTallaConfig[];

}



/** Estandariza el nombre de un color al formato canónico y elegante:

 *  - Siempre espacios alrededor de '/': " / "

 *  - Mayúscula inicial en cada palabra: "Negro / Blanco", "Negro Planta Goma"

 *  - Espacios limpios simples

 */

const formatearColorEstandar = (color: string): string => {

  if (!color) return "";

  return color

    .trim()

    .replace(/\s*\/\s*/g, ' / ')

    .replace(/\s+/g, ' ')

    .split(' / ')

    .map(part =>

      part

        .split(' ')

        .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '')

        .join(' ')

    )

    .join(' / ');

};



/** Normaliza el nombre de un color para comparaciones y agrupación interna.

 *  "Negro / Blanco", "negro/blanco", "Negro /Blanco" → "negro/blanco" */

const normalizeColor = (color: string): string =>

  color

    .trim()

    .toLowerCase()

    .replace(/\s*\/\s*/g, '/')

    .replace(/\s*-\s*/g, '-')

    .replace(/\s+/g, ' ');



/** De un grupo de variantes con el mismo color normalizado, devuelve

 *  el nombre estandarizado y canónico (ej. "Negro / Blanco"). */

type VariantColorItem = { color: string };

const bestColorLabel = (variants: VariantColorItem[]): string => {

  const first = variants[0]?.color || "";

  return formatearColorEstandar(first);

};



const SERIES_ORDEN = [

  "ADULTO",

  "JUVENIL",

  "NINO",

  "NINO_PEQUENO_A",

  "BEBE",

  "TALLA_GRANDE"

];



const SERIES_NOMBRES: Record<string, string> = {

  ADULTO: "adulto (38-43)",

  JUVENIL: "juvenil (34-38)",

  NINO: "junior (27-32)",

  NINO_PEQUENO_A: "niño (21-26)",

  BEBE: "bebe (18-20)",

  TALLA_GRANDE: "Adulto Grande (43-45)"

};



const getNombreSerie = (s: SerieConfig | string | null | undefined, seriesList?: SerieConfig[]): string => {

  if (!s) return "—";

  let target: SerieConfig | undefined;

  if (typeof s === "string") {

    target = seriesList?.find(x => x.nombre === s || x.id === s);

    if (!target) {

      return formatearNombreSerie(s);

    }

  } else {

    target = s;

  }



  if (target && target.tallas && target.tallas.length > 0) {

    const sorted = [...target.tallas].sort((a, b) => a.numero - b.numero);

    const min = sorted[0].numero;

    const max = sorted[sorted.length - 1].numero;

    const nombreClean = formatearNombreSerie(target.nombre);

    return `${nombreClean} (${min}-${max})`;

  }



  const nombreClean = target ? target.nombre : String(s);

  return formatearNombreSerie(nombreClean);

};



// Curvas estándar de distribución por serie

const getCurvaDocena = (

  serie: string | SerieConfig,

  tipo: 'DOCENA' | 'MEDIA_A' | 'MEDIA_B' = 'DOCENA',

  tallasExplicit?: number[],

): Record<number, number> => {

  const sObj = typeof serie === 'object' && serie !== null ? serie : null;

  const name = (sObj ? sObj.nombre : String(serie || '')).toUpperCase();



  // Obtener números reales de tallas

  let nums: number[] = [];

  if (tallasExplicit && tallasExplicit.length > 0) {

    nums = [...tallasExplicit].sort((a, b) => a - b);

  } else if (sObj && sObj.tallas && sObj.tallas.length > 0) {

    nums = sObj.tallas.map((t: any) => t.numero).sort((a: number, b: number) => a - b);

  }



  const n = nums.length;

  const has38 = nums.includes(38);

  const has42 = nums.includes(42);

  const has43 = nums.includes(43);

  const tallas = (p.tallas || (p as any).stockPorTalla || []);

                                    const totalStock = tallas.reduce((acc: number, t: any) => acc + (t.cantidad ?? t.disponible ?? 0), 0);



                                    return (

                                      <div

                                        key={p.id}

                                        className={`bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm transition-all ${

                                          !p.activo ? "opacity-60 bg-[var(--muted)]/10 border-dashed" : ""

                                        }`}

                                      >

                                        <div className="flex items-center justify-between">

                                          <div>

                                            <div className="flex items-center gap-1.5">

                                              <span className="text-[10px] text-slate-900 dark:text-slate-300 font-bold uppercase tracking-wider block">Código Variante</span>

                                              {!p.activo && (

                                                <span className="px-1.5 py-0.5 bg-red-500/15 text-red-500 rounded text-[9px] font-bold leading-none">Deshabilitada</span>

                                              )}

                                            </div>

                                            <span className="text-xs font-mono font-black text-slate-900 dark:text-slate-100">{p.codigo}</span>

                                          </div>

                                          <div>

                                            <span className="text-[10px] text-slate-900 dark:text-slate-300 font-bold uppercase tracking-wider block">Serie</span>

                                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{p.serie?.nombre ? getNombreSerie(p.serie.nombre) : "—"}</span>

                                          </div>

                                          <div className="text-right">

                                            <span className="text-[10px] text-slate-900 dark:text-slate-300 font-bold uppercase tracking-wider block">Precio</span>

                                            <span className="text-xs font-black text-slate-900 dark:text-white">${Number(p.precioVenta).toFixed(2)}</span>

                                          </div>

                                        </div>



                                        {/* Insignia Discreta de Proveedor y Costo */}

                                        {!hasMultipleSuppliers && (

                                        <div className="flex items-center justify-between text-[11px] px-1">

                                          <div className="flex items-center gap-1.5">

                                            <span className="text-[10px] text-slate-900 dark:text-slate-300 font-bold">Proveedor:</span>

                                            {p.supplier ? (

                                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded text-[10px] font-bold">

                                                <Truck size={10} />

                                                <span>{p.supplier.razonSocial}</span>

                                                {p.supplierSigla && (

                                                  <span className="bg-blue-600 text-white px-1 py-0.2 rounded text-[8px] font-mono font-black">{p.supplierSigla}</span>

                                                )}

                                              </span>

                                            ) : (

                                              <span className="text-[10px] text-[var(--muted-foreground)] italic">Sin proveedor asignado</span>

                                            )}

                                          </div>

                                          <div className="text-[10px] text-slate-900 dark:text-slate-300 font-bold">

                                            Costo: <strong className="text-slate-900 dark:text-emerald-400 font-mono font-black">${Number(p.precioCosto).toFixed(2)}</strong>

                                          </div>

                                        </div>

                                        )}

                                        {hasMultipleSuppliers && (

                                        <div className="flex items-center justify-end text-[11px] px-1">

                                          <div className="text-[10px] text-slate-900 dark:text-slate-300 font-bold">

                                            Costo: <strong className="text-slate-900 dark:text-emerald-400 font-mono font-black">${Number(p.precioCosto).toFixed(2)}</strong>

                                          </div>

                                        </div>

                                        )}



                                        {/* Detalle de Tallas y Stocks */}

                                        <div className="bg-[var(--muted)]/20 rounded-lg p-2.5 space-y-1.5">

                                          <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">Stock Físico por Talla</span>

                                          <div className="flex flex-wrap gap-1.5">

                                            {tallas.map((t: any) => (

                                              <span

                                                key={t.tallaId}

                                                title={`Stock: ${t.cantidad} pares`}

                                                className={`px-2 py-1 rounded-md text-[10px] font-bold border ${

                                                  t.cantidad === 0 ? "bg-red-500/10 text-red-500 border-red-500/20"

                                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"

                                                }`}

                                              >

                                                T{t.numero}: {t.cantidad}

                                              </span>

                                            ))}

                                          </div>

                                          <div className="text-[10px] text-[var(--muted-foreground)] pt-1 flex justify-between items-center flex-wrap gap-1">

                                            <span>

                                              Total: <b className="text-[var(--foreground)]">{totalStock} pares</b>

                                              {totalStock > 0 && (

                                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/20">

                                                  Invertido: ${(totalStock * Number(p.precioCosto || 0)).toFixed(2)}

                                                </span>

                                              )}

                                            </span>

                                            {totalStock === 0 && <span className="text-red-500 font-bold">Sin Stock</span>}

                                          </div>

                                        </div>



                                        {/* Botones de acción */}

                                        <div className="flex justify-end items-center gap-2 pt-1 flex-wrap">

                                          {online && isAdmin && (

                                            <button

                                              type="button"

                                              onClick={() => handleToggleProduct(p.id, p.codigo, p.activo, m.id)}

                                              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${

                                                p.activo

                                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"

                                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"

                                              }`}

                                            >

                                              {p.activo ? "Deshabilitar" : "Habilitar"}

                                            </button>

                                          )}

                                          <button

                                            type="button"

                                            onClick={() => openEditProduct(p, m.id)}

                                            title="Editar variante: imagen, color, series, numeración, stock y precios"

                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-xs cursor-pointer"

                                          >

                                            <Edit2 size={12} />

                                            <span>Editar</span>

                                          </button>

                                          {online && isAdmin && (

                                            <button

                                              type="button"

                                              onClick={() => handleDeleteProduct(p.id, m.name, p.color, p.serie?.nombre, m.id)}

                                              title="Retirar variante de este local sin afectar a otros locales"

                                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all cursor-pointer"

                                            >

                                              <Trash2 size={12} />

                                              <span>Retirar</span>

                                            </button>

                                          )}

                                        </div>

                                      </div>

                                    );

                                  })}

                                </div>

                              </div>

                            );

                          });

                        })()}

                      </div>

                    )}

                  </div>

                );

              })}

            </div>

          )}

        </div>

      )}



      {/* ═════════════════════════════════════════════════════════ */}

      {/* VISTA 2: MODELOS DISPONIBLES EN LA RED COMERCIAL        */}

      {/* ═════════════════════════════════════════════════════════ */}

      {activeTab === 'red' && (

        <div className="space-y-4">

          <div className="flex flex-col sm:flex-row items-center gap-3">

            <div className="relative flex-1 w-full">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={16} />

              <input

                type="text"

                placeholder="Buscar modelo en la red por nombre, código base, color o marca..."

                value={search}

                onChange={e => setSearch(e.target.value)}

                className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[#0F172A] transition-colors"

              />

            </div>



            {redSucursales.length > 1 && (

              <div className="flex items-center gap-2 w-full sm:w-auto">

                <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap font-medium">Filtrar por origen:</span>

                <select

                  value={filterRedSucursal}

                  onChange={e => setFilterRedSucursal(e.target.value)}

                  className="px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none"

                >

                  <option value="TODAS">Todas las Sucursales y Matriz</option>

                  {redSucursales.map(s => (

                    <option key={s.id} value={s.id}>{s.nombre}</option>

                  ))}

                </select>

              </div>

            )}

          </div>



          {loading && modelosRed.length === 0 ? (

            <div className="flex flex-col items-center justify-center p-16 text-[var(--muted-foreground)]">

              <Loader2 className="animate-spin text-[#0F172A] mb-3" size={36} />

              <span className="text-sm">Explorando modelos en la red comercial...</span>

            </div>

          ) : filteredModelosRed.length === 0 ? (

            <div className="flex flex-col items-center justify-center p-16 bg-[var(--card)] border border-emerald-500/20 border-dashed rounded-3xl text-center space-y-3">

              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">

                <CheckCircle size={32} />

              </div>

              <h4 className="font-extrabold text-base text-[var(--foreground)]">¡Catálogo Totalmente Sincronizado!</h4>

              <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto">

                {search.trim()

                  ? "No se encontraron modelos con los términos de búsqueda ingresados."

                  : "Tu local comercial ya cuenta con todos los modelos y variantes existentes en la matriz y en las demás sucursales."}

              </p>

            </div>

          ) : (

            <div className="space-y-4">

              {filteredModelosRed.map(m => {

                const isImportingThis = importingModelId === m.id;

                const isParcial = m.status === 'PARCIAL';



                return (

                  <div

                    id={`modelo-red-${m.id}`}

                    key={m.id}

                    className={`bg-[var(--card)] border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 ${

                      isParcial ? "border-amber-500/30 bg-amber-500/[0.02]" : "border-[var(--border)]"

                    }`}

                  >

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

                      <div className="flex items-start gap-4">

                        <div

                          onClick={(e) => {

                            if (m.fotoPrincipal) {

                              e.stopPropagation();

                              setZoomImage({

                                url: m.fotoPrincipal,

                                title: m.name,

                                subtitle: m.baseCode,

                                brand: m.brand,

                              });

                            }

                          }}

                          className={`w-20 h-20 bg-white border border-[var(--border)] rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-xs relative group/img ${

                            m.fotoPrincipal ? "cursor-zoom-in hover:ring-2 hover:ring-emerald-500 transition-all" : ""

                          }`}

                          title={m.fotoPrincipal ? "Clic para ampliar foto" : undefined}

                        >

                          {m.fotoPrincipal ? (

                            <>

                              <img

                                src={m.fotoPrincipal}

                                alt={m.name}

                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"

                                onError={(e) => {

                                  e.currentTarget.style.display = 'none';

                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;

                                  if (fallback) fallback.style.display = 'flex';

                                }}

                              />

                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">

                                <ZoomIn size={18} />

                              </div>

                            </>

                          ) : null}

                          <div className={`w-full h-full items-center justify-center ${m.fotoPrincipal ? 'hidden' : 'flex'}`}>

                            <ImageIcon size={28} className="text-slate-300" />

                          </div>

                        </div>



                        <div className="space-y-1.5">

                          <div className="flex items-center gap-2 flex-wrap">

                            <h4 className="font-black uppercase tracking-wide text-base text-[var(--foreground)]">{m.name}</h4>

                            <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[10px] font-mono font-bold uppercase">{m.baseCode}</span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-lg text-[10px] font-bold">

                              <Building2 size={11} />

                              <span>Origen: {m.sucursalOrigenNombre}</span>

                            </span>

                            {isParcial ? (

                              <span className="px-2.5 py-0.5 bg-amber-500/15 text-amber-600 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1">

                                <Sparkles size={11} />

                                <span>Variantes Nuevas (+{m.variantesFaltantes.length})</span>

                              </span>

                            ) : (

                              <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 rounded-lg text-[10px] font-bold">

                                Modelo Nuevo en esta Sucursal

                              </span>

                            )}

                          </div>



                          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] flex-wrap">

                            <span>Marca: <strong>{m.brand}</strong></span>

                            {m.material && <span>· Material: <strong>{m.material}</strong></span>}

                            <span>· Total Variantes en Red: <strong>{m.totalVariantesRed}</strong></span>

                          </div>



                          {m.supplier && (

                            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-xl w-fit">

                              <Truck size={13} className="shrink-0" />

                              <span>Proveedor Fabricante: <strong>{m.supplier.razonSocial}</strong> {m.supplier.ruc ? `(${m.supplier.ruc})` : ''}</span>

                              <span className="text-[10px] opacity-75 font-normal">· Se auto-vinculará a tu local</span>

                            </div>

                          )}

                        </div>

                      </div>



                      {/* Botones de Importación */}

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">

                        {isParcial ? (

                          <>

                            <button

                              type="button"

                              disabled={isImportingThis || !isAdmin}

                              onClick={() => setImportModalData({

                                isOpen: true,

                                model: m,

                                selectedVariantIds: m.variantesFaltantes.map(v => v.id),

                              })}

                              className="px-3.5 py-2.5 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] border border-[var(--border)] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"

                            >

                              <span>Seleccionar Variantes</span>

                            </button>

                            <button

                              type="button"

                              disabled={isImportingThis || !isAdmin}

                              onClick={() => handleImportarModeloDirecto(m, m.variantesFaltantes.map(v => v.id))}

                              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"

                            >

                              {isImportingThis ? (

                                <><Loader2 size={14} className="animate-spin" /><span>Sincronizando...</span></>

                              ) : (

                                <><Sparkles size={14} /><span>Importar Faltantes (+{m.variantesFaltantes.length})</span></>

                              )}

                            </button>

                          </>

                        ) : (

                          <>

                            <button

                              type="button"

                              disabled={isImportingThis || !isAdmin}

                              onClick={() => setImportModalData({

                                isOpen: true,

                                model: m,

                                selectedVariantIds: m.variantesFaltantes.map(v => v.id),

                              })}

                              className="px-3.5 py-2.5 bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] border border-[var(--border)] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"

                            >

                              <span>Personalizar Variantes</span>

                            </button>

                            <button

                              type="button"

                              disabled={isImportingThis || !isAdmin}

                              onClick={() => handleImportarModeloDirecto(m)}

                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"

                            >

                              {isImportingThis ? (

                                <><Loader2 size={14} className="animate-spin" /><span>Importando a tu Local...</span></>

                              ) : (

                                <><Sparkles size={14} /><span>Importar Modelo Completo</span></>

                              )}

                            </button>

                          </>

                        )}

                      </div>

                    </div>



                    {/* Previsualización de Colores y Variantes Faltantes */}

                    <div className="bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl p-3.5 space-y-2">

                      <div className="flex items-center justify-between text-xs font-bold text-[var(--muted-foreground)]">

                        <span>Variantes disponibles para incorporar a este local:</span>

                        <span>Precios sugeridos: Costo ref. ${m.precioCostoReferencial.toFixed(2)} · Venta ref. ${m.precioVentaReferencial.toFixed(2)}</span>

                      </div>



                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">

                        {m.variantesFaltantes.map(v => (

                          <div

                            key={v.id}

                            className="bg-[var(--card)] border border-emerald-500/20 rounded-xl p-2.5 flex items-center gap-3 shadow-2xs"

                          >

                            <div className="w-10 h-10 bg-white border border-[var(--border)] rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">

                              {v.imageUrl ? (

                                <img

                                  src={v.imageUrl}

                                  alt={v.color}

                                  className="w-full h-full object-cover"

                                  onError={(e) => {

                                    e.currentTarget.style.display = 'none';

                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;

                                    if (fallback) fallback.style.display = 'flex';

                                  }}

                                />

                              ) : null}

                              <div className={`w-full h-full items-center justify-center ${v.imageUrl ? 'hidden' : 'flex'}`}>

                                <ImageIcon size={16} className="text-slate-300" />

                              </div>

                            </div>

                            <div className="flex-1 min-w-0">

                              <div className="flex items-center justify-between gap-1">

                                <span className="font-bold text-xs truncate">{v.color}</span>

                                <span className="text-[10px] font-mono font-bold text-emerald-600">${Number(v.salePrice).toFixed(2)}</span>

                              </div>

                              <div className="text-[10px] text-[var(--muted-foreground)] flex items-center justify-between gap-1 mt-0.5">

                                <span>{getNombreSerie(v.serieNombre)}</span>

                                {v.supplier?.razonSocial && (

                                  <span className="truncate text-blue-600 text-[9px]">Proveedor: {v.supplier.razonSocial}</span>

                                )}

                              </div>

                            </div>

                          </div>

                        ))}

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>

      )}



      {/* ═════════════════════════════════════════════════════════ */}

      {/* MODAL DE IMPORTACIÓN DETALLADA / SELECTIVA               */}

      {/* ═════════════════════════════════════════════════════════ */}

      {importModalData.isOpen && importModalData.model && (

        <div

          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"

          onMouseDown={e => { if (e.target === e.currentTarget) setImportModalData({ isOpen: false, model: null, selectedVariantIds: [] }); }}

          onClick={e => { if (e.target === e.currentTarget) setImportModalData({ isOpen: false, model: null, selectedVariantIds: [] }); }}

        >

          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">

              <div className="flex items-center gap-3">

                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">

                  <Sparkles size={20} />

                </div>

                <div>

                  <h3 className="font-extrabold text-base text-white">Importar "{importModalData.model.name}"</h3>

                  <p className="text-[11px] text-slate-300 mt-0.5">

                    Selecciona las variantes que deseas incorporar a tu sucursal. Los proveedores asociados se vincularán de forma automática.

                  </p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => setImportModalData({ isOpen: false, model: null, selectedVariantIds: [] })}

                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"

                title="Cerrar ventana"

              >

                <X size={18} />

              </button>

            </div>



            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">

              <div className="flex items-center justify-between bg-[var(--muted)]/20 border border-[var(--border)] p-3 rounded-xl text-xs">

                <div>

                  <span className="text-[var(--muted-foreground)]">Origen: </span>

                  <strong className="text-[var(--foreground)]">{importModalData.model.sucursalOrigenNombre}</strong>

                </div>

                <div className="flex gap-2">

                  <button

                    type="button"

                    onClick={() => setImportModalData(prev => ({

                      ...prev,

                      selectedVariantIds: prev.model?.variantesFaltantes.map(v => v.id) || [],

                    }))}

                    className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"

                  >

                    Marcar todas

                  </button>

                  <span>·</span>

                  <button

                    type="button"

                    onClick={() => setImportModalData(prev => ({ ...prev, selectedVariantIds: [] }))}

                    className="text-xs text-[var(--muted-foreground)] hover:underline font-bold cursor-pointer"

                  >

                    Desmarcar todas

                  </button>

                </div>

              </div>



              <div className="space-y-2">

                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">

                  Variantes Disponibles ({importModalData.model.variantesFaltantes.length})

                </label>



                {importModalData.model.variantesFaltantes.map(v => {

                  const isChecked = importModalData.selectedVariantIds.includes(v.id);



                  return (

                    <label

                      key={v.id}

                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${

                        isChecked

                          ? "bg-emerald-500/5 border-emerald-500/40 shadow-2xs"

                          : "bg-[var(--card)] border-[var(--border)] opacity-60 hover:opacity-100"

                      }`}

                    >

                      <div className="flex items-center gap-3">

                        <input

                          type="checkbox"

                          checked={isChecked}

                          onChange={e => {

                            const checked = e.target.checked;

                            setImportModalData(prev => ({

                              ...prev,

                              selectedVariantIds: checked

                                ? [...prev.selectedVariantIds, v.id]

                                : prev.selectedVariantIds.filter(id => id !== v.id),

                            }));

                          }}

                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"

                        />

                        <div className="w-10 h-10 bg-white border border-[var(--border)] rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">

                          {v.imageUrl ? (

                            <img

                              src={v.imageUrl}

                              alt={v.color}

                              className="w-full h-full object-cover"

                              onError={(e) => {

                                e.currentTarget.style.display = 'none';

                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;

                                if (fallback) fallback.style.display = 'flex';

                              }}

                            />

                          ) : null}

                          <div className={`w-full h-full items-center justify-center ${v.imageUrl ? 'hidden' : 'flex'}`}>

                            <ImageIcon size={16} className="text-slate-300" />

                          </div>

                        </div>

                        <div>

                          <div className="font-bold text-xs text-[var(--foreground)]">{v.color}</div>

                          <div className="text-[10px] text-[var(--muted-foreground)]">

                            {getNombreSerie(v.serieNombre)} {v.supplier?.razonSocial ? `· Proveedor: ${v.supplier.razonSocial}` : ''}

                          </div>

                        </div>

                      </div>



                      <div className="text-right text-xs">

                        <div className="font-black text-slate-900 dark:text-white">${Number(v.salePrice).toFixed(2)}</div>

                        <div className="text-[10px] text-slate-900 dark:text-slate-300 font-bold">Costo: <strong className="text-slate-900 dark:text-emerald-400 font-mono font-black">${Number(v.costPrice).toFixed(2)}</strong></div>

                      </div>

                    </label>

                  );

                })}

              </div>

            </div>



            <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">

              <button

                type="button"

                onClick={() => setImportModalData({ isOpen: false, model: null, selectedVariantIds: [] })}

                className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"

              >

                Cancelar

              </button>

              <button

                type="button"

                disabled={importModalData.selectedVariantIds.length === 0 || Boolean(importingModelId)}

                onClick={() => handleImportarModeloDirecto(importModalData.model!, importModalData.selectedVariantIds)}

                className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[42px]"

              >

                {importingModelId ? (

                  <><Loader2 size={15} className="animate-spin" /><span>Sincronizando...</span></>

                ) : (

                  <><Sparkles size={15} /><span>Importar {importModalData.selectedVariantIds.length} Variantes Seleccionadas</span></>

                )}

              </button>

            </div>

          </div>

        </div>

      )}





      {/* MODAL CREAR MASIVO */}

      {showCreate && (

        <div

          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"

          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowCreate(false); resetForm(); }, isDirtyCreate()); }}

          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowCreate(false); resetForm(); }, isDirtyCreate()); }}

        >

          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">

              <div className="flex items-center gap-3">

                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">

                  <Plus size={20} />

                </div>

                <div>

                  <h3 className="font-extrabold text-base text-white">Nuevo Modelo y Variantes</h3>

                  <p className="text-[11px] text-slate-300 mt-0.5">Crea un diseño base y genera variantes para colores y series en lote</p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => { setShowCreate(false); resetForm(); }}

                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"

                title="Cerrar ventana"

              >

                <X size={18} />

              </button>

            </div>

            <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">

              

              {/* Opción para Sucursales: Adoptar Modelo Base de la Matriz */}

              {!isMatrizTenant && modelosMatrizDisponibles.length > 0 && (

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <Sparkles size={16} className="text-emerald-500 shrink-0" />

                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">

                        Adoptar Modelo de la Matriz ({matrizNombre})

                      </span>

                    </div>

                    <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">

                      Opcional

                    </span>

                  </div>

                  <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">

                    Si este modelo ya existe en la matriz, selecciónalo aquí para auto-completar sus datos y reutilizar sus fotografías (ahorrando espacio de almacenamiento). Podrás asignarle tu propio proveedor local y ajustar los precios de tu sucursal.

                  </p>

                  <div>

                    <select

                      value={selectedMatrizModelId}

                      onChange={(e) => handleSelectMatrizModel(e.target.value)}

                      className="w-full px-3 py-2 bg-[var(--card)] border border-emerald-500/40 rounded-xl text-xs text-[var(--foreground)] font-medium focus:outline-none focus:border-emerald-500 transition-colors"

                    >

                      <option value="">-- Crear modelo nuevo desde cero --</option>

                      {modelosMatrizDisponibles.map((mm) => (

                        <option key={mm.id} value={mm.id}>

                          {mm.name} ({mm.brand}) — {mm.colores.length} colores {mm.yaImportado ? '✓ (Ya registrado en esta sucursal)' : ''}

                        </option>

                      ))}

                    </select>

                  </div>

                  {selectedMatrizModelId && (

                    <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/15 p-2 rounded-lg">

                      <CheckCircle size={13} className="shrink-0" />

                      <span>Datos y fotografías importados desde la Matriz. Puedes modificar el proveedor local, precios o colores libremente sin afectar a la Matriz.</span>

                    </div>

                  )}

                </div>

              )}



              {/* Sección 1: Datos Base */}

              <div className="space-y-4">

                <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">1. Información del Modelo</h5>

                

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <Lbl t="Nombre del calzado" req />

                    <input

                      type="text"

                      value={name}

                      onChange={(e) => handleNameChange(e.target.value)}

                      placeholder="Ej. Botín Hombre Londres"

                      className={INPUT}

                    />

                  </div>

                  <div>

                    <div className="flex items-center justify-between mb-1">

                      <Lbl t="Código Base" req />

                    </div>

                    <input

                      type="text"

                      value={baseCode}

                      readOnly

                      disabled

                      placeholder="Ej. VHL-01 (Automático)"

                      className={`${INPUT} bg-[var(--muted)]/40 text-[var(--muted-foreground)] cursor-not-allowed select-none font-mono font-bold`}

                    />

                  </div>

                </div>



                <div className="grid grid-cols-2 gap-4">

                  <div><Lbl t="Marca" req /><input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ej. Nike" className={INPUT} /></div>

                  <div><Lbl t="Material" /><input type="text" value={material} onChange={e => setMaterial(e.target.value)} placeholder="Ej. Cuero sintético y malla" className={INPUT} /></div>

                </div>



                <div>

                  <Lbl t="Proveedor Principal (Órdenes de Compra Automáticas)" />

                  <div className="flex gap-2">

                    <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={`${INPUT} flex-1`}>

                      <option value="">-- Sin Proveedor Asignado --</option>

                      {listaProveedores.map(p => (

                        <option key={p.id} value={p.id}>{p.razonSocial} {p.ruc ? `(${p.ruc})` : ''}</option>

                      ))}

                    </select>

                    <button type="button" onClick={() => { setQsContext('create'); setShowQuickSupplier(true); }}

                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl flex items-center gap-1 shrink-0 transition-colors">

                      <Plus size={12} /><span>Nuevo</span>

                    </button>

                  </div>

                </div>



                {/* Proveedores Alternos */}

                <div>

                  <Lbl t="Proveedores Alternos (Suplencia / Alta Demanda)" />

                  <div className="flex flex-wrap gap-1.5 mb-2">

                    {createAlternateIds.map(altId => {

                      const prov = listaProveedores.find(p => p.id === altId);

                      return prov ? (

                        <span key={altId} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded-lg text-[10px] font-bold">

                          <Truck size={10} />{prov.razonSocial}

                          <button type="button" onClick={() => setCreateAlternateIds(prev => prev.filter(x => x !== altId))}

                            className="text-rose-500 hover:text-rose-700 ml-0.5"><X size={10} /></button>

                        </span>

                      ) : null;

                    })}

                  </div>

                  <select value="" onChange={e => {

                    const val = e.target.value;

                    if (val && !createAlternateIds.includes(val) && val !== supplierId) {

                      setCreateAlternateIds(prev => [...prev, val]);

                    }

                  }} className={INPUT}>

                    <option value="">-- Agregar proveedor alterno --</option>

                    {listaProveedores.filter(p => p.id !== supplierId && !createAlternateIds.includes(p.id)).map(p => (

                      <option key={p.id} value={p.id}>{p.razonSocial} {p.ruc ? `(${p.ruc})` : ''}</option>

                    ))}

                  </select>

                </div>

              </div>



              {/* Sección 2: Variantes de Color */}

              <div className="space-y-4">

                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">

                  <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">2. Colores y Fotografías</h5>

                  <button type="button" onClick={addColorField}

                    className="flex items-center gap-1 text-[11px] font-bold text-[#0F172A] hover:opacity-80 transition-opacity">

                    <Plus size={12} /><span>Añadir Color</span>

                  </button>

                </div>



                <div className="space-y-3">

                  {colors.map((cInput, idx) => (

                    <div key={idx} className="flex gap-4 items-start bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl p-3 relative">

                      <div className="w-16 h-16 bg-[var(--muted)]/40 border-2 border-dashed border-[var(--border)] rounded-lg flex items-center justify-center shrink-0 overflow-hidden">

                        {cInput.foto ? <img src={cInput.foto} className="w-full h-full object-cover" alt="preview" />

                          : <ImageIcon size={18} className="text-[var(--muted-foreground)] opacity-40" />}

                      </div>

                      <div className="flex-1 space-y-2">

                        <div className="flex items-center justify-between">

                          <Lbl t={`Nombre de Color #${idx + 1}`} req />

                          {colors.length > 1 && (

                            <button type="button" onClick={() => removeColorField(idx)}

                              className="text-[10px] font-bold text-red-500 hover:opacity-80 transition-opacity">

                              Eliminar

                            </button>

                          )}

                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                          <input type="text" value={cInput.color} onChange={e => setColors(prev => {

                            const copy = [...prev];

                            copy[idx].color = e.target.value;

                            return copy;

                          })} placeholder="Ej. Blanco / Negro-Rojo" className="w-full px-2 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[#0F172A]" />

                          

                          <input type="file" accept="image/*" onChange={e => handleFoto(idx, e)}

                            className="w-full text-[10px] text-[var(--muted-foreground)] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-900 file:text-white file:text-[9px] file:font-semibold hover:file:opacity-90 cursor-pointer" />

                        </div>

                        {/* Selector opcional de taller para este color */}

                        {listaProveedores.length > 0 && (

                          <div className="pt-1">

                            <select

                              value={cInput.supplierId || ""}

                              onChange={e => setColors(prev => {

                                const copy = [...prev];

                                copy[idx].supplierId = e.target.value;

                                return copy;

                              })}

                              className="w-full px-2 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--foreground)]"

                            >

                              <option value="">-- Proveedor Principal del Modelo --</option>

                              {listaProveedores.map(p => (

                                <option key={p.id} value={p.id}>{p.razonSocial} {p.ruc ? `(${p.ruc})` : ''}</option>

                              ))}

                            </select>

                          </div>

                        )}

                      </div>

                    </div>

                  ))}

                </div>

              </div>



              {/* Sección 3: Series y Precios */}

              <div className="space-y-4">

                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">

                  <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">3. Series y Precios</h5>

                  <button type="button" onClick={() => { setNewSerieNombre(""); setNewSerieTallasDesde("38"); setNewSerieTallasHasta("43"); setError(""); setShowCreateSeriesModal(true); }}

                    className="flex items-center gap-1 text-[11px] font-bold text-[#0F172A] hover:underline">

                    <Plus size={13} /> <span>Crear Nueva Serie</span>

                  </button>

                </div>

                <p className="text-[10px] text-[var(--muted-foreground)] -mt-2">Activa las series que deseas generar, personaliza sus tallas y define precios.</p>



                <div className="space-y-3">

                  {series.map(s => {

                    const isActive = serieIds.includes(s.id);

                    const prices = seriesPrices[s.id] || { costPrice: "", salePrice: "" };

                    const selectedTallaIds = customTallas[s.id] || [];



                    return (

                      <div key={s.id} className={`rounded-xl border transition-all overflow-hidden ${

                        isActive

                          ? "border-[#0F172A] bg-[#0F172A]/5 shadow-sm"

                          : "border-[var(--border)] bg-[var(--card)] opacity-70 hover:opacity-100"

                      }`}>

                        {/* Toggle Header */}

                        <div className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/30">

                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleSerie(s.id)}>

                            <div className={`w-10 h-5 rounded-full relative transition-colors ${

                              isActive ? "bg-[#0F172A]" : "bg-[var(--border)]"

                            }`}>

                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${

                                isActive ? "translate-x-5" : "translate-x-0.5"

                              }`} />

                            </div>

                            <span className={`text-sm font-bold ${

                              isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"

                            }`}>{getNombreSerie(s, series)}</span>

                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">({s.nombre})</span>

                          </div>



                          <div className="flex items-center gap-2">

                            <button type="button" onClick={() => openEditSeriesModal(s)}

                              className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--muted)]/50 transition-colors flex items-center gap-1 text-[11px] font-semibold"

                              title="Editar rango o nombre de esta serie">

                              <Edit2 size={13} />

                              <span>Editar</span>

                            </button>

                            {isActive && (

                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">ACTIVA</span>

                            )}

                          </div>

                        </div>



                        {/* Detalle si la serie está activa */}

                        {isActive && (() => {

                          const costVal = parseDecimalNumber(prices.costPrice);

                          const saleVal = parseDecimalNumber(prices.salePrice);

                          const hasCost = !isNaN(costVal) && costVal > 0;

                          const hasSale = !isNaN(saleVal) && saleVal > 0;

                          const suggestedSale = hasCost ? calculateSuggestedPrice(costVal, marginPct).toFixed(2) : "";

                          const isLoss = hasCost && hasSale && saleVal < costVal;

                          const marginPercent = hasCost && hasSale ? calculateRealMarginPercent(costVal, saleVal) : 0;

                          const profitAmount = hasCost && hasSale ? calculateProfitAmount(costVal, saleVal) : 0;

                          const suggestedProfit = hasCost && suggestedSale ? (parseFloat(suggestedSale) - costVal).toFixed(2) : "0.00";



                          return (

                            <div className="px-4 pb-4 pt-3 space-y-3">

                              {/* Inputs de Precio */}

                              <div className="grid grid-cols-2 gap-3">

                                <div>

                                  <Lbl t="Precio de Compra ($)" req />

                                  <input type="text" inputMode="decimal"

                                    value={prices.costPrice}

                                    onChange={e => {

                                      const val = normalizeDecimalInput(e.target.value);

                                      setSeriesPrices(prev => ({

                                        ...prev,

                                        [s.id]: { ...prev[s.id], costPrice: val }

                                      }));

                                    }}

                                    placeholder="0.00" className={INPUT} />

                                </div>

                                <div>

                                  <Lbl t="Precio de Venta ($)" req />

                                  <input type="text" inputMode="decimal"

                                    value={prices.salePrice}

                                    onChange={e => {

                                      const val = normalizeDecimalInput(e.target.value);

                                      setSeriesPrices(prev => ({

                                        ...prev,

                                        [s.id]: { ...prev[s.id], salePrice: val }

                                      }));

                                    }}

                                    placeholder={suggestedSale ? `$${suggestedSale} (${marginPct}% margen)` : "0.00"}

                                    className={`${INPUT} ${isLoss ? "border-red-500 text-red-500 bg-red-500/5" : ""}`} />

                                </div>

                              </div>



                              {/* Indicador de Margen Configurable */}

                              {hasCost && (

                                <div className="text-[11px] font-semibold">

                                  {hasSale ? (

                                    isLoss ? (

                                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-1.5">

                                        <AlertCircle size={14} className="shrink-0 animate-bounce" />

                                        <span>Venta menor al costo: Margen {marginPercent.toFixed(1)}% (Pérdida de -${Math.abs(profitAmount).toFixed(2)}/par)</span>

                                      </div>

                                    ) : (

                                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center gap-1.5">

                                        <CheckCircle size={14} className="shrink-0" />

                                        <span>Margen de ganancia: <strong className="font-extrabold">{marginPercent.toFixed(1)}%</strong> (+${profitAmount.toFixed(2)} de utilidad por par)</span>

                                      </div>

                                    )

                                  ) : (

                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-lg flex items-center gap-1.5">

                                      <DollarSign size={14} className="shrink-0" />

                                      <span>Precio sugerido ({marginPct}% margen): <strong className="font-extrabold">${suggestedSale}</strong> (Ganancia estimada: +${suggestedProfit}/par)</span>

                                    </div>

                                  )}

                                </div>

                              )}



                              {/* Componente de Curva de Tallas con Steppers */}

                              <div className="pt-2 border-t border-[var(--border)]/40 space-y-2.5">

                                <div className="flex items-center justify-between">

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">

                                    Serie: {getNombreSerie(s, series).toUpperCase()}

                                  </span>

                                  <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">

                                    = {selectedTallaIds.length} pares total

                                  </span>

                                </div>



                                {/* Steppers por talla */}

                                <div className="flex flex-wrap gap-2">

                                  {[...(s.tallas || [])].sort((a, b) => a.numero - b.numero).map(t => {

                                    const count = selectedTallaIds.filter(id => id === t.id).length;

                                    return (

                                      <div key={t.id} className="flex items-center gap-0 bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-1 py-0.5">

                                        <span className="text-xs font-black text-[var(--foreground)] px-1.5 w-9 text-center">T{t.numero}</span>

                                        <button type="button"

                                          onClick={() => removeOneTallaInSerie(s.id, t.id)}

                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-sm font-bold transition-colors"

                                        >−</button>

                                        <span className="w-8 text-center text-sm font-extrabold text-[var(--foreground)]">{count}</span>

                                        <button type="button"

                                          onClick={() => addTallaRepeatInSerie(s.id, t.id)}

                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-sm font-bold transition-colors"

                                        >+</button>

                                      </div>

                                    );

                                  })}

                                </div>



                                {/* Total de pares y botón para restablecer docena estándar */}

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)]/30">

                                  <div className="flex items-center gap-2">

                                    <span className="text-[11px] font-bold text-[var(--foreground)] font-mono">

                                      = {selectedTallaIds.length} pares total ({getDocenaLabelExt(selectedTallaIds.length)})

                                    </span>

                                    {selectedTallaIds.length !== 12 && (

                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">

                                        Una docena estándar suma 12 pares

                                      </span>

                                    )}

                                  </div>

                                  <button

                                    type="button"

                                    onClick={() => restablecerDocenaEstandarEnCreacion(s.id)}

                                    className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"

                                    title="Restablecer curva base estándar (38 al 42 con 39 y 40 repetidos = 12 pares)"

                                  >

                                    <RefreshCw size={11} />

                                    <span>Restablecer estándar (38-42)</span>

                                  </button>

                                </div>



                                {/* Selección de Stock Inicial para Bodega */}

                                <div className="space-y-1.5 pt-2 border-t border-[var(--border)]/40">

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">

                                    Stock Inicial en Bodega para este modelo:

                                  </span>

                                  <div className="flex flex-wrap gap-2">

                                    <button type="button" onClick={() => aplicarCurvaEnCreacion(s.id, 'DOCENA')}

                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${

                                        (stockOptionCreacion[s.id] || 'DOCENA') === 'DOCENA'

                                          ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"

                                          : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 text-[var(--foreground)]"

                                      }`}

                                    >

                                      {(stockOptionCreacion[s.id] || 'DOCENA') === 'DOCENA' && <Check size={13} />}

                                      1 Docena en Bodega (12 pares según serie de arriba)

                                    </button>

                                    <button type="button" onClick={() => aplicarCurvaEnCreacion(s.id, 'NINGUNA')}

                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${

                                        stockOptionCreacion[s.id] === 'NINGUNA'

                                          ? "border-slate-600 bg-slate-700 text-white shadow-xs"

                                          : "border-slate-300 dark:border-slate-700 bg-[var(--card)] hover:bg-rose-500/10 text-rose-600"

                                      }`}

                                    >

                                      {stockOptionCreacion[s.id] === 'NINGUNA' && <Check size={13} />}

                                      Sin Stock Inicial (0 pares, solo catálogo para pedidos)

                                    </button>

                                  </div>

                                </div>

                              </div>

                            </div>

                          );

                        })()}

                      </div>

                    );

                  })}

                </div>



                <div className="bg-[var(--muted)]/20 border border-[var(--border)] p-3.5 sm:p-4 rounded-2xl space-y-3">

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)]/40 pb-2.5">

                    <div className="flex items-center gap-2">

                      <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">

                        <PackageCheck size={18} />

                      </div>

                      <div>

                        <h6 className="text-xs font-black text-[var(--foreground)] uppercase tracking-wider">

                          Stock Inicial por Talla y Curva

                        </h6>

                        <p className="text-[10px] text-[var(--muted-foreground)]">

                          Selecciona el tipo de curva deseada para cada serie o aplica a todas

                        </p>

                      </div>

                    </div>



                    {serieIds.length > 0 && (

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">

                        <span className="text-[10px] font-bold text-[var(--muted-foreground)] mr-1">Aplicar a todas:</span>

                        <button type="button" onClick={() => aplicarCurvaATodasEnCreacion('MEDIA_A')} className="px-2 py-0.5 text-[9px] font-bold rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 cursor-pointer">Media A (6)</button>

                        <button type="button" onClick={() => aplicarCurvaATodasEnCreacion('MEDIA_B')} className="px-2 py-0.5 text-[9px] font-bold rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 cursor-pointer">Media B (6)</button>

                        <button type="button" onClick={() => aplicarCurvaATodasEnCreacion('DOCENA')} className="px-2 py-0.5 text-[9px] font-bold rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 cursor-pointer">1 Docena (12)</button>

                        <button type="button" onClick={() => aplicarCurvaATodasEnCreacion('NINGUNA')} className="px-2 py-0.5 text-[9px] font-bold rounded-md border border-slate-500/30 bg-slate-500/10 text-slate-700 hover:bg-slate-500/20 cursor-pointer">Sin Stock (0)</button>

                      </div>

                    )}

                  </div>



                  {(() => {

                    const totalParesLote = Object.values(customTallas).reduce((sum, arr) => sum + (arr?.length || 0), 0);

                    return (

                      <div className="flex items-center gap-2.5 p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">

                        {totalParesLote > 0 ? (

                          <>

                            <CheckCircle size={16} className="text-emerald-500 shrink-0" />

                            <div className="text-xs text-[var(--foreground)] leading-relaxed">

                              Se creará un stock inicial de <strong className="font-extrabold text-emerald-600">{totalParesLote} pares</strong> <span className="font-semibold text-[var(--muted-foreground)]">({getDocenaLabelExt(totalParesLote)})</span> por cada color generado.

                            </div>

                          </>

                        ) : (

                          <>

                            <Info size={16} className="text-slate-400 shrink-0" />

                            <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">

                              <strong className="font-bold text-[var(--foreground)]">Sin stock inicial (0 pares):</strong> Se registrarán las variantes en el catálogo sin unidades físicas.

                            </div>

                          </>

                        )}

                      </div>

                    );

                  })()}

                </div>

              </div>



              {error && (

                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">

                  <AlertCircle size={14} /> {error}

                </div>

              )}

              </div>



              {/* Pie del Modal Estandarizado */}

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">

                <button

                  type="button"

                  onClick={() => { setShowCreate(false); resetForm(); }}

                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"

                >

                  Cancelar

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"

                >

                  {saving ? (

                    <><Loader2 size={15} className="animate-spin" /><span>Generando variantes...</span></>

                  ) : (

                    <><Plus size={15} /><span>Crear Modelo y Variantes</span></>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* ── MODAL AÑADIR NUEVO COLOR A MODELO EXISTENTE ── */}

      {showAddColorModal && selectedModelForColor && (

        <div

          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"

          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowAddColorModal(false); setSelectedModelForColor(null); }, isDirtyAddColor()); }}

          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowAddColorModal(false); setSelectedModelForColor(null); }, isDirtyAddColor()); }}

        >

          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">

              <div className="flex items-center gap-3">

                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-amber-400 font-bold shrink-0">

                  <Palette size={20} />

                </div>

                <div>

                  <h3 className="font-extrabold text-base text-white">Añadir Nuevo Color a "{selectedModelForColor.name}"</h3>

                  <p className="text-[11px] text-slate-300 mt-0.5">

                    Código Base: <span className="font-mono font-bold text-white">{selectedModelForColor.baseCode}</span> · Marca: {selectedModelForColor.brand}

                  </p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => { setShowAddColorModal(false); setSelectedModelForColor(null); }}

                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"

                title="Cerrar ventana"

              >

                <X size={18} />

              </button>

            </div>



            <form onSubmit={handleCreateNewColor} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">

              {/* Sección 1: Detalle del Color */}

              <div className="space-y-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl p-4">

                <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">

                  1. Detalle del Nuevo Color

                </h5>

                <div className="flex gap-4 items-start">

                  <div className="w-16 h-16 bg-[var(--muted)]/40 border-2 border-dashed border-[var(--border)] rounded-lg flex items-center justify-center shrink-0 overflow-hidden">

                    {newColorFoto ? (

                      <img src={newColorFoto} className="w-full h-full object-cover" alt="preview" />

                    ) : (

                      <ImageIcon size={18} className="text-[var(--muted-foreground)] opacity-40" />

                    )}

                  </div>

                  <div className="flex-1 space-y-2">

                    <Lbl t="Nombre del Color" req />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                      <input

                        type="text"

                        list="model-existing-colors-datalist"

                        value={newColorName}

                        onChange={e => setNewColorName(e.target.value)}

                        onBlur={() => setNewColorName(prev => formatearColorEstandar(prev))}

                        placeholder="Ej. Azul Marino / Blanco"

                        className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0F172A]"

                      />

                      <input

                        type="file"

                        accept="image/*"

                        onChange={handleNewColorFoto}

                        className="w-full text-[10px] text-[var(--muted-foreground)] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-900 file:text-white file:text-[9px] file:font-semibold hover:file:opacity-90 cursor-pointer"

                      />

                    </div>

                    {(() => {

                      const existingColorLabels = Array.from(

                        new Set(

                          (selectedModelForColor.products || [])

                            .map(p => formatearColorEstandar(p.color))

                            .filter(Boolean)

                        )

                      );

                      if (existingColorLabels.length === 0) return null;



                      // Filtrar chips si el usuario ya escribió algo

                      const searchTrim = newColorName.trim().toLowerCase();

                      const filteredChips = searchTrim

                        ? existingColorLabels.filter(c => c.toLowerCase().includes(searchTrim))

                        : existingColorLabels;



                      return (

                        <>

                          <datalist id="model-existing-colors-datalist">

                            {existingColorLabels.map(col => (

                              <option key={col} value={col} />

                            ))}

                          </datalist>

                          {filteredChips.length > 0 && (

                            <div className="flex items-center gap-1.5 flex-wrap pt-1">

                              <span className="text-[10px] text-[var(--muted-foreground)] font-semibold">

                                {searchTrim ? 'Sugerencias:' : 'Colores ya existentes:'}

                              </span>

                              {filteredChips.map(col => (

                                <button

                                  type="button"

                                  key={col}

                                  onClick={() => setNewColorName(col)}

                                  title={`Seleccionar color existente "${col}" para añadir este nuevo proveedor`}

                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${

                                    normalizeColor(newColorName) === normalizeColor(col)

                                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'

                                      : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-slate-400'

                                  }`}

                                >

                                  {col}

                                </button>

                              ))}

                            </div>

                          )}

                        </>

                      );

                    })()}

                  </div>

                </div>

              </div>



              {/* Sección 2: Proveedor Fabricante de esta Variante */}

              <div className="space-y-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl p-4">

                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">

                  <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest flex items-center gap-1.5">

                    <Truck size={14} className="text-emerald-600" />

                    <span>2. Proveedor Fabricante</span>

                  </h5>

                </div>

                <p className="text-[10px] text-[var(--muted-foreground)] -mt-1">

                  Selecciona el proveedor que suministra esta variante. El precio de costo que ingreses abajo corresponderá al valor entregado por este proveedor.

                </p>

                <div className="space-y-2">

                  <Lbl t="Proveedor Asignado a esta Variante" />

                  <div className="flex gap-2">

                    <select

                      value={newColorSupplierId}

                      onChange={e => handleSupplierChangeInAddColor(e.target.value)}

                      className={`${INPUT} flex-1 font-medium`}

                    >

                      <option value="">-- Sin proveedor específico (Heredar del modelo) --</option>

                      {listaProveedores.map(p => {

                        const isPrimary = p.id === selectedModelForColor.supplierId;

                        const isAlternate = (selectedModelForColor.alternateSupplierIds || []).includes(p.id);

                        return (

                          <option key={p.id} value={p.id}>

                            {p.razonSocial} {p.ruc ? `(${p.ruc})` : ''} {isPrimary ? '[Principal del Modelo]' : isAlternate ? '[Alterno del Modelo]' : ''}

                          </option>

                        );

                      })}

                    </select>

                    <button

                      type="button"

                      onClick={() => { setQsContext('addColor'); setShowQuickSupplier(true); }}

                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl flex items-center gap-1 shrink-0 transition-colors shadow-xs cursor-pointer"

                      title="Registrar nuevo proveedor al vuelo"

                    >

                      <Plus size={13} />

                      <span>Nuevo</span>

                    </button>

                  </div>



                  {newColorSupplierId && (

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">

                      <CheckCircle size={13} className="shrink-0" />

                      <span>

                        Variante vinculada a: <strong>{listaProveedores.find(p => p.id === newColorSupplierId)?.razonSocial || 'Proveedor seleccionado'}</strong>

                      </span>

                    </div>

                  )}

                </div>

              </div>



              {/* Sección 3: Series y Precios para este Color */}

              <div className="space-y-4">

                <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest border-b border-[var(--border)] pb-1.5">

                  3. Series y Precios de Entrega (Costo) y Venta

                </h5>

                <p className="text-[10px] text-[var(--muted-foreground)] -mt-2">

                  Activa las series que deseas generar para este nuevo color y asigna el precio de entrega del proveedor y el precio de venta al público.

                </p>



                <div className="space-y-3">

                  {series.map(s => {

                    const isActive = newColorSerieIds.includes(s.id);

                    const prices = newColorSeriesPrices[s.id] || { costPrice: "", salePrice: "" };

                    const selectedTallaIds = newColorCustomTallas[s.id] || [];



                    return (

                      <div key={s.id} className={`rounded-xl border transition-all overflow-hidden ${

                        isActive

                          ? "border-[#0F172A] bg-[#0F172A]/5 shadow-sm"

                          : "border-[var(--border)] bg-[var(--card)] opacity-70 hover:opacity-100"

                      }`}>

                        {/* Toggle Header */}

                        <div className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/30">

                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleNewColorSerie(s.id)}>

                            <div className={`w-10 h-5 rounded-full relative transition-colors ${

                              isActive ? "bg-[#0F172A]" : "bg-[var(--border)]"

                            }`}>

                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${

                                isActive ? "translate-x-5" : "translate-x-0.5"

                              }`} />

                            </div>

                            <span className={`text-sm font-bold ${

                              isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"

                            }`}>{getNombreSerie(s, series)}</span>

                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">({s.nombre})</span>

                          </div>



                          {isActive && (

                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">ACTIVA</span>

                          )}

                        </div>



                        {/* Inputs de Precio */}

                        {isActive && (() => {

                          const costVal = parseDecimalNumber(prices.costPrice);

                          const saleVal = parseDecimalNumber(prices.salePrice);

                          const hasCost = !isNaN(costVal) && costVal > 0;

                          const hasSale = !isNaN(saleVal) && saleVal > 0;

                          const suggestedSale = hasCost ? calculateSuggestedPrice(costVal, marginPct).toFixed(2) : "";

                          const isLoss = hasCost && hasSale && saleVal < costVal;

                          const marginPercent = hasCost && hasSale ? calculateRealMarginPercent(costVal, saleVal) : 0;

                          const profitAmount = hasCost && hasSale ? calculateProfitAmount(costVal, saleVal) : 0;

                          const suggestedProfit = hasCost && suggestedSale ? (parseFloat(suggestedSale) - costVal).toFixed(2) : "0.00";



                          return (

                            <div className="px-4 pb-4 pt-3 space-y-3">

                              <div className="grid grid-cols-2 gap-3">

                                <div>

                                  <Lbl t="Precio Entrega Proveedor ($)" req />

                                  <input type="text" inputMode="decimal"

                                    value={prices.costPrice}

                                    onChange={e => {

                                      const val = normalizeDecimalInput(e.target.value);

                                      setNewColorSeriesPrices(prev => ({

                                        ...prev,

                                        [s.id]: { ...prev[s.id], costPrice: val }

                                      }));

                                    }}

                                    placeholder="0.00" className={INPUT} />

                                </div>

                                <div>

                                  <div className="flex items-center justify-between">

                                    <Lbl t="Precio de Venta ($)" req />

                                    {hasCost && suggestedSale && (

                                      <button

                                        type="button"

                                        onClick={() => setNewColorSeriesPrices(prev => ({

                                          ...prev,

                                          [s.id]: { ...prev[s.id], salePrice: suggestedSale }

                                        }))}

                                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"

                                        title="Auto-asignar precio sugerido con margen de ganancia"

                                      >

                                        Auto: ${suggestedSale}

                                      </button>

                                    )}

                                  </div>

                                  <input type="text" inputMode="decimal"

                                    value={prices.salePrice}

                                    onChange={e => {

                                      const val = normalizeDecimalInput(e.target.value);

                                      setNewColorSeriesPrices(prev => ({

                                        ...prev,

                                        [s.id]: { ...prev[s.id], salePrice: val }

                                      }));

                                    }}

                                    placeholder={suggestedSale ? `$${suggestedSale} (${marginPct}% margen)` : "0.00"}

                                    className={`${INPUT} ${isLoss ? "border-red-500 text-red-500 bg-red-500/5" : ""}`} />

                                </div>

                              </div>



                              {/* Indicadores de Ganancia */}

                              {hasCost && (

                                <div className="text-[11px] font-semibold pt-1">

                                  {hasSale ? (

                                    isLoss ? (

                                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-1.5">

                                        <AlertCircle size={14} className="shrink-0 animate-bounce" />

                                        <span>Venta menor al costo: Margen {marginPercent.toFixed(1)}% (Pérdida de -${Math.abs(profitAmount).toFixed(2)}/par)</span>

                                      </div>

                                    ) : (

                                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center gap-1.5">

                                        <CheckCircle size={14} className="shrink-0" />

                                        <span>Margen de ganancia: <strong className="font-extrabold">{marginPercent.toFixed(1)}%</strong> (+${profitAmount.toFixed(2)} de utilidad por par)</span>

                                      </div>

                                    )

                                  ) : (

                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-lg flex items-center gap-1.5">

                                      <DollarSign size={14} className="shrink-0" />

                                      <span>Precio sugerido ({marginPct}% margen): <strong className="font-extrabold">${suggestedSale}</strong> (Ganancia estimada: +${suggestedProfit}/par)</span>

                                    </div>

                                  )}

                                </div>

                              )}



                              {/* Componente de Curva de Tallas con Steppers */}

                              <div className="pt-2 border-t border-[var(--border)]/40 space-y-2.5">

                                <div className="flex items-center justify-between">

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">

                                    Serie: {getNombreSerie(s, series).toUpperCase()}

                                  </span>

                                  <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">

                                    = {selectedTallaIds.length} pares total

                                  </span>

                                </div>



                                {/* Steppers por talla */}

                                <div className="flex flex-wrap gap-2">

                                  {[...(s.tallas || [])].sort((a, b) => a.numero - b.numero).map(t => {

                                    const count = selectedTallaIds.filter(id => id === t.id).length;

                                    return (

                                      <div key={t.id} className="flex items-center gap-0 bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-1 py-0.5">

                                        <span className="text-xs font-black text-[var(--foreground)] px-1.5 w-9 text-center">T{t.numero}</span>

                                        <button type="button"

                                          onClick={() => removeOneTallaInNewColorSerie(s.id, t.id)}

                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-sm font-bold transition-colors"

                                        >−</button>

                                        <span className="w-8 text-center text-sm font-extrabold text-[var(--foreground)]">{count}</span>

                                        <button type="button"

                                          onClick={() => addTallaRepeatInNewColorSerie(s.id, t.id)}

                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-sm font-bold transition-colors"

                                        >+</button>

                                      </div>

                                    );

                                  })}

                                </div>



                                {/* Total de pares y botón para restablecer docena estándar */}

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)]/30">

                                  <div className="flex items-center gap-2">

                                    <span className="text-[11px] font-bold text-[var(--foreground)] font-mono">

                                      = {selectedTallaIds.length} pares total ({getDocenaLabelExt(selectedTallaIds.length)})

                                    </span>

                                    {selectedTallaIds.length !== 12 && (

                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">

                                        Una docena estándar suma 12 pares

                                      </span>

                                    )}

                                  </div>

                                  <button

                                    type="button"

                                    onClick={() => restablecerDocenaEstandarEnNuevoColor(s.id)}

                                    className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"

                                    title="Restablecer curva base estándar (38 al 42 con 39 y 40 repetidos = 12 pares)"

                                  >

                                    <RefreshCw size={11} />

                                    <span>Restablecer estándar (38-42)</span>

                                  </button>

                                </div>



                                {/* Selección de Stock Inicial para Bodega */}

                                <div className="space-y-1.5 pt-2 border-t border-[var(--border)]/40">

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">

                                    Stock Inicial en Bodega para esta variante:

                                  </span>

                                  <div className="flex flex-wrap gap-2">

                                    <button type="button" onClick={() => aplicarCurvaEnNuevoColor(s.id, 'DOCENA')}

                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${

                                        (newColorStockOption[s.id] || 'DOCENA') === 'DOCENA'

                                          ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"

                                          : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 text-[var(--foreground)]"

                                      }`}

                                    >

                                      {(newColorStockOption[s.id] || 'DOCENA') === 'DOCENA' && <Check size={13} />}

                                      1 Docena en Bodega (12 pares según serie de arriba)

                                    </button>

                                    <button type="button" onClick={() => aplicarCurvaEnNuevoColor(s.id, 'NINGUNA')}

                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${

                                        newColorStockOption[s.id] === 'NINGUNA'

                                          ? "border-slate-600 bg-slate-700 text-white shadow-xs"

                                          : "border-slate-300 dark:border-slate-700 bg-[var(--card)] hover:bg-rose-500/10 text-rose-600"

                                      }`}

                                    >

                                      {newColorStockOption[s.id] === 'NINGUNA' && <Check size={13} />}

                                      Sin Stock Inicial (0 pares, solo catálogo para pedidos)

                                    </button>

                                  </div>

                                </div>

                              </div>

                            </div>

                          );

                        })()}

                      </div>

                    );

                  })}

                </div>



                <div className="bg-[var(--muted)]/20 border border-[var(--border)] p-3.5 sm:p-4 rounded-2xl space-y-3">

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)]/40 pb-2.5">

                    <div className="flex items-center gap-2">

                      <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">

                        <PackageCheck size={18} />

                      </div>

                      <div>

                        <h6 className="text-xs font-black text-[var(--foreground)] uppercase tracking-wider">

                          Stock Inicial por Talla y Curva

                        </h6>

                        <p className="text-[10px] text-[var(--muted-foreground)]">

                          Selecciona el tipo de curva deseada para cada serie o aplica a todas

                        </p>

                      </div>

                    </div>



                    {newColorSerieIds.length > 0 && (

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">

                        <span className="text-[10px] font-bold text-[var(--muted-foreground)] mr-1">Aplicar a todas:</span>

                        <button type="button" onClick={() => aplicarCurvaATodasEnNuevoColor('MEDIA_A')} className="px-2 py-0.5 text-[9px] font-bold rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 cursor-pointer">Media A (6)</button>

                        <button type="button" onClick={() => aplicarCurvaATodasEnNuevoColor('MEDIA_B')} className="px-2 py-0.5 text-[9px] font-bold rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 cursor-pointer">Media B (6)</button>

                        <button type="button" onClick={() => aplicarCurvaATodasEnNuevoColor('DOCENA')} className="px-2 py-0.5 text-[9px] font-bold rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 cursor-pointer">1 Docena (12)</button>

                        <button type="button" onClick={() => aplicarCurvaATodasEnNuevoColor('NINGUNA')} className="px-2 py-0.5 text-[9px] font-bold rounded-md border border-slate-500/30 bg-slate-500/10 text-slate-700 hover:bg-slate-500/20 cursor-pointer">Sin Stock (0)</button>

                      </div>

                    )}

                  </div>



                  {(() => {

                    const totalParesLote = Object.values(newColorCustomTallas).reduce((sum, arr) => sum + (arr?.length || 0), 0);

                    return (

                      <div className="flex items-center gap-2.5 p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">

                        {totalParesLote > 0 ? (

                          <>

                            <CheckCircle size={16} className="text-emerald-500 shrink-0" />

                            <div className="text-xs text-[var(--foreground)] leading-relaxed">

                              Se creará un stock inicial de <strong className="font-extrabold text-emerald-600">{totalParesLote} pares</strong> <span className="font-semibold text-[var(--muted-foreground)]">({getDocenaLabelExt(totalParesLote)})</span> para este nuevo color.

                            </div>

                          </>

                        ) : (

                          <>

                            <Info size={16} className="text-slate-400 shrink-0" />

                            <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">

                              <strong className="font-bold text-[var(--foreground)]">Sin stock inicial (0 pares):</strong> Se registrará la variante en el catálogo sin unidades físicas.

                            </div>

                          </>

                        )}

                      </div>

                    );

                  })()}

                </div>

              </div>



              {error && (

                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">

                  <AlertCircle size={14} /> {error}

                </div>

              )}

              </div>



              {/* Pie del Modal Estandarizado */}

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">

                <button

                  type="button"

                  onClick={() => { setShowAddColorModal(false); setSelectedModelForColor(null); }}

                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"

                >

                  Cancelar

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"

                >

                  {saving ? (

                    <><Loader2 size={15} className="animate-spin" /><span>Añadiendo nuevo color...</span></>

                  ) : (

                    <><Palette size={15} /><span>Añadir Color al Modelo</span></>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* MODAL PRECIOS */}

      {showPrice && priceProd && (

        <div

          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"

          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowPrice(false); setPriceProd(null); }, isDirtyPrice()); }}

          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowPrice(false); setPriceProd(null); }, isDirtyPrice()); }}

        >

          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-md h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">

              <div className="flex items-center gap-3">

                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">

                  <DollarSign size={20} />

                </div>

                <div>

                  <h3 className="font-extrabold text-base text-white">Actualizar Precios</h3>

                  <p className="text-[11px] text-slate-300 mt-0.5">{priceProd.nombre} · Color {priceProd.color} · Tallas {getNombreSerie(priceProd.serie?.nombre ?? "")}</p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => { setShowPrice(false); setPriceProd(null); }}

                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"

                title="Cerrar ventana"

              >

                <X size={18} />

              </button>

            </div>

            <form onSubmit={handleUpdatePrice} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <Lbl t="Precio de Costo ($)" req />

                    <input type="text" inputMode="decimal" value={newCosto} onChange={e => setNewCosto(normalizeDecimalInput(e.target.value))} placeholder="0.00" className={INPUT} />

                  </div>

                  <div>

                    <Lbl t="Precio de Venta ($)" req />

                    <input type="text" inputMode="decimal" value={newVenta} onChange={e => setNewVenta(normalizeDecimalInput(e.target.value))} placeholder="0.00" className={INPUT} />

                  </div>

                </div>



                {/* Recomendación y Margen de Rentabilidad */}

                {(() => {

                  const c = parseDecimalNumber(newCosto);

                  const v = parseDecimalNumber(newVenta);

                  const rec20 = c > 0 ? (c * 1.20).toFixed(2) : "0.00";

                  const diff = v - c;

                  const pct = c > 0 ? ((diff / c) * 100).toFixed(1) : "0";

                  const esPerdida = c > 0 && v < c;



                  return (

                    <div className="space-y-3">

                      <div className="flex items-center justify-between p-3 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)] text-xs">

                        <div>

                          <span className="text-[var(--muted-foreground)]">Recomendación (+20% mínimo): </span>

                          <span className="font-bold text-emerald-500">${rec20}</span>

                        </div>

                        <button

                          type="button"

                          onClick={() => setNewVenta(rec20)}

                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold rounded-lg text-[10px] transition-colors"

                        >

                          Aplicar +20%

                        </button>

                      </div>



                      {c > 0 && (

                        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${

                          esPerdida

                            ? "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse font-bold"

                            : parseFloat(pct) >= 20

                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-semibold"

                            : "bg-amber-500/10 border-amber-500/20 text-amber-500 font-semibold"

                        }`}>

                          <div>

                            {esPerdida ? "PÉRDIDA DETECTADA" : "Ganancia Estimada:"}

                          </div>

                          <div>

                            ${diff.toFixed(2)} ({pct}%)

                          </div>

                        </div>

                      )}



                      {esPerdida && (

                        <div className="p-3 bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs rounded-xl font-bold flex items-center gap-2">

                          <AlertCircle size={16} className="shrink-0 text-rose-500 animate-bounce" />

                          <span>¡ALERTA ROJA! El precio de venta es MENOR al costo de compra. Estás vendiendo a pérdida.</span>

                        </div>

                      )}

                    </div>

                  );

                })()}



                <div><Lbl t="Motivo (opcional)" /><input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Ajuste de temporada..." className={INPUT} /></div>

                {error && (

                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">

                    <AlertCircle size={14} /> {error}

                  </div>

                )}

              </div>



              {/* Pie del Modal Estandarizado */}

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">

                <button

                  type="button"

                  onClick={() => { setShowPrice(false); setPriceProd(null); }}

                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"

                >

                  Cancelar

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"

                >

                  {saving ? <><Loader2 size={15} className="animate-spin" /><span>Guardando...</span></> : <><DollarSign size={15} /><span>Actualizar Precios</span></>}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* ── MODAL CREAR SERIE PERSONALIZADA ── */}

      {showCreateSeriesModal && (

        <div

          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"

          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowCreateSeriesModal(false), isDirtyCreateSeries()); }}

          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowCreateSeriesModal(false), isDirtyCreateSeries()); }}

        >

          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-md h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">

            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">

              <div className="flex items-center gap-3">

                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">

                  <Layers size={20} />

                </div>

                <div>

                  <h3 className="font-extrabold text-base text-white">Crear Nueva Serie</h3>

                  <p className="text-[11px] text-slate-300 mt-0.5">Define un nombre y rango de tallas para la serie (ej: CHINO, 35-40)</p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => setShowCreateSeriesModal(false)}

                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"

                title="Cerrar ventana"

              >

                <X size={18} />

              </button>

            </div>

            <form onSubmit={handleCreateSeriesWithTallas} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">

                <div>

                  <Lbl t="Nombre de la Serie" req />

                  <input type="text" value={newSerieNombre} onChange={e => setNewSerieNombre(e.target.value)}

                    placeholder="Ej. CHINO, ESPECIAL, DAMA..." className={INPUT} required />

                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <Lbl t="Talla Desde" req />

                    <input type="number" min="1" max="60" value={newSerieTallasDesde}

                      onChange={e => setNewSerieTallasDesde(e.target.value)} className={INPUT} required />

                  </div>

                  <div>

                    <Lbl t="Talla Hasta" req />

                    <input type="number" min="1" max="60" value={newSerieTallasHasta}

                      onChange={e => setNewSerieTallasHasta(e.target.value)} className={INPUT} required />

                  </div>

                </div>

                {error && (

                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">

                    <AlertCircle size={14} /> {error}

                  </div>

                )}

              </div>

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">

                <button

                  type="button"

                  onClick={() => setShowCreateSeriesModal(false)}

                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"

                >

                  Cancelar

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"

                >

                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}

                  <span>Crear Serie</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* ── MODAL EDITAR SERIE EXISTENTE ── */}

      {showEditSeriesModal && editingSerie && (

        <div

          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"

          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowEditSeriesModal(false), isDirtyEditSeries()); }}

          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowEditSeriesModal(false), isDirtyEditSeries()); }}

        >

          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-md h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">

              <div className="flex items-center gap-3">

                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-amber-400 font-bold shrink-0">

                  <Layers size={20} />

                </div>

                <div>

                  <h3 className="font-extrabold text-base text-white">Editar Serie "{editingSerie.nombre}"</h3>

                  <p className="text-[11px] text-slate-300 mt-0.5">Modifica el nombre o rango de tallas configurado</p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => { setShowEditSeriesModal(false); setEditingSerie(null); }}

                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"

                title="Cerrar ventana"

              >

                <X size={18} />

              </button>

            </div>

            <form onSubmit={handleUpdateSeries} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">

                  <span className="text-base shrink-0">⚠️</span>

                  <div>

                    <strong className="block font-bold">Plantilla Maestra Global:</strong>

                    <span>Modificar el rango de tallas de esta serie afectará a todos los modelos que utilicen esta misma serie. Si solo deseas una curva de tallas distinta para un calzado en particular, ajusta las cantidades directamente en el modelo con los botones (+) y (−) sin modificar la serie global, o crea una nueva serie independiente (ej: Adulto 38-42).</span>

                  </div>

                </div>

                <div>

                  <Lbl t="Nombre de la Serie" req />

                  <input type="text" value={editSerieNombre} onChange={e => setEditSerieNombre(e.target.value)}

                    className={INPUT} required />

                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <Lbl t="Talla Desde" req />

                    <input type="number" min="1" max="60" value={editSerieTallasDesde}

                      onChange={e => setEditSerieTallasDesde(e.target.value)} className={INPUT} required />

                  </div>

                  <div>

                    <Lbl t="Talla Hasta" req />

                    <input type="number" min="1" max="60" value={editSerieTallasHasta}

                      onChange={e => setEditSerieTallasHasta(e.target.value)} className={INPUT} required />

                  </div>

                </div>

                {error && (

                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">

                    <AlertCircle size={14} /> {error}

                  </div>

                )}

              </div>

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">

                <button

                  type="button"

                  onClick={() => { setShowEditSeriesModal(false); setEditingSerie(null); }}

                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"

                >

                  Cancelar

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"

                >

                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Edit2 size={15} />}

                  <span>Guardar Cambios</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* ── MODAL EDITAR VARIANTE INTEGRAL ── */}

      {showEditProduct && editProduct && (

        <div

          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"

          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowEditProduct(false); setEditProduct(null); }, isDirtyEditProduct()); }}

          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowEditProduct(false); setEditProduct(null); }, isDirtyEditProduct()); }}

        >

          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">

              <div className="flex items-center gap-3">

                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">

                  <Boxes size={20} />

                </div>

                <div>

                  <h3 className="font-extrabold text-base text-white">Editar Variante de Calzado</h3>

                  <p className="text-[11px] text-slate-300 mt-0.5">

                    {editProduct.codigo} · Modifica color, serie, numeración, stock y precios

                  </p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => { setShowEditProduct(false); setEditProduct(null); }}

                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"

                title="Cerrar ventana"

              >

                <X size={18} />

              </button>

            </div>

            <form onSubmit={handleUpdateProduct} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">

              {error && (

                <div className="flex items-start justify-between gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs rounded-2xl font-bold animate-in fade-in duration-150">

                  <div className="flex items-start gap-2">

                    <AlertCircle size={16} className="shrink-0 mt-0.5" />

                    <span>{error}</span>

                  </div>

                  <button type="button" onClick={() => setError("")} className="text-red-400 hover:text-red-600 p-0.5 rounded cursor-pointer">

                    <X size={14} />

                  </button>

                </div>

              )}



              {/* Imagen */}

              <div>

                <Lbl t="Imagen del Producto" />

                <div className="flex items-center gap-4">

                  <div className="w-20 h-20 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl flex items-center justify-center overflow-hidden shrink-0">

                    {editProductImage ? (

                      <img src={editProductImage} alt="Preview" className="w-full h-full object-cover" />

                    ) : (

                      <ImageIcon size={24} className="text-[var(--muted-foreground)] opacity-40" />

                    )}

                  </div>

                  <div className="flex-1 space-y-2">

                    <label className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 text-blue-600 border border-blue-600/20 rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-600/20 transition-colors">

                      <ImageIcon size={14} />

                      <span>Cambiar Imagen</span>

                      <input type="file" accept="image/*" onChange={handleEditProductFoto} className="hidden" />

                    </label>

                    {editProductImage && (

                      <button type="button" onClick={() => { setEditProductImage(null); setEditProductImageChanged(true); }}

                        className="text-xs text-red-500 hover:underline">

                        Quitar imagen

                      </button>

                    )}

                  </div>

                </div>

              </div>



              {/* Color */}

              <div>

                <Lbl t="Color" req />

                <input type="text" value={editProductColor} onChange={e => setEditProductColor(e.target.value)}

                  className={INPUT} required placeholder="Ej: Negro, Café, Miel..." />

              </div>



              {/* Proveedor Fabricante de la Variante */}

              <div className="space-y-2 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl p-3.5">

                <div className="flex items-center justify-between">

                  <Lbl t="Proveedor Fabricante" />

                  <span className="text-[10px] text-[var(--muted-foreground)]">Asignación por variante</span>

                </div>

                <select

                  value={editProductSupplierId}

                  onChange={(e) => handleSupplierChangeInEditProduct(e.target.value)}

                  className={INPUT}

                >

                  <option value="">-- Proveedor por defecto del modelo --</option>

                  {listaProveedores.map((prov) => {

                    const sigla = generarSiglaProveedor(prov.razonSocial);

                    return (

                      <option key={prov.id} value={prov.id}>

                        {prov.razonSocial} {sigla ? `[${sigla}]` : ''} {prov.contacto ? `· Contacto: ${prov.contacto}` : ''}

                      </option>

                    );

                  })}

                </select>

                {editProductSupplierId && (() => {

                  const selSup = listaProveedores.find(p => p.id === editProductSupplierId);

                  const sigla = selSup ? generarSiglaProveedor(selSup.razonSocial) : '';

                  return (

                    <div className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">

                      <Truck size={12} className="shrink-0" />

                      <span>Proveedor: <strong>{selSup?.razonSocial}</strong></span>

                      {sigla && <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded text-[9px] font-mono font-black">{sigla}</span>}

                    </div>

                  );

                })()}

              </div>



                {/* Sección 3: Serie y Precios de esta Variante */}

              <div className="space-y-4">

                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">

                  <h5 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-widest">

                    3. Serie, Precios y Stock de esta Variante

                  </h5>

                </div>



                {/* Banner informativo para gestionar otras series */}

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-blue-700 dark:text-blue-300">

                  <div className="flex items-center gap-2">

                    <Info size={15} className="shrink-0" />

                    <span className="text-[11px] leading-snug">

                      Esta ventana edita únicamente esta variante. Para activar o agregar otras series (Adulto, Juvenil, etc.) para este taller, usa el Gestor de Series.

                    </span>

                  </div>

                  {supplierSeriesTargetModel && editProduct && (

                    <button

                      type="button"

                      onClick={() => {

                        setShowEditProduct(false);

                        openEditSupplierSeries(editProduct, supplierSeriesTargetModel);

                      }}

                      className="px-2.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500 text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1"

                    >

                      <Layers size={12} />

                      <span>Gestionar Series</span>

                    </button>

                  )}

                </div>



                <div className="space-y-3">

                  {(() => {

                    const currentVariantSerie = series.find(s => s.id === editProductSerieId) || (series.length > 0 ? series[0] : null);

                    const displaySeries = currentVariantSerie ? [currentVariantSerie] : series;



                    return displaySeries.map(s => {

                      const isActive = true;

                      const prices = supplierSeriesPrices[s.id] || { costPrice: "", salePrice: "" };

                      const selectedTallaIds = supplierSeriesCustomTallas[s.id] || [];



                      return (

                        <div

                          key={s.id}

                          className="rounded-xl border border-[#0F172A] bg-[#0F172A]/5 dark:border-white/20 dark:bg-white/5 shadow-sm overflow-hidden"

                        >

                          {/* Header de la Serie Actual */}

                          <div className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/30">

                            <div className="flex items-center gap-2">

                              <span className="text-sm font-extrabold text-[var(--foreground)]">

                                {getNombreSerie(s, series)}

                              </span>

                              <span className="text-[10px] text-[var(--muted-foreground)] font-mono">

                                ({s.nombre})

                              </span>

                            </div>

                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">

                              SERIE DE ESTA VARIANTE

                            </span>

                          </div>



                          {/* Detalle si la serie está activa */}

                          {isActive && (() => {

                          const costVal = parseDecimalNumber(prices.costPrice);

                          const saleVal = parseDecimalNumber(prices.salePrice);

                          const hasCost = !isNaN(costVal) && costVal > 0;

                          const hasSale = !isNaN(saleVal) && saleVal > 0;

                          const suggestedSale = hasCost ? calculateSuggestedPrice(costVal, marginPct).toFixed(2) : "";

                          const isLoss = hasCost && hasSale && saleVal < costVal;

                          const marginPercent = hasCost && hasSale ? calculateRealMarginPercent(costVal, saleVal) : 0;

                          const profitAmount = hasCost && hasSale ? calculateProfitAmount(costVal, saleVal) : 0;

                          const suggestedProfit = hasCost && suggestedSale ? (parseFloat(suggestedSale) - costVal).toFixed(2) : "0.00";



                          return (

                            <div className="px-4 pb-4 pt-3 space-y-3">

                              {/* Inputs de Precio */}

                              <div className="grid grid-cols-2 gap-3">

                                <div>

                                  <Lbl t="Precio de Compra ($)" req />

                                  <input

                                    type="text"

                                    inputMode="decimal"

                                    value={prices.costPrice}

                                    onChange={e => {

                                      const val = normalizeDecimalInput(e.target.value);

                                      setSupplierSeriesPrices(prev => ({

                                        ...prev,

                                        [s.id]: { ...prev[s.id], costPrice: val }

                                      }));

                                    }}

                                    placeholder="0.00"

                                    className={INPUT}

                                  />

                                </div>

                                <div>

                                  <div className="flex items-center justify-between">

                                    <Lbl t="Precio de Venta ($)" req />

                                    {hasCost && suggestedSale && (

                                      <button

                                        type="button"

                                        onClick={() => {

                                          setSupplierSeriesPrices(prev => ({

                                            ...prev,

                                            [s.id]: { ...prev[s.id], salePrice: suggestedSale }

                                          }));

                                        }}

                                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"

                                        title="Auto-asignar precio sugerido con margen de ganancia"

                                      >

                                        Auto: ${suggestedSale}

                                      </button>

                                    )}

                                  </div>

                                  <input

                                    type="text"

                                    inputMode="decimal"

                                    value={prices.salePrice}

                                    onChange={e => {

                                      const val = normalizeDecimalInput(e.target.value);

                                      setSupplierSeriesPrices(prev => ({

                                        ...prev,

                                        [s.id]: { ...prev[s.id], salePrice: val }

                                      }));

                                    }}

                                    placeholder={suggestedSale ? `$${suggestedSale} (${marginPct}% margen)` : "0.00"}

                                    className={`${INPUT} ${isLoss ? "border-red-500 text-red-500 bg-red-500/5" : ""}`}

                                  />

                                </div>

                              </div>



                              {/* Indicador de Margen Configurable */}

                              {hasCost && (

                                <div className="text-[11px] font-semibold">

                                  {hasSale ? (

                                    isLoss ? (

                                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-1.5">

                                        <AlertCircle size={14} className="shrink-0 animate-bounce" />

                                        <span>Venta menor al costo: Margen {marginPercent.toFixed(1)}% (Pérdida de -${Math.abs(profitAmount).toFixed(2)}/par)</span>

                                      </div>

                                    ) : (

                                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center gap-1.5">

                                        <CheckCircle size={14} className="shrink-0" />

                                        <span>Margen de ganancia: <strong className="font-extrabold">{marginPercent.toFixed(1)}%</strong> (+${profitAmount.toFixed(2)} de utilidad por par)</span>

                                      </div>

                                    )

                                  ) : (

                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-lg flex items-center gap-1.5">

                                      <DollarSign size={14} className="shrink-0" />

                                      <span>Precio sugerido ({marginPct}% margen): <strong className="font-extrabold">${suggestedSale}</strong> (Ganancia estimada: +${suggestedProfit}/par)</span>

                                    </div>

                                  )}

                                </div>

                              )}



                              {/* Componente de Curva de Tallas con Steppers */}

                              <div className="pt-2 border-t border-[var(--border)]/40 space-y-2.5">

                                <div className="flex items-center justify-between">

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">

                                    Serie: {getNombreSerie(s, series).toUpperCase()}

                                  </span>

                                  <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">

                                    = {selectedTallaIds.length} pares total

                                  </span>

                                </div>



                                {/* Steppers por talla */}

                                <div className="flex flex-wrap gap-2">

                                  {s.tallas?.sort((a, b) => a.numero - b.numero).map(t => {

                                    const count = selectedTallaIds.filter(id => id === t.id).length;

                                    return (

                                      <div key={t.id} className="flex items-center gap-0 bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-1 py-0.5">

                                        <span className="text-xs font-black text-[var(--foreground)] px-1.5 w-9 text-center">T{t.numero}</span>

                                        <button

                                          type="button"

                                          onClick={() => removeOneTallaInSupplierSeries(s.id, t.id)}

                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-sm font-bold transition-colors cursor-pointer"

                                        >−</button>

                                        <span className="w-8 text-center text-sm font-extrabold text-[var(--foreground)]">{count}</span>

                                        <button

                                          type="button"

                                          onClick={() => addTallaRepeatInSupplierSeries(s.id, t.id)}

                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-sm font-bold transition-colors cursor-pointer"

                                        >+</button>

                                      </div>

                                    );

                                  })}

                                </div>



                                {/* Total de pares y botón para restablecer docena estándar */}

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)]/30">

                                  <div className="flex items-center gap-2">

                                    <span className="text-[11px] font-bold text-[var(--foreground)] font-mono">

                                      = {selectedTallaIds.length} pares total ({getDocenaLabelExt(selectedTallaIds.length)})

                                    </span>

                                    {selectedTallaIds.length !== 12 && (

                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">

                                        Una docena estándar suma 12 pares

                                      </span>

                                    )}

                                  </div>

                                  {(() => {

                                    const tallasSorted = (s.tallas || []).slice().sort((a, b) => a.numero - b.numero);

                                    const minTalla = tallasSorted[0]?.numero;

                                    const maxTalla = tallasSorted[tallasSorted.length - 1]?.numero;

                                    const rangoTexto = minTalla && maxTalla ? `${minTalla}-${maxTalla}` : 'estándar';

                                    return (

                                      <button

                                        type="button"

                                        onClick={() => restablecerDocenaEstandarEnSupplierSeries(s.id)}

                                        className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"

                                        title={`Reemplazar y dejar exactamente 1 docena base (${rangoTexto} = 12 pares)`}

                                      >

                                        <RefreshCw size={11} />

                                        <span>Restablecer estándar ({rangoTexto})</span>

                                      </button>

                                    );

                                  })()}

                                </div>



                                {/* Selección de Stock en Bodega */}

                                <div className="space-y-1.5 pt-2 border-t border-[var(--border)]/40">

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">

                                    Stock en Bodega para esta variante:

                                  </span>

                                  <div className="flex flex-wrap gap-2">

                                    <button

                                      type="button"

                                      onClick={() => aplicarCurvaEnSupplierSeries(s.id, 'DOCENA')}

                                      className="px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 active:scale-95 shadow-xs"

                                      title="Suma 1 docena completa (12 pares distribuidos según la serie) al stock actual"

                                    >

                                      <Plus size={13} />

                                      <span>1 Docena en Bodega (+12 pares según serie)</span>

                                    </button>

                                    <button

                                      type="button"

                                      onClick={() => aplicarCurvaEnSupplierSeries(s.id, 'NINGUNA')}

                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${

                                        selectedTallaIds.length === 0

                                          ? "border-slate-600 bg-slate-700 text-white shadow-xs"

                                          : "border-slate-300 dark:border-slate-700 bg-[var(--card)] hover:bg-rose-500/10 text-rose-600"

                                      }`}

                                    >

                                      {selectedTallaIds.length === 0 && <Check size={13} />}

                                      Sin Stock (0 pares, solo catálogo para pedidos)

                                    </button>

                                  </div>

                                </div>

                              </div>

                            </div>

                          );

                        })()}

                      </div>

                    );

                  });

                  })()}

                </div>

              </div>



              {error && (

                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">

                  <AlertCircle size={14} /> {error}

                </div>

              )}

              </div>



              {/* Pie del Modal Estandarizado */}

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">

                <button

                  type="button"

                  onClick={() => { setShowEditProduct(false); setEditProduct(null); }}

                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"

                >

                  Cancelar

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"

                >

                  {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}

                  <span>Guardar Cambios</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* ── MODAL EDITAR MODELO BASE ── */}

      {showEditModel && editModel && (

        <div

          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"

          onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowEditModel(false); setEditModel(null); }, isDirtyEditModel()); }}

          onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => { setShowEditModel(false); setEditModel(null); }, isDirtyEditModel()); }}

        >

          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">

              <div className="flex items-center gap-3">

                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-blue-400 font-bold shrink-0">

                  <Edit3 size={20} />

                </div>

                <div>

                  <h3 className="font-extrabold text-base text-white">Editar Modelo Base</h3>

                  <p className="text-[11px] text-slate-300 mt-0.5">Modifica los datos base del modelo y sus series configuradas</p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => { setShowEditModel(false); setEditModel(null); }}

                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"

                title="Cerrar ventana"

              >

                <X size={18} />

              </button>

            </div>

            <form onSubmit={handleUpdateModel} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">

              <div>

                <Lbl t="Nombre del Modelo" req />

                <input type="text" value={editModelName} onChange={e => setEditModelName(e.target.value)}

                  className={INPUT} required placeholder="Ej: Botín Chelsea" />

              </div>

              <div>

                <Lbl t="Marca" req />

                <input type="text" value={editModelBrand} onChange={e => setEditModelBrand(e.target.value)}

                  className={INPUT} required placeholder="Ej: NEXORA" />

              </div>

              <div>

                <Lbl t="Código Base" req />

                <input type="text" value={editModelBaseCode} onChange={e => setEditModelBaseCode(e.target.value)}

                  className={INPUT} required placeholder="Ej: BCH-001" />

              </div>

              <div>

                <Lbl t="Material (Opcional)" />

                <input type="text" value={editModelMaterial} onChange={e => setEditModelMaterial(e.target.value)}

                  className={INPUT} placeholder="Ej: Cuero genuino" />

              </div>



              {/* ── Proveedor Principal ── */}

              <div>

                <Lbl t="Proveedor Principal" />

                <div className="flex gap-2">

                  <select

                    value={editModelSupplierId}

                    onChange={e => {

                      const newPrincipal = e.target.value;

                      const oldPrincipal = editModelSupplierId;

                      setEditModelSupplierId(newPrincipal);

                      setEditModelAlternateIds(prev => {

                        let updated = [...prev];

                        // Si el nuevo principal estaba en los alternos, removerlo de alternos

                        if (newPrincipal) {

                          updated = updated.filter(id => id !== newPrincipal);

                        }

                        // Si había un principal previo y es distinto al nuevo, pasa automáticamente a ser alterno para no perderlo

                        if (oldPrincipal && oldPrincipal !== newPrincipal && !updated.includes(oldPrincipal)) {

                          updated.push(oldPrincipal);

                        }

                        return updated;

                      });



                      // Conmutar series, precios y tallas correspondientes EXCLUSIVAMENTE al proveedor seleccionado

                      if (editModel) {

                        const nextCfg = getSeriesConfigForSupplier(editModel, newPrincipal || null);

                        setEditModelSerieIds(nextCfg.activeSerieIds);

                        setEditModelSeriesPrices(nextCfg.prices);

                        setEditModelCustomTallas(nextCfg.customTallas);

                      }

                    }}

                    className={`${INPUT} flex-1`}

                  >

                    <option value="">-- Sin Proveedor --</option>

                    {listaProveedores.map(p => (

                      <option key={p.id} value={p.id}>{p.razonSocial} {p.ruc ? `(${p.ruc})` : ''}</option>

                    ))}

                  </select>

                  <button type="button" onClick={() => { setQsContext('edit'); setShowQuickSupplier(true); }}

                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl flex items-center gap-1 shrink-0 transition-colors">

                    <Plus size={12} /><span>Nuevo</span>

                  </button>

                </div>

              </div>



              {/* ── Proveedores Alternos ── */}

              <div>

                <Lbl t="Proveedores Alternos (Suplencia / Alta Demanda)" />

                <div className="flex flex-wrap gap-1.5 mb-2">

                  {editModelAlternateIds.map(altId => {

                    const prov = listaProveedores.find(p => p.id === altId);

                    return prov ? (

                      <span key={altId} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded-lg text-[10px] font-bold">

                        <Truck size={10} />{prov.razonSocial}

                        <button type="button" onClick={() => setEditModelAlternateIds(prev => prev.filter(x => x !== altId))}

                          className="text-rose-500 hover:text-rose-700 ml-0.5"><X size={10} /></button>

                      </span>

                    ) : null;

                  })}

                </div>

                <select value="" onChange={e => {

                  const val = e.target.value;

                  if (val && !editModelAlternateIds.includes(val) && val !== editModelSupplierId) {

                    setEditModelAlternateIds(prev => [...prev, val]);

                  }

                }} className={INPUT}>

                  <option value="">-- Agregar proveedor alterno --</option>

                  {listaProveedores.filter(p => p.id !== editModelSupplierId && !editModelAlternateIds.includes(p.id)).map(p => (

                    <option key={p.id} value={p.id}>{p.razonSocial} {p.ruc ? `(${p.ruc})` : ''}</option>

                  ))}

                </select>

              </div>



              {/* ── Sección: Series y Precios del Modelo ── */}

              <div className="space-y-4 pt-2 border-t border-[var(--border)]">

                <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">

                  <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">Series y Precios del Modelo</h5>

                  <button type="button" onClick={() => { setNewSerieNombre(""); setNewSerieTallasDesde("38"); setNewSerieTallasHasta("43"); setError(""); setShowCreateSeriesModal(true); }}

                    className="flex items-center gap-1 text-[11px] font-bold text-[#0F172A] hover:underline">

                    <Plus size={13} /> <span>Crear Nueva Serie</span>

                  </button>

                </div>

                <p className="text-[10px] text-[var(--muted-foreground)] -mt-2">

                  Modifica las series asignadas al modelo, sus precios de compra y venta, y su distribución de curva de tallas.

                </p>



                <div className="space-y-3">

                  {series.map(s => {

                    const isActive = editModelSerieIds.includes(s.id);

                    const prices = editModelSeriesPrices[s.id] || { costPrice: "", salePrice: "" };

                    const selectedTallaIds = editModelCustomTallas[s.id] || [];



                    return (

                      <div key={s.id} className={`rounded-xl border transition-all overflow-hidden ${

                        isActive

                          ? "border-[#0F172A] bg-[#0F172A]/5 shadow-sm"

                          : "border-[var(--border)] bg-[var(--card)] opacity-70 hover:opacity-100"

                      }`}>

                        {/* Toggle Header */}

                        <div className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/30">

                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleEditModelSerie(s.id)}>

                            <div className={`w-10 h-5 rounded-full relative transition-colors ${

                              isActive ? "bg-[#0F172A]" : "bg-[var(--border)]"

                            }`}>

                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${

                                isActive ? "translate-x-5" : "translate-x-0.5"

                              }`} />

                            </div>

                            <span className={`text-sm font-bold ${

                              isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"

                            }`}>{getNombreSerie(s, series)}</span>

                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">({s.nombre})</span>

                          </div>



                          <div className="flex items-center gap-2">

                            <button type="button" onClick={() => openEditSeriesModal(s)}

                              className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--muted)]/50 transition-colors flex items-center gap-1 text-[11px] font-semibold"

                              title="Editar rango o nombre de esta serie">

                              <Edit2 size={13} />

                              <span>Editar</span>

                            </button>

                            {isActive && (

                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">ACTIVA</span>

                            )}

                          </div>

                        </div>



                        {/* Detalle si la serie está activa */}

                        {isActive && (() => {

                          const costVal = parseDecimalNumber(prices.costPrice);

                          const saleVal = parseDecimalNumber(prices.salePrice);

                          const hasCost = !isNaN(costVal) && costVal > 0;

                          const hasSale = !isNaN(saleVal) && saleVal > 0;

                          const suggestedSale = hasCost ? calculateSuggestedPrice(costVal, marginPct).toFixed(2) : "";

                          const isLoss = hasCost && hasSale && saleVal < costVal;

                          const marginPercent = hasCost && hasSale ? calculateRealMarginPercent(costVal, saleVal) : 0;

                          const profitAmount = hasCost && hasSale ? calculateProfitAmount(costVal, saleVal) : 0;

                          const suggestedProfit = hasCost && suggestedSale ? (parseFloat(suggestedSale) - costVal).toFixed(2) : "0.00";



                          return (

                            <div className="px-4 pb-4 pt-3 space-y-3">

                              {/* Inputs de Precio */}

                              <div className="grid grid-cols-2 gap-3">

                                <div>

                                  <Lbl t="Precio de Compra ($)" req />

                                  <input type="text" inputMode="decimal"

                                    value={prices.costPrice}

                                    onChange={e => {

                                      const val = normalizeDecimalInput(e.target.value);

                                      setEditModelSeriesPrices(prev => ({

                                        ...prev,

                                        [s.id]: { ...prev[s.id], costPrice: val }

                                      }));

                                    }}

                                    placeholder="0.00" className={INPUT} />

                                </div>

                                <div>

                                  <Lbl t="Precio de Venta ($)" req />

                                  <input type="text" inputMode="decimal"

                                    value={prices.salePrice}

                                    onChange={e => {

                                      const val = normalizeDecimalInput(e.target.value);

                                      setEditModelSeriesPrices(prev => ({

                                        ...prev,

                                        [s.id]: { ...prev[s.id], salePrice: val }

                                      }));

                                    }}

                                    placeholder={suggestedSale ? `$${suggestedSale} (${marginPct}% margen)` : "0.00"}

                                    className={`${INPUT} ${isLoss ? "border-red-500 text-red-500 bg-red-500/5" : ""}`} />

                                </div>

                              </div>



                              {/* Indicador de Margen */}

                              {hasCost && (

                                <div className="text-[11px] font-semibold">

                                  {hasSale ? (

                                    isLoss ? (

                                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-1.5">

                                        <AlertCircle size={14} className="shrink-0 animate-bounce" />

                                        <span>Venta menor al costo: Margen {marginPercent.toFixed(1)}% (Pérdida de -${Math.abs(profitAmount).toFixed(2)}/par)</span>

                                      </div>

                                    ) : (

                                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center gap-1.5">

                                        <CheckCircle size={14} />

                                        <span>Margen de ganancia: <strong className="font-extrabold">{marginPercent.toFixed(1)}%</strong> (+${profitAmount.toFixed(2)} de utilidad por par)</span>

                                      </div>

                                    )

                                  ) : (

                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-lg flex items-center gap-1.5">

                                      <DollarSign size={14} className="shrink-0" />

                                      <span>Precio sugerido ({marginPct}% margen): <strong className="font-extrabold">${suggestedSale}</strong> (Ganancia estimada: +${suggestedProfit}/par)</span>

                                    </div>

                                  )}

                                </div>

                              )}



                              {/* Componente de Curva de Tallas con Steppers */}

                              <div className="pt-2 border-t border-[var(--border)]/40 space-y-2.5">

                                <div className="flex items-center justify-between">

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">

                                    Serie: {getNombreSerie(s, series).toUpperCase()}

                                  </span>

                                  <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">

                                    = {selectedTallaIds.length} pares total

                                  </span>

                                </div>



                                {/* Steppers por talla */}

                                <div className="flex flex-wrap gap-2">

                                  {[...(s.tallas || [])].sort((a, b) => a.numero - b.numero).map(t => {

                                    const count = selectedTallaIds.filter(id => id === t.id).length;

                                    return (

                                      <div key={t.id} className="flex items-center gap-0 bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-1 py-0.5">

                                        <span className="text-xs font-black text-[var(--foreground)] px-1.5 w-9 text-center">T{t.numero}</span>

                                        <button type="button"

                                          onClick={() => removeOneTallaInEditModel(s.id, t.id)}

                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-sm font-bold transition-colors"

                                        >−</button>

                                        <span className="w-8 text-center text-sm font-extrabold text-[var(--foreground)]">{count}</span>

                                        <button type="button"

                                          onClick={() => addTallaRepeatInEditModel(s.id, t.id)}

                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-sm font-bold transition-colors"

                                        >+</button>

                                      </div>

                                    );

                                  })}

                                </div>



                                {/* Total de pares y botón para restablecer docena estándar */}

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)]/30">

                                  <div className="flex items-center gap-2">

                                    <span className="text-[11px] font-bold text-[var(--foreground)] font-mono">

                                      = {selectedTallaIds.length} pares total ({getDocenaLabelExt(selectedTallaIds.length)})

                                    </span>

                                    {selectedTallaIds.length !== 12 && (

                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">

                                        Una docena estándar suma 12 pares

                                      </span>

                                    )}

                                  </div>

                                  <button

                                    type="button"

                                    onClick={() => restablecerDocenaEstandarEnEditModel(s.id)}

                                    className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"

                                    title={`Restablecer curva base de 12 pares según las tallas de la serie ${getNombreSerie(s, series)}`}

                                  >

                                    <RefreshCw size={11} />

                                    <span>Restablecer docena estándar</span>

                                  </button>

                                </div>

                              </div>

                            </div>

                          );

                        })()}

                      </div>

                    );

                  })}

                </div>

              </div>



              {error && (

                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">

                  <AlertCircle size={14} /> {error}

                </div>

              )}

              </div>



              {/* Pie del Modal Estandarizado */}

              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">

                <button

                  type="button"

                  onClick={() => { setShowEditModel(false); setEditModel(null); }}

                  className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors"

                >

                  Cancelar

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"

                >

                  {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}

                  <span>Guardar Cambios</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* ═════════════════════════════════════════════════════════ */}

      {/* MODAL: SERIES Y PRECIOS POR PROVEEDOR EN EL MODELO       */}

      {/* ═════════════════════════════════════════════════════════ */}

      {showSupplierSeriesModal && supplierSeriesTargetModel && (

        <div

          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"

          onClick={(e) => { if (e.target === e.currentTarget) setShowSupplierSeriesModal(false); }}

        >

          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            {/* Encabezado */}

            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">

              <div className="flex items-center gap-3">

                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">

                  <Boxes size={20} />

                </div>

                <div>

                  <div className="flex items-center gap-2 flex-wrap">

                    <h3 className="font-extrabold text-base text-white">{supplierSeriesTargetModel.name}</h3>

                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">

                      <Truck size={10} />

                      {supplierSeriesTargetSupplierName}

                    </span>

                  </div>

                  <p className="text-[11px] text-slate-300 mt-0.5">

                    Activa o desactiva series para este proveedor. Los cambios se aplicarán a todos los colores del modelo.

                  </p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => setShowSupplierSeriesModal(false)}

                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"

                title="Cerrar ventana"

              >

                <X size={18} />

              </button>

            </div>



            <form onSubmit={handleSaveSupplierSeries} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">

                {error && (

                  <div className="flex items-start justify-between gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-2xl font-bold animate-in fade-in duration-150">

                    <div className="flex items-start gap-2">

                      <AlertCircle size={16} className="shrink-0 mt-0.5" />

                      <span>{error}</span>

                    </div>

                    <button type="button" onClick={() => setError("")} className="text-red-400 hover:text-red-600 p-0.5 rounded cursor-pointer">

                      <X size={14} />

                    </button>

                  </div>

                )}



                {/* Sección 3: Series y Precios (Coincide idéntico con la imagen de referencia) */}

                <div className="space-y-4">

                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">

                    <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">3. Series y Precios</h5>

                    <button

                      type="button"

                      onClick={() => {

                        setNewSerieNombre("");

                        setNewSerieTallasDesde("38");

                        setNewSerieTallasHasta("43");

                        setError("");

                        setShowCreateSeriesModal(true);

                      }}

                      className="flex items-center gap-1 text-[11px] font-bold text-[#0F172A] hover:underline cursor-pointer"

                    >

                      <Plus size={13} /> <span>Crear Nueva Serie</span>

                    </button>

                  </div>

                  <p className="text-[10px] text-[var(--muted-foreground)] -mt-2">

                    Activa las series que deseas generar, personaliza sus tallas y define precios.

                  </p>



                  <div className="space-y-3">

                    {series.map(s => {

                      const isActive = supplierSeriesActiveIds.includes(s.id);

                      const prices = supplierSeriesPrices[s.id] || { costPrice: "", salePrice: "" };

                      const selectedTallaIds = supplierSeriesCustomTallas[s.id] || [];



                      return (

                        <div

                          key={s.id}

                          className={`rounded-xl border transition-all overflow-hidden ${

                            isActive

                              ? "border-[#0F172A] bg-[#0F172A]/5 shadow-sm"

                              : "border-[var(--border)] bg-[var(--card)] opacity-70 hover:opacity-100"

                          }`}

                        >

                          {/* Toggle Header */}

                          <div className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/30">

                            <div

                              className="flex items-center gap-3 cursor-pointer select-none"

                              onClick={() => toggleSupplierSerie(s.id)}

                            >

                              <div

                                className={`w-10 h-5 rounded-full relative transition-colors ${

                                  isActive ? "bg-[#0F172A]" : "bg-[var(--border)]"

                                }`}

                              >

                                <div

                                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${

                                    isActive ? "translate-x-5" : "translate-x-0.5"

                                  }`}

                                />

                              </div>

                              <span

                                className={`text-sm font-bold ${

                                  isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"

                                }`}

                              >

                                {getNombreSerie(s, series)}

                              </span>

                              <span className="text-[10px] text-[var(--muted-foreground)] font-mono">

                                ({s.nombre})

                              </span>

                            </div>



                            <div className="flex items-center gap-2">

                              <button

                                type="button"

                                onClick={() => openEditSeriesModal(s)}

                                className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--muted)]/50 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"

                                title="Editar rango o nombre de esta serie"

                              >

                                <Edit2 size={13} />

                                <span>Editar</span>

                              </button>

                              {isActive && (

                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">

                                  ACTIVA

                                </span>

                              )}

                            </div>

                          </div>



                          {/* Detalle si la serie está activa */}

                          {isActive && (() => {

                            const costVal = parseDecimalNumber(prices.costPrice);

                            const saleVal = parseDecimalNumber(prices.salePrice);

                            const hasCost = !isNaN(costVal) && costVal > 0;

                            const hasSale = !isNaN(saleVal) && saleVal > 0;

                            const suggestedSale = hasCost ? calculateSuggestedPrice(costVal, marginPct).toFixed(2) : "";

                            const isLoss = hasCost && hasSale && saleVal < costVal;

                            const marginPercent = hasCost && hasSale ? calculateRealMarginPercent(costVal, saleVal) : 0;

                            const profitAmount = hasCost && hasSale ? calculateProfitAmount(costVal, saleVal) : 0;

                            const suggestedProfit = hasCost && suggestedSale ? (parseFloat(suggestedSale) - costVal).toFixed(2) : "0.00";



                            return (

                              <div className="px-4 pb-4 pt-3 space-y-3">

                                {/* Inputs de Precio */}

                                <div className="grid grid-cols-2 gap-3">

                                  <div>

                                    <Lbl t="Precio de Compra ($)" req />

                                    <input

                                      type="text"

                                      inputMode="decimal"

                                      value={prices.costPrice}

                                      onChange={e => {

                                        const val = normalizeDecimalInput(e.target.value);

                                        setSupplierSeriesPrices(prev => ({

                                          ...prev,

                                          [s.id]: { ...prev[s.id], costPrice: val },

                                        }));

                                      }}

                                      placeholder="0.00"

                                      className={INPUT}

                                    />

                                  </div>

                                  <div>

                                    <Lbl t="Precio de Venta ($)" req />

                                    <input

                                      type="text"

                                      inputMode="decimal"

                                      value={prices.salePrice}

                                      onChange={e => {

                                        const val = normalizeDecimalInput(e.target.value);

                                        setSupplierSeriesPrices(prev => ({

                                          ...prev,

                                          [s.id]: { ...prev[s.id], salePrice: val },

                                        }));

                                      }}

                                      placeholder={suggestedSale ? `$${suggestedSale} (${marginPct}% margen)` : "0.00"}

                                      className={`${INPUT} ${isLoss ? "border-red-500 text-red-500 bg-red-500/5" : ""}`}

                                    />

                                  </div>

                                </div>



                                {/* Indicador de Margen */}

                                {hasCost && (

                                  <div className="text-[11px] font-semibold">

                                    {hasSale ? (

                                      isLoss ? (

                                        <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-1.5">

                                          <AlertCircle size={14} className="shrink-0 animate-bounce" />

                                          <span>Venta menor al costo: Margen {marginPercent.toFixed(1)}% (Pérdida de -${Math.abs(profitAmount).toFixed(2)}/par)</span>

                                        </div>

                                      ) : (

                                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg flex items-center gap-1.5">

                                          <CheckCircle size={14} />

                                          <span>Margen de ganancia: <strong className="font-extrabold">{marginPercent.toFixed(1)}%</strong> (+${profitAmount.toFixed(2)} de utilidad por par)</span>

                                        </div>

                                      )

                                    ) : (

                                      <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-lg flex items-center gap-1.5">

                                        <DollarSign size={14} className="shrink-0" />

                                        <span>Precio sugerido ({marginPct}% margen): <strong className="font-extrabold">${suggestedSale}</strong> (Ganancia estimada: +${suggestedProfit}/par)</span>

                                      </div>

                                    )}

                                  </div>

                                )}



                                {/* Curva de Tallas con Steppers */}

                                <div className="pt-2 border-t border-[var(--border)]/40 space-y-2.5">

                                  <div className="flex items-center justify-between">

                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">

                                      Serie: {getNombreSerie(s, series).toUpperCase()}

                                    </span>

                                    <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">

                                      = {selectedTallaIds.length} pares total

                                    </span>

                                  </div>



                                  <div className="flex flex-wrap gap-2">

                                    {s.tallas?.sort((a, b) => a.numero - b.numero).map(t => {

                                      const count = selectedTallaIds.filter(id => id === t.id).length;

                                      return (

                                        <div key={t.id} className="flex items-center gap-0 bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg px-1 py-0.5">

                                          <span className="text-xs font-black text-[var(--foreground)] px-1.5 w-9 text-center">T{t.numero}</span>

                                          <button

                                            type="button"

                                            onClick={() => removeOneTallaInSupplierSeries(s.id, t.id)}

                                            className="w-6 h-6 flex items-center justify-center rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 text-sm font-bold transition-colors cursor-pointer"

                                          >−</button>

                                          <span className="w-8 text-center text-sm font-extrabold text-[var(--foreground)]">{count}</span>

                                          <button

                                            type="button"

                                            onClick={() => addTallaRepeatInSupplierSeries(s.id, t.id)}

                                            className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-sm font-bold transition-colors cursor-pointer"

                                          >+</button>

                                        </div>

                                      );

                                    })}

                                  </div>



                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)]/30">

                                    <div className="flex items-center gap-2">

                                      <span className="text-[11px] font-bold text-[var(--foreground)] font-mono">

                                        = {selectedTallaIds.length} pares total ({getDocenaLabelExt(selectedTallaIds.length)})

                                      </span>

                                    </div>

                                    <button

                                      type="button"

                                      onClick={() => restablecerDocenaEstandarEnSupplierSeries(s.id)}

                                      className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"

                                    >

                                      <RefreshCw size={11} />

                                      <span>Restablecer estándar</span>

                                    </button>

                                  </div>

                                </div>

                              </div>

                            );

                          })()}

                        </div>

                      );

                    })}

                  </div>

                </div>

              </div>



              {/* Footer con acciones */}

              <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--muted)]/20 flex items-center justify-between gap-3 shrink-0">

                <button

                  type="button"

                  onClick={() => setShowSupplierSeriesModal(false)}

                  className="px-4 py-2.5 text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-pointer"

                >

                  Cancelar

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer"

                >

                  {saving ? (

                    <>

                      <Loader2 size={14} className="animate-spin" />

                      <span>Sincronizando series...</span>

                    </>

                  ) : (

                    <>

                      <Check size={14} />

                      <span>Guardar y Aplicar a Todos los Colores</span>

                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* ── Modal de Confirmación Global (reemplaza window.confirm) ── */}

      {confirmModal.isOpen && (

        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"

          onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in"

            onClick={e => e.stopPropagation()}

            style={{ animation: "modalSlideIn 0.2s ease-out" }}>

            {/* Header */}

            <div className={`p-5 flex items-start gap-4 ${confirmModal.danger ? "bg-red-500/5" : "bg-amber-500/5"}`}>

              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${

                confirmModal.danger

                  ? "bg-red-500/15 text-red-500"

                  : "bg-amber-500/15 text-amber-500"

              }`}>

                <AlertTriangle size={22} />

              </div>

              <div className="flex-1 min-w-0">

                <h3 className="font-bold text-base">{confirmModal.title}</h3>

                <p className="text-sm text-[var(--muted-foreground)] mt-1.5 whitespace-pre-line leading-relaxed">

                  {confirmModal.message}

                </p>

              </div>

            </div>



            {/* Botones */}

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border)]">

              <button type="button"

                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}

                className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 hover:bg-[var(--muted)] transition-colors">

                {confirmModal.cancelText || "Cancelar"}

              </button>

              <button type="button"

                onClick={() => confirmModal.onConfirm()}

                className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${

                  confirmModal.danger

                    ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"

                    : "bg-[#0F172A] hover:bg-slate-800 text-white"

                }`}>

                {confirmModal.confirmText || "Confirmar"}

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Modal de Proveedor Rápido */}

      {showQuickSupplier && (

        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"

             onMouseDown={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowQuickSupplier(false), isDirtyQuickSupplier()); }}

             onClick={(e) => { if (e.target === e.currentTarget) safeDismiss(() => setShowQuickSupplier(false), isDirtyQuickSupplier()); }}>

          <div className="relative bg-[var(--card)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">

            <div className="p-4 sm:p-6 pr-14 sm:pr-16 border-b border-[var(--border)] bg-[#0F172A] text-white flex justify-between items-center shrink-0">

              <div className="flex items-center gap-3 min-w-0">

                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 text-emerald-400 font-bold shrink-0">

                  <Truck size={18} />

                </div>

                <div className="min-w-0">

                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">Nuevo Proveedor</h3>

                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">Crea y asigna inmediatamente el proveedor</p>

                </div>

              </div>

              <button type="button" onClick={() => safeDismiss(() => setShowQuickSupplier(false), isDirtyQuickSupplier())} className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" aria-label="Cerrar modal">

                <X size={18} />

              </button>

            </div>

            <form onSubmit={handleQuickCreateSupplier} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">

                {qsError && (

                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">

                    <AlertCircle size={14} className="shrink-0" />

                    <span>{qsError}</span>

                  </div>

                )}



                <div>

                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">

                    Cédula / RUC del Proveedor

                  </label>

                  <input

                    type="text"

                    placeholder="Ej. 1804567890 o 1792348574001 (10 o 13 dígitos)"

                    value={qsRuc}

                    onChange={e => {

                      setQsRuc(e.target.value.replace(/\D/g, '').slice(0, 13));

                      if (qsError) setQsError('');

                    }}

                    className={INPUT}

                  />

                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">

                    10 dígitos para cédula de persona natural o 13 dígitos para RUC.

                  </p>

                </div>



                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  <div>

                    <Lbl t="Nombres del Proveedor" req />

                    <input type="text" required placeholder="Ej. Juan Carlos" value={qsNombres} onChange={e => { setQsNombres(formatearNombres(e.target.value)); if (qsError) setQsError(''); }} className={INPUT} />

                  </div>

                  <div>

                    <Lbl t="Apellidos del Proveedor" req />

                    <input type="text" required placeholder="Ej. Pérez Gómez" value={qsApellidos} onChange={e => { setQsApellidos(formatearApellidos(e.target.value)); if (qsError) setQsError(''); }} className={INPUT} />

                  </div>

                </div>



                <div>

                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">

                    Nombre Comercial / Proveedor

                  </label>

                  <input type="text" placeholder="Ej. Calzados Artesanales Cevallos (Dejar vacío si es persona natural)" value={qsNombreComercial} onChange={e => setQsNombreComercial(e.target.value)} className={INPUT} />

                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">

                    Si no se ingresa, se usarán los nombres y apellidos como razón social.

                  </p>

                </div>



                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  <div>

                    <Lbl t="Teléfono / WhatsApp" req />

                    <input type="text" required placeholder="Ej. 0998765432" value={qsContacto} onChange={e => setQsContacto(formatearTelefono(e.target.value))} className={INPUT} />

                  </div>

                  <div>

                    <Lbl t="Correo Electrónico (Opcional)" />

                    <input type="email" placeholder="Ej. pedidos@proveedor.com" value={qsEmail} onChange={e => setQsEmail(formatearEmail(e.target.value))} className={INPUT} />

                  </div>

                </div>



                <div>

                  <Lbl t="Dirección del Proveedor (Opcional)" />

                  <input type="text" placeholder="Ej. Parque Industrial / Av. Principal" value={qsDireccion} onChange={e => setQsDireccion(e.target.value)} onBlur={() => setQsDireccion(formatearDireccion(qsDireccion))} className={INPUT} />

                </div>

              </div>



              <div className="p-4 sm:p-5 bg-[var(--muted)]/20 border-t border-[var(--border)] flex items-center justify-end gap-2 shrink-0">

                <button type="button" onClick={() => safeDismiss(() => setShowQuickSupplier(false), isDirtyQuickSupplier())} className="w-1/3 sm:w-auto px-4 py-2.5 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-center cursor-pointer transition-colors">

                  Cancelar

                </button>

                <button type="submit" disabled={qsSaving} className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]">

                  {qsSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={14} />}

                  <span>Guardar y Asignar</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* Modal de confirmación de descarte de cambios */}

      <UnsavedChangesModal

        isOpen={showDiscardModal}

        targetSectionName="Modelos y Catálogo"

        detail={{ hasChanges: true, sectionName: "este formulario de Modelos y Catálogo" }}

        onStay={() => {

          setShowDiscardModal(false);

          pendingCloseRef.current = null;

        }}

        onDiscardAndLeave={() => {

          setShowDiscardModal(false);

          if (pendingCloseRef.current) {

            pendingCloseRef.current();

            pendingCloseRef.current = null;

          }

        }}

      />



      {/* ── MODAL LIGHTBOX PARA AMPLIAR IMAGEN DE MODELO ── */}

      {zoomImage && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"

          onClick={() => setZoomImage(null)}

        >

          <div

            className="relative max-w-3xl w-full bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"

            onClick={(e) => e.stopPropagation()}

          >

            {/* Header */}

            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-4 bg-[var(--muted)]/20">

              <div className="min-w-0">

                <div className="flex items-center gap-2 flex-wrap">

                  <h3 className="font-black text-base sm:text-lg text-[var(--foreground)] truncate uppercase tracking-tight">

                    {zoomImage.title}

                  </h3>

                  {zoomImage.subtitle && (

                    <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[10px] font-mono font-bold uppercase">

                      {zoomImage.subtitle}

                    </span>

                  )}

                  {zoomImage.color && (

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">

                      🎨 {zoomImage.color}

                    </span>

                  )}

                  {zoomImage.brand && (

                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">

                      {zoomImage.brand}

                    </span>

                  )}

                </div>

              </div>

              <button

                type="button"

                onClick={() => setZoomImage(null)}

                className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer shrink-0"

                title="Cerrar (Esc)"

              >

                <X size={20} />

              </button>

            </div>



            {/* Imagen ampliada */}

            <div className="p-4 sm:p-6 flex items-center justify-center bg-slate-950/40 min-h-[300px] overflow-auto">

              <img

                src={zoomImage.url}

                alt={zoomImage.title}

                className="max-h-[68vh] max-w-full object-contain rounded-2xl shadow-xl transition-transform hover:scale-105 duration-300"

              />

            </div>



            {/* Footer */}

            <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)] bg-[var(--muted)]/10">

              <span>Vista detallada del calzado de cuero</span>

              <button

                type="button"

                onClick={() => setZoomImage(null)}

                className="px-4 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"

              >

                Cerrar

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

