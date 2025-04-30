<template>
  <form @submit.prevent="onSubmit" class="space-y-6">
    <!-- 基本信息区域 -->
    <div class="space-y-6">
      <div class="space-y-2">
        <div class="flex items-center">
          <label for="trigger" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            触发词
          </label>
          <Tooltip content="输入规则的触发词，按下空格后将被替换为指定内容" position="right" class="ml-1 flex items-center">
            <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </Tooltip>
        </div>
        <Input
          id="trigger"
          v-model="formState.trigger"
          placeholder="例如: :hello"
          required
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center">
          <label for="label" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            描述
          </label>
          <Tooltip content="为规则添加简短描述，方便识别和管理" position="right" class="ml-1 flex items-center">
            <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </Tooltip>
        </div>
        <Input
          id="label"
          v-model="formState.label"
          placeholder="可选的规则描述"
        />
      </div>
    </div>

    <!-- 内容类型选择器 -->
    <div class="space-y-2">
      <div class="flex items-center">
        <label class="text-sm font-medium leading-none">内容类型</label>
        <Tooltip content="选择替换内容的类型，如纯文本、Markdown等" position="right" class="ml-1 flex items-center">
          <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </Tooltip>
      </div>
      <TypeSelector
        v-model="currentContentType"
        :options="contentTypeOptions"
      />
    </div>

    <!-- 内容编辑区域 -->
    <div class="space-y-4">
      <div class="space-y-2">
        <div class="flex items-center">
          <label for="content" class="text-sm font-medium leading-none">替换内容</label>
          <Tooltip content="输入触发词将被替换的内容，可以包含变量" position="right" class="ml-1 flex items-center">
            <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </Tooltip>
        </div>
        <div class="relative">
          <textarea
            id="content"
            v-if="currentContentType === 'plain'"
            v-model="formState.content"
            rows="5"
            placeholder="替换内容"
            required
            ref="contentEditorRef"
            class="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          ></textarea>

          <!-- 其他内容类型的编辑器 -->
          <textarea
            v-else-if="currentContentType === 'markdown'"
            v-model="formState.content"
            rows="5"
            placeholder="Markdown 内容"
            required
            ref="contentEditorRef"
            class="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          ></textarea>

          <textarea
            v-else-if="currentContentType === 'html'"
            v-model="formState.content"
            rows="5"
            placeholder="HTML 内容"
            required
            ref="contentEditorRef"
            class="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          ></textarea>

          <div v-else-if="currentContentType === 'image'" class="space-y-2">
            <Input
              type="file"
              accept="image/*"
              @change="handleImageUpload"
              class="w-full"
            />
            <div v-if="formState.content" class="mt-2">
              <img :src="formState.content" alt="预览" class="max-w-full max-h-[200px] rounded-md" />
            </div>
          </div>

          <div v-else-if="currentContentType === 'form'" class="space-y-2">
            <div class="flex items-center">
              <p class="text-sm text-muted-foreground">表单功能</p>
              <Tooltip content="表单功能允许创建交互式表单，用户可以在使用片段时输入内容" position="right" class="ml-1 flex items-center">
                <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </Tooltip>
            </div>
            <textarea
              v-model="formState.content"
              rows="5"
              placeholder="表单定义 (JSON 格式)"
              required
              ref="contentEditorRef"
              class="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- 变量工具栏 -->
      <div class="flex flex-wrap gap-2">
        <VariableSelector @select="insertVariable">
          <template #default="{ showModal }">
            <Button type="button" variant="outline" @click="showModal" class="flex items-center gap-2">
              <PlusIcon class="h-4 w-4" />
              插入变量
            </Button>
          </template>
        </VariableSelector>

        <Button type="button" variant="outline" @click="insertCommonVariable('date')" class="flex items-center gap-2">
          <CalendarIcon class="h-4 w-4" />
          日期
        </Button>

        <Button type="button" variant="outline" @click="insertCommonVariable('clipboard')" class="flex items-center gap-2">
          <ClipboardIcon class="h-4 w-4" />
          剪贴板
        </Button>

        <Button type="button" variant="outline" @click="showPreview" class="flex items-center gap-2">
          <EyeIcon class="h-4 w-4" />
          预览
        </Button>
      </div>
    </div>

    <!-- 高级选项区域 (可折叠) -->
    <div class="mt-4">
      <button
        type="button"
        class="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        @click="showAdvancedOptions = !showAdvancedOptions"
      >
        <ChevronRightIcon v-if="!showAdvancedOptions" class="h-4 w-4 mr-1" />
        <ChevronDownIcon v-else class="h-4 w-4 mr-1" />
        高级选项
      </button>

      <div v-if="showAdvancedOptions" class="mt-4 space-y-6">
        <!-- 词边界设置 -->
        <div class="space-y-2">
          <div class="flex items-center">
            <h4 class="text-sm font-medium">词边界设置</h4>
            <Tooltip content="控制触发词在什么情况下被识别，例如是否需要在单词边界处" position="right" class="ml-1 flex items-center">
              <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Tooltip>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="flex items-center space-x-2">
              <Checkbox id="word" v-model="formState.word" />
              <label for="word" class="text-sm font-medium leading-none">
                仅在词边界触发
              </label>
            </div>

            <div class="flex items-center space-x-2">
              <Checkbox id="leftWord" v-model="formState.leftWord" />
              <label for="leftWord" class="text-sm font-medium leading-none">
                左侧词边界
              </label>
            </div>

            <div class="flex items-center space-x-2">
              <Checkbox id="rightWord" v-model="formState.rightWord" />
              <label for="rightWord" class="text-sm font-medium leading-none">
                右侧词边界
              </label>
            </div>
          </div>
        </div>

        <!-- 大小写处理 -->
        <div class="space-y-2">
          <div class="flex items-center">
            <h4 class="text-sm font-medium">大小写处理</h4>
            <Tooltip content="控制替换内容的大小写处理方式" position="right" class="ml-1 flex items-center">
              <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Tooltip>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center space-x-2">
              <Checkbox id="propagateCase" v-model="formState.propagateCase" />
              <label for="propagateCase" class="text-sm font-medium leading-none">
                传播大小写
              </label>
            </div>

            <div class="space-y-1">
              <label for="uppercaseStyle" class="text-sm font-medium leading-none">
                大写样式
              </label>
              <select
                id="uppercaseStyle"
                v-model="formState.uppercaseStyle"
                class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">无</option>
                <option value="capitalize_words">首字母大写</option>
                <option value="uppercase_first">第一个字母大写</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 插入模式 -->
        <div class="space-y-2">
          <div class="flex items-center">
            <h4 class="text-sm font-medium">插入模式</h4>
            <Tooltip content="控制内容如何被插入，通过剪贴板或模拟按键" position="right" class="ml-1 flex items-center">
              <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Tooltip>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label for="forceMode" class="text-sm font-medium leading-none">
                强制模式
              </label>
              <select
                id="forceMode"
                v-model="formState.forceMode"
                class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">默认</option>
                <option value="clipboard">剪贴板</option>
                <option value="keys">按键</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 应用限制 -->
        <div class="space-y-2">
          <div class="flex items-center">
            <h4 class="text-sm font-medium">应用限制</h4>
            <Tooltip content="限制片段在哪些应用中生效或不生效" position="right" class="ml-1 flex items-center">
              <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Tooltip>
          </div>
          <div class="grid grid-cols-1 gap-4">
            <div class="space-y-1">
              <label class="text-sm font-medium leading-none">
                生效的应用
              </label>
              <TagInput
                :modelValue="formState.apps || []"
                @update:modelValue="val => formState.apps = val"
                placeholder="添加应用名称，回车确认"
              />
            </div>

            <div class="space-y-1">
              <label class="text-sm font-medium leading-none">
                排除的应用
              </label>
              <TagInput
                :modelValue="formState.excludeApps || []"
                @update:modelValue="val => formState.excludeApps = val"
                placeholder="添加应用名称，回车确认"
              />
            </div>
          </div>
        </div>

        <!-- 搜索设置 -->
        <div class="space-y-2">
          <div class="flex items-center">
            <h4 class="text-sm font-medium">搜索设置</h4>
            <Tooltip content="添加额外的关键词，用于在搜索时匹配此片段" position="right" class="ml-1 flex items-center">
              <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Tooltip>
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium leading-none">
              额外搜索词
            </label>
            <TagInput
              :modelValue="formState.searchTerms || []"
              @update:modelValue="val => formState.searchTerms = val"
              placeholder="添加搜索词，回车确认"
            />
          </div>
        </div>

        <!-- 其他设置 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <div class="flex items-center">
              <label for="priority" class="text-sm font-medium leading-none">
                优先级
              </label>
              <Tooltip content="当多个片段可能匹配时，优先级高的会被优先使用" position="right" class="ml-1 flex items-center">
                <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </Tooltip>
            </div>
            <Input
              id="priority"
              v-model.number="formState.priority"
              type="number"
              placeholder="0"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center">
              <label for="hotkey" class="text-sm font-medium leading-none">
                快捷键
              </label>
              <Tooltip content="设置快捷键来触发此片段，例如 alt+h" position="right" class="ml-1 flex items-center">
                <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </Tooltip>
            </div>
            <Input
              id="hotkey"
              v-model="formState.hotkey"
              placeholder="例如: alt+h"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 预览模态框 -->
    <div v-if="showPreviewModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showPreviewModal = false"></div>
      <div class="relative bg-background rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold">预览 "{{ formState.trigger }}"</h2>
          <button @click="showPreviewModal = false" class="text-gray-500 hover:text-gray-700">
            <XIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="p-4 overflow-auto max-h-[calc(80vh-120px)]">
          <div class="p-3 border rounded-md bg-muted/10">
            <pre class="whitespace-pre-wrap text-sm">{{ previewContent }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 表单按钮 -->
    <div class="flex gap-2 mt-6">
      <Button type="submit" variant="default">保存</Button>
      <Button type="button" variant="outline" @click="onCancel">取消</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { EspansoRule } from '../../types/espanso-config';
import Button from '../ui/button.vue';
import Input from '../ui/input.vue';
import Checkbox from '../ui/checkbox.vue';
import TagInput from '../common/TagInput.vue';
import VariableSelector from './VariableSelector.vue';
import Tooltip from '../ui/tooltip.vue';
import TypeSelector from '../common/TypeSelector.vue';
import {
  PlusIcon,
  CalendarIcon,
  ClipboardIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
  HelpCircleIcon
} from 'lucide-vue-next';

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

// 扩展表单状态类型，添加更多字段
interface RuleFormState {
  trigger?: string;
  label?: string;
  content?: string;
  contentType?: 'plain' | 'markdown' | 'html' | 'image' | 'form';
  caseSensitive?: boolean;
  word?: boolean;
  leftWord?: boolean;
  rightWord?: boolean;
  propagateCase?: boolean;
  uppercaseStyle?: '' | 'capitalize_words' | 'uppercase_first';
  forceMode?: '' | 'clipboard' | 'keys';
  apps?: string[];
  excludeApps?: string[];
  searchTerms?: string[];
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
  leftWord: false,
  rightWord: false,
  propagateCase: false,
  uppercaseStyle: '',
  forceMode: '',
  apps: [],
  excludeApps: [],
  searchTerms: [],
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

// 内容编辑器引用
const contentEditorRef = ref<HTMLTextAreaElement | null>(null);

// 当前内容类型
const currentContentType = ref<'plain' | 'markdown' | 'html' | 'image' | 'form'>('plain');

// 高级选项显示状态
const showAdvancedOptions = ref(false);

// 预览模态框状态
const showPreviewModal = ref(false);
const previewContent = ref('');

// 不再需要内容类型图标

// 初始化表单
onMounted(() => {
  // 深拷贝props.rule到formState
  const ruleData = JSON.parse(JSON.stringify(props.rule));
  console.log('初始化表单数据:', ruleData);

  // 处理内容字段映射
  let content = '';
  let contentType: 'plain' | 'markdown' | 'html' | 'image' | 'form' = 'plain';

  if (ruleData.content) {
    // 如果有content字段，直接使用
    content = ruleData.content;
    contentType = (ruleData.contentType as 'plain' | 'markdown' | 'html' | 'image' | 'form') || 'plain';
  } else if (ruleData.replace) {
    // 如果没有content字段但有replace字段，使用replace
    content = ruleData.replace;
    contentType = 'plain';
  } else if (ruleData.markdown) {
    content = ruleData.markdown;
    contentType = 'markdown';
  } else if (ruleData.html) {
    content = ruleData.html;
    contentType = 'html';
  } else if (ruleData.image_path) {
    content = ruleData.image_path;
    contentType = 'image';
  }

  formState.value = {
    trigger: ruleData.trigger || '',
    label: ruleData.label || ruleData.description || '',
    content: content,
    contentType: contentType,
    caseSensitive: ruleData.caseSensitive || false,
    word: ruleData.word || false,
    leftWord: ruleData.left_word || false,
    rightWord: ruleData.right_word || false,
    propagateCase: ruleData.propagate_case || false,
    uppercaseStyle: ruleData.uppercase_style || '',
    forceMode: ruleData.force_mode || '',
    apps: ruleData.apps || [],
    excludeApps: ruleData.exclude_apps || [],
    searchTerms: ruleData.search_terms || [],
    priority: ruleData.priority || 0,
    hotkey: ruleData.hotkey || ''
  };

  currentContentType.value = contentType as 'plain' | 'markdown' | 'html' | 'image' | 'form';

  // 如果有高级选项，自动展开高级选项区域
  if (
    formState.value.leftWord ||
    formState.value.rightWord ||
    formState.value.propagateCase ||
    formState.value.uppercaseStyle ||
    formState.value.forceMode ||
    (formState.value.apps && formState.value.apps.length > 0) ||
    (formState.value.excludeApps && formState.value.excludeApps.length > 0) ||
    (formState.value.searchTerms && formState.value.searchTerms.length > 0)
  ) {
    showAdvancedOptions.value = true;
  }
});

// 监听props变化
watch(() => props.rule, (newRule) => {
  const ruleData = JSON.parse(JSON.stringify(newRule));
  console.log('监听到props变化:', ruleData);

  // 处理内容字段映射
  let content = '';
  let contentType: 'plain' | 'markdown' | 'html' | 'image' | 'form' = 'plain';

  if (ruleData.content) {
    // 如果有content字段，直接使用
    content = ruleData.content;
    contentType = (ruleData.contentType as 'plain' | 'markdown' | 'html' | 'image' | 'form') || 'plain';
  } else if (ruleData.replace) {
    // 如果没有content字段但有replace字段，使用replace
    content = ruleData.replace;
    contentType = 'plain';
  } else if (ruleData.markdown) {
    content = ruleData.markdown;
    contentType = 'markdown';
  } else if (ruleData.html) {
    content = ruleData.html;
    contentType = 'html';
  } else if (ruleData.image_path) {
    content = ruleData.image_path;
    contentType = 'image';
  }

  formState.value = {
    trigger: ruleData.trigger || '',
    label: ruleData.label || ruleData.description || '',
    content: content,
    contentType: contentType,
    caseSensitive: ruleData.caseSensitive || false,
    word: ruleData.word || false,
    leftWord: ruleData.left_word || false,
    rightWord: ruleData.right_word || false,
    propagateCase: ruleData.propagate_case || false,
    uppercaseStyle: ruleData.uppercase_style || '',
    forceMode: ruleData.force_mode || '',
    apps: ruleData.apps || [],
    excludeApps: ruleData.exclude_apps || [],
    searchTerms: ruleData.search_terms || [],
    priority: ruleData.priority || 0,
    hotkey: ruleData.hotkey || ''
  };

  currentContentType.value = contentType;
}, { deep: true });

// 监听内容类型变化
watch(currentContentType, (newType) => {
  formState.value.contentType = newType;
});

// 不再需要设置内容类型的函数，因为我们使用了 v-model

// 处理图片上传
const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        formState.value.content = e.target.result;
      }
    };

    reader.readAsDataURL(file);
  }
};

