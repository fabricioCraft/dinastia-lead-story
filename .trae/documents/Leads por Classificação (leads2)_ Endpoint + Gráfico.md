## Objetivo
Criar um endpoint que agrega `leads2` por `classificacao_do_lead` e um gráfico React que exibe essa distribuição com alto desempenho e cache.

## Backend
### Serviço
- Adicionar método: `getLeadsByClassification(): Promise<{ classification_name: string; lead_count: number }[]>`.
- Query principal:
  ```sql
  SELECT 
    classificacao_do_lead AS classification_name,
    COUNT(chatid) AS lead_count
  FROM public.leads2
  WHERE classificacao_do_lead IS NOT NULL AND classificacao_do_lead <> ''
  GROUP BY classificacao_do_lead
  ORDER BY lead_count DESC;
  ```
- Execução:
  - Tentar `client.rpc('execute_sql', { query })`.
  - Fallback: paginação em `leads2` (ex.: 1000 por página), filtrar `classificacao_do_lead` válido e agregar em memória, ordenar desc.
- Retornar array tipado com `lead_count` como número.

### Controller
- Endpoint: `GET /api/dashboard/leads-by-classification`.
- Aplicar `@UseInterceptors(CacheInterceptor)` e `@CacheTTL(3600)`.

### Testes (TDD)
- Em `dashboard.service.spec.ts`:
  - Mockar `supabaseService.getClient().rpc` retornando amostra para validar formato e ordenação.
  - Testar fallback: mock em `from('leads2').select()` com dados paginados; validar agregação e resposta.

## Frontend
### Hook
- Criar `useLeadClassification.ts` (React Query): chama `/api/dashboard/leads-by-classification`, tipa resposta e gerencia loading/erro.

### Componente
- Criar `LeadClassificationChart.tsx`:
  - Skeleton loader enquanto `isLoading` (seguindo padrão dos charts existentes).
  - Renderizar PieChart (ou BarChart) com Recharts:
    - `classification_name` como rótulos
    - `lead_count` como valores
    - Tooltips com classificação e contagem formatada.

### Integração
- Inserir `<LeadClassificationChart />` em uma seção do dashboard com título "Classificação dos Leads".
- Seguir o estilo e componentes UI existentes (Card, Skeleton) e data-testid consistente.

## Performance & Padrões
- Manter paginação no fallback para evitar timeouts.
- Garantir cache por 1h; sem chaves fixas que ignorem query.
- Sem deduplicação; fonte única `leads2`.

## Verificação
- Chamar o endpoint e validar JSON (ordem desc, tipos corretos).
- Abrir o dashboard e verificar renderização, tooltips e soma total.
- Comparar amostra com contagem direta no Supabase para sanidade.