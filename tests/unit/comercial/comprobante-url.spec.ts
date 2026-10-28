import {
  generarUrlPublicaFactura,
  generarUrlPublicaVentaPOS,
  armarMensajeWhatsAppVentaPOS,
  limpiarObjetoPayload,
  formatearEnlaceWhatsAppComprobante,
  codificarPayload,
  decodificarPayload,
  VentaPosComprobanteData,
} from '@/services/comprobante-url.service';
import { FacturaPdfData } from '@/services/pdf-factura.service';

// Mock de fetch global para simular el guardado en el backend y obtención de token
global.fetch = jest.fn();

describe('Servicio de Enlaces Públicos y Comprobantes (comprobante-url.service)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (process.env as any).NEXT_PUBLIC_APP_URL;
  });

  describe('limpiarObjetoPayload', () => {
    it('debe eliminar propiedades nulas, vacías o undefined para mantener el payload ultra-ligero', () => {
      const sucio = {
        nombre: 'Calzado Cevallos',
        telefono: '',
        email: null,
        direccion: undefined,
        activo: true,
        items: [
          { modelo: 'Mocasín', vacio: null },
          null,
          undefined,
        ],
      };

      const limpio = limpiarObjetoPayload(sucio);

      expect(limpio).toEqual({
        nombre: 'Calzado Cevallos',
        activo: true,
        items: [{ modelo: 'Mocasín' }],
      });
    });

    it('debe filtrar cadenas base64 de imágenes pesadas para no saturar el token', () => {
      const payload = {
        modelo: 'Bota Cuero',
        foto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        precio: 35,
      };

      const limpio = limpiarObjetoPayload(payload);

      expect(limpio.foto).toBeUndefined();
      expect(limpio.modelo).toBe('Bota Cuero');
      expect(limpio.precio).toBe(35);
    });
  });

  describe('formatearEnlaceWhatsAppComprobante', () => {
    it('debe generar el formato profesional de hipervínculo con emoji y salto de línea', () => {
      const url = 'https://nexora.app/c?t=k8Px9b';
      const mensaje = formatearEnlaceWhatsAppComprobante(url, 'Tu Factura Electrónica');

      expect(mensaje).toContain('*Tu Factura Electrónica:*');
      expect(mensaje).toContain('https://nexora.app/c?t=k8Px9b');
    });

    it('debe retornar cadena vacía si la URL no es válida o está vacía', () => {
      expect(formatearEnlaceWhatsAppComprobante('')).toBe('');
    });
  });

  describe('generarUrlPublicaFactura', () => {
    it('debe generar una URL pública ultra-corta con el token devuelto por el servidor', async () => {
      // Mock de respuesta exitosa del backend con token
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'fac12345' }),
      });

      const facturaData: FacturaPdfData = {
        emisor: {
          nombre: 'Comercializadora de Calzado',
          ruc: '1801234567001',
          direccion: 'Cevallos Centro',
          telefono: '032876543',
        },
        comprobante: {
          numero: '001-001-000000045',
          fecha: '28/10/2026',
          claveAcceso: '2810202601180123456700110010010000000451234567814',
        },
        comprador: {
          nombre: 'Elena Castro',
          cedula: '1809988776',
          direccion: 'Ambato',
        },
        detalles: [
          {
            codigo: 'ZAP-01',
            descripcion: 'Zapato Escolar Cuero Negro T38',
            cantidad: 2,
            precioUnitario: 20,
            subtotal: 40,
            tarifaIva: 15,
          },
        ],
        totales: {
          subtotal15: 40,
          subtotal0: 0,
          iva15: 6,
          total: 46,
        },
      };

      const url = await generarUrlPublicaFactura(facturaData);

      expect(url).toContain('/c?t=fac12345');
      expect(url).not.toContain('localhost:4000');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/catalogo/comprobante'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });
  });

  describe('generarUrlPublicaVentaPOS y armarMensajeWhatsAppVentaPOS', () => {
    const ventaPosData: VentaPosComprobanteData = {
      negocio: {
        nombre: 'Calzado Artesanal Cevallos',
        ruc: '1801122334001',
        direccion: 'Calle Principal Cevallos',
        telefono: '0987654321',
      },
      fecha: '28/10/2026 11:30',
      tipoComprobante: 'NOTA_VENTA',
      clienteNombre: 'Mario López',
      clienteIdentificacion: '1801239876',
      items: [
        {
          nombre: 'Zapato Casual Cuero Café',
          cantidad: 1,
          tallaNumero: 40,
          precioUnitario: 32.5,
        },
      ],
      subtotal: 32.5,
      descuento: 0,
      total: 32.5,
      metodoPago: 'EFECTIVO',
      pagaCon: 40,
      vuelto: 7.5,
    };

    it('debe generar enlace corto para comprobante de venta POS en mostrador', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'pos99887' }),
      });

      const url = await generarUrlPublicaVentaPOS(ventaPosData);

      expect(url).toContain('/c?t=pos99887');
      expect(url).not.toContain('localhost:4000');
    });

    it('debe armar el mensaje de WhatsApp con formato prolijo, detalle de pares y enlace público para descarga', () => {
      const urlComprobante = 'https://nexora.app/c?t=pos99887';
      const mensaje = armarMensajeWhatsAppVentaPOS(ventaPosData, urlComprobante);

      expect(mensaje).toContain('COMPROBANTE DE VENTA — Calzado Artesanal Cevallos');
      expect(mensaje).toContain('Mario López');
      expect(mensaje).toContain('1801239876');
      expect(mensaje).toContain('1x Zapato Casual Cuero Café (Talla 40) — $32.50');
      expect(mensaje).toContain('TOTAL: $32.50');
      expect(mensaje).toContain('EFECTIVO');
      expect(mensaje).toContain('Descarga tu comprobante en PDF aquí:');
      expect(mensaje).toContain('https://nexora.app/c?t=pos99887');
    });
  });

  describe('codificarPayload y decodificarPayload (Fallback)', () => {
    it('debe codificar y decodificar payloads de comprobante sin pérdidas', () => {
      const original = {
        tipo: 'FACTURA',
        numero: '001-001-000000088',
        total: 55.0,
        items: [{ desc: 'Zapatos', cant: 2 }],
      };

      const codificado = codificarPayload(original);
      expect(typeof codificado).toBe('string');
      expect(codificado.length).toBeGreaterThan(0);

      const decodificado = decodificarPayload(codificado);
      expect(decodificado).toEqual(original);
    });
  });
});

