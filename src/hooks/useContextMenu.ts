import { computed, ref } from 'vue';
import { useEspansoStore } from '@/store/useEspansoStore'; // 引入重构后的 Store
import { toast } from 'vue-sonner';
import ClipboardManager from '@/utils/ClipboardManager';
import TreeNodeRegistry from '@/utils/TreeNodeRegistry'; // 假设这个注册表仍然用于展开/折叠状态
import type { TreeNodeItem } from '@/components/ConfigTree.vue'; // 假设 TreeNodeItem 类型不变
import { findParentNodeInTree } from '@/utils/configTreeUtils';
// import type { Match, Group } from "@/types/core/espanso.types"; // 如果需要导入类型

// useContextMenu 接收一个返回 TreeNodeItem 的函数或固定的 TreeNodeItem 对象
export function useContextMenu(props: { node: TreeNodeItem | null } | { getNode: () => TreeNodeItem | null }) {
  const store = useEspansoStore(); // 使用重构后的 Store

  // --- 确认对话框状态 (保持不变) ---
  const confirmDialogVisible = ref(false);
  const confirmDialogTitle = ref('');
  const confirmDialogMessage = ref('');
  const pendingAction = ref<(() => Promise<void>) | null>(null); // 用于存储待确认的操作

  // --- 获取当前节点 (保持不变) ---
  const getCurrentNode = (): TreeNodeItem | null => {
    if ('getNode' in props) {
      return props.getNode();
    } else {
      return props.node;
    }
  };

  // --- 节点是否有子节点 (需要适配新的 Tree 结构判断方式) ---
  // 这个逻辑可能需要调整，取决于 TreeNodeItem 的结构是否改变，
  // 以及我们如何判断 Group/Folder/File 是否真的有"可视"子项
  const nodeHasChildren = (node?: TreeNodeItem | null): boolean => {
    if (!node) return false;
    // 示例：根据 TreeNodeItem 的结构判断
    if (node.type === 'folder' || node.type === 'file') {
        // 检查 store.configTree 中对应节点的 children 或 matches/groups 数量?
        // 或者依赖 TreeNode 组件自己维护的 isLeaf 属性?
        // 暂时简化为检查 node 对象上是否有 children 属性且非空
        return !!(node.children && node.children.length > 0);
    } else if (node.type === 'group' && node.group) {
         // 直接检查 group 对象
        return !!(
            (node.group.matches && node.group.matches.length > 0) ||
            (node.group.groups && node.group.groups.length > 0)
        );
    }
    return false; // Match 节点没有子节点
  };

  // --- 基础操作 (基本不变，只复制文本) ---
  const handleCopyNodePath = async () => {
    const node = getCurrentNode();
    if (!node) return;
    let pathToCopy = '';
    // 根据节点类型获取路径 (逻辑基本不变)
    if (node.type === 'file' || node.type === 'folder') {
      pathToCopy = node.path || '';
    } else if (node.type === 'group' && node.group?.filePath) {
      pathToCopy = node.group.filePath;
    } else if (node.type === 'match' && node.match?.filePath) {
      pathToCopy = node.match.filePath;
      // if (node.match.lineNumber) { // 行号逻辑保持不变
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

  // --- 剪贴板操作 (逻辑不变，只操作 ClipboardManager) ---
  const handleCopyItem = () => {
    const node = getCurrentNode();
    if (!node) return;
    const item = node.match ?? node.group; // 获取 Match 或 Group 对象
    if (item) {
      ClipboardManager.copyItem(item);
      // 使用触发词作为名称
      const itemName = node.type === 'match' ? 
        (item.trigger || item.label || '片段') : 
        (item.name || '分组');
      toast.success(`已复制: ${itemName}`);
    } else {
      toast.error('无法复制此项目');
    }
  };

  const handleCutItem = () => {
    const node = getCurrentNode();
    if (!node) return;
    const item = node.match ?? node.group;
    if (item) {
      ClipboardManager.cutItem(item);
      // 使用触发词作为名称
      const itemName = node.type === 'match' ? 
        (item.trigger || item.label || '片段') : 
        (item.name || '分组');
      toast.success(`已剪切: ${itemName}`);
    } else {
       toast.error('无法剪切此项目');
    }
  };

  // --- 粘贴操作 (调用 Store Action) ---
  const handlePasteItem = async () => {
    const targetNode = getCurrentNode(); // 粘贴的目标位置节点
    if (!targetNode) {
        toast.error("请先选择粘贴位置");
        return;
    }

    const { item: clipboardItem, operation } = ClipboardManager.getItem();
    if (!clipboardItem) {
      toast.error('剪贴板为空');
      return;
    }

    // 确定粘贴的目标父节点 ID
    let targetParentId: string | null = null;
    // 查找当前节点在其父节点子列表中的索引位置
    let currentIndex: number = -1;
    
    if (targetNode.type === 'file' || targetNode.type === 'folder' || targetNode.type === 'group') {
        // 如果目标是文件、文件夹或分组，它们可以作为父节点
        targetParentId = targetNode.id;
        // 文件、文件夹或分组作为父节点时，新项目插入为第一个子项
        currentIndex = 0; // 添加到顶部
    } else if (targetNode.type === 'match') {
        // 如果目标是片段，则粘贴到该片段的父节点（分组或文件）下
        const parentNode = findParentNodeInTree(store.state.configTree, targetNode.id);
        if (parentNode) {
            targetParentId = parentNode.id;
            
            // 查找当前match节点在父节点children中的索引
            let siblings: any[] = [];
            if (parentNode.type === 'file' && parentNode.matches) {
                siblings = parentNode.matches;
            } else if (parentNode.type === 'group' && parentNode.matches) {
                siblings = parentNode.matches;
            } else if (parentNode.type === 'folder' && parentNode.children) {
                siblings = parentNode.children;
            }
            
            // 查找当前节点的索引
            currentIndex = siblings.findIndex(item => item.id === targetNode.id);
            if (currentIndex !== -1) {
                // 找到索引后，将粘贴位置设为当前索引+1(紧跟在当前节点后面)
                currentIndex += 1;
            }
        }
    }

    console.log(`[ContextMenu] 准备粘贴 ${clipboardItem.type} (${clipboardItem.id}) 到父节点 ${targetParentId} 的位置 ${currentIndex}`);

    // 调用store的pasteItem函数，让它处理默认节点的查找
    try {
        // 传递当前索引作为插入位置，使新项目插入到当前选中节点的后面
        await store.pasteItem(targetParentId, currentIndex);
        // 使用触发词作为名称
        const itemName = clipboardItem.type === 'match' ? 
          (clipboardItem.trigger || clipboardItem.label || clipboardItem.id) : 
          (clipboardItem.name || clipboardItem.id);
        toast.success(`已粘贴: ${itemName}`);
    } catch (error: any) {
        console.error("粘贴失败:", error);
        toast.error(`粘贴失败: ${error.message || '未知错误'}`);
    }
  };


  // --- 创建操作 (调用 Store Action) ---
  const handleCreateMatch = async () => {
      const targetNode = getCurrentNode(); // 创建的位置依据
      if (!targetNode) {
          toast.error("请选择创建新片段的位置");
          return;
      }

      let targetParentId: string | null = null;
      // 与粘贴逻辑类似，确定父节点 ID
      if (targetNode.type === 'file' || targetNode.type === 'folder' || targetNode.type === 'group') {
          targetParentId = targetNode.id;
           // 注意：如果目标是 Folder， store.addItem 需要知道如何处理这种情况
           // （例如添加到该文件夹下的默认文件，或不允许直接在文件夹下创建 Match）
           if (targetNode.type === 'folder') {
               console.warn("直接在文件夹下创建片段，具体行为依赖 store.addItem 实现");
           }
      } else if (targetNode.type === 'match') {
           const parentNode = findParentNodeInTree(store.state.configTree, targetNode.id);
           if (parentNode) {
               targetParentId = parentNode.id;
           }
      }

      console.log(`[ContextMenu] 准备在父节点 ${targetParentId} 下创建新片段`);

      // 准备新 Match 的基础数据 (不含 id, filePath 等，由 store.addItem 处理)
      const newMatchData = {
          trigger: ':new',
          replace: '新片段内容',
          label: '新片段标签',
      };

      // **调用重构后的 store action**
      try {
          const addedItem = await store.addItem(newMatchData, 'match', targetParentId);
          if (addedItem) {
              toast.success('新片段已创建');
              // store action 应该已经处理了选中新项
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

      const newFileName = `new_config_${Date.now()}.yml`; // 生成唯一文件名
      console.log(`[ContextMenu] 准备在 ${folderPath} 下创建配置文件 ${newFileName}`);

      // **调用重构后的 store action**
      try {
          await store.createConfigFile(folderPath, newFileName);
          // store action 内部应该处理文件创建和刷新 configTree
          toast.success(`配置文件 ${newFileName} 已创建`);
      } catch (error: any) {
          console.error("创建配置文件失败:", error);
          toast.error(`创建配置文件失败: ${error.message || '未知错误'}`);
      }
  };


  // --- 展开/折叠操作 (假设 TreeNodeRegistry 仍然使用) ---
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


  // --- 删除操作 (准备确认对话框，确认后调用 Store Action) ---
  const prepareDelete = (type: 'match' | 'group' | 'file' | 'folder') => {
      const node = getCurrentNode();
      if (!node || node.type !== type) return;

      const id = node.id;
      // 根据节点类型获取适当的名称
      let name = '';
      if (type === 'match' && node.match) {
          name = node.match.trigger || node.match.label || '未知片段';
      } else if (type === 'group' && node.group) {
          name = node.group.name || '未知分组';
      } else {
          name = node.name || '未知项';
      }
      
      let title = '';
      let message = '';

      if (type === 'match') {
          title = '确认删除片段';
          message = `确定要删除片段 "${name}" 吗？`;
          pendingAction.value = async () => {
            await store.deleteItem(id, 'match');
            toast.success(`已删除: ${name}`);
          };
      } else if (type === 'group') {
           title = '确认删除分组';
           message = `确定要删除分组 "${name}" 及其所有内容吗？此操作不可撤销。`;
           pendingAction.value = async () => {
             await store.deleteItem(id, 'group');
             toast.success(`已删除: ${name}`);
           };
      } else if (type === 'file') {
           title = '确认删除文件';
           message = `确定要删除配置文件 "${name}" 吗？此操作会从文件系统中移除该文件，且不可撤销。`;
           pendingAction.value = async () => {
             await store.deleteFileNode(id);
             toast.success(`已删除: ${name}`);
           };
      } else if (type === 'folder') {
           title = '确认删除文件夹';
           message = `确定要删除文件夹 "${name}" 及其所有内容吗？此操作会从文件系统中移除该文件夹及其包含的所有文件和子文件夹，且不可撤销。`;
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
  const prepareDeleteGroup = () => prepareDelete('group');
  const prepareDeleteFile = () => prepareDelete('file'); // 新增
  const prepareDeleteFolder = () => prepareDelete('folder'); // 新增

  // 确认删除
  const handleConfirmDelete = async () => {
    if (pendingAction.value) {
      try {
        await pendingAction.value(); // 执行存储的 Store Action 调用
        // toast 消息应由 Store Action 成功时触发，或在这里根据结果触发
        // toast.success("删除成功"); // 可以在 store action 内部处理反馈
      } catch (error: any) {
        console.error("确认删除时发生错误:", error);
        toast.error(`删除失败: ${error.message || '未知错误'}`);
      } finally {
        confirmDialogVisible.value = false;
        pendingAction.value = null;
      }
    }
  };

  return {
    store, // 可能不需要直接暴露 store
    confirmDialogVisible,
    confirmDialogTitle,
    confirmDialogMessage,
    // pendingAction, // 内部状态，不暴露

    // 计算属性
    isFolder: computed(() => getCurrentNode()?.type === 'folder'),
    isFile: computed(() => getCurrentNode()?.type === 'file'),
    isGroup: computed(() => getCurrentNode()?.type === 'group'),
    isMatch: computed(() => getCurrentNode()?.type === 'match'),
    canPaste: computed(() => {
      const node = getCurrentNode();
      // 文件夹类型不支持粘贴操作
      if (node?.type === 'folder') return false;
      return ClipboardManager.hasItem(); 
    }),
    currentNodeHasChildren: computed(() => nodeHasChildren(getCurrentNode())),

    // 基础操作
    handleCopyNodePath,

    // 剪贴板操作
    handleCopyItem,
    handleCutItem,
    handlePasteItem,

    // 创建操作
    handleCreateMatch,
    handleCreateConfigFile,

    // 展开/折叠
    handleExpandAll,
    handleCollapseAll,
    handleExpandCurrentNode,
    handleCollapseCurrentNode,

    // 删除操作
    prepareDeleteMatch,
    prepareDeleteGroup,
    prepareDeleteFile,
    prepareDeleteFolder,
    handleConfirmDelete, // 暴露给对话框组件使用
  };
}
