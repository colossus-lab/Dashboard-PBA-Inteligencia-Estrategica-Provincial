/// <reference lib="webworker" />
/**
 * Web Worker que descarga y parsea los assets pesados de /conurbano/educacion
 * fuera del main thread, para no congelar la UI durante el JSON.parse de
 * archivos de varios MB.
 *
 * Recibe: { manifestVersion: string }
 * Emite eventos:
 *   - { type: 'progress', loaded: number, total: number, label: string }
 *   - { type: 'done', payload: { radios, radiosGeo, schools } }
 *   - { type: 'error', message: string }
 */
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { RadiosData, School } from './types';

interface ProgressMsg {
  type: 'progress';
  loaded: number;
  total: number;
  label: string;
}
interface DoneMsg {
  type: 'done';
  payload: {
    radios: RadiosData;
    radiosGeo: GeoJSON.FeatureCollection;
    schools: School[];
  };
}
interface ErrorMsg {
  type: 'error';
  message: string;
}
export type WorkerMsg = ProgressMsg | DoneMsg | ErrorMsg;

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const BASE = '/data/conurbano/educacion';

ctx.onmessage = async (e: MessageEvent<{ manifestVersion: string }>) => {
  const v = e.data.manifestVersion;
  try {
    // Descarga 3 archivos en paralelo. Notamos progreso global aproximado.
    const [radios, radiosTopo, schoolsArr] = await Promise.all([
      fetchJson<RadiosData>(`${BASE}/gba_radios_censo.json?v=${v}`, 'censo'),
      fetchJson<Topology>(`${BASE}/radios_gba.topojson?v=${v}`, 'radios'),
      fetchJson<School[]>(`${BASE}/gba_schools.json?v=${v}`, 'colegios'),
    ]);

    // Deserializar TopoJSON a GeoJSON FeatureCollection — el primer object key
    const objKey = Object.keys(radiosTopo.objects)[0];
    const radiosGeo = feature(radiosTopo, radiosTopo.objects[objKey]) as unknown as GeoJSON.FeatureCollection;

    const done: DoneMsg = { type: 'done', payload: { radios, radiosGeo, schools: schoolsArr } };
    ctx.postMessage(done);
  } catch (err) {
    const msg: ErrorMsg = { type: 'error', message: (err as Error).message };
    ctx.postMessage(msg);
  }
};

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${label}: HTTP ${res.status}`);
  // Sin streaming progress (el browser maneja el download progress internamente);
  // emitimos un progreso simbólico al iniciar y al terminar la descarga.
  ctx.postMessage({ type: 'progress', loaded: 0, total: 1, label } satisfies ProgressMsg);
  const json = (await res.json()) as T;
  ctx.postMessage({ type: 'progress', loaded: 1, total: 1, label } satisfies ProgressMsg);
  return json;
}

export {};
