import { $ } from '../../dom';

// ===== 工具：时钟 + 时间戳（共享 1s 计时器）=====

export function updateClock(): void {
    const timeEl = $('#clockTime');
    const dateEl = $('#clockDate');
    if (!timeEl || !dateEl) return;
    const n = new Date();
    const h = String(n.getHours()).padStart(2, '0');
    const m = String(n.getMinutes()).padStart(2, '0');
    const s = String(n.getSeconds()).padStart(2, '0');
    timeEl.textContent = `${h}:${m}:${s}`;
    const wd = ['日', '一', '二', '三', '四', '五', '六'];
    dateEl.textContent = `${n.getFullYear()}年${n.getMonth() + 1}月${n.getDate()}日 星期${wd[n.getDay()]}`;
}

export function updateTsNow(): void {
    const el = $('#tsNow');
    if (el) el.textContent = String(Math.floor(Date.now() / 1000));
}

export function initClock(): void {
    updateClock();
    updateTsNow();
    window.setInterval(() => { updateClock(); updateTsNow(); }, 1000);
}
