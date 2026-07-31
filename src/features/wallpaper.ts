import { api, registerRemoteHandler } from '../store';
import { $, $$, escHtml } from '../dom';

// ===== 壁纸模块 =====

function detectWallpaperBrightness(url: string): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
            total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        const avg = total / (size * size);
        document.body.classList.toggle('wallpaper-light', avg > 140);
    };
    img.onerror = () => { document.body.classList.remove('wallpaper-light'); };
    img.src = url;
}

async function loadWallpaper(): Promise<void> {
    const wp = await api.getKv('wallpaper');
    if (wp && wp.url) {
        document.body.style.backgroundImage = `url(${wp.url})`;
        document.body.classList.add('wallpaper-active');
        detectWallpaperBrightness(wp.url);
    }
}

async function updateWallpaperPreview(): Promise<void> {
    const wp = await api.getKv('wallpaper');
    const preview = $<HTMLImageElement>('#currentWallpaperPreview');
    if (!preview) return;
    preview.src = (wp && wp.url)
        ? wp.url
        : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect fill="%23667eea" width="400" height="200"/><text fill="white" font-family="Arial" font-size="20" text-anchor="middle" x="200" y="105">默认背景</text></svg>');
}

async function fetchBingWallpaper(idx: number): Promise<void> {
    try {
        const res = await fetch(`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=${idx}&n=1&mkt=zh-CN`);
        const data = await res.json();
        const url = 'https://cn.bing.com' + data.images[0].url.split('&')[0];
        document.body.style.backgroundImage = `url(${url})`;
        document.body.classList.add('wallpaper-active');
        detectWallpaperBrightness(url);
        await api.setKv('wallpaper', { url, timestamp: Date.now() });
        const hist = await api.getKv('wallpaper_history') || [];
        hist.unshift({ url, name: data.images[0].copyright });
        if (hist.length > 12) hist.pop();
        await api.setKv('wallpaper_history', hist);
        await updateWallpaperPreview();
        await renderWallpaperHistory();
    } catch (e) { alert('获取壁纸失败'); }
}

export async function fetchBingWallpaperDefault(): Promise<void> { await fetchBingWallpaper(0); }
export async function fetchRandomBingWallpaper(): Promise<void> { await fetchBingWallpaper(Math.floor(Math.random() * 8)); }

async function uploadWallpaper(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop() || 'jpg';
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const progress = $('#wallpaperProgress');
        if (progress) progress.style.display = 'flex';
        try {
            const res = await fetch('/api/wallpaper/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream', 'X-Wallpaper-Ext': '.' + ext },
                body: new Uint8Array(ev.target!.result as ArrayBuffer)
            });
            const data = await res.json();
            if (data.ok) {
                document.body.style.backgroundImage = `url(${data.url})`;
                document.body.classList.add('wallpaper-active');
                detectWallpaperBrightness(data.url);
                await api.setKv('wallpaper', { url: data.url, timestamp: Date.now() });
                const hist = await api.getKv('wallpaper_history') || [];
                hist.unshift({ url: data.url, name: file.name });
                if (hist.length > 8) {
                    const removed = hist.splice(8);
                    for (const h of removed) {
                        if (h.url && h.url.startsWith('/wallpapers/')) {
                            try { await fetch('/api/wallpaper/delete' + h.url.replace('/wallpapers', ''), { method: 'DELETE' }); } catch (e) {}
                        }
                    }
                }
                await api.setKv('wallpaper_history', hist);
                await updateWallpaperPreview();
                await renderWallpaperHistory();
            }
        } catch (err) { alert('上传失败'); }
        if (progress) progress.style.display = 'none';
    };
    reader.readAsArrayBuffer(file);
    (e.target as HTMLInputElement).value = '';
}

export async function resetWallpaper(): Promise<void> {
    document.body.style.backgroundImage = '';
    document.body.classList.remove('wallpaper-active');
    document.body.classList.remove('wallpaper-light');
    await api.setKv('wallpaper', null);
    await updateWallpaperPreview();
}

async function renderWallpaperHistory(): Promise<void> {
    const hist = await api.getKv('wallpaper_history') || [];
    const cur = await api.getKv('wallpaper');
    const grid = $('.history-grid');
    const historyEl = $('#wallpaperHistory');
    if (!grid) return;
    if (hist.length === 0) { if (historyEl) historyEl.style.display = 'none'; return; }
    if (historyEl) historyEl.style.display = 'block';
    grid.innerHTML = hist.map(item => `<div class="history-item ${cur && cur.url === item.url ? 'active' : ''}" data-url="${escHtml(item.url)}"><img src="${escHtml(item.url)}" alt="${escHtml(item.name || '')}"></div>`).join('');
    grid.querySelectorAll('.history-item').forEach(item => item.addEventListener('click', async () => {
        const url = (item as HTMLElement).dataset.url!;
        document.body.style.backgroundImage = `url(${url})`;
        document.body.classList.add('wallpaper-active');
        detectWallpaperBrightness(url);
        await api.setKv('wallpaper', { url, timestamp: Date.now() });
        await renderWallpaperHistory();
        await updateWallpaperPreview();
    }));
}

export function toggleWallpaperPanel(): void {
    const p = $('#wallpaperPanel');
    if (!p) return;
    p.classList.toggle('active');
    if (p.classList.contains('active')) { updateWallpaperPreview(); renderWallpaperHistory(); }
}

export function initWallpaper(): void {
    loadWallpaper();
    updateWallpaperPreview();
    renderWallpaperHistory();

    $('#wallpaperFab')?.addEventListener('click', () => toggleWallpaperPanel());
    $('#closeWallpaper')?.addEventListener('click', () => toggleWallpaperPanel());
    $('#bingWallpaper')?.addEventListener('click', () => fetchBingWallpaperDefault());
    $('#uploadWallpaper')?.addEventListener('click', () => $('#wallpaperFileInput')?.click());
    $('#wallpaperFileInput')?.addEventListener('change', (e) => uploadWallpaper(e));
    $('#randomBing')?.addEventListener('click', () => fetchRandomBingWallpaper());
    $('#resetWallpaper')?.addEventListener('click', () => resetWallpaper());

    registerRemoteHandler((type, key, data) => {
        if (type === 'kv' && key === 'wallpaper') {
            if (data && data.url) {
                document.body.style.backgroundImage = `url(${data.url})`;
                document.body.classList.add('wallpaper-active');
                detectWallpaperBrightness(data.url);
            } else {
                document.body.style.backgroundImage = '';
                document.body.classList.remove('wallpaper-active');
                document.body.classList.remove('wallpaper-light');
            }
            updateWallpaperPreview();
        } else if (type === 'kv' && key === 'wallpaper_history') {
            renderWallpaperHistory();
        }
    });
}
