import { useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  Layer,
  Source,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildChoroplethScale } from '../../../lib/conurbano/educacion/colorScale';
import { useEducacionStore } from './store';
import {
  RADIO_METRICS,
  type RadiosData,
  type School,
} from '../../../lib/conurbano/educacion/types';
import { useStore } from '../../../store/useStore';

const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

type Props = {
  radiosGeo: GeoJSON.FeatureCollection;
  radios: RadiosData;
  schools: School[];
};

export default function ColegiosMap2D({ radiosGeo, radios, schools }: Props) {
  const {
    radioMetric,
    selectedRadio,
    setSelectedRadio,
    selectedSchoolCue,
    setSelectedSchoolCue,
  } = useEducacionStore();
  const theme = useStore((s) => s.theme);
  const spec = RADIO_METRICS.find((m) => m.id === radioMetric)!;
  const mapRef = useRef<MapRef | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hoverRadio, setHoverRadio] = useState<string | null>(null);
  const [hoverCue, setHoverCue] = useState<string | null>(null);
  const [hoverPx, setHoverPx] = useState<{ x: number; y: number } | null>(null);

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
  }, []);

  const { radiosWithValue, scale } = useMemo(() => {
    const nums: number[] = [];
    const features = radiosGeo.features.map((f) => {
      const id = (f.properties?.radio_id as string) ?? '';
      const r = radios.radios[id];
      const v = r ? Number((r as unknown as Record<string, number>)[radioMetric] ?? 0) : 0;
      nums.push(v);
      return { ...f, id, properties: { ...f.properties, value: v } };
    });
    return {
      radiosWithValue: { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection,
      scale: buildChoroplethScale(nums),
    };
  }, [radiosGeo, radios, radioMetric]);

  const fillColor = useMemo(() => {
    if (!scale) return '#f3f0ea';
    if (scale.stops.length === 1) return scale.stops[0][1];
    const expr: (string | number | unknown[])[] = ['interpolate', ['linear'], ['get', 'value']];
    scale.stops.forEach(([v, c]) => {
      expr.push(v, c);
    });
    return expr as unknown as string;
  }, [scale]);

  const schoolsFc = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: schools.map((s) => ({
        type: 'Feature',
        id: s.cue,
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: {
          cue: s.cue,
          nombre: s.nombre,
          sector: s.sector,
          partido: s.partido,
          decile: s.vulnerability_decile,
          confianza: s.confianza,
        },
      })),
    }),
    [schools],
  );

  const onMouseMove = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) {
      setHoverRadio(null);
      setHoverCue(null);
      setHoverPx(null);
      return;
    }
    setHoverPx({ x: e.point.x, y: e.point.y });
    const layer = f.layer?.id;
    if (layer === 'schools-circle') {
      setHoverCue(((f.properties?.cue as string) ?? null) || null);
      setHoverRadio(null);
    } else {
      setHoverRadio(((f.properties?.radio_id as string) ?? null) || null);
      setHoverCue(null);
    }
  };

  const onClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) {
      setSelectedRadio(null);
      setSelectedSchoolCue(null);
      return;
    }
    const layer = f.layer?.id;
    if (layer === 'schools-circle') {
      setSelectedSchoolCue(((f.properties?.cue as string) ?? null) || null);
    } else {
      setSelectedRadio(((f.properties?.radio_id as string) ?? null) || null);
    }
  };

  const hoveredRadio = hoverRadio ? radios.radios[hoverRadio] : null;
  const hoveredSchool = hoverCue ? schools.find((s) => s.cue === hoverCue) : null;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -58.55, latitude: -34.65, zoom: 9.3 }}
        mapStyle={theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
        interactiveLayerIds={['radios-fill', 'schools-circle']}
        onClick={onClick}
        onMouseMove={onMouseMove}
        onMouseLeave={() => {
          setHoverRadio(null);
          setHoverCue(null);
          setHoverPx(null);
        }}
        maxBounds={[
          [-59.3, -35.25],
          [-57.6, -34.0],
        ]}
        minZoom={8.5}
        maxZoom={16}
        style={{ height: '100%', width: '100%' }}
      >
        <Source id="radios" type="geojson" data={radiosWithValue} promoteId="radio_id">
          <Layer
            id="radios-fill"
            type="fill"
            paint={{ 'fill-color': fillColor as never, 'fill-opacity': 0.62 }}
          />
          <Layer
            id="radios-line"
            type="line"
            paint={{
              'line-color': [
                'case',
                ['==', ['get', 'radio_id'], selectedRadio ?? ''],
                '#00d4ff',
                theme === 'dark' ? '#1a1f2e' : '#101215',
              ],
              'line-width': [
                'case',
                ['==', ['get', 'radio_id'], selectedRadio ?? ''],
                2.5,
                ['==', ['get', 'radio_id'], hoverRadio ?? ''],
                1.4,
                0.18,
              ],
              'line-opacity': 0.7,
            }}
          />
        </Source>

        <Source id="schools" type="geojson" data={schoolsFc} promoteId="cue">
          <Layer
            id="schools-circle"
            type="circle"
            paint={{
              'circle-radius': [
                'case',
                ['==', ['get', 'cue'], selectedSchoolCue ?? ''],
                7,
                ['==', ['get', 'cue'], hoverCue ?? ''],
                5.5,
                ['==', ['get', 'confianza'], 'baja'],
                2.2,
                3.2,
              ],
              'circle-color': [
                'case',
                ['==', ['get', 'confianza'], 'baja'],
                '#9ca3af',
                [
                  'step',
                  ['coalesce', ['get', 'decile'], 0],
                  '#6b7280',
                  1,
                  '#16a34a',
                  3,
                  '#84cc16',
                  5,
                  '#f59e0b',
                  7,
                  '#f97316',
                  9,
                  '#dc2626',
                ],
              ],
              'circle-stroke-color': theme === 'dark' ? '#0a0f1c' : '#0a0a0a',
              'circle-stroke-width': [
                'case',
                ['==', ['get', 'cue'], selectedSchoolCue ?? ''],
                2.2,
                0.6,
              ],
              'circle-opacity': [
                'case',
                ['==', ['get', 'confianza'], 'baja'],
                0.55,
                0.92,
              ],
            }}
          />
        </Source>
      </Map>

      {hoverPx && (hoveredSchool || hoveredRadio) && (
        <div
          className="conu-tooltip"
          style={{
            left: Math.min(hoverPx.x + 14, (wrapperRef.current?.clientWidth ?? 1200) - 290),
            top: Math.min(hoverPx.y + 14, (wrapperRef.current?.clientHeight ?? 700) - 160),
          }}
        >
          {hoveredSchool ? (
            <>
              <div className="conu-eyebrow">Colegio · {hoveredSchool.sector}</div>
              <div className="conu-tooltip-title">{hoveredSchool.nombre}</div>
              <div className="conu-tooltip-sub">
                {hoveredSchool.localidad} · {hoveredSchool.partido}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div className="conu-tooltip-big">
                  {hoveredSchool.vulnerability_decile != null
                    ? `Decil ${hoveredSchool.vulnerability_decile}`
                    : '—'}
                </div>
                <div className="conu-eyebrow" style={{ paddingBottom: 2 }}>
                  vulnerabilidad
                </div>
              </div>
              <div className="conu-tooltip-grid">
                <span>NBI</span>
                <span style={{ textAlign: 'right' }}>{pct(hoveredSchool.nbi_pct)}</span>
                <span>Sin instr.</span>
                <span style={{ textAlign: 'right' }}>{pct(hoveredSchool.pct_sin_instruccion)}</span>
              </div>
            </>
          ) : hoveredRadio ? (
            <>
              <div className="conu-eyebrow">Radio censal · {hoveredRadio.partido}</div>
              <div className="conu-tooltip-title">{hoveredRadio.radio_id}</div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div className="conu-tooltip-big">
                  {spec.format(
                    Number((hoveredRadio as unknown as Record<string, number>)[radioMetric] ?? 0),
                  )}
                </div>
                <div className="conu-eyebrow" style={{ paddingBottom: 2 }}>
                  {spec.label}
                </div>
              </div>
              <div className="conu-tooltip-grid">
                <span>Decil vuln.</span>
                <span style={{ textAlign: 'right' }}>{hoveredRadio.vulnerability_decile}</span>
                <span>NBI</span>
                <span style={{ textAlign: 'right' }}>{pct(hoveredRadio.nbi_pct)}</span>
                <span>Sin instr.</span>
                <span style={{ textAlign: 'right' }}>{pct(hoveredRadio.pct_sin_instruccion)}</span>
                <span>Hogares</span>
                <span style={{ textAlign: 'right' }}>
                  {hoveredRadio.hogares_total.toLocaleString('es-AR')}
                </span>
              </div>
            </>
          ) : null}
        </div>
      )}

      <Leyenda spec={spec} scale={scale} />
      <DecileLegend />
    </div>
  );
}

