import { state, api, registerRemoteHandler, resolveUrl } from '../store';
import { $, $$, escHtml } from '../dom';
import type { NavItem } from '../types';

let selectedIcon = 'fa-solid fa-link';
let contextMenuTargetId: string | null = null;

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
        item.addEventListener('click', (e) => { e.preventDefault(); window.open(resolveUrl((item as HTMLAnchorElement).href), '_blank'); });
        item.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e as MouseEvent, (item as HTMLElement).dataset.id!); });
    });
}

export async function refreshNav(): Promise<void> {
    state.navItems = await api.getNavItems();
    renderCategoryTabs();
    renderNavItems();
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
    const colorEl = $<HTMLInputElement>('#editColor'); if (colorEl) colorEl.value = item ? item.color : '#6366f1';
    const colorHexEl = $('#editColorHex'); if (colorHexEl) colorHexEl.textContent = item ? item.color : '#6366f1';
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
        color: $<HTMLInputElement>('#editColor')!.value,
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
    });
}
