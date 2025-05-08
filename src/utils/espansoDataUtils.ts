/**
 * Espanso 数据处理工具 (Espanso Data Utils)
 *
 * 职责: 处理 Espanso 的 Match 和 Group 数据结构转换、清理和 ID 生成。
 */
import { v4 as uuidv4 } from 'uuid'; // 使用 UUID v4 生成更可靠的唯一 ID
import { encodeNodeId } from "@/utils/nodeIdUtils"; // 导入节点ID编码函数

// 核心内部类型
import type { Match } from '@/types/core/espanso.types';
// Espanso YAML 格式的类型 (用于输入)
import type { EspansoMatchYaml } from '@/types/core/espanso-format.types';

// 定义内部 Var 类型，因为它没有从 espanso.types.ts 导出
interface InternalVar {
    name: string;
    type: string; // type 字段在 espanso YAML 中是常见的，即使内部 Match['vars'] 元素类型最初没列出它
    params?: Record<string, any>;
}

// --- ID 生成 ---

/**
 * @deprecated 旧的基于 UUID 的 ID 生成器。请使用更具确定性的 ID 生成方法，如 generateMatchId。
 * 生成带有前缀的唯一 ID。
 * @param prefix 'match' 或 'group' 等前缀。
 * @returns 唯一的字符串 ID (e.g., 'match-xxxxxxxx')。
 */
export const generateRandomId = (prefix: 'match' | 'group'): string => {
    return `${prefix}-${uuidv4().substring(0, 8)}`; // 使用 UUID v4 的一部分，更健壮
};

/**
 * 清理字符串，使其适合作为 ID 的一部分。
 * 移除非字母数字字符，并用下划线替换，然后转为小写。
 * @param part 原始字符串部分。
 * @returns 清理后的字符串。
 */
const sanitizeForIdPart = (part: string | undefined | null): string => {
  if (part === null || part === undefined || part.trim() === '') {
    return '_empty_';
  }
  // 替换非字母数字字符为下划线
  let sanitized = part.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  // 替换多个连续下划线为一个
  sanitized = sanitized.replace(/_+/g, '_');
  // 移除可能存在的前导和尾随下划线 (除非整个字符串就是'_')
  if (sanitized.length > 1) {
    if (sanitized.startsWith('_')) {
      sanitized = sanitized.substring(1);
    }
    if (sanitized.endsWith('_')) {
      sanitized = sanitized.slice(0, -1);
    }
  }
  // 如果处理后为空字符串（例如，原始输入只包含特殊字符），返回一个占位符
  return sanitized || '_invalid_';
};

/**
 * 为 Match 对象生成一个确定性的 ID。
 * ID 结构: match-[sanitized_filePath_basename]-[sanitized_primary_trigger]-[guiOrder]
 * @param rawMatchInfo 从 YAML 解析出的原始对象或部分 Match 信息 (只需要 trigger/triggers/label)。
 * @param filePath 该 Match 所属文件的路径。
 * @param guiOrder 该 Match 在文件中的顺序。
 * @returns 确定性的字符串 ID。
 */
export const generateMatchId = (
    rawMatchInfo: Pick<EspansoMatchYaml, 'trigger' | 'triggers' | 'label'>,
    filePath: string,
    guiOrder: number
): string => {
    let primaryTriggerContent = '';
    if (rawMatchInfo.triggers && rawMatchInfo.triggers.length > 0 && rawMatchInfo.triggers[0]?.trim()) {
        primaryTriggerContent = rawMatchInfo.triggers[0];
    } else if (rawMatchInfo.trigger?.trim()) {
        primaryTriggerContent = rawMatchInfo.trigger;
    } else if (rawMatchInfo.label?.trim()) {
        primaryTriggerContent = `label_${rawMatchInfo.label}`;
    } else {
        primaryTriggerContent = 'notrigger';
    }

    // 从文件路径中提取基本名称 (文件名，不含扩展名)，避免过长的ID和潜在的特殊字符
    const filePathParts = filePath.split(/[\\/]/);
    const fileNameWithExt = filePathParts.pop() || '_unknownfile_';
    // 移除最后一个扩展名 (e.g. base.yml -> base, package.name.yml -> package.name)
    const fileName = fileNameWithExt.includes('.') ? fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.')) : fileNameWithExt;

    const sanitizedFilePath = sanitizeForIdPart(fileName);
    const sanitizedTrigger = sanitizeForIdPart(primaryTriggerContent);

    // 构造基础的确定性 ID 字符串
    const baseId = `match-${sanitizedFilePath}-${sanitizedTrigger}-${guiOrder}`;
    
    // 调用 encodeNodeId 对生成的基础 ID 进行编码
    const encodedId = encodeNodeId(baseId);
    
    return encodedId;
};


// --- 用于加载时处理 YAML 数据 ---

// 辅助类型，用于在加载过程中传递可变的 GUI 排序计数器
interface GuiOrderCounter {
    count: number;
}

