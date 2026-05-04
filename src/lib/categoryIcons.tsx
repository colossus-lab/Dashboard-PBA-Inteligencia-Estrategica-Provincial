import {
  LineChart, Building2, Shield, Wheat, Factory, GraduationCap,
  Heart, Users, Home, Briefcase, Baby, BookOpen, FileText, Search,
  AlertCircle, Map, Sparkles, Database, BarChart3, PieChart,
  Calendar, Copy, Check, Moon, Sun, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, ArrowRight, X, Menu,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

export type IconComp = ComponentType<{ size?: number; className?: string } & SVGProps<SVGSVGElement>>;

export const ICON_MAP: Record<string, IconComp> = {
  // Por categoría principal
  economia: LineChart,
  salud: Heart,
  seguridad: Shield,
  agricultura: Wheat,
  industria: Factory,
  educacion: GraduationCap,
  poblacion: Users,
  conurbano: Map,
  municipios: Building2,
  // Subcategorías poblacionales
  estructura: Users,
  habitat: Home,
  viviendas: Building2,
  fecundidad: Baby,
  'economia-poblacional': Briefcase,
  'educacion-censal': BookOpen,
  'salud-prevision': Heart,
  // Genéricos
  general: FileText,
  search: Search,
  error: AlertCircle,
};

export function getCategoryIcon(key: string): IconComp {
  const norm = key.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ICON_MAP[norm] ?? FileText;
}

export {
  Sparkles, Database, BarChart3, PieChart, Calendar, Copy, Check,
  Moon, Sun, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowRight, X, Menu, Search, AlertCircle, Map, FileText,
};
