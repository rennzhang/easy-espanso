<template>
  <div class="app-container">
    <template v-if="isLoading">
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
      </div>
    </template>
    <template v-else-if="needsConfigSelection">
      <div class="config-selector">
        <div class="config-selector-content">
          <h1 class="config-selector-title">欢迎使用 Espanso GUI</h1>
          <p class="config-selector-description">
            请选择 Espanso 配置文件夹以开始使用
          </p>
          <div class="config-selector-buttons">
            <button class="btn-primary" @click="selectConfigFolder">
              选择配置文件夹
            </button>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <MainLayout />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEspansoStore } from './store/useEspansoStore';
import { detectEnvironment, getEspansoConfigDir, showOpenDirectoryDialog, saveConfigDirPath } from './services/fileService';
import MainLayout from './components/layout/MainLayout.vue';

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

<style>
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

.app-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 20px;
  font-size: 18px;
  color: #333;
}

.config-selector {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.config-selector-content {
  max-width: 600px;
  text-align: center;
  padding: 40px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.config-selector-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #333;
}

.config-selector-description {
  font-size: 16px;
  margin-bottom: 30px;
  color: #666;
}

.config-selector-buttons {
  display: flex;
  justify-content: center;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary:hover {
  background-color: #2563eb;
}
</style>
