# 新标签页自动聚焦搜索栏

## 动机

打开新标签页时，浏览器默认将焦点放在地址栏，导致搜索栏的 HTML `autofocus` 属性失效。用户希望页面入场动画完成后，焦点自动移到搜索栏，可以直接打字搜索。

## 设计

### 改动范围

仅 `js/app.js`，在现有动画代码之后追加 3 行。

### 时序

```
DOMContentLoaded
  → initTheme → initClock → initSearch → initLinks → initSettings → initPomo
  → 绑定主题切换按钮
  → container 设 visible + 添加 animate__bounceInUp
  → 新增：监听 container 的 animationend 事件
       → document.getElementById('search-input').focus()
       → { once: true } 自动解绑
```

### 代码

```js
container.addEventListener('animationend', () => {
  document.getElementById('search-input').focus();
}, { once: true });
```

### 设计决策

- **位置**：放在 `app.js`（入口文件），而非 `search.js`。聚焦搜索栏是页面级编排逻辑，search 模块不应感知页面入场动画的存在。
- **`{ once: true }`**：事件触发后自动解绑，与 `pomodoro.js` 中已有的 animationend 监听模式一致。
- **安全性**：`#search-input` 元素在 DOM 中必定存在；`.focus()` 在空结果上不会抛出异常。

### 边界情况

- 动画期间用户若点击别处（如快捷链接），动画结束后焦点仍会移到搜索栏——对新标签页场景这是合理行为。
- 若 Animate.css CDN 加载失败，`animationend` 可能不触发。这是极边缘情况，且此时页面也无动画，用户可手动点击搜索栏。

## 验证

1. 打开新标签页，观察 bounceInUp 动画完成后搜索栏是否获得焦点（光标闪烁）
2. 获得焦点后直接打字，确认能输入到搜索栏
3. 按 Enter 确认搜索正常工作
