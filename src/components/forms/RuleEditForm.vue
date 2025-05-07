<template>
  <form @submit.prevent="onSubmit" class="space-y-1 h-full flex flex-col">
    <!-- ========================= -->
    <!-- 1. 基本信息区 (始终可见) -->
    <!-- ========================= -->
    <div class="space-y-4 flex-1 flex flex-col h-full overflow-hidden">
      <!-- 触发词和名称一行 -->
      <div class="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b relative">
        <!-- 触发词 -->
        <div class="w-full md:w-1/2 space-y-1.5">
          <div class="flex items-center">
            <label
              for="trigger"
              class="text-sm font-medium text-foreground mr-2"
              >{{ t("snippets.form.trigger.label") }}</label
            >
            <HelpTip :content="t('snippets.form.trigger.help')" />
          </div>
          <Textarea
            id="trigger"
            v-model="formState.trigger"
            :placeholder="t('snippets.form.trigger.placeholder')"
            required
            rows="2"
            spellcheck="false"
            @blur="autoSave"
          />
        </div>

        <!-- 名称 -->
        <div class="w-full md:w-1/2 space-y-1.5">
          <div class="flex items-center">
            <label
              for="label"
              class="text-sm font-medium text-foreground mr-2"
              >{{ t("snippets.form.label.label") }}</label
            >
            <HelpTip :content="t('snippets.form.label.help')" />
          </div>
          <Textarea
            id="label"
            v-model="formState.label"
            :placeholder="t('snippets.form.label.placeholder')"
            rows="2"
            spellcheck="false"
            @blur="autoSave"
          />
        </div>
      </div>

      <!-- 内容类型选择器 & 替换内容 -->
      <div class="space-y-2 flex-1 flex flex-col overflow-hidden">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <label class="text-sm font-medium leading-none mr-2">{{
              t("snippets.form.content.label")
            }}</label>
            <HelpTip :content="t('snippets.form.content.help')" />
          </div>

          <Menubar class="flex py-1 cursor-pointer px-1 border rounded-md">
            <MenubarMenu
              v-for="option in contentTypeOptions"
              :key="option.value"
            >
              <MenubarTrigger
                class="rounded-md h-8 px-3 py-1 text-sm duration-150 focus:outline-none"
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
          v-if="currentContentType !== 'image'"
          class=" shadow-xs border rounded-md overflow-hidden min-h-[300px] focus-within:border-primary focus-within:shadow-xl focus:border-primary focus:shadow-xl duration-150 flex-1 flex flex-col bg-card"
        >
          <!-- CodeMirror Editor (Replaces all previous textareas) -->
          <div class="h-full max-h-[calc(100%-40px)]">
            <Codemirror
              :border="false"
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
              class="h-full codemirror-theme-enabled"
              @blur="autoSave"
            />
          </div>

          <!-- Bottom Toolbar -->
          <TooltipProvider :delay-duration="200">
            <div
              class="flex items-center justify-between gap-1 p-1.5 border-t bg-muted/50"
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
                      <span>{{ t("snippets.form.insertButton.title") }}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      @click="insertCommonVariable('clipboard')"
                    >
                      <ClipboardIcon class="mr-2 h-4 w-4" />
                      <span>{{
                        t("snippets.form.insertButton.clipboard")
                      }}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      @click="
                        insertVariable({
                          id: '$|$',
                          name: t('snippets.form.variables.cursor'),
                          description: t('snippets.form.variables.cursor'),
                        })
                      "
                    >
                      <MousePointerClickIcon class="mr-2 h-4 w-4" />
                      <span>{{ t("snippets.form.insertButton.cursor") }}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="insertCommonVariable('date')">
                      <CalendarIcon class="mr-2 h-4 w-4" />
                      <span>{{ t("snippets.form.insertButton.date") }}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem @click="variableSelectorRef?.showModal()">
                      <MoreHorizontalIcon class="mr-2 h-4 w-4" />
                      <span>{{
                        t("snippets.form.insertButton.moreVariables")
                      }}</span>
                      <span
                        class="ml-2 text-xs text-warning-foreground italic"
                        >{{
                          t("snippets.form.insertButton.inDevelopment")
                        }}</span
                      >
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <!-- 替换模式和插入按钮 - 仅在非图片类型下显示 -->
              <div class="flex items-center justify-between">
                <!-- Replacement Mode Label and HelpTip (Moved Left & Renamed) -->
                <div class="flex items-center mr-2">
                  <Label class="text-xs font-medium mr-1">{{
                    t("snippets.form.replacementMode.title")
                  }}</Label>
                  <HelpTip :content="t('snippets.form.replacementMode.help')" />
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
                              {{ t("snippets.form.replacementMode.help") }}
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
          </TooltipProvider>
        </div>

        <!-- Image Upload/Preview - REVISED -->
        <div
          v-else-if="currentContentType === 'image'"
          class="p-4 flex flex-col items-center justify-center border border-dashed rounded-md min-h-[300px] text-muted-foreground hover:border-primary/50 duration-150"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
          :class="{ 'border-primary bg-primary/5': isDragging }"
          @click="triggerFileInput"
        >
          <!-- Hidden File Input -->
          <Input
            ref="imageInputRef"
            type="file"
            accept="image/*"
            @change="handleImageUpload"
            class="hidden"
          />

          <!-- State: Image Selected -->
          <div
            v-if="formState.content && isImageUrl(formState.content)"
            class="text-center w-full"
          >
            <p class="text-sm font-medium mb-2 text-foreground">
              {{ t("snippets.form.imageUpload.currentImage") }}
            </p>
            <img
              :src="formState.content"
              alt="预览"
              class="max-w-full max-h-[200px] rounded-md mb-3 mx-auto border"
            />
            <div class="p-2 bg-muted/50 rounded mb-3 text-sm text-left">
              <p class="font-medium text-foreground text-xs">
                {{ t("snippets.form.imageUpload.path") }}
              </p>
              <p class="text-muted-foreground break-all text-xs">
                {{ formState.content }}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              @click.stop="removeImage"
              class="h-8 px-3 text-xs"
            >
              <XIcon class="h-3 w-3 mr-1" />
              {{ t("snippets.form.imageUpload.removeImage") }}
            </Button>
          </div>

          <!-- State: No Image Selected -->
          <div v-else class="text-center cursor-pointer">
            <UploadCloudIcon
              class="h-12 w-12 mx-auto mb-3 text-muted-foreground"
            />
            <p class="text-sm font-medium mb-1 text-foreground">
              {{ t("snippets.form.imageUpload.dragHere") }}
            </p>
            <p class="text-xs mb-2">{{ t("snippets.form.imageUpload.or") }}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 px-3 text-xs pointer-events-none"
            >
              {{ t("snippets.form.imageUpload.selectFile") }}
            </Button>
            <p class="text-xs mt-2 text-muted-foreground">
              {{ t("snippets.form.imageUpload.supportedFormats") }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部工具栏 (仅在右侧面板) -->
    <div
      class="absolute bottom-0 right-0 w-full bg-card border-t shadow-lg z-20 py-2 mt-0"
    >
      <div class="flex items-center justify-between px-4 space-x-3">
        <div class="flex items-center justify-end space-x-2">
          <!-- Playground 按钮 -->
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="showPlaygroundModal = true"
            class="h-9 px-3 focus:outline-none"
          >
            <PlayIcon class="h-4 w-4 mr-2" />
            <span>{{ t("snippets.form.playground.title") }}</span>
          </Button>
          
          <!-- 高级设置按钮 -->
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="showAdvancedDialog = true"
            class="h-9 px-3 focus:outline-none"
          >
            <SettingsIcon class="h-4 w-4 mr-2" />
            <span>{{ t("snippets.form.advancedButton.title") }}</span>
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
            class="text-muted-foreground hover:text-foreground"
          >
            <XIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="p-4 overflow-auto max-h-[calc(80vh-120px)]">
          <!-- 图片类型预览 -->
          <div v-if="currentContentType === 'image'" class="space-y-4">
            <!-- 图片路径显示 -->
            <div class="p-3 border border-dashed rounded-md bg-muted/10">
              <p class="text-sm font-mono break-all">{{ previewContent }}</p>
            </div>
            <!-- 图片预览 -->
            <div class="flex justify-center">
              <img
                :src="previewContent"
                alt="图片预览"
                class="max-w-full max-h-[400px] object-contain border"
                @error="onPreviewImageError"
              />
            </div>
          </div>
          <!-- 文本类型预览 -->
          <div v-else class="p-3 border rounded-md bg-muted/10">
            <pre class="whitespace-pre-wrap text-sm">{{ previewContent }}</pre>
          </div>
        </div>
      </div>
    </div>
  </form>
  <!-- VariableSelector Component moved inside TooltipProvider -->
  <VariableSelector ref="variableSelectorRef" @select="insertVariable" />

  <!-- 高级设置对话框 -->
  <Dialog :open="showAdvancedDialog" @update:open="showAdvancedDialog = $event">
    <DialogContent class="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>{{ t("snippets.form.advancedDialog.title") }}</DialogTitle>
        <DialogDescription>
          {{ t("snippets.form.advancedDialog.description") }}
        </DialogDescription>
      </DialogHeader>
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto py-4"
      >
        <!-- 左侧列 -->
        <div class="space-y-6">
          <!-- 词边界设置 -->
          <div class="space-y-3">
            <div class="flex items-center">
              <h3 class="text-base font-medium mr-2">
                {{ t("snippets.form.wordBoundary.title") }}
              </h3>
              <HelpTip :content="t('snippets.form.wordBoundary.help')" />
            </div>
            <div class="space-y-3 pl-1">
              <div class="flex items-center space-x-2">
                <Checkbox id="word" v-model="formState.word" />
                <label for="word" class="text-sm font-medium leading-none">
                  {{ t("snippets.form.wordBoundary.word") }}
                </label>
              </div>
              <div class="flex items-center space-x-2">
                <Checkbox id="leftWord" v-model="formState.leftWord" />
                <label for="leftWord" class="text-sm font-medium leading-none">
                  {{ t("snippets.form.wordBoundary.leftWord") }}
                </label>
              </div>
              <div class="flex items-center space-x-2">
                <Checkbox id="rightWord" v-model="formState.rightWord" />
                <label for="rightWord" class="text-sm font-medium leading-none">
                  {{ t("snippets.form.wordBoundary.rightWord") }}
                </label>
              </div>
            </div>
          </div>

          <!-- 大小写处理 -->
          <div class="space-y-3">
            <div class="flex items-center">
              <h3 class="text-base font-medium mr-2">
                {{ t("snippets.form.caseHandling.title") }}
              </h3>
              <HelpTip :content="t('snippets.form.caseHandling.help')" />
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
                  {{ t("snippets.form.caseHandling.propagateCase") }}
                </label>
              </div>
              <div class="space-y-1.5">
                <label
                  for="uppercaseStyle"
                  class="text-sm font-medium leading-none"
                >
                  {{ t("snippets.form.caseHandling.uppercaseStyle.label") }}
                </label>
                <Select v-model="formState.uppercaseStyle">
                  <SelectTrigger id="uppercaseStyle" class="h-9">
                    <SelectValue
                      :placeholder="
                        t(
                          'snippets.form.caseHandling.uppercaseStyle.placeholder'
                        )
                      "
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="option in uppercaseStyleOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <!-- 其他设置 -->
          <div class="space-y-3">
            <div class="flex items-center">
              <h3 class="text-base font-medium mr-2">
                {{ t("snippets.form.otherSettings.title") }}
              </h3>
            </div>
            <div class="grid grid-cols-1 gap-4 pl-1">
              <!-- 优先级 -->
              <div class="space-y-1.5">
                <div class="flex items-center">
                  <label
                    for="priority"
                    class="text-sm font-medium leading-none mr-2"
                  >
                    {{ t("snippets.form.otherSettings.priority.label") }}
                  </label>
                  <HelpTip
                    :content="t('snippets.form.otherSettings.priority.help')"
                  />
                </div>
                <Input
                  id="priority"
                  v-model.number="formState.priority"
                  type="number"
                  :placeholder="
                    t('snippets.form.otherSettings.priority.placeholder')
                  "
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
                    {{ t("snippets.form.otherSettings.hotkey.label") }}
                  </label>
                  <HelpTip
                    :content="t('snippets.form.otherSettings.hotkey.help')"
                  />
                </div>
                <Input
                  id="hotkey"
                  v-model="formState.hotkey"
                  :placeholder="
                    t('snippets.form.otherSettings.hotkey.placeholder')
                  "
                  class="h-9 px-3 py-2"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧列 -->
        <div class="space-y-6">
          <!-- 搜索设置 -->
          <div class="space-y-3">
            <div class="flex items-center">
              <h3 class="text-base font-medium mr-2">
                {{ t("snippets.form.searchSettings.title") }}
              </h3>
              <HelpTip :content="t('snippets.form.searchSettings.help')" />
            </div>
            <div class="space-y-1.5 pl-1">
              <label class="text-sm font-medium leading-none">
                {{ t("snippets.form.searchSettings.searchTerms.label") }}
              </label>
              <TagInput
                :modelValue="formState.search_terms || []"
                @update:modelValue="(val: string[]) => formState.search_terms = val"
                :placeholder="
                  t('snippets.form.searchSettings.searchTerms.placeholder')
                "
                class="py-1"
              />
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          @click="showAdvancedDialog = false"
        >
          {{ t("common.close") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Playground 测试弹窗 -->
  <Dialog :open="showPlaygroundModal" @update:open="showPlaygroundModal = $event">
    <DialogContent class="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>{{ t("snippets.form.playground.title") }}</DialogTitle>
        <DialogDescription>
          {{ t("snippets.form.playground.description") }}
        </DialogDescription>
      </DialogHeader>
      <div class="max-h-[40vh] overflow-y-auto py-4 space-y-4">
        <!-- 测试区 -->
        <div class="space-y-2">
          <Label for="playground-test-area">{{ t("snippets.form.playground.inputLabel") }}</Label>
          <Textarea 
            id="playground-test-area" 
            v-model="playgroundText" 
            :placeholder="t('snippets.form.playground.inputPlaceholder')"
            class="min-h-[120px]"
            @input="processPlaygroundText"
          ></Textarea>
        </div>
        
        <!-- 测试结果 -->
        <div class="space-y-2" v-if="playgroundResult">
          <div class="flex items-center gap-2">
            <Label>{{ t("snippets.form.playground.resultLabel") }}</Label>
            <Badge variant="outline" class="font-normal">
              {{ playgroundMatched ? t("snippets.form.playground.matched") : t("snippets.form.playground.notMatched") }}
            </Badge>
          </div>
          <div class="p-3 border rounded-md bg-muted/10">
            <p class="whitespace-pre-wrap" v-html="playgroundResult"></p>
          </div>
        </div>

        <!-- 当前片段信息 -->
        <div class="p-3 border rounded-md bg-muted/10">
          <div class="text-sm space-y-1">
            <p>
              <span class="font-medium">{{ t("snippets.form.playground.currentTrigger") }}</span> 
              <code class="px-1 py-0.5 bg-muted rounded">{{ formState.trigger || t("snippets.noTrigger") }}</code>
            </p>
            <p v-if="formState.word">
              <span class="font-medium">{{ t("snippets.form.playground.wordBoundary") }}</span>
            </p>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  onMounted,
  computed,
  onBeforeUnmount,
  nextTick,
  defineEmits,
  defineProps,
  PropType,
} from "vue";
import { useI18n } from "vue-i18n";
import { useEspansoStore } from "../../store/useEspansoStore";
import { useFormStore } from "../../store/useFormStore";
import { toast } from "vue-sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import HelpTip from "../common/HelpTip.vue";
import {
  CalendarIcon,
  ClipboardIcon,
  EyeIcon,
  XIcon,
  MousePointerClickIcon,
  MoreHorizontalIcon,
  SettingsIcon,
  UploadCloudIcon,
  PlayIcon,
} from "lucide-vue-next";
import type { Match } from "@/types/core/espanso.types";
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
import { useTheme } from "../../hooks/useTheme"; // 导入主题钩子

// --- CodeMirror v5 Imports ---
import Codemirror, { CmComponentRef } from "codemirror-editor-vue3";
// v5 modes (these might fail if only v6 is installed)
// You might need to install specific codemirror v5 packages if not present
import "codemirror/mode/markdown/markdown.js";
import "codemirror/mode/htmlmixed/htmlmixed.js";
import "codemirror/mode/javascript/javascript.js";
import "codemirror/mode/yaml/yaml.js";
import "codemirror/lib/codemirror.css"; // Base CSS
import "codemirror/theme/dracula.css"; // 添加dracula主题
import "codemirror/theme/elegant.css"; // 浅色主题
import { Editor } from "codemirror";
// Optional: Add a theme CSS
// import 'codemirror/theme/material-darker.css';

// 定义props
const props = defineProps({
  rule: {
    type: Object as PropType<Match | null>,
    required: true,
  },
  // isModal: { // Example prop if needed
  //   type: Boolean,
  //   default: false,
  // }
});

// Define emits
const emit = defineEmits<{
  (e: "modified", value: boolean): void;
  // 添加 save 事件定义，假设 rule.id 是字符串或数字
  (e: "save", ruleId: string | number | undefined, data: Partial<Match>): void;
}>();

// 获取 store
const store = useEspansoStore();
const formStore = useFormStore();
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
      forceMode: "",
      apps: [],
      exclude_apps: [],
      search_terms: [],
      priority: 0,
      hotkey: "",
      image_path: "",
      vars: [],
    };
  }

  // 1. 确定实际的 contentType (如果缺失或无效，则默认为 'plain')
  let contentType: ContentType = "plain"; // 从默认开始
  if (
    rule.contentType &&
    ["plain", "markdown", "html", "image", "form"].includes(rule.contentType)
  ) {
    contentType = rule.contentType;
  } else {
    // 如果 contentType 缺失或无效，尝试推断 (可选, 但有助于恢复)
    if (rule.markdown !== undefined) contentType = "markdown";
    else if (rule.html !== undefined) contentType = "html";
    else if (rule.image_path !== undefined) contentType = "image";
    // 否则保持 'plain' (如果需要，可以根据 'form' 字段推断 'form')
  }

  // 2. 根据确定的 contentType 获取内容
  let content = "";
  switch (contentType) {
    case "markdown":
      content = rule.markdown ?? rule.replace ?? ""; // 如果 markdown 缺失，回退到 replace
      break;
    case "html":
      content = rule.html ?? rule.replace ?? ""; // 如果 html 缺失，回退到 replace
      break;
    case "image":
      content = rule.image_path ?? "";
      break;
    case "form": // 假设 form 使用 'replace'
      content = rule.replace ?? "";
      break;
    case "plain":
    default:
      content = rule.replace ?? ""; // 默认使用 replace
      break;
  }

  // 合并 trigger 和 triggers (用于显示)
  const triggers = rule.triggers || [];
  let singleTrigger = rule.trigger || "";
  if (triggers.length > 0) {
    singleTrigger = triggers.join("\n");
  } // 在 textarea 中使用 \n 显示
  let uiForceMode = rule.force_mode || "";
  if (uiForceMode === "default") {
    uiForceMode = "";
  }

  // 3. 返回完整的表单状态
  return {
    trigger: singleTrigger,
    triggers: triggers, // 如果其他地方需要，保留原始 triggers 数组
    label: rule.label || "",
    description: rule.description || "",
    content: content, // 使用派生出的内容
    contentType: contentType, // 使用确定的 contentType
    word: rule.word || false,
    leftWord: rule.left_word || false,
    rightWord: rule.right_word || false,
    propagateCase: rule.propagate_case || false,
    uppercaseStyle: rule.uppercase_style || "",
    forceMode: uiForceMode as "" | "clipboard" | "keys",
    apps: rule.apps || [],
    exclude_apps: rule.exclude_apps || [],
    search_terms: rule.search_terms || [],
    priority: rule.priority || 0,
    hotkey: rule.hotkey || "",
    vars: Array.isArray(rule.vars) ? [...rule.vars] : [],
    // 如果需要，可以保留内部字段，例如用于图片预览的原始 image_path
    image_path: rule.image_path || "", // 保留此项以用于预览逻辑
    // 注意: 如果 content 是核心, 不要在 formState 中直接包含 markdown/html/replace
  };
};
// Reactive form data - Use RuleFormState here
const formData = ref<RuleFormState>(mapRuleToFormData(props.rule));
// Ref for the hidden file input
const imageInputRef = ref<HTMLInputElement | null>(null);
// State for drag-over effect
const isDragging = ref(false);

