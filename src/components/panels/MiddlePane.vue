<template>
  <div class="flex flex-col h-full bg-card">
    <div class="flex flex-col p-4 border-b border-border gap-3">
      <div class="flex items-center">
        <h3 class="text-xl font-semibold text-foreground m-0">规则列表</h3>
        <Badge variant="outline" class="ml-2" v-if="config && config.root">
          {{ filteredItems.length }} 项
        </Badge>
      </div>
      <div>
        <Input
          v-model="searchQuery"
          placeholder="搜索规则..."
          class="w-full"
        />
      </div>
      <div class="flex justify-end gap-2">
        <Button @click="addNewRule" size="sm">
          <PlusIcon class="h-4 w-4 mr-1" />
          添加规则
        </Button>
        <Button variant="outline" @click="addNewGroup" size="sm">
          <PlusIcon class="h-4 w-4 mr-1" />
          添加分组
        </Button>
      </div>
    </div>

    <div class="p-3 bg-muted" v-if="filterTags.length > 0">
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
        <Button variant="ghost" size="sm" class="h-6 text-xs" @click="clearFilters">
          清除全部
        </Button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="loading" class="flex flex-col justify-center items-center h-full gap-4">
        <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <div class="text-primary font-medium">加载中...</div>
      </div>
      <div v-else-if="!config" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
        <FolderIcon class="h-12 w-12 mb-4" />
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">未加载配置</h4>
        <p class="mb-6 text-muted-foreground max-w-md">请点击顶部的"打开配置"按钮加载Espanso配置文件</p>
      </div>
      <div v-else-if="config.root.children.length === 0" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
        <FileTextIcon class="h-12 w-12 mb-4" />
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">没有规则</h4>
        <p class="mb-6 text-muted-foreground max-w-md">点击"添加规则"按钮创建第一条规则</p>
        <Button @click="addNewRule">添加规则</Button>
      </div>
      <div v-else-if="filteredItems.length === 0" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
        <SearchIcon class="h-12 w-12 mb-4" />
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">未找到匹配项</h4>
        <p class="mb-6 text-muted-foreground max-w-md">尝试使用不同的搜索词或标签过滤器</p>
        <Button variant="outline" @click="clearFilters">清除过滤器</Button>
      </div>
      <div v-else class="flex flex-col gap-3">
        <!-- 这里将来会使用vue-draggable-next实现拖拽排序 -->
        <Card
          v-for="item in filteredItems"
          :key="item.id"
          :class="{ 'border-primary shadow-[0_0_0_1px] shadow-primary': selectedItemId === item.id }"
          class="cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-md"
          @click="selectItem(item.id)"
        >
          <CardContent class="p-4">
            <div v-if="item.type === 'rule'">
              <div class="flex justify-between items-start">
                <span class="font-semibold text-foreground">{{ item.trigger }}</span>
                <div class="flex flex-wrap gap-1" v-if="item.tags && item.tags.length > 0">
                  <Badge
                    v-for="tag in item.tags"
                    :key="tag"
                    @click.stop="addTagFilter(tag)"
                  >
                    {{ tag }}
                  </Badge>
                </div>
              </div>
              <div class="text-sm text-muted-foreground my-1 whitespace-pre-line">{{ getContentPreview(item) }}</div>
              <div class="flex justify-between text-xs text-muted-foreground mt-1">
                <Badge variant="outline" class="bg-muted">{{ getContentTypeLabel(item.contentType) }}</Badge>
                <span>{{ formatDate(item.updatedAt) }}</span>
              </div>
            </div>
            <div v-else-if="item.type === 'group'">
              <div class="flex justify-between items-start">
                <span class="font-semibold text-foreground">{{ item.name }}</span>
                <Badge variant="secondary">{{ item.children.length }} 项</Badge>
              </div>
              <div class="flex justify-between text-xs text-muted-foreground mt-1">
                <Badge variant="outline" class="bg-muted">分组</Badge>
                <span>{{ formatDate(item.updatedAt) }}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import { EspansoRule, EspansoGroup } from '../../types/espanso-config';
import {
  PlusIcon,
  XIcon,
  FolderIcon,
  FileTextIcon,
  SearchIcon
} from 'lucide-vue-next';
import Button from '../ui/button.vue';
import Input from '../ui/input.vue';
import Badge from '../ui/badge.vue';
import Card from '../ui/card.vue';
import CardContent from '../ui/card-content.vue';

const store = useEspansoStore();
const config = computed(() => store.config);
const loading = computed(() => store.loading);
const selectedItemId = computed(() => store.selectedItemId);
const filterTags = computed(() => store.middlePaneFilterTags);

// 搜索查询
const searchQuery = ref('');

// 过滤后的项目列表
const filteredItems = computed(() => {
  if (!config.value || !config.value.root) return [];

  let items = config.value.root.children;

  // 应用标签过滤
  if (filterTags.value.length > 0) {
    items = items.filter(item => {
      if (item.type === 'rule' && item.tags) {
        return filterTags.value.every(tag => item.tags!.includes(tag));
      }
      return false;
    });
  }

  // 应用搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    items = items.filter(item => {
      if (item.type === 'rule') {
        return item.trigger.toLowerCase().includes(query) ||
               (typeof item.content === 'string' && item.content.toLowerCase().includes(query));
      } else if (item.type === 'group') {
        return item.name.toLowerCase().includes(query);
      }
      return false;
    });
  }

  return items;
});

// 获取内容预览
const getContentPreview = (item: EspansoRule) => {
  if (item.type !== 'rule') return '';

  // 根据contentType返回不同的预览
  switch (item.contentType) {
    case 'plain':
      return String(item.content).substring(0, 60) + (String(item.content).length > 60 ? '...' : '');
    case 'rich':
    case 'html':
      return '[富文本内容]';
    case 'script':
      return '[脚本内容]';
    case 'image':
      return '[图片内容]';
    case 'form':
      return '[表单内容]';
    case 'clipboard':
      return '[剪贴板内容]';
    case 'shell':
      return '[Shell命令]';
    case 'key':
      return '[按键序列]';
    default:
      return String(item.content);
  }
};

// 获取内容类型标签
const getContentTypeLabel = (contentType: string) => {
  switch (contentType) {
    case 'plain': return '纯文本';
    case 'rich': return '富文本';
    case 'html': return 'HTML';
    case 'script': return '脚本';
    case 'image': return '图片';
    case 'form': return '表单';
    case 'clipboard': return '剪贴板';
    case 'shell': return 'Shell';
    case 'key': return '按键序列';
    default: return contentType;
  }
};

// 格式化日期
const formatDate = (timestamp: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 选择项目
const selectItem = (itemId: string) => {
  store.selectItem(itemId);
};

// 添加标签过滤
const addTagFilter = (tag: string) => {
  if (!filterTags.value.includes(tag)) {
    store.setMiddlePaneFilterTags([...filterTags.value, tag]);
  }
};

// 移除标签过滤
const removeTagFilter = (tag: string) => {
  store.setMiddlePaneFilterTags(filterTags.value.filter(t => t !== tag));
};

// 清除所有过滤器
const clearFilters = () => {
  store.setMiddlePaneFilterTags([]);
  searchQuery.value = '';
};

// 添加新规则
const addNewRule = () => {
  // 这里将在后续任务中实现
  console.log('添加新规则');
};

// 添加新分组
const addNewGroup = () => {
  // 这里将在后续任务中实现
  console.log('添加新分组');
};
</script>


