// ═══════════════════════════════════════════════════════════════
// ReportData — Schema for data.json files
// ═══════════════════════════════════════════════════════════════

export interface ReportMeta {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  source: string;
  date: string;
}

export interface KPI {
  id: string;
  label: string;
  value: number;
  formatted: string;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
  comparison?: string;
}

export type ChartType = 'bar' | 'line' | 'pie' | 'pyramid' | 'scatter' | 'radar' | 'treemap' | 'heatmap' | 'map';

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  sectionId: string;
  data: any[];
  config?: {
    xAxis?: string;
    yAxis?: string;
    colorScheme?: string;
    stacked?: boolean;
    grouped?: boolean;
    layout?: 'horizontal' | 'vertical';
  };
}

export interface RankingConfig {
  id: string;
  title: string;
  sectionId: string;
  items: Array<{
    name: string;
    value: number;
    municipioId?: string;
    meta?: string;
  }>;
  order: 'asc' | 'desc';
}

export interface MapDataItem {
  municipioId: string;
  municipioNombre: string;
  value: number;
  label: string;
  touristic?: boolean;
}

export interface ReportData {
  meta: ReportMeta;
  kpis: KPI[];
  charts: ChartConfig[];
  rankings: RankingConfig[];
  mapData: MapDataItem[];
}

// ═══════════════════════════════════════════════════════════════
// Report Registry Entry
// ═══════════════════════════════════════════════════════════════

export interface ReportEntry {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  category: string;
  subcategory?: string;
  icon?: string;
  color: string;
  mdPath: string;      // path to .md in public/reports/
  dataPath: string;    // path to data.json in public/data/
  order: number;
}
