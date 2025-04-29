const { contextBridge, ipcRenderer } = require('electron');
let fs, path, os, yaml;

// 尝试导入模块，并处理可能的错误
try {
  fs = require('fs');
  path = require('path');
  os = require('os');

  try {
    yaml = require('js-yaml');
    console.log('js-yaml模块加载成功');
  } catch (yamlError) {
    console.error('无法加载js-yaml模块:', yamlError);
    // 提供一个简单的降级实现
    yaml = {
      load: (content) => {
        console.warn('使用降级YAML解析器，功能受限');
        try {
          return JSON.parse(content);
        } catch (e) {
          console.error('降级YAML解析失败，返回空对象', e);
          return {};
        }
      },
      dump: (data) => {
        console.warn('使用降级YAML序列化器，功能受限');
        try {
          return JSON.stringify(data, null, 2);
        } catch (e) {
          console.error('降级YAML序列化失败', e);
          return '{}';
        }
      }
    };
  }
} catch (error) {
  console.error('初始化Node.js模块失败:', error);
  // 提供空的模拟对象
  fs = {
    readFile: (_, __, callback) => callback(new Error('fs模块不可用')),
    writeFile: (_, __, ___, callback) => callback(new Error('fs模块不可用')),
    mkdir: (_, __, callback) => callback(new Error('fs模块不可用')),
    readdir: (_, __, callback) => callback(new Error('fs模块不可用')),
    access: (_, __, callback) => callback(new Error('fs模块不可用')),
    constants: { F_OK: 0 }
  };
  path = {
    join: (...args) => args.join('/'),
    dirname: (p) => p.split('/').slice(0, -1).join('/')
  };
  os = {
    homedir: () => '/home'
  };
  yaml = {
    load: () => ({}),
    dump: () => '{}'
  };
}

// 获取用户主目录
const homeDir = os.homedir();

// 获取Espanso配置目录
function getEspansoConfigDir() {
  // 根据操作系统确定Espanso配置目录
  let configDir;

  try {
    switch (process.platform) {
      case 'win32':
        configDir = path.join(process.env.APPDATA || '', 'espanso');
        break;
      case 'darwin':
        configDir = path.join(homeDir, 'Library', 'Application Support', 'espanso');
        break;
      default: // Linux和其他Unix系统
        configDir = path.join(homeDir, '.config', 'espanso');
        break;
    }
  } catch (error) {
    console.error('获取Espanso配置目录失败:', error);
    configDir = '';
  }

  return configDir;
}

// 读取文件内容
function readFile(filePath) {
  return new Promise((resolve, reject) => {
    try {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`读取文件失败: ${filePath}`, err);
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (error) {
      console.error(`读取文件异常: ${filePath}`, error);
      reject(error);
    }
  });
}

// 写入文件内容
function writeFile(filePath, content) {
  return new Promise((resolve, reject) => {
    try {
      // 确保目录存在
      const dirPath = path.dirname(filePath);
      fs.mkdir(dirPath, { recursive: true }, (mkdirErr) => {
        if (mkdirErr && mkdirErr.code !== 'EEXIST') {
          console.error(`创建目录失败: ${dirPath}`, mkdirErr);
          reject(mkdirErr);
          return;
        }

        // 写入文件
        fs.writeFile(filePath, content, 'utf8', (writeErr) => {
          if (writeErr) {
            console.error(`写入文件失败: ${filePath}`, writeErr);
            reject(writeErr);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.error(`写入文件异常: ${filePath}`, error);
      reject(error);
    }
  });
}

// 显示打开文件对话框
async function showOpenFileDialog(options) {
  try {
    const result = await ipcRenderer.invoke('show-open-dialog', {
      ...options,
      properties: ['openFile']
    });

    if (result.canceled) {
      return undefined;
    }

    return result.filePaths;
  } catch (error) {
    console.error('打开文件对话框失败:', error);
    return undefined;
  }
}

// 显示打开目录对话框
async function showOpenDirectoryDialog(options) {
  try {
    const result = await ipcRenderer.invoke('show-open-dialog', {
      ...options,
      properties: ['openDirectory']
    });

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
  try {
    return ipcRenderer.invoke('show-save-dialog', options);
  } catch (error) {
    console.error('保存文件对话框失败:', error);
    return undefined;
  }
}

// 列出目录中的文件
function listFiles(dirPath) {
  return new Promise((resolve, reject) => {
    try {
      fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
        if (err) {
          console.error(`读取目录失败: ${dirPath}`, err);
          reject(err);
          return;
        }

        const files = entries
          .filter(entry => entry.isFile())
          .map(entry => ({
            name: entry.name,
            path: path.join(dirPath, entry.name),
            extension: path.extname(entry.name).toLowerCase()
          }));

        const directories = entries
          .filter(entry => entry.isDirectory())
          .map(entry => ({
            name: entry.name,
            path: path.join(dirPath, entry.name),
            isDirectory: true
          }));

        resolve([...directories, ...files]);
      });
    } catch (error) {
      console.error(`列出目录异常: ${dirPath}`, error);
      reject(error);
    }
  });
}

// 检查文件是否存在
function fileExists(filePath) {
  return new Promise((resolve) => {
    try {
      fs.access(filePath, fs.constants.F_OK, (err) => {
        resolve(!err);
      });
    } catch (error) {
      console.error(`检查文件存在异常: ${filePath}`, error);
      resolve(false);
    }
  });
}

// 解析YAML文件
function parseYaml(content) {
  try {
    return yaml.load(content);
  } catch (error) {
    console.error('解析YAML失败', error);
    return {}; // 返回空对象而不是抛出异常
  }
}

// 序列化为YAML
function serializeYaml(data) {
  try {
    return yaml.dump(data, {
      indent: 2,
      lineWidth: -1, // 禁用行宽限制
      noRefs: true // 避免YAML别名/锚点
    });
  } catch (error) {
    console.error('序列化YAML失败', error);
    return '{}'; // 返回空对象字符串而不是抛出异常
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
    const configPath = path.join(configDir, 'config');
    const configFileExists = await fileExists(configPath);

    // 获取匹配文件
    const matchDirPath = path.join(configDir, 'match');
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

// 导出API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  readFile,
  writeFile,
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