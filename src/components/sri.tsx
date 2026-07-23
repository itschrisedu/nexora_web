"use client";

import { useState, useEffect } from "react";
import { ApiService } from "@/services/api.service";
import {
  FileText,
  ShieldCheck,
  Building,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  RefreshCw,
  Download,
  KeyRound,
} from "lucide-react";

interface FacturaSRI {
  id: string;
  numeroComprobante: string;
  claveAcceso: string;
  estadoSri: string;
  createdAt: string;
  xmlUrl?: string;
  pdfUrl?: string;
}

export default function SriComponent() {
  const [activeTab, setActiveTab] = useState<"config" | "facturas">("config");

  // Configuración Emisor
  const [config, setConfig] = useState({
    nombre: "CALZADO CEVALLOS HNOS",
    ruc: "1890123456001",
    direccion: "Av. Cevallos 12-45 y Montalvo, Ambato",
    sriEstablecimiento: "001",
    sriPuntoEmision: "001",
    sriAmbiente: "1", // 1: Pruebas, 2: Producción
    tieneP12: false,
    logoUrl: "",
    primaryColor: "#0F172A",
  });

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [msgConfig, setMsgConfig] = useState({ type: "", text: "" });

  // Firma P12
  const [fileP12, setFileP12] = useState<File | null>(null);
  const [passwordP12, setPasswordP12] = useState("");
  const [uploadingFirma, setUploadingFirma] = useState(false);

  // Listado de Facturas
  const [facturas, setFacturas] = useState<FacturaSRI[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  useEffect(() => {
    loadConfig();
    loadFacturas();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await ApiService.get("/configuracion");
      if (data) {
        setConfig((prev) => ({
          ...prev,
          nombre: data.nombre || prev.nombre,
          ruc: data.ruc || prev.ruc,
          direccion: data.direccion || prev.direccion,
          sriEstablecimiento: data.sriEstablecimiento || prev.sriEstablecimiento,
          sriPuntoEmision: data.sriPuntoEmision || prev.sriPuntoEmision,
          sriAmbiente: data.sriAmbiente || prev.sriAmbiente,
          tieneP12: !!data.sriP12Path,
          logoUrl: data.logoUrl || prev.logoUrl,
          primaryColor: data.primaryColor || prev.primaryColor,
        }));
        if (data.primaryColor && typeof document !== "undefined") {
          document.documentElement.style.setProperty("--primary", data.primaryColor);
        }
      }
    } catch (e) {
      console.warn("No se pudo cargar la configuración de backend:", e);
    }
  };

  const loadFacturas = async () => {
    setLoadingFacturas(true);
    try {
      const data = await ApiService.get("/sri/comprobantes");
      if (Array.isArray(data)) {
        setFacturas(data);
      }
    } catch (e) {
      console.warn("No se pudieron cargar facturas:", e);
    } finally {
      setLoadingFacturas(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingConfig(true);
    setMsgConfig({ type: "", text: "" });
    try {
      await ApiService.put("/configuracion", config);
      setMsgConfig({ type: "success", text: "Configuración y datos de emisor guardados con éxito." });
    } catch (err: any) {
      setMsgConfig({ type: "error", text: err.message || "Error al guardar la configuración." });
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleUploadFirma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileP12 || !passwordP12) return;
    setUploadingFirma(true);
    setMsgConfig({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("file", fileP12);
      formData.append("password", passwordP12);

      await ApiService.postMultipart("/sri/upload-p12", formData);
      setMsgConfig({ type: "success", text: "Certificado de firma .p12 subido y encriptado con éxito." });
      setConfig((prev) => ({ ...prev, tieneP12: true }));
      setFileP12(null);
      setPasswordP12("");
    } catch (err: any) {
      setMsgConfig({ type: "error", text: err.message || "Error al procesar el archivo .p12." });
    } finally {
      setUploadingFirma(false);
    }
  };

  const handleConsultarEstado = async (facturaId: string) => {
    try {
      await ApiService.post(`/sri/consultar/${facturaId}`, {});
      loadFacturas();
    } catch (err: any) {
      alert("Error al consultar estado SRI: " + (err.message || "Error de conexión"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[var(--card-foreground)] flex items-center gap-2">
            <FileText className="text-emerald-600 dark:text-emerald-400" size={28} />
            Facturación Electrónica SRI (Ecuador)
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            Firma de comprobantes XAdES-BES y conexión directa con los Servidores del SRI
          </p>
        </div>
        <div className="flex bg-[var(--muted)]/60 p-1 rounded-xl border border-[var(--border)]">
          <button
            onClick={() => setActiveTab("config")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "config"
                ? "bg-[var(--card)] text-[var(--card-foreground)] shadow-sm border border-[var(--border)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Configuración & Firma
          </button>
          <button
            onClick={() => setActiveTab("facturas")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "facturas"
                ? "bg-[var(--card)] text-[var(--card-foreground)] shadow-sm border border-[var(--border)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
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
          <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-[var(--card-foreground)] flex items-center gap-2">
              <Building className="text-cyan-600 dark:text-cyan-400" size={20} />
              Datos del Emisor y Parámetros SRI
            </h2>
            <form onSubmit={handleSaveConfig} className="space-y-4 text-sm">
              <div>
                <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Razón Social / Nombre Comercial</label>
                <input
                  type="text"
                  value={config.nombre}
                  onChange={(e) => setConfig({ ...config, nombre: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] mb-1 font-medium">RUC (13 dígitos)</label>
                <input
                  type="text"
                  value={config.ruc}
                  onChange={(e) => setConfig({ ...config, ruc: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  maxLength={13}
                  required
                />
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Dirección Matriz</label>
                <input
                  type="text"
                  value={config.direccion}
                  onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Establecimiento</label>
                  <input
                    type="text"
                    value={config.sriEstablecimiento}
                    onChange={(e) => setConfig({ ...config, sriEstablecimiento: e.target.value })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] text-center font-mono focus:outline-none focus:border-[var(--primary)]"
                    maxLength={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Punto de Emisión</label>
                  <input
                    type="text"
                    value={config.sriPuntoEmision}
                    onChange={(e) => setConfig({ ...config, sriPuntoEmision: e.target.value })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] text-center font-mono focus:outline-none focus:border-[var(--primary)]"
                    maxLength={3}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Ambiente SRI</label>
                <select
                  value={config.sriAmbiente}
                  onChange={(e) => setConfig({ ...config, sriAmbiente: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="1">1 - PRUEBAS (celcer.sri.gob.ec)</option>
                  <option value="2">2 - PRODUCCIÓN (cel.sri.gob.ec)</option>
                </select>
              </div>

              {/* Personalización de Marca (Logo & Color) */}
              <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-3">
                <h3 className="text-sm font-semibold text-[var(--card-foreground)] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                  Personalización de Marca & Color de Espacio
                </h3>

                {/* Subir Logo */}
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1">Logo Institucional (PNG / JPG / SVG)</label>
                  <div className="flex items-center gap-3">
                    {config.logoUrl ? (
                      <div className="w-12 h-12 rounded-xl bg-[var(--muted)] border border-[var(--border)] p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={config.logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] text-xs font-bold flex-shrink-0">
                        LOGO
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setConfig((prev) => ({ ...prev, logoUrl: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-[var(--muted-foreground)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--muted)] file:text-[var(--foreground)] hover:file:opacity-80"
                    />
                    {config.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, logoUrl: "" }))}
                        className="text-xs text-rose-500 hover:underline"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>

                {/* Color de Tema */}
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1.5">Color Principal de la Interfaz</label>
                  <div className="flex items-center gap-2">
                    {[
                      { hex: "#0F172A", label: "Azul Profundo" },
                      { hex: "#10b981", label: "Esmeralda" },
                      { hex: "#8b5cf6", label: "Púrpura" },
                      { hex: "#06b6d4", label: "Cian" },
                      { hex: "#f43f5e", label: "Rosa" },
                      { hex: "#B8860B", label: "Dorado" },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({ ...prev, primaryColor: c.hex }));
                          if (typeof document !== "undefined") {
                            document.documentElement.style.setProperty("--primary", c.hex);
                          }
                        }}
                        style={{ backgroundColor: c.hex }}
                        className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 flex items-center justify-center ${
                          config.primaryColor === c.hex ? "ring-2 ring-amber-500 scale-110 shadow-md" : "opacity-80 hover:opacity-100"
                        }`}
                        title={c.label}
                      />
                    ))}
                    {/* Custom Color Input */}
                    <input
                      type="color"
                      value={config.primaryColor || "#0F172A"}
                      onChange={(e) => {
                        const hex = e.target.value;
                        setConfig((prev) => ({ ...prev, primaryColor: hex }));
                        if (typeof document !== "undefined") {
                          document.documentElement.style.setProperty("--primary", hex);
                        }
                      }}
                      className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                      title="Color Personalizado"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingConfig}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              >
                {loadingConfig ? "Guardando..." : "Guardar Configuración & Marca"}
              </button>
            </form>
          </div>

          {/* Subida de Firma Electrónica (.p12) */}
          <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--card-foreground)] flex items-center gap-2 mb-4">
                <ShieldCheck className="text-amber-500" size={20} />
                Certificado Digital de Firma (.p12)
              </h2>

              <div className="mb-6 p-4 bg-[var(--muted)]/60 rounded-xl border border-[var(--border)] flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full ${
                    config.tieneP12 ? "bg-emerald-500 shadow-md animate-pulse" : "bg-rose-500"
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--card-foreground)]">
                    {config.tieneP12 ? "Firma Electrónica Cargada y Cifrada" : "No hay Firma Electrónica activa"}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {config.tieneP12
                      ? "La contraseña se encuentra encriptada con AES-256 en el servidor."
                      : "Sube tu certificado PKCS#12 (.p12) emitido por BCE, Security Data, UANATACA, etc."}
                  </p>
                </div>
              </div>

              <form onSubmit={handleUploadFirma} className="space-y-4 text-sm">
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Archivo de Firma (.p12 / .pfx)</label>
                  <input
                    type="file"
                    accept=".p12,.pfx"
                    onChange={(e) => setFileP12(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[var(--muted-foreground)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[var(--muted)] file:text-[var(--foreground)] hover:file:opacity-80"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Contraseña de la Firma</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 text-[var(--muted-foreground)]" size={16} />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={passwordP12}
                      onChange={(e) => setPasswordP12(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploadingFirma || !fileP12 || !passwordP12}
                  className="w-full mt-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  {uploadingFirma ? "Cifrando y Guardando..." : "Subir Firma Segura"}
                </button>
              </form>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 mt-4">
              🛡️ <strong>Seguridad Garantizada:</strong> Los certificados .p12 se almacenan aislados por Tenant y sus claves de acceso están cifradas mediante algoritmo simétrico AES-256-GCM.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Comprobantes Emitidos */}
      {activeTab === "facturas" && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-[var(--muted)]/40 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="font-semibold text-[var(--card-foreground)]">Historial de Facturas SRI</h3>
            <button
              onClick={loadFacturas}
              className="px-3 py-1.5 bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] text-xs rounded-lg flex items-center gap-1.5 transition-all border border-[var(--border)]"
            >
              <RefreshCw size={14} className={loadingFacturas ? "animate-spin" : ""} />
              Actualizar Listado
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--foreground)]">
              <thead className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] uppercase text-xs">
                <tr>
                  <th className="p-4">N° Comprobante</th>
                  <th className="p-4">Clave de Acceso (49 dígitos)</th>
                  <th className="p-4">Fecha Emisión</th>
                  <th className="p-4">Estado SRI</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {facturas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--muted-foreground)]">
                      No se han emitido facturas electrónicas aún.
                    </td>
                  </tr>
                ) : (
                  facturas.map((factura) => (
                    <tr key={factura.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="p-4 font-mono font-medium text-[var(--card-foreground)]">
                        {factura.numeroComprobante}
                      </td>
                      <td className="p-4 font-mono text-xs text-[var(--muted-foreground)]">
                        {factura.claveAcceso || <span className="italic">No generada</span>}
                      </td>
                      <td className="p-4 text-xs text-[var(--muted-foreground)]">
                        {new Date(factura.createdAt).toLocaleString("es-EC")}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            factura.estadoSri === "AUTORIZADO"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : factura.estadoSri === "PENDIENTE"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
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
                            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg transition-all"
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
                            className="px-2 py-1 bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] text-xs rounded-lg inline-flex items-center gap-1 border border-[var(--border)]"
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
