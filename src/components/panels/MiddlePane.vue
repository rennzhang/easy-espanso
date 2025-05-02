<template>
  <div class="middle-pane flex flex-col h-full bg-card">
    <div class="flex flex-col py-2 px-4 border-b border-border">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <h3 class="text-lg font-semibold text-foreground m-0">规则列表</h3>
          <Badge variant="outline" class="ml-2" v-if="config">
            {{ totalItemCount }} 项
          </Badge>
        </div>
        <div class="flex items-center gap-2">
          <Button
            @click="toggleSearchBar"
            variant="ghost"
            size="icon"
            class="h-8 w-8 p-0 border-none focus:ring-0 focus:ring-offset-0"
            :class="showSearchBar ? 'bg-accent' : ''"
          >
            <SearchIcon class="h-4 w-4" />
          </Button>
          <Button
            @click="toggleViewMode"
            variant="ghost"
            size="icon"
            class="h-8 w-8 p-0 border-none focus:ring-0 focus:ring-offset-0"
            :class="viewMode === 'list' ? 'bg-accent' : ''"
            :title="viewMode === 'tree' ? '切换到列表视图' : '切换到树视图'"
          >
            <ListIcon v-if="viewMode === 'tree'" class="h-4 w-4" />
            <FolderTreeIcon v-else class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div v-show="showSearchBar" class="mt-2">
        <Input
          v-model="searchQuery"
          placeholder="搜索规则..."
          class="w-full h-8 text-sm"
          ref="searchInputRef"
          id="search-input"
          autofocus
          @keydown.esc="hideSearchBar"
        />
      </div>
    </div>

    <div class="p-3 bg-muted" v-if="filterTags && filterTags.length > 0">
      <div class="flex items-center flex-wrap gap-2">
        <div class="text-xs font-medium text-muted-foreground">已筛选:</div>
        <div class="flex flex-wrap gap-1">
          <Badge
            v-for="tag in filterTags"
            :key="tag"
            variant="secondary"
            class="flex items-center gap-1"
          >
            {{ tag }}
            <button
              class="inline-flex items-center justify-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-4 w-4"
              @click="removeTagFilter(tag)"
            >
              <span class="sr-only">Remove</span>
              <XIcon class="h-3 w-3" />
            </button>
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          class="h-6 text-xs border-none focus:ring-0 focus:ring-offset-0"
          @click="clearFilters"
        >
          清除全部
        </Button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div
        v-if="loading"
        class="flex flex-col justify-center items-center h-full gap-4"
      >
        <div
          class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"
        ></div>
        <div class="text-primary font-medium">加载中...</div>
      </div>
      <div
        v-else-if="!config"
        class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8"
      >
        <FolderIcon class="h-12 w-12 mb-4" />
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">
          未加载配置
        </h4>
        <p class="mb-6 text-muted-foreground max-w-md">
          请点击顶部的"打开配置"按钮加载Espanso配置文件
        </p>
      </div>
      <div
        v-else-if="
          store.getAllMatchesFromTree().length === 0 &&
          store.getAllGroupsFromTree().length === 0
        "
        class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8"
      >
        <FileTextIcon class="h-12 w-12 mb-4" />
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">没有规则</h4>
        <p class="mb-6 text-muted-foreground max-w-md">
          请在右侧面板添加新规则
        </p>
      </div>
      <div
        v-else-if="filteredItems.length === 0"
        class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8"
      >
        <SearchIcon class="h-12 w-12 mb-4" />
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">
          未找到匹配项
        </h4>
        <p class="mb-6 text-muted-foreground max-w-md">
          尝试使用不同的搜索词或标签过滤器
        </p>
        <Button
          variant="ghost"
          class="border-none focus:ring-0 focus:ring-offset-0"
          @click="clearFilters"
          >清除过滤器</Button
        >
      </div>
      <div v-else class="h-full">
        <!-- 提示气泡 -->
        <div
          v-if="showListViewTip && viewMode === 'tree'"
          class="fixed right-4 top-16 mt-2 p-2 bg-popover text-popover-foreground rounded shadow-md z-10 w-48"
        >
          <p class="text-xs mb-2">
            点击可切换到列表视图，以平铺方式查看所有片段
          </p>
          <div class="flex justify-between">
            <Button
              @click="hideListViewTip"
              variant="ghost"
              size="sm"
              class="text-xs border-none focus:ring-0 focus:ring-offset-0"
            >
              不再提示
            </Button>
            <Button
              @click="showListViewTip = false"
              variant="ghost"
              size="sm"
              class="text-xs border-none focus:ring-0 focus:ring-offset-0"
            >
              知道了
            </Button>
          </div>
        </div>

        <!-- 树视图 -->
        <div v-if="viewMode === 'tree'" class="h-full m-0">
          <!-- Log: Rendering ConfigTree -->
          {{ console.log('[MiddlePane] Rendering ConfigTree component because viewMode is tree') }}
          <ConfigTree
            :selected-id="selectedItemId"
            :searchQuery="searchQuery.trim()"
            @select="handleTreeItemSelect"
          />
        </div>

        <!-- 列表视图 -->
        <div v-else class="p-0">
          <Card
            v-for="item in filteredItems" 
            :key="item.id"
            :class="{
              'bg-[linear-gradient(135deg,#2b5876,#4e4376)] text-primary-foreground':
                selectedItemId === item.id,
            }"
            class="cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-md rounded-none mb-2"
            @click="selectItem(item.id)"
          >
            <CardContent class="p-4 flex items-start gap-2">
              <div class="flex-1">
                <div v-if="item.type === 'match'">
                  <div class="flex justify-between items-start">
                    <span class="font-semibold text-foreground">
                      <HighlightText
                        v-if="searchQuery.trim()"
                        :text="(item as Match).trigger"
                        :searchQuery="searchQuery.trim()"
                      />
                      <template v-else>{{ (item as Match).trigger }}</template>
                    </span>
                    <div
                      class="flex flex-wrap gap-1"
                      v-if="(item as Match).tags && (item as Match).tags.length > 0"
                    >
                      <Badge
                        v-for="tag in (item as Match).tags"
                        :key="tag"
                        @click.stop="addTagFilter(tag)"
                      >
                        {{ tag }}
                      </Badge>
                    </div>
                  </div>
                  <div
                    class="text-sm text-muted-foreground my-1 whitespace-pre-line"
                  >
                    <HighlightText
                      v-if="searchQuery.trim()"
                      :text="getContentPreview(item as Match)"
                      :searchQuery="searchQuery.trim()"
                    />
                    <template v-else>{{
                      getContentPreview(item as Match)
                    }}</template>
                  </div>
                  <div
                    class="flex justify-between text-xs text-muted-foreground mt-1"
                  >
                    <Badge variant="outline" class="bg-muted">{{
                      getContentTypeLabel((item as Match).contentType)
                    }}</Badge>
                    <span v-if="(item as Match).updatedAt">{{
                      formatDate((item as Match).updatedAt)
                    }}</span>
                  </div>
                </div>
                <div v-else-if="item.type === 'group'">
                  <div class="flex justify-between items-start">
                    <span class="font-semibold text-foreground">
                      <HighlightText
                        v-if="searchQuery.trim()"
                        :text="(item as Group).name"
                        :searchQuery="searchQuery.trim()"
                      />
                      <template v-else>{{ (item as Group).name }}</template>
                    </span>
                    <Badge variant="secondary" v-if="(item as Group).matches"
                      >{{ (item as Group).matches?.length || 0 }} 项</Badge
                    >
                  </div>
                  <div
                    class="flex justify-between text-xs text-muted-foreground mt-1"
                  >
                    <Badge variant="outline" class="bg-muted">分组</Badge>
                    <span v-if="(item as Group).updatedAt">{{
                      formatDate((item as Group).updatedAt)
                    }}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from "vue";
