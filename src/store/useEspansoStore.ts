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
}

export interface ConfigFolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: (ConfigFileNode | ConfigFolderNode)[];
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
  // --- Comment out fullscreen and platform state ---
  // isFullscreen: boolean;
  // platform: 'darwin' | 'win32' | 'linux' | null;
  // --- End state comment out ---
}

export const useEspansoStore = defineStore('espanso', () => {
  const state = ref<State>({
    config: null,
    configPath: null,
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
    // --- Comment out initialization ---
    // isFullscreen: false,
    // platform: null
    // --- End comment out ---
  });

  // --- Define helper functions outside computed/actions if possible, or ensure they are in scope ---
  // Example: Moving getAllMatchesFromTree (adjust based on actual dependencies)
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

  // Generate unique ID
  const generateId = (prefix: string): string => {
    return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
  };

  // Check if file is a config file
  const isConfigFile = (fileName: string): boolean => {
    return (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) && !fileName.startsWith('_');
  };

  // Process raw match data into internal format
  const processMatch = (match: any, filePath?: string): Match => {
    return {
      id: match.id || generateId('match'),
      type: 'match',
      trigger: match.trigger || '',
      replace: match.replace || '',
      filePath: filePath || match.filePath || '',
      ...(match as Omit<Match, 'id' | 'type' | 'trigger' | 'replace' | 'filePath'>)
    };
  };

  // Process raw group data into internal format
  const processGroup = (group: any, filePath?: string): Group => {
    const processedGroup: Group = {
      id: group.id || generateId('group'),
      type: 'group',
      name: group.name || '未命名分组',
      matches: [],
      groups: [],
      filePath: filePath || group.filePath || '',
      ...(group as Omit<Group, 'id' | 'type' | 'name' | 'matches' | 'groups' | 'filePath'>)
    };
    processedGroup.matches = Array.isArray(group.matches) ? group.matches.map((match: any) => processMatch(match, filePath)) : [];
    processedGroup.groups = Array.isArray(group.groups) ? group.groups.map((nestedGroup: any) => processGroup(nestedGroup, filePath)) : [];
    return processedGroup;
  };

  // Create a file node for the config tree
  const createFileNode = (file: FileInfo, content: YamlData, fileType: 'match' | 'config' | 'package', processedMatches: Match[], processedGroups: Group[]): ConfigFileNode => {
    return {
      type: 'file',
      name: file.name,
      path: file.path,
      fileType,
      content, // Store original parsed content
      matches: processedMatches, // Use pre-processed matches
      groups: processedGroups   // Use pre-processed groups
    };
  };

  // Create a folder node for the config tree
  const createFolderNode = (name: string, path: string): ConfigFolderNode => {
    return {
      type: 'folder',
      name,
      path,
      children: []
    };
  };

  // Add a node to the config tree structure
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
  
  // Find a file node in the tree by path
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

  // Recursively find an item (Match or Group) within a Group
  const findItemInGroup = (group: Group, id: string): Match | Group | null => {
    if (group.matches) {
      const match = group.matches.find(m => m.id === id);
      if (match) return match;
    }
    if (group.groups) {
      for (const nestedGroup of group.groups) {
        if (nestedGroup.id === id) return nestedGroup; // Check group itself
        const item = findItemInGroup(nestedGroup, id);
        if (item) return item;
      }
    }
    return null;
  };
  
  // Find an item (Match or Group) by ID anywhere in the config
  const findItemById = (id: string): Match | Group | null => {
    if (!state.value.config) {
      return null;
    }
    const match = state.value.config.matches.find(m => m.id === id);
    if (match) {
      return match;
    }
    for (const group of state.value.config.groups) {
      if (group.id === id) {
        return group;
      }
      const item = findItemInGroup(group, id);
      if (item) {
        return item;
      }
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
    console.log('开始加载配置，路径:', configDirOrPath);
    state.value.loading = true;
    state.value.error = null;
    state.value.configTree = [];
    state.value.config = { matches: [], groups: [] }; // Reset config
    state.value.globalConfig = null;
    state.value.globalConfigPath = null;
    state.value.configPath = null; // Reset configPath initially

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
              const fileNode = createFileNode({ name: 'default.yml', path: defaultGlobalPath, extension: '.yml' }, yaml, 'config', [], []);
              addToTree(configTree, fileNode, 'config');
              console.log('加载全局配置成功:', defaultGlobalPath);
          } catch(e) { console.warn('加载全局配置失败:', e); }
      }

      // 2. Load Match Files
      const matchDir = safeJoinPath(configDir, 'match');
      if (await fileExists(matchDir)) {
          const matchDirTree = await scanDirectory(matchDir);
          console.log('匹配目录结构:', matchDirTree); 

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
                        ? yaml.groups.map((group: Group) => processGroup(group, dirNode.path))
                        : [];

                      // Create file node using the processed items
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
          const exampleMatch = processMatch({ trigger: ':hello', replace: 'Hello World!' }, safeJoinPath(matchDir, 'base.yml'));
          currentMatches.push(exampleMatch);
          firstMatchFilePath = exampleMatch.filePath;
          const exampleYaml = { matches: [{ trigger: ':hello', replace: 'Hello World!' }] };
          try {
            await writeFile(exampleMatch.filePath, await serializeYaml(exampleYaml));
            const fileNode = createFileNode({ name: 'base.yml', path: exampleMatch.filePath, extension: '.yml' }, exampleYaml, 'match', [exampleMatch], []);
            addToTree(configTree, fileNode, '');
             console.log('示例文件已创建:', exampleMatch.filePath);
          } catch(e) { console.error('创建示例文件失败:', e); }
      }

      // Update state
      state.value.configTree = configTree;
      state.value.config = { matches: currentMatches, groups: currentGroups };
      // Set configPath to the first file found containing matches/groups, or default to base.yml
      state.value.configPath = firstMatchFilePath || safeJoinPath(matchDir, 'base.yml'); 
      state.value.lastSavedState = JSON.stringify(state.value.config, null, 2); // Initialize saved state
      state.value.hasUnsavedChanges = false;

      console.log('配置加载完成', { path: state.value.configPath, matches: currentMatches.length, groups: currentGroups.length });

    } catch (error: any) {
      console.error('加载配置失败:', error);
      state.value.error = `加载配置失败: ${error.message}`;
       // Ensure minimal state exists even on error
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

      // --- REMOVED Reload config logic --- 
      /*
      const currentConfigDir = state.value.configPath ? state.value.configPath.substring(0, state.value.configPath.lastIndexOf('/')) : null;
      if (currentConfigDir && (currentConfigDir.endsWith('/match') || currentConfigDir.endsWith('/config'))) {
        const baseDir = currentConfigDir.substring(0, currentConfigDir.lastIndexOf('/'));
        console.log('[Store autoSaveConfig] Reloading configuration from base directory after save:', baseDir);
        await loadConfig(baseDir);
      } else if (state.value.configPath) { // Fallback if path structure is different
         console.warn('[Store autoSaveConfig] Could not reliably determine base directory from configPath, attempting reload with existing path which might be incorrect for full reload:', state.value.configPath);
         // Attempt reload with configPath, might not reload everything if it was just a file path
         await loadConfig(state.value.configPath);
      } else {
          console.error('[Store autoSaveConfig] Cannot reload config after save: configPath is missing.');
      }
      */

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

  // Helper to find and update item within a Group object (used by findAndUpdateInTree)
  const findAndUpdateInGroup = (group: Group, updatedItem: Match | Group): boolean => {
      if (updatedItem.type === 'match' && group.matches) {
          const index = group.matches.findIndex(m => m.id === updatedItem.id);
          if (index !== -1) {
              group.matches[index] = updatedItem as Match; // Replace reference
              return true;
          }
      }
      if (group.groups) {
          for (let i = 0; i < group.groups.length; i++) {
               if (updatedItem.type === 'group' && group.groups[i].id === updatedItem.id) {
                   group.groups[i] = updatedItem as Group; // Replace reference
                   return true;
               }
               if (findAndUpdateInGroup(group.groups[i], updatedItem)) {
                   return true;
               }
          }
      }
      return false;
  };

  // Helper to find and update item reference in the configTree
  const findAndUpdateInTree = (nodes: ConfigTreeNode[], updatedItem: Match | Group): boolean => {
      for (const node of nodes) {
          if (node.type === 'file') {
              if (updatedItem.type === 'match' && node.matches) {
                  const index = node.matches.findIndex(m => m.id === updatedItem.id);
                  if (index !== -1) {
                      node.matches[index] = updatedItem as Match; // Replace reference
                      return true;
                  }
              } else if (updatedItem.type === 'group' && node.groups) {
                  const index = node.groups.findIndex(g => g.id === updatedItem.id);
                  if (index !== -1) {
                      node.groups[index] = updatedItem as Group; // Replace reference
                      return true;
                  }
                  // Recursively search within groups in the file node
                  for(const groupInFile of node.groups) {
                     if (findAndUpdateInGroup(groupInFile, updatedItem)) return true;
                  }
              }
          } else if (node.type === 'folder') {
              if (findAndUpdateInTree(node.children, updatedItem)) {
                  return true;
              }
          }
      }
      return false;
  };

  // Update config state and sync configTree reference
  const updateConfigState = (itemId: string, updateData: Partial<Match> | Partial<Group>) => {
    try {
      // console.log(`[Store updateConfigState] Updating item ID: ${itemId} with data:`, JSON.parse(JSON.stringify(updateData)));
      if (!state.value.config) {
        console.error("Cannot update state, config is null.");
        return;
      }

      let targetItem: Match | Group | null = null;

      // 1. Find the item in the flat list (matches)
      let matchIndex = state.value.config.matches.findIndex(m => m.id === itemId);
      if (matchIndex !== -1) {
        targetItem = state.value.config.matches[matchIndex];
        // Apply updates directly (mutate)
        Object.assign(targetItem, updateData);
        // console.log('[Store updateConfigState] Updated item in config.matches:', JSON.parse(JSON.stringify(targetItem)));
      } else {
        // 2. If not in matches, find in groups (recursively)
        const findInGroupsRecursive = (groups: Group[]): Group | null => {
          for (let i = 0; i < groups.length; i++) {
            if (groups[i].id === itemId) {
              targetItem = groups[i];
              // Apply updates directly (mutate)
              Object.assign(targetItem, updateData);
              // console.log('[Store updateConfigState] Updated item in config.groups:', JSON.parse(JSON.stringify(targetItem)));
              return targetItem;
            }
            if (groups[i].groups) {
              const found = findInGroupsRecursive(groups[i].groups!);
              if (found) return found;
            }
          }
          return null;
        };
        findInGroupsRecursive(state.value.config.groups); // Call the recursive function
      }

      if (!targetItem) {
        console.error(`[Store updateConfigState] Item with ID ${itemId} not found in config.`);
        // Optionally throw error or handle differently
        return; 
      }

      // 3. Find and update the item reference in the configTree
      if (!findAndUpdateInTree(state.value.configTree, targetItem)) {
        console.warn(`[Store updateConfigState] Item ID ${itemId} was updated in config, but not found/updated in configTree. Tree might be out of sync.`);
        // This indicates a potential issue in tree structure or update logic
      } else {
        // console.log(`[Store updateConfigState] Item ID ${itemId} reference updated in configTree.`);
      }

      // Mark changes as unsaved
      state.value.hasUnsavedChanges = true;
      state.value.autoSaveStatus = 'idle';

      // console.log('配置状态更新完成，标记为未保存');

    } catch (error: any) {
      console.error('更新配置状态失败:', error);
      state.value.error = `更新配置状态失败: ${error.message}`;
    }
  };

  // --- Item CRUD Actions (call updateConfigState or specific logic) ---

  const updateItem = async (item: Match | Group) => {
    console.log('[Store updateItem] Received item:', JSON.parse(JSON.stringify(item)));
    // Call the new updateConfigState with ID and data
    updateConfigState(item.id, item);
  };

  const deleteItem = async (id: string, type: 'match' | 'group') => {
    console.log(`[Store deleteItem] Deleting ${type} with id: ${id}`);
    // TODO: Implement proper deletion from state AND tree
    // Temporarily reverting to a function-based update to avoid breaking changes
    // This needs a dedicated deletion logic for both config and configTree
    const updateFn = (config: EspansoConfig) => {
        if (type === 'match') {
            config.matches = config.matches.filter(i => i.id !== id);
        } else {
            const removeGroupRecursive = (groups: Group[]): Group[] => {
                return groups.filter(group => group.id !== id).map(group => {
                    if (group.groups) {
                        group.groups = removeGroupRecursive(group.groups);
                    }
                    return group;
                });
            };
            config.groups = removeGroupRecursive(config.groups);
        }
    };
    // This uses the OLD signature temporarily - find a better way
    // We need a way to pass the ID and signal deletion, or create deleteConfigState
    try {
        console.log('[Store deleteItem] Starting state update (temp logic)...');
        if (!state.value.config) {
            console.error("Cannot update state, config is null.");
            return;
        }
        const newConfig = cloneDeep(state.value.config);
        updateFn(newConfig);
        state.value.config = newConfig;
        // TODO: Also remove from configTree!
        console.warn('[Store deleteItem] Item removed from config, but NOT from configTree. Tree is out of sync!')
        state.value.hasUnsavedChanges = true;
        state.value.autoSaveStatus = 'idle';
        console.log('配置状态更新完成 (delete - temp logic)，标记为未保存');
    } catch (error: any) {
        console.error('更新配置状态失败 (delete - temp logic): ', error);
    }

    // Need to trigger save after deletion if required
    // const itemToDelete = findItemById(id); // Find before deleting from state
    // if (itemToDelete?.filePath) {
    //   await saveFileByPath(itemToDelete.filePath); // Need a saveFileByPath function
    // }
  };

  const addItem = async (item: Match | Group) => {
     console.log(`[Store addItem] Adding new ${item.type}:`, JSON.parse(JSON.stringify(item)));
     if (!item.filePath) {
         item.filePath = state.value.configPath || undefined;
         console.warn(`[Store addItem] Item missing filePath, assigned: ${item.filePath}`);
         if (!item.filePath) {
             console.error("[Store addItem] Cannot add item without a filePath and no active configPath.");
             return;
         }
     }
     // TODO: Implement proper addition to state AND tree
     // Temporarily reverting to a function-based update
     const updateFn = (config: EspansoConfig) => {
        if (item.type === 'match') {
            config.matches.push(item);
        } else {
            config.groups.push(item);
        }
     };
      try {
        console.log('[Store addItem] Starting state update (temp logic)...');
        if (!state.value.config) {
            // Handle case where config is null, maybe initialize it?
             console.error("Cannot add item, config is null.");
             return;
        }
        const newConfig = cloneDeep(state.value.config);
        updateFn(newConfig);
        state.value.config = newConfig;
        // TODO: Also add to configTree!
        console.warn('[Store addItem] Item added to config, but NOT to configTree. Tree is out of sync!')
        state.value.hasUnsavedChanges = true;
        state.value.autoSaveStatus = 'idle';
        console.log('配置状态更新完成 (add - temp logic)，标记为未保存');
    } catch (error: any) {
        console.error('更新配置状态失败 (add - temp logic): ', error);
    }
    // Need to trigger save after addition if required
    // await saveItemToFile(item);
  };

  // --- Comment out initialization action --- 
  /*
  const initializePlatformAndFullscreenListener = () => {
    const api = window.preloadApi as PreloadApi | undefined;
    if (api) { 
      try {
        const currentPlatform = api.getPlatform(); 
        state.value.platform = currentPlatform;
        console.log('Platform detected:', currentPlatform);
        const removeListener = api.onFullScreenChange((isFullScreen: boolean) => { 
          console.log('Fullscreen state changed:', isFullScreen);
          state.value.isFullscreen = isFullScreen;
        });
      } catch (error) {
        console.error("Error setting up platform/fullscreen listener:", error);
      }
    } else {
      console.warn("Preload API not available for platform/fullscreen detection.");
      state.value.platform = null; 
    }
  };
  */
  // --- End comment out action --- 

  // Save a specific item (Match or Group) to its corresponding file
  const saveItemToFile = async (itemToSave: Match | Group) => {
    console.log(`[Store saveItemToFile] Attempting to save item ID: ${itemToSave.id} to its file.`);
    state.value.autoSaveStatus = 'saving';

    const targetFilePath = itemToSave.filePath;
    if (!targetFilePath) {
      console.error('[Store saveItemToFile] Item is missing filePath. Cannot save.', itemToSave);
      state.value.error = '保存失败：项目缺少文件路径信息。';
      state.value.autoSaveStatus = 'error';
      return;
    }

    console.log(`[Store saveItemToFile] Target file path: ${targetFilePath}`);

    try {
      // 1. Get all items belonging to the target file from the current state
      const allMatchesForFile = (state.value.config?.matches || []).filter(m => m.filePath === targetFilePath);
      const allGroupsForFile = (state.value.config?.groups || []).filter(g => g.filePath === targetFilePath);
      console.log(`[Store saveItemToFile] Found ${allMatchesForFile.length} matches and ${allGroupsForFile.length} groups for file ${targetFilePath}`);

      // Ensure the item being saved is included (update or add)
      let itemFound = false;
      if (itemToSave.type === 'match') {
        const index = allMatchesForFile.findIndex(m => m.id === itemToSave.id);
        if (index !== -1) {
          allMatchesForFile[index] = itemToSave; // Update existing
          itemFound = true;
        } else {
          allMatchesForFile.push(itemToSave); // Add new
        }
      } else {
        const index = allGroupsForFile.findIndex(g => g.id === itemToSave.id);
        if (index !== -1) {
          allGroupsForFile[index] = itemToSave; // Update existing
          itemFound = true;
        } else {
          allGroupsForFile.push(itemToSave); // Add new
        }
      }
      console.log(`[Store saveItemToFile] Item ${itemToSave.id} ${itemFound ? 'updated' : 'added'} in the list for saving.`);

      // 2. Prepare data for YAML serialization (cleaning and merging)
      const saveData: YamlData = {};

      // Recursive cleaner function for groups (same as before)
      const cleanNested = (g: Group): any => {
        const { id, type, filePath, matches, groups, ...rest } = g;
        const cleanedGroup: any = { ...rest };
        if (matches && matches.length > 0) {
          cleanedGroup.matches = matches.map((m: Match) => {
            const { id: mId, type: mType, filePath: mFilePath, ...mRest } = m;
            // Ensure properties like uppercase_style are handled if null/undefined
            if (mRest.uppercase_style === null || mRest.uppercase_style === undefined) {
              delete mRest.uppercase_style;
            }
            // Add similar checks for other optional fields if needed
            return mRest;
          });
        }
        if (groups && groups.length > 0) {
          cleanedGroup.groups = groups.map((subG: Group) => cleanNested(subG));
        }
        return cleanedGroup;
      };

      // Add matches if any
      if (allMatchesForFile.length > 0) {
        saveData.matches = allMatchesForFile.map((match: Match) => {
          const { id, type, filePath, ...rest } = match;
           if (rest.uppercase_style === null || rest.uppercase_style === undefined) {
              delete rest.uppercase_style;
            }
          return rest;
        });
      }

      // Add groups if any
      if (allGroupsForFile.length > 0) {
        saveData.groups = allGroupsForFile.map(cleanNested);
      }

      // 3. Merge other top-level keys from original file content
      const fileNode = findFileNode(state.value.configTree, targetFilePath);
      if (fileNode && fileNode.content) {
        Object.keys(fileNode.content).forEach(key => {
          if (key !== 'matches' && key !== 'groups' && !(key in saveData)) {
            if (fileNode.content) { // Double check content exists
               saveData[key] = fileNode.content[key];
            }
          }
        });
        console.log("[Store saveItemToFile] Merged other keys from original file content.");
      } else {
        console.warn("[Store saveItemToFile] Could not find original file node or content to merge other keys for path:", targetFilePath);
      }

      // 4. Serialize and Write File
      console.log('[Store saveItemToFile] Preparing to write file with saveData:', JSON.parse(JSON.stringify(saveData)));
      const purifiedSaveData = JSON.parse(JSON.stringify(saveData));
      const yamlContent = Object.keys(purifiedSaveData).length === 0 ? '' : await serializeYaml(purifiedSaveData);

      await writeFile(targetFilePath, yamlContent);
      console.log('[Store saveItemToFile] File written successfully:', targetFilePath);

      // 5. Update state: mark as saved
      state.value.hasUnsavedChanges = false;
      state.value.autoSaveStatus = 'saved';
      // Optional: update lastSavedState if needed, though it might be complex now
      // state.value.lastSavedState = JSON.stringify(state.value.config, null, 2);

    } catch (error: any) {
      console.error(`[Store saveItemToFile] Failed to save file ${targetFilePath}:`, error);
      state.value.error = `保存文件 ${targetFilePath} 失败: ${error.message || '未知错误'}`;
      state.value.autoSaveStatus = 'error';
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
    getAllMatchesFromTree: getAllMatchesFromTree,
    getAllGroupsFromTree: getAllGroupsFromTree,
    getConfigFileByPath: (path: string) => findFileNode(state.value.configTree, path),
    findFileNode,
    saveItemToFile,
    // --- Comment out exposure --- 
    // initializePlatformAndFullscreenListener
    // --- End comment out --- 
  };
});
