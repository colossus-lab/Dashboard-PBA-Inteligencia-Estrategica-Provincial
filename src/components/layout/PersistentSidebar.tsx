import { Link, useLocation } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  REPORTS,
  getPoblacionReports,
  getSectorialReports,
  getConurbanoReports,
} from '../../data/reportRegistry';

export function useIsReportRoute() {
  const location = useLocation();
  return REPORTS.some(r => location.pathname === `/${r.slug}`);
}

export function PersistentSidebar() {
  const collapsed = useStore(s => s.sidebarCollapsed);
  const toggle = useStore(s => s.toggleSidebarCollapsed);
  const location = useLocation();
  const conurbano = getConurbanoReports();
  const poblacion = getPoblacionReports();
  const sectoriales = getSectorialReports();

  const isActive = (slug: string) => location.pathname === `/${slug}`;

  function renderItem(r: { id: string; slug: string; shortTitle: string; order: number }) {
    const active = isActive(r.slug);
    return (
      <Link
        key={r.id}
        to={`/${r.slug}`}
        className={`psidebar-link${active ? ' is-active' : ''}`}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? r.shortTitle : undefined}
      >
        <span className="psidebar-num">{String(r.order).padStart(2, '0')}</span>
        {!collapsed && <span className="psidebar-label">{r.shortTitle}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={`psidebar${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Navegación de informes"
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <nav className="psidebar-nav">
        {!collapsed && <h3 className="psidebar-heading">Conurbano</h3>}
        {conurbano.map(renderItem)}

        <hr className="psidebar-divider" />
        {!collapsed && <h3 className="psidebar-heading">Población</h3>}
        {poblacion.map(renderItem)}

        <hr className="psidebar-divider" />
        {!collapsed && <h3 className="psidebar-heading">Sectorial</h3>}
        {sectoriales.map(renderItem)}
      </nav>

      <button
        type="button"
        onClick={toggle}
        className="psidebar-toggle"
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>
    </aside>
  );
}
