<template>
  <ContextMenu @update:open="handleContextMenuUpdate">
    <ContextMenuTrigger asChild>
      <slot></slot>
    </ContextMenuTrigger>
    <ContextMenuContent class="min-w-[12rem]">
      <!-- 新建操作 -->
      <ContextMenuItem @select="handleCreateMatch" v-if="false">
        <component :is="icons.Plus" class="mr-2 h-4 w-4" />
        {{ t('contextMenu.newSnippet') }}
      </ContextMenuItem>
      <ContextMenuItem @select="handleCreateConfigFile">
        <component :is="icons.File" class="mr-2 h-4 w-4" />
        {{ t('contextMenu.newConfigFile') }}
      </ContextMenuItem>
      <ContextMenuItem @select="handleCreateFolder">
        <component :is="icons.FolderPlus" class="mr-2 h-4 w-4" />
        {{ t('contextMenu.newFolder') }}
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <!-- 展开/折叠操作 -->
      <ContextMenuItem @select="handleExpandAll">
        <component :is="icons.ChevronsDown" class="mr-2 h-4 w-4" />
        {{ t('contextMenu.expandAll') }}
      </ContextMenuItem>
      <ContextMenuItem @select="handleCollapseAll">
        <component :is="icons.ChevronsUp" class="mr-2 h-4 w-4" />
        {{ t('contextMenu.collapseAll') }}
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <!-- 浏览官方包（链接到Espanso Hub） -->
      <ContextMenuItem @select="handleOpenPackageHub">
        <component :is="icons.ExternalLink" class="mr-2 h-4 w-4" />
        {{ t('contextMenu.browseOfficialPackages') }}
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEspansoStore } from '@/store/useEspansoStore';
import TreeNodeRegistry from '@/utils/TreeNodeRegistry';
import ClipboardManager from '@/utils/ClipboardManager';
import { toast } from 'vue-sonner';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import * as platformService from '@/services/platformService';

// 导入图标
import {
  Plus as PlusIcon,
  File as FileIcon,
  FolderPlus as FolderPlusIcon,
  ChevronsDown as ChevronsDownIcon,
  ChevronsUp as ChevronsUpIcon,
  ExternalLink as ExternalLinkIcon,
} from 'lucide-vue-next';

// 图标集合
const icons = {
  Plus: PlusIcon,
  File: FileIcon,
  FolderPlus: FolderPlusIcon,
  ChevronsDown: ChevronsDownIcon,
  ChevronsUp: ChevronsUpIcon,
  ExternalLink: ExternalLinkIcon,
};

const { t } = useI18n();
const store = useEspansoStore();
const isContextMenuOpen = ref(false);

// 创建新片段
const handleCreateMatch = async () => {
  try {
    // 获取根目录
    const rootDir = store.state.configRootDir;
    if (!rootDir) {
      toast.error('未设置根目录');
      return;
    }
    
    // 确保match目录路径正确
    const matchDir = `${rootDir}/match`;
    
    // 检查match目录是否存在，不存在则创建
    const matchDirExists = await platformService.directoryExists(matchDir);
    if (!matchDirExists) {
      await platformService.createDirectory(matchDir);
      toast.success('已创建match目录');
    }
    
    // 检查是否存在配置文件，如果没有则创建一个默认的
    const configTree = store.state.configTree;
    let targetFileId = null;
    
    // 先尝试查找 base.yml 或其他已有配置文件
    for (const node of configTree) {
      if (node.type === 'folder' && node.name === 'match' && node.children && node.children.length > 0) {
        for (const file of node.children) {
          if (file.type === 'file') {
            targetFileId = file.id;
            break;
          }
        }
        if (targetFileId) break;
      }
    }
    
    // 如果没有找到配置文件，先创建一个
    if (!targetFileId) {
      // 使用base.yml作为默认配置文件名
      await store.createConfigFile(matchDir, 'base.yml');
      toast.success('已创建默认配置文件');
      
      // 重新加载配置以获取新文件的ID
      await store.loadConfig(rootDir);
      
      // 重新查找文件ID
      for (const node of store.state.configTree) {
        if (node.type === 'folder' && node.name === 'match' && node.children && node.children.length > 0) {
          for (const file of node.children) {
            if (file.type === 'file' && file.name === 'base.yml') {
              targetFileId = file.id;
              break;
            }
          }
          if (targetFileId) break;
        }
      }
    }
    
    if (!targetFileId) {
      toast.error('无法确定创建新片段的位置');
      return;
    }
    
    // 创建新片段
    const newMatchData = {
      trigger: ':new',
      replace: '新片段内容',
      label: '新片段',
    };
    
    const addedItem = await store.addItem(newMatchData, 'match', targetFileId, 0);
    if (addedItem) {
      toast.success('新片段已创建，请编辑触发词');
    } else {
      toast.error('创建新片段失败');
    }
  } catch (error: any) {
    console.error('创建片段失败:', error);
    toast.error(`创建片段失败: ${error.message || '未知错误'}`);
  }
};

