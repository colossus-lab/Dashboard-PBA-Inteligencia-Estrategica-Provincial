// ═══════════════════════════════════════════════════════════════
// Types for the Data Explorer
// ═══════════════════════════════════════════════════════════════

export interface ExplorerColumn {
  name: string;
  type: 'number' | 'string';
  label: string;
}

export interface ExplorerDataset {
  id: string;
  title: string;
  source: string;
  columns: ExplorerColumn[];
  rows: Record<string, unknown>[];
  municipios: string[];
  totalRows: number;
}

export interface ExplorerIndexEntry {
  id: string;
  title: string;
  source: string;
  rows: number;
  columns: number;
  municipios: number;
  file: string;
}
