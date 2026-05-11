import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { useStore } from '../../store/useStore';
import type { ChartConfig } from '../../types/report';

interface Props {
  chart: ChartConfig;
  height?: number;
}

// Diverge color by x vs y for swing-style scatters (x and y are same scale)
export function ScatterChart({ chart, height = 380 }: Props) {
  const theme = useStore(s => s.theme);
  const isDark = theme === 'dark';
  const points = Array.isArray(chart.data) ? chart.data : [];
  const xKey = chart.config?.xAxis || 'x';
  const yKey = chart.config?.yAxis || 'y';

  // Map to nivo shape: [{ id: 'data', data: [{ x, y, municipio }] }]
  const series = [
    {
      id: chart.id,
      data: points.map((p: any) => ({
        x: typeof p[xKey] === 'number' ? p[xKey] : p.x,
        y: typeof p[yKey] === 'number' ? p[yKey] : p.y,
        municipio: p.municipio || p.id || '',
      })),
    },
  ];

  const reg = chart.config?.regression;
  const diagonal = chart.config?.diagonal;

  // Compute axis bounds for diagonal/regression overlay
  const xs = series[0].data.map((d: any) => d.x);
  const ys = series[0].data.map((d: any) => d.y);
  const allVals = [...xs, ...ys];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);

  return (
    <div style={{ height, position: 'relative' }}>
      <ResponsiveScatterPlot
        data={series}
        margin={{ top: 20, right: 40, bottom: 70, left: 70 }}
        xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        blendMode="normal"
        nodeSize={7}
        colors={[isDark ? '#00d4ff' : '#0284c7']}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          legend: xKey,
          legendPosition: 'middle',
          legendOffset: 50,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: yKey,
          legendPosition: 'middle',
          legendOffset: -55,
        }}
        useMesh={true}
        animate={true}
        motionConfig="gentle"
        theme={{
          text: { fill: isDark ? '#94a3b8' : '#475569' },
          axis: {
            ticks: { text: { fill: isDark ? '#64748b' : '#64748b', fontSize: 11 } },
            legend: { text: { fill: isDark ? '#94a3b8' : '#334155', fontSize: 11 } },
          },
          grid: { line: { stroke: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } },
          tooltip: {
            container: {
              background: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#0f172a',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 12,
            },
          },
        }}
        tooltip={({ node }: any) => (
          <div style={{
            padding: '6px 10px',
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f1f5f9' : '#0f172a',
            borderRadius: 6,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            fontSize: 12,
          }}>
            <strong>{(node.data as any).municipio || node.id}</strong>
            <br />
            {xKey}: {Number(node.data.x).toFixed(1)}
            <br />
            {yKey}: {Number(node.data.y).toFixed(1)}
          </div>
        )}
      />
      {(reg || diagonal) && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 12,
            background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 11,
            color: isDark ? '#cbd5e1' : '#334155',
            lineHeight: 1.4,
          }}
        >
          {reg && (
            <div>
              <strong>R² = {reg.r2}</strong>{' '}
              <span style={{ opacity: 0.7 }}>(n={reg.n})</span>
              <br />
              y = {reg.slope}·x + {reg.intercept}
            </div>
          )}
          {diagonal && (
            <div style={{ opacity: 0.6 }}>
              línea y=x · rango [{minVal.toFixed(0)}, {maxVal.toFixed(0)}]
            </div>
          )}
        </div>
      )}
    </div>
  );
}
