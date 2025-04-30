import { v4 as uuidv4 } from 'uuid';
import { EspansoConfig, EspansoRule, EspansoGroup, BaseItem } from '../types/espanso-config';

// 生成唯一ID
export function generateId(): string {
  return uuidv4();
}

// 解析YAML字符串
export function parseYaml(yamlString: string): any {
  // 这里将在后续任务中实现
  // 目前返回一个简单的示例对象
  return {
    matches: [
      {
        trigger: ":hello",
        replace: "Hello, World!"
      }
    ]
  };
}

// 序列化为YAML字符串
export function serializeYaml(jsObject: any): string {
  // 这里将在后续任务中实现
  // 目前返回一个简单的示例YAML字符串
  return `matches:
  - trigger: ":hello"
    replace: "Hello, World!"`;
}

// 将Espanso格式转换为内部格式
export function convertToInternalFormat(espansoData: any): EspansoConfig {
  // 这里将在后续任务中实现
  // 目前返回一个简单的示例配置
  const rootGroup: EspansoGroup = {
    id: 'root',
    type: 'group',
    name: 'Root',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentId: 'root',
    children: []
  };

  // 如果有matches，转换为规则
  if (espansoData.matches && Array.isArray(espansoData.matches)) {
    for (const match of espansoData.matches) {
      const rule: EspansoRule = {
        id: generateId(),
        type: 'rule',
        trigger: match.trigger,
        contentType: 'plain',
        content: match.replace,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      rootGroup.children.push(rule);
    }
  }

  return {
    root: rootGroup
  };
}

// 将内部格式转换为Espanso格式
export function convertToEspansoFormat(internalConfig: EspansoConfig): any {
  // 这里将在后续任务中实现
  // 目前返回一个简单的示例对象
  const matches: any[] = [];

  // 递归处理所有规则
  const processItems = (items: Array<EspansoRule | EspansoGroup>) => {
    for (const item of items) {
      if (item.type === 'rule') {
        matches.push({
          trigger: item.trigger,
          replace: item.content
        });
      } else if (item.type === 'group' && item.children) {
        processItems(item.children);
      }
    }
  };

  if (internalConfig.root && internalConfig.root.children) {
    processItems(internalConfig.root.children);
  }

  return {
    matches
  };
}

// 添加ID和时间戳
export function addIdsAndTimestamps(config: EspansoConfig): EspansoConfig {
  // 这里将在后续任务中实现
  // 目前简单返回输入的配置
  return config;
}

// 遍历树结构
export function walkTree(
  root: EspansoGroup,
  callback: (item: EspansoRule | EspansoGroup) => boolean
): void {
  // 如果回调返回true，则停止遍历
  if (callback(root)) {
    return;
  }

  // 遍历子项
  for (const child of root.children) {
    if (callback(child)) {
      return;
    }

    if (child.type === 'group') {
      walkTree(child, callback);
    }
  }
}

// 根据ID查找项目
export function findItemById(
  root: EspansoGroup,
  id: string
): EspansoRule | EspansoGroup | null {
  let result: EspansoRule | EspansoGroup | null = null;

  walkTree(root, (item) => {
    if (item.id === id) {
      result = item;
      return true; // 停止遍历
    }
    return false; // 继续遍历
  });

  return result;
}

// 移除项目
export function removeItemById(
  root: EspansoGroup,
  id: string
): boolean {
  // 遍历所有分组
  for (const group of [root, ...getAllGroups(root)]) {
    const index = group.children.findIndex(item => item.id === id);
    if (index !== -1) {
      group.children.splice(index, 1);
      return true;
    }
  }

  return false;
}

// 在指定索引处插入项目
export function insertItemAtIndex(
  group: EspansoGroup,
  item: EspansoRule | EspansoGroup,
  index: number
): void {
  group.children.splice(index, 0, item);
}

// 获取所有分组
function getAllGroups(root: EspansoGroup): EspansoGroup[] {
  const groups: EspansoGroup[] = [];

  walkTree(root, (item) => {
    if (item.type === 'group' && item.id !== root.id) {
      groups.push(item);
    }
    return false; // 继续遍历
  });

  return groups;
}

// 获取可用的变量列表
export function getAvailableVariables(): string[] {
  return [
    'date',
    'clipboard',
    'time',
    'os',
    'hostname',
    'username',
    'email',
    'path',
    'selection',
    'form',
    'key',
    'shell'
  ];
}

// 生成规则预览
export function generatePreview(rule: EspansoRule): string {
  if (!rule.content) {
    return '无内容可预览';
  }

  let preview = rule.content;

  // 处理变量
  const variableRegex = /\{\{([^}]+)\}\}/g;
  preview = preview.replace(variableRegex, (match, variableName) => {
    // 根据变量类型生成预览
    if (variableName === 'date') {
      return new Date().toLocaleDateString();
    } else if (variableName === 'time') {
      return new Date().toLocaleTimeString();
    } else if (variableName.startsWith('date:')) {
      return new Date().toLocaleString();
    } else if (variableName === 'clipboard') {
      return '[剪贴板内容]';
    } else if (variableName.startsWith('random')) {
      return Math.floor(Math.random() * 100).toString();
    } else if (variableName.startsWith('shell:')) {
      return '[Shell 命令结果]';
    } else if (variableName.startsWith('form:')) {
      return '[表单输入]';
    } else {
      return `[变量: ${variableName}]`;
    }
  });

  return `预览 "${rule.trigger}":\n---\n${preview}\n--- (注意: 预览是模拟效果)`;
}
