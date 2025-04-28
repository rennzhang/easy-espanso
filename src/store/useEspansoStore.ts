import { defineStore } from 'pinia';
import {
  EspansoConfig,
  EspansoRule,
  EspansoGroup,
  BaseItem,
  EspansoFile,
  EspansoOptions,
  GlobalVariable
} from '../types/espanzo-config';

// 定义Espanso Store
export const useEspansoStore = defineStore('espanso', {
  // 状态
  state: () => ({
    config: null as EspansoConfig | null,
    configFilePath: '' as string,
    configFiles: [] as EspansoFile[],
    loading: false as boolean,
    error: null as string | null,
    leftMenuCollapsed: false as boolean,
    selectedItemId: null as string | null,
    middlePaneFilterTags: [] as string[],
    searchQuery: '' as string,
    activeSection: 'rules' as 'dashboard' | 'rules' | 'settings'
  }),

  // Getters
  getters: {
    // 获取所有标签的唯一列表
    allTags(): string[] {
      if (!this.config) return [];

      const tags = new Set<string>();

      // 递归函数，遍历所有规则收集标签
      const collectTags = (items: Array<EspansoRule | EspansoGroup>) => {
        for (const item of items) {
          if (item.type === 'rule' && item.tags) {
            item.tags.forEach(tag => tags.add(tag));
          } else if (item.type === 'group' && item.children) {
            collectTags(item.children);
          }
        }
      };

      if (this.config.root && this.config.root.children) {
        collectTags(this.config.root.children);
      }

      return Array.from(tags).sort();
    },

    // 获取选中的项目
    selectedItem(): BaseItem | null {
      if (!this.config || !this.selectedItemId) return null;

      let selected: BaseItem | null = null;

      // 递归函数，查找选中的项目
      const findSelected = (items: Array<EspansoRule | EspansoGroup>) => {
        for (const item of items) {
          if (item.id === this.selectedItemId) {
            selected = item;
            return true;
          }

          if (item.type === 'group' && item.children) {
            if (findSelected(item.children)) {
              return true;
            }
          }
        }

        return false;
      };

      if (this.config.root && this.config.root.children) {
        findSelected(this.config.root.children);
      }

      return selected;
    },

    // 获取全局变量
    globalVars(): GlobalVariable[] {
      if (!this.config || !this.config.global_vars) return [];
      return this.config.global_vars;
    },

    // 获取配置选项
    options(): EspansoOptions | undefined {
      if (!this.config) return undefined;
      return this.config.options;
    },

    // 获取规则数量
    rulesCount(): number {
      if (!this.config) return 0;

      let count = 0;

      // 递归函数，计算规则数量
      const countRules = (items: Array<EspansoRule | EspansoGroup>) => {
        for (const item of items) {
          if (item.type === 'rule') {
            count++;
          } else if (item.type === 'group' && item.children) {
            countRules(item.children);
          }
        }
      };

      if (this.config.root && this.config.root.children) {
        countRules(this.config.root.children);
      }

      return count;
    },

    // 获取分组数量
    groupsCount(): number {
      if (!this.config) return 0;

      let count = 0;

      // 递归函数，计算分组数量
      const countGroups = (items: Array<EspansoRule | EspansoGroup>) => {
        for (const item of items) {
          if (item.type === 'group') {
            count++;
            if (item.children) {
              countGroups(item.children);
            }
          }
        }
      };

      if (this.config.root && this.config.root.children) {
        countGroups(this.config.root.children);
      }

      return count;
    },

    // 获取配置文件数量
    configFilesCount(): number {
      return this.configFiles.length;
    }
  },

  // Actions
  actions: {
    // 加载配置文件
    async loadConfig(filePath?: string) {
      // 这里将在任务1.4后实现
      this.loading = true;
      this.error = null;

      try {
        // 模拟加载成功
        setTimeout(() => {
          // 创建一个简单的示例配置
          this.config = {
            root: {
              id: 'root',
              type: 'group',
              name: 'Root',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              parentId: 'root',
              children: []
            }
          };

          if (filePath) {
            this.configFilePath = filePath;
          }

          this.loading = false;
        }, 500);
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        this.loading = false;
      }
    },

    // 保存配置文件
    async saveConfig() {
      // 这里将在任务1.4后实现
      this.loading = true;
      this.error = null;

      try {
        // 模拟保存成功
        setTimeout(() => {
          this.loading = false;
        }, 500);
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        this.loading = false;
      }
    },

    // 添加新规则
    addRule(rule: Partial<EspansoRule>) {
      if (!this.config) return;

      const newRule: EspansoRule = {
        id: crypto.randomUUID(),
        type: 'rule',
        trigger: rule.trigger || '',
        replace: rule.replace || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...rule
      };

      this.config.root.children.push(newRule);
      this.selectItem(newRule.id);
    },

    // 添加新分组
    addGroup(group: Partial<EspansoGroup>) {
      if (!this.config) return;

      const newGroup: EspansoGroup = {
        id: crypto.randomUUID(),
        type: 'group',
        name: group.name || 'New Group',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        parentId: 'root',
        children: [],
        ...group
      };

      this.config.root.children.push(newGroup);
      this.selectItem(newGroup.id);
    },

    // 更新规则
    updateRule(ruleId: string, updates: Partial<EspansoRule>) {
      if (!this.config) return;

      const updateRuleRecursive = (items: Array<EspansoRule | EspansoGroup>) => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type === 'rule' && item.id === ruleId) {
            items[i] = { ...item, ...updates, updatedAt: Date.now() } as EspansoRule;
            return true;
          } else if (item.type === 'group' && item.children) {
            if (updateRuleRecursive(item.children)) {
              return true;
            }
          }
        }
        return false;
      };

      if (this.config.root && this.config.root.children) {
        updateRuleRecursive(this.config.root.children);
      }
    },

    // 更新分组
    updateGroup(groupId: string, updates: Partial<EspansoGroup>) {
      if (!this.config) return;

      const updateGroupRecursive = (items: Array<EspansoRule | EspansoGroup>) => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type === 'group' && item.id === groupId) {
            items[i] = { ...item, ...updates, updatedAt: Date.now() } as EspansoGroup;
            return true;
          } else if (item.type === 'group' && item.children) {
            if (updateGroupRecursive(item.children)) {
              return true;
            }
          }
        }
        return false;
      };

      if (this.config.root && this.config.root.children) {
        updateGroupRecursive(this.config.root.children);
      }
    },

    // 删除项目
    deleteItem(itemId: string) {
      if (!this.config) return;

      const deleteItemRecursive = (items: Array<EspansoRule | EspansoGroup>) => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.id === itemId) {
            items.splice(i, 1);
            return true;
          } else if (item.type === 'group' && item.children) {
            if (deleteItemRecursive(item.children)) {
              return true;
            }
          }
        }
        return false;
      };

      if (this.config.root && this.config.root.children) {
        deleteItemRecursive(this.config.root.children);
      }

      // 如果删除的是当前选中的项目，清除选中状态
      if (this.selectedItemId === itemId) {
        this.selectedItemId = null;
      }
    },

    // 移动项目
    moveItem(itemId: string, targetGroupId: string, position?: number) {
      if (!this.config) return;

      // 查找项目
      let itemToMove: EspansoRule | EspansoGroup | null = null;
      let sourceGroupId: string | null = null;

      const findItemRecursive = (items: Array<EspansoRule | EspansoGroup>, parentId: string) => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.id === itemId) {
            itemToMove = { ...item };
            sourceGroupId = parentId;
            items.splice(i, 1);
            return true;
          } else if (item.type === 'group' && item.children) {
            if (findItemRecursive(item.children, item.id)) {
              return true;
            }
          }
        }
        return false;
      };

      // 查找目标分组
      let targetGroup: EspansoGroup | null = null;

      const findTargetGroupRecursive = (items: Array<EspansoRule | EspansoGroup>) => {
        for (const item of items) {
          if (item.type === 'group' && item.id === targetGroupId) {
            targetGroup = item;
            return true;
          } else if (item.type === 'group' && item.children) {
            if (findTargetGroupRecursive(item.children)) {
              return true;
            }
          }
        }
        return false;
      };

      // 查找并移除项目
      if (this.config.root && this.config.root.children) {
        findItemRecursive(this.config.root.children, 'root');
      }

      // 如果找到了项目
      if (itemToMove) {
        // 如果目标是根分组
        if (targetGroupId === 'root') {
          if (position !== undefined && position >= 0 && position <= this.config.root.children.length) {
            this.config.root.children.splice(position, 0, itemToMove);
          } else {
            this.config.root.children.push(itemToMove);
          }

          // 如果是分组，更新parentId
          if (itemToMove.type === 'group') {
            itemToMove.parentId = 'root';
          }
        } else {
          // 查找目标分组
          if (this.config.root && this.config.root.children) {
            findTargetGroupRecursive(this.config.root.children);
          }

          // 如果找到了目标分组
          if (targetGroup) {
            if (position !== undefined && position >= 0 && position <= targetGroup.children.length) {
              targetGroup.children.splice(position, 0, itemToMove);
            } else {
              targetGroup.children.push(itemToMove);
            }

            // 如果是分组，更新parentId
            if (itemToMove.type === 'group') {
              itemToMove.parentId = targetGroup.id;
            }
          }
        }
      }
    },

    // 设置搜索查询
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },

    // 设置活动部分
    setActiveSection(section: 'dashboard' | 'rules' | 'settings') {
      this.activeSection = section;
    },

    // 选择项目
    selectItem(itemId: string | null) {
      this.selectedItemId = itemId;
    },

    // 设置左侧菜单折叠状态
    setLeftMenuCollapsed(collapsed: boolean) {
      this.leftMenuCollapsed = collapsed;
    },

    // 设置中间面板的标签过滤器
    setMiddlePaneFilterTags(tags: string[]) {
      this.middlePaneFilterTags = tags;
    }
  }
});
