import { defineStore } from 'pinia';
import { ref, computed, toRaw } from 'vue';
import { Match, Group, EspansoConfig } from '../types/espanso';
import { PreloadApi, FileInfo, YamlData } from '../types/preload';
import { cloneDeep } from 'lodash-es';
import {
  readFile, parseYaml, writeFile, serializeYaml,
  listFiles, scanDirectory, fileExists
} from '../services/fileService';

declare global {
  interface Window {
    preloadApi?: PreloadApi;
  }
}

// Configuration tree structure
export interface ConfigFileNode {
  type: 'file';
  name: string;
  path: string;
  fileType: 'match' | 'config' | 'package';
  content?: YamlData;
  matches?: Match[];
  groups?: Group[];
  id?: string;
}

export interface ConfigFolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: (ConfigFileNode | ConfigFolderNode)[];
  id?: string;
}

export type ConfigTreeNode = ConfigFileNode | ConfigFolderNode;

// Global configuration interface
export interface GlobalConfig {
  toggle_key?: string;
  backspace_limit?: number;
  keyboard_layout?: string;
  enable_passive?: boolean;
  passive_key?: string;
  passive_timeout?: number;
  show_notifications?: boolean;
  show_icon?: boolean;
  word_separators?: string[];
  undo_backspace?: boolean;
  preserve_clipboard?: boolean;
  restore_clipboard_delay?: number;
  backend?: string;
  paste_shortcut?: string;
  auto_restart?: boolean;
  [key: string]: any;
}

interface State {
  config: EspansoConfig | null;
  configPath: string | null;
  configRootDir: string | null;
  globalConfig: GlobalConfig | null;
  globalConfigPath: string | null;
  configTree: ConfigTreeNode[];
  selectedItemId: string | null;
  selectedItemType: 'match' | 'group' | null;
  searchQuery: string;
  selectedTags: string[];
  leftMenuCollapsed: boolean;
  lastSavedState: string | null;
  hasUnsavedChanges: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  loading: boolean;
  error: string | null;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'warning' | null;
  toastVisible: boolean;
  toastTimeoutId: ReturnType<typeof setTimeout> | null;
  hasUnsavedFileSystemChanges: boolean;
}

