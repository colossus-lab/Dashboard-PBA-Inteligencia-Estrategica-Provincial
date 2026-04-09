import { useEffect, useRef, useState } from 'react';

interface KPICounterProps {
  value: number;
  formatted: string;
  label: string;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
  suffix?: string;
}

export function KPICounter({ value, formatted, label, unit, status }: KPICounterProps) {
  const [displayValue, setDisplayValue] = useState('0');
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated) {
        setHasAnimated(true);
        animateCounter();
      }
    }, { threshold: 0.5 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  function animateCounter() {
    const duration = 1200;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      if (typeof value === 'number' && !isNaN(value)) {
        const current = value * eased;
        // Format based on the original formatted string
        if (formatted.includes('%')) {
          setDisplayValue(current.toFixed(1).replace('.', ',') + '%');
        } else if (formatted.includes(',') && !formatted.includes('.')) {
          setDisplayValue(current.toFixed(1).replace('.', ','));
        } else if (value >= 1000) {
          setDisplayValue(Math.round(current).toLocaleString('es-AR'));
        } else {
          setDisplayValue(current.toFixed(1).replace('.', ','));
        }
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplayValue(formatted);
      }
    }
    requestAnimationFrame(tick);
  }

  const statusClass = status === 'critical' ? 'pulse-critical' : '';

  return (
    <div
      ref={ref}
      className={`glass-card p-5 flex flex-col items-center text-center ${statusClass}`}
    >
      <span
        className="kpi-value"
        style={status === 'critical'
          ? { background: 'linear-gradient(135deg, #ef4444, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
          : status === 'good'
            ? { background: 'linear-gradient(135deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
            : undefined
        }
      >
        {displayValue}
      </span>
      <span className="kpi-label">{label}</span>
      {unit && <span className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{unit}</span>}
    </div>
  );
}
