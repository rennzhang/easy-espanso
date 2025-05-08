<template>
  <div class="app-container">
    <template v-if="store.state.loading">
      <div class="fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-[2px] z-50 transition-all duration-300">
        <div class="flex flex-col items-center animate-scale-in">
          <div class="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin shadow-md"></div>
          <div class="mt-5 text-primary font-medium">{{ store.state.statusMessage || '加载中...' }}</div>
        </div>
      </div>
    </template>

    <template v-else-if="!espansoInstalled">
      <EspansoInstallPrompt @check-complete="handleInstallCheckComplete" />
    </template>

    <template v-else-if="needsConfigSelection">
      <div class="config-selector">
        <Card class="max-w-md mx-auto shadow-lg dark:shadow-dark-md border-transparent dark:border-border/30 animate-scale-in">
          <CardHeader class="pb-4">
            <CardTitle class="text-center text-2xl">欢迎使用 Easy Espanso</CardTitle>
            <CardDescription class="text-center mt-2">
              请选择您的 Espanso 配置文件夹以开始
              <p v-if="store.state.error" class="text-destructive mt-3 text-sm font-medium">
                加载失败: {{ store.state.error }}
              </p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col items-center gap-4">
              <Button @click="selectConfigFolder" :disabled="isSelectingFolder" class="w-48 h-10">
                <FolderIcon class="h-5 w-5 mr-2" />
                {{ isSelectingFolder ? '处理中...' : '选择配置文件夹' }}
              </Button>
              <p class="text-sm text-muted-foreground mt-2">
                选择后将自动保存路径，方便下次使用。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>

    <template v-else>
      <AppLayout />
      <Toaster position="top-center" richColors :duration="2500" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEspansoStore } from './store/useEspansoStore'; // 引入重构后的 Store
import AppLayout from './components/layouts/AppLayout.vue'; // 导入路由布局组件
import { FolderIcon } from 'lucide-vue-next';
import { Toaster, toast } from 'vue-sonner';
import { PlatformAdapterFactory } from '@/services/platform/PlatformAdapterFactory';
import * as platformService from '@/services/platformService'; // 引入重构后的 platformService
import * as configService from '@/services/configService';     // 引入重构后的 configService
import { useTheme } from './hooks/useTheme'; // 正确导入useTheme
import { checkEspansoInstalled } from '@/services/espansoInstallService'; // 导入 espanso 安装检测服务
import EspansoInstallPrompt from '@/components/common/EspansoInstallPrompt.vue'; // 导入安装提示组件

// 导入 UI 组件 (保持不变)
import { Button } from './components/ui/button'; // 导入按钮组件
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card'; // 导入卡片组件

const store = useEspansoStore();
const adapter = PlatformAdapterFactory.getInstance();
const isSelectingFolder = ref(false); // 用于禁用选择按钮
const espansoInstalled = ref(true); // 默认假设已安装，后续检测
const { t } = useI18n(); // 使用国际化

// 使用useTheme并记录一下主题状态，以防linter报错
const { theme } = useTheme();
console.log(`[App] Current theme: ${theme.value}`); // 使用theme变量，避免unused警告

// 处理 espanso 安装检测结果
const handleInstallCheckComplete = (installed: boolean) => {
  espansoInstalled.value = installed;
  if (installed) {
    // 如果检测到已安装，继续初始化流程
    store.initializeStore();
  }
};

// --- 计算属性判断是否需要选择配置 ---
// 当 Store 初始化完成 (!loading)，但没有有效的配置根目录 (configRootDir 为 null) 时，需要选择
const needsConfigSelection = computed(() => {
  // console.log(`[App Computed] Loading: ${store.state.loading}, RootDir: ${store.state.configRootDir}`); // 调试日志
  return !store.state.loading && !store.state.configRootDir;
});

// --- 监听来自主进程的 Espanso 安装状态更新 ---
const setupEspansoStatusListener = () => {
  // 确保只在浏览器环境中运行此代码
  if (typeof window !== 'undefined' && window.ipcRenderer) {
    // 设置监听器接收来自主进程的安装状态通知
    window.ipcRenderer.on('espanso:installStatus', (installed) => {
      console.log('[App] Received Espanso installation status from main process:', installed);
      espansoInstalled.value = installed;
      
      if (installed) {
        // 如果检测到已安装，继续初始化流程
        if (!store.state.configRootDir && !store.state.loading) {
          store.initializeStore();
        }
      }
    });
  }
};

