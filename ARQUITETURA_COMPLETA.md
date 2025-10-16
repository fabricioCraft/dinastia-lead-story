# **Arquitetura Completa - Dashboard DinastIA**

## **1. Visão Geral da Arquitetura**

O sistema é composto por três componentes principais:
- **Frontend (Vite + React):** Interface do usuário construída com React 18, TypeScript e Vite como bundler. Responsável pela visualização dos dados e interações do usuário.
- **Backend (NestJS):** API RESTful que atua como intermediário seguro e camada de processamento. Implementa padrões de arquitetura limpa com módulos, controllers e services.
- **Banco de Dados (Supabase):** PostgreSQL hospedado no Supabase onde os dados processados e snapshots são persistidos.
- **Integração N8N:** Sistema de automação que processa e normaliza dados de múltiplas fontes (Kommo CRM, leads externos).

**Fluxo Geral:** Frontend ↔︎ API Backend ↔︎ Supabase + N8N Webhooks

## **2. Arquitetura do Frontend**

**Framework e Tecnologias:**
- **React 18** com **Vite.js** como bundler e dev server
- **TypeScript** para tipagem estática
- **Tailwind CSS** para estilização com abordagem mobile-first
- **Shadcn/UI + Radix UI** para componentes de interface
- **React Router DOM** para roteamento (SPA com fallback 404)

**Gerenciamento de Dados:**
- **React Query (@tanstack/react-query):** Gerencia todas as chamadas à API com cache inteligente, estados de loading/error e refetch automático
- **React Context API:** `FilterContext` centraliza o estado global dos filtros de data, garantindo sincronização entre todos os componentes

**Estrutura de Componentes:**
```
src/
├── components/
│   ├── ui/ (Shadcn components)
│   ├── charts/ (Recharts visualizations)
│   ├── DateRangePicker.tsx
│   └── KpiCard.tsx
├── contexts/
│   └── FilterContext.tsx
├── hooks/
│   ├── useUnifiedOriginSummary.ts
│   ├── useDailyLeadVolume.ts
│   └── useUtmOriginData.ts
├── pages/
│   ├── Index.tsx (Dashboard principal)
│   └── NotFound.tsx
└── App.tsx (Provider setup)
```

**Estratégia de Cache Frontend:**
- React Query: 5 minutos de staleTime, refetch automático a cada 10 minutos
- Invalidação automática quando filtros mudam
- Cache persistente durante a sessão do usuário

## **3. Arquitetura do Backend**

**Framework:** NestJS (Node.js) com TypeScript

**Padrão de Arquitetura:** Modular com separação clara de responsabilidades
- **Controllers:** Expõem endpoints da API REST (ex: `/api/dashboard/daily-lead-volume`)
- **Services:** Contêm lógica de negócio e integração com dados
- **Modules:** Organizam funcionalidades relacionadas (DashboardModule, FunnelModule, KommoModule)

**Estrutura Principal:**
```
server/src/
├── dashboard/
│   ├── dashboard.controller.ts
│   ├── dashboard.service.ts
│   └── dashboard.module.ts
├── services/
│   ├── supabase.service.ts
│   ├── n8n-analytics.service.ts
│   ├── kommo.service.ts
│   └── dashboard-persistence.service.ts
├── funnel/
└── kommo/
```

**Endpoints Principais:**
- `GET /api/dashboard/daily-lead-volume` - Volume diário de leads
- `GET /api/dashboard/unified-origin-summary` - Origem unificada dos leads
- `GET /api/dashboard/daily-appointments` - Agendamentos diários
- `GET /api/dashboard/campaign-summary` - Resumo de campanhas
- `GET /api/dashboard/time-in-stage` - Tempo por estágio do funil

## **4. Fluxo de Dados Detalhado e Estratégias de Cache**

O sistema utiliza duas fontes de dados principais, cada uma com sua própria estratégia de sincronização e cache.

### **A) Dados do Kommo (Funil de Vendas, Velocidade da Jornada)**

