<template>
  <div class="middle-pane flex flex-col h-full bg-card">
    <div class="flex flex-col py-2 px-4 border-b">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <h3 class="text-lg font-semibold text-foreground m-0">{{ t('snippets.listTitle') }}</h3>
          <Badge variant="outline" class="ml-2">
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
          :placeholder="t('snippets.searchPlaceholder')"
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

    <RootContextMenu>
      <div class="flex-1 overflow-y-auto middle-pane-scrollbar">
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
          v-else-if="!store.allMatches"
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
          v-else-if="store.allMatches.length === 0"
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
          <!-- 树视图 -->
          <div v-if="viewMode === 'tree'" class="h-full flex-1">
            <!-- Log: Rendering ConfigTree -->
            {{
              console.log(
                "[MiddlePane] Rendering ConfigTree component because viewMode is tree"
              )
            }}
            <ConfigTree
              ref="configTreeRef"
              :selected-id="selectedItemId"
              :searchQuery="searchQuery.trim()"
              @select="handleTreeItemSelect"
            />
          </div>

          <!-- 列表视图 -->
          <div v-else class="p-3">
            <div 
              v-for="item in filteredItems" 
              :key="item.id" 
              :class="[
                'group cursor-pointer border-l-2 rounded-md mb-2.5 transition-all bg-card shadow-xs border border-border/30',
                selectedItemId === item.id 
                  ? 'border-l-primary shadow-sm bg-accent/10 border-primary/20' 
                  : 'border-l-transparent hover:border-l-primary/40 hover:shadow-sm hover:bg-accent/5 hover:border-border/60'
              ]"
              @click="selectItem(item.id, item.type)"
            >
              <div class="py-2.5 px-3">
                <div class="flex items-center gap-2">
                  <!-- 触发词和标签 -->
                  <div class="flex-1 min-w-0">
                    <div v-if="item.type === 'match'" class="flex flex-col gap-1">
                      <!-- 触发词和标签 -->
                      <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-sm font-medium" :class="selectedItemId === item.id ? 'text-primary' : 'text-foreground'">
                          <HighlightText
                            v-if="searchQuery.trim()"
                            :text="(item as Match).trigger || ''"
                            :searchQuery="searchQuery.trim()"
                          />
                          <template v-else>{{ (item as Match).trigger }}</template>
                        </h3>
                        
                        <div 
                          v-if="(item as Match).label"
                          class="text-xs px-1.5 rounded truncate max-w-[120px]"
                          :class="selectedItemId === item.id 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted text-muted-foreground'"
                        >
                          {{ (item as Match).label }}
                        </div>
                      </div>
                      
                      <!-- 简短描述或内容预览 -->
                      <div
                        class="text-xs"
                        :class="selectedItemId === item.id ? 'text-foreground/90' : 'text-muted-foreground'"
                      >
                        {{ (item as Match).description || getContentPreview(item as Match) }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- 右侧标签 -->
                  <div 
                    class="flex gap-1 flex-wrap justify-end flex-shrink-0"
                    v-if="(item as Match).tags && ((item as Match)?.tags?.length||0) > 0"
                  >
                    <Badge
                      v-for="tag in (item as Match).tags"
                      :key="tag"
                      variant="outline"
                      class="text-xs border-0 bg-muted/50 px-1.5 py-0 whitespace-nowrap"
                      @click.stop="addTagFilter(tag)"
                    >
                      {{ tag }}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RootContextMenu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from "vue";
import { EspansoState, useEspansoStore } from "../../store/useEspansoStore";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import ConfigTree from "@/components/ConfigTree.vue";
import HighlightText from "@/components/common/HighlightText.vue";
import RootContextMenu from "@/components/RootContextMenu.vue";
import {
  SearchIcon,
  FolderIcon,
  FileTextIcon,
  XIcon,
  ListIcon,
  FolderTreeIcon,
  ZapIcon,
  ClockIcon,
} from "lucide-vue-next";
import { Match } from "@/types/core/espanso.types";
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const store = useEspansoStore();
const searchQuery = ref("");
const viewMode = ref<"tree" | "list">("tree");
const showSearchBar = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);

// 引用树组件实例
const configTreeRef = ref<InstanceType<typeof ConfigTree> | null>(null);

// 获取树组件的焦点状态
const getTreeFocusState = (): boolean => {
  return configTreeRef.value?.treeHasFocus || false;
};

