# 搜索引擎切换逻辑重新设计

> 日期：2026-06-13 | 状态：设计完成

## 概述

重新设计 ziqi-tab 的搜索引擎切换逻辑，支持自定义引擎添加、三种切换方式（鼠标点击循环、Tab 键循环、chevron 列表）、以及设置面板左右分栏重构。

## 第一节：数据模型

### 引擎对象结构

```js
{
  id: "google",                              // 唯一标识（预设固定，自定义用 crypto.randomUUID() 前 8 位）
  name: "Google",                            // 显示名称
  url: "https://www.google.com/search?q=",   // 搜索 URL 前缀（查询词追加在末尾）
  icon: "icons/google.svg",                  // 预设用本地 SVG，自定义用空字符串（首字母回退）
  builtin: true                              // true=预设不可删，false=用户自定义可删
}
```

### 存储架构（三层）

| 层级 | 存储位置 | 说明 |
|------|---------|------|
| 预设引擎 | 代码内硬编码（`BUILTIN_ENGINES` 常量） | Google、Bing、DuckDuckGo，始终存在，不可删除/编辑 |
| 自定义引擎 | `localStorage` key `ziqi-engines`（JSON 数组） | 用户通过设置面板增删改 |
| 引擎顺序 | `localStorage` key `ziqi-engine-order`（JSON 数组） | 控制 Tab/点击循环顺序 |
| 当前选择 | `localStorage` key `ziqi-engine`（字符串） | 当前选中引擎 id，维持现有 key 不变 |

**默认引擎顺序：** 预设引擎固定在前（Google → Bing → DuckDuckGo），自定义引擎按添加顺序追加在后。无 `ziqi-engine-order` 时使用此默认顺序。

### 引擎合并逻辑（运行时）

```js
function getAllEngines() {
  const presets = BUILTIN_ENGINES;           // 3 个硬编码预设
  const customs = loadCustomEngines();       // 从 ziqi-engines 读取
  const all = { ...presets, ...customs };    // 合并为 {id: engineObj} map
  const order = getEngineOrder();            // 从 ziqi-engine-order 读取
  return order.map(id => all[id]).filter(Boolean); // 有序数组
}
```

## 第二节：交互模型

搜索栏右侧引擎区**只显示图标**（不含文字名称），分为两个独立点击区域：

### 交互分区

```
┌──────────────────────────────────────────────────┐
│  🔍  搜索…                    │ [G] │ ⌵ │       │
│                               │图标区│chevron│    │
└──────────────────────────────────────────────────┘
```

- **图标区**（引擎图标）：点击 = 切换到下一个引擎
- **Chevron**（小箭头）：点击 = 打开完整引擎列表

### 三条切换路径

| 路径 | 触发方式 | 行为 |
|------|---------|------|
| 🖱️ 鼠标点击 | 点击引擎图标 | 循环切换到下一个引擎，图标 fade 过渡 |
| ⌨️ Tab 键 | 输入框聚焦时按 Tab | 下一个引擎（preventDefault 阻止焦点离开搜索栏） |
| ⌨️ Shift+Tab | 输入框聚焦时按 Shift+Tab | 上一个引擎 |
| 📋 Chevron 列表 | 点击 chevron 箭头 | 展开下拉菜单（沿用现有），显示所有引擎名称+图标 |

### Tab 键行为

```
输入框 keydown
  ├── Tab（无 Shift）
  │     → e.preventDefault() 阻止焦点移动
  │     → cycleEngine(+1) 切换到下一个
  │     → 引擎图标触发短暂高亮动画
  │
  ├── Shift + Tab
  │     → e.preventDefault()
  │     → cycleEngine(-1) 切换到上一个
  │
  └── Enter → 执行搜索（行为不变）
```

### 下拉菜单增强

- 菜单内支持 ↑↓ 键盘导航
- Enter 选择引擎
- Escape 关闭菜单
- 菜单内容：所有引擎（预设 + 自定义），当前选中高亮
- 自定义引擎旁显示 ✏️（编辑）🗑️（删除）图标

