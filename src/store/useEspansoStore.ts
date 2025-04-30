import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Match, Group, EspansoConfig } from '../types/espanso';
import { PreloadApi, FileInfo, YamlData } from '../types/preload';
import { cloneDeep } from 'lodash-es';
import {
  readFile, parseYaml, writeFile, serializeYaml,
  listFiles, scanDirectory, fileExists
} from '../services/fileService';

declare global {
  interface Window {
    preload: PreloadApi;
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
    error: null
  });

  // 从树结构中获取所有项目
  const allItems = computed((): (Match | Group)[] => {
    const matches = getAllMatchesFromTree();
    const groups = getAllGroupsFromTree();
    return [...matches, ...groups];
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
    // 从树结构中查找项目
    const matches = getAllMatchesFromTree();
    const match = matches.find(m => m.id === id);
    if (match) return match;

    const groups = getAllGroupsFromTree();
    const group = groups.find(g => g.id === id);
    if (group) return group;

    // 检查嵌套分组中的项目
    for (const g of groups) {
      const item = findItemInGroup(g, id);
      if (item) return item;
    }

    return null;
  };

  // 获取配置树中的所有匹配项
  const getAllMatchesFromTree = (): Match[] => {
    const matches: Match[] = [];

    const traverseTree = (nodes: ConfigTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          if (node.matches) {
            matches.push(...node.matches);
          }
        } else if (node.type === 'folder') {
          traverseTree(node.children);
        }
      }
    };

    traverseTree(state.value.configTree);
    return matches;
  };

  // 获取配置树中的所有分组
  const getAllGroupsFromTree = (): Group[] => {
    const groups: Group[] = [];

    const traverseTree = (nodes: ConfigTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          if (node.groups) {
            groups.push(...node.groups);
          }
        } else if (node.type === 'folder') {
          traverseTree(node.children);
        }
      }
    };

    traverseTree(state.value.configTree);
    return groups;
  };

  const selectedItem = computed(() => {
    return state.value.selectedItemId ? findItemById(state.value.selectedItemId) : null;
  });

  // 生成唯一ID
  const generateId = (prefix: string): string => {
    return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
  };

  // 判断文件是否为配置文件（非下划线开头的yml文件）
  const isConfigFile = (fileName: string): boolean => {
    return (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) && !fileName.startsWith('_');
  };

  // 处理匹配项，确保有ID和必要的字段
  const processMatch = (match: any, filePath?: string): Match => {
    return {
      id: match.id || generateId('match'),
      type: 'match',
      trigger: match.trigger || '',
      replace: match.replace || '',
      filePath: filePath || match.filePath || '',
      ...Object.fromEntries(
        Object.entries(match).filter(([key]) => !['trigger', 'replace', 'filePath'].includes(key))
      )
    };
  };

  // 处理分组，确保有ID和必要的字段
  const processGroup = (group: any, filePath?: string): Group => {
    return {
      id: group.id || generateId('group'),
      type: 'group',
      name: group.name || '未命名分组',
      matches: Array.isArray(group.matches) ? group.matches.map(match => processMatch(match, filePath)) : [],
      groups: Array.isArray(group.groups) ? group.groups.map(nestedGroup => processGroup(nestedGroup, filePath)) : [],
      filePath: filePath || group.filePath || '',
      ...Object.fromEntries(
        Object.entries(group).filter(([key]) => !['name', 'matches', 'groups', 'filePath'].includes(key))
      )
    };
  };

  // 创建文件节点
  const createFileNode = (file: FileInfo, content: YamlData, fileType: 'match' | 'config' | 'package'): ConfigFileNode => {
    const matches = Array.isArray(content.matches)
      ? content.matches.map(match => processMatch(match, file.path))
      : [];

    const groups = Array.isArray(content.groups)
      ? content.groups.map(group => processGroup(group, file.path))
      : [];

    return {
      type: 'file',
      name: file.name,
      path: file.path,
      fileType,
      content,
      matches,
      groups
    };
  };

  // 创建文件夹节点
  const createFolderNode = (name: string, path: string): ConfigFolderNode => {
    return {
      type: 'folder',
      name,
      path,
      children: []
    };
  };

  // 将文件添加到树结构中
  const addToTree = (tree: ConfigTreeNode[], file: ConfigFileNode, relativePath: string): void => {
    // 如果没有相对路径，直接添加到根节点
    if (!relativePath || relativePath === '') {
      tree.push(file);
      return;
    }

    // 分割路径（确保使用正确的路径分隔符）
    const parts = relativePath.split('/');
    const folderName = parts[0];

    // 查找或创建文件夹节点
    let folderNode = tree.find(node =>
      node.type === 'folder' && node.name === folderName
    ) as ConfigFolderNode | undefined;

    if (!folderNode) {
      // 从文件路径中提取父目录路径
      const fileDirPath = file.path.substring(0, file.path.lastIndexOf('/'));
      const parentDirPath = fileDirPath.substring(0, fileDirPath.lastIndexOf('/') + 1);
      const folderPath = `${parentDirPath}${folderName}`;

      folderNode = createFolderNode(folderName, folderPath);
      tree.push(folderNode);
    }

    // 如果还有子路径，递归添加
    if (parts.length > 1) {
      addToTree(
        folderNode.children,
        file,
        parts.slice(1).join('/')
      );
    } else {
      // 否则直接添加文件到当前文件夹
      folderNode.children.push(file);
    }
  };

  // 获取正确的路径分隔符
  const getPathSeparator = (): string => {
    // 在浏览器环境中，process 可能不存在，默认使用 '/'
    if (typeof process !== 'undefined' && process.platform === 'win32') {
      return '\\';
    }
    return '/';
  };

  // 连接路径
  const joinPath = (...parts: string[]): string => {
    const separator = getPathSeparator();
    return parts.join(separator).replace(/\/\//g, '/').replace(/\\\\/g, '\\');
  };

  // 加载配置文件
  const loadConfig = async (configDirOrPath: string): Promise<void> => {
    console.log('开始加载配置，路径:', configDirOrPath);
    state.value.loading = true;
    state.value.error = null;

    try {
      // 确保路径使用正确的分隔符
      const separator = getPathSeparator();
      configDirOrPath = configDirOrPath.replace(/[\/\\]/g, separator);

      // 确定配置目录路径
      let configDir = configDirOrPath;
      if (configDirOrPath.endsWith('.yml') || configDirOrPath.endsWith('.yaml')) {
        configDir = configDirOrPath.replace(/[\/\\]config[\/\\]default\.ya?ml$/, '');
      }

      // 确保路径是完整的
      if (!configDir.startsWith('/') && !configDir.startsWith('\\')) {
        // 检查是否在 macOS 环境下
        const isMacOS = typeof process !== 'undefined' && process.platform === 'darwin';

        if (isMacOS) {
          // macOS 环境下相对路径转绝对路径
          const homeDir = typeof process !== 'undefined' ? (process.env.HOME || '') : '';

          if (configDir.toLowerCase().includes('library/application support') ||
              configDir.toLowerCase().includes('library\\application support')) {
            configDir = joinPath('/', configDir);
          } else if (homeDir) {
            if (!configDir.startsWith(homeDir)) {
              configDir = joinPath(homeDir, configDir);
            }
          }
        }
      }

      console.log('配置目录路径:', configDir);

      // 初始化配置树
      const configTree: ConfigTreeNode[] = [];

      // 1. 加载全局配置文件 (config/default.yml)
      const configPath = joinPath(configDir, 'config');
      const defaultConfigPath = joinPath(configPath, 'default.yml');

      try {
        const configExists = await fileExists(defaultConfigPath);
        if (configExists) {
          console.log('找到全局配置文件:', defaultConfigPath);
          const content = await readFile(defaultConfigPath);
          const yaml = await parseYaml(content) as YamlData;

          // 保存全局配置
          state.value.globalConfig = yaml;
          state.value.globalConfigPath = defaultConfigPath;

          // 添加到配置树
          const configFileNode = createFileNode(
            { name: 'default.yml', path: defaultConfigPath, extension: '.yml' },
            yaml,
            'config'
          );

          addToTree(configTree, configFileNode, 'config');
        } else {
          console.log('全局配置文件不存在');
        }
      } catch (error) {
        console.warn('读取全局配置文件失败:', error);
      }

      // 2. 加载匹配规则文件
      const matchDir = joinPath(configDir, 'match');
      let allMatches: Match[] = [];
      let allGroups: Group[] = [];

      try {
        const matchDirExists = await fileExists(matchDir);

        if (matchDirExists) {
          // 扫描match目录结构
          const matchDirTree = await scanDirectory(matchDir);
          console.log('匹配目录结构:', matchDirTree);

          // 递归处理目录树
          const processDirectory = async (dirNode: any, relativePath: string = '') => {
            if (dirNode.type === 'file') {
              // 处理文件
              if (isConfigFile(dirNode.name)) {
                try {
                  const content = await readFile(dirNode.path);
                  const yaml = await parseYaml(content) as YamlData;

                  // 判断文件类型
                  let fileType: 'match' | 'config' | 'package' = 'match';

                  // 检查是否在packages目录下
                  if (relativePath.includes('packages/')) {
                    fileType = 'package';
                  }

                  // 创建文件节点
                  const fileNode = createFileNode(
                    { name: dirNode.name, path: dirNode.path, extension: dirNode.name.substring(dirNode.name.lastIndexOf('.')) },
                    yaml,
                    fileType
                  );

                  // 添加到配置树
                  addToTree(configTree, fileNode, relativePath);

                  // 收集匹配项和分组
                  if (yaml.matches) {
                    const matches = yaml.matches.map(match => processMatch(match, dirNode.path));
                    allMatches = [...allMatches, ...matches];
                  }

                  if (yaml.groups) {
                    const groups = yaml.groups.map(group => processGroup(group, dirNode.path));
                    allGroups = [...allGroups, ...groups];
                  }
                } catch (error) {
                  console.warn(`处理文件 ${dirNode.path} 失败:`, error);
                }
              }
            } else if (dirNode.type === 'directory') {
              // 处理目录
              const newRelativePath = relativePath
                ? joinPath(relativePath, dirNode.name)
                : dirNode.name;

              // 递归处理子目录和文件
              if (Array.isArray(dirNode.children)) {
                for (const child of dirNode.children) {
                  await processDirectory(child, newRelativePath);
                }
              }
            }
          };

          // 处理match目录
          if (Array.isArray(matchDirTree)) {
            for (const node of matchDirTree) {
              await processDirectory(node);
            }
          }
        } else {
          console.log('match目录不存在');
        }
      } catch (error) {
        console.warn('处理match目录失败:', error);
      }

      // 如果没有找到任何匹配项，添加一个示例匹配项
      if (allMatches.length === 0) {
        console.log('未找到任何匹配项，添加示例匹配项');
        const exampleMatch: Match = {
          id: "match-0",
          type: "match",
          trigger: ":hello",
          replace: "Hello, World!"
        };
        allMatches.push(exampleMatch);

        // 创建示例文件
        try {
          const examplePath = joinPath(matchDir, 'base.yml');
          const exampleConfig = {
            matches: [
              {
                trigger: ":hello",
                replace: "Hello, World!"
              }
            ]
          };

          await writeFile(examplePath, await serializeYaml(exampleConfig));
          console.log('已创建示例规则文件');

          // 添加到配置树
          const fileNode = createFileNode(
            { name: 'base.yml', path: examplePath, extension: '.yml' },
            exampleConfig,
            'match'
          );

          addToTree(configTree, fileNode, '');
        } catch (error) {
          console.error('创建示例规则文件失败:', error);
        }
      }

      // 更新状态
      state.value.configTree = configTree;

      // 从树结构中获取所有匹配项和分组
      const treeMatches = getAllMatchesFromTree();
      const treeGroups = getAllGroupsFromTree();

      // 为了向后兼容，更新config对象
      state.value.config = {
        matches: treeMatches.length > 0 ? treeMatches : allMatches,
        groups: treeGroups.length > 0 ? treeGroups : allGroups
      };

      // 设置默认配置路径
      if (allMatches.length > 0 || allGroups.length > 0) {
        // 优先使用base.yml
        const basePath = joinPath(matchDir, 'base.yml');
        const baseExists = await fileExists(basePath);

        if (baseExists) {
          state.value.configPath = basePath;
        } else if (configTree.length > 0) {
          // 找到第一个match类型的文件
          const findFirstMatchFile = (nodes: ConfigTreeNode[]): string | null => {
            for (const node of nodes) {
              if (node.type === 'file' && node.fileType === 'match') {
                return node.path;
              } else if (node.type === 'folder') {
                const path = findFirstMatchFile(node.children);
                if (path) return path;
              }
            }
            return null;
          };

          const firstMatchPath = findFirstMatchFile(configTree);
          if (firstMatchPath) {
            state.value.configPath = firstMatchPath;
          } else {
            state.value.configPath = joinPath(matchDir, 'base.yml');
          }
        } else {
          state.value.configPath = joinPath(matchDir, 'base.yml');
        }
      } else {
        state.value.configPath = joinPath(matchDir, 'base.yml');
      }

      state.value.loading = false;
      console.log('配置加载完成');
      console.log('配置树:', configTree);
      console.log('匹配项数量:', allMatches.length);
      console.log('分组数量:', allGroups.length);

    } catch (error: any) {
      console.error('加载配置失败:', error);

      // 确保即使出错也有基本配置
      if (!state.value.config) {
        state.value.config = {
          matches: [
            {
              id: "match-0",
              type: "match",
              trigger: ":hello",
              replace: "Hello, World!"
            }
          ],
          groups: []
        };
      }

      // 确保配置树不为空
      if (state.value.configTree.length === 0) {
        state.value.configTree = [];
      }

      state.value.loading = false;
      state.value.error = `加载配置失败: ${error.message}`;
    }
  };

  const autoSaveConfig = async () => {
    if (!state.value.hasUnsavedChanges) return;

    try {
      state.value.autoSaveStatus = 'saving';

      // 保存当前活动的配置文件
      if (state.value.configPath) {
        const fileNode = findFileNode(state.value.configTree, state.value.configPath);

        if (fileNode) {
          // 准备要保存的数据
          const saveData: YamlData = {
            ...fileNode.content
          };

          // 更新匹配项
          if (fileNode.matches && fileNode.matches.length > 0) {
            // 将Match对象转换为普通对象，移除id和type字段
            saveData.matches = fileNode.matches.map(match => {
              const { id, type, ...rest } = match;
              return rest;
            });
          } else {
            // 如果没有匹配项，确保YAML中不包含空的matches数组
            delete saveData.matches;
          }

          // 更新分组
          if (fileNode.groups && fileNode.groups.length > 0) {
            // 将Group对象转换为普通对象，移除id和type字段
            saveData.groups = fileNode.groups.map(group => {
              const { id, type, ...rest } = group;
              return rest;
            });
          } else {
            // 如果没有分组，确保YAML中不包含空的groups数组
            delete saveData.groups;
          }

          // 序列化并保存
          const yamlContent = await serializeYaml(saveData);
          await writeFile(fileNode.path, yamlContent);
        } else if (state.value.config) {
          // 如果找不到文件节点，但有配置，则保存整个配置
          const allMatches = getAllMatchesFromTree();
          const allGroups = getAllGroupsFromTree();

          const yamlContent = await serializeYaml({
            matches: allMatches.map(({ id, type, ...rest }) => rest),
            groups: allGroups.map(({ id, type, ...rest }) => rest)
          });

          await writeFile(state.value.configPath, yamlContent);
        }
      }

      // 保存全局配置
      if (state.value.globalConfig && state.value.globalConfigPath) {
        const yamlContent = await serializeYaml(state.value.globalConfig);
        await writeFile(state.value.globalConfigPath, yamlContent);
      }

      // 更新状态
      const allMatches = getAllMatchesFromTree();
      const allGroups = getAllGroupsFromTree();
      state.value.config = {
        matches: allMatches,
        groups: allGroups
      };

      state.value.lastSavedState = JSON.stringify(state.value.config, null, 2);
      state.value.hasUnsavedChanges = false;
      state.value.autoSaveStatus = 'saved';
    } catch (error) {
      console.error('Auto-save failed:', error);
      state.value.autoSaveStatus = 'error';
    }
  };

  // 查找配置树中的文件节点
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

  const updateConfigAndSave = async (updateFn: (config: EspansoConfig) => void) => {
    // 从树结构中获取最新的匹配项和分组
    const allMatches = getAllMatchesFromTree();
    const allGroups = getAllGroupsFromTree();

    // 创建当前配置的副本
    const currentConfig: EspansoConfig = {
      matches: allMatches,
      groups: allGroups
    };

    // 应用更新函数
    const newConfig = cloneDeep(currentConfig);
    updateFn(newConfig);

    // 更新状态
    state.value.config = newConfig;
    state.value.hasUnsavedChanges = true;

    // 更新配置树中对应的文件
    if (state.value.configPath) {
      const fileNode = findFileNode(state.value.configTree, state.value.configPath);
      if (fileNode) {
        // 找出哪些匹配项和分组被修改了
        const updatedMatches = newConfig.matches.filter(match => {
          // 查找原始匹配项
          const originalMatch = allMatches.find(m => m.id === match.id);
          // 如果找不到原始匹配项，或者原始匹配项与新匹配项不同，则认为是更新的
          return !originalMatch || JSON.stringify(originalMatch) !== JSON.stringify(match);
        });

        const updatedGroups = newConfig.groups.filter(group => {
          const originalGroup = allGroups.find(g => g.id === group.id);
          return !originalGroup || JSON.stringify(originalGroup) !== JSON.stringify(group);
        });

        // 更新文件节点中的匹配项和分组
        if (fileNode.matches) {
          // 更新现有匹配项
          fileNode.matches = fileNode.matches.map(match => {
            const updatedMatch = updatedMatches.find(m => m.id === match.id);
            return updatedMatch || match;
          });

          // 添加新的匹配项（如果当前文件是活动文件）
          const newMatches = updatedMatches.filter(match =>
            !fileNode.matches?.some(m => m.id === match.id) &&
            !allMatches.some(m => m.id === match.id)
          );

          if (newMatches.length > 0 && state.value.configPath === fileNode.path) {
            fileNode.matches = [...fileNode.matches, ...newMatches];
          }
        }

        if (fileNode.groups) {
          // 更新现有分组
          fileNode.groups = fileNode.groups.map(group => {
            const updatedGroup = updatedGroups.find(g => g.id === group.id);
            return updatedGroup || group;
          });

          // 添加新的分组（如果当前文件是活动文件）
          const newGroups = updatedGroups.filter(group =>
            !fileNode.groups?.some(g => g.id === group.id) &&
            !allGroups.some(g => g.id === group.id)
          );

          if (newGroups.length > 0 && state.value.configPath === fileNode.path) {
            fileNode.groups = [...fileNode.groups, ...newGroups];
          }
        }
      }
    }

    await autoSaveConfig();
  };

  const updateItem = async (item: Match | Group) => {
    await updateConfigAndSave(newConfig => {
      if (!newConfig) return;

      if ('trigger' in item) {
        const index = newConfig.matches.findIndex(i => i.id === item.id);
        if (index !== -1) {
          newConfig.matches[index] = item as Match;
        }
      } else {
        const index = newConfig.groups.findIndex(i => i.id === item.id);
        if (index !== -1) {
          newConfig.groups[index] = item as Group;
        }
      }
    });
  };

  const deleteItem = async (id: string, type: 'match' | 'group') => {
    await updateConfigAndSave(newConfig => {
      if (!newConfig) return;

      if (type === 'match') {
        const index = newConfig.matches.findIndex(i => i.id === id);
        if (index !== -1) {
          newConfig.matches.splice(index, 1);
        }
      } else {
        const index = newConfig.groups.findIndex(i => i.id === id);
        if (index !== -1) {
          newConfig.groups.splice(index, 1);
        }
      }
    });
  };

  const addItem = async (item: Match | Group) => {
    await updateConfigAndSave(newConfig => {
      if (!newConfig) return;

      if ('trigger' in item) {
        newConfig.matches.push(item as Match);
      } else {
        newConfig.groups.push(item as Group);
      }
    });
  };



  // 根据路径获取配置文件节点
  const getConfigFileByPath = (path: string): ConfigFileNode | null => {
    return findFileNode(state.value.configTree, path);
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
    addItem,
    // 树结构相关方法
    getAllMatchesFromTree,
    getAllGroupsFromTree,
    getConfigFileByPath,
    findFileNode
  };
});
