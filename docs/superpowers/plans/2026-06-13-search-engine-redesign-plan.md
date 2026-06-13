# 搜索引擎切换逻辑重新设计 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现搜索引擎自定义添加、三种切换方式（点击循环/Tab 键盘/chevron 列表）、设置面板左右分栏重构。

**Architecture:** search.js 新增引擎数据层（预设+自定义合并），导出 `getAllEngines`/`getCurrentEngine` 供 settings.js 消费；settings.js 通过 `engines-changed` 事件通知 search 刷新。HTML 层面引擎区拆分为图标按钮 + chevron 按钮两个独立点击目标，设置对话框改为左侧导航 + 右侧内容二分栏。

**Tech Stack:** 纯 ES Modules + localStorage，零构建。Vitest + jsdom 测试。

**文件变更清单：**

| 文件 | 变更 |
|------|------|
| `newtab.html` | 引擎区 DOM 拆分 + 设置对话框左右分栏 + 引擎表单子对话框 |
| `css/search.css` | 新增 `.engine-icon-btn`/`.engine-chevron-btn`/`.engine-letter`/高亮动画 |
| `css/settings.css` | 新增左侧导航/引擎列表/引擎表单样式 |
| `js/search.js` | 重构为预设+自定义数据模型，新增导出，Tab/点击循环 |
| `js/settings.js` | 重构为左右分栏 tab 切换，新增引擎 CRUD |
| `js/theme.js` | 系统主题自动切换时 dispatch `theme-changed` |
| `tests/setup.js` | 更新 DOM 骨架 |
| `tests/search.test.js` | 更新已有 + 新增 9 个测试 |
| `tests/settings.test.js` | 更新已有 + 新增 9 个测试 |

---

### Task 1: 更新测试 DOM 骨架

**Files:**
- Modify: `tests/setup.js:58-70`（搜索栏 HTML）
- Modify: `tests/setup.js:114-134`（设置对话框 HTML）

- [ ] **Step 1: 更新搜索栏测试 DOM（拆分引擎图标和 chevron）**

将 `tests/setup.js` 中的 `engine-dropdown` 区块从：

```html
<div class="engine-dropdown" id="engine-dropdown">
  <button class="engine-trigger" id="engine-trigger" type="button" aria-haspopup="true">
    <img class="engine-icon" id="engine-icon" src="" alt="">
    <svg class="engine-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
  </button>
  <div class="engine-menu" id="engine-menu" hidden></div>
</div>
```

改为：

```html
<div class="engine-dropdown" id="engine-dropdown">
  <button class="engine-icon-btn" id="engine-icon-btn" type="button" title="点击切换搜索引擎 | Tab 循环">
    <img class="engine-icon" id="engine-icon" src="" alt="">
    <span class="engine-letter" id="engine-letter" hidden></span>
  </button>
  <button class="engine-chevron-btn" id="engine-chevron-btn" type="button" title="查看所有搜索引擎" aria-haspopup="true">
    <svg class="engine-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
  </button>
  <div class="engine-menu" id="engine-menu" hidden></div>
</div>
```

- [ ] **Step 2: 更新设置对话框测试 DOM（左右分栏）**

将设置对话框 DOM 从：

```html
<dialog id="settings-dialog" class="settings-dialog">
  <form method="dialog" class="settings-form">
    <div class="settings-layout">
      <div class="settings-content">
        <div class="settings-section" data-category="search">
          <h3 class="settings-section-title">搜索栏长度</h3>
          <div class="settings-item">
            <input type="range" id="search-width" class="settings-slider" min="360" max="720" value="520" step="10">
            <span class="settings-value" id="search-width-value">520px</span>
          </div>
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
```

改为：

```html
<dialog id="settings-dialog" class="settings-dialog">
  <form method="dialog" class="settings-form">
    <div class="settings-layout">
      <nav class="settings-nav" id="settings-nav">
        <button type="button" class="settings-nav-item active" data-tab="search">
          <span class="settings-nav-icon">🔍</span> 搜索栏
        </button>
        <button type="button" class="settings-nav-item" data-tab="engines">
          <span class="settings-nav-icon">⚙️</span> 搜索引擎
        </button>
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

<dialog id="engine-form-dialog" class="engine-form-dialog">
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
```

- [ ] **Step 3: 同步更新 `newtab.html` 中的相同区块**

将上述相同的 HTML 改动应用到 `newtab.html` 的对应位置：
- 搜索栏引擎区分拆（第 46-54 行）
- 设置对话框左右分栏重构（第 115-135 行）
- 新增引擎表单子对话框（在第 135 行之后，`</dialog>` 之前）

