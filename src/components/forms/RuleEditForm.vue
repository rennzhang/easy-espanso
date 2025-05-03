<template>
  <form @submit.prevent="onSubmit" class="space-y-1 h-full flex flex-col">
    <!-- ========================= -->
    <!-- 1. 基本信息区 (始终可见) -->
    <!-- ========================= -->
    <div class="space-y-4 flex-1 flex flex-col h-full">
      <!-- 触发词和名称一行 -->
      <div class="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b">
        <!-- 触发词 -->
        <div class="w-full md:w-1/2 space-y-1.5">
          <div class="flex items-center">
            <label
              for="trigger"
              class="text-sm font-medium text-foreground mr-2"
              >触发词</label
            >
            <HelpTip content="输入规则的触发词，多个请用英文逗号或换行分隔" />
          </div>
          <Textarea
            id="trigger"
            v-model="formState.trigger"
            placeholder="例如: :hello, :你好&#10;:hi"
            required
            rows="2"
            spellcheck="false"
          />
        </div>

        <!-- 名称 -->
        <div class="w-full md:w-1/2 space-y-1.5">
          <div class="flex items-center">
            <label for="label" class="text-sm font-medium text-foreground mr-2"
              >名称</label
            >
            <HelpTip content="为规则添加简短描述，方便识别和管理" />
          </div>
          <Textarea
            id="label"
            v-model="formState.label"
            placeholder="输入规则名称..."
            rows="2"
            spellcheck="false"
          />
        </div>
      </div>

      <!-- 内容类型选择器 & 替换内容 -->
      <div class="space-y-2 flex-1 flex flex-col">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <label class="text-sm font-medium leading-none mr-2"
              >替换内容</label
            >
            <HelpTip content="触发词最终替换的内容" />
          </div>

          <Menubar
            class="flex py-1 cursor-pointer px-1 border-1 border border-gray-300 rounded-md"
          >
            <MenubarMenu
              v-for="option in contentTypeOptions"
              :key="option.value"
            >
              <MenubarTrigger
                class="rounded-md h-8 px-3 py-1 text-sm transition-colors duration-150 focus:outline-none"
                :class="{
                  'bg-primary text-primary-foreground hover:bg-primary/90':
                    currentContentType === option.value,
                  'text-muted-foreground hover:bg-accent hover:text-accent-foreground':
                    currentContentType !== option.value,
                  'opacity-50 cursor-not-allowed': option.disabled,
                }"
                @click="!option.disabled && setContentType(option.value)"
                :title="option.disabled ? '此功能正在开发中' : ''"
              >
                {{ option.label }}
              </MenubarTrigger>
            </MenubarMenu>
          </Menubar>
        </div>

        <!-- Editor Container -->
        <div
          class="shadow-xs border-1 border rounded-md overflow-hidden min-h-[300px] focus-within:border-gray-600 focus-within:shadow-xl focus:border-gray-600 focus:shadow-xl duration-150 border-gray-300 flex-1 flex flex-col"
        >
          <!-- CodeMirror Editor (Replaces all previous textareas) -->
          <div v-if="currentContentType !== 'image'" class="h-full">
            <Codemirror
              :class="{
                'hidden-line-numbers':
                  currentContentType !== 'html' &&
                  currentContentType !== 'markdown',
              }"
              v-model:value="formState.content"
              :options="cmOptions"
              ref="cmRef"
              :placeholder="
                currentContentType === 'form'
                  ? '输入表单定义 (YAML 格式)...'
                  : '输入替换内容...'
              "
              class="h-full"
            />
          </div>

          <!-- Image Upload/Preview -->
          <div
            v-else-if="currentContentType === 'image'"
            class="p-3 min-h-[300px]"
          >
            <Input
              type="file"
              accept="image/*"
              @change="handleImageUpload"
              class="w-full h-auto px-2 py-1 mb-2"
            />
            <div v-if="isImageUrl(formState.content || '')" class="mt-2">
              <!-- 显示图片路径 -->
              <div class="p-2 bg-gray-100 rounded mb-2 text-sm">
                <p class="font-medium">图片路径:</p>
                <p class="text-gray-600 break-all">{{ formState.content }}</p>
              </div>

              <!-- 如果是URL或Base64，尝试显示预览 -->
              <img
                :src="formState.content"
                alt="预览"
                class="max-w-full max-h-[200px] rounded-md"
              />
            </div>
          </div>

          <!-- Bottom Toolbar -->
          <TooltipProvider :delay-duration="200">
            <div
              class="flex items-center justify-between gap-1 p-1.5 border-t bg-muted/50"
              v-if="currentContentType !== 'image'"
            >
              <div class="flex items-center gap-1">
                <div class="flex-grow"></div>
                <!-- Spacer -->

                <!-- New Insert Dropdown -->
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="h-7 px-2 focus:outline-none"
                      style="
                        outline: none !important;
                        box-shadow: none !important;
                      "
                    >
                      <span>插入</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      @click="insertCommonVariable('clipboard')"
                    >
                      <ClipboardIcon class="mr-2 h-4 w-4" />
                      <span>插入剪贴板</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      @click="
                        insertVariable({
                          id: '$|$',
                          name: '光标',
                          description: '插入光标位置',
                        })
                      "
                    >
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
                      <span>更多变量</span>
                      <span class="ml-2 text-xs text-yellow-600 italic"
                        >(开发中)</span
                      >
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <!-- 替换模式和插入按钮 - 仅在非图片类型下显示 -->
              <div class="flex items-center justify-between">
                <!-- Replacement Mode Label and HelpTip (Moved Left & Renamed) -->
                <div class="flex items-center mr-2">
                  <Label class="text-xs font-medium mr-1">替换模式</Label>
                  <HelpTip
                    content="控制内容如何替换触发词，通过剪贴板或模拟按键"
                  />
                </div>

                <!-- Insertion Mode Menubar (Moved Left) -->
                <Menubar
                  class="border rounded-none overflow-hidden p-0 shadow-none mr-2"
                >
                  <template
                    v-for="(option, index) in insertionModeOptions"
                    :key="option.value"
                  >
                    <MenubarMenu>
                      <TooltipProvider
                        v-if="option.value === 'default'"
                        :delay-duration="100"
                      >
                        <Tooltip>
                          <TooltipTrigger as-child>
                            <MenubarTrigger
                              @click="setForceMode('')"
                              class="px-2 py-2 text-xs focus:outline-none shadow-none rounded-none cursor-pointer"
                              :class="[
                                { 'border-l': index > 0 },
                                formState.forceMode === ''
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted',
                              ]"
                            >
                              {{ option.label }}
                            </MenubarTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              自动模式: Espanso 会根据内容长度 (阈值默认100字符)
                              自动选择插入方式 (按键或剪贴板)。
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <MenubarTrigger
                        v-else
                        @click="setForceMode(option.value)"
                        class="px-2 py-2 text-xs focus:outline-none shadow-none rounded-none cursor-pointer"
                        :class="[
                          { 'border-l': index > 0 },
                          formState.forceMode === option.value
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted',
                        ]"
                      >
                        {{ option.label }}
                      </MenubarTrigger>
                    </MenubarMenu>
                  </template>
                </Menubar>
              </div>
            </div>
            <!-- VariableSelector Component moved inside TooltipProvider -->
            <VariableSelector
              ref="variableSelectorRef"
              @select="insertVariable"
            />
          </TooltipProvider>
        </div>
      </div>
    </div>

    <!-- 底部工具栏 (仅在右侧面板) -->
    <div
      class="absolute bottom-0 right-0 w-full bg-card border-t shadow-lg z-20 py-2 mt-0"
    >
      <div class="flex items-center justify-between px-4 space-x-3">
        <div class="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="showAdvancedModal = true"
            class="h-9 px-3 focus:outline-none"
          >
            <SettingsIcon class="h-4 w-4 mr-2" />
            <span>更多设置</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- 底部空白区域，防止内容被固定底栏遮挡 -->
    <div class="h-14"></div>

    <!-- 预览模态框 -->
    <div
      v-if="showPreviewModal"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        class="absolute inset-0 bg-black/50"
        @click="showPreviewModal = false"
      ></div>
      <div
        class="relative bg-background rounded-none shadow-lg w-full max-w-xl max-h-[80vh] overflow-hidden"
      >
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold">预览 "{{ formState.trigger }}"</h2>
          <button
            @click="showPreviewModal = false"
            class="text-gray-500 hover:text-gray-700"
          >
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

    <!-- 高级设置模态框 -->
    <div
      v-if="showAdvancedModal"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        class="absolute inset-0 bg-black/70"
        @click="showAdvancedModal = false"
      ></div>
      <div
        class="relative bg-background rounded-none shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold">高级设置</h2>
          <button
            @click="showAdvancedModal = false"
            class="text-gray-500 hover:text-gray-700"
          >
            <XIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- 左侧列 -->
            <div class="space-y-6">
              <!-- 词边界设置 -->
              <div class="space-y-3">
                <div class="flex items-center">
                  <h3 class="text-base font-medium mr-2">词边界设置</h3>
                  <HelpTip
                    content="控制触发词在什么情况下被识别，例如是否需要在单词边界处"
                  />
                </div>
                <div class="space-y-3 pl-1">
                  <div class="flex items-center space-x-2">
                    <Checkbox id="word" v-model="formState.word" />
                    <label for="word" class="text-sm font-medium leading-none">
                      仅在词边界触发 (word)
                    </label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Checkbox id="leftWord" v-model="formState.leftWord" />
                    <label
                      for="leftWord"
                      class="text-sm font-medium leading-none"
                    >
                      左侧词边界 (left_word)
                    </label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Checkbox id="rightWord" v-model="formState.rightWord" />
                    <label
                      for="rightWord"
                      class="text-sm font-medium leading-none"
                    >
                      右侧词边界 (right_word)
                    </label>
                  </div>
                </div>
              </div>

              <!-- 大小写处理 -->
              <div class="space-y-3">
                <div class="flex items-center">
                  <h3 class="text-base font-medium mr-2">大小写处理</h3>
                  <HelpTip content="控制替换内容的大小写处理方式" />
                </div>
                <div class="space-y-3 pl-1">
                  <div class="flex items-center space-x-2">
                    <Checkbox
                      id="propagateCase"
                      v-model="formState.propagateCase"
                    />
                    <label
                      for="propagateCase"
                      class="text-sm font-medium leading-none"
                    >
                      传播大小写 (propagate_case)
                    </label>
                  </div>
                  <div class="space-y-1.5">
                    <label
                      for="uppercaseStyle"
                      class="text-sm font-medium leading-none"
                    >
                      大写样式 (uppercase_style)
                    </label>
                    <select
                      id="uppercaseStyle"
                      v-model="formState.uppercaseStyle"
                      class="flex h-9 w-full rounded-none border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">无</option>
                      <option value="capitalize_words">首字母大写</option>
                      <option value="uppercase_first">第一个字母大写</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- 其他设置 -->
              <div class="space-y-3">
                <div class="flex items-center">
                  <h3 class="text-base font-medium mr-2">其他设置</h3>
                </div>
                <div class="grid grid-cols-1 gap-4 pl-1">
                  <!-- 优先级 -->
                  <div class="space-y-1.5">
                    <div class="flex items-center">
                      <label
                        for="priority"
                        class="text-sm font-medium leading-none mr-2"
                      >
                        优先级 (priority)
                      </label>
                      <HelpTip
                        content="当多个片段可能匹配时，优先级高的会被优先使用"
                      />
                    </div>
                    <Input
                      id="priority"
                      v-model.number="formState.priority"
                      type="number"
                      placeholder="0"
                      class="h-9 px-3 py-2"
                    />
                  </div>

                  <!-- 快捷键 -->
                  <div class="space-y-1.5">
                    <div class="flex items-center">
                      <label
                        for="hotkey"
                        class="text-sm font-medium leading-none mr-2"
                      >
                        快捷键 (hotkey)
                      </label>
                      <HelpTip content="设置快捷键来触发此片段，例如 alt+h" />
                    </div>
                    <Input
                      id="hotkey"
                      v-model="formState.hotkey"
                      placeholder="例如: alt+h"
                      class="h-9 px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧列 -->
            <div class="space-y-6">
              <!-- 应用限制 -->
              <div class="space-y-3">
                <div class="flex items-center">
                  <h3 class="text-base font-medium mr-2">应用限制</h3>
                  <HelpTip content="限制片段在哪些应用中生效或不生效" />
                </div>
                <div class="space-y-4 pl-1">
                  <div class="space-y-1.5">
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

                  <div class="space-y-1.5">
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
              <div class="space-y-3">
                <div class="flex items-center">
                  <h3 class="text-base font-medium mr-2">搜索设置</h3>
                  <HelpTip content="添加额外的关键词，用于在搜索时匹配此片段" />
                </div>
                <div class="space-y-1.5 pl-1">
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
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="flex justify-end mt-8 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              @click="showAdvancedModal = false"
              class="mr-2"
            >
              关闭
            </Button>
            <Button
              type="button"
              variant="default"
              @click="showAdvancedModal = false"
            >
              应用
            </Button>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  onMounted,
  computed,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { EspansoRule } from "../../types/espanso-config";
