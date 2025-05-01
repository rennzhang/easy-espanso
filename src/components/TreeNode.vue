<template>
  <div class="tree-node px-0 pl-0" v-if="isVisible" :id="`tree-node-${node.id}`">
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
          'hover:bg-accent hover:text-accent-foreground': !isSelected,
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
          <HighlightText
            v-if="searchQuery"
            :text="displayName"
            :searchQuery="selfMatchesSearch ? searchQuery : ''"
          />
          <template v-else>{{ displayName }}</template>
        </span>
        <span
          v-if="visibleChildCount > 0"
          class="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full"
        >
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
        :class="{
          'bg-primary text-primary-foreground': isSelected,
          'hover:bg-accent hover:text-accent-foreground': !isSelected,
        }"
      >
        <span class="w-4 inline-block"></span>
        <ZapIcon class="h-4 w-4 mr-1 text-blue-500" />
        <span class="text-sm">
          <HighlightText
            v-if="searchQuery"
            :text="node.name"
            :searchQuery="selfMatchesSearch ? searchQuery : ''"
          />
          <template v-else>{{ node.name }}</template>
        </span>

        <!-- 描述信息 -->
        <div v-if="node.match?.description" class="ml-auto flex-1 text-right">
          <span
            class="text-xs text-muted-foreground truncate max-w-[200px] inline-block"
            :title="node.match.description"
          >
            <HighlightText
              v-if="searchQuery"
              :text="node.match.description"
              :searchQuery="selfMatchesSearch ? searchQuery : ''"
            />
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
        :parentMatches="selfMatchesSearch || props.parentMatches"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch } from "vue";
import { ChevronRightIcon, ChevronDownIcon, ZapIcon } from "lucide-vue-next";
import type { TreeNodeItem } from "./ConfigTree.vue";
import HighlightText from "./common/HighlightText.vue";

const props = defineProps<{
  node: TreeNodeItem;
  selectedId?: string | null;
  searchQuery?: string;
  parentMatches?: boolean; // 父节点是否匹配搜索词
}>();

const emit = defineEmits<{
  (e: "select", node: TreeNodeItem): void;
}>();

// 默认展开所有节点
const isOpen = ref(true);

// 当搜索查询存在时，确保节点展开
watch(() => props.searchQuery, (newQuery) => {
  if (newQuery && newQuery.trim() !== "") {
    isOpen.value = true;
  }
}, { immediate: true });

// 切换文件夹展开/折叠状态
const toggleFolder = () => {
  isOpen.value = !isOpen.value;
  console.log(`切换节点 ${props.node.name} 的展开状态:`, isOpen.value);
};

const selectNode = () => {
  console.log("选择节点:", props.node);
  emit("select", props.node);
};

const isSelected = computed(() => {
  return props.node.id === props.selectedId;
});

// Add/Modify displayName computed property
const displayName = computed(() => {
  if (props.node.type === "file" && props.node.name) {
    // Remove .yml or .yaml suffix
    return props.node.name.replace(/\.(yml|yaml)$/i, "");
  }
  // Return original name for other types or if name is missing
  return props.node.name || "";
});

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0;
});

// Helper function to check if a string matches the query regex
const checkMatch = (
  text: string | undefined | null,
  regex: RegExp
): boolean => {
  return text ? regex.test(text) : false;
};

// Function to escape regex special characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

// Computed: Check if this node's own data matches the search query
const selfMatchesSearch = computed(() => {
  const query = props.searchQuery?.trim();
  console.log("selfMatchesSearch", query);

  if (!query) return false;

  try {
    const escapedQuery = escapeRegex(query);
    const regex = new RegExp(escapedQuery, "i"); // Case-insensitive regex
    let matches = false;

    const nodeName = props.node.name; // Get name once
    const nodeType = props.node.type; // Get type once

    // --- DETAILED LOGGING ---
    // Uncomment below for debugging
    console.log(`--------------------------------
[${nodeType}] '${nodeName}' (ID: ${props.node.id})
Checking self match for query: '${query}' (Regex: /${escapedQuery}/i)`);

    // Always check the node name (covers name for folder/file/group, and trigger for match)
    const nameMatchResult = checkMatch(nodeName, regex);

    // --- DETAILED LOGGING ---
    // Uncomment below for debugging
    console.log(`  -> Name check ('${nodeName}') result: ${nameMatchResult}`);

    if (nameMatchResult) {
      matches = true;
    }

    // If name didn't match AND it's a match node, check additional match-specific fields
    if (!matches && nodeType === "match" && props.node.match) {
      // --- DETAILED LOGGING ---
      // Uncomment below for debugging
       console.log(`  -> Name didn't match, checking match-specific fields...`);
      const match = props.node.match;
      const labelMatch = checkMatch(match.label, regex);
      const descriptionMatch = checkMatch(match.description, regex);
      const replaceMatch = checkMatch(match.replace?.toString(), regex);
      // ... add other checks if needed for logging
      const tagsMatch = match.tags?.some((tag: string) =>
        checkMatch(tag, regex)
      );
      const termsMatch = match.search_terms?.some((term: string) =>
        checkMatch(term, regex)
      );

      // --- DETAILED LOGGING ---
      // Uncomment below for debugging
      console.log(`     Label ('${match.label}'): ${labelMatch}`);
      console.log(`     Description ('${match.description}'): ${descriptionMatch}`);
      console.log(`     Replace: ${replaceMatch}`);
      console.log(`     Tags: ${tagsMatch}`);
      console.log(`     Terms: ${termsMatch}`);

      if (
        labelMatch ||
        descriptionMatch ||
        replaceMatch ||
        // checkMatch(match.content?.toString(), regex) || // Add these back if needed
        // checkMatch(match.markdown?.toString(), regex) ||
        // checkMatch(match.html?.toString(), regex) ||
        tagsMatch ||
        termsMatch
      ) {
        matches = true;
        // --- DETAILED LOGGING ---
        // Uncomment below for debugging
         console.log(`  -> Match-specific field matched!`);
      }
    }

    // --- DETAILED LOGGING ---
    // Uncomment below for debugging
    console.log(`  => Final self match result: ${matches}
--------------------------------`);

    return matches;
  } catch (e) {
    console.error("Invalid regex in TreeNode (selfMatchesSearch):", e);
    return false; // Treat invalid regex as no match
  }
});

