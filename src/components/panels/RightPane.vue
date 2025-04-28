<template>
  <div class="right-pane-container">
    <div class="right-pane-header">
      <div class="header-content">
        <h3 class="header-title">{{ headerTitle }}</h3>
        <div class="header-actions" v-if="selectedItem">
          <button class="btn-primary btn-sm" @click="saveItem">
            <span class="btn-icon">💾</span>
            <span class="btn-text">保存</span>
          </button>
          <button class="btn-danger btn-sm" @click="deleteItem">
            <span class="btn-icon">🗑️</span>
            <span class="btn-text">删除</span>
          </button>
        </div>
      </div>
    </div>

    <div class="right-pane-content">
      <div v-if="loading" class="loading-container">
        <div class="loading"></div>
        <div class="loading-text">加载中...</div>
      </div>
      <div v-else-if="!selectedItem" class="empty-state">
        <div class="empty-icon">👈</div>
        <h4 class="empty-title">未选择项目</h4>
        <p class="empty-description">请从左侧列表选择一个规则或分组进行编辑</p>
      </div>
      <div v-else-if="selectedItem.type === 'rule'" class="rule-edit-form card">
        <!-- 这里将来会使用RuleEditForm组件 -->
        <div class="card-header">
          <h4 class="card-title">规则详情</h4>
          <span class="badge badge-primary">{{ selectedItem.contentType }}</span>
        </div>
        <div class="card-body">
          <div class="form-preview">
            <div class="form-group">
              <label>触发词</label>
              <div class="preview-value">{{ selectedItem.trigger }}</div>
            </div>
            <div class="form-group">
              <label>内容</label>
              <div class="preview-value content-box">{{ selectedItem.content }}</div>
            </div>
            <div class="form-group" v-if="selectedItem.tags && selectedItem.tags.length > 0">
              <label>标签</label>
              <div class="preview-value tags-box">
                <span
                  v-for="tag in selectedItem.tags"
                  :key="tag"
                  class="badge badge-primary"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="form-group meta-info">
              <div class="meta-item">
                <span class="meta-label">创建时间</span>
                <span class="meta-value">{{ formatDate(selectedItem.createdAt) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">更新时间</span>
                <span class="meta-value">{{ formatDate(selectedItem.updatedAt) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">ID</span>
                <span class="meta-value id-value">{{ selectedItem.id }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="selectedItem.type === 'group'" class="group-edit-form card">
        <!-- 这里将来会使用GroupEditForm组件 -->
        <div class="card-header">
          <h4 class="card-title">分组详情</h4>
          <span class="badge badge-secondary">分组</span>
        </div>
        <div class="card-body">
          <div class="form-preview">
            <div class="form-group">
              <label>名称</label>
              <div class="preview-value">{{ selectedItem.name }}</div>
            </div>
            <div class="form-group" v-if="selectedItem.prefix">
              <label>前缀</label>
              <div class="preview-value">{{ selectedItem.prefix }}</div>
            </div>
            <div class="form-group">
              <label>子项目</label>
              <div class="preview-value">{{ selectedItem.children.length }} 项</div>
            </div>
            <div class="form-group meta-info">
              <div class="meta-item">
                <span class="meta-label">创建时间</span>
                <span class="meta-value">{{ formatDate(selectedItem.createdAt) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">更新时间</span>
                <span class="meta-value">{{ formatDate(selectedItem.updatedAt) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">ID</span>
                <span class="meta-value id-value">{{ selectedItem.id }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';

const store = useEspansoStore();
const selectedItem = computed(() => store.selectedItem);
const loading = computed(() => store.loading);

// 标题
const headerTitle = computed(() => {
  if (!selectedItem.value) return '详情';

  if (selectedItem.value.type === 'rule') {
    return `编辑规则: ${selectedItem.value.trigger}`;
  } else if (selectedItem.value.type === 'group') {
    return `编辑分组: ${selectedItem.value.name}`;
  }

  return '详情';
});

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

// 保存项目
const saveItem = () => {
  // 这里将在后续任务中实现
  console.log('保存项目', selectedItem.value?.id);
};

// 删除项目
const deleteItem = () => {
  // 这里将在后续任务中实现
  console.log('删除项目', selectedItem.value?.id);
};
</script>

<style>
.right-pane-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
}

.right-pane-header {
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--border-color);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-color);
}

.header-actions {
  display: flex;
  gap: var(--spacing-2);
}

.right-pane-content {
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

.rule-edit-form, .group-edit-form {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-light-color);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-color);
}

.card-body {
  padding: var(--spacing-4);
}

.form-preview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-group label {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.preview-value {
  padding: var(--spacing-3);
  background-color: var(--background-light-color);
  border-radius: var(--radius);
  font-size: 0.875rem;
  color: var(--text-color);
  line-height: 1.5;
}

.content-box {
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.tags-box {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}

.meta-info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-3);
  margin-top: var(--spacing-2);
  padding: var(--spacing-3);
  background-color: var(--background-light-color);
  border-radius: var(--radius);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.meta-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.meta-value {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.id-value {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
  word-break: break-all;
}

pre {
  background-color: var(--background-dark-color);
  padding: var(--spacing-4);
  border-radius: var(--radius);
  overflow-x: auto;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-color);
}
</style>
