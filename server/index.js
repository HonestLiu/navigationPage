const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const WALLPAPER_DIR = path.join(__dirname, 'wallpapers');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(WALLPAPER_DIR)) fs.mkdirSync(WALLPAPER_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb', strict: false }));
app.use(express.static(path.join(__dirname, '..')));
app.use('/wallpapers', express.static(WALLPAPER_DIR));

function loadDB() {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch (e) { return null; }
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function initDB() {
    let db = loadDB();
    if (!db) {
        db = {
            nav_items: [
                { id: 1, name: 'GitHub', url: 'https://github.com', icon: 'fa-brands fa-github', color: '#333', category: '开发', sort_order: 0 },
                { id: 2, name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'fa-brands fa-stack-overflow', color: '#f48024', category: '开发', sort_order: 1 },
                { id: 3, name: '掘金', url: 'https://juejin.cn', icon: 'fa-solid fa-gem', color: '#1e80ff', category: '开发', sort_order: 2 },
                { id: 4, name: 'CSDN', url: 'https://www.csdn.net', icon: 'fa-solid fa-code', color: '#fc5531', category: '开发', sort_order: 3 },
                { id: 5, name: 'npm', url: 'https://www.npmjs.com', icon: 'fa-brands fa-npm', color: '#cb3837', category: '开发', sort_order: 4 },
                { id: 6, name: 'V2EX', url: 'https://www.v2ex.com', icon: 'fa-solid fa-comments', color: '#5a9e6f', category: '开发', sort_order: 5 },
                { id: 7, name: 'Google', url: 'https://www.google.com', icon: 'fa-brands fa-google', color: '#4285f4', category: '常用', sort_order: 6 },
                { id: 8, name: '百度', url: 'https://www.baidu.com', icon: 'fa-solid fa-paw', color: '#2932e1', category: '常用', sort_order: 7 },
                { id: 9, name: '知乎', url: 'https://www.zhihu.com', icon: 'fa-solid fa-book', color: '#0066ff', category: '常用', sort_order: 8 },
                { id: 10, name: 'Twitter', url: 'https://twitter.com', icon: 'fa-brands fa-twitter', color: '#1da1f2', category: '社交', sort_order: 9 },
                { id: 11, name: '微博', url: 'https://weibo.com', icon: 'fa-brands fa-weibo', color: '#e6162d', category: '社交', sort_order: 10 },
                { id: 12, name: 'Telegram', url: 'https://t.me', icon: 'fa-brands fa-telegram', color: '#0088cc', category: '社交', sort_order: 11 },
                { id: 13, name: 'YouTube', url: 'https://www.youtube.com', icon: 'fa-brands fa-youtube', color: '#ff0000', category: '影音', sort_order: 12 },
                { id: 14, name: 'Bilibili', url: 'https://www.bilibili.com', icon: 'fa-brands fa-bilibili', color: '#fb7299', category: '影音', sort_order: 13 },
                { id: 15, name: 'Spotify', url: 'https://open.spotify.com', icon: 'fa-brands fa-spotify', color: '#1db954', category: '影音', sort_order: 14 },
                { id: 16, name: '豆瓣', url: 'https://www.douban.com', icon: 'fa-solid fa-film', color: '#00b51d', category: '影音', sort_order: 15 },
                { id: 17, name: '淘宝', url: 'https://www.taobao.com', icon: 'fa-solid fa-cart-shopping', color: '#ff5000', category: '购物', sort_order: 16 },
                { id: 18, name: '京东', url: 'https://www.jd.com', icon: 'fa-solid fa-dog', color: '#e1251b', category: '购物', sort_order: 17 },
                { id: 19, name: 'Amazon', url: 'https://www.amazon.com', icon: 'fa-brands fa-amazon', color: '#ff9900', category: '购物', sort_order: 18 },
                { id: 20, name: '什么值得买', url: 'https://www.smzdm.com', icon: 'fa-solid fa-tags', color: '#e4393c', category: '购物', sort_order: 19 }
            ],
            engines: [
                { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s', icon: 'fa-brands fa-google', color: '#4285f4', sort_order: 0 },
                { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s', icon: 'fa-solid fa-magnifying-glass', color: '#00809d', sort_order: 1 },
                { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=%s', icon: 'fa-solid fa-paw', color: '#2932e1', sort_order: 2 },
                { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', icon: 'fa-solid fa-duck', color: '#de5833', sort_order: 3 }
            ],
            kv: {
                current_category: '常用',
                current_engine: 'google',
                layout_position: 'center',
                tools_collapsed: true,
                tools_config: [
                    { id: 'clock', name: '时钟', icon: 'fa-solid fa-clock', enabled: true },
                    { id: 'pomodoro', name: '番茄钟', icon: 'fa-solid fa-stopwatch', enabled: true },
                    { id: 'todo', name: '待办清单', icon: 'fa-solid fa-list-check', enabled: true },
                    { id: 'notes', name: '快捷笔记', icon: 'fa-solid fa-pen-to-square', enabled: true },
                    { id: 'random', name: '随机数', icon: 'fa-solid fa-dice', enabled: true },
                    { id: 'counter', name: '字数统计', icon: 'fa-solid fa-font', enabled: true },
                    { id: 'base64', name: 'Base64', icon: 'fa-solid fa-code', enabled: true },
                    { id: 'password', name: '密码生成', icon: 'fa-solid fa-key', enabled: true },
                    { id: 'clipboard', name: '剪贴板', icon: 'fa-solid fa-clipboard', enabled: true },
                    { id: 'timestamp', name: '时间戳转换', icon: 'fa-solid fa-clock-rotate-left', enabled: true },
                    { id: 'json', name: 'JSON 格式化', icon: 'fa-solid fa-code', enabled: true },
                    { id: 'markdown', name: 'Markdown', icon: 'fab fa-markdown', enabled: true },
                    { id: 'regex', name: '正则测试', icon: 'fa-solid fa-asterisk', enabled: true },
                    { id: 'color', name: '颜色工具', icon: 'fa-solid fa-palette', enabled: true },
                    { id: 'diff', name: '文本对比', icon: 'fa-solid fa-code-compare', enabled: true },
                    { id: 'lorem', name: 'Lorem Ipsum', icon: 'fa-solid fa-paragraph', enabled: true }
                ],
                category_order: ['开发', '常用', '社交', '影音', '购物'],
                wallpaper: null,
                wallpaper_history: [],
                todo_list: [],
                quick_note: '',
                clipboard_items: [],
                dns_map: []
            }
        };
        saveDB(db);
    }
    return db;
}

let db = initDB();
const sseClients = new Set();

setInterval(() => {
    for (const res of sseClients) {
        try { res.write(':heartbeat\n\n'); } catch (e) { sseClients.delete(res); }
    }
}, 30000);

function broadcast(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients) { try { res.write(msg); } catch (e) { sseClients.delete(res); } }
}

app.get('/api/sse', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write(':\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
});

// KV
app.get('/api/kv/:key', (req, res) => res.json(db.kv[req.params.key] ?? null));
app.put('/api/kv/:key', (req, res) => { db.kv[req.params.key] = req.body; saveDB(db); broadcast('kv', { key: req.params.key, value: req.body }); res.json({ ok: true }); });

// Nav
app.get('/api/nav', (req, res) => res.json(db.nav_items.sort((a, b) => a.sort_order - b.sort_order)));
app.post('/api/nav', (req, res) => {
    const maxId = db.nav_items.reduce((m, i) => Math.max(m, i.id), 0);
    const maxOrder = db.nav_items.reduce((m, i) => Math.max(m, i.sort_order), -1);
    const item = { id: maxId + 1, sort_order: maxOrder + 1, ...req.body };
    db.nav_items.push(item); saveDB(db); broadcast('nav_change', { action: 'add', item }); res.json(item);
});
app.put('/api/nav/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const idx = db.nav_items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    db.nav_items[idx] = { ...db.nav_items[idx], ...req.body }; saveDB(db);
    broadcast('nav_change', { action: 'update', item: db.nav_items[idx] }); res.json(db.nav_items[idx]);
});
app.delete('/api/nav/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.nav_items = db.nav_items.filter(i => i.id !== id); saveDB(db);
    broadcast('nav_change', { action: 'delete', id }); res.json({ ok: true });
});
app.put('/api/nav-order', (req, res) => {
    const { items } = req.body;
    items.forEach((id, i) => { const item = db.nav_items.find(n => n.id === id); if (item) item.sort_order = i; });
    saveDB(db); broadcast('nav_change', { action: 'reorder' }); res.json({ ok: true });
});

// Engines
app.get('/api/engines', (req, res) => res.json(db.engines.sort((a, b) => a.sort_order - b.sort_order)));
app.post('/api/engines', (req, res) => {
    const maxOrder = db.engines.reduce((m, e) => Math.max(m, e.sort_order), -1);
    const engine = { sort_order: maxOrder + 1, ...req.body };
    if (!engine.id) engine.id = engine.name.toLowerCase().replace(/\s/g, '');
    db.engines.push(engine); saveDB(db); broadcast('engine_change', { action: 'add', engine }); res.json(engine);
});
app.put('/api/engines/:id', (req, res) => {
    const idx = db.engines.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    db.engines[idx] = { ...db.engines[idx], ...req.body }; saveDB(db);
    broadcast('engine_change', { action: 'update', engine: db.engines[idx] }); res.json(db.engines[idx]);
});
app.delete('/api/engines/:id', (req, res) => {
    db.engines = db.engines.filter(e => e.id !== req.params.id); saveDB(db);
    broadcast('engine_change', { action: 'delete', id: req.params.id }); res.json({ ok: true });
});

// === Hitokoto Proxy ===
const https = require('https');
app.get('/api/hitokoto', (req, res) => {
    https.get('https://v1.hitokoto.cn/?c=d&c=h&c=i&c=k', (r) => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => { try { res.json(JSON.parse(data)); } catch (e) { res.json({ hitokoto: '世界上最快乐的事，莫过于为理想而奋斗。', from: '苏格拉底' }); } });
    }).on('error', () => {
        res.json({ hitokoto: '世界上最快乐的事，莫过于为理想而奋斗。', from: '苏格拉底' });
    });
});

// === Favicon Proxy ===
function isPrivateIP(hostname) {
    if (/^127\./.test(hostname) || hostname === 'localhost' || hostname === '::1') return true;
    if (/^10\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
    if (/^0\./.test(hostname) || /^169\.254\./.test(hostname)) return true;
    return false;
}

function fetchUrl(url, opts) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : require('http');
        const reqOpts = { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, ...opts };
        const req = client.get(url, reqOpts, (r) => {
            if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
                r.resume();
                const redir = r.headers.location.startsWith('http') ? r.headers.location : new URL(r.headers.location, url).href;
                fetchUrl(redir, opts).then(resolve).catch(reject);
                return;
            }
            resolve(r);
        });
        req.on('error', reject);
        req.on('timeout', function () { this.destroy(); reject(new Error('timeout')); });
    });
}

