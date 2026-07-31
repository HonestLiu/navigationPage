'use strict';

const fs = require('fs');
const https = require('https');
const { getDb, setDb, saveDB, resetDb, DB_PATH } = require('../db');
const { broadcast } = require('../sse');
const { isPrivateIP, fetchUrl, parseIconsFromHTML } = require('../services/favicon');

module.exports = function registerMisc(app) {
    // === Hitokoto 代理 ===
    app.get('/api/hitokoto', (req, res) => {
        https.get('https://v1.hitokoto.cn/?c=d&c=h&c=i&c=k', (r) => {
            let data = '';
            r.on('data', c => data += c);
            r.on('end', () => {
                try { res.json(JSON.parse(data)); }
                catch (e) { res.json({ hitokoto: '世界上最快乐的事，莫过于为理想而奋斗。', from: '苏格拉底' }); }
            });
        }).on('error', () => {
            res.json({ hitokoto: '世界上最快乐的事，莫过于为理想而奋斗。', from: '苏格拉底' });
        });
    });

    // === Favicon 代理 ===
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

        const dnsMap = getDb().kv.dns_map || [];
        let resolvedHost = hostname;
        for (const entry of dnsMap) {
            if (hostname === entry.domain) { resolvedHost = entry.ip; break; }
        }

        let responded = false;

        function finish(response, ct) {
            if (responded) { try { response.resume(); } catch (e) {} return; }
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
                chain.then(() => { if (!responded) tryExternalServices(); });
            });
        }).catch(() => {
            if (!responded) tryExternalServices();
        });

        function tryExternalServices() {
            if (responded) return;
            const services = [
                `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
                `https://favicon.im/${hostname}`,
                `https://api.faviconkit.com/${hostname}/64`
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

    // === 重置 ===
    app.post('/api/reset', (req, res) => {
        try { fs.unlinkSync(DB_PATH); } catch (e) {}
        const db = resetDb();
        setDb(db);
        res.json({ ok: true });
    });
};
