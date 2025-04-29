export interface Match {
  id: string;
  type: 'match';
  trigger: string;
  replace: string;
  description?: string;
  word?: boolean;
  propagate_case?: boolean;
  uppercase_style?: 'capitalize_words' | 'uppercase_first';
  force_mode?: 'clipboard' | 'keys';
  apps?: string[];
  exclude_apps?: string[];
  vars?: any[];
  [key: string]: any;
}

export interface Group {
  id: string;
  type: 'group';
  name: string;
  description?: string;
  matches?: Match[];
  groups?: Group[];
  [key: string]: any;
}

export interface EspansoConfig {
  matches: Match[];
  groups: Group[];
  keyboard_layout?: string;
  toggle_key?: string;
  enable_passive?: boolean;
  passive_key?: string;
  passive_timeout?: number;
  show_notifications?: boolean;
  show_icon?: boolean;
  word_separators?: string[];
  backend?: string;
  auto_restart?: boolean;
  [key: string]: any;
} 