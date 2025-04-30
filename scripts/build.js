#!/usr/bin/env node

/**
 * 增强的构建脚本
 * 
 * 功能：
 * 1. 执行构建命令
 * 2. 播放系统提示音
 * 3. 显示桌面通知
 * 4. 提供构建时间统计
 */

const { execSync } = require('child_process');
const { platform } = require('os');
const { existsSync, mkdirSync } = require('fs');
const path = require('path');

// 确保 logs 目录存在
const logsDir = path.join(__dirname, '../logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// 获取命令行参数
const args = process.argv.slice(2);
const isElectronBuild = args.includes('--electron');
const target = args.find(arg => arg.startsWith('--target='))?.split('=')[1] || '';
const isQuiet = args.includes('--quiet');

// 构建类型
let buildType = 'Web';
if (isElectronBuild) {
  buildType = 'Electron';
  if (target) {
    buildType += ` (${target})`;
  }
}

// 开始时间
const startTime = new Date();
console.log(`\n🚀 开始 ${buildType} 构建...\n`);

try {
  // 构建命令
  let buildCommand = 'electron-vite build';
  
  if (isElectronBuild) {
    buildCommand += ' && electron-builder';
    
    if (target) {
      buildCommand += ` --${target}`;
    }
    
    buildCommand += ' --config electron/electron-builder.json';
  }
  
  // 执行构建
  execSync(buildCommand, { stdio: 'inherit' });
  
  // 计算构建时间
  const endTime = new Date();
  const buildTime = (endTime - startTime) / 1000; // 秒
  
  // 成功消息
  console.log(`\n✅ ${buildType} 构建成功！用时: ${buildTime.toFixed(2)}秒\n`);
  
  // 播放提示音和显示通知
  if (!isQuiet) {
    const os = platform();
    
    if (os === 'darwin') { // macOS
      // 使用 AppleScript 显示通知并播放提示音
      execSync(`osascript -e 'display notification "构建成功！用时: ${buildTime.toFixed(2)}秒" with title "Espanso GUI - ${buildType}" sound name "Glass"'`);
    } else if (os === 'win32') { // Windows
      // 使用 PowerShell 显示通知
      const psCommand = `
        [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms')
        [System.Windows.Forms.SystemSounds]::Asterisk.Play()
        $notification = New-Object System.Windows.Forms.NotifyIcon
        $notification.Icon = [System.Drawing.SystemIcons]::Information
        $notification.BalloonTipTitle = "Espanso GUI - ${buildType}"
        $notification.BalloonTipText = "构建成功！用时: ${buildTime.toFixed(2)}秒"
        $notification.Visible = $true
        $notification.ShowBalloonTip(5000)
      `;
      execSync(`powershell -Command "${psCommand}"`);
    } else if (os === 'linux') { // Linux
      // 使用 notify-send 显示通知
      try {
        execSync(`notify-send "Espanso GUI - ${buildType}" "构建成功！用时: ${buildTime.toFixed(2)}秒" -i dialog-information`);
        // 尝试播放系统提示音
        execSync('paplay /usr/share/sounds/freedesktop/stereo/complete.oga || aplay /usr/share/sounds/freedesktop/stereo/complete.oga || true');
      } catch (error) {
        // 忽略通知错误
      }
    }
  }
  
  // 记录构建日志
  const logMessage = `[${new Date().toISOString()}] ${buildType} 构建成功，用时: ${buildTime.toFixed(2)}秒\n`;
  const logFile = path.join(logsDir, 'build.log');
  execSync(`echo "${logMessage}" >> "${logFile}"`);
  
} catch (error) {
  // 构建失败
  const endTime = new Date();
  const buildTime = (endTime - startTime) / 1000; // 秒
  
  console.error(`\n❌ ${buildType} 构建失败！用时: ${buildTime.toFixed(2)}秒\n`);
  console.error(error);
  
  // 播放错误提示音和显示通知
  if (!isQuiet) {
    const os = platform();
    
    if (os === 'darwin') { // macOS
      execSync(`osascript -e 'display notification "构建失败！用时: ${buildTime.toFixed(2)}秒" with title "Espanso GUI - ${buildType}" sound name "Basso"'`);
    } else if (os === 'win32') { // Windows
      const psCommand = `
        [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms')
        [System.Windows.Forms.SystemSounds]::Hand.Play()
        $notification = New-Object System.Windows.Forms.NotifyIcon
        $notification.Icon = [System.Drawing.SystemIcons]::Error
        $notification.BalloonTipTitle = "Espanso GUI - ${buildType}"
        $notification.BalloonTipText = "构建失败！用时: ${buildTime.toFixed(2)}秒"
        $notification.Visible = $true
        $notification.ShowBalloonTip(5000)
      `;
      execSync(`powershell -Command "${psCommand}"`);
    } else if (os === 'linux') { // Linux
      try {
        execSync(`notify-send "Espanso GUI - ${buildType}" "构建失败！用时: ${buildTime.toFixed(2)}秒" -i dialog-error`);
        execSync('paplay /usr/share/sounds/freedesktop/stereo/dialog-error.oga || aplay /usr/share/sounds/freedesktop/stereo/dialog-error.oga || true');
      } catch (error) {
        // 忽略通知错误
      }
    }
  }
  
  // 记录构建日志
  const logMessage = `[${new Date().toISOString()}] ${buildType} 构建失败，用时: ${buildTime.toFixed(2)}秒\n`;
  const logFile = path.join(logsDir, 'build.log');
  execSync(`echo "${logMessage}" >> "${logFile}"`);
  
  process.exit(1);
}