import { useEspansoStore } from "../../store/useEspansoStore";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import ConfigTree from "@/components/ConfigTree.vue";
import HighlightText from "@/components/common/HighlightText.vue";
import {
  SearchIcon,
  FolderIcon,
  FileTextIcon,
  XIcon,
  ListIcon,
  FolderTreeIcon
} from "lucide-vue-next";
import { Match, Group } from "../../types/espanso";

const store = useEspansoStore();
const searchQuery = ref("");
const viewMode = ref<"tree" | "list">("tree");
const showSearchBar = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);

// 从本地存储中读取提示显示状态
const showListViewTip = ref(false);

// 设置键盘快捷键来打开搜索
onMounted(() => {
  // 返回值是用于清理事件监听器的函数
  const setupKeyboardShortcuts = () => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查Ctrl+F或Command+F快捷键
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault(); // 阻止浏览器默认的搜索行为

        // 显示搜索栏并聚焦
        if (!showSearchBar.value) {
          showSearchBar.value = true;
          focusSearchInput();
        } else {
          // 如果搜索栏已经显示，只需聚焦
          focusSearchInput();
        }
      }

      // 检查ESC键 - 如果搜索栏显示，则隐藏搜索栏
      if (e.key === "Escape" && showSearchBar.value) {
        hideSearchBar();
      }
    };

    // 添加全局事件监听器
    window.addEventListener("keydown", handleKeyDown);

    // 返回清理函数
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  };

  // 初始化键盘快捷键
  const cleanup = setupKeyboardShortcuts();

  // 组件卸载时清理监听器
  onUnmounted(() => {
    cleanup();
  });

  // 其他现有的onMounted逻辑...
  const savedHideListViewTip = localStorage.getItem("hideListViewTip");
  if (savedHideListViewTip === "true") {
    showListViewTip.value = false;
  } else {
    showListViewTip.value = true;
  }

  // 检查是否有预加载的配置
  if (store.state.config && store.getAllMatchesFromTree) {
    const matches = store.getAllMatchesFromTree();
    if (matches.length > 0) {
      // 如果有匹配项，选择第一个
      selectItem(matches[0].id);
    }
  }

  // 如果是从URL加载配置，在加载完成后显示列表
  let unwatchConfig: Function | null = null; // Declare unwatch outside
  unwatchConfig = watch(
    () => store.state.config,
    (newConfig) => {
      if (newConfig && store.getAllMatchesFromTree) {
        const matches = store.getAllMatchesFromTree();
        if (matches.length > 0 && !store.state.selectedItemId) {
          selectItem(matches[0].id);
        }
        // Check if unwatchConfig has been assigned before calling
        if (unwatchConfig) {
          unwatchConfig();
        }
      }
    },
    { immediate: true }
  );

  // Ensure cleanup on unmount
  onUnmounted(() => {
    if (unwatchConfig) {
      unwatchConfig();
    }
    cleanup(); // Also call the keyboard shortcut cleanup
  });
});

