'use strict';

const https = require('https');
const http = require('http');

// ===== 私网地址防护 =====
function isPrivateIP(hostname) {
    if (/^127\./.test(hostname) || hostname === 'localhost' || hostname === '::1') return true;
    if (/^10\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
    if (/^0\./.test(hostname) || /^169\.254\./.test(hostname)) return true;
    return false;
}

// 带超时与重定向跟随的 GET
function fetchUrl(url, opts) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const reqOpts = {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            ...opts
        };
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

// 从 HTML 中解析图标候选
function parseIconsFromHTML(html, baseUrl) {
    const icons = [];
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

    const normalize = (url) => {
        if (url.startsWith('//')) return 'https:' + url;
        if (url.startsWith('/')) return baseUrl + url;
        if (!url.startsWith('http')) return baseUrl + '/' + url;
        return url;
    };

    while ((m = linkRe.exec(html)) !== null) extractIcon(m[0]);
    while ((m = linkRe2.exec(html)) !== null) extractIcon(m[0]);
    while ((m = ogImageRe.exec(html)) !== null) icons.push({ url: normalize(m[1]), size: 0 });
    while ((m = metaIconRe.exec(html)) !== null) icons.push({ url: normalize(m[1]), size: 144 });

    // 优先 PNG/ICO，大尺寸在前
    icons.sort((a, b) => {
        if (a.size === -1 && b.size !== -1) return 1;
        if (a.size !== -1 && b.size === -1) return -1;
        return b.size - a.size;
    });
    return icons;
}

module.exports = { isPrivateIP, fetchUrl, parseIconsFromHTML };
