/**
 * Search — custom engine dropdown with icons, material texture, fade animation.
 */

const elInput = document.getElementById('search-input');
const elIconBtn = document.getElementById('engine-icon-btn');
const elChevronBtn = document.getElementById('engine-chevron-btn');
const elEngineIcon = document.getElementById('engine-icon');
const elEngineLetter = document.getElementById('engine-letter');
const elMenu = document.getElementById('engine-menu');
const elBackdrop = document.getElementById('engine-backdrop');
const STORAGE_KEY = 'ziqi-engine';
const CUSTOM_KEY = 'ziqi-engines';
const ORDER_KEY = 'ziqi-engine-order';

const elSuggestions = document.getElementById('search-suggestions');
const elSuggestionList = document.getElementById('search-suggestion-list');

const GOOGLE_SUGGEST_URL = 'https://suggestqueries.google.com/complete/search?client=chrome&q=';
const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE_MS = 200;

let suggestionItems = [];
let highlightedSuggestionIndex = -1;
let suggestionRequestSeq = 0;
let suggestionDebounceTimer = null;

const BUILTIN_ENGINES = {
  google:     { id: 'google',     name: 'Google',     url: 'https://www.google.com/search?q=', icon: 'icons/google.svg',     builtin: true },
  bing:       { id: 'bing',       name: 'Bing',       url: 'https://www.bing.com/search?q=',   icon: 'icons/bing.svg',       builtin: true },
  duckduckgo: { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=',       icon: 'icons/duckduckgo.svg', builtin: true },
};

let currentEngine = 'google';
let menuKeyHandler = null;

/* ── Test/cleanup support ──────────────── */
// Track permanent event listeners so destroySearch() can remove them.
const _cleanups = [];

function _addClean(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  _cleanups.push(() => target.removeEventListener(type, fn));
}

/** Remove all listeners added by initSearch so a test can re-init cleanly. */
export function destroySearch() {
  for (const cleanup of _cleanups) cleanup();
  _cleanups.length = 0;
  if (menuKeyHandler) {
    document.removeEventListener('keydown', menuKeyHandler);
    menuKeyHandler = null;
  }
  if (suggestionDebounceTimer) {
    clearTimeout(suggestionDebounceTimer);
    suggestionDebounceTimer = null;
  }
  suggestionItems = [];
  highlightedSuggestionIndex = -1;
  suggestionRequestSeq = 0;
  elSuggestionList.innerHTML = '';
  elSuggestions.setAttribute('hidden', '');
}

/* ── Engine data layer ──────────────────── */

function loadCustomEngines() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return {};
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return {};
    const map = {};
    arr.forEach(e => { if (e.id) map[e.id] = e; });
    return map;
  } catch (_) { return {}; }
}

function saveCustomEngines(map) {
  const arr = Object.values(map).filter(e => !e.builtin);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr));
}

export function getAllEngines() {
  const all = getAllEnginesMap();
  const order = getEngineOrder();
  return order.map(id => all[id]).filter(Boolean);
}

function getEngineOrder() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch (_) {}
  // Default: presets first, then customs in add order
  const customs = loadCustomEngines();
  return [...Object.keys(BUILTIN_ENGINES), ...Object.keys(customs)];
}

function saveEngineOrder(order) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

function getAllEnginesMap() {
  return { ...BUILTIN_ENGINES, ...loadCustomEngines() };
}

export function getCurrentEngine() {
  const all = getAllEnginesMap();
  return all[currentEngine] || BUILTIN_ENGINES.google;
}

/* ── Cycle ──────────────────────────────── */

function cycleEngine(direction) {
  const engines = getAllEngines();
  if (engines.length <= 1) return;
  const idx = engines.findIndex(e => e.id === currentEngine);
  const nextIdx = (idx + direction + engines.length) % engines.length;
  selectEngine(engines[nextIdx].id, true);
}

/* ── Render ────────────────────────────── */

function domainToSlug(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length >= 2) return parts[parts.length - 2];
    return host;
  } catch {
    return null;
  }
}

function engineIconUrl(engine) {
  if (engine.icon) return engine.icon;
  try {
    new URL(engine.url);
  } catch {
    return null;
  }
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(engine.url)}&size=32`);
  }
  const slug = domainToSlug(engine.url);
  return slug ? `https://cdn.simpleicons.org/${slug}` : null;
}

