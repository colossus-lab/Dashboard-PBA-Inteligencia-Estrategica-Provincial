import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface StoreState {
  // Theme
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;

  // Navigation
  activeSection: string;
  setActiveSection: (section: string) => void;

  // Mobile sidebar (overlay)
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Persistent sidebar (desktop, collapsed/expanded)
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;

  // Command palette (Cmd+K)
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;

  // Scroll progress
  scrollProgress: number;
  setScrollProgress: (progress: number) => void;
}

const readBool = (key: string, fallback: boolean): boolean => {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === 'true';
  } catch { return fallback; }
};

const writeBool = (key: string, value: boolean) => {
  try { localStorage.setItem(key, String(value)); } catch {}
};

export const useStore = create<StoreState>((set) => ({
  // Theme
  theme: (() => {
    try { return (localStorage.getItem('pba-theme') as Theme) || 'dark'; }
    catch { return 'dark'; }
  })(),
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('pba-theme', next); } catch {}
    return { theme: next };
  }),
  setTheme: (theme) => {
    try { localStorage.setItem('pba-theme', theme); } catch {}
    set({ theme });
  },

  // Navigation
  activeSection: '',
  setActiveSection: (section) => set({ activeSection: section }),

  // Mobile sidebar overlay
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Persistent sidebar
  sidebarCollapsed: readBool('pba-sidebar-collapsed', false),
  toggleSidebarCollapsed: () => set((state) => {
    const next = !state.sidebarCollapsed;
    writeBool('pba-sidebar-collapsed', next);
    return { sidebarCollapsed: next };
  }),

  // Command palette
  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),

  // Scroll
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
}));