// 定义内容类型 (Added ContentType definition)
type ContentType = "plain" | "markdown" | "html" | "image" | "form";

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
  uppercaseStyle?: "" | "uppercase" | "capitalize" | "capitalize_words";
  forceMode?: "default" | "clipboard" | "keys" | "";
  apps?: string[];
  exclude_apps?: string[];
  search_terms?: string[];
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
  priority: 0,
  hotkey: "",
});

// 在 setup 中获取 t 函数
const { t } = useI18n();

// 内容类型选项
const contentTypeOptions = [
  { label: t("snippets.contentTypes.plain"), value: "plain" },
  { label: t("snippets.contentTypes.markdown"), value: "markdown" },
  { label: t("snippets.contentTypes.html"), value: "html" },
  { label: t("snippets.contentTypes.image"), value: "image" },
  { label: t("snippets.contentTypes.form"), value: "form", disabled: true },
];

// 大小写样式选项
const uppercaseStyleOptions = [
  { value: "uppercase", label: t("snippets.uppercaseStyles.uppercase") },
  { value: "capitalize", label: t("snippets.uppercaseStyles.capitalize") },
  {
    value: "capitalize_words",
    label: t("snippets.uppercaseStyles.capitalizeWords"),
  },
];

// Define insertion mode options for the button group
const insertionModeOptions = [
  { value: "default", label: t("snippets.insertionModes.auto") },
  { value: "clipboard", label: t("snippets.insertionModes.clipboard") },
  { value: "keys", label: t("snippets.insertionModes.keys") },
];

