// src/services/platform/WebAdapter.ts

import type { IPlatformAdapter } from './IPlatformAdapter';
import type {
    FileInfo, FileSystemNode, YamlData,
    OpenDialogOptions, OpenDialogResult,
    SaveDialogOptions, SaveDialogResult,
    MessageBoxOptions, MessageBoxResult
} from '@/types/core/preload.types';

// 尝试动态导入或假设 js-yaml 已通过 <script> 标签全局引入
// import yaml from 'js-yaml'; // 如果使用模块打包
declare var jsyaml: any; // 假设全局变量存在

/**
 * Web 平台适配器 - 为 Web 环境提供模拟或受限的文件/系统操作。
 */
export class WebAdapter implements IPlatformAdapter {

    constructor() {
        console.log('[WebAdapter] Initialized. Platform features are limited.');
        if (typeof jsyaml === 'undefined') {
             console.warn("[WebAdapter] js-yaml library not found globally (window.jsyaml). YAML operations will fail.");
        }
    }

    // --- 文件系统操作 (Web 环境通常受限) ---
    async readFile(filePath: string): Promise<string> {
        console.warn(`[WebAdapter] readFile(${filePath}) is not available in web environment. Returning empty string.`);
        return Promise.resolve(''); // 无法读取本地文件
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        console.warn(`[WebAdapter] writeFile(${filePath}) is not available in web environment.`);
        // 可以考虑使用 localStorage 模拟极简情况，但不推荐
        return Promise.resolve();
    }

    async fileExists(filePath: string): Promise<boolean> {
        console.warn(`[WebAdapter] fileExists(${filePath}) is not possible in web environment. Assuming false.`);
        return Promise.resolve(false);
    }

     async directoryExists(dirPath: string): Promise<boolean> {
        console.warn(`[WebAdapter] directoryExists(${dirPath}) is not possible in web environment. Assuming false.`);
        return Promise.resolve(false);
    }

     async createDirectory(dirPath: string): Promise<void> {
        console.warn(`[WebAdapter] createDirectory(${dirPath}) is not possible in web environment.`);
        return Promise.resolve();
    }

    async listFiles(dirPath: string): Promise<FileInfo[]> {
        console.warn(`[WebAdapter] listFiles(${dirPath}) is not available in web environment. Returning empty array.`);
        return Promise.resolve([]);
    }

     async scanDirectory(dirPath: string): Promise<FileSystemNode[]> {
         console.warn(`[WebAdapter] scanDirectory(${dirPath}) is not available in web environment. Returning empty array.`);
         return Promise.resolve([]);
     }

     async deleteFile(filePath: string): Promise<void> {
         console.warn(`[WebAdapter] deleteFile(${filePath}) is not available in web environment.`);
         return Promise.resolve();
     }

     async deleteDirectory(dirPath: string): Promise<void> {
         console.warn(`[WebAdapter] deleteDirectory(${dirPath}) is not available in web environment.`);
         return Promise.resolve();
     }

      async renameFileOrDirectory(oldPath: string, newPath: string): Promise<void> {
         console.warn(`[WebAdapter] renameFileOrDirectory is not available in web environment.`);
         return Promise.resolve();
     }

    // --- 路径操作 ---
    async joinPath(...paths: string[]): Promise<string> {
        // 提供基础的 POSIX 风格连接作为回退
        const joined = paths
            .map((part, index) => {
                if (index === 0) return part.trim();
                return part.trim().replace(/^\/+/, ''); // 移除开头的斜杠
            })
            .filter(part => part !== '')
            .join('/');
        // 简单处理 '..' (不完全健壮)
        const segments = joined.split('/');
        const result: string[] = [];
        for (const segment of segments) {
            if (segment === '..') {
                result.pop();
            } else if (segment !== '.') {
                result.push(segment);
            }
        }
        return Promise.resolve(result.join('/'));
    }

