/**
 * 平台服务 (Platform Service)
 *
 * 职责: 提供一个统一的接口来访问特定于平台的功能 (文件系统, 对话框等)。
 * 实现: 将所有调用委托给 PlatformAdapterFactory 获取的当前平台适配器。
 * 注意: 此服务本身不包含任何特定于平台 (Electron/Web) 的逻辑或环境检查。
 */
import { PlatformAdapterFactory } from './platform/PlatformAdapterFactory';
import type { IPlatformAdapter } from './platform/IPlatformAdapter';

// 重新导出核心类型，供其他服务或模块使用
export type {
    FileInfo,
    FileSystemNode,
    YamlData,
    OpenDialogOptions,
    OpenDialogResult,
    SaveDialogOptions,
    SaveDialogResult,
    MessageBoxOptions,
    MessageBoxResult
} from '@/types/core/preload.types'; // 假设类型已移动


// --- 文件系统操作 ---

/**
 * 读取文件内容。
 * @param filePath 文件路径。
 * @returns 文件内容的字符串。
 */
export async function readFile(filePath: string): Promise<string> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    return adapter.readFile(filePath);
}

/**
 * 将内容写入文件。如果文件不存在则创建，如果存在则覆盖。
 * @param filePath 文件路径。
 * @param content 要写入的内容。
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    return adapter.writeFile(filePath, content);
}

/**
 * 检查文件是否存在。
 * @param filePath 文件路径。
 * @returns 如果文件存在则返回 true，否则返回 false。
 */
export async function fileExists(filePath: string): Promise<boolean> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    console.log(`[platformService] 检查文件是否存在: ${filePath}`);
    return adapter.fileExists(filePath);
}

/**
 * 检查目录是否存在。
 * (需要确保 IPlatformAdapter 和具体实现中有此方法)
 * @param dirPath 目录路径。
 * @returns 如果目录存在则返回 true，否则返回 false。
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    console.log('[platformService] directoryExists 被调用，路径:', dirPath);
    console.log('[platformService] adapter 是否存在:', !!adapter);
    
    try {
        // 适配器应该有directoryExists方法，因为它在IPlatformAdapter接口中已定义
        console.log('[platformService] 使用adapter.directoryExists方法');
        return await adapter.directoryExists(dirPath);
    } catch (err) {
        console.error('[platformService] directoryExists执行过程中发生错误:', err);
        // 尝试使用替代方案
        try {
            console.log('[platformService] 尝试使用listFiles方法作为替代检查');
            await adapter.listFiles(dirPath); // listFiles 通常在目录不存在时会抛错
            console.log('[platformService] listFiles成功，目录存在');
            return true;
        } catch (listErr) {
            console.log('[platformService] listFiles失败，目录可能不存在:', listErr);
            return false;
        }
    }
}

/**
 * 创建目录，包括任何必需的父目录。
 * (需要确保 IPlatformAdapter 和具体实现中有此方法)
 * @param dirPath 要创建的目录路径。
 */
export async function createDirectory(dirPath: string): Promise<void> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
     // 假设适配器有名为 createDirectory 的方法
    if (typeof adapter.createDirectory !== 'function') {
        throw new Error('PlatformAdapter does not implement createDirectory.');
    }
    return adapter.createDirectory(dirPath);
}

/**
 * 列出目录中的文件和子目录 (非递归)。
 * @param dirPath 目录路径。
 * @returns FileInfo 对象数组。
 */
export async function listFiles(dirPath: string): Promise<import('@/types/core/preload.types').FileInfo[]> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    return adapter.listFiles(dirPath);
}

/**
 * 扫描目录并返回其文件/文件夹结构的表示。
 * (需要确保 IPlatformAdapter 和具体实现中有此方法)
 * @param dirPath 要扫描的目录路径。
 * @returns FileSystemNode 对象数组，表示目录内容。
 */
export async function scanDirectory(dirPath: string): Promise<import('@/types/core/preload.types').FileSystemNode[]> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
     // 假设适配器有名为 scanDirectory 的方法
    if (typeof adapter.scanDirectory !== 'function') {
        console.warn('PlatformAdapter does not implement scanDirectory. Returning empty array.');
        return [];
    }
    return adapter.scanDirectory(dirPath);
}

/**
 * 删除文件。
 * (需要确保 IPlatformAdapter 和具体实现中有此方法)
 * @param filePath 要删除的文件路径。
 */
export async function deleteFile(filePath: string): Promise<void> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    // 假设适配器有名为 deleteFile 的方法
    if (typeof adapter.deleteFile !== 'function') {
        throw new Error('PlatformAdapter does not implement deleteFile.');
    }
    return adapter.deleteFile(filePath);
}

