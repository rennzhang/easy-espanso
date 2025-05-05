import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner'; // Assuming toast notifications are still used
import { v4 as uuidv4 } from 'uuid';

// Import Core Types
import type { ConfigTreeNode, ConfigFileNode, ConfigFolderNode } from '@/types/core/ui.types'; // Renamed/Moved
import type { GlobalConfig } from '@/types/core/espanso-format.types'; // Use canonical format type
import type { Match, Group } from '@/types/core/espanso.types'; // Use canonical internal type

// Import Services (Assuming they are refactored)
import * as espansoService from '@/services/espansoService';
import * as platformService from '@/services/platformService'; // Renamed from fileService
import * as configService from '@/services/configService';

// Import Utils (Assuming they are refactored)
import { generateId } from '@/utils/espansoDataUtils';
import {
    findFileNode,
    findNodeById as findTreeNodeById, // Disambiguate tree node search
    findItemInTreeById, // Function to find Match/Group within the tree by ID
    findParentNodeInTree, // Function to find the parent node (File/Group/Folder) of an item
    removeItemFromTree, // Function to remove an item/node reference from the tree
    addItemToTree, // Function to add an item/node reference to the tree
    extractMatchesFromTree, // New util function
    extractGroupsFromTree, // New util function
} from '@/utils/configTreeUtils';
import ClipboardManager from '@/utils/ClipboardManager';


// Define the new, leaner state interface
export interface EspansoState {
    hasUnsavedChanges: boolean;
    configRootDir: string | null;
    globalConfig: GlobalConfig | null;
    globalConfigPath: string | null;
    configTree: ConfigTreeNode[]; // Single source of truth
    selectedItemId: string | null;
    selectedItemType: 'match' | 'group' | 'file' | 'folder' | null;
    searchQuery: string;
    selectedTags: string[];
    leftMenuCollapsed: boolean;
    loading: boolean;
    error: string | null;
    statusMessage: string | null; // For non-error feedback like "Saving..."
    // Optional: State for expanded nodes if TreeNodeRegistry is removed
    // expandedNodeIds: Set<string>;
}

