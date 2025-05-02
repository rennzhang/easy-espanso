import { contextBridge, ipcRenderer } from 'electron';
import yaml from 'js-yaml'; // 确保 js-yaml 已安装

// 确保在最开始打印这条信息，以验证预加载脚本是否被执行
console.log('[Preload] Script started execution...');

let fsModule, pathModule, osModule, yamlModule;
try {
  fsModule = require('fs');
  pathModule = require('path');
  osModule = require('os');
  yamlModule = require('js-yaml');
  console.log('[Preload] Node modules (fs, path, os, js-yaml) loaded successfully.');
} catch (error) {
  console.error('[Preload] Failed to load Node modules:', error);
  // 如果模块加载失败，后续依赖这些模块的函数会出错
}

const homeDir = osModule ? osModule.homedir() : '/'; // Provide fallback

// 获取Espanso配置目录
function getEspansoConfigDir() {
  // 根据操作系统确定Espanso配置目录
  let configDir;

  try {
    switch (process.platform) {
      case 'win32':
        configDir = pathModule.join(process.env.APPDATA || '', 'espanso');
        break;
      case 'darwin':
        configDir = pathModule.join(homeDir, 'Library', 'Application Support', 'espanso');
        break;
      default: // Linux和其他Unix系统
        configDir = pathModule.join(homeDir, '.config', 'espanso');
        break;
    }
  } catch (error) {
    console.error('获取Espanso配置目录失败:', error);
    configDir = '';
  }

  return configDir;
}

// 读取文件内容
async function readFile(filePath) {
  console.log(`[Preload] readFile called with path: ${filePath}`);
  if (!fsModule) {
    console.error('[Preload] readFile: fs module not loaded.');
    throw new Error('fs module not available in preload');
  }
  try {
    const data = await fsModule.promises.readFile(filePath, 'utf8');
    console.log(`[Preload] readFile successful for: ${filePath}`);
    return data;
  } catch (error) {
    console.error(`[Preload] readFile error for ${filePath}:`, error);
    throw error; // Re-throw the error to be caught by the caller
  }
}

// 写入文件内容
async function writeFile(filePath, content) {
  console.log(`[Preload] writeFile called for path: ${filePath}`);
  if (!fsModule || !pathModule) {
    console.error('[Preload] writeFile: fs or path module not loaded.');
    throw new Error('fs or path module not available in preload');
  }
  try {
    // 确保目录存在
    await fsModule.promises.mkdir(pathModule.dirname(filePath), { recursive: true });
    await fsModule.promises.writeFile(filePath, content, 'utf8');
    console.log(`[Preload] writeFile successful for: ${filePath}`);
  } catch (error) {
    console.error(`[Preload] writeFile error for ${filePath}:`, error);
    throw error;
  }
}

// 重命名文件
async function renameFile(oldPath, newPath) {
  console.log(`[Preload] renameFile called: ${oldPath} -> ${newPath}`);
  if (!fsModule || !pathModule) {
    console.error('[Preload] renameFile: fs or path module not loaded.');
    throw new Error('fs or path module not available in preload');
  }
  try {
    // 确保目标目录存在
    await fsModule.promises.mkdir(pathModule.dirname(newPath), { recursive: true });
    await fsModule.promises.rename(oldPath, newPath);
    console.log(`[Preload] renameFile successful: ${oldPath} -> ${newPath}`);
  } catch (error) {
    console.error(`[Preload] renameFile error: ${oldPath} -> ${newPath}`, error);
    throw error;
  }
}

// 删除文件
async function deleteFile(filePath) {
  console.log(`[Preload] deleteFile called for path: ${filePath}`);
  if (!fsModule) {
    console.error('[Preload] deleteFile: fs module not loaded.');
    throw new Error('fs module not available in preload');
  }
  try {
    await fsModule.promises.unlink(filePath);
    console.log(`[Preload] deleteFile successful for: ${filePath}`);
  } catch (error) {
    console.error(`[Preload] deleteFile error for ${filePath}:`, error);
    throw error;
  }
}

// 显示打开文件对话框
async function showOpenFileDialog(options) {
  console.log('[Preload] showOpenDialog called with options:', options);
  try {
    const result = await ipcRenderer.invoke('show-open-dialog', {
      ...options,
      properties: ['openFile']
    });

    console.log('[Preload] showOpenDialog result:', result);
    if (result.canceled) {
      return undefined;
    }

    return result.filePaths;
  } catch (error) {
    console.error('[Preload] showOpenDialog error:', error);
    return undefined;
  }
}

