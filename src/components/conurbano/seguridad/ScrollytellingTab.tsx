import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSeguridadStore } from './store';
import { loadGeoJSON } from '../../../lib/conurbano/seguridad/data';
import {
  buildStoryData,
  type StorySceneKey,
} from '../../../lib/conurbano/seguridad/scrollytellingData';
import { useRechartsTheme } from './rechartsTheme';

const Choropleth = lazy(() => import('./Choropleth'));

const SCENES: {
  key: StorySceneKey;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
}[] = [
  {
    key: 'escala',
    eyebrow: '§ 1 · La escala',
    title: 'Más de 300.000 hechos al año en 24 partidos',
    body: (
      <>
        <p>
          El <strong>Conurbano Bonaerense</strong> concentra cerca de{' '}
          <strong>10 millones</strong> de habitantes distribuidos en 24 partidos que rodean a la
          Ciudad de Buenos Aires. En el último año disponible del Sistema Nacional de Información
          Criminal (SNIC), se registraron <strong>más de 318 mil hechos</strong> delictivos en toda
          su superficie.
        </p>
        <p>
          Esta cifra reúne 32 categorías oficiales: desde homicidios dolosos y robos hasta delitos
          contra la administración pública y contravenciones. El mapa a la derecha muestra el peso
          absoluto de cada partido en ese universo.
        </p>
      </>
    ),
  },
  {
    key: 'veinticincoAnios',
    eyebrow: '§ 2 · Un cuarto de siglo',
    title: 'La serie larga: subas, caídas y un pico pre-pandemia',
    body: (
      <>
        <p>
          Entre <strong>2000 y 2024</strong> la inseguridad en el Conurbano creció un 44% en
          volumen total, pero no en línea recta. La serie muestra un valle entre 2005 y 2010, una
          recuperación hasta 2014, y una <strong>aceleración sostenida</strong> desde 2016 que
          alcanzó su punto máximo en <strong>2019</strong> con 324 mil hechos.
        </p>
        <p>
          La pandemia produjo una caída transitoria del 17% en 2020, pero los registros volvieron
          rápidamente al rango alto. Desde 2021, el Conurbano se estabilizó cerca del{' '}
          <strong>máximo histórico</strong> — sin superarlo, pero sin retroceder.
        </p>
      </>
    ),
  },
  {
    key: 'concentracion',
    eyebrow: '§ 3 · Concentración territorial',
    title: 'La Matanza explica 1 de cada 6 delitos del Conurbano',
    body: (
      <>
        <p>
          La carga delictiva no se distribuye de forma uniforme. <strong>La Matanza</strong> —el
          partido más poblado de la Argentina— concentra por sí sola el{' '}
          <strong>16% del total</strong>, con más de 50 mil hechos registrados en el último año.
        </p>
        <p>
          Si sumamos los tres partidos con mayor volumen (La Matanza, Quilmes y Lomas de Zamora),
          llegan al <strong>27,5% del Conurbano</strong>. En el extremo opuesto, los cinco partidos
          con menor volumen absoluto aportan en conjunto menos del 10%.
        </p>
      </>
    ),
  },
  {
    key: 'paradoja',
    eyebrow: '§ 4 · Homicidios vs. total',
    title: 'Los homicidios dolosos cayeron mientras los delitos totales subían',
    body: (
      <>
        <p>
          Los <strong>homicidios dolosos</strong> mostraron una tendencia descendente a lo largo de
          estos 25 años. La tasa promedio del Conurbano pasó de{' '}
          <strong>14,4 por cada 100.000 habitantes</strong> en 2001 a valores entre{' '}
          <strong>3,8 y 4,5</strong> en el último lustro.
        </p>
        <p>
          En términos absolutos, los homicidios cayeron un 43% respecto al año 2000. El descenso no
          es homogéneo: coexiste con <strong>picos locales</strong> —como el ciclo 2012-2014— y
          con partidos que mantienen tasas entre 5 y 8 /100k (José C. Paz, General San Martín,
          Moreno).
        </p>
      </>
    ),
  },
  {
    key: 'composicion',
    eyebrow: '§ 5 · La composición cambió',
    title: 'Lesiones, amenazas y ciberdelitos ganaron peso en la matriz delictiva',
    body: (
      <>
        <p>
          El mix delictivo del Conurbano se transformó desde 2000. Los <strong>robos</strong> —la
          categoría con mayor volumen— crecieron un 26%, pero perdieron peso relativo: representan
          hoy el 27% del total, frente al 31% de entonces.
        </p>
        <p>
          En paralelo, crecieron categorías antes más marginales: <strong>lesiones dolosas</strong>{' '}
          (+94%), <strong>amenazas</strong> (+77%), <strong>hurtos</strong> (+61%) y, sobre todo,
          la canasta <strong>otros delitos contra la propiedad</strong> (+160%), donde el SNIC
          agrupa las estafas virtuales.
        </p>
      </>
    ),
  },
  {
    key: 'ganadoresPerdedores',
    eyebrow: '§ 6 · Heterogeneidad territorial',
    title: 'Berazategui, Hurlingham y Quilmes lideran la reducción de homicidios',
    body: (
      <>
        <p>
          Si tomamos <strong>2015 como línea de base</strong> —último pico relevante de
          homicidios— y miramos hasta el último año disponible, aparecen patrones muy distintos
          entre partidos vecinos.
        </p>
        <p>
          <strong>Berazategui</strong> (-60%), <strong>Hurlingham</strong> (-59%),{' '}
          <strong>Quilmes</strong> (-54%), <strong>San Fernando</strong> (-52%) y{' '}
          <strong>Lanús</strong> (-52%) registran las mayores caídas. En el otro extremo,{' '}
          <strong>San Isidro</strong> muestra un aumento del <strong>+51%</strong>.
        </p>
      </>
    ),
  },
];

