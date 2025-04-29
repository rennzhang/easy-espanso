import { IPlatformAdapter } from './IPlatformAdapter';
import { ElectronAdapter } from './ElectronAdapter';
import { WebAdapter } from './WebAdapter';

/**
 * 平台适配器工厂 - 根据当前环境创建适当的平台适配器
 */
export class PlatformAdapterFactory {
  private static instance: IPlatformAdapter | null = null;

  /**
   * 获取当前环境的平台适配器实例
   * @returns 平台适配器实例
   */
  public static getInstance(): IPlatformAdapter {
    if (!PlatformAdapterFactory.instance) {
      PlatformAdapterFactory.instance = PlatformAdapterFactory.createAdapter();
    }
    return PlatformAdapterFactory.instance;
  }

  /**
   * 创建适合当前环境的平台适配器
   * @returns 平台适配器实例
   */
  private static createAdapter(): IPlatformAdapter {
    // 检查是否在 Electron 环境
    if (window.preloadApi) {
      try {
        return new ElectronAdapter();
      } catch (error) {
        console.warn('创建ElectronAdapter失败，降级到WebAdapter:', error);
      }
    }
    
    // 默认使用Web适配器
    return new WebAdapter();
  }
}
