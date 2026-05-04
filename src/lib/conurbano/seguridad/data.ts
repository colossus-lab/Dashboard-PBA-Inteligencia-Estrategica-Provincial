import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
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
  const res = await fetch(`${BASE}/conurbano.topojson?v=${v}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No pude cargar topojson: ${res.status}`);
  const topo = (await res.json()) as Topology;
  return topoToFC(topo);
}

export async function loadHexgrid(): Promise<GeoJSON.FeatureCollection> {
  const ds = await loadDataset();
  const v = encodeURIComponent(ds.meta.generado);
  const res = await fetch(`${BASE}/conurbano-hexgrid.topojson?v=${v}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No pude cargar hexgrid topojson: ${res.status}`);
  const topo = (await res.json()) as Topology;
  return topoToFC(topo);
}

function topoToFC(topo: Topology): GeoJSON.FeatureCollection {
  const objKey = Object.keys(topo.objects)[0];
  const fc = feature(topo, topo.objects[objKey]);
  if ('features' in fc) return fc as unknown as GeoJSON.FeatureCollection;
  return { type: 'FeatureCollection', features: [fc] } as GeoJSON.FeatureCollection;
}
