import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
/**
 * 检查当前环境是否为 macOS (基于 navigator.userAgent)。
 * @returns 如果是 macOS 返回 true，否则返回 false。
 */
export function isMacOS(): boolean {
  // 仅在浏览器环境 (navigator 存在时) 执行检查
  if (typeof navigator !== 'undefined') {
    // 这是检查 User Agent 中是否包含 Mac 相关标识的常用方法
    return /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  }
  // 如果 navigator 不存在 (非浏览器环境？)，默认返回 false
  return false;
}