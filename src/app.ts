import { state, api } from './store';
import { $, $$, escHtml } from './dom';
import * as theme from './theme';
import * as search from './features/search';
import * as engines from './features/engines';
import * as nav from './features/nav';
import * as settings from './features/settings';
import * as wallpaper from './features/wallpaper';
import * as airDrop from './features/airDrop';
import { initHitokoto } from './features/hitokoto';
import { initTools, expandTool, closeOverlay } from './features/tools';
import { initNotesView } from './features/tools/notes';

// 默认工具配置（首次运行播种，确保设置里工具开关列表非空、主视图工具全部可见）
const DEFAULT_TOOLS = [
  { id: 'clock', name: '时钟', icon: 'fa-solid fa-clock' },
  { id: 'pomodoro', name: '番茄钟', icon: 'fa-solid fa-stopwatch' },
  { id: 'todo', name: '待办清单', icon: 'fa-solid fa-list-check' },
  { id: 'notes', name: '快捷笔记', icon: 'fa-solid fa-pen-to-square' },
  { id: 'random', name: '随机数', icon: 'fa-solid fa-dice' },
  { id: 'counter', name: '字数统计', icon: 'fa-solid fa-font' },
  { id: 'base64', name: 'Base64', icon: 'fa-solid fa-code' },
  { id: 'password', name: '密码生成', icon: 'fa-solid fa-key' },
  { id: 'clipboard', name: '剪贴板', icon: 'fa-solid fa-clipboard' },
  { id: 'timestamp', name: '时间戳转换', icon: 'fa-solid fa-clock-rotate-left' },
  { id: 'json', name: 'JSON 格式化', icon: 'fa-solid fa-brackets-curly' },
  { id: 'markdown', name: 'Markdown 预览', icon: 'fa-brands fa-markdown' },
  { id: 'regex', name: '正则测试', icon: 'fa-solid fa-asterisk' },
  { id: 'color', name: '颜色工具', icon: 'fa-solid fa-palette' },
  { id: 'diff', name: '文本对比', icon: 'fa-solid fa-code-compare' },
  { id: 'lorem', name: 'Lorem Ipsum', icon: 'fa-solid fa-paragraph' },
];

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
        const ap = $('#airDropPanel');
        if (ap && ap.classList.contains('active') && !ap.contains(t) && !t.closest('#airDropFab')) ap.classList.remove('active');

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
    // 首次运行播种默认工具配置（全部启用），避免设置里工具列表为空、主视图工具被隐藏
    if (state.toolsConfig.length === 0) {
        state.toolsConfig = DEFAULT_TOOLS.map((t, i) => ({ ...t, enabled: true, sort_order: i }));
        await api.setKv('tools_config', state.toolsConfig);
    }
    state.todos = (await api.getKv('todo_list')) || [];
    state.notes = (await api.getKv('quick_notes')) || [];
    state.clipboardItems = (await api.getKv('clipboard_items')) || [];

    // 注册各模块 KV/事件变更处理
    bindGlobalEvents();

    // 初始化各功能模块
    theme.initTheme();
    await engines.renderEngines();
    engines.initEngines();
    nav.renderCategoryTabs();
    nav.renderNavItems();
    nav.applyLayoutPosition();
    nav.initNav();
    search.initSearch();
    settings.initSettings();
    settings.applyToolsVisibility();
    wallpaper.initWallpaper();
    airDrop.initAirDrop();
    initHitokoto();
    await initTools();
}
