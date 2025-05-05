import type { Match, Group } from "@/types/core/espanso.types"; // 核心内部类型
import type { YamlData } from "@/types/core/preload.types"; // Preload 相关类型
import type {
  ConfigTreeNode,
  ConfigFileNode,
  ConfigFolderNode,
} from "@/types/core/ui.types"; // 核心 UI/树节点类型

// --- 类型守卫 (Type Guards) ---

function isFileNode(node: any): node is ConfigFileNode {
  return node?.type === "file";
}

function isFolderNode(node: any): node is ConfigFolderNode {
  return node?.type === "folder";
}

function isMatch(item: any): item is Match {
  return item?.type === "match";
}

function isGroup(item: any): item is Group {
  return item?.type === "group";
}

// --- 树节点创建 ---

/**
 * 创建文件节点 (ConfigFileNode)
 * @param name 文件名 (e.g., 'base.yml')
 * @param path 完整文件路径
 * @param fileType 文件类型 ('match', 'config', 'package')
 * @param content 可选的原始 YAML 内容
 * @param matches 该文件包含的 Match 对象数组
 * @param groups 该文件包含的顶层 Group 对象数组
 * @returns ConfigFileNode
 */
export const createFileNode = (
  name: string,
  path: string,
  fileType: ConfigFileNode["fileType"],
  content: YamlData | undefined,
  matches: Match[],
  groups: Group[]
): ConfigFileNode => {
  return {
    type: "file",
    id: `file-${path}`, // 使用路径生成唯一 ID
    name,
    path,
    fileType,
    content,
    matches: matches || [],
    groups: groups || [],
  };
};

/**
 * 创建文件夹节点 (ConfigFolderNode)
 * @param name 文件夹名称
 * @param path 完整文件夹路径
 * @returns ConfigFolderNode
 */
export const createFolderNode = (
  name: string,
  path: string
): ConfigFolderNode => {
  return {
    type: "folder",
    id: `folder-${path}`, // 使用路径生成唯一 ID
    name,
    path,
    children: [],
  };
};

// --- 树数据提取 ---

/**
 * 从 ConfigTreeNode 数组中递归提取所有的 Match 对象
 * @param nodes 树节点数组
 * @returns 所有找到的 Match 对象数组
 */
