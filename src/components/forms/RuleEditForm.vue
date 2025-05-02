<template>
  <form @submit.prevent="onSubmit" class="space-y-6">

    <!-- ========================= -->
    <!-- 1. 基本信息区 (始终可见) -->
    <!-- ========================= -->
    <div class="space-y-4">
      <!-- 触发词 -->
      <FormSection 
        label="触发词"
        helpContent="输入规则的触发词，多个请用英文逗号或换行分隔。"
        inputId="trigger"
      >
        <textarea
          id="trigger"
          v-model="formState.trigger"
          placeholder="例如: :hello, :你好\n:hi"
          required
          rows="3" 
          spellcheck="false" 
          class="flex min-h-[60px] w-full rounded-none border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gray-500 focus:shadow-lg transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
        ></textarea>
      </FormSection>

      <!-- 内容类型选择器 & 替换内容 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <label class="text-sm font-medium leading-none mr-2">替换内容</label>
            <HelpTip content="触发词最终替换的内容" />
          </div>

          <Menubar class="flex py-2 cursor-pointer">
            <MenubarMenu v-for="option in contentTypeOptions" :key="option.value">
              <MenubarTrigger 
                class="h-10 px-4 py-2 text-sm transition-colors duration-150 focus:outline-none"
                :class="{
                  'bg-primary text-primary-foreground hover:bg-primary/90': currentContentType === option.value,
                  'text-muted-foreground hover:bg-accent hover:text-accent-foreground': currentContentType !== option.value
                }"
                @click="currentContentType = option.value"
              >
                {{ option.label }}
              </MenubarTrigger>
            </MenubarMenu>
          </Menubar>
        </div>

        <!-- Editor Container -->
        <div class="border rounded-none overflow-hidden min-h-[250px] focus-within:border-gray-500 focus-within:shadow-lg transition-colors duration-150">
          <!-- 编辑器本身 -->
          <div class="relative">
            <textarea
              id="content"
              v-if="currentContentType === 'plain'"
              v-model="formState.content"
              rows="15"
              placeholder="替换内容"
              required
              ref="contentEditorRef"
              class="flex min-h-[250px] w-full appearance-none rounded-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:!shadow-none border-0 ring-0 resize-y"
              style="outline: none !important;"
            ></textarea>
            <textarea
              v-else-if="currentContentType === 'markdown'"
              v-model="formState.content"
              rows="15"
              placeholder="Markdown 内容"
              required
              ref="contentEditorRef"
              class="flex min-h-[250px] w-full appearance-none rounded-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:!shadow-none border-0 ring-0 resize-y"
              style="outline: none !important;"
            ></textarea>
            <textarea
              v-else-if="currentContentType === 'html'"
              v-model="formState.content"
              rows="15"
              placeholder="HTML 内容"
              required
              ref="contentEditorRef"
              class="flex min-h-[250px] w-full appearance-none rounded-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:!shadow-none border-0 ring-0 resize-y"
              style="outline: none !important;"
            ></textarea>
            <div v-else-if="currentContentType === 'image'" class="p-3 min-h-[250px]">
              <Input
                type="file"
                accept="image/*"
                @change="handleImageUpload"
                class="w-full h-auto px-2 py-1 mb-2"
              />
              <div v-if="formState.content" class="mt-2">
                <img :src="formState.content" alt="预览" class="max-w-full max-h-[200px] rounded-md" />
              </div>
            </div>
            <div v-else-if="currentContentType === 'form'" class="relative">
               <div class="flex items-center px-3 pt-2">
                 <p class="text-sm text-muted-foreground mr-2">表单功能</p>
                 <HelpTip content="表单功能允许创建交互式表单，用户可以在使用片段时输入内容" />
               </div>
               <textarea
                v-model="formState.content"
                rows="15"
                placeholder="表单定义 (JSON 格式)"
                required
                ref="contentEditorRef"
                class="flex min-h-[250px] w-full appearance-none rounded-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:!shadow-none border-0 ring-0 resize-y"
                style="outline: none !important;"
              ></textarea>
            </div>
          </div>

          <!-- 新的底部工具栏 -->
          <TooltipProvider :delay-duration="200">
            <div class="flex items-center gap-1 p-1.5 border-t bg-muted/50">
              
              <!-- Replacement Mode Label and HelpTip (Moved Left & Renamed) -->
              <div class="flex items-center mr-2">
                  <Label class="text-xs font-medium mr-1">替换模式</Label> 
                  <HelpTip content="控制内容如何替换触发词，通过剪贴板或模拟按键" />
              </div>

              <!-- Insertion Mode Menubar (Moved Left) -->
              <Menubar class="border rounded-none overflow-hidden p-0 shadow-none mr-2">
                <template v-for="(option, index) in insertionModeOptions" :key="option.value">
                  <MenubarMenu> 
                    <TooltipProvider v-if="option.value === 'default'" :delay-duration="100">
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <MenubarTrigger
                            @click="formState.forceMode = ''"
                            class="px-2 py-2 text-xs focus:outline-none shadow-none rounded-none cursor-pointer"
                            :class="[
                              { 'border-l': index > 0 },
                              (!formState.forceMode || formState.forceMode === 'default') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                            ]"
                          >
                            {{ option.label }}
                          </MenubarTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>自动模式: Espanso 会根据内容长度 (阈值默认100字符) 自动选择插入方式 (按键或剪贴板)。</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <MenubarTrigger
                      v-else
                      @click="formState.forceMode = option.value"
                      class="px-2 py-2 text-xs focus:outline-none shadow-none rounded-none cursor-pointer"
                      :class="[
                        { 'border-l': index > 0 },
                        formState.forceMode === option.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      ]"
                    >
                      {{ option.label }}
                    </MenubarTrigger>
                  </MenubarMenu>
                </template>
              </Menubar>

              <div class="flex-grow"></div> <!-- Spacer -->
              
              <!-- New Insert Dropdown -->
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button type="button" variant="ghost" size="sm" class="h-7 px-2 focus:outline-none" style="outline: none !important; box-shadow: none !important;">
                    <span>插入</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click="insertCommonVariable('clipboard')">
                    <ClipboardIcon class="mr-2 h-4 w-4" />
                    <span>插入剪贴板</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="insertVariable({ id: 'cursor', name: '光标', description: '插入光标位置' })">
                    <MousePointerClickIcon class="mr-2 h-4 w-4" />
                    <span>插入光标</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="insertCommonVariable('date')">
                     <CalendarIcon class="mr-2 h-4 w-4" />
                    <span>插入日期</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @click="variableSelectorRef?.showModal()">
                     <MoreHorizontalIcon class="mr-2 h-4 w-4" />
                    <span>更多</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <!-- Preview Button -->
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button type="button" variant="ghost" size="icon" @click="showPreview" class="h-7 w-7">
                    <EyeIcon class="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>预览内容</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <!-- VariableSelector Component moved inside TooltipProvider -->
            <VariableSelector ref="variableSelectorRef" @select="insertVariable" />
          </TooltipProvider>
        </div>
      </div>
    </div>

    <!-- ========================= -->
    <!-- 2. 常用选项区 (默认展开)  -->
    <!-- ========================= -->
    <div class="space-y-4 border-t pt-4">
      <!-- 标签 (描述) -->
      <FormSection
        label="标签 (描述)"
        helpContent="为规则添加简短描述，方便识别和管理"
        inputId="label"
      >
        <Input
          id="label"
          v-model="formState.label"
          placeholder="可选的规则描述"
          class="h-8 px-2 py-1"
        />
      </FormSection>

      <!-- 词边界设置 -->
      <div class="space-y-2">
        <div class="flex items-center">
          <h4 class="text-sm font-medium mr-2">词边界设置</h4>
          <HelpTip content="控制触发词在什么情况下被识别，例如是否需要在单词边界处" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div class="flex items-center space-x-1.5">
            <Checkbox id="word" v-model="formState.word" />
            <label for="word" class="text-sm font-medium leading-none">
              仅在词边界触发 (word)
            </label>
          </div>
          <div class="flex items-center space-x-1.5">
            <Checkbox id="leftWord" v-model="formState.leftWord" />
            <label for="leftWord" class="text-sm font-medium leading-none">
              左侧词边界 (left_word)
            </label>
          </div>
          <div class="flex items-center space-x-1.5">
            <Checkbox id="rightWord" v-model="formState.rightWord" />
            <label for="rightWord" class="text-sm font-medium leading-none">
              右侧词边界 (right_word)
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- REMOVED: Editor Toolbar -->

    <!-- ========================= -->
    <!-- 3. 高级选项区 (默认折叠)  -->
    <!-- ========================= -->
    <div class="mt-4 border-t pt-4">
      <button
        type="button"
        class="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors font-medium mb-3"
        @click="showAdvancedOptions = !showAdvancedOptions"
      >
        <ChevronRightIcon v-if="!showAdvancedOptions" class="h-4 w-4 mr-1" />
        <ChevronDownIcon v-else class="h-4 w-4 mr-1" />
        高级选项
      </button>

      <div v-if="showAdvancedOptions" class="space-y-4 pl-2">
        <!-- 大小写处理 -->
        <div class="space-y-2">
          <div class="flex items-center">
            <h4 class="text-sm font-medium mr-2">大小写处理</h4>
            <HelpTip content="控制替换内容的大小写处理方式" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div class="flex items-center space-x-1.5">
              <Checkbox id="propagateCase" v-model="formState.propagateCase" />
              <label for="propagateCase" class="text-sm font-medium leading-none">
                传播大小写 (propagate_case)
              </label>
            </div>
            <div class="space-y-1">
              <label for="uppercaseStyle" class="text-sm font-medium leading-none">
                大写样式 (uppercase_style)
              </label>
              <select
                id="uppercaseStyle"
                v-model="formState.uppercaseStyle"
                class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">无</option>
                <option value="capitalize_words">首字母大写</option>
                <option value="uppercase_first">第一个字母大写</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 应用限制 -->
        <div class="space-y-2">
          <div class="flex items-center">
            <h4 class="text-sm font-medium mr-2">应用限制</h4>
            <HelpTip content="限制片段在哪些应用中生效或不生效" />
          </div>
          <div class="grid grid-cols-1 gap-3">
            <div class="space-y-1">
              <label class="text-sm font-medium leading-none">
                生效的应用 (apps)
              </label>
              <TagInput
                :modelValue="formState.apps || []"
                @update:modelValue="(val: string[]) => formState.apps = val"
                placeholder="添加应用名称，回车确认"
                class="py-1"
              />
            </div>

            <div class="space-y-1">
              <label class="text-sm font-medium leading-none">
                排除的应用 (exclude_apps)
              </label>
              <TagInput
                :modelValue="formState.exclude_apps || []"
                @update:modelValue="(val: string[]) => formState.exclude_apps = val"
                placeholder="添加应用名称，回车确认"
                class="py-1"
              />
            </div>
          </div>
        </div>

        <!-- 搜索设置 -->
        <div class="space-y-2">
          <div class="flex items-center">
            <h4 class="text-sm font-medium mr-2">搜索设置</h4>
            <HelpTip content="添加额外的关键词，用于在搜索时匹配此片段" />
          </div>
          <div class="space-y-1 pt-1">
            <label class="text-sm font-medium leading-none">
              额外搜索词 (search_terms)
            </label>
            <TagInput
              :modelValue="formState.search_terms || []"
              @update:modelValue="(val: string[]) => formState.search_terms = val"
              placeholder="添加搜索词，回车确认"
              class="py-1"
            />
          </div>
        </div>

        <!-- 其他设置 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <!-- 优先级 -->
          <FormSection
            label="优先级 (priority)"
            helpContent="当多个片段可能匹配时，优先级高的会被优先使用"
            inputId="priority"
          >
            <Input
              id="priority"
              v-model.number="formState.priority"
              type="number"
              placeholder="0"
              class="h-8 px-2 py-1"
            />
          </FormSection>

          <!-- 快捷键 -->
          <FormSection
            label="快捷键 (hotkey)"
            helpContent="设置快捷键来触发此片段，例如 alt+h"
            inputId="hotkey"
          >
            <Input
              id="hotkey"
              v-model="formState.hotkey"
              placeholder="例如: alt+h"
              class="h-8 px-2 py-1"
            />
          </FormSection>
        </div>
      </div>
    </div>

    <!-- 预览模态框 -->
    <div v-if="showPreviewModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showPreviewModal = false"></div>
      <div class="relative bg-background rounded-none shadow-lg w-full max-w-xl max-h-[80vh] overflow-hidden">
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
  </form>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, onBeforeUnmount } from 'vue';
