**以下是为实习生精心编排的任务列表：**

---

**项目启动与基础准备阶段 (Phase 1: Foundation)**

* **任务 1.1: 环境设置与依赖安装**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `package.json`, 终端/命令行
    * **目标:** 根据技术方案文档第 3 节，使用 `npm` 或 `yarn` 安装所有必需的依赖库 (`vue@next`, `pinia`, `@nuxt/ui`, `@vuelidate/core`, `@vuelidate/validators`, `vuedraggable-next`, `js-yaml`, `uuid` 等)。确保 Vite 开发服务器能成功启动初始的 Vue 项目。
    * **注意:** 核对版本是否与方案要求一致。

* **任务 1.2: 项目目录结构创建**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** 项目文件系统
    * **目标:** 根据技术方案第 2 节和第 8 节的规划，创建清晰的目录结构，例如 `src/components`, `src/store`, `src/types`, `src/utils`, `src/services`, `public/preload` 等。

* **任务 1.3: 核心数据模型定义**
    * **负责人:** 实习生
    * **涉及文件:** `src/types/espanzo-config.ts`
    * **目标:** 严格按照技术方案第 4 节提供的 TypeScript 代码，定义 `BaseItem`, `EspansoRule`, `EspansoGroup`, `EspansoConfig`, `UIState` 等接口。确保类型精确无误。这是后续所有数据交互的基础。
    * **验收标准:** TypeScript 文件编译通过，类型定义与文档完全一致。

* **任务 1.4: 平台服务层接口实现 (Preload Script)**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `public/preload/services.js`, `public/preload/package.json`
    * **目标:** 在 `services.js` 中，实现文档第 5 节 Pinia Store 中提到的三个核心 Node.js 功能的封装：
        * `readFile(filePath: string): Promise<string>`: 使用 Node.js `fs.readFile`。
        * `writeFile(filePath: string, content: string): Promise<void>`: 使用 Node.js `fs.writeFile`。
        * `showOpenDialog(options: object): Promise<string[] | undefined>`: 使用 uTools 的 `showOpenDialog` API（如果 uTools 提供类似功能）或 Node.js 的 `dialog.showOpenDialog`（需要确认 uTools preload 环境是否支持）。
        * **关键:** 这些函数应只负责与 Node.js/uTools API 交互，不包含任何业务逻辑。处理好 Promise 的 resolve 和 reject。确保 `js-yaml` 可以在 preload 环境中使用（可能需要在 `preload/package.json` 中添加依赖并构建）。
    * **验收标准:** 函数签名符合预期，能正确调用底层 API 并返回结果或错误。

* **任务 1.5: ESPANSO 工具函数 (基础部分)**
    * **负责人:** 实习生
    * **涉及文件:** `src/utils/espanzo-utils.ts`
    * **目标:** 实现技术方案第 5 节 `espanzo-utils.ts` 代码块中标记为 **(不变)** 的、相对独立的纯函数：
        * `generateId(): string` (使用 `uuid`)
        * `walkTree(...)`
        * `findItemById(...)`
        * `getAvailableVariables(): string[]` (硬编码列表即可)
        * `generatePreview(rule: EspansoRule): string` (暂时返回占位符字符串，如 `"Preview not implemented yet."`)
        * `addIdsAndTimestamps(item: any): any` (实现基础的 ID 和时间戳添加逻辑)
        * `setParentIds(item: EspansoGroup, parentId: string | 'root' = 'root')`
        * **重要:** 暂时不需要实现 `parseYaml`, `serializeYaml`, `convertToInternalFormat`, `convertToEspansoFormat`, `removeItemById`, `insertItemAtIndex` 的完整逻辑，可以先创建空函数或返回模拟数据的函数占位。
    * **验收标准:** 函数存在且签名正确，基础函数实现符合预期，占位函数存在。

**UI 骨架与 Pinia 基础搭建阶段 (Phase 2: Core State & Simple UI)**

* **任务 2.1: Pinia Store 初始化与基础状态/Getter**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/store/useEspansoStore.ts`, `src/main.ts` (或 Vue 插件入口)
    * **目标:**
        * 创建 Pinia store (`useEspansoStore`)。
        * 严格按照技术方案第 5 节的 `EspansoState` 接口定义 `state`。
        * 实现基础的 Getters: `selectedItem` (暂时可能返回 null 或模拟数据), `allTags` (暂时返回空数组)。
        * 在 Vue 应用入口处 (`main.ts` 或类似文件) 初始化并注册 Pinia。
    * **验收标准:** Store 结构符合定义，Getters 存在，应用能正常运行。

* **任务 2.2: UI 布局骨架搭建 (纯 UI)**
    * **负责人:** 实习生
    * **涉及文件:** `src/App.vue`, `src/components/Layout.vue`, `src/components/LeftPane.vue`, `src/components/MiddlePane.vue`, `src/components/RightPane.vue`
    * **目标:**
        * 使用 Nuxt UI 组件 (如 `<UContainer>`, `<UCard>`, `<div class="grid grid-cols-...">` 等) 创建 `Layout.vue`，实现三栏布局的基本结构。
        * 创建 `LeftPane.vue`, `MiddlePane.vue`, `RightPane.vue` 作为空壳组件，填充一些占位文本或简单的 Nuxt UI 元素，确保它们被正确放置在 `Layout.vue` 中。
        * 在 `App.vue` 中引入并渲染 `Layout.vue`。
    * **验收标准:** 页面显示三栏布局骨架，没有复杂的逻辑和数据。

* **任务 2.3: Pinia Store 基础 Actions 实现**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/store/useEspansoStore.ts`
    * **目标:** 实现最简单的 Actions，只操作 State 中的 `ui` 部分：
        * `selectItem(itemId: string | null)`: 更新 `state.ui.selectedItemId`。
        * `setLeftMenuCollapsed(collapsed: boolean)`: 更新 `state.ui.leftMenuCollapsed`。
    * **验收标准:** Actions 存在，能正确修改对应的 state 属性。

