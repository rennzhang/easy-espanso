// Easy Espanso Preload Script
// 这个脚本提供了与操作系统交互的功能，包括文件读写、对话框显示等
// TODO: 在实际的Electron环境中测试这个脚本，确保所有功能正常工作
// TODO: 这个任务将在任务6.4（最终测试与代码审查）中完成
// 注意：此文件中有许多"未使用的参数"警告，这些是故意的，因为我们需要保持API兼容性
// eslint-disable-next-line no-unused-vars

// 导入所需的Node.js模块
let fs, path, dialog, app, yaml, os;

// 尝试导入模块，如果失败则提供降级方案
try {
  fs = require('fs');
  path = require('path');
  os = require('os');

  // 尝试导入Electron模块
  try {
    const electron = require('electron');
    dialog = electron.dialog;
    app = electron.app;
  } catch (electronError) {
    console.warn('Electron模块不可用，将使用降级方案', electronError);
    // 提供降级的dialog和app对象
    // 注意：这些参数故意不使用，仅为了保持API兼容性
    dialog = {
      showOpenDialog: async (options) => ({ canceled: false, filePaths: ['/mock/path/file.yml'] }),
      showSaveDialog: async (options) => ({ canceled: false, filePath: '/mock/path/save.yml' })
    };
    app = { getPath: (name) => '/mock/path' };
  }

  // 尝试导入js-yaml模块
  try {
    yaml = require('js-yaml');
  } catch (yamlError) {
    console.warn('js-yaml模块不可用，将使用降级方案', yamlError);
    // 提供降级的yaml对象
    yaml = {
      load: (content) => {
        try {
          return JSON.parse(content);
        } catch {
          return { matches: [] };
        }
      },
      dump: (data) => JSON.stringify(data, null, 2)
    };
  }
} catch (error) {
  console.warn('Node.js模块不可用，将使用降级方案', error);
  // 提供降级的模块
  // 注意：这些参数故意不使用，仅为了保持API兼容性
  fs = {
    readFile: (path, encoding, callback) => callback(null, '# 示例YAML内容\nmatches:\n  - trigger: ":hello"\n    replace: "Hello, World!"'),
    writeFile: (path, content, encoding, callback) => callback(null),
    mkdir: (path, options, callback) => callback(null),
    readdir: (path, options, callback) => callback(null, []),
    access: (path, mode, callback) => callback(true)
  };
  path = {
    join: (...args) => args.join('/'),
    dirname: (path) => path.split('/').slice(0, -1).join('/'),
    extname: (path) => path.includes('.') ? '.' + path.split('.').pop() : ''
  };
  os = { homedir: () => '/home/user' };
  dialog = {
    showOpenDialog: async (options) => ({ canceled: false, filePaths: ['/mock/path/file.yml'] }),
    showSaveDialog: async (options) => ({ canceled: false, filePath: '/mock/path/save.yml' })
  };
  app = { getPath: (name) => '/mock/path' };
  yaml = {
    load: (content) => {
      try {
        return JSON.parse(content);
      } catch {
        return { matches: [] };
      }
    },
    dump: (data) => JSON.stringify(data, null, 2)
  };
}

// 获取用户主目录
const homeDir = os.homedir();

// 获取Espanso配置目录
function getEspansoConfigDir() {
  // 根据操作系统确定Espanso配置目录
  let configDir;

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

  return configDir;
}

// 读取文件内容
function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`读取文件失败: ${filePath}`, err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

// 写入文件内容
function writeFile(filePath, content) {
  return new Promise((resolve, reject) => {
    // 确保目录存在
    const dir = path.dirname(filePath);
    fs.mkdir(dir, { recursive: true }, (mkdirErr) => {
      if (mkdirErr) {
        console.error(`创建目录失败: ${dir}`, mkdirErr);
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
  });
}

// 显示打开文件对话框
function showOpenFileDialog(options = {}) {
  return dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'YAML Files', extensions: ['yml', 'yaml'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    ...options
  });
}

// 显示打开目录对话框
function showOpenDirectoryDialog(options = {}) {
  return dialog.showOpenDialog({
    properties: ['openDirectory'],
    ...options
  });
}

// 显示保存文件对话框
function showSaveDialog(options = {}) {
  return dialog.showSaveDialog({
    filters: [
      { name: 'YAML Files', extensions: ['yml', 'yaml'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    ...options
  });
}

// 列出目录中的文件
function listFiles(dirPath) {
  return new Promise((resolve, reject) => {
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
  });
}

// 检查文件是否存在
function fileExists(filePath) {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });
}

// 解析YAML文件
function parseYaml(content) {
  try {
    return yaml.load(content);
  } catch (error) {
    console.error('解析YAML失败', error);
    throw error;
  }
}

// 序列化为YAML
function serializeYaml(data) {
  try {
    const result = yaml.dump(data, {
      indent: 2,
      lineWidth: -1, // 不限制行宽
      noRefs: true // 避免使用引用标记
    });
    return Promise.resolve(result);
  } catch (error) {
    console.error('序列化YAML失败', error);
    return Promise.reject(error);
  }
}

// 获取Espanso配置文件
async function getEspansoConfigFiles() {
  const configDir = getEspansoConfigDir();
  const matchDir = path.join(configDir, 'match');
  const configPath = path.join(configDir, 'config');

  // 检查目录是否存在
  const matchDirExists = await fileExists(matchDir);
  const configPathExists = await fileExists(configPath);

  const files = [];

  // 获取match目录中的文件
  if (matchDirExists) {
    try {
      const matchFiles = await listFiles(matchDir);
      for (const file of matchFiles) {
        if (file.extension === '.yml' || file.extension === '.yaml') {
          const content = await readFile(file.path);
          files.push({
            path: file.path,
            name: file.name,
            content,
            type: 'match'
          });
        }
      }
    } catch (error) {
      console.error('获取match文件失败', error);
    }
  }

  // 获取config目录中的文件
  if (configPathExists) {
    try {
      const configFiles = await listFiles(configPath);
      for (const file of configFiles) {
        if (file.extension === '.yml' || file.extension === '.yaml') {
          const content = await readFile(file.path);
          files.push({
            path: file.path,
            name: file.name,
            content,
            type: 'config'
          });
        }
      }
    } catch (error) {
      console.error('获取config文件失败', error);
    }
  }

  return files;
}

// 获取操作系统平台
function platform() {
  return Promise.resolve(process.platform);
}

// 显示通知
function showNotification(message) {
  if (window.utools && window.utools.showNotification) {
    window.utools.showNotification(message);
  } else {
    console.log('通知:', message);
  }
}

// 获取环境变量
function getEnvironmentVariable(name) {
  console.log(`[preloadServices] 获取环境变量: ${name}`);
  if (process.env && name in process.env) {
    return Promise.resolve(process.env[name]);
  }
  return Promise.resolve(null);
}

// 导出函数
window.preloadApi = {
  // 文件操作
  readFile,
  writeFile,
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
  
  // 环境变量
  getEnvironmentVariable,

  // 系统操作
  platform,

  // 通知
  showNotification
};
