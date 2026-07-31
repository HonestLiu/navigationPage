import { state, api, registerRemoteHandler } from './store';
import { $, $$ } from './dom';

const darkMq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function resolveTheme(t: string): 'dark' | 'light' {
    if (t === 'system') return darkMq && darkMq.matches ? 'dark' : 'light';
    return t === 'light' ? 'light' : 'dark';
}

export function applyTheme(): void {
    document.documentElement.setAttribute('data-theme', resolveTheme(state.currentTheme));
    document.documentElement.setAttribute('data-theme-source', state.currentTheme === 'system' ? 'system' : 'manual');
    updateThemeButtons();
}

export function updateThemeButtons(): void {
    $$('.theme-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === state.currentTheme));
}

export async function setTheme(theme: string): Promise<void> {
    state.currentTheme = theme;
    await api.setKv('theme', theme);
    applyTheme();
}

export function applyAccentColor(): void {
    const c = state.accentColor;
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    const vars: Record<string, string> = {
        '--accent': c,
        '--accent-dim': `rgba(${r},${g},${b},0.12)`,
        '--accent-glow': `rgba(${r},${g},${b},0.18)`,
        '--accent-03': `rgba(${r},${g},${b},0.03)`,
        '--accent-04': `rgba(${r},${g},${b},0.04)`,
        '--accent-05': `rgba(${r},${g},${b},0.05)`,
        '--accent-06': `rgba(${r},${g},${b},0.06)`,
        '--accent-08': `rgba(${r},${g},${b},0.08)`,
        '--accent-10': `rgba(${r},${g},${b},0.1)`,
        '--accent-15': `rgba(${r},${g},${b},0.15)`,
        '--accent-20': `rgba(${r},${g},${b},0.2)`,
        '--accent-25': `rgba(${r},${g},${b},0.25)`,
        '--accent-30': `rgba(${r},${g},${b},0.3)`,
        '--accent-40': `rgba(${r},${g},${b},0.4)`,
        '--accent-50': `rgba(${r},${g},${b},0.5)`,
        '--accent-70': `rgba(${r},${g},${b},0.7)`,
        '--accent-85': `rgba(${r},${g},${b},0.85)`
    };
    for (const [k, v] of Object.entries(vars)) {
        document.documentElement.style.setProperty(k, v);
    }
    const picker = $<HTMLInputElement>('#accentColorPicker');
    if (picker) picker.value = c;
    updateAccentButtons();
}

export function updateAccentButtons(): void {
    const c = state.accentColor.toLowerCase();
    $$('.accent-btn').forEach(btn => btn.classList.toggle('active', (btn.dataset.color || '').toLowerCase() === c));
}

export async function setAccent(color: string): Promise<void> {
    state.accentColor = color;
    await api.setKv('accent_color', color);
    applyAccentColor();
}

export function initTheme(): void {
    $$('.theme-btn').forEach(btn => btn.addEventListener('click', () => setTheme(btn.dataset.theme || 'dark')));
    $$('.accent-btn').forEach(btn => btn.addEventListener('click', () => setAccent(btn.dataset.color || '#7c8aff')));
    const picker = $<HTMLInputElement>('#accentColorPicker');
    if (picker) picker.addEventListener('input', (e) => setAccent((e.target as HTMLInputElement).value));

    // 跟随系统：OS 主题切换时自动同步（仅当当前为 system）
    if (darkMq && darkMq.addEventListener) {
        darkMq.addEventListener('change', () => { if (state.currentTheme === 'system') applyTheme(); });
    }

    applyTheme();
    applyAccentColor();

    registerRemoteHandler((type, key, data) => {
        if (type === 'kv' && key === 'theme') { state.currentTheme = data; applyTheme(); }
        else if (type === 'kv' && key === 'accent_color') { state.accentColor = data; applyAccentColor(); }
    });
}
