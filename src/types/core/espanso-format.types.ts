/**
 * Espanso文件格式相关的类型定义
 */

/**
 * Espanso配置文件信息
 */
export interface EspansoFile {
  path: string; // 文件的完整路径
  name: string; // 文件名
  content?: string; // 文件内容（可选）
  type?: 'match' | 'config' | 'package'; // 文件类型（可选）
}

/**
 * Espanso匹配项YAML结构
 */
export interface EspansoMatchYaml {
  trigger?: string;
  triggers?: string[];
  replace?: string;
  label?: string;
  description?: string;
  propagate_case?: boolean;
  uppercase_style?: string;
  word?: boolean;
  left_word?: boolean;
  right_word?: boolean;
  case_sensitive?: boolean;
  priority?: number;
  force_mode?: string;
  force_clipboard?: boolean;
  apps?: string[];
  vars?: Record<string, any>[];
  html?: string;
  image_path?: string;
  hotkey?: string;
  markdown?: string;
  [key: string]: any; // 其他可能的属性
}


/**
 * Espanso配置YAML文件结构
 */
export interface EspansoConfigYaml {
  matches?: EspansoMatchYaml[];
  [key: string]: any; // 其他可能的属性
}

/**
 * Espanso全局配置结构
 */
export interface GlobalConfig {
  // 基本配置
  toggle_key?: string;
  search_shortcut?: string | null;
  backend?: 'Auto' | 'Inject' | 'Clipboard' | 'X11' | 'Wayland';
  auto_restart?: boolean;
  
  // 通知配置
  enable_notifications?: boolean;
  show_icon?: boolean;
  notification_icon?: string;
  notification_sound?: string;
  
  // 粘贴行为
  prefer_clipboard?: boolean;
  clipboard_threshold?: number;
  paste_shortcut?: string | null;
  fast_inject?: boolean;
  pre_paste_delay?: number;
  post_paste_delay?: number;
  prevent_inject_flag_key?: string | null;
  
  // X11特定
  x11_use_xdotool_backend?: boolean;
  x11_use_xsel_backend?: boolean;
  x11_force_wait_for_unlock?: boolean;
  x11_wait_for_unlock_timeout?: number;
  x11_key_delay?: number;
  x11_use_evdev_backend?: boolean;
  
  // Wayland特定
  wayland_use_ydotool_backend?: boolean;
  wayland_use_wtype_backend?: boolean;
  wayland_paste_method?: 'wtype' | 'wl_copy_paste' | 'clipboard';
  wayland_force_wait_for_unlock?: boolean;
  wayland_wait_for_unlock_timeout?: number;
  
  // Windows特定
  win_use_legacy_inject?: boolean;
  win_use_send_input_backend?: boolean;
  
  // Mac特定
  mac_use_applescript_backend?: boolean;
  mac_use_events_backend?: boolean;
  mac_experimental_accessibility?: boolean;
  
  // 其他
  inject_delay?: number;
  abort_key?: string | null;
  config_path?: string;
  packages_path?: string;
  filter_class?: string;
  filter_title?: string;
  filter_exec_path?: string;
  backend_keyboard_layout?: string;
  layout_file?: string;
  
  // 日志
  verbose?: boolean;
  log_file?: string | null;
  log_level?: 'debug' | 'info' | 'warn' | 'error';
  log_filter?: string | null;
  
  // 允许其他未知属性
  [key: string]: any;
} 