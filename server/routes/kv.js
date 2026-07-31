'use strict';

const { getDb, saveDB } = require('../db');
const { broadcast } = require('../sse');

// KV 存储：主题、布局、工具配置、待办、笔记、剪贴板、DNS 等都在 db.kv 下
module.exports = function registerKv(app) {
    app.get('/api/kv/:key', (req, res) => {
        const db = getDb();
        res.json(db.kv[req.params.key] ?? null);
    });

    app.put('/api/kv/:key', (req, res) => {
        const db = getDb();
        db.kv[req.params.key] = req.body;
        saveDB(db);
        broadcast('kv', { key: req.params.key, value: req.body });
        res.json({ ok: true });
    });
};
