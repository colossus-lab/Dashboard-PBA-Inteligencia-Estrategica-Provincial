import { Command } from 'cmdk';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Database, Sparkles, FileText, Map as MapIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { REPORTS } from '../../data/reportRegistry';

export function CommandPalette() {
  const open = useStore(s => s.commandOpen);
  const setOpen = useStore(s => s.setCommandOpen);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        // Allow toggling even from inputs
        e.preventDefault();
        setOpen(!open);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        return;
      }
      // Prevent unintended typing-triggers in editable fields
      void inEditable;
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <>
      {open && (
        <div
          className="cmdk-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Buscar en el dashboard"
        className="cmdk-dialog"
      >
        <div className="cmdk-input-wrapper">
          <Command.Input
            placeholder="Buscar informes, datasets, secciones..."
            className="cmdk-input"
            autoFocus
          />
        </div>
        <Command.List className="cmdk-list">
          <Command.Empty className="cmdk-empty">Sin resultados.</Command.Empty>

          <Command.Group heading="Ir a" className="cmdk-group">
            <Command.Item value="inicio home dashboard" onSelect={() => go('/')} className="cmdk-item">
              <Home size={16} aria-hidden="true" />
              <span>Inicio</span>
            </Command.Item>
            <Command.Item value="explorar datos catalogo dataset" onSelect={() => go('/explorar')} className="cmdk-item">
              <Database size={16} aria-hidden="true" />
              <span>Catálogo de Datos</span>
            </Command.Item>
            <Command.Item value="chat asistente ia ai" onSelect={() => go('/chat')} className="cmdk-item">
              <Sparkles size={16} aria-hidden="true" />
              <span>Asistente IA</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Informes" className="cmdk-group">
            {REPORTS.map(r => (
              <Command.Item
                key={r.id}
                value={`${r.shortTitle} ${r.title} ${r.category} ${r.subcategory ?? ''}`}
                onSelect={() => go(`/${r.slug}`)}
                className="cmdk-item"
              >
                {r.category === 'Conurbano' ? (
                  <MapIcon size={16} aria-hidden="true" />
                ) : (
                  <FileText size={16} aria-hidden="true" />
                )}
                <span className="cmdk-item-label">{r.shortTitle}</span>
                <span className="cmdk-meta">{r.category}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
        <div className="cmdk-footer">
          <kbd>↑↓</kbd> navegar · <kbd>↵</kbd> abrir · <kbd>esc</kbd> cerrar
        </div>
      </Command.Dialog>
    </>
  );
}
