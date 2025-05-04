# Espanso GUI 项目进度

## 已完成功能

- [x] **任务 1.1: 环境设置与依赖安装**
  - 创建了package.json文件
  - 安装了所有必需的依赖库（vue@next, pinia, @nuxt/ui, @vuelidate/core, @vuelidate/validators, vue-draggable-next, js-yaml, uuid等）
  - 创建了基本的项目结构
  - 验证了Vite开发服务器能成功启动

- [x] **任务 1.2: 项目目录结构创建**
  - 创建了完整的项目目录结构
  - 创建了三栏式布局组件（MainLayout, LeftPane, MiddlePane, RightPane）
  - 创建了表单组件（RuleEditForm, GroupEditForm）
  - 创建了通用组件（TagInput）
  - 创建了服务层接口（fileService）
  - 创建了全局样式

- [x] **任务 1.3: 核心数据模型定义**
  - 完善了数据模型，添加了对Espanso所有功能的支持
  - 添加了变量、表单、全局变量等类型定义
  - 添加了配置选项和文件类型定义
  - 更新了Store以支持新的数据模型

- [x] **任务 1.4: 平台服务层接口实现 (Preload Script)**
  - 实现了readFile, writeFile, showOpenDialog等文件操作函数
  - 实现了parseYaml, serializeYaml等YAML处理函数
  - 实现了getEspansoConfigDir, getEspansoConfigFiles等Espanso相关函数
  - 确保js-yaml在preload环境中可用
  - 更新了Store中的loadConfig和saveConfig方法，使用新的fileService

- [x] **任务 2.1: Pinia Store 初始化与基础状态/Getter**
  - 完善了Store的状态管理、Getters和Actions
  - 实现了状态历史记录管理，支持撤销/重做功能
  - 添加了统一的addItem和updateItem方法
  - 实现了批量操作功能（批量添加、删除和更新）
  - 添加了导入/导出配置功能
  - 增强了搜索和过滤能力
  - 添加了更丰富的错误处理和恢复机制

- [x] **任务 2.2: UI 布局骨架搭建**
  - 已创建并美化了LeftPane, MiddlePane, RightPane组件
  - 实现了左侧菜单折叠功能
  - 实现了标签过滤功能
  - 添加了搜索功能
  - 优化了项目列表和详情页的显示

- [x] **任务 2.3: 规则和分组编辑表单组件**
  - 创建了RuleEditForm和GroupEditForm组件
  - 实现了表单验证和数据绑定
  - 添加了表单输入控件和样式
  - 添加了保存、取消、删除按钮
  - 实现了表单状态与属性同步
  - 支持了不同类型的输入字段

- [x] **任务 2.4: 加载/保存 Actions (连接 Preload)**
  - 已完善loadConfig和saveConfig Actions
  - 已实现与preload脚本的连接

- [x] **任务 3.1: ESPANSO 工具函数 (YAML 处理占位)**
  - 已实现parseYaml, serializeYaml等函数
  - 已实现convertToInternalFormat和convertToEspansoFormat函数

- [x] **任务 3.2: ESPANSO 工具函数 (增删改)**
  - 需要实现removeItemById等工具函数
  - 需要实现insertItemAtIndex等工具函数
  - 确保函数返回新的根节点对象以维持响应性

- [x] **任务 3.3: Pinia Store CRUD Actions 实现**
  - 需要完善addItem、updateItem、deleteItem等Actions
  - 需要确保Actions能正确调用工具函数
  - 需要更新Store状态并保持响应性

- [x] **任务 3.6: 右侧面板逻辑 (连接 Store 与表单)**
  - 需要在RightPane中连接Store和表单组件
  - 需要根据选中项类型渲染不同的表单
  - 需要处理表单操作并调用Store Actions

- [x] **任务 4.1: 拖拽排序功能 (UI & Action 调用)**
  - 需要集成vue-draggable-next
  - 需要实现拖拽事件处理
  - 需要实现moveItem Action并更新Store状态

