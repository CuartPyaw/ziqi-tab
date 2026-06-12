# 番茄钟翻牌计时器设计文档

**日期：** 2026-06-11  
**状态：** 已审批

## 需求

将番茄钟的时间显示改为逐位翻牌动画（Scoreboard Flip）：每秒倒计时时，只有数值发生变化的那一位数字执行翻牌——旧数字向上滑出，新数字从下方滑入。时钟模块样式不受影响。

## 设计决策

| 问题 | 选择 |
|---|---|
| 动画方向 | 向上滑入（Slide Up） |
| 动画粒度 | 每位数字独立（M0 M1 S0 S1 各自独立） |
| 视觉风格 | 延续现有衬线大字，无格子背景 |
| 进出动画 | 双向：旧数字向上退出 + 新数字从下方进入 |
| 测试兼容 | `data-time` 属性作为语义值，替代 `textContent` 断言 |

## 改动文件

### 1. `newtab.html`

第 24 行，`<time>` 元素内部重构为 5 个子元素（4 位数字 + 1 个冒号），写成单行避免多余空白影响 `textContent`：

```html
<time class="pomodoro-timer-big" id="pomodoro-timer-big" data-time="25:00"><span class="pomo-d"><span class="pomo-v">2</span></span><span class="pomo-d"><span class="pomo-v">5</span></span><span class="pomo-sep">:</span><span class="pomo-d"><span class="pomo-v">0</span></span><span class="pomo-d"><span class="pomo-v">0</span></span></time>
```

- `.pomo-d`：裁切容器，每位一个，`overflow: hidden`
- `.pomo-v`：数字层，动画作用在这一层
- `.pomo-sep`：冒号，不参与动画
- `data-time`：语义时间值，由 JS 同步维护，供测试读取

### 2. `css/style.css`

在 `.pomodoro-timer-big` 区块（第 907 行附近）之后新增：

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

/* exit: 旧数字向上滑出 */
@keyframes pomo-exit {
  from { transform: translateY(0);     opacity: 1; }
  to   { transform: translateY(-115%); opacity: 0; }
}
/* enter: 新数字从下方滑入 */
@keyframes pomo-enter {
  from { transform: translateY(115%);  opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
.pomo-v.pomo-exiting  { animation: pomo-exit  0.28s ease-in  forwards; }
.pomo-v.pomo-entering { animation: pomo-enter 0.28s ease-out 0.12s both; }
```

进出总时长约 0.4s，不影响现有 `--animate-duration: 0.55s`。现有 `.pomodoro-timer-big.pomodoro-flash` 作用于外层 `<time>`，完全兼容。

### 3. `js/pomodoro.js`

**新增模块级变量：**

```js
let elDigits = []; // 4 个 .pomo-v 元素的实时引用
```

**`init()` 中，`elTimerBig` 赋值之后新增：**

```js
elDigits = Array.from(elTimerBig.querySelectorAll('.pomo-v'));
```

**替换 `updateDisplay()` 函数：**

```js
function updateDisplay() {
  const time = formatTime(state.remaining);
  elTimerBig.dataset.time = time;           // 同步更新语义值

  const d = [time[0], time[1], time[3], time[4]]; // M0 M1 S0 S1（跳过冒号）
  d.forEach((newVal, i) => {
    const cur = elDigits[i];
    if (cur.textContent === newVal) return;  // 无变化，跳过

    const next = cur.cloneNode(false);
    next.textContent = newVal;
    next.classList.add('pomo-entering');
    cur.classList.add('pomo-exiting');
    cur.parentElement.appendChild(next);

    cur.addEventListener('animationend', () => {
      cur.remove();
      next.classList.remove('pomo-entering');
      elDigits[i] = next;
    }, { once: true });
  });
}
```

**关键行为：**
- `dataset.time` 在动画开始前同步更新，测试读取此值
- `elDigits[i]` 在 `animationend` 后更新为新 span，保证下次 diff 引用正确
- jsdom 不触发 `animationend`，旧 span 不会被移除，但 `dataset.time` 已正确，测试通过

### 4. `tests/setup.js`

将第 88 行：

```html
<time class="pomodoro-timer-big" id="pomodoro-timer-big">25:00</time>
```

替换为与 `newtab.html` 一致的 digit 结构（单行，含 `data-time` 属性）。

### 5. `tests/pomodoro.test.js`

所有时间断言（约 9 处）由：

```js
document.getElementById('pomodoro-timer-big').textContent
```

改为：

```js
document.getElementById('pomodoro-timer-big').dataset.time
```

涉及约 13 处引用（含 2 处赋值给 `display` 变量），逻辑不变，纯机械替换。

## 不改动范围

- `clock.js` / `clock.test.js`：时钟模块完全不动
- `pomodoro.js` 中的 `runTransition()`：番茄钟进出页面的切换动画不变
- `.pomodoro-timer-big` 的字体、尺寸、颜色 CSS 规则不变
- `pomodoro-flash` 动画不变

## 测试策略

- `npm test` 运行通过（改断言后）
- 手动在扩展中验证：倒计时过程中各位数字独立翻牌
- 验证 `pomodoro-flash` 闪烁效果（完成时）仍正常
