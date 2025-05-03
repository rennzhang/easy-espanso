import { ref } from 'vue';
import { useEspansoStore } from '@/store/useEspansoStore';
import { toast } from 'vue-sonner';
import ClipboardManager from '@/utils/ClipboardManager';
import TreeNodeRegistry from '@/utils/TreeNodeRegistry';
import type { TreeNodeItem } from '@/components/ConfigTree.vue';
import type { Match, Group } from "@/types/espanso";

export function useContextMenu(props: { node: TreeNodeItem }) {
  const store = useEspansoStore();
  const confirmDialogVisible = ref(false);
  const confirmDialogTitle = ref('');
  const confirmDialogMessage = ref('');
  const pendingDeleteId = ref<string | null>(null);
  const pendingDeleteType = ref<'match' | 'group' | 'file' | 'folder' | null>(null);

  // 节点是否有子节点
  const nodeHasChildren = (node: TreeNodeItem): boolean => {
    if (node.type === 'file' || node.type === 'folder') {
      return !!(node.children && node.children.length > 0);
    } else if (node.type === 'group') {
      return !!((node.group?.matches && node.group.matches.length > 0) || 
             (node.group?.groups && node.group.groups.length > 0));
    }
    return false;
  };

  // 复制节点名称
  const handleCopyNodeName = async () => {
    if (!props.node.name) return;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(props.node.name);
        toast.success('名称已复制到剪贴板');
      } catch (err) {
        console.error('Failed to copy node name:', err);
        toast.error('无法复制名称');
      }
    } else {
      toast.error('剪贴板不可用');
    }
  };

  // 复制项目
  const handleCopyItem = () => {
    if (props.node.type === 'match' && props.node.match) {
      ClipboardManager.copyItem(props.node.match);
      toast.success('片段已复制', { description: props.node.name });
    } else if (props.node.type === 'group' && props.node.group) {
      ClipboardManager.copyItem(props.node.group);
      toast.success('分组已复制', { description: props.node.name });
    }
  };

  // 剪切项目
  const handleCutItem = () => {
    if (props.node.type === 'match' && props.node.match) {
      ClipboardManager.cutItem(props.node.match); 
      toast.success('片段已剪切', { description: props.node.name });
    } else if (props.node.type === 'group' && props.node.group) {
      ClipboardManager.cutItem(props.node.group); 
      toast.success('分组已剪切', { description: props.node.name });
    }
  };

  // 粘贴项目
  const handlePasteItem = () => {
    const { item: clipboardItem, operation } = ClipboardManager.getItem();

    if (!clipboardItem) {
      toast.error('粘贴失败: 剪贴板为空');
      return;
    }

    let targetParentId: string | null = null;
    let targetFilePath: string | null = null;

    if (props.node.type === 'folder' || props.node.type === 'file' || props.node.type === 'group') {
      targetParentId = props.node.id;
    } else if (props.node.type === 'match') {
      const metadata = TreeNodeRegistry.getMetadata(props.node.id);
      targetParentId = metadata?.parentId || null;
      console.warn("Pasting relative to a match - parent determination might be incomplete.");
    }

    console.log(`Pasting item ${clipboardItem.id} (${clipboardItem.type}) into parent ${targetParentId || 'root?'}`);

    store.moveTreeItem(clipboardItem.id, operation === 'cut' ? 'clipboard' : null, targetParentId, -1, 0);

    toast.success(`粘贴成功: ${clipboardItem.name}`);
    if (operation === 'cut') { 
      ClipboardManager.clear();
    } 
  };

  // 新建片段
  const handleCreateMatch = () => {
    let parentId: string | null = null;
    let targetFilePath: string | undefined = undefined;

    if (props.node.type === 'folder' || props.node.type === 'file' || props.node.type === 'group') {
      parentId = props.node.id;
      targetFilePath = (props.node.type === 'file' || props.node.type === 'folder') ? props.node.path : props.node.group?.filePath;
    } else if (props.node.type === 'match') {
      const metadata = TreeNodeRegistry.getMetadata(props.node.id);
      parentId = metadata?.parentId || null;
      if (parentId) {
        const parentMetadata = TreeNodeRegistry.getMetadata(parentId);
        targetFilePath = parentMetadata?.filePath;
      }
    }

    if (targetFilePath === undefined) {
      targetFilePath = store.state.configPath || 'config/default.yml';
      console.warn(`[ContextMenu] Could not determine target file path for new match, using default: ${targetFilePath}`);
    }

    const newMatch: Match = {
      id: `match-${Date.now()}`,
      type: 'match', 
      trigger: ':new', 
      replace: '新片段', 
      filePath: targetFilePath
    };
    
    store.addItem(newMatch);
    toast.success('新片段已创建');
  };

  // 新建分组
  const handleCreateGroup = () => {
    let parentId: string | null = null;
    let targetFilePath: string | undefined = undefined;

    if (props.node.type === 'folder' || props.node.type === 'file' || props.node.type === 'group') {
      parentId = props.node.id;
      targetFilePath = (props.node.type === 'file' || props.node.type === 'folder') ? props.node.path : props.node.group?.filePath;
    } else if (props.node.type === 'match') {
      const metadata = TreeNodeRegistry.getMetadata(props.node.id);
      parentId = metadata?.parentId || null;
      if (parentId) {
        const parentMetadata = TreeNodeRegistry.getMetadata(parentId);
        targetFilePath = parentMetadata?.filePath;
      }
    }

    if (targetFilePath === undefined) {
      targetFilePath = store.state.configPath || 'config/default.yml';
      console.warn(`[ContextMenu] Could not determine target file path for new group, using default: ${targetFilePath}`);
    }

    const newGroup: Group = {
      id: `group-${Date.now()}`,
      type: 'group', 
      name: '新分组', 
      matches: [], 
      groups: [], 
      filePath: targetFilePath
    };
    
    store.addItem(newGroup);
    toast.success('新分组已创建');
  };

  // 展开所有节点
  const handleExpandAll = () => {
    console.log('[ContextMenu] Expanding all nodes...');
    TreeNodeRegistry.expandAll();
    toast.success('已展开所有节点');
  };

  // 收起所有节点
  const handleCollapseAll = () => {
    console.log('[ContextMenu] Collapsing all nodes...');
    TreeNodeRegistry.collapseAll();
    toast.success('已收起所有节点');
  };

  // 展开当前节点及其子节点
  const handleExpandCurrentNode = () => {
    if (!nodeHasChildren(props.node)) return;
    console.log(`[ContextMenu] Expanding current node: ${props.node.id}`);
    TreeNodeRegistry.expandNodeAndChildren(props.node.id);
    toast.success('已展开当前节点');
  };

  // 收起当前节点及其子节点
  const handleCollapseCurrentNode = () => {
    if (!nodeHasChildren(props.node)) return;
    console.log(`[ContextMenu] Collapsing current node: ${props.node.id}`);
    TreeNodeRegistry.collapseNodeAndChildren(props.node.id);
    toast.success('已收起当前节点');
  };

  // 准备删除片段
  const prepareDeleteMatch = () => {
    if (props.node.type === 'match' && props.node.match?.id) {
      pendingDeleteId.value = props.node.match.id;
      pendingDeleteType.value = 'match';
      confirmDialogTitle.value = '确认删除片段';
      confirmDialogMessage.value = `确定要删除片段 "${props.node.name}" 吗？`;
      confirmDialogVisible.value = true;
    }
  };

  // 准备删除分组
  const prepareDeleteGroup = () => {
    if (props.node.type === 'group' && props.node.group?.id) {
      pendingDeleteId.value = props.node.group.id;
      pendingDeleteType.value = 'group';
      confirmDialogTitle.value = '确认删除分组';
      confirmDialogMessage.value = `确定要删除分组 "${props.node.name}" 及其所有内容吗？此操作不可撤销。`;
      confirmDialogVisible.value = true;
    }
  };

  // 确认删除后的处理
  const handleConfirmDelete = async () => {
    if (!pendingDeleteId.value || !pendingDeleteType.value) return;

    const type = pendingDeleteType.value;
    const id = pendingDeleteId.value;
    const nodeName = props.node.name;
    
    try {
      if (type === 'match' || type === 'group') {
        // 删除匹配项或分组
        await store.deleteItem(id, type);
        toast.success(`${type === 'match' ? '片段' : '分组'} "${nodeName}" 已删除`);
      } else if (type === 'file' || type === 'folder') {
        // 获取文件或文件夹的路径
        const node = props.node.type === type ? props.node : null;
        if (!node || !node.path) {
          toast.error(`无法删除${type === 'file' ? '文件' : '文件夹'}: 找不到路径`);
          return;
        }
        
        const filePath = node.path;
        console.log(`尝试删除文件系统中的${type}: ${filePath}`);

        // 先从树结构中移除节点
        if (store.moveTreeNode) {
          await store.moveTreeNode(id, null, -1);
        }
        
        // 然后通过preloadApi删除实际文件
        if (window.preloadApi) {
          try {
            let deletionSuccessful = false;
            
            if (type === 'file') {
              // 删除文件
              const api = window.preloadApi as any;
              if (api.deleteFile) {
                await api.deleteFile(filePath);
                deletionSuccessful = true;
                toast.success('文件已删除');
              } else {
                console.error('preloadApi.deleteFile 不可用');
                toast.error('删除文件功能不可用');
              }
            } else if (type === 'folder') {
              // 删除文件夹
              const api = window.preloadApi as any;
              if (api.removeDirectory) {
                await api.removeDirectory(filePath);
                deletionSuccessful = true;
                toast.success('文件夹已删除');
              } else {
                console.error('preloadApi.removeDirectory 不可用');
                toast.error('删除文件夹功能不可用');
              }
            }
            
            // 如果删除成功，重新加载配置或触发界面刷新
            if (deletionSuccessful) {
              // 尝试获取当前加载的配置根目录
              const configRootDir = store.state.configRootDir;
              if (configRootDir) {
                // 重新加载整个配置树以刷新UI
                await store.loadConfig(configRootDir);
                console.log('配置已重新加载，UI将更新');
              } else {
                console.warn('无法获取当前配置根目录，无法自动刷新');
                toast.info('请手动刷新列表以查看更新');
              }
            }
          } catch (error) {
            console.error(`删除文件系统中的${type}失败:`, error);
            toast.error(`删除失败: ${error}`);
          }
        } else {
          console.error('preloadApi 不可用，无法删除文件系统中的文件');
          toast.error('文件系统操作不可用');
        }
      }
    } catch (error) {
      console.error(`删除${pendingDeleteType.value}失败:`, error);
      toast.error(`删除失败: ${error}`);
    } finally {
      // 重置状态
      pendingDeleteId.value = null;
      pendingDeleteType.value = null;
      confirmDialogVisible.value = false;
    }
  };

  return {
    store,
    confirmDialogVisible,
    confirmDialogTitle,
    confirmDialogMessage,
    pendingDeleteId,
    pendingDeleteType,
    nodeHasChildren: () => nodeHasChildren(props.node),
    handleCopyNodeName,
    handleCopyItem,
    handleCutItem,
    handlePasteItem,
    handleCreateMatch,
    handleCreateGroup,
    handleExpandAll,
    handleCollapseAll,
    handleExpandCurrentNode,
    handleCollapseCurrentNode,
    prepareDeleteMatch,
    prepareDeleteGroup,
    handleConfirmDelete
  };
} 