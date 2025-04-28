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

console.log('Created package.json in dist directory');
