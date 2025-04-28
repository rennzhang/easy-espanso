<template>
  <div class="middle-pane-container">
    <div class="middle-pane-header">
      <div class="header-title">
        <h3 class="title">规则列表</h3>
        <span class="item-count" v-if="config && config.root">{{ filteredItems.length }} 项</span>
      </div>
      <div class="search-box">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索规则..."
          class="search-input"
        />
      </div>
      <div class="actions">
        <button class="btn-primary btn-sm" @click="addNewRule">
          <span class="btn-icon">+</span>
          <span class="btn-text">添加规则</span>
        </button>
        <button class="btn-secondary btn-sm" @click="addNewGroup">
          <span class="btn-icon">+</span>
          <span class="btn-text">添加分组</span>
        </button>
      </div>
    </div>

    <div class="filter-bar" v-if="filterTags.length > 0">
      <div class="active-filters">
        <div class="filter-label">已筛选:</div>
        <div class="filter-tags">
          <div v-for="tag in filterTags" :key="tag" class="filter-tag">
            <span class="tag-text">{{ tag }}</span>
            <button class="remove-tag" @click="removeTagFilter(tag)">×</button>
          </div>
        </div>
        <button class="clear-filters" @click="clearFilters">清除全部</button>
      </div>
    </div>

    <div class="middle-pane-content">
      <div v-if="loading" class="loading-container">
        <div class="loading"></div>
        <div class="loading-text">加载中...</div>
      </div>
      <div v-else-if="!config" class="empty-state">
        <div class="empty-icon">📁</div>
        <h4 class="empty-title">未加载配置</h4>
        <p class="empty-description">请点击顶部的"打开配置"按钮加载Espanso配置文件</p>
      </div>
      <div v-else-if="config.root.children.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <h4 class="empty-title">没有规则</h4>
        <p class="empty-description">点击"添加规则"按钮创建第一条规则</p>
        <button class="btn-primary" @click="addNewRule">添加规则</button>
      </div>
      <div v-else-if="filteredItems.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <h4 class="empty-title">未找到匹配项</h4>
        <p class="empty-description">尝试使用不同的搜索词或标签过滤器</p>
        <button class="btn-secondary" @click="clearFilters">清除过滤器</button>
      </div>
      <div v-else class="items-list">
        <!-- 这里将来会使用vue-draggable-next实现拖拽排序 -->
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="item card"
          :class="{ 'selected': selectedItemId === item.id }"
          @click="selectItem(item.id)"
        >
          <div class="item-content">
            <div v-if="item.type === 'rule'" class="rule-item">
              <div class="item-header">
                <span class="trigger">{{ item.trigger }}</span>
                <div class="item-tags" v-if="item.tags && item.tags.length > 0">
                  <span
                    v-for="tag in item.tags"
                    :key="tag"
                    class="badge badge-primary"
                    @click.stop="addTagFilter(tag)"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
              <div class="content-preview">{{ getContentPreview(item) }}</div>
              <div class="item-meta">
                <span class="item-type">{{ getContentTypeLabel(item.contentType) }}</span>
                <span class="item-date">{{ formatDate(item.updatedAt) }}</span>
              </div>
            </div>
            <div v-else-if="item.type === 'group'" class="group-item">
              <div class="item-header">
                <span class="group-name">{{ item.name }}</span>
                <span class="badge badge-secondary children-count">{{ item.children.length }} 项</span>
              </div>
              <div class="item-meta">
                <span class="item-type">分组</span>
                <span class="item-date">{{ formatDate(item.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import { EspansoRule, EspansoGroup } from '../../types/espanso-config';

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

<style>
.middle-pane-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
}

.middle-pane-header {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--border-color);
  gap: var(--spacing-3);
}

.header-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-color);
}

.item-count {
  font-size: 0.875rem;
  color: var(--text-muted);
  background-color: var(--background-dark-color);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
}

.search-box {
  width: 100%;
}

.search-input {
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  background-color: var(--background-light-color);
  font-size: 0.875rem;
  transition: all var(--transition) ease;
}

.search-input:focus {
  border-color: var(--primary-color);
  background-color: white;
  box-shadow: 0 0 0 3px var(--primary-light);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
}

.filter-bar {
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--background-light-color);
  border-bottom: 1px solid var(--border-color);
}

.active-filters {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}

.filter-tag {
  display: flex;
  align-items: center;
  background-color: var(--primary-light);
  color: var(--primary-color);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  gap: var(--spacing-1);
}

.remove-tag {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-filters {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius);
  transition: all var(--transition) ease;
}

.clear-filters:hover {
  background-color: var(--background-dark-color);
  color: var(--text-color);
}

.middle-pane-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-4);
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: var(--spacing-4);
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
  padding: var(--spacing-8);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-4);
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 var(--spacing-2) 0;
  color: var(--text-color);
}

.empty-description {
  margin: 0 0 var(--spacing-6) 0;
  color: var(--text-muted);
  max-width: 24rem;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.item {
  padding: var(--spacing-4);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all var(--transition) ease;
}

.item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.item.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color), var(--shadow);
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.trigger, .group-name {
  font-weight: 600;
  color: var(--text-color);
  font-size: 1rem;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}

.content-preview {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: var(--spacing-1) 0;
  white-space: pre-line;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: var(--spacing-1);
}

.item-type {
  background-color: var(--background-dark-color);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
}

.item-date {
  color: var(--text-muted);
}

.children-count {
  font-size: 0.75rem;
}
</style>
