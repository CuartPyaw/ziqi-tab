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

const BUILTIN_ENGINES = {
  google:     { id: 'google',     name: 'Google',     url: 'https://www.google.com/search?q=', icon: 'icons/google.svg',     builtin: true },
  bing:       { id: 'bing',       name: 'Bing',       url: 'https://www.bing.com/search?q=',   icon: 'icons/bing.svg',       builtin: true },
  duckduckgo: { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=',       icon: 'icons/duckduckgo.svg', builtin: true },
};

let currentEngine = 'google';

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

function renderTriggerIcon() {
  const engine = getCurrentEngine();
  if (engine.builtin && engine.icon) {
    elEngineIcon.src = engine.icon;
    elEngineIcon.alt = engine.name;
    elEngineIcon.removeAttribute('hidden');
    elEngineLetter.setAttribute('hidden', '');
  } else {
    elEngineIcon.setAttribute('hidden', '');
    elEngineLetter.textContent = engine.name.charAt(0).toUpperCase();
    elEngineLetter.removeAttribute('hidden');
  }
  elIconBtn.title = `${engine.name} · 点击切换 | Tab 循环`;
}

function renderMenu() {
  elMenu.innerHTML = '';
  getAllEngines().forEach(engine => {
    const btn = document.createElement('button');
    btn.className = 'engine-option';
    if (engine.id === currentEngine) btn.classList.add('selected');
    btn.type = 'button';
    btn.setAttribute('data-value', engine.id);

    const img = document.createElement('img');
    img.className = 'engine-option-icon';
    img.src = engine.icon || '';
    img.alt = '';

    const name = document.createElement('span');
    name.textContent = engine.name;

    btn.appendChild(img);
    btn.appendChild(name);

    btn.addEventListener('click', () => selectEngine(engine.id));
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
  renderMenu();
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

  // Chevron button toggles the engine dropdown
  elChevronBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Backdrop click closes menu
  elBackdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenu();
  });

  // Keyboard: Escape closes menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elMenu.hasAttribute('hidden')) {
      closeMenu();
      elIconBtn.focus();
    }
  });

  // Search on Enter
  elInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = elInput.value.trim();
      if (q) search(q);
    }
  });

  // Re-render icons when theme changes
  window.addEventListener('theme-changed', () => {
    renderTriggerIcon();
  });

  // Refocus search input when clicking anywhere on the page background
  document.addEventListener('click', (e) => {
    const tag = e.target.tagName;
    if (tag === 'BODY' || tag === 'HTML' || e.target.classList.contains('container')) {
      elInput.focus();
    }
  });
}
