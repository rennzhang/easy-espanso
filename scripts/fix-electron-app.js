const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// 定义路径
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const electronDir = path.resolve(rootDir, 'electron');

// 确保 dist 目录存在
if (!fs.existsSync(distDir)) {
  console.log('Building Vue application...');
  execSync('npm run build', { stdio: 'inherit' });
}

// 备份并替换关键文件
console.log('Backing up and replacing key files...');

// 1. 备份并替换 index.html
const indexHtmlPath = path.resolve(rootDir, 'index.html');
const indexHtmlNewPath = path.resolve(rootDir, 'index.html.new');
const indexHtmlBackupPath = path.resolve(rootDir, 'index.html.backup');

if (fs.existsSync(indexHtmlPath) && fs.existsSync(indexHtmlNewPath)) {
  fs.copySync(indexHtmlPath, indexHtmlBackupPath);
  fs.copySync(indexHtmlNewPath, indexHtmlPath);
  console.log('✅ Replaced index.html');
}

// 2. 备份并替换 vite.config.ts
const viteConfigPath = path.resolve(rootDir, 'vite.config.ts');
const viteConfigNewPath = path.resolve(rootDir, 'vite.config.ts.new');
const viteConfigBackupPath = path.resolve(rootDir, 'vite.config.ts.backup');

if (fs.existsSync(viteConfigPath) && fs.existsSync(viteConfigNewPath)) {
  fs.copySync(viteConfigPath, viteConfigBackupPath);
  fs.copySync(viteConfigNewPath, viteConfigPath);
  console.log('✅ Replaced vite.config.ts');
}

// 3. 备份并替换 electron/main.js
const mainJsPath = path.resolve(electronDir, 'main.js');
const mainJsNewPath = path.resolve(electronDir, 'main.js.new');
const mainJsBackupPath = path.resolve(electronDir, 'main.js.backup');

if (fs.existsSync(mainJsPath) && fs.existsSync(mainJsNewPath)) {
  fs.copySync(mainJsPath, mainJsBackupPath);
  fs.copySync(mainJsNewPath, mainJsPath);
  console.log('✅ Replaced electron/main.js');
}

// 4. 备份并替换 src/main.ts
const mainTsPath = path.resolve(rootDir, 'src/main.ts');
const mainTsNewPath = path.resolve(rootDir, 'src/main.ts.new');
const mainTsBackupPath = path.resolve(rootDir, 'src/main.ts.backup');

if (fs.existsSync(mainTsPath) && fs.existsSync(mainTsNewPath)) {
  fs.copySync(mainTsPath, mainTsBackupPath);
  fs.copySync(mainTsNewPath, mainTsPath);
  console.log('✅ Replaced src/main.ts');
}

// 重新构建应用
console.log('Rebuilding application...');
execSync('npm run build', { stdio: 'inherit' });

// 修复 dist/index.html 中的路径
const distIndexHtmlPath = path.resolve(distDir, 'index.html');
if (fs.existsSync(distIndexHtmlPath)) {
  console.log('Fixing paths in dist/index.html...');
  let htmlContent = fs.readFileSync(distIndexHtmlPath, 'utf8');

  // 修复资源路径
  htmlContent = htmlContent.replace(/src="\/assets\//g, 'src="./assets/');
  htmlContent = htmlContent.replace(/href="\/assets\//g, 'href="./assets/');

  // 添加 base 标签（如果不存在）
  if (!htmlContent.includes('<base href')) {
    htmlContent = htmlContent.replace('<head>', '<head>\n    <base href="./">');
  }

  // 确保存在挂载点
  if (!htmlContent.includes('<div id="app">') && !htmlContent.includes('<div id="app" ')) {
    // 如果 body 标签存在但没有挂载点，添加挂载点
    if (htmlContent.includes('<body>') && htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('<body>', '<body>\n    <div id="app"></div>');
    }
  }

  // 确保脚本标签在 body 结束前
  if (htmlContent.includes('</body>')) {
    // 找到所有 script 标签
    const scriptTags = htmlContent.match(/<script[^>]*>[^<]*<\/script>/g) || [];

    // 从 head 中移除脚本标签
    for (const scriptTag of scriptTags) {
      if (htmlContent.includes(`<head>`) &&
          htmlContent.includes(`</head>`) &&
          htmlContent.indexOf(scriptTag) > htmlContent.indexOf('<head>') &&
          htmlContent.indexOf(scriptTag) < htmlContent.indexOf('</head>')) {
        htmlContent = htmlContent.replace(scriptTag, '');
      }
    }

    // 在 body 结束前添加脚本标签
    let bodyEndPos = htmlContent.lastIndexOf('</body>');
    let scriptsHtml = scriptTags.join('\n    ');
    htmlContent = htmlContent.substring(0, bodyEndPos) +
                  '\n    ' + scriptsHtml +
                  htmlContent.substring(bodyEndPos);
  }

  fs.writeFileSync(distIndexHtmlPath, htmlContent);
  console.log('✅ Fixed dist/index.html');
}

// 复制直接加载文件
const directLoadHtmlPath = path.resolve(rootDir, 'direct-load.html');
const directLoadDistPath = path.resolve(distDir, 'direct-load.html');
if (fs.existsSync(directLoadHtmlPath)) {
  fs.copySync(directLoadHtmlPath, directLoadDistPath);
  console.log('✅ Copied direct-load.html to dist directory');
}

// 查找构建后的 JS 文件
const assetsDir = path.resolve(distDir, 'assets');
if (fs.existsSync(assetsDir)) {
  console.log('Checking assets directory...');
  const files = fs.readdirSync(assetsDir);

  // 查找 index-*.js 文件
  const indexJsFiles = files.filter(file => file.startsWith('index-') && file.endsWith('.js'));
  if (indexJsFiles.length > 0) {
    console.log('Found index JS files:', indexJsFiles);

    // 创建一个简单的加载器 HTML
    const loaderHtmlPath = path.resolve(distDir, 'loader.html');
    const loaderHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <base href="./" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Espanso GUI - Loader</title>
  </head>
  <body>
    <div id="app"></div>
    <script>
      // 确保挂载点存在
      document.addEventListener('DOMContentLoaded', function() {
        if (!document.getElementById('app')) {
          console.warn('找不到 #app 元素，创建一个新的挂载点');
          const appElement = document.createElement('div');
          appElement.id = 'app';
          document.body.appendChild(appElement);
        }
      });
    </script>
    <script type="module" src="./assets/${indexJsFiles[0]}"></script>
  </body>
</html>`;

    fs.writeFileSync(loaderHtmlPath, loaderHtml);
    console.log('✅ Created loader.html with direct reference to:', indexJsFiles[0]);
  }
}

console.log('All fixes applied successfully!');
console.log('Now you can run:');
console.log('  npm run electron:simple-package:mac');
console.log('to package the application.');