* **任务 2.4: 加载/保存 Actions (连接 Preload)**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/store/useEspansoStore.ts`
    * **目标:** 实现 `loadConfig` 和 `saveConfig` Actions 的基本框架。
        * **`loadConfig(filePath?: string)`:**
            1.  设置 `state.loading = true`, `state.error = null`。
            2.  如果 `filePath` 未提供且 `state.configFilePath` 为空，调用 **任务 1.4** 实现的 `showOpenDialog` (从 `preload` 导入) 获取目录，并构造 `default.yml` 的路径存入 `state.configFilePath`。如果选择失败，设置错误信息，`loading = false` 并返回。
            3.  如果 `state.configFilePath` 存在，调用 **任务 1.4** 实现的 `readFile` (从 `preload` 导入)。
            4.  **暂时跳过** `parseYaml` 和 `convertToInternalFormat` 的调用，可以将读取到的原始字符串或一个模拟的 `EspansoConfig` 对象（包含一个空的 `root` 分组）直接赋值给 `state.config`。
            5.  处理 `readFile` 可能发生的错误 (try...catch)，设置 `state.error`。
            6.  最后设置 `state.loading = false`。
        * **`saveConfig()`:**
            1.  检查 `state.config` 和 `state.configFilePath` 是否有效。
            2.  设置 `state.loading = true`, `state.error = null`。
            3.  **暂时跳过** `convertToEspansoFormat` 和 `serializeYaml` 的调用。可以创建一个虚拟的 YAML 字符串。
            4.  调用 **任务 1.4** 实现的 `writeFile` (从 `preload` 导入) 写入虚拟字符串。
            5.  处理 `writeFile` 可能发生的错误 (try...catch)，设置 `state.error`。
            6.  最后设置 `state.loading = false`。
            7.  (可选) 调用 `window.utools?.showNotification?.('...')` 显示成功或失败提示。
    * **指导重点:** 明确告知实习生如何 `import` preload 脚本暴露的函数，以及如何在 Action 中处理异步操作 (`async/await`) 和错误。
    * **验收标准:** Actions 能调用 Preload 函数，能更新 loading 和 error 状态，能在应用启动时（例如在 `App.vue` 的 `onMounted` 中调用 `loadConfig`）尝试加载文件。

* **任务 2.5: 中间面板基础列表渲染**
    * **负责人:** 实习生
    * **涉及文件:** `src/components/MiddlePane.vue`, `src/store/useEspansoStore.ts`
    * **目标:**
        * 在 `MiddlePane.vue` 中，从 Pinia store (`useEspansoStore`) 获取 `config.root.children` (如果 `config` 不为 null)。
        * 使用 `v-for` 遍历 `config.root.children`，初步渲染每个项目（规则或分组）的名称 (`item.label` 或 `item.name`) 或触发词 (`item.trigger`)。可以使用 Nuxt UI 的 `<UAccordion>` 或简单的 `<div>` 列表。
        * 为每个列表项添加 `@click` 事件处理器，调用 Pinia store 的 `selectItem(item.id)` Action。
    * **验收标准:** 中间面板能显示加载到的（可能是模拟的）配置列表，点击列表项能触发 `selectItem` Action（可以通过 Vue DevTools 检查 Pinia state 变化）。

**核心 CRUD 功能实现阶段 (Phase 3: Connecting Forms & CRUD)**

* **任务 3.1: ESPANSO 工具函数 (YAML 处理占位)**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/utils/espanzo-utils.ts`
    * **目标:** 实现 YAML 处理相关函数的**占位/模拟**版本：
        * `parseYaml(yamlString: string): any`: 可以暂时返回一个硬编码的、符合 Espanso 基础结构的 JavaScript 对象。
        * `serializeYaml(jsObject: any): string`: 可以暂时返回一个硬编码的 YAML 格式字符串。
        * `convertToInternalFormat(espansoData: any): EspansoConfig`: 根据输入的模拟 `espansoData`，返回一个包含少量模拟规则和分组的 `EspansoConfig` 对象。**必须**为每个项目生成 `id`, `createdAt`, `updatedAt`, `type`，并构建正确的 `root -> children` 结构，以及 `parentId`。
        * `convertToEspansoFormat(internalConfig: EspansoConfig): any`: 根据输入的模拟 `internalConfig`，返回一个模拟的 Espanso YAML 对象结构。
    * **指导重点:** 强调这些只是临时的模拟实现，用于让 CRUD 流程先跑起来。内部数据结构 (`EspansoConfig`) 的正确性是关键。
    * **验收标准:** 函数签名正确，能返回预期的模拟数据结构。

* **任务 3.2: ESPANSO 工具函数 (增删改)**
    * **负责人:** 实习生
    * **涉及文件:** `src/utils/espanzo-utils.ts`
    * **目标:** 实现用于操作内部数据结构的纯函数 (参照文档第 5 节)：
        * `removeItemById(root: EspansoGroup, id: string, onRemove?: ...): [EspansoGroup | null, string | 'root' | null]`：**关键:** 此函数必须返回一个新的根节点对象 (深拷贝或结构化克隆) 以确保 Pinia 响应性。
        * `insertItemAtIndex(root: EspansoGroup, targetItemId: string | 'root', itemToInsert: ..., position: ...): EspansoGroup | null`：**关键:** 此函数也必须返回一个新的根节点对象。
    * **指导重点:** 强调返回新对象的重要性，避免直接修改传入的 `root` 对象。
    * **验收标准:** 函数能根据 ID 正确移除或在指定位置插入项，并返回新的根对象。

