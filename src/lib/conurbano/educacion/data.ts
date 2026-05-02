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

export async function loadRadiosGeo(): Promise<GeoJSON.FeatureCollection> {
  return fetchData<GeoJSON.FeatureCollection>(`${BASE}/radios_gba.geojson`);
}

export async function loadRadiosHexgrid(): Promise<GeoJSON.FeatureCollection> {
  return fetchData<GeoJSON.FeatureCollection>(`${BASE}/radios_hexgrid.geojson`);
}

export async function loadSchools(): Promise<School[]> {
  const fc = await fetchData<GeoJSON.FeatureCollection>(
    `${BASE}/gba_schools_enriched.geojson`,
  );
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