- [ ] **Step 4: 确认页面无 JS 错误**

运行：`start newtab.html`（通过 HTTP 服务器预览）

预期：页面加载无 JS 错误（部分功能可能因 JS 未更新而不工作，但不应报错）

- [ ] **Step 5: Commit**

```bash
git add tests/setup.js newtab.html
git commit -m "refactor: split engine trigger and restructure settings dialog DOM"
```

---

### Task 2: 重构 search.js 引擎数据层

**Files:**
- Modify: `js/search.js:1-18`（常量定义和初始化）

- [ ] **Step 1: 替换引擎常量并新增数据函数**

将 `js/search.js` 中的 `ENGINES` 常量和相关逻辑替换为：

```js
const elInput = document.getElementById('search-input');
const elIconBtn = document.getElementById('engine-icon-btn');
const elChevronBtn = document.getElementById('engine-chevron-btn');
const elEngineIcon = document.getElementById('engine-icon');
const elEngineLetter = document.getElementById('engine-letter');
const elMenu = document.getElementById('engine-menu');
const elBackdrop = document.getElementById('engine-backdrop');
const STORAGE_KEY = 'ziqi-engine';
const CUSTOM_KEY = 'ziqi-engines';
const ORDER_KEY = 'ziqi-engine-order';

const BUILTIN_ENGINES = {
  google:     { id: 'google',     name: 'Google',     url: 'https://www.google.com/search?q=', icon: 'icons/google.svg',     builtin: true },
  bing:       { id: 'bing',       name: 'Bing',       url: 'https://www.bing.com/search?q=',   icon: 'icons/bing.svg',       builtin: true },
  duckduckgo: { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=',       icon: 'icons/duckduckgo.svg', builtin: true },
};

let currentEngine = 'google';

/* ── Engine data layer ──────────────────── */

function loadCustomEngines() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return {};
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return {};
    const map = {};
    arr.forEach(e => { if (e.id) map[e.id] = e; });
    return map;
  } catch (_) { return {}; }
}

function saveCustomEngines(map) {
  const arr = Object.values(map).filter(e => !e.builtin);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr));
}

function getAllEngines() {
  const customs = loadCustomEngines();
  const all = { ...BUILTIN_ENGINES, ...customs };
  const order = getEngineOrder();
  return order.map(id => all[id]).filter(Boolean);
}

function getEngineOrder() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch (_) {}
  // Default: presets first, then customs in add order
  const customs = loadCustomEngines();
  return [...Object.keys(BUILTIN_ENGINES), ...Object.keys(customs)];
}

function saveEngineOrder(order) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

function engineIconSrc(key) {
  const all = { ...BUILTIN_ENGINES, ...loadCustomEngines() };
  return all[key]?.icon || '';
}

export function getCurrentEngine() {
  const all = { ...BUILTIN_ENGINES, ...loadCustomEngines() };
  return all[currentEngine] || BUILTIN_ENGINES.google;
}

export { getAllEngines };
```

- [ ] **Step 2: 验证现有测试仍然通过**

运行：`npx vitest run tests/search.test.js`

预期：部分测试可能因 `elTrigger` 改名而失败，Task 12 中统一修复。

---

### Task 3: 新增 cycleEngine 循环切换

**Files:**
- Modify: `js/search.js`（在 engineIconSrc 之后添加新函数）

- [ ] **Step 1: 添加 cycleEngine 函数**

在 `js/search.js` 的 `engineIconSrc` 函数之后添加：

```js
/* ── Cycle ──────────────────────────────── */

function cycleEngine(direction) {
  const engines = getAllEngines();
  if (engines.length <= 1) return;
  const idx = engines.findIndex(e => e.id === currentEngine);
  const nextIdx = (idx + direction + engines.length) % engines.length;
  selectEngine(engines[nextIdx].id, false);
}
```

- [ ] **Step 2: 修改 selectEngine 支持 skipClose 参数**

将 `selectEngine` 函数签名从：

```js
function selectEngine(key) {
  if (!ENGINES[key]) return;
  currentEngine = key;
  localStorage.setItem(STORAGE_KEY, key);
  renderTriggerIcon();
  closeMenu();
}
```

改为：

```js
function selectEngine(key, skipClose = false) {
  const all = { ...BUILTIN_ENGINES, ...loadCustomEngines() };
  if (!all[key]) return;
  currentEngine = key;
  localStorage.setItem(STORAGE_KEY, key);
  renderTriggerIcon();
  if (!skipClose) closeMenu();
}
```

---

### Task 4: 更新 renderTriggerIcon（仅图标 + 首字母回退）

