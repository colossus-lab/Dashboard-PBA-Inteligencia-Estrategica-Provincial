import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SectionReveal } from '../components/ui/SectionReveal';
import type { ExplorerIndexEntry } from '../types/explorer';

const CATEGORY_MAP: Record<string, { icon: string; color: string; label: string }> = {
  'seguridad': { icon: '🛡️', color: '#6366f1', label: 'Seguridad' },
  'salud': { icon: '❤️', color: '#ef4444', label: 'Salud' },
  'economia': { icon: '📊', color: '#14b8a6', label: 'Economía' },
  'agricultura': { icon: '🌾', color: '#84cc16', label: 'Agricultura' },
  'industria': { icon: '🏭', color: '#a855f7', label: 'Industria' },
  'educacion': { icon: '🎓', color: '#3b82f6', label: 'Educación' },
};

function getCategoryFromId(id: string) {
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (id.startsWith(key)) return val;
  }
  return { icon: '📋', color: '#64748b', label: 'General' };
}

export function ExplorerIndex() {
  const [datasets, setDatasets] = useState<ExplorerIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/data/explorer/index.json')
      .then(r => r.json())
      .then(d => { setDatasets(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = datasets.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.source.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped: Record<string, ExplorerIndexEntry[]> = {};
  for (const d of filtered) {
    const cat = getCategoryFromId(d.id);
    if (!grouped[cat.label]) grouped[cat.label] = [];
    grouped[cat.label].push(d);
  }

  const totalRows = datasets.reduce((s, d) => s + d.rows, 0);
  const totalMunis = Math.max(...datasets.map(d => d.municipios), 0);

  return (
    <div className="explorer-page">
      <SectionReveal>
        <header className="explorer-header">
          <Link to="/" className="explorer-back">
            ← Volver al Dashboard
          </Link>
          <h1 className="explorer-title">
            <span className="explorer-title-icon">🔍</span>
            Data Explorer
          </h1>
          <p className="explorer-subtitle">
            Explorá {datasets.length} datasets con {totalRows.toLocaleString('es-AR')} registros
            {totalMunis > 0 && <> de hasta {totalMunis} municipios</>}
          </p>
          <div className="explorer-search-wrap">
            <input
              type="text"
              className="explorer-search"
              placeholder="Buscar datasets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="explorer-search-icon">⌕</span>
          </div>
        </header>
      </SectionReveal>

      {loading ? (
        <div className="explorer-loading">
          <div className="explorer-spinner" />
          <p>Cargando catálogo de datos...</p>
        </div>
      ) : (
        <div className="explorer-grid-wrap">
          {Object.entries(grouped).map(([catLabel, items]) => {
            const catInfo = Object.values(CATEGORY_MAP).find(c => c.label === catLabel) || { icon: '📋', color: '#64748b' };
            return (
              <SectionReveal key={catLabel}>
                <div className="explorer-category">
                  <h2 className="explorer-cat-title">
                    <span>{catInfo.icon}</span> {catLabel}
                    <span className="explorer-cat-count">{items.length}</span>
                  </h2>
                  <div className="explorer-cards">
                    {items.map((ds, i) => (
                      <DatasetCard key={ds.id} dataset={ds} index={i} />
                    ))}
                  </div>
                </div>
              </SectionReveal>
            );
          })}
          {filtered.length === 0 && (
            <div className="explorer-empty">
              <span>🔍</span>
              <p>No se encontraron datasets para "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DatasetCard({ dataset, index }: { dataset: ExplorerIndexEntry; index: number }) {
  const cat = getCategoryFromId(dataset.id);
  return (
    <Link
      to={`/explorar/${dataset.id}`}
      className="explorer-card"
      style={{ animationDelay: `${index * 60}ms`, '--card-accent': cat.color } as React.CSSProperties}
    >
      <div className="explorer-card-top">
        <span className="explorer-card-icon">{cat.icon}</span>
        <span className="explorer-card-source">{dataset.source}</span>
      </div>
      <h3 className="explorer-card-title">{dataset.title}</h3>
      <div className="explorer-card-stats">
        <div className="explorer-stat">
          <span className="explorer-stat-value">{dataset.rows.toLocaleString('es-AR')}</span>
          <span className="explorer-stat-label">registros</span>
        </div>
        <div className="explorer-stat">
          <span className="explorer-stat-value">{dataset.columns}</span>
          <span className="explorer-stat-label">columnas</span>
        </div>
        {dataset.municipios > 0 && (
          <div className="explorer-stat">
            <span className="explorer-stat-value">{dataset.municipios}</span>
            <span className="explorer-stat-label">municipios</span>
          </div>
        )}
      </div>
      <div className="explorer-card-arrow">Explorar →</div>
    </Link>
  );
}
