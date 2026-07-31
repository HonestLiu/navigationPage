# Navigation Page

一个功能丰富的浏览器主页 / 导航页，自带实用工具集和文件空投功能。

![Node](https://img.shields.io/badge/node-%3E%3D14-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## 功能

### 搜索

- 内置 Google、Bing、百度、DuckDuckGo 四个搜索引擎，支持自定义添加
- 输入时实时联想建议（支持中英文）
- 点击切换引擎或通过快捷键选择建议

### 导航

- 按分类管理书签（开发、常用、社交、影音、购物…），支持拖拽排序
- 自定义图标（内置 20+ Font Awesome 图标、上传自定义图片、自动获取网站 Favicon）
- 自定义主题色

### 工具箱（16 个内置工具）

| 工具 | 说明 |
|------|------|
| 时钟 | 实时时钟 + 日期显示 |
| 番茄钟 | 专注 / 短休 / 长休模式，支持通知提醒 |
| 待办清单 | 增删改查，勾选完成 |
| 快捷笔记 | 多笔记管理，支持固定到导航页，可展开全屏编辑 |
| 随机数 | 自定义范围随机数生成 |
| 字数统计 | 字符 / 单词 / 行数实时统计 |
| Base64 | 编码 / 解码 / 一键复制 |
| 密码生成 | 自定义长度、字符集，密码学安全随机 |
| 剪贴板 | 保存常用文本片段，一键复制 |
| 时间戳转换 | Unix 时间戳 ↔ 可读日期，显示当前时间戳 |
| JSON 格式化 | 格式化 / 压缩 / 语法校验 |
| Markdown 预览 | 实时渲染，支持标题、列表、代码块等 |
| 正则测试 | 正则表达式在线测试，高亮匹配结果 |
| 颜色工具 | 取色器 + HEX / RGB / HSL 互转 |
| 文本对比 | 逐行对比两段文本 |
| Lorem Ipsum | 占位文本生成器 |

### 壁纸

- 一键切换必应每日壁纸 / 随机壁纸
- 上传自定义壁纸
- 壁纸历史记录，支持恢复

### 空投（文件传输）

- 拖拽或点击上传文件，局域网内其他设备通过链接下载
- 可设置保留时长（5 分钟 ~ 7 天），到期自动删除
- 支持多文件同时上传

### 设置

- 分类管理（增删改、拖拽排序）
- 站点管理（增删改）
- 搜索引擎管理（自定义添加）
- 页面布局（顶部 / 居中 / 底部）
- 工具管理（开关显示、拖拽排序）
- DNS 映射（自定义域名 → IP，用于局域网设备）
- 数据导入 / 导出 / 重置

### 其他

- 一言（Hitokoto）随机句子展示
- SSE 实时数据同步（多标签页 / 多设备自动同步）
- 深色主题，支持壁纸时自动切换明暗适配

## 快速开始

### 本地运行

```bash
# 安装依赖（含前端 dev 依赖）
npm install
```

**开发模式**（前端热更新，需前后端同时运行）：

```bash
npm run dev    # 前端 Vite 开发服务器 http://localhost:5173（/api 已代理到后端 3000）
npm start      # 另开终端启动后端 Express（http://localhost:3000）
```

**构建后运行**（与 Docker 行为一致）：

```bash
npm run build  # 产出 dist/
npm start      # 启动 Express 托管 dist/，http://localhost:3000
```

访问 http://localhost:3000

### Docker

```bash
# 构建镜像
docker build --no-cache -t navigation-page .

# 运行容器（不持久化，数据在容器内，重启会丢）
docker run -d -p 3000:3000 navigation-page
```

持久化数据（推荐，只需挂载一个卷 `/data`）：

```bash
# 挂载宿主机目录做数据持久化
mkdir -p ~/nav-data
docker run -d -p 3000:3000 -v ~/nav-data:/data navigation-page
```

> **关键**：本应用代码只读放在 `/app`，所有用户数据只写在 `/data`。
> 因此**只需挂载 `/data` 这一个卷**即可持久化；**不要**挂载 `/app` 或 `/app/server`
> （会把镜像里的代码遮掉，容器反复重启并报 `MODULE_NOT_FOUND`）。

> 如果宿主机 3000 端口被占用，换端口映射即可，例如 `-p 3001:3000`。

也可以用 `docker compose up -d`（仓库自带 `docker-compose.yml`，已正确挂载 `/data`）。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务监听端口 |
| `DATA_DIR` | 容器 `/data` / 本地 `__dirname` | 用户数据根目录（data.json、uploads、wallpapers）；容器内部署一般无需设置 |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sse` | Server-Sent Events 实时推送 |
| GET | `/api/kv/:key` | 读取 KV 配置 |
| PUT | `/api/kv/:key` | 写入 KV 配置 |
| GET | `/api/nav` | 获取导航列表 |
| POST | `/api/nav` | 添加导航项 |
| PUT | `/api/nav/:id` | 更新导航项 |
| DELETE | `/api/nav/:id` | 删除导航项 |
| PUT | `/api/nav-order` | 导航项排序 |
| GET | `/api/engines` | 获取搜索引擎列表 |
| POST | `/api/engines` | 添加搜索引擎 |
| PUT | `/api/engines/:id` | 更新搜索引擎 |
| DELETE | `/api/engines/:id` | 删除搜索引擎 |
| GET | `/api/favicon?url=` | 获取网站 Favicon |
| GET | `/api/hitokoto` | 获取一言 |
| POST | `/api/wallpaper/upload` | 上传壁纸 |
| DELETE | `/api/wallpaper/delete/:file` | 删除壁纸 |
| GET | `/api/airdrop` | 获取空投文件列表 |
| POST | `/api/airdrop/upload` | 上传文件到空投 |
| GET | `/api/airdrop/download/:id` | 下载空投文件 |
| DELETE | `/api/airdrop/:id` | 删除空投文件 |
| POST | `/api/reset` | 重置所有数据 |

## 技术栈

- **后端**：Node.js + Express
- **前端**：Vite + TypeScript（模块化源码在 `src/`，构建产物 `dist/` 由 Express 托管）
- **图标**：Font Awesome 6
- **实时通信**：Server-Sent Events (SSE)
- **数据存储**：容器内 JSON 文件（`/data/data.json`；开发与未挂载 `/data` 时回退到 `server/data.json`）

## 项目结构

```
navigationPage/
├── index.html              # Vite 入口（<script type="module" src="/src/main.ts">）
├── css/
│   └── style.css           # 全局样式（经 main.ts import 由 Vite 打包进 dist）
├── src/                    # 前端源码（TypeScript，Vite 编译为 dist/）
│   ├── main.ts             # 入口：引入 Font Awesome + store，调用 App.init
│   ├── app.ts              # 协调器：加载状态、绑定全局事件、调用各模块 init
│   ├── store.ts            # 集中状态 + registerRemoteHandler + initSSE + resolveUrl
│   ├── api.ts              # 后端接口封装
│   ├── theme.ts            # 主题 / 强调色
│   ├── types.ts / dom.ts   # 类型定义 / DOM 工具函数
│   └── features/           # 按功能拆分的模块（各订阅自己关心的 SSE 事件）
│       ├── search.ts       # 搜索与联想
│       ├── engines.ts      # 搜索引擎管理
│       ├── nav.ts          # 导航项 + 分类 + 右键菜单
│       ├── settings.ts     # 设置面板 / 导入导出 / 重置
│       ├── wallpaper.ts    # 壁纸（必应 / 随机 / 上传）
│       ├── airdrop.ts      # 空投文件传输
│       ├── hitokoto.ts     # 一言
│       └── tools/          # 16 个工具模块 + index.ts（initTools / expandTool / closeOverlay）
├── server/                 # 后端（CommonJS，node server/index.js 启动）
│   ├── index.js            # 薄启动层：静态托管 dist/、注册路由、SPA 回退
│   ├── db.js               # 数据目录与读写（DATA_DIR 与代码分离）
│   ├── sse.js              # SSE 广播与连接管理（30s 心跳）
│   ├── services/
│   │   └── favicon.js      # Favicon 抓取与 HTML 解析
│   └── routes/             # 各业务路由（高内聚低耦合）
│       ├── kv.js           # 通用 KV 配置
│       ├── nav.js          # 导航项 CRUD + 排序
│       ├── engines.js      # 搜索引擎 CRUD
│       ├── wallpaper.js    # 壁纸上传 / 删除
│       ├── airdrop.js      # 空投上传 / 下载 / 过期清理
│       └── misc.js         # 一言 / Favicon 代理 / 重置
├── dist/                   # vite build 产物（构建生成，已在 .gitignore）
├── /data/                  # 运行时数据目录（容器挂载点，不在仓库内）
│   ├── data.json           # 导航/配置数据
│   ├── uploads/            # 空投文件
│   └── wallpapers/         # 壁纸文件
├── Dockerfile              # 多阶段构建（vite build -> dist）
├── package.json / tsconfig.json / vite.config.ts
└── README.md
```

## 常见问题

### Docker 启动报 `EADDRINUSE` 端口被占用

**原因**：容器重启时旧的 Node 进程还没完全退出，新进程就启动了，端口被旧进程占用。

**解决**：

```bash
# 方案 1：先停再启（而非 restart）
docker stop <容器名>
docker start <容器名>

# 方案 2：删除重建
docker rm -f <容器名>
docker run -d -p 3000:3000 -v nav-data:/data navigation-page

# 方案 3：无缓存重建镜像后再启动
docker build --no-cache -t navigation-page .
docker rm -f <容器名>
docker run -d -p 3000:3000 -v nav-data:/data navigation-page
```

> 新版本已加入 `SIGTERM` / `SIGINT` 信号处理，`docker restart` 现在可以正常工作。如果仍然遇到此问题，用方案 1 或 2 先停掉旧进程再启动。

### 某些设备上 Docker 启动失败但其他设备正常

通常是 Docker 构建缓存问题。新版本 Dockerfile 已改为显式逐目录复制源码，不再使用 `COPY . .`，可以避免此问题。重新执行 `docker build --no-cache` 即可。

## License

MIT
