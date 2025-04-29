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
}

declare global {
  interface Window {
    preloadApi: PreloadApi;
  }
}

export {}; 