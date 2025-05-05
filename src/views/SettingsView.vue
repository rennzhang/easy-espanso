<template>
  <div class="settings-view bg-background">
    <!-- 加载状态 -->
    <div v-if="!isConfigLoaded && !loadError" class="loading-view">
      <div class="spinner"></div>
      <p class="mt-4 text-primary font-medium">加载配置中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="loadError" class="error-view">
      <div class="alert-icon">❌</div>
      <p class="error-message">{{ loadError }}</p>
      <Button @click="tryReload" class="mt-4">重试加载</Button>
    </div>

    <!-- 正常设置内容 -->
    <div v-else class="content-view flex flex-col">
      <div class="flex justify-between items-center mb-3">
        <h1 class="text-2xl font-bold">全局设置</h1>
        <Button @click="saveSettings" :disabled="!hasChanges">
          <Save v-if="!isSaving" class="w-4 h-4 mr-2" />
          <span v-if="isSaving" class="loader mr-2"></span>
          {{ isSaving ? "保存中..." : "保存设置" }}
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
            <span>{{ category.name }}</span>
          </div>
        </div>
        
        <!-- 设置内容区域 -->
        <div class="settings-content">
          <h2 class="text-xl font-semibold mb-4">{{ getCategoryName(activeCategory) }}</h2>
          
          <!-- 基本设置 -->
          <div v-if="activeCategory === 'basic'" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="toggle_key">开关热键</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">用于开启或关闭 Espanso 功能的快捷键。设置为"OFF"将禁用此功能。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.toggle_key">
                <SelectTrigger id="toggle_key" class="w-full">
                  <SelectValue placeholder="选择热键" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALT">ALT</SelectItem>
                  <SelectItem value="CTRL">CTRL</SelectItem>
                  <SelectItem value="CMD">CMD</SelectItem>
                  <SelectItem value="SHIFT">SHIFT</SelectItem>
                  <SelectItem value="OFF">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="backend">后端类型</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">Espanso 使用的文本插入方法。"自动"将根据操作系统自动选择最佳方式，"注入"直接模拟键盘输入，"剪贴板"使用剪贴板进行文本替换。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.backend">
                <SelectTrigger id="backend" class="w-full">
                  <SelectValue placeholder="选择后端" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Auto">自动</SelectItem>
                  <SelectItem value="Inject">注入</SelectItem>
                  <SelectItem value="Clipboard">剪贴板</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="search_shortcut">搜索快捷键</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">打开 Espanso 搜索窗口的快捷键，例如"ALT+SPACE"。留空表示不使用快捷键。</p>
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
                  <Label for="auto_restart">自动重启</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">当配置文件修改后自动重启 Espanso 服务，使更改立即生效。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p class="text-xs text-gray-500 mt-1">配置修改后自动重启服务</p>
            </div>
          </div>
          
          <!-- 通知设置 -->
          <div v-if="activeCategory === 'notification'" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="enable_notifications" v-model="localConfig.enable_notifications" />
                  <Label for="enable_notifications">启用通知</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">显示 Espanso 操作的系统通知，帮助了解扩展何时被触发。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="show_icon" v-model="localConfig.show_icon" />
                  <Label for="show_icon">显示图标</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">在系统托盘中显示 Espanso 图标，方便查看程序状态和访问快捷菜单。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="notification_icon">通知图标路径</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">自定义通知图标的文件路径。留空将使用默认图标。支持 PNG、ICO 等格式。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="notification_icon" v-model="localConfig.notification_icon" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="notification_sound">通知声音路径</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">触发扩展时播放的声音文件路径。留空表示不播放声音。支持 WAV、MP3 等格式。</p>
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
                  <Label for="prefer_clipboard">优先使用剪贴板</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">优先使用剪贴板方式插入文本，适用于某些键盘输入方式不兼容的应用程序。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="clipboard_threshold">剪贴板阈值</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">当替换文本长度超过此值时，自动使用剪贴板方式而非键盘输入。单位为字符数。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="clipboard_threshold" type="number" v-model="localConfig.clipboard_threshold" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="paste_shortcut">粘贴快捷键</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">自定义用于粘贴的快捷键，例如"CTRL+V"。如留空，将使用系统默认粘贴快捷键。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="paste_shortcut" v-model="localConfig.paste_shortcut" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="fast_inject" v-model="localConfig.fast_inject" />
                  <Label for="fast_inject">快速注入</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">使用更快的文本输入方式，在某些应用中可能提高速度，但可能降低兼容性。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="pre_paste_delay">粘贴前延迟 (ms)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">执行粘贴操作前的等待时间，单位为毫秒。增加此值可提高在慢速应用中的兼容性。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="pre_paste_delay" type="number" v-model="localConfig.pre_paste_delay" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="post_paste_delay">粘贴后延迟 (ms)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">执行粘贴操作后的等待时间，单位为毫秒。增加此值可避免在某些应用中出现文本截断的问题。</p>
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
                  <Label for="mac_use_applescript_backend">使用 AppleScript 后端</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">使用 AppleScript 执行文本替换，在某些 macOS 应用中兼容性更好，但可能较慢。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="mac_use_events_backend" v-model="localConfig.mac_use_events_backend" />
                  <Label for="mac_use_events_backend">使用 Events 后端</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">使用 macOS 原生事件系统模拟键盘输入，速度较快但在某些安全应用中可能受限。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="mac_experimental_accessibility" v-model="localConfig.mac_experimental_accessibility" />
                  <Label for="mac_experimental_accessibility">实验性辅助功能</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">使用 macOS 辅助功能 API 增强文本输入兼容性，可能需要额外的系统权限。试验功能，可能不稳定。</p>
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
                  <Label for="win_use_legacy_inject">使用传统注入</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">使用较旧的文本注入方法，在新版 Windows 上可能提高某些应用的兼容性。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="win_use_send_input_backend" v-model="localConfig.win_use_send_input_backend" />
                  <Label for="win_use_send_input_backend">使用 SendInput 后端</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">使用 Windows SendInput API 进行文本输入，通常更快且兼容性更好。</p>
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
                  <Label for="x11_use_xdotool_backend">使用 xdotool 后端 (X11)</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">使用 xdotool 实用工具模拟键盘输入，通常在 X11 环境中有较好兼容性，但需要安装 xdotool。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <div class="flex items-center space-x-2">
                  <Checkbox id="x11_use_xsel_backend" v-model="localConfig.x11_use_xsel_backend" />
                  <Label for="x11_use_xsel_backend">使用 xsel 后端 (X11)</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">使用 xsel 工具管理剪贴板操作，有助于提高 X11 环境中的文本替换可靠性，但需要安装 xsel。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="x11_key_delay">X11 按键延迟 (ms)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">X11 环境中键盘按键之间的延迟时间，单位为毫秒。增加此值可提高在某些 Linux 应用中的稳定性。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="x11_key_delay" type="number" v-model="localConfig.x11_key_delay" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="wayland_paste_method">Wayland 粘贴方法</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">在 Wayland 环境中使用的粘贴方法。"剪贴板"使用系统剪贴板，"键盘"通过模拟键盘输入文本。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.wayland_paste_method">
                <SelectTrigger id="wayland_paste_method" class="w-full">
                  <SelectValue placeholder="选择方法" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clipboard">剪贴板</SelectItem>
                  <SelectItem value="keyboard">键盘</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <!-- 高级设置 -->
          <div v-if="activeCategory === 'advanced'" class="grid grid-cols-2 gap-4">
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="inject_delay">注入延迟 (ms)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">文本注入过程中每个字符之间的延迟时间，单位为毫秒。增加此值可提高在响应慢的应用中的稳定性。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="inject_delay" type="number" v-model="localConfig.inject_delay" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="abort_key">中止键</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">用于取消当前进行中的文本替换操作的快捷键。按下此键将停止替换并恢复原始输入。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.abort_key">
                <SelectTrigger id="abort_key" class="w-full">
                  <SelectValue placeholder="选择中止键" />
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
                <Label for="filter_class">过滤窗口类</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">指定禁用 Espanso 的窗口类名，使用正则表达式。多个值用逗号分隔。例如：".*password.*,.*secret.*"</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="filter_class" v-model="localConfig.filter_class" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="filter_title">过滤窗口标题</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">指定禁用 Espanso 的窗口标题，使用正则表达式。多个值用逗号分隔。例如：".*敏感信息.*,.*密码.*"</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="filter_title" v-model="localConfig.filter_title" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="config_path">配置路径</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">自定义 Espanso 配置文件的存储路径。留空使用默认路径。修改此项需重启 Espanso。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="config_path" v-model="localConfig.config_path" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="packages_path">包路径</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">自定义 Espanso 包的存储路径。留空使用默认路径。修改此项需重启 Espanso。</p>
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
                  <Label for="verbose">详细日志</Label>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">启用更详细的日志记录，包含更多调试信息。对排查问题很有帮助，但会增加日志文件大小。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="log_level">日志级别</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">日志记录的详细程度。Trace 最详细，Error 最简略。通常使用 Info 即可，排查问题时使用 Debug。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select v-model="localConfig.log_level">
                <SelectTrigger id="log_level" class="w-full">
                  <SelectValue placeholder="选择日志级别" />
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
                <Label for="log_file">日志文件路径</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">自定义日志文件的存储路径。留空使用默认路径。可使用绝对路径或相对于配置目录的路径。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="log_file" v-model="localConfig.log_file" />
            </div>
            
            <div class="form-item">
              <div class="flex items-center gap-1">
                <Label for="log_filter">日志过滤器</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="cursor-help text-muted-foreground">
                        <HelpCircleIcon class="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p class="max-w-xs">用于过滤日志输出的规则，遵循 env_logger 语法。例如："espanso=debug,X11=info"表示显示espanso的调试日志和X11的信息日志。</p>
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

