import { useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  Layer,
  Source,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildChoroplethScale } from '../../../lib/conurbano/seguridad/colorScale';
import { useStore } from '../../../store/useStore';

const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

export type ChoroplethProps = {
  geo: GeoJSON.FeatureCollection | null;
  values: Record<string, number>;
  selectedId?: string | null;
  selectedIds?: string[];
  onSelect?: (id: string | null) => void;
  renderHover?: (partidoId: string, nombre: string, value: number) => React.ReactNode;
  legendTitle: string;
  legendSubtitle?: string;
  valueFormat?: (n: number) => string;
};

export default function Choropleth({
  geo,
  values,
  selectedId,
  selectedIds,
  onSelect,
  renderHover,
  legendTitle,
  legendSubtitle,
  valueFormat,
}: ChoroplethProps) {
  const theme = useStore((s) => s.theme);
  const selSet = useMemo(() => {
    const arr = selectedIds ?? (selectedId ? [selectedId] : []);
    return arr.filter(Boolean);
  }, [selectedIds, selectedId]);
  const mapRef = useRef<MapRef | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const tick = () => {
      const map = mapRef.current?.getMap();
      const canvas = el.querySelector('canvas') as HTMLCanvasElement | null;
      const parentW = el.clientWidth;
      if (map && canvas && parentW > 0 && Math.abs(canvas.clientWidth - parentW) > 2) {
        map.resize();
      }
    };
    const obs = new ResizeObserver(tick);
    obs.observe(el);
    const iv = setInterval(tick, 250);
    const stop = setTimeout(() => clearInterval(iv), 4000);
    return () => {
      obs.disconnect();
      clearInterval(iv);
      clearTimeout(stop);
    };
  }, [geo]);

  const { geoWithValue, scale } = useMemo(() => {
    if (!geo) return { geoWithValue: null, scale: null };
    const nums: number[] = [];
    const features = geo.features.map((f) => {
      const id = (f.properties?.departamento_id as string) ?? '';
      const v = values[id] ?? 0;
      nums.push(v);
      return { ...f, id, properties: { ...f.properties, value: v } };
    });
    return {
      geoWithValue: { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection,
      scale: buildChoroplethScale(nums),
    };
  }, [geo, values]);

  const fillColor = useMemo(() => {
    if (!scale) return '#f3f0ea';
    if (scale.stops.length === 1) return scale.stops[0][1];
    const expr: (string | number | unknown[])[] = [
      'interpolate',
      ['linear'],
      ['get', 'value'],
    ];
    scale.stops.forEach(([v, c]) => {
      expr.push(v, c);
    });
    return expr as unknown as string;
  }, [scale]);

  const onClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) {
      onSelect?.(null);
      return;
    }
    onSelect?.((f.properties?.departamento_id as string) ?? null);
  };

  const onHover = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    setHoverId(f ? ((f.properties?.departamento_id as string) ?? null) : null);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -58.55, latitude: -34.65, zoom: 9.1 }}
        mapStyle={theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
        interactiveLayerIds={['partidos-fill']}
        onClick={onClick}
        onMouseMove={onHover}
        onMouseLeave={() => setHoverId(null)}
        maxBounds={[
          [-59.3, -35.25],
          [-57.6, -34.0],
        ]}
        minZoom={8.5}
        maxZoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        {geoWithValue && (
          <Source id="partidos" type="geojson" data={geoWithValue} promoteId="departamento_id">
            <Layer
              id="partidos-fill"
              type="fill"
              paint={{ 'fill-color': fillColor as never, 'fill-opacity': 0.78 }}
            />
            <Layer
              id="partidos-line"
              type="line"
              paint={{
                'line-color': [
                  'case',
                  ['in', ['get', 'departamento_id'], ['literal', selSet]],
                  '#00d4ff',
                  theme === 'dark' ? '#1a1f2e' : '#101215',
                ],
                'line-width': [
                  'case',
                  ['in', ['get', 'departamento_id'], ['literal', selSet]],
                  2.5,
                  ['==', ['get', 'departamento_id'], hoverId ?? ''],
                  1.6,
                  0.6,
                ],
              }}
            />
          </Source>
        )}
      </Map>

      <HoverCard
        geo={geoWithValue}
        id={hoverId}
        render={renderHover}
        fallbackFormat={valueFormat}
      />
      <Leyenda scale={scale} title={legendTitle} subtitle={legendSubtitle} />
    </div>
  );
}

function Leyenda({
  scale,
  title,
  subtitle,
}: {
  scale: ReturnType<typeof buildChoroplethScale> | null;
  title: string;
  subtitle?: string;
}) {
  if (!scale || scale.legend.length === 0) return null;
  return (
    <div className="conu-legend" style={{ left: 12, bottom: 12, width: 230 }}>
      <div className="conu-eyebrow">{title}</div>
      {subtitle && (
        <div
          className="conu-legend-title"
          title={subtitle}
        >
          {subtitle}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {scale.legend.map(([label, color]) => (
          <div key={label} className="conu-legend-row">
            <span className="conu-legend-swatch" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HoverCard({
  geo,
  id,
  render,
  fallbackFormat,
}: {
  geo: GeoJSON.FeatureCollection | null;
  id: string | null;
  render?: (partidoId: string, nombre: string, value: number) => React.ReactNode;
  fallbackFormat?: (n: number) => string;
}) {
  if (!geo || !id) return null;
  const f = geo.features.find((x) => x.properties?.departamento_id === id);
  if (!f) return null;
  const nombre = (f.properties?.nombre as string) ?? '';
  const value = Number(f.properties?.value ?? 0);

  const content = render ? (
    render(id, nombre, value)
  ) : (
    <>
      <div className="conu-eyebrow">Partido</div>
      <div
        style={{
          marginTop: 2,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {nombre}
      </div>
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
        {fallbackFormat
          ? fallbackFormat(value)
          : value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
      </div>
    </>
  );

  return (
    <div
      className="conu-tooltip"
      style={{
        position: 'absolute',
        right: 12,
        top: 12,
        left: 'auto',
        width: 290,
        maxWidth: 'calc(100% - 24px)',
        pointerEvents: 'none',
      }}
    >
      {content}
    </div>
  );
}
