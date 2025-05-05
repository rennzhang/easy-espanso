// src/types/core/espanso.types.ts

/**
 * Espanso核心类型定义
 */

/**
 * 基础项目接口
 * Match和Group的共有属性
 */
export interface BaseItem {
  id: string;
  type: 'match' | 'group';
  filePath?: string;
  createdAt?: string;
  updatedAt?: string;
  guiOrder?: number;
}

/**
 * 匹配项接口
 */
export interface Match extends BaseItem {
  type: 'match';
  trigger?: string;
  triggers?: string[];
  replace?: string;
  label?: string;
  description?: string;
  propagate_case?: boolean;
  uppercase_style?:"" | "uppercase" | "capitalize" | "capitalize_words";
  word?: boolean;
  left_word?: boolean;
  right_word?: boolean;
  case_sensitive?: boolean;
  priority?: number;
  forceMode?: "default" | "clipboard" | "keys" | "";
  force_clipboard?: boolean;
  content?: string; // 内部字段，用于存储实际内容
  contentType?: 'plain'  | 'html' | 'image'  | 'form' | 'markdown'; // 内部字段，用于区分内容类型
  apps?: string[];
  vars?: { name: string; params?: Record<string, any> }[];
  tags?: string[]; // 用于UI分类的内部字段
  [key: string]: any; // 允许其他未知属性
}

/**
 * 分组接口
 */
export interface Group extends BaseItem {
  type: 'group';
  name?: string;
  prefix?: string;
  label?: string;
  matches?: Match[];
  groups?: Group[];
  tags?: string[]; // 用于UI分类的内部字段
  [key: string]: any; // 允许其他未知属性
}

/**
 * Espanso内部配置结构
 */
export interface EspansoConfig {
  matches: Match[];
  groups: Group[];
}

/**
 * UI状态
 */
export interface UIState {
  selectedItemId: string | null;
  selectedItemType: 'match' | 'group' | null;
  leftMenuCollapsed: boolean;
  middlePaneFilterTags: string[];
  expandedNodeIds: string[];
}

/**
 * 应用设置
 */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoSave: boolean;
} 