### 视觉反馈

| 操作 | 反馈 | 实现 |
|------|------|------|
| 鼠标悬停引擎区 | 背景微亮 + cursor pointer + tooltip（显示引擎名） | CSS :hover + title 属性 |
| 点击切换引擎 | 图标 fade 过渡（~200ms） | CSS transition opacity |
| Tab 键盘切换 | 引擎区短暂高亮闪烁（~300ms） | CSS 类 + animationend 移除 |
| Chevron 点击 | 旋转 180° + 菜单展开/收起动画 | 现有 CSS transform + anim-in/anim-out class |

## 第三节：设置面板

### 整体布局：左右分栏

```
┌──────────┬─────────────────────────────────────┐
│          │                                     │
│  搜索栏   │    右侧详情面板                      │
│          │    （根据左侧选中项动态切换内容）        │
│  搜索引擎  │                                     │
│          │                                     │
└──────────┴─────────────────────────────────────┘
```

左侧为导航列，点击切换右侧对应详情：

| 左侧导航项 | 右侧内容 |
|-----------|---------|
| 搜索栏 | 搜索栏长度滑块（现有功能，从现有垂直布局迁移过来） |
| 搜索引擎 | 预设引擎列表（灰色不可编辑）+ 自定义引擎列表（可编辑/删除）+ 添加按钮 |

### 引擎管理功能

- **预设引擎**：灰色背景显示，标签"预设"，无操作按钮
- **自定义引擎**：每项右侧有 ✏️ 编辑和 🗑️ 删除按钮
- **添加按钮**：虚线边框 `+ 添加搜索引擎`，点击打开子对话框

### 添加/编辑子对话框

```
┌──────────────────────────────┐
│  添加搜索引擎                  │
│                              │
│  引擎名称                     │
│  ┌──────────────────────┐    │
│  │ 例如：Kagi            │    │
│  └──────────────────────┘    │
│                              │
│  搜索 URL                    │
│  ┌──────────────────────┐    │
│  │ https://kagi.com/...  │    │
│  └──────────────────────┘    │
│  查询词会追加在 URL 末尾       │
│                              │
│            [取消]  [保存]     │
└──────────────────────────────┘
```

### 校验规则

| 规则 | 说明 |
|------|------|
| 预设引擎不可删除 | Google/Bing/DuckDuckGo 始终存在 |
| 预设引擎不可编辑 | 防止修改后 URL 失效无法恢复 |
| 删除自定义引擎 | 若当前正在使用，自动切回 Google |
| 名称不能为空 | 保存时校验，空名称提示错误 |
| URL 必须以 `https://` 开头 | 基本校验，拒绝 http://（防止 mixed content） |
| 名称不重复 | 同名校验（含预设），提示修改 |

## 第四节：代码架构变更

### 受影响文件

| 文件 | 变更程度 | 说明 |
|------|---------|------|
| `js/search.js` | 中 | 重构引擎存储 + 新增 cycleEngine/Tab 键盘 + 导出 API |
| `js/settings.js` | 中 | 重构为左右分栏 + 新增引擎管理 CRUD |
| `newtab.html` | 中 | 设置对话框改为左右分栏 + 引擎区去文字只留图标 |
| `css/style.css` | 小 | 设置面板左右分栏样式 + 引擎图标区调整 |
| `tests/search.test.js` | 中 | 新增 cycle + Tab + 自定义引擎测试 |
| `tests/settings.test.js` | 中 | 新增引擎 CRUD + 左右分栏切换测试 |

### search.js 变更清单

**新增函数：**
- `getAllEngines()` — 合并预设+自定义，按 order 排序返回数组
- `cycleEngine(direction)` — 按 direction(+1/-1) 循环切换引擎
- `getCurrentEngine()` — 导出当前引擎对象（供 settings 使用）
- `loadCustomEngines()` — 从 localStorage 读取 `ziqi-engines`
- `getEngineOrder()` — 读取 `ziqi-engine-order`，回退到默认顺序
- `saveEngineOrder(order)` — 持久化顺序（内部使用，添加/删除自定义引擎时自动更新）

