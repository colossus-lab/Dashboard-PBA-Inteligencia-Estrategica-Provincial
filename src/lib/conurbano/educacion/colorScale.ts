import { scaleQuantile } from 'd3-scale';

/* OpenArg Editorial: ink-deep → cobalt → cobalt → vermilion → chrome */
const PALETTE = ['#1A2030', '#274C77', '#74ACDF', '#F6B40E', '#FFD04A'];

export function buildChoroplethScale(values: number[]) {
  const positive = values.filter((v) => Number.isFinite(v) && v > 0);
  if (positive.length === 0) {
    return {
      stops: [[0, '#1A2030'] as [number, string]],
      legend: [['sin datos', '#1A2030'] as [string, string]],
      max: 0,
    };
  }
  const N_BINS = 5;
  const scale = scaleQuantile<string>().domain(positive).range(PALETTE);
  const quantiles = [0, ...scale.quantiles()];
  const stops: [number, string][] = quantiles.map((q, i) => [
    q,
    PALETTE[Math.min(i, N_BINS - 1)],
  ]);
  const legend: [string, string][] = [];
  for (let i = 0; i < N_BINS; i++) {
    const lo = quantiles[i];
    const hi = i + 1 < quantiles.length ? quantiles[i + 1] : Math.max(...positive);
    legend.push([`${fmt(lo)} – ${fmt(hi)}`, PALETTE[i]]);
  }
  return { stops, legend, max: Math.max(...positive) };
}

function fmt(n: number) {
  if (n >= 1000) return n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  return n.toFixed(1);
}