    // --- 对话框 ---
    async showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult> {
        console.log('[WebAdapter] Simulating showOpenDialog with <input type="file">');
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';

            // 处理文件过滤器 (accept 属性)
            if (options.filters && options.filters.length > 0) {
                input.accept = options.filters
                    .flatMap(f => f.extensions.map(e => `.${e}`))
                    .join(',');
            }
            // 处理多选 (HTML 标准不支持文件夹选择和文件多选混合)
            if (options.properties?.includes('multiSelections')) {
                 input.multiple = true;
            }
             // 处理打开目录 (非标准，但某些浏览器支持)
            if (options.properties?.includes('openDirectory')) {
                 // input.webkitdirectory = true; // Property 'webkitdirectory' does not exist on type 'HTMLInputElement'
                 input.setAttribute('webkitdirectory', 'true');
                 console.warn("[WebAdapter] 'openDirectory' relies on non-standard browser features.");
            }

            input.onchange = (event) => {
                const files = (event.target as HTMLInputElement).files;
                if (files && files.length > 0) {
                     // 注意：浏览器出于安全原因不会暴露完整路径，这里用 Object URL 代替
                    const pseudoPaths = Array.from(files).map(file => file.name); // 只返回文件名
                    // 或者 const pseudoPaths = Array.from(files).map(file => URL.createObjectURL(file));
                    resolve({ canceled: false, filePaths: pseudoPaths });
                } else {
                    resolve({ canceled: true, filePaths: [] });
                }
                input.remove(); // 清理 DOM
            };
            input.onerror = () => {
                 resolve({ canceled: true, filePaths: [] });
                 input.remove();
            };
            input.style.display = 'none';
            document.body.appendChild(input);
            input.click();
        });
    }

    async showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult> {
        console.warn(`[WebAdapter] showSaveDialog is not directly possible in web environment.`);
        // 浏览器无法直接触发“另存为”到任意路径
        // 可以模拟下载：创建一个包含内容的 Blob URL 并触发下载
        // 但这不会返回用户选择的 filePath
        return Promise.resolve({ canceled: true, filePath: undefined });
    }

    async showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
        console.log('[WebAdapter] Simulating showMessageBox with window.confirm/alert');
        const message = options.message + (options.detail ? `\n\n${options.detail}` : '');
        // 简化模拟：只处理确认/取消类型
        if (options.buttons && options.buttons.length > 1) {
            // 模拟多按钮（非常基础）
             let responseIndex = 0; // 默认第一个按钮
             let confirmed = false;
             try {
                 // 使用 confirm 模拟 Yes/No 或 OK/Cancel
                 confirmed = window.confirm(`${message}\n\n[Simulated Buttons: ${options.buttons.join(', ')}]`);
                 responseIndex = confirmed ? (options.defaultId ?? 0) : (options.cancelId ?? 1); // 猜测响应
             } catch (e) { /* 用户可能阻止了对话框 */ }

             return Promise.resolve({ response: responseIndex, checkboxChecked: false });

        } else {
            // 模拟简单的 alert
             try { window.alert(message); } catch (e) { /* 用户可能阻止了对话框 */ }
            return Promise.resolve({ response: 0, checkboxChecked: false }); // 假设 alert 总是 "OK" (索引 0)
        }
    }

    // --- 系统操作 ---
    async getPlatform(): Promise<string> {
        // 可以通过 navigator.userAgent 更精确地判断，但 'web' 作为标识符足够
        return Promise.resolve('web');
    }

    async showNotification(title: string, body: string): Promise<void> {
        if (!('Notification' in window)) {
            console.warn('[WebAdapter] Web Notifications API not supported. Falling back to alert.');
            alert(`${title}\n\n${body}`);
            return Promise.resolve();
        }

        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    new Notification(title, { body });
                } else {
                     console.warn('[WebAdapter] Notification permission denied.');
                }
            } catch (error) {
                 console.error('[WebAdapter] Requesting notification permission failed:', error);
            }
        } else {
             console.warn('[WebAdapter] Notification permission was previously denied.');
        }
        return Promise.resolve();
    }

    async getEnvironmentVariable(name: string): Promise<string | null> {
        console.warn(`[WebAdapter] getEnvironmentVariable('${name}') is not available in web environment. Returning null.`);

        // Web 环境下无法直接访问系统环境变量
        // 可以考虑为常见环境变量提供模拟值
        if (name === 'HOME') {
            return '/home/user';
        } else if (name === 'APPDATA') {
            return 'C:\\Users\\user\\AppData\\Roaming';
        } else if (name === 'XDG_CONFIG_HOME') {
            return '/home/user/.config';
        }

        return null;
    }

    // --- YAML 操作 ---
    async parseYaml(content: string): Promise<YamlData> {
        if (typeof jsyaml !== 'undefined' && typeof jsyaml.load === 'function') {
            try {
                const parsed = jsyaml.load(content);
                // js-yaml 可能返回非对象类型（例如，如果 YAML 是一个简单的字符串或数字）
                // 确保返回一个对象或抛出错误
                if (typeof parsed === 'object' && parsed !== null) {
                    return parsed as YamlData;
                } else if (parsed === undefined || parsed === null) {
                    return {}; // 空的或无效的 YAML 返回空对象
                } else {
                     // 如果解析结果不是对象，包装一下或抛错
                     console.warn("[WebAdapter] YAML content parsed to non-object type:", typeof parsed);
                     // return { value: parsed }; // 或者包装
                     throw new Error("Parsed YAML content is not an object.");
                }
            } catch (error: any) {
                console.error('[WebAdapter] js-yaml failed to parse:', error);
                throw new Error(`YAML Parse Error: ${error.message}`);
            }
        } else {
            console.error('[WebAdapter] js-yaml is not available for parseYaml.');
            throw new Error('YAML parsing is not available in this web environment.');
        }
    }

    async serializeYaml(data: YamlData): Promise<string> {
        if (typeof jsyaml !== 'undefined' && typeof jsyaml.dump === 'function') {
            try {
                // js-yaml 的 dump 选项可以调整输出格式
                return jsyaml.dump(data, { indent: 2, noRefs: true, lineWidth: -1 });
            } catch (error: any) {
                 console.error('[WebAdapter] js-yaml failed to serialize:', error);
                 throw new Error(`YAML Serialize Error: ${error.message}`);
            }
        } else {
             console.error('[WebAdapter] js-yaml is not available for serializeYaml.');
             throw new Error('YAML serialization is not available in this web environment.');
        }
    }

    // --- IPC ---
    onIpcHandlersReady(callback: () => void): void {
        console.log("[WebAdapter] onIpcHandlersReady called. Assuming ready immediately.");
        // 在 Web 环境中，没有 IPC 准备过程，可以直接执行回调（或延迟执行）
        setTimeout(callback, 0);
    }
}