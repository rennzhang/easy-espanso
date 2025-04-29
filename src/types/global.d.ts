import type { PreloadApi } from './preload';

declare global {
  interface Window {
    preloadApi?: PreloadApi;
  }
} 