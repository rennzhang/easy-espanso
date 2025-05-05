/**
 * YAML 服务 (Yaml Service)
 *
 * 职责: 提供 YAML 字符串与 JavaScript 对象之间相互转换的功能。
 * 实现: 将调用委托给 PlatformAdapterFactory 获取的当前平台适配器。
 */
import { PlatformAdapterFactory } from './platform/PlatformAdapterFactory';
import type { IPlatformAdapter } from './platform/IPlatformAdapter';
import type { YamlData } from '@/types/core/preload.types'; // 假设类型已移动

/**
 * 解析 YAML 字符串。
 * @param yamlString 包含 YAML 格式内容的字符串。
 * @returns 解析后的 JavaScript 对象/数据结构 (YamlData)。
 * @throws 如果解析失败，则可能抛出错误 (取决于适配器的实现)。
 */
export async function parseYaml(yamlString: string): Promise<YamlData> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    console.log("[YamlService] 调用适配器 parseYaml"); // 调试日志
    try {
        const result = await adapter.parseYaml(yamlString);
        // 可以在这里添加对结果的验证或处理（如果需要）
        return result;
    } catch (error) {
        console.error("[YamlService] 解析 YAML 失败:", error);
        // 可以选择向上抛出错误，或返回一个默认/空对象
        throw error; // 让调用者 (espansoService) 处理错误
        // return {}; // 或者返回空对象
    }
}

/**
 * 将 JavaScript 对象/数据结构序列化为 YAML 格式的字符串。
 * @param data 要序列化的 JavaScript 对象/数据结构 (符合 YamlData 结构)。
 * @returns YAML 格式的字符串。
 * @throws 如果序列化失败，则可能抛出错误 (取决于适配器的实现)。
 */
export async function serializeYaml(data: YamlData): Promise<string> {
    const adapter: IPlatformAdapter = PlatformAdapterFactory.getInstance();
    console.log("[YamlService] 调用适配器 serializeYaml"); // 调试日志

    try {
        // 预处理数据，移除循环引用和不可序列化的属性
        const cleanData = removeCircularReferences(data);
        
        // 使用适配器序列化清理后的数据
        const result = await adapter.serializeYaml(cleanData);
        return result;
    } catch (error) {
        console.error("[YamlService] 序列化 YAML 失败:", error);
        throw error; // 让调用者 (espansoService) 处理错误
    }
}

/**
 * 移除对象中的循环引用和不可序列化的属性
 * @param obj 要处理的对象
 * @returns 处理后的新对象，不含循环引用
 */
function removeCircularReferences(obj: any): any {
    // 使用Map跟踪对象路径，帮助调试
    const seen = new WeakMap();
    const paths: string[] = [];
    let currentPath = '';
    
    function deepClean(value: any, path: string): any {
        // 处理基本类型
        if (value === null || value === undefined) return value;
        if (typeof value !== 'object') return value;
        
        // 更新当前路径
        const fullPath = path ? path : 'root';
        
        // 处理数组
        if (Array.isArray(value)) {
            // 检查循环引用
            if (seen.has(value)) {
                const prevPath = seen.get(value);
                console.warn(`[YamlService] 检测到数组循环引用: ${fullPath} -> ${prevPath}`);
                return []; // 返回空数组
            }
            
            // 记录当前对象路径
            seen.set(value, fullPath);
            
            // 递归处理数组元素
            return value.map((item, idx) => 
                deepClean(item, `${fullPath}[${idx}]`)
            ).filter(item => item !== undefined); // 过滤掉undefined
        }
        
        // 处理对象
        if (seen.has(value)) {
            const prevPath = seen.get(value);
            console.warn(`[YamlService] 检测到对象循环引用: ${fullPath} -> ${prevPath}`);
            return {}; // 返回空对象
        }
        
        // 记录当前对象路径
        seen.set(value, fullPath);
        
        // 创建新对象，递归处理属性
        const cleanObj: any = {};
        
        try {
            // 使用 Object.keys 避免原型链上的属性
            Object.keys(value).forEach(key => {
                // 跳过特殊属性
                if (
                    key.startsWith('_') || // 内部属性
                    typeof value[key] === 'function' || // 函数
                    typeof value[key] === 'symbol' || // Symbol
                    value[key] === value // 自引用
                ) {
                    return; // 跳过此属性
                }
                
                try {
                    // 处理属性值，创建新的路径
                    const propPath = `${fullPath}.${key}`;
                    const cleanValue = deepClean(value[key], propPath);
                    
                    // 只保留有效值
                    if (cleanValue !== undefined) {
                        cleanObj[key] = cleanValue;
                    }
                } catch (err) {
                    console.warn(`[YamlService] 处理属性 "${fullPath}.${key}" 时出错:`, err);
                    // 跳过有问题的属性
                }
            });
        } catch (err) {
            console.warn(`[YamlService] 处理对象 ${fullPath} 时出错:`, err);
            // 返回已处理的属性
        }
        
        return cleanObj;
    }
    
    return deepClean(obj, '');
}