import React, { useEffect, useCallback } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

interface SectionRevealProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  onVisible?: () => void;
}

export function SectionReveal({ children, id, className = '', onVisible }: SectionRevealProps) {
  const { ref, hasBeenVisible, isVisible } = useIntersectionObserver(0.15);

  // Use a ref to avoid re-triggering on re-renders
  const onVisibleRef = React.useRef(onVisible);
  onVisibleRef.current = onVisible;
  const hasFiredRef = React.useRef(false);

  useEffect(() => {
    if (isVisible && onVisibleRef.current && !hasFiredRef.current) {
      hasFiredRef.current = true;
      onVisibleRef.current();
    }
    if (!isVisible) {
      hasFiredRef.current = false;
    }
  }, [isVisible]);

  return (
    <div
      ref={ref}
      id={id}
      className={`section-reveal ${hasBeenVisible ? 'visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
