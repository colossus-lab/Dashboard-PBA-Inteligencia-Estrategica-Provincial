import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Search } from 'lucide-react';
import { getPoblacionReports, getSectorialReports, getConurbanoReports } from '../data/reportRegistry';
import { SectionReveal } from '../components/ui/SectionReveal';
import { SiteFooter } from '../components/layout/SiteFooter';
import type { ReportEntry } from '../types/report';

// ─── Macro KPIs for the hero ───
const HERO_STATS = [
  { value: 17569053, label: 'Habitantes', suffix: '', tooltip: 'Censo Nacional 2022 · INDEC' },
  { value: 135, label: 'Municipios', suffix: '', tooltip: 'Provincia de Buenos Aires' },
  { value: 80000, label: 'Registros', suffix: '+', tooltip: 'Distribuidos en 13 datasets navegables' },
  { value: 16, label: 'Informes', suffix: '', tooltip: '16 informes ejecutivos basados en datos abiertos' },
];

// ─── Mini gráficos por reporte: spark (evolución) o bar (ranking) ───
type MiniChartSpec =
  | { type: 'spark'; data: number[] }
  | { type: 'bar'; data: number[] };

const MINI_CHARTS: Record<string, MiniChartSpec> = {
  // Población — distribuciones (bar) + fecundidad / salud-previsión (spark)
  'poblacion-estructura':          { type: 'bar',   data: [8, 14, 20, 24, 22, 17, 11, 5] }, // grupos etarios
  'poblacion-habitacional-personas':{ type: 'bar',  data: [12, 18, 22, 25, 16, 7] },
  'poblacion-salud-prevision':     { type: 'spark', data: [78, 80, 82, 81, 83, 84, 84] },
  'poblacion-habitacional-hogares':{ type: 'bar',   data: [22, 28, 24, 16, 6, 4] },
  'poblacion-viviendas':           { type: 'bar',   data: [25, 32, 28, 12, 6] },
  'poblacion-educacion-censal':    { type: 'bar',   data: [98, 95, 88, 65, 32] },
  'poblacion-economia':            { type: 'bar',   data: [42, 28, 18, 12] },
  'poblacion-fecundidad':          { type: 'spark', data: [3.2, 2.8, 2.4, 2.0, 1.8, 1.6, 1.4] },
  // Sectoriales
  'educacion':                     { type: 'spark', data: [85, 87, 89, 88, 90, 92, 93] },
  'salud':                         { type: 'spark', data: [240, 235, 232, 230, 228, 232, 235] },
  'seguridad':                     { type: 'bar',   data: [45, 38, 28, 18, 12, 8] },
  'economia-fiscal':               { type: 'spark', data: [8.2, 8.8, 9.5, 10.1, 10.8, 11.3, 11.8] },
  'agricultura':                   { type: 'bar',   data: [38, 28, 18, 10, 6] },
  'industria':                     { type: 'spark', data: [28, 30, 32, 34, 36, 38] },
  // Conurbano
  'conurbano-educacion':           { type: 'bar',   data: [12, 18, 22, 24, 20, 16, 12, 8] },
  'conurbano-seguridad':           { type: 'spark', data: [55, 62, 70, 68, 60, 52, 48, 45] },
};

