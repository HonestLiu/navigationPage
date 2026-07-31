import { $ } from '../dom';

// ===== 一言模块 =====

let hitokotoTimer: number | null = null;

async function fetchHitokoto(): Promise<void> {
    const t = $('#hitokotoText');
    const f = $('#hitokotoFrom');
    if (!t) return;
    try {
        const r = await fetch('/api/hitokoto', { signal: AbortSignal.timeout(6000) });
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        if (d.hitokoto) {
            t.textContent = d.hitokoto;
            if (f) f.textContent = d.from ? `—— ${d.from}` : '';
            t.classList.remove('hitokoto-loading');
            return;
        }
    } catch (e) { /* ignore */ }
    if (!t.classList.contains('hitokoto-loading')) return;
    t.textContent = '世界上最快乐的事，莫过于为理想而奋斗。';
    if (f) f.textContent = '—— 苏格拉底';
    t.classList.remove('hitokoto-loading');
}

export function initHitokoto(): void {
    $('#hitokotoText')?.classList.add('hitokoto-loading');
    fetchHitokoto();
    if (hitokotoTimer) clearInterval(hitokotoTimer);
    hitokotoTimer = window.setInterval(() => fetchHitokoto(), 120000);
}
