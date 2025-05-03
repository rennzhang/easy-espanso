import { defineStore } from 'pinia';
import { ref, computed, toRaw } from 'vue';
import { Match, Group, EspansoConfig } from '../types/espanso';
import { PreloadApi, FileInfo, YamlData } from '../types/preload';
import {
  readFile, parseYaml, writeFile, serializeYaml,
  scanDirectory, fileExists
  } from '../services/fileService';
import {
  generateId,
  resetGuiOrderCounter,
  processMatch,
  processGroup,
  findItemInEspansoConfig,
  findItemByIdRecursive,
  findAndUpdateInGroup
} from '@/utils/espansoDataUtils';
import {
  createFileNode, createFolderNode, addToTree, findFileNode,
  findNodeById,
  getFilePathForNodeId,
  getDescendantNodeIds,
  findAndUpdateInTree,
  updateDescendantPathsAndFilePaths
} from '@/utils/configTreeUtils';
import ClipboardManager from '@/utils/ClipboardManager';
import type { ConfigTreeNode, ConfigFileNode, ConfigFolderNode } from '@/utils/configTreeUtils';

declare global {
  interface Window {
    preloadApi?: PreloadApi;
  }
}

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

// Export the State interface
export interface State {
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
    hasUnsavedFileSystemChanges: false,
  });

  // --- Define helper functions outside computed/actions if possible, or ensure they are in scope ---
  const getAllMatchesFromTree = (): Match[] => {
    const matches: Match[] = [];
    const traverseTree = (nodes: ConfigTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          node.matches?.forEach((m: Match) => matches.push(m));
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
          node.groups?.forEach((g: Group) => groups.push(g));
        } else if (node.type === 'folder' && node.children) {
          traverseTree(node.children);
        }
      }
    };
    traverseTree(state.value.configTree);
    return groups;
  };

  // --- Helpers ---

  const isConfigFile = (fileName: string): boolean => {
    return (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) && !fileName.startsWith('_');
  };

  const getFilePathForMatchOrGroup = (itemId: string): string | null => {
    return getFilePathForNodeId(state.value.configTree, itemId);
  };

  // Ensure findItemById definition exists and uses the util
  const findItemById = (id: string): Match | Group | null => {
    return findItemInEspansoConfig(state.value.config, id);
  };

  // --- Computed Properties ---

  const allMatches = computed(getAllMatchesFromTree);
  const allGroups = computed(getAllGroupsFromTree);
  const allItems = computed((): (Match | Group)[] => [...allMatches.value, ...allGroups.value]);

  const selectedItem = computed(() => {
    return state.value.selectedItemId ? findItemById(state.value.selectedItemId) : null;
  });

  const internalClipboardContent = computed(() => { /* ... */ });

  // --- Core Actions ---

  const loadConfig = async (configDirOrPath: string): Promise<void> => {
    resetGuiOrderCounter();
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

  // --- Helper to find any item associated with a specific file path ---
  // Moved from deleteItem to be reusable
  const findAnyItemForFile = (path: string): Match | Group | undefined => {
      const findRecursive = (items: (Match | Group)[]): Match | Group | undefined => {
          for (const item of items) {
              // Check top-level item
              if (item.filePath === path) return item;
              // Check matches within a group
              if (item.type === 'group' && item.matches) {
                 const foundMatch = item.matches.find(m => m.filePath === path);
                 if (foundMatch) return foundMatch;
              }
              // Recursively check nested groups
               if (item.type === 'group' && item.groups) {
                   const found = findRecursive(item.groups);
                   if (found) return found;
               }
          }
          return undefined;
      };
      // Search in both top-level matches and groups
      return findRecursive([...(state.value.config?.matches || []), ...(state.value.config?.groups || [])]);
  }

  // --- Helper to add item to nested group in flat list ---
  const findAndAddInFlatList = (groups: Group[], parentId: string, newItem: Match | Group): boolean => {
      const parentGroup = groups.find(g => g.id === parentId);
      if (parentGroup) {
          if (newItem.type === 'match') {
              if (!parentGroup.matches) parentGroup.matches = [];
              if (!parentGroup.matches.some(m => m.id === newItem.id)) {
                  parentGroup.matches.push(newItem);
                  return true;
              }
          } else { // newItem.type === 'group'
              if (!parentGroup.groups) parentGroup.groups = [];
              if (!parentGroup.groups.some(g => g.id === newItem.id)) {
                  parentGroup.groups.push(newItem);
                  return true;
              }
          }
          return false; // Already exists in this parent
      }
      // Recursive search (Optional - keeping it simple for now)
      // for (const group of groups) {
      //   if (group.groups && findAndAddInFlatList(group.groups, parentId, newItem)) {
      //      return true;
      //   }
      // }
      return false;
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
            // Use the refactored helper function
            const triggerItem = findAnyItemForFile(filePathToSave);
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
        } catch (error) {
             console.error(`[Store deleteItem] Failed to save file ${filePathToSave} after deletion:`, error);
             state.value.hasUnsavedChanges = true;
             state.value.autoSaveStatus = 'error';
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


  // 修改 addItem 函数以接受可选的 parentGroupId
  const addItem = async (item: Match | Group, parentGroupId?: string | null) => {
    console.log(`[Store addItem] ENTERED. Item ID: ${item.id}, Type: ${item.type}, Target Parent Group ID: ${parentGroupId}`);
    if (!item.filePath) {
      item.filePath = state.value.configPath || undefined; // Assign default path if missing
      console.warn(`[Store addItem] Item missing filePath, assigned default: ${item.filePath}`);
      if (!item.filePath) {
        console.error("[Store addItem] Cannot add item without a filePath and no active configPath.");
        return;
      }
    }
    if (!item.id) {
      item.id = generateId(item.type); // Ensure ID exists
    }
    if (!state.value.config) {
      console.error("Cannot add item, config is null.");
      return;
    }

    let addedToParentGroupInTree = false;

    // --- Find target parent (File Node or specific Group) and Add to Tree ---
    const targetFileNode = findFileNode(state.value.configTree, item.filePath!);
    console.log(`[Store addItem] Found targetFileNode: ${targetFileNode?.path}`);

    if (targetFileNode) {
        let targetArrayInTree: Match[] | Group[] | undefined;
        let parentGroupInTree: Group | null = null;

        if (parentGroupId) {
            // Find the specific parent group DIRECTLY within the file node's groups array
            // Removed recursive search here for simplicity and to fix type error
            parentGroupInTree = targetFileNode.groups?.find(g => g.id === parentGroupId) ?? null;
            if (parentGroupInTree) {
                if (item.type === 'match') {
                    if (!parentGroupInTree.matches) parentGroupInTree.matches = [];
                    targetArrayInTree = parentGroupInTree.matches;
                } else { // item.type === 'group'
                    if (!parentGroupInTree.groups) parentGroupInTree.groups = [];
                    targetArrayInTree = parentGroupInTree.groups;
                }
                console.log(`[Store addItem] Tree Target: Group ${parentGroupId} in file ${item.filePath}`);
            } else {
                console.warn(`[Store addItem] Parent group ${parentGroupId} not found in tree or not a group. Adding to file root.`);
                parentGroupId = null; // Fallback to file root for tree addition
            }
        }

        // If not adding to a specific group, add to the file's root in the tree
        if (!parentGroupId) {
            if (item.type === 'match') {
                if (!targetFileNode.matches) targetFileNode.matches = [];
                targetArrayInTree = targetFileNode.matches;
            } else { // item.type === 'group'
                if (!targetFileNode.groups) targetFileNode.groups = [];
                targetArrayInTree = targetFileNode.groups;
            }
             console.log(`[Store addItem] Tree Target: File ${item.filePath}`);
        }

        // Add item to the determined target array in the tree
        if (targetArrayInTree) {
           if (!targetArrayInTree.some(existingItem => existingItem.id === item.id)) {
              targetArrayInTree.push(item as any); // Use 'as any' or improve typing
              addedToParentGroupInTree = !!parentGroupId; // Mark if added to a group
              console.log(`[Store addItem] Added item ${item.id} to targetArrayInTree.`);
           } else {
               console.warn(`[Store addItem] Item with ID ${item.id} already exists in the target tree array. Skipping add.`);
           }
        } else {
            console.error(`[Store addItem] Could not determine target array in tree for item ${item.id}.`);
        }

    } else {
        console.error(`[Store addItem] Could not find target file node in tree for path ${item.filePath}. Tree might be out of sync!`);
    }

    // --- Update flat list (state.config) --- Needs careful handling for nesting
    let addedToFlatList = false;
    // REMOVED internal definition of findAndAddInFlatList

    if (addedToParentGroupInTree && parentGroupId) { // Use parentGroupId determined for tree
        // Call the extracted helper function
        if (findAndAddInFlatList(state.value.config.groups, parentGroupId, item)) {
            console.log(`[Store addItem] Added item ${item.id} to parent group ${parentGroupId} in flat list.`);
            addedToFlatList = true;
        } else {
            console.warn(`[Store addItem] Added item ${item.id} to parent group ${parentGroupId} in tree, but failed to add to flat list (maybe already exists?).`);
        }
    }

    // If not added to a parent group in the flat list OR if it wasn't meant for a parent group
    if (!addedToFlatList && !parentGroupId) {
        if (item.type === 'match') {
            if (!state.value.config.matches.some(m => m.id === item.id)) {
                state.value.config.matches.push(item);
                addedToFlatList = true;
                console.log(`[Store addItem] Added item ${item.id} to top-level matches in flat list.`);
            }
        } else { // item.type === 'group'
            if (!state.value.config.groups.some(g => g.id === item.id)) {
                state.value.config.groups.push(item);
                addedToFlatList = true;
                console.log(`[Store addItem] Added item ${item.id} to top-level groups in flat list.`);
            }
        }
    }

    if (!addedToFlatList) {
        console.warn(`[Store addItem] Item ${item.id} was not added to the flat list (state.config). It might already exist there.`);
    }


    // --- Save the file --- Only save if item was actually added somewhere
    if (addedToFlatList || addedToParentGroupInTree) { // Check if added to either structure
      try {
        console.log(`[Store addItem] Calling saveItemToFile for item ${item.id} in file ${item.filePath}`);
        await saveItemToFile(item); // Save the file containing the new/moved item
        state.value.hasUnsavedChanges = false;
        state.value.autoSaveStatus = 'idle';
      } catch (error) {
        console.error('[Store addItem] Failed to save file after adding item:', error);
        state.value.hasUnsavedChanges = true;
        state.value.autoSaveStatus = 'error';
      }
      // Optionally select the newly added item
      state.value.selectedItemId = item.id;
    } else {
        console.log(`[Store addItem] Item ${item.id} not added to state, skipping save.`);
        // Maybe select existing item if it was detected?
        if (state.value.config.matches.some(m => m.id === item.id) || state.value.config.groups.some(g => g.id === item.id)){
            state.value.selectedItemId = item.id;
        }
    }
  };


  // --- Tree Manipulation Action (REVISED) ---
  const moveTreeItem = async (itemId: string, oldParentId: string | null, newParentId: string | null, oldIndex: number, newIndex: number) => {
    console.log(`[Store moveTreeItem REV] Moving item ${itemId} from parent ${oldParentId} (index ${oldIndex}) to parent ${newParentId} (index ${newIndex})`);

    if (!state.value.config || !state.value.configTree) {
        console.error("[Store moveTreeItem REV] Config or ConfigTree is not loaded.");
        return;
    }

    try {
      // 处理剪贴板操作
      if (oldParentId === 'clipboard') {
        console.log(`[Store moveTreeItem REV] Clipboard operation detected for item ${itemId}`);
        // 获取剪贴板中的项目
        const { item: clipboardItem, operation } = ClipboardManager.getItem();

        if (!clipboardItem || clipboardItem.id !== itemId) {
          console.error(`[Store moveTreeItem REV] Item ${itemId} not found in clipboard or ID mismatch.`);
          return;
        }

        try {
          if (operation === 'copy') {
            // 复制操作 - 创建新项目
            const newItemId = await pasteItemCopy(clipboardItem, newParentId);
            console.log(`[Store moveTreeItem REV] Successfully copied item. New ID: ${newItemId}`);
            return;
          } else if (operation === 'cut') {
            // 剪切操作 - 移动项目
            const movedItemId = await pasteItemCut(itemId, newParentId);
            console.log(`[Store moveTreeItem REV] Successfully cut and pasted item: ${movedItemId}`);
            return;
          }
        } catch (error: any) {
          console.error(`[Store moveTreeItem REV] Error during clipboard operation:`, error);
          state.value.error = `剪贴板操作失败: ${error.message || '未知错误'}`;
          return;
        }
      }

      // 查找要移动的项目
      const movedItemRef = findItemById(itemId);
      if (!movedItemRef) {
        console.error(`[Store moveTreeItem REV] Failed to find item ref with ID ${itemId} in config.`);
        return;
      }
      const originalFilePath = movedItemRef.filePath;

      // 定义根节点
      const rootNode = {
        type: 'root' as const,
        id: null,
        children: state.value.configTree
      };

      // 查找父节点
      let oldParentNode: { type: string } | null = null;
      let newParentNode: { type: string } | null = null;

      // 处理旧父节点
      if (oldParentId === null) {
        oldParentNode = rootNode;
        console.log('[Store moveTreeItem REV] Old parent is root node.');
      } else if (oldParentId.startsWith('file-')) {
        // 查找文件节点
        const filePath = oldParentId.substring(5); // 移除 'file-' 前缀
        const fileNode = findFileNode(state.value.configTree, filePath);
        if (fileNode) {
          oldParentNode = fileNode;
          console.log(`[Store moveTreeItem REV] Found old parent file node: ${fileNode.path}`);
        }
      } else {
        // 尝试在树中查找节点
        const treeNode = findNodeById(state.value.configTree, oldParentId, ['folder', 'file']);
        if (treeNode) {
          oldParentNode = treeNode;
          console.log(`[Store moveTreeItem REV] Found old parent tree node: ${treeNode.type} ${treeNode.id}`);
        }
      }

      // 处理新父节点
      if (newParentId === null) {
        newParentNode = rootNode;
        console.log('[Store moveTreeItem REV] New parent is root node.');
      } else if (newParentId.startsWith('file-')) {
        // 查找文件节点
        const filePath = newParentId.substring(5); // 移除 'file-' 前缀
        const fileNode = findFileNode(state.value.configTree, filePath);
        if (fileNode) {
          newParentNode = fileNode;
          console.log(`[Store moveTreeItem REV] Found new parent file node: ${fileNode.path}`);
        }
      } else {
        // 尝试在树中查找节点
        const treeNode = findNodeById(state.value.configTree, newParentId, ['folder', 'file']);
        if (treeNode) {
          newParentNode = treeNode;
          console.log(`[Store moveTreeItem REV] Found new parent tree node: ${treeNode.type} ${treeNode.id}`);
        }
      }

      // 确保找到了父节点
      if (!oldParentNode || !newParentNode) {
        console.error(`[Store moveTreeItem REV] Failed to find parent node(s). Old: ${oldParentId}, New: ${newParentId}`);
        return;
      }

      // 获取要移动项目的新文件路径
      let effectiveNewFilePath: string | undefined = undefined;
      if (newParentNode.type === 'file') {
        effectiveNewFilePath = (newParentNode as ConfigFileNode).path;
      } else {
        effectiveNewFilePath = originalFilePath;
      }

      // 确定要操作的数组
      let oldParentArray: any[] = [];
      let newParentArray: any[] = [];

      // 获取旧父节点的数组
      if (oldParentNode.type === 'root' || oldParentNode.type === 'folder') {
        oldParentArray = (oldParentNode as any).children || [];
      } else if (oldParentNode.type === 'file') {
        const fileNode = oldParentNode as ConfigFileNode;
        if (movedItemRef.type === 'match') {
          oldParentArray = fileNode.matches || [];
        } else {
          oldParentArray = fileNode.groups || [];
        }
      }

      // 获取新父节点的数组
      if (newParentNode.type === 'root' || newParentNode.type === 'folder') {
        newParentArray = (newParentNode as any).children || [];
      } else if (newParentNode.type === 'file') {
        const fileNode = newParentNode as ConfigFileNode;
        if (movedItemRef.type === 'match') {
          newParentArray = fileNode.matches || (fileNode.matches = []);
        } else {
          newParentArray = fileNode.groups || (fileNode.groups = []);
        }
      }

      console.log(`[Store moveTreeItem REV] Arrays determined. Old array(${oldParentNode.type}) length: ${oldParentArray.length}, New array(${newParentNode.type}) length: ${newParentArray.length}`);

      // Perform the splice operation
      // 特殊处理 oldIndex 为 -1 的情况（快捷键粘贴）
      if (oldIndex === -1) {
        console.log(`[Store moveTreeItem REV] Special case: oldIndex is -1, likely a clipboard operation.`);
        // 不需要从 oldParentArray 中移除项目，因为它可能来自剪贴板
      } else if (oldIndex >= 0 && oldIndex < oldParentArray.length) {
        const movedTreeNode = oldParentArray[oldIndex];
        if (!movedTreeNode || movedTreeNode.id !== itemId) {
          console.error(`[Store moveTreeItem REV] Item at oldIndex ${oldIndex} does not match moved item ID ${itemId}. Found:`, movedTreeNode);
          return;
        }

        console.log(`[Store moveTreeItem REV] Found item to move:`, { id: movedTreeNode.id, type: movedTreeNode.type });
        oldParentArray.splice(oldIndex, 1);

        // 调整新索引
        let adjustedNewIndex = newIndex;

        // 如果在同一数组内移动，并且是向后移动（oldIndex < newIndex）
        if (oldParentArray === newParentArray && oldIndex < newIndex) {
           // 由于我们已经从数组中移除了项目，所以后面的索引都会减1
           // 这里不需要再减1，因为数组长度已经变化
        }

        // 确保索引在安全范围内
        const safeNewIndex = Math.min(Math.max(0, adjustedNewIndex), newParentArray.length);
        console.log(`[Store moveTreeItem REV] Inserting at index ${safeNewIndex} of ${newParentArray.length}`);
        newParentArray.splice(safeNewIndex, 0, movedTreeNode);

        // Update GUI order (only makes sense if parent contains Match/Group items)
        // Consider if updateGuiOrderForChildren needs refinement based on parent type
        updateGuiOrderForChildren(newParentArray);
        if (oldParentArray !== newParentArray) {
          updateGuiOrderForChildren(oldParentArray);
        }

        // Update filePath reference if moved to a different FILE node
        console.log(`[Store moveTreeItem REV] Checking for cross-file move. Original: ${originalFilePath}, New: ${effectiveNewFilePath}`);
        const filesToSave = new Set<string>();
        if (newParentNode.type === 'file' && originalFilePath !== effectiveNewFilePath && effectiveNewFilePath) {
            console.log(`[Store moveTreeItem REV] Cross-file move detected: ${originalFilePath} -> ${effectiveNewFilePath}`);
            movedItemRef.filePath = effectiveNewFilePath;
            console.log(`[Store moveTreeItem REV] Updated filePath for item ${itemId} in flat list to ${effectiveNewFilePath}`);
            if (originalFilePath) filesToSave.add(originalFilePath);
            filesToSave.add(effectiveNewFilePath);
        } else if (originalFilePath) {
             // Moved within the same file, or to a folder/root (no file path change)
             console.log(`[Store moveTreeItem REV] Same-file move/reorder or folder/root move: ${originalFilePath}`);
             filesToSave.add(originalFilePath);
        }

        // Save all affected files
        console.log(`[Store moveTreeItem REV] Files to save:`, Array.from(filesToSave));
        for (const filePath of filesToSave) {
          try {
            // Find any item in the file to trigger a save
            // 使用已有的 findFileNode 根据文件路径找到对应的文件节点，然后获取一个匹配项或分组项作为保存触发器
            const fileNode = findFileNode(state.value.configTree, filePath);
            if (fileNode && (fileNode.matches?.length || fileNode.groups?.length)) {
              let itemToTriggerSave: Match | Group | undefined;
              if (fileNode.matches?.length) {
                itemToTriggerSave = fileNode.matches[0];
              } else if (fileNode.groups?.length) {
                itemToTriggerSave = fileNode.groups[0];
              }

              if (itemToTriggerSave) {
                console.log(`[Store moveTreeItem REV] Saving file ${filePath} using item ${itemToTriggerSave.id}`);
                await saveItemToFile(itemToTriggerSave);
              } else {
                console.warn(`[Store moveTreeItem REV] File node found but no items to save for ${filePath}`);
              }
            } else {
              console.warn(`[Store moveTreeItem REV] Could not find file node or items for ${filePath}`);
            }
          } catch (err) {
             console.error(`[Store moveTreeItem REV] Error saving file ${filePath}:`, err);
          }
        }

        console.log(`[Store moveTreeItem REV] Move operation completed successfully.`);
        state.value.hasUnsavedChanges = false; // Reset unsaved changes flag
      } else {
        console.error(`[Store moveTreeItem REV] Invalid oldIndex: ${oldIndex} for array length ${oldParentArray.length}`);
      }
    } catch (error: any) {
      console.error('[Store moveTreeItem REV] Error during move operation:', error);
    }
  };

  // Revised findNodeById to accept allowed types
  const findNodeById = (
      nodes: ConfigTreeNode[],
      id: string,
      allowedTypes: Array<'file' | 'folder' | 'match' | 'group'>
  ): ConfigTreeNode | Match | Group | null => {
      if (!nodes || !Array.isArray(nodes) || !id) return null;

      console.log(`[findNodeById] Searching for node with ID: "${id}", allowedTypes:`, allowedTypes);

      for (const node of nodes) {
          // 如果是文件节点，可能需要检查 ID 是否包含文件路径
          if (allowedTypes.includes(node.type)) {
              // 常规 ID 检查
              if (node.id === id) {
                  console.log(`[findNodeById] Direct match found: ${node.type} with ID ${node.id}`);
                  return node;
              }

              // 特殊处理文件 ID，尝试进行"file-"前缀+路径匹配
              if (node.type === 'file' && id.startsWith('file-') && node.path) {
                  const pathPart = id.substring(5); // Remove 'file-' prefix
                  if (node.path === pathPart) {
                      console.log(`[findNodeById] Path match found: ${node.type} with path ${node.path}`);
                      return node;
                  }
              }
          }

          // If the node is a file, search within its matches/groups
          if (node.type === 'file') {
              const fileNode = node as ConfigFileNode; // Explicit cast
              if (allowedTypes.includes('match') && fileNode.matches) {
                  const foundMatch = fileNode.matches.find(m => m.id === id);
                  if (foundMatch) {
                      console.log(`[findNodeById] Found match in file ${node.path}: ${foundMatch.id}`);
                      return foundMatch;
                  }
              }
              if (allowedTypes.includes('group') && fileNode.groups) {
                  for (const group of fileNode.groups) {
                      const foundInGroup = findItemByIdRecursive(group, id);
                      if (foundInGroup) {
                          console.log(`[findNodeById] Found group in file ${node.path}: ${foundInGroup.id}`);
                          return foundInGroup;
                      }
                  }
              }
          }
          // If the node is a folder, search recursively in its children
          else if (node.type === 'folder') {
              const folderNode = node as ConfigFolderNode; // Explicit cast
              if (folderNode.children) {
                  const foundInChild = findNodeById(folderNode.children, id, allowedTypes);
                  if (foundInChild) return foundInChild;
              }
          }
      }

      console.log(`[findNodeById] No node found with ID: ${id}`);
      return null;
  };

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
         const { id, type, filePath, updatedAt, content, contentType, guiOrder, ...rest } = match;
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
             } else if (key === 'force_mode') {
                 // 保留force_mode字段，无论它的值是什么
                 console.log("保存force_mode字段:", value);
                 // 只有当值为'default'或空字符串时才删除
                 if (value === 'default' || value === '') {
                     delete cleanedMatch[key];
                 }
             } else if (key === 'uppercase_style' && value === '') {
                  delete cleanedMatch[key];
             }
             // *** ADDED: Explicitly remove boolean flags when false (Espanso default) ***
             else if (typeof value === 'boolean' && value === false) {
                 // List of boolean keys that Espanso defaults to false
                 const espansoBooleanFalseDefaults = ['word', 'left_word', 'right_word', 'propagate_case'];
                 if (espansoBooleanFalseDefaults.includes(key)) {
                     delete cleanedMatch[key];
                 }
             }
          });
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

  // --- NEW Action: Move File/Folder Node in Tree (With Physical File Move) ---
  const moveTreeNode = async (nodeId: string, targetParentId: string | null, newIndex: number) => {
    console.log(`[Store moveTreeNode - Physical] Moving node ${nodeId} to parent ${targetParentId} at index ${newIndex}`);
    // ... (This function should already exist from previous steps, ensure it's the correct one)
    // ... rest of the implementation involving preloadApi.readFile/writeFile etc.
  };

  // --- NEW Action: Paste Item Copy ---
   const pasteItemCopy = async (itemDataToCopy: Match | Group, targetParentId: string | null) => {
    console.log(`[Store pasteItemCopy] ENTERED. Pasting copy of ${itemDataToCopy.type} ${itemDataToCopy.id} to parent ${targetParentId}`);
    if (!state.value.config || !state.value.configTree) {
        console.error("[Store pasteItemCopy] Config or ConfigTree not loaded.");
        return;
    }

    try {
      // 1. Deep clone the item data
      const newItemData = JSON.parse(JSON.stringify(itemDataToCopy));

      // 2. Generate a new unique ID
      newItemData.id = generateId(newItemData.type); // Ensure generateId is imported/available
      console.log(`[Store pasteItemCopy] Cloned data with new ID: ${newItemData.id}`);

      // 3. Determine target file path and parent node context
      let targetFilePath: string | undefined = undefined;
      let targetParentNode: ConfigTreeNode | Group | null = null; // Can be File, Folder, or Group

      if (targetParentId) {
        const foundNode = findNodeById(state.value.configTree, targetParentId, ['folder', 'file', 'group']);
        // Explicitly check if the found node is NOT a Match before assigning
        if (foundNode && foundNode.type !== 'match') {
          targetParentNode = foundNode as ConfigTreeNode | Group; // Type assertion after check
          // Determine filePath based on the valid parent
          if (targetParentNode.type === 'file') targetFilePath = targetParentNode.path;
          else if (targetParentNode.type === 'group') targetFilePath = targetParentNode.filePath; // Use group's file path
          // Folder case needs fallback path decision
          else if (targetParentNode.type === 'folder') {
             console.warn(`[Store pasteItemCopy] Pasting into a folder (${targetParentId}) is ambiguous. Using root default path.`);
             // targetFilePath will be assigned fallback below
          }
        } else if (foundNode && foundNode.type === 'match') {
           console.warn(`[Store pasteItemCopy] Target parent node ${targetParentId} is a Match, which is invalid. Using root default path.`);
           targetParentNode = null; // No valid parent node
        } else {
           console.warn(`[Store pasteItemCopy] Target parent node ${targetParentId} not found in tree. Using root default path.`);
           targetParentNode = null; // No valid parent node
        }
        // Assign fallback filePath if needed (not found, folder ambiguity, or invalid match parent)
        if (!targetFilePath) {
            targetFilePath = state.value.configPath || 'config/default.yml';
            console.warn(`[Store pasteItemCopy] Using fallback file path: ${targetFilePath}`);
        }
      } else { // Pasting to root
         targetFilePath = state.value.configPath || 'config/default.yml';
         targetParentNode = null;
      }

       if (!targetFilePath) { // Final check, though unlikely now
         throw new Error("无法确定用于粘贴副本的目标文件路径。");
       }

      newItemData.filePath = targetFilePath;
      newItemData.guiOrder = 9999; // Assign high order initially
      newItemData.updatedAt = new Date().toISOString(); // Set new timestamp

      console.log(`[Store pasteItemCopy] Determined targetFilePath: ${targetFilePath}`);
      console.log(`[Store pasteItemCopy] Determined targetParentNode type: ${targetParentNode?.type}, id: ${targetParentNode?.id}`);

      // 4. Add the new item to the store and tree
      //    Modify `addItem` or create a specific helper if needed to handle adding to nested groups
      console.log(`[Store pasteItemCopy] Calling addItem with new item ID ${newItemData.id} and parent group ID ${targetParentNode?.type === 'group' ? targetParentNode.id : null}`);
      await addItem(newItemData, targetParentNode?.type === 'group' ? targetParentNode.id : null ); // Pass parent group ID if applicable

      // 5. 选择新创建的项目
      state.value.selectedItemId = newItemData.id;
      state.value.selectedItemType = newItemData.type;

      console.log(`[Store pasteItemCopy] Successfully finished pasteItemCopy for new ID ${newItemData.id}`);
      // Assuming addItem handles saving the file
      // toast can be triggered here or after addItem completes if addItem returns status

      return newItemData.id; // 返回新创建的项目ID
    } catch (error: any) {
       console.error('[Store pasteItemCopy] Error during paste operation:', error);
       // Handle error (e.g., show toast)
       state.value.error = `粘贴副本失败: ${error.message}`;
       throw error; // 重新抛出错误，让调用者处理
    }
  };

  // --- NEW Action: Paste Item Cut ---
   const pasteItemCut = async (itemId: string, newParentId: string | null) => {
    console.log(`[Store pasteItemCut] ENTERED. Cutting item ${itemId} and pasting to parent ${newParentId}`);
    if (!state.value.config || !state.value.configTree) {
      console.error("[Store pasteItemCut] Config or ConfigTree not loaded.");
      return;
    }

    try {
      // 1. Find the item to move
      const movedItemRef = findItemById(itemId);
      if (!movedItemRef) {
        throw new Error(`要剪切的项目 ID ${itemId} 未找到。`);
      }
      const originalFilePath = movedItemRef.filePath;
      console.log(`[Store pasteItemCut] Found item ${itemId}, original path: ${originalFilePath}`);

      // 2. Find new parent node and determine new file path (similar to pasteItemCopy)
      let newParentNode: ConfigTreeNode | Group | null = null;
      let effectiveNewFilePath: string | undefined = undefined;
      const defaultPath = state.value.configPath || 'config/default.yml'; // Define default path

      if (newParentId) {
        const foundNode = findNodeById(state.value.configTree, newParentId, ['folder', 'file', 'group']);
        if (foundNode && foundNode.type !== 'match') {
          newParentNode = foundNode as ConfigTreeNode | Group;
          if (newParentNode.type === 'file') effectiveNewFilePath = newParentNode.path;
          else if (newParentNode.type === 'group') effectiveNewFilePath = newParentNode.filePath;
          else if (newParentNode.type === 'folder') {
              // Decide policy: Use root default path when pasting cut item into folder
              console.warn(`[Store pasteItemCut] Pasting cut item into a folder (${newParentId}) is ambiguous. Using root default path.`);
              effectiveNewFilePath = defaultPath;
          }
        } else {
           console.warn(`[Store pasteItemCut] New parent node ${newParentId} not found or invalid. Item will keep original path.`);
           // Keep original path if parent is invalid/not found?
           effectiveNewFilePath = originalFilePath;
        }
      } else { // Pasting to root
         newParentNode = null; // Representing root
         effectiveNewFilePath = defaultPath;
      }
      // Final fallback if still undefined (shouldn't happen with above logic)
      if (!effectiveNewFilePath) effectiveNewFilePath = originalFilePath || defaultPath;
      console.log(`[Store pasteItemCut] New parent node type: ${newParentNode?.type}, id: ${newParentNode?.id}, effective new path: ${effectiveNewFilePath}`);

      // --- 3. Remove item from original location ---
      let removedFromTree = false;
      let removedFromFlatList = false;

      // 3a. Remove from Tree Structure
      const removeFromTree = (nodes: ConfigTreeNode[], targetId: string): boolean => {
        for (let i = nodes.length - 1; i >= 0; i--) {
          const node = nodes[i];
          if (node.id === targetId) {
            nodes.splice(i, 1);
            return true; // Found and removed directly
          }
          if (node.type === 'file') {
            if (node.matches) {
              const matchIndex = node.matches.findIndex(m => m.id === targetId);
              if (matchIndex !== -1) {
                node.matches.splice(matchIndex, 1);
                return true;
              }
            }
            if (node.groups) {
              const groupIndex = node.groups.findIndex(g => g.id === targetId);
              if (groupIndex !== -1) {
                node.groups.splice(groupIndex, 1);
                return true;
              }
              // Recursively search within groups in the file
              for (const group of node.groups) {
                  if (removeFromNestedGroup(group, targetId)) return true;
              }
            }
          } else if (node.type === 'folder' && node.children) {
            if (removeFromTree(node.children, targetId)) return true;
          }
        }
        return false;
      };
       const removeFromNestedGroup = (group: Group, targetId: string): boolean => {
           if (group.matches) {
               const matchIndex = group.matches.findIndex(m => m.id === targetId);
               if (matchIndex !== -1) {
                   group.matches.splice(matchIndex, 1);
                   return true;
               }
           }
           if (group.groups) {
               const groupIndex = group.groups.findIndex(g => g.id === targetId);
               if (groupIndex !== -1) {
                   group.groups.splice(groupIndex, 1);
                   return true;
               }
               for (const subGroup of group.groups) {
                   if (removeFromNestedGroup(subGroup, targetId)) return true;
               }
           }
           return false;
       };
      removedFromTree = removeFromTree(state.value.configTree, itemId);
      console.log(`[Store pasteItemCut] Removed item ${itemId} from tree: ${removedFromTree}`);

      // 3b. Remove from Flat List Structure
      const removeFromFlatListRecursive = (items: (Match | Group)[], targetId: string): boolean => {
          for (let i = items.length - 1; i >= 0; i--) {
              const item = items[i];
              if (item.id === targetId) {
                  items.splice(i, 1);
                  return true;
              }
              if (item.type === 'group' && item.groups) {
                  if (removeFromFlatListRecursive(item.groups, targetId)) return true;
              }
              // Also check matches within groups in the flat list
              if (item.type === 'group' && item.matches) {
                  const matchIndex = item.matches.findIndex(m => m.id === targetId);
                  if (matchIndex !== -1) {
                      item.matches.splice(matchIndex, 1);
                      return true;
                  }
              }
          }
          return false;
      };
      if (state.value.config) {
        if (movedItemRef.type === 'match') {
            // Search in top-level matches and nested matches
            removedFromFlatList = removeFromFlatListRecursive(state.value.config.matches, itemId) ||
                                  removeFromFlatListRecursive(state.value.config.groups, itemId); // Search within groups too
        } else { // type === 'group'
            removedFromFlatList = removeFromFlatListRecursive(state.value.config.groups, itemId);
        }
      }
      console.log(`[Store pasteItemCut] Removed item ${itemId} from flat list: ${removedFromFlatList}`);

      if (!removedFromTree && !removedFromFlatList) {
         console.warn(`[Store pasteItemCut] Item ${itemId} could not be removed from its original location.`);
         // Optionally throw an error or proceed cautiously
      }

      // --- 4. Update item's file path ---
      movedItemRef.filePath = effectiveNewFilePath; // Use the determined effective path
      movedItemRef.updatedAt = new Date().toISOString();
      console.log(`[Store pasteItemCut] Updated item ${itemId} filePath to ${effectiveNewFilePath}`);

      // --- 5. Add item to new location ---
      let addedToTree = false;
      let addedToFlatList = false;
      // Use a specific variable to track if the target is a group, separate from newParentId which could be file/folder ID
      const targetParentGroupId = newParentNode?.type === 'group' ? newParentNode.id : null;

      // 5a. Add to Tree structure
      // Find the target file node using the *new* path
      const targetFileNodeForAdd = findFileNode(state.value.configTree, effectiveNewFilePath);
      if (targetFileNodeForAdd) {
          let targetArrayInTree: Match[] | Group[] | undefined;
          let parentGroupInTree: Group | null = null;
          // Check if we are adding to a group using targetParentGroupId
          if (targetParentGroupId) {
              // Find the group within the target file node
              parentGroupInTree = targetFileNodeForAdd.groups?.find(g => g.id === targetParentGroupId) ?? null;
              if (parentGroupInTree) {
                  if (movedItemRef.type === 'match') {
                      if (!parentGroupInTree.matches) parentGroupInTree.matches = [];
                      targetArrayInTree = parentGroupInTree.matches;
                  } else {
                      if (!parentGroupInTree.groups) parentGroupInTree.groups = [];
                      targetArrayInTree = parentGroupInTree.groups;
                  }
                  console.log(`[Store pasteItemCut] Tree Target: Group ${targetParentGroupId} in file ${effectiveNewFilePath}`);
              } else {
                   console.warn(`[Store pasteItemCut] Target parent group ${targetParentGroupId} not found in target file ${effectiveNewFilePath}. Adding to file root.`);
                   // Fallback: Add to file root if target group not found in target file
                   if (movedItemRef.type === 'match') {
                      if (!targetFileNodeForAdd.matches) targetFileNodeForAdd.matches = [];
                      targetArrayInTree = targetFileNodeForAdd.matches;
                  } else {
                      if (!targetFileNodeForAdd.groups) targetFileNodeForAdd.groups = [];
                      targetArrayInTree = targetFileNodeForAdd.groups;
                  }
                  console.log(`[Store pasteItemCut] Tree Target (Fallback): File ${effectiveNewFilePath}`);
              }
          } else { // Add to file root
              if (movedItemRef.type === 'match') {
                  if (!targetFileNodeForAdd.matches) targetFileNodeForAdd.matches = [];
                  targetArrayInTree = targetFileNodeForAdd.matches;
              } else {
                  if (!targetFileNodeForAdd.groups) targetFileNodeForAdd.groups = [];
                  targetArrayInTree = targetFileNodeForAdd.groups;
              }
              console.log(`[Store pasteItemCut] Tree Target: File ${effectiveNewFilePath}`);
          }

          if (targetArrayInTree) {
             // Ensure item is not already there before pushing
             if (!targetArrayInTree.some(i => i.id === movedItemRef.id)) {
                targetArrayInTree.push(movedItemRef as any); // Add the actual moved item
                addedToTree = true;
                console.log(`[Store pasteItemCut] Added item ${itemId} to tree.`);
             } else {
                 console.warn(`[Store pasteItemCut] Item ${itemId} already exists in target tree array.`);
             }
          } else { console.error(`[Store pasteItemCut] Could not determine target array in tree for adding.`); }
      } else { console.error(`[Store pasteItemCut] Could not find target file node ${effectiveNewFilePath} for adding.`); }

      // 5b. Add to Flat List structure
      // Use the same targetParentGroupId determined above
      if (targetParentGroupId) {
          if (findAndAddInFlatList(state.value.config.groups, targetParentGroupId, movedItemRef)) {
              addedToFlatList = true;
              console.log(`[Store pasteItemCut] Added item ${itemId} to parent group ${targetParentGroupId} in flat list.`);
          } else { console.warn(`[Store pasteItemCut] Failed to add item ${itemId} to parent group ${targetParentGroupId} in flat list.`); }
      } else { // Add to top level
          if (movedItemRef.type === 'match') {
              if (!state.value.config.matches.some(m => m.id === itemId)) {
                 state.value.config.matches.push(movedItemRef);
                 addedToFlatList = true;
                 console.log(`[Store pasteItemCut] Added item ${itemId} to top-level matches flat list.`);
              }
          } else { // type === 'group'
              if (!state.value.config.groups.some(g => g.id === itemId)) {
                 state.value.config.groups.push(movedItemRef);
                 addedToFlatList = true;
                 console.log(`[Store pasteItemCut] Added item ${itemId} to top-level groups flat list.`);
              }
          }
      }
      if (!addedToTree && !addedToFlatList) {
          console.error(`[Store pasteItemCut] Failed to add item ${itemId} to the new location.`);
          // Optionally revert changes or throw error
      }

      // --- 6. Save Files ---
      console.log(`[Store pasteItemCut] Saving files... Original: ${originalFilePath}, New: ${effectiveNewFilePath}`);
      const filesToSave = new Set<string>();
      if (originalFilePath) filesToSave.add(originalFilePath); // 保存原始文件
      if (effectiveNewFilePath) filesToSave.add(effectiveNewFilePath); // 保存新文件

      for (const filePath of filesToSave) {
         try {
            // Find any item remaining/added in the file to trigger save
            const triggerItem = findAnyItemForFile(filePath); // Reuse helper from deleteItem
            if (triggerItem) {
               console.log(`[Store pasteItemCut] Saving file ${filePath} using trigger item ${triggerItem.id}`);
               await saveItemToFile(triggerItem);
            } else {
                console.log(`[Store pasteItemCut] No items left for file ${filePath}. Writing empty/cleaned file.`);
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
                 console.log(`[Store pasteItemCut] Wrote empty/cleaned file: ${filePath}`);
            }
         } catch (saveError) {
             console.error(`[Store pasteItemCut] Error saving file ${filePath}:`, saveError);
             // Continue trying to save other files if needed
         }
      }

      // 7. 选择移动后的项目
      state.value.selectedItemId = itemId;
      state.value.selectedItemType = movedItemRef.type;

      state.value.hasUnsavedChanges = false;
      state.value.autoSaveStatus = 'idle';
      console.log(`[Store pasteItemCut] Finished cut-paste for item ${itemId}.`);

      return itemId; // 返回移动的项目ID
    } catch (error: any) {
      console.error('[Store pasteItemCut] Error during cut-paste operation:', error);
      state.value.error = `剪切粘贴失败: ${error.message}`;
      throw error; // 重新抛出错误，让调用者处理
    }
  };

  return {
    state,
    allItems,
    allMatches,
    allGroups,
    selectedItem,
    findItemById: findItemById,
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
    moveTreeItem,
    moveTreeNode,
    pasteItemCopy,
    pasteItemCut // Export the new action
  };
});
