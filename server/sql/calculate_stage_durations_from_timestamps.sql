-- Função para calcular durações médias entre etapas usando timestamps
-- Nova arquitetura baseada em colunas de timestamp na tabela kommo_leads_snapshot

CREATE OR REPLACE FUNCTION calculate_stage_durations_from_timestamps()
RETURNS TABLE(stage_name TEXT, avg_duration_seconds NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Leads Novos'::TEXT as stage_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (ts_closers_em_contato - ts_leads_novos))),
      0
    )::NUMERIC as avg_duration_seconds
  FROM kommo_leads_snapshot 
  WHERE ts_leads_novos IS NOT NULL 
    AND ts_closers_em_contato IS NOT NULL
    AND ts_closers_em_contato > ts_leads_novos

  UNION ALL

  SELECT 
    'Closers em Contato'::TEXT as stage_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (ts_agendados - ts_closers_em_contato))),
      0
    )::NUMERIC as avg_duration_seconds
  FROM kommo_leads_snapshot 
  WHERE ts_closers_em_contato IS NOT NULL 
    AND ts_agendados IS NOT NULL
    AND ts_agendados > ts_closers_em_contato

  UNION ALL

  SELECT 
    'Agendados'::TEXT as stage_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (ts_call_realizada - ts_agendados))),
      0
    )::NUMERIC as avg_duration_seconds
  FROM kommo_leads_snapshot 
  WHERE ts_agendados IS NOT NULL 
    AND ts_call_realizada IS NOT NULL
    AND ts_call_realizada > ts_agendados

  UNION ALL

  SELECT 
    'Call Realizada'::TEXT as stage_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (ts_vendas - ts_call_realizada))),
      0
    )::NUMERIC as avg_duration_seconds
  FROM kommo_leads_snapshot 
  WHERE ts_call_realizada IS NOT NULL 
    AND ts_vendas IS NOT NULL
    AND ts_vendas > ts_call_realizada

  UNION ALL

  -- Para a última etapa (Vendas), calculamos o tempo desde que entrou até agora
  -- ou até quando saiu (se houver uma próxima etapa no futuro)
  SELECT 
    'Vendas'::TEXT as stage_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (NOW() - ts_vendas))),
      0
    )::NUMERIC as avg_duration_seconds
  FROM kommo_leads_snapshot 
  WHERE ts_vendas IS NOT NULL;

END;
$$ LANGUAGE plpgsql;

-- Comentário explicativo:
-- Esta função calcula a duração média que os leads passam em cada etapa
-- usando as diferenças entre os timestamps das colunas correspondentes.
-- 
-- Para cada transição (ex: Leads Novos -> Closers em Contato), 
-- calculamos a diferença em segundos entre os timestamps e fazemos a média.
--
-- As condições WHERE garantem que:
-- 1. Ambos os timestamps existem (NOT NULL)
-- 2. O timestamp de destino é posterior ao de origem (validação de ordem)
--
-- COALESCE garante que retornamos 0 se não houver dados válidos.