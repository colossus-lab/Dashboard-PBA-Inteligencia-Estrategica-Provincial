import { create } from 'zustand';
import type { Dataset, Metric } from '../../../lib/conurbano/seguridad/types';

type Tab = 'vista3d' | 'comparador' | 'scrolly' | 'panorama';

type State = {
  dataset: Dataset | null;
  loading: boolean;
  error: string | null;
  tab: Tab;
  delitoId: string;
  anio: number;
  metric: Metric;
  municipioSel: string | null;
  setLoaded: (d: Dataset) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string) => void;
  setTab: (t: Tab) => void;
  setDelito: (id: string) => void;
  setAnio: (a: number) => void;
  setMetric: (m: Metric) => void;
  setMunicipio: (id: string | null) => void;
};

export const useSeguridadStore = create<State>((set) => ({
  dataset: null,
  loading: false,
  error: null,
  tab: 'panorama',
  delitoId: '1',
  anio: 2024,
  metric: 'tasa',
  municipioSel: null,
  setLoaded: (d) =>
    set((s) => ({
      dataset: d,
      loading: false,
      anio: d.anios[d.anios.length - 1] ?? s.anio,
      delitoId: d.delitos.find((x) => x.id === s.delitoId)?.id ?? d.delitos[0].id,
    })),
  setLoading: (b) => set({ loading: b }),
  setError: (e) => set({ error: e, loading: false }),
  setTab: (t) => set({ tab: t }),
  setDelito: (id) => set({ delitoId: id }),
  setAnio: (a) => set({ anio: a }),
  setMetric: (m) => set({ metric: m }),
  setMunicipio: (id) => set({ municipioSel: id }),
}));