- [x] **任务 4.2: 规则表单 - 高级字段 (纯 UI)**
  - 需要实现应用限制、标签等高级字段
  - 需要创建TagInput组件
  - 需要实现内容类型切换功能

- [x] **任务 4.3: 规则表单 - 高级内容编辑器 (UI 集成)**
  - 需要实现不同contentType的编辑器
  - 需要集成富文本、代码、图片等编辑组件
  - 需要实现内容与表单状态同步

- [x] **任务 4.4: 规则表单 - 插入变量与预览**
  - 需要完善generatePreview函数
  - 需要实现变量插入功能
  - 需要显示规则预览效果

- [x] **临时任务 1: UI美化与现代化**
  - 更新了全局样式，使用现代化的设计变量（颜色、间距、阴影等）
  - 改进了三栏式布局组件的样式，添加了卡片式设计
  - 美化了表单和按钮样式
  - 添加了现代化的UI元素（徽章、卡片、加载状态等）
  - 优化了空状态和错误状态的显示
  - 添加了过渡效果和交互反馈

- [x] **临时任务 2: 修复和改进**
  - 修复了类型定义文件名的拼写错误（espanzo-config.ts → espanso-config.ts）
  - 在Store中使用导入的uuidv4函数代替crypto.randomUUID()
  - 在preload脚本中添加降级方案，以便在非Electron环境中也能正常工作
  - 更新了todo.md，调整了任务状态

- [x] **临时任务 3: 解决Electron应用的标题和白屏问题**
  - 优化了main.js主进程代码，增加多重错误处理和日志输出
  - 修复了index.html加载路径问题，通过动态路径查找确保正确加载
  - 添加了资源路径修复功能，将绝对路径(/assets/)转换为相对路径(./assets/)
  - 增强了打包脚本，添加更详细的文件存在性检查和内容目录列表
  - 实现了友好的错误页面，在加载失败时提供明确的错误信息和可能的解决方案
  - 禁用了asar打包，避免了资源访问问题
  - 增加了备用路径加载机制，确保在不同环境下都能找到正确的入口文件

- [x] **临时任务 4: Web端配置文件夹选择功能**
  - 添加了环境检测功能，区分电子端、uTools端和Web端
  - 实现了Web端手动选择配置文件夹功能
  - 添加了配置文件夹本地存储功能，保存用户选择
  - 优化了加载状态和错误处理
  - 添加了用户友好的配置选择界面
  - 支持在Web环境下手动浏览和选择文件系统

- [x] **临时任务 5: 更新项目文档**
  - 更新了README.md文件，添加了详细的项目说明
  - 完善了安装和使用说明，确保所有命令正确无误
  - 添加了项目结构说明，便于新开发者理解
  - 添加了故障排除和常见问题解答部分
  - 补充了特性说明和各环境下的使用差异
  - 改进了文档格式和排版，提高可读性

- [x] **临时任务 8: 使用electron-vite代替现有的构建系统**
  - 更新了package.json中的脚本命令，替换vite为electron-vite
  - 创建了electron/main/index.js和electron/preload/index.js文件，适应electron-vite的目录结构
  - 优化了electron-builder.json配置文件，以适应新的构建系统
  - 简化了构建流程，统一使用electron-vite进行开发和构建
  - 保留了原有的IPC事件处理和预加载脚本功能
  - 改进了开发和生产环境的切换逻辑

- [x] **临时任务 9: 清理项目，移除非electron-vite相关的脚本和命令**
  - 删除了package.json中的所有非electron-vite相关命令
  - 移除了不再需要的依赖项（如concurrently、cross-env、electron-packager、fs-extra）
  - 删除了scripts目录及其所有脚本文件
  - 移除了uTools相关功能和文件
  - 删除了直接加载相关的HTML文件（direct-load.html）
  - 删除了不再需要的vite.config.ts文件，统一使用electron.vite.config.js
  - 删除了旧的electron/main.js和electron/preload.js文件
  - 清理了项目结构，使其更加简洁和专注

- [x] **任务 5.1: YAML 解析与序列化工具函数完善**
  - 已完善convertToInternalFormat和convertToEspansoFormat函数
  - 已实现对Espanso所有功能的支持

