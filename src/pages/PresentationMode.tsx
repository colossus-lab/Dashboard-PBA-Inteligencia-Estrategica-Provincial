import { useEffect, useState } from 'react';
import { REPORTS } from '../data/reportRegistry';

interface Slide {
  eyebrow: string;
  value: string;
  label: string;
  description?: string;
  color?: string;
}

const HERO_SLIDES: Slide[] = [
  { eyebrow: 'Provincia de Buenos Aires', value: '17,5M', label: 'Habitantes', description: 'Censo Nacional 2022 · INDEC', color: '#00d4ff' },
  { eyebrow: 'Territorio', value: '134', label: 'Municipios', description: 'Provincia de Buenos Aires', color: '#8b5cf6' },
  { eyebrow: 'Datos abiertos', value: '80K+', label: 'Registros', description: 'En 13 datasets navegables', color: '#10b981' },
  { eyebrow: 'Inteligencia estratégica', value: '16', label: 'Informes ejecutivos', description: 'Análisis basado en datos oficiales', color: '#f59e0b' },
];

const REPORT_SLIDES: Slide[] = REPORTS.slice(0, 6).map(r => ({
  eyebrow: `${String(r.order).padStart(2, '0')} · ${r.category}`,
  value: r.shortTitle,
  label: r.title,
  color: r.color,
}));

const SLIDES: Slide[] = [...HERO_SLIDES, ...REPORT_SLIDES];
const ROTATION_MS = 7000;

export default function PresentationMode() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  // Allow manual navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % SLIDES.length);
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + SLIDES.length) % SLIDES.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="presentation-mode" data-color={slide.color}>
      <div className="presentation-slide" key={index}>
        <div className="presentation-eyebrow" style={{ color: slide.color }}>
          {slide.eyebrow}
        </div>
        <div className="presentation-value" style={{ color: slide.color }}>
          {slide.value}
        </div>
        <div className="presentation-label">{slide.label}</div>
        {slide.description && (
          <div className="presentation-desc">{slide.description}</div>
        )}
      </div>
      <div className="presentation-progress" aria-hidden="true">
        {SLIDES.map((_, i) => (
          <span key={i} className={`presentation-dot${i === index ? ' is-active' : ''}`} />
        ))}
      </div>
      <div className="presentation-watermark">Dashboard PBA · pba.openarg.org</div>
    </div>
  );
}
