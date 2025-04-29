import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Match, Group, EspansoConfig } from '../types/espanso';
import { PreloadApi } from '../types/preload';
import { cloneDeep } from 'lodash-es';
import { readFile, parseYaml, writeFile, serializeYaml } from '../services/fileService';

declare global {
  interface Window {
    preload: PreloadApi;
  }
}

interface State {
  config: EspansoConfig | null;
  configPath: string | null;
  selectedItemId: string | null;
  selectedItemType: 'match' | 'group' | null;
  searchQuery: string;
  selectedTags: string[];
  leftMenuCollapsed: boolean;
  lastSavedState: string | null;
  hasUnsavedChanges: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export const useEspansoStore = defineStore('espanso', () => {
  const state = ref<State>({
    config: null,
    configPath: null,
    selectedItemId: null,
    selectedItemType: null,
    searchQuery: '',
    selectedTags: [],
    leftMenuCollapsed: false,
    lastSavedState: null,
    hasUnsavedChanges: false,
    autoSaveStatus: 'idle'
  });

  const allItems = computed((): (Match | Group)[] => {
    if (!state.value.config) return [];
    return [...(state.value.config.matches || []), ...(state.value.config.groups || [])];
  });

  const filteredItems = computed((): (Match | Group)[] => {
    let items = allItems.value;
    
    if (state.value.searchQuery) {
      items = items.filter((item: Match | Group) => {
        if ('trigger' in item) {
          return (item as Match).trigger.toLowerCase().includes(state.value.searchQuery.toLowerCase());
        } else {
          return (item as Group).name.toLowerCase().includes(state.value.searchQuery.toLowerCase());
        }
      });
    }

    if (state.value.selectedTags.length > 0) {
      items = items.filter((item: Match | Group) => {
        if ('trigger' in item) {
          return state.value.selectedTags.includes('match');
            } else {
          return state.value.selectedTags.includes('group');
        }
      });
    }

    return items;
  });

  const findItemInGroup = (group: Group, id: string): Match | Group | null => {
    // Check matches
    if (group.matches) {
      const match = group.matches.find(m => m.id === id);
      if (match) return match;
    }

    // Check nested groups
    if (group.groups) {
      for (const nestedGroup of group.groups) {
        const item = findItemInGroup(nestedGroup, id);
        if (item) return item;
      }
    }

    return null;
  };

  const findItemById = (id: string): Match | Group | null => {
    if (!allItems.value) return null;
    const item = allItems.value.find(item => item.id === id);
    if (item) return item;

    // Search in nested groups
    for (const group of state.value.config?.groups || []) {
      const matchingChildren = findItemInGroup(group, id);
      if (matchingChildren) return matchingChildren;
    }

    return null;
  };

  const selectedItem = computed((): Match | Group | null => {
    if (!state.value.selectedItemId) return null;
    return findItemById(state.value.selectedItemId);
  });

  const loadConfig = async (configDirOrPath: string): Promise<void> => {
    try {
      // 判断是否是文件路径或者目录
      const isConfigFile = configDirOrPath.endsWith('.yml') || configDirOrPath.endsWith('.yaml');
      
      let configPath = configDirOrPath;
      
      // 如果是目录，则拼接默认配置文件路径
      if (!isConfigFile) {
        configPath = `${configDirOrPath}/config/default.yml`;
      }
      
      // 读取配置文件
      const configContent = await readFile(configPath);
      
      // 解析 YAML 文件
      const configData = await parseYaml(configContent);
      
      // 将配置数据转换为应用内部使用的格式
      const config: EspansoConfig = {
        matches: [],
        groups: [],
        ...configData
      };
      
      // 初始化匹配项和分组的 ID
      if (config.matches) {
        config.matches = config.matches.map((match, index) => ({
          ...match,
          id: `match-${index}`,
          type: 'match'
        }));
      }
      
      if (config.groups) {
        config.groups = config.groups.map((group, index) => ({
          ...group,
          id: `group-${index}`,
          type: 'group'
        }));
      }
      
      // 更新状态
      state.value.config = config;
      state.value.configPath = configPath;
      state.value.lastSavedState = JSON.stringify(config, null, 2);
      state.value.hasUnsavedChanges = false;
      
      console.log('配置加载成功:', config);
    } catch (error) {
      console.error('配置加载失败:', error);
      throw error;
    }
  };

  const autoSaveConfig = async () => {
    if (!state.value.hasUnsavedChanges || !state.value.config || !state.value.configPath) return;

    try {
      state.value.autoSaveStatus = 'saving';
      
      // 首先将配置对象序列化为 YAML 格式
      const yamlContent = await serializeYaml(state.value.config);
      
      // 然后写入到文件
      await writeFile(state.value.configPath, yamlContent);
      
      state.value.lastSavedState = JSON.stringify(state.value.config, null, 2);
      state.value.hasUnsavedChanges = false;
      state.value.autoSaveStatus = 'saved';
    } catch (error) {
      console.error('Auto-save failed:', error);
      state.value.autoSaveStatus = 'error';
    }
  };

  const updateConfigAndSave = async (updateFn: (config: EspansoConfig) => void) => {
    if (!state.value.config) return;

    const newConfig = cloneDeep(state.value.config);
    updateFn(newConfig);
    state.value.config = newConfig;
    state.value.hasUnsavedChanges = true;
    await autoSaveConfig();
  };

  const updateItem = async (item: Match | Group) => {
    await updateConfigAndSave(config => {
      if (!state.value.config) return;
      
      if ('trigger' in item) {
        const index = state.value.config.matches.findIndex(i => i.id === item.id);
        if (index !== -1) {
          state.value.config.matches[index] = item as Match;
              }
            } else {
        const index = state.value.config.groups.findIndex(i => i.id === item.id);
        if (index !== -1) {
          state.value.config.groups[index] = item as Group;
        }
      }
    });
  };

  const deleteItem = async (id: string, type: 'match' | 'group') => {
    await updateConfigAndSave(config => {
      if (!state.value.config) return;
      
      if (type === 'match') {
        const index = state.value.config.matches.findIndex(i => i.id === id);
        if (index !== -1) {
          state.value.config.matches.splice(index, 1);
        }
      } else {
        const index = state.value.config.groups.findIndex(i => i.id === id);
        if (index !== -1) {
          state.value.config.groups.splice(index, 1);
        }
      }
    });
  };

  const addItem = async (item: Match | Group) => {
    await updateConfigAndSave(config => {
      if (!state.value.config) return;
      
      if ('trigger' in item) {
        state.value.config.matches.push(item as Match);
          } else {
        state.value.config.groups.push(item as Group);
      }
    });
  };

  return {
    state,
    allItems,
    filteredItems,
    selectedItem,
    findItemById,
    findItemInGroup,
    loadConfig,
    autoSaveConfig,
    updateConfigAndSave,
    updateItem,
    deleteItem,
    addItem
  };
});
