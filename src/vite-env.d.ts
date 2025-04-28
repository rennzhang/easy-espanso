/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 声明preloadApi全局变量
interface Window {
  preloadApi?: {
    // 文件操作
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<void>;
    fileExists: (filePath: string) => Promise<boolean>;
    listFiles: (dirPath: string) => Promise<any[]>;

    // 对话框
    showOpenDialog: (options: any) => Promise<string[] | undefined>;
    showOpenDirectoryDialog: (options: any) => Promise<string[] | undefined>;
    showSaveDialog: (options: any) => Promise<{ canceled: boolean, filePath?: string }>;

    // YAML处理
    parseYaml: (content: string) => any;
    serializeYaml: (data: any) => string;

    // Espanso相关
    getEspansoConfigDir: () => string;
    getEspansoConfigFiles: () => Promise<any[]>;

    // 通知
    showNotification: (message: string) => void;
  };
  utools?: {
    showNotification?: (text: string) => void;
  };
}
