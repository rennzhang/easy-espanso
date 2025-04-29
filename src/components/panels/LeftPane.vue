<template>
  <div class="flex flex-col h-full">
    <div class="flex justify-end items-center p-2 border-b border-border">
      <Button
        variant="ghost"
        size="icon"
        @click="toggleLeftMenu"
        :title="leftMenuCollapsed ? '展开菜单' : '收起菜单'"
        class="h-6 w-6"
      >
        <ChevronLeftIcon v-if="!leftMenuCollapsed" class="h-4 w-4" />
        <ChevronRightIcon v-else class="h-4 w-4" />
      </Button>
    </div>

    <div class="flex-1 overflow-y-auto p-3" :class="{ 'p-2': leftMenuCollapsed }">
      <div class="mb-6" v-if="!leftMenuCollapsed">
        <div class="flex justify-between items-center mb-2">
          <h4 class="text-xs font-semibold uppercase text-muted-foreground tracking-wider m-0">导航</h4>
        </div>
        <div class="flex flex-col gap-1">
          <Button
            variant="ghost"
            :class="{ 'bg-primary/10 text-primary font-medium': activeSection === 'dashboard' }"
            @click="setActiveSection('dashboard')"
            class="justify-start"
          >
            <LayoutDashboardIcon class="mr-2 h-4 w-4" />
            仪表盘
          </Button>
          <Button
            variant="ghost"
            :class="{ 'bg-primary/10 text-primary font-medium': activeSection === 'rules' }"
            @click="setActiveSection('rules')"
            class="justify-start"
          >
            <FileTextIcon class="mr-2 h-4 w-4" />
            规则管理
          </Button>
          <Button
            variant="ghost"
            :class="{ 'bg-primary/10 text-primary font-medium': activeSection === 'settings' }"
            @click="setActiveSection('settings')"
            class="justify-start"
          >
            <SettingsIcon class="mr-2 h-4 w-4" />
            设置
          </Button>
        </div>
      </div>

      <div class="h-px bg-border my-4" v-if="!leftMenuCollapsed"></div>

      <div class="mb-6" v-if="!leftMenuCollapsed">
        <div class="flex justify-between items-center mb-2">
          <h4 class="text-xs font-semibold uppercase text-muted-foreground tracking-wider m-0">标签过滤</h4>
          <Button
            variant="ghost"
            size="sm"
            @click="clearTagFilters"
            v-if="activeTagFilters.length > 0"
            class="h-6 text-xs"
          >
            清除
          </Button>
        </div>

        <div class="flex flex-col gap-1 mt-2">
          <div
            v-for="tag in allTags"
            :key="tag"
            class="flex items-center px-2 py-1 rounded-md cursor-pointer text-sm transition-colors"
            :class="{ 'bg-primary/10 text-primary': isTagActive(tag), 'text-muted-foreground hover:bg-muted': !isTagActive(tag) }"
            @click="toggleTagFilter(tag)"
          >
            <CheckIcon v-if="isTagActive(tag)" class="mr-1 h-3 w-3" />
            <span class="flex-1">{{ tag }}</span>
            <Badge
              variant="outline"
              :class="{ 'bg-primary text-primary-foreground': isTagActive(tag) }"
              class="text-xs min-w-6 h-6 flex items-center justify-center"
            >
              {{ getTagCount(tag) }}
            </Badge>
          </div>

          <div class="py-4 text-center text-muted-foreground text-sm" v-if="allTags.length === 0">
            <p>没有可用的标签</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col items-center gap-3" v-if="leftMenuCollapsed">
        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-primary/10 text-primary': activeSection === 'dashboard' }"
          @click="setActiveSection('dashboard')"
          title="仪表盘"
        >
          <LayoutDashboardIcon class="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-primary/10 text-primary': activeSection === 'rules' }"
          @click="setActiveSection('rules')"
          title="规则管理"
        >
          <FileTextIcon class="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-primary/10 text-primary': activeSection === 'settings' }"
          @click="setActiveSection('settings')"
          title="设置"
        >
          <SettingsIcon class="h-5 w-5" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutDashboardIcon,
  FileTextIcon,
  SettingsIcon,
  CheckIcon
} from 'lucide-vue-next';
import Button from '../ui/button.vue';
import Badge from '../ui/badge.vue';

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
