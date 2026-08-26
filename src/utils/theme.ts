export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'forwardone_theme_mode';

export function getThemeMode(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light' || saved === 'system') {
    return saved as ThemeMode;
  }
  return 'light'; // Default theme
}

export function applyTheme(mode: ThemeMode): void {
  localStorage.setItem(THEME_KEY, mode);
  const root = document.documentElement;
  
  let isDark = false;
  if (mode === 'dark') {
    isDark = true;
  } else if (mode === 'light') {
    isDark = false;
  } else if (mode === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function initTheme(): void {
  const mode = getThemeMode();
  applyTheme(mode);
}
