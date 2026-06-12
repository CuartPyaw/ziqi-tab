# CSS 按组件拆分 — 设计文档

**日期**: 2026-06-11  
**状态**: 已批准

## 动机

- `css/style.css` 当前 ~1094 行，涵盖所有组件样式
- JS 已按组件拆分（`clock.js` / `search.js` / `links.js` / `settings.js` / `pomodoro.js`），CSS 应对齐
- 拆分后每个文件聚焦单一组件，方便定位编辑，也利于 AI 工具处理

## 文件划分

| 新文件 | 内容 | 来源行 | 对应 JS |
|--------|------|--------|---------|
| `css/base.css` | Reset、CSS 变量主题 token、html/body 纹理背景、`.container`、共享 keyframes（`dialog-in` / `fade-in`） | L1–L127, L767–L775 | 无（全局） |
| `css/clock.css` | `.hero`、`.day-row`、`.time`、`.time-sec`、`.moment-line` | L129–L198 | `clock.js` |
| `css/search.css` | `.search-wrapper`、`.search-bar`、引擎下拉（trigger/menu/options/backdrop）、`menu-in/out` keyframes | L201–L398 | `search.js` |
| `css/links.css` | `.links-grid`、`.link-item`、添加按钮、右键菜单、链接编辑 `<dialog>` | L400–L542, L746–L868 | `links.js` |
| `css/settings.css` | `.settings-bar`（悬浮按钮）、设置面板 dialog（左右布局、滑块、footer） | L544–L746 | `settings.js` |
| `css/pomodoro.css` | 番茄钟面板、翻牌动画（`pomo-exit` / `pomo-enter`）、阶段标签、session 圆点、工具按钮、完成闪烁 | L872–L1064 | `pomodoro.js` |

### 响应式规则

原 `@media (max-width: 600px)` 块（L1068–L1093）按选择器归属拆分：

- `.moment-line` → `clock.css`
- `.search-wrapper` → `search.css`
- `.links-grid` / `.link-item` / `.link-add` → `links.css`
- `.dialog-title` → `links.css`

每个组件文件末尾放自己的响应式规则。

### 共享样式处理

- `dialog-in` / `fade-in` keyframes 放入 `base.css`（settings dialog 和 links dialog 共用）
- 各自 dialog 的特定样式（尺寸、布局、按钮）属于哪个组件就放哪个文件

## HTML 改动

`newtab.html`：

```diff
- <link rel="stylesheet" href="css/style.css">
+ <link rel="stylesheet" href="css/base.css">
+ <link rel="stylesheet" href="css/clock.css">
+ <link rel="stylesheet" href="css/search.css">
+ <link rel="stylesheet" href="css/links.css">
+ <link rel="stylesheet" href="css/settings.css">
+ <link rel="stylesheet" href="css/pomodoro.css">
```

顺序：base 先加载（变量定义最早），其余组件文件无相互依赖，顺序任意。

## 不变项

- 所有 CSS 选择器名不变
- 所有 CSS 变量名不变
- JS 文件零改动
- `manifest.json` 零改动
- 浏览器加载行为不变（6 个 `<link>` 串行 request，总字节量不变）

## 风险

- 无。纯文件拆分，不修改任何样式规则。测试套件（`npm test`）将验证无回归。

## 实施顺序

1. 创建 6 个新 CSS 文件
2. 修改 `newtab.html` 的 `<link>` 引用
3. 删除 `css/style.css`
4. 运行 `npm test` 确认所有测试通过
