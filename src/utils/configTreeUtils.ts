// src/utils/configTreeUtils.ts (移除 Group 相关逻辑后)

import type { Match } from "@/types/core/espanso.types"; // 核心内部类型 - 只导入 Match
import type { YamlData } from "@/types/core/preload.types"; // Preload 相关类型
import type {
  ConfigTreeNode,
  ConfigFileNode,
  ConfigFolderNode,
} from "@/types/core/ui.types"; // 核心 UI/树节点类型

// --- 类型守卫 (Type Guards) ---

export function isFileNode(node: any): node is ConfigFileNode {
  return node?.type === "file";
}

export function isFolderNode(node: any): node is ConfigFolderNode {
  return node?.type === "folder";
}

export function isMatch(item: any): item is Match {
    return item?.type === "match";
}

// 移除了 isGroup

// --- 树节点创建 ---

/**
 * 创建文件节点 (ConfigFileNode)
 * @param name 文件名
 * @param path 完整文件路径
 * @param fileType 文件类型
 * @param content 可选的原始 YAML 内容
 * @param matches 该文件包含的 Match 对象数组
 * @returns ConfigFileNode
 */
export const createFileNode = (
  name: string,
  path: string,
  fileType: ConfigFileNode["fileType"],
  content: YamlData | undefined,
  matches: Match[],
  // groups: Group[] // 移除了 groups 参数
): ConfigFileNode => {
  return {
    type: "file",
    id: `file-${path}`,
    name,
    path,
    fileType,
    content,
    matches: matches || [],
    extension: "yaml",
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
    id: `folder-${path}`,
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
        // 不再需要递归处理文件节点内的分组来查找 Match
      } else if (isFolderNode(node) && node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return matches;
};

// 移除了 extractGroupsFromTree 函数

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
 * 根据 ID 查找树节点 (ConfigFileNode 或 ConfigFolderNode)
 * @param nodes 树节点数组
 * @param id 要查找的节点 ID
 * @returns 找到的 ConfigTreeNode 或 null
 */
export const findNodeById = (
  nodes: ConfigTreeNode[],
  id: string
): ConfigTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (isFolderNode(node) && node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * 根据 ID 在整个树结构中查找具体的项 (Match, ConfigFileNode, ConfigFolderNode)
 * @param nodes 树节点数组
 * @param targetId 要查找的项的 ID
 * @returns 找到的项或节点, 或 null
 */
export const findItemInTreeById = (
  nodes: ConfigTreeNode[],
  targetId: string
): Match | ConfigTreeNode | null => { // 返回类型移除了 Group
  for (const node of nodes) {
    // 检查节点本身
    if (node.id === targetId) {
      return node;
    }

    // 如果是文件节点，检查其包含的 Matches
    if (isFileNode(node)) {
      const foundMatch = node.matches?.find((m) => m.id === targetId);
      if (foundMatch) return foundMatch;
      // 不再需要检查或递归 Groups
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
 * **(已修改)** 在树结构中查找指定 ID 的项或节点的直接父节点。
 * 父节点现在只能是 ConfigFolderNode 或 ConfigFileNode。
 * @param nodes 要搜索的树节点数组。
 * @param targetId 要查找其父节点的项或节点的 ID (Match, File, Folder)。
 * @returns 返回父节点 (Folder 或 File) 或 null (如果在顶层或未找到)。
 */
export const findParentNodeInTree = (
    nodes: ConfigTreeNode[],
    targetId: string
): ConfigFolderNode | ConfigFileNode | null => { // 返回类型移除了 Group

    const findParentRecursive = (
        currentNodes: ConfigTreeNode[],
        currentParent: ConfigFolderNode | ConfigFileNode | null
    ): ConfigFolderNode | ConfigFileNode | null => {

        for (const node of currentNodes) {
            if (!node) continue;

            if (isFileNode(node)) {
                // 检查文件的 Matches 是否包含 targetId
                if (node.matches?.some(m => m.id === targetId)) return node; // 父节点是 File
                // 文件节点不再包含 Group 或 Children
            } else if (isFolderNode(node)) {
                // 检查文件夹的 Children 是否包含 targetId (File 或 Folder 节点)
                if (node.children?.some(child => child.id === targetId)) return node; // 父节点是 Folder
                // 递归进入文件夹
                if (node.children) {
                    const foundInFolder = findParentRecursive(node.children, node);
                    if (foundInFolder) return foundInFolder;
                }
            }
            // 不需要检查 Match 作为父节点
        }
        return null; // 在当前层级未找到
    };

    // 从根节点开始查找，初始父节点设为 null
    return findParentRecursive(nodes, null);
};


/**
 * 获取指定 Match ID 所在的文件节点的路径
 * @param nodes 树节点数组
 * @param targetItemId Match 的 ID
 * @returns 文件路径字符串或 null
 */
export const getFilePathForNodeId = (
  nodes: ConfigTreeNode[],
  targetItemId: string
): string | null => {
  for (const node of nodes) {
    if (isFileNode(node)) {
       // 只检查文件节点内的 Matches
       if (node.matches?.some((m) => m.id === targetItemId)) return node.path;
       // 不再需要检查 Groups
    } else if (isFolderNode(node) && node.children) {
      const path = getFilePathForNodeId(node.children, targetItemId);
      if (path) return path;
    }
  }
  return null;
};

// --- 树结构修改 ---

/**
 * 从树中移除指定 ID 的项或节点 (Match, File, Folder)。
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

    // 1. 检查是否是顶层节点本身 (File or Folder)
    if (node.id === targetId) {
      nodes.splice(i, 1);
      return true;
    }

    // 2. 如果是文件节点，检查其内部 Matches
    if (isFileNode(node)) {
      const matchIndex =
        node.matches?.findIndex((m) => m.id === targetId) ?? -1;
      if (matchIndex !== -1) {
        node.matches?.splice(matchIndex, 1);
        return true;
      }
      // 不再需要检查 Groups
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
 * 将项 (Match) 或节点 (File/Folder) 添加到树中的指定父节点下。
 * @param nodes 根树节点数组 (会被修改)
 * @param itemRef 要添加的项或节点的引用 (Match, ConfigFileNode, ConfigFolderNode)
 * @param targetParentNodeId 目标父节点的 ID (必须是 File 或 Folder ID)。如果为 null，添加逻辑复杂，建议由调用者处理。
 * @param index 可选的插入索引，默认为追加。
 * @returns 添加成功则返回添加的项的引用, 失败则返回 null。
 */
export const addItemToTree = (
  nodes: ConfigTreeNode[],
  itemRef: Match | ConfigTreeNode, // 只接受 Match 或 ConfigTreeNode
  targetParentNodeId: string | null,
  index: number = -1
): Match | ConfigTreeNode | null => {

  let targetArray: any[] | undefined;
  let parentFilePath: string | undefined;

  if (targetParentNodeId === null) {
    console.error("[addItemToTree] targetParentNodeId is null. Cannot determine target.");
    return null;
  }

  // 查找父节点 (必须是 File 或 Folder)
  const parentNode = findNodeById(nodes, targetParentNodeId); // 使用 findNodeById

  if (!parentNode) {
    console.error(`[addItemToTree] Cannot find target parent node with ID: ${targetParentNodeId}`);
    return null;
  }

  // --- 确定目标数组和文件路径 ---
  if (isFileNode(parentNode)) { // 父节点是文件
    parentFilePath = parentNode.path;
    if (isMatch(itemRef)) { // 只允许添加 Match 到文件
      if (!parentNode.matches) parentNode.matches = [];
      targetArray = parentNode.matches;
    } else {
      console.error(`[addItemToTree] Cannot add node type '${itemRef.type}' inside a file node.`);
      return null;
    }
  } else if (isFolderNode(parentNode)) { // 父节点是文件夹
    parentFilePath = undefined;
    if (isFileNode(itemRef) || isFolderNode(itemRef)) { // 只允许添加 File 或 Folder 到文件夹
      if (!parentNode.children) parentNode.children = [];
      targetArray = parentNode.children;
      itemRef.path = `${parentNode.path}/${itemRef.name}`; // 设置子节点路径
    } else {
      console.error(`[addItemToTree] Cannot add item type '${itemRef.type}' directly inside a folder node.`);
      return null;
    }
  } else { // 父节点类型无效
    console.error(`[addItemToTree] Invalid target parent type: '${parentNode.type}'`);
    return null;
  }

  // --- 设置文件路径 (如果添加的是 Match) ---
  if (isMatch(itemRef) && parentFilePath) {
    itemRef.filePath = parentFilePath;
  }

  // --- 插入到目标数组 ---
  if (targetArray) {
    const safeIndex = index >= 0 && index <= targetArray.length ? index : targetArray.length;
    targetArray.splice(safeIndex, 0, itemRef);
    return itemRef;
  } else {
    console.error("[addItemToTree] Could not determine target array for insertion.");
    return null;
  }
};


/**
 * 更新文件夹移动或重命名后，其所有后代节点的路径及内部 Match 的 filePath。
 * @param node 要更新的起始节点
 * @param newBasePath 父目录的新路径
 * @param joinPathFunc 异步路径连接函数
 */
export const updateDescendantPathsAndFilePaths = async (
  node: ConfigTreeNode,
  newBasePath: string,
  joinPathFunc: (...paths: string[]) => Promise<string>
): Promise<void> => {

  const oldNodePath = node.path;
  const newNodePath = await joinPathFunc(newBasePath, node.name);

  node.path = newNodePath;
  node.id = `${node.type}-${newNodePath}`; // 更新 ID!

  // 如果是文件节点，更新其内部 Match 项的 filePath
  if (isFileNode(node)) {
    node.matches?.forEach(match => {
      if (match.filePath === oldNodePath) {
        match.filePath = newNodePath;
      }
    });
    // 不需要处理 node.groups
  }

  // 如果是文件夹并且有子节点，递归更新它们
  if (isFolderNode(node) && node.children?.length) {
    for (const child of node.children) {
      await updateDescendantPathsAndFilePaths(child, node.path, joinPathFunc);
    }
  }
};