// 内容编辑器引用 - REMOVED
// const contentEditorRef = ref<HTMLTextAreaElement | null>(null);

// --- CodeMirror v5 Ref and Options ---
const cmRef = ref<CmComponentRef>();

// 获取主题状态
const { theme, isDarkMode } = useTheme();

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
    case "plain":
    default:
      mode = "text/plain";
      break;
  }
  return {
    mode: mode,
    lineNumbers: false,
    lineWrapping: true,
    tabSize: 2,
    styleActiveLine: false,
    theme: isDarkMode.value ? "dracula" : "elegant", // 根据当前主题状态动态选择
  };
});

// 当前内容类型
const currentContentType = ref<ContentType>("plain"); // Use defined ContentType

// 高级选项显示状态
const showAdvancedDialog = ref(false);

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
const isInitialized = ref(false); // <--- 添加初始化标记

const showPreview = () => {
  if (!formState.value.content) return;

  // 如果是图片类型，直接显示图片路径和图片
  if (currentContentType.value === "image") {
    previewContent.value = formState.value.content;
    showPreviewModal.value = true;
    return;
  }

  // 处理变量
  let content = formState.value.content;
  const variableRegex = /\{\{([^}]+)\}\}/g;

  content = content.replace(variableRegex, (_match, variableName) => {
    // 根据变量类型生成预览
    if (variableName === "date") {
      return new Date().toLocaleDateString();
    } else if (variableName === "time") {
      return new Date().toLocaleTimeString();
    } else if (variableName.startsWith("date:")) {
      return new Date().toLocaleString();
    } else if (variableName === "clipboard") {
      return t("snippets.form.preview.clipboardContent");
    } else if (variableName.startsWith("random")) {
      return t("snippets.form.preview.randomNumber");
    } else if (variableName.startsWith("shell:")) {
      return t("snippets.form.preview.shellResult");
    } else if (variableName.startsWith("form:")) {
      return t("snippets.form.preview.formInput");
    } else {
      // 对于未知变量，保持原样
      return `{{${variableName}}}`;
    }
  });

  previewContent.value = content;
  showPreviewModal.value = true;
};

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
const resetForm = (formData: Partial<Match>) => {
  formState.value = JSON.parse(JSON.stringify(formData));
  // 确保设置正确的内容类型
  if (formData.contentType) {
    currentContentType.value = formData.contentType as ContentType;
    console.log(
      "[RuleEditForm] resetForm 设置内容类型:",
      currentContentType.value
    );
  }
};

