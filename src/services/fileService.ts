// 从preload脚本导入文件服务函数
import { EspansoFile } from '../types/espanso-config';

// 检测当前运行环境
export function detectEnvironment(): 'electron' | 'utools' | 'web' {
  if (window.preloadApi?.isElectron) {
    return 'electron';
  } else if (window.preloadApi?.isUTools) {
    return 'utools';
  } else {
    return 'web';
  }
}

// 保存配置目录路径
export function saveConfigDirPath(path: string): void {
  localStorage.setItem('espansoConfigDir', path);
}

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
export function showOpenFileDialog(options: any = {}): Promise<string | null> {
  if (window.preloadApi?.showOpenDialog) {
    return window.preloadApi.showOpenDialog(options).then((paths: string[] | undefined) => {
      return paths && paths.length > 0 ? paths[0] : null;
    });
  }

  // Web环境模拟
  if (detectEnvironment() === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.filters ? options.filters.map((f: any) => f.extensions.map((e: string) => `.${e}`).join(',')).join(',') : '';

      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        resolve(file ? URL.createObjectURL(file) : null);
      };

      input.click();
    });
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.showOpenDialog不可用，使用模拟数据');
  return Promise.resolve('/path/to/selected/file.yml');
}

// 显示打开目录对话框
export function showOpenDirectoryDialog(options: any = {}): Promise<string | null> {
  if (window.preloadApi?.showOpenDialog) {
    const dirOptions = { ...options, properties: ['openDirectory'] };
    return window.preloadApi.showOpenDialog(dirOptions).then((paths: string[] | undefined) => {
      return paths && paths.length > 0 ? paths[0] : null;
    });
  }

  // Web环境模拟
  if (detectEnvironment() === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;

      input.onchange = (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          // 尝试提取父目录
          const file = files[0];
          const path = file.webkitRelativePath.split('/')[0];

          // 检查是否选择了espanso文件夹
          let isEspansoFolder = false;
          let hasMatchDir = false;
          let hasConfigDir = false;

          // 检查选择的文件夹结构
          for (let i = 0; i < files.length; i++) {
            const filePath = files[i].webkitRelativePath;
            if (filePath.includes('/match/')) {
              hasMatchDir = true;
            }
            if (filePath.includes('/config/')) {
              hasConfigDir = true;
            }

            // 如果同时包含match和config目录，认为是espanso文件夹
            if (hasMatchDir && hasConfigDir) {
              isEspansoFolder = true;
              break;
            }
          }

          if (isEspansoFolder) {
            console.log('检测到完整的espanso文件夹结构');
            // 保存配置目录路径
            saveConfigDirPath(path);
            resolve(path);
          } else {
            // 显示提示，要求选择完整的espanso文件夹
            alert('请选择完整的espanso文件夹，该文件夹应包含match和config子目录');
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      input.click();
    });
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.showOpenDialog不可用，使用模拟数据');
  return Promise.resolve('/path/to/selected/directory');
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

// 解析YAML
export function parseYaml(yamlString: string): any {
  if (window.preloadApi?.parseYaml) {
    return window.preloadApi.parseYaml(yamlString);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.parseYaml不可用，使用模拟数据');
  return Promise.resolve({ matches: [{ trigger: ':hello', replace: 'Hello, World!' }] });
}

// 序列化YAML
export function serializeYaml(data: any): string {
  if (window.preloadApi?.serializeYaml) {
    return window.preloadApi.serializeYaml(data);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.serializeYaml不可用，使用模拟数据');
  return '# 示例YAML内容\nmatches:\n  - trigger: ":hello"\n    replace: "Hello, World!"';
}

// 获取Espanso配置目录
export function getEspansoConfigDir(): string {
  if (window.preloadApi?.getEspansoConfigDir) {
    return window.preloadApi.getEspansoConfigDir();
  }

  // 如果preloadApi不可用，尝试从localStorage读取
  const savedConfigDir = localStorage.getItem('espansoConfigDir');
  if (savedConfigDir) {
    return savedConfigDir;
  }

  // 如果还是没有，返回一个模拟的路径
  console.warn('preloadApi.getEspansoConfigDir不可用，使用模拟数据');
  return '/path/to/espanso/config';
}

// 获取Espanso配置文件
export async function getEspansoConfigFiles(): Promise<EspansoFile[]> {
  // 首先尝试使用preloadApi
  if (window.preloadApi?.getEspansoConfigFiles) {
    return window.preloadApi.getEspansoConfigFiles();
  }

  // 如果preloadApi不可用，尝试自己实现功能
  try {
    const configDir = getEspansoConfigDir();
    const matchDir = `${configDir}/match`;
    const configPath = `${configDir}/config`;

    // 获取match目录中的文件
    const files: EspansoFile[] = [];

    try {
      const matchFiles = await listFiles(matchDir);
      for (const file of matchFiles) {
        if (file.extension === '.yml' || file.extension === '.yaml') {
          const content = await readFile(file.path);
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
      const configFiles = await listFiles(configPath);
      for (const file of configFiles) {
        if (file.extension === '.yml' || file.extension === '.yaml') {
          const content = await readFile(file.path);
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
  }

  // 如果都失败了，返回一个模拟的配置文件列表
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
