import { ref, watch, computed } from 'vue';
import { useEspansoStore } from '@/store/useEspansoStore';
import { toast } from 'vue-sonner';
import ClipboardManager from '@/utils/ClipboardManager';
import TreeNodeRegistry from '@/utils/TreeNodeRegistry';
import type { TreeNodeItem } from '@/components/ConfigTree.vue';
import type { Match } from "@/types/espanso";
import { writeFile, serializeYaml } from '@/services/fileService';

// useContextMenu接收一个返回TreeNodeItem的函数或者固定的TreeNodeItem对象
export function useContextMenu(props: { node: TreeNodeItem | null } | { getNode: () => TreeNodeItem | null }) {
  const store = useEspansoStore();
  const confirmDialogVisible = ref(false);
  const confirmDialogTitle = ref('');
  const confirmDialogMessage = ref('');
  const pendingDeleteId = ref<string | null>(null);
  const pendingDeleteType = ref<'match' | 'group' | 'file' | 'folder' | null>(null);

  // 获取当前节点
  const getCurrentNode = (): TreeNodeItem | null => {
    if ('getNode' in props) {
      return props.getNode();
    } else {
      return props.node;
    }
  };

  // 节点是否有子节点
  const nodeHasChildren = (node?: TreeNodeItem | null): boolean => {
    if (!node) return false;

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
    const node = getCurrentNode();
    if (!node || !node.name) return;

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(node.name);
        toast.success('名称已复制到剪贴板');
      } catch (err) {
        console.error('Failed to copy node name:', err);
        toast.error('无法复制名称');
      }
    } else {
      toast.error('剪贴板不可用');
    }
  };

  // 复制节点路径
  const handleCopyNodePath = async () => {
    const node = getCurrentNode();
    if (!node) return;

    let pathToCopy = '';

    // 根据节点类型获取路径
    if (node.type === 'file' || node.type === 'folder') {
      // 文件或文件夹直接使用 path 属性
      pathToCopy = node.path || '';
    } else if (node.type === 'group') {
      // 分组使用 filePath 属性
      pathToCopy = node.group?.filePath || '';
    } else if (node.type === 'match') {
      // 片段使用 filePath 属性，并添加行号（如果有）
      pathToCopy = node.match?.filePath || '';

      // 如果是片段，尝试添加行号
      if (node.match?.lineNumber) {
        pathToCopy += `:${node.match.lineNumber}`;
      }
    }

    if (!pathToCopy) {
      toast.error('无法获取路径');
      return;
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(pathToCopy);
        toast.success('路径已复制到剪贴板');
      } catch (err) {
        console.error('Failed to copy node path:', err);
        toast.error('无法复制路径');
      }
    } else {
      toast.error('剪贴板不可用');
    }
  };

  // 复制项目
  const handleCopyItem = () => {
    const node = getCurrentNode();
    if (!node) return;

    console.log('复制项目:', node);
    if (node.type === 'match' && node.match) {
      ClipboardManager.copyItem(node.match);
      toast.success('片段已复制', { description: node.name });
    } else if (node.type === 'group' && node.group) {
      ClipboardManager.copyItem(node.group);
      toast.success('分组已复制', { description: node.name });
    }
  };

  // 剪切项目
  const handleCutItem = () => {
    const node = getCurrentNode();
    if (!node) return;

    console.log('剪切项目:', node);
    if (node.type === 'match' && node.match) {
      ClipboardManager.cutItem(node.match);
      toast.success('片段已剪切', { description: node.name });
    } else if (node.type === 'group' && node.group) {
      ClipboardManager.cutItem(node.group);
      toast.success('分组已剪切', { description: node.name });
    }
  };

  // 粘贴项目
  const handlePasteItem = () => {
    const node = getCurrentNode();
    if (!node) return;

    console.log('粘贴项目，目标节点:', node);
    const { item: clipboardItem, operation } = ClipboardManager.getItem();

    if (!clipboardItem) {
      toast.error('粘贴失败: 剪贴板为空');
      return;
    }

    let targetParentId: string | null = null;
    let targetFilePath: string | null = null;

    if (node.type === 'folder' || node.type === 'file' || node.type === 'group') {
      targetParentId = node.id;
    } else if (node.type === 'match') {
      const metadata = TreeNodeRegistry.getMetadata(node.id);
      targetParentId = metadata?.parentId || null;
      console.warn("Pasting relative to a match - parent determination might be incomplete.");
    }

    console.log(`Pasting item ${clipboardItem.id} (${clipboardItem.type}) into parent ${targetParentId || 'root?'}`);

    // 使用moveTreeItem来处理粘贴操作
    store.moveTreeItem(clipboardItem.id, 'clipboard', targetParentId, -1, 0);

    // Use appropriate display name based on type
    const displayName = clipboardItem.type === 'group'
      ? clipboardItem.name
      : (clipboardItem.label || clipboardItem.trigger || '未命名片段');

    toast.success(`粘贴成功: ${displayName}`);
    if (operation === 'cut') {
      ClipboardManager.clear();
    }
  };

  // 新建片段
  const handleCreateMatch = () => {
    const node = getCurrentNode();
    if (!node) return;

    let parentId: string | null = null;
    let targetFilePath: string | undefined = undefined;

    if (node.type === 'folder' || node.type === 'file' || node.type === 'group') {
      parentId = node.id;
      targetFilePath = (node.type === 'file' || node.type === 'folder') ? node.path : node.group?.filePath;
    } else if (node.type === 'match') {
      const metadata = TreeNodeRegistry.getMetadata(node.id);
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

  // 新建配置文件
  const handleCreateConfigFile = async () => {
    const node = getCurrentNode();
    if (!node || node.type !== 'folder') return;

    // 获取文件夹路径
    const folderPath = node.path;
    if (!folderPath) {
      toast.error('无法获取文件夹路径');
      return;
    }

    // 生成新文件名（使用时间戳避免重名）
    const timestamp = Date.now();
    const newFileName = `config_${timestamp}.yml`;
    const newFilePath = `${folderPath}/${newFileName}`;

    try {
      // 创建默认内容（包含一个默认片段）
      const defaultContent = {
        matches: [
          {
            trigger: ':hello',
            replace: 'Hello World!'
          }
        ]
      };

      // 序列化为YAML
      const yamlContent = await serializeYaml(defaultContent);

      // 写入文件
      await writeFile(newFilePath, yamlContent);

      // 重新加载配置以显示新文件
      if (store.state.configRootDir) {
        await store.loadConfig(store.state.configRootDir);
        toast.success(`配置文件 ${newFileName} 已创建`);
      } else {
        toast.error('无法重新加载配置');
      }
    } catch (error: any) {
      console.error('创建配置文件失败:', error);
      toast.error(`创建配置文件失败: ${error.message || '未知错误'}`);
    }
  };

  // 展开所有节点
  const handleExpandAll = () => {
    console.log('[ContextMenu] Expanding all nodes...');
    TreeNodeRegistry.expandAll();
  };

  // 收起所有节点
  const handleCollapseAll = () => {
    console.log('[ContextMenu] Collapsing all nodes...');
    TreeNodeRegistry.collapseAll();
  };

  // 展开当前节点及其子节点
  const handleExpandCurrentNode = () => {
    const node = getCurrentNode();
    if (!node || !nodeHasChildren(node)) return;
    console.log(`[ContextMenu] Expanding current node: ${node.id}`);
    TreeNodeRegistry.expandNodeAndChildren(node.id);
  };

  // 收起当前节点及其子节点
  const handleCollapseCurrentNode = () => {
    const node = getCurrentNode();
    if (!node || !nodeHasChildren(node)) return;
    console.log(`[ContextMenu] Collapsing current node: ${node.id}`);
    TreeNodeRegistry.collapseNodeAndChildren(node.id);
  };

  // 准备删除片段
  const prepareDeleteMatch = () => {
    const node = getCurrentNode();
    if (!node || node.type !== 'match' || !node.match?.id) return;

    pendingDeleteId.value = node.match.id;
    pendingDeleteType.value = 'match';
    confirmDialogTitle.value = '确认删除片段';
    confirmDialogMessage.value = `确定要删除片段 "${node.name}" 吗？`;
    confirmDialogVisible.value = true;
  };

  // 准备删除分组
  const prepareDeleteGroup = () => {
    const node = getCurrentNode();
    if (!node || node.type !== 'group' || !node.group?.id) return;

    pendingDeleteId.value = node.group.id;
    pendingDeleteType.value = 'group';
    confirmDialogTitle.value = '确认删除分组';
    confirmDialogMessage.value = `确定要删除分组 "${node.name}" 及其所有内容吗？此操作不可撤销。`;
    confirmDialogVisible.value = true;
  };

  // 确认删除后的处理
  const handleConfirmDelete = async () => {
    if (!pendingDeleteId.value || !pendingDeleteType.value || !getCurrentNode()) return;

    const type = pendingDeleteType.value;
    const id = pendingDeleteId.value;
    const nodeName = getCurrentNode()?.name;

    try {
      if (type === 'match' || type === 'group') {
        // 删除匹配项或分组
        await store.deleteItem(id, type);
        toast.success(`${type === 'match' ? '片段' : '分组'} "${nodeName}" 已删除`);
      } else if (type === 'file' || type === 'folder') {
        // 获取文件或文件夹的路径
        const node = type === getCurrentNode()?.type ? getCurrentNode() : null;
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
    nodeHasChildren: () => {
      const node = getCurrentNode();
      return nodeHasChildren(node);
    },
    handleCopyNodeName,
    handleCopyNodePath,
    handleCopyItem,
    handleCutItem,
    handlePasteItem,
    handleCreateMatch,
    handleCreateConfigFile,
    handleExpandAll,
    handleCollapseAll,
    handleExpandCurrentNode,
    handleCollapseCurrentNode,
    prepareDeleteMatch,
    prepareDeleteGroup,
    handleConfirmDelete
  };
}