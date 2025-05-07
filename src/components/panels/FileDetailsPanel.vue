<template>
  <div class="file-details-panel">
    <div v-if="!node" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
      <div class="text-5xl mb-4">👈</div>
      <h4 class="text-xl font-semibold text-foreground m-0 mb-2">{{ t('common.noSelection') }}</h4>
      <p class="m-0 max-w-md">{{ t('common.selectFromListDetails') }}</p>
    </div>
    
    <div v-else class="space-y-6">
      <!-- 标题 -->
      <div class="flex items-center">
        <div v-if="node.type === 'file'" class="mr-2">
          <FileIcon class="h-6 w-6 text-muted-foreground" />
        </div>
        <div v-else-if="node.type === 'folder'" class="mr-2">
          <FolderIcon class="h-6 w-6 text-primary" />
        </div>
        <h3 class="text-xl font-semibold">{{ node.name }}</h3>
      </div>
      
      <!-- 详细信息 -->
      <div class="space-y-4">
        <!-- 路径 -->
        <div class="space-y-1">
          <h4 class="text-sm font-medium text-muted-foreground">{{ t('fileDetails.path') }}</h4>
          <div class="p-2 bg-muted/50 rounded-md text-sm font-mono overflow-x-auto">
            {{ node.path }}
          </div>
        </div>
        
        <!-- 类型 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <h4 class="text-sm font-medium text-muted-foreground">{{ t('fileDetails.type') }}</h4>
            <div class="p-2 bg-muted/50 rounded-md text-sm">
              {{ getTypeLabel(node) }}
            </div>
          </div>
          
          <!-- 片段数量 -->
          <div class="space-y-1">
            <h4 class="text-sm font-medium text-muted-foreground">{{ t('fileDetails.snippetsCount') }}</h4>
            <div class="p-2 bg-muted/50 rounded-md text-sm font-medium">
              {{ getSnippetsCount(node) }} {{ t('fileDetails.snippets') }}
            </div>
          </div>
        </div>
        
        <!-- 最近更新时间 -->
        <div class="space-y-1">
          <h4 class="text-sm font-medium text-muted-foreground">{{ t('fileDetails.lastUpdated') }}</h4>
          <div class="p-2 bg-muted/50 rounded-md text-sm">
            {{ getLastUpdatedTime(node) }}
          </div>
        </div>
        
        <!-- 文件夹特有信息 -->
        <div v-if="node.type === 'folder' && node.children" class="space-y-1">
          <h4 class="text-sm font-medium text-muted-foreground">{{ t('fileDetails.containsFiles') }}</h4>
          <div class="p-2 bg-muted/50 rounded-md text-sm">
            {{ getFileCount(node) }} {{ t('fileDetails.files') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { FolderIcon, FileIcon } from 'lucide-vue-next';
import type { ConfigTreeNode, ConfigFileNode, ConfigFolderNode } from '@/types/core/ui.types';
import type { Match } from '@/types/core/espanso.types';

const { t } = useI18n();

const props = defineProps<{
  node: ConfigTreeNode | null;
}>();

// 获取节点类型标签
const getTypeLabel = (node: ConfigTreeNode) => {
  if (node.type === 'file') {
    const fileNode = node as ConfigFileNode;
    return fileNode.fileType === 'match' 
      ? t('fileDetails.matchFile') 
      : fileNode.fileType === 'config' 
        ? t('fileDetails.configFile') 
        : t('fileDetails.packageFile');
  } else if (node.type === 'folder') {
    return t('fileDetails.folder');
  }
  return t('fileDetails.unknown');
};

// 获取片段数量
const getSnippetsCount = (node: ConfigTreeNode): number => {
  if (node.type === 'file') {
    const fileNode = node as ConfigFileNode;
    return fileNode.matches?.length || 0;
  } else if (node.type === 'folder') {
    const folderNode = node as ConfigFolderNode;
    let count = 0;
    
    if (folderNode.children) {
      for (const child of folderNode.children) {
        count += getSnippetsCount(child);
      }
    }
    
    return count;
  }
  
  return 0;
};

// 获取最近更新时间
const getLastUpdatedTime = (node: ConfigTreeNode): string => {
  if (node.type === 'file') {
    const fileNode = node as ConfigFileNode;
    if (!fileNode.matches || fileNode.matches.length === 0) {
      return t('fileDetails.never');
    }
    
    // 找出最近的更新时间
    let latestTime = new Date(0); // 初始为最早的时间
    
    for (const match of fileNode.matches) {
      if (match.updatedAt) {
        const updateTime = new Date(match.updatedAt);
        if (updateTime > latestTime) {
          latestTime = updateTime;
        }
      }
    }
    
    if (latestTime.getTime() === 0) {
      return t('fileDetails.never');
    }
    
    return latestTime.toLocaleString();
  } else if (node.type === 'folder') {
    const folderNode = node as ConfigFolderNode;
    if (!folderNode.children || folderNode.children.length === 0) {
      return t('fileDetails.never');
    }
    
    // 递归查找所有子节点中最近的更新时间
    let latestTime = new Date(0);
    
    for (const child of folderNode.children) {
      const childTimeStr = getLastUpdatedTime(child);
      if (childTimeStr !== t('fileDetails.never')) {
        try {
          const childTime = new Date(childTimeStr);
          if (childTime > latestTime) {
            latestTime = childTime;
          }
        } catch (e) {
          console.error('Failed to parse date:', childTimeStr, e);
        }
      }
    }
    
    if (latestTime.getTime() === 0) {
      return t('fileDetails.never');
    }
    
    return latestTime.toLocaleString();
  }
  
  return t('fileDetails.never');
};

// 获取文件夹中的文件数量
const getFileCount = (node: ConfigTreeNode): number => {
  if (node.type !== 'folder' || !node.children) return 0;
  
  let count = 0;
  for (const child of node.children) {
    if (child.type === 'file') {
      count++;
    } else if (child.type === 'folder') {
      count += getFileCount(child);
    }
  }
  
  return count;
};
</script>

<style scoped>
.file-details-panel {
  height: 100%;
  padding: 1rem;
}
</style> 