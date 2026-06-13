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

    // Icon: builtin = SVG img, custom = first-letter span
    if (engine.builtin && engine.icon) {
      const img = document.createElement('img');
      img.className = 'engine-option-icon';
      img.src = engine.icon;
      img.alt = '';
      btn.appendChild(img);
    } else {
      const letter = document.createElement('span');
      letter.className = 'engine-option-letter';
      letter.textContent = engine.name.charAt(0).toUpperCase();
      btn.appendChild(letter);
    }

    // Name
    const name = document.createElement('span');
    name.textContent = engine.name;
    btn.appendChild(name);

    // Edit/Delete buttons for custom engines
    if (!engine.builtin) {
      const actions = document.createElement('span');
      actions.className = 'engine-option-actions';
      actions.innerHTML = `<button type="button" class="engine-edit-btn" data-id="${engine.id}" title="编辑">✏️</button><button type="button" class="engine-delete-btn" data-id="${engine.id}" title="删除">🗑️</button>`;
      btn.appendChild(actions);
    }

    btn.addEventListener('click', (e) => {
      // Ignore clicks on edit/delete buttons (they dispatch custom events)
      if (e.target.classList.contains('engine-edit-btn') || e.target.classList.contains('engine-delete-btn')) return;
      selectEngine(engine.id);
    });

    elMenu.appendChild(btn);
  });

  // Bind edit/delete button events
  elMenu.querySelectorAll('.engine-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      document.dispatchEvent(new CustomEvent('engine-edit', { detail: { id } }));
      closeMenu();
    });
  });
  elMenu.querySelectorAll('.engine-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      document.dispatchEvent(new CustomEvent('engine-delete', { detail: { id } }));
      closeMenu();
    });
  });
}

/* ── Open / Close ──────────────────────── */

function openMenu() {
  elMenu.removeAttribute('hidden');
  elMenu.classList.remove('anim-out');
  elMenu.classList.add('anim-in');
  elBackdrop.removeAttribute('hidden');
  elChevronBtn.classList.add('open');
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
    elChevronBtn.classList.remove('open');
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

  // Icon button click → cycle to next engine
  _addClean(elIconBtn, 'click', (e) => {
    e.stopPropagation();
    cycleEngine(+1);
  });

  // Chevron button click → toggle menu
  _addClean(elChevronBtn, 'click', (e) => {
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
      elChevronBtn.focus();
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

  // Refocus search input when clicking anywhere on the page background
  _addClean(document, 'click', (e) => {
    const tag = e.target.tagName;
    if (tag === 'BODY' || tag === 'HTML' || e.target.classList.contains('container')) {
      elInput.focus();
    }
  });
}
