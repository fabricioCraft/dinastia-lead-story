## Objetivo
- Implementar cross-filtering em todo o dashboard: ao clicar em qualquer barra/área de um gráfico, definir filtros categóricos globais e atualizar todos os gráficos para refletir apenas os dados filtrados.

## Comportamento Desejado
- Clique em "ISCA HORMOZI" (gráfico de Origem/Fonte) aplica filtro `source=ISCA HORMOZI` e todos os gráficos recarregam com esse filtro.
- Clique em "Perfil E" (gráfico de Classificação) aplica filtro `classification=E` e todos os gráficos recarregam com esse filtro.
- Clique em qualquer barra dos gráficos de Campanha/Fonte/Conteúdo/Classificação aplica o filtro correspondente.
- Opções para limpar filtros ativos (chip/botão de limpar no cabeçalho do dashboard).

## Estado Atual
- `FilterContext` já suporta `campaign`, `source`, `content`, `classification` e período.
- Gráficos com clique já funcionando: Campanha, Fonte, Conteúdo, Classificação.
- Hooks propagam filtros para API em: daily lead/appointments, summaries por campanha/fonte/conteúdo, classificação.
- Pendências: `UnifiedOriginChart` sem `onClick`; alguns gráficos não aplicam filtros de categoria (LeadEvolution, TimePerStage, possivelmente outros).

## Mudanças Necessárias
### 1) Frontend: habilitar clique em todos os gráficos
- `src/components/charts/UnifiedOriginChart.tsx`
  - Adicionar `useFilters()` e `onClick` nas barras para `setCategoricalFilter('source', valorOrigem)` usando o campo de dados correto (`origemCompleta`/`fullName`).
- Revisar `LeadClassificationChart.tsx`
  - Garantir que o valor clicado mapeia para a letra (ex.: "Perfil E" → `E`). Usar o campo `classification_name` como fonte do filtro.
- `LeadEvolutionChart.tsx` (se não estiver lendo filtros)
  - Consumir `useFilters()` e passar `filters` para `useDailyLeadVolume` para refletir filtros de categoria.
- `TimePerStageChart.tsx`
  - Consumir `useFilters()` e passar filtros para o hook correspondente.

### 2) Frontend: hooks devem aceitar e propagar filtros
- `src/hooks/useUnifiedOriginSummary.ts`
  - Incluir `campaign/source/content/classification` em `queryKey` e em `URLSearchParams`.
- `src/hooks/useTimeInStage.ts`
  - Incluir `campaign/source/content/classification` em `queryKey` e em `URLSearchParams`.

### 3) Backend: garantir suporte a filtros em todos endpoints
- `server/src/dashboard/dashboard.service.ts`
  - Endpoints de Origem Unificada e Tempo em Etapa: adicionar condições `WHERE` com `campaign/source/content/classification` semelhantes ao padrão já usado nos demais serviços (incluindo o regex de uma letra para `classification`).
  - Manter o fallback paginado quando aplicável e respeitar os filtros.
- `server/src/dashboard/campaign-summary-cache.interceptor.ts`
  - Confirmar que a chave de cache inclui os filtros adicionais para endpoints novos/ajustados.

### 4) UX de filtros ativos e limpeza
- Cabeçalho/toolbar do dashboard: exibir chips dos filtros ativos com opção de limpar individualmente e "Limpar todos" reutilizando `clearCategoricalFilter`/`clearAllCategoricalFilters` do contexto.

## Validação
- Executar o frontend e backend em modo dev.
- Clicar em "ISCA HORMOZI" e verificar atualização de todos os gráficos (volume diário, agendamentos, resumo por campanha/fonte/conteúdo, classificação, evolução, origem unificada, tempo em etapa).
- Clicar em "Perfil E" e verificar que todos os gráficos refletem apenas `classification=E`.
- Testar combinação de filtros (ex.: `source=ISCA HORMOZI` + `classification=E`).
- Confirmar que limpar filtros retorna ao estado não filtrado.

## Entregáveis
- Atualizações dos componentes de gráficos com `onClick` padronizado e leitura de `useFilters`.
- Atualizações dos hooks para incluir filtros em query keys e chamadas.
- Ajustes no backend para aplicar filtros em todos endpoints relevantes.
- UX de chips/botões para visualização e limpeza de filtros.
