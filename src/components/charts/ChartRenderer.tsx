import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line';
import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { MapaPBA } from './MapaPBA';
import type { ChartConfig } from '../../types/report';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

// ═══════════════════════════════════════════════════════════════
// ChartRenderer — Universal chart component (theme-aware)
// ═══════════════════════════════════════════════════════════════

interface ChartRendererProps {
  chart: ChartConfig;
  height?: number;
}

function useChartTheme() {
  const theme = useStore(s => s.theme);
  const isDark = theme === 'dark';

  return {
    theme: {
      text: { fill: isDark ? '#94a3b8' : '#475569' },
      axis: {
        ticks: { text: { fill: isDark ? '#64748b' : '#64748b', fontSize: 11 } },
        legend: { text: { fill: isDark ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 600 } },
      },
      grid: { line: { stroke: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } },
      tooltip: {
        container: {
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f1f5f9' : '#0f172a',
          borderRadius: '10px',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.5)'
            : '0 8px 32px rgba(0,0,0,0.12)',
          fontSize: '13px',
          padding: '10px 14px',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
        },
      },
    },
    labelColor: isDark ? '#ffffff' : '#1e293b',
    isDark,
  };
}

const COLORS = ['#00d4ff', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export function ChartRenderer({ chart, height = 400 }: ChartRendererProps) {
  switch (chart.type) {
    case 'bar':
      return <BarChartView chart={chart} height={height} />;
    case 'pie':
      return <PieChartView chart={chart} height={height} />;
    case 'line':
      return <LineChartView chart={chart} height={height} />;
    case 'pyramid':
      return <PyramidChartView chart={chart} height={height} />;
    case 'map':
      return <MapaPBA mapData={chart.data} title={chart.title} height={height} />;
    default:
      return <BarChartView chart={chart} height={height} />;
  }
}

// ─── Bar Chart ───
function BarChartView({ chart, height }: { chart: ChartConfig; height: number }) {
  const { theme, labelColor } = useChartTheme();
  const keys = Object.keys(chart.data[0] || {}).filter(k => k !== (chart.config?.xAxis || 'id'));
  const indexBy = chart.config?.xAxis || Object.keys(chart.data[0] || {})[0] || 'id';
  const isHorizontal = chart.config?.layout === 'horizontal';
  const dataCount = chart.data.length;
  const mobile = useIsMobile();

  // Cap horizontal bar height to fit within the panel (max ~10 items visible)
  const maxItems = mobile ? 8 : 10;
  const cappedHeight = isHorizontal
    ? Math.min(height, Math.max(280, Math.min(dataCount, maxItems) * (mobile ? 28 : 30) + 60))
    : height;

  return (
    <div style={{ height: cappedHeight }}>
      <ResponsiveBar
        data={chart.data}
        keys={keys}
        indexBy={indexBy}
        margin={{
          top: 10,
          right: mobile ? 10 : 20,
          bottom: isHorizontal ? 40 : (mobile ? 60 : 70),
          left: isHorizontal ? (mobile ? 110 : 160) : (mobile ? 40 : 50),
        }}
        padding={0.3}
        layout={isHorizontal ? 'horizontal' : 'vertical'}
        colors={COLORS}
        borderRadius={3}
        axisBottom={
          isHorizontal
            ? { tickSize: 0, tickPadding: 5 }
            : { tickSize: 0, tickPadding: 5, tickRotation: dataCount > 4 ? -40 : 0 }
        }
        axisLeft={
          isHorizontal
            ? { tickSize: 0, tickPadding: 8, format: (v: string) => v.length > 20 ? v.slice(0, 18) + '…' : v }
            : { tickSize: 0, tickPadding: 5 }
        }
        enableGridX={isHorizontal}
        enableGridY={!isHorizontal}
        groupMode={chart.config?.stacked ? 'stacked' : 'grouped'}
        theme={theme}
        animate={true}
        motionConfig="gentle"
        labelSkipWidth={30}
        labelSkipHeight={18}
        labelTextColor={labelColor}
      />
    </div>
  );
}

// ─── Pie Chart ───
function PieChartView({ chart, height }: { chart: ChartConfig; height: number }) {
  const { theme, isDark } = useChartTheme();
  const mobile = useIsMobile();

  // Format large numbers in arc labels
  const formatValue = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
  };

  return (
    <div style={{ height: Math.min(height, mobile ? 280 : 340) }}>
      <ResponsivePie
        data={chart.data}
        margin={mobile
          ? { top: 20, right: 20, bottom: 50, left: 20 }
          : { top: 30, right: 100, bottom: 40, left: 100 }
        }
        innerRadius={0.5}
        padAngle={2}
        cornerRadius={5}
        colors={COLORS}
        borderWidth={0}
        enableArcLinkLabels={!mobile}
        arcLinkLabelsSkipAngle={8}
        arcLinkLabelsTextColor={isDark ? '#94a3b8' : '#334155'}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLinkLabelsThickness={2}
        arcLinkLabelsDiagonalLength={16}
        arcLinkLabelsStraightLength={20}
        arcLabelsSkipAngle={mobile ? 20 : 15}
        arcLabelsTextColor="#ffffff"
        arcLabel={d => formatValue(d.value)}
        theme={theme}
        animate={true}
        motionConfig="gentle"
        legends={[
          {
            anchor: 'bottom',
            direction: mobile ? 'column' : 'row',
            translateY: mobile ? 45 : 36,
            itemWidth: mobile ? 160 : 120,
            itemHeight: 18,
            itemTextColor: isDark ? '#94a3b8' : '#475569',
            symbolSize: 10,
            symbolShape: 'circle',
          },
        ]}
      />
    </div>
  );
}

