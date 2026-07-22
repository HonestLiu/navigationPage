const Storage = {
    KEYS: {
        NAV_ITEMS: 'nav_items',
        ENGINES: 'search_engines',
        CURRENT_ENGINE: 'current_engine',
        WALLPAPER: 'wallpaper',
        WALLPAPER_HISTORY: 'wallpaper_history',
        DATA_VERSION: 'data_version',
        LAYOUT_POSITION: 'layout_position',
        CURRENT_CATEGORY: 'current_category',
        TOOLS_CONFIG: 'tools_config',
        CATEGORY_ORDER: 'category_order',
        DNS_MAP: 'dns_map'
    },
    CURRENT_VERSION: 4,

    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    clear() {
        localStorage.clear();
    },

    ensureDefaults() {
        if (!this.get(this.KEYS.NAV_ITEMS)) {
            this.set(this.KEYS.NAV_ITEMS, this.getDefaultNavItems());
        }
        if (!this.get(this.KEYS.ENGINES)) {
            this.set(this.KEYS.ENGINES, this.getDefaultEngines());
        }
        if (!this.get(this.KEYS.CURRENT_ENGINE)) {
            this.set(this.KEYS.CURRENT_ENGINE, 'google');
        }
        if (!this.get(this.KEYS.LAYOUT_POSITION)) {
            this.set(this.KEYS.LAYOUT_POSITION, 'center');
        }
        if (!this.get(this.KEYS.CURRENT_CATEGORY)) {
            this.set(this.KEYS.CURRENT_CATEGORY, '常用');
        }
        if (!this.get(this.KEYS.TOOLS_CONFIG)) {
            this.set(this.KEYS.TOOLS_CONFIG, this.getDefaultToolsConfig());
        }
        if (!this.get(this.KEYS.DATA_VERSION)) {
            this.set(this.KEYS.DATA_VERSION, this.CURRENT_VERSION);
        }
    },

    getNavItems() {
        return this.get(this.KEYS.NAV_ITEMS) || this.getDefaultNavItems();
    },

    setNavItems(items) {
        return this.set(this.KEYS.NAV_ITEMS, items);
    },

    getCurrentCategory() {
        return this.get(this.KEYS.CURRENT_CATEGORY) || '常用';
    },

    setCurrentCategory(category) {
        return this.set(this.KEYS.CURRENT_CATEGORY, category);
    },

    getCategories() {
        const items = this.getNavItems();
        const catsFromItems = [...new Set(items.map(item => item.category || '常用'))];
        const order = this.getCategoryOrder();
        if (order) {
            const allCats = [...new Set([...order, ...catsFromItems])];
            const ordered = allCats.filter(c => order.includes(c));
            const newCats = allCats.filter(c => !order.includes(c));
            return [...ordered, ...newCats];
        }
        return catsFromItems;
    },

    getEngines() {
        return this.get(this.KEYS.ENGINES) || this.getDefaultEngines();
    },

    setEngines(engines) {
        return this.set(this.KEYS.ENGINES, engines);
    },

    getCurrentEngine() {
        return this.get(this.KEYS.CURRENT_ENGINE) || 'google';
    },

    setCurrentEngine(engineId) {
        return this.set(this.KEYS.CURRENT_ENGINE, engineId);
    },

    getLayoutPosition() {
        return this.get(this.KEYS.LAYOUT_POSITION) || 'center';
    },

    setLayoutPosition(position) {
        return this.set(this.KEYS.LAYOUT_POSITION, position);
    },

    getToolsConfig() {
        return this.get(this.KEYS.TOOLS_CONFIG) || this.getDefaultToolsConfig();
    },

    setToolsConfig(config) {
        return this.set(this.KEYS.TOOLS_CONFIG, config);
    },

    getDefaultToolsConfig() {
        return [
            { id: 'clock', name: '时钟', icon: 'fa-solid fa-clock', enabled: true },
            { id: 'pomodoro', name: '番茄钟', icon: 'fa-solid fa-stopwatch', enabled: true },
            { id: 'todo', name: '待办清单', icon: 'fa-solid fa-list-check', enabled: true },
            { id: 'notes', name: '快捷笔记', icon: 'fa-solid fa-pen-to-square', enabled: true }
        ];
    },

    getCategoryOrder() {
        return this.get(this.KEYS.CATEGORY_ORDER) || null;
    },

    setCategoryOrder(order) {
        return this.set(this.KEYS.CATEGORY_ORDER, order);
    },

    getDnsMap() {
        return this.get(this.KEYS.DNS_MAP) || [];
    },

    setDnsMap(map) {
        return this.set(this.KEYS.DNS_MAP, map);
    },

    resolveUrl(url) {
        const map = this.getDnsMap();
        for (const entry of map) {
            if (url.includes(entry.domain)) {
                return url.replace(entry.domain, entry.ip);
            }
        }
        return url;
    },

    getWallpaper() {
        return this.get(this.KEYS.WALLPAPER) || null;
    },

    setWallpaper(wallpaper) {
        return this.set(this.KEYS.WALLPAPER, wallpaper);
    },

    removeWallpaper() {
        this.remove(this.KEYS.WALLPAPER);
    },

    getWallpaperHistory() {
        return this.get(this.KEYS.WALLPAPER_HISTORY) || [];
    },

    addToWallpaperHistory(wallpaper) {
        const history = this.getWallpaperHistory();
        const exists = history.find(h => h.url === wallpaper.url);
        if (!exists) {
            history.unshift(wallpaper);
            if (history.length > 12) history.pop();
            this.set(this.KEYS.WALLPAPER_HISTORY, history);
        }
    },

    getDefaultNavItems() {
        return [
            { id: 1, name: 'GitHub', url: 'https://github.com', icon: 'fa-brands fa-github', color: '#333', category: '开发' },
            { id: 2, name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'fa-brands fa-stack-overflow', color: '#f48024', category: '开发' },
            { id: 3, name: '掘金', url: 'https://juejin.cn', icon: 'fa-solid fa-gem', color: '#1e80ff', category: '开发' },
            { id: 4, name: 'CSDN', url: 'https://www.csdn.net', icon: 'fa-solid fa-code', color: '#fc5531', category: '开发' },
            { id: 5, name: 'npm', url: 'https://www.npmjs.com', icon: 'fa-brands fa-npm', color: '#cb3837', category: '开发' },
            { id: 6, name: 'V2EX', url: 'https://www.v2ex.com', icon: 'fa-solid fa-comments', color: '#5a9e6f', category: '开发' },
            { id: 7, name: 'Google', url: 'https://www.google.com', icon: 'fa-brands fa-google', color: '#4285f4', category: '常用' },
            { id: 8, name: '百度', url: 'https://www.baidu.com', icon: 'fa-solid fa-paw', color: '#2932e1', category: '常用' },
            { id: 9, name: '知乎', url: 'https://www.zhihu.com', icon: 'fa-solid fa-book', color: '#0066ff', category: '常用' },
            { id: 10, name: 'Twitter', url: 'https://twitter.com', icon: 'fa-brands fa-twitter', color: '#1da1f2', category: '社交' },
            { id: 11, name: '微博', url: 'https://weibo.com', icon: 'fa-brands fa-weibo', color: '#e6162d', category: '社交' },
            { id: 12, name: 'Telegram', url: 'https://t.me', icon: 'fa-brands fa-telegram', color: '#0088cc', category: '社交' },
            { id: 13, name: 'YouTube', url: 'https://www.youtube.com', icon: 'fa-brands fa-youtube', color: '#ff0000', category: '影音' },
            { id: 14, name: 'Bilibili', url: 'https://www.bilibili.com', icon: 'fa-brands fa-bilibili', color: '#fb7299', category: '影音' },
            { id: 15, name: 'Spotify', url: 'https://open.spotify.com', icon: 'fa-brands fa-spotify', color: '#1db954', category: '影音' },
            { id: 16, name: '豆瓣', url: 'https://www.douban.com', icon: 'fa-solid fa-film', color: '#00b51d', category: '影音' },
            { id: 17, name: '淘宝', url: 'https://www.taobao.com', icon: 'fa-solid fa-cart-shopping', color: '#ff5000', category: '购物' },
            { id: 18, name: '京东', url: 'https://www.jd.com', icon: 'fa-solid fa-dog', color: '#e1251b', category: '购物' },
            { id: 19, name: 'Amazon', url: 'https://www.amazon.com', icon: 'fa-brands fa-amazon', color: '#ff9900', category: '购物' },
            { id: 20, name: '什么值得买', url: 'https://www.smzdm.com', icon: 'fa-solid fa-tags', color: '#e4393c', category: '购物' }
        ];
    },

    getDefaultEngines() {
        return [
            { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s', icon: 'fa-brands fa-google', color: '#4285f4' },
            { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s', icon: 'fa-solid fa-magnifying-glass', color: '#00809d' },
            { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=%s', icon: 'fa-solid fa-paw', color: '#2932e1' },
            { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', icon: 'fa-solid fa-duck', color: '#de5833' }
        ];
    },

    exportData() {
        return {
            navItems: this.getNavItems(),
            engines: this.getEngines(),
            currentEngine: this.getCurrentEngine(),
            currentCategory: this.getCurrentCategory(),
            layoutPosition: this.getLayoutPosition(),
            exportTime: new Date().toISOString()
        };
    },

    importData(data) {
        if (data.navItems) this.setNavItems(data.navItems);
        if (data.engines) this.setEngines(data.engines);
        if (data.currentEngine) this.setCurrentEngine(data.currentEngine);
        if (data.currentCategory) this.setCurrentCategory(data.currentCategory);
        if (data.layoutPosition) this.setLayoutPosition(data.layoutPosition);
        return true;
    }
};
