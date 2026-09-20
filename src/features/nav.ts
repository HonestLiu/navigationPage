import { state, api, registerRemoteHandler, resolveUrl, isExtension } from '../store';
import { $, $$, escHtml } from '../dom';
import type { NavItem, FrequentVisits } from '../types';

let selectedIcon = 'fa-solid fa-link';
let contextMenuTargetId: string | null = null;

// 「常去的网站」：同一导航项在 5 秒内的重复点击只算一次，避免误双击污染排名
const VISIT_COOLDOWN_MS = 5000;
const lastVisitTs = new Map<string, number>();
const FREQUENT_LIMIT = 8;

export function setSelectedIcon(v: string): void { selectedIcon = v; }

// ===== 分类标签 =====
export function renderCategoryTabs(): void {
    const tabs = $('#categoryTabs');
    if (!tabs) return;
    const order = state.categoryOrder || [];
    const catsFromItems = [...new Set(state.navItems.map(i => i.category || '常用'))];
    const allCats = [...new Set([...order, ...catsFromItems])];
    const categories = allCats.filter(c => order.includes(c)).concat(allCats.filter(c => !order.includes(c)));
    tabs.innerHTML = categories.map(cat =>
        `<button class="category-tab ${cat === state.currentCategory ? 'active' : ''}" data-category="${escHtml(cat)}">${escHtml(cat)}</button>`
    ).join('');
    tabs.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            state.currentCategory = (tab as HTMLElement).dataset.category!;
            await api.setKv('current_category', state.currentCategory);
            renderCategoryTabs();
            renderNavItems();
        });
    });
    const title = $('#currentCategoryTitle');
    if (title) title.textContent = state.currentCategory;
}

