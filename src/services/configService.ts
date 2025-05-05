/**
 * 配置服务 (Config Service)
 *
 * 职责: 管理 Espanso 配置的路径信息，包括获取默认路径和持久化用户选择的路径。
 * 实现: 使用 platformService 获取平台信息和拼接路径，使用 localStorage 进行持久化。
 */
import * as platformService from './platformService';

// 用于在 localStorage 中存储用户选择路径的键名
const LOCAL_STORAGE_KEY = 'espansoSelectedConfigDir';

/**
 * 获取当前操作系统下 Espanso 的默认配置目录路径。
 * 注意：这依赖于标准的安装路径，可能不适用于所有情况 (例如自定义安装)。
 * @returns 返回默认配置路径的 Promise，如果无法确定则返回 null。
 */
export async function getDefaultConfigPath(): Promise<string | undefined> {
    console.log("[ConfigService] 获取默认配置路径...");
    try {
        const platform = await platformService.getPlatform();
        console.log(`[ConfigService] 当前平台: ${platform}`);
        const joinPath = platformService.joinPath; // 使用平台服务提供的路径连接

        // 使用 platformService 获取环境变量
        console.log(`[ConfigService] 正在获取环境变量...`);
        const homeDirPromise = platformService.getEnvironmentVariable('HOME');
        const appDataDirPromise = platformService.getEnvironmentVariable('APPDATA');
        const xdgConfigHomePromise = platformService.getEnvironmentVariable('XDG_CONFIG_HOME');

        // 等待环境变量获取完成
        const [homeDir, appDataDir, xdgConfigHome] = await Promise.all([
            homeDirPromise,
            appDataDirPromise,
            xdgConfigHomePromise
        ]);

        console.log(`[ConfigService] 环境变量: HOME=${homeDir || '未定义'}, APPDATA=${appDataDir || '未定义'}, XDG_CONFIG_HOME=${xdgConfigHome || '未定义'}`);

        let configPath: string | undefined;

        switch (platform) {
            case 'win32':
                console.log("[ConfigService] 检测到 Windows 平台");
                if (appDataDir) {
                    configPath = await joinPath(appDataDir, 'espanso');
                    console.log(`[ConfigService] Windows路径: ${appDataDir} + 'espanso' = ${configPath}`);
                } else {
                    console.warn("[ConfigService] 无法获取 %APPDATA% 环境变量。");
                    return undefined;
                }
                break;

            case 'darwin':
                console.log("[ConfigService] 检测到 macOS 平台");
                // $HOME/Library/Application Support/espanso
                if (homeDir) {
                    configPath = await joinPath(homeDir, 'Library/Application Support/espanso');
                    console.log(`[ConfigService] macOS路径: ${homeDir} + 'Library/Application Support/espanso' = ${configPath}`);
                } else {
                    console.warn("[ConfigService] 无法获取 $HOME 环境变量，使用默认路径。");
                    configPath = await joinPath('/Users/unknown', 'Library/Application Support/espanso');
                    console.log(`[ConfigService] macOS默认路径: '/Users/unknown/Library/Application Support/espanso' = ${configPath}`);
                }
                break;

            case 'linux':
                console.log("[ConfigService] 检测到 Linux 平台");
                // 优先使用 $XDG_CONFIG_HOME/espanso
                if (xdgConfigHome) {
                    configPath = await joinPath(xdgConfigHome, 'espanso');
                    console.log(`[ConfigService] Linux XDG路径: ${xdgConfigHome} + 'espanso' = ${configPath}`);
                }
                // 否则使用 $HOME/.config/espanso
                else if (homeDir) {
                    configPath = await joinPath(homeDir, '.config/espanso');
                    console.log(`[ConfigService] Linux HOME路径: ${homeDir} + '.config/espanso' = ${configPath}`);
                } else {
                    console.warn("[ConfigService] 无法获取 $HOME 或 $XDG_CONFIG_HOME 环境变量，使用默认路径。");
                    configPath = await joinPath('/home/unknown', '.config/espanso');
                    console.log(`[ConfigService] Linux默认路径: '/home/unknown/.config/espanso' = ${configPath}`);
                }
                break;

            case 'web':
                console.log("[ConfigService] Web 平台没有默认本地配置路径");
                return undefined; // Web 环境没有本地默认路径

            default:
                console.log(`[ConfigService] 未知的平台: ${platform}`);
                return undefined;
        }

        console.log(`[ConfigService] 最终计算得到的默认配置路径: ${configPath}`);

        // 验证路径是否存在
        if (configPath) {
            console.log(`[ConfigService] 验证配置路径是否存在: ${configPath}`);
            try {
                const exists = await platformService.directoryExists(configPath);
                console.log(`[ConfigService] 路径存在性检查结果: ${exists ? '存在' : '不存在'}`);
                
                // 返回路径，即使不存在也返回，让调用者可以创建
            } catch (err) {
                console.warn(`[ConfigService] 验证配置路径存在性失败:`, err);
                // 继续返回路径
            }
        }

        return configPath;
    } catch (error) {
        console.error("[ConfigService] 获取默认配置路径失败:", error);
        return undefined;
    }
}

/**
 * 保存用户选择的 Espanso 配置目录路径到 localStorage。
 * @param path 用户选择的目录路径。
 */
export function saveSelectedConfigPath(path: string): void {
    if (!path) {
        console.warn("[ConfigService] 尝试保存空的配置路径，已忽略。");
        return;
    }
    // 标准化路径表示 (可选，但推荐)
    const normalizedPath = path.replace(/\\/g, '/');
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, normalizedPath);
        console.log(`[ConfigService] 已保存选择的配置路径: ${normalizedPath}`);
    } catch (error) {
        console.error("[ConfigService] 保存配置路径到 localStorage 失败:", error);
        // 可以在此显示错误给用户
    }
}

/**
 * 从 localStorage 加载用户之前选择的配置目录路径。
 * @returns 返回之前保存的路径 Promise，如果未保存则返回 null。
 */
export async function getSelectedConfigPath(): Promise<string | undefined> {
    try {
        const savedPath = localStorage.getItem(LOCAL_STORAGE_KEY);
        console.log(`[ConfigService] 从 localStorage 加载路径: ${savedPath ?? '未找到'}`);
        
        // 验证路径存在性
        if (savedPath) {
            console.log(`[ConfigService] 正在验证保存的路径是否存在: ${savedPath}`);
            try {
                const exists = await platformService.directoryExists(savedPath);
                console.log(`[ConfigService] 路径验证结果: ${exists ? '存在' : '不存在'}`);
                if (!exists) {
                    console.warn(`[ConfigService] 保存的路径 ${savedPath} 不存在或无法访问`);
                    return undefined;
                }
            } catch (error) {
                console.error(`[ConfigService] 验证路径存在性时出错:`, error);
                // 继续返回路径，让调用者处理验证问题
            }
        }
        
        return savedPath ?? undefined;
    } catch (error) {
        console.error("[ConfigService] 从 localStorage 加载配置路径失败:", error);
        return undefined;
    }
}

/**
 * 清除已保存的用户选择配置路径。
 */
export function clearSelectedConfigPath(): void {
     try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        console.log(`[ConfigService] 已清除保存的配置路径。`);
    } catch (error) {
        console.error("[ConfigService] 清除配置路径失败:", error);
    }
}