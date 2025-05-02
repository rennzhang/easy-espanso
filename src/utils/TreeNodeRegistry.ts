import { Ref } from 'vue';

// 节点元数据接口
interface NodeMetadata {
  id: string;
  parentId?: string | null;
  filePath?: string;
  type: 'match' | 'group' | 'file' | 'folder';
}

// 树节点实例注册表
class TreeNodeRegistry {
  private static instance: TreeNodeRegistry;
  private registry = new Map<string, {
    isOpen: Ref<boolean>;
    metadata?: NodeMetadata;
  }>();

  private constructor() {}

  // 单例模式
  public static getInstance(): TreeNodeRegistry {
    if (!TreeNodeRegistry.instance) {
      TreeNodeRegistry.instance = new TreeNodeRegistry();
    }
    return TreeNodeRegistry.instance;
  }

  // 注册节点
  public register(id: string, instance: { isOpen: Ref<boolean> }, metadata?: NodeMetadata): void {
    this.registry.set(id, {
      isOpen: instance.isOpen,
      metadata: metadata || { id, type: 'group' }
    });
  }

  // 注销节点
  public unregister(id: string): void {
    this.registry.delete(id);
  }

  // 获取节点
  public get(id: string): { isOpen: Ref<boolean>; metadata?: NodeMetadata } | undefined {
    return this.registry.get(id);
  }

  // 获取所有节点
  public getAll(): Map<string, { isOpen: Ref<boolean>; metadata?: NodeMetadata }> {
    return this.registry;
  }

  // 展开所有节点
  public expandAll(): void {
    this.registry.forEach(instance => {
      if (instance && instance.isOpen) {
        instance.isOpen.value = true;
      }
    });
  }

  // 收起所有节点
  public collapseAll(): void {
    this.registry.forEach(instance => {
      if (instance && instance.isOpen) {
        instance.isOpen.value = false;
      }
    });
  }

  // 展开当前分组及其所有子分组
  public expandGroup(groupId: string): void {
    // 先展开当前分组
    const currentGroup = this.registry.get(groupId);
    if (currentGroup && currentGroup.isOpen) {
      currentGroup.isOpen.value = true;
    }

    // 找出所有子分组并展开
    this.registry.forEach((instance, id) => {
      if (instance.metadata?.parentId === groupId) {
        if (instance.isOpen) {
          instance.isOpen.value = true;
        }
        // 递归展开子分组
        if (instance.metadata.type === 'group') {
          this.expandGroup(id);
        }
      }
    });
  }

  // 收起当前分组及其所有子分组
  public collapseGroup(groupId: string): void {
    // 找出所有子分组并收起
    this.registry.forEach((instance, id) => {
      if (instance.metadata?.parentId === groupId) {
        if (instance.isOpen) {
          instance.isOpen.value = false;
        }
        // 递归收起子分组
        if (instance.metadata.type === 'group') {
          this.collapseGroup(id);
        }
      }
    });

    // 最后收起当前分组
    const currentGroup = this.registry.get(groupId);
    if (currentGroup && currentGroup.isOpen) {
      currentGroup.isOpen.value = false;
    }
  }

  // 展开当前标签文件夹下的所有分组
  public expandFile(filePath: string): void {
    this.registry.forEach((instance, id) => {
      if (instance.metadata?.filePath === filePath) {
        if (instance.isOpen) {
          instance.isOpen.value = true;
        }
        // 递归展开子分组
        if (instance.metadata.type === 'group') {
          this.expandGroup(id);
        }
      }
    });
  }

  // 收起当前标签文件夹下的所有分组
  public collapseFile(filePath: string): void {
    this.registry.forEach((instance, id) => {
      if (instance.metadata?.filePath === filePath) {
        if (instance.isOpen) {
          instance.isOpen.value = false;
        }
        // 递归收起子分组
        if (instance.metadata.type === 'group') {
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
        if (meta.metadata?.parentId === currentId && !descendants.has(id)) {
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
      if (instance && instance.isOpen) {
        instance.isOpen.value = true;
      }
    });
  }

  // Collapse a node and all its descendants
  public collapseNodeAndChildren(nodeId: string) {
    const idsToCollapse = this.getDescendantIds(nodeId);
    idsToCollapse.forEach(id => {
      const instance = this.registry.get(id);
      if (instance && instance.isOpen) {
        instance.isOpen.value = false;
      }
    });
  }

  // Expand all nodes associated with a specific file path
  public expandNodesByFile(filePath: string) {
    this.registry.forEach((meta, id) => {
      if (meta.metadata?.filePath === filePath) {
        const instance = this.registry.get(id);
        if (instance && instance.isOpen) {
          instance.isOpen.value = true;
        }
      }
    });
  }

  // Collapse all nodes associated with a specific file path
  public collapseNodesByFile(filePath: string) {
    this.registry.forEach((meta, id) => {
      if (meta.metadata?.filePath === filePath) {
        const instance = this.registry.get(id);
        if (instance && instance.isOpen) {
          instance.isOpen.value = false;
        }
      }
    });
  }

  // 获取节点元数据
  public getMetadata(id: string): NodeMetadata | undefined {
    return this.registry.get(id)?.metadata;
  }
}

export default TreeNodeRegistry.getInstance();
