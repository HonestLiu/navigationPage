import { $, escHtml } from '../../dom';

// ===== 工具：Markdown =====

function renderMarkdownText(text: string): string {
    if (!text.trim()) return '';
    return '<p>' + text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^---$/gm, '<hr>')
        .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/^\- (.+)$/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, (m) => '<ul>' + m + '</ul>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/\n/g, '<br>') + '</p>';
}

function renderMarkdown(): void {
    const input = $<HTMLTextAreaElement>('#mdInput');
    const preview = $('#mdPreview');
    if (!input || !preview) return;
    const text = input.value;
    if (!text.trim()) { preview.innerHTML = '<p class="md-placeholder">预览区域</p>'; return; }
    preview.innerHTML = renderMarkdownText(text);
}

export function initMarkdown(): void {
    $('#mdInput')?.addEventListener('input', () => renderMarkdown());
}

export function initExpandedMarkdown(container: HTMLElement): void {
    const input = container.querySelector('#mdInput') as HTMLTextAreaElement | null;
    const preview = container.querySelector('#mdPreview') as HTMLElement | null;
    if (!input || !preview) return;
    const srcInput = $<HTMLTextAreaElement>('#mdInput');
    if (srcInput) input.value = srcInput.value;
    const syncPreview = () => {
        if (!input.value.trim()) { preview.innerHTML = '<p class="md-placeholder">预览区域</p>'; return; }
        preview.innerHTML = renderMarkdownText(input.value);
    };
    input.addEventListener('input', () => {
        if (srcInput) { srcInput.value = input.value; srcInput.dispatchEvent(new Event('input')); }
        syncPreview();
    });
    syncPreview();
}
