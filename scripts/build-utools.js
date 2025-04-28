const fs = require('fs-extra');
const path = require('path');

// 定义路径
const distDir = path.resolve(__dirname, '../dist');
const utoolsDir = path.resolve(__dirname, '../utools');
const utoolsDistDir = path.resolve(__dirname, '../dist_utools');

// 确保输出目录存在
fs.ensureDirSync(utoolsDistDir);

// 复制dist目录内容到utools输出目录
fs.copySync(distDir, utoolsDistDir);

// 复制utools目录内容到utools输出目录
fs.copySync(utoolsDir, utoolsDistDir);

console.log('uTools插件打包完成，输出目录: dist_utools');
