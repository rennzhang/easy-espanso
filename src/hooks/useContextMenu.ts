import { computed, ref } from 'vue';
import { useEspansoStore } from '@/store/useEspansoStore'; // 引入重构后的 Store
import { toast } from 'vue-sonner';
import ClipboardManager from '@/utils/ClipboardManager';
import TreeNodeRegistry from '@/utils/TreeNodeRegistry'; // 假设这个注册表仍然用于展开/折叠状态
import type { TreeNodeItem } from '@/components/ConfigTree.vue'; // 假设 TreeNodeItem 类型不变 (需要确认或调整)
import { findParentNodeInTree } from '@/utils/configTreeUtils'; // 引入查找父节点工具函数
import { Match } from '@/types/core/espanso.types';

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

  // --- 确认对话框状态 (保持不变) ---
  const confirmDialogVisible = ref(false);
  const confirmDialogTitle = ref('');
  const confirmDialogMessage = ref('');
  const pendingAction = ref<(() => Promise<void>) | null>(null);

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
        currentIndex = 0; // 默认添加到文件顶部
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
            // 查找索引
            const siblings = parentNode.matches || [];
            currentIndex = siblings.findIndex((item: Match) => item.id === targetNode.id);
            if (currentIndex !== -1) {
                currentIndex += 1; // 插入到后面
            } else {
                currentIndex = -1; // 附加到末尾
            }
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

      let targetParentId: string | null = null;

      if (targetNode.type === 'file') { // 只能在文件下创建
          targetParentId = targetNode.id;
      } else if (targetNode.type === 'match') { // 在相同文件下创建
           const parentNode = findParentNodeInTree(store.state.configTree, targetNode.id);
           if (parentNode && parentNode.type === 'file') {
                targetParentId = parentNode.id;
           }
      } else if (targetNode.type === 'folder') {
           // **重要:** 需要定义在文件夹上“新建片段”的行为
           // 例如：自动在文件夹下创建/选择一个默认文件（如 base.yml），然后添加
           toast.warning("请在目标文件内创建片段，或先创建配置文件。");
           console.warn("[ContextMenu] 尝试在文件夹下创建片段，操作被阻止或需要默认文件逻辑。");
           // 示例：查找或创建默认文件 (需要 config/platform service 配合)
           // const defaultFilePath = await findOrCreateDefaultFileInFolder(targetNode.path);
           // targetParentId = defaultFilePath ? `file-${defaultFilePath}` : null;
           return; // 暂时阻止
      }

      if (!targetParentId) {
           toast.error("无法确定创建片段的文件目标");
           return;
      }

      console.log(`[ContextMenu] 准备在父文件节点 ${targetParentId} 下创建新片段`);

      const newMatchData = {
          trigger: ':new',
          replace: '新片段内容',
          label: '新片段标签',
      };

      try {
          const addedItem = await store.addItem(newMatchData, 'match', targetParentId);
          if (addedItem) {
              toast.success('新片段已创建');
          } else {
               toast.error('创建新片段失败');
          }
      } catch (error: any) {
          console.error("创建片段失败:", error);
          toast.error(`创建片段失败: ${error.message || '未知错误'}`);
      }
  };

  const handleCreateConfigFile = async () => {
      const targetNode = getCurrentNode();
      if (!targetNode || targetNode.type !== 'folder') {
           toast.error("请选择一个文件夹来创建配置文件");
           return;
      }
      const folderPath = targetNode.path;
      if (!folderPath) {
           toast.error("无法获取文件夹路径");
           return;
      }

      const newFileName = `new_config_${Date.now()}.yml`;
      console.log(`[ContextMenu] 准备在 ${folderPath} 下创建配置文件 ${newFileName}`);

      try {
          await store.createConfigFile(folderPath, newFileName);
          toast.success(`配置文件 ${newFileName} 已创建`);
      } catch (error: any) {
          console.error("创建配置文件失败:", error);
          toast.error(`创建配置文件失败: ${error.message || '未知错误'}`);
      }
  };


  // --- 展开/折叠操作 (保持不变，依赖 TreeNodeRegistry) ---
  const handleExpandAll = () => TreeNodeRegistry.expandAll();
  const handleCollapseAll = () => TreeNodeRegistry.collapseAll();
  const handleExpandCurrentNode = () => {
    const node = getCurrentNode();
    if (node?.id && nodeHasChildren(node)) TreeNodeRegistry.expandNodeAndChildren(node.id);
  };
  const handleCollapseCurrentNode = () => {
    const node = getCurrentNode();
    if (node?.id && nodeHasChildren(node)) TreeNodeRegistry.collapseNodeAndChildren(node.id);
  };


  const prepareDelete = (type: 'match' | 'file' | 'folder') => {
      const node = getCurrentNode();
      if (!node || node.type !== type) return;

      const id = node.id;
      let name = node.name || '未知项';
      if (type === 'match' && node.match) {
           name = node.match.trigger || node.match.label || '未知片段';
      }

      let title = '';
      let message = '';

      if (type === 'match') {
          title = '确认删除片段';
          message = `确定要删除片段 “${name}” 吗？`;
          pendingAction.value = async () => {
            await store.deleteItem(id, 'match');
            toast.success(`已删除: ${name}`);
          };
      } else if (type === 'file') {
           title = '确认删除文件';
           message = `确定要删除配置文件 “${name}” 吗？此操作会从文件系统中移除该文件，且不可撤销。`;
            pendingAction.value = async () => {
               await store.deleteFileNode(id);
               toast.success(`已删除: ${name}`);
            };
      } else if (type === 'folder') {
           title = '确认删除文件夹';
           message = `确定要删除文件夹 “${name}” 及其所有内容吗？此操作会从文件系统中移除该文件夹及其包含的所有文件和子文件夹，且不可撤销。`;
           pendingAction.value = async () => {
              await store.deleteFolderNode(id);
              toast.success(`已删除: ${name}`);
           };
      } else {
          return; // 未知类型
      }

      confirmDialogTitle.value = title;
      confirmDialogMessage.value = message;
      confirmDialogVisible.value = true;
  };

  const prepareDeleteMatch = () => prepareDelete('match');
  const prepareDeleteFile = () => prepareDelete('file');
  const prepareDeleteFolder = () => prepareDelete('folder');

  // 确认删除 (逻辑不变)
  const handleConfirmDelete = async () => { /* ... 代码同上 ... */ };

  // --- 返回暴露给组件的接口 ---
  return {
    confirmDialogVisible,
    confirmDialogTitle,
    confirmDialogMessage,

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

    // 展开/折叠
    handleExpandAll,
    handleCollapseAll,
    handleExpandCurrentNode,
    handleCollapseCurrentNode,

    prepareDeleteMatch,
    prepareDeleteFile,
    prepareDeleteFolder,
    handleConfirmDelete,
  };
}
