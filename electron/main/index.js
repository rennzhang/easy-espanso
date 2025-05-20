// main.js (整合后的版本)

const { app, BrowserWindow, ipcMain, dialog, Notification, shell } = require('electron'); // 移除了 shell，如果需要再加回来
const { exec } = require('child_process'); // 添加 exec 用于检测命令
const path = require('path');
const fs = require('fs/promises'); // 使用 promises API
const fsSync = require('fs'); // 保留 fsSync 用于日志等同步操作
const os = require('os');
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
    FS_OPEN_IN_EXPLORER: 'fs:openInExplorer',
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
    SYS_CHECK_ESPANSO: 'sys:checkEspansoInstalled', // 添加检测 Espanso 安装状态的通道
    SYS_OPEN_EXTERNAL: 'sys:openExternal', // 添加在默认浏览器中打开链接的通道
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
    APP_FULLSCREEN_CHANGED: 'fullscreen-changed', // 与你现有代码匹配
    // Espanso 安装状态
    ESPANSO_INSTALL_STATUS: 'espanso:installStatus'
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

    ipcMain.handle(CHANNELS.FS_OPEN_IN_EXPLORER, async (event, filePath) => {
        console.log(`[Main IPC] 在文件管理器中打开: ${filePath}`);
        try {
            // 检查路径是否存在
            try {
                await fs.access(filePath, fs.constants.F_OK);
            } catch (error) {
                console.error(`[Main IPC] 路径 ${filePath} 不存在或无法访问`);
                throw new Error(`路径不存在或无法访问: ${filePath}`);
            }

            // 检查是否是目录
            const stats = await fs.stat(filePath);
            const isDirectory = stats.isDirectory();

            if (isDirectory) {
                // 如果是目录，根据不同操作系统采取不同的行为
                if (process.platform === 'darwin') {
                    // macOS: 使用 open 命令打开目录
                    const { exec } = require('child_process');
                    exec(`open "${filePath}"`, (error) => {
                        if (error) {
                            console.error(`[Main IPC] 打开目录失败: ${error.message}`);
                        }
                    });
                } else if (process.platform === 'win32') {
                    // Windows: 使用 explorer 命令打开目录
                    const { exec } = require('child_process');
                    exec(`explorer "${filePath.replace(/\//g, '\\')}"`, (error) => {
                        if (error) {
                            console.error(`[Main IPC] 打开目录失败: ${error.message}`);
                        }
                    });
                } else {
                    // Linux: 使用 xdg-open 命令打开目录
                    const { exec } = require('child_process');
                    exec(`xdg-open "${filePath}"`, (error) => {
                        if (error) {
                            console.error(`[Main IPC] 打开目录失败: ${error.message}`);
                        }
                    });
                }
            } else {
                // 如果是文件，使用 showItemInFolder 方法
                await shell.showItemInFolder(filePath);
            }
            return true;
        } catch (error) {
            console.error(`[Main IPC] 在文件管理器中打开 ${filePath} 失败:`, error);
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

    // 检测 Espanso 是否安装
    ipcMain.handle(CHANNELS.SYS_CHECK_ESPANSO, async () => {
        console.log('[Main IPC] 检测 Espanso 是否安装');
        try {
            const isInstalled = await checkEspansoInstalled();
            console.log(`[Main IPC] Espanso 检测结果: ${isInstalled ? '已安装' : '未安装'}`);
            
            // 更新全局变量以便其他地方可以访问
            global.espansoInstalled = isInstalled;
            
            // 如果主窗口存在，通知渲染进程
            if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                console.log('[Main IPC] 通知渲染进程 Espanso 安装状态:', isInstalled);
                mainWindow.webContents.send(CHANNELS.ESPANSO_INSTALL_STATUS, isInstalled);
            }
            
            return isInstalled;
        } catch (error) {
            console.error('[Main IPC] 检测 Espanso 安装失败:', error);
            console.error('[Main IPC] 错误堆栈:', error.stack);
            
            // 发送错误通知到渲染进程
            if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send(CHANNELS.ESPANSO_INSTALL_STATUS, false);
            }
            
            return false;
        }
    });

    // 在默认浏览器中打开链接
    ipcMain.handle(CHANNELS.SYS_OPEN_EXTERNAL, async (event, url) => {
        console.log(`[Main IPC] 在默认浏览器中打开链接: ${url}`);
        try {
            await shell.openExternal(url);
            return true;
        } catch (error) {
            console.error(`[Main IPC] 打开链接 ${url} 失败:`, error);
            return false;
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

            // 预处理数据，确保可序列化，并确保 trigger 属性始终使用双引号
            const cleanData = prepareDataForSerialization(data, true);

            // 使用js-yaml序列化，添加配置确保特殊字符被正确处理
            const result = yaml.dump(cleanData, {
                indent: 2,
                lineWidth: -1, // 不限制行宽
                noRefs: true, // 避免使用引用标记
                styles: {
                    '!!str': 'double-quoted' // 强制所有字符串使用双引号，确保特殊字符被正确处理
                },
                forceQuotes: true, // 强制所有字符串使用引号
                quotingType: '"' // 使用双引号而不是单引号
            });

            // 手动替换所有 trigger 属性的单引号为双引号
            // 这里使用正则表达式匹配 trigger: '值' 的模式，并替换为 trigger: "值"
            let resultWithDoubleQuotes = result;

            // 替换单引号为双引号
            resultWithDoubleQuotes = resultWithDoubleQuotes.replace(/(trigger:\s*)'([^']*)'/g, '$1"$2"');

            // 替换没有引号的 trigger 值
            resultWithDoubleQuotes = resultWithDoubleQuotes.replace(/(trigger:\s*)([^"'\s][^\s]*)/g, '$1"$2"');

            console.log(`[Main IPC] YAML序列化成功，结果长度: ${resultWithDoubleQuotes.length}`);
            return resultWithDoubleQuotes;
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
     * @param {boolean} forceTriggerQuotes 是否强制 trigger 属性使用双引号
     * @returns {any} 处理后的数据
     */
    function prepareDataForSerialization(data, forceTriggerQuotes = false) {
        const seen = new WeakSet();

        function clean(obj) {
            // 基本类型直接返回
            if (obj === null || obj === undefined) return obj;

            // 处理字符串，确保特殊字符被正确处理
            if (typeof obj === 'string') {
                // 检查字符串是否包含控制字符（如 \x05）
                if (/\\x[0-9a-fA-F]{2}/.test(obj) || /[\x00-\x1F]/.test(obj)) {
                    console.log(`[Main IPC] 检测到包含控制字符的字符串: ${JSON.stringify(obj)}`);
                    // 不需要特殊处理，因为我们已经在 yaml.dump 中设置了 forceQuotes: true
                }
                return obj;
            }

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

                    // 特殊处理 trigger 属性
                    if (key === 'trigger' && typeof obj[key] === 'string') {
                        // 如果是 trigger 属性，我们需要确保它使用双引号
                        if (forceTriggerQuotes) {
                            console.log(`[Main IPC] 强制 trigger 属性使用双引号: ${JSON.stringify(obj[key])}`);
                            // 我们不需要添加特殊标记，因为我们已经在 yaml.dump 后手动替换了所有 trigger 属性
                        }

                        // 检查 trigger 是否包含控制字符
                        if (/\\x[0-9a-fA-F]{2}/.test(obj[key]) || /[\x00-\x1F]/.test(obj[key])) {
                            console.log(`[Main IPC] 检测到包含控制字符的 trigger: ${JSON.stringify(obj[key])}`);
                        }
                    }

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
        title: 'Easy Espanso',
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
        
        // 打印更多调试信息
        console.log('应用路径:', app.getAppPath());
        console.log('__dirname:', __dirname);
        console.log('process.resourcesPath:', process.resourcesPath);
        
        // 尝试各种可能的路径
        const possiblePaths = [
            path.join(__dirname, '../renderer/index.html'),
            path.join(__dirname, '../../dist/electron/renderer/index.html'),
            path.join(process.resourcesPath, 'app/dist/electron/renderer/index.html'),
            path.join(app.getAppPath(), 'dist/electron/renderer/index.html')
        ];
        
        console.log('尝试以下路径:');
        possiblePaths.forEach(p => console.log(`- ${p} (${fsSync.existsSync(p) ? '存在' : '不存在'})`));
        
        // 尝试加载第一个存在的路径
        let loaded = false;
        for (const tryPath of possiblePaths) {
            if (fsSync.existsSync(tryPath)) {
                console.log('找到可用路径，加载:', tryPath);
                
                // 设置协议处理器以处理相对路径
                mainWindow.loadFile(tryPath);
                loaded = true;
                break;
            }
        }
        
        // 如果没有找到可用路径，显示错误页面
        if (!loaded) {
            console.error('未找到可用的index.html文件');
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
                        <p>资源路径: ${process.resourcesPath}</p>
                        <p>应用路径: ${app.getAppPath()}</p>
                        <pre>${possiblePaths.map(p => `${p} - ${fsSync.existsSync(p) ? '存在' : '不存在'}`).join('\n')}</pre>
                    </body>
                </html>
            `);
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

/**
 * 检测 Espanso 是否已安装
 * @returns {Promise<boolean>} 是否已安装
 */
async function checkEspansoInstalled() {
    return new Promise((resolve) => {
        // 判断是否为打包环境
        const isPackaged = app.isPackaged;
        console.log(`[Main] 检测Espanso - 当前环境: ${isPackaged ? '已打包' : '开发环境'}`);
        
        // 在打包环境下，尝试使用更多方法查找espanso
        if (isPackaged) {
            // 记录更多调试信息
            console.log(`[Main] 打包环境PATH: ${process.env.PATH}`);
            console.log(`[Main] 应用路径: ${app.getAppPath()}`);
            console.log(`[Main] 资源路径: ${process.resourcesPath}`);
        }
        
        const command = process.platform === 'win32' ? 'where espanso' : 'which espanso';

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log('[Main] Espanso 未在环境变量PATH中找到:', error.message);
                
                // 在打包环境下，尝试查找常见的安装位置
                if (isPackaged) {
                    let alternativePaths = [];
                    
                    if (process.platform === 'darwin') {
                        // macOS常见安装位置
                        alternativePaths = [
                            '/usr/local/bin/espanso',
                            '/opt/homebrew/bin/espanso',
                            '/Applications/Espanso.app/Contents/MacOS/espanso'
                        ];
                    } else if (process.platform === 'win32') {
                        // Windows常见安装位置
                        alternativePaths = [
                            'C:\\Program Files\\Espanso\\espanso.exe',
                            'C:\\Program Files (x86)\\Espanso\\espanso.exe',
                            `${process.env.LOCALAPPDATA}\\Programs\\Espanso\\espanso.exe`,
                            `${process.env.APPDATA}\\Espanso\\espanso.exe`
                        ];
                    } else {
                        // Linux常见安装位置
                        alternativePaths = [
                            '/usr/bin/espanso',
                            '/usr/local/bin/espanso',
                            '/opt/espanso/espanso'
                        ];
                    }
                    
                    console.log(`[Main] 尝试在常见位置查找Espanso: ${alternativePaths.join(', ')}`);
                    
                    // 检查这些路径是否存在
                    for (const path of alternativePaths) {
                        try {
                            if (fsSync.existsSync(path)) {
                                console.log(`[Main] 在替代位置找到Espanso: ${path}`);
                                
                                // 尝试用找到的路径执行status命令
                                exec(`"${path}" status`, (statusError, statusStdout, statusStderr) => {
                                    if (statusError) {
                                        console.log(`[Main] Espanso在${path}存在但状态异常:`, statusError.message);
                                        resolve(false);
                                    } else {
                                        console.log(`[Main] Espanso在${path}正常运行，状态:`, statusStdout.trim());
                                        resolve(true);
                                    }
                                });
                                return; // 找到一个可用路径后退出
                            }
                        } catch (err) {
                            console.error(`[Main] 检查路径${path}时出错:`, err);
                        }
                    }
                    
                    // 如果所有替代路径都不存在
                    console.log('[Main] 在所有常见位置均未找到Espanso');
                    resolve(false);
                } else {
                    // 开发环境直接返回false
                    resolve(false);
                }
                return;
            }

            // 找到espanso命令，获取其路径
            const espansoPath = stdout.trim();
            console.log(`[Main] 在PATH中找到Espanso: ${espansoPath}`);

            // 使用 espanso status 命令来检查服务是否运行
            exec('espanso status', (error, stdout, stderr) => {
                if (error) {
                    console.log('[Main] Espanso 已安装但可能未运行:', error.message);
                    resolve(false);
                } else {
                    console.log('[Main] Espanso 已安装且正在运行，状态:', stdout.trim());
                    resolve(true);
                }
            });
        });
    });
}

// --- Electron 应用生命周期事件 ---

app.whenReady().then(async () => {
    console.log('Electron就绪，开始初始化...');

    // 检测 Espanso 是否安装
    const espansoInstalled = await checkEspansoInstalled();
    console.log(`[Main] Espanso 安装检测结果: ${espansoInstalled ? '已安装' : '未安装'}`);
    // 创建一个全局变量以便在创建窗口后通知渲染进程
    global.espansoInstalled = espansoInstalled;

    // 安装Vue开发者工具 (只在开发环境)
    if (!app.isPackaged) {
        try {
            const { default: installExtension, VUE_DEVTOOLS } = require('electron-devtools-installer');
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

        // 窗口准备好后发送 Espanso 安装状态
        mainWindow.webContents.on('did-finish-load', () => {
            if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                console.log('[Main] 通知渲染进程 Espanso 安装状态:', global.espansoInstalled);
                mainWindow.webContents.send(CHANNELS.ESPANSO_INSTALL_STATUS, global.espansoInstalled);
            }
        });
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