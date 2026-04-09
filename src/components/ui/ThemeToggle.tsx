import { useStore } from '../../store/useStore';

export function ThemeToggle() {
  const { theme, toggleTheme } = useStore();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:ring-offset-2"
      style={{
        background: theme === 'dark'
          ? 'linear-gradient(135deg, #1e293b, #334155)'
          : 'linear-gradient(135deg, #bae6fd, #7dd3fc)',
      }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`${theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}`}
    >
      <span
        className="absolute top-0.5 w-6 h-6 rounded-full shadow-md transition-all duration-300 flex items-center justify-center text-xs"
        style={{
          left: theme === 'dark' ? '2px' : '30px',
          background: theme === 'dark' ? '#0a0f1c' : '#fbbf24',
        }}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
