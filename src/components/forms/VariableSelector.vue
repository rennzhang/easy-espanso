<template>
  <div class="variable-selector">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="closeModal"></div>
      <div class="relative bg-background rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold">选择变量</h2>
          <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        </div>
        
        <div class="p-4 overflow-auto max-h-[calc(80vh-120px)]">
          <div class="space-y-2 mb-4">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="搜索变量..." 
              class="w-full p-2 border rounded-md"
            />
          </div>
          
          <div v-for="category in filteredCategories" :key="category.name" class="mb-6">
            <h3 class="text-md font-medium mb-3">{{ category.name }}</h3>
            <div class="space-y-2">
              <div
                v-for="variable in category.variables"
                :key="variable.id"
                @click="selectVariable(variable)"
                class="p-3 border rounded-md hover:bg-muted cursor-pointer"
              >
                <div class="flex items-start">
                  <div class="flex-1">
                    <div class="font-medium">{{ variable.name }}</div>
                    <div class="text-sm text-muted-foreground">{{ variable.description }}</div>
                  </div>
                  <div class="text-xs bg-gray-100 rounded px-2 py-1">
                    {{ variable.id }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div>
      <slot :showModal="showModal"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 变量类型定义
interface VariableItem {
  id: string;
  name: string;
  description: string;
  params?: Record<string, any>;
}

interface VariableCategory {
  name: string;
  variables: VariableItem[];
}

// 预定义变量类别
const categories = ref<VariableCategory[]>([
  {
    name: '日期和时间',
    variables: [
      { id: 'date', name: '当前日期', description: '以指定格式插入当前日期' },
      { id: 'date:format=%Y-%m-%d', name: '标准日期格式', description: '以 YYYY-MM-DD 格式插入日期' },
      { id: 'date:format=%H:%M', name: '当前时间', description: '以 HH:MM 格式插入当前时间' },
      { id: 'date:format=%Y-%m-%d %H:%M:%S', name: '日期和时间', description: '以 YYYY-MM-DD HH:MM:SS 格式插入日期和时间' }
    ]
  },
  {
    name: '系统',
    variables: [
      { id: 'clipboard', name: '剪贴板', description: '插入剪贴板当前内容' },
      { id: 'random:min=1,max=100', name: '随机数', description: '生成 1 到 100 之间的随机数' },
      { id: 'shell:cmd=echo $USER', name: '当前用户', description: '插入当前系统用户名' }
    ]
  },
  {
    name: '表单',
    variables: [
      { id: 'form:name=text_field,type=text', name: '文本字段', description: '创建一个简单的文本输入字段' },
      { id: 'form:name=multi_line,type=multiline', name: '多行文本', description: '创建一个多行文本输入字段' },
      { id: 'form:name=choices,type=choice,values=Option 1\\,Option 2\\,Option 3', name: '选择字段', description: '创建一个下拉选择字段' }
    ]
  }
]);

// 搜索功能
const searchQuery = ref('');
const filteredCategories = computed(() => {
  if (!searchQuery.value) {
    return categories.value;
  }

  const query = searchQuery.value.toLowerCase();
  return categories.value.map(category => {
    return {
      name: category.name,
      variables: category.variables.filter(variable => 
        variable.name.toLowerCase().includes(query) || 
        variable.description.toLowerCase().includes(query) ||
        variable.id.toLowerCase().includes(query)
      )
    };
  }).filter(category => category.variables.length > 0);
});

// 模态框控制
const show = ref(false);

// 打开模态框
const showModal = () => {
  show.value = true;
};

// 关闭模态框
const closeModal = () => {
  show.value = false;
};

// 处理变量选择
const emit = defineEmits<{
  select: [variable: VariableItem]
}>();

const selectVariable = (variable: VariableItem) => {
  emit('select', variable);
  closeModal();
};
</script> 