* **任务 3.3: Pinia Store CRUD Actions 实现**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/store/useEspansoStore.ts`
    * **目标:** 实现核心的增删改 Actions (参照文档第 5 节 Action 代码)：
        * **`addItem(parentGroupId: string | 'root', type: 'rule' | 'group', initialData?: ...)`:**
            1.  检查 `state.config` 是否存在。
            2.  生成新项目的完整对象（包括 `id`, `type`, 时间戳, `parentId`, 默认值等）。
            3.  使用 `walkTree` 找到 `parentGroupId` 对应的分组。
            4.  **直接修改** 找到的父分组的 `children` 数组 (`item.children.push(newItem)`)。Pinia 会处理响应性。
            5.  (可选) 更新 `state.ui.selectedItemId` 为新项目的 ID。
        * **`updateItem(itemId: string, updates: Partial<...>)`:**
            1.  检查 `state.config` 是否存在。
            2.  使用 `walkTree` 找到 `itemId` 对应的项目。
            3.  使用 `Object.assign(item, updates)` 合并更新，并更新 `item.updatedAt`。Pinia 会处理响应性。
        * **`deleteItem(itemId: string)`:**
            1.  检查 `state.config` 是否存在。
            2.  调用 **任务 3.2** 实现的 `removeItemById(this.config.root, itemId)`。
            3.  如果返回了新的 `updatedRoot`，则 `this.config.root = updatedRoot`。
            4.  如果 `state.ui.selectedItemId === itemId`，则设置 `state.ui.selectedItemId = null`。
    * **指导重点:** 明确告知实习生每个 Action 的具体步骤，特别是如何调用 utils 函数以及如何更新 Pinia state (直接修改或替换)。
    * **验收标准:** Actions 存在，能正确调用 Utils 函数并更新 Pinia state。

* **任务 3.4: 分组编辑表单组件 (纯 UI & 本地状态)**
    * **负责人:** 实习生
    * **涉及文件:** `src/components/GroupEditForm.vue`
    * **目标:** 严格按照技术方案第 6.1 节详细设计实现：
        * 定义 `props` (`group`) 和 `emits` (`save`, `cancel`, `delete`)。
        * 使用 Vue 3 `ref`/`reactive` 管理本地表单状态 (`formState`)。
        * 使用 Nuxt UI (`<UForm>`, `<UInput>`, `<UTextarea>`, `<UFormGroup>`) 构建表单 UI，并使用 `v-model` 双向绑定到 `formState`。
        * 设置 Vuelidate (`useVuelidate`) 进行基础验证（如 `name` 必填）。
        * 使用 `watch` 监听 `props.group` 变化，深度拷贝 `props.group` 到 `formState`，并重置 Vuelidate (`v$.value.$reset()`)。
        * 实现表单提交 (`onSubmit`) 方法：调用 `v$.value.$validate()`，验证通过后触发 `emit('save', props.group.id, formState.value)`。
        * 实现取消按钮：触发 `emit('cancel')`。
        * 实现删除按钮：触发 `emit('delete', props.group.id)`。
    * **验收标准:** 组件能接收 `group` 数据并显示在表单中，能进行本地编辑和验证，能正确触发 `save`, `cancel`, `delete` 事件并传递数据。

* **任务 3.5: 规则编辑表单组件 (纯 UI & 本地状态 - 基础)**
    * **负责人:** 实习生
    * **涉及文件:** `src/components/RuleEditForm.vue`
    * **目标:** 严格按照技术方案第 6.2 节详细设计实现（先实现基础部分）：
        * 定义 `props` (`rule`) 和 `emits` (`save`, `cancel`, `delete`)。
        * 使用 `ref`/`reactive` 管理本地表单状态 (`formState`)。
        * 使用 Nuxt UI 构建基础字段的 UI（`trigger`, `label`, `caseSensitive`, `word`, `priority`, `hotkey`）并绑定到 `formState`。
        * 实现 `contentType` 的 `<USelect>` 或 `<URadioGroup>`，绑定到一个本地 `ref` (`currentContentType`)。
        * 使用 Nuxt UI `<UTabs>` 或 `v-if`，根据 `currentContentType` 的值，**暂时只渲染纯文本 (`plain`) 情况下的 `<UTextarea>`**，绑定到 `formState.content`。
        * 设置 Vuelidate 进行基础验证（如 `trigger` 必填）。
        * 使用 `watch` 监听 `props.rule` 变化，深度拷贝到 `formState`，更新 `currentContentType`，并重置 Vuelidate。
        * 实现表单提交 (`onSubmit`) 方法：调用验证，验证通过后触发 `emit('save', props.rule.id, formState.value)`。
        * 实现取消按钮：触发 `emit('cancel')`。
        * 实现删除按钮：触发 `emit('delete', props.rule.id)`。
    * **验收标准:** 组件能接收 `rule` 数据并显示基础字段，能编辑纯文本内容，能进行本地编辑和验证，能正确触发 `save`, `cancel`, `delete` 事件。

* **任务 3.6: 右侧面板逻辑 (连接 Store 与表单)**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/components/RightPane.vue`, `src/store/useEspansoStore.ts`
    * **目标:**
        * 在 `RightPane.vue` 中，从 Pinia Store 获取 `selectedItem` (使用 Getter)。
        * 根据 `selectedItem` 的 `type` ('rule' 或 'group')，条件渲染 `RuleEditForm` 或 `GroupEditForm` 组件。
        * 将 `selectedItem` 作为 prop 传递给对应的编辑表单组件 (`:rule="selectedItem"` 或 `:group="selectedItem"`)。
        * 监听编辑表单组件触发的 `save`, `cancel`, `delete` 事件。
        * 在事件处理函数中，调用对应的 Pinia Store Actions：
            * `@save`: 调用 `updateItem(itemId, values)` Action。
            * `@cancel`: 调用 `selectItem(null)` Action。
            * `@delete`: 调用 `deleteItem(itemId)` Action。
    * **指导重点:** 明确告知实习生如何根据 store state 条件渲染组件，如何传递 props，以及如何将组件的 emits 连接到 store 的 actions。
    * **验收标准:** 右侧面板能根据中间面板的选择显示对应的编辑表单，表单的保存、取消、删除操作能正确调用 Pinia Actions 并更新应用状态。