/**
 * @deprecated 全局计数器已被移除，加载时应创建新的计数器对象。
 */
export const resetGuiOrderCounter = (): void => {
    console.warn("resetGuiOrderCounter is deprecated. Create a new counter object instead.");
};

/**
 * 处理从 YAML 解析出的原始 Match 数据，转换为内部 Match 类型。
 * @param rawMatch 从 YAML 解析出的原始对象。
 * @param filePath 该 Match 所属文件的路径。
 * @param counter 一个包含 'count' 属性的可变对象，用于分配 guiOrder。
 * @returns 处理后的内部 Match 对象。
 */
export const processMatch = (
    rawMatch: EspansoMatchYaml,
    filePath: string,
    counter: GuiOrderCounter
): Match => {
    counter.count++; // 增加计数器
    const newId = generateMatchId(rawMatch, filePath, counter.count); // 使用新的确定性ID

    // 从 YAML 的 vars (Record<string, any>[]) 转换为内部的 vars (InternalVar[])
    const internalVars: InternalVar[] | undefined = rawMatch.vars?.map(v => ({
        name: String(v.name || ''), // 确保 name 是字符串
        type: String(v.type || ''), // 确保 type 是字符串
        params: v.params as Record<string, any> | undefined
    })).filter(v => v.name.trim() !== '' && v.type.trim() !== ''); // 过滤掉无效的 var

    const processed: Match = {
        // --- 内部字段 ---
        id: newId,
        type: 'match',
        filePath: filePath,
        guiOrder: counter.count,
        updatedAt: new Date().toISOString(), // 设置初始时间戳

        // --- Espanso 核心字段 ---
        trigger: undefined, // 先置空，下面处理 trigger/triggers
        triggers: undefined,
        replace: rawMatch.replace,
        label: rawMatch.label,
        description: rawMatch.description,
        propagate_case: rawMatch.propagate_case ?? undefined,
        word: rawMatch.word ?? undefined,
        left_word: rawMatch.left_word ?? undefined,
        right_word: rawMatch.right_word ?? undefined,
        case_sensitive: rawMatch.case_sensitive ?? undefined,
        priority: rawMatch.priority,
        forceMode: 'default', // Default value, will be updated below
        apps: rawMatch.apps,
        exclude_apps: rawMatch.exclude_apps,
        vars: internalVars, // 使用转换后的 internalVars
        search_terms: rawMatch.search_terms,
        hotkey: rawMatch.hotkey,
        image_path: rawMatch.image_path,
        markdown: rawMatch.markdown,
        html: rawMatch.html,
        form: rawMatch.form, // 新增 form 字段

        // --- 内部 UI 字段 ---
        lineNumber: rawMatch.lineNumber,
        uppercase_style: undefined, // Will be set below if valid
    };

    // --- 处理 trigger vs triggers ---
    if (Array.isArray(rawMatch.triggers) && rawMatch.triggers.length > 0) {
        processed.triggers = rawMatch.triggers.filter(t => typeof t === 'string' && t.trim() !== '');
        if (processed.triggers.length === 0) {
             processed.trigger = '';
             delete processed.triggers;
        } else {
            delete processed.trigger;
        }
    } else if (typeof rawMatch.trigger === 'string') {
        processed.trigger = rawMatch.trigger;
        delete processed.triggers;
    } else {
        processed.trigger = '';
        delete processed.triggers;
    }

    // --- 设置 content 和 contentType (基于优先级) ---
    if (rawMatch.form) { // 优先处理 form 类型
        processed.content = typeof rawMatch.form === 'string' ? rawMatch.form : 'complex_form_definition';
        processed.contentType = 'form';
    } else if (processed.markdown !== undefined) {
        processed.content = processed.markdown;
        processed.contentType = 'markdown';
    } else if (processed.html !== undefined) {
        processed.content = processed.html;
        processed.contentType = 'html';
    } else if (processed.image_path !== undefined) {
        processed.content = processed.image_path;
        processed.contentType = 'image';
    } else {
        processed.content = ''; // 如果都没有，默认为空字符串
        processed.contentType = 'plain';
    }

    // Process uppercase_style (from string to specific union type)
    const rawUcStyle = rawMatch.uppercase_style;
    if (rawUcStyle === "" || rawUcStyle === "uppercase" || rawUcStyle === "capitalize" || rawUcStyle === "capitalize_words") {
        processed.uppercase_style = rawUcStyle;
    }

    // Process force_mode (from string to specific union type `forceMode`)
    // Espanso YAML uses `force_mode: clipboard` or `force_mode: keys`.
    // `force_clipboard: true` is an alternative for `force_mode: clipboard`.
    if (rawMatch.force_clipboard === true) {
        processed.forceMode = 'clipboard';
    } else if (rawMatch.force_mode === "clipboard" || rawMatch.force_mode === "keys") {
        processed.forceMode = rawMatch.force_mode;
    } else {
        processed.forceMode = 'default'; // Espanso's default
    }

    return processed;
};


