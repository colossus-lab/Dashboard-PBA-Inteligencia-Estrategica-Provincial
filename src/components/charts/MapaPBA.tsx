import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import type { MapDataItem } from '../../types/report';
import * as topojson from 'topojson-client';
import { geoMercator, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';

// ═══════════════════════════════════════════════════════════════
// MapaPBA — Interactive SVG Choropleth of 135 PBA Municipalities
// ═══════════════════════════════════════════════════════════════

interface MapaPBAProps {
  mapData: MapDataItem[];
  title?: string;
  height?: number;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  name: string;
  value: string;
}

// Normalize municipality name for matching
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Interpolate between two hex colors
function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// 5-stop color scale: green → yellow-green → yellow → orange → red
function getValueColor(value: number, min: number, max: number, isDark: boolean): string {
  if (max === min) return isDark ? '#00d4ff' : '#3b82f6';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // 5-stop gradient (good → critical)
  const stops = isDark
    ? ['#10b981', '#6ee7b7', '#fbbf24', '#f97316', '#ef4444']
    : ['#059669', '#34d399', '#f59e0b', '#ea580c', '#dc2626'];

  const segmentCount = stops.length - 1;
  const segment = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
  const segT = (t * segmentCount) - segment;
  return interpolateColor(stops[segment], stops[segment + 1], segT);
}

export function MapaPBA({ mapData, title, height = 500 }: MapaPBAProps) {
  const theme = useStore(s => s.theme);
  const isDark = theme === 'dark';
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [topoData, setTopoData] = useState<any>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, x: 0, y: 0, name: '', value: '' });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  // Load TopoJSON
  useEffect(() => {
    fetch('/data/pba-municipios.topojson')
      .then(r => r.json())
      .then(data => setTopoData(data))
      .catch(err => console.error('Failed to load PBA map:', err));
  }, []);

  // Responsive width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    setContainerWidth(container.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Build lookup map: normalizedName -> MapDataItem
  const dataLookup = useMemo(() => {
    const m = new Map<string, MapDataItem>();
    for (const item of mapData) {
      m.set(normalizeName(item.municipioNombre), item);
    }
    return m;
  }, [mapData]);

  // Value range for color scale
  const { minVal, maxVal } = useMemo(() => {
    if (mapData.length === 0) return { minVal: 0, maxVal: 100 };
    const values = mapData.map(d => d.value);
    return { minVal: Math.min(...values), maxVal: Math.max(...values) };
  }, [mapData]);

  // Convert TopoJSON to GeoJSON features + create projection
  const { features, pathGenerator } = useMemo(() => {
    if (!topoData) return { features: [], pathGenerator: null };

    const objectName = Object.keys(topoData.objects)[0];
    const geoFeatures = topojson.feature(topoData, topoData.objects[objectName]) as any;

    const w = containerWidth;
    const h = height;

    const projection = geoMercator().fitSize([w, h], geoFeatures);
    const pathGen = geoPath().projection(projection);

    return { features: geoFeatures.features as any[], pathGenerator: pathGen };
  }, [topoData, containerWidth, height]);

  const handleMouseMove = useCallback((e: React.MouseEvent, name: string, item: MapDataItem | undefined) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      show: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 12,
      name,
      value: item ? item.label : 'Sin datos',
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, show: false }));
    setHoveredId(null);
  }, []);

  if (!topoData) {
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
        ref={svgRef}
        viewBox={`0 0 ${containerWidth} ${height}`}
        width="100%"
        height={height}
        className="mapa-pba-svg"
      >
        {pathGenerator && features.map((feat: any, i: number) => {
          const deptName = feat.properties?.departamento || '';
          const normalizedDept = normalizeName(deptName);
          const item = dataLookup.get(normalizedDept);
          const isHovered = hoveredId === normalizedDept;

          const fillColor = item
            ? getValueColor(item.value, minVal, maxVal, isDark)
            : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

          const strokeColor = isHovered
            ? '#ffffff'
            : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';

          return (
            <path
              key={i}
              d={pathGenerator(feat as GeoPermissibleObjects) || ''}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isHovered ? 2.5 : 0.5}
              style={{
                cursor: 'pointer',
                transition: 'fill 0.2s ease, stroke-width 0.15s ease',
                filter: isHovered ? 'brightness(1.2)' : 'none',
              }}
              onMouseEnter={() => setHoveredId(normalizedDept)}
              onMouseMove={e => handleMouseMove(e, deptName, item)}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}
      </svg>

      {/* Color Legend */}
      <div className="mapa-pba-legend">
        <span className="mapa-pba-legend-label">{minVal.toFixed(1)}</span>
        <div
          className="mapa-pba-legend-bar"
          style={{
            background: isDark
              ? 'linear-gradient(to right, #10b981, #6ee7b7, #fbbf24, #f97316, #ef4444)'
              : 'linear-gradient(to right, #059669, #34d399, #f59e0b, #ea580c, #dc2626)',
          }}
        />
        <span className="mapa-pba-legend-label">{maxVal.toFixed(1)}</span>
      </div>

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="mapa-pba-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <strong>{tooltip.name}</strong>
          <span>{tooltip.value}</span>
        </div>
      )}
    </div>
  );
}
