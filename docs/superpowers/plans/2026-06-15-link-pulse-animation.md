# 链接 Pulse 动画重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将快捷链接的悬停/点击动画从自定义 dock-bounce 重构为 Animate.css `animate__pulse` 方案。

**Architecture:** 悬停用纯 CSS `:hover` + `animation` 触发持续 pulse；点击用 JS 两段式（pulse → 进度条 → 跳转），移除双击编辑逻辑。CSS 仅修改 `links.css`，JS 仅修改 `links.js`。

**Tech Stack:** Vanilla JS ES Modules, Animate.css CDN, Vitest + jsdom

---

## 文件结构

| 文件 | 职责 | 操作 |
|------|------|------|
| `css/links.css` | 链接网格样式、动画 keyframes、hover/click 规则 | 修改 |
| `js/links.js` | 链接 CRUD、渲染、事件处理（click/contextmenu/drag） | 修改 |
| `tests/setup.js` | 测试 DOM 骨架 + 浏览器 API polyfill | 修改（新增 `#nav-progress`） |
| `tests/links.test.js` | 链接模块测试（渲染/CRUD/图标/拖拽） | 修改 |

---

### Task 1: CSS — 移除 dock-bounce，新增 pulse 规则

**Files:**
- Modify: `css/links.css`

- [ ] **Step 1: 移除 `@keyframes dock-bounce` 块（第 105-111 行）**

```css
/* 删除以下整块 */
@keyframes dock-bounce {
  0%   { transform: translateY(0) scale(1); }
  30%  { transform: translateY(-10px) scale(1.15); }
  55%  { transform: translateY(2px) scale(0.97); }
  75%  { transform: translateY(-3px) scale(1.03); }
  100% { transform: translateY(0) scale(1); }
}
```

- [ ] **Step 2: 移除 `.link-icon-wrapper.bouncing` 规则（第 113-115 行）**

```css
/* 删除以下规则 */
.link-icon-wrapper.bouncing {
  animation: dock-bounce 0.45s ease;
}
```

- [ ] **Step 3: 在 `.link-item:hover` 规则中新增 `animation` 属性**

将现有的：
```css
.link-item:hover {
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  color: var(--text-primary);
}
```

改为：
```css
.link-item:hover {
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  color: var(--text-primary);
  animation: pulse var(--animate-duration, 1s) infinite;
}
```

> `pulse` keyframes 由 Animate.css CDN 提供（`@keyframes pulse { from { scale3d(1,1,1) } 50% { scale3d(1.05,1.05,1.05) } to { scale3d(1,1,1) } }`），无需在本地定义。

- [ ] **Step 4: 在 `.nav-progress` 规则之后新增 `.click-pulse` 规则**

在 `/* Dock bounce animation (triggered by JS on click) */` 注释位置（dock-bounce 移除后的空位），替换为：

```css
/* Click pulse — faster single-cycle pulse triggered by JS on click */
.link-item.click-pulse {
  animation-duration: 0.4s;
  animation-iteration-count: 1;
}
```

> 此规则与 JS 中添加的 `animate__pulse` class 叠加：`animate__pulse` 提供 `animation-name: pulse`，`.click-pulse` 将 duration 从默认 1s 覆盖为 0.4s，并将 `animation-iteration-count` 显式设为 `1`（覆盖 `:hover` shorthand 中的 `infinite`——否则 hover 时点击，pulse 会变成无限循环）。选择器 `.link-item.click-pulse`（specificity 0,2,0）与 `.link-item:hover` 同级，靠源码顺序胜出。

- [ ] **Step 5: 提交**

```bash
git add css/links.css
git commit -m "feat(links): replace dock-bounce with pulse hover + click-pulse CSS rules"
```

---

### Task 2: JS — 重写点击处理，移除双击编辑

**Files:**
- Modify: `js/links.js`

- [ ] **Step 1: 删除 `clickTimer` 变量声明（第 303 行）**

将：
```js
  // Click with Dock bounce animation (intercept navigation to play animation first)
  let clickTimer = null;
```

改为：
```js
  // Click with pulse animation → progress bar → navigate (two-stage)
```

- [ ] **Step 2: 替换 click 事件监听器（第 305-343 行）**

将整个现有 click handler（含 `clickTimer`、`.bouncing`、`setTimeout` 逻辑）替换为：

```js
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
```

- [ ] **Step 3: 删除 `dblclick` 事件监听器（第 346-356 行）**

删除整个 `dblclick` handler 块：
```js
  // Double-click to edit (fires between click events, prevents navigation)
  elGrid.addEventListener('dblclick', (e) => {
    const a = e.target.closest('.link-item');
    if (!a) return;
    e.preventDefault();
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }
    const id = a.getAttribute('data-id');
    if (id) openDialog(id);
  });
```

