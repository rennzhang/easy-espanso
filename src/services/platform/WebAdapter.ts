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
import { IPlatformAdapter } from './IPlatformAdapter';

/**
 * Web平台适配器 - 为Web环境提供模拟的文件操作
 */
export class WebAdapter implements IPlatformAdapter {
  // 文件操作
  async readFile(filePath: string): Promise<string> {
    console.warn('Web环境: readFile不可用，使用模拟数据');
    return Promise.resolve('# 示例YAML内容\nmatches:\n  - trigger: ":hello"\n    replace: "Hello, World!"');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    console.warn('Web环境: writeFile不可用，使用模拟数据');
    console.log(`模拟写入文件: ${filePath}`);
    return Promise.resolve();
  }

  async fileExists(filePath: string): Promise<boolean> {
    console.warn('Web环境: fileExists不可用，使用模拟数据');
    return Promise.resolve(true);
  }

  async listFiles(dirPath: string): Promise<FileInfo[]> {
    console.warn('Web环境: listFiles不可用，使用模拟数据');
    return Promise.resolve([
      {
        name: 'example.yml',
        path: '/path/to/example.yml',
        extension: '.yml'
      }
    ]);
  }

  // 对话框
  async showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.filters ? options.filters.map(f => f.extensions.map(e => `.${e}`).join(',')).join(',') : '';

      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        resolve(file ? { canceled: false, filePaths: [URL.createObjectURL(file)] } : { canceled: true, filePaths: [] });
      };

      input.click();
    });
  }

  async showOpenDirectoryDialog(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.setAttribute('webkitdirectory', '');

      input.onchange = (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          // 获取选择的文件夹路径
          const file = files[0];
          const path = file.webkitRelativePath.split('/')[0];
          resolve(path);
        } else {
          resolve(null);
        }
      };

      input.click();
    });
  }

  async showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult> {
    console.warn('Web环境: showSaveDialog不可用，使用模拟数据');
    return Promise.resolve({ canceled: false, filePath: '/path/to/save/file.yml' });
  }

  async showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
    const response = window.confirm(options.message + (options.detail ? `\n\n${options.detail}` : ''));
    return Promise.resolve({ 
      response: response ? 0 : 1, 
      checkboxChecked: false 
    });
  }

  // 系统操作
  async getPlatform(): Promise<string> {
    // 在Web环境中，我们可以尝试检测用户的操作系统
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('win') !== -1) return 'win32';
    if (userAgent.indexOf('mac') !== -1) return 'darwin';
    if (userAgent.indexOf('linux') !== -1) return 'linux';
    return 'unknown';
  }

  // 配置文件
  async parseYaml(content: string): Promise<YamlData> {
    // 在Web环境中，我们可以使用js-yaml库
    // 这里假设已经导入了js-yaml
    try {
      // 如果有全局的jsyaml对象
      if (typeof window.jsyaml !== 'undefined') {
        return window.jsyaml.load(content);
      }
      
      console.warn('Web环境: parseYaml不可用，使用模拟数据');
      return Promise.resolve({ matches: [{ trigger: ':hello', replace: 'Hello, World!' }] });
    } catch (error) {
      console.error('解析YAML失败:', error);
      return {};
    }
  }

  async serializeYaml(data: YamlData): Promise<string> {
    try {
      // 如果有全局的jsyaml对象
      if (typeof window.jsyaml !== 'undefined') {
        return window.jsyaml.dump(data);
      }
      
      console.warn('Web环境: serializeYaml不可用，使用模拟数据');
      return Promise.resolve('# 示例YAML内容\nmatches:\n  - trigger: ":hello"\n    replace: "Hello, World!"');
    } catch (error) {
      console.error('序列化YAML失败:', error);
      return '';
    }
  }

  async getEspansoConfigDir(): Promise<string | null> {
    return this.getConfigDirPath();
  }

  async getEspansoConfigFiles(): Promise<EspansoFile[]> {
    console.warn('Web环境: getEspansoConfigFiles不可用，使用模拟数据');
    return [
      {
        path: '/path/to/espanso/match/base.yml',
        name: 'base.yml',
        content: '# 示例YAML内容\nmatches:\n  - trigger: ":hello"\n    replace: "Hello, World!"',
        type: 'match'
      },
      {
        path: '/path/to/espanso/config/default.yml',
        name: 'default.yml',
        content: '# 示例配置\ntoggle_key: ALT\nshow_notifications: true',
        type: 'config'
      }
    ];
  }

  async showNotification(title: string, body: string): Promise<void> {
    // 使用Web Notifications API
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      }
    } else {
      // 降级到alert
      alert(`${title}: ${body}`);
    }
    return Promise.resolve();
  }

  // 配置存储
  saveConfigDirPath(path: string): void {
    localStorage.setItem('espansoConfigDir', path);
  }

  getConfigDirPath(): string | null {
    return localStorage.getItem('espansoConfigDir');
  }
}

// 为了支持js-yaml在Web环境中
declare global {
  interface Window {
    jsyaml?: {
      load: (content: string) => any;
      dump: (data: any) => string;
    }
  }
}