// 获取store
const store = useEspansoStore();

// 平台检测
const isMacOS = computed(() => navigator.platform.includes("Mac"));
const isWindows = computed(() => navigator.platform.includes("Win"));
const isLinux = computed(() => !isMacOS.value && !isWindows.value);

// 设置分类
const categories = [
  { id: "basic", name: "基本设置", icon: "Settings" },
  { id: "paste", name: "粘贴行为", icon: "Clock" },
  { id: "notification", name: "通知设置", icon: "Bell" },
  { id: "advanced", name: "高级设置", icon: "AlertTriangle" },
  { id: "logging", name: "日志设置", icon: "LineChart" },
];

// 添加平台特定设置
if (isMacOS.value) {
  categories.push({ id: "mac", name: "macOS设置", icon: "Laptop" });
}
if (isWindows.value) {
  categories.push({ id: "windows", name: "Windows设置", icon: "Monitor" });
}
if (isLinux.value) {
  categories.push({ id: "linux", name: "Linux设置", icon: "Server" });
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
  const category = categories.find((c) => c.id === categoryId);
  return category ? category.name : "设置";
};

// 钩子函数和调试
onMounted(() => {
  console.log('SettingsView 已挂载');
  loadConfig();
});

// 错误捕获
onErrorCaptured((err, instance, info) => {
  console.error('SettingsView 捕获到错误:', err);
  loadError.value = `加载设置出错: ${err.message || String(err)}`;
  return false; // 阻止错误继续传播
});

// 加载配置数据
const loadConfig = async () => {
  try {
    isConfigLoaded.value = false;
    loadError.value = null;
    console.log('开始加载全局配置');
    
    // 如果store还没有准备好或globalConfig为null，使用默认配置
    if (!store.state.globalConfig) {
      console.log('全局配置不可用，使用默认值');
      // 复制默认配置到原始配置引用
      originalConfig.value = cloneDeep(localConfig);
      isConfigLoaded.value = true;
      return;
    }
    
    // 按照store的API正确调用加载方法
    // 成功加载后，复制配置到本地状态
    const config = store.state.globalConfig;
    if (config) {
      Object.assign(localConfig, config);
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
    
    // 更新原始配置，重置修改状态
    originalConfig.value = cloneDeep(localConfig);
    console.log('设置保存成功');
    toast.success('设置已保存');
  } catch (error: any) {
    console.error('保存设置失败:', error);
    toast.error(`保存设置失败: ${error.message || String(error)}`);
  } finally {
    isSaving.value = false;
  }
};

// 重置为默认值
const resetToDefault = () => {
  if (originalConfig.value) {
    Object.assign(localConfig, cloneDeep(originalConfig.value));
    toast.info("已恢复到上次保存的设置");
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