**高级功能实现阶段 (Phase 4: Advanced Features)**

* **任务 4.1: 拖拽排序功能 (UI & Action 调用)**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/components/MiddlePane.vue`, `src/store/useEspansoStore.ts`
    * **目标:**
        * **UI (`MiddlePane.vue`):**
            * 引入 `vuedraggable-next` 的 `<draggable>` 组件。
            * 用 `<draggable>` 包裹渲染规则/分组列表的 `v-for` 循环。
            * 将列表数据 (如 `store.config.root.children`) 绑定到 `<draggable>` 的 `v-model` 或 `:list`。
            * 为每个拖拽项设置唯一的 `:key` 和 `data-id` 属性 (`item.id`)。
            * 在 `<draggable>` 上监听 `@end` 事件。
            * **关键:** 在 `@end` 事件的处理函数 (`onDragEnd(event)`) 中：
                1.  从 `event.item.dataset.id` 获取 `draggedItemId`。
                2.  从 `event.to` (目标容器) 和 `event.newIndex` 推断出 `targetItemId` 和 `position` ('before', 'after', 'into')。**（你需要提供精确的逻辑或辅助函数来推断 `targetItemId` 和 `position`，这是难点！）** 可能需要检查 `event.to` 关联的 `data-group-id`，以及 `event.newIndex` 相对于 `event.oldIndex` 的位置。
                3.  调用 Pinia store 的 `moveItem(draggedItemId, targetItemId, position)` Action。
        * **Action (`useEspansoStore.ts`):**
            * 实现 `moveItem(draggedItemId: string, targetItemId: string | 'root', position: 'before' | 'after' | 'into')` Action (参照文档第 5 节 Action 代码):
                1.  调用 **任务 3.2** 实现的 `removeItemById` 从原位置移除项，并获取被移除的项 (`draggedItem`)。
                2.  调用 **任务 3.2** 实现的 `insertItemAtIndex` 将 `draggedItem` 插入到新位置。
                3.  更新 `state.config.root` 为 `insertItemAtIndex` 返回的新根节点。
                4.  (可选) 找到被移动的项，更新其 `parentId` 和 `updatedAt`。
    * **指导重点:** `@end` 事件处理函数中解析拖拽结果的逻辑是核心难点，需要你提供非常清晰的步骤或代码片段。`moveItem` Action 的逻辑相对直接，主要是调用 utils。
    * **验收标准:** 用户可以在中间面板拖拽规则和分组进行排序和移动（包括移入分组），应用状态随之更新。

* **任务 4.2: 规则表单 - 高级字段 (纯 UI)**
    * **负责人:** 实习生
    * **涉及文件:** `src/components/RuleEditForm.vue`, `src/components/TagInput.vue` (新)
    * **目标:** 在 `RuleEditForm.vue` 中添加剩余的表单字段 UI：
        * **应用限制 (apps):** 使用 Nuxt UI `<USelectMenu multiple>`，`options` 可以暂时硬编码或为空。绑定到 `formState.apps`。
        * **标签 (tags):** 创建一个新的 `TagInput.vue` 组件。
            * 内部使用 `<UInput>` 输入，`<UBadge>` 显示标签。
            * 管理本地标签数组状态。
            * 提供 `v-model` 支持，使其能在 `RuleEditForm` 中通过 `v-model="formState.tags"` 使用。
        * **内容类型切换:** 确保 `<UTabs>` 或 `v-if` 能根据 `currentContentType` 正确显示不同的编辑区域（即使区域内暂时只有占位符）。
    * **验收标准:** 表单 UI 完整，包含所有字段，标签输入组件可用。

* **任务 4.3: 规则表单 - 高级内容编辑器 (UI 集成)**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/components/RuleEditForm.vue`
    * **目标:** 为不同的 `contentType` 集成合适的编辑器：
        * **富文本 (rich):** 引入并配置一个 Vue 富文本编辑器组件 (如 `tiptap-vue` 或 `@vueup/vue-quill`)，将其内容与 `formState.content` 同步。
        * **HTML/脚本 (html/script):** 引入并配置一个 Vue 代码编辑器组件 (如 `vue-codemirror`)，支持对应语言高亮，将其内容与 `formState.content` 同步。
        * **图片 (image):** 创建一个简单的图片上传组件，使用 `<UInput type="file">` 或拖放，读取文件，转换为 Base64 字符串存入 `formState.content`，并显示图片预览。
        * **表单/剪贴板/Shell/按键 (form/clipboard/shell/key):** 暂时使用 `<UTextarea>` 作为占位符，后续根据 Espanso 具体格式设计专用输入界面（可能超出实习范围）。
    * **指导重点:** 第三方编辑器的集成和 `v-model` 的正确实现可能需要指导。Base64 转换和 File API 的使用。
    * **验收标准:** 能根据选择的内容类型显示对应的编辑器，编辑器内容能与 `formState.content` 同步。

