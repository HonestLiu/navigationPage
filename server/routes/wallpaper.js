'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { WALLPAPER_DIR } = require('../db');

module.exports = function registerWallpaper(app) {
    app.post('/api/wallpaper/upload', express.raw({ limit: '10mb', type: '*/*' }), (req, res) => {
        const ext = req.headers['x-wallpaper-ext'] || '.jpg';
        const id = crypto.randomBytes(8).toString('hex');
        const fileName = id + ext;
        const filePath = path.join(WALLPAPER_DIR, fileName);
        fs.writeFileSync(filePath, req.body);
        res.json({ ok: true, url: '/wallpapers/' + fileName });
    });

    app.delete('/api/wallpaper/delete/:file', (req, res) => {
        const file = req.params.file.replace(/[^a-zA-Z0-9._-]/g, '');
        const filePath = path.join(WALLPAPER_DIR, file);
        if (!filePath.startsWith(WALLPAPER_DIR)) return res.status(400).json({ error: 'invalid path' });
        try { fs.unlinkSync(filePath); } catch (e) {}
        res.json({ ok: true });
    });

    // 必应壁纸代理：避免浏览器直连 cn.bing.com 的 CORS 限制
    app.get('/api/wallpaper/bing', async (req, res) => {
        try {
            const idx = parseInt(req.query.idx, 10);
            const n = parseInt(req.query.n, 10) || 1;
            const safeIdx = Number.isFinite(idx) ? Math.max(0, Math.min(7, idx)) : 0;
            const safeN = Number.isFinite(n) ? Math.max(1, Math.min(8, n)) : 1;
            const apiUrl = `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=${safeIdx}&n=${safeN}&mkt=zh-CN`;
            const r = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (MyPageHome)' } });
            if (!r.ok) return res.status(502).json({ error: 'bing_upstream', status: r.status });
            const data = await r.json();
            const images = (data && data.images) || [];
            if (!images.length) return res.status(404).json({ error: 'no_image' });
            const out = images.map(img => ({
                url: 'https://cn.bing.com' + String(img.url).split('&')[0],
                copyright: img.copyright || '',
                copyrightlink: img.copyrightlink || ''
            }));
            res.json(safeN === 1 ? out[0] : out);
        } catch (e) {
            res.status(500).json({ error: 'bing_fetch_failed', message: String((e && e.message) || e) });
        }
    });
};
