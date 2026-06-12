# CSS 按组件拆分 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `css/style.css`（~1094 行）按组件拆分为 6 个独立 CSS 文件，对齐已有 JS 模块结构。

**Architecture:** 纯静态文件拆分——从 `style.css` 按行号区间剪出内容写入 6 个新文件，HTML 中单 `<link>` 替换为 6 个。选择器名、CSS 变量、JS、manifest 均不变。零逻辑改动。

**Tech Stack:** 纯 CSS / HTML，无构建工具。

**Spec:** `docs/superpowers/specs/2026-06-11-css-split-design.md`

---

### Task 1: 创建 `css/base.css`

**Files:**
- Create: `css/base.css`
- Source: `css/style.css` L1–L127, L767–L775

- [ ] **Step 1: 写入 `css/base.css`**

内容为原 `style.css` 的以下区间，首行加文件头注释，末尾加共享 keyframes：

- L1–L11: 文件头注释 + reset（`*, *::before, *::after`）
- L13–L39: `:root` 主题 token
- L41–L60: `[data-theme="dark"]`
- L62–L68: `html` base
- L70–L109: `body` + `body::before`
- L111–L127: `.container`（含 Animate.css 相关）

L767–L775（共享 keyframes）放到文件末尾：

```css
@keyframes dialog-in {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Step 2: 提交**

```bash
git add css/base.css
git commit -m "refactor: extract css/base.css — reset, theme tokens, body, container, shared keyframes"
```

---

### Task 2: 创建 `css/clock.css`

**Files:**
- Create: `css/clock.css`
- Source: `css/style.css` L111（Section header "Hero Section"）→ L198

- [ ] **Step 1: 写入 `css/clock.css`**

内容为原 L129–L198（`.hero`、`.day-row`、`.time`、`.time-sec`、`.moment-line`），末尾附加自有响应式规则：

```css
/* ── Responsive ───────────────────────── */

@media (max-width: 600px) {
  .moment-line {
    margin-bottom: 1.75rem;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add css/clock.css
git commit -m "refactor: extract css/clock.css — hero, clock, day-row, moment-line"
```

---

### Task 3: 创建 `css/search.css`

**Files:**
- Create: `css/search.css`
- Source: `css/style.css` L201–L398

- [ ] **Step 1: 写入 `css/search.css`**

内容为原 L201–L398（`.search-wrapper`、`.search-bar`、`.search-icon`、`.search-input`、`.engine-dropdown` 全套、`@keyframes menu-in`、`@keyframes menu-out`），末尾附加自有响应式：

```css
/* ── Responsive ───────────────────────── */

@media (max-width: 600px) {
  .search-wrapper {
    max-width: 100%;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add css/search.css
git commit -m "refactor: extract css/search.css — search bar, engine dropdown"
```

---

### Task 4: 创建 `css/links.css`

**Files:**
- Create: `css/links.css`
- Source: `css/style.css` L400–L542 + L746–L868

- [ ] **Step 1: 写入 `css/links.css`**

内容为两段合并：

1. L400–L542：快捷链接网格（`.quick-links`、`.links-grid`、`.link-item`、图标、标签、添加按钮、右键菜单）
2. L746–L868：链接编辑 dialog（`.link-dialog`、`#link-form`、`.dialog-title`、`.dialog-label`、`.dialog-input`、`.dialog-actions`、按钮）

末尾附加自有响应式规则（从原 `@media` 块拆出）：

```css
/* ── Responsive ───────────────────────── */

@media (max-width: 600px) {
  .links-grid {
    gap: 0.375rem;
  }

  .link-item,
  .link-add {
    width: 72px;
    padding: 0.625rem 0.375rem 0.5rem;
  }

  .dialog-title {
    min-width: 0;
    max-width: 85vw;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add css/links.css
git commit -m "refactor: extract css/links.css — quick links grid, add button, context menu, edit dialog"
```

---

### Task 5: 创建 `css/settings.css`

**Files:**
- Create: `css/settings.css`
- Source: `css/style.css` L544–L746

- [ ] **Step 1: 写入 `css/settings.css`**

内容为原 L544–L746：
- `.settings-bar`、`.settings-btn`、图标 swap（`.icon-moon`/`.icon-sun`）
- `.settings-dialog`、`.settings-form`、`.settings-layout`
- `.settings-nav`、`.settings-category`
- `.settings-content`、`.settings-section-title`、`.settings-item`
- `.settings-slider`（含 webkit/moz 伪元素）
- `.settings-value`、`.settings-footer`

无响应式规则归属此文件。

- [ ] **Step 2: 提交**

```bash
git add css/settings.css
git commit -m "refactor: extract css/settings.css — settings bar, settings dialog, slider"
```

---

### Task 6: 创建 `css/pomodoro.css`

**Files:**
- Create: `css/pomodoro.css`
- Source: `css/style.css` L872–L1064

- [ ] **Step 1: 写入 `css/pomodoro.css`**

内容为原 L872–L1064：
- `.hero-stage`、`#clock-display`、`.pomodoro-face`
- `.pomodoro-timer-big`、`.pomo-d`、`.pomo-v`、`.pomo-sep`
- `@keyframes pomo-exit`、`@keyframes pomo-enter`
- `.pomodoro-phase-label`、`.pomodoro-sessions`、`.pomodoro-dot`
- `.pomodoro-tools`、`.pomodoro-modes`、`.pomodoro-mode-btn`、`.pomodoro-tool-btn`
- `@keyframes pomodoro-flash-big`、`.pomodoro-timer-big.pomodoro-flash`

无响应式规则归属此文件。

- [ ] **Step 2: 提交**

```bash
git add css/pomodoro.css
git commit -m "refactor: extract css/pomodoro.css — pomodoro timer, flip digit, phase label, dots, tools"
```

---

### Task 7: 修改 `newtab.html` — 替换 `<link>` 引用

**Files:**
- Modify: `newtab.html` L9

- [ ] **Step 1: 将单行 `<link>` 替换为 6 行**

```diff
-  <link rel="stylesheet" href="css/style.css">
+  <link rel="stylesheet" href="css/base.css">
+  <link rel="stylesheet" href="css/clock.css">
+  <link rel="stylesheet" href="css/search.css">
+  <link rel="stylesheet" href="css/links.css">
+  <link rel="stylesheet" href="css/settings.css">
+  <link rel="stylesheet" href="css/pomodoro.css">
```

- [ ] **Step 2: 提交**

```bash
git add newtab.html
git commit -m "refactor: reference 6 split CSS files in newtab.html"
```

---

### Task 8: 删除 `css/style.css`

**Files:**
- Delete: `css/style.css`

- [ ] **Step 1: 删除原文件**

```bash
git rm css/style.css
git commit -m "refactor: remove css/style.css, replaced by 6 component CSS files"
```

---

### Task 9: 验证 — 运行测试套件

- [ ] **Step 1: 运行全部测试**

```bash
npm test
```

预期：全部 81 个测试用例通过（theme 8 + clock 13 + search 14 + links 19 + settings 12 + pomodoro 15 = 81）。

- [ ] **Step 2: 确认 git 状态干净**

```bash
git status
```

预期：working tree clean，无未追踪文件。

---

## 汇总

| 操作 | 文件数 |
|------|--------|
| 新建 | 6（`css/base.css`, `css/clock.css`, `css/search.css`, `css/links.css`, `css/settings.css`, `css/pomodoro.css`） |
| 修改 | 1（`newtab.html`） |
| 删除 | 1（`css/style.css`） |
| 提交 | 9 次（6 创建 + 1 HTML 改 + 1 删除 + 1 验证） |
