import { $, escHtml } from '../../dom';

// ===== 工具：文本对比 =====

function runDiff(): void {
    const a = $<HTMLTextAreaElement>('#diffA');
    const b = $<HTMLTextAreaElement>('#diffB');
    const result = $('#diffResult');
    if (!a || !b || !result) return;
    const la = a.value.split('\n');
    const lb = b.value.split('\n');
    const maxLen = Math.max(la.length, lb.length);
    let html = '';
    for (let i = 0; i < maxLen; i++) {
        const lineA = la[i], lineB = lb[i];
        if (lineA === lineB) {
            html += `<span class="diff-same">  ${escHtml(lineA || '')}</span>\n`;
        } else {
            if (lineA !== undefined) html += `<span class="diff-del">- ${escHtml(lineA)}</span>\n`;
            if (lineB !== undefined) html += `<span class="diff-add">+ ${escHtml(lineB)}</span>\n`;
        }
    }
    result.innerHTML = html;
    result.classList.add('active');
}

export function initDiff(): void {
    $('#diffBtn')?.addEventListener('click', () => runDiff());
}

export function initExpandedDiff(container: HTMLElement): void {
    const btn = container.querySelector('#diffBtn') as HTMLElement | null;
    btn?.addEventListener('click', () => {
        const a = document.getElementById('diffA') as HTMLTextAreaElement | null;
        const b = document.getElementById('diffB') as HTMLTextAreaElement | null;
        const expA = container.querySelector('#diffA') as HTMLTextAreaElement | null;
        const expB = container.querySelector('#diffB') as HTMLTextAreaElement | null;
        if (a && expA) a.value = expA.value || '';
        if (b && expB) b.value = expB.value || '';
        runDiff();
        const result = container.querySelector('#diffResult') as HTMLElement | null;
        const srcResult = document.getElementById('diffResult');
        if (result && srcResult) result.innerHTML = srcResult.innerHTML;
    });
    ['diffA', 'diffB'].forEach(id => {
        const src = document.getElementById(id) as HTMLTextAreaElement | null;
        const exp = container.querySelector('#' + id) as HTMLTextAreaElement | null;
        if (src && exp) {
            exp.value = src.value;
            exp.addEventListener('input', () => { src.value = exp.value; });
        }
    });
}
