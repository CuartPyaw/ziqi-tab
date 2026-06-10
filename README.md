# Ziqi Tab

极简、暖调素纸风格的浏览器起始页。替代 Chrome / Edge 默认新标签页。

## 特性

- 🕐 居中大字号时钟 + 日期 + 时段问候语
- 🔍 搜索栏（Google / Bing / DuckDuckGo 可切换）
- 🔗 可编辑快捷链接网格（双击或右键编辑）
- 🍅 内嵌番茄钟（替换时钟，3D 翻页切换 + 自定义时长）
- 🌓 深色 / 浅色模式（跟随系统，可手动切换）
- 🎴 暖调素纸背景纹理，纯 CSS 实现
- 🎬 开门式 bounceInUp 进入动画（Animate.css）
- 📦 零构建步骤，仅 animate.css CDN 一个外部依赖

## 安装

1. 打开 Chrome，访问 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `ziqi-tab` 文件夹
5. 打开新标签页即可看到

Edge 同理：访问 `edge://extensions`，开启开发者模式后加载。

## 使用

| 操作 | 方式 |
|------|------|
| 搜索 | 直接输入关键词 → Enter |
| 切换搜索引擎 | 点击搜索栏右侧下拉菜单 |
| 添加快捷链接 | 点击「+ 添加」按钮 |
| 编辑链接 | 双击链接图标，或右键 → 编辑 |
| 删除链接 | 双击进入编辑 → 点「删除」 |
| 切换主题 | 右下角 🌙 / ☀️ 按钮 |
| 启动番茄钟 | 点击时钟区域的 🍅 按钮 |
| 番茄钟设置 | 番茄钟面板右下角 ⚙️ 按钮 |

## 技术栈

- Manifest V3
- Vanilla HTML / CSS / JS (ES Modules)
- Animate.css CDN 提供新标签页开门动画
- Simple Icons CDN 提供快捷链接图标
- localStorage 持久化所有用户数据

## 测试

```bash
npm test              # 单次运行 vitest（CI 模式）
npm run test:watch    # Watch 模式开发测试
```

框架：**Vitest** + **jsdom**（无需浏览器），共 81 个测试用例覆盖所有模块。
