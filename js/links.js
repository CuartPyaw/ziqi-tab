/**
 * Quick Links — grid of editable shortcuts with Simple Icons.
 * Data stored in localStorage under key `ziqi-links`.
 */

const STORAGE_KEY = 'ziqi-links';
const elGrid = document.getElementById('links-grid');
const elDialog = document.getElementById('link-dialog');
const elForm = document.getElementById('link-form');
const elTitleInput = document.getElementById('link-title');
const elUrlInput = document.getElementById('link-url');
const elDeleteBtn = document.getElementById('link-delete');

/* ── Defaults ─────────────────────────── */

const DEFAULTS = [
  { id: '1', title: 'YouTube', url: 'https://www.youtube.com' },
  { id: '2', title: 'X',        url: 'https://x.com' },
  { id: '3', title: 'GitHub',   url: 'https://github.com' },
];

/* ── State ────────────────────────────── */

let links = [];
let editingId = null;

/* ── Helpers ──────────────────────────── */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* corrupted — fall through to defaults */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
  return [...DEFAULTS];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

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

function iconUrl(link) {
  const slug = domainToSlug(link.url);
  if (!slug) return null;
  const dark = document.documentElement.hasAttribute('data-theme');
  // GitHub's brand color (181717) is too dark for dark-mode cards
  if (slug === 'github') {
    return `https://cdn.simpleicons.org/github/${dark ? 'FFFFFF' : '181717'}`;
  }
  return `https://cdn.simpleicons.org/${slug}`;
}

function fallbackLetter(title) {
  return (title || '?').charAt(0).toUpperCase();
}

/* ── Render ───────────────────────────── */

function render() {
  elGrid.innerHTML = '';

  links.forEach((link) => {
    const li = document.createElement('li');

    const a = document.createElement('a');
    a.className = 'link-item';
    a.href = link.url;
    a.title = link.title;
    a.setAttribute('data-id', link.id);

    // Icon wrapper
    const iconWrap = document.createElement('div');
    iconWrap.className = 'link-icon-wrapper';

    const img = document.createElement('img');
    const src = iconUrl(link);
    img.src = src || '';
    img.alt = '';
    // 图标是小型 SVG，eager 加载避免延迟
    img.loading = 'eager';

    // Fallback on error: use first letter of title
    img.onerror = ((lnk) => () => {
      const fb = document.createElement('div');
      fb.className = 'link-icon-fallback';
      fb.textContent = fallbackLetter(lnk.title);
      img.replaceWith(fb);
    })(link);

    // Also handle empty src (when slug extraction fails)
    if (!src) {
      const fb = document.createElement('div');
      fb.className = 'link-icon-fallback';
      fb.textContent = fallbackLetter(link.title);
      iconWrap.appendChild(fb);
    } else {
      iconWrap.appendChild(img);
    }

    a.appendChild(iconWrap);

    // Label
    const label = document.createElement('span');
    label.className = 'link-label';
    label.textContent = link.title;
    a.appendChild(label);

    li.appendChild(a);
    elGrid.appendChild(li);
  });

  // Add button
  const addLi = document.createElement('li');
  const addBtn = document.createElement('button');
  addBtn.className = 'link-add';
  addBtn.innerHTML =
    '<span class="link-add-icon">+</span><span class="link-add-label">添加</span>';
  addBtn.addEventListener('click', () => openDialog());
  addLi.appendChild(addBtn);
  elGrid.appendChild(addLi);
}

/* ── Dialogs ──────────────────────────── */

function openDialog(id = null) {
  editingId = id;
  elForm.reset();

  if (id) {
    const link = links.find((l) => l.id === id);
    if (link) {
      elTitleInput.value = link.title;
      elUrlInput.value = link.url;
      elDeleteBtn.hidden = false;
    }
  } else {
    elDeleteBtn.hidden = true;
  }

  elDialog.showModal();
  if (elTitleInput.value) {
    elUrlInput.focus();
  } else {
    elTitleInput.focus();
  }
}

function closeDialog() {
  elDialog.close();
  editingId = null;
}

function handleSave(e) {
  e.preventDefault();
  const title = elTitleInput.value.trim();
  let url = elUrlInput.value.trim();

  if (!title || !url) return;

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  if (editingId) {
    const idx = links.findIndex((l) => l.id === editingId);
    if (idx !== -1) links[idx] = { ...links[idx], title, url };
  } else {
    links.push({ id: makeId(), title, url });
  }

  save();
  render();
  closeDialog();
}

function handleDelete() {
  if (!editingId) return;
  links = links.filter((l) => l.id !== editingId);
  save();
  render();
  closeDialog();
}

function handleContextMenu(e) {
  const a = e.target.closest('.link-item');
  if (!a) return;
  e.preventDefault();
  const id = a.getAttribute('data-id');
  if (id) openDialog(id);
}

/* ── Init ─────────────────────────────── */

export function initLinks() {
  links = load();
  render();

  // Double-click to edit
  elGrid.addEventListener('dblclick', (e) => {
    const a = e.target.closest('.link-item');
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute('data-id');
    if (id) openDialog(id);
  });

  // Right-click to edit
  elGrid.addEventListener('contextmenu', handleContextMenu);

  // Dialog handlers
  elForm.addEventListener('submit', handleSave);
  elForm.querySelector('[value="cancel"]').addEventListener('click', closeDialog);
  elDeleteBtn.addEventListener('click', handleDelete);

  elDialog.addEventListener('click', (e) => {
    if (e.target === elDialog) closeDialog();
  });
  elDialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeDialog();
  });

  // Theme change: 只更新图标 src，避免完全重建 DOM（已加载的图标会闪一下）
  window.addEventListener('theme-changed', () => {
    document.querySelectorAll('.link-item img').forEach((img) => {
      const a = img.closest('.link-item');
      const id = a?.getAttribute('data-id');
      const link = links.find((l) => l.id === id);
      if (link) {
        const newSrc = iconUrl(link);
        // 只有 URL 真正变化（如 GitHub 切换配色）才更新 src
        if (newSrc && newSrc !== img.src) img.src = newSrc;
      }
    });
  });
}
