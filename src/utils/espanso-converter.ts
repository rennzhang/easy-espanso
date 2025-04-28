import { v4 as uuidv4 } from 'uuid';
import { 
  EspansoConfig, 
  EspansoRule, 
  EspansoGroup, 
  GlobalVariable, 
  EspansoOptions,
  Variable,
  FormField
} from '../types/espanzo-config';

/**
 * 将Espanso YAML配置转换为内部数据模型
 * @param yamlObject 解析后的YAML对象
 * @returns 内部数据模型
 */
export function convertToInternalFormat(yamlObject: any): EspansoConfig {
  // 创建根分组
  const rootGroup: EspansoGroup = {
    id: 'root',
    type: 'group',
    name: 'Root',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentId: 'root',
    children: []
  };
  
  // 处理匹配规则
  if (yamlObject.matches && Array.isArray(yamlObject.matches)) {
    for (const match of yamlObject.matches) {
      const rule = convertMatchToRule(match);
      rootGroup.children.push(rule);
    }
  }
  
  // 创建配置对象
  const config: EspansoConfig = {
    root: rootGroup
  };
  
  // 处理全局变量
  if (yamlObject.global_vars && Array.isArray(yamlObject.global_vars)) {
    config.global_vars = yamlObject.global_vars;
  }
  
  // 处理配置选项
  if (yamlObject.backend || yamlObject.toggle_key || yamlObject.show_notifications) {
    const options: EspansoOptions = {};
    
    // 复制所有选项
    for (const key in yamlObject) {
      if (key !== 'matches' && key !== 'global_vars' && key !== 'includes') {
        options[key] = yamlObject[key];
      }
    }
    
    config.options = options;
  }
  
  // 处理包含的文件
  if (yamlObject.includes && Array.isArray(yamlObject.includes)) {
    rootGroup.includes = yamlObject.includes;
  }
  
  return config;
}

/**
 * 将内部数据模型转换为Espanso YAML配置
 * @param config 内部数据模型
 * @returns Espanso YAML配置对象
 */
export function convertToEspansoFormat(config: EspansoConfig): any {
  const result: any = {};
  
  // 处理匹配规则
  const matches: any[] = [];
  
  // 递归处理所有规则
  const processItems = (items: Array<EspansoRule | EspansoGroup>) => {
    for (const item of items) {
      if (item.type === 'rule') {
        matches.push(convertRuleToMatch(item));
      } else if (item.type === 'group' && item.children) {
        processItems(item.children);
      }
    }
  };
  
  if (config.root && config.root.children) {
    processItems(config.root.children);
  }
  
  if (matches.length > 0) {
    result.matches = matches;
  }
  
  // 处理全局变量
  if (config.global_vars && config.global_vars.length > 0) {
    result.global_vars = config.global_vars;
  }
  
  // 处理配置选项
  if (config.options) {
    for (const key in config.options) {
      result[key] = config.options[key];
    }
  }
  
  // 处理包含的文件
  if (config.root.includes && config.root.includes.length > 0) {
    result.includes = config.root.includes;
  }
  
  return result;
}

/**
 * 将Espanso匹配规则转换为内部规则模型
 * @param match Espanso匹配规则
 * @returns 内部规则模型
 */
