// src/types/core/preload.types.ts

import { EspansoFile } from "./espanso-format.types";


// Single source of truth for the Preload API and related types

// Define EspansoFile reference (can be imported if defined elsewhere or kept simple)

export interface FileInfo {
  name: string;
  path: string;
  extension: string;
}

export interface FileSystemNode {
  type: 'directory' | 'file';
  name: string;
  path: string;
  children?: FileSystemNode[];
}

// Represents data parsed from or to be serialized to YAML
export interface YamlData {
  matches?: Array<{
    trigger?: string; // Make optional as not all items might be matches
    replace?: string; // Make optional
    [key: string]: any;
  }>;
  [key: string]: any;
}

// Type for electron.dialog.showOpenDialog options
export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
  >;
}

// Type for electron.dialog.showOpenDialog result
export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

// Type for electron.dialog.showMessageBox options
export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
}

// Type for electron.dialog.showMessageBox result
export interface MessageBoxResult {
  response: number;
  checkboxChecked: boolean;
}

// Type for file filters used in dialogs
export interface FileFilter {
  name: string;
  extensions: string[];
}

// Type for electron.dialog.showSaveDialog options
export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}

// Type for electron.dialog.showSaveDialog result
export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

// Interface defining the API exposed from preload script to renderer process
export interface PreloadApi {
  platform: () => string;
  // File System Operations
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  fileExists: (filePath: string) => Promise<boolean>; // Renamed from existsFile for clarity
  listFiles?: (dirPath: string) => Promise<FileInfo[]>; // Make optional if not always implemented
  scanDirectory: (dirPath: string) => Promise<FileSystemNode[]>; // Keep scanDirectory for tree structure

  // Dialogs
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>;
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
  showMessageBox: (options: MessageBoxOptions) => Promise<MessageBoxResult>;

  // System Information
  getPlatform: () => Promise<string>; // Renamed from platform()
  getEnvironmentVariable?: (name: string) => Promise<string | null>; // 获取环境变量
  executeCommand?: (command: string) => Promise<string>; // 执行命令行命令
  openExternal?: (url: string) => Promise<boolean>; // 在默认浏览器中打开外部链接
  openInExplorer?: (filePath: string) => Promise<boolean>; // 在文件管理器中打开文件或文件夹

  // YAML Handling
  parseYaml: (content: string) => Promise<YamlData>;
  serializeYaml: (data: Record<string, any>) => Promise<string>; // Ensure data is Record for js-yaml

  // Espanso Specific (Consider moving to a dedicated Espanso service via IPC later)
  getEspansoConfigFiles?: () => Promise<EspansoFile[]>; // Make optional
  getDefaultEspansoConfigPath: () => Promise<{ success: boolean; path: string | null; error?: string }>;

  // UI Notifications
  showNotification: (title: string, body: string) => Promise<void>;

  // IPC Ready Signal (If needed)
  onIpcHandlersReady?: (callback: () => void) => void;

  // Espanso Installation
  checkEspansoInstalled?: () => Promise<boolean>; // 检查 Espanso 是否已安装
}

// Note: The global Window augmentation is assumed to be handled elsewhere
// or was causing conflicts. Ensure it's declared once globally if needed.