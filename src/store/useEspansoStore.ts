import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import {
  EspansoConfig,
  EspansoRule,
  EspansoGroup,
  BaseItem,
  EspansoFile,
  EspansoOptions,
  GlobalVariable
} from '../types/espanso-config';

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
    activeSection: 'rules' as 'dashboard' | 'rules' | 'settings',
    undoStack: [] as EspansoConfig[], // 存储历史状态以支持撤销
    redoStack: [] as EspansoConfig[], // 存储已撤销的状态以支持重做
    lastSavedState: null as EspansoConfig | null, // 最后保存的状态
    hasUnsavedChanges: false as boolean // 是否有未保存的更改
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
    },

    // 获取过滤后的项目列表
    filteredItems(): Array<EspansoRule | EspansoGroup> {
      if (!this.config) return [];

      // 如果没有搜索词和标签过滤，返回所有项目
      if (!this.searchQuery && this.middlePaneFilterTags.length === 0) {
        return this.config.root.children;
      }

      const result: Array<EspansoRule | EspansoGroup> = [];

      // 递归函数，根据条件过滤项目
      const filterItems = (items: Array<EspansoRule | EspansoGroup>) => {
        for (const item of items) {
          let matchesSearch = true;
          let matchesTags = true;

          // 搜索词过滤
          if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            
            if (item.type === 'rule') {
              // 规则搜索逻辑
              const rule = item as EspansoRule;
              const triggerMatch = rule.trigger && rule.trigger.toLowerCase().includes(query);
              const replaceMatch = rule.replace && rule.replace.toLowerCase().includes(query);
              const contentMatch = rule.content && typeof rule.content === 'string' && rule.content.toLowerCase().includes(query);
              const labelMatch = rule.label && rule.label.toLowerCase().includes(query);
              
              matchesSearch = triggerMatch || replaceMatch || contentMatch || labelMatch;
            } else {
              // 分组搜索逻辑
              const group = item as EspansoGroup;
              matchesSearch = group.name.toLowerCase().includes(query) || 
                             (group.label && group.label.toLowerCase().includes(query));
              
              // 如果分组本身不匹配，但其子项可能匹配，递归检查
              if (!matchesSearch && group.children) {
                const matchingChildren = [];
                filterItems(group.children).forEach(child => matchingChildren.push(child));
                
                if (matchingChildren.length > 0) {
                  // 如果有匹配的子项，将分组添加到结果中
                  const clonedGroup: EspansoGroup = { ...group, children: matchingChildren };
                  result.push(clonedGroup);
                  continue; // 跳过当前项的其余处理
                }
              }
            }
          }

          // 标签过滤
          if (this.middlePaneFilterTags.length > 0) {
            if (item.type === 'rule' && item.tags) {
              // 检查规则的标签是否包含任何一个过滤标签
              matchesTags = this.middlePaneFilterTags.some(tag => item.tags?.includes(tag));
            } else if (item.type === 'group' && item.children) {
              // 如果分组本身不包含标签，但其子项可能包含，递归检查
              const matchingChildren = [];
              filterItems(item.children).forEach(child => matchingChildren.push(child));
              
              if (matchingChildren.length > 0) {
                // 如果有匹配的子项，将分组添加到结果中
                const clonedGroup: EspansoGroup = { ...item, children: matchingChildren };
                result.push(clonedGroup);
                continue; // 跳过当前项的其余处理
              }
              
              matchesTags = false;
            } else {
              matchesTags = false;
            }
          }

          // 如果同时满足搜索词和标签过滤条件，添加到结果中
          if (matchesSearch && matchesTags) {
            result.push(item);
          }
        }
      };

      if (this.config.root && this.config.root.children) {
        filterItems(this.config.root.children);
      }

      return result;
    }
  },

  // Actions
  actions: {
    // 保存当前状态到历史堆栈
    saveStateToHistory() {
      if (!this.config) return;
      
      // 深拷贝当前配置，确保历史状态与当前状态完全独立
      const configCopy = JSON.parse(JSON.stringify(this.config));
      this.undoStack.push(configCopy);
      
      // 清空重做堆栈，因为新的操作会使之前的重做无效
      this.redoStack = [];
      
      // 设置未保存更改标志
      this.hasUnsavedChanges = true;
    },

    // 撤销操作
    undo() {
      if (this.undoStack.length === 0) return;
      
      // 保存当前状态到重做堆栈
      if (this.config) {
        const configCopy = JSON.parse(JSON.stringify(this.config));
        this.redoStack.push(configCopy);
      }
      
      // 恢复上一个状态
      this.config = this.undoStack.pop() || null;
    },

    // 重做操作
    redo() {
      if (this.redoStack.length === 0) return;
      
      // 保存当前状态到撤销堆栈
      if (this.config) {
        const configCopy = JSON.parse(JSON.stringify(this.config));
        this.undoStack.push(configCopy);
      }
      
      // 恢复下一个状态
      this.config = this.redoStack.pop() || null;
    },

    // 加载配置文件
    async loadConfig(filePath?: string) {
      this.loading = true;
      this.error = null;

      try {
        // 如果提供了文件路径，直接加载该文件
        if (filePath) {
          const content = await window.preloadApi?.readFile(filePath);
          if (content) {
            const yamlData = window.preloadApi?.parseYaml(content);
            if (yamlData) {
              // 使用espanso-converter.ts中的函数将YAML数据转换为内部格式
              const { convertToInternalFormat } = await import('../utils/espanso-converter');
              this.config = convertToInternalFormat(yamlData);
              this.configFilePath = filePath;
              
              // 存储加载的状态作为最后保存的状态
              this.lastSavedState = JSON.parse(JSON.stringify(this.config));
              this.hasUnsavedChanges = false;
              
              // 清空历史堆栈
              this.undoStack = [];
              this.redoStack = [];
            }
          }
        } else {
          // 否则，尝试加载Espanso配置目录中的文件
          const configFiles = await window.preloadApi?.getEspansoConfigFiles();
          if (configFiles && configFiles.length > 0) {
            this.configFiles = configFiles;

            // 查找默认的match文件（通常是base.yml）
            const defaultMatchFile = configFiles.find(file =>
              file.type === 'match' && (file.name === 'base.yml' || file.name === 'default.yml')
            );

            if (defaultMatchFile) {
              const yamlData = window.preloadApi?.parseYaml(defaultMatchFile.content);
              if (yamlData) {
                // 使用espanso-converter.ts中的函数将YAML数据转换为内部格式
                const { convertToInternalFormat } = await import('../utils/espanso-converter');
                this.config = convertToInternalFormat(yamlData);
                this.configFilePath = defaultMatchFile.path;
                
                // 存储加载的状态作为最后保存的状态
                this.lastSavedState = JSON.parse(JSON.stringify(this.config));
                this.hasUnsavedChanges = false;
                
                // 清空历史堆栈
                this.undoStack = [];
                this.redoStack = [];
              }
            } else if (configFiles[0]) {
              // 如果没有找到默认文件，使用第一个文件
              const yamlData = window.preloadApi?.parseYaml(configFiles[0].content);
              if (yamlData) {
                // 使用espanso-converter.ts中的函数将YAML数据转换为内部格式
                const { convertToInternalFormat } = await import('../utils/espanso-converter');
                this.config = convertToInternalFormat(yamlData);
                this.configFilePath = configFiles[0].path;
                
                // 存储加载的状态作为最后保存的状态
                this.lastSavedState = JSON.parse(JSON.stringify(this.config));
                this.hasUnsavedChanges = false;
                
                // 清空历史堆栈
                this.undoStack = [];
                this.redoStack = [];
              }
            }
          } else {
            // 如果没有找到任何配置文件，创建一个空的配置
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

            // 尝试获取Espanso配置目录
            const configDir = window.preloadApi?.getEspansoConfigDir();
            if (configDir) {
              this.configFilePath = `${configDir}/match/base.yml`;
            }
            
            // 存储加载的状态作为最后保存的状态
            this.lastSavedState = JSON.parse(JSON.stringify(this.config));
            this.hasUnsavedChanges = false;
            
            // 清空历史堆栈
            this.undoStack = [];
            this.redoStack = [];
          }
        }

        // 显示通知
        window.preloadApi?.showNotification('配置加载成功');
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        window.preloadApi?.showNotification(`配置加载失败: ${this.error}`);
      } finally {
        this.loading = false;
      }
    },

    // 保存配置文件
    async saveConfig(filePath?: string) {
      this.loading = true;
      this.error = null;

      try {
        if (!this.config) {
          throw new Error('没有配置可保存');
        }

        // 确定保存路径
        const savePath = filePath || this.configFilePath;
        if (!savePath) {
          // 如果没有指定保存路径，显示保存对话框
          const result = await window.preloadApi?.showSaveDialog({
            title: '保存Espanso配置',
            defaultPath: `${window.preloadApi?.getEspansoConfigDir()}/match/base.yml`,
            filters: [
              { name: 'YAML Files', extensions: ['yml', 'yaml'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          });

          if (result && !result.canceled && result.filePath) {
            this.configFilePath = result.filePath;
          } else {
            // 用户取消了保存
            this.loading = false;
            return;
          }
        }

        // 将内部格式转换为YAML数据
        const { convertToEspansoFormat } = await import('../utils/espanso-converter');
        const yamlData = convertToEspansoFormat(this.config);

        // 序列化为YAML字符串
        const yamlContent = window.preloadApi?.serializeYaml(yamlData);
        if (yamlContent) {
          // 写入文件
          await window.preloadApi?.writeFile(this.configFilePath, yamlContent);

          // 显示通知
          window.preloadApi?.showNotification('配置保存成功');
          
          // 更新最后保存的状态
          this.lastSavedState = JSON.parse(JSON.stringify(this.config));
          this.hasUnsavedChanges = false;
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        window.preloadApi?.showNotification(`配置保存失败: ${this.error}`);
      } finally {
        this.loading = false;
      }
    },

    // 添加新的项目（规则或分组）到指定分组
    addItem(parentGroupId: string = 'root', type: 'rule' | 'group', initialData: Partial<EspansoRule | EspansoGroup> = {}) {
      if (!this.config) return null;
      
      // 保存当前状态到历史堆栈
      this.saveStateToHistory();
      
      const now = Date.now();
      let newItem: EspansoRule | EspansoGroup;
      
      if (type === 'rule') {
        // 创建规则
        newItem = {
          id: uuidv4(),
          type: 'rule',
          trigger: '',
          replace: '',
          contentType: 'plain',
          content: '',
          createdAt: now,
          updatedAt: now,
          ...(initialData as Partial<EspansoRule>)
        } as EspansoRule;
      } else {
        // 创建分组
        newItem = {
          id: uuidv4(),
          type: 'group',
          name: initialData.name as string || '新分组',
          createdAt: now,
          updatedAt: now,
          parentId: parentGroupId,
          children: [],
          ...(initialData as Partial<EspansoGroup>)
        } as EspansoGroup;
      }
      
      // 查找父分组并添加新项目
      if (parentGroupId === 'root') {
        // 直接添加到根分组
        this.config.root.children.push(newItem);
      } else {
        // 递归查找父分组
        const addToParentRecursive = (items: Array<EspansoRule | EspansoGroup>): boolean => {
          for (const item of items) {
            if (item.type === 'group' && item.id === parentGroupId) {
              (item as EspansoGroup).children.push(newItem);
              return true;
            } else if (item.type === 'group' && item.children) {
              if (addToParentRecursive(item.children)) {
                return true;
              }
            }
          }
          return false;
        };
        
        if (this.config.root && this.config.root.children) {
          if (!addToParentRecursive(this.config.root.children)) {
            // 如果找不到父分组，添加到根分组
            this.config.root.children.push(newItem);
          }
        }
      }
      
      // 选中新添加的项目
      this.selectItem(newItem.id);
      
      return newItem.id;
    },

    // 添加新规则
    addRule(rule: Partial<EspansoRule>, parentGroupId: string = 'root') {
      return this.addItem(parentGroupId, 'rule', rule);
    },

    // 添加新分组
    addGroup(group: Partial<EspansoGroup>, parentGroupId: string = 'root') {
      return this.addItem(parentGroupId, 'group', group);
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
      
      // 保存当前状态到历史堆栈
      this.saveStateToHistory();

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
    
    // 统一的更新项目方法
    updateItem(itemId: string, updates: Partial<EspansoRule | EspansoGroup>) {
      if (!this.config) return;
      
      // 保存当前状态到历史堆栈
      this.saveStateToHistory();
      
      // 递归查找和更新项目
      const updateItemRecursive = (items: Array<EspansoRule | EspansoGroup>): boolean => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.id === itemId) {
            // 更新时间戳
            const updatedItem = { 
              ...item, 
              ...updates, 
              updatedAt: Date.now() 
            };
            
            // 替换项目
            items[i] = updatedItem;
            return true;
          } else if (item.type === 'group' && item.children) {
            if (updateItemRecursive(item.children)) {
              return true;
            }
          }
        }
        return false;
      };
      
      if (this.config.root && this.config.root.children) {
        updateItemRecursive(this.config.root.children);
      }
    },

    // 批量删除项目
    batchDeleteItems(itemIds: string[]) {
      if (!this.config || itemIds.length === 0) return;
      
      // 保存当前状态到历史堆栈
      this.saveStateToHistory();
      
      // 遍历所有要删除的项目ID
      for (const itemId of itemIds) {
        this.deleteItem(itemId);
      }
    },
    
    // 批量更新项目
    batchUpdateItems(updates: Array<{id: string, data: Partial<EspansoRule | EspansoGroup>}>) {
      if (!this.config || updates.length === 0) return;
      
      // 保存当前状态到历史堆栈
      this.saveStateToHistory();
      
      // 遍历所有要更新的项目
      for (const update of updates) {
        this.updateItem(update.id, update.data);
      }
    },
    
    // 根据条件查找项目
    findItems(criteria: {
      type?: 'rule' | 'group',
      tags?: string[],
      search?: string,
      modifiedAfter?: number,
      modifiedBefore?: number
    }): Array<EspansoRule | EspansoGroup> {
      if (!this.config) return [];
      
      const results: Array<EspansoRule | EspansoGroup> = [];
      
      // 递归查找满足条件的项目
      const findItemsRecursive = (items: Array<EspansoRule | EspansoGroup>) => {
        for (const item of items) {
          let matches = true;
          
          // 类型过滤
          if (criteria.type && item.type !== criteria.type) {
            matches = false;
          }
          
          // 标签过滤
          if (matches && criteria.tags && criteria.tags.length > 0) {
            if (!item.tags || !criteria.tags.some(tag => item.tags?.includes(tag))) {
              matches = false;
            }
          }
          
          // 搜索过滤
          if (matches && criteria.search) {
            const searchTerm = criteria.search.toLowerCase();
            if (item.type === 'rule') {
              const rule = item as EspansoRule;
              const triggerMatch = rule.trigger && rule.trigger.toLowerCase().includes(searchTerm);
              const replaceMatch = rule.replace && rule.replace.toLowerCase().includes(searchTerm);
              const contentMatch = rule.content && typeof rule.content === 'string' && rule.content.toLowerCase().includes(searchTerm);
              const labelMatch = rule.label && rule.label.toLowerCase().includes(searchTerm);
              
              if (!(triggerMatch || replaceMatch || contentMatch || labelMatch)) {
                matches = false;
              }
            } else {
              const group = item as EspansoGroup;
              const nameMatch = group.name.toLowerCase().includes(searchTerm);
              const labelMatch = group.label && group.label.toLowerCase().includes(searchTerm);
              
              if (!(nameMatch || labelMatch)) {
                matches = false;
              }
            }
          }
          
          // 修改时间过滤
          if (matches && (criteria.modifiedAfter || criteria.modifiedBefore)) {
            if (criteria.modifiedAfter && item.updatedAt < criteria.modifiedAfter) {
              matches = false;
            }
            if (criteria.modifiedBefore && item.updatedAt > criteria.modifiedBefore) {
              matches = false;
            }
          }
          
          // 如果满足所有条件，添加到结果中
          if (matches) {
            results.push(item);
          }
          
          // 递归处理子项目
          if (item.type === 'group' && item.children) {
            findItemsRecursive(item.children);
          }
        }
      };
      
      if (this.config.root && this.config.root.children) {
        findItemsRecursive(this.config.root.children);
      }
      
      return results;
    },

    // 导出配置到文件
    async exportConfig(filePath?: string) {
      if (!this.config) return;
      
      try {
        this.loading = true;
        
        // 确定导出路径
        let exportPath = filePath;
        if (!exportPath) {
          const result = await window.preloadApi?.showSaveDialog({
            title: '导出Espanso配置',
            defaultPath: 'espanso-export.yml',
            filters: [
              { name: 'YAML Files', extensions: ['yml', 'yaml'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          });
          
          if (result && !result.canceled && result.filePath) {
            exportPath = result.filePath;
          } else {
            // 用户取消了导出
            return;
          }
        }
        
        // 将内部格式转换为YAML数据
        const { convertToEspansoFormat } = await import('../utils/espanso-converter');
        const yamlData = convertToEspansoFormat(this.config);
        
        // 序列化为YAML字符串
        const yamlContent = window.preloadApi?.serializeYaml(yamlData);
        if (yamlContent && exportPath) {
          // 写入文件
          await window.preloadApi?.writeFile(exportPath, yamlContent);
          
          // 显示通知
          window.preloadApi?.showNotification('配置导出成功');
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        window.preloadApi?.showNotification(`配置导出失败: ${this.error}`);
      } finally {
        this.loading = false;
      }
    },
    
    // 导入配置
    async importConfig(filePath?: string) {
      try {
        this.loading = true;
        
        // 确定导入路径
        let importPath = filePath;
        if (!importPath) {
          const result = await window.preloadApi?.showOpenDialog({
            title: '导入Espanso配置',
            filters: [
              { name: 'YAML Files', extensions: ['yml', 'yaml'] },
              { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
          });
          
          if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
            importPath = result.filePaths[0];
          } else {
            // 用户取消了导入
            return;
          }
        }
        
        // 读取文件内容
        const content = await window.preloadApi?.readFile(importPath);
        if (content) {
          // 保存当前状态到历史堆栈
          if (this.config) {
            this.saveStateToHistory();
          }
          
          // 解析YAML数据
          const yamlData = window.preloadApi?.parseYaml(content);
          if (yamlData) {
            // 转换为内部格式
            const { convertToInternalFormat } = await import('../utils/espanso-converter');
            this.config = convertToInternalFormat(yamlData);
            
            // 显示通知
            window.preloadApi?.showNotification('配置导入成功');
            
            // 设置未保存更改标志
            this.hasUnsavedChanges = true;
          }
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        window.preloadApi?.showNotification(`配置导入失败: ${this.error}`);
      } finally {
        this.loading = false;
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
