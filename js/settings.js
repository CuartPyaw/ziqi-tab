/**
 * Settings — left-right split panel with search width and engine management.
 */

import { getAllEngines, getCurrentEngine } from './search.js';
import { getAiSites, saveAiSites } from './ai.js';

const elSettingsBtn = document.getElementById('settings-toggle');
const elDialog = document.getElementById('settings-dialog');
const elSlider = document.getElementById('search-width');
const elValue = document.getElementById('search-width-value');
const elSave = document.getElementById('settings-save');
const elNav = document.getElementById('settings-nav');
const elEngineList = document.getElementById('engine-list');
const elEngineAddBtn = document.getElementById('engine-add-btn');
const elEngineFormDialog = document.getElementById('engine-form-dialog');
const elEngineForm = document.getElementById('engine-form');
const elEngineFormTitle = document.getElementById('engine-form-title');
const elEngineName = document.getElementById('engine-name');
const elEngineUrl = document.getElementById('engine-url');
const elAiSiteList = document.getElementById('ai-site-list');
const elAiSiteAddBtn = document.getElementById('ai-site-add-btn');
const elAiSiteFormDialog = document.getElementById('ai-site-form-dialog');
const elAiSiteForm = document.getElementById('ai-site-form');
const elAiSiteFormTitle = document.getElementById('ai-site-form-title');
const elAiSiteName = document.getElementById('ai-site-name');
const elAiSiteShortcut = document.getElementById('ai-site-shortcut');
const elAiSiteUrl = document.getElementById('ai-site-url');
const WIDTH_KEY = 'ziqi-search-width';
const CUSTOM_KEY = 'ziqi-engines';
const ORDER_KEY = 'ziqi-engine-order';

/* ── Search bar width ──────────────────── */

function getStoredWidth() {
  try {
    const v = localStorage.getItem(WIDTH_KEY);
    if (v !== null) {
      const n = parseInt(v, 10);
      if (n >= 360 && n <= 720) return n;
    }
  } catch (_) { /* fall through */ }
  return 520;
}

let storedWidth = 520;

function applyWidth(val) {
  document.documentElement.style.setProperty('--search-width', val + 'px');
}

function saveWidth(val) {
  storedWidth = val;
  localStorage.setItem(WIDTH_KEY, String(val));
  applyWidth(val);
}

function updateDisplay() {
  elValue.textContent = elSlider.value + 'px';
}

/* ── Tab switching ─────────────────────── */

function switchTab(tabName) {
  elNav.querySelectorAll('.settings-nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.settings-panel').forEach(panel => {
    panel.classList.toggle('active', panel.getAttribute('data-panel') === tabName);
  });
}

/* ── Engine management ─────────────────── */

function renderEngineList() {
  elEngineList.innerHTML = '';
  const engines = getAllEngines();

  engines.forEach(engine => {
    const li = document.createElement('li');

    if (engine.builtin) {
      li.className = 'engine-list-item engine-list-item--preset';
      li.innerHTML = `<span>${engine.name}</span><span class="engine-list-item-badge">预设</span>`;
    } else {
      li.className = 'engine-list-item';
      li.innerHTML = `<span>${engine.name}</span>`;
      const actions = document.createElement('span');
      actions.className = 'engine-list-item-actions';
      actions.innerHTML = `
        <button type="button" class="engine-list-action-btn" data-action="edit" data-id="${engine.id}" title="编辑">✏️</button>
        <button type="button" class="engine-list-action-btn" data-action="delete" data-id="${engine.id}" title="删除">🗑️</button>
      `;
      li.appendChild(actions);
    }

    elEngineList.appendChild(li);
  });

  // Bind action buttons
  elEngineList.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openEngineForm(btn.getAttribute('data-id')));
  });
  elEngineList.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteEngine(btn.getAttribute('data-id')));
  });
}

let editingEngineId = null;

function openEngineForm(engineId = null) {
  editingEngineId = engineId;

  if (engineId) {
    elEngineFormTitle.textContent = '编辑搜索引擎';
    const engines = getAllEngines();
    const engine = engines.find(e => e.id === engineId);
    if (engine) {
      elEngineName.value = engine.name;
      elEngineUrl.value = engine.url;
    }
  } else {
    elEngineFormTitle.textContent = '添加搜索引擎';
    elEngineName.value = '';
    elEngineUrl.value = '';
  }

  elEngineFormDialog.showModal();
}

