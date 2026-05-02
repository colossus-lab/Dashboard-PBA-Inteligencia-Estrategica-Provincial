import { useEffect, useMemo } from 'react';
import { useEducacionStore } from './store';
import {
  loadRadios,
  loadRadiosGeo,
  loadSchools,
} from '../../../lib/conurbano/educacion/data';
import {
  RADIO_METRICS,
  type School,
  type RadioCensal,
} from '../../../lib/conurbano/educacion/types';
import { lazy, Suspense } from 'react';
import ColegiosMap2D from './ColegiosMap2D';
import ColegiosFilters from './ColegiosFilters';
import ColegiosRanking from './ColegiosRanking';
import SchoolDetail from './SchoolDetail';

const ColegiosMap3D = lazy(() => import('./ColegiosMap3D'));

export default function ColegiosTab() {
  const {
    radios,
    radiosGeo,
    schools,
    loadingColegios,
    errorColegios,
    setLoadedColegios,
    setLoadingColegios,
    setErrorColegios,
    radioMetric,
    colegiosFilter,
    selectedSchoolCue,
    colegiosViewMode,
    setColegiosViewMode,
  } = useEducacionStore();

  useEffect(() => {
    if (radios && radiosGeo && schools) return;
    let cancelled = false;
    setLoadingColegios(true);
    Promise.all([loadRadios(), loadRadiosGeo(), loadSchools()])
      .then(([r, g, s]) => {
        if (!cancelled) setLoadedColegios(r, g, s);
      })
      .catch((err) => {
        if (!cancelled) setErrorColegios(err.message ?? 'Error al cargar colegios');
      });
    return () => {
      cancelled = true;
    };
  }, [radios, radiosGeo, schools, setLoadedColegios, setLoadingColegios, setErrorColegios]);

  const filteredSchools = useMemo<School[]>(() => {
    if (!schools) return [];
    return schools.filter((s) => {
      if (colegiosFilter.partido !== 'todos' && s.partido !== colegiosFilter.partido) return false;
      if (colegiosFilter.sector !== 'todos' && s.sector !== colegiosFilter.sector) return false;
      if (colegiosFilter.nivel !== 'todos' && !s.niveles.includes(colegiosFilter.nivel))
        return false;
      const dec = s.vulnerability_decile;
      if (dec == null) return colegiosFilter.decileMin <= 1;
      return dec >= colegiosFilter.decileMin && dec <= colegiosFilter.decileMax;
    });
  }, [schools, colegiosFilter]);

  const spec = RADIO_METRICS.find((m) => m.id === radioMetric)!;

  if (errorColegios) {
    return (
      <div className="conu-card" style={{ padding: 24, textAlign: 'center' }}>
        <div className="conu-eyebrow" style={{ color: '#ef4444' }}>
          Error
        </div>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          {errorColegios}
        </div>
      </div>
    );
  }

  if (loadingColegios || !radios || !radiosGeo || !schools) {
    return (
      <div
        style={{
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
        }}
      >
        Cargando radios censales y colegios…
      </div>
    );
  }

  const selectedSchool = selectedSchoolCue
    ? filteredSchools.find((s) => s.cue === selectedSchoolCue) ??
      schools.find((s) => s.cue === selectedSchoolCue) ??
      null
    : null;
  const radioOfSchool: RadioCensal | null = selectedSchool?.radio_id
    ? radios.radios[selectedSchool.radio_id] ?? null
    : null;

  return (
    <div className="conu-tab-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <ColegiosKpis radios={radios} schools={schools} filteredCount={filteredSchools.length} />
        <ColegiosFilters />
        <div className="conu-panel">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span className="conu-eyebrow" style={{ marginRight: 4 }}>
              Métrica del radio
            </span>
            {RADIO_METRICS.map((m) => {
              const active = radioMetric === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => useEducacionStore.getState().setRadioMetric(m.id)}
                  className="conu-pill"
                  data-active={active ? 'true' : 'false'}
                  title={m.description}
                >
                  {m.label}
                </button>
              );
            })}
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                gap: 4,
                padding: 2,
                border: '1px solid var(--border-glass)',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
              }}
            >
              <button
                onClick={() => setColegiosViewMode('2d')}
                className="conu-pill"
                data-active={colegiosViewMode === '2d' ? 'true' : 'false'}
                title="Mapa plano · ideal para análisis detallado y zoom alto"
                style={{ borderColor: 'transparent' }}
              >
                2D
              </button>
              <button
                onClick={() => setColegiosViewMode('3d')}
                className="conu-pill"
                data-active={colegiosViewMode === '3d' ? 'true' : 'false'}
                title="Vista volumétrica · superficie de vulnerabilidad con relieve"
                style={{ borderColor: 'transparent' }}
              >
                3D
              </button>
            </div>
          </div>
        </div>

        <div
          className="conu-map-wrap"
          style={
            colegiosViewMode === '3d'
              ? { background: '#0a1220', borderColor: 'rgba(6, 78, 59, 0.5)' }
              : undefined
          }
        >
          {colegiosViewMode === '3d' ? (
            <Suspense
              fallback={
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'rgba(110, 231, 183, 0.7)',
                  }}
                >
                  Cargando vista 3D…
                </div>
              }
            >
              <ColegiosMap3D radiosGeo={radiosGeo} radios={radios} schools={filteredSchools} />
            </Suspense>
          ) : (
            <ColegiosMap2D radiosGeo={radiosGeo} radios={radios} schools={filteredSchools} />
          )}
        </div>

        <div className="conu-card" style={{ padding: '12px 16px', fontSize: 12.5 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{spec.label}.</span>{' '}
          <span style={{ color: 'var(--text-tertiary)' }}>{spec.description}</span>{' '}
          <span style={{ color: 'var(--text-tertiary)' }}>
            Fuente: INDEC — Censo Nacional 2022 (datos por radio censal vía paquete{' '}
            <code style={{ color: 'var(--text-tertiary)' }}>censoargentino</code>).
          </span>
        </div>

        {selectedSchool && (
          <SchoolDetail
            school={selectedSchool}
            radio={radioOfSchool}
            otrosEnRadio={
              selectedSchool.radio_id
                ? schools.filter(
                    (s) =>
                      s.radio_id === selectedSchool.radio_id && s.cue !== selectedSchool.cue,
                  )
                : []
            }
            onClose={() => useEducacionStore.getState().setSelectedSchoolCue(null)}
          />
        )}
      </div>

      <ColegiosRanking schools={filteredSchools} />
    </div>
  );
}

