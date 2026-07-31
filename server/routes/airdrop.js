'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { getDb, saveDB } = require('../db');
const { broadcast } = require('../sse');

const MEMORY_LIMIT = 500 * 1024 * 1024; // 500MB
const CLEANUP_INTERVAL = 60 * 1000;

function getAirDropList() {
    const db = getDb();
    return db.kv.airDrop_files || [];
}

function saveAirDropList(files) {
    const db = getDb();
    db.kv.airDrop_files = files;
    saveDB(db);
}

function cleanupExpired() {
    const files = getAirDropList();
    const now = Date.now();
    const alive = [];
    for (const f of files) {
        if (now > f.expiresAt) {
            try { fs.unlinkSync(f.path); } catch (e) {}
        } else {
            alive.push(f);
        }
    }
    if (alive.length !== files.length) saveAirDropList(alive);
}

setInterval(cleanupExpired, CLEANUP_INTERVAL);
cleanupExpired();

module.exports = function registerAirDrop(app) {
    app.get('/api/airDrop', (req, res) => {
        const files = getAirDropList().map(f => ({
            id: f.id, name: f.name, size: f.size, mime: f.mime,
            expiresAt: f.expiresAt, createdAt: f.createdAt,
            downloadUrl: '/api/airDrop/download/' + f.id
        }));
        res.json(files);
    });

    app.post('/api/airDrop/upload', express.raw({ limit: MEMORY_LIMIT, type: '*/*' }), (req, res) => {
        const name = decodeURIComponent(req.headers['x-file-name'] || 'unnamed');
        const mime = req.headers['x-file-mime'] || 'application/octet-stream';
        const duration = parseInt(req.headers['x-file-duration']) || 3600;
        const id = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(name);
        const filePath = path.join(require('../db').UPLOAD_DIR, id + ext);
        fs.writeFileSync(filePath, req.body);
        const file = {
            id, name, size: req.body.length, mime,
            path: filePath,
            createdAt: Date.now(),
            expiresAt: Date.now() + duration * 1000
        };
        const files = getAirDropList();
        files.unshift(file);
        saveAirDropList(files);
        broadcast('airDrop_change', {
            action: 'upload',
            file: { id, name, size: file.size, mime, expiresAt: file.expiresAt, createdAt: file.createdAt }
        });
        res.json({ ok: true, id, expiresAt: file.expiresAt });
    });

    app.get('/api/airDrop/download/:id', (req, res) => {
        const files = getAirDropList();
        const file = files.find(f => f.id === req.params.id);
        if (!file) return res.status(404).json({ error: 'File not found or expired' });
        if (Date.now() > file.expiresAt) {
            try { fs.unlinkSync(file.path); } catch (e) {}
            const db = getDb();
            db.kv.airDrop_files = files.filter(f => f.id !== req.params.id);
            saveDB(db);
            return res.status(410).json({ error: 'File expired' });
        }
        const { UPLOAD_DIR } = require('../db');
        if (!file.path.startsWith(UPLOAD_DIR)) return res.status(403).json({ error: 'forbidden' });
        res.setHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent(file.name) + '"');
        res.setHeader('Content-Type', file.mime);
        fs.createReadStream(file.path).pipe(res);
    });

    app.delete('/api/airDrop/:id', (req, res) => {
        let files = getAirDropList();
        const file = files.find(f => f.id === req.params.id);
        if (file) { try { fs.unlinkSync(file.path); } catch (e) {} }
        files = files.filter(f => f.id !== req.params.id);
        saveAirDropList(files);
        broadcast('airDrop_change', { action: 'delete', id: req.params.id });
        res.json({ ok: true });
    });
};