export const useEspansoStore = defineStore('espanso', () => {
    // --- State ---
  const state = ref<EspansoState>({
        hasUnsavedChanges: false,
        configRootDir: null,
        globalConfig: null,
        globalConfigPath: null,
        configTree: [],
        selectedItemId: null,
        selectedItemType: null,
        searchQuery: '',
        selectedTags: [],
        leftMenuCollapsed: false,
        loading: false,
        error: null,
        statusMessage: null,
        // expandedNodeIds: new Set(),
    });

    // --- Getters (Computed Properties) ---

    const allMatches = computed((): Match[] => {
        return extractMatchesFromTree(state.value.configTree);
    });

    const allGroups = computed((): Group[] => {
        // This needs refinement: Should it return only top-level groups within files,
        // or all groups recursively? Let's assume recursive for now.
        return extractGroupsFromTree(state.value.configTree);
    });

    const allItems = computed((): (Match | Group)[] => [...allMatches.value, ...allGroups.value]);

    const selectedItem = computed((): Match | Group | ConfigTreeNode | null => {
        if (!state.value.selectedItemId) return null;
        // Need a robust way to find the item (Match/Group) or node (File/Folder) by ID within the tree
        return findItemInTreeById(state.value.configTree, state.value.selectedItemId);
    });

    const selectedFileNode = computed((): ConfigFileNode | null => {
        const item = selectedItem.value;
        if (!item) return null;
        if (item.type === 'file') return item as ConfigFileNode;
        if (item.type === 'match' || item.type === 'group') {
             const filePath = item.filePath;
             if (!filePath) return null;
             return findFileNode(state.value.configTree, filePath);
        }
        return null; // Folder selected, no single file node
    });


    // --- Internal Helper ---
    // Centralized error/status handling
    const _setLoading = (isLoading: boolean, message: string | null = null) => {
        state.value.loading = isLoading;
        state.value.statusMessage = isLoading ? message : null;
        if (isLoading) state.value.error = null; // Clear previous errors when starting load
    };

    const _setError = (errorMessage: string | null) => {
        state.value.error = errorMessage;
        state.value.loading = false;
        state.value.statusMessage = null;
        if (errorMessage) {
            toast.error(errorMessage); // Show toast on error
        }
    };

    const _setStatus = (message: string | null) => {
        state.value.statusMessage = message;
        state.value.error = null; // Clear error when setting status
         if (message && !state.value.loading) {
            // Optionally show non-loading status messages via toast
            // toast.info(message);
        }
    };

    // Helper to save a file based on its path, finding its items in the tree
    const _saveFileByPath = async (filePath: string) => {
        const fileNode = findFileNode(state.value.configTree, filePath);
        if (!fileNode) {
            throw new Error(`File node not found: ${filePath}`);
        }
        
        _setStatus(`正在保存 ${fileNode.name}...`);
        
        try {
            // 提取所有直接与此文件节点关联的匹配项和分组
            const itemsToSave = [
                ...(fileNode.matches || []),
                ...(fileNode.groups || [])
            ];
            
            // 使用正确的API
            await espansoService.saveConfigurationFile(filePath, itemsToSave, fileNode.content || {});
            
            state.value.hasUnsavedChanges = false;
            _setStatus(`${fileNode.name} 已保存`);
            // 短暂延迟后清除状态
            setTimeout(() => { 
                if (state.value.statusMessage === `${fileNode.name} 已保存`) 
                    _setStatus(null); 
            }, 2000);
        } catch (err: any) {
            console.error(`[EspansoStore] 保存文件失败: ${filePath}`, err);
            _setError(`保存失败: ${err.message}`);
            throw err; // 重新抛出以允许调用者处理
        }
    };


    // --- Actions ---

    const initializeStore = async () => {
        _setLoading(true, 'Initializing...');
        try {
            const savedPath = await configService.getSelectedConfigPath();
            await loadConfig(savedPath || undefined); // Load saved path or try default
             _setStatus(null); // Clear initializing message
        } catch (err: any) {
            // loadConfig handles its own errors, but catch potential issues in getting saved path
            _setError(`Initialization failed: ${err.message}`);
        } finally {
             _setLoading(false);
        }
    };

    const loadConfig = async (path?: string) => {
        _setLoading(true, '加载配置中...');
        let rootDir = path;

        try {
            if (!rootDir) {
                console.log(`[EspansoStore] 未提供路径，尝试从localStorage获取`);
                rootDir = await configService.getSelectedConfigPath();
            }
            if (!rootDir) {
                console.log(`[EspansoStore] localStorage中未找到路径，尝试获取默认路径`);
                _setStatus('未选择路径，尝试获取默认Espanso路径...');
                rootDir = await configService.getDefaultConfigPath();
            }
            if (!rootDir) {
                throw new Error('无法确定Espanso配置目录位置。');
            }

            console.log(`[EspansoStore] 使用配置目录: ${rootDir}`);

            // 验证目录是否存在
            console.log(`[EspansoStore] 检查配置目录是否存在: ${rootDir}`);
            let dirExists = false;
            try {
                dirExists = await platformService.directoryExists(rootDir);
                console.log(`[EspansoStore] 配置目录存在检查结果: ${dirExists}`);
            } catch (err) {
                console.error(`[EspansoStore] 检查目录存在性时出错:`, err);
                // 继续处理，尝试创建目录
            }

            if (!dirExists) {
                console.log(`[EspansoStore] 配置目录不存在，尝试创建: ${rootDir}`);
                _setStatus('配置目录不存在，尝试创建...');
                try {
                    await platformService.createDirectory(rootDir);
                    
                    // 创建必要的子目录结构
                    const configDir = await platformService.joinPath(rootDir, 'config');
                    const matchDir = await platformService.joinPath(rootDir, 'match');
                    
                    // 确保config目录存在
                    if (!(await platformService.directoryExists(configDir))) {
                        await platformService.createDirectory(configDir);
                        console.log(`[EspansoStore] 创建config目录成功: ${configDir}`);
                    }
                    
                    // 确保match目录存在
                    if (!(await platformService.directoryExists(matchDir))) {
                        await platformService.createDirectory(matchDir);
                        console.log(`[EspansoStore] 创建match目录成功: ${matchDir}`);
                    }
                    
                    // 这里不再自动创建base.yml，而是让espansoService根据需要处理
                    // 这样避免重复创建配置文件
                } catch (err: any) {
                    console.error(`[EspansoStore] 创建配置目录失败:`, err);
                    _setError(`无法创建配置目录 ${rootDir}: ${err.message}`);
                    throw err; // 向上传递创建错误
                }
            }

            // 保存选择的路径
            console.log(`[EspansoStore] 保存路径至localStorage: ${rootDir}`);
            configService.saveSelectedConfigPath(rootDir);

            // 加载配置
            console.log(`[EspansoStore] 开始加载配置: ${rootDir}`);
            _setStatus('正在加载配置...');
            const { configTree, globalConfig, globalConfigPath } = await espansoService.loadConfiguration(rootDir);

            state.value.configRootDir = rootDir;
            state.value.globalConfig = globalConfig;
            state.value.globalConfigPath = globalConfigPath;
            state.value.configTree = configTree;
            state.value.hasUnsavedChanges = false; // 初始加载后重置状态

            console.log(`[EspansoStore] 配置加载完成，文件树节点数: ${configTree.length}`);
            _setStatus('配置加载完成');
        } catch (err: any) {
            console.error(`[EspansoStore] 配置加载失败:`, err);
            _setError(`配置加载失败: ${err.message}`);
        } finally {
            _setLoading(false);
        }
    };

    const selectItem = (itemId: string | null, itemType: EspansoState['selectedItemType']) => {
        state.value.selectedItemId = itemId;
        state.value.selectedItemType = itemType;
        _setError(null); // Clear errors on selection change
    };

    const setSearchQuery = (query: string) => {
        state.value.searchQuery = query;
    };
    const setSelectedTags = (tags: string[]) => {
        state.value.selectedTags = tags;
    };
    const toggleLeftMenu = () => {
        state.value.leftMenuCollapsed = !state.value.leftMenuCollapsed;
    };

    const updateGlobalConfig = async (newData: Partial<GlobalConfig>) => {
        if (!state.value.globalConfig || !state.value.globalConfigPath) {
            _setError("Global config not loaded, cannot update.");
            return;
        }
        _setStatus('Saving global settings...');
        try {
            // Merge updates into the existing state
            state.value.globalConfig = { ...state.value.globalConfig, ...newData };
            // Use toRaw if encountering reactivity issues during serialization
            // const rawConfig = toRaw(state.value.globalConfig);
            await espansoService.saveGlobalConfig(state.value.globalConfigPath, state.value.globalConfig);
            _setStatus('Global settings saved.');
            setTimeout(() => { if (state.value.statusMessage === 'Global settings saved.') _setStatus(null); }, 2000);
        } catch (err: any) {
            console.error('Failed to save global config:', err);
            _setError(`Save failed: ${err.message}`);
        }
    };

    const updateMatch = async (matchId: string, updates: Partial<Match>) => {
        const result = findItemInTreeById(state.value.configTree, matchId);
        if (!result || result.type !== 'match') {
            _setError(`Match with ID ${matchId} not found.`);
            return;
        }
        const matchRef = result as Match; // Reference in the tree
        const filePath = matchRef.filePath;
        if (!filePath) {
             _setError(`Match ${matchId} is missing file path.`);
             return;
        }

        // Apply updates directly to the reactive reference in the tree
        Object.assign(matchRef, updates);
        matchRef.updatedAt = new Date().toISOString(); // Update timestamp

        try {
            await _saveFileByPath(filePath); // Save the containing file
        } catch {
            // _saveFileByPath already sets the error
        }
    };

    const updateGroup = async (groupId: string, updates: Partial<Group>) => {
       const result = findItemInTreeById(state.value.configTree, groupId);
        if (!result || result.type !== 'group') {
            _setError(`Group with ID ${groupId} not found.`);
            return;
        }
        const groupRef = result as Group; // Reference in the tree
        const filePath = groupRef.filePath;
         if (!filePath) {
             _setError(`Group ${groupId} is missing file path.`);
             return;
         }

        // Apply updates directly to the reactive reference
        Object.assign(groupRef, updates); // Note: This won't update nested items unless 'updates' includes them
        groupRef.updatedAt = new Date().toISOString();

         try {
            await _saveFileByPath(filePath); // Save the containing file
        } catch {
             // Error handled by helper
        }
    };

    const addItem = async (itemData: Omit<Match, 'id'|'type'> | Omit<Group, 'id'|'type'>, itemType: 'match' | 'group', targetParentNodeId: string | null, insertIndex: number = -1) => {
        _setStatus(`Adding ${itemType}...`);
        try {
            // Create a new item with UUID
            const newItem: Match | Group = {
                ...itemData,
                id: uuidv4(),
                type: itemType,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };

            // Determine the file path for this item
            let filePath: string | null = null;
            
            if (targetParentNodeId) {
                // Find the target parent node 
                const targetNode = findItemInTreeById(state.value.configTree, targetParentNodeId);
                if (targetNode) {
                    if ('path' in targetNode && targetNode.type === 'file') {
                        filePath = targetNode.path;
                    } else if ('filePath' in targetNode && targetNode.filePath) {
                        filePath = targetNode.filePath;
                    }
                }
            }
            
            if (!filePath) {
                // Fall back to a default config file (e.g. base.yml in config dir)
                // (Logic would depend on the specific context - e.g. current location in UI)
                console.warn("[Store addItem] No valid parent found, falling back to default file");
                // ...logic to determine default file...
            }
            
            if (!filePath) {
                throw new Error("Cannot determine which file to add the item to.");
            }
            
            // Set the filePath for the new item
            newItem.filePath = filePath;

            // This util needs to find the parent (File/Group) and add the newItem ref
            // It should also determine and set newItem.filePath based on the parent
            const addedItemRef = addItemToTree(state.value.configTree, newItem, targetParentNodeId, insertIndex);

            if (!addedItemRef) {
                throw new Error(`Failed to add ${itemType} to the tree structure.`);
            }

            // 修复第358行和363行错误
            if ('filePath' in addedItemRef) {
                if (!addedItemRef.filePath) {
                    throw new Error(`Added ${itemType} missing file path reference.`);
                }
            
                // Save the file that contains the new item
                await _saveFileByPath(addedItemRef.filePath);
                
                // Select the newly added item
                selectItem(addedItemRef.id, itemType);
                
                return addedItemRef;
            } else {
                throw new Error(`Unexpected item type returned from addItemToTree.`);
            }
        } catch (err: any) {
            console.error(`Failed to add ${itemType}:`, err);
            _setError(`Failed to add ${itemType}: ${err.message}`);
            return null;
        } finally {
            _setStatus(null);
        }
    };


    const deleteItem = async (itemId: string, itemType: 'match' | 'group') => {
         const itemRef = findItemInTreeById(state.value.configTree, itemId);
         if (!itemRef || itemRef.type !== itemType) {
             _setError(`${itemType === 'match' ? 'Match' : 'Group'} ${itemId} not found.`);
             return;
         }
         const filePath = itemRef.filePath;
         const itemName = itemRef.type === 'group' ? itemRef.name : (itemRef.label || itemRef.trigger);

         if (!filePath) {
             _setError(`Cannot delete ${itemType} ${itemId}: missing file path.`);
             return;
         }

         _setStatus(`Deleting ${itemName}...`);

         try {
             // Remove item reference from the tree
             const removed = removeItemFromTree(state.value.configTree, itemId);
             if (!removed) {
                 throw new Error(`Failed to remove ${itemType} reference from the tree.`);
             }

             // Save the modified file
             await _saveFileByPath(filePath);

             // Clear selection if the deleted item was selected
             if (state.value.selectedItemId === itemId) {
                 selectItem(null, null);
             }
              _setStatus(`${itemType === 'match' ? 'Match' : 'Group'} deleted.`);
              setTimeout(() => { if (state.value.statusMessage === `${itemType === 'match' ? 'Match' : 'Group'} deleted.`) _setStatus(null); }, 2000);
         } catch (err: any) {
             console.error(`Failed to delete ${itemType} ${itemId}:`, err);
             _setError(`Delete failed: ${err.message}`);
             // Consider reloading config if deletion failed mid-way?
         }
    };

    const moveItem = async (itemId: string, targetParentNodeId: string | null, newIndex: number) => {
        const movedItemRef = findItemInTreeById(state.value.configTree, itemId);
        if (!movedItemRef || (movedItemRef.type !== 'match' && movedItemRef.type !== 'group')) {
            _setError(`Item ${itemId} not found or is not a Match/Group.`);
            return;
        }
        const originalFilePath = movedItemRef.filePath;
        if (!originalFilePath) {
             _setError(`Item ${itemId} cannot be moved: missing original file path.`);
             return;
        }
        _setStatus(`Moving ${movedItemRef.type}...`);

        try {
            // 1. Find Target Parent Node and File Path
             let newFilePath: string | undefined = undefined;
             const targetParentNode = targetParentNodeId
                ? findItemInTreeById(state.value.configTree, targetParentNodeId) // Can be File or Group
                : null; // Moving to root (which means top-level within a file)

            if (targetParentNode) {
                 if (targetParentNode.type === 'file') newFilePath = targetParentNode.path;
                 else if (targetParentNode.type === 'group') newFilePath = targetParentNode.filePath;
                 else { // Target is folder or something else? Invalid drop target for Match/Group
                     throw new Error(`Invalid target parent type: ${targetParentNode.type}`);
                 }
            } else {
                 // If targetParentId is null, where does it go? Assume root of *some* file.
                 // This logic needs clarification. Let's assume it stays in the original file for now if targetParentId is null.
                 newFilePath = originalFilePath;
                 console.warn(`[Store moveItem] targetParentNodeId is null, assuming move within file: ${originalFilePath}`);
             }

             if (!newFilePath) {
                throw new Error(`Could not determine target file path for move operation.`);
             }

            // 2. Remove from old location in tree
            if (!removeItemFromTree(state.value.configTree, itemId)) {
                throw new Error(`Failed to remove item ${itemId} from its original location in the tree.`);
            }

            // 3. Update filePath if changed
            const movedBetweenFiles = originalFilePath !== newFilePath;
            if (movedBetweenFiles) {
                movedItemRef.filePath = newFilePath;
            }
            movedItemRef.updatedAt = new Date().toISOString();

            // 4. Add to new location in tree
             // This util needs to handle adding the *reference* back into the tree structure
            if (!addItemToTree(state.value.configTree, movedItemRef, targetParentNodeId, newIndex)) {
                 // Attempt to rollback? This is tricky. Reload might be safer.
                 throw new Error(`Failed to add item ${itemId} to its new location in the tree.`);
            }

            // 5. Save affected files
            if (movedBetweenFiles) {
                 await _saveFileByPath(originalFilePath); // Save old file (now without the item)
                 await _saveFileByPath(newFilePath);    // Save new file (now with the item)
            } else {
                await _saveFileByPath(originalFilePath); // Save the modified file
            }

            // 6. Update selection (optional, could keep it selected)
            selectItem(itemId, movedItemRef.type);
             _setStatus('Item moved.');
             setTimeout(() => { if (state.value.statusMessage === 'Item moved.') _setStatus(null); }, 2000);

        } catch (err: any) {
             console.error(`Failed to move item ${itemId}:`, err);
             _setError(`Move failed: ${err.message}. Configuration may be inconsistent. Consider reloading.`);
            // Force reload on error?
             // await loadConfig(state.value.configRootDir || undefined);
        }
    };

    const pasteItem = async (targetParentNodeId: string | null, insertIndex: number = -1) => {
        const { item: clipboardItem, operation } = ClipboardManager.getItem();
        if (!clipboardItem) {
            toast.error('剪贴板为空。');
            return;
        }
        _setStatus(`正在粘贴项目...`);
        
        try {
            // 如果目标父节点ID为null，尝试找到默认文件节点作为粘贴目标
            let effectiveTargetNodeId = targetParentNodeId;
            
            if (targetParentNodeId === null) {
                console.log(`[pasteItem] targetParentNodeId 为 null，尝试查找默认文件节点作为粘贴目标`);
                
                // 遍历配置树，寻找第一个文件节点或优先选择 base.yml
                const findDefaultFileNodeId = (nodes: ConfigTreeNode[]): string | null => {
                    for (const node of nodes) {
                        if (node.type === 'file') {
                            // 优先选择 base.yml
                            if (node.name === 'base.yml') {
                                return node.id;
                            }
                            
                            // 备选：第一个找到的文件节点
                            return node.id;
                        } else if (node.type === 'folder' && node.children && node.children.length > 0) {
                            // 递归检查子文件夹
                            const fileNodeId = findDefaultFileNodeId(node.children);
                            if (fileNodeId) {
                                return fileNodeId;
                            }
                        }
                    }
                    return null;
                };
                
                effectiveTargetNodeId = findDefaultFileNodeId(state.value.configTree);
                console.log(`[pasteItem] 找到默认文件节点作为粘贴目标: ${effectiveTargetNodeId}`);
            }
            
            if (!effectiveTargetNodeId) {
                throw new Error("无法确定粘贴位置，请选择一个具体的文件或分组。");
            }
            
            if (operation === 'copy') {
                // 创建深拷贝，移除ID和filePath
                const itemData = JSON.parse(JSON.stringify(clipboardItem));
                delete itemData.id;
                delete itemData.filePath;
                
                await addItem(itemData, clipboardItem.type, effectiveTargetNodeId, insertIndex);
                
            } else if (operation === 'cut') {
                await moveItem(clipboardItem.id, effectiveTargetNodeId, insertIndex);
                ClipboardManager.clear(); // 剪切后清空剪贴板
            }
        } catch (err: any) {
            _setError(`粘贴操作失败: ${err.message}`);
        }
        _setStatus(null);
    };

     // --- File/Folder Operations (Placeholder Examples - require more service/util implementation) ---

     const createConfigFile = async (targetFolderNodeId: string | null, fileName: string) => {
        _setStatus(`Creating file ${fileName}...`);
        let folderPath: string | null = null;

        if (targetFolderNodeId) {
            const folderNode = findTreeNodeById(state.value.configTree, targetFolderNodeId);
            if (!folderNode || folderNode.type !== 'folder') {
                 _setError('Invalid target folder specified.');
                 return;
            }
            folderPath = folderNode.path;
        } else {
            // Create in root config dir? Needs policy.
            folderPath = state.value.configRootDir ? `${state.value.configRootDir}/match` : null; // Default to match dir?
             if (!folderPath) {
                 _setError('Cannot determine target directory.');
                 return;
             }
        }

         try {
            const newFilePath = await espansoService.createAndSaveEmptyConfigFile(folderPath, fileName);
            // Easiest way to update UI is reload
            await loadConfig(state.value.configRootDir || undefined);
             _setStatus(`File ${fileName} created.`);
             // Optionally select the new file/default item
         } catch (err: any) {
             _setError(`Failed to create file: ${err.message}`);
         }
     };

     const deleteFileNode = async (fileNodeId: string) => {
         const fileNode = findTreeNodeById(state.value.configTree, fileNodeId);
         if (!fileNode || fileNode.type !== 'file') {
             _setError('File node not found.');
             return;
         }
         const filePath = fileNode.path;
         const fileName = fileNode.name;
          _setStatus(`Deleting file ${fileName}...`);

         try {
              // 1. Remove from tree state FIRST
              if (!removeItemFromTree(state.value.configTree, fileNodeId)) {
                  throw new Error('Failed to remove file node from tree state.');
              }
              // 2. Delete actual file
              await platformService.deleteFile(filePath); // Assumes this function exists

              // Clear selection if needed
              if (state.value.selectedItemId === fileNodeId) {
                  selectItem(null, null);
              }
              _setStatus(`File ${fileName} deleted.`);
              setTimeout(() => { if (state.value.statusMessage === `File ${fileName} deleted.`) _setStatus(null); }, 2000);
         } catch (err: any) {
             _setError(`Failed to delete file ${fileName}: ${err.message}. Reloading might be needed.`);
             // Consider reloading config on error
         }
     };

     const deleteFolderNode = async (folderNodeId: string) => {
        const folderNode = findTreeNodeById(state.value.configTree, folderNodeId);
         if (!folderNode || folderNode.type !== 'folder') {
             _setError('Folder node not found.');
             return;
         }
         const folderPath = folderNode.path;
         const folderName = folderNode.name;
          _setStatus(`Deleting folder ${folderName}...`);

         try {
              // 1. Remove from tree state FIRST (including descendants)
              if (!removeItemFromTree(state.value.configTree, folderNodeId)) { // Util needs to handle recursion
                  throw new Error('Failed to remove folder node from tree state.');
              }
              // 2. Delete actual directory
              await platformService.deleteDirectory(folderPath); // Assumes this function exists

              // Clear selection if needed
              if (state.value.selectedItemId === folderNodeId) {
                  selectItem(null, null);
              }
               _setStatus(`Folder ${folderName} deleted.`);
               setTimeout(() => { if (state.value.statusMessage === `Folder ${folderName} deleted.`) _setStatus(null); }, 2000);
         } catch (err: any) {
              _setError(`Failed to delete folder ${folderName}: ${err.message}. Reloading might be needed.`);
             // Consider reloading config on error
         }
     };

      const renameNode = async (nodeId: string, newName: string) => {
         const node = findTreeNodeById(state.value.configTree, nodeId);
         if (!node || (node.type !== 'file' && node.type !== 'folder')) {
             _setError('Node not found or not a file/folder.');
             return;
         }
         const oldPath = node.path;
         const oldName = node.name;
          _setStatus(`Renaming ${oldName} to ${newName}...`);

          // Basic validation
         if (!newName || newName.includes('/') || newName.includes('\\')) {
              _setError('Invalid name.');
              return;
         }
         if (newName === oldName) {
             _setStatus(null); // Nothing to do
             return;
         }

         const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
         const newPath = `${parentPath}/${newName}`;

         try {
             // 1. Rename in file system FIRST
             await platformService.renameFileOrDirectory(oldPath, newPath); // Assumes unified function

             // 2. Update tree state
             node.name = newName;
             node.path = newPath;
             node.id = `${node.type}-${newPath}`; // IMPORTANT: Update ID if based on path

             // If folder, update descendant paths and item filePaths recursively
             if (node.type === 'folder') {
                  // Need a robust recursive update function for the tree state
                 // await updateDescendantPathsInTree(node, oldPath, newPath); // Placeholder
                 console.warn("Recursive path update for folder rename not fully implemented in this example.");
                 // Simplest fix: reload config after rename
                 await loadConfig(state.value.configRootDir || undefined);

             } else if (node.type === 'file') {
                 // Update filePath for contained matches/groups
                  const updateContainedPaths = (items?: (Match | Group)[]) => {
                      items?.forEach(item => {
                          if (item.filePath === oldPath) {
                              item.filePath = newPath;
                          }
                          if (item.type === 'group') {
                              updateContainedPaths(item.matches);
                              updateContainedPaths(item.groups);
                          }
                      });
                  };
                  updateContainedPaths((node as ConfigFileNode).matches);
                  updateContainedPaths((node as ConfigFileNode).groups);
             }

             // Update selection ID if renamed item was selected
             if (state.value.selectedItemId === `${node.type}-${oldPath}`) { // Check against old path-based ID
                 selectItem(node.id, node.type);
             }

             _setStatus(`Renamed to ${newName}.`);
             setTimeout(() => { if (state.value.statusMessage === `Renamed to ${newName}.`) _setStatus(null); }, 2000);

         } catch (err: any) {
             _setError(`Failed to rename ${oldName}: ${err.message}`);
             // Consider reloading config on error
         }
     };


    // --- Return Store Interface ---
    return {
        state, // Read-only state access preferred via computed properties
        // Computed Getters
        allMatches,
        allGroups,
        allItems,
        selectedItem,
        selectedFileNode,
        // Actions
        initializeStore,
        loadConfig,
        selectItem,
        setSearchQuery,
        setSelectedTags,
        toggleLeftMenu,
        updateGlobalConfig,
        updateMatch,
        updateGroup,
        addItem,
        deleteItem,
        moveItem,
        pasteItem,
        createConfigFile, // Example File/Folder Op
        deleteFileNode, // Example File/Folder Op
        deleteFolderNode, // Example File/Folder Op
        renameNode, // Example File/Folder Op

    };
});