import { EspansoRule } from '../../types/espanso-config';
import { useEspansoStore } from '../../store/useEspansoStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import TagInput from '../common/TagInput.vue';
import VariableSelector from './VariableSelector.vue';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import HelpTip from '../common/HelpTip.vue';
import FormSection from '../common/FormSection.vue';
import {
  PlusIcon,
  CalendarIcon,
  ClipboardIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
  HelpCircleIcon,
  MousePointerClickIcon,
  MoreHorizontalIcon,
  TextCursorInputIcon
} from 'lucide-vue-next';
import type { Match } from '../../types/espanso'; // Import Match type
import { Transition } from 'vue'; // Ensure Transition is imported
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'; // Changed path
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu' // Removed @/ prefix

// 定义props
const props = defineProps<{
  rule: Match // Use Match type for props
}>();

// 定义事件
const emit = defineEmits<{
  save: [id: string, updatedRule: Partial<Match>]
  cancel: []
  delete: [id: string]
}>();

// 获取 store
const store = useEspansoStore();

// 表单状态接口 - 基于 Match 的字段
interface RuleFormState {
  trigger: string;
  label?: string;
  content?: string; // 通用内容字段，根据 contentType 映射到 Match 字段
  markdown?: string;
  html?: string;
  image_path?: string;
  word?: boolean;
  leftWord?: boolean;
  rightWord?: boolean;
  propagateCase?: boolean;
  uppercaseStyle?: 'capitalize_words' | 'uppercase_first' | ''; // Use empty string for default
  forceMode?: 'default' | 'clipboard' | 'keys' | ''; // Updated type, allowing empty string
  apps?: string[];
  exclude_apps?: string[];
  search_terms?: string[];
  priority?: number;
  hotkey?: string;
  vars?: { name: string; params?: Record<string, any> }[];
  contentType?: string; // 用于管理UI，不直接保存到Match
}

