import { useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  Layer,
  NavigationControl,
  Source,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEducacionStore } from './store';
import {
  RADIO_METRICS,
  type RadiosData,
  type School,
} from '../../../lib/conurbano/educacion/types';
import { loadRadiosHexgrid } from '../../../lib/conurbano/educacion/data';

const BASE_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

type HexProps = {
  departamento_id: string;
  weight: number;
  row: number;
  col: number;
  radio_id: string | null;
};

type Props = {
  radiosGeo: GeoJSON.FeatureCollection;
  radios: RadiosData;
  schools: School[];
};

const MAX_HEIGHT = 6500;
const SCHOOL_TOP_OFFSET = 600;
const SCHOOL_BUFFER_DEG = 0.0008;

export default function ColegiosMap3D({ radiosGeo, radios, schools }: Props) {
  const {
    radioMetric,
    selectedRadio,
    setSelectedRadio,
    selectedSchoolCue,
    setSelectedSchoolCue,
  } = useEducacionStore();
  const spec = RADIO_METRICS.find((m) => m.id === radioMetric)!;
  const mapRef = useRef<MapRef | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hexGrid, setHexGrid] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoverRadio, setHoverRadio] = useState<string | null>(null);
  const [hoverCue, setHoverCue] = useState<string | null>(null);
  const [hoverPx, setHoverPx] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRadiosHexgrid()
      .then((fc) => {
        if (!cancelled) setHexGrid(fc);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const tick = () => mapRef.current?.getMap()?.resize();
    const obs = new ResizeObserver(tick);
    obs.observe(el);
    const iv = setInterval(tick, 300);
    const stop = setTimeout(() => clearInterval(iv), 4000);
    return () => {
      obs.disconnect();
      clearInterval(iv);
      clearTimeout(stop);
    };
  }, [hexGrid]);

  const gridIndex = useMemo<Record<string, number> | null>(() => {
    if (!hexGrid) return null;
    const m: Record<string, number> = {};
    hexGrid.features.forEach((f, i) => {
      const p = f.properties as HexProps;
      m[`${p.row},${p.col}`] = i;
    });
    return m;
  }, [hexGrid]);

  const hexWithHeights = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!hexGrid || !gridIndex) return null;

    const rawValues = hexGrid.features.map((f) => {
      const p = f.properties as HexProps;
      if (!p.radio_id) return 0;
      const r = radios.radios[p.radio_id];
      if (!r) return 0;
      const v = Number((r as unknown as Record<string, number>)[radioMetric] ?? 0);
      return v * (p.weight ?? 0);
    });

    const KERNEL = [
      [1, 4, 7, 4, 1],
      [4, 16, 26, 16, 4],
      [7, 26, 41, 26, 7],
      [4, 16, 26, 16, 4],
      [1, 4, 7, 4, 1],
    ];
    const smoothed = hexGrid.features.map((f, i) => {
      const p = f.properties as HexProps;
      let sum = 0;
      let totalWeight = 0;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const w = KERNEL[dr + 2][dc + 2];
          if (dr === 0 && dc === 0) {
            sum += rawValues[i] * w;
            totalWeight += w;
          } else {
            const nIdx = gridIndex[`${p.row + dr},${p.col + dc}`];
            if (nIdx != null) {
              sum += rawValues[nIdx] * w;
              totalWeight += w;
            }
          }
        }
      }
      return totalWeight > 0 ? sum / totalWeight : rawValues[i];
    });

    const positiveIdxs: number[] = [];
    smoothed.forEach((v, i) => {
      if (v > 0) positiveIdxs.push(i);
    });
    positiveIdxs.sort((a, b) => smoothed[a] - smoothed[b]);
    const denom = Math.max(1, positiveIdxs.length - 1);
    const percentileByIdx: Record<number, number> = {};
    positiveIdxs.forEach((idx, rank) => {
      percentileByIdx[idx] = rank / denom;
    });

    const features: GeoJSON.Feature[] = hexGrid.features.map((f, i) => {
      const value = smoothed[i];
      const pct = percentileByIdx[i] ?? 0;
      const visual = pct;
      const p = f.properties as HexProps;
      return {
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          departamento_id: p.departamento_id,
          radio_id: p.radio_id,
          weight: p.weight,
          value,
          intensity: visual,
          height: value > 0 ? Math.max(40, visual * MAX_HEIGHT) : 0,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [hexGrid, gridIndex, radios, radioMetric]);

  const heightByRadio = useMemo<Record<string, number>>(() => {
    if (!hexWithHeights) return {};
    const acc: Record<string, { sum: number; n: number }> = {};
    for (const f of hexWithHeights.features) {
      const p = f.properties as { radio_id: string | null; height: number };
      if (!p.radio_id) continue;
      const r = (acc[p.radio_id] ||= { sum: 0, n: 0 });
      r.sum += p.height;
      r.n += 1;
    }
    const out: Record<string, number> = {};
    Object.entries(acc).forEach(([rid, { sum, n }]) => {
      out[rid] = n > 0 ? sum / n : 0;
    });
    return out;
  }, [hexWithHeights]);

  const schoolsExtrude = useMemo<GeoJSON.FeatureCollection>(() => {
    const feats: GeoJSON.Feature[] = [];
    for (const s of schools) {
      const isLow = s.confianza === 'baja';
      const base = isLow ? 0 : s.radio_id ? heightByRadio[s.radio_id] ?? 0 : 0;
      const top = isLow ? 80 : base + SCHOOL_TOP_OFFSET;
      const d = SCHOOL_BUFFER_DEG * (isLow ? 0.6 : 1);
      const ring = [
        [s.lng - d, s.lat - d],
        [s.lng + d, s.lat - d],
        [s.lng + d, s.lat + d],
        [s.lng - d, s.lat + d],
        [s.lng - d, s.lat - d],
      ];
      feats.push({
        type: 'Feature',
        id: s.cue,
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {
          cue: s.cue,
          nombre: s.nombre,
          sector: s.sector,
          partido: s.partido,
          decile: s.vulnerability_decile,
          confianza: s.confianza,
          base,
          top,
        },
      });
    }
    return { type: 'FeatureCollection', features: feats };
  }, [schools, heightByRadio]);

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
    if (layer === 'schools-extrude') {
      setHoverCue(((f.properties?.cue as string) ?? null) || null);
      setHoverRadio(null);
    } else if (layer === 'hex-extrude') {
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
    if (layer === 'schools-extrude') {
      setSelectedSchoolCue(((f.properties?.cue as string) ?? null) || null);
    } else if (layer === 'hex-extrude') {
      setSelectedRadio(((f.properties?.radio_id as string) ?? null) || null);
    }
  };

  const resetView = () => {
    mapRef.current?.getMap()?.easeTo({
      center: [-58.55, -34.65],
      zoom: 9.3,
      pitch: 55,
      bearing: -18,
      duration: 800,
    });
  };

  const hoveredRadio = hoverRadio ? radios.radios[hoverRadio] : null;
  const hoveredSchool = hoverCue ? schools.find((s) => s.cue === hoverCue) : null;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -58.55,
          latitude: -34.65,
          zoom: 9.3,
          pitch: 55,
          bearing: -18,
        }}
        mapStyle={BASE_STYLE}
        maxBounds={[
          [-59.3, -35.25],
          [-57.6, -34.0],
        ]}
        minZoom={8.5}
        maxZoom={14}
        maxPitch={70}
        onMouseMove={onMouseMove}
        onMouseLeave={() => {
          setHoverRadio(null);
          setHoverCue(null);
          setHoverPx(null);
        }}
        onClick={onClick}
        interactiveLayerIds={['hex-extrude', 'schools-extrude']}
        style={{ height: '100%', width: '100%', background: '#0a1220' }}
      >
        <NavigationControl position="top-right" visualizePitch showCompass showZoom />

        <Source id="tech-grid" type="geojson" data={buildTechGrid()}>
          <Layer
            id="tech-grid-line"
            type="line"
            paint={{ 'line-color': '#00bb7f', 'line-opacity': 0.07, 'line-width': 0.8 }}
          />
        </Source>

        <Source id="radios-outline" type="geojson" data={radiosGeo} promoteId="radio_id">
          <Layer
            id="radios-fill-bg"
            type="fill"
            paint={{ 'fill-color': '#0f1a2a', 'fill-opacity': 0.45 }}
          />
          <Layer
            id="radios-line"
            type="line"
            paint={{
              'line-color': [
                'case',
                ['==', ['get', 'radio_id'], selectedRadio ?? ''],
                '#00d294',
                ['==', ['get', 'radio_id'], hoverRadio ?? ''],
                '#00d294',
                '#00bb7f',
              ],
              'line-opacity': [
                'case',
                ['==', ['get', 'radio_id'], selectedRadio ?? ''],
                0.95,
                ['==', ['get', 'radio_id'], hoverRadio ?? ''],
                0.85,
                0.18,
              ],
              'line-width': [
                'case',
                ['==', ['get', 'radio_id'], selectedRadio ?? ''],
                2.4,
                ['==', ['get', 'radio_id'], hoverRadio ?? ''],
                1.6,
                0.4,
              ],
            }}
          />
        </Source>

        {hexWithHeights && (
          <Source id="hexgrid" type="geojson" data={hexWithHeights}>
            <Layer
              id="hex-extrude"
              type="fill-extrusion"
              paint={{
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': 0,
                'fill-extrusion-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'intensity'],
                  0,
                  '#062a1f',
                  0.15,
                  '#007956',
                  0.35,
                  '#00bb7f',
                  0.55,
                  '#edb200',
                  0.75,
                  '#f97316',
                  0.9,
                  '#dc2626',
                  1,
                  '#7f1d1d',
                ],
                'fill-extrusion-opacity': 0.78,
                'fill-extrusion-vertical-gradient': true,
              }}
            />
          </Source>
        )}

        <Source id="schools-3d" type="geojson" data={schoolsExtrude} promoteId="cue">
          <Layer
            id="schools-extrude"
            type="fill-extrusion"
            paint={{
              'fill-extrusion-base': ['get', 'base'],
              'fill-extrusion-height': ['get', 'top'],
              'fill-extrusion-color': [
                'case',
                ['==', ['get', 'confianza'], 'baja'],
                '#9ca3af',
                [
                  'step',
                  ['coalesce', ['get', 'decile'], 0],
                  '#94a3b8',
                  1,
                  '#22d3ee',
                  3,
                  '#a3e635',
                  5,
                  '#facc15',
                  7,
                  '#fb923c',
                  9,
                  '#ef4444',
                ],
              ],
              'fill-extrusion-opacity': [
                'case',
                ['==', ['get', 'cue'], selectedSchoolCue ?? ''],
                1.0,
                ['==', ['get', 'cue'], hoverCue ?? ''],
                0.95,
                0.85,
              ],
            }}
          />
          <Layer
            id="schools-stem"
            type="fill-extrusion"
            paint={{
              'fill-extrusion-base': 0,
              'fill-extrusion-height': ['get', 'base'],
              'fill-extrusion-color': '#00d294',
              'fill-extrusion-opacity': [
                'case',
                ['==', ['get', 'cue'], selectedSchoolCue ?? ''],
                0.7,
                ['==', ['get', 'cue'], hoverCue ?? ''],
                0.5,
                0.06,
              ],
            }}
          />
        </Source>
      </Map>

      <div className="conu-3d-legend">
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#34d399',
          }}
        >
          Vista 3D · Radios × Colegios
        </div>
        <div
          style={{
            marginTop: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
          }}
          title={spec.label}
        >
          {spec.label}
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(110, 231, 183, 0.85)' }}>
          Más alto / rojo = mayor magnitud del indicador
          {spec.invertScale ? ' (peor situación)' : ' (mejor situación)'}
        </div>
        <div
          style={{
            marginTop: 12,
            height: 8,
            width: '100%',
            overflow: 'hidden',
            borderRadius: 999,
            background:
              'linear-gradient(90deg, #062a1f 0%, #007956 18%, #00bb7f 38%, #edb200 58%, #f97316 78%, #dc2626 100%)',
          }}
        />
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'rgba(110, 231, 183, 0.7)',
          }}
        >
          <span>menor</span>
          <span>medio</span>
          <span>mayor</span>
        </div>
        <div
          className="conu-3d-legend-desc"
          style={{
            marginTop: 12,
            borderTop: '1px solid rgba(6, 78, 59, 0.4)',
            paddingTop: 8,
            fontSize: 10.5,
            lineHeight: 1.4,
            color: 'rgba(110, 231, 183, 0.7)',
          }}
        >
          Color y altura usan rango percentil entre los 10.923 radios del GBA — contraste
          uniforme aún con métricas concentradas. Cada cubo flotante es un colegio elevado
          a la altura del radio que lo contiene (color = decil de vulnerabilidad).
        </div>
      </div>

      {hoverPx && (hoveredSchool || hoveredRadio) && (
        <div
          className="conu-3d-tooltip"
          style={{
            left: Math.min(hoverPx.x + 14, (wrapperRef.current?.clientWidth ?? 1200) - 290),
            top: Math.min(hoverPx.y + 14, (wrapperRef.current?.clientHeight ?? 700) - 170),
          }}
        >
          {hoveredSchool ? (
            <>
              <div className="conu-3d-eyebrow">Colegio · {hoveredSchool.sector}</div>
              <div className="conu-3d-title">{hoveredSchool.nombre}</div>
              <div className="conu-3d-sub">
                {hoveredSchool.localidad} · {hoveredSchool.partido}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div className="conu-3d-big">
                  {hoveredSchool.vulnerability_decile != null
                    ? `Decil ${hoveredSchool.vulnerability_decile}`
                    : '—'}
                </div>
                <div className="conu-3d-eyebrow" style={{ paddingBottom: 2 }}>
                  vulnerabilidad
                </div>
              </div>
              <div className="conu-3d-grid">
                <span>NBI</span>
                <span style={{ color: '#fff', textAlign: 'right' }}>
                  {pct(hoveredSchool.nbi_pct)}
                </span>
                <span>Sin instr.</span>
                <span style={{ color: '#fff', textAlign: 'right' }}>
                  {pct(hoveredSchool.pct_sin_instruccion)}
                </span>
              </div>
            </>
          ) : hoveredRadio ? (
            <>
              <div className="conu-3d-eyebrow">Radio censal · {hoveredRadio.partido}</div>
              <div className="conu-3d-title">{hoveredRadio.radio_id}</div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div className="conu-3d-big">
                  {spec.format(
                    Number((hoveredRadio as unknown as Record<string, number>)[radioMetric] ?? 0),
                  )}
                </div>
                <div className="conu-3d-eyebrow" style={{ paddingBottom: 2 }}>
                  {spec.label}
                </div>
              </div>
              <div className="conu-3d-grid">
                <span>Decil vuln.</span>
                <span style={{ color: '#fff', textAlign: 'right' }}>
                  {hoveredRadio.vulnerability_decile}
                </span>
                <span>NBI</span>
                <span style={{ color: '#fff', textAlign: 'right' }}>
                  {pct(hoveredRadio.nbi_pct)}
                </span>
                <span>Sin instr.</span>
                <span style={{ color: '#fff', textAlign: 'right' }}>
                  {pct(hoveredRadio.pct_sin_instruccion)}
                </span>
                <span>Hogares</span>
                <span style={{ color: '#fff', textAlign: 'right' }}>
                  {hoveredRadio.hogares_total.toLocaleString('es-AR')}
                </span>
              </div>
            </>
          ) : null}
        </div>
      )}

      <button onClick={resetView} className="conu-3d-reset">
        ↺ Reset vista
      </button>

      <div className="conu-3d-help">
        <strong>Pan</strong>: arrastrar · <strong>Zoom</strong>: rueda ·{' '}
        <strong>Rotar</strong>: click derecho · <strong>Inclinar</strong>: Ctrl + arrastrar
      </div>
    </div>
  );
}

const pct = (n: number | null | undefined) => (n == null ? '—' : `${Number(n).toFixed(1)}%`);

function buildTechGrid(): GeoJSON.FeatureCollection {
  const minX = -59.3,
    maxX = -57.6,
    minY = -35.25,
    maxY = -34.0,
    step = 0.05;
  const features: GeoJSON.Feature[] = [];
  for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [x, minY],
          [x, maxY],
        ],
      },
    });
  }
  for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [minX, y],
          [maxX, y],
        ],
      },
    });
  }
  return { type: 'FeatureCollection', features };
}
