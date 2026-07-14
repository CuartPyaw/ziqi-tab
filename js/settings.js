/**
 * Settings persistence and the standalone settings page.
 */

import { getAllEngines, getCurrentEngine, restoreCurrentEngine, setCurrentEngine } from './search.js';
import { getAiSites, saveAiSites } from './ai.js';
import { getRecentPreferences, setRecentEnabled, setRecentLimit } from './recent.js';
import { getTodosEnabled, setTodosEnabled } from './todos.js';

const WIDTH_KEY = 'ziqi-search-width';
const CUSTOM_KEY = 'ziqi-engines';
const ORDER_KEY = 'ziqi-engine-order';

let storedWidth = 520;
let editingEngineId = null;
let editingAiSiteId = null;

function getStoredWidth() {
  try {
    const value = localStorage.getItem(WIDTH_KEY);
    if (value !== null) {
      const width = parseInt(value, 10);
      if (width >= 360 && width <= 720) return width;
    }
  } catch (_) { /* Use the default width. */ }
  return 520;
}

function applyWidth(value) {
  document.documentElement.style.setProperty('--search-width', `${value}px`);
}

function saveWidth(value) {
  storedWidth = value;
  localStorage.setItem(WIDTH_KEY, String(value));
  applyWidth(value);
}

export function initSettingsLink() {
  storedWidth = getStoredWidth();
  applyWidth(storedWidth);
}

function getEngineOrder() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) {
      const order = JSON.parse(raw);
      if (Array.isArray(order)) return order;
    }
  } catch (_) { /* Build the default order below. */ }

  try {
    const customs = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
    if (Array.isArray(customs)) return ['google', 'bing', 'duckduckgo', ...customs.map(engine => engine.id)];
  } catch (_) { /* Use the built-in engines. */ }
  return ['google', 'bing', 'duckduckgo'];
}

function loadCustomEngines() {
  try {
    const engines = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
    return Array.isArray(engines) ? engines : [];
  } catch (_) {
    return [];
  }
}

function showEngineList() {
  document.getElementById('engine-list-view').hidden = false;
  document.getElementById('engine-form').hidden = true;
}

function showAiSiteList() {
  document.getElementById('ai-site-list-view').hidden = false;
  document.getElementById('ai-site-form').hidden = true;
}

function initDashboardSettings() {
  const recentEnabled = document.getElementById('recent-enabled');
  const todoEnabled = document.getElementById('todos-enabled');
  if (!recentEnabled || !todoEnabled) return;

  const preferences = getRecentPreferences();
  recentEnabled.checked = preferences.enabled;
  document.querySelector(`input[name="recent-limit"][value="${preferences.limit}"]`).checked = true;
  todoEnabled.checked = getTodosEnabled();

  recentEnabled.addEventListener('change', event => setRecentEnabled(event.currentTarget.checked));
  document.getElementById('recent-limit-group').addEventListener('change', event => {
    if (event.target.matches('input[name="recent-limit"]')) setRecentLimit(Number(event.target.value));
  });
  todoEnabled.addEventListener('change', event => setTodosEnabled(event.currentTarget.checked));
}

function switchTab(tabName) {
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });
  document.querySelectorAll('.settings-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.panel === tabName);
  });

  if (tabName === 'engines') showEngineList();
  if (tabName === 'ai') showAiSiteList();
}

function renderEngineList() {
  const list = document.getElementById('engine-list');
  list.innerHTML = '';

  getAllEngines().forEach(engine => {
    const item = document.createElement('li');
    item.className = engine.builtin ? 'engine-list-item engine-list-item--preset' : 'engine-list-item';

    const name = document.createElement('span');
    name.textContent = engine.name;
    item.appendChild(name);

    if (engine.builtin) {
      const badge = document.createElement('span');
      badge.className = 'engine-list-item-badge';
      badge.textContent = '预设';
      item.appendChild(badge);
    } else {
      const actions = document.createElement('span');
      actions.className = 'engine-list-item-actions';
      actions.innerHTML = `<button type="button" class="engine-list-action-btn" data-action="edit" data-id="${engine.id}" title="编辑">✏️</button>`;
      item.appendChild(actions);
    }

    const selection = document.createElement('input');
    selection.type = 'radio';
    selection.name = 'default-engine';
    selection.className = 'engine-default-radio';
    selection.value = engine.id;
    selection.checked = engine.id === getCurrentEngine().id;
    selection.setAttribute('aria-label', `将 ${engine.name} 设为默认搜索引擎`);
    selection.addEventListener('change', () => {
      if (selection.checked) {
        setCurrentEngine(engine.id);
        renderEngineList();
      }
    });
    item.appendChild(selection);
    list.appendChild(item);
  });

  list.querySelectorAll('[data-action="edit"]').forEach(button => {
    button.addEventListener('click', () => openEngineForm(button.dataset.id));
  });
}

function openEngineForm(engineId = null) {
  editingEngineId = engineId;
  const form = document.getElementById('engine-form');
  const engine = getAllEngines().find(item => item.id === engineId);

  document.getElementById('engine-form-title').textContent = engine ? '编辑搜索引擎' : '添加搜索引擎';
  document.getElementById('engine-name').value = engine?.name || '';
  document.getElementById('engine-url').value = engine?.url || '';
  document.getElementById('engine-delete').hidden = !engine;
  document.getElementById('engine-list-view').hidden = true;
  form.hidden = false;
}

