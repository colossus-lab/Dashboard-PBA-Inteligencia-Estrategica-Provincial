import { ResponsiveHeatMap } from '@nivo/heatmap';
import { useStore } from '../../store/useStore';
import type { ChartConfig } from '../../types/report';

interface Props {
  chart: ChartConfig;
  height?: number;
}

// Heatmap espera data: [{ id, data: [{x, y: number|null}] }]
export function HeatmapChart({ chart, height = 800 }: Props) {
  const theme = useStore(s => s.theme);
  const isDark = theme === 'dark';
  const rows = Array.isArray(chart.data) ? chart.data : [];

  // Cap altura para que sea legible: rows ≈ 135 munis × 18px
  const computedHeight = Math.max(height, rows.length * 14 + 80);

  return (
    <div style={{ height: computedHeight, overflowX: 'auto' }}>
      <ResponsiveHeatMap
        data={rows}
        margin={{ top: 24, right: 40, bottom: 40, left: 220 }}
        valueFormat=">-.1f"
        axisTop={{
          tickSize: 0,
          tickPadding: 6,
          tickRotation: -30,
          legend: 'Año',
          legendOffset: -14,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 4,
          legend: 'Municipio (sección · nombre)',
          legendOffset: -200,
          legendPosition: 'middle',
        }}
        colors={{
          type: 'diverging',
          scheme: isDark ? 'red_yellow_blue' : 'red_yellow_green',
          divergeAt: 0.5,
          minValue: 50,
          maxValue: 90,
        }}
        emptyColor={isDark ? '#1f2937' : '#e5e7eb'}
        labelTextColor={{ from: 'color', modifiers: [['darker', 2.6]] }}
        animate={true}
        motionConfig="gentle"
        theme={{
          text: { fill: isDark ? '#94a3b8' : '#475569', fontSize: 9 },
          axis: {
            ticks: { text: { fontSize: 9 } },
            legend: { text: { fontSize: 11, fontWeight: 600 } },
          },
          tooltip: {
            container: {
              background: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#0f172a',
              borderRadius: 8,
              fontSize: 12,
            },
          },
        }}
        tooltip={({ cell }: any) => {
          const meta = rows.find((r: any) => r.id === cell.serieId);
          const muni = meta?.municipio || cell.serieId;
          const sec = meta?.seccion ? `Sección ${meta.seccion}` : '';
          return (
            <div
              style={{
                padding: '6px 10px',
                background: isDark ? '#1e293b' : '#fff',
                color: isDark ? '#f1f5f9' : '#0f172a',
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <strong>{muni}</strong>
              {sec && <div style={{ opacity: 0.7 }}>{sec}</div>}
              <div>
                Año {cell.data.x}: {cell.data.y == null ? 's/d' : `${cell.data.y}%`}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
