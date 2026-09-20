import { state, api, registerRemoteHandler } from '../store';
import { $, escHtml } from '../dom';
import type { Engine } from '../types';

function isImageIcon(icon: string): boolean {
    return !!icon && (icon.startsWith('data:image') || /^(https?:)?\/\//i.test(icon) || /\.(svg|png|jpe?g|gif|webp)(\?|$)/i.test(icon));
}

// 引擎图标：Font Awesome 用 <i>，图片/SVG 用 <img>
// withColor 控制是否给 FA 图标施加引擎品牌色（搜索框下拉等无底色场景需要）；
// 在设置列表的彩色磁贴上应传 false，让图标继承磁贴的白色。
export function engineIconHtml(engine: Engine, withColor = true): string {
    if (isImageIcon(engine.icon)) {
        return `<img class="engine-icon-img" src="${escHtml(engine.icon)}" alt="${escHtml(engine.name)}">`;
    }
    const colorStyle = withColor ? ` style="color:${escHtml(engine.color)};"` : '';
    return `<i class="${escHtml(engine.icon)}"${colorStyle}></i>`;
}

export async function renderEngines(): Promise<void> {
    state.currentEngine = await api.getKv('current_engine') || 'google';
    renderEngineDropdown();
}

export function renderEngineDropdown(): void {
    const Dropdown = $('#engineDropdown');
    if (!Dropdown) return;
    const currentEngine = state.engines.find(e => e.id === state.currentEngine);
    if (currentEngine) {
        const icon = $('#engineIcon');
        if (icon) {
            if (isImageIcon(currentEngine.icon)) {
                icon.className = 'engine-icon-img-wrap';
                (icon as HTMLElement).style.cssText = '';
                icon.innerHTML = `<img class="engine-icon-img" src="${escHtml(currentEngine.icon)}" alt="">`;
            } else {
                icon.className = currentEngine.icon;
                (icon as HTMLElement).style.cssText = `font-size:20px;color:${currentEngine.color};`;
                icon.innerHTML = '';
            }
        }
    }
    // 当前选中的引擎「置顶」，其余保持原顺序
    const ordered = [
        ...state.engines.filter(e => e.id === state.currentEngine),
        ...state.engines.filter(e => e.id !== state.currentEngine),
    ];
    Dropdown.innerHTML = ordered.map(engine =>
        `<button class="engine-option ${engine.id === state.currentEngine ? 'selected' : ''}" data-id="${escHtml(engine.id)}">
            ${engineIconHtml(engine)}
            <span>${escHtml(engine.name)}</span>
        </button>`
    ).join('');
    Dropdown.querySelectorAll('.engine-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.id!;
            state.currentEngine = id;
            selectEngine(id);
            Dropdown.classList.remove('active');
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
