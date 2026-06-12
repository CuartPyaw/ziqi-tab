# 番茄钟翻牌计时器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把番茄钟的时间显示改成逐位翻牌动画——每秒只有数值变化的那一位执行「旧数字向上滑出 + 新数字从下方滑入」效果，时钟模块完全不受影响。

**Architecture:** 四位数字（M0 M1 S0 S1）各自包裹在 `.pomo-d`（`overflow:hidden` 裁切容器）内，一个 `.pomo-v` span 表示当前数字。`updateDisplay()` 每秒 diff 各位值，仅对变化的位：克隆新 span 加 `pomo-entering` 类、旧 span 加 `pomo-exiting` 类，`animationend` 后移除旧 span。`dataset.time` 同步维护语义时间值，测试读取此属性而非 `textContent`。

**Tech Stack:** 原生 HTML/CSS/JS（ES Modules）；Vitest + jsdom 测试；无构建步骤。

---

## 文件改动清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `tests/setup.js` | Modify (line 88) | DOM 骨架同步新结构 |
| `tests/pomodoro.test.js` | Modify (13 处) | `textContent` → `dataset.time` |
| `newtab.html` | Modify (line 24) | `<time>` 内部重构为 digit spans |
| `css/style.css` | Modify (line 919 后) | 添加 `.pomo-d`、`.pomo-v`、两套 keyframes |
| `js/pomodoro.js` | Modify (3 处) | `elDigits` 变量、`init()` 缓存、替换 `updateDisplay()` |

---

## Task 1: 更新测试 DOM 骨架

**Files:**
- Modify: `tests/setup.js:88`

- [ ] **Step 1: 替换第 88 行的 `<time>` 元素**

  将：
  ```html
  <time class="pomodoro-timer-big" id="pomodoro-timer-big">25:00</time>
  ```
  替换为（**单行，无空白**）：
  ```html
  <time class="pomodoro-timer-big" id="pomodoro-timer-big" data-time="25:00"><span class="pomo-d"><span class="pomo-v">2</span></span><span class="pomo-d"><span class="pomo-v">5</span></span><span class="pomo-sep">:</span><span class="pomo-d"><span class="pomo-v">0</span></span><span class="pomo-d"><span class="pomo-v">0</span></span></time>
  ```

- [ ] **Step 2: 运行全套测试，确认全部通过**

  ```bash
  npm test
  ```

  Expected: 所有 81 用例 PASS（此时断言还读 `textContent`，新 DOM 的 `textContent` 拼接后仍是 `"25:00"`，所以不会破坏）。

---

## Task 2: 切换测试断言为 `dataset.time`（Red）

**Files:**
- Modify: `tests/pomodoro.test.js`

- [ ] **Step 1: 全文替换 `.textContent` → `.dataset.time`（仅限 `pomodoro-timer-big` 相关行）**

  在编辑器中对 `tests/pomodoro.test.js` 做**精确替换**：

  ```
  查找：  document.getElementById('pomodoro-timer-big').textContent
  替换为：document.getElementById('pomodoro-timer-big').dataset.time
  ```

  共 13 处，包括两处赋值给 `display` 变量的行：
  ```js
  // 之前
  const display = document.getElementById('pomodoro-timer-big').textContent;
  // 之后
  const display = document.getElementById('pomodoro-timer-big').dataset.time;
  ```

- [ ] **Step 2: 运行测试，确认 pomodoro 用例失败（Red）**

  ```bash
  npm test
  ```

  Expected: `pomodoro.test.js` 中时间断言 FAIL，报错类似：
  ```
  AssertionError: expected undefined to be '25:00'
  ```
  （`dataset.time` 尚未被 JS 设置）。其余测试文件（theme、clock、search、links、settings）全部 PASS。

---

## Task 3: 更新 newtab.html

**Files:**
- Modify: `newtab.html:24`

- [ ] **Step 1: 替换第 24 行的 `<time>` 元素**

  将：
  ```html
          <time class="pomodoro-timer-big" id="pomodoro-timer-big">25:00</time>
  ```
  替换为（保持原有缩进，内部单行无空白）：
  ```html
          <time class="pomodoro-timer-big" id="pomodoro-timer-big" data-time="25:00"><span class="pomo-d"><span class="pomo-v">2</span></span><span class="pomo-d"><span class="pomo-v">5</span></span><span class="pomo-sep">:</span><span class="pomo-d"><span class="pomo-v">0</span></span><span class="pomo-d"><span class="pomo-v">0</span></span></time>
  ```

