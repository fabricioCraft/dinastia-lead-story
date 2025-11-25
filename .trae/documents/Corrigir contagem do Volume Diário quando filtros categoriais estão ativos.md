## Problema
- Filtrar por `utm_source` (ex.: `03 - LAL COMPRADOR | PAGE B`) mostra 13.458 no gráfico, enquanto o Supabase aponta 405 registros. Sintoma indica que o endpoint `daily-lead-volume` cai no fallback que não aplica filtros categoriais.

## Correções Propostas
1) `getDailyLeadVolumeFallback`
- Alterar assinatura para aceitar `days` e `filters`.
- Construir `whereSql` com `buildWhereClause(startDate, endDate, days, filters)`.
- Usar `execute_sql` com `{ query }` e `GROUP BY day` aplicando `whereSql` (sem `sql_query/params`).

2) `getDailyLeadVolumeDirectQuery`
- Alterar assinatura para aceitar `days` e `filters`.
- Na paginação, selecionar `datacriacao, utm_campaign, utm_source, utm_content, classificacao_do_lead`.
- Aplicar filtros em memória antes de contar por dia, incluindo normalização de `utm_campaign` (extrair parte central de `DINASTIA | ... | ...`).

3) `getDailyLeadVolume`
- Ao acionar o fallback, repassar `days` e `filters` para que ambos os caminhos respeitem os mesmos critérios.

## Validação
- Filtrar por `utm_source=03 - LAL COMPRADOR | PAGE B` e verificar que o total do gráfico converge para ~405.
- Confirmar consistência com outros filtros (campanha, conteúdo, classificação) e com períodos (últimos N dias vs. intervalo).

## Observação
- Não altera o frontend; os hooks já enviam `campaign/source/content/classification`. Apenas garantimos que todo caminho backend aplique os filtros.