/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 声明preloadApi全局变量
interface Window {
  preloadApi?: {
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<void>;
    showOpenDialog: (options: any) => Promise<string[] | undefined>;
  };
  utools?: {
    showNotification?: (text: string) => void;
  };
}