// 初始化表单
onMounted(() => {
  console.log("[RuleEditForm] Mounted. Initializing state from props.");
  isInitialized.value = false;
  const initialFormState = mapRuleToFormData(props.rule);
  formState.value = initialFormState;

  // 确保设置正确的内容类型（防止undefined）
  if (initialFormState.contentType) {
    currentContentType.value = initialFormState.contentType;
    console.log("[RuleEditForm] 设置初始内容类型:", currentContentType.value);
  } else {
    currentContentType.value = "plain"; // 默认值
    console.log("[RuleEditForm] 未找到内容类型，使用默认值: plain");
  }

  nextTick(() => {
    originalFormData.value = JSON.parse(JSON.stringify(formState.value));
    isFormModified.value = false;
    isInitialized.value = true;
    console.log("[RuleEditForm] Initial state and baseline set on mount.");
    // Initial check for modification status (should be false)
    checkFormModified();
  });
});

// 监听props变化
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

// 监听内容类型变化 - 不再直接调用 checkFormModified
watch(currentContentType, (newType) => {
  formState.value.contentType = newType;
  // 让 watch(formState) 去处理变化检查
});

// 监听表单变化
watch(
  formState,
  () => {
    // 延迟检查，确保 originalFormData 已经更新完毕 (如果是由 props 变化引起的)
    nextTick(() => {
      console.log("FormState 变化，nextTick 中调用 checkFormModified");
      checkFormModified();
    });
  },
  { deep: true }
);

