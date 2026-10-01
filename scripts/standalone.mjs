import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// 将本地构建资源嵌入单文件，支持 file:// 双击打开和离线运行。
const dist = resolve('dist');
let html = await readFile(resolve(dist, 'index.html'), 'utf8');
const script = html.match(/<script\b[^>]*src="([^\"]+)"[^>]*><\/script>/);
const stylesheet = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^\"]+)"[^>]*>/);
if (!script || !stylesheet) throw new Error('构建资源未找到，无法生成离线文件。');
const js = await readFile(resolve(dist, script[1]), 'utf8');
const css = await readFile(resolve(dist, stylesheet[1]), 'utf8');
const license = await readFile(resolve('node_modules/three/LICENSE'), 'utf8');
html = html.replace('<head>', () => `<head>\n<!-- Three.js 许可声明\n${license}\n-->`);
html = html.replace(script[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(stylesheet[0], () => `<style>${css}</style>`);
await writeFile(resolve(dist, '听云苑-离线版.html'), html);
console.log('已生成 dist/听云苑-离线版.html，可双击打开。');
