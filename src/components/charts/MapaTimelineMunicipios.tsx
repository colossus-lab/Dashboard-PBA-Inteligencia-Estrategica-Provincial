import { useState, useMemo } from 'react';
import { MapaPBA } from './MapaPBA';
import type { ChartConfig } from '../../types/report';

interface Props {
  chart: ChartConfig;
  height?: number;
}

/**
 * Recibe data como un dict {año: [mapData items]}. Renderiza MapaPBA con el
 * snapshot del año seleccionado y un slider/botonera para recorrer la serie.
 */
export function MapaTimelineMunicipios({ chart, height = 520 }: Props) {
  const data: Record<string, any[]> = chart.data || {};
  const years = useMemo(
    () => Object.keys(data).map(y => parseInt(y, 10)).sort((a, b) => a - b),
    [data]
  );
  const lastYear = years[years.length - 1] || 0;
  const [year, setYear] = useState<number>(lastYear);

  const snapshot = data[String(year)] || [];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Elección:
        </span>
        {years.map(y => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid ${year === y ? '#9333ea' : 'var(--border-glass)'}`,
              background: year === y ? 'rgba(147, 51, 234, 0.15)' : 'transparent',
              color: year === y ? '#9333ea' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: year === y ? 600 : 400,
              transition: 'all 0.15s ease',
            }}
          >
            {y}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
          {snapshot.length} municipios · ganador a gobernador
        </span>
      </div>
      <MapaPBA mapData={snapshot} height={height} />
    </div>
  );
}