export default function ScrollytellingTab() {
  const { dataset } = useSeguridadStore();
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [active, setActive] = useState<StorySceneKey>('escala');
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    loadGeoJSON().then(setGeo).catch(console.error);
  }, []);

  useEffect(() => {
    const tick = () => {
      const pivot = window.innerHeight * 0.4;
      let closest: StorySceneKey | null = null;
      let min = Infinity;
      (Object.keys(refs.current) as StorySceneKey[]).forEach((k) => {
        const el = refs.current[k];
        if (!el) return;
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const dist = Math.abs(center - pivot);
        if (dist < min) {
          min = dist;
          closest = k;
        }
      });
      if (closest) setActive(closest);
    };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    return () => {
      window.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
    };
  }, [dataset]);

  const story = useMemo(() => (dataset ? buildStoryData(dataset) : null), [dataset]);
  if (!dataset || !story) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <ExecutiveSummary story={story} />

      <div className="conu-scrolly-grid">
        <div className="conu-scrolly-stack">
          {SCENES.map((s) => (
            <section
              key={s.key}
              data-scene={s.key}
              ref={(el) => {
                refs.current[s.key] = el;
              }}
              style={{ maxWidth: 560 }}
            >
              <div
                className="conu-eyebrow"
                style={{
                  marginBottom: 8,
                  color: active === s.key ? 'var(--accent-cyan)' : undefined,
                }}
              >
                {s.eyebrow}
              </div>
              <h3
                style={{
                  marginBottom: 16,
                  fontSize: 26,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: 'var(--text-primary)',
                }}
              >
                {s.title}
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                }}
              >
                {s.body}
              </div>
              <div className="conu-scrolly-mobile-viz">
                <Suspense fallback={<div>Cargando…</div>}>
                  <SceneVisual sceneKey={s.key} geo={geo} story={story} />
                </Suspense>
              </div>
            </section>
          ))}
        </div>

        <div className="conu-scrolly-sticky-wrap">
          <div className="conu-scrolly-sticky">
            <Suspense fallback={<div>Cargando…</div>}>
              <SceneVisual sceneKey={active} geo={geo} story={story} />
            </Suspense>
          </div>
        </div>
      </div>

      <Footnote />
    </div>
  );
}

