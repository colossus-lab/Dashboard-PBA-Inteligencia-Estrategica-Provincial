import { useParams, Link } from 'react-router-dom';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Helmet } from 'react-helmet-async';
import { Map as MapIcon, AlertCircle, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { getReportBySlug, REPORTS } from '../data/reportRegistry';
import { useReportData } from '../hooks/useReportData';
import { KPICounter } from '../components/ui/KPICounter';
import { SectionReveal } from '../components/ui/SectionReveal';
import { ChartRenderer } from '../components/charts/ChartRenderer';
import { MapaPBA } from '../components/charts/MapaPBA';
import { LazyMount } from '../components/ui/LazyMount';
import { ReportTOC } from '../components/ui/ReportTOC';
import { EmptyState } from '../components/ui/EmptyState';
import { CitationBox } from '../components/report/CitationBox';
import { useStore } from '../store/useStore';
import type { ReportEntry, ReportData, ChartConfig } from '../types/report';

const mdComponents = {
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) => (
    <div className="table-scroll-wrapper"><table {...props}>{children}</table></div>
  ),
};

export function ReportView() {
  const params = useParams();
  const slug = params['*'] || '';
  const report = getReportBySlug(slug);

  if (!report) {
    return (
      <EmptyState
        icon={<AlertCircle size={48} />}
        title="Informe no encontrado"
        message={`No existe un informe en la ruta /${slug}.`}
        primaryAction={{ label: '← Volver al Dashboard', to: '/' }}
      />
    );
  }

  return <ReportContent reportEntry={report} />;
}

