const App = {
    currentCategory: '常用',
    currentPosition: 'center',
    selectedIcon: 'fa-solid fa-link',

    init() {
        Storage.ensureDefaults();
        this.currentCategory = Storage.getCurrentCategory();
        this.currentPosition = Storage.getLayoutPosition();
        this.bindEvents();
        this.renderCategoryTabs();
        this.renderNavItems();
        this.renderEngines();
        this.selectEngine(Storage.getCurrentEngine());
        this.applyLayoutPosition();
        this.initWallpaper();
        this.initClock();
        this.initPomodoro();
        this.initTodo();
        this.initNotes();
        this.applyToolsVisibility();
        this.applyToolsOrder();
    },

    bindEvents() {
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.search();
        });
        document.getElementById('searchBtn').addEventListener('click', () => this.search());

        document.getElementById('engineBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('engineDropdown').classList.toggle('active');
        });
        document.addEventListener('click', () => {
            document.getElementById('engineDropdown').classList.remove('active');
        });

        document.getElementById('settingsFab').addEventListener('click', () => this.toggleSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.toggleSettings());

        document.getElementById('addSiteBtn').addEventListener('click', () => this.openNavModal());
        document.getElementById('addNavItem').addEventListener('click', () => this.openNavModal());
        document.getElementById('addCategory').addEventListener('click', () => this.openCategoryModal());
        document.getElementById('addEngine').addEventListener('click', () => this.openEngineModal());

        document.getElementById('editForm').addEventListener('submit', (e) => this.saveNavItem(e));
        document.getElementById('engineForm').addEventListener('submit', (e) => this.saveEngine(e));
        document.getElementById('categoryForm').addEventListener('submit', (e) => this.saveCategory(e));

        document.getElementById('closeModal').addEventListener('click', () => this.closeModal('editModal'));
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeModal('editModal'));
        document.getElementById('closeEngineModal').addEventListener('click', () => this.closeModal('engineModal'));
        document.getElementById('cancelEngineEdit').addEventListener('click', () => this.closeModal('engineModal'));
        document.getElementById('closeCategoryModal').addEventListener('click', () => this.closeModal('categoryModal'));
        document.getElementById('cancelCategoryEdit').addEventListener('click', () => this.closeModal('categoryModal'));

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
                Storage.setLayoutPosition(this.currentPosition);
                this.applyLayoutPosition();
                this.updatePositionButtons();
            });
        });

        document.getElementById('iconPicker').addEventListener('click', (e) => {
            const option = e.target.closest('.icon-option');
            if (option) {
                document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedIcon = option.dataset.icon;
            }
        });

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        document.getElementById('editColor').addEventListener('input', (e) => {
            document.getElementById('editColorHex').textContent = e.target.value;
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal.id);
            });
        });
    },

    search() {
        const input = document.getElementById('searchInput').value.trim();
        if (!input) return;
        const engine = Storage.getEngines().find(e => e.id === Storage.getCurrentEngine());
        if (engine) {
            window.open(engine.url.replace('%s', encodeURIComponent(input)), '_blank');
        }
    },

    selectEngine(id) {
        Storage.setCurrentEngine(id);
        const engine = Storage.getEngines().find(e => e.id === id);
        if (engine) {
            const icon = document.getElementById('engineIcon');
            const parent = icon.parentNode;
            const newIcon = document.createElement('i');
            newIcon.id = 'engineIcon';
            newIcon.className = engine.icon;
            newIcon.style.cssText = `font-size: 20px; color: ${engine.color};`;
            parent.replaceChild(newIcon, icon);
        }
        this.renderEngineDropdown();
    },

    renderEngineDropdown() {
        const dropdown = document.getElementById('engineDropdown');
        const engines = Storage.getEngines();
        const currentId = Storage.getCurrentEngine();
        dropdown.innerHTML = engines.map(engine => `
            <button class="engine-option ${engine.id === currentId ? 'selected' : ''}" data-id="${engine.id}">
                <i class="${engine.icon}" style="color: ${engine.color};"></i>
                <span>${engine.name}</span>
            </button>
        `).join('');
        dropdown.querySelectorAll('.engine-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectEngine(btn.dataset.id);
                dropdown.classList.remove('active');
            });
        });
    },

    renderEngines() {
        this.renderEngineDropdown();
    },

    renderCategoryTabs() {
        const tabs = document.getElementById('categoryTabs');
        const categories = Storage.getCategories();
        tabs.innerHTML = categories.map(cat => `
            <button class="category-tab ${cat === this.currentCategory ? 'active' : ''}" data-category="${cat}">
                ${cat}
            </button>
        `).join('');
        tabs.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentCategory = tab.dataset.category;
                Storage.setCurrentCategory(this.currentCategory);
                this.renderCategoryTabs();
                this.renderNavItems();
            });
        });
        document.getElementById('currentCategoryTitle').textContent = this.currentCategory;
    },

    renderNavItems() {
        const grid = document.getElementById('navGrid');
        const allItems = Storage.getNavItems();
        const items = allItems.filter(item => (item.category || '常用') === this.currentCategory);
        grid.innerHTML = items.map(item => `
            <a href="${item.url}" class="nav-item" data-id="${item.id}">
                <div class="icon" style="background: ${item.color};">
                    <i class="${item.icon}"></i>
                </div>
                <span class="name">${item.name}</span>
            </a>
        `).join('');
        grid.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(item.href, '_blank');
            });
        });
    },

    applyLayoutPosition() {
        const container = document.querySelector('.container');
        container.classList.remove('position-top', 'position-center', 'position-bottom');
        container.classList.add('position-' + this.currentPosition);
        this.updatePositionButtons();
    },

    updatePositionButtons() {
        document.querySelectorAll('.position-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.position === this.currentPosition);
        });
    },

    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
            this.renderSettingsLists();
        }
    },

    renderSettingsLists() {
        const categoryList = document.getElementById('categoryList');
        const categories = Storage.getCategories();
        const navItems = Storage.getNavItems();
        categoryList.innerHTML = categories.map(cat => {
            const count = navItems.filter(item => (item.category || '常用') === cat).length;
            return `
                <div class="category-row" data-category="${cat}">
                    <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
                    <div class="category-name">${cat}</div>
                    <div class="category-count">${count} 个网站</div>
                    <div class="item-actions">
                        <button class="edit-item" data-category="${cat}"><i class="fas fa-edit"></i></button>
                        <button class="delete-item" data-category="${cat}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
        categoryList.querySelectorAll('.edit-item').forEach(btn => {
            btn.addEventListener('click', () => this.editCategory(btn.dataset.category));
        });
        categoryList.querySelectorAll('.delete-item').forEach(btn => {
            btn.addEventListener('click', () => this.deleteCategory(btn.dataset.category));
        });

        // 分类拖拽排序
        let draggedCat = null;
        categoryList.querySelectorAll('.category-row').forEach(row => {
            row.setAttribute('draggable', 'true');
            row.addEventListener('dragstart', (e) => {
                draggedCat = row;
                row.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (row !== draggedCat) row.classList.add('drag-over');
            });
            row.addEventListener('dragleave', () => {
                row.classList.remove('drag-over');
            });
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('drag-over');
                if (draggedCat && row !== draggedCat) {
                    const cats = Storage.getCategories();
                    const fromCat = draggedCat.dataset.category;
                    const toCat = row.dataset.category;
                    const fromIdx = cats.indexOf(fromCat);
                    const toIdx = cats.indexOf(toCat);
                    const [moved] = cats.splice(fromIdx, 1);
                    cats.splice(toIdx, 0, moved);
                    Storage.setCategoryOrder(cats);
                    this.renderSettingsLists();
                    this.renderCategoryTabs();
                }
            });
            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
                categoryList.querySelectorAll('.category-row').forEach(r => r.classList.remove('drag-over'));
                draggedCat = null;
            });
        });

        const navList = document.getElementById('navItemsList');
        navList.innerHTML = navItems.map(item => `
            <div class="nav-item-row" data-id="${item.id}">
                <div class="item-icon" style="background: ${item.color};">
                    <i class="${item.icon}"></i>
                </div>
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-url">${item.category || '常用'} · ${item.url}</div>
                </div>
                <div class="item-actions">
                    <button class="edit-item" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
        navList.querySelectorAll('.edit-item').forEach(btn => {
            btn.addEventListener('click', () => this.editNavItem(btn.dataset.id));
        });
        navList.querySelectorAll('.delete-item').forEach(btn => {
            btn.addEventListener('click', () => this.deleteNavItem(btn.dataset.id));
        });

        const engineList = document.getElementById('engineList');
        const engines = Storage.getEngines();
        engineList.innerHTML = engines.map(engine => `
            <div class="engine-row" data-id="${engine.id}">
                <div class="item-icon" style="background: ${engine.color};">
                    <i class="${engine.icon}"></i>
                </div>
                <div class="item-info">
                    <div class="item-name">${engine.name}</div>
                    <div class="item-url">${engine.url}</div>
                </div>
                <div class="item-actions">
                    <button class="edit-item" data-id="${engine.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-item" data-id="${engine.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
        engineList.querySelectorAll('.edit-item').forEach(btn => {
            btn.addEventListener('click', () => this.editEngine(btn.dataset.id));
        });
        engineList.querySelectorAll('.delete-item').forEach(btn => {
            btn.addEventListener('click', () => this.deleteEngine(btn.dataset.id));
        });

        // 工具配置列表
        this.renderToolsConfig();
    },

    renderToolsConfig() {
        const list = document.getElementById('toolsConfigList');
        const config = Storage.getToolsConfig();
        list.innerHTML = config.map(tool => `
            <div class="tool-config-row" draggable="true" data-id="${tool.id}">
                <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
                <div class="tool-config-icon"><i class="${tool.icon}"></i></div>
                <span class="tool-config-name">${tool.name}</span>
                <button class="toggle-switch ${tool.enabled ? 'active' : ''}" data-id="${tool.id}"></button>
            </div>
        `).join('');

        // 开关事件
        list.querySelectorAll('.toggle-switch').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const cfg = Storage.getToolsConfig();
                const tool = cfg.find(t => t.id === id);
                if (tool) {
                    tool.enabled = !tool.enabled;
                    Storage.setToolsConfig(cfg);
                    btn.classList.toggle('active', tool.enabled);
                    this.applyToolsVisibility();
                }
            });
        });

        // 拖拽排序
        let draggedItem = null;
        list.querySelectorAll('.tool-config-row').forEach(row => {
            row.addEventListener('dragstart', (e) => {
                draggedItem = row;
                row.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (row !== draggedItem) row.classList.add('drag-over');
            });
            row.addEventListener('dragleave', () => {
                row.classList.remove('drag-over');
            });
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('drag-over');
                if (draggedItem && row !== draggedItem) {
                    const cfg = Storage.getToolsConfig();
                    const fromId = draggedItem.dataset.id;
                    const toId = row.dataset.id;
                    const fromIdx = cfg.findIndex(t => t.id === fromId);
                    const toIdx = cfg.findIndex(t => t.id === toId);
                    const [moved] = cfg.splice(fromIdx, 1);
                    cfg.splice(toIdx, 0, moved);
                    Storage.setToolsConfig(cfg);
                    this.renderToolsConfig();
                    this.applyToolsOrder();
                }
            });
            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
                list.querySelectorAll('.tool-config-row').forEach(r => r.classList.remove('drag-over'));
                draggedItem = null;
            });
        });
    },

    applyToolsVisibility() {
        const config = Storage.getToolsConfig();
        config.forEach(tool => {
            const el = document.getElementById('tool-' + tool.id);
            if (el) el.style.display = tool.enabled ? '' : 'none';
        });
    },

    applyToolsOrder() {
        const config = Storage.getToolsConfig();
        const section = document.querySelector('.tools-section');
        config.forEach(tool => {
            const el = document.getElementById('tool-' + tool.id);
            if (el) section.appendChild(el);
        });
    },

    openNavModal(item) {
        document.getElementById('modalTitle').textContent = item ? '编辑导航项' : '添加导航项';
        document.getElementById('editId').value = item ? item.id : '';
        document.getElementById('editName').value = item ? item.name : '';
        document.getElementById('editUrl').value = item ? item.url : '';
        document.getElementById('editColor').value = item ? item.color : '#6366f1';
        document.getElementById('editColorHex').textContent = item ? item.color : '#6366f1';
        const categorySelect = document.getElementById('editCategory');
        const categories = Storage.getCategories();
        categorySelect.innerHTML = '<option value="" disabled' + (!item ? ' selected' : '') + '>请选择分类</option>' +
            categories.map(cat =>
                '<option value="' + cat + '" ' + (item && item.category === cat ? 'selected' : '') + '>' + cat + '</option>'
            ).join('');
        if (item) categorySelect.value = item.category;
        this.selectedIcon = item ? item.icon : 'fa-solid fa-link';
        document.querySelectorAll('.icon-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.icon === this.selectedIcon);
        });
        document.getElementById('editModal').classList.add('active');
    },

    editNavItem(id) {
        const item = Storage.getNavItems().find(i => i.id == id);
        if (item) this.openNavModal(item);
    },

    saveNavItem(e) {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const items = Storage.getNavItems();
        const newItem = {
            id: id ? parseInt(id) : Date.now(),
            name: document.getElementById('editName').value,
            url: document.getElementById('editUrl').value,
            icon: this.selectedIcon,
            color: document.getElementById('editColor').value,
            category: document.getElementById('editCategory').value
        };
        if (id) {
            const index = items.findIndex(i => i.id == id);
            if (index !== -1) items[index] = newItem;
        } else {
            items.push(newItem);
        }
        Storage.setNavItems(items);
        this.renderCategoryTabs();
        this.renderNavItems();
        this.renderSettingsLists();
        this.closeModal('editModal');
    },

    deleteNavItem(id) {
        if (!confirm('确定删除这个导航项吗？')) return;
        const items = Storage.getNavItems().filter(i => i.id != id);
        Storage.setNavItems(items);
        this.renderNavItems();
        this.renderSettingsLists();
    },

    openCategoryModal(category) {
        document.getElementById('categoryModalTitle').textContent = category ? '编辑分类' : '添加分类';
        document.getElementById('categoryEditId').value = category || '';
        document.getElementById('categoryEditName').value = category || '';
        document.getElementById('categoryModal').classList.add('active');
    },

    editCategory(category) {
        this.openCategoryModal(category);
    },

    saveCategory(e) {
        e.preventDefault();
        const oldName = document.getElementById('categoryEditId').value;
        const newName = document.getElementById('categoryEditName').value.trim();
        if (!newName) return;
        const categories = Storage.getCategories();
        const items = Storage.getNavItems();
        if (oldName) {
            if (oldName !== newName && categories.includes(newName)) {
                alert('分类名称已存在');
                return;
            }
            items.forEach(item => {
                if (item.category === oldName) item.category = newName;
            });
            if (this.currentCategory === oldName) {
                this.currentCategory = newName;
                Storage.setCurrentCategory(newName);
            }
            const order = Storage.getCategoryOrder();
            if (order) {
                const idx = order.indexOf(oldName);
                if (idx !== -1) order[idx] = newName;
                Storage.setCategoryOrder(order);
            }
        } else {
            if (categories.includes(newName)) {
                alert('分类名称已存在');
                return;
            }
            const order = Storage.getCategoryOrder() || categories;
            order.push(newName);
            Storage.setCategoryOrder(order);
        }
        Storage.setNavItems(items);
        this.renderCategoryTabs();
        this.renderNavItems();
        this.renderSettingsLists();
        this.closeModal('categoryModal');
    },

    deleteCategory(category) {
        const items = Storage.getNavItems();
        const categoryItems = items.filter(item => (item.category || '常用') === category);
        if (categoryItems.length > 0) {
            if (!confirm('分类"' + category + '"下有 ' + categoryItems.length + ' 个网站，删除分类将把它们移到"常用"，是否继续？')) return;
            items.forEach(item => {
                if ((item.category || '常用') === category) item.category = '常用';
            });
            Storage.setNavItems(items);
        }
        const order = Storage.getCategoryOrder();
        if (order) {
            const idx = order.indexOf(category);
            if (idx !== -1) order.splice(idx, 1);
            Storage.setCategoryOrder(order);
        }
        if (this.currentCategory === category) {
            this.currentCategory = '常用';
            Storage.setCurrentCategory('常用');
        }
        this.renderCategoryTabs();
        this.renderNavItems();
        this.renderSettingsLists();
    },

    openEngineModal(engine) {
        document.getElementById('engineModalTitle').textContent = engine ? '编辑搜索引擎' : '添加搜索引擎';
        document.getElementById('engineEditId').value = engine ? engine.id : '';
        document.getElementById('engineEditName').value = engine ? engine.name : '';
        document.getElementById('engineEditUrl').value = engine ? engine.url : '';
        document.getElementById('engineEditIcon').value = engine ? engine.icon : 'fa-solid fa-magnifying-glass';
        document.getElementById('engineEditColor').value = engine ? engine.color : '#6366f1';
        document.getElementById('engineModal').classList.add('active');
    },

    editEngine(id) {
        const engine = Storage.getEngines().find(e => e.id === id);
        if (engine) this.openEngineModal(engine);
    },

    saveEngine(e) {
        e.preventDefault();
        const id = document.getElementById('engineEditId').value;
        const engines = Storage.getEngines();
        const newEngine = {
            id: id || document.getElementById('engineEditName').value.toLowerCase().replace(/\s/g, ''),
            name: document.getElementById('engineEditName').value,
            url: document.getElementById('engineEditUrl').value,
            icon: document.getElementById('engineEditIcon').value || 'fa-solid fa-magnifying-glass',
            color: document.getElementById('engineEditColor').value
        };
        if (id) {
            const index = engines.findIndex(e => e.id === id);
            if (index !== -1) engines[index] = newEngine;
        } else {
            engines.push(newEngine);
        }
        Storage.setEngines(engines);
        this.renderEngines();
        this.renderSettingsLists();
        this.closeModal('engineModal');
    },

    deleteEngine(id) {
        if (!confirm('确定删除这个搜索引擎吗？')) return;
        const engines = Storage.getEngines().filter(e => e.id !== id);
        Storage.setEngines(engines);
        if (Storage.getCurrentEngine() === id) {
            Storage.setCurrentEngine(engines[0]?.id || 'google');
        }
        this.renderEngines();
        this.renderSettingsLists();
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    },

    exportConfig() {
        const data = Storage.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'navigation-config-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    importConfig(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (confirm('导入将覆盖当前配置，是否继续？')) {
                    Storage.importData(data);
                    this.currentCategory = Storage.getCurrentCategory();
                    this.currentPosition = Storage.getLayoutPosition();
                    this.renderCategoryTabs();
                    this.renderNavItems();
                    this.renderEngines();
                    this.renderSettingsLists();
                    this.selectEngine(Storage.getCurrentEngine());
                    this.applyLayoutPosition();
                    alert('导入成功！');
                }
            } catch (err) {
                alert('导入失败：文件格式错误');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    resetData() {
        if (!confirm('确定要重置所有数据吗？此操作不可恢复！')) return;
        Storage.clear();
        Storage.ensureDefaults();
        this.currentCategory = '常用';
        this.currentPosition = 'center';
        this.renderCategoryTabs();
        this.renderNavItems();
        this.renderEngines();
        this.renderSettingsLists();
        this.selectEngine(Storage.getCurrentEngine());
        this.applyLayoutPosition();
        this.resetWallpaper();
        alert('已重置为默认配置');
    },

    initWallpaper() {
        const wallpaper = Storage.getWallpaper();
        if (wallpaper && wallpaper.url) {
            document.body.style.backgroundImage = 'url(' + wallpaper.url + ')';
            document.body.classList.add('wallpaper-active');
        }
        this.updateWallpaperPreview();
        this.renderWallpaperHistory();
    },

    toggleWallpaperPanel() {
        const panel = document.getElementById('wallpaperPanel');
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
            this.updateWallpaperPreview();
            this.renderWallpaperHistory();
        }
    },

    updateWallpaperPreview() {
        const wallpaper = Storage.getWallpaper();
        const preview = document.getElementById('currentWallpaperPreview');
        if (wallpaper && wallpaper.url) {
            preview.src = wallpaper.url;
        } else {
            preview.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect fill="#667eea" width="400" height="200"/><text fill="white" font-family="Arial" font-size="20" text-anchor="middle" x="200" y="105">默认渐变背景</text></svg>');
        }
    },

    async fetchBingWallpaper() {
        try {
            const response = await fetch('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN');
            const data = await response.json();
            const imageUrl = 'https://cn.bing.com' + data.images[0].url.split('&')[0];
            document.body.style.backgroundImage = 'url(' + imageUrl + ')';
            document.body.classList.add('wallpaper-active');
            Storage.setWallpaper({ url: imageUrl, timestamp: Date.now() });
            Storage.addToWallpaperHistory({ url: imageUrl, name: data.images[0].copyright });
            this.renderWallpaperHistory();
            this.updateWallpaperPreview();
        } catch (error) {
            alert('获取壁纸失败，请稍后重试');
        }
    },

    async fetchRandomBingWallpaper() {
        try {
            const randomIndex = Math.floor(Math.random() * 8);
            const response = await fetch('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=' + randomIndex + '&n=1&mkt=zh-CN');
            const data = await response.json();
            const imageUrl = 'https://cn.bing.com' + data.images[0].url.split('&')[0];
            document.body.style.backgroundImage = 'url(' + imageUrl + ')';
            document.body.classList.add('wallpaper-active');
            Storage.setWallpaper({ url: imageUrl, timestamp: Date.now() });
            Storage.addToWallpaperHistory({ url: imageUrl, name: data.images[0].copyright });
            this.renderWallpaperHistory();
            this.updateWallpaperPreview();
        } catch (error) {
            alert('获取壁纸失败，请稍后重试');
        }
    },

    uploadWallpaper(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            document.body.style.backgroundImage = 'url(' + event.target.result + ')';
            document.body.classList.add('wallpaper-active');
            Storage.setWallpaper({ url: event.target.result, timestamp: Date.now() });
            Storage.addToWallpaperHistory({ url: event.target.result, name: file.name });
            this.renderWallpaperHistory();
            this.updateWallpaperPreview();
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    },

    resetWallpaper() {
        document.body.style.backgroundImage = '';
        document.body.classList.remove('wallpaper-active');
        Storage.removeWallpaper();
        this.updateWallpaperPreview();
    },

    renderWallpaperHistory() {
        const history = Storage.getWallpaperHistory();
        const currentWallpaper = Storage.getWallpaper();
        const grid = document.querySelector('.history-grid');
        if (history.length === 0) {
            document.getElementById('wallpaperHistory').style.display = 'none';
            return;
        }
        document.getElementById('wallpaperHistory').style.display = 'block';
        grid.innerHTML = history.map(item => {
            const isActive = currentWallpaper && currentWallpaper.url === item.url;
            return '<div class="history-item ' + (isActive ? 'active' : '') + '" data-url="' + item.url + '"><img src="' + item.url + '" alt="' + (item.name || '壁纸') + '"></div>';
        }).join('');
        grid.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                document.body.style.backgroundImage = 'url(' + url + ')';
                document.body.classList.add('wallpaper-active');
                Storage.setWallpaper({ url: url, timestamp: Date.now() });
                this.renderWallpaperHistory();
                this.updateWallpaperPreview();
            });
        });
    },

    // ===== 时钟 =====
    initClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    },

    updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        document.getElementById('clockTime').textContent = hours + ':' + minutes + ':' + seconds;

        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const weekday = weekdays[now.getDay()];
        document.getElementById('clockDate').textContent = year + '年' + month + '月' + date + '日 星期' + weekday;
    },

    // ===== 番茄钟 =====
    pomodoroInterval: null,
    pomodoroTime: 25 * 60,
    pomodoroTotal: 25 * 60,
    pomodoroRunning: false,

    initPomodoro() {
        document.getElementById('pomodoroStart').addEventListener('click', () => this.startPomodoro());
        document.getElementById('pomodoroPause').addEventListener('click', () => this.pausePomodoro());
        document.getElementById('pomodoroReset').addEventListener('click', () => this.resetPomodoro());
        document.querySelectorAll('.pomodoro-mode').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.pomodoroRunning) return;
                document.querySelectorAll('.pomodoro-mode').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.pomodoroTotal = parseInt(btn.dataset.minutes) * 60;
                this.pomodoroTime = this.pomodoroTotal;
                this.updatePomodoroDisplay();
            });
        });
    },

    startPomodoro() {
        if (this.pomodoroRunning) return;
        this.pomodoroRunning = true;
        document.getElementById('pomodoroStart').style.display = 'none';
        document.getElementById('pomodoroPause').style.display = 'flex';
        this.pomodoroInterval = setInterval(() => {
            this.pomodoroTime--;
            this.updatePomodoroDisplay();
            if (this.pomodoroTime <= 0) {
                this.pausePomodoro();
                if (Notification.permission === 'granted') {
                    new Notification('番茄钟', { body: '时间到！休息一下吧' });
                }
            }
        }, 1000);
    },

    pausePomodoro() {
        this.pomodoroRunning = false;
        clearInterval(this.pomodoroInterval);
        document.getElementById('pomodoroStart').style.display = 'flex';
        document.getElementById('pomodoroPause').style.display = 'none';
    },

    resetPomodoro() {
        this.pausePomodoro();
        this.pomodoroTime = this.pomodoroTotal;
        this.updatePomodoroDisplay();
    },

    updatePomodoroDisplay() {
        const minutes = String(Math.floor(this.pomodoroTime / 60)).padStart(2, '0');
        const seconds = String(this.pomodoroTime % 60).padStart(2, '0');
        document.getElementById('pomodoroDisplay').textContent = minutes + ':' + seconds;
        const progress = ((this.pomodoroTotal - this.pomodoroTime) / this.pomodoroTotal) * 100;
        document.getElementById('pomodoroBar').style.width = progress + '%';
    },

    // ===== 待办清单 =====
    todos: [],

    initTodo() {
        this.todos = Storage.get('todo_list') || [];
        this.renderTodos();
        document.getElementById('todoAddBtn').addEventListener('click', () => this.addTodo());
        document.getElementById('todoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
    },

    addTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();
        if (!text) return;
        this.todos.push({ id: Date.now(), text: text, done: false });
        Storage.set('todo_list', this.todos);
        input.value = '';
        this.renderTodos();
    },

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) todo.done = !todo.done;
        Storage.set('todo_list', this.todos);
        this.renderTodos();
    },

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        Storage.set('todo_list', this.todos);
        this.renderTodos();
    },

    renderTodos() {
        const list = document.getElementById('todoList');
        const count = this.todos.filter(t => !t.done).length;
        document.getElementById('todoCount').textContent = count;
        list.innerHTML = this.todos.map(todo => `
            <div class="todo-item">
                <div class="todo-checkbox ${todo.done ? 'checked' : ''}" data-id="${todo.id}"></div>
                <span class="todo-text ${todo.done ? 'done' : ''}">${todo.text}</span>
                <button class="todo-delete" data-id="${todo.id}"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
        list.querySelectorAll('.todo-checkbox').forEach(cb => {
            cb.addEventListener('click', () => this.toggleTodo(parseInt(cb.dataset.id)));
        });
        list.querySelectorAll('.todo-delete').forEach(btn => {
            btn.addEventListener('click', () => this.deleteTodo(parseInt(btn.dataset.id)));
        });
    },

    // ===== 快捷笔记 =====
    initNotes() {
        const noteArea = document.getElementById('noteArea');
        const status = document.getElementById('noteStatus');
        noteArea.value = Storage.get('quick_note') || '';
        let saveTimeout;
        noteArea.addEventListener('input', () => {
            status.textContent = '输入中...';
            status.style.opacity = '1';
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                Storage.set('quick_note', noteArea.value);
                status.textContent = '已保存';
                setTimeout(() => { status.style.opacity = '0.6'; }, 1000);
            }, 800);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
