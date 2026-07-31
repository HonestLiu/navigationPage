import { state } from '../store';
import { $, $$, escHtml } from '../dom';
import { renderEngineDropdown } from './engines';

let suggestionIndex = -1;
let suggestionTimer: any = null;

export function search(): void {
    const input = $<HTMLInputElement>('#searchInput');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    searchWithQuery(val);
}

export function searchWithQuery(query: string): void {
    const engine = state.engines.find(e => e.id === state.currentEngine) || state.engines[0];
    if (engine) window.open(engine.url.replace('%s', encodeURIComponent(query)), '_blank');
    closeSuggestions();
    const input = $<HTMLInputElement>('#searchInput');
    if (input) input.value = query;
}

export async function fetchSuggestions(query: string): Promise<void> {
    clearTimeout(suggestionTimer);
    if (!query || query.trim().length < 1) { closeSuggestions(); return; }
    suggestionTimer = setTimeout(async () => {
        try {
            const engineId = state.currentEngine;
            let suggestions: string[] = [];
            if (engineId === 'google') suggestions = await getGoogleSuggestions(query);
            else if (engineId === 'bing') suggestions = await getBingSuggestions(query);
            else if (engineId === 'baidu') suggestions = await getBaiduSuggestions(query);
            else if (engineId === 'duckduckgo') suggestions = await getDuckDuckGoSuggestions(query);
            if (suggestions.length > 0) renderSuggestions(suggestions, query);
            else closeSuggestions();
        } catch (e) { closeSuggestions(); }
    }, 250);
}

async function getGoogleSuggestions(q: string): Promise<string[]> {
    try { const r = await fetch('https://suggestqueries.google.com/complete/search?client=firefox&q=' + encodeURIComponent(q)); const d = await r.json(); return (d[1] || []).slice(0, 8); } catch (e) { return []; }
}
async function getBingSuggestions(q: string): Promise<string[]> {
    try { const r = await fetch('https://api.bing.com/qsonhs.aspx?q=' + encodeURIComponent(q)); const d = await r.json(); return (d.AS?.Results?.[0]?.Suggests || []).map((s: any) => s.Text).slice(0, 8); } catch (e) { return []; }
}
async function getBaiduSuggestions(q: string): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
        const cb = '_bsug_' + Date.now();
        const script = document.createElement('script');
        (window as any)[cb] = (d: any) => { resolve((d.s || []).slice(0, 8)); delete (window as any)[cb]; script.remove(); };
        script.src = 'https://suggestion.baidu.com/su?action=opensearch&ie=utf-8&wd=' + encodeURIComponent(q) + '&cb=' + cb;
        script.onerror = () => { resolve([]); delete (window as any)[cb]; script.remove(); };
        document.head.appendChild(script);
        setTimeout(() => { resolve([]); delete (window as any)[cb]; script.remove(); }, 3000);
    });
}
async function getDuckDuckGoSuggestions(q: string): Promise<string[]> {
    try { const r = await fetch('https://duckduckgo.com/ac/?q=' + encodeURIComponent(q) + '&type=list'); const d = await r.json(); return (d[1] || []).map((s: any) => s[0]).slice(0, 8); } catch (e) { return []; }
}

export function renderSuggestions(suggestions: string[], query: string): void {
    const box = $('#searchSuggestions');
    if (!box) return;
    suggestionIndex = -1;
    box.innerHTML = suggestions.map((s, i) => {
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const hl = escHtml(s).replace(new RegExp('(' + safeQuery + ')', 'gi'), '<em>$1</em>');
        return `<div class="suggestion-item" data-index="${i}" data-query="${escHtml(s)}"><i class="fas fa-magnifying-glass"></i><span class="suggestion-text">${hl}</span><i class="fas fa-arrow-up-left suggestion-arrow"></i></div>`;
    }).join('');
    box.classList.add('active');
    box.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => searchWithQuery((item as HTMLElement).dataset.query!));
        item.addEventListener('mouseenter', () => {
            box.querySelectorAll('.suggestion-item').forEach(s => s.classList.remove('active'));
            item.classList.add('active');
            suggestionIndex = parseInt((item as HTMLElement).dataset.index!);
        });
    });
}

export function handleSuggestionKeydown(e: KeyboardEvent): void {
    const box = $('#searchSuggestions');
    if (!box || !box.classList.contains('active')) return;
    const items = box.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1); highlightSuggestion(items); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); suggestionIndex = Math.max(suggestionIndex - 1, 0); highlightSuggestion(items); }
    else if (e.key === 'Escape') { closeSuggestions(); }
}

function highlightSuggestion(items: NodeListOf<Element>): void {
    items.forEach((item, i) => {
        item.classList.toggle('active', i === suggestionIndex);
        if (i === suggestionIndex) { const input = $<HTMLInputElement>('#searchInput'); if (input) input.value = (item as HTMLElement).dataset.query!; }
    });
}

export function closeSuggestions(): void {
    const box = $('#searchSuggestions');
    if (box) box.classList.remove('active');
    suggestionIndex = -1;
}

export function initSearch(): void {
    const input = $<HTMLInputElement>('#searchInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const active = $('.suggestion-item.active');
                if (active) searchWithQuery((active as HTMLElement).dataset.query!);
                else search();
            }
        });
        input.addEventListener('input', (e) => fetchSuggestions((e.target as HTMLInputElement).value));
        input.addEventListener('keydown', (e) => handleSuggestionKeydown(e));
        input.addEventListener('focus', () => { const v = input.value.trim(); if (v) fetchSuggestions(v); });
    }
    renderEngineDropdown();
}
