import { Moon, Sun } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function ThemeToggle() {
  const { theme, toggleTheme } = useStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:ring-offset-2"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #1e293b, #334155)'
          : 'linear-gradient(135deg, #bae6fd, #7dd3fc)',
      }}
      aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
      title={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
    >
      <span
        className="absolute top-0.5 w-6 h-6 rounded-full shadow-md transition-all duration-300 flex items-center justify-center"
        style={{
          left: isDark ? '2px' : '30px',
          background: isDark ? '#0a0f1c' : '#fbbf24',
          color: isDark ? '#cbd5e1' : '#0a0f1c',
        }}
        aria-hidden="true"
      >
        {isDark ? <Moon size={13} /> : <Sun size={13} />}
      </span>
    </button>
  );
}
