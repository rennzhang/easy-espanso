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

      <!-- 自动保存状态提示 -->
      <div v-if="autoSaveStatus"
           class="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg transition-all duration-300"
           :class="{
             'bg-primary text-primary-foreground': autoSaveStatus === 'saving',
             'bg-green-500 text-white': autoSaveStatus === 'saved',
             'bg-destructive text-destructive-foreground': autoSaveStatus === 'error'
           }">
        <div class="flex items-center gap-2">
          <LoaderIcon v-if="autoSaveStatus === 'saving'" class="h-4 w-4 animate-spin" />
          <CheckIcon v-else-if="autoSaveStatus === 'saved'" class="h-4 w-4" />
          <XIcon v-else-if="autoSaveStatus === 'error'" class="h-4 w-4" />
          <span>
            {{ autoSaveStatusText }}
          </span>
        </div>
      </div>
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

// 声明全局 window 对象的类型
declare global {
  interface Window {
    preloadApi?: PreloadApi;
  }
}

// 导入 shadcn/vue 组件
import Button from './components/ui/button.vue';
import Card from './components/ui/card.vue';
import CardHeader from './components/ui/card-header.vue';
import CardTitle from './components/ui/card-title.vue';
import CardDescription from './components/ui/card-description.vue';
import CardContent from './components/ui/card-content.vue';

const store = useEspansoStore();
const isLoading = ref(true);
const needsConfigSelection = ref(false);
const environment = ref<'electron' | 'web'>('web');
const configData = ref<FileSystemNode[]>([]);

// 自动保存状态文本
const autoSaveStatus = computed(() => store.state.autoSaveStatus);
const autoSaveStatusText = computed(() => {
  switch (store.state.autoSaveStatus) {
    case 'saving':
      return '正在保存...';
    case 'saved':
      return '已保存';
    case 'error':
      return '保存失败';
    default:
      return '';
  }
});

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
    await saveConfigDirPath(normalizedConfigPath);

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

// 检测运行环境并初始化
onMounted(async () => {
  try {
    // 检测环境
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
        return;
      }
    }

    // 尝试从本地存储获取配置目录
    const configDir = await getEspansoConfigDir();
    console.log('从本地存储获取配置目录:', configDir);

    if (configDir) {
      // 如果找到配置目录，直接加载配置
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
        console.log('配置目录无效或为空，显示选择界面');
        needsConfigSelection.value = true;
      }
    } else {
      // 如果没有找到配置目录，显示选择界面
      console.log('未找到配置目录，显示选择界面');
      needsConfigSelection.value = true;
    }
  } catch (error) {
    console.error('初始化失败:', error);
    needsConfigSelection.value = true;
  } finally {
    isLoading.value = false;
  }
});

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
</style>
