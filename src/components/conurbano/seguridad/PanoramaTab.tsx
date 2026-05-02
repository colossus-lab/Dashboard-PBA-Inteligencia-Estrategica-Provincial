import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSeguridadStore } from './store';
import { loadGeoJSON } from '../../../lib/conurbano/seguridad/data';
import { buildIntroScenes } from '../../../lib/conurbano/seguridad/introScenes';
import {
  balanceInteranual,
  changeVsWindow,
  composicionPartido,
  delitoMasFrecuente,
  distribucion,
  hechosDelito,
  projeccionTexto,
  ratioViolenciaPropiedad,
  serieTotales,
  tasaDelito,
  totalHechos,
  totalesPorPartido,
  yoyChange,
} from '../../../lib/conurbano/seguridad/analytics';
import type { Metric } from '../../../lib/conurbano/seguridad/types';
import { useRechartsTheme } from './rechartsTheme';

const Choropleth = lazy(() => import('./Choropleth'));
const IntroCarousel = lazy(() => import('./intro/IntroCarousel'));

export default function PanoramaTab() {
  const { dataset, anio, setAnio, municipioSel, setMunicipio } = useSeguridadStore();
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);

  const [expDelitoId, setExpDelitoId] = useState<string>('1');
  const [expMetric, setExpMetric] = useState<Metric>('tasa');

  useEffect(() => {
    loadGeoJSON().then(setGeo).catch(console.error);
  }, []);

  const ai = dataset ? dataset.anios.indexOf(anio) : -1;

  const valuesMap = useMemo(() => {
    if (!dataset || ai < 0) return {};
    const totals = totalesPorPartido(dataset, ai);
    const m: Record<string, number> = {};
    dataset.partidos.forEach((p, pi) => {
      m[p.id] = totals[pi];
    });
    return m;
  }, [dataset, ai]);

  const renderHover = useMemo(() => {
    if (!dataset || ai < 0) return undefined;
    return (id: string, nombre: string, value: number) => {
      const pi = dataset.partidos.findIndex((p) => p.id === id);
      if (pi < 0) return null;
      const series = serieTotales(dataset, pi);
      const yoy = yoyChange(series[ai], series[ai - 1] ?? 0);
      const { pct: vsAvg } = changeVsWindow(series, ai, 5);
      const narrativa = projeccionTexto({ nombre, yoy, vsPromedio: vsAvg });
      return (
        <HoverContent
          nombre={nombre}
          total={value}
          yoy={yoy}
          vsAvg={vsAvg}
          narrativa={narrativa}
          anio={dataset.anios[ai]}
        />
      );
    };
  }, [dataset, ai]);

  const rankingDelta = useMemo(() => {
    if (!dataset || ai < 0)
      return {
        top: [] as { id: string; nombre: string; total: number; yoy: number }[],
        bottom: [] as { id: string; nombre: string; total: number; yoy: number }[],
        totalConurbano: 0,
        promYoy: null as number | null,
      };
    const rows = dataset.partidos.map((p, pi) => {
      const series = serieTotales(dataset, pi);
      const yoy = yoyChange(series[ai], series[ai - 1] ?? 0);
      return { id: p.id, nombre: p.nombre, total: series[ai], yoy };
    });
    const withYoy = rows.filter((r) => r.yoy !== null) as {
      id: string;
      nombre: string;
      total: number;
      yoy: number;
    }[];
    const top = [...withYoy].sort((a, b) => b.yoy - a.yoy).slice(0, 5);
    const bottom = [...withYoy].sort((a, b) => a.yoy - b.yoy).slice(0, 5);
    const totalConurbano = rows.reduce((a, r) => a + r.total, 0);
    const promYoy = withYoy.length
      ? withYoy.reduce((a, r) => a + r.yoy, 0) / withYoy.length
      : null;
    return { top, bottom, totalConurbano, promYoy };
  }, [dataset, ai]);

  const stats = useMemo(() => {
    if (!dataset || ai < 0) return null;
    const totales = totalesPorPartido(dataset, ai);
    const dist = distribucion(totales);
    const bal = balanceInteranual(dataset, ai);
    const top = delitoMasFrecuente(dataset, ai);
    const ratio = ratioViolenciaPropiedad(dataset, ai);
    const iHom = dataset.delitos.findIndex((d) => d.id === '1');
    const tasaHomArr = dataset.partidos
      .map((_, pi) => tasaDelito(dataset, pi, iHom, ai))
      .filter((v) => v > 0);
    const tasaHomProm = tasaHomArr.length
      ? tasaHomArr.reduce((a, b) => a + b, 0) / tasaHomArr.length
      : 0;
    return { dist, bal, top, ratio, tasaHomProm };
  }, [dataset, ai]);

  if (!dataset || !stats) return null;

  const introScenes = buildIntroScenes(dataset);
  const scrollToDashboard = () => {
    document
      .getElementById('panorama-dashboard')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {introScenes.length > 0 && (
        <Suspense fallback={null}>
          <IntroCarousel scenes={introScenes} onFinishExplore={scrollToDashboard} />
        </Suspense>
      )}

      <div
        id="panorama-dashboard"
        style={{ display: 'flex', flexDirection: 'column', gap: 24, scrollMarginTop: 64 }}
      >
        <section className="conu-card" style={{ padding: 24 }}>
          <div className="conu-kpi-grid">
            <KPICompact
              label="Hechos totales"
              value={rankingDelta.totalConurbano.toLocaleString('es-AR')}
            />
            <KPICompact
              label="Var. interanual promedio"
              value={
                rankingDelta.promYoy !== null
                  ? `${rankingDelta.promYoy >= 0 ? '+' : ''}${rankingDelta.promYoy.toFixed(1)}%`
                  : '—'
              }
              accent={
                rankingDelta.promYoy !== null
                  ? rankingDelta.promYoy >= 0
                    ? 'danger'
                    : 'success'
                  : undefined
              }
            />
            <KPICompact
              label="Tasa promedio homicidios"
              value={`${stats.tasaHomProm.toFixed(1)} /100k`}
            />
            <KPICompact
              label="Ratio violencia / propiedad"
              value={stats.ratio.ratio ? `${stats.ratio.ratio.toFixed(2)}×` : '—'}
              sub={`${stats.ratio.violencia.toLocaleString('es-AR')} vs ${stats.ratio.propiedad.toLocaleString('es-AR')}`}
            />
          </div>
          <div
            style={{
              marginTop: 24,
              borderTop: '1px solid var(--border-glass)',
              paddingTop: 20,
            }}
          >
            <AnioSlider
              anio={anio}
              min={dataset.anios[0]}
              max={dataset.anios[dataset.anios.length - 1]}
              onChange={setAnio}
            />
          </div>
        </section>

        <section className="conu-insights-grid">
          <Insight
            color="#ef4444"
            heading={`${stats.bal.suben} partidos ↑ / ${stats.bal.bajan} ↓`}
            body={`Variación interanual ${anio - 1}→${anio} · ${stats.bal.estables} estables.`}
          />
          <Insight
            color="#10b981"
            heading={stats.top?.nombre ?? '—'}
            body={
              stats.top
                ? `Delito más frecuente del año — ${stats.top.valor.toLocaleString('es-AR')} hechos (${stats.top.pct.toFixed(1)}% del total).`
                : 'Sin datos.'
            }
          />
          <Insight
            color="var(--accent-cyan)"
            heading={`Mediana por partido: ${Math.round(stats.dist.mediana).toLocaleString('es-AR')}`}
            body={`Rango: ${Math.round(stats.dist.min).toLocaleString('es-AR')} – ${Math.round(stats.dist.max).toLocaleString('es-AR')} · p25 ${Math.round(stats.dist.p25).toLocaleString('es-AR')} · p75 ${Math.round(stats.dist.p75).toLocaleString('es-AR')}.`}
          />
        </section>

        <section className="conu-panorama-grid">
          <div
            style={{
              height: 460,
              overflow: 'hidden',
              borderRadius: 12,
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-card)',
            }}
          >
            <Suspense
              fallback={
                <div
                  style={{
                    display: 'flex',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Cargando mapa…
                </div>
              }
            >
              <Choropleth
                geo={geo}
                values={valuesMap}
                selectedId={municipioSel}
                onSelect={setMunicipio}
                renderHover={renderHover}
                legendTitle={`Hechos totales · ${anio}`}
                legendSubtitle="Suma de todas las categorías SNIC"
                valueFormat={(n) => n.toLocaleString('es-AR')}
              />
            </Suspense>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <RankingCard
              title="Mayores aumentos"
              subtitle="Variación interanual"
              rows={rankingDelta.top}
              tone="danger"
              onSelect={setMunicipio}
              selectedId={municipioSel}
            />
            <RankingCard
              title="Mayores reducciones"
              subtitle="Variación interanual"
              rows={rankingDelta.bottom}
              tone="success"
              onSelect={setMunicipio}
              selectedId={municipioSel}
            />
          </div>
        </section>

        <RadiografiaPartido />

        <ExplorarCategoria
          expDelitoId={expDelitoId}
          setExpDelitoId={setExpDelitoId}
          expMetric={expMetric}
          setExpMetric={setExpMetric}
        />

        <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Pasá el mouse sobre un partido para ver su proyección. Al seleccionarlo se habilita la
          <strong> radiografía</strong> (composición + serie histórica). El widget{' '}
          <strong>Explorar por categoría</strong> permite ordenar los 24 partidos por cualquier
          tipo de delito.
        </p>
      </div>
    </div>
  );
}

