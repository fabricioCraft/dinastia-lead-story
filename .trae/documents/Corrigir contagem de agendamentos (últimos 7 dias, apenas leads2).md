## Resumo

* Os gráficos consumem dados via hooks React que chamam endpoints do backend NestJS.

* Para os gráficos principais, a origem é a tabela `public.leads2` no Supabase; alguns casos também combinam com `MR_base_leads`.

## Gráficos e Hooks (Frontend)

* Volume Diário de Leads: `src/components/charts/DailyLeadVolumeChart.tsx:2` usa `useDailyLeadVolume`; o hook chama `/api/dashboard/daily-lead-volume` e documenta “Dados da tabela leads2” em `src/hooks/useDailyLeadVolume.ts:24` e faz o fetch em `:44-55`.

* Origem Unificada: `src/components/charts/UnifiedOriginChart.tsx:2` usa `useUnifiedOriginSummary`; o hook chama `/api/dashboard/unified-origin-summary` e descreve a combinação de `leads2.origem` + `MR_base_leads.utm_campaign` em `src/hooks/useUnifiedOriginSummary.ts:10-13` e faz o fetch em `:31-39`.

* Leads por Etapa (usado em LossReasonsChart): `src/hooks/useLeadsByStage.ts:9-16` chama `/api/dashboard/leads-by-stage`.

## Endpoints (Backend)

* Daily Lead Volume: `server/src/dashboard/dashboard.controller.ts:14-23` → serviço usa apenas `leads2` por SQL direto `public.leads2` em `server/src/dashboard/dashboard.service.ts:153-161` e pela query paginada `from('leads2')` em `:232-241`.

* Origem Unificada: `server/src/dashboard/dashboard.controller.ts:46-58` → serviço normaliza a origem consultando `public.leads2` em `server/src/dashboard/dashboard.service.ts:733-771` e fallback paginado `from('leads2')` em `:800-812`.

* Leads por Etapa: `server/src/dashboard/dashboard.controller.ts:60-66` → serviço consulta `from('leads2').select('etapa')` em `server/src/dashboard/dashboard.service.ts:927-934`.

* Agendamentos Diários: `server/src/dashboard/dashboard.controller.ts:33-42` → serviço unifica dados de `public.leads2` e `public."MR_base_leads"` na SQL `server/src/dashboard/dashboard.service.ts:382-396` e no fallback em `:482-507`.

## Conclusão

* Sim: os gráficos de Volume Diário de Leads, Origem Unificada e Leads por Etapa obtêm dados da tabela `leads2` no Supabase (alguns combinam com `MR_base_leads`).

## Próximos Passos Propostos

* Se desejar, parametrizar a origem de dados (apenas `leads2` vs. unificado) via query params dos endpoints.

* Adicionar testes rápidos de contrato dos endpoints para garantir estrutura e contagem esperadas.

* Revisar performance de paginação em `getDailyLeadVolumeDirectQuery` e avaliar uso de agregação SQL com filtros para reduzir tráfego.

