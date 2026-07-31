import { state, api, registerRemoteHandler } from '../store';
import { $, $$, escHtml } from '../dom';
import type { Engine, DnsEntry } from '../types';
import * as nav from './nav';
import { renderEngines, selectEngine } from './engines';

export function toggleSettings(): void {
    const sp = $('#settingsPanel');
    if (!sp) return;
    sp.classList.toggle('active');
    if (sp.classList.contains('active')) renderSettingsLists();
}

export function closeModal(id: string): void {
    $('#' + id)?.classList.remove('active');
}

export function applyToolsVisibility(): void {
    const config = state.toolsConfig || [];
    config.forEach(tool => {
        const el = $('#tool-' + tool.id);
        if (el) (el as HTMLElement).style.display = tool.enabled ? '' : 'none';
    });
}

// ===== 设置列表（分类 / 网站 / 引擎 / DNS / 工具）=====
export async function renderSettingsLists(): Promise<void> {
    const categoryList = $('#categoryList');
    const order = (await api.getKv('category_order')) || [];
    state.categoryOrder = order;
    const catsFromItems = [...new Set(state.navItems.map(i => i.category || '常用'))];
    const allCats = [...new Set([...order, ...catsFromItems])];
    const categories = allCats.filter(c => order.includes(c)).concat(allCats.filter(c => !order.includes(c)));
    if (categoryList) {
        categoryList.innerHTML = categories.map(cat => {
            const count = state.navItems.filter(i => (i.category || '常用') === cat).length;
            return `<div class="category-row" data-category="${escHtml(cat)}"><span class="drag-handle"><i class="fas fa-grip-vertical"></i></span><div class="category-name">${escHtml(cat)}</div><div class="category-count">${count}</div><div class="item-actions"><button class="edit-item" data-category="${escHtml(cat)}"><i class="fas fa-edit"></i></button><button class="delete-item" data-category="${escHtml(cat)}"><i class="fas fa-trash"></i></button></div></div>`;
        }).join('');
        categoryList.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', () => editCategory((btn as HTMLElement).dataset.category!)));
        categoryList.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', () => deleteCategory((btn as HTMLElement).dataset.category!)));
        bindDragSort(categoryList, '.category-row', '.drag-handle', async (newOrder) => {
            await api.setKv('category_order', newOrder);
            state.categoryOrder = newOrder;
            renderSettingsLists();
            nav.renderCategoryTabs();
        });
    }

    const navList = $('#navItemsList');
    if (navList) {
        navList.innerHTML = state.navItems.map(item => {
            const isImg = item.icon && !item.icon.startsWith('fa-');
            const iconHtml = isImg ? `<img src="${escHtml(item.icon)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : `<i class="${escHtml(item.icon)}"></i>`;
            return `<div class="nav-item-row" data-id="${item.id}"><div class="item-icon" style="background:${escHtml(item.color)};">${iconHtml}</div><div class="item-info"><div class="item-name">${escHtml(item.name)}</div><div class="item-url">${escHtml(item.category || '常用')} · ${escHtml(item.url)}</div></div><div class="item-actions"><button class="edit-item" data-id="${item.id}"><i class="fas fa-edit"></i></button><button class="delete-item" data-id="${item.id}"><i class="fas fa-trash"></i></button></div></div>`;
        }).join('');
        navList.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', () => nav.editNavItem((btn as HTMLElement).dataset.id!)));
        navList.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', () => nav.deleteNavItem((btn as HTMLElement).dataset.id!)));
    }

    const engineList = $('#engineList');
    if (engineList) {
        engineList.innerHTML = state.engines.map(engine =>
            `<div class="engine-row" data-id="${escHtml(engine.id)}"><div class="item-icon" style="background:${escHtml(engine.color)};"><i class="${escHtml(engine.icon)}"></i></div><div class="item-info"><div class="item-name">${escHtml(engine.name)}</div><div class="item-url">${escHtml(engine.url)}</div></div><button class="engine-default ${engine.id === state.currentEngine ? 'is-default' : ''}" data-id="${escHtml(engine.id)}">${engine.id === state.currentEngine ? '默认' : '设为默认'}</button><div class="item-actions"><button class="edit-item" data-id="${escHtml(engine.id)}"><i class="fas fa-edit"></i></button><button class="delete-item" data-id="${escHtml(engine.id)}"><i class="fas fa-trash"></i></button></div></div>`
        ).join('');
        engineList.querySelectorAll('.engine-default').forEach(btn => btn.addEventListener('click', async () => {
            await selectEngine((btn as HTMLElement).dataset.id!);
            renderSettingsLists();
        }));
        engineList.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', () => editEngine((btn as HTMLElement).dataset.id!)));
        engineList.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', () => deleteEngine((btn as HTMLElement).dataset.id!)));
    }

    renderDnsMap();
    renderToolsConfig();
}

function bindDragSort(list: HTMLElement, rowSel: string, handleSel: string, onDrop: (order: string[]) => void): void {
    let dragged: HTMLElement | null = null;
    list.querySelectorAll(rowSel).forEach(row => {
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', (e) => { dragged = row as HTMLElement; row.classList.add('dragging'); (e as DragEvent).dataTransfer!.effectAllowed = 'move'; });
        row.addEventListener('dragover', (e) => { e.preventDefault(); if (row !== dragged) row.classList.add('drag-over'); });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', async (e) => {
            e.preventDefault(); row.classList.remove('drag-over');
            if (dragged && row !== dragged) {
                const items = Array.from(list.querySelectorAll(rowSel)) as HTMLElement[];
                const fi = items.indexOf(dragged), ti = items.indexOf(row as HTMLElement);
                const [m] = items.splice(fi, 1);
                items.splice(ti, 0, m);
                onDrop(items.map(r => r.dataset.category || r.dataset.id!));
            }
        });
        row.addEventListener('dragend', () => { row.classList.remove('dragging'); list.querySelectorAll(rowSel).forEach(r => r.classList.remove('drag-over')); dragged = null; });
    });
}

export async function renderToolsConfig(): Promise<void> {
    const list = $('#toolsConfigList');
    if (!list) return;
    const config = await api.getKv('tools_config') || [];
    state.toolsConfig = config;
    list.innerHTML = config.map(tool =>
        `<div class="tool-config-row" draggable="true" data-id="${escHtml(tool.id)}"><span class="drag-handle"><i class="fas fa-grip-vertical"></i></span><div class="tool-config-icon"><i class="${escHtml(tool.icon)}"></i></div><span class="tool-config-name">${escHtml(tool.name)}</span><button class="toggle-switch ${tool.enabled ? 'active' : ''}" data-id="${escHtml(tool.id)}"></button></div>`
    ).join('');
    list.querySelectorAll('.toggle-switch').forEach(btn => btn.addEventListener('click', async () => {
        const cfg = await api.getKv('tools_config') || [];
        const t = cfg.find((x: any) => x.id === (btn as HTMLElement).dataset.id);
        if (t) { t.enabled = !t.enabled; await api.setKv('tools_config', cfg); btn.classList.toggle('active', t.enabled); applyToolsVisibility(); }
    }));
    bindDragSort(list, '.tool-config-row', '.drag-handle', async (newOrder) => {
        const cfg = await api.getKv('tools_config') || [];
        const reordered = newOrder.map((id, i) => { const t = cfg.find((x: any) => x.id === id); if (t) t.sort_order = i; return t; }).filter(Boolean);
        await api.setKv('tools_config', reordered);
        renderToolsConfig();
    });
}

// ===== 分类 CRUD =====
export function openCategoryModal(cat?: string): void {
    const title = $('#categoryModalTitle'); if (title) title.textContent = cat ? '编辑分类' : '添加分类';
    const idEl = $<HTMLInputElement>('#categoryEditId'); if (idEl) idEl.value = cat || '';
    const nameEl = $<HTMLInputElement>('#categoryEditName'); if (nameEl) nameEl.value = cat || '';
    $('#categoryModal')?.classList.add('active');
}
export function editCategory(cat: string): void { openCategoryModal(cat); }

export async function saveCategory(e: Event): Promise<void> {
    e.preventDefault();
    const oldName = $<HTMLInputElement>('#categoryEditId')!.value;
    const newName = $<HTMLInputElement>('#categoryEditName')!.value.trim();
    if (!newName) return;
    const order = (await api.getKv('category_order')) || [...new Set(state.navItems.map(i => i.category || '常用'))];
    if (oldName) {
        if (oldName !== newName && order.includes(newName)) { alert('分类已存在'); return; }
        for (const item of state.navItems) { if (item.category === oldName) { item.category = newName; await api.saveNavItem(item); } }
        const idx = order.indexOf(oldName); if (idx !== -1) order[idx] = newName;
        if (state.currentCategory === oldName) { state.currentCategory = newName; await api.setKv('current_category', newName); }
    } else {
        if (order.includes(newName)) { alert('分类已存在'); return; }
        order.push(newName);
    }
    await api.setKv('category_order', order);
    state.categoryOrder = order;
    await nav.refreshNav();
    closeModal('categoryModal');
}

export async function deleteCategory(cat: string): Promise<void> {
    const items = state.navItems.filter(i => (i.category || '常用') === cat);
    if (items.length > 0) {
        if (!confirm(`分类"${cat}"下有 ${items.length} 个网站，将移到"常用"，继续？`)) return;
        for (const item of items) { item.category = '常用'; await api.saveNavItem(item); }
    }
    const order = (await api.getKv('category_order')) || [];
    const idx = order.indexOf(cat); if (idx !== -1) order.splice(idx, 1);
    await api.setKv('category_order', order);
    state.categoryOrder = order;
    if (state.currentCategory === cat) { state.currentCategory = '常用'; await api.setKv('current_category', '常用'); }
    await nav.refreshNav();
}

// ===== 引擎 CRUD =====
export function openEngineModal(engine?: Engine): void {
    const title = $('#engineModalTitle'); if (title) title.textContent = engine ? '编辑搜索引擎' : '添加搜索引擎';
    const idEl = $<HTMLInputElement>('#engineEditId'); if (idEl) idEl.value = engine ? engine.id : '';
    const nameEl = $<HTMLInputElement>('#engineEditName'); if (nameEl) nameEl.value = engine ? engine.name : '';
    const urlEl = $<HTMLInputElement>('#engineEditUrl'); if (urlEl) urlEl.value = engine ? engine.url : '';
    const iconEl = $<HTMLInputElement>('#engineEditIcon'); if (iconEl) iconEl.value = engine ? engine.icon : 'fa-solid fa-magnifying-glass';
    const colorEl = $<HTMLInputElement>('#engineEditColor'); if (colorEl) colorEl.value = engine ? engine.color : '#6366f1';
    $('#engineModal')?.classList.add('active');
}
export function editEngine(id: string): void { const e = state.engines.find(x => x.id === id); if (e) openEngineModal(e); }

export async function saveEngine(e: Event): Promise<void> {
    e.preventDefault();
    const id = $<HTMLInputElement>('#engineEditId')!.value;
    const engine = {
        id: id || $<HTMLInputElement>('#engineEditName')!.value.toLowerCase().replace(/\s/g, ''),
        name: $<HTMLInputElement>('#engineEditName')!.value,
        url: $<HTMLInputElement>('#engineEditUrl')!.value,
        icon: $<HTMLInputElement>('#engineEditIcon')!.value || 'fa-solid fa-magnifying-glass',
        color: $<HTMLInputElement>('#engineEditColor')!.value
    };
    if (id) await api.updateEngine(id, engine); else await api.saveEngine(engine);
    await renderEngines();
    await renderSettingsLists();
    closeModal('engineModal');
}

export async function deleteEngine(id: string): Promise<void> {
    if (!confirm('确定删除？')) return;
    await api.deleteEngine(id);
    await renderEngines();
    await renderSettingsLists();
}

// ===== DNS 映射 =====
export function openDnsModal(index?: number): void {
    const isEdit = index !== undefined;
    const title = $('#dnsModalTitle'); if (title) title.textContent = isEdit ? '编辑 DNS 映射' : '添加 DNS 映射';
    const maps: DnsEntry[] = state.dnsMap || [];
    const idEl = $<HTMLInputElement>('#dnsEditIndex'); if (idEl) idEl.value = isEdit ? String(index) : '';
    const domainEl = $<HTMLInputElement>('#dnsEditDomain'); if (domainEl) domainEl.value = isEdit ? maps[index!].domain : '';
    const ipEl = $<HTMLInputElement>('#dnsEditIp'); if (ipEl) ipEl.value = isEdit ? maps[index!].ip : '';
    const noteEl = $<HTMLInputElement>('#dnsEditNote'); if (noteEl) noteEl.value = isEdit ? (maps[index!].note || '') : '';
    $('#dnsModal')?.classList.add('active');
}

export async function saveDnsMap(e: Event): Promise<void> {
    e.preventDefault();
    const index = $<HTMLInputElement>('#dnsEditIndex')!.value;
    const entry: DnsEntry = {
        domain: $<HTMLInputElement>('#dnsEditDomain')!.value.trim(),
        ip: $<HTMLInputElement>('#dnsEditIp')!.value.trim(),
        note: $<HTMLInputElement>('#dnsEditNote')!.value.trim()
    };
    if (!entry.domain || !entry.ip) return;
    const maps = state.dnsMap || [];
    if (index !== '') maps[parseInt(index)] = entry; else maps.push(entry);
    await api.setKv('dns_map', maps);
    state.dnsMap = maps;
    renderDnsMap();
    closeModal('dnsModal');
}

export async function renderDnsMap(): Promise<void> {
    state.dnsMap = await api.getKv('dns_map') || [];
    const list = $('#dnsMapList');
    if (!list) return;
    if (state.dnsMap.length === 0) { list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:12px;opacity:0.4;">暂无映射</div>'; return; }
    list.innerHTML = state.dnsMap.map((m, i) =>
        `<div class="dns-map-row" data-index="${i}"><div class="dns-map-icon"><i class="fas fa-server"></i></div><div class="dns-map-info"><div><span class="dns-map-domain">${escHtml(m.domain)}</span><span class="dns-map-arrow"><i class="fas fa-arrow-right"></i></span><span class="dns-map-ip">${escHtml(m.ip)}</span></div>${m.note ? `<div class="dns-map-note">${escHtml(m.note)}</div>` : ''}</div><div class="item-actions"><button class="edit-item" data-index="${i}"><i class="fas fa-edit"></i></button><button class="delete-item" data-index="${i}"><i class="fas fa-trash"></i></button></div></div>`
    ).join('');
    list.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', () => openDnsModal(parseInt((btn as HTMLElement).dataset.index!))));
    list.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('删除？')) return;
        state.dnsMap.splice(parseInt((btn as HTMLElement).dataset.index!), 1);
        await api.setKv('dns_map', state.dnsMap);
        renderDnsMap();
    }));
}

// ===== 导入 / 导出 / 重置 =====
export async function exportConfig(): Promise<void> {
    const data = { navItems: state.navItems, engines: state.engines, exportTime: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nav-config-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
}

export async function importConfig(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const data = JSON.parse(ev.target!.result as string);
            if (confirm('导入将追加到当前配置？')) {
                if (data.navItems) for (const item of data.navItems) {
                    const { id, sort_order, ...rest } = item;
                    await api.saveNavItem(rest);
                }
                if (data.engines) for (const engine of data.engines) {
                    const { id, sort_order, ...rest } = engine;
                    await api.saveEngine(rest);
                }
                await nav.refreshNav();
                await renderEngines();
                alert('导入成功！');
            }
        } catch (err) { alert('文件格式错误'); }
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = '';
}

export async function resetData(): Promise<void> {
    if (!confirm('确定重置？这将清除所有自定义数据。')) return;
    try {
        await fetch('/api/reset', { method: 'POST' });
        location.reload();
    } catch (e) { alert('重置失败'); }
}

export function initSettings(): void {
    // 设置面板标签切换
    $$('.settings-nav-item').forEach(tab => tab.addEventListener('click', () => {
        $$('.settings-nav-item').forEach(t => t.classList.remove('active'));
        $$('.settings-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.querySelector(`.settings-tab-panel[data-panel="${(tab as HTMLElement).dataset.tab}"]`);
        panel?.classList.add('active');
    }));

    $('#sidebarSettings')?.addEventListener('click', () => toggleSettings());
    $('#closeSettingsBtn')?.addEventListener('click', () => toggleSettings());
    $('#closeSettings')?.addEventListener('click', () => toggleSettings());

    $('#addSiteBtn')?.addEventListener('click', () => nav.openNavModal());
    $('#addNavItem')?.addEventListener('click', () => nav.openNavModal());
    $('#addCategory')?.addEventListener('click', () => openCategoryModal());
    $('#addDnsMap')?.addEventListener('click', () => openDnsModal());
    $('#addEngine')?.addEventListener('click', () => openEngineModal());

    $('#editForm')?.addEventListener('submit', (e) => { nav.saveNavItem(e); });
    $('#engineForm')?.addEventListener('submit', (e) => { saveEngine(e); });
    $('#categoryForm')?.addEventListener('submit', (e) => { saveCategory(e); });
    $('#dnsForm')?.addEventListener('submit', (e) => { saveDnsMap(e); });

    $('#closeModal')?.addEventListener('click', () => closeModal('editModal'));
    $('#cancelEdit')?.addEventListener('click', () => closeModal('editModal'));
    $('#closeEngineModal')?.addEventListener('click', () => closeModal('engineModal'));
    $('#cancelEngineEdit')?.addEventListener('click', () => closeModal('engineModal'));
    $('#closeCategoryModal')?.addEventListener('click', () => closeModal('categoryModal'));
    $('#cancelCategoryEdit')?.addEventListener('click', () => closeModal('categoryModal'));
    $('#closeDnsModal')?.addEventListener('click', () => closeModal('dnsModal'));
    $('#cancelDnsEdit')?.addEventListener('click', () => closeModal('dnsModal'));
    $$('.modal').forEach(modal => modal.addEventListener('click', (e) => { if (e.target === modal) (modal as HTMLElement).classList.remove('active'); }));

    $('#exportBtn')?.addEventListener('click', () => exportConfig());
    $('#importBtn')?.addEventListener('click', () => $<HTMLInputElement>('#fileInput')?.click());
    $('#fileInput')?.addEventListener('change', (e) => importConfig(e));
    $('#resetBtn')?.addEventListener('click', () => resetData());

    $$('.position-btn').forEach(btn => btn.addEventListener('click', () => {
        state.currentPosition = (btn as HTMLElement).dataset.position!;
        api.setKv('layout_position', state.currentPosition);
        nav.applyLayoutPosition();
    }));

    registerRemoteHandler((type, key, data) => {
        if (type === 'kv' && key === 'tools_config') { state.toolsConfig = data; applyToolsVisibility(); renderToolsConfig(); }
    });

    applyToolsVisibility();
}
