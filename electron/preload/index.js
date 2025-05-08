// preload.js (位于 Electron 项目结构中，例如 'electron/preload.js')

const { contextBridge, ipcRenderer } = require('electron'); // 使用 require 导入

// 为 IPC 通道定义常量 (推荐，避免硬编码字符串)
const CHANNELS = {
    // 文件系统
    FS_READ_FILE: 'fs:readFile',
    FS_WRITE_FILE: 'fs:writeFile',
    FS_FILE_EXISTS: 'fs:fileExists',
    FS_DIR_EXISTS: 'fs:directoryExists', // 新增
    FS_CREATE_DIR: 'fs:createDirectory', // 新增
    FS_LIST_FILES: 'fs:listFiles',
    FS_SCAN_DIR: 'fs:scanDirectory',   // 新增
    FS_DELETE_FILE: 'fs:deleteFile',       // 新增
    FS_DELETE_DIR: 'fs:deleteDirectory',    // 新增
    FS_RENAME: 'fs:rename',            // 新增 (统一)

    // 路径
    PATH_JOIN: 'path:join',              // 新增

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
    IPC_READY_CHECK: 'ipc:readyCheck', // 用于 onIpcHandlersReady
    IPC_MAIN_READY: 'ipc:mainReady',      // 主进程发送的消息，表示已就绪
    
    // Espanso 状态
    ESPANSO_INSTALL_STATUS: 'espanso:installStatus'
};


// 定义要暴露给渲染进程的 API 对象
const preloadApi = {
    // --- 文件系统操作 ---
    // 注意：返回类型是 Promise，调用者需要使用 async/await 或 .then()
    readFile: async (filePath) => {
        try {
            return await ipcRenderer.invoke(CHANNELS.FS_READ_FILE, filePath);
        } catch (error) {
            console.error(`[Preload] 读取文件 ${filePath} 失败:`, error);
            throw new Error(`读取文件失败: ${error.message}`);
        }
    },

    writeFile: async (filePath, content) => {
        try {
            return await ipcRenderer.invoke(CHANNELS.FS_WRITE_FILE, filePath, content);
        } catch (error) {
            console.error(`[Preload] 写入文件 ${filePath} 失败:`, error);
            throw new Error(`写入文件失败 (${filePath}): ${error.message}`);
        }
    },

    // 暴露 fileExists (如果 ElectronAdapter 需要它)
    fileExists: (filePath) =>
        ipcRenderer.invoke(CHANNELS.FS_FILE_EXISTS, filePath),
    // 同时暴露 existsFile (如果 ElectronAdapter 也检查它) - 或者统一命名
    existsFile: (filePath) =>
        ipcRenderer.invoke(CHANNELS.FS_FILE_EXISTS, filePath),

    directoryExists: (dirPath) => // 新增
        ipcRenderer.invoke(CHANNELS.FS_DIR_EXISTS, dirPath),

    createDirectory: (dirPath) => // 新增
        ipcRenderer.invoke(CHANNELS.FS_CREATE_DIR, dirPath),

    listFiles: (dirPath) => // 返回类型应为 Promise<FileInfo[]>
        ipcRenderer.invoke(CHANNELS.FS_LIST_FILES, dirPath),

    scanDirectory: (dirPath) => // 新增, 返回类型应为 Promise<FileSystemNode[]>
        ipcRenderer.invoke(CHANNELS.FS_SCAN_DIR, dirPath),

    deleteFile: (filePath) => // 新增
        ipcRenderer.invoke(CHANNELS.FS_DELETE_FILE, filePath),

    deleteDirectory: (dirPath) => // 新增
        ipcRenderer.invoke(CHANNELS.FS_DELETE_DIR, dirPath),

    // 暴露 renameFile (如果 ElectronAdapter 需要它)
    renameFile: (oldPath, newPath) => // 新增
        ipcRenderer.invoke(CHANNELS.FS_RENAME, oldPath, newPath),
    // 如果 ElectronAdapter 检查其他名称，也暴露它们或统一
    renameFileOrDirectory: (oldPath, newPath) =>
        ipcRenderer.invoke(CHANNELS.FS_RENAME, oldPath, newPath),

    // --- 路径操作 ---
    joinPath: (...paths) => // 新增
        ipcRenderer.invoke(CHANNELS.PATH_JOIN, ...paths),

    // --- 对话框 ---
    showOpenDialog: (options) => // options 类型应为 OpenDialogOptions, 返回 Promise<OpenDialogResult>
        ipcRenderer.invoke(CHANNELS.DIALOG_OPEN, options),

    showSaveDialog: (options) => // options 类型应为 SaveDialogOptions, 返回 Promise<SaveDialogResult>
        ipcRenderer.invoke(CHANNELS.DIALOG_SAVE, options),

    showMessageBox: (options) => // options 类型应为 MessageBoxOptions, 返回 Promise<MessageBoxResult>
        ipcRenderer.invoke(CHANNELS.DIALOG_MESSAGE_BOX, options),

    // --- 系统操作 ---
    // 返回当前平台信息，这是一个同步方法，不使用promise
    platform: () => {
        // 直接返回process.platform，这是同步的
        return process.platform;
    },
    
    // 异步获取平台
    getPlatform: () => // 返回 Promise<string>
        ipcRenderer.invoke(CHANNELS.SYS_GET_PLATFORM),

    showNotification: (title, body) =>
        ipcRenderer.invoke(CHANNELS.SYS_SHOW_NOTIFICATION, title, body),

    getEnvironmentVariable: (name) =>
        ipcRenderer.invoke(CHANNELS.SYS_GET_ENV_VAR, name),
        
    // 检测 Espanso 是否安装
    checkEspansoInstalled: () =>
        ipcRenderer.invoke(CHANNELS.SYS_CHECK_ESPANSO),
        
    // 在系统默认浏览器中打开链接
    openExternal: (url) =>
        ipcRenderer.invoke(CHANNELS.SYS_OPEN_EXTERNAL, url),

    // --- YAML 操作 ---
    parseYaml: async (content) => {
        try {
            return await ipcRenderer.invoke(CHANNELS.YAML_PARSE, content);
        } catch (error) {
            console.error('[Preload] YAML解析失败:', error);
            throw new Error(`YAML解析失败: ${error.message}`);
        }
    },

    serializeYaml: async (data) => {
        try {
            console.log('[Preload] 正在序列化YAML数据');
            // 为诊断目的添加一些数据检查
            if (data && typeof data === 'object') {
                console.log('[Preload] 数据结构信息:', {
                    isArray: Array.isArray(data),
                    topLevelKeys: Object.keys(data),
                    matchesCount: data.matches?.length || 0,
                    groupsCount: data.groups?.length || 0
                });
                
                // 尝试安全地检测循环引用
                try {
                    JSON.stringify(data);
                    console.log('[Preload] 数据可以被JSON序列化，无循环引用');
                } catch (err) {
                    console.warn('[Preload] 数据无法被JSON序列化，可能存在循环引用:', err.message);
                }
            }
            
            return await ipcRenderer.invoke(CHANNELS.YAML_SERIALIZE, data);
        } catch (error) {
            console.error('[Preload] YAML序列化失败:', error);
            throw new Error(`YAML序列化失败: ${error.message}`);
        }
    },

    // --- IPC ---
    // 这个方法比较特殊，它注册一个回调，等待主进程通知
    onIpcHandlersReady: (callback) => {
        // 使用 ipcRenderer.once 确保回调只被调用一次
        ipcRenderer.once(CHANNELS.IPC_MAIN_READY, () => {
            console.log('[Preload] Received IPC_MAIN_READY from main process.');
            if (typeof callback === 'function') {
                callback();
            }
        });
        // 可选：立即检查一次，以防主进程已经就绪
        console.log('[Preload] Sending IPC_READY_CHECK to main process.');
        ipcRenderer.send(CHANNELS.IPC_READY_CHECK);
    }
};