import { useEspansoStore } from "../../store/useEspansoStore";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import TagInput from "../common/TagInput.vue";
import VariableSelector from "./VariableSelector.vue";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import HelpTip from "../common/HelpTip.vue";
import FormSection from "../common/FormSection.vue";
import {
  CalendarIcon,
  ClipboardIcon,
  EyeIcon,
  XIcon,
  MousePointerClickIcon,
  MoreHorizontalIcon,
  SettingsIcon,
} from "lucide-vue-next";
import type { Match } from "../../types/espanso";
import { Transition } from "vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

// --- CodeMirror v5 Imports ---
import Codemirror, { CmComponentRef } from "codemirror-editor-vue3";
// v5 modes (these might fail if only v6 is installed)
// You might need to install specific codemirror v5 packages if not present
import "codemirror/mode/markdown/markdown.js";
import "codemirror/mode/htmlmixed/htmlmixed.js";
import "codemirror/mode/javascript/javascript.js";
import "codemirror/mode/yaml/yaml.js";
import "codemirror/lib/codemirror.css"; // Base CSS
import { Editor } from "codemirror";
// Optional: Add a theme CSS
// import 'codemirror/theme/material-darker.css';

// 定义props
const props = defineProps<{
  rule: Match | null;
}>();

// 定义emits
const emit = defineEmits<{ (e: "delete", id: string): void }>();

