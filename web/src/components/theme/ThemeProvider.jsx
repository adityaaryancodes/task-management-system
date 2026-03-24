import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const THEME_KEY = 'hw_theme';
const ThemeContext = createContext(null);

function normalizeTheme(theme) {
  return theme === 'dark' ? 'dark' : 'light';
}

function readStoredTheme() {
  if (typeof window === 'undefined') return 'light';

  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return normalizeTheme(theme);

  const nextTheme = normalizeTheme(theme);
  const targets = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean);

  targets.forEach((target) => {
    target.classList.remove('light', 'dark');
    target.classList.add(nextTheme);
    target.dataset.theme = nextTheme;
    target.style.colorScheme = nextTheme;
  });

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_KEY, nextTheme);
  }

  return nextTheme;
}

export function initializeTheme() {
  return applyTheme(readStoredTheme());
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => initializeTheme());

  const setTheme = useCallback((value) => {
    setThemeState((currentTheme) => {
      const resolvedTheme =
        typeof value === 'function' ? normalizeTheme(value(currentTheme)) : normalizeTheme(value);
      return applyTheme(resolvedTheme);
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
