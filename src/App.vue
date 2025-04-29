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
            <div class="flex justify-center">
              <Button @click="selectConfigFolder">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clip-rule="evenodd" />
                  <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
                </svg>
                选择配置文件夹
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>
    <template v-else>
      <!-- 主布局 -->
      <MainLayout />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEspansoStore } from './store/useEspansoStore';
import { detectEnvironment, getEspansoConfigDir, showOpenDirectoryDialog, saveConfigDirPath } from './services/fileService';
import MainLayout from './components/layout/MainLayout.vue';

// 导入 shadcn/vue 组件
import Button from './components/ui/button.vue';
import Card from './components/ui/card.vue';
import CardHeader from './components/ui/card-header.vue';
import CardTitle from './components/ui/card-title.vue';
import CardDescription from './components/ui/card-description.vue';
import CardContent from './components/ui/card-content.vue';
import CardFooter from './components/ui/card-footer.vue';

const store = useEspansoStore();
const isLoading = ref(true);
const needsConfigSelection = ref(false);
const environment = ref<'electron' | 'utools' | 'web'>('web');

// 检测运行环境
onMounted(async () => {
  try {
    // 检测环境
    environment.value = detectEnvironment();
    console.log('当前运行环境:', environment.value);

    if (environment.value === 'web') {
      // Web环境需要手动选择配置文件夹
      const savedConfigDir = localStorage.getItem('espansoConfigDir');
      if (savedConfigDir) {
        // 尝试使用保存的配置目录
        await store.loadConfig(savedConfigDir);
        isLoading.value = false;
      } else {
        // 需要用户选择配置文件夹
        needsConfigSelection.value = true;
        isLoading.value = false;
      }
    } else if (environment.value === 'electron') {
      // Electron环境，使用自动检测，不显示选择界面
      try {
        // 自动获取配置目录并加载
        const configDir = getEspansoConfigDir();
        console.log('Electron环境自动检测到配置目录:', configDir);

        if (configDir) {
          await store.loadConfig();
          isLoading.value = false;
        } else {
          console.error('无法自动检测Espanso配置目录');
          needsConfigSelection.value = false; // 即使失败也不显示选择界面
          isLoading.value = false;
        }
      } catch (error) {
        console.error('自动加载配置失败:', error);
        needsConfigSelection.value = false; // 即使失败也不显示选择界面
        isLoading.value = false;
      }
    } else {
      // uTools或其他环境，使用自动检测
      await store.loadConfig();
      isLoading.value = false;
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    // 只有在Web环境下才显示选择界面
    needsConfigSelection.value = environment.value === 'web';
    isLoading.value = false;
  }
});

// 选择配置文件夹
const selectConfigFolder = async () => {
  try {
    isLoading.value = true;

    // 请求用户选择配置文件夹
    const selectedDir = await showOpenDirectoryDialog({
      title: '选择Espanso配置文件夹',
      buttonLabel: '选择文件夹'
    });

    if (selectedDir) {
      // 保存选择的配置目录
      saveConfigDirPath(selectedDir);

      // 加载配置
      await store.loadConfig(selectedDir);

      // 配置已加载，不再需要选择
      needsConfigSelection.value = false;
    } else {
      // 用户取消了选择
      isLoading.value = false;
    }
  } catch (error) {
    console.error('选择配置文件夹失败:', error);
    alert('选择配置文件夹时出错，请重试。');
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
