# Servidor Backend - Dinastia Lead Story

## Configuração de Ambiente

### Variáveis de Ambiente

Para executar o servidor, você precisa configurar as variáveis de ambiente:

1. **Copie o arquivo de exemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Preencha as credenciais reais no arquivo `.env`:**

   - **SUPABASE_URL**: URL do seu projeto Supabase
   - **SUPABASE_ANON_KEY**: Chave anônima do Supabase
   - **N8N_WEBHOOK_URL**: URL do webhook do n8n
   - **N8N_AUTHORIZATION_KEY**: Chave de autorização do n8n
   - **PORT**: Porta do servidor (padrão: 3001)

### ⚠️ Segurança

- **NUNCA** commite o arquivo `.env` no Git
- O arquivo `.env` contém credenciais sensíveis
- Use apenas o `.env.example` como referência
- Mantenha suas credenciais seguras e privadas

## Instalação e Execução

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run start:dev

# Executar em modo produção
npm run build
npm run start:prod
```