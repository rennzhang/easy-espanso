<template>
  <form @submit.prevent="onSubmit" class="space-y-6">
    <div class="space-y-2">
      <label for="trigger" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        触发词
      </label>
      <Input
        id="trigger"
        v-model="formState.trigger"
        placeholder="例如: :hello"
        required
      />
      <p class="text-sm text-muted-foreground">
        输入规则的触发词，按下空格后将被替换为指定内容
      </p>
    </div>

    <div class="space-y-2">
      <label for="label" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        描述
      </label>
      <Input
        id="label"
        v-model="formState.label"
        placeholder="可选的规则描述"
      />
      <p class="text-sm text-muted-foreground">
        为规则添加简短描述，方便识别和管理
      </p>
    </div>

    <div class="space-y-2">
      <label for="contentType" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        内容类型
      </label>
      <select
        id="contentType"
        v-model="currentContentType"
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option v-for="option in contentTypeOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div class="space-y-2">
      <label for="content" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        内容
      </label>
      <textarea
        id="content"
        v-if="currentContentType === 'plain'"
        v-model="formState.content"
        rows="5"
        placeholder="替换内容"
        required
        class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      ></textarea>
      <p class="text-sm text-muted-foreground">
        输入触发词将被替换的内容
      </p>
    </div>

    <div class="space-y-4">
      <h3 class="text-sm font-medium">选项</h3>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex items-center space-x-2">
          <Checkbox id="caseSensitive" v-model="formState.caseSensitive" />
          <label for="caseSensitive" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            区分大小写
          </label>
        </div>

        <div class="flex items-center space-x-2">
          <Checkbox id="word" v-model="formState.word" />
          <label for="word" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            整词匹配
          </label>
        </div>
      </div>
    </div>

    <div class="space-y-2">
      <label for="priority" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        优先级
      </label>
      <Input
        id="priority"
        v-model.number="formState.priority"
        type="number"
        placeholder="0"
      />
      <p class="text-sm text-muted-foreground">
        值越高，优先级越高（可选）
      </p>
    </div>

    <div class="space-y-2">
      <label for="hotkey" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        快捷键
      </label>
      <Input
        id="hotkey"
        v-model="formState.hotkey"
        placeholder="例如: alt+h"
      />
      <p class="text-sm text-muted-foreground">
        可选的快捷键触发方式
      </p>
    </div>

    <div class="flex gap-2 mt-6">
      <Button type="submit">保存</Button>
      <Button type="button" variant="outline" @click="onCancel">取消</Button>
      <Button type="button" variant="destructive" @click="onDelete" class="ml-auto">删除</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { EspansoRule } from '../../types/espanso-config';
import Button from '../ui/button.vue';
import Input from '../ui/input.vue';
import Checkbox from '../ui/checkbox.vue';

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
  if (!formState.value.trigger || !formState.value.content) {
    return; // 简单验证
  }
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
