import { Link } from 'react-router-dom';
import { getPoblacionReports, getSectorialReports } from '../data/reportRegistry';
import { SectionReveal } from '../components/ui/SectionReveal';
import type { ReportEntry } from '../types/report';

export function Landing() {
  const poblacion = getPoblacionReports();
  const sectoriales = getSectorialReports();

  return (
    <div className="landing-page">
      {/* ─── Hero ─── */}
      <SectionReveal>
        <header className="landing-hero">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Plataforma de Datos Abiertos
          </div>
          <h1 className="hero-title">
            Inteligencia Estratégica
            <span className="hero-title-light">de la Provincia de Buenos Aires</span>
          </h1>
          <p className="hero-subtitle">
            Powered by <a href="https://colossuslab.org" target="_blank" rel="noopener noreferrer" className="hero-link">ColossusLab.org</a> — Datos Abiertos vía <span className="hero-highlight">OpenArg</span> 🇦🇷
          </p>
        </header>
      </SectionReveal>

      {/* ─── Población ─── */}
      <SectionReveal>
        <section className="landing-section">
          <div className="section-header">
            <div className="section-number">01</div>
            <div>
              <h2 className="section-title">Población — Censo 2022</h2>
              <p className="section-desc">Análisis demográfico integral de la Provincia de Buenos Aires con datos del censo nacional.</p>
            </div>
          </div>
          <div className="report-list">
            {poblacion.map((report, i) => (
              <ReportRow key={report.id} report={report} index={i} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ─── Sectoriales ─── */}
      <SectionReveal>
        <section className="landing-section">
          <div className="section-header">
            <div className="section-number">02</div>
            <div>
              <h2 className="section-title">Análisis Sectoriales</h2>
              <p className="section-desc">Informes especializados por sector productivo, institucional y social.</p>
            </div>
          </div>
          <div className="report-list">
            {sectoriales.map((report, i) => (
              <ReportRow key={report.id} report={report} index={i} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ─── Data Explorer ─── */}
      <SectionReveal>
        <section className="landing-section">
          <div className="section-header">
            <div className="section-number">03</div>
            <div>
              <h2 className="section-title">Data Explorer</h2>
              <p className="section-desc">Explorá los datasets completos: tablas interactivas, auto-charts y perfiles municipales.</p>
            </div>
          </div>
          <Link to="/explorar" className="explorer-cta">
            <div className="explorer-cta-content">
              <div className="explorer-cta-icon">🔍</div>
              <div className="explorer-cta-text">
                <span className="explorer-cta-title">Abrir Data Explorer</span>
                <span className="explorer-cta-desc">13 datasets • +80.000 registros • 135 municipios</span>
              </div>
            </div>
            <span className="explorer-cta-arrow">→</span>
          </Link>
        </section>
      </SectionReveal>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="footer-rule" />
        <p>
          <a href="https://colossuslab.org" target="_blank" rel="noopener noreferrer" className="footer-link">
            ColossusLab.org
          </a>{' '}
          • Gobernación Provincia de Buenos Aires
        </p>
      </footer>
    </div>
  );
}

function ReportRow({ report, index }: { report: ReportEntry; index: number }) {
  return (
    <Link
      to={`/${report.slug}`}
      className="report-row"
      style={{ animationDelay: `${index * 60}ms` } as React.CSSProperties}
    >
      <div className="report-row-left">
        <div
          className="report-row-accent"
          style={{ background: report.color }}
        />
        <span className="report-row-icon">{report.icon}</span>
        <div className="report-row-text">
          <span className="report-row-title">{report.shortTitle}</span>
          <span className="report-row-desc">{report.title}</span>
        </div>
      </div>
      <div className="report-row-right">
        <span className="report-row-arrow">→</span>
      </div>
    </Link>
  );
}
