/**
 * App entry point — wires up all modules.
 */

import { initTheme, toggleTheme } from './theme.js';
import { initClock } from './clock.js';
import { initSearch } from './search.js';
import { initLinks } from './links.js';
import { initSettings } from './settings.js';

/* ── Browser Shortcuts (Extensions / Bookmarks / History) ───────────────── */

function navigateToBrowserUrl(url) {
  window.location.assign(url);
}

export function openBrowserUrl(url) {
  try {
    if (globalThis.chrome?.tabs?.update) {
      globalThis.chrome.tabs.update({ url }, () => {
        if (globalThis.chrome?.runtime?.lastError) {
          navigateToBrowserUrl(url);
        }
      });
      return;
    }
  } catch (_) {
    // Fall back to normal navigation below.
  }

  navigateToBrowserUrl(url);
}

function handleBrowserShortcutClick(e) {
  const url = e.currentTarget.dataset.browserUrl;
  if (url) openBrowserUrl(url);
}

export function initBrowserShortcuts() {
  document.querySelectorAll('[data-browser-url]').forEach((btn) => {
    if (btn.dataset.browserShortcutBound === 'true') return;
    btn.dataset.browserShortcutBound = 'true';
    btn.addEventListener('click', handleBrowserShortcutClick);
  });
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

  // 5. Settings — panel with search bar width control
  initSettings();

  // 6. Theme toggle button
  document.getElementById('theme-toggle').addEventListener('click', () => {
    toggleTheme();
    window.dispatchEvent(new CustomEvent('theme-changed'));
  });

  // 7. Browser shortcuts — use extension tabs API for chrome:// pages
  initBrowserShortcuts();

  // 8. 新标签页打开动画 — bounceInUp on the main page
  const container = document.querySelector('.container');
  container.style.visibility = 'visible';
  const mainPage = document.querySelector('.page--main');
  mainPage.classList.add('animate__animated', 'animate__bounceInUp');
  mainPage.addEventListener('animationend', () => {
    mainPage.classList.remove('animate__animated', 'animate__bounceInUp');
  }, { once: true });
});
