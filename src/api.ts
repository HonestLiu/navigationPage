import type { NavItem, Engine } from './types';

// 数据后端抽象：web 版走服务端 API，Chrome 扩展版走 chrome.storage.local
export interface Backend {
    getKv(key: string): Promise<any>;
    setKv(key: string, value: any): Promise<void>;
    getNavItems(): Promise<NavItem[]>;
    saveNavItem(item: Partial<NavItem> & { id?: number }): Promise<NavItem>;
    deleteNavItem(id: number): Promise<void>;
    reorderNavItems(ids: number[]): Promise<void>;
    getEngines(): Promise<Engine[]>;
    setEngines(engines: Engine[]): Promise<void>;
    saveEngine(engine: Partial<Engine>): Promise<Engine>;
    updateEngine(id: string, engine: Partial<Engine>): Promise<Engine>;
    deleteEngine(id: string): Promise<void>;
    resetAll(): Promise<void>;
}

// ===== Web 后端：远端 API 封装，每个方法对应一个后端接口 =====
export class Api implements Backend {
    async getKv(key: string): Promise<any> {
        const r = await fetch('/api/kv/' + encodeURIComponent(key));
        return r.json();
    }

    async setKv(key: string, value: any): Promise<void> {
        await fetch('/api/kv/' + encodeURIComponent(key), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(value)
        });
    }

    async getNavItems(): Promise<NavItem[]> {
        const r = await fetch('/api/nav');
        return r.json();
    }

    async saveNavItem(item: Partial<NavItem> & { id?: number }): Promise<NavItem> {
        const method = item.id ? 'PUT' : 'POST';
        const url = item.id ? '/api/nav/' + item.id : '/api/nav';
        const r = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        return r.json();
    }

    async deleteNavItem(id: number): Promise<void> {
        await fetch('/api/nav/' + id, { method: 'DELETE' });
    }

    async reorderNavItems(ids: number[]): Promise<void> {
        await fetch('/api/nav-order', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: ids })
        });
    }

    async getEngines(): Promise<Engine[]> {
        const r = await fetch('/api/engines');
        return r.json();
    }

    async setEngines(engines: Engine[]): Promise<void> {
        // web 版无批量写入接口；各引擎的增删改由服务端负责，此处仅作占位
        return;
    }

    async saveEngine(engine: Partial<Engine>): Promise<Engine> {
        const r = await fetch('/api/engines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(engine)
        });
        return r.json();
    }

    async updateEngine(id: string, engine: Partial<Engine>): Promise<Engine> {
        const r = await fetch('/api/engines/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(engine)
        });
        return r.json();
    }

    async deleteEngine(id: string): Promise<void> {
        await fetch('/api/engines/' + id, { method: 'DELETE' });
    }

    async resetAll(): Promise<void> {
        await fetch('/api/reset', { method: 'POST' });
    }
}

// ===== Chrome 扩展后端：本地存储（chrome.storage.local）=====
// 扩展版无服务端，所有数据落在本地；多标签页同步由 chrome.storage.onChanged 负责。
// 启动时一次性把整个 storage 读入内存缓存，后续读取同步返回，避免 init 时几十次异步往返。
export class ChromeStore implements Backend {
    private storage = (globalThis as any).chrome?.storage?.local;
    private cache: Record<string, any> | null = null;
    private cacheReady: Promise<void> | null = null;

    private ensureCache(): Promise<void> {
        if (this.cache) return Promise.resolve();
        if (!this.cacheReady) {
            this.cacheReady = new Promise<void>((resolve) => {
                if (!this.storage) { this.cache = {}; resolve(); return; }
                this.storage.get(null, (o: any) => {
                    this.cache = o || {};
                    // 其他标签页写入时同步更新缓存
                    if (this.storage.onChanged) {
                        this.storage.onChanged.addListener((changes: any, area: string) => {
                            if (area !== 'local' || !this.cache) return;
                            for (const k of Object.keys(changes)) this.cache![k] = changes[k] ? changes[k].newValue : undefined;
                        });
                    }
                    resolve();
                });
            });
        }
        return this.cacheReady;
    }

    private get<T>(key: string, def: T): Promise<T> {
        return this.ensureCache().then(() => (key in this.cache! ? this.cache![key] : def));
    }

    private set(key: string, value: any): Promise<void> {
        return this.ensureCache().then(() => {
            this.cache![key] = value;
            if (!this.storage) return;
            return new Promise<void>((resolve) => this.storage.set({ [key]: value }, () => resolve()));
        });
    }

    async getKv(key: string): Promise<any> {
        return this.get(key, null);
    }

    async setKv(key: string, value: any): Promise<void> {
        await this.set(key, value);
    }

    async getNavItems(): Promise<NavItem[]> {
        return this.get<NavItem[]>('nav', []);
    }

    async saveNavItem(item: Partial<NavItem> & { id?: number }): Promise<NavItem> {
        const items = (await this.getNavItems()).slice();
        let id = item.id;
        if (id == null) id = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
        const full = { ...item, id } as NavItem;
        const idx = items.findIndex(i => i.id === id);
        if (idx >= 0) items[idx] = full; else items.push(full);
        await this.set('nav', items);
        return full;
    }

    async deleteNavItem(id: number): Promise<void> {
        const items = (await this.getNavItems()).filter(i => i.id !== id);
        await this.set('nav', items);
    }

    async reorderNavItems(ids: number[]): Promise<void> {
        const items = await this.getNavItems();
        const map = new Map(items.map(i => [i.id, i]));
        const reordered = ids.map(id => map.get(id)).filter(Boolean) as NavItem[];
        await this.set('nav', reordered);
    }

    async getEngines(): Promise<Engine[]> {
        return this.get<Engine[]>('engines', []);
    }

    async setEngines(engines: Engine[]): Promise<void> {
        await this.set('engines', engines);
    }

    async saveEngine(engine: Partial<Engine>): Promise<Engine> {
        const engines = (await this.getEngines()).slice();
        const full = { ...engine } as Engine;
        const idx = engines.findIndex(e => e.id === engine.id);
        if (idx >= 0) engines[idx] = full; else engines.push(full);
        await this.set('engines', engines);
        return full;
    }

    async updateEngine(id: string, engine: Partial<Engine>): Promise<Engine> {
        return this.saveEngine({ ...engine, id: id as any });
    }

    async deleteEngine(id: string): Promise<void> {
        const engines = (await this.getEngines()).filter(e => e.id !== id);
        await this.set('engines', engines);
    }

    async resetAll(): Promise<void> {
        this.cache = {};
        await new Promise<void>((resolve) => {
            if (!this.storage) return resolve();
            this.storage.clear(() => resolve());
        });
    }
}
