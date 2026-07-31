import { $ } from '../../dom';

// ===== 工具：时间戳 =====

function tsToDate(): void {
    const input = $<HTMLInputElement>('#tsInput');
    const output = $<HTMLInputElement>('#tsOutput');
    if (!input || !output) return;
    const raw = input.value.trim();
    if (!raw) return;
    let ts = parseInt(raw);
    if (ts > 1e12) ts = Math.floor(ts / 1000);
    const d = new Date(ts * 1000);
    if (isNaN(d.getTime())) { output.value = '无效'; return; }
    const pad = (n: number) => String(n).padStart(2, '0');
    output.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function initTimestamp(): void {
    $('#tsToDate')?.addEventListener('click', () => tsToDate());
    $('#tsNowBtn')?.addEventListener('click', () => {
        const input = $<HTMLInputElement>('#tsInput');
        if (input) { input.value = String(Math.floor(Date.now() / 1000)); tsToDate(); }
    });
    $('#tsCopyBtn')?.addEventListener('click', () => {
        const out = $<HTMLInputElement>('#tsOutput');
        const inp = $<HTMLInputElement>('#tsInput');
        const v = (out?.value || inp?.value) ?? '';
        if (v) navigator.clipboard.writeText(v);
    });
    $('#tsInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') tsToDate(); });
}