// 获取 store
const store = useEspansoStore();

// 定义内容类型 (Added ContentType definition)
type ContentType =
  | "plain"
  | "markdown"
  | "html"
  | "image"
  | "form"
  | "script"
  | "keystroke";

// 定义表单状态接口 - 基于 Match 的字段
interface RuleFormState {
  trigger: string;
  triggers?: string[];
  label?: string;
  description?: string;
  content?: string;
  markdown?: string;
  html?: string;
  image_path?: string;
  word?: boolean;
  leftWord?: boolean;
  rightWord?: boolean;
  propagateCase?: boolean;
  uppercaseStyle?: "capitalize_words" | "uppercase_first" | "";
  forceMode?: "default" | "clipboard" | "keys" | "";
  apps?: string[];
  exclude_apps?: string[];
  search_terms?: string[];
  tags?: string[];
  priority?: number;
  hotkey?: string;
  vars?: { name: string; params?: Record<string, any> }[];
  contentType?: ContentType;
}

// 表单状态
const formState = ref<RuleFormState>({
  trigger: "",
  label: "",
  content: "",
  contentType: "plain",
  word: false,
  leftWord: false,
  rightWord: false,
  propagateCase: false,
  uppercaseStyle: "",
  forceMode: "default",
  apps: [],
  exclude_apps: [],
  search_terms: [],
  tags: [],
  priority: 0,
  hotkey: "",
});

// Define insertion mode options for the button group
const insertionModeOptions = [
  { value: "default", label: "自动" },
  { value: "clipboard", label: "剪贴板" },
  { value: "keys", label: "按键" },
];

// 内容类型选项
const contentTypeOptions = [
  { label: "纯文本", value: "plain" },
  { label: "Markdown", value: "markdown" },
  { label: "HTML", value: "html" },
  { label: "图片", value: "image" },
  { label: "表单 (开发中)", value: "form", disabled: true },
];

// 内容编辑器引用 - REMOVED
// const contentEditorRef = ref<HTMLTextAreaElement | null>(null);

