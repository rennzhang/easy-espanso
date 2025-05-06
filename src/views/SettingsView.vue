<template>
  <div class="settings-view bg-background">
    <!-- 加载状态 -->
    <div v-if="!isConfigLoaded && !loadError" class="loading-view">
      <div class="spinner"></div>
      <p class="mt-4 text-primary font-medium">{{ t('settings.loadingConfig') }}</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="loadError" class="error-view">
      <div class="alert-icon">❌</div>
      <p class="error-message">{{ loadError }}</p>
      <Button @click="tryReload" class="mt-4">{{ t('settings.retryLoad') }}</Button>
    </div>

    <!-- 正常设置内容 -->
    <div v-else class="content-view flex flex-col">
      <div class="flex justify-between items-center mb-3">
        <h1 class="text-2xl font-bold">{{ t('settings.title') }}</h1>
        <Button @click="saveSettings" :disabled="!hasChanges">
          <Save v-if="!isSaving" class="w-4 h-4 mr-2" />
          <span v-if="isSaving" class="loader mr-2"></span>
          {{ isSaving ? t('settings.savingSettings') : t('settings.saveSettings') }}
        </Button>
      </div>
      
      <Separator class="my-4" />
      
      <div class="settings-container flex-1">
        <!-- 设置分类侧边栏 -->
        <div class="settings-sidebar">
          <div
            v-for="category in categories"
            :key="category.id"
            @click="activeCategory = category.id"
            class="category-item"
            :class="{ active: activeCategory === category.id }"
          >
            <component :is="icons[category.icon]" class="w-5 h-5 mr-2" />
            <span>{{ t(`settings.sections.${category.id}`) }}</span>
          </div>
        </div>
        
        <!-- 设置内容区域 -->
        <div class="settings-content">
          <h2 class="text-xl font-semibold mb-4">{{ t(`settings.sections.${activeCategory}`) }}</h2>
          
          <!-- 基本设置 -->
          <div v-if="activeCategory === 'basic'" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="toggle_key">{{ t('settings.basicSettings.toggleKey') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.basicSettings.toggleKeyTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.toggle_key">
                <SelectTrigger id="toggle_key" class="w-full">
                  <SelectValue :placeholder="t('settings.selectLanguagePlaceholder')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALT">ALT</SelectItem>
                  <SelectItem value="CTRL">CTRL</SelectItem>
                  <SelectItem value="CMD">CMD</SelectItem>
                  <SelectItem value="SHIFT">SHIFT</SelectItem>
                  <SelectItem value="OFF">{{ t('settings.selectOptions.disabled') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="backend">{{ t('settings.basicSettings.backendType') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.basicSettings.backendTypeTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.backend">
                <SelectTrigger id="backend" class="w-full">
                  <SelectValue :placeholder="t('settings.selectLanguagePlaceholder')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Auto">{{ t('settings.selectOptions.auto') }}</SelectItem>
                  <SelectItem value="Inject">{{ t('settings.selectOptions.inject') }}</SelectItem>
                  <SelectItem value="Clipboard">{{ t('settings.selectOptions.clipboard') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="search_shortcut">{{ t('settings.basicSettings.searchShortcut') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.basicSettings.searchShortcutTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="search_shortcut" v-model="localConfig.search_shortcut" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="auto_restart" v-model="localConfig.auto_restart" />
                  <Label for="auto_restart">{{ t('settings.basicSettings.autoRestart') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.basicSettings.autoRestartTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ t('settings.basicSettings.autoRestartHint') }}</p>
            </div>

            <!-- 语言选择器 -->
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="language">{{ t('settings.language') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.languageTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.language">
                <SelectTrigger id="language" class="w-full">
                  <SelectValue :placeholder="t('settings.selectLanguagePlaceholder')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="loc in availableLocales" :key="loc" :value="loc">
                    {{ t(`settings.languageNames.${loc.replace('-', '')}`) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <!-- 通知设置 -->
          <div v-if="activeCategory === 'notification'" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="enable_notifications" v-model="localConfig.enable_notifications" />
                  <Label for="enable_notifications">{{ t('settings.notificationSettings.enableNotifications') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.notificationSettings.enableNotificationsTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="show_icon" v-model="localConfig.show_icon" />
                  <Label for="show_icon">{{ t('settings.notificationSettings.showIcon') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.notificationSettings.showIconTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="notification_icon">{{ t('settings.notificationSettings.notificationIcon') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.notificationSettings.notificationIconTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="notification_icon" v-model="localConfig.notification_icon" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="notification_sound">{{ t('settings.notificationSettings.notificationSound') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.notificationSettings.notificationSoundTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="notification_sound" v-model="localConfig.notification_sound" />
            </div>
          </div>
          
          <!-- 粘贴行为 -->
          <div v-if="activeCategory === 'paste'" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="prefer_clipboard" v-model="localConfig.prefer_clipboard" />
                  <Label for="prefer_clipboard">{{ t('settings.pasteSettings.preferClipboard') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.pasteSettings.preferClipboardTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <!-- 剪贴板阈值 -->
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="clipboard_threshold">{{ t('settings.pasteSettings.clipboardThreshold') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.pasteSettings.clipboardThresholdTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="clipboard_threshold" type="number" v-model="localConfig.clipboard_threshold" />
            </div>
            
            <!-- 粘贴快捷键 -->
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="paste_shortcut">{{ t('settings.pasteSettings.pasteShortcut') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.pasteSettings.pasteShortcutTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="paste_shortcut" v-model="localConfig.paste_shortcut" />
            </div>
            
            <!-- 快速注入 -->
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="fast_inject" v-model="localConfig.fast_inject" />
                  <Label for="fast_inject">{{ t('settings.pasteSettings.fastInject') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.pasteSettings.fastInjectTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="pre_paste_delay">{{ t('settings.pasteSettings.prePasteDelay') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.pasteSettings.prePasteDelayTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="pre_paste_delay" type="number" v-model="localConfig.pre_paste_delay" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="post_paste_delay">{{ t('settings.pasteSettings.postPasteDelay') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.pasteSettings.postPasteDelayTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="post_paste_delay" type="number" v-model="localConfig.post_paste_delay" />
            </div>
          </div>
          
          <!-- macOS 特定设置 -->
          <div v-if="activeCategory === 'mac' && isMacOS" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="mac_use_applescript_backend" v-model="localConfig.mac_use_applescript_backend" />
                  <Label for="mac_use_applescript_backend">{{ t('settings.macSettings.useAppleScriptBackend') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.macSettings.useAppleScriptBackendTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="mac_use_events_backend" v-model="localConfig.mac_use_events_backend" />
                  <Label for="mac_use_events_backend">{{ t('settings.macSettings.useEventsBackend') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.macSettings.useEventsBackendTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="mac_experimental_accessibility" v-model="localConfig.mac_experimental_accessibility" />
                  <Label for="mac_experimental_accessibility">{{ t('settings.macSettings.experimentalAccessibility') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.macSettings.experimentalAccessibilityTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          
          <!-- Windows 特定设置 -->
          <div v-if="activeCategory === 'windows' && isWindows" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="win_use_legacy_inject" v-model="localConfig.win_use_legacy_inject" />
                  <Label for="win_use_legacy_inject">{{ t('settings.windowsSettings.useLegacyInject') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.windowsSettings.useLegacyInjectTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="win_use_send_input_backend" v-model="localConfig.win_use_send_input_backend" />
                  <Label for="win_use_send_input_backend">{{ t('settings.windowsSettings.useSendInputBackend') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.windowsSettings.useSendInputBackendTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          
          <!-- Linux 特定设置 -->
          <div v-if="activeCategory === 'linux' && isLinux" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="x11_use_xdotool_backend" v-model="localConfig.x11_use_xdotool_backend" />
                  <Label for="x11_use_xdotool_backend">{{ t('settings.linuxSettings.useXdotoolBackend') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.linuxSettings.useXdotoolBackendTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="x11_use_xsel_backend" v-model="localConfig.x11_use_xsel_backend" />
                  <Label for="x11_use_xsel_backend">{{ t('settings.linuxSettings.useXselBackend') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.linuxSettings.useXselBackendTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="x11_key_delay">{{ t('settings.linuxSettings.x11KeyDelay') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.linuxSettings.x11KeyDelayTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="x11_key_delay" type="number" v-model="localConfig.x11_key_delay" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="wayland_paste_method">{{ t('settings.linuxSettings.waylandPasteMethod') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.linuxSettings.waylandPasteMethodTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.wayland_paste_method">
                <SelectTrigger id="wayland_paste_method" class="w-full">
                  <SelectValue :placeholder="t('settings.selectLanguagePlaceholder')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clipboard">{{ t('settings.selectOptions.clipboard') }}</SelectItem>
                  <SelectItem value="keyboard">{{ t('settings.selectOptions.keyboard') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <!-- 高级设置 -->
          <div v-if="activeCategory === 'advanced'" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="inject_delay">{{ t('settings.advancedSettings.injectDelay') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.advancedSettings.injectDelayTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="inject_delay" type="number" v-model="localConfig.inject_delay" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="abort_key">{{ t('settings.advancedSettings.abortKey') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.advancedSettings.abortKeyTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.abort_key">
                <SelectTrigger id="abort_key" class="w-full">
                  <SelectValue :placeholder="t('settings.advancedSettings.selectAbortKey')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESC">ESC</SelectItem>
                  <SelectItem value="CTRL+C">CTRL+C</SelectItem>
                  <SelectItem value="ALT+C">ALT+C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="filter_class">{{ t('settings.advancedSettings.filterClass') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.advancedSettings.filterClassTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="filter_class" v-model="localConfig.filter_class" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="filter_title">{{ t('settings.advancedSettings.filterTitle') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.advancedSettings.filterTitleTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="filter_title" v-model="localConfig.filter_title" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="config_path">{{ t('settings.advancedSettings.configPath') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.advancedSettings.configPathTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="config_path" v-model="localConfig.config_path" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="packages_path">{{ t('settings.advancedSettings.packagesPath') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.advancedSettings.packagesPathTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="packages_path" v-model="localConfig.packages_path" />
            </div>
          </div>
          
          <!-- 日志设置 -->
          <div v-if="activeCategory === 'logging'" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="verbose" v-model="localConfig.verbose" />
                  <Label for="verbose">{{ t('settings.loggingSettings.verbose') }}</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.loggingSettings.verboseTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="log_level">{{ t('settings.loggingSettings.logLevel') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.loggingSettings.logLevelTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.log_level">
                <SelectTrigger id="log_level" class="w-full">
                  <SelectValue :placeholder="t('settings.loggingSettings.selectLogLevel')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trace">Trace</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="log_file">{{ t('settings.loggingSettings.logFile') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.loggingSettings.logFileTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="log_file" v-model="localConfig.log_file" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="log_filter">{{ t('settings.loggingSettings.logFilter') }}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">{{ t('settings.loggingSettings.logFilterTooltip') }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="log_filter" v-model="localConfig.log_filter" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, onErrorCaptured } from "vue";
import { useEspansoStore } from "@/store/useEspansoStore";
import { cloneDeep, isEqual } from "lodash-es";
import { toast } from "vue-sonner";
import { useI18n } from 'vue-i18n';
import {
  Settings,
  Save,
  AlertTriangle,
  Clock,
  Bell,
  Laptop,
  Monitor,
  Server,
  LineChart,
  HelpCircleIcon,
} from "lucide-vue-next";
import type { FunctionalComponent } from "vue";

// UI组件
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "../components/ui/separator";

// 获取 i18n 函数和状态
const { t, locale, availableLocales } = useI18n();

// 获取store
const store = useEspansoStore();

// 平台检测
const isMacOS = computed(() => navigator.platform.includes("Mac"));
const isWindows = computed(() => navigator.platform.includes("Win"));
const isLinux = computed(() => !isMacOS.value && !isWindows.value);

// 设置分类
const categories = [
  { id: "basic", name: t('settings.sections.basic'), icon: "Settings" },
  { id: "paste", name: t('settings.sections.paste'), icon: "Clock" },
  { id: "notification", name: t('settings.sections.notification'), icon: "Bell" },
  { id: "advanced", name: t('settings.sections.advanced'), icon: "AlertTriangle" },
  { id: "logging", name: t('settings.sections.logging'), icon: "LineChart" },
];

// 添加平台特定设置
if (isMacOS.value) {
  categories.push({ id: "mac", name: t('settings.sections.mac'), icon: "Laptop" });
}
if (isWindows.value) {
  categories.push({ id: "windows", name: t('settings.sections.windows'), icon: "Monitor" });
}
if (isLinux.value) {
  categories.push({ id: "linux", name: t('settings.sections.linux'), icon: "Server" });
}

// 图标映射（修复类型问题）
const icons: Record<string, FunctionalComponent> = {
  Settings,
  Clock,
  Bell,
  AlertTriangle,
  Laptop,
  Monitor,
  Server,
  LineChart,
  Save,
  HelpCircleIcon,
};

// 初始化本地配置对象
const localConfig = reactive<any>({
  // 基本配置默认值
  toggle_key: "ALT",
  search_shortcut: "",
  backend: "Auto",
  auto_restart: true,
  language: "zh-CN",

  // 通知配置默认值
  enable_notifications: true,
  show_icon: true,
  notification_icon: "",
  notification_sound: "",

  // 粘贴行为默认值
  prefer_clipboard: false,
  clipboard_threshold: 50,
  paste_shortcut: "",
  fast_inject: false,
  pre_paste_delay: 0,
  post_paste_delay: 0,

  // macOS 特定配置
  mac_use_applescript_backend: false,
  mac_use_events_backend: false,
  mac_experimental_accessibility: false,
  
  // Windows 特定配置
  win_use_legacy_inject: false,
  win_use_send_input_backend: false,
  
  // Linux 特定配置
  x11_use_xdotool_backend: false,
  x11_use_xsel_backend: false,
  x11_use_evdev_backend: false,
  x11_key_delay: 0,
  wayland_use_ydotool_backend: false,
  wayland_use_wtype_backend: false,
  wayland_paste_method: "clipboard",

  // 其他默认值
  inject_delay: 0,
  abort_key: "ESC",
  
  // 应用过滤
  filter_class: "",
  filter_title: "",
  
  // 路径配置
  config_path: "",
  packages_path: "",

  // 日志默认值
  verbose: false,
  log_level: "info",
  log_file: "",
  log_filter: ""
});

// 状态
const activeCategory = ref("basic");
const originalConfig = ref<any>(null);
const isSaving = ref(false);
const loadError = ref<string | null>(null);
const isConfigLoaded = ref(false);

// 计算属性
const hasChanges = computed(() => {
  return !isEqual(localConfig, originalConfig.value);
});

// 获取分类名称
const getCategoryName = (categoryId: string) => {
  return t(`settings.sections.${categoryId}`);
};

// 钩子函数和调试
onMounted(() => {
  console.log('SettingsView 已挂载');
  console.log(`[SettingsView] 初始语言: ${locale.value}, 可用语言: ${availableLocales.join(', ')}`);
  console.log(`[SettingsView] localStorage中的语言设置: ${localStorage.getItem('espanso-language')}`);
  loadConfig();
});

// 错误捕获
onErrorCaptured((err, instance, info) => {
  console.error('SettingsView 捕获到错误:', err);
  loadError.value = `加载设置出错: ${err.message || String(err)}`;
  return false; // 阻止错误继续传播
});

// 修改loadConfig函数
const loadConfig = async () => {
  try {
    isConfigLoaded.value = false;
    loadError.value = null;
    console.log('开始加载全局配置');
    
    if (!store.state.globalConfig) {
      console.log('全局配置不可用，使用默认值');
      
      // 尝试从localStorage读取语言设置
      try {
        const storedLanguage = localStorage.getItem('espanso-language');
        if (storedLanguage && availableLocales.includes(storedLanguage)) {
          localConfig.language = storedLanguage;
          locale.value = storedLanguage;
          console.log(`[SettingsView] 从localStorage加载语言设置: ${storedLanguage}`);
        }
      } catch (e) {
        console.warn('[SettingsView] 读取localStorage语言设置失败:', e);
      }
      
      originalConfig.value = cloneDeep(localConfig);
      isConfigLoaded.value = true;
      return;
    }
    
    const config = store.state.globalConfig;
    if (config) {
      Object.assign(localConfig, config);
      
      // 优先级：
      // 1. 配置文件中的language值
      // 2. localStorage中的language值
      // 3. 当前locale值
      
      // 先检查配置文件中是否有language设置
      let languageSet = false;
      if (config.language) {
        locale.value = config.language;
        localConfig.language = config.language;
        languageSet = true;
        console.log(`[SettingsView] 从配置文件加载语言设置: ${config.language}`);
      }
      
      // 如果配置文件中没有language设置，尝试从localStorage读取
      if (!languageSet) {
        try {
          const storedLanguage = localStorage.getItem('espanso-language');
          if (storedLanguage && availableLocales.includes(storedLanguage)) {
            localConfig.language = storedLanguage;
            locale.value = storedLanguage;
            languageSet = true;
            console.log(`[SettingsView] 从localStorage加载语言设置: ${storedLanguage}`);
          }
        } catch (e) {
          console.warn('[SettingsView] 读取localStorage语言设置失败:', e);
        }
      }
      
      // 如果都没有设置，使用当前locale
      if (!languageSet) {
        localConfig.language = locale.value;
        console.log(`[SettingsView] 使用当前locale作为语言设置: ${locale.value}`);
      }
      
      console.log('全局配置加载成功:', localConfig);
      originalConfig.value = cloneDeep(localConfig);
    }
    
    isConfigLoaded.value = true;
  } catch (error: any) {
    console.error('加载全局配置失败:', error);
    loadError.value = `无法加载配置: ${error.message || String(error)}`;
  }
};

// 重试加载
const tryReload = () => {
  loadError.value = null;
  // 先尝试重新初始化store
  store
    .initializeStore()
    .then(() => {
      // 初始化完成后加载配置
      loadConfig();
    })
    .catch((err) => {
      loadError.value = `初始化失败: ${err.message || "未知错误"}`;
    });
};

// 保存设置
const saveSettings = async () => {
  try {
    isSaving.value = true;
    console.log('开始保存设置:', localConfig);
    
    // 使用store的正确方法保存全局配置
    await store.updateGlobalConfig(localConfig);
    
    // 保存时应用语言设置
    if (localConfig.language && localConfig.language !== locale.value) {
      // 先更新localStorage中的语言设置，确保下次加载时能正确读取
      localStorage.setItem('espanso-language', localConfig.language);
      console.log(`[SettingsView] 语言设置已保存到localStorage: ${localConfig.language}`);
      
      // 然后更新当前的locale值
      locale.value = localConfig.language;
    }
    
    // 更新原始配置，重置修改状态
    originalConfig.value = cloneDeep(localConfig);
    console.log('设置保存成功');
    toast.success(t('settings.settingsSaved'));
  } catch (error: any) {
    console.error('保存设置失败:', error);
    toast.error(t('settings.settingsSaveFailed', { error: error.message || String(error) }));
  } finally {
    isSaving.value = false;
  }
};

// 重置为默认值
const resetToDefault = () => {
  if (originalConfig.value) {
    Object.assign(localConfig, cloneDeep(originalConfig.value));
    toast.info(t('settings.restoredToLastSave'));
  }
};
</script>

<style scoped>
.settings-view {
  height: 100%;
  width: 100%;
  overflow: auto;
}

.content-view, .loading-view, .error-view {
  height: 100%; 
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
  background-color: white;
}

.loading-view, .error-view {
  height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.settings-container {
  display: flex;
  gap: 2rem;
}

.settings-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  padding-right: 1rem;
}

.settings-content {
  flex: 1;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  background-color: #f5f5f5;
}

.category-item.active {
  background-color: #e0e0ff;
  color: #4a4ae8;
  font-weight: 500;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3182ce;
  animation: spin 1s linear infinite;
}

.alert-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #e53935;
}

.error-message {
  margin-bottom: 1.5rem;
  color: #e53935;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 加载动画 */
.loader {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}
</style>
