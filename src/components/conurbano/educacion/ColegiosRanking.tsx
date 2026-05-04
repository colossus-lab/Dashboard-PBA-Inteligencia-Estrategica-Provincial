import { useMemo } from 'react';
import { useEducacionStore } from './store';
import { RADIO_METRICS, type School } from '../../../lib/conurbano/educacion/types';

export default function ColegiosRanking({ schools }: { schools: School[] }) {
  const { radioMetric, selectedSchoolCue, setSelectedSchoolCue } = useEducacionStore();
  const spec = RADIO_METRICS.find((m) => m.id === radioMetric)!;

  const { ranking, excluidos } = useMemo(() => {
    const arr = schools
      .filter((s) => s.confianza !== 'baja')
      .map((s) => ({ s, v: numericFor(s, radioMetric) }))
      .filter((x) => x.v != null);
    arr.sort((a, b) => (spec.invertScale ? b.v! - a.v! : a.v! - b.v!));
    const excluidos = schools.filter((s) => s.confianza === 'baja').length;
    return { ranking: arr, excluidos };
  }, [schools, radioMetric, spec]);

  const topNote = spec.invertScale
    ? 'Peores primero (mayor vulnerabilidad)'
    : 'Mejores primero (mayor cobertura)';

  return (
    <aside className="conu-ranking-aside">
      <div className="conu-card conu-ranking-card">
        <div
          style={{
            borderBottom: '1px solid var(--border-glass)',
            padding: '12px 16px',
          }}
        >
          <div className="conu-eyebrow">Ranking colegios · {spec.label}</div>
          <div
            style={{
              marginTop: 2,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {topNote}
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-tertiary)' }}>
            {ranking.length.toLocaleString('es-AR')} colegios en la vista
            {excluidos > 0 && (
              <span style={{ color: 'var(--text-tertiary)' }}>
                {' · '}
                <span title="Geocoding aproximado al centroide de la localidad: el radio asignado sería engañoso, se excluyen del ranking">
                  {excluidos.toLocaleString('es-AR')} excluidos por baja confianza
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="conu-ranking-list">
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {ranking.slice(0, 500).map(({ s, v }, i) => {
              const isSel = selectedSchoolCue === s.cue;
              return (
                <li
                  key={s.cue}
                  style={{ borderBottom: '1px solid var(--border-glass)' }}
                >
                  <button
                    onClick={() => setSelectedSchoolCue(isSel ? null : s.cue)}
                    className="conu-rank-row"
                    data-selected={isSel ? 'true' : 'false'}
                  >
                    <span
                      style={{
                        width: 24,
                        flexShrink: 0,
                        textAlign: 'right',
                        fontSize: 11,
                        fontWeight: 500,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 12.5,
                          fontWeight: 500,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {s.nombre}
                        {s.confianza === 'media' && (
                          <span
                            title="Confianza media: geocoding por intersección/calle aproximada o radio con baja muestra"
                            style={{ marginLeft: 4, fontSize: 10, color: '#f59e0b' }}
                          >
                            ⚠
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          marginTop: 2,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 10.5,
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {s.partido} · {s.localidad} · {s.sector}
                      </span>
                    </span>
                    <span style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {v != null ? spec.format(v) : '—'}
                      </span>
                      {s.vulnerability_decile != null && (
                        <span
                          className="conu-decile-badge"
                          data-tier={decileTier(s.vulnerability_decile)}
                        >
                          d{s.vulnerability_decile}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {ranking.length > 500 && (
            <div
              style={{
                padding: '8px 16px',
                textAlign: 'center',
                fontSize: 10.5,
                color: 'var(--text-tertiary)',
              }}
            >
              Mostrando primeros 500 de {ranking.length.toLocaleString('es-AR')}. Aplicá filtros
              para acotar.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function numericFor(s: School, m: string): number | null {
  const v = (s as unknown as Record<string, unknown>)[m];
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function decileTier(d: number): string {
  if (d >= 9) return 'red';
  if (d >= 7) return 'orange';
  if (d >= 5) return 'amber';
  if (d >= 3) return 'lime';
  return 'green';
}