// 聚焦搜索框的函数
const focusSearchInput = () => {
  // console.log("尝试聚焦中间面板搜索框..."); // Removed log

  // 使用嵌套的setTimeout确保多次尝试聚焦
  const attemptFocus = (attempts = 0) => {
    if (attempts > 5) return; // 最多尝试5次

    // 方法1: 使用ref
    if (searchInputRef.value) {
      // console.log(`第${attempts + 1}次尝试: 通过ref聚焦搜索框`); // Removed log
      searchInputRef.value.focus();
      return;
    }

    // 方法2: 使用DOM ID
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      // console.log(`第${attempts + 1}次尝试: 通过DOM ID聚焦搜索框`); // Removed log
      // 1. 尝试直接聚焦
      searchInput.focus();

      // 2. 尝试使用click事件聚焦
      setTimeout(() => {
        try {
          (searchInput as HTMLElement).click();
          (searchInput as HTMLInputElement).focus();
        } catch (e) {
          // console.error("聚焦点击失败:", e); // Keep potential error log?
        }
      }, 10);

      return;
    }

    // 如果以上方法都失败，则递增延迟重试
    setTimeout(() => attemptFocus(attempts + 1), 100 * (attempts + 1));
  };

  // 在下一个tick和短暂延迟后尝试聚焦
  nextTick(() => {
    setTimeout(() => attemptFocus(), 50);

    // 额外尝试，使用直接的DOM操作
    setTimeout(() => {
      const input = document.querySelector("#search-input") as HTMLInputElement;
      if (input) {
        // console.log("尝试使用querySelector聚焦搜索框"); // Removed log
        input.focus();
        // 尝试模拟用户点击
        try {
          const evt = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          });
          input.dispatchEvent(evt);
          input.focus();
        } catch (e) {
          // console.error("模拟点击失败:", e); // Keep potential error log?
        }
      }
    }, 150);
  });
};

