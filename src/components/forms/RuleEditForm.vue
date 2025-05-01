<template>
  <form @submit.prevent="onSubmit" class="space-y-6">

    <!-- ========================= -->
    <!-- 1. 基本信息区 (始终可见) -->
    <!-- ========================= -->
    <div class="space-y-4">
      <!-- 触发词 -->
      <div class="space-y-1.5">
        <div class="flex items-center">
          <label for="trigger" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mr-2">
            触发词
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>输入规则的触发词，多个请用英文逗号或换行分隔。</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <textarea
          id="trigger"
          v-model="formState.trigger"
          placeholder="例如: :hello, :你好\n:hi"
          required
          rows="3" 
          class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
        ></textarea>
      </div>

      <!-- 内容类型选择器 & 替换内容 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center">
            <label class="text-sm font-medium leading-none mr-2">内容类型</label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>选择替换内容的类型，如纯文本、Markdown等</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
           <Select v-model="currentContentType">
             <SelectTrigger class="h-7 text-sm px-2 py-1 w-auto focus:ring-1 focus:ring-ring">
               <SelectValue placeholder="选择类型" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem v-for="option in contentTypeOptions" :key="option.value" :value="option.value">
                 {{ option.label }}
               </SelectItem>
             </SelectContent>
           </Select>
        </div>

        <!-- Editor Container -->
        <div class="border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"> 
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
              class="flex min-h-[250px] w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border-0 ring-0 focus:ring-0 resize-y"
            ></textarea>
            <!-- Other editors... -->
            <textarea
              v-else-if="currentContentType === 'markdown'"
              v-model="formState.content"
              rows="15"
              placeholder="Markdown 内容"
              required
              ref="contentEditorRef"
              class="flex min-h-[250px] w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border-0 ring-0 focus:ring-0 resize-y"
            ></textarea>
            <textarea
              v-else-if="currentContentType === 'html'"
              v-model="formState.content"
              rows="15"
              placeholder="HTML 内容"
              required
              ref="contentEditorRef"
              class="flex min-h-[250px] w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border-0 ring-0 focus:ring-0 resize-y"
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
                 <TooltipProvider>
                   <Tooltip>
                     <TooltipTrigger as-child>
                       <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                     </TooltipTrigger>
                     <TooltipContent>
                       <p>表单功能允许创建交互式表单，用户可以在使用片段时输入内容</p>
                     </TooltipContent>
                   </Tooltip>
                 </TooltipProvider>
               </div>
               <textarea
                v-model="formState.content"
                rows="15"
                placeholder="表单定义 (JSON 格式)"
                required
                ref="contentEditorRef"
                class="flex min-h-[250px] w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 border-0 ring-0 focus:ring-0 resize-y"
              ></textarea>
            </div>
          </div>

          <!-- 新的底部工具栏 -->
          <TooltipProvider :delay-duration="200">
            <div class="flex items-center gap-1 p-1.5 border-t bg-muted/50">
              <VariableSelector @select="insertVariable">
                <template #default="{ showModal }">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button type="button" variant="ghost" size="icon" @click="showModal" class="h-7 w-7">
                        <PlusIcon class="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>插入变量</p>
                    </TooltipContent>
                  </Tooltip>
                </template>
              </VariableSelector>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button type="button" variant="ghost" size="icon" @click="insertCommonVariable('date')" class="h-7 w-7">
                    <CalendarIcon class="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>插入日期</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button type="button" variant="ghost" size="icon" @click="insertCommonVariable('clipboard')" class="h-7 w-7">
                    <ClipboardIcon class="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>插入剪贴板内容</p>
                </TooltipContent>
              </Tooltip>
              <div class="flex-grow"></div> <!-- Spacer -->
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
          </TooltipProvider>
        </div>
      </div>
    </div>

    <!-- ========================= -->
    <!-- 2. 常用选项区 (默认展开)  -->
    <!-- ========================= -->
    <div class="space-y-4 border-t pt-4">
      <!-- 描述 -->
      <div class="space-y-1.5">
        <div class="flex items-center">
          <label for="label" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mr-2">
            标签 (描述)
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>为规则添加简短描述，方便识别和管理</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="label"
          v-model="formState.label"
          placeholder="可选的规则描述"
          class="h-8 px-2 py-1"
        />
      </div>

      <!-- 词边界设置 -->
      <div class="space-y-2">
        <div class="flex items-center">
          <h4 class="text-sm font-medium mr-2">词边界设置</h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>控制触发词在什么情况下被识别，例如是否需要在单词边界处</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>控制替换内容的大小写处理方式</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

        <!-- 插入模式 -->
        <div class="space-y-2">
           <div class="flex items-center">
             <h4 class="text-sm font-medium mr-2">插入模式</h4>
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger as-child>
                   <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>控制内容如何被插入，通过剪贴板或模拟按键</p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>
           </div>
           <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
             <div class="space-y-1">
               <label for="forceModeAdvanced" class="text-sm font-medium leading-none">
                 强制模式 (force_mode)
               </label>
               <Select v-model="formState.forceMode">
                 <SelectTrigger class="h-8 text-sm px-2 py-1 w-full focus:ring-1 focus:ring-ring">
                   <SelectValue placeholder="选择模式" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="default">默认</SelectItem>
                   <SelectItem value="clipboard">剪贴板</SelectItem>
                   <SelectItem value="keys">按键</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <!-- Add force_clipboard if needed -->
           </div>
         </div>

        <!-- 应用限制 -->
        <div class="space-y-2">
          <div class="flex items-center">
            <h4 class="text-sm font-medium mr-2">应用限制</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>限制片段在哪些应用中生效或不生效</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>添加额外的关键词，用于在搜索时匹配此片段</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
          <div class="space-y-1.5">
            <div class="flex items-center">
              <label for="priority" class="text-sm font-medium leading-none mr-2">
                优先级 (priority)
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>当多个片段可能匹配时，优先级高的会被优先使用</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="priority"
              v-model.number="formState.priority"
              type="number"
              placeholder="0"
              class="h-8 px-2 py-1"
            />
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center">
              <label for="hotkey" class="text-sm font-medium leading-none mr-2">
                快捷键 (hotkey)
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <HelpCircleIcon class="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>设置快捷键来触发此片段，例如 alt+h</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="hotkey"
              v-model="formState.hotkey"
              placeholder="例如: alt+h"
              class="h-8 px-2 py-1"
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
import type { Match } from '../../types/espanso'; // Import Match type
import { Transition } from 'vue'; // Ensure Transition is imported
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'; // Changed path

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
  forceMode?: 'default' | 'clipboard' | 'keys'; // Updated type, removed undefined and empty string
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

