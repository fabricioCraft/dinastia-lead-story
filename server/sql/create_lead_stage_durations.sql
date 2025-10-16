-- Tabela para armazenar durações de leads por estágio do Kommo CRM
-- Esta tabela rastreia quanto tempo cada lead passa em cada estágio do funil

CREATE TABLE IF NOT EXISTS lead_stage_durations (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    entered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    exited_at TIMESTAMP WITH TIME ZONE,
    duration_seconds BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas
    UNIQUE(lead_id, stage_name, entered_at)
);

-- Índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_lead_stage_durations_lead_id ON lead_stage_durations(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_durations_stage_name ON lead_stage_durations(stage_name);
CREATE INDEX IF NOT EXISTS idx_lead_stage_durations_entered_at ON lead_stage_durations(entered_at);
CREATE INDEX IF NOT EXISTS idx_lead_stage_durations_duration ON lead_stage_durations(duration_seconds) WHERE duration_seconds IS NOT NULL;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lead_stage_durations_updated_at 
    BEFORE UPDATE ON lead_stage_durations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE lead_stage_durations IS 'Armazena o histórico de tempo que cada lead passa em cada estágio do funil de vendas do Kommo CRM';
COMMENT ON COLUMN lead_stage_durations.lead_id IS 'ID do lead no Kommo CRM';
COMMENT ON COLUMN lead_stage_durations.stage_name IS 'Nome do estágio/status no Kommo';
COMMENT ON COLUMN lead_stage_durations.entered_at IS 'Data e hora que o lead entrou neste estágio';
COMMENT ON COLUMN lead_stage_durations.exited_at IS 'Data e hora que o lead saiu deste estágio (NULL se ainda estiver no estágio)';
COMMENT ON COLUMN lead_stage_durations.duration_seconds IS 'Duração em segundos que o lead ficou neste estágio (NULL se ainda estiver no estágio)';