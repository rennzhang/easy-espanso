<template>
  <div class="app-container">
    <template v-if="isLoading">
      <div class="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
        <div class="flex flex-col items-center">
          <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          <div class="mt-4 text-primary font-medium">加载中...</div>
        </div>
      </div>
    </template>
    <template v-else-if="needsConfigSelection">
      <div class="config-selector">
        <Card class="max-w-md mx-auto">
          <CardHeader>
            <CardTitle class="text-center">欢迎使用 Espanso GUI</CardTitle>
            <CardDescription class="text-center">
              请选择 Espanso 配置文件夹以开始使用
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col items-center gap-4">
              <Button @click="selectConfigFolder">
                <FolderIcon class="h-5 w-5 mr-2" />
                选择配置文件夹
              </Button>
              <p class="text-sm text-muted-foreground">
                选择后将自动保存您的配置文件路径，下次使用时无需重新选择
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>
    <template v-else>
      <!-- 主布局 -->
      <MainLayout />

      <!-- Global Sonner Toaster -->
      <Toaster position="top-right" richColors :duration="2500" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useEspansoStore } from './store/useEspansoStore';
import { detectEnvironment, getEspansoConfigDir, showOpenDirectoryDialog, saveConfigDirPath, getDefaultEspansoConfigPath, scanDirectory } from './services/fileService';
import MainLayout from './components/layout/MainLayout.vue';
import { FolderIcon, LoaderIcon, CheckIcon, XIcon } from 'lucide-vue-next';
import type { PreloadApi, FileSystemNode } from './types/preload';
import { Toaster } from 'vue-sonner';

// 声明全局 window 对象的类型
declare global {
  interface Window {
    preloadApi?: PreloadApi;
  }
}

// 导入 shadcn/vue 组件
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';

// Extend window type for the flag
interface CustomWindow extends Window {
  preloadApiReady?: boolean;
  _preloadApiRetryCount?: number;
}

// 扩展全局Window类型
declare global {
  interface Window {
    preloadApiReady?: boolean;
    _preloadApiRetryCount?: number;
  }
}

const store = useEspansoStore();
const isLoading = ref(true);
const needsConfigSelection = ref(false);
const environment = ref<'electron' | 'web'>('web');
const configData = ref<FileSystemNode[]>([]);

onMounted(() => {
  // Start the initialization process that waits for the preload API AND IPC handlers
  waitForIpcReadyAndInitialize();
});

// 新函数：等待IPC就绪再初始化
async function waitForIpcReadyAndInitialize() {
  if (window.preloadApi && typeof window.preloadApi.onIpcHandlersReady === 'function') {
    console.log('[App Init] Waiting for ipc-handlers-ready signal from main process...');
    window.preloadApi.onIpcHandlersReady(() => {
      console.log('[App Init] Frontend callback for ipc-handlers-ready executed.');
      console.log('[App Init] Received ipc-handlers-ready signal. Starting initialization.');
      initializeAppConfig();
    });
  } else {
    // 如果 preloadApi 或 onIpcHandlersReady 不可用 (例如非 Electron 环境或预加载问题)
    console.warn('[App Init] Cannot wait for IPC ready signal. Proceeding with initialization directly (might fail).');
    initializeAppConfig();
  }
}

