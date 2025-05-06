export default {
  "greeting": "你好！",
  "common": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "create": "创建",
    "search": "搜索",
    "loading": "加载中...",
    "error": "错误",
    "success": "成功",
    "pageNotFound": "页面不存在",
    "confirm": "确认",
    "rename": "重命名",
    "warning": "警告",
    "information": "信息",
    "select": "选择",
    "close": "关闭",
    "add": "添加",
    "remove": "移除",
    "yes": "是",
    "no": "否",
    "modified": "内容已修改",
    "details": "详情"
  },
  "sidebar": {
    "snippets": "片段管理",
    "settings": "设置"
  },
  "snippets": {
    "listTitle": "片段列表",
    "searchPlaceholder": "搜索片段...",
    "noSnippets": "未找到片段。",
    "createSnippet": "创建片段",
    "editSnippet": "编辑片段",
    "trigger": "触发词",
    "label": "标签",
    "content": "内容",
    "preview": "预览",
    "previewTitle": "预览 \"{trigger}\"",
    "imagePreview": "图片预览",
    "imagePreviewError": "图片预览加载失败，请检查路径是否正确。",
    "noSelection": "未选择项目",
    "selectFromList": "请从左侧列表选择一个规则或分组进行编辑",
    "noTrigger": "[无触发词]",
    "confirmDelete": "确定要删除这个规则吗？此操作无法撤销。",
    "contentTypes": {
      "plain": "纯文本",
      "markdown": "Markdown",
      "html": "HTML",
      "image": "图片",
      "form": "表单"
    },
    "uppercaseStyles": {
      "uppercase": "全部大写",
      "capitalize": "首字母大写",
      "capitalizeWords": "每个单词首字母大写"
    },
    "insertionModes": {
      "auto": "自动",
      "clipboard": "剪贴板",
      "keys": "模拟按键"
    },
    "form": {
      "trigger": {
        "label": "触发词",
        "placeholder": "例如: :hello, :你好\n:hi",
        "help": "输入规则的触发词，多个请用英文逗号或换行分隔"
      },
      "label": {
        "label": "名称",
        "placeholder": "输入规则名称...",
        "help": "为规则添加简短描述，方便识别和管理"
      },
      "content": {
        "label": "替换内容",
        "help": "触发词最终替换的内容",
        "placeholder": {
          "plain": "输入替换内容...",
          "form": "输入表单定义 (YAML 格式)..."
        }
      },
      "wordBoundary": {
        "title": "词边界设置",
        "help": "控制触发词在什么情况下被识别，例如是否需要在单词边界处",
        "word": "仅在词边界触发 (word)",
        "leftWord": "左侧词边界 (left_word)",
        "rightWord": "右侧词边界 (right_word)"
      },
      "caseHandling": {
        "title": "大小写处理",
        "help": "控制替换内容的大小写处理方式",
        "propagateCase": "传播大小写 (propagate_case)",
        "uppercaseStyle": {
          "label": "大写样式 (uppercase_style)",
          "placeholder": "选择样式..."
        }
      },
      "otherSettings": {
        "title": "其他设置",
        "priority": {
          "label": "优先级 (priority)",
          "help": "当多个片段可能匹配时，优先级高的会被优先使用",
          "placeholder": "0"
        },
        "hotkey": {
          "label": "快捷键 (hotkey)",
          "help": "设置快捷键来触发此片段，例如 alt+h",
          "placeholder": "例如: alt+h"
        }
      },
      "searchSettings": {
        "title": "搜索设置",
        "help": "添加额外的关键词，用于在搜索时匹配此片段",
        "searchTerms": {
          "label": "额外搜索词 (search_terms)",
          "placeholder": "添加搜索词，回车确认"
        }
      },
      "advancedDialog": {
        "title": "高级设置",
        "description": "配置片段的高级选项和行为"
      },
      "imageUpload": {
        "currentImage": "当前图片:",
        "path": "路径:",
        "removeImage": "移除图片",
        "dragHere": "拖拽图片到此处",
        "or": "或",
        "selectFile": "点击选择文件",
        "supportedFormats": "(支持 JPG, PNG, GIF, WEBP 等)",
        "invalidFile": "请拖拽有效的图片文件!"
      },
      "replacementMode": {
        "title": "替换模式",
        "help": "控制内容如何替换触发词，通过剪贴板或模拟按键"
      },
      "insertButton": {
        "title": "插入",
        "clipboard": "插入剪贴板",
        "cursor": "插入光标",
        "date": "插入日期",
        "moreVariables": "更多变量",
        "inDevelopment": "(开发中)"
      },
      "variables": {
        "clipboard": "剪贴板内容",
        "cursor": "光标位置",
        "date": "当前日期",
        "time": "当前时间",
        "random": "随机数",
        "shell": "Shell 命令结果",
        "form": "表单输入"
      },
      "advancedButton": {
        "title": "高级设置"
      },
      "autoSave": {
        "success": "自动保存成功！",
        "error": "自动保存失败: {error}",
        "unsavedChanges": "您有未保存的修改，确定要放弃这些修改吗？"
      },
      "preview": {
        "imageLoadError": "图片预览加载失败，请检查路径是否正确",
        "clipboardContent": "[剪贴板内容]",
        "shellResult": "[Shell 命令结果]",
        "formInput": "[表单输入]",
        "randomNumber": "[随机数]"
      }
    }
  },
  "settings": {
    "title": "全局设置",
    "saveSettings": "保存设置",
    "savingSettings": "保存中...",
    "loadingConfig": "加载配置中...",
    "retryLoad": "重试加载",
    "loadError": "加载配置失败: {error}",
    "settingsSaved": "设置已保存",
    "settingsSaveFailed": "保存设置失败: {error}",
    "restoredToLastSave": "已恢复到上次保存的设置",
    "language": "界面语言",
    "languageTooltip": "选择应用程序的显示语言。",
    "selectLanguagePlaceholder": "选择语言",
    "sections": {
      "basic": "基本设置",
      "paste": "粘贴行为",
      "notification": "通知设置",
      "advanced": "高级设置",
      "logging": "日志设置",
      "mac": "macOS设置",
      "windows": "Windows设置",
      "linux": "Linux设置"
    },
    "basicSettings": {
      "toggleKey": "开关热键",
      "toggleKeyTooltip": "用于开启或关闭 Espanso 功能的快捷键。设置为OFF将禁用此功能。",
      "searchShortcut": "搜索快捷键",
      "searchShortcutTooltip": "打开 Espanso 搜索窗口的快捷键，例如ALT+SPACE。留空表示不使用快捷键。",
      "backendType": "后端类型",
      "backendTypeTooltip": "Espanso 使用的文本插入方法。自动将根据操作系统自动选择最佳方式，注入直接模拟键盘输入，剪贴板使用剪贴板进行文本替换。",
      "autoRestart": "自动重启",
      "autoRestartTooltip": "配置变更时自动重启 Espanso 服务。",
      "autoRestartHint": "配置修改后自动重启服务"
    },
    "pasteSettings": {
      "preferClipboard": "优先使用剪贴板",
      "preferClipboardTooltip": "优先使用剪贴板方式插入文本，适用于某些键盘输入方式不兼容的应用程序。",
      "clipboardThreshold": "剪贴板阈值",
      "clipboardThresholdTooltip": "当替换文本长度超过此值时，自动使用剪贴板方式而非键盘输入。单位为字符数。",
      "pasteShortcut": "粘贴快捷键",
      "pasteShortcutTooltip": "自定义用于粘贴的快捷键，例如CTRL+V。如留空，将使用系统默认粘贴快捷键。",
      "fastInject": "快速注入",
      "fastInjectTooltip": "使用更快的文本输入方式，在某些应用中可能提高速度，但可能降低兼容性。",
      "prePasteDelay": "粘贴前延迟 (ms)",
      "prePasteDelayTooltip": "执行粘贴操作前的等待时间，单位为毫秒。增加此值可提高在慢速应用中的兼容性。",
      "postPasteDelay": "粘贴后延迟 (ms)",
      "postPasteDelayTooltip": "执行粘贴操作后的等待时间，单位为毫秒。增加此值可避免在某些应用中出现文本截断的问题。"
    },
    "languageNames": {
      "zhCN": "简体中文",
      "en": "English"
    },
    "notificationSettings": {
      "enableNotifications": "启用通知",
      "enableNotificationsTooltip": "显示 Espanso 操作的系统通知，帮助了解扩展何时被触发。",
      "showIcon": "显示图标",
      "showIconTooltip": "在系统托盘中显示 Espanso 图标，方便查看程序状态和访问快捷菜单。",
      "notificationIcon": "通知图标路径",
      "notificationIconTooltip": "自定义通知图标的文件路径。留空将使用默认图标。支持 PNG、ICO 等格式。",
      "notificationSound": "通知声音路径",
      "notificationSoundTooltip": "触发扩展时播放的声音文件路径。留空表示不播放声音。支持 WAV、MP3 等格式。"
    },
    "selectOptions": {
      "disabled": "禁用",
      "auto": "自动",
      "inject": "注入",
      "clipboard": "剪贴板",
      "keyboard": "键盘"
    }
  },
  "contextMenu": {
    "newSnippet": "新建片段",
    "newConfigFile": "新建配置文件",
    "paste": "粘贴",
    "copyPath": "复制路径",
    "expandAll": "展开全部",
    "collapseAll": "收起全部",
    "browseOfficialPackages": "浏览官方包库",
    "renameFile": "重命名文件",
    "deleteFile": "删除文件",
    "renameFolder": "重命名文件夹",
    "uninstallPackage": "卸载此包",
    "deleteFolder": "删除文件夹",
    "copySnippet": "复制片段",
    "cutSnippet": "剪切片段",
    "deleteSnippet": "删除片段"
  },
  "components": {
    "tagInput": {
      "add": "添加",
      "remove": "移除",
      "screenReaderRemove": "移除标签"
    }
  }
} 