export function renderNavItems(): void {
    const grid = $('#navGrid');
    if (!grid) return;
    const items = state.navItems.filter(i => (i.category || '常用') === state.currentCategory);
    grid.innerHTML = items.map(item => {
        const isImg = item.icon && !item.icon.startsWith('fa-');
        const iconHtml = isImg
            ? `<img src="${escHtml(item.icon)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
            : `<i class="${escHtml(item.icon)}"></i>`;
        return `<a href="${escHtml(item.url)}" class="nav-item" data-id="${item.id}"><div class="icon" style="background:${escHtml(item.color)};">${iconHtml}</div><span class="name">${escHtml(item.name)}</span></a>`;
    }).join('');
    grid.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const id = (item as HTMLElement).dataset.id!;
            recordVisit(id);
            window.open(resolveUrl((item as HTMLAnchorElement).href), '_blank');
        });
        item.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e as MouseEvent, (item as HTMLElement).dataset.id!); });
    });
}

export async function refreshNav(): Promise<void> {
    state.navItems = await api.getNavItems();
    renderCategoryTabs();
    renderNavItems();
    // 导航项集合变了，常去的网站里引用的图标/名称也要重画
    renderFrequentSites();
}

// ===== 布局位置 =====
export function applyLayoutPosition(): void {
    const c = $('.container');
    if (!c) return;
    c.classList.remove('position-top', 'position-center', 'position-bottom');
    c.classList.add('position-' + state.currentPosition);
    updatePositionButtons();
}
export function updatePositionButtons(): void {
    $$('.position-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.position === state.currentPosition));
}

// ===== 右键菜单 =====
export function showContextMenu(e: MouseEvent, id: string): void {
    contextMenuTargetId = id;
    const menu = $('#contextMenu');
    if (!menu) return;
    menu.classList.add('active');
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
}
export function hideContextMenu(): void {
    const menu = $('#contextMenu');
    if (menu) menu.classList.remove('active');
    contextMenuTargetId = null;
}
export function handleContextMenuAction(action: string): void {
    const id = contextMenuTargetId;
    if (!id) return;
    const item = state.navItems.find(i => i.id == Number(id));
    hideContextMenu();
    if (!item) return;
    if (action === 'edit') editNavItem(id);
    else if (action === 'copy') navigator.clipboard.writeText(item.url);
    else if (action === 'open') window.open(resolveUrl(item.url), '_blank');
    else if (action === 'delete') deleteNavItem(id);
}

// ===== CRUD =====
export function openNavModal(item?: NavItem): void {
    const titleEl = $('#modalTitle'); if (titleEl) titleEl.textContent = item ? '编辑导航项' : '添加导航项';
    const idEl = $<HTMLInputElement>('#editId'); if (idEl) idEl.value = item ? String(item.id) : '';
    const nameEl = $<HTMLInputElement>('#editName'); if (nameEl) nameEl.value = item ? item.name : '';
    const urlEl = $<HTMLInputElement>('#editUrl'); if (urlEl) urlEl.value = item ? item.url : '';
    const colorEl = $<HTMLInputElement>('#editColor');
    const colorHexEl = $('#editColorHex');
    const transparentEl = $<HTMLInputElement>('#editColorTransparent');
    const colorWrap = colorEl?.closest('.color-input-wrap');
    const isTransparent = !!item && (!item.color || item.color === 'transparent' || !/^#[0-9a-fA-F]{6}$/.test(item.color));
    if (transparentEl) transparentEl.checked = isTransparent;
    if (colorEl) {
        const validHex = item && /^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color : '#6366f1';
        try { colorEl.value = validHex; } catch { colorEl.value = '#6366f1'; }
    }
    if (colorHexEl) colorHexEl.textContent = item ? (item.color || 'transparent') : '#6366f1';
    colorWrap?.classList.toggle('is-transparent', isTransparent);
    if (colorEl) colorEl.oninput = () => {
        if (transparentEl) transparentEl.checked = false;
        if (colorHexEl) colorHexEl.textContent = colorEl.value;
        colorWrap?.classList.remove('is-transparent');
    };
    if (transparentEl) transparentEl.onchange = () => {
        const t = transparentEl.checked;
        if (colorHexEl) colorHexEl.textContent = t ? 'transparent' : (colorEl?.value || '#6366f1');
        colorWrap?.classList.toggle('is-transparent', t);
    };
    const sel = $<HTMLSelectElement>('#editCategory');
    const order = state.categoryOrder || [];
    const catsFromItems = [...new Set(state.navItems.map(i => i.category || '常用'))];
    const cats = [...new Set([...order, ...catsFromItems])];
    if (sel) {
        sel.innerHTML = '<option value="" disabled' + (!item ? ' selected' : '') + '>请选择分类</option>' +
            cats.map(c => `<option value="${escHtml(c)}" ${item && item.category === c ? 'selected' : ''}>${escHtml(c)}</option>`).join('');
        if (item) sel.value = item.category;
    }
    selectedIcon = item ? item.icon : 'fa-solid fa-link';
    const area = $('#iconUploadArea');
    const preview = $('#iconPreview');
    const clearBtn = area?.querySelector('.icon-upload-clear');
    if (clearBtn) clearBtn.remove();
    if (item && item.icon && !item.icon.startsWith('fa-')) {
        area?.classList.add('active');
        if (preview) preview.innerHTML = `<img src="${item.icon}">`;
        $$('.icon-option').forEach(o => o.classList.remove('selected'));
        const cb = document.createElement('button');
        cb.className = 'icon-upload-clear';
        cb.innerHTML = '<i class="fas fa-times"></i>';
        cb.addEventListener('click', (ev) => { ev.stopPropagation(); clearIconUpload(); });
        area?.appendChild(cb);
    } else {
        area?.classList.remove('active');
        if (preview) preview.innerHTML = '<i class="fas fa-cloud-arrow-up"></i>';
        $$('.icon-option').forEach(opt => opt.classList.toggle('selected', opt.dataset.icon === selectedIcon));
    }
    $('#editModal')?.classList.add('active');
}

export function editNavItem(id: string): void {
    const item = state.navItems.find(i => i.id == Number(id));
    if (item) openNavModal(item);
}

export async function saveNavItem(e: Event): Promise<void> {
    e.preventDefault();
    const idEl = $<HTMLInputElement>('#editId');
    const id = idEl?.value;
    const item: any = {
        name: $<HTMLInputElement>('#editName')!.value,
        url: $<HTMLInputElement>('#editUrl')!.value,
        icon: selectedIcon,
        color: $<HTMLInputElement>('#editColorTransparent')?.checked ? 'transparent' : $<HTMLInputElement>('#editColor')!.value,
        category: $<HTMLSelectElement>('#editCategory')!.value
    };
    if (id) item.id = parseInt(id);
    await api.saveNavItem(item);
    await refreshNav();
    $('#editModal')?.classList.remove('active');
}

export async function deleteNavItem(id: string): Promise<void> {
    if (!confirm('确定删除？')) return;
    await api.deleteNavItem(parseInt(id));
    await refreshNav();
}

// ===== 图标选择 / 上传 / 抓取 favicon =====
export function handleIconUpload(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) { alert('图片不能超过 200KB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
        selectedIcon = (ev.target as FileReader).result as string;
        const area = $('#iconUploadArea');
        const preview = $('#iconPreview');
        if (preview) preview.innerHTML = `<img src="${selectedIcon}">`;
        area?.classList.add('active');
        $$('.icon-option').forEach(o => o.classList.remove('selected'));
        if (!area?.querySelector('.icon-upload-clear')) {
            const cb = document.createElement('button');
            cb.className = 'icon-upload-clear';
            cb.innerHTML = '<i class="fas fa-times"></i>';
            cb.addEventListener('click', (x) => { x.stopPropagation(); clearIconUpload(); });
            area?.appendChild(cb);
        }
    };
    reader.readAsDataURL(file);
    (e.target as HTMLInputElement).value = '';
}

export function clearIconUpload(): void {
    selectedIcon = 'fa-solid fa-link';
    const area = $('#iconUploadArea');
    area?.classList.remove('active');
    const preview = $('#iconPreview');
    if (preview) preview.innerHTML = '<i class="fas fa-cloud-arrow-up"></i>';
    const cb = area?.querySelector('.icon-upload-clear');
    if (cb) cb.remove();
    const link = document.querySelector('.icon-option[data-icon="fa-solid fa-link"]');
    link?.classList.add('selected');
}

export async function fetchFavicon(): Promise<void> {
    const urlInput = $<HTMLInputElement>('#editUrl');
    const btn = $('#fetchFaviconBtn');
    let url = urlInput?.value.trim() || '';
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    btn?.classList.add('loading');
    $$('.icon-option').forEach(o => o.classList.remove('selected'));
    try {
        if (isExtension) {
            // 扩展版无服务端代理：直接取 Google Favicon 服务的图片地址（img 标签可跨域加载）
            const domain = new URL(url).hostname;
            applyFavicon('https://www.google.com/s2/favicons?domain=' + domain + '&sz=128');
        } else {
            const res = await fetch('/api/favicon?url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(15000) });
            if (res.ok) {
                const blob = await res.blob();
                const dataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                applyFavicon(dataUrl);
            }
        }
    } catch (e) {}
    btn?.classList.remove('loading');
}

function applyFavicon(iconUrl: string): void {
    selectedIcon = iconUrl;
    const area = $('#iconUploadArea');
    const preview = $('#iconPreview');
    area?.classList.add('active');
    if (preview) preview.innerHTML = `<img src="${iconUrl}">`;
    let cb = area?.querySelector('.icon-upload-clear');
    if (!cb) {
        cb = document.createElement('button');
        cb.className = 'icon-upload-clear';
        cb.innerHTML = '<i class="fas fa-times"></i>';
        cb.addEventListener('click', (ev) => { ev.stopPropagation(); clearIconUpload(); });
        area?.appendChild(cb);
    }
}

// ===== 常去的网站 =====
// 插件里 chrome.storage.local.set 是异步的，跨标签页偶发竞态（点完立刻开新标签，会读不到刚写的访问数）。
// 因此插件版额外用 localStorage 做同步兜底，Web 版只用服务端 KV。
const FREQUENT_LOCAL_KEY = 'frequent_visits';

function loadFrequentLocal(): FrequentVisits {
    try {
        const raw = localStorage.getItem(FREQUENT_LOCAL_KEY);
        if (!raw) return {};
        const obj = JSON.parse(raw);
        return (obj && typeof obj === 'object') ? obj as FrequentVisits : {};
    } catch (e) { return {}; }
}

function saveFrequentLocal(visits: FrequentVisits): void {
    try { localStorage.setItem(FREQUENT_LOCAL_KEY, JSON.stringify(visits)); } catch (e) { /* ignore */ }
}

function mergeVisits(a: FrequentVisits, b: FrequentVisits): FrequentVisits {
    // 同一导航项取较大值，避免插件中异步写入和 localStorage 兜底之间互相覆盖丢失访问数
    const out: FrequentVisits = { ...a };
    for (const k of Object.keys(b)) out[k] = Math.max(out[k] || 0, b[k] || 0);
    return out;
}

function navIconHtml(item: NavItem): string {
    const isImg = item.icon && !item.icon.startsWith('fa-');
    return isImg
        ? `<img src="${escHtml(item.icon)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
        : `<i class="${escHtml(item.icon)}"></i>`;
}

export async function recordVisit(itemId: string): Promise<void> {
    if (!itemId) return;
    const now = Date.now();
    const last = lastVisitTs.get(itemId) || 0;
    if (now - last < VISIT_COOLDOWN_MS) return; // 短时间重复点击视为一次
    lastVisitTs.set(itemId, now);

    // 插件版：优先以 localStorage 的旧值作为底（避免和异步 chrome.storage 写入竞态），再 +1
    let visits: FrequentVisits;
    if (isExtension) {
        visits = mergeVisits(loadFrequentLocal(), state.frequentVisits || {});
    } else {
        visits = { ...(state.frequentVisits || {}) };
    }
    visits[itemId] = (visits[itemId] || 0) + 1;
    state.frequentVisits = visits;
    if (isExtension) saveFrequentLocal(visits);
    renderFrequentSites();

    // 持久化失败不影响本次渲染；后续 SSE 同步来时会被覆盖
    try { await api.setKv('frequent_visits', visits); } catch (e) { /* ignore */ }
}

export async function clearFrequentVisits(): Promise<void> {
    if (!confirm('确定清空常去的网站记录？')) return;
    state.frequentVisits = {};
    lastVisitTs.clear();
    if (isExtension) saveFrequentLocal({});
    try { await api.setKv('frequent_visits', {}); } catch (e) { /* ignore */ }
    renderFrequentSites();
}

export function renderFrequentSites(): void {
    const section = $('#frequentSitesSection');
    if (!section) return;
    // 总开关关闭 → 整段不渲染（连 placeholder 都不留）
    if (!state.frequentSitesEnabled) {
        section.innerHTML = '';
        section.classList.remove('active');
        return;
    }
    // 插件版：每次渲染前合并 localStorage 与 state，避免异步 set 漏写导致列表消失
    if (isExtension) {
        state.frequentVisits = mergeVisits(loadFrequentLocal(), state.frequentVisits || {});
    }
    const visits = state.frequentVisits || {};
    // 按访问次数倒序；找不到对应导航项（已被删除）的忽略；最多展示 N 个
    const entries = Object.entries(visits)
        .map(([id, count]) => ({ id, count: count as number, item: state.navItems.find(i => String(i.id) === id) }))
        .filter((e): e is { id: string; count: number; item: NavItem } => !!e.item && e.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, FREQUENT_LIMIT);

    if (entries.length === 0) {
        section.innerHTML = '';
        section.classList.remove('active');
        return;
    }
    section.classList.add('active');
    section.innerHTML =
        `<div class="frequent-header">` +
            `<h3><i class="fas fa-clock-rotate-left"></i> 常去的网站</h3>` +
            `<button class="frequent-clear-btn" id="frequentClearBtn" title="清空记录">` +
                `<i class="fas fa-trash-can"></i><span>清空</span>` +
            `</button>` +
        `</div>` +
        `<div class="frequent-grid">` +
            entries.map(e =>
                `<a href="${escHtml(e.item.url)}" class="frequent-item" data-id="${escHtml(e.id)}" title="已访问 ${e.count} 次">` +
                    `<div class="icon" style="background:${escHtml(e.item.color)};">${navIconHtml(e.item)}</div>` +
                    `<span class="name">${escHtml(e.item.name)}</span>` +
                    `<span class="count-badge">${e.count}</span>` +
                `</a>`
            ).join('') +
        `</div>`;

    section.querySelectorAll('.frequent-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const id = (item as HTMLElement).dataset.id!;
            recordVisit(id);
            window.open(resolveUrl((item as HTMLAnchorElement).href), '_blank');
        });
    });
    section.querySelector('#frequentClearBtn')?.addEventListener('click', () => clearFrequentVisits());
}

