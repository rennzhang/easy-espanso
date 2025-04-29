<template>
  <div class="flex flex-col h-full bg-card">
    <div class="p-4 border-b border-border">
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-semibold text-foreground m-0">{{ headerTitle }}</h3>
        <div class="flex gap-2" v-if="selectedItem">
          <Button size="sm" @click="saveItem">
            <SaveIcon class="h-4 w-4 mr-1" />
            保存
          </Button>
          <Button size="sm" variant="destructive" @click="deleteItem">
            <TrashIcon class="h-4 w-4 mr-1" />
            删除
          </Button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="loading" class="flex flex-col justify-center items-center h-full gap-4">
        <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <div class="text-primary font-medium">加载中...</div>
      </div>
      <div v-else-if="!selectedItem" class="flex flex-col justify-center items-center h-full text-muted-foreground text-center p-8">
        <div class="text-5xl mb-4">👈</div>
        <h4 class="text-xl font-semibold text-foreground m-0 mb-2">未选择项目</h4>
        <p class="m-0 max-w-md">请从左侧列表选择一个规则或分组进行编辑</p>
      </div>
      <div v-else-if="selectedItem.type === 'rule'" class="max-w-2xl mx-auto">
        <RuleEditForm
          :rule="selectedItem"
          @save="saveRule"
          @cancel="cancelEdit"
          @delete="deleteRule"
        />
      </div>
      <div v-else-if="selectedItem.type === 'group'" class="max-w-2xl mx-auto">
        <GroupEditForm
          :group="selectedItem"
          @save="saveGroup"
          @cancel="cancelEdit"
          @delete="deleteGroup"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEspansoStore } from '../../store/useEspansoStore';
import { SaveIcon, TrashIcon } from 'lucide-vue-next';
import Button from '../ui/button.vue';
import RuleEditForm from '../forms/RuleEditForm.vue';
import GroupEditForm from '../forms/GroupEditForm.vue';
import { EspansoRule, EspansoGroup } from '../../types/espanso-config';

const store = useEspansoStore();
const selectedItem = computed(() => store.selectedItem);
const loading = computed(() => store.loading);

// 标题
const headerTitle = computed(() => {
  if (!selectedItem.value) return '详情';

  if (selectedItem.value.type === 'rule') {
    return `编辑规则: ${selectedItem.value.trigger}`;
  } else if (selectedItem.value.type === 'group') {
    return `编辑分组: ${selectedItem.value.name}`;
  }

  return '详情';
});

// 格式化日期
const formatDate = (timestamp: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 保存项目
const saveItem = () => {
  if (!selectedItem.value) return;

  if (selectedItem.value.type === 'rule') {
    saveRule(selectedItem.value.id, selectedItem.value);
  } else if (selectedItem.value.type === 'group') {
    saveGroup(selectedItem.value.id, selectedItem.value);
  }
};

// 删除项目
const deleteItem = () => {
  if (!selectedItem.value) return;

  if (selectedItem.value.type === 'rule') {
    deleteRule(selectedItem.value.id);
  } else if (selectedItem.value.type === 'group') {
    deleteGroup(selectedItem.value.id);
  }
};

// 保存规则
const saveRule = (id: string, updatedRule: Partial<EspansoRule>) => {
  store.updateRule(id, updatedRule);
};

// 保存分组
const saveGroup = (id: string, updatedGroup: Partial<EspansoGroup>) => {
  store.updateGroup(id, updatedGroup);
};

// 取消编辑
const cancelEdit = () => {
  store.setSelectedItemId('');
};

// 删除规则
const deleteRule = (id: string) => {
  store.deleteRule(id);
};

// 删除分组
const deleteGroup = (id: string) => {
  store.deleteGroup(id);
};
</script>


