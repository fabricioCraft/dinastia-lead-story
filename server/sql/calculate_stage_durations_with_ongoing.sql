-- Função para calcular durações médias entre etapas incluindo leads em andamento
-- Nova lógica que usa COALESCE para incluir tempo até NOW() para leads que ainda estão em suas etapas atuais

CREATE OR REPLACE FUNCTION calculate_stage_durations_with_ongoing()
RETURNS TABLE(stage_name TEXT, avg_duration_seconds NUMERIC) AS $$
BEGIN
  RETURN QUERY
  
  -- Duração em 'Novos Leads' = (Tempo de entrada em 'Tentado Conexão' OU AGORA) - (Tempo de entrada em 'Novos Leads')
  SELECT 
    'Novos Leads'::TEXT as stage_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (COALESCE(ts_tentado_conexao, NOW()) - ts_novos_leads))),
      0
    )::NUMERIC as avg_duration_seconds
  FROM kommo_leads_snapshot 
  WHERE ts_novos_leads IS NOT NULL

  UNION ALL

  -- Duração em 'Tentado Conexão' = (Tempo de entrada em 'Conectado/Qualificação' OU AGORA) - (Tempo de entrada em 'Tentado Conexão')
  SELECT 
    'Tentado Conexão'::TEXT as stage_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (COALESCE(ts_conectado_qualificacao, NOW()) - ts_tentado_conexao))),
      0
    )::NUMERIC as avg_duration_seconds
  FROM kommo_leads_snapshot 
  WHERE ts_tentado_conexao IS NOT NULL

  UNION ALL

  -- Duração em 'Conectado/Qualificação' = (Tempo de entrada em 'Oportunidade' OU AGORA) - (Tempo de entrada em 'Conectado/Qualificação')
  SELECT 
    'Conectado/Qualificação'::TEXT as stage_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (COALESCE(ts_oportunidade, NOW()) - ts_conectado_qualificacao))),
      0
    )::NUMERIC as avg_duration_seconds
  FROM kommo_leads_snapshot 
  WHERE ts_conectado_qualificacao IS NOT NULL

  UNION ALL

  -- Duração em 'Oportunidade' = (Tempo de entrada em 'Negociação' OU AGORA) - (Tempo de entrada em 'Oportunidade')
  SELECT 
    'Oportunidade'::TEXT as stage_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (COALESCE(ts_negociacao, NOW()) - ts_oportunidade))),
      0
    )::NUMERIC as avg_duration_seconds
  FROM kommo_leads_snapshot 
  WHERE ts_oportunidade IS NOT NULL

  UNION ALL

  -- Para a última etapa (Negociação), calculamos o tempo desde que entrou até agora
  -- (não há próxima etapa, então sempre usamos NOW())
  SELECT 
    'Negociação'::TEXT as stage_name,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (NOW() - ts_negociacao))),
      0
    )::NUMERIC as avg_duration_seconds
  FROM kommo_leads_snapshot 
  WHERE ts_venda_realizada IS NOT NULL;

END;
$$ LANGUAGE plpgsql;

-- Comentário explicativo:
-- Esta função calcula a duração média que os leads passam em cada etapa,
-- incluindo leads que ainda estão em suas etapas atuais.
-- 
-- A lógica COALESCE funciona assim:
-- - Se o lead já passou para a próxima etapa: usa o timestamp da próxima etapa
-- - Se o lead ainda está na etapa atual: usa NOW() para calcular tempo em andamento
--
-- Isso garante que:
-- 1. Leads que completaram etapas contribuem com durações finalizadas
-- 2. Leads que ainda estão em etapas contribuem com durações em andamento
-- 3. O gráfico sempre mostra dados realistas do pipeline atual
--
-- Exemplo: Se um lead está há 5 dias em "Tentado Conexão" sem avançar,
-- isso será refletido na média, mostrando onde estão os gargalos.