import { Link, useLocation } from 'react-router-dom';

export function AIChatFab() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/chat')) return null;

  return (
    <Link to="/chat" aria-label="Abrir Asistente IA" className="ai-fab">
      <span className="ai-fab-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M9 10h.01M12 10h.01M15 10h.01" />
        </svg>
      </span>
      <span className="ai-fab-label">Asistente IA</span>
    </Link>
  );
}
