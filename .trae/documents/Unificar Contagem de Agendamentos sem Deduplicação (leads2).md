## Contexto
- A tabela `leads2` é a única fonte de verdade. A deduplicação por WhatsApp normalizado surgiu para mitigar duplicidades quando havia múltiplas fontes.
- Para alinhar o dashboard com o filtro da tabela, devemos contar registros de `data_do_agendamento` diretamente, sem normalização nem dedup.

## Decisão
- Remover deduplicação e qualquer dependência de `normalized_whatsapp` na contagem.
- Tratar dois modos de período:
  - Preset (janela móvel): `NOW() - INTERVAL '<days> days'` até `NOW()` usando `data_do_agendamento` convertido para `timestamp`.
  - Intervalo fechado: `day >= startDate AND day <= endDate` (dias inteiros).

## Backend
1. Endpoint `GET /api/dashboard/daily-appointments` (server/src/dashboard/dashboard.controller.ts): manter `days`, `startDate`, `endDate`.
2. Serviço (server/src/dashboard/dashboard.service.ts):
   - Implementar SQL que:
     - Converte `data_do_agendamento` (`DD/MM/YYYY, HH24:MI:SS`) via `to_timestamp`.
     - Agrupa por `DATE_TRUNC('day', ts)::date`.
     - Conta `COUNT(*) AS appointments_per_day`.
   - Janela móvel quando `days` presente; intervalo fechado quando `startDate/endDate` presentes.
   - Remover código de deduplicação e funções auxiliares de normalização.
3. Garantir fallback sem RPC: se `execute_sql` não existir, paginar `leads2` e agregar no Node aplicando o mesmo critério de período.

## Frontend
1. Hook (src/hooks/useDailyAppointments.ts): enviar `days` quando houver preset; caso contrário, enviar `startDate/endDate`.
2. Gráfico (src/components/charts/DailyAppointmentsChart.tsx): já consome o hook; manter total como soma de `appointments_per_day`.

## Testes e Verificação
1. Teste de integração simples do serviço com mocking de Supabase:
   - Verificar que, para `days=7`, soma de `appointments_per_day` corresponde à contagem direta de linhas com `data_do_agendamento` nesse intervalo.
2. Endpoint manual:
   - `GET /api/dashboard/daily-appointments?days=7` deve refletir a mesma contagem que a tabela `leads2` para o filtro “Últimos 7 dias”.
   - `GET /api/dashboard/daily-appointments?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` deve somar dias inteiros.

## Limpeza
- Remover trechos obsoletos: qualquer menção a MR_base_leads no contexto dos agendamentos.
- Eliminar funções utilitárias de normalização de WhatsApp vinculadas à contagem.

## Observações
- Se futuramente surgirem duplicidades reais na `leads2` (ex.: dois agendamentos distintos no mesmo dia para o mesmo contato), manteremos a contagem simples para refletir “eventos de agendamento” e não “contatos distintos”.
- Caso haja uma regra de negócio diferente (ex.: contar apenas um agendamento por contato/dia), podemos reintroduzir a regra explicitamente e documentar no endpoint.
