import { $ } from '../../dom';

// ===== 工具：颜色 =====

function updateColor(hex: string): void {
    const picker = $<HTMLInputElement>('#colorPicker');
    const preview = $('#colorPreview');
    const hexEl = $<HTMLInputElement>('#colorHex');
    const rgb = $<HTMLInputElement>('#colorRgb');
    const hsl = $<HTMLInputElement>('#colorHsl');
    if (!picker || !hexEl) return;
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    picker.value = hex;
    if (preview) preview.style.background = hex;
    hexEl.value = hex;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    if (rgb) rgb.value = `${r}, ${g}, ${b}`;
    const rr = r / 255, gg = g / 255, bb = b / 255;
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
        else if (max === gg) h = ((bb - rr) / d + 2) / 6;
        else h = ((rr - gg) / d + 4) / 6;
    }
    if (hsl) hsl.value = `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
}

export function initColorTool(): void {
    const picker = $<HTMLInputElement>('#colorPicker');
    picker?.addEventListener('input', () => updateColor(picker.value));
    $<HTMLInputElement>('#colorHex')?.addEventListener('change', (e) => {
        const v = (e.target as HTMLInputElement).value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) updateColor(v);
    });
    $('#colorCopy')?.addEventListener('click', () => {
        const hex = $<HTMLInputElement>('#colorHex')?.value;
        if (hex) navigator.clipboard.writeText(hex);
    });
}
