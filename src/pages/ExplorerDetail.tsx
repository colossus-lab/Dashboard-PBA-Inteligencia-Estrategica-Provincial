import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { SectionReveal } from '../components/ui/SectionReveal';
import { useStore } from '../store/useStore';
import { useIsMobile } from '../lib/useIsMobile';
import {
  ArrowLeft, Database, BarChart3, Building2, FileText,
  TrendingUp, PieChart, AlertCircle,
} from 'lucide-react';
import type { ExplorerDataset, ExplorerColumn } from '../types/explorer';

type SortDir = 'asc' | 'desc';
const PAGE_SIZE = 25;

// Columnas numéricas que no son métricas (IDs, fechas, coordenadas).
const ID_LIKE = /(^|_)(id|anio|year|mes|month|campania|lat|latitud|lon|long|longitud|cod|codigo)$/i;
// Keywords que típicamente identifican una métrica real.
const METRIC_KEYWORDS = [
  'produccion', 'monto', 'valor', 'cantidad', 'empresas', 'establecimientos',
  'hechos', 'victimas', 'superficie', 'stock', 'nacidos', 'tasa', 'rendimiento',
];
const MUNI_COLS = ['municipio_nombre', 'departamento_nombre'];

export function ExplorerDetail() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [data, setData] = useState<ExplorerDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [selectedMuni, setSelectedMuni] = useState('');
  const [chartTab, setChartTab] = useState<'line' | 'bar' | 'pie'>('line');
  const theme = useStore(s => s.theme);
  const isMobile = useIsMobile();

  useEffect(() => {
    setLoading(true);
    fetch(`/data/explorer/${datasetId}.json`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [datasetId]);

  // Derived data
  const numericCols = useMemo(() => data?.columns.filter(c => c.type === 'number') || [], [data]);
  const stringCols = useMemo(() => data?.columns.filter(c => c.type === 'string') || [], [data]);
  const hasYear = useMemo(() => data?.columns.some(c => c.name === 'anio' || c.name === 'campania'), [data]);
  const yearCol = useMemo(() => data?.columns.find(c => c.name === 'anio' || c.name === 'campania')?.name || '', [data]);
  const muniCol = useMemo(() => data?.columns.find(c => c.name.includes('municipio_nombre') || c.name.includes('departamento_nombre'))?.name || '', [data]);

  // Métrica real: numérica, no ID/fecha/coordenada, priorizando keywords.
  const metric = useMemo<ExplorerColumn | null>(() => {
    if (!data) return null;
    const candidates = numericCols.filter(c => !ID_LIKE.test(c.name));
    if (candidates.length === 0) return null;
    const byKeyword = candidates.find(c =>
      METRIC_KEYWORDS.some(k => c.name.toLowerCase().includes(k))
    );
    return byKeyword || candidates[0];
  }, [data, numericCols]);

  // Filter + sort rows
  const processedRows = useMemo(() => {
    if (!data) return [];
    let rows = [...data.rows];

    // Municipio filter
    if (selectedMuni && muniCol) {
      rows = rows.filter(r => r[muniCol] === selectedMuni);
    }

    // Global text filter
    if (filterText) {
      const q = filterText.toLowerCase();
      rows = rows.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortCol) {
      rows.sort((a, b) => {
        const va = a[sortCol] ?? '';
        const vb = b[sortCol] ?? '';
        if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
        return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return rows;
  }, [data, sortCol, sortDir, filterText, selectedMuni, muniCol]);

  const totalPages = Math.ceil(processedRows.length / PAGE_SIZE);
  const pageRows = processedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(0);
  }

  // Auto-chart data generation
  const autoChartData = useMemo(() => {
    if (!data || !metric) return null;

    const years = hasYear
      ? [...new Set(processedRows.map(r => String(r[yearCol])))].sort()
      : [];

    // Line chart: aggregate metric by year (solo si hay yearCol).
    const lineData = hasYear ? [{
      id: metric.label,
      data: years.map(y => {
        const yRows = processedRows.filter(r => String(r[yearCol]) === y);
        const sum = yRows.reduce((s, r) => s + (Number(r[metric.name]) || 0), 0);
        return { x: y, y: sum };
      }),
    }] : [];

    // groupCol: preferir columnas con cardinalidad baja (2-30); descartar muni si
    // ya hay filtro de muni activo, y filas tipo identificador.
    const groupCandidates = stringCols.filter(c => !c.name.includes('id') && c.name !== yearCol);
    const sized = groupCandidates
      .filter(c => !(selectedMuni && MUNI_COLS.includes(c.name)))
      .map(c => ({ c, n: new Set(processedRows.map(r => r[c.name])).size }));
    const groupCol =
      sized.find(({ n }) => n >= 2 && n <= 30)?.c
      || sized.find(({ n }) => n >= 2)?.c;

    // Bar chart: top 10 items por groupCol (suma de la métrica).
    let barData: { id: string; value: number }[] = [];
    if (groupCol) {
      const groups: Record<string, number> = {};
      for (const r of processedRows) {
        const key = String(r[groupCol.name] || 'Sin dato');
        groups[key] = (groups[key] || 0) + (Number(r[metric.name]) || 0);
      }
      barData = Object.entries(groups)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, value]) => ({ id, value }));
    }

    // Pie chart: distribución por groupCol. Si hay yearCol, usar último año;
    // si no, usar todas las filas.
    const pieRows = hasYear && years.length > 0
      ? processedRows.filter(r => String(r[yearCol]) === years[years.length - 1])
      : processedRows;
    let pieData: { id: string; label: string; value: number }[] = [];
    if (groupCol) {
      const groups: Record<string, number> = {};
      for (const r of pieRows) {
        const key = String(r[groupCol.name] || 'Sin dato');
        groups[key] = (groups[key] || 0) + (Number(r[metric.name]) || 0);
      }
      pieData = Object.entries(groups)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, value]) => ({ id, label: id.length > 20 ? id.substring(0, 20) + '…' : id, value }));
    }

    return { lineData, barData, pieData, metric, groupCol };
  }, [data, processedRows, hasYear, yearCol, metric, stringCols, selectedMuni]);

  // Si el tab activo se queda sin datos (p. ej. dataset sin yearCol), saltar al
  // primer tab disponible. Evita pantalla en blanco.
  useEffect(() => {
    if (!autoChartData) return;
    const empty = {
      line: autoChartData.lineData.length === 0 || (autoChartData.lineData[0]?.data.length ?? 0) === 0,
      bar: autoChartData.barData.length === 0,
      pie: autoChartData.pieData.length === 0,
    };
    if (empty[chartTab]) {
      const fallback = (['line', 'bar', 'pie'] as const).find(t => !empty[t]);
      if (fallback) setChartTab(fallback);
    }
  }, [autoChartData, chartTab]);

  const isDark = theme === 'dark';
  const nivoTheme = {
    text: { fill: isDark ? '#94a3b8' : '#475569' },
    axis: { ticks: { text: { fill: isDark ? '#94a3b8' : '#475569' } }, legend: { text: { fill: isDark ? '#cbd5e1' : '#334155' } } },
    grid: { line: { stroke: isDark ? '#1e293b' : '#e2e8f0' } },
    tooltip: { container: { background: isDark ? '#1e293b' : '#fff', color: isDark ? '#f1f5f9' : '#0f172a', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.25)' } },
    labels: { text: { fill: isDark ? '#f1f5f9' : '#0f172a' } },
  };

  if (loading) return (
    <div className="explorer-page">
      <div className="explorer-loading">
        <div className="explorer-spinner" />
        <p>Cargando dataset...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="explorer-page">
      <div className="explorer-empty" role="status">
        <span aria-hidden="true"><AlertCircle size={36} /></span>
        <p>Dataset no encontrado</p>
        <Link to="/explorar" className="btn-secondary">
          <ArrowLeft size={14} aria-hidden="true" /> Volver al catálogo
        </Link>
      </div>
    </div>
  );

  return (
    <div className="explorer-page">
      <SectionReveal>
        <header className="explorer-detail-header">
          <Link to="/explorar" className="explorer-back">
            <ArrowLeft size={14} aria-hidden="true" /> Catálogo de Datos
          </Link>
          <h1 className="explorer-detail-title">{data.title}</h1>
          <div className="explorer-detail-meta">
            <span className="explorer-meta-badge">
              <FileText size={14} aria-hidden="true" /> {data.source}
            </span>
            <span className="explorer-meta-badge">
              <Database size={14} aria-hidden="true" /> {data.totalRows.toLocaleString('es-AR')} registros
            </span>
            <span className="explorer-meta-badge">
              <BarChart3 size={14} aria-hidden="true" /> {data.columns.length} columnas
            </span>
            {data.municipios.length > 0 && (
              <span className="explorer-meta-badge">
                <Building2 size={14} aria-hidden="true" /> {data.municipios.length} municipios
              </span>
            )}
          </div>
        </header>
      </SectionReveal>

      {/* Auto-Charts */}
      {autoChartData && (
        <SectionReveal>
          <section className="explorer-charts-section">
            <div className="explorer-chart-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={chartTab === 'line'}
                className={`explorer-chart-tab ${chartTab === 'line' ? 'active' : ''}`}
                onClick={() => setChartTab('line')}
                disabled={(autoChartData.lineData[0]?.data.length ?? 0) === 0}
              >
                <TrendingUp size={14} aria-hidden="true" /> Temporal
              </button>
              <button
                role="tab"
                aria-selected={chartTab === 'bar'}
                className={`explorer-chart-tab ${chartTab === 'bar' ? 'active' : ''}`}
                onClick={() => setChartTab('bar')}
                disabled={autoChartData.barData.length === 0}
              >
                <BarChart3 size={14} aria-hidden="true" /> Ranking
              </button>
              <button
                role="tab"
                aria-selected={chartTab === 'pie'}
                className={`explorer-chart-tab ${chartTab === 'pie' ? 'active' : ''}`}
                onClick={() => setChartTab('pie')}
                disabled={autoChartData.pieData.length === 0}
              >
                <PieChart size={14} aria-hidden="true" /> Distribución
              </button>
            </div>
            <div className="explorer-chart-container">
              {processedRows.length === 0 ? (
                <div className="explorer-empty" role="status">
                  <span aria-hidden="true"><AlertCircle size={28} /></span>
                  <p>Sin datos para mostrar con los filtros actuales</p>
                </div>
              ) : (
                <>
                  {chartTab === 'line' && (autoChartData.lineData[0]?.data.length ?? 0) > 0 && (
                    <ResponsiveLine
                      data={autoChartData.lineData}
                      theme={nivoTheme}
                      margin={isMobile
                        ? { top: 10, right: 12, bottom: 60, left: 44 }
                        : { top: 20, right: 30, bottom: 50, left: 70 }}
                      xScale={{ type: 'point' }}
                      yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                      curve="monotoneX"
                      colors={['var(--accent-cyan)']}
                      lineWidth={isMobile ? 2 : 3}
                      pointSize={isMobile ? 5 : 8}
                      pointColor={{ from: 'color' }}
                      pointBorderWidth={2}
                      pointBorderColor={{ from: 'serieColor' }}
                      enableGridX={false}
                      axisBottom={{ tickRotation: isMobile ? -60 : -45 }}
                      axisLeft={{
                        format: v => Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}K` : String(v),
                        tickValues: isMobile ? 4 : undefined,
                      }}
                      useMesh
                      enableArea
                      areaOpacity={0.1}
                    />
                  )}
                  {chartTab === 'bar' && autoChartData.barData.length > 0 && (
                    <ResponsiveBar
                      data={autoChartData.barData
                        .slice(0, isMobile ? 6 : 10)
                        .map(d => ({ ...d, [autoChartData.metric.label]: d.value }))}
                      keys={[autoChartData.metric.label]}
                      indexBy="id"
                      theme={nivoTheme}
                      margin={isMobile
                        ? { top: 10, right: 12, bottom: 90, left: 44 }
                        : { top: 20, right: 30, bottom: 80, left: 70 }}
                      padding={0.3}
                      colors={['var(--accent-cyan)']}
                      borderRadius={4}
                      axisBottom={{ tickRotation: isMobile ? -60 : -45 }}
                      axisLeft={{ format: v => Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}K` : String(v) }}
                      labelSkipWidth={40}
                      labelSkipHeight={16}
                      enableLabel={false}
                      layout="vertical"
                    />
                  )}
                  {chartTab === 'pie' && autoChartData.pieData.length > 0 && (
                    <ResponsivePie
                      data={autoChartData.pieData}
                      theme={nivoTheme}
                      margin={isMobile
                        ? { top: 12, right: 12, bottom: 60, left: 12 }
                        : { top: 20, right: 80, bottom: 20, left: 80 }}
                      innerRadius={isMobile ? 0.4 : 0.5}
                      padAngle={1}
                      cornerRadius={4}
                      colors={{ scheme: 'paired' }}
                      borderWidth={1}
                      borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                      arcLabelsSkipAngle={isMobile ? 20 : 15}
                      arcLinkLabelsSkipAngle={10}
                      arcLinkLabelsTextColor={isDark ? '#94a3b8' : '#475569'}
                      arcLinkLabelsThickness={2}
                      arcLinkLabelsColor={{ from: 'color' }}
                      enableArcLinkLabels={!isMobile}
                      legends={isMobile ? [{
                        anchor: 'bottom',
                        direction: 'row',
                        itemWidth: 70,
                        itemHeight: 14,
                        symbolSize: 10,
                        translateY: 50,
                      }] : []}
                    />
                  )}
                </>
              )}
            </div>
          </section>
        </SectionReveal>
      )}

      {/* Filters */}
      <SectionReveal>
        <div className="explorer-filters">
          <input
            type="text"
            className="explorer-filter-input"
            placeholder="Filtrar registros..."
            value={filterText}
            onChange={e => { setFilterText(e.target.value); setPage(0); }}
          />
          {data.municipios.length > 0 && (
            <select
              className="explorer-filter-select"
              value={selectedMuni}
              onChange={e => { setSelectedMuni(e.target.value); setPage(0); }}
            >
              <option value="">Todos los municipios</option>
              {data.municipios.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
          <span className="explorer-filter-count">
            {processedRows.length.toLocaleString('es-AR')} resultados
          </span>
        </div>
      </SectionReveal>

      {/* Interactive Table */}
      <SectionReveal>
        <div className="explorer-table-wrap">
          {processedRows.length === 0 ? (
            <div className="explorer-empty" role="status">
              <span aria-hidden="true"><AlertCircle size={28} /></span>
              <p>Sin registros para los filtros actuales</p>
            </div>
          ) : (
            <table className="explorer-table">
              <thead>
                <tr>
                  {data.columns.map(col => (
                    <th
                      key={col.name}
                      className={`explorer-th ${sortCol === col.name ? 'sorted' : ''} ${col.type === 'number' ? 'num' : ''}`}
                      onClick={() => handleSort(col.name)}
                    >
                      {col.label}
                      <span className="explorer-sort-icon">
                        {sortCol === col.name ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={i} className="explorer-tr">
                    {data.columns.map(col => (
                      <td
                        key={col.name}
                        className={`explorer-td ${col.type === 'number' ? 'num' : ''}`}
                      >
                        {formatCell(row[col.name], col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SectionReveal>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="explorer-pagination">
          <button
            className="explorer-page-btn"
            disabled={page === 0}
            onClick={() => setPage(0)}
          >
            «
          </button>
          <button
            className="explorer-page-btn"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            ‹
          </button>
          <span className="explorer-page-info">
            Página {page + 1} de {totalPages}
          </span>
          <button
            className="explorer-page-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            ›
          </button>
          <button
            className="explorer-page-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}

function formatCell(value: unknown, col: ExplorerColumn): string {
  if (value === null || value === undefined) return '—';
  if (col.type === 'number') {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1_000) return num.toLocaleString('es-AR');
    if (Number.isInteger(num)) return String(num);
    return num.toFixed(2);
  }
  return String(value);
}
