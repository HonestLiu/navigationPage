import { Api, ChromeStore, type Backend } from './api';
import type { NavItem, Engine, Todo, Note, ClipboardItem, DnsEntry, ToolConfig, FrequentVisits } from './types';

// 是否运行在 Chrome 扩展环境（有 chrome.storage 即为扩展）
export const isExtension: boolean =
    typeof (globalThis as any).chrome !== 'undefined' && !!(globalThis as any).chrome.storage;

// 后端按运行环境自动选择：扩展走本地存储，web 走服务端 API
export const api: Backend = isExtension ? new ChromeStore() : new Api();

export const state = {
    currentCategory: '常用',
    currentTheme: 'system',
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
    currentEngine: 'google',
    toolsConfig: [] as ToolConfig[],
    frequentVisits: {} as FrequentVisits,
    // 搜索框回车后：'newtab' 新标签页打开（默认，保留历史行为），'current' 原地跳转
    searchOpenMode: 'newtab' as 'newtab' | 'current',
    // 「常去的网站」总开关（默认开，行为不变；关闭后整段不渲染）
    frequentSitesEnabled: true
};

// 扩展版首次运行（本地存储为空）时，播种与 web 版一致的默认数据
export const DEFAULT_ENGINES: Engine[] = [
    { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s', icon: 'fa-brands fa-google', color: '#4285f4', sort_order: 0 },
    { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s', icon: 'fa-solid fa-magnifying-glass', color: '#00809d', sort_order: 1 },
    { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=%s', icon: 'fa-solid fa-paw', color: '#2932e1', sort_order: 2 },
    { id: 'duckduckgo', name: 'DuckDuckGo', url: 'duckduckgo.com/?q=%s', icon: './DuckDuckGo.svg', color: '#de5833', sort_order: 3 }
];

export const DEFAULT_NAV_ITEMS: NavItem[] = [
    { id: 1, name: 'GitHub', url: 'https://github.com', icon: 'fa-brands fa-github', color: '#333', category: '开发', sort_order: 0 },
    { id: 2, name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'fa-brands fa-stack-overflow', color: '#f48024', category: '开发', sort_order: 1 },
    { id: 3, name: '掘金', url: 'https://juejin.cn', icon: 'fa-solid fa-gem', color: '#1e80ff', category: '开发', sort_order: 2 },
    { id: 4, name: 'CSDN', url: 'https://www.csdn.net', icon: 'fa-solid fa-code', color: '#fc5531', category: '开发', sort_order: 3 },
    { id: 5, name: 'npm', url: 'https://www.npmjs.com', icon: 'fa-brands fa-npm', color: '#cb3837', category: '开发', sort_order: 4 },
    { id: 6, name: 'V2EX', url: 'https://www.v2ex.com', icon: 'fa-solid fa-comments', color: '#5a9e6f', category: '开发', sort_order: 5 },
    { id: 7, name: 'Google', url: 'https://www.google.com', icon: 'fa-brands fa-google', color: '#4285f4', category: '常用', sort_order: 6 },
    { id: 8, name: '百度', url: 'https://www.baidu.com', icon: 'fa-solid fa-paw', color: '#2932e1', category: '常用', sort_order: 7 },
    { id: 9, name: '知乎', url: 'https://www.zhihu.com', icon: 'fa-solid fa-book', color: '#0066ff', category: '常用', sort_order: 8 },
    { id: 10, name: 'Twitter', url: 'https://twitter.com', icon: 'fa-brands fa-twitter', color: '#1da1f2', category: '社交', sort_order: 9 },
    { id: 11, name: '微博', url: 'https://weibo.com', icon: 'fa-brands fa-weibo', color: '#e6162d', category: '社交', sort_order: 10 },
    { id: 12, name: 'Telegram', url: 'https://t.me', icon: 'fa-brands fa-telegram', color: '#0088cc', category: '社交', sort_order: 11 },
    { id: 13, name: 'YouTube', url: 'https://www.youtube.com', icon: 'fa-brands fa-youtube', color: '#ff0000', category: '影音', sort_order: 12 },
    { id: 14, name: 'Bilibili', url: 'https://www.bilibili.com', icon: 'fa-brands fa-bilibili', color: '#fb7299', category: '影音', sort_order: 13 },
    { id: 15, name: 'Spotify', url: 'https://open.spotify.com', icon: 'fa-brands fa-spotify', color: '#1db954', category: '影音', sort_order: 14 },
    { id: 16, name: '豆瓣', url: 'https://www.douban.com', icon: 'fa-solid fa-film', color: '#00b51d', category: '影音', sort_order: 15 },
    { id: 17, name: '淘宝', url: 'https://www.taobao.com', icon: 'fa-solid fa-cart-shopping', color: '#ff5000', category: '购物', sort_order: 16 },
    { id: 18, name: '京东', url: 'https://www.jd.com', icon: 'fa-solid fa-dog', color: '#e1251b', category: '购物', sort_order: 17 },
    { id: 19, name: 'Amazon', url: 'https://www.amazon.com', icon: 'fa-brands fa-amazon', color: '#ff9900', category: '购物', sort_order: 18 },
    { id: 20, name: '什么值得买', url: 'https://www.smzdm.com', icon: 'fa-solid fa-tags', color: '#e4393c', category: '购物', sort_order: 19 }
];

export const DEFAULT_CATEGORY_ORDER = ['开发', '常用', '社交', '影音', '购物'];

type RemoteHandler = (type: string, key: string, data: any) => void;
const handlers: RemoteHandler[] = [];

export function registerRemoteHandler(h: RemoteHandler): void {
    handlers.push(h);
}

// ===== 跨标签页 / 多设备同步 =====
// web 版：服务端 SSE 推送
// 扩展版：chrome.storage.onChanged 事件（本机多标签页实时同步）
function dispatch(type: string, key: string, data: any): void {
    handlers.forEach(h => h(type, key, data));
}

function initSSE(): void {
    const evtSource = new EventSource('/api/sse');
    evtSource.addEventListener('kv', (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        handlers.forEach(h => h('kv', d.key, d.value));
    });
    evtSource.addEventListener('nav_change', (e) => {
        dispatch('nav_change', '', JSON.parse((e as MessageEvent).data));
    });
    evtSource.addEventListener('engine_change', (e) => {
        dispatch('engine_change', '', JSON.parse((e as MessageEvent).data));
    });
    evtSource.onerror = () => {
        evtSource.close();
        setTimeout(initSSE, 5000);
    };
}

function initChromeSync(): void {
    const c = (globalThis as any).chrome;
    if (!c || !c.storage || !c.storage.onChanged) return;
    c.storage.onChanged.addListener((changes: any, area: string) => {
        if (area !== 'local') return;
        for (const key of Object.keys(changes)) {
            const newValue = changes[key] ? changes[key].newValue : null;
            dispatch('kv', key, newValue);
            if (key === 'nav') dispatch('nav_change', '', newValue);
            if (key === 'engines') dispatch('engine_change', '', newValue);
        }
    });
}

export function initSync(): void {
    if (isExtension) initChromeSync();
    else initSSE();
}

// DNS 映射：把域名替换成内网 IP
export function resolveUrl(url: string): string {
    const map = state.dnsMap || [];
    for (const entry of map) {
        if (url.includes(entry.domain)) return url.replace(entry.domain, entry.ip);
    }
    return url;
}
