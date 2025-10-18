# --- Estágio 1: Build do Frontend (sem alterações) ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Estágio 2: Build do Backend (Lógica Simplificada) ---
FROM node:20-alpine AS backend-builder
# O WORKDIR agora é o diretório do servidor
WORKDIR /app
# Copia os arquivos de dependência do servidor para a raiz do WORKDIR
COPY server/package*.json ./
RUN npm install
# Copia o código-fonte do servidor para a raiz do WORKDIR
COPY server/ ./
RUN npm run build
# O resultado agora estará em /app/dist

# --- Estágio 3: Produção Final (Estrutura Limpa) ---
FROM node:20-alpine
WORKDIR /app

# Copia as dependências de produção do backend
COPY server/package*.json ./
RUN npm install --production

# Copia o build do backend do estágio anterior. O caminho agora é simples.
COPY --from=backend-builder /app/dist ./dist

# Copia o build do frontend para a pasta 'client' que o NestJS servirá
COPY --from=frontend-builder /app/dist ./dist/client

# Expõe a porta que a aplicação usará
EXPOSE 3001

# Comando final com caminho correto
CMD ["node", "dist/src/main.js"]