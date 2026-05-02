import { lazy, Suspense } from 'react';
import ColegiosTab from '../../components/conurbano/educacion/ColegiosTab';
import { useEducacionStore } from '../../components/conurbano/educacion/store';

const SerieTab = lazy(() => import('../../components/conurbano/educacion/SerieTab'));

export default function ConurbanoEducacion() {
  const { tab, setTab } = useEducacionStore();

  return (
    <div className="landing-page">
      <section className="landing-section">
        <div className="section-header">
          <div className="section-number">🏫</div>
          <div>
            <h2 className="section-title">Vulnerabilidad Escolar en el Conurbano</h2>
            <p className="section-desc">
              Cruzamos el Censo 2022 a nivel de radio censal con el padrón georreferenciado
              de establecimientos educativos para identificar escuelas que sirven a
              comunidades en mayor vulnerabilidad socioeconómica.
            </p>
          </div>
        </div>

        <div className="conu-shell-tabs" role="tablist" aria-label="Vistas">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'colegios'}
            data-active={tab === 'colegios' ? 'true' : 'false'}
            className="conu-shell-tab"
            onClick={() => setTab('colegios')}
          >
            Mapa · Radios × Colegios
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'serie'}
            data-active={tab === 'serie' ? 'true' : 'false'}
            className="conu-shell-tab"
            onClick={() => setTab('serie')}
          >
            Serie EPH · 2017-2025
          </button>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          {tab === 'colegios' ? (
            <ColegiosTab />
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
                  Cargando serie EPH…
                </div>
              }
            >
              <SerieTab />
            </Suspense>
          )}
        </div>
      </section>
    </div>
  );
}
