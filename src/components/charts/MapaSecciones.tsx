import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { geoMercator, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';

// ═══════════════════════════════════════════════════════════════
// MapaSecciones — Choropleth of the 8 PBA electoral sections
// ═══════════════════════════════════════════════════════════════

export interface SeccionDatum {
  seccion: string;          // 'I' .. 'VIII'
  ganador: string;          // agrupación ganadora
  porcentaje: number;       // % del ganador
  votos_total: number;      // votos totales (positivos)
}

interface MapaSeccionesProps {
  data: SeccionDatum[];
  title?: string;
  height?: number;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  seccion: string;
  fna: string;
  ganador: string;
  porcentaje: number;
  total: number;
}

// Categorical palette: distinct colors for distinct winners
const CATEGORICAL_DARK = ['#00d4ff', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#84cc16', '#6366f1'];
const CATEGORICAL_LIGHT = ['#0284c7', '#9333ea', '#d97706', '#059669', '#dc2626', '#db2777', '#65a30d', '#4f46e5'];

export function MapaSecciones({ data, title, height = 520 }: MapaSeccionesProps) {
  const theme = useStore(s => s.theme);
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);

  const [geo, setGeo] = useState<any>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false, x: 0, y: 0, seccion: '', fna: '', ganador: '', porcentaje: 0, total: 0,
  });
  const [hovered, setHovered] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  useEffect(() => {
    fetch('/data/pba-secciones-electorales.geojson')
      .then(r => r.json())
      .then(g => setGeo(g))
      .catch(err => console.error('Failed to load secciones geojson:', err));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(container);
    setContainerWidth(container.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Map seccion -> data
  const dataLookup = useMemo(() => {
    const m = new Map<string, SeccionDatum>();
    for (const d of data) m.set(d.seccion, d);
    return m;
  }, [data]);

  // Map ganador -> color (categorical, deterministic by appearance order)
  const colorByGanador = useMemo(() => {
    const palette = isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
    const m = new Map<string, string>();
    let i = 0;
    for (const d of data) {
      if (!m.has(d.ganador)) {
        m.set(d.ganador, palette[i % palette.length]);
        i++;
      }
    }
    return m;
  }, [data, isDark]);

  const { features, pathGenerator } = useMemo(() => {
    if (!geo) return { features: [], pathGenerator: null };
    const w = containerWidth;
    const h = height;
    const projection = geoMercator().fitSize([w, h], geo);
    const pathGen = geoPath().projection(projection);
    return { features: geo.features || [], pathGenerator: pathGen };
  }, [geo, containerWidth, height]);

  const handleMove = useCallback((e: React.MouseEvent, props: any) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const seccion = props.seccion || '';
    const fna = props.fna || `Sección ${seccion}`;
    const d = dataLookup.get(seccion);
    setTooltip({
      show: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 12,
      seccion,
      fna,
      ganador: d?.ganador || 'Sin datos',
      porcentaje: d?.porcentaje || 0,
      total: d?.votos_total || 0,
    });
  }, [dataLookup]);

  const handleLeave = useCallback(() => {
    setTooltip(t => ({ ...t, show: false }));
    setHovered(null);
  }, []);

  if (!geo) {
    return (
      <div className="mapa-pba-container" ref={containerRef} style={{ height }}>
        <div className="mapa-pba-loading">
          <div className="mapa-pba-spinner" />
          <span>Cargando mapa...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mapa-pba-container" ref={containerRef}>
      {title && <h4 className="mapa-pba-title">{title}</h4>}
      <svg
        viewBox={`0 0 ${containerWidth} ${height}`}
        width="100%"
        height={height}
        className="mapa-pba-svg"
      >
        {pathGenerator && features.map((feat: any, i: number) => {
          const seccion = feat.properties?.seccion || '';
          const datum = dataLookup.get(seccion);
          const isHovered = hovered === seccion;
          const fillColor = datum
            ? colorByGanador.get(datum.ganador) || (isDark ? '#444' : '#aaa')
            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)');
          const strokeColor = isHovered
            ? '#ffffff'
            : isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)';
          return (
            <path
              key={i}
              d={pathGenerator(feat as GeoPermissibleObjects) || ''}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isHovered ? 2.5 : 1}
              style={{
                cursor: 'pointer',
                transition: 'fill 0.2s ease, stroke-width 0.15s ease',
                filter: isHovered ? 'brightness(1.15)' : 'none',
              }}
              onMouseEnter={() => setHovered(seccion)}
              onMouseMove={e => handleMove(e, feat.properties || {})}
              onMouseLeave={handleLeave}
            />
          );
        })}
      </svg>

      {/* Categorical legend */}
      <div
        className="mapa-pba-legend"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '8px 14px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {[...colorByGanador.entries()].map(([ganador, color]) => (
          <span
            key={ganador}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: color,
                display: 'inline-block',
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>{ganador}</span>
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="mapa-pba-tooltip"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <strong>{tooltip.fna}</strong>
          <span>
            {tooltip.ganador} — {tooltip.porcentaje}%<br />
            {tooltip.total.toLocaleString('es-AR')} votos
          </span>
        </div>
      )}
    </div>
  );
}
