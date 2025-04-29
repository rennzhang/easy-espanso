const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { default: installExtension, VUE_DEVTOOLS } = require('electron-devtools-installer');

// 创建调试日志目录和文件
const homeDir = os.homedir();
const logDir = path.join(homeDir, 'Desktop', 'espanso-logs');
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    console.log('创建日志目录成功:', logDir);
  } catch (err) {
    console.error('创建日志目录失败:', err);
  }
}
const logFile = path.join(logDir, `app-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
let logStream;
try {
  logStream = fs.createWriteStream(logFile, { flags: 'a' });
  console.log('创建日志文件成功:', logFile);
} catch (err) {
  console.error('创建日志文件失败:', err);
}

// 重写console.log方法以同时写入文件
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = function() {
  const args = Array.from(arguments);
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  
  if (logStream && logStream.writable) {
    try {
      logStream.write(`[INFO][${new Date().toISOString()}] ${message}\n`);
    } catch (err) {
      originalConsoleError('写入日志失败:', err);
    }
  }
  originalConsoleLog.apply(console, args);
};

console.error = function() {
  const args = Array.from(arguments);
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  
  if (logStream && logStream.writable) {
    try {
      logStream.write(`[ERROR][${new Date().toISOString()}] ${message}\n`);
    } catch (err) {
      originalConsoleError('写入错误日志失败:', err);
    }
  }
  originalConsoleError.apply(console, args);
};

console.warn = function() {
  const args = Array.from(arguments);
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  
  if (logStream && logStream.writable) {
    try {
      logStream.write(`[WARN][${new Date().toISOString()}] ${message}\n`);
    } catch (err) {
      originalConsoleError('写入警告日志失败:', err);
    }
  }
  originalConsoleWarn.apply(console, args);
};

// 输出重要的系统和应用信息
console.log('Electron版本:', process.versions.electron);
console.log('Chrome版本:', process.versions.chrome);
console.log('Node版本:', process.versions.node);
console.log('操作系统:', process.platform, process.arch, os.release());
console.log('工作目录:', process.cwd());
console.log('应用路径:', app.getAppPath());

// 保持对window对象的全局引用，如果不这么做的话，当JavaScript对象被
// 垃圾回收的时候，window对象将会自动的关闭
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: true, // 开启节点集成以允许使用Node.js模块
      contextIsolation: true, // 保持上下文隔离以提高安全性
      enableRemoteModule: false, // 禁用remote模块
      worldSafeExecuteJavaScript: true, // 确保JS执行更安全
      sandbox: false // 禁用沙箱以允许访问Node.js模块
    }
  });
  
  // 打开开发者工具，便于调试
  mainWindow.webContents.openDevTools();

  // 监听页面加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
    
    // 如果所有备用路径都失败，显示错误页面
    mainWindow.webContents.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head>
          <title>加载错误</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; background: #f0f0f0; }
            .error { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; }
            pre { background: #eee; padding: 1rem; border-radius: 4px; overflow: auto; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>页面加载失败</h1>
            <p>应用程序遇到了一个错误，无法加载主页面。</p>
            <h2>错误详情：</h2>
            <pre>代码: ${errorCode}\n描述: ${errorDescription}</pre>
            <h2>可能的解决方案：</h2>
            <ul>
              <li>检查应用程序文件是否完整</li>
              <li>确保Node.js模块正确安装</li>
              <li>检查index.html和预加载脚本</li>
              <li>重新启动应用程序</li>
            </ul>
            <p><button onclick="window.location.reload()">重新加载</button></p>
          </div>
        </body>
      </html>
    `);
  });
  
  // 监听DOM就绪状态
  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM已就绪');
  });
  
  // 监听渲染过程的日志消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['debug', 'info', 'warning', 'error', 'log'];
    console.log(`[渲染进程:${levels[level]}] ${message}`);
  });

  // 加载应用
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('开发模式：加载开发服务器地址', process.env.VITE_DEV_SERVER_URL);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // 在生产模式下加载打包好的应用
    console.log('生产模式：加载本地文件');
    
    const rendererPath = path.join(__dirname, '../renderer/index.html');
    console.log('尝试加载路径:', rendererPath);
    
    // 检查文件是否存在
    if (fs.existsSync(rendererPath)) {
      console.log('文件存在，开始加载');
      mainWindow.loadFile(rendererPath);
    } else {
      console.error('文件不存在:', rendererPath);
      
      // 尝试查找可能的备选路径
      const possiblePaths = [
        path.join(__dirname, '../../dist/electron/renderer/index.html'),
        path.join(__dirname, '../../dist/index.html'),
        path.join(__dirname, '../../../dist/electron/renderer/index.html'),
        path.join(__dirname, '../../../dist/index.html'),
        path.join(app.getAppPath(), 'dist/electron/renderer/index.html')
      ];
      
      let found = false;
      for (const tryPath of possiblePaths) {
        console.log('尝试备选路径:', tryPath);
        if (fs.existsSync(tryPath)) {
          console.log('找到可用路径:', tryPath);
          mainWindow.loadFile(tryPath);
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.error('无法找到任何可用的index.html文件');
        mainWindow.loadURL(`data:text/html;charset=utf-8,
          <html>
            <head>
              <title>路径错误</title>
              <style>
                body { font-family: sans-serif; padding: 2rem; background: #f0f0f0; }
                .error { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #e74c3c; }
                pre { background: #eee; padding: 1rem; border-radius: 4px; overflow: auto; }
              </style>
            </head>
            <body>
              <div class="error">
                <h1>无法找到应用文件</h1>
                <p>应用程序无法找到主页面文件。</p>
                <h2>已尝试以下路径：</h2>
                <pre>${possiblePaths.join('\n')}</pre>
                <p>请确保应用程序正确打包。</p>
              </div>
            </body>
          </html>
        `);
      }
    }
  }

  // 当 window 被关闭，这个事件会被触发
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// 记录应用程序启动
console.log('应用程序启动...');

// 设置IPC处理程序
function setupIpcHandlers() {
  // 显示打开文件对话框
  ipcMain.handle('show-open-dialog', async (event, options) => {
    if (!mainWindow) return { canceled: true };
    return dialog.showOpenDialog(mainWindow, options);
  });

  // 显示保存文件对话框
  ipcMain.handle('show-save-dialog', async (event, options) => {
    if (!mainWindow) return { canceled: true };
    return dialog.showSaveDialog(mainWindow, options);
  });

  // 显示通知
  ipcMain.on('show-notification', (event, { title, body }) => {
    new Notification({ title, body }).show();
  });

  // 应用控制
  ipcMain.on('quit-app', () => {
    app.quit();
  });

  ipcMain.on('minimize-app', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize-app', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
}

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(async () => {
  console.log('Electron就绪，创建窗口...');
  
  // 安装Vue开发者工具
  try {
    await installExtension(VUE_DEVTOOLS);
    console.log('Vue Devtools安装成功');
  } catch (err) {
    console.error('Vue Devtools安装失败:', err);
  }
  
  setupIpcHandlers();
  createWindow();

  app.on('activate', function () {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (mainWindow === null) createWindow();
  });
});

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。
// 在macOS上，应用程序及其菜单栏通常会保持活动状态，
// 直到用户使用Cmd + Q明确退出
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 在这个文件中，你可以续写应用剩下主进程代码。
// 也可以拆分成几个文件，然后用 require 导入。 