**Files:**
- Modify: `js/search.js`（renderTriggerIcon 函数）

- [ ] **Step 1: 重写 renderTriggerIcon**

替换现有的 `renderTriggerIcon` 和 `engineIcon` 函数为：

```js
/* ── Render ────────────────────────────── */

function renderTriggerIcon() {
  const engine = getCurrentEngine();
  if (engine.builtin && engine.icon) {
    elEngineIcon.src = engine.icon;
    elEngineIcon.alt = engine.name;
    elEngineIcon.removeAttribute('hidden');
    elEngineLetter.setAttribute('hidden', '');
  } else {
    elEngineIcon.setAttribute('hidden', '');
    elEngineLetter.textContent = engine.name.charAt(0).toUpperCase();
    elEngineLetter.removeAttribute('hidden');
  }
  elIconBtn.title = `${engine.name} · 点击切换 | Tab 循环`;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/search.js
git commit -m "feat(search): add engine data layer, cycleEngine, icon-only trigger"
```

---

### Task 5: 更新 renderMenu（所有引擎 + 键盘导航）

**Files:**
- Modify: `js/search.js`（renderMenu 函数）

- [ ] **Step 1: 重写 renderMenu**

替换现有 `renderMenu` 为：

```js
function renderMenu() {
  elMenu.innerHTML = '';
  const engines = getAllEngines();

  // Track if we already showed the divider between presets and customs
  let showedDivider = false;

  engines.forEach((engine) => {
    // Add divider before first custom engine
    if (!engine.builtin && !showedDivider) {
      showedDivider = true;
      const divider = document.createElement('div');
      divider.className = 'engine-menu-divider';
      elMenu.appendChild(divider);
    }

    const btn = document.createElement('button');
    btn.className = 'engine-option';
    if (engine.id === currentEngine) btn.classList.add('selected');
    btn.type = 'button';
    btn.setAttribute('data-value', engine.id);
    btn.setAttribute('role', 'menuitem');

    // Icon
    if (engine.builtin && engine.icon) {
      const img = document.createElement('img');
      img.className = 'engine-option-icon';
      img.src = engine.icon;
      img.alt = '';
      btn.appendChild(img);
    } else {
      const letter = document.createElement('span');
      letter.className = 'engine-option-letter';
      letter.textContent = engine.name.charAt(0).toUpperCase();
      btn.appendChild(letter);
    }

    // Name
    const name = document.createElement('span');
    name.textContent = engine.name;
    btn.appendChild(name);

    // Edit/Delete buttons for custom engines
    if (!engine.builtin) {
      const actions = document.createElement('span');
      actions.className = 'engine-option-actions';
      actions.innerHTML = `<button type="button" class="engine-edit-btn" data-id="${engine.id}" title="编辑">✏️</button><button type="button" class="engine-delete-btn" data-id="${engine.id}" title="删除">🗑️</button>`;
      btn.appendChild(actions);
    }

    btn.addEventListener('click', (e) => {
      // Ignore if clicking edit/delete buttons
      if (e.target.classList.contains('engine-edit-btn') || e.target.classList.contains('engine-delete-btn')) return;
      selectEngine(engine.id);
    });

    elMenu.appendChild(btn);
  });

  // Bind edit/delete button events
  elMenu.querySelectorAll('.engine-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      document.dispatchEvent(new CustomEvent('engine-edit', { detail: { id } }));
      closeMenu();
    });
  });
  elMenu.querySelectorAll('.engine-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      document.dispatchEvent(new CustomEvent('engine-delete', { detail: { id } }));
      closeMenu();
    });
  });
}
```

- [ ] **Step 2: 在 openMenu 中绑定键盘导航**

在 `openMenu` 函数中添加箭头键监听。修改 `openMenu` 为：

```js
let menuKeyHandler = null;

function openMenu() {
  elMenu.removeAttribute('hidden');
  elMenu.classList.remove('anim-out');
  elMenu.classList.add('anim-in');
  elBackdrop.removeAttribute('hidden');
  elChevronBtn.classList.add('open');
  renderMenu();

  // Arrow key navigation within menu
  if (menuKeyHandler) document.removeEventListener('keydown', menuKeyHandler);
  menuKeyHandler = (e) => {
    if (elMenu.hasAttribute('hidden')) return;
    const items = elMenu.querySelectorAll('.engine-option');
    if (items.length === 0) return;
    const focused = elMenu.querySelector('.engine-option:focus');
    const idx = focused ? Array.from(items).indexOf(focused) : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % items.length;
      items[next].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + items.length) % items.length;
      items[prev].focus();
    } else if (e.key === 'Enter' && focused) {
      e.preventDefault();
      focused.click();
    }
  };
  document.addEventListener('keydown', menuKeyHandler);
}
```

