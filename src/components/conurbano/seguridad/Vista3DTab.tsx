import { useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  Layer,
  NavigationControl,
  Source,
  type MapRef,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSeguridadStore } from './store';
import {
  hechosDelito,
  tasaDelito,
} from '../../../lib/conurbano/seguridad/analytics';
import { loadGeoJSON, loadHexgrid } from '../../../lib/conurbano/seguridad/data';
import type { Dataset, Metric } from '../../../lib/conurbano/seguridad/types';

const BASE_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

type HexProps = {
  departamento_id: string;
  weight: number;
  row: number;
  col: number;
};

export default function Vista3DTab() {
  const { dataset, municipioSel, setMunicipio } = useSeguridadStore();

  const [delitoId, setDelitoId] = useState<string>('1');
  const [metric, setMetric] = useState<Metric>('tasa');
  const [anio, setAnio] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [geoPartidos, setGeoPartidos] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hexGrid, setHexGrid] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoverPid, setHoverPid] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const focusPid = municipioSel ?? hoverPid;

  useEffect(() => {
    if (!dataset) return;
    setAnio(dataset.anios[dataset.anios.length - 1]);
    if (!dataset.delitos.find((d) => d.id === delitoId)) setDelitoId(dataset.delitos[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadGeoJSON(), loadHexgrid()])
      .then(([g, h]) => {
        if (cancelled) return;
        setGeoPartidos(g);
        setHexGrid(h);
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
    const stop = setTimeout(() => clearInterval(iv), 3000);
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
    if (!dataset || !hexGrid || !gridIndex) return null;
    const ai = dataset.anios.indexOf(anio);
    if (ai < 0) return null;

    const isAll = delitoId === 'all';
    const di = isAll ? -1 : dataset.delitos.findIndex((d) => d.id === delitoId);
    if (!isAll && di < 0) return null;

    const byPartido: Record<string, number> = {};
    dataset.partidos.forEach((p, pi) => {
      if (isAll) {
        let s = 0;
        for (let d = 0; d < dataset.delitos.length; d++) {
          s +=
            metric === 'tasa'
              ? tasaDelito(dataset, pi, d, ai)
              : hechosDelito(dataset, pi, d, ai);
        }
        byPartido[p.id] = s;
      } else {
        byPartido[p.id] =
          metric === 'tasa'
            ? tasaDelito(dataset, pi, di, ai)
            : hechosDelito(dataset, pi, di, ai);
      }
    });

    const rawValues = hexGrid.features.map((f) => {
      const p = f.properties as HexProps;
      return (byPartido[p.departamento_id] ?? 0) * (p.weight ?? 0);
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

    let globalMax = 0;
    for (const v of smoothed) if (v > globalMax) globalMax = v;

    const positives = smoothed
      .filter((v) => v > 0)
      .slice()
      .sort((a, b) => a - b);
    const N = positives.length;
    const percentileOf = (v: number): number => {
      if (v <= 0 || N === 0) return 0;
      let lo = 0,
        hi = N;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (positives[mid] < v) lo = mid + 1;
        else hi = mid;
      }
      return lo / N;
    };

    const MAX_HEIGHT = 6500;
    const features: GeoJSON.Feature[] = hexGrid.features.map((f, i) => {
      const value = smoothed[i];
      const linear = globalMax > 0 ? value / globalMax : 0;
      const visualHeight = Math.pow(linear, 0.4);
      const intensity = percentileOf(value);
      const p = f.properties as HexProps;
      return {
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          departamento_id: p.departamento_id,
          weight: p.weight,
          value,
          intensity,
          height: value > 0 ? Math.max(30, visualHeight * MAX_HEIGHT) : 0,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [dataset, hexGrid, gridIndex, delitoId, anio, metric]);

  const labelPoints = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!geoPartidos) return null;
    const features: GeoJSON.Feature[] = [];
    geoPartidos.features.forEach((f) => {
      const c = (f.properties as { centroid?: [number, number] })?.centroid;
      if (!c) return;
      features.push({
        type: 'Feature',
        properties: {
          nombre: f.properties?.nombre,
          departamento_id: f.properties?.departamento_id,
        },
        geometry: { type: 'Point', coordinates: c },
      });
    });
    return { type: 'FeatureCollection', features };
  }, [geoPartidos]);

  const resetView = () => {
    mapRef.current?.getMap()?.easeTo({
      center: [-58.55, -34.65],
      zoom: 9.3,
      pitch: viewMode === '3d' ? 55 : 0,
      bearing: viewMode === '3d' ? -18 : 0,
      duration: 800,
    });
  };

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.easeTo({
      pitch: viewMode === '3d' ? 55 : 0,
      bearing: viewMode === '3d' ? -18 : 0,
      duration: 600,
    });
  }, [viewMode]);

  const delitoNombre =
    delitoId === 'all'
      ? 'Todos los delitos (suma SNIC)'
      : dataset?.delitos.find((d) => d.id === delitoId)?.nombre ?? '';
  const totalAllDelitos = useMemoTotalAllDelitos(dataset, anio);
  const totalDelitoSel = useMemoTotal(dataset, delitoId, anio);
  const totalConurbano = delitoId === 'all' ? totalAllDelitos : totalDelitoSel;

  if (!dataset) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section className="conu-card" style={{ padding: 20 }}>
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            paddingBottom: 12,
            borderBottom: '1px solid var(--border-glass)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
            <div>
              <div className="conu-eyebrow">Total Conurbano · {anio}</div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 22,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: 'var(--text-primary)',
                }}
              >
                {totalAllDelitos.toLocaleString('es-AR')}
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-tertiary)' }}>
                hechos agregados de todas las categorías
              </div>
            </div>
            <div style={{ height: 40, width: 1, background: 'var(--border-glass)' }} />
            <div>
              <div className="conu-eyebrow">Tipos de delito</div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 22,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: 'var(--text-primary)',
                }}
              >
                {dataset.delitos.length}
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-tertiary)' }}>
                categorías registradas en SNIC
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Categoría seleccionada:{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {totalConurbano.toLocaleString('es-AR')}
              </span>{' '}
              hechos
            </div>
            <div className="conu-toggle-group">
              {(['2d', '3d'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className="conu-pill"
                  data-active={viewMode === m ? 'true' : 'false'}
                  style={{ borderColor: 'transparent', textTransform: 'uppercase' }}
                  title={
                    m === '2d'
                      ? 'Vista plana · zoom y análisis detallado'
                      : 'Vista volumétrica · relieve por delito'
                  }
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="conu-controls-grid">
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span className="conu-eyebrow">Tipo de delito</span>
            <select
              value={delitoId}
              onChange={(e) => setDelitoId(e.target.value)}
              className="conu-select"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14 }}
            >
              <option value="all">— Todos los delitos (suma SNIC) —</option>
              {dataset.delitos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="conu-eyebrow">Métrica</span>
            <div className="conu-toggle-group">
              {(['tasa', 'hechos'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className="conu-pill"
                  data-active={metric === m ? 'true' : 'false'}
                  style={{ borderColor: 'transparent', padding: '8px 14px', fontSize: 13 }}
                >
                  {m === 'tasa' ? 'Tasa /100k' : 'Hechos'}
                </button>
              ))}
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="conu-eyebrow">Año</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {anio}
              </span>
            </span>
            <input
              type="range"
              min={dataset.anios[0]}
              max={dataset.anios[dataset.anios.length - 1]}
              step={1}
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10.5,
                color: 'var(--text-tertiary)',
              }}
            >
              <span>{dataset.anios[0]}</span>
              <span>{dataset.anios[dataset.anios.length - 1]}</span>
            </div>
          </label>
        </div>
      </section>

      <div
        ref={wrapperRef}
        style={{
          position: 'relative',
          height: 640,
          overflow: 'hidden',
          borderRadius: 12,
          border: '1px solid rgba(6, 78, 59, 0.5)',
          background: '#0a1220',
        }}
      >
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
          maxZoom={13}
          maxPitch={viewMode === '3d' ? 70 : 0}
          onMouseMove={(e) => {
            const f = e.features?.[0];
            setHoverPid(f ? ((f.properties?.departamento_id as string) ?? null) : null);
          }}
          onMouseLeave={() => setHoverPid(null)}
          onClick={(e) => {
            const f = e.features?.[0];
            const pid = (f?.properties?.departamento_id as string) ?? null;
            if (!pid) {
              if (municipioSel) setMunicipio(null);
              return;
            }
            setMunicipio(pid === municipioSel ? null : pid);
          }}
          interactiveLayerIds={[viewMode === '3d' ? 'hex-3d' : 'hex-2d']}
          style={{ height: '100%', width: '100%', background: '#0a1220' }}
        >
          <NavigationControl position="top-right" visualizePitch showCompass showZoom />

          <Source id="tech-grid" type="geojson" data={buildTechGrid()}>
            <Layer
              id="tech-grid-line"
              type="line"
              paint={{ 'line-color': '#00bb7f', 'line-opacity': 0.08, 'line-width': 0.8 }}
            />
          </Source>

          {geoPartidos && (
            <Source id="partidos-outline" type="geojson" data={geoPartidos}>
              <Layer
                id="partidos-fill-bg"
                type="fill"
                paint={{ 'fill-color': '#0f1a2a', 'fill-opacity': 0.6 }}
              />
              <Layer
                id="partidos-line-glow"
                type="line"
                paint={{
                  'line-color': '#00bb7f',
                  'line-width': 5,
                  'line-opacity': 0.18,
                  'line-blur': 2,
                }}
              />
              <Layer
                id="partidos-line-3d"
                type="line"
                paint={{
                  'line-color': [
                    'case',
                    ['==', ['get', 'departamento_id'], municipioSel ?? '__none__'],
                    '#00ffaa',
                    ['==', ['get', 'departamento_id'], hoverPid ?? '__none__'],
                    '#00d294',
                    '#00bb7f',
                  ],
                  'line-width': [
                    'case',
                    ['==', ['get', 'departamento_id'], municipioSel ?? '__none__'],
                    4,
                    ['==', ['get', 'departamento_id'], hoverPid ?? '__none__'],
                    3.2,
                    2,
                  ],
                  'line-opacity': 0.95,
                }}
              />
            </Source>
          )}

          {hexWithHeights && (
            <Source id="hexgrid" type="geojson" data={hexWithHeights}>
              {viewMode === '3d' ? (
                <Layer
                  id="hex-3d"
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
                    'fill-extrusion-opacity': municipioSel
                      ? [
                          'case',
                          ['==', ['get', 'departamento_id'], municipioSel],
                          0.9,
                          0.22,
                        ]
                      : 0.78,
                    'fill-extrusion-vertical-gradient': true,
                  }}
                />
              ) : (
                <Layer
                  id="hex-2d"
                  type="fill"
                  paint={{
                    'fill-color': [
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
                    'fill-opacity': municipioSel
                      ? [
                          'case',
                          ['==', ['get', 'departamento_id'], municipioSel],
                          0.92,
                          0.18,
                        ]
                      : 0.85,
                  }}
                />
              )}
            </Source>
          )}

          {labelPoints && (
            <Source id="partido-labels" type="geojson" data={labelPoints}>
              <Layer
                id="partido-label-text"
                type="symbol"
                layout={{
                  'text-field': ['get', 'nombre'],
                  'text-font': ['Noto Sans Bold'],
                  'text-size': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8,
                    10,
                    10,
                    13,
                    12,
                    16,
                  ],
                  'text-anchor': 'center',
                  'text-allow-overlap': true,
                  'text-ignore-placement': true,
                  'text-letter-spacing': 0.05,
                  'text-padding': 2,
                }}
                paint={{
                  'text-color': '#ffffff',
                  'text-halo-color': '#0a1220',
                  'text-halo-width': 2.2,
                  'text-halo-blur': 0.5,
                  'text-opacity': [
                    'case',
                    ['==', ['get', 'departamento_id'], hoverPid ?? ''],
                    1,
                    0.92,
                  ],
                }}
              />
            </Source>
          )}
        </Map>

        <div className="conu-3d-legend" style={{ width: 280 }}>
          <div className="conu-3d-eyebrow">
            Vista {viewMode.toUpperCase()} · {anio}
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
            title={delitoNombre}
          >
            {delitoNombre}
          </div>
          <div style={{ marginTop: 4, fontSize: 11.5, color: 'rgba(110, 231, 183, 0.85)' }}>
            {totalConurbano.toLocaleString('es-AR')}{' '}
            {metric === 'tasa' ? '(total hechos)' : 'hechos totales'}
          </div>
          <div
            style={{
              marginTop: 12,
              height: 8,
              width: '100%',
              overflow: 'hidden',
              borderRadius: 999,
              background:
                'linear-gradient(90deg, #004e3b 0%, #009767 20%, #00bb7f 50%, #edb200 80%, #ef4444 100%)',
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
            <span>bajo</span>
            <span>medio</span>
            <span>alto</span>
          </div>
          <div
            style={{
              marginTop: 12,
              borderTop: '1px solid rgba(6, 78, 59, 0.4)',
              paddingTop: 8,
              fontSize: 10.5,
              lineHeight: 1.4,
              color: 'rgba(110, 231, 183, 0.7)',
            }}
          >
            Altura = valor del partido × peso urbano (gradiente de densidad GBA). Suma de hexes
            por partido = total SNIC.
          </div>
        </div>

        {focusPid && dataset && (
          <HoverInfo
            pid={focusPid}
            pinned={!!municipioSel && focusPid === municipioSel}
            dataset={dataset}
            delitoId={delitoId}
            anio={anio}
            metric={metric}
          />
        )}

        <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 5 }}>
          {municipioSel && (
            <button
              onClick={() => setMunicipio(null)}
              className="conu-3d-reset"
              style={{
                position: 'static',
                borderColor: 'rgba(16, 185, 129, 0.6)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#a7f3d0',
              }}
            >
              ✕ Limpiar selección
            </button>
          )}
          <button onClick={resetView} className="conu-3d-reset" style={{ position: 'static' }}>
            ↺ Reset vista
          </button>
        </div>

        <div className="conu-3d-help">
          <strong>Click</strong>: fijar partido · <strong>Pan</strong>: arrastrar ·{' '}
          <strong>Zoom</strong>: rueda · <strong>Rotar</strong>: click derecho ·{' '}
          <strong>Inclinar</strong>: Ctrl + arrastrar
        </div>
      </div>

      <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Lectura:</strong> cada bloque cubre
        ~2,5 km² del territorio y se recorta al límite municipal. La <strong>altura</strong> es
        proporcional al valor del delito en el partido, ponderada por un gradiente de densidad
        urbana del GBA. Los partidos con más delitos se elevan claramente en rojo.
      </p>
    </div>
  );
}

