// src/services/platform/ElectronAdapter.ts

import type { IPlatformAdapter } from "./IPlatformAdapter";
// 明确依赖 PreloadApi 接口定义，该接口应与 preload.ts 中暴露的 API 一致
import type { PreloadApi } from "@/types/core/preload.types";
import type {
  FileInfo,
  FileSystemNode,
  YamlData,
  OpenDialogOptions,
  OpenDialogResult,
  SaveDialogOptions,
  SaveDialogResult,
  MessageBoxOptions,
  MessageBoxResult,
} from "@/types/core/preload.types";

/**
 * Electron 平台适配器 - 使用 Electron 的 preloadApi 实现 IPlatformAdapter 接口。
 *
 * **重要:** 这个类的所有功能都依赖于 window.preloadApi 对象及其方法的正确暴露和实现。
 * 请确保 preload.ts 脚本和主进程 IPC handlers 提供了所有需要的功能。
 */
export class ElectronAdapter implements IPlatformAdapter {
  private preloadApi: PreloadApi;

  constructor() {
    if (!window.preloadApi) {
      throw new Error(
        "[ElectronAdapter] preloadApi is not available on window. Ensure you are in an Electron environment and preload script is loaded correctly."
      );
    }
    this.preloadApi = window.preloadApi;
    console.log("[ElectronAdapter] Initialized.");
  }

  // --- 文件系统操作 ---
  async readFile(filePath: string): Promise<string> {
    this.ensurePreloadMethod("readFile");
    return this.preloadApi.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.ensurePreloadMethod("writeFile");
    return this.preloadApi.writeFile(filePath, content);
  }

  async fileExists(filePath: string): Promise<boolean> {
    // 适配 preload.ts 中可能存在的不同命名
    const checkFunc = this.preloadApi.fileExists ?? this.preloadApi.fileExists;
    if (!checkFunc)
      throw new Error(
        "[ElectronAdapter] Required preload method 'existsFile' or 'fileExists' not found."
      );
    return checkFunc(filePath);
  }

  async directoryExists(dirPath: string): Promise<boolean> {
    // 优先检查明确的 preload 方法
    if (typeof (this.preloadApi as any).directoryExists === "function") {
      return (this.preloadApi as any).directoryExists(dirPath);
    }
    // 备选方案：尝试 scanDirectory (可能不够精确或效率低)
    console.warn(
      "[ElectronAdapter] Optional preload method 'directoryExists' not found. Attempting workaround using 'scanDirectory'."
    );
    this.ensurePreloadMethod("scanDirectory"); // 确保 scanDirectory 存在
    try {
      await this.preloadApi.scanDirectory(dirPath);
      return true;
    } catch (error: any) {
      // 假设 scanDirectory 失败意味着目录不存在或不可访问
      console.log(
        `[ElectronAdapter] directoryExists check via scanDirectory failed for ${dirPath}:`,
        error.message
      );
      return false;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    // 假设 preload API 暴露了 createDirectory
    this.ensurePreloadMethod("createDirectory", true); // true 表示此方法可能是可选添加的
    return (this.preloadApi as any).createDirectory(dirPath);
  }

  async listFiles(dirPath: string): Promise<FileInfo[]> {
    this.ensurePreloadMethod("listFiles");
    return this.preloadApi.listFiles?.(dirPath) || [];
  }

  async scanDirectory(dirPath: string): Promise<FileSystemNode[]> {
    this.ensurePreloadMethod("scanDirectory");
    return this.preloadApi.scanDirectory(dirPath);
  }

  async deleteFile(filePath: string): Promise<void> {
    // 假设 preload API 暴露了 deleteFile
    this.ensurePreloadMethod("deleteFile", true);
    return (this.preloadApi as any).deleteFile(filePath);
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    // 假设 preload API 暴露了 deleteDirectory
    this.ensurePreloadMethod("deleteDirectory", true);
    return (this.preloadApi as any).deleteDirectory(dirPath);
  }

  async renameFileOrDirectory(oldPath: string, newPath: string): Promise<void> {
    // 适配 preload.ts 中可能存在的不同命名
    const renameFunc =
      this.preloadApi.renameFile ??
      (this.preloadApi as any).renameNode ??
      (this.preloadApi as any).renameFileOrDirectory;
    if (!renameFunc)
      throw new Error(
        "[ElectronAdapter] Required preload method for renaming ('renameFile', 'renameNode', or 'renameFileOrDirectory') not found."
      );
    return renameFunc(oldPath, newPath);
  }

  // --- 路径操作 ---
  async joinPath(...paths: string[]): Promise<string> {
    // 假设 preload API 暴露了 joinPath (可能是异步的)
    this.ensurePreloadMethod("joinPath", true);
    // 注意：这里的实现假设 preloadApi.joinPath 存在且可能是异步的
    // 如果 preload.joinPath 是同步的，需要去掉 await
    return (this.preloadApi as any).joinPath(...paths);
  }

  // --- 对话框 ---
  async showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult> {
    this.ensurePreloadMethod("showOpenDialog");
    return this.preloadApi.showOpenDialog(options);
  }

  async showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult> {
    this.ensurePreloadMethod("showSaveDialog");
    return this.preloadApi.showSaveDialog(options);
  }

  async showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
    this.ensurePreloadMethod("showMessageBox");
    return this.preloadApi.showMessageBox(options);
  }

