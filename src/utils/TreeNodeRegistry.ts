import { Ref } from 'vue';

// 节点元数据接口
interface NodeMetadata {
  id: string;
  parentId?: string | null;
  filePath?: string;
  type: 'match' | 'group' | 'file' | 'folder';
}

// 节点数据类型
interface NodeData {
  type: string;
  id: string;
  parentId?: string | null;
  [key: string]: any;
}

// 存储在注册表中的节点信息
interface NodeInfo {
  isOpen?: Ref<boolean>;
  [key: string]: any;
}

// 树节点实例注册表
class TreeNodeRegistry {
  private static instance: TreeNodeRegistry;
  private registry: Map<string, { info: NodeInfo, nodeData?: NodeData }> = new Map();
  private parentChildMap: Map<string, string[]> = new Map(); // 父到子映射

  private constructor() {}

  // 单例模式
  public static getInstance(): TreeNodeRegistry {
    if (!TreeNodeRegistry.instance) {
      TreeNodeRegistry.instance = new TreeNodeRegistry();
    }
    return TreeNodeRegistry.instance;
  }

  /**
   * 注册一个节点
   */
  public register(id: string, info: NodeInfo, nodeData?: NodeData): void {
    this.registry.set(id, { info, nodeData });
    
    // 如果有父节点，更新父子关系映射
    if (nodeData?.parentId) {
      if (!this.parentChildMap.has(nodeData.parentId)) {
        this.parentChildMap.set(nodeData.parentId, []);
      }
      const children = this.parentChildMap.get(nodeData.parentId) || [];
      if (!children.includes(id)) {
        children.push(id);
        this.parentChildMap.set(nodeData.parentId, children);
      }
    }
  }

  /**
   * 注销一个节点
   */
  public unregister(id: string): void {
    const node = this.registry.get(id);
    if (node?.nodeData?.parentId) {
      const children = this.parentChildMap.get(node.nodeData.parentId) || [];
      const index = children.indexOf(id);
      if (index !== -1) {
        children.splice(index, 1);
        if (children.length === 0) {
          this.parentChildMap.delete(node.nodeData.parentId);
        } else {
          this.parentChildMap.set(node.nodeData.parentId, children);
        }
      }
    }
    this.registry.delete(id);
  }

  /**
   * 获取一个节点
   */
  public get(id: string): { info: NodeInfo, nodeData?: NodeData } | undefined {
    return this.registry.get(id);
  }

  /**
   * 获取指定父节点的所有子节点
   */
  public getChildren(parentId: string): string[] {
    return this.parentChildMap.get(parentId) || [];
  }

  /**
   * 展开所有父节点
   */
  public expandParents(nodeId: string): void {
    let currentNode = this.registry.get(nodeId);
    while (currentNode?.nodeData?.parentId) {
      const parentNode = this.registry.get(currentNode.nodeData.parentId);
      if (parentNode?.info.isOpen) {
        parentNode.info.isOpen.value = true;
      }
      currentNode = parentNode;
    }
  }

  /**
   * 获取所有具有相同parentId的节点
   */
  public getAllWithParentId(parentId: string): Array<{ info: NodeInfo, nodeData?: NodeData }> {
    const result: Array<{ info: NodeInfo, nodeData?: NodeData }> = [];
    for (const [id, node] of this.registry.entries()) {
      if (node.nodeData?.parentId === parentId) {
        result.push(node);
      }
    }
    return result;
  }
  
  /**
   * 获取指定节点的所有父节点
   */
  public getAllParentNodes(nodeId: string): Array<{ info: NodeInfo, nodeData?: NodeData }> {
    const result: Array<{ info: NodeInfo, nodeData?: NodeData }> = [];
    let currentNode = this.registry.get(nodeId);
    
    while (currentNode?.nodeData?.parentId) {
      const parentNode = this.registry.get(currentNode.nodeData.parentId);
      if (parentNode) {
        result.push(parentNode);
        currentNode = parentNode;
      } else {
        break;
      }
    }
    
    return result;
  }

  /**
   * 获取所有节点
   */
  public getAll(): Map<string, { info: NodeInfo, nodeData?: NodeData }> {
    return new Map(this.registry);
  }

  // 展开所有节点
  public expandAll(): void {
    this.registry.forEach(instance => {
      if (instance && instance.info.isOpen) {
        instance.info.isOpen.value = true;
      }
    });
  }

