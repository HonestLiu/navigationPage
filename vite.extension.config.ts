import { defineConfig } from 'vite';

// Chrome 扩展构建配置：
// - 产物输出到 extension/，可直接「加载已解压的扩展程序」
// - base 用相对路径，便于 chrome-extension:// 协议下正确加载资源
// - publicDir 指向 extension-public，用于拷贝 manifest.json 与图标
export default defineConfig({
    base: './',
    publicDir: 'extension-public',
    build: {
        outDir: 'extension',
        emptyOutDir: true
    }
});