// 监听showSearchBar的变化
watch(showSearchBar, (newVal) => {
  if (newVal) {
    // console.log("搜索栏显示，准备聚焦"); // Removed log
    focusSearchInput();
  } else {
    searchQuery.value = "";
  }
});

// 使用计算属性直接从store获取数据
const config = computed(() => store.state.config);
const selectedItemId = computed(() => store.state.selectedItemId);
const filterTags = computed(() => store.state.selectedTags);
const loading = computed(() => store.state.config === null);

// 过滤和排序项目
const filteredItems = computed(() => {
  if (
    !config.value ||
    !store.getAllMatchesFromTree ||
    !store.getAllGroupsFromTree
  )
    return [];

  let allMatches = store.getAllMatchesFromTree();
  let allGroups = store.getAllGroupsFromTree();
  let allItems = [...allMatches, ...allGroups];

  const query = searchQuery.value.trim().toLowerCase();
  const tags = filterTags.value || [];

  // Handle no query/tags case
  if (!query && tags.length === 0) {
    allItems.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA; // Newest first
    });
    return allItems;
  }

  // Helper function to check if a single item matches query or tags
  const itemMatchesQueryOrTags = (
    item: Match | Group,
    query: string,
    tags: string[],
  ): boolean => {
    let queryMatch: boolean = false; // Initialize explicitly
    if (query) {
      if (item.type === "match") {
        const match = item as Match;
        queryMatch = (
          match.trigger?.toLowerCase().includes(query) ||
          match.label?.toLowerCase().includes(query) ||
          match.description?.toLowerCase().includes(query) ||
          match.replace?.toString().toLowerCase().includes(query) ||
          match.tags?.some((tag: string) => tag.toLowerCase().includes(query)) ||
          (match.filePath && match.filePath.toLowerCase().includes(query))
        );
      } else if (item.type === "group") {
        queryMatch = (
          (item.name?.toLowerCase().includes(query) ?? false) ||
          (item.filePath?.toLowerCase().includes(query) ?? false)
        );
      }
    }
    let tagMatch = false;
    if (tags.length > 0) {
      if (item.type === "match") {
        const match = item as Match;
        tagMatch = match.tags && tags.every((tag: string) => match.tags?.includes(tag));
      }
    }
    return queryMatch || tagMatch;
  };

  // 1. Initial Filter & 2. Identify Matched Groups
  const directlyMatchedItems: (Match | Group)[] = [];
  const matchedGroups: Group[] = []; // Store the actual group objects

  for (const item of allItems) {
    if (itemMatchesQueryOrTags(item, query, tags)) {
      directlyMatchedItems.push(item);
      if (item.type === "group") {
        matchedGroups.push(item as Group);
      }
    }
  }

  // 3. Second Pass - Include Matches *under* the matched groups
  const finalItemMap = new Map<string, Match | Group>();

  // Add directly matched items first
  for (const item of directlyMatchedItems) {
    finalItemMap.set(item.id, item);
  }

  // Function to recursively get all matches under a group
  const getAllMatchesUnderGroup = (group: Group): Match[] => {
    let matches: Match[] = [...(group.matches || [])];
    if (group.groups) {
      for (const subGroup of group.groups) {
        matches = [...matches, ...getAllMatchesUnderGroup(subGroup)];
      }
    }
    return matches;
  };

  // Add matches that are children of matched groups
  if (matchedGroups.length > 0) {
    for (const group of matchedGroups) {
        const childMatches = getAllMatchesUnderGroup(group);
        for (const match of childMatches) {
            // Add child match only if it wasn't already directly matched
            if (!finalItemMap.has(match.id)) {
                finalItemMap.set(match.id, match);
            }
        }
    }
  }

  // 4. Convert Map back to Array and Sort
  let finalItems = Array.from(finalItemMap.values());

  // Sort: guiOrder first, then date
  finalItems.sort((a, b) => {
    const orderA = a.guiOrder ?? Infinity; // Treat undefined as lowest order
    const orderB = b.guiOrder ?? Infinity;

    if (orderA !== orderB) {
      return orderA - orderB; // Lower guiOrder number comes first
    }

    // If guiOrders are the same or both undefined, sort by date
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateB - dateA; // Newest date first
  });

  return finalItems;
});