function RadiografiaPartido() {
  const { dataset, anio, municipioSel, setMunicipio } = useSeguridadStore();
  const t = useRechartsTheme();
  if (!dataset) return null;
  const ai = dataset.anios.indexOf(anio);
  const pi = municipioSel ? dataset.partidos.findIndex((p) => p.id === municipioSel) : -1;

  if (pi < 0) {
    return (
      <section
        style={{
          borderRadius: 12,
          border: '1px dashed var(--border-glass)',
          background: 'var(--bg-secondary)',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div className="conu-eyebrow" style={{ marginBottom: 6 }}>
          Radiografía del partido
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Seleccioná un partido en el mapa o en los rankings para ver su composición de delitos y
          su serie histórica.
        </div>
      </section>
    );
  }

  const partido = dataset.partidos[pi];
  const composicion = composicionPartido(dataset, pi, ai, 8);
  const serie = dataset.anios.map((a, aIdx) => ({
    anio: a,
    total: totalHechos(dataset, pi, aIdx),
  }));
  const totalPartido = serie[ai]?.total ?? 0;
  const yoy = yoyChange(serie[ai].total, serie[ai - 1]?.total ?? 0);

  return (
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
          <div className="conu-eyebrow">Radiografía</div>
          <h3 style={{ marginTop: 2, fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
            {partido.nombre}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="conu-eyebrow">Hechos {anio}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
              {totalPartido.toLocaleString('es-AR')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="conu-eyebrow">Variación interanual</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: yoy === null ? 'var(--text-tertiary)' : yoy >= 0 ? '#ef4444' : '#10b981',
              }}
            >
              {yoy === null ? '—' : `${yoy >= 0 ? '▲' : '▼'} ${Math.abs(yoy).toFixed(1)}%`}
            </div>
          </div>
          <button
            onClick={() => setMunicipio(null)}
            style={{
              fontSize: 11.5,
              color: 'var(--text-tertiary)',
              background: 'transparent',
              border: 0,
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            cerrar
          </button>
        </div>
      </header>

      <div className="conu-radiografia-grid" style={{ padding: 20 }}>
        <div>
          <div style={{ marginBottom: 8 }}>
            <div className="conu-eyebrow">Composición</div>
            <h4 style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Delitos por año
            </h4>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart
                data={composicion}
                layout="vertical"
                margin={{ top: 2, right: 50, bottom: 2, left: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill: t.tick, fontSize: 10 }}
                  axisLine={{ stroke: t.grid }}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fill: t.label, fontSize: 10.5 }}
                  width={150}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={t.tooltipStyle}
                  formatter={(v: unknown, _n, p) => {
                    const row = p.payload as { valor: number; pct: number };
                    return [
                      `${row.valor.toLocaleString('es-AR')} (${row.pct.toFixed(1)}%)`,
                      'Hechos',
                    ];
                  }}
                />
                <Bar dataKey="valor" fill="#10b981" radius={[0, 3, 3, 0]} maxBarSize={13} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 8 }}>
            <div className="conu-eyebrow">Serie histórica</div>
            <h4 style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Total de hechos · {dataset.anios[0]}–{dataset.anios[dataset.anios.length - 1]}
            </h4>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={serie} margin={{ top: 8, right: 16, bottom: 2, left: 4 }}>
                <CartesianGrid stroke={t.grid} strokeDasharray="2 3" vertical={false} />
                <XAxis
                  dataKey="anio"
                  tick={{ fill: t.tick, fontSize: 10 }}
                  axisLine={{ stroke: t.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: t.tick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={t.tooltipStyle}
                  formatter={(v: unknown) => [Number(v).toLocaleString('es-AR'), 'Hechos']}
                />
                <ReferenceLine x={anio} stroke="#10b981" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={t.label}
                  strokeWidth={2}
                  dot={{ r: 2, fill: t.label, stroke: t.tooltipBg, strokeWidth: 1.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExplorarCategoria({
  expDelitoId,
  setExpDelitoId,
  expMetric,
  setExpMetric,
}: {
  expDelitoId: string;
  setExpDelitoId: (id: string) => void;
  expMetric: Metric;
  setExpMetric: (m: Metric) => void;
}) {
  const { dataset, anio, municipioSel, setMunicipio } = useSeguridadStore();
  const t = useRechartsTheme();
  const ai = dataset ? dataset.anios.indexOf(anio) : -1;
  const di = dataset ? dataset.delitos.findIndex((d) => d.id === expDelitoId) : -1;

  const rows = useMemo(() => {
    if (!dataset || di < 0 || ai < 0) return [];
    return dataset.partidos
      .map((p, pi) => ({
        id: p.id,
        nombre: p.nombre,
        valor:
          expMetric === 'tasa'
            ? tasaDelito(dataset, pi, di, ai)
            : hechosDelito(dataset, pi, di, ai),
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [dataset, di, ai, expMetric]);

  if (!dataset) return null;
  const unidad = expMetric === 'tasa' ? ' /100k' : '';
  const posSel = municipioSel ? rows.findIndex((r) => r.id === municipioSel) : -1;
  const selRow = posSel >= 0 ? rows[posSel] : null;

  return (
    <section className="conu-card" style={{ padding: 0 }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-glass)',
        }}
      >
        <div>
          <div className="conu-eyebrow">Explorar por categoría</div>
          <h3 style={{ marginTop: 2, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Ranking de 24 partidos por tipo de delito
          </h3>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 }}>
            <span className="conu-eyebrow">Tipo de delito</span>
            <select
              value={expDelitoId}
              onChange={(e) => setExpDelitoId(e.target.value)}
              className="conu-select"
              style={{ padding: '8px 12px', fontSize: 13 }}
            >
              {dataset.delitos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="conu-eyebrow">Métrica</span>
            <div className="conu-toggle-group">
              {(['tasa', 'hechos'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setExpMetric(m)}
                  className="conu-pill"
                  data-active={expMetric === m ? 'true' : 'false'}
                  style={{ borderColor: 'transparent', padding: '6px 12px', fontSize: 12 }}
                >
                  {m === 'tasa' ? 'Tasa /100k' : 'Hechos'}
                </button>
              ))}
            </div>
          </label>
        </div>
      </header>

      {selRow && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-glass)',
            background: 'rgba(0, 212, 255, 0.06)',
            padding: '8px 20px',
            fontSize: 12.5,
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            Partido seleccionado:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{selRow.nombre}</strong>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            posición{' '}
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{posSel + 1}</span> de{' '}
            {rows.length} ·{' '}
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {selRow.valor.toLocaleString('es-AR', {
                maximumFractionDigits: expMetric === 'tasa' ? 1 : 0,
              })}
              {unidad}
            </span>
          </span>
        </div>
      )}

      <div style={{ padding: 16 }}>
        <div style={{ height: 520 }}>
          <ResponsiveContainer>
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 2, right: 16, bottom: 2, left: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fill: t.tick, fontSize: 10.5 }}
                axisLine={{ stroke: t.grid }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={{ fill: t.label, fontSize: 10.5 }}
                width={140}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,212,255,0.06)' }}
                contentStyle={t.tooltipStyle}
                formatter={(v: unknown) => [
                  `${Number(v).toLocaleString('es-AR', {
                    maximumFractionDigits: expMetric === 'tasa' ? 2 : 0,
                  })}${unidad}`,
                  expMetric === 'tasa' ? 'Tasa' : 'Hechos',
                ]}
              />
              <Bar
                dataKey="valor"
                onClick={(d: { id?: string }) =>
                  d?.id && setMunicipio(d.id === municipioSel ? null : d.id)
                }
                radius={[0, 3, 3, 0]}
                maxBarSize={13}
              >
                {rows.map((d) => (
                  <Cell
                    key={d.id}
                    fill={
                      d.id === municipioSel
                        ? '#10b981'
                        : t.isDark
                          ? '#94a3b8'
                          : '#475569'
                    }
                    cursor="pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function AnioSlider({
  anio,
  min,
  max,
  onChange,
}: {
  anio: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="conu-eyebrow">Año de referencia</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{anio}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={anio}
        onChange={(e) => onChange(Number(e.target.value))}
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
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </label>
  );
}

function KPICompact({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'danger' | 'success';
}) {
  const dot =
    accent === 'danger' ? '#ef4444' : accent === 'success' ? '#10b981' : 'var(--accent-cyan)';
  return (
    <div className="conu-kpi" style={{ minWidth: 150 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block',
            height: 6,
            width: 6,
            borderRadius: 999,
            background: dot,
          }}
        />
        <span className="conu-eyebrow">{label}</span>
      </div>
      <div className="conu-kpi-value" style={{ marginTop: 4, fontSize: 20 }}>
        {value}
      </div>
      {sub && <div className="conu-kpi-sub">{sub}</div>}
    </div>
  );
}

function Insight({ color, heading, body }: { color: string; heading: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <span
        style={{
          marginTop: 6,
          display: 'inline-block',
          height: 6,
          width: 6,
          flexShrink: 0,
          borderRadius: 999,
          background: color,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'var(--text-primary)',
          }}
        >
          {heading}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 12,
            lineHeight: 1.4,
            color: 'var(--text-secondary)',
          }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}

function HoverContent({
  nombre,
  total,
  yoy,
  vsAvg,
  narrativa,
  anio,
}: {
  nombre: string;
  total: number;
  yoy: number | null;
  vsAvg: number | null;
  narrativa: string;
  anio: number;
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div className="conu-eyebrow">Partido</div>
          <div
            style={{
              marginTop: 2,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {nombre}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="conu-eyebrow">{anio}</div>
          <div
            style={{
              marginTop: 2,
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {total.toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>hechos totales</div>
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          borderTop: '1px solid var(--border-glass)',
          paddingTop: 12,
        }}
      >
        <DeltaPill label="vs. año anterior" pct={yoy} />
        <DeltaPill label="vs. prom. 5 años" pct={vsAvg} />
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          lineHeight: 1.4,
          color: 'var(--text-secondary)',
        }}
      >
        {narrativa}
      </div>
    </>
  );
}

function DeltaPill({ label, pct }: { label: string; pct: number | null }) {
  const up = pct !== null && pct >= 0;
  const color =
    pct === null ? 'var(--text-tertiary)' : up ? '#ef4444' : '#10b981';
  const bg =
    pct === null
      ? 'var(--bg-secondary)'
      : up
        ? 'rgba(239, 68, 68, 0.1)'
        : 'rgba(16, 185, 129, 0.1)';
  return (
    <div style={{ borderRadius: 8, background: bg, padding: '6px 10px' }}>
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-tertiary)',
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color }}>
        {pct === null ? '—' : `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`}
      </div>
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  rows,
  tone,
  onSelect,
  selectedId,
}: {
  title: string;
  subtitle: string;
  rows: { id: string; nombre: string; total: number; yoy: number }[];
  tone: 'danger' | 'success';
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}) {
  return (
    <div className="conu-card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <div
          className="conu-eyebrow"
          style={{ color: tone === 'danger' ? '#ef4444' : '#10b981' }}
        >
          {title}
        </div>
        <h3
          style={{
            marginTop: 2,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {subtitle}
        </h3>
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {rows.length === 0 && (
          <li style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Sin datos suficientes.</li>
        )}
        {rows.map((r) => {
          const up = r.yoy >= 0;
          const active = r.id === selectedId;
          return (
            <li key={r.id}>
              <button
                onClick={() => onSelect(active ? null : r.id)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  borderRadius: 6,
                  padding: '6px 10px',
                  background: active ? 'rgba(0,212,255,0.08)' : 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 12.5,
                    color: 'var(--text-primary)',
                  }}
                >
                  {r.nombre}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: up ? '#ef4444' : '#10b981',
                  }}
                >
                  {up ? '▲' : '▼'} {Math.abs(r.yoy).toFixed(1)}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
