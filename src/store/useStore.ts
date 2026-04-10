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

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Scroll progress
  scrollProgress: number;
  setScrollProgress: (progress: number) => void;
}

export const useStore = create<StoreState>((set) => ({
  // Theme — read from localStorage or default to dark
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

  // Sidebar
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Scroll
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
}));
