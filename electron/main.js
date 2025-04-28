const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
  // 输出关键路径信息
  const preloadPath = path.join(__dirname, 'preload.js');
  // 修改 index.html 的路径，不再使用相对路径
  const indexPath = path.join(app.getAppPath(), 'index.html');
  
  console.log('预加载脚本路径:', preloadPath);
  console.log('预加载脚本存在:', fs.existsSync(preloadPath));
  console.log('主页面路径:', indexPath);
  console.log('主页面存在:', fs.existsSync(indexPath));
  
  // 列出应用目录的内容，以便调试
  try {
    console.log('应用目录内容:');
    const appDirContents = fs.readdirSync(app.getAppPath());
    appDirContents.forEach(item => {
      console.log(`- ${item}`);
    });
  } catch (err) {
    console.error('无法列出应用目录内容:', err);
  }
  
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: true, // 开启节点集成以允许使用Node.js模块
      contextIsolation: true, // 保持上下文隔离以提高安全性
      enableRemoteModule: false, // 禁用remote模块
      worldSafeExecuteJavaScript: true, // 确保JS执行更安全
      sandbox: false // 禁用沙箱以允许访问Node.js模块
    }
  });

  // 监听页面加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
    
    // 尝试加载备用路径
    const alternativePaths = [
      path.join(__dirname, 'index.html'),
      path.join(__dirname, '../index.html'),
      path.join(app.getAppPath(), '../index.html'),
      path.join(app.getAppPath(), 'app/index.html')
    ];
    
    console.log('尝试备用路径:');
    for (const altPath of alternativePaths) {
      console.log(`- ${altPath} (存在: ${fs.existsSync(altPath)})`);
    }
    
    // 尝试每个备用路径
    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath)) {
        console.log(`尝试加载备用路径: ${altPath}`);
        try {
          mainWindow.loadFile(altPath);
          return; // 如果成功，不再继续
        } catch (err) {
          console.error(`加载备用路径失败: ${altPath}`, err);
        }
      }
    }
    
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
            <p><button onclick="window.reload()">重新加载</button></p>
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
  // 在开发环境中使用 Vite 开发服务器
  // 在生产环境中加载 dist 目录下的 index.html
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log('开发模式: 正在连接到Vite开发服务器...');
    mainWindow.loadURL('http://localhost:5173/');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    console.log('生产模式: 正在加载本地HTML文件...');
    try {
      // 先尝试读取文件内容，确认文件是否存在且可读
      let fileContent = '文件不存在';
      try {
        fileContent = fs.readFileSync(indexPath, 'utf8').slice(0, 100) + '...';
        console.log('HTML文件内容预览:', fileContent);
      } catch (err) {
        console.error('无法读取HTML文件:', err);
        // 尝试备用路径
        const alternativePaths = [
          path.join(__dirname, 'index.html'),
          path.join(__dirname, '../index.html'),
          path.join(app.getAppPath(), '../index.html'),
          path.join(app.getAppPath(), 'app/index.html')
        ];
        
        for (const altPath of alternativePaths) {
          if (fs.existsSync(altPath)) {
            console.log(`尝试读取备用文件: ${altPath}`);
            try {
              fileContent = fs.readFileSync(altPath, 'utf8').slice(0, 100) + '...';
              console.log('备用HTML文件内容预览:', fileContent);
              console.log('使用备用路径:', altPath);
              mainWindow.loadFile(altPath);
              mainWindow.webContents.openDevTools();
              return; // 如果成功，不再继续
            } catch (altErr) {
              console.error(`读取备用文件失败: ${altPath}`, altErr);
            }
          }
        }
      }
      
      mainWindow.loadFile(indexPath);
      // 始终打开开发者工具，方便调试
      mainWindow.webContents.openDevTools();
    } catch (err) {
      console.error('加载HTML文件时出错:', err);
      
      // 尝试备用路径
      const alternativePaths = [
        path.join(__dirname, 'index.html'),
        path.join(__dirname, '../index.html'),
        path.join(app.getAppPath(), '../index.html'),
        path.join(app.getAppPath(), 'app/index.html')
      ];
      
      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          console.log(`尝试加载备用路径: ${altPath}`);
          try {
            mainWindow.loadFile(altPath);
            mainWindow.webContents.openDevTools();
            return; // 如果成功，不再继续
          } catch (altErr) {
            console.error(`加载备用路径失败: ${altPath}`, altErr);
          }
        }
      }
      
      // 如果所有备用路径都失败，显示错误信息
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
              <h1>无法加载应用</h1>
              <p>应用程序无法加载主页面。</p>
              <h2>错误详情：</h2>
              <pre>${err.message}</pre>
              <h2>尝试过的路径：</h2>
              <ul>
                <li>${indexPath} (主路径)</li>
                ${alternativePaths.map(p => `<li>${p} (备用路径, 存在: ${fs.existsSync(p)})</li>`).join('')}
              </ul>
              <p><button onclick="window.reload()">重新加载</button></p>
            </div>
          </body>
        </html>
      `);
      mainWindow.webContents.openDevTools();
    }
  }

  // 当 window 被关闭，这个事件会被触发
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// 记录应用程序启动
console.log('应用程序启动...');

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(() => {
  console.log('Electron就绪，创建窗口...');
  createWindow();

  app.on('activate', function () {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (mainWindow === null) createWindow();
  });
}).catch(err => {
  console.error('应用程序启动失败:', err);
});

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此，通常对程序和它们在
// 任务栏上的图标来说，应当保持活跃状态，直到用户使用 Cmd + Q 退出。
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

// 处理文件对话框
ipcMain.handle('show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(options);
});