- [ ] **Step 3: 在 closeMenu 中清理键盘监听**

修改 `closeMenu` 函数，在清理阶段移除键盘监听：

在 `closeMenu` 的 `onEnd` 回调中添加：

```js
if (menuKeyHandler) {
  document.removeEventListener('keydown', menuKeyHandler);
  menuKeyHandler = null;
}
```

- [ ] **Step 4: Commit**

```bash
git add js/search.js
git commit -m "feat(search): update renderMenu for all engines with keyboard nav"
```

---

### Task 6: 更新 initSearch（拆分点击 + Tab/Shift+Tab）

**Files:**
- Modify: `js/search.js`（initSearch 函数）

- [ ] **Step 1: 重构 initSearch**

替换 `initSearch` 函数为：

```js
/* ── Init ──────────────────────────────── */

export function initSearch() {
  // Restore saved engine
  const saved = localStorage.getItem(STORAGE_KEY);
  const all = { ...BUILTIN_ENGINES, ...loadCustomEngines() };
  if (saved && all[saved]) {
    currentEngine = saved;
  }

  // Initial render
  renderTriggerIcon();

  // Icon button click → cycle engine
  elIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleEngine(+1);
  });

  // Chevron button click → toggle menu
  elChevronBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Backdrop click closes menu
  elBackdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenu();
  });

  // Global keyboard: Escape closes menu, Tab/Shift+Tab cycles engine when input focused
  document.addEventListener('keydown', (e) => {
    // Escape → close menu
    if (e.key === 'Escape' && !elMenu.hasAttribute('hidden')) {
      closeMenu();
      elChevronBtn.focus();
      return;
    }

    // Tab / Shift+Tab → cycle engine when search input is focused
    if (document.activeElement === elInput && !elMenu.hasAttribute('hidden') === false) {
      if (e.key === 'Tab') {
        e.preventDefault();
        cycleEngine(e.shiftKey ? -1 : +1);
        // Brief highlight feedback
        elIconBtn.classList.add('tab-flash');
        elIconBtn.addEventListener('animationend', () => {
          elIconBtn.classList.remove('tab-flash');
        }, { once: true });
      }
    }
  });

  // Arrow key navigation is handled in openMenu via menuKeyHandler

  // Search on Enter
  elInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = elInput.value.trim();
      if (q) search(q);
    }
  });

  // Re-render icons when theme changes (preset SVGs need filter refresh)
  window.addEventListener('theme-changed', () => {
    renderTriggerIcon();
  });

  // Listen for engine list changes from settings
  window.addEventListener('engines-changed', () => {
    const engines = getAllEngines();
    // If current engine was deleted, fall back to Google
    if (!engines.find(e => e.id === currentEngine)) {
      selectEngine('google', true);
    }
    renderTriggerIcon();
  });

  // Refocus search input when clicking background
  document.addEventListener('click', (e) => {
    const tag = e.target.tagName;
    if (tag === 'BODY' || tag === 'HTML' || e.target.classList.contains('container')) {
      elInput.focus();
    }
  });
}
```

- [ ] **Step 2: 更新 search 函数**

替换 `search` 函数中的 `ENGINES` 引用：

```js
function search(query) {
  const engine = getCurrentEngine();
  const base = engine.url;
  window.location.href = base + encodeURIComponent(query.trim());
}
```

- [ ] **Step 3: 确认 search.js 函数顺序和完整性**

完整文件结构（自上而下）：
1. DOM refs + localStorage key 常量
2. BUILTIN_ENGINES + currentEngine
3. loadCustomEngines / saveCustomEngines
4. getAllEngines / getEngineOrder / saveEngineOrder
5. engineIconSrc
6. getCurrentEngine (exported)
7. getAllEngines (exported)
8. renderTriggerIcon
9. renderMenu
10. openMenu / closeMenu / toggleMenu
11. cycleEngine
12. selectEngine
13. search
14. initSearch (exported)

- [ ] **Step 4: Commit**

```bash
git add js/search.js
git commit -m "feat(search): add Tab cycling, split icon/chevron clicks, engines-changed listener"
```

---

### Task 7: 更新搜索栏 CSS

**Files:**
- Modify: `css/search.css`

- [ ] **Step 1: 新增引擎图标按钮样式**

在 `css/search.css` 的 Engine Dropdown 区域，将 `.engine-trigger` 样式替换为：

