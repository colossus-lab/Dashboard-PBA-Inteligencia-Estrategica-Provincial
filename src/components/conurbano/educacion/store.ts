import { create } from 'zustand';
import type {
  EphData,
  RadiosData,
  RadioMetric,
  School,
  ColegiosFilter,
} from '../../../lib/conurbano/educacion/types';

type Tab = 'colegios' | 'serie';

type State = {
  eph: EphData | null;
  loadingEph: boolean;
  errorEph: string | null;
  tab: Tab;
  radios: RadiosData | null;
  radiosGeo: GeoJSON.FeatureCollection | null;
  schools: School[] | null;
  loadingColegios: boolean;
  errorColegios: string | null;
  radioMetric: RadioMetric;
  selectedRadio: string | null;
  selectedSchoolCue: string | null;
  colegiosFilter: ColegiosFilter;
  colegiosViewMode: '2d' | '3d';
  setLoadedEph: (eph: EphData) => void;
  setErrorEph: (e: string) => void;
  setLoadingEph: (b: boolean) => void;
  setTab: (t: Tab) => void;
  setLoadedColegios: (
    radios: RadiosData,
    radiosGeo: GeoJSON.FeatureCollection,
    schools: School[],
  ) => void;
  setLoadingColegios: (b: boolean) => void;
  setErrorColegios: (e: string) => void;
  setRadioMetric: (m: RadioMetric) => void;
  setSelectedRadio: (r: string | null) => void;
  setSelectedSchoolCue: (cue: string | null) => void;
  setColegiosFilter: (f: Partial<ColegiosFilter>) => void;
  setColegiosViewMode: (m: '2d' | '3d') => void;
};

export const useEducacionStore = create<State>((set) => ({
  eph: null,
  loadingEph: false,
  errorEph: null,
  tab: 'colegios',
  radios: null,
  radiosGeo: null,
  schools: null,
  loadingColegios: false,
  errorColegios: null,
  radioMetric: 'vulnerability_score',
  selectedRadio: null,
  selectedSchoolCue: null,
  colegiosFilter: {
    partido: 'todos',
    sector: 'todos',
    nivel: 'todos',
    decileMin: 1,
    decileMax: 10,
  },
  colegiosViewMode: '2d',
  setLoadedEph: (eph) => set({ eph, loadingEph: false }),
  setErrorEph: (e) => set({ errorEph: e, loadingEph: false }),
  setLoadingEph: (b) => set({ loadingEph: b }),
  setTab: (t) => set({ tab: t }),
  setLoadedColegios: (radios, radiosGeo, schools) =>
    set({ radios, radiosGeo, schools, loadingColegios: false, errorColegios: null }),
  setLoadingColegios: (b) => set({ loadingColegios: b }),
  setErrorColegios: (e) => set({ errorColegios: e, loadingColegios: false }),
  setRadioMetric: (m) => set({ radioMetric: m }),
  setSelectedRadio: (r) => set({ selectedRadio: r }),
  setSelectedSchoolCue: (cue) => set({ selectedSchoolCue: cue }),
  setColegiosFilter: (f) =>
    set((s) => ({ colegiosFilter: { ...s.colegiosFilter, ...f } })),
  setColegiosViewMode: (m) => set({ colegiosViewMode: m }),
}));