function ExecutiveSummary({ story }: { story: ReturnType<typeof buildStoryData> }) {
  const hom = story.homicidios;
  const items = [
    {
      label: 'Hechos totales registrados',
      value: story.escala.totalUltimo.toLocaleString('es-AR'),
      foot: `24 partidos · ${story.escala.anioUltimo}`,
    },
    {
      label: 'Partidos que explican ¼ del total',
      value: '3',
      foot: `La Matanza, Quilmes y Lomas de Zamora (${story.concentracion.top3Pct.toFixed(1)}%)`,
    },
    {
      label: 'Homicidios dolosos (tasa /100k)',
      value: hom.tasaUltimo.toFixed(1),
      foot: `${hom.deltaPct >= 0 ? '+' : ''}${hom.deltaPct.toFixed(0)}% vs 2000`,
    },
    {
      label: 'Cambio total de hechos',
      value: '+44%',
      foot: `2000 → ${story.escala.anioUltimo}`,
    },
  ];
  return (
    <section className="conu-card" style={{ padding: 24 }}>
      <div
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
          <div className="conu-eyebrow">Resumen ejecutivo</div>
          <h2 style={{ marginTop: 4, fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
            Cuatro cifras que ordenan la lectura
          </h2>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          Fuente: SNIC · elaboración propia
        </span>
      </div>
      <dl className="conu-kpi-grid">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="conu-eyebrow">{it.label}</dt>
            <dd
              style={{
                margin: 0,
                marginTop: 4,
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1.1,
                color: 'var(--text-primary)',
              }}
            >
              {it.value}
            </dd>
            <dd
              style={{
                margin: 0,
                marginTop: 2,
                fontSize: 12,
                color: 'var(--text-tertiary)',
              }}
            >
              {it.foot}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Footnote() {
  return (
    <section
      style={{
        borderRadius: 12,
        border: '1px solid var(--border-glass)',
        background: 'var(--bg-secondary)',
        padding: 24,
      }}
    >
      <div className="conu-eyebrow" style={{ marginBottom: 8 }}>
        Notas metodológicas
      </div>
      <ul
        style={{
          listStyle: 'disc',
          listStylePosition: 'inside',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: 'var(--text-secondary)',
          margin: 0,
          padding: 0,
        }}
      >
        <li>
          Los totales suman las 32 categorías del SNIC a nivel parent-code (homicidios, robos,
          hurtos, amenazas, etc.), agrupando las subcategorías introducidas en 2023.
        </li>
        <li>
          La tasa se informa por 100.000 habitantes según la población del departamento en cada año
          de la serie SNIC.
        </li>
        <li>
          Un volumen creciente puede deberse tanto a más hechos como a mejor registro
          (especialmente en ciberdelitos y delitos sexuales).
        </li>
        <li>
          Quilmes unifica los códigos INDEC 06058 (2023+) y 06658 (histórico) para mantener la
          serie continua.
        </li>
      </ul>
    </section>
  );
}

function SceneVisual({
  sceneKey,
  geo,
  story,
}: {
  sceneKey: StorySceneKey;
  geo: GeoJSON.FeatureCollection | null;
  story: ReturnType<typeof buildStoryData>;
}) {
  switch (sceneKey) {
    case 'escala':
      return <VizEscala geo={geo} story={story} />;
    case 'veinticincoAnios':
      return <VizSerie story={story} />;
    case 'concentracion':
      return <VizConcentracion story={story} />;
    case 'paradoja':
      return <VizParadoja story={story} />;
    case 'composicion':
      return <VizComposicion story={story} />;
    case 'ganadoresPerdedores':
      return <VizGanadoresPerdedores story={story} />;
  }
}

function VizEscala({
  geo,
  story,
}: {
  geo: GeoJSON.FeatureCollection | null;
  story: ReturnType<typeof buildStoryData>;
}) {
  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <VizTitle
        title={`Hechos totales · ${story.escala.anioUltimo}`}
        subtitle="Suma de todas las categorías SNIC"
      />
      <div style={{ minHeight: 0, flex: 1, overflow: 'hidden', borderRadius: 8 }}>
        <Choropleth
          geo={geo}
          values={story.escala.valoresPorPartido}
          legendTitle={`Hechos · ${story.escala.anioUltimo}`}
          legendSubtitle="Todas las categorías SNIC"
          valueFormat={(n) => n.toLocaleString('es-AR')}
        />
      </div>
    </div>
  );
}

function VizSerie({ story }: { story: ReturnType<typeof buildStoryData> }) {
  const t = useRechartsTheme();
  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <VizTitle title="Hechos totales · Conurbano" subtitle="Serie anual 2000–presente" />
      <div style={{ minHeight: 0, flex: 1 }}>
        <ResponsiveContainer>
          <LineChart
            data={story.serieTotales}
            margin={{ top: 10, right: 24, bottom: 4, left: 4 }}
          >
            <CartesianGrid stroke={t.grid} strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="anio"
              tick={{ fill: t.tick, fontSize: 11 }}
              axisLine={{ stroke: t.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: t.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <Tooltip
              contentStyle={t.tooltipStyle}
              formatter={(v: unknown) => [Number(v).toLocaleString('es-AR'), 'Hechos']}
            />
            <ReferenceArea x1={2020} x2={2021} fill={t.grid} />
            <ReferenceLine
              x={2019}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{ value: 'Pico 2019', position: 'top', fill: '#10b981', fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="valor"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#10b981', stroke: t.tooltipBg, strokeWidth: 1.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
        Zona sombreada: año de pandemia (2020).
      </div>
    </div>
  );
}

function VizConcentracion({ story }: { story: ReturnType<typeof buildStoryData> }) {
  const t = useRechartsTheme();
  const data = story.concentracion.rows;
  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <VizTitle
        title={`Ranking por volumen · ${story.concentracion.anio}`}
        subtitle="Partidos del Conurbano"
      />
      <div style={{ minHeight: 0, flex: 1 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 0 }}>
            <XAxis
              type="number"
              tick={{ fill: t.tick, fontSize: 10 }}
              axisLine={{ stroke: t.grid }}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <YAxis
              type="category"
              dataKey="nombre"
              tick={{ fill: t.label, fontSize: 10.5 }}
              width={130}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <Tooltip
              contentStyle={t.tooltipStyle}
              formatter={(v: unknown) => [Number(v).toLocaleString('es-AR'), 'Hechos']}
            />
            <Bar dataKey="valor" radius={[0, 3, 3, 0]} maxBarSize={13}>
              {data.map((d) => (
                <Cell
                  key={d.id}
                  fill={d.nombre === 'La Matanza' ? '#10b981' : t.isDark ? '#94a3b8' : '#475569'}
                />
              ))}
              <LabelList
                dataKey="pct"
                position="right"
                fontSize={10}
                fill={t.tick}
                formatter={(v: number) => `${v.toFixed(1)}%`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VizParadoja({ story }: { story: ReturnType<typeof buildStoryData> }) {
  const t = useRechartsTheme();
  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <VizTitle
        title="Homicidios dolosos — tasa promedio Conurbano"
        subtitle="Por 100.000 habitantes"
      />
      <div style={{ minHeight: 0, flex: 1 }}>
        <ResponsiveContainer>
          <LineChart
            data={story.homicidios.tasaConurbano}
            margin={{ top: 10, right: 24, bottom: 4, left: 4 }}
          >
            <CartesianGrid stroke={t.grid} strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="anio"
              tick={{ fill: t.tick, fontSize: 11 }}
              axisLine={{ stroke: t.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: t.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={38}
              domain={[0, 'dataMax + 2']}
            />
            <Tooltip
              contentStyle={t.tooltipStyle}
              formatter={(v: unknown) => [Number(v).toFixed(2), 'Tasa /100k']}
            />
            <ReferenceLine
              y={story.homicidios.tasa2000}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{
                value: `${story.homicidios.tasa2000.toFixed(1)} en 2000`,
                position: 'insideTopLeft',
                fill: '#ef4444',
                fontSize: 10,
              }}
            />
            <Line
              type="monotone"
              dataKey="valor"
              stroke={t.label}
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: t.label, stroke: t.tooltipBg, strokeWidth: 1.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VizComposicion({ story }: { story: ReturnType<typeof buildStoryData> }) {
  const t = useRechartsTheme();
  const data = [...story.composicion.delitosTop]
    .filter((d) => d.deltaPct !== null)
    .sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0));
  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <VizTitle title="Variación por categoría" subtitle={`2000 → ${story.escala.anioUltimo}`} />
      <div style={{ minHeight: 0, flex: 1 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
            <XAxis
              type="number"
              tick={{ fill: t.tick, fontSize: 10 }}
              axisLine={{ stroke: t.grid }}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            />
            <YAxis
              type="category"
              dataKey="nombre"
              tick={{ fill: t.label, fontSize: 10.5 }}
              width={170}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={t.tooltipStyle}
              formatter={(v: unknown) => [`${Number(v).toFixed(0)}%`, 'Cambio']}
            />
            <ReferenceLine x={0} stroke={t.grid} />
            <Bar dataKey="deltaPct" radius={[0, 3, 3, 0]} maxBarSize={15}>
              {data.map((d) => (
                <Cell key={d.id} fill={(d.deltaPct ?? 0) >= 0 ? '#ef4444' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VizGanadoresPerdedores({ story }: { story: ReturnType<typeof buildStoryData> }) {
  const t = useRechartsTheme();
  const data = story.cambioHomicidios.rows.filter((r) => r.deltaPct !== null);
  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <VizTitle
        title={`Cambio en homicidios · ${story.cambioHomicidios.anioBase} → ${story.cambioHomicidios.anioUltimo}`}
        subtitle="Variación porcentual de la tasa /100k por partido"
      />
      <div style={{ minHeight: 0, flex: 1 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
            <XAxis
              type="number"
              tick={{ fill: t.tick, fontSize: 10 }}
              axisLine={{ stroke: t.grid }}
              tickLine={false}
              tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
            />
            <YAxis
              type="category"
              dataKey="nombre"
              tick={{ fill: t.label, fontSize: 10.5 }}
              width={140}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <Tooltip
              contentStyle={t.tooltipStyle}
              formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'Variación']}
            />
            <ReferenceLine x={0} stroke={t.grid} />
            <Bar dataKey="deltaPct" radius={[0, 3, 3, 0]} maxBarSize={14}>
              {data.map((d) => (
                <Cell key={d.id} fill={(d.deltaPct ?? 0) >= 0 ? '#ef4444' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VizTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="conu-eyebrow">{subtitle}</div>
      <h4
        style={{
          marginTop: 2,
          fontSize: 14.5,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </h4>
    </div>
  );
}