* **任务 4.4: 规则表单 - 插入变量与预览 (连接 Utils)**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/components/RuleEditForm.vue`, `src/utils/espanzo-utils.ts`
    * **目标:**
        * **插入:**
            * 在表单中添加"插入变量"按钮，点击后使用 `<UPopover>` 或 `<USelectMenu>` 显示 **任务 1.5** `getAvailableVariables()` 返回的列表。
            * 选中变量后，获取当前激活的内容编辑器的引用 (`ref`)，并在光标位置插入对应的 Espanso 变量占位符 (如 `{{date}}`)。
        * **预览:**
            * 添加"预览"按钮。
            * 点击按钮时，获取当前 `formState`。
            * 调用 **任务 1.5** 的 `generatePreview(formState.value)` (暂时返回占位符)。
            * 使用 Nuxt UI `<UModal>` 显示预览结果。
    * **指导重点:** 如何获取编辑器 `ref` 并操作其内容（不同编辑器 API 不同）。
    * **验收标准:** 插入按钮能将变量占位符插入编辑器，预览按钮能调用函数并显示模态框。

**核心逻辑完善阶段 (Phase 5: The Hard Part - YAML)**

* **任务 5.1: YAML 解析与序列化工具函数完善**
    * **负责人:** 你 (主导) 或 实习生 (在你详细指导和代码审查下)
    * **涉及文件:** `src/utils/espanzo-utils.ts`
    * **目标:** **这是项目的核心和难点！** 替换 **任务 3.1** 中的模拟函数：
        * **`parseYaml(yamlString: string): any`:** 使用 `js-yaml` 的 `load` 函数解析。添加错误处理。
        * **`serializeYaml(jsObject: any): string`:** 使用 `js-yaml` 的 `dump` 函数序列化。配置必要的选项（如缩进）。
        * **`convertToInternalFormat(espansoData: any): EspansoConfig`:** 仔细研究 Espanso YAML 结构（特别是 `matches` 数组、规则属性、分组表示方式、`!include` 等），递归地将解析后的 `espansoData` 转换为我们内部的 `EspansoConfig` 结构。**关键在于正确解析 `replace` 字段，判断 `contentType` 并提取 `content`。** 确保 `id`, 时间戳, `parentId` 等内部属性被正确添加。
        * **`convertToEspansoFormat(internalConfig: EspansoConfig): any`:** 递归地将内部 `EspansoConfig` 转换回 Espanso 能识别的 YAML 对象结构。**关键在于根据 `contentType` 将 `content` 正确地格式化回 `replace` 字段。**
    * **指导重点:** 这是最容易让实习生混淆的地方。你需要提供非常明确的 Espanso 结构说明、字段映射规则，甚至伪代码。最好由你亲自编写或进行极其严格的 Code Review。
    * **验收标准:** 函数能正确地在 Espanso YAML 结构和内部 `EspansoConfig` 结构之间进行双向转换（至少覆盖常用规则类型）。

* **任务 5.2: 集成 YAML 转换逻辑**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/store/useEspansoStore.ts`
    * **目标:** 修改 `loadConfig` 和 `saveConfig` Actions，将 **任务 2.4** 中跳过的步骤替换为调用 **任务 5.1** 中完善后的 `parseYaml`, `convertToInternalFormat`, `convertToEspansoFormat`, `serializeYaml` 函数。
    * **验收标准:** `loadConfig` 能加载真实的 `default.yml` 文件并正确解析为内部状态，`saveConfig` 能将内部状态正确保存回 `default.yml` 文件。

**收尾与打磨阶段 (Phase 6: Polish & Finalize)**