function ReportContent({ reportEntry }: { reportEntry: ReportEntry }) {
  const { markdown, data, loading, error } = useReportData(reportEntry.mdPath, reportEntry.dataPath);
  const { setActiveSection } = useStore();

  if (loading) return <LoadingSkeleton />;
  if (error || !data) {
    return (
      <EmptyState
        icon={<AlertCircle size={48} />}
        title="Error cargando datos"
        message={error || 'No se pudieron cargar los datos del informe'}
        primaryAction={{ label: 'Reintentar', onClick: () => window.location.reload() }}
        secondaryAction={{ label: '← Inicio', to: '/' }}
      />
    );
  }

  // Find adjacent reports
  const currentIndex = REPORTS.findIndex(r => r.id === reportEntry.id);
  const prevReport = currentIndex > 0 ? REPORTS[currentIndex - 1] : null;
  const nextReport = currentIndex < REPORTS.length - 1 ? REPORTS[currentIndex + 1] : null;

  // Extract sections from markdown
  const sections = splitMarkdownSections(markdown || '');
  const tocSections = useMemo(
    () => sections.filter(s => s.heading).map(s => ({ id: slugify(s.heading), heading: s.heading })),
    [sections],
  );

  const ogImageUrl = `https://pba.openarg.org/api/og?slug=${encodeURIComponent(reportEntry.slug)}`;
  const canonical = `https://pba.openarg.org/${reportEntry.slug}`;
  const description = `Análisis de ${reportEntry.category} — ${reportEntry.title}. Fuente: ${data.meta.source}. Dashboard PBA · ColossusLab.`;

  return (
    <>
      <Helmet>
        <title>{reportEntry.title} · Dashboard PBA</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`${reportEntry.title} · Dashboard PBA`} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${reportEntry.title} · Dashboard PBA`} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Helmet>

      <div className="report-layout">
        {/* TOC sticky en desktop si hay 3+ secciones */}
        {tocSections.length >= 3 && (
          <div className="report-toc-wrap">
            <ReportTOC sections={tocSections} />
          </div>
        )}

        <div className="report-main space-y-8">
          {/* Hero */}
          <SectionReveal>
            <div className="report-hero">
              <div className="report-hero-header">
                <span className="report-hero-number">{String(reportEntry.order).padStart(2, '0')}</span>
                <div>
                  <h1
                    className="report-hero-title"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      background: `linear-gradient(135deg, ${reportEntry.color}, var(--accent-cyan))`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {reportEntry.title}
                  </h1>
                  <p className="report-hero-meta">
                    <span className="report-hero-meta-item">
                      <Calendar size={14} aria-hidden="true" />
                      Datos al {data.meta.date}
                    </span>
                    <span className="report-hero-meta-divider" aria-hidden="true">·</span>
                    <span className="report-hero-meta-item">
                      <FileText size={14} aria-hidden="true" />
                      Fuente: {data.meta.source}
                    </span>
                  </p>
                </div>
              </div>

              {/* KPIs Grid */}
              {data.kpis.length > 0 && (
                <div className="kpi-grid">
                  {data.kpis.slice(0, 8).map(kpi => (
                    <KPICounter
                      key={kpi.id}
                      value={kpi.value}
                      formatted={kpi.formatted}
                      label={kpi.label}
                      unit={kpi.unit}
                      status={kpi.status}
                    />
                  ))}
                </div>
              )}
            </div>
          </SectionReveal>

          {/* Mobile TOC dropdown */}
          {tocSections.length >= 3 && (
            <div className="report-toc-mobile">
              <details>
                <summary>Saltar a sección</summary>
                <ul>
                  {tocSections.map((s, i) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`}>
                        <span>{String(i + 1).padStart(2, '0')}</span> {s.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {/* Contextual Map */}
          {data.mapData && data.mapData.length > 0 && (
            <SectionReveal>
              <div className="chart-card map-section">
                <h3 className="map-section-title">
                  <MapIcon size={20} aria-hidden="true" /> Distribución Municipal
                </h3>
                <p className="map-section-subtitle">
                  Mapa coroplético de los {data.mapData.length} municipios con datos disponibles
                </p>
                <LazyMount minHeight={520}>
                  <MapaPBA mapData={data.mapData} height={520} />
                </LazyMount>
              </div>
            </SectionReveal>
          )}

          {/* Scrollytelling Content */}
          {sections.map((section, i) => {
            const sectionId = slugify(section.heading);
            const matchingCharts = findChartsForSection(data.charts, sectionId, i, sections.length);

            return (
              <SectionReveal
                key={`section-${i}`}
                id={sectionId}
                onVisible={() => setActiveSection(sectionId)}
              >
                {matchingCharts.length > 0 ? (
                  <>
                    <div className="scrolly-split desktop-only">
                      <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                          {section.content}
                        </ReactMarkdown>
                      </div>
                      <div className="scrolly-sticky space-y-6">
                        {matchingCharts.map(chart => (
                          <div key={chart.id} className="chart-card">
                            <h4>{chart.title}</h4>
                            <LazyMount minHeight={300}>
                              <ChartRenderer chart={chart} height={300} />
                            </LazyMount>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mobile-only">
                      <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                          {section.content}
                        </ReactMarkdown>
                      </div>
                      <div className="mobile-charts">
                        {matchingCharts.map(chart => (
                          <div key={chart.id} className="chart-card">
                            <h4>{chart.title}</h4>
                            <LazyMount minHeight={300}>
                              <ChartRenderer chart={chart} height={300} />
                            </LazyMount>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="markdown-content max-w-3xl">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {section.content}
                    </ReactMarkdown>
                  </div>
                )}
              </SectionReveal>
            );
          })}

          {/* Citation */}
          <SectionReveal>
            <CitationBox report={reportEntry} data={data} />
          </SectionReveal>

          {/* Navigation prev/next */}
          <SectionReveal>
            <div className="flex flex-col gap-4 pt-8 pb-4" style={{ borderTop: '1px solid var(--border-glass)' }}>
              <div className="flex gap-4">
                {prevReport && (
                  <Link to={`/${prevReport.slug}`} className="glass-card p-5 flex-1 no-underline">
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>← Anterior</span>
                    <p className="font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                      {prevReport.shortTitle}
                    </p>
                  </Link>
                )}
                {nextReport && (
                  <Link to={`/${nextReport.slug}`} className="glass-card p-5 flex-1 no-underline text-right">
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Siguiente →</span>
                    <p className="font-semibold mt-1 text-right" style={{ color: 'var(--text-primary)' }}>
                      {nextReport.shortTitle}
                    </p>
                  </Link>
                )}
              </div>
            </div>
          </SectionReveal>
        </div>
      </div>
    </>
  );
}

// ─── Chart Matching ───

function findChartsForSection(charts: ChartConfig[], sectionSlug: string, sectionIndex: number, totalSections: number): ChartConfig[] {
  if (sectionIndex === 0 || sectionSlug === '') return [];
  const stopWords = new Set(['los', 'las', 'del', 'por', 'con', 'una', 'que', 'mas', 'entre', 'sin']);

  const matched = charts.filter(chart => {
    if (!chart.sectionId || chart.sectionId.length === 0) return false;
    if (sectionSlug === chart.sectionId) return true;
    if (sectionSlug.length > 3 && chart.sectionId.length > 3) {
      if (sectionSlug.includes(chart.sectionId)) return true;
    }
    const chartWords = chart.sectionId.split('-').filter(w => w.length > 2 && !stopWords.has(w));
    const sectionWords = sectionSlug.split('-').filter(w => w.length > 2 && !stopWords.has(w));
    const overlap = chartWords.filter(w => sectionWords.includes(w));
    if (chartWords.length <= 2) return overlap.length >= chartWords.length;
    return overlap.length >= 2 && overlap.length >= chartWords.length * 0.5;
  });

  if (matched.length > 0) return matched;
  const anyHasSectionId = charts.some(chart => chart.sectionId && chart.sectionId.length > 0);
  if (anyHasSectionId) return [];
  if (totalSections <= 1) return charts;
  const contentSectionIndex = sectionIndex - 1;
  if (contentSectionIndex < 0) return [];
  const contentSections = totalSections - 1;
  if (contentSections <= 0) return [];
  return charts.filter((_, chartIdx) => (chartIdx % contentSections) === contentSectionIndex);
}

// ─── Helpers ───

interface MarkdownSection {
  heading: string;
  content: string;
}

function splitMarkdownSections(md: string): MarkdownSection[] {
  const lines = md.split('\n');
  const sections: MarkdownSection[] = [];
  let currentHeading = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, content: currentLines.join('\n') });
      }
      currentHeading = line.replace('## ', '');
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    sections.push({ heading: currentHeading, content: currentLines.join('\n') });
  }
  return sections;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 py-8 animate-pulse">
      <div className="h-12 rounded-lg" style={{ background: 'var(--bg-tertiary)', width: '75%' }} />
      <div className="kpi-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-lg" style={{ background: 'var(--bg-tertiary)' }} />
        ))}
      </div>
      <div className="h-64 rounded-lg" style={{ background: 'var(--bg-tertiary)' }} />
    </div>
  );
}

// Re-export types intentionally not used externally — keeping unused import friendly
export type { ReportData };