// --- 初始化逻辑 ---
onMounted(async () => {
  // 设置 Espanso 安装状态监听器
  setupEspansoStatusListener();

  // Initialize theme
  console.log('[App.vue] Initializing theme...'); // 日志
  // useTheme 的 onMounted 钩子会自动处理主题的初始化和应用
  // 所以这里不需要显式调用 setTheme 或 applyTheme

  // 使用适配器的 onIpcHandlersReady (如果存在)
  if (typeof adapter.onIpcHandlersReady === 'function') {
    console.log('[App] Waiting for IPC handlers...');
    adapter.onIpcHandlersReady(async () => {
      console.log('[App] IPC handlers ready! Checking Espanso installation...');

      // 检测 espanso 是否已安装
      try {
        const installed = await checkEspansoInstalled();
        espansoInstalled.value = installed;

        if (installed) {
          console.log('[App] Espanso is installed. Initializing store...');
      // 调用 Store 的初始化 Action
      store.initializeStore();
        } else {
          console.log('[App] Espanso is not installed. Showing installation prompt...');
          // 不初始化 store，显示安装提示
        }
      } catch (error) {
        console.error('[App] Failed to check Espanso installation:', error);
        // 出错时假设已安装，继续初始化
        store.initializeStore();
      }
    });
  } else {
    // 非 Electron 或无该方法，直接检测 espanso 安装状态
    console.log('[App] IPC readiness check not available/needed. Checking Espanso installation...');

    try {
      const installed = await checkEspansoInstalled();
      espansoInstalled.value = installed;

      if (installed) {
        console.log('[App] Espanso is installed. Initializing store...');
        // 调用 Store 的初始化 Action
        store.initializeStore();
      } else {
        console.log('[App] Espanso is not installed. Showing installation prompt...');
        // 不初始化 store，显示安装提示
      }
    } catch (error) {
      console.error('[App] Failed to check Espanso installation:', error);
      // 出错时假设已安装，继续初始化
    store.initializeStore();
    }
  }
});

// 组件卸载时清理监听器
onUnmounted(() => {
  if (typeof window !== 'undefined' && window.ipcRenderer) {
    window.ipcRenderer.removeAllListeners('espanso:installStatus');
  }
});

// --- 监听 Store 错误状态 ---
// 如果 store 加载失败并设置了错误，即使有 rootDir 也可能需要重新选择
watch(() => store.state.error, (newError) => {
    if (newError) {
        // 可以选择在这里强制显示选择界面，或者仅在 Card 中显示错误信息
        // needsConfigSelection.value = true; // 取消注释这行如果加载失败总是要强制重新选择
        console.error("[App] Store encountered an error:", newError);
    }
});


// --- 选择配置文件夹逻辑 (已简化) ---
const selectConfigFolder = async () => {
  if (isSelectingFolder.value) return;
  isSelectingFolder.value = true;
  store.state.error = null; // 清除旧错误

  try {
    console.log('[App] Showing open directory dialog...');
    // 1. 使用 platformService 显示对话框
    // 注意：确保 platformService 和其适配器正确实现了 showOpenDialog
    const result = await platformService.showOpenDialog({
        properties: ['openDirectory'],
        title: t('settings.selectConfigFolder', '请选择 Espanso 配置文件夹')
    });

    if (result.canceled || result.filePaths.length === 0) {
      console.log('[App] Directory selection cancelled.');
      isSelectingFolder.value = false;
      return;
    }

    // 在 Electron 中，filePaths[0] 是真实路径
    // 在 WebAdapter 模拟中，可能只是文件名或 undefined，需要根据实际情况调整
    const selectedPath = result.filePaths[0];
    if (!selectedPath) {
        console.warn('[App] No valid path received from dialog.');
        throw new Error(t('settings.invalidPath', "未能获取有效的文件路径。"));
    }
    console.log('[App] Directory selected:', selectedPath);

    // 标准化路径 (可选)
    const normalizedPath = selectedPath.replace(/\\/g, '/');

    // 2. 保存用户选择的路径 (使用 configService)
    console.log('[App] Saving selected path:', normalizedPath);
    configService.saveSelectedConfigPath(normalizedPath); // 注意：这个函数是同步的

    // 3. 调用 Store 加载配置 (Store Action 会处理加载、验证和状态更新)
    console.log('[App] Triggering store.loadConfig with selected path...');
    await store.loadConfig(normalizedPath); // loadConfig 现在是异步的

    // 检查 store 加载后的状态
    if (store.state.error) {
        console.error('[App] store.loadConfig failed after selection:', store.state.error);
        // toast.error(`加载配置失败: ${store.state.error}`); // 错误信息已在 Card 中显示
    } else {
        console.log('[App] Configuration loaded successfully after selection.');
        toast.success(t('settings.configLoadSuccess', "配置加载成功！"));
        // needsConfigSelection 会自动变为 false 因为 configRootDir 已设置
    }

  } catch (error: any) {
    console.error('[App] Error selecting or loading config folder:', error);
    toast.error(t('settings.operationFailed', `操作失败: ${error.message || t('common.unknownError', '未知错误')}`));
    store.state.error = t('settings.configLoadFailed', `选择或加载配置失败: ${error.message}`); // 更新 store 错误状态
  } finally {
    isSelectingFolder.value = false; // 无论成功或失败，都解除按钮禁用
  }
};

</script>


<style lang="postcss">
.app-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: hsl(var(--background));
  transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.config-selector {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.25rem;
}

/* Toast Transition Styles */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(20px, 0); /* 更微妙的位移 */
}

.toast-fade-enter-to,
.toast-fade-leave-from {
  opacity: 1;
  transform: translate(0, 0);
}
</style>
