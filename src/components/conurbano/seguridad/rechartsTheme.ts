import { useStore } from '../../../store/useStore';

export function useRechartsTheme() {
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';
  return {
    isDark,
    grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    tick: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
    label: isDark ? '#f1f5f9' : '#0f172a',
    tooltipBg: isDark ? '#1a1f2e' : '#ffffff',
    tooltipBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    tooltipStyle: {
      background: isDark ? '#1a1f2e' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
      borderRadius: 6,
      fontSize: 12,
      color: isDark ? '#f1f5f9' : '#0f172a',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
  };
}
