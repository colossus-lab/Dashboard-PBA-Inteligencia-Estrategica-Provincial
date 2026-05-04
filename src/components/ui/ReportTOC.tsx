import { useStore } from '../../store/useStore';

interface Section {
  id: string;
  heading: string;
}

export function ReportTOC({ sections }: { sections: Section[] }) {
  const activeSection = useStore(s => s.activeSection);
  const visible = sections.filter(s => s.id);
  if (visible.length <= 2) return null;

  return (
    <nav className="report-toc" aria-label="Tabla de contenidos">
      <h3 className="report-toc-title">En este informe</h3>
      <ol className="report-toc-list">
        {visible.map((s, i) => {
          const isActive = activeSection === s.id;
          return (
            <li key={s.id} className={`report-toc-item${isActive ? ' is-active' : ''}`}>
              <a href={`#${s.id}`} aria-current={isActive ? 'true' : undefined}>
                <span className="report-toc-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="report-toc-label">{s.heading}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
