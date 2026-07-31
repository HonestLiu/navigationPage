import { state, api, registerRemoteHandler } from '../store';
import { $, escHtml } from '../dom';

export async function renderEngines(): Promise<void> {
    state.currentEngine = await api.getKv('current_engine') || 'google';
    renderEngineDropdown();
}

export function renderEngineDropdown(): void {
    const dropdown = $('#engineDropdown');
    if (!dropdown) return;
    const currentEngine = state.engines.find(e => e.id === state.currentEngine);
    if (currentEngine) {
        const icon = $('#engineIcon');
        if (icon) {
            icon.className = currentEngine.icon;
            (icon as HTMLElement).style.cssText = `font-size:20px;color:${currentEngine.color};`;
        }
    }
    dropdown.innerHTML = state.engines.map(engine =>
        `<button class="engine-option ${engine.id === state.currentEngine ? 'selected' : ''}" data-id="${escHtml(engine.id)}">
            <i class="${escHtml(engine.icon)}" style="color:${escHtml(engine.color)};"></i>
            <span>${escHtml(engine.name)}</span>
        </button>`
    ).join('');
    dropdown.querySelectorAll('.engine-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.id!;
            state.currentEngine = id;
            selectEngine(id);
            dropdown.classList.remove('active');
        });
    });
}

export async function selectEngine(id: string): Promise<void> {
    state.currentEngine = id;
    await api.setKv('current_engine', id);
    renderEngineDropdown();
}

export function initEngines(): void {
    const btn = $('#engineBtn');
    if (btn) btn.addEventListener('click', (e) => {
        e.stopPropagation();
        $('#engineDropdown')?.classList.toggle('active');
    });

    registerRemoteHandler((type, key, data) => {
        if (type === 'kv' && key === 'current_engine') { state.currentEngine = data; renderEngineDropdown(); }
        else if (type === 'engine_change') { renderEngines(); }
    });
}
