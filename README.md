# Espanso GUI

Espanso GUI 是一个用于管理 [Espanso](https://espanso.org/) 文本替换工具配置的图形界面应用。通过直观的界面，您可以轻松创建、编辑和管理 Espanso 的文本替换规则和分组。

## 功能特点

- 直观的图形界面管理 Espanso 配置
- 支持规则和分组的创建、编辑和删除
- 支持变量、表单和高级功能配置
- 跨平台支持：macOS、Windows、Linux 和 Web
- 多种使用方式：Web 应用程序、独立应用程序或 uTools 插件

## 使用方法

### Web 版本

1. 打开 Web 应用（可通过 GitHub Pages 或自行部署）
2. 首次使用时，会提示您选择 Espanso 配置文件夹
3. 选择配置文件夹后，应用会自动加载配置
4. 通过界面编辑配置后，可以导出配置文件

### 桌面应用程序（Electron）

1. 从 [Releases](https://github.com/yourusername/espanso-gui/releases) 页面下载适合您操作系统的安装包
2. 安装并启动应用程序
3. 应用会自动检测 Espanso 配置目录，或者您也可以手动选择
4. 编辑配置后自动保存，或点击"导出配置"按钮导出文件

### uTools 插件

1. 在 uTools 插件市场中搜索"Espanso GUI"并安装
2. 在 uTools 中启动插件
3. 使用方式与桌面应用程序相同

## 开发指南

### 环境要求

- Node.js >= 18.0.0
- npm 或 pnpm

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm
pnpm install
```

### 开发模式

```bash
# 启动 Vite 开发服务器（Web 版本）
npm run dev

# 启动 Electron 开发模式（桌面应用版本）
npm run electron:dev
```

### 构建

```bash
# 构建 Web 版本
npm run build

# 预览构建后的 Web 版本
npm run preview

# 构建 Electron 应用（所有平台）
npm run electron:build

# 构建 Electron 应用（特定平台）
npm run electron:build:mac   # macOS
npm run electron:build:win   # Windows
npm run electron:build:linux # Linux

# 使用简单打包（无安装包，仅可执行文件）
npm run electron:package         # 当前平台
npm run electron:package:mac     # macOS
npm run electron:package:win     # Windows
npm run electron:package:linux   # Linux

# 使用更简单的打包流程（开发测试用）
npm run electron:simple-package         # 当前平台
npm run electron:simple-package:mac     # macOS
npm run electron:simple-package:win     # Windows
npm run electron:simple-package:linux   # Linux

# 构建 uTools 插件
npm run utools:build
```

## 项目结构

```
src/
├── assets/        # 静态资源
├── components/    # Vue 组件
│   ├── common/    # 通用组件
│   ├── forms/     # 表单组件
│   ├── layout/    # 布局组件
│   └── panels/    # 面板组件
├── services/      # 服务层
├── store/         # Pinia 存储
├── types/         # TypeScript 类型定义
├── utils/         # 工具函数
├── App.vue        # 应用根组件
└── main.ts        # 应用入口

electron/          # Electron 相关文件
├── main.js        # Electron 主进程
├── preload.js     # Electron 预加载脚本
└── electron-builder.json  # 构建配置

scripts/           # 构建脚本
```

## 特性说明

### 环境检测

应用可以自动检测当前运行环境（Web、Electron、uTools），并根据环境提供相应的功能：

- **Web 环境**：支持手动选择配置文件夹，配置保存在 localStorage
- **Electron 环境**：自动检测 Espanso 配置目录，支持直接文件系统读写
- **uTools 环境**：利用 uTools API 读写文件

### 配置管理

- 支持导入/导出 Espanso 配置文件
- 支持创建、编辑、删除规则和分组
- 支持所有 Espanso 高级特性（变量、表单、应用限制等）

## 跨平台支持

Espanso GUI 支持以下平台：

- **Web**：所有现代浏览器
- **macOS**：支持 Intel 和 Apple Silicon
- **Windows**：支持 Windows 10 及以上版本
- **Linux**：支持主流发行版
- **uTools**：作为插件在所有 uTools 支持的平台上运行

## 技术栈

- 前端框架：Vue 3（组合式 API）
- UI 组件库：Nuxt UI
- 状态管理：Pinia
- 构建工具：Vite
- 桌面应用框架：Electron
- 插件平台：uTools

## 故障排除

### Web 版本问题

- **无法选择文件夹**：某些浏览器可能不支持 `webkitdirectory` 属性，请尝试使用 Chrome 或 Edge
- **配置无法加载**：检查浏览器控制台错误信息，可能是 CORS 或权限问题
- **界面显示空白**：尝试清除浏览器缓存或使用隐私模式

### Electron 版本问题

- **白屏**：检查控制台日志，可能是资源路径问题
- **无法启动**：确保已正确安装依赖 `npm install`
- **找不到 Espanso 配置**：可手动选择配置文件夹

## 贡献指南

欢迎提交 Pull Request 或 Issue。在提交代码前，请确保：

1. 代码遵循项目的编码规范
2. 添加必要的测试
3. 更新相关文档

## 许可证

[MIT](LICENSE)