---

## Task 4: 添加翻牌 CSS

**Files:**
- Modify: `css/style.css`（在第 919 行 `[data-theme="dark"] .pomodoro-timer-big` 块之后插入）

- [ ] **Step 1: 在 `[data-theme="dark"] .pomodoro-timer-big { ... }` 块（结束于第 919 行 `}`）之后，插入以下 CSS**

  ```css

  /* ── Flip-digit containers ─── */
  .pomo-d {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
  }
  .pomo-v {
    display: block;
  }

  @keyframes pomo-exit {
    from { transform: translateY(0);     opacity: 1; }
    to   { transform: translateY(-115%); opacity: 0; }
  }
  @keyframes pomo-enter {
    from { transform: translateY(115%);  opacity: 0; }
    to   { transform: translateY(0);     opacity: 1; }
  }
  .pomo-v.pomo-exiting  { animation: pomo-exit  0.28s ease-in  forwards; }
  .pomo-v.pomo-entering { animation: pomo-enter 0.28s ease-out 0.12s both; }
  ```

---

## Task 5: 更新 pomodoro.js（Green）

**Files:**
- Modify: `js/pomodoro.js`（3 处）

- [ ] **Step 1: 在 DOM References 区（第 59 行 `let elWork, elShort, elLong, elInterval;` 之后）新增一行**

  ```js
  let elDigits = [];
  ```

  结果：
  ```js
  let elWork, elShort, elLong, elInterval;
  let elDigits = [];
  ```

- [ ] **Step 2: 在 `initPomodoro()` 的 DOM refs 区（第 422 行 `elTimerBig = ...` 之后）新增一行**

  ```js
  elTimerBig = document.getElementById('pomodoro-timer-big');
  elDigits = Array.from(elTimerBig.querySelectorAll('.pomo-v')); // 新增
  ```

- [ ] **Step 3: 替换 `updateDisplay()` 函数（第 93-95 行）**

  将：
  ```js
  function updateDisplay() {
    elTimerBig.textContent = formatTime(state.remaining);
  }
  ```
  替换为：
  ```js
  function updateDisplay() {
    const time = formatTime(state.remaining);
    elTimerBig.dataset.time = time;

    const d = [time[0], time[1], time[3], time[4]]; // M0 M1 S0 S1，跳过冒号
    d.forEach((newVal, i) => {
      const cur = elDigits[i];
      if (cur.textContent === newVal) return;

      const next = cur.cloneNode(false);
      next.textContent = newVal;
      next.classList.add('pomo-entering');
      cur.classList.add('pomo-exiting');
      cur.parentElement.appendChild(next);

      next.addEventListener('animationend', () => {
        cur.remove();
        next.classList.remove('pomo-entering');
        elDigits[i] = next;
      }, { once: true });
    });
  }
  ```

- [ ] **Step 4: 运行测试，确认全部通过（Green）**

  ```bash
  npm test
  ```

  Expected: 所有 81 用例 PASS。

- [ ] **Step 5: 提交**

  ```bash
  git add newtab.html css/style.css js/pomodoro.js tests/setup.js tests/pomodoro.test.js
  git commit -m "feat(pomodoro): 每位数字独立翻牌动画（向上滑入）"
  ```

---

## Task 6: 手动验证

- [ ] **Step 1: 在浏览器中验证动画效果**

  ```bash
  npx serve .
  # 访问 http://localhost:3000
  ```

  打开番茄钟，点击播放，观察：
  - 秒个位每秒翻动
  - 秒十位每 10 秒翻动
  - 分钟位更少翻动
  - 冒号不参与动画
  - 翻牌完成后阶段完成时的 `pomodoro-flash` 闪烁仍正常

- [ ] **Step 2: 切换深色模式，确认字色正确**

  翻牌动画中新旧 span 均继承 `.pomodoro-timer-big` 的 `color: var(--text-primary)`，深色模式下 `text-shadow` 由外层 `<time>` 继承，无需额外样式。
