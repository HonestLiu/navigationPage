FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p server/uploads server/wallpapers
EXPOSE 3000
CMD ["node", "server/index.js"]
