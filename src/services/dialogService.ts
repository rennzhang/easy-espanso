import { OpenDialogOptions, OpenDialogResult, MessageBoxOptions } from '../types/preload';

/**
 * 显示打开目录对话框
 * @returns 选择的目录路径，如果取消则返回 null
 */
export async function showOpenDirectoryDialog(): Promise<string | null> {
  if (!window.preloadApi) {
    console.error('preloadApi is not available');
    return null;
  }

  const options: OpenDialogOptions = {
    properties: ['openDirectory']
  };

  try {
    const result: OpenDialogResult = await window.preloadApi.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  } catch (error) {
    console.error('Failed to show open directory dialog:', error);
    return null;
  }
}

/**
 * 显示错误对话框
 * @param title 标题
 * @param message 错误信息
 */
export async function showErrorDialog(title: string, message: string): Promise<void> {
  if (!window.preloadApi) {
    console.error('preloadApi is not available');
    return;
  }

  const options: MessageBoxOptions = {
    type: 'error',
    title,
    message
  };

  try {
    await window.preloadApi.showMessageBox(options);
  } catch (error) {
    console.error('Failed to show error dialog:', error);
  }
} 