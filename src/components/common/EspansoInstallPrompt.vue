<template>
  <div class="espanso-install-prompt">
    <Card class="max-w-lg mx-auto bg-card shadow-lg border rounded-xl overflow-hidden">
      <div class="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
        <div class="flex items-center justify-center text-white">
          <AlertTriangleIcon class="h-8 w-8 mr-3" />
          <h2 class="text-xl font-bold">{{ t('installation.notDetected') }}</h2>
        </div>
      </div>
      
      <CardContent class="p-6">
        <div class="flex flex-col items-center space-y-6">
          <div class="text-center space-y-3">
            <p class="text-lg font-medium text-card-foreground">
              {{ statusMessage || t('installation.needInstall') }}
            </p>
            <p class="text-sm text-muted-foreground">
              {{ t('installation.description') }}
            </p>
          </div>

          <div class="bg-muted px-4 py-3 rounded-lg w-full max-w-sm text-center">
            <div class="flex items-center justify-center space-x-2">
              <ComputerIcon class="h-5 w-5 text-muted-foreground" />
              <p class="text-sm font-medium">
                {{ t('installation.detectedOS') }}: <span class="font-bold">{{ osName }}</span>
              </p>
            </div>
          </div>
          
          <div v-if="errorDetails" class="bg-destructive/10 text-destructive px-4 py-3 rounded-lg w-full max-w-sm text-center">
            <div class="flex items-center justify-center space-x-2">
              <AlertCircleIcon class="h-5 w-5 text-destructive" />
              <p class="text-sm font-medium">{{ errorDetails }}</p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <div class="flex-1">
              <Button class="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" @click="openInstallGuide">
                <div class="flex items-center justify-center w-full">
                  <ExternalLinkIcon class="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{{ t('installation.viewInstallGuide') }}</span>
                </div>
              </Button>
            </div>

            <div class="flex-1">
              <Button variant="outline" class="w-full" @click="checkAgain" :disabled="isChecking">
                <div class="flex items-center justify-center w-full">
                  <RefreshCwIcon class="h-5 w-5 mr-2 flex-shrink-0" :class="{ 'animate-spin': isChecking }" />
                  <span>{{ t('installation.checkAgain') }}</span>
                </div>
              </Button>
            </div>
          </div>
          
          <div v-if="needsRestart" class="w-full max-w-sm">
            <Button variant="default" class="w-full bg-green-600 hover:bg-green-700" @click="startEspanso">
              <div class="flex items-center justify-center w-full">
                <PlayIcon class="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{{ t('installation.startService') }}</span>
              </div>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLinkIcon, RefreshCwIcon, AlertTriangleIcon, ComputerIcon, AlertCircleIcon, PlayIcon } from 'lucide-vue-next';
import { getOSType, getInstallGuideLink, checkEspansoInstalled } from '@/services/espansoInstallService';
import { openExternalLink } from '@/services/platformService';
import { PlatformAdapterFactory } from '@/services/platform/PlatformAdapterFactory';
import { toast } from 'vue-sonner';

const emit = defineEmits(['check-complete']);
const { t } = useI18n();

// 获取操作系统类型
const osType = getOSType();
const adapter = PlatformAdapterFactory.getInstance();
const isChecking = ref(false);
const needsRestart = ref(false);
const statusMessage = ref('');
const errorDetails = ref('');

// 操作系统名称映射
const osName = computed(() => {
  switch (osType) {
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return t('common.unknown');
  }
});

// 执行详细检查
const checkStatus = async () => {
  errorDetails.value = '';
  statusMessage.value = '';
  needsRestart.value = false;
  
  try {
    // 检查 which/where espanso 命令结果
    const platform = await adapter.getPlatform();
    const command = platform === 'win32' ? 'where espanso' : 'which espanso';
    
    try {
      const whichResult = await adapter.executeCommand(command);
      if (whichResult.trim().length > 0) {
        // 找到了 espanso 路径，检查 espanso status
        try {
          const statusResult = await adapter.executeCommand('espanso status');
          // 如果能执行 status 命令，但之前的检查显示 espanso 未正常运行，可能是其他问题
          // 此处不应该触发，因为如果 status 成功，checkEspansoInstalled 应该返回 true
          statusMessage.value = t('installation.installed');
          emit('check-complete', true);
        } catch (error) {
          // 找到 espanso 但 status 命令失败，说明 espanso 服务未运行
          statusMessage.value = t('installation.needStart');
          errorDetails.value = t('installation.serviceNotRunning');
          needsRestart.value = true;
        }
      } else {
        // which/where 命令成功但没有找到 espanso
        statusMessage.value = t('installation.needInstall');
        errorDetails.value = t('installation.espansoNotFound');
      }
    } catch (error) {
      // which/where 命令失败，说明 espanso 未安装
      statusMessage.value = t('installation.needInstall');
      errorDetails.value = t('installation.espansoNotInstalled');
    }
  } catch (error) {
    console.error('检测 Espanso 状态失败:', error);
    errorDetails.value = t('installation.checkFailed');
  }
};

// 打开安装指南
const openInstallGuide = async () => {
  const link = getInstallGuideLink();
  const success = await openExternalLink(link);
  
  if (!success) {
    toast.error(t('installation.openLinkFailed', '无法打开链接，请手动访问：') + link);
  }
};

// 启动 Espanso 服务
const startEspanso = async () => {
  isChecking.value = true;
  try {
    const platform = await adapter.getPlatform();
    const startCommand = platform === 'win32' 
      ? 'espanso start' // Windows 
      : 'espanso start';   // macOS/Linux
      
    await adapter.executeCommand(startCommand);
    toast.success(t('installation.serviceStarted'));
    
    // 给服务一点时间启动
    setTimeout(async () => {
      await checkAgain();
    }, 1000);
  } catch (error) {
    console.error('启动 Espanso 服务失败:', error);
    toast.error(t('installation.startFailed'));
    isChecking.value = false;
  }
};

// 重新检测
const checkAgain = async () => {
  if (isChecking.value) return;

  isChecking.value = true;
  toast.info(t('installation.checking'));

  try {
    const installed = await checkEspansoInstalled();

    if (installed) {
      toast.success(t('installation.installed'));
      emit('check-complete', true);
    } else {
      // 如果检测失败，尝试更详细地检查原因
      await checkStatus();
      toast.error(errorDetails.value || t('installation.notInstalled'));
      emit('check-complete', false);
    }
  } catch (error) {
    console.error('检测 Espanso 安装状态失败:', error);
    toast.error(t('installation.checkFailed'));
    emit('check-complete', false);
  } finally {
    isChecking.value = false;
  }
};

// 挂载时执行详细检查
onMounted(async () => {
  await checkStatus();
});
</script>

<style scoped>
.espanso-install-prompt {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 20px;
  background: radial-gradient(circle at center, rgba(240, 244, 248, 0.8) 0%, rgba(214, 224, 240, 0.6) 100%);
}

/* 添加卡片悬浮动画效果 */
.card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* 按钮悬浮效果 */
button {
  transition: transform 0.2s ease;
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
}
</style>
