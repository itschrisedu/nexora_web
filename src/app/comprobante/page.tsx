'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileCheck,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
  CreditCard,
  Building2,
  Phone,
  MapPin,
  ExternalLink,
  Receipt,
  Truck,
} from 'lucide-react';
import { decodificarPayload } from '@/services/comprobante-url.service';
import {
  descargarComprobanteAbonoPdf,
  ComprobanteAbonoPdfData,
} from '@/services/pdf-abono.service';
import {
  generarFacturaPdfDoc,
  descargarOrdenCompraPdf,
  FacturaPdfData,
  OrdenCompraPdfData,
} from '@/services/pdf-factura.service';

function ComprobanteContent() {
  const searchParams = useSearchParams();
  const rawData = searchParams.get('d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawData) {
      setError('No se proporcionó información de comprobante en el enlace.');
      setLoading(false);
      return;
    }

    try {
      const decoded = decodificarPayload(rawData);
      if (!decoded || !decoded.t) {
        setError('El enlace de comprobante no es válido o ha sido modificado.');
      } else {
        setData(decoded);
      }
    } catch (e) {
      setError('Error al decodificar el comprobante digital.');
    } finally {
      setLoading(false);
    }
  }, [rawData]);

  const handleDescargarPdf = () => {
    if (!data) return;

    if (data.t === 'ABONO') {
      const pdfData: ComprobanteAbonoPdfData = {
        emisor: {
          nombre: data.e_nom || 'Establecimiento Comercial',
          ruc: data.e_ruc || '',
          direccion: data.e_dir || '',
          telefono: data.e_tel || '',
        },
        cliente: {
          nombre: data.c_nom || 'Cliente',
          cedula: data.c_id || '9999999999',
          telefono: data.c_tel || '',
          direccion: data.c_dir || '',
        },
        comprobante: {
          numero: data.num || 'AB-0000',
          fecha: data.f || '',
          hora: data.h || '',
          formaPago: data.fp || 'Efectivo',
          referencia: data.ref || '',
          notas: data.not || '',
        },
        movimiento: {
          saldoAnterior: Number(data.m_ant || 0),
          montoAbonado: Number(data.m_abo || 0),
          saldoRestante: Number(data.m_res || 0),
        },
      };
      descargarComprobanteAbonoPdf(pdfData);
    } else if (data.t === 'FACTURA') {
      const pdfData: FacturaPdfData = {
        emisor: {
          nombre: data.e_nom || 'Facturación',
          ruc: data.e_ruc || '1800000000001',
          direccion: data.e_dir || '',
          telefono: data.e_tel || '',
        },
        comprador: {
          nombre: data.c_nom || 'Cliente',
          cedula: data.c_id || '9999999999',
          direccion: data.c_dir || '',
          telefono: data.c_tel || '',
          email: data.c_mail || '',
        },
        comprobante: {
          numero: data.num || '001-001-000000001',
          fecha: data.f || '',
          claveAcceso: data.aut || '',
        },
        detalles: (data.items || []).map((it: any) => ({
          descripcion: it.d,
          cantidad: it.c,
          precioUnitario: it.u,
          subtotal: it.t,
        })),
        totales: {
          subtotal15: Number(data.sub || 0),
          subtotal0: 0,
          descuento: 0,
          iva15: Number(data.iva || 0),
          total: Number(data.tot || 0),
        },
      };
      const doc = generarFacturaPdfDoc(pdfData);
      doc.save(`Factura_${data.num || 'Digital'}.pdf`);
    } else if (data.t === 'ORDEN') {
      const pdfData: OrdenCompraPdfData = {
        emisor: {
          nombre: data.e_nom || 'Gerencia de Compras',
          ruc: data.e_ruc || '1800000000001',
          direccion: data.e_dir || '',
          telefono: data.e_tel || '',
        },
        proveedor: {
          nombre: data.p_nom || 'Proveedor',
          ruc: data.p_ruc || '9999999999999',
          contacto: data.p_tel || '',
        },
        orden: {
          numero: data.num || 'OC-0000',
          fecha: data.f || '',
          estado: 'EMITIDA',
          observaciones: data.obs || '',
        },
        lineas: (data.lineas || []).map((l: any) => ({
          modelo: l.m,
          codigo: l.c,
          color: l.col,
          numeracion: l.num,
          cantidadPares: l.qty,
          precioCosto: l.u || 0,
          subtotal: l.tot || 0,
        })),
        totales: {
          totalPares: Number(data.pares || 0),
          totalPagar: Number(data.tot || 0),
        },
      };
      descargarOrdenCompraPdf(pdfData);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Cargando comprobante oficial digital...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Enlace No Válido</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-6">
            {error || 'No se pudo cargar el documento digital. Por favor solicite un nuevo enlace.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-sm"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    );
  }

  const esAbono = data.t === 'ABONO';
  const esFactura = data.t === 'FACTURA';
  const esOrden = data.t === 'ORDEN';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 sm:px-6 flex flex-col items-center justify-center">
      {/* Botones de acción flotantes / superiores */}
      <div className="w-full max-w-2xl mb-4 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Comprobante Digital Oficial
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleDescargarPdf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      {/* Tarjeta Oficial del Comprobante */}
      <div className="bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden print:shadow-none print:border-0">
        {/* Cabecera decorativa */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-extrabold uppercase tracking-wider mb-2 border border-emerald-500/30">
                <ShieldCheck size={12} />
                <span>Documento Verificado Electrónicamente</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {data.e_nom || 'CALZADO Y COMERCIAL'}
              </h1>
              {data.e_ruc && (
                <p className="text-xs text-slate-300 font-mono mt-0.5">RUC: {data.e_ruc}</p>
              )}
              {data.e_dir && (
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin size={12} />
                  <span>{data.e_dir}</span>
                </p>
              )}
            </div>

            <div className="sm:text-right bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 shrink-0">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                {esAbono
                  ? 'Recibo Oficial de Abono'
                  : esFactura
                  ? 'Factura Electrónica'
                  : 'Orden de Compra'}
              </span>
              <span className="text-base sm:text-lg font-mono font-black text-white block mt-0.5">
                {data.num}
              </span>
              <span className="text-[11px] text-slate-300 flex items-center sm:justify-end gap-1 mt-1">
                <Calendar size={12} />
                <span>{data.f} {data.h ? `• ${data.h}` : ''}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Cuerpo del comprobante */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Datos del Cliente o Proveedor */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
              {esOrden ? 'DATOS DEL PROVEEDOR' : 'DATOS DEL CLIENTE / RECEPTOR'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Nombre o Razón Social:</span>
                <strong className="text-slate-900 font-bold text-sm">
                  {esOrden ? data.p_nom : data.c_nom}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">RUC / Cédula:</span>
                <strong className="text-slate-900 font-mono font-semibold">
                  {esOrden ? data.p_ruc || 'N/A' : data.c_id || 'Consumidor Final'}
                </strong>
              </div>
              {(data.c_tel || data.p_tel) && (
                <div>
                  <span className="text-slate-500 block text-[11px]">Teléfono:</span>
                  <span className="text-slate-700">{data.c_tel || data.p_tel}</span>
                </div>
              )}
              {data.c_dir && (
                <div>
                  <span className="text-slate-500 block text-[11px]">Dirección:</span>
                  <span className="text-slate-700">{data.c_dir}</span>
                </div>
              )}
            </div>
          </div>

          {/* ═══ CUERPO: COMPROBANTE DE ABONO ═══ */}
          {esAbono && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                  Detalle del Movimiento de Cartera
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <CreditCard size={13} className="text-emerald-600" />
                  <span>Método: <strong>{data.fp}</strong></span>
                  {data.ref ? ` (${data.ref})` : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[11px] font-semibold text-slate-500 block">Saldo Anterior</span>
                  <span className="text-base font-bold font-mono text-slate-700 mt-1 block">
                    ${Number(data.m_ant || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[11px] font-bold text-emerald-800 block">Abono Aplicado</span>
                  <span className="text-lg font-black font-mono text-emerald-700 mt-1 block">
                    -${Number(data.m_abo || 0).toFixed(2)}
                  </span>
                </div>

                <div className={`p-4 rounded-2xl border ${
                  Number(data.m_res || 0) <= 0
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <span className={`text-[11px] font-bold block ${
                    Number(data.m_res || 0) <= 0 ? 'text-blue-800' : 'text-amber-800'
                  }`}>
                    Saldo Pendiente
                  </span>
                  <span className={`text-lg font-black font-mono mt-1 block ${
                    Number(data.m_res || 0) <= 0 ? 'text-blue-700' : 'text-amber-700'
                  }`}>
                    ${Number(data.m_res || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {Number(data.m_res || 0) <= 0 ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>¡Excelente! Este abono ha saldado completamente la cuenta pendiente.</span>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Agradecemos su puntualidad en los abonos acordados.</span>
                  <span className="font-semibold text-slate-900">Estado: Activo</span>
                </div>
              )}
            </div>
          )}

          {/* ═══ CUERPO: FACTURA ELECTRÓNICA ═══ */}
          {esFactura && (
            <div className="space-y-4">
              <span className="text-xs font-extrabold uppercase text-slate-700 tracking-wider block">
                Artículos Facturados
              </span>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-left">
                      <th className="py-2 font-bold">Cant.</th>
                      <th className="py-2 font-bold">Descripción</th>
                      <th className="py-2 text-right font-bold">P. Unit</th>
                      <th className="py-2 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(data.items || []).map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-bold font-mono">{it.c}</td>
                        <td className="py-2.5 text-slate-800">{it.d}</td>
                        <td className="py-2.5 text-right font-mono">${Number(it.u).toFixed(2)}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">${Number(it.t).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold">${Number(data.sub || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>IVA (15%):</span>
                    <span className="font-mono font-bold">${Number(data.iva || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-300">
                    <span>TOTAL:</span>
                    <span className="font-mono text-emerald-700">${Number(data.tot || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ CUERPO: ORDEN DE COMPRA ═══ */}
          {esOrden && (
            <div className="space-y-4">
              <span className="text-xs font-extrabold uppercase text-slate-700 tracking-wider block">
                Modelos y Numeración para Producción
              </span>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-left">
                      <th className="py-2 font-bold">Modelo / Código</th>
                      <th className="py-2 font-bold">Color</th>
                      <th className="py-2 font-bold">Curva / Numeración</th>
                      <th className="py-2 text-right font-bold">Pares</th>
                      <th className="py-2 text-right font-bold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(data.lineas || []).map((l: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-bold text-slate-900">{l.m} <span className="text-[10px] text-slate-400">({l.c})</span></td>
                        <td className="py-2.5 text-slate-700">{l.col || '—'}</td>
                        <td className="py-2.5 text-slate-600 font-mono text-[11px]">{l.num || 'Serie Estándar'}</td>
                        <td className="py-2.5 text-right font-mono font-bold">{l.qty}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">${Number(l.tot || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-500 font-medium">
                  Total de producción: <strong className="text-slate-900 font-mono">{data.pares} pares</strong>
                </span>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total a Liquidar:</span>
                  <span className="text-lg font-black font-mono text-emerald-700">${Number(data.tot || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pie de página y sello de autenticidad */}
          <div className="pt-6 border-t border-dashed border-slate-200 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-slate-400 text-[11px]">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Documento emitido electrónicamente por el sistema <strong>NEXORA</strong></span>
            </div>
            <p className="text-[10px] text-slate-400">
              Válido para archivo digital, respaldo contable y control comercial. Generado sin requerir descargas previas ni consumo de almacenamiento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComprobantePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <ComprobanteContent />
    </Suspense>
  );
}
