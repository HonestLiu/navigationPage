// 扩展构建后处理：把外链 CSS 内联进 index.html，减少一次渲染阻塞的网络请求。
// 注意：MV3 禁止内联脚本，故 JS 必须保持外链（'self' 允许），仅 CSS 可安全内联。
import fs from 'node:fs';
import path from 'node:path';

const dir = 'extension';
const htmlPath = path.join(dir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const linkMatch = html.match(/<link[^>]*rel="stylesheet"[^>]*href="(\.\/assets\/[^"]+\.css)"[^>]*>/);
if (!linkMatch) {
  console.log('inline-extension-css: 未找到 CSS link，跳过');
  process.exit(0);
}
const cssPath = path.join(dir, linkMatch[1].replace(/^\.\//, ''));
let css = fs.readFileSync(cssPath, 'utf8');

// CSS 原本在 assets/ 下，其中字体 url 是相对 assets/ 的（如 ./fa-solid-xxx.woff2）。
// 内联进根目录的 index.html 后，这些相对路径要改指 ./assets/，否则 Font Awesome 字体加载失败、图标消失。
css = css.replace(/url\(\s*['"]?\.\/([^'")]+?)\s*['"]?\)/g, (_m, p1) => 'url(./assets/' + p1 + ')');

// 用内联 <style> 替换外链 <link>
html = html.replace(linkMatch[0], `<style>${css}</style>`);

// 同源模块脚本无需 crossorigin，去掉它避免多余的 CORS 校验
html = html.replace(/(<script type="module") crossorigin/, '$1');

fs.writeFileSync(htmlPath, html);

// 删除已内联的 CSS 文件，避免冗余
fs.unlinkSync(cssPath);
console.log('inline-extension-css: 已将 CSS 内联进 index.html');
