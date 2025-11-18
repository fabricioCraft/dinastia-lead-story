## Objetivo
Comparar o total de agendamentos dos últimos 7 dias exibido no dashboard com o total obtido diretamente da tabela `public.leads2` no Supabase, garantindo que ambos usem a mesma lógica (apenas `leads2`, deduplicado por dia + WhatsApp normalizado, no mesmo intervalo de datas).

## O que será comparado
- Endpoint do dashboard: `GET /api/dashboard/daily-appointments?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (apenas `leads2`).
- Consulta SQL equivalente no Supabase (apenas `leads2`), com deduplicação por `(day, normalized_whatsapp)` e filtro `day BETWEEN current_date - 6 days AND current_date`.

## Passos
1. Determinar intervalo dos “últimos 7 dias” usado pelo dashboard (hoje) e pelo seu filtro (ex.: de `YYYY-MM-DD` até `YYYY-MM-DD`).
2. Obter dados do endpoint e somar `appointments_per_day` para o período.
3. Executar no Supabase a SQL de validação (apenas `leads2`) que:
   - Converte `data_do_agendamento` com `to_timestamp('DD/MM/YYYY, HH24:MI:SS')`;
   - Normaliza `chatid` com `regexp_replace('\\D','', 'g')`;
   - Deduplica por `(day, normalized_whatsapp)`;
   - Filtra por `day >= startDate` e `day <= endDate`;
   - Conta total.
4. Comparar os dois totais e, se houver diferença:
   - Verificar se o período aplicado pelo servidor corresponde exatamente ao do frontend;
   - Checar casos com datas inválidas ou vazias que são descartadas no fallback;
   - Revisar possíveis impactos de timezone apenas no fallback (JS) — a SQL usa `date` puro.

## SQL de validação (total 7 dias, apenas leads2)
```
WITH events AS (
  SELECT
    DATE_TRUNC('day', to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS'))::date AS day,
    regexp_replace(chatid, '\\D', '', 'g') AS normalized_whatsapp
  FROM public.leads2
  WHERE data_do_agendamento IS NOT NULL AND data_do_agendamento <> '' AND chatid IS NOT NULL AND chatid <> ''
)
SELECT COUNT(*) AS total_7d
FROM (
  SELECT DISTINCT ON (day, normalized_whatsapp) day, normalized_whatsapp
  FROM events
  WHERE day BETWEEN CURRENT_DATE - INTERVAL '6 days' AND CURRENT_DATE
) d;
```

## Entregável
- Relatório com os dois totais, lista de dias e séries, e explicação de qualquer diferença encontrada.

## Observações
- Código relevante: construção dos filtros em `server/src/dashboard/dashboard.service.ts:385-405` e execução em `:412-415`; a lógica é apenas leads2.
- Se necessário, ajusto a comparação para usar um intervalo explícito (datas) em ambos os lados para eliminar qualquer ambiguidade.
