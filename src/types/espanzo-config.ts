// 定义所有项目（规则或分组）共享的基础属性
export interface BaseItem {
  id: string; // 唯一的标识符，用于在应用内部识别和管理
  type: 'rule' | 'group'; // 项目类型
  label?: string; // 用户友好的描述或名称
  createdAt: number; // 创建时间戳，用于排序
  updatedAt: number; // 最后修改时间戳，用于排序和优先级判断
  // 内部使用属性，方便UI层展示，不一定直接映射到Espanso配置
  isExpanded?: boolean; // 用于分组折叠状态
  tags?: string[]; // 标签数组，用于分类和过滤
}

// 定义变量类型
export type VariableType = 'date' | 'choice' | 'random' | 'clipboard' | 'echo' | 'script' | 'shell' | 'form' | 'match';

// 定义变量参数
export interface VariableParams {
  // 日期变量参数
  format?: string;
  offset?: number;
  locale?: string;

  // 选择变量参数
  values?: Array<string | { label: string; id: string }>;

  // 随机变量参数
  choices?: string[];

  // Echo变量参数
  echo?: string;

  // 脚本变量参数
  args?: string[];

  // Shell变量参数
  cmd?: string;
  shell?: string;
  trim?: boolean;
  debug?: boolean;

  // 表单变量参数
  fields?: FormField[];

  // Match变量参数
  trigger?: string;
}

// 定义变量
export interface Variable {
  name: string;
  type: VariableType;
  params: VariableParams;
}

// 定义表单字段
export interface FormField {
  name: string;
  type: 'text' | 'multiline' | 'list' | 'choice';
  default?: string;
  label?: string;
  values?: string[];
}

// 定义规则的属性
export interface EspansoRule extends BaseItem {
  type: 'rule';
  // 触发方式，可以是单个触发词或多个触发词
  trigger?: string;
  triggers?: string[];
  // 替换内容，可以是纯文本、Markdown、HTML或图片路径
  replace?: string;
  markdown?: string;
  html?: string;
  image_path?: string;
  // 搜索标签，用于在搜索栏中查找
  search_terms?: string[];
  // 表单定义
  form?: FormField[];
  // 变量定义
  vars?: Variable[];
  // 行为控制
  word?: boolean; // 是否整词匹配
  left_word?: boolean; // 是否左侧整词匹配
  right_word?: boolean; // 是否右侧整词匹配
  propagate_case?: boolean; // 是否传播大小写
  uppercase_style?: 'capitalize_words' | 'uppercase_first'; // 大写样式
  force_mode?: 'clipboard' | 'keys'; // 强制使用的输入模式
  // 应用限制
  apps?: string[]; // 生效的应用列表
  exclude_apps?: string[]; // 排除的应用列表
  // 优先级
  priority?: number; // 规则优先级 (数字越大优先级越高)
  // 内部使用属性，不直接映射到Espanso配置
  contentType?: 'plain' | 'markdown' | 'html' | 'image' | 'form'; // 内部使用的内容类型
  content?: string | any; // 内部使用的内容，统一管理不同类型的内容
}

// 定义分组的属性
export interface EspansoGroup extends BaseItem {
  type: 'group';
  name: string; // 分组名称，用户可读
  matches?: Array<EspansoRule>; // 分组中的规则
  includes?: string[]; // 包含的其他配置文件
  // 内部使用属性，方便UI层展示，不一定直接映射到Espanso配置
  children: Array<EspansoRule | EspansoGroup>; // 嵌套的规则和分组
  parentId: string | 'root'; // 父分组的ID，'root'表示顶层
}

// 定义全局变量
export interface GlobalVariable {
  name: string;
  type: VariableType;
  params: VariableParams;
}

// 定义Espanso配置选项
export interface EspansoOptions {
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
  backend?: 'Auto' | 'Clipboard' | 'Inject';
  paste_shortcut?: string;
  auto_restart?: boolean;
  [key: string]: any; // 其他可能的选项
}

// 定义整个ESPANSO配置的结构
export interface EspansoConfig {
  // 虚拟的根分组，其children包含顶层所有规则和分组
  root: EspansoGroup;
  // 全局变量
  global_vars?: GlobalVariable[];
  // 配置选项
  options?: EspansoOptions;
  // 其他可能的顶层属性
  [key: string]: any;
}

// 定义UI状态
export interface UIState {
  leftMenuCollapsed: boolean;
  selectedItemId: string | null;
  middlePaneFilterTags: string[];
  searchQuery: string;
  activeSection: 'dashboard' | 'rules' | 'settings';
  // ... 其他UI状态
}

// 定义Espanso配置文件类型
export interface EspansoFile {
  path: string;
  content: string;
  type: 'match' | 'config';
  name: string;
}

// 定义导入/导出格式
export interface EspansoExport {
  matches?: EspansoRule[];
  global_vars?: GlobalVariable[];
  options?: EspansoOptions;
  includes?: string[];
}
