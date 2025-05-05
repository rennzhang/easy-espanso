/**
 * Espanso 数据处理工具 (Espanso Data Utils)
 *
 * 职责: 处理 Espanso 的 Match 和 Group 数据结构转换、清理和 ID 生成。
 */
import { v4 as uuidv4 } from 'uuid'; // 使用 UUID v4 生成更可靠的唯一 ID

// 核心内部类型
import type { Match, Group } from '@/types/core/espanso.types';
// Espanso YAML 格式的类型 (用于输入)
import type { EspansoMatchYaml, EspansoGroupYaml } from '@/types/core/espanso-format.types';

// --- ID 生成 ---

/**
 * 生成带有前缀的唯一 ID。
 * @param prefix 'match' 或 'group' 等前缀。
 * @returns 唯一的字符串 ID (e.g., 'match-xxxxxxxx')。
 */
export const generateId = (prefix: 'match' | 'group'): string => {
    // return `${prefix}-${Math.random().toString(36).substring(2, 11)}`; // 旧的简单实现
    return `${prefix}-${uuidv4().substring(0, 8)}`; // 使用 UUID v4 的一部分，更健壮
};


// --- 用于加载时处理 YAML 数据 ---

// 辅助类型，用于在加载过程中传递可变的 GUI 排序计数器
interface GuiOrderCounter {
    count: number;
}

/**
 * 重置 GUI 排序计数器 (虽然不再使用全局变量，但在加载开始时调用此函数以创建新的计数器可能有用)
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
    const newId = generateId('match');
    // console.log(`[processMatch] Processing raw match, assigning ID: ${newId}, guiOrder: ${counter.count}, path: ${filePath}`);

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
        propagate_case: rawMatch.propagate_case ?? undefined, // 保留 Espanso 默认行为 (undefined)
        word: rawMatch.word ?? undefined,
        force_mode: rawMatch.force_mode ?? undefined, // 保留 Espanso 默认行为

        // --- 可选/扩展字段 (从 YAML 读取) ---
        description: rawMatch.description, // 如果 YAML 里有
        left_word: rawMatch.left_word ?? undefined,
        right_word: rawMatch.right_word ?? undefined,
        uppercase_style: rawMatch.uppercase_style ?? undefined,
        apps: rawMatch.apps, // 直接使用，是数组或 undefined
        exclude_apps: rawMatch.exclude_apps,
        vars: rawMatch.vars, // 直接使用，是数组或 undefined
        search_terms: rawMatch.search_terms,
        priority: rawMatch.priority,
        hotkey: rawMatch.hotkey, // 新增字段
        image_path: rawMatch.image_path, // 新增字段
        markdown: rawMatch.markdown, // 新增字段
        html: rawMatch.html, // 新增字段

        // --- 内部 UI 字段 (加载时不设置，由 UI 或后续逻辑处理) ---
        // content: undefined, // 通常由 replace/markdown/html 推断
        // contentType: undefined,
        lineNumber: rawMatch.lineNumber // 如果 YAML 加载器能提供行号
    };

    // --- 处理 trigger vs triggers ---
    // 优先使用 triggers 数组
    if (Array.isArray(rawMatch.triggers) && rawMatch.triggers.length > 0) {
        processed.triggers = rawMatch.triggers.filter(t => typeof t === 'string' && t.trim() !== ''); // 清理空触发词
        if (processed.triggers.length === 0) {
             processed.trigger = ''; // 如果清理后为空，设置为空字符串 trigger
             delete processed.triggers;
        } else {
            delete processed.trigger; // 确保 trigger 为空
        }
    } else if (typeof rawMatch.trigger === 'string') {
        processed.trigger = rawMatch.trigger;
        delete processed.triggers; // 确保 triggers 为空
    } else {
        // 如果两者都无效，设置一个默认的空触发词
        processed.trigger = '';
        delete processed.triggers;
    }

    // --- 设置 content 和 contentType (基于优先级) ---
    if (processed.markdown !== undefined) {
        processed.content = processed.markdown;
        processed.contentType = 'markdown';
    } else if (processed.html !== undefined) {
        processed.content = processed.html;
        processed.contentType = 'html';
    } else if (processed.image_path !== undefined) {
        processed.content = processed.image_path;
        processed.contentType = 'image';
    } else if (processed.replace !== undefined) {
        processed.content = processed.replace;
        processed.contentType = 'plain'; // 默认纯文本
    }
     // 注意: 'form' 类型通常由 'form' 字段的存在来判断，这里不直接设置 content/contentType

    return processed;
};

/**
 * 递归处理从 YAML 解析出的原始 Group 数据，转换为内部 Group 类型。
 * @param rawGroup 从 YAML 解析出的原始分组对象。
 * @param filePath 该 Group 所属文件的路径。
 * @param counter 一个包含 'count' 属性的可变对象，用于分配 guiOrder。
 * @returns 处理后的内部 Group 对象 (包含递归处理过的子项)。
 */