// 使用 contextBridge 将定义的 API 安全地暴露给渲染进程
try {
    contextBridge.exposeInMainWorld('preloadApi', preloadApi);
    
    // 直接暴露 ipcRenderer 中的少数方法给渲染进程（仅用于事件监听）
    contextBridge.exposeInMainWorld('ipcRenderer', {
        on: (channel, callback) => {
            // 白名单检查：确保只有安全的通道可以监听
            const validChannels = [
                CHANNELS.IPC_MAIN_READY,
                CHANNELS.ESPANSO_INSTALL_STATUS
            ];
            
            if (validChannels.includes(channel)) {
                // 包装回调，确保参数传递安全
                const subscription = (event, ...args) => callback(...args);
                ipcRenderer.on(channel, subscription);
                
                // 返回清理函数以便移除监听器
                return () => {
                    ipcRenderer.removeListener(channel, subscription);
                };
            }
        },
        removeAllListeners: (channel) => {
            const validChannels = [
                CHANNELS.IPC_MAIN_READY,
                CHANNELS.ESPANSO_INSTALL_STATUS
            ];
            
            if (validChannels.includes(channel)) {
                ipcRenderer.removeAllListeners(channel);
            }
        },
        // 添加 invoke 方法，只用于特定的几个通道
        invoke: (channel, ...args) => {
            const validChannels = [
                CHANNELS.SYS_CHECK_ESPANSO
            ];
            
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, ...args);
            }
            
            throw new Error(`通道 ${channel} 不在 invoke 白名单中`);
        }
    });
    
    console.log('[Preload] preloadApi exposed successfully.');
} catch (error) {
    console.error('[Preload] Failed to expose preloadApi:', error);
}

// 可选：在 preload 脚本加载完成后通知主进程（如果需要）
// ipcRenderer.send('preload-loaded');