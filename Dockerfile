FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server/ ./server/
COPY js/ ./js/
COPY css/ ./css/
COPY assets/ ./assets/
COPY index.html ./
RUN mkdir -p server/uploads server/wallpapers
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/ || exit 1
CMD ["sh", "-c", "mkdir -p server/uploads server/wallpapers && node server/index.js"]
