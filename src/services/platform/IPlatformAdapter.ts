import type { 
  OpenDialogOptions, 
  OpenDialogResult, 
  FileInfo, 
  SaveDialogOptions, 
  SaveDialogResult,
  MessageBoxOptions,
  MessageBoxResult,
  YamlData
} from '@/types/preload';
import type { EspansoFile } from '@/types/espanso-config';

/**
 * 平台适配器接口 - 定义所有平台必须实现的方法
 */
export interface IPlatformAdapter {
  // 文件操作
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  listFiles(dirPath: string): Promise<FileInfo[]>;
  
  // 对话框
  showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult>;
  showOpenDirectoryDialog(): Promise<string | null>;
  showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult>;
  showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult>;
  
  // 系统操作
  getPlatform(): Promise<string>;
  
  // 配置文件
  parseYaml(content: string): Promise<YamlData>;
  serializeYaml(data: YamlData): Promise<string>;
  getEspansoConfigDir(): Promise<string | null>;
  getEspansoConfigFiles(): Promise<EspansoFile[]>;
  showNotification(title: string, body: string): Promise<void>;
  
  // 配置存储
  saveConfigDirPath(path: string): void;
  getConfigDirPath(): string | null;
}
