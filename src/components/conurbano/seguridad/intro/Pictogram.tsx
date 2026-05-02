import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

function niceRatio(count: number, target = 150): number {
  if (count <= 0) return 1;
  const raw = Math.max(1, count / target);
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const base = raw / exp;
  let m = 1;
  if (base <= 1.5) m = 1;
  else if (base <= 3) m = 2;
  else if (base <= 7) m = 5;
  else m = 10;
  return m * exp;
}

export type Breakdown = {
  masc: number;
  fem: number;
  sd: number;
  coverage: boolean;
};

type Props = {
  count: number;
  label?: string;
  sublabel?: string;
  targetFigures?: number;
  maxFigures?: number;
  columns?: number;
  breakdown?: Breakdown;
};

const COLOR_MASC = '#3b82f6';
const COLOR_FEM = '#ec4899';
const COLOR_SD = '#94a3b8';
const COLOR_DEFAULT = 'var(--text-primary)';

function repartoFiguras(
  total: number,
  parts: { key: 'm' | 'f' | 'sd'; value: number }[],
) {
  const sum = parts.reduce((a, p) => a + p.value, 0);
  if (sum <= 0) return parts.map((p) => ({ ...p, n: 0 }));
  const raw = parts.map((p) => ({
    ...p,
    ideal: (p.value / sum) * total,
    n: Math.floor((p.value / sum) * total),
  }));
  const assigned = raw.reduce((a, p) => a + p.n, 0);
  const leftover = total - assigned;
  raw.sort((a, b) => b.ideal - b.n - (a.ideal - a.n));
  for (let i = 0; i < leftover; i++) raw[i].n += 1;
  return raw;
}

export default function Pictogram({
  count,
  label,
  sublabel,
  targetFigures = 150,
  maxFigures = 220,
  columns = 18,
  breakdown,
}: Props) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const { perFigure, nFigures, coloredOrder, pct } = useMemo(() => {
    const per = niceRatio(count, targetFigures);
    const n = Math.min(maxFigures, Math.max(1, Math.round(count / per)));

    if (!breakdown || !breakdown.coverage) {
      return {
        perFigure: per,
        nFigures: n,
        coloredOrder: Array(n).fill(COLOR_DEFAULT),
        pct: null,
      };
    }

    const parts = [
      { key: 'm' as const, value: breakdown.masc },
      { key: 'f' as const, value: breakdown.fem },
      { key: 'sd' as const, value: breakdown.sd },
    ];
    const reparto = repartoFiguras(n, parts);
    const order: string[] = [];
    const rm = reparto.find((x) => x.key === 'm')?.n ?? 0;
    const rf = reparto.find((x) => x.key === 'f')?.n ?? 0;
    const rsd = reparto.find((x) => x.key === 'sd')?.n ?? 0;
    for (let i = 0; i < rm; i++) order.push(COLOR_MASC);
    for (let i = 0; i < rf; i++) order.push(COLOR_FEM);
    for (let i = 0; i < rsd; i++) order.push(COLOR_SD);

    const sum = breakdown.masc + breakdown.fem + breakdown.sd || 1;
    return {
      perFigure: per,
      nFigures: n,
      coloredOrder: order,
      pct: {
        masc: (breakdown.masc / sum) * 100,
        fem: (breakdown.fem / sum) * 100,
        sd: (breakdown.sd / sum) * 100,
      },
    };
  }, [count, targetFigures, maxFigures, breakdown]);

  const figs = Array.from({ length: nFigures }, (_, i) => i);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg width="0" height="0" aria-hidden>
        <defs>
          <symbol id="fig-u" viewBox="0 0 22 36">
            <circle cx="11" cy="5.6" r="3.6" fill="currentColor" />
            <path
              d="M11 10.5 c-3.5 0 -6 1.8 -6.8 5.2 l-1.2 5.5 c-0.15 0.7 0.35 1.3 1.05 1.3 h1.65 l-0.35 10.5 c-0.03 0.85 0.6 1.55 1.45 1.55 h2.4 c0.8 0 1.45 -0.65 1.45 -1.45 v-7.9 h1.6 v7.9 c0 0.8 0.65 1.45 1.45 1.45 h2.4 c0.85 0 1.48 -0.7 1.45 -1.55 l-0.35 -10.5 h1.65 c0.7 0 1.2 -0.6 1.05 -1.3 l-1.2 -5.5 c-0.8 -3.4 -3.3 -5.2 -6.8 -5.2 z"
              fill="currentColor"
            />
          </symbol>
        </defs>
      </svg>

      <div
        style={{
          display: 'grid',
          width: '100%',
          maxWidth: 640,
          columnGap: 4,
          rowGap: 5,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
        aria-label={`Pictograma: ${count.toLocaleString('es-AR')} hechos`}
      >
        <AnimatePresence initial={!reduced}>
          {figs.map((i) => (
            <motion.svg
              key={i}
              layout
              initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                duration: reduced ? 0 : 0.25,
                delay: reduced ? 0 : Math.min(i * 0.003, 0.7),
              }}
              viewBox="0 0 22 36"
              style={{
                height: 26,
                width: '100%',
                color: coloredOrder[i] ?? COLOR_DEFAULT,
              }}
            >
              <use href="#fig-u" />
            </motion.svg>
          ))}
        </AnimatePresence>
      </div>

      {pct && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            fontSize: 11.5,
            color: 'var(--text-secondary)',
          }}
        >
          <LegendItem color={COLOR_MASC} label="Víctimas masculinas" pct={pct.masc} />
          <LegendItem color={COLOR_FEM} label="Víctimas femeninas" pct={pct.fem} />
          {pct.sd >= 0.5 && <LegendItem color={COLOR_SD} label="Sin datos" pct={pct.sd} />}
        </div>
      )}

      {breakdown && !breakdown.coverage && (
        <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
          El SNIC no registra género de víctima en esta categoría.
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        {label && (
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            {label}
          </div>
        )}
        <div style={{ marginTop: 2, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
          1 figura ={' '}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {perFigure.toLocaleString('es-AR')}
          </span>{' '}
          hechos ·{' '}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {count.toLocaleString('es-AR')}
          </span>{' '}
          en total
        </div>
        {sublabel && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11.5,
              fontStyle: 'italic',
              color: 'var(--text-tertiary)',
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          display: 'inline-block',
          height: 10,
          width: 10,
          borderRadius: 999,
          background: color,
        }}
      />
      <span>
        {label}{' '}
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pct.toFixed(1)}%</span>
      </span>
    </span>
  );
}
