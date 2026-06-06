/**
 * Search — captures input, handles engine switching, redirects on Enter.
 */

const elInput = document.getElementById('search-input');
const elEngine = document.getElementById('search-engine');
const STORAGE_KEY = 'ziqi-engine';

const ENGINES = {
  google:    { name: 'Google',     url: 'https://www.google.com/search?q=' },
  bing:      { name: 'Bing',       url: 'https://www.bing.com/search?q=' },
  duckduckgo:{ name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
};

function search(query) {
  const engine = elEngine.value;
  const base = ENGINES[engine]?.url || ENGINES.google.url;
  window.location.href = base + encodeURIComponent(query.trim());
}

export function initSearch() {
  // Restore saved engine preference
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && ENGINES[saved]) {
    elEngine.value = saved;
  }

  // Save preference on change
  elEngine.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY, elEngine.value);
  });

  // Search on Enter
  elInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = elInput.value.trim();
      if (q) search(q);
    }
  });

  // Refocus search input when clicking anywhere on the page background
  document.addEventListener('click', (e) => {
    const tag = e.target.tagName;
    if (tag === 'BODY' || tag === 'HTML' || e.target.classList.contains('container')) {
      elInput.focus();
    }
  });
}