  // 收起所有节点
  public collapseAll(): void {
    this.registry.forEach(instance => {
      if (instance && instance.info.isOpen) {
        instance.info.isOpen.value = false;
      }
    });
  }

  // 展开当前分组及其所有子分组
  public expandGroup(groupId: string): void {
    // 先展开当前分组
    const currentGroup = this.registry.get(groupId);
    if (currentGroup && currentGroup.info.isOpen) {
      currentGroup.info.isOpen.value = true;
    }

    // 找出所有子分组并展开
    this.registry.forEach((instance, id) => {
      if (instance.nodeData?.parentId === groupId) {
        if (instance.info.isOpen) {
          instance.info.isOpen.value = true;
        }
        // 递归展开子分组
        if (instance.nodeData.type === 'group') {
          this.expandGroup(id);
        }
      }
    });
  }

  // 收起当前分组及其所有子分组
  public collapseGroup(groupId: string): void {
    // 找出所有子分组并收起
    this.registry.forEach((instance, id) => {
      if (instance.nodeData?.parentId === groupId) {
        if (instance.info.isOpen) {
          instance.info.isOpen.value = false;
        }
        // 递归收起子分组
        if (instance.nodeData.type === 'group') {
          this.collapseGroup(id);
        }
      }
    });

    // 最后收起当前分组
    const currentGroup = this.registry.get(groupId);
    if (currentGroup && currentGroup.info.isOpen) {
      currentGroup.info.isOpen.value = false;
    }
  }

  // 展开当前标签文件夹下的所有分组
  public expandFile(filePath: string): void {
    this.registry.forEach((instance, id) => {
      if (instance.nodeData?.filePath === filePath) {
        if (instance.info.isOpen) {
          instance.info.isOpen.value = true;
        }
        // 递归展开子分组
        if (instance.nodeData.type === 'group') {
          this.expandGroup(id);
        }
      }
    });
  }

  // 收起当前标签文件夹下的所有分组
  public collapseFile(filePath: string): void {
    this.registry.forEach((instance, id) => {
      if (instance.nodeData?.filePath === filePath) {
        if (instance.info.isOpen) {
          instance.info.isOpen.value = false;
        }
        // 递归收起子分组
        if (instance.nodeData.type === 'group') {
          this.collapseGroup(id);
        }
      }
    });
  }

  // Helper to get all descendant IDs (including self)
  private getDescendantIds(startNodeId: string): string[] {
    const descendants = new Set<string>([startNodeId]);
    const queue = [startNodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      this.registry.forEach((meta, id) => {
        if (meta.nodeData?.parentId === currentId && !descendants.has(id)) {
          descendants.add(id);
          queue.push(id);
        }
      });
    }
    return Array.from(descendants);
  }

  // Expand a node and all its descendants
  public expandNodeAndChildren(nodeId: string) {
    const idsToExpand = this.getDescendantIds(nodeId);
    idsToExpand.forEach(id => {
      const instance = this.registry.get(id);
      if (instance && instance.info.isOpen) {
        instance.info.isOpen.value = true;
      }
    });
  }

  // Collapse a node and all its descendants
  public collapseNodeAndChildren(nodeId: string) {
    const idsToCollapse = this.getDescendantIds(nodeId);
    idsToCollapse.forEach(id => {
      const instance = this.registry.get(id);
      if (instance && instance.info.isOpen) {
        instance.info.isOpen.value = false;
      }
    });
  }

  // Expand all nodes associated with a specific file path
  public expandNodesByFile(filePath: string) {
    this.registry.forEach((meta, id) => {
      if (meta.nodeData?.filePath === filePath) {
        const instance = this.registry.get(id);
        if (instance && instance.info.isOpen) {
          instance.info.isOpen.value = true;
        }
      }
    });
  }

  // Collapse all nodes associated with a specific file path
  public collapseNodesByFile(filePath: string) {
    this.registry.forEach((meta, id) => {
      if (meta.nodeData?.filePath === filePath) {
        const instance = this.registry.get(id);
        if (instance && instance.info.isOpen) {
          instance.info.isOpen.value = false;
        }
      }
    });
  }

  // 获取节点元数据
  public getMetadata(id: string): NodeMetadata | undefined {
    return this.registry.get(id)?.nodeData as NodeMetadata | undefined;
  }
}

export default TreeNodeRegistry.getInstance();