// Expose only the method to get the current form data
defineExpose({
  getFormData: () => formState.value
});

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
    trigger: triggerInput, // Use the processed trigger input
    label: ruleData.label || '',
    content: determineInitialContent(ruleData),
    word: ruleData.word || false,
    leftWord: ruleData.leftWord || ruleData.left_word || false,
    rightWord: ruleData.rightWord || ruleData.right_word || false,
    propagateCase: ruleData.propagateCase || ruleData.propagate_case || false,
    uppercaseStyle: ruleData.uppercaseStyle || ruleData.uppercase_style || '',
    forceMode: ruleData.forceMode || ruleData.force_mode || '',
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

  currentContentType.value = contentType as 'plain' | 'markdown' | 'html' | 'image' | 'form';

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
    trigger: triggerInput, // Use the processed trigger input
    label: ruleData.label || '',
    content: determineInitialContent(ruleData),
    word: ruleData.word || false,
    leftWord: ruleData.leftWord || ruleData.left_word || false,
    rightWord: ruleData.rightWord || ruleData.right_word || false,
    propagateCase: ruleData.propagateCase || ruleData.propagate_case || false,
    uppercaseStyle: ruleData.uppercaseStyle || ruleData.uppercase_style || '',
    forceMode: ruleData.forceMode || ruleData.force_mode || '',
    apps: Array.isArray(ruleData.apps) ? [...ruleData.apps] : [],
    exclude_apps: Array.isArray(ruleData.exclude_apps) ? [...ruleData.exclude_apps] : [],
    search_terms: Array.isArray(ruleData.search_terms) ? [...ruleData.search_terms] : [],
    priority: ruleData.priority || 0,
    hotkey: ruleData.hotkey || '',
    vars: Array.isArray(ruleData.vars) ? [...ruleData.vars] : [],
    contentType: determineInitialContentType(ruleData)
  };

  currentContentType.value = contentType;

  // 保存原始表单数据
  originalFormData.value = JSON.parse(JSON.stringify(formState.value));

  // 重置表单修改状态
  isFormModified.value = false;
  store.state.hasUnsavedChanges = false;

  // 显示预览模态框
  showPreviewModal.value = true;
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
  console.log('Form submitted', formState.value);

  // --- 解析触发词 --- START
  const triggerValue = formState.value.trigger || '';
  // 确保同时处理换行符和逗号作为分隔符
  const triggersArray = triggerValue
    .split(/[,\n]/) // Split by comma or newline, 确保同时处理换行符和逗号作为分隔符
    .map(t => t.trim()) // Trim whitespace
    .filter(t => t !== ''); // Remove empty strings

  console.log('解析后的触发词数组:', triggersArray);

  // 根据数组长度决定使用trigger还是triggers
  let finalTrigger: string | undefined = undefined;
  let finalTriggers: string[] | undefined = undefined;

  if (triggersArray.length === 1) {
    finalTrigger = triggersArray[0];
    console.log('使用单个触发词:', finalTrigger);
  } else if (triggersArray.length > 1) {
    finalTriggers = triggersArray;
    console.log('使用多个触发词:', finalTriggers);
  } else {
    // 处理空数组的情况
    console.warn('警告: 未找到有效的触发词!');
  }
  // --- 解析触发词 --- END

  // 创建要保存的数据对象，仅包含 Match 类型定义的字段
  const saveData: Partial<Match> = {
    // --- 使用解析后的触发词 --- 
    trigger: finalTrigger,
    triggers: finalTriggers,
    // --- END --- 
    label: formState.value.label,
    // Map content back based on contentType
    ...(mapContentToMatchFields(formState.value.content, formState.value.contentType)),
    word: formState.value.word,
    left_word: formState.value.leftWord,
    right_word: formState.value.rightWord,
    propagate_case: formState.value.propagateCase,
    uppercase_style: formState.value.uppercaseStyle || undefined,
    // Handle forceMode: if 'default', set to undefined for saving
    force_mode: formState.value.forceMode === 'default' ? undefined : formState.value.forceMode,
    apps: formState.value.apps,
    exclude_apps: formState.value.exclude_apps,
    search_terms: formState.value.search_terms,
    priority: formState.value.priority,
    hotkey: formState.value.hotkey,
    vars: formState.value.vars,
  };

  console.log('Data prepared for saving:', JSON.parse(JSON.stringify(saveData)));

  // 保存后更新原始表单数据
  originalFormData.value = JSON.parse(JSON.stringify(formState.value));
  isFormModified.value = false;
  store.state.hasUnsavedChanges = false;

  emit('save', props.rule.id, saveData);
};

