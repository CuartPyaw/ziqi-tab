/**
 * App entry point — wires up all modules.
 */

import { initTheme, toggleTheme } from './theme.js';
import { initClock } from './clock.js';
import { initSearch } from './search.js';
import { initLinks } from './links.js';
import { initBookmarks } from './bookmarks.js';
import { initSettings } from './settings.js';

/**
 * Initialize content view switcher (quick links vs bookmarks).
 */
function initContentView() {
  const defaultView = localStorage.getItem('ziqi-default-view') || 'links';
  switchView(defaultView);

  document.getElementById('content-switcher').addEventListener('click', (e) => {
    const btn = e.target.closest('.content-switcher-btn');
    if (!btn) return;
    switchView(btn.dataset.view);
  });

  // Listen for default-view-changed from settings (do not switch current view)
  // Record default view preference from settings (no view switch needed;
  // the new default applies on next new-tab load. This listener exists
  // as an extension point for live default application.)
  window.addEventListener('default-view-changed', () => {
    // preference already saved by settings.js
  });
}

/**
 * Switch between links and bookmarks views.
 */
function switchView(view) {
  const linksSection = document.getElementById('quick-links');
  const bookmarksSection = document.getElementById('bookmarks-section');
  const showLinks = view === 'links';

  document.querySelectorAll('.content-switcher-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.view === view);
  });

  linksSection.hidden = !showLinks;
  linksSection.style.display = showLinks ? '' : 'none';
  bookmarksSection.hidden = showLinks;
  bookmarksSection.style.display = showLinks ? 'none' : '';
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme — sets data-theme attr before anything renders
  initTheme();

  // 2. Clock — time, date, greeting
  initClock();

  // 3. Search — engine selector + Enter-to-search
  initSearch();

  // 4. Quick Links — grid + dialog CRUD; listens for theme-changed internally
  initLinks();

  // 5. Bookmarks — bookmark bar with folder navigation
  initBookmarks();

  // 6. Settings — panel with search bar width control
  initSettings();

  // 7. Content view — switcher between quick links and bookmarks
  initContentView();

  // 8. Theme toggle button
  document.getElementById('theme-toggle').addEventListener('click', () => {
    toggleTheme();
    window.dispatchEvent(new CustomEvent('theme-changed'));
  });

  // 9. 新标签页打开动画 — bounceInUp on the main page
  const container = document.querySelector('.container');
  container.style.visibility = 'visible';
  const mainPage = document.querySelector('.page--main');
  mainPage.classList.add('animate__animated', 'animate__bounceInUp');
  mainPage.addEventListener('animationend', () => {
    mainPage.classList.remove('animate__animated', 'animate__bounceInUp');
  }, { once: true });
});
