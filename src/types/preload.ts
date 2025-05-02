import { EspansoFile } from './espanso-config';

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

export interface PreloadApi {
  // 文件操作
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  existsFile: (filePath: string) => Promise<boolean>;
  listFiles: (dirPath: string) => Promise<FileInfo[]>;
  
  // 对话框
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>;
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
  showMessageBox: (options: MessageBoxOptions) => Promise<MessageBoxResult>;
  
  // 系统操作
  platform: () => Promise<string>;
  
  // 配置文件
  parseYaml: (content: string) => Promise<YamlData>;
  serializeYaml: (data: YamlData) => Promise<string>;
  getEspansoConfigFiles: () => Promise<EspansoFile[]>;
  showNotification: (title: string, body: string) => Promise<void>;
  
  // 新增API
  getDefaultEspansoConfigPath: () => Promise<{ success: boolean; path: string | null; error?: string }>;
  scanDirectory: (dirPath: string) => Promise<FileSystemNode[]>;
  fileExists: (filePath: string) => Promise<boolean>;

  // 新增
  onIpcHandlersReady: (callback: () => void) => void;
}

declare global {
  interface Window {
    preloadApi?: PreloadApi;
  }
}

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

export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

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

export interface MessageBoxResult {
  response: number;
  checkboxChecked: boolean;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}

export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface YamlData {
  matches?: Array<{
    trigger: string;
    replace: string;
    [key: string]: any;
  }>;
  [key: string]: any;
} 