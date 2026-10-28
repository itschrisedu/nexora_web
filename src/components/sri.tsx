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
  Eye,
  EyeOff,
} from "lucide-react";

import { useToast } from "./ui/toast";

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
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"config" | "facturas">("config");

  // Configuración Emisor
  const [config, setConfig] = useState(() => {
    let initialName = "";
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user");
        if (stored) initialName = JSON.parse(stored)?.tenantName || "";
      } catch (e) {}
    }
    return {
      nombreComercial: initialName,
      sriRazonSocial: "",
      ruc: "",
      direccion: "",
      sriEstablecimiento: "001",
      sriPuntoEmision: "001",
      sriAmbiente: "1", // 1: Pruebas, 2: Producción
      sriObligadoContabilidad: false,
      tieneP12: false,
      logoUrl: "",
      primaryColor: "#0F172A",
    };
  });

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [msgConfig, setMsgConfig] = useState({ type: "", text: "" });
  const [rucError, setRucError] = useState(false);

  // Firma P12
  const [fileP12, setFileP12] = useState<File | null>(null);
  const [passwordP12, setPasswordP12] = useState("");
  const [showPasswordP12, setShowPasswordP12] = useState(false);
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
      const data = await ApiService.get("/configuracion/negocio");
      if (data) {
        setConfig((prev) => ({
          ...prev,
          nombreComercial: data.nombre || prev.nombreComercial,
          sriRazonSocial: data.sriRazonSocial || "",
          ruc: data.ruc || prev.ruc,
          direccion: data.direccion || prev.direccion,
          sriEstablecimiento: data.sriEstablecimiento || prev.sriEstablecimiento,
          sriPuntoEmision: data.sriPuntoEmision || prev.sriPuntoEmision,
          sriAmbiente: data.sriAmbiente || prev.sriAmbiente,
          sriObligadoContabilidad: !!data.sriObligadoContabilidad,
          tieneP12: !!data.tieneP12 || !!data.firmaP12Path,
          logoUrl: data.logoUrl || prev.logoUrl,
          primaryColor: (data.primaryColor && (data.primaryColor.includes("6366f1") || data.primaryColor.includes("8b5cf6"))) ? "#0F172A" : (data.primaryColor || prev.primaryColor),
        }));
        if (data.primaryColor && typeof document !== "undefined") {
          const lowerColor = data.primaryColor.toLowerCase();
          const isPurple = lowerColor.includes('6366f1') || lowerColor.includes('8b5cf6') || lowerColor.includes('7c3aed') || lowerColor.includes('violet') || lowerColor.includes('purple');
          const finalColor = isPurple ? '#0F172A' : data.primaryColor;
          document.documentElement.style.setProperty("--primary", finalColor);
        }
      }
    } catch (e) {
      console.warn("No se pudo cargar la configuración de backend:", e);
    }
  };

  const loadFacturas = async () => {
    setLoadingFacturas(true);
    try {
      const data = await ApiService.get("/facturacion-sri/facturas");
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
    const rucLimpio = config.ruc.trim();
    if (rucLimpio.length !== 13) {
      setRucError(true);
      showToast("El RUC debe tener exactamente 13 dígitos numéricos.", "error");
      return;
    }
    setRucError(false);
    setLoadingConfig(true);
    setMsgConfig({ type: "", text: "" });
    try {
      await ApiService.put("/configuracion/negocio", {
        sriRazonSocial: config.sriRazonSocial.trim().toUpperCase(),
        ruc: rucLimpio,
        direccion: config.direccion.trim().toUpperCase() || "CEVALLOS, TUNGURAHUA",
        sriEstablecimiento: config.sriEstablecimiento || "001",
        sriPuntoEmision: config.sriPuntoEmision || "001",
        sriAmbiente: config.sriAmbiente || "1",
        sriObligadoContabilidad: config.sriObligadoContabilidad,
      });
      setMsgConfig({ type: "success", text: "Configuración y datos de emisor guardados con éxito." });
      showToast("Configuración SRI guardada con éxito", "success");
    } catch (err: any) {
      setMsgConfig({ type: "error", text: err.message || "Error al guardar la configuración." });
      showToast(err.message || "Error al guardar configuración", "error");
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
      formData.append("firma", fileP12);
      formData.append("password", passwordP12);

      await ApiService.postFormData("/configuracion/sri/firma-p12", formData);
      setMsgConfig({ type: "success", text: "Certificado de firma .p12 subido y encriptado con éxito." });
      showToast("Firma electrónica cargada y validada con éxito", "success");
      setConfig((prev) => ({ ...prev, tieneP12: true }));
      setFileP12(null);
      setPasswordP12("");
    } catch (err: any) {
      setMsgConfig({ type: "error", text: err.message || "Error al procesar el archivo .p12." });
      showToast(err.message || "Error al subir la firma .p12", "error");
    } finally {
      setUploadingFirma(false);
    }
  };

  const handleConsultarEstado = async (facturaId: string) => {
    try {
      await ApiService.get(`/facturacion-sri/estado/${facturaId}`);
      showToast("Estado de factura actualizado", "info");
      loadFacturas();
    } catch (err: any) {
      showToast("Error al consultar estado SRI: " + (err.message || "Error de conexión"), "error");
    }
  };

  const handleDescargarXml = (factura: FacturaSRI) => {
    if (!factura.xmlUrl) {
      showToast("El contenido XML de este comprobante no está disponible.", "warning");
      return;
    }
    if (factura.xmlUrl.startsWith("http://") || factura.xmlUrl.startsWith("https://")) {
      window.open(factura.xmlUrl, "_blank");
      return;
    }
    try {
      const blob = new Blob([factura.xmlUrl], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factura-${factura.numeroComprobante || factura.claveAcceso || "sri"}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Archivo XML descargado exitosamente", "success");
    } catch (e: any) {
      showToast("Error al descargar archivo XML: " + (e?.message || ""), "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <p className="text-[var(--muted-foreground)] text-sm font-medium flex items-center gap-2">
            <FileText className="text-emerald-600 dark:text-emerald-400" size={18} />
            Genera, firma y envía tus comprobantes electrónicos directamente al SRI
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
                <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Razón Social del Emisor (SRI)</label>
                <input
                  type="text"
                  value={config.sriRazonSocial}
                  onChange={(e) => setConfig((prev) => ({ ...prev, sriRazonSocial: e.target.value.toUpperCase() }))}
                  placeholder="Ej: APELLIDOS NOMBRES o RAZÓN SOCIAL S.A."
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] uppercase focus:outline-none focus:border-[#0F172A]"
                  required
                />
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] mb-1 font-medium flex items-center justify-between">
                  <span>RUC (13 dígitos)</span>
                  {config.ruc.length > 0 && config.ruc.length < 13 && (
                    <span className="text-xs text-rose-500 font-semibold">({config.ruc.length}/13 dígitos)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={config.ruc}
                  onChange={(e) => {
                    const soloDigitos = e.target.value.replace(/\D/g, '').slice(0, 13);
                    setConfig((prev) => ({ ...prev, ruc: soloDigitos }));
                    if (soloDigitos.length === 13) setRucError(false);
                  }}
                  onBlur={() => {
                    if (config.ruc.length > 0 && config.ruc.length < 13) {
                      setRucError(true);
                    } else {
                      setRucError(false);
                    }
                  }}
                  placeholder="1801234567001"
                  className={`w-full bg-[var(--background)] border rounded-xl px-4 py-2.5 text-[var(--foreground)] font-mono transition-all focus:outline-none ${
                    rucError
                      ? "border-rose-500 ring-2 ring-rose-500/20 text-rose-600 dark:text-rose-400 font-bold focus:border-rose-500"
                      : "border-[var(--border)] focus:border-[#0F172A]"
                  }`}
                  maxLength={13}
                  required
                />
                {rucError && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">
                    El RUC debe tener exactamente 13 dígitos numéricos (actualmente tiene {config.ruc.length}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Dirección Matriz</label>
                <input
                  type="text"
                  value={config.direccion}
                  onChange={(e) => setConfig((prev) => ({ ...prev, direccion: e.target.value.toUpperCase() }))}
                  placeholder="Ej: AV. 24 DE MAYO Y 10 DE AGOSTO, CEVALLOS"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] uppercase focus:outline-none focus:border-[#0F172A]"
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
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] text-center font-mono focus:outline-none focus:border-[#0F172A]"
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
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] text-center font-mono focus:outline-none focus:border-[#0F172A]"
                    maxLength={3}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Obligado Contabilidad</label>
                  <select
                    value={config.sriObligadoContabilidad ? "SI" : "NO"}
                    onChange={(e) => setConfig({ ...config, sriObligadoContabilidad: e.target.value === "SI" })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="NO">NO</option>
                    <option value="SI">SÍ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1 font-medium">Ambiente SRI</label>
                  <select
                    value={config.sriAmbiente}
                    onChange={(e) => setConfig({ ...config, sriAmbiente: e.target.value })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="1">1 - PRUEBAS (celcer.sri.gob.ec)</option>
                    <option value="2">2 - PRODUCCIÓN (cel.sri.gob.ec)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingConfig}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingConfig ? "Guardando..." : "Guardar Configuración"}
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
                      type={showPasswordP12 ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={passwordP12}
                      onChange={(e) => setPasswordP12(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9 pr-10 py-2.5 text-[var(--foreground)] focus:outline-none focus:border-[#0F172A]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordP12(!showPasswordP12)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1"
                      tabIndex={-1}
                      title={showPasswordP12 ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPasswordP12 ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
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
                          <button
                            type="button"
                            onClick={() => handleDescargarXml(factura)}
                            className="px-2.5 py-1 bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] text-xs rounded-lg inline-flex items-center gap-1 border border-[var(--border)] cursor-pointer transition-all"
                            title="Descargar archivo XML firmado y autorizado por el SRI"
                          >
                            <Download size={12} /> XML
                          </button>
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