export function Landing() {
  const poblacion = getPoblacionReports();
  const sectoriales = getSectorialReports();
  const conurbano = getConurbanoReports();

  return (
    <div className="landing-page">
      <Helmet>
        <title>Dashboard PBA · Inteligencia Estratégica Provincial</title>
        <meta
          name="description"
          content="Plataforma de datos abiertos con análisis interactivo de la Provincia de Buenos Aires. 17,5M habitantes, 135 municipios, 16 informes ejecutivos."
        />
        <link rel="canonical" href="https://pba.openarg.org" />
        <meta property="og:image" content="https://pba.openarg.org/api/og" />
      </Helmet>
      {/* ─── Animated Hero ─── */}
      <SectionReveal>
        <header className="landing-hero">
          {/* Floating particles */}
          <div className="hero-particles" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="hero-particle" style={{ '--i': i } as React.CSSProperties} />
            ))}
          </div>

          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Plataforma de Datos Abiertos
            </div>
            <h1 className="hero-title">
              Inteligencia Estratégica
              <span className="hero-title-light">de la Provincia de Buenos Aires</span>
            </h1>
            <p className="hero-subtitle">
              Explorá <span className="hero-highlight">17,5M habitantes</span> y{' '}
              <span className="hero-highlight">135 municipios</span> con 16 informes ejecutivos
              basados en datos oficiales del INDEC, Censo 2022, SNIC, SIPA y EPH.
            </p>
            <p className="hero-attribution">
              Powered by{' '}
              <a href="https://colossuslab.org" target="_blank" rel="noopener noreferrer" className="hero-link">
                ColossusLab.org
              </a>{' '}
              · Datos vía{' '}
              <a href="https://openarg.org" target="_blank" rel="noopener noreferrer" className="hero-link">
                OpenArg
              </a>
            </p>

            {/* ─── Count-up Stats ─── */}
            <div className="hero-stats">
              {HERO_STATS.map((stat, i) => (
                <div key={stat.label}>
                  {i > 0 && <span className="hero-stat-divider" />}
                  <div className="hero-stat" title={stat.tooltip}>
                    <CountUp target={stat.value} suffix={stat.suffix} />
                    <span className="hero-stat-label">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>
      </SectionReveal>

      {/* ─── Conurbano · Análisis Especial (highlight) ─── */}
      <SectionReveal>
        <section className="conurbano-highlight" aria-labelledby="conurbano-highlight-title">
          <div className="conurbano-highlight-header">
            <span className="conurbano-highlight-badge">Análisis Especial</span>
            <h2 id="conurbano-highlight-title" className="conurbano-highlight-title">Conurbano Bonaerense</h2>
            <p className="conurbano-highlight-desc">
              Análisis territorial focalizado en los 24 partidos del Gran Buenos Aires —
              mapas interactivos de educación y seguridad con datos a nivel radio censal.
            </p>
          </div>
          <div className="conurbano-highlight-grid">
            {conurbano.map((report, i) => (
              <ReportCard key={report.id} report={report} index={i} variant="featured" />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ─── Población Grid ─── */}
      <SectionReveal>
        <section className="landing-section">
          <div className="section-header">
            <div className="section-number">01</div>
            <div>
              <h2 className="section-title">Población — Censo 2022</h2>
              <p className="section-desc">
                Ocho dimensiones del último censo nacional: estructura por sexo y edad, hábitat, hogares, stock de viviendas, asistencia educativa, características económicas, salud y previsión, y fecundidad.
              </p>
            </div>
          </div>
          <div className="report-grid">
            {poblacion.map((report, i) => (
              <ReportCard key={report.id} report={report} index={i} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ─── Sectoriales Grid ─── */}
      <SectionReveal>
        <section className="landing-section">
          <div className="section-header">
            <div className="section-number">02</div>
            <div>
              <h2 className="section-title">Análisis Sectoriales</h2>
              <p className="section-desc">Informes especializados por sector productivo, institucional y social.</p>
            </div>
          </div>
          <div className="report-grid">
            {sectoriales.map((report, i) => (
              <ReportCard key={report.id} report={report} index={i} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ─── Catálogo de Datos (compact) ─── */}
      <SectionReveal>
        <section className="landing-section landing-section-compact">
          <div className="explore-options">
            <Link to="/explorar" className="explorer-banner explorer-banner-large">
              <div className="explorer-banner-glow" aria-hidden="true" />
              <div className="explorer-banner-content">
                <div className="explorer-banner-icon" aria-hidden="true">
                  <Search size={32} />
                </div>
                <div className="explorer-banner-text">
                  <span className="explorer-banner-title">Catálogo de Datos</span>
                  <span className="explorer-banner-desc">
                    13 datasets navegables · 80.000+ registros · 135 municipios
                  </span>
                </div>
              </div>
              <div className="explorer-banner-arrow">
                <ArrowRight size={24} />
              </div>
            </Link>
          </div>
        </section>
      </SectionReveal>

      {/* ─── Footer ─── */}
      <SiteFooter />
    </div>
  );
}

// ═══════ Components ═══════

function ReportCard({ report, index, variant = 'default' }: {
  report: ReportEntry;
  index: number;
  variant?: 'default' | 'featured';
}) {
  const chartSpec = MINI_CHARTS[report.id];
  const chartSize: 'sm' | 'md' | 'lg' =
    variant === 'featured' ? 'lg' :
    index === 0 ? 'md' :
    'sm';

  return (
    <Link
      to={`/${report.slug}`}
      className={`report-card${variant === 'featured' ? ' report-card-featured' : ''}`}
      style={{
        '--card-color': report.color,
        animationDelay: `${index * 80}ms`,
      } as React.CSSProperties}
    >
      <div className="report-card-glow" aria-hidden="true" />
      <div className="report-card-header">
        <span className="report-card-number">{String(report.order).padStart(2, '0')}</span>
        <span className="report-card-arrow">→</span>
      </div>
      <div className="report-card-body">
        <span className="report-card-title">{report.shortTitle}</span>
        <span className="report-card-desc">{report.title}</span>
      </div>
      {chartSpec && (
        <div className="report-card-stat">
          <MiniChart spec={chartSpec} size={chartSize} />
        </div>
      )}
    </Link>
  );
}

// ─── Mini chart components (editorial sparkline + bars) ───
function MiniChart({ spec, size = 'sm' }: { spec: MiniChartSpec; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? { w: 140, h: 32 } : size === 'md' ? { w: 110, h: 28 } : { w: 80, h: 24 };
  if (spec.type === 'spark') return <Sparkline data={spec.data} width={dims.w} height={dims.h} />;
  return <MiniBars data={spec.data} width={dims.w} height={dims.h} />;
}

function Sparkline({ data, width = 80, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const padding = 3;
  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - padding * 2) - padding}`)
    .join(' ');
  const lastX = (data.length - 1) * step;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - padding * 2) - padding;
  return (
    <svg
      className="report-card-mini-chart"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent-cyan)"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="2" fill="var(--accent-orange)" />
    </svg>
  );
}

function MiniBars({ data, width = 80, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const gap = 1.5;
  const barWidth = (width - gap * (data.length - 1)) / data.length;
  return (
    <svg
      className="report-card-mini-chart"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {data.map((v, i) => {
        const barH = (v / max) * (height - 2);
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={height - barH}
            width={barWidth}
            height={barH}
            fill={i === data.length - 1 ? 'var(--accent-orange)' : 'var(--accent-cyan)'}
          />
        );
      })}
    </svg>
  );
}

// ─── Count-up Animation ───
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  const animate = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      return;
    }
    const duration = 2000;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) animate(); },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  const formatted = value >= 1000000
    ? `${(value / 1000000).toFixed(value >= 10000000 ? 1 : 1).replace('.', ',')}M`
    : value >= 1000
    ? `${(value / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
    : `${value}`;

  return (
    <span ref={ref} className="hero-stat-value">
      {formatted}{suffix}
    </span>
  );
}
