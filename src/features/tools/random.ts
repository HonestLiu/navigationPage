import { $ } from '../../dom';

// ===== 工具：随机数 =====

function generateRandom(): void {
    const minEl = $<HTMLInputElement>('#randomMin');
    const maxEl = $<HTMLInputElement>('#randomMax');
    const display = $('#randomDisplay');
    if (!minEl || !maxEl || !display) return;
    const min = parseInt(minEl.value) || 0;
    const max = parseInt(maxEl.value) || 100;
    const lo = Math.min(min, max), hi = Math.max(min, max);
    display.style.transform = 'scale(1.1)';
    display.textContent = String(Math.floor(Math.random() * (hi - lo + 1)) + lo);
    setTimeout(() => { display.style.transform = 'scale(1)'; }, 150);
}

export function initRandom(): void {
    generateRandom();
    $('#randomBtn')?.addEventListener('click', () => generateRandom());
}
