import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSeguridadStore } from './store';
import {
  hechosDelito,
  tasaDelito,
  yoyChange,
} from '../../../lib/conurbano/seguridad/analytics';
import type { Metric } from '../../../lib/conurbano/seguridad/types';
import { useStore } from '../../../store/useStore';

const PALETA = [
  '#10b981',
  '#00d4ff',
  '#eab308',
  '#ef4444',
  '#a855f7',
  '#06b6d4',
  '#ec4899',
  '#f97316',
];

export default function ComparadorTab() {
  const { dataset } = useSeguridadStore();
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [delitoId, setDelitoId] = useState<string>('1');
  const [metric, setMetric] = useState<Metric>('tasa');
  const [anio, setAnio] = useState<number>(0);
  const [seleccion, setSeleccion] = useState<string[]>([]);

  useEffect(() => {
    if (!dataset) return;
    setAnio(dataset.anios[dataset.anios.length - 1]);
    if (!dataset.delitos.find((d) => d.id === delitoId)) setDelitoId(dataset.delitos[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset]);

  const di = dataset ? dataset.delitos.findIndex((d) => d.id === delitoId) : -1;
  const ai = dataset ? dataset.anios.indexOf(anio) : -1;
  const delitoNombre = di >= 0 && dataset ? dataset.delitos[di].nombre : '';

  const togglePartido = (id: string | null) => {
    if (!id) return;
    setSeleccion((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 8) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const partidosOrdenados = useMemo(() => {
    if (!dataset || di < 0 || ai < 0) return [];
    return dataset.partidos
      .map((p, pi) => {
        const val =
          metric === 'tasa' ? tasaDelito(dataset, pi, di, ai) : hechosDelito(dataset, pi, di, ai);
        const valPrev =
          ai > 0
            ? metric === 'tasa'
              ? tasaDelito(dataset, pi, di, ai - 1)
              : hechosDelito(dataset, pi, di, ai - 1)
            : 0;
        const yoy = yoyChange(val, valPrev);
        return { id: p.id, nombre: p.nombre, valor: val, yoy };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [dataset, di, ai, metric]);

  const chartData = useMemo(() => {
    if (!dataset || di < 0) return [];
    return dataset.anios.map((a, aIdx) => {
      const row: Record<string, number | string> = { anio: a };
      const allVals = dataset.partidos.map((_, pi) =>
        metric === 'tasa' ? tasaDelito(dataset, pi, di, aIdx) : hechosDelito(dataset, pi, di, aIdx),
      );
      if (metric === 'tasa') {
        const nz = allVals.filter((v) => v > 0);
        row._conurbano = nz.length ? nz.reduce((x, y) => x + y, 0) / nz.length : 0;
      } else {
        row._conurbano = allVals.reduce((x, y) => x + y, 0);
      }
      seleccion.forEach((id) => {
        const pi = dataset.partidos.findIndex((p) => p.id === id);
        if (pi < 0) return;
        row[id] =
          metric === 'tasa'
            ? tasaDelito(dataset, pi, di, aIdx)
            : hechosDelito(dataset, pi, di, aIdx);
      });
      return row;
    });
  }, [dataset, di, metric, seleccion]);

  if (!dataset) return null;

  const unidad = metric === 'tasa' ? ' /100k' : '';
  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { maximumFractionDigits: metric === 'tasa' ? 1 : 0 });

  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const tickColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const tooltipBg = isDark ? '#1a1f2e' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const tooltipText = isDark ? '#f1f5f9' : '#0f172a';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section className="conu-card" style={{ padding: 24 }}>
        <div className="conu-controls-grid">
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span className="conu-eyebrow">Tipo de delito</span>
            <select
              value={delitoId}
              onChange={(e) => setDelitoId(e.target.value)}
              className="conu-select"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14 }}
            >
              {dataset.delitos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="conu-eyebrow">Métrica</span>
            <div className="conu-toggle-group">
              {(['tasa', 'hechos'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className="conu-pill"
                  data-active={metric === m ? 'true' : 'false'}
                  style={{ borderColor: 'transparent', padding: '8px 14px', fontSize: 13 }}
                >
                  {m === 'tasa' ? 'Tasa /100k' : 'Hechos'}
                </button>
              ))}
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="conu-eyebrow">Año de referencia</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {anio}
              </span>
            </span>
            <input
              type="range"
              min={dataset.anios[0]}
              max={dataset.anios[dataset.anios.length - 1]}
              step={1}
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10.5,
                color: 'var(--text-tertiary)',
              }}
            >
              <span>{dataset.anios[0]}</span>
              <span>{dataset.anios[dataset.anios.length - 1]}</span>
            </div>
          </label>
        </div>
      </section>

      <section style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span className="conu-eyebrow" style={{ marginRight: 4 }}>
          En comparación
        </span>
        {seleccion.length === 0 && (
          <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
            Tocá las tarjetas de los partidos para agregarlos al comparador (hasta 8).
          </span>
        )}
        {seleccion.map((id, i) => {
          const p = dataset.partidos.find((x) => x.id === id);
          if (!p) return null;
          const color = PALETA[i % PALETA.length];
          return (
            <button
              key={id}
              onClick={() => togglePartido(id)}
              className="conu-chip-btn"
            >
              <span
                style={{
                  display: 'inline-block',
                  height: 8,
                  width: 8,
                  borderRadius: 999,
                  background: color,
                }}
              />
              <span>{p.nombre}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>✕</span>
            </button>
          );
        })}
        {seleccion.length > 0 && (
          <button
            onClick={() => setSeleccion([])}
            style={{
              marginLeft: 8,
              fontSize: 12,
              color: 'var(--text-tertiary)',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            limpiar
          </button>
        )}
      </section>

      <section className="conu-card" style={{ padding: 20 }}>
        <header
          style={{
            marginBottom: 16,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            paddingBottom: 12,
            borderBottom: '1px solid var(--border-glass)',
          }}
        >
          <div>
            <div className="conu-eyebrow">Partidos del Conurbano</div>
            <h3 style={{ marginTop: 2, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              24 jurisdicciones · orden alfabético
            </h3>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {delitoNombre} · {metric === 'tasa' ? 'Tasa /100k' : 'Hechos'} · {anio}
          </span>
        </header>
        <div className="conu-partidos-grid">
          {partidosOrdenados.map((p) => {
            const idx = seleccion.indexOf(p.id);
            const seleccionado = idx >= 0;
            const color = seleccionado ? PALETA[idx % PALETA.length] : null;
            const up = p.yoy !== null && p.yoy >= 0;
            return (
              <button
                key={p.id}
                onClick={() => togglePartido(p.id)}
                className="conu-partido-card"
                data-selected={seleccionado ? 'true' : 'false'}
                style={
                  seleccionado && color
                    ? {
                        borderColor: color,
                        background: `${color}1f`,
                      }
                    : undefined
                }
              >
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {p.nombre}
                  </span>
                  {seleccionado && color && (
                    <span
                      style={{
                        marginLeft: 8,
                        display: 'inline-block',
                        height: 8,
                        width: 8,
                        flexShrink: 0,
                        borderRadius: 999,
                        background: color,
                      }}
                    />
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {fmt(p.valor)}
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: 10,
                      fontWeight: 400,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {metric === 'tasa' ? '/100k' : ''}
                  </span>
                </div>
                {p.yoy !== null ? (
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 500,
                      color: up ? '#ef4444' : '#10b981',
                    }}
                  >
                    {up ? '▲' : '▼'} {Math.abs(p.yoy).toFixed(1)}% vs {anio - 1}
                  </div>
                ) : (
                  <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>sin comparable</div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="conu-card" style={{ padding: 0 }}>
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-glass)',
          }}
        >
          <div>
            <div className="conu-eyebrow">Serie histórica</div>
            <h3 style={{ marginTop: 2, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Evolución comparada · {delitoNombre}
            </h3>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {metric === 'tasa' ? 'Tasa /100k hab' : 'Hechos'} · {dataset.anios[0]}–
            {dataset.anios[dataset.anios.length - 1]}
          </span>
        </header>
        <div style={{ height: 340, padding: 16 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="2 3" vertical={false} />
              <XAxis
                dataKey="anio"
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={{ stroke: gridColor }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 6,
                  fontSize: 12,
                  color: tooltipText,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
                labelStyle={{ color: tooltipText, fontWeight: 600 }}
                formatter={(v: unknown, name: string) => {
                  const n = typeof v === 'number' ? v : Number(v);
                  const etiqueta =
                    name === '_conurbano'
                      ? metric === 'tasa'
                        ? 'Promedio Conurbano'
                        : 'Total Conurbano'
                      : dataset.partidos.find((p) => p.id === name)?.nombre ?? name;
                  return [Number.isFinite(n) ? `${fmt(n)}${unidad}` : '—', etiqueta];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: tickColor, paddingTop: 8 }}
                iconType="plainline"
                formatter={(value: string) =>
                  value === '_conurbano'
                    ? metric === 'tasa'
                      ? 'Promedio Conurbano'
                      : 'Total Conurbano'
                    : dataset.partidos.find((p) => p.id === value)?.nombre ?? value
                }
              />
              <Line
                type="monotone"
                dataKey="_conurbano"
                stroke={isDark ? '#94a3b8' : '#64748b'}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
              />
              {seleccion.map((id, i) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  stroke={PALETA[i % PALETA.length]}
                  strokeWidth={2.5}
                  dot={{
                    r: 2.5,
                    fill: PALETA[i % PALETA.length],
                    stroke: isDark ? '#1a1f2e' : '#fff',
                    strokeWidth: 1.5,
                  }}
                  activeDot={{ r: 4.5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {seleccion.length > 0 && (
        <section className="conu-card" style={{ padding: 0 }}>
          <header
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-glass)',
            }}
          >
            <div>
              <div className="conu-eyebrow">Cuadro comparativo · {anio}</div>
              <h3 style={{ marginTop: 2, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {seleccion.length} partidos en comparación
              </h3>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Variación interanual vs {anio - 1}
            </span>
          </header>
          <div style={{ overflowX: 'auto' }}>
            <table className="conu-comparador-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Partido</th>
                  <th style={{ textAlign: 'right' }}>{anio}</th>
                  <th style={{ textAlign: 'right' }}>{anio - 1}</th>
                  <th style={{ textAlign: 'right' }}>Δ absoluto</th>
                  <th style={{ textAlign: 'right' }}>Δ %</th>
                </tr>
              </thead>
              <tbody>
                {seleccion.map((id, i) => {
                  const pi = dataset.partidos.findIndex((p) => p.id === id);
                  if (pi < 0) return null;
                  const p = dataset.partidos[pi];
                  const color = PALETA[i % PALETA.length];
                  const vNow =
                    metric === 'tasa'
                      ? tasaDelito(dataset, pi, di, ai)
                      : hechosDelito(dataset, pi, di, ai);
                  const vPrev =
                    ai > 0
                      ? metric === 'tasa'
                        ? tasaDelito(dataset, pi, di, ai - 1)
                        : hechosDelito(dataset, pi, di, ai - 1)
                      : 0;
                  const absDelta = vNow - vPrev;
                  const pct = yoyChange(vNow, vPrev);
                  const up = (pct ?? 0) >= 0;
                  const positiveColor = '#ef4444';
                  const negativeColor = '#10b981';
                  return (
                    <tr key={id}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              height: 10,
                              width: 10,
                              borderRadius: 999,
                              background: color,
                            }}
                          />
                          {p.nombre}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>
                        {fmt(vNow)}
                        {unidad}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {fmt(vPrev)}
                        {unidad}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: absDelta >= 0 ? positiveColor : negativeColor,
                        }}
                      >
                        {absDelta >= 0 ? '+' : ''}
                        {fmt(absDelta)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          color:
                            pct === null
                              ? 'var(--text-tertiary)'
                              : up
                                ? positiveColor
                                : negativeColor,
                        }}
                      >
                        {pct === null ? '—' : `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        Seleccioná hasta 8 partidos desde la <strong>grilla alfabética</strong> para superponerlos
        en la serie temporal y verlos en el cuadro comparativo. La línea gris punteada representa
        el {metric === 'tasa' ? 'promedio' : 'total'} del Conurbano como baseline.
      </p>
    </div>
  );
}
