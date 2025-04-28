const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// 确保 dist 目录存在
const distDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  console.log('Building Vue application...');
  execSync('npm run build', { stdio: 'inherit' });
}

// 确保 electron 目录中的文件被复制到正确的位置
const electronDir = path.resolve(__dirname, '../electron');
const electronDistDir = path.resolve(__dirname, '../dist_electron');
const appDir = path.resolve(electronDistDir, 'app');

// 清理并创建必要的目录
console.log('Cleaning output directories...');
fs.removeSync(electronDistDir);
fs.mkdirSync(electronDistDir, { recursive: true });
fs.mkdirSync(appDir, { recursive: true });

// 复制所有 dist 文件到 app 目录
console.log('Copying web files to app directory...');
fs.copySync(distDir, appDir, { overwrite: true });

// 复制 electron 文件
console.log('Copying Electron main process files...');
fs.copyFileSync(
  path.resolve(electronDir, 'main.js'),
  path.resolve(appDir, 'main.js')
);

fs.copyFileSync(
  path.resolve(electronDir, 'preload.js'),
  path.resolve(appDir, 'preload.js')
);

// 如果electron目录有更多文件夹需要复制
try {
  const preloadDir = path.resolve(electronDir, 'preload');
  if (fs.existsSync(preloadDir) && fs.statSync(preloadDir).isDirectory()) {
    console.log('Copying preload directory...');
    fs.copySync(preloadDir, path.resolve(appDir, 'preload'), { overwrite: true });
  }
} catch (err) {
  console.error('复制额外文件夹时出错:', err);
}

// 修复HTML文件中的资源路径
try {
  const indexHtmlPath = path.resolve(appDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    console.log('Checking index.html for resource paths...');
    let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    
    // 检查并修复可能的路径问题
    if (htmlContent.includes('src="/assets/') || htmlContent.includes('href="/assets/')) {
      console.log('Fixed absolute paths in index.html');
      htmlContent = htmlContent.replace(/src="\/assets\//g, 'src="./assets/');
      htmlContent = htmlContent.replace(/href="\/assets\//g, 'href="./assets/');
      fs.writeFileSync(indexHtmlPath, htmlContent);
    }
  }
} catch (err) {
  console.error('修复HTML资源路径时出错:', err);
}

// 创建 package.json 文件在 app 目录中，包含依赖
console.log('Creating package.json with dependencies...');
const appPackageJson = {
  name: "espanso-gui",
  version: "0.1.0",
  main: "main.js",
  dependencies: {
    "js-yaml": "^4.1.0"
  }
};

fs.writeFileSync(
  path.join(appDir, 'package.json'),
  JSON.stringify(appPackageJson, null, 2)
);

// 在app目录安装依赖
console.log('Installing dependencies in app directory...');
execSync('npm install --production --prefix ' + appDir, { stdio: 'inherit' });

// 检查关键文件是否存在
console.log('Checking for critical files...');
const criticalFiles = [
  'index.html',
  'main.js',
  'preload.js',
  'node_modules/js-yaml/index.js',
  'assets'
];

let allFilesExist = true;
for (const file of criticalFiles) {
  const filePath = path.join(appDir, file);
  const exists = fs.existsSync(filePath);
  console.log(`${file}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
  if (!exists) {
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('ERROR: 一些关键文件丢失，打包可能会失败!');
} else {
  console.log('所有关键文件都已找到!');
}

// 检查资源文件是否正确复制
try {
  const assetsDir = path.join(appDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const assetFiles = fs.readdirSync(assetsDir);
    console.log('资源文件:', assetFiles);
    
    // 检查重要资源文件
    const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
    const cssFiles = assetFiles.filter(file => file.endsWith('.css'));
    
    if (jsFiles.length === 0) {
      console.warn('警告: 未找到JavaScript资源文件');
    }
    
    if (cssFiles.length === 0) {
      console.warn('警告: 未找到CSS资源文件');
    }
  }
} catch (err) {
  console.error('检查资源文件时出错:', err);
}

// 输出app目录的文件列表
console.log('App目录内容:');
function listDirRecursive(dir, indent = '') {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const isDir = fs.statSync(itemPath).isDirectory();
    console.log(`${indent}${isDir ? '📁' : '📄'} ${item}`);
    if (isDir && item !== 'node_modules') {
      listDirRecursive(itemPath, indent + '  ');
    }
  }
}
listDirRecursive(appDir);

console.log('Files prepared for Electron packaging');

// 使用 electron-packager 打包应用，添加更多选项以修复一些常见问题
console.log('Packaging with electron-packager...');
try {
  const platform = process.argv[2] || 'darwin';
  execSync(`npx electron-packager ${appDir} "Espanso GUI" --platform=${platform} --arch=x64 --out=${electronDistDir}/packaged --overwrite --asar=false`, 
    { stdio: 'inherit' });
  console.log('Application packaged successfully!');
} catch (error) {
  console.error('Error packaging application:', error.message);
}

// 添加打包后的文件列表
try {
  const packedDir = path.resolve(electronDistDir, 'packaged');
  if (fs.existsSync(packedDir)) {
    const items = fs.readdirSync(packedDir);
    if (items.length > 0) {
      const appDir = path.join(packedDir, items[0]);
      console.log(`\n打包后的应用目录: ${appDir}`);
      
      if (process.platform === 'darwin') {
        // macOS 应用
        const contentsDir = path.join(appDir, 'Contents');
        const resourcesDir = path.join(contentsDir, 'Resources', 'app');
        if (fs.existsSync(resourcesDir)) {
          console.log('\n应用程序资源目录内容:');
          listDirRecursive(resourcesDir);
        }
      } else {
        // Windows/Linux 应用
        const resourcesDir = path.join(appDir, 'resources', 'app');
        if (fs.existsSync(resourcesDir)) {
          console.log('\n应用程序资源目录内容:');
          listDirRecursive(resourcesDir);
        }
      }
    }
  }
} catch (error) {
  console.error('列出打包后的文件时出错:', error);
}