function Leyenda({
  scale,
  spec,
}: {
  scale: ReturnType<typeof buildChoroplethScale> | null;
  spec: { legendTitle: string; label: string };
}) {
  if (!scale || scale.legend.length === 0) return null;
  return (
    <div className="conu-legend" style={{ left: 12, bottom: 12, width: 220 }}>
      <div className="conu-eyebrow">Radios · {spec.legendTitle}</div>
      <div className="conu-legend-title">{spec.label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {scale.legend.map(([label, color], i) => (
          <div key={i} className="conu-legend-row">
            <span className="conu-legend-swatch" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecileLegend() {
  const colors = ['#16a34a', '#84cc16', '#f59e0b', '#f97316', '#dc2626'];
  return (
    <div className="conu-legend" style={{ right: 12, top: 12, width: 200 }}>
      <div className="conu-eyebrow">Colegios · decil del radio</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10.5,
          color: 'var(--text-tertiary)',
        }}
      >
        <span>menor</span>
        {colors.map((c) => (
          <span key={c} style={{ display: 'inline-block', height: 10, width: 20, background: c }} />
        ))}
        <span>mayor</span>
      </div>
      <div style={{ marginTop: 4, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
        Color = vulnerabilidad del radio donde está la escuela.
      </div>
    </div>
  );
}

const pct = (n: number | null | undefined) =>
  n == null ? '—' : `${Number(n).toFixed(1)}%`;
