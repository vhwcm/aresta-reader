FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN mkdir -p /app/storage
RUN npm run build
EXPOSE 3003
CMD ["node", "dist/server.js"]
