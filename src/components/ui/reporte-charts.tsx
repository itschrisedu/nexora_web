"use client";

import React, { useState } from 'react';

// ══════════════════════════════════════════════════════════════
// 1. INTERFACES Y MODELOS COMUNES
// ══════════════════════════════════════════════════════════════

export interface ChartBarItem {
  id?: string;
  label: string;
  valor: number;
  valorFormateado?: string;
  subtexto?: string;
  color?: string;
  porcentaje?: number;
}

export interface ChartCurvePoint {
  label: string;
  valor: number;
  valor2?: number;
  valorFormateado?: string;
  valor2Formateado?: string;
  subtexto?: string;
}

export interface ChartDonutItem {
  id?: string;
  label: string;
  valor: number;
  color: string;
  subtexto?: string;
  porcentaje?: number;
}

// Paleta institucional elegante por defecto (respetando modo claro)
const PALETA_DEFAULT = [
  '#0EA5E9', // Sky blue
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
  '#F97316', // Orange
];

// ══════════════════════════════════════════════════════════════
// 2. COMPONENTE: GRÁFICO DE BARRAS MODERNO (HORIZONTAL / VERTICAL)
// ══════════════════════════════════════════════════════════════

interface GraficoBarrasModernoProps {
  items: ChartBarItem[];
  titulo?: string;
  subtitulo?: string;
  orientacion?: 'horizontal' | 'vertical';
  primaryColor?: string;
  mostrarPorcentajes?: boolean;
  emptyMessage?: string;
  maxAlturaPx?: number;
  unidad?: string;
}

