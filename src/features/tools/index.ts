import { $ } from '../../dom';

import { initClock } from './clock';
import { initPomodoro } from './pomodoro';
import { initTodo } from './todo';
import { initNotes } from './notes';
import { initRandom } from './random';
import { initCounter } from './counter';
import { initBase64 } from './base64';
import { initPassword } from './password';
import { initClipboard } from './clipboard';
import { initTimestamp } from './timestamp';
import { initJsonFormatter, initExpandedJson } from './json';
import { initMarkdown, initExpandedMarkdown } from './markdown';
import { initRegex, initExpandedRegex } from './regex';
import { initColorTool } from './color';
import { initDiff, initExpandedDiff } from './diff';
import { initLorem } from './lorem';
import { initExpandedNotes } from './notes';

const expanders: Record<string, (container: HTMLElement) => void> = {
    markdown: initExpandedMarkdown,
    diff: initExpandedDiff,
    json: initExpandedJson,
    regex: initExpandedRegex,
    notes: initExpandedNotes
};

export async function initTools(): Promise<void> {
    initClock();
    initPomodoro();
    await initTodo();
    await initNotes();
    initRandom();
    initCounter();
    initBase64();
    initPassword();
    await initClipboard();
    initTimestamp();
    initJsonFormatter();
    initMarkdown();
    initRegex();
    initColorTool();
    initDiff();
    initLorem();
}

export function expandTool(toolId: string): void {
    const overlay = $('#toolOverlay');
    const card = $('#tool-' + toolId);
    if (!overlay || !card) return;
    const toolTitle = card.querySelector('.tool-header span')?.textContent || '';
    const expanded = document.createElement('div');
    expanded.className = 'tool-card-expanded';
    const header = document.createElement('div');
    header.className = 'tool-overlay-header';
    header.innerHTML = `<span class="tool-overlay-title">${toolTitle}</span><button class="tool-overlay-close"><i class="fas fa-times"></i></button>`;
    expanded.appendChild(header);

    const clone = card.querySelector('.tool-body')!.cloneNode(true) as HTMLElement;
    clone.style.flex = '1';
    clone.style.overflow = 'auto';
    expanded.appendChild(clone);

    overlay.innerHTML = '';
    overlay.appendChild(expanded);
    overlay.classList.add('active');

    header.querySelector('.tool-overlay-close')?.addEventListener('click', () => closeOverlay());
    expanders[toolId]?.(clone);
}

export function closeOverlay(): void {
    $('#toolOverlay')?.classList.remove('active');
}
