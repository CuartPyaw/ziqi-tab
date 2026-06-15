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
const elIconInput = document.getElementById('link-icon');

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

function resolveIconUrl(link) {
  if (link.icon && link.icon.length > 0) return link.icon;
  return iconUrl(link);
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
    a.draggable = true;
    a.setAttribute('data-id', link.id);

    // Icon wrapper
    const iconWrap = document.createElement('div');
    iconWrap.className = 'link-icon-wrapper';

    const img = document.createElement('img');
    const src = resolveIconUrl(link);
    img.src = src || '';
    img.alt = '';
    img.loading = 'eager';

    // 三级回退：自定义 URL → Simple Icons CDN → 首字母
    img.onerror = ((lnk) => () => {
      if (lnk.icon && img.src === lnk.icon) {
        const cdnSrc = iconUrl(lnk);
        if (cdnSrc) {
          img.src = cdnSrc;
          return;
        }
      }
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
      elIconInput.value = link.icon || '';
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
  const icon = elIconInput.value.trim();

  if (!title || !url) return;

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  if (editingId) {
    const idx = links.findIndex((l) => l.id === editingId);
    if (idx !== -1) links[idx] = { ...links[idx], title, url, icon };
  } else {
    links.push({ id: makeId(), title, url, icon });
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

/* ── Drag & Drop ───────────────────────── */

let dragSourceIndex = -1;
let dragOverTarget = null;

function handleDragStart(e) {
  const a = e.target.closest('.link-item');
  if (!a) return;
  dragSourceIndex = links.findIndex((l) => l.id === a.getAttribute('data-id'));
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', ''); // Required for Firefox
  a.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const a = e.target.closest('.link-item');
  if (a === dragOverTarget) return;

  if (dragOverTarget) dragOverTarget.classList.remove('drag-over');
  if (a) {
    a.classList.add('drag-over');
    dragOverTarget = a;
  } else {
    dragOverTarget = null;
  }
}

function handleDrop(e) {
  e.preventDefault();
  if (dragSourceIndex === -1) return;

  const targetA = e.target.closest('.link-item');
  let targetIndex;

  if (targetA) {
    const targetId = targetA.getAttribute('data-id');
    targetIndex = links.findIndex((l) => l.id === targetId);
  } else if (e.target.closest('.link-add')) {
    // Dropped on the add button → append to end
    targetIndex = links.length;
  } else {
    return;
  }

  if (targetIndex === -1 || targetIndex === dragSourceIndex) return;

  const [moved] = links.splice(dragSourceIndex, 1);
  // Insert at the original target position — the target shifts naturally
  // when source < target (splice removed one before it), so original
  // targetIndex is already the correct insertion point.
  links.splice(targetIndex, 0, moved);

  save();
  render();
}

function handleDragEnd(e) {
  const a = e.target.closest('.link-item');
  if (a) a.classList.remove('dragging');
  if (dragOverTarget) {
    dragOverTarget.classList.remove('drag-over');
    dragOverTarget = null;
  }
  dragSourceIndex = -1;
}

/* ── Init ─────────────────────────────── */

export { domainToSlug, iconUrl, resolveIconUrl, fallbackLetter };

export function initLinks() {
  links = load();
  render();

  // Click with pulse animation → progress bar → navigate (two-stage)

  elGrid.addEventListener('click', (e) => {
    // Only intercept primary-button left clicks without modifier keys.
    // Middle-click, Ctrl/Cmd+click, Shift+click use default browser behavior.
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;

    const a = e.target.closest('.link-item');
    if (!a || !a.href) return;
    e.preventDefault();

    const href = a.href;
    const progressBar = document.getElementById('nav-progress');

    // Stage 1: click pulse (faster than hover, single cycle)
    a.classList.add('click-pulse', 'animate__pulse');

    a.addEventListener('animationend', function onPulseEnd() {
      a.removeEventListener('animationend', onPulseEnd);
      a.classList.remove('click-pulse', 'animate__pulse');

      // Stage 2: nav progress bar
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.addEventListener('transitionend', () => {
          window.location.href = href;
        }, { once: true });
      } else {
        window.location.href = href;
      }
    }, { once: true });
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
      // 自定义图标 URL 不随主题变化，跳过
      if (link && !link.icon) {
        const newSrc = iconUrl(link);
        // 只有 URL 真正变化（如 GitHub 切换配色）才更新 src
        if (newSrc && newSrc !== img.src) img.src = newSrc;
      }
    });
  });

  // Drag & drop reorder
  elGrid.addEventListener('dragstart', handleDragStart);
  elGrid.addEventListener('dragover', handleDragOver);
  elGrid.addEventListener('drop', handleDrop);
  elGrid.addEventListener('dragend', handleDragEnd);
}