// --- CodeMirror v5 Ref and Options ---
const cmRef = ref<CmComponentRef>();
const cmOptions = computed(() => {
  let mode = "text/plain";
  switch (currentContentType.value) {
    case "markdown":
      mode = "markdown";
      break;
    case "html":
      mode = "htmlmixed";
      break;
    case "form": // Use YAML mode for forms?
      mode = "yaml";
      break;
    case "script":
      mode = "javascript";
      break;
    case "plain":
    default:
      mode = "text/plain";
      break;
  }
  return {
    mode: mode,
    lineNumbers: false,
    // lineNumbers:
    //   currentContentType.value === "html" ||
    //   currentContentType.value === "markdown"
    //     ? true
    //     : false,
    lineWrapping: true,
    tabSize: 2,
    styleActiveLine: false,
    // styleActiveLine:
    //   currentContentType.value === "html" ||
    //   currentContentType.value === "markdown"
    //     ? true
    //     : false,
    // theme: 'material-darker' // Optional theme
  };
});

// 当前内容类型
const currentContentType = ref<ContentType>("plain"); // Use defined ContentType

// 高级选项显示状态
const showAdvancedModal = ref(false);

// 预览模态框状态
const showPreviewModal = ref(false);
const previewContent = ref("");

// 表单是否已修改
const isFormModified = ref(false);
// 原始表单数据，用于比较是否有修改
const originalFormData = ref<RuleFormState | null>(null);

// Add ref for VariableSelector
const variableSelectorRef = ref<InstanceType<typeof VariableSelector> | null>(
  null
);
const showPreview = () => {
  if (!formState.value.content) return;

  // 处理变量
  let content = formState.value.content;
  const variableRegex = /\{\{([^}]+)\}\}/g; // Corrected Regex

  content = content.replace(variableRegex, (_match, variableName) => {
    // 根据变量类型生成预览
    if (variableName === "date") {
      return new Date().toLocaleDateString();
    } else if (variableName === "time") {
      return new Date().toLocaleTimeString();
    } else if (variableName.startsWith("date:")) {
      return new Date().toLocaleString();
    } else if (variableName === "clipboard") {
      return "[剪贴板内容]";
    } else if (variableName.startsWith("random")) {
      return Math.floor(Math.random() * 100).toString();
    } else if (variableName.startsWith("shell:")) {
      return "[Shell 命令结果]";
    } else if (variableName.startsWith("form:")) {
      return "[表单输入]";
    } else {
      // 对于未知变量，保持原样
      return `{{${variableName}}}`;
    }
  });

  previewContent.value = content;
  showPreviewModal.value = true;
};
// Expose the methods to get the current form data and show preview
defineExpose({
  showPreview,
  getFormData: (): Partial<Match> & {
    content?: string;
    contentType?: RuleFormState["contentType"];
  } => {
    const dataToSave: Partial<Match> & {
      content?: string;
      contentType?: RuleFormState["contentType"];
    } = {
      label: formState.value.label,
      description: formState.value.description || undefined,
      word: formState.value.word,
      left_word: formState.value.leftWord,
      right_word: formState.value.rightWord,
      propagate_case: formState.value.propagateCase,
      uppercase_style: formState.value.uppercaseStyle || undefined,
      force_mode:
        formState.value.forceMode === "" ||
        formState.value.forceMode === "default"
          ? undefined
          : formState.value.forceMode,
      tags:
        formState.value.tags && formState.value.tags.length > 0
          ? formState.value.tags
          : undefined,
      search_terms:
        formState.value.search_terms && formState.value.search_terms.length > 0
          ? formState.value.search_terms
          : undefined,
      priority: formState.value.priority || undefined,
      hotkey: formState.value.hotkey || undefined,
      vars:
        formState.value.vars && formState.value.vars.length > 0
          ? formState.value.vars
          : undefined,
      content: formState.value.content,
      contentType: formState.value.contentType,
      trigger: undefined,
      triggers: undefined,
    };

    const triggerLines = formState.value.trigger
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t !== "");

    if (triggerLines.length === 0) {
      dataToSave.trigger = "";
    } else if (triggerLines.length === 1) {
      dataToSave.trigger = triggerLines[0];
    } else {
      dataToSave.triggers = triggerLines;
    }
    if (dataToSave.trigger === undefined) delete dataToSave.trigger;
    if (dataToSave.triggers === undefined) delete dataToSave.triggers;

    return dataToSave;
  },
});

// 辅助函数：根据 Match 数据确定初始 contentType
const determineInitialContentType = (
  ruleData: Match
): "plain" | "markdown" | "html" | "image" | "form" => {
  if (ruleData.content && ruleData.contentType) {
    return ruleData.contentType as
      | "plain"
      | "markdown"
      | "html"
      | "image"
      | "form";
  }
  if (ruleData.markdown) return "markdown";
  if (ruleData.html) return "html";
  if (ruleData.image_path) return "image";
  if (ruleData.vars && ruleData.vars.some((v) => v.name === "form"))
    return "form"; // Basic check for form vars
  // 默认或当只有 replace 时，认为是 plain
  return "plain";
};

// 辅助函数：根据 Match 数据确定初始 content
const determineInitialContent = (ruleData: Match): string | undefined => {
  const contentType = determineInitialContentType(ruleData);
  switch (contentType) {
    case "markdown":
      return ruleData.markdown || ruleData.content;
    case "html":
      return ruleData.html || ruleData.content;
    case "image":
      return ruleData.image_path || ruleData.content;
    case "form":
      return ruleData.content; // Assume content holds the form definition for now
    case "plain":
    default:
      return ruleData.content || ruleData.replace; // Fallback to replace if content is missing
  }
};