// --- 用于保存时清理数据 ---

/**
 * 清理内部 Match 对象，移除内部字段和不必要的默认值，准备序列化为 YAML。
 * @param match 内部 Match 对象。
 * @returns 清理后的、适合写入 YAML 的对象。
 */
export const cleanMatchForSaving = (match: Match): EspansoMatchYaml => {

    const cleaned: EspansoMatchYaml = {};

    // Trigger/Triggers (优先 triggers)
    if (Array.isArray(match.triggers) && match.triggers.length > 0) {
        cleaned.triggers = match.triggers;
    } else {
        cleaned.trigger = match.trigger ?? '';
    }

    // Content (根据 contentType 写回对应字段)
    // 确保只有当 content 确实是用于该类型时才写回，或者当 replace 作为通用 fallback 时
    switch (match.contentType) {
        case 'form':
            // form 字段由 Match 对象中的 form 属性决定
            if (match.form) cleaned.form = match.form;
            // 避免将 content (可能是 'complex_form_definition' 或 YAML 字符串) 错误地写入 replace
            break;
        case 'markdown':
            cleaned.markdown = match.content ?? match.markdown ?? ''; // Prefer content if available
            break;
        case 'html':
            cleaned.html = match.content ?? match.html ?? ''; // Prefer content if available
            break;
        case 'image':
            cleaned.image_path = match.content ?? match.image_path ?? ''; // Prefer content if available
            break;
        case 'plain': // Explicitly handle plain
        default:      // Handles undefined contentType (like new snippets)
            // 对于 'plain' 或未指定类型，优先使用 match.replace，然后是 match.content
            cleaned.replace = match.replace ?? ''; // Use match.replace! Provide fallback ''
            break;
    }
    // Clean up other specific content fields if contentType doesn't match them
    if (match.contentType !== 'markdown') delete cleaned.markdown; // if we wrote via match.content to replace, etc.
    if (match.contentType !== 'html') delete cleaned.html;
    if (match.contentType !== 'image') delete cleaned.image_path;
    if (match.contentType && match.contentType !== 'plain') { 
        delete cleaned.replace;
    }
    if (match.contentType !== 'form' && match.form) delete cleaned.form; // if somehow form exists but type is not form


    // 可选字段 (仅当它们有非默认值或非空时才包含)
    if (match.label) cleaned.label = match.label;
    if (match.description) cleaned.description = match.description;
    
    // 布尔值: 只有当它们为 true 时才写入，以保持 YAML 简洁 (espanso 默认 false)
    if (match.word) cleaned.word = true;
    if (match.left_word) cleaned.left_word = true;
    if (match.right_word) cleaned.right_word = true;
    if (match.propagate_case) cleaned.propagate_case = true;
    if (match.case_sensitive) cleaned.case_sensitive = true;
    
    // 具有特定枚举值的字段
    if (match.uppercase_style === "uppercase" || 
        match.uppercase_style === "capitalize" || 
        match.uppercase_style === "capitalize_words" ||
        match.uppercase_style === "" ) { // Explicitly include empty string if it's a valid enum value to save
        cleaned.uppercase_style = match.uppercase_style;
    } // 如果是 'default' 或 undefined，则不写入，让 espanso 使用默认行为

    // Map internal forceMode back to Espanso YAML (force_mode or force_clipboard)
    if (match.forceMode === 'clipboard') {
        cleaned.force_mode = 'clipboard'; // Or cleaned.force_clipboard = true; Espanso supports both.
                                        // Let's be consistent with force_mode for clarity.
        delete cleaned.force_clipboard; // Ensure only one is set
    } else if (match.forceMode === 'keys') {
        cleaned.force_mode = 'keys';
        delete cleaned.force_clipboard;
    } // if 'default' or undefined, neither is written, which is Espanso's default.
    
    // 数组字段 (仅当有元素时写入)
    if (match.apps && match.apps.length > 0) cleaned.apps = match.apps;
    if (match.exclude_apps && match.exclude_apps.length > 0) cleaned.exclude_apps = match.exclude_apps;
    if (match.vars && match.vars.length > 0) {
        // InternalVar structure is { name, type, params }. YAML expects Record<string, any>[], typically {name, type, params} or {name, params_for_typeX}
        // For now, assume direct mapping is fine if InternalVar matches the common Espanso var structure.
        cleaned.vars = match.vars.map(v => ({ ...v })); // Shallow copy to be safe
    }
    if (match.search_terms && match.search_terms.length > 0) cleaned.search_terms = match.search_terms;
    
    // 数字字段 (仅当非默认值时写入)
    if (match.priority !== undefined && match.priority !== 0) cleaned.priority = match.priority;
    
    // 字符串字段 (仅当非空时写入)
    if (match.hotkey) cleaned.hotkey = match.hotkey;

    return cleaned;
};

