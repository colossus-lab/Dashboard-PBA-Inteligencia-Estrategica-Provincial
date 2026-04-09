import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { SectionReveal } from '../components/ui/SectionReveal';
import { useStore } from '../store/useStore';
import type { ExplorerDataset, ExplorerColumn } from '../types/explorer';

type SortDir = 'asc' | 'desc';
const PAGE_SIZE = 25;

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
    if (!data || !hasYear || numericCols.length === 0) return null;

    const metric = numericCols[0];
    const years = [...new Set(processedRows.map(r => String(r[yearCol])))].sort();

    // Line chart: aggregate metric by year
    const lineData = [{
      id: metric.label,
      data: years.map(y => {
        const yRows = processedRows.filter(r => String(r[yearCol]) === y);
        const sum = yRows.reduce((s, r) => s + (Number(r[metric.name]) || 0), 0);
        return { x: y, y: sum };
      }),
    }];

    // Bar chart: top 10 items by string field (if available)
    const groupCol = stringCols.find(c => !c.name.includes('id') && c.name !== yearCol);
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

    // Pie chart: category distribution by latest year
    const latestYear = years[years.length - 1];
    const latestRows = processedRows.filter(r => String(r[yearCol]) === latestYear);
    let pieData: { id: string; label: string; value: number }[] = [];
    if (groupCol) {
      const groups: Record<string, number> = {};
      for (const r of latestRows) {
        const key = String(r[groupCol.name] || 'Sin dato');
        groups[key] = (groups[key] || 0) + (Number(r[metric.name]) || 0);
      }
      pieData = Object.entries(groups)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, value]) => ({ id, label: id.length > 20 ? id.substring(0, 20) + '…' : id, value }));
    }

    return { lineData, barData, pieData, metric, groupCol };
  }, [data, processedRows, hasYear, yearCol, numericCols, stringCols]);

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
      <div className="explorer-empty">
        <span>❌</span>
        <p>Dataset no encontrado</p>
        <Link to="/explorar" className="explorer-back">← Volver al catálogo</Link>
      </div>
    </div>
  );

  return (
    <div className="explorer-page">
      <SectionReveal>
        <header className="explorer-detail-header">
          <Link to="/explorar" className="explorer-back">← Catálogo de Datos</Link>
          <h1 className="explorer-detail-title">{data.title}</h1>
          <div className="explorer-detail-meta">
            <span className="explorer-meta-badge">📋 {data.source}</span>
            <span className="explorer-meta-badge">📊 {data.totalRows.toLocaleString('es-AR')} registros</span>
            <span className="explorer-meta-badge">📐 {data.columns.length} columnas</span>
            {data.municipios.length > 0 && (
              <span className="explorer-meta-badge">🏛️ {data.municipios.length} municipios</span>
            )}
          </div>
        </header>
      </SectionReveal>

      {/* Auto-Charts */}
      {autoChartData && (
        <SectionReveal>
          <section className="explorer-charts-section">
            <div className="explorer-chart-tabs">
              <button className={`explorer-chart-tab ${chartTab === 'line' ? 'active' : ''}`} onClick={() => setChartTab('line')}>
                📈 Temporal
              </button>
              <button className={`explorer-chart-tab ${chartTab === 'bar' ? 'active' : ''}`} onClick={() => setChartTab('bar')} disabled={autoChartData.barData.length === 0}>
                📊 Ranking
              </button>
              <button className={`explorer-chart-tab ${chartTab === 'pie' ? 'active' : ''}`} onClick={() => setChartTab('pie')} disabled={autoChartData.pieData.length === 0}>
                🥧 Distribución
              </button>
            </div>
            <div className="explorer-chart-container">
              {chartTab === 'line' && (
                <ResponsiveLine
                  data={autoChartData.lineData}
                  theme={nivoTheme}
                  margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
                  xScale={{ type: 'point' }}
                  yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                  curve="monotoneX"
                  colors={['var(--accent-cyan)']}
                  lineWidth={3}
                  pointSize={8}
                  pointColor={{ from: 'color' }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  enableGridX={false}
                  axisBottom={{ tickRotation: -45 }}
                  axisLeft={{ format: v => Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}K` : String(v) }}
                  useMesh
                  enableArea
                  areaOpacity={0.1}
                />
              )}
              {chartTab === 'bar' && autoChartData.barData.length > 0 && (
                <ResponsiveBar
                  data={autoChartData.barData.map(d => ({ ...d, [autoChartData.metric.label]: d.value }))}
                  keys={[autoChartData.metric.label]}
                  indexBy="id"
                  theme={nivoTheme}
                  margin={{ top: 20, right: 30, bottom: 80, left: 70 }}
                  padding={0.3}
                  colors={['var(--accent-cyan)']}
                  borderRadius={4}
                  axisBottom={{ tickRotation: -45 }}
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
                  margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                  innerRadius={0.5}
                  padAngle={1}
                  cornerRadius={4}
                  colors={{ scheme: 'paired' }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  arcLabelsSkipAngle={15}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor={isDark ? '#94a3b8' : '#475569'}
                  arcLinkLabelsThickness={2}
                  arcLinkLabelsColor={{ from: 'color' }}
                />
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
