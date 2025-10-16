-- Função para calcular a taxa de agendamento
-- Retorna a proporção de leads únicos que chegaram na etapa de agendamento

CREATE OR REPLACE FUNCTION calculate_scheduling_rate()
RETURNS TABLE(scheduling_rate float)
LANGUAGE sql
AS $$
  SELECT 
    -- Contar leads únicos que possuem um timestamp na coluna de agendamento
    CAST(COUNT(DISTINCT CASE WHEN ts_agendados IS NOT NULL THEN lead_id END) AS float) 
    / 
    -- Dividir pelo total de leads únicos na tabela (para evitar divisão por zero, usamos NULLIF)
    CAST(NULLIF(COUNT(DISTINCT lead_id), 0) AS float) 
    AS scheduling_rate 
  FROM kommo_leads_snapshot;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION calculate_scheduling_rate() IS 'Calcula a taxa de agendamento como proporção de leads únicos que chegaram na etapa de agendamento';