function ColegiosKpis({
  radios,
  schools,
  filteredCount,
}: {
  radios: { meta: { n_radios: number } };
  schools: School[];
  filteredCount: number;
}) {
  const conf = useMemo(() => {
    let alta = 0,
      media = 0,
      baja = 0;
    for (const s of schools) {
      if (s.confianza === 'alta') alta++;
      else if (s.confianza === 'media') media++;
      else baja++;
    }
    return { alta, media, baja };
  }, [schools]);
  const total = schools.length;
  return (
    <div className="conu-kpi-grid">
      <Kpi label="Radios censales" value={radios.meta.n_radios.toLocaleString('es-AR')} />
      <Kpi label="Colegios geocodificados" value={total.toLocaleString('es-AR')} />
      <Kpi
        label="Confianza del cruce"
        value={`${conf.alta.toLocaleString('es-AR')} · ${conf.media.toLocaleString('es-AR')} · ${conf.baja.toLocaleString('es-AR')}`}
        sublabel={`${pct(conf.alta, total)} alta · ${pct(conf.media, total)} media · ${pct(conf.baja, total)} baja`}
      />
      <Kpi
        label="Vista (filtros aplicados)"
        value={filteredCount.toLocaleString('es-AR')}
      />
      {conf.baja > 0 ? (
        <div
          className="conu-alert"
          data-severity="medium"
          style={{ gridColumn: '1 / -1', marginTop: 0 }}
        >
          <strong>{conf.baja.toLocaleString('es-AR')}</strong> colegio(s) con confianza baja:
          el geocoding cayó al centroide de la localidad. Aparecen como puntos grises chicos,
          quedan <strong>fuera del ranking</strong> y los indicadores que se muestran no son confiables.
        </div>
      ) : null}
    </div>
  );
}

function pct(part: number, total: number): string {
  return total === 0 ? '0%' : `${Math.round((100 * part) / total)}%`;
}

function Kpi({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="conu-kpi">
      <div className="conu-eyebrow">{label}</div>
      <div className="conu-kpi-value">{value}</div>
      {sublabel && <div className="conu-kpi-sub">{sublabel}</div>}
    </div>
  );
}