// 取消编辑
const onCancel = () => {
  // 如果表单已修改，提示用户
  if (isFormModified.value) {
    if (confirm('您有未保存的修改，确定要放弃这些修改吗？')) {
      // 重置表单状态
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

// 不再需要删除规则的函数，因为我们移除了删除按钮

// Helper function to map content to appropriate Match field
const mapContentToMatchFields = (content?: string, contentType?: string): Partial<Match> => {
  if (content === undefined || content === null) return {};
  switch (contentType) {
    case 'markdown':
      return { markdown: content, replace: undefined, html: undefined, image_path: undefined };
    case 'html':
      return { html: content, replace: undefined, markdown: undefined, image_path: undefined };
    case 'image':
      return { image_path: content, replace: undefined, markdown: undefined, html: undefined };
    case 'form': // Assuming form definition stored in 'replace' for now?
      return { replace: content, markdown: undefined, html: undefined, image_path: undefined };
    case 'plain':
    default:
      return { replace: content, markdown: undefined, html: undefined, image_path: undefined };
  }
};

// Helper function to determine initial content based on Match fields
const determineInitialContent = (rule: Match): string | undefined => {
  if (rule.replace !== undefined) return rule.replace.toString(); // Default to replace
  if (rule.markdown !== undefined) return rule.markdown;
  if (rule.html !== undefined) return rule.html;
  if (rule.image_path !== undefined) return rule.image_path;
  if (rule.content !== undefined) return rule.content.toString(); // Fallback to generic content if needed
  return '';
};

// Helper function to determine initial content type
const determineInitialContentType = (rule: Match): string => {
  if (rule.markdown !== undefined) return 'markdown';
  if (rule.html !== undefined) return 'html';
  if (rule.image_path !== undefined) return 'image';
  // Add check for 'form' if applicable (e.g., based on presence of `vars` or a specific structure in `replace`)
  // if (rule.vars && rule.vars.length > 0) return 'form';
  // Make sure to handle potential undefined force_mode from saved data
  if (!formState.value.forceMode) {
      formState.value.forceMode = 'default';
  }
  return 'plain'; // Default to plain text
};
</script>
