## Diagnóstico
- A contagem do dashboard não bate com o filtro do Supabase (ex.: `utm_source=04 - SUPERLAL | PAGE B`).
- Causa principal: caminhos de fallback no backend (especialmente `getLeadsByClassification`) não aplicam os filtros categoriais (`campaign/source/content/classification`), somando dados de todos os leads.
- Causa adicional: chamadas inconsistentes ao RPC `execute_sql` podem falhar e acionar o fallback, ampliando o problema.

## Ajustes Propostos
### 1) Classificação de Leads (backend)
- Em `getLeadsByClassification` (fallback):
  - Selecionar também `utm_campaign`, `utm_source`, `utm_content`, além de `classificacao_do_lead` e `datacriacao`.
  - Aplicar filtros categoriais antes de contar, com normalização da campanha (extrair o meio do formato `DINASTIA | ... | ...` quando aplicável).
  - Manter o regex de uma letra para classificação.

### 2) Padronizar chamadas RPC `execute_sql`
- Usar sempre `{ query: sql }` (conforme já utilizado em maioria dos endpoints) para evitar quedas no fallback.
- Corrigir locais que usam `sql_query/params` quando não suportado pelo RPC atual.

### 3) Origem Unificada (confirmar)
- Já atualizado para aplicar `whereSql` no SQL e filtros no fallback. Revisar e manter.

### 4) Verificação de consistência
- Testar os seguintes cenários:
  - Filtrar por `utm_source=04 - SUPERLAL | PAGE B` e validar:
    - Total de leads (484) no resumo por fonte e nos gráficos dependentes.
    - Contagem de `Perfil A` (51) no gráfico de classificação.
  - Combinações com período (últimos N dias vs. range específico).

## Implementação
- Atualizar `server/src/dashboard/dashboard.service.ts` (fallback de `getLeadsByClassification`): incluir campos UTM e aplicar filtros.
- Padronizar as chamadas `execute_sql` em arquivos onde ainda usam `sql_query/params`.
- Adicionar logs leves indicando quando o fallback é usado e quais filtros estão ativos (para diagnóstico).

## Validação
- Rodar o dashboard, clicar na barra da fonte "04 - SUPERLAL | PAGE B" e confirmar que:
  - Todos os gráficos refletem apenas os dados dessa fonte.
  - O gráfico de classificação mostra `Perfil A = 51`.
- Repetir para outros filtros (campanha, conteúdo, classificação) para garantir consistência.

## Observação
- Nenhuma mudança no frontend é necessária além das já feitas; os hooks já propagam filtros corretamente. O foco é corrigir o backend para que os filtros sejam respeitados em todos os caminhos.