**修改函数：**
- `renderTriggerIcon()` — 只渲染图标（去掉名称文字），自定义引擎用首字母方块
- `renderMenu()` — 渲染所有引擎（预设+自定义），支持 ↑↓ 键盘导航
- `initSearch()` — 绑定 Tab/Shift+Tab 键盘事件 + 点击循环 + chevron 分离点击

**不变函数：**
- `openMenu()`、`closeMenu()`、`toggleMenu()`、`search()`

**新增导出：**
```js
export { initSearch, getAllEngines, getCurrentEngine };
```

### settings.js 变更清单

**新增函数：**
- `switchTab(category)` — 左侧导航切换右侧内容面板
- `renderEngineList()` — 渲染预设+自定义引擎列表
- `openEngineForm(engine?)` — 打开添加/编辑子对话框
- `saveEngine(engine)` — 保存到 `ziqi-engines` + 通知 search 刷新
- `deleteEngine(id)` — 删除 + 若当前正在使用则切回 Google

**修改函数：**
- `initSettings()` — 注册两个 tab + 绑定导航点击

**不变：** 搜索栏宽度逻辑（`getStoredWidth` / `applyWidth` / `saveWidth`）

### 模块间通信

```
search.js ──export──→ getAllEngines(), getCurrentEngine()
                          ↓
settings.js ──import──→ 获取引擎列表 + 当前引擎
                          ↓
                    保存/删除引擎后
                          ↓
              dispatch CustomEvent('engines-changed')
                          ↓
search.js ──listen──→ 重新调用 renderTriggerIcon() + renderMenu()
```

## 第五节：图标方案 & 主题修复

### 自定义引擎图标：首字母回退

自定义引擎没有本地 SVG 文件，使用首字母方块作为图标：

| 引擎类型 | 图标来源 | 渲染方式 |
|---------|---------|---------|
| 预设引擎 | 本地 SVG 文件（现有，不变） | `<img src="icons/google.svg">` |
| 自定义引擎 | 首字母方块 | `<span class="engine-letter">K</span>` |

首字母方块使用 CSS 变量（`--text-primary`、`--surface` 等）自适应深色/浅色主题，不需要 `filter: invert(1)`。

### 下拉菜单中的图标

菜单中每条引擎左侧同样显示对应图标（预设=SVG，自定义=首字母方块），与搜索栏内保持一致。

### 主题切换修复

**现有问题：** 系统自动主题切换（`prefers-color-scheme` 变化）不 dispatch `theme-changed`，导致引擎图标不刷新。

**修复：**
1. `theme.js`：在 `matchMedia` change 监听器中新增 dispatch `theme-changed` 事件
2. `search.js`：首字母方块用 CSS 变量自适应，不再依赖 JS 刷新
3. 预设 SVG 继续使用 CSS `filter: invert(1)`（现有机制不变）

## 测试策略

### search.test.js 新增用例

- 点击引擎图标循环切换到下一个引擎
- 点击图标循环到最后一个后回到第一个
- Tab 键切换到下一个引擎（输入框聚焦时）
- Shift+Tab 切换到上一个引擎
- Tab 键阻止焦点离开搜索栏
- 只有一个引擎时点击/Tab 无效果
- 菜单中包含自定义引擎选项
- 菜单中 ↑↓ 键导航选项
- 引擎变更后 dispatch `engines-changed` 事件

### settings.test.js 新增用例

- 左右分栏切换标签
- 预设引擎列表渲染（不可编辑/删除）
- 自定义引擎列表渲染
- 添加自定义引擎（子对话框 + 保存）
- 编辑自定义引擎
- 删除自定义引擎（当前使用中 → 回退 Google）
- 名称空校验
- URL 非 https 校验
- 名称重复校验

### 现有测试兼容

现有 14 个 search 测试 + 12 个 settings 测试大部分保持兼容，部分需要小幅调整（如 `renderTriggerIcon` 不再渲染文字名称）。
