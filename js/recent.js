/**
 * Recent browsing sites — recent history cards shown below quick links.
 * Fetches via chrome.history API, deduplicates by hostname, renders top 4.
 */

const elSection = document.getElementById('recent-sites');
const elGrid = document.getElementById('recent-grid');

const INTERNAL_PREFIXES = [
  'chrome://',
  'edge://',
  'about://',
  'file://',
  'view-source:',
  'devtools:',
  'extension:',
];

async function initRecent() {
  async function fetchHistory() {
    try {
      if (typeof chrome?.history?.search !== 'function') {
        elSection.hidden = true;
        return [];
      }
      return await chrome.history.search({
        text: '',
        maxResults: 50,
        startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
      });
    } catch (_) {
      elSection.hidden = true;
      return [];
    }
  }

  function render(sites) {
    elGrid.innerHTML = '';

    if (sites.length === 0) {
      elSection.hidden = true;
      return;
    }

    sites.forEach((site) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'link-item';
      a.href = site.url;

      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'link-icon-wrapper';

      const img = document.createElement('img');
      img.src = 'chrome://favicon/' + site.url;
      img.alt = '';
      img.loading = 'eager';
      img.onerror = () => {
        const fb = document.createElement('div');
        fb.className = 'link-icon-fallback';
        fb.textContent = (site.title || site.hostname || '?').charAt(0).toUpperCase();
        iconWrapper.replaceChildren(fb);
      };
      iconWrapper.appendChild(img);

      const label = document.createElement('span');
      label.className = 'link-label';
      label.textContent = site.title || site.hostname;

      a.append(iconWrapper, label);
      li.appendChild(a);
      elGrid.appendChild(li);
    });

    elSection.hidden = false;
  }

  const historyItems = await fetchHistory();
  const deduped = new Map();

  for (const item of historyItems) {
    if (!item?.url) continue;

    let skip = false;
    for (const prefix of INTERNAL_PREFIXES) {
      if (item.url.startsWith(prefix)) { skip = true; break; }
    }
    if (skip) continue;

    try {
      const hostname = new URL(item.url).hostname;
      if (!hostname || deduped.has(hostname)) continue;
      deduped.set(hostname, {
        url: item.url,
        hostname: hostname,
        title: item.title || '',
      });
    } catch (_) {
      // Skip invalid URLs from history.
    }
  }

  render(Array.from(deduped.values()).slice(0, 4));

  // Bind click handler once
  if (elGrid.dataset.recentBound === 'true') return;
  elGrid.dataset.recentBound = 'true';

  elGrid.addEventListener('click', (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const link = e.target.closest('a.link-item');
    if (!link) return;
    e.preventDefault();
    window.location.href = link.href;
  });
}

export { initRecent };
