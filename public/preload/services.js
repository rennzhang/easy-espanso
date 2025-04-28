// 这个文件将在任务1.4中实现
// 目前只是一个占位符

// 读取文件内容
function readFile(filePath) {
  return Promise.resolve('# 示例YAML内容\nmatches:\n  - trigger: ":hello"\n    replace: "Hello, World!"');
}

// 写入文件内容
function writeFile(filePath, content) {
  console.log(`模拟写入文件: ${filePath}`);
  return Promise.resolve();
}

// 显示打开文件/目录对话框
function showOpenDialog(options) {
  console.log('模拟打开文件对话框', options);
  return Promise.resolve(['/path/to/selected/directory']);
}

// 导出函数
window.preloadApi = {
  readFile,
  writeFile,
  showOpenDialog
};
