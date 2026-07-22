"use client";

import React, { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
import {
  FileText,
  KeyRound,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Building,
  ShieldCheck,
  Send,
  Download,
  AlertTriangle,
} from "lucide-react";

interface BusinessConfig {
  nombre: string;
  ruc: string;
  direccion: string;
  telefono?: string;
  email?: string;
  sriAmbiente: string;
  sriEstablecimiento: string;
  sriPuntoEmision: string;
  sriObligadoContabilidad: boolean;
  tieneP12?: boolean;
}

interface FacturaElectronica {
  id: string;
  numeroComprobante: string;
  claveAcceso?: string;
  estadoSri: string;
  xmlUrl?: string;
  ridePdfUrl?: string;
  errorMensaje?: string;
  createdAt: string;
}

export default function SriComponent() {
  const [activeTab, setActiveTab] = useState<"config" | "facturas">("config");

  // Config State
  const [config, setConfig] = useState<BusinessConfig>({
    nombre: "",
    ruc: "",
    direccion: "",
    telefono: "",
    email: "",
    sriAmbiente: "1",
    sriEstablecimiento: "001",
    sriPuntoEmision: "001",
    sriObligadoContabilidad: false,
    tieneP12: false,
  });

  const [fileP12, setFileP12] = useState<File | null>(null);
  const [passwordP12, setPasswordP12] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [uploadingFirma, setUploadingFirma] = useState(false);
  const [msgConfig, setMsgConfig] = useState({ type: "", text: "" });

  // Facturas State
  const [facturas, setFacturas] = useState<FacturaElectronica[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  useEffect(() => {
    loadConfig();
    loadFacturas();
  }, []);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      const data = await ApiService.get("/configuracion/negocio");
      if (data) {
        setConfig({
          nombre: data.nombre || "",
          ruc: data.ruc || "",
          direccion: data.direccion || "",
          telefono: data.telefono || "",
          email: data.email || "",
          sriAmbiente: data.sriAmbiente || "1",
          sriEstablecimiento: data.sriEstablecimiento || "001",
          sriPuntoEmision: data.sriPuntoEmision || "001",
          sriObligadoContabilidad: !!data.sriObligadoContabilidad,
          tieneP12: !!data.tieneP12,
        });
      }
    } catch (err: any) {
      console.error("Error al cargar configuración de negocio:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadFacturas = async () => {
    try {
      setLoadingFacturas(true);
      const data = await ApiService.get("/facturacion-sri/facturas");
      setFacturas(data || []);
    } catch (err: any) {
      console.error("Error al cargar facturas electrónicas:", err);
    } finally {
      setLoadingFacturas(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgConfig({ type: "", text: "" });
    try {
      setLoadingConfig(true);
      await ApiService.put("/configuracion/negocio", config);
      setMsgConfig({ type: "success", text: "Configuración guardada exitosamente." });
    } catch (err: any) {
      setMsgConfig({ type: "error", text: err.message || "Error al guardar la configuración." });
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleUploadFirma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileP12 || !passwordP12) {
      setMsgConfig({ type: "error", text: "Seleccione un archivo .p12 e ingrese la contraseña." });
      return;
    }

    try {
      setUploadingFirma(true);
      const formData = new FormData();
      formData.append("firma", fileP12);
      formData.append("password", passwordP12);

      await ApiService.postFormData("/configuracion/sri/firma-p12", formData);
      setMsgConfig({ type: "success", text: "Firma electrónica .p12 cargada y cifrada correctamente." });
      setConfig((prev) => ({ ...prev, tieneP12: true }));
      setPasswordP12("");
      setFileP12(null);
    } catch (err: any) {
      setMsgConfig({ type: "error", text: err.message || "Error al subir la firma .p12." });
    } finally {
      setUploadingFirma(false);
    }
  };

  const handleConsultarEstado = async (id: string) => {
    try {
      await ApiService.get(`/facturacion-sri/estado/${id}`);
      await loadFacturas();
    } catch (err: any) {
      alert("Error al consultar el estado SRI: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="text-emerald-400" size={28} />
            Facturación Electrónica SRI (Ecuador)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Firma de comprobantes XAdES-BES y conexión directa con los Servidores del SRI
          </p>
        </div>
        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-700/40">
          <button
            onClick={() => setActiveTab("config")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "config"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Configuración & Firma
          </button>
          <button
            onClick={() => setActiveTab("facturas")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "facturas"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Comprobantes Emitidos ({facturas.length})
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {msgConfig.text && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            msgConfig.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          {msgConfig.type === "success" ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{msgConfig.text}</span>
        </div>
      )}

      {/* Tab 1: Configuración & Firma */}
      {activeTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario Configuración Emisor */}
          <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Building className="text-cyan-400" size={20} />
              Datos del Emisor y Parámetros SRI
            </h2>
            <form onSubmit={handleSaveConfig} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Razón Social / Nombre Comercial</label>
                <input
                  type="text"
                  value={config.nombre}
                  onChange={(e) => setConfig({ ...config, nombre: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">RUC (13 dígitos)</label>
                <input
                  type="text"
                  value={config.ruc}
                  onChange={(e) => setConfig({ ...config, ruc: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  maxLength={13}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Dirección Matriz</label>
                <input
                  type="text"
                  value={config.direccion}
                  onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Establecimiento</label>
                  <input
                    type="text"
                    value={config.sriEstablecimiento}
                    onChange={(e) => setConfig({ ...config, sriEstablecimiento: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-center font-mono focus:outline-none focus:border-emerald-500"
                    maxLength={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Punto de Emisión</label>
                  <input
                    type="text"
                    value={config.sriPuntoEmision}
                    onChange={(e) => setConfig({ ...config, sriPuntoEmision: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-center font-mono focus:outline-none focus:border-emerald-500"
                    maxLength={3}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Ambiente SRI</label>
                <select
                  value={config.sriAmbiente}
                  onChange={(e) => setConfig({ ...config, sriAmbiente: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="1">1 - PRUEBAS (celcer.sri.gob.ec)</option>
                  <option value="2">2 - PRODUCCIÓN (cel.sri.gob.ec)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="obligado"
                  checked={config.sriObligadoContabilidad}
                  onChange={(e) => setConfig({ ...config, sriObligadoContabilidad: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                />
                <label htmlFor="obligado" className="text-slate-300">
                  Obligado a llevar contabilidad
                </label>
              </div>

              <button
                type="submit"
                disabled={loadingConfig}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-950/40"
              >
                {loadingConfig ? "Guardando..." : "Guardar Configuración Emisor"}
              </button>
            </form>
          </div>

          {/* Subida de Firma Electrónica (.p12) */}
          <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4">
                <ShieldCheck className="text-amber-400" size={20} />
                Certificado Digital de Firma (.p12)
              </h2>

              <div className="mb-6 p-4 bg-slate-900/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full ${
                    config.tieneP12 ? "bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" : "bg-rose-500"
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {config.tieneP12 ? "Firma Electrónica Cargada y Cifrada" : "No hay Firma Electrónica activa"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {config.tieneP12
                      ? "La contraseña se encuentra encriptada con AES-256 en el servidor."
                      : "Sube tu certificado PKCS#12 (.p12) emitido por BCE, Security Data, UANATACA, etc."}
                  </p>
                </div>
              </div>

              <form onSubmit={handleUploadFirma} className="space-y-4 text-sm">
                <div>
                  <label className="block text-slate-400 mb-1">Archivo de Firma (.p12 / .pfx)</label>
                  <input
                    type="file"
                    accept=".p12,.pfx"
                    onChange={(e) => setFileP12(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Contraseña de la Firma</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 text-slate-500" size={16} />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={passwordP12}
                      onChange={(e) => setPasswordP12(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploadingFirma || !fileP12 || !passwordP12}
                  className="w-full mt-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  {uploadingFirma ? "Cifrando y Guardando..." : "Subir Firma Segura"}
                </button>
              </form>
            </div>

            <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-xl text-xs text-amber-300 mt-4">
              🛡️ <strong>Seguridad Garantizada:</strong> Los certificados .p12 se almacenan aislados por Tenant y sus claves de acceso están cifradas mediante algoritmo simétrico AES-256-GCM.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Comprobantes Emitidos */}
      {activeTab === "facturas" && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="p-4 bg-slate-800/60 border-b border-slate-700/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-200">Historial de Facturas SRI</h3>
            <button
              onClick={loadFacturas}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={14} className={loadingFacturas ? "animate-spin" : ""} />
              Actualizar Listado
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/40 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4">N° Comprobante</th>
                  <th className="p-4">Clave de Acceso (49 dígitos)</th>
                  <th className="p-4">Fecha Emisión</th>
                  <th className="p-4">Estado SRI</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {facturas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No se han emitido facturas electrónicas aún.
                    </td>
                  </tr>
                ) : (
                  facturas.map((factura) => (
                    <tr key={factura.id} className="hover:bg-slate-800/30">
                      <td className="p-4 font-mono font-medium text-slate-200">
                        {factura.numeroComprobante}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-400">
                        {factura.claveAcceso || <span className="italic text-slate-600">No generada</span>}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {new Date(factura.createdAt).toLocaleString("es-EC")}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            factura.estadoSri === "AUTORIZADO"
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                              : factura.estadoSri === "PENDIENTE"
                              ? "bg-amber-950/80 text-amber-400 border border-amber-800"
                              : "bg-rose-950/80 text-rose-400 border border-rose-800"
                          }`}
                        >
                          {factura.estadoSri === "AUTORIZADO" && <CheckCircle size={14} />}
                          {factura.estadoSri === "PENDIENTE" && <Clock size={14} />}
                          {factura.estadoSri === "RECHAZADO" && <XCircle size={14} />}
                          {factura.estadoSri}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {factura.estadoSri !== "AUTORIZADO" && (
                          <button
                            onClick={() => handleConsultarEstado(factura.id)}
                            className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-300 text-xs rounded-lg transition-all"
                            title="Consultar autorización en SRI"
                          >
                            Reconsultar
                          </button>
                        )}
                        {factura.xmlUrl && (
                          <a
                            href={factura.xmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg inline-flex items-center gap-1"
                          >
                            <Download size={12} /> XML
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
