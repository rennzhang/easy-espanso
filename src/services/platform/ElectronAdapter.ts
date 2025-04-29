import type { 
  OpenDialogOptions, 
  OpenDialogResult, 
  FileInfo, 
  SaveDialogOptions, 
  SaveDialogResult,
  MessageBoxOptions,
  MessageBoxResult,
  YamlData,
  PreloadApi
} from '@/types/preload';
import type { EspansoFile } from '@/types/espanso-config';
import { IPlatformAdapter } from './IPlatformAdapter';

/**
 * Electron平台适配器 - 使用Electron的preloadApi实现文件操作
 */
export class ElectronAdapter implements IPlatformAdapter {
  private preloadApi: PreloadApi;

  constructor() {
    if (!window.preloadApi) {
      throw new Error('ElectronAdapter: preloadApi is not available');
    }
    this.preloadApi = window.preloadApi;
  }

  // 文件操作
  async readFile(filePath: string): Promise<string> {
    return this.preloadApi.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    return this.preloadApi.writeFile(filePath, content);
  }

  async fileExists(filePath: string): Promise<boolean> {
    return this.preloadApi.existsFile(filePath);
  }

  async listFiles(dirPath: string): Promise<FileInfo[]> {
    return this.preloadApi.listFiles(dirPath);
  }

  // 对话框
  async showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult> {
    return this.preloadApi.showOpenDialog(options);
  }

  async showOpenDirectoryDialog(): Promise<string | null> {
    const options: OpenDialogOptions = {
      properties: ['openDirectory']
    };

    try {
      const result = await this.preloadApi.showOpenDialog(options);
      if (!result || result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    } catch (error) {
      console.error('Failed to show open directory dialog:', error);
      return null;
    }
  }

  async showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult> {
    return this.preloadApi.showSaveDialog(options);
  }

  async showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
    return this.preloadApi.showMessageBox(options);
  }

  // 系统操作
  async getPlatform(): Promise<string> {
    return this.preloadApi.platform();
  }

  // 配置文件
  async parseYaml(content: string): Promise<YamlData> {
    return this.preloadApi.parseYaml(content);
  }

  async serializeYaml(data: YamlData): Promise<string> {
    return this.preloadApi.serializeYaml(data);
  }

  async getEspansoConfigDir(): Promise<string | null> {
    try {
      const platform = await this.getPlatform();
      
      switch (platform) {
        case 'win32':
          return `${process.env.APPDATA || ''}\\espanso`;
        case 'darwin':
          return `${process.env.HOME || ''}\\Library\\Application Support\\espanso`;
        default:
          return `${process.env.HOME || ''}\\.config\\espanso`;
      }
    } catch (error) {
      console.error('获取配置目录失败:', error);
      return null;
    }
  }

  async getEspansoConfigFiles(): Promise<EspansoFile[]> {
    if (this.preloadApi.getEspansoConfigFiles) {
      return this.preloadApi.getEspansoConfigFiles();
    }

    // 如果preloadApi没有直接提供此方法，则自己实现
    try {
      const configDir = await this.getEspansoConfigDir();
      if (!configDir) return [];
      
      const matchDir = `${configDir}/match`;
      const configPath = `${configDir}/config`;

      // 获取match目录中的文件
      const files: EspansoFile[] = [];

      try {
        const matchFiles = await this.listFiles(matchDir);
        for (const file of matchFiles) {
          if (file.extension === '.yml' || file.extension === '.yaml') {
            const content = await this.readFile(file.path);
            files.push({
              path: file.path,
              name: file.name,
              content,
              type: 'match'
            });
          }
        }
      } catch (error) {
        console.error('获取match文件失败', error);
      }

      // 获取config目录中的文件
      try {
        const configFiles = await this.listFiles(configPath);
        for (const file of configFiles) {
          if (file.extension === '.yml' || file.extension === '.yaml') {
            const content = await this.readFile(file.path);
            files.push({
              path: file.path,
              name: file.name,
              content,
              type: 'config'
            });
          }
        }
      } catch (error) {
        console.error('获取config文件失败', error);
      }

      return files;
    } catch (error) {
      console.error('获取配置文件失败', error);
      return [];
    }
  }

  async showNotification(title: string, body: string): Promise<void> {
    if (this.preloadApi.showNotification) {
      return this.preloadApi.showNotification(title, body);
    } else {
      console.log('通知:', title, body);
    }
  }

  // 配置存储
  saveConfigDirPath(path: string): void {
    localStorage.setItem('espansoConfigDir', path);
  }

  getConfigDirPath(): string | null {
    return localStorage.getItem('espansoConfigDir');
  }
}