/**
 * 删除目录及其所有内容 (递归)。
 * (需要确保 IPlatformAdapter 和具体实现中有此方法)
 * @param dirPath 要删除的目录路径。
 */
export async function deleteDirectory(dirPath: string): Promise<void> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
     // 假设适配器有名为 deleteDirectory 的方法
    if (typeof adapter.deleteDirectory !== 'function') {
        throw new Error('PlatformAdapter does not implement deleteDirectory.');
    }
    return adapter.deleteDirectory(dirPath);
}

/**
 * 重命名文件或目录。
 * (需要确保 IPlatformAdapter 和具体实现中有此方法)
 * @param oldPath 当前路径。
 * @param newPath 新路径。
 */
export async function renameFileOrDirectory(oldPath: string, newPath: string): Promise<void> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
     // 假设适配器有名为 renameFileOrDirectory 的方法
     if (typeof adapter.renameFileOrDirectory !== 'function') {
        throw new Error('PlatformAdapter does not implement renameFileOrDirectory.');
    }
    return adapter.renameFileOrDirectory(oldPath, newPath);
}


// --- 路径操作 ---

/**
 * 以平台特定的方式连接路径段。
 * (需要确保 IPlatformAdapter 和具体实现中有此方法)
 * @param paths 要连接的路径段。
 * @returns 连接后的完整路径。
 */
export async function joinPath(...paths: string[]): Promise<string> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
     // 假设适配器有名为 joinPath 的方法
    if (typeof adapter.joinPath !== 'function') {
        // 提供一个基础的回退实现，但这可能不适用于所有平台/情况
        console.warn('PlatformAdapter does not implement joinPath. Using basic string join.');
        return paths.join('/').replace(/\/+/g, '/'); // 基础 POSIX 风格连接
    }
    return adapter.joinPath(...paths);
}


// --- 对话框 ---

/**
 * 显示打开文件/目录对话框。
 * @param options 对话框选项。
 * @returns 对话框结果。
 */
export async function showOpenDialog(options: import('@/types/core/preload.types').OpenDialogOptions): Promise<import('@/types/core/preload.types').OpenDialogResult> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    return adapter.showOpenDialog(options);
}

/**
 * 显示保存文件对话框。
 * @param options 对话框选项。
 * @returns 对话框结果。
 */
export async function showSaveDialog(options: import('@/types/core/preload.types').SaveDialogOptions): Promise<import('@/types/core/preload.types').SaveDialogResult> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    return adapter.showSaveDialog(options);
}

/**
 * 显示消息框。
 * @param options 消息框选项。
 * @returns 消息框结果。
 */
export async function showMessageBox(options: import('@/types/core/preload.types').MessageBoxOptions): Promise<import('@/types/core/preload.types').MessageBoxResult> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    return adapter.showMessageBox(options);
}


// --- 系统操作 ---

/**
 * 显示系统通知。
 * @param title 通知标题。
 * @param body 通知正文。
 */
export async function showNotification(title: string, body: string): Promise<void> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    return adapter.showNotification(title, body);
}

/**
 * 获取当前运行平台 ('win32', 'darwin', 'linux', 'web', 'unknown')。
 * @returns 平台标识符字符串。
 */
export async function getPlatform(): Promise<string> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    return adapter.getPlatform();
}

/**
 * 获取环境变量的值。
 * @param name 环境变量名称。
 * @returns 环境变量的值，如果不存在则返回 null。
 */
export async function getEnvironmentVariable(name: string): Promise<string | null> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    return adapter.getEnvironmentVariable(name);
}

// --- IPC 通信 (如果需要直接访问) ---

/**
 * 注册一个在 IPC Handler 准备就绪时调用的回调。
 * (需要确保 IPlatformAdapter 和具体实现中有此方法)
 * @param callback 当 IPC Handler 准备好时执行的回调函数。
 */
export function onIpcHandlersReady(callback: () => void): void {
     const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
     // 假设适配器有名为 onIpcHandlersReady 的方法
     if (typeof adapter.onIpcHandlersReady !== 'function') {
         console.warn('PlatformAdapter does not implement onIpcHandlersReady. Callback may not be called.');
         // 在 Web 环境或不支持的情况下，可能需要立即调用或延迟调用
         // setTimeout(callback, 0); // 示例：延迟执行
         return;
     }
     adapter.onIpcHandlersReady(callback);
}

// 注意: parseYaml 和 serializeYaml 现在应该在 yamlService.ts 中
// 注意: getEspansoConfigDir 和 getDefaultConfigPath 的逻辑现在应该在 configService.ts 中