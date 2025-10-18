# --- Estágio 1: Build do Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Estágio 2: Build do Backend ---
FROM node:20-alpine AS backend-builder
WORKDIR /app
# Copia apenas o workspace do backend
COPY server/ ./server/
RUN npm install --prefix server
RUN npm run build --prefix server

# --- Estágio 3: Produção Final ---
FROM node:20-alpine
WORKDIR /app

# Copia as dependências de produção do backend
COPY server/package*.json ./server/
RUN npm install --prefix server --production

# Copia o build do backend
# O build agora está em /app/server/dist
COPY --from=backend-builder /app/server/dist ./server/dist

# Copia o build do frontend para a pasta 'client' que o NestJS servirá
COPY --from=frontend-builder /app/dist ./server/dist/client

# Expõe a porta que a aplicação usará
EXPOSE 3001

# Comando final para iniciar o servidor NestJS
CMD ["node", "server/dist/main"]