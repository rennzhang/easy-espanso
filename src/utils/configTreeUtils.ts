import { Match, Group } from '@/types/espanso';
import { FileInfo, YamlData } from '@/types/preload';

// --- Define Tree Node Types Here --- //
// (Copied from useEspansoStore.ts as they relate to the tree structure)
export interface ConfigFileNode {
  type: 'file';
  name: string;
  path: string;
  fileType: 'match' | 'config' | 'package';
  content?: YamlData;
  matches?: Match[];
  groups?: Group[];
  id?: string; // Ensure ID is part of the type
}

export interface ConfigFolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: (ConfigFileNode | ConfigFolderNode)[];
  id?: string; // Ensure ID is part of the type
}

export type ConfigTreeNode = ConfigFileNode | ConfigFolderNode;

// Re-export types for consumers
export type { FileInfo, YamlData };

// --- Tree Creation --- //

export const createFileNode = (file: FileInfo, content: YamlData, fileType: 'match' | 'config' | 'package', processedMatches: Match[], processedGroups: Group[]): ConfigFileNode => {
    return {
      type: 'file',
      name: file.name,
      path: file.path,
      id: `file-${file.path}`, // Generate ID based on path
      fileType,
      content, 
      matches: processedMatches,
      groups: processedGroups
    };
};

export const createFolderNode = (name: string, path: string): ConfigFolderNode => {
    return {
      type: 'folder',
      name,
      path,
      id: `folder-${path}`, // Generate ID based on path
      children: []
    };
};

export const addToTree = (tree: ConfigTreeNode[], fileNodeToAdd: ConfigFileNode, relativePath: string): void => {
    // Use preloadApi for path joining if available, cast to any
    // TODO: Consider passing joinPath function as an argument instead of relying on global window.preloadApi
    const safeJoinPath = (...args: string[]) => {
      const api = window.preloadApi as any;
      if (api?.joinPath) {
        return api.joinPath(...args);
      } else {
        return args.join('/'); // Basic fallback
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
      // Calculate folder path based on fileNodeToAdd's path and folderName
      const fileDir = fileNodeToAdd.path.substring(0, fileNodeToAdd.path.lastIndexOf('/'));
      const folderPath = safeJoinPath(fileDir.substring(0, fileDir.lastIndexOf('/')), folderName);
      // This path calculation might be brittle, depends heavily on relativePath structure
      // It assumes relativePath starts from one level above the file's immediate parent
      // Let's refine or simplify based on how relativePath is constructed in loadConfig
      // A safer approach might be to build the path iteratively
      let currentLevelPath = ''; // Assume starting from a base known path passed to addToTree initially
      // This needs refinement based on the caller context.
      // Sticking to simpler (potentially flawed) logic for now:
      const parentOfFileDir = fileDir.substring(0, fileDir.lastIndexOf('/'));
      const calculatedFolderPath = safeJoinPath(parentOfFileDir, folderName);

      folderNode = createFolderNode(folderName, calculatedFolderPath); // Use calculated path
      tree.push(folderNode);
    }
    if (parts.length > 1) {
      addToTree(folderNode.children, fileNodeToAdd, parts.slice(1).join('/'));
    } else {
      folderNode.children.push(fileNodeToAdd);
    }
};

// --- Tree Searching/Finding --- //

export const findFileNode = (nodes: ConfigTreeNode[], path: string): ConfigFileNode | null => {
    for (const node of nodes) {
      if (node.type === 'file' && node.path === path) {
        return node;
      } else if (node.type === 'folder' && node.children) {
        const found = findFileNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
};

// Helper to find the node (file/folder) itself by ID
const findNodeInTreeById = (nodes: ConfigTreeNode[], id: string): ConfigTreeNode | null => {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.type === 'folder' && node.children) {
            const found = findNodeInTreeById(node.children, id);
            if (found) return found;
        }
    }
    return null;
};

// Revised findNodeById from store to search specifically within the tree structure
export const findNodeById = (
      nodes: ConfigTreeNode[],
      id: string,
      allowedTypes: Array<'file' | 'folder'> // Removed match/group as this searches tree nodes
  ): ConfigTreeNode | null => {
      if (!nodes || !Array.isArray(nodes) || !id) return null;
      for (const node of nodes) {
          if (allowedTypes.includes(node.type) && node.id === id) {
              return node;
          }
          // Recurse only into folders
          if (node.type === 'folder' && node.children) {
              const foundInChild = findNodeById(node.children, id, allowedTypes);
              if (foundInChild) return foundInChild;
          }
      }
      return null;
};

// Gets the file path containing a match/group ID by searching the tree
export const getFilePathForNodeId = (nodes: ConfigTreeNode[], targetItemId: string): string | null => {
    for (const node of nodes) {
      if (node.type === 'file') {
         // Check if the file node itself matches (might happen if file ID is passed? unlikely)
         // if (node.id === targetItemId) return node.path;

         // Check contained matches/groups
         if (node.matches?.some(m => m.id === targetItemId)) return node.path;
         if (node.groups) {
             // Need recursive search within groups defined in this file
             const findInGroup = (group: Group): boolean => {
                 if (group.id === targetItemId) return true;
                 if (group.matches?.some(m => m.id === targetItemId)) return true;
                 if (group.groups?.some(g => findInGroup(g))) return true;
                 return false;
             }
             if (node.groups.some(g => findInGroup(g))) return node.path;
         }
      }
      else if (node.type === 'folder' && node.children) {
        const path = getFilePathForNodeId(node.children, targetItemId);
        if (path) return path;
      }
    }
    return null;
};

// Gets all descendant node IDs (files/folders) starting from a folder ID
export const getDescendantNodeIds = (nodes: ConfigTreeNode[], startNodeId: string): string[] => {
    const descendants = new Set<string>();
    const startNode = findNodeInTreeById(nodes, startNodeId);

    if (!startNode || startNode.type !== 'folder') return [];

    const queue: ConfigTreeNode[] = [startNode];

    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      if (currentNode.id && !descendants.has(currentNode.id)) { // Check ID exists
        descendants.add(currentNode.id);
        if (currentNode.type === 'folder' && currentNode.children) {
          queue.push(...currentNode.children);
        }
      }
    }
    return Array.from(descendants);
};


