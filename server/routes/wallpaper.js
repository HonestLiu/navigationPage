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
};