// 初始化表单
onMounted(() => {
  // 深拷贝props.rule到formState
  const ruleData = JSON.parse(JSON.stringify(props.rule));
  console.log("初始化表单数据:", ruleData);

  // --- 处理触发词: trigger or triggers --- START
  let triggerInput = "";
  if (Array.isArray(ruleData.triggers) && ruleData.triggers.length > 0) {
    triggerInput = ruleData.triggers.join("\n");
  } else if (ruleData.trigger) {
    triggerInput = ruleData.trigger;
  }
  // --- 处理触发词: trigger or triggers --- END

  formState.value = {
    trigger: triggerInput,
    label: ruleData.label || "",
    description: ruleData.description || "",
    content: determineInitialContent(ruleData),
    word: ruleData.word || false,
    leftWord: ruleData.leftWord || ruleData.left_word || false,
    rightWord: ruleData.rightWord || ruleData.right_word || false,
    propagateCase: ruleData.propagateCase || ruleData.propagate_case || false,
    uppercaseStyle: ruleData.uppercaseStyle || ruleData.uppercase_style || "",
    forceMode:
      ruleData.forceMode === "default"
        ? ""
        : ruleData.forceMode || ruleData.force_mode || "",
    apps: Array.isArray(ruleData.apps) ? [...ruleData.apps] : [],
    exclude_apps: Array.isArray(ruleData.exclude_apps)
      ? [...ruleData.exclude_apps]
      : [],
    search_terms: Array.isArray(ruleData.search_terms)
      ? [...ruleData.search_terms]
      : [],
    tags: Array.isArray(ruleData.tags) ? [...ruleData.tags] : [],
    priority: ruleData.priority || 0,
    hotkey: ruleData.hotkey || "",
    vars: Array.isArray(ruleData.vars) ? [...ruleData.vars] : [],
    contentType: determineInitialContentType(ruleData),
  };

  // 保存原始表单数据
  originalFormData.value = JSON.parse(JSON.stringify(formState.value));

  // 重置表单修改状态
  isFormModified.value = false;

  // 更新 store 中的表单修改状态
  store.state.hasUnsavedChanges = false;

  currentContentType.value = formState.value.contentType as ContentType;

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
    showAdvancedModal.value = true;
  }
});

// 监听props变化
watch(
  () => props.rule,
  (newRule) => {
    const ruleData = JSON.parse(JSON.stringify(newRule));
    console.log("监听到props变化:", ruleData);

    // --- 处理触发词: trigger or triggers --- START
    let triggerInput = "";
    if (Array.isArray(ruleData.triggers) && ruleData.triggers.length > 0) {
      triggerInput = ruleData.triggers.join("\n");
    } else if (ruleData.trigger) {
      triggerInput = ruleData.trigger;
    }
    // --- 处理触发词: trigger or triggers --- END

    formState.value = {
      trigger: triggerInput,
      label: ruleData.label || "",
      description: ruleData.description || "",
      content: determineInitialContent(ruleData),
      word: ruleData.word || false,
      leftWord: ruleData.leftWord || ruleData.left_word || false,
      rightWord: ruleData.rightWord || ruleData.right_word || false,
      propagateCase: ruleData.propagateCase || ruleData.propagate_case || false,
      uppercaseStyle: ruleData.uppercaseStyle || ruleData.uppercase_style || "",
      forceMode:
        ruleData.forceMode === "default"
          ? ""
          : ruleData.forceMode || ruleData.force_mode || "",
      apps: Array.isArray(ruleData.apps) ? [...ruleData.apps] : [],
      exclude_apps: Array.isArray(ruleData.exclude_apps)
        ? [...ruleData.exclude_apps]
        : [],
      search_terms: Array.isArray(ruleData.search_terms)
        ? [...ruleData.search_terms]
        : [],
      tags: Array.isArray(ruleData.tags) ? [...ruleData.tags] : [],
      priority: ruleData.priority || 0,
      hotkey: ruleData.hotkey || "",
      vars: Array.isArray(ruleData.vars) ? [...ruleData.vars] : [],
      contentType: determineInitialContentType(ruleData),
    };

    currentContentType.value = formState.value.contentType as ContentType;

    // 保存原始表单数据
    originalFormData.value = JSON.parse(JSON.stringify(formState.value));

    // 重置表单修改状态
    isFormModified.value = false;
    store.state.hasUnsavedChanges = false;
  },
  { deep: true }
);

// 监听内容类型变化
watch(currentContentType, (newType) => {
  formState.value.contentType = newType;
  checkFormModified();
});

// 监听表单变化
watch(
  formState,
  () => {
    checkFormModified();
  },
  { deep: true }
);

// 检查表单是否被修改
const checkFormModified = () => {
  const currentFormData = JSON.stringify({
    ...formState.value,
    contentType: undefined,
  });
  // Ensure originalFormData is an object before spreading
  const originalDataForComparison = JSON.stringify({
    ...(originalFormData.value || {}), // Safely spread originalFormData
    contentType: undefined,
  });

  isFormModified.value = currentFormData !== originalDataForComparison;
  store.state.hasUnsavedChanges = isFormModified.value;
};

// 处理图片上传
const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];

    // 在Electron环境中，我们可以通过input元素的files属性获取完整路径
    // 但在标准Web环境中，这是不可能的，因为安全限制

    // 获取完整路径 - 尝试使用Electron特有的API
    let filePath = "";

    // 1. 尝试从input元素获取路径 (Electron特有)
    if ((input as any).files[0].path) {
      filePath = (input as any).files[0].path;
    }
    // 2. 如果无法获取完整路径，使用文件名作为备选
    else {
      // 在实际应用中，这里应该将文件复制到espanso的资源目录
      // 并返回相对于espanso配置的路径
      filePath = `/path/to/espanso/images/${file.name}`;

      // 提示用户我们无法获取完整路径
      console.warn("无法获取文件完整路径，使用模拟路径代替");
    }

    // 保存图片路径到content字段，后续会被映射到image_path
    formState.value.content = filePath;

    console.log("图片路径:", filePath);
  }
};