// ─── Line Chart ───
function LineChartView({ chart, height }: { chart: ChartConfig; height: number }) {
  const { theme } = useChartTheme();
  const xKey = chart.config?.xAxis || Object.keys(chart.data[0] || {})[0];
  const yKeys = Object.keys(chart.data[0] || {}).filter(k => k !== xKey);

  const lineData = yKeys.map((key, i) => ({
    id: key,
    color: COLORS[i % COLORS.length],
    data: chart.data.map(d => ({ x: d[xKey], y: d[key] })),
  }));

  return (
    <div style={{ height }}>
      <ResponsiveLine
        data={lineData}
        margin={{ top: 20, right: 30, bottom: 60, left: 60 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        curve="monotoneX"
        colors={COLORS}
        pointSize={8}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        enableArea={true}
        areaOpacity={0.06}
        axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -35 }}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        enableGridX={false}
        theme={theme}
        animate={true}
        motionConfig="gentle"
        useMesh={true}
      />
    </div>
  );
}

// ─── Pyramid Chart (Diverging Horizontal Bar) ───
function PyramidChartView({ chart, height }: { chart: ChartConfig; height: number }) {
  const { theme, isDark } = useChartTheme();
  const mobile = useIsMobile();

  const pyramidData = chart.data.map((d: Record<string, unknown>) => ({
    grupo: String(d.grupo || d.group || d.id || ''),
    Mujeres: Number(d.mujeres || d.Mujeres || 0),
    Varones: -Number(d.varones || d.Varones || 0),
  }));

  const cappedHeight = Math.max(360, Math.min(height, pyramidData.length * (mobile ? 24 : 28) + 80));

  return (
    <div style={{ height: cappedHeight }}>
      <ResponsiveBar
        data={pyramidData}
        keys={['Varones', 'Mujeres']}
        indexBy="grupo"
        layout="horizontal"
        margin={{
          top: 10,
          right: mobile ? 10 : 20,
          bottom: 50,
          left: mobile ? 50 : 60,
        }}
        padding={0.2}
        colors={[isDark ? '#60a5fa' : '#3b82f6', isDark ? '#f472b6' : '#ec4899']}
        borderRadius={2}
        axisBottom={{
          tickSize: 0,
          tickPadding: 5,
          format: (v: number) => {
            const abs = Math.abs(v);
            if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
            if (abs >= 1_000) return `${(abs / 1_000).toFixed(0)}K`;
            return String(abs);
          },
        }}
        axisLeft={{ tickSize: 0, tickPadding: 5 }}
        enableGridX={true}
        enableGridY={false}
        theme={theme}
        animate={true}
        motionConfig="gentle"
        labelSkipWidth={40}
        labelTextColor="#ffffff"
        label={d => {
          const abs = Math.abs(Number(d.value));
          if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
          if (abs >= 1_000) return `${(abs / 1_000).toFixed(0)}K`;
          return String(abs);
        }}
        tooltip={({ id, value, indexValue, color }) => (
          <div style={{
            padding: '8px 12px',
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f1f5f9' : '#0f172a',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '13px',
            border: `2px solid ${color}`,
          }}>
            <strong>{String(indexValue)}</strong><br />
            {String(id)}: {Math.abs(Number(value)).toLocaleString('es-AR')}
          </div>
        )}
        legends={[{
          dataFrom: 'keys',
          anchor: 'bottom',
          direction: 'row',
          translateY: 44,
          itemWidth: 100,
          itemHeight: 18,
          itemTextColor: isDark ? '#94a3b8' : '#475569',
          symbolSize: 10,
          symbolShape: 'circle',
          data: [
            { id: 'Varones', label: 'Varones', color: isDark ? '#60a5fa' : '#3b82f6' },
            { id: 'Mujeres', label: 'Mujeres', color: isDark ? '#f472b6' : '#ec4899' },
          ],
        }]}
      />
    </div>
  );
}
