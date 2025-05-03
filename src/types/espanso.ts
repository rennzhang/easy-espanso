export interface Match {
  id: string;
  type: 'match';
  // Either trigger (single) or triggers (multiple) should be used, not both.
  trigger?: string; // Optional single trigger
  triggers?: string[]; // Optional array of triggers
  replace: string;
  description?: string;
  label?: string; // Often used as description in Espanso GUI contexts
  word?: boolean;
  left_word?: boolean; // Added for consistency
  right_word?: boolean; // Added for consistency
  propagate_case?: boolean;
  uppercase_style?: 'capitalize_words' | 'uppercase_first';
  force_mode?: 'default' | 'clipboard' | 'keys'; // Added default
  apps?: string[];
  exclude_apps?: string[];
  vars?: any[]; // Consider defining a Var type if structure is known
  search_terms?: string[]; // Added based on RuleEditForm
  priority?: number; // Espanso's conflict priority
  hotkey?: string; // Added based on RuleEditForm
  image_path?: string; // Added based on RuleEditForm
  markdown?: string; // Added based on RuleEditForm
  html?: string; // Added based on RuleEditForm
  content?: string; // Added based on RuleEditForm (generic)
  contentType?: string; // Added based on RuleEditForm (internal UI state)
  filePath?: string; // Added path tracking
  updatedAt?: string; // Added timestamp
  guiOrder?: number; // Added for UI display sorting only
}

export interface Group {
  id: string;
  type: 'group';
  name: string;
  label?: string; // Added label for consistency
  prefix?: string; // Added prefix for consistency
  matches?: Match[];
  groups?: Group[];
  filePath?: string; // Added path tracking
  updatedAt?: string; // Added timestamp
  guiOrder?: number; // Added for UI display sorting only
  // Allow other Espanso-specific fields
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