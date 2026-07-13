# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Ziqi Tab — 极简暖调素纸风格的 Chrome/Edge 新标签页扩展。零构建步骤，外部运行时依赖：Animate.css CDN + Lora 字体（Google Fonts CDN）。

## Commands

```bash
# 加载到浏览器（手动一次）：
# Chrome → chrome://extensions → 开启开发者模式 → 加载已解压的扩展
# Edge → edge://extensions → 同上

# 本地预览（无需扩展，直接用浏览器打开）：
open newtab.html     # macOS
start newtab.html    # Windows
```

```bash
# 运行测试：
npm test              # 单次运行 vitest（CI 模式）
npm run test:watch    # Watch 模式开发测试


这是一个纯静态 HTML+CSS+JS 项目，无构建步骤、无 lint 配置。Animate.css（CDN）是唯一的运行时外部依赖。测试依赖 (`vitest` + `jsdom`) 是唯一的 devDependencies，不影响生产运行时。

> ⚠️ `start newtab.html`（Windows）或 `open newtab.html`（macOS）在 Chrome 下无法加载 ES Modules（`file://` CORS 限制），页面空白属于正常现象。
> 调试预览请使用 HTTP 服务器（如 `npx serve .`、`python -m http.server`、`npx live-server`），或直接在扩展模式加载。
```
## Architecture

```
newtab.html          ← 唯一页面入口，含全部 DOM 骨架 + 两个 <dialog>
css/
  base.css           ← CSS 变量 + 主题 token + 全局重置
  clock.css          ← 时钟 / 日期 / 问候语样式
  search.css         ← 搜索栏 + 引擎下拉样式
  links.css          ← 快捷链接网格 + 弹窗样式
  settings.css       ← 设置面板 + 搜索引擎管理样式
js/
  app.js             ← 入口，按序初始化所有模块
  theme.js           ← 深色/浅色模式：data-theme attr + localStorage
  clock.js           ← 时钟：每秒更新时分秒 + 日期 + 问候语
  search.js          ← 搜索栏 + 引擎下拉切换（Google/Bing/DuckDuckGo）
  links.js           ← 快捷链接网格：CRUD 弹窗，Simple Icons 图标
  settings.js        ← 设置面板：搜索栏宽度滑块控制
icons/               ← 搜索引擎本地 SVG 图标 + 扩展图标 PNG
tests/               ← 测试套件（Vitest + jsdom）
  setup.js           ← DOM 骨架注入 + 浏览器 API mock
  theme.test.js      ← 8 用例
  clock.test.js      ← 13 用例
  search.test.js     ← 14 用例
  links.test.js      ← 19 用例
  settings.test.js   ← 12 用例
manifest.json        ← Manifest V3
```

## 测试

- 框架：**Vitest** + **jsdom**（无需浏览器）
- 模式：纯函数 + DOM 断言，不修改生产代码
- 特殊处理：
  - `<dialog>.showModal()` 通过 setup 中 polyfill 实现（jsdom 不支持）
  - `animationend` 事件由测试手动 dispatch（jsdom 不执行 CSS 动画）
- 运行：`npm test`（CI）/ `npm run test:watch`（开发）

## Data Flow (localStorage)

所有用户数据持久化在 localStorage，key 均以 `ziqi-` 前缀隔离：

| Key | 用途 | 格式 |
|-----|------|------|
| `ziqi-theme` | 主题偏好（缺省则跟随系统） | `"dark"` 或缺失 |
| `ziqi-engine` | 默认搜索引擎 | `"google"` / `"bing"` / `"duckduckgo"` |
| `ziqi-links` | 快捷链接列表 | `[{id, title, url}, ...]` |
| `ziqi-search-width` | 搜索栏宽度 | `"520"` 等数字字符串 |

## Theme System

- 通过 `<html data-theme="dark">` 控制深色模式（无属性 = 浅色）
- 初次加载检查 localStorage → 无记录则跟随 `prefers-color-scheme`
- 用户手动切换后固定选择，不再跟随系统（除非清除 localStorage）
- CSS 变量集中定义在 `:root` / `[data-theme="dark"]`，使用 `--text-primary`、`--surface` 等语义化 token
- 主题切换后 dispatch `theme-changed` 自定义事件，search 和 links 模块监听后重新渲染图标

## Key Patterns

- **零构建**：所有 JS 使用原生 ES Modules（`type="module"`），浏览器直接加载
- **弹窗**：使用原生 `<dialog>` + `showModal()` / `close()`，backdrop 点击即关闭
- **动画**：
  - 页面级入口动画：Animate.css CDN（`animate__bounceInUp`），`.container` 初始 `visibility: hidden`，DOMContentLoaded 后置可见 + 加 class 触发
  - 组件级动画：纯 CSS animation（搜索引擎下拉的 fade in/out），无 JS 动画库
  - `.container` 的 `--animate-duration: 0.7s` 控制整体速度
- **图标**：搜索引擎用本地 SVG（`icons/` 目录）；快捷链接用 `simpleicons.org` CDN，深色模式传浅色 hex 参数
- **时钟**：`setInterval(tick, 1000)` 对齐下一整秒启动避免 JS 偏移；CSS 层面 `.time-sec` 用 `position: absolute` 脱离布局流，避免秒数字比例宽度波动导致 `.time` 整宽变化 → flex 重居中产生左右漂移（参考 qiaomu-tab 单元素时钟结构）