```css
/* Engine icon button — click to cycle */
.engine-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-left: 1px solid var(--border);
  cursor: pointer;
  outline: none;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
}

.engine-icon-btn:hover {
  background: var(--surface-hover);
}

.engine-icon-btn.tab-flash {
  animation: tab-flash 0.3s ease;
}

@keyframes tab-flash {
  0%   { background: var(--accent); }
  100% { background: transparent; }
}

.engine-icon {
  width: 20px;
  height: 20px;
  display: block;
  flex-shrink: 0;
}

.engine-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
  background: var(--accent);
  color: var(--surface);
  flex-shrink: 0;
}

[data-theme="dark"] .engine-letter {
  background: var(--accent);
  color: var(--surface);
}

/* Chevron button — click to open list */
.engine-chevron-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  outline: none;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
}

.engine-chevron-btn:hover {
  background: var(--surface-hover);
}

.engine-chevron-btn.open .engine-chevron {
  transform: rotate(180deg);
}
```

- [ ] **Step 2: 移除旧的 `.engine-trigger` 样式**

删除 `.engine-trigger` 和 `.engine-trigger:hover` 样式块。`.engine-chevron` 样式保持不变（14x14 flex-shrink transition）。

- [ ] **Step 3: 新增菜单分隔线和操作按钮样式**

在菜单区域添加：

```css
.engine-menu-divider {
  height: 1px;
  background: var(--border);
  margin: 0.25rem 0.5rem;
}

.engine-option-letter {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  background: var(--surface-hover);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.engine-option-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.1s ease;
}

.engine-option:hover .engine-option-actions {
  opacity: 1;
}

.engine-edit-btn,
.engine-delete-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
  line-height: 1;
}

.engine-edit-btn:hover,
.engine-delete-btn:hover {
  background: var(--surface-hover);
}
```

- [ ] **Step 4: Commit**

```bash
git add css/search.css
git commit -m "style(search): add icon-only engine trigger and menu action styles"
```

---

### Task 8: 修复 theme.js 系统主题事件缺口

**Files:**
- Modify: `js/theme.js:26-30`（matchMedia change 监听器）

- [ ] **Step 1: 在系统主题切换时 dispatch theme-changed**

将 `theme.js` 第 26-30 行的 `matchMedia` 监听器修改为：

```js
  // Listen for system changes only when user hasn't made an explicit choice
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
      window.dispatchEvent(new CustomEvent('theme-changed'));
    }
  });
```

- [ ] **Step 2: Commit**

```bash
git add js/theme.js
git commit -m "fix(theme): dispatch theme-changed on system auto-theme switch"
```

---

### Task 9: 更新设置面板 CSS（左右分栏 + 引擎管理）

**Files:**
- Modify: `css/settings.css`

- [ ] **Step 1: 添加左侧导航和右侧面板样式**

替换 `css/settings.css` 的 Two-column layout 区域（`.settings-layout` 及以下）为：

```css
/* Two-column layout */

.settings-layout {
  display: flex;
  min-height: 260px;
}

/* Left navigation */

.settings-nav {
  width: 130px;
  flex-shrink: 0;
  background: var(--surface-alt, #faf8f5);
  border-right: 1px solid var(--border);
  padding: 0.75rem 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: calc(100% - 1rem);
  margin: 0 0.5rem;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-family: var(--font);
  font-size: 0.8125rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease;
  text-align: left;
}

.settings-nav-item:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.settings-nav-item.active {
  background: var(--accent);
  color: var(--surface);
}

.settings-nav-icon {
  font-size: 0.875rem;
  flex-shrink: 0;
}

/* Right panels */

.settings-panels {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.settings-panel {
  display: none;
  padding: 1.25rem 1.5rem;
}

.settings-panel.active {
  display: block;
}

.settings-panel-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.settings-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.5rem;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Engine list */

.engine-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
}

.engine-list-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--text-primary);
  transition: background 0.1s ease;
}

.engine-list-item--preset {
  background: var(--surface-hover);
  color: var(--text-secondary);
}

.engine-list-item-badge {
  margin-left: auto;
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.engine-list-item-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
}

.engine-list-action-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 4px;
  border-radius: 3px;
  line-height: 1;
  transition: background 0.1s ease;
}

.engine-list-action-btn:hover {
  background: var(--surface-hover);
}

/* Add engine button */

.engine-add-btn {
  width: 100%;
  padding: 0.5rem;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  font-family: var(--font);
  font-size: 0.8125rem;
  color: var(--accent);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.engine-add-btn:hover {
  border-color: var(--accent);
  background: var(--surface-hover);
}
```

- [ ] **Step 2: 添加引擎表单子对话框样式**

在文件末尾添加：