// 表单状态
const formState = ref<RuleFormState>({
  trigger: '',
  label: '',
  content: '',
  contentType: 'plain',
  word: false,
  leftWord: false,
  rightWord: false,
  propagateCase: false,
  uppercaseStyle: '', // Default is empty string
  forceMode: 'default', // Default is now 'default'
  apps: [],
  exclude_apps: [],
  search_terms: [],
  priority: 0,
  hotkey: ''
});

// Define insertion mode options for the button group
const insertionModeOptions = [
  { value: 'default', label: '自动' },
  { value: 'clipboard', label: '剪贴板' },
  { value: 'keys', label: '按键' }
];

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

// 表单是否已修改
const isFormModified = ref(false);
// 原始表单数据，用于比较是否有修改
const originalFormData = ref<RuleFormState | null>(null);

// Add ref for VariableSelector
const variableSelectorRef = ref<InstanceType<typeof VariableSelector> | null>(null);

// Expose only the method to get the current form data
defineExpose({
  getFormData: () => formState.value
});

// 辅助函数：根据 Match 数据确定初始 contentType
const determineInitialContentType = (ruleData: Match): 'plain' | 'markdown' | 'html' | 'image' | 'form' => {
  if (ruleData.content && ruleData.contentType) {
    return ruleData.contentType as 'plain' | 'markdown' | 'html' | 'image' | 'form';
  }
  if (ruleData.markdown) return 'markdown';
  if (ruleData.html) return 'html';
  if (ruleData.image_path) return 'image';
  if (ruleData.vars && ruleData.vars.some(v => v.name === 'form')) return 'form'; // Basic check for form vars
  // 默认或当只有 replace 时，认为是 plain
  return 'plain';
};

