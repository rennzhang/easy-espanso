<template>
  <div class="left-pane-container">
    <div class="left-pane-header">
      <button @click="toggleLeftMenu" class="btn-icon collapse-button" :title="leftMenuCollapsed ? '展开菜单' : '收起菜单'">
        <span v-if="leftMenuCollapsed">&#10095;</span>
        <span v-else>&#10094;</span>
      </button>
    </div>

    <div class="left-pane-content" :class="{ 'collapsed': leftMenuCollapsed }">
      <div class="section" v-if="!leftMenuCollapsed">
        <div class="section-header">
          <h4 class="section-title">导航</h4>
        </div>
        <div class="nav-items">
          <div class="nav-item" :class="{ 'active': activeSection === 'dashboard' }" @click="setActiveSection('dashboard')">
            <span class="nav-icon">📊</span>
            <span class="nav-text">仪表盘</span>
          </div>
          <div class="nav-item" :class="{ 'active': activeSection === 'rules' }" @click="setActiveSection('rules')">
            <span class="nav-icon">📝</span>
            <span class="nav-text">规则管理</span>
          </div>
          <div class="nav-item" :class="{ 'active': activeSection === 'settings' }" @click="setActiveSection('settings')">
            <span class="nav-icon">⚙️</span>
            <span class="nav-text">设置</span>
          </div>
        </div>
      </div>

      <div class="divider" v-if="!leftMenuCollapsed"></div>

      <div class="section" v-if="!leftMenuCollapsed">
        <div class="section-header">
          <h4 class="section-title">标签过滤</h4>
          <button class="btn-text btn-sm" @click="clearTagFilters" v-if="activeTagFilters.length > 0">
            清除
          </button>
        </div>

        <div class="tags-container">
          <div
            v-for="tag in allTags"
            :key="tag"
            class="tag-item"
            :class="{ 'active': isTagActive(tag) }"
            @click="toggleTagFilter(tag)"
          >
            <span class="tag-icon" v-if="isTagActive(tag)">✓</span>
            <span class="tag-text">{{ tag }}</span>
            <span class="tag-count">{{ getTagCount(tag) }}</span>
          </div>

          <div class="empty-state" v-if="allTags.length === 0">
            <p>没有可用的标签</p>
          </div>
        </div>
      </div>

      <div class="section collapsed-icons" v-if="leftMenuCollapsed">
        <div class="nav-item" :class="{ 'active': activeSection === 'dashboard' }" @click="setActiveSection('dashboard')" title="仪表盘">
          <span class="nav-icon">📊</span>
        </div>
        <div class="nav-item" :class="{ 'active': activeSection === 'rules' }" @click="setActiveSection('rules')" title="规则管理">
          <span class="nav-icon">📝</span>
        </div>
        <div class="nav-item" :class="{ 'active': activeSection === 'settings' }" @click="setActiveSection('settings')" title="设置">
          <span class="nav-icon">⚙️</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';

const store = useEspansoStore();
const leftMenuCollapsed = computed(() => store.leftMenuCollapsed);
const allTags = computed(() => store.allTags);
const activeTagFilters = computed(() => store.middlePaneFilterTags);

// 当前活动的导航项
const activeSection = ref('rules');

// 切换左侧菜单折叠状态
const toggleLeftMenu = () => {
  store.setLeftMenuCollapsed(!leftMenuCollapsed.value);
};

// 设置活动的导航项
const setActiveSection = (section: string) => {
  activeSection.value = section;
};

// 切换标签过滤
const toggleTagFilter = (tag: string) => {
  const currentTags = [...store.middlePaneFilterTags];
  const index = currentTags.indexOf(tag);

  if (index === -1) {
    currentTags.push(tag);
  } else {
    currentTags.splice(index, 1);
  }

  store.setMiddlePaneFilterTags(currentTags);
};

// 清除所有标签过滤
const clearTagFilters = () => {
  store.setMiddlePaneFilterTags([]);
};

// 检查标签是否激活
const isTagActive = (tag: string) => {
  return activeTagFilters.value.includes(tag);
};

// 获取标签的规则数量
const getTagCount = (tag: string) => {
  if (!store.config) return 0;

  let count = 0;
  const countRules = (items: any[]) => {
    for (const item of items) {
      if (item.type === 'rule' && item.tags && item.tags.includes(tag)) {
        count++;
      } else if (item.type === 'group' && item.children) {
        countRules(item.children);
      }
    }
  };

  if (store.config.root && store.config.root.children) {
    countRules(store.config.root.children);
  }

  return count;
};
</script>

<style>
.left-pane-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.left-pane-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: var(--spacing-2);
  border-bottom: 1px solid var(--border-color);
}

.collapse-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-secondary);
  padding: var(--spacing-1);
  border-radius: var(--radius-full);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition);
}

.collapse-button:hover {
  background-color: var(--background-hover);
  color: var(--text-color);
}

.left-pane-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-3);
}

.left-pane-content.collapsed {
  padding: var(--spacing-2);
}

.section {
  margin-bottom: var(--spacing-6);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin: 0;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.nav-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background-color var(--transition);
  color: var(--text-secondary);
}

.nav-item:hover {
  background-color: var(--background-hover);
  color: var(--text-color);
}

.nav-item.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
  font-weight: 500;
}

.nav-icon {
  margin-right: var(--spacing-2);
  font-size: 1.25rem;
}

.collapsed-icons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}

.collapsed-icons .nav-item {
  padding: var(--spacing-2);
  margin-right: 0;
}

.collapsed-icons .nav-icon {
  margin-right: 0;
}

.divider {
  height: 1px;
  background-color: var(--divider-color);
  margin: var(--spacing-4) 0;
}

.tags-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  margin-top: var(--spacing-2);
}

.tag-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background-color var(--transition);
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.tag-item:hover {
  background-color: var(--background-hover);
  color: var(--text-color);
}

.tag-item.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.tag-icon {
  margin-right: var(--spacing-1);
  font-size: 0.75rem;
}

.tag-text {
  flex: 1;
}

.tag-count {
  background-color: var(--background-dark-color);
  color: var(--text-muted);
  padding: 0 var(--spacing-1);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  min-width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-item.active .tag-count {
  background-color: var(--primary-color);
  color: white;
}

.empty-state {
  padding: var(--spacing-4);
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}
</style>
