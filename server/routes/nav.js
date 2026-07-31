'use strict';

const { getDb, saveDB } = require('../db');
const { broadcast } = require('../sse');

module.exports = function registerNav(app) {
    app.get('/api/nav', (req, res) => {
        const db = getDb();
        res.json(db.nav_items.sort((a, b) => a.sort_order - b.sort_order));
    });

    app.post('/api/nav', (req, res) => {
        const db = getDb();
        const maxId = db.nav_items.reduce((m, i) => Math.max(m, i.id), 0);
        const maxOrder = db.nav_items.reduce((m, i) => Math.max(m, i.sort_order), -1);
        const item = { id: maxId + 1, sort_order: maxOrder + 1, ...req.body };
        db.nav_items.push(item);
        saveDB(db);
        broadcast('nav_change', { action: 'add', item });
        res.json(item);
    });

    app.put('/api/nav/:id', (req, res) => {
        const db = getDb();
        const id = parseInt(req.params.id);
        const idx = db.nav_items.findIndex(i => i.id === id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        db.nav_items[idx] = { ...db.nav_items[idx], ...req.body };
        saveDB(db);
        broadcast('nav_change', { action: 'update', item: db.nav_items[idx] });
        res.json(db.nav_items[idx]);
    });

    app.delete('/api/nav/:id', (req, res) => {
        const db = getDb();
        const id = parseInt(req.params.id);
        db.nav_items = db.nav_items.filter(i => i.id !== id);
        saveDB(db);
        broadcast('nav_change', { action: 'delete', id });
        res.json({ ok: true });
    });

    app.put('/api/nav-order', (req, res) => {
        const db = getDb();
        const { items } = req.body;
        items.forEach((id, i) => {
            const item = db.nav_items.find(n => n.id === id);
            if (item) item.sort_order = i;
        });
        saveDB(db);
        broadcast('nav_change', { action: 'reorder' });
        res.json({ ok: true });
    });
};