// 监听 propagateCase 的变化
watch(
  () => formState.value.propagateCase,
  (isPropagateCaseEnabled) => {
    // 如果 propagate_case 被取消勾选 (变为 false)
    if (!isPropagateCaseEnabled) {
      // 自动将 uppercase_style 设置为 "无" (空字符串)
      formState.value.uppercaseStyle = "";
      console.log("传播大小写已禁用，自动清空大写样式。");
      // checkFormModified() 会被 watch(formState) 自动触发，无需手动调用
    }
  }
);

// 检查表单是否被修改
const checkFormModified = () => {
  // 确保在初始化完成后再检查
  if (!isInitialized.value) {
    // <--- 检查初始化标记
    console.log("检查修改跳过：尚未初始化");
    return;
  }

  // 如果原始表单数据为空 (理论上初始化后不应为空)
  if (!originalFormData.value) {
    console.log("检查修改：原始数据为空");
    isFormModified.value = false;
    store.state.hasUnsavedChanges = false;
    emit("modified", false);
    return;
  }

  // 深度比较当前表单数据和原始表单数据
  // !!! 包含 contentType 进行比较 !!!
  const currentFormData = JSON.stringify(formState.value);
  const originalDataForComparison = JSON.stringify(originalFormData.value);

  // 只有当数据实际发生变化时，才标记为已修改
  const hasChanged = currentFormData !== originalDataForComparison;

  // 更新状态
  isFormModified.value = hasChanged;
  store.state.hasUnsavedChanges = hasChanged;
  // 触发 modified 事件，将修改状态传递给父组件
  emit("modified", hasChanged);

  // 如果有修改，保存到 FormStore
  if (hasChanged && props.rule?.id) {
    formStore.saveFormData(props.rule.id, formState.value);
    console.log(
      `[RuleEditForm] 已保存修改后的表单数据到 FormStore: ${props.rule.id}`
    );
  }

  console.log("表单初始化完成，修改状态:", hasChanged);
};

// Trigger the hidden file input click
const triggerFileInput = () => {
  // Only trigger if no image is currently selected to avoid conflict with remove button
  if (!formState.value.content || !isImageUrl(formState.value.content)) {
    imageInputRef.value?.click();
  }
};

// Handle drag over event
const handleDragOver = (event: DragEvent) => {
  isDragging.value = true;
};

// Handle drag leave event
const handleDragLeave = (event: DragEvent) => {
  isDragging.value = false;
};

// Handle drop event
const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  if (event.dataTransfer && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0];
    // Basic type check
    if (file.type.startsWith("image/")) {
      // Pass the file object to handleImageUpload
      handleImageUpload(event, file);
    } else {
      alert("请拖拽有效的图片文件!");
    }
  }
};

// Method to remove the selected image
const removeImage = () => {
  formState.value.content = "";
  // Reset the hidden input value if necessary
  if (imageInputRef.value) {
    imageInputRef.value.value = "";
  }
  checkFormModified(); // Check if removing the image is a modification
};

