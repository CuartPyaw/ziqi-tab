/**
 * Test setup — runs before every test file in the jsdom environment.
 *
 * 1. Injects the full DOM skeleton so modules can resolve getElementById at import time.
 * 2. Mocks browser APIs that jsdom doesn't implement (matchMedia).
 */

import { vi } from 'vitest';

// ── Dialog Polyfill ─────────────────────────
// jsdom does not implement HTMLDialogElement.showModal() / close().
// Provide minimal stubs so that initLinks / initSettings don't throw.

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
    // Dispatch a 'close' event when form method=dialog submits (polyfill below).
  };
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
}


// jsdom does not implement matchMedia
const matchMediaMock = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: (_type, _cb) => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});
vi.stubGlobal('matchMedia', matchMediaMock);
vi.stubGlobal('alert', vi.fn());

// jsdom does not implement navigator.clipboard
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    writable: true,
    configurable: true,
  });
}

// ── DataTransfer Polyfill ──────────────────
// jsdom does not implement DataTransfer / DragEvent.dataTransfer.
// Provide minimal stubs so drag-and-drop tests can construct and dispatch events.

class DataTransfer {
  constructor() {
    this._data = {};
    this.effectAllowed = 'none';
    this.dropEffect = 'none';
  }
  setData(format, data) {
    this._data[format] = data;
  }
  getData(format) {
    return this._data[format] || '';
  }
  clearData() {
    this._data = {};
  }
}
vi.stubGlobal('DataTransfer', DataTransfer);

// ── DOM Skeleton ───────────────────────────