function fallbackLetter(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function badgeColor(name) {
  const seed = [...(name || '?')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return `hsl(${seed % 360} 68% 46%)`;
}

function renderLetterBadge(el, name) {
  el.textContent = fallbackLetter(name);
  el.style.backgroundColor = badgeColor(name);
  el.style.color = '#fff';
}

function createLetterBadge(name, className) {
  const letter = document.createElement('span');
  letter.className = className;
  renderLetterBadge(letter, name);
  return letter;
}

function renderTriggerLetter(engine) {
  elEngineIcon.setAttribute('hidden', '');
  renderLetterBadge(elEngineLetter, engine.name);
  elEngineLetter.removeAttribute('hidden');
}

function renderTriggerIcon() {
  const engine = getCurrentEngine();
  const iconSrc = engineIconUrl(engine);
  if (iconSrc) {
    elEngineIcon.onerror = () => renderTriggerLetter(engine);
    elEngineIcon.src = iconSrc;
    elEngineIcon.alt = engine.name;
    elEngineIcon.removeAttribute('hidden');
    elEngineLetter.setAttribute('hidden', '');
  } else {
    renderTriggerLetter(engine);
  }
  elIconBtn.title = `${engine.name} · 点击选择搜索引擎 | Tab 循环`;
  elIconBtn.setAttribute('aria-label', `${engine.name}，点击选择搜索引擎`);
}

function renderMenu() {
  elMenu.innerHTML = '';
  const engines = getAllEngines();
  let showedDivider = false;

  engines.forEach((engine) => {
    // Add divider before first custom engine
    if (!engine.builtin && !showedDivider) {
      showedDivider = true;
      const divider = document.createElement('div');
      divider.className = 'engine-menu-divider';
      elMenu.appendChild(divider);
    }

    const btn = document.createElement('button');
    btn.className = 'engine-option';
    if (engine.id === currentEngine) btn.classList.add('selected');
    btn.type = 'button';
    btn.setAttribute('data-value', engine.id);
    btn.setAttribute('role', 'menuitem');
    btn.setAttribute('title', engine.name);
    btn.setAttribute('aria-label', engine.name);
    if (engine.id === currentEngine) btn.setAttribute('aria-current', 'true');

    const iconSrc = engineIconUrl(engine);
    if (iconSrc) {
      const img = document.createElement('img');
      img.className = 'engine-option-icon';
      img.src = iconSrc;
      img.alt = '';
      img.onerror = () => img.replaceWith(createLetterBadge(engine.name, 'engine-option-letter'));
      btn.appendChild(img);
    } else {
      btn.appendChild(createLetterBadge(engine.name, 'engine-option-letter'));
    }

    btn.addEventListener('click', (e) => {
      selectEngine(engine.id);
    });

    elMenu.appendChild(btn);
  });
}

/* ── Open / Close ──────────────────────── */

function openMenu() {
  elMenu.removeAttribute('hidden');
  elMenu.classList.remove('anim-out');
  elMenu.classList.add('anim-in');
  elBackdrop.removeAttribute('hidden');
  elIconBtn.classList.add('open');
  elIconBtn.setAttribute('aria-expanded', 'true');
  renderMenu();

  // Arrow key navigation within menu
  if (menuKeyHandler) document.removeEventListener('keydown', menuKeyHandler);
  menuKeyHandler = (e) => {
    if (elMenu.hasAttribute('hidden')) return;
    const items = elMenu.querySelectorAll('.engine-option');
    if (items.length === 0) return;
    const focused = elMenu.querySelector('.engine-option:focus');
    const idx = focused ? Array.from(items).indexOf(focused) : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % items.length;
      items[next].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + items.length) % items.length;
      items[prev].focus();
    } else if (e.key === 'Enter' && focused) {
      e.preventDefault();
      focused.click();
    }
  };
  document.addEventListener('keydown', menuKeyHandler);
}

function closeMenu() {
  if (elMenu.hasAttribute('hidden')) return;

  elMenu.classList.remove('anim-in');
  elMenu.classList.add('anim-out');

  const onEnd = () => {
    elMenu.setAttribute('hidden', '');
    elMenu.classList.remove('anim-out');
    elBackdrop.setAttribute('hidden', '');
    elIconBtn.classList.remove('open');
    elIconBtn.setAttribute('aria-expanded', 'false');
    if (menuKeyHandler) {
      document.removeEventListener('keydown', menuKeyHandler);
      menuKeyHandler = null;
    }
    elMenu.removeEventListener('animationend', onEnd);
  };
  elMenu.addEventListener('animationend', onEnd);
}

function toggleMenu() {
  if (elMenu.hasAttribute('hidden')) {
    openMenu();
  } else {
    closeMenu();
  }
}

/* ── Select ────────────────────────────── */

function selectEngine(key, skipClose = false) {
  const all = getAllEnginesMap();
  if (!all[key]) return;
  currentEngine = key;
  localStorage.setItem(STORAGE_KEY, key);
  renderTriggerIcon();
  if (!skipClose) closeMenu();
}

/* ── Search ────────────────────────────── */