// 处理图片上传 (现在接受可选的文件参数用于拖拽)
const handleImageUpload = (
  event: Event | DragEvent,
  droppedFile: File | null = null
) => {
  let file: File | null = null;

  if (droppedFile) {
    // Case 1: File from drag-and-drop
    file = droppedFile;
  } else {
    // Case 2: File from input change event
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      file = target.files[0];
    }
  }

  if (file) {
    console.log("Selected/Dropped image file:", file);
    // 在Electron环境中，我们可以通过input元素的files属性获取完整路径
    // 但在标准Web环境中，这是不可能的，因为安全限制

    // 获取完整路径 - 尝试使用Electron特有的API
    let filePath = "";

    // 1. 尝试从 File 对象获取路径 (Electron特有)
    // 注意: file.path 在标准浏览器中不存在
    if ((file as any).path) {
      filePath = (file as any).path;
    }
    // 2. 如果无法获取完整路径，使用文件名作为备选
    else {
      // 在实际应用中，这里应该将文件复制到espanso的资源目录
      // 并返回相对于espanso配置的路径
      // **重要提示:** 这里的逻辑需要根据你的 Electron 主进程或 preload 脚本来完善，
      // 以便真正地复制文件并获取正确的相对路径。
      // 目前仅作为 UI 演示。
      filePath = `/path/to/espanso/assets/${file.name}`; // Placeholder

      // 提示用户我们无法获取完整路径，并且需要实际的文件管理逻辑
      console.warn(
        "无法获取文件完整路径，使用模拟路径代替。需要实现文件复制和路径管理逻辑!"
      );
      // 你可能想在这里用 toast 或其他方式提示用户
      // toast.info("图片路径为模拟路径，需要配置实际存储位置");
    }

    // 保存图片路径到content字段，后续会被映射到image_path
    formState.value.content = filePath;
    console.log("图片路径设置为:", filePath);

    checkFormModified(); // Check if adding/changing image modifies the form
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

// 提交表单
const onSubmit = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // 简单验证
      if (
        !formState.value.trigger ||
        (!formState.value.content && currentContentType.value !== "image")
      ) {
        const error = new Error("触发词和替换内容不能为空");
        toast.error(error.message);
        reject(error);
        return;
      }

      // 添加 null 检查
      if (!props.rule) {
        const error = new Error("保存错误：规则数据丢失");
        console.error("Cannot save, props.rule is null.");
        toast.error(error.message);
        reject(error);
        return;
      }

      // 准备要保存的数据
      const dataToSave: Partial<Match> & { contentType?: ContentType } = {
        // <--- 明确包含 contentType
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
          formState.value.exclude_apps &&
          formState.value.exclude_apps.length > 0
            ? formState.value.exclude_apps
            : undefined,
        search_terms:
          formState.value.search_terms &&
          formState.value.search_terms.length > 0
            ? formState.value.search_terms
            : undefined,
        priority: formState.value.priority || undefined,
        hotkey: formState.value.hotkey || undefined,
        vars:
          formState.value.vars && formState.value.vars.length > 0
            ? formState.value.vars
            : undefined,

        // !!! 始终包含 contentType !!!
        contentType: currentContentType.value, // <--- 添加这一行

        // 移除所有旧的内容相关字段 (replace/markdown/html/image_path)
        // 这些将在下面的 switch 中被正确设置
        replace: undefined,
        markdown: undefined,
        html: undefined,
        image_path: undefined,
        content: undefined, // 移除临时的 content 字段
      };

      // 根据当前内容类型，只添加对应的字段
      switch (currentContentType.value) {
        case "plain":
          dataToSave.replace = formState.value.content;
          break;

        case "markdown":
          dataToSave.markdown = formState.value.content;
          break;

        case "html":
          dataToSave.html = formState.value.content;
          break;

        case "image":
          dataToSave.image_path = formState.value.content;
          break;

        case "form":
          // 表单内容通常存在 replace 或 content 字段，并依赖 contentType 区分
          // 假设表单定义存储在 replace 字段
          dataToSave.replace = formState.value.content;
          console.log("保存表单内容到 replace 字段");
          break;

        default:
          console.error("未知的内容类型:", currentContentType.value);
          dataToSave.replace = formState.value.content; // Fallback
      }

      // 清理所有值为 undefined 的字段
      Object.keys(dataToSave).forEach((key) => {
        if (dataToSave[key as keyof typeof dataToSave] === undefined) {
          delete dataToSave[key as keyof typeof dataToSave];
        }
      });

      // 记录最终保存的数据结构
      console.log("最终保存的数据:", JSON.stringify(dataToSave, null, 2));

      // 调用 emit 保存数据，并添加必要的检查
      if (props.rule && props.rule.id !== undefined && props.rule.id !== null) {
        // 调用 store 的 updateMatch 方法
        store
          .updateMatch(props.rule.id, dataToSave)
          .then(() => {
            // 注意：状态更新由调用方（autoSave）处理，这里只返回成功
            console.log("保存成功。");
            resolve();
          })
          .catch((error) => {
            console.error("保存失败:", error);
            toast.error(`保存失败: ${error.message || "未知错误"}`);
            reject(error);
          });
      } else {
        const error = new Error("无法保存: 规则 ID 无效或缺失");
        console.error(error.message, props.rule);
        toast.error(error.message);
        reject(error);
      }
    } catch (error: any) {
      console.error("保存过程中发生错误:", error);
      toast.error(`保存失败: ${error.message || "未知错误"}`);
      reject(error);
    }
  });
};

// 取消编辑
const onCancel = () => {
  if (isFormModified.value) {
    if (confirm(t("snippets.form.autoSave.unsavedChanges"))) {
      isFormModified.value = false;
      store.state.hasUnsavedChanges = false;
    }
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
    type === "form"
  );
});

// --- resetModifiedState 함수 선언 (defineExpose 앞으로 이동) ---
const resetModifiedState = (savedData: Partial<Match>) => {
  console.log("[RuleEditForm] Resetting state after save.");
  isInitialized.value = false; // Temporarily disable modification checks during reset

  // 1. Map the SAVED data back to the expected form state structure
  const newFormState = mapRuleToFormData(savedData as Match);

  // 2. Directly update the reactive form state
  formState.value = newFormState;

  // 确保设置正确的内容类型（防止undefined）
  if (newFormState.contentType) {
    currentContentType.value = newFormState.contentType;
    console.log(
      "[RuleEditForm] resetModifiedState 设置内容类型:",
      currentContentType.value
    );
  } else {
    currentContentType.value = "plain"; // 默认值
    console.log(
      "[RuleEditForm] resetModifiedState 未找到内容类型，使用默认值: plain"
    );
  }

  // 3. Update the baseline for modification checks using the NEW form state
  nextTick(() => {
    originalFormData.value = JSON.parse(JSON.stringify(formState.value));
    isFormModified.value = false; // Reset modified flag
    store.state.hasUnsavedChanges = false; // Sync global state
    isInitialized.value = true; // Re-enable modification checks
    console.log("[RuleEditForm] State and baseline reset complete.");
  });
};

// --- getFormData 함수 선언 (defineExpose 앞으로 이동) ---
const getFormData = (): Partial<Match> => {
  const dataToSave: Partial<Match> = {
    // 基本字段
    label: formState.value.label || undefined,
    description: formState.value.description || undefined,
    word: formState.value.word || undefined,
    left_word: formState.value.leftWord || undefined,
    right_word: formState.value.rightWord || undefined,
    propagate_case: formState.value.propagateCase || undefined,
    uppercase_style: formState.value.uppercaseStyle || undefined,
    force_mode:
      formState.value.forceMode === "" ||
      formState.value.forceMode === "default"
        ? undefined
        : formState.value.forceMode,
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
    contentType: currentContentType.value, // 确保包含 contentType

    // 显式将所有内容字段初始化为 undefined
    replace: undefined,
    markdown: undefined,
    html: undefined,
    image_path: undefined,

    trigger: undefined,
    triggers: undefined,
  };

  // --- 处理 trigger/triggers ---
  const triggerLines = formState.value.trigger
    .split(/[\n,]/) // 支持逗号和换行分隔
    .map((t) => t.trim())
    .filter((t) => t !== "");

  if (triggerLines.length === 0) {
    dataToSave.trigger = "";
  } else if (triggerLines.length === 1) {
    dataToSave.trigger = triggerLines[0];
  } else {
    dataToSave.triggers = triggerLines;
  }

  // --- 根据内容类型设置对应字段，其他字段保持 undefined ---
  switch (currentContentType.value) {
    case "plain":
      dataToSave.replace = formState.value.content;
      break;
    case "markdown":
      dataToSave.markdown = formState.value.content;
      break;
    case "html":
      dataToSave.html = formState.value.content;
      break;
    case "image":
      dataToSave.image_path = formState.value.content;
      break;
    case "form":
      // 表单内容使用 replace 字段
      dataToSave.replace = formState.value.content;
      break;
    default:
      console.error("[getFormData] 未知的内容类型:", currentContentType.value);
      dataToSave.replace = formState.value.content; // Fallback
  }

  // 清理多余字段
  Object.keys(dataToSave).forEach((key) => {
    if (dataToSave[key as keyof typeof dataToSave] === undefined) {
      delete dataToSave[key as keyof typeof dataToSave];
    }
  });

  console.log("[getFormData] 返回数据:", JSON.stringify(dataToSave, null, 2));
  return dataToSave;
};

