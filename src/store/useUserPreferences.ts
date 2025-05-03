import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface UserPreferences {
  hideUnsavedChangesWarning: boolean;
}

export const useUserPreferences = defineStore('userPreferences', () => {
  // 初始化状态，从 localStorage 加载
  const loadPreferences = (): UserPreferences => {
    try {
      const savedPrefs = localStorage.getItem('userPreferences');
      if (savedPrefs) {
        return JSON.parse(savedPrefs);
      }
    } catch (error) {
      console.error('加载用户偏好设置失败:', error);
    }
    
    // 默认设置
    return {
      hideUnsavedChangesWarning: false
    };
  };

  // 用户偏好设置
  const preferences = ref<UserPreferences>(loadPreferences());

  // 保存偏好设置到 localStorage
  const savePreferences = () => {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences.value));
    } catch (error) {
      console.error('保存用户偏好设置失败:', error);
    }
  };

  // 更新单个偏好设置
  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    preferences.value[key] = value;
    savePreferences();
  };

  return {
    preferences,
    updatePreference
  };
});
