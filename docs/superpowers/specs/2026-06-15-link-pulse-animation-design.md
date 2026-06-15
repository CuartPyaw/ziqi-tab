# 链接 Pulse 动画重构设计

**日期**: 2026-06-15  
**状态**: 已确认

## 概述

将快捷链接（`.link-item`）的悬停和点击动画从当前的自定义 dock-bounce + CSS transition 方案，重构为基于 Animate.css `animate__pulse` 的统一脉动动画方案。

## 动机

- 当前点击动画（dock-bounce）仅作用于图标区域，与悬停的 transition 风格不一致
- 利用已有的 Animate.css CDN 依赖，减少自定义 keyframes
- Pulse 动画提供更柔和、更有"生命感"的交互反馈

## 动画行为规范

### 悬停（hover）

- 触发：鼠标移入 `.link-item`
- 动画：`animate__pulse animate__infinite`（持续脉动）
- 幅度：Animate.css 默认 scale(1 → 1.05 → 1)
- 周期：跟随项目全局 `--animate-duration`（0.7s）
- 移出：移除 class，脉动立即停止
- 背景/阴影/颜色的 CSS transition 保留，与 pulse 叠加

### 点击（click）

- 触发：鼠标左键单击 `.link-item`（无修饰键）
- 阶段 1：`animate__pulse` + `.click-pulse`（animation-duration: 0.4s），比悬停更快更有力
- 阶段 2：pulse animationend → 导航进度条 0%→100%（0.55s）
- 阶段 3：进度条 transitionend → `window.location.href` 跳转
- 总耗时：约 0.4s + 0.55s ≈ 0.95s

### 双击编辑

- **移除**。仅保留右键（contextmenu）编辑入口。
- 移除 200ms 单击延迟计时器，单击即时触发 pulse。

## CSS 变更 (`css/links.css`)

1. **移除**：
   - `@keyframes dock-bounce` 块
   - `.link-icon-wrapper.bouncing` 规则

2. **新增**：
   ```css
   /* 悬停：持续脉动 */
   .link-item:hover {
     animation: pulse var(--animate-duration, 1s) infinite;
     /* 保留原有 background / box-shadow / color transition */
   }

   /* 点击：加速脉动（单次） */
   .link-item.click-pulse {
     animation-duration: 0.4s;
   }
   ```

3. **保留**：
   - `.link-item` 的 `transition` 属性
   - `.link-item:hover` 的背景/阴影/颜色值
   - `.nav-progress` 完整样式

## JS 变更 (`js/links.js`)

1. **移除**：
   - `clickTimer` 变量及相关双击检测逻辑
   - `dblclick` 事件监听器
   - 当前 click handler 中的 dock-bounce（`.bouncing` class 相关代码）

2. **新增点击处理**：
   ```js
   elGrid.addEventListener('click', (e) => {
     if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
     const a = e.target.closest('.link-item');
     if (!a || !a.href) return;
     e.preventDefault();

     const href = a.href;
     const progressBar = document.getElementById('nav-progress');

     a.classList.add('click-pulse', 'animate__pulse');

     a.addEventListener('animationend', function onPulseEnd() {
       a.removeEventListener('animationend', onPulseEnd);
       a.classList.remove('click-pulse', 'animate__pulse');

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

3. **保留**：
   - 右键编辑（`contextmenu`）
   - 拖拽排序（dragstart/dragover/drop/dragend）
   - 对话框 CRUD 逻辑
   - 主题切换时图标更新

## 测试影响

需要更新的测试用例（`tests/links.test.js`）：

- 移除双击编辑相关测试用例（如有）
- 更新点击行为测试：不再验证 dock-bounce class，改为验证 `animate__pulse` + `click-pulse` class
- 验证 animationend 事件触发后的导航流程
- 悬停行为验证（CSS 动画 class 的添加/移除）

## 不涉及

- 不修改 HTML 结构（`newtab.html`）
- 不新增或移除 CDN 依赖
- 不修改快捷链接的数据模型或 localStorage 格式
- 不修改设置面板、搜索引擎、时钟、番茄钟等模块
