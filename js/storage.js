const API = '/api';

const Storage = {
    _cache: {},
    _listeners: [],
    _evtSource: null,
    _retryTimer: null,

    async init() {
        this._connectSSE();
    },

    _connectSSE() {
        if (this._evtSource) { try { this._evtSource.close(); } catch (e) {} }
        clearTimeout(this._retryTimer);
        const evtSource = new EventSource(API + '/sse');
        this._evtSource = evtSource;
        evtSource.addEventListener('kv', (e) => {
            const { key, value } = JSON.parse(e.data);
            this._cache[key] = value;
            this._notify('kv', key, value);
        });
        evtSource.addEventListener('nav_change', (e) => {
            this._notify('nav_change', null, JSON.parse(e.data));
        });
        evtSource.addEventListener('engine_change', (e) => {
            this._notify('engine_change', null, JSON.parse(e.data));
        });
        evtSource.onerror = () => {
            evtSource.close();
            this._retryTimer = setTimeout(() => this._connectSSE(), 5000);
        };
    },

    onChange(callback) {
        this._listeners.push(callback);
    },

    _notify(type, key, value) {
        this._listeners.forEach(cb => cb(type, key, value));
    },

    async get(key) {
        if (this._cache[key] !== undefined) return this._cache[key];
        try {
            const res = await fetch(API + '/kv/' + key);
            const data = await res.json();
            this._cache[key] = data;
            return data;
        } catch (e) { return null; }
    },

    async set(key, value) {
        this._cache[key] = value;
        try {
            await fetch(API + '/kv/' + key, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(value)
            });
        } catch (e) { console.error('Save failed:', e); }
    },

    async getNavItems() {
        try {
            const res = await fetch(API + '/nav');
            return await res.json();
        } catch (e) { return []; }
    },

    async saveNavItem(item) {
        const method = item.id ? 'PUT' : 'POST';
        const url = item.id ? API + '/nav/' + item.id : API + '/nav';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        return await res.json();
    },

    async deleteNavItem(id) {
        await fetch(API + '/nav/' + id, { method: 'DELETE' });
    },

    async reorderNavItems(ids) {
        await fetch(API + '/nav-order', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: ids })
        });
    },

    async getEngines() {
        try {
            const res = await fetch(API + '/engines');
            return await res.json();
        } catch (e) { return []; }
    },

    async saveEngine(engine) {
        const method = 'POST';
        const res = await fetch(API + '/engines', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(engine)
        });
        return await res.json();
    },

    async updateEngine(id, engine) {
        await fetch(API + '/engines/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(engine)
        });
    },

    async deleteEngine(id) {
        await fetch(API + '/engines/' + id, { method: 'DELETE' });
    },

    resolveUrl(url) {
        const map = this._cache['dns_map'] || [];
        for (const entry of map) {
            if (url.includes(entry.domain)) {
                return url.replace(entry.domain, entry.ip);
            }
        }
        return url;
    }
};
