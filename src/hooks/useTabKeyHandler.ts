/**
 * Tab 键处理钩子
 * 
 * 用于禁用右侧面板的 Tab 键默认行为
 */
import { onMounted, onUnmounted } from 'vue';

/**
 * 判断元素是否在右侧面板中
 * @param element 要检查的元素
 * @returns 是否在右侧面板中
 */
function isInRightPane(element: HTMLElement | null): boolean {
  if (!element) return false;
  
  // 检查元素是否在右侧面板中
  return element.closest('.right-pane') !== null;
}

/**
 * 使用 Tab 键处理钩子
 * 禁用右侧面板的 Tab 键默认行为
 */
export function useTabKeyHandler() {
  /**
   * 处理 Tab 键事件
   * @param event Tab 键事件
   */
  const handleTabKeyEvent = (event: KeyboardEvent) => {
    // 只处理 Tab 键事件
    if (event.key !== 'Tab') return;
    
    // 获取当前焦点元素
    const activeElement = document.activeElement as HTMLElement;
    
    // 如果当前焦点元素在右侧面板中，阻止 Tab 键的默认行为
    if (isInRightPane(activeElement)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  
  onMounted(() => {
    // 添加全局 Tab 键事件监听器
    document.addEventListener('keydown', handleTabKeyEvent, true);
  });
  
  onUnmounted(() => {
    // 移除全局 Tab 键事件监听器
    document.removeEventListener('keydown', handleTabKeyEvent, true);
  });
}