function saveEngine() {
  const name = elEngineName.value.trim();
  const url = elEngineUrl.value.trim();

  // Validation
  if (!name) {
    alert('引擎名称不能为空');
    return;
  }
  if (!url.startsWith('https://')) {
    alert('搜索 URL 必须以 https:// 开头');
    return;
  }

  // Duplicate name check
  const engines = getAllEngines();
  const duplicate = engines.find(e => e.name === name && e.id !== editingEngineId);
  if (duplicate) {
    alert('引擎名称已存在，请使用不同的名称');
    return;
  }

  // Load current custom engines
  let customs;
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    customs = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(customs)) customs = [];
  } catch (_) { customs = []; }

  if (editingEngineId) {
    // Edit existing
    customs = customs.map(e => {
      if (e.id === editingEngineId) {
        return { ...e, name, url };
      }
      return e;
    });
  } else {
    // Add new
    const id = crypto.randomUUID().slice(0, 8);
    customs.push({ id, name, url, builtin: false });

    // Update order
    const order = getEngineOrderInternal();
    order.push(id);
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }

  localStorage.setItem(CUSTOM_KEY, JSON.stringify(customs));
  elEngineFormDialog.close();
  renderEngineList();
  window.dispatchEvent(new CustomEvent('engines-changed'));
}

function deleteEngine(id) {
  let customs;
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    customs = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(customs)) customs = [];
  } catch (_) { customs = []; }

  customs = customs.filter(e => e.id !== id);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(customs));

  // Remove from order
  const order = getEngineOrderInternal().filter(oid => oid !== id);
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));

  renderEngineList();
  window.dispatchEvent(new CustomEvent('engines-changed'));
}

function getEngineOrderInternal() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
  } catch (_) {}
  // Fallback: builtins + customs
  let customs;
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    customs = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(customs)) customs = [];
  } catch (_) { customs = []; }
  return ['google', 'bing', 'duckduckgo', ...customs.map(e => e.id)];
}

/* ── AI site management ────────────────── */

function aiSiteIconUrl(site) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(site.url)}&size=32`);
  }
  return `https://cdn.simpleicons.org/${site.id}`;
}

function renderAiSiteList() {
  elAiSiteList.innerHTML = '';
  getAiSites().forEach(site => {
    const li = document.createElement('li');
    li.className = 'ai-site-list-item';

    const type = document.createElement('span');
    type.className = 'ai-site-type';
    type.textContent = 'AI';

    const icon = document.createElement('img');
    icon.className = 'ai-site-icon';
    icon.src = aiSiteIconUrl(site);
    icon.alt = '';
    icon.onerror = () => icon.setAttribute('hidden', '');

    const details = document.createElement('span');
    details.className = 'ai-site-details';
    details.innerHTML = `<span class="ai-site-name"></span><span class="ai-site-template"></span>`;
    details.querySelector('.ai-site-name').textContent = site.name;
    details.querySelector('.ai-site-template').textContent = `${site.shortcut} · ${site.url}`;

    const actions = document.createElement('span');
    actions.className = 'engine-list-item-actions';
    actions.innerHTML = `
      <button type="button" class="engine-list-action-btn" data-ai-action="edit" data-id="${site.id}" title="编辑">✏️</button>
      <button type="button" class="engine-list-action-btn" data-ai-action="delete" data-id="${site.id}" title="删除">🗑️</button>
    `;

    li.append(type, icon, details, actions);
    elAiSiteList.appendChild(li);
  });

  elAiSiteList.querySelectorAll('[data-ai-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openAiSiteForm(btn.getAttribute('data-id')));
  });
  elAiSiteList.querySelectorAll('[data-ai-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteAiSite(btn.getAttribute('data-id')));
  });
}

let editingAiSiteId = null;

function openAiSiteForm(siteId = null) {
  editingAiSiteId = siteId;
  const site = getAiSites().find(item => item.id === siteId);
  elAiSiteFormTitle.textContent = site ? '编辑 AI 网站' : '添加 AI 网站';
  elAiSiteName.value = site?.name || '';
  elAiSiteShortcut.value = site?.shortcut || '';
  elAiSiteUrl.value = site?.url || '';
  elAiSiteFormDialog.showModal();
}

