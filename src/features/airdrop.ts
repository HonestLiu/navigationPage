import { registerRemoteHandler } from '../store';
import { $, escHtml } from '../dom';
import type { AirDropFile } from '../types';

// ===== Drop模块 =====

let airDropFiles: AirDropFile[] = [];
let airDropTimer: number | null = null;

export function toggleAirDrop(): void {
    const panel = $('#airDropPanel');
    if (!panel) return;
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) refreshAirDrop();
}

async function refreshAirDrop(): Promise<void> {
    try {
        const res = await fetch('/api/airDrop');
        airDropFiles = await res.json();
    } catch (e) { airDropFiles = []; }
    renderAirDropList();
    startAirDropTimer();
}

function startAirDropTimer(): void {
    if (airDropTimer) clearInterval(airDropTimer);
    airDropTimer = window.setInterval(() => {
        const panel = $('#airDropPanel');
        if (!panel || !panel.classList.contains('active')) {
            if (airDropTimer) clearInterval(airDropTimer);
            airDropTimer = null;
            return;
        }
        renderAirDropList();
    }, 1000);
}

function getAirDropIcon(mime: string): { icon: string; cls: string } {
    if (!mime) return { icon: 'fa-file', cls: 'file' };
    if (mime.startsWith('image/')) return { icon: 'fa-image', cls: 'image' };
    if (mime.startsWith('video/')) return { icon: 'fa-video', cls: 'video' };
    if (mime.startsWith('audio/')) return { icon: 'fa-music', cls: 'audio' };
    if (mime.includes('zip') || mime.includes('archive') || mime.includes('compressed')) return { icon: 'fa-file-zipper', cls: 'archive' };
    return { icon: 'fa-file', cls: 'file' };
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatRemaining(expiresAt: number): string {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return '已过期';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function renderAirDropList(): void {
    const list = $('#airDropList');
    if (!list) return;
    const now = Date.now();
    const active = airDropFiles.filter(f => f.expiresAt > now);
    const expired = airDropFiles.filter(f => f.expiresAt <= now);
    const countEl = $('#airDropCount');
    if (countEl) countEl.textContent = String(active.length);

    if (airDropFiles.length === 0) {
        list.innerHTML = '<div class="airDrop-empty"><i class="fas fa-cloud-arrow-up"></i>暂无文件，上传一个试试</div>';
        return;
    }

    let html = '';
    for (const f of active) {
        const { icon, cls } = getAirDropIcon(f.mime);
        const remaining = formatRemaining(f.expiresAt);
        const urgent = (f.expiresAt - now) < 300000;
        html += `<div class="airDrop-item" data-id="${escHtml(f.id)}">
            <div class="airDrop-item-icon ${cls}"><i class="fas ${icon}"></i></div>
            <div class="airDrop-item-info">
                <div class="airDrop-item-name">${escHtml(f.name)}</div>
                <div class="airDrop-item-meta"><span>${formatSize(f.size)}</span></div>
            </div>
            <div class="airDrop-item-timer ${urgent ? 'urgent' : ''}">${remaining}</div>
            <div class="airDrop-item-actions">
                <a class="adl-download" href="${escHtml(f.downloadUrl)}" download="${escHtml(f.name)}" title="下载"><i class="fas fa-download"></i></a>
                <button class="adl-delete" title="删除"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }
    for (const f of expired) {
        const { icon, cls } = getAirDropIcon(f.mime);
        html += `<div class="airDrop-item" style="opacity:0.35;" data-id="${escHtml(f.id)}">
            <div class="airDrop-item-icon ${cls}"><i class="fas ${icon}"></i></div>
            <div class="airDrop-item-info">
                <div class="airDrop-item-name" style="text-decoration:line-through;">${escHtml(f.name)}</div>
                <div class="airDrop-item-meta"><span>已过期</span></div>
            </div>
            <div class="airDrop-item-actions" style="opacity:1;">
                <button class="adl-delete" title="清除"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }

    list.innerHTML = html;
    list.querySelectorAll('.adl-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = ((btn as HTMLElement).closest('.airDrop-item') as HTMLElement).dataset.id!;
            await fetch('/api/airDrop/' + id, { method: 'DELETE' });
            refreshAirDrop();
        });
    });
}

async function uploadAirDropFiles(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const duration = parseInt(($('#airDropDuration') as HTMLInputElement)?.value || '60');
    const progress = $('#airDropProgress');
    const bar = $('#airDropProgressBar');
    const text = $('#airDropProgressText');

    for (const file of files) {
        if (progress) progress.style.display = 'flex';
        if (text) text.textContent = `上传 ${file.name}...`;
        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (ev: ProgressEvent) => {
                if (ev.lengthComputable && bar) {
                    text!.textContent = `上传 ${file.name} (${Math.round(ev.loaded / ev.total * 100)}%)`;
                    bar.style.width = Math.round(ev.loaded / ev.total * 100) + '%';
                }
            });
            xhr.addEventListener('load', () => resolve());
            xhr.addEventListener('error', () => reject());
            xhr.open('POST', '/api/airDrop/upload');
            xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
            xhr.setRequestHeader('X-File-Mime', file.type || 'application/octet-stream');
            xhr.setRequestHeader('X-File-Duration', String(duration));
            xhr.send(file);
        });
    }
    if (progress) progress.style.display = 'none';
    input.value = '';
    refreshAirDrop();
}

export function initAirDrop(): void {
    $('#airDropFab')?.addEventListener('click', () => toggleAirDrop());
    $('#closeAirDrop')?.addEventListener('click', () => toggleAirDrop());

    const uploadArea = $('#airDropUploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => $('#airDropFileInput')?.click());
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('Drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files.length) {
                uploadAirDropFiles({ target: { files: e.dataTransfer.files } } as unknown as Event);
            }
        });
    }
    $('#airDropFileInput')?.addEventListener('change', (e) => uploadAirDropFiles(e));

    registerRemoteHandler((type) => {
        if (type === 'airDrop_change') {
            const panel = $('#airDropPanel');
            if (panel && panel.classList.contains('active')) refreshAirDrop();
        }
    });
}