// Computed: Check if any descendant node matches the search query
const descendantMatchesSearch = computed(() => {
  const query = props.searchQuery?.trim();
  if (!query || !hasChildren.value) return false;

  try {
    const escapedQuery = escapeRegex(query);
    const regex = new RegExp(escapedQuery, "i");

    const checkDescendants = (nodes: TreeNodeItem[]): boolean => {
      for (const childNode of nodes) {
        let childSelfMatches = false;

        // Check child name first (covers name for folder/file/group, and trigger for match)
        if (checkMatch(childNode.name, regex)) {
          childSelfMatches = true;
        }

        // If name didn't match AND it's a match type, check specific match fields
        if (
          !childSelfMatches &&
          childNode.type === "match" &&
          childNode.match
        ) {
          const match = childNode.match;
          if (
            // No need to re-check trigger
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
        // No additional fields to check for descendant folder/file/group beyond their name

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
  } catch (e) {
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

  // 如果父节点匹配搜索词，则子节点也应该可见
  if (props.parentMatches) {
    return true;
  }

  // 如果节点本身匹配搜索词，则节点应该可见
  if (selfMatchesSearch.value) {
    return true;
  }

  // 如果节点的子节点匹配搜索词，则节点应该可见
  if (descendantMatchesSearch.value) {
    return true;
  }

  // 如果搜索查询存在，但节点本身和子节点都不匹配，且父节点也不匹配，则节点不可见
  return false;
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

  if (!props.searchQuery || props.searchQuery.trim() === "") {
    // 如果没有搜索查询，使用原来的计算逻辑
    if (props.node.type === "folder" || props.node.type === "file") {
      // 递归计算所有匹配项的数量
      let count = 0;
      const countItems = (nodes: TreeNodeItem[]) => {
        for (const node of nodes) {
          if (node.type === "match") {
            count++;
          } else if (node.children) {
            countItems(node.children);
          }
        }
      };
      countItems(props.node.children);
      return count;
    } else if (props.node.type === "group") {
      // 只计算直接子节点中的匹配项数量
      return props.node.children.filter((child) => child.type === "match")
        .length;
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
      } else if (node.type === "match" && node.match) {
        const match = node.match;

        // 检查匹配项特有字段
        if (
          (match.trigger && match.trigger.toLowerCase().includes(query)) ||
          (match.label && match.label.toLowerCase().includes(query)) ||
          (match.description &&
            match.description.toLowerCase().includes(query)) ||
          (match.replace &&
            match.replace.toString().toLowerCase().includes(query)) ||
          (match.content &&
            match.content.toString().toLowerCase().includes(query)) ||
          (match.markdown &&
            match.markdown.toString().toLowerCase().includes(query)) ||
          (match.html && match.html.toString().toLowerCase().includes(query)) ||
          (match.tags &&
            Array.isArray(match.tags) &&
            match.tags.some((tag) => tag.toLowerCase().includes(query))) ||
          (match.search_terms &&
            Array.isArray(match.search_terms) &&
            match.search_terms.some((term) =>
              term.toLowerCase().includes(query)
            ))
        ) {
          nodeVisible = true;
        }
      } else if (
        node.type === "group" &&
        node.group &&
        node.group.name &&
        node.group.name.toLowerCase().includes(query)
      ) {
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
      if (nodeVisible && node.type === "match") {
        count++;
      }
    }

    return count;
  };

  return countVisibleItems(props.node.children);
});

// 当搜索查询变化时，自动展开所有节点已在上面实现

// 当父节点匹配搜索词时，自动展开子节点
watch(() => props.parentMatches, (newValue) => {
  if (newValue && props.searchQuery?.trim()) {
    isOpen.value = true;
  }
}, { immediate: true });
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
.folder-node,
.file-node,
.group-node,
.match-node {
  width: 100%;
}

/* 描述文本溢出处理 */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