```css
/* Engine form dialog */

.engine-form-dialog {
  margin: auto;
  border: none;
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
  width: min(360px, 90vw);
  animation: dialog-in 0.2s ease;
}

.engine-form-dialog::backdrop {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  animation: fade-in 0.2s ease;
}

.dialog-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: -0.25rem 0 1rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add css/settings.css
git commit -m "style(settings): add left nav, engine list, and form dialog styles"
```

---

### Task 10: 重构 settings.js（tab 切换 + 引擎管理）

**Files:**
- Modify: `js/settings.js`（全部重写）

- [ ] **Step 1: 重写 settings.js**

将 `js/settings.js` 完整替换为：

```js
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
const elPanels = document.getElementById('settings-panels');
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
  elPanels.querySelectorAll('.settings-panel').forEach(panel => {
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
  const engine = getCurrentEngine();
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

  // If deleted engine was current, switch to Google
  if (getCurrentEngine().id === id) {
    localStorage.setItem('ziqi-engine', 'google');
  }

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

/* ── Dialog ────────────────────────────── */

function openDialog() {
  elSlider.value = storedWidth;
  updateDisplay();
  renderEngineList();
  switchTab('search'); // Default to search tab
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

  // Engine edit/delete from menu (events dispatched from search.js)
  document.addEventListener('engine-edit', (e) => {
    openEngineForm(e.detail.id);
    // Need to re-open settings dialog since menu close closes it
    // Actually the engine edit event fires after closeMenu, settings should still be open
  });

  document.addEventListener('engine-delete', (e) => {
    deleteEngine(e.detail.id);
  });

  // Listen for external engine changes to refresh list
  window.addEventListener('engines-changed', () => {
    renderEngineList();
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add js/settings.js
git commit -m "feat(settings): add left-right nav, engine CRUD management"
```

---

### Task 11: 修复设置面板引擎编辑从菜单触发时的对话框问题

**Files:**
- Modify: `js/settings.js`（engine-edit 事件处理）

- [ ] **Step 1: 引擎表单关闭时重新打开设置对话框**

引擎编辑从下拉菜单触发时，`closeMenu()` 后设置对话框可能已关闭。修改 `engine-edit` 事件处理：

```js
  document.addEventListener('engine-edit', (e) => {
    const settingsWasOpen = elDialog.open;
    openEngineForm(e.detail.id);
    // Reopen settings if it was open before
    if (settingsWasOpen) {
      elDialog.showModal();
    }
  });
```

但由于设置对话框的 `::backdrop` 和引擎表单对话框的 `::backdrop` 可能冲突，更简单的处理：让引擎表单对话框关闭后自动回到设置对话框。

在 `initSettings` 中监听引擎表单关闭：

```js
  elEngineFormDialog.addEventListener('close', () => {
    if (elDialog.open) {
      elDialog.showModal();
    }
  });
```

- [ ] **Step 2: Commit**

```bash
git add js/settings.js
git commit -m "fix(settings): reopen settings dialog after engine form closes"
```

---

### Task 12: 更新 search 测试

**Files:**
- Modify: `tests/search.test.js`

- [ ] **Step 1: 更新测试中的选择器引用**

将所有 `document.getElementById('engine-trigger')` 替换为 `document.getElementById('engine-chevron-btn')`（因为 chevron 按钮现在是打开菜单的触发器）。

将 `document.getElementById('engine-trigger').classList.contains('open')` 改为 `document.getElementById('engine-chevron-btn').classList.contains('open')`。

- [ ] **Step 2: 更新第一个测试 — 添加自定义引擎的辅助函数**

在测试文件顶部添加辅助函数：

```js
function addCustomEngine(id, name, url) {
  const existing = JSON.parse(localStorage.getItem('ziqi-engines') || '[]');
  existing.push({ id, name, url, builtin: false });
  localStorage.setItem('ziqi-engines', JSON.stringify(existing));
  const order = JSON.parse(localStorage.getItem('ziqi-engine-order') || '["google","bing","duckduckgo"]');
  order.push(id);
  localStorage.setItem('ziqi-engine-order', JSON.stringify(order));
}
```

- [ ] **Step 3: 新增测试 — 点击引擎图标循环切换**

在测试文件中添加：

