import { useEffect, useRef, useState, useMemo } from 'react';

export function useIntersectionObserver(
  threshold: number = 0.2
) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
      if (entry.isIntersecting) setHasBeenVisible(true);
    }, { threshold: Math.min(threshold, 0.01), rootMargin: '200px 0px' });

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible, hasBeenVisible };
}

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
}
