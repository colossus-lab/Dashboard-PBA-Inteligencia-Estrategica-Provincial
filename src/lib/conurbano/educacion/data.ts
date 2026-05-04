import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { EphData, RadiosData, School } from './types';

const BASE = '/data/conurbano/educacion';

let manifestVersionPromise: Promise<string> | null = null;

async function manifestVersion(): Promise<string> {
  if (!manifestVersionPromise) {
    manifestVersionPromise = (async () => {
      try {
        const res = await fetch(`${BASE}/manifest.json`, { cache: 'no-store' });
        if (!res.ok) return '0';
        const j = (await res.json()) as { version?: string };
        return j.version ?? '0';
      } catch {
        return '0';
      }
    })();
  }
  return manifestVersionPromise;
}

async function fetchData<T>(path: string): Promise<T> {
  const v = await manifestVersion();
  const url = `${path}${path.includes('?') ? '&' : '?'}v=${v}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${path}: ${res.status}`);
  return (await res.json()) as T;
}

export async function loadEph(): Promise<EphData> {
  return fetchData<EphData>(`${BASE}/gba_eph_timeseries.json`);
}

export async function loadRadios(): Promise<RadiosData> {
  return fetchData<RadiosData>(`${BASE}/gba_radios_censo.json`);
}

/**
 * Carga el TopoJSON de radios censales y lo deserializa a GeoJSON FeatureCollection
 * (formato consumible por Maplibre/react-map-gl).
 */
export async function loadRadiosGeo(): Promise<GeoJSON.FeatureCollection> {
  const topo = await fetchData<Topology>(`${BASE}/radios_gba.topojson`);
  return topoToFeatureCollection(topo);
}

/**
 * Carga el TopoJSON de hexgrid (3D mode) y lo deserializa.
 */
export async function loadRadiosHexgrid(): Promise<GeoJSON.FeatureCollection> {
  const topo = await fetchData<Topology>(`${BASE}/radios_hexgrid.topojson`);
  return topoToFeatureCollection(topo);
}

/**
 * Schools ahora viene como JSON plano (array directo), pre-procesado en build-time.
 * Si por alguna razón el .json no existe, fallback al .geojson legacy.
 */
export async function loadSchools(): Promise<School[]> {
  try {
    return await fetchData<School[]>(`${BASE}/gba_schools.json`);
  } catch {
    // Fallback transitorio si el .json todavía no fue regenerado
    const fc = await fetchData<GeoJSON.FeatureCollection>(`${BASE}/gba_schools_enriched.geojson`);
    return geoJsonToSchools(fc);
  }
}

function topoToFeatureCollection(topo: Topology): GeoJSON.FeatureCollection {
  const objKey = Object.keys(topo.objects)[0];
  const fc = feature(topo, topo.objects[objKey]);
  // topojson-client devuelve Feature | FeatureCollection; normalizamos.
  if ('features' in fc) return fc as unknown as GeoJSON.FeatureCollection;
  return { type: 'FeatureCollection', features: [fc] } as GeoJSON.FeatureCollection;
}

function geoJsonToSchools(fc: GeoJSON.FeatureCollection): School[] {
  const out: School[] = [];
  for (const f of fc.features) {
    const g = f.geometry as GeoJSON.Point | null;
    if (!g || g.type !== 'Point') continue;
    const [lng, lat] = g.coordinates as [number, number];
    const p = (f.properties ?? {}) as Record<string, unknown>;
    out.push({
      cue: String(p.cue ?? ''),
      nombre: String(p.nombre ?? ''),
      sector: String(p.sector ?? ''),
      ambito: String(p.ambito ?? ''),
      partido: String(p.partido ?? ''),
      localidad: String(p.localidad ?? ''),
      domicilio: String(p.domicilio ?? ''),
      niveles: Array.isArray(p.niveles)
        ? (p.niveles as string[])
        : typeof p.niveles === 'string'
          ? safeJsonArray(p.niveles)
          : [],
      geocode_quality: String(p.geocode_quality ?? 'calle'),
      confianza: (p.confianza as School['confianza']) ?? 'media',
      lng,
      lat,
      radio_id: (p.radio_id as string) ?? null,
      vulnerability_score: numOrNull(p.vulnerability_score),
      vulnerability_decile: numOrNull(p.vulnerability_decile),
      pct_sin_instruccion: numOrNull(p.pct_sin_instruccion),
      pct_secundario_completo: numOrNull(p.pct_secundario_completo),
      tasa_nunca_asistio: numOrNull(p.tasa_nunca_asistio),
      nbi_pct: numOrNull(p.nbi_pct),
      privacion_material_pct: numOrNull(p.privacion_material_pct),
      hacinamiento_pct: numOrNull(p.hacinamiento_pct),
    });
  }
  return out;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Carga TODO el bundle pesado (radios + radiosGeo + schools) en un Web Worker
 * para no bloquear el main thread con los JSON.parse de varios MB.
 *
 * Si el navegador no soporta workers, hace fallback a las funciones de arriba
 * en el main thread.
 */
export interface BundleProgress {
  loaded: number;
  total: number;
  label: string;
}

export interface EducacionBundle {
  radios: RadiosData;
  radiosGeo: GeoJSON.FeatureCollection;
  schools: School[];
}

export async function loadEducacionBundle(
  onProgress?: (p: BundleProgress) => void,
): Promise<EducacionBundle> {
  const v = await manifestVersion();

  if (typeof Worker === 'undefined') {
    return loadOnMainThread();
  }

  try {
    const worker = new Worker(new URL('./dataWorker.ts', import.meta.url), { type: 'module' });
    return await new Promise<EducacionBundle>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === 'progress' && onProgress) onProgress(msg);
        else if (msg.type === 'done') {
          resolve(msg.payload);
          worker.terminate();
        } else if (msg.type === 'error') {
          reject(new Error(msg.message));
          worker.terminate();
        }
      };
      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };
      worker.postMessage({ manifestVersion: v });
    });
  } catch {
    // Si el worker falla por cualquier razón (CSP, browser viejo), fallback main thread
    return loadOnMainThread();
  }

  async function loadOnMainThread(): Promise<EducacionBundle> {
    onProgress?.({ loaded: 0, total: 3, label: 'censo' });
    const radios = await loadRadios();
    onProgress?.({ loaded: 1, total: 3, label: 'radios' });
    const radiosGeo = await loadRadiosGeo();
    onProgress?.({ loaded: 2, total: 3, label: 'colegios' });
    const schools = await loadSchools();
    onProgress?.({ loaded: 3, total: 3, label: 'done' });
    return { radios, radiosGeo, schools };
  }
}