// 自动保存状态
const isSaving = ref(false);
const saveState = ref<"idle" | "success" | "error">("idle");
let saveStateTimeout: ReturnType<typeof setTimeout> | null = null;

// 自动保存方法
const autoSave = async () => {
  if (isFormModified.value && props.rule?.id) {
    console.log(`[RuleEditForm] 自动保存触发`);

    // 清除可能存在的保存状态反馈
    if (saveStateTimeout) {
      clearTimeout(saveStateTimeout);
      saveStateTimeout = null;
    }

    isSaving.value = true;
    saveState.value = "idle";

    try {
      await onSubmit();
      saveState.value = "success";
      toast.success(t("snippets.form.autoSave.success"));

      // 确保修改状态被重置
      isFormModified.value = false;
      store.state.hasUnsavedChanges = false;
      emit("modified", false);

      // 更新原始表单数据
      originalFormData.value = JSON.parse(JSON.stringify(formState.value));

      // 从 FormStore 中删除保存的表单数据
      if (props.rule?.id) {
        formStore.deleteFormData(props.rule.id);
        console.log(
          `[RuleEditForm] 自动保存成功，已从 FormStore 中删除表单数据: ${props.rule.id}`
        );
      }

      console.log("[RuleEditForm] 自动保存成功，状态已重置。");
    } catch (error: any) {
      console.error("自动保存失败:", error);
      saveState.value = "error";
      toast.error(
        t("snippets.form.autoSave.error", {
          error: error.message || t("common.error"),
        })
      );
    } finally {
      isSaving.value = false;
      saveStateTimeout = setTimeout(
        () => {
          saveState.value = "idle";
        },
        saveState.value === "success" ? 1500 : 3000
      );
    }
  }
};

// --- defineExpose 블록 ---
defineExpose({
  showPreview,
  getFormData,
  resetModifiedState,
  autoSave, // 暴露自动保存方法
});

// --- Watcher 및 onMounted 등 나머지 코드는 그대로 ---
// Watcher - only reset fully when ID changes
watch(
  () => props.rule?.id, // Watch only the ID for navigation changes
  (newId, oldId) => {
    if (newId === undefined || newId === oldId) {
      // If ID is same or undefined, do nothing here.
      // State updates for the *same* item are handled by resetModifiedState.
      return;
    }

    // ID has changed, indicating navigation to a different rule
    console.log(
      "[RuleEditForm Watcher] Rule ID changed, resetting form state."
    );
    isInitialized.value = false;
    const newFormState = mapRuleToFormData(props.rule); // Use current props.rule
    formState.value = newFormState;

    // 确保设置正确的内容类型（防止undefined）
    if (newFormState.contentType) {
      currentContentType.value = newFormState.contentType;
      console.log(
        "[RuleEditForm] 切换规则，设置内容类型:",
        currentContentType.value
      );
    } else {
      currentContentType.value = "plain"; // 默认值
      console.log("[RuleEditForm] 切换规则，未找到内容类型，使用默认值: plain");
    }

    nextTick(() => {
      originalFormData.value = JSON.parse(JSON.stringify(formState.value));
      isFormModified.value = false;
      store.state.hasUnsavedChanges = false; // Reset global state on item change
      isInitialized.value = true;
      console.log(
        "[RuleEditForm Watcher] Form reset complete after ID change."
      );
    });
  }
  // No deep: true needed if only watching ID
);

// onMounted with FormStore check
onMounted(() => {
  console.log("[RuleEditForm] Mounted. Initializing state from props.");
  isInitialized.value = false;

  // 初始化时设置适合当前主题的样式类
  if (isDarkMode.value) {
    document.body.classList.remove("light-theme");
  } else {
    document.body.classList.add("light-theme");
  }

  // 检查 FormStore 中是否有保存的表单数据
  if (props.rule?.id && formStore.hasFormData(props.rule.id)) {
    // 从 FormStore 中恢复表单数据
    const savedFormData = formStore.getFormData(props.rule.id);
    if (savedFormData) {
      console.log(
        `[RuleEditForm] 组件挂载，从 FormStore 恢复表单数据: ${props.rule.id}`
      );
      formState.value = savedFormData;

      // 确保设置正确的内容类型
      if (savedFormData.contentType) {
        currentContentType.value = savedFormData.contentType;
        console.log(
          "[RuleEditForm] 组件挂载，从 FormStore 恢复，设置内容类型:",
          currentContentType.value
        );
      } else {
        currentContentType.value = "plain"; // 默认值
        console.log(
          "[RuleEditForm] 组件挂载，从 FormStore 恢复，未找到内容类型，使用默认值: plain"
        );
      }

      nextTick(() => {
        originalFormData.value = JSON.parse(JSON.stringify(formState.value));
        isFormModified.value = true; // 设置为已修改，因为是从 FormStore 恢复的未保存数据
        store.state.hasUnsavedChanges = true;
        isInitialized.value = true;
        console.log("[RuleEditForm] 组件挂载，从 FormStore 恢复表单数据完成。");
        emit("modified", true); // 通知父组件表单已修改

        // 确保下一轮DOM更新后应用主题
        nextTick(applyThemeToCodeMirror);
      });
      return;
    }
  }

  // 如果没有保存的表单数据，使用 props.rule 初始化
  const initialFormState = mapRuleToFormData(props.rule);
  formState.value = initialFormState;

  nextTick(() => {
    originalFormData.value = JSON.parse(JSON.stringify(formState.value));
    isFormModified.value = false;
    isInitialized.value = true;
    console.log("[RuleEditForm] Initial state and baseline set on mount.");
    // Initial check for modification status (should be false)
    checkFormModified();

    // 确保下一轮DOM更新后应用主题
    nextTick(applyThemeToCodeMirror);
  });
});