// 解析变量ID并创建变量定义
const parseVariableAndCreateDefinition = (variableId: string) => {
  // 如果是光标占位符，不需要添加变量定义
  if (variableId === "$|$") return null;

  // 基本变量定义
  const varDef: { name: string; type: string; params?: Record<string, any> } = {
    name: variableId.split(":")[0], // 默认使用冒号前的部分作为变量名
    type: "echo", // 默认类型为echo
  };

  // 根据变量ID解析类型和参数
  if (variableId === "date") {
    varDef.type = "date";
    varDef.params = { format: "%Y-%m-%d" };
  } else if (variableId === "time") {
    varDef.type = "date";
    varDef.params = { format: "%H:%M" };
  } else if (variableId.startsWith("date:")) {
    varDef.type = "date";
    // 解析date:format=%Y-%m-%d格式的参数
    const formatMatch = variableId.match(/format=([^,]+)/);
    if (formatMatch) {
      varDef.params = { format: formatMatch[1] };
    } else {
      varDef.params = { format: "%Y-%m-%d %H:%M:%S" };
    }
  } else if (variableId === "clipboard") {
    varDef.type = "clipboard";
  } else if (variableId.startsWith("random")) {
    varDef.type = "random";
    // 解析random:min=1,max=100格式的参数
    const minMatch = variableId.match(/min=(\d+)/);
    const maxMatch = variableId.match(/max=(\d+)/);
    varDef.params = {
      min: minMatch ? parseInt(minMatch[1]) : 1,
      max: maxMatch ? parseInt(maxMatch[1]) : 100,
    };
  } else if (variableId.startsWith("shell:")) {
    varDef.type = "shell";
    // 解析shell:cmd=echo $USER格式的参数
    const cmdMatch = variableId.match(/cmd=(.+)/);
    if (cmdMatch) {
      varDef.params = { cmd: cmdMatch[1] };
    }
  } else if (variableId.startsWith("form:")) {
    varDef.type = "form";
    // 表单变量需要更复杂的解析，这里简化处理
    varDef.params = { fields: [] };
  }

  return varDef;
};

// 插入变量 - Updated to work with cmRef if available and add variable definition
const insertVariable = (variable: {
  id: string;
  name: string;
  description: string;
}) => {
  console.log("insertVariable", variable, cmRef);
  const editorInstance = cmRef.value?.cminstance;
  if (!editorInstance) {
    console.warn("CodeMirror instance not available for inserting variable.");
    return;
  }

  const doc = editorInstance.getDoc();
  const cursor = doc.getCursor(); // Get cursor position BEFORE insertion

  if (variable.id === "$|$") {
    doc.replaceRange("$|$", cursor); // Insert the pipe
    doc.setCursor({ line: cursor.line, ch: cursor.ch + 3 });
  } else {
    // For other variables, insert the variable syntax
    const textToInsert = `{{${variable.id}}}`;
    doc.replaceRange(textToInsert, cursor);
    // Move cursor to the end of the inserted text
    doc.setCursor({ line: cursor.line, ch: cursor.ch + textToInsert.length });

    // 添加变量定义到vars数组
    const varDef = parseVariableAndCreateDefinition(variable.id);
    if (varDef) {
      // 确保vars数组存在
      if (!formState.value.vars) {
        formState.value.vars = [];
      }

      // 检查是否已存在相同名称的变量
      const existingVarIndex = formState.value.vars.findIndex(
        (v) => v.name === varDef.name
      );
      if (existingVarIndex >= 0) {
        // 更新现有变量
        formState.value.vars[existingVarIndex] = varDef;
      } else {
        // 添加新变量
        formState.value.vars.push(varDef);
      }
    }
  }

  // Always focus the editor after insertion, ensuring it happens after DOM updates
  nextTick(() => {
    cmRef.value?.cminstance?.focus();
  });
};

// 插入常用变量
const insertCommonVariable = (variableId: string) => {
  // 为常用变量提供更友好的描述
  let description = "";
  if (variableId === "date") {
    description = "插入当前日期";
  } else if (variableId === "clipboard") {
    description = "插入剪贴板内容";
  } else if (variableId === "time") {
    description = "插入当前时间";
  }

  insertVariable({ id: variableId, name: variableId, description });
};

// 显示预览