// 辅助函数：根据 Match 数据确定初始 content
const determineInitialContent = (ruleData: Match): string => {
  const contentType = determineInitialContentType(ruleData);
  switch (contentType) {
    case 'markdown': return ruleData.markdown || ruleData.content || '';
    case 'html': return ruleData.html || ruleData.content || '';
    case 'image': return ruleData.image_path || ruleData.content || '';
    case 'form': return ruleData.content || ''; // Assume content holds the form definition for now
    case 'plain':
    default:
      return ruleData.content || ruleData.replace || ''; // Fallback to replace if content is missing
  }
};


// 初始化表单
onMounted(() => {
  // 深拷贝props.rule到formState
  const ruleData = JSON.parse(JSON.stringify(props.rule));
  console.log('初始化表单数据:', ruleData);

  // --- 处理触发词: trigger or triggers --- START
  let triggerInput = '';
  if (Array.isArray(ruleData.triggers) && ruleData.triggers.length > 0) {
    triggerInput = ruleData.triggers.join('\n');
  } else if (ruleData.trigger) {
    triggerInput = ruleData.trigger;
  }
  // --- 处理触发词: trigger or triggers --- END


  formState.value = {
    trigger: triggerInput, // Use the processed trigger input
    label: ruleData.label || '',
    content: determineInitialContent(ruleData),
    word: ruleData.word || false,
    leftWord: ruleData.leftWord || ruleData.left_word || false,
    rightWord: ruleData.rightWord || ruleData.right_word || false,
    propagateCase: ruleData.propagateCase || ruleData.propagate_case || false,
    uppercaseStyle: ruleData.uppercaseStyle || ruleData.uppercase_style || '',
    forceMode: ruleData.forceMode === 'default' ? '' : (ruleData.forceMode || ruleData.force_mode || ''),
    apps: Array.isArray(ruleData.apps) ? [...ruleData.apps] : [],
    exclude_apps: Array.isArray(ruleData.exclude_apps) ? [...ruleData.exclude_apps] : [],
    search_terms: Array.isArray(ruleData.search_terms) ? [...ruleData.search_terms] : [],
    priority: ruleData.priority || 0,
    hotkey: ruleData.hotkey || '',
    vars: Array.isArray(ruleData.vars) ? [...ruleData.vars] : [],
    contentType: determineInitialContentType(ruleData)
  };

  // 保存原始表单数据
  originalFormData.value = JSON.parse(JSON.stringify(formState.value));

  // 重置表单修改状态
  isFormModified.value = false;

  // 更新 store 中的表单修改状态
  store.state.hasUnsavedChanges = false;

  currentContentType.value = formState.value.contentType as 'plain' | 'markdown' | 'html' | 'image' | 'form';

  // 如果有高级选项，自动展开高级选项区域
  if (
    formState.value.leftWord ||
    formState.value.rightWord ||
    formState.value.propagateCase ||
    formState.value.uppercaseStyle ||
    formState.value.forceMode ||
    (formState.value.apps && formState.value.apps.length > 0) ||
    (formState.value.exclude_apps && formState.value.exclude_apps.length > 0) ||
    (formState.value.search_terms && formState.value.search_terms.length > 0)
  ) {
    showAdvancedOptions.value = true;
  }
});