// 显示打开目录对话框
async function showOpenDirectoryDialog(options) {
  console.log('[Preload] showOpenDirectoryDialog called with options:', options);
  try {
    const result = await ipcRenderer.invoke('show-open-dialog', {
      ...options,
      properties: ['openDirectory']
    });

    console.log('[Preload] showOpenDirectoryDialog result:', result);
    if (result.canceled) {
      return undefined;
    }

    return result.filePaths;
  } catch (error) {
    console.error('打开目录对话框失败:', error);
    return undefined;
  }
}

// 显示保存文件对话框
async function showSaveDialog(options) {
  console.log('[Preload] showSaveDialog called with options:', options);
  try {
    const result = await ipcRenderer.invoke('show-save-dialog', options);
    console.log('[Preload] showSaveDialog result:', result);
    return result;
  } catch (error) {
    console.error('[Preload] showSaveDialog error:', error);
    throw error;
  }
}

// 列出目录中的文件
async function listFiles(dirPath) {
  console.log(`[Preload] listFiles called for dir: ${dirPath}`);
  if (!fsModule || !pathModule) {
    console.error('[Preload] listFiles: fs or path module not loaded.');
    throw new Error('fs or path module not available in preload');
  }
  try {
    const files = await fsModule.promises.readdir(dirPath, { withFileTypes: true });
    console.log(`[Preload] listFiles: Found ${files.length} entries in ${dirPath}`);
    return files.map(file => ({
      name: file.name,
      path: pathModule.join(dirPath, file.name),
      isDirectory: file.isDirectory(),
      isFile: file.isFile(),
      extension: file.isFile() ? pathModule.extname(file.name) : undefined
    }));
  } catch (error) {
    console.error(`[Preload] listFiles error for ${dirPath}:`, error);
    // Decide on fallback behavior: return empty array or throw error
    return [];
    // throw error;
  }
}

// 检查文件是否存在
async function fileExists(filePath) {
  console.log(`[Preload] fileExists called for path: ${filePath}`);
  if (!fsModule) {
    console.error('[Preload] fileExists: fs module not loaded.');
    // Decide on fallback behavior: maybe return false or throw error
    return false;
    // throw new Error('fs module not available in preload');
  }
  try {
    await fsModule.promises.access(filePath);
    console.log(`[Preload] fileExists: ${filePath} exists.`);
    return true;
  } catch {
    console.log(`[Preload] fileExists: ${filePath} does not exist.`);
    return false;
  }
}

// 解析YAML文件
function parseYaml(content) {
  console.log('[Preload] parseYaml called');
  if (!yamlModule) {
    console.error('[Preload] parseYaml: yaml module not loaded.');
    throw new Error('yaml module not available in preload');
  }
  try {
    const data = yamlModule.load(content);
    console.log('[Preload] parseYaml successful.');
    return data;
  } catch (error) {
    console.error('[Preload] parseYaml error:', error);
    throw error;
  }
}

// 序列化为YAML
function serializeYaml(data) {
  console.log('[Preload] serializeYaml called');
  if (!yamlModule) {
    console.error('[Preload] serializeYaml: yaml module not loaded.');
    throw new Error('yaml module not available in preload');
  }
  try {
    const yamlString = yamlModule.dump(data, {
      indent: 2,
      lineWidth: -1, // 禁用行宽限制
      noRefs: true // 避免YAML别名/锚点
    });
    console.log('[Preload] serializeYaml successful.');
    return yamlString;
  } catch (error) {
    console.error('[Preload] serializeYaml error:', error);
    throw error;
  }
}

// 获取Espanso配置文件
async function getEspansoConfigFiles() {
  try {
    const configDir = getEspansoConfigDir();
    if (!configDir) {
      return {
        status: 'error',
        message: '无法确定Espanso配置目录'
      };
    }

    // 检查配置目录是否存在
    const configDirExists = await fileExists(configDir);
    if (!configDirExists) {
      return {
        status: 'not_found',
        message: 'Espanso配置目录不存在',
        configDir
      };
    }

    // 获取配置文件
    const configPath = pathModule.join(configDir, 'config');
    const configFileExists = await fileExists(configPath);

    // 获取匹配文件
    const matchDirPath = pathModule.join(configDir, 'match');
    const matchDirExists = await fileExists(matchDirPath);

    let matchFiles = [];
    if (matchDirExists) {
      const files = await listFiles(matchDirPath);
      matchFiles = files.filter(file =>
        file.extension === '.yml' || file.extension === '.yaml'
      );
    }

    return {
      status: 'success',
      configDir,
      configExists: configFileExists,
      configPath: configFileExists ? configPath : null,
      matchDirExists,
      matchDirPath: matchDirExists ? matchDirPath : null,
      matchFiles
    };
  } catch (error) {
    console.error('获取Espanso配置文件失败', error);
    return {
      status: 'error',
      message: `获取配置文件时出错: ${error.message}`
    };
  }
}

