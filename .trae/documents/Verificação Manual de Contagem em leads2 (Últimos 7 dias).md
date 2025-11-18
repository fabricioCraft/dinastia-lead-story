## O que vamos validar
- Quantos registros com `data_do_agendamento` existem em `leads2` nos “Últimos 7 dias” (janela móvel) e num intervalo fechado (2025-11-12 a 2025-11-18).
- A contagem por dia e o total, usando exatamente o formato de data armazenado (texto `DD/MM/YYYY, HH24:MI:SS`).

## Consultas para executar no Supabase SQL Editor
### 1) Janela móvel (Últimos 7 dias), total
```sql
WITH events AS (
  SELECT to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS') AS ts
  FROM public.leads2
  WHERE data_do_agendamento IS NOT NULL
    AND TRIM(data_do_agendamento) <> ''
)
SELECT COUNT(*) AS total
FROM events
WHERE ts BETWEEN timezone('America/Sao_Paulo', now()) - INTERVAL '7 days'
          AND timezone('America/Sao_Paulo', now());
```

### 2) Janela móvel (Últimos 7 dias), por dia
```sql
WITH events AS (
  SELECT 
    DATE_TRUNC('day', to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS'))::date AS day,
    to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS') AS ts
  FROM public.leads2
  WHERE data_do_agendamento IS NOT NULL
    AND TRIM(data_do_agendamento) <> ''
)
SELECT day, COUNT(*) AS appointments_per_day
FROM events
WHERE ts BETWEEN timezone('America/Sao_Paulo', now()) - INTERVAL '7 days'
          AND timezone('America/Sao_Paulo', now())
GROUP BY day
ORDER BY day ASC;
```

### 3) Intervalo fechado (dias inteiros), total
```sql
WITH events AS (
  SELECT DATE_TRUNC('day', to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS'))::date AS day
  FROM public.leads2
  WHERE data_do_agendamento IS NOT NULL
    AND TRIM(data_do_agendamento) <> ''
)
SELECT COUNT(*) AS total_intervalo
FROM events
WHERE day >= DATE '2025-11-12' AND day <= DATE '2025-11-18';
```

### 4) Intervalo fechado (dias inteiros), por dia
```sql
WITH events AS (
  SELECT DATE_TRUNC('day', to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS'))::date AS day
  FROM public.leads2
  WHERE data_do_agendamento IS NOT NULL
    AND TRIM(data_do_agendamento) <> ''
)
SELECT day, COUNT(*) AS appointments_per_day
FROM events
WHERE day >= DATE '2025-11-12' AND day <= DATE '2025-11-18'
GROUP BY day
ORDER BY day ASC;
```

## O que observar
- O campo é texto; usamos `to_timestamp(...)` para converter corretamente.
- A janela móvel usa timezone ‘America/Sao_Paulo’ para evitar discrepâncias vs `now()`.
- Não há deduplicação: cada registro com `data_do_agendamento` válido conta 1.

## Próximos passos
- Execute as 4 queries e me envie:
  - Total da janela móvel e o total por dia.
  - Total do intervalo fechado e o total por dia.
- Eu comparo com o que o backend retorna e, se houver diferença, aplico o mesmo critério de timezone/período no serviço (`server/src/dashboard/dashboard.service.ts:344-436`) para ficar 1:1 com a tabela.