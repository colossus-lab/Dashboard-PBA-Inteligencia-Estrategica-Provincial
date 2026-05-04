import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getReportBySlug, REPORTS } from '../data/reportRegistry';
import { useReportData } from '../hooks/useReportData';
import { KPICounter } from '../components/ui/KPICounter';
import { SectionReveal } from '../components/ui/SectionReveal';
import { ChartRenderer } from '../components/charts/ChartRenderer';
import { MapaPBA } from '../components/charts/MapaPBA';
import { useStore } from '../store/useStore';
import type { ReportEntry, ChartConfig } from '../types/report';

// Wrap tables in scrollable container for mobile
const mdComponents = {
  table: ({children, ...props}: React.ComponentPropsWithoutRef<'table'>) => (
    <div className="table-scroll-wrapper"><table {...props}>{children}</table></div>
  ),
};

export function ReportView() {
  const params = useParams();
  const slug = params['*'] || '';
  const report = getReportBySlug(slug);

  if (!report) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Informe no encontrado
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Ruta: /{slug}
        </p>
        <Link to="/" className="text-sm" style={{ color: 'var(--accent-cyan)' }}>
          ← Volver al Dashboard
        </Link>
      </div>
    );
  }

  return <ReportContent reportEntry={report} />;
}

function ReportContent({ reportEntry }: { reportEntry: ReportEntry }) {
  const { markdown, data, loading, error } = useReportData(reportEntry.mdPath, reportEntry.dataPath);
  const { setActiveSection } = useStore();

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="No se pudieron cargar los datos" />;

  // Find adjacent reports for navigation
  const currentIndex = REPORTS.findIndex(r => r.id === reportEntry.id);
  const prevReport = currentIndex > 0 ? REPORTS[currentIndex - 1] : null;
  const nextReport = currentIndex < REPORTS.length - 1 ? REPORTS[currentIndex + 1] : null;

  // Extract sections from markdown by splitting on ## headings
  const sections = splitMarkdownSections(markdown || '');

  return (
    <div className="space-y-8">
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
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {data.meta.source}
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

      {/* Contextual Map — only shown when report has municipal data */}
      {data.mapData && data.mapData.length > 0 && (
        <SectionReveal>
          <div className="chart-card map-section">
            <h3 className="map-section-title">
              🗺️ Distribución Municipal
            </h3>
            <p className="map-section-subtitle">
              Mapa coroplético de los {data.mapData.length} municipios con datos disponibles
            </p>
            <MapaPBA
              mapData={data.mapData}
              height={520}
            />
          </div>
        </SectionReveal>
      )}

      {/* Scrollytelling Content */}
      {sections.map((section, i) => {
        // Find charts that match this section using fuzzy matching
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
                {/* Desktop: split layout */}
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
                        <ChartRenderer chart={chart} height={300} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Mobile: inline flow (text then charts) */}
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
                        <ChartRenderer chart={chart} height={300} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              // Full-width text only
              <div className="markdown-content max-w-3xl">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {section.content}
                </ReactMarkdown>
              </div>
            )}
          </SectionReveal>
        );
      })}

      {/* Navigation to next/prev report */}
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
  );
}

// ─── Chart Matching ───

function findChartsForSection(charts: ChartConfig[], sectionSlug: string, sectionIndex: number, totalSections: number): ChartConfig[] {
  // Never assign charts to the intro section (no heading = index 0 with empty slug)
  if (sectionIndex === 0 || sectionSlug === '') return [];

  // Common words that appear in many sections — not useful for matching
  const stopWords = new Set(['los', 'las', 'del', 'por', 'con', 'una', 'que', 'mas', 'entre', 'sin']);

  const matched = charts.filter(chart => {
    if (!chart.sectionId || chart.sectionId.length === 0) return false;

    // Exact match first
    if (sectionSlug === chart.sectionId) return true;

    // Direct substring match (strict direction: sectionId contained in slug)
    if (sectionSlug.length > 3 && chart.sectionId.length > 3) {
      if (sectionSlug.includes(chart.sectionId)) return true;
    }

    // Word overlap matching (stricter: need significant overlap)
    const chartWords = chart.sectionId.split('-').filter(w => w.length > 2 && !stopWords.has(w));
    const sectionWords = sectionSlug.split('-').filter(w => w.length > 2 && !stopWords.has(w));
    const overlap = chartWords.filter(w => sectionWords.includes(w));

    // Require at least 2 overlapping words, OR majority of chart words must match
    if (chartWords.length <= 2) {
      return overlap.length >= chartWords.length; // all words must match for short IDs
    }
    return overlap.length >= 2 && overlap.length >= chartWords.length * 0.5;
  });

  if (matched.length > 0) return matched;

  // Fallback: distribute remaining unmatched charts only if NO chart has a sectionId at all
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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-20">
      <span className="text-5xl">⚠️</span>
      <h2 className="text-xl font-bold mt-4" style={{ color: 'var(--text-primary)' }}>Error cargando datos</h2>
      <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>{message}</p>
      <Link to="/" className="inline-block mt-4 text-sm" style={{ color: 'var(--accent-cyan)' }}>
        ← Volver al Dashboard
      </Link>
    </div>
  );
}