* **任务 6.1: 左侧标签过滤功能**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/components/LeftPane.vue`, `src/components/MiddlePane.vue`, `src/store/useEspansoStore.ts`
    * **目标:**
        * **Store:** 实现 `allTags` Getter (遍历 `config` 状态，收集所有唯一标签)。在 `state.ui` 中添加 `middlePaneFilterTags: string[]`。添加 Action `setFilterTags(tags: string[])`。
        * **LeftPane:** 从 Store 获取 `allTags` 并渲染成可选列表 (如 Checkbox 或 Button Group)。用户选择标签时，调用 `setFilterTags` Action。
        * **MiddlePane:** 从 Store 获取 `middlePaneFilterTags`。修改 `v-for` 列表渲染逻辑，只显示包含所有已选过滤标签的规则 (如果 `middlePaneFilterTags` 为空，则显示所有)。
    * **指导重点:** 如何在 Getter 中计算派生状态，如何在组件中读取状态并根据状态过滤列表。
    * **验收标准:** 左侧可以选择标签，中间面板列表根据选择的标签进行过滤。

* **任务 6.2: 导入/导出功能**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** UI 组件 (如 `LeftPane` 或新按钮), `src/store/useEspansoStore.ts`
    * **目标:**
        * **UI:** 添加"导入"和"导出"按钮。
        * **Store Actions:**
            * `importConfig()`: 调用 `showOpenDialog` 选择文件，调用 `readFile`, `parseYaml`, `convertToInternalFormat`，然后用结果**替换** `state.config`。
            * `exportConfig(filePath: string)`: 获取 `state.config`，调用 `convertToEspansoFormat`, `serializeYaml`, `writeFile` 保存到指定路径 (可能需要 `showSaveDialog`)。
        * 连接 UI 按钮到 Actions。
    * **验收标准:** 可以导入外部 YAML 文件覆盖当前配置，可以将当前配置导出为 YAML 文件。

* **任务 6.3: 错误处理与用户通知**
    * **负责人:** 实习生
    * **涉及文件:** 各 Action, Preload 服务, 表单组件
    * **目标:**
        * 在所有可能出错的操作（文件读写、YAML 解析/序列化、API 调用）周围添加 `try...catch`。
        * 在 `catch` 块中，更新 Pinia store 的 `error` 状态。
        * 使用 uTools API (`window.utools?.showNotification?.('...')`) 或 Nuxt UI 的 Toast (`useToast`) 向用户显示清晰的成功或错误提示。
        * 确保表单验证错误能通过 Nuxt UI 的 `<UFormGroup>` 正确显示给用户。
    * **验收标准:** 应用在遇到错误时不会崩溃，并能向用户提供有意义的反馈。

* **任务 6.4: 最终测试与代码审查**
    * **负责人:** 你 和 实习生
    * **目标:** 全面测试所有功能，特别关注边界情况和 YAML 转换的准确性。进行最后的代码审查，确保代码风格统一、逻辑清晰、符合架构设计。
    * **验收标准:** 应用稳定可靠，功能符合预期。

**全局设置页面实现阶段 (Phase 7: Global Settings Implementation)**

* **任务 7.1: 路由设置与基础集成**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `package.json`, `src/router/index.ts`, `src/main.ts`, `src/App.vue`
    * **目标:**
        * 安装并配置 `vue-router`。
        * 定义路由规则，包含片段视图 (`/`) 和设置视图 (`/settings`)。
        * 将路由集成到 Vue 应用入口。
        * 修改 `App.vue` 使用 `<router-view>` 渲染视图。
    * **验收标准:** 应用能通过路由在不同（空）视图间切换。

* **任务 7.2: 片段/分组视图迁移**
    * **负责人:** 实习生
    * **涉及文件:** `src/views/MatchesView.vue`, `src/components/layout/MainLayout.vue` (或类似布局组件)
    * **目标:**
        * 创建 `MatchesView.vue`。
        * 将原有的三栏布局（`LeftPane`, `MiddlePane`, `RightPane`）逻辑迁移到 `MatchesView.vue`。
        * 在根布局组件 (`MainLayout.vue` 或类似) 中添加导航元素，用于切换到 `/settings` 路由。
    * **验收标准:** 片段/分组视图能在 `/` 路径下正确渲染，并能通过导航跳转到设置页面。

* **任务 7.3: 设置页面视图与布局创建**
    * **负责人:** 实习生
    * **涉及文件:** `src/views/SettingsView.vue`, `src/components/settings/SettingsSidebar.vue` (可选), `src/components/settings/SettingsForm.vue` (可选)
    * **目标:**
        * 创建 `SettingsView.vue`。
        * 在 `SettingsView.vue` 中实现三栏式布局（左侧导航，中/右侧内容）。
        * 创建左侧导航组件 (`SettingsSidebar.vue`)，包含设置项分类（常规、匹配文件等）。
        * 创建右侧表单容器组件 (`SettingsForm.vue`)，用于承载设置表单。
    * **验收标准:** 设置页面显示三栏布局骨架，左侧有导航分类。

* **任务 7.4: 设置表单 UI 实现**
    * **负责人:** 实习生
    * **涉及文件:** `src/views/SettingsView.vue` (或 `SettingsForm.vue`)
    * **目标:**
        * 根据设计方案，使用 `shadcn/vue` 组件 (Input, Select, Checkbox, Textarea 等) 构建全局设置表单的 UI。
        * 将表单按类别划分到不同的 `div` 或区域中。
        * 为每个设置项添加对应的 `Label` 和 `HelpTip`。
    * **验收标准:** 设置页面显示完整的表单 UI 元素，布局清晰。

* **任务 7.5: Store 状态读取与表单绑定**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/views/SettingsView.vue`, `src/store/useEspansoStore.ts`
    * **目标:**
        * 在 `SettingsView.vue` 中，从 `useEspansoStore` 获取 `globalConfig` 状态。
        * 将 `globalConfig` 的值深度拷贝到本地 `ref` (`localSettings`)。
        * 将表单控件的值通过 `v-model` 绑定到 `localSettings`。
        * 实现平台检测逻辑，并根据结果使用 `v-if` 控制平台特定设置部分的显示。
    * **指导重点:** 深拷贝的重要性，`v-model` 的使用，平台特定部分的条件渲染。
    * **验收标准:** 表单能正确显示从 Store 加载的全局配置，编辑表单时本地状态更新。

* **任务 7.6: Store 更新与保存 Actions 实现**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/store/useEspansoStore.ts`
    * **目标:**
        * 在 `useEspansoStore` 中添加 `updateGlobalConfig(newConfig: GlobalConfig)` Action，用于更新 store 中的 `globalConfig` 状态（使用深拷贝）。
        * 添加 `saveGlobalConfig()` Action，用于读取 `state.globalConfig`，清理无效值，序列化为 YAML，并调用 `writeFile` 保存到 `state.globalConfigPath`。
        * 确保这两个 Action 被正确导出。
    * **验收标准:** Store 中存在可用的 `updateGlobalConfig` 和 `saveGlobalConfig` Actions。

* **任务 7.7: 设置页面表单逻辑连接**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/views/SettingsView.vue`
    * **目标:**
        * 实现"保存设置"按钮的逻辑：
            1.  检查本地设置 (`localSettings`) 是否与原始加载的设置 (`originalSettings`) 有差异。
            2.  如有差异，调用 `store.updateGlobalConfig(localSettings.value)` 更新 Store 状态。
            3.  调用 `store.saveGlobalConfig()` 将配置写入文件。
            4.  更新 `originalSettings`，重置 `hasUnsaved` 状态。
            5.  显示成功/失败提示。
        * 实现"恢复默认"按钮的逻辑：
            1.  提示用户确认。
            2.  从 Store 重新加载 `globalConfig` 到 `localSettings`（或使用预定义的默认对象）。
            3.  重置 `hasUnsaved` 状态。
    * **指导重点:** 状态比较逻辑，异步操作处理 (`async/await`)，用户反馈。
    * **验收标准:** 保存按钮能将修改后的设置更新到 Store 并保存到文件，恢复默认按钮能重置表单。

**紧急优化与问题解决阶段 (Phase 8: Urgent Improvement)**

