# 构建脚本

这个目录包含项目的构建脚本，用于增强构建过程和提供额外功能。

## build.js

这是一个增强的构建脚本，提供以下功能：

1. 执行构建命令
2. 播放系统提示音
3. 显示桌面通知
4. 提供构建时间统计
5. 记录构建日志

### 使用方法

可以通过 npm/pnpm 脚本使用这个构建脚本：

```bash
# Web 构建
pnpm build

# Electron 构建
pnpm electron:build

# 特定平台构建
pnpm electron:build:mac
pnpm electron:build:win
pnpm electron:build:linux

# 安静模式（不显示通知和提示音）
pnpm build:quiet
pnpm electron:build:quiet
```

也可以直接使用脚本：

```bash
# Web 构建
node scripts/build.js

# Electron 构建
node scripts/build.js --electron

# 特定平台构建
node scripts/build.js --electron --target=mac
node scripts/build.js --electron --target=win
node scripts/build.js --electron --target=linux

# 安静模式（不显示通知和提示音）
node scripts/build.js --quiet
node scripts/build.js --electron --quiet
```

### 日志

构建日志会保存在 `logs/build.log` 文件中，记录每次构建的时间和结果。

### 平台支持

脚本支持以下平台：

- **macOS**: 使用 AppleScript 显示通知和播放系统提示音
- **Windows**: 使用 PowerShell 显示通知和播放系统提示音
- **Linux**: 使用 notify-send 显示通知和播放系统提示音

### 自定义

如果需要自定义构建过程，可以编辑 `scripts/build.js` 文件。
