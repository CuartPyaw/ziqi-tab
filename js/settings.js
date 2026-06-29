/**
 * Settings — left-right split panel with search width and engine management.
 */

import { getAllEngines, getCurrentEngine } from './search.js';

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
const WIDTH_KEY = 'ziqi-search-width';
const CUSTOM_KEY = 'ziqi-engines';
const ORDER_KEY = 'ziqi-engine-order';
const VIEW_KEY = 'ziqi-default-view';

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

/* ── Default view ──────────────────────── */

function getDefaultView() {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'links' || v === 'bookmarks') return v;
  } catch (_) { /* fall through */ }
  return 'links';
}

function saveDefaultView(view) {
  localStorage.setItem(VIEW_KEY, view);
  window.dispatchEvent(new CustomEvent('default-view-changed', { detail: { view } }));
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

/* ── Display settings ─────────────────── */

function renderDisplaySettings() {
  const view = getDefaultView();
  document.querySelectorAll('input[name="default-view"]').forEach(radio => {
    radio.checked = radio.value === view;
  });
}

/* ── Dialog ────────────────────────────── */

function openDialog() {
  elSlider.value = storedWidth;
  updateDisplay();
  renderEngineList();
  renderDisplaySettings();
  switchTab('search');
  elDialog.showModal();
}

function closeDialog() {
  elDialog.close();
}

function handleSave() {
  saveWidth(Number(elSlider.value));
  const selectedView = document.querySelector('input[name="default-view"]:checked')?.value || 'links';
  saveDefaultView(selectedView);
  closeDialog();
}

function handleCancel() {
  elSlider.value = storedWidth;
  updateDisplay();
  renderDisplaySettings();
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

  // Engine edit/delete from search menu (events dispatched from search.js)
  document.addEventListener('engine-edit', (e) => {
    openEngineForm(e.detail.id);
  });

  document.addEventListener('engine-delete', (e) => {
    deleteEngine(e.detail.id);
  });

  // Listen for external engine changes to refresh list
  window.addEventListener('engines-changed', () => {
    renderEngineList();
  });

}
