const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 确保 dist 目录存在
const distDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  console.log('Building Vue application...');
  execSync('npm run build', { stdio: 'inherit' });
}

// 创建 package.json 文件在 dist 目录中
const packageJson = {
  name: "espanso-gui",
  version: "0.1.0",
  main: "main.js"
};

fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log('Created package.json in dist directory');

// 确保 electron 目录中的文件被复制到正确的位置
const electronDistDir = path.resolve(__dirname, '../dist_electron');
if (!fs.existsSync(electronDistDir)) {
  fs.mkdirSync(electronDistDir, { recursive: true });
}

// 复制 electron 目录中的文件
fs.copyFileSync(
  path.resolve(__dirname, '../electron/main.js'),
  path.resolve(electronDistDir, 'main.js')
);

fs.copyFileSync(
  path.resolve(__dirname, '../electron/preload.js'),
  path.resolve(electronDistDir, 'preload.js')
);

// 复制 dist 目录中的文件到 dist_electron/app 目录
const appDir = path.resolve(electronDistDir, 'app');
if (!fs.existsSync(appDir)) {
  fs.mkdirSync(appDir, { recursive: true });
}

// 手动复制 dist 目录中的所有文件到 app 目录
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 复制所有文件
copyDir(distDir, appDir);

// 检查关键文件是否存在
const indexHtmlPath = path.join(appDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error('ERROR: index.html not found in the app directory!');
  console.log('App directory contents:', fs.readdirSync(appDir));
} else {
  console.log('index.html successfully copied to app directory');
}

// 检查assets目录
const assetsDir = path.join(appDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.error('ERROR: assets directory not found in the app directory!');
} else {
  console.log('Assets directory found, contents:', fs.readdirSync(assetsDir));
}

// 创建 package.json 文件在 dist_electron 目录中
const mainPackageJson = {
  name: "espanso-gui",
  version: "0.1.0",
  main: "main.js",
  dependencies: {
    "js-yaml": "^4.1.0"
  }
};

fs.writeFileSync(
  path.join(electronDistDir, 'package.json'),
  JSON.stringify(mainPackageJson, null, 2)
);

console.log('Files prepared for Electron packaging');

// 使用 electron-packager 打包应用
console.log('Packaging with electron-packager...');
try {
  const platform = process.argv[2] || 'darwin';
  execSync(`npx electron-packager ${electronDistDir} "Espanso GUI" --platform=${platform} --arch=x64 --out=${electronDistDir}/packaged --overwrite`, 
    { stdio: 'inherit' });
  console.log('Application packaged successfully!');
} catch (error) {
  console.error('Error packaging application:', error.message);
}
