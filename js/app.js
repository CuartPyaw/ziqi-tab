/**
 * App entry point — wires up all modules.
 */

import { initTheme, toggleTheme } from './theme.js';
import { initClock } from './clock.js';
import { initSearch } from './search.js';
import { initLinks } from './links.js';
import { initSettings } from './settings.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme — sets data-theme attr before anything renders
  initTheme();

  // 2. Clock — time, date, greeting
  initClock();

  // 3. Search — engine selector + Enter-to-search
  initSearch();

  // 4. Quick Links — grid + dialog CRUD; listens for theme-changed internally
  initLinks();

  // 5. Settings — panel with search bar width control
  initSettings();

  // 6. Pomodoro toggle button — navigate to pomodoro page
  document.getElementById('pomodoro-toggle').addEventListener('click', () => {
    document.body.classList.add('page-fade-out');
    setTimeout(() => {
      window.location.href = 'pomodoro.html';
    }, 300);
  });

  // 7. Theme toggle button
  document.getElementById('theme-toggle').addEventListener('click', () => {
    toggleTheme();
    window.dispatchEvent(new CustomEvent('theme-changed'));
  });
});