function convertMatchToRule(match: any): EspansoRule {
  const rule: EspansoRule = {
    id: uuidv4(),
    type: 'rule',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // 处理触发词
  if (match.trigger) {
    rule.trigger = match.trigger;
  } else if (match.triggers && Array.isArray(match.triggers)) {
    rule.triggers = match.triggers;
  }
  
  // 处理替换内容
  if (match.replace !== undefined) {
    rule.replace = match.replace;
    rule.contentType = 'plain';
    rule.content = match.replace;
  } else if (match.markdown !== undefined) {
    rule.markdown = match.markdown;
    rule.contentType = 'markdown';
    rule.content = match.markdown;
  } else if (match.html !== undefined) {
    rule.html = match.html;
    rule.contentType = 'html';
    rule.content = match.html;
  } else if (match.image_path !== undefined) {
    rule.image_path = match.image_path;
    rule.contentType = 'image';
    rule.content = match.image_path;
  }
  
  // 处理表单
  if (match.form && Array.isArray(match.form)) {
    rule.form = match.form;
    rule.contentType = 'form';
    rule.content = match.form;
  }
  
  // 处理变量
  if (match.vars && Array.isArray(match.vars)) {
    rule.vars = match.vars;
  }
  
  // 处理其他属性
  if (match.word !== undefined) rule.word = match.word;
  if (match.left_word !== undefined) rule.left_word = match.left_word;
  if (match.right_word !== undefined) rule.right_word = match.right_word;
  if (match.propagate_case !== undefined) rule.propagate_case = match.propagate_case;
  if (match.uppercase_style !== undefined) rule.uppercase_style = match.uppercase_style;
  if (match.force_mode !== undefined) rule.force_mode = match.force_mode;
  if (match.apps !== undefined) rule.apps = match.apps;
  if (match.exclude_apps !== undefined) rule.exclude_apps = match.exclude_apps;
  if (match.priority !== undefined) rule.priority = match.priority;
  if (match.search_terms !== undefined) rule.search_terms = match.search_terms;
  
  // 添加标签（内部使用）
  if (match.tags && Array.isArray(match.tags)) {
    rule.tags = match.tags;
  }
  
  return rule;
}

/**
 * 将内部规则模型转换为Espanso匹配规则
 * @param rule 内部规则模型
 * @returns Espanso匹配规则
 */
function convertRuleToMatch(rule: EspansoRule): any {
  const match: any = {};
  
  // 处理触发词
  if (rule.trigger) {
    match.trigger = rule.trigger;
  } else if (rule.triggers && rule.triggers.length > 0) {
    match.triggers = rule.triggers;
  }
  
  // 处理替换内容
  if (rule.contentType === 'plain' && rule.replace) {
    match.replace = rule.replace;
  } else if (rule.contentType === 'markdown' && rule.markdown) {
    match.markdown = rule.markdown;
  } else if (rule.contentType === 'html' && rule.html) {
    match.html = rule.html;
  } else if (rule.contentType === 'image' && rule.image_path) {
    match.image_path = rule.image_path;
  } else if (rule.replace) {
    match.replace = rule.replace;
  } else if (rule.content) {
    match.replace = String(rule.content);
  }
  
  // 处理表单
  if (rule.form && rule.form.length > 0) {
    match.form = rule.form;
  }
  
  // 处理变量
  if (rule.vars && rule.vars.length > 0) {
    match.vars = rule.vars;
  }
  
  // 处理其他属性
  if (rule.word !== undefined) match.word = rule.word;
  if (rule.left_word !== undefined) match.left_word = rule.left_word;
  if (rule.right_word !== undefined) match.right_word = rule.right_word;
  if (rule.propagate_case !== undefined) match.propagate_case = rule.propagate_case;
  if (rule.uppercase_style !== undefined) match.uppercase_style = rule.uppercase_style;
  if (rule.force_mode !== undefined) match.force_mode = rule.force_mode;
  if (rule.apps !== undefined) match.apps = rule.apps;
  if (rule.exclude_apps !== undefined) match.exclude_apps = rule.exclude_apps;
  if (rule.priority !== undefined) match.priority = rule.priority;
  if (rule.search_terms !== undefined) match.search_terms = rule.search_terms;
  
  return match;
}

/**
 * 创建一个新的规则
 * @param trigger 触发词
 * @param replace 替换内容
 * @returns 新规则
 */
export function createRule(trigger: string, replace: string): EspansoRule {
  return {
    id: uuidv4(),
    type: 'rule',
    trigger,
    replace,
    contentType: 'plain',
    content: replace,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * 创建一个新的分组
 * @param name 分组名称
 * @param parentId 父分组ID
 * @returns 新分组
 */
export function createGroup(name: string, parentId: string = 'root'): EspansoGroup {
  return {
    id: uuidv4(),
    type: 'group',
    name,
    parentId,
    children: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * 创建一个新的变量
 * @param name 变量名称
 * @param type 变量类型
 * @param params 变量参数
 * @returns 新变量
 */
export function createVariable(name: string, type: string, params: any): Variable {
  return {
    name,
    type: type as any,
    params
  };
}

/**
 * 创建一个新的表单字段
 * @param name 字段名称
 * @param type 字段类型
 * @param label 字段标签
 * @param defaultValue 默认值
 * @param values 可选值（用于列表和选择字段）
 * @returns 新表单字段
 */
export function createFormField(
  name: string,
  type: string,
  label?: string,
  defaultValue?: string,
  values?: string[]
): FormField {
  return {
    name,
    type: type as any,
    label,
    default: defaultValue,
    values
  };
}

/**
 * 添加ID和时间戳到配置中的所有项目
 * @param config 配置
 * @returns 添加了ID和时间戳的配置
 */
export function addIdsAndTimestamps(config: EspansoConfig): EspansoConfig {
  const now = Date.now();
  
  // 递归处理所有项目
  const processItems = (items: Array<EspansoRule | EspansoGroup>) => {
    for (const item of items) {
      // 如果没有ID，添加一个
      if (!item.id) {
        item.id = uuidv4();
      }
      
      // 如果没有时间戳，添加当前时间
      if (!item.createdAt) {
        item.createdAt = now;
      }
      
      if (!item.updatedAt) {
        item.updatedAt = now;
      }
      
      // 如果是分组，递归处理子项目
      if (item.type === 'group' && item.children) {
        processItems(item.children);
      }
    }
  };
  
  if (config.root && config.root.children) {
    processItems(config.root.children);
  }
  
  return config;
}