export const processGroup = (
    rawGroup: EspansoGroupYaml,
    filePath: string,
    counter: GuiOrderCounter
): Group => {
    counter.count++; // 分组也占用一个顺序号
    const newId = generateId('group');
    // console.log(`[processGroup] Processing raw group: ${rawGroup.name || 'Unnamed'}, assigning ID: ${newId}, guiOrder: ${counter.count}, path: ${filePath}`);

    const processed: Group = {
        // --- 内部字段 ---
        id: newId,
        type: 'group',
        filePath: filePath,
        guiOrder: counter.count,
        updatedAt: new Date().toISOString(),

        // --- Espanso 核心字段 ---
        name: rawGroup.name || '未命名分组', // 提供默认名称
        label: rawGroup.label,
        prefix: rawGroup.prefix, // 新增字段

        // --- 嵌套内容 (递归处理) ---
        matches: [], // 先初始化为空数组
        groups: [],

        // --- 其他 Espanso 允许的字段 ---
        // 使用扩展运算符 (...) 来复制 rawGroup 中未显式处理的其他可能的键值对
        // 但要注意这可能引入非预期的属性，谨慎使用
        // ...rawGroup, // <-- 暂时注释掉，优先使用已知字段

         // 如果原始数据中有其他键，显式地复制它们 (更安全)
         ...(Object.fromEntries(
             Object.entries(rawGroup).filter(([key]) =>
                 !['name', 'label', 'prefix', 'matches', 'groups'].includes(key)
             )
         )),
    };

    // 递归处理子 Matches
    if (Array.isArray(rawGroup.matches)) {
        processed.matches = rawGroup.matches.map(match => processMatch(match, filePath, counter));
    }

    // 递归处理子 Groups
    if (Array.isArray(rawGroup.groups)) {
        processed.groups = rawGroup.groups.map(group => processGroup(group, filePath, counter));
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
    // 显式复制需要保存的字段
    const cleaned: EspansoMatchYaml = {
        // Trigger/Triggers (优先 triggers)
        ...(Array.isArray(match.triggers) && match.triggers.length > 0 ? { triggers: match.triggers } : { trigger: match.trigger ?? '' }),

        // Content (根据 contentType 写回对应字段)
        ...(match.contentType === 'plain' && match.replace !== undefined ? { replace: match.replace } : {}),
        ...(match.contentType === 'markdown' && match.markdown !== undefined ? { markdown: match.markdown } : {}),
        ...(match.contentType === 'html' && match.html !== undefined ? { html: match.html } : {}),
        ...(match.contentType === 'image' && match.image_path !== undefined ? { image_path: match.image_path } : {}),
        // 如果 contentType 未知或不匹配，但 replace 有值，则写入 replace (作为后备)
        ...(!['plain', 'markdown', 'html', 'image'].includes(match.contentType ?? '') && match.replace !== undefined ? { replace: match.replace } : {}),

        // 可选字段 (仅当它们有非默认值或非空时才包含)
        ...(match.label ? { label: match.label } : {}),
        ...(match.description ? { description: match.description } : {}),
        ...(match.word === true ? { word: true } : {}), // 只在为 true 时写入
        ...(match.left_word === true ? { left_word: true } : {}),
        ...(match.right_word === true ? { right_word: true } : {}),
        ...(match.propagate_case === true ? { propagate_case: true } : {}),
        ...(match.uppercase_style ? { uppercase_style: match.uppercase_style } : {}), // 如果存在则写入
        ...(match.force_mode && match.force_mode !== 'default' ? { force_mode: match.force_mode } : {}), // 仅写入非默认值
        ...(match.apps && match.apps.length > 0 ? { apps: match.apps } : {}), // 仅写入非空数组
        ...(match.exclude_apps && match.exclude_apps.length > 0 ? { exclude_apps: match.exclude_apps } : {}),
        ...(match.vars && match.vars.length > 0 ? { vars: match.vars } : {}),
        ...(match.search_terms && match.search_terms.length > 0 ? { search_terms: match.search_terms } : {}),
        ...(match.priority !== undefined && match.priority !== 0 ? { priority: match.priority } : {}), // 仅写入非零优先级
        ...(match.hotkey ? { hotkey: match.hotkey } : {}),
        // lineNumber 是内部字段，不保存
    };

     // 特殊处理：如果 replace, markdown, html, image_path 都没有定义，但 content 有值，则写入 replace
     if (cleaned.replace === undefined && cleaned.markdown === undefined && cleaned.html === undefined && cleaned.image_path === undefined && match.content !== undefined) {
         cleaned.replace = String(match.content); // 将 content 转为字符串写入 replace
     }

    return cleaned;
};

/**
 * 递归清理内部 Group 对象及其子项，移除内部字段，准备序列化为 YAML。
 * @param group 内部 Group 对象。
 * @returns 清理后的、适合写入 YAML 的对象。
 */
export const cleanGroupForSaving = (group: Group): EspansoGroupYaml => {
    const cleaned: EspansoGroupYaml = {
        // 核心字段
        name: group.name, // name 是必需的

        // 可选字段
        ...(group.label ? { label: group.label } : {}),
        ...(group.prefix ? { prefix: group.prefix } : {}),

        // 其他允许的 Espanso 字段 (从原始对象复制，排除已知和内部字段)
         ...(Object.fromEntries(
             Object.entries(group).filter(([key]) =>
                 !['id', 'type', 'filePath', 'guiOrder', 'updatedAt', 'name', 'label', 'prefix', 'matches', 'groups'].includes(key)
             )
         )),
    };

    // 递归清理子 Matches (仅当存在时)
    if (group.matches && group.matches.length > 0) {
        cleaned.matches = group.matches.map(cleanMatchForSaving);
    }

    // 递归清理子 Groups (仅当存在时)
    if (group.groups && group.groups.length > 0) {
        cleaned.groups = group.groups.map(cleanGroupForSaving);
    }

    return cleaned;
};