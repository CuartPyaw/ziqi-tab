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
  const forward = view === 'bookmarks';

  isTransitioning = true;
  setActiveButton(view);
  positionPill();

  // Freeze the stage at its current height, then reveal the incoming panel
  // and make both panels absolutely positioned so they can overlap.
  elStage.style.height = `${fromPanel.offsetHeight}px`;
  elStage.classList.add('is-transitioning');
  toPanel.hidden = false;
  toPanel.style.display = '';

  // Force a reflow so the height freeze and reveal are committed before the
  // next style change — otherwise the browser coalesces them and the height
  // transition never animates.
  void elStage.offsetHeight;

  const leaveClass = forward ? 'content-slide-out-to-left' : 'content-slide-out-to-right';
  const enterClass = forward ? 'content-slide-in-from-right' : 'content-slide-in-from-left';

  elStage.style.height = `${toPanel.scrollHeight}px`;
  fromPanel.classList.add(leaveClass);
  toPanel.classList.add(enterClass);

  toPanel.addEventListener('animationend', function onEnd() {
    toPanel.removeEventListener('animationend', onEnd);

    elStage.classList.remove('is-transitioning');
    elStage.style.height = '';
    fromPanel.classList.remove(leaveClass);
    toPanel.classList.remove(enterClass);

    fromPanel.hidden = true;
    fromPanel.style.display = 'none';

    isTransitioning = false;
  }, { once: true });
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
  window.addEventListener('default-view-changed', () => {
    // preference already saved by settings.js
  });
}

/** Remove content-view listeners so a test can re-init cleanly. */
export function destroyContentView() {
  if (switcherClickHandler) {
    elSwitcher.removeEventListener('click', switcherClickHandler);
    switcherClickHandler = null;
  }
  isTransitioning = false;
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