document.body.innerHTML = `
<div id="nav-progress" class="nav-progress"></div>
<div class="container">
  <div class="page page--main page--active">
  <header class="hero">
    <div class="hero-stage">
      <div id="clock-display">
        <div class="day-row">
          <span id="date">----年--月--日</span>
        </div>
        <div class="time" id="time">
          <span id="time-hm">--:--</span>
          <span id="time-sec" class="time-sec">:--</span>
        </div>
        <p class="moment-line" id="greeting">--</p>
      </div>
    </div>

    <div class="search-wrapper">
      <div class="search-bar" id="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <span class="ai-search-chip" id="ai-search-chip" hidden><img id="ai-search-chip-icon" alt=""><span id="ai-search-chip-name"></span></span>
        <input type="text" id="search-input" class="search-input" placeholder="搜索…" autofocus autocomplete="off">
      </div>
      <div class="search-suggestions" id="search-suggestions" hidden>
        <div class="search-suggestion-list" id="search-suggestion-list" role="listbox" aria-label="搜索建议"></div>
      </div>
    </div>
  </header>

  <div class="content-stage" id="content-stage">
  <section class="quick-links" id="quick-links">
    <ul class="links-grid" id="links-grid"></ul>
  </section>
  <section class="recent-sites" id="recent-sites" hidden>
    <h4 class="recent-label">最近浏览</h4>
    <ul class="recent-grid" id="recent-grid"></ul>
  </section>
    </div>
    </div>
  </div>

<footer class="settings-bar">
    <button id="extensions-shortcut" class="settings-btn" type="button" title="扩展程序" aria-label="扩展程序" data-browser-url="chrome://extensions/">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 12.5V8a2 2 0 0 0-2-2h-4.5a2.5 2.5 0 0 1-5 0H4a2 2 0 0 0-2 2v4.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1-5 0V20a2 2 0 0 0 2 2h4.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5H20a2 2 0 0 0 2-2v-4.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1 5 0Z"/></svg>
    </button>
    <button id="bookmarks-shortcut" class="settings-btn" type="button" title="书签" aria-label="书签" data-browser-url="chrome://bookmarks/">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </button>
    <button id="history-shortcut" class="settings-btn" type="button" title="历史记录" aria-label="历史记录" data-browser-url="chrome://history/">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
    </button>
    <button id="settings-toggle" class="settings-btn" title="设置">
      <svg viewBox="0 0 24 24"><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
    </button>
    <button id="theme-toggle" class="settings-btn" title="切换深色/浅色模式">
      <svg class="icon-moon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      <svg class="icon-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    </button>
  </footer>

<dialog id="link-dialog" class="link-dialog">
  <form method="dialog" id="link-form">
    <h3 class="dialog-title">编辑快捷链接</h3>
    <label class="dialog-label">
      名称
      <input type="text" id="link-title" class="dialog-input" placeholder="例如：GitHub" required>
    </label>
    <label class="dialog-label">
      网址
      <input type="url" id="link-url" class="dialog-input" placeholder="https://" required>
    </label>
    <label class="dialog-label">
      图标 URL（可选）
      <input type="url" id="link-icon" class="dialog-input" placeholder="自定义 SVG 图标 URL，留空则自动获取">
    </label>
    <div class="dialog-actions">
      <button type="button" id="link-delete" class="dialog-btn btn-delete" hidden>删除</button>
      <div class="dialog-actions-right">
        <button type="button" value="cancel" class="dialog-btn btn-cancel">取消</button>
        <button type="submit" class="dialog-btn btn-save">保存</button>
      </div>
    </div>
  </form>
</dialog>

<dialog id="settings-dialog" class="settings-dialog">
  <form method="dialog" class="settings-form">
    <div class="settings-layout">
      <nav class="settings-nav" id="settings-nav">
        <button type="button" class="settings-nav-item active" data-tab="search">搜索栏
        </button>
        <button type="button" class="settings-nav-item" data-tab="engines">
          搜索引擎
        </button>
        <button type="button" class="settings-nav-item" data-tab="ai">AI</button>
      </nav>
      <div class="settings-panels" id="settings-panels">
        <div class="settings-panel active" data-panel="search">
          <h3 class="settings-panel-title">搜索栏</h3>
          <div class="settings-item">
            <label class="settings-label">搜索栏长度</label>
            <div class="settings-row">
              <input type="range" id="search-width" class="settings-slider" min="360" max="720" value="520" step="10">
              <span class="settings-value" id="search-width-value">520px</span>
            </div>
          </div>
        </div>
        <div class="settings-panel" data-panel="engines">
          <h3 class="settings-panel-title">搜索引擎</h3>
          <ul class="engine-list" id="engine-list"></ul>
          <button type="button" class="engine-add-btn" id="engine-add-btn">+ 添加搜索引擎</button>
        </div>
        <div class="settings-panel" data-panel="ai">
          <h3 class="settings-panel-title">AI</h3>
          <ul class="ai-site-list" id="ai-site-list"></ul>
          <button type="button" class="engine-add-btn" id="ai-site-add-btn">+ 添加 AI 网站</button>
        </div>
      </div>
    </div>
  </form>
</dialog>

<dialog id="engine-form-dialog" class="engine-form-dialog" aria-labelledby="engine-form-title">
  <form method="dialog" id="engine-form">
    <h3 class="dialog-title" id="engine-form-title">添加搜索引擎</h3>
    <label class="dialog-label">
      引擎名称
      <input type="text" id="engine-name" class="dialog-input" placeholder="例如：Kagi" required>
    </label>
    <label class="dialog-label">
      搜索 URL
      <input type="url" id="engine-url" class="dialog-input" placeholder="https://kagi.com/search?q=" required>
    </label>
    <p class="dialog-hint">查询词会追加在 URL 末尾</p>
    <div class="dialog-actions">
      <div class="dialog-actions-right">
        <button type="button" value="cancel" class="dialog-btn btn-cancel">取消</button>
        <button type="submit" class="dialog-btn btn-save">保存</button>
      </div>
    </div>
  </form>
</dialog>

<dialog id="ai-site-form-dialog" class="engine-form-dialog" aria-labelledby="ai-site-form-title">
  <form method="dialog" id="ai-site-form">
    <h3 class="dialog-title" id="ai-site-form-title">添加 AI 网站</h3>
    <label class="dialog-label">名称<input type="text" id="ai-site-name" class="dialog-input" required></label>
    <label class="dialog-label">快捷词<input type="text" id="ai-site-shortcut" class="dialog-input" required></label>
    <label class="dialog-label">URL 模板<input type="url" id="ai-site-url" class="dialog-input" required></label>
    <p class="dialog-hint">使用 {query} 将 Prompt 填入 URL；省略时只打开网站。</p>
    <div class="dialog-actions"><div class="dialog-actions-right"><button type="button" value="cancel" class="dialog-btn btn-cancel">取消</button><button type="submit" class="dialog-btn btn-save">保存</button></div></div>
  </form>
</dialog>
`;
