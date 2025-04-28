import { defineStore } from 'pinia';
import { EspansoConfig, EspansoRule, EspansoGroup, BaseItem } from '../types/espanzo-config';

// 定义Espanso Store
export const useEspansoStore = defineStore('espanso', {
  // 状态
  state: () => ({
    config: null as EspansoConfig | null,
    configFilePath: '' as string,
    loading: false as boolean,
    error: null as string | null,
    leftMenuCollapsed: false as boolean,
    selectedItemId: null as string | null,
    middlePaneFilterTags: [] as string[]
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
    }
  },

  // Actions
  actions: {
    // 加载配置文件
    async loadConfig(filePath?: string) {
      // 这里将在任务1.4后实现
      this.loading = true;
      this.error = null;
      
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
        
        this.loading = false;
      }, 500);
    },
    
    // 保存配置文件
    async saveConfig() {
      // 这里将在任务1.4后实现
      this.loading = true;
      this.error = null;
      
      // 模拟保存成功
      setTimeout(() => {
        this.loading = false;
      }, 500);
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