// 插入变量
const insertVariable = (variable: { id: string; name: string; description: string }) => {
  if (!contentEditorRef.value) return;

  const textarea = contentEditorRef.value;
  const startPos = textarea.selectionStart;
  const endPos = textarea.selectionEnd;
  const currentContent = formState.value.content || '';

  // 插入变量占位符
  const newContent =
    currentContent.substring(0, startPos) +
    `{{${variable.id}}}` +
    currentContent.substring(endPos);

  formState.value.content = newContent;

  // 设置光标位置
  setTimeout(() => {
    textarea.focus();
    const newCursorPos = startPos + variable.id.length + 4; // 4 是 {{}} 的长度
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
};

// 插入常用变量
const insertCommonVariable = (variableId: string) => {
  insertVariable({ id: variableId, name: variableId, description: '' });
};

// 不再需要高亮变量的函数，因为我们不再显示预览

// 显示预览
const showPreview = () => {
  if (!formState.value.content) return;

  // 处理变量
  let content = formState.value.content;
  const variableRegex = /\{\{([^}]+)\}\}/g;

  content = content.replace(variableRegex, (_match, variableName) => {
    // 根据变量类型生成预览
    if (variableName === 'date') {
      return new Date().toLocaleDateString();
    } else if (variableName === 'time') {
      return new Date().toLocaleTimeString();
    } else if (variableName.startsWith('date:')) {
      return new Date().toLocaleString();
    } else if (variableName === 'clipboard') {
      return '[剪贴板内容]';
    } else if (variableName.startsWith('random')) {
      return Math.floor(Math.random() * 100).toString();
    } else if (variableName.startsWith('shell:')) {
      return '[Shell 命令结果]';
    } else if (variableName.startsWith('form:')) {
      return '[表单输入]';
    } else {
      return `[${variableName}]`;
    }
  });

  // 设置预览内容
  previewContent.value = content;

  // 显示预览模态框
  showPreviewModal.value = true;
};

// 提交表单
const onSubmit = () => {
  if (!formState.value.trigger || !formState.value.content) {
    return; // 简单验证
  }

  // 转换表单数据为 EspansoRule 格式
  const ruleData: Partial<EspansoRule> = {
    ...formState.value,
    // 转换字段名称以匹配 Espanso 格式
    left_word: formState.value.leftWord,
    right_word: formState.value.rightWord,
    propagate_case: formState.value.propagateCase,
    uppercase_style: formState.value.uppercaseStyle || undefined,
    force_mode: formState.value.forceMode || undefined,
    search_terms: formState.value.searchTerms
  };

  emit('save', props.rule.id, ruleData);
};

// 取消编辑
const onCancel = () => {
  emit('cancel');
};

// 不再需要删除规则的函数，因为我们移除了删除按钮
</script>
