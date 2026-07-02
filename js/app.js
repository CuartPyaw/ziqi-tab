/**
 * App entry point — wires up all modules.
 */

import { initTheme, toggleTheme } from './theme.js';
import { initClock } from './clock.js';
import { initSearch } from './search.js';
import { initLinks } from './links.js';
import { initBookmarks } from './bookmarks.js';
import { initSettings } from './settings.js';

/* ── Content View (Quick Links / Bookmarks) ─────────────────── */

const elSwitcher = document.getElementById('content-switcher');
const elPill = document.getElementById('content-switcher-pill');
const elStage = document.getElementById('content-stage');
const elQuickLinks = document.getElementById('quick-links');
const elBookmarksSection = document.getElementById('bookmarks-section');

let isTransitioning = false;
let switcherClickHandler = null;
let defaultViewHandler = null;

function getActiveButton() {
  return elSwitcher.querySelector('.content-switcher-btn.is-active');
}

function setActiveButton(view) {
  elSwitcher.querySelectorAll('.content-switcher-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.view === view);
  });
}

function positionPill() {
  const active = getActiveButton();
  if (!active) return;
  elPill.style.width = `${active.offsetWidth}px`;
  elPill.style.transform = `translateX(${active.offsetLeft}px)`;
}

function panelFor(view) {
  return view === 'links' ? elQuickLinks : elBookmarksSection;
}

/** Instant application, used on initial load — no animation. */
function applyView(view) {
  setActiveButton(view);
  positionPill();
  const showLinks = view === 'links';
  elQuickLinks.hidden = !showLinks;
  elQuickLinks.style.display = showLinks ? '' : 'none';
  elBookmarksSection.hidden = showLinks;
  elBookmarksSection.style.display = showLinks ? 'none' : '';
}

/** Animated switch, used on switcher button clicks. */
function switchView(view) {
  const current = getActiveButton();
  const currentView = current ? current.dataset.view : 'links';
  if (currentView === view || isTransitioning) return;

  const fromPanel = panelFor(currentView);
  const toPanel = panelFor(view);

  isTransitioning = true;
  setActiveButton(view);
  positionPill();

  // Keep only one content panel visible at a time. Overlapping the two grids
  // during opacity animation causes a brief ghost image on fast switches.
  elStage.style.height = `${fromPanel.offsetHeight}px`;
  elStage.classList.add('is-transitioning');

  // Force a reflow so the height freeze is committed before the fade starts.
  void elStage.offsetHeight;

  fromPanel.classList.add('content-panel-out');

  fromPanel.addEventListener('animationend', function onOutEnd(e) {
    if (e.target !== fromPanel) return;
    fromPanel.removeEventListener('animationend', onOutEnd);

    fromPanel.classList.remove('content-panel-out');
    fromPanel.hidden = true;
    fromPanel.style.display = 'none'; // redundant with [hidden] !important rule but kept for pre-existing contract consistency

    toPanel.hidden = false;
    toPanel.style.display = '';
    elStage.style.height = `${toPanel.scrollHeight}px`;

    // Commit the panel swap before the incoming fade, avoiding a coalesced paint.
    void elStage.offsetHeight;

    toPanel.classList.add('content-panel-in');

    toPanel.addEventListener('animationend', function onInEnd(event) {
      if (event.target !== toPanel) return;
      toPanel.removeEventListener('animationend', onInEnd);

      toPanel.classList.remove('content-panel-in');
      elStage.classList.remove('is-transitioning');
      elStage.style.height = '';
      isTransitioning = false;
    });
  });
}

/**
 * Initialize content view switcher (quick links vs bookmarks).
 */
export function initContentView() {
  const defaultView = localStorage.getItem('ziqi-default-view') || 'links';
  applyView(defaultView);

  switcherClickHandler = (e) => {
    const btn = e.target.closest('.content-switcher-btn');
    if (!btn) return;
    switchView(btn.dataset.view);
  };
  elSwitcher.addEventListener('click', switcherClickHandler);

  // Listen for default-view-changed from settings (do not switch current view)
  // Record default view preference from settings (no view switch needed;
  // the new default applies on next new-tab load. This listener exists
  // as an extension point for live default application.)
  if (defaultViewHandler) window.removeEventListener('default-view-changed', defaultViewHandler);
  defaultViewHandler = () => {
    // preference already saved by settings.js
  };
  window.addEventListener('default-view-changed', defaultViewHandler);
}

/** Remove content-view listeners so a test can re-init cleanly. */
export function destroyContentView() {
  if (switcherClickHandler) {
    elSwitcher.removeEventListener('click', switcherClickHandler);
    switcherClickHandler = null;
  }
  if (defaultViewHandler) {
    window.removeEventListener('default-view-changed', defaultViewHandler);
    defaultViewHandler = null;
  }
  isTransitioning = false;
}

/* ── Browser Shortcuts (Extensions / History) ───────────────── */

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

  // 9. Browser shortcuts — use extension tabs API for chrome:// pages
  initBrowserShortcuts();

  // 10. 新标签页打开动画 — bounceInUp on the main page
  const container = document.querySelector('.container');
  container.style.visibility = 'visible';
  const mainPage = document.querySelector('.page--main');
  mainPage.classList.add('animate__animated', 'animate__bounceInUp');
  mainPage.addEventListener('animationend', () => {
    mainPage.classList.remove('animate__animated', 'animate__bounceInUp');
  }, { once: true });
});
