-- Tabela para rastrear histórico completo de mudanças de etapa dos leads
-- Esta tabela resolve o problema de calcular tempo médio para leads existentes

CREATE TABLE IF NOT EXISTS public.lead_stage_history (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    entered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    exited_at TIMESTAMP WITH TIME ZONE,
    duration_seconds BIGINT,
    pipeline_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas de entrada na mesma etapa
    UNIQUE(lead_id, stage_name, entered_at)
);

-- Índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead_id ON public.lead_stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_stage_name ON public.lead_stage_history(stage_name);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_entered_at ON public.lead_stage_history(entered_at);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_exited_at ON public.lead_stage_history(exited_at);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_duration ON public.lead_stage_history(duration_seconds) WHERE duration_seconds IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_pipeline_id ON public.lead_stage_history(pipeline_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lead_stage_history_updated_at 
    BEFORE UPDATE ON public.lead_stage_history 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular duração automaticamente quando exited_at é definido
CREATE OR REPLACE FUNCTION calculate_stage_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.exited_at IS NOT NULL AND NEW.entered_at IS NOT NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.exited_at - NEW.entered_at));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_duration_trigger
    BEFORE INSERT OR UPDATE ON public.lead_stage_history
    FOR EACH ROW
    EXECUTE FUNCTION calculate_stage_duration();

-- Função para calcular tempo médio por etapa baseado no histórico
CREATE OR REPLACE FUNCTION get_average_time_per_stage()
RETURNS TABLE(stage_name TEXT, avg_duration_seconds NUMERIC, total_leads BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lsh.stage_name::TEXT,
        AVG(lsh.duration_seconds)::NUMERIC as avg_duration_seconds,
        COUNT(DISTINCT lsh.lead_id)::BIGINT as total_leads
    FROM public.lead_stage_history lsh
    WHERE lsh.duration_seconds IS NOT NULL
    GROUP BY lsh.stage_name
    ORDER BY lsh.stage_name;
END;
$$ language 'plpgsql';

-- Função para obter histórico completo de um lead específico
CREATE OR REPLACE FUNCTION get_lead_stage_history(p_lead_id BIGINT)
RETURNS TABLE(
    stage_name TEXT, 
    entered_at TIMESTAMP WITH TIME ZONE, 
    exited_at TIMESTAMP WITH TIME ZONE,
    duration_seconds BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lsh.stage_name::TEXT,
        lsh.entered_at,
        lsh.exited_at,
        lsh.duration_seconds
    FROM public.lead_stage_history lsh
    WHERE lsh.lead_id = p_lead_id
    ORDER BY lsh.entered_at ASC;
END;
$$ language 'plpgsql';

-- Comentários para documentação
COMMENT ON TABLE public.lead_stage_history IS 'Histórico completo de mudanças de etapa dos leads do funil de vendas';
COMMENT ON COLUMN public.lead_stage_history.lead_id IS 'ID do lead no sistema';
COMMENT ON COLUMN public.lead_stage_history.stage_name IS 'Nome da etapa/status no funil';
COMMENT ON COLUMN public.lead_stage_history.entered_at IS 'Data e hora que o lead entrou nesta etapa';
COMMENT ON COLUMN public.lead_stage_history.exited_at IS 'Data e hora que o lead saiu desta etapa (NULL se ainda estiver na etapa)';
COMMENT ON COLUMN public.lead_stage_history.duration_seconds IS 'Duração em segundos que o lead ficou nesta etapa (calculado automaticamente)';
COMMENT ON COLUMN public.lead_stage_history.pipeline_id IS 'ID do pipeline no sistema';