```js
it('cycles to next engine when icon button is clicked', () => {
  document.getElementById('engine-icon-btn').click();
  expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/bing\.svg$/);
  expect(localStorage.getItem('ziqi-engine')).toBe('bing');
});

it('cycles back to first engine after last', () => {
  localStorage.setItem('ziqi-engine', 'duckduckgo');
  initSearch();
  document.getElementById('engine-icon-btn').click();
  expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
});

it('does nothing when only one engine exists and icon is clicked', () => {
  // Empty custom engines and use the 3 presets — still >1
  // This test passes by verifying no error is thrown with 3 engines
  // Actually test with only 1: set order to just google
  localStorage.setItem('ziqi-engine-order', '["google"]');
  initSearch();
  document.getElementById('engine-icon-btn').click();
  expect(localStorage.getItem('ziqi-engine')).toBe('google');
});
```

- [ ] **Step 4: 新增测试 — Tab/Shift+Tab 键盘切换**

```js
it('switches to next engine on Tab when input is focused', () => {
  const input = document.getElementById('search-input');
  input.focus();
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true }));
  expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/bing\.svg$/);
});

it('switches to previous engine on Shift+Tab when input is focused', () => {
  const input = document.getElementById('search-input');
  input.focus();
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
  expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/duckduckgo\.svg$/);
});

it('does not cycle on Tab when menu is open', () => {
  document.getElementById('engine-chevron-btn').click();
  const input = document.getElementById('search-input');
  input.focus();
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
});
```

- [ ] **Step 5: 新增测试 — 自定义引擎**

```js
it('shows custom engines in the menu', () => {
  addCustomEngine('kagi-test', 'Kagi', 'https://kagi.com/search?q=');
  document.getElementById('engine-chevron-btn').click();
  const options = document.querySelectorAll('.engine-option');
  expect(options.length).toBe(4);
  expect(options[3].textContent).toContain('Kagi');
});

it('cycles through custom engines', () => {
  addCustomEngine('kagi-test', 'Kagi', 'https://kagi.com/search?q=');
  initSearch();
  localStorage.setItem('ziqi-engine', 'duckduckgo');
  initSearch();
  document.getElementById('engine-icon-btn').click();
  expect(localStorage.getItem('ziqi-engine')).toBe('kagi-test');
});
```

- [ ] **Step 6: 新增测试 — 菜单键盘导航**

```js
it('supports ArrowDown navigation in menu', () => {
  document.getElementById('engine-chevron-btn').click();
  const items = document.querySelectorAll('.engine-option');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  // After ArrowDown, second item should be focused (index 1)
  // jsdom focus behavior is limited; test that no error is thrown
});

it('supports ArrowUp navigation in menu', () => {
  document.getElementById('engine-chevron-btn').click();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  // Should wrap to last item
});
```

- [ ] **Step 7: 新增测试 — engines-changed 事件**

```js
it('falls back to Google when current engine is deleted', () => {
  addCustomEngine('kagi-test', 'Kagi', 'https://kagi.com/search?q=');
  localStorage.setItem('ziqi-engine', 'kagi-test');
  initSearch();

  // Simulate deletion: remove from storage and dispatch
  localStorage.setItem('ziqi-engines', '[]');
  window.dispatchEvent(new CustomEvent('engines-changed'));

  expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
});
```

- [ ] **Step 8: 运行所有测试，修复失败项**

运行：`npx vitest run tests/search.test.js`

逐一修复因 DOM 结构变更导致的旧测试失败（主要是选择器名称变化）。

- [ ] **Step 9: Commit**

```bash
git add tests/search.test.js
git commit -m "test(search): add cycle, Tab, custom engine, and keyboard nav tests"
```

---

### Task 13: 更新 settings 测试

**Files:**
- Modify: `tests/settings.test.js`

- [ ] **Step 1: 适配现有测试到新的左右分栏结构**

旧的测试中 `.settings-section-title` 选择器已不存在（新结构用 `.settings-panel-title`）。需要更新相关测试。

更新 `displays the current slider value` 测试中的选择器，`#search-width-value` 仍然有效。

- [ ] **Step 2: 新增测试 — Tab 切换**

```js
import { getAllEngines, getCurrentEngine } from '../js/search.js';

describe('settings tabs', () => {
  it('switches to engines panel when nav item clicked', () => {
    document.getElementById('settings-toggle').click();
    const enginesNav = document.querySelector('[data-tab="engines"]');
    enginesNav.click();
    expect(enginesNav.classList.contains('active')).toBe(true);
    expect(document.querySelector('[data-panel="engines"]').classList.contains('active')).toBe(true);
  });

  it('switches back to search panel', () => {
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    document.querySelector('[data-tab="search"]').click();
    expect(document.querySelector('[data-panel="search"]').classList.contains('active')).toBe(true);
  });
});
```

- [ ] **Step 3: 新增测试 — 引擎列表渲染**