// 提交表单
const onSubmit = () => {
  // 简单验证
  if (
    !formState.value.trigger ||
    (!formState.value.content && currentContentType.value !== "image")
  ) {
    alert("触发词和替换内容不能为空");
    return;
  }

  // 添加 null 检查
  if (!props.rule) {
    console.error("Cannot save, props.rule is null.");
    alert("保存错误：规则数据丢失。");
    return;
  }

  // 准备要保存的数据
  const dataToSave: Partial<Match> = {
    // Process trigger/triggers
    ...(formState.value.trigger.includes("\n") ||
    formState.value.trigger.includes(",")
      ? {
          triggers: formState.value.trigger
            .split(/[\n,]/)
            .map((t) => t.trim())
            .filter((t) => t),
        }
      : { trigger: formState.value.trigger.trim() }),
    // Explicitly delete the other trigger field if one exists
    ...(formState.value.trigger.includes("\n") ||
    formState.value.trigger.includes(",")
      ? { trigger: undefined }
      : { triggers: undefined }),

    label: formState.value.label || undefined,
    word: formState.value.word || undefined,
    left_word: formState.value.leftWord || undefined,
    right_word: formState.value.rightWord || undefined,
    propagate_case: formState.value.propagateCase || undefined,
    uppercase_style: formState.value.uppercaseStyle || undefined,
    force_mode:
      formState.value.forceMode === "" ||
      formState.value.forceMode === "default"
        ? undefined
        : formState.value.forceMode, // Map empty/default back to undefined for saving
    apps:
      formState.value.apps && formState.value.apps.length > 0
        ? formState.value.apps
        : undefined,
    exclude_apps:
      formState.value.exclude_apps && formState.value.exclude_apps.length > 0
        ? formState.value.exclude_apps
        : undefined,
    search_terms:
      formState.value.search_terms && formState.value.search_terms.length > 0
        ? formState.value.search_terms
        : undefined,
    priority: formState.value.priority || undefined,
    hotkey: formState.value.hotkey || undefined,
    vars:
      formState.value.vars && formState.value.vars.length > 0
        ? formState.value.vars
        : undefined,

    // 移除所有内容相关字段和UI专用字段
    content: undefined,
    contentType: undefined,
  };

  // 根据当前内容类型，只添加对应的字段
  switch (currentContentType.value) {
    case "plain":
      // 纯文本只使用 replace 字段
      dataToSave.replace = formState.value.content;
      // 确保删除其他字段
      delete dataToSave.markdown;
      delete dataToSave.html;
      delete dataToSave.image_path;
      console.log("保存纯文本内容到 replace 字段");
      break;

    case "markdown":
      // Markdown 只使用 markdown 字段
      dataToSave.markdown = formState.value.content;
      // 确保删除其他字段
      delete dataToSave.replace;
      delete dataToSave.html;
      delete dataToSave.image_path;
      console.log("保存Markdown内容到 markdown 字段");
      break;

    case "html":
      // HTML 只使用 html 字段
      dataToSave.html = formState.value.content;
      // 确保删除其他字段
      delete dataToSave.replace;
      delete dataToSave.markdown;
      delete dataToSave.image_path;
      console.log("保存HTML内容到 html 字段");
      break;

    case "image":
      // 图片只使用 image_path 字段
      dataToSave.image_path = formState.value.content;
      // 确保删除其他字段
      delete dataToSave.replace;
      delete dataToSave.markdown;
      delete dataToSave.html;
      console.log("保存图片路径到 image_path 字段");
      break;

    case "form":
      // 表单功能暂未实现
      console.warn("表单功能暂未实现");
      // 表单使用 content 字段，并标记 contentType
      dataToSave.content = formState.value.content;
      dataToSave.contentType = "form"; // 显式设置 contentType
      // 确保删除其他字段
      delete dataToSave.replace;
      delete dataToSave.markdown;
      delete dataToSave.html;
      delete dataToSave.image_path;
      console.log("保存表单内容到 content 字段");
      break;

    default:
      console.error("未知的内容类型:", currentContentType.value);
      // 默认使用 replace 字段
      dataToSave.replace = formState.value.content;
      // 确保删除其他字段
      delete dataToSave.markdown;
      delete dataToSave.html;
      delete dataToSave.image_path;
  }

  // 记录最终保存的数据结构
  console.log("最终保存的数据:", JSON.stringify(dataToSave, null, 2));

  // 保存后更新原始表单数据
  originalFormData.value = JSON.parse(JSON.stringify(formState.value));
  isFormModified.value = false;
  store.state.hasUnsavedChanges = false;

  console.log("正在保存:", dataToSave);
  // REMOVED: emit('save', props.rule.id, dataToSave);
};

// 取消编辑
const onCancel = () => {
  if (isFormModified.value) {
    if (confirm("您有未保存的修改，确定要放弃这些修改吗？")) {
      isFormModified.value = false;
      store.state.hasUnsavedChanges = false;
      // REMOVED: emit('cancel');
    }
  } else {
    // REMOVED: emit('cancel');
  }
};

// 组件卸载前检查未保存的修改
onBeforeUnmount(() => {
  // 确保组件卸载时重置全局状态
  store.state.hasUnsavedChanges = false;
});

// 设置内容类型，并确保在切换类型时清除其他类型的字段
const setContentType = (value: string) => {
  const validTypes = ["plain", "markdown", "html", "image", "form"];
  if (validTypes.includes(value)) {
    // 如果是表单类型且被禁用，则不允许切换
    if (
      value === "form" &&
      contentTypeOptions.find((opt) => opt.value === "form")?.disabled
    ) {
      console.warn("表单功能暂未实现，无法切换到此类型");
      return;
    }

    // 保存当前内容，以便在切换类型时保留
    const currentContent = formState.value.content;

    // 记录类型切换
    console.log(`内容类型从 ${currentContentType.value} 切换到 ${value}`);

    // 更新当前内容类型
    currentContentType.value = value as ContentType;

    // 我们不需要在这里清除字段，因为formState.value只有content字段
    // 实际的字段清除会在保存时进行

    // 保留内容到当前类型对应的字段
    formState.value.content = currentContent;

    // 刷新编辑器
    cmRef.value?.refresh();
  }
};

const setForceMode = (value: string) => {
  const validModes = ["", "clipboard", "keys"];
  if (validModes.includes(value)) {
    formState.value.forceMode = value as "" | "clipboard" | "keys";
  } else if (value === "default") {
    formState.value.forceMode = "";
  }
};