function parseIconsFromHTML(html, baseUrl) {
    const icons = [];
    // Match <link> tags with rel="icon" (or similar) regardless of attribute order
    const linkRe = /<link\s[^>]*?rel=["'](?:icon|shortcut icon|apple-touch-icon(?:-precomposed)?)["'][^>]*?>/gi;
    const linkRe2 = /<link\s[^>]*?href=["'][^"']+["'][^>]*?rel=["'](?:icon|shortcut icon|apple-touch-icon(?:-precomposed)?)["'][^>]*?>/gi;
    const ogImageRe = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
    const metaIconRe = /<meta[^>]+name=["']msapplication-TileImage["'][^>]+content=["']([^"']+)["']/gi;
    const seenTags = new Set();
    let m;

    function extractIcon(tag) {
        if (seenTags.has(tag)) return;
        seenTags.add(tag);
        const hrefMatch = tag.match(/href=["']([^"']+)["']/);
        if (!hrefMatch) return;
        let href = hrefMatch[1];
        if (href.startsWith('//')) href = 'https:' + href;
        else if (href.startsWith('/')) href = baseUrl + href;
        else if (!href.startsWith('http')) href = baseUrl + '/' + href;
        const sizeMatch = tag.match(/sizes=["'](\d+)x\1["']/);
        const typeMatch = tag.match(/type=["']([^"']+)["']/);
        const isSvg = (typeMatch && typeMatch[1] === 'image/svg+xml') || href.endsWith('.svg');
        icons.push({ url: href, size: sizeMatch ? parseInt(sizeMatch[1]) : (isSvg ? -1 : 0) });
    }

    while ((m = linkRe.exec(html)) !== null) extractIcon(m[0]);
    while ((m = linkRe2.exec(html)) !== null) extractIcon(m[0]);
    while ((m = ogImageRe.exec(html)) !== null) {
        let url = m[1];
        if (url.startsWith('//')) url = 'https:' + url;
        else if (url.startsWith('/')) url = baseUrl + url;
        else if (!url.startsWith('http')) url = baseUrl + '/' + url;
        icons.push({ url, size: 0 });
    }
    while ((m = metaIconRe.exec(html)) !== null) {
        let url = m[1];
        if (url.startsWith('//')) url = 'https:' + url;
        else if (url.startsWith('/')) url = baseUrl + url;
        else if (!url.startsWith('http')) url = baseUrl + '/' + url;
        icons.push({ url, size: 144 });
    }
    // Prefer PNG/ICO over SVG, larger sizes first
    icons.sort((a, b) => {
        if (a.size === -1 && b.size !== -1) return 1;
        if (a.size !== -1 && b.size === -1) return -1;
        return b.size - a.size;
    });
    return icons;
}

app.get('/api/favicon', (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'missing url' });
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;

    let hostname, baseUrl;
    try {
        const parsed = new URL(targetUrl);
        hostname = parsed.hostname;
        baseUrl = parsed.origin;
    } catch (e) { return res.status(400).json({ error: 'invalid url' }); }

    if (isPrivateIP(hostname)) return res.status(403).json({ error: 'private host not allowed' });

    const dnsMap = db.kv.dns_map || [];
    let resolvedHost = hostname;
    for (const entry of dnsMap) {
        if (hostname === entry.domain) { resolvedHost = entry.ip; break; }
    }

    let responded = false;

    function finish(response, ct) {
        if (responded) { try { response.resume(); } catch(e) {} return; }
        responded = true;
        res.setHeader('Content-Type', ct);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        response.pipe(res);
    }

    function fail() {
        if (responded) return;
        responded = true;
        res.status(404).json({ error: 'not found' });
    }

    function tryImageUrl(url) {
        if (responded) return Promise.resolve();
        return new Promise((resolve) => {
            fetchUrl(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }).then((r) => {
                if (responded) { r.resume(); resolve(); return; }
                if (r.statusCode !== 200) { r.resume(); resolve(); return; }
                const ct = r.headers['content-type'] || '';
                if (ct.includes('image') || ct.includes('icon') || ct.includes('octet')) {
                    finish(r, ct);
                } else { r.resume(); }
                resolve();
            }).catch(() => resolve());
        });
    }

    // Phase 1: try favicon.ico directly
    const directBase = resolvedHost !== hostname
        ? (new URL(targetUrl).port ? `http://${resolvedHost}:${new URL(targetUrl).port}` : `https://${resolvedHost}`)
        : baseUrl;
    const faviconIcoUrl = directBase + '/favicon.ico';

    fetchUrl(faviconIcoUrl).then((r) => {
        if (r.statusCode === 200) {
            const ct = r.headers['content-type'] || '';
            if (ct.includes('image') || ct.includes('icon') || ct.includes('octet')) {
                finish(r, ct);
                return;
            }
        }
        r.resume();

        // Phase 2: fetch HTML and parse icon links
        if (responded) return;
        return fetchUrl(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    }).then((r) => {
        if (responded || !r) return;
        const ct = r.headers['content-type'] || '';
        if (!ct.includes('text/html')) { r.resume(); return tryExternalServices(); }
        let body = '';
        r.on('data', (chunk) => { body += chunk; });
        r.on('end', () => {
            if (responded) return;
            const icons = parseIconsFromHTML(body, baseUrl);
            if (icons.length === 0) { tryExternalServices(); return; }
            let chain = Promise.resolve();
            for (const icon of icons) {
                chain = chain.then(() => tryImageUrl(icon.url));
            }
            chain.then(() => {
                if (!responded) tryExternalServices();
            });
        });
    }).catch(() => {
        if (!responded) tryExternalServices();
    });

    function tryExternalServices() {
        if (responded) return;
        const services = [
            `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
            `https://favicon.im/${hostname}`,
            `https://api.faviconkit.com/${hostname}/64`,
        ];
        let i = 0;
        function tryService() {
            if (responded || i >= services.length) { fail(); return; }
            const url = services[i++];
            fetchUrl(url).then((r) => {
                if (responded) { r.resume(); return; }
                if (r.statusCode !== 200) { r.resume(); tryService(); return; }
                const ct = r.headers['content-type'] || '';
                if (ct.includes('image') || ct.includes('icon') || ct.includes('octet')) {
                    finish(r, ct);
                } else { r.resume(); tryService(); }
            }).catch(() => tryService());
        }
        tryService();
    }
});

// === Wallpaper Upload ===
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

// === Airdrop ===
const MEMORY_LIMIT = 500 * 1024 * 1024;
const CLEANUP_INTERVAL = 60 * 1000;

function getAirdropList() {
    return db.kv.airdrop_files || [];
}

function saveAirdropList(files) {
    db.kv.airdrop_files = files;
    saveDB(db);
}

function cleanupExpired() {
    const files = getAirdropList();
    const now = Date.now();
    const alive = [];
    for (const f of files) {
        if (now > f.expiresAt) {
            try { fs.unlinkSync(f.path); } catch (e) {}
        } else {
            alive.push(f);
        }
    }
    if (alive.length !== files.length) saveAirdropList(alive);
}

setInterval(cleanupExpired, CLEANUP_INTERVAL);
cleanupExpired();

app.get('/api/airdrop', (req, res) => {
    const files = getAirdropList().map(f => ({
        id: f.id, name: f.name, size: f.size, mime: f.mime,
        expiresAt: f.expiresAt, createdAt: f.createdAt,
        downloadUrl: '/api/airdrop/download/' + f.id
    }));
    res.json(files);
});

app.post('/api/airdrop/upload', express.raw({ limit: MEMORY_LIMIT, type: '*/*' }), (req, res) => {
    const name = decodeURIComponent(req.headers['x-file-name'] || 'unnamed');
    const mime = req.headers['x-file-mime'] || 'application/octet-stream';
    const duration = parseInt(req.headers['x-file-duration']) || 3600;
    const id = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(name);
    const filePath = path.join(UPLOAD_DIR, id + ext);
    fs.writeFileSync(filePath, req.body);
    const file = {
        id, name, size: req.body.length, mime,
        path: filePath,
        createdAt: Date.now(),
        expiresAt: Date.now() + duration * 1000
    };
    const files = getAirdropList();
    files.unshift(file);
    saveAirdropList(files);
    broadcast('airdrop_change', { action: 'upload', file: { id, name, size: file.size, mime, expiresAt: file.expiresAt, createdAt: file.createdAt } });
    res.json({ ok: true, id, expiresAt: file.expiresAt });
});

app.get('/api/airdrop/download/:id', (req, res) => {
    const files = getAirdropList();
    const file = files.find(f => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found or expired' });
    if (Date.now() > file.expiresAt) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        db.kv.airdrop_files = files.filter(f => f.id !== req.params.id);
        saveDB(db);
        return res.status(410).json({ error: 'File expired' });
    }
    if (!file.path.startsWith(UPLOAD_DIR)) return res.status(403).json({ error: 'forbidden' });
    res.setHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent(file.name) + '"');
    res.setHeader('Content-Type', file.mime);
    fs.createReadStream(file.path).pipe(res);
});

app.delete('/api/airdrop/:id', (req, res) => {
    let files = getAirdropList();
    const file = files.find(f => f.id === req.params.id);
    if (file) { try { fs.unlinkSync(file.path); } catch (e) {} }
    files = files.filter(f => f.id !== req.params.id);
    saveAirdropList(files);
    broadcast('airdrop_change', { action: 'delete', id: req.params.id });
    res.json({ ok: true });
});

// === Reset ===
app.post('/api/reset', (req, res) => {
    try { fs.unlinkSync(DB_PATH); } catch (e) {}
    db = initDB();
    res.json({ ok: true });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

function startServer(port) {
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`\n  Navigation Page running at:\n`);
        console.log(`  → Local:   http://localhost:${port}`);
        const nets = require('os').networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) { if (net.family === 'IPv4' && !net.internal) console.log(`  → Network: http://${net.address}:${port}`); }
        }
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
}

startServer(PORT);