function saveEngine() {
  const name = document.getElementById('engine-name').value.trim();
  const url = document.getElementById('engine-url').value.trim();
  if (!name) {
    alert('引擎名称不能为空');
    return;
  }
  if (!url.startsWith('https://')) {
    alert('搜索 URL 必须以 https:// 开头');
    return;
  }

  const engines = getAllEngines();
  if (engines.some(engine => engine.name === name && engine.id !== editingEngineId)) {
    alert('引擎名称已存在，请使用不同的名称');
    return;
  }

  let customs = loadCustomEngines();
  if (editingEngineId) {
    customs = customs.map(engine => engine.id === editingEngineId ? { ...engine, name, url } : engine);
  } else {
    const id = crypto.randomUUID().slice(0, 8);
    customs.push({ id, name, url, builtin: false });
    localStorage.setItem(ORDER_KEY, JSON.stringify([...getEngineOrder(), id]));
  }

  localStorage.setItem(CUSTOM_KEY, JSON.stringify(customs));
  showEngineList();
  renderEngineList();
  window.dispatchEvent(new CustomEvent('engines-changed'));
}

function deleteEngine() {
  if (!editingEngineId) return;
  const deletedWasCurrent = getCurrentEngine().id === editingEngineId;
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(loadCustomEngines().filter(engine => engine.id !== editingEngineId)));
  localStorage.setItem(ORDER_KEY, JSON.stringify(getEngineOrder().filter(id => id !== editingEngineId)));
  if (deletedWasCurrent) setCurrentEngine('google');

  showEngineList();
  renderEngineList();
  window.dispatchEvent(new CustomEvent('engines-changed'));
}

function aiSiteIconUrl(site) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(site.url)}&size=32`);
  }
  return `https://cdn.simpleicons.org/${site.id}`;
}

function renderAiSiteList() {
  const list = document.getElementById('ai-site-list');
  list.innerHTML = '';

  getAiSites().forEach(site => {
    const item = document.createElement('li');
    item.className = 'ai-site-list-item';
    item.innerHTML = `
      <span class="ai-site-type">AI</span>
      <img class="ai-site-icon" src="${aiSiteIconUrl(site)}" alt="">
      <span class="ai-site-details"><span class="ai-site-name"></span><span class="ai-site-template"></span></span>
      <span class="engine-list-item-actions"><button type="button" class="engine-list-action-btn" data-ai-action="edit" data-id="${site.id}" title="编辑">✏️</button></span>
    `;
    item.querySelector('.ai-site-name').textContent = site.name;
    item.querySelector('.ai-site-template').textContent = `${site.shortcut} · ${site.url}`;
    item.querySelector('.ai-site-icon').onerror = event => event.currentTarget.setAttribute('hidden', '');
    list.appendChild(item);
  });

  list.querySelectorAll('[data-ai-action="edit"]').forEach(button => {
    button.addEventListener('click', () => openAiSiteForm(button.dataset.id));
  });
}

function openAiSiteForm(siteId = null) {
  editingAiSiteId = siteId;
  const site = getAiSites().find(item => item.id === siteId);
  document.getElementById('ai-site-form-title').textContent = site ? '编辑 AI 网站' : '添加 AI 网站';
  document.getElementById('ai-site-name').value = site?.name || '';
  document.getElementById('ai-site-shortcut').value = site?.shortcut || '';
  document.getElementById('ai-site-url').value = site?.url || '';
  document.getElementById('ai-site-delete').hidden = !site;
  document.getElementById('ai-site-list-view').hidden = true;
  document.getElementById('ai-site-form').hidden = false;
}

function saveAiSite() {
  const name = document.getElementById('ai-site-name').value.trim();
  const shortcut = document.getElementById('ai-site-shortcut').value.trim().toLowerCase();
  const url = document.getElementById('ai-site-url').value.trim();
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
  saveAiSites(editingAiSiteId
    ? sites.map(site => site.id === editingAiSiteId ? nextSite : site)
    : [...sites, nextSite]);
  showAiSiteList();
  renderAiSiteList();
  window.dispatchEvent(new CustomEvent('ai-sites-changed'));
}

function deleteAiSite() {
  if (!editingAiSiteId) return;
  saveAiSites(getAiSites().filter(site => site.id !== editingAiSiteId));
  showAiSiteList();
  renderAiSiteList();
  window.dispatchEvent(new CustomEvent('ai-sites-changed'));
}

export function initSettingsPage() {
  storedWidth = getStoredWidth();
  applyWidth(storedWidth);
  restoreCurrentEngine();
  document.getElementById('search-width').value = storedWidth;
  document.getElementById('search-width-value').textContent = `${storedWidth}px`;
  renderEngineList();
  renderAiSiteList();
  initDashboardSettings();

  document.getElementById('search-width').addEventListener('input', event => {
    saveWidth(Number(event.currentTarget.value));
    document.getElementById('search-width-value').textContent = `${event.currentTarget.value}px`;
  });
  document.getElementById('settings-nav').addEventListener('click', event => {
    const item = event.target.closest('.settings-nav-item');
    if (item) switchTab(item.dataset.tab);
  });
  document.getElementById('engine-add-btn').addEventListener('click', () => openEngineForm());
  document.getElementById('engine-form-cancel').addEventListener('click', showEngineList);
  document.getElementById('engine-form').addEventListener('submit', event => {
    event.preventDefault();
    saveEngine();
  });
  document.getElementById('engine-delete').addEventListener('click', deleteEngine);
  document.getElementById('ai-site-add-btn').addEventListener('click', () => openAiSiteForm());
  document.getElementById('ai-site-form-cancel').addEventListener('click', showAiSiteList);
  document.getElementById('ai-site-form').addEventListener('submit', event => {
    event.preventDefault();
    saveAiSite();
  });
  document.getElementById('ai-site-delete').addEventListener('click', deleteAiSite);
  window.addEventListener('engines-changed', renderEngineList);
}