// 内容预览
const getContentPreview = (item: Match) => {
  if (!item || item.type !== "match") {
    return "";
  }

  if (!item.replace) {
    return "";
  }

  const text =
    typeof item.replace === "string"
      ? item.replace
      : JSON.stringify(item.replace);

  return text.length > 100 ? text.substring(0, 100) + "..." : text;
};

// 获取内容类型标签
const getContentTypeLabel = (contentType?: string) => {
  if (!contentType) return "纯文本";

  const typeMap: Record<string, string> = {
    text: "纯文本",
    html: "HTML",
    image: "图片",
    script: "脚本",
    keystroke: "按键",
    form: "表单",
  };

  return typeMap[contentType] || contentType;
};

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// 选择项目
const selectItem = (id: string) => {
  // 检查是否有未保存的修改
  if (store.state.hasUnsavedChanges) {
    if (confirm('您有未保存的修改，确定要切换到其他项目吗？这将丢失当前的修改。')) {
      // 用户确认切换，重置修改状态
      store.state.hasUnsavedChanges = false;
      store.state.selectedItemId = id;
    }
  } else {
    store.state.selectedItemId = id;
  }
};

// 标签筛选
const addTagFilter = (tag: string) => {
  if (filterTags.value && !filterTags.value.includes(tag)) {
    store.state.selectedTags = [...filterTags.value, tag];
  }
};

const removeTagFilter = (tag: string) => {
  if (filterTags.value) {
    store.state.selectedTags = filterTags.value.filter((t) => t !== tag);
  }
};

const clearFilters = () => {
  store.state.selectedTags = [];
  searchQuery.value = "";
};

// 添加新规则功能已移至右侧面板

// 添加新分组功能已移除

// 切换视图模式
const toggleViewMode = () => {
  viewMode.value = viewMode.value === "tree" ? "list" : "tree";
  // console.log("切换视图模式:", viewMode.value); // Removed log
};

// 切换搜索栏显示
const toggleSearchBar = () => {
  showSearchBar.value = !showSearchBar.value;
  // console.log("切换搜索栏:", showSearchBar.value); // Removed log

  if (showSearchBar.value) {
    // 使用改进的聚焦方法
    focusSearchInput();
  } else {
    // 如果关闭搜索栏，清空搜索内容
    searchQuery.value = "";
  }
};

// 隐藏搜索栏
const hideSearchBar = () => {
  // console.log("按下ESC键，隐藏搜索栏"); // Removed log
  showSearchBar.value = false;
  searchQuery.value = "";
};

// 隐藏列表视图提示
const hideListViewTip = () => {
  showListViewTip.value = false;
  localStorage.setItem("hideListViewTip", "true");
};

// 处理树节点选择
const handleTreeItemSelect = (item: Match | Group) => {
  // console.log("选择树节点:", item); // Removed log
  selectItem(item.id);
};

// --- Total Item Count ---
const totalItemCount = computed(() => {
  if (
    !config.value ||
    !store.getAllMatchesFromTree ||
    !store.getAllGroupsFromTree
  )
    return 0;
  const matches = store.getAllMatchesFromTree();
  const groups = store.getAllGroupsFromTree();
  return matches.length + groups.length;
});
</script>
