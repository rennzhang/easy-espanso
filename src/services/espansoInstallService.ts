import { PlatformAdapterFactory } from './platform/PlatformAdapterFactory';

// 引入窗口对象以便接收 IPC 事件
declare global {
  interface Window {
    ipcRenderer: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, listener: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

// 当前检测到的安装状态
let cachedInstallStatus: boolean | null = null;

// 监听来自主进程的 Espanso 安装状态更新
window.ipcRenderer?.on('espanso:installStatus', (_event, installed: boolean) => {
  console.log('接收到 Espanso 安装状态:', installed);
  cachedInstallStatus = installed;
});

/**
 * 检测 espanso 是否已安装且正在运行
 * @returns Promise<boolean> 是否已安装且运行正常
 */
export async function checkEspansoInstalled(): Promise<boolean> {
  try {
    // 如果有缓存的状态，先判断是否为 true，如果为 true 则直接返回
    if (cachedInstallStatus === true) {
      return true;
    }
    
    // 优先使用 Electron IPC 通道进行检测（更准确）
    if (window.ipcRenderer) {
      try {
        const installed = await window.ipcRenderer.invoke('sys:checkEspansoInstalled');
        cachedInstallStatus = installed;
        return installed;
      } catch (error) {
        console.error('通过 IPC 检测 Espanso 失败:', error);
        // 如果 IPC 失败，使用备用方法
      }
    }
    
    // 备用方法：使用平台适配器
    const adapter = PlatformAdapterFactory.getInstance();
    
    // 使用 adapter.getPlatform() 获取平台信息，而不是依赖 process
    const platform = await adapter.getPlatform();
    const command = platform === 'win32' ? 'where espanso' : 'which espanso';
    
    // 使用命令检查 espanso 是否在 PATH 中
    const result = await adapter.executeCommand(command);
    
    if (result.trim().length > 0) {
      // 如果找到 espanso 命令，再检查状态
      try {
        const statusResult = await adapter.executeCommand('espanso status');
        // 如果可以执行 status 命令且没有错误，则认为 espanso 已安装且正在运行
        cachedInstallStatus = true;
        return true;
      } catch (error) {
        console.warn('Espanso 已安装但可能未运行:', error);
        cachedInstallStatus = false;
        return false;
      }
    }
    
    // 如果命令执行成功并返回路径，则表示已安装
    cachedInstallStatus = false;
    return false;
  } catch (error) {
    console.error('检测 Espanso 安装失败:', error);
    return false;
  }
}

/**
 * 获取当前操作系统类型
 * @returns 'windows' | 'macos' | 'linux' | 'unknown'
 */
export function getOSType(): 'windows' | 'macos' | 'linux' | 'unknown' {
  try {
    // 使用平台适配器工厂获取适配器实例
    const adapter = PlatformAdapterFactory.getInstance();
    
    // 创建一个已经解析的缓存值，用于存储平台信息
    let cachedPlatform: string | null = null;
    
    // 尝试从navigator.platform获取平台信息（这是同步的）
    const navigatorPlatform = navigator.platform.toLowerCase();
    
    // 检查浏览器的platform属性（同步）
    if (navigatorPlatform.includes('win')) {
      return 'windows';
    } else if (navigatorPlatform.includes('mac')) {
      return 'macos';
    } else if (navigatorPlatform.includes('linux') || navigatorPlatform.includes('x11')) {
      return 'linux';
    }
    
    // 尝试从window.preloadApi同步获取平台信息（如果可用）
    if (window.preloadApi && typeof window.preloadApi.platform === 'function') {
      try {
        const platformSync = window.preloadApi.platform();
        if (typeof platformSync === 'string') {
          if (platformSync === 'win32') return 'windows';
          if (platformSync === 'darwin') return 'macos';
          if (platformSync === 'linux') return 'linux';
        }
      } catch (e) {
        console.warn('从 preloadApi.platform 获取平台信息失败:', e);
      }
    }
    
    // 如果无法同步获取，则返回一个最佳猜测值
    // 在大多数情况下，这个值已经通过navigator.platform确定了
    return 'unknown';
  } catch (e) {
    console.error('获取操作系统类型失败:', e);
    return 'unknown';
  }
}

/**
 * 获取 espanso 安装指南链接
 * @returns string 安装指南URL
 */
export function getInstallGuideLink(): string {
  const osType = getOSType();
  const baseUrl = 'https://espanso.org/install/';
  
  switch (osType) {
    case 'windows':
      return `${baseUrl}windows/`;
    case 'macos':
      return `${baseUrl}mac/`;
    case 'linux':
      return `${baseUrl}linux/`;
    default:
      return baseUrl;
  }
}
