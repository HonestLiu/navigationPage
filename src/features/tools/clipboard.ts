import { state, api, registerRemoteHandler } from '../../store';
import { $, escHtml } from '../../dom';
import type { ClipboardItem } from '../../types';

// ===== 工具：剪贴板 =====

async function addClipboardItem(): Promise<void> {
    const input = $<HTMLInputElement>('#clipboardInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    state.clipboardItems.unshift({ id: Date.now(), text });
    if (state.clipboardItems.length > 20) state.clipboardItems.pop();
    await api.setKv('clipboard_items', state.clipboardItems);
    input.value = '';
    renderClipboard();
}

function renderClipboard(): void {
    const list = $('#clipboardList');
    const count = $('#clipboardCount');
    if (!list) return;
    if (count) count.textContent = String(state.clipboardItems.length);
    if (state.clipboardItems.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:16px;opacity:0.4;">暂无内容</div>';
        return;
    }
    list.innerHTML = state.clipboardItems.map(item => `<div class="clipboard-item" data-id="${item.id}"><span class="clipboard-item-text">${escHtml(item.text)}</span><div class="clipboard-item-btns"><button class="clip-copy" title="复制"><i class="fas fa-copy"></i></button><button class="clip-delete" title="删除"><i class="fas fa-times"></i></button></div></div>`).join('');
    list.querySelectorAll('.clip-copy').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = (btn as HTMLElement).closest('.clipboard-item')!.querySelector('.clipboard-item-text')!;
        navigator.clipboard.writeText(item.textContent || '');
    }));
    list.querySelectorAll('.clip-delete').forEach(btn => btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(((btn as HTMLElement).closest('.clipboard-item') as HTMLElement).dataset.id!);
        state.clipboardItems = state.clipboardItems.filter(i => i.id !== id);
        await api.setKv('clipboard_items', state.clipboardItems);
        renderClipboard();
    }));
}

export async function initClipboard(): Promise<void> {
    state.clipboardItems = await api.getKv('clipboard_items') || [];
    renderClipboard();
    $('#clipboardAddBtn')?.addEventListener('click', () => addClipboardItem());
    $('#clipboardInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addClipboardItem(); });

    registerRemoteHandler((type, key, data) => {
        if (type === 'kv' && key === 'clipboard_items') { state.clipboardItems = data || []; renderClipboard(); }
    });
}
