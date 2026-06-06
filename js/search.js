/**
 * Search — custom engine dropdown with icons, material texture, fade animation.
 */

const elInput = document.getElementById('search-input');
const elTrigger = document.getElementById('engine-trigger');
const elEngineIcon = document.getElementById('engine-icon');
const elMenu = document.getElementById('engine-menu');
const elBackdrop = document.getElementById('engine-backdrop');
const STORAGE_KEY = 'ziqi-engine';

const ENGINES = {
  google:    { name: 'Google',     url: 'https://www.google.com/search?q=', icon: 'icons/google.svg' },
  bing:      { name: 'Bing',       url: 'https://www.bing.com/search?q=',   icon: 'icons/bing.svg' },
  duckduckgo:{ name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=',       icon: 'icons/duckduckgo.svg' },
};

let currentEngine = 'google';

/* ── Icon ──────────────────────────────── */

function engineIcon(key) {
  return ENGINES[key]?.icon || '';
}

/* ── Render ────────────────────────────── */

function renderTriggerIcon() {
  elEngineIcon.src = engineIcon(currentEngine);
  elEngineIcon.alt = ENGINES[currentEngine]?.name || '';
}

function renderMenu() {
  elMenu.innerHTML = '';
  Object.entries(ENGINES).forEach(([key, engine]) => {
    const btn = document.createElement('button');
    btn.className = 'engine-option';
    if (key === currentEngine) btn.classList.add('selected');
    btn.type = 'button';
    btn.setAttribute('data-value', key);

    const img = document.createElement('img');
    img.className = 'engine-option-icon';
    img.src = engineIcon(key);
    img.alt = '';

    const name = document.createElement('span');
    name.textContent = engine.name;

    btn.appendChild(img);
    btn.appendChild(name);

    btn.addEventListener('click', () => selectEngine(key));
    elMenu.appendChild(btn);
  });
}

/* ── Open / Close ──────────────────────── */

function openMenu() {
  elMenu.removeAttribute('hidden');
  elMenu.classList.remove('anim-out');
  elMenu.classList.add('anim-in');
  elBackdrop.removeAttribute('hidden');
  elTrigger.classList.add('open');
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
    elTrigger.classList.remove('open');
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

function selectEngine(key) {
  if (!ENGINES[key]) return;
  currentEngine = key;
  localStorage.setItem(STORAGE_KEY, key);
  renderTriggerIcon();
  closeMenu();
}

/* ── Search ────────────────────────────── */

function search(query) {
  const base = ENGINES[currentEngine]?.url || ENGINES.google.url;
  window.location.href = base + encodeURIComponent(query.trim());
}

/* ── Init ──────────────────────────────── */

export function initSearch() {
  // Restore saved engine preference
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && ENGINES[saved]) {
    currentEngine = saved;
  }

  // Initial render
  renderTriggerIcon();

  // Trigger button click
  elTrigger.addEventListener('click', (e) => {
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
      elTrigger.focus();
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
