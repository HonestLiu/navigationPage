import { $ } from '../../dom';

// ===== 工具：正则测试 =====

function testRegex(): void {
    const pattern = $<HTMLInputElement>('#regexPattern');
    const flags = $<HTMLInputElement>('#regexFlags');
    const text = $<HTMLTextAreaElement>('#regexInput');
    const result = $('#regexResult');
    if (!pattern || !flags || !text || !result) return;
    if (!pattern.value || !text.value) { result.innerHTML = ''; return; }
    try {
        const regex = new RegExp(pattern.value, flags.value);
        const matches = [...text.value.matchAll(new RegExp(pattern.value, flags.value.includes('g') ? flags.value : flags.value + 'g'))];
        if (matches.length === 0) { result.innerHTML = '<span style="opacity:0.4">无匹配</span>'; return; }
        let html = `<span style="opacity:0.5">找到 ${matches.length} 个匹配:</span><br>`;
        matches.forEach((m) => {
            const start = m.index, end = start! + m[0].length;
            html += `<span class="regex-match">${m[0]}</span> <span style="opacity:0.3">[${start}:${end}]</span> `;
        });
        result.innerHTML = html;
    } catch (e) {
        result.innerHTML = '<span style="color:#fca5a5">⚠ ' + (e as Error).message + '</span>';
    }
}

export function initRegex(): void {
    const run = () => testRegex();
    $<HTMLInputElement>('#regexPattern')?.addEventListener('input', run);
    $<HTMLInputElement>('#regexFlags')?.addEventListener('input', run);
    $<HTMLTextAreaElement>('#regexInput')?.addEventListener('input', run);
}

export function initExpandedRegex(container: HTMLElement): void {
    ['regexPattern', 'regexFlags', 'regexInput'].forEach(id => {
        const src = document.getElementById(id) as HTMLInputElement | null;
        const exp = container.querySelector('#' + id) as HTMLInputElement | null;
        if (src && exp) {
            exp.value = src.value;
            exp.addEventListener('input', () => { src.value = exp.value; src.dispatchEvent(new Event('input')); });
        }
    });
}