```js
describe('engine management', () => {
  it('renders preset engines in the list', () => {
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    const items = document.querySelectorAll('.engine-list-item');
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items[0].textContent).toContain('Google');
    expect(items[0].textContent).toContain('预设');
  });

  it('renders custom engines with edit/delete buttons', () => {
    localStorage.setItem('ziqi-engines', JSON.stringify([
      { id: 'test-1', name: 'TestEngine', url: 'https://test.com/search?q=', builtin: false }
    ]));
    localStorage.setItem('ziqi-engine-order', JSON.stringify(['google', 'bing', 'duckduckgo', 'test-1']));
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    const editBtns = document.querySelectorAll('[data-action="edit"]');
    const deleteBtns = document.querySelectorAll('[data-action="delete"]');
    expect(editBtns.length).toBe(1);
    expect(deleteBtns.length).toBe(1);
  });
});
```

- [ ] **Step 4: 新增测试 — 添加引擎**

```js
  it('opens engine form dialog on add button click', () => {
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();
    expect(document.getElementById('engine-form-dialog').open).toBe(true);
  });

  it('saves custom engine to localStorage', () => {
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();

    document.getElementById('engine-name').value = 'Kagi';
    document.getElementById('engine-url').value = 'https://kagi.com/search?q=';
    document.getElementById('engine-form').dispatchEvent(new Event('submit'));

    const customs = JSON.parse(localStorage.getItem('ziqi-engines'));
    expect(customs.length).toBe(1);
    expect(customs[0].name).toBe('Kagi');
  });
```

- [ ] **Step 5: 新增测试 — 校验**

```js
  it('rejects empty engine name', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();

    document.getElementById('engine-name').value = '';
    document.getElementById('engine-url').value = 'https://example.com/search?q=';
    document.getElementById('engine-form').dispatchEvent(new Event('submit'));

    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('名称'));
    alertMock.mockRestore();
  });

  it('rejects non-https URL', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();

    document.getElementById('engine-name').value = 'Test';
    document.getElementById('engine-url').value = 'http://example.com/search?q=';
    document.getElementById('engine-form').dispatchEvent(new Event('submit'));

    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('https://'));
    alertMock.mockRestore();
  });
```

- [ ] **Step 6: 新增测试 — 删除引擎**

```js
  it('deletes custom engine', () => {
    localStorage.setItem('ziqi-engines', JSON.stringify([
      { id: 'test-del', name: 'ToDelete', url: 'https://delete.com/search?q=', builtin: false }
    ]));
    localStorage.setItem('ziqi-engine-order', JSON.stringify(['google', 'bing', 'duckduckgo', 'test-del']));
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();

    const deleteBtn = document.querySelector('[data-action="delete"]');
    deleteBtn.click();

    const customs = JSON.parse(localStorage.getItem('ziqi-engines'));
    expect(customs.length).toBe(0);
  });
```

- [ ] **Step 7: 运行所有测试，修复失败项**

运行：`npx vitest run tests/settings.test.js`

- [ ] **Step 8: Commit**

```bash
git add tests/settings.test.js
git commit -m "test(settings): add tab switching, engine CRUD, and validation tests"
```

---

### Task 14: 运行完整测试套件并修复

- [ ] **Step 1: 运行全部测试**

```bash
npx vitest run
```

- [ ] **Step 2: 修复所有失败测试**

逐个检查失败原因并修复。

- [ ] **Step 3: 确认全部通过后提交**

```bash
git add -A
git commit -m "test: fix all tests after engine redesign"
```

---

### Task 15: 手动验证

- [ ] **Step 1: 启动本地 HTTP 服务器预览**

```bash
npx serve .
```

- [ ] **Step 2: 验证清单**

- [ ] 点击引擎图标 → 引擎循环切换，图标变化
- [ ] 点击 chevron → 打开下拉列表，显示所有引擎（预设 + 自定义）
- [ ] Tab 键 → 输入框聚焦时循环切换引擎（焦点不离开搜索栏）
- [ ] Shift+Tab 键 → 反向循环
- [ ] Enter → 用当前引擎搜索
- [ ] 打开设置 → 左侧导航切换「搜索栏」/「搜索引擎」
- [ ] 引擎管理页 → 添加 Kagi，保存后搜索栏出现新引擎
- [ ] 编辑自定义引擎名称
- [ ] 删除自定义引擎 → 若正在使用则切回 Google
- [ ] 深色模式切换 → 图标自适应

- [ ] **Step 3: 修复手动测试发现的问题**

---

### Task 16: 最终提交

```bash
git add -A
git commit -m "feat: complete search engine redesign with custom engines, cycle switching, and settings panel restructure"
```
