import { state, api } from './store';
import { $, $$, escHtml } from './dom';
import * as theme from './theme';
import * as search from './features/search';
import * as engines from './features/engines';
import * as nav from './features/nav';
import * as settings from './features/settings';
import * as wallpaper from './features/wallpaper';
import * as airdrop from './features/airdrop';
import { initHitokoto } from './features/hitokoto';
import { initTools, expandTool, closeOverlay } from './features/tools';
import { initNotesView } from './features/tools/notes';

// 全局视图切换
function switchView(view: string): void {
    $$('.sidebar-btn[data-view]').forEach(btn => btn.classList.toggle('active', (btn as HTMLElement).dataset.view === view));
    $$('.view-panel').forEach(panel => panel.classList.remove('active'));
    const target = $('#view-' + view);
    if (target) target.classList.add('active');
    if (view === 'notes') initNotesView();
}

function bindGlobalEvents(): void {
    document.addEventListener('click', (e) => {
        const t = e.target as HTMLElement;

        // 关闭引擎下拉
        const engineDropdown = $('#engineDropdown');
        if (engineDropdown && !t.closest('#engineBtn')) engineDropdown.classList.remove('active');

        // 面板外部点击关闭
        const sp = $('#settingsPanel');
        if (sp && sp.classList.contains('active') && !sp.contains(t) && !t.closest('#sidebarSettings')) sp.classList.remove('active');
        const wp = $('#wallpaperPanel');
        if (wp && wp.classList.contains('active') && !wp.contains(t) && !t.closest('#wallpaperFab')) wp.classList.remove('active');
        const ap = $('#airdropPanel');
        if (ap && ap.classList.contains('active') && !ap.contains(t) && !t.closest('#airdropFab')) ap.classList.remove('active');

        // 关闭搜索建议
        if (!t.closest('.search-section')) search.closeSuggestions();

        // 侧边栏视图切换
        const sidebarBtn = t.closest('.sidebar-btn[data-view]') as HTMLElement | null;
        if (sidebarBtn) { switchView(sidebarBtn.dataset.view!); return; }

        // 工具展开
        const expandBtn = t.closest('.tool-expand-btn') as HTMLElement | null;
        if (expandBtn) { expandTool(expandBtn.dataset.tool!); return; }

        // 关闭工具展开浮层
        if (t.id === 'toolOverlay') { closeOverlay(); return; }

        // 关闭右键菜单
        if (!t.closest('.context-menu')) nav.hideContextMenu();
    });

    // 右键菜单项
    $('#contextMenu')?.addEventListener('click', (e) => {
        const item = (e.target as HTMLElement).closest('.context-menu-item') as HTMLElement | null;
        if (item) nav.handleContextMenuAction(item.dataset.action!);
    });

    // 编辑颜色实时显示 hex
    $('#editColor')?.addEventListener('input', (e) => {
        const el = $('#editColorHex');
        if (el) el.textContent = (e.target as HTMLInputElement).value;
    });

    // 番茄钟通知授权
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();

    // 模态框点击背景关闭
    $$('.modal').forEach(modal => modal.addEventListener('click', (e) => {
        if (e.target === modal) settings.closeModal(modal.id);
    }));
}

export async function init(): Promise<void> {
    // 加载持久化状态
    state.currentCategory = (await api.getKv('current_category')) || '常用';
    state.currentTheme = (await api.getKv('theme')) || 'dark';
    state.accentColor = (await api.getKv('accent_color')) || '#7c8aff';
    state.currentPosition = (await api.getKv('layout_position')) || 'center';
    state.categoryOrder = (await api.getKv('category_order')) || [];
    state.dnsMap = (await api.getKv('dns_map')) || [];
    state.navItems = await api.getNavItems();
    state.engines = await api.getEngines();
    state.currentEngine = (await api.getKv('current_engine')) || 'google';
    state.toolsConfig = (await api.getKv('tools_config')) || [];
    state.todos = (await api.getKv('todo_list')) || [];
    state.notes = (await api.getKv('quick_notes')) || [];
    state.clipboardItems = (await api.getKv('clipboard_items')) || [];

    // 注册各模块 KV/事件变更处理
    bindGlobalEvents();

    // 初始化各功能模块
    theme.initTheme();
    await engines.renderEngines();
    nav.renderCategoryTabs();
    nav.renderNavItems();
    nav.applyLayoutPosition();
    nav.initNav();
    search.initSearch();
    settings.initSettings();
    settings.applyToolsVisibility();
    wallpaper.initWallpaper();
    airdrop.initAirdrop();
    initHitokoto();
    await initTools();

    // 应用工具区折叠状态
    const collapsed = await api.getKv('tools_collapsed');
    $('#toolsSection')?.classList.toggle('collapsed', !!collapsed);
}