// --- Tree Updating --- //

// Finds and updates an item (Match/Group) reference within the ConfigTreeNode structure
// Note: This updates the REFERENCES within the tree, assuming the item itself was updated elsewhere.
export const findAndUpdateInTree = (nodes: ConfigTreeNode[], updatedItem: Match | Group): boolean => {
    for (const node of nodes) {
        if (node.type === 'file') {
            if (updatedItem.type === 'match' && node.matches) {
                const index = node.matches.findIndex(m => m.id === updatedItem.id);
                if (index !== -1) {
                    node.matches[index] = updatedItem as Match;
                    return true;
                }
            } else if (updatedItem.type === 'group' && node.groups) {
                // Modify function to accept Group[] | undefined
                const findAndUpdateNestedGroup = (groups: Group[] | undefined): boolean => {
                    // Handle undefined case at the beginning
                    if (!groups) {
                        return false;
                    }
                    for (let i = 0; i < groups.length; i++) {
                        if (groups[i].id === updatedItem.id) {
                            groups[i] = updatedItem as Group;
                            return true;
                        }
                        // No need for explicit check here anymore, as the function accepts undefined
                        if (findAndUpdateNestedGroup(groups[i].groups)) {
                            return true;
                        }
                    }
                    return false;
                }
                // No need for check here as the function handles undefined
                if (findAndUpdateNestedGroup(node.groups)) return true;
            }
        } else if (node.type === 'folder' && node.children) {
            if (findAndUpdateInTree(node.children, updatedItem)) {
                return true;
            }
        }
    }
    return false;
};

// Updates paths for a node and its descendants after a move
export const updateDescendantPathsAndFilePaths = async (
    node: ConfigTreeNode,
    oldBasePath: string,
    newBasePath: string,
    joinPathFunc: (...paths: string[]) => Promise<string> // Pass joinPath async function
  ) => {

    const oldNodePath = node.path;
    // Calculate new path based on the *new* base path and the node's name
    const newNodePath = await joinPathFunc(newBasePath, node.name);
    node.path = newNodePath;
    // console.log(`[updateDescendantPaths] Updated path for ${node.type} ${node.id}: ${newNodePath}`);

    // If it's a file node, update filePath for contained matches/groups
    if (node.type === 'file') {
        const updateItemPath = (item: Match | Group) => {
          if (item.filePath === oldNodePath) { // Only update if it pointed to the old file path
            item.filePath = newNodePath;
          }
          // Recurse for nested groups
          if (item.type === 'group' && item.groups) {
            item.groups.forEach(updateItemPath);
          }
           if (item.type === 'group' && item.matches) {
            item.matches.forEach(updateItemPath);
          }
        };
        node.matches?.forEach(updateItemPath);
        node.groups?.forEach(updateItemPath);
    }

    // If it's a folder and has children, recursively update them using the *new* node path as their base
    if (node.type === 'folder' && node.children && node.children.length > 0) {
      for (const child of node.children) {
          // Pass the NEW path of the current node as the base path for its children
         await updateDescendantPathsAndFilePaths(child, child.path.substring(0, child.path.lastIndexOf('/')), newNodePath, joinPathFunc);
      }
    }
}; 