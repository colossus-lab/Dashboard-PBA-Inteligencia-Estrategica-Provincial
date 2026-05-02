import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEducacionStore } from './store';
import { loadEph } from '../../../lib/conurbano/educacion/data';
import { useStore } from '../../../store/useStore';

type Indicador = 'asistencia' | 'nivel_max' | 'alfabetizacion';

const INDICADORES: { id: Indicador; label: string; description: string }[] = [
  {
    id: 'asistencia',
    label: 'Asistencia por grupo etario',
    description:
      'Tasa trimestral ponderada (PONDERA) de asistencia escolar, según grupos de edad relevantes para cada nivel educativo.',
  },
  {
    id: 'nivel_max',
    label: 'Nivel educativo (25+)',
    description:
      'Distribución de la población adulta del GBA por máximo nivel educativo alcanzado.',
  },
  {
    id: 'alfabetizacion',
    label: 'Alfabetización (10+)',
    description: 'Porcentaje de población de 10 años o más que sabe leer y escribir.',
  },
];

export default function SerieTab() {
  const { eph, loadingEph, errorEph, setLoadedEph, setLoadingEph, setErrorEph } =
    useEducacionStore();
  const theme = useStore((s) => s.theme);
  const [indicador, setIndicador] = useState<Indicador>('asistencia');

  useEffect(() => {
    if (eph) return;
    let cancelled = false;
    setLoadingEph(true);
    loadEph()
      .then((d) => {
        if (!cancelled) setLoadedEph(d);
      })
      .catch((err) => {
        if (!cancelled) setErrorEph(err.message ?? 'Error al cargar la serie EPH');
      });
    return () => {
      cancelled = true;
    };
  }, [eph, setLoadedEph, setLoadingEph, setErrorEph]);

  if (errorEph) {
    return (
      <div className="conu-card" style={{ padding: 24, textAlign: 'center' }}>
        <div className="conu-eyebrow" style={{ color: '#ef4444' }}>
          Error
        </div>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>{errorEph}</div>
      </div>
    );
  }

  if (loadingEph || !eph) {
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
        Cargando serie EPH…
      </div>
    );
  }

  const data = eph.series.map((p) => ({
    label: p.label,
    '5–11': p.tasa_asistencia_5_11,
    '12–17': p.tasa_asistencia_12_17,
    '18–24': p.tasa_asistencia_18_24,
    'Sin instr.': p.pct_sin_instruccion_25mas,
    'Prim. inc': p.pct_primario_inc_25mas,
    'Prim. comp': p.pct_primario_comp_25mas,
    'Sec. inc': p.pct_secundario_inc_25mas,
    'Sec. comp': p.pct_secundario_comp_25mas,
    'Sup. inc': p.pct_superior_inc_25mas,
    'Sup. comp': p.pct_superior_comp_25mas,
    Alfabetización: p.tasa_alfabetizacion_10mas,
  }));

  const ultimo = eph.series[eph.series.length - 1];
  const primero = eph.series[0];
  const deltaAlf =
    ultimo?.tasa_alfabetizacion_10mas != null && primero?.tasa_alfabetizacion_10mas != null
      ? ultimo.tasa_alfabetizacion_10mas - primero.tasa_alfabetizacion_10mas
      : null;

  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const tickColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const axisColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
  const tooltipBg = isDark ? '#1a1f2e' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const tooltipText = isDark ? '#f1f5f9' : '#0f172a';

  const tooltipStyle = {
    background: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: tooltipText,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="conu-kpi-grid">
        <SerieCard
          label="Trimestres"
          value={eph.meta.n_trimestres.toString()}
          sub={`${eph.meta.primer_trim} → ${eph.meta.ultimo_trim}`}
        />
        <SerieCard
          label="Asistencia 5–17 (último T)"
          value={`${ultimo?.tasa_asistencia_5_17?.toFixed(1) ?? '—'}%`}
          sub="Niños y adolescentes en escuela"
          accent="emerald"
        />
        <SerieCard
          label="Sup. completo 25+"
          value={`${ultimo?.pct_superior_comp_25mas?.toFixed(1) ?? '—'}%`}
          sub="Adultos con título terciario+"
        />
        <SerieCard
          label="Alfabetización 10+"
          value={`${ultimo?.tasa_alfabetizacion_10mas?.toFixed(2) ?? '—'}%`}
          sub={
            deltaAlf == null
              ? '—'
              : `Δ ${deltaAlf >= 0 ? '+' : ''}${deltaAlf.toFixed(2)} pp vs ${primero.label}`
          }
        />
      </div>

      <div className="conu-panel">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span className="conu-eyebrow" style={{ marginRight: 4 }}>
            Indicador
          </span>
          {INDICADORES.map((i) => (
            <button
              key={i.id}
              onClick={() => setIndicador(i.id)}
              className="conu-pill"
              data-active={indicador === i.id ? 'true' : 'false'}
              title={i.description}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      <div className="conu-card" style={{ padding: 20 }}>
        <div
          style={{
            marginBottom: 8,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div>
            <div className="conu-eyebrow">Serie temporal · Aglomerado 33 (Partidos del GBA)</div>
            <h2
              style={{
                marginTop: 2,
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {INDICADORES.find((i) => i.id === indicador)!.label}
            </h2>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>EPH continua, INDEC</div>
        </div>

        <div style={{ height: 420 }}>
          <ResponsiveContainer>
            {indicador === 'asistencia' ? (
              <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: tickColor }}
                  tickLine={false}
                  axisLine={{ stroke: axisColor }}
                />
                <YAxis
                  domain={[40, 100]}
                  tick={{ fontSize: 10, fill: tickColor }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => `${v?.toFixed(1) ?? '—'}%`}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, color: tickColor }} />
                <Line type="monotone" dataKey="5–11" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                <Line
                  type="monotone"
                  dataKey="12–17"
                  stroke="#00d4ff"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="18–24"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            ) : indicador === 'nivel_max' ? (
              <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: tickColor }}
                  tickLine={false}
                  axisLine={{ stroke: axisColor }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: tickColor }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => `${v?.toFixed(1) ?? '—'}%`}
                />
                <Legend wrapperStyle={{ fontSize: 11.5, paddingTop: 8, color: tickColor }} />
                <Area
                  type="monotone"
                  dataKey="Sin instr."
                  stackId="1"
                  stroke="#ef4444"
                  fill="rgba(239,68,68,0.25)"
                />
                <Area
                  type="monotone"
                  dataKey="Prim. inc"
                  stackId="1"
                  stroke="#f97316"
                  fill="rgba(249,115,22,0.25)"
                />
                <Area
                  type="monotone"
                  dataKey="Prim. comp"
                  stackId="1"
                  stroke="#eab308"
                  fill="rgba(234,179,8,0.25)"
                />
                <Area
                  type="monotone"
                  dataKey="Sec. inc"
                  stackId="1"
                  stroke="#94a3b8"
                  fill="rgba(148,163,184,0.25)"
                />
                <Area
                  type="monotone"
                  dataKey="Sec. comp"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="rgba(59,130,246,0.25)"
                />
                <Area
                  type="monotone"
                  dataKey="Sup. inc"
                  stackId="1"
                  stroke="#06b6d4"
                  fill="rgba(6,182,212,0.25)"
                />
                <Area
                  type="monotone"
                  dataKey="Sup. comp"
                  stackId="1"
                  stroke="#10b981"
                  fill="rgba(16,185,129,0.4)"
                />
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: tickColor }}
                  tickLine={false}
                  axisLine={{ stroke: axisColor }}
                />
                <YAxis
                  domain={[95, 100]}
                  tick={{ fontSize: 10, fill: tickColor }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => `${v?.toFixed(2) ?? '—'}%`}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, color: tickColor }} />
                <Line
                  type="monotone"
                  dataKey="Alfabetización"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <p
          style={{
            marginTop: 12,
            fontSize: 12,
            lineHeight: 1.4,
            color: 'var(--text-tertiary)',
          }}
        >
          {INDICADORES.find((i) => i.id === indicador)!.description}{' '}
          <span>
            Estimaciones ponderadas con expansión muestral (variable PONDERA, EPH continua).
            {indicador === 'nivel_max' &&
              " La suma puede ser inferior a 100 % por la categoría 'NS/NR' (NIVEL_ED=9), excluida."}
          </span>
        </p>
      </div>
    </div>
  );
}

function SerieCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'emerald' | 'danger';
}) {
  const color =
    accent === 'emerald' ? '#10b981' : accent === 'danger' ? '#ef4444' : 'var(--text-primary)';
  return (
    <div className="conu-kpi">
      <div className="conu-eyebrow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div className="conu-kpi-value" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div
          className="conu-kpi-sub"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
