# 🚀 Instruções de Deploy na Render

## ✅ Correções Aplicadas no Código

As seguintes correções foram implementadas para resolver os erros de build na Render:

### 1. **Exclusão de Arquivos de Teste do Build**
- **Arquivo:** `server/tsconfig.build.json`
- **Alteração:** Adicionada seção `exclude` para ignorar arquivos de teste:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": false
  },
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts", "**/*.spec.ts", "**/*test.ts", "**/*.test.ts"]
}
```

### 2. **Adição de @types/node**
- **Comando executado:** `npm install --save-dev @types/node`
- **Resultado:** Resolve erros de TypeScript relacionados ao objeto `process` e outras APIs do Node.js

## 🔧 Configuração Necessária na Render

### **IMPORTANTE: Configurar Build Command na Render**

Para garantir que as devDependencies sejam instaladas (necessárias para compilação TypeScript), você deve configurar o **Build Command** no dashboard da Render:

#### **Passos:**
1. Acesse o dashboard da Render.com
2. Vá para o seu **Web Service** do backend
3. Clique em **Settings**
4. Encontre o campo **"Build Command"**
5. Configure o comando como:

```bash
npm install --frozen-lockfile && npm run build
```

#### **Por que essa configuração é necessária:**
- `npm install --frozen-lockfile`: Instala TODAS as dependências (incluindo devDependencies) usando o package-lock.json
- `npm run build`: Executa o build do TypeScript
- As devDependencies são necessárias porque contêm o compilador TypeScript e definições de tipos

### **Configurações Recomendadas para o Serviço Backend:**

```
Build Command: npm install --frozen-lockfile && npm run build
Start Command: npm run start
Node Version: 18 (ou superior)
Environment: Node.js
```

## 🚨 **CORREÇÃO CRÍTICA: Start Command**

### **Problema Identificado:**
Se você está enfrentando erro no Start Command, verifique se está usando o comando correto baseado no `package.json` do servidor.

### **Verificação do package.json:**
No arquivo `server/package.json`, os scripts disponíveis são:
```json
"scripts": {
  "start:dev": "ts-node-dev --respawn --transpile-only src/main.ts",
  "build": "tsc -p tsconfig.build.json", 
  "start": "node dist/main.js",
  "test": "jest --passWithNoTests",
  "test:watch": "jest --watch"
}
```

### **Start Command Correto:**
**Use EXATAMENTE este comando na Render:**
```bash
npm run start
```

**OU, alternativamente (comando direto):**
```bash
node dist/main.js
```

### **⚠️ IMPORTANTE:**
- **NÃO use** `npm run start:prod` (este script não existe no projeto)
- **USE** `npm run start` (que executa `node dist/main.js`)
- O arquivo compilado é `main.js`, não `main` (note a extensão `.js`)

### **📋 Passos para Corrigir na Render:**

1. **Acesse o Dashboard da Render**
   - Vá para [render.com](https://render.com) e faça login
   - Encontre seu serviço de backend

2. **Vá para Settings**
   - Clique no seu serviço
   - Clique na aba **"Settings"**

3. **Corrija o Start Command**
   - Encontre o campo **"Start Command"**
   - **Altere de:** `npm run start:prod` 
   - **Para:** `npm run start`

4. **Salve e Deploy**
   - Clique em **"Save Changes"**
   - Clique em **"Manual Deploy"** → **"Deploy latest commit"**

5. **Monitore os Logs**
   - Vá para a aba **"Logs"**
   - Verifique se aparece: `"Starting Nest application..."`
   - Confirme que o servidor está escutando na porta

## 🧪 Validação

Após aplicar as correções e configurar o Build Command:

1. **Faça um deploy manual** na Render
2. **Monitore os logs** do build
3. **Verifique se não há mais erros** relacionados a:
   - `jest`, `it`, `describe`, `expect` (arquivos de teste)
   - `@nestjs/common` (devDependencies)
   - `process` (definições de tipos)

## ✅ Status das Correções

- ✅ **tsconfig.build.json** corrigido para excluir testes
- ✅ **@types/node** adicionado às devDependencies
- ✅ **Build local** testado e funcionando
- ✅ **Alterações commitadas** e enviadas para o repositório
- ⚠️ **Configuração da Render** precisa ser feita manualmente no dashboard

## 🔍 Troubleshooting

Se ainda houver problemas após essas correções:

1. **Verifique os logs** completos do build na Render
2. **Confirme** que o Build Command está configurado corretamente
3. **Verifique** se a versão do Node.js na Render é compatível (18+)
4. **Teste o build localmente** com: `cd server && npm run build`

---

**Commit das correções:** `1261641` - "fix(server): corrigir erros de build na Render"