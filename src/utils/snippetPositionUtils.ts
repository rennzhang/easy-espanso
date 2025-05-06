/**
 * 片段位置工具函数
 * 用于确定新片段的创建位置或粘贴位置
 */

import type { ConfigTreeNode } from '@/types/core/ui.types';
import type { Match } from '@/types/core/espanso.types';
import { findItemInTreeById, findParentNodeInTree } from '@/utils/configTreeUtils';

/**
 * 位置信息接口
 */
export interface PositionInfo {
  targetParentNodeId: string | null;
  insertIndex: number;
}

/**
 * 查找默认文件节点ID的辅助函数
 * @param nodes 配置树节点数组
 * @returns 默认文件节点ID或null
 */
export const findDefaultFileNodeId = (nodes: ConfigTreeNode[]): string | null => {
  for (const node of nodes) {
    if (node.type === 'file') {
      // 优先选择 base.yml
      if (node.name === 'base.yml') {
        return node.id;
      }

      // 备选：第一个找到的文件节点
      return node.id;
    } else if (node.type === 'folder' && node.children && node.children.length > 0) {
      // 递归检查子文件夹
      const fileNodeId = findDefaultFileNodeId(node.children);
      if (fileNodeId) {
        return fileNodeId;
      }
    }
  }
  return null;
};

/**
 * 确定新片段的创建位置或粘贴位置
 * @param configTree 配置树
 * @param selectedNodeId 当前选中的节点ID
 * @returns 位置信息
 */
export const determineSnippetPosition = (
  configTree: ConfigTreeNode[],
  selectedNodeId: string | null
): PositionInfo => {
  let targetParentNodeId: string | null = null;
  let insertIndex: number = -1;

  if (selectedNodeId) {
    // 查找选中节点
    const selectedNode = findItemInTreeById(configTree, selectedNodeId);

    if (selectedNode) {
      console.log(`确定位置: 当前选中节点 ${selectedNodeId} (${selectedNode.type})`);

      if (selectedNode.type === 'file') {
        // 如果选中的是文件节点，则在该文件下创建新片段，放在最上面
        targetParentNodeId = selectedNode.id;
        insertIndex = 0; // 插入到文件的最上面
      } else if (selectedNode.type === 'match') {
        // 如果选中的是匹配项，则在同一文件下创建新片段
        // 查找父节点
        const parentNode = findParentNodeInTree(configTree, selectedNodeId);
        if (parentNode && parentNode.type === 'file') {
          targetParentNodeId = parentNode.id;
          insertIndex = 0; // 插入到文件的最上面
        }
      } else if (selectedNode.type === 'folder') {
        // 如果选中的是文件夹，尝试找到文件夹中的第一个文件
        if ('children' in selectedNode && selectedNode.children && selectedNode.children.length > 0) {
          const firstFileNode = selectedNode.children.find((child: ConfigTreeNode) => child.type === 'file');
          if (firstFileNode) {
            targetParentNodeId = firstFileNode.id;
            insertIndex = 0; // 插入到文件的最上面
          }
        }
      }
    }
  }

  // 如果没有找到目标父节点，则使用默认逻辑
  if (!targetParentNodeId) {
    console.log('确定位置: 未找到目标父节点，使用默认逻辑');
    targetParentNodeId = findDefaultFileNodeId(configTree);
    insertIndex = 0; // 默认情况下也插入到文件的最上面
  }

  return { targetParentNodeId, insertIndex };
};

/**
 * 聚焦触发词输入框的辅助函数
 * @param attempts 尝试次数
 */
export const focusTriggerInput = (attempts = 0) => {
  if (attempts > 10) {
    console.log('聚焦触发词输入框失败，已达到最大尝试次数');
    return;
  }

  // 尝试获取触发词输入框
  const triggerInput = document.getElementById('trigger');
  if (triggerInput) {
    console.log(`聚焦触发词输入框 (尝试 ${attempts + 1})`);

    // 尝试多种方式聚焦
    try {
      // 方法1: 直接聚焦
      triggerInput.focus();

      // 方法2: 模拟点击然后聚焦
      setTimeout(() => {
        try {
          (triggerInput as HTMLElement).click();
          (triggerInput as HTMLInputElement).focus();
        } catch (e) {
          console.error('模拟点击聚焦失败', e);
        }
      }, 10);

      // 方法3: 选择文本内容
      if (triggerInput instanceof HTMLInputElement || triggerInput instanceof HTMLTextAreaElement) {
        setTimeout(() => {
          try {
            triggerInput.select();
          } catch (e) {
            console.error('选择文本失败', e);
          }
        }, 20);
      }
    } catch (e) {
      console.error('聚焦失败', e);
    }
  } else {
    console.log(`未找到触发词输入框 (尝试 ${attempts + 1})`);
    // 递增延迟重试
    setTimeout(() => focusTriggerInput(attempts + 1), 100 * (attempts + 1));
  }
};
