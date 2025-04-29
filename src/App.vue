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
import { detectEnvironment, getEspansoConfigDir, showOpenDirectoryDialog, saveConfigDirPath, fileService } from './services/fileService';
import MainLayout from './components/layout/MainLayout.vue';
import { FolderIcon, LoaderIcon, CheckIcon, XIcon } from 'lucide-vue-next';
import type { PreloadApi } from './types/preload';

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

// 检测运行环境并初始化
onMounted(async () => {
  try {
    // 检测环境
    environment.value = await detectEnvironment();
    
    // 尝试获取配置目录
    const configDir = await getEspansoConfigDir();
    
    if (configDir) {
      // 如果找到配置目录，直接加载配置
      await store.loadConfig(configDir);
      needsConfigSelection.value = false;
    } else {
      // 如果没有找到配置目录，显示选择界面
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
      let configPath: string;
      let matchPath: string;
      
      if (environment.value === 'web') {
        // Web 环境下使用正斜杠
        configPath = `${selectedPath}/config/default.yml`;
        matchPath = `${selectedPath}/match`;
      } else {
        // Electron 环境下根据平台使用不同的分隔符
        const platform = await fileService.getPlatform();
        configPath = `${selectedPath}${platform === 'win32' ? '\\config\\default.yml' : '/config/default.yml'}`;
        matchPath = `${selectedPath}${platform === 'win32' ? '\\match' : '/match'}`;
      }
      
      console.log('环境:', environment.value);
      console.log('配置文件路径:', configPath);
      console.log('匹配文件夹路径:', matchPath);
      
      try {
        let configExists = false;
        
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
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.webkitRelativePath.endsWith('config/default.yml')) {
                configExists = true;
                break;
              }
            }
          }
        } else {
          // Electron 环境下的文件检查逻辑
          configExists = await fileService.existsFile(configPath);
        }
        
        console.log('配置文件状态:', configExists ? '存在' : '不存在');
        
        if (configExists) {
          console.log('配置文件有效，正在保存路径...');
          // 保存选择的路径
          await saveConfigDirPath(selectedPath);
          // 加载配置
          console.log('正在加载配置...');
          await store.loadConfig(configPath);
          needsConfigSelection.value = false;
          console.log('配置加载完成');
        } else {
          throw new Error('未找到 default.yml 配置文件');
        }
      } catch (error) {
        console.error('无效的 Espanso 配置文件夹:', error);
        alert(`请选择有效的 Espanso 配置文件夹，该文件夹必须包含 config/default.yml 文件\n\n错误详情：${error.message}`);
      }
    }
  } catch (error) {
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
