"use client";

import { useState, useEffect, useRef } from "react";
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
  Trash2,
  FileCheck,
  MessageSquare,
  Send,
  Mail,
  X,
  Printer,
  Smartphone,
  Check,
} from "lucide-react";

import { useToast } from "./ui/toast";
import { generarFacturaPdfDoc, type FacturaPdfData } from "@/services/pdf-factura.service";
import { generarUrlPublicaFactura, armarMensajeWhatsAppFactura } from "@/services/comprobante-url.service";
import { abrirWhatsAppUniversal } from "@/utils/whatsapp";
import { capitalizarNombreCompleto } from "@/utils/text-formatters";

interface FacturaSRI {
  id: string;
  numeroComprobante: string;
  claveAcceso: string;
  estadoSri: string;
  createdAt: string;
  xmlUrl?: string;
  pdfUrl?: string;
}


/**
 * Parsea el XML autorizado de la factura o construye los datos base
 * para generar el PDF oficial RIDE y permitir compartir por WhatsApp y Correo.
 */
function parsearFacturaXmlAFacturaPdfData(factura: FacturaSRI, config: any): FacturaPdfData {
  let emisorNombre = config?.sriRazonSocial || config?.nombreComercial || "COMERCIO DE CALZADO";
  let emisorRuc = config?.ruc || "1804884664001";
  let emisorDir = config?.direccion || "Cevallos, Tungurahua";
  let emisorRegimen = config?.sriRegimen || "RIMPE_POPULAR";
  let obligado = !!config?.sriObligadoContabilidad;

  let fecha = new Date(factura.createdAt).toLocaleDateString("es-EC");
  let numComprobante = factura.numeroComprobante || "001-001-000000001";
  let claveAcceso = factura.claveAcceso || "";
  let compradorNombre = "CONSUMIDOR FINAL";
  let compradorCedula = "9999999999999";
  let compradorDir = "Cevallos, Tungurahua";
  let compradorTel = "";
  let compradorEmail = "";
  let formaPago = "01 - Sin utilizacion del sistema financiero";

  const detalles: {
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    subtotal: number;
  }[] = [];

  let subtotalSinImp = 0;
  let totalDescuento = 0;
  let totalIva = 0;
  let totalFinal = 0;

  if (factura.xmlUrl && typeof factura.xmlUrl === "string" && factura.xmlUrl.includes("<")) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(factura.xmlUrl, "text/xml");

      const getVal = (parent: Element | Document, tag: string) =>
        parent.getElementsByTagName(tag)[0]?.textContent?.trim() || "";

      // infoTributaria
      const infoTrib = xmlDoc.getElementsByTagName("infoTributaria")[0];
      if (infoTrib) {
        emisorNombre = getVal(infoTrib, "razonSocial") || getVal(infoTrib, "nombreComercial") || emisorNombre;
        emisorRuc = getVal(infoTrib, "ruc") || emisorRuc;
        claveAcceso = getVal(infoTrib, "claveAcceso") || claveAcceso;
        emisorDir = getVal(infoTrib, "dirMatriz") || emisorDir;
        const estab = getVal(infoTrib, "estab");
        const ptoEmi = getVal(infoTrib, "ptoEmi");
        const sec = getVal(infoTrib, "secuencial");
        if (estab && ptoEmi && sec) {
          numComprobante = `${estab}-${ptoEmi}-${sec}`;
        }
      }

      // infoFactura
      const infoFac = xmlDoc.getElementsByTagName("infoFactura")[0];
      if (infoFac) {
        fecha = getVal(infoFac, "fechaEmision") || fecha;
        obligado = getVal(infoFac, "obligadoContabilidad") === "SI";
        compradorNombre = getVal(infoFac, "razonSocialComprador") || compradorNombre;
        compradorCedula = getVal(infoFac, "identificacionComprador") || compradorCedula;
        compradorDir = getVal(infoFac, "direccionComprador") || compradorDir;
        subtotalSinImp = parseFloat(getVal(infoFac, "totalSinImpuestos")) || 0;
        totalDescuento = parseFloat(getVal(infoFac, "totalDescuento")) || 0;
        totalFinal = parseFloat(getVal(infoFac, "importeTotal")) || 0;

        const totalImpuesto = infoFac.getElementsByTagName("totalImpuesto");
        for (let i = 0; i < totalImpuesto.length; i++) {
          const v = parseFloat(getVal(totalImpuesto[i], "valor")) || 0;
          totalIva += v;
        }

        const pago = infoFac.getElementsByTagName("pago")[0];
        if (pago) {
          const codForma = getVal(pago, "formaPago");
          if (codForma === "01") formaPago = "01 - Sin utilizacion del sistema financiero (Efectivo)";
          else if (codForma === "19") formaPago = "19 - Tarjeta de credito";
          else if (codForma === "16") formaPago = "16 - Tarjeta de debito";
          else if (codForma === "20") formaPago = "20 - Otros con utilizacion del sistema financiero (Transferencia)";
        }
      }

      // detalles
      const detallesXml = xmlDoc.getElementsByTagName("detalle");
      for (let i = 0; i < detallesXml.length; i++) {
        const d = detallesXml[i];
        const desc = getVal(d, "descripcion") || "Calzado Artesanal";
        const cant = parseFloat(getVal(d, "cantidad")) || 1;
        const precio = parseFloat(getVal(d, "precioUnitario")) || 0;
        const descVal = parseFloat(getVal(d, "descuento")) || 0;
        const sub = parseFloat(getVal(d, "precioTotalSinImpuesto")) || (cant * precio - descVal);

        detalles.push({
          descripcion: desc,
          cantidad: cant,
          precioUnitario: precio,
          descuento: descVal,
          subtotal: sub,
        });
      }

      // infoAdicional
      const camposAdic = xmlDoc.getElementsByTagName("campoAdicional");
      for (let i = 0; i < camposAdic.length; i++) {
        const nom = camposAdic[i].getAttribute("nombre")?.toLowerCase() || "";
        const val = camposAdic[i].textContent?.trim() || "";
        if (nom.includes("email") || nom.includes("correo")) compradorEmail = val;
        if (nom.includes("tel") || nom.includes("cel")) compradorTel = val;
      }
    } catch (e) {
      console.warn("No se pudo parsear XML de factura, usando datos base:", e);
    }
  }

  if (detalles.length === 0) {
    detalles.push({
      descripcion: "Calzado Artesanal de Cuero",
      cantidad: 1,
      precioUnitario: totalFinal > 0 ? totalFinal : 0,
      descuento: 0,
      subtotal: totalFinal > 0 ? totalFinal : 0,
    });
  }

  return {
    emisor: {
      nombre: emisorNombre,
      ruc: emisorRuc,
      direccion: emisorDir,
      obligadoContabilidad: obligado,
      regimen: emisorRegimen,
    },
    comprobante: {
      numero: numComprobante,
      fecha,
      claveAcceso,
      formaPago,
    },
    comprador: {
      nombre: compradorNombre,
      cedula: compradorCedula,
      direccion: compradorDir,
      telefono: compradorTel,
      email: compradorEmail,
    },
    detalles,
    totales: {
      subtotal15: totalIva > 0 ? subtotalSinImp : 0,
      subtotal0: totalIva === 0 ? subtotalSinImp : 0,
      descuento: totalDescuento,
      iva15: totalIva,
      total: totalFinal > 0 ? totalFinal : subtotalSinImp + totalIva,
    },
  };
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
      sriRegimen: "RIMPE_POPULAR",
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
  const [eliminandoFirma, setEliminandoFirma] = useState(false);
  const [nombreArchivoGuardado, setNombreArchivoGuardado] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nexora_sri_p12_filename") || "";
    }
    return "";
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Listado de Facturas
  const [facturas, setFacturas] = useState<FacturaSRI[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  // Estados de Previsualización y Compartición de Factura PDF
  const [modalPreviewFactura, setModalPreviewFactura] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaSRI | null>(null);
  const [previewPdfData, setPreviewPdfData] = useState<FacturaPdfData | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState("");
  const [emailDestino, setEmailDestino] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [compartiendoWhatsApp, setCompartiendoWhatsApp] = useState(false);

  useEffect(() => {
    loadConfig();
    loadFacturas();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await ApiService.get("/configuracion/negocio");
      if (data) {
        const remoteFirmaNombre = data.firmaNombre || "FirmaSegura-1804884664-CHRISTOPHER_ED";
        if (data.tieneP12 || data.firmaP12Path) {
          setNombreArchivoGuardado(remoteFirmaNombre);
          if (typeof window !== "undefined") {
            localStorage.setItem("nexora_sri_p12_filename", remoteFirmaNombre);
          }
        }
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
          sriRegimen: data.sriRegimen || "RIMPE_POPULAR",
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
        sriRegimen: config.sriRegimen || "RIMPE_POPULAR",
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
      const fileName = fileP12.name;
      const formData = new FormData();
      formData.append("firma", fileP12);
      formData.append("password", passwordP12);

      await ApiService.postFormData("/configuracion/sri/firma-p12", formData);
      if (typeof window !== "undefined") {
        localStorage.setItem("nexora_sri_p12_filename", fileName);
      }
      setNombreArchivoGuardado(fileName);
      setMsgConfig({ type: "success", text: `Certificado de firma (${fileName}) guardado y encriptado con éxito.` });
      showToast("Firma electrónica cargada y validada con éxito", "success");
      setConfig((prev) => ({ ...prev, tieneP12: true }));
      setFileP12(null);
      setPasswordP12("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setMsgConfig({ type: "error", text: err.message || "Error al procesar el archivo .p12." });
      showToast(err.message || "Error al subir la firma .p12", "error");
    } finally {
      setUploadingFirma(false);
    }
  };

  const handleEliminarFirma = async () => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar la firma electrónica actual? Podrás subir una nueva inmediatamente.")) {
      return;
    }
    setEliminandoFirma(true);
    try {
      await ApiService.delete("/configuracion/sri/firma-p12");
      setConfig((prev) => ({ ...prev, tieneP12: false }));
      if (typeof window !== "undefined") {
        localStorage.removeItem("nexora_sri_p12_filename");
      }
      setNombreArchivoGuardado("");
      setFileP12(null);
      setPasswordP12("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      showToast("Firma electrónica eliminada. Ahora puedes subir una nueva.", "success");
    } catch (err: any) {
      showToast("Error al eliminar la firma: " + (err.message || ""), "error");
    } finally {
      setEliminandoFirma(false);
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

  const handleAbrirPreviewFactura = (factura: FacturaSRI) => {
    try {
      const data = parsearFacturaXmlAFacturaPdfData(factura, config);
      const doc = generarFacturaPdfDoc(data);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);

      setFacturaSeleccionada(factura);
      setPreviewPdfData(data);
      setPdfBlobUrl(url);
      setTelefonoWhatsApp(data.comprador.telefono || "");
      setEmailDestino(data.comprador.email || "");
      setModalPreviewFactura(true);
    } catch (e: any) {
      showToast("Error al generar vista previa del comprobante: " + (e?.message || ""), "error");
    }
  };

  const handleCerrarPreview = () => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
    }
    setPdfBlobUrl(null);
    setPreviewPdfData(null);
    setFacturaSeleccionada(null);
    setModalPreviewFactura(false);
  };

  const handleDescargarPdfPreview = () => {
    if (!previewPdfData) return;
    try {
      const doc = generarFacturaPdfDoc(previewPdfData);
      const num = previewPdfData.comprobante.numero || facturaSeleccionada?.numeroComprobante || "SRI";
      doc.save(`Factura_${num}.pdf`);
      showToast("Descarga iniciada exitosamente", "success");
    } catch (e: any) {
      showToast("Error al descargar PDF: " + (e?.message || ""), "error");
    }
  };

  const handleCompartirWhatsAppPreview = async () => {
    if (!previewPdfData) return;
    setCompartiendoWhatsApp(true);
    try {
      const urlPublica = await generarUrlPublicaFactura(previewPdfData);
      const mensaje = armarMensajeWhatsAppFactura(previewPdfData, urlPublica);
      abrirWhatsAppUniversal(telefonoWhatsApp, mensaje);
      showToast("WhatsApp abierto para enviar el comprobante", "success");
    } catch (e: any) {
      showToast("Error al compartir por WhatsApp: " + (e?.message || ""), "error");
    } finally {
      setCompartiendoWhatsApp(false);
    }
  };

  const handleEnviarEmailSegundoPlano = async () => {
    if (!previewPdfData) return;
    const correo = emailDestino.trim();
    if (!correo || !correo.includes("@")) {
      showToast("Ingresa un correo electrónico válido para enviar el comprobante.", "warning");
      return;
    }

    setEnviandoEmail(true);
    try {
      const urlPublica = await generarUrlPublicaFactura(previewPdfData);
      // Enviar en segundo plano al backend
      ApiService.post("/notificaciones/email-comprobante", {
        destinatario: correo,
        asunto: `Factura Electrónica N° ${previewPdfData.comprobante.numero} - ${previewPdfData.emisor.nombre}`,
        tipo: "FACTURA",
        detalles: {
          numeroComprobante: previewPdfData.comprobante.numero,
          claveAcceso: previewPdfData.comprobante.claveAcceso,
          total: previewPdfData.totales.total,
          clienteNombre: previewPdfData.comprador.nombre,
          enlaceWeb: urlPublica,
        },
      }).catch((err) => {
        console.warn("Fallo en envío de correo en segundo plano:", err);
      });

      showToast(`Comprobante enviado a ${correo} en segundo plano`, "success");
    } catch (e: any) {
      showToast("Error al despachar correo: " + (e?.message || ""), "error");
    } finally {
      setEnviandoEmail(false);
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

              <div>
                <label className="block text-[var(--muted-foreground)] mb-1 font-medium">
                  Régimen Tributario / Tarifa IVA por Defecto
                </label>
                <select
                  value={config.sriRegimen || "RIMPE_POPULAR"}
                  onChange={(e) => setConfig({ ...config, sriRegimen: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] focus:outline-none focus:border-[#0F172A]"
                >
                  <option value="RIMPE_POPULAR">RIMPE - Negocio Popular (Tarifa IVA 0%)</option>
                  <option value="GENERAL_15">Régimen General / Emprendedor (Tarifa IVA 15%)</option>
                </select>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {config.sriRegimen === "GENERAL_15"
                    ? "Tus comprobantes se emitirán con tarifa general de IVA 15%."
                    : "Los negocios populares facturan a tarifa 0% de IVA según normativa SRI."}
                </p>
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

              <div className="mb-6 p-4 bg-[var(--muted)]/60 rounded-xl border border-[var(--border)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-full shrink-0 ${
                      config.tieneP12 ? "bg-emerald-500 shadow-md animate-pulse" : "bg-rose-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--card-foreground)] flex items-center gap-2 truncate">
                      <span>{config.tieneP12 ? "Firma Electrónica Cargada y Cifrada" : "No hay Firma Electrónica activa"}</span>
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">
                      {config.tieneP12
                        ? (
                          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                            <FileCheck size={13} className="shrink-0" />
                            Archivo activo: <span className="font-mono underline font-bold">{nombreArchivoGuardado || "Certificado .p12 activo"}</span> (AES-256)
                          </span>
                        )
                        : "Sube tu certificado PKCS#12 (.p12) emitido por BCE, Security Data, UANATACA, etc."}
                    </p>
                  </div>
                </div>

                {config.tieneP12 && (
                  <button
                    type="button"
                    onClick={handleEliminarFirma}
                    disabled={eliminandoFirma}
                    className="shrink-0 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    title="Eliminar certificado actual para subir uno nuevo"
                  >
                    <Trash2 size={13} />
                    <span>{eliminandoFirma ? "Eliminando..." : "Eliminar firma"}</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleUploadFirma} className="space-y-4 text-sm">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[var(--muted-foreground)] font-medium">
                      {config.tieneP12 ? "Reemplazar firma con nuevo archivo (.p12 / .pfx)" : "Archivo de Firma (.p12 / .pfx)"}
                    </label>
                    {fileP12 && (
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <FileCheck size={12} />
                        {fileP12.name}
                      </span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".p12,.pfx"
                    onChange={(e) => setFileP12(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[var(--muted-foreground)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[var(--muted)] file:text-[var(--foreground)] hover:file:opacity-80"
                    required
                  />
                  {config.tieneP12 && !fileP12 && (
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                      Si seleccionas un nuevo archivo, se reemplazará automáticamente la firma actual por la nueva.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[var(--muted-foreground)] mb-1 font-medium">
                    {config.tieneP12 ? "Nueva Contraseña de la Firma" : "Contraseña de la Firma"}
                  </label>
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
                  className="w-full mt-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload size={18} />
                  {uploadingFirma
                    ? "Cifrando y Guardando..."
                    : config.tieneP12
                    ? "Reemplazar Firma Electrónica"
                    : "Subir Firma Segura"}
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
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleAbrirPreviewFactura(factura)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg inline-flex items-center gap-1 font-medium shadow-sm transition-all cursor-pointer"
                          title="Previsualizar PDF oficial, descargar y reenviar por WhatsApp o Correo"
                        >
                          <Eye size={13} /> Ver PDF
                        </button>
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

      {/* Modal de Previsualización y Reenvío de Factura PDF */}
      {modalPreviewFactura && previewPdfData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--muted)]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--foreground)] flex items-center gap-2">
                    Factura Electrónica #{previewPdfData.comprobante.numero}
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {facturaSeleccionada?.estadoSri || 'AUTORIZADO'}
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Fecha: {previewPdfData.comprobante.fecha} • Emisor: {previewPdfData.emisor.nombre}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCerrarPreview}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Modal (Grid con Visor PDF y Panel de Reenvío) */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Visor PDF (8 Cols en desktop) */}
              <div className="lg:col-span-7 flex flex-col bg-slate-900/50 rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-2 bg-[var(--muted)]/40 border-b border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)] font-mono">
                  <span>RIDE_Factura_{previewPdfData.comprobante.numero}.pdf</span>
                  <span>{previewPdfData.detalles.length} ítem(s)</span>
                </div>
                {pdfBlobUrl ? (
                  <iframe
                    src={pdfBlobUrl}
                    title="Previsualización de Factura"
                    className="w-full h-[58vh] bg-white rounded-b-xl border-none"
                  />
                ) : (
                  <div className="h-[58vh] flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                    Cargando previsualización del comprobante...
                  </div>
                )}
              </div>

              {/* Panel de Acciones y Reenvío (5 Cols en desktop) */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Resumen del Cliente y Monto */}
                  <div className="p-4 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--muted-foreground)]">Cliente Receptor:</span>
                      <span className="font-bold text-[var(--foreground)] text-right truncate max-w-[180px]">
                        {previewPdfData.comprador.nombre}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--muted-foreground)]">C.I. / RUC:</span>
                      <span className="font-mono font-medium text-[var(--foreground)]">
                        {previewPdfData.comprador.cedula}
                      </span>
                    </div>
                    {previewPdfData.comprobante.claveAcceso && (
                      <div className="pt-1 border-t border-[var(--border)]">
                        <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block mb-0.5">
                          Clave de Acceso SRI (49 dígitos):
                        </span>
                        <p className="font-mono text-[10px] text-[var(--muted-foreground)] break-all bg-[var(--card)] p-1.5 rounded border border-[var(--border)] select-all">
                          {previewPdfData.comprobante.claveAcceso}
                        </p>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center">
                      <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Facturado:</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        ${previewPdfData.totales.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Acciones de Descarga Directa */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDescargarPdfPreview}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <Download size={14} /> Descargar PDF
                    </button>
                    {facturaSeleccionada?.xmlUrl && (
                      <button
                        type="button"
                        onClick={() => handleDescargarXml(facturaSeleccionada)}
                        className="py-2.5 px-3 bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <FileText size={14} /> XML Oficial
                      </button>
                    )}
                  </div>

                  {/* Sección Reenviar por WhatsApp */}
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                    <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <MessageSquare size={14} /> Reenviar por WhatsApp
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Smartphone size={13} className="absolute left-3 top-2.5 text-[var(--muted-foreground)]" />
                        <input
                          type="text"
                          value={telefonoWhatsApp}
                          onChange={(e) => setTelefonoWhatsApp(e.target.value)}
                          placeholder="0991234567"
                          className="w-full pl-8 pr-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-mono text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCompartirWhatsAppPreview}
                        disabled={compartiendoWhatsApp}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Send size={12} /> {compartiendoWhatsApp ? "Abriendo..." : "WhatsApp"}
                      </button>
                    </div>
                  </div>

                  {/* Sección Reenviar por Correo Electrónico */}
                  <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 space-y-2">
                    <label className="text-xs font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                      <Mail size={14} /> Reenviar por Correo Electrónico
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail size={13} className="absolute left-3 top-2.5 text-[var(--muted-foreground)]" />
                        <input
                          type="email"
                          value={emailDestino}
                          onChange={(e) => setEmailDestino(e.target.value)}
                          placeholder="cliente@correo.com"
                          className="w-full pl-8 pr-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs font-mono text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleEnviarEmailSegundoPlano}
                        disabled={enviandoEmail}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Send size={12} /> {enviandoEmail ? "Enviando..." : "Enviar"}
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      El envío se procesa en segundo plano con la clave de acceso y enlace digital.
                    </p>
                  </div>
                </div>

                {/* Pie del Panel */}
                <div className="pt-3 border-t border-[var(--border)] flex justify-end">
                  <button
                    type="button"
                    onClick={handleCerrarPreview}
                    className="px-4 py-2 bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] text-xs font-medium rounded-xl transition-all"
                  >
                    Cerrar Visor
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
