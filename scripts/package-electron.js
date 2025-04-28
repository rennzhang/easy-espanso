const packager = require('electron-packager');
const fs = require('fs-extra');
const path = require('path');

// 确保 dist 目录存在
const distDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

// 创建 package.json 文件在 dist 目录中
const packageJson = {
  name: "espanso-gui",
  version: "0.1.0",
  main: "../electron/main.js"
};

fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// 确保 electron 目录中的文件被复制到正确的位置
fs.copySync(
  path.resolve(__dirname, '../electron/main.js'),
  path.resolve(__dirname, '../dist_electron/main.js')
);

fs.copySync(
  path.resolve(__dirname, '../electron/preload.js'),
  path.resolve(__dirname, '../dist_electron/preload.js')
);

// 使用 electron-packager 打包应用
async function packageApp() {
  try {
    const appPaths = await packager({
      dir: path.resolve(__dirname, '..'),
      out: path.resolve(__dirname, '../dist_electron'),
      name: 'Espanso GUI',
      platform: process.argv[2] || 'all',
      arch: 'x64',
      electronVersion: '28.0.0',
      overwrite: true,
      asar: true,
      icon: path.resolve(__dirname, '../public/icon'),
      ignore: [
        /node_modules/,
        /src/,
        /public/,
        /scripts/,
        /\.git/,
        /\.vscode/,
        /dist_electron/,
        /electron\/node_modules/
      ],
      prune: true,
      // 明确指定主入口文件
      main: path.resolve(__dirname, '../electron/main.js')
    });

    console.log('Application packaged successfully!');
    console.log('Package created at:', appPaths.join('\n'));
  } catch (err) {
    console.error('Error packaging application:', err);
  }
}

packageApp();