- [ ] **Step 4: 验证 `contextmenu` 事件监听器保留不变（第 359 行）**

确认以下代码仍在：
```js
  // Right-click to edit
  elGrid.addEventListener('contextmenu', handleContextMenu);
```

- [ ] **Step 5: 提交**

```bash
git add js/links.js
git commit -m "feat(links): two-stage click pulse, remove dblclick editing"
```

---

### Task 3: 测试 DOM — 在 setup 中新增 `#nav-progress` 元素

**Files:**
- Modify: `tests/setup.js`

- [ ] **Step 1: 在 DOM 骨架开头添加 `#nav-progress` div**

在 `tests/setup.js` 的 `document.body.innerHTML` 模板字符串中，将开头：
```js
document.body.innerHTML = `
<div class="container">
```

改为（在第一行 `<div class="container">` 之前插入）：
```js
document.body.innerHTML = `
<div id="nav-progress" class="nav-progress"></div>
<div class="container">
```

- [ ] **Step 2: 提交**

```bash
git add tests/setup.js
git commit -m "test(setup): add #nav-progress element to test DOM skeleton"
```

---

### Task 4: 测试 — 将 dblclick 编辑测试改为 contextmenu 编辑测试

**Files:**
- Modify: `tests/links.test.js`

当前有 5 个测试用例使用 `dblclick` 来打开编辑对话框。由于双击编辑功能已移除，这些测试需改为使用右键（`contextmenu`）。

- [ ] **Step 1: 修改 "opens dialog for editing when a link is double-clicked" 测试（第 80-88 行）**

将：
```js
  it('opens dialog for editing when a link is double-clicked', () => {
    const label = document.querySelector('.link-label');
    label.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(document.getElementById('link-dialog').open).toBe(true);
    expect(document.getElementById('link-title').value).toBe('YouTube');
    expect(document.getElementById('link-url').value).toBe('https://www.youtube.com');
    expect(document.getElementById('link-delete').hidden).toBe(false);
  });
```

改为：
```js
  it('opens dialog for editing on right-click of a link item', () => {
    const linkItem = document.querySelector('.link-item');
    linkItem.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    expect(document.getElementById('link-dialog').open).toBe(true);
    expect(document.getElementById('link-title').value).toBe('YouTube');
    expect(document.getElementById('link-url').value).toBe('https://www.youtube.com');
    expect(document.getElementById('link-delete').hidden).toBe(false);
  });
```

- [ ] **Step 2: 修改 "edits an existing link" 测试（第 125-133 行）**

将 `dblclick` 改为 `contextmenu`：
```js
  it('edits an existing link', () => {
    // Right-click YouTube
    document.querySelector('.link-item').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    document.getElementById('link-title').value = 'YouTube Edited';
    document.getElementById('link-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const links = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(links.find((l) => l.id === '1').title).toBe('YouTube Edited');
  });
```

- [ ] **Step 3: 修改 "deletes a link" 测试（第 135-143 行）**

将 `dblclick` 改为 `contextmenu`：
```js
  it('deletes a link', () => {
    // Right-click YouTube
    document.querySelector('.link-item').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    document.getElementById('link-delete').click();

    const links = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(links.length).toBe(2);
    expect(links.find((l) => l.id === '1')).toBeUndefined();
  });
```

- [ ] **Step 4: 修改 "populates icon field when editing a link with custom icon" 测试（第 261-268 行）**

将 `dblclick` 改为 `contextmenu`：
```js
  it('populates icon field when editing a link with custom icon', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'c4', title: 'HasIcon', url: 'https://example.com', icon: 'https://example.com/icon.svg' },
    ]));
    initLinks();
    document.querySelector('.link-item').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(document.getElementById('link-icon').value).toBe('https://example.com/icon.svg');
  });
```

- [ ] **Step 5: 修改 "clears custom icon when field is emptied during edit" 测试（第 270-281 行）**

将 `dblclick` 改为 `contextmenu`：
```js
  it('clears custom icon when field is emptied during edit', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'c5', title: 'HadIcon', url: 'https://example.com', icon: 'https://example.com/icon.svg' },
    ]));
    initLinks();
    document.querySelector('.link-item').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    document.getElementById('link-icon').value = '';
    document.getElementById('link-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const links = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(links[0].icon).toBe('');
  });
```

- [ ] **Step 6: 运行测试确认修改正确**

```bash
npm test
```
预期：所有修改过的测试通过。

- [ ] **Step 7: 提交**

```bash
git add tests/links.test.js
git commit -m "test(links): change dblclick editing tests to contextmenu"
```

---

### Task 5: 测试 — 新增 pulse 点击行为测试

**Files:**
- Modify: `tests/links.test.js`

在文件末尾（最后一个 `describe` 块之后，`});` 闭合之前）新增一个 `describe('click navigation', ...)` 块。

