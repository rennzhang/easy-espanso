import type { ContentType } from '@/types/core/espanso.types';

// 定义表单状态接口 - 基于 Match 的字段
export interface RuleFormState {
  trigger: string;
  triggers?: string[];
  label?: string;
  description?: string;
  content?: string;
  markdown?: string;
  html?: string;
  image_path?: string;
  word?: boolean;
  leftWord?: boolean;
  rightWord?: boolean;
  propagateCase?: boolean;
  uppercaseStyle?: "" | "uppercase" | "capitalize" | "capitalize_words";
  forceMode?: "default" | "clipboard" | "keys" | "";
  apps?: string[];
  exclude_apps?: string[];
  search_terms?: string[];
  priority?: number;
  hotkey?: string;
  vars?: { name: string; params?: Record<string, any> }[];
  contentType?: ContentType;
}
