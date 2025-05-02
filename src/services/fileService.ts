// 从preload脚本导入文件服务函数
import type { EspansoFile } from '@/types/espanso-config';
import type {
  PreloadApi,
  OpenDialogOptions,
  OpenDialogResult,
  FileInfo,
  SaveDialogOptions,
  SaveDialogResult,
  FileFilter,
  MessageBoxOptions,
  MessageBoxResult,
  YamlData
} from '@/types/preload';

// 检测运行环境
export async function detectEnvironment(): Promise<'electron' | 'web'> {
  // 检查是否在 Electron 环境
  if (window.preloadApi) {
    return 'electron';
  }
  return 'web';
}

// 显示打开目录对话框
export async function showOpenDirectoryDialog(): Promise<string | null> {
  const env = await detectEnvironment();

  if (env === 'web') {
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

  // Electron 环境
  if (window.preloadApi?.showOpenDialog) {
    const options: OpenDialogOptions = {
      properties: ['openDirectory']
    };

    try {
      const result = await window.preloadApi.showOpenDialog(options);
      if (!result || result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    } catch (error) {
      console.error('Failed to show open directory dialog:', error);
      return null;
    }
  }

  return null;
}

// 保存配置目录路径
export function saveConfigDirPath(path: string): void {
  // 确保路径格式正确 (统一使用正斜杠)
  const normalizedPath = path.replace(/\\/g, '/');

  // 确保路径是完整的 (如果是相对路径，则自动转为绝对路径)
  let fullPath = normalizedPath;
  if (!normalizedPath.startsWith('/') && typeof process !== 'undefined' && process.platform === 'darwin') {
    fullPath = `/${normalizedPath}`;
  }

  console.log('保存配置目录路径:', fullPath);
  localStorage.setItem('espansoConfigDir', fullPath);
}

// 读取文件内容
export async function readFile(filePath: string): Promise<string> {
  if (window.preloadApi?.readFile) {
    return window.preloadApi.readFile(filePath);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.readFile不可用，使用模拟数据');
  return Promise.resolve('# 示例YAML内容\nmatches:\n  - trigger: ":hello"\n    replace: "Hello, World!"');
}

// 写入文件内容
export async function writeFile(filePath: string, content: string): Promise<void> {
  if (window.preloadApi?.writeFile) {
    return window.preloadApi.writeFile(filePath, content);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.writeFile不可用，使用模拟数据');
  console.log(`模拟写入文件: ${filePath}`);
  return Promise.resolve();
}

// 检查文件是否存在
export async function fileExists(filePath: string): Promise<boolean> {
  if (window.preloadApi && typeof window.preloadApi.existsFile === 'function') {
    console.log(`[fileService] 检查文件是否存在: ${filePath}`);
    try {
      return await window.preloadApi.existsFile(filePath);
    } catch (error) {
      console.warn(`[fileService] 检查文件存在性出错:`, error);
      return false;
    }
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('[fileService] preloadApi.fileExists不可用，使用模拟数据');
  return Promise.resolve(true);
}

// 列出目录中的文件
export async function listFiles(dirPath: string): Promise<FileInfo[]> {
  if (window.preloadApi?.listFiles) {
    return await window.preloadApi.listFiles(dirPath);
  }
  console.warn('preloadApi.listFiles is not available, using simulated data');
  return [
    {
      name: 'example.yml',
      path: '/path/to/example.yml',
      extension: '.yml'
    }
  ];
}

// 显示打开文件对话框
export async function showOpenFileDialog(options: OpenDialogOptions = {}): Promise<OpenDialogResult> {
  if (window.preloadApi?.showOpenDialog) {
    return window.preloadApi.showOpenDialog(options);
  }

  // Web环境模拟
  const env = await detectEnvironment();
  if (env === 'web') {
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

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.showOpenDialog不可用，使用模拟数据');
  return Promise.resolve({ canceled: false, filePaths: ['/path/to/selected/file.yml'] });
}

// 显示保存文件对话框
export async function showSaveDialog(options: SaveDialogOptions = {}): Promise<SaveDialogResult> {
  if (window.preloadApi?.showSaveDialog) {
    return window.preloadApi.showSaveDialog(options);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.showSaveDialog不可用，使用模拟数据');
  return Promise.resolve({ canceled: false, filePath: '/path/to/save/file.yml' });
}

// 解析YAML
export async function parseYaml(yamlString: string): Promise<YamlData> {
  if (window.preloadApi?.parseYaml) {
    return window.preloadApi.parseYaml(yamlString);
  }

  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.parseYaml不可用，使用模拟数据');
  return Promise.resolve({ matches: [{ trigger: ':hello', replace: 'Hello, World!' }] });
}

// 序列化YAML
export async function serializeYaml(data: YamlData): Promise<string> {
  // 处理数据中的数组（特别是triggers），确保正确格式化
  const prepareData = (obj: any): any => {
    // 如果是数组，确保每个元素都正确处理
    if (Array.isArray(obj)) {
      return obj.map(item => prepareData(item));
    }
    
    // 如果是对象，递归处理每个属性
    if (obj && typeof obj === 'object') {
      const result: any = {};
      
      for (const key in obj) {
        // 特殊处理triggers数组，确保输出为YAML流式数组
        if (key === 'triggers' && Array.isArray(obj[key])) {
          console.log('[serializeYaml] 处理triggers数组:', obj[key]);
          result[key] = prepareData(obj[key]);
        } else {
          result[key] = prepareData(obj[key]);
        }
      }
      
      return result;
    }
    
    // 原始类型直接返回
    return obj;
  };
  
  // 预处理数据
  const processedData = prepareData(data);
  
  // 首先尝试使用预加载脚本
  if (window.preloadApi?.serializeYaml) {
    try {
      return window.preloadApi.serializeYaml(processedData);
    } catch (error) {
      console.error('[serializeYaml] 预加载脚本序列化失败，尝试备用方法:', error);
      // 如果预加载脚本失败，尝试备用方法
    }
  }
  
  // 如果预加载脚本不可用或失败，尝试使用js-yaml直接实现
  try {
    // 动态导入js-yaml
    const yamlModule = await import('js-yaml');
    const yaml = yamlModule.default;
    
    // 使用js-yaml直接序列化，指定特殊选项确保数组正确格式化
    const result = yaml.dump(processedData, {
      indent: 2,
      lineWidth: -1, // 禁用行宽限制
      noRefs: true, // 避免YAML别名/锚点
      flowLevel: 1, // 设置为流式风格，触发器数组采用[item1, item2]形式
    });
    
    console.log('[serializeYaml] 使用直接js-yaml序列化成功');
    
    // 最后的修正：确保YAML表示的triggers数组格式正确
    const fixedResult = result.replace(/triggers: \|-\n\s+/g, 'triggers:\n  ');
    
    return fixedResult;
  } catch (importError) {
    console.error('[serializeYaml] 动态导入js-yaml失败:', importError);
  }
  
  // 如果上面的方法都失败，使用模拟数据
  console.warn('serializeYaml 所有方法都失败，使用模拟数据');
  return '# 无法序列化数据\n# 请检查您的环境设置\nmatches:\n  - trigger: ":error"\n    replace: "序列化失败"';
}

// 获取Espanso配置目录
export async function getEspansoConfigDir(): Promise<string | null> {
  const env = await detectEnvironment();

  if (env === 'web') {
    const savedPath = localStorage.getItem('espansoConfigDir');
    // 验证保存的路径并标准化
    if (savedPath) {
      return savedPath.replace(/\\/g, '/');
    }
    return null;
  }

  if (window.preloadApi?.platform) {
    try {
      const platform = await window.preloadApi.platform();

      switch (platform) {
        case 'win32':
          return `${typeof process !== 'undefined' ? (process.env.APPDATA || '') : ''}\\espanso`;
        case 'darwin':
          return `/Users/${typeof process !== 'undefined' ? (process.env.USER || process.env.HOME?.split('/').pop() || '') : ''}/Library/Application Support/espanso`;
        default:
          return `${typeof process !== 'undefined' ? (process.env.HOME || '') : ''}\\.config\\espanso`;
      }
    } catch (error) {
      console.error('获取配置目录失败:', error);
      return null;
    }
  }

  return null;
}

// 获取Espanso配置文件
export async function getEspansoConfigFiles(): Promise<EspansoFile[]> {
  // 首先尝试使用preloadApi
  if (window.preloadApi?.getEspansoConfigFiles) {
    return window.preloadApi.getEspansoConfigFiles();
  }

  // 如果preloadApi不可用，尝试自己实现功能
  try {
    const configDir = await getEspansoConfigDir();
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
export async function showNotification(title: string, body: string): Promise<void> {
  if (window.preloadApi?.showNotification) {
    await window.preloadApi.showNotification(title, body);
  } else {
    console.log('通知:', title, body);
  }
}

class FileService {
  private preloadApi: PreloadApi | undefined;

  constructor() {
    this.preloadApi = window.preloadApi;
  }

  async readFile(filePath: string): Promise<string> {
    if (!this.preloadApi) {
      return Promise.resolve('');
    }
    return this.preloadApi.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.preloadApi) {
      return Promise.resolve();
    }
    return this.preloadApi.writeFile(filePath, content);
  }

  async readYamlFile(filePath: string): Promise<any> {
    try {
      const content = await this.readFile(filePath);
      return await this.parseYaml(content);
    } catch (error) {
      console.error('读取YAML文件失败:', error);
      throw error;
    }
  }

  async writeYamlFile(filePath: string, data: any): Promise<void> {
    try {
      const content = await this.serializeYaml(data);
      return await this.writeFile(filePath, content);
    } catch (error) {
      console.error('写入YAML文件失败:', error);
      throw error;
    }
  }

  async existsFile(filePath: string): Promise<boolean> {
    if (!this.preloadApi) {
      return Promise.resolve(false);
    }
    return this.preloadApi.existsFile(filePath);
  }

  async listFiles(dirPath: string): Promise<FileInfo[]> {
    if (!this.preloadApi) {
      return Promise.resolve([]);
    }
    return this.preloadApi.listFiles(dirPath);
  }

  async showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult> {
    if (!this.preloadApi) {
      return Promise.resolve({ canceled: true, filePaths: [] });
    }
    return this.preloadApi.showOpenDialog(options);
  }

  async showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult> {
    if (!this.preloadApi) {
      return Promise.resolve({ canceled: true, filePath: undefined });
    }
    return this.preloadApi.showSaveDialog(options);
  }

  async showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
    if (!this.preloadApi) {
      return Promise.resolve({ response: 0, checkboxChecked: false });
    }
    return this.preloadApi.showMessageBox(options);
  }

  async parseYaml(content: string): Promise<YamlData> {
    if (!this.preloadApi) {
      return Promise.resolve({});
    }
    return this.preloadApi.parseYaml(content);
  }

  async serializeYaml(data: YamlData): Promise<string> {
    if (!this.preloadApi) {
      return Promise.resolve('example: yaml');
    }
    return this.preloadApi.serializeYaml(data);
  }

  async getEspansoConfigFiles(): Promise<EspansoFile[]> {
    if (!this.preloadApi) {
      return Promise.resolve([]);
    }
    return this.preloadApi.getEspansoConfigFiles() as Promise<EspansoFile[]>;
  }

  async showNotification(title: string, body: string): Promise<void> {
    if (!this.preloadApi) {
      return Promise.resolve();
    }
    return this.preloadApi.showNotification(title, body);
  }

  async getPlatform(): Promise<string> {
    if (!this.preloadApi) {
      return Promise.resolve('unknown');
    }
    return this.preloadApi.platform();
  }
}

export const fileService = new FileService();

/**
 * 获取Espanso默认配置路径（仅Electron环境）
 * @returns 默认配置路径或null
 */
export const getDefaultEspansoConfigPath = async (): Promise<string | null> => {
  try {
    // 检查环境类型
    const env = await detectEnvironment();
    if (env !== 'electron') {
      console.warn('仅在Electron环境下可获取默认配置路径');
      return null;
    }

    // 调用预加载API
    if (window.preloadApi?.getDefaultEspansoConfigPath) {
      console.log('调用预加载API: getDefaultEspansoConfigPath');
      console.log('[fileService] About to call window.preloadApi.getDefaultEspansoConfigPath');
      const result = await window.preloadApi.getDefaultEspansoConfigPath();
      console.log('[fileService] getDefaultEspansoConfigPath result:', result);
      // 处理返回的对象
      if (result && typeof result === 'object' && 'success' in result) { 
          if (result.success && result.path) {
              return result.path;
          } else {
              console.warn(`获取默认配置路径失败: ${result.error || 'Unknown error'}`);
              return null;
          }
      } else if (typeof result === 'string') { // 兼容旧的直接返回字符串的情况 (可能由用户的修改导致)
          console.warn('[fileService] getDefaultEspansoConfigPath 返回了字符串，期望是对象。可能预加载脚本被修改？');
          return result;
      } else if (result === null) { // 兼容直接返回 null 的情况
          console.warn('[fileService] getDefaultEspansoConfigPath 返回了 null。');
          return null;
      } else {
          console.error('[fileService] getDefaultEspansoConfigPath 返回了意外的类型:', typeof result, result);
          return null;
      }
    }

    console.warn('预加载API getDefaultEspansoConfigPath 不可用');
    return null;
  } catch (error) {
    console.error('获取默认配置路径失败:', error);
    return null;
  }
};

/**
 * 扫描目录，返回文件树结构（仅Electron环境）
 * @param dirPath 要扫描的目录路径
 * @returns 文件树结构
 */
export const scanDirectory = async (dirPath: string): Promise<any[]> => {
  try {
    // 检查环境类型
    const env = await detectEnvironment();
    if (env !== 'electron') {
      console.warn('仅在Electron环境下可扫描目录');
      return [];
    }

    // 调用预加载API
    if (window.preloadApi?.scanDirectory) {
      return await window.preloadApi.scanDirectory(dirPath);
    }

    console.warn('预加载API不可用');
    return [];
  } catch (error) {
    console.error('扫描目录失败:', error);
    return [];
  }
};
