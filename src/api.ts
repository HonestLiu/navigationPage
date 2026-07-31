import type { NavItem, Engine } from './types';

// 远端 API 封装：每个方法对应一个后端接口
export class Api {
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
}
