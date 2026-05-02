import { useMemo } from 'react';
import { useEducacionStore } from './store';

const NIVELES = [
  'todos',
  'Inicial',
  'Nivel inicial',
  'Primario',
  'Secundario',
  'SNU',
  'Adultos',
  'Especial',
  'Formación Profesional',
];

export default function ColegiosFilters() {
  const { schools, colegiosFilter, setColegiosFilter } = useEducacionStore();
  const partidos = useMemo(() => {
    const set = new Set<string>();
    schools?.forEach((s) => s.partido && set.add(s.partido));
    return ['todos', ...Array.from(set).sort()];
  }, [schools]);

  return (
    <div className="conu-panel">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Field label="Partido">
          <select
            className="conu-select"
            value={colegiosFilter.partido}
            onChange={(e) => setColegiosFilter({ partido: e.target.value })}
          >
            {partidos.map((p) => (
              <option key={p} value={p}>
                {p === 'todos' ? 'Todos los partidos' : p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sector">
          <select
            className="conu-select"
            value={colegiosFilter.sector}
            onChange={(e) => setColegiosFilter({ sector: e.target.value })}
          >
            {['todos', 'Estatal', 'Privado'].map((s) => (
              <option key={s} value={s}>
                {s === 'todos' ? 'Todos' : s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nivel">
          <select
            className="conu-select"
            value={colegiosFilter.nivel}
            onChange={(e) => setColegiosFilter({ nivel: e.target.value })}
          >
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                {n === 'todos' ? 'Todos los niveles' : n}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={`Decil de vulnerabilidad: ${colegiosFilter.decileMin}–${colegiosFilter.decileMax}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={colegiosFilter.decileMin}
              onChange={(e) =>
                setColegiosFilter({
                  decileMin: Math.min(Number(e.target.value), colegiosFilter.decileMax),
                })
              }
              style={{ width: 112, accentColor: 'var(--accent-cyan)' }}
            />
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={colegiosFilter.decileMax}
              onChange={(e) =>
                setColegiosFilter({
                  decileMax: Math.max(Number(e.target.value), colegiosFilter.decileMin),
                })
              }
              style={{ width: 112, accentColor: 'var(--accent-cyan)' }}
            />
          </div>
        </Field>
        <button
          onClick={() =>
            setColegiosFilter({
              partido: 'todos',
              sector: 'todos',
              nivel: 'todos',
              decileMin: 1,
              decileMax: 10,
            })
          }
          className="conu-btn-ghost"
          style={{ marginLeft: 'auto' }}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="conu-eyebrow">{label}</span>
      {children}
    </label>
  );
}
