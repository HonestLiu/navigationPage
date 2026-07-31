'use strict';

const { getDb, saveDB } = require('../db');
const { broadcast } = require('../sse');

module.exports = function registerEngines(app) {
    app.get('/api/engines', (req, res) => {
        const db = getDb();
        res.json(db.engines.sort((a, b) => a.sort_order - b.sort_order));
    });

    app.post('/api/engines', (req, res) => {
        const db = getDb();
        const maxOrder = db.engines.reduce((m, e) => Math.max(m, e.sort_order), -1);
        const engine = { sort_order: maxOrder + 1, ...req.body };
        if (!engine.id) engine.id = engine.name.toLowerCase().replace(/\s/g, '');
        db.engines.push(engine);
        saveDB(db);
        broadcast('engine_change', { action: 'add', engine });
        res.json(engine);
    });

    app.put('/api/engines/:id', (req, res) => {
        const db = getDb();
        const idx = db.engines.findIndex(e => e.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        db.engines[idx] = { ...db.engines[idx], ...req.body };
        saveDB(db);
        broadcast('engine_change', { action: 'update', engine: db.engines[idx] });
        res.json(db.engines[idx]);
    });

    app.delete('/api/engines/:id', (req, res) => {
        const db = getDb();
        db.engines = db.engines.filter(e => e.id !== req.params.id);
        saveDB(db);
        broadcast('engine_change', { action: 'delete', id: req.params.id });
        res.json({ ok: true });
    });
};
