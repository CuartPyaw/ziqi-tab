/**
 * Test setup — runs before every test file in the jsdom environment.
 *
 * 1. Injects the full DOM skeleton so modules can resolve getElementById at import time.
 * 2. Mocks browser APIs that jsdom doesn't implement (AudioContext, Notification, matchMedia).
 */

import { vi } from 'vitest';

// ── Dialog Polyfill ─────────────────────────
// jsdom does not implement HTMLDialogElement.showModal() / close().
// Provide minimal stubs so that initPomodoro / initLinks / initSettings don't throw.

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

// ── Browser API Mocks ─────────────────────

vi.stubGlobal('AudioContext', class {
  constructor() { this.destination = null; }
  createOscillator() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      frequency: { value: 880 },
      type: 'sine',
    };
  }
  createGain() {
    return {
      connect: () => {},
      gain: {
        value: 0.3,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
    };
  }
});

vi.stubGlobal('Notification', class Notification {
  constructor(_title, _opts) { /* no-op */ }
  static permission = 'denied';
  static requestPermission() { return Promise.resolve('denied'); }
});

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

// ── DOM Skeleton ───────────────────────────

document.body.innerHTML = `
<div class="container">
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

      <div id="pomodoro-face" class="pomodoro-face">
        <time class="pomodoro-timer-big" id="pomodoro-timer-big" data-time="25:00"><span class="pomo-d"><span class="pomo-v">2</span></span><span class="pomo-d"><span class="pomo-v">5</span></span><span class="pomo-sep">:</span><span class="pomo-d"><span class="pomo-v">0</span></span><span class="pomo-d"><span class="pomo-v">0</span></span></time>
        <p class="pomodoro-phase-label" id="pomodoro-phase-label">准备</p>
        <div class="pomodoro-sessions" id="pomodoro-sessions">
          <span class="pomodoro-dot" data-n="1"></span>
          <span class="pomodoro-dot" data-n="2"></span>
          <span class="pomodoro-dot" data-n="3"></span>
          <span class="pomodoro-dot" data-n="4"></span>
        </div>
        <div class="pomodoro-tools">
          <div class="pomodoro-modes">
            <button class="pomodoro-mode-btn is-active" data-mode="focus">25</button>
            <button class="pomodoro-mode-btn" data-mode="shortBreak">5</button>
          </div>
          <button id="pomodoro-play" class="pomodoro-tool-btn" title="开始">&#9654;</button>
          <button id="pomodoro-reset" class="pomodoro-tool-btn" title="重置">&#8634;</button>
        </div>
      </div>
    </div>

    <div class="search-wrapper">
      <div class="search-bar" id="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" id="search-input" class="search-input" placeholder="搜索…" autofocus autocomplete="off">
        <div class="engine-dropdown" id="engine-dropdown">
          <button class="engine-trigger" id="engine-trigger" type="button" aria-haspopup="true">
            <img class="engine-icon" id="engine-icon" src="" alt="">
            <svg class="engine-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="engine-menu" id="engine-menu" hidden></div>
        </div>
        <div class="engine-backdrop" id="engine-backdrop" hidden></div>
      </div>
    </div>
  </header>

  <section class="quick-links" id="quick-links">
    <ul class="links-grid" id="links-grid"></ul>
  </section>
</div>

<footer class="settings-bar">
    <button id="settings-toggle" class="settings-btn" title="设置">
      <svg viewBox="0 0 24 24"><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
    </button>
    <button id="theme-toggle" class="settings-btn" title="切换深色/浅色模式">
      <svg class="icon-moon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      <svg class="icon-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    </button>
    <button id="pomodoro-toggle" class="settings-btn" title="番茄钟">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="12" x2="12" y2="8"/><line x1="12" y1="12" x2="15" y2="12"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>
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
      <nav class="settings-nav">
        <button type="button" class="settings-category active" data-category="search">搜索</button>
        <button type="button" class="settings-category" data-category="pomodoro">番茄钟</button>
      </nav>
      <div class="settings-content">
        <div class="settings-section" data-category="search">
          <h3 class="settings-section-title">搜索栏长度</h3>
          <div class="settings-item">
            <input type="range" id="search-width" class="settings-slider" min="360" max="720" value="520" step="10">
            <span class="settings-value" id="search-width-value">520px</span>
          </div>
        </div>
        <div class="settings-section" data-category="pomodoro" hidden>
          <h3 class="settings-section-title">番茄钟</h3>
          <label class="dialog-label">
            专注时长
            <input type="number" id="pomo-work" class="dialog-input" min="1" max="90" value="25"> 分钟
          </label>
          <label class="dialog-label">
            短休息
            <input type="number" id="pomo-short-break" class="dialog-input" min="1" max="30" value="5"> 分钟
          </label>
          <label class="dialog-label">
            长休息
            <input type="number" id="pomo-long-break" class="dialog-input" min="1" max="60" value="15"> 分钟
          </label>
          <label class="dialog-label">
            间隔
            <input type="number" id="pomo-long-interval" class="dialog-input" min="2" max="10" value="4"> 个
          </label>
        </div>
      </div>
    </div>
    <div class="settings-footer">
      <div class="dialog-actions-right">
        <button type="button" value="cancel" class="dialog-btn btn-cancel">关闭</button>
        <button type="button" id="settings-save" class="dialog-btn btn-save">保存</button>
      </div>
    </div>
  </form>
</dialog>
`;