export const GraficoBarrasModerno: React.FC<GraficoBarrasModernoProps> = ({
  items,
  titulo,
  subtitulo,
  orientacion = 'horizontal',
  primaryColor = '#0F172A',
  mostrarPorcentajes = true,
  emptyMessage = 'No hay datos suficientes para graficar en este periodo.',
  maxAlturaPx = 320,
  unidad = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--muted-foreground)] italic bg-[var(--card)] border border-[var(--border)] rounded-3xl">
        {emptyMessage}
      </div>
    );
  }

  const maxValor = Math.max(...items.map((i) => i.valor), 1);
  const totalSuma = items.reduce((acc, i) => acc + i.valor, 0);

  return (
    <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4 shadow-xs">
      {(titulo || subtitulo) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[var(--border)] pb-3">
          <div>
            {titulo && (
              <h4 className="font-extrabold text-sm text-[var(--foreground)] tracking-tight">
                {titulo}
              </h4>
            )}
            {subtitulo && (
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {subtitulo}
              </p>
            )}
          </div>
          {totalSuma > 0 && (
            <span className="text-[11px] font-mono font-bold text-[var(--muted-foreground)] self-start sm:self-auto px-2.5 py-1 bg-[var(--muted)]/40 rounded-xl">
              Total: {unidad ? `${unidad} ` : ''}{totalSuma.toLocaleString('es-EC', { maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      )}

      {orientacion === 'horizontal' ? (
        <div className="space-y-3 pt-1">
          {items.map((item, idx) => {
            const pct = Math.min(100, Math.max(0, (item.valor / maxValor) * 100));
            const share = totalSuma > 0 ? (item.valor / totalSuma) * 100 : 0;
            const barColor = item.color || PALETA_DEFAULT[idx % PALETA_DEFAULT.length];
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={item.id || idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`p-2.5 rounded-2xl transition-all duration-200 ${
                  isHovered ? 'bg-[var(--muted)]/40 shadow-xs' : 'bg-transparent'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: barColor }}
                    />
                    <span className="font-bold text-[var(--foreground)] truncate text-xs">
                      {item.label}
                    </span>
                    {item.subtexto && (
                      <span className="text-[10px] text-[var(--muted-foreground)] hidden sm:inline truncate">
                        • {item.subtexto}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-black text-xs text-[var(--foreground)]">
                      {item.valorFormateado || `${unidad ? `${unidad} ` : ''}${item.valor.toLocaleString('es-EC')}`}
                    </span>
                    {mostrarPorcentajes && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[var(--muted)]/60 text-[var(--muted-foreground)] border border-[var(--border)]/40 min-w-[42px] text-center">
                        {share.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra cilíndrica estilizada */}
                <div className="w-full bg-[var(--muted)]/40 h-3 rounded-full overflow-hidden p-0.5 border border-[var(--border)]/40 relative">
                  <div
                    style={{
                      width: `${pct}%`,
                      backgroundColor: barColor,
                    }}
                    className="h-full rounded-full transition-all duration-500 shadow-2xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Orientación Vertical: Estilo columnas modernas con bordes redondeados */
        <div
          style={{ height: `${maxAlturaPx}px` }}
          className="flex items-end justify-between gap-3 pt-6 pb-2 px-2 overflow-x-auto"
        >
          {items.map((item, idx) => {
            const pct = Math.min(100, Math.max(6, (item.valor / maxValor) * 100));
            const barColor = item.color || PALETA_DEFAULT[idx % PALETA_DEFAULT.length];
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={item.id || idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="flex-1 flex flex-col items-center h-full justify-end min-w-[44px] max-w-[80px] group cursor-pointer"
              >
                {/* Valor superior */}
                <span className="text-[10px] font-mono font-bold text-[var(--foreground)] mb-1.5 transition-transform group-hover:scale-110">
                  {item.valorFormateado || item.valor.toLocaleString('es-EC')}
                </span>

                {/* Columna redondeada */}
                <div className="w-full bg-[var(--muted)]/30 rounded-2xl p-1 h-full flex flex-col justify-end border border-[var(--border)]/30">
                  <div
                    style={{
                      height: `${pct}%`,
                      backgroundColor: barColor,
                    }}
                    className={`w-full rounded-xl transition-all duration-500 shadow-2xs ${
                      isHovered ? 'brightness-110 shadow-md' : ''
                    }`}
                  />
                </div>

                {/* Etiqueta inferior */}
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] mt-2 truncate w-full text-center">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 3. COMPONENTE: GRÁFICO DE CURVA SUAVE CON GRADIENTE DE ÁREA
// ══════════════════════════════════════════════════════════════

interface GraficoCurvaTendenciaProps {
  puntos: ChartCurvePoint[];
  titulo?: string;
  subtitulo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  serie1Nombre?: string;
  serie2Nombre?: string;
  altura?: number;
  emptyMessage?: string;
}

export const GraficoCurvaTendencia: React.FC<GraficoCurvaTendenciaProps> = ({
  puntos,
  titulo,
  subtitulo,
  primaryColor = '#0EA5E9',
  secondaryColor = '#10B981',
  serie1Nombre = 'Facturación ($)',
  serie2Nombre,
  altura = 240,
  emptyMessage = 'No hay datos temporales para graficar en este periodo.',
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!puntos || puntos.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--muted-foreground)] italic bg-[var(--card)] border border-[var(--border)] rounded-3xl">
        {emptyMessage}
      </div>
    );
  }

  const svgWidth = 800;
  const svgHeight = altura;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const maxVal1 = Math.max(...puntos.map((p) => p.valor), 1);
  const maxVal2 = serie2Nombre ? Math.max(...puntos.map((p) => p.valor2 ?? 0), 1) : 1;

  // Coordenadas calculadas
  const coords1 = puntos.map((p, idx) => {
    const x = puntos.length === 1
      ? svgWidth / 2
      : paddingX + (idx / (puntos.length - 1)) * chartW;
    const y = paddingTop + chartH - (p.valor / maxVal1) * chartH;
    return { x, y, punto: p };
  });

  const coords2 = serie2Nombre
    ? puntos.map((p, idx) => {
        const x = puntos.length === 1
          ? svgWidth / 2
          : paddingX + (idx / (puntos.length - 1)) * chartW;
        const y = paddingTop + chartH - ((p.valor2 ?? 0) / maxVal2) * chartH;
        return { x, y, punto: p };
      })
    : [];

  // Función constructora de curva Bezier suave
  const buildSmoothCurve = (points: { x: number; y: number }[]): string => {
    if (points.length <= 1) return points.length === 1 ? `M ${points[0].x} ${points[0].y}` : '';
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 5;
      const cp1y = p1.y + (p2.y - p0.y) / 5;
      const cp2x = p2.x - (p3.x - p1.x) / 5;
      const cp2y = p2.y - (p3.y - p1.y) / 5;

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  };

  const lineD1 = buildSmoothCurve(coords1);
  const areaD1 = coords1.length > 0
    ? `${lineD1} L ${coords1[coords1.length - 1].x.toFixed(2)} ${(paddingTop + chartH).toFixed(2)} L ${coords1[0].x.toFixed(2)} ${(paddingTop + chartH).toFixed(2)} Z`
    : '';

  const lineD2 = coords2.length > 0 ? buildSmoothCurve(coords2) : '';
  const areaD2 = coords2.length > 0
    ? `${lineD2} L ${coords2[coords2.length - 1].x.toFixed(2)} ${(paddingTop + chartH).toFixed(2)} L ${coords2[0].x.toFixed(2)} ${(paddingTop + chartH).toFixed(2)} Z`
    : '';

  const activePoint = activeIdx !== null ? puntos[activeIdx] : null;

  return (
    <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4 shadow-xs relative">
      {/* Cabecera del gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div>
          {titulo && (
            <h4 className="font-extrabold text-sm text-[var(--foreground)] tracking-tight">
              {titulo}
            </h4>
          )}
          {subtitulo && (
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {subtitulo}
            </p>
          )}
        </div>

        {/* Leyenda interactiva */}
        <div className="flex items-center gap-3 text-xs font-bold self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-1.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <span className="text-[11px] text-[var(--foreground)]">{serie1Nombre}</span>
          </div>
          {serie2Nombre && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-1.5 rounded-full"
                style={{ backgroundColor: secondaryColor }}
              />
              <span className="text-[11px] text-[var(--foreground)]">{serie2Nombre}</span>
            </div>
          )}
        </div>
      </div>

      {/* Área SVG del Gráfico */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Gradiente Serie 1 */}
            <linearGradient id="gradienteArea1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.32" />
              <stop offset="60%" stopColor={primaryColor} stopOpacity="0.10" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0.00" />
            </linearGradient>

            {/* Gradiente Serie 2 */}
            {serie2Nombre && (
              <linearGradient id="gradienteArea2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.25" />
                <stop offset="70%" stopColor={secondaryColor} stopOpacity="0.06" />
                <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.00" />
              </linearGradient>
            )}
          </defs>

          {/* Líneas de cuadrícula horizontales sutiles */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + chartH * ratio;
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={svgWidth - paddingX}
                y2={y}
                stroke="currentColor"
                className="text-[var(--border)] opacity-60"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Área sombreada Serie 2 (fondo) */}
          {serie2Nombre && coords2.length > 0 && (
            <path d={areaD2} fill="url(#gradienteArea2)" />
          )}

          {/* Trazo Serie 2 */}
          {serie2Nombre && coords2.length > 0 && (
            <path
              d={lineD2}
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Área sombreada Serie 1 */}
          {coords1.length > 0 && (
            <path d={areaD1} fill="url(#gradienteArea1)" />
          )}

          {/* Trazo Serie 1 */}
          {coords1.length > 0 && (
            <path
              d={lineD1}
              fill="none"
              stroke={primaryColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* Puntos y disparadores hover */}
          {coords1.map((c, idx) => {
            const isActive = activeIdx === idx;
            return (
              <g key={idx}>
                {/* Línea vertical activa */}
                {isActive && (
                  <line
                    x1={c.x}
                    y1={paddingTop}
                    x2={c.x}
                    y2={paddingTop + chartH}
                    stroke="currentColor"
                    className="text-blue-500"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Círculo indicador */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isActive ? 6 : 3.5}
                  fill="#FFFFFF"
                  stroke={primaryColor}
                  strokeWidth={isActive ? 3 : 2}
                  className="transition-all duration-200"
                />

                {/* Zona de impacto táctil / hover */}
                <rect
                  x={c.x - (chartW / puntos.length) / 2}
                  y={paddingTop}
                  width={chartW / puntos.length}
                  height={chartH + paddingBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx(null)}
                />

                {/* Etiquetas de fechas / periodos en el eje X */}
                {(puntos.length <= 10 || idx % Math.ceil(puntos.length / 8) === 0 || idx === puntos.length - 1) && (
                  <text
                    x={c.x}
                    y={paddingTop + chartH + 18}
                    textAnchor="middle"
                    className="fill-[var(--muted-foreground)] text-[10px] font-bold"
                  >
                    {c.punto.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip flotante interactivo */}
        {activePoint && activeIdx !== null && (
          <div
            style={{
              left: `${Math.min(85, Math.max(15, (coords1[activeIdx].x / svgWidth) * 100))}%`,
              top: '12px',
            }}
            className="absolute -translate-x-1/2 bg-[var(--popover)] border border-[var(--border)] shadow-lg rounded-2xl p-3 z-20 pointer-events-none min-w-[150px] transition-all"
          >
            <div className="text-[11px] font-bold text-[var(--muted-foreground)] border-b border-[var(--border)]/60 pb-1 mb-1.5">
              {activePoint.label}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-bold flex items-center gap-1.5" style={{ color: primaryColor }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                  {serie1Nombre}:
                </span>
                <span className="font-mono font-black text-[var(--foreground)]">
                  {activePoint.valorFormateado || `$${activePoint.valor.toFixed(2)}`}
                </span>
              </div>
              {serie2Nombre && activePoint.valor2 !== undefined && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold flex items-center gap-1.5" style={{ color: secondaryColor }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
                    {serie2Nombre}:
                  </span>
                  <span className="font-mono font-black text-[var(--foreground)]">
                    {activePoint.valor2Formateado || `${activePoint.valor2} pares`}
                  </span>
                </div>
              )}
              {activePoint.subtexto && (
                <div className="text-[10px] text-[var(--muted-foreground)] pt-0.5">
                  {activePoint.subtexto}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 4. COMPONENTE: GRÁFICO CIRCULAR / DONUT MODERNO
// ══════════════════════════════════════════════════════════════

interface GraficoDonutCircularProps {
  items: ChartDonutItem[];
  titulo?: string;
  subtitulo?: string;
  valorCentro?: string;
  etiquetaCentro?: string;
  size?: number;
  emptyMessage?: string;
}

export const GraficoDonutCircular: React.FC<GraficoDonutCircularProps> = ({
  items,
  titulo,
  subtitulo,
  valorCentro,
  etiquetaCentro,
  size = 190,
  emptyMessage = 'Sin datos disponibles para graficar.',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--muted-foreground)] italic bg-[var(--card)] border border-[var(--border)] rounded-3xl">
        {emptyMessage}
      </div>
    );
  }

  const total = items.reduce((acc, i) => acc + (i.valor || 0), 0);
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Cálculo de los arcos SVG con strokeDasharray y strokeDashoffset
  let accumulatedOffset = 0;
  const segments = items.map((item, idx) => {
    const fraction = total > 0 ? item.valor / total : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += fraction * circumference;
    const share = (fraction * 100).toFixed(1);

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      share,
      color: item.color || PALETA_DEFAULT[idx % PALETA_DEFAULT.length],
    };
  });

  const displayCenterValue = valorCentro || (hoveredIdx !== null ? `${segments[hoveredIdx].share}%` : `${total.toLocaleString('es-EC')}`);
  const displayCenterLabel = etiquetaCentro || (hoveredIdx !== null ? segments[hoveredIdx].label : 'Total General');

  return (
    <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl space-y-4 shadow-xs">
      {(titulo || subtitulo) && (
        <div className="border-b border-[var(--border)] pb-3">
          {titulo && (
            <h4 className="font-extrabold text-sm text-[var(--foreground)] tracking-tight">
              {titulo}
            </h4>
          )}
          {subtitulo && (
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {subtitulo}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-5 pt-1">
        {/* Anillo Donut SVG */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90 select-none">
            {/* Anillo base de fondo */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              className="text-[var(--muted)]/40"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Segmentos de color */}
            {segments.map((seg, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  fill="transparent"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Centro del Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
            <span className="text-xl font-black text-[var(--foreground)] font-mono tracking-tight leading-tight">
              {displayCenterValue}
            </span>
            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider line-clamp-1 mt-0.5">
              {displayCenterLabel}
            </span>
          </div>
        </div>

        {/* Leyenda y Desglose debajo */}
        <div className="w-full space-y-1.5">
          {segments.map((seg, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`p-2 rounded-xl transition-all cursor-pointer border ${
                  isHovered
                    ? 'bg-[var(--muted)]/50 border-[var(--border)] shadow-xs'
                    : 'bg-transparent border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="font-bold text-[var(--foreground)] truncate text-[11px]">
                      {seg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono font-black text-[11px] text-[var(--foreground)]">
                      {seg.valor.toLocaleString('es-EC')}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[var(--muted)]/60 text-[var(--muted-foreground)]">
                      {seg.share}%
                    </span>
                  </div>
                </div>
                {seg.subtexto && (
                  <div className="text-[10px] text-[var(--muted-foreground)] pl-5 truncate">
                    {seg.subtexto}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// 5. COMPONENTE: TARJETA KPI MODERNA & ELEGANTE
// ══════════════════════════════════════════════════════════════

interface TarjetaKpiModernaProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icono?: React.ReactNode;
  primaryColor?: string;
  tendencia?: {
    valor: string;
    positivo: boolean;
  };
  destacado?: boolean;
}

export const TarjetaKpiModerna: React.FC<TarjetaKpiModernaProps> = ({
  titulo,
  valor,
  subtitulo,
  icono,
  primaryColor = '#0F172A',
  tendencia,
  destacado = false,
}) => {
  return (
    <div
      className={`p-5 bg-[var(--card)] border rounded-3xl space-y-3 shadow-xs transition-all relative overflow-hidden ${
        destacado
          ? 'border-blue-500/30 bg-blue-500/5'
          : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-[var(--muted-foreground)] tracking-wider">
          {titulo}
        </span>
        {icono && (
          <div
            className="p-2.5 rounded-2xl shadow-2xs"
            style={{
              backgroundColor: `${primaryColor}15`,
              color: primaryColor,
            }}
          >
            {icono}
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl font-black text-[var(--foreground)] font-mono tracking-tight">
          {valor}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {tendencia && (
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                tendencia.positivo
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
              }`}
            >
              {tendencia.valor}
            </span>
          )}
          {subtitulo && (
            <span className="text-[11px] text-[var(--muted-foreground)] font-semibold truncate">
              {subtitulo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

