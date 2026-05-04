import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ReportEntry, ReportData } from '../../types/report';

interface Props {
  report: ReportEntry;
  data: ReportData;
}

export function CitationBox({ report, data }: Props) {
  const [copied, setCopied] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const cite =
    `Laboratorio Colossus (${year}). ${report.title}. ` +
    `Dashboard PBA · ColossusLab. Fuente original: ${data.meta.source}. ` +
    `Recuperado el ${today} de https://pba.openarg.org/${report.slug}`;

  function copyCite() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(cite).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <details className="citation-box">
      <summary className="citation-summary">Citar este informe</summary>
      <blockquote className="citation-text">{cite}</blockquote>
      <button onClick={copyCite} className="citation-copy" type="button">
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        <span>{copied ? 'Copiado al portapapeles' : 'Copiar cita'}</span>
      </button>
    </details>
  );
}
