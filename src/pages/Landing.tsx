import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getPoblacionReports, getSectorialReports, getConurbanoReports } from '../data/reportRegistry';
import { SectionReveal } from '../components/ui/SectionReveal';
import type { ReportEntry } from '../types/report';

// ─── Macro KPIs for the hero ───
const HERO_STATS = [
  { value: 17569053, label: 'Habitantes', suffix: '' },
  { value: 135, label: 'Municipios', suffix: '' },
  { value: 80000, label: 'Registros', suffix: '+' },
  { value: 16, label: 'Reportes', suffix: '' },
];

// ─── Mini-stats per report (contextual data for cards) ───
const MINI_STATS: Record<string, string> = {
  'poblacion-estructura': '17,5M hab',
  'poblacion-habitacional-personas': '6,2M hogares',
  'poblacion-salud-prevision': '84% cobertura',
  'poblacion-habitacional-hogares': '5,6M hogares',
  'poblacion-viviendas': '6,7M viviendas',
  'poblacion-educacion-censal': '93% asistencia',
  'poblacion-economia': '8,1M PEA',
  'poblacion-fecundidad': '1,4 hijos/mujer',
  'educacion': '5,1M alumnos',
  'salud': '235K nacimientos',
  'seguridad': '135 partidos',
  'economia-fiscal': '$11,8B PBG',
  'agricultura': '14,3M hectáreas',
  'industria': '38% del PBI ind.',
  'conurbano-educacion': '24 partidos · 8.843 escuelas',
  'conurbano-seguridad': '24 partidos · 25 años',
};

export function Landing() {
  const poblacion = getPoblacionReports();
  const sectoriales = getSectorialReports();
  const conurbano = getConurbanoReports();

  return (
    <div className="landing-page">
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
              Powered by{' '}
              <a href="https://colossuslab.org" target="_blank" rel="noopener noreferrer" className="hero-link">
                ColossusLab.org
              </a>{' '}
              — Datos Abiertos vía <span className="hero-highlight">OpenArg</span> 🇦🇷
            </p>

            {/* ─── Count-up Stats ─── */}
            <div className="hero-stats">
              {HERO_STATS.map((stat, i) => (
                <div key={stat.label}>
                  {i > 0 && <span className="hero-stat-divider" />}
                  <div className="hero-stat">
                    <CountUp target={stat.value} suffix={stat.suffix} />
                    <span className="hero-stat-label">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>
      </SectionReveal>

      {/* ─── Población Grid ─── */}
      <SectionReveal>
        <section className="landing-section">
          <div className="section-header">
            <div className="section-number">01</div>
            <div>
              <h2 className="section-title">Población — Censo 2022</h2>
              <p className="section-desc">Análisis demográfico integral de la Provincia de Buenos Aires con datos del censo nacional.</p>
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

      {/* ─── Conurbano Grid ─── */}
      <SectionReveal>
        <section className="landing-section">
          <div className="section-header">
            <div className="section-number">03</div>
            <div>
              <h2 className="section-title">Conurbano</h2>
              <p className="section-desc">Análisis territorial focalizado en los 24 partidos del Gran Buenos Aires.</p>
            </div>
          </div>
          <div className="report-grid">
            {conurbano.map((report, i) => (
              <ReportCard key={report.id} report={report} index={i} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ─── Explora los Datos ─── */}
      <SectionReveal>
        <section className="landing-section">
          <div className="section-header">
            <div className="section-number">04</div>
            <div>
              <h2 className="section-title">Explora los Datos</h2>
              <p className="section-desc">Accede a los datasets completos o consulta la informacion mediante inteligencia artificial.</p>
            </div>
          </div>
          <div className="explore-options">
            <Link to="/explorar" className="explorer-banner">
              <div className="explorer-banner-glow" aria-hidden="true" />
              <div className="explorer-banner-content">
                <div className="explorer-banner-icon">🔍</div>
                <div className="explorer-banner-text">
                  <span className="explorer-banner-title">Abrir Data Explorer</span>
                  <span className="explorer-banner-desc">
                    13 datasets • +80.000 registros • 135 municipios
                  </span>
                </div>
              </div>
              <div className="explorer-banner-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>
            <Link to="/chat" className="ai-banner">
              <div className="ai-banner-glow" aria-hidden="true" />
              <div className="explorer-banner-content">
                <div className="ai-banner-icon">🤖</div>
                <div className="explorer-banner-text">
                  <span className="explorer-banner-title">Abrir Asistente IA</span>
                  <span className="explorer-banner-desc">
                    16 informes • 13 datasets • Consultas en lenguaje natural
                  </span>
                </div>
              </div>
              <div className="explorer-banner-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>
          </div>
        </section>
      </SectionReveal>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="footer-rule" />
        <p>
          <a href="https://colossuslab.org" target="_blank" rel="noopener noreferrer" className="footer-link">
            ColossusLab.org
          </a>{' '}
          •{' '}
          <a href="https://openarg.org" target="_blank" rel="noopener noreferrer" className="footer-link">
            OpenArg.org
          </a>
        </p>
      </footer>
    </div>
  );
}

// ═══════ Components ═══════

function ReportCard({ report, index }: { report: ReportEntry; index: number }) {
  const miniStat = MINI_STATS[report.id] || '';

  return (
    <Link
      to={`/${report.slug}`}
      className="report-card"
      style={{
        '--card-color': report.color,
        animationDelay: `${index * 80}ms`,
      } as React.CSSProperties}
    >
      <div className="report-card-glow" aria-hidden="true" />
      <div className="report-card-header">
        <span className="report-card-icon">{report.icon}</span>
        <span className="report-card-arrow">→</span>
      </div>
      <div className="report-card-body">
        <span className="report-card-title">{report.shortTitle}</span>
        <span className="report-card-desc">{report.title}</span>
      </div>
      {miniStat && (
        <div className="report-card-stat">
          <span className="report-card-stat-value">{miniStat}</span>
        </div>
      )}
    </Link>
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
    const duration = 2000;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
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
