/**
 * UI相关类型定义
 */
import type { Match } from './espanso.types';
import type { YamlData } from './preload.types';

/**
 * 配置树节点基础接口
 */
export interface ConfigTreeNode {
  id: string; // 唯一标识（可能是文件路径、文件夹路径或生成的ID）
  name: string; // 显示名称（文件名、文件夹名）
  type: 'file' | 'folder';
  path: string; // 文件或文件夹的完整路径
  children?: ConfigTreeNode[]; // 对于文件夹
  parentPath?: string | null; // 父文件夹的路径
  fileType?: 'config' | 'match' | 'package'; // 文件节点的具体类型
  matches?: Match[]; // 文件节点中的匹配项
  content?: YamlData | null; // 文件的原始解析YAML内容
  extension?: string; // 文件扩展名
  // UI特定状态可以添加在这里或单独管理
  isOpen?: boolean;
}

/**
 * 配置文件节点，继承自ConfigTreeNode
 */
export interface ConfigFileNode extends ConfigTreeNode {
  type: 'file';
  extension: string;
  matches?: Match[];
  content?: YamlData | null;
  fileType: 'config' | 'match' | 'package';
  children?: undefined; // 文件在此上下文中没有子节点
}

/**
 * 配置文件夹节点，继承自ConfigTreeNode
 */
export interface ConfigFolderNode extends ConfigTreeNode {
  type: 'folder';
  children: ConfigTreeNode[];
  matches?: undefined;
  groups?: undefined;
  content?: undefined;
  extension?: undefined;
  fileType?: undefined;
}

/**
 * 树形视图项
 * 用于在树形视图组件中渲染的数据结构
 */
export interface TreeNodeItem {
  id: string;
  label: string;
  type: 'folder' | 'file' | 'match';
  path?: string; // 文件路径或文件夹路径
  children?: TreeNodeItem[];
  icon?: string; // 可选的图标名称/组件
  // 添加上下文菜单或树形视图需要的其他属性
}