async function initializeAppConfig() {
  // 不再需要检查 preloadApi，因为 waitForIpcReadyAndInitialize 已经处理
  console.log('[App Init] Core initialization started.');
  try {
    // 检测环境 (理论上在 Electron 环境下已经检测过，但保留无妨)
    environment.value = await detectEnvironment();
    console.log('检测到运行环境:', environment.value);

    if (environment.value === 'electron') {
      // Electron环境下尝试自动加载默认配置
      console.log('尝试自动加载Electron默认配置');
      const loaded = await loadElectronDefaultConfig();

      if (loaded) {
        console.log('成功加载默认配置');
        // 输出当前store状态，验证数据是否正确加载
        console.log('当前store状态:', {
          configTree: store.state.configTree.length,
          globalConfig: store.state.globalConfig !== null,
          matches: store.getAllMatchesFromTree().length,
          groups: store.getAllGroupsFromTree().length
        });
        needsConfigSelection.value = false;
        isLoading.value = false; // Mark loading as complete
        return; // Exit initialization
      } else {
         console.log('自动加载默认配置失败或未找到。');
         // 这里需要决定是直接显示选择界面还是尝试 localStorage
         // 保持现有逻辑：尝试 localStorage
      }
    }

    // 尝试从本地存储获取配置目录 (Web 或 Electron 默认加载失败/未加载时)
    console.log('尝试从 localStorage 获取配置目录...');
    const configDir = await getEspansoConfigDir(); // 注意：此函数也可能依赖 IPC
    console.log('从本地存储获取配置目录:', configDir);

    if (configDir) {
      console.log('加载已保存的配置目录:', configDir);
      await store.loadConfig(configDir);
      // 检查是否成功加载
      const hasMatches = store.getAllMatchesFromTree().length > 0;
      const hasGroups = store.getAllGroupsFromTree().length > 0;
      const hasGlobalConfig = store.state.globalConfig !== null;
      const hasConfigTree = store.state.configTree.length > 0;

      console.log('加载结果:', {
        hasMatches,
        hasGroups,
        hasGlobalConfig,
        configTree: store.state.configTree.length
      });

      if (hasMatches || hasGroups || hasGlobalConfig || hasConfigTree) {
        needsConfigSelection.value = false;
      } else {
        console.log('已保存的配置目录无效或为空，显示选择界面');
        needsConfigSelection.value = true;
      }
    } else {
      // 如果没有找到配置目录，显示选择界面
      console.log('未找到配置目录（默认/localStorage），显示选择界面');
      needsConfigSelection.value = true;
    }
  } catch (error) {
    console.error('初始化失败:', error);
    needsConfigSelection.value = true; // 出错则显示选择界面
  } finally {
    // 确保 isLoading 在所有路径（包括错误）后都设置为 false
    isLoading.value = false;
    console.log('[App Init] Core initialization finished.');
  }
}

// 加载Electron默认配置
const loadElectronDefaultConfig = async () => {
  try {
    console.log('尝试获取Electron默认配置路径...');
    // 获取默认配置路径
    const defaultConfigPath = await getDefaultEspansoConfigPath();
    console.log('默认配置路径:', defaultConfigPath);

    if (!defaultConfigPath) {
      console.log('未找到默认配置路径');
      return false;
    }

    // 确保路径使用正确的分隔符
    const normalizedConfigPath = defaultConfigPath.replace(/\\/g, '/');

    // 扫描配置目录
    console.log('扫描目录结构...');
    const fileTree = await scanDirectory(normalizedConfigPath);
    configData.value = fileTree;
    console.log('文件树结构:', fileTree);

    // 保存配置目录路径
    saveConfigDirPath(normalizedConfigPath);

    // 直接加载整个配置目录，让新的树结构逻辑处理文件
    console.log('加载配置目录:', normalizedConfigPath);
    await store.loadConfig(normalizedConfigPath);

    // 检查是否成功加载
    const hasMatches = store.getAllMatchesFromTree().length > 0;
    const hasGroups = store.getAllGroupsFromTree().length > 0;
    const hasGlobalConfig = store.state.globalConfig !== null;

    console.log('加载结果:', {
      hasMatches,
      hasGroups,
      hasGlobalConfig,
      configTree: store.state.configTree.length
    });

    return hasMatches || hasGroups || hasGlobalConfig || store.state.configTree.length > 0;
  } catch (error: any) {
    console.error('加载Electron默认配置失败:', error);
    return false;
  }
};

// 递归查找默认配置文件路径
const findDefaultConfigPath = (nodes: FileSystemNode[]): string | null => {
  for (const node of nodes) {
    if (node.type === 'directory' && node.name === 'config') {
      // 在config目录中查找default.yml
      if (node.children) {
        const defaultConfig = node.children.find(
          child => child.type === 'file' && (child.name === 'default.yml' || child.name === 'default.yaml')
        );
        if (defaultConfig) {
          return defaultConfig.path;
        }
      }
    } else if (node.type === 'directory' && node.children) {
      // 递归查找子目录
      const result = findDefaultConfigPath(node.children);
      if (result) {
        return result;
      }
    }
  }
  return null;
};