function saveAiSite() {
  const name = elAiSiteName.value.trim();
  const shortcut = elAiSiteShortcut.value.trim().toLowerCase();
  const url = elAiSiteUrl.value.trim();
  const sites = getAiSites();

  if (!name || !shortcut) {
    alert('名称和快捷词不能为空');
    return;
  }
  if (!/^[a-z0-9_-]+$/.test(shortcut)) {
    alert('快捷词只能包含字母、数字、连字符或下划线');
    return;
  }
  if (!url.startsWith('https://')) {
    alert('URL 模板必须以 https:// 开头');
    return;
  }
  if (sites.some(site => site.shortcut.toLowerCase() === shortcut && site.id !== editingAiSiteId)) {
    alert('快捷词已存在，请使用不同的快捷词');
    return;
  }

  const nextSite = { id: editingAiSiteId || crypto.randomUUID().slice(0, 8), name, shortcut, url };
  const nextSites = editingAiSiteId
    ? sites.map(site => site.id === editingAiSiteId ? nextSite : site)
    : [...sites, nextSite];

  saveAiSites(nextSites);
  elAiSiteFormDialog.close();
  renderAiSiteList();
  window.dispatchEvent(new CustomEvent('ai-sites-changed'));
}

function deleteAiSite(siteId) {
  saveAiSites(getAiSites().filter(site => site.id !== siteId));
  renderAiSiteList();
  window.dispatchEvent(new CustomEvent('ai-sites-changed'));
}

/* ── Dialog ────────────────────────────── */

function openDialog() {
  elSlider.value = storedWidth;
  updateDisplay();
  renderEngineList();
  renderAiSiteList();
  switchTab('search');
  elDialog.showModal();
}

function closeDialog() {
  elDialog.close();
}

function handleSave() {
  saveWidth(Number(elSlider.value));
  closeDialog();
}

function handleCancel() {
  elSlider.value = storedWidth;
  updateDisplay();
  closeDialog();
}

/* ── Init ──────────────────────────────── */

export function initSettings() {
  // Restore saved width
  storedWidth = getStoredWidth();
  applyWidth(storedWidth);

  // Slider
  elSlider.addEventListener('input', updateDisplay);

  // Save / Cancel
  elSave.addEventListener('click', handleSave);
  elDialog.querySelector('[value="cancel"]').addEventListener('click', handleCancel);

  // Open
  elSettingsBtn.addEventListener('click', openDialog);

  // Close on backdrop click → cancel
  elDialog.addEventListener('click', (e) => {
    if (e.target === elDialog) handleCancel();
  });

  // ESC → cancel
  elDialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    handleCancel();
  });

  // Tab switching
  elNav.addEventListener('click', (e) => {
    const item = e.target.closest('.settings-nav-item');
    if (!item) return;
    switchTab(item.getAttribute('data-tab'));
  });

  // Engine add button
  elEngineAddBtn.addEventListener('click', () => openEngineForm(null));

  // Engine form submission
  elEngineForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEngine();
  });

  // Engine form cancel
  elEngineForm.querySelector('[value="cancel"]').addEventListener('click', () => {
    elEngineFormDialog.close();
  });

  // Engine form backdrop click → close
  elEngineFormDialog.addEventListener('click', (e) => {
    if (e.target === elEngineFormDialog) elEngineFormDialog.close();
  });

  // Engine form closed → reopen settings if it was open
  elEngineFormDialog.addEventListener('close', () => {
    if (elDialog.open) {
      elDialog.showModal();
    }
  });

  elAiSiteAddBtn.addEventListener('click', () => openAiSiteForm());
  elAiSiteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveAiSite();
  });
  elAiSiteForm.querySelector('[value="cancel"]').addEventListener('click', () => {
    elAiSiteFormDialog.close();
  });
  elAiSiteFormDialog.addEventListener('click', (e) => {
    if (e.target === elAiSiteFormDialog) elAiSiteFormDialog.close();
  });
  elAiSiteFormDialog.addEventListener('close', () => {
    if (elDialog.open) elDialog.showModal();
  });

  // Listen for external engine changes to refresh list
  window.addEventListener('engines-changed', () => {
    renderEngineList();
  });

}
