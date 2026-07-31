import { $ } from '../../dom';

// ===== 工具：JSON 格式化 =====

function format(): void {
    const input = $<HTMLTextAreaElement>('#jsonInput');
    const output = $<HTMLTextAreaElement>('#jsonOutput');
    const status = $('#jsonStatus');
    if (!input || !output || !status) return;
    const text = input.value.trim();
    if (!text) return;
    try {
        const obj = JSON.parse(text);
        output.value = JSON.stringify(obj, null, 2);
        status.className = 'json-status valid';
        status.textContent = '✓ 有效的 JSON（' + Object.keys(obj).length + ' 个键）';
    } catch (e) {
        status.className = 'json-status invalid';
        status.textContent = '✗ ' + (e as Error).message;
    }
}

function minify(): void {
    const input = $<HTMLTextAreaElement>('#jsonInput');
    const output = $<HTMLTextAreaElement>('#jsonOutput');
    const status = $('#jsonStatus');
    if (!input || !output || !status) return;
    const text = input.value.trim();
    if (!text) return;
    try {
        output.value = JSON.stringify(JSON.parse(text));
        status.className = 'json-status valid';
        status.textContent = '✓ 已压缩';
    } catch (e) {
        status.className = 'json-status invalid';
        status.textContent = '✗ ' + (e as Error).message;
    }
}

export function initJsonFormatter(): void {
    $('#jsonFormat')?.addEventListener('click', () => format());
    $('#jsonMinify')?.addEventListener('click', () => minify());
    $('#jsonCopy')?.addEventListener('click', () => {
        const v = $<HTMLTextAreaElement>('#jsonOutput')?.value;
        if (v) navigator.clipboard.writeText(v);
    });
}

export function initExpandedJson(container: HTMLElement): void {
    const src = $<HTMLTextAreaElement>('#jsonInput');
    const exp = container.querySelector('#jsonInput') as HTMLTextAreaElement | null;
    if (src && exp) {
        exp.value = src.value;
        exp.addEventListener('input', () => { src.value = exp.value; });
    }
    if (src && !exp) { /* ignore */ }
    const wire = (id: string) => {
        const btn = container.querySelector('#' + id) as HTMLElement | null;
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (id === 'jsonFormat') format();
            else if (id === 'jsonMinify') minify();
            const expOut = container.querySelector('#jsonOutput') as HTMLTextAreaElement | null;
            const srcOut = $<HTMLTextAreaElement>('#jsonOutput');
            if (expOut && srcOut) expOut.value = srcOut.value;
            const status = container.querySelector('#jsonStatus') as HTMLElement | null;
            const srcStatus = $('#jsonStatus');
            if (status && srcStatus) { status.className = srcStatus.className; status.textContent = srcStatus.textContent; }
        });
    };
    wire('jsonFormat');
    wire('jsonMinify');
    const copyBtn = container.querySelector('#jsonCopy') as HTMLElement | null;
    copyBtn?.addEventListener('click', () => {
        const v = (container.querySelector('#jsonOutput') as HTMLTextAreaElement | null)?.value;
        if (v) navigator.clipboard.writeText(v);
    });
}
