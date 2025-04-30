<template>
  <div class="tree-node px-0 pl-0">
    <!-- 非叶子节点（文件夹、文件、分组） -->
    <div
      v-if="node.type !== 'match'"
      :class="node.type + '-node'"
      @click="toggleFolder"
    >
      <div
        class="flex items-center w-full cursor-pointer px-0 py-1 rounded"
        :class="{
          'bg-primary text-primary-foreground': isSelected,
          'hover:bg-accent hover:text-accent-foreground': !isSelected
        }"
      >
        <span class="mr-1 text-muted-foreground" v-if="hasChildren">
          <ChevronRightIcon v-if="!isOpen" class="h-4 w-4" />
          <ChevronDownIcon v-else class="h-4 w-4" />
        </span>
        <span class="mr-1 text-muted-foreground" v-else>
          <span class="w-4 inline-block"></span>
        </span>
        <span class="text-sm font-medium">{{ node.name }}</span>
        <span v-if="childCount > 0" class="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
          {{ childCount }}
        </span>
      </div>
    </div>

    <!-- 匹配项节点 -->
    <div
      v-else-if="node.type === 'match'"
      class="match-node"
      @click="selectNode"
    >
      <div
        class="flex items-center w-full cursor-pointer px-0 py-1 rounded group"
        :class="{ 'bg-primary text-primary-foreground': isSelected, 'hover:bg-accent hover:text-accent-foreground': !isSelected }"
      >
        <span class="w-4 inline-block"></span>
        <ZapIcon class="h-4 w-4 mr-1 text-blue-500" />
        <span class="text-sm">{{ node.name }}</span>

        <!-- 描述信息 -->
        <div v-if="node.match?.description" class="ml-auto flex-1 text-right">
          <span
            class="text-xs text-muted-foreground truncate max-w-[200px] inline-block"
            :title="node.match.description"
          >
            {{ node.match.description }}
          </span>
        </div>
      </div>
    </div>

    <!-- 子节点 -->
    <div v-if="hasChildren && isOpen" class="children pl-4 pr-0">
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue';
import { ChevronRightIcon, ChevronDownIcon, ZapIcon } from 'lucide-vue-next';
import type { TreeNodeItem } from './ConfigTree.vue';

const props = defineProps<{
  node: TreeNodeItem;
  selectedId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'select', node: TreeNodeItem): void;
}>();

// 默认展开所有节点
const isOpen = ref(true);

// 切换文件夹展开/折叠状态
const toggleFolder = () => {
  isOpen.value = !isOpen.value;
  console.log(`切换节点 ${props.node.name} 的展开状态:`, isOpen.value);
};

const selectNode = () => {
  console.log('选择节点:', props.node);
  emit('select', props.node);
};

const isSelected = computed(() => {
  return props.node.id === props.selectedId;
});

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0;
});

// 移除未使用的 isRootFolder 计算属性

const childCount = computed(() => {
  if (!props.node.children) return 0;

  if (props.node.type === 'folder' || props.node.type === 'file') {
    // 递归计算所有匹配项的数量
    let count = 0;
    const countItems = (nodes: TreeNodeItem[]) => {
      for (const node of nodes) {
        if (node.type === 'match') {
          count++;
        } else if (node.children) {
          countItems(node.children);
        }
      }
    };
    countItems(props.node.children);
    return count;
  } else if (props.node.type === 'group') {
    // 只计算直接子节点中的匹配项数量
    return props.node.children.filter(child => child.type === 'match').length;
  }

  return 0;
});

// 移除未使用的 getIconClass 计算属性
</script>

<style scoped>
.tree-node {
  margin-bottom: 0.25rem;
  width: 100%;
}

.children {
  margin-top: 0.25rem;
  width: 100%;
}

/* 确保所有节点内容占据整行 */
.folder-node, .file-node, .group-node, .match-node {
  width: 100%;
}

/* 描述文本溢出处理 */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
