/**
 * App entry point — wires up all modules.
 */

import { initTheme, toggleTheme } from './theme.js';
import { initClock } from './clock.js';
import { initSearch } from './search.js';
import { initLinks } from './links.js';
import { initSettings } from './settings.js';
import { initPomodoro } from './pomodoro.js';

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

  // 6. Pomodoro — timer page, toggle button in settings bar
  initPomodoro();

  // 7. Theme toggle button
  document.getElementById('theme-toggle').addEventListener('click', () => {
    toggleTheme();
    window.dispatchEvent(new CustomEvent('theme-changed'));
  });

  // 8. 新标签页打开动画 — bounceInUp on the main page
  const container = document.querySelector('.container');
  container.style.visibility = 'visible';
  const mainPage = document.querySelector('.page--main');
  mainPage.classList.add('animate__animated', 'animate__bounceInUp');
  mainPage.addEventListener('animationend', () => {
    mainPage.classList.remove('animate__animated', 'animate__bounceInUp');
  }, { once: true });
});
