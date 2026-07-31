import { Api } from './api';
import type { NavItem, Engine, Todo, Note, ClipboardItem, DnsEntry, AirdropFile, ToolConfig } from './types';

// 全局状态：原 App 对象里的可变字段集中到这里，各功能模块共享
export const api = new Api();

export const state = {
    currentCategory: '常用',
    currentTheme: 'dark',
    currentPosition: 'center',
    accentColor: '#7c8aff',
    navItems: [] as NavItem[],
    engines: [] as Engine[],
    categoryOrder: [] as string[],
    dnsMap: [] as DnsEntry[],
    todos: [] as Todo[],
    notes: [] as Note[],
    currentNoteId: null as number | null,
    clipboardItems: [] as ClipboardItem[],
    airdropFiles: [] as AirdropFile[],
    currentEngine: 'google',
    toolsConfig: [] as ToolConfig[]
};

type RemoteHandler = (type: string, key: string, data: any) => void;
const handlers: RemoteHandler[] = [];

export function registerRemoteHandler(h: RemoteHandler): void {
    handlers.push(h);
}

let evtSource: EventSource | null = null;

export function initSSE(): void {
    if (evtSource) { try { evtSource.close(); } catch (e) {} }
    evtSource = new EventSource('/api/sse');
    evtSource.addEventListener('kv', (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        handlers.forEach(h => h('kv', d.key, d.value));
    });
    evtSource.addEventListener('nav_change', (e) => {
        handlers.forEach(h => h('nav_change', '', JSON.parse((e as MessageEvent).data)));
    });
    evtSource.addEventListener('engine_change', (e) => {
        handlers.forEach(h => h('engine_change', '', JSON.parse((e as MessageEvent).data)));
    });
    evtSource.addEventListener('airdrop_change', (e) => {
        handlers.forEach(h => h('airdrop_change', '', JSON.parse((e as MessageEvent).data)));
    });
    evtSource.onerror = () => {
        evtSource?.close();
        evtSource = null;
        setTimeout(initSSE, 5000);
    };
}

// DNS 映射：把域名替换成内网 IP
export function resolveUrl(url: string): string {
    const map = state.dnsMap || [];
    for (const entry of map) {
        if (url.includes(entry.domain)) return url.replace(entry.domain, entry.ip);
    }
    return url;
}
