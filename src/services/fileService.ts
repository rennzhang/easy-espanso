// 从preload脚本导入文件服务函数
// 这些函数将在任务1.4中实现

// 读取文件内容
export function readFile(filePath: string): Promise<string> {
  if (window.preloadApi?.readFile) {
    return window.preloadApi.readFile(filePath);
  }
  
  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.readFile不可用，使用模拟数据');
  return Promise.resolve('# 示例YAML内容\nmatches:\n  - trigger: ":hello"\n    replace: "Hello, World!"');
}

// 写入文件内容
export function writeFile(filePath: string, content: string): Promise<void> {
  if (window.preloadApi?.writeFile) {
    return window.preloadApi.writeFile(filePath, content);
  }
  
  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.writeFile不可用，使用模拟数据');
  console.log(`模拟写入文件: ${filePath}`);
  return Promise.resolve();
}

// 显示打开文件/目录对话框
export function showOpenDialog(options: any): Promise<string[] | undefined> {
  if (window.preloadApi?.showOpenDialog) {
    return window.preloadApi.showOpenDialog(options);
  }
  
  // 如果preloadApi不可用，返回一个模拟的Promise
  console.warn('preloadApi.showOpenDialog不可用，使用模拟数据');
  console.log('模拟打开文件对话框', options);
  return Promise.resolve(['/path/to/selected/directory']);
}
