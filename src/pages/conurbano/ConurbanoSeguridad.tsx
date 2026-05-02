import { lazy, Suspense, useEffect } from 'react';
import { useSeguridadStore } from '../../components/conurbano/seguridad/store';
import { loadDataset } from '../../lib/conurbano/seguridad/data';

const Vista3DTab = lazy(() => import('../../components/conurbano/seguridad/Vista3DTab'));
const ComparadorTab = lazy(() => import('../../components/conurbano/seguridad/ComparadorTab'));
const ScrollytellingTab = lazy(
  () => import('../../components/conurbano/seguridad/ScrollytellingTab'),
);
const PanoramaTab = lazy(() => import('../../components/conurbano/seguridad/PanoramaTab'));

export default function ConurbanoSeguridad() {
  const { dataset, loading, error, tab, setTab, setLoaded, setLoading, setError } =
    useSeguridadStore();

  useEffect(() => {
    if (dataset) return;
    let cancelled = false;
    setLoading(true);
    loadDataset()
      .then((d) => {
        if (!cancelled) setLoaded(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Error al cargar SNIC');
      });
    return () => {
      cancelled = true;
    };
  }, [dataset, setLoaded, setLoading, setError]);

  return (
    <div className="landing-page">
      <section className="landing-section">
        <div className="section-header">
          <div className="section-number">🛡️</div>
          <div>
            <h2 className="section-title">Inseguridad en el Conurbano (SNIC 2000-2024)</h2>
            <p className="section-desc">
              Estadísticas oficiales del Sistema Nacional de Información Criminal para los 24
              partidos del Gran Buenos Aires: tendencias, comparativas y panorama temporal.
            </p>
          </div>
        </div>

        <div className="conu-shell-tabs" role="tablist" aria-label="Vistas">
          <Tab label="Panorama" id="panorama" tab={tab} setTab={setTab} />
          <Tab label="Vista 3D" id="vista3d" tab={tab} setTab={setTab} />
          <Tab label="Comparador" id="comparador" tab={tab} setTab={setTab} />
          <Tab label="Informe" id="scrolly" tab={tab} setTab={setTab} />
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          {error ? (
            <div className="conu-card" style={{ padding: 24, textAlign: 'center' }}>
              <div className="conu-eyebrow" style={{ color: '#ef4444' }}>
                Error
              </div>
              <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
                {error}
              </div>
            </div>
          ) : loading || !dataset ? (
            <div
              style={{
                minHeight: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-tertiary)',
              }}
            >
              Cargando dataset SNIC del Conurbano…
            </div>
          ) : (
            <Suspense
              fallback={
                <div
                  style={{
                    minHeight: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Cargando vista…
                </div>
              }
            >
              {tab === 'panorama' && <PanoramaTab />}
              {tab === 'vista3d' && <Vista3DTab />}
              {tab === 'comparador' && <ComparadorTab />}
              {tab === 'scrolly' && <ScrollytellingTab />}
            </Suspense>
          )}
        </div>
      </section>
    </div>
  );
}

function Tab({
  label,
  id,
  tab,
  setTab,
}: {
  label: string;
  id: 'vista3d' | 'comparador' | 'scrolly' | 'panorama';
  tab: string;
  setTab: (t: 'vista3d' | 'comparador' | 'scrolly' | 'panorama') => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      data-active={tab === id ? 'true' : 'false'}
      className="conu-shell-tab"
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );
}