- [x] **任务 6.1: 导入/导出功能实现**
  - 已实现配置文件的导入和导出功能
  - 添加了importConfig和exportConfig方法
  - 实现了文件选择对话框集成
  - 添加了导入/导出过程中的错误处理
  - 支持多种文件格式（YAML）

- [x] **任务 7.1: 跨平台打包支持 (Electron)**
  - 创建了Electron主进程和预加载脚本
  - 实现了Electron打包和构建配置
  - 解决了打包时的路径问题和入口文件配置
  - 实现了基于fs模块的文件操作函数
  - 添加了开发环境和生产环境的切换逻辑
  - 解决了白屏问题和资源加载错误

- [x] **紧急任务 8.3: Electron端自动加载默认配置**
  - 实现了getDefaultEspansoConfigPath() Preload API，根据操作系统自动检测默认配置路径
  - 实现了scanDirectory() Preload API，扫描目录结构并返回层级化的文件树
  - 实现了loadElectronDefaultConfig函数，在Electron应用启动时自动加载Espanso配置
  - 添加了递归查找配置文件的功能，支持复杂的目录结构
  - 优化了应用启动流程，提升用户体验

- [x] **平台逻辑分离与重构 (原属紧急优先级)**
  - 重构`fileService.ts`移除混合环境判断逻辑
  - 设计并实现平台适配器工厂模式
  - 确保Web和Electron环境有独立的、完整的代码路径
  - 移除`detectEnvironment()`函数

- [x] **层级化数据结构实现 (原属紧急优先级)**
  - 设计`FileSystemNode`接口支持目录-文件-规则层级结构
  - 修改`EspansoConfig`使其适合表示层级数据
  - 更新序列化与反序列化逻辑

- [x] **Web端上传逻辑修复 (原属紧急优先级)**
  - 解决上传文件后无限加载的问题
  - 完善异步文件读取逻辑和错误处理
  - 优化上传界面，支持多文件和拖放

- [x] **UI层级适配 (原属紧急优先级)**
  - 设计递归组件用于渲染树状结构
  - 实现折叠/展开功能，文件夹/文件/规则视觉区分
  - 适配搜索和过滤功能，支持层级结构

- [x] **临时任务 10: 左侧栏UI优化 (原属高优先级)**
  - 将左侧栏改为固定宽度的垂直导航栏
  - 只保留"片段"和"设置"两个按钮
  - 实现图标在上、文字在下的布局
  - 调整背景色以符合Espanso的风格
  - 确保左侧栏不会覆盖中间栏内容

- [x] **临时任务 11: 树形视图优化 (原属高优先级)**
  - 移除所有节点的左侧边距，使内容紧贴容器两侧
  - 确保所有非叶子节点的样式处理完全一致，与节点类型无关
  - 移除分组级别的图标，只在片段节点前显示图标
  - 在片段节点右侧显示描述信息，超出部分省略，鼠标悬浮显示完整描述
  - 实现树形视图和列表视图的切换功能

- [x] **任务 4.5: 规则列表树状分组展示 (原属高优先级)**
  - 已实现分组的折叠/展开功能
  - 已使用树形结构显示规则，清晰展示父子关系
  - 已支持分组内规则的嵌套显示
  - 已添加视觉提示，识别规则和分组的层次关系
  - 已实现分组的计数统计（显示每个分组内的规则数量）

## 待完成功能

### 高优先级

- [ ] **临时任务 12: 树形视图进一步优化**
  - 优化树形视图的性能，处理大量节点时的渲染效率
  - 实现虚拟滚动，只渲染可见区域的节点
  - 添加展开/折叠所有节点的功能
  - 优化搜索功能，高亮匹配的节点并自动展开其父节点

- [ ] **临时任务 13: 配置文件处理优化**
  - 优化配置文件的读取和解析逻辑，提高性能
  - 实现配置文件的增量更新，避免全量重新加载
  - 添加配置文件的备份和恢复功能
  - 实现配置文件的版本控制，支持回滚到之前的版本