// 创建新配置文件
const handleCreateConfigFile = async () => {
  try {
    const rootDir = store.state.configRootDir;
    if (!rootDir) {
      toast.error('未设置根目录');
      return;
    }
    
    // 创建唯一的文件名
    const timestamp = new Date().getTime();
    const newFileName = `${timestamp}_config.yml`;
    
    console.log(`准备创建配置文件, 文件名: ${newFileName}`);
    
    // 直接在match文件夹中创建文件（传null让store自行处理）
    const newFileId = await store.createConfigFile(null, newFileName);
    
    if (!newFileId) {
      console.error('创建文件返回ID为空');
      toast.error('创建文件失败');
      return;
    }
    
    toast.success(`配置文件 ${newFileName} 已创建`);
    
    // 选中新创建的文件
    store.selectItem(newFileId, 'file');
    
    // 延时后尝试触发重命名
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
    console.error('创建配置文件失败:', error);
    toast.error(`创建文件失败: ${error.message || '未知错误'}`);
  }
};

// 创建新文件夹
const handleCreateFolder = async () => {
  try {
    // 在根目录下创建新文件夹
    const rootDir = store.state.configRootDir;
    if (!rootDir) {
      toast.error('未设置根目录');
      return;
    }
    
    // 创建在match目录下，确保match目录存在
    const matchDir = `${rootDir}/match`;
    const matchDirExists = await platformService.directoryExists(matchDir);
    if (!matchDirExists) {
      await platformService.createDirectory(matchDir);
      toast.success('已创建match目录');
    }
    
    // 创建新文件夹名称并构建完整路径
    const timestamp = new Date().getTime();
    const newFolderName = `${timestamp}_folder`;
    const newFolderPath = `${matchDir}/${newFolderName}`;
    
    // 使用平台服务创建目录
    await platformService.createDirectory(newFolderPath);
    
    // 重新加载配置以显示新文件夹
    await store.loadConfig(rootDir);
    toast.success(`文件夹 ${newFolderName} 已创建`);
    
    // 查找新创建的文件夹节点ID
    let newFolderId = null;
    for (const node of store.state.configTree) {
      if (node.type === 'folder' && node.name === 'match') {
        // 在match文件夹的子节点中查找
        if (node.children) {
          for (const child of node.children) {
            if (child.type === 'folder' && child.path === newFolderPath) {
              newFolderId = child.id;
              break;
            }
          }
        }
      } else if (node.type === 'folder' && node.path === newFolderPath) {
        // 直接在根节点查找（如果match文件夹被展平）
        newFolderId = node.id;
      }
      
      if (newFolderId) break;
    }
    
    if (newFolderId) {
      // 选中新创建的文件夹
      store.selectItem(newFolderId, 'folder');
      
      // 延时触发重命名
      setTimeout(() => {
        const el = document.getElementById(`tree-node-${newFolderId}`)?.querySelector('.text-sm.font-medium.flex-grow');
        if (el instanceof HTMLElement) {
          console.log('找到文件夹名称元素，触发双击事件');
          try {
            el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
          } catch (err) {
            console.error('触发双击事件失败:', err);
          }
        } else {
          console.warn(`无法找到文件夹节点名称元素，ID: ${newFolderId}`);
        }
      }, 300);
    }
  } catch (error: any) {
    console.error('创建文件夹失败:', error);
    toast.error(`创建文件夹失败: ${error.message || '未知错误'}`);
  }
};

// 展开所有节点
const handleExpandAll = () => {
  TreeNodeRegistry.expandAll();
};

// 折叠所有节点
const handleCollapseAll = () => {
  TreeNodeRegistry.collapseAll();
};

// 打开Espanso官方包网站
const handleOpenPackageHub = () => {
  window.open('https://hub.espanso.org/', '_blank');
};

// 更新上下文菜单状态
const handleContextMenuUpdate = (open: boolean) => {
  isContextMenuOpen.value = open;
};
</script> 