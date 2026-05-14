import { useStore } from '../../../store/useStore';

export function useRechartsTheme() {
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';
  return {
    isDark,
    grid: isDark ? 'rgba(116, 172, 223, 0.10)' : 'rgba(17, 20, 46, 0.08)',
    tick: isDark ? 'rgba(232, 236, 244, 0.55)' : 'rgba(17, 20, 46, 0.55)',
    label: isDark ? '#E8ECF4' : '#11142E',
    tooltipBg: isDark ? '#1A2030' : '#F2EDE2',
    tooltipBorder: isDark ? 'rgba(116, 172, 223, 0.20)' : 'rgba(17, 20, 46, 0.20)',
    tooltipStyle: {
      background: isDark ? '#1A2030' : '#F2EDE2',
      border: `1px solid ${isDark ? 'rgba(116, 172, 223, 0.20)' : 'rgba(17, 20, 46, 0.20)'}`,
      borderRadius: 6,
      fontSize: 12,
      color: isDark ? '#E8ECF4' : '#11142E',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    },
  };
}