// 选择配置文件夹
const selectConfigFolder = async () => {
  try {
    isLoading.value = true;
    const selectedPath = await showOpenDirectoryDialog();
    console.log('选择的路径:', selectedPath);

    if (selectedPath) {
      // 标准化路径
      const normalizedPath = selectedPath.replace(/\\/g, '/');

      console.log('环境:', environment.value);
      console.log('选择的配置目录:', normalizedPath);

      try {
        let isValidEspansoDir = false;

        if (environment.value === 'web') {
          // Web 环境下的文件检查逻辑
          const input = document.createElement('input');
          input.type = 'file';
          input.webkitdirectory = true;

          const files = await new Promise<FileList | null>((resolve) => {
            input.onchange = (e) => resolve((e.target as HTMLInputElement).files);
            input.click();
          });

          if (files) {
            // 检查是否包含 config/default.yml 或 match 目录
            let hasConfigDefault = false;
            let hasMatchDir = false;

            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const path = file.webkitRelativePath;

              if (path.endsWith('config/default.yml')) {
                hasConfigDefault = true;
              }

              if (path.includes('/match/') && path.endsWith('.yml')) {
                hasMatchDir = true;
              }
            }

            isValidEspansoDir = hasConfigDefault || hasMatchDir;
          }
        } else {
          // Electron 环境下的文件检查逻辑
          // 扫描目录结构
          const fileTree = await scanDirectory(normalizedPath);

          // 检查是否包含 config/default.yml 或 match 目录
          const hasConfigDir = fileTree.some(node =>
            node.type === 'directory' && node.name === 'config'
          );

          const hasMatchDir = fileTree.some(node =>
            node.type === 'directory' && node.name === 'match'
          );

          isValidEspansoDir = hasConfigDir || hasMatchDir;
        }

        console.log('是否为有效的Espanso目录:', isValidEspansoDir);

        if (isValidEspansoDir) {
          console.log('有效的Espanso目录，正在保存路径...');
          // 保存选择的路径
          saveConfigDirPath(normalizedPath);

          // 加载配置
          console.log('正在加载配置...');
          await store.loadConfig(normalizedPath);

          // 检查是否成功加载
          const hasMatches = store.getAllMatchesFromTree().length > 0;
          const hasGroups = store.getAllGroupsFromTree().length > 0;
          const hasGlobalConfig = store.state.globalConfig !== null;
          const hasConfigTree = store.state.configTree.length > 0;

          console.log('加载结果:', {
            hasMatches,
            hasGroups,
            hasGlobalConfig,
            configTree: store.state.configTree.length
          });

          if (hasMatches || hasGroups || hasGlobalConfig || hasConfigTree) {
            needsConfigSelection.value = false;
            console.log('配置加载完成');
          } else {
            throw new Error('未找到有效的配置文件');
          }
        } else {
          throw new Error('选择的目录不是有效的Espanso配置目录');
        }
      } catch (error: any) {
        console.error('无效的 Espanso 配置文件夹:', error);
        alert(`请选择有效的 Espanso 配置文件夹，该文件夹应包含 config 或 match 目录\n\n错误详情：${error.message}`);
      }
    }
  } catch (error: any) {
    console.error('选择配置文件夹失败:', error);
    alert(`选择配置文件夹失败：${error.message}`);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style lang="postcss">
.app-container {
  @apply h-screen w-screen overflow-hidden;
}

.config-selector {
  @apply h-full flex justify-center items-center p-5;
}

/* Toast Transition Styles */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(100%, 0); /* Start from the right */
}

.toast-fade-enter-to,
.toast-fade-leave-from {
  opacity: 1;
  transform: translate(0, 0); /* End at final position */
}
</style>
