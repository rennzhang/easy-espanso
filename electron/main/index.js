// main.js (整合后的版本)

const { app, BrowserWindow, ipcMain, dialog, Notification, shell } = require('electron'); // 移除了 shell，如果需要再加回来
const path = require('path');
const fs = require('fs/promises'); // 使用 promises API
const fsSync = require('fs'); // 保留 fsSync 用于日志等同步操作
const os = require('os');
const { default: installExtension, VUE_DEVTOOLS } = require('electron-devtools-installer');
const yaml = require('js-yaml'); // **新增：导入 YAML 库**

// --- 日志记录设置 (保持不变) ---
const homeDir = os.homedir();
const logDir = path.join(homeDir, 'Desktop', 'espanso-logs'); // 日志目录改为桌面，方便查找
if (!fsSync.existsSync(logDir)) {
  try {
    fsSync.mkdirSync(logDir, { recursive: true });
    console.log('创建日志目录成功:', logDir);
  } catch (err) {
    console.error('创建日志目录失败:', err);
  }
}
const logFile = path.join(logDir, `app-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
let logStream;
try {
  logStream = fsSync.createWriteStream(logFile, { flags: 'a' });
  console.log('创建日志文件成功:', logFile);
} catch (err) {
  console.error('创建日志文件失败:', err);
}
// 重写 console 方法 (保持不变)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.log = function() { /* ... 省略，保持不变 ... */ originalConsoleLog.apply(console, arguments); };
console.error = function() { /* ... 省略，保持不变 ... */ originalConsoleError.apply(console, arguments); };
console.warn = function() { /* ... 省略，保持不变 ... */ originalConsoleWarn.apply(console, arguments); };
// --- 日志记录设置结束 ---

// --- 系统信息输出 (保持不变) ---
console.log('Electron版本:', process.versions.electron);
// ... 其他 console.log ...
console.log('应用路径:', app.getAppPath());
// --- 系统信息输出结束 ---


// --- IPC 通道名称 (必须与 preload.js 中的定义匹配) ---
const CHANNELS = {
    // 文件系统
    FS_READ_FILE: 'fs:readFile',
    FS_WRITE_FILE: 'fs:writeFile',
    FS_FILE_EXISTS: 'fs:fileExists',
    FS_DIR_EXISTS: 'fs:directoryExists',
    FS_CREATE_DIR: 'fs:createDirectory',
    FS_LIST_FILES: 'fs:listFiles',
    FS_SCAN_DIR: 'fs:scanDirectory',
    FS_DELETE_FILE: 'fs:deleteFile',
    FS_DELETE_DIR: 'fs:deleteDirectory',
    FS_RENAME: 'fs:rename',
    // 路径
    PATH_JOIN: 'path:join',
    // 对话框
    DIALOG_OPEN: 'dialog:showOpenDialog',
    DIALOG_SAVE: 'dialog:showSaveDialog',
    DIALOG_MESSAGE_BOX: 'dialog:showMessageBox',
    // 系统
    SYS_GET_PLATFORM: 'sys:getPlatform',
    SYS_SHOW_NOTIFICATION: 'sys:showNotification',
    SYS_GET_ENV_VAR: 'sys:getEnvironmentVariable',
    // YAML
    YAML_PARSE: 'yaml:parse',
    YAML_SERIALIZE: 'yaml:serialize',
    // IPC 状态
    IPC_READY_CHECK: 'ipc:readyCheck',
    IPC_MAIN_READY: 'ipc:mainReady',
    // 应用控制 (整合旧的)
    APP_QUIT: 'app:quit',
    APP_MINIMIZE: 'app:minimize',
    APP_MAXIMIZE: 'app:maximize',
    // 全屏状态 (如果需要从主进程发送)
    APP_FULLSCREEN_CHANGED: 'fullscreen-changed' // 与你现有代码匹配
};


// --- 全局变量 ---
let mainWindow; // 保持对 window 对象的全局引用

// --- 图标路径 (保持不变) ---
const appIconPath = path.join(__dirname, '../../build/icon.png');
// ... 图标检查逻辑 ...
// --- 图标路径结束 ---


// --- 注册所有 IPC 处理器 ---
/**
 * 注册主进程 IPC 事件处理器。
 * 应该在创建了 mainWindow 之后调用。
 * @param {BrowserWindow | null} mw 主 BrowserWindow 实例。
 */
function registerIpcHandlers(mw) {
    if (!mw) {
        console.error("[Main IPC] Cannot register handlers: mainWindow is null.");
        return;
    }
    const currentMainWindow = mw; // 使用传入的窗口实例
    console.log("[Main IPC] Registering IPC handlers...");
    let isReady = false;

    // --- 文件系统处理器 ---
    ipcMain.handle(CHANNELS.FS_READ_FILE, async (event, filePath) => {
        console.log(`[Main IPC] 读取文件: ${filePath}`);
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            console.error(`[Main IPC] 读取文件 ${filePath} 失败:`, error);
            throw error; // 将错误传递给渲染进程
        }
    });

    ipcMain.handle(CHANNELS.FS_WRITE_FILE, async (event, filePath, content) => {
        console.log(`[Main IPC] 写入文件: ${filePath}`);
        try {
            await fs.writeFile(filePath, content, 'utf8');
            return true;
        } catch (error) {
            console.error(`[Main IPC] 写入文件 ${filePath} 失败:`, error);
            throw error;
        }
    });

    ipcMain.handle(CHANNELS.FS_FILE_EXISTS, async (event, filePath) => {
        console.log(`[Main IPC] 检查文件是否存在: ${filePath}`);
        try {
            await fs.access(filePath, fs.constants.F_OK);
            // 检查是否是文件而不是目录
            const stats = await fs.stat(filePath);
            return stats.isFile();
        } catch (error) {
            console.log(`[Main IPC] 文件 ${filePath} 不存在或无法访问`);
            return false;
        }
    });

    ipcMain.handle(CHANNELS.FS_DIR_EXISTS, async (event, dirPath) => {
        console.log(`[Main IPC] 检查目录是否存在: ${dirPath}`);
        try {
            await fs.access(dirPath, fs.constants.F_OK);
            // 检查是否是目录而不是文件
            const stats = await fs.stat(dirPath);
            return stats.isDirectory();
        } catch (error) {
            console.log(`[Main IPC] 目录 ${dirPath} 不存在或无法访问`);
            return false;
        }
    });

    ipcMain.handle(CHANNELS.FS_CREATE_DIR, async (event, dirPath) => {
        console.log(`[Main IPC] 创建目录: ${dirPath}`);
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return true;
        } catch (error) {
            console.error(`[Main IPC] 创建目录 ${dirPath} 失败:`, error);
            throw error;
        }
    });

    ipcMain.handle(CHANNELS.FS_LIST_FILES, async (event, dirPath) => {
        console.log(`[Main IPC] 列出目录内容: ${dirPath}`);
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const result = [];

            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);
                const stats = await fs.stat(entryPath);

                result.push({
                    name: entry.name,
                    path: entryPath,
                    isDirectory: entry.isDirectory(),
                    size: stats.size,
                    modifiedTime: stats.mtime.toISOString(),
                    extension: path.extname(entry.name)
                });
            }

            return result;
        } catch (error) {
            console.error(`[Main IPC] 列出目录 ${dirPath} 内容失败:`, error);
            throw error;
        }
    });

    ipcMain.handle(CHANNELS.FS_SCAN_DIR, async (event, dirPath) => {
        console.log(`[Main IPC] 扫描目录结构: ${dirPath}`);
        try {
            // 检查目录是否存在
            try {
                await fs.access(dirPath, fs.constants.F_OK);
            } catch (error) {
                console.log(`[Main IPC] 目录 ${dirPath} 不存在，返回空数组`);
                return [];
            }

            // 递归扫描目录函数
            async function scanDir(currentPath) {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });
                const result = [];

                for (const entry of entries) {
                    const entryPath = path.join(currentPath, entry.name);

                    if (entry.isDirectory()) {
                        const children = await scanDir(entryPath);
                        result.push({
                            id: entryPath, // 使用路径作为唯一ID
                            name: entry.name,
                            path: entryPath,
                            type: 'directory', // 修改为 'directory' 以匹配 FileSystemNode 类型
                            children
                        });
                    } else {
                        result.push({
                            id: entryPath, // 使用路径作为唯一ID
                            name: entry.name,
                            path: entryPath,
                            type: 'file',
                            extension: path.extname(entry.name)
                        });
                    }
                }

                return result;
            }

            return await scanDir(dirPath);
        } catch (error) {
            console.error(`[Main IPC] 扫描目录 ${dirPath} 结构失败:`, error);
            throw error;
        }
    });

    ipcMain.handle(CHANNELS.FS_DELETE_FILE, async (event, filePath) => {
        console.log(`[Main IPC] 删除文件: ${filePath}`);
        try {
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            console.error(`[Main IPC] 删除文件 ${filePath} 失败:`, error);
            throw error;
        }
    });

    ipcMain.handle(CHANNELS.FS_DELETE_DIR, async (event, dirPath) => {
        console.log(`[Main IPC] 删除目录: ${dirPath}`);
        try {
            await fs.rm(dirPath, { recursive: true, force: true });
            return true;
        } catch (error) {
            console.error(`[Main IPC] 删除目录 ${dirPath} 失败:`, error);
            throw error;
        }
    });

    ipcMain.handle(CHANNELS.FS_RENAME, async (event, oldPath, newPath) => {
        console.log(`[Main IPC] 重命名: ${oldPath} -> ${newPath}`);
        try {
            await fs.rename(oldPath, newPath);
            return true;
        } catch (error) {
            console.error(`[Main IPC] 重命名 ${oldPath} 失败:`, error);
            throw error;
        }
    });

    // --- 路径处理器 ---
    ipcMain.handle(CHANNELS.PATH_JOIN, async (event, ...paths) => {
        console.log(`[Main IPC] 连接路径: ${paths.join(', ')}`);
        try {
            return path.join(...paths);
        } catch (error) {
            console.error(`[Main IPC] 连接路径失败:`, error);
            throw error;
        }
    });

    // --- 对话框处理器 ---
    ipcMain.handle(CHANNELS.DIALOG_OPEN, async (event, options) => {
        if (!currentMainWindow) throw new Error("Main window not available for dialog.");
        return await dialog.showOpenDialog(currentMainWindow, options);
    });
    ipcMain.handle(CHANNELS.DIALOG_SAVE, async (event, options) => {
        if (!currentMainWindow) throw new Error("Main window not available for dialog.");
        return await dialog.showSaveDialog(currentMainWindow, options);
    });
    ipcMain.handle(CHANNELS.DIALOG_MESSAGE_BOX, async (event, options) => {
        if (!currentMainWindow) throw new Error("Main window not available for dialog.");
        return await dialog.showMessageBox(currentMainWindow, options);
    });

    // --- 系统处理器 ---
    ipcMain.handle(CHANNELS.SYS_GET_PLATFORM, async (event) => {
        return process.platform;
    });

    ipcMain.handle(CHANNELS.SYS_SHOW_NOTIFICATION, async (event, title, body) => {
        try {
            new Notification({ title, body }).show();
            return true;
        } catch (error) {
            console.error('显示通知失败:', error);
            return false;
        }
    });

    ipcMain.handle(CHANNELS.SYS_GET_ENV_VAR, async (event, name) => {
        console.log(`[Main IPC] 获取环境变量: ${name}`);
        try {
            return process.env[name] || null;
        } catch (error) {
            console.error(`[Main IPC] 获取环境变量 ${name} 失败:`, error);
            return null;
        }
    });

    // --- YAML 处理器 ---
    ipcMain.handle(CHANNELS.YAML_PARSE, async (event, content) => {
        console.log(`[Main IPC] 解析 YAML 内容`);
        try {
            return yaml.load(content);
        } catch (error) {
            console.error(`[Main IPC] 解析 YAML 失败:`, error);
            throw error;
        }
    });

    ipcMain.handle(CHANNELS.YAML_SERIALIZE, async (event, data) => {
        console.log(`[Main IPC] 序列化 YAML 数据，数据类型: ${typeof data}, 是否为数组: ${Array.isArray(data)}`);
        try {
            // 对象结构日志
            const topLevelKeys = Object.keys(data);
            console.log(`[Main IPC] YAML顶级键: ${topLevelKeys.join(', ')}`);
            
            // 预处理数据，确保可序列化
            const cleanData = prepareDataForSerialization(data);
            
            // 使用js-yaml序列化
            const result = yaml.dump(cleanData);
            console.log(`[Main IPC] YAML序列化成功，结果长度: ${result.length}`);
            return result;
        } catch (error) {
            console.error(`[Main IPC] 序列化 YAML 失败:`, error);
            console.error(`[Main IPC] 错误信息: ${error.message}`);
            console.error(`[Main IPC] 错误堆栈: ${error.stack}`);
            throw error;
        }
    });

    /**
     * 预处理数据，确保可以安全序列化
     * @param {any} data 要处理的数据
     * @returns {any} 处理后的数据
     */
    function prepareDataForSerialization(data) {
        const seen = new WeakSet();
        
        function clean(obj) {
            // 基本类型直接返回
            if (obj === null || obj === undefined) return obj;
            if (typeof obj !== 'object') return obj;
            
            // 处理数组
            if (Array.isArray(obj)) {
                if (seen.has(obj)) {
                    console.warn('[Main IPC] 发现数组循环引用，返回空数组');
                    return [];
                }
                seen.add(obj);
                return obj.map(item => clean(item)).filter(Boolean);
            }
            
            // 处理对象
            if (seen.has(obj)) {
                console.warn('[Main IPC] 发现对象循环引用，返回空对象');
                return {};
            }
            seen.add(obj);
            
            // 创建清理后的对象
            const result = {};
            for (const key in obj) {
                try {
                    // 跳过内部属性、函数、Symbol等
                    if (key.startsWith('_') || typeof obj[key] === 'function') continue;
                    const value = clean(obj[key]);
                    if (value !== undefined) {
                        result[key] = value;
                    }
                } catch (err) {
                    console.warn(`[Main IPC] 清理属性 "${key}" 失败:`, err.message);
                }
            }
            return result;
        }
        
        return clean(data);
    }

    // --- 应用控制处理器 (整合旧逻辑) ---
    ipcMain.handle(CHANNELS.APP_QUIT, () => { // 使用 handle 还是 on 取决于是否需要回复
        console.log(`[Main IPC] Handling ${CHANNELS.APP_QUIT}`);
        app.quit();
    });
    ipcMain.handle(CHANNELS.APP_MINIMIZE, () => {
        console.log(`[Main IPC] Handling ${CHANNELS.APP_MINIMIZE}`);
        if (currentMainWindow) currentMainWindow.minimize();
    });
    ipcMain.handle(CHANNELS.APP_MAXIMIZE, () => {
        console.log(`[Main IPC] Handling ${CHANNELS.APP_MAXIMIZE}`);
        if (currentMainWindow) {
            if (currentMainWindow.isMaximized()) {
                currentMainWindow.unmaximize();
            } else {
                currentMainWindow.maximize();
            }
        }
    });

    // --- IPC 状态处理 ---
    ipcMain.on(CHANNELS.IPC_READY_CHECK, (event) => {
        console.log(`[Main IPC] Received ${CHANNELS.IPC_READY_CHECK}. Replying with ${CHANNELS.IPC_MAIN_READY}.`);
        if (isReady && !event.sender.isDestroyed()) { // 增加检查 sender 是否销毁
            event.sender.send(CHANNELS.IPC_MAIN_READY);
        }
    });

    // 标记就绪并通知
    isReady = true;
    console.log("[Main IPC] All handlers registered. Sending IPC_MAIN_READY.");
    if (currentMainWindow && currentMainWindow.webContents && !currentMainWindow.webContents.isDestroyed()) {
        currentMainWindow.webContents.send(CHANNELS.IPC_MAIN_READY);
    } else {
         console.warn("[Main IPC] mainWindow not available or destroyed, cannot send initial IPC_MAIN_READY signal.");
    }
    console.log("[Main IPC] Handler registration complete.");
}


// --- 窗口创建函数 ---
function createWindow() {
    console.log('[Main] Creating main window...');
    const windowOptions = {
        width: 1280,
        height: 768,
        minWidth: 980,
        minHeight: 600,
        show: false, // 先不显示窗口
        backgroundColor: '#f8f9fa',
        icon: appIconPath,
        title: 'Espanso GUI',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            devTools: true, // 开发工具在生产环境也暂时打开，以便诊断问题
            preload: path.join(__dirname, '../preload/index.js'),
            // 添加安全策略
            nativeWindowOpen: true,
            spellcheck: false,
            webSecurity: true, // 保持网络安全性
        },
        frame: false, // 无边框窗口
        titleBarStyle: 'hidden', // 隐藏标题栏
    };

    mainWindow = new BrowserWindow(windowOptions);
    console.log('[Main] Main window created.');

    // --- 加载应用 ---
    if (process.env.VITE_DEV_SERVER_URL) {
        // 开发模式
        console.log('开发模式：加载开发服务器地址', process.env.VITE_DEV_SERVER_URL);
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        // 生产模式
        console.log('生产模式：加载本地文件');
        const rendererPath = path.join(__dirname, '../renderer/index.html');
        console.log('尝试加载主路径:', rendererPath);

        if (fsSync.existsSync(rendererPath)) {
            console.log('主路径文件存在，开始加载');
            mainWindow.loadFile(rendererPath);
        } else {
            console.error('主路径文件不存在:', rendererPath);
            // 尝试备选路径
            const altPath = path.join(__dirname, '../../dist/electron/renderer/index.html');
            console.log('尝试备选路径:', altPath);
            
            if (fsSync.existsSync(altPath)) {
                console.log('备选路径文件存在，开始加载');
                mainWindow.loadFile(altPath);
            } else {
                console.error('备选路径文件也不存在，尝试更多备选项');
                const possiblePaths = [
                    path.join(__dirname, '../../dist/index.html'),
                    path.join(app.getAppPath(), 'dist/index.html'),
                    path.join(app.getAppPath(), 'dist/electron/renderer/index.html')
                ];
                
                let found = false;
                for (const tryPath of possiblePaths) {
                    console.log('尝试路径:', tryPath);
                    if (fsSync.existsSync(tryPath)) {
                        console.log('找到可用路径，加载:', tryPath);
                        mainWindow.loadFile(tryPath);
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    // 显示错误页面
                    mainWindow.loadURL(`data:text/html;charset=utf-8,
                        <html>
                            <head>
                                <title>加载错误</title>
                                <style>
                                    body { font-family: system-ui; text-align: center; padding: 2rem; }
                                    h1 { color: #e53e3e; }
                                    pre { text-align: left; background: #f8f8f8; padding: 1rem; border-radius: 4px; overflow: auto; }
                                </style>
                            </head>
                            <body>
                                <h1>无法加载应用</h1>
                                <p>找不到应用主文件，请确保应用已正确构建。</p>
                                <p>Electron 路径: ${__dirname}</p>
                                <pre>${possiblePaths.join('\n')}</pre>
                            </body>
                        </html>
                    `);
                }
            }
        }
    }
    // --- 加载应用结束 ---

    // 处理刷新失败问题
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.log(`[Main] Failed to load: ${errorCode} - ${errorDescription}`);
        // 错误代码-3通常是刷新时的路径问题
        if (errorCode === -3 || errorCode === -6) {
            console.log('[Main] Detected refresh error, reloading app...');
            
            // 重新加载应用
            if (process.env.VITE_DEV_SERVER_URL) {
                mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
            } else {
                // 尝试重新加载，避免相对路径#/路径问题
                const indexPath = path.join(__dirname, '../renderer/index.html');
                const altPath = path.join(__dirname, '../../dist/electron/renderer/index.html');
                
                if (fsSync.existsSync(indexPath)) {
                    mainWindow.loadFile(indexPath);
                } else if (fsSync.existsSync(altPath)) {
                    mainWindow.loadFile(altPath);
                } else {
                    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
                }
            }
        }
    });

    // 监听内容加载完成事件，然后显示窗口
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[Main] Content loaded, showing window');
        if (!mainWindow) {
            console.error('[Main] Window was closed before content finished loading');
            return;
        }
        
        // 解析当前URL
        const currentURL = mainWindow.webContents.getURL();
        console.log('[Main] Current URL:', currentURL);
        
        // 检查URL是否包含chrome-error，如果是则重新加载应用
        if (currentURL.includes('chrome-error:') || currentURL.includes('chrome-extension:')) {
            console.log('[Main] Detected chrome error, reloading app...');
            if (process.env.VITE_DEV_SERVER_URL) {
                mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
                return;
            } else {
                const indexPath = path.join(__dirname, '../renderer/index.html');
                if (fsSync.existsSync(indexPath)) {
                    mainWindow.loadFile(indexPath);
                    return;
                }
            }
        }
        
        // 延迟显示窗口以避免白屏
        setTimeout(() => {
            mainWindow.show();
            mainWindow.focus();
        }, 100);
    });

    // --- 全屏事件监听 ---
    mainWindow.on('enter-full-screen', () => { 
        console.log('[Main] Entered full screen');
        if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send(CHANNELS.APP_FULLSCREEN_CHANGED, true);
        }
    });
    
    mainWindow.on('leave-full-screen', () => { 
        console.log('[Main] Left full screen');
        if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send(CHANNELS.APP_FULLSCREEN_CHANGED, false);
        }
    });

    // --- DOM Ready & Console Message ---
    mainWindow.webContents.on('dom-ready', () => { 
        console.log('[Main] DOM ready event fired'); 
    });
    
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const levels = ['log', 'warning', 'error', 'info'];
        const levelName = levels[level] || 'log';
        console.log(`[Renderer Console][${levelName}] ${message} (${sourceId}:${line})`);
    });

    // --- 窗口关闭处理 ---
    mainWindow.on('closed', function () {
        console.log("[Main] Main window closed");
        mainWindow = null;
    });
}

// --- Electron 应用生命周期事件 ---

app.whenReady().then(async () => {
    console.log('Electron就绪，开始初始化...');

    // 安装Vue开发者工具 (只在开发环境)
    if (!app.isPackaged) {
        try {
            await installExtension(VUE_DEVTOOLS);
            console.log('Vue Devtools安装成功');
        } catch (err) {
            console.error('Vue Devtools安装失败:', err);
        }
    }

    createWindow(); // 创建窗口

    // **在这里调用 IPC 处理器注册函数**
    if (mainWindow) {
        registerIpcHandlers(mainWindow);
    } else {
        console.error("无法注册 IPC Handlers，因为 mainWindow 未成功创建！");
    }

    app.on('activate', function () {
        // macOS specific behavior
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    console.log("所有窗口已关闭");
    // 在 macOS 上保留应用活动状态
    if (process.platform !== 'darwin') {
        console.log("非 macOS 平台，退出应用");
        app.quit();
    }
});

app.on('will-quit', () => {
    // 清理日志流等资源
    if (logStream) {
        console.log("关闭日志流...");
        logStream.end();
        logStream = null; // 解除引用
    }
    // 可选：移除 IPC 监听器 (通常不需要手动移除)
    // Object.values(CHANNELS).forEach(channel => ipcMain.removeAllListeners(channel)); // 移除 on
    // Object.values(CHANNELS).forEach(channel => ipcMain.removeHandler(channel)); // 移除 handle
    // console.log("[Main IPC] Handlers removed on will-quit.");
});

// --- 应用生命周期事件结束 ---

console.log("主进程脚本执行完毕");

// 不再需要导出 registerIpcHandlers，因为它在 whenReady 中被调用
// module.exports = { registerIpcHandlers };