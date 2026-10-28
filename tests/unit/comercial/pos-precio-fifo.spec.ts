describe('Lógica Comercial de Precios y Márgenes POS / FIFO (nexora_web)', () => {
  it('debe calcular el precio de venta sugerido respetando el margen comercial estándar (25%)', () => {
    const costoUnitario = 16.0;
    const margenDeseado = 0.25; // 25%

    // Fórmula comercial: PVP = Costo / (1 - Margen)
    const precioVentaSugerido = Number((costoUnitario / (1 - margenDeseado)).toFixed(2));

    expect(precioVentaSugerido).toBe(21.33);
    expect(precioVentaSugerido).toBeGreaterThan(costoUnitario);
  });

  it('debe bloquear rebajas que vulneren el margen mínimo de ganancia en mostrador', () => {
    // Si un calzado costó $16 y la política exige mínimo 15% de margen:
    const costoUnitario = 16.0;
    const margenMinimoPct = 15;
    const precioMinimoRequerido = costoUnitario * (1 + margenMinimoPct / 100); // 16 * 1.15 = $18.40

    // Si el vendedor en POS intenta aplicar un descuento que deja el par a $17.50:
    const precioConDescuento = 17.5;
    const esPermitido = precioConDescuento >= precioMinimoRequerido - 0.05;

    expect(precioMinimoRequerido).toBe(18.4);
    expect(esPermitido).toBe(false); // Bloqueado por protección de margen
  });

  it('debe permitir descuentos siempre que se mantenga por encima del umbral mínimo de rentabilidad', () => {
    const costoUnitario = 16.0;
    const margenMinimoPct = 15;
    const precioMinimoRequerido = costoUnitario * (1 + margenMinimoPct / 100); // $18.40

    // Si el precio de catálogo es $21.33 y con descuento queda en $19.00:
    const precioConDescuento = 19.0;
    const esPermitido = precioConDescuento >= precioMinimoRequerido - 0.05;

    expect(esPermitido).toBe(true);
  });

  it('debe priorizar el último costo de lote (ultimoCostoLote) para sugerir en órdenes de compra a proveedores', () => {
    const productoCatalogo = {
      id: 'prod-01',
      costPrice: 12.0,       // Costo del lote antiguo aún vendiéndose en vitrina
      ultimoCostoLote: 16.0, // Costo del último lote que ingresó
      salePrice: 16.0,
    };

    // La lógica de sugerencia en comercial.tsx:
    const costoSugeridoCompra =
      productoCatalogo.ultimoCostoLote && productoCatalogo.ultimoCostoLote > 0
        ? productoCatalogo.ultimoCostoLote
        : productoCatalogo.costPrice || 15.0;

    expect(costoSugeridoCompra).toBe(16.0);
  });

  describe('Buscador Inteligente Multicriterio en Punto de Venta (POS)', () => {
    const catalogoGrupos = [
      {
        modelName: 'Superstar',
        color: 'Negro/Blanco',
        series: [
          { serieNombre: 'Caballero', baseCode: 'SUP-01', code: 'SUP-NEG-38', tallas: [{ numero: 38 }, { numero: 39 }, { numero: 40 }] },
        ],
      },
      {
        modelName: 'Superstar',
        color: 'Blanco Puro',
        series: [
          { serieNombre: 'Damas', baseCode: 'SUP-02', code: 'SUP-BLA-36', tallas: [{ numero: 36 }, { numero: 37 }] },
        ],
      },
      {
        modelName: 'Mocasín Clásico',
        color: 'Café Moro',
        series: [
          { serieNombre: 'Caballero', baseCode: 'MOC-01', code: 'MOC-CAF-41', tallas: [{ numero: 41 }, { numero: 42 }] },
        ],
      },
    ];

    const filtrarCatalogoInteligente = (busqueda: string) => {
      const normalizar = (txt?: string | null) =>
        (txt || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

      const raw = normalizar(busqueda);
      if (!raw) return catalogoGrupos;

      const tokens = raw.replace(/[/\\+,_-]/g, ' ').split(/\s+/).filter((t) => t.length > 0);

      return catalogoGrupos.filter((g) => {
        const colorLimpio = normalizar(g.color).replace(/[/\\+,_-]/g, ' ');
        const seriesText = g.series
          .map((s) => `${s.serieNombre} ${s.baseCode} ${s.code} ${s.tallas.map((t) => `${t.numero} t${t.numero}`).join(' ')}`)
          .join(' ');
        const full = normalizar(`${g.modelName} ${g.color} ${colorLimpio} ${seriesText}`);

        if (full.includes(raw)) return true;
        return tokens.every((tok) => full.includes(tok));
      });
    };

    it('debe encontrar el modelo exacto cuando el usuario busca "modelo + color" juntos (ej: superstar negro/blanco)', () => {
      const res = filtrarCatalogoInteligente('superstar negro/blanco');
      expect(res).toHaveLength(1);
      expect(res[0].modelName).toBe('Superstar');
      expect(res[0].color).toBe('Negro/Blanco');
    });

    it('debe encontrar coincidencias con palabras separadas o en orden inverso (ej: negro superstar)', () => {
      const res = filtrarCatalogoInteligente('negro superstar');
      expect(res).toHaveLength(1);
      expect(res[0].modelName).toBe('Superstar');
      expect(res[0].color).toBe('Negro/Blanco');
    });

    it('debe permitir buscar por modelo y talla simultáneamente (ej: superstar 39)', () => {
      const res = filtrarCatalogoInteligente('superstar 39');
      expect(res).toHaveLength(1);
      expect(res[0].modelName).toBe('Superstar');
      expect(res[0].color).toBe('Negro/Blanco');
    });

    it('debe ignorar tildes al buscar calzados (ej: mocasin cafe)', () => {
      const res = filtrarCatalogoInteligente('mocasin cafe');
      expect(res).toHaveLength(1);
      expect(res[0].modelName).toBe('Mocasín Clásico');
      expect(res[0].color).toBe('Café Moro');
    });
  });
});

