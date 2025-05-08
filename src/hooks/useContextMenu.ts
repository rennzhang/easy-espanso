import { computed, nextTick } from 'vue';
import { useEspansoStore } from '@/store/useEspansoStore'; // 引入重构后的 Store
import { toast } from 'vue-sonner';
import ClipboardManager from '@/utils/ClipboardManager';
import TreeNodeRegistry from '@/utils/TreeNodeRegistry'; // 假设这个注册表仍然用于展开/折叠状态
import type { TreeNodeItem } from '@/components/ConfigTree.vue'; // 假设 TreeNodeItem 类型不变 (需要确认或调整)
import { findParentNodeInTree, findNodeById } from '@/utils/configTreeUtils'; // 引入查找父节点工具函数
import { Match } from '@/types/core/espanso.types';
import { determineSnippetPosition, focusTriggerInput } from '@/utils/snippetPositionUtils';
import * as platformService from '@/services/platformService';

// --- MenuItem Interface (保持不变) ---
interface MenuItem {
  label: string;
  icon?: any;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
  variant?: 'destructive';
  show?: boolean;
  shortcut?: string;
}

export function useContextMenu(props: { node: TreeNodeItem | null } | { getNode: () => TreeNodeItem | null }) {
  const store = useEspansoStore();

  // 不再需要确认对话框状态

  // --- 获取当前节点 (保持不变) ---
  const getCurrentNode = (): TreeNodeItem | null => {
    if ('getNode' in props) {
      return props.getNode();
    } else {
      return props.node;
    }
  };

  // --- 节点是否有子节点 (移除了 Group 的判断) ---
  const nodeHasChildren = (node?: TreeNodeItem | null): boolean => {
    if (!node) return false;
    if (node.type === 'folder' || node.type === 'file') {
        // 检查 node 对象上是否有 children 属性且非空 (或者 node.matches 非空)
        return !!(node.children && node.children.length > 0) || !!(node.match && node.match.length > 0);
    }
    return false;
  };

  const handleCopyNodePath = async () => {
    const node = getCurrentNode();
    if (!node) return;
    let pathToCopy = '';
    if (node.type === 'file' || node.type === 'folder') {
      pathToCopy = node.path || '';
    } else if (node.type === 'match' && node.match?.filePath) {
      pathToCopy = node.match.filePath;
      // 行号逻辑可以保留:
      // if (node.match.lineNumber) {
      //   pathToCopy += `:${node.match.lineNumber}`;
      // }
    }
    if (!pathToCopy) {
      toast.error('无法获取路径');
      return;
    }
    try {
      await navigator.clipboard.writeText(pathToCopy);
      toast.success('路径已复制');
    } catch (err) {
      console.error('复制路径失败:', err);
      toast.error('无法复制路径');
    }
  };

   // --- 剪贴板操作 (只处理 Match) ---
  const handleCopyItem = () => {
    const node = getCurrentNode();
    if (node?.type === 'match' && node.match) {
      ClipboardManager.copyItem(node.match);
      const itemName = node.match.trigger || node.match.label || '片段';
      toast.success(`已复制: ${itemName}`);
    } else {
      toast.error('仅支持复制片段');
    }
  };

  const handleCutItem = () => {
    const node = getCurrentNode();
     if (node?.type === 'match' && node.match) {
      ClipboardManager.cutItem(node.match);
      const itemName = node.match.trigger || node.match.label || '片段';
      toast.success(`已剪切: ${itemName}`);
    } else {
       toast.error('仅支持剪切片段');
    }
  };

  // --- 粘贴操作 (只处理 Match 的粘贴) ---
  const handlePasteItem = async () => {
    const targetNode = getCurrentNode();
    if (!targetNode) {
      toast.error("请先选择粘贴位置");
      return;
    }

    const { item: clipboardItem, operation } = ClipboardManager.getItem();
    if (!clipboardItem) {
      toast.error('剪贴板为空');
      return;
    }
    // **重要: 限制只能粘贴 Match 类型**
    if (clipboardItem.type !== 'match') {
        toast.error('只能粘贴片段类型');
        return;
    }

    let targetParentId: string | null = null;
    let currentIndex: number = -1;

    // 目标只能是 File 或 Folder (或者 Match 的父 File)
    if (targetNode.type === 'file') {
        targetParentId = targetNode.id;
        currentIndex = 0; // 添加到文件顶部
    } else if (targetNode.type === 'folder') {
         // **重要:** 直接粘贴到文件夹的行为需要明确定义
         // 通常不允许直接将 Match 粘贴到文件夹，应粘贴到其下的某个文件
         // 这里可以尝试查找文件夹下的第一个文件作为目标，或提示用户选择文件
         toast.warning("请选择一个文件作为粘贴目标，而不是文件夹。");
         console.warn(`[ContextMenu] 尝试粘贴到文件夹 ${targetNode.id}，操作被阻止或需要更明确的目标。`);
         // 或者找到文件夹下第一个文件作为目标（示例，可能不符合预期）：
         // const firstFile = targetNode.children?.find(n => n.type === 'file');
         // if (firstFile) {
         //     targetParentId = firstFile.id;
         //     currentIndex = 0;
         // } else {
              return; // 没有合适的文件目标
         // }
    } else if (targetNode.type === 'match') {
        // 粘贴到 Match 所在的文件
        const parentNode = findParentNodeInTree(store.state.configTree, targetNode.id);
        if (parentNode && parentNode.type === 'file') { // 确保父节点是 File
            targetParentId = parentNode.id;
            currentIndex = 0; // 添加到文件顶部
        } else {
             console.error(`[ContextMenu] 无法找到片段 ${targetNode.id} 的父文件节点`);
             toast.error("无法确定粘贴位置");
             return;
        }
    } else {
         toast.error("无效的粘贴目标");
         return;
    }

    console.log(`[ContextMenu] 准备粘贴 ${clipboardItem.type} (${clipboardItem.id}) 到父节点 ${targetParentId} 的位置 ${currentIndex}`);

    try {
        await store.pasteItem(clipboardItem.id, currentIndex); // 传递索引
        const itemName = clipboardItem.trigger || clipboardItem.label || clipboardItem.id;
        toast.success(`已粘贴: ${itemName}`);
    } catch (error: any) {
        console.error("粘贴失败:", error);
        toast.error(`粘贴失败: ${error.message || '未知错误'}`);
    }
  };


  // --- 创建操作 (只创建 Match) ---
  const handleCreateMatch = async () => {
      const targetNode = getCurrentNode();
      if (!targetNode) {
          toast.error("请选择创建新片段的位置");
          return;
      }

      // 使用工具函数确定新片段的位置
      const { targetParentNodeId, insertIndex } = determineSnippetPosition(
          store.state.configTree,
          targetNode.id
      );

      if (!targetParentNodeId) {
          console.error('[ContextMenu] 无法确定目标父节点');
          toast.error("无法确定创建新片段的位置");
          return;
      }

      console.log(`[ContextMenu] 准备在父文件节点 ${targetParentNodeId}, 位置 ${insertIndex} 创建新片段`);

      const newMatchData = {
          trigger: ':new',
          replace: '新片段内容',
          label: '新片段',
      };

      try {
          const addedItem = await store.addItem(newMatchData, 'match', targetParentNodeId, insertIndex);
          if (addedItem) {
              console.log('[ContextMenu] 成功创建新片段', addedItem.id);
              toast.success('新片段已创建，请编辑触发词');

              // 在下一个 tick 中开始尝试聚焦
              nextTick(() => {
                  // 给UI一些时间来渲染
                  setTimeout(() => focusTriggerInput(), 100);
              });
          } else {
              console.error('[ContextMenu] 创建新片段失败');
              toast.error('创建新片段失败');
          }
      } catch (error: any) {
          console.error("[ContextMenu] 创建片段失败:", error);
          toast.error(`创建片段失败: ${error.message || '未知错误'}`);
      }
  };

  const handleCreateConfigFile = async () => {
    const targetNode = getCurrentNode();

    // 如果当前选中了一个文件夹节点，则在该文件夹下创建文件
    if (targetNode && targetNode.type === 'folder') {
        const folderId = targetNode.id;
        if (!folderId) {
            toast.error("无法获取文件夹ID");
            return;
        }

        const timestamp = new Date().getTime();
        const newFileName = `${timestamp}_config.yml`;
        console.log(`[ContextMenu] 准备在文件夹 ${folderId} 下创建配置文件 ${newFileName}`);

        try {
            const newFileId = await store.createConfigFile(folderId, newFileName);
            if (!newFileId) {
                toast.error("创建配置文件失败");
                return;
            }

            toast.success(`配置文件 ${newFileName} 已创建`);

            // 选中新创建的文件
            store.selectItem(newFileId, 'file');

            // 确保文件夹是展开的
            const folderNode = TreeNodeRegistry.get(folderId);
            if (folderNode?.info?.isOpen) {
                folderNode.info.isOpen.value = true;
            }

            // 延时触发重命名
            setTimeout(() => {
                const el = document.getElementById(`tree-node-${newFileId}`)?.querySelector('.text-sm.font-medium.flex-grow');
                if (el instanceof HTMLElement) {
                    try {
                        el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
                    } catch (err) {
                        console.error('触发双击事件失败:', err);
                    }
                }
            }, 300);
        } catch (error: any) {
            toast.error(`创建配置文件失败: ${error.message || '未知错误'}`);
        }
    } else {
        // 如果未选中文件夹节点，则在match文件夹下创建
        const timestamp = new Date().getTime();
        const newFileName = `${timestamp}_config.yml`;
        console.log(`[ContextMenu] 准备创建配置文件 ${newFileName}`);

        try {
            const newFileId = await store.createConfigFile(null, newFileName); // 传null让store自行处理
            if (!newFileId) {
                toast.error("创建配置文件失败");
                return;
            }

            toast.success(`配置文件 ${newFileName} 已创建`);

            // 选中新创建的文件
            store.selectItem(newFileId, 'file');

            // 查找match文件夹节点并确保它展开
            for (const node of store.state.configTree) {
                if (node.type === 'folder' && node.name === 'match') {
                    const folderNode = TreeNodeRegistry.get(node.id);
                    if (folderNode?.info?.isOpen) {
                        folderNode.info.isOpen.value = true;
                    }
                    break;
                }
            }

            // 延时触发重命名
            setTimeout(() => {
                const el = document.getElementById(`tree-node-${newFileId}`)?.querySelector('.text-sm.font-medium.flex-grow');
                if (el instanceof HTMLElement) {
                    try {
                        el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
                    } catch (err) {
                        console.error('触发双击事件失败:', err);
                    }
                }
            }, 300);
        } catch (error: any) {
            toast.error(`创建配置文件失败: ${error.message || '未知错误'}`);
        }
    }
  };

  // 使用系统级别的 confirm 对话框直接删除
  const deleteItem = async (type: 'match' | 'file' | 'folder') => {
    const node = getCurrentNode();
    if (!node || node.type !== type) return;

    const id = node.id;
    let name = node.name || '未知项';
    if (type === 'match' && node.match) {
         name = node.match.trigger || node.match.label || '未知片段';
    }

    let message = '';

    if (type === 'match') {
        message = `确定要删除片段 "${name}" 吗？`;
        if (confirm(message)) {
          try {
            await store.deleteItem(id, 'match');
            toast.success(`已删除: ${name}`);
          } catch (err: any) {
            console.error('删除操作失败:', err);
            toast.error(`删除失败: ${err.message || '未知错误'}`);
          }
        }
    } else if (type === 'file') {
         message = `确定要删除配置文件 "${name}" 吗？此操作会从文件系统中移除该文件，且不可撤销。`;
         if (confirm(message)) {
          try {
            await store.deleteFileNode(id);
            toast.success(`已删除: ${name}`);
          } catch (err: any) {
            console.error('删除操作失败:', err);
            toast.error(`删除失败: ${err.message || '未知错误'}`);
          }
         }
    } else if (type === 'folder') {
         message = `确定要删除文件夹 "${name}" 及其所有内容吗？此操作会从文件系统中移除该文件夹及其包含的所有文件和子文件夹，且不可撤销。`;
         if (confirm(message)) {
          try {
            await store.deleteFolderNode(id);
            toast.success(`已删除: ${name}`);
          } catch (err: any) {
            console.error('删除操作失败:', err);
            toast.error(`删除失败: ${err.message || '未知错误'}`);
          }
         }
    }
  };

  // --- 返回暴露给组件的接口 ---
  return {
    // 计算属性
    isFolder: computed(() => getCurrentNode()?.type === 'folder'),
    isFile: computed(() => getCurrentNode()?.type === 'file'),
    isMatch: computed(() => getCurrentNode()?.type === 'match'),
    canPaste: computed(() => {
        const node = getCurrentNode();
        const clipboard = ClipboardManager.getItem();
        // 必须有剪贴板内容，且内容必须是 Match，且目标不能是 Folder
        return clipboard.item?.type === 'match' && node?.type !== 'folder';
    }),
    currentNodeHasChildren: computed(() => nodeHasChildren(getCurrentNode())),

    // 基础操作
    handleCopyNodePath, // handleCopyNodeName 可以移除，如果菜单项不需要

    // 剪贴板操作 (现在只处理 Match)
    handleCopyItem,
    handleCutItem,
    handlePasteItem,

    // 创建操作 (只创建 Match 和 File)
    handleCreateMatch,
    handleCreateConfigFile,

    // 添加创建文件夹的函数
    handleCreateFolder: async () => {
      try {
        const targetNode = getCurrentNode();
        let targetFolderId = null;

        // 如果当前选中了一个文件夹节点，则在该文件夹下创建新文件夹
        if (targetNode && targetNode.type === 'folder') {
          targetFolderId = targetNode.id;
        }

        // 获取根目录
        const rootDir = store.state.configRootDir;
        if (!rootDir) {
          toast.error('未设置根目录');
          return;
        }

        // 确定目标路径
        let parentPath;
        let parentNode = null;
        if (targetFolderId) {
          // 如果有目标文件夹，获取其路径
          parentNode = findNodeById(store.state.configTree, targetFolderId);
          if (!parentNode || parentNode.type !== 'folder') {
            toast.error('无效的目标文件夹');
            return;
          }
          parentPath = parentNode.path;
        } else {
          // 否则在match文件夹下创建
          parentPath = `${rootDir}/match`;
          // 找到match目录节点
          for (const node of store.state.configTree) {
            if (node.type === 'folder' && node.name === 'match') {
              parentNode = node;
              break;
            }
          }
          // 确保match目录存在
          const matchDirExists = await platformService.directoryExists(parentPath);
          if (!matchDirExists) {
            await platformService.createDirectory(parentPath);

            // 如果match目录不存在且创建成功，但在树中没有match节点，创建一个
            if (!parentNode) {
              const { createFolderNode } = await import('@/utils/configTreeUtils');
              parentNode = createFolderNode('match', parentPath);
              store.state.configTree.push(parentNode);
            }
          }
        }

        // 确保有父节点存在
        if (!parentNode) {
          toast.error('无法找到或创建父文件夹节点');
          return;
        }

        // 创建新文件夹名称并构建完整路径
        const timestamp = new Date().getTime();
        const newFolderName = `${timestamp}_folder`;
        const newFolderPath = `${parentPath}/${newFolderName}`;

        // 使用平台服务创建目录
        await platformService.createDirectory(newFolderPath);

        // 创建新文件夹节点并添加到树中
        const { createFolderNode } = await import('@/utils/configTreeUtils');
        const newFolderNode = createFolderNode(newFolderName, newFolderPath);

        // 将新节点添加到父节点
        if (parentNode.children) {
          parentNode.children.unshift(newFolderNode);

          // 选中新创建的文件夹
          store.selectItem(newFolderNode.id, 'folder');

          // 确保父文件夹是展开的
          const folderNode = TreeNodeRegistry.get(parentNode.id);
          if (folderNode?.info?.isOpen) {
            folderNode.info.isOpen.value = true;
          }

          // 延时触发重命名
          setTimeout(() => {
            const el = document.getElementById(`tree-node-${newFolderNode.id}`)?.querySelector('.text-sm.font-medium.flex-grow');
            if (el instanceof HTMLElement) {
              console.log('找到文件夹名称元素，触发双击事件');
              try {
                el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
              } catch (err) {
                console.error('触发双击事件失败:', err);
              }
            } else {
              console.warn(`无法找到文件夹节点名称元素，ID: ${newFolderNode.id}`);
            }
          }, 300);

          toast.success(`文件夹 ${newFolderName} 已创建`);
        } else {
          toast.error('父文件夹节点没有children属性');
        }
      } catch (error: any) {
        console.error('创建文件夹失败:', error);
        toast.error(`创建文件夹失败: ${error.message || '未知错误'}`);
      }
    },

    // 展开/折叠 - now using store actions
    handleExpandAll: () => store.expandAllNodes(),
    handleCollapseAll: () => store.collapseAllNodes(),
    handleExpandCurrentNode: () => {
      const node = getCurrentNode();
      if (node?.id && nodeHasChildren(node)) {
        // Expand the node and all its children
        // First ensure the node itself is expanded
        if (!store.isNodeExpanded(node.id)) {
          store.toggleNodeExpansion(node.id);
        }

        // Then recursively expand all child nodes
        const expandChildren = (nodes: TreeNodeItem[]) => {
          for (const child of nodes) {
            if (child.type === 'folder' || child.type === 'file') {
              if (!store.isNodeExpanded(child.id)) {
                store.toggleNodeExpansion(child.id);
              }
              if (child.children && child.children.length > 0) {
                expandChildren(child.children);
              }
            }
          }
        };

        if (node.children && node.children.length > 0) {
          expandChildren(node.children);
        }
      }
    },
    handleCollapseCurrentNode: () => {
      const node = getCurrentNode();
      if (node?.id && nodeHasChildren(node)) {
        // Collapse the node and all its children
        // First ensure the node itself is collapsed
        if (store.isNodeExpanded(node.id)) {
          store.toggleNodeExpansion(node.id);
        }

        // Then recursively collapse all child nodes
        const collapseChildren = (nodes: TreeNodeItem[]) => {
          for (const child of nodes) {
            if (child.type === 'folder' || child.type === 'file') {
              if (store.isNodeExpanded(child.id)) {
                store.toggleNodeExpansion(child.id);
              }
              if (child.children && child.children.length > 0) {
                collapseChildren(child.children);
              }
            }
          }
        };

        if (node.children && node.children.length > 0) {
          collapseChildren(node.children);
        }
      }
    },

    // 删除操作
    prepareDeleteMatch: () => deleteItem('match'),
    prepareDeleteFile: () => deleteItem('file'),
    prepareDeleteFolder: () => deleteItem('folder'),
  };
}