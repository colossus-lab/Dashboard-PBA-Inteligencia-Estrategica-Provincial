import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

export function AIChatFab() {
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState(false);
  if (pathname.startsWith('/chat')) return null;
  if (pathname.startsWith('/presentacion')) return null;

  return (
    <Link
      to="/chat"
      aria-label="Abrir Asistente IA"
      className={`ai-fab${hovered ? ' ai-fab-expanded' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <span className="ai-fab-icon" aria-hidden="true">
        <Sparkles size={20} />
      </span>
      <span className="ai-fab-label">Asistente IA</span>
    </Link>
  );
}