// 显示通知
function showNotification(message) {
  ipcRenderer.send('show-notification', {
    title: 'Espanso GUI',
    body: message
  });
}

// 获取Espanso默认配置路径
const getDefaultEspansoConfigPath = () => {
  console.log('[Preload] getDefaultEspansoConfigPath called');
  if (!pathModule || !osModule) {
    console.error('[Preload] getDefaultEspansoConfigPath: path or os module not loaded.');
    throw new Error('path or os module not available in preload');
  }
  const platform = process.platform;
  let configPath = '';
  const appData = process.env.APPDATA || ''; // Handle case where APPDATA might be undefined
  const home = homeDir; // Use the previously determined homeDir

  try {
    switch (platform) {
      case 'win32':
        configPath = pathModule.join(appData, 'espanso');
        break;
      case 'darwin':
        configPath = pathModule.join(home, 'Library', 'Application Support', 'espanso');
        break;
      case 'linux':
      default:
        configPath = pathModule.join(home, '.config', 'espanso');
        break;
    }
    console.log(`[Preload] Determined default config path for ${platform}: ${configPath}`);
    return configPath;
  } catch (error) {
    console.error('[Preload] Error determining default config path:', error);
    throw error;
  }
};

// 递归扫描目录，返回文件树结构
const scanDirectory = async (dirPath) => {
  try {
    const entries = await fsModule.promises.readdir(dirPath, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
      const fullPath = pathModule.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const children = await scanDirectory(fullPath);
        result.push({
          type: 'directory',
          name: entry.name,
          path: fullPath,
          children
        });
      } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
        result.push({
          type: 'file',
          name: entry.name,
          path: fullPath
        });
      }
    }

    return result;
  } catch (error) {
    console.error(`扫描目录失败: ${dirPath}`, error);
    return [];
  }
};

// 导出API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  readFile,
  writeFile,
  renameFile,
  deleteFile,
  fileExists,
  listFiles,
  showOpenFileDialog,
  showOpenDirectoryDialog,
  showSaveDialog,

  // Espanso配置
  getEspansoConfigDir,
  getEspansoConfigFiles,

  // YAML处理
  parseYaml,
  serializeYaml,

  // 系统操作
  getHomedir: () => homeDir,
  getPlatform: () => process.platform,
  showNotification,

  // 应用控制
  quitApp: () => ipcRenderer.send('quit-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  maximizeApp: () => ipcRenderer.send('maximize-app')
});

// 导出函数 - 确保上下文桥接正确设置
try {
  console.log('正在通过contextBridge暴露preloadApi...');
  // 确保使用contextBridge而不是直接赋值
  contextBridge.exposeInMainWorld('preloadApi', {
    // 文件操作
    readFile,
    writeFile,
    renameFile,
    deleteFile,
    fileExists,
    listFiles,

    // 对话框
    showOpenDialog: showOpenFileDialog,
    showOpenDirectoryDialog,
    showSaveDialog,

    // YAML处理
    parseYaml,
    serializeYaml,

    // Espanso相关
    getEspansoConfigDir,
    getEspansoConfigFiles,
    getDefaultEspansoConfigPath,
    scanDirectory,

    // 系统操作
    getPlatform: () => process.platform,
    getHomeDir: () => osModule.homedir(),
    joinPath: (...args) => pathModule.join(...args),

    // 通知
    showNotification,

    // 环境信息
    isElectron: true
  });
  console.log('[Preload] preloadApi exposed successfully.');
  if (window.preloadApi) {
    console.log('[Preload] Verified: window.preloadApi exists after exposeInMainWorld.');
    console.log('[Preload] Available methods:', Object.keys(window.preloadApi).join(', '));
  } else {
    console.error('[Preload] Verification failed: window.preloadApi does NOT exist after exposeInMainWorld.');
  }
} catch (error) {
  console.error('无法暴露API到渲染进程:', error);
}

// Example of setting up IPC handlers in the main process (electron/main/index.ts)
// You need matching handlers in the main process for 'show-open-dialog' and 'show-save-dialog'
/*
import { ipcMain, dialog } from 'electron';

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(options);
  return result;
});
*/