**Worker de Sincronização (KommoSyncWorker):**
- **Gatilho:** Um `@Cron` job agendado para rodar duas vezes ao dia (7h e 14h BRT)
- **Lógica:** O worker é responsável por fazer o trabalho pesado de se conectar à API do Kommo. Ele executa a "Estratégia Unificada":
  - **Backfill (Manual):** Um endpoint (`/kommo/backfill...`) usa a API de Eventos do Kommo para reconstruir o histórico de duração de todos os leads e popular a tabela `lead_stage_durations`
  - **Sync Contínuo (Automático):** O cron job usa a API de Leads do Kommo para comparar snapshots, detectar mudanças de status e atualizar as tabelas `kommo_leads_snapshot` e `lead_stage_durations`

**Endpoints da API (ex: `/funnel/time-in-stage`):**
- **Chamada:** São chamados pelo frontend quando a página carrega ou o filtro muda
- **Lógica:** Estes endpoints NÃO falam com a API do Kommo. Eles executam queries SQL rápidas e agregadas diretamente nas tabelas de snapshot do Supabase
- **Cache do Servidor:** Os resultados são cacheados no backend com um TTL longo (ex: 6 horas) usando o `@CacheTTL` do NestJS. Isso garante que, entre as sincronizações do worker, todas as chamadas à API sejam instantâneas

### **B) Dados do N8N (Origem dos Leads)**

**Worker (Externo):** Um fluxo do N8N é o responsável por buscar e processar os dados de origem. Ele roda em seu próprio agendamento.

**Endpoint de Escrita (`POST /n8n/update-px-leads-cache`):**
- **Chamada:** É chamado pelo N8N no final de seu fluxo
- **Lógica:** Recebe os dados brutos do N8N e faz o upsert na tabela `px_leads` do Supabase

**Endpoint de Leitura (`GET /dashboard/campaign-summary`):**
- **Chamada:** É chamado pelo frontend
- **Lógica:** Executa uma query SQL com `GROUP BY` e `COUNT` na tabela `px_leads`, aplicando os filtros de data (`startDate`, `endDate`) na cláusula `WHERE`
- **Cache do Servidor:** Usa um cache dinâmico onde a chave inclui os parâmetros de data (`@CacheKey('...'+startDate+endDate)`). Isso garante que cada intervalo de tempo selecionado tenha seu próprio cache

## **5. Fluxo de Interação do Usuário (Exemplo: Filtro de Data)**

1. O usuário seleciona um novo período no componente `DateRangePicker`
2. O `FilterContext` do React é atualizado com as novas datas
3. A chave do `useQuery` em cada gráfico muda (ex: de `['timeInStage', 'data_antiga']` para `['timeInStage', 'data_nova']`)
4. O React Query automaticamente dispara novas chamadas para todos os endpoints relevantes, agora com os novos parâmetros de query (ex: `...?startDate=...&endDate=...`)
5. O backend NestJS recebe as requisições, verifica o cache (provavelmente um "Cache Miss"), executa as queries SQL filtradas no Supabase, salva o novo resultado em um novo cache dinâmico e retorna os dados
6. Os gráficos no frontend são re-renderizados com os novos dados

## **6. Integração de Dados e Fontes**

**Fontes de Dados:**
1. **Supabase (PostgreSQL):**
   - Tabela `leads2`: Dados principais de leads
   - Tabela `MR_base_leads`: Dados de campanhas UTM
   - Tabela `kommo_leads_snapshot`: Snapshot do CRM Kommo
   - Tabela `px_leads`: Dados processados de leads
   - Tabela `lead_stage_durations`: Histórico de duração por estágio

2. **N8N Webhooks:**
   - Processamento e normalização de dados em tempo real
   - Agregação de múltiplas fontes
   - Fallback para dados mock em caso de indisponibilidade

3. **Kommo CRM:**
   - Sincronização bi-diária (7h e 14h BRT)
   - Worker assíncrono para processamento em background
   - Upsert em chunks para otimização de performance

