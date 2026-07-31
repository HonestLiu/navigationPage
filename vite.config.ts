import { defineConfig } from 'vite';

// 前端构建配置：
// - 产物输出到 dist/，由 server/index.js 以静态文件提供服务
// - dev 模式将 /api 与 /wallpapers 代理到本地 Node 服务（默认 3000）
export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true
    },
    server: {
        proxy: {
            '/api': 'http://localhost:3000',
            '/wallpapers': 'http://localhost:3000'
        }
    }
});
