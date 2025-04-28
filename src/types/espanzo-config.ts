// 定义所有项目（规则或分组）共享的基础属性
export interface BaseItem {
  id: string; // 唯一的标识符，用于在应用内部识别和管理
  type: 'rule' | 'group'; // 项目类型
  label?: string; // 用户友好的描述或名称
  createdAt: number; // 创建时间戳，用于排序
  updatedAt: number; // 最后修改时间戳，用于排序和优先级判断
  // 内部使用属性，方便UI层展示，不一定直接映射到Espanso配置
  isExpanded?: boolean; // 用于分组折叠状态
}

// 定义规则的属性
export interface EspansoRule extends BaseItem {
  type: 'rule';
  trigger: string; // 触发词，如 ":date"
  // 在应用内部，我们将Espanso的'replace'字段拆解为contentType和content
  contentType: 'plain' | 'rich' | 'html' | 'script' | 'image' | 'form' | 'clipboard' | 'shell' | 'key'; // Espanso支持的内容类型
  content: string | any; // 实际内容，根据contentType可以是字符串、脚本代码、base64图片等，form等复杂类型可能需要更详细的结构
  caseSensitive?: boolean; // 是否区分大小写
  word?: boolean; // 是否整词匹配
  apps?: string[]; // 生效的应用列表，空数组或undefined表示所有应用
  priority?: number; // 规则优先级 (数字越大优先级越高)
  hotkey?: string; // 快捷键触发 (如果Espanso支持)
  tags?: string[]; // 标签数组
  // Espanso还支持其他一些高级属性，如vars, form, key, shell等，需要根据文档补充到content或独立字段中
  // 例如，如果contentType是'form'，content可能是一个表示表单结构的JSON对象
}

// 定义分组的属性
export interface EspansoGroup extends BaseItem {
  type: 'group';
  name: string; // 分组名称，用户可读
  prefix?: string; // 分组公共前缀，应用于组内所有规则 (如果Espanso支持组级前缀)
  children: Array<EspansoRule | EspansoGroup>; // 嵌套的规则和分组
  // 内部使用属性，方便UI层展示，不一定直接映射到Espanso配置
  parentId: string | 'root'; // 父分组的ID，'root'表示顶层
}

// 定义整个ESPANSO配置的结构
export interface EspansoConfig {
  // Espanso配置的顶层结构可能是一个包含rules和includes的数组
  // 在我们的应用内部，我们将其映射为一个虚拟的根分组，方便树状结构管理
  root: EspansoGroup; // 虚拟的根分组，其children包含顶层所有规则和分组
  // 其他全局设置，如backend, listen_clipboard等，如果需要管理，也可以添加到这里
  globalSettings?: {
      backend?: string;
      listen_clipboard?: boolean;
      // ... other global settings
  };
}

// 定义UI状态
export interface UIState {
  leftMenuCollapsed: boolean;
  selectedItemId: string | null;
  middlePaneFilterTags: string[];
  // ... 其他UI状态
}
