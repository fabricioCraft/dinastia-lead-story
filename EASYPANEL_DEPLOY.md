# Deploy no EasyPanel - Dinastia Lead Story

Este guia contém todas as instruções para fazer o deploy da aplicação `dinastia-lead-story` no EasyPanel.

## 📋 Pré-requisitos

- Conta no EasyPanel
- Variáveis de ambiente configuradas (ver seção abaixo)
- Arquivo ZIP do projeto

## 🚀 Configuração do Deploy

### 1. Preparação do Arquivo ZIP

Crie um arquivo ZIP contendo todo o projeto, incluindo:
- `Dockerfile` (na raiz)
- `.dockerignore` (na raiz)
- Pasta `src/` (frontend React)
- Pasta `server/` (backend NestJS)
- Arquivos de configuração (`package.json`, `tsconfig.json`, etc.)

### 2. Configuração no EasyPanel

#### Configurações Básicas:
- **Nome da Aplicação**: `dinastia-lead-story`
- **Porta**: `3001`
- **Dockerfile**: `Dockerfile` (na raiz do projeto)

#### Variáveis de Ambiente Obrigatórias:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# n8n Integration Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/leads1
N8N_AUTHORIZATION_KEY=your_n8n_authorization_key_here

# Server Configuration
PORT=3001
NODE_ENV=production
```

### 3. Arquitetura do Deploy

A aplicação utiliza um **Dockerfile unificado** com múltiplos estágios:

1. **Estágio 1**: Build do Frontend (React/Vite)
2. **Estágio 2**: Build do Backend (NestJS/TypeScript)
3. **Estágio 3**: Produção Final (Node.js Alpine)

### 4. Como Funciona

- O backend NestJS serve tanto a API (`/api/*`) quanto os arquivos estáticos do frontend
- O frontend é buildado e copiado para `server/dist/client`
- O `ServeStaticModule` do NestJS serve os arquivos do React
- Todas as rotas não-API redirecionam para `index.html` (suporte ao React Router)

### 5. Estrutura Final no Container

```
/app/
├── server/
│   ├── dist/
│   │   ├── main.js          # Aplicação NestJS
│   │   └── client/          # Build do React
│   │       ├── index.html
│   │       ├── assets/
│   │       └── ...
│   └── node_modules/        # Dependências de produção
```

### 6. Endpoints Disponíveis

Após o deploy, a aplicação estará disponível em:
- **Frontend**: `https://your-domain.com/`
- **API**: `https://your-domain.com/api/`
- **Health Check**: `https://your-domain.com/api/dashboard/daily-lead-volume`

### 7. Troubleshooting

#### Problemas Comuns:

1. **Erro 404 em rotas do React**:
   - Verifique se o `ServeStaticModule` está configurado corretamente
   - Confirme que `exclude: ['/api*']` está presente

2. **Erro de conexão com banco**:
   - Verifique as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY`
   - Confirme que o Supabase está acessível

3. **Build falha**:
   - Verifique se todas as dependências estão no `package.json`
   - Confirme que o `.dockerignore` não está excluindo arquivos necessários

### 8. Monitoramento

Para verificar se a aplicação está funcionando:
1. Acesse a URL principal (deve carregar o dashboard)
2. Teste a API: `GET /api/dashboard/daily-lead-volume`
3. Verifique os logs no painel do EasyPanel

### 9. Atualizações

Para atualizar a aplicação:
1. Faça as alterações no código
2. Crie um novo arquivo ZIP
3. Faça o upload no EasyPanel
4. Rebuild da aplicação

## 📝 Notas Importantes

- A aplicação roda em uma única porta (3001)
- O frontend e backend são servidos pelo mesmo processo
- Todas as configurações de CORS são desnecessárias (mesmo domínio)
- O build é otimizado para produção com imagem Alpine Linux