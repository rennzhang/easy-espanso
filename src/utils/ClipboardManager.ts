import { Match } from '@/types/core/espanso.types';

interface ClipboardItem {
  item: Match;
  operation: 'copy' | 'cut';
}

// 剪贴板管理器
class ClipboardManager {
  private static instance: ClipboardManager;
  private clipboardItem: Match | null = null;
  private clipboardOperation: 'copy' | 'cut' | null = null;

  private constructor() {}

  // 单例模式
  public static getInstance(): ClipboardManager {
    if (!ClipboardManager.instance) {
      ClipboardManager.instance = new ClipboardManager();
    }
    return ClipboardManager.instance;
  }

  // 复制项目到剪贴板
  public copyItem(item: Match): void {
    this.clipboardItem = JSON.parse(JSON.stringify(item)); // 深拷贝
    this.clipboardOperation = 'copy';
  }

  // 剪切项目到剪贴板
  public cutItem(item: Match): void {
    this.clipboardItem = JSON.parse(JSON.stringify(item)); // 深拷贝
    this.clipboardOperation = 'cut';
  }

  // 获取剪贴板中的项目
  public getItem(): { item: Match | null; operation: 'copy' | 'cut' | null } {
    return {
      item: this.clipboardItem,
      operation: this.clipboardOperation
    };
  }

  // 清空剪贴板
  public clear(): void {
    this.clipboardItem = null;
    this.clipboardOperation = null;
  }

  // 检查剪贴板是否有内容
  public hasItem(): boolean {
    return this.clipboardItem !== null;
  }
}

export default ClipboardManager.getInstance();
