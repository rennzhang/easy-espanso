// 从preload脚本导入文件服务函数
import { EspansoFile } from '../types/espanso-config';

// 读取文件内容
export function readFile(filePath: string): Promise<string> {
  if (window.preloadApi?.readFile) {
    return window.preloadApi.readFile(filePath);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.readFile不可用，使用模拟数据');
  return Promise.resolve('# 示例YAML内容\nmatches:\n  - trigger: ":hello"\n    replace: "Hello, World!"');
}

// 写入文件内容
export function writeFile(filePath: string, content: string): Promise<void> {
  if (window.preloadApi?.writeFile) {
    return window.preloadApi.writeFile(filePath, content);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.writeFile不可用，使用模拟数据');
  console.log(`模拟写入文件: ${filePath}`);
  return Promise.resolve();
}

// 检查文件是否存在
export function fileExists(filePath: string): Promise<boolean> {
  if (window.preloadApi?.fileExists) {
    return window.preloadApi.fileExists(filePath);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.fileExists不可用，使用模拟数据');
  return Promise.resolve(true);
}

// 列出目录中的文件
export function listFiles(dirPath: string): Promise<any[]> {
  if (window.preloadApi?.listFiles) {
    return window.preloadApi.listFiles(dirPath);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.listFiles不可用，使用模拟数据');
  return Promise.resolve([
    { name: 'base.yml', path: '/path/to/base.yml', extension: '.yml' },
    { name: 'default.yml', path: '/path/to/default.yml', extension: '.yml' }
  ]);
}

// 显示打开文件对话框
export function showOpenFileDialog(options: any = {}): Promise<string[] | undefined> {
  if (window.preloadApi?.showOpenDialog) {
    return window.preloadApi.showOpenDialog(options);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.showOpenDialog不可用，使用模拟数据');
  return Promise.resolve(['/path/to/selected/file.yml']);
}

// 显示打开目录对话框
export function showOpenDirectoryDialog(options: any = {}): Promise<string[] | undefined> {
  if (window.preloadApi?.showOpenDirectoryDialog) {
    return window.preloadApi.showOpenDirectoryDialog(options);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.showOpenDirectoryDialog不可用，使用模拟数据');
  return Promise.resolve(['/path/to/selected/directory']);
}

// 显示保存文件对话框
export function showSaveDialog(options: any = {}): Promise<{ canceled: boolean, filePath?: string }> {
  if (window.preloadApi?.showSaveDialog) {
    return window.preloadApi.showSaveDialog(options);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.showSaveDialog不可用，使用模拟数据');
  return Promise.resolve({ canceled: false, filePath: '/path/to/save/file.yml' });
}

// 解析YAML内容
export function parseYaml(content: string): any {
  if (window.preloadApi?.parseYaml) {
    return window.preloadApi.parseYaml(content);
  }

  // 如果preloadApi不可用，返回一个模拟的对象
  console.warn('preloadApi.parseYaml不可用，使用模拟数据');
  return {
    matches: [
      { trigger: ':hello', replace: 'Hello, World!' }
    ]
  };
}

// 序列化为YAML
export function serializeYaml(data: any): string {
  if (window.preloadApi?.serializeYaml) {
    return window.preloadApi.serializeYaml(data);
  }

  // 如果preloadApi不可用，返回一个模拟的YAML字符串
  console.warn('preloadApi.serializeYaml不可用，使用模拟数据');
  return '# 示例YAML内容\nmatches:\n  - trigger: ":hello"\n    replace: "Hello, World!"';
}

// 获取Espanso配置目录
export function getEspansoConfigDir(): string {
  if (window.preloadApi?.getEspansoConfigDir) {
    return window.preloadApi.getEspansoConfigDir();
  }

  // 如果preloadApi不可用，返回一个模拟的路径
  console.warn('preloadApi.getEspansoConfigDir不可用，使用模拟数据');
  return '/path/to/espanso/config';
}

// 获取Espanso配置文件
export async function getEspansoConfigFiles(): Promise<EspansoFile[]> {
  if (window.preloadApi?.getEspansoConfigFiles) {
    return window.preloadApi.getEspansoConfigFiles();
  }

  // 如果preloadApi不可用，返回一个模拟的配置文件列表
  console.warn('preloadApi.getEspansoConfigFiles不可用，使用模拟数据');
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

// 显示通知
export function showNotification(message: string): void {
  if (window.preloadApi?.showNotification) {
    window.preloadApi.showNotification(message);
  } else {
    console.log('通知:', message);
  }
}
