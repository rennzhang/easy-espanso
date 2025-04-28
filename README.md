# Espanso GUI

Espanso GUI 是一个用于管理 [Espanso](https://espanso.org/) 文本替换工具配置的图形界面应用。

## 功能特点

- 直观的图形界面管理 Espanso 配置
- 支持规则和分组的创建、编辑和删除
- 支持变量和表单配置
- 跨平台支持：macOS、Windows、Linux
- 多种使用方式：独立应用程序或 uTools 插件

## 使用方法

### 作为独立应用程序

1. 从 [Releases](https://github.com/yourusername/espanso-gui/releases) 页面下载适合您操作系统的安装包
2. 安装并启动应用程序
3. 点击"打开配置"按钮，选择 Espanso 配置文件或目录
4. 编辑配置后点击"保存配置"按钮保存更改

### 作为 uTools 插件

1. 在 uTools 插件市场中搜索"Espanso GUI"并安装
2. 在 uTools 中启动插件
3. 使用方式与独立应用程序相同

## 开发指南

### 环境要求

- Node.js >= 18.0.0
- npm 或 pnpm

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 开发模式

```bash
# 启动 Vite 开发服务器
npm run dev

# 启动 Electron 开发模式
npm run electron:dev
```

### 构建

```bash
# 构建 Web 版本
npm run build

# 构建 Electron 应用
npm run electron:build

# 构建 uTools 插件
npm run utools:build
```

## 跨平台支持

Espanso GUI 支持以下平台：

- **macOS**: 支持 Intel 和 Apple Silicon
- **Windows**: 支持 Windows 10 及以上版本
- **Linux**: 支持主流发行版
- **uTools**: 作为插件在所有 uTools 支持的平台上运行

## 技术栈

- 前端框架: Vue 3
- UI 组件库: Nuxt UI
- 状态管理: Pinia
- 构建工具: Vite
- 桌面应用框架: Electron
- 插件平台: uTools

## 许可证

[MIT](LICENSE)
