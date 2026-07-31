# ============================================================
# 多阶段构建：
#   1) build 阶段：安装全部依赖（含 vite/typescript），执行 vite build
#      把前端源码(src/ + index.html) 编译进 dist/
#   2) runtime 阶段：只装生产依赖(express/cors)，拷贝 server/ + dist/
#      代码只读放在 /app，用户数据写在 /data（卷挂载 ./data:/data）
# ============================================================

# ---- 构建阶段 ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- 运行阶段 ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV DATA_DIR=/data
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --production

COPY server/ ./server/
COPY dist/ ./dist/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD node -e "require('http').get('http://127.0.0.1:3000/',function(r){process.exit(r.statusCode===200?0:1)}).on('error',function(){process.exit(1)})"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "/app/server/index.js"]