function useMemoTotal(dataset: Dataset | null, delitoId: string, anio: number) {
  return useMemo(() => {
    if (!dataset) return 0;
    const di = dataset.delitos.findIndex((d) => d.id === delitoId);
    const ai = dataset.anios.indexOf(anio);
    if (di < 0 || ai < 0) return 0;
    return dataset.partidos.reduce((s, _p, pi) => s + (dataset.hechos[pi][di][ai] ?? 0), 0);
  }, [dataset, delitoId, anio]);
}

function useMemoTotalAllDelitos(dataset: Dataset | null, anio: number) {
  return useMemo(() => {
    if (!dataset) return 0;
    const ai = dataset.anios.indexOf(anio);
    if (ai < 0) return 0;
    let total = 0;
    for (let pi = 0; pi < dataset.partidos.length; pi++) {
      for (let di = 0; di < dataset.delitos.length; di++) {
        total += dataset.hechos[pi][di][ai] ?? 0;
      }
    }
    return total;
  }, [dataset, anio]);
}

function HoverInfo({
  pid,
  pinned,
  dataset,
  delitoId,
  anio,
  metric,
}: {
  pid: string;
  pinned: boolean;
  dataset: Dataset;
  delitoId: string;
  anio: number;
  metric: Metric;
}) {
  const partido = dataset.partidos.find((p) => p.id === pid);
  if (!partido) return null;
  const pi = dataset.partidos.findIndex((p) => p.id === pid);
  const ai = dataset.anios.indexOf(anio);
  if (pi < 0 || ai < 0) return null;

  const isAll = delitoId === 'all';
  const di = isAll ? -1 : dataset.delitos.findIndex((d) => d.id === delitoId);
  if (!isAll && di < 0) return null;

  let val = 0;
  if (isAll) {
    for (let d = 0; d < dataset.delitos.length; d++) {
      val +=
        metric === 'tasa'
          ? tasaDelito(dataset, pi, d, ai)
          : hechosDelito(dataset, pi, d, ai);
    }
  } else {
    val =
      metric === 'tasa'
        ? tasaDelito(dataset, pi, di, ai)
        : hechosDelito(dataset, pi, di, ai);
  }

  const labelDelito = isAll ? 'Todos los delitos' : dataset.delitos[di]?.nombre;
  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { maximumFractionDigits: metric === 'tasa' ? 1 : 0 });
  const unidad = metric === 'tasa' ? ' /100k' : ' hechos';

  return (
    <div
      className="conu-3d-tooltip"
      style={{
        right: 16,
        top: 16,
        left: 'auto',
        width: 230,
        borderColor: pinned ? 'rgba(52, 211, 153, 0.7)' : 'rgba(6, 78, 59, 0.5)',
        boxShadow: pinned ? '0 0 0 1px rgba(52, 211, 153, 0.3), 0 10px 30px rgba(0,0,0,0.5)' : undefined,
      }}
    >
      <div className="conu-3d-eyebrow">
        {pinned ? 'Partido seleccionado' : 'Partido'}
      </div>
      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: '#fff' }}>
        {partido.nombre}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(110, 231, 183, 0.7)' }}>
        {labelDelito} · {anio}
      </div>
      <div style={{ marginTop: 4, fontSize: 17, fontWeight: 600, color: '#fff' }}>
        {fmt(val)}
        <span style={{ fontSize: 11, color: 'rgba(110, 231, 183, 0.7)' }}>{unidad}</span>
      </div>
    </div>
  );
}

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