export const extractMatchesFromTree = (nodes: ConfigTreeNode[]): Match[] => {
  const matches: Match[] = [];
  const traverse = (currentNodes: ConfigTreeNode[]) => {
    for (const node of currentNodes) {
      if (isFileNode(node)) {
        matches.push(...(node.matches || []));
        // 递归处理文件节点内的分组
        const traverseGroups = (groups: Group[]) => {
          for (const group of groups) {
            matches.push(...(group.matches || []));
            if (group.groups) {
              traverseGroups(group.groups);
            }
          }
        };
        if (node.groups) {
          traverseGroups(node.groups);
        }
      } else if (isFolderNode(node) && node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return matches;
};

/**
 * 从 ConfigTreeNode 数组中递归提取所有的 Group 对象 (包括嵌套的)
 * @param nodes 树节点数组
 * @returns 所有找到的 Group 对象数组
 */
export const extractGroupsFromTree = (nodes: ConfigTreeNode[]): Group[] => {
  const groups: Group[] = [];
  const traverse = (currentNodes: ConfigTreeNode[]) => {
    for (const node of currentNodes) {
      if (isFileNode(node)) {
        // 递归处理文件节点内的分组
        const collectGroups = (parentGroups: Group[]) => {
          for (const group of parentGroups) {
            groups.push(group); // 添加当前分组
            if (group.groups) {
              collectGroups(group.groups); // 递归子分组
            }
          }
        };
        if (node.groups) {
          collectGroups(node.groups);
        }
      } else if (isFolderNode(node) && node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return groups;
};

// --- 树节点/项目查找 ---

/**
 * 根据路径查找文件节点 (ConfigFileNode)
 * @param nodes 树节点数组
 * @param path 要查找的文件路径
 * @returns 找到的 ConfigFileNode 或 null
 */
export const findFileNode = (
  nodes: ConfigTreeNode[],
  path: string
): ConfigFileNode | null => {
  for (const node of nodes) {
    if (isFileNode(node) && node.path === path) {
      return node;
    } else if (isFolderNode(node) && node.children) {
      const found = findFileNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
};

/**
 * **(已恢复)** 根据 ID 查找树节点 (ConfigFileNode 或 ConfigFolderNode)
 * 这个函数只在树的顶层节点 (File/Folder) 中查找。
 * @param nodes 树节点数组
 * @param id 要查找的节点 ID (e.g., 'file-/path/to/file.yml', 'folder-/path/to/folder')
 * @returns 找到的 ConfigTreeNode 或 null
 */
export const findNodeById = (
  nodes: ConfigTreeNode[],
  id: string
): ConfigTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (isFolderNode(node) && node.children) {
      const found = findNodeById(node.children, id); // 注意：这里之前可能写错了，应该是 findNodeById
      if (found) return found;
    }
  }
  return null;
};
/**
 * **(新增)** 在树结构中查找指定 ID 的项或节点的直接父节点。
 * 父节点可能是 ConfigFolderNode, ConfigFileNode, 或 Group。
 * @param nodes 要搜索的树节点数组。
 * @param targetId 要查找其父节点的项或节点的 ID。
 * @returns 返回父节点 (Folder, File, 或 Group) 或 null (如果在顶层或未找到)。
 */
export const findParentNodeInTree = (
  nodes: ConfigTreeNode[],
  targetId: string
): ConfigFolderNode | ConfigFileNode | Group | null => {
  // 内部递归函数
  const findParentRecursive = (
    currentNodes: (ConfigTreeNode | Match | Group)[],
    currentParent: ConfigFolderNode | ConfigFileNode | Group | null
  ): ConfigFolderNode | ConfigFileNode | Group | null => {
    for (const nodeOrItem of currentNodes) {
      if (!nodeOrItem) continue;

      // 检查当前节点的直接子项/匹配项/分组
      if (isFileNode(nodeOrItem)) {
        if (nodeOrItem.matches?.some((m) => m.id === targetId))
          return nodeOrItem; // 父节点是文件
        if (nodeOrItem.groups?.some((g) => g.id === targetId))
          return nodeOrItem; // 父节点是文件
        // 递归进入文件内的分组
        if (nodeOrItem.groups) {
          const foundInFileGroups = findParentRecursive(
            nodeOrItem.groups,
            nodeOrItem
          );
          if (foundInFileGroups) return foundInFileGroups;
        }
      } else if (isFolderNode(nodeOrItem)) {
        if (nodeOrItem.children?.some((child) => child.id === targetId))
          return nodeOrItem; // 父节点是文件夹
        // 递归进入文件夹的子节点
        if (nodeOrItem.children) {
          const foundInFolder = findParentRecursive(
            nodeOrItem.children,
            nodeOrItem
          );
          if (foundInFolder) return foundInFolder;
        }
      } else if (isGroup(nodeOrItem)) {
        if (nodeOrItem.matches?.some((m) => m.id === targetId))
          return nodeOrItem; // 父节点是分组
        if (nodeOrItem.groups?.some((g) => g.id === targetId))
          return nodeOrItem; // 父节点是分组
        // 递归进入分组的子分组
        if (nodeOrItem.groups) {
          const foundInNestedGroups = findParentRecursive(
            nodeOrItem.groups,
            nodeOrItem
          );
          if (foundInNestedGroups) return foundInNestedGroups;
        }
      }
      // 注意：如果 targetId 是 Match，它不可能作为父节点，所以不需要检查 Match 的子项
    }
    return null; // 在当前层级未找到
  };

  // 从根节点开始查找，初始父节点设为 null
  return findParentRecursive(nodes, null);
};
/**
 * 根据 ID 查找树节点 (ConfigFileNode 或 ConfigFolderNode)
 * @param nodes 树节点数组
 * @param id 要查找的节点 ID (e.g., 'file-/path/to/file.yml', 'folder-/path/to/folder')
 * @returns 找到的 ConfigTreeNode 或 null
 */
export const findTreeNodeById = (
  nodes: ConfigTreeNode[],
  id: string
): ConfigTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (isFolderNode(node) && node.children) {
      const found = findTreeNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * 根据 ID 在整个树结构中查找具体的项 (Match, Group, ConfigFileNode, ConfigFolderNode)
 * @param nodes 树节点数组
 * @param targetId 要查找的项的 ID
 * @returns 找到的项或节点, 或 null
 */
export const findItemInTreeById = (
  nodes: ConfigTreeNode[],
  targetId: string
): Match | Group | ConfigTreeNode | null => {
  for (const node of nodes) {
    // 检查节点本身
    if (node.id === targetId) {
      return node;
    }

    // 如果是文件节点，检查其包含的 Matches 和 Groups (递归)
    if (isFileNode(node)) {
      // 检查顶层 Matches
      const foundMatch = node.matches?.find((m) => m.id === targetId);
      if (foundMatch) return foundMatch;

      // 递归检查 Groups
      const findInGroups = (groups: Group[]): Match | Group | null => {
        for (const group of groups) {
          if (group.id === targetId) return group;
          const foundNestedMatch = group.matches?.find(
            (m) => m.id === targetId
          );
          if (foundNestedMatch) return foundNestedMatch;
          if (group.groups) {
            const foundInNestedGroup = findInGroups(group.groups);
            if (foundInNestedGroup) return foundInNestedGroup;
          }
        }
        return null;
      };
      if (node.groups) {
        const foundGroupItem = findInGroups(node.groups);
        if (foundGroupItem) return foundGroupItem;
      }
    }
    // 如果是文件夹节点，递归检查子节点
    else if (isFolderNode(node) && node.children) {
      const foundInChildren = findItemInTreeById(node.children, targetId);
      if (foundInChildren) return foundInChildren;
    }
  }
  return null; // 未找到
};

/**
 * 获取指定 Match 或 Group ID 所在的文件节点的路径
 * @param nodes 树节点数组
 * @param targetItemId Match 或 Group 的 ID
 * @returns 文件路径字符串或 null
 */
export const getFilePathForNodeId = (
  nodes: ConfigTreeNode[],
  targetItemId: string
): string | null => {
  for (const node of nodes) {
    if (isFileNode(node)) {
      // 检查文件节点内的 Matches 和 Groups
      const findRecursively = (item: Match | Group): boolean => {
        if (item.id === targetItemId) return true;
        if (isGroup(item)) {
          if (item.matches?.some((m) => m.id === targetItemId)) return true;
          if (item.groups?.some((g) => findRecursively(g))) return true;
        }
        return false;
      };

      if (node.matches?.some((m) => m.id === targetItemId)) return node.path;
      if (node.groups?.some((g) => findRecursively(g))) return node.path;
    } else if (isFolderNode(node) && node.children) {
      const path = getFilePathForNodeId(node.children, targetItemId);
      if (path) return path;
    }
  }
  return null;
};

// --- 树结构修改 ---

/**
 * 从树中移除指定 ID 的项或节点。
 * @param nodes 树节点数组 (会被直接修改)
 * @param targetId 要移除的项或节点的 ID
 * @returns 如果成功移除返回 true, 否则返回 false
 */
export const removeItemFromTree = (
  nodes: ConfigTreeNode[],
  targetId: string
): boolean => {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];

    // 1. 检查是否是顶层节点本身
    if (node.id === targetId) {
      nodes.splice(i, 1);
      return true;
    }

    // 2. 如果是文件节点，检查其内部
    if (isFileNode(node)) {
      // 检查顶层 Matches
      const matchIndex =
        node.matches?.findIndex((m) => m.id === targetId) ?? -1;
      if (matchIndex !== -1) {
        node.matches?.splice(matchIndex, 1);
        return true;
      }

      // 递归检查和移除 Groups 及其内容
      const removeFromGroups = (groups: Group[]): boolean => {
        for (let j = groups.length - 1; j >= 0; j--) {
          const group = groups[j];
          // 检查分组本身
          if (group.id === targetId) {
            groups.splice(j, 1);
            return true;
          }
          // 检查分组内的 Matches
          const groupMatchIndex =
            group.matches?.findIndex((m) => m.id === targetId) ?? -1;
          if (groupMatchIndex !== -1) {
            group.matches?.splice(groupMatchIndex, 1);
            return true;
          }
          // 递归检查子分组
          if (group.groups && removeFromGroups(group.groups)) {
            return true;
          }
        }
        return false;
      };
      if (node.groups && removeFromGroups(node.groups)) {
        return true;
      }
    }
    // 3. 如果是文件夹节点，递归检查子节点
    else if (isFolderNode(node) && node.children) {
      if (removeItemFromTree(node.children, targetId)) {
        return true;
      }
    }
  }
  return false; // 未找到或移除
};

/**
 * 将项 (Match/Group) 或节点 (File/Folder) 添加到树中的指定父节点下。
 * 注意：此函数修改传入的 `nodes` 数组。它负责将引用添加到正确的位置，
 * 并 *应该* 尝试设置新添加项的 `filePath` (如果适用且父节点已知)。
 *
 * @param nodes 根树节点数组 (会被修改)
 * @param itemRef 要添加的项或节点的引用 (Match, Group, ConfigFileNode, ConfigFolderNode)
 * @param targetParentNodeId 目标父节点的 ID (可以是 File, Folder, 或 Group ID)。如果为 null，则添加到根级别 (通常意味着添加到某个默认文件，逻辑需调用者处理或在此细化)。
 * @param index 可选的插入索引，默认为追加。
 * @returns 添加成功则返回添加的项的引用 (可能已更新 filePath), 失败则返回 null。
 */
export const addItemToTree = (
  nodes: ConfigTreeNode[],
  itemRef: Match | Group | ConfigTreeNode,
  targetParentNodeId: string | null,
  index: number = -1 // 默认为追加
): Match | Group | ConfigTreeNode | null => {
  let targetArray: any[] | undefined;
  let parentFilePath: string | undefined;

  // --- 查找目标父节点和它的子/匹配项数组 ---
  if (targetParentNodeId === null) {
    // 添加到根? 这通常意味着添加到某个默认文件或文件夹，此函数无法确定。
    // 调用者 (store action) 需要处理这种情况，比如找到默认文件节点再调用此函数。
    console.error(
      "[addItemToTree] targetParentNodeId is null. Cannot add to root directly."
    );
    return null; // 或者抛出错误
  }

  const parentNodeOrItem = findItemInTreeById(nodes, targetParentNodeId);

  if (!parentNodeOrItem) {
    console.error(
      `[addItemToTree] Cannot find target parent node/item with ID: ${targetParentNodeId}`
    );
    return null;
  }

  // --- 确定目标数组和文件路径 ---
  if (isFileNode(parentNodeOrItem)) {
    // 父节点是文件
    parentFilePath = parentNodeOrItem.path;
    if (isMatch(itemRef)) {
      if (!parentNodeOrItem.matches) parentNodeOrItem.matches = [];
      targetArray = parentNodeOrItem.matches;
    } else if (isGroup(itemRef)) {
      if (!parentNodeOrItem.groups) parentNodeOrItem.groups = [];
      targetArray = parentNodeOrItem.groups;
    } else {
      // 不能将文件/文件夹添加到文件内部
      console.error(
        `[addItemToTree] Cannot add node type '${itemRef.type}' inside a file node.`
      );
      return null;
    }
  } else if (isFolderNode(parentNodeOrItem)) {
    // 父节点是文件夹
    parentFilePath = undefined; // 文件路径不直接适用于文件夹的子项
    if (isFileNode(itemRef) || isFolderNode(itemRef)) {
      if (!parentNodeOrItem.children) parentNodeOrItem.children = [];
      targetArray = parentNodeOrItem.children;
      // 对于添加到文件夹的文件/子文件夹，其 filePath 应基于父文件夹路径设置
      itemRef.path = `${parentNodeOrItem.path}/${itemRef.name}`; // 简化路径连接
    } else {
      // 不能将 Match/Group 直接添加到文件夹节点
      console.error(
        `[addItemToTree] Cannot add item type '${itemRef.type}' directly inside a folder node.`
      );
      return null;
    }
  } else if (isGroup(parentNodeOrItem)) {
    // 父节点是分组
    parentFilePath = parentNodeOrItem.filePath;
    if (isMatch(itemRef)) {
      if (!parentNodeOrItem.matches) parentNodeOrItem.matches = [];
      targetArray = parentNodeOrItem.matches;
    } else if (isGroup(itemRef)) {
      if (!parentNodeOrItem.groups) parentNodeOrItem.groups = [];
      targetArray = parentNodeOrItem.groups;
    } else {
      // 不能将文件/文件夹添加到分组内部
      console.error(
        `[addItemToTree] Cannot add node type '${itemRef.type}' inside a group item.`
      );
      return null;
    }
  } else {
    // 父节点是 Match 或其他无效类型
    console.error(
      `[addItemToTree] Invalid target parent type: '${parentNodeOrItem.type}'`
    );
    return null;
  }

  // --- 设置文件路径 (如果适用) ---
  if ((isMatch(itemRef) || isGroup(itemRef)) && parentFilePath) {
    itemRef.filePath = parentFilePath;
  }

  // --- 插入到目标数组 ---
  if (targetArray) {
    const safeIndex =
      index >= 0 && index <= targetArray.length ? index : targetArray.length;
    targetArray.splice(safeIndex, 0, itemRef);
    // TODO: 更新 guiOrder (如果需要在此层级管理)
    return itemRef; // 返回添加的项引用
  } else {
    console.error(
      "[addItemToTree] Could not determine target array for insertion."
    );
    return null;
  }
};

/**
 * 更新文件夹移动或重命名后，其所有后代节点 (文件/文件夹) 的路径，
 * 以及文件节点内部包含的 Match/Group 的 filePath。
 * **重要:** 此函数修改传入的 `node` 对象及其后代。
 *
 * @param node 要更新的起始节点 (通常是被移动/重命名的文件夹或文件)
 * @param newBasePath 父目录的新路径 (移动/重命名后 node 应该在的目录)
 * @param joinPathFunc 一个 *异步* 函数用于连接路径段 (应由平台适配器提供)
 */
export const updateDescendantPathsAndFilePaths = async (
  node: ConfigTreeNode,
  newBasePath: string,
  joinPathFunc: (...paths: string[]) => Promise<string> // 传入异步连接函数
): Promise<void> => {
  const oldNodePath = node.path;
  // 根据新的父路径和节点名称计算新路径
  const newNodePath = await joinPathFunc(newBasePath, node.name);

  // 更新节点自身路径和 ID (如果 ID 基于路径)
  node.path = newNodePath;
  node.id = `${node.type}-${newNodePath}`; // 更新 ID!

  // console.log(`[updateDescendantPaths] Updated path for ${node.type} ${node.name}: ${newNodePath}`);

  // 如果是文件节点，更新其内部项的 filePath
  if (isFileNode(node)) {
    const updateItemPath = (item: Match | Group) => {
      // 只更新之前指向旧文件路径的项
      if (item.filePath === oldNodePath) {
        item.filePath = newNodePath;
      }
      // 递归处理嵌套分组
      if (isGroup(item)) {
        item.matches?.forEach(updateItemPath);
        item.groups?.forEach(updateItemPath);
      }
    };
    updateItemPath({
      type: "group",
      groups: node.groups,
      matches: node.matches,
    } as Group); // 伪 Group 启动递归
  }

  // 如果是文件夹并且有子节点，递归更新它们
  if (isFolderNode(node) && node.children?.length) {
    for (const child of node.children) {
      // 传递 *当前节点的新路径* 作为子节点的新基路径
      await updateDescendantPathsAndFilePaths(child, node.path, joinPathFunc);
    }
  }
};
