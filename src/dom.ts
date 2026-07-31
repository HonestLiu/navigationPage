export function $<T extends HTMLElement = HTMLElement>(sel: string): T | null {
    return document.querySelector<T>(sel);
}

export function $$<T extends HTMLElement = HTMLElement>(sel: string): T[] {
    return Array.from(document.querySelectorAll<T>(sel));
}

export function escHtml(s: unknown): string {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