**Fluxo de Dados:**
```
Kommo CRM → KommoSyncWorker → Supabase (snapshots)
N8N Automation → Webhook → N8nAnalyticsService → px_leads
Frontend → React Query → Backend API → Services → Supabase (queries)
```

## **7. Normalização e Processamento**

**Unificação de Origens:**
- Combina dados de `leads2.origem` e `MR_base_leads.utm_campaign`
- Regras de normalização para agrupar variações similares
- Mapeamento inteligente de campanhas (ex: "Isca Hormozi" agrupa múltiplas variações)

**Filtros Temporais:**
- Suporte a períodos predefinidos (7, 14, 21, 30 dias)
- Filtros customizados com seleção de data range
- Aplicação consistente em todos os endpoints com parâmetros `startDate`/`endDate` ou `from`/`to`

## **8. Performance e Otimizações**

**Frontend:**
- Lazy loading de componentes não críticos
- Suspense boundaries para loading states
- Otimização de imagens (WebP, lazy loading)
- Paginação em gráficos com muitos dados

**Backend:**
- Cache em múltiplas camadas (NestJS + potencial Redis)
- Processamento em chunks para grandes volumes
- Queries SQL otimizadas com índices apropriados
- Workers assíncronos para tarefas pesadas

**Banco de Dados:**
- Índices em colunas de data para filtros temporais
- Particionamento por data em tabelas grandes
- Snapshots para reduzir carga em APIs externas

## **9. Estratégias de Cache Detalhadas**

**Cache Backend (NestJS):**
- **TTL Diferenciado:**
  - Dados agregados: 1 hora (3600s)
  - Dados de origem: 6 horas (21600s) - alinhado com sincronização bi-diária
  - Dados de funil: 6 horas (alinhado com sync do Kommo)

- **Cache Dinâmico:**
  - Chaves incluem parâmetros de filtro: `@CacheKey('endpoint_name' + startDate + endDate)`
  - Invalidação automática por TTL
  - Cache Miss resulta em query SQL + novo cache

**Cache Frontend (React Query):**
- **staleTime:** 5 minutos
- **refetchInterval:** 10 minutos
- **Invalidação:** Automática quando filtros mudam
- **Persistência:** Durante sessão do usuário

## **10. Monitoramento e Observabilidade**

**Logs Estruturados:**
- Logger do NestJS com diferentes níveis
- Tracking de performance de queries
- Monitoramento de falhas de sincronização

**Métricas de Cache:**
- Hit/miss ratio do cache
- TTL effectiveness
- Performance de endpoints

## **11. Segurança e Configuração**

**Variáveis de Ambiente:**
- `SUPABASE_URL` e `SUPABASE_ANON_KEY` para conexão com banco
- `N8N_WEBHOOK_URL` para integração
- `KOMMO_*` para credenciais do CRM
- Configuração de CORS para comunicação frontend-backend

**Validação:**
- Validação de parâmetros de query nos controllers
- Sanitização de dados de entrada
- Tratamento de erros com fallbacks apropriados

## **12. Testes E2E Validados**

**Cenários Testados:**
1. **Carregamento da Página:** Verificação de renderização de elementos principais e carregamento de KPIs iniciais
2. **Filtros de Data:** Validação de aplicação de filtros e interceptação de requisições de rede com parâmetros corretos
3. **Navegação:** Confirmação de roteamento funcional (404 para rotas inexistentes)

**Ferramentas:** Playwright integrado via MCP para automação de testes de interface

---

**Conclusão:** O sistema implementa uma arquitetura robusta e escalável, com separação clara de responsabilidades, cache inteligente em múltiplas camadas, e integração eficiente entre múltiplas fontes de dados. A combinação de React Query no frontend e NestJS no backend, junto com workers especializados para sincronização, garante uma experiência de usuário fluida com dados sempre atualizados e performance otimizada.