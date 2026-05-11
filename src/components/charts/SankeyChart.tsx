import { ResponsiveSankey } from '@nivo/sankey';
import { useStore } from '../../store/useStore';
import type { ChartConfig } from '../../types/report';

interface Props {
  chart: ChartConfig;
  height?: number;
}

export function SankeyChart({ chart, height = 480 }: Props) {
  const theme = useStore(s => s.theme);
  const isDark = theme === 'dark';
  const data = chart.data || { nodes: [], links: [] };

  return (
    <div style={{ height }}>
      <ResponsiveSankey
        data={data}
        margin={{ top: 16, right: 160, bottom: 16, left: 160 }}
        align="justify"
        colors={{ scheme: isDark ? 'category10' : 'set2' }}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.35}
        nodeThickness={14}
        nodeSpacing={18}
        nodeBorderWidth={0}
        nodeBorderRadius={2}
        linkOpacity={0.45}
        linkHoverOthersOpacity={0.15}
        linkContract={3}
        enableLinkGradient={true}
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={8}
        labelTextColor={{ from: 'color', modifiers: [['darker', isDark ? 0.5 : 1.5]] }}
        animate={true}
        motionConfig="gentle"
        theme={{
          text: { fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11 },
          tooltip: {
            container: {
              background: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#0f172a',
              borderRadius: 8,
              fontSize: 12,
            },
          },
        }}
      />
    </div>
  );
}