// 监听props变化
watch(() => props.rule, (newRule) => {
  const ruleData = JSON.parse(JSON.stringify(newRule));
  console.log('监听到props变化:', ruleData);

  // --- 处理触发词: trigger or triggers --- START
  let triggerInput = '';
  if (Array.isArray(ruleData.triggers) && ruleData.triggers.length > 0) {
    triggerInput = ruleData.triggers.join('\n');
  } else if (ruleData.trigger) {
    triggerInput = ruleData.trigger;
  }
  // --- 处理触发词: trigger or triggers --- END


  formState.value = {
    trigger: triggerInput, // Use the processed trigger input
    label: ruleData.label || '',
    content: determineInitialContent(ruleData),
    word: ruleData.word || false,
    leftWord: ruleData.leftWord || ruleData.left_word || false,
    rightWord: ruleData.rightWord || ruleData.right_word || false,
    propagateCase: ruleData.propagateCase || ruleData.propagate_case || false,
    uppercaseStyle: ruleData.uppercaseStyle || ruleData.uppercase_style || '',
    forceMode: ruleData.forceMode === 'default' ? '' : (ruleData.forceMode || ruleData.force_mode || ''),
    apps: Array.isArray(ruleData.apps) ? [...ruleData.apps] : [],
    exclude_apps: Array.isArray(ruleData.exclude_apps) ? [...ruleData.exclude_apps] : [],
    search_terms: Array.isArray(ruleData.search_terms) ? [...ruleData.search_terms] : [],
    priority: ruleData.priority || 0,
    hotkey: ruleData.hotkey || '',
    vars: Array.isArray(ruleData.vars) ? [...ruleData.vars] : [],
    contentType: determineInitialContentType(ruleData)
  };

  currentContentType.value = formState.value.contentType as 'plain' | 'markdown' | 'html' | 'image' | 'form';

  // 保存原始表单数据
  originalFormData.value = JSON.parse(JSON.stringify(formState.value));

  // 重置表单修改状态
  isFormModified.value = false;
  store.state.hasUnsavedChanges = false;
}, { deep: true });

// 监听内容类型变化
watch(currentContentType, (newType) => {
  formState.value.contentType = newType;
  checkFormModified();
});

