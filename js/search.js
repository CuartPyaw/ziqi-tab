/**
 * Search — default engine selection and search suggestions.
 */

import { getAiSiteByShortcut } from './ai.js';

const elInput = document.getElementById('search-input');
const elSearchWrapper = document.querySelector('.search-wrapper');
const elAiChip = document.getElementById('ai-search-chip');
const elAiChipIcon = document.getElementById('ai-search-chip-icon');
const elAiChipName = document.getElementById('ai-search-chip-name');
const STORAGE_KEY = 'ziqi-engine';
const CUSTOM_KEY = 'ziqi-engines';
const ORDER_KEY = 'ziqi-engine-order';

const elSuggestions = document.getElementById('search-suggestions');
const elSuggestionList = document.getElementById('search-suggestion-list');

const GOOGLE_SUGGEST_URL = 'https://suggestqueries.google.com/complete/search?client=chrome&q=';
const SUGGESTION_MESSAGE_TYPE = 'ziqi:get-search-suggestions';
const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE_MS = 200;

let activeAiSite = null;
let suggestionItems = [];
let remoteSuggestions = [];
let highlightedSuggestionIndex = -1;
let suggestionRequestSeq = 0;
let suggestionDebounceTimer = null;

const BUILTIN_ENGINES = {
  google:     { id: 'google',     name: 'Google',     url: 'https://www.google.com/search?q=', builtin: true },
  bing:       { id: 'bing',       name: 'Bing',       url: 'https://www.bing.com/search?q=',   builtin: true },
  duckduckgo: { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=',       builtin: true },
};

let currentEngine = 'google';

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
  if (suggestionDebounceTimer) {
    clearTimeout(suggestionDebounceTimer);
    suggestionDebounceTimer = null;
  }
  activeAiSite = null;
  renderAiChip();
  suggestionItems = [];
  remoteSuggestions = [];
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

function getAllEnginesMap() {
  return { ...BUILTIN_ENGINES, ...loadCustomEngines() };
}

export function getCurrentEngine() {
  const all = getAllEnginesMap();
  return all[currentEngine] || BUILTIN_ENGINES.google;
}

export function setCurrentEngine(key) {
  const all = getAllEnginesMap();
  if (!all[key]) return false;
  currentEngine = key;
  localStorage.setItem(STORAGE_KEY, key);
  return true;
}

/* ── Search ────────────────────────────── */

function search(query) {
  const engine = getCurrentEngine();
  window.location.href = engine.url + encodeURIComponent(query.trim());
}

function aiIconUrl(site) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(site.url)}&size=32`);
  }
  return `https://cdn.simpleicons.org/${site.id}`;
}

function renderAiChip() {
  if (!activeAiSite) {
    elAiChip.setAttribute('hidden', '');
    elInput.placeholder = '搜索…';
    return;
  }
  elAiChipIcon.src = aiIconUrl(activeAiSite);
  elAiChipIcon.onerror = () => elAiChipIcon.setAttribute('hidden', '');
  elAiChipIcon.removeAttribute('hidden');
  elAiChipName.textContent = activeAiSite.name;
  elAiChip.removeAttribute('hidden');
  elInput.placeholder = `向 ${activeAiSite.name} 提问…`;
}

function activateAiSearch(site) {
  activeAiSite = site;
  elInput.value = '';
  hideSuggestions();
  renderAiChip();
}

function deactivateAiSearch() {
  activeAiSite = null;
  renderAiChip();
}

function navigateAiSearch(site, query) {
  const trimmed = query.trim();
  if (!trimmed) return;
  window.location.href = site.url.includes('{query}')
    ? site.url.replace('{query}', encodeURIComponent(trimmed))
    : site.url;
}

function createSuggestionItems(query = elInput.value.trim()) {
  const matchedSite = !activeAiSite && query ? getAiSiteByShortcut(query) : null;
  const aiItems = matchedSite ? [{
    kind: 'ai-shortcut',
    site: matchedSite,
    text: `按 Tab 使用 ${matchedSite.name}`,
  }] : [];
  const searchItems = remoteSuggestions.map((text) => ({
    kind: 'suggestion',
    text,
  }));

  return [...aiItems, ...searchItems];
}

