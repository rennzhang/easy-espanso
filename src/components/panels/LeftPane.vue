<template>
  <div class="left-pane flex flex-col h-full bg-[#353535] text-white w-[75px]">
    <!-- 导航按钮 -->
    <div class="flex flex-col items-center">
      <!-- 片段按钮 -->
      <div
        class="w-full flex flex-col items-center justify-center py-4 cursor-pointer"
        :class="{ 'bg-[#4a4a4a]': activeSection === 'rules' }"
        @click="setActiveSection('rules')"
      >
        <FileTextIcon class="h-6 w-6 mb-1" />
        <span class="text-xs">片段</span>
      </div>

      <!-- 设置按钮 -->
      <div
        class="w-full flex flex-col items-center justify-center py-4 cursor-pointer"
        :class="{ 'bg-[#4a4a4a]': activeSection === 'settings' }"
        @click="setActiveSection('settings')"
      >
        <SettingsIcon class="h-6 w-6 mb-1" />
        <span class="text-xs">设置</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import {
  FileTextIcon,
  SettingsIcon
} from 'lucide-vue-next';

const store = useEspansoStore();

// 当前活动的导航项
const activeSection = ref('rules');

// 设置活动的导航项
const setActiveSection = (section: string) => {
  activeSection.value = section;
};
</script>
