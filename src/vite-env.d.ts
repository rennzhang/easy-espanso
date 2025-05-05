/// <reference types="vite/client" />

import { EspansoFile } from "./espanso-format.types";
import { FileInfo } from '@/types/preload';


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
