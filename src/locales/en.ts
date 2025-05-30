export default {
  "greeting": "Hello!",
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "confirm": "Confirm",
    "rename": "Rename",
    "warning": "Warning",
    "information": "Information",
    "select": "Select",
    "close": "Close",
    "add": "Add",
    "remove": "Remove",
    "yes": "Yes",
    "no": "No",
    "modified": "Content Modified",
    "details": "Details"
  },
  "sidebar": {
    "snippets": "Snippets",
    "settings": "Settings"
  },
  "snippets": {
    "listTitle": "Snippets List",
    "searchPlaceholder": "Search snippets...",
    "noSnippets": "No snippets found.",
    "createSnippet": "Create Snippet",
    "editSnippet": "Edit Snippet",
    "trigger": "Trigger",
    "label": "Label",
    "content": "Content",
    "preview": "Preview",
    "previewTitle": "Preview \"{trigger}\"",
    "imagePreview": "Image Preview",
    "imagePreviewError": "Failed to load image preview. Please check the path.",
    "noSelection": "No Item Selected",
    "selectFromList": "Please select a rule or group from the list on the left to edit",
    "noTrigger": "[No Trigger]",
    "confirmDelete": "Are you sure you want to delete this rule? This action cannot be undone.",
    "contentTypes": {
      "plain": "Plain Text",
      "markdown": "Markdown",
      "html": "HTML",
      "image": "Image",
      "form": "Form"
    },
    "uppercaseStyles": {
      "uppercase": "UPPERCASE",
      "capitalize": "Capitalize First",
      "capitalizeWords": "Capitalize Each Word"
    },
    "insertionModes": {
      "auto": "Auto",
      "clipboard": "Clipboard",
      "keys": "Simulate Keys"
    },
    "form": {
      "trigger": {
        "label": "Trigger",
        "placeholder": "Example: :hello, :hi\n:hey",
        "help": "Enter trigger words, separate multiple triggers with commas or newlines"
      },
      "label": {
        "label": "Name",
        "placeholder": "Enter rule name...",
        "help": "Add a short description for easy identification and management"
      },
      "content": {
        "label": "Replacement Content",
        "help": "The content that will replace the trigger",
        "placeholder": {
          "plain": "Enter replacement content...",
          "form": "Enter form definition (YAML format)..."
        }
      },
      "wordBoundary": {
        "title": "Word Boundary Settings",
        "help": "Control when triggers are recognized, e.g., whether they need to be at word boundaries",
        "word": "Trigger at word boundaries only (word)",
        "leftWord": "Left word boundary (left_word)",
        "rightWord": "Right word boundary (right_word)"
      },
      "caseHandling": {
        "title": "Case Handling",
        "help": "Control how the replacement content handles letter case",
        "propagateCase": "Propagate case (propagate_case)",
        "uppercaseStyle": {
          "label": "Uppercase style (uppercase_style)",
          "placeholder": "Select style..."
        }
      },
      "otherSettings": {
        "title": "Other Settings",
        "priority": {
          "label": "Priority (priority)",
          "help": "When multiple snippets could match, higher priority ones are used first",
          "placeholder": "0"
        },
        "hotkey": {
          "label": "Hotkey (hotkey)",
          "help": "Set a hotkey to trigger this snippet, e.g., alt+h",
          "placeholder": "Example: alt+h"
        }
      },
      "searchSettings": {
        "title": "Search Settings",
        "help": "Add additional keywords to help find this snippet when searching",
        "searchTerms": {
          "label": "Additional search terms (search_terms)",
          "placeholder": "Add search terms, press Enter to confirm"
        }
      },
      "advancedDialog": {
        "title": "Advanced Settings",
        "description": "Configure advanced options and behavior for this snippet"
      },
      "imageUpload": {
        "currentImage": "Current Image:",
        "path": "Path:",
        "removeImage": "Remove Image",
        "dragHere": "Drag image here",
        "or": "or",
        "selectFile": "Click to select file",
        "supportedFormats": "(Supports JPG, PNG, GIF, WEBP etc.)",
        "invalidFile": "Please drag a valid image file!"
      },
      "replacementMode": {
        "title": "Replacement Mode",
        "help": "Control how content replaces triggers, via clipboard or key simulation"
      },
      "insertButton": {
        "title": "Insert",
        "clipboard": "Insert Clipboard",
        "cursor": "Insert Cursor",
        "date": "Insert Date",
        "moreVariables": "More Variables",
        "inDevelopment": "(In Development)"
      },
      "variables": {
        "clipboard": "Clipboard Content",
        "cursor": "Cursor Position",
        "date": "Current Date",
        "time": "Current Time",
        "random": "Random Number",
        "shell": "Shell Command Result",
        "form": "Form Input"
      },
      "advancedButton": {
        "title": "Advanced Settings"
      },
      "autoSave": {
        "success": "Auto-save successful!",
        "error": "Auto-save failed: {error}",
        "unsavedChanges": "You have unsaved changes. Are you sure you want to discard them?"
      },
      "preview": {
        "imageLoadError": "Failed to load image preview. Please check the path.",
        "clipboardContent": "[Clipboard Content]",
        "shellResult": "[Shell Command Result]",
        "formInput": "[Form Input]",
        "randomNumber": "[Random Number]"
      }
    }
  },
  "settings": {
    "title": "Global Settings",
    "saveSettings": "Save Settings",
    "savingSettings": "Saving...",
    "loadingConfig": "Loading Configuration...",
    "retryLoad": "Retry Loading",
    "loadError": "Failed to load config: {error}",
    "settingsSaved": "Settings saved",
    "settingsSaveFailed": "Failed to save settings: {error}",
    "restoredToLastSave": "Restored to last saved settings",
    "language": "Language",
    "languageTooltip": "Select the display language for the application.",
    "selectLanguagePlaceholder": "Select Language",
    "sections": {
      "basic": "Basic Settings",
      "paste": "Paste Behavior",
      "notification": "Notification Settings",
      "advanced": "Advanced Settings",
      "logging": "Logging Settings",
      "mac": "macOS Settings",
      "windows": "Windows Settings",
      "linux": "Linux Settings"
    },
    "basicSettings": {
      "toggleKey": "Toggle Key",
      "toggleKeyTooltip": "Hotkey to enable or disable Espanso functionality. Set to OFF to disable.",
      "searchShortcut": "Search Shortcut",
      "searchShortcutTooltip": "Shortcut to open Espanso search window, e.g., ALT+SPACE. Leave empty to disable.",
      "backendType": "Backend Type",
      "backendTypeTooltip": "Text insertion method used by Espanso. Auto selects the best method based on OS, Inject simulates keyboard input, Clipboard uses clipboard for text replacement.",
      "autoRestart": "Auto Restart",
      "autoRestartTooltip": "Automatically restart Espanso service when configuration changes.",
      "autoRestartHint": "Automatically restart service after config changes"
    },
    "pasteSettings": {
      "preferClipboard": "Prefer Clipboard",
      "preferClipboardTooltip": "Prioritize clipboard method for text insertion, useful for apps incompatible with keyboard input.",
      "clipboardThreshold": "Clipboard Threshold",
      "clipboardThresholdTooltip": "Automatically use clipboard method when replacement text exceeds this length (in characters).",
      "pasteShortcut": "Paste Shortcut",
      "pasteShortcutTooltip": "Custom shortcut for pasting, e.g., CTRL+V. Leave empty to use system default.",
      "fastInject": "Fast Inject",
      "fastInjectTooltip": "Use faster text input method, may improve speed in some apps but reduce compatibility.",
      "prePasteDelay": "Pre-paste Delay (ms)",
      "prePasteDelayTooltip": "Wait time before paste operation in milliseconds. Increasing this may improve compatibility with slow apps.",
      "postPasteDelay": "Post-paste Delay (ms)",
      "postPasteDelayTooltip": "Wait time after paste operation in milliseconds. Increasing this may prevent text truncation in some apps."
    },
    "languageNames": {
      "zhCN": "Simplified Chinese",
      "en": "English"
    },
    "notificationSettings": {
      "enableNotifications": "Enable Notifications",
      "enableNotificationsTooltip": "Show system notifications for Espanso actions to understand when expansions are triggered.",
      "showIcon": "Show Icon",
      "showIconTooltip": "Display Espanso icon in system tray for easy access to status and menu.",
      "notificationIcon": "Notification Icon Path",
      "notificationIconTooltip": "Custom file path for notification icon. Leave empty to use default. Supports PNG, ICO formats.",
      "notificationSound": "Notification Sound Path",
      "notificationSoundTooltip": "Sound file to play when expansions trigger. Leave empty for no sound. Supports WAV, MP3 formats."
    },
    "selectOptions": {
      "disabled": "Disabled",
      "auto": "Auto",
      "inject": "Inject",
      "clipboard": "Clipboard",
      "keyboard": "Keyboard"
    }
  },
  "contextMenu": {
    "newSnippet": "New Snippet",
    "newConfigFile": "New Config File",
    "paste": "Paste",
    "copyPath": "Copy Path",
    "expandAll": "Expand All",
    "collapseAll": "Collapse All",
    "browseOfficialPackages": "Browse Official Packages",
    "renameFile": "Rename File",
    "deleteFile": "Delete File",
    "renameFolder": "Rename Folder",
    "uninstallPackage": "Uninstall Package",
    "deleteFolder": "Delete Folder",
    "copySnippet": "Copy Snippet",
    "cutSnippet": "Cut Snippet",
    "deleteSnippet": "Delete Snippet"
  },
  "components": {
    "tagInput": {
      "add": "Add",
      "remove": "Remove",
      "screenReaderRemove": "Remove tag"
    }
  }
} 