/* ── Suggestion helpers ─────────────────── */

function hideSuggestions() {
  remoteSuggestions = [];
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

  suggestionItems.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-suggestion';
    if (item.kind === 'ai-shortcut') button.classList.add('search-suggestion--ai');
    if (index === highlightedSuggestionIndex) button.classList.add('is-highlighted');
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', index === highlightedSuggestionIndex ? 'true' : 'false');
    button.textContent = item.text;
    button.addEventListener('click', () => {
      if (item.kind === 'ai-shortcut') {
        activateAiSearch(item.site);
        return;
      }
      elInput.value = item.text;
      hideSuggestions();
      search(item.text);
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

async function requestSuggestions(query) {
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
    return chrome.runtime.sendMessage({
      type: SUGGESTION_MESSAGE_TYPE,
      query,
    });
  }

  const response = await fetch(GOOGLE_SUGGEST_URL + encodeURIComponent(query));
  if (!response.ok) return { suggestions: [] };

  const payload = await response.json();
  return {
    suggestions: Array.isArray(payload?.[1]) ? payload[1].slice(0, SUGGESTION_LIMIT) : [],
  };
}

async function fetchSuggestions(query, requestSeq) {
  try {
    const payload = await requestSuggestions(query);
    const nextItems = Array.isArray(payload?.suggestions) ? payload.suggestions.slice(0, SUGGESTION_LIMIT) : [];

    if (requestSeq !== suggestionRequestSeq) return;

    remoteSuggestions = nextItems;
    suggestionItems = createSuggestionItems(query);
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
    remoteSuggestions = [];
    suggestionItems = createSuggestionItems();
    highlightedSuggestionIndex = -1;
    renderSuggestions();
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
  currentEngine = saved && all[saved] ? saved : 'google';

  // Keyboard navigation for suggestions + search on Enter
  _addClean(elInput, 'keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey && !activeAiSite) {
      const site = getAiSiteByShortcut(elInput.value);
      if (site) {
        e.preventDefault();
        activateAiSearch(site);
      }
      return;
    }

    if (e.key === 'Backspace' && activeAiSite && !elInput.value) {
      deactivateAiSearch();
      return;
    }

    if (e.key === 'Escape' && activeAiSite) {
      e.preventDefault();
      deactivateAiSearch();
      return;
    }

    if (e.key === 'ArrowDown' && !elSuggestions.hasAttribute('hidden')) {
      e.preventDefault();
      moveSuggestionHighlight(+1);
      return;
    }

    if (e.key === 'ArrowUp' && !elSuggestions.hasAttribute('hidden')) {
      e.preventDefault();
      moveSuggestionHighlight(-1);
      return;
    }

    if (e.key === 'Escape' && !elSuggestions.hasAttribute('hidden')) {
      e.preventDefault();
      hideSuggestions();
      return;
    }

    if (e.key === 'Enter') {
      if (activeAiSite) {
        e.preventDefault();
        navigateAiSearch(activeAiSite, elInput.value);
        return;
      }

      const selectedItem = highlightedSuggestionIndex >= 0
        ? suggestionItems[highlightedSuggestionIndex]
        : null;

      if (selectedItem?.kind === 'ai-shortcut') {
        e.preventDefault();
        activateAiSearch(selectedItem.site);
        return;
      }

      const query = selectedItem?.kind === 'suggestion'
        ? selectedItem.text
        : elInput.value.trim();

      if (!query) return;

      e.preventDefault();
      elInput.value = query;
      hideSuggestions();
      search(query);
    }
  });

  // Trigger suggestions on input
  _addClean(elInput, 'input', () => {
    queueSuggestionsFetch(elInput.value);
  });

  _addClean(document, 'click', (e) => {
    if (!elSuggestions.hasAttribute('hidden') && !elSearchWrapper.contains(e.target)) {
      hideSuggestions();
    }
  });

  // Listen for engine list changes from settings
  _addClean(window, 'engines-changed', () => {
    hideSuggestions();
    const engines = getAllEngines();
    if (!engines.find(e => e.id === currentEngine)) {
      setCurrentEngine('google');
    }
  });

  _addClean(window, 'ai-sites-changed', () => {
    deactivateAiSearch();
    hideSuggestions();
  });

}
