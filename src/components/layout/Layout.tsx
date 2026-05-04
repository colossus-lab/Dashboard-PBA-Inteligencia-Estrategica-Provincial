import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AIChatFab } from '../ui/AIChatFab';
import { CommandPalette } from '../ui/CommandPalette';
import { PersistentSidebar, useIsReportRoute } from './PersistentSidebar';
import { useStore } from '../../store/useStore';
import { REPORTS, getPoblacionReports, getSectorialReports, getConurbanoReports } from '../../data/reportRegistry';
import { useScrollProgress } from '../../hooks/useIntersectionObserver';

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, sidebarOpen } = useStore();
  const progress = useScrollProgress();
  const isReportRoute = useIsReportRoute();
  const sidebarCollapsed = useStore(s => s.sidebarCollapsed);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Body data-route hook for CSS targeting (presentation mode etc.)
  const location = useLocation();
  useEffect(() => {
    const route = location.pathname.split('/')[1] || 'home';
    document.body.setAttribute('data-route', route);
  }, [location.pathname]);

  const mainPaddingClass = isReportRoute
    ? (sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72')
    : '';

  // Las rutas de informe coexisten con sidebar persistente (288px) + TOC
  // (≥1280px) + chart sticky en scrolly-split. Con max-w-6xl la columna de
  // texto queda <320px y el contenido se quiebra cada pocas palabras.
  // Subimos el cap solo en estas rutas.
  const mainMaxWidthClass = isReportRoute
    ? 'max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem]'
    : 'max-w-6xl';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Skip to content (a11y) */}
      <a href="#main-content" className="skip-to-content">Saltar al contenido</a>

      {/* Progress bar */}
      <div className="progress-bar" aria-hidden="true">
        <div className="progress-bar-fill" style={{ height: `${progress * 100}%` }} />
      </div>

      {/* TopBar */}
      <TopBar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <Sidebar />}

      {/* Persistent sidebar in report routes (≥1024px) */}
      {isReportRoute && <PersistentSidebar />}

      {/* Main content */}
      <main
        id="main-content"
        role="main"
        className={`${mainMaxWidthClass} mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 ${mainPaddingClass}`}
      >
        {children}
      </main>

      {/* Floating AI Assistant */}
      <AIChatFab />

      {/* Command palette (Cmd+K) */}
      <CommandPalette />
    </div>
  );
}

function TopBar() {
  const location = useLocation();
  const { toggleSidebar } = useStore();
  const isHome = location.pathname === '/';

  return (
    <header
      className="topbar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-glass)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            aria-label="Abrir menú de navegación"
            className="p-2 rounded-lg hover:opacity-80 transition-opacity lg:hidden"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <Link to="/" className="flex items-center gap-2 no-underline shrink-0" aria-label="Inicio">
            <h1 className="text-lg font-bold" style={{
              fontFamily: 'var(--font-heading)',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple, #8b5cf6))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.02em',
            }}>
              Dashboard PBA
            </h1>
          </Link>

          {!isHome && <Breadcrumb />}
        </div>

        <div className="flex items-center gap-2">
          <CommandPaletteTrigger />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function CommandPaletteTrigger() {
  const setOpen = useStore(s => s.setCommandOpen);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <button
      onClick={() => setOpen(true)}
      className="cmdk-trigger"
      aria-label="Buscar (Ctrl+K)"
      title="Buscar (Ctrl+K)"
    >
      <Search size={14} aria-hidden="true" />
      <span className="cmdk-trigger-label">Buscar</span>
      <kbd className="cmdk-trigger-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
    </button>
  );
}

function Breadcrumb() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  const report = REPORTS.find(r => r.slug === parts.join('/'));

  return (
    <nav className="breadcrumb" aria-label="Ruta de navegación" style={{ color: 'var(--text-tertiary)' }}>
      <span className="breadcrumb-sep" aria-hidden="true">›</span>
      {report?.category && (
        <>
          <span className="breadcrumb-cat">{report.category}</span>
          {report.subcategory && (
            <>
              <span className="breadcrumb-sep" aria-hidden="true">›</span>
              <span className="breadcrumb-sub" style={{ color: 'var(--text-accent)' }}>{report.subcategory}</span>
            </>
          )}
        </>
      )}
    </nav>
  );
}

function Sidebar() {
  const { setSidebarOpen } = useStore();
  const location = useLocation();
  const poblacion = getPoblacionReports();
  const sectoriales = getSectorialReports();
  const conurbano = getConurbanoReports();

  const sidebarLinkStyle = { color: 'var(--text-secondary)' };
  const sidebarLinkClass = 'sidebar-link';

  function renderLink(r: { id: string; slug: string; shortTitle: string }) {
    const isActive = location.pathname === `/${r.slug}`;
    return (
      <Link
        key={r.id}
        to={`/${r.slug}`}
        onClick={() => setSidebarOpen(false)}
        className={`${sidebarLinkClass}${isActive ? ' is-active' : ''}`}
        style={sidebarLinkStyle}
        aria-current={isActive ? 'page' : undefined}
      >
        {r.shortTitle}
      </Link>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 998,
          background: 'rgba(0,0,0,0.5)',
        }}
      />
      {/* Panel */}
      <aside
        className="slide-in-left"
        aria-label="Navegación"
        style={{
          position: 'fixed',
          top: '4rem',
          left: 0,
          bottom: 0,
          width: '18rem',
          zIndex: 999,
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-glass)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <nav className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Análisis Especial · Conurbano
          </h3>
          {conurbano.map(renderLink)}

          <hr className="my-4" style={{ borderColor: 'var(--border-glass)' }} />

          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Población
          </h3>
          {poblacion.map(renderLink)}

          <hr className="my-4" style={{ borderColor: 'var(--border-glass)' }} />

          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Sectorial
          </h3>
          {sectoriales.map(renderLink)}
        </nav>
      </aside>
    </>
  );
}
