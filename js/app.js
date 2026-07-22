const App = {
    currentCategory: '常用',
    currentPosition: 'center',
    selectedIcon: 'fa-solid fa-link',
    navItems: [],
    engines: [],
    _intervals: [],

    _addInterval(fn, ms) { const id = setInterval(fn, ms); this._intervals.push(id); return id; },
    _clearAllIntervals() { this._intervals.forEach(id => clearInterval(id)); this._intervals = []; },

    async init() {
        await Storage.init();
        this.currentCategory = await Storage.get('current_category') || '常用';
        this.currentPosition = await Storage.get('layout_position') || 'center';
        this.navItems = await Storage.getNavItems();
        this.engines = await Storage.getEngines();

        Storage.onChange((type, key, data) => this.handleRemoteChange(type, key, data));

        this.bindEvents();
        this.renderCategoryTabs();
        this.renderNavItems();
        this.renderEngines();
        this.renderEngineDropdown();
        this.applyLayoutPosition();
        this.initClock();
        this.initPomodoro();
        this.initTodo();
        this.initNotes();
        this.initRandom();
        this.initCounter();
        this.initBase64();
        this.initPassword();
        this.initClipboard();
        this.initTimestamp();
        this.initJsonFormatter();
        this.initMarkdown();
        this.initRegex();
        this.initColorTool();
        this.initDiff();
        this.initLorem();
        this.initAirdrop();
        this.initHitokoto();
        this.applyToolsVisibility();

        const tc = await Storage.get('tools_collapsed');
        if (tc !== false) {
            document.getElementById('toolsSection').classList.add('collapsed');
            document.getElementById('toolsArrow').classList.add('collapsed');
        }
    },

    handleRemoteChange(type, key, data) {
        if (type === 'nav_change') {
            this.refreshNav();
        } else if (type === 'engine_change') {
            this.refreshEngines();
        } else if (type === 'airdrop_change') {
            if (document.getElementById('airdropPanel').classList.contains('active')) this.refreshAirdrop();
        } else if (type === 'kv') {
            if (key === 'current_category') { this.currentCategory = data; this.renderCategoryTabs(); this.renderNavItems(); }
            else if (key === 'layout_position') { this.currentPosition = data; this.applyLayoutPosition(); }
            else if (key === 'current_engine') { this.renderEngineDropdown(); }
            else if (key === 'category_order') { this.renderCategoryTabs(); }
            else if (key === 'tools_config') { this.applyToolsVisibility(); this.renderToolsConfig(); }
            else if (key === 'todo_list') { this.todos = data || []; this.renderTodos(); }
            else if (key === 'quick_note') {
                const noteArea = document.getElementById('noteArea');
                if (document.activeElement !== noteArea) { noteArea.value = data || ''; }
            }
            else if (key === 'clipboard_items') { this.clipboardItems = data || []; this.renderClipboard(); }
            else if (key === 'wallpaper') {
                if (data && data.url) {
                    document.body.style.backgroundImage = `url(${data.url})`;
                    document.body.classList.add('wallpaper-active');
                    this._detectWallpaperBrightness(data.url);
                } else {
                    document.body.style.backgroundImage = '';
                    document.body.classList.remove('wallpaper-active');
                    document.body.classList.remove('wallpaper-light');
                }
                this.updateWallpaperPreview();
            }
            else if (key === 'wallpaper_history') { this.renderWallpaperHistory(); }
            else if (key === 'tools_collapsed') {
                const section = document.getElementById('toolsSection');
                const arrow = document.getElementById('toolsArrow');
                section.classList.toggle('collapsed', !!data);
                arrow.classList.toggle('collapsed', !!data);
            }
        }
    },

    async refreshNav() {
        this.navItems = await Storage.getNavItems();
        this.renderCategoryTabs();
        this.renderNavItems();
    },

    async refreshEngines() {
        this.engines = await Storage.getEngines();
        this.renderEngines();
        this.renderEngineDropdown();
    },

    bindEvents() {
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const active = document.querySelector('.suggestion-item.active');
                if (active) this.searchWithQuery(active.dataset.query);
                else this.search();
            }
        });
        document.getElementById('searchInput').addEventListener('input', (e) => this.fetchSuggestions(e.target.value));
        document.getElementById('searchInput').addEventListener('keydown', (e) => this.handleSuggestionKeydown(e));
        document.getElementById('searchInput').addEventListener('focus', () => {
            const val = document.getElementById('searchInput').value.trim();
            if (val) this.fetchSuggestions(val);
        });
        document.getElementById('searchBtn').addEventListener('click', () => this.search());

        document.getElementById('engineBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('engineDropdown').classList.toggle('active');
        });

        document.getElementById('airdropFab').addEventListener('click', () => this.toggleAirdrop());
        document.getElementById('closeAirdrop').addEventListener('click', () => this.toggleAirdrop());

        document.getElementById('airdropUploadArea').addEventListener('click', () => document.getElementById('airdropFileInput').click());
        document.getElementById('airdropFileInput').addEventListener('change', (e) => this.uploadAirdropFiles(e));

        const uploadArea = document.getElementById('airdropUploadArea');
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault(); uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) this.uploadAirdropFiles({ target: { files: e.dataTransfer.files } });
        });

        document.addEventListener('click', (e) => {
            document.getElementById('engineDropdown').classList.remove('active');
            const sp = document.getElementById('settingsPanel');
            if (sp.classList.contains('active') && !sp.contains(e.target) && !e.target.closest('#settingsFab'))
                sp.classList.remove('active');
            const wp = document.getElementById('wallpaperPanel');
            if (wp.classList.contains('active') && !wp.contains(e.target) && !e.target.closest('#wallpaperFab'))
                wp.classList.remove('active');
            const ap = document.getElementById('airdropPanel');
            if (ap.classList.contains('active') && !ap.contains(e.target) && !e.target.closest('#airdropFab'))
                ap.classList.remove('active');
            if (!e.target.closest('.search-section')) this.closeSuggestions();
        });

        document.getElementById('settingsFab').addEventListener('click', () => this.toggleSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.toggleSettings());
        document.getElementById('addSiteBtn').addEventListener('click', () => this.openNavModal());
        document.getElementById('addNavItem').addEventListener('click', () => this.openNavModal());
        document.getElementById('addCategory').addEventListener('click', () => this.openCategoryModal());
        document.getElementById('addDnsMap').addEventListener('click', () => this.openDnsModal());
        document.getElementById('addEngine').addEventListener('click', () => this.openEngineModal());

        document.getElementById('editForm').addEventListener('submit', (e) => this.saveNavItem(e));
        document.getElementById('engineForm').addEventListener('submit', (e) => this.saveEngine(e));
        document.getElementById('categoryForm').addEventListener('submit', (e) => this.saveCategory(e));
        document.getElementById('dnsForm').addEventListener('submit', (e) => this.saveDnsMap(e));

        document.getElementById('closeModal').addEventListener('click', () => this.closeModal('editModal'));
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeModal('editModal'));
        document.getElementById('closeEngineModal').addEventListener('click', () => this.closeModal('engineModal'));
        document.getElementById('cancelEngineEdit').addEventListener('click', () => this.closeModal('engineModal'));
        document.getElementById('closeCategoryModal').addEventListener('click', () => this.closeModal('categoryModal'));
        document.getElementById('cancelCategoryEdit').addEventListener('click', () => this.closeModal('categoryModal'));
        document.getElementById('closeDnsModal').addEventListener('click', () => this.closeModal('dnsModal'));
        document.getElementById('cancelDnsEdit').addEventListener('click', () => this.closeModal('dnsModal'));

        document.getElementById('exportBtn').addEventListener('click', () => this.exportConfig());
        document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('fileInput').addEventListener('change', (e) => this.importConfig(e));
        document.getElementById('resetBtn').addEventListener('click', () => this.resetData());

        document.getElementById('wallpaperFab').addEventListener('click', () => this.toggleWallpaperPanel());
        document.getElementById('closeWallpaper').addEventListener('click', () => this.toggleWallpaperPanel());
        document.getElementById('bingWallpaper').addEventListener('click', () => this.fetchBingWallpaper());
        document.getElementById('uploadWallpaper').addEventListener('click', () => document.getElementById('wallpaperFileInput').click());
        document.getElementById('wallpaperFileInput').addEventListener('change', (e) => this.uploadWallpaper(e));
        document.getElementById('randomBing').addEventListener('click', () => this.fetchRandomBingWallpaper());
        document.getElementById('resetWallpaper').addEventListener('click', () => this.resetWallpaper());

        document.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPosition = btn.dataset.position;
                Storage.set('layout_position', this.currentPosition);
                this.applyLayoutPosition();
                this.updatePositionButtons();
            });
        });

        document.getElementById('toolsToggle').addEventListener('click', () => this.toggleTools());

        document.getElementById('iconPicker').addEventListener('click', (e) => {
            const option = e.target.closest('.icon-option');
            if (option) {
                document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedIcon = option.dataset.icon;
            }
        });

        document.getElementById('iconUploadArea').addEventListener('click', () => document.getElementById('iconFileInput').click());
        document.getElementById('iconFileInput').addEventListener('change', (e) => this.handleIconUpload(e));
        document.getElementById('editColor').addEventListener('input', (e) => {
            document.getElementById('editColorHex').textContent = e.target.value;
        });

        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(modal.id); });
        });

        this.initWallpaper();
    },

    // === Search ===
    search() {
        const input = document.getElementById('searchInput').value.trim();
        if (!input) return;
        this.searchWithQuery(input);
    },

    searchWithQuery(query) {
        const engine = this.engines.find(e => e.id === (this._cache_current_engine || 'google'));
        if (engine) window.open(engine.url.replace('%s', encodeURIComponent(query)), '_blank');
        this.closeSuggestions();
        document.getElementById('searchInput').value = query;
    },

    async selectEngine(id) {
        await Storage.set('current_engine', id);
        this.renderEngineDropdown();
    },

    renderEngineDropdown() {
        const dropdown = document.getElementById('engineDropdown');
        const currentId = this._cache_current_engine || 'google';
        const currentEngine = this.engines.find(e => e.id === currentId);
        if (currentEngine) {
            const icon = document.getElementById('engineIcon');
            icon.className = currentEngine.icon;
            icon.style.cssText = `font-size:20px;color:${currentEngine.color};`;
        }
        dropdown.innerHTML = this.engines.map(engine => `
            <button class="engine-option ${engine.id === currentId ? 'selected' : ''}" data-id="${engine.id}">
                <i class="${engine.icon}" style="color: ${engine.color};"></i>
                <span>${engine.name}</span>
            </button>
        `).join('');
        dropdown.querySelectorAll('.engine-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._cache_current_engine = btn.dataset.id;
                this.selectEngine(btn.dataset.id);
                dropdown.classList.remove('active');
            });
        });
    },

    async renderEngines() {
        this._cache_current_engine = await Storage.get('current_engine') || 'google';
        this.renderEngineDropdown();
    },

    // === Suggestions ===
    suggestionIndex: -1,
    suggestionTimer: null,

    async fetchSuggestions(query) {
        clearTimeout(this.suggestionTimer);
        if (!query || query.trim().length < 1) { this.closeSuggestions(); return; }
        this.suggestionTimer = setTimeout(async () => {
            try {
                const engineId = this._cache_current_engine || 'google';
                let suggestions = [];
                if (engineId === 'google') suggestions = await this.getGoogleSuggestions(query);
                else if (engineId === 'bing') suggestions = await this.getBingSuggestions(query);
                else if (engineId === 'baidu') suggestions = await this.getBaiduSuggestions(query);
                else if (engineId === 'duckduckgo') suggestions = await this.getDuckDuckGoSuggestions(query);
                if (suggestions.length > 0) this.renderSuggestions(suggestions, query);
                else this.closeSuggestions();
            } catch (e) { this.closeSuggestions(); }
        }, 250);
    },

    async getGoogleSuggestions(q) { try { const r = await fetch('https://suggestqueries.google.com/complete/search?client=firefox&q=' + encodeURIComponent(q)); const d = await r.json(); return (d[1]||[]).slice(0,8); } catch(e) { return []; } },
    async getBingSuggestions(q) { try { const r = await fetch('https://api.bing.com/qsonhs.aspx?q=' + encodeURIComponent(q)); const d = await r.json(); return (d.AS?.Results?.[0]?.Suggests||[]).map(s=>s.Text).slice(0,8); } catch(e) { return []; } },
    async getBaiduSuggestions(q) { return new Promise((resolve) => { const cb = '_bsug_'+Date.now(); window[cb]=(d)=>{resolve((d.s||[]).slice(0,8));delete window[cb];script.remove();}; const script=document.createElement('script'); script.src='https://suggestion.baidu.com/su?action=opensearch&ie=utf-8&wd='+encodeURIComponent(q)+'&cb='+cb; script.onerror=()=>{resolve([]);delete window[cb];script.remove();}; document.head.appendChild(script); setTimeout(()=>{resolve([]);delete window[cb];script.remove();},3000); }); },
    async getDuckDuckGoSuggestions(q) { try { const r = await fetch('https://duckduckgo.com/ac/?q='+encodeURIComponent(q)+'&type=list'); const d = await r.json(); return (d[1]||[]).map(s=>s[0]).slice(0,8); } catch(e) { return []; } },

    renderSuggestions(suggestions, query) {
        const box = document.getElementById('searchSuggestions');
        this.suggestionIndex = -1;
        box.innerHTML = suggestions.map((s, i) => {
            const hl = s.replace(new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<em>$1</em>');
            return `<div class="suggestion-item" data-index="${i}" data-query="${s}"><i class="fas fa-magnifying-glass"></i><span class="suggestion-text">${hl}</span><i class="fas fa-arrow-up-left suggestion-arrow"></i></div>`;
        }).join('');
        box.classList.add('active');
        box.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => this.searchWithQuery(item.dataset.query));
            item.addEventListener('mouseenter', () => {
                box.querySelectorAll('.suggestion-item').forEach(s => s.classList.remove('active'));
                item.classList.add('active');
                this.suggestionIndex = parseInt(item.dataset.index);
            });
        });
    },

    handleSuggestionKeydown(e) {
        const box = document.getElementById('searchSuggestions');
        if (!box.classList.contains('active')) return;
        const items = box.querySelectorAll('.suggestion-item');
        if (items.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); this.suggestionIndex = Math.min(this.suggestionIndex + 1, items.length - 1); this.highlightSuggestion(items); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); this.suggestionIndex = Math.max(this.suggestionIndex - 1, 0); this.highlightSuggestion(items); }
        else if (e.key === 'Escape') { this.closeSuggestions(); }
    },

    highlightSuggestion(items) {
        items.forEach((item, i) => {
            item.classList.toggle('active', i === this.suggestionIndex);
            if (i === this.suggestionIndex) document.getElementById('searchInput').value = item.dataset.query;
        });
    },

    closeSuggestions() { document.getElementById('searchSuggestions').classList.remove('active'); this.suggestionIndex = -1; },

    // === Categories ===
    renderCategoryTabs() {
        const tabs = document.getElementById('categoryTabs');
        const order = this._cache_category_order || [];
        const catsFromItems = [...new Set(this.navItems.map(item => item.category || '常用'))];
        const allCats = [...new Set([...order, ...catsFromItems])];
        const categories = allCats.filter(c => order.includes(c)).concat(allCats.filter(c => !order.includes(c)));

        tabs.innerHTML = categories.map(cat => `<button class="category-tab ${cat === this.currentCategory ? 'active' : ''}" data-category="${cat}">${cat}</button>`).join('');
        tabs.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                this.currentCategory = tab.dataset.category;
                await Storage.set('current_category', this.currentCategory);
                this.renderCategoryTabs();
                this.renderNavItems();
            });
        });
        document.getElementById('currentCategoryTitle').textContent = this.currentCategory;
    },

    renderNavItems() {
        const grid = document.getElementById('navGrid');
        const items = this.navItems.filter(item => (item.category || '常用') === this.currentCategory);
        grid.innerHTML = items.map(item => {
            const isImg = item.icon && !item.icon.startsWith('fa-');
            const iconHtml = isImg ? `<img src="${item.icon}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : `<i class="${item.icon}"></i>`;
            return `<a href="${item.url}" class="nav-item" data-id="${item.id}"><div class="icon" style="background:${item.color};">${iconHtml}</div><span class="name">${item.name}</span></a>`;
        }).join('');
        grid.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => { e.preventDefault(); window.open(Storage.resolveUrl(item.href), '_blank'); });
        });
    },

    applyLayoutPosition() {
        const c = document.querySelector('.container');
        c.classList.remove('position-top', 'position-center', 'position-bottom');
        c.classList.add('position-' + this.currentPosition);
        this.updatePositionButtons();
    },

    updatePositionButtons() {
        document.querySelectorAll('.position-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.position === this.currentPosition));
    },

    toggleSettings() { document.getElementById('settingsPanel').classList.toggle('active'); if (document.getElementById('settingsPanel').classList.contains('active')) this.renderSettingsLists(); },
    toggleWallpaperPanel() { const p = document.getElementById('wallpaperPanel'); p.classList.toggle('active'); if (p.classList.contains('active')) { this.updateWallpaperPreview(); this.renderWallpaperHistory(); } },
    closeModal(id) { document.getElementById(id).classList.remove('active'); },

    toggleTools() {
        const section = document.getElementById('toolsSection');
        const arrow = document.getElementById('toolsArrow');
        const collapsed = section.classList.toggle('collapsed');
        arrow.classList.toggle('collapsed', collapsed);
        Storage.set('tools_collapsed', collapsed);
    },

    // === Settings Lists ===
    async renderSettingsLists() {
        const categoryList = document.getElementById('categoryList');
        const order = (await Storage.get('category_order')) || [];
        this._cache_category_order = order;
        const catsFromItems = [...new Set(this.navItems.map(item => item.category || '常用'))];
        const allCats = [...new Set([...order, ...catsFromItems])];
        const categories = allCats.filter(c => order.includes(c)).concat(allCats.filter(c => !order.includes(c)));

        categoryList.innerHTML = categories.map(cat => {
            const count = this.navItems.filter(item => (item.category || '常用') === cat).length;
            return `<div class="category-row" data-category="${cat}"><span class="drag-handle"><i class="fas fa-grip-vertical"></i></span><div class="category-name">${cat}</div><div class="category-count">${count}</div><div class="item-actions"><button class="edit-item" data-category="${cat}"><i class="fas fa-edit"></i></button><button class="delete-item" data-category="${cat}"><i class="fas fa-trash"></i></button></div></div>`;
        }).join('');
        categoryList.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', () => this.editCategory(btn.dataset.category)));
        categoryList.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', () => this.deleteCategory(btn.dataset.category)));

        let draggedCat = null;
        categoryList.querySelectorAll('.category-row').forEach(row => {
            row.setAttribute('draggable', 'true');
            row.addEventListener('dragstart', (e) => { draggedCat = row; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
            row.addEventListener('dragover', (e) => { e.preventDefault(); if (row !== draggedCat) row.classList.add('drag-over'); });
            row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
            row.addEventListener('drop', async (e) => {
                e.preventDefault(); row.classList.remove('drag-over');
                if (draggedCat && row !== draggedCat) {
                    const cats = [...categories];
                    const fi = cats.indexOf(draggedCat.dataset.category), ti = cats.indexOf(row.dataset.category);
                    const [m] = cats.splice(fi, 1); cats.splice(ti, 0, m);
                    await Storage.set('category_order', cats);
                    this._cache_category_order = cats;
                    this.renderSettingsLists();
                    this.renderCategoryTabs();
                }
            });
            row.addEventListener('dragend', () => { row.classList.remove('dragging'); categoryList.querySelectorAll('.category-row').forEach(r => r.classList.remove('drag-over')); draggedCat = null; });
        });

        const navList = document.getElementById('navItemsList');
        navList.innerHTML = this.navItems.map(item => {
            const isImg = item.icon && !item.icon.startsWith('fa-');
            const iconHtml = isImg ? `<img src="${item.icon}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : `<i class="${item.icon}"></i>`;
            return `<div class="nav-item-row" data-id="${item.id}"><div class="item-icon" style="background:${item.color};">${iconHtml}</div><div class="item-info"><div class="item-name">${item.name}</div><div class="item-url">${item.category||'常用'} · ${item.url}</div></div><div class="item-actions"><button class="edit-item" data-id="${item.id}"><i class="fas fa-edit"></i></button><button class="delete-item" data-id="${item.id}"><i class="fas fa-trash"></i></button></div></div>`;
        }).join('');
        navList.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', () => this.editNavItem(btn.dataset.id)));
        navList.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', () => this.deleteNavItem(btn.dataset.id)));

        const engineList = document.getElementById('engineList');
        engineList.innerHTML = this.engines.map(engine => `<div class="engine-row" data-id="${engine.id}"><div class="item-icon" style="background:${engine.color};"><i class="${engine.icon}"></i></div><div class="item-info"><div class="item-name">${engine.name}</div><div class="item-url">${engine.url}</div></div><div class="item-actions"><button class="edit-item" data-id="${engine.id}"><i class="fas fa-edit"></i></button><button class="delete-item" data-id="${engine.id}"><i class="fas fa-trash"></i></button></div></div>`).join('');
        engineList.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', () => this.editEngine(btn.dataset.id)));
        engineList.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', () => this.deleteEngine(btn.dataset.id)));

        this.renderDnsMap();
        this.renderToolsConfig();
    },

    async renderToolsConfig() {
        const list = document.getElementById('toolsConfigList');
        const config = await Storage.get('tools_config') || [];
        list.innerHTML = config.map(tool => `<div class="tool-config-row" draggable="true" data-id="${tool.id}"><span class="drag-handle"><i class="fas fa-grip-vertical"></i></span><div class="tool-config-icon"><i class="${tool.icon}"></i></div><span class="tool-config-name">${tool.name}</span><button class="toggle-switch ${tool.enabled?'active':''}" data-id="${tool.id}"></button></div>`).join('');
        list.querySelectorAll('.toggle-switch').forEach(btn => btn.addEventListener('click', async () => {
            const cfg = await Storage.get('tools_config') || [];
            const t = cfg.find(x => x.id === btn.dataset.id);
            if (t) { t.enabled = !t.enabled; await Storage.set('tools_config', cfg); btn.classList.toggle('active', t.enabled); this.applyToolsVisibility(); }
        }));
        let draggedTool = null;
        list.querySelectorAll('.tool-config-row').forEach(row => {
            row.addEventListener('dragstart', (e) => { draggedTool = row; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
            row.addEventListener('dragover', (e) => { e.preventDefault(); if (row !== draggedTool) row.classList.add('drag-over'); });
            row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
            row.addEventListener('drop', async (e) => {
                e.preventDefault(); row.classList.remove('drag-over');
                if (draggedTool && row !== draggedTool) {
                    const cfg = await Storage.get('tools_config') || [];
                    const fi = cfg.findIndex(t => t.id === draggedTool.dataset.id), ti = cfg.findIndex(t => t.id === row.dataset.id);
                    const [m] = cfg.splice(fi, 1); cfg.splice(ti, 0, m);
                    await Storage.set('tools_config', cfg);
                    this.renderToolsConfig();
                }
            });
            row.addEventListener('dragend', () => { row.classList.remove('dragging'); list.querySelectorAll('.tool-config-row').forEach(r => r.classList.remove('drag-over')); draggedTool = null; });
        });
    },

    async applyToolsVisibility() {
        const config = await Storage.get('tools_config') || [];
        config.forEach(tool => { const el = document.getElementById('tool-' + tool.id); if (el) el.style.display = tool.enabled ? '' : 'none'; });
    },

    // === Nav CRUD ===
    openNavModal(item) {
        document.getElementById('modalTitle').textContent = item ? '编辑导航项' : '添加导航项';
        document.getElementById('editId').value = item ? item.id : '';
        document.getElementById('editName').value = item ? item.name : '';
        document.getElementById('editUrl').value = item ? item.url : '';
        document.getElementById('editColor').value = item ? item.color : '#6366f1';
        document.getElementById('editColorHex').textContent = item ? item.color : '#6366f1';
        const sel = document.getElementById('editCategory');
        const cats = [...new Set(this.navItems.map(i => i.category || '常用'))];
        sel.innerHTML = '<option value="" disabled' + (!item ? ' selected' : '') + '>请选择分类</option>' + cats.map(c => `<option value="${c}" ${item && item.category === c ? 'selected' : ''}>${c}</option>`).join('');
        if (item) sel.value = item.category;
        this.selectedIcon = item ? item.icon : 'fa-solid fa-link';
        const area = document.getElementById('iconUploadArea');
        const preview = document.getElementById('iconPreview');
        const clearBtn = area.querySelector('.icon-upload-clear');
        if (clearBtn) clearBtn.remove();
        if (item && item.icon && !item.icon.startsWith('fa-')) {
            area.classList.add('active'); preview.innerHTML = `<img src="${item.icon}">`;
            document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
            const cb = document.createElement('button'); cb.className = 'icon-upload-clear'; cb.innerHTML = '<i class="fas fa-times"></i>';
            cb.addEventListener('click', (ev) => { ev.stopPropagation(); this.clearIconUpload(); }); area.appendChild(cb);
        } else {
            area.classList.remove('active'); preview.innerHTML = '<i class="fas fa-cloud-arrow-up"></i>';
            document.querySelectorAll('.icon-option').forEach(opt => opt.classList.toggle('selected', opt.dataset.icon === this.selectedIcon));
        }
        document.getElementById('editModal').classList.add('active');
    },

    editNavItem(id) { const item = this.navItems.find(i => i.id == id); if (item) this.openNavModal(item); },

    async saveNavItem(e) {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const item = {
            name: document.getElementById('editName').value,
            url: document.getElementById('editUrl').value,
            icon: this.selectedIcon,
            color: document.getElementById('editColor').value,
            category: document.getElementById('editCategory').value
        };
        if (id) item.id = parseInt(id);
        await Storage.saveNavItem(item);
        await this.refreshNav();
        this.closeModal('editModal');
    },

    async deleteNavItem(id) {
        if (!confirm('确定删除？')) return;
        await Storage.deleteNavItem(id);
        await this.refreshNav();
    },

    // === Category CRUD ===
    openCategoryModal(cat) {
        document.getElementById('categoryModalTitle').textContent = cat ? '编辑分类' : '添加分类';
        document.getElementById('categoryEditId').value = cat || '';
        document.getElementById('categoryEditName').value = cat || '';
        document.getElementById('categoryModal').classList.add('active');
    },
    editCategory(cat) { this.openCategoryModal(cat); },

    async saveCategory(e) {
        e.preventDefault();
        const oldName = document.getElementById('categoryEditId').value;
        const newName = document.getElementById('categoryEditName').value.trim();
        if (!newName) return;
        const order = (await Storage.get('category_order')) || [...new Set(this.navItems.map(i => i.category || '常用'))];
        if (oldName) {
            if (oldName !== newName && order.includes(newName)) { alert('分类已存在'); return; }
            for (const item of this.navItems) { if (item.category === oldName) { item.category = newName; await Storage.saveNavItem(item); } }
            const idx = order.indexOf(oldName); if (idx !== -1) order[idx] = newName;
            if (this.currentCategory === oldName) { this.currentCategory = newName; await Storage.set('current_category', newName); }
        } else {
            if (order.includes(newName)) { alert('分类已存在'); return; }
            order.push(newName);
        }
        await Storage.set('category_order', order);
        this._cache_category_order = order;
        await this.refreshNav();
        this.closeModal('categoryModal');
    },

    async deleteCategory(cat) {
        const items = this.navItems.filter(i => (i.category || '常用') === cat);
        if (items.length > 0) {
            if (!confirm(`分类"${cat}"下有 ${items.length} 个网站，将移到"常用"，继续？`)) return;
            for (const item of items) { item.category = '常用'; await Storage.saveNavItem(item); }
        }
        const order = (await Storage.get('category_order')) || [];
        const idx = order.indexOf(cat); if (idx !== -1) order.splice(idx, 1);
        await Storage.set('category_order', order);
        this._cache_category_order = order;
        if (this.currentCategory === cat) { this.currentCategory = '常用'; await Storage.set('current_category', '常用'); }
        await this.refreshNav();
    },

    // === Engine CRUD ===
    openEngineModal(engine) {
        document.getElementById('engineModalTitle').textContent = engine ? '编辑搜索引擎' : '添加搜索引擎';
        document.getElementById('engineEditId').value = engine ? engine.id : '';
        document.getElementById('engineEditName').value = engine ? engine.name : '';
        document.getElementById('engineEditUrl').value = engine ? engine.url : '';
        document.getElementById('engineEditIcon').value = engine ? engine.icon : 'fa-solid fa-magnifying-glass';
        document.getElementById('engineEditColor').value = engine ? engine.color : '#6366f1';
        document.getElementById('engineModal').classList.add('active');
    },
    editEngine(id) { const e = this.engines.find(x => x.id === id); if (e) this.openEngineModal(e); },

    async saveEngine(e) {
        e.preventDefault();
        const id = document.getElementById('engineEditId').value;
        const engine = {
            id: id || document.getElementById('engineEditName').value.toLowerCase().replace(/\s/g, ''),
            name: document.getElementById('engineEditName').value,
            url: document.getElementById('engineEditUrl').value,
            icon: document.getElementById('engineEditIcon').value || 'fa-solid fa-magnifying-glass',
            color: document.getElementById('engineEditColor').value
        };
        if (id) await Storage.updateEngine(id, engine);
        else await Storage.saveEngine(engine);
        await this.refreshEngines();
        this.closeModal('engineModal');
    },

    async deleteEngine(id) {
        if (!confirm('确定删除？')) return;
        await Storage.deleteEngine(id);
        await this.refreshEngines();
    },

    // === DNS Map ===
    openDnsModal(index) {
        const isEdit = index !== undefined;
        document.getElementById('dnsModalTitle').textContent = isEdit ? '编辑 DNS 映射' : '添加 DNS 映射';
        const maps = this._cache_dns || [];
        document.getElementById('dnsEditIndex').value = isEdit ? index : '';
        document.getElementById('dnsEditDomain').value = isEdit ? maps[index].domain : '';
        document.getElementById('dnsEditIp').value = isEdit ? maps[index].ip : '';
        document.getElementById('dnsEditNote').value = isEdit ? (maps[index].note || '') : '';
        document.getElementById('dnsModal').classList.add('active');
    },

    async saveDnsMap(e) {
        e.preventDefault();
        const index = document.getElementById('dnsEditIndex').value;
        const entry = { domain: document.getElementById('dnsEditDomain').value.trim(), ip: document.getElementById('dnsEditIp').value.trim(), note: document.getElementById('dnsEditNote').value.trim() };
        if (!entry.domain || !entry.ip) return;
        const maps = this._cache_dns || [];
        if (index !== '') maps[parseInt(index)] = entry; else maps.push(entry);
        await Storage.set('dns_map', maps);
        this._cache_dns = maps;
        this.renderDnsMap();
        this.closeModal('dnsModal');
    },

    async renderDnsMap() {
        this._cache_dns = await Storage.get('dns_map') || [];
        const list = document.getElementById('dnsMapList');
        if (this._cache_dns.length === 0) { list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:12px;opacity:0.4;">暂无映射</div>'; return; }
        list.innerHTML = this._cache_dns.map((m, i) => `<div class="dns-map-row" data-index="${i}"><div class="dns-map-icon"><i class="fas fa-server"></i></div><div class="dns-map-info"><div><span class="dns-map-domain">${m.domain}</span><span class="dns-map-arrow"><i class="fas fa-arrow-right"></i></span><span class="dns-map-ip">${m.ip}</span></div>${m.note ? `<div class="dns-map-note">${m.note}</div>` : ''}</div><div class="item-actions"><button class="edit-item" data-index="${i}"><i class="fas fa-edit"></i></button><button class="delete-item" data-index="${i}"><i class="fas fa-trash"></i></button></div></div>`).join('');
        list.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', () => this.openDnsModal(parseInt(btn.dataset.index))));
        list.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('删除？')) return; this._cache_dns.splice(parseInt(btn.dataset.index), 1); await Storage.set('dns_map', this._cache_dns); this.renderDnsMap(); }));
    },

    // === Icon Upload ===
    handleIconUpload(e) {
        const file = e.target.files[0]; if (!file) return;
        if (file.size > 200 * 1024) { alert('图片不能超过 200KB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            this.selectedIcon = ev.target.result;
            const area = document.getElementById('iconUploadArea');
            document.getElementById('iconPreview').innerHTML = `<img src="${ev.target.result}">`;
            area.classList.add('active');
            document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
            if (!area.querySelector('.icon-upload-clear')) {
                const cb = document.createElement('button'); cb.className = 'icon-upload-clear'; cb.innerHTML = '<i class="fas fa-times"></i>';
                cb.addEventListener('click', (x) => { x.stopPropagation(); this.clearIconUpload(); }); area.appendChild(cb);
            }
        };
        reader.readAsDataURL(file); e.target.value = '';
    },

    clearIconUpload() {
        this.selectedIcon = 'fa-solid fa-link';
        const area = document.getElementById('iconUploadArea');
        area.classList.remove('active');
        document.getElementById('iconPreview').innerHTML = '<i class="fas fa-cloud-arrow-up"></i>';
        const cb = area.querySelector('.icon-upload-clear'); if (cb) cb.remove();
        document.querySelector('.icon-option[data-icon="fa-solid fa-link"]').classList.add('selected');
    },

    // === Export/Import/Reset ===
    async exportConfig() {
        const data = { navItems: this.navItems, engines: this.engines, exportTime: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'nav-config-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    },

    async importConfig(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (confirm('导入将覆盖当前配置？')) {
                    if (data.navItems) for (const item of data.navItems) await Storage.saveNavItem(item);
                    if (data.engines) for (const engine of data.engines) await Storage.saveEngine(engine);
                    await this.refreshNav(); await this.refreshEngines();
                    alert('导入成功！');
                }
            } catch (err) { alert('文件格式错误'); }
        };
        reader.readAsText(file); e.target.value = '';
    },

    resetData() {
        if (!confirm('确定重置？')) return;
        location.reload();
    },

    // === Wallpaper ===
    initWallpaper() {
        this._loadWallpaper();
        this.updateWallpaperPreview();
        this.renderWallpaperHistory();
    },

    async _loadWallpaper() {
        const wp = await Storage.get('wallpaper');
        if (wp && wp.url) {
            document.body.style.backgroundImage = `url(${wp.url})`;
            document.body.classList.add('wallpaper-active');
            this._detectWallpaperBrightness(wp.url);
        }
    },

    _detectWallpaperBrightness(url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 32;
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;
            let total = 0;
            for (let i = 0; i < data.length; i += 4) {
                total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }
            const avg = total / (size * size);
            document.body.classList.toggle('wallpaper-light', avg > 140);
        };
        img.onerror = () => { document.body.classList.remove('wallpaper-light'); };
        img.src = url;
    },

    async updateWallpaperPreview() {
        const wp = await Storage.get('wallpaper');
        const preview = document.getElementById('currentWallpaperPreview');
        preview.src = (wp && wp.url) ? wp.url : "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect fill="%23667eea" width="400" height="200"/><text fill="white" font-family="Arial" font-size="20" text-anchor="middle" x="200" y="105">默认背景</text></svg>');
    },

    async fetchBingWallpaper() {
        try {
            const res = await fetch('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN');
            const data = await res.json();
            const url = 'https://cn.bing.com' + data.images[0].url.split('&')[0];
            document.body.style.backgroundImage = `url(${url})`;
            document.body.classList.add('wallpaper-active');
            this._detectWallpaperBrightness(url);
            await Storage.set('wallpaper', { url, timestamp: Date.now() });
            const hist = await Storage.get('wallpaper_history') || [];
            hist.unshift({ url, name: data.images[0].copyright });
            if (hist.length > 12) hist.pop();
            await Storage.set('wallpaper_history', hist);
            this.updateWallpaperPreview(); this.renderWallpaperHistory();
        } catch (e) { alert('获取壁纸失败'); }
    },

    async fetchRandomBingWallpaper() {
        try {
            const idx = Math.floor(Math.random() * 8);
            const res = await fetch(`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=${idx}&n=1&mkt=zh-CN`);
            const data = await res.json();
            const url = 'https://cn.bing.com' + data.images[0].url.split('&')[0];
            document.body.style.backgroundImage = `url(${url})`;
            document.body.classList.add('wallpaper-active');
            this._detectWallpaperBrightness(url);
            await Storage.set('wallpaper', { url, timestamp: Date.now() });
            const hist = await Storage.get('wallpaper_history') || [];
            hist.unshift({ url, name: data.images[0].copyright });
            if (hist.length > 12) hist.pop();
            await Storage.set('wallpaper_history', hist);
            this.updateWallpaperPreview(); this.renderWallpaperHistory();
        } catch (e) { alert('获取壁纸失败'); }
    },

    async uploadWallpaper(e) {
        const file = e.target.files[0]; if (!file) return;
        const ext = file.name.split('.').pop() || 'jpg';
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const progress = document.getElementById('wallpaperProgress');
            if (progress) progress.style.display = 'flex';
            try {
                const res = await fetch('/api/wallpaper/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/octet-stream', 'X-Wallpaper-Ext': '.' + ext },
                    body: new Uint8Array(ev.target.result)
                });
                const data = await res.json();
                if (data.ok) {
                    document.body.style.backgroundImage = `url(${data.url})`;
                    document.body.classList.add('wallpaper-active');
                    this._detectWallpaperBrightness(data.url);
                    await Storage.set('wallpaper', { url: data.url, timestamp: Date.now() });
                    const hist = await Storage.get('wallpaper_history') || [];
                    hist.unshift({ url: data.url, name: file.name });
                    if (hist.length > 8) {
                        const removed = hist.splice(8);
                        for (const h of removed) { if (h.url && h.url.startsWith('/wallpapers/')) { try { await fetch('/api/wallpaper/delete' + h.url.replace('/wallpapers', ''), { method: 'DELETE' }); } catch (e) {} } }
                    }
                    await Storage.set('wallpaper_history', hist);
                    this.updateWallpaperPreview(); this.renderWallpaperHistory();
                }
            } catch (err) { alert('上传失败'); }
            if (progress) progress.style.display = 'none';
        };
        reader.readAsArrayBuffer(file); e.target.value = '';
    },

    async resetWallpaper() {
        document.body.style.backgroundImage = '';
        document.body.classList.remove('wallpaper-active');
        document.body.classList.remove('wallpaper-light');
        await Storage.set('wallpaper', null);
        this.updateWallpaperPreview();
    },

    async renderWallpaperHistory() {
        const hist = await Storage.get('wallpaper_history') || [];
        const cur = await Storage.get('wallpaper');
        const grid = document.querySelector('.history-grid');
        if (hist.length === 0) { document.getElementById('wallpaperHistory').style.display = 'none'; return; }
        document.getElementById('wallpaperHistory').style.display = 'block';
        grid.innerHTML = hist.map(item => `<div class="history-item ${cur && cur.url === item.url ? 'active' : ''}" data-url="${item.url}"><img src="${item.url}" alt="${item.name || ''}"></div>`).join('');
        grid.querySelectorAll('.history-item').forEach(item => item.addEventListener('click', async () => {
            document.body.style.backgroundImage = `url(${item.dataset.url})`;
            document.body.classList.add('wallpaper-active');
            this._detectWallpaperBrightness(item.dataset.url);
            await Storage.set('wallpaper', { url: item.dataset.url, timestamp: Date.now() });
            this.renderWallpaperHistory(); this.updateWallpaperPreview();
        }));
    },

    // === Tools: Clock + Timestamp (shared timer) ===
    initClock() { this.updateClock(); this.updateTsNow(); this._addInterval(() => { this.updateClock(); this.updateTsNow(); }, 1000); },
    updateClock() {
        const n = new Date(), h = String(n.getHours()).padStart(2, '0'), m = String(n.getMinutes()).padStart(2, '0'), s = String(n.getSeconds()).padStart(2, '0');
        document.getElementById('clockTime').textContent = `${h}:${m}:${s}`;
        const wd = ['日','一','二','三','四','五','六'];
        document.getElementById('clockDate').textContent = `${n.getFullYear()}年${n.getMonth()+1}月${n.getDate()}日 星期${wd[n.getDay()]}`;
    },

    // === Tools: Pomodoro ===
    pomodoroInterval: null, pomodoroTime: 25*60, pomodoroTotal: 25*60, pomodoroRunning: false,
    initPomodoro() {
        document.getElementById('pomodoroStart').addEventListener('click', () => this.startPomodoro());
        document.getElementById('pomodoroPause').addEventListener('click', () => this.pausePomodoro());
        document.getElementById('pomodoroReset').addEventListener('click', () => this.resetPomodoro());
        document.querySelectorAll('.pomodoro-mode').forEach(btn => btn.addEventListener('click', () => {
            if (this.pomodoroRunning) return;
            document.querySelectorAll('.pomodoro-mode').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.pomodoroTotal = parseInt(btn.dataset.minutes) * 60;
            this.pomodoroTime = this.pomodoroTotal;
            this.updatePomodoroDisplay();
        }));
    },
    startPomodoro() {
        if (this.pomodoroRunning) return; this.pomodoroRunning = true;
        document.getElementById('pomodoroStart').style.display = 'none';
        document.getElementById('pomodoroPause').style.display = 'flex';
        this.pomodoroInterval = setInterval(() => {
            this.pomodoroTime--; this.updatePomodoroDisplay();
            if (this.pomodoroTime <= 0) { this.pausePomodoro(); if (Notification.permission === 'granted') new Notification('番茄钟', { body: '时间到！' }); }
        }, 1000);
    },
    pausePomodoro() { this.pomodoroRunning = false; clearInterval(this.pomodoroInterval); document.getElementById('pomodoroStart').style.display = 'flex'; document.getElementById('pomodoroPause').style.display = 'none'; },
    resetPomodoro() { this.pausePomodoro(); this.pomodoroTime = this.pomodoroTotal; this.updatePomodoroDisplay(); },
    updatePomodoroDisplay() {
        document.getElementById('pomodoroDisplay').textContent = `${String(Math.floor(this.pomodoroTime/60)).padStart(2,'0')}:${String(this.pomodoroTime%60).padStart(2,'0')}`;
        document.getElementById('pomodoroBar').style.width = ((this.pomodoroTotal - this.pomodoroTime) / this.pomodoroTotal * 100) + '%';
    },

    // === Tools: Todo ===
    todos: [],
    initTodo() {
        this._loadTodos();
        document.getElementById('todoAddBtn').addEventListener('click', () => this.addTodo());
        document.getElementById('todoInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addTodo(); });
    },
    async _loadTodos() { this.todos = await Storage.get('todo_list') || []; this.renderTodos(); },
    async addTodo() {
        const input = document.getElementById('todoInput'); const text = input.value.trim(); if (!text) return;
        this.todos.push({ id: Date.now(), text, done: false });
        await Storage.set('todo_list', this.todos); input.value = ''; this.renderTodos();
    },
    async toggleTodo(id) { const t = this.todos.find(x => x.id === id); if (t) t.done = !t.done; await Storage.set('todo_list', this.todos); this.renderTodos(); },
    async deleteTodo(id) { this.todos = this.todos.filter(t => t.id !== id); await Storage.set('todo_list', this.todos); this.renderTodos(); },
    renderTodos() {
        const list = document.getElementById('todoList');
        document.getElementById('todoCount').textContent = this.todos.filter(t => !t.done).length;
        list.innerHTML = this.todos.map(t => `<div class="todo-item"><div class="todo-checkbox ${t.done?'checked':''}" data-id="${t.id}"></div><span class="todo-text ${t.done?'done':''}">${t.text}</span><button class="todo-delete" data-id="${t.id}"><i class="fas fa-times"></i></button></div>`).join('');
        list.querySelectorAll('.todo-checkbox').forEach(cb => cb.addEventListener('click', () => this.toggleTodo(parseInt(cb.dataset.id))));
        list.querySelectorAll('.todo-delete').forEach(btn => btn.addEventListener('click', () => this.deleteTodo(parseInt(btn.dataset.id))));
    },

    // === Tools: Notes ===
    async initNotes() {
        const noteArea = document.getElementById('noteArea'); const status = document.getElementById('noteStatus');
        noteArea.value = await Storage.get('quick_note') || '';
        let saveTimeout;
        noteArea.addEventListener('input', () => {
            status.textContent = '输入中...'; status.style.opacity = '1';
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => { await Storage.set('quick_note', noteArea.value); status.textContent = '已保存'; setTimeout(() => { status.style.opacity = '0.6'; }, 1000); }, 800);
        });
    },

    // === Tools: Random ===
    initRandom() { this.generateRandom(); document.getElementById('randomBtn').addEventListener('click', () => this.generateRandom()); },
    generateRandom() {
        const min = parseInt(document.getElementById('randomMin').value) || 0, max = parseInt(document.getElementById('randomMax').value) || 100;
        const lo = Math.min(min, max), hi = Math.max(min, max);
        const el = document.getElementById('randomDisplay');
        el.style.transform = 'scale(1.1)'; el.textContent = Math.floor(Math.random() * (hi - lo + 1)) + lo;
        setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);
    },

    // === Tools: Counter ===
    initCounter() { document.getElementById('counterInput').addEventListener('input', () => this.updateCounter()); },
    updateCounter() {
        const t = document.getElementById('counterInput').value;
        document.getElementById('counterChars').textContent = t.length;
        document.getElementById('counterWords').textContent = t.trim() === '' ? 0 : t.trim().split(/\s+/).length;
        document.getElementById('counterLines').textContent = t === '' ? 0 : t.split('\n').length;
    },

    // === Tools: Base64 ===
    initBase64() {
        document.getElementById('base64Encode').addEventListener('click', () => {
            try { document.getElementById('base64Output').value = btoa(unescape(encodeURIComponent(document.getElementById('base64Input').value))); } catch (e) { document.getElementById('base64Output').value = '编码失败'; }
        });
        document.getElementById('base64Decode').addEventListener('click', () => {
            try { document.getElementById('base64Output').value = decodeURIComponent(escape(atob(document.getElementById('base64Input').value))); } catch (e) { document.getElementById('base64Output').value = '解码失败'; }
        });
        document.getElementById('base64Copy').addEventListener('click', () => { const v = document.getElementById('base64Output').value; if (v) navigator.clipboard.writeText(v); });
    },

    // === Tools: Password ===
    initPassword() {
        document.getElementById('passwordLength').addEventListener('input', (e) => document.getElementById('passwordLengthVal').textContent = e.target.value);
        document.getElementById('passwordGen').addEventListener('click', () => this.generatePassword());
        document.getElementById('passwordCopy').addEventListener('click', () => {
            const pw = document.getElementById('passwordDisplay').textContent;
            if (pw && pw !== '点击生成') navigator.clipboard.writeText(pw).then(() => { document.getElementById('passwordCopy').innerHTML = '<i class="fas fa-check"></i> 已复制'; setTimeout(() => { document.getElementById('passwordCopy').innerHTML = '<i class="fas fa-copy"></i> 复制'; }, 1500); });
        });
        document.getElementById('passwordDisplay').addEventListener('click', () => { const pw = document.getElementById('passwordDisplay').textContent; if (pw && pw !== '点击生成') navigator.clipboard.writeText(pw); });
        this.generatePassword();
    },
    generatePassword() {
        const len = parseInt(document.getElementById('passwordLength').value);
        let chars = '';
        if (document.getElementById('pwUpper').checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (document.getElementById('pwLower').checked) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (document.getElementById('pwNumber').checked) chars += '0123456789';
        if (document.getElementById('pwSymbol').checked) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
        let pw = ''; const arr = new Uint32Array(len); crypto.getRandomValues(arr);
        for (let i = 0; i < len; i++) pw += chars[arr[i] % chars.length];
        document.getElementById('passwordDisplay').textContent = pw;
    },

    // === Tools: Clipboard ===
    clipboardItems: [],
    async initClipboard() { this.clipboardItems = await Storage.get('clipboard_items') || []; this.renderClipboard(); document.getElementById('clipboardAddBtn').addEventListener('click', () => this.addClipboardItem()); document.getElementById('clipboardInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addClipboardItem(); }); },
    async addClipboardItem() { const input = document.getElementById('clipboardInput'); const text = input.value.trim(); if (!text) return; this.clipboardItems.unshift({ id: Date.now(), text }); if (this.clipboardItems.length > 20) this.clipboardItems.pop(); await Storage.set('clipboard_items', this.clipboardItems); input.value = ''; this.renderClipboard(); },
    renderClipboard() {
        const list = document.getElementById('clipboardList');
        document.getElementById('clipboardCount').textContent = this.clipboardItems.length;
        if (this.clipboardItems.length === 0) { list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:16px;opacity:0.4;">暂无内容</div>'; return; }
        list.innerHTML = this.clipboardItems.map(item => `<div class="clipboard-item" data-id="${item.id}"><span class="clipboard-item-text">${item.text}</span><div class="clipboard-item-btns"><button class="clip-copy" title="复制"><i class="fas fa-copy"></i></button><button class="clip-delete" title="删除"><i class="fas fa-times"></i></button></div></div>`).join('');
        list.querySelectorAll('.clip-copy').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); navigator.clipboard.writeText(btn.closest('.clipboard-item').querySelector('.clipboard-item-text').textContent); }));
        list.querySelectorAll('.clip-delete').forEach(btn => btn.addEventListener('click', async (e) => { e.stopPropagation(); this.clipboardItems = this.clipboardItems.filter(i => i.id !== parseInt(btn.closest('.clipboard-item').dataset.id)); await Storage.set('clipboard_items', this.clipboardItems); this.renderClipboard(); }));
    },

    // === Tools: Timestamp ===
    initTimestamp() {
        document.getElementById('tsToDate').addEventListener('click', () => this.tsToDate());
        document.getElementById('tsNowBtn').addEventListener('click', () => { document.getElementById('tsInput').value = Math.floor(Date.now() / 1000); this.tsToDate(); });
        document.getElementById('tsCopyBtn').addEventListener('click', () => { const v = document.getElementById('tsOutput').value || document.getElementById('tsInput').value; if (v) navigator.clipboard.writeText(v); });
        document.getElementById('tsInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.tsToDate(); });
    },
    updateTsNow() { document.getElementById('tsNow').textContent = Math.floor(Date.now() / 1000); },
    tsToDate() {
        const input = document.getElementById('tsInput').value.trim(); if (!input) return;
        let ts = parseInt(input); if (ts > 1e12) ts = Math.floor(ts / 1000);
        const d = new Date(ts * 1000);
        if (isNaN(d.getTime())) { document.getElementById('tsOutput').value = '无效'; return; }
        const pad = n => String(n).padStart(2, '0');
        document.getElementById('tsOutput').value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    },

    // === Hitokoto ===
    initHitokoto() {
        document.getElementById('hitokotoText').classList.add('hitokoto-loading');
        this.fetchHitokoto();
        this._addInterval(() => this.fetchHitokoto(), 120000);
    },
    async fetchHitokoto() {
        const t = document.getElementById('hitokotoText'), f = document.getElementById('hitokotoFrom');
        try {
            const r = await fetch('/api/hitokoto', { signal: AbortSignal.timeout(6000) });
            if (!r.ok) throw new Error(r.status);
            const d = await r.json();
            if (d.hitokoto) {
                t.textContent = d.hitokoto;
                f.textContent = d.from ? `\u2014\u2014 ${d.from}` : '';
                t.classList.remove('hitokoto-loading');
                return;
            }
        } catch (e) {}
        if (!t.classList.contains('hitokoto-loading')) return;
        t.textContent = '世界上最快乐的事，莫过于为理想而奋斗。';
        f.textContent = '\u2014\u2014 苏格拉底';
        t.classList.remove('hitokoto-loading');
    },

    // === JSON 格式化 ===
    initJsonFormatter() {
        document.getElementById('jsonFormat').addEventListener('click', () => {
            const input = document.getElementById('jsonInput').value.trim();
            if (!input) return;
            try {
                const obj = JSON.parse(input);
                document.getElementById('jsonOutput').value = JSON.stringify(obj, null, 2);
                document.getElementById('jsonStatus').className = 'json-status valid';
                document.getElementById('jsonStatus').textContent = '✓ 有效的 JSON（' + Object.keys(obj).length + ' 个键）';
            } catch (e) {
                document.getElementById('jsonStatus').className = 'json-status invalid';
                document.getElementById('jsonStatus').textContent = '✗ ' + e.message;
            }
        });
        document.getElementById('jsonMinify').addEventListener('click', () => {
            const input = document.getElementById('jsonInput').value.trim();
            if (!input) return;
            try {
                document.getElementById('jsonOutput').value = JSON.stringify(JSON.parse(input));
                document.getElementById('jsonStatus').className = 'json-status valid';
                document.getElementById('jsonStatus').textContent = '✓ 已压缩';
            } catch (e) {
                document.getElementById('jsonStatus').className = 'json-status invalid';
                document.getElementById('jsonStatus').textContent = '✗ ' + e.message;
            }
        });
        document.getElementById('jsonCopy').addEventListener('click', () => {
            const v = document.getElementById('jsonOutput').value;
            if (v) navigator.clipboard.writeText(v);
        });
    },

    // === Markdown ===
    initMarkdown() {
        document.getElementById('mdInput').addEventListener('input', () => this.renderMarkdown());
    },

    renderMarkdown() {
        let text = document.getElementById('mdInput').value;
        if (!text.trim()) { document.getElementById('mdPreview').innerHTML = '<p class="md-placeholder">预览区域</p>'; return; }
        text = text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^---$/gm, '<hr>')
            .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/^\- (.+)$/gm, '<li>$1</li>')
            .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, (m) => '<ul>' + m + '</ul>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
            .replace(/\n{2,}/g, '</p><p>')
            .replace(/\n/g, '<br>');
        document.getElementById('mdPreview').innerHTML = '<p>' + text + '</p>';
    },

    // === 正则测试 ===
    initRegex() {
        const run = () => this.testRegex();
        document.getElementById('regexPattern').addEventListener('input', run);
        document.getElementById('regexFlags').addEventListener('input', run);
        document.getElementById('regexInput').addEventListener('input', run);
    },

    testRegex() {
        const pattern = document.getElementById('regexPattern').value;
        const flags = document.getElementById('regexFlags').value;
        const text = document.getElementById('regexInput').value;
        const result = document.getElementById('regexResult');
        if (!pattern || !text) { result.innerHTML = ''; return; }
        try {
            const regex = new RegExp(pattern, flags);
            const matches = [...text.matchAll(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'))];
            if (matches.length === 0) { result.innerHTML = '<span style="opacity:0.4">无匹配</span>'; return; }
            let html = `<span style="opacity:0.5">找到 ${matches.length} 个匹配:</span><br>`;
            matches.forEach((m, i) => {
                const start = m.index, end = start + m[0].length;
                html += `<span class="regex-match">${m[0]}</span> <span style="opacity:0.3">[${start}:${end}]</span> `;
            });
            result.innerHTML = html;
        } catch (e) {
            result.innerHTML = '<span style="color:#fca5a5">⚠ ' + e.message + '</span>';
        }
    },

    // === 颜色工具 ===
    initColorTool() {
        const picker = document.getElementById('colorPicker');
        picker.addEventListener('input', () => this.updateColor(picker.value));
        document.getElementById('colorHex').addEventListener('change', (e) => {
            const v = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) this.updateColor(v);
        });
        document.getElementById('colorCopy').addEventListener('click', () => {
            const hex = document.getElementById('colorHex').value;
            navigator.clipboard.writeText(hex);
        });
    },

    updateColor(hex) {
        document.getElementById('colorPicker').value = hex;
        document.getElementById('colorPreview').style.background = hex;
        document.getElementById('colorHex').value = hex;
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        document.getElementById('colorRgb').value = `${r}, ${g}, ${b}`;
        const rr = r / 255, gg = g / 255, bb = b / 255;
        const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
            else if (max === gg) h = ((bb - rr) / d + 2) / 6;
            else h = ((rr - gg) / d + 4) / 6;
        }
        document.getElementById('colorHsl').value = `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
    },

    // === 文本对比 ===
    initDiff() {
        document.getElementById('diffBtn').addEventListener('click', () => this.runDiff());
    },

    runDiff() {
        const a = document.getElementById('diffA').value.split('\n');
        const b = document.getElementById('diffB').value.split('\n');
        const result = document.getElementById('diffResult');
        const maxLen = Math.max(a.length, b.length);
        let html = '';
        for (let i = 0; i < maxLen; i++) {
            const lineA = a[i], lineB = b[i];
            if (lineA === lineB) {
                html += `<span class="diff-same">  ${this._esc(lineA || '')}</span>\n`;
            } else {
                if (lineA !== undefined) html += `<span class="diff-del">- ${this._esc(lineA)}</span>\n`;
                if (lineB !== undefined) html += `<span class="diff-add">+ ${this._esc(lineB)}</span>\n`;
            }
        }
        result.innerHTML = html;
        result.classList.add('active');
    },

    _esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },

    // === Lorem Ipsum ===
    initLorem() {
        document.getElementById('loremGen').addEventListener('click', () => this.generateLorem());
        document.getElementById('loremCopy').addEventListener('click', () => {
            const v = document.getElementById('loremOutput').value;
            if (v) navigator.clipboard.writeText(v);
        });
        this.generateLorem();
    },

    generateLorem() {
        const paragraphs = [
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
            'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
            'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.',
            'Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula ut dictum pharetra, nisi nunc fringilla magna.',
            'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Ut non enim eleifend felis pretium feugiat. Vivamus quis mi.',
            'Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero.',
            'Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. Praesent adipiscing. Phasellus ullamcorper ipsum rutrum nunc.',
            'Nunc nonummy enim. In hac habitasse platea dictumst. Praesent turpis. Proin sapien ipsum, porta a, auctor quis, euismod ut, mi. Aenean viverra rhoncus pede.',
            'Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu.',
            'In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus.'
        ];
        const count = parseInt(document.getElementById('loremCount').value) || 3;
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(paragraphs[i % paragraphs.length]);
        }
        document.getElementById('loremOutput').value = result.join('\n\n');
    },

    // === 空投 ===
    airdropFiles: [],
    airdropTimer: null,

    initAirdrop() {},

    toggleAirdrop() {
        const panel = document.getElementById('airdropPanel');
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
            this.refreshAirdrop();
        }
    },

    async refreshAirdrop() {
        try {
            const res = await fetch('/api/airdrop');
            this.airdropFiles = await res.json();
        } catch (e) { this.airdropFiles = []; }
        this.renderAirdropList();
        this.startAirdropTimer();
    },

    startAirdropTimer() {
        clearInterval(this.airdropTimer);
        this.airdropTimer = this._addInterval(() => {
            const panel = document.getElementById('airdropPanel');
            if (!panel.classList.contains('active')) { clearInterval(this.airdropTimer); this.airdropTimer = null; return; }
            this.renderAirdropList();
        }, 1000);
    },

    getAirdropIcon(mime) {
        if (!mime) return { icon: 'fa-file', cls: 'file' };
        if (mime.startsWith('image/')) return { icon: 'fa-image', cls: 'image' };
        if (mime.startsWith('video/')) return { icon: 'fa-video', cls: 'video' };
        if (mime.startsWith('audio/')) return { icon: 'fa-music', cls: 'audio' };
        if (mime.includes('zip') || mime.includes('archive') || mime.includes('compressed')) return { icon: 'fa-file-zipper', cls: 'archive' };
        return { icon: 'fa-file', cls: 'file' };
    },

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    },

    formatRemaining(expiresAt) {
        const diff = expiresAt - Date.now();
        if (diff <= 0) return '已过期';
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    },

    renderAirdropList() {
        const list = document.getElementById('airdropList');
        const now = Date.now();
        const active = this.airdropFiles.filter(f => f.expiresAt > now);
        const expired = this.airdropFiles.filter(f => f.expiresAt <= now);
        document.getElementById('airdropCount').textContent = active.length;

        if (this.airdropFiles.length === 0) {
            list.innerHTML = '<div class="airdrop-empty"><i class="fas fa-cloud-arrow-up"></i>暂无文件，上传一个试试</div>';
            return;
        }

        let html = '';
        for (const f of active) {
            const { icon, cls } = this.getAirdropIcon(f.mime);
            const remaining = this.formatRemaining(f.expiresAt);
            const urgent = (f.expiresAt - now) < 300000;
            html += `<div class="airdrop-item" data-id="${f.id}">
                <div class="airdrop-item-icon ${cls}"><i class="fas ${icon}"></i></div>
                <div class="airdrop-item-info">
                    <div class="airdrop-item-name">${f.name}</div>
                    <div class="airdrop-item-meta"><span>${this.formatSize(f.size)}</span></div>
                </div>
                <div class="airdrop-item-timer ${urgent ? 'urgent' : ''}">${remaining}</div>
                <div class="airdrop-item-actions">
                    <a class="adl-download" href="${f.downloadUrl}" download="${f.name}" title="下载"><i class="fas fa-download"></i></a>
                    <button class="adl-delete" title="删除"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }

        for (const f of expired) {
            const { icon, cls } = this.getAirdropIcon(f.mime);
            html += `<div class="airdrop-item" style="opacity:0.35;" data-id="${f.id}">
                <div class="airdrop-item-icon ${cls}"><i class="fas ${icon}"></i></div>
                <div class="airdrop-item-info">
                    <div class="airdrop-item-name" style="text-decoration:line-through;">${f.name}</div>
                    <div class="airdrop-item-meta"><span>已过期</span></div>
                </div>
                <div class="airdrop-item-actions" style="opacity:1;">
                    <button class="adl-delete" title="清除"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }

        list.innerHTML = html;

        list.querySelectorAll('.adl-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = btn.closest('.airdrop-item').dataset.id;
                await fetch('/api/airdrop/' + id, { method: 'DELETE' });
                this.refreshAirdrop();
            });
        });
    },

    async uploadAirdropFiles(e) {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const duration = parseInt(document.getElementById('airdropDuration').value);
        const progress = document.getElementById('airdropProgress');
        const bar = document.getElementById('airdropProgressBar');
        const text = document.getElementById('airdropProgressText');

        for (const file of files) {
            progress.style.display = 'flex';
            text.textContent = `上传 ${file.name}...`;

            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener('progress', (ev) => {
                    if (ev.lengthComputable) {
                        text.textContent = `上传 ${file.name} (${Math.round(ev.loaded / ev.total * 100)}%)`;
                    }
                });
                xhr.addEventListener('load', () => resolve());
                xhr.addEventListener('error', () => reject());
                xhr.open('POST', '/api/airdrop/upload');
                xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
                xhr.setRequestHeader('X-File-Mime', file.type || 'application/octet-stream');
                xhr.setRequestHeader('X-File-Duration', duration);
                xhr.send(file);
            });
        }

        progress.style.display = 'none';
        e.target.value = '';
        this.refreshAirdrop();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
