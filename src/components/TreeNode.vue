<template>
  <div class="tree-node px-0 pl-0" v-if="isVisible">
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
        <span class="text-sm font-medium">
          <HighlightText v-if="searchQuery" :text="node.name" :searchQuery="searchQuery" />
          <template v-else>{{ node.name }}</template>
        </span>
        <span v-if="visibleChildCount > 0" class="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
          {{ visibleChildCount }}
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
        <span class="text-sm">
          <HighlightText v-if="searchQuery" :text="node.name" :searchQuery="searchQuery" />
          <template v-else>{{ node.name }}</template>
        </span>

        <!-- 描述信息 -->
        <div v-if="node.match?.description" class="ml-auto flex-1 text-right">
          <span
            class="text-xs text-muted-foreground truncate max-w-[200px] inline-block"
            :title="node.match.description"
          >
            <HighlightText v-if="searchQuery" :text="node.match.description" :searchQuery="searchQuery" />
            <template v-else>{{ node.match.description }}</template>
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
        :searchQuery="searchQuery"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch } from 'vue';
import { ChevronRightIcon, ChevronDownIcon, ZapIcon } from 'lucide-vue-next';
import type { TreeNodeItem } from './ConfigTree.vue';
import HighlightText from './common/HighlightText.vue';

const props = defineProps<{
  node: TreeNodeItem;
  selectedId?: string | null;
  searchQuery?: string;
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

// Helper function to check if a string matches the query regex
const checkMatch = (text: string | undefined | null, regex: RegExp): boolean => {
  return text ? regex.test(text) : false;
};

// Computed: Check if this node's own data matches the search query
const selfMatchesSearch = computed(() => {
  const query = props.searchQuery?.trim();
  if (!query) return false;

  try {
    const regex = new RegExp(query, 'i'); // Case-insensitive regex

    // Check node name (for folders, files, groups)
    if (checkMatch(props.node.name, regex)) {
      return true;
    }

    // Check match-specific fields
    if (props.node.type === 'match' && props.node.match) {
      const match = props.node.match;
      if (
        checkMatch(match.trigger, regex) ||
        checkMatch(match.label, regex) ||
        checkMatch(match.description, regex) ||
        checkMatch(match.replace?.toString(), regex) ||
        checkMatch(match.content?.toString(), regex) ||
        checkMatch(match.markdown?.toString(), regex) ||
        checkMatch(match.html?.toString(), regex) ||
        match.tags?.some((tag: string) => checkMatch(tag, regex)) ||
        match.search_terms?.some((term: string) => checkMatch(term, regex))
      ) {
        return true;
      }
    }
    
    // Check group-specific fields (already covered by node.name)

  } catch (e) {
    console.error("Invalid regex in TreeNode:", e);
    return false; // Treat invalid regex as no match
  }

  return false;
});

// Computed: Check if any descendant node matches the search query
const descendantMatchesSearch = computed(() => {
  const query = props.searchQuery?.trim();
  if (!query || !hasChildren.value) return false;

  try {
    const regex = new RegExp(query, 'i');

    const checkDescendants = (nodes: TreeNodeItem[]): boolean => {
      for (const childNode of nodes) {
        // Check the child itself
        let childSelfMatches = false;
        if (checkMatch(childNode.name, regex)) {
           childSelfMatches = true;
        }
         if (childNode.type === 'match' && childNode.match) {
           const match = childNode.match;
           if (
             checkMatch(match.trigger, regex) ||
             checkMatch(match.label, regex) ||
             checkMatch(match.description, regex) ||
             checkMatch(match.replace?.toString(), regex) ||
             checkMatch(match.content?.toString(), regex) ||
             checkMatch(match.markdown?.toString(), regex) ||
             checkMatch(match.html?.toString(), regex) ||
             match.tags?.some((tag: string) => checkMatch(tag, regex)) ||
             match.search_terms?.some((term: string) => checkMatch(term, regex))
           ) {
             childSelfMatches = true;
           }
         }

        if (childSelfMatches) {
          return true; // Found a matching descendant
        }

        // Recursively check the child's descendants
        if (childNode.children && childNode.children.length > 0) {
          if (checkDescendants(childNode.children)) {
            return true; // Found a matching descendant deeper down
          }
        }
      }
      return false; // No matching descendant found in this branch
    };

    return checkDescendants(props.node.children);

  } catch(e) {
     console.error("Invalid regex in TreeNode (descendant check):", e);
     return false;
  }
});

// Computed: Determine if the node should be visible
const isVisible = computed(() => {
  // Always visible if there is no search query
  if (!props.searchQuery?.trim()) {
    return true;
  }
  // Visible if the node itself matches OR any descendant matches
  return selfMatchesSearch.value || descendantMatchesSearch.value;
});

// Auto-expand node if it becomes visible due to search
watch(isVisible, (newValue, oldValue) => {
  if (newValue && !oldValue && props.searchQuery?.trim()) {
    isOpen.value = true;
  }
  // Optional: Collapse when search is cleared and it wasn't originally open?
  // We might want to preserve user's manual open/close state.
});

// Watch for search query clearing to potentially reset state if needed
// watch(() => props.searchQuery, (newQuery) => {
//   if (!newQuery?.trim()) {
//      // Reset isOpen? Or keep user state?
//   }
// });

// 计算可见子节点数量
const visibleChildCount = computed(() => {
  if (!props.node.children) return 0;

  if (!props.searchQuery || props.searchQuery.trim() === '') {
    // 如果没有搜索查询，使用原来的计算逻辑
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
  }

  // 如果有搜索查询，计算可见子节点数量
  const countVisibleItems = (nodes: TreeNodeItem[]): number => {
    let count = 0;

    for (const node of nodes) {
      const query = props.searchQuery!.toLowerCase();
      let nodeVisible = false;

      // 检查节点本身是否匹配
      if (node.name && node.name.toLowerCase().includes(query)) {
        nodeVisible = true;
      } else if (node.type === 'match' && node.match) {
        const match = node.match;

        // 检查匹配项特有字段
        if (
          (match.trigger && match.trigger.toLowerCase().includes(query)) ||
          (match.label && match.label.toLowerCase().includes(query)) ||
          (match.description && match.description.toLowerCase().includes(query)) ||
          (match.replace && match.replace.toString().toLowerCase().includes(query)) ||
          (match.content && match.content.toString().toLowerCase().includes(query)) ||
          (match.markdown && match.markdown.toString().toLowerCase().includes(query)) ||
          (match.html && match.html.toString().toLowerCase().includes(query)) ||
          (match.tags && Array.isArray(match.tags) && match.tags.some(tag => tag.toLowerCase().includes(query))) ||
          (match.search_terms && Array.isArray(match.search_terms) && match.search_terms.some(term => term.toLowerCase().includes(query)))
        ) {
          nodeVisible = true;
        }
      } else if (node.type === 'group' && node.group && node.group.name && node.group.name.toLowerCase().includes(query)) {
        nodeVisible = true;
      }

      // 检查子节点是否匹配
      let childrenVisible = false;
      if (node.children && node.children.length > 0) {
        const childCount = countVisibleItems(node.children);
        if (childCount > 0) {
          childrenVisible = true;
          count += childCount;
        }
      }

      // 如果节点本身匹配且是匹配项，计数加1
      if (nodeVisible && node.type === 'match') {
        count++;
      }
    }

    return count;
  };

  return countVisibleItems(props.node.children);
});

// 当搜索查询变化时，自动展开所有节点
watch(() => props.searchQuery, (newQuery) => {
  if (newQuery && newQuery.trim() !== '') {
    isOpen.value = true;
  }
});
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
