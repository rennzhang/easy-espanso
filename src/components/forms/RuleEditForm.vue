<template>
  <UForm :state="formState" @submit="onSubmit" class="rule-form">
    <UFormGroup label="触发词" name="trigger">
      <UInput 
        v-model="formState.trigger" 
        placeholder="例如: :hello"
        required
      />
      <template #hint>
        输入规则的触发词，按下空格后将被替换为指定内容
      </template>
    </UFormGroup>

    <UFormGroup label="描述" name="label">
      <UInput 
        v-model="formState.label" 
        placeholder="可选的规则描述"
      />
      <template #hint>
        为规则添加简短描述，方便识别和管理
      </template>
    </UFormGroup>

    <UFormGroup label="内容类型" name="contentType">
      <USelect
        v-model="currentContentType"
        :options="contentTypeOptions"
      />
    </UFormGroup>

    <UFormGroup label="内容" name="content">
      <UTextarea 
        v-if="currentContentType === 'plain'" 
        v-model="formState.content"
        rows="5"
        placeholder="替换内容"
        required
      />
      <template #hint>
        输入触发词将被替换的内容
      </template>
    </UFormGroup>

    <div class="rule-options my-4">
      <h3 class="text-sm font-medium mb-2">选项</h3>
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup name="caseSensitive">
          <UCheckbox
            v-model="formState.caseSensitive"
            label="区分大小写"
          />
        </UFormGroup>

        <UFormGroup name="word">
          <UCheckbox
            v-model="formState.word"
            label="整词匹配"
          />
        </UFormGroup>
      </div>
    </div>

    <UFormGroup label="优先级" name="priority">
      <UInput 
        v-model.number="formState.priority" 
        type="number"
        placeholder="0"
      />
      <template #hint>
        值越高，优先级越高（可选）
      </template>
    </UFormGroup>

    <UFormGroup label="快捷键" name="hotkey">
      <UInput 
        v-model="formState.hotkey" 
        placeholder="例如: alt+h"
      />
      <template #hint>
        可选的快捷键触发方式
      </template>
    </UFormGroup>

    <div class="flex gap-2 mt-6">
      <UButton type="submit" color="primary">保存</UButton>
      <UButton type="button" color="gray" @click="onCancel">取消</UButton>
      <UButton type="button" color="red" variant="soft" @click="onDelete" class="ml-auto">删除</UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { EspansoRule } from '../../types/espanso-config';

// 定义props
const props = defineProps<{
  rule: EspansoRule
}>();

// 定义事件
const emit = defineEmits<{
  save: [id: string, updatedRule: Partial<EspansoRule>]
  cancel: []
  delete: [id: string]
}>();

// 表单状态类型，使其与EspansoRule兼容
interface RuleFormState {
  trigger?: string;
  label?: string;
  content?: string;
  contentType?: 'plain' | 'markdown' | 'html' | 'image' | 'form';
  caseSensitive?: boolean;
  word?: boolean;
  priority?: number;
  hotkey?: string;
}

// 表单状态
const formState = ref<RuleFormState>({
  trigger: '',
  label: '',
  content: '',
  contentType: 'plain',
  caseSensitive: false,
  word: false,
  priority: 0,
  hotkey: ''
});

// 内容类型选项
const contentTypeOptions = [
  { label: '纯文本', value: 'plain' },
  { label: '富文本', value: 'markdown' },
  { label: 'HTML', value: 'html' },
  { label: '图片', value: 'image' },
  { label: '表单', value: 'form' }
];

const currentContentType = ref<'plain' | 'markdown' | 'html' | 'image' | 'form'>('plain');

// 初始化表单
onMounted(() => {
  // 深拷贝props.rule到formState
  const ruleData = JSON.parse(JSON.stringify(props.rule));
  formState.value = {
    trigger: ruleData.trigger || '',
    label: ruleData.label || '',
    content: ruleData.content || '',
    contentType: ruleData.contentType || 'plain',
    caseSensitive: ruleData.caseSensitive || false,
    word: ruleData.word || false,
    priority: ruleData.priority || 0,
    hotkey: ruleData.hotkey || ''
  };
  currentContentType.value = (ruleData.contentType as 'plain' | 'markdown' | 'html' | 'image' | 'form') || 'plain';
});

// 监听props变化
watch(() => props.rule, (newRule) => {
  const ruleData = JSON.parse(JSON.stringify(newRule));
  formState.value = {
    trigger: ruleData.trigger || '',
    label: ruleData.label || '',
    content: ruleData.content || '',
    contentType: ruleData.contentType || 'plain',
    caseSensitive: ruleData.caseSensitive || false,
    word: ruleData.word || false,
    priority: ruleData.priority || 0,
    hotkey: ruleData.hotkey || ''
  };
  currentContentType.value = (ruleData.contentType as 'plain' | 'markdown' | 'html' | 'image' | 'form') || 'plain';
}, { deep: true });

// 监听内容类型变化
watch(currentContentType, (newType) => {
  formState.value.contentType = newType;
});

// 提交表单
const onSubmit = () => {
  // 表单验证由Nuxt UI处理
  emit('save', props.rule.id, formState.value);
};

// 取消编辑
const onCancel = () => {
  emit('cancel');
};

// 删除规则
const onDelete = () => {
  if (confirm('确定要删除这个规则吗？')) {
    emit('delete', props.rule.id);
  }
};
</script>

<style scoped>
.rule-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