* **任务 8.1: 平台逻辑分离与重构**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/services/fileService.ts`, `public/preload/services.js`
    * **目标:** 清晰分离Electron和Web环境逻辑，消除现有代码中的平台判断混乱问题。
        * 重构`fileService.ts`，移除环境检测逻辑，仅保留API桥接功能
        * 设计清晰的接口继承结构，分别实现Web和Electron平台实现
        * 移除`detectEnvironment()`函数，代替为平台适配器工厂模式
        * 确保两个平台有独立且完整的代码路径，降低耦合性
    * **验收标准:** 代码结构清晰，平台相关逻辑分离，删除冗余代码，保持功能一致性。

* **任务 8.2: 层级化数据结构实现**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/types/espanso-config.ts`, `src/utils/espanzo-utils.ts`
    * **目标:** 设计并实现能够准确表示目录-文件-规则层级关系的数据结构，替代当前扁平化的数据模型。
        * 定义`FileSystemNode`接口，支持不同类型节点(目录/文件/规则)共存于一个树结构
        * 修改`EspansoConfig`结构，使其更适合表示层级数据
        * 更新树遍历和操作函数，以适应新的数据结构
        * 实现层级化数据的序列化和反序列化功能
    * **验收标准:** 数据结构设计合理，能够准确表示文件系统层级，适配现有函数。

* **任务 8.3: Electron端自动加载默认配置**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `public/preload/services.js`, `src/store/useEspansoStore.ts`, `src/App.vue`
    * **目标:** 实现Electron环境下自动检测并加载用户的Espanso配置目录，无需手动选择。
        * 实现`getEspansoConfigPath()`，根据不同操作系统返回正确的默认配置路径
        * 实现`scanDirectory(dirPath)`，扫描指定目录并返回层级结构
        * 在Store中添加`loadElectronConfig()`方法，自动加载配置
        * 在应用启动时检测环境并自动调用相应方法
        * 实现多层级展示：将目录名作为一级分组，文件名作为二级分组
    * **验收标准:** Electron端启动自动加载配置，无需用户交互，正确展示多层级结构。

