## Problema
- Ambos os gráficos mostram dados não filtrados ao usar “Últimos 7 dias”.
- Causas prováveis:
  1) Cache com chave fixa nos endpoints (`@CacheKey('...')`) ignora a query, servindo respostas antigas para novos filtros.
  2) O gráfico de Volume Diário de Leads não envia `days` quando há preset; só suporta `startDate/endDate`.

## Solução
### Backend
- Remover `@CacheKey` fixo de `daily-lead-volume` e `daily-appointments` para que a chave padrão (método + URL + query) seja usada, garantindo cache por filtro.
- Adicionar suporte ao parâmetro `days` em `GET /api/dashboard/daily-lead-volume`:
  - Controller: aceitar `days` e repassar ao serviço.
  - Service: se `days` > 0, calcular janela móvel com `datacriacao` (NOW() - INTERVAL 'days'), agrupar por dia e retornar.

### Frontend
- Hook `useDailyLeadVolume`: aceitar `days` e incluí-lo na URL.
- Componente `DailyLeadVolumeChart`: enviar `{ days: filters.selectedPeriod }` quando preset ativo; senão, enviar `startDate/endDate`.
- Já está feito para `DailyAppointmentsChart`; manter consistente.

### Verificação
- Testar no navegador com “Últimos 7 dias” e confirmar que ambos gráficos atualizam.
- Testar intervalos customizados (start/end).
- Validar que respostas variam conforme a query (cache não conflitando).

## Observações
- Mantemos contagem simples baseada em `leads2` sem deduplicação.
- TTL de cache permanece; sem `CacheKey` fixo, o cache respeita a query string e não interfere no filtro.
