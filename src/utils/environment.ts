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