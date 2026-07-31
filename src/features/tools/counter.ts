import { $ } from '../../dom';

// ===== 工具：字数统计 =====

function updateCounter(): void {
    const input = $<HTMLTextAreaElement>('#counterInput');
    if (!input) return;
    const t = input.value;
    const chars = $('#counterChars');
    const words = $('#counterWords');
    const lines = $('#counterLines');
    if (chars) chars.textContent = String(t.length);
    if (words) words.textContent = String(t.trim() === '' ? 0 : t.trim().split(/\s+/).length);
    if (lines) lines.textContent = String(t === '' ? 0 : t.split('\n').length);
}

export function initCounter(): void {
    $('#counterInput')?.addEventListener('input', () => updateCounter());
}
