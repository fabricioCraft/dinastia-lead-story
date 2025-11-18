## Objetivo
Implementar um endpoint e um gráfico que agregam e exibem a contagem de leads por `classificacao_do_lead` da tabela `leads2`, mantendo a arquitetura atual (agregação no backend, cache e hooks no frontend).

## Backend
### Endpoint e Serviço
- Criar método no serviço: `getLeadsByClassification(): Promise<{ classification_name: string; lead_count: number }[]>` em `server/src/dashboard/dashboard.service.ts`.
- Consulta principal via SQL agregador:
  ```sql
  SELECT 
      classificacao_do_lead AS classification_name,
      COUNT(chatid) AS lead_count
  FROM public.leads2
  WHERE classificacao_do_lead IS NOT NULL AND classificacao_do_lead <> ''
  GROUP BY classificacao_do_lead
  ORDER BY lead_count DESC;
  ```
- Tentar `client.rpc('execute_sql', { query: sql })`; se falhar, fallback: paginar `leads2` e agregar em Node (filtrando `classificacao_do_lead` não nulo/não vazio).

### Controller
- Adicionar endpoint em `server/src/dashboard/dashboard.controller.ts`:
  - `GET /api/dashboard/leads-by-classification`
  - Aplicar `@UseInterceptors(CacheInterceptor)` e `@CacheTTL(3600)`.

### Testes (TDD)
- Em `server/src/dashboard/dashboard.service.spec.ts`:
  - Adicionar teste que valida o formato de saída: array com `{ classification_name: string, lead_count: number }`.
  - Mockar `SupabaseService.getClient().rpc` para retornar amostra e verificar ordenação/parse numérico.
  - Teste simples de fallback: mock de `from('leads2').select()` retornando uma amostra e verificar o formato.

## Frontend
### Hook
- Criar `src/hooks/useLeadClassification.ts` usando `useQuery`:
  - Chamar `/api/dashboard/leads-by-classification`.
  - Retornar array tipado `{ classification_name: string; lead_count: number }`.

### Componente
- Criar `src/components/charts/LeadClassificationChart.tsx`:
  - Mostrar Skeleton enquanto carrega (seguindo padrão dos gráficos existentes).
  - Renderizar gráfico (PieChart ou BarChart com Recharts) mapeando `classification_name` e `lead_count`.
  - Configurar Tooltips com classificação e total.

### Integração
- Adicionar `<LeadClassificationChart />` na página/área de métricas (mesma seção dos gráficos de leads/agendamentos). Se existir um container como `src/pages/Dashboard.tsx` ou um layout de seção, incluir com título "Classificação dos Leads".

## Performance e Padrões
- Manter paginação no fallback (1000 itens por página) para evitar timeouts.
- Converter `lead_count` para número.
- Respeitar padrões de importação e estilo do projeto (sem comentários, nomes claros).

## Verificação
- Executar endpoint manualmente e validar JSON.
- Abrir o dashboard e verificar renderização do gráfico, skeleton e tooltips.
- Garantir que o cache não conflita com futuras extensões de filtros (por enquanto, o endpoint não tem filtros).

## Entregáveis
- Novo endpoint com cache e testes passando.
- Hook e componente React funcional adicionados ao dashboard.
