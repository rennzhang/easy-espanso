/// <reference types="vite/client" />

// 声明Preload API的类型
interface PreloadApi {
  // 环境判断
  isElectron?: boolean;
  isUTools?: boolean;

  // 文件操作
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  fileExists: (filePath: string) => Promise<boolean>;
  listFiles: (dirPath: string) => Promise<any[]>;
  showOpenDialog: (options?: any) => Promise<string[] | undefined>;
  showOpenDirectoryDialog: (options?: any) => Promise<string[] | undefined>;
  showSaveDialog: (options?: any) => Promise<{ canceled: boolean, filePath?: string }>;

  // YAML操作
  parseYaml: (content: string) => any;
  serializeYaml: (data: any) => string;

  // Espanso相关
  getEspansoConfigDir: () => string;
  getEspansoConfigFiles: () => Promise<any[]>;

  // 其他
  showNotification: (message: string) => void;
}

// 扩展Window接口以包含Preload API
declare interface Window {
  preloadApi?: PreloadApi;
  utools?: {
    showNotification?: (text: string) => void;
  };
}

// 支持.vue文件导入
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 支持HTML Input元素的webkitdirectory属性
interface HTMLInputElement {
  webkitdirectory?: boolean;
  webkitRelativePath?: string;
}