// 监听表单变化
watch(formState, () => {
  checkFormModified();
}, { deep: true });

// 检查表单是否被修改
const checkFormModified = () => {
  const currentFormData = JSON.stringify({
    ...formState.value,
    contentType: undefined
  });
  // Ensure originalFormData is an object before spreading
  const originalDataForComparison = JSON.stringify({
    ...(originalFormData.value || {}), // Safely spread originalFormData
    contentType: undefined
  });

  isFormModified.value = currentFormData !== originalDataForComparison;
  store.state.hasUnsavedChanges = isFormModified.value;
};

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

// 显示预览
const showPreview = () => {
  if (!formState.value.content) return;

  // 处理变量
  let content = formState.value.content;
  const variableRegex = /\{\{([^}]+)\}\}/g; // Corrected Regex

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
      // 对于未知变量，保持原样
      return `{{${variableName}}}`;
    }
  });

  previewContent.value = content;
  showPreviewModal.value = true;
};

// 提交表单
const onSubmit = () => {
  // 简单验证
  if (!formState.value.trigger || (!formState.value.content && currentContentType.value !== 'image')) {
    alert('触发词和替换内容不能为空');
    return;
  }

  // 准备要保存的数据
  const dataToSave: Partial<Match> = {
    // Process trigger/triggers
    ...(formState.value.trigger.includes('\n') || formState.value.trigger.includes(',')
      ? { triggers: formState.value.trigger.split(/[\n,]/).map(t => t.trim()).filter(t => t) }
      : { trigger: formState.value.trigger.trim() }),
    // Explicitly delete the other trigger field if one exists
    ...(formState.value.trigger.includes('\n') || formState.value.trigger.includes(',') ? { trigger: undefined } : { triggers: undefined }),
    
    label: formState.value.label || undefined,
    word: formState.value.word || undefined,
    left_word: formState.value.leftWord || undefined,
    right_word: formState.value.rightWord || undefined,
    propagate_case: formState.value.propagateCase || undefined,
    uppercase_style: formState.value.uppercaseStyle || undefined,
    force_mode: (formState.value.forceMode === '' || formState.value.forceMode === 'default') ? undefined : formState.value.forceMode, // Map '' or 'default' to undefined
    apps: formState.value.apps && formState.value.apps.length > 0 ? formState.value.apps : undefined,
    exclude_apps: formState.value.exclude_apps && formState.value.exclude_apps.length > 0 ? formState.value.exclude_apps : undefined,
    search_terms: formState.value.search_terms && formState.value.search_terms.length > 0 ? formState.value.search_terms : undefined,
    priority: formState.value.priority || undefined,
    hotkey: formState.value.hotkey || undefined,
    vars: formState.value.vars && formState.value.vars.length > 0 ? formState.value.vars : undefined,

    // Reset content-specific fields first
    content: undefined,
    replace: undefined,
    markdown: undefined,
    html: undefined,
    image_path: undefined,
    contentType: undefined, // Remove UI-only field
  };

  // Add content based on currentContentType
  switch (currentContentType.value) {
    case 'plain':
      dataToSave.replace = formState.value.content;
      break;
    case 'markdown':
      dataToSave.markdown = formState.value.content;
      break;
    case 'html':
      dataToSave.html = formState.value.content;
      break;
    case 'image':
      dataToSave.image_path = formState.value.content;
      break;
    case 'form':
      // Store form definition in content, mark contentType
      dataToSave.content = formState.value.content;
      dataToSave.contentType = 'form'; // Explicitly set contentType for forms
      break;
  }

  // 保存后更新原始表单数据
  originalFormData.value = JSON.parse(JSON.stringify(formState.value));
  isFormModified.value = false;
  store.state.hasUnsavedChanges = false;

  console.log('正在保存:', dataToSave);
  emit('save', props.rule.id, dataToSave);
};

// 取消编辑
const onCancel = () => {
  if (isFormModified.value) {
    if (confirm('您有未保存的修改，确定要放弃这些修改吗？')) {
      isFormModified.value = false;
      store.state.hasUnsavedChanges = false;
      emit('cancel');
    }
  } else {
    emit('cancel');
  }
};

// 组件卸载前检查未保存的修改
onBeforeUnmount(() => {
  // 确保组件卸载时重置全局状态
  store.state.hasUnsavedChanges = false;
});
</script>