- [ ] **临时任务 7: 自动保存功能实现**
  - 移除手动保存和打开配置按钮
  - 实现配置文件的自动保存功能
    - 监听分组信息更新
    - 监听片段信息更新
    - 在数据变更时自动保存到本地文件
  - 优化首次使用体验
    - 如果没有配置文件，直接显示文件选择界面
    - 设计友好的文件选择提示界面
    - 保存用户选择的配置文件路径
  - 添加自动保存状态提示（如保存中、保存成功等）

- [ ] **任务 4.6: 标签管理功能实现**
  - 需要实现标签的添加、删除和过滤功能
  - 需要实现标签云组件
  - 需要支持通过标签筛选规则

- [ ] **任务 6.2: 应用限制功能实现**
  - 需要实现应用限制（apps）功能
  - 需要支持应用列表管理
  - 需要支持排除应用列表

- [ ] **任务 6.3: 错误处理与用户通知**
  - 需要完善错误处理和用户通知功能
  - 需要实现全局错误捕获
  - 需要提供友好的错误提示

- [ ] **任务 6.4: 最终测试与代码审查**
  - 需要进行全面测试和代码审查
  - 需要修复潜在问题和改进用户体验
  - 需要优化性能和稳定性

- [ ] **任务 7.2: uTools插件支持**
  - 创建了uTools插件配置文件
  - 实现了uTools预加载脚本
  - 添加了uTools插件打包脚本
  - 确保在uTools环境中正常加载应用

- [ ] **任务 7.3: 应用图标和品牌设计**
  - 需要设计应用图标和品牌元素
  - 需要为不同平台创建适配的图标尺寸
  - 需要更新打包配置以使用自定义图标

- [ ] **任务 7.4: 安装包和发布配置**
  - 需要配置electron-builder以创建安装包
  - 需要为各平台（Windows/macOS/Linux）优化打包设置
  - 需要创建自动发布流程

### Phase 7: 全局设置页面实现

- [ ] **任务 7.1: 路由设置与基础集成**
  - 安装 vue-router
  - 创建 `src/router/index.ts` 并定义路由 (`/`, `/settings`)
  - 在 `src/main.ts` 中集成路由
  - 修改 `src/App.vue` 使用 `<router-view>`

- [ ] **任务 7.2: 片段/分组视图迁移**
  - 创建 `src/views/MatchesView.vue`
  - 将三栏布局逻辑迁移到 `MatchesView.vue`
  - 在 `src/components/layout/MainLayout.vue` (或类似组件) 添加导航链接到 `/settings`

- [ ] **任务 7.3: 设置页面视图与布局创建**
  - 创建 `src/views/SettingsView.vue`
  - 在 `SettingsView.vue` 中实现三栏布局 (左侧导航, 右侧内容)
  - (可选) 创建 `src/components/settings/SettingsSidebar.vue`
  - (可选) 创建 `src/components/settings/SettingsForm.vue`

- [ ] **任务 7.4: 设置表单 UI 实现**
  - 在设置页面使用 `shadcn/vue` 组件构建全局设置表单 UI
  - 根据分类组织表单区域
  - 添加 Label 和 HelpTip

- [ ] **任务 7.5: Store 状态读取与表单绑定**
  - 在 `SettingsView.vue` 中获取 `store.state.globalConfig`
  - 将全局配置深拷贝到本地 `ref`
  - 使用 `v-model` 将表单控件绑定到本地 `ref`
  - 实现平台检测和平台特定设置的条件渲染

- [ ] **任务 7.6: Store 更新与保存 Actions 实现**
  - 在 `useEspansoStore` 添加 `updateGlobalConfig` Action
  - 在 `useEspansoStore` 添加 `saveGlobalConfig` Action
  - 导出 Actions

- [ ] **任务 7.7: 设置页面表单逻辑连接**
  - 实现"保存设置"按钮逻辑 (比较状态、调用 action、处理反馈)
  - 实现"恢复默认"按钮逻辑 (确认、重新加载状态)
