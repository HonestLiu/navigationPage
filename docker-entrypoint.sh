#!/bin/sh
# MyPageHome 容器入口：负责运行时目录准备 + 部署反模式自检
set -e

# 确保运行时需要的目录存在（即使挂载了数据卷也不会缺失）
mkdir -p /app/server/uploads /app/server/wallpapers

# 反模式自检：最常见的「部署起不来」根因 —— 把宿主机目录挂到了 /app 或
# /app/server，把镜像里的代码(含 server/index.js)整个遮掉。
# 此时若直接 node，只会刷一堆 MODULE_NOT_FOUND，毫无头绪。
# 这里先给出明确、可执行的提示。
if [ ! -f /app/server/index.js ]; then
  echo "============================================================" >&2
  echo " ERROR: /app/server/index.js 在容器中不存在！" >&2
  echo " 99% 的原因是部署时把宿主机目录挂到了 /app 或 /app/server，" >&2
  echo " 把镜像内的应用代码遮掉了。" >&2
  echo "" >&2
  echo " 正确做法：只挂载「数据」相关的子路径，例如：" >&2
  echo "   -v \$PWD/uploads:/app/server/uploads" >&2
  echo "   -v \$PWD/wallpapers:/app/server/wallpapers" >&2
  echo "   -v \$PWD/data.json:/app/server/data.json" >&2
  echo " 不要挂载 /app 或 /app/server 整体。" >&2
  echo "============================================================" >&2
  exit 1
fi

# 把后续参数(默认 node /app/server/index.js)原样交给 node 执行
exec "$@"