function search(query) {
  const engine = getCurrentEngine();
  window.location.href = engine.url + encodeURIComponent(query.trim());
}

/* ── Suggestion helpers ─────────────────── */

function hideSuggestions() {
  suggestionItems = [];
  highlightedSuggestionIndex = -1;
  elSuggestionList.innerHTML = '';
  elSuggestions.setAttribute('hidden', '');
}

function renderSuggestions() {
  elSuggestionList.innerHTML = '';

  if (suggestionItems.length === 0) {
    elSuggestions.setAttribute('hidden', '');
    return;
  }

  suggestionItems.forEach((text, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-suggestion';
    if (index === highlightedSuggestionIndex) button.classList.add('is-highlighted');
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', index === highlightedSuggestionIndex ? 'true' : 'false');
    button.textContent = text;
    button.addEventListener('click', () => {
      elInput.value = text;
      hideSuggestions();
      search(text);
    });
    elSuggestionList.appendChild(button);
  });

  elSuggestions.removeAttribute('hidden');
}

function moveSuggestionHighlight(direction) {
  if (suggestionItems.length === 0) return;
  highlightedSuggestionIndex = (highlightedSuggestionIndex + direction + suggestionItems.length) % suggestionItems.length;
  renderSuggestions();
}

async function fetchSuggestions(query, requestSeq) {
  try {
    const response = await fetch(GOOGLE_SUGGEST_URL + encodeURIComponent(query));
    if (!response.ok) {
      hideSuggestions();
      return;
    }

    const payload = await response.json();
    const nextItems = Array.isArray(payload?.[1]) ? payload[1].slice(0, SUGGESTION_LIMIT) : [];

    if (requestSeq !== suggestionRequestSeq) return;

    suggestionItems = nextItems;
    highlightedSuggestionIndex = -1;
    renderSuggestions();
  } catch (_) {
    if (requestSeq === suggestionRequestSeq) hideSuggestions();
  }
}

function queueSuggestionsFetch(rawValue) {
  const query = rawValue.trim();

  if (suggestionDebounceTimer) {
    clearTimeout(suggestionDebounceTimer);
    suggestionDebounceTimer = null;
  }

  if (!query) {
    suggestionRequestSeq += 1;
    hideSuggestions();
    return;
  }

  const requestSeq = ++suggestionRequestSeq;
  suggestionDebounceTimer = setTimeout(() => {
    suggestionDebounceTimer = null;
    fetchSuggestions(query, requestSeq);
  }, SUGGESTION_DEBOUNCE_MS);
}

/* ── Init ──────────────────────────────── */

export function initSearch() {
  // Restore saved engine preference
  const saved = localStorage.getItem(STORAGE_KEY);
  const all = getAllEnginesMap();
  if (saved && all[saved]) {
    currentEngine = saved;
  }

  // Initial render
  renderTriggerIcon();

  elIconBtn.setAttribute('aria-haspopup', 'true');
  elIconBtn.setAttribute('aria-expanded', 'false');
  elChevronBtn.setAttribute('hidden', '');
  elChevronBtn.setAttribute('aria-hidden', 'true');
  elChevronBtn.tabIndex = -1;

  // Icon button click → toggle engine menu
  _addClean(elIconBtn, 'click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Backdrop click closes menu
  _addClean(elBackdrop, 'click', (e) => {
    e.stopPropagation();
    closeMenu();
  });

  // Keyboard: Escape closes menu, Tab/Shift+Tab cycles engine when input focused
  _addClean(document, 'keydown', (e) => {
    // Escape → close menu
    if (e.key === 'Escape' && !elMenu.hasAttribute('hidden')) {
      closeMenu();
      elIconBtn.focus();
      return;
    }

    // Tab / Shift+Tab → cycle engine when search input is focused and menu is closed
    if (e.key === 'Tab' && document.activeElement === elInput && elMenu.hasAttribute('hidden')) {
      e.preventDefault();
      cycleEngine(e.shiftKey ? -1 : +1);
      // Brief highlight feedback
      elIconBtn.classList.add('tab-flash');
      elIconBtn.addEventListener('animationend', () => {
        elIconBtn.classList.remove('tab-flash');
      }, { once: true });
    }
  });

  // Search on Enter
  _addClean(elInput, 'keydown', (e) => {
    if (e.key === 'Enter') {
      const q = elInput.value.trim();
      if (q) search(q);
    }
  });

  // Re-render icons when theme changes
  _addClean(window, 'theme-changed', () => {
    renderTriggerIcon();
  });

  // Listen for engine list changes from settings
  _addClean(window, 'engines-changed', () => {
    const engines = getAllEngines();
    if (!engines.find(e => e.id === currentEngine)) {
      selectEngine('google', true);
    }
    renderTriggerIcon();
  });

}
