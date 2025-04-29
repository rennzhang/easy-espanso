const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

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
  });
}

// 显示打开文件对话框
async function showOpenFileDialog(options) {
  return window.utools.showOpenDialog(options);
}

// 显示打开目录对话框
async function showOpenDirectoryDialog(options) {
  return window.utools.showOpenDialog({
    ...options,
    properties: ['openDirectory']
  });
}

// 显示保存文件对话框
async function showSaveDialog(options) {
  return window.utools.showSaveDialog(options);
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

// 显示通知
function showNotification(message) {
  window.utools.showNotification(message);
}

// 获取操作系统平台
function platform() {
  return Promise.resolve(process.platform);
}

// 暴露API给渲染进程
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

  // 系统操作
  platform,
  
  // 通知
  showNotification
};