// 修改图片预览错误处理
const onPreviewImageError = (e: Event) => {
  console.warn("Preview image failed to load:", previewContent.value);
  if (e.target) (e.target as HTMLElement).style.display = "none";
  toast.error(t("snippets.form.preview.imageLoadError"));
};

// 辅助函数：应用当前主题到CodeMirror编辑器
const applyThemeToCodeMirror = () => {
  console.log(
    `[RuleEditForm] 应用主题到CodeMirror: ${isDarkMode.value ? "暗色" : "亮色"}`
  );

  // 获取当前CodeMirror实例
  const editor = cmRef.value?.cminstance;
  if (!editor) return;

  // 根据isDarkMode切换CodeMirror主题
  if (isDarkMode.value) {
    editor.setOption("theme", "dracula");
    document.body.classList.remove("light-theme");
  } else {
    editor.setOption("theme", "elegant"); // 使用elegant浅色主题
    document.body.classList.add("light-theme"); // 为光标样式添加类
  }
};

// 监听主题变化并更新CodeMirror主题
watch(
  isDarkMode,
  () => {
    applyThemeToCodeMirror();
  },
  { immediate: true }
);

// 监听CodeMirror实例的变化，确保主题正确应用
watch(
  () => cmRef.value?.cminstance,
  (newInstance) => {
    if (newInstance) {
      // 延迟执行确保编辑器已完全初始化
      setTimeout(() => {
        applyThemeToCodeMirror();
      }, 50);
    }
  }
);

// Playground 测试弹窗
const showPlaygroundModal = ref(false);
const playgroundText = ref("");
const playgroundResult = ref("");
const playgroundMatched = ref(false);

// 处理 playground 文本内容
const processPlaygroundText = () => {
  const text = playgroundText.value;
  // 获取触发词 - 可能是单个触发词或多个触发词（用逗号或换行符分隔）
  const rawTrigger = formState.value.trigger;
  
  if (!rawTrigger || !text) {
    playgroundResult.value = "";
    playgroundMatched.value = false;
    return;
  }
  
  // 解析所有可能的触发词
  const triggers = rawTrigger
    .split(/[,\n]/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  // 如果没有有效的触发词，直接返回
  if (triggers.length === 0) {
    playgroundResult.value = t("snippets.form.playground.noTrigger");
    playgroundMatched.value = false;
    return;
  }
  
  // 检查是否匹配任何触发词
  let result = text;
  let matched = false;
  let matchedTrigger = "";
  
  // 遍历所有触发词，检查是否匹配
  for (const trigger of triggers) {
    // 根据词边界设置创建正则表达式
    let pattern = trigger;
    if (formState.value.word) {
      pattern = `\\b${escapeRegExp(trigger)}\\b`;
    } else {
      // 如果只启用左词边界或右词边界
      if (formState.value.leftWord) {
        pattern = `\\b${escapeRegExp(trigger)}`;
      } 
      if (formState.value.rightWord) {
        pattern = `${escapeRegExp(trigger)}\\b`;
      }
    }
    
    const regex = new RegExp(pattern, "g");
    
    // 检查是否匹配
    if (regex.test(text)) {
      matched = true;
      matchedTrigger = trigger;
      
      // 模拟替换效果
      const replacement = formState.value.content || "替换内容";
      result = text.replace(regex, `<span class="bg-primary/20 px-1 rounded">${replacement}</span>`);
      break;
    }
  }
  
  // 更新结果
  playgroundMatched.value = matched;
  if (matched) {
    playgroundResult.value = result;
  } else {
    playgroundResult.value = `<span class="text-muted-foreground">${t("snippets.form.playground.noMatch")} ${triggers.join(", ")}</span>`;
  }
};

// 辅助函数：转义正则表达式中的特殊字符
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& 表示整个匹配的字符串
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
  font-size: 14px !important; /* 圆角边框 */
  height: 100% !important; /* 确保编辑器占满父容器 */
}
.CodeMirror-cursors {
  visibility: visible !important;
}

.CodeMirror-cursor {
  /* Use an animation independent of focus state */
  animation: codemirror-blink 1.06s steps(1) infinite !important;
  border-left-color: rgba(
    255,
    255,
    255,
    0.7
  ) !important; /* 使用亮色光标适配暗色主题 */
}

/* 适配深色/浅色主题的光标颜色 */
.light-theme .CodeMirror-cursor {
  border-left-color: rgba(0, 0, 0, 0.7) !important; /* 浅色主题下使用深色光标 */
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

/* 确保背景和边框在暗色主题下更协调 */
.dark .codemirror-container .CodeMirror {
  background-color: hsl(var(--card)) !important; /* 使用卡片背景色 */
  border-color: hsl(var(--border)) !important; /* 使用边框颜色 */
}

/* 调整滚动条样式 */
.CodeMirror ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.CodeMirror ::-webkit-scrollbar-track {
  background: transparent;
}

.CodeMirror ::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 4px;
}

.CodeMirror ::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}

/* 亮色主题下CodeMirror样式增强 */
.CodeMirror {
  transition: border-color 0.25s ease, box-shadow 0.25s ease !important;
  background-color: hsl(var(--background)) !important;
}

/* 亮色主题下的焦点效果 */
.CodeMirror:focus-within {
  border-color: hsl(var(--ring)) !important;
  box-shadow: 0 0 0 1px hsla(var(--ring) / 0.1) !important;
}

/* 亮色主题下的CodeMirror编辑器内容样式 */
.CodeMirror-lines {
  padding: 0.5rem 0 !important;
}

.CodeMirror pre.CodeMirror-line {
  padding: 0 0.5rem !important;
}

/* 改进选中文本样式 */
.CodeMirror-selected {
  background-color: hsla(var(--primary) / 0.1) !important;
}
.dark .CodeMirror-selected {
  background-color: hsla(var(--primary) / 0.25) !important;
}
</style>
