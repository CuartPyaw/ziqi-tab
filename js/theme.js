/**
 * Theme management — system preference detection + manual toggle
 * Persists choice to localStorage under key `ziqi-theme`.
 */

const STORAGE_KEY = 'ziqi-theme';

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const theme = saved || getSystemTheme();
  applyTheme(theme);

  // Listen for system changes only when user hasn't made an explicit choice
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
      window.dispatchEvent(new CustomEvent('theme-changed'));
    }
  });

  return theme;
}

export function getCurrentTheme() {
  return document.documentElement.hasAttribute('data-theme') ? 'dark' : 'light';
}

export function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(STORAGE_KEY, next);
  return next;
}