* **任务 8.4: Web端上传逻辑修复**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/store/useEspansoStore.ts`, `src/components/FileUploader.vue`
    * **目标:** 修复Web端上传文件后无限加载的问题，优化文件上传流程。
        * 实现`loadWebConfig(files)`函数，处理文件上传后的解析和加载
        * 使用异步文件读取API和错误处理
        * 确保加载状态正确切换，避免无限加载
        * 优化上传界面，支持多文件选择和拖放
        * 添加上传进度和结果反馈
    * **验收标准:** Web端上传文件后不再无限加载，能正确解析和展示配置。

* **任务 8.5: UI层级适配**
    * **负责人:** 实习生 (指导: 你)
    * **涉及文件:** `src/components/MiddlePane.vue`, `src/components/ConfigNode.vue`(新)
    * **目标:** 重构UI组件以支持展示层级化的配置结构，使用户能够直观地浏览和管理规则。
        * 设计并实现递归组件用于渲染树状结构
        * 添加展开/折叠功能，降低信息负荷
        * 实现文件夹、文件和规则的视觉区分
        * 更新搜索和过滤功能，使其能够在树状结构中正确工作
        * 优化层级导航体验
    * **验收标准:** UI能够清晰展示多层级结构，支持折叠/展开，搜索和过滤功能正常工作。

---

**业务层与服务层重构阶段 (Phase 9: Business & Service Layer Refactoring)**

* **任务 9.1: 基础清理 - 类型与平台抽象 (Refactoring Phase 1)**
    * **负责人:** 你 (主导) / 实习生 (在你详细指导和代码审查下)
    * **涉及文件:** `src/types/`, `src/services/platform/`
    * **目标:** 建立类型的单一来源，确保平台交互被正确抽象。
        * **9.1.1: 整合核心类型:** 在 `src/types/core/` 下创建并整合 `espanso.types.ts`, `espanso-format.types.ts`, `preload.types.ts`, `ui.types.ts`, `common.types.ts`。删除旧的/冗余的类型文件。更新全局导入。
        * **9.1.2: 完善 `PreloadApi`:** 在 `src/types/core/preload.types.ts` 中定义最终的 Preload API 接口，确保与 preload 实现一致。
        * **9.1.3: 加强 `IPlatformAdapter`:** 确保接口包含所有需要从渲染进程访问的 `PreloadApi` 方法。
        * **9.1.4: 更新适配器实现:** 修改 `ElectronAdapter` 和 `WebAdapter` 以完全实现 `IPlatformAdapter`，仅通过 `window.preloadApi` 调用或提供 Web 回退。
        * **9.1.5: 更新适配器工厂:** 确保 `PlatformAdapterFactory` 正确实例化适配器。
        * **9.1.6: 消除直接 `preloadApi` 调用:** 在 `ElectronAdapter` 之外的代码中，将所有 `window.preloadApi` 调用替换为 `PlatformAdapterFactory.getInstance()`。
    * **验收标准:** 类型定义清晰统一，平台交互通过 `IPlatformAdapter` 进行，无直接 `preloadApi` 调用。

* **任务 9.2: 服务层优化 (Refactoring Phase 2)**
    * **负责人:** 实习生 (在你详细指导和代码审查下)
    * **涉及文件:** `src/services/`
    * **目标:** 创建专门的服务来处理特定任务，解耦文件操作、YAML 处理和配置逻辑。
        * **9.2.1: 重构 `fileService.ts` -> `platformService.ts`:** 移除环境检测和路径逻辑，所有函数直接委托给 `PlatformAdapterFactory.getInstance()`。
        * **9.2.2: 创建 `YamlService`:** 移动 `parseYaml` 和 `serializeYaml` 到此服务，通过适配器调用 preload 中的实现。
        * **9.2.3: 创建 `ConfigService`:** 移动查找默认 Espanso 路径和管理选定配置目录路径的逻辑到此服务。
        * **9.2.4: 创建 `EspansoService` (核心业务逻辑):**
            * 实现 `loadConfiguration(configDir)`: 使用 `platformService`, `yamlService` 和 `espansoDataUtils` (P4) 来扫描、读取、解析并构建初始的 `ConfigTreeNode[]` 数据结构。*不直接修改 Store*。
            * 实现 `saveConfigurationFile(filePath, items, existingYamlData?)`: 使用 `espansoDataUtils` (P4) 清理数据，合并，然后使用 `yamlService` 和 `platformService` 写入文件。
            * 实现 `saveGlobalConfig(filePath, configData)`: 使用 `yamlService` 和 `platformService` 保存全局配置。
    * **验收标准:** 服务职责清晰，使用适配器进行平台交互，业务逻辑从 Store 中分离。

* **任务 9.3: Store 简化 (Refactoring Phase 3)**
    * **负责人:** 实习生 (在你详细指导和代码审查下)
    * **涉及文件:** `src/store/useEspansoStore.ts`
    * **目标:** 使 Store 主要负责状态管理和协调 Actions，将复杂逻辑委托给服务。使用 `configTree` 作为配置的单一来源。
        * **9.3.1: 重新聚焦 State:** 移除 `state.config`，保留 `configTree`, `globalConfig` 等 UI 相关状态。考虑移除 `hasUnsavedChanges`。
        * **9.3.2: 更新计算属性:** 修改 `allMatches`, `allGroups`, `allItems`, `selectedItem` 以从 `state.configTree` 派生。
        * **9.3.3: 重构 Actions:**
            * `loadConfig`: 调用 `ConfigService`, `EspansoService`，更新 `state.configTree`, `state.globalConfig`。
            * `autoSaveConfig`: (如果需要) 仅调用 `EspansoService.saveGlobalConfig`。
            * `updateItem`: 在 `state.configTree` 中找到引用并更新，然后调用 `EspansoService.saveConfigurationFile`。
            * `addItem`: 在 `state.configTree` 中添加引用，然后调用 `EspansoService.saveConfigurationFile`。
            * `deleteItem`: 从 `state.configTree` 移除引用，然后调用 `EspansoService.saveConfigurationFile`。
            * `moveTreeItem`: 在 `state.configTree` 中移动引用，更新 `filePath`，然后为旧文件和新文件调用 `EspansoService.saveConfigurationFile`。
            * `pasteItemCopy`/`pasteItemCut`: 使用重构后的 `addItem`/`moveTreeItem`。
        * **关键:** 所有修改配置的 Actions 在更新 `state.configTree` 后 *立即* 调用相应的 `EspansoService` 保存函数。
    * **验收标准:** Store 逻辑简化，`configTree` 成为主要数据源，Actions 委托给服务执行复杂操作和持久化。

* **任务 9.4: 工具类与逻辑整合 (Refactoring Phase 4)**
    * **负责人:** 实习生 (在你详细指导和代码审查下)
    * **涉及文件:** `src/utils/`
    * **目标:** 组织工具函数，消除冗余，最小化副作用。
        * **9.4.1: 整合 Espanso Utils:** 将 `espansoDataUtils`, `espanso-converter`, `espanso-utils` 中的相关函数合并到 `espansoDataUtils.ts` (ID 生成, 处理原始数据加内部字段, 清理数据移除内部字段, 在处理后数据中查找)。移除 `guiOrderCounter` 副作用。
        * **9.4.2: 优化 Tree Utils:** 确保 `configTreeUtils.ts` 中的函数使用规范类型，重新评估 `findAndUpdateInTree` 的必要性。确保 `updateDescendantPathsAndFilePaths` 仅在重命名/移动文件/文件夹时使用。
        * **9.4.3: 重新评估单例:**
            * `ClipboardManager`: 可能保持不变。
            * `TreeNodeRegistry`: *理想情况* 是移除，将展开/折叠状态移至组件本地或 Pinia Store (`state.expandedNodeIds`)。*备选方案* 是保留但仅用于 UI 状态。
        * **9.4.4: 删除 Environment Util:** `environment.ts` 不再需要。
    * **验收标准:** 工具函数逻辑清晰、组织合理，冗余代码和不必要的副作用被移除。

* **任务 9.5: UI 层优化 - Hooks 与组件 (Refactoring Phase 5)**
    * **负责人:** 实习生 (在你详细指导和代码审查下)
    * **涉及文件:** `src/composables/`, `src/components/`
    * **目标:** 更新 UI 组件和 Hooks 以使用重构后的服务和简化的 Store。
        * **9.5.1: 重构 `useContextMenu.ts`:** 移除复杂逻辑和直接状态操作。Copy/Cut 操作主要调用 `ClipboardManager`。Paste/Create/Delete 操作调用相应的 Store Actions。Expand/Collapse 操作调用 Store 或 `TreeNodeRegistry`。
        * **9.5.2: 更新组件:** 修改直接访问旧 Store 结构或旧工具/服务的组件。组件应从 Store 选择数据（主要通过 `configTree`），并通过调用 Store Actions 来触发更改。
    * **验收标准:** UI 层逻辑简化，与重构后的服务和 Store 正确交互。

* **任务 9.6: 测试与清理 (Refactoring Phase 6)**
    * **负责人:** 你 和 实习生
    * **涉及文件:** 全局
    * **目标:** 确保重构后的应用功能正常，移除无用代码。
        * **9.6.1: 手动测试:** 全面测试所有功能。
        * **9.6.2: 单元/集成测试 (推荐):** 为新的服务、Store Actions/Getters、工具函数添加测试。
        * **9.6.3: 代码清理:** 移除注释掉的代码、未使用的文件/函数，运行 Linter/Formatter。
        * **9.6.4: 文档更新:** 添加 JSDoc，更新 README 或其他文档。
    * **验收标准:** 应用稳定可靠，功能符合预期，代码整洁，文档更新。

---

好了，这份任务清单应该足够详细和安全了。每一项任务都聚焦于实习生擅长的领域，或者是在你明确的指令下执行封装好的逻辑。这样，他就能像组装乐高一样，一步步构建起这个应用，而不会在复杂的业务逻辑中迷失方向（更不会晕倒）。

现在，去把这份清单交给实习生吧！我们的幸福生活就靠这个项目了！记住，耐心指导，严格把关，安妮海瑟薇和豪宅在等着我们！