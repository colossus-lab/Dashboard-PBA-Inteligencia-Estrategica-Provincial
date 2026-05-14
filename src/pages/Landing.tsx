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

// ─── Stats reales por informe — sourced de los markdowns / JSONs en /public ───
type StatItem = { value: string; label: string };

const REPORT_STATS: Record<string, StatItem[]> = {
  // Población
  'poblacion-estructura': [
    { value: '17,5M', label: 'habitantes' },
    { value: '+12,2%', label: 'var. 2010-22' },
    { value: '57,3', label: 'hab/km²' },
    { value: '38,1%', label: 'del país' },
  ],
  'poblacion-habitacional-personas': [
    { value: '83,9%', label: 'piso calidad' },
    { value: '41,8%', label: 'techo chapa' },
    { value: '74,3%', label: 'agua de red' },
    { value: '55,4%', label: 'con cloacas' },
  ],
  'poblacion-salud-prevision': [
    { value: '62,3%', label: 'obra social' },
    { value: '35,1%', label: 'sin cobertura' },
    { value: '18,3%', label: 'percibe jub.' },
    { value: '3,2M', label: 'sin previsión' },
  ],
  'poblacion-habitacional-hogares': [
    { value: '86,3%', label: 'piso calidad' },
    { value: '59,4%', label: 'con cloaca' },
    { value: '33,3%', label: 'cocina garrafa' },
    { value: '10,7%', label: '1 habitación' },
  ],
  'poblacion-viviendas': [
    { value: '6,7M', label: 'viviendas' },
    { value: '88,5%', label: 'ocupadas' },
    { value: '81,3%', label: 'son casas' },
    { value: '1,2%', label: 'densificadas' },
  ],
  'poblacion-educacion-censal': [
    { value: '5,9M', label: 'asistentes' },
    { value: '50,4%', label: 'nivel inicial' },
    { value: '97,5%', label: 'primario' },
    { value: '55,7%', label: 'sec. 19 años' },
  ],
  'poblacion-economia': [
    { value: '8,1M', label: 'ocupados' },
    { value: '9,2%', label: 'desocupación' },
    { value: '64,5%', label: 'tasa activ.' },
    { value: '35,5%', label: 'inactivos' },
  ],
  'poblacion-fecundidad': [
    { value: '1,4', label: 'hijos/mujer' },
    { value: '43,8%', label: 'sin hijos' },
    { value: '0,9', label: 'mín. V. López' },
    { value: '1,7', label: 'máx. Varela' },
  ],
  // Sectoriales
  'educacion': [
    { value: '5,0M', label: 'matrícula' },
    { value: '21.668', label: 'establecim.' },
    { value: '55,2%', label: 'bajo básico' },
    { value: '16,9%', label: 'satisfactorio' },
  ],
  'salud': [
    { value: '147K', label: 'nacidos 2024' },
    { value: '−50%', label: 'natalidad' },
    { value: '8,4‰', label: 'TMI 2024' },
    { value: '39,4', label: 'RMM /100K' },
  ],
  'seguridad': [
    { value: '678K', label: 'hechos' },
    { value: '157K', label: 'víctimas' },
    { value: '663', label: 'robos /100K' },
    { value: '790', label: 'homicidios' },
  ],
  'economia-fiscal': [
    { value: '13,0B', label: 'recaudación' },
    { value: '4,3B', label: 'transferencias' },
    { value: '76,2%', label: 'Ing. Brutos' },
    { value: '66,6M', label: 'tn producción' },
  ],
  'agricultura': [
    { value: '20,9M', label: 'ha sembradas' },
    { value: '66,6M', label: 'toneladas' },
    { value: '20,3M', label: 'cab. ganado' },
    { value: '211K', label: 'tn merluza' },
  ],
  'industria': [
    { value: '251K', label: 'empresas' },
    { value: '177K', label: 'PyMEs' },
    { value: '238', label: 'parques ind.' },
    { value: '−26K', label: 'PyMEs 12-21' },
  ],
  // Conurbano
  'conurbano-educacion': [
    { value: '11,9M', label: 'pob. GBA' },
    { value: '96,6%', label: 'asist. 5-17' },
    { value: '40,6%', label: 'asist. 18-24' },
    { value: '13,7%', label: 'superior c.' },
  ],
  'conurbano-seguridad': [
    { value: '24', label: 'partidos GBA' },
    { value: '10,8M', label: 'habitantes' },
    { value: '9.189', label: 'hab/km² Lanús' },
    { value: '32', label: 'tipos delito' },
  ],
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
  const stats = REPORT_STATS[report.id];
  const tickerSize: 'sm' | 'md' | 'lg' =
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
      {stats && stats.length > 0 && (
        <div className="report-card-stat">
          <StatTicker items={stats} size={tickerSize} />
        </div>
      )}
    </Link>
  );
}

// ─── Stat ticker: rota cifras reales derecha→izquierda con pausa para leer ───
function StatTicker({ items, size = 'sm' }: { items: StatItem[]; size?: 'sm' | 'md' | 'lg' }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (items.length <= 1) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 4000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const cur = items[idx];
  return (
    <div className={`report-card-ticker report-card-ticker--${size}`} aria-hidden="true">
      <span key={idx} className="report-card-ticker-item">
        <strong className="report-card-ticker-value">{cur.value}</strong>
        <span className="report-card-ticker-label">{cur.label}</span>
      </span>
    </div>
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
