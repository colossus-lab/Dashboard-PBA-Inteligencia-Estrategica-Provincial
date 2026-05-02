import type { Dataset } from './types';

const BASE = '/data/conurbano/seguridad';

let cachedDataset: Dataset | null = null;

export async function loadDataset(): Promise<Dataset> {
  if (cachedDataset) return cachedDataset;
  const res = await fetch(`${BASE}/conurbano.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No pude cargar dataset: ${res.status}`);
  cachedDataset = await res.json();
  return cachedDataset!;
}

export async function loadGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  const ds = await loadDataset();
  const v = encodeURIComponent(ds.meta.generado);
  const res = await fetch(`${BASE}/conurbano.geojson?v=${v}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No pude cargar geojson: ${res.status}`);
  return res.json();
}

export async function loadHexgrid(): Promise<GeoJSON.FeatureCollection> {
  const ds = await loadDataset();
  const v = encodeURIComponent(ds.meta.generado);
  const res = await fetch(`${BASE}/conurbano-hexgrid.geojson?v=${v}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No pude cargar hexgrid: ${res.status}`);
  return res.json();
}
