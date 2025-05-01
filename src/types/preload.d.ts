export interface OpenDialogOptions {
  properties: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles'>;
}

export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface MessageBoxOptions {
  type: 'none' | 'info' | 'error' | 'question' | 'warning';
  title: string;
  message: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

export interface PreloadApi {
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>;
  showMessageBox: (options: MessageBoxOptions) => Promise<void>;
  showNotification: (options: { title: string; body: string }) => void;
  onFullScreenChange: (callback: (isFullscreen: boolean) => void) => () => void;
  getPlatform: () => 'darwin' | 'win32' | 'linux';
}

declare global {
  interface Window {
    preloadApi: PreloadApi;
  }
}

export {};