'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { handleSSE } = require('./sse');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb', strict: false }));

// 前端构建产物（Vite build 输出到 dist/，由 Docker build 阶段生成）
const DIST_DIR = path.join(__dirname, '..', 'dist');
app.use(express.static(DIST_DIR));
app.use('/wallpapers', express.static(db.WALLPAPER_DIR));

app.get('/api/sse', handleSSE);

// 注册各路由模块（高内聚、低耦合）
require('./routes/kv')(app);
require('./routes/nav')(app);
require('./routes/engines')(app);
require('./routes/wallpaper')(app);
require('./routes/airdrop')(app);
require('./routes/misc')(app);

// SPA 回退：非 API、非静态资源都返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'), (err) => {
        if (err) res.status(404).send('Frontend not built. Run `npm run build` first.');
    });
});

function startServer(port) {
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`\n  Navigation Page running at:\n`);
        console.log(`  → Local:   http://localhost:${port}`);
        const nets = require('os').networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) console.log(`  → Network: http://${net.address}:${port}`);
            }
        }
        console.log(`\n  Data storage (数据写入位置):`);
        console.log(`    DATA_DIR   = ${db.DATA_DIR}`);
        console.log(`    DB         = ${db.DB_PATH}`);
        console.log(`    uploads    = ${db.UPLOAD_DIR}`);
        console.log(`    wallpapers = ${db.WALLPAPER_DIR}`);
        console.log();
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`  Port ${port} is in use, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error(err);
            process.exit(1);
        }
    });

    function shutdown(signal) {
        console.log(`\n  Received ${signal}, shutting down...`);
        server.close(() => { console.log('  Server closed.'); process.exit(0); });
        setTimeout(() => process.exit(1), 3000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer(PORT);