export const useEspansoStore = defineStore('espanso', () => {
  const state = ref<State>({
    config: null,
    configPath: null,
    configRootDir: null,
    globalConfig: null,
    globalConfigPath: null,
    configTree: [],
    selectedItemId: null,
    selectedItemType: null,
    searchQuery: '',
    selectedTags: [],
    leftMenuCollapsed: false,
    lastSavedState: null,
    hasUnsavedChanges: false,
    autoSaveStatus: 'idle',
    loading: false,
    error: null,
    toastMessage: null,
    toastType: null,
    toastVisible: false,
    toastTimeoutId: null,
    hasUnsavedFileSystemChanges: false,
  });

  let globalGuiOrderCounter = 0; // Define counter outside

  // --- Define helper functions outside computed/actions if possible, or ensure they are in scope ---
  const getAllMatchesFromTree = (): Match[] => {
    const matches: Match[] = [];
    const traverseTree = (nodes: ConfigTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          if (node.matches) {
            matches.push(...node.matches);
          }
        } else if (node.type === 'folder' && node.children) {
          traverseTree(node.children);
        }
      }
    };
    traverseTree(state.value.configTree);
    return matches;
  };

  const getAllGroupsFromTree = (): Group[] => {
    const groups: Group[] = [];
    const traverseTree = (nodes: ConfigTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          if (node.groups) {
            groups.push(...node.groups);
          }
        } else if (node.type === 'folder' && node.children) {
          traverseTree(node.children);
        }
      }
    };
    traverseTree(state.value.configTree);
    return groups;
  };

  // --- Helpers ---

  const generateId = (prefix: string): string => {
    return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
  };

  const isConfigFile = (fileName: string): boolean => {
    return (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) && !fileName.startsWith('_');
  };

  const processMatch = (match: any, filePath?: string): Match => {
    globalGuiOrderCounter++; // Increment counter
    console.log('[processMatch] 处理触发词:', match.trigger, match.triggers, `guiOrder: ${globalGuiOrderCounter}`);
    const baseMatch: Match = {
      id: match.id || generateId('match'),
      type: 'match',
      filePath: filePath || match.filePath || '',
      guiOrder: globalGuiOrderCounter, // Assign current order
      // Initialize trigger/triggers as undefined
      trigger: undefined,
      triggers: undefined,
      // Copy other known properties explicitly or use spread cautiously
      replace: match.replace || '',
      label: match.label,
      description: match.description,
      word: match.word,
      left_word: match.left_word,
      right_word: match.right_word,
      propagate_case: match.propagate_case,
      uppercase_style: match.uppercase_style,
      force_mode: match.force_mode,
      apps: match.apps,
      exclude_apps: match.exclude_apps,
      vars: match.vars,
      search_terms: match.search_terms,
      priority: match.priority,
      hotkey: match.hotkey,
      image_path: match.image_path,
      markdown: match.markdown,
      html: match.html,
      content: match.content,
    };

    // 处理多行触发词字符串 (YAML字符块，比如 trigger: |- )
    if (match.trigger && typeof match.trigger === 'string' &&
       (match.trigger.includes('\n') || match.trigger.includes(','))) {
      console.log('[processMatch] 检测到多行触发词:', match.trigger);
      // 使用触发词分割逻辑，统一处理
      const triggerItems = match.trigger
        .split(/[\n,]/) // Use regex for newline or comma
        .map((t: string) => t.trim())
        .filter((t: string) => t !== '');

      if (triggerItems.length > 1) {
        console.log('[processMatch] 将多行触发词转换为数组:', triggerItems);
        baseMatch.triggers = triggerItems;
        // Ensure single trigger is removed if triggers array is used
        delete baseMatch.trigger;
        return baseMatch;
      }
      // If only one item after split, treat as single trigger
      baseMatch.trigger = triggerItems[0] || match.trigger; // Fallback to original if split resulted in empty
      delete baseMatch.triggers; // Ensure triggers is removed
      return baseMatch;

    }

    // 标准处理逻辑 for existing trigger/triggers fields
    if (Array.isArray(match.triggers) && match.triggers.length > 0) {
      // 如果有triggers数组，优先使用
      baseMatch.triggers = match.triggers;
      delete baseMatch.trigger; // Ensure single trigger is removed if array exists
    } else if (match.trigger) {
      // 如果只有单个trigger，使用它
      baseMatch.trigger = match.trigger;
      delete baseMatch.triggers; // Ensure triggers array is removed
    } else {
      // If neither, maybe default to empty trigger?
      // baseMatch.trigger = '';
      // delete baseMatch.triggers;
    }


    return baseMatch;
  };

  const processGroup = (group: any, filePath?: string): Group => {
    globalGuiOrderCounter++; // Increment counter for group itself
    const processedGroup: Group = {
      id: group.id || generateId('group'),
      type: 'group',
      name: group.name || '未命名分组',
      matches: [],
      groups: [],
      filePath: filePath || group.filePath || '',
      guiOrder: globalGuiOrderCounter, // Assign current order
      ...(group as Omit<Group, 'id' | 'type' | 'name' | 'matches' | 'groups' | 'filePath' | 'guiOrder'>)
    };
    processedGroup.matches = Array.isArray(group.matches) ? group.matches.map((match: any) => processMatch(match, filePath)) : [];
    processedGroup.groups = Array.isArray(group.groups) ? group.groups.map((nestedGroup: any) => processGroup(nestedGroup, filePath)) : [];
    return processedGroup;
  };

  const createFileNode = (file: FileInfo, content: YamlData, fileType: 'match' | 'config' | 'package', processedMatches: Match[], processedGroups: Group[]): ConfigFileNode => {
    return {
      type: 'file',
      name: file.name,
      path: file.path,
      id: `file-${file.path}`, // Add an ID for files
      fileType,
      content, // Store original parsed content
      matches: processedMatches, // Use pre-processed matches
      groups: processedGroups   // Use pre-processed groups
    };
  };

  const createFolderNode = (name: string, path: string): ConfigFolderNode => {
    return {
      type: 'folder',
      name,
      path,
      id: `folder-${path}`, // Add an ID for folders
      children: []
    };
  };

  const addToTree = (tree: ConfigTreeNode[], fileNodeToAdd: ConfigFileNode, relativePath: string): void => {
    // Use preloadApi for path joining if available, cast to any
    const safeJoinPath = (...args: string[]) => {
      const api = window.preloadApi as any;
      if (api?.joinPath) {
        // console.log('[safeJoinPath in addToTree] Using preloadApi.joinPath');
        return api.joinPath(...args);
      } else {
        // console.log('[safeJoinPath in addToTree] Falling back to args.join("/")');
        return args.join('/');
      }
    };

    if (!relativePath || relativePath === '') {
      tree.push(fileNodeToAdd);
      return;
    }
    const parts = relativePath.split('/');
    const folderName = parts[0];
    let folderNode = tree.find(node => node.type === 'folder' && node.name === folderName) as ConfigFolderNode | undefined;
    if (!folderNode) {
      const parentPath = fileNodeToAdd.path.substring(0, fileNodeToAdd.path.lastIndexOf('/'));
      const folderPath = parentPath ? safeJoinPath(parentPath.substring(0, parentPath.lastIndexOf('/') + 1), folderName) : folderName;
      folderNode = createFolderNode(folderName, folderPath);
      tree.push(folderNode);
    }
    if (parts.length > 1) {
      addToTree(folderNode.children, fileNodeToAdd, parts.slice(1).join('/'));
    } else {
      folderNode.children.push(fileNodeToAdd);
    }
  };

  const findFileNode = (nodes: ConfigTreeNode[], path: string): ConfigFileNode | null => {
    for (const node of nodes) {
      if (node.type === 'file' && node.path === path) {
        return node;
      } else if (node.type === 'folder') {
        const found = findFileNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  // --- NEW HELPER FUNCTION ---
  const getFilePathForNode = (nodes: ConfigTreeNode[], targetNodeId: string): string | null => {
    for (const node of nodes) {
      if (node.type === 'file' && node.id === targetNodeId) {
        return node.path;
      }
      if (node.type === 'file') {
         if (node.matches?.some(m => m.id === targetNodeId)) return node.path;
         if (node.groups?.some(g => g.id === targetNodeId)) return node.path;
         if (node.groups) {
            for (const group of node.groups) {
               const itemInGroup = findItemByIdRecursive(group, targetNodeId);
               if (itemInGroup) return node.path;
            }
         }
      }
      else if (node.type === 'folder' && node.children) {
        const path = getFilePathForNode(node.children, targetNodeId);
        if (path) return path;
      }
    }
    return null;
  };

  // Helper for recursive search within Group objects
  const findItemByIdRecursive = (item: Match | Group, targetId: string): Match | Group | null => {
    if (item.id === targetId) return item;
    if (item.type === 'group') {
       if (item.matches) {
          const foundMatch = item.matches.find(m => m.id === targetId);
          if (foundMatch) return foundMatch;
       }
       if (item.groups) {
          for (const subGroup of item.groups) {
             const found = findItemByIdRecursive(subGroup, targetId);
             if (found) return found;
          }
       }
    }
    return null;
  };

  const findItemInGroup = (group: Group, id: string): Match | Group | null => {
    return findItemByIdRecursive(group, id);
  };

  const findItemById = (id: string): Match | Group | null => {
    if (!state.value.config) return null;
    const directMatch = state.value.config.matches.find(m => m.id === id);
    if (directMatch) return directMatch;
    for (const group of state.value.config.groups) {
       const found = findItemByIdRecursive(group, id);
       if (found) return found;
    }
    return null;
  };

  // --- Computed Properties ---

  const allMatches = computed(getAllMatchesFromTree);
  const allGroups = computed(getAllGroupsFromTree);
  const allItems = computed((): (Match | Group)[] => [...allMatches.value, ...allGroups.value]);

  const selectedItem = computed(() => {
    return state.value.selectedItemId ? findItemById(state.value.selectedItemId) : null;
  });

  // --- Core Actions ---

  const loadConfig = async (configDirOrPath: string): Promise<void> => {
    // Ensure createFileNode and createFolderNode assign IDs
     // Use preloadApi for path joining if available, cast to any
    const safeJoinPath = (...args: string[]) => {
       const api = window.preloadApi as any;
      if (api?.joinPath) {
        // console.log('[safeJoinPath in loadConfig] Using preloadApi.joinPath');
        return api.joinPath(...args);
      } else {
        // console.log('[safeJoinPath in loadConfig] Falling back to args.join("/")');
        return args.join('/');
      }
    };
    globalGuiOrderCounter = 0; // Reset counter before loading
    console.log('开始加载配置，路径:', configDirOrPath);
    state.value.loading = true;
    state.value.error = null;
    state.value.configTree = [];
    state.value.config = { matches: [], groups: [] }; // Reset config
    state.value.globalConfig = null;
    state.value.globalConfigPath = null;
    state.value.configPath = null; // Reset configPath initially
    state.value.configRootDir = null; // Reset root dir

    try {
      let configDir = configDirOrPath;
      if (configDirOrPath.endsWith('.yml') || configDirOrPath.endsWith('.yaml')) {
          // Infer directory if a file path is given (e.g., from a file drop)
          configDir = configDirOrPath.substring(0, configDirOrPath.lastIndexOf('/'));
          if (configDir.endsWith('/match') || configDir.endsWith('/config')) {
              configDir = configDir.substring(0, configDir.lastIndexOf('/'));
          }
      }
      console.log('推断的配置目录:', configDir);
      state.value.configRootDir = configDir; // <-- 存储根目录

      const configTree: ConfigTreeNode[] = [];
      let currentMatches: Match[] = [];
      let currentGroups: Group[] = [];
      let firstMatchFilePath: string | null = null; // Store path of the first file containing matches/groups

      // 1. Load Global Config
      const globalConfigDir = safeJoinPath(configDir, 'config');
      const defaultGlobalPath = safeJoinPath(globalConfigDir, 'default.yml');
      if (await fileExists(defaultGlobalPath)) {
          try {
              const content = await readFile(defaultGlobalPath);
              const yaml = await parseYaml(content) as YamlData;
              state.value.globalConfig = yaml;
              state.value.globalConfigPath = defaultGlobalPath;
              // Ensure createFileNode assigns an ID
              const fileNode = createFileNode({ name: 'default.yml', path: defaultGlobalPath, extension: '.yml' }, yaml, 'config', [], []);
              addToTree(configTree, fileNode, 'config');
              console.log('加载全局配置成功:', defaultGlobalPath);
          } catch(e) { console.warn('加载全局配置失败:', e); }
      }

      // 2. Load Match Files
      const matchDir = safeJoinPath(configDir, 'match');
      if (await fileExists(matchDir)) {
          const matchDirTree = await scanDirectory(matchDir);
          // console.log('匹配目录结构:', matchDirTree); // Less verbose logging

          const processDirectory = async (dirNode: any, relativePath: string = '') => {
             if (dirNode.type === 'file' && isConfigFile(dirNode.name)) {
                try {
                  const content = await readFile(dirNode.path);
                  const yaml = await parseYaml(content) as YamlData;
                      const fileType = relativePath.startsWith('packages/') ? 'package' : 'match';

                      // Process matches and groups ONCE
                      const fileMatches = Array.isArray(yaml.matches)
                        ? yaml.matches.map((match: any) => processMatch(match, dirNode.path))
                        : [];
                      const fileGroups = Array.isArray(yaml.groups)
                        ? yaml.groups.map((group: any) => processGroup(group, dirNode.path)) // Use any here temporarily
                        : [];

                      // Create file node using the processed items (Ensure ID is assigned)
                      const fileNode = createFileNode({ name: dirNode.name, path: dirNode.path, extension: '.yml' }, yaml, fileType, fileMatches, fileGroups);
                      addToTree(configTree, fileNode, relativePath);

                      // Add the processed items to the global list
                      if (fileMatches.length > 0) {
                          currentMatches.push(...fileMatches);
                          if (!firstMatchFilePath) firstMatchFilePath = dirNode.path;
                      }
                      if (fileGroups.length > 0) {
                          currentGroups.push(...fileGroups);
                           if (!firstMatchFilePath) firstMatchFilePath = dirNode.path;
                      }
                  } catch (e) { console.warn(`处理文件 ${dirNode.path} 失败:`, e); }
            } else if (dirNode.type === 'directory') {
                  const newRelativePath = relativePath ? safeJoinPath(relativePath, dirNode.name) : dirNode.name;
              if (Array.isArray(dirNode.children)) {
                for (const child of dirNode.children) {
                  await processDirectory(child, newRelativePath);
                }
              }
            }
          };

          if (Array.isArray(matchDirTree)) {
            for (const node of matchDirTree) {
              await processDirectory(node);
            }
          }
      }

      // If no matches/groups found, create example
      if (currentMatches.length === 0 && currentGroups.length === 0) {
          console.log('未找到规则, 创建示例...');
          const exampleFilePath = safeJoinPath(matchDir, 'base.yml'); // Get path first
          if (!exampleFilePath || typeof exampleFilePath !== 'string') {
             console.error('无法为示例文件生成有效路径!');
        } else {
              // 创建示例匹配规则
              const exampleMatch = processMatch({
                  trigger: ':hello',
                  replace: 'Hello World!'
              }, exampleFilePath);

              currentMatches.push(exampleMatch);
              firstMatchFilePath = exampleFilePath; // Assign the confirmed string path

              // 创建示例YAML文件内容
              const exampleYaml = {
                  matches: [{
                      trigger: ':hello',
                      replace: 'Hello World!'
                  }]
              };

              try {
                await writeFile(exampleFilePath, await serializeYaml(exampleYaml)); // Use confirmed string path
                // Ensure createFileNode assigns an ID
                const fileNode = createFileNode({
                    name: 'base.yml',
                    path: exampleFilePath,
                    extension: '.yml'
                }, exampleYaml, 'match', [exampleMatch], []); // Use confirmed string path

                addToTree(configTree, fileNode, '');
                console.log('示例文件已创建:', exampleFilePath);
              } catch(e) {
                  console.error('创建示例文件失败:', e);
              }
          }
      }

      // Update state
      state.value.configTree = configTree;
      // Make sure the flat state reflects the processed data correctly
      state.value.config = { matches: currentMatches, groups: currentGroups };
      state.value.configPath = firstMatchFilePath || safeJoinPath(matchDir, 'base.yml');
      state.value.lastSavedState = JSON.stringify({ matches: currentMatches, groups: currentGroups }, null, 2); // Store only matches/groups for comparison?
      state.value.hasUnsavedChanges = false;

      console.log('配置加载完成', { path: state.value.configPath, matches: currentMatches.length, groups: currentGroups.length });

    } catch (error: any) {
        console.error('加载配置失败:', error);
        state.value.error = `加载配置失败: ${error.message}`;
        if (!state.value.config) state.value.config = { matches: [], groups: [] };
    } finally {
      state.value.loading = false;
    }
  };

  const autoSaveConfig = async () => {
    // Remove check for hasUnsavedChanges, as this might be called for global config only now
    // if (!state.value.hasUnsavedChanges) return;

    try {
      state.value.autoSaveStatus = 'saving';
      // console.log('[Store autoSaveConfig] Starting global config auto-save...');

      // --- Save Global Config ONLY ---
      if (state.value.globalConfig && state.value.globalConfigPath) {
        // console.log('[Store autoSaveConfig] Saving global config:', state.value.globalConfigPath);
        try {
          // console.log('[Store autoSaveConfig] Global config object before serialization:', state.value.globalConfig);
          const rawGlobalConfig = toRaw(state.value.globalConfig);
          // console.log('[Store autoSaveConfig] Raw global config object for serialization:', rawGlobalConfig);
          const yamlContent = await serializeYaml(rawGlobalConfig as Record<string, any>);
          await writeFile(state.value.globalConfigPath, yamlContent);
          // console.log('[Store autoSaveConfig] Global config saved successfully.');
        } catch (globalConfigError: any) {
          console.error('[Store autoSaveConfig] Failed to save global config:', globalConfigError);
        }
      } else {
        // console.log('[Store autoSaveConfig] No global config or path, skipping global save.');
      }


      // Update saved state marker and status - perhaps remove if only saving global?
      // state.value.lastSavedState = JSON.stringify(state.value.config, null, 2);
      // state.value.hasUnsavedChanges = false; // Only reset if save was comprehensive
      state.value.autoSaveStatus = 'saved'; // Indicate global save attempt completed
      // console.log('全局配置自动保存尝试完成');

    } catch (error: any) {
      console.error('Auto-save failed overall:', error);
      state.value.autoSaveStatus = 'error';
    }
  };

  // --- Helpers for updating state ---

  const findAndUpdateInGroup = (group: Group, updatedItem: Match | Group): boolean => {
    if (updatedItem.type === 'match' && group.matches) {
        const index = group.matches.findIndex(m => m.id === updatedItem.id);
        if (index !== -1) {
            group.matches[index] = updatedItem as Match;
            return true;
        }
    }
    if (group.groups) {
        for (let i = 0; i < group.groups.length; i++) {
             if (updatedItem.type === 'group' && group.groups[i].id === updatedItem.id) {
                 group.groups[i] = updatedItem as Group;
                 return true;
             }
             if (findAndUpdateInGroup(group.groups[i], updatedItem)) {
                 return true;
             }
        }
    }
    return false; // Explicit return
  };

  const findAndUpdateInTree = (nodes: ConfigTreeNode[], updatedItem: Match | Group): boolean => {
    for (const node of nodes) {
        if (node.type === 'file') {
            if (updatedItem.type === 'match' && node.matches) {
                const index = node.matches.findIndex(m => m.id === updatedItem.id);
                if (index !== -1) {
                    node.matches[index] = updatedItem as Match;
                    return true;
                }
            } else if (updatedItem.type === 'group' && node.groups) {
                // Use type assertion here to potentially resolve 'never' issue
                const index = node.groups.findIndex(g => g.id === (updatedItem as Group).id);
                if (index !== -1) {
                    node.groups[index] = updatedItem as Group;
                    return true;
                }
                for(const groupInFile of node.groups) {
                   if (findAndUpdateInGroup(groupInFile, updatedItem)) return true;
                }
            }
        } else if (node.type === 'folder' && node.children) {
            if (findAndUpdateInTree(node.children, updatedItem)) {
                return true;
            }
        } else if (node.type === 'group') { // Should be handled within file/folder
             if (findAndUpdateInGroup(node as Group, updatedItem)) return true;
        }
    }
    return false;
  };

  const updateConfigState = (itemId: string, updateData: Partial<Match> | Partial<Group>) => {
      try {
        // console.log(`[Store updateConfigState] Updating item ID: ${itemId} with data:`, JSON.parse(JSON.stringify(updateData)));
        if (!state.value.config) {
          console.error("Cannot update state, config is null.");
          return;
        }

        let targetItem: Match | Group | null = null;

        // Use the refined findItemById to locate the item in the logical structure
        targetItem = findItemById(itemId);


        if (!targetItem) {
          console.error(`[Store updateConfigState] Item with ID ${itemId} not found in config.`);
          return;
        }

        // 复制更新数据，以免修改原始数据
        const updateDataCopy = { ...updateData };

        if (targetItem.type === 'match') {
          // 暂存触发词相关字段
          const newTrigger = (updateDataCopy as Partial<Match>).trigger;
          const newTriggers = (updateDataCopy as Partial<Match>).triggers;

          // 从更新数据中删除这些字段，以便后面单独处理
          delete (updateDataCopy as Partial<Match>).trigger;
          delete (updateDataCopy as Partial<Match>).triggers;

          // 先应用其他更新
          Object.assign(targetItem, updateDataCopy);

          // 删除现有的trigger和triggers字段
          delete (targetItem as Match).trigger;
          delete (targetItem as Match).triggers;

          // 根据情况分配新的trigger或triggers
          if (newTriggers && newTriggers.length > 0) {
            (targetItem as Match).triggers = newTriggers;
          } else if (newTrigger !== undefined && newTrigger !== null) { // Check for null as well
            (targetItem as Match).trigger = newTrigger;
          } else {
            // If updateData didn't provide either, it might mean clearing them.
            // Let's explicitly set trigger to empty string if neither is provided?
            // Or rely on cleanMatchForSaving to handle it? Let's rely on cleaner.
          }
        } else {
          // 对于Group类型，直接应用更新
          Object.assign(targetItem, updateDataCopy);
        }

        // 3. Find and update the item reference in the configTree (visual structure)
        if (!findAndUpdateInTree(state.value.configTree, targetItem)) {
          console.warn(`[Store updateConfigState] Item ID ${itemId} was updated in config, but not found/updated in configTree. Tree might be out of sync.`);
        } else {
          // console.log(`[Store updateConfigState] Item ID ${itemId} reference updated in configTree.`);
        }

        // Mark changes as unsaved
        state.value.hasUnsavedChanges = true;
        state.value.autoSaveStatus = 'idle';

      } catch (error: any) {
        console.error('更新配置状态失败:', error);
        state.value.error = `更新配置状态失败: ${error.message}`;
      }
  };

  // --- Item CRUD Actions (call updateConfigState or specific logic) ---

  const updateItem = async (item: Match | Group) => {
    // console.log('[Store updateItem] Received item:', JSON.parse(JSON.stringify(item)));
    // Call the new updateConfigState with ID and data
    updateConfigState(item.id, item);
  };

  const deleteItem = async (id: string, type: 'match' | 'group') => {
    console.log(`[Store deleteItem] Deleting ${type} with id: ${id}`);
    if (!state.value.config) return;

    const itemToDelete = findItemById(id);
    if (!itemToDelete) {
      console.error(`[Store deleteItem] Item ${id} not found.`);
      return;
    }
    const filePathToSave = itemToDelete.filePath; // Get path BEFORE removing

    // --- Remove from flat lists ---
    if (type === 'match') {
      state.value.config.matches = state.value.config.matches.filter(i => i.id !== id);
      const removeFromGroupMatches = (groups: Group[]) => {
          groups.forEach(g => {
              if (g.matches) g.matches = g.matches.filter(m => m.id !== id);
              if (g.groups) removeFromGroupMatches(g.groups);
          });
      };
      removeFromGroupMatches(state.value.config.groups);
    } else { // type === 'group'
        const removeGroupRecursive = (groups: Group[]): Group[] => {
            return groups.filter(group => {
                if (group.id === id) return false;
                if (group.groups) {
                    group.groups = removeGroupRecursive(group.groups);
                }
                return true;
            });
        };
        state.value.config.groups = removeGroupRecursive(state.value.config.groups);
    }

    // --- Remove from tree structure ---
    const removeFromTree = (nodes: ConfigTreeNode[]): ConfigTreeNode[] => {
       return nodes.filter(node => {
           if (node.id === id) return false;
           if (node.type === 'file') {
               if (node.matches) node.matches = node.matches.filter(m => m.id !== id);
               if (node.groups) {
                  node.groups = node.groups.filter(g => g.id !== id);
                  node.groups.forEach(g => {
                     const removeNested = (group: Group) => {
                         if (group.matches) group.matches = group.matches.filter(m => m.id !== id);
                         if (group.groups) {
                             group.groups = group.groups.filter(sg => sg.id !== id);
                             group.groups.forEach(removeNested);
                         }
                     }
                     removeNested(g);
                  });
               }
           } else if (node.type === 'folder' && node.children) {
               node.children = removeFromTree(node.children);
           }
           return true;
       });
    };
    state.value.configTree = removeFromTree(state.value.configTree);

    // --- Save the affected file ---
    if (filePathToSave) {
        try {
            console.log(`[Store deleteItem] Saving file ${filePathToSave} after deletion.`);
            // --- Simplified Trigger Item Search ---
            let triggerItem: Match | Group | undefined;
            const findAnyItemForFile = (path: string): Match | Group | undefined => {
                const findRecursive = (items: (Match | Group)[]): Match | Group | undefined => {
                    for (const item of items) {
                        if (item.filePath === path) return item;
                        if (item.type === 'group' && item.matches) {
                           const foundMatch = item.matches.find(m => m.filePath === path);
                           if (foundMatch) return foundMatch;
                        }
                         if (item.type === 'group' && item.groups) {
                             const found = findRecursive(item.groups);
                             if (found) return found;
                         }
                    }
                    return undefined;
                };
                return findRecursive([...(state.value.config?.matches || []), ...(state.value.config?.groups || [])]);
            }
            triggerItem = findAnyItemForFile(filePathToSave);
            // --- End Simplified Search ---

            if (triggerItem) {
                console.log(`[Store deleteItem] Saving file ${filePathToSave} (triggered by remaining item ${triggerItem.id})`);
                await saveItemToFile(triggerItem);
            } else {
                console.log(`[Store deleteItem] No items left for file ${filePathToSave}. Writing empty/cleaned file.`);
                 const fileNode = findFileNode(state.value.configTree, filePathToSave);
                 let otherKeysData: YamlData = {};
                  if (fileNode && fileNode.content) {
                     Object.keys(fileNode.content).forEach(key => {
                        if (key !== 'matches' && key !== 'groups') {
                           otherKeysData[key] = fileNode.content![key];
                        }
                     });
                  }
                 const yamlContent = Object.keys(otherKeysData).length > 0 ? await serializeYaml(otherKeysData) : '';
                 await writeFile(filePathToSave, yamlContent);
                 console.log(`[Store deleteItem] Wrote empty/cleaned file: ${filePathToSave}`);
            }
             state.value.hasUnsavedChanges = false;
             state.value.autoSaveStatus = 'idle';
             showToast('项目已删除并保存', 'success');
        } catch (error) {
             console.error(`[Store deleteItem] Failed to save file ${filePathToSave} after deletion:`, error);
             state.value.hasUnsavedChanges = true;
             state.value.autoSaveStatus = 'error';
             showToast('删除项目后保存文件失败', 'error');
        }
    } else {
        console.warn(`[Store deleteItem] Could not determine file path for deleted item ${id}. File not saved.`);
         state.value.hasUnsavedChanges = true;
         state.value.autoSaveStatus = 'idle';
    }
    if (state.value.selectedItemId === id) {
        state.value.selectedItemId = null;
    }
  };


  const addItem = async (item: Match | Group) => {
    // Needs update to add to flat list, tree structure, and save file.
     console.log(`[Store addItem] Adding new ${item.type}:`, JSON.parse(JSON.stringify(item)));
     if (!item.filePath) {
         item.filePath = state.value.configPath || undefined; // Assign default path if missing
         console.warn(`[Store addItem] Item missing filePath, assigned default: ${item.filePath}`);
         if (!item.filePath) {
             console.error("[Store addItem] Cannot add item without a filePath and no active configPath.");
             showToast('无法添加项目：缺少文件路径', 'error');
             return;
         }
     }
      if (!item.id) {
          item.id = generateId(item.type); // Ensure ID exists
      }

     if (!state.value.config) {
         console.error("Cannot add item, config is null.");
         showToast('无法添加项目：配置未加载', 'error');
         return;
     }

      // --- Add to flat list ---
      if (item.type === 'match') {
         state.value.config.matches.push(item);
      } else {
         // Add to top-level groups for now. Adding to nested groups needs parent context.
         state.value.config.groups.push(item);
      }

      // --- Add to tree structure ---
      // Find the target file node in the tree
      const targetFileNode = findFileNode(state.value.configTree, item.filePath);
      if (targetFileNode) {
          if (item.type === 'match') {
              if (!targetFileNode.matches) targetFileNode.matches = [];
              targetFileNode.matches.push(item); // Add reference to the item from flat list
          } else {
              if (!targetFileNode.groups) targetFileNode.groups = [];
              targetFileNode.groups.push(item); // Add reference
          }
          console.log(`[Store addItem] Added item ${item.id} to tree node for file ${item.filePath}`);
      } else {
          console.error(`[Store addItem] Could not find target file node in tree for path ${item.filePath}. Tree is out of sync!`);
          // Attempt to create a new file node? Risky.
          // For now, item exists in flat list but not tree. Save will still work.
      }

      // --- Save the file ---
      try {
        await saveItemToFile(item);
        state.value.hasUnsavedChanges = false;
        state.value.autoSaveStatus = 'idle';
        showToast('项目已添加并保存', 'success');
      } catch (error) {
         console.error('[Store addItem] Failed to save file after adding item:', error);
         state.value.hasUnsavedChanges = true; // Keep marked as unsaved
         state.value.autoSaveStatus = 'error';
         showToast('添加项目后保存文件失败', 'error');
      }
       // Optionally select the newly added item
      state.value.selectedItemId = item.id;
  };


  // --- Tree Manipulation Action (REVISED) ---
  const moveTreeItem = async (itemId: string, oldParentId: string | null, newParentId: string | null, oldIndex: number, newIndex: number) => {
    console.log(`[Store moveTreeItem REV] Moving item ${itemId} from parent ${oldParentId} (index ${oldIndex}) to parent ${newParentId} (index ${newIndex})`);

    if (!state.value.config || !state.value.configTree) {
        console.error("[Store moveTreeItem REV] Config or ConfigTree is not loaded.");
        return;
    }

    try {
      const movedItemRef = findItemById(itemId);
      if (!movedItemRef) {
        console.error(`[Store moveTreeItem REV] Failed to find item ref with ID ${itemId} in config.`);
        showToast('拖拽失败：找不到项目引用', 'error');
        return;
      }
      const originalFilePath = movedItemRef.filePath;

      const oldParentNode = oldParentId ? findNodeById(state.value.configTree, oldParentId) : { type: 'root', id: null, children: state.value.configTree };
      const newParentNode = newParentId ? findNodeById(state.value.configTree, newParentId) : { type: 'root', id: null, children: state.value.configTree };

      if (!oldParentNode || !newParentNode) {
        console.error(`[Store moveTreeItem REV] Failed to find parent tree node(s). Old: ${oldParentId}, New: ${newParentId}`);
         showToast('拖拽失败：找不到父节点', 'error');
        return;
      }

      let effectiveNewFilePath: string | null = null;
      if (newParentNode.type === 'file') {
          effectiveNewFilePath = newParentNode.path;
      } else if (newParentNode.type === 'folder' || newParentNode.type === 'group') {
          effectiveNewFilePath = getFilePathForNode(state.value.configTree, newParentNode.id);
      } else if (newParentNode.type === 'root') {
          effectiveNewFilePath = originalFilePath;
      }
       if (!effectiveNewFilePath && newParentNode.type !== 'root') {
            effectiveNewFilePath = state.value.configPath;
       }

      let oldParentArray: Array<Match | Group | ConfigTreeNode>;
      if (oldParentNode.type === 'file') oldParentArray = movedItemRef.type === 'match' ? (oldParentNode.matches ??= []) : (oldParentNode.groups ??= []);
      else oldParentArray = oldParentNode.children ??= [];

      let newParentArray: Array<Match | Group | ConfigTreeNode>;
       if (newParentNode.type === 'file') newParentArray = movedItemRef.type === 'match' ? (newParentNode.matches ??= []) : (newParentNode.groups ??= []);
       else newParentArray = newParentNode.children ??= [];

      if (oldIndex >= 0 && oldIndex < oldParentArray.length) {
        const movedTreeNode = oldParentArray[oldIndex];
        if (!movedTreeNode || movedTreeNode.id !== itemId) {
            console.error(`[Store moveTreeItem REV] Item at oldIndex ${oldIndex} does not match moved item ID ${itemId}. Aborting.`);
            showToast('拖拽失败：树结构索引错误', 'error');
            return;
        }
        oldParentArray.splice(oldIndex, 1);
        const safeNewIndex = Math.min(Math.max(0, newIndex), newParentArray.length);
        newParentArray.splice(safeNewIndex, 0, movedTreeNode);
        updateGuiOrderForChildren(newParentArray);
        if (oldParentArray !== newParentArray) {
           updateGuiOrderForChildren(oldParentArray);
        }

        const filesToSave = new Set<string>();
        if (originalFilePath !== effectiveNewFilePath && effectiveNewFilePath) {
           console.log(`[Store moveTreeItem REV] Cross-file move detected: ${originalFilePath} -> ${effectiveNewFilePath}`);
           movedItemRef.filePath = effectiveNewFilePath;
           console.log(`[Store moveTreeItem REV] Updated filePath for item ${itemId} in flat list to ${effectiveNewFilePath}`);
           if (originalFilePath) filesToSave.add(originalFilePath);
           filesToSave.add(effectiveNewFilePath);
        } else if (originalFilePath) {
           console.log(`[Store moveTreeItem REV] Same-file move/reorder: ${originalFilePath}`);
           filesToSave.add(originalFilePath);
        } else {
            if (effectiveNewFilePath) filesToSave.add(effectiveNewFilePath);
        }

        state.value.hasUnsavedChanges = true;
        state.value.autoSaveStatus = 'idle';

        if (filesToSave.size > 0) {
           console.log(`[Store moveTreeItem REV] Files to save:`, Array.from(filesToSave));
           const savePromises = Array.from(filesToSave).map(async (filePath) => {
            try {
                let triggerItem: Match | Group | undefined;
                const config = state.value.config;
                if (config) {
                    triggerItem = config.matches.find(m => m.filePath === filePath)
                               || config.groups.find(g => g.filePath === filePath);
                    if (!triggerItem) {
                         const findAnyInGroups = (groups: Group[]): Match | Group | undefined => {
                             for (const group of groups) {
                                 if (group.filePath === filePath) return group;
                                 const foundMatch = group.matches?.find(m => m.filePath === filePath);
                                 if (foundMatch) return foundMatch;
                                 if (group.groups) {
                                     const found = findAnyInGroups(group.groups);
                                     if (found) return found;
                                 }
                             }
                             return undefined;
                         }
                         triggerItem = findAnyInGroups(config.groups);
                    }
                }
                if (triggerItem) {
                  console.log(`[Store moveTreeItem REV] Saving file ${filePath} (triggered by item ${triggerItem.id})`);
                  await saveItemToFile(triggerItem);
                } else {
                  console.log(`[Store moveTreeItem REV] No items found for file ${filePath}. Writing empty/cleaned file.`);
                  const fileNode = findFileNode(state.value.configTree, filePath);
                  let otherKeysData: YamlData = {};
                  if (fileNode && fileNode.content) {
                     Object.keys(fileNode.content).forEach(key => {
                        if (key !== 'matches' && key !== 'groups') {
                           otherKeysData[key] = fileNode.content![key];
                        }
                     });
                  }
                  const yamlContent = Object.keys(otherKeysData).length > 0 ? await serializeYaml(otherKeysData) : '';
                  await writeFile(filePath, yamlContent);
                  console.log(`[Store moveTreeItem REV] Successfully wrote empty/cleaned file: ${filePath}`);
                }
            } catch (error) {
               console.error(`[Store moveTreeItem REV] Failed to save file ${filePath}:`, error);
               throw error;
            }
           });

           try {
              await Promise.all(savePromises);
              console.log(`[Store moveTreeItem REV] All modified files saved successfully.`);
              state.value.hasUnsavedChanges = false;
              state.value.autoSaveStatus = 'saved';
              showToast('拖拽操作已保存', 'success');
           } catch (error) {
              console.error(`[Store moveTreeItem REV] One or more files failed to save during move operation.`, error);
              state.value.autoSaveStatus = 'error';
              showToast('部分文件保存失败，请检查控制台', 'error', 5000, true);
           }
        } else {
            console.log('[Store moveTreeItem REV] No files marked for saving.');
            state.value.hasUnsavedChanges = true;
        }
      } else {
        console.error(`[Store moveTreeItem REV] Invalid oldIndex: ${oldIndex} for array length ${oldParentArray.length}`);
        showToast('拖拽失败：无效的起始位置', 'error');
      }
    } catch (error: any) {
      console.error('[Store moveTreeItem REV] Error during move operation:', error);
       showToast('拖拽操作失败，请检查控制台', 'error', 5000, true);
    }
  };

  // 根据ID在树中查找节点 (Revised)
  const findNodeById = (nodes: ConfigTreeNode[], id: string): ConfigTreeNode | Match | Group | null => {
     if (!nodes || !Array.isArray(nodes) || !id) return null;
     for (const node of nodes) {
        if (node.id === id) return node;
        if (node.type === 'file') {
            if (node.matches) {
                const found = node.matches.find(m => m.id === id);
                if (found) return found;
            }
            if (node.groups) {
                for(const group of node.groups) {
                    const found = findItemByIdRecursive(group, id);
                    if(found) return found;
                }
            }
        }
        else if (node.type === 'folder' && node.children) {
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
        else if (node.type === 'group') {
             const found = findItemByIdRecursive(node as Group, id);
             if(found) return found;
        }
     }
     return null;
  };

  // Deprecated determineNewFilePath
  const determineNewFilePath = (node: any, newParent: any): string | null => {
    console.warn("[determineNewFilePath] Deprecated, use getFilePathForNode instead.");
    if (newParent.type === 'file' && newParent.path) {
      return newParent.path;
    }
    if (newParent.type === 'folder') {
      const defaultFile = newParent.children?.find((child: any) =>
        child.type === 'file' && child.name.toLowerCase() === 'base.yml');
      if (defaultFile && defaultFile.path) {
        return defaultFile.path;
      }
      const firstFile = newParent.children?.find((child: any) => child.type === 'file');
      if (firstFile && firstFile.path) {
        return firstFile.path;
      }
    }
    return state.value.configPath;
  };

  // Commented out updateNodeFilePath
  /*
  const updateNodeFilePath = (node: any, newFilePath: string): void => {
    // This function might cause inconsistencies if not used carefully.
    // Updating the flat list's filePath should be the primary mechanism.
    console.warn("updateNodeFilePath called - ensure this doesn't conflict with flat list updates.");
    if (!node) return;
    if (node.type === 'match' || node.type === 'group') {
      node.filePath = newFilePath;
    }
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        updateNodeFilePath(child, newFilePath);
      }
    }
    if (node.matches && Array.isArray(node.matches)) {
       for (const child of node.matches) updateNodeFilePath(child, newFilePath);
    }
    if (node.groups && Array.isArray(node.groups)) {
       for (const child of node.groups) updateNodeFilePath(child, newFilePath);
    }
  };
  */

  const updateGuiOrderForChildren = (children: any[]): void => {
     if (!children || !Array.isArray(children)) return;

    // 遍历所有子节点，更新guiOrder
    children.forEach((child, index) => {
      // Only update guiOrder if it exists on the object
      if (child && typeof child === 'object' && 'guiOrder' in child) {
        child.guiOrder = index + 1; // 从1开始
      }

      // 递归处理子节点的子节点 (match nodes don't have children array)
      if (child?.children && Array.isArray(child.children)) {
        updateGuiOrderForChildren(child.children);
      }
       // Also update order for matches/groups within groups if needed visually
       if (child?.type === 'group') {
          if(child.matches) updateGuiOrderForChildren(child.matches);
          if(child.groups) updateGuiOrderForChildren(child.groups);
       }
    });
  };

  // Save a specific item (Match or Group) to its corresponding file (REVISED)
  const saveItemToFile = async (itemToSave: Match | Group) => {
    console.log(`[Store saveItemToFile REV] Saving file containing item ID: ${itemToSave.id}`);
    state.value.autoSaveStatus = 'saving';
    const targetFilePath = itemToSave.filePath;
    if (!targetFilePath) {
      console.error('[Store saveItemToFile REV] Item is missing filePath. Cannot save.', itemToSave);
      state.value.error = '保存失败：项目缺少文件路径信息。';
      state.value.autoSaveStatus = 'error';
      throw new Error('Item is missing filePath.');
    }
    console.log(`[Store saveItemToFile REV] Target file path: ${targetFilePath}`);
    try {
      const allMatchesForFile: Match[] = [];
      const allGroupsForFile: Group[] = [];
      if (state.value.config) {
          state.value.config.matches.forEach(m => {
              if (m.filePath === targetFilePath) {
                  allMatchesForFile.push(m);
              }
          });
           state.value.config.groups.forEach(g => {
              if (g.filePath === targetFilePath) {
                  allGroupsForFile.push(g);
              }
              const collectNestedMatches = (group: Group) => {
                  group.matches?.forEach(match => {
                     if (match.filePath === targetFilePath && !allMatchesForFile.some(m => m.id === match.id)) {
                         allMatchesForFile.push(match);
                     }
                  });
                  group.groups?.forEach(collectNestedMatches);
              };
              collectNestedMatches(g);
           });
      }
      console.log(`[Store saveItemToFile REV] Collected ${allMatchesForFile.length} matches and ${allGroupsForFile.length} top-level groups for file ${targetFilePath}.`);

      // Sort collected items by guiOrder before saving
      allMatchesForFile.sort((a, b) => (a.guiOrder ?? Infinity) - (b.guiOrder ?? Infinity));
      allGroupsForFile.sort((a, b) => (a.guiOrder ?? Infinity) - (b.guiOrder ?? Infinity));


      const saveData: YamlData = {};

      const cleanNested = (g: Group): any => {
        // Explicitly copy known/savable group properties
        const cleanedGroup: any = {
           name: g.name,
           prefix: g.prefix,
           label: g.label,
           // Add any other standard Espanso group keys here if needed
        };
        // Clean and add matches if they exist
        if (g.matches && g.matches.length > 0) {
           cleanedGroup.matches = g.matches.map(cleanMatchForSaving);
        }
         // Clean and add nested groups if they exist
        if (g.groups && g.groups.length > 0) {
           cleanedGroup.groups = g.groups.map(cleanNested);
        }
         // Remove empty arrays ONLY if they are optional in Espanso spec
         if (!cleanedGroup.matches || cleanedGroup.matches.length === 0) delete cleanedGroup.matches;
         if (!cleanedGroup.groups || cleanedGroup.groups.length === 0) delete cleanedGroup.groups;
         // Remove other optional fields if empty/null/undefined
         if (!cleanedGroup.prefix) delete cleanedGroup.prefix;
         if (!cleanedGroup.label) delete cleanedGroup.label;

        return cleanedGroup;
      };

      const cleanMatchForSaving = (match: Match): any => {
         const { id, type, filePath, updatedAt, content, contentType, guiOrder, _guiMeta, ...rest } = match;
         const cleanedMatch: any = { ...rest };

         // Handle trigger vs triggers logic
          if (cleanedMatch.trigger && typeof cleanedMatch.trigger === 'string') {
            if (cleanedMatch.trigger.includes('\n') || cleanedMatch.trigger.includes(',')) {
              const triggerItems = cleanedMatch.trigger.split(/[\n,]/).map((t: string) => t.trim()).filter((t: string) => t);
              if (triggerItems.length > 1) {
                cleanedMatch.triggers = triggerItems;
                delete cleanedMatch.trigger;
              } else {
                 cleanedMatch.trigger = triggerItems[0] || ''; // Use first or empty
                 delete cleanedMatch.triggers;
              }
            } else {
               delete cleanedMatch.triggers; // Ensure triggers is removed if single trigger exists
            }
         } else if (cleanedMatch.triggers && Array.isArray(cleanedMatch.triggers) && cleanedMatch.triggers.length > 0) {
            delete cleanedMatch.trigger; // Ensure single trigger is removed if array exists
              if (cleanedMatch.triggers.length === 0) {
                 cleanedMatch.trigger = '';
                  delete cleanedMatch.triggers;
              }
          } else {
              cleanedMatch.trigger = '';
              delete cleanedMatch.triggers;
          }

          // Remove other null/undefined/default optional fields
          Object.keys(cleanedMatch).forEach(key => {
             const value = cleanedMatch[key];
             if (value === null || value === undefined) {
                delete cleanedMatch[key];
             } else if (Array.isArray(value) && value.length === 0) {
                 delete cleanedMatch[key];
             } else if (typeof value === 'string' && value.trim() === '') {
                 if(['label', 'description', 'hotkey', 'image_path', 'markdown', 'html'].includes(key)) {
                    delete cleanedMatch[key];
                 }
             } else if (key === 'priority' && value === 0) {
                 delete cleanedMatch[key];
             } else if (key === 'force_mode' && value === 'default') {
                 delete cleanedMatch[key];
             } else if (key === 'uppercase_style' && value === '') {
                  delete cleanedMatch[key];
             }
          });
           if (!('replace' in cleanedMatch)) {
               cleanedMatch.replace = '';
           }
         return cleanedMatch;
      };

      if (allMatchesForFile.length > 0) {
        saveData.matches = allMatchesForFile.map(cleanMatchForSaving);
        if (saveData.matches.length === 0) delete saveData.matches;
      }
      if (allGroupsForFile.length > 0) {
         saveData.groups = allGroupsForFile.map(cleanNested);
          if (saveData.groups.length === 0) delete saveData.groups;
      }

      const fileNode = findFileNode(state.value.configTree, targetFilePath);
      if (fileNode && fileNode.content) {
        Object.keys(fileNode.content).forEach(key => {
          if (key !== 'matches' && key !== 'groups' && !(key in saveData)) {
              saveData[key] = fileNode.content![key];
          }
        });
      } else {
        console.warn("[Store saveItemToFile REV] Could not find original file node or content in tree to merge other keys for path:", targetFilePath);
      }

      const purifiedSaveData = JSON.parse(JSON.stringify(saveData));
      const yamlContent = Object.keys(purifiedSaveData).length === 0 ? '' : await serializeYaml(purifiedSaveData);
      await writeFile(targetFilePath, yamlContent);
      console.log('[Store saveItemToFile REV] File written successfully:', targetFilePath);

    } catch (error: any) {
      console.error(`[Store saveItemToFile REV] Failed to save file ${targetFilePath}:`, error);
      state.value.error = `保存文件 ${targetFilePath} 失败: ${error.message || '未知错误'}`;
      state.value.autoSaveStatus = 'error';
      throw error;
    }
  };

  // Action to show toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success', duration: number = 3000, persistent: boolean = false) => {
    // ... existing implementation ...
    // Clear previous timeout if exists
    if (state.value.toastTimeoutId) {
      clearTimeout(state.value.toastTimeoutId);
      state.value.toastTimeoutId = null; // Explicitly nullify after clearing
    }

    state.value.toastMessage = message;
    state.value.toastType = type;
    state.value.toastVisible = true;

    // Only set timeout if not persistent
    if (!persistent) {
      state.value.toastTimeoutId = setTimeout(() => {
        hideToast(); // Use hideToast to ensure proper cleanup
      }, duration);
    }
  };

  // Action to hide toast
  const hideToast = () => {
    // ... existing implementation ...
    state.value.toastVisible = false;
    // Clear timeout just in case it was set (e.g., if hiding manually before timeout)
    if (state.value.toastTimeoutId) {
      clearTimeout(state.value.toastTimeoutId);
      state.value.toastTimeoutId = null;
    }
    // Reset message and type
    state.value.toastMessage = null;
    state.value.toastType = null;
  };

  // --- NEW Action: Move File/Folder Node in Tree (With Physical File Move) ---
  const moveTreeNode = async (nodeId: string, targetParentId: string | null, newIndex: number) => {
    console.log(`[Store moveTreeNode] Moving node ${nodeId} to parent ${targetParentId} at index ${newIndex}`);

    if (!state.value.configTree) {
      console.error('[Store moveTreeNode] configTree is not available.');
      showToast('无法移动：配置树不可用', 'error');
      return;
    }
    // Check for required file system operations via preloadApi
    if (!window.preloadApi?.readFile || !window.preloadApi?.writeFile) {
        console.error('[Store moveTreeNode] File system operations (readFile, writeFile) not available via preloadApi.');
        showToast('无法移动：缺少文件系统操作接口 (read/write)', 'error');
        return;
    }

    // 定义节点类型
    type MoveableNode = {
      id: string;
      type: 'file' | 'folder';
      path: string;
      name: string;
      children?: ConfigTreeNode[];
    };

    // 查找要移动的节点
    let nodeToMove: MoveableNode | null = null;
    let oldParentNode: ConfigFolderNode | null = null;
    let oldIndexInParent: number = -1;

    // 辅助函数：查找节点及其父节点
    const findNodeAndParent = (nodes: ConfigTreeNode[], targetId: string, currentParent: ConfigFolderNode | null): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.id === targetId) {
          if (node.type === 'file' || node.type === 'folder') {
            // 确保节点有所有必需的属性
            if (node.id && node.path && node.name) {
              nodeToMove = {
                id: node.id,
                type: node.type,
                path: node.path,
                name: node.name,
                children: node.type === 'folder' ? (node as ConfigFolderNode).children : undefined
              };
              oldParentNode = currentParent;
              oldIndexInParent = i;
              return true;
            } else {
              console.error(`[Store moveTreeNode] Node with ID ${targetId} is missing required properties.`);
              return false;
            }
          } else {
            console.error(`[Store moveTreeNode] Node with ID ${targetId} is not a file or folder.`);
            return false;
          }
        }
        if (node.type === 'folder' && node.children) {
          if (findNodeAndParent(node.children, targetId, node as ConfigFolderNode)) {
            return true;
          }
        }
      }
      return false;
    };

    // 在主树中查找节点及其原始父节点
    findNodeAndParent(state.value.configTree, nodeId, null);

    // 类型检查和路径检查
    if (!nodeToMove) {
      console.error(`[Store moveTreeNode] Node with ID ${nodeId} not found.`);
      showToast('无法移动：找不到节点', 'error');
      return;
    }

    // 确保路径和名称存在
    if (!nodeToMove.path || !nodeToMove.name) {
      console.error(`[Store moveTreeNode] Node ${nodeId} (${nodeToMove.type}) is missing path or name information.`);
      showToast('无法移动：节点信息不完整 (路径或名称丢失)', 'error');
      return;
    }

    // 查找目标父节点
    let targetParentNode: ConfigFolderNode | null = null;
    if (targetParentId) {
      const findTargetParent = (nodes: ConfigTreeNode[], targetId: string): ConfigFolderNode | null => {
        for (const node of nodes) {
          if (node.type === 'folder' && node.id === targetId) {
            return node as ConfigFolderNode;
          }
          if (node.type === 'folder' && node.children) {
            const found = findTargetParent(node.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      targetParentNode = findTargetParent(state.value.configTree, targetParentId);
      if (!targetParentNode) {
        console.error(`[Store moveTreeNode] Target parent folder with ID ${targetParentId} not found.`);
        showToast('无法移动：找不到目标文件夹', 'error');
        return;
      }
      // 确保目标父节点有路径
      if (!targetParentNode.path) {
        console.error(`[Store moveTreeNode] Target parent folder ${targetParentId} is missing path information.`);
        showToast('无法移动：目标文件夹路径信息不完整', 'error');
        return;
      }
    } else {
      console.error('[Store moveTreeNode] Target parent ID is null. Root moves not supported yet.');
      showToast('无法移动：不支持移动到根目录', 'error');
      return;
    }

    // 确定路径
    const originalPath = nodeToMove.path;
    const targetParentDirPath = targetParentNode.path;
    const targetPath = `${targetParentDirPath}/${nodeToMove.name}`;

    console.log(`[Store moveTreeNode] Moving file from ${originalPath} to ${targetPath}`);

    try {
      // 根据节点类型执行不同的操作
      if (nodeToMove.type === 'file') {
        // 处理文件
        // 1. 读取原文件内容
        const fileContent = await window.preloadApi.readFile(originalPath);
        console.log(`[Store moveTreeNode] Read original file content (${fileContent.length} bytes)`);

        // 2. 写入新文件
        await window.preloadApi.writeFile(targetPath, fileContent);
        console.log(`[Store moveTreeNode] Wrote content to new file at ${targetPath}`);
      } else if (nodeToMove.type === 'folder') {
        // 处理文件夹
        console.log(`[Store moveTreeNode] Moving directory from ${originalPath} to ${targetPath}`);

        // 创建目标目录
        // 注意：这里我们需要一个创建目录的函数，但预加载API中可能没有直接提供
        // 我们可以使用writeFile的副作用来创建目录（因为它会自动创建父目录）
        await window.preloadApi.writeFile(`${targetPath}/.placeholder`, '');
        console.log(`[Store moveTreeNode] Created target directory at ${targetPath}`);

        // 递归复制文件夹内容
        // 这需要一个递归函数来遍历源目录中的所有文件和子目录
        // 由于这是一个复杂操作，我们可能需要在主进程中实现它
        // 暂时，我们可以显示一个消息，告诉用户文件夹移动功能尚未完全实现
        showToast('文件夹移动功能尚未完全实现，只移动了文件夹结构', 'warning');
      }

      // 3. 更新节点路径
      nodeToMove.path = targetPath;

      // 4. 在内存中移动节点
      if (oldParentNode && oldParentNode.children && oldIndexInParent >= 0) {
        // 从旧位置删除
        oldParentNode.children.splice(oldIndexInParent, 1);

        // 添加到新位置
        if (targetParentNode.children) {
          // 确保新索引在范围内
          const safeNewIndex = Math.min(Math.max(0, newIndex), targetParentNode.children.length);
          targetParentNode.children.splice(safeNewIndex, 0, nodeToMove);
        } else {
          targetParentNode.children = [nodeToMove];
        }

        console.log(`[Store moveTreeNode] Node moved in memory from ${oldParentNode.id || 'root'} to ${targetParentNode.id || 'root'}`);
      } else {
        console.error('[Store moveTreeNode] Could not determine old parent or index.');
        showToast('内存中移动失败：无法确定原始位置', 'error');
      }

      // 5. 标记状态为已保存
      state.value.hasUnsavedChanges = false;
      state.value.hasUnsavedFileSystemChanges = false;

      showToast('文件已成功移动', 'success');
    } catch (error) {
      console.error('[Store moveTreeNode] Error moving file:', error);
      showToast(`移动文件失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  return {
    state,
    allItems,
    allMatches,
    allGroups,
    selectedItem,
    findItemById,
    findItemInGroup,
    loadConfig,
    autoSaveConfig,
    updateConfigState,
    updateItem,
    deleteItem,
    addItem,
    getAllMatchesFromTree,
    getAllGroupsFromTree,
    getConfigFileByPath: (path: string) => findFileNode(state.value.configTree, path),
    saveItemToFile,
    showToast,
    hideToast,
    moveTreeItem,
    moveTreeNode,
  };
});