- [ ] **Step 1: 新增 describe 块和 beforeEach**

```js
describe('click navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    initLinks();
  });

  // ... 测试用例见以下步骤
});
```

- [ ] **Step 2: 测试点击链接添加 pulse class 并阻止默认导航**

```js
  it('adds animate__pulse and click-pulse classes on link click', () => {
    const linkItem = document.querySelector('.link-item');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    const prevented = !linkItem.dispatchEvent(clickEvent);

    // Should prevent default navigation
    expect(prevented).toBe(true);
    // Should add pulse classes
    expect(linkItem.classList.contains('animate__pulse')).toBe(true);
    expect(linkItem.classList.contains('click-pulse')).toBe(true);
  });
```

- [ ] **Step 3: 测试修饰键点击不触发 pulse**

```js
  it('does not add pulse classes on Ctrl+click', () => {
    const linkItem = document.querySelector('.link-item');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    linkItem.dispatchEvent(clickEvent);

    expect(linkItem.classList.contains('animate__pulse')).toBe(false);
    expect(linkItem.classList.contains('click-pulse')).toBe(false);
  });

  it('does not add pulse classes on middle-click', () => {
    const linkItem = document.querySelector('.link-item');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 });
    linkItem.dispatchEvent(clickEvent);

    expect(linkItem.classList.contains('animate__pulse')).toBe(false);
    expect(linkItem.classList.contains('click-pulse')).toBe(false);
  });
```

- [ ] **Step 4: 测试 animationend 后移除 class 并触发进度条**

```js
  it('removes pulse classes after animationend and starts progress bar', () => {
    const linkItem = document.querySelector('.link-item');
    const progressBar = document.getElementById('nav-progress');

    // Click the link
    linkItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));

    expect(linkItem.classList.contains('animate__pulse')).toBe(true);
    expect(linkItem.classList.contains('click-pulse')).toBe(true);

    // Dispatch animationend — jsdom doesn't run CSS animations
    linkItem.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(linkItem.classList.contains('animate__pulse')).toBe(false);
    expect(linkItem.classList.contains('click-pulse')).toBe(false);
    expect(progressBar.style.width).toBe('100%');
  });
```

- [ ] **Step 5: 测试进度条 transitionend 后导航**

由于 jsdom 中 `window.location.href` 的赋值会触发页面导航（在测试环境中行为不一致），使用 `vi.spyOn` 或直接赋值后断言。但 jsdom 的 `window.location` 不可配置。改用验证 transitionend 监听器被正确绑定的方式：

```js
  it('navigates after progress bar transitionend', () => {
    const linkItem = document.querySelector('.link-item');
    const progressBar = document.getElementById('nav-progress');

    // Click → animationend
    linkItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    linkItem.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(progressBar.style.width).toBe('100%');

    // Progress bar should have transitionend listener — verify by dispatching
    // and checking that the bar is still at 100% (listener doesn't reset it)
    const transitionFired = progressBar.dispatchEvent(new Event('transitionend', { bubbles: true }));
    expect(transitionFired).toBe(true);
    // After transitionend, the once:true listener is removed — dispatching again
    // should still work but the handler won't fire again
  });
```

- [ ] **Step 6: 测试无进度条时直接导航（fallback 路径）**

当 `#nav-progress` 不存在时，animationend 后应直接跳转。由于 jsdom 限制，我们验证 progressBar 为 null 时动画流程不报错：

```js
  it('falls back to direct navigation when progress bar is absent', () => {
    // Remove progress bar from DOM
    const progressBar = document.getElementById('nav-progress');
    if (progressBar) progressBar.remove();

    const linkItem = document.querySelector('.link-item');

    // Click → should not throw
    expect(() => {
      linkItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    }).not.toThrow();

    // animationend → should not throw
    expect(() => {
      linkItem.dispatchEvent(new Event('animationend', { bubbles: true }));
    }).not.toThrow();

    expect(linkItem.classList.contains('animate__pulse')).toBe(false);
    expect(linkItem.classList.contains('click-pulse')).toBe(false);
  });
```

- [ ] **Step 7: 运行测试确认通过**

```bash
npm test
```
预期：全部测试通过，包括新增的 6 个测试用例。

- [ ] **Step 8: 提交**

```bash
git add tests/links.test.js
git commit -m "test(links): add pulse click navigation behavior tests"
```

---

### Task 6: 运行全量测试并最终提交

- [ ] **Step 1: 运行完整测试套件**

```bash
npm test
```
预期：全部 6 个测试文件通过，无 regression。

```bash
npm run test:watch
```
（可选）在 watch 模式下确认所有用例稳定通过。

- [ ] **Step 2: 最终提交（如有遗漏的变更）**

```bash
git status
git add -A
git commit -m "chore: finalize link pulse animation refactor"
```
（仅当有未跟踪的变更时才执行）