// 暴露方法给父组件使用
defineExpose({
  getTreeFocusState,
});

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

  // 检查是否有预加载的配置
  if (store.allMatches) {
    const matches = store.allMatches;
    if (matches.length > 0) {
      // 如果有匹配项，选择第一个
      store.selectItem(matches[0].id, "match"); // 使用 store action
    }
  }
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
const selectedItemId = computed(() => store.state.selectedItemId);
const filterTags = computed(() => store.state.selectedTags);
const loading = computed(() => store.state.loading);

// 过滤和排序项目
const filteredItems = computed(() => {
  if (!store.allMatches) return [];

  let allMatches = store.allMatches;
  let allItems = [...allMatches];

  const query = searchQuery.value.trim().toLowerCase();
  const tags = filterTags.value || [];

  // Handle no query/tags case
  if (!query && tags.length === 0) {
    allItems.sort((a, b) => {
      // 首先按日期排序（最新的在前）
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      
      if (dateA !== dateB) {
        return dateB - dateA; // 最新的在前
      }
      
      // 仅当日期相同时才考虑guiOrder
      const orderA = a.guiOrder ?? Infinity;
      const orderB = b.guiOrder ?? Infinity;
      return orderA - orderB;
    });
    return allItems;
  }

  // Helper function to check if a single item matches query or tags
  const itemMatchesQueryOrTags = (
    item: Match,
    query: string,
    tags: string[]
  ): boolean => {
    let queryMatch: boolean = false; // Initialize explicitly
    if (query) {
      if (item.type === "match") {
        const match = item as Match;
        queryMatch =
          match.trigger?.toLowerCase().includes(query) ||
          match.label?.toLowerCase().includes(query) ||
          match.description?.toLowerCase().includes(query) ||
          match.replace?.toString().toLowerCase().includes(query) ||
          (match.tags &&
            match.tags.some((tag: string) =>
              tag.toLowerCase().includes(query)
            )) ||
          (match.filePath && match.filePath.toLowerCase().includes(query)) ||
          false;
      }
    }
    let tagMatch = false;
    if (tags.length > 0) {
      if (item.type === "match") {
        const match = item as Match;
        tagMatch =
          (match.tags &&
            tags.every((tag: string) => match.tags?.includes(tag))) ||
          false;
      }
    }
    return queryMatch || tagMatch;
  };

  // 1. Initial Filter & 2. Identify Matched Groups
  const directlyMatchedItems: Match[] = [];

  for (const item of allItems) {
    if (itemMatchesQueryOrTags(item, query, tags)) {
      directlyMatchedItems.push(item);
    }
  }

  // 3. Second Pass - Include Matches *under* the matched groups
  const finalItemMap = new Map<string, Match>();

  // Add directly matched items first
  for (const item of directlyMatchedItems) {
    finalItemMap.set(item.id, item);
  }

  // 4. Convert Map back to Array and Sort
  let finalItems = Array.from(finalItemMap.values());

  // 修改排序优先级：始终优先按修改日期排序（最新的在前）
  finalItems.sort((a, b) => {
    // 首先按日期排序（最新的在前）
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    
    if (dateA !== dateB) {
      return dateB - dateA; // 最新的在前
    }
    
    // 仅当日期相同时才考虑guiOrder
    const orderA = a.guiOrder ?? Infinity;
    const orderB = b.guiOrder ?? Infinity;
    return orderA - orderB;
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

// 获取简化的文件路径显示
const getFilePathDisplay = (filePath?: string) => {
  if (!filePath) return '';
  
  // 从路径中提取文件名
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  
  // 如果路径很长，显示简化版本
  if (parts.length > 2) {
    return `${parts[0]}/.../${fileName}`;
  }
  
  return filePath;
};

// 选择项目 (列表视图点击)
const selectItem = (id: string, type: EspansoState["selectedItemType"]) => {
  // 直接调用 store action，由 store 处理选择逻辑（包括未保存检查等）
  store.selectItem(id, type);
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

// 处理树节点选择
const handleTreeItemSelect = (item: Match) => {
  // 直接调用 store action，传递 ID 和类型
  store.selectItem(item.id, item.type);
};

// --- Total Item Count ---
const totalItemCount = computed(() => {
  if (!store.allMatches) return 0;
  const matches = store.allMatches;
  return matches.length;
});
</script>

<style>
/* 自定义滚动条，使其不占空间 (覆盖) */
.middle-pane-scrollbar {
  overflow-y: auto; /* 确保滚动 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.middle-pane-scrollbar::-webkit-scrollbar {
  width: 0px; /* Chrome, Safari, Opera */
  background: transparent; /* Optional: just make scrollbar invisible */
}

/* 如果需要一个非常细的滚动条 */
/*
.middle-pane-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.middle-pane-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.middle-pane-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 20px;
  border: transparent;
}
*/
</style>