// 检查字符串是否是图片URL或Base64
const isImageUrl = (str: string): boolean => {
  // 检查是否是URL
  if (
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("data:image/")
  ) {
    return true;
  }
  // 检查是否是相对路径的图片文件
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".svg",
  ];
  return imageExtensions.some((ext) => str.toLowerCase().endsWith(ext));
};

// Map rule to formData - Use RuleFormState here
const mapRuleToFormData = (rule: Match | null): RuleFormState => {
  if (!rule) {
    // Return default RuleFormState
    return {
      trigger: "",
      triggers: [],
      label: "",
      description: "",
      content: "",
      contentType: "plain",
      word: false,
      leftWord: false,
      rightWord: false,
      propagateCase: false,
      uppercaseStyle: "",
      forceMode: "default",
      apps: [],
      exclude_apps: [],
      search_terms: [],
      tags: [],
      priority: 0,
      hotkey: "",
      image_path: "",
    };
  }

  // Determine initial contentType and content
  let contentType: ContentType = "plain";
  let content = "";

  // 根据存在的字段确定内容类型和内容
  // 优先级: image_path > markdown > html > replace
  if (rule.image_path !== undefined && rule.image_path !== null) {
    // 图片类型
    contentType = "image";
    content = rule.image_path;
    console.log("检测到图片类型，路径:", rule.image_path);
  } else if (rule.markdown !== undefined && rule.markdown !== null) {
    // Markdown类型
    contentType = "markdown";
    content = rule.markdown;
    console.log("检测到Markdown类型");
  } else if (rule.html !== undefined && rule.html !== null) {
    // HTML类型
    contentType = "html";
    content = rule.html;
    console.log("检测到HTML类型");
  } else if (rule.replace !== undefined && rule.replace !== null) {
    // 检查是否可能是表单
    if (isLikelyForm(rule.replace)) {
      contentType = "form";
      content = rule.replace;
      console.log("检测到表单类型");
    } else {
      // 默认为纯文本
      contentType = "plain";
      content = rule.replace;
      console.log("检测到纯文本类型");
    }
  } else {
    // 如果没有内容，默认为纯文本
    contentType = "plain";
    content = "";
    console.log("未检测到内容，默认为纯文本");
  }

  // 记录检测到的内容类型
  console.log("最终确定的内容类型:", contentType);

  // Combine trigger and triggers
  const triggers = rule.triggers || [];
  let singleTrigger = rule.trigger || "";
  if (triggers.length > 0) {
    singleTrigger = triggers.join("\n");
  }

  return {
    trigger: singleTrigger,
    triggers: triggers,
    label: rule.label || "",
    description: rule.description || "",
    content: content,
    contentType: contentType,
    word: rule.word || false,
    leftWord: rule.left_word || false,
    rightWord: rule.right_word || false,
    propagateCase: rule.propagate_case || false,
    uppercaseStyle: rule.uppercase_style || "",
    forceMode: rule.force_mode === "default" ? "" : rule.force_mode || "",
    tags: rule.tags || [],
    search_terms: rule.search_terms || [],
    priority: rule.priority || 0,
    hotkey: rule.hotkey || "",
    image_path: rule.image_path || "",
    vars: Array.isArray(rule.vars) ? [...rule.vars] : [],
  };
};

// Reactive form data - Use RuleFormState here
const formData = ref<RuleFormState>(mapRuleToFormData(props.rule));

// Detect changes on mount - Use RuleFormState here
watch(
  () => props.rule,
  (newRule, oldRule) => {
    if (newRule?.id !== oldRule?.id) {
      formData.value = mapRuleToFormData(newRule);
      originalFormData.value = JSON.parse(JSON.stringify(formData.value)); // Update original data too
      isFormModified.value = false; // Reset modified state
      store.state.hasUnsavedChanges = false;
    }
  },
  { immediate: true, deep: true }
);

// Helper function to check if content looks like a form (simple check)
function isLikelyForm(content: string): boolean {
  if (!content) return false;
  return content.trim().startsWith("form:") || content.includes("fields:");
}

// --- Computed Properties ---
const isTextBasedContent = computed(() => {
  const type = formData.value.contentType;
  // Include all types that should use the text editor
  return (
    type === "plain" ||
    type === "markdown" ||
    type === "html" ||
    type === "form" ||
    type === "script"
  );
});

// --- Methods ---
const addTag = (tag: string) => {
  // Ensure tags array exists before pushing
  if (!formData.value.tags) {
    formData.value.tags = [];
  }
  // Additional check before includes
  if (
    tag &&
    Array.isArray(formData.value.tags) &&
    !formData.value.tags.includes(tag)
  ) {
    formData.value.tags.push(tag);
    checkFormModified(); // Check if adding a tag modifies the form
  }
};
</script>
<style>
/* .codemirror-container.hidden-line-numbers .CodeMirror-gutters {
  display: none !important;
} */
.codemirror-container .CodeMirror-gutters {
  display: none !important;
}
/* .codemirror-container.hidden-line-numbers .CodeMirror-sizer {
  margin-left: 0 !important;
} */

/* 使光标在失焦状态下也可见并闪烁 */
.CodeMirror {
  /* 设置字体大小为14px */
  font-size: 14px !important;
}
.CodeMirror-cursors {
  visibility: visible !important;
}

.CodeMirror-cursor {
  /* Use an animation independent of focus state */
  animation: codemirror-blink 1.06s steps(1) infinite !important;
  border-left-color: rgba(0, 0, 0, 0.7) !important; /* 使用固定的黑色 */
}

/* Define the blink animation if not already defined elsewhere */
@keyframes codemirror-blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
.CodeMirror-scroll {
  padding: 4px;
}
</style>