  // --- 系统操作 ---
  async getPlatform(): Promise<string> {
    this.ensurePreloadMethod("platform");
    // 包装成 Promise，即使 preloadApi.platform 是同步的
    try {
      // 检查 preloadApi.platform 是否是函数
      if (typeof this.preloadApi.platform === "function") {
        const platformResult = await this.preloadApi.platform(); // 假设可能是异步的
        // const platformResult = this.preloadApi.platform(); // 如果确定是同步的
        return platformResult || "unknown";
      } else {
        console.error(
          "[ElectronAdapter] preloadApi.platform is not a function."
        );
        return "unknown";
      }
    } catch (e) {
      console.error("[ElectronAdapter] Error calling preloadApi.platform:", e);
      return "unknown";
    }
  }

  async showNotification(title: string, body: string): Promise<void> {
    this.ensurePreloadMethod("showNotification");
    return this.preloadApi.showNotification(title, body);
  }

  async getEnvironmentVariable(name: string): Promise<string | null> {
    // 检查 preloadApi 是否有 getEnvironmentVariable 方法
    if (typeof (this.preloadApi as any).getEnvironmentVariable === "function") {
      return (this.preloadApi as any).getEnvironmentVariable(name);
    }

    console.warn(
      `[ElectronAdapter] getEnvironmentVariable('${name}') is not available in preloadApi. Returning null.`
    );
    return null;
  }

  async executeCommand(command: string): Promise<string> {
    // 检查 preloadApi 是否有 executeCommand 方法
    if (typeof (this.preloadApi as any).executeCommand === "function") {
      return (this.preloadApi as any).executeCommand(command);
    }

    console.warn(
      `[ElectronAdapter] executeCommand('${command}') is not available in preloadApi. Returning empty string.`
    );
    return "";
  }

  async openExternal(url: string): Promise<boolean> {
    // 检查 preloadApi 是否有 openExternal 方法
    if (typeof this.preloadApi.openExternal === "function") {
      return this.preloadApi.openExternal(url);
    }

    console.warn(
      `[ElectronAdapter] openExternal('${url}') is not available in preloadApi. Falling back to window.open.`
    );

    // 备用方案：使用 window.open
    try {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    } catch (error) {
      console.error(`[ElectronAdapter] 打开链接 ${url} 失败:`, error);
      return false;
    }
  }

  async openInExplorer(filePath: string): Promise<boolean> {
    // 检查 preloadApi 是否有 openInExplorer 方法
    if (typeof (this.preloadApi as any).openInExplorer === "function") {
      return (this.preloadApi as any).openInExplorer(filePath);
    }

    console.warn(
      `[ElectronAdapter] openInExplorer('${filePath}') is not available in preloadApi.`
    );
    return false;
  }

  // --- YAML 操作 ---
  async parseYaml(content: string): Promise<YamlData> {
    this.ensurePreloadMethod("parseYaml");
    return this.preloadApi.parseYaml(content);
  }

  async serializeYaml(data: YamlData): Promise<string> {
    this.ensurePreloadMethod("serializeYaml");
    return this.preloadApi.serializeYaml(data);
  }

  // --- IPC ---
  onIpcHandlersReady(callback: () => void): void {
    if (typeof this.preloadApi.onIpcHandlersReady === "function") {
      this.preloadApi.onIpcHandlersReady(callback);
    } else {
      console.warn(
        "[ElectronAdapter] Optional preload method 'onIpcHandlersReady' not found. Assuming ready."
      );
      // 如果 preload 中没有提供，作为后备立即调用 (异步)
      setTimeout(callback, 0);
    }
  }

  /**
   * 内部辅助函数，用于检查 Preload API 方法是否存在。
   * @param methodName PreloadApi 中的方法名 (键)。
   * @param isOptional 如果为 true，则找不到方法时只打印警告。
   * @throws 如果方法不存在且 isOptional 为 false。
   */
  private ensurePreloadMethod(
    methodName: keyof PreloadApi | string,
    isOptional: boolean = false
  ): void {
    // 使用类型断言来访问可能存在的方法
    if (typeof (this.preloadApi as any)[methodName] !== "function") {
      const message = `[ElectronAdapter] Required preload method '${methodName}' not found or is not a function on window.preloadApi.`;
      if (isOptional) {
        console.warn(message + " Functionality may be limited.");
      } else {
        throw new Error(
          message + " Please ensure preload script exposes this method."
        );
      }
    }
  }
}

// 再次声明，确保类型提示正常
declare global {
  interface Window {
    preloadApi?: PreloadApi;
  }
}