export function initNav(): void {
    // 图标选择面板
    const iconPicker = $('#iconPicker');
    if (iconPicker) iconPicker.addEventListener('click', (e) => {
        const option = (e.target as HTMLElement).closest('.icon-option');
        if (option) {
            $$('.icon-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedIcon = (option as HTMLElement).dataset.icon || selectedIcon;
        }
    });
    const iconFileInput = $<HTMLInputElement>('#iconFileInput');
    if (iconFileInput) iconFileInput.addEventListener('change', (e) => handleIconUpload(e));
    const fetchBtn = $('#fetchFaviconBtn');
    if (fetchBtn) fetchBtn.addEventListener('click', () => fetchFavicon());
    const editUrl = $<HTMLInputElement>('#editUrl');
    if (editUrl) editUrl.addEventListener('blur', (e) => {
        const v = (e.target as HTMLInputElement).value;
        if (v && !selectedIcon.startsWith('data:')) fetchFavicon();
    });

    registerRemoteHandler((type, key, data) => {
        if (type === 'nav_change') refreshNav();
        else if (type === 'kv' && key === 'current_category') { state.currentCategory = data; renderCategoryTabs(); renderNavItems(); }
        else if (type === 'kv' && key === 'category_order') { state.categoryOrder = data; renderCategoryTabs(); }
        else if (type === 'kv' && key === 'layout_position') { state.currentPosition = data; applyLayoutPosition(); }
        else if (type === 'kv' && key === 'frequent_visits') { state.frequentVisits = data || {}; renderFrequentSites(); }
    });
}
