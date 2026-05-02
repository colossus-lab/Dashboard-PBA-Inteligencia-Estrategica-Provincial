import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AnimatedCounter from './AnimatedCounter';
import Pictogram, { type Breakdown } from './Pictogram';
import SignedLineChart, { type Point } from './SignedLineChart';
import TypingTitle from './TypingTitle';

export type SceneSerie = {
  kind: 'serie';
  titulo: string;
  subtitulo?: string;
  caption?: string;
  data: Point[];
  format?: (n: number) => string;
};

export type SceneToggle = {
  nombre: string;
  id: string;
  valor: number;
  sublabel?: string;
  breakdown?: Breakdown;
};

export type ScenePictograma = {
  kind: 'pictograma';
  titulo: string;
  subtitulo?: string;
  caption?: string;
  toggles: SceneToggle[];
};

export type Scene = SceneSerie | ScenePictograma;

type Props = {
  scenes: Scene[];
  onFinishExplore?: () => void;
};

export default function IntroCarousel({ scenes, onFinishExplore }: Props) {
  const [active, setActive] = useState(0);
  const [titleDone, setTitleDone] = useState(false);
  const [visualDone, setVisualDone] = useState(false);
  const scene = scenes[active];

  useEffect(() => {
    setTitleDone(false);
    setVisualDone(false);
  }, [active]);

  const prev = useCallback(() => setActive((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setActive((i) => Math.min(scenes.length - 1, i + 1)),
    [scenes.length],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onFinishExplore?.();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [next, prev, onFinishExplore]);

  const canAdvance = titleDone && visualDone;
  const isLast = active === scenes.length - 1;

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Bienvenida · Inseguridad en el Conurbano"
      className="conu-intro-carousel"
    >
      <button onClick={onFinishExplore} className="conu-intro-skip">
        Saltar intro ↓
      </button>

      <div className="conu-intro-counter">
        {String(active + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}
      </div>

      <div className="conu-intro-stage">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, position: 'absolute' }}
            transition={{ duration: 0.25 }}
            className="conu-intro-content"
          >
            {scene.subtitulo && (
              <div className="conu-eyebrow" style={{ textAlign: 'center' }}>
                {scene.subtitulo}
              </div>
            )}

            <h2 className="conu-intro-title">
              <TypingTitle
                text={scene.titulo}
                resetKey={active}
                delayPerChar={18}
                startDelay={80}
                onDone={() => setTitleDone(true)}
              />
            </h2>

            <div style={{ marginTop: 4, width: '100%' }}>
              {scene.kind === 'serie' ? (
                <SerieScene scene={scene} onDone={() => setVisualDone(true)} />
              ) : (
                <PictogramaScene
                  scene={scene}
                  onDone={() => setVisualDone(true)}
                  titleDone={titleDone}
                />
              )}
            </div>

            {scene.caption && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: visualDone ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--text-tertiary)',
                }}
              >
                {scene.caption}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {active > 0 && (
        <button
          onClick={prev}
          aria-label="Anterior"
          className="conu-intro-arrow"
          style={{ left: 16 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <AnimatePresence>
        {canAdvance && !isLast && (
          <motion.button
            key="right"
            onClick={next}
            aria-label="Siguiente"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.25 }}
            className="conu-intro-arrow"
            style={{ right: 16, paddingRight: 12, paddingLeft: 12 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        )}
        {canAdvance && isLast && onFinishExplore && (
          <motion.button
            key="explore"
            onClick={onFinishExplore}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="conu-intro-cta"
          >
            Explorar a fondo ↓
          </motion.button>
        )}
      </AnimatePresence>

      <div className="conu-intro-dots">
        {scenes.map((_, i) => (
          <button
            key={i}
            aria-label={`Ir a escena ${i + 1}`}
            onClick={() => setActive(i)}
            className="conu-intro-dot"
            data-active={i === active ? 'true' : 'false'}
          />
        ))}
      </div>
    </section>
  );
}

function SerieScene({ scene, onDone }: { scene: SceneSerie; onDone: () => void }) {
  const ultimo = scene.data[scene.data.length - 1]?.valor ?? 0;
  const primero = scene.data[0]?.valor ?? 0;
  const delta = primero > 0 ? ((ultimo - primero) / primero) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: '100%' }}>
        <SignedLineChart
          data={scene.data}
          height={260}
          startDelay={100}
          totalDuration={500}
          onDone={onDone}
          format={scene.format}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="conu-eyebrow">{scene.data[scene.data.length - 1]?.anio ?? ''}</div>
          <div
            style={{
              marginTop: 2,
              fontSize: 24,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            <AnimatedCounter
              value={ultimo}
              startDelay={100 + 500}
              format={scene.format ? (n) => scene.format!(Math.round(n)) : undefined}
            />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="conu-eyebrow">
            {scene.data[0]?.anio ?? ''} → {scene.data[scene.data.length - 1]?.anio ?? ''}
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 16,
              fontWeight: 600,
              color: delta >= 0 ? '#ef4444' : '#10b981',
            }}
          >
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function PictogramaScene({
  scene,
  onDone,
  titleDone,
}: {
  scene: ScenePictograma;
  onDone: () => void;
  titleDone: boolean;
}) {
  const [sel, setSel] = useState(scene.toggles[0]?.id ?? '');
  const current = useMemo(
    () => scene.toggles.find((t) => t.id === sel) ?? scene.toggles[0],
    [scene.toggles, sel],
  );

  useEffect(() => {
    if (!titleDone) return;
    const t = setTimeout(onDone, 250);
    return () => clearTimeout(t);
  }, [titleDone, onDone]);

  if (!current) return null;

  const hasGender = current.breakdown?.coverage === true;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {scene.toggles.map((t) => (
          <button
            key={t.id}
            onClick={() => setSel(t.id)}
            className="conu-pill"
            data-active={t.id === sel ? 'true' : 'false'}
            style={{ borderRadius: 999, padding: '6px 14px' }}
          >
            {t.nombre}
          </button>
        ))}
      </div>

      {hasGender ? (
        <>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 38,
                fontWeight: 600,
                lineHeight: 1,
                color: 'var(--text-primary)',
              }}
            >
              <AnimatedCounter value={current.valor} duration={900} />
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
              {current.nombre} — último año
            </div>
          </div>
          <Pictogram
            count={current.valor}
            label={current.nombre}
            sublabel={current.sublabel}
            breakdown={current.breakdown}
            targetFigures={100}
            maxFigures={140}
          />
        </>
      ) : (
        <div
          style={{
            display: 'flex',
            minHeight: 220,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '24px 0',
          }}
        >
          <div
            style={{
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1,
              color: 'var(--text-primary)',
            }}
          >
            <AnimatedCounter value={current.valor} duration={1400} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {current.nombre} —{' '}
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>último año</span>
          </div>
          {current.sublabel && (
            <div
              style={{
                maxWidth: 480,
                textAlign: 'center',
                fontSize: 12,
                fontStyle: 'italic',
                color: 'var(--text-tertiary)',
              }}
            >
              {current.sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
