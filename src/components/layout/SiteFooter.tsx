export function SiteFooter() {
  const lastUpdate = '2026-05-03';
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer-grid">
        <div>
          <h4 className="site-footer-heading">Fuentes principales</h4>
          <ul>
            <li>INDEC · Censo Nacional 2022</li>
            <li>Ministerio de Seguridad · SNIC</li>
            <li>SIPA · EPH · BCRA</li>
            <li>Min. Desarrollo Agrario PBA</li>
          </ul>
        </div>
        <div>
          <h4 className="site-footer-heading">Plataforma</h4>
          <ul>
            <li>
              <a href="https://colossuslab.org" target="_blank" rel="noopener noreferrer">
                ColossusLab.org
              </a>
            </li>
            <li>
              <a href="https://openarg.org" target="_blank" rel="noopener noreferrer">
                OpenArg.org
              </a>
            </li>
            <li>
              <a
                href="https://github.com/colossus-lab/Dashboard-PBA-Inteligencia-Estrategica-Provincial"
                target="_blank"
                rel="noopener noreferrer"
              >
                Código fuente
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="site-footer-heading">Información</h4>
          <ul>
            <li>Última actualización: {lastUpdate}</li>
            <li>
              <a href="mailto:contacto@colossuslab.org">Contacto</a>
            </li>
            <li>Licencia: CC-BY 4.0</li>
          </ul>
        </div>
      </div>
      <div className="site-footer-bottom">
        © {year} ColossusLab · Datos abiertos de la Provincia de Buenos Aires
      </div>